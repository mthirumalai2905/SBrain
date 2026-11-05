import type { ArticleStatus, Role } from "./types";

export function canEdit(role: Role) {
  return role === "owner" || role === "editor";
}

export function canReview(role: Role) {
  return role === "owner" || role === "reviewer";
}

export function canRecordPublication(role: Role) {
  return role === "owner";
}

export function canOperate(role: Role) {
  return role === "owner" || role === "operator";
}

export function canUseAgent(role: Role) {
  return role !== "viewer";
}

export function canRollback(role: Role) {
  return role === "owner" || role === "editor";
}

export const roleLabel: Record<Role, string> = {
  owner: "Owner",
  editor: "Editor",
  reviewer: "Reviewer",
  operator: "Operator",
  viewer: "Viewer",
};

export const roleDetail: Record<Role, string> = {
  owner: "Settings, approval, publication records, and local recovery.",
  editor: "Create and edit articles. Cannot approve or record a live URL.",
  reviewer: "Approve work that is waiting for review.",
  operator: "Run health checks and authorised local recovery.",
  viewer: "Read the control centre. Cannot change content.",
};

export const statusLabel: Record<ArticleStatus, string> = {
  detected: "Detected",
  processing: "Processing",
  review_required: "Review Required",
  approved: "Approved",
  published: "Published",
  failed: "Failed",
};

export const statusOrder: ArticleStatus[] = [
  "detected",
  "processing",
  "review_required",
  "approved",
  "published",
  "failed",
];
