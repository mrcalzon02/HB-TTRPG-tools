"""Build reproducible, reader-compatible EPUB examples from authored canonical manuscripts.

Run from the HB-TTRPG-tools checkout root. Source is the committed prose under
docs/, never lookahead schematics, draft chapters or staging material.
"""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
from pathlib import Path
import re
import shutil
import zipfile
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
NAMES = {
    "bdo-current": ("Beneath Dappled Oaks", "Current Canon — Chapters 1–30",
                    "docs/beneath-dappled-oaks/chapters", 30),
    "nowhere-s1": ("The Nowhere King", "Season One",
                   "docs/nowhere-king/episodes/season-01", 32),
    "nowhere-s2": ("The Nowhere King", "Season Two",
                   "docs/nowhere-king/episodes/season-02", 32),
    "nowhere-s3": ("The Nowhere King", "Season Three — Current Canon",
                   "docs/nowhere-king/episodes/season-03", 18),
}
EPUB_NS = "http://www.idpf.org/2007/opf"
DC_NS = "http://purl.org/dc/elements/1.1/"
CONTAINER_NS = "urn:oasis:names:tc:opendocument:xmlns:container"
XHTML_NS = "http://www.w3.org/1999/xhtml"
NAME_RE = re.compile(r"^(\d{2})-[A-Z0-9-]+\.md$")
METADATA_LINE = re.compile(
    r"^\*\*(?:Status|Season|Episode|Reveal ceiling|Primary dramatic purpose|"
    r"Continuity parent|Next episode|Narrative requirement|Continuity note):\*\*", re.I)
EDITORIAL_HEADING = re.compile(
    r"^## (?:Episode[- ]end state|Continuity(?: state| notes)?|"
    r"Author(?:'s)? notes|Production notes|Canon(?:ical)?(?: status| notes)?|"
    r"Next[- ]episode handoff|Editorial notes)\b", re.I)


def discover(book_id: str, root: Path = ROOT) -> list[Path]:
    if book_id not in NAMES:
        raise ValueError("Unknown book identifier")
    _, _, directory, minimum = NAMES[book_id]
    folder = root / directory
    if not folder.is_dir():
        raise FileNotFoundError("Missing manuscript directory: " + str(folder))
    selected = {}
    for file in folder.glob("*.md"):
        matched = NAME_RE.fullmatch(file.name)
        if not matched:
            continue  # Excludes story-so-far interlude 10.5 and non-numbered materials.
        number = int(matched.group(1))
        if number in selected:
            raise ValueError("Duplicate numbered manuscript: " + str(number))
        selected[number] = file
    required = list(range(1, minimum + 1))
    if sorted(selected) != required:
        missing = sorted(set(required) - set(selected))
        extra = sorted(set(selected) - set(required))
        raise ValueError(f"Canonical {book_id} inventory mismatch; missing={missing}, extra={extra}")
    return [selected[i] for i in required]


def manuscript_text(raw: str, nowhere: bool) -> str:
    content = raw.replace("\r\n", "\n").replace("\r", "\n").lstrip("\ufeff")
    if content.startswith("---\n"):
        finish = content.find("\n---\n", 4)
        if finish < 0:
            raise ValueError("Unclosed manuscript YAML front matter")
        content = content[finish + 5:].lstrip()
    lines = content.split("\n")
    if nowhere:
        # Earliest episodes contain explicit writer-facing status and reveal metadata,
        # not narrative prose. Remove only the introductory metadata section.
        preface = next((i for i, row in enumerate(lines[:90])
                        if row.strip() == "---" and any(METADATA_LINE.match(r)
                            for r in lines[:i])), None)
        if preface is not None:
            lines = lines[preface + 1:]
        # A few early chapters append an author-only episode-end state ledger.
        for i, row in enumerate(lines):
            if EDITORIAL_HEADING.match(row.strip()):
                lines = lines[:i]
                break
    # Drop HTML editorial comments but preserve every actual prose paragraph.
    content = "\n".join(lines)
    content = re.sub(r"<!--[\s\S]*?-->", "", content).strip()
    if len(content) < 500:
        raise ValueError("Source manuscript too short after editorial filtering")
    return content


def _inline(text: str) -> str:
    value = html.escape(text, quote=False)
    value = re.sub(r"\*\*([^*\n]+)\*\*", r"<strong>\1</strong>", value)
    value = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<em>\1</em>", value)
    value = re.sub(r"(?<!_)_([^_\n]+)_(?!_)", r"<em>\1</em>", value)
    return value


def markdown_html(source: str) -> str:
    out = []
    lines = source.splitlines()
    paragraph = []
    def flush():
        if paragraph:
            out.append("<p>" + _inline(" ".join(paragraph).strip()) + "</p>")
            paragraph.clear()
    for line in lines:
        stripped = line.strip()
        if not stripped:
            flush()
            continue
        match = re.match(r"^(#{1,4})\s+(.*)$", stripped)
        if match:
            flush()
            level = min(len(match.group(1)) + 1, 6)
            out.append(f"<h{level}>{_inline(match.group(2))}</h{level}>")
        elif re.fullmatch(r"[-*_]{3,}", stripped):
            flush()
            out.append("<hr/>")
        else:
            paragraph.append(stripped)
    flush()
    return "\n".join(out)


def _chapter_title(path: Path, text: str) -> str:
    headings = re.findall(r"^#{1,2}\s+(.+)$", text, flags=re.M)
    if headings:
        return headings[1].strip() if len(headings) > 1 and "Nowhere King" in headings[0] else headings[0].strip()
    return path.stem.split("-", 1)[-1].replace("-", " ").title()


def _write(archive: zipfile.ZipFile, name: str, data: str):
    archive.writestr(name, data.encode("utf-8"), compress_type=zipfile.ZIP_DEFLATED)


def build_book(book_id: str, dest: Path, root: Path = ROOT, snapshot: str = "local") -> dict:
    title, subtitle, _, _ = NAMES[book_id]
    sources = discover(book_id, root)
    records = []
    for chapter_number, path in enumerate(sources, 1):
        source = path.read_text(encoding="utf-8")
        text = manuscript_text(source, nowhere=book_id.startswith("nowhere"))
        records.append({"ordinal": chapter_number, "path": path.relative_to(root).as_posix(),
                        "title": _chapter_title(path, text), "html": markdown_html(text),
                        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
                        "chars": len(text)})
    document_title = title + " — " + subtitle
    dest.parent.mkdir(parents=True, exist_ok=True)
    uid = "urn:sha256:" + hashlib.sha256(
        (book_id + "\n" + "\n".join(x["sha256"] for x in records)).encode()).hexdigest()
    manifest = [
        '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>',
        '<item id="style" href="styles.css" media-type="text/css"/>',
    ]
    spine = []
    toc_entries = []
    nav_entries = []
    with zipfile.ZipFile(dest, "w") as z:
        z.writestr("mimetype", "application/epub+zip", compress_type=zipfile.ZIP_STORED)
        _write(z, "META-INF/container.xml",
            '<?xml version="1.0" encoding="utf-8"?>'
            f'<container xmlns="{CONTAINER_NS}" version="1.0"><rootfiles>'
            '<rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>'
            '</rootfiles></container>')
        _write(z, "OEBPS/styles.css",
            'body{font-family:serif;line-height:1.6;margin:5%}p{margin:0 0 1em}'
            'h1,h2,h3,h4{text-align:center;line-height:1.3;margin:1.2em 0}'
            'hr{border:0;border-top:1px solid #888;margin:2em 0}')
        for row in records:
            index = row["ordinal"]
            filename = f"chapter-{index:03d}.xhtml"
            chap_title = html.escape(row["title"])
            _write(z, "OEBPS/" + filename,
                '<?xml version="1.0" encoding="utf-8"?>'
                f'<html xmlns="{XHTML_NS}"><head><title>{chap_title}</title>'
                '<link rel="stylesheet" type="text/css" href="styles.css"/></head>'
                f'<body><h1>{chap_title}</h1>{row["html"]}</body></html>')
            manifest.append(f'<item id="c{index}" href="{filename}" media-type="application/xhtml+xml"/>')
            spine.append(f'<itemref idref="c{index}"/>')
            nav_entries.append(f'<li><a href="{filename}">{chap_title}</a></li>')
            toc_entries.append(f'<navPoint id="n{index}" playOrder="{index}">'
                               f'<navLabel><text>{chap_title}</text></navLabel>'
                               f'<content src="{filename}"/></navPoint>')
        _write(z, "OEBPS/nav.xhtml",
            '<?xml version="1.0" encoding="utf-8"?>'
            f'<html xmlns="{XHTML_NS}" xmlns:epub="http://www.idpf.org/2007/ops">'
            '<head><title>Contents</title></head><body>'
            '<nav epub:type="toc"><h1>Contents</h1><ol>'
            + "".join(nav_entries) + '</ol></nav></body></html>')
        _write(z, "OEBPS/toc.ncx",
            '<?xml version="1.0" encoding="utf-8"?>'
            '<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">'
            '<head><meta name="dtb:uid" content="' + uid + '"/></head>'
            '<docTitle><text>' + html.escape(document_title) + '</text></docTitle>'
            '<navMap>' + "".join(toc_entries) + '</navMap></ncx>')
        manifest.append('<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>')
        _write(z, "OEBPS/content.opf",
            '<?xml version="1.0" encoding="utf-8"?>'
            f'<package xmlns="{EPUB_NS}" version="3.0" unique-identifier="uid">'
            f'<metadata xmlns:dc="{DC_NS}"><dc:identifier id="uid">{uid}</dc:identifier>'
            f'<dc:title>{html.escape(document_title)}</dc:title>'
            '<dc:language>en</dc:language><dc:creator>MrCalzon02</dc:creator>'
            f'<meta property="dcterms:modified">2026-11-03T00:00:00Z</meta></metadata>'
            '<manifest>' + "".join(manifest) + '</manifest>'
            '<spine toc="ncx">' + "".join(spine) + '</spine></package>')
    with zipfile.ZipFile(dest) as z:
        if z.testzip() is not None:
            raise ValueError("EPUB ZIP integrity failed")
        for name in ("META-INF/container.xml", "OEBPS/content.opf", "OEBPS/nav.xhtml"):
            ET.fromstring(z.read(name))
    return {"id": book_id, "title": document_title, "file": dest.name,
            "chapters": len(records), "snapshot_commit": snapshot,
            "source_files": [{k: v for k, v in row.items() if k != "html"} for row in records],
            "epub_sha256": hashlib.sha256(dest.read_bytes()).hexdigest(),
            "epub_bytes": dest.stat().st_size}


def build_all(output: Path, root: Path = ROOT, snapshot: str = "local") -> dict:
    books = [build_book(book_id, output / (book_id + ".epub"), root, snapshot) for book_id in NAMES]
    overview = {"schema": 1, "snapshot_commit": snapshot, "books": books}
    voice_source = root / "software/superposition-reader/assets/voice/sphinx-original.mp3"
    if not voice_source.is_file():
        raise FileNotFoundError("Missing user-authorized Sphinx source recording")
    voice_hash = hashlib.sha256(voice_source.read_bytes()).hexdigest()
    known_hash = "ce4c621e3587b9a7f6fd1b6237433f779fa4b8ffb1bae4154ae6739da0362cd2"
    if voice_hash != known_hash:
        raise ValueError("Sphinx source recording differs from the verified user upload")
    shutil.copyfile(voice_source, output / "sphinx-original.mp3")
    overview.update({
        "voice_file": "sphinx-original.mp3",
        "voice_sha256": voice_hash,
        "voice_status": "reference-only; not a generated neural model",
        "voice_transcript": (
            "Sphinx of black quartz, judge my vow. "
            "Through fire and shadow I have carried my secrets across forgotten kingdoms. "
            "I have witnessed empires crumble, kings fall, and gods abandon their thrones. "
            "Now beneath your ancient gaze, let truth decide my fate."
        ),
    })
    (output / "manifest.json").write_text(json.dumps(overview, indent=2), encoding="utf-8")
    return overview


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", type=Path, default=ROOT)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--snapshot", default=os.environ.get("GITHUB_SHA", "local"))
    args = parser.parse_args()
    result = build_all(args.output, args.repo_root, args.snapshot)
    for b in result["books"]:
        print(b["id"], b["chapters"], "chapters", b["epub_bytes"], "bytes")
    print("Wrote:", args.output / "manifest.json")


if __name__ == "__main__":
    main()
