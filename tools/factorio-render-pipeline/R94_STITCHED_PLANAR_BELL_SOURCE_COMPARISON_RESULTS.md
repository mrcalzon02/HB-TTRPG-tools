# R94 — source-directed stitched planar 3D shell candidate against the original Factorio sprite

## Method: planes, shared seams, real 3D surface

Following the user's recommendation, reconstruct the incorrect old generic bronzed bell by constructing **flat quadrilateral panels, joining all adjacent panel edges and their cross-sections into one continuous source-oriented surface**, then giving that surface real metal thickness in Blender. This is a true 3D mesh (not sprite art on a billboard, not generic imagined thruster parts).

Exact preserved starting scene: `port_raised_starboard_tight.blend` from R92 SHA256 `693c77e521a1da37ba3e1c72e9696ed6986492eb80a2f8d8ca11f3d74f694a49`. Real 3D source-specific left/right hinged castings, R79 corrected tabs, R81 upper fin taper, R83 straightened angular fin bow, all pressure rolls and R11/R19 refractory layers, original 64-frame animations, fixed original camera/materials and fin-to-hull connections remain unchanged.

- The reference R42 exterior bell is 8 longitudinal sections with 40 vertices around each ring and 280 old outer quads.
- R94 generates **640 shared-vertex positions** on the 8×40 original sections and inward-offset physically thick skin; **640 shared-edge quad panels** (280 outer, 280 inner, 80 boundary edge-wall connections). Every mesh edge has exactly two incident faces, no unstitched paper cards, no disk closing the exhaust mouth. Material remains the original existing R13 metal, genuine scene object identity preserved.
- The original R93 first-hit/visibility ablation identified the old shell as a geometrically wrong wide gray surface. R94 probes source-directed actual radial trims, axial retreats, mouth setbacks and sector relief separately.
- [Initial R94 test #41493741166](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41493741166) partially rendered two true meshes before correctly rejecting an excessive 0.38-radius trim that crossed the allowed physical interior boundary. **Do not blindly clamp invalid geometry**. Changed to source-safe 0.18–0.25 radial hypotheses plus independent axial cross-section setback at `c6e8583`.
- [Corrected full R94 Blender workflow #41494055204](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41494055204) **SUCCESS**, 9 hypotheses × 2 true native 264×542 frames, 7 actual saved/reopened editable Blender scene candidates. Artifact ID **13166220945**, `factorio-r94-source-first-sewn-planar-bell-metal-shell-candidates`, no Wube artwork inside CI/artifacts. Every saved .blend original camera/mount/animation/material/other geometry verified unchanged.

## Exact original native-pixel ranking

Only the original user-provided private `thruster.zip` is the reference (SHA256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`), using original body frames **1 and 33**, native 264×542. All scores are mean frame1/33 RGB mean absolute errors alpha-premultiplied to black and normalized to [0,1], lower is better. IMPORTANT: this metric combines source shape, material, lighting and occlusion; visual comparison is essential for geometric acceptance.

| Actual real 3D R94 profile | Full hinge region x26:225,y298:420 | Three fins x40:225,y336:444 | Deep nozzle/mouth x48:215,y394:522 |
| --- | ---: | ---: | ---: |
| R92 baseline | 0.141853 | 0.121741 | 0.075412 |
| Old generic exterior bell hidden (diagnostic) | 0.138678 | 0.117029 | 0.076292 |
| Stitched real panel 0.12 radial trim | 0.140568 | 0.120220 | 0.075562 |
| Stitched real panel 0.25 radial trim | 0.138831 | 0.117882 | 0.075500 |
| **0.25 radial trim + 0.18 axial setback (best full hinge)** | **0.137996** | **0.116796** | 0.075590 |
| 0.18 radial trim + 0.34 axial setback | 0.138366 | 0.117247 | **0.075151** |
| 0.20 radial trim + 0.50 axial setback | 0.138602 | 0.117261 | 0.076384 |
| Sector visor relief | 0.139360 | 0.118589 | 0.075564 |
| Mouth-terminal recession | 0.140720 | 0.120688 | 0.079285 |

**Geometric observation:** The original sprite has a large physically flared refractory bell with visible individually layered refractory/plated sections. The existing reconstruction still looks like a narrower, smoothed cylindrical metal wall with a dark round mouth. Some deep axial retreats artificially lower mean error while **hiding the textured refractory surface**, so a low score alone should not be promoted. The 0.25 radial / 0.18 axial profile keeps real physical shell material, stitched metal, correct mouth openness, and makes the best joint-region score; it is a **working experimental model, NOT final source silhouette approval**.

**Preferred editable comparison candidate:** `panel_trim_025_rear_018.blend`, saved and reopened full Blender scene, SHA256 **`221629095354e1c695e95b861c6630c1c9e55739f7fb1f04ea1e0277825bf252`**, size ~10.6 MB. It does not replace the original R92 model or any actual production game art.

## Next highest-value original-source reconstruction

Further tiny symmetric ring changes are showing diminishing returns. Next apply the same **source-image-first planar-panel stitching technique to the irregular, unlike left and right upper hinge mounting network**, where the current source remesh still has separate intersecting layered covers and over-large simplified gray surfaces. Work from original pixel-traced plates, not functional spacecraft mechanisms. At the same time plan a distinct open refractory/exhaust flare correction with true source-dependent cross-sections so that the source's shingled exterior survives; do not simply paint or hide the opening. Any code/test of shape visual matching is diagnostic only, not a functional release blocker.
