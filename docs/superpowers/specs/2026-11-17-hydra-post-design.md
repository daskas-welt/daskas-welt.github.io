# Hydra post

- **Intent:** Add the supplied Hydra harbor photo as a new post in Greek, with a
  short description like the site's other photo cards.
- **Goals:** Keep the image local, add a descriptive title and alt text, and
  publish it with today's date in the RSS feed.
- **Non-goals:** No new layout or site-wide metadata changes.
- **Constraints:** Append the card as a direct child of `.card-columns`; use
  `scripts/generate-feed.mjs` to update `feed.xml` and stamp its stable id.
  Update `sitemap.xml` lastmod for this significant content addition.
- **Approaches:** A local image-only card with today's feed date (chosen) keeps
  the post self-contained and gives the RSS item a publication date. Omitting
  `data-date` would leave the RSS item undated. Hotlinking the supplied local
  file is not a viable option.
- **Implementation details:** Copy `hydra.JPG` into `img/`, then add a card
  titled “Ύδρα” with Greek descriptive alt text, a short Greek paragraph under
  the photo, and a `Wikipedia: Ύδρα` link to the Greek Wikipedia article, as the
  other photo cards do.
