import { createSign } from "crypto";
import { githubAppId, githubInstallationId, githubPrivateKey } from "./github-credentials";
import type { GitHost, PreparedPull } from "./pull-request";

function base64url(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

export function githubAppJwt(appId: string, pem: string, nowSeconds = Math.floor(Date.now() / 1000)) {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({ iat: nowSeconds - 60, exp: nowSeconds + 540, iss: appId }));
  const data = `${header}.${payload}`;
  const signature = createSign("RSA-SHA256").update(data).sign(pem).toString("base64url");
  return `${data}.${signature}`;
}

async function githubJson(fetchImpl: typeof fetch, token: string, method: string, url: string, body?: unknown) {
  const response = await fetchImpl(url, {
    method,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      "user-agent": "sbrain",
      "x-github-api-version": "2022-11-28",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data: { message?: string; token?: string; sha?: string; tree?: { sha?: string }; object?: { sha?: string }; default_branch?: string; number?: number; html_url?: string } = {};
  try {
    data = text ? (JSON.parse(text) as typeof data) : {};
  } catch {
    if (!response.ok) throw new Error(`GitHub returned HTTP ${response.status}.`);
    throw new Error("GitHub returned a response that was not JSON.");
  }
  if (!response.ok) {
    const message = typeof data.message === "string" ? data.message : `GitHub returned HTTP ${response.status}.`;
    throw new Error(message.slice(0, 300));
  }
  return data;
}

export async function openPullWithApi(pull: PreparedPull, token: string, fetchImpl: typeof fetch = fetch) {
  const root = `https://api.github.com/repos/${pull.owner}/${pull.repo}`;
  const repo = await githubJson(fetchImpl, token, "GET", root);
  const base = repo.default_branch || "main";
  const ref = await githubJson(fetchImpl, token, "GET", `${root}/git/ref/heads/${encodeURIComponent(base)}`);
  const parent = ref.object?.sha;
  if (!parent) throw new Error("The default branch has no commit.");
  const commit = await githubJson(fetchImpl, token, "GET", `${root}/git/commits/${parent}`);
  const baseTree = commit.tree?.sha;
  if (!baseTree) throw new Error("The default branch has no tree.");
  const tree = [];
  for (const file of pull.files) {
    const blob = await githubJson(fetchImpl, token, "POST", `${root}/git/blobs`, { content: file.content, encoding: "utf-8" });
    if (!blob.sha) throw new Error("GitHub did not store a file.");
    tree.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const nextTree = await githubJson(fetchImpl, token, "POST", `${root}/git/trees`, { base_tree: baseTree, tree });
  if (!nextTree.sha) throw new Error("GitHub did not build the tree.");
  const nextCommit = await githubJson(fetchImpl, token, "POST", `${root}/git/commits`, {
    message: `Brain: ${pull.title}`,
    tree: nextTree.sha,
    parents: [parent],
  });
  if (!nextCommit.sha) throw new Error("GitHub did not create the commit.");
  await githubJson(fetchImpl, token, "POST", `${root}/git/refs`, { ref: `refs/heads/${pull.branch}`, sha: nextCommit.sha });
  const opened = await githubJson(fetchImpl, token, "POST", `${root}/pulls`, {
    title: pull.title,
    head: pull.branch,
    base,
    body: pull.body,
  });
  if (!opened.html_url || !opened.number) throw new Error("GitHub did not open the pull request.");
  return { url: opened.html_url, number: opened.number };
}

async function installationToken(
  appId: string,
  installationId: string,
  pem: string,
  repo: string,
  fetchImpl: typeof fetch,
  permissions: Record<string, string> = { contents: "write", pull_requests: "write", metadata: "read", checks: "read" },
) {
  const jwt = githubAppJwt(appId, pem);
  const data = await githubJson(fetchImpl, jwt, "POST", `https://api.github.com/app/installations/${installationId}/access_tokens`, {
    repositories: [repo],
    permissions,
  });
  if (!data.token) throw new Error("GitHub did not issue an installation token.");
  return data.token;
}

export async function readGithubRepo(
  env: Record<string, string | undefined>,
  owner: string,
  repo: string,
  pathAndQuery: string,
  fetchImpl: typeof fetch = fetch,
  pemText?: string,
) {
  const appId = githubAppId(env);
  const installationId = githubInstallationId(env);
  const pem = githubPrivateKey(env, pemText);
  if (!pem.includes("PRIVATE KEY")) throw new Error("The GitHub App private key is missing.");
  const token = await installationToken(appId, installationId, pem, repo, fetchImpl, {
    contents: "read",
    pull_requests: "read",
    metadata: "read",
  });
  return githubJson(fetchImpl, token, "GET", `https://api.github.com/repos/${owner}/${repo}${pathAndQuery}`) as unknown;
}

export function githubHost(env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch): GitHost {
  const appId = githubAppId(env);
  const installationId = githubInstallationId(env);
  return {
    async open(pull) {
      const pem = githubPrivateKey(env);
      if (!pem.includes("PRIVATE KEY")) throw new Error("The GitHub App private key is missing.");
      const token = await installationToken(appId, installationId, pem, pull.repo, fetchImpl);
      return openPullWithApi(pull, token, fetchImpl);
    },
  };
}
