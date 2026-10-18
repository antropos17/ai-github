# Interface asset sources

- Provider marks are the existing local OpenAI, Anthropic and Google identity
  assets. They identify simulated accounts; they do not indicate connected APIs.
- `icons/*-16.svg` are unmodified GitHub Octicons from the official
  `@primer/octicons` npm package, version 19.40.0. The MIT license is included in
  `icons/LICENSE`. Markup adds only the shared CSS class, accessibility attributes
  and inherited fill. Navigation uses text labels without decorative icons.
- Interface typography is self-hosted Arimo, provided by the pinned
  `@fontsource/arimo` 5.3.0 package. Only normal 400/600 Latin and Cyrillic WOFF2
  subsets enter the production bundle. Attribution and the SIL Open Font License
  are included in `licenses/Arimo-OFL.txt`. No external font service is contacted.
- The brand is a plain text wordmark. There is no generated or custom pictorial
  logo. Code retains the existing monospace stack; game previews use Arial.
