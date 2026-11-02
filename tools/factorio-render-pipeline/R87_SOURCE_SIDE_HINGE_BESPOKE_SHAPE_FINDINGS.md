# R87 — true original-sprite side-hinge contour tests: minor local gain, wrong base silhouette persists

**Real Blender workflow:** https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41409559299 — SUCCESS. Artifact ID **13124653641**, `factorio-r87-real-bespoke-left-right-hinge-cast-contours`. Eleven actual tested 3D configurations, 22 true original-camera native 264×542 RGBA renders, ten actual saved-and-reopened editable .blend candidate scenes. None were accepted as production geometry.

The only original source is the user's actual **private `thruster.zip`**, SHA256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`. Private local comparison used genuine body frames **1 and 33** from its original two 2112×2168 atlas pages. Original copyrighted sprite art remains outside public GitHub/Actions. Base saved Blender R85 center_short scene SHA256 `4343640f04b179c3b08ec2bdce1de77582e21cc45e195f173816603b709c36b7`.

## Physical geometry hypotheses

Source R49 port and starboard are distinct component instances but their mesh construction shares the same 5 longitudinal rows × 5 lateral columns × two-skin swept plate topology. The resulting smooth oversized slab visually diverges from the source's stepped forged left bracket, irregular short joint tabs and segmented offset wire-bearing right housing. R85 simply scaled those surfaces. R87 tested *nonuniform real 3D vertex field* candidates:

- Port/left: upper-flange rise or fall; independently outboard/inboard stepped lower heel, rather than a whole-panel affine scale.
- Starboard/right: independent elbow direction and outer physical shell relief/recess, not a simple reprojected texture.
- Combined opposite-profile hypotheses, preserving all real locked casting/fin and upper pressure-hull stay contact vertices, existing original meshes, R83 60% angular fin straightening, native fixed camera, shaders, and lower 64-frame animation.

## Exact original pixel scores (both frames mean, normalized premultiplied RGB MAE, lower better)

| Component native source region | R85 baseline | Best R87 probe | Effect |
| --- | ---: | ---: | --- |
| Left x27..96, y310..388 | 0.182053 | **0.180506** | combined stepped upper flange+heel, ~0.85% less pixel error |
| Left, isolated | 0.182053 | **0.180884** | port heel outward, ~0.64% reduction |
| Right x162..226, y307..389 | 0.141713 | **0.140590** | right front shell recessed, ~0.79% reduction |
| Entire mounting area x25..229, y299..408 | 0.158995 | **0.158708** | port heel outward, ~0.18% reduction |

The combined positive-parameter version *improves left* but **worsens right** (right error 0.142894). Changing the right elbow outward is slightly worse than leaving it alone. A model can be mechanically correct and successfully save/reopen in Blender while remaining source-incorrect. All R87 candidates remain diagnostics only.

## Engineering conclusion

**Do not promote R87 geometry.** These small shape-field moves fail to correct the obvious main silhouette: broad gray smooth covers where source has smaller, differently layered cast brackets with stepped lips and attached hardware. Repeated minor shears and affine scaling of the same original 5×5 shell show diminishing returns.

**Next diagnostic R88** https://github.com/mrcalzon02/HB-TTRPG-tools/actions/workflows/factorio-hinge-mesh-ownership-r88.yml will identify first-hit *actual 3D mesh owners* of the large mismatched side-plate polygons and run reversible visibility isolation on three existing original part families: R49 cast shells, R64 upper pressure-hull stays and R21 stamped clevis hardware. Before any source-specific topology replacement, confirm whether the offending gray shape comes from the cast itself, its hull web or an overlapping geometry piece. It may require **genuinely new nonuniform topology** attached to the original surfaces rather than reshaping existing 25-column skin vertices.

Geometry shape/texture visual fidelity remains advisory and must not block functional builds. Never invent source hinges, use web reference artwork, modify original pixels to improve the score or force a Git push.
