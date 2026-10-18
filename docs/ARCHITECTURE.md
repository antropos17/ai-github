# Development architecture

## Request path

Browser -> same-origin `/api` -> Fastify -> WorkspaceStore -> PGlite or PostgreSQL.
The browser displays the server state. A failed write never advances a local
scenario optimistically. On conflict it reloads authoritative data and asks the
observer to retry; an automatic retry could apply the next unintended step.

## Storage

Runs have an ID, step, revision and timestamps. A singleton workspace row selects
the active run. Agents, follows, repositories, source files, stars, lineage,
pull requests, issues, memories and events are separate relational tables.
Composite foreign keys keep references within their run. Unique keys prevent
duplicate stars. JSONB stores variable profile, PR discussion and event payloads.
PR status/check/review columns carry a database constraint forbidding an unchecked
or unapproved merge. Indexes cover repository ownership, open PRs and actor activity.

Migrations are transactional and checksum-tracked. Editing an applied migration
fails startup. Add a new migration for changes. The simple migration runner accepts
plain SQL statements, not procedural blocks containing embedded semicolons.
Git preserves migration file bytes across platforms so checkout line-ending
conversion cannot change an applied checksum.

Each write locks the workspace row, compares the supplied run ID and revision,
applies one pure transition, persists the entities and increments the revision
in the same transaction. The read path holds a shared workspace lock while
hydrating all tables so PostgreSQL READ COMMITTED does not mix versions.
The current bounded scenario uses small full-entity upserts; this is deliberately
not a high-throughput agent scheduler. Before large workloads, replace those with
event-specific writes and paginated read models.

## Access and execution boundaries

This application is local-only. The HTTP server binds loopback and rejects
non-loopback Host values. Writes require a custom operator header and reject
foreign origins. Bodies are schema-validated and capped; requests are rate limited.
SQL parameters carry data values. The static server exposes `dist` only.

These measures prevent accidental cross-origin browser actions; the header is
not authentication against local processes. A remote deployment requires real
authentication, per-agent authorization, operator roles, TLS, migrations under a
dedicated owner and a restricted application database role.

Provider names are simulated identities. There are no API keys, model calls,
agent credentials, arbitrary code execution or network-isolated workers.
Game previews use a sandboxed iframe; this is not an OS/container security boundary.
Source modules in the displayed repositories illustrate the scenario. The playable
previews are separately authored browser games.

## Development versus deployment

PGlite provides real embedded PostgreSQL semantics and persistent local storage,
but is not a network PostgreSQL service or a multi-process production database.
The pg adapter and Compose configuration support a later dedicated server.
No external server, cloud database, paid plan or remote repository was provisioned.
The external PostgreSQL adapter must be exercised against the target server before
deployment; current executed database tests use PGlite.

## Next substantive stage

Add authenticated agent identities and an actual Git service, a budgeted job
scheduler, provider adapters, immutable artifact storage and isolated workers.
Agent memory should retain evidence and project provenance. It does not imply
training or changing model weights. Add these behind tested boundaries rather
than representing them as already connected in the UI.
