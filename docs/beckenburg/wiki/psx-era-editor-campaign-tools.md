# PSX-Era Level Editor — Campaign, Events & Authoring Contracts

**Source:** owner-supplied **PSX-era level editor.pdf**, 9 pages, SHA-256 `dc3bbd98dd74f573aeaf3b63578ebdb52def99f00adf50f37a2c835687a950a3`. **Disposition:** selectively adopt the *editor workflow and graph discipline* for a modern Java 17 game, not raw-PS1 disc tools. [Machine batch ledger](https://mrcalzon02.github.io/HB-TTRPG-tools/api/psx-reference-ingestion-2026-10-30.json).

## Source-to-Beckenburg reconciliation

| Source section/pages | Correct placement in our toolchain | Status |
| --- | --- | --- |
| Spawning, page 1 | Real entity authoring with estimated visible draw/LOD rings, per-room active AI counts, editor-only budget warnings, direction arrows, location/floor validity | **Partially existing**: current scene/prop/light tools, overlay/navigation audit and model-size warnings; dedicated spawn gizmo and active-AI-budget profiler **planned** |
| Campaign graph/flags, pages 1–2 | Stable map entrance/exit IDs, directed level transitions, typed persistent campaign flags and stage-preview overrides; explicit persistence ownership | **Planned**, do not fake a finished campaign graph or checkpoint engine |
| UI flow, page 2 | Optional UI menu state graph, focus/escape recovery, string localization IDs and Z-layer editing; test all branches | **Planned**, integrate shared UI rather than spawning a second menu implementation |
| Saves, pages 2–3 | Atomic saves, versioned schema/migrations, corruption recovery and test fixtures for out-of-space/unavailable storage | **Atomic castle editor saves exist**; PS1 card blocks/emulated physical cards **rejected as required platform function** |
| Triggers/scripts, page 3 | Visible AABB trigger volumes, typed event ports and safe template actions; runtime execution trace and no arbitrary scripts from untrusted user levels | **Planned**, match the existing game event/ritual/door APIs instead of forked trigger simulation |
| Team source control, page 4 | Sub-level separation, explicit ownership and versioned/diffable scene documents | **Partially existing** editor snapshots, existing props/surface documents; source-control UX planned |
| Textures/VRAM, pages 4–5 | Material atlas inspection, memory-use estimates, palette variants and warnings | **Partly existing** via GLB importer and active game texture atlas. Literal PS1 T-pages and 512KB SPU management are optional simulations, **not hard limits** |
| Audio, page 5 | Sound source and reverb-zone controls, directional falloff, preview, data-driven event bindings | **Existing** `SoundVolumeEditor`, `SoundVolumeAudio`, `SoundDocument` with placement/falloff preview. Native XA/VAG conversion and SPU emulation **not planned for a Java 17 game** |
| Collision, pages 5–6 | Colliders separate from visual LODs; walkability, stairs, doorway volumes, material-ID diagnostics | **Partially existing** collision/nav checks; dedicated collision brush and per-face sound material painting planned |
| Animation, page 6 | Rigid-part animation authoring, low-frame sampling, redundant-key pruning | **Initial tool implemented** `EditorAnimationClip` and `EditorAnimationLab`; live actor integration outstanding |
| Hardware build, pages 6–9 | Keep existing Windows Java installer, game/runtime test workflow and optional software/GPU render modes | **Native .TIM/.TMD/.VAG, .bin/.cue ISO, CD-ROM sector ordering and DuckStation launcher rejected as mandatory**; a separate actual-PS1 exporter would be a distinct project |

## Safety and architecture nonnegotiables
- Every visible editor operation must either mutate the authoritative game scene through real adapters or be labeled **authoring-only**. Never misrepresent mockup/editor-only data as live-game functionality.
- Reference IDs resolve to actual assets; save/load round-trips retain transforms, layers and parent IDs. Preserve originals and implement migrations without destroying authored data.
- Use **the unified lighting and weather modules**, actual water module and existing sound-volume module; do not reinvent competing simulation, independent fog selector or new game audio engine in the editor.
- Underlying host-owned AI/ghost logic stays authoritative. A campaign/editor trigger may not reveal hidden hunter positions to ghosts, allow ghost van entry, or change attack timing outside host rules.
- Budget and classic-hardware-era counts are warning channels. The active renderer/Java memory/performance measurements, not a native PS1 spec sheet, determine what is truly executable.
- Scene regression QA should test that open doors connect physically, basements have walkable stair openings, and imported props don't block critical traversable routes; never block a release merely over taste or an out-of-date visual expectation.

## Prioritized expansion
First wire campaign map graph and typed flag registry to the existing mission scene data; expose trigger visualizations and actual door/stair/nav paths in the editor. Next add scene persistence and invalid-reference repair, authored entry/exit preview and 100% actual-game playtest. Then add edit/preview for sound zones, spawn orientation, and collision proxy gizmos. Keep sandboxed user-level scripting constrained to vetted actions and explicit permissions; do not deserialize arbitrary executable Java code from map content.

## 2026-10-30 authoring module checkpoint

**CAMPAIGN** on the game editor opens `EditorCampaignLab`. Its portable `EditorCampaignFlow` accepts only bounded typed lifecycle commands (START/PAUSE/RESUME/COMPLETE/STOP/RESET), preserves named simulation flags across STOP, detects duplicate commands, maintains reference→asset dependencies, and writes diff-friendly authoring state. **It does not start or stop any live game session.** `EditorCampaignFlowTest` checks idempotence, invalid transitions, reference guards and save/load.

**BILLBOARDS** opens `EditorBillboardLab`, backed by `EditorBillboardProfile` for source-preserving PNG/JPEG → separate PNG derivatives. The current 2D source/processed comparison, 256/512 canvas options, aspect-preserving nearest-neighbor fit, RGB555/332 quantization, optional ordered dither and estimated decoded RGBA bytes are actual editor controls. A **game-renderer 3D mapped preview, scene placement adapter, skybox/atmosphere commit and per-scene VRAM counters remain outstanding**, and the UI labels the current preview as 2D authoring-only.
