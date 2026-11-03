# R116–R118 recovery after original-source drift — 2026-11-02 (Sitka)

## Authority, now reverified

The ONLY appearance authority is the user's actual **private** `thruster.zip` archive in their Library (root, not a generic image search), with SHA-256:

`0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`

The two true body atlas pages are `thruster/thruster-1.png` and `thruster/thruster-2.png`, each 2112 × 2168 RGBA, eight columns × four rows of native 264 × 542 frames. The source archive was actually retrieved again and its checksum matched exactly. **Do not substitute screenshots, concept art, online images, or a previous Blender render as source.** Do not upload the proprietary bitmap to public CI. Frame 1 and frame 33 were actually compared locally in this revision.

The repeated R108/R109 flared cupped heat fin, R113 rectangular root pips, R114 notched root pips, and R115 overwide guessed cast shoulders **do not match the original**. Mechanical simulation assumptions (everything permanently joined, round hinge pins/rings, a realistic sci-fi thruster) are not visual authority. Real pixel-appearance comparisons of **3D forms** beat generic engine plausibility or pixel MAE alone.

## Corrective physical Blender work executed

- **R116:** Rebased on the independently saved, verified R108 `cut_only_three.blend` before its stronger/melted-looking metal curvature, rather than stacking later art mistakes. Generated three EDITABLE true 3D Blender variants: original R108 control, `original_straight_sharp_fin_main_three`, `original_lateral_heel_and_blunt_tip`. Reshaped the actual **two skins** of each of the central three fins, using individually traced original first-frame source landmarks. Retained their existing native 3D depth, real thickness, shader attributes, slots, nonedited outer parts, and all 64-frame lower motion. Source camera frame 1 and 33 and 35° oblique rendered; save/reopen checks passed. [R116 run 41566734389](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41566734389). The new fins are visibly straighter and less melted. **Not approved**: original source still has different detailed metal surface, mounting roots, and surrounding chassis.
- **R117:** On the R116 corrected source scene, hid seven actual 3D owners individually and rendered from the original source camera. Physical mesh owner bounding boxes in source pixel coordinates: port R89 cast (39,297)–(88,352), center R49 saddle (94,312)–(164,336), starboard R89 cast (166,307)–(219,360). Original source rough mount zones are port (34,304)–(97,356), center (96,307)–(163,341), starboard (159,303)–(230,360). This isolates the *real* incorrect geometry before replacement. Four `R08_black_exhaust_pressure_roll*` owner meshes contribute to the oversized dark arch; do NOT delete every roll. [R117 successful run 41567436050](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41567436050). First audit rerun failed due pinning binary `.blend` hash from an earlier run rather than same-run R116 manifest; validation now checks the manifest actually generated during that run.
- **R118:** Reformed the **three EXISTING** R89/R49 actual mounted source cast meshes with original camera-bound source landmark zones and separate port L heel / starboard heel / center tab alternatives. No new hinge objects or pips. The R116 corrected metal fins and all other existing meshes, pressure rolls, and lower motion were checked unchanged. Control, source-zone registered, and distinct L-support variants saved and reopened as actual Blender scenes. [R118 verified run 41567961312](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41567961312). **Not visually approved**: true original source castings remain heavier, more articulated and irregular than the rebuilt thin/smooth R118 ribbons, and the black round arch is still prominent.

## Source-based actual shape findings

In original frame 1, the three central upper fins are sharp, comparatively straight, and differently slanted metal sheets. Original source native pixel landmarks for candidate physical registration (left root corner / right root corner / left toe / right toe): main left `(42,344),(75,339),(55,409),(82,398)`, center `(100,328),(153,328),(104,391),(148,391)`, right `(174,344),(212,351),(181,394),(212,406)`. They show distinct free tip slopes and abrupt root ends. The original mount castings are unequal, complex mechanical forgings: port is an L/kinked folded shoulder, starboard has unlike stepped edges and the routed red lead, center compact ivory casting has individual downward retaining tabs. The current R118 side castings still lack the original's irregular stamped sections, visible dark cut-ins and compact hinge-root depth.

The current model's broad black arch is a 3D pressure-roll/collar problem separately proven by R117 owner isolation; source does NOT justify inventing a new ring, deleting all four rolls, or covering the model with a source texture. Maintain R116 heat fin geometry while making owner-specific cast/collar changes. When comparing, show REAL original sprite alongside actual Blender camera renders from frames 1 and 33; also inspect non-source camera physical 3D volume so the assembly is not a disguised sprite card.

## Decisions and discipline

- R109–R115 **rejected as visual baselines** (original artifacts remain preserved; do not destructively delete historical runs).
- R116 corrected-fin geometry is a better starting hypothesis than R109/R115 fins, but NOT source-approved.
- R118 source-zone geometry is an unapproved alternative; do not silently promote it as the actual design.
- Current next target: reconstruct substantial *unequal existing* source mount metal sections and selectively reprofile the actual dark R08 pressure-roll owner, not another set of cosmetic bolts/pips or global shape metrics.
- No original proprietary sprite on public GitHub or in Actions artifacts. Original archive remains available privately for direct inspection and validation.
- Cosmetic/source shape matching is diagnostic, never a release blocker for functional game builds.
