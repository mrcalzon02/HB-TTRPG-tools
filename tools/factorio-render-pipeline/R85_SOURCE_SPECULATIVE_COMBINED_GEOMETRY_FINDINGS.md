# R85 — source-verified speculative combined fin mounting results

**Objective: match the actual original Factorio sprite.** This is a physical 3D mesh revision and ORIGINAL pixel comparison, NOT model-versus-model self-confirmation.

## Verified execution
- R83 angular-only straighter fins passed real Blender: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41406588540. R82 full world-chord straightening was rejected because it collapsed radial clearance and exposed a wrong dark nozzle arch. R83 60% reduced original-source three-fin error 0.125270 to 0.125022; 100% angular straightening scored 0.125133.
- R84 19 individual real 3D casting alignment/scale/shear tests succeeded: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41407182619. Details in R84_PRIVATE_ORIGINAL_SPRITE_PARAMETER_SWEEP_FINDINGS.md.
- **R85 passed real Blender**: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41407934115. Artifact 13124755293, named factorio-r85-source-ranked-actual-hinge-cast-combinations. Original 3D saved R83 60% candidate verified SHA256 2767ca27f6eebeca6d7336362a669db554015205a43c9306ce763f6390e4c645. Six 3D candidate configurations produced 12 real native 264x542 frames; FIVE actual editable Blender scenes were saved, reopened and verified.
- Verified exact original user private thruster.zip SHA256 **0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791**. Original body atlas frames 1 and 33 were cropped privately for exact image-space comparison. NO original proprietary Wube pixels in public GitHub code or workflow artifacts.
- All original actual fin-root-to-casting contacts, original R64 hull stay contacts, unchanged original fin topology, fin motion over 64 frames, source camera, shaders, nozzle/guards and object population verified. No fake pivots, rings, newly invented mechanisms or source image manipulation.

## Exact original sprite mean two-frame RGB error (lower is better)

| Actual 3D configuration | Left cast x27–90 y314–358 | Center cast x95–163 y311–339 | Right cast x166–220 y313–356 | All mount parts x26–225 y298–420 | Three fins x40–225 y336–444 |
| --- | ---: | ---: | ---: | ---: | ---: |
| R83 unchanged baseline | 0.193186 | 0.202308 | 0.180486 | 0.158117 | 0.125109 |
| Narrow port and starboard 13% | 0.185541 | 0.202347 | 0.173434 | 0.156321 | **0.124635** |
| Both narrow plus center skin shifted 6px up | 0.185046 | **0.187086** | **0.170598** | 0.156072 | 0.124942 |
| **Both narrow plus center shortened 18%** | **0.185465** | **0.187292** | **0.173372** | **0.155182** | **0.124771** |
| Both narrow plus center 3px up and 9% short | 0.185243 | 0.192909 | 0.171753 | 0.155533 | 0.124897 |
| Both narrow plus center moved down 6px control | 0.185737 | 0.199668 | 0.175323 | 0.156743 | 0.126153 |

All scores premultiplied RGB MAE 0..1, average of exact source original frames 1 and 33 with unchanged physical Blender camera. Color error combines geometry, occlusion, surface colors and lighting and cannot on its own prove correct 3D form. Center-down artificially increases internal contrast edge recall (~0.431 versus baseline 0.213), while making the whole region a worse source fit. Therefore do NOT select purely for one pixel metric.

## Current selection

**Preferred working experimental source comparison:** R85 center_short. It scales the unlocked original outer-cast surfaces to 0.87 of their camera-projected widths and center casting unlocked surface height to 0.82, while keeping all genuine original mechanical anchor vertices untouched. This is a separate verified saved/reopened Blender file named center_short.blend, SHA256 **4343640f04b179c3b08ec2bdce1de77582e21cc45e195f173816603b709c36b7**. It has the best tested overall mounted-part ROI, whereas center_up has marginally better center-only and right-only ROI. Do NOT replace the source R71/R81/R83 benchmarks or production game sprites automatically.

The original source visibly has different layered and sloped real pale castings, two small central locking ears, a port stepped hood and starboard red-wire offset housing. These nonidentical detail contours still mismatch markedly, and the actual heat-stained fin material/shadows and dark shingled interior remain incorrect. Do not call the art done.

## Iteration process adopted

1. Always use the exact actual private original source frame pixels, not arbitrary online renders or our own prior model.
2. Make independent 3D geometry edits of individual observed parts, changing size, scale, orientation, tilt or position, and render **both** original-indexed frames under the original calibrated camera.
3. Hard-lock real casting-to-fin and casting-to-hull joints; preserve original fin topology, slot holes and original animated lower fin keys. Speculative transformations should not fabricate unsourced hinges.
4. Independently measure real source RGB and internal edge correspondence privately, inspect actual source/model paired crops visually, and label rankings as **diagnostic, not proof of shape**.
5. Combine the best real geometry hypotheses in a new saved/reopened 3D scene, then remeasure against original again to detect interactions. R84 -> R85 demonstrates this working.
6. Next sample finer port and starboard cast widths and center compressed height; then explicitly reconstruct unique original cast panel contours and material patina. Cosmetic/art checks NEVER block game release. No source artwork in public GitHub Actions.

Reusable private source-ranking tool committed at tools/factorio-render-pipeline/private_original_mount_ranker_r86.py.
