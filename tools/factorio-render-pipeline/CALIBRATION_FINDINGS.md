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


### R13 initial CI repair — stale verifier requirement

First R13 GitHub Actions: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40413184680.
Blender completed generating the calibration source scene and frames, but the
saved-scene QA stopped at a PRE-R13 assertion that demanded eight
R08_centerline_black_pressure_shield_ meshes and seven old thermal slots.
R13 intentionally removed them; Blender reported zero shields. The test itself
conflicted with the approved structural replacement. Its obsolete R08 count
requirements are removed; all other geometric/capture QA remains enabled.
R13's own validator explicitly rejects surviving false bars and requires
the joined replacement meshes, dark refractory material assignments and
physical heat ports. This is not a reduction of the intended validation.
Pending a complete rerun and visual review.

## R14 — 64-frame BODY versus LIGHT motion isolation (2026-10-26)

R13 corrective capture https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40413530088:
both calibration and custom-model jobs passed, including full Blender scene
reopen validation, frame exports, pipe layers and geometry checks.

R12's original atlas audit measured 63 adjacent body transitions, with most
changed alpha pixels in rows 410-541. The new R14 audit extends it to all
**64 cyclic pairs**, explicitly measuring 63 -> 0, regional silhouette
threshold crossings and opaque-body luminance separately. It independently
measures the 64 light-layer transitions, provides 1/2/4/8/16/32-frame
phase comparisons, and saves per-pixel alpha-change frequency + native frame
contact sheets to a PRIVATE local evidence folder.

This is NOT automated reconstruction of the engine's hidden 3D topology.
Luminance differences can be emitted light/shader/shadow changes, so no
unobserved animation is added to Blender based on RGB differences.

The previous conversation's original ZIP remains indexed in the user's
project Library, but raw-byte access to that existing Project file is not
available in this session. We inspected the previously generated R12 source
contact sheet, NOT a newly extracted 64-frame ZIP. R14 was exercised against
generated non-copyrighted fixture atlases (4 independent functional tests);
the actual original ZIP report is PENDING fresh execution with accessible
local archive bytes. Its output must not be uploaded to this public repo.

Local operator command (after providing their own installed-game ZIP):

    python tools/factorio-render-pipeline/thruster_motion_audit_r14.py /path/to/thruster.zip --output /private/local/factorio-motion-r14

Functional Python unit tests run automatically via the existing
factorio-render-pipeline-validation.yml source workflow. No Tech Priests
gameplay, custom thruster mesh or approved production sprite is modified.

## R15 — source-visible industrial upper assembly (candidate; 2026-10-26)

The R12 original source contact sheet shows two dark, corrugated upper end
structures flanking a substantial pale/oxidized central casting, with visible
pipework joining the outer and center systems. These are evidence of the
rendered FORM, not a license to assert their hidden fluid/mechanical topology.
The verified R13 body still lacked those distinctive forms.

The R15 VANILLA BENCHMARK ONLY adds two truly modeled irregular corrugated
upper feed bodies, matching end collars, physically routed tubes ending at
pressure sockets, a broad centerline injector shell, three clamps, a continuous
return line and a joined interface. All are editable Blender geometry with
no speculative object animation. Eight existing outboard afterburners remain
independent with their attachments intact; vane material becomes darker and
rougher because the R13 bright-white tips resembled informational arrows.
UI arrow/fuel graphics are still never part of the physical mesh.

New saved-scene checks reject missing static hardware, missing outboard vanes,
incorrect vane shader assignments, or unsupported source-motion keyframes.
No live Tech Priests art/gameplay changes, and no user-owned vanilla source
bitmaps added to GitHub. Candidate visuals require actual CI image inspection.

### R14 / R15 confirmed workflow and visual review

**R14 source tests:** https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40414990473
PASSED. This validates synthetic 64-frame atlas interpretation and true cyclic
pair metrics, not a new execution against the original inaccessible ZIP.

**R15 real Blender capture:** https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40415501361
PASSED in both calibration and custom model matrix jobs. Source procedures
also passed in https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40415501329.
The saved Blender scene reopened successfully, 13 vanilla body frames were
rendered (1 idle + 12 run; all 13 distinct hashes), 12 independent flame
frames and 4 pipe overlays retained their separate passes, and the real
captured images passed clipping diagnostics. Four existing custom model
regressions passed without code or artwork changes.

Real PNG comparison from identical R13 and R15 camera position and cell size:
- R13 body idle alpha bbox [55,185,262,511] on 320x640; visible W/H 207/326=0.6350.
- R15 body idle alpha bbox [55,179,262,511]; visible W/H 207/332=0.6235.
- R13 median approximate RGB luma (visible alpha>128): 0.2267 normalized.
- R15 median approximate RGB luma (visible alpha>128): 0.2101 normalized.
- Vanilla reference R12 bbox ratio from original artwork: 0.487. These
  measures are NOT registered for camera/prototype zoom and are not a visual
  acceptance score.

Direct visual inspection: the additional black corrugated upper pieces and
light center injector casing are visible and visually more mechanically
distinct. The aft nozzle remains a comparatively bare metallic cone. Several
pale pointed thermal parts remain easily mistaken for informational arrows;
reassigning the R11 vane shader alone did NOT fix those visible shapes.
Do not claim that defect resolved. The original has denser irregular
surface machinery, more aged materials, and substantial afterburner hardware.

**R15 visual status: meaningful but limited refinement, NOT vanilla-matched,
NOT production-art-approved.** The animation remains mostly fixed mechanical
geometry with separately changing emissions. Do not invent motion or assert
the hidden rig until the complete source archive can be processed in R14.

## R16 — fin shape and outboard carrier assemblies (candidate)

User directs special attention to the fin/afterburner assemblies in the
original source material. Direct visual comparison of preserved vanilla
64-frame contact sheet and verified R15 three-quarter nozzle shows a definite
form-level error: the original visible thermal plates have broad, irregular,
nearly square heat-stained free ends, while R11 through R15 used sharp
arrowpoint strips terminating at half-angular-width 0.038 radian. R15's dark
shader adjustment cannot correct the wrong fin geometry.

R16 remeshes the same eight independently suspended R11 vanes from broad
multisurface solid plate strips. The trailing angular half-span is now 0.121
versus root 0.082 (wider, NOT tapered to a point), with 4 true thermal-material
zones: aged root, worn center, purple oxidized lower zone, blue overheated lip.
There are no false painted arrows or game-source pixels.

Each plate is supported by an actual connected load graph:
existing casing root -> explicit R16 outboard saddle -> two stiff
shoulder braces and root clamp ears -> transverse load-bearing crosshead ->
the heavy plate itself; existing capillary is terminated at a physical
heat-feed socket. There are 8 saddles, 16 braces, 8 crossheads, and 8 plate
termination fittings. The metal may be hot-scarred but the informational
arrows/fuel indicators remain separate non-physical UI layers.

**Mechanism limitation:** these are engineered supports consistent with
visible silhouette, NOT a claimed reverse-engineering of the manufacturer's
hidden hinge/actuator topology. The available contact sheet cannot establish
how the mounts flex or rotate; all these parts remain stationary pending
direct original 64-frame motion inspection. The original archive still needs
reattachment as ZIP (do NOT need to unzip) for local data processing.

No gameplay, Tech Priests production sprite, custom 3D model or sprite
packaging changes. This candidate requires a full independent Blender capture
and qualitative comparison with the original image.

## R16–R17 verified post-capture assessment (2026-10-26)

R16 real Blender captures passed BOTH jobs:
https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40417003783
The candidate R16 calibration archive includes real idle / running body,
aft-axis deep throat, three-quarter thermal plates, all conditional pipes,
and independently exported effects. Custom-model regressions passed.

Actual R15 and R16 PNG review at matched camera positions shows:
- Broad squared-away R16 hot ends are more physically plausible than earlier
  arrow-spear strips, and the new cradle/crosshead structures are visible.
- Root attachments are now more explicit, including double braces.
- HOWEVER, the eight supports are still overly identical and symmetrical
  relative to the highly irregular, crowded original in-game engine.
- The dark open nozzle remains but original source's layered circumferential
  machinery and plate silhouettes are not yet faithfully reproduced.
- Fin dynamics remain unknown: a successful Blender structural inspection
  does NOT prove native mechanical articulation.

R17 authoritative entity-layer definition:
https://github.com/mrcalzon02/HB-TTRPG-tools/blob/main/tools/factorio-render-pipeline/THRUSTER_ENTITY_ASSEMBLY_R17.md

Upstream 2.0.77 code confirms thruster-light-1 and thruster-light-2 are TWO
PAGES of the SAME 64-frame synchronized, additive draw_as_glow animation
with fadeout, not physical machinery. In particular their 384x832 cells
cannot be naively aligned with the 264x542 body sprites without decoding
the original sprite shifts and registered prototype frame positions.

The four separate named pipe visualisations are conditionally enabled by
fuel/oxidizer fluid-box connectors, with exact ports and pixel shifts
recorded in the R17 contract. Do not combine them with permanent geometry
or treat always_draw as an unconditional port display.

Mechanical sound accents at 25 (stop) and 52 (move) are reference phase
windows; highlight 24–26 and 51–53 of body and lighting separately rather
than guessing a fin pivot. Original bytes still need to be directly available
from a reattached, UNEXTRACTED thruster.zip for the next precise motion pass.

R17 source CI functional verification:
https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40417786486
PASSED. It checks the atlas page mapping, original named port contracts,
mechanical cue metadata and private generation from synthetic fixture
graphics. No actual source-game light pages were extracted in this session.

## R18 — USER-SUPPLIED ORIGINAL ZIP actually opened, reference motion measured

The original supplied archive was opened and decoded in this session:
- Original ZIP SHA256: 0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791
- Original ZIP 29,770,808 bytes, containing 18 entries.
- Body: 64 RGBA 264×542 frames, 2 pages of 8×4.
- Glow: 64 RGB 384×832 frames, 2 pages of 8×4.
- Original body descriptor shift (1.5,-39.0) px; light (0,0).
- Pipe-1..4 RGBA native 384×832; source actual nontransparent bounds:
  pipe1 [273,70,322,130], pipe2 [274,196,322,257],
  pipe3 [63,196,107,257], pipe4 [63,70,110,133].
- Measured 64 cyclic alpha transitions (>10 opacity):
  TOTAL 78,614 changed alpha pixels;
  rows 0–339: 28, rows 340–409: 5,435,
  rows 410–469: 18,267, rows 470–541: 54,884.
  Bottom 132 rows therefore account for 73,151/78,614 = 93.05%.
- Centerline upper thermal shields source X100–163/Y340–424 have 0
  changed alpha pixels across all transitions: these should stay static.
- Outer-facing upper apron edges change; lower rim tips and outline move.
- Deepest opaque pixel envelope across frames in source rows 475–541:
  image-left inner X50–94: 522–539 (17 px);
  image-right inner X165–214: 519–538 (19 px);
  image-left outer X8–44: 511–514 (3 px);
  image-right outer X220–255: 508–514 (6 px).

Motion proxy: four LOWER circumferential R16 fin tips now use Blender
shape-key deformation driven by 64 source-measured lower alpha envelopes,
scaled conservatively; upper four and every load-bearing root are STATIC.
These are observed 2D envelopes, NOT recovered Wube hinge rig, joint axes,
or exact pixel registration. Original full-color light frames are NOT used as
motion input. The additive RGB glow remains its own working visualisation.

A complete private local analysis package was assembled containing 64-body/
64-glow synchronized GIF, region-motion heatmap, cue-frame pairs, and numbers.
DO NOT commit private original or derivative raster graphics to this public
repo. Source-neutral measurements and Blender approximation only.

No Tech Priests production assets, gameplay or Lua altered. R18 requires
independent source QA, actual Blender saved-scene verification and side-by-side
visual comparison before treating the model revision as accepted.

### R18 post-render acceptance and remaining gaps

Original ZIP input was actually decoded and measured before this run.
R18 source functional CI PASSED:
https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40425757370
R18 full HEADLESS BLENDER capture PASSED, both calibration and models:
https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40425757419

R18 actual capture archive retains editable .blend, 13 distinct body PNGs
(1 idle + 12 preview run frames), 12 flame frames, 4 conditional pipe
overlays, floor patch and nozzle/detail views. All saved-scene geometry
and keyed-source-motion tests passed and the QA report recorded zero edge
clipping. The full 64 distinct source motion keys are authored in the
editable .blend: the 12 run PNGs are only calibration samples, NOT a full
64-frame production game atlas.

Independent image inspection on SAME camera and resolution:
- R16 idle alpha bbox [54,179,263,515]; W/H ratio = .6220.
- R18 idle alpha bbox [54,179,263,517]; W/H ratio = .6183.
- Original body source alpha bbox [4,0,263,532]; W/H ratio = .4868.
- Compared R16 vs R18 PNGs at source cell (320x640), visible differences
  occurred almost solely within candidate Y458–516, especially the lower
  fin tips at Y470–516. Upper rendering Y<400 had no changed pixels.
  This confirms the intended **spatial localization** of the R18 edit.
- Physical lower lip shifts are small but image-visible; 12 sampled
  run frames are distinct. Comparison PNGs were actually inspected.

Do NOT claim full visual match to vanilla, source-proven hinge position,
registered output scale, or Factorio runtime integration. The candidate
is still too wide/short and its perfect ring of mechanically identical
outboard supports visibly differs from the irregular original. Preserve
the original source ZIP and visual analysis privately; do not commit
copyrighted original/derived spritesheets or contact art to public GitHub.

Next dedicated milestone: original-style separate emissive working visualisation
from Blender, timed as one 64-frame ADDITIVE glow atlas with the native 384x832
cell/shift contract, conditional pipes, and a no-glow-embedded-in-body gate.
Do not pretend that the current 12-frame flame export or R18 material keyframes
already implement that full separate light pipeline.

## R19 — actual-source cone interior and thermal vane root construction

Reinspected ORIGINAL user-supplied `thruster.zip` 64-body atlas, frame 00,
native 264x542 crop at rows 330-541. The lower cone is NOT a smooth empty gray
bowl: it has long, narrow, deep black refractory strakes, staggered
overlapping dark metal heat shield/scales across the forward wide section,
and a thin annular belt of recessed ventilation openings. The source also
shows heavy mounting hardware and welded/segmented root faces on the 8
visible external afterburner vanes. Original glow is a separate RGB additive
atlas and does not belong to static physical geometry.

R18 Blender reference close-up revealed a nearly featureless smooth gray
interior and a ring of short near-throat rods. R19 corrects this by generating:
- 40 near-mouth solid curved heat-shield sections,
- 40 staggered middle-zone curved heat scales,
- 40 longitudinal, depth-following radial strakes,
- 40 individually modeled dark annular port recesses,
- eight outer fin root back-face reinforcing ribs and eight root bolts,
  ahead of R18's separately deforming lower free ends.

All new interior parts follow the original R11 2.28-tile open cone's actual
radial profile, positioned inboard from it rather than capping the cone.
They remain EDITABLE individual Blender objects in a named collection.
Structural verification checks 160 interior objects, retained R11 polygon
count, 8 attached fin roots and separate emissive-layer policy. Added
two real orthographic diagnostic closeups of inside wall and fin connections.

This is a source-visible 3D approximation, not an unambiguous recovery of
Wube's source 3D models. Source art is never committed or republished in
this public repo. Full genuine Blender screenshots and CI outcomes must be
reviewed BEFORE any claim of visual fidelity or game compatibility.
