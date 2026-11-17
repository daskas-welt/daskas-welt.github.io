# Email notification on new posts — design

## What

When a push to `main` adds a card to the news section, the site emails
that post to a fixed list of friends — one message per post. The list is
maintained by the site owner; there is no signup and no unsubscribe flow.

## Why

Friends want to hear about new posts without using an RSS reader. The
owner posts in bursts and edits old cards freely, so notifications must
survive edits without producing extra email.

## Goals

- One email per post: three cards in one push means three separate
  messages, each about its own card.
- Editing an existing card — text, image, link, layout — sends nothing.
- A card can be added quietly, without notifying anyone.
- Friends' addresses never appear in the public repository or the site.
- No new service for the site itself: it stays static, built by nothing.

## Non-goals

- Public subscription, double opt-in, unsubscribe links, or list
  management UI.
- Sending from the site itself (impossible: GitHub Pages serves files
  only).
- A manual "send" button. Decided against: the owner wants the email to
  follow the upload, and accepts each new post arriving as its own
  message.
- Changing how the feed is generated, or adding dates to cards.

## Anti-goals

- Any chance that fixing a typo mails a post again.
- Bot commits on `main` that force a pull before the next push.
- Storing addresses in a file, a workflow, or the page source.

## Approaches considered

1. **GitHub Action on push (chosen).** Workflow parses the cards, compares
   them against a state file, and sends the difference. Keeps addresses in
   repository secrets, runs wherever the push came from, and needs no
   third party watching the site.
2. **RSS-to-email service** (MailerLite, Buttondown, follow.it) pointed at
   `feed.xml`. Less code, and the list lives with the vendor. Rejected: it
   sends on its own schedule, cannot tell one publishing session from
   three, and would still need `pubDate` fixed.
3. **Local script** (`node scripts/notify.mjs`). Nothing sensitive on
   GitHub, but only works when remembered and only from that machine.
   Rejected: the owner wanted it to happen on upload.

## How it works

Workflow `.github/workflows/email-new-posts.yml`:

- Trigger: `push` to `main`, whatever the push touched — the first run
  after deploy bootstraps state, and later runs exit quietly unless a card
  is new.
- `concurrency` group with `cancel-in-progress: false`, so two quick
  pushes queue rather than race on the state file.
- `permissions: contents: write` (state write only).

Steps:

1. Checkout, install Node, `npm ci`.
2. `node scripts/generate-feed.mjs` — stamps ids on the newest cards,
   exactly as documented in `AGENTS.md`. Nothing is committed by CI.
3. `node scripts/notify.mjs`:
   - Reads every card in `.card-columns` that has an `id`.
   - Compares that set with `notified.json`.
   - Cards absent from both `notified.json` and `data-notify="false"` are
     the new ones.
   - No new cards → the quiet ones on the page are recorded, and the run
     exits without email.
   - Otherwise send one message per new card, then write `notified.json`.
4. If `notified.json` does not exist yet, the run records every id on the
   page and sends nothing. A deployment therefore adopts the back
   catalogue instead of mailing it.
5. State is written with the GitHub contents API to a separate
   `automation` branch. `main` therefore never carries bot commits and a
   local clone never drifts.

### Card ids

Ids are the slugs `generate-feed.mjs` already assigns, newest first, over
the last 20 cards. They are stable: once stamped, a card keeps its id even
if it is retitled, which is what makes edits silent. Cards outside the
newest 20 never get an id and never participate — they are older than
twenty newer posts by definition.

### Quiet cards

`data-notify="false"` on the card's outer `div` suppresses that card.
Quiet cards are still recorded as handled, so removing the marker later
sends nothing. To deliberately re-send a card, delete its id from
`notified.json`.

### Message content

One message per card, sent oldest first so a burst arrives in posting
order.

- Subject: `Από το daskas-welt.github.io: <title>`.
- Body: title, subtitle or first paragraph, image if the card has one,
  and a link to `https://daskas-welt.github.io/#<id>`.
- Multipart: plain text plus the same content as simple HTML.

### Sender

Gmail SMTP with an app password, `From: mcaibad2@gmail.com` — the address
already published on the site. Chosen over a transactional API (Brevo,
SMTP2GO) because those would send `From: @gmail.com` from their own IPs,
which SPF/DKIM punish, and would need a new account. Sends via
`nodemailer`, installed only in CI.

Secrets: `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `FRIENDS_EMAILS`
(comma-separated).

### Failure behaviour

Send each message, then write state once with every id that was
successfully sent, plus every quiet card on the page. If one send fails,
the run fails after recording the earlier ones; only the failed card is
retried by the next push. A duplicate is preferred over a silent miss.
A push that contains only quiet cards still writes their ids.

### Bootstrap

A missing `notified.json` is handled in code: the run writes the ids of the
current twenty cards and sends nothing. `node scripts/notify.mjs --seed`
does the same thing on demand, for repairing a state file that was lost or
deliberately reset. Without this, deploying the feature would mail the
whole back catalogue.

## Constraints

- Public repo: addresses and the app password exist only as secrets.
- Zero-dependency feed script stays zero-dependency; the notifier gets
  `package.json` + `package-lock.json` for `nodemailer`.
- Node 20+ (`fetch` for the contents API).

## Known limits

- More than 20 new cards in a single push: the oldest of them never get
  ids and are never mailed.
- GitHub's mobile/desktop clients and `git push` all trigger identically;
  a force-push that drops a card and reintroduces it later will mail it
  again only if its id was never recorded.
- Gmail's free limits are irrelevant at this list size, but a Google
  block of SMTP from CI IPs would require switching the transport to an
  API provider. The notifier keeps sending behind one function so that
  swap is local.

## Files

- `.github/workflows/email-new-posts.yml` — trigger, concurrency, steps, secrets.
- `scripts/notify.mjs` — card comparison, message building, sending, state.
- `scripts/lib/cards.mjs` — card parsing lifted out of
  `generate-feed.mjs`, imported by both.
- `scripts/generate-feed.mjs` — imports the parser instead of holding it.
- `package.json`, `package-lock.json` — `nodemailer`.
- `AGENTS.md` — new-post flow, `data-notify`, the `automation` branch.
- `docs/superpowers/specs/2026-11-17-email-notifications-design.md` — this.

## Verification

No automated tests existed in this repo before this change; the parser,
selection, and delivery rules now have `node:test` coverage run by
`npm test` (and by CI). The page itself is still verified manually.

1. `npm test` — parser, selection, and delivery rules, including quiet
   cards and partial failures.
2. `node scripts/notify.mjs --dry-run` reads state read-only when
   credentials are present and prints what would be sent, or
   `no new posts`; without credentials it reports that it would seed.
3. `node scripts/generate-feed.mjs` leaves `feed.xml` unchanged apart from
   `lastBuildDate`.
4. End to end: set `FRIENDS_EMAILS` to the owner's own address, add two
   throwaway cards in one push, confirm two emails arrive; then edit both,
   push, confirm nothing more is sent.

## Left to the builder

- Exact message wording and HTML.
- Whether the state write uses `fetch` against `https://api.github.com`
  with `GITHUB_TOKEN` or `gh api`; both are dependency-free.
- Creating the `automation` branch on first run if it does not exist.
