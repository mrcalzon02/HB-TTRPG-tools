# R99 — real source R94 shell-sector removal: exterior shell NOT responsible for missing interior

Original private Factorio 64-frame `thruster.zip`, SHA256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`, compared in local workspace using genuine native body frames **1 and 33**, 264×542 each. Source copyrighted Wube pixels stay private and are not in repository or public CI artifacts.

## Real Blender verification

- [First R99 run #41513152006](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41513152006) used Blender 4.5.15 LTS, rendered **14 x 2 source-native PNGs and 12 saved/reopened true 3D physically thick sectional metal shell variants**, preserving the original R94 baseline, animation, camera and all other real 3D parts. Artifact ID **13175190510** (`factorio-r99-original-source-physical-sectional-bell-occlusion-diagnostic`). The mesh and animation tests **PASS** in the Blender script. The job's final report check **FAILED for harness-only JSON key mismatch** (`physical_nozzle_reconstruction` was the incorrect leftover R98 field); corrected in commit `8e4b65bf1a20de2e65e882df73ae96508485bea4` and rerun as [#41513186467](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41513186467). Do not mistake the failed harness for a Blender geometry defect.
- Construction: R94 original physically stitched 8×40×2 real metal shell sections. Each experiment removes distinct real longitudinal/angular exterior+interior panel quads, then welds finite-thickness side walls around each opening. Validated **every** remaining actual mesh edge has exactly two polygon incidences. Not 2D cutout art or source sprite cards.
- Original R94 working 3D scene SHA256 `221629095354e1c695e95b861c6630c1c9e55739f7fb1f04ea1e0277825bf252`, not overwritten.
- Source-fidelity metrics use alpha-premultiplied RGB normalized MAE (lower better), and 2-frame gradient-edge Chamfer and within-2px edge F1 (lower/higher respectively). RGB and shading alone cannot establish correct geometry.

## Private source measurements

| R99 real physical 3D shell experiment | Genuine source mouth RGB (x48–215,y394–522) | Original nozzle-inner RGB (x58–203,y424–540) | Mouth edge Chamfer px | Full lower-flare RGB (x25–238,y392–540) |
|---|---:|---:|---:|---:|
| R94 baseline | 0.075590 | 0.056861 | 4.846 | 0.073452 |
| **Hide entire R94 outer shell (diagnostic)** | 0.076292 (worse) | 0.056844 | 4.740 | 0.073870 |
| R99 remove angular 30–39 lower band | **0.075587** | 0.056875 | **4.648** | 0.073451 |
| R99 remove angular 30–39 middle band | 0.075594 | 0.056877 | **4.646** | 0.073455 |
| R99 remove half shell angular 20–39 | **0.075572** | 0.056848 | 4.655 | **0.073440** |
| R99 remove half shell angular 0–19 | 0.076378 (worse) | 0.056865 | 4.988 (worse) | 0.074076 |

**Conclusion:** even half-shell removal barely affects the actual interior ROI color, and revealing holes on the wrong angular half worsens the source match. R99 can adjust some mouth edges a fraction but is not the main solution for the missing real recessed refractory shapes. **Do not promote a tiny 3D shell cut because of a small edge-only gain, and do not repeat generic sleeve resizing.** The primary missing source geometry/contrast lies in the real R11 fluted interior wall, R11 baffles and R19 formed plates; they dominate ray hits in earlier R73 source-calibrated diagnostics. All 12 R99 modified shell candidates remain experiments, not accepted production CAD.

## Next work

R100 independently hides only named *existing* R11 liner, four recessed baffles, and near/mid forty-plate R19 refractory rows in the **current R94 3D scene** for 14 reversible original-camera render comparisons. Private original sprite pixels are required to judge which geometry or visibility should be physically changed; do not optimize generic imagined mechanics or global image darkness. Source image is the spec. Never block unrelated functional builds for visual deviations.
