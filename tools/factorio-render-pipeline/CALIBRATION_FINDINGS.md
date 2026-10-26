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


## R04 structural response: stop building deck-mounted box assemblies

The R03 screenshot review found that successful camera/PNG QA was not sufficient: the
models still looked like separate rectangular machines **resting on top of a
platform plate**. In Blender, the previous \`central_support\`,
\`platform_mating_flange\`, and \`longitudinal_frame_rail\` generated an
incorrect deck-mounted silhouette. They are no longer used for the candidate
thruster and vanilla-approx scenes.

New \`sculpted_thruster_r04.py\` source creates:
- Elliptically lofted reactor casings rather than cube-stack housings
- Profile-lathed nozzle bells, rolled lips, recessed throat geometry, and field cores
- Irregular beveled cast shoulder armor, turned exposed pressure bands, routed Bezier tubing
- A C-channel **recessed socket with no solid base/floor plate**
- Lowered reactor mass around Blender z=-0.31 with the platform reference deck at z=0
- Exhaust bell meshes whose aft vertices extend past -Y platform boundary

Authoritative first passing R04 GitHub run:
https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40291839289

The first run reopened all four source models and proved the aft extensions:
- hydrogen: bell aft Y=-2.295 vs platform Y=-2.0 (0.295 tiles)
- thetazine: -2.775 vs -2.5 (0.275 tiles)
- void spine: -4.875 vs -4.5 (0.375 tiles)
- large void: -2.315 vs -2.0 (0.315 tiles)

All four candidate models passed alpha-edge checks with no clipped frames.
The geometry verifier now rejects legacy floor plates, absent rolled bells,
a body that never sinks below deck, and insufficient true curved geometry.

**Visual quality remains experimental.** Even the initial R04 close-ups still
read as simplified industrial mockups. They are not a convincingly matched
vanilla Factorio thruster and do not yet warrant replacing real mod art.
Further work must improve body-to-socket composition, surface segmentation,
engine detail, material definition, and reference matching.

Follow-up R04.1 exposes pressure bands that had been buried in the lofted hull
and increases nozzle overhang to read clearly beyond the platform edge.
That follow-up must earn its own actual Blender workflow proof before the
new geometry is accepted. The R03 artifact baseline is preserved for comparison.

The tool still runs direct Blender Python instead of exercising the
separately packaged user-facing Sprite Capture Studio extension, and
Factorio 2.0.77 engine integration is not yet tested.

## R04 floor-integration architecture: verified against vanilla 2.0.77

Official source: https://github.com/wube/factorio-data/blob/2.0.77/space-age/prototypes/entity/entities.lua

Vanilla thruster graphics_set includes animation (64 frames), an independent integration_patch rendered on the floor layer, conditional pipe working_visualisations, glow and a distinct flame effect. The initial benchmark's assumed 4x4 footprint was incorrect; the corrected vanilla calibration scene is 4x8, with abbreviated preview frames and no claim of pixel-perfect reconstruction.

R04 now puts platform socket and cutout meshes in the saved Blender FLOOR_INTEGRATION_PATCH collection, hidden during body animation rendering. A separate static integration_patch.png is rendered; analysis validates it and creates an integration-composite-preview.png as an inspection-only overlay. Body atlases are not contaminated with the floor patch. This matches the division of responsibilities in vanilla art without asserting game compatibility.

Verified full-pass Actions run: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40293141184

Remaining gaps: separate physically convincing nozzle flame/effects, connected pipe overlays, complex housing segmentation, edge matching to an actual game platform screenshot, source lighting calibration, and Factorio 2.0.77 runtime acceptance. No Tech Priests gameplay or production sprite changes were made. R04 is still visually simplified and NOT art-approved.

## R05/R06 — reference-led geometry refinement and actual render checks (2026-10-26)

**Visual issue being corrected:** R04 still looked like a smooth, freestanding engine capsule with thin unsupported pipe loops and small nozzle stubs, despite passing render and mounting tests. The official Space Age reference shows a layered industrial assembly with major side manifolds, armored pressure housings, a large bell/exhaust mouth, and a separately rendered platform-floor integration patch. This remains a candidate original interpretation, NOT pixel-accurate vanilla recreation.

**R05 geometry implemented** in industrial_detail_r05.py: curved conformal segmented shoulders (following elliptical hull coordinates), discrete flared thermal/nozzle petals, port coupling and fastener meshes, supported paired supply lines, ribbed thermal fins, and restrained 3D metal surface variation. The source preserves previously passing separate floor integration and below-deck mount geometry. All R05 captures passed in GitHub run https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40295674064 after correcting a panel-fastener argument mismatch caught by the strict Blender process exit-code check.

**R06 design changes**, based on inspection of the R05 contact sheets:
- A single source-of-truth nozzle placement/diameter contract, thruster_profile_r06.py, replaces conflicting duplicated dimensions in geometry and detail code.
- Hydrogen single bell expanded to 2.55 tile diameter; reference vanilla bell 3.06 within its 4-tile width; thetazine has twin 1.56-tile bells; large void has three 1.15-tile bells; narrow 1x9 spine retains a 0.74-tile bell.
- Bell mouths retain real separate scalloped petals and internal turbine vanes.
- Outer fuel piping moved inboard to hug the engine housing; new articulated dorsal armor interrupts the flat smooth capsule surface. Oil-darkened materials use restrained noise/bump and a rougher finish.
- Scene source, QA manifests and CI names now identify R06, preserving R04/R05 workflow artifacts for comparison.
- The first R06 calibration failed correctly because the enlarged 4x8 vanilla reference projected out the left frame boundary. A camera-azimuth correction for long 4x8 bodies fixed it without shrinking the larger nozzle or relaxing edge-boundary validation.

**Final verified R06 workflow:** https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40297034853

- Both independent jobs PASSED in Blender 4.5 LTS: four model scenes and four calibration scenes.
- **44 real transparent captured PNG frames**, **18 packed directional/state atlases**, **eight reopened native .blend scenes** and separate static floor integration PNGs.
- 0 reported alpha frame-edge clipping assets after the camera correction.
- R06 physical exhaust/mesh proof passed: hydrogen 12 nozzle petals, thetazine 24 petals over 2 bells, heavy void 36 petals over 3 bells, narrow void 10 petals.
- Calibration includes 4x8 vanilla-prototype approximation, its idle/run state keyframes, and no-clipping render proof. It is NOT faithful original-art reconstruction, full 64-frame vanilla recreation, or a Factorio in-game test.
- Original Tech Priests runtime/entity graphics are untouched.

**Observed remaining visual debt from actual R04 → R05 → R06 review:** Though the nozzles now occupy more convincing proportions and the metalwork is more detailed, the big central body still reads too much like a smooth capsule. Side pipework needs physically supported junctions and cast armor enclosing it. Missing: realistic multi-layer heat shielding and wear, full flame and separate emission capture passes, vanilla-matched lighting and attachment overlays, and real engine test at Factorio 2.0.77. The headless Blender source builder is tested; the separately installable Sprite Capture Studio add-on is **not** yet exercised by this workflow. These are explicit next development gates, not grounds to claim production-ready assets.
