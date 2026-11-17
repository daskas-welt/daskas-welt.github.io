// Emails each new card to friends individually.
//
// Usage: node scripts/notify.mjs [--dry-run] [--seed]
//
// State is kept as notified.json on the `automation` branch so main never
// carries bot commits. Each recipient attempt is recorded before sending, so
// an uncertain or failed send is never automatically retried. Cards marked
// data-notify="false" are recorded as handled without being sent. If no state
// file exists yet, the current page is adopted without sending anything.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readCards } from "./lib/cards.mjs";
import { deliver } from "./lib/deliver.mjs";
import { buildMessage, nextState, pending } from "./lib/messages.mjs";
import { loadState, recipientId } from "./lib/notification-state.mjs";
import { mailOptions, validateRecipient } from "./lib/mail-options.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HTML_PATH = path.join(ROOT, "index.html");
const STATE_BRANCH = "automation";
const STATE_FILE = "notified.json";

const dryRun = process.argv.includes("--dry-run");
const seed = process.argv.includes("--seed");

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

function repoUrl(suffix) {
  return `https://api.github.com/repos/${env("GITHUB_REPOSITORY")}${suffix}`;
}

function githubHeaders() {
  return {
    Authorization: `Bearer ${env("GITHUB_TOKEN")}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "daskas-welt-notify",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function readState() {
  const canRead = Boolean(
    process.env.GITHUB_TOKEN && process.env.GITHUB_REPOSITORY,
  );
  if (dryRun && !canRead) return { raw: null, sha: null, found: false };

  const response = await fetch(
    repoUrl(`/contents/${STATE_FILE}?ref=${STATE_BRANCH}`),
    { headers: githubHeaders() },
  );
  if (response.status === 404) return { raw: null, sha: null, found: false };
  if (!response.ok) {
    throw new Error(`Reading ${STATE_FILE} failed: ${response.status}`);
  }

  const body = await response.json();
  const raw = JSON.parse(Buffer.from(body.content, "base64").toString("utf8"));
  return { raw, sha: body.sha, found: true };
}

async function ensureStateBranch() {
  const response = await fetch(repoUrl("/git/refs"), {
    method: "POST",
    headers: { ...githubHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      ref: `refs/heads/${STATE_BRANCH}`,
      sha: env("GITHUB_SHA"),
    }),
  });
  // 422 means the branch already exists, which is fine.
  if (!response.ok && response.status !== 422) {
    throw new Error(`Creating ${STATE_BRANCH} failed: ${response.status}`);
  }
}

async function writeState(state, sha) {
  if (!sha) await ensureStateBranch();

  const response = await fetch(repoUrl(`/contents/${STATE_FILE}`), {
    method: "PUT",
    headers: { ...githubHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Record notified posts",
      content: Buffer.from(`${JSON.stringify(state, null, 2)}\n`).toString(
        "base64",
      ),
      branch: STATE_BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!response.ok) {
    throw new Error(`Writing ${STATE_FILE} failed: ${response.status}`);
  }
  const result = await response.json();
  return result.content.sha;
}

// Loaded only when a message is actually sent, so --dry-run and --seed work
// without installing dependencies.
async function transport() {
  const { default: nodemailer } = await import("nodemailer");
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: env("GMAIL_USER"),
      pass: env("GMAIL_APP_PASSWORD"),
    },
  });
}

function recipients() {
  const addresses = env("FRIENDS_EMAILS")
    .split(",")
    .map((address) => address.trim());
  for (const address of addresses) validateRecipient(address);
  return addresses;
}

async function main() {
  const source = fs.readFileSync(HTML_PATH, "utf8");
  const cards = readCards(source);
  const { raw, sha, found } = await readState();

  if (seed) {
    const ids = nextState([], cards);
    if (dryRun) {
      console.log(JSON.stringify(ids, null, 2));
    } else {
      await writeState(ids, sha);
      console.log(`seeded ${ids.length} ids`);
    }
    return;
  }

  if (dryRun) {
    if (!found) {
      const count = nextState([], cards).length;
      console.log(`no state yet: would seed ${count} ids; nothing sent`);
      return;
    }
    const completed = Array.isArray(raw) ? raw : (raw?.completed ?? []);
    const toSend = pending(cards, completed);
    if (!toSend.length) console.log("no new posts");
    for (const card of toSend) console.log(buildMessage(card).subject);
    return;
  }

  const appPassword = env("GMAIL_APP_PASSWORD");
  const state = loadState(raw, appPassword);
  const toSend = sha ? pending(cards, state.completed) : [];
  const friends = toSend.length
    ? recipients().map((address) => ({
        address,
        id: recipientId(address, appPassword),
      }))
    : [];
  const needsTransport = toSend.some((card) =>
    friends.some(
      (friend) => !state.attempts[card.id]?.includes(friend.id),
    ),
  );
  const sender = needsTransport ? env("GMAIL_USER") : "";
  const mailer = needsTransport ? await transport() : null;
  const result = await deliver({
    cards,
    state,
    sha,
    recipients: friends,
    send: async (message, recipient, cardId) => {
      try {
        await mailer.sendMail(
          mailOptions({
            from: sender,
            recipient: recipient.address,
            message,
          }),
        );
      } catch {
        console.error(`failed ${cardId} to ${recipient.id.slice(0, 8)}`);
        throw new Error("SMTP send failed");
      }
      console.log(`sent ${cardId} to ${recipient.id.slice(0, 8)}`);
    },
    write: (nextState, currentSha) => writeState(nextState, currentSha),
  });

  if (result.bootstrapped !== null) {
    console.log(`seeded ${result.bootstrapped} ids; nothing sent`);
  } else if (result.failed) {
    console.error(`failed ${result.failed}`);
    process.exitCode = 1;
  } else if (!result.sent.length) {
    console.log("no new posts");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
