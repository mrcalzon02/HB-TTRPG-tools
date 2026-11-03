# R126–R127: remove the invented fin hook and lengthwise 3D curl

User correction (2026-11-02, Sitka): The source is a fairly square-edged fin PLATE with a ROUND/pressed cross-section, not a hook or crescent sweeping right. Repeated right curl was caused by earlier reconstruction, not verified original geometry.

## Root causes — identified precisely

R121 manually source-shaped three supposedly distinct projected fin silhouettes. The R121 central source-camera 3D generator set ROOT=(110,329,153) and TIP=(121,392,150), turning a 43-pixel root into a 29-pixel tip. This unnecessarily swept its left edge 11 pixels to the right. R124 compounded the error by adding an asymmetric lateral tip shift of .75*(5.2*(1-u)/2 -1.1*(1+u)/2) near the distal end, displacing the left tip rightward about 3.9 pixels more. R125 inherited those deformations. Neither was supported by the original nearly rectangular plate.

Critically, the R121 round 3D mesh also inherited a lengthwise camera-depth progression from the old individually sculpted R107/R116 fin forms. R127's physical inspection measured an enormous **1.005370 meters** of root-to-toe camera depth rake in this central fin. That 3D sweep STILL visibly distorted the outline in 35-degree oblique Blender views, even after correcting the source-camera X/Y silhouette in R126.

## R126 — actual native screen silhouette fixed

Successful real Blender workflow: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41595863349

`tools/factorio-render-pipeline/straight_square_edge_master_fin_r126.py` creates three saved/reopened genuine metal meshes plus the historical incorrect R125 control, all with original 306-vertex TWO-sided thickness, raised central ridge and existing material, using source-camera root (110,153) and near-level end. The correction preserves all existing 3D camera depth for causal isolation.

- `r126_square_full_width_plate`: left/right root to toe x displacement 0/0 pixels.
- `r126_original_nearly_parallel_square_plate`: left/right root to toe x displacement +1/-1 pixels.
- `r126_mild_symmetric_plate_taper`: left/right root to toe x displacement +2/-2 pixels.

All three have almost straight parallel sides and level square-ended toe in the original source camera, without changing the 64-frame lower fins, engine bell, other fins, original camera or global original materials. The original sprite's lower corners are somewhat rounded; this is for later subtle silhouette fitting, not permission to restore a curved hook.

## R127 — actual underlying 3D axial bend removed, not merely hidden in a camera view

Successful real Blender workflow: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41596544504

`tools/factorio-render-pipeline/remove_axial_curl_real_3d_square_master_r127.py` starts from verified R126 near-parallel plate. It measures both physical metal skin edge depths at every axial row and removes the old nonlinear axial bend by translating each cross-section along the camera depth axis. The entire 17-column two-skin cross-section moves together, preserving its genuinely arched/rounded metal face, formed central pressed ridge, thickness, original X/Y silhouette and thermal material. No fake topology/slots or new hinge objects.

- `r126_source_square_profile_inherited_axial_curl_control`: old 1.005370 m axial sweep; obvious C-shaped hook at 35 degrees.
- `r127_square_plate_no_axial_curl`: end-to-end depth rake approximately 0.000000 m, real square plate with constant axial depth, source-camera silhouette delta <0.0001 pixels.
- `r127_square_plate_mild_original_root_rake_025`: 0.251343 m linear axial rake; maintains straight generator edges, moderate lean.
- `r127_square_plate_half_old_root_rake_050`: 0.502685 m linear axial rake; no nonlinear curl but substantial tilt.

All three R127 physical variants succeeded with real Blender source-camera frame 1/33, isolated 0/35/65 degree photos, editable `.blend` saved and reopened, finite closed 3D shells, untouched central transverse curvature, no source-camera silhouette movement, original engine bell and 64-frame lower animation protected.

**Working master recommendation:** R127 `r127_square_plate_no_axial_curl.blend` is the cleanest structural starting point for later source-based small edge radius and master hinge matrix orientation. The 25% rake candidate is saved as an alternative but should NOT be selected based on a guessed hinge tilt; the original source lacks an oblique physical reference. No appearance-perfect source approval is claimed. Side fins remain the old original rig; do not copy/promote new master to every fin until master is visually approved.

Appearance is diagnostic, never a release-blocking game-functional condition. Source original `thruster.zip` SHA256 0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791 remains privately held and was not uploaded to public GitHub/CI.
