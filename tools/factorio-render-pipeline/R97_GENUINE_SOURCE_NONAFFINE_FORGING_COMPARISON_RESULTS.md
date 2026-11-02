# R97 — genuine original-sprite score after nonaffine sidewall/forging geometry tests

## Source and verified execution

Exact private user's Factorio `thruster.zip` SHA256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`; **true native body frames 1 and 33 (264×542)** extracted from original two Wube atlas pages. Private source bytes remain OUTSIDE the repository and ALL public GitHub Actions artifacts.

- Actual Blender 4.5.15 LTS [R97 successful native render workflow #41504074348](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41504074348).
- Artifact ID **13170717393**: `factorio-r97-source-traced-asymmetric-large-forged-sidewalls`. Actual 10 independent saved-camera cases x 2 true renders; 9 genuine separately editable, saved/reopened 3D scene candidates. Baseline is SHA-verified selected R94 source model (working candidate only), not an accepted production asset.
- Real 3D forming changes: unlike left/right source-traced R89 bodies, upper cast sections and heels, with front/middle depth facets and optional separately reprofiled true upper/heel sidewalls. Existing R49 physical hull/fin root anchors and all original 64-frame fin animation unchanged.
- RGB MAE = two-frame mean, source/render alpha-premultiplied against black, 0..1 normalized. **Lower is better. Visual and geometric shape judgment is mandatory alongside these numbers**.

## Source original vs R97 physically different Blender models

| Actual real 3D case | Left x27–90,y314–358 | Right x166–220,y313–356 | Entire mounts x26–225,y298–420 | Right upper x162–231,y300–345 |
|---|---:|---:|---:|---:|
| R94 baseline | .1594246 | .1406946 | .1379966 | .1296067 |
| R96 combined lower-pair control | **.1579569** | .1300998 | .1367957 | .1239373 |
| Right body DEEP chamfer | .1594254 | .1294087 | .1369104 | .1239094 |
| Right body narrowed/stepped | .1594240 | .1405876 | .1380742 | .1262387 |
| Right upper actual sidewall cut | .1594235 | .1375477 | .1372320 | .1232135 |
| Right heel real offset | .1594248 | .1389404 | .1378100 | .1284871 |
| Left upper drop/chamfer | .1610078 | .1406944 | .1382615 | .1296052 |
| Left heel forward spur | .1582366 | .1406944 | .1378448 | .1296065 |
| **Both genuinely distinct stepped sidewall parts** | .1582387 | **.1269325** | **.1360607** | **.1175037** |
| Right deeper chamfer + left heel control | **.1579569** | .1294090 | .1367330 | .1239094 |

**Best complete-region source-image result**: R97 `both_stepped_actual_sidewalls.blend`, unpromoted saved editable test scene. Compared to R94: right primary hinge ROI improves **~9.78%**, right upper ROI improves **~9.34%**, entire hinge ROI improves **~1.40%**. Another case `right_chamfer_plus_left_heel` gives slightly better left ROI / three-fin overlap; choose only after inspecting actual source contours, not by conflating several scores.

**Reject/not promote:** `left_upper_drop_chamfer` makes the actual left ROI ~0.99% worse, and `right_body_narrow_stepped` does not meaningfully improve the full mount. Deep chamfers with numerically better RGB are still visually coarse and broadly overlapping relative to source.

## Supplemental ORIGINAL-source edge/contour test — geometry over simple color

After visual comparison, the RGB-only winner required a separate source-edge audit so darkened surfaces would NOT masquerade as improved casting contours. Local private diagnostic: original and Blender 264×542 RGBA frames 1/33, same fixed ROIs; alpha-premultiply black, grayscale, Gaussian sigma 0.75, top 23% image gradient magnitudes per ROI, signed symmetric Euclidean Chamfer distance between pixel edges (lower better), and mutual edge F1 within 2 source pixels (higher better). Values are averages of the two actual frames. The threshold is a *diagnostic*, not source CAD truth, and texture edges can still influence results.

| Real 3D source-casting candidate | Right casting edge F1 | Right casting Chamfer px | Right upper Chamfer px | Left casting Chamfer px |
|---|---:|---:|---:|---:|
| R94 baseline | 0.601 | 2.049 | 2.121 | 2.335 |
| Both stepped — **best right RGB** | 0.614 | 2.032 | **2.195 (worse)** | 2.242 |
| **Right deeper body chamfer + left short heel** | **0.647** | **1.908** | **2.092** | **2.238** |
| Right upper sidewall cut | 0.624 | 1.946 | **2.072 (best)** | 2.335 |
| R96 combined original heel/body control | 0.602 | 2.069 (worse) | 2.221 (worse) | 2.238 |

**Important correction to any RGB-only selection:** The `both_stepped_actual_sidewalls` case has the lowest right-region *RGB* error, but the `right_chamfer_plus_left_heel` case aligns the original right **edges better** and also improves left mounting shape. Its right casting edge F1 rises from ~0.601 baseline to ~0.647. The right upper sidewall cut is independently promising on source upper contours. The RGB winner is NOT automatically the correct physical 3D forging. Do not promote a darkened yet wrongly shaped surface.

This comparison reinforces retaining R97 candidates for targeted physical shape reconstruction rather than declaring a matched thruster. The severely wrong dark round lower mouth still requires source-directed real refractory mesh correction.

## Honest remaining source-shape discrepancy

The original shows distinct irregular pale castings, staggered forged shoulders, red wiring on right, deep metallic sidewall relief, hanging blue-purple heat fins, and a very large **externally visible shingled/fluted bell**. The Blender saved original camera renders still show smooth gray mechanical overlaps and an excessively dark circular mouth. Improving a cropped right-side score is not a substitute for reconstructing these real 3D objects.

R98 now separately experiments with true physical flare profile and sectional/overlapping 3D surface in the lower nozzle. Run R98, privately score the genuine original two frames, inspect actual 3D and source face correspondence, and retain R94 rollback. Work should progress beyond RGB intensity improvements to real physically formed surfaces and correct source-relative silhouette.

**Release policy**: all visual shape tests are diagnostics, not functional build/release blockers.
