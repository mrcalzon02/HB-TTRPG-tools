# Factorio thruster R63–R66: real casting support and visibility validation

Authoritative off-game Blender pipeline: mrcalzon02/HB-TTRPG-tools on main, in tools/factorio-render-pipeline/. The unchanged saved R58 editable reconstructed thruster remains the original baseline. The user-supplied proprietary Factorio 2.0.77 64-frame 264x542 sprite atlas is the ultimate image authority; its bytes are not published in this repository.

## R63: confirmed incomplete mechanical load paths

[Actual R63 Blender BVH test, passed](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40993710085) verified all three bespoke upper R55/R58 castings touch their respective fin root, but none touches HYDROGEN_curved_pressure_hull. Closest **actual hull surface gaps**, in Blender mesh coordinates: right/index 1 = 0.5625081; center/index 2 = 0.5685857; left/index 3 = 0.6952259. Their nearest *other* meshes are the aft reaction drum and old exhaust pressure rings; those are **not** legitimate upstream chassis mounting. Do not pretend the fin is attached to the pressure ring. Measurements were actual nearest evaluated mesh-surface points, NOT projected screen bboxes.

## R64: saved mechanically connected structural candidates

[Blender R64 saved/reopened and four native screenshots, passed](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40994130427). Three distinct finite-volume casts now span actual existing bespoke R49 mount vertices to evaluated surface points on the real pressure hull: offset starboard stay, central bridge web, swept port cover web. They are separate touching mesh objects, **not yet Boolean-unioned**. The original saved R58 baseline was not changed. All 64 original fin animation frames were preserved; the source orthographic camera and rendering were unchanged.

Four real source-native before/after renders (1/17/33/49) had roughly 7,200–7,600 changed RGBA pixels; this did **not** mean visually correct mounting. First-hit source-box casting visibility remained nearly unchanged at right 75/130, center 45/96, left 77/150. Thus mechanical hull support alone did not expose the cream metal profiles.

## R65: four source-space measurements of REAL original cast cheek vertices

[Real R65 Blender sweep passed](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40994826528). Changed only the outer skin interior on the THREE existing R49 bespoke cast mesh objects, keeping the upstream R64 hull stay and downstream R55 fin root vertices physically fixed. An initial candidate failed because an unexpectedly actual fin root vertex moved; a root-cause correction dynamically locked contact vertices right [13,26], center [31,42], left [10,28]. No new ring, ten cloned machine parts, flat image plane, or material swap.

| Radial cheek relief | Right / 130 | Center / 96 | Left / 150 |
| --- | ---: | ---: | ---: |
| 0.00 | 75 | 45 | 77 |
| 0.08 | 75 | 59 | 78 |
| 0.16 | 79 | 78 | 82 |
| 0.24 | 82 | 81 | 88 |

Conservatively select +0.16 as the next editable candidate because the central casting first-hit visibility rises 45→78/96 while the extra +0.08 deformation only adds 3 more center hits. This is NOT visual source fidelity approval: the ROI boxes come from manually measured sprite envelopes, not a redistributable original atlas.

## R66: saved, reopened +0.16 original casting-face revision

[Actual R66 Blender save/reopen and native frames, passed](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40995175908). Artifact named factorio-r66-source-visible-cream-castings-editable-blend-and-native-frames contains an actual **10,528,729-byte .blend** at output/r66/saved_three_source_cast_face_stays_r66.blend, SHA256 a1db423d69c1db0373eefc1b551966f15d6906f3e61dcce8d67f90753cc59547, plus actual 264x542 rendered frames 1/17/33/49 and JSON verification.

From existing saved R64 input SHA256 ce65a8ab0b1cf5085a3f6cbcb25aaab4aa745adda0980a75a7a7273bf438689f, R66 modifies only the three source-specific original R49 cast outer faces (9/11/9 interior vertices considered), preserving all three fin root contacts, all three true 3D upper hull contacts, original R18 64-frame fin motion and keyed mesh data, source camera, original bell/ring/nozzle/refractory, and original R64 file bytes. The .blend was independently reopened and verified after save; real casting face first-hit counts 75→79 right, 45→78 center, 77→82 left.

R66 is a **CANDIDATE**, not accepted Factorio production art. A perfect mechanical connection and improved sampled casting visibility do not establish that the source sprite's exact fin shape, mounting coloration, industrial geometry or complete animation have been matched.

## Next acceptance and project release rules

Continue private original 64-frame sprite-to-R66 comparison, then improve exact asymmetric cream mounting contours and purple-blue hanging fin silhouette, preserving the open shingled 13-ring throat and separate cupped outer guards. Source sprite geometry is private and must never be committed as public artwork; official Wube printable models remain private independent comparators, not production CAD. These are **diagnostic art tests and not game build/release gates**. Never block Tech Priests game releases for aesthetic or subjective differences.
