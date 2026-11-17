import { test } from "node:test";
import assert from "node:assert/strict";
import { deliver } from "./deliver.mjs";

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

const recorder = () => {
  const written = [];
  return {
    written,
    write: async (ids) => {
      written.push(ids);
    },
  };
};

test("a missing state file records the page and sends nothing", async () => {
  const { written, write } = recorder();
  const sent = [];

  const result = await deliver({
    cards: [c("a"), c("b")],
    state: [],
    sha: null,
    send: async (message) => sent.push(message.subject),
    write,
  });

  assert.equal(sent.length, 0);
  assert.deepEqual(written, [["a", "b"]]);
  assert.equal(result.bootstrapped, 2);
});

test("a quiet-only push records the quiet id", async () => {
  const { written, write } = recorder();

  await deliver({
    cards: [c("quiet", { notify: false })],
    state: ["old"],
    sha: "sha",
    send: async () => {
      throw new Error("should not send");
    },
    write,
  });

  assert.deepEqual(written, [["old", "quiet"]]);
});

test("a failed send is not recorded, earlier ones are", async () => {
  const { written, write } = recorder();
  const cards = [c("a"), c("b"), c("c")];

  const result = await deliver({
    cards,
    state: ["old"],
    sha: "sha",
    send: async (message) => {
      if (message.subject.endsWith("b")) throw new Error("boom");
    },
    write,
  });

  assert.deepEqual(written, [["a", "old"]]);
  assert.equal(result.failed, "b");
});

test("nothing new and nothing quiet writes nothing", async () => {
  const { written, write } = recorder();

  await deliver({
    cards: [c("a")],
    state: ["a"],
    sha: "sha",
    send: async () => {
      throw new Error("should not send");
    },
    write,
  });

  assert.deepEqual(written, []);
});
