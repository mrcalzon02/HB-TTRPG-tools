# R74: real Blender physical refractory overlap candidates — verified, NOT accepted

The user's only authoritative visual reference remains the original Factorio 2.0.77 thruster RGBA sprites in private `thruster.zip`, SHA256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`. The original artwork is **not available in the current workflow**. No internet substitutions, overlay decals or synthetic source images are allowed.

## Implementation and workflow

- [R74 corrective source commit](https://github.com/mrcalzon02/HB-TTRPG-tools/commit/9f40a2b563d294fa33403afe12ccd097546d4783).
- [Actual corrected Blender 4.5 LTS execution #41386475187](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41386475187): **SUCCESS**.
- Prior #41386441625 was **red** for a *test code defect*: the near-only persistence check evaluated `min()` on an empty sequence for mid plates. The fixed script checks the near-only aft-lip row inside the near-only branch. Do not treat the failed run as a defective model.
- GitHub artifact: `factorio-r74-real-staggered-refractory-lap-editable-candidates`, ID `13115134493`. Contains 0/.55/1.00 actual native camera frame-1/33 PNGs; the .55 and 1.00 saved/reopened editable Blender scenes; JSON and environment readiness evidence.
- Reference unchanged: verified R71 +.075 saved .blend SHA256 `e5aea187ab7b970791ba955913cf134905447b21f8c3fc3527beef1db0ed4aaa`.

### Actual R19 physical deformation, never fake material/geometry

R74 edits inner 12 of each of the existing **80** thick, 24-vertex original R19 plates. Near-mouth aft-row tips extend toward the mid row, and mid-row mouth tips return toward near, creating a physical staggered lap and curled center relief. Both source-persisted face topology and original outer 12-vertex faces are retained; no new objects, material changes, lights, camera adjustments, FIN/guard/mount changes, or animation changes. R71 nonzero profile remains. Full scene, unchanged 64-frame fin movement digest and critical source support geometry are checked, saved, reopened and verified for each variant.

| Existing R19 physical seam fold | Real inner vertices changed | 4px first-hit near/mid R19 | 4px liner first-hits | Frame-1 native ROI RGB pixels changed by >=2/255 vs R71 baseline | Max RGB change | Editable file |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| 0, original saved R71 | 0 | 364 / 109 | 307 | 0 | 0 | unchanged reference |
| +0.55 | 480 | 373 / 108 | 298 | 60 | 3/255 | `fold_055.blend` |
| +1.00 | 480 | 377 / 111 | 291 | 136 | 5/255 | `fold_100.blend` |

Native ROI **x48..218,y395..512**, 170×117 pixels. All values from actual R74 generated PNGs, with no source sprite present. All three ROI images have fully opaque 255 alpha. In this ROI, mean absolute RGB difference for the +1.00 candidate is only **0.1033/255 per channel**. This is far too little visible change to solve the source's distinctive stamped refractory impression. First-hit geometry moves by a handful of sampled pixels, but source-image material/contour fidelity is not thereby proven.

The two reopened editable .blend SHA256 hashes:
- `fold_055.blend`: `d9ec66bbbbc417c8f08273215c054b42b5eaaba4817f62eeef3fe06a5289f60f`
- `fold_100.blend`: `a169b53e8e0c0877d0ebe2c41bf47647f579291636458a84cfc07de9850e53e1`

**Decision: both R74 candidates are syntactically/physically valid, but NOT approved for source visual fidelity and not promoted to production. Stop chasing the near/mid lap edge with bigger blind displacements.**

## Material/geometry diagnostic from authentic recorded source observations

Recorded private-original ROI measurements in [CALIBRATION_FINDINGS.md](CALIBRATION_FINDINGS.md) were sourced from the genuine original `thruster-1.png`, whereas current candidate averages below are newly measured native RGB PNGs. Not a fresh side-by-side comparison, and geometry is NOT certified just by matching brightness.

| Native 264×542 ROI | Historic ORIGINAL source sRGB luminance | Actual R71 +.075 native sRGB luminance |
| --- | ---: | ---: |
| Upper x55..208,y410..455 | .069579 | .024622 |
| Mid x70..192,y425..480 | .071002 | .015192 |
| Lower x65..202,y450..485 | .082032 | .031501 |
| Center x95..170,y400..475 | .055115 | .025394 |

The visible existing refractory section is substantially darker than the genuine original *recorded* measurements, despite finite-geometry relief. R73 proved R11 liner/baffles still account for 7,000/19,890 native first-hits in the nozzle ROI and R19 first-hits already exceed 8,000. Increasing lap amplitude cannot fix incorrect overall surface material response or physically misplaced broad liner panels.

**Next high-impact stage:** retrieve the user's private original source atlas and make exact source-only comparisons of the R11 baffle shapes, native internal contours, visible original refractory pigment and light response. Independently isolate the already-existing R11 liner/baffle faces and R19 plates in actual saved-camera Blender to distinguish physically incorrect occlusion from correct geometry that is too dark. Develop limited edits to the specifically identified original mesh surfaces; keep the real open throat, original radial mount hierarchy, two exterior clamshell cups, nine-versus-ten fin-count source uncertainty, and all original motion. Do not use an arbitrary light boost, remove rings, invent actuators, or paste an image over the 3D hole. All visual/fidelity tests remain advisory and cannot block functional releases.
