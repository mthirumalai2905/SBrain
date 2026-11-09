import type { DB } from "./types";
import { statusLabel } from "./rbac";
import { toolCatalog } from "./harness/registry";
import type { Plan, ToolCall } from "./harness/apply";
import { RetryableError, withRetry } from "./harness/retry";

function context(db: DB) {
  const sites = db.sites.map((site) => `${site.name} id=${site.id} sections=${site.sections.map((section) => section.path).join(",")}`).join("\n");
  const articles = db.articles
    .slice(0, 20)
    .map((article) => `${article.title} | ${article.siteId} | ${statusLabel[article.status]}`)
    .join("\n");
  return `Sites:\n${sites}\n\nStored articles:\n${articles || "none"}`;
}

export function parsePlan(text: string, instruction: string): Plan | null {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const data = JSON.parse(raw.slice(start, end + 1)) as { reply?: unknown; tools?: unknown };
    if (typeof data.reply !== "string" || !Array.isArray(data.tools)) return null;
    const tools: ToolCall[] = data.tools
      .filter((item): item is { name: string; input?: Record<string, unknown> } => Boolean(item) && typeof item === "object" && typeof (item as { name?: unknown }).name === "string")
      .slice(0, 4)
      .map((item) => ({
        name: item.name,
        input: Object.fromEntries(
          Object.entries(item.input ?? {})
            .filter((entry): entry is [string, string] => typeof entry[1] === "string" || typeof entry[1] === "number" || typeof entry[1] === "boolean")
            .map(([key, value]) => [key, String(value)]),
        ),
      }));
    return {
      reply: data.reply.trim(),
      tools,
      dryRun: /^\s*(dry[\s-]?run|preview)\b/i.test(instruction),
    };
  } catch {
    return null;
  }
}

export async function draftFromTopic(topic: string): Promise<{ title: string; body: string } | null> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key || !topic.trim()) return null;
  const model = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          {
            role: "system",
            content:
              'Write one short article about only the topic the user named. Return JSON only: {"title":"","body":""}. Do not invent statistics, quotations, dates, companies, or people. The title must use the topic.',
          },
          { role: "user", content: topic },
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const content = payload.choices?.[0]?.message?.content ?? "";
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const data = JSON.parse(content.slice(start, end + 1)) as { title?: unknown; body?: unknown };
    if (typeof data.title !== "string" || typeof data.body !== "string") return null;
    return { title: data.title, body: data.body };
  } catch {
    return null;
  }
}

export async function planInstruction(
  instruction: string,
  db: DB,
  history: { instruction: string; reply: string }[] = [],
): Promise<Plan | null> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) return null;
  const model = process.env.GROQ_MODEL?.trim() || "openai/gpt-oss-120b";
  const body = {
    model,
    temperature: 0.2,
    max_tokens: 700,
    messages: [
      {
        role: "system",
        content: [
          "You are Brain, the control centre for Synx, Real Time Web, Morph Space, and Skalle AI.",
          "You answer inside Brain only. You never publish, deploy, restart, or edit a live website.",
          "A change is routed to one registered intent and one site before any repository write. A question about a repository is a read, not a change. Do not mix design rules across sites.",
          "Never invent an article title or body. If the person wants an article and did not say what it is about, ask what it should be about and return no tools.",
          "A message that is only a website name or an intent continues the previous request. Do not start a different task.",
          "Choose tools from the catalog. Prefer one tool. Use publish only if the person insists on publishing, so the gate can refuse it.",
          "For drafts set site to synx, realtimeweb, morph, or skalle, and include a title that appears in the instruction. Section is optional.",
          "For review questions use list_articles with waiting=true.",
          "For public uptime use probe_health. For a local ping of Brain itself use health_ping.",
          "Reply with JSON only: {\"reply\":\"one short sentence\",\"tools\":[{\"name\":\"tool\",\"input\":{}}]}",
          "If no tool is needed, return an empty tools array and put the answer in reply.",
          "",
          toolCatalog(),
          "",
          context(db),
        ].join("\n"),
      },
      ...history.slice(-4).flatMap((turn) => [
        { role: "user", content: turn.instruction.slice(0, 500) },
        { role: "assistant", content: turn.reply.slice(0, 500) },
      ]),
      { role: "user", content: instruction },
    ],
  };

  const payload = await withRetry(async () => {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    if (response.status === 429 || response.status >= 500) {
      throw new RetryableError(`Groq returned HTTP ${response.status}.`);
    }
    if (!response.ok) {
      throw new Error(`Groq returned HTTP ${response.status}.`);
    }
    return (await response.json()) as { choices?: { message?: { content?: string } }[] };
  });

  const content = payload.choices?.[0]?.message?.content ?? "";
  return parsePlan(content, instruction);
}
