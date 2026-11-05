export type Role = "owner" | "editor" | "reviewer" | "operator" | "viewer";

export type ArticleStatus =
  | "detected"
  | "processing"
  | "review_required"
  | "approved"
  | "published"
  | "failed";

export type SectionKind = "news" | "journal" | "docs" | "page" | "legal" | "holding";

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface User extends PublicUser {
  passwordHash: string;
}

export interface Section {
  id: string;
  label: string;
  path: string;
  kind: SectionKind;
  note?: string;
}

export interface Site {
  id: string;
  name: string;
  slug: string;
  publicUrl: string;
  summary: string;
  stack: string;
  formatting: string;
  deploymentNote: string;
  connector: "not_configured";
  sections: Section[];
  checks: string[];
}

export interface Version {
  id: string;
  title: string;
  body: string;
  section: string;
  savedAt: string;
  savedBy: string;
}

export interface HistoryEvent {
  id: string;
  at: string;
  status: ArticleStatus;
  actor: string;
  note: string;
}

export interface Article {
  id: string;
  siteId: string;
  title: string;
  slug: string;
  section: string;
  status: ArticleStatus;
  author: string;
  source: "manual" | "drive" | "agent";
  documentUrl: string;
  body: string;
  publishedUrl: string;
  duplicateOf: string | null;
  versions: Version[];
  history: HistoryEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface DriveFile {
  id: string;
  name: string;
  folder: string;
  targetSiteId: string;
  articleId: string | null;
  state: "detected" | "processed" | "duplicate" | "failed";
  addedAt: string;
  addedBy: string;
}

export interface Job {
  id: string;
  kind: "format_article";
  articleId: string;
  status: "queued" | "running" | "done" | "error";
  attempts: number;
  maxAttempts: number;
  lastError: string;
  createdAt: string;
  updatedAt: string;
}

export interface Probe {
  url: string;
  siteId: string;
  ok: boolean;
  status: number;
  ms: number;
  error: string;
  certExpires: string;
  certError: string;
  checkedAt: string;
}

export interface AgentStep {
  id: string;
  tool: string;
  summary: string;
  ok: boolean;
}

export interface AgentRun {
  id: string;
  at: string;
  actor: string;
  actorId: string;
  instruction: string;
  reply: string;
  steps: AgentStep[];
}

export interface LogEntry {
  id: string;
  at: string;
  kind: "auth" | "content" | "agent" | "health" | "drive" | "system";
  actor: string;
  action: string;
  target: string;
  detail: string;
}

export interface DB {
  version: 1;
  users: User[];
  sites: Site[];
  articles: Article[];
  jobs: Job[];
  probes: Probe[];
  runs: AgentRun[];
  logs: LogEntry[];
  drive: {
    connected: false;
    folders: string[];
    files: DriveFile[];
  };
}

export type Outcome<T> = { ok: true; value: T; message: string } | { ok: false; error: string };
