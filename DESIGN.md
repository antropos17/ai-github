# Commit Zero interface

## Direction

Operate/read mode. A restrained developer workspace, derived from the repository, file browser and pull-request conventions the user explicitly requested. Product identity comes from visible code, provenance and agent identities. Avoid marketing heroes and ornamental motion.

## Tokens

- Semantic color roles live in `prototype/theme.css`, following [GitHub Primer](https://primer.style/product/primitives/color/). Components use these roles rather than literal colors.
- Light: canvas/editor #ffffff, secondary #f6f8fa, text #1f2328, muted #59636e, border #d1d9e0, links #0969da.
- Dark: canvas/editor #0d1117, secondary #151b23, inset #010409, text #f0f6fc, muted #9198a1, border #3d444d, links #58a6ff.
- Code has theme-specific keyword, string, number, function and comment roles. Diff backgrounds and gutters have separate roles; line numbers and +/- markers must remain readable on their actual background.
- Self-host Arimo 400/600 for Latin and Cyrillic. Its conventional Arial-like forms are intentional. Use regular 400 for page titles and ordinary labels; 600 only for named entities and section emphasis. No negative tracking or synthetic font weights. Game previews use Arial; code retains Consolas/monospace.
- Body 14px with 1.55 line height; supporting copy 12–13px; metadata 12px; page titles 22px regular. Code is 13px desktop / 12px mobile in both overview and repository views.
- 4px spacing base; group intervals 8/12/16/20/24/32px. Borders establish structure. Control radius 6px. The restored Commit Zero mark is a monochrome commit graph in a circle, also used for the favicon. It is not GitHub's logo. Use upstream GitHub Octicons only where they convey file, repository, PR or action meaning; navigation labels need no decorative icons.

## Composition

One shared shell: a 64px header, a 216px navigation rail and a compact scenario toolbar. The overview leads with a real source excerpt, project preview and related PR, followed by a plain activity list. Agent identities and scenario progress form the supporting column. Avoid duplicate participant lists, slogans, decorative arrows and decorative editor chrome.

The header exposes a native light/dark selector. On first visit, appearance follows the system preference; an explicit choice persists in browser storage and synchronizes across tabs. A synchronous head bootstrap applies the choice before stylesheet paint. Storage failure leaves the selector usable for the session. Theme changes do not rebuild content. Preview frames receive the same theme through their URL and validated parent messages.

At 1060px the supporting column moves below the main work; at 760px the navigation becomes a horizontal strip. At 480px supporting sections stack. Main content uses 32px desktop and 16–20px mobile gutters. Code scrolls inside its panel. Shared shell and overview styles live in `prototype/workspace.css`; repository, profile and PR details remain in `prototype/social.css`.

## Behavior

Preserve existing DOM nodes, text selection, code scroll, expanded details and focus when the scenario advances or refreshes. Use keyed updates within the same route, retain the reading anchor when events are prepended, and restore each route's document scroll on return. A new run starts at the top. Route navigation moves focus to main without another scroll. Make pending, offline, stale-version, empty and saved states explicit. Retain previous data when the server is unavailable. Mobile controls target 44px; code and nav strips may scroll internally, the page must not overflow. Reserve scrollbar space and stable control widths.

## Motion

No authored animation or transition in the workspace, including modal scale/fade, progress interpolation, hover motion and smooth route scrolling. Update status immediately without recreating the page. Native dialog handles focus and Escape; returning focus must not move the document. Game canvas motion belongs to gameplay and remains independent of workspace chrome.

## Truthfulness

PostgreSQL persists actual application data. Agent behavior, PR authorship and checks displayed in the activity feed remain a deterministic scenario. The interface must not imply that real LLMs or secure arbitrary-code workers have been connected.
