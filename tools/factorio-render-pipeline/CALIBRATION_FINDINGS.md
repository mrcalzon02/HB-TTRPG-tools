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

## R07 vanilla benchmark: select/mount geometry, dynamic flame, conditional connections

Authoritative Factorio 2.0.77 source: https://github.com/wube/factorio-data/blob/2.0.77/space-age/prototypes/entity/entities.lua
Official animated gameplay reference (retrieved during CI, not committed as source artwork): https://wiki.factorio.com/File:Thruster_entity_anim.gif

Earlier calibration wrongly treated the vanilla 4x8 selection area as a solid 8-tile engine. Correct interpretation: collision [-1.7,-2.2]..[1.7,2.2]; buildability about [-1.8,-2.3]..[1.8,2.3]; selection [-2,-2.5]..[2,5.5]. The mount/pressure engine is near 4x4.75, and the selection includes the exhaust. The script explicitly translates Factorio's +Y aft to Blender's -Y aft.

The vanilla source has 64 main-animation frames (speed 0.5), a separate static floor integration patch, 4 conditional named pipe overlays (pipe-1 through pipe-4), additive glow, and a separate flame effect positioned at Factorio {0,5.5}. New benchmark source separates these visual layers and preserves an editable scene containing 3 animated flame meshes. It renders independent effect PNGs and 4 conditional pipe PNGs, and validates source coordinate anchors and image bounds.

Verified layered workflow: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40386604801
Evidence from this run: calibration job 4 source scenes; 28 body PNG frames; 4 separate animated flame frames; 4 conditional pipe overlays; 10 state/orientation atlases plus a flame atlas; no detected edge clipping. Model regression job passed unchanged. Official wiki GIF reference was fetched successfully and compared visually in the uploaded `reference-comparison-preview.png`. This is an UNREGISTERED gameplay GIF comparison, not a pixel accuracy score, and the benchmark still renders only 4 running samples rather than 64 production frames.

The GIF comparison exposes large remaining differences: vanilla has dark irregular pressure machinery, multiple complex subassemblies and valves, heavy heat shrouds, and a long bright blue-white plume. Our R07 benchmark still appears as a light capsule with a short translucent blue wedge and turbine-like fan blades inside the throat. It should not be called visually matched.

R08 source (`vanilla_visual_refinement_r08.py`) is a targeted follow-on containing an original dark multi-chamber pressure assembly, bolted sectional shields, thick external injector piping and shrouded bell. It is applied ONLY to the vanilla benchmark, not the production/custom mod models. Its code commit is NOT an acceptance result; read the dedicated next Blender workflow for proof before claiming the R08 render passes.

Next specific R09 defect: the nozzle interior needs longitudinal bell liner ridges and a dark open chamber instead of hub-and-spoke propeller/fan triangles. Real prototype geometry and wiki reference stay the calibration authority; in-game load and 64-frame parity are still outstanding.

## R07–R10 vanilla benchmark calibration (2026-10-26)

Reference: official Factorio 2.0.77 space-age/prototypes/entity/entities.lua from wube/factorio-data, plus the vanilla thruster animation at https://wiki.factorio.com/File:Thruster_entity_anim.gif.

Vanilla selection box is [[-2,-2.5],[2,5.5]], collision box [[-1.7,-2.2],[1.7,2.2]], and ground buildability [[-1.8,-2.3],[1.8,2.3]]. The former 4x8 solid-hull assumption was incorrect. Current benchmark deliberately models around 4x4.75 tiles of mounted machinery inside a larger selected visual/exhaust region. Factorio +Y is aft, Blender -Y is aft.

R07b PASS: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40386604801. Captures independently validate floor integration, engine body, working flame, and four conditional pipe overlays with original prototype map coordinates.
R08 PASS: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40387887945. Added genuinely modeled pressure hardware; visual comparison still showed unnaturally pale casing, strongly symmetric upper assemblies, a shallow fan-filled throat and a blue crystalline rather than continuous thermal plume.
R09 PASS: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40388888408. Three native Blender camera views from a single saved benchmark: previous_shallow [1,-6.8,6.88], centered_high [.18,-6.8,10], steep_overhead [0,-4.8,11.5]. Their alpha bounds avoided edge clipping. Centered_high was chosen as the next default because it shows symmetrical body machinery without flattening the visible bell. The benchmark throat received a dark inner refractory liner in place of the shallow fan disc.
R10 is experimental: a 12-running-frame vanilla benchmark at 320x640 with longer independent blue-white flame. Do not call it passed until its particular workflow run has passed. The R09 dark idle throat deliberately removes a permanent cyan ignition disk; keep moving light in the independent exhaust collection.

These capture source revisions do not authorize replacement of any Tech Priests production art. More work remains on heavily integrated side machinery, nonuniform metal wear, deep nozzle darkness, white-blue plume, exact lighting, the user-facing Capture Studio add-on execution path, and an isolated real Factorio 2.0.77 runtime test.

### R10 tested exhaust-frame correction

GitHub Actions passing run: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40390817919

The first 12-frame R10 experiment failed the deliberately strict clipping gate: the vanilla engine body and all four conditional pipes were fully within their canvases, but 8 of 12 long flame frames touched the bottom edge of a 320x640 cell. No geometry was accepted on that failure. The final fix translated the selected centered-high orthographic camera and aim by one Blender tile aft, retaining the same viewing direction and plume length. The saved Blender camera now has location approximately [0.18,-7.8,10.0] and aim [0,-1,0.56]. The verifier guards this setting.

Final evidence: 13 body frames (1 idle + 12 running), 12 distinct independent exhaust frames, four optional conditional pipe overlays, one floor integration patch, and the real Blender scene. All engine, flame and pipe images passed frame-edge checks. First flame alpha bbox was [107,436,200,625] in the 320x640 canvas, leaving 15 pixels below its visible silhouette. Reference GIF comparison also loaded successfully. The four custom model regression captures passed, unchanged from their R09 silhouette family.

Visual review still rejects production fidelity: the engine body is lighter and far less mechanically dense than Wube vanilla; the candidate exhaust is a narrow blue tapered translucent blade instead of a brilliant irregular blue-white plume; the current object requires better housing/side-machine topology, lighting and separate glow/heat treatment. Do not substitute this camera test for a Factorio engine acceptance or user-facing Blender add-on test.

## R11 — structurally deeper nozzle and external afterburner machinery

Reference interpretation: the colored directional arrows and fuel gauges in the vanilla reference are 2D information overlays. They are NOT Blender scene meshes and must never be mistaken for physical engine parts. The afterburner vanes physically hang from OUTBOARD machinery over the circumference of the bell; they are NOT painted-on nozzle petals or unsupported floating fins.

**First verified R11 workflow:** https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40400777821 (both calibration and custom model regression jobs passed). The Blender .blend verifier observed a true 2.28-tile open-end axial refractory throat, eight separate closed-geometry afterburner vanes, eight external cantilever braces/feed lines, and no 3D UI indicator meshes. It explicitly requires open-only quad strip topology (no end-cap polygons) on the deep liner. An earlier run detected a stale test-harness assumption when a blue indicator-like coupler was removed; the repaired verifier measures ANIMATED emissive materials actually used by visible scene geometry. The repaired test passed for the orange reactor material with distinct idle/run keyframes.

Calibration exported four test .blend scenes, 36 source body PNG frames, 10 packed atlases, 12 independent flame frames, four conditional pipe overlays and separate floor integration patches. The R11 inspection environment also rendered two additional actual Blender camera views: aft-axis into the deep refractory throat and aft three-quarter view of the suspended afterburners. All image edge checks passed, with no original Tech Priests art changed.

**Visual findings from actual R11 inspection:** the depth is visible, but pale ceramic vanes present as a large bridge/arch across the nozzle mouth. Although supported geometrically, their chassis connection is visually weak. The R11.1 correction narrows their angular width, uses darker structural metal and adds an actual root socket/bridge from the machinery to each suspended arm. Treat R11.1 as a pending experiment until its separate workflow succeeds.

**Environment refinement:** .github/workflows/factorio-blender-capture-batch.yml now caches the pinned local Blender 4.5.15/Python 3.12 user environment between GitHub Actions runs; all model scenes and diagnostic PNGs remain freshly generated on each execution. The cache is an efficiency mechanism, not proof of rendering compatibility, so the Blender --version, real render and saved-scene validators still run.

Next quality gaps: afterburner support read at actual game zoom, stronger reference-matched deep-heat materials, more irregular/supported central pressure systems and much more convincing separate luminous plume. The official reference itself is not redistributed as licensed source art; it is fetched only for comparison. No live Factorio 2.0.77 integration acceptance yet.

### Verified R11.1 / R11.2 afterburner cleanup

**R11.1 passing run:** https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40401520301. Eight cantilevers were narrowed/darkened, and eight genuine chassis-to-suspension links plus root sockets were added. Both model and calibration jobs passed; the saved .blend validated the 2.28-tile open throat, eight suspension arms and the independently animated exhaust. The nozzle macro views still showed a dominant pale arch.

**R11.2 passing run:** https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40402575421. Image inspection traced the pale arc mainly to legacy R05 ceramic cone-attached heatshield petals, NOT the new machine-suspended afterburners. Only the vanilla benchmark removes those old petals and their floating rim rivets. The custom Tech Priests model family retains its own existing petals. Blender source QA explicitly requires ZERO cone-mounted mock afterburner petals in the vanilla benchmark, while still demanding eight separate outboard vanes, eight cantilever arms, eight feedlines, eight chassis attachment links and eight root sockets.

R11.2 verified results: four calibration Blender scenes reopened successfully; 36 rendered body frames across calibration tests (including 13 for the vanilla case), 10 packed body atlases, 12 independent flame frames, four conditional pipe overlays, separate integration-patch renders and two high-resolution rear nozzle inspection views. All frame-edge, alpha, animation and structural geometry checks passed. The four custom model regressions independently passed.

**Visual result:** compared at identical camera angle/resolution, the R11.2 afterburner tips now read more distinctly as externally suspended machinery rather than a continuous ceramic ring over the nozzle. The engine still requires detailed bracket joins and darker, textured heatshields. The throat remains pale on its inner wall and could use more photometric contrast, and the current flame remains an obviously procedural translucent geometry shape rather than the brilliant irregular vanilla jet. These remain user-review targets, not automatically acceptable art.

The CI system now has a version-pinned Blender/Python per-user environment cache. It only accelerates package setup; complete Blender headless rendering and saved-scene validation still run on each revision. Reference arrows/fuel gauge UI remain excluded from actual 3D geometry.

None of these changes replace live Tech Priests sprite assets, test real Factorio 2.0.77 placement, or constitute a Codex handoff.


## R13 — vanilla-only joined upper machinery and rough refractory (2026-10-26)

Source evidence: R11.2 actual Blender output from Actions run 40402575421,
including aft-axis and three-quarter nozzle views, body sheet, and floor/body/
flame composite. The inner cone remained conspicuously pale, and the top row
still resembled uniform xylophone bars. R12's audit of real original thruster
atlas images found about 93% of changed alpha silhouette pixels in rows
410-541 of the 264x542 cell; the upper outline is nearly stationary.

R13 replaces 8 repetitive R08 guards, 7 repeated heat windows, and 16 guard
bolts with one joined axial pressure trunk, offset port accumulator, starboard
oxidizer chamber, three different cast guards, four rooted pipe systems, valve
fittings, and two thermal ports. R11's OPEN throat and R08's internal drum
use a low-reflectance, rough refractory; the outer bell uses oxidized shell
metal. The model remains editable in the existing .blend scene and obeys
the no-3D-informational-overlay contract. No speculative mechanism animation,
custom model alteration, Tech Priests gameplay or production art replacement.

GitHub Actions will verify Blender scene reopen, geometry, masks/layers and
actual PNG exports. Visual similarity is for art review, not a threshold gate.
PENDING: inspect R13 rendered captures before claiming visual improvement.
