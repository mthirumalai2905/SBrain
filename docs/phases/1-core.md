# Phase 1 — Core

## Goal

Local accounts, roles, store, jobs, and the audit schema.

## Tasks

- Roles: owner, editor, reviewer, operator, viewer.
- Article statuses and the duplicate guard.
- Shared log schema with redaction.

## Files

- `lib/auth.ts`, `lib/rbac.ts`, `lib/store.ts`, `lib/workflow.ts`, `lib/harness/log.ts`

## Tests

- Role gates, status transitions, duplicate titles, secret redaction.

## Exit

- `npm test` passes.
- No live database was introduced.
