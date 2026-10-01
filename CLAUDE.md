# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Static site for Concordis Legal Group (clg.legal), a Ukrainian law firm. This is a migration from WordPress to Hugo. All content and UI copy is Ukrainian. A blog and a headless CMS (Decap CMS + Netlify, per README status list) are planned but not yet implemented — `disableKinds = ["taxonomy", "term"]` in `hugo.toml` and the empty `themes/`/`i18n`/`data` dirs reflect the current pre-blog, pre-CMS, no-theme state. Expect to touch these dirs as that work lands.

`files-for-cursor/*.html` are raw exports of the old WordPress pages, kept as source-of-truth reference for copy/content when building or checking new Hugo pages — not part of the build.

## Git

Never create git commits (or push, amend, or otherwise record changes in git) on your own. Only the user commits. Leave changes in the working tree and let the user review and commit them.

## Commands

Requires **Hugo Extended** (verify with `hugo version` — must say `extended`; CI pins `0.148.2`).

```bash
hugo server -D --disableFastRender --ignoreCache
```
Use this exact form, not plain `hugo server -D`: SCSS is compiled through Hugo Pipes and cached in `resources/`, and partial-only changes (e.g. `components/_hero.scss`) sometimes don't trigger a rebuild without these flags.

If changes still don't show up:
```bash
rm -rf public resources
hugo server -D --disableFastRender --ignoreCache
```
Then hard-refresh the browser (Ctrl+Shift+R).

Production build:
```bash
hugo --minify
```
CI (`.github/workflows/hugo-pages.yml`) builds with `hugo --gc --minify --baseURL "<pages-url>/"` and deploys `public/` to GitHub Pages on push to `main`.

There is no JS/CSS package manager, linter, or test suite in this repo (no `package.json`) — Hugo Pipes (`css.Sass`, `js.Build`) does all asset processing directly from `assets/`.

## Architecture

### Page → layout → partials

Every content page's front matter sets `layout:` (or relies on the default) plus a data namespace matching each section partial (`hero`, `about`, `practices`, `serviceHero`, `serviceIntro`, `casesCta`, `team`, `faq`, ...). Partials read data via `.Params.<namespace>`, so a partial and its front-matter block must be edited together.

- `layouts/_default/baseof.html` — HTML skeleton: `head`, header, `{{ block "main" }}`, footer, scripts.
- `layouts/index.html` — home page `main` block: hero, about, practices, partnership, cases-cta, client-care, team, faq.
- `layouts/_default/service.html` — used by all practice-area pages (`layout: service` in front matter): service-hero, service-intro, cases-cta, team, faq.
- `layouts/partials/*.html` — one partial per section, each self-contained and reading its own `.Params` namespace.

### Content structure

- `content/_index.md` — home page, has front matter blocks for every home-page section (see keys above).
- `content/<slug>/_index.md` — one per practice area (e.g. `dohovirne-pravo`, `crime-pravo`, `corp-pravo-ma`), each sets `layout: service` and its own `serviceHero`/`serviceIntro`/`casesCta`/`team`/`faq` blocks. Team and FAQ content is currently duplicated verbatim across pages rather than pulled from `data/` — that's expected until data-driven content lands.
- Every page has a `seo:` block (`title`, `description`, `ogImage`, `robots`) consumed by `layouts/partials/head.html`; falls back to `.Title`/`.Description`/`site.Params.description` if omitted.
- `styles:` / `scripts:` front-matter lists (e.g. `pages/service`) select which per-page SCSS/JS bundle to load, in addition to the always-loaded `site.scss`/`site.js`.
- `bodyClass:` sets the `<body class>`, used for page-scoped SCSS overrides (see `service.scss`'s `.page-<slug>` blocks).

### Assets: component-per-file, page bundles import components

```
assets/scss/base/        variables, reset, typography, utilities — imported once by site.scss
assets/scss/components/  one _<name>.scss per UI section (header, hero, faq, ...)
assets/scss/pages/       home.scss / service.scss — import only the components that page uses
assets/js/components/    one <name>.js per UI section, each exporting an init<Name>() function
assets/js/pages/         home.js / service.js — call the init functions their page needs
assets/js/site.js        always-loaded bundle (currently just header init)
```
`layouts/partials/styles.html` and `scripts.html` compile `scss/site.scss`/`js/site.js` plus whatever the page's `styles`/`scripts` front matter names, via `resources.Get` → `css.Sass`/`js.Build` → `minify` → (production only) `fingerprint` with SRI. A missing SCSS/JS path warns (`warnf`) instead of failing the build — check server output if a page's assets silently don't load.

`$imagesBase` (derived from `site.BaseURL`'s path) is injected as a Sass variable at build time by prepending it to the SCSS content string before compiling — see `styles.html`; don't hardcode `/images` paths in new SCSS that need to respect a subpath baseURL.

Breakpoints are mobile-first via the `respond-up($breakpoint)` mixin (`base/_variables.scss`): `$breakpoint-md: 767px`, `$breakpoint-lg: 1024px`, `$breakpoint-xl: 1440px`.

### Adding a new practice-area page

1. Create `content/<slug>/_index.md` with `layout: service`, a `seo` block, and `serviceHero`/`serviceIntro`/`casesCta`/`team`/`faq` front matter (copy an existing practice page as a template — e.g. `content/dohovirne-pravo/_index.md`).
2. Add `bodyClass: "page-service page-<slug>"` and add `.page-<slug>` to the relevant selector lists in `assets/scss/pages/service.scss` if page-specific overrides are needed.
3. Reference source copy in `files-for-cursor/<slug>.html` if migrating an existing WordPress page.
