<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Brain

Brain is the local control centre for Synx, Real Time Web, Morph Space, and Skalle AI. It keeps its own drafts, roles, jobs, and audit log. The four websites stay on their own deployments.

## Modules

- Console: overview, agent, websites, pipeline, Drive, health, logs, settings
- `lib/harness`: tool registry, role check, approval gate, dry run, audit schema
- `lib/groq.ts`: Groq plan for an instruction. The key stays in `.env.local`
- `lib/workflow.ts`: article status, versions, duplicate guard
- `lib/agent.ts`: runs a Groq plan, or the local rules if Groq is unavailable

## Phases

0 Discovery, 1 Core, 2 Agent harness, 3 Site adapters, 4 Drive and publishing statuses, 5 Health, 6 Diagnostics, 7 Dashboard. Notes live in `docs/phases`. Discovery of the live sites is still read-only and is not started as a write phase.

## Tests

`npm test` runs the unit and integration suites and writes `reports/latest.md`. Smoke checks are off unless `BRAIN_SMOKE=1` and `docs/approvals.md` records the run.

## Logging

Use the schema in `lib/harness/log.ts`. Redact secrets. Do not log the Groq key.
