---
name: create-post
description: Create a new post/card in the website. Use this skill whenever the user wants to add a new item, post, or card to the news section of index.html, providing a title, subtitle, image, text, and link.
---

# Create Post Skill

This skill allows for the addition of new Bootstrap 5 cards to the "news" section of the `index.html` file.

## Target Location
Posts should be added within the `index.html` file, specifically inside the `div` with `class="row gx-3"` that is located within the `<section id="news">`.

## Card Structure
Every new post must follow this exact HTML structure to maintain consistency with existing cards:

```html
<div class="col-sm-6 col-lg-4 mb-3">
    <div class="card">
        <div class="card-body">
            <h5 class="card-title">[TITLE]</h5>
            [SUBTITLE_BLOCK]
            <a href="[IMAGE_PATH]">
                <img class="card-img-top" src="[IMAGE_PATH]" alt="[TITLE]">
            </a>
            [TEXT_BLOCK]
            <a href="[LINK]" class="card-link">[LINK_TEXT]</a>
        </div>
    </div>
</div>
```

### Component Details:
- **[TITLE]**: The main heading.
- **[SUBTITLE_BLOCK]**: If a subtitle is provided, wrap it in:
  `<h6 class="card-subtitle mb-2 text-muted">[SUBTITLE]</h6>`
- **[IMAGE_PATH]**: The relative path to the image asset.
- **[TEXT_BLOCK]**: If descriptive text is provided, wrap it in:
  `<p class="mt-3">[TEXT]</p>` (or `<p class="card-text">[TEXT]</p>` depending on the context).
- **[LINK]**: The destination URL.
- **[LINK_TEXT]**: The clickable text for the link (usually the title or a specific call to action).

## Workflow
1. **Read `index.html`**: Locate the end of the `row gx-3` container inside `<section id="news">`.
2. **Construct HTML**: Build the card HTML using the provided parameters.
3. **Insert**: Append the new card HTML before the closing `</div>` of the `row gx-3` container.
4. **Format**: Ensure the indentation matches the surrounding code.
