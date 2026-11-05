# Decisions

## 1. Brain is its own app

The control centre is this Next.js app. It does not deploy inside Synx, Real Time Web, Morph Space, or Skalle AI.

## 2. The harness lives in `lib/harness`

The repo already had an agent, roles, and a JSON store. The tool registry, audit schema, dry run, and approval gate extend that code instead of starting a second runtime.

## 3. Groq plans, Brain executes

Groq chooses a tool and a short reply. Brain runs the tool only after the role check. Publishing stays blocked. If Groq is down, the existing local rules still answer.

## 4. The Groq key is not in source

The key is read from `GROQ_API_KEY` in `.env.local`. That file is gitignored. Logs redact `gsk_` values.
