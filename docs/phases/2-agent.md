# Phase 2 — Agent harness

## Goal

A tool runtime the chat can call, with Groq choosing the tool.

## Tasks

- Registry with risk levels.
- Role check before every call.
- Destructive tools blocked.
- Dry run.
- Retries for the model request.
- Echo and health ping included.

## Files

- `lib/harness/`, `lib/groq.ts`, `lib/agent.ts`, `app/api/agent/route.ts`

## Tests

- Publish blocked, viewer cannot draft, dry run writes nothing, plan JSON parses.

## Exit

- `npm test` passes.
- A missing Groq key falls back to the local rules.
