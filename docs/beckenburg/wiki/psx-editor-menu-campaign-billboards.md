# PSX Editor: Menu/Save, Campaign Control, Billboards, and Backgrounds

**Authority:** owner-provided *Editor-Based Manipulation System* design brief, 2026-10-30 (inline design guidance, not one of the nine uploaded PDFs). This reference belongs beside the other PSX editor engineering sources in `docs/wiki/`, and is mirrored to Home Brew's `docs/beckenburg/wiki/` with an API-discoverable JSON contract.

**Target:** Beckenburg's Java 17 **modern game with a PSX-style rendering profile**. Historical PlayStation memory cards, T-pages, and disc latency are **optional simulation targets**, not hard runtime requirements. The existing game renderer, lighting, `SoundVolumeEditor`, authoritative campaign/mission state, UI and asset loader remain the owners; **never implement duplicate gameplay systems just to match a document**.

## Menu and save management

- **Editor-facing UI graph:** inspect menu screens, actions, transitions, focus order and escape/back paths, with a shallow three-level *style preset* and an explicit override where needed. Every actionable control must resolve to a real action or a deliberate disabled/coming-soon state, not a dead button.
- **Retro skin:** optional readable bitmap/monospace font, high-contrast backing plates, crisp keyboard/controller focus, instant item-to-item selection and optional short feedback sounds; keep mouse, screen-reader-scale options and accessibility. Retain modern input and actual reliable save behavior.
- **Save editor:** expose save-slot titles/icon preview, per-slot payload bytes, version, timestamp and validity; allow optional historical 15-block, 8KiB-per-block *simulation* for an emulation profile only. Default Beckenburg saves remain unconstrained by physical PS1 memory cards. Do not invent a formatting wait before real save operations; a brief **cancelable decorative** animation is permissible if the underlying action stays immediate.
- **Safety:** atomic writes, document migrations, corrupt-file warnings and explicit dependency notices before deleting a menu action/save reference. No path should silently discard campaign progress.

## Campaign script and lifecycle authoring

- **Visual flow states:** `PENDING → ACTIVE ↔ PAUSED → COMPLETE`, with explicit `STOP → PENDING` cleanup/reset. Green = Active, red = stopped/pending, amber = paused/needs review; completed can use a neutral distinct indicator. Do not infer green merely from a button click.
- **Idempotent operations:** duplicate START and RESUME cannot create duplicate active systems; duplicate STOP must be harmless. Complete may only happen from Active when actually authorized. An editor mock simulation must be labeled as such until adapted to real mission state.
- **Cleanup ownership:** stopping an actual game session must call existing lifecycle cleanup, release only session-owned temporary entities, reset *temporary* variables and restore an authorized start position. Never silently erase persistent campaign flags, player inventory or multiplayer state.
- **Bounded event logic:** no unrestricted imported Java, external scripts, runaway busy loops or synchronous editor-thread execution. Prefer typed trigger actions, bounded event queues and time/step quotas. Guard against recursion and no-yield cycles; preview/test the graph before attaching actions to the game.
- **Dependency inspection:** warn before deleting an asset, menu state, event, flag or trigger referenced by live scripts or maps. Provide source/referrer IDs, safe retargeting and migration. The editor must not automatically modify the referenced objects until confirmed.
- **Editor graph:** model stages as nodes with typed start, pause, resume, complete and stop edges; display actual script state separately from authored design. Restore from an editor testing snapshot without affecting gameplay sessions.

## Billboard, skybox and 3D background authoring

- **Source vs. mapped preview:** show an unmodified source bitmap alongside a textured 3D plane/skybox with the actual game's sampler, UVs, alpha/culling and lighting preview. The desired preview is *the live renderer*, not an unrelated image mockup; mark an interim 2D preview honestly.
- **Retro image presets:** anchor a preview to 256×256, 512×256 or another power-of-two/retro framing preset, with aspect-preserving padding/cropping rather than destructive rescale. Palette reduction, CLUT swaps, nearest-neighbor and ordered dithering are optional render profiles, never mandatory source corruption.
- **Source preservation:** keep the original image, license/provenance, pixel dimensions and hash. Commit/bake a derivative only when the user confirms; provide undo/revert and the ability to inspect the final mapped result.
- **Performance:** do not trigger expensive scene relights or full environment rebuilds on each text edit. Debounce/lightweight preview, then explicit **BAKE/COMMIT** for heavy changes. Any baking task should be cancelable, provide progress and retain the previous working asset on failure.
- **Budget overlay:** per-layer estimates for UI sprites, billboard textures, background textures, and other decoded images; label GPU/heap **estimates** separately from measured allocator statistics. Support selectable historical PS1 VRAM simulation without treating it as an actual 1MB limit on a Windows Java game.

## Engineering adoption matrix

| Requirement | Disposition | Current status |
| --- | --- | --- |
| Menu/save state graph and UI focus recovery | Adopt | Planned editor adapters; existing UI must remain the authoritative implementation |
| Virtual 15-block memory card boot/format manager | Optional aesthetic/hardware profile | Planned, not a real Beckenburg save requirement |
| Typed bounded campaign flow and lifecycle preview | Adopt | Portable authoring-only state model targeted; actual game lifecycle adapter separate |
| Idempotent START/STOP and cleanup | Adopt | Must be verified on actual game lifecycle before marking integrated |
| Explicit asset/script dependency warnings | Adopt | Planned graph/ref index and deletion guards |
| Billboard source/3D mapped split preview | Adopt | Planned runtime-renderer adapter |
| Palette/CLUT/retro atlas preview and bake | Adapt | Atlas/import foundation exists; billboard-specific non-destructive bake planned |
| Visual VRAM budget | Adapt | Diagnostic/optional simulated historical profile, not a hard release gate |
| No nested menus, smooth scrolling or modern input | Reject as absolute | Optional style defaults, preserving accessibility and user choice |
| Artificial load/format delays and synchronous hard loops | Reject as runtime requirements | Gameplay input stays responsive; no busy loops |

## Minimum acceptance tests

1. Menu graph: no orphaned routes, every Back returns somewhere valid, controller/keyboard/mouse behavior remains accessible.
2. Campaign: START twice creates one active session, PAUSE/RESUME and STOP are idempotent, invalid transitions are explicit, no event loop can run forever, and STOP never erases persistent inventory.
3. Dependency: delete an asset with active references → warning with concrete referrers; cancel must leave the project untouched.
4. Billboard: source hash remains unchanged; 2D and in-engine mapped result correctly preserve orientation/aspect; a failed bake restores the last valid asset; optional retro effects do not warp text or collision.
5. Performance: expensive textures, scripts and light changes are scheduled/committed, not re-run per keystroke; counters distinguish estimated bytes from measured heap/GPU usage.

The PSX reference documents are engineering *guidance*, not executable specifications that override host-authoritative ghost fairness, collision, weather, lighting, audio or release policy. Aesthetic warnings remain diagnostic; only genuinely broken functionality belongs in a release gate.
