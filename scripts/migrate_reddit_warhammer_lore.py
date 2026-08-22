#!/usr/bin/env python3
"""Migrate the r/EmperorProtects master fiction archive into the Warhammer 40K workspace.

This script is deliberately conservative:
- The Reddit MASTER ARCHIVE INDEX is the authoritative list and order.
- Only linked r/EmperorProtects story posts are copied.
- Story selftext is preserved verbatim in JSON and in a static HTML reader.
- The existing Warhammer workspace is extended with one native `Lore` register.
- Existing archive/map/seal functionality is not rewritten.

The script is intended to run in GitHub Actions with repository write access.
"""

from __future__ import annotations

import datetime as dt
import html
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MASTER_URL = "https://www.reddit.com/r/EmperorProtects/comments/1vid8o1/master_archive_index/"
EXPECTED_MINIMUM_STORIES = 86
USER_AGENT = (
    "Mozilla/5.0 (compatible; Mrcalzon02-Lore-Archive-Migration/1.0; "
    "+https://github.com/mrcalzon02/HB-TTRPG-tools)"
)

ARCHIVE_JSON = ROOT / "assets" / "warhammer-40k" / "lore" / "reddit-story-archive.json"
ARCHIVE_HTML = ROOT / "warhammer-40k-lore.html"
WORKSPACE_JS = ROOT / "warhammer-40k-workspace-v8.js"
WORKSPACE_CSS = ROOT / "warhammer-40k-workspace-v8.css"
VIEW_MOUNTS_JS = ROOT / "app-lite-view-mounts.js"

AUTHOR_NOTICE = (
    "Yes, these stories are all written by me, Mrcalzon02 — or, to satisfy the legal "
    "pedants, Christopher Vardeman. They were written by me for my own enjoyment, and "
    "this section serves as my own personal archive location."
)

MAIN_PAGE_LEGAL = """Terms of Service & Usage Agreement
Last Updated: July 10, 2026

1. Nature of Service
This website (hereinafter referred to as the \"Platform\") serves as a private, non-commercial, fan-made utility suite intended exclusively for the facilitation of tabletop role-playing games (TTRPGs). The Platform is provided on an \"as-is\" and \"as-available\" basis. The developer makes no representations or warranties of any kind, express or implied, regarding the accuracy, reliability, or availability of the tools, generators, or data contained herein.

2. Intellectual Property & Third-Party Rights
The developer acknowledges and respects the intellectual property rights of all third-party entities.

External IP: References to systems, lore, or terminology belonging to established intellectual properties, including but not limited to World of Darkness (Paradox Interactive), Shadowrun (Topps Company, Inc.), and other associated systems, remain the sole and exclusive property of their respective license holders.

No Affiliation: This Platform is an independent, unofficial project and is not affiliated with, endorsed by, or sponsored by the aforementioned intellectual property owners.

Original Material: All original code, architecture, and proprietary UI elements developed for this Platform are provided under the terms outlined in Section 3.

3. Permitted Use (the \"Anti-License\")
The objective of this Platform is to support personal creative expression. Users are granted the following permissions regarding the non-commercial use of this material:

Personal Use: Users are authorized to utilize all generators, workspaces, and utilities for private, non-commercial tabletop gaming sessions.

Adaptation: Users may view, adapt, and modify the underlying source code for personal, private projects.

Prohibition of Commercial Exploitation: Any commercial use, sale, redistribution for profit, or inclusion of this Platform’s source code or proprietary lore assets in commercial products is strictly prohibited.

Attribution: While not mandated, credit to the original creator is appreciated when adaptations are shared within non-commercial hobbyist circles.

4. Limitation of Liability
Under no circumstances shall the developer of this Platform be held liable for any direct, indirect, incidental, or consequential damages arising from the use of, or inability to use, these tools. This includes, but is not limited to, loss of campaign data, technical failures during sessions, or disruptions to game-play environments.

5. Governance
By accessing this Platform, the user acknowledges that the Platform’s primary purpose is the advancement of the tabletop hobby. The developer reserves the right to modify these terms, deprecate tools, or restructure the Platform’s offerings at their sole discretion without prior notice to ensure the continued security and integrity of the project.

For inquiries regarding the scope of these terms, please refer to the project repository metadata."""

WARHAMMER_NOTE = (
    "Warhammer 40,000 and related names, settings, terminology, factions, characters, and "
    "marks are third-party intellectual property and remain the property of their respective "
    "rights holders, including Games Workshop where applicable. This is an unofficial, "
    "non-commercial fan-fiction archive and is not affiliated with or endorsed by those rights holders."
)


def reddit_json_url(url: str) -> str:
    parsed = urllib.parse.urlsplit(url)
    path = parsed.path.rstrip("/")
    if path.endswith(".json"):
        json_path = path
    else:
        json_path = path + ".json"
    return urllib.parse.urlunsplit(("https", "www.reddit.com", json_path, "raw_json=1&limit=1", ""))


def get_json(url: str, *, attempts: int = 7) -> Any:
    request_url = reddit_json_url(url)
    last_error: Exception | None = None
    for attempt in range(1, attempts + 1):
        request = urllib.request.Request(
            request_url,
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "application/json,text/plain;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.9",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=40) as response:
                payload = response.read().decode("utf-8")
                return json.loads(payload)
        except urllib.error.HTTPError as exc:
            last_error = exc
            if exc.code in {403, 429, 500, 502, 503, 504} and attempt < attempts:
                retry_after = exc.headers.get("Retry-After")
                try:
                    wait = float(retry_after) if retry_after else min(45.0, 2.0 * attempt * attempt)
                except ValueError:
                    wait = min(45.0, 2.0 * attempt * attempt)
                print(f"Reddit returned HTTP {exc.code}; retrying in {wait:.1f}s: {request_url}")
                time.sleep(wait)
                continue
            raise
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            last_error = exc
            if attempt < attempts:
                wait = min(30.0, 1.5 * attempt * attempt)
                print(f"Temporary fetch failure; retrying in {wait:.1f}s: {request_url} ({exc})")
                time.sleep(wait)
                continue
            raise
    raise RuntimeError(f"Could not fetch {request_url}: {last_error}")


def post_data(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, list) or not payload:
        raise ValueError("Unexpected Reddit JSON envelope")
    listing = payload[0]
    children = listing.get("data", {}).get("children", [])
    if not children:
        raise ValueError("Reddit JSON contains no post")
    data = children[0].get("data", {})
    if not isinstance(data, dict):
        raise ValueError("Reddit post data is malformed")
    return data


def parse_master_index(selftext: str) -> list[dict[str, str]]:
    entries: list[dict[str, str]] = []
    current_section = "Chronology Unspecified"
    section_re = re.compile(r"^##\s+(.+?)\s*$")
    entry_re = re.compile(
        r"^\s*(\d+)\.\s+\[([^\]]+)\]\((https?://(?:www\.)?reddit\.com/r/EmperorProtects/comments/[a-z0-9]+/[^)\s]*)\)",
        re.IGNORECASE,
    )
    for raw_line in selftext.splitlines():
        line = raw_line.strip()
        section_match = section_re.match(line)
        if section_match:
            current_section = section_match.group(1).strip()
            continue
        entry_match = entry_re.match(line)
        if not entry_match:
            continue
        order = entry_match.group(1)
        title = entry_match.group(2).strip()
        url = entry_match.group(3).strip()
        if "/comments/1vid8o1/" in url:
            continue
        entries.append(
            {
                "order": order,
                "index_title": title,
                "section": current_section,
                "url": url,
            }
        )

    # Fallback for Markdown variants in which the numbered-list regex is too strict.
    if len(entries) < EXPECTED_MINIMUM_STORIES:
        all_urls = re.findall(
            r"https?://(?:www\.)?reddit\.com/r/EmperorProtects/comments/[a-z0-9]+/[^\s)\]]*",
            selftext,
            flags=re.IGNORECASE,
        )
        seen = {item["url"] for item in entries}
        for url in all_urls:
            url = url.rstrip(".,;:")
            if "/comments/1vid8o1/" in url or url in seen:
                continue
            entries.append(
                {
                    "order": str(len(entries) + 1),
                    "index_title": "Untitled archive entry",
                    "section": "Chronology Unspecified",
                    "url": url,
                }
            )
            seen.add(url)

    deduped: list[dict[str, str]] = []
    seen_ids: set[str] = set()
    for item in entries:
        match = re.search(r"/comments/([a-z0-9]+)/", item["url"], re.IGNORECASE)
        if not match:
            continue
        post_id = match.group(1).lower()
        if post_id in seen_ids:
            continue
        item["post_id"] = post_id
        deduped.append(item)
        seen_ids.add(post_id)
    return deduped


def fetch_story(index_entry: dict[str, str]) -> dict[str, Any]:
    payload = get_json(index_entry["url"])
    data = post_data(payload)
    selftext = data.get("selftext") or ""
    if not selftext.strip():
        raise ValueError(f"Story {index_entry['order']} has no selftext: {index_entry['url']}")
    created = data.get("created_utc")
    created_iso = None
    if isinstance(created, (int, float)):
        created_iso = dt.datetime.fromtimestamp(created, tz=dt.timezone.utc).isoformat().replace("+00:00", "Z")
    permalink = data.get("permalink") or urllib.parse.urlsplit(index_entry["url"]).path
    canonical_url = urllib.parse.urljoin("https://www.reddit.com", permalink)
    return {
        "order": int(index_entry["order"]),
        "section": index_entry["section"],
        "index_title": index_entry["index_title"],
        "title": data.get("title") or index_entry["index_title"],
        "post_id": data.get("id") or index_entry["post_id"],
        "reddit_author": data.get("author"),
        "created_utc": created_iso,
        "url": canonical_url,
        "selftext": selftext,
    }


def slugify(value: str, fallback: str) -> str:
    value = value.casefold().encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value[:80] or fallback


def write_json(stories: list[dict[str, Any]], master: dict[str, Any]) -> None:
    ARCHIVE_JSON.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "archive": {
            "title": "Warhammer 40,000 Lore — Personal Fiction Archive",
            "author": "Mrcalzon02 / Christopher Vardeman",
            "author_notice": AUTHOR_NOTICE,
            "master_index": MASTER_URL,
            "master_index_title": master.get("title"),
            "source_post_count": len(stories),
            "generated_utc": dt.datetime.now(tz=dt.timezone.utc).isoformat().replace("+00:00", "Z"),
            "source_policy": "The Reddit MASTER ARCHIVE INDEX controls story inclusion and order; story selftext is preserved verbatim.",
            "third_party_notice": WARHAMMER_NOTE,
            "main_page_terms": MAIN_PAGE_LEGAL,
        },
        "stories": stories,
    }
    ARCHIVE_JSON.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def html_page(stories: list[dict[str, Any]]) -> str:
    grouped: dict[str, list[dict[str, Any]]] = {}
    for story in stories:
        grouped.setdefault(story["section"], []).append(story)

    toc_parts: list[str] = []
    story_parts: list[str] = []
    for section, section_stories in grouped.items():
        toc_parts.append(f'<section class="toc-group"><h3>{html.escape(section)}</h3><ol start="{section_stories[0]["order"]}">')
        for story in section_stories:
            anchor = f"story-{story['order']:03d}-{slugify(story['title'], story['post_id'])}"
            story["anchor"] = anchor
            toc_parts.append(
                f'<li value="{story["order"]}"><a href="#{anchor}">{html.escape(story["title"])}</a></li>'
            )
        toc_parts.append("</ol></section>")

    for story in stories:
        created = ""
        if story.get("created_utc"):
            created = story["created_utc"][:10]
        meta_bits = [f'Archive #{story["order"]}', html.escape(story["section"])]
        if created:
            meta_bits.append(created)
        meta = " · ".join(meta_bits)
        source_url = html.escape(story["url"], quote=True)
        body = html.escape(story["selftext"])
        story_parts.append(
            f'''<article class="story" id="{story["anchor"]}" data-story-title="{html.escape(story["title"], quote=True)}" data-story-section="{html.escape(story["section"], quote=True)}">
<header class="story-header">
<p class="story-meta">{meta}</p>
<h2>{html.escape(story["title"])}</h2>
<p class="byline">By Mrcalzon02 / Christopher Vardeman · <a href="{source_url}" target="_blank" rel="noopener noreferrer">Original Reddit post</a></p>
</header>
<pre class="story-text">{body}</pre>
<p class="story-return"><a href="#archive-top">Return to Lore index</a></p>
</article>'''
        )

    legal_html = "".join(
        f"<p>{html.escape(paragraph)}</p>"
        for paragraph in MAIN_PAGE_LEGAL.split("\n\n")
        if paragraph.strip()
    )

    return f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Warhammer 40,000 Lore Archive | Calzon’s TTRPG Foundry</title>
<meta name="description" content="Personal Warhammer 40,000 fan-fiction archive by Mrcalzon02 / Christopher Vardeman, migrated from r/EmperorProtects.">
<link rel="canonical" href="https://mrcalzon02.github.io/HB-TTRPG-tools/warhammer-40k-lore.html">
<style>
:root{{--bg:#090b0c;--panel:#121719;--panel2:#171d20;--ink:#e7e2cf;--muted:#aaa58f;--gold:#c9aa61;--line:#4f4a38;--red:#8f3434;--link:#e0c278;}}
*{{box-sizing:border-box}}html{{scroll-behavior:smooth}}body{{margin:0;background:radial-gradient(circle at top,#202526 0,#0d1011 38rem,#080a0b 100%);color:var(--ink);font-family:Georgia,'Times New Roman',serif;line-height:1.6}}
a{{color:var(--link)}}a:hover{{text-decoration-thickness:2px}}.shell{{max-width:1500px;margin:0 auto;padding:24px}}.archive-header{{border:1px solid var(--line);background:linear-gradient(180deg,rgba(34,39,40,.98),rgba(16,20,21,.98));padding:28px;box-shadow:0 12px 40px rgba(0,0,0,.38)}}.kicker{{margin:0;color:var(--gold);text-transform:uppercase;letter-spacing:.14em;font:700 12px/1.3 system-ui,sans-serif}}h1,h2,h3{{line-height:1.15}}h1{{margin:.35rem 0 .75rem;font-size:clamp(2rem,4vw,4rem);letter-spacing:.015em}}.notice{{border-left:4px solid var(--gold);padding:12px 16px;background:rgba(201,170,97,.08);font-size:1.05rem}}.third-party{{border-left-color:var(--red)}}.controls{{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;margin:22px 0}}.controls input{{width:100%;padding:13px 14px;border:1px solid var(--line);background:#0b0e0f;color:var(--ink);font:inherit}}.controls button{{padding:10px 16px;border:1px solid var(--gold);background:#171b1c;color:var(--ink);cursor:pointer}}.layout{{display:grid;grid-template-columns:minmax(260px,360px) minmax(0,1fr);gap:24px;align-items:start}}.toc{{position:sticky;top:12px;max-height:calc(100vh - 24px);overflow:auto;border:1px solid var(--line);background:rgba(14,18,19,.97);padding:18px}}.toc h2{{margin-top:0}}.toc-group{{padding-top:8px;border-top:1px solid rgba(201,170,97,.18)}}.toc-group h3{{font-size:.92rem;color:var(--gold)}}.toc ol{{padding-left:1.7rem}}.toc li{{margin:.35rem 0;color:var(--muted)}}.stories{{min-width:0}}.story{{scroll-margin-top:16px;border:1px solid var(--line);background:var(--panel);margin:0 0 26px;padding:clamp(18px,3vw,34px);box-shadow:0 8px 26px rgba(0,0,0,.24)}}.story-header{{border-bottom:1px solid rgba(201,170,97,.25);margin-bottom:22px;padding-bottom:15px}}.story-meta,.byline,.story-return{{font-family:system-ui,sans-serif;color:var(--muted);font-size:.88rem}}.story-header h2{{margin:.35rem 0;font-size:clamp(1.55rem,3vw,2.45rem)}}.story-text{{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;line-height:1.72;color:var(--ink)}}.story[hidden]{{display:none}}.legal{{margin-top:30px;border:1px solid var(--line);background:var(--panel2);padding:24px}}.legal summary{{cursor:pointer;color:var(--gold);font-weight:700}}.legal-body{{max-width:1000px}}.archive-footer{{padding:24px 0;color:var(--muted);font-family:system-ui,sans-serif;font-size:.9rem}}
@media(max-width:900px){{.layout{{grid-template-columns:1fr}}.toc{{position:relative;top:auto;max-height:none}}.controls{{grid-template-columns:1fr}}}}
@media print{{body{{background:white;color:black}}.toc,.controls,.story-return,.archive-footer{{display:none}}.story{{break-before:page;border:0;box-shadow:none;background:white}}a{{color:black}}}}
</style>
</head>
<body>
<main class="shell" id="archive-top">
<header class="archive-header">
<p class="kicker">☠ Cafarron Corridor · Personal Fiction Archive</p>
<h1>Lore</h1>
<p class="notice"><strong>Author’s Archive Notice.</strong> {html.escape(AUTHOR_NOTICE)}</p>
<p class="notice third-party"><strong>Third-Party IP Notice.</strong> {html.escape(WARHAMMER_NOTE)}</p>
<p>This archive contains <strong>{len(stories)} stories</strong> in the order established by the <a href="{html.escape(MASTER_URL, quote=True)}" target="_blank" rel="noopener noreferrer">r/EmperorProtects MASTER ARCHIVE INDEX</a>. Story text is preserved from the source posts; comments and unrelated Reddit material are not copied.</p>
<div class="controls"><input id="lore-search" type="search" placeholder="Search story titles, chronology groups, or story text…" autocomplete="off"><button id="clear-search" type="button">Clear search</button></div>
</header>
<div class="layout">
<nav class="toc" aria-label="Lore story index"><h2>Story Index</h2>{''.join(toc_parts)}</nav>
<section class="stories" id="stories">{''.join(story_parts)}</section>
</div>
<details class="legal" open>
<summary>Main-page legal disclaimer</summary>
<div class="legal-body">{legal_html}</div>
</details>
<footer class="archive-footer">Personal fan-fiction archive · Mrcalzon02 / Christopher Vardeman · Source ordering: r/EmperorProtects MASTER ARCHIVE INDEX.</footer>
</main>
<script>
(() => {{
  const input = document.getElementById('lore-search');
  const clear = document.getElementById('clear-search');
  const stories = [...document.querySelectorAll('.story')];
  const links = [...document.querySelectorAll('.toc a[href^="#story-"]')];
  function apply() {{
    const q = (input.value || '').trim().toLowerCase();
    const visible = new Set();
    for (const story of stories) {{
      const haystack = (story.dataset.storyTitle + ' ' + story.dataset.storySection + ' ' + story.textContent).toLowerCase();
      const show = !q || haystack.includes(q);
      story.hidden = !show;
      if (show) visible.add('#' + story.id);
    }}
    for (const link of links) link.parentElement.hidden = !visible.has(link.getAttribute('href'));
  }}
  input.addEventListener('input', apply);
  clear.addEventListener('click', () => {{ input.value = ''; apply(); input.focus(); }});
}})();
</script>
</body>
</html>'''


def patch_workspace() -> bool:
    text = WORKSPACE_JS.read_text(encoding="utf-8")
    if "function buildLorePanel()" in text:
        print("Warhammer workspace Lore integration already present; leaving it unchanged.")
        return False

    replacements = [
        (
            "const registerNames={archive:'☠ Administratum Index',map:'⌖ Navis Cartographica',seals:'⚜ Archivum Seals'}",
            "const registerNames={archive:'☠ Administratum Index',map:'⌖ Navis Cartographica',seals:'⚜ Archivum Seals',lore:'✠ Lore'}",
        ),
        (
            "state.activeTab==='seals'?'Archivum ordinances unsealed':'Administratum query channels open'",
            "state.activeTab==='seals'?'Archivum ordinances unsealed':state.activeTab==='lore'?'Personal fiction archive unsealed':'Administratum query channels open'",
        ),
        (
            "[['archive','☠ Administratum Index'],['map','⌖ Navis Cartographica'],['seals','⚜ Archivum Seals']]",
            "[['archive','☠ Administratum Index'],['map','⌖ Navis Cartographica'],['seals','⚜ Archivum Seals'],['lore','✠ Lore']]",
        ),
        (
            "const archivePanel=state.ui.archivePanel(),mapPanel=buildMapPanel(),sealsPanel=state.ui.sealsPanel();shell.append(hero,archivePanel,mapPanel,sealsPanel);",
            "const archivePanel=state.ui.archivePanel(),mapPanel=buildMapPanel(),sealsPanel=state.ui.sealsPanel(),lorePanel=buildLorePanel();shell.append(hero,archivePanel,mapPanel,sealsPanel,lorePanel);",
        ),
    ]
    for needle, replacement in replacements:
        count = text.count(needle)
        if count != 1:
            raise RuntimeError(f"Workspace patch guard failed; expected exactly one occurrence, found {count}: {needle[:100]}")
        text = text.replace(needle, replacement, 1)

    marker = "function setActiveTab(tab){"
    if text.count(marker) != 1:
        raise RuntimeError("Could not locate setActiveTab insertion point")
    lore_function = """function buildLorePanel(){const{el}=state.ui,panel=el('section','wh-lore-panel');panel.dataset.panel='lore';panel.hidden=true;const intro=el('div','wh-lore-register-heading');intro.append(el('p','wh-kicker','✠ Personal Fiction Archive'),el('h2','','Lore'),el('p','','All indexed fiction by Mrcalzon02 / Christopher Vardeman is preserved in a dedicated reader below. The source order follows the r/EmperorProtects MASTER ARCHIVE INDEX.'));const frame=document.createElement('iframe');frame.className='wh-lore-frame';frame.src='warhammer-40k-lore.html';frame.title='Warhammer 40,000 Lore — personal fiction archive by Mrcalzon02 / Christopher Vardeman';frame.loading='lazy';panel.append(intro,frame);return panel;}"""
    text = text.replace(marker, lore_function + marker, 1)

    # The workspace stylesheet receives new Lore-frame rules in the same migration,
    # so bump its cache key exactly once.
    text = re.sub(r"warhammer-40k-workspace-v8\.css\?v=(\d+)", lambda m: f"warhammer-40k-workspace-v8.css?v={int(m.group(1))+1}", text, count=1)
    WORKSPACE_JS.write_text(text, encoding="utf-8")
    return True


def patch_css() -> None:
    css = WORKSPACE_CSS.read_text(encoding="utf-8")
    marker = "/* Reddit Lore archive integration */"
    if marker in css:
        return
    css += """

/* Reddit Lore archive integration */
.wh-lore-panel{padding:0;min-width:0}.wh-lore-register-heading{margin:0 0 14px;padding:18px 20px;border:1px solid rgba(215,179,95,.32);background:rgba(11,15,16,.88)}.wh-lore-register-heading h2{margin:.2rem 0 .45rem}.wh-lore-register-heading p:last-child{margin-bottom:0}.wh-lore-frame{display:block;width:100%;min-height:82vh;height:calc(100vh - 230px);border:1px solid rgba(215,179,95,.36);background:#090b0c}.wh-lore-panel[hidden]{display:none!important}@media(max-width:800px){.wh-lore-frame{height:78vh;min-height:620px}}
"""
    WORKSPACE_CSS.write_text(css, encoding="utf-8")


def patch_view_mount_cache() -> None:
    text = VIEW_MOUNTS_JS.read_text(encoding="utf-8")
    pattern = re.compile(r"warhammer-40k-workspace-v8\.js\?v=(\d+)")
    match = pattern.search(text)
    if not match:
        raise RuntimeError("Could not locate Warhammer workspace cache key in app-lite-view-mounts.js")
    new_version = int(match.group(1)) + 1
    text = pattern.sub(f"warhammer-40k-workspace-v8.js?v={new_version}", text, count=1)
    VIEW_MOUNTS_JS.write_text(text, encoding="utf-8")


def main() -> int:
    print(f"Fetching master archive index: {MASTER_URL}")
    master = post_data(get_json(MASTER_URL))
    master_selftext = master.get("selftext") or ""
    index_entries = parse_master_index(master_selftext)
    print(f"Master index yielded {len(index_entries)} unique story links")
    if len(index_entries) < EXPECTED_MINIMUM_STORIES:
        raise RuntimeError(
            f"Refusing a partial migration: expected at least {EXPECTED_MINIMUM_STORIES} indexed stories, found {len(index_entries)}"
        )

    stories: list[dict[str, Any]] = []
    for position, entry in enumerate(index_entries, start=1):
        print(f"[{position:02d}/{len(index_entries):02d}] {entry['index_title']}")
        story = fetch_story(entry)
        stories.append(story)
        # Be polite to the unauthenticated public endpoint and reduce burst rate.
        time.sleep(0.65)

    # The index order is authoritative. Fail closed on duplicates or missing bodies.
    ids = [story["post_id"] for story in stories]
    if len(ids) != len(set(ids)):
        raise RuntimeError("Duplicate Reddit post IDs detected; refusing to generate an ambiguous archive")
    if any(not story["selftext"].strip() for story in stories):
        raise RuntimeError("One or more stories have empty bodies; refusing partial output")

    write_json(stories, master)
    ARCHIVE_HTML.write_text(html_page(stories), encoding="utf-8")

    workspace_changed = patch_workspace()
    patch_css()
    if workspace_changed:
        patch_view_mount_cache()

    print(f"Generated {ARCHIVE_HTML.relative_to(ROOT)}")
    print(f"Generated {ARCHIVE_JSON.relative_to(ROOT)}")
    print(f"Archived {len(stories)} complete story bodies")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"MIGRATION FAILED: {exc}", file=sys.stderr)
        raise
