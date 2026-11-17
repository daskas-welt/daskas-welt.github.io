# Individual friend email delivery design

## Intent

Send each friend an individual email with exactly one address in `To`, no
`Bcc`, and `GMAIL_USER` as the sender. Never automatically send a post to the
same recipient twice, even if that means a message can be missed.

## Approaches

- Keep one BCC message: rejected because the requested message should have one
  recipient in `To` and no `Bcc`.
- Send individually but keep only card-level state: rejected because a retry
  after a partial failure would duplicate earlier deliveries.
- Send individually and persist each recipient attempt before sending:
  selected because it prevents automatic duplicate sends, accepting that a
  failed or interrupted attempt may mean the recipient misses the message.

## Design

- `scripts/notify.mjs` sends once per friend, sets `from` from the existing
  `GMAIL_USER` secret, sets `to` to that one friend, and omits `bcc`.
- Extend the automation-branch state to track completed cards and per-card
  recipient attempts. Migrate the existing array of card IDs as already
  completed, so old posts are not resent.
- Store recipient identifiers, not email addresses, in the state file. Derive
  each identifier as SHA-256 of `GMAIL_APP_PASSWORD + ":" +
  email.trim().toLowerCase()`.
- Store a fingerprint of `GMAIL_APP_PASSWORD`; if it changes while attempts
  are pending, fail closed rather than silently resend.
- Before attempting delivery, persist that recipient's attempt. Later runs
  skip attempted recipients, including sends that failed or whose outcome is
  unknown.

## Delivery guarantee

This is at-most-once delivery, not exactly-once. The durable attempt record is
written before SMTP is called, so an SMTP failure or workflow interruption can
leave a recipient without the message. Automatic retries never resend to that
recipient.

## Verification

Tests should prove individual `To`/no `Bcc` options, legacy-state migration,
attempts persisted before sending, retries skipping attempted recipients, and
recipient addresses never being written to state.
