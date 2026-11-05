# Phase 4 — Drive and publishing statuses

## Goal

Statuses from Detected through Failed, with Drive intake only when credentials exist.

## Tasks

- Status path already enforced in `lib/workflow.ts`.
- Drive remains a local watch list until OAuth is provided.

## Files

- `lib/workflow.ts`, Drive console page

## Tests

- Duplicate publish guard. Integration fake does not call Google.

## Exit

- No Drive token stored.
