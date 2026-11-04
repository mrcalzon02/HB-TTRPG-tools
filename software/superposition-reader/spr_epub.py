"""DRM-free EPUB2/EPUB3 text extraction in package spine order.

Standard library only. Files remain inside the ZIP stream, never extracted to
the public source directory. This is narration extraction, not an EPUB renderer.
"""
from __future__ import annotations

from html.parser import HTMLParser
import io
import posixpath
import zipfile
import xml.etree.ElementTree as ET
from urllib.parse import unquote

MAX_EPUB_ITEMS = 4000
MAX_EPUB_UNCOMPRESSED = 128 * 1024 * 1024
MAX_XML_BYTES = 4 * 1024 * 1024


class _XhtmlText(HTMLParser):
    BLOCKS = {"p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "li",
              "blockquote", "article", "section", "pre", "ul", "ol", "hr"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.skip_depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style", "head", "svg"}:
            self.skip_depth += 1
        elif not self.skip_depth:
            if tag in self.BLOCKS:
                self.parts.append("\n\n")
            elif tag == "br":
                self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in {"script", "style", "head", "svg"} and self.skip_depth:
            self.skip_depth -= 1
        elif not self.skip_depth and tag in self.BLOCKS:
            self.parts.append("\n\n")

    def handle_data(self, data):
        if not self.skip_depth:
            self.parts.append(data)


def _safe_path(base: str, href: str) -> str:
    href = unquote(href.split("#", 1)[0].split("?", 1)[0])
    if not href or href.startswith("/") or "\\" in href or "\x00" in href:
        raise ValueError("Unsafe EPUB document reference")
    result = posixpath.normpath(posixpath.join(base, href))
    if result.startswith("../") or result in (".", "..") or result.startswith("/"):
        raise ValueError("EPUB document reference leaves the archive")
    return result


def _xml_bytes(archive: zipfile.ZipFile, name: str) -> bytes:
    try:
        info = archive.getinfo(name)
        if info.file_size > MAX_XML_BYTES:
            raise ValueError("EPUB metadata file is too large")
        return archive.read(info)
    except KeyError as exc:
        raise ValueError("Missing EPUB metadata: " + name) from exc


def extract_epub_sections(data: bytes) -> list[str]:
    """Read unencrypted EPUB spine documents as distinct narration chapters."""
    try:
        archive = zipfile.ZipFile(io.BytesIO(data), "r")
    except (zipfile.BadZipFile, OSError) as exc:
        raise ValueError("Not a readable EPUB ZIP archive") from exc
    with archive:
        infos = archive.infolist()
        if len(infos) > MAX_EPUB_ITEMS or sum(x.file_size for x in infos) > MAX_EPUB_UNCOMPRESSED:
            raise ValueError("EPUB contains too much uncompressed content")
        if "META-INF/encryption.xml" in archive.namelist():
            raise ValueError("Encrypted EPUBs are not supported")
        try:
            container = ET.fromstring(_xml_bytes(archive, "META-INF/container.xml"))
            entry = container.find(".//{*}rootfile")
            if entry is None or not entry.attrib.get("full-path"):
                raise ValueError("EPUB does not identify a package document")
            package_path = _safe_path("", entry.attrib["full-path"])
            package = ET.fromstring(_xml_bytes(archive, package_path))
        except ET.ParseError as exc:
            raise ValueError("Invalid EPUB package metadata") from exc
        base = posixpath.dirname(package_path)
        items = {}
        for item in package.findall(".//{*}manifest/{*}item"):
            item_id = item.attrib.get("id")
            media = item.attrib.get("media-type", "")
            href = item.attrib.get("href")
            if item_id and href and media in {"application/xhtml+xml", "text/html"}:
                items[item_id] = _safe_path(base, href)
        chapters = []
        for itemref in package.findall(".//{*}spine/{*}itemref"):
            item_id = itemref.attrib.get("idref")
            filename = items.get(item_id)
            if not filename:
                continue
            content = _xml_bytes(archive, filename)
            parser = _XhtmlText()
            parser.feed(content.decode("utf-8-sig", errors="replace"))
            parser.close()
            text = "".join(parser.parts).strip()
            if text:
                chapters.append(text)
        if not chapters:
            raise ValueError("EPUB has no readable chapters in its spine")
        return chapters


def extract_epub(data: bytes) -> str:
    """Preserve the original plain-text API and spine-order document contents."""
    return "\n\n".join(extract_epub_sections(data))
