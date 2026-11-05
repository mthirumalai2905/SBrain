# Phase 8 — Local stack

Localhost only. No VPS, live site, Google Drive, or GitHub write.

## Goal

A repeatable local environment: pinned dependencies, a MySQL and Directus stack on the developer's machine, and setup steps in the README.

## What changed

- `package.json` and the root entry of `package-lock.json`: `next`, `react`, `react-dom`, `@types/node`, `@types/react`, and `@types/react-dom` are pinned to the versions already in the lock file instead of `latest`. No installed version changed.

  | Package | Version |
  | --- | --- |
  | next | 16.4.5 |
  | react | 19.3.1 |
  | react-dom | 19.3.1 |
  | @types/node | 26.6.6 |
  | @types/react | 19.3.0 |
  | @types/react-dom | 19.3.0 |

- `docker-compose.dev.yml`: MySQL `8.4.13` and Directus `11.17.4`. Both ports are bound to `127.0.0.1` (3306 and 8055 by default). Data lives in named Docker volumes. Compose stops with an error if a required variable is missing from `.env.local`.
- `docker/mysql/init/01-databases.sh`: runs on the first start of an empty volume. Creates the `brain` and `directus` databases (utf8mb4) and grants the app user access to both.
- `.gitattributes`: keeps LF line endings on `*.sh`, so the init script still runs in the Linux container after a Windows checkout.
- `.env.example`: new empty variables for the stack. Real values go only in `.env.local`, which `.gitignore` already excludes.

  `MYSQL_ROOT_PASSWORD`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_PORT`, `BRAIN_DATABASE_URL`, `DIRECTUS_SECRET`, `DIRECTUS_ADMIN_EMAIL`, `DIRECTUS_ADMIN_PASSWORD`, `DIRECTUS_PORT`, `DIRECTUS_URL`

- `README.md`: a "Local setup" section covering `.env.local`, starting the containers, the first Directus login, and running Brain. The file was UTF-16 and is now UTF-8.

## Not changed

- Brain's code. It still uses its local JSON store and does not read `BRAIN_DATABASE_URL` yet. Wiring Brain to MySQL is a later phase.
- `typescript` is still `latest`. It was outside this phase's list.
- `docs/approvals.md`. Nothing here touches a live site, a VPS, Drive credentials, or a publishing connector.

## Tests

- `npm test`: 9 of 9 pass.
- `npm run build`: passes.
- Stack check, run once with throwaway values and then removed with `down -v`: MySQL healthy, both databases present, Directus installed its tables into `directus`, `/server/health` OK, and the admin login returned a token.

## Exit

- `npm test` and `npm run build` pass.
- Nothing listens on anything other than `127.0.0.1`.
- No secret or `.env.local` in git.
