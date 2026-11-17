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
    card(' id="first"', '        <h5 class="card-title">One</h5>') +
      card(' id="second"', '        <h5 class="card-title">Two</h5>'),
  );
  const cards = readCards(html);
  assert.deepEqual(
    cards.map((c) => c.id),
    ["first", "second"],
  );
  assert.equal(
    html.slice(cards[0].offset).startsWith('<div class="card"'),
    true,
  );
});

test("ignores divs outside .card-columns", () => {
  assert.equal(readCards(page("")).length, 0);
});

test("keeps a card whole across nested divs", () => {
  const html = page(
    card(
      ' id="nested"',
      '        <p>one</p>\n        <div class="inner"><p>two</p></div>',
    ),
  );
  const cards = readCards(html);
  assert.equal(cards.length, 1);
  assert.deepEqual(cards[0].paragraphs, ["one", "two"]);
});

test("reads id and data-notify in either order, defaulting to notify", () => {
  const html = page(
    card(' data-notify="false" id="quiet"', '        <h5 class="card-title">Q</h5>') +
      card(' id="loud"', '        <h5 class="card-title">L</h5>'),
  );
  const [quiet, loud] = readCards(html);
  assert.equal(quiet.notify, false);
  assert.equal(loud.notify, true);
});

test("reads multi-line image tags and absolutises local paths", () => {
  const html = page(
    card(
      ' id="pic"',
      `        <h5 class="card-title">Pic</h5>
        <img
          class="card-img-top"
          src="img/x.jpg"
          alt="Pic"
        />`,
    ),
  );
  assert.equal(readCards(html)[0].image, `${SITE}img/x.jpg`);
});

test("picks the first non-image, non-anchor link as outbound", () => {
  const html = page(
    card(
      ' id="link"',
      `        <h5 class="card-title">L</h5>
        <a href="#top">top</a>
        <a href="https://example.com/page">go</a>`,
    ),
  );
  assert.equal(readCards(html)[0].outbound, "https://example.com/page");
});

test("decodes entities and strips tags from text", () => {
  const html = page(
    card(
      ' id="txt"',
      '        <h5 class="card-title">A &amp; B</h5>\n        <p>One&nbsp;two</p>',
    ),
  );
  const [entry] = readCards(html);
  assert.equal(entry.title, "A & B");
  assert.deepEqual(entry.paragraphs, ["One two"]);
});

test("reads data-date and subtitle", () => {
  const html = page(
    card(
      ' id="dated"',
      `        <h5 class="card-title">T</h5>
        <h6 class="card-subtitle mb-2 text-muted">Sub</h6>
        <p data-date="2026-11-17">x</p>`,
    ),
  );
  const [entry] = readCards(html);
  assert.equal(entry.subtitle, "Sub");
  assert.equal(entry.date, "2026-11-17");
});
