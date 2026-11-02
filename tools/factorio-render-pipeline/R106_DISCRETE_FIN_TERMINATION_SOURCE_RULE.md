# R106 source-directed rear-fin termination: required correction

**Authoritative visual specification:** the user's authentic Factorio body sprites from `thruster.zip` (SHA-256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`). Original private source art must not be committed or uploaded to public GitHub Actions.

## User-corrected 3D interpretation

The rear (engine-facing) end of each visible slotted metal heat fin is a **discrete abrupt end at the machine/body joint**. It must not taper continuously aft/forward into the rocky/refractory body behind the slots. The source exhibits separate material and physical pieces; their surfaces may touch, overlap with a break, or terminate at an observable seam. **A universal 'fin must be attached to an imagined casting at the old vertex row0' rule is invalid as a geometry acceptance requirement.** This was a reconstruction error, not a source physical constraint.

The original R21 fin has ten axial rows of eleven vertices per skin (220 vertices per static fin), with six actual open punch cells in the row2–4 region. Its earliest row0 is substantially forward of the slits, and subsequent R49 stretch artificially extended that visible upstream sheet toward the housing. Later scripts repeatedly forced original row0 contact to remain, preventing accurate termination.

## Physical R106 correction

1. Use the existing R103 real Blender source-reviewed working 3D scene with unlike R97 mount castings and R101 correctly recessed real first baffle. Do not touch the older saved inputs.
2. **Delete real upper-sheet row0 geometry** on each selected R21 fin. Rebuild both existing front/back sheets using only rows1–9 (198 real vertices), preserving every existing genuine slot face and the complete visible row2–9 fin/tip silhouette.
3. **Cap the actual new proximal end with ten real material-thickness quads**, retaining the original material and `R21_heat_tint` per-corner colors. Assert all mesh edges have two incident physical faces: the fin itself is still a solid formed metal piece. This does not require any fictional 3D weld through the motor.
4. Test a second, more pronounced rear-root cutoff by moving the new end row1 progressively toward the first slotted row2 **without touching row2 or anything beyond**. Test source-independent main 3 versus all upper 5 and unequal stop positions for each fin; original assembly is bespoke, not ten copies of one root.
5. Preserve the entire original mesh structure **outside selected upper fins**: R97 different castings, nozzle liner and 80 R19 scales, all materials/camera, native rendered frames1/33, untouched 64-frame lower-keyed fin animation. Real fin-casting old row0 distance is intentionally no longer a release gate.
6. Rank the actual native source frames against Blender rendered images **privately** on the root/slot regions and overall image; use both RGB MAE and edge correspondence, and inspect the visible physical cut. If an apparently improved pixel score actually worsens the source shape or creates a floating fin, reject it.

**Current new artifact:** `physical_chop_rear_fins_r106.py` plus `factorio-cut-rear-fin-extension-r106.yml`. Geometry remains experimental until Blender saved/reopened and original-source compared. Visual checks are diagnostics and never block functional game releases.

## Next stage after validation

If R106 source comparisons confirm the discrete ends, integrate the approved fin cutoff into the newer R104 composite scene by updating only the existing fin meshes, not the refractory nozzle, and verify multiple original animation frames. The opposite direction—stretching the fin back to hide the mounting seam—is explicitly disallowed.
