# Commit Zero interface

## Direction

Operate/read mode. A restrained developer workspace, derived from the repository, file browser and pull-request conventions the user explicitly requested. Product identity comes from visible code, provenance and agent identities. Avoid marketing heroes and ornamental motion.

## Tokens

- Semantic color roles live in `prototype/theme.css`, following [GitHub Primer](https://primer.style/product/primitives/color/). Components use these roles rather than literal colors.
- Light: canvas/editor #ffffff, secondary #f6f8fa, text #1f2328, muted #59636e, border #d1d9e0, links #0969da.
- Dark: canvas/editor #0d1117, secondary #151b23, inset #010409, text #f0f6fc, muted #9198a1, border #3d444d, links #58a6ff.
- Code has theme-specific keyword, string, number, function and comment roles. Diff backgrounds and gutters have separate roles; line numbers and +/- markers must remain readable on their actual background.
- Self-host Mona Sans for Latin and Noto Sans for Cyrillic, using their normal variable-weight subsets. Mona follows the live GitHub reference; Noto supplies the Cyrillic coverage Mona lacks. Use 400 for ordinary text and change titles, 500 for controls, 600 for navigation emphasis, named entities and headings. No negative tracking or synthetic weights. Game previews use Arial; code uses the native UI monospace stack.
- One role scale lives in `prototype/typography.css`: dense UI/body 14px with 21–22px leading, prose and profile biography 16px, genuine metadata 12px, section headings 16px, page titles 24px. Code is 14px desktop / 13px mobile with 24px leading. Use relative rem sizes so browser text scaling remains available. Font subsets are preloaded and served locally; no external font service.
- 4px spacing base; group intervals 8/12/16/20/24/32px. Borders establish structure. Control radius 6px. The restored Commit Zero mark is a monochrome commit graph in a circle, also used for the favicon. It is not GitHub's logo. Use upstream GitHub Octicons only where they convey file, repository, PR or action meaning; navigation labels need no decorative icons.

## Composition

One shared shell: a 64px header, a 216px navigation rail and a compact scenario toolbar. The overview leads with a real source excerpt, project preview and related PR, followed by a plain activity list. Agent identities and scenario progress form the supporting column. Avoid duplicate participant lists, slogans, decorative arrows and decorative editor chrome.

The header exposes a native light/dark selector. On first visit, appearance follows the system preference; an explicit choice persists in browser storage and synchronizes across tabs. A synchronous head bootstrap applies the choice before stylesheet paint. Storage failure leaves the selector usable for the session. Theme changes do not rebuild content. Preview frames receive the same theme through their URL and validated parent messages.

At 1060px the supporting column moves below the main work; at 760px navigation becomes a native section selector with an explicit Go action. At 480px supporting sections stack. Main content uses 32px desktop and 16–20px mobile gutters. Code scrolls inside its panel. Shared shell and overview styles live in `prototype/workspace.css`; repository, profile and PR details remain in `prototype/social.css`. Typography and simple directory-row composition live in `prototype/typography.css`. Repository and agent catalogs use divided rows instead of equal card grids. Sidebar repository paths stay on one line with ellipsis; full destinations remain available in the catalogs. Narrow workbench headers put the description below the project name and launch action.

## Behavior

Preserve existing DOM nodes, text selection, code scroll, expanded details and focus when the scenario advances or refreshes. Use keyed updates within the same route, retain the reading anchor when events are prepended, and restore each route's document scroll on return. A new run starts at the top. Route navigation moves focus to main without another scroll. Make pending, offline, stale-version, empty and saved states explicit. Retain previous data when the server is unavailable. Mobile controls target 44px; code and page-tab strips may scroll internally, the page must not overflow. Reserve scrollbar space and stable control widths. Mobile section selection changes the route only after submitting the navigation form; background refresh preserves an unsubmitted choice. The skip link moves focus without replacing the current route. Code panels are named regions, selected files expose aria-current, and diff rows include screen-reader labels for additions and deletions.

## Motion

No authored animation or transition in the workspace, including modal scale/fade, progress interpolation, hover motion and smooth route scrolling. Update status immediately without recreating the page. Native dialog handles focus and Escape; returning focus must not move the document. Game canvas motion belongs to gameplay and remains independent of workspace chrome.

## Truthfulness

PostgreSQL persists actual application data. Agent behavior, PR authorship and checks displayed in the activity feed remain a deterministic scenario. The interface must not imply that real LLMs or secure arbitrary-code workers have been connected.
