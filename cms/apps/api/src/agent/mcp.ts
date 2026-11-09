/**
 * A small MCP client (Streamable HTTP) so the assistant can use tools from MCP servers you configure.
 *
 * Servers are listed in apps/api/.env, never in the browser:
 *   MCP_SERVERS=[{"name":"notes","url":"https://example.com/mcp","token":"...","allowWrites":false}]
 *
 * Safety: a tool is offered to the AI only if the server marks it read-only (annotations.readOnlyHint), unless that
 * server has "allowWrites": true. Whatever a tool returns is treated as data, never as instructions. Tokens stay on
 * the server and are never sent to the browser or written to the log.
 */
export interface McpServer { name: string; url: string; token?: string; headers?: Record<string, string>; allowWrites?: boolean }
export interface McpTool { server: string; name: string; description: string; schema: Record<string, unknown>; readOnly: boolean }

export function configuredServers(): McpServer[] {
  const raw = process.env.MCP_SERVERS;
  if (!raw) return [];
  try {
    const list = JSON.parse(raw) as McpServer[];
    return list.filter((s) => s && typeof s.name === 'string' && /^[\w-]{1,24}$/.test(s.name) && typeof s.url === 'string' && /^https?:\/\//.test(s.url));
  } catch {
    return [];
  }
}

interface Session { id?: string; tools?: McpTool[]; at: number }
const sessions = new Map<string, Session>();
const keyOf = (s: McpServer) => `${s.name}|${s.url}`;
/** Forget a server's open session, for example after its address or token was changed. */
export const forgetServer = (name: string) => { for (const k of [...sessions.keys()]) if (k.startsWith(name + '|')) sessions.delete(k); };
let counter = 0;

const headersFor = (s: McpServer, session?: Session): Record<string, string> => ({
  'content-type': 'application/json',
  accept: 'application/json, text/event-stream',
  ...(s.headers ?? {}),
  ...(s.token ? { authorization: `Bearer ${s.token}` } : {}),
  ...(session?.id ? { 'mcp-session-id': session.id } : {}),
});

/** Reads the JSON-RPC reply from either a plain JSON body or a server-sent-events stream. */
async function readReply(res: Response, id: number): Promise<any> {
  const type = res.headers.get('content-type') ?? '';
  const text = await res.text();
  if (type.includes('text/event-stream')) {
    for (const block of text.split(/\r?\n\r?\n/)) {
      const data = block.split(/\r?\n/).filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
      if (!data) continue;
      try {
        const msg = JSON.parse(data);
        if (msg.id === id) return msg;
      } catch { /* not JSON, skip */ }
    }
    throw new Error('MCP server sent no reply');
  }
  return JSON.parse(text);
}

async function rpc(s: McpServer, session: Session, method: string, params: unknown, notify = false): Promise<any> {
  const id = ++counter;
  const res = await fetch(s.url, {
    method: 'POST',
    headers: headersFor(s, session),
    body: JSON.stringify(notify ? { jsonrpc: '2.0', method, params } : { jsonrpc: '2.0', id, method, params }),
    signal: AbortSignal.timeout(30_000),
  });
  if (res.status === 404 && session.id) throw Object.assign(new Error('session expired'), { expired: true });
  if (!res.ok) throw new Error(`MCP server ${s.name} answered ${res.status}`);
  const sid = res.headers.get('mcp-session-id');
  if (sid) session.id = sid;
  if (notify) return null;
  const msg = await readReply(res, id);
  if (msg.error) throw new Error(`MCP ${s.name}: ${String(msg.error.message ?? 'error').slice(0, 200)}`);
  return msg.result;
}

async function connect(s: McpServer): Promise<Session> {
  const session: Session = { at: Date.now() };
  await rpc(s, session, 'initialize', { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'synx-brain', version: '0.1.0' } });
  await rpc(s, session, 'notifications/initialized', {}, true);
  sessions.set(keyOf(s), session);
  return session;
}

const clean = (schema: unknown): Record<string, unknown> => {
  // providers accept different parts of JSON Schema; keep the common core
  const strip = (v: any): any => {
    if (Array.isArray(v)) return v.map(strip);
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v)) if (!['$schema', 'additionalProperties', '$defs', 'definitions', '$id'].includes(k)) out[k] = strip(val);
      return out;
    }
    return v;
  };
  const s = strip(schema);
  return s && typeof s === 'object' && s.type === 'object' ? s : { type: 'object', properties: {} };
};

/** Tools the AI may use: from every configured server, read-only ones unless the server allows writes. Cached for 5 minutes. */
export async function listTools(servers: McpServer[]): Promise<{ tools: McpTool[]; hidden: number; errors: string[] }> {
  const tools: McpTool[] = [];
  const errors: string[] = [];
  let hidden = 0;
  for (const s of servers) {
    try {
      let session = sessions.get(keyOf(s));
      if (!session || Date.now() - session.at > 5 * 60_000 || !session.tools) {
        session = await connect(s);
        const r = await rpc(s, session, 'tools/list', {});
        session.tools = (r.tools ?? []).map((t: any): McpTool => ({
          server: s.name, name: String(t.name), description: String(t.description ?? '').slice(0, 600),
          schema: clean(t.inputSchema), readOnly: t.annotations?.readOnlyHint === true,
        }));
        session.at = Date.now();
      }
      for (const t of session.tools!) (t.readOnly || s.allowWrites ? tools : { push: () => { hidden++; } }).push(t as never);
    } catch (e) {
      errors.push(`${s.name}: ${(e as Error).message}`);
    }
  }
  return { tools, hidden, errors };
}

export async function callTool(s: McpServer, tool: string, args: Record<string, unknown>): Promise<string> {
  const known = sessions.get(keyOf(s))?.tools?.find((t) => t.name === tool);
  if (!known || !(known.readOnly || s.allowWrites)) throw new Error('That tool is not available');
  let session = sessions.get(keyOf(s)) ?? (await connect(s));
  let result: any;
  try {
    result = await rpc(s, session, 'tools/call', { name: tool, arguments: args });
  } catch (e) {
    if (!(e as { expired?: boolean }).expired) throw e;
    session = await connect(s);
    result = await rpc(s, session, 'tools/call', { name: tool, arguments: args });
  }
  const text = (result.content ?? []).map((c: any) => (c.type === 'text' ? c.text : `[${c.type}]`)).join('\n');
  return (result.isError ? 'Tool error: ' : '') + (text.length > 20_000 ? text.slice(0, 20_000) + '\n[Cut off]' : text);
}
