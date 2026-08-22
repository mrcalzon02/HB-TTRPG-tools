#!/usr/bin/env python3
"""Migrate the r/EmperorProtects fiction archive through Reddit's public embed host.

GitHub-hosted runners are blocked from Reddit's unauthenticated JSON/API endpoints.
Reddit's official embed renderer remains publicly readable and contains the rendered
submission body, so this acquisition layer uses it while preserving the MASTER
ARCHIVE INDEX as the authoritative source for story inclusion and order.
"""

from __future__ import annotations

import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from typing import Any

import migrate_reddit_warhammer_lore as legacy

USER_AGENT = (
    "Mozilla/5.0 (compatible; Mrcalzon02-Lore-Archive-Embed/1.0; "
    "+https://github.com/mrcalzon02/HB-TTRPG-tools)"
)


def embed_url(url: str) -> str:
    parsed = urllib.parse.urlsplit(url)
    path = parsed.path.rstrip("/") + "/"
    query = urllib.parse.urlencode({"ref_source": "embed", "ref": "share", "embed": "true"})
    return urllib.parse.urlunsplit(("https", "www.redditmedia.com", path, query, ""))


def get_html(url: str, *, attempts: int = 6) -> str:
    last_error: Exception | None = None
    target = embed_url(url)
    for attempt in range(1, attempts + 1):
        request = urllib.request.Request(
            target,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=40) as response:
                raw = response.read()
                charset = response.headers.get_content_charset() or "utf-8"
                return raw.decode(charset, "replace")
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code in {403, 429, 500, 502, 503, 504} and attempt < attempts:
                retry_after = exc.headers.get("Retry-After")
                try:
                    wait = max(1.0, float(retry_after)) if retry_after else min(30.0, 1.5 * attempt * attempt)
                except ValueError:
                    wait = min(30.0, 1.5 * attempt * attempt)
                print(f"Embed returned HTTP {exc.code}; retrying in {wait:.1f}s: {target}")
                time.sleep(wait)
                continue
            raise
        except (urllib.error.URLError, TimeoutError) as exc:
            last_error = exc
            if attempt < attempts:
                wait = min(20.0, 1.5 * attempt)
                print(f"Temporary embed failure; retrying in {wait:.1f}s: {target} ({exc})")
                time.sleep(wait)
                continue
            raise
    raise RuntimeError(f"Could not fetch {target}: {last_error}")


class FirstMarkdownText(HTMLParser):
    """Extract readable text from the first rendered Reddit <div class=\"md\"> body."""

    BLOCK_START = {"p", "div", "section", "article", "blockquote", "pre", "table", "tr"}
    BLOCK_END = BLOCK_START | {"ul", "ol"}
    HEADING = {"h1", "h2", "h3", "h4", "h5", "h6"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.capture_depth = 0
        self.started = False
        self.finished = False
        self.parts: list[str] = []
        self.list_stack: list[str] = []
        self.in_pre = False

    @staticmethod
    def _classes(attrs: list[tuple[str, str | None]]) -> set[str]:
        return set((dict(attrs).get("class") or "").split())

    def _append(self, text: str) -> None:
        if text:
            self.parts.append(text)

    def _newline(self, count: int = 1) -> None:
        self._append("\n" * count)

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if self.finished:
            return
        if not self.capture_depth:
            if not self.started and tag == "div" and "md" in self._classes(attrs):
                self.started = True
                self.capture_depth = 1
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
        if not self.capture_depth or self.finished:
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
        if self.capture_depth == 0:
            self.finished = True

    def handle_data(self, data: str) -> None:
        if not self.capture_depth or self.finished:
            return
        if self.in_pre:
            self._append(data)
        else:
            self._append(re.sub(r"[\t\r\f\v ]+", " ", data))

    def text(self) -> str:
        value = "".join(self.parts)
        value = re.sub(r" *\n *", "\n", value)
        value = re.sub(r"\n{3,}", "\n\n", value)
        return value.strip()


class MasterEmbedParser(HTMLParser):
    """Extract section headings and numbered archive links from the first post body."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.capture_depth = 0
        self.started = False
        self.finished = False
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
        if self.finished:
            return
        attrs_dict = dict(attrs)
        if not self.capture_depth:
            if not self.started and tag == "div" and "md" in self._classes(attrs):
                self.started = True
                self.capture_depth = 1
            return
        self.capture_depth += 1
        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            self.heading_tag = tag
            self.heading_parts = []
        if tag == "ol":
            self.ol_depth += 1
        if tag == "a" and self.ol_depth:
            href = attrs_dict.get("href") or ""
            if re.search(r"(?:reddit\.com)?/r/EmperorProtects/comments/[a-z0-9]+/", href, re.IGNORECASE):
                self.link_href = href
                self.link_parts = []

    def handle_endtag(self, tag: str) -> None:
        if not self.capture_depth or self.finished:
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
                master_id = re.search(r"/comments/([a-z0-9]+)/", legacy.MASTER_URL, re.IGNORECASE).group(1).lower()
                if post_id != master_id and post_id not in self.seen_ids:
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
        if self.capture_depth == 0:
            self.finished = True

    def handle_data(self, data: str) -> None:
        if not self.capture_depth or self.finished:
            return
        if self.heading_tag:
            self.heading_parts.append(data)
        if self.link_href:
            self.link_parts.append(data)


def extract_story_text(page_html: str) -> str:
    parser = FirstMarkdownText()
    parser.feed(page_html)
    parser.close()
    return parser.text()


def parse_master(page_html: str) -> list[dict[str, str]]:
    parser = MasterEmbedParser()
    parser.feed(page_html)
    parser.close()
    if len(parser.entries) != legacy.EXPECTED_MINIMUM_STORIES:
        body_probe = extract_story_text(page_html)
        print(f"Master embed first-body chars: {len(body_probe)}")
        print(f"Master embed first-body preview: {body_probe[:1200]}")
        raise RuntimeError(
            f"Refusing ambiguous embed migration: master index yielded {len(parser.entries)} numbered story links; "
            f"expected exactly {legacy.EXPECTED_MINIMUM_STORIES}."
        )
    return parser.entries


def fetch_story(index_entry: dict[str, str]) -> dict[str, Any]:
    page_html = get_html(index_entry["url"])
    body = extract_story_text(page_html)
    if not body:
        raise ValueError(f"Embed story body is empty: {index_entry['url']}")
    return {
        "order": int(index_entry["order"]),
        "section": index_entry["section"],
        "index_title": index_entry["index_title"],
        "title": index_entry["index_title"],
        "post_id": index_entry["post_id"],
        "reddit_author": None,
        "created_utc": None,
        "url": index_entry["url"],
        "selftext": body,
    }


def main() -> int:
    print(f"Fetching master archive through Reddit embed: {embed_url(legacy.MASTER_URL)}")
    master_html = get_html(legacy.MASTER_URL)
    index_entries = parse_master(master_html)
    print(f"Master embed yielded exactly {len(index_entries)} numbered fiction links")

    stories: list[dict[str, Any]] = []
    for position, item in enumerate(index_entries, start=1):
        print(f"[{position:02d}/{len(index_entries):02d}] {item['index_title']}")
        stories.append(fetch_story(item))
        time.sleep(0.35)

    if len(stories) != legacy.EXPECTED_MINIMUM_STORIES:
        raise RuntimeError(f"Expected {legacy.EXPECTED_MINIMUM_STORIES} stories, received {len(stories)}")
    if len({story["post_id"] for story in stories}) != legacy.EXPECTED_MINIMUM_STORIES:
        raise RuntimeError("Story post IDs are not unique; refusing ambiguous archive")
    if any(not story["selftext"].strip() for story in stories):
        raise RuntimeError("At least one embed story body is empty; refusing partial archive")

    master_meta = {
        "title": "MASTER ARCHIVE INDEX",
        "url": legacy.MASTER_URL,
        "source": "Reddit public embed renderer",
    }
    legacy.write_json(stories, master_meta)
    legacy.ARCHIVE_HTML.write_text(legacy.html_page(stories), encoding="utf-8")

    workspace_changed = legacy.patch_workspace()
    legacy.patch_css()
    if workspace_changed:
        legacy.patch_view_mount_cache()

    print(f"Generated {legacy.ARCHIVE_HTML.relative_to(legacy.ROOT)}")
    print(f"Generated {legacy.ARCHIVE_JSON.relative_to(legacy.ROOT)}")
    print(f"Archived {len(stories)} complete embed story bodies")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"EMBED MIGRATION FAILED: {exc}", file=sys.stderr)
        raise
