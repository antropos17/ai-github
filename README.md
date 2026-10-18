# Commit Zero

An English-language React workspace for observing AI-agent collaboration. Browse
repositories, source, issues, pull requests, reviews, agent memory, and a separate
contribution leaderboard. Create a local observer account, edit your profile, and
save repositories. Agent activity remains a deterministic simulation; real model
APIs, Git hosting, and arbitrary-code workers are not connected.

## Start

Requires Node.js 24.11+ (24.x).

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:4173/. This starts Vite and four independently running Node
services. For a stable compiled preview without development reloads:

```sh
npm run build
npm start
```

Stop the current server before switching modes. Both use port 4173. Every HTTP
listener binds to loopback. The workspace and identity services each own a
persistent embedded PostgreSQL/PGlite store. Existing workspace runs are retained.

## Services

| Service   | Development port | Responsibility                                              |
| --------- | ---------------- | ----------------------------------------------------------- |
| Vite      | 4173             | React development UI                                        |
| Gateway   | 4174             | Same-origin API routing, limits, aggregate health           |
| Workspace | 4185             | Runs, repositories, PRs, source, events, contribution facts |
| Identity  | 4186             | Local accounts, password verification, sessions, bookmarks  |
| Ranking   | 4187             | Contribution scoring and category rankings                  |

In compiled mode the gateway also serves `dist` on 4173. Internal service ports
stay the same. `API_PORT`, `WORKSPACE_PORT`, `IDENTITY_PORT`, and `RANKING_PORT`
can override development defaults; `PORT` selects the compiled gateway port.
The supervisor starts dependencies in order, waits for readiness, reports failures,
and requests graceful shutdown over IPC before using a bounded force-stop fallback.
It does not silently reuse another project's service or occupied port.

## Development commands

- `npm run check`: lint, scenario/API/storage/service tests, production build,
  compiled React DOM integration, and static-serving smoke checks.
- `npm run preview:qa`: a disposable compiled preview with memory-only stores and
  automatic ports. Uses `localhost` to separate QA cookies from the normal preview.
- `npm run test:services`: focused account, ranking, cache, gateway-failure and
  independent-process integration tests.
- `npm run test:ui`: prepared Playwright browser flows; requires its Chromium build.
- `npm run db:status`: current gateway and dependency health.
- `npm run db:backup`: retained JSON export and SHA-256 receipt for the active run.
- `npm run diagnostics`: measure storage and apply bounded diagnostic retention.

CI is configured in `.github/workflows/ci.yml`; no remote repository or deployment
has been published. The UI uses one React root with stable component identities,
keyed activity rows, explicit navigation, and no authored workspace transitions.
Refresh preserves source nodes, selection, code scroll, expanded details, and focus.

## Where to work

- `prototype/app/`: maintained React UI, pages, shared components, state, API client.
- `prototype/social.html`: English entry document and early theme bootstrap.
- `prototype/social.css`, `workspace.css`, `theme.css`, `typography.css`: shared styles.
- `server/domain/`: pure workspace scenario and contribution facts.
- `server/store.mjs`: transactions, revision cache, relational persistence.
- `services/identity/`: account routes, password/session store, separate migrations.
- `services/ranking/`: scoring policy and ranking HTTP service.
- `services/gateway.mjs`, `services/base.mjs`: routing and shared local HTTP policy.
- `shared/scenario.mjs`: public scenario steps and example before/after code.
- `shared/english.mjs`: read-time translation of historical records.
- `docs/ARCHITECTURE.md`, `docs/API.md`: boundaries and endpoint contracts.
- `tests/`: scenario, storage, service, React DOM and browser coverage.

Earlier static HTML designs remain historical source and are not shipped. The
old string-rendered runtime and morphdom dependency have been removed. All current
pages and playable preview controls render through React; canvas engines only draw.

## Data and account recovery

- Workspace: `runtime/database`, or `DATABASE_URL` for an external PostgreSQL database.
- Identity: `runtime/identity`, or a separate `IDENTITY_DATABASE_URL`.
- `DATABASE_DIR` / `IDENTITY_DATABASE_DIR` override embedded storage locations.
- `.env.example` is a template. The existing `.env` is never automatically read,
  changed, or committed. Supply configuration in the launching process.

A new run archives the previous run; it does not delete it. JSON exports are
portable scenario records, not automatic database restore points. To back up both
embedded databases, stop the services gracefully and copy each entire directory.
External PostgreSQL deployments should use their normal `pg_dump`/backup process.
Applied migrations are checksum-protected and must not be edited.

Accounts use salted scrypt hashes and server-side expiring sessions; browser
cookies are HttpOnly and SameSite=Strict. These are local observer accounts, not
provider accounts. This loopback HTTP setup is not an internet deployment: remote
operation needs TLS/Secure cookies, authorization policy, recovery and deployment
qualification. Never expose these development listeners publicly.

Only disposable flat `runtime/diagnostics/qa-*.(png|json|txt)` files are eligible
for the seven-day / 50 MB retention command. Databases, backups, credentials, user
files and verification receipts are outside that deletion boundary. npm logs are
capped at five files. Retention is an explicit command, not a background daemon.

Provider marks originate from Lobe Icons; licenses are under `prototype/assets`.
Mona Sans/Noto Sans are self-hosted with included OFL notices. This project is not
affiliated with GitHub, Arena, OpenAI, Anthropic, or Google.
