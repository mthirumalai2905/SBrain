/**
 * The three AI providers behind one interface. Keys come from apps/api/.env and never leave the server.
 * Each adapter runs the tool loop in its provider's own message format: the model may call tools, we run them
 * and hand back the results, until it answers in plain text.
 */
export interface ToolDef { name: string; description: string; parameters: Record<string, unknown> }
export type ToolRunner = (name: string, args: Record<string, unknown>) => Promise<string>;
export interface Turn { role: 'user' | 'assistant'; content: string }
export interface Cred { key: string; model: string }
export interface RunInput { system: string; history: Turn[]; tools: ToolDef[]; run: ToolRunner; maxSteps?: number }

export const PROVIDERS = [
  { id: 'anthropic', label: 'Claude', keyEnv: 'ANTHROPIC_API_KEY', modelEnv: 'ANTHROPIC_MODEL', defaultModel: 'claude-sonnet-5-5' },
  { id: 'openai', label: 'ChatGPT', keyEnv: 'OPENAI_API_KEY', modelEnv: 'OPENAI_MODEL', defaultModel: 'gpt-4.1' },
  { id: 'gemini', label: 'Gemini', keyEnv: 'GEMINI_API_KEY', modelEnv: 'GEMINI_MODEL', defaultModel: 'gemini-2.5-pro' },
] as const;
export type ProviderId = (typeof PROVIDERS)[number]['id'];

export const providerInfo = (id: string) => PROVIDERS.find((p) => p.id === id);
export const modelFor = (id: ProviderId) => {
  const p = PROVIDERS.find((x) => x.id === id)!;
  return process.env[p.modelEnv] || p.defaultModel;
};
/** Optional ANTHROPIC_BASE_URL / OPENAI_BASE_URL / GEMINI_BASE_URL, for a proxy or gateway. */
const baseUrl = (env: string, fallback: string) => {
  const v = process.env[env] || fallback;
  return v.endsWith('/') ? v.slice(0, -1) : v;
};
export const keyFor = (id: ProviderId) => process.env[PROVIDERS.find((x) => x.id === id)!.keyEnv] || '';

const MAX_STEPS = 8;

async function post(url: string, headers: Record<string, string>, body: unknown): Promise<any> {
  const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(90_000) });
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = undefined; }
  if (!res.ok) {
    const detail = String(json?.error?.message ?? json?.message ?? text).replace(/\s+/g, ' ').slice(0, 300);
    // never echo anything that could be a key
    throw new Error(`The AI service answered ${res.status}: ${detail.replace(/[A-Za-z0-9_-]{32,}/g, '…')}`);
  }
  return json;
}

async function anthropic(input: RunInput, cred: Cred): Promise<string> {
  const messages: any[] = input.history.map((t) => ({ role: t.role, content: t.content }));
  let said = '';
  for (let step = 0; step < (input.maxSteps ?? MAX_STEPS); step++) {
    const r = await post(baseUrl('ANTHROPIC_BASE_URL', 'https://api.anthropic.com') + '/v1/messages', { 'x-api-key': cred.key, 'anthropic-version': '2023-06-01' }, {
      model: cred.model, max_tokens: 4096, system: input.system, messages,
      tools: input.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters })),
    });
    const blocks: any[] = r.content ?? [];
    const text = blocks.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    if (text) said = text;
    const uses = blocks.filter((b) => b.type === 'tool_use');
    if (!uses.length) return said;
    messages.push({ role: 'assistant', content: blocks });
    const results = [];
    for (const u of uses) results.push({ type: 'tool_result', tool_use_id: u.id, content: await input.run(u.name, u.input ?? {}) });
    messages.push({ role: 'user', content: results });
  }
  return said;
}

async function openai(input: RunInput, cred: Cred): Promise<string> {
  const messages: any[] = [{ role: 'system', content: input.system }, ...input.history.map((t) => ({ role: t.role, content: t.content }))];
  let said = '';
  for (let step = 0; step < (input.maxSteps ?? MAX_STEPS); step++) {
    const r = await post(baseUrl('OPENAI_BASE_URL', 'https://api.openai.com/v1') + '/chat/completions', { authorization: `Bearer ${cred.key}` }, {
      model: cred.model, messages,
      tools: input.tools.map((t) => ({ type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } })),
    });
    const m = r.choices?.[0]?.message ?? {};
    if (typeof m.content === 'string' && m.content.trim()) said = m.content.trim();
    const calls: any[] = m.tool_calls ?? [];
    if (!calls.length) return said;
    messages.push(m);
    for (const c of calls) {
      let args: Record<string, unknown> = {};
      try { args = JSON.parse(c.function?.arguments || '{}'); } catch { /* the model sent broken JSON; run with no arguments and let validation explain */ }
      messages.push({ role: 'tool', tool_call_id: c.id, content: await input.run(c.function?.name, args) });
    }
  }
  return said;
}

async function gemini(input: RunInput, cred: Cred): Promise<string> {
  const contents: any[] = input.history.map((t) => ({ role: t.role === 'assistant' ? 'model' : 'user', parts: [{ text: t.content }] }));
  let said = '';
  for (let step = 0; step < (input.maxSteps ?? MAX_STEPS); step++) {
    const r = await post(
      `${baseUrl('GEMINI_BASE_URL', 'https://generativelanguage.googleapis.com')}/v1beta/models/${encodeURIComponent(cred.model)}:generateContent`,
      { 'x-goog-api-key': cred.key },
      {
        systemInstruction: { parts: [{ text: input.system }] }, contents,
        tools: [{ functionDeclarations: input.tools.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })) }],
      },
    );
    const parts: any[] = r.candidates?.[0]?.content?.parts ?? [];
    const text = parts.filter((p) => typeof p.text === 'string').map((p) => p.text).join('\n').trim();
    if (text) said = text;
    const calls = parts.filter((p) => p.functionCall);
    if (!calls.length) return said;
    contents.push({ role: 'model', parts });
    const responses = [];
    for (const c of calls) responses.push({ functionResponse: { name: c.functionCall.name, response: { result: await input.run(c.functionCall.name, c.functionCall.args ?? {}) } } });
    contents.push({ role: 'user', parts: responses });
  }
  return said;
}

export function runModel(provider: ProviderId, input: RunInput, cred: Cred): Promise<string> {
  if (provider === 'anthropic') return anthropic(input, cred);
  if (provider === 'openai') return openai(input, cred);
  return gemini(input, cred);
}
