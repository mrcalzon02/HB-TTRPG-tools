# Source pixel audit — R101 physical R11, R102 real forty-flute liner, R103 merged forgings

**ONLY specification:** actual user's original Factorio body sprite archive `thruster.zip`, privately verified SHA256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`. Original Wube art and contact sheets are not uploaded to repository or public Actions. Native body frames **1 and 33** from the two original 2112×2168 atlas pages, original 264×542 pixel registration, fixed original Blender camera, unchanged frame resolution. All scores are two-frame average premultiplied RGB MAE 0–1, lower better; edge Chamfer in original pixels lower better. Numerical error is diagnostic, never proof of original CAD shape.

## Actual Blender execution and scene provenance

- [R101 source wall + first annulus #41515481591](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41515481591) **SUCCESS** after correctly repairing earlier overly strict throat-radius guard (original 0.11 tile terminal ring was falsely treated as collapsed by a 0.11 threshold). Artifact **13175207993** `factorio-r101-source-traced-r11-refractory-metal-model-candidates`, fourteen real Blender candidates, thirteen saved/reopened editable 3D files.
- [R102 true source-directed 20/40-flute liner #41514956340](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41514956340) **SUCCESS**, artifact **13174838482**. Thirteen original-camera Blender candidates, physical 3D mesh with forty connected flutes, editability/save/reopen verified.
- [R103 independent R97+R101 physical geometry merge #41515498651](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41515498651) **SUCCESS**, artifact **13175157941**. Actual 3D cast+torus geometry combined, not images overlaid; unchanged R19 plates, 64-frame animation, camera and physical contacts.
- Each uses SHA-verified real R94 source working scene; actual functional game art never overwritten. All source-shape checks are diagnostics (not build release blockers).

## Private source benchmark: R101 formed metal

| R101 real physical R11 geometry candidate | Mouth RGB x48–215,y394–522 | Inner nozzle RGB x58–203,y424–540 | Lower flare RGB x25–238,y392–540 | Mouth edge Chamfer px |
|---|---:|---:|---:|---:|
| R94 baseline | .075590 | .056862 | .073452 | 4.846 |
| **First baffle moved +.14 Y and -.14 major radial** | **.066821** | **.051408** | **.068131** | **3.952** |
| First baffle +.16 Y and +.16 radial | .068816 | .056321 | .068620 | 4.043 |
| First baffle +.18 Y no major shift | .069228 | .054650 | .069747 | **3.845** |
| Physical fluted liner outward .12, first baffle +.18 Y | .069684 | .054786 | .070058 | 3.950 |
| Liner outward .12 alone | **.076263 (worse)** | .057394 | .073921 | 4.833 |
| Liner outward .20 alone | **.076419 (worse)** | .057382 | .074042 | 4.811 |

**Engineering decision:** Preserve `baffle00_recess_inboard_014.blend` as a leading unapproved physical 3D test. Moving one actual 320-vertex existing annular band out of its wrong source occlusion is ~11.6% lower mouth RGB, ~9.6% lower inner-nozzle RGB, and ~7.2% lower full-flare RGB than R94. The alternative +.18-Y variant is better on mouth edges but weaker on inner source pixels. Reject blind uniform liner expansion; it makes this original source match *worse*, despite being valid geometry.

## Private source benchmark: R102 independent real liner re-mesh

| R102 genuinely different source-rig liner | Mouth RGB | Lower flare RGB | Mouth edge Chamfer px |
|---|---:|---:|---:|
| R94 baseline | .075590 | .073452 | **4.846** |
| 40 true stitched flutes, near-profile groove .18 | **.074995** | **.073039** | 4.937 (worse) |
| 40 true stitched flutes .10 | .075537 | .073420 | 4.859 |
| 40 true stitched flutes, outer clearance .16 | .075674 (worse) | .073513 (worse) | 4.819 |

**Engineering decision:** R102 proves real physical 40-channel Blender modeling and camera consistency, but still fails to recreate the source-observed profound fluted stamped refractory appearance. Do not promote on a tiny RGB gain. Further tiny changes of flute pitch/depth are diminishing returns. Proper original source-observed front exposed segmented surfaces/overlaps are still needed.

## Private source benchmark: R103 actual merged mounting forgings + first annulus

| Actual saved original-camera R103 combined Blender mesh | Right source cast RGB | Complete source hinge RGB | Source mouth RGB | Mouth edge Chamfer |
|---|---:|---:|---:|---:|
| R94 baseline | .140695 | .137997 | .075590 | 4.846 |
| R97 right chamfer + left heel with R101 +.15-Y real annular band | .129409 | .134007 | .068871 | 3.963 |
| **R97 both distinct stepped forgings with R101 +.15-Y real annulus** | **.126933** | **.133343** | .068871 | 3.963 |

The right-chamfer/left-heel variant has **better original right-cast edge contour** (right Chamfer about 1.891 px) than the lowest-RGB both-stepped variant (right Chamfer about 2.030 px). Keep both candidate scenes available; RGB reductions alone are not original-CAD acceptance.

## Next real Blender physical experiment

[R104](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/workflows/factorio-merge-original-forgings-baffle-r104.yml) tests *new R101 inward/outboard/axial baffle alternatives* with both R97 unlike side forging contours. Every proposed full 3D scene must be re-rendered, saved/reopened, and privately scored against the genuine original body frames. Preserve original R19 plates, right wire, 64-frame motion, all actual source camera registration and unchanged calibration baseline.

Large remaining source mismatches persist in layered refractory, hanging fin shapes and source-unequal upper hinge castings. Do not declare completed artwork. Visual checks are nonblocking diagnostic requirements only.
