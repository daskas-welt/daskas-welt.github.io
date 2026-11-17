# Email Notification for New Posts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mail each new news card to a fixed list of friends once, automatically, when it is pushed to `main`.

**Architecture:** A GitHub Actions workflow runs on pushes that touch `index.html`, regenerates the feed (which stamps card ids), then runs a notifier that compares card ids against a state file kept on a separate `automation` branch. Unseen, non-quiet cards are emailed one message each through Gmail SMTP; their ids are then written back to that branch.

**Tech Stack:** Node 20+ (ESM, built-in `node:test`), `nodemailer` (CI only), GitHub Actions, GitHub contents API.

**Spec:** `docs/superpowers/specs/2026-11-17-email-notifications-design.md`

## Global Constraints

- One email per post, never a digest; three new cards in one push means three messages.
- Editing an existing card must send nothing.
- Node 20 or newer; `scripts/generate-feed.mjs` keeps zero runtime dependencies.
- Public repo: no email addresses, app passwords, or state data committed to `main` or `index.html`.
- CI never commits to `main`; state lives on the `automation` branch only.
- 2-space indent, ~80-column wrapping, matching the existing `scripts/*.mjs` style.
- Card markup is heterogeneous: `img`, `h6.card-subtitle`, `p`, and `a` blocks are all optional and appear in varying order and indentation.

## Review Focus

- **Multi-line tags.** Real cards wrap attributes across lines (`<img class="card-img-top" src="img/x.jpg" />`). A parser that assumes one line per tag silently drops images or links.
- **Nested divs inside a card.** `div.card-body`, `div.card-columns`, and any wrapper must not split one card into two or merge two into one.
- **Attribute order.** `data-notify="false"` may come before or after `id`; a quiet card that slips through emails someone who asked for silence.
- **Re-runs after a partial failure.** If card 2 of 3 fails to send, the rerun must retry card 2 only, not re-send 1 and 3.
- **Feed regression.** Extracting the parser must not change `feed.xml` beyond its `lastBuildDate`.

---

### Task 1: Extract card parsing into a shared module

**Files:**
- Create: `scripts/lib/cards.mjs`
- Create: `scripts/lib/cards.test.mjs`
- Modify: `scripts/generate-feed.mjs:1-130` (remove parser, import it)

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `export const SITE = "https://daskas-welt.github.io/"`
  - `export function readCards(html: string): Card[]` — document order (oldest first), only cards inside `.card-columns`.
  - `Card` = `{ offset: number, html: string, id: string, title: string, subtitle: string, paragraphs: string[], image: string, outbound: string, date: string, notify: boolean }`. `offset` is the index of `<div class="card"` in `html`; `id` is `""` when unstamped; `notify` is `false` only for `data-notify="false"`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/lib/cards.test.mjs` with `node:test` and `node:assert/strict`, covering exactly these cases:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readCards, SITE } from "./cards.mjs";

const page = (cards) => `<html><body>
  <div class="card" id="outside">ignored</div>
  <div class="card-columns">
${cards}
  </div>
</body></html>`;

const card = (opening, inner) => `    <div class="card"${opening}>
      <div class="card-body">
${inner}
      </div>
    </div>`;

test("reads cards in document order with absolute offsets", () => {
  const html = page(
    card(' id="first"', "        <h5 class=\"card-title\">One</h5>") +
      card(' id="second"', "        <h5 class=\"card-title\">Two</h5>"),
  );
  const cards = readCards(html);
  assert.deepEqual(cards.map((c) => c.id), ["first", "second"]);
  assert.equal(html.slice(cards[0].offset).startsWith('<div class="card"'), true);
});

test("ignores divs outside .card-columns", () => {
  assert.equal(readCards(page("")).length, 0);
});

test("keeps a card whole across nested divs", () => {
  const html = page(card(' id="nested"', '        <p>one</p>\n        <div class="inner"><p>two</p></div>'));
  const cards = readCards(html);
  assert.equal(cards.length, 1);
  assert.deepEqual(cards[0].paragraphs, ["one", "two"]);
});

test("reads id and data-notify in either order, defaulting to notify", () => {
  const html = page(
    card(' data-notify="false" id="quiet"', "        <h5 class=\"card-title\">Q</h5>") +
      card(' id="loud"', "        <h5 class=\"card-title\">L</h5>"),
  );
  const [quiet, loud] = readCards(html);
  assert.equal(quiet.notify, false);
  assert.equal(loud.notify, true);
});

test("reads multi-line image tags and absolutises local paths", () => {
  const html = page(
    card(' id="pic"', `        <h5 class="card-title">Pic</h5>
        <img
          class="card-img-top"
          src="img/x.jpg"
          alt="Pic"
        />`),
  );
  assert.equal(readCards(html)[0].image, `${SITE}img/x.jpg`);
});

test("picks the first non-image, non-anchor link as outbound", () => {
  const html = page(
    card(' id="link"', `        <h5 class="card-title">L</h5>
        <a href="#top">top</a>
        <a href="https://example.com/page">go</a>`),
  );
  assert.equal(readCards(html)[0].outbound, "https://example.com/page");
});

test("decodes entities and strips tags from text", () => {
  const html = page(card(' id="txt"', '        <h5 class="card-title">A &amp; B</h5>\n        <p>One&nbsp;two</p>'));
  const [entry] = readCards(html);
  assert.equal(entry.title, "A & B");
  assert.deepEqual(entry.paragraphs, ["One two"]);
});

test("reads data-date and subtitle", () => {
  const html = page(
    card(' id="dated"', `        <h5 class="card-title">T</h5>
        <h6 class="card-subtitle mb-2 text-muted">Sub</h6>
        <p data-date="2026-11-17">x</p>`),
  );
  const [entry] = readCards(html);
  assert.equal(entry.subtitle, "Sub");
  assert.equal(entry.date, "2026-11-17");
});
```

`data-date` is read from anywhere on the card, as the current generator does with `html.match(/data-date="(\d{4}-\d{2}-\d{2})"/)`.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test scripts/lib/cards.test.mjs`
Expected: FAIL — `Cannot find module .../scripts/lib/cards.mjs`.

- [ ] **Step 3: Implement `scripts/lib/cards.mjs`**

Move from `generate-feed.mjs`, unchanged in behaviour: `SITE`, `GREEK`-free helpers `decodeEntities`, `textOf`, `closingDivEnd`, `absoluteUrl`, and the field regexes in `readCard`. Add `readCards(html)` which locates `<div class="card-columns">`, walks `<div class="card"(?=[\s>])` matches within that range, and for each uses `closingDivEnd` to find the end of that card. Read `id` and `data-notify` from the opening tag only: `/ \bid="([^"]*)"/` and `/ \bdata-notify="false"/`.

Do not move `FEED_SIZE`, `escapeXml`, `slugify`, or the feed assembly.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test scripts/lib/cards.test.mjs`
Expected: 8 tests pass, 0 fail.

- [ ] **Step 5: Rewire `generate-feed.mjs` to use the module**

Replace its parser block with `import { readCards, SITE } from "./lib/cards.mjs";` and:

```js
const source = fs.readFileSync(HTML_PATH, "utf8");
const cards = readCards(source);
if (!cards.length) throw new Error("No cards found inside .card-columns");

const used = new Set();
const entries = cards
  .slice(-FEED_SIZE)
  .reverse()
  .map((card) => {
    const base = slugify(card.title) || "post";
    let slug = base;
    for (let n = 2; used.has(slug); n += 1) slug = `${base}-${n}`;
    used.add(slug);
    return { ...card, slug };
  })
  .filter((entry) => entry.title);
```

Keep the item building, feed assembly, and the id-stamping loop (it reads `entry.offset`, `entry.html`, `entry.slug`), which now come from the module.

- [ ] **Step 6: Verify the feed is unchanged**

Run: `node scripts/generate-feed.mjs && git diff -U0 --stat && git diff -U0 feed.xml`
Expected: `index.html` has no diff (every current card is already stamped); `feed.xml` differs only in the `<lastBuildDate>` line.

- [ ] **Step 7: Verify ids survive retitling**

Edit the visible title of the newest card (its `<h5 class="card-title">` text), run `node scripts/generate-feed.mjs`, and confirm the card's `id` attribute is still the old slug. Then discard the experiment:

```bash
git checkout -- index.html feed.xml
```

Expected: the id did not change, which is what makes edits silent.

- [ ] **Step 8: Commit**

```bash
git add scripts/lib/cards.mjs scripts/lib/cards.test.mjs scripts/generate-feed.mjs
git commit -m "Extract card parsing into a shared module"
```

---

### Task 2: Select pending cards and build one message per card

**Files:**
- Create: `scripts/lib/messages.mjs`
- Create: `scripts/lib/messages.test.mjs`

**Interfaces:**
- Consumes: `Card` and `SITE` from Task 1.
- Produces:
  - `export function pending(cards: Card[], notified: string[]): Card[]` — cards with an `id`, not in `notified`, and `notify !== false`, in input order.
  - `export function nextState(notified: string[], cards: Card[]): string[]` — sorted union of prior ids and every id currently on the page, so quiet cards count as handled and removed cards are remembered.
  - `export function buildMessage(card: Card): { subject: string, text: string, html: string }`.

- [ ] **Step 1: Write the failing tests**

Create `scripts/lib/messages.test.mjs`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { pending, nextState, buildMessage } from "./messages.mjs";
import { SITE } from "./cards.mjs";

const c = (id, extra = {}) => ({
  offset: 0, html: "", id, title: id, subtitle: "", paragraphs: [],
  image: "", outbound: "", date: "", notify: true, ...extra,
});

test("pending keeps unseen, non-quiet cards in order", () => {
  const cards = [c("a"), c("b"), c("quiet", { notify: false }), c("seen")];
  assert.deepEqual(pending(cards, ["seen"]).map((x) => x.id), ["a", "b"]);
});

test("pending skips cards without an id", () => {
  assert.deepEqual(pending([c("")], []).map((x) => x.id), []);
});

test("nextState unions page ids with prior state, sorted", () => {
  const state = nextState(["zeta", "seen"], [c("seen"), c("quiet", { notify: false })]);
  assert.deepEqual(state, ["quiet", "seen", "zeta"]);
});

test("buildMessage names the post in the subject and links to its id", () => {
  const message = buildMessage(c("red-rooms", { title: "Red Rooms" }));
  assert.equal(
    message.subject,
    "Από το daskas-welt.github.io: Red Rooms",
  );
  assert.match(message.text, new RegExp(`${SITE}#red-rooms`));
  assert.match(message.html, /<a href="https:\/\/daskas-welt\.github\.io\/#red-rooms">/);
});

test("buildMessage prefers the subtitle, else the first paragraph", () => {
  const sub = buildMessage(c("x", { subtitle: "Sub", paragraphs: ["Body"] }));
  assert.match(sub.text, /Sub/);
  assert.doesNotMatch(sub.text, /Body/);
  const para = buildMessage(c("y", { paragraphs: ["First", "Second"] }));
  assert.match(para.text, /First/);
  assert.doesNotMatch(para.text, /Second/);
});

test("buildMessage includes the image only when the card has one", () => {
  const withImage = buildMessage(c("x", { image: `${SITE}img/x.jpg` }));
  assert.match(withImage.html, /<img src="https:\/\/daskas-welt\.github\.io\/img\/x\.jpg"/);
  assert.match(withImage.text, /https:\/\/daskas-welt\.github\.io\/img\/x\.jpg/);
  assert.doesNotMatch(buildMessage(c("y")).html, /<img/);
});

test("buildMessage escapes card text", () => {
  const message = buildMessage(c("x", { title: "A & <b>B</b>" }));
  assert.match(message.html, /A &amp; &lt;b&gt;B&lt;\/b&gt;/);
});

test("a failed send stays pending while quiet and sent cards do not", () => {
  const cards = [c("sent"), c("failed"), c("quiet", { notify: false })];
  const handled = cards.filter((card) => card.notify === false || card.id === "sent");
  const state = nextState(["old"], handled);
  assert.deepEqual(pending(cards, state).map((card) => card.id), ["failed"]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --test scripts/lib/messages.test.mjs`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `scripts/lib/messages.mjs`**

- `pending`: `cards.filter((card) => card.id && card.notify !== false && !notified.includes(card.id))`.
- `nextState`: `[...new Set([...notified, ...cards.map((card) => card.id).filter(Boolean)])].sort()`.
- `buildMessage`: subject exactly `Από το ${DOMAIN}: ${title}` with `DOMAIN = new URL(SITE).host`; the link is `${SITE}#${card.id}`; body line is `subtitle || paragraphs[0] || ""`. `text` is title, blank line, body line, blank line, image URL if any, blank line, link. `html` is `<h2>` + escaped title + `</h2>`, `<p>` + escaped body, `<img src="…" alt="…">` when present, `<p><a href="…">Read the post</a></p>`. Include a local `escapeHtml` replacing `& < > "`.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test scripts/lib/messages.test.mjs`
Expected: 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/messages.mjs scripts/lib/messages.test.mjs
git commit -m "Add pending-card selection and message building"
```

---

### Task 3: Notifier CLI — state, sending, dry run

**Files:**
- Create: `package.json`, `package-lock.json` (`nodemailer`)
- Create: `scripts/notify.mjs`

**Interfaces:**
- Consumes: `readCards` (Task 1), `pending` / `nextState` / `buildMessage` (Task 2).
- Produces: CLI `node scripts/notify.mjs [--dry-run] [--seed]`.
  - Default: read state, send one message per pending card, write state.
  - `--dry-run`: never touches the network or state; prints the subjects it would send, or with `--seed` prints the ids it would record.
  - `--seed`: writes the current page ids as state without sending.
  - Env: `GITHUB_TOKEN`, `GITHUB_REPOSITORY` (`owner/repo`), `GMAIL_USER`, `GMAIL_APP_PASSWORD`, `FRIENDS_EMAILS`.

- [ ] **Step 1: Add the dependency**

Run: `npm init -y` then adjust `package.json` to `{"name":"daskas-welt-site","private":true,"type":"module","scripts":{"test":"node --test scripts/lib/cards.test.mjs scripts/lib/messages.test.mjs"},"dependencies":{"nodemailer":"^7.0.0"}}`, then `npm install`. Expected: `package-lock.json` created, no `node_modules` committed (add `.gitignore` line `node_modules/` if absent).

- [ ] **Step 2: Implement the CLI**

`scripts/notify.mjs`, in this order:

1. Parse `process.argv` for `--dry-run` and `--seed`.
2. `const source = fs.readFileSync(path.join(ROOT, "index.html"), "utf8")` and `const cards = readCards(source)`.
3. `const state = await readState()` — `GET https://api.github.com/repos/${repo}/contents/notified.json?ref=automation` with `Authorization: Bearer ${GITHUB_TOKEN}`; `404` means `[]`. `--dry-run` uses `[]` and makes no request.
4. With `--seed`: `toWrite = nextState([], cards)`.
5. Otherwise `toSend = pending(cards, state)`; if empty, log `no new posts` and exit 0.
6. `--dry-run`: print one line per message subject (or the JSON of `toWrite` for `--seed`), exit 0.
7. Build `nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD } })`.
8. For each card in `toSend`, `sendMail({ from: GMAIL_USER, to: GMAIL_USER, bcc: FRIENDS_EMAILS.split(",").map((s) => s.trim()).filter(Boolean), ...buildMessage(card) })`; collect the id on success; on failure log the id, stop the loop, and continue to the state write.
9. `const handled = cards.filter((card) => card.notify === false || sentIds.includes(card.id))`; `toWrite = nextState(state, handled)`; write with `PUT` to the contents API (`sha` from step 3, `branch: "automation"`), creating the branch first with `POST /repos/${repo}/git/refs` (`ref: "refs/heads/automation"`, `sha: process.env.GITHUB_SHA`) and ignoring `422`. Quiet cards are recorded; the card whose send failed is not, so it is retried.
10. If any send failed, `process.exitCode = 1`.

Missing required env vars exit 1 with a message naming the variable.

- [ ] **Step 3: Verify the dry run locally**

Run: `node scripts/notify.mjs --dry-run`
Expected: one `Από το daskas-welt.github.io: …` line per stamped card (currently all 20), no network calls, exit 0.

Run: `node scripts/notify.mjs --seed --dry-run`
Expected: a JSON array of the same 20 ids, no network calls.

Run: `node --test scripts/lib/cards.test.mjs scripts/lib/messages.test.mjs`
Expected: all pass.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .gitignore scripts/notify.mjs
git commit -m "Add notifier CLI with dry run and state seeding"
```

---

### Task 4: Workflow, secrets setup, documentation

**Files:**
- Create: `.github/workflows/notify.yml`
- Modify: `AGENTS.md` (new-post flow, quiet cards, state branch, tests)

**Interfaces:**
- Consumes: `node scripts/generate-feed.mjs`, `node scripts/notify.mjs`, `npm ci`.
- Produces: an `Email new posts` workflow triggered by pushes to `main`.

- [ ] **Step 1: Write the workflow**

```yaml
name: Email new posts

on:
  push:
    branches: [main]
    paths: ["index.html"]

concurrency:
  group: notify
  cancel-in-progress: false

permissions:
  contents: write

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: node scripts/generate-feed.mjs
      - run: node scripts/notify.mjs
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GITHUB_REPOSITORY: ${{ github.repository }}
          GITHUB_SHA: ${{ github.sha }}
          GMAIL_USER: ${{ secrets.GMAIL_USER }}
          GMAIL_APP_PASSWORD: ${{ secrets.GMAIL_APP_PASSWORD }}
          FRIENDS_EMAILS: ${{ secrets.FRIENDS_EMAILS }}
```

- [ ] **Step 2: Document it in `AGENTS.md`**

Add to "Critical facts": the email workflow exists, IDs come from `generate-feed.mjs`, state lives on the `automation` branch, `data-notify="false"` on a card's `div` suppresses its email (and is permanent once recorded). Add to "Toolchain": `node --test scripts/lib/cards.test.mjs scripts/lib/messages.test.mjs` for the pure logic, and that `npm ci` runs only in CI.

- [ ] **Step 3: Verify the workflow file parses**

Run: `node -e "const y=require('fs').readFileSync('.github/workflows/notify.yml','utf8'); if(!y.includes('notify')) throw new Error('bad'); console.log('ok')"`
Expected: `ok`. GitHub only validates YAML fully on push; the manual run below is the real check.

- [ ] **Step 4: Configure secrets and seed the state**

In GitHub: add `GMAIL_USER` (`mcaibad2@gmail.com`), `GMAIL_APP_PASSWORD` (Google account → 2-step verification → App passwords), `FRIENDS_EMAILS` (comma-separated). Then, with a token that can write contents, run `node scripts/notify.mjs --seed` locally. Expected: `automation` branch created with `notified.json` holding the current 20 ids; `node scripts/notify.mjs --dry-run` then prints `no new posts` once the branch is readable.

- [ ] **Step 5: End-to-end proof**

Push two throwaway cards in one commit. Expected: one email per card, both arriving, subject naming each card, link opening `#<id>` on the live page, one card with an image showing it. Then edit both cards' text, push. Expected: no email, and the workflow run logs `no new posts`.

- [ ] **Step 6: Commit**

```bash
git add .github/workflows/notify.yml AGENTS.md
git commit -m "Email each new post on push"
```

---

## Verification Summary

| Check | Command | Expected |
|---|---|---|
| Parser and message tests | `npm test` | 16 pass |
| Feed unchanged | `node scripts/generate-feed.mjs && git diff -U0 feed.xml` | only `lastBuildDate` |
| Dry run before seed | `node scripts/notify.mjs --dry-run` | 20 subjects |
| Seed payload | `node scripts/notify.mjs --seed --dry-run` | 20 ids as JSON |
| Quiet card | add `data-notify="false"`, push | no email, id recorded |
| Edit only | edit text, push | no email |
| Two new cards | add both, push | two emails |
