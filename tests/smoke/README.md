Smoke checks against the public websites are not part of `npm test`.

They stay off unless `BRAIN_SMOKE=1` is set and a row has been added to `docs/approvals.md` for that run. Even then they are read-only HTTP checks. They do not sign in, publish, or change a server.
