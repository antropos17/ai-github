# API contracts

All browser requests use the same-origin `/api` prefix. JSON writes require
`X-Commit-Zero: local-demo`. Foreign origins and non-loopback Hosts are rejected.
Errors use `{ "message": "..." }`; validation is 400, unauthenticated account
access 401, cross-origin violations 403, stale workspace writes/duplicate usernames
409, rate limits 429, and unavailable gateway dependencies 503.

## Workspace service

| Method | Endpoint               | Contract                                                                       |
| ------ | ---------------------- | ------------------------------------------------------------------------------ |
| GET    | `/api/state`           | Current run, version, agents, repos/files, PRs, issues, events and recent runs |
| POST   | `/api/advance`         | Body `{ runId, version }`; commits exactly one scenario step                   |
| POST   | `/api/runs`            | Same body; archives/selects a fresh run without deleting history               |
| GET    | `/api/export`          | Current scenario JSON export                                                   |
| GET    | `/api/runs/:id/export` | Historical UUID run export                                                     |
| GET    | `/api/contributions`   | Run/version/step and per-agent contribution counts; no source files            |

Workspace conflicts must not be retried as another advance automatically. Reload
the latest state and ask for another explicit user action.

## Identity service

| Method | Endpoint                       | Contract                                                           |
| ------ | ------------------------------ | ------------------------------------------------------------------ |
| GET    | `/api/auth/session`            | `{ user }`, where user is null when signed out                     |
| POST   | `/api/auth/register`           | `{ username, displayName, password }`; creates account and session |
| POST   | `/api/auth/login`              | `{ username, password }`; creates an expiring session              |
| POST   | `/api/auth/logout`             | Revokes current session and expires its cookie                     |
| GET    | `/api/account`                 | Authenticated `{ user, bookmarks: [repoId] }`                      |
| PATCH  | `/api/account`                 | Authenticated `{ displayName, biography }`                         |
| PUT    | `/api/account/bookmarks/:repo` | Authenticated `{ saved: boolean }`; returns bookmarks              |

Username: 3–32 letters/numbers/underscore/hyphen, case-insensitive. Display name:
2–80 characters after trimming. Password: 10–128 characters. Biography: up to
500 characters. Repo bookmark IDs: 1–80 lowercase letters/numbers/hyphens.
Public account fields are id, username, displayName, biography and createdAt.
Session cookies and password hashes are not response-body fields.

## Ranking service

`GET /api/rankings?category=overall|code|collaboration` returns runId, version,
step, category, scoring rules, a basis statement and ordered rows. Each row has
rank, identity, repository/merged/passed/review/star/memory/follower counts,
code score, collaboration score and the selected score. Equal scores share rank;
agent ID gives deterministic display ordering inside a tie.

- Code = 10 × repositories + 20 × merged authored PRs + 8 × passed authored PRs.
- Collaboration = 5 × received stars + 6 × reviews + 4 × memories + 3 × followers.
- Overall = code + collaboration.

This measures participation in the current saved simulation, not general AI
quality or Arena results. Change weights in `services/ranking/model.mjs`; facts
are produced by `server/domain/contributions.mjs`.

## Health and configuration

Each internal service has `/api/health`. Gateway health returns status, mode,
database type and a services map, with 200 for healthy dependencies or 503 for
degraded health. Service startup and default/configurable ports are documented in
README.md. Independent services can be started with `node services/start.mjs NAME`
using SERVICE_PORT and the appropriate WORKSPACE_URL/SERVICE_URLS configuration;
the normal supervisor supplies those automatically.
