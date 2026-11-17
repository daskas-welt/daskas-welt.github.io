// Builds feed.xml from the news cards in index.html.
//
// Usage: node scripts/generate-feed.mjs
//
// The newest cards live at the end of .card-columns, so the feed takes the
// last FEED_SIZE cards, newest first. Cards in the feed get a stable id on
// their <div class="card"> so feed links can point at the card itself.
// Adding data-date="YYYY-MM-DD" to a card gives it a pubDate.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HTML_PATH = path.join(ROOT, "index.html");
const FEED_PATH = path.join(ROOT, "feed.xml");

const SITE = "https://daskas-welt.github.io/";
const FEED_SIZE = 20;
const FEED_TITLE = "Andreas Daskalopoulos — Booze that matters!";
const FEED_DESCRIPTION =
  "Places, books, films and things Andreas Daskalopoulos finds worth sharing.";

const GREEK = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th",
  ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x", ο: "o", π: "p",
  ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps",
  ω: "o",
};

const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
};

function decodeEntities(input) {
  return input.replace(/&(#?\w+);/g, (match, name) => {
    if (name.startsWith("#")) {
      const code =
        name[1] === "x" || name[1] === "X"
          ? Number.parseInt(name.slice(2), 16)
          : Number.parseInt(name.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    return ENTITIES[name] ?? match;
  });
}

function textOf(html) {
  return decodeEntities(html.replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function slugify(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[α-ω]/g, (letter) => GREEK[letter] ?? "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Returns the index just past the </div> that closes the <div> at `start`.
function closingDivEnd(source, start) {
  const pattern = /<\/?div\b/gi;
  pattern.lastIndex = start;
  let depth = 0;
  let match;
  while ((match = pattern.exec(source))) {
    depth += match[0][1] === "/" ? -1 : 1;
    if (depth === 0) return source.indexOf(">", match.index) + 1;
  }
  throw new Error(`Unbalanced <div> starting at offset ${start}`);
}

// Turns a card href/src into an absolute, percent-encoded URL. Some image
// files have Greek names, which have to be encoded before a reader can fetch
// them.
function absoluteUrl(url) {
  const absolute = /^https?:\/\//i.test(url)
    ? url
    : SITE + url.replace(/^\.?\//, "");
  return new URL(absolute).href;
}

function readCard(html) {
  const titleMatch = html.match(/<h5 class="card-title">([\s\S]*?)<\/h5>/);
  const subtitleMatch = html.match(
    /<h6 class="card-subtitle[^"]*">([\s\S]*?)<\/h6>/,
  );
  const paragraphs = [...html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map(
    (match) => textOf(match[1]),
  );
  const imageMatch = html.match(/<img[^>]*\ssrc="([^"]+)"/);
  const linkMatches = [...html.matchAll(/<a[^>]*\shref="([^"]+)"[^>]*>/g)];
  const outbound = linkMatches
    .map((match) => match[1])
    .find((href) => !href.startsWith("img/") && !href.startsWith("#"));

  return {
    title: titleMatch ? textOf(titleMatch[1]) : "",
    subtitle: subtitleMatch ? textOf(subtitleMatch[1]) : "",
    paragraphs: paragraphs.filter(Boolean),
    image: imageMatch ? absoluteUrl(decodeEntities(imageMatch[1])) : "",
    outbound: outbound ? absoluteUrl(decodeEntities(outbound)) : "",
    date: (html.match(/data-date="(\d{4}-\d{2}-\d{2})"/) ?? [])[1] ?? "",
  };
}

const source = fs.readFileSync(HTML_PATH, "utf8");
const columnsStart = source.indexOf('<div class="card-columns">');
if (columnsStart === -1) throw new Error("No .card-columns block found");

const columnsEnd = closingDivEnd(source, columnsStart);
const columns = source.slice(columnsStart, columnsEnd);

const cards = [];
const cardPattern = /<div class="card"(?=[\s>])/g;
let cardMatch;
while ((cardMatch = cardPattern.exec(columns))) {
  const end = closingDivEnd(columns, cardMatch.index);
  cards.push({
    offset: columnsStart + cardMatch.index,
    html: columns.slice(cardMatch.index, end),
  });
  cardPattern.lastIndex = end;
}

if (!cards.length) throw new Error("No cards found inside .card-columns");

// Slugs are assigned newest-first so the freshest posts keep the plainest ids.
const used = new Set();
const entries = cards
  .slice(-FEED_SIZE)
  .reverse()
  .map((card) => {
    const fields = readCard(card.html);
    const base = slugify(fields.title) || "post";
    let slug = base;
    for (let n = 2; used.has(slug); n += 1) slug = `${base}-${n}`;
    used.add(slug);
    return { ...fields, ...card, slug };
  })
  .filter((entry) => entry.title);

const items = entries
  .map((entry) => {
    const link = `${SITE}#${entry.slug}`;
    const parts = [];
    if (entry.subtitle) parts.push(`<p><em>${escapeXml(entry.subtitle)}</em></p>`);
    for (const paragraph of entry.paragraphs) {
      parts.push(`<p>${escapeXml(paragraph)}</p>`);
    }
    if (entry.image) {
      parts.push(
        `<p><img src="${escapeXml(entry.image)}" alt="${escapeXml(entry.title)}" /></p>`,
      );
    }
    if (entry.outbound) {
      parts.push(`<p><a href="${escapeXml(entry.outbound)}">Read more</a></p>`);
    }

    return [
      "    <item>",
      `      <title>${escapeXml(entry.title)}</title>`,
      `      <link>${escapeXml(link)}</link>`,
      `      <guid isPermaLink="false">${escapeXml(`${SITE}post/${entry.slug}`)}</guid>`,
      ...(entry.date
        ? [
            `      <pubDate>${new Date(`${entry.date}T00:00:00Z`).toUTCString()}</pubDate>`,
          ]
        : []),
      `      <description><![CDATA[${parts.join("\r\n")}]]></description>`,
      "    </item>",
    ].join("\r\n");
  })
  .join("\r\n");

const feed = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
  "  <channel>",
  `    <title>${escapeXml(FEED_TITLE)}</title>`,
  `    <link>${SITE}</link>`,
  `    <description>${escapeXml(FEED_DESCRIPTION)}</description>`,
  "    <language>en</language>",
  `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
  `    <atom:link href="${SITE}feed.xml" rel="self" type="application/rss+xml" />`,
  `    <image>`,
  `      <url>${SITE}img/header.jpeg</url>`,
  `      <title>${escapeXml(FEED_TITLE)}</title>`,
  `      <link>${SITE}</link>`,
  `    </image>`,
  items,
  "  </channel>",
  "</rss>",
  "",
].join("\r\n");

fs.writeFileSync(FEED_PATH, feed, "utf8");

// Give every feed card a stable anchor, keeping existing ids untouched.
let html = source;
const insertions = [];
for (const entry of entries) {
  const opening = html.slice(entry.offset, html.indexOf(">", entry.offset));
  if (/\sid\s*=/.test(opening)) continue;
  insertions.push(entry.offset);
}
for (const offset of insertions.sort((a, b) => b - a)) {
  const entry = entries.find((item) => item.offset === offset);
  html =
    html.slice(0, offset) +
    `<div class="card" id="${entry.slug}"` +
    html.slice(offset + '<div class="card"'.length);
}
const added = insertions.length;
if (html !== source) fs.writeFileSync(HTML_PATH, html, "utf8");

console.log(
  `feed.xml: ${entries.length} items; ${added} card id(s) added to index.html`,
);
