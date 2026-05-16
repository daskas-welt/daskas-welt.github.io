# AGENTS.md

This file provides context for AI coding agents working on this repository.

## Project Overview

This is the personal website of Andreas Daskalopoulos, a senior software engineer based in Patras, Greece. It is a static single-page site hosted on GitHub Pages (repository name: `daskas-welt.github.io`). The page showcases personal interests including travel photography, books, movies, mechanical keyboards, and technology.

The site is intentionally simple: a single `index.html` file with a companion `style.css` and an `img/` directory containing ~72 image assets. There is no JavaScript framework, no build step, and no backend.

## Technology Stack

- **HTML5** — single-page structure
- **CSS3** — custom styling in `style.css`
- **Bootstrap 4.6.2** — loaded via CDN (`bootstrap.min.css` + `bootstrap.bundle.min.js`)
- **Google Fonts** — IBM Plex Sans is loaded in the HTML `<head>`, but `style.css` sets the font-family to `"Inter"`
- **Node.js / npm** — used only for development tooling (Prettier)

## Project Structure

```
.
├── index.html          # Main and only page (all content, ~1628 lines)
├── style.css           # Custom CSS overrides on top of Bootstrap
├── package.json        # Dev dependencies (prettier only)
├── .prettierrc         # Prettier configuration (tabWidth: 4)
├── .gitignore          # Standard Node.js / OS ignore patterns
├── img/                # Image assets (~72 files: JPG, JPEG, PNG)
└── .claude/
    └── skills/         # Claude Code skills (see below)
```

### Key Files

- **`index.html`** — Contains all page sections inline:
  - `#header` — Name and tagline
  - `#about` — Bio with background image (`img/andreas_daskalopoulos.jpg`)
  - `#news` — Bootstrap 4 `.card-columns` grid of cards (travel, books, keyboards, movies, tech). Cards are direct children of `.card-columns`; no `row > col-*` wrappers are used.
  - `#footer-main` — Copyright and GitHub link
  - A commented-out `#gallery` section with a Bootstrap 4 carousel exists near the bottom

- **`style.css`** — Custom styles:
  - Sets font family to `"Inter"`
  - Sets base font-size to 95%
  - Styles `#header`, `#about`, `#footer-main`
  - Removes Bootstrap card border-radius (`border-radius: 0`) on `.card`, `.card-columns .card`, and `.card-img-top`

## Build and Development Commands

There is **no build step** for this project. It is a static site.

```bash
# Format all files with Prettier
npx prettier --write .
```

Prettier is the only development tool. It is configured with a tab width of 4 spaces (see `.prettierrc`).

## Code Style Guidelines

- **Indentation:** 4 spaces (enforced by Prettier)
- **Formatting:** Run `npx prettier --write .` before committing
- **HTML structure:** The `#news` section uses Bootstrap 4 `.card-columns` (CSS `column-count`). Cards are direct children of `.card-columns` and use Bootstrap card component classes (`card`, `card-body`, `card-title`, `card-subtitle`, `card-text`, `card-link`, `card-img-top`). Do **not** wrap cards in `row > col-*` grid divs.
- **Images:** All local images live in `img/` and are referenced with relative paths (`img/filename.jpg`). Some cards use external image URLs directly.
- **Cards:** New entries in the `#news` section should follow the existing card pattern. Note that the `.claude/skills/create-post/SKILL.md` is currently outdated (it still references Bootstrap 5 `row gx-3` and `col-sm-6 col-lg-4 mb-3` wrappers). When adding cards, match the actual markup in `index.html` rather than the skill template until the skill is updated.

## Testing Instructions

There are **no automated tests**. Testing is manual:

1. Open `index.html` in a browser
2. Verify the `.card-columns` layout renders correctly (images load and cards stack in a top-to-bottom, column-by-column flow)
3. Check responsive behavior at different viewport sizes (Bootstrap 4 handles this via `column-count` breakpoints: 3 columns on `lg`, 2 on `md`, 1 on `sm`)
4. Confirm all image links work and external links are valid

## Deployment

The site is deployed via **GitHub Pages**.

- Push changes to the default branch of this repository
- GitHub Pages automatically publishes the site at `https://daskas-welt.github.io`
- No CI/CD pipeline or build script is required

## Security Considerations

- This is a static site with no server-side code, no authentication, and no user input handling
- External links should use `https://` where possible
- Image alt text should be provided for accessibility
- No environment variables or secrets are used

## Claude Skills

This repository includes two Claude Code skills under `.claude/skills/`:

1. **`create-post`** — Intended for adding a new card to the `#news` section of `index.html`. **Warning:** This skill is currently outdated and still references Bootstrap 5 `row gx-3` / `col-sm-6 col-lg-4 mb-3` markup. The actual page uses Bootstrap 4 `.card-columns` with cards as direct children. Prefer matching the existing `index.html` markup directly rather than following the skill template until it is updated.
2. **`skill-creator`** — A general-purpose skill for creating, evaluating, and optimizing other Claude skills. It includes scripts for benchmarking, evaluation viewers, and description optimization.
