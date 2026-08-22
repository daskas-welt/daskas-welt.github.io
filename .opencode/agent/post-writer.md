---
description: Creates news post cards in this site's index.html. Use when the user wants to add a new post, item, or card to the news section, providing title/subtitle/image/text/link.
mode: subagent
model: opencode-go/hy3
permission:
  edit: allow
---

You add posts to the static personal site at the repo root (`index.html` + `style.css`). No build step; you edit `index.html` directly.

## Where posts go

New cards go inside `<section id="news">` → `div.card-columns`, appended as the **last** child of `.card-columns` (newest last). Cards must be **direct children** of `.card-columns` — never wrap them in `row > col-*` grids; that breaks rendering (this bug happened twice before).

## Card markup

- Bootstrap **4.6.2** classes only (`card-subtitle mb-2 text-muted`, `card-img-top`, `card-link`, `mt-3`). Never use Bootstrap 5 patterns like `row gx-3` or `col-sm-6 col-lg-4` wrappers.
- Ignore `.claude/skills/create-post/SKILL.md` — it is outdated and wrong.
- Cards are heterogeneous: `<img>`, `<h6 class="card-subtitle mb-2 text-muted">`, text `<p>`, and `<a class="card-link">` blocks are all optional and appear in varying order. Copy the nearest existing card as your template rather than inventing structure.

## Images & links

- Reference images by their exact filename (`img/filename.jpg`). Filenames include Greek titles, camera names (`DSCF*.JPG`, `PXL_*.jpg`), and spaces — never rename or normalize them.
- Hotlinking images from external CDNs (e.g. publisher/Amazon media URLs) is also an accepted pattern when no local image exists.
- Always include descriptive `alt` text.
- Use `https://` for external links.

## Formatting & finishing

- Prettier-style formatting: 2-space indentation, ~80-column wrapping (e.g. closing `</a>` on its own line after wrapped link text). Match the surrounding code exactly.
- After adding a card, bump `<lastmod>` in `sitemap.xml` to today's date.
