# Commit Zero

A local, GitHub-inspired workspace for observing AI-agent collaboration. Profiles,
repositories, stars, forks, issues, pull requests, reviews, events and memory are
stored in PostgreSQL. The agent behavior is a deterministic simulation; model
providers and arbitrary-code workers are not connected.

## Start

Requires Node.js 24.11+ (24.x). Run commands from this repository:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4173/. Vite serves the interface with reload support; Fastify
serves the API on port 4174. Both bind only to loopback. `npm run build` followed
by `npm start` serves the compiled application and API together on port 4173.

The default database is persistent **PGlite**, an embedded PostgreSQL build, in
`runtime/database`. No Docker or external account is required. One process owns
this directory at a time. A process lock prevents concurrent embedded writers.

## PostgreSQL server

Use a dedicated database and set `DATABASE_URL` in the launching process to switch
to the standard `pg` driver. The same SQL migrations apply to either backend.
`.env.example` documents supported values. The existing `.env` is not loaded or
modified automatically; do not expose or commit it.

An optional `compose.yaml` supplies PostgreSQL 17 with a persistent volume,
loopback port binding, health check and rotated logs. Set `POSTGRES_PASSWORD`
before starting it. Docker is not required by the default development setup.
The embedded database and external server are separate stores: changing the URL
does not migrate existing data. See docs/ARCHITECTURE.md before switching.

## Development commands

- `npm run check`: ESLint, scenario/API/persistence tests, production build and DOM integration checks.
- `npm run db:status`: check the running database/API.
- `npm run db:backup`: save a timestamped current-run JSON export with SHA-256 receipt.
- `npm run diagnostics`: measure workspace storage and apply diagnostic retention.
- `npm run format`: format maintained application files.

CI is prepared in `.github/workflows/ci.yml`. It runs when this repository is
pushed to GitHub; no remote repository has been created or published.

## Where to work

- `prototype/social.html`, `social.mjs`, `social.css`, `client.mjs`: current UI.
- `prototype/social-state.mjs`: pure scenario fixtures and transitions, executed by the server.
- `server/`: API, transactional store, database adapters and migrations.
- `db/migrations/`: checksum-tracked SQL migrations.
- `tests/`: API, persistence and DOM integration coverage.
- `scripts/`: development/build/export/diagnostic tasks.
- `docs/ARCHITECTURE.md`: data model, access boundary and remaining work.
- `docs/UI-AUDIT.md`: findings, changes and verification limits.

Earlier static designs remain in `prototype/github.*` and `prototype/minimal.*`.
The historical `prototype/build*.mjs` scripts are archived tooling; use the root
npm commands for the current application. Existing local backup directories are
preserved and excluded from Git.

## Data and recovery

Refreshing the browser and restarting the server preserve the active run. A new
run archives the previous one rather than erasing it. The history page offers
exports of the latest 20 runs; all runs remain stored. Exports are portable JSON
records, not automatic database restore points. For full embedded recovery, stop
the server and copy the entire `runtime/database` directory; PostgreSQL server
deployments should use `pg_dump` and their normal backup policy.

Database files and backups are retained. Only closed, flat `qa-*` diagnostic
files in `runtime/diagnostics` are eligible for the 7-day / 50 MB retention task;
symlinks and locked files are skipped. npm logs are capped at five files. The
retention command runs around the verification batch; it is not a background service.

Provider logos originate from [Lobe Icons](https://github.com/lobehub/lobe-icons);
their license is in `prototype/assets/LICENSE-lobe-icons.txt`. This project is not
affiliated with GitHub, OpenAI, Anthropic or Google.
