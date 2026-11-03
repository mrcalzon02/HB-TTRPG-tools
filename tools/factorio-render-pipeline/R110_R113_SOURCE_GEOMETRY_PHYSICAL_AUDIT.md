# R110–R113 geometry-first original thruster reconstruction audit

Only the original private Factorio thruster atlas is the appearance authority. Do not substitute unrelated images or rank candidate designs merely by pixel-error numbers. This document contains **no original proprietary sprite** and no claim that Wube original CAD has been recovered.

## Executed real Blender geometry tests

- R110 successfully edited **three existing** distinct mounting cast bodies: port, center and starboard. [Verified R110 run 41557032680](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41557032680).
- R111 replaced the old fragmented port and starboard cast layer meshes with distinct **continuous, manifold, finite-volume** cast shoulders, 81 vertices/81 faces at port and 65/65 starboard. [Verified R111 run 41557746960](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41557746960). **Visible problem:** R111 used the old multiple-piece casting's entire ~1.3-unit camera-depth envelope for a single new plate, so the side mounts looked like bulky smooth stone pillows, a poor match for the source.
- R112 **corrected actual 3D mount thickness**, preserving the source-derived left/right outlines and 3D closed topology. Source-camera thickness: thin forged 0.1439; stepped lap 0.1708; shallow pressed 0.2138 model units. [Verified R112 thin-plate run 41558681286](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41558681286). **Visible problem:** the broad plate shape is still too smooth, lacking source-visible metal folds and a correctly articulated root interface.
- R113 added unique physically closed, individually parented solid metal retaining lugs to the real R112 source mounts. 0/6/4 lugs for the respective baseline/full/outer variants; each five-sided source-footprint lug is a genuine closed 10-vertex, 7-face, 15-edge metal volume. Saved/reopened `.blend`, source-camera frame 1 and 33 and oblique 35° true-3D geometry renders. [Verified R113 run 41559308641](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41559308641). **Visible problem:** they still read as little rectangular pips rather than the source's articulated, irregular cast retaining brackets. This is NOT an approved source-accurate match.

## Collars and remaining geometry

A separate original-source collar ownership diagnostic [run 41557819290](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41557819290) isolated existing actual 3D owner objects: `R08_black_exhaust_pressure_roll*`, `R08_subchamber_cast_band*`, `external_machined_pressure_band*`, and `R15_bellows_end_collar_*`. In real Blender renders, hiding the black pressure roll removed the conspicuous dark circumferential upper ring and exposed the shell behind it. Do NOT blindly delete all collar parts: distinguish the wrongly placed dark pressure roll from genuine front bands and bellows collars. A separate [R112 rear-roll shaping workflow 41558775372](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41558775372) also reports success and must be examined for integration rather than duplicated.

## Next geometry priorities

1. Replace tab-like R113 retaining lugs with actual source-shaped, irregular mechanical interfaces: thin folded lips, holes/gaps, stepped hinges and nonuniform attachment shoulders. Avoid another identical cylinder/pin ring.
2. Compare the actual full 3D cast sidewall and fin-root volumes at the original camera and in angled native Blender views; keep the `R109` physical fin sheets and animation fixed while testing mounts.
3. Consolidate the necessary reshaping of the unwanted dark R08 upper roll from its successful independent test with the working physical shoulder/fin models only after verifying the combined scene and preserving genuine original bells/nozzle.
4. Verify both original animation frame 1 and 33, restored native orthographic camera, all unrelated original bodies, 64-frame lower-fin motion, shader slots and reopened true editable Blender scenes.
5. Cosmetic/source-image comparisons are diagnostics, not release blockers. **None of R110–R113 is visually approved**, even where topology and saves have passed.

Scripts/workflows live under `tools/factorio-render-pipeline/` and `.github/workflows/`; native successful Actions artifacts retain editable scenes and actual 3D renders. No original sprite is published.
