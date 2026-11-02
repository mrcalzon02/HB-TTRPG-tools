# R80–R81: real Blender fin taper fixed and compared against exact original sprites

## Root-cause geometry error

The original model was widening its actual formed-metal upper-fin meshes in the WRONG direction. Upstream vanilla_master_fin_r21.py declares half-angle width 0.062 at clamped root and 0.121 at the distal free end. Later vanilla_broader_fins_rearward_collar_r48.py explicitly multiplies that distal width by 1.47 for the three principal fins and 1.22 for peripheral fins. That is why R79 visibly formed large outwards-flaring paddles.

**User correction, confirmed by the original original body source**: The near-hinge metal shoulder must be wider and the hanging free end must narrow. The free tip is also relatively broad and blunt, with blue-purple heat tint; it is not a thin sharp needle. Original private thruster.zip SHA256 0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791. Genuine original body 264×542 frames 1 and 33 were used in the **private local comparison**, never put in the public repository or GitHub Actions artifacts.

## Actual editable 3D correction, no image-plane trick

- R80: uses original 220-vertex R21 slotted, embossed, two-skinned metal meshes. Preserves exact original hinge contact row vertices, all 3 different load-bearing casting-to-fin joints, source 3D depth/spine, material slots and heat tint, original panel lengths, camera, other original mesh objects and the 64-frame lower fin motion. Changes the REAL angular widths from the near-hinge shoulder to progressively narrower distal edges. Initial [R80 run 41403083927](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41403083927) correctly FAILED a nonmonotonic hand-entered last-row width. Replaced with strictly monotonic continuous smoothstep, then [R80 run 41403246085 PASSED](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41403246085) with four actual saved/reopened editable Blender variants and native frame 1/33 renders. Artifact ID 13122870153.
- R80 original-sprite review determined the corrected taper direction was a material improvement, but some variant free ends became too sharp. Best of those four in main upper fin ROI was shoulder half-angle 0.22, tip 0.11.
- R81 reused the SAME R80 physical mesh operation (not re-authored duplicate geometry) with four blunter tapered tip variants; [R81 real Blender run 41403904522 PASSED](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41403904522), saved/reopened all 4 full Blender scenes, source-calibrated two native frames each, original physical hinge contacts/animations/materials verified, artifact ID 13122413627.

## Exact original sprite native-pixel comparisons (private)

All scores: average of original frames 1 and 33; pixel RGB is alpha-premultiplied to black, normalized mean absolute 0..1 (lower is better); same source camera coordinates, no translation or retargeted lighting. Pixel color is an additional diagnostic, NOT equivalent to original 3D shape/animation acceptance. Native ROIs x40–224,y336–443 (three fins), x97–164,y340–413 (center fin), x26–224,y298–419 (all mounting region).

| True Blender mesh variant | Three-fin error | Center fin error | Overall mount error |
| --- | ---: | ---: | ---: |
| R79 old incorrect distal widening | 0.130061 | 0.164680 | 0.163627 |
| R80 narrow-tip 0.22 shoulder / 0.11 tip | 0.128015 | 0.149520 | 0.160293 |
| R81 0.20 / 0.13 | 0.127562 | 0.149971 | 0.159860 |
| R81 0.20 / 0.15 | 0.126234 | 0.148316 | 0.158835 |
| R81 0.22 / 0.13 | 0.126553 | 0.148494 | 0.159138 |
| **R81 0.22 / 0.15, preferred working candidate** | **0.125270** | **0.146695** | **0.158161** |

On the preferred R81 model, original-source three-fin ROI frame-1 error improved 0.1260620 → 0.1222249; frame-33 improved 0.1340597 → 0.1283142. This is consistent improvement at both actual original body frames, not a model-vs-model score.

Best saved and reopened real editable Blender scene: R81 shoulder_22_tip_15.blend, size 10,533,738 bytes, SHA256 0a8de6ccfe693726f71af8b5cfa4bfb44d5c7044d83607c20ba9019af58a803d. The .blend is available in GitHub Actions artifact factorio-r81-real-blunt-source-fin-taper-candidates with native screenshot files shoulder_22_tip_15_frame01.png and shoulder_22_tip_15_frame33.png. **No original art bundled.**

## Working selection and remaining gap

R81 0.22/0.15 is the preferred tested **working Blender candidate**, not an assertion of perfect official Factorio CAD and not a production sprite replacement. Preserve R79 and R71 original saved model files. The source original still shows distinct, asymmetrical, weathered cream upper mounting castings, sloped port bracket, twin center tabs, and starboard red-wire side; the current 3D mounts are too smooth, gray, and geometrically oversimplified. Reconstruct their true shape/orientation next while preserving these corrected tapered fins, static source-confirmed hinge contacts and distinct hull stays. Never invent animation of unknown pivots or ten cloned mounts.

Important future pipeline work: avoid regenerating the R48 historical inverted distal widening when constructing new source benchmark scenes; select the corrected real R80/R81 saved candidate or implement a tested replacement stage. Visual fidelity/art diagnostics are non-blocking: only failures in build, runtime, critical multiplayer or update behavior can block game releases.
