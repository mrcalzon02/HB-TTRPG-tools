#!/usr/bin/env python3
"""Final Reddit embed migration path.

Reddit's MASTER ARCHIVE INDEX renders its numbered entries as independent paragraphs,
not necessarily as an HTML <ol>. This version therefore collects every unique Reddit
/comments/ permalink from the first rendered post body, preserving DOM order and the
nearest chronology heading, and requires exactly the 86 fiction links declared by the
master index before fetching any story bodies.
"""

from __future__ import annotations

import re
import sys
import time
import urllib.parse
from html.parser import HTMLParser
from typing import Any

import migrate_reddit_warhammer_lore as legacy
import migrate_reddit_warhammer_lore_embed as embed


class MasterPermalinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.capture_depth = 0
        self.started = False
        self.finished = False
        self.current_section = "Chronology Unspecified"
        self.heading_tag: str | None = None
        self.heading_parts: list[str] = []
        self.link_href: str | None = None
        self.link_parts: list[str] = []
        self.entries: list[dict[str, str]] = []
        self.seen_ids: set[str] = set()
        master_match = re.search(r"/comments/([a-z0-9]+)/", legacy.MASTER_URL, re.IGNORECASE)
        self.master_id = master_match.group(1).lower() if master_match else ""

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
        if tag == "a":
            href = attrs_dict.get("href") or ""
            absolute = urllib.parse.urljoin("https://www.reddit.com", href)
            if re.search(r"/comments/[a-z0-9]+/", urllib.parse.urlsplit(absolute).path, re.IGNORECASE):
                self.link_href = absolute
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
            match = re.search(r"/comments/([a-z0-9]+)/", self.link_href, re.IGNORECASE)
            title = re.sub(r"\s+", " ", "".join(self.link_parts)).strip()
            if match:
                post_id = match.group(1).lower()
                if post_id != self.master_id and post_id not in self.seen_ids:
                    self.entries.append(
                        {
                            "order": str(len(self.entries) + 1),
                            "index_title": title or f"Archive story {len(self.entries) + 1}",
                            "section": self.current_section,
                            "url": self.link_href,
                            "post_id": post_id,
                        }
                    )
                    self.seen_ids.add(post_id)
            self.link_href = None
            self.link_parts = []

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


def parse_master(page_html: str) -> list[dict[str, str]]:
    parser = MasterPermalinkParser()
    parser.feed(page_html)
    parser.close()
    entries = parser.entries
    if len(entries) != legacy.EXPECTED_MINIMUM_STORIES:
        print(f"Master embed permalink count: {len(entries)}")
        for item in entries[:12]:
            print(f"  {item['order']}: {item['index_title']} -> {item['url']}")
        raise RuntimeError(
            f"Refusing ambiguous embed migration: found {len(entries)} unique linked Reddit posts; "
            f"expected exactly {legacy.EXPECTED_MINIMUM_STORIES}."
        )
    return entries


def main() -> int:
    print(f"Fetching master archive through Reddit embed: {embed.embed_url(legacy.MASTER_URL)}")
    master_html = embed.get_html(legacy.MASTER_URL)
    index_entries = parse_master(master_html)
    print(f"Master embed yielded exactly {len(index_entries)} unique fiction permalinks")

    stories: list[dict[str, Any]] = []
    for position, item in enumerate(index_entries, start=1):
        print(f"[{position:02d}/{len(index_entries):02d}] {item['index_title']}")
        stories.append(embed.fetch_story(item))
        time.sleep(0.35)

    if len(stories) != legacy.EXPECTED_MINIMUM_STORIES:
        raise RuntimeError(f"Expected {legacy.EXPECTED_MINIMUM_STORIES} stories, received {len(stories)}")
    if len({story["post_id"] for story in stories}) != legacy.EXPECTED_MINIMUM_STORIES:
        raise RuntimeError("Story post IDs are not unique; refusing ambiguous archive")
    if any(not story["selftext"].strip() for story in stories):
        raise RuntimeError("At least one story body is empty; refusing partial archive")

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
        print(f"EMBED V2 MIGRATION FAILED: {exc}", file=sys.stderr)
        raise
