# AGENTS.md

Static single-page personal site (GitHub Pages, repo `daskas-welt.github.io`). No build step, no framework, no backend. Content lives in `index.html` + `style.css`; the only code is the Node ESM scripts in `scripts/` (no dependencies except `nodemailer`).

## Writing
- The audience is primarily friends and the outside world, most of them reading on a phone. Write for someone curious about the place, not for a search engine.
- Keep paragraphs to 2–4 sentences. The narrow card columns make long paragraphs hard to read.
- Use active voice and everyday language; when a plain word and a fancy one both fit, use the plain one.
- A post is not finished until the thumbnails and feed are regenerated (`python scripts/make-thumbs.py`, then `node scripts/generate-feed.mjs`) and `index.html`, `feed.xml`, and `img/thumbs/` are committed together.

## Commands
- Test: `npm test` (`node --test scripts/lib/`). Single file: `node --test scripts/lib/cards.test.mjs`.
- Feed: `node scripts/generate-feed.mjs` — rewrites `feed.xml` and stamps missing card ids in `index.html`. Run it after adding/reordering cards and commit both files; CI fails if it leaves `index.html` modified.
- Thumbnails: `python scripts/make-thumbs.py` (needs Pillow). Writes `img/thumbs/<name>.jpg` at 720px, caps JPEG originals over 2000px, and rewrites each card's `src` plus `loading`/`width`/`height`. Run it after adding a photo, before the feed step.
- Email preview: `node scripts/notify.mjs --dry-run` (no install or GitHub creds; without creds it reports "no state yet"). `--seed` records the current ids without sending. Real sends need `npm ci` + Actions secrets and only happen in CI.
- Verify the page by serving the directory (`python3 -m http.server`) and viewing it. No lint, typecheck, or formatter config.
- Deploy: push to `main`. Pages publishes on its own; `.github/workflows/email-new-posts.yml` runs `npm test`, regenerates the feed, then emails new cards.

## Editing `index.html`
- Bootstrap **4.6.2** via jsDelivr (CSS + `bootstrap.bundle.min.js`), not 5. All custom CSS is in `style.css`.
- Fonts: Google Fonts loads `Roboto|Roboto Mono`; `style.css` uses `"Roboto Mono", monospace` globally. Keep both faces in the URL (a missing face caused a bug once).
- `#news` (heading "Booze that matters!") uses Bootstrap 4 `.card-columns` (CSS multi-column). Cards must be **direct children** of `<div class="card-columns">`; wrapping them in `row`/`col-*` broke rendering twice. The outer `row > col-sm-12` wrapper is fine.
- The scripts locate a card with `/<div class="card"(?=[\s>])/`, so `class="card"` must be the exact and first attribute. `class="card mt-3"` or `id` before `class` silently drops the card from the feed and email. Same for the title: keep `<h5 class="card-title">` exact, since the title becomes the feed slug.
- New posts go at the **end** (newest last). `generate-feed.mjs` takes the last 20 cards and lists them newest first.
- Cards are heterogeneous: image, subtitle, paragraphs, and links are optional and appear in varying order. Copy the nearest existing card instead of a fixed template.
- Image pattern: `<a href="img/x.jpg"><img class="card-img-top" src="img/thumbs/x.jpg" alt="..."></a>`. The `href` is the full-size original, the `src` is its 720px thumbnail. Some cards hotlink Amazon/publisher URLs instead; both are fine.
- Don't hand-write thumbnails or `loading`/`width`/`height`: drop the photo in `img/` and run `python scripts/make-thumbs.py`, which writes the thumbnail and rewrites the card for you.
- Preserve image filenames exactly (Greek titles, `DSCF*.JPG`, `PXL_*`, spaces). JPEG originals are capped at 2000px on the longest edge; thumbnails are 720px wide, ~40–90 KB.
- `#gallery` is a commented-out carousel with broken ids — dead code, leave it alone.
- `index.html` has mixed CRLF/LF endings. Don't normalize the file.

## Feed, ids, and email
- `feed.xml` is generated — never hand-edit. A card's `id` is its title slug (Greek transliterated), stamped once; the script never changes an existing id. **Renaming a title after it is stamped breaks the link**: the feed uses the new slug while the card keeps the old id. Keep titles stable after publishing, or update the id by hand.
- CI regenerates `feed.xml` but never commits it, and only checks `index.html` for unstamped ids. A stale `feed.xml` therefore goes live unnoticed — commit the regenerated file yourself.
- Add `data-date="YYYY-MM-DD"` to a card for a `<pubDate>`.
- `notified.json` on the `automation` branch holds completed card ids plus per-recipient send attempts. Each new card is emailed to each friend once; attempts are recorded *before* sending, so failures are never retried automatically. If the state file is missing, the current page is adopted and nothing is sent.
- `data-notify="false"` on the card div publishes it without email, and quiet cards are recorded as handled on every run. To send it later, remove the attribute *and* delete its id from `notified.json`.
- Recipient ids are hashed with `GMAIL_APP_PASSWORD`, so rotating the password while attempts are pending makes `loadState` throw.
- Secrets (`GMAIL_USER`, `GMAIL_APP_PASSWORD`, `FRIENDS_EMAILS`) live in repo Actions settings, never in the tree.

## Conventions
- Keep SEO/social meta (`og:*`, canonical, JSON-LD Person) in sync, and bump `sitemap.xml` `<lastmod>` to today's date when adding a post.
- Formatting is Prettier defaults (2-space indent, ~80-col wrapping, one attribute per line in wrapped tags). There is no Prettier config; match the surrounding markup.
- Prefer `https://` for external links; only SVG `xmlns` and the RSS/sitemap namespaces legitimately use `http://`.
- Provide `alt` text on images.
