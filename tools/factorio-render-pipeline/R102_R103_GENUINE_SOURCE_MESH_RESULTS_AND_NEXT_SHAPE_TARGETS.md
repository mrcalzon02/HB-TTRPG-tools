# R102 and R103 — private original sprite vs actual 3D Blender scene outcomes

Private source authority: user's authentic `thruster.zip` SHA256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`, actual native original body frames **1 and 33**, 264×542. No user Wube source pixels in public repository or GitHub Actions artifacts. All reported scores are TWO-frame mean normalized RGB MAE after alpha-premultiplication against black (lower better), and gradient-edge Chamfer distances (lower better). Numeric image metrics are diagnostics, never full 3D shape approvals.

## R102 physically new liner geometry

[Actual R102 Blender 4.5 LTS run #41514956340](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41514956340) **SUCCESS**; artifact **13174838482**, `factorio-r102-original-source-stitch-40-real-refractory-liner-3d-candidates`. Exact source-calibrated R94 base scene, 13 actual Blender native two-frame test cases (11 new saved/reopened editable real 3D meshes): R11 original 13-ring 40-station open fluted liner rebuilt as **13×80 joined 3D quad sections (1040 vertices, 960 actual original-facing faces),** 20 vs 40 true source-candidate flutes with differing depths/physical radial clearance; source 80 R19 refractory tiles, exterior baffle, original camera, all materials and fin animation unchanged.

| Real R102 3D physical surface | Original mouth RGB x48–215,y394–522 | Original lower-flare RGB x25–238,y392–540 | Mouth edge Chamfer px |
|---|---:|---:|---:|
| R94 baseline | 0.075590 | 0.073452 | **4.846** |
| R11 liner temporarily hidden (causal diagnostic, not valid final part) | 0.072506 | 0.071359 | 4.667 |
| **40 real flutes, near-mouth 0.18 physical depth** | **0.074993** | **0.073041** | 4.937 (worse) |
| 40 real flutes, near-mouth 0.10 depth | 0.075266 | 0.073226 | 4.922 (worse) |
| 40 real flutes, conventional 0.10 depth | 0.075544 | 0.073422 | 4.859 |
| 40 flutes / physical outward clearance .16 | 0.075673 (worse) | 0.073511 (worse) | 4.819 |

**Decision:** R102's genuine 40-flute source-shaped mesh is editable/manifold as intended but is not the main remedy; best mouth color improves only ~0.79%, while mouth edge proximity worsens. **No R102 candidate promoted.** Do not keep repeating flute count/depth or shade to disguise incorrect liner and baffle overall placement. Existing actual near/mid R19 plates are retained. Need remodel the larger real 3D liner outline/axial placement using source-observed internal boundaries, not generic fluting.

## R103 combines physical source-fit R97 forgings and R101 baffle — passes

[Actual R103 Blender 4.5 LTS run #41515498651](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41515498651) **SUCCESS**. Artifact **13175157941**, `factorio-r103-source-true-3d-forging-and-nozzle-baffle-editable-composites`. SHA-verified source 3D scenes R97 and R101 loaded and merged by transferring **ONLY the physically remodeled R11 baffle mesh** into each R97 asymmetric left/right forging .blend; actual camera, original 64-frame fin movement, other R11 parts, R19 tiles, R94 shell, material slots and physical R49 cast/fin contacts preserved. Six native true two-frame comparisons, four actual saved and reopened editable composite Blender scenes.

| Real source-calibrated physically combined Blender test | Whole sprite RGB | Hinge RGB x26–225,y298–420 | Mouth RGB | Right-cast edge Chamfer px |
|---|---:|---:|---:|---:|
| R94 standalone baseline | 0.130040 | 0.137996 | 0.075590 | ~2.049 (earlier R94 ROI) |
| R97 right chamfer + left heel only | 0.129826 | 0.136733 | 0.075589 | 1.892 |
| **R103 right chamfer + left heel + R101 baffle +Y .15** | **0.128956** | **0.134013** | **0.068867** | **1.891** |
| R103 both stepped sidewalls + R101 baffle +Y .15 | **0.128841** | **0.133338** | **0.068874** | 2.030 |
| R103 both stepped + R101 irregular baffle | 0.129348 | 0.133338 | 0.072261 | 2.030 |

**Important distinction**: `both_stepped_actual_sidewalls__recess_y_015.blend` has best **global/hinge RGB** (whole 0.128841, ~0.92% lower than R94 global), but `right_chamfer_plus_left_heel__recess_y_015.blend` better matches actual original right/left casting **edge contours** (right 1.891 vs 2.030 pixels; left 2.147 vs 2.167). Hence lower color error is not enough to declare the former physically correct; the right-chamfer + heel scene should be the next *shape-sensitive* reference experiment. Neither is accepted production CAD.

Preferred original-shape-sensitive source experiment: `right_chamfer_plus_left_heel__recess_y_015.blend` original SHA256 **`d4a005ea703c1e788501e084bc43c90c63bd73fefd631b656d27c22e8f9539f7`**, but not source approved. Alternative RGB-favored scene `both_stepped_actual_sidewalls__recess_y_015.blend` SHA256 **`609c55ea5bc330df582553fd19c165611f84a6e979ece3007469f46df1a80634`**. Both original project assets unmodified; composite scene is distinct editable variant. Original private source comparison remains mandatory after next changes.

## Next substantive work

The overall top machinery still looks like a generic triplicate engine/pipe structure that is NOTHING like the original source's layered irregular cast machinery. The original lower bell retains visible formed dark refractory strips unlike the remaining smooth dark candidate despite R101 gain. **Do not add generic spacecraft engine details.** Use native original-camera 3D first-hit ownership on the preferred source-composite scene to identify the specific wrong upper-body solid meshes, then replace their physical profile with independently traced original sprite shapes. Continue real source-camera multi-frame assessment and protect all real fin connections. Visual/art checks remain nonblocking relative to actual functional game-build failures.
