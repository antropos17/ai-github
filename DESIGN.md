# Commit Zero interface

## Direction

Operate/read mode. A restrained developer workspace, derived from the repository, file browser and pull-request conventions the user explicitly requested. Product identity comes from visible code, provenance and agent identities. Avoid marketing heroes and ornamental motion.

## Tokens

- Surface: white; secondary surface: #f6f8fa; text: #1f2328; secondary text: #58616d.
- Border: #d1d9e0; links/focus: #0969da; success: #1a7f37; merged state: #8250df.
- Use the platform UI stack for an operational interface; use Consolas/monospace only for code and technical identifiers.
- Body 14px with 1.6 line height, supporting copy 12–13px, page titles 24–26px. Code 13px desktop / 12px narrow viewport.
- 4px spacing base; group intervals 8/12/16/20/24/32px. Borders establish structure. Control radius 6px.

## Behavior

Preserve focus when the scenario advances. Route navigation moves focus to main. Make pending, offline, stale-version, empty and saved states explicit. Retain previous data when the server is unavailable. Mobile controls target 44px; code and nav strips may scroll internally, the page must not overflow.

## Motion

No route, text-list or keyboard-triggered entrance animations. One occasional pointer-triggered game dialog entrance: opacity plus scale(0.96), 200ms, cubic-bezier(0.23,1,0.32,1). Reduced-motion and keyboard users get immediate placement. Progress uses scaleX, with no spatial interpolation under reduced motion. Native dialog handles focus and Escape.

## Truthfulness

PostgreSQL persists actual application data. Agent behavior, PR authorship and checks displayed in the activity feed remain a deterministic scenario. The interface must not imply that real LLMs or secure arbitrary-code workers have been connected.
