# AGENTS.md

Static single-page site for GitHub Pages (repo `daskas-welt.github.io`). No build step, framework, backend, tests, or JavaScript — the only `<script>` is JSON-LD. Content lives in `index.html` + `style.css`; `feed.xml` and `sitemap.xml` are hand-maintained, and the only code is `scripts/make-thumbs.py`.

## Writing
- Readers are mostly friends on a phone. Write for someone curious about the place, not for a search engine.
- Keep paragraphs to 2–4 sentences; the narrow card columns make long ones hard to read.
- Active voice, everyday words.

## Adding a post
1. Add a card at the **end** of `.card-columns` (newest last), with `id="slug"` — lowercase ASCII, unique.
2. Put the photo in `img/`, reference it, then run `python scripts/make-thumbs.py` (needs Pillow). It writes `img/thumbs/<stem>.jpg` at 720px, caps JPEG originals over 2000px, and rewrites `src`, `loading`, `width`, and `height`. Never hand-write those.
3. Add the matching `<item>` to `feed.xml`, newest first, and bump `<lastBuildDate>`. Trim to 20 items.
4. Bump `<lastmod>` in `sitemap.xml`.
5. Commit `index.html`, `feed.xml`, `sitemap.xml`, the original photo, and `img/thumbs/` together. Pushing to `main` deploys immediately; there is no CI.

## Editing `index.html`
- Bootstrap **4.6.2** CSS only, not 5. Without its JS bundle, `data-*` widgets stay inert.
- `#news` uses `.card-columns`; cards must be **direct children** of it. Wrapping them in `row`/`col-*` broke rendering twice.
- Cards vary: image, subtitle, paragraphs, and links are optional, in any order. Copy the nearest existing card.
- Image markup is `<a href="img/x.jpg"><img class="card-img-top" src="img/thumbs/x.jpg" alt="..."></a>`: `href` opens the original, `src` is the thumbnail. Hotlinked images are skipped by the script.
- `#gallery` is a commented-out carousel with broken ids — dead code, leave it.
- Endings are mixed CRLF/LF. Don't normalize them; a stray lone `\r` makes git treat the file as binary and yields a full-file diff.

## Feed and ids
- A slug must match in three places: the card's `id`, `<link>https://daskas-welt.github.io/#slug</link>`, and `<guid>.../post/slug</guid>`. Renaming the `id` without updating the feed breaks the link.
- `feed.xml` is hand-edited: copy a neighbouring `<item>` instead of writing XML from scratch. Only newer items carry `<pubDate>`; card `data-date` attributes are leftovers with no effect.
- `docs/superpowers/` holds old plans and specs, some for features that no longer exist (the email notifier). Trust the code.

## Conventions
- Keep `og:*`, the canonical link, and the JSON-LD Person block in sync.
- Prettier-style markup: 2-space indent, one attribute per line in wrapped tags. There is no Prettier config.
- `https://` for external links; only XML namespaces use `http://`.
- Every image needs `alt` text.
- Verify by serving the directory (`python -m http.server`) and viewing it.
