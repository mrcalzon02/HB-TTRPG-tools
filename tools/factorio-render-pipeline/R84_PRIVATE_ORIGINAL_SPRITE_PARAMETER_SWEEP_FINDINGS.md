# R84 real Blender source alignment / size / tilt speculative experiment

User directive: **Original Factorio sprite is the goal**; test combinations of actual 3D cast geometry position, size, tilt and alignment speculatively, then observe whether they converge toward or diverge from the real source. Never substitute our prior model as the source reference.

## Execution and privacy

Real native Blender 4.5 Actions run [#41407182619](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41407182619) **SUCCESS**, artifact ID **13123972729**, `factorio-r84-real-mesh-individual-mount-19-hypotheses`, 19 original-camera true 3D geometry hypotheses × frames 1/33 = 38 actual 264×542 RGBA renders.

The unchanged baseline is R81 SHA256 `0a8de6ccfe693726f71af8b5cfa4bfb44d5c7044d83607c20ba9019af58a803d`. Real 3D tests lock every existing mount-to-fin root contact and mount-to-hull R64 support anchor, plus identical fin meshes and 64-frame animations, calibrated source camera, material graphs and all other model parts. No new geometry, cast, hinge, ring, actuator or overlay.

Private local comparison SHA256-verifies original user archive `thruster.zip` `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`. Actual original body frames 1,33 extracted privately from original atlas. Numeric ROI scores only are recorded here; original artwork NOT in public GitHub or Actions.

## Results: exact native original (both source frames)

All values are 2-frame normalized premultiplied RGB MAE 0..1 (lower better). Source-camera ROI left x27:90,y314:358; center x95:163,y311:339; right x166:220,y313:356. Edge scores are source-luminance contrast mask proximity within two native pixels: texture and shadows can create edges too. These are diagnostics, not proof of authentic CAD.

| Existing physical casting | Test | Original RGB MAE | Original internal-edge recall |
| --- | --- | ---: | ---: |
| Port/left | No edit | 0.192513 | 0.558 |
| Port/left | **13% width compression** | **0.184843** | 0.557 |
| Port/left | +7px camera X | 0.188952 | 0.515 |
| Port/left | -7px camera X | 0.190728 | 0.530 |
| Port/left | +0.16 shear | 0.190599 | 0.509 |
| Port/left | 13% wider | 0.197403 | 0.531 |
| Center | No edit | 0.202467 | 0.209 |
| Center | **-6px native Y** | **0.187435** | 0.303 |
| Center | **18% height compression** | **0.187493** | 0.305 |
| Center | -6px native X | 0.195983 | 0.318 |
| Center | +6px native Y | 0.199270 | **0.432** |
| Center | +6px native X | 0.208638 | 0.244 |
| Center | 18% taller | 0.215651 | 0.193 |
| Starboard/right | No edit | 0.179810 | 0.346 |
| Starboard/right | **13% width compression** | **0.172797** | 0.370 |
| Starboard/right | -7px native X | 0.174921 | 0.321 |
| Starboard/right | -0.16 shear | 0.178515 | **0.392** |
| Starboard/right | +7px native X | 0.185638 | 0.397 |
| Starboard/right | 13% wider | 0.186475 | 0.323 |

### Interpretation

- Both port and starboard castings are demonstrably **overwide** near their original source mount bboxes. Compress each original existing shell 13% about its source-camera center, while keeping actual upstream R64 hull contact and original R55 fin-root joint pinned. The two source castings are NOT interchangeable: their detailed profiles remain unlike the original regardless of generic width edits.
- Center casting is more misplaced/oversized: either shifting the **free movable metal skin** up 6 source pixels or vertically shortening it 18% materially improves RGB error. Distinct center source edges respond much more to moving the skin downward 6 px, though this raises color error and exposes extra structure unlike the source visual. Source visual inspection shows up and short candidates still have overly smooth, bright/grey metal. Neither should be automatically accepted without comparing combined candidate images.
- Keep R83 60% **angular** fin straightening as working direction; it improves real original three-fin region 0.125270→0.125022 but is a very small gain. R82 global linear chord failed source fidelity by collapsing real radial clearance; never repeat.
- These R84 differences are direct evidence of a useful optimization signal, not a solved source match. Now combine candidate changes in **actual editable Blender** and compare full multi-part interference across two frames. Run targeted refinement on the center bridge and two asymmetric cast shoes, eventually detail surface shape and material against the actual original frames.

**No game build/releases may be blocked by art/visual diagnostics.** Do not edit/copy the original proprietary sprite into public repo or use generated images as independent source. Baseline originals remain untouched.
