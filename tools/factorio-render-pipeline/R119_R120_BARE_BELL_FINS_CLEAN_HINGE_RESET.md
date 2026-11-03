# R119–R120: original-source fins and bell clean restart

Decision, 2026-11-02: the user rejected the old speculative hinges, upper piping, collars and black pressure-roll arch. Preserve the existing real metal fins and open engine bell, remove all irrelevant upper topology, then build new hinges from basic physically volumetric primitives.

## Original source authority

The actual private original is thruster.zip SHA256 0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791, containing two 2112x2168 8x4 native atlases, with individual 264x542 frames. This was recovered and hash verified directly. Only the original source is a visual authority; public CI never receives the source sprite. Compare genuine frame1 and frame33 to same-camera actual Blender renders. Do NOT reproduce the visual architecture from imagined rocket engineering or old incorrect Blender models.

## R119 measured clean cutoff

Successful run https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41570173645. Script strip_to_bell_fin_inventory_r119.py. Counts: 432 original mesh or curve owners; 389 originally rendered. Full scene and two model-only isolated views were rendered without altering the input.

## R120 created genuine simplified editable Blender scenes

Successful latest full CI: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41571289287

Script rebuild_bare_bell_fins_three_simple_hinges_r120.py. Each newly created and reopened .blend physically removes 234 obsolete mesh and curve objects and keeps 198 legitimate metal fin and engine bell objects: all 10 original fins, the real nozzle metal and open interior (160 cone members), 24 original lower inner liner elements, aft reaction drum, refractory throat and bell lip. Original source historical .blend files are not overwritten.

The three variants are: bare_original_bell_and_ten_metal_fins.blend (no hinges); three_simple_forged_root_pads.blend (one true finite volume simple bar per main fin); three_basic_pads_and_plain_pivot_axles.blend (the previous three bars plus a single short dark actual 3D axle for each). There are no old R89/R49 hinge owners, no R113-R115 tabs, no overhead pipes and no R08 black pressure-roll arch.

All three new mounts are positioned on the actual first upper row of the original preserved 3D source fin sheet. Native original-camera root screen positions: left fin (42,344)–(75,339); center (100,328)–(153,328); right (174,344)–(212,351).

The first R120 axle model was invisible behind each root pad, which actual native renders identified. Repaired by moving only the three physical axle solids forward of the pad in 3D camera-depth, and assigning their own dark-metal material. The latest R120 render now visibly differentiates root bars from the simple axles.

QA passed: all original retained fin vertex/face geometry, all relevant original shader slots, 64-frame lower-fin motion and world matrices of every fin, source camera, saved/reopened Blender scene, nondegenerate closed 3D new hinge solids, native frame1 and frame33 renders and real oblique geometry views. Visual approval is NOT claimed: these are deliberately basic hinge starter parts; source has three different asymmetrical forged hinge roots and more complex surface/form.

Future hinge revision must ONLY change the individual shapes and placements of these small root supports and the connection to existing metal fins and the bell. Do not restore the giant upper fixture, invented rings, greebles or melting petal curvature. Cosmetic shape review is diagnostic and cannot block unrelated game builds.
