# Blender calibration and procedural model revision journal — R03

## Scope
Homebrew Tabletop Tools owns the headless Blender test environment. Tech Priests production art and runtime code remain unchanged. GitHub Actions builds real Blender scenes from procedural meshes and renders candidate sprites. This is neither an official vanilla thruster recreation nor a Factorio 2.0.77 game-load acceptance.

## First verified capture run

First passing run: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40288220796

- Blender 4.5 LTS local environment setup and headless Cycles execution passed on Ubuntu.
- Four calibration scenes: four-direction graybox, emission test, fixed-registration animation test, and approximated vanilla thruster.
- Four revised Tech Priests scenes: hydrogen, thetazine, narrow void fusion and heavy void fusion.
- Every scene exported an editable Blender scene (.blend), transparent RGBA frame PNGs, atlases, contact sheets and JSON reports.
- Original custom model capture count: 16 frames, 8 atlases. First calibration group generated 28 frames (4 graybox, 6 emission, 13 drift, 5 vanilla approximation).
- No Blender scene was placed inside the live Tech Priests mod graphics tree.

## Defect identified from actual PNG measurements

| Asset | Preview cell pixels | Original first alpha bbox [L,T,R,B] | Risk |
| --- | --- | --- | --- |
| Hydrogen | 128x256 | [0,78,128,186] | left and right sides clipped |
| Thetazine | 128x256 | [0,81,128,184] | left and right sides clipped |
| Void spine | 96x288 | [0,79,96,211] | left and right sides clipped |
| Heavy void | 192x256 | [7,65,190,186] | none |
| Vanilla approximation | 256x384 | [0,115,256,278] | left and right sides clipped |

Root cause: orthographic scale measures vertical field of view; the old formula did not account for the ratio of cell height to width and used too much diagonal camera azimuth for the 1x9 spine. The resulting sprite clipping risk was a camera/export problem, not mesh integrity.

## Corrected headless capture results

Second passing run: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40288639317

- Hydrogen first alpha bbox is now [20,102,110,157].
- Thetazine is now [18,104,113,157].
- Void spine is now [33,81,64,208].
- Heavy void is now [30,80,165,171].
- Vanilla approximation is now [41,139,220,250].
- All eight scenes have nonzero image-border margins; no clipping warning remains.
- The animation test preserved a constant overall alpha-bbox center across its idle/run sequence; this does not establish that all internal motion is correctly authored.
- The camera correction accounts for preview pixel aspect ratio and gives the 1x9 spine a much more frontal perspective.
- Real emission intensity keyframes were added before saving each native Blender scene.

## Current regression gates

The new CI workflow runs two Linux jobs: calibration and procedural model revisions. It uses the ONE existing bootstrap.py install entrypoint, then run_calibration.py to produce real native Blender scene and PNG artifacts.

Source-generated outputs include:
- Individual editable scene files, one per asset.
- Separate idle and running RGBA frames.
- One horizontal atlas per orientation and state.
- Contact sheet per asset and aggregate all-assets contact sheet.
- Frame alpha-bounding-box, coverage and SHA256 checks.
- A fail-on-edge policy: any source image touching the atlas frame border is a CI regression.
- A saved-scene reopen test, verifying real mesh objects, fixed ortho camera, transparency and idle/run keyframed material emission in the persisted Blender scenes.

Workflow: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/workflows/factorio-blender-capture-batch.yml

## Prototype source grounding

In Tech Priests source compatibility/space-age.lua and the final thruster-mounting-visuals override, the four modified thruster prototypes currently specify:

| Thruster | Tile footprint | Source graphics cell | Run frames | Sprite scale | Sprite shift |
| --- | --- | --- | --- | --- | --- |
| hydrogen-thruster | 4x4 | 256x512 | 7 | 0.54 | [0,1.25] |
| thetazine-thruster | 5x5 | 256x512 | 2 | 0.55 | [0,1.65] |
| void-fusion-thruster | 1x9 | 192x576 | 2 | 0.50 | [0,-0.10] |
| large-void-fusion-thruster | 4x4 | 384x512 | 1 | 0.40 | [0,1.25] |

Those are observed source values, not a claim that Blender's camera is already visually pixel-matched to Factorio. These previews intentionally render at reduced resolutions for faster automated testing.

## Next measurable upgrades

1. Save artifact diagnostics from the latest strict CI run and fix any failed scene-state validation.
2. Enhance exhaust effects: currently emissive nozzle faces pulse, but there is not a visually separate flame plume or dedicated shadow/emissive render pass.
3. Compare the approximate vanilla thruster with a true vanilla screenshot under the same view/zoom; no pixel-perfect visual matching claim until then.
4. Install and test the existing Factorio Sprite Capture Studio add-on itself, not just the direct bpy batch pipeline.
5. Only after art validation, use full-resolution target cells and test a disposable mod copy on a Factorio 2.0.77 space platform. Never silently replace working production sprites or change game logic.

## Strict verification run

Verified final strict run: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40289338496

- Calibration and model jobs both passed the **real Blender** roundtrip.
- 8 separate saved .blend files reopened successfully; each contained editable meshes and an actual idle-to-run emission animation (visible material strengths differed on frames 1 and 2).
- Calibration job: 4 scenes, 28 captured frames, 10 atlases, 0 edge-risk assets.
- Model job: 4 scenes, 16 captured frames, 8 atlases, 0 edge-risk assets.
- Every attempted captured PNG passed frame size and non-empty alpha analysis, all 44 frames had distinct frame hashes within their respective asset runs.
- The first scene verifier iteration discovered Blender's default behavior of returning exit code 0 after a Python exception; **corrected** by invoking Blender with --python-exit-code 4 and requiring the saved scene QA JSON. An unused emissive material being purged on save is now handled by locating the model's actually used keyed material, not assuming blue is present in every mesh.
- The capture workflow has branch-level concurrency cancellation to prevent running obsolete tests after new changes are pushed.
- R03 output remains lower-resolution visual QA; no live Tech Priests graphics were overwritten, and Factorio 2.0.77 runtime art load/placement is still untested.

Artifacts of this run contain saved Blender scenes, captures, atlasses, QA JSON and contact sheets, available on the Actions run page. This is the current verified capture baseline.
