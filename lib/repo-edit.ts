import { readGithubRepo } from "./github";

function tokens(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !["the", "and", "for", "are", "was"].includes(word));
}

function distance(left: string, right: string) {
  const rows = Array.from({ length: left.length + 1 }, (_, index) => [index]);
  for (let column = 0; column <= right.length; column += 1) rows[0][column] = column;
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      rows[row][column] = Math.min(rows[row - 1][column] + 1, rows[row][column - 1] + 1, rows[row - 1][column - 1] + cost);
    }
  }
  return rows[left.length][right.length];
}

function sameWord(want: string, have: string) {
  if (want === have) return true;
  if (want.length < 4 || have.length < 4) return false;
  return distance(want, have) <= 1;
}

export function scoreName(value: string, name: string) {
  const wanted = tokens(name);
  const have = tokens(value);
  return wanted.filter((word) => have.some((item) => sameWord(word, item))).length;
}

function titleOnLine(line: string) {
  const quoted = /(?:title|text)\s*:\s*["']([^"']+)["']/.exec(line) || /#\s+(.+)$/.exec(line);
  return quoted?.[1]?.trim() ?? "";
}

export function patchEndingQuestion(content: string, name: string) {
  const lines = content.split("\n");
  let best = { index: -1, score: 0, value: "" };
  lines.forEach((line, index) => {
    const value = titleOnLine(line);
    const score = value ? scoreName(value, name) : 0;
    if (score > best.score) best = { index, score, value };
  });
  if (best.score < 3) return { ok: false as const, error: "I couldn't find that title in the repository." };
  if (/[?？]\s*$/.test(best.value)) return { ok: false as const, error: "That title already ends with a question mark." };
  const next = lines[best.index]?.replace(best.value, `${best.value}?`);
  if (!next || next === lines[best.index]) return { ok: false as const, error: "I couldn't update that title." };
  lines[best.index] = next;
  return { ok: true as const, content: lines.join("\n"), title: `${best.value}?` };
}

function lineScore(content: string, name: string) {
  return content.split("\n").reduce((best, line) => Math.max(best, scoreName(titleOnLine(line), name)), 0);
}

export async function findArticleFile(
  env: Record<string, string | undefined>,
  owner: string,
  repo: string,
  name: string,
  fetchImpl: typeof fetch = fetch,
  pemText?: string,
) {
  const tree = (await readGithubRepo(env, owner, repo, "/git/trees/HEAD?recursive=1", fetchImpl, pemText)) as {
    tree?: { path?: string; type?: string }[];
  };
  const files = (tree.tree ?? [])
    .map((item) => item.path ?? "")
    .filter((path) => itemIsSource(path) && /post|article|news/i.test(path))
    .slice(0, 12);
  let best: { path: string; content: string; score: number } | null = null;
  for (const path of files) {
    const data = (await readGithubRepo(env, owner, repo, `/contents/${path}`, fetchImpl, pemText)) as { content?: string };
    const content = Buffer.from(data.content || "", "base64").toString("utf8");
    const score = lineScore(content, name);
    if (!best || score > best.score) best = { path, content, score };
  }
  if (!best || best.score < 3) return { ok: false as const, error: `I couldn't find “${name}” in ${owner}/${repo}.` };
  return { ok: true as const, path: best.path, content: best.content };
}

function itemIsSource(path: string) {
  return /\.(ts|tsx|md|mdx)$/.test(path) && !path.includes("node_modules/");
}
