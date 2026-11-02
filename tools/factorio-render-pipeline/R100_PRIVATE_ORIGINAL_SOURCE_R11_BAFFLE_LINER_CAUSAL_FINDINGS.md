# R100 — private original sprite proves R11 baffle_00 and liner dominate wrong mouth

## Actual source and 3D Blender verification

- The ONLY original appearance target is the user's exact private `thruster.zip` SHA256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`. Source native body frames **1 and 33, each 264×542**, used privately, not committed/published in any CI artifact.
- [Blender 4.5.15 LTS R100 workflow #41513614188](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41513614188) **SUCCESS**. Artifact **13173813373**, `factorio-r100-original-3d-liner-refractory-causal-isolation-diagnostics`. Fourteen independently rendered **actual** source-native camera R94 real Blender physical-object visibility isolations at both frames. All existing meshes, original camera, 64-frame fin motion, materials and preexisting render visibility restored/verified after each experiment. No original proprietary source pixels in public CI.
- Starting source 3D model is R94 `panel_trim_025_rear_018.blend` SHA256 `221629095354e1c695e95b861c6630c1c9e55739f7fb1f04ea1e0277825bf252`, retained unchanged.
- Numerical test: RGB MAE against user-original source after alpha-premultiplying black, normalized [0,1] lower better. Contour metric: gradient edge bidirectional Chamfer distance in actual source pixel units lower better. These are diagnostics only; a hidden physical part is not approved as a finished 3D reconstruction.

## Original source against R100 true native renders

| Reversible physical 3D source-object isolation | Original mouth x48–215,y394–522 RGB | Lower x25–238,y392–540 RGB | Original mouth edge distance px |
|---|---:|---:|---:|
| **R94 baseline — all real source-model parts shown** | 0.075590 | 0.073452 | 4.846 |
| Hide R11 baffle 00 ONLY | **0.070386** | **0.070528** | 3.819 |
| Hide existing R11 deep open liner ONLY | 0.072506 | 0.071359 | 4.667 |
| **Hide both actual R11 baffle 00 AND R11 liner** | **0.067292** | **0.068454** | **3.418** |
| Hide all four R11 baffles | 0.070144 | 0.070364 | 4.242 |
| Hide R11 baffle 01 only | 0.075251 | 0.073223 | 5.240 (worse) |
| Hide R11 baffle 02 or 03 only | same as baseline | same as baseline | same as baseline |
| Hide 40 original R19 near-mouth refractory tiles | 0.075842 (worse) | 0.073622 (worse) | 4.494 |
| Hide 40 original R19 middle refractory tiles | 0.075580 | 0.073445 | 4.844 |
| Hide 80 R19 near/middle tiles together | 0.075829 (worse) | 0.073614 (worse) | 4.493 |
| Hide entire R94 external shell | 0.076292 (worse) | 0.073870 (worse) | 4.740 |

**Main causal result:** The original-source mouth RGB error improves about **10.98%** and gradient edge Chamfer about **29.47%** when both current R11 liner and baffle 00 are hidden. Hiding baffle 00 alone improves original mouth RGB about **6.88%**. Existing R19 near-mouth tiles are USEFUL original-source geometry: removing them worsens local source RGB. R94 external shell and R99 sector holes are a minor factor by comparison.

**Correct physical action:** DO NOT delete/hide the annular band and open liner as finished art. The original source visibly contains both an annular mechanical throat and the forged/refractory shaped liner. They are in incorrect 3D configuration/registration in Blender, and need source-first remeshing and separate axial/radial/cross-section geometry trials. Preserve actual R19 80 near/mid stamped tiles, fin mount contacts and source camera.

R101 explores **large real 3D registration/form hypotheses for existing R11 baffle 00** with all other physical metal held constant; privately score the genuine original source again to pick any geometrically promising candidates. R102 should then test the current R11 fluted liner's sectional geometry only after new baffle data, not prematurely optimize visual darkness or introduce generic thruster parts.

All visual/shape fidelity tests are diagnostics; unrelated actual build/run failures alone can be release-blocking.
