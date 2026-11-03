# R124–R125 one genuine rounded fin: source-oriented physical geometry refinement

## Authority and approved scope

The user's authoritative PRIVATE original Factorio thruster archive has exact SHA-256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`. Native original body frame 1 is 264x542; frame 33 is the companion motion comparison. Original source bitmap is NOT in public GitHub, CI or these artifacts. R124 and R125 use the R120 CLEAN engine bell + R123 correctly smoothed 3D central master: ONE real rounded finite-thickness sheet, no holes, no independent hand-scultped side fins, no old mounts.

## R124 implemented, rendered and verified

Run: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41576963561
Source: `tools/factorio-render-pipeline/refine_one_round_center_source_fin_r124.py`.
Artifacts: GitHub Actions `factorio-r124-physical-round-master-finned-spine-grooves-tip-and-patina` (ID 13204000991).

Four actual editable Blender variants: R123 control; pressed spine+shallow twin grooves and rolled toe (0.75 intensity); stronger same true metal deformation (1.15); and the 0.75 real metal form with a copied, independent dark mottled steel material. The changes are physical 3D mesh deformations to BOTH skins of the SAME 306-vertex continuous cylindrical central fin. Measured max real vertex displacement is 0.066210m (medium) and 0.101523m (strong). Stronger form's final lower source-camera left edge moved from x=121 to approximately x=127, closer to the user's reference, without replacing the bell or moving the original camera.

The dark steel version is perceptually closer to the original aged upper metal surface than the old uniform pale metal, but its blue distal toe was too muted. User original has a distinct blue/violet heat band wrapping over a physically rolled free edge. The central pressed spine also appears to terminate in the upper/middle section of the original, while the previous master visibly dragged its crease too far down.

## R125 implemented, rendered and verified

Run: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41577618203
Source: `tools/factorio-render-pipeline/source_blue_rolled_toe_one_master_r125.py`.
Artifacts: `factorio-r125-single-source-round-fin-short-ridge-and-blue-toe-models` ID 13204106611.

Three actual editable Blender candidates: the exact R124 dark control; the same real 3D form with a more localized violet/cobalt thermal band and bright rolled toe; and the blue-toe form with the physical narrow central stamped spine tapering out earlier (0.020480m maximum true mesh vertex displacement). Updated 1,216 real mesh face-corner heat material values, preserving 306 vertices and two finite skins, and left all other fin geometry, bell, camera, original color/material assignments outside the fin, and 64-frame lower motion untouched. Both frame1/33 original-camera output and three genuine isolated 3D oblique macro views saved and verified by successful Blender roundtrip. R125 is source-inspired and NOT VISUALLY APPROVED.

## Visual findings / stop rules

Local source-to-Blender contact comparisons actually reviewed: `r124_source_vs_real_3d_fin_refinements.png`, `r125_original_vs_rounded_blue_toe_3d.png` (private original source alongside actual Blender renders, never uploaded to GitHub). R125 restores an observable blue tip and upper steel color but currently produces too pastel/cyan and rather broad a bottom band compared to the original dark blue tempered metal and narrow bright rolled lip. Source central pressed spine has stronger, irregular cross-section than the current smoothed master. Actual original full engine hinge root metal is absent because the user explicitly scrapped all mangled upper geometry: do not reintroduce it until the one correct fin is adequately verified.

Do NOT promote R125 to source-perfect. The user's requirement is still **one accurate master model** duplicated with circumferential matrices; no per-fin silhouette hacks, fake through-slots, separate sculpted fins, giant upper rings, invented mechanical spaghetti or unrelated stock/concept art. Test physical shape at original camera plus oblique macro, not pixel mismatch count alone. Source appearance is diagnostic, never a release blocker for unrelated functional game tests.
