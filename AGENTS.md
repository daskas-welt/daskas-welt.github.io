# AGENTS.md

Static single-page personal site (GitHub Pages, repo `daskas-welt.github.io`). Everything lives in `index.html` (+ `style.css`). No build step, no JS framework, no backend. The only code is the Node scripts in `scripts/`.

## Toolchain
- Verification of the page is manual: serve the directory (e.g. `python3 -m http.server`) and check the rendered page. The scripts have tests: `npm test` runs `node --test` over `scripts/lib/` (no framework), and CI runs it before notifying. `node scripts/notify.mjs --dry-run` needs no install; an actual send needs `npm ci` (CI does this). No lint or typecheck.
- Formatting is Prettier-style (2-space indent, ~80-col wrapping, e.g. `</a>` on its own line after wrapped link text). There is no Prettier config or dependency; either run Prettier defaults or match surrounding formatting exactly.
- Deploy: push to `main`; GitHub Pages publishes automatically, and the email workflow runs on every push to `main`, sending only when a card is new.

## Critical facts (verify before editing)
- **Bootstrap 4.6.2** via jsDelivr CDN (CSS + `bootstrap.bundle.min.js`), NOT 5. `CLAUDE.md` wrongly says Bootstrap 5 — trust `index.html`.
- Fonts: page loads `Roboto|Roboto Mono`; `style.css` sets `"Roboto Mono", monospace` globally. Keep both faces loaded (this mismatch caused a bug once).
- `#news` (visible heading "Booze that matters!") uses Bootstrap 4 `.card-columns` (CSS multi-column). Cards are **direct children** of `.card-columns` — do **not** wrap them in `row > col-*` grids. Nested/wrapped cards broke rendering twice before.
- New posts go at the **end** of `.card-columns` (newest card last).
- Cards are heterogeneous: `<img>`, subtitle, text, and link blocks are all optional and appear in varying order. Copy the nearest existing card's markup, not a fixed template.
- Card images may be local (`img/filename.jpg`) or hotlinked from external CDNs (e.g. Amazon media, publisher sites) — both patterns exist.
- Image filenames in `img/` include Greek titles, camera names (`DSCF*.JPG`, `PXL_*.jpg`), and spaces — preserve exact names and paths.
- `feed.xml` is **generated** from the last 20 cards by `node scripts/generate-feed.mjs` (zero dependencies). Never hand-edit it. The script also stamps `id` attributes on those cards so feed links jump to the right card. Adding a card means re-running it; add `data-date="YYYY-MM-DD"` to the card if you want a `<pubDate>`.
- `notified.json` on the `automation` branch lists the card ids already emailed. The `email-new-posts` workflow (`.github/workflows/email-new-posts.yml`) runs on every push to `main` and emails **one message per new card**; card ids come from `generate-feed.mjs`, so run it before pushing a post (CI fails the run if `index.html` still has unstamped cards). If `notified.json` does not exist yet, the run records the current page ids and sends nothing, so deploying never mails the back catalogue. Add `data-notify="false"` to a card's outer `<div>` to publish it without email — that is permanent once recorded, so delete the id from `notified.json` to send it later. Email bodies come from `scripts/notify.mjs` and `scripts/lib/messages.mjs`.
- The `#gallery` carousel section in `index.html` is commented out (with mismatched/broken ids) — dead code, not live content.

## Content conventions
- Keep SEO/social meta (`og:*`, canonical, JSON-LD Person) and `sitemap.xml` `<lastmod>` in sync on significant changes (bump `<lastmod>` to today's date when adding a post).
- Prefer `https://` for external links; only SVG `xmlns` legitimately uses `http://`.
- Provide image `alt` text. Secrets (`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `FRIENDS_EMAILS`) live in the repo's Actions settings, never in the tree.
