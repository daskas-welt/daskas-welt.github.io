# AGENTS.md

Static single-page personal site (GitHub Pages, repo `daskas-welt.github.io`). Everything lives in `index.html` (+ `style.css`). No build step, no JS framework, no backend, no automated tests.

## Toolchain
- No tests, lint, or typecheck — verification is manual: serve the directory (e.g. `python3 -m http.server`) and check the rendered page.
- Formatting is Prettier-style (2-space indent, ~80-col wrapping, e.g. `</a>` on its own line after wrapped link text). There is no Prettier config or dependency; either run Prettier defaults or match surrounding formatting exactly.
- Deploy: push to `main`; GitHub Pages publishes automatically. No CI/build.

## Critical facts (verify before editing)
- **Bootstrap 4.6.2** via jsDelivr CDN (CSS + `bootstrap.bundle.min.js`), NOT 5. `CLAUDE.md` wrongly says Bootstrap 5 — trust `index.html`.
- Fonts: page loads `Roboto|Roboto Mono`; `style.css` sets `"Roboto Mono", monospace` globally. Keep both faces loaded (this mismatch caused a bug once).
- `#news` (visible heading "Booze that matters!") uses Bootstrap 4 `.card-columns` (CSS multi-column). Cards are **direct children** of `.card-columns` — do **not** wrap them in `row > col-*` grids. Nested/wrapped cards broke rendering twice before.
- New posts go at the **end** of `.card-columns` (newest card last).
- Cards are heterogeneous: `<img>`, subtitle, text, and link blocks are all optional and appear in varying order. Copy the nearest existing card's markup, not a fixed template.
- Card images may be local (`img/filename.jpg`) or hotlinked from external CDNs (e.g. Amazon media, publisher sites) — both patterns exist.
- Image filenames in `img/` include Greek titles, camera names (`DSCF*.JPG`, `PXL_*.jpg`), and spaces — preserve exact names and paths.
- The `#gallery` carousel section in `index.html` is commented out (with mismatched/broken ids) — dead code, not live content.
- `.claude/skills/create-post/SKILL.md` is outdated (references Bootstrap 5 `row gx-3` wrappers and a fixed card template). Follow `index.html` markup, not the skill.

## Content conventions
- Keep SEO/social meta (`og:*`, canonical, JSON-LD Person) and `sitemap.xml` `<lastmod>` in sync on significant changes.
- Prefer `https://` for external links; only SVG `xmlns` legitimately uses `http://`.
- Provide image `alt` text. No secrets/env vars used.
