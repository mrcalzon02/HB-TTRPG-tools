# HB-TTRPG-tools benchmark baseline — November 13, 2026

**Benchmark identifier:** `hb-tools-2026.11.13-b0`  
**Record type:** audited source checkpoint, **not** a GitHub Release or a certified binary  
**Audited source branch:** `main`  
**Audited source commit (immutable):** `8652961f4e7eaaed97f8e3f8f7eafcdc9d936a02`  
**Audit date:** 2026-11-13 (Alaska)  
**Disposition:** **BASELINE RECORDED / FULL-PLATFORM RELEASE VERIFICATION INCOMPLETE**  
**Scope:** this repository's static site, integrated software catalog, bundled downloads, modules-workbench wiring, release/deployment infrastructure. Separately maintained game/mod repositories are *catalogued*, not benchmarked as part of this source snapshot.

This document pins the **pre-audit** source revision. Its own documentation-only commit necessarily makes `main` advance; do not mistake that follow-up commit for a new application build or verified deployment. No existing tag is moved, no release created, and no CI workflow reconfigured by this audit.

## Evidence inventory

| Component or gate | Source/evidence checked | Observed result | Confidence / limit |
| --- | --- | --- | --- |
| Source baseline | GitHub `main` branch API | `8652961f4e7eaaed97f8e3f8f7eafcdc9d936a02` | Exact source SHA verified twice before audit write |
| Existing packaged release | [Simple Sound Manager 0.10.1](https://github.com/mrcalzon02/HB-TTRPG-tools/releases/tag/simple-sound-manager-v0.10.1), [Windows release workflow #42960729283](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/42960729283) | Published November 11 UTC; successful build, artifact verification, publication; Setup EXE, Windows ZIP, source ZIP, SHA256SUMS.txt present | CI steps successful; manual installation, extended load, and antivirus rescan not verified |
| GitHub Image Gallery | `tools/github-image-gallery/`, `software/github-image-gallery/GitHub-Image-Gallery-v0.1.0.zip` | v0.1.0 extension source, Manifest V3, offline browser smoke-test script and ZIP of 28,016 bytes exist | Archive/source presence checked, not test execution, browser install or signature |
| LANBridge | `software/lanbridge/` | v0.2 Windows/Linux source ZIP of 36,535 bytes and security/setup README exist; linked from `software.html` | Package presence checked; Windows background-service and SMB integration not freshly validated |
| Work Shift Guide | `software/work-shift-guide/` | Blank v1.0.0 ZIP of 95,347 bytes, standalone page, scripts, service worker, checksum files exist | Presence only; offline/browser validation not freshly executed |
| Software catalog | `software.html`, `software-catalog-data.js`, `software-catalog.js`, `software-catalog.css` | 15 original repositories registered; carousel, download, release pagination and activity-feed hooks visible; cross-page showcase links present | Static source-contract inspection only, not live GitHub API/browser acceptance |
| Modules workbench | `index.html`, `app-lite-view-mounts.js`, `module-map-generator-entry.js` | New `module-workbench-root` implementation with generator/editor/viewer shell and lazy-load dependencies exists | Runtime not launched; older tests still assert obsolete literal mounts and should be reconciled |
| Pages deployment | [Last observed successful Pages build #42728030283](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/42728030283) | Successful `pages build and deployment` at `a5751740db41dc991390e81e0f2a15daa27d69d2`, November 10 UTC | **Not** a successful deployment/test of the audited source SHA |
| Exact-SHA validation | GitHub checks at audited commit | No check runs and no combined status entries returned for `8652961` | This is *no evidence*, not a passing or failing application runtime test |
| Local worker | [Prior worker run #42727519669](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/42727519669) | Historical `Test selected local-worker capabilities` step failed; its workflow file was later removed | Do not claim the worker is currently release-validated from that run |

### Source-versus-deployment delta

The GitHub compare endpoint reports **64 commits ahead** from the last visible successful Pages build's source SHA `a575174` to audited `8652961`, with **45 changed file paths** in the compare response. These include the new GitHub Image Gallery extension files, Sound Manager waveform/packaging source and UI, and updated documentation and creative archive material. Separately, audited HEAD is **28 commits ahead** of the successful Sound Manager release's source commit `5543e8e`. This is not a claim that all intervening changes affect the public homepage.

Current `.github/workflows/pages.yml` declares **`workflow_dispatch` only**. It contains EXO/Barotrauma validation steps, but does not run the repository's `tests/site-*.test.js` and `tests/modules-spatial-interface.test.js` files as a general full-site acceptance suite. The existing `docs/deployment.md` text still says push-to-main deploys and describes a broader integrated P0/Playwright sequence that is **not present in the inspected workflow**. Keep manual-dispatch policy; update the document and test matrix, not an automatic trigger, during the next development round.

**Known deterministic regression-test contract mismatch:** `tests/modules-spatial-interface.test.js` requires `module-map-generator-entry.js` to contain the old literal `document.getElementById('module-spatial-generator-root')`. The audited entrypoint instead installs the current `module-workbench-root` shell with a `module-generator-root` mount. This mismatch predicts a test assertion failure, **not** proof the runtime itself fails. Fix/rebase the test to the actual supported module UI and run it before declaring test success.

**Release API caveat:** `/releases/latest` currently points at Barotrauma Desktop 0.2.0 (August), although Sound Manager 0.10.1 was published in November. This is consistent with `docs/independent-tool-releases.md`, which reserves the repository-wide latest pointer for legacy Barotrauma downloads and requires per-product release queries. It is **not** evidence of a missing November release or reason to retag.

## Release readiness and acceptance

- **Source checkpoint: PASS.** Existing code and distributed files pinned to an immutable audited commit; no force push, tag movement, or runtime change.
- **Existing Sound Manager 0.10.1 release pipeline: PASS within reported CI scope.** Preserve its four published assets and checksums.
- **Full HB tools platform browser/build/launch acceptance at audited SHA: UNVERIFIED.** No current-SHA browser proof or successful deployment was retrieved or executed; the public site URL could not be independently loaded in this audit environment.
- **Static source wiring: OBSERVED.** The 15-project catalog, UI controls, script dependencies and site links were checked in repository source. This is *not* a substitute for running Node/browser tests.
- **Diagnostics before next round:** align obsolete modules tests; reconcile deployment documentation with manual dispatch; provide a consolidated site acceptance command/record; investigate any proven runtime failures rather than treating styling or balance diagnostics as release blockers.

**Release policy:** Only demonstrated build/launch/run failures and required multiplayer/updater failures are release-blocking. Missing or stale *diagnostic* evidence must be stated truthfully but must not be disguised as a confirmed application failure. Conversely, absence of failed checks is not proof of success.

## Next actions (manual, non-destructive)

1. Use this exact audited source SHA as the reference for comparisons in the next development round. Keep all work on `main`, without force-pushing.
2. Bring modules regression expectations into alignment with the current workbench, and run the relevant Node suites. Preserve actual output, return codes and source SHA.
3. Manually dispatch the Pages verification workflow on the intended checkpoint commit, or use an authorized local runner; record exact-SHA results and genuine browser checks for homepage, Modules, Software catalog, downloads and key mobile routes. Do not fabricate screenshots or deployment status.
4. If the actual release gate passes, publish a **separate, uniquely named benchmark GitHub Release** with truthful notes, source revision, manifest/checksums and any **actually built** assets. Publish draft-first and verify uploaded assets; preserve existing product-specific tags and repository-wide latest semantics. No benchmark GitHub Release has been created by this audit.

## Readback links

- [Audited source commit](https://github.com/mrcalzon02/HB-TTRPG-tools/commit/8652961f4e7eaaed97f8e3f8f7eafcdc9d936a02)
- [Simple Sound Manager release](https://github.com/mrcalzon02/HB-TTRPG-tools/releases/tag/simple-sound-manager-v0.10.1)
- [Last observed Pages deployment](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/42728030283)
- [Software hub source](https://github.com/mrcalzon02/HB-TTRPG-tools/blob/8652961f4e7eaaed97f8e3f8f7eafcdc9d936a02/software.html)
