// Chooses which cards still need an email and writes one message per card.

import { SITE } from "./cards.mjs";

// Cards that have never been handled: stamped with an id, not quiet, and
// absent from the recorded state. Document order, so a burst arrives in
// posting order.
export function pending(cards, notified) {
  return cards.filter(
    (card) => card.id && card.notify !== false && !notified.includes(card.id),
  );
}

// Prior state plus every id now on the page, so quiet cards count as handled
// and removed cards are remembered.
export function nextState(notified, cards) {
  return [
    ...new Set([...notified, ...cards.map((card) => card.id).filter(Boolean)]),
  ].sort();
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildMessage(card) {
  const link = `${SITE}#${card.id}`;
  const body = card.subtitle || card.paragraphs[0] || "";

  const text = [card.title, body, card.image, link].filter(Boolean).join("\n\n");

  const html = [
    `<h2>${escapeHtml(card.title)}</h2>`,
    body ? `<p>${escapeHtml(body)}</p>` : "",
    card.image
      ? `<p><img src="${escapeHtml(card.image)}" alt="${escapeHtml(card.title)}" /></p>`
      : "",
    `<p><a href="${escapeHtml(link)}">Read the post</a></p>`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject: `New on Booze that matters: ${card.title}`, text, html };
}
