# AGENTS.md

Static single-page personal site (GitHub Pages, repo `daskas-welt.github.io`). No build step, no JS framework, no backend, no automated tests.

## Toolchain
- No formatter or build tooling. Code is edited by hand (4-space indentation).
- Deploy: push to the default branch; GitHub Pages publishes automatically. No CI/build.

## Critical facts (verify before editing)
- **Bootstrap 4.6.2** via CDN, NOT 5. `CLAUDE.md` wrongly says Bootstrap 5 — ignore it; trust `index.html` and this file.
- Fonts: page loads `Roboto`; `style.css` overrides `font-family` to `"Roboto Mono", monospace`. Not Inter / IBM Plex.
- `#news` uses Bootstrap 4 `.card-columns` (CSS `column-count`). Cards are **direct children** of `.card-columns` with Bootstrap card classes — do **not** wrap them in `row > col-*` grids.
- `.claude/skills/create-post/SKILL.md` is outdated (references Bootstrap 5 `row gx-3` wrappers). When adding cards, copy the existing `index.html` markup, not the skill.
- Image filenames in `img/` include Greek titles, camera names (`DSCF*.JPG`, `PXL_*.jpg`), and spaces — preserve exact names and paths. Local images referenced as `img/filename.jpg`.

## Content conventions
- Keep SEO/social meta, JSON-LD, and `sitemap.xml` `<lastmod>` in sync on significant changes.
- Prefer `https://` for external links; update legacy `http://` when editing nearby.
- Provide image `alt` text. No secrets/env vars used.
