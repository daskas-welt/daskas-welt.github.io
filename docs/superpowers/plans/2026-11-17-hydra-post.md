# Hydra Post Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Greek-language Hydra photo post with a short caption, dated today in the RSS feed.

**Architecture:** Keep the provided photo in `img/` and add its card as the last direct child of `.card-columns`. Run the existing feed generator to stamp the card anchor and regenerate `feed.xml`.

**Tech Stack:** Static HTML, JPEG image, Node.js feed-generation script.

**Spec:** `docs/superpowers/specs/2026-11-17-hydra-post-design.md`

## Global Constraints

- Append the card as a direct child of `.card-columns`.
- Keep the card titled “Ύδρα” with Greek descriptive alt text and a short Greek
  caption paragraph.
- Use `data-date="2026-11-17"` for the RSS publication date.
- Generate `feed.xml` and card IDs with `node scripts/generate-feed.mjs`; never hand-edit the feed.
- Keep sitemap `lastmod` current; it is already `2026-11-17`.

## Review Focus

- The copied JPEG must exist at the exact case-sensitive path used by the card.
- Greek text must remain intact in the HTML and generated feed.
- The image must have descriptive Greek alt text and a short Greek caption.
- The new card must remain a direct child and be last in `.card-columns`.
- The generated feed must include the post, its anchor, and the publication date.

---

### Task 1: Add and publish the Hydra post

**Files:**
- Create: `img/hydra.JPG` (copy of `C:\Users\mcaib\Desktop\hydra.JPG`)
- Modify: `index.html` (append the post card)
- Generate: `feed.xml`
- Verify: `sitemap.xml` (no edit needed; lastmod is already current)

**Interfaces:**
- Consumes: Existing `.card-columns` card markup and `scripts/generate-feed.mjs`.
- Produces: A card titled `Ύδρα`, with `img/hydra.JPG`, Greek alt text, no caption,
  and a generated stable ID; a corresponding dated RSS item.

- [x] **Step 1: Copy the supplied photo**

Copy `C:\Users\mcaib\Desktop\hydra.JPG` to `img/hydra.JPG`. Confirm the new file
exists and has non-zero size.

- [x] **Step 2: Append the Greek image-only card**

Add a direct-child card at the end of `.card-columns` in `index.html`, with
`data-date="2026-11-17"`, title `Ύδρα`, `img/hydra.JPG` as both link and image
source, and alt text `Το λιμάνι της Ύδρας με τον οικισμό αμφιθεατρικά χτισμένο
στην πλαγιά`. Add a `<p class="mt-3">` caption `Η Ύδρα αναδεικνύει την
ομορφιά της καλύτερα όταν την αντικρίζεις από τη θάλασσα, καθώς το γραφικό
λιμάνι με τα αραγμένα καΐκια, τα αρχοντικά με τις κεραμιδένιες στέγες που
πλαισιώνουν τον κόλπο και ο οικισμός που απλώνεται αμφιθεατρικά στην πλαγιά
συνθέτουν μια ξεχωριστή εικόνα.` Add the Wikipedia link `Wikipedia: Ύδρα`
pointing at `https://el.wikipedia.org/wiki/%CE%8E%CE%B4%CF%81%CE%B1`, matching
the other photo cards. Do not manually assign an ID.

- [x] **Step 3: Regenerate and check the feed**

Run `node scripts/generate-feed.mjs`. Confirm the new card receives an ID and
`feed.xml` contains the `Ύδρα` item, a `Tue, 17 Nov 2026` publication date, and
the local image URL.

- [x] **Step 4: Verify the change**

Run `npm test`. Confirm `sitemap.xml` still has `<lastmod>2026-11-17</lastmod>`.
Serve the directory and check the rendered post displays the Hydra photo, Greek
title, and no caption.
