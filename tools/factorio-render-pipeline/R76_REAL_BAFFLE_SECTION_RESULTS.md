# R76 — real saved Blender R11 baffle 00 cross-section test (not visual acceptance)

**Verified workflow:** [GitHub Actions #41391237164](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41391237164), completed **SUCCESS** with actual Blender 4.5 LTS, source-calibrated native frame 1 and frame 33 renders, separate editable .blend save/reopen and unchanged protected geometry/motion/shaders/camera validation. Result artifact **factorio-r76-real-existing-pressure-ring-section-native-candidates**, ID **13117233369**. Neither candidate is promoted to the canonical geometry or game assets.

The authoritative Factorio original remains the privately user-supplied `thruster.zip`, SHA256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`. That archive was **not available in this workflow**. The source model is the prior R71 +.075 persisted .blend, SHA256 `e5aea187ab7b970791ba955913cf134905447b21f8c3fc3527beef1db0ed4aaa`.

## Physically tested
R75 documented that temporarily hiding the current 320-face R11 baffle `_00` changes 10,974 native nozzle pixels (RGB >=2/255), but it did NOT prove the ring directly covers 10,974 rays; shadows and lighting change. The actual original image requires an annular band, and the bespoke fin mounts attach separately above it.

R76 reshapes **only** the existing R11 `_00` 320-vertex / 320-face torus minor cross-section, keeping its calibrated y=-3.6100 longitudinal station and radius=1.3850 center. The ring, shader, material, object identity, topological face count, camera, light, R11 open liner, 80 refractory plates, upper individually cast fin mounts, two independently cupped moving guards, and all original 64-frame motion are preserved.

| Real Blender candidate | Axial torus section (tiles) | Radial torus section (tiles) | Actual nozzle ROI changed pixels >=2 RGB | Average absolute RGB change (0..255) | R19 first-hits on original 4px sampler | Existing R11 baffle 00 first-hits on original 4px sampler |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Existing R71 saved baseline | 0.06400 | 0.06400 | 0 | 0 | 473 | 93 |
| R76 +0.78 axial | 0.04992 | 0.06400 | 2,475 | 0.71768 | 476 | 85 |
| R76 +0.58 axial / 0.82 radial | 0.03712 | 0.05248 | 6,145 | 1.44198 | 488 | 60 |

Pixels measured against the existing baseline at native region x48..217, y395..511 (170x117 pixels); no scaling or image registration change. First-hit samples are those of the established source-camera 4px raycast; NOT the full pixel census. The more extreme R76 torus exposes only **15** additional refractory hits despite changing its shadow/visual response over 6,145 pixels. The nozzle still reads visually as a dark fairly smooth cavity, and the difference from baseline is mostly subtle rim shading.

Actual saved/reopened editable variants:
- `section_078_100.blend` SHA256 `8c1f84577bd154c3c9b766d0da870d302af7cede2e99d0d3c60bded306782c1b`
- `section_058_082.blend` SHA256 `0c3aa2ce9223e5e107fae455c7ab0e3f513c0870c8ec1e9520a8cc64da018b1d`

**Decision: do not promote either R76 candidate to baseline.** Modifying the band section does influence lighting and direct occlusion, but is not a source-image validated remedy for staggered physical refractory. Avoid further blind tweaks to baffle minor width, near/mid plate overlap or global color. They have demonstrated diminishing visual returns across R74–R76.

## What would unlock meaningful next geometry work

Recover the **actual original two RGB/RGBA body atlas pages** in a private comparison environment. Compare their non-alpha internal boundaries using the R70/R72 tools, inspected alongside R73 first-hit maps, R75 object-isolation renders and R76 candidate native frames. Specifically identify the source-positioned **actual metal band profile, deep bell inner walls, refractory shingle lip/stagger shape and individual fin casting roots**. Only then reprofile the specific existing three-dimensional polygons that are truly mismatched. The original two 264x542 RGBA pages (64 frames total) cannot be substituted by internet photos, procedural artwork or our own baseline renders.

Rendering/appearance diagnostics remain nonblocking; production Factorio and Tech Priests runtime tests are release gates only for actual functionality.
