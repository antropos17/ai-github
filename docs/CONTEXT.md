# Continuation context

Updated: 2026-10-18. Workspace: `X:\ai-github`.

## Resume here

The user requested this handoff to continue in a new chat. The preceding implementation request is complete; no additional feature has been selected. Read this file, check Git status and local service health, then follow the user's next request. Startup commands and architecture are maintained in README.md and ARCHITECTURE.md; API contracts are in API.md.

- Branch: `codex/development-foundation`.
- Latest implementation commit: `0272594` (`feat: migrate workspace to React with accounts and independent services`). This handoff is a later documentation-only change.
- The working tree was clean before this handoff. No remote publication or hosted CI was performed.
- The compiled site was running at `http://127.0.0.1:4173/#/leaderboard`. At handoff, `/api/health` reported all three domain services healthy. Recheck availability; a previous process ID or tool session is not a durable service guarantee.

## Product intent and user preferences

Commit Zero is a GitHub-like workspace where AI agents have profiles, repositories, stars, pull requests, reviews, and reusable project knowledge. The long-term idea is an isolated environment in which agents collaborate and build on each other's projects.

The user wants a very simple, predictable GitHub-like interface, visible source code, the original Commit Zero logo, strong contrast, and black/white themes. They repeatedly rejected decorative UI, generic AI styling, unusual typography, and abrupt movement or navigation resets ("teleports"). The current UI is English; communicate with the user in Russian and write technical documentation in English. Use the project-scoped Impeccable, Design Taste Frontend, and Animate skills when applicable. Preserve the restrained application style; a skill does not authorize a marketing-page redesign or extra animation. Subagents and external AI CLIs require the user's request.

## Delivered implementation

- All active pages and preview controls now use React. Historical static designs remain source-only and are not shipped. The old string-rendering runtime and morphdom were removed.
- English navigation covers overview, repositories/source/issues, pull requests/diffs/checks, agent profiles/memory, search, environment, history, leaderboard, and observer accounts.
- The separate leaderboard has overall/code/collaboration categories, filtering, sorting, tied ranks, and an explicit scoring explanation. Scores derive from saved scenario contributions; they are not Arena ratings or Elo.
- Registration, login, logout, profile editing, and saved repositories use real local persistence. Observer accounts are distinct from simulated agent identities.
- Four independent Node processes run the gateway, workspace, identity, and ranking services. Workspace and identity own separate PostgreSQL-compatible PGlite stores. Optional external PostgreSQL configuration is documented.
- A revision cache and conditional upserts reduce repeated storage work; the ranking service consumes a lean contribution read model.
- Stable React identity, guarded route effects, saved route scroll, and Fast Refresh-compatible module boundaries preserve reading state during updates. No decorative workspace animation was added. Playable canvas previews remain available.

## Verified evidence and limits

At implementation commit `0272594`, `npm run check` passed ESLint, ten Node tests, the production build, one compiled React DOM integration test, and production-serving smoke checks. The Node suite includes actual independent service processes communicating over loopback HTTP. npm audit reported zero vulnerabilities at verification time.

Actual in-app browser checks covered both themes, mobile layout, focused text contrast, signup/profile/session/bookmark flows, the complete ten-step scenario, game dialogs and keyboard return focus, and refresh stability. A development-only probe confirmed normal Fast Refresh and retained reading state on component edits. QA accounts and scenario writes used disposable in-memory services with a separate hostname; the normal saved run was preserved.

Measured on the seeded test case: 13 queries for a cold workspace read versus one for a warm revision-cache read; contribution payload 565 bytes versus 6855 bytes for full state. These are scoped observations, not throughput benchmarks.

Playwright flows are prepared but were not run locally because the matching Chromium executable was unavailable. No physical-device, hosted CI, production deployment, or real-model execution acceptance is claimed. See VERIFICATION.md and UI-AUDIT.md for details.

Current agents still follow a deterministic simulation. Real model APIs, Git hosting, arbitrary-code execution workers, and a qualified isolation environment are not connected. The four local services are a development architecture, not a distributed production deployment. Connecting real agents requires a separately scoped task and actual provider/execution verification.

## Preserve when continuing

- Normal stores: `runtime/database` and `runtime/identity`. Preserve existing `.env`, accounts, saved runs, and applied SQL migrations. Actual `.env` is not automatically loaded.
- Preserved workspace run: `a78810d3-5f5c-40ae-97d6-7bfa56e650ac`, step 0, revision 0 at verification. Revalidate rather than assuming it has not changed since handoff.
- Retained JSON export and SHA-256 receipt: `runtime/backups/2026-10-18T12-26-26-423Z.json`. This is a scenario export, not a full database backup or automatic restore path.
- Compiled gateway uses 4173; development gateway uses 4174. Domain service ports are 4185–4187. Port 4175 was occupied by another project's service; leave unrelated processes alone. Stop this project's server gracefully before switching between compiled and development modes.
- Temporary QA and HMR servers were stopped. Docker/WSL were not started. Runtime data, screenshots, caches, and backups stay outside Git.
- Latest disk observation: about 130 GB free on X:, 350 MB project cache, 40.6 MB workspace DB, 40.0 MB identity DB. `npm run diagnostics` applies the documented seven-day/50 MB boundary only to eligible disposable diagnostics; it is not a background cleanup daemon.
- Final screenshots: `runtime/diagnostics/qa-react-leaderboard-dark.png`, `qa-react-leaderboard-light.png`, and `qa-react-login-mobile.png`. These are disposable evidence and may expire under retention.

After implementation changes, run the required `npm run check` and relevant browser checks. Documentation-only handoff changes require content/diff verification, not another full application test run.
