#!/usr/bin/env python3
"""Build thumbnails and cap oversized originals.

Usage: python scripts/make-thumbs.py

Every <img> on the page that points at a local img/ file gets its src rewritten
to img/thumbs/<stem>.jpg (720px wide, quality 78) plus lazy loading and
width/height attributes. The <a href> around it keeps pointing at the
original, so a click still opens the full-size image. Images inside HTML
comments are skipped.

JPEG originals longer than 2000px on their longest edge are capped in place;
PNGs and everything else are left alone. Running it again is a no-op for files
that are already done.
"""

import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
HTML_PATH = ROOT / "index.html"
THUMB_DIR = ROOT / "img" / "thumbs"

THUMB_WIDTH = 720
THUMB_QUALITY = 78
ORIGINAL_MAX_EDGE = 2000
ORIGINAL_QUALITY = 85


def comment_ranges(source):
    return [(m.start(), m.end()) for m in re.finditer(r"<!--.*?-->", source, re.S)]


def inside(position, ranges):
    return any(start <= position < end for start, end in ranges)


def load(path):
    """Open, honour EXIF rotation, and flatten transparency onto white."""
    with Image.open(path) as image:
        image = ImageOps.exif_transpose(image)
        image.load()
        if image.mode in ("RGBA", "LA") or (
            image.mode == "P" and "transparency" in image.info
        ):
            image = image.convert("RGBA")
            flat = Image.new("RGB", image.size, (255, 255, 255))
            flat.paste(image, mask=image.getchannel("A"))
            return flat
        return image.convert("RGB")


def cap_original(path, image):
    """Shrink a JPEG whose longest edge exceeds the limit, in place."""
    if path.suffix.lower() not in (".jpg", ".jpeg"):
        return image, False
    longest = max(image.size)
    if longest <= ORIGINAL_MAX_EDGE:
        return image, False
    scale = ORIGINAL_MAX_EDGE / longest
    image = image.resize(
        (round(image.width * scale), round(image.height * scale)), Image.LANCZOS
    )
    image.save(path, "JPEG", quality=ORIGINAL_QUALITY, optimize=True)
    return image, True


def write_thumb(original, image):
    thumb = THUMB_DIR / f"{original.stem}.jpg"
    if image.width > THUMB_WIDTH:
        height = round(image.height * THUMB_WIDTH / image.width)
        image = image.resize((THUMB_WIDTH, height), Image.LANCZOS)
    thumb.parent.mkdir(parents=True, exist_ok=True)
    image.save(thumb, "JPEG", quality=THUMB_QUALITY, optimize=True)
    return thumb


def add_attributes(tag, attributes):
    """Insert attributes, following the tag's existing layout and newlines."""
    if not attributes:
        return tag

    match = re.search(r"(\r?\n)([ \t]*)(/?>)$", tag)
    if match:
        newline = match.group(1)
        indent = match.group(2) + "  "
        added = "".join(f"{newline}{indent}{attribute}" for attribute in attributes)
        return tag[: match.start(1)] + added + tag[match.start(1) :]

    closing = "/>" if tag.endswith("/>") else ">"
    added = "".join(f" {attribute}" for attribute in attributes)
    return tag[: -len(closing)] + added + closing


def main():
    raw = HTML_PATH.read_bytes()
    bom = raw.startswith(b"\xef\xbb\xbf")
    html = raw.decode("utf-8-sig" if bom else "utf-8")

    ranges = comment_ranges(html)

    rewritten = []
    capped = []
    thumbs = 0
    thumb_bytes = 0
    pieces = []
    cursor = 0

    for match in re.finditer(r"<img\b[^>]*>", html, re.IGNORECASE):
        if inside(match.start(), ranges):
            continue
        tag = match.group(0)
        attributes = []
        replacement = tag

        thumb_size = None
        src_match = re.search(r'src="(img/[^"]+)"', tag)
        if src_match and not src_match.group(1).startswith("img/thumbs/"):
            original = ROOT / src_match.group(1)
            if not original.exists():
                raise SystemExit(f"Missing image: {original}")
            before = original.stat().st_size
            image, was_capped = cap_original(original, load(original))
            if was_capped:
                after = original.stat().st_size
                capped.append((src_match.group(1), before, after))
            thumb = write_thumb(original, image)
            thumbs += 1
            thumb_bytes += thumb.stat().st_size
            replacement = replacement.replace(
                src_match.group(0), f'src="img/thumbs/{thumb.name}"'
            )
            thumb_size = image.size
            rewritten.append(src_match.group(1))
        elif src_match:
            existing = ROOT / src_match.group(1)
            if existing.exists():
                with Image.open(existing) as opened:
                    thumb_size = opened.size

        if thumb_size:
            width, height = thumb_size
            replacement = re.sub(
                r'(\s)width="\d+"', rf'\g<1>width="{width}"', replacement
            )
            replacement = re.sub(
                r'(\s)height="\d+"', rf'\g<1>height="{height}"', replacement
            )
            if not re.search(r"\swidth=", replacement):
                attributes += [f'width="{width}"', f'height="{height}"']

        if "loading=" not in tag:
            attributes.insert(0, 'loading="lazy"')

        pieces.append(html[cursor : match.start()])
        pieces.append(add_attributes(replacement, attributes))
        cursor = match.end()

    pieces.append(html[cursor:])
    html = "".join(pieces)
    HTML_PATH.write_bytes((b"\xef\xbb\xbf" if bom else b"") + html.encode("utf-8"))

    print(f"thumbnails written: {thumbs} ({thumb_bytes / 1024 / 1024:.1f} MB)")
    print(f"page images rewritten: {len(rewritten)}")
    for name, before, after in capped:
        print(f"capped {name}: {before / 1024 / 1024:.1f} MB -> {after / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    sys.exit(main())
