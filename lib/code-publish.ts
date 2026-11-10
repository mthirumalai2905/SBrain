import path from "path";
import { applyPublish } from "./patch-agent";
import { readGithubRepo } from "./github";
import { repoForSite } from "./pull-request";
import type { CodeFile } from "./code-agent";

const preferred: Record<string, string[]> = {
  synx: [
    "src/lib/posts.ts",
    "src/app/news/[slug]/page.tsx",
    "src/app/news/page.tsx",
    "src/app/page.tsx",
    "src/app/sitemap.ts",
    "src/app/feed.xml/route.ts",
    "src/app/rss.xml/route.ts",
  ],
  realtimeweb: ["lib/blog.ts", "app/blog/[slug]/page.tsx", "app/blog/page.tsx", "app/page.tsx", "app/sitemap.ts"],
  skalle: [
    "src/content/articles.ts",
    "src/content/chronicles.ts",
    "src/app/articles/[slug]/page.tsx",
    "src/app/articles/page.tsx",
    "src/app/chronicles/[slug]/page.tsx",
    "src/app/chronicles/page.tsx",
    "src/app/page.tsx",
    "src/app/sitemap.ts",
  ],
  morph: ["src/lib/content.ts"],
};

export interface PublishProgress {
  note: (text: string) => void;
  read: (path: string) => void;
  patch: (path: string) => void;
}

export function choosePublishPaths(tree: string[], siteId: string, section: string, publishing: boolean) {
  const have = new Set(tree);
  if (!publishing) {
    const found = pagePaths(tree, section).slice(0, 6);
    if (found.length || tree.length) return found;
    const segment = section.replace(/^\/+|\/+$/g, "");
    return segment ? [`src/app/${segment}/page.tsx`, `app/${segment}/page.tsx`] : [];
  }
  const wanted = (preferred[siteId] ?? []).filter((file) => !tree.length || have.has(file));
  const extras = tree.filter((file) => /sitemap|rss|feed/i.test(file) && /\.(ts|tsx|xml)$/.test(file) && !wanted.includes(file)).slice(0, 2);
  const segment = section.replace(/^\/+|\/+$/g, "");
  const index = tree.filter((file) => {
    if (!segment || wanted.includes(file) || file.includes("[")) return false;
    return file.endsWith(`${segment}/page.tsx`) || file.endsWith(`/${segment}.tsx`);
  });
  return [...wanted, ...extras, ...index].slice(0, 8);
}

function pagePaths(tree: string[], section: string) {
  const segment = section.replace(/^\/+|\/+$/g, "");
  if (!segment) return [];
  return tree.filter((file) => {
    const normalized = file.replace(/\\/g, "/");
    if (!/\.(ts|tsx|jsx|mdx)$/.test(normalized)) return false;
    return (
      normalized.endsWith(`${segment}/page.tsx`) ||
      normalized.endsWith(`${segment}/page.jsx`) ||
      normalized.endsWith(`/${segment}.tsx`) ||
      normalized.includes(`/content/${segment}`)
    );
  });
}

function requiredPaths(siteId: string, section: string, publishing: boolean) {
  if (!publishing) return [];
  if (siteId === "synx") return ["src/lib/posts.ts", "src/app/news/[slug]/page.tsx"];
  if (siteId === "realtimeweb") return ["lib/blog.ts"];
  if (siteId === "skalle") return [/chronicle/i.test(section) ? "src/content/chronicles.ts" : "src/content/articles.ts"];
  return [];
}

function resolveImport(fromFile: string, spec: string, tree: Set<string>) {
  const candidates: string[] = [];
  if (spec.startsWith("@/")) {
    const base = spec.slice(2);
    candidates.push(`src/${base}`, base, `src/${base}.tsx`, `src/${base}.ts`, `${base}.tsx`, `${base}.ts`);
  } else if (spec.startsWith(".")) {
    const dir = fromFile.split("/").slice(0, -1).join("/");
    const joined = path.posix.normalize(`${dir}/${spec}`);
    candidates.push(joined, `${joined}.tsx`, `${joined}.ts`, `${joined}.jsx`);
  }
  return candidates.find((item) => tree.has(item)) ?? "";
}

async function readText(
  env: Record<string, string | undefined>,
  owner: string,
  repo: string,
  filePath: string,
  fetchImpl: typeof fetch,
  pemText?: string,
) {
  const data = (await readGithubRepo(env, owner, repo, `/contents/${filePath}`, fetchImpl, pemText)) as { content?: string };
  if (!data.content) return "";
  return Buffer.from(data.content, "base64").toString("utf8");
}

export async function articleCodeFiles(
  env: Record<string, string | undefined>,
  input: {
    siteId: string;
    title: string;
    body: string;
    design: string;
    section?: string;
    intentId?: string;
    author?: string;
    publishing?: boolean;
    now?: Date;
  },
  fetchImpl: typeof fetch = fetch,
  pemText?: string,
  progress?: PublishProgress,
): Promise<{ ok: true; files: CodeFile[] } | { ok: false; error: string }> {
  const publishing = input.publishing !== false;
  const section = input.section?.trim() || "";
  const repo = repoForSite(input.siteId, env);
  if (!repo) return { ok: false, error: "That website's repository is not configured. The pull request stays closed." };
  progress?.note(`Code agent is opening ${repo.owner}/${repo.name}.`);
  let tree: string[] = [];
  try {
    const listed = (await readGithubRepo(env, repo.owner, repo.name, "/git/trees/HEAD?recursive=1", fetchImpl, pemText)) as {
      tree?: { path?: string; type?: string }[];
    };
    tree = (listed.tree ?? []).filter((item) => item.type === "blob").map((item) => item.path ?? "").filter(Boolean);
  } catch {
    tree = [];
    progress?.note("The file list was slow, so the code agent is reading the known article files.");
  }
  const chosen = new Set(choosePublishPaths(tree, input.siteId, section, publishing));
  for (const file of requiredPaths(input.siteId, section, publishing)) chosen.add(file);
  const sources: Record<string, string> = {};
  const required = new Set(requiredPaths(input.siteId, section, publishing));
  for (const filePath of chosen) {
    progress?.note(`Code agent is reading ${filePath}.`);
    progress?.read(filePath);
    try {
      const text = await readText(env, repo.owner, repo.name, filePath, fetchImpl, pemText);
      if (text) sources[filePath] = text;
      else if (required.has(filePath)) return { ok: false, error: `I couldn't read ${filePath}. The pull request stays closed.` };
    } catch (error) {
      if (!required.has(filePath)) continue;
      const message = error instanceof Error ? error.message : "GitHub did not return the article files.";
      return { ok: false, error: `I couldn't read the article code. ${message}` };
    }
  }
  if (!publishing) {
    const have = new Set(tree);
    let added = 0;
    for (const [filePath, text] of Object.entries(sources)) {
      if (added >= 4) break;
      const specs = [...text.matchAll(/from\s+["']([^"']+)["']/g)].map((match) => match[1] ?? "");
      for (const spec of specs) {
        const resolved = resolveImport(filePath, spec, have);
        if (!resolved || sources[resolved] || added >= 4) continue;
        progress?.note(`Code agent is reading ${resolved}.`);
        progress?.read(resolved);
        try {
          const imported = await readText(env, repo.owner, repo.name, resolved, fetchImpl, pemText);
          if (imported) {
            sources[resolved] = imported;
            added += 1;
          }
        } catch {
          continue;
        }
      }
    }
  }
  if (!Object.keys(sources).length && input.siteId !== "morph") {
    return { ok: false, error: "I couldn't read the files this website uses. The pull request stays closed." };
  }
  const patched = applyPublish({
    siteId: input.siteId,
    intentId: input.intentId ?? "article",
    section,
    title: input.title,
    body: input.body,
    design: input.design,
    author: input.author,
    publishing,
    sources,
    now: input.now,
  });
  if (!patched.ok) return patched;
  for (const note of patched.notes) progress?.note(note);
  for (const file of patched.files) progress?.patch(file.path);
  return { ok: true, files: patched.files };
}
