# R88–R90: genuine original-sprite comparison identifies wrong R08 prototype knee guards

**Goal: reconstruct exactly the original Factorio sprite-rendered 3D object in Blender, not an imagined space thruster.** The only visual authority is the user's privately recovered genuine `thruster.zip`, verified SHA256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`. The original body frames were examined privately at original 264×542, frames 1 and 33, with no original Wube pixels published in GitHub Actions or source control.

## Verified real Blender results

- [R88 seven-family ownership/isolation run #41413097106](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41413097106) succeeded. Actual native-camera first-hit samples in left source hinge ROI: 321 R49 casts, 185 R08 knee guards, 73 R08 aft shroud wings, 425 actual fins, 49 R64 hull stays. Right: 302 R49 casts, 249 R08 knee guards, 136 R08 aft shroud wings, 396 fins, 37 R64 hull stays; the remainder are other existing geometry, including the broad old roll. These are first-hit counts, not source-matched geometry. The R21 clevis family was ABSENT and is not an independent visible part in this saved model.
- R88 source comparison baseline full mounts ROI x26–225 y298–420 average frame1/33 premultiplied RGB MAE: **0.1551817**. Temporarily hiding ONLY R08 knee guards: **0.145949**. Hiding both R08 knee guards AND aft shroud wings: **0.149810**, WORSE than just knees hidden. Hiding R49 casts: 0.151231; hiding R64 hull stays: 0.156974 (worse). The R08 knee guard bulk, not the aft shroud wings, is a major invented-geometry mismatch.
- The original R89 source-first **real 3D remesh code** created two separate original-image-contour, finite-volume layered left/right castings in actual Blender, retaining the existing true R49 fin root and R64 hull stay meshes. First run failed due a stale Blender RNA object handle after saving/reopening; fixed at 8c9d824. Second run actually built and saved/reopened all five variants, but failed a *last JSON artifact assertion* due misnaming `actual_3d_faces` as `actual_3d_mesh_faces`; corrected at fb04feb. **Both failures were test harness defects, not evidence of invalid rendered geometry.**
- Actual original-source score of R89 candidate files from [run #41476391826](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41476391826) (all saved/reopened by Blender):
  - R85 baseline **0.1551817**.
  - R89 source_trace **0.1531159**.
  - R89 source_tight **0.1521979**.
  - R89 source_raise **0.1520088**.
  - R89 source_wide **0.1543287**.
  - R89 source_deep **0.1525377**.
  The **raised** model wins across the whole mounting area, while **tight** wins in the separately cropped right source casting ROI. Original source geometry remains a visible mismatch despite the genuine shape-based gains. No automatic promotion.
- [R90 successful genuine Blender experiment #41476956901](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41476956901) loaded the SHA-verified previously saved real R89 source_trace.blend, explored individual R08 knee guard **3D scale** down to 70%, 40%, and full reversible visual isolation, and saved/reopened seven actual editable Blender candidate scenes, preserving all original upper fin-to-R49 casting contacts, R64 hull stays, fixed source camera/materials, 64 original fin frames, other meshes and source layers. Source frame1/33 comparison:

| Real 3D R89 cast + original R08 knee configuration | Exact original source LEFT casting RGB error | RIGHT casting error | FULL mounts |
| --- | ---: | ---: | ---: |
| R89 cast with both old guards unchanged | 0.1677302 | 0.1638144 | 0.1531160 |
| Port old guard at 70% | **0.1595942** | 0.1638159 | 0.1506903 |
| Right old guard at 70% | 0.1677295 | 0.1523070 | 0.1508767 |
| Both at 70% | **0.1595943** | 0.1523096 | 0.1484505 |
| Port at 40% | 0.1626654 | 0.1638161 | 0.1495444 |
| Right at 40% | 0.1677302 | **0.1452893** | 0.1494107 |
| Both at 40% | 0.1626607 | **0.1452919** | 0.1458389 |
| **Both R08 guards hidden (old 3D meshes still in saved file for inspection)** | 0.1627764 | 0.1460153 | **0.1440037** |

R90 `both_hidden.blend` SHA256 `c8d04b0c270f0d1f2da7d3d6528c6d396de869dd25d02d9013838f5f0b901417`. Old model remains untouched; hide_render is a diagnostic, not deletion or completed original-accurate part. No additional fake parts or generic thruster interpretation.

## Engineering decision

**Stop preserving the old R08 guards merely because they were earlier coded as mechanical detail**. They occupy large original hinge-visible regions and measurably obscure the 3D reconstruction. The wings are a different existing geometry family and should **not** be dropped together with the knees. True source shape wins over mechanical plausibility. R89 side mount shells are source-traced finite-volume candidates, although they still need accurate material shade, 3D depth, stepped shoulders, original joint tabs and more animation frames.

The next controlled sweep should combine **R89 tight and raised 3D cast depth/scale proposals** with independently scaled R08 left/right knees or hidden candidates, then privately rank the result against the original sprites at native same-camera frames 1/33. Fine-tune nonuniform source geometry only after confirming the combined improvement. Continue beyond two frames for significant new topology or animation changes. All aesthetic fidelity diagnostics must remain nonblocking for game releases.
