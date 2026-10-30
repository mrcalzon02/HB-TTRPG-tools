# PSX-inspired editor and runtime — curated engineering reference

**Adoption review:** 2026-10-30 · **Scope:** Beckenburg Java 17 runtime and the portable editor kit · **Status:** normative design guidance, **not** a claim that all requested tools are implemented.

This guide adapts five owner-provided PDFs selectively. It is not an instruction to emulate an actual PlayStation's fragile hardware. The editor must author **the actual running game**, not a decorative second renderer. Beckenburg gameplay, authoritative networking and accessibility take precedence over historical fidelity.

## Source register and adoption verdict

| Owner reference | Where the advice belongs | Verdict |
| --- | --- | --- |
| *Level Editor gold standards* (5 pages) | Editor core, scene, inspector, persistence, UX, diagnostics | **Adopt as feature acceptance criteria**, phased; existing [editor audit](https://github.com/mrcalzon02/The-Beckenburg-Project/blob/main/docs/development/LEVEL_EDITOR_OVERHAUL_AUDIT.md) governs current completion claims |
| *PSX level building* (18 pages) | Materials/presentation profiles, geometry authoring, layouts, portals and atmosphere | **Adopt selectively**; never intentionally break collision, input, readability or streamed-world integrity |
| *PSX lighting engine* (6 pages) | Unified lighting module plus renderer post-process; editor gets adapters | **Adapt existing modules**, avoid a duplicate lighting engine; see [lighting review](https://github.com/mrcalzon02/The-Beckenburg-Project/blob/main/docs/lighting/LIGHTING_MODULE.md) |
| *PSX NPC-AI-1* (17 pages) | Authored navigation, portal metadata, AI diagnostics and fair simulation | **Adapt with constraints**; see [source-level AI review](https://github.com/mrcalzon02/The-Beckenburg-Project/blob/main/docs/ai/PSX_NPC_AI_ADOPTION.md) |
| *PSX UI guide and user* (20 pages) | Input abstraction, compact UI language, controller navigation, accessibility | **Adopt usable interaction rules; historic presentation optional**, never insert intentional latency or invented memory-card requirements |

These are owner-supplied design references, not independent historical or benchmark verification. Recommendations labeled as PSX hardware facts in them should be independently checked before being repeated as hardware-engineering claims. The editor is Java 17 with a software renderer and optional GPU backend, **not** native PS1 C/MIPS.

## Cross-cutting non-negotiables

1. **Game/runtime first, editor second.** A single authoritative scene model drives renderer, collision, physics, navigation, audio, evidence, ghost powers, van, ritual zones and environment modules. The editor is an adapter/view/controller onto that same model. Preview, playtest and shipped scenes must use identical actual assets, fixtures and spatial coordinates.
2. **Stable identity and versionable state.** Object, scene, room, portal, layer and prefab identities remain stable through edits, save/load, Undo/Redo, import and playtest restoration. Save atomically; reject invalid references without silently converting live game state.
3. **Parity and fairness outrank retro tricks.** The host owns ghost/hunter state and evidence. An AI ghost and player ghost operate under the same permitted sensory inputs, movement restrictions, ability costs and timers. No seeing through walls, van entry, hiding-pocket entry or omniscient aim shortcuts.
4. **Presentation knobs cannot become gameplay bypasses.** Resolution, quantization, color depth, dither, affine mapping, jitter, palette treatment, distance fog and lighting visual profiles must never change line-of-sight, evidence visibility guarantees, collision, locked doors or network outcomes. Exclude Swing inspector text/gizmos from global PSX warp.
5. **Performance must be observed.** Show editor FPS and p50/p95/p99 frame timings, CPU build/raster/post-process, GPU uploads/readback where real, AI budget, draw calls/triangles, source probes, dirty lighting cells, heap and GC. Update dirty regions, avoid unnecessary full-scene invalidation. Optional limits warn; only objective nonworking game/installer/multiplayer requirements block release.
6. **No inert authoring controls.** Every exposed slider, toggle, inspector, shortcut, prefab, brush, button or view must affect the live authored scene or actual runtime. Hide or mark unsupported facilities as unavailable rather than rendering decorative controls.

## Level construction: rules to implement

**Authoring structure.** Grid/vertex/edge/surface/object snapping, true XYZ transform and parent hierarchy, separate visual/collision/navigation/trigger layers, selected-object inspector, material alignment and reusable prefabs. A floor over a basement must have an actual stair/shaft opening and collision route. Houses must remain recognizable buildings rather than arbitrary untextured cubes; avoid clipped shelving, wall lamps and furniture. The **same canonical van prefab** serves castle and mission. Exterior terrain, roofs and walls must be compatible with world topology and weather.

**Visibility and staging.** Room sectors, door/portal topology, occlusion/interest queries and selective asset loading can keep the game fast. Camera framing, threshold composition, distance fog, vertical loops, readable landmark texture contrast, audio landmarks and paced negative space are useful design tools. Fog is owned by the unified weather module—do not restore a separate “fog / outage / weather” mission-condition selector. Never unload a room by freezing gameplay just to imitate CD-ROM seeks, reveal unbuilt voids, or force fixed cameras on a first-person game.

**Retro materials / rendering.** Prefer compact hand-authored diffuse textures, nearest-neighbor/pixelated profiles, intentionally limited polygon density, authored color gradients, optional 4x4 dithering/quantization, optional PSX vertex/UV jitter and affine distortion. Treat 64/128/256 px textures, 320x240 and 4:3 as **art-direction presets**, not universal hard caps; modern widescreen and scalable accessible text must remain supported. A visual seam/wobble is okay only as a bounded rendering effect; structural gaps, physics tunneling, geometry bleed, unreadable text, and real world/skybox holes are defects.

**Tools and visual diagnostics.** Add portal/room/PVS visualizers, collision/navigation/trigger overlays, light reach with actual occluders, texture seam and wall-penetration checks, basements and vertical passage QA, item/van clearance and jump-to-object warnings. Collision geometry may deliberately be simpler than visible geometry, but it must remain aligned with actual playable floors/walls.

## Lighting: existing authority and editor adaptation

The **existing** `dev.mrcalzon.lighting.LightingModule`, `FixtureLighting`, `SceneRenderer` and `PsxPipeline` remain responsible. Add authored fixture inspectors, radius/diffusion reach overlays, occlusion probes, power-circuit state, scene preview and measured cache invalidation through published APIs; do not introduce a rival shader/CPU light system. Existing diffusion width and invalidation-cell size are distinct controls, not a “priority” winner for lights in one cell. Source contributions must be occlusion-aware; self-emission must not illuminate the far side of a masonry wall. The PDF's per-pixel fallback, optional CLUTs and mesh subdivision are candidates **only if** supported by renderer and a measurable, justified need. Do not blindly subdivide every surface, add redundant post-process passes or recalculate a whole House after a door opens. Benchmark the real door profile and review p95/p99, rays, upload bytes, cache revisions and visual evidence.

## Navigation and AI: safe adoption

The editor should expose real traversable room/portal and stair connections, authored waypoint/cover/ambush metadata, safe door-state edge invalidation, route reachability diagnostics and optional offline PVS/next-hop preprocessing. These are **authoring accelerators**, not replacement runtime rules.

Keep Beckenburg's host-owned 100 ms simulation, audible-event ghost perception, door/material/weather sound attenuation, swept collisions, stable ghost action cadence, van exclusion and hiding rules. Dynamic topology updates must be reflected in valid routes. AI may cache results, throttle optional decisions and avoid excess allocations **when profiling demonstrates benefit**; hearing, contact, rituals, essential reactions and authoritative events cannot be throttled out. No 4-edge artificial node cap, global teleport-on-stuck, PS1 2 MB memory ledger, GTE/MIPS assembly, universal no-allocation ban, fake ghost gaze detection or NPC omniscience. Measure before introducing object pools, time slicing or path queues.

## UI and input: PSX visual language, modern usability

Use compact rectangular panels, sharp optional pixel fonts, bounded dithered backplates, visible selection, controller D-pad navigation, predictable back/escape, mouse/keyboard/controller parity, configurable bindings/deadzones and instantaneous functional response. Maintain scroll and page-jump, text-skip plus history, subtitle/audio cue alternatives, adjustable UI scale/contrast and inclusive readibility. The low-res 4:3 mockup is a **preset**, not a lock on desktop aspect ratio, internationalization or accessibility. No fake CD seek freeze, mandatory button delay, unreadable UI at 240p, forced memory-card ritual, impossible 1 MB VRAM cap, or nonremappable input. The editor UI itself should stay legible at modern resolution, even when the 3D viewport imitates PSX rendering.

## Editor implementation acceptance map

| Level | Deliverable | Evidence required |
| --- | --- | --- |
| P0 | Runtime parity, live scene/collision, stable scene IDs, atomic save and safe edit/playtest snapshot | Editor and game read same scene; round-trip load; unsaved edits survive playtest |
| P1 | True gizmos and snapping, hierarchy/layers, typed inspectors, authored portal/navigation/lighting helpers | Real placement and doorway/stair test, inspector update in rendered world |
| P2 | On-demand frame/AI/lighting profilers, collision/occlusion debug views, prefab and replacement tooling | Door-opening p95/p99, no full redraw, vanished assets identified |
| P3 | Advanced brushes, macro API, docking, multi-user locking, optional player sharing | Live functionality; no inert controls or untrusted arbitrary script execution |

**Concrete fixtures:** House door opening; House wall-clipping furniture; all cellar entrances; Castle wall-mounted lamps and rear shelves; Castle/field van identity; dense weather fog; ghost sensing and hiding/van exclusions; UI navigation under mouse, keyboard and controller. Warnings and subjective quality checks remain diagnostic unless they demonstrate an objectively nonfunctional product.

## Maintenance, machine access and publication

- Machine catalog: [PSX authoring adoption JSON](https://github.com/mrcalzon02/The-Beckenburg-Project/blob/main/docs/development/psx-editor-reference.json), with stable IDs, applicability classes, source page references, integration owner and acceptance proof. This is **a guidance manifest**, not evidence of runtime feature completion.
- Existing detailed authorities: [Editor audit](https://github.com/mrcalzon02/The-Beckenburg-Project/blob/main/docs/development/LEVEL_EDITOR_OVERHAUL_AUDIT.md), [suite architecture](https://github.com/mrcalzon02/The-Beckenburg-Project/blob/main/docs/development/PSX_RUNTIME_AND_EDITOR_SUITE_ARCHITECTURE.md), [lighting module](https://github.com/mrcalzon02/The-Beckenburg-Project/blob/main/docs/lighting/LIGHTING_MODULE.md), [AI adoption review](https://github.com/mrcalzon02/The-Beckenburg-Project/blob/main/docs/ai/PSX_NPC_AI_ADOPTION.md).
- The standalone Java 17 editor kit includes a concise offline guide viewer. The wiki and manifest are versioned sources; the viewer is an orientation aid, not the implementation authority.
- For the two sites, publish the same policy with site-relative links. Original PDFs remain owner-supplied source material; these pages are an **adapted synthesis** rather than a verbatim republication.
- Actual installed Windows playtest, network/camera and hardware GPU profiling remain separate verifications. Do not equate a successful documentation commit with those tests.
