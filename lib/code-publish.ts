import { codeArticleChange, type CodeFile } from "./code-agent";
import { readGithubRepo } from "./github";
import { repoForSite } from "./pull-request";

const reads: Record<string, string[]> = {
  synx: ["src/lib/posts.ts", "src/app/news/[slug]/page.tsx"],
  realtimeweb: ["lib/blog.ts"],
  skalle: ["src/content/articles.ts"],
};

export async function articleCodeFiles(
  env: Record<string, string | undefined>,
  input: { siteId: string; title: string; body: string; design: string },
  fetchImpl: typeof fetch = fetch,
  pemText?: string,
): Promise<{ ok: true; files: CodeFile[] } | { ok: false; error: string }> {
  if (input.siteId === "morph") {
    return codeArticleChange({ ...input, sources: {} });
  }
  const paths = reads[input.siteId];
  if (!paths) return { ok: false, error: "That website has no code pattern for an article. The pull request stays closed." };
  const repo = repoForSite(input.siteId, env);
  if (!repo) return { ok: false, error: "That website's repository is not configured. The pull request stays closed." };
  const sources: Record<string, string> = {};
  try {
    for (const path of paths) {
      const data = (await readGithubRepo(env, repo.owner, repo.name, `/contents/${path}`, fetchImpl, pemText)) as { content?: string };
      sources[path] = Buffer.from(data.content || "", "base64").toString("utf8");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub did not return the article files.";
    return { ok: false, error: `I couldn't read the article code. ${message}` };
  }
  return codeArticleChange({ ...input, sources });
}
