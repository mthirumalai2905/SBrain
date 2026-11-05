# Phase 3 — Site adapters

## Goal

One read-only description per site. No connector until one is supplied.

## Tasks

- Keep each site’s sections in its own record.
- Do not add a publisher for a site that has no approved connector.

## Files

- `lib/seed.ts`
- Future adapter files, one site at a time

## Tests

- Fixture file lists all four sites and calls nothing live.

## Exit

- Adapters stay read-only until `docs/approvals.md` has a row.
