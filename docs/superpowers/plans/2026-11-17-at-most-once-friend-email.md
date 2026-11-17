# Simplified At-Most-Once Friend Email Plan

> **For agentic workers:** Use the executing-plans workflow to implement this plan task by task. Steps use checkbox syntax for tracking.

**Goal:** Send each friend an individual email (`To` only, no `Bcc`), never send duplicates, and keep friend email addresses out of git history and logs.

**Tech Stack:** Node.js 20, built-in `node:crypto` & `node:test`, Nodemailer.

**Spec:** `docs/superpowers/specs/2026-11-17-individual-friend-email-design.md`

## Rules
- **Sender:** Always use `GMAIL_USER` for `From`.
- **Recipient:** Send one email per friend using `To` only. Never use `Bcc`.
- **Privacy:** Never write raw email addresses to the state file or console logs. Use a plain SHA-256 hash of `GMAIL_APP_PASSWORD + ":" + email.trim().toLowerCase()` as the recipient ID.
- **Key rotation:** Store a SHA-256 fingerprint of `GMAIL_APP_PASSWORD`; if it
  changes while any card has partial attempts, fail closed rather than resend.
- **Legacy support:** If `notified.json` is an old flat array of card IDs, treat all of them as already completed.
- **No-SMTP flags:** `--dry-run` and `--seed` must run without loading Nodemailer.

---

### Task 1: State & Hash Helpers

**Files:**
- Create: `scripts/lib/notification-state.mjs`
- Test: `scripts/lib/notification-state.test.mjs`

**State Shape:**
```json
{
  "completed": ["card-1"],
  "keyId": "<sha256-fingerprint>",
  "attempts": {
    "card-2": ["<sha256-hash-1>", "<sha256-hash-2>"]
  }
}
```

**Steps:**
- [x] **Step 1: Write tests** in `scripts/lib/notification-state.test.mjs` for `recipientId(email, secret)`, `loadState(rawJson, secret)`, `recordAttempt(state, cardId, id)`, and `completeCard(state, cardId)`. Include tests verifying legacy-array migration, fail-closed key rotation with partial attempts, and that serialized state never contains raw emails.
- [x] **Step 2: Run** `node --test scripts/lib/notification-state.test.mjs`. **Expected:** tests fail because the module does not exist.
- [x] **Step 3: Implement** the 4 pure functions in `scripts/lib/notification-state.mjs` using `node:crypto` (`createHash('sha256')`).
- [x] **Step 4: Re-run** `node --test scripts/lib/notification-state.test.mjs`. **Expected:** all tests pass.

---

### Task 2: Sequential Delivery & CLI Wiring

**Files:**
- Modify: `scripts/lib/deliver.mjs`
- Modify: `scripts/lib/deliver.test.mjs`
- Create: `scripts/lib/mail-options.mjs`
- Test: `scripts/lib/mail-options.test.mjs`
- Modify: `scripts/notify.mjs`

**Steps:**
- [x] **Step 1: Update `deliver.test.mjs`** to cover:
  - State is written *before* `send()` is called.
  - If `write()` throws, `send()` is not called.
  - If `send()` throws, that recipient stays in `attempts` and is skipped on future runs, while remaining recipients still get processed.
  - Duplicate configured recipients are only attempted once.
  - Once all configured recipients are in `attempts` for a card, the card moves to `completed` and is removed from `attempts`.
  - Empty recipient lists do not mark cards as completed.
- [x] **Step 2: Run** `node --test scripts/lib/deliver.test.mjs`. **Expected:** new tests fail against existing delivery logic.
- [x] **Step 3: Write mail-option tests** proving exactly one `to`, no `bcc`, and preservation of the supplied `from` secret value.
- [x] **Step 4: Run** `node --test scripts/lib/mail-options.test.mjs`. **Expected:** tests fail because the mail option helper does not exist.
- [x] **Step 5: Implement `mailOptions({ from, recipient, message })`** in `scripts/lib/mail-options.mjs` and test it.
- [x] **Step 6: Update `deliver.mjs`** to loop through uncompleted cards and configured recipients sequentially, persisting each attempt before calling `send()`.
- [x] **Step 7: Update `notify.mjs`** to:
  - Hash each configured recipient address using `GMAIL_APP_PASSWORD`.
  - Pass a single-recipient `send` callback to `deliver()` using `mailOptions()` (`from: GMAIL_USER`, `to: email`, no `bcc`).
  - Log only card IDs and short recipient hash prefixes (never raw emails or raw Nodemailer error strings that might contain emails).
  - Update the GitHub file `sha` after every state write.
  - Keep `--dry-run` and `--seed` working without importing Nodemailer.
- [x] **Step 8: Run** `node --test scripts/lib/` and test `--dry-run` and `--seed` locally. **Expected:** all tests pass.

---

## Done Checklist
- [x] `node --test scripts/lib/` passes.
- [x] `git diff --check` is clean.
- [x] State serialization tests verify no email addresses are stored.
- [x] The Tzoumerka card is absent from `index.html` and `feed.xml`.
