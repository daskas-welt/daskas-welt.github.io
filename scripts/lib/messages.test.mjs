import { test } from "node:test";
import assert from "node:assert/strict";
import { pending, nextState, handled, buildMessage } from "./messages.mjs";
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
  assert.match(
    withImage.html,
    /<img src="https:\/\/daskas-welt\.github\.io\/img\/x\.jpg"/,
  );
  assert.match(withImage.text, /https:\/\/daskas-welt\.github\.io\/img\/x\.jpg/);
  assert.doesNotMatch(buildMessage(c("y")).html, /<img/);
});

test("buildMessage escapes card text", () => {
  const message = buildMessage(c("x", { title: "A & <b>B</b>" }));
  assert.match(message.html, /A &amp; &lt;b&gt;B&lt;\/b&gt;/);
});

test("a failed send stays pending while quiet and sent cards do not", () => {
  const cards = [c("sent"), c("failed"), c("quiet", { notify: false })];
  const handledCards = handled(cards, ["sent"]);
  assert.deepEqual(
    handledCards.map((card) => card.id),
    ["sent", "quiet"],
  );
  const state = nextState(["old"], handledCards);
  assert.deepEqual(
    pending(cards, state).map((card) => card.id),
    ["failed"],
  );
});

test("handled records quiet cards even when nothing was sent", () => {
  const cards = [c("quiet", { notify: false }), c("loud")];
  assert.deepEqual(
    handled(cards, []).map((card) => card.id),
    ["quiet"],
  );
});
