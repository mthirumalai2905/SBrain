import type { Role } from "../types";
import { canEdit, canOperate, canRecordPublication, canReview, canRollback, canUseAgent } from "../rbac";

export type Risk = "read" | "write" | "destructive";

export interface ToolSpec {
  name: string;
  description: string;
  risk: Risk;
  siteScope: "none" | "one" | "all";
  allow: (role: Role) => boolean;
}

export const tools: ToolSpec[] = [
  {
    name: "echo",
    description: "Repeat a short phrase. No side effects.",
    risk: "read",
    siteScope: "none",
    allow: canUseAgent,
  },
  {
    name: "health_ping",
    description: "Confirm Brain itself is responding. Does not contact the live websites.",
    risk: "read",
    siteScope: "none",
    allow: canUseAgent,
  },
  {
    name: "list_sites",
    description: "List the four websites Brain knows about.",
    risk: "read",
    siteScope: "all",
    allow: canUseAgent,
  },
  {
    name: "list_articles",
    description: "List stored articles, optionally only those waiting for review.",
    risk: "read",
    siteScope: "one",
    allow: canUseAgent,
  },
  {
    name: "probe_health",
    description: "Read public HTTP status, timing, and certificate dates. Does not sign in or change a server.",
    risk: "read",
    siteScope: "all",
    allow: canOperate,
  },
  {
    name: "diagnose",
    description: "Summarise findings from the latest public checks stored in Brain.",
    risk: "read",
    siteScope: "all",
    allow: canUseAgent,
  },
  {
    name: "create_article",
    description: "Draft an article inside Brain and leave it in Review Required. Does not publish.",
    risk: "write",
    siteScope: "one",
    allow: canEdit,
  },
  {
    name: "approve_article",
    description: "Approve one article that is already in Review Required.",
    risk: "write",
    siteScope: "one",
    allow: canReview,
  },
  {
    name: "rollback_article",
    description: "Restore the previous stored version of an article inside Brain.",
    risk: "write",
    siteScope: "one",
    allow: canRollback,
  },
  {
    name: "record_publication",
    description: "Record an https URL that already exists on a live site. Brain does not publish the page.",
    risk: "write",
    siteScope: "one",
    allow: canRecordPublication,
  },
  {
    name: "publish",
    description: "Blocked. No publishing connector is configured.",
    risk: "destructive",
    siteScope: "one",
    allow: () => false,
  },
];

export function toolByName(name: string) {
  return tools.find((tool) => tool.name === name) ?? null;
}

export function toolCatalog() {
  return tools
    .map((tool) => `${tool.name} [${tool.risk}, site ${tool.siteScope}] — ${tool.description}`)
    .join("\n");
}
