import type { DB } from "./types";
import { githubCredentialsReady } from "./github-credentials";
import { namedSiteIds } from "./router";
import { readGithubRepo } from "./github";
import { repoForSite } from "./pull-request";
import { siteById } from "./workflow";

export type RepoQuestionKind = "commit" | "commits" | "pulls";

interface CommitItem {
  sha?: string;
  html_url?: string;
  commit?: { message?: string; author?: { name?: string; date?: string } };
}

interface PullItem {
  number?: number;
  title?: string;
  html_url?: string;
}

export function repoQuestionKind(text: string): RepoQuestionKind | null {
  if (!/\b(commits?|pull requests?|\bprs?\b|branch(es)?|repositor(y|ies)|\brepos?\b)\b/i.test(text)) return null;
  if (/\bpull requests?\b|\bprs?\b/i.test(text) && !/\bcommits?\b/i.test(text)) return "pulls";
  if (/\bcommits\b/i.test(text) && !/\b(latest|last|newest)\b/i.test(text)) return "commits";
  if (/\b(commits?|repositor(y|ies)|\brepos?\b|branch(es)?)\b/i.test(text)) return "commit";
  return null;
}

function ready(env: Record<string, string | undefined>, keyReady?: boolean) {
  return githubCredentialsReady(env, keyReady);
}

function firstLine(value: string) {
  return value.split("\n")[0]?.trim().slice(0, 140) || "No message";
}

function when(value: string | undefined) {
  return value?.slice(0, 10) || "an unknown date";
}

function describeCommit(item: CommitItem) {
  const sha = (item.sha || "").slice(0, 7);
  const message = firstLine(item.commit?.message || "");
  const author = item.commit?.author?.name || "an unknown author";
  return `${sha} “${message}” by ${author} on ${when(item.commit?.author?.date)}`;
}

export async function answerRepoQuestion(
  db: DB,
  text: string,
  options?: { env?: Record<string, string | undefined>; fetchImpl?: typeof fetch; keyReady?: boolean; pem?: string },
) {
  const sites = namedSiteIds(text);
  if (sites.length !== 1) {
    return {
      ok: false,
      siteId: "",
      reply: sites.length > 1 ? "Name one website so I know which repository to read." : "Name one website: Synx, Real Time Web, Morph Space, or Skalle AI.",
    };
  }
  const siteId = sites[0] ?? "";
  const site = siteById(db, siteId);
  const name = site?.name ?? siteId;
  const kind = repoQuestionKind(text) ?? "commit";
  const env = options?.env ?? process.env;
  const repo = repoForSite(siteId, env);
  const subject = kind === "pulls" ? "open pull requests" : kind === "commits" ? "recent commits" : "latest commit";
  if (!repo) return { ok: false, siteId, reply: `${name}’s repository is not configured, so I can’t read its ${subject}.` };
  if (!options?.pem && !ready(env, options?.keyReady)) {
    return { ok: false, siteId, reply: `${name} is ${repo.owner}/${repo.name}, but the GitHub App id or installation id is missing, so I can’t read its ${subject}.` };
  }
  try {
    const fetchImpl = options?.fetchImpl ?? fetch;
    if (kind === "pulls") {
      const data = (await readGithubRepo(env, repo.owner, repo.name, "/pulls?state=open&per_page=5", fetchImpl, options?.pem)) as PullItem[] | PullItem;
      const pulls = Array.isArray(data) ? data : [];
      if (!pulls.length) return { ok: true, siteId, reply: `${name} (${repo.owner}/${repo.name}) has no open pull requests.` };
      const lines = pulls.slice(0, 5).map((item) => `#${item.number ?? "?"} ${item.title || "Untitled"}${item.html_url ? ` — ${item.html_url}` : ""}`);
      return { ok: true, siteId, reply: `Open pull requests on ${name} (${repo.owner}/${repo.name}):\n${lines.join("\n")}` };
    }
    const limit = kind === "commits" ? 5 : 1;
    const data = (await readGithubRepo(env, repo.owner, repo.name, `/commits?per_page=${limit}`, fetchImpl, options?.pem)) as CommitItem[] | CommitItem;
    const commits = Array.isArray(data) ? data : data.sha ? [data] : [];
    if (!commits.length) return { ok: true, siteId, reply: `${name} (${repo.owner}/${repo.name}) has no commits yet.` };
    if (limit === 1) {
      const item = commits[0];
      const link = item?.html_url ? ` ${item.html_url}` : "";
      return { ok: true, siteId, reply: `Latest commit on ${name} (${repo.owner}/${repo.name}) is ${describeCommit(item ?? {})}.${link}` };
    }
    const lines = commits.slice(0, 5).map((item) => describeCommit(item));
    return { ok: true, siteId, reply: `Recent commits on ${name} (${repo.owner}/${repo.name}):\n${lines.join("\n")}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "GitHub did not answer.";
    return { ok: false, siteId, reply: `I couldn’t read ${name}’s repository. ${message}` };
  }
}
