# R98 — direct ORIGINAL Factorio 3D source-bell comparison: terminal expansion REJECTED

The only visual target is the **exact original 64-frame Factorio thruster source**, not a plausible spacecraft nozzle. Original private `thruster.zip` SHA256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791` was independently hash-checked locally and native body frames 1 and 33 were extracted from its two original 2112×2168 atlases, 264×542 each. Source artwork and private source-render montage remain out of public repository and GitHub Actions.

[Actual R98 Blender 4.5 LTS workflow #41504817832](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41504817832) **SUCCESS**: 10 actual source-calibrated native candidate pairs (20 PNG frames), nine saved/reopened editable 3D scenes (artifact **13171811153**, `factorio-r98-actual-original-source-shaped-flared-3d-refractory-blender-candidates`). All real finite-volume sectional shell meshes preserved the fin mounts, 64-frame animation, source camera/materials, and other actual 3D refractory/guard objects. Baseline saved SHA256 `221629095354e1c695e95b861c6630c1c9e55739f7fb1f04ea1e0277825bf252` (R94 preferred experiment). **Successful Blender topology is not source appearance approval**.

## Private real-source scores, original frames 1 & 33

Errors: normalized premultiplied RGB MAE [0,1] (lower better); edges: symmetrical Chamfer on image-gradient edges (lower better) and within 2px F1 (higher better). Native original against actual Blender images, same crop, no color correction/camera alteration. Textures and lighting also influence metrics, so inspect images before geometric acceptance.

| Actual physical R98 bell mesh | Full lower flare x25–238,y392–540 RGB | Mouth x48–215,y394–522 RGB | Nozzle interior x58–203,y424–540 RGB | Lower flare edge distance |
|---|---:|---:|---:|---:|
| **R94 baseline** | **0.073452** | **0.075590** | **0.056861** | **3.6843 px** |
| Terminal 1.35× width, -0.40 axial | 0.084846 | 0.082788 | 0.066352 | 4.4163 |
| Terminal 1.55× width, -0.65 axial | 0.090852 | 0.095325 | 0.066740 | 4.8993 |
| 1.55× with actual stepped metal shingle skin | 0.090895 | 0.095769 | 0.066220 | 4.8177 |
| Terminal 1.75× width, -0.85 axial | 0.092975 | 0.101202 | 0.066631 | 6.0872 |
| 1.75× with actual metal shingles | 0.093219 | 0.101848 | 0.066411 | 6.1101 |
| Progressive 1.55× | 0.096657 | 0.106916 | 0.067841 | 5.6152 |
| Progressive 1.80× | 0.106076 | 0.125626 | 0.083714 | 9.4388 |
| Progressive 1.80× with shingled metal | 0.106910 | 0.126901 | 0.084210 | 12.6446 |
| Long/wide 1.95× with shingled metal | 0.109132 | 0.130077 | 0.087564 | 13.3106 |

## Source-first conclusion

**REJECT all nine R98 expanded outer shell variants.** They create visibly gigantic, dark, smooth bell sleeves; they occlude the physically required original-like narrow radial refractory/fluted surfaces. Increasing the radius/length of the current generic sleeve, even if manifold and successfully rendered, is **opposite** the source image's source-visible shape segmentation. Do not chase RGB improvements by reducing contrast or darkening an obscuring surface. Stop repeating terminal-radius sweeps.

R98's failure is a useful causal finding: the existing broad external shell controls the incorrectly broad, smooth mouth shape. Next isolate/reprofile its **actual source-visible segmented occlusion** using real 3D bounded panels/cutouts; observe which sectors expose the EXISTING physical interior. Preserve true R94 experiment and existing R49 cast, fins, pressure rolls, cupped guards, camera and original 64 motion. Independently score actual original frames privately. Never publish Wube artwork. Shape/visual diagnostics are not release-blocking game-function tests.
