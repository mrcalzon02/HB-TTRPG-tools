# Beckenburg — equipment-first production release gate

**Directive, 2026-10-18:** Finish the current equipment roster before approving new equipment concepts or expanding the 13-ghost roster. This is an **execution gate**, not a suggestion to redefine the planned equipment instead of finishing it.

**Canonical base:** [42-item equipment catalog](../../software/beckenburg/src/main/java/org/beckenburg/EquipmentRegistry.java), [126 tier-stage contract](EQUIPMENT_TIER_MATRIX.md), [13-ghost evidence matrix](GHOST_EVIDENCE_MATRIX.md), and [imported models and live hardware](OWNER_ASSET_EQUIPMENT_INTEGRATION.md).

Current remote-source ledger: **6 / 42** equipment families have some host-owned LAN operation, a selectable three-tier state and device response/interaction code. **36 / 42** require further implementation or full tier integration. The van has partially functional *fixed* boards and monitors, independent of the six carryable devices; those do not count as complete three-tier equipment until their original monitor, interaction and tier requirements are met. **0 of 42 can be called fully release-accepted** without a clean build and actual runtime hardware/sockets test.

A device counts as **release-accepted** only when its actual equipment action (or fixed van interface) works, Tier I–III change appropriate real behavior, the source model and diegetic display are rendered, the server owns interaction state and inventory/cost (if buyable), valid measurements or physical effects are recorded, reconnect/state recovery works, and Java/Windows plus 1–6 hunter/human-ghost tests have been observed passing. An equipment registry entry, a planned tier, or a committed GLB **does not pass** these gates.

## Current 42-device deployment register

| Equipment | Group | Source-level LAN state | Production gate |
|---|---|---|---|
| `DOTS_PROJECTOR` | STARTER | **Source slice integrated** (runtime QA pending) | Not release-accepted |
| `EMF_READER` | STARTER | **Source slice integrated** (runtime QA pending) | Not release-accepted |
| `FLASHLIGHT` | STARTER | **Partial existing behavior** (tiers/device integration pending) | Not release-accepted |
| `GHOST_WRITING_BOOK` | STARTER | **Source slice integrated** (runtime QA pending) | Not release-accepted |
| `SPIRIT_BOX` | STARTER | **Source slice integrated** (runtime QA pending) | Not release-accepted |
| `THERMOMETER` | STARTER | **Source slice integrated** (runtime QA pending) | Not release-accepted |
| `UV_LIGHT` | STARTER | **Source slice integrated** (runtime QA pending) | Not release-accepted |
| `VIDEO_CAMERA` | STARTER | **Backend and props pending** | Not release-accepted |
| `CRUCIFIX` | OPTIONAL | **Partial existing behavior** (tiers/device integration pending) | Not release-accepted |
| `FIRELIGHT` | OPTIONAL | **Backend and props pending** | Not release-accepted |
| `HEAD_GEAR` | OPTIONAL | **Backend and props pending** | Not release-accepted |
| `IGNITER` | OPTIONAL | **Backend and props pending** | Not release-accepted |
| `INCENSE` | OPTIONAL | **Backend and props pending** | Not release-accepted |
| `MOTION_SENSOR` | OPTIONAL | **Backend and props pending** | Not release-accepted |
| `PARABOLIC_MICROPHONE` | OPTIONAL | **Backend and props pending** | Not release-accepted |
| `PHOTO_CAMERA` | OPTIONAL | **Backend and props pending** | Not release-accepted |
| `SALT` | OPTIONAL | **Partial existing behavior** (tiers/device integration pending) | Not release-accepted |
| `SANITY_MEDICATION` | OPTIONAL | **Partial existing behavior** (tiers/device integration pending) | Not release-accepted |
| `SOUND_RECORDER` | OPTIONAL | **Backend and props pending** | Not release-accepted |
| `SOUND_SENSOR` | OPTIONAL | **Backend and props pending** | Not release-accepted |
| `TRIPOD` | OPTIONAL | **Backend and props pending** | Not release-accepted |
| `CLIPBOARDS` | TRUCK | **Fixed fixture / partial** (full tiers missing) | Not release-accepted |
| `COMPUTER` | TRUCK | **Fixed fixture / partial** (full tiers missing) | Not release-accepted |
| `OBJECTIVE_BOARD` | TRUCK | **Fixed fixture / partial** (full tiers missing) | Not release-accepted |
| `SANITY_MONITOR` | TRUCK | **Fixed fixture / partial** (full tiers missing) | Not release-accepted |
| `SITE_ACTIVITY_MONITOR` | TRUCK | **Fixed fixture / partial** (full tiers missing) | Not release-accepted |
| `SITE_MAP` | TRUCK | **Fixed fixture / partial** (full tiers missing) | Not release-accepted |
| `SOUND_MONITOR` | TRUCK | **Fixed fixture / partial** (full tiers missing) | Not release-accepted |
| `ANCHOR_TRIANGULATOR` | ORIGINAL | **Backend and props pending** | Not release-accepted |
| `ECTOPLASM_SAMPLER` | ORIGINAL | **Backend and props pending** | Not release-accepted |
| `RESONANCE_TUNER` | ORIGINAL | **Backend and props pending** | Not release-accepted |
| `BAROMETRIC_PROBE` | ORIGINAL | **Backend and props pending** | Not release-accepted |
| `SEISMIC_RECORDER` | ORIGINAL | **Backend and props pending** | Not release-accepted |
| `SPECTRAL_PRISM` | ORIGINAL | **Backend and props pending** | Not release-accepted |
| `LASER_GRID` | ORIGINAL | **Backend and props pending** | Not release-accepted |
| `EMF_ARRAY` | ORIGINAL | **Backend and props pending** | Not release-accepted |
| `THERMAL_BEACON` | ORIGINAL | **Backend and props pending** | Not release-accepted |
| `RITUAL_ANCHOR_METER` | ORIGINAL | **Backend and props pending** | Not release-accepted |
| `WARD_STABILITY_PROBE` | ORIGINAL | **Backend and props pending** | Not release-accepted |
| `OBJECT_IMPRINT_SCANNER` | ORIGINAL | **Backend and props pending** | Not release-accepted |
| `CHALK_SIGIL_KIT` | ORIGINAL | **Backend and props pending** | Not release-accepted |
| `SPECTRAL_FREQUENCY_ANALYZER` | ORIGINAL | **Backend and props pending** | Not release-accepted |

## Ordered remaining work

1. **All eight starter items:** finish video camera and any missing starter functionality, projectors/writing-book world page art, and real physical model/display/charge behavior for all three tiers. Complete the current six through clean Java tests, package proof and first-person visual inspection.
2. **Thirteen optional devices:** motion/audio sensors, photographic and acoustic tools, protective/consumable equipment, placement, retrieval, stock and relevant readout types. Every reported spectral event must originate in a genuine world effect.
3. **Seven fixed van systems:** use actual imported screen and PC props; complete camera switching, shared signal acquisition, multi-feed telemetry, site map/graphs, boards and tier-specific display/readability/latency or station upgrades. Include physical button and fully replicated cargo-door state.
4. **Fourteen original Beckenburg tools:** real host-owned authored residue, resonance, pressure, seismic, optical and object-imprint event producers and detector interfaces; all three tiers each, placement/charging/maintenance and session replay. Implement two extra planned readouts per ghost without generating false paranormal observations.
5. **Whole-suite regression and playtest:** build both scripts on a clean checkout, confirm all 42 devices and their 126 tier stages, real server + 1–6 hunters + human-controlled ghost, reconnect, audio/visual readout accuracy, no fake ghost evidence, manual journal independence, and signed-off installer artifact. **Only then** consider an equipment expansion, followed by ghost roster growth toward 26.

The current progress commits are on `main`; **compiled gameplay test executions are not yet verified**. Never silently change pending checkboxes to complete based solely on source existence.
