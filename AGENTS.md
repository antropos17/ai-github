# Commit Zero development

Read README.md for startup and scope. Read docs/ARCHITECTURE.md before changing storage or scenario transitions; read DESIGN.md before changing the interface.

When resuming in a new chat, read docs/CONTEXT.md for the latest handoff, verified state, user preferences, and remaining boundaries. Recheck runtime and Git state before acting.

- The current product is a persisted simulation. Keep simulated agent authorship distinct from real model execution.
- All scenario writes go through the API and a transaction. Preserve run history and enforce the expected run ID and revision.
- Add migrations rather than editing applied SQL. Keep database secrets and runtime data out of Git.
- Run `npm run check` after implementation changes. Record any unavailable browser verification separately from DOM tests.
- Keep temporary output inside this workspace. `npm run diagnostics` measures storage and enforces the documented diagnostic retention boundary; databases, backups and verification receipts are preserved.
- Retain the familiar repository/file/PR structure. Use DESIGN.md for type, spacing and motion constraints.

The requested design skills are vendored in `.agents/skills/`. Their README records source provenance and applicability. Treat their upstream files as versioned references.
