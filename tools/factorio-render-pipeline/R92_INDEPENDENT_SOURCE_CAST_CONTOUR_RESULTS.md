# R92 — original source dictates different 3D cast profiles on left and right

**The task is reproduction in Blender of the object actually rendered in the original Factorio sprite, not creation of a plausible thruster.** This R92 experiment changes physical finite-volume 3D hinge casting geometry, with the source camera fixed and the original 64-frame fin animation and mounting contacts untouched.

**Actual workflow:** [R92 #41478931628](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41478931628) **SUCCESS**. Actual Blender 4.5 LTS loads two source-verified saved R91 .blend files, transfers only actual local 3D mesh vertex positions for the separate nonmirrored R89 port and starboard source-contour objects, renders frames 1/33, saves and reopens both mixed editable scene candidates and verifies all protected original 3D mesh topology, shaders, camera, unchanged fin-to-cast and upper hull stay contacts and original 64-frame motion. Artifact ID **13158173109** `factorio-r92-distinct-source-left-and-right-hinge-blender-candidates`.

The original source was read PRIVATELY from user's exact `thruster.zip` (SHA256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`), two 264x542 original body frames **1 and 33**. No original proprietary sprite art is copied into the public GitHub code or workflow artifacts. All errors below are premultiplied RGB MAE normalized 0..1, lower better; material/shadow changes influence RGB and are not final shape approval.

| Real source-traced separately extruded 3D cast shape | Left original x27–90/y314–358 | Right original x166–220/y313–356 | Full source hinge x26–225/y298–420 |
| --- | ---: | ---: | ---: |
| Prior R85 model with invented generic castings and old guards | 0.1854650 | 0.1733718 | 0.1551817 |
| R91 raised port + raised starboard (old R08 guards hidden) | 0.1601979 | 0.1434345 | 0.1423969 |
| R91 tight port + tight starboard (old guards hidden) | 0.1612048 | 0.1408873 | 0.1429841 |
| **R92 raised PORT / tight STARBOARD** | **0.1601972** | **0.1408882** | **0.1418531** |
| R92 tight PORT / raised STARBOARD (reverse control) | 0.1612150 | 0.1434316 | 0.1435308 |

The R92 mixed source-specific casting edit improves full hinge-region error **0.1423969 → 0.1418531** against the best R91, in addition to earlier major gains from R85/R88/R89/R90. Compared with R85 the full hinge region error is ~8.59% lower; the large remaining mismatch must not be hidden by overemphasizing the small current benefit.

**Selected working experimental editable Blender scene:** `port_raised_starboard_tight.blend`, SHA256 **`693c77e521a1da37ba3e1c72e9696ed6986492eb80a2f8d8ca11f3d74f694a49`**, size 10,562,807 bytes, saved and reopened by R92. This is not a production replacement or original CAD acceptance.

**Next source-first direction:** The visually broad old pressure rolls and old generic bell geometry (R88 raycast counts demonstrate major ownership of overlapping source hinge pixels) need isolated reversible testing. R93 tests them separately, rather than blindly deleting useful structural elements. Source-constrained model fidelity must continue to use multi-frame original pixels; correct actual 3D forms, off-axis depth, cover segmentation, real fin/tabs and original shingled bell. Art/shape tests never block unrelated functional game builds.
