# Phase 5 — Health

## Goal

Public GET checks and certificate dates. No server login.

## Tasks

- Probe only the public URLs already listed on each site.
- Operators and owners may run the check.

## Files

- `lib/health.ts`

## Tests

- Smoke suite stays disabled in `npm test`.

## Exit

- A health run does not restart or configure a server.
