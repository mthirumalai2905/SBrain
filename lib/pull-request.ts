import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import { githubCredentialsReady, githubRepoSlug } from "./github-credentials";
import type { DB, PublicUser } from "./types";
import type { Intent, PromptSeal } from "./prompt-stage";
import { auditEvent, auditLine, type AuditActor, type AuditStatus } from "./harness/log";
import { intentById } from "./intents";
import { stageCodePush } from "./prompt-stage";
import { siteById } from "./workflow";

export interface PullFile {
  path: string;
  content: string;
}

export interface PreparedPull {
  siteId: string;
  intent: Intent;
  owner: string;
  repo: string;
  branch: string;
  title: string;
  body: string;
  section: string;
  files: PullFile[];
  approvalId: string;
}

export interface CodePushPlan {
  promptOk: boolean;
  error: string;
  pull: PreparedPull | null;
}

export function githubPullApproval(markdown: string) {
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.startsWith("|") || line.includes("---")) continue;
    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);
    if (cells.length < 5) continue;
    const [, , system, action, status] = cells;
    if (!system || !action || !status) continue;
    if (system.toLowerCase() !== "github") continue;
    if (status.toLowerCase() !== "approved") continue;
    if (!/pull request/i.test(action)) continue;
    if (/\b(merge|deploy|publish)\b/i.test(action) && !/\bdo not\b/i.test(action)) continue;
    return { id: "apr_github_pr" };
  }
  return null;
}

export function repoForSite(siteId: string, env: Record<string, string | undefined> = process.env) {
  const value = githubRepoSlug(siteId, env);
  const match = /^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/.exec(value);
  if (!match) return null;
  return { owner: match[1], name: match[2] };
}

function safeRepoPath(filePath: string) {
  const normalized = filePath.replace(/\\/g, "/").replace(/^\/+/, "").trim();
  if (!normalized || normalized.includes("..") || normalized.includes("\0") || normalized.endsWith("/")) return "";
  const lower = normalized.toLowerCase();
  if (/^(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb)$/.test(lower)) return "";
  if (lower === ".github" || lower.startsWith(".github/") || lower.includes("/.github/")) return "";
  if (/(^|\/)\.env($|\.)/.test(lower) || lower.endsWith(".pem")) return "";
  return normalized;
}

function pathMatchesSection(filePath: string, section: string) {
  const segment = section.replace(/^\/+/, "").replace(/\/+$/, "");
  if (!segment) return false;
  return filePath === segment || filePath.startsWith(`${segment}/`) || filePath.includes(`/${segment}/`);
}

export function filesFromBrief(brief: string, allowedPaths: string[]) {
  const files: PullFile[] = [];
  const pattern = /(?:^|\n)file:\s*([^\n`]+)\n+```[^\n]*\n([\s\S]*?)```/gi;
  for (const match of brief.matchAll(pattern)) {
    const filePath = safeRepoPath(match[1] ?? "");
    const content = (match[2] ?? "").replace(/\s+$/, "");
    if (!filePath) return { ok: false as const, missing: false as const, error: "A named file is a lockfile, workflow, secret, or an unsafe path. The pull request stays closed." };
    if (!content) return { ok: false as const, missing: false as const, error: "A named file is empty. The pull request stays closed." };
    if (!allowedPaths.some((section) => pathMatchesSection(filePath, section))) {
      return { ok: false as const, missing: false as const, error: `${filePath} is outside this intent's paths. The pull request stays closed.` };
    }
    if (files.some((file) => file.path === filePath)) return { ok: false as const, missing: false as const, error: "The brief names the same file twice." };
    if (content.length > 200_000) return { ok: false as const, missing: false as const, error: "A named file is too large. The pull request stays closed." };
    files.push({ path: filePath, content });
  }
  if (!files.length) {
    return { ok: false as const, missing: true as const, error: "Name each repository file as `file: path/in/repo` followed by a fenced block. The pull request stays closed." };
  }
  if (files.length > 8) return { ok: false as const, missing: false as const, error: "A pull request can carry at most eight files." };
  return { ok: true as const, files };
}

function suppliedFiles(files: PullFile[] | undefined) {
  if (!files?.length) return null;
  const safe: PullFile[] = [];
  for (const file of files) {
    const filePath = safeRepoPath(file.path);
    if (!filePath) return { ok: false as const, missing: false as const, error: "A named file is a lockfile, workflow, secret, or an unsafe path. The pull request stays closed." };
    if (!file.content.trim()) return { ok: false as const, missing: false as const, error: "A named file is empty. The pull request stays closed." };
    if (file.content.length > 200_000) return { ok: false as const, missing: false as const, error: "A named file is too large. The pull request stays closed." };
    safe.push({ path: filePath, content: file.content.replace(/\s+$/, "") });
  }
  if (safe.length > 8) return { ok: false as const, missing: false as const, error: "A pull request can carry at most eight files." };
  return { ok: true as const, files: safe };
}

function titleFrom(brief: string, filePath: string) {
  const quoted = /[“"]([^”"]{2,120})[”"]/.exec(brief);
  if (quoted) return quoted[1].trim();
  return filePath.split("/").pop() || "Site change";
}

function credentialsReady(env: Record<string, string | undefined>, keyReady: boolean | undefined) {
  return githubCredentialsReady(env, keyReady);
}

export function prepareCodePush(
  db: DB,
  brief: string,
  actor: PublicUser,
  options?: {
    approvalText?: string;
    env?: Record<string, string | undefined>;
    keyReady?: boolean;
    siteId?: string;
    intentId?: string;
    document?: { title: string; body: string; section?: string };
    files?: PullFile[];
    title?: string;
  },
): CodePushPlan {
  const sealed = stageCodePush(db, brief, actor, { siteId: options?.siteId, intentId: options?.intentId });
  if (!sealed.ok) return { promptOk: false, error: sealed.error, pull: null };
  const supplied = suppliedFiles(options?.files);
  const named = supplied ?? filesFromBrief(brief, sealed.value.allowedPaths);
  let files: { ok: true; files: PullFile[] } | { ok: false; error: string } = named;
  if (!named.ok && named.missing && options?.document) {
    const spec = intentById(sealed.value.intent);
    const site = siteById(db, sealed.value.siteId);
    if (spec?.documentFile && site) {
      const placed = spec.documentFile({ site, title: options.document.title, body: options.document.body, section: options.document.section });
      files = placed.ok ? { ok: true, files: [{ path: placed.path, content: placed.content }] } : placed;
    }
  }
  if (!files.ok) return { promptOk: true, error: files.error, pull: null };
  const approvalText = options?.approvalText ?? readFileSync(path.join(process.cwd(), "docs", "approvals.md"), "utf8");
  const approval = githubPullApproval(approvalText);
  if (!approval) return { promptOk: true, error: "Opening a pull request is not approved. The live sites stay closed.", pull: null };
  if (/^\s*(dry[\s-]?run|preview)\b/i.test(brief)) {
    return { promptOk: true, error: "Dry run. The prompt is sealed and no pull request was opened.", pull: null };
  }
  const env = options?.env ?? process.env;
  const repo = repoForSite(sealed.value.siteId, env);
  if (!repo) return { promptOk: true, error: `The repository for ${sealed.value.siteId} is not configured. The pull request stays closed.`, pull: null };
  if (!credentialsReady(env, options?.keyReady)) {
    return { promptOk: true, error: "The GitHub App id, installation id, or private key is missing. The pull request stays closed.", pull: null };
  }
  const title = options?.title?.trim() || titleFrom(brief, files.files[0]?.path ?? "change");
  const pull = renderPull(sealed.value, repo, files.files, title, brief, approval.id);
  return { promptOk: true, error: "", pull };
}

function renderPull(seal: PromptSeal, repo: { owner: string; name: string }, files: PullFile[], title: string, brief: string, approvalId: string): PreparedPull {
  const branch = `brain/${randomUUID().slice(0, 8)}`;
  const body = [
    `Site: ${seal.siteId}`,
    `Intent: ${seal.intent}`,
    "Files:",
    ...files.map((file) => `- ${file.path}`),
    "",
    "Opened by Brain. This pull request is not merged and the live site is not deployed.",
    "",
    "Brief:",
    brief.trim().slice(0, 4000),
  ].join("\n");
  return {
    siteId: seal.siteId,
    intent: seal.intent,
    owner: repo.owner,
    repo: repo.name,
    branch,
    title: title.slice(0, 120),
    body,
    section: sectionFor(files, seal.allowedPaths),
    files,
    approvalId,
  };
}

export interface GitHost {
  open(pull: PreparedPull): Promise<{ url: string; number: number }>;
}

function sectionFor(files: PullFile[], allowed: string[]) {
  const filePath = files[0]?.path ?? "";
  return allowed.find((section) => pathMatchesSection(filePath, section)) ?? allowed[0] ?? "";
}

export function pullAuditLine(input: { site: string; status: AuditStatus; result: string; error: string | null; approvalId: string | null; durationMs: number; actor?: AuditActor }) {
  return auditLine(
    auditEvent({
      timestamp: new Date().toISOString(),
      run_id: randomUUID(),
      actor: input.actor ?? "agent",
      site: input.site,
      tool: "open_pull_request",
      input: "one pull request",
      result: input.result.slice(0, 500),
      status: input.status,
      duration_ms: input.durationMs,
      retry_count: 0,
      approval_id: input.approvalId,
      error: input.error,
    }),
  );
}

export async function raisePullRequest(plan: CodePushPlan, host: GitHost | null) {
  if (!plan.pull) return { ok: false as const, error: plan.error || "The pull request stays closed." };
  if (!host) return { ok: false as const, error: "GitHub is not configured. The pull request stays closed." };
  const opened = await host.open(plan.pull);
  if (!/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/\d+$/.test(opened.url)) {
    return { ok: false as const, error: "GitHub did not return a pull request URL." };
  }
  return { ok: true as const, url: opened.url, number: opened.number, pull: plan.pull };
}
