# Calzon's Foundry — Site Architecture and Organization Master Plan
**Status:** proposal / planning baseline; no interface migration or rebrand authorized  
**Date:** 2026-10-20  
**Repository:** `mrcalzon02/HB-TTRPG-tools`  
**Scope:** public-facing information architecture, catalog, search, navigation, page hierarchy, shell consistency, accessibility, migration safety, and verification.  
**Excluded from this plan's execution:** UI edits, page moves, redirect creation, visual mockups, final screen-by-screen user-flow ordering, functional tool rewrites, repository renaming, and unilateral licensing changes.

## 1. Objective and design constraints

The existing Foundry has grown beyond tabletop RPG utilities into software projects, independently versioned games and mods, experiments, scientific simulations, cryptography research, fiction, campaign worlds, downloadable resources, and developer-facing capabilities. The current TTRPG brand and menu structure no longer accurately describe the whole.

**Working public brand:** "Calzon's Foundry" (not yet approved). Keep the current repository and GitHub Pages URL unless a separate migration is explicitly approved. "Projects" is the preferred cross-category directory label, not necessarily the site's formal brand.

**Goals:**
1. Make purpose and function immediately discoverable without enormous descriptive cards, repeated section headings, or tab sprawl.
2. Preserve all working applications and deep links, including in-page views, hash routes, and query-param entrypoints.
3. Separate **what an item is** (tool, game, research, setting, fiction, reference) from **where it is discovered** and **whether it has been verified**.
4. Supply one compact, shared navigation vocabulary and one authoritative site catalog, without forcing all pages to adopt the same aesthetics.
5. Keep the site static-host compatible and maintainable by incremental, auditable patches; avoid framework replatforming and GitHub Actions by default.
6. Make source releases, downloadable binaries, experimental status, and project state explicit and evidence-based.
7. Retain original identity for diegetic destinations such as Blacklight corporate interfaces and the Warhammer 40K archive.

## 2. Audit evidence and limitations

GitHub default-branch inventory inspected on 2026-10-20:

| Observation | Count / location | Meaning |
| --- | --- | --- |
| Root directory entries | 933 | Files and subdirectories at repository root only |
| Root `.html` files | 145 | Not 145 independent applications |
| Root `.js` files | 631 | Many page-specific runtimes |
| Root `.css` files | 116 | Many local/theme stylesheets |
| `index.html` top navigation | 14 controls in inspected file | Includes both links and in-page view buttons |
| `index.html` declared `.view` sections | 6 | Additional sections injected at runtime |
| `index.html` initial menu cards | 17 | Additional cards are injected at runtime |
| `search-index.json` | 50 records, 33 distinct `.html` paths | Search misses many dedicated pages |
| `site-map.html` | 42 distinct direct `.html` links | A curated site directory, not an exhaustive page inventory |
| HTML pages not directly named in search-index records | 112 | **Does not establish orphaning**; pages may be linked by specialized viewers |
| Dynamic home-view code | `app-lite-view-mounts.js` | Adds Scientific Tools and Warhammer navigation/sections and lazy-loads workspaces |
| Search runtime | `foundry-search.js` | Loads index JSON and adds built-in generator entries |
| Public-facing licensing/terms | `index.html` footer | TTRPG-specific language requires a separate legal/editorial review before a broader site rewrite |

Additional content areas identified: 64 root HTML pages with the `blacklight` prefix, 20 with `binary-cube`, 7 with `cubechat`, 4 with `warhammer`, and 24 root file names matching laboratory/simulation terminology (overlapping counts). Directory inventory is incomplete until nested routes, scripts, data registries, external entrypoints and intentionally hidden pages are classified.

**Known constraints:** some workspace links use `index.html?view=...`, `index.html?view=...&generator=...`, `index.html#...`, and application-specific hash routes. A visual-only site shell replacement that ignores these will break working features. Legacy static pages and dedicated laboratory pages must also preserve their own initialization and relevant keyboard controls.

## 3. Top-level information architecture (provisional)

A maximum of six primary content areas, plus a persistent global search control:

| Primary area | Canonical job | Representative contents |
| --- | --- | --- |
| **Home** | A concise entry to the Foundry, not an all-features dashboard | Identity, major destinations, featured active work, a restrained recent-updates strip |
| **Projects** | Authored applications, games, mods, software projects, repositories and their builds | Original GitHub projects, Beckenburg development, desktop software, CubeChat software, release/build listings |
| **Tools** | Items users can actually operate to achieve a task | Character sheets, tabletop toolkit, generators, module viewers, editors, planners, roleplay support and utility apps |
| **Worlds & Stories** | Settings, campaigns, fictional systems, lore, fiction, and readers | Blacklight, Kaysender, Solanum Umbra, Shadowrun, World of Darkness, Barotrauma fiction/campaign, Warhammer archive, Nowhere King, Beneath Dappled Oaks |
| **Laboratory** | Experiments, simulations and technical research interfaces | Signals, audio, gravity, double slit, interstellar media collisions, Binary Cube trials, cryptography/security explorations |
| **Library** | Documentation, reference archives, reference materials and recovery/setup resources | Low-power setup archive, acquisition library, SS13/SS14 conversion documentation, developer/API guides, static manuals and source references |

**Search** is global functionality, not another competing content silo. **Downloads** is a cross-cutting filter/view within Projects and Library, with contextual download links on project records. **Machine / AI Access** should have a reliable, direct developer link and existing authoritative capability endpoints; it need not consume a permanent primary-content tab.

The precise labels are open to later approval and mockup work. No extra primary navigation tabs for an individual campaign, game or laboratory. Such destinations remain directly linked from their category and retain bookmarkable URLs.

## 4. Classification and content ownership

Every page, tool, project and supporting collection should receive exactly one **canonical collection** in the catalog. It may have multiple tags, relationships and contextual entrypoints. Do not duplicate the complete content or maintain divergent metadata copies.

**Item kinds:** `landing`, `software-project`, `working-tool`, `interactive-laboratory`, `fictional-setting`, `story-reader`, `reference`, `download`, `technical-doc`, `legacy-entrypoint`, `internal-test`.

**Publication states:** `published`, `experimental`, `in-development`, `archived`, `internal`. These are not substitutes for runtime tests. Add separate evidence-backed **runtime statuses** `verified`, `unverified`, `known-broken`, and `not-applicable` with a last-checked timestamp and a test reference when applicable. Never infer "playable" from the existence of a project repository or recent commit.

**Canonical/related examples:**
- CubeChat's product/project overview belongs to **Projects**; Binary Cube experimental laboratories belong to **Laboratory**; the respective records cross-link.
- Kaysender's setting and wiki belong to **Worlds & Stories**; its NPC, potion, crafting and airship editors/generators are independently discoverable under **Tools**. One instance of each tool remains authoritative.
- Beckenburg's project, source, and builds belong to **Projects**, with world design and ghosts referenced from related planning/setting records, rather than duplicated public game pages.
- Blacklight's narrative universe and original system belong to **Worlds & Stories**; its corporate pages remain an intentional in-world experience, with a restrained way back to the Foundry.
- Warhammer 40K map, lore and archive pages belong to **Worlds & Stories**, while their original immersive reader/map presentation remains intact.
- Scientific laboratory pages retain their dedicated page identity and scientific controls; hypothesis-oriented or experimental models must remain labeled as such, not conflated with established simulation fidelity.
- Low-power systems, reinstall sources, migration and SS13/SS14 conversion guides belong to **Library**, not the homepage's primary menu.
- The current `other-projects.html` is a useful initial repository directory, not a mandate to preserve a redundant primary-level "Other" hierarchy after Projects is established.

## 5. Directory behavior and page responsibilities

### Home
A small introductory identity, a compact set of destination links, global search, and perhaps one factual "recent updates" area. Do not display every tool or repeat card descriptions as a storefront. Do not auto-initialize heavy simulators or campaign runtimes.

### Projects
A dense, searchable list of authored software, games, mods and experimental programs, with filters for type/platform/status/releases. Each record shows title, one-sentence purpose, repository, project state with source/provenance, last commit/push, latest published release, prerelease/stable distinction and valid download links where they exist. Distinguish repositories authored by the owner from actual GitHub forks; explicitly exclude identified derived/fork copies. Preserve the current externally linked `other-projects.html` address.

### Tools
Task-oriented filters: generators, editors, character sheets, tables/trackers, module mapping/viewing, creation tools, utilities. Cards/lists should answer "what can I do?" rather than describe a framework twice. Launch the functional tool directly; documentation should be a secondary link. Preserve working save/import/export/local data flows.

### Worlds & Stories
Browse by universe/setting and by medium (setting reference, system rules, GM/reader tool, fiction, chapter reader). A universe has one canonical overview; within it, show relevant readers, linked tools and lore resources. Chapter readers must preserve direct chapter links, continuous reading, index navigation and downloads. Protect deliberate in-universe aesthetics.

### Laboratory
Browse by discipline/experiment, with compact identification of simulation, hypothesis layer, parameters and observables. Every major active experiment gets a dedicated full page; do not regress back to a floating modal over the general science view. Experimental runtimes should not be launched merely to populate the Lab directory.

### Library
A searchable reference and downloads index: documentation, archives, setup/reinstall resources, integration guides, AI-access material, and recovery material. Keep repository/binary/license provenance with individual records; do not turn it into a second copy of Projects.

## 6. Navigation system and shared UI conventions

1. Build one compact shared navigation vocabulary: primary destinations, global search, contextual breadcrumbs, back-to-Foundry access and status/help affordances.
2. Use a small set of genuine page patterns: `directory`, `workspace`, `reader`, `experiment`, `project-detail`, `immersive-theme`. Pattern selection depends on interaction requirements, not aesthetic novelty.
3. Use lists and tables for high-density directories; use small cards only where visual previews materially aid recognition. Avoid long introductory sections, obvious button explanations, duplicate titles and repeated "Open" actions.
4. Maintain direct, stable URLs; simple navigation must work as normal links. Tabs within applications are allowed for true in-place modes, but should not be used to hide an entire site.
5. Offer visible focus indicators, proper heading hierarchy, input labels, keyboard/arrow handling where appropriate, descriptive link text and live status feedback for genuinely asynchronous operations.
6. Respect mobile narrow viewports and real desktop layouts. On mobile, collapse navigation without concealing the main entry points; avoid horizontally exploding nested tab systems.
7. Avoid large decorative banners, elaborate visual chrome and global layout grids that reduce available working space.
8. Preserve custom styles in in-universe/immersive experiences; shared shell elements should remain unobtrusive and must not trample story-specific media, audio or canvas controls.
9. Ensure core navigation, page content and fallback links remain useful even if JavaScript search/release API calls fail.
10. Standardize project status and wording: `Repository`, `Latest release`, `Prerelease`, `Download`, `Documentation`, `Launch tool`, `Open reader`. Never label a design plan as a downloadable application.

## 7. Catalog and metadata contract

Define a versioned static manifest such as `data/site-catalog.json`, initially generated through an explicit inventory step and reviewed. Suggested entry schema:

```json
{
  "id": "gravitational-simulation-laboratory",
  "title": "Gravitational Simulation Laboratory",
  "kind": "interactive-laboratory",
  "canonicalCollection": "laboratory",
  "url": "gravitational-simulation-laboratory.html",
  "keywords": ["gravity", "simulation", "curvature"],
  "relatedIds": ["scientific-tools"],
  "publicationState": "experimental",
  "runtimeStatus": "unverified",
  "source": "github",
  "searchable": true,
  "listed": true
}
```

Add optional data for description, platform, technology, parent collection, version, repository owner/name, expected release type, proof/verification status, documentation path, historical URL aliases and content visibility. Maintain stable IDs even if display titles change.

**One canonical record per resource**, not one record per cross-listing. Derived category views, the search dataset and the human-readable sitemap should use the same catalog. XML sitemap should be generated or validated against eligible canonical public pages. The "site catalog" must not itself grant permission to call AI capabilities; existing `.well-known/ai-capabilities.json` and API contracts remain independent authoritative machine capability data.

**Project/release metadata:** public GitHub requests can enrich repo records after the static page loads, with a verified snapshot and honest last-checked timestamp for failures. Correctly filter `fork=true`, exclude disallowed fork copies, ignore draft releases, sort by published time, distinguish prereleases, and avoid `/releases/latest` as an alleged exact latest when only prereleases exist. API rate-limits or offline use must not make the directory blank.

## 8. Routing, URL compatibility and architectural boundaries

No route renaming on day one. Preserve all existing root-level HTML paths and externally shared anchors.

Map every public entrypoint, including:
- `index.html?view=utilities`, `?view=generators`, `?view=modules`, `?view=kaysender` and related query combinations;
- `index.html#<workspace>` and `index.html?view=...&generator=...`;
- Warhammer 40K direct map and archive links;
- scientific-lab page and fragment links;
- Blacklight and fiction reader chapter/deep links;
- internal tool launch, export/download and authenticated-looking in-fiction UI paths.

Start with **compatibility adapters or stable links** rather than destructive moves. Only after evidence proves parity may a legacy entrypoint become a documented redirect to a dedicated page. Never silently redirect to a generic homepage when a specific tool was requested.

Retain the current framework-light static GitHub Pages delivery model. Proposed shared `site-shell.css` and `site-shell.js` may be introduced carefully, without bundling every feature or stripping page-specific scripts. Existing `app-lite.js`, `app-lite-view-mounts.js`, lazy-load promise boundaries, and localStorage workflows must be audited before any active-view migration. Runtime behavior for specialized module maps, scientific experiments, in-page readers, and settings-specific systems remains authoritative until explicitly replaced and tested.

No GitHub Actions dependency. Prefer local or CI-independent validators that can be run on demand and checked in with fixtures.

## 9. Inventory and migration record

Before redesign, create a machine-readable census of all navigable entrypoints (including nested HTML paths and dynamic runtime views), with these minimum fields:
- current URL and internal ID;
- title, current parent/menu grouping, type, canonical collection, topical tags;
- scripts/data/CSS used; performance and initialization dependencies;
- incoming links, query/hash variants, and storage/export expectations;
- runtime state (tested, untested, broken, intentionally internal);
- planned destination and whether physical move is needed (default: **no**);
- preservation/deprecation decision with evidence and owner approval.

Classify each route as **keep-in-place**, **reparent-only**, **add-shared-shell**, **compatibility-alias**, **archive-after-review**, or **remove-only-with-explicit-approval**. Not all 145 HTML files are meant to be in search; hidden or internal experiments may be deliberately excluded but must be accounted for and justified. Use the inventory to distinguish hidden-by-design from forgotten pages.

## 10. Implementation sequence (proposal; NOT AUTHORIZED FOR EXECUTION)

| Gate | Work package | Acceptance before advancing |
| --- | --- | --- |
| **P0: Baseline** | Audit every public HTML/view, route, category, link, dependency and current behavior; snapshot existing state | Complete catalog with no unexplained routes, proof of current navigation and critical app smoke results |
| **P1: Catalog** | Establish classifications, IDs, relationship data, search and sitemap metadata conventions | Validated manifest, duplicate/stale URL checks, no content edits |
| **P2: Shared foundations** | Introduce opt-in compact navigation/breadcrumb styles, accessible responsive shell and compatibility logic | New shell on one low-risk page, visual + keyboard + direct-link verification |
| **P3: Main directory pages** | Consolidate Home, Projects, Tools, Worlds & Stories, Laboratory and Library indexes | Every public catalog item findable through its category without initializing its app |
| **P4: Application migration** | Migrate legacy views gradually into dedicated locations or preserve stable mounts where superior | Each migrated tool works, old routes function, all generated/saved data survives |
| **P5: Specialized experiences** | Unify entry/exit affordances for Blacklight, Warhammer, full-screen labs and story readers without overwriting their themes | Rendering, scroll, audio, input, map, chapter and tool controls remain equivalent |
| **P6: Search/releases/docs** | Rebuild search/index/sitemap from authoritative catalog; consolidate download links and project metadata; update copy/README | Search completeness, release/fork correctness, canonical and documentation checks |
| **P7: Cleanup** | Remove only genuinely obsolete duplicated navigation/presentation code, with root-cause evidence | Link/reference regression, no accidental truncation or broken app initialization |
| **P8: Release verification** | Validate deployed GitHub Pages and representative journeys across devices/browser widths | Remote commit verification **and** actual deployed-render/runtime evidence |

Each gate needs an INTENT → EXECUTE → OBSERVE → VERIFY → CLAIM record. A GitHub commit alone does not prove a deployed website functions. Work incrementally on `main` with targeted edits, baseline SHA/size checks, no force-push, no extra branches by default, and no GitHub Actions.

## 11. Verification contract and risk controls

**Inventory and link integrity**
- All 145 baseline root HTML files plus relevant nested pages and dynamic views are classified, even if intentionally omitted from public search.
- Public canonical records have no duplicate IDs, duplicate canonical URLs or broken local paths.
- Internal links, external GitHub project/release links, href fragments, query-parameter deep links, redirects and old bookmarks are tested.
- Preserve files and direct URLs; avoid breaking filename capitalization or browser URL encodings.

**Functional parity**
- Tabletop character sheet/roller/trackers, generator selection, module viewer and spatial builder, Kaysender editors, Blacklight UI, Warhammer map/reader, Labs, stories/chapter navigation, CubeChat experimental tools, and downloadable files must each receive the relevant smoke test.
- Refresh, navigation and failure paths must not duplicate listeners, discard saved local data, or lose an active application panel.
- Render/use real graphical assets where present, not accidental fallback art or text-only placeholders.

**Quality**
- Check keyboard navigation, focus restoration after in-page interactions, screen-reader labels, headings, responsive behavior and visible error reporting.
- Verify on narrow mobile widths and desktop, including Firefox and Chromium.
- Benchmark first interaction and heavy-app lazy load against the current baseline; no unconditional loading of all 631 JavaScript files.
- Keep distinct experimental/scientific claims properly qualified, and avoid pretending an incomplete project is released.
- Maintain a manual live-site verification checklist because local tests and commit confirmation alone cannot certify GitHub Pages deployment.

**Special content protections**
- Never restructure lore by changing canonical story/setting facts.
- Preserve reader chapter order, download links, left chapter index and direct chapter navigation.
- Preserve in-world aesthetics and optional sounds; do not let a shared shell override immersive control layers.
- Review current TTRPG-specific site-wide terms, copyrights, redistribution statements and license references separately before changing them; the site rebrand is not a license change.
- Preserve AI capability discovery and security boundaries independently of human-friendly navigation.

## 12. Proposed governance after restructuring

The catalog becomes the durable index. A newly committed page or project must be classified, assigned a canonical home, linked to related records and documented with status evidence before it appears in public navigation. New GitHub releases may refresh dynamically; no arbitrary "latest" timestamp may be fabricated. When a page is archived, its URL and provenance stay documented instead of silently vanishing.

Require every category page to answer: **what is here, what can be launched, what can be read, and what can be downloaded?** If a control's label already answers its purpose, do not add an explanatory paragraph repeating it.

## 13. Decisions to make before mockups

Decisions deliberately left for the next design conversation:
1. Confirm the outward-facing name ("Calzon's Foundry" is a recommendation, not a final rename).
2. Confirm six-category terminology and whether Library should be called Archives & Reference.
3. Decide how prominently publication status and recently updated projects should appear on Home.
4. Decide which project/laboratory/workspace page is the first controlled migration pilot, after P0/P1 evidence.
5. Approve the eventual look and navigation behavior with mockups **after** the taxonomy and migration rules are agreed.

**No production UI changes are authorized by this plan.** Implementing any phase, renaming display branding, or designing mockups remains a separate requested action.
