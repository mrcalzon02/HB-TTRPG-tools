# R101 — original-source-backed R11 first annular baffle physical 3D placement results

Original private source: user's actual `thruster.zip`, verified SHA256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`. Exact native body frames **1 and 33** (264×542) were privately compared against authentic Blender original-camera images; copyrighted original sprites remain out of all GitHub source and public artifacts.

**Real Blender execution**: [R101 workflow #41514469964](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41514469964) **SUCCESS**; artifact **13174881899** `factorio-r101-real-3d-source-r11-annular-baffle-profile-reconstruction`, original-camera 13 × 2 native PNGs and eleven actual edited/save/reopened editable 3D `.blend` candidates. The existing original R11 baffle **320 vertices / 320 faces** was physically translated along existing axial Y, moved at major radius, given different genuine minor toroidal cross-sections and one asymmetric angular rebate, while preserving its physical identity/material and all other original 3D mesh vertices, fixed camera and original 64-frame fin motion. Baseline R94 original selected scene SHA256 `221629095354e1c695e95b861c6630c1c9e55739f7fb1f04ea1e0277825bf252` unchanged.

Comparison metrics: original sprite-vs-real render alpha-premultiplied normalized RGB MAE (lower better); original-source gradient-edge symmetric Chamfer pixels (lower better); not CAD approval.

| R101 existing real physical annulus configuration | Mouth x48–215,y394–522 RGB | Lower flare x25–238,y392–540 RGB | Mouth source edge distance px | Far lower x25–238,y455–540 RGB |
|---|---:|---:|---:|---:|
| R94 baseline | 0.075590 | 0.073452 | 4.846 | 0.055612 |
| **Recess +Y 0.15 blender units** | **0.068866** | **0.069498** | 3.963 | 0.054156 |
| Recess +Y 0.30 | 0.070407 | 0.070542 | **3.812** | 0.055992 |
| Recess +Y 0.45 | 0.070386 | 0.070528 | 3.819 | 0.055967 |
| Baffle temporarily hidden (diagnostic only) | 0.070386 | 0.070528 | 3.819 | 0.055967 |
| Baffle major circle inward 0.24, unshifted | 0.071105 | 0.070350 | 4.990 (worse) | **0.052196** |
| Minor toroidal section 0.55, +Y 0.25 | 0.070387 | 0.070529 | 3.815 | 0.055970 |
| Major circle +0.10, +Y 0.25 | 0.070207 | 0.070321 | 3.962 | 0.055964 |
| **Asymmetric 3D baffle +Y 0.25 / radius -0.10 / angular rebate** | 0.072253 | 0.071800 | **3.761 (best)** | 0.058099 (worse) |
| Advancing ring -Y 0.20 | 0.074408 | 0.074886 (worse) | 4.827 | 0.058954 (worse) |

**Physical inference:** The old baffle sits at incorrect source-camera apparent placement; an actual 0.15-unit axial recession gives a significantly better original sprite mouth RGB (~**8.90% lower**), **while preserving the real annular metal object**. The fully withdrawn +0.45 candidate is effectively identical to hiding the ring, thus not a valid solution when source geometry needs a visible throat. The asymmetric profile improves mouth edge alignment (~**22.4%** shorter Chamfer) but degrades far-lower RGB and should not automatically win over source-correct ring coverage. Avoid changes that merely hide the ring as a whole. Not final source silhouette approval.

Source original still shows an individually layered broad fluted refractory and non-identical mounts not accurately represented by the dark smooth Blender interior. Continue actual R11 liner remodeling (R102) and combined native 3D forged-mount + baffle reconstruction (R103). R101 candidates remain saved experimental geometry only, no production substitution; cosmetic/shape metrics remain nonblocking for unrelated functional builds.
