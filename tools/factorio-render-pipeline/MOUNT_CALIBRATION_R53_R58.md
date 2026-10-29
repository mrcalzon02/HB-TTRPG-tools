# Verified mounting and fin reconstruction — R53 through R58

## Goal and non-negotiable source hierarchy

The user-supplied original Factorio 2.0.77 thruster provides 64 body frames, each 264×542, from `thruster-1.png`/`thruster-2.png`. The source bitmap must NEVER be committed publicly. The rendering target is the **actual source geometry**, not general aesthetic resemblance or high pixel similarity obtained by hiding correct physical surfaces.

Three distinct cream-tinted cast brackets are visibly ABOVE the dark throat ring: sloping port cover (our upper-fin index 3), center broad bridge with TWO short descending ears (index 2), and an offset starboard housing following red wiring (index 1). Five upper R21 heat-stained fins exist in the model (three prominently source-visible). Fins must be mounted to the upper cast assemblies, NOT to the dark circular nozzle ring. Real edited 3D model, correct calibrated Factorio lighting/camera, original open dark 13-ring liner, R19 shingled refractory, two separately cupped outer guards, and lower 64-frame motion must remain available.

Previous stages R51/R52 already established that projecting three exact cast bounding boxes without making them visible or connected was a false positive: the R52 middle casting had 0 sampled pixel first hits and a 0.233-tile gap to its fin. [R51/R52 engineering journal](MOUNT_CALIBRATION_R51_R52.md).

## R53: front-surface visibility diagnosis

Real Blender first-hit rays were measured inside three MANUALLY APPROXIMATED source casting boxes. Outward radial repositioning of original R49 meshes with true 3D coordinates (followed by the same-camera 2D bounding fit) yielded:

| Casting outward (tiles) | Right 1 | Center 2 | Left 3 |
| --- | ---: | ---: | ---: |
| 0.00 | 22.3% | **0.0%** | 30.0% |
| 0.48 | 43.9% | 14.6% | 42.0% |
| 0.72 | 56.1% | 31.2% | 49.3% |
| 0.96 | 62.3% | 52.1% | 53.3% |

Moving casts alone cannot solve visibility and worsens physical attachment at high offsets. The dominant blocker in casting source ROIs is the generic legacy `R08_black_exhaust_pressure_roll.002/.003` with adjacent R08 knee guards; note this is DIFFERENT from the outer bell dominating the lower throat region. This was diagnostic only, never promoted. [R53 execution](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40965784940).

## R54: shallow physical recess of obstructing EXISTING dark pressure rolls

Retract the existing static, editable `R08_black_exhaust_pressure_roll.002` and `.003` annular vertices radially inward without deleting/hiding the rings, closing the throat, or altering the R11/R19 source refractory. At cast radial +.72, retracting both rolls by .14 tiles increased right/center/left cast visibility from **56/31/49% to 62/65/53%**. Additional .28/.42 inward retraction gave almost no gain. Prefer the minimum justified .14, NOT an arbitrary full removal. [R54 12-case Blender sweep](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40966304654).

## R55: actual separately saved, reopened THREE-source-mount candidate

[Verified Blender action](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40967115342).

- From an actual previously saved R49 .blend, use R50-D rough axial proportions, corrected individual R52 casting screen envelopes and **different physical radial offsets** for casting 1/2/3 of +.48/+ .72/+ .48.
- Recess only the TWO actual R08 pressure rolls by .14, preserve all original bell meshes/liner and existing R49 cast count.
- Create two short, individually dimensioned, finite-volume center bridge locking ears ON the existing center casting, not a decorative image overlay or ten cloned actuators.
- Adjust only the first three original R21 station rows to bring the three central fin roots into literal 3D vertex contact with their own cast assemblies. Pre-correction gaps were .07739/.11724/.11215 tiles; after correction all **0.00000**. These remain distinct touching mesh objects, NOT asserted manifold Boolean-unioned meshes.
- All ten fin original topology/materials, four independently keyed lower fin shape families, two outer cupped guards, calibrated camera and real 3D open nozzle retained. Preserve source animation across 64 frames.
- Save **separate** `three_mounts_connected_candidate.blend` to CI artifact, reopen, independently revalidate each joint; 10,498,727 bytes. Original baseline scene SHA256 `847b42077ae8d0e113fe17acbaf25dc14063a9ca9b43f077d5b9cd745623c884` was unmodified.
- The R55 scene looks mechanical but visual source fidelity remains **UNAPPROVED**, notably the fins were almost completely covered by the remaining bell.

## R56: outward-curved fin tips — REJECT

First-hit visibility in ROI x38..225 y336..444 increased from **90/1269** sample rays hitting an upper fin at 0 offset to **410/1269** at +.20 distal radial shift, all 3 mount roots still physically contacted. However screenshot inspection shows an incorrect three-plate **ARCH** crossing the bell, not vertical hanging original fin blades. RGB error against the exact source increased as the arch grew. Never promote purely because first-hit area increased. [R56 real Blender variants](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40967699386).

## R57: straighter, root-coupled hanging plates

After user source comparison, replace the wrong distal saddle curve with an EARLY proximal radial relief (3 rows after actual clamp), then let most of the blade stay nearly parallel, and give the distal part additional real -Y length. Three reliefs (.12/.25/.38) × three downstream extensions (.25/.55/.85) = **nine actual source-native rendered physical candidates**, all original root contact zero, no source bitmap in artifacts.

Private exact-frame-0 premultiplied RGB ROI [40,300,224,515], normalized 0..1 lower better:

| Candidate | RGB MAE | Observation |
| --- | ---: | --- |
| R55 baseline (same ROI) | .12121 | Most hot fins hidden |
| R57 relief .25, downstream .25 | **.11707** | Best combined tested score; straighter fin hang, real rooted contacts |
| R57 relief .38, downstream .25 | .11820 | Wider plate exposure, worse combined |
| R57 relief .25, downstream .55 | .14266 | Too deep/long, serious source error |
| R57 relief .25, downstream .85 | .16487 | REJECTED major overlength |

This modest color improvement does NOT imply correct individual fin outline or texture; inspecting the original frames shows multiple remaining spatial mismatches. [R57 verified sweep](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40968205119).

## R58: SAVED editable .blend of the best verified R57 geometry

[Verified R58 build, reopened scene and 4 actual frames](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40968758379). Artifact `factorio-r56-r58-fin-visibility-and-editable-model` includes:

`physically-connected-fin-r58/source_connected_hanging_fins_r58.blend`

- 10,497,794 actual bytes, SHA256 `368d5d842f412ff511271b95def2b702e6c6e5233aa46dd0238a5a6ec21bbdc5`.
- REOPENED by real Blender; original source/R55 file SHA verified unchanged.
- All 3 individual fin/mount spatial root distances ≤.003, both center bridge locking lugs retained, native source ortho camera unchanged, all original R18 lower fin keyframes still present.
- Render actual animation frames 1,17,33,49 from the reopened candidate. Source animation is 64 frames, but **four captures plus preservation of lower keys DO NOT establish 64-frame pixel-accurate animated geometry**.
- Original original 264×542 source sampled at indices 0,16,32,48 in a **PRIVATE** comparison montage (not in the public repository or Actions artifacts). Visual source acceptance = **false**.

## Next root-cause engineering priorities (NOT yet completed)

1. The **grey smooth outer bell** `vanilla_reference_bell_bronzed_rolled_bell` still occupies a large area where original source shows dark fluted refractory, overlapping shingled plates, a segmented transition ring, and physical depth. Do not hide, delete or insert an image plane; identify which original outer ring/quads must move or be reprofiled to expose authentic physically modeled R19/R39 refractory.
2. The three source mount housings are warm **cream**, asymmetrical thick cast supports; R58 castings are mostly smooth grey. Refine each 3D profile, flange/bolts and meaningful hull-to-mount load path separately. Do not clone ten supposedly visible supports.
3. Compare **each** original heat-stained hanging fin's independent edge shape/width, downward free-end distance and purple/blue gradient. R58's broad color panels remain too generic and appear to wrap into the nozzle. Correct physical silhouette first, THEN shader patina and surface wear.
4. Examine 64 source frames for genuine observed motion of the upper hanging sheets and roots; some frame differences could be lighting, occlusion or exhaust movement. Do not infer a fictional actuator. Real source GIF observation is required before shape-keying upper fins.
5. Until a private original-source 64-frame pixel and visual review approves, preserve R58 as a comparison candidate, NOT official Factorio art or production mod sprite. Continue source-procedure tests and real Blender Actions after all geometry changes; read back pushed `main`, no claims from green tests alone.
