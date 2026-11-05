import { redact } from "./redact";

export type AuditActor = "human" | "agent" | "system";
export type AuditStatus = "ok" | "failed" | "blocked" | "dry_run";

export interface AuditEvent {
  timestamp: string;
  run_id: string;
  actor: AuditActor;
  site: string;
  tool: string;
  input: string;
  result: string;
  status: AuditStatus;
  duration_ms: number;
  retry_count: number;
  approval_id: string | null;
  error: string | null;
}

const required = [
  "timestamp",
  "run_id",
  "actor",
  "site",
  "tool",
  "input",
  "result",
  "status",
  "duration_ms",
  "retry_count",
  "approval_id",
  "error",
] as const;

export function auditEvent(input: AuditEvent): AuditEvent {
  return {
    ...input,
    input: redact(input.input),
    result: redact(input.result),
    error: input.error ? redact(input.error) : null,
  };
}

export function assertAudit(event: AuditEvent) {
  for (const key of required) {
    if (!(key in event)) throw new Error(`Audit event is missing ${key}.`);
  }
  const blob = `${event.input} ${event.result} ${event.error ?? ""}`;
  if (/gsk_[A-Za-z0-9]/.test(blob) || /Bearer\s+(?!\[redacted\])\S+/i.test(blob)) {
    throw new Error("Audit event still contains a secret.");
  }
  return event;
}

export function auditLine(event: AuditEvent) {
  const safe = assertAudit(auditEvent(event));
  return [
    safe.timestamp,
    safe.run_id,
    safe.actor,
    safe.site || "-",
    safe.tool,
    safe.status,
    `${safe.duration_ms}ms`,
    `retry ${safe.retry_count}`,
    safe.approval_id ? `approval ${safe.approval_id}` : "approval -",
    safe.error ? `error ${safe.error}` : "error -",
  ].join(" · ");
}
