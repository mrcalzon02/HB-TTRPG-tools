# Solanum Umbra — Benchmark B0 (2026-11-13)

**Classification:** Source-and-release-readiness audit; **NOT** a published game release or tested downloadable build.  
**Disposition:** **NO-GO** for the Solanum Umbra standalone Java game; **NO-GO** for a certified browser companion release until objective launch/validation failures are repaired.  
**Tracked release gates:** [HB-TTRPG-tools issue #22](https://github.com/mrcalzon02/HB-TTRPG-tools/issues/22).  
**Audit reference commit (before this document):** `mrcalzon02/HB-TTRPG-tools@8652961f4e7eaaed97f8e3f8f7eafcdc9d936a02` on `main`. A separate new documentation commit must not be mistaken for proof that this frozen source passed a test.

## What actually exists

- The original **Solanum Umbra native tabletop system** is represented by `SRC/Solanum-Umbra-TTRPG.pdf`. Source receipt records **248 pages**, **1,325,003 bytes**, and SHA-256 **`2f1d5d0df591b4d637e4845645370946568cb6aecc786a4bbef5411e4e82f9ff`**. These identity values come from the committed verified receipt; the digest was **not independently recomputed during this benchmark audit**.
- An HTML landing page `solanum-umbra.html`, main-page workspace link, UI entry script `solanum-umbra-entry.js`, and two dedicated Solanum validation scripts exist in the shared **HB-TTRPG-tools** repository.
- `data/solanum-umbra/wiki/wiki-index.json` declares schema **0.5.0** and **8 native wiki packs**. Source inspection found **36 entries**, **82 structured tables**, **36 named Synthesis enemy profiles**, and **99 related-entry references**.
- Native-system mechanics are preserved: character creation/derived statistics, five career talent families plus a Trader omission, backgrounds, profession advancement, cybernetics/biotics/degradation, crafting/resources, general equipment, combat/cover/vehicles, Fay generation, and Synthesis forces. Source ambiguities remain flagged rather than replaced with outside RPG mechanics.
- The proposed **Java 17/Swing PSX open-world exploration RPG with base construction** does **not** yet have a verified Solanum-specific standalone game repository, launcher, compiled binary, playable map, base-building simulation, save round-trip, or downloadable release within the connected GitHub repository inventory. A tabletop wiki is not a runnable open-world game.

## Benchmark checks actually performed

This audit inspected current GitHub source through authenticated file reads and ran independent *source-data structure* checks on the eight JSON packs in a JavaScript test harness. The existing repository Node scripts were **inspected but not executed**; no local complete checkout or verified live browser session was available.

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Eight pack files parse; 36 total entries; all entry IDs unique | **PASS — source structure** | Checked all eight pack JSON files against index and entry ID set |
| Entry provenance present and page ranges in 1–248 | **PASS — source structure** | No missing/invalid `sourceRefs` observed |
| 82 structured tables have matching row/column widths | **PASS — source structure** | No malformed table rows observed |
| Four Synthesis force families and 36 enemy profiles | **PASS — source structure** | Profile count in native enemy pack |
| HTML workspace link exists | **PASS — source structure** | Main page contains `data-view="solanum-umbra"` and call-to-action |
| Main page actually imports workspace JS | **FAIL — release/launch gate** | `index.html` does not include `<script src="solanum-umbra-entry.js"></script>`; the current UI validator requires it |
| Every pack matches the native-policy validator contract | **FAIL — test gate** | First pack uses `native-system-preserved-no-d20-conversion`, while current validator requires `native-system-preserved-no-external-conversion` for every pack |
| Related-entry targets resolve to entry IDs | **FAIL — diagnostic** | 2 of 99 links target missing Medic minor/major-talent entry IDs; actual talent tables are included in the career-talent entry |
| Dedicated Solanum tests invoked by Pages workflow | **NOT ESTABLISHED** | `.github/workflows/pages.yml` is manual-only and has no Solanum validation command, despite `docs/solanum-umbra-native-wiki.md` saying it does |
| Full Node validators, browser launch/search/navigation | **NOT EXECUTED** | Do not infer green CI or browser acceptance from static checks |
| Standalone Java 17 game build, boot, movement, construction, save/load | **NOT AVAILABLE** | No such Solanum game build was identified |

**Additional documentation drift:** `docs/solanum-umbra-source-staging.md` describes the PDF as absent and the wiki index as empty; both statements conflict with the current indexed files and source receipt. This is a documentation discrepancy, not a gameplay failure.

## Beckenburg upstream dependency — verified separately, not integrated

The design direction is to mature Project Beckenburg's Java 17 PSX game/editor infrastructure before using it in a Solanum-specific game. The connected GitHub inventory verifies Beckenburg, not a Solanum port:

- Upstream repository `mrcalzon02/The-Beckenburg-Project` head inspected at `2c5368adaac54ebe152fcaf951730fe7837fcde4` (2026-11-13).
- Published developer release [`beckenburg-v0.1.328`](https://github.com/mrcalzon02/The-Beckenburg-Project/releases/tag/beckenburg-v0.1.328) was built from `c64691e19ffe0ef5c727fa921071a66fcff9d298` and includes a **761,020,355-byte Windows EXE** plus **921,960-byte `LevelEditorKit-Java17.jar`** and checksums.
- GitHub Actions release build and associated multiplayer acceptance jobs for that release report success. This is **upstream CI acceptance**, not physical GPU/editor proof and not Solanum source/build validation.
- Beckenburg's `docs/development/LEVEL_EDITOR_OVERHAUL_AUDIT.md` still distinguishes current implementation from full WYSIWYG runtime parity, hierarchy/gizmos, deterministic general-scene export, and safe edit/playtest restoration. Do not announce the editor as ready for Solanum reuse until those gates are demonstrated.

## Release decision and next acceptance order

1. **Preserve B0** as an immutable-by-reference source audit. Do **not** mislabel this report as a shipped game, a passing Node suite, or a binary release.
2. Repair the two objective browser/source-test blockers: load the Solanum entry script from `index.html`, and reconcile the first-pack native-policy string with the validator **without converting the rules**.
3. Run `node --check solanum-umbra-entry.js`, `node scripts/validate-solanum-umbra-native-wiki.mjs`, `node scripts/validate-solanum-umbra-ui.mjs`, and `node scripts/validate-source-references.mjs` on one pinned checkout. Capture run ID, commit hash, console results and failures, rather than assuming source inspection equals test execution.
4. Serve the site via HTTP and exercise **Open Solanum Umbra**, `?view=solanum-umbra` direct navigation, JSON loading, search, category/filter navigation, entry selection, procedures, tables, enemy profiles, source pages and related links. Add a two-Medic-link fix and repair the staging documentation without blocking unrelated releases for editorial discrepancies.
5. When Beckenburg's portable editor reaches accepted runtime parity and serialization, create the **separate** Solanum Java game implementation. Its first executable benchmark requires launch, controlled movement in a real test scene, interaction, one constructed object with collision, save/reload, and an editor-to-runtime round trip. Only objective failures of these required functions are release blockers; subjective style and optional diagnostics are not.

**B0 verdict:** valuable native tabletop source and usable structured content exist, but neither a certified browser workspace nor a standalone Solanum game executable is presently proven. The benchmark is a documented, auditable **NO-GO**, not a failed promise of a release.
