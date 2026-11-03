# R121–R123: reconstruct one genuine ROUND central fin; use transforms for all copies

Date: 2026-11-02 (America/Sitka). The user explicitly corrected the previous reconstruction strategy: all fins are the SAME underlying 3D part, seen under circumferential rotations, differing distances/camera occlusion, and maybe slightly rotated common hinge matrices. The actual fin is curved/round, not a separate invented flat sheet for every visible sprite silhouette.

## Sole source of truth

User's PRIVATE original archive thruster.zip, SHA256 0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791. Individual body frames 264x542 from two 8x4 atlas pages. All source art remains private; public CI receives only our authored editable Blender models and renders. Never accept an unrelated internet image or rendered previous model as appearance authority.

## Critical causal failure found

The original source central fin has a continuous, curved pressed metal surface with a rounded blue-annealed toe, and a narrow longitudinal pressed spine. Previous R21 source-fin models had two VERY conspicuous through-slots and separate hand-fit flat geometry for each fin: visually false. R116 then hand-fit three 2D silhouettes instead of solving one real 3D master and its rotations. R120 removed 234 incorrect upper body meshes and preserved bell and 10 fin objects. Reuse this clean base.

R121: built a NEW physically continuous cylindrical finite metal shell, 306 physical vertices, 304 faces, 608 manifold edges, 17 cross-section columns x9 axial stations, two actual skin layers with real sidewall thickness. No false punched slots. Rounded toe and heat tint remain. Tested 40px cylinder radius (sagitta ~6.2695px, real world .086291 m) and 58px (sagitta ~4.1321px, world .056873 m). Source native front renders, frame33 and actual oblique views saved. REAL shared mesh linked across left/center/right test: all three fin objects point to exactly the SAME mesh datablock and are separately positioned by real ±36 degree circumferential matrices plus small root registration translation. No per-fin re-sculpting. The original bell, original lower 64-frame animation and all unedited fin meshes were verified unchanged. Successful run: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41573644701.

R122: preserved true R121 curved master and tested integral narrow raised center spine heights 0, .025m and .055m, plus .035m darker heat-tinted material. Real mesh vertices moved and closure/finite physical thickness passed, but native 264px renders barely changed visually. Successful run: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41574133364.

R123: isolated actual Blender central fin with temporary front/35/65 degree orthographic macro cameras, a temporary neutral area light, and all unrelated assembly hidden ONLY during diagnostic render. The central fin appears as a real rounded/arced 3D body, not a flat plane or sprite card. This revealed the previous master inherited the legacy R21 'Edge softening on thin folded sheet' WEIGHTED_NORMAL modifier. That modifier belonged to the false old planar slotted sheet and muted curved surface response. Two NEW R123 editable candidates remove this single legacy modifier and smoothly shade exactly 256 main front/back surface quads; sidewall faces remain sharp. Geometry vertex coordinates, original bell, 64-frame animation, other fins, source camera and all non-target objects are unchanged; tested save/reopen. Results are visible in actual 640x640 macro renders at 0/35/65 degrees. Successful run: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41574602503.

## Current preferred test candidate (NOT source approved)

Use R123 editable 'r123_strong_pressed_spine_real_smooth_curved_normals.blend' as central curved-fin **geometry diagnostic** and use the R123 'r123_dark_center_spine_real_smooth_curved_normals.blend' for alternative material tone. Both are in R123 artifact. Do NOT assert pixel-perfect match or source approval. Color/heat gradient is far too smooth and pale, and the original source has real wear, rolled blue lip detailing and complex cast hinges. Original frame 1 source macro clearly shows stronger stamped ridge and darker scuffed metal than either model.

## Next bounded work

First finish SOURCE-ACCURATE canonical center fin: evaluate actual 3D arc radius with strong neutral directional lighting, root/tip widths and rounded free lip, central ridge depth and material patina against the authentic private source. Do not chase metric-only pixel error or invent through-holes. Then duplicate the exact same master mesh to all warranted circumferential slots by object matrices, adapting the existing lower-fin source motion rather than abandoning it. Finally add ONE simple hinge family with its own rotational matrices; do not reintroduce the old R89/R114/R115 mangled upper mounting topology. Material/appearance tests are diagnostics, not release blockers.
