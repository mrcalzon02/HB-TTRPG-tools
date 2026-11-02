# R93 — source verification of original hinge obstruction by old invented bell/pressure roll geometry

**Original-factorio-sprite reconstruction in Blender**, not generic thruster design. The user's private original atlas `thruster.zip` is SHA256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`, genuine 264x542 body frames 1 and 33. The public code/Actions never includes this copyrighted original source. The only visual authority is that authentic image and its animation.

**Real workflow:** [R93 #41479481784](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41479481784) **SUCCESS**, artifact id **13158563511**, `factorio-r93-original-source-hinge-old-occluding-mesh-isolations`. Existing genuine R91 raised_hidden source-derived layered 3D hinge candidate (SHA256 `e410c19cecf5bedeacd52252e81f68e3375cb11c3a3f77fc72cd87c8d80dc67d`), fixed real camera, all R89 casting and R81/R83 heat-fin meshes; reversibly hide-render one exact known existing object group and render source-native frame 1 and 33. All original scene visibility, camera, data, source .blend on disk and 64-frame animation were restored and verified. No mesh was deleted, no production model changed.

### Original-source two-frame score

Full hinge ROI x26..225 y298..419. Three-fin ROI x40..224 y336..443. Pixel MAE normalized 0..1, lower is closer to source, but shadows/material and geometric edges influence result. Compare genuine source vs real Blender only.

| Temporarily isolated REAL old Blender mesh family | Hinge region MAE | Three-fin MAE |
| --- | ---: | ---: |
| R91 source-based hinge baseline | 0.142397 | 0.121319 |
| **Only `vanilla_reference_bell_bronzed_rolled_bell`** | **0.139249** | **0.116639** |
| Only two generic canted braces | 0.141450 | 0.121333 |
| Only `R08_black_exhaust_pressure_roll.003` | 0.142238 | 0.121280 |
| Only `R08_black_exhaust_pressure_roll.002` | 0.142703 | 0.121398 |
| Only `R08_black_exhaust_pressure_roll.001` | 0.144628 | 0.121447 |
| Only `R08_black_exhaust_pressure_roll` | 0.146439 | 0.121322 |
| ALL R08 pressure rolls hidden | 0.149399 | 0.121407 |
| All rolls + generic bronzed bell hidden | 0.145597 | 0.115898 |

The generic old bronzed bell **alone** is a major source-mismatched gray obstruction at/behind fin roots; hiding it improves both separately measured regions. In contrast, most R08 pressure roll components are USEFUL source-visible forms or shadows. Hiding all rolls is a serious regression (full hinge 0.149399) even though it makes nozzle interior darker. Thus removal of all old machinery would violate the user's actual original sprite requirement.

**Next real geometric intervention:** inspect the ORIGINAL visible annular/deep throat part in source and the actual existing `vanilla_reference_bell_bronzed_rolled_bell` editable 3D mesh/shape; test limited source-constrained changes to its width, axial depth, section and profile against exact original frames, while preserving genuinely source-consistent R08 pressure rolls, side-specific R92 source castings, 64-frame fin motion, camera and physical connections. Repeated simple hide_render is a causal diagnostic only; it does NOT constitute approved final 3D reconstruction.

Cosmetic/art verification remains nonblocking for actual Factorio game/plugin releases; only objective functional runtime/build/multiplayer/update defects may block.
