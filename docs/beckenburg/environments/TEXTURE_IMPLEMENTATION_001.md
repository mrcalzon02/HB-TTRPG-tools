# Beckenburg — Environment Material Atlas Implementation 001
Status: **real local runtime implementation; early PlayStation-era starter palette, not final authored texture art**.

## Delivered code
- `MaterialAtlas.java`: deterministic 128×128 RGB diffuse atlas organized as sixteen 32×32 texels-per-tile PS-era surfaces. Distinct 3D-world materials: stone, plaster, parquet, ceramic, door timber, ceiling, carpet, brick, wallpaper, concrete, soil, iron, foliage, aged wood, window and ritual markings. Atlas generated directly in Java with no external assets or runtime downloads.
- `SceneRenderer.java`: per-room material selection, world-space UVs for floors, ceilings, each wall orientation and timber doors; near-plane clipped polygons preserve interpolated UV; perspective-correct sampling in depth-tested 320×200 triangle rasterization. Flashlight, fog and ordered dithering remain in use. Distinct rooms now have distinct material personalities.
- `MaterialAtlasTest.java`: atlas palette uniqueness, repeatable UV tiling including negative world coordinates, exact atlas/sample matching, room material assignments, distinct rendered views, dynamic flashlight response and near-plane robustness.
- `build.sh` and `build.cmd`: the new test participates in ordinary one-command local compile/test/package for Java 17.

## Verification performed
- Clean `javac --release 17` build under installed OpenJDK 21 on Linux: PASS.
- Existing `GameplaySmokeTest` and `GhostDomainTest`: PASS.
- New `MaterialAtlasTest`: PASS.
- `GuiSmokeTest` under Linux Xvfb display (launch/menu → first-person game): PASS.
- Actual 128×128 atlas and 320×200 in-game render inspected: PASS.
- Windows rendering, bundled installer, GPU path and performance-floor measurements: **NOT VERIFIED**.

## Restrictions
This is authored **procedural texel art integrated into a working rasterizer**, not a final externally authored atlas or final PS-era meshes, no gameplay map expansion beyond the committed nine-room test house. No original user-approved full-resolution concept images are silently replaced by this palette; pending upstream source-art archive and gallery must remain a distinct blocker. Surface material ID assignment currently belongs to `MaterialAtlas` and `SceneRenderer`; future data-driven level schema should move selection to authored zone descriptors and import textured meshes without rewriting evidence/game-state logic.

## Next needed development
1. Move room-to-material IDs into validated map/zone data rather than renderer-dependent switch mappings.
2. Expand the current nine-room indoor proof to a correctly connected twelve-space house with actual outdoor staging, porch and back-yard traversal, without breaking ghost navigation and evidence.
3. Build reusable site kit: windows, doorframes, trim, light fixtures and outdoor ground modules.
4. Add approved image-to-texture import and model UV export for art handoff after original reference PNGs are committed and verified.
5. Profile frame times on the target Windows installation and tune polygon/lighting limits from actual measurements.
