import http from 'node:http';

/**
 * A tiny public door for the MCP server, and nothing else.
 *
 * Apps like Claude (web/desktop "Add custom connector") and ChatGPT connect from the internet, so they need a public HTTPS
 * address. Pointing a tunnel at the whole CMS would expose everything in it. Point it at THIS instead (port 4010): it forwards
 * only POST /mcp/k/<key> to the CMS and answers 404 to every other address, so the admin, the media and the rest of the API
 * stay private. The key in the address is the only credential, and it is never printed here.
 *
 *   npm run mcp:public         starts this door on http://localhost:4010
 *   cloudflared tunnel --url http://localhost:4010     (or: ngrok http 4010) gives you the https address
 */
const PORT = Number(process.env.MCP_GATEWAY_PORT ?? 4010);
const TARGET = (process.env.MCP_TARGET ?? 'http://127.0.0.1:4000').replace(/\/$/, '');
const ALLOWED = /^\/mcp\/k\/[A-Za-z0-9_-]{16,}$/;
const MAX_BODY = 2 * 1024 * 1024;

const server = http.createServer(async (req, res) => {
  const path = (req.url ?? '').split('?')[0];
  const send = (code: number, body: string, type = 'text/plain') => { res.writeHead(code, { 'content-type': type }); res.end(body); };
  if (!ALLOWED.test(path)) return send(404, 'Not found');
  if (req.method !== 'POST') { res.writeHead(405, { allow: 'POST', 'content-type': 'text/plain' }); return res.end('Use POST'); }

  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += (c as Buffer).length;
    if (size > MAX_BODY) return send(413, 'Too large');
    chunks.push(c as Buffer);
  }
  try {
    const up = await fetch(TARGET + path, {
      method: 'POST',
      // only what MCP needs; no cookies, no Origin, nothing else is passed on
      headers: { 'content-type': String(req.headers['content-type'] ?? 'application/json'), accept: 'application/json', ...(req.headers['mcp-protocol-version'] ? { 'mcp-protocol-version': String(req.headers['mcp-protocol-version']) } : {}) },
      body: Buffer.concat(chunks),
      signal: AbortSignal.timeout(60_000),
    });
    const text = await up.text();
    res.writeHead(up.status, { 'content-type': up.headers.get('content-type') ?? 'application/json' });
    res.end(text);
    console.log(`${new Date().toISOString()} POST /mcp/k/… -> ${up.status}`);
  } catch {
    send(502, 'The CMS is not answering. Is it running?');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`MCP public door on http://127.0.0.1:${PORT}  (forwards only /mcp/k/<key> to ${TARGET})`);
  console.log('Point your tunnel at this port, for example:  cloudflared tunnel --url http://localhost:' + PORT);
});
