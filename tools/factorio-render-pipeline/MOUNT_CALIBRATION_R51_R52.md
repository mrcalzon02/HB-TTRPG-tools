# Source mounting reconstruction — R51/R52 measured findings

## Authority and safety
The original user-supplied Factorio 2.0.77 thruster `thruster.zip` includes 64 RGBA frames at 264x542. Original image pixels remain outside this public repository. All targets below were visually measured in the first original body frame; they are **approximate projected screen envelopes**, not recovered proprietary 3D CAD. The 4x8 Factorio prototype, calibrated Blender orthographic camera, full 64-frame lower-fin animation, independent cupped outer guards and physically open refractory remain the scene's contracts.

The user requires **actual, bespoke cast mounting geometry first**, connected to the upper hull at the correct place, **then** independent fin-root sizing and attachment. The three visible source castings are *not* identical circumferential elements: port slanted hood (fin index 3), central broad bridge with two little descending lugs (fin index 2), starboard offset metal cover near red lead (fin index 1). Do not silently infer unseen actuators.

## R51: original-camera rays and projecting actual Blender mesh

Real native R50-verified .blend file tested; both R49 and temporarily deformed R50-D tested at the same orthographic camera. All mutated mesh vertices restored and original saved .blend SHA preserved.

| Current visible casting | R49 projected bbox [x0,y0,x1,y1] | R50-D projected bbox | Original-frame approximate target |
| --- | --- | --- | --- |
| Right (index 1) | [171.75,211.51,206.70,271.38] | [158.63,293.02,190.27,351.22] | [166,313,220,356] |
| Center (index 2) | [115.59,181.97,151.67,239.42] | [117.03,265.81,145.50,323.10] | [95,311,163,339] |
| Left (index 3) | [56.06,220.49,96.61,276.16] | [68.28,302.52,105.22,356.56] | [27,314,90,358] |

Original R49 castings were obviously too high. R50-D got closer but three silhouette extents are different, particularly the central bridge, so a shared generic mount shape cannot work.

**Exact first-hit obstruction:** `vanilla_reference_bell_bronzed_rolled_bell`. On R50-D, the diagnostic counts **126 native upper-nozzle rays** hitting that exterior bell versus 59 on `R11_OPEN_DEEP_REFRACTORY_THROAT`, 42 on `vanilla_reference_bell_rolled_lip`, and 33 on `R11_recessed_internal_pressure_baffle_00`. The temporary single-object hide A/B reveals heat-colored fins and underlying physical detail. Never treat that temporary hide as an asset fix: the bell's exterior is real, and only a properly joined/reprofiled open external bell or truly foreground structural mount can resolve this.

Pass: [R51 fast saved-scene geometry diagnostic](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40963481878), saved native artifact `factorio-r51-native-mount-occlusion`. Complete calibration with the fixed R51 call also passed: [native full calibration](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40963304634).

## R52: actual 3D original-cast vertex projection fitted to SOURCE envelopes

The fast saved-scene sweep reshaped **the existing three different R49 mount meshes**, preserving each 3D vertex's view depth, using genuine editable 3D coordinates, not sprites/overlays. Same camera and lighting; the original five upper heat-fin meshes were temporarily placed at R50-D, otherwise untouched. The existing pale centerline cast shader was temporarily used for visibility; no new materials or objects were manufactured. All mutations were rolled back; no model saved.

| Casting | New physical candidate projected bbox | Projected bbox fit | Minimal 3D mount-to-fin root gap, before to after |
| --- | --- | --- | --- |
| Right (1) | [165.99,313.00,220.00,356.00] | ≤0.01 px | 0.09838 → 0.04282 tiles |
| Center (2) | [95.01,311.00,163.01,339.00] | ≤0.01 px | 0.09009 → **0.23279 tiles** |
| Left (3) | [27.00,314.00,90.00,358.00] | ≤0.01 px | 0.08594 → 0.09826 tiles |

**Important failure despite successful geometry code:** Real rendered R52 castings nearly disappear **behind the high exterior bell/collar and existing upper mechanisms**. The three projected bbox fits are therefore **not visible-silhouette acceptance**, and the central 0.233-tile joint gap cannot be called connected. The work is diagnostic only and has *not* been promoted to the persisted scene. No hiding, deleting or painting in the source's cream-colored bracket.

Pass: [R52 fast Blender casting diagnostic](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40964142733), artifact `factorio-r51-r52-native-mount-calibration`. Full source tests [passed](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40964142744).

## Next physical pass: show the mount, then attach the fin
1. Diagnose **exact frontmost obstruction within each of the three new bracket source-target rectangles**. Determine whether the shell's upstream three of eight axial rings need a restrained real 3D reprofile (without removing shell, changing distal mouth/throat or closing refractory) **or** whether each bracket requires a real forward radial load-path over the shell to the chassis. The successful hide-render is evidence, not the fix.
2. Rebuild the three castings as visible, thick, distinctly shaped and spatially supported geometry: left sloped armor hood, center horizontal crosshead **with two short descending integral lugs**, right offset cover around the already-existing red wiring. Check actual projected faces, mesh-first-hit visibility and retained nonzero 3D thickness. No duplicated ten-point mechanism.
3. Bring the real fin's proximal vertices to each casting's true contact line; preserve broad blue/purple distal portions and punched, formed shape. Require fin-root spatial distance near zero **and** unobstructed visible forepart in source-relative 264x542 captures before claiming attachment.
4. Compare exact original source vs rendered body in 64 frames privately, including lower-shell refractory visibility. Do not approve the art based on QA success or pixel MAE alone.
