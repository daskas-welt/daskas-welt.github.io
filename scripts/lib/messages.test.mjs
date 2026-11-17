import { test } from "node:test";
import assert from "node:assert/strict";
import { pending, nextState, buildMessage } from "./messages.mjs";
import { SITE } from "./cards.mjs";

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

test("pending keeps unseen, non-quiet cards in order", () => {
  const cards = [c("a"), c("b"), c("quiet", { notify: false }), c("seen")];
  assert.deepEqual(
    pending(cards, ["seen"]).map((card) => card.id),
    ["a", "b"],
  );
});

test("pending skips cards without an id", () => {
  assert.deepEqual(
    pending([c("")], []).map((card) => card.id),
    [],
  );
});

test("nextState unions page ids with prior state, sorted", () => {
  const state = nextState(
    ["zeta", "seen"],
    [c("seen"), c("quiet", { notify: false })],
  );
  assert.deepEqual(state, ["quiet", "seen", "zeta"]);
});

test("buildMessage names the post in the subject and links to its id", () => {
  const message = buildMessage(c("red-rooms", { title: "Red Rooms" }));
  assert.equal(
    message.subject,
    "Από το daskas-welt.github.io: Red Rooms",
  );
  assert.match(message.text, new RegExp(`${SITE}#red-rooms`));
  assert.match(
    message.html,
    /<a href="https:\/\/daskas-welt\.github\.io\/#red-rooms">/,
  );
});

test("buildMessage includes the subtitle and every paragraph", () => {
  const message = buildMessage(
    c("x", { subtitle: "Sub", paragraphs: ["First", "Second"] }),
  );
  for (const value of ["Sub", "First", "Second"]) {
    assert.ok(message.text.includes(value));
    assert.ok(message.html.includes(`<p>${value}</p>`));
  }
});

test("buildMessage includes the image only when the card has one", () => {
  const withImage = buildMessage(c("x", { image: `${SITE}img/x.jpg` }));
  assert.match(
    withImage.html,
    /<img src="https:\/\/daskas-welt\.github\.io\/img\/x\.jpg"[^>]*width="600"/,
  );
  assert.match(withImage.html, /width:100%/);
  assert.match(withImage.html, /max-width:600px/);
  assert.match(withImage.text, /https:\/\/daskas-welt\.github\.io\/img\/x\.jpg/);
  assert.doesNotMatch(buildMessage(c("y")).html, /<img/);
});

test("buildMessage escapes card text", () => {
  const message = buildMessage(c("x", { title: "A & <b>B</b>" }));
  assert.match(message.html, /A &amp; &lt;b&gt;B&lt;\/b&gt;/);
});
