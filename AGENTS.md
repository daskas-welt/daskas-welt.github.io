# AGENTS.md

Static single-page personal site (GitHub Pages, repo `daskas-welt.github.io`). No build step, no framework, no backend, no JavaScript. Content lives in `index.html` + `style.css`; `feed.xml` and `sitemap.xml` are edited by hand, and the only script is `scripts/make-thumbs.py`.

## Writing
- The audience is primarily friends and the outside world, most of them reading on a phone. Write for someone curious about the place, not for a search engine.
- Keep paragraphs to 2–4 sentences. The narrow card columns make long paragraphs hard to read.
- Use active voice and everyday language; when a plain word and a fancy one both fit, use the plain one.
- A post is not finished until the thumbnails are regenerated (`python scripts/make-thumbs.py`) and `index.html`, `feed.xml`, and `img/thumbs/` are committed together.

## Commands
- Thumbnails: `python scripts/make-thumbs.py` (needs Pillow). Writes `img/thumbs/<name>.jpg` at 720px, caps JPEG originals over 2000px, and rewrites each card's `src` plus `loading`/`width`/`height`. Run it after adding a photo.
- Verify the page by serving the directory (`python3 -m http.server`) and viewing it. No lint, typecheck, formatter, or test config.
- Deploy: push to `main`. GitHub Pages publishes on its own; there is no CI, so run the thumbnail script before pushing.

## Editing `index.html`
- Bootstrap **4.6.2** CSS only via jsDelivr, not 5. The page runs no JavaScript, so there is no Bootstrap bundle and `data-*` widgets stay inert. All custom CSS is in `style.css`.
- Fonts: Google Fonts loads `Roboto|Roboto Mono`; `style.css` uses `"Roboto Mono", monospace` globally. Keep both faces in the URL (a missing face caused a bug once).
- `#news` (heading "Booze that matters!") uses Bootstrap 4 `.card-columns` (CSS multi-column). Cards must be **direct children** of `<div class="card-columns">`; wrapping them in `row`/`col-*` broke rendering twice. The outer `row > col-sm-12` wrapper is fine.
- New posts go at the **end** (newest last), while `feed.xml` lists them newest first.
- Cards are heterogeneous: image, subtitle, paragraphs, and links are optional and appear in varying order. Copy the nearest existing card instead of a fixed template.
- Image pattern: `<a href="img/x.jpg"><img class="card-img-top" src="img/thumbs/x.jpg" alt="..."></a>`. The `href` is the full-size original, the `src` is its 720px thumbnail. Some cards hotlink Amazon/publisher URLs instead; both are fine.
- Don't hand-write thumbnails or `loading`/`width`/`height`: drop the photo in `img/` and run `python scripts/make-thumbs.py`, which writes the thumbnail and rewrites the card for you.
- Preserve image filenames exactly (Greek titles, `DSCF*.JPG`, `PXL_*`, spaces). JPEG originals are capped at 2000px on the longest edge; thumbnails are 720px wide, ~40–90 KB.
- `#gallery` is a commented-out carousel with broken ids — dead code, leave it alone.
- `index.html` has mixed CRLF/LF endings. Don't normalize the file.

## Feed and ids
- `feed.xml` is written by hand. Each `<item>` is one post, newest first; keep the last 20.
- A post's slug has to match in three places: `<div class="card" id="slug">` in `index.html`, `<link>https://daskas-welt.github.io/#slug</link>`, and `<guid>https://daskas-welt.github.io/post/slug</guid>`. Renaming the `id` without updating the feed breaks the link.
- Add `<pubDate>` to the item (`Tue, 17 Nov 2026 00:00:00 GMT`). Copy the nearest item instead of typing the XML from scratch.

## Conventions
- Keep SEO/social meta (`og:*`, canonical, JSON-LD Person) in sync, and bump `sitemap.xml` `<lastmod>` to today's date when adding a post.
- Formatting is Prettier defaults (2-space indent, ~80-col wrapping, one attribute per line in wrapped tags). There is no Prettier config; match the surrounding markup.
- Prefer `https://` for external links; only SVG `xmlns` and the RSS/sitemap namespaces legitimately use `http://`.
- Provide `alt` text on images.
