import { test } from "node:test";
import assert from "node:assert/strict";
import { deliver } from "./deliver.mjs";
import { loadState, recipientId } from "./notification-state.mjs";

const SECRET = "test-app-password";

const c = (id, extra = {}) => ({
  offset: 0,
  html: "",
  id,
  title: id,
  subtitle: "",
  paragraphs: [],
  image: "",
  outbound: "",
  date: "",
  notify: true,
  ...extra,
});

const recipient = (address) => ({
  address,
  id: recipientId(address, SECRET),
});

const recorder = () => {
  const written = [];
  return {
    written,
    write: async (state) => {
      written.push(JSON.parse(JSON.stringify(state)));
      return `sha-${written.length}`;
    },
  };
};

test("a missing state file records the page and sends nothing", async () => {
  const { written, write } = recorder();
  let sends = 0;

  const result = await deliver({
    cards: [c("a"), c("b")],
    state: loadState(null, SECRET),
    sha: null,
    recipients: [],
    send: async () => sends++,
    write,
  });

  assert.equal(sends, 0);
  assert.deepEqual(written[0].completed, ["a", "b"]);
  assert.equal(result.bootstrapped, 2);
});

test("a quiet-only push records the quiet id", async () => {
  const { written, write } = recorder();

  await deliver({
    cards: [c("quiet", { notify: false })],
    state: loadState(JSON.stringify(["old"]), SECRET),
    sha: "sha",
    recipients: [],
    send: async () => {
      throw new Error("should not send");
    },
    write,
  });

  assert.deepEqual(written.at(-1).completed, ["old", "quiet"]);
});

test("each recipient attempt is persisted before sending", async () => {
  const { written, write } = recorder();
  const friends = [
    recipient("one@example.com"),
    recipient("two@example.com"),
  ];

  const result = await deliver({
    cards: [c("post")],
    state: loadState("[]", SECRET),
    sha: "sha",
    recipients: friends,
    send: async (_message, friend) => {
      const persisted = written.at(-1);
      assert.ok(persisted.attempts.post.includes(friend.id));
    },
    write,
  });

  assert.deepEqual(result.state.completed, ["post"]);
  assert.equal(Object.hasOwn(result.state.attempts, "post"), false);
});

test("a state-write failure prevents the corresponding send", async () => {
  let sends = 0;

  await assert.rejects(
    deliver({
      cards: [c("post")],
      state: loadState("[]", SECRET),
      sha: "sha",
      recipients: [recipient("one@example.com")],
      send: async () => sends++,
      write: async () => {
        throw new Error("state write failed");
      },
    }),
    /state write failed/,
  );

  assert.equal(sends, 0);
});

test("failed attempts are not retried and remaining recipients are attempted", async () => {
  const { written, write } = recorder();
  const friends = [
    recipient("one@example.com"),
    recipient("two@example.com"),
  ];
  const sent = [];

  const firstRun = await deliver({
    cards: [c("post")],
    state: loadState("[]", SECRET),
    sha: "sha",
    recipients: friends,
    send: async (_message, friend) => {
      sent.push(friend.address);
      if (friend.address === friends[0].address) {
        throw new Error("SMTP outcome unknown");
      }
    },
    write,
  });

  assert.deepEqual(sent, friends.map(({ address }) => address));
  assert.equal(firstRun.failed, "post");
  assert.deepEqual(firstRun.state.completed, ["post"]);

  const retry = await deliver({
    cards: [c("post")],
    state: firstRun.state,
    sha: firstRun.sha,
    recipients: friends,
    send: async (_message, friend) => sent.push(friend.address),
    write,
  });

  assert.deepEqual(sent, friends.map(({ address }) => address));
  assert.deepEqual(retry.sent, []);
  assert.equal(written.at(-1).completed.includes("post"), true);
});

test("duplicate configured recipients are attempted once", async () => {
  const friends = [
    recipient("friend@example.com"),
    recipient(" Friend@Example.com "),
  ];
  const sent = [];
  const { write } = recorder();

  await deliver({
    cards: [c("post")],
    state: loadState("[]", SECRET),
    sha: "sha",
    recipients: friends,
    send: async (_message, friend) => sent.push(friend.address),
    write,
  });

  assert.deepEqual(sent, ["friend@example.com"]);
});

test("an empty recipient list does not complete a pending card", async () => {
  const { written, write } = recorder();

  await assert.rejects(
    deliver({
      cards: [c("post")],
      state: loadState("[]", SECRET),
      sha: "sha",
      recipients: [],
      send: async () => {
        throw new Error("should not send");
      },
      write,
    }),
    /No recipients configured/,
  );

  assert.deepEqual(written, []);
});

test("legacy completed IDs are skipped", async () => {
  const { written, write } = recorder();

  const result = await deliver({
    cards: [c("old")],
    state: loadState(JSON.stringify(["old"]), SECRET),
    sha: "sha",
    recipients: [recipient("friend@example.com")],
    send: async () => {
      throw new Error("should not send");
    },
    write,
  });

  assert.deepEqual(result.sent, []);
  assert.deepEqual(written, []);
});

test("nothing new writes nothing", async () => {
  const { written, write } = recorder();

  await deliver({
    cards: [c("a")],
    state: loadState(JSON.stringify(["a"]), SECRET),
    sha: "sha",
    recipients: [recipient("friend@example.com")],
    send: async () => {
      throw new Error("should not send");
    },
    write,
  });

  assert.deepEqual(written, []);
});
