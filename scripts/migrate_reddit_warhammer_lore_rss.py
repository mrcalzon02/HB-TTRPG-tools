#!/usr/bin/env python3
"""RSS/Atom acquisition layer for the r/EmperorProtects Warhammer lore migration.

Reddit blocks unauthenticated JSON/API requests from GitHub-hosted runners, while its
public per-post RSS endpoint remains readable. This script therefore uses the MASTER
ARCHIVE INDEX RSS body as the authoritative story list/order, fetches each story via
its own RSS feed, extracts the displayed story text, and then hands the resulting
records to the existing archive generator/integration code.
"""

from __future__ import annotations

import datetime as dt
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from typing import Any

import migrate_reddit_warhammer_lore as legacy

ATOM = "{http://www.w3.org/2005/Atom}"
USER_AGENT = (
    "Mozilla/5.0 (compatible; Mrcalzon02-Lore-Archive-RSS/1.0; "
    "+https://github.com/mrcalzon02/HB-TTRPG-tools)"
)


def rss_url(url: str) -> str:
    parsed = urllib.parse.urlsplit(url)
    path = parsed.path.rstrip("/") + "/.rss"
    return urllib.parse.urlunsplit(("https", "www.reddit.com", path, "", ""))


def get_bytes(url: str, *, attempts: int = 6) -> bytes:
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=40) as response:
                return response.read()
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code in {403, 429, 500, 502, 503, 504} and attempt < attempts:
                retry_after = exc.headers.get("Retry-After")
                try:
                    wait = max(1.0, float(retry_after)) if retry_after else min(30.0, 1.5 * attempt * attempt)
                except ValueError:
                    wait = min(30.0, 1.5 * attempt * attempt)
                print(f"RSS returned HTTP {exc.code}; retrying in {wait:.1f}s: {url}")
                time.sleep(wait)
                continue
            raise
        except (urllib.error.URLError, TimeoutError, ET.ParseError) as exc:
            last_error = exc
            if attempt < attempts:
                wait = min(20.0, 1.5 * attempt)
                print(f"Temporary RSS failure; retrying in {wait:.1f}s: {url} ({exc})")
                time.sleep(wait)
                continue
            raise
    raise RuntimeError(f"Could not fetch {url}: {last_error}")


def parse_feed(url: str) -> ET.Element:
    raw = get_bytes(rss_url(url))
    root = ET.fromstring(raw)
    if root.tag != ATOM + "feed":
        raise ValueError(f"Unexpected RSS/Atom root for {url}: {root.tag}")
    return root


def entry_link(entry: ET.Element) -> str:
    for link in entry.findall(ATOM + "link"):
        href = link.attrib.get("href", "")
        if href:
            return href
    return ""


def post_id_from_url(url: str) -> str:
    match = re.search(r"/comments/([a-z0-9]+)/", url, re.IGNORECASE)
    if not match:
        raise ValueError(f"Could not identify Reddit post id: {url}")
    return match.group(1).lower()


def is_op_permalink(url: str, post_id: str) -> bool:
    path = urllib.parse.urlsplit(url).path.rstrip("/")
    return bool(re.search(rf"/comments/{re.escape(post_id)}/[^/]+$", path, re.IGNORECASE))


def op_entry(feed: ET.Element, requested_url: str) -> ET.Element:
    post_id = post_id_from_url(requested_url)
    entries = feed.findall(ATOM + "entry")
    for entry in entries:
        href = entry_link(entry)
        if href and is_op_permalink(href, post_id):
            return entry
    for entry in entries:
        if post_id in entry_link(entry).lower():
            return entry
    raise ValueError(f"No OP entry found in RSS feed for {requested_url}")


def entry_content_html(entry: ET.Element) -> str:
    content = entry.find(ATOM + "content")
    if content is None:
        return ""
    return content.text or ""


class MarkdownDivText(HTMLParser):
    """Extract readable text only from Reddit's rendered <div class=\"md\"> body."""

    BLOCK_START = {"p", "div", "section", "article", "blockquote", "pre", "table", "tr"}
    BLOCK_END = BLOCK_START | {"ul", "ol"}
    HEADING = {"h1", "h2", "h3", "h4", "h5", "h6"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.capture_depth = 0
        self.parts: list[str] = []
        self.list_stack: list[str] = []
        self.in_pre = False

    def _append(self, text: str) -> None:
        if text:
            self.parts.append(text)

    def _newline(self, count: int = 1) -> None:
        self._append("\n" * count)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = dict(attrs)
        if not self.capture_depth and tag == "div" and "md" in (attrs_dict.get("class") or "").split():
            self.capture_depth = 1
            return
        if not self.capture_depth:
            return
        self.capture_depth += 1
        if tag in self.HEADING:
            self._newline(2)
        elif tag in self.BLOCK_START:
            self._newline(1)
        elif tag == "br":
            self._newline(1)
        elif tag in {"ul", "ol"}:
            self.list_stack.append(tag)
            self._newline(1)
        elif tag == "li":
            self._newline(1)
            self._append("- " if not self.list_stack or self.list_stack[-1] == "ul" else "1. ")
        elif tag == "hr":
            self._newline(2)
            self._append("---")
            self._newline(2)
        elif tag == "pre":
            self.in_pre = True

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self.capture_depth and tag == "br":
            self._newline(1)

    def handle_endtag(self, tag: str) -> None:
        if not self.capture_depth:
            return
        if tag == "pre":
            self.in_pre = False
        if tag in self.HEADING:
            self._newline(2)
        elif tag in self.BLOCK_END:
            self._newline(1)
        elif tag == "li":
            self._newline(1)
        if tag in {"ul", "ol"} and self.list_stack:
            self.list_stack.pop()
        self.capture_depth -= 1

    def handle_data(self, data: str) -> None:
        if not self.capture_depth:
            return
        if self.in_pre:
            self._append(data)
            return
        normalized = re.sub(r"[\t\r\f\v ]+", " ", data)
        self._append(normalized)

    def text(self) -> str:
        value = "".join(self.parts)
        value = re.sub(r" *\n *", "\n", value)
        value = re.sub(r"\n{3,}", "\n\n", value)
        return value.strip()


class MasterIndexHTMLParser(HTMLParser):
    """Read section headings and numbered Reddit story links from the master post body."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.capture_depth = 0
        self.current_section = "Chronology Unspecified"
        self.heading_tag: str | None = None
        self.heading_parts: list[str] = []
        self.ol_depth = 0
        self.link_href: str | None = None
        self.link_parts: list[str] = []
        self.entries: list[dict[str, str]] = []
        self.seen_ids: set[str] = set()

    @staticmethod
    def _classes(attrs: list[tuple[str, str | None]]) -> set[str]:
        return set((dict(attrs).get("class") or "").split())

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_dict = dict(attrs)
        if not self.capture_depth and tag == "div" and "md" in self._classes(attrs):
            self.capture_depth = 1
            return
        if not self.capture_depth:
            return
        self.capture_depth += 1
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self.heading_tag = tag
            self.heading_parts = []
        if tag == "ol":
            self.ol_depth += 1
        if tag == "a" and self.ol_depth:
            href = attrs_dict.get("href") or ""
            if re.search(r"reddit\.com/r/EmperorProtects/comments/[a-z0-9]+/", href, re.IGNORECASE):
                self.link_href = href
                self.link_parts = []

    def handle_endtag(self, tag: str) -> None:
        if not self.capture_depth:
            return
        if self.heading_tag == tag:
            heading = re.sub(r"\s+", " ", "".join(self.heading_parts)).strip()
            if heading:
                self.current_section = heading
            self.heading_tag = None
            self.heading_parts = []
        if tag == "a" and self.link_href:
            href = urllib.parse.urljoin("https://www.reddit.com", self.link_href)
            match = re.search(r"/comments/([a-z0-9]+)/", href, re.IGNORECASE)
            title = re.sub(r"\s+", " ", "".join(self.link_parts)).strip()
            if match:
                post_id = match.group(1).lower()
                if post_id != post_id_from_url(legacy.MASTER_URL) and post_id not in self.seen_ids:
                    self.entries.append(
                        {
                            "order": str(len(self.entries) + 1),
                            "index_title": title or "Untitled archive entry",
                            "section": self.current_section,
                            "url": href,
                            "post_id": post_id,
                        }
                    )
                    self.seen_ids.add(post_id)
            self.link_href = None
            self.link_parts = []
        if tag == "ol" and self.ol_depth:
            self.ol_depth -= 1
        self.capture_depth -= 1

    def handle_data(self, data: str) -> None:
        if not self.capture_depth:
            return
        if self.heading_tag:
            self.heading_parts.append(data)
        if self.link_href:
            self.link_parts.append(data)


def extract_story_text(content_html: str) -> str:
    parser = MarkdownDivText()
    parser.feed(content_html)
    parser.close()
    return parser.text()


def parse_master_rss(feed: ET.Element) -> tuple[list[dict[str, str]], ET.Element]:
    entry = op_entry(feed, legacy.MASTER_URL)
    parser = MasterIndexHTMLParser()
    parser.feed(entry_content_html(entry))
    parser.close()
    entries = parser.entries
    if len(entries) != legacy.EXPECTED_MINIMUM_STORIES:
        raise RuntimeError(
            f"Refusing ambiguous RSS migration: master index yielded {len(entries)} numbered story links; "
            f"expected exactly {legacy.EXPECTED_MINIMUM_STORIES}."
        )
    return entries, entry


def atom_text(entry: ET.Element, field: str) -> str | None:
    value = entry.findtext(ATOM + field)
    return value.strip() if value and value.strip() else None


def fetch_story(index_entry: dict[str, str]) -> dict[str, Any]:
    feed = parse_feed(index_entry["url"])
    entry = op_entry(feed, index_entry["url"])
    body = extract_story_text(entry_content_html(entry))
    if not body:
        raise ValueError(f"RSS story body is empty: {index_entry['url']}")
    href = entry_link(entry) or index_entry["url"]
    updated = atom_text(entry, "updated")
    author = entry.find(ATOM + "author")
    author_name = None
    if author is not None:
        author_name = author.findtext(ATOM + "name")
        if author_name:
            author_name = author_name.strip()
    title = atom_text(entry, "title") or index_entry["index_title"]
    return {
        "order": int(index_entry["order"]),
        "section": index_entry["section"],
        "index_title": index_entry["index_title"],
        "title": title,
        "post_id": index_entry["post_id"],
        "reddit_author": author_name,
        "created_utc": updated,
        "url": href,
        "selftext": body,
    }


def main() -> int:
    print(f"Fetching master archive through RSS: {rss_url(legacy.MASTER_URL)}")
    master_feed = parse_feed(legacy.MASTER_URL)
    index_entries, master_entry = parse_master_rss(master_feed)
    print(f"Master RSS yielded exactly {len(index_entries)} numbered fiction links")

    stories: list[dict[str, Any]] = []
    for position, item in enumerate(index_entries, start=1):
        print(f"[{position:02d}/{len(index_entries):02d}] {item['index_title']}")
        stories.append(fetch_story(item))
        time.sleep(0.35)

    ids = [story["post_id"] for story in stories]
    if len(ids) != len(set(ids)):
        raise RuntimeError("Duplicate Reddit post IDs detected; refusing ambiguous RSS archive")
    if len(stories) != legacy.EXPECTED_MINIMUM_STORIES:
        raise RuntimeError(f"Expected {legacy.EXPECTED_MINIMUM_STORIES} stories, received {len(stories)}")
    if any(not story["selftext"].strip() for story in stories):
        raise RuntimeError("At least one RSS story body is empty; refusing partial archive")

    master_meta = {
        "title": atom_text(master_entry, "title") or "MASTER ARCHIVE INDEX",
        "url": entry_link(master_entry) or legacy.MASTER_URL,
        "updated": atom_text(master_entry, "updated"),
        "source": "Reddit RSS/Atom",
    }
    legacy.write_json(stories, master_meta)
    legacy.ARCHIVE_HTML.write_text(legacy.html_page(stories), encoding="utf-8")

    workspace_changed = legacy.patch_workspace()
    legacy.patch_css()
    if workspace_changed:
        legacy.patch_view_mount_cache()

    print(f"Generated {legacy.ARCHIVE_HTML.relative_to(legacy.ROOT)}")
    print(f"Generated {legacy.ARCHIVE_JSON.relative_to(legacy.ROOT)}")
    print(f"Archived {len(stories)} complete RSS story bodies")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"RSS MIGRATION FAILED: {exc}", file=sys.stderr)
        raise
