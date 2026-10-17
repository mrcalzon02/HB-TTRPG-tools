# Beckenburg — PS-era texture reference atlases v001

These **four full-resolution illustrated texture-sheet PNGs** are original visual-development assets for *The Beckenburg Project*. Their design authority is the first user-approved Beckenburg concept ensemble and `software/beckenburg/art/VISUAL_DIRECTION.md`.

**Status:** GitHub binary sources stored, not directly engine-ready. The sheets contain typography and multi-tile presentation layouts. They require supervised isolation into texture tiles, artwork cleanup, UV mapping, tileability checks, and appropriate 64×64 / 128×128 pixel atlases before use as a game renderer's diffuse textures. Never treat the board labels as part of a world-space texture.

| Atlas | Source artwork | Git blob SHA-1 | Notes |
|---|---|---|---|
| [exterior-texture-atlas-01.png](exterior-texture-atlas-01.png) | `gothic_exterior_texture_atlas.png` | `e1733a11673043b6b3c16e3089a296e539474e04` | Reference atlas 01; block walls, aged timber, stone and outdoor props |
| [interior-texture-atlas-02.png](interior-texture-atlas-02.png) | `the_beckenburg_interior_texture_atlas.png` | `4f345e44887e738f1c70049a176e72eb3ce7338a` | Reference atlas 02; indoor material and set-dressing palette |
| [equipment-texture-atlas-03.png](equipment-texture-atlas-03.png) | `beckenburg_equipment_texture_atlas.png` | `e3cc3d3cb83e9d5f0f0d16a70a0d4990c85183b4` | Reference atlas 03; device housings, active LCDs, leather and books |
| [occult-texture-atlas-04.png](occult-texture-atlas-04.png) | `occult_texture_atlas_04.png` | `8ce87d4e6f2ba581e88996f47c0c7d7dc6ae69c3` | Reference atlas 04; spectral effects, sigils, stains and overlays |

Each PNG is 1254×1254 RGB, non-alpha. See `manifest.json` for sizes and SHA-256. Three files are **byte-identical** to the generated originals. The occult image is PNG-recompressed **losslessly**: pixel-identical at its original dimensions, but its PNG file bytes differ; the original pre-recompression SHA-256 and size are preserved in the manifest.

## Technical extraction requirements
Create cleaned source tiles separate from this immutable `v001` art authority. Name and label each tile after a validated visual inspection; do not naively slice title/header/captions into in-game maps. Preserve originals, include derivation provenance and per-tile SHA-256, check padding/bleed, texture repeat, compression artifacts, mip-map behavior and readability at PS-era viewport resolutions. Apply roles in the order exterior → interior → equipment → spectral. Documentation-only markers or display previews do not count as implemented runtime material bindings.
