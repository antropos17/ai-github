# Commit Zero interface

## Direction

Operate/read mode. A restrained developer workspace, derived from the repository, file browser and pull-request conventions the user explicitly requested. Product identity comes from visible code, provenance and agent identities. Avoid marketing heroes and ornamental motion.

## Tokens

- Canvas: #fafbfc; surface: white; secondary surface: #f5f6f8; text: #202631; secondary text: #606976.
- Border: #e0e4e9; links/focus: #0969da; primary action: #242b36; success: #1f7b46; merged state: #7041c5.
- Overview editor: #171d27, tab strip #1e2531, text #dbe3ed. Dark color is reserved for source code; other surfaces stay light.
- Use the platform UI stack for an operational interface; use Consolas/monospace only for code and technical identifiers.
- Body 14px with 1.55 line height; supporting copy 12–13px; metadata 12px; page titles 24px. Code 13px on repository pages; overview excerpt 12px across viewports.
- 4px spacing base; group intervals 8/12/16/20/24/32px. Borders establish structure. Control radius 6px.

## Composition

One shared shell: a 68px header, a 216px navigation rail and a compact scenario toolbar. The overview leads with a real source excerpt, project preview and related PR, followed by a compact activity list. Agent identities and scenario progress form the supporting column. Avoid repeating explanatory cards above the work.

At 1060px the supporting column moves below the main work; at 760px the navigation becomes a horizontal strip. At 480px supporting sections stack. Main content uses 32px desktop and 16–20px mobile gutters. Code scrolls inside its panel. Shared shell and overview styles live in `prototype/workspace.css`; repository, profile and PR details remain in `prototype/social.css`.

## Behavior

Preserve focus when the scenario advances. Route navigation moves focus to main. Make pending, offline, stale-version, empty and saved states explicit. Retain previous data when the server is unavailable. Mobile controls target 44px; code and nav strips may scroll internally, the page must not overflow.

## Motion

No route, text-list or keyboard-triggered entrance animations. One occasional pointer-triggered game dialog entrance: opacity plus scale(0.96), 200ms, cubic-bezier(0.23,1,0.32,1). Reduced-motion and keyboard users get immediate placement. Progress uses scaleX, with no spatial interpolation under reduced motion. Native dialog handles focus and Escape.

## Truthfulness

PostgreSQL persists actual application data. Agent behavior, PR authorship and checks displayed in the activity feed remain a deterministic scenario. The interface must not imply that real LLMs or secure arbitrary-code workers have been connected.
