# Beckenburg — PSX Rendering, Environment Rigging & Shader Source Register

**2026-10-18 | Status: asset/design catalogue, not a runtime feature claim.** The authoritative machine-readable source list is [`software/beckenburg/assets/psx-shaders/index.json`](../../software/beckenburg/assets/psx-shaders/index.json). The owner's [Drive master asset index](https://docs.google.com/document/d/18G144Qd0-L5rL7NdqxMykqkXaBHtu8-ytr_yYPol6rI/edit) is the asset-source counterpart. Read alongside [Hardware, Accessibility, Graphics & Menu Options](HARDWARE_ACCESSIBILITY_GRAPHICS_AND_OPTIONS_STANDARD.md) and [Quality Gates](QUALITY_GATES.md).

## Renderer reality and boundaries

Beckenburg currently runs a **Java 17-targeted Swing/software raster renderer** for the prototype. A Godot `.gdshader`, Unity `.shader`, or libGDX GLSL `.glsl` is **not executable or importable by this rasterizer**. Do not put a random shader in the game assets directory and claim an effect has been implemented. The first runtime route is a **Beckenburg-owned CPU raster/postprocess implementation** with tests; a future GPU backend must be a deliberate engine decision with feature detection, Java/Windows packaging and fallback. The catalogue contains links/metadata only, **no copied external shader code**.

Our €11 owner-purchased **PSX Mega Pack v3.2.1** models and textures are a *separate* source/licence from the external shaders below. Its pack-wide commercial-use grant does not extend to unrelated shader repositories, and shader licences do not grant rights to unrelated model packs. Keep original paid archives on the owner's Drive; select and provenance-track only models genuinely used by the game.

## Source index / reuse policy

The full register contains nine candidates, their upstream links, engine, licence and **not-imported** status. Prioritize:

| ID | Library | License (source checked unless stated) | Backend | Beckenburg decision |
|---|---|---|---|---|
| PSX-S001 | [snotbane/psx_visuals](https://github.com/snotbane/psx_visuals) | Unlicense | Godot 4 | Preferred public-domain behaviour reference: vertex jitter, UV affine, fog, 5-bit color, dither |
| PSX-S002 | [Rytelier/Godot-PSX-Visuals](https://github.com/Rytelier/Godot-PSX-Visuals) | MIT | Godot 4.4+ | Rich environment/material reference; copyright/permission notice if adapted verbatim |
| PSX-S003 | [MenacingMecha/godot-psx-style-demo](https://github.com/MenacingMecha/godot-psx-style-demo) | MIT | Godot 4 | Lean material system, billboards and fog reference |
| PSX-S004 | [AnalogFeelings/godot-psx](https://github.com/AnalogFeelings/godot-psx) | MIT | Godot 4 | Archived; contrast material versus screen-space stages |
| PSX-S005 | [TotesNotJosh/Godot-PSX](https://github.com/TotesNotJosh/Godot-PSX) | CC0 | Godot 4.4+ | 15-bit/dither postprocess reference; object shader not yet shipped as described |
| PSX-S006 | [TotesNotJosh/PS1-3D-Shader](https://github.com/TotesNotJosh/PS1-3D-Shader) | CC BY 4.0 | Unity | Attribution required if copying; reference only now |
| PSX-S007 | [davidbrowne17/PsxShader](https://github.com/davidbrowne17/PsxShader) | CC BY-SA 3.0 per repository LICENSE.txt | libGDX / Kotlin / GLSL | JVM-adjacent example; **do not vendor** without share-alike review |
| PSX-S008 | [Francisco Cidade PSX - Godot Shader](https://store.godotengine.org/asset/fcidade/psx-godot-shader/) | CC0 per store | Godot 4.6 | Current all-in-one example; source archive still uninspected, store marks release unstable |
| PSX-S009 | [scolastico/psx_visuals_gd4](https://github.com/scolastico/psx_visuals_gd4) | MIT per Godot listing, upstream audit pending | Godot 4 | Runtime material-conversion design reference only |

Each index entry is **available for investigation**, not embedded in the executable. Licensing obligations belong with **each external source**, not the purchased PSX model pack. If code is eventually vendored: pin upstream commit/version, retain required license/attribution in the package, store source path, SHA-256 and transformation notes, and separately test the actual backend.

## Beckenburg-owned rendering feature matrix (all PROPOSED unless a test proves otherwise)

| Feature ID | CPU implementation target | Visual tuning & limits | Important cross-system requirements |
|---|---|---|---|
| PX-01 Pixel canvas | Render world to fixed low-res buffer, nearest-neighbour integer-ish scale/letterbox | Baseline 320×240 (4:3), 426×240 (~16:9), 640×360 comfort; never distort camera aspect | Keep menus, small evidence text and HUD native-resolution/readable; pointer mapping must account for scale and bars |
| PX-02 Vertex snap | Quantize *projected* screen-space vertex positions before triangle raster | 0 / subtle / authentic; stable with viewport size and camera motion | Visual-only: **never snap server-world coordinates, triggers, collision or ghost detection volumes** |
| PX-03 Affine UV | Interpolate u/v in screen space instead of perspective-correct u/z,v/z; blend with perspective mapping | Off / subtle / authentic, avoid maximal warp on long floors | Keep meshes sub-divided enough for doors, walls, floors and evidence decals; prevent UV crawl masking symbols |
| PX-04 Texture sampling | Nearest sampling, selectable conventional filtering fallback; mip/bias controlled | 64/128/256 px typical texture targets, power-of-two as convenient, atlas with gutters | UV seam inspection, consistent texel density, readability for labels, fingerprints, ghost writing and tool displays |
| PX-05 Color depth | RGB 5 bits per channel (15-bit-like) and optional palette quantization in postprocess | Off / reduced / 5:5:5; alpha handled separately | Preserve functional contrast, color-blind alternatives, grayscale checks; do not quantize procedural equipment data itself |
| PX-06 Dither | 4×4 ordered Bayer pattern applied before RGB quantization; anchored to final pixel grid | off/25/50/100% with static matrix, no random temporal noise | No stochastic scene flashing, ghost traces/motion text must stay legible; screenshot-deterministic |
| PX-07 Distance fog | Distance blend or per-vertex haze with tunable near/far per map/weather | Fog may hide geometry but cannot defeat mandatory visual evidence range | Flashlights, D.O.T.S., UV/thermal presentation use tested contrast priority; the host alone decides what evidence exists |
| PX-08 Lighting | Per-vertex/flat lighting, low fixed ambient, emulated vertex fog, local emissive meshes | Limit light radius, intensity, color; preserve physically meaningful darkness | Couple lamp meshes, toggles and flickers to existing RoomLighting; flashlight cone and van screens remain functional |
| PX-09 Transparency | Alpha cutout leaves/fences; explicit sorting for glass, decals, particles and ghosts | Prefer hard cutout over expensive blended foliage; scene-order deterministic | Do not let postprocessing occlude clues, physical silhouettes or player/ghost tells |
| PX-10 Retro optics | Subtle chromatic offset, vignette, film grain/CRT pass only where appropriate | Default restrained/off for user-sensitive effects; CRT on diegetic monitor material, not entire menu | Photos/camera evidence use defined capture source and host events; no accessibility-hostile motion/flash defaults |

A genuine preset is a synchronized set of supported, tested subfeatures. **Do not expose dead graphics controls**. Design presets can be documented now without pretending the CPU renderer already supports them. Effect state is client-local and must not alter authoritative ghost class, manifestations, range, equipment numerical readings or networking.

### Suggested visual profiles — draft, not wired into settings

- **Cinematic horror (default target):** 426×240 widescreen world; subtle projected snap; partial affine warping; nearest sampled 128 px textures; gentle static dither; 5:5:5 tone; aggressive-but-legible distance fog; native-resolution HUD.
- **Authentic PSX:** 320×240 4:3 or letterboxed, full pixel snap/affine, 5:5:5 with 4×4 ordered dither; strong fog; limited vertex-lit surfaces; expect old-school instability without game-logic instability.
- **Readable/comfort:** 640×360 or higher internal canvas; vertex snap/affine/grain disabled or reduced; fog and darkness lifted only within fair-play limits; UI and tool text crisp; documented high-contrast and reduced-flicker overrides.
- **Low-spec CPU:** internal resolution/per-object density/particle count and drawing complexity reduced after benchmarking; no claim of a particular FPS without Windows hardware evidence.

## Environmental rigging contract (applicable to castle hub, van and all planned investigation maps)

**World/layout:** use one authored placement unit/grid scale with exact world-to-model transforms, pivots, handedness, collision plane, measured door clearances and stairs. Record `.glb` source name+hash and level placement; no duplicate unlicensed stand-in. Divide scenes into room/portal cells so doors, hallways, adjoining rooms and van apertures participate in visibility and audio occlusion. Keep navigation, movement/hiding probes and evidence-spawn volumes separate from the visual mesh and PSX snap.

**Modular architecture:** prefabs for straight/corner/end wall, door frame, hinge-door, shutter, trim, stair, balcony, floor/ceiling, railing, windows, basement entrances and outdoor fence/gate. Seal backsides; use repeatable UVs and atlas gutters so affine sampling doesn't expose cracks. Define door hinge/pivot, lock state, swing arc, max opening, collision footprint and authoritative network state. A flickering light should swap or change an existing luminaire material state, not spawn an unrelated lamp model.

**Lighting rig:** classify ambient sky, powered room lights, portable tools, candles/lamps, emergency lights, paranormal flash/flicker, ghost manifestations and diegetic screens. Every placed switch has a room/power group; each light has location, radius, falloff, color, flicker ceiling, shadow/occlusion policy and on/off visible-source mesh. Bake vertex colors/ambient hints where possible but retain actual dynamic signals from RoomLighting. Candle/fire or security monitors don't turn into functional EMF or ghost indications without host event input.

**Outdoor rig:** low-poly ground and paths with atlas/UV seams; Retro Tree source-preserving trunks/leaf cutouts; distance LOD/billboards and fog horizon; night sky, weather and ambient audio zoned per biome/courtyard. Avoid foliage sorting spikes and render-thread overdraw on older Windows CPUs. Vegetation density presets may change decoration, **not hiding-spot, path or line-of-sight gameplay** unless explicitly host-authored/replicated.

**Character/entity rig:** consistent coordinate scale, orientation, hip/root, skeleton hierarchy, hand sockets and head/camera offsets. Declare flashlight/EMF/book/grab interaction anchors; male/female lowpoly source bases remain actual source meshes, not interchangeable generated previews. Ensure tool swaps align with real source geometry. Ghost entity readability prioritizes user-approved concept silhouettes, gender variants, flicker state and visible event timing, not internet placeholders. Any billboard sprites must face appropriately without corrupting hit/collision or multiplayer state.

**Surface classes:** opaque textured architecture, double-sided cutout vegetation, unlit signage/ritual marks, emissive bulbs, glass/mirrors, wet surfaces, decal evidence and CRT monitors. Avoid per-frame temporary materials in hot render loops; cache geometry/texture and material variants. Keep runtime authorship and licensing IDs in a single manifest. Reserve high contrast for functional UV, ghost book markings, D.O.T.S. traces, salt footprints and emergency navigation.

**Gameplay clarity:** no shader profile may fabricate/suppress ghost evidence, change EMF (normal 2–7), mislead the thermometer, omit actual ritual sites, ghost/door interactions or make Tier I–III tool displays unreadable. Graphics settings alter *how* information is shown, never *which host-authorized information exists*. Asymmetric ghost view may have different aesthetic treatment but the same host simulation and privacy rules.

## Integration windows and acceptance gates

1. **Inventory:** reconcile the nine source references and licence texts; no external binary/source additions yet. File status stays `INDEXED_REFERENCE_NOT_IMPORTED`; no claims of installed shaders.
2. **Baseline render:** capture deterministic image of one existing purchased-pack GLB, a lit/unlit ceiling lamp, door edge and tools from the real Java renderer. Measure draw calls, frame time and color/contrast with pixel canvas disabled/enabled.
3. **First real slice:** implement independently authored CPU pixel buffer downscale/nearest upscale and 5:5:5 4×4 Bayer dither with tests and readable native UI. Only promote these IDs after a passing Java render test and screenshots from the actual game.
4. **Geometry slice:** CPU vertex screen snap and affine UV mode alongside correct perspective alternative. Test triangles across clipping, nearby camera, extreme FOV, door rotation, long floors, transparency and resize/fullscreen.
5. **Environment slice:** integrate room-linked fog, light group material state, castle/van placements and outdoor billboard/cutout sorting; validate against host-owned switch states and real maps.
6. **Quality:** stress six hunters and human ghost view; evidence tool Tier I–III displays, D.O.T.S., writing book and ritual visuals; test accessible reduced-flicker/comfort profile, colorblind and 4:3/16:9 scaling. Profile older Windows CPUs and verify no network simulation divergence.
7. **Promotion:** register output snapshots/logs and fresh Java/Windows build evidence against `QUALITY_GATES.md`. Publish only the specific source/asset licences actually included. If a GPU renderer later replaces the CPU path, reconfirm every effect in real build; nothing auto-transitions to `INTEGRATED`.

**Source/file state as of this catalogue:** PSX shader references recorded, architecture/rigging standards written; **none of the nine upstream shaders has been bundled, executed or shown in a Beckenburg playable build by this change**.
