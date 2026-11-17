// Parses the news cards out of index.html.
//
// Shared by scripts/generate-feed.mjs (which stamps ids and builds the feed)
// and scripts/notify.mjs (which emails new cards), so both agree on what a
// card is and where it starts.

export const SITE = "https://daskas-welt.github.io/";

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

function readFields(html) {
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

// Cards in document order, oldest first, with offsets into the source so
// callers can edit the page in place.
export function readCards(source) {
  const columnsStart = source.indexOf('<div class="card-columns">');
  if (columnsStart === -1) throw new Error("No .card-columns block found");

  const columnsEnd = closingDivEnd(source, columnsStart);
  const columns = source.slice(columnsStart, columnsEnd);

  const cardPattern = /<div class="card"(?=[\s>])/g;
  const cards = [];
  let match;
  while ((match = cardPattern.exec(columns))) {
    const end = closingDivEnd(columns, match.index);
    const html = columns.slice(match.index, end);
    const opening = html.slice(0, html.indexOf(">") + 1);

    cards.push({
      offset: columnsStart + match.index,
      html,
      id: (opening.match(/\sid="([^"]*)"/) ?? [])[1] ?? "",
      notify: !/\sdata-notify="false"/.test(opening),
      ...readFields(html),
    });
    cardPattern.lastIndex = end;
  }

  return cards;
}
