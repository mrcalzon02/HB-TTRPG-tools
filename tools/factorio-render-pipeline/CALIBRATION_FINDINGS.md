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

### R20 — actual R19 closeup inspection revealed blocked deep throat

R19 real GitHub render PASS:
https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40429034362
R19 source CI PASS:
https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40429034562

Direct, identical-camera examination of R18 versus R19 axial and three-quarter
PNG captures showed R19 near-mouth heat scales are visibly added to the rim,
and eight outboard root welds can be seen. However the interior remained a
much-too-smooth dark bowl with almost no visible *deep* strakes. This is a
REAL visual defect despite R19 structural success. The alpha bbox did not
change (R18/R19 both [54,179,263,517] on 320×640), as expected for geometry
added within the original silhouette.

Root cause in the existing model: R08's `aft_internal_reaction_drum` was
constructed with generic lathe's DEFAULT `close_ends=True`, yielding 200
quad wall polygons plus 2 solid N-gon endcaps. R11 later added a deep OPEN
liner without removing those old blocked faces. The endcap physically masked
deeper interior details, so adding still more strakes would be pointless.

R20 targets the actual obsolete caps directly, REBUILDING THAT SAME EDITABLE
R08 DRUM MESH using its 200 original side quads but WITHOUT either closed
N-gon end disk; its established R13 dark refractory material is retained.
40 existing internal R19 strakes receive a subdued physically metallic,
nonemissive shader to help their depth read. Neither R18 vane motion keys,
R16 chassis load graph, nor 8 root stiffeners are mutated. All 2 cap faces
and 200 retained side quads are verified after saving and reopening .blend.
The next actual CI captures must confirm visually that the originally masked
strakes are now revealed. A successful structural check alone is NOT enough.

### R20 VERIFIED — source vs actual Blender PNG side-by-side

R20 source procedure tests: https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40429888292
SUCCESS; tested real source-module invariants. Blender headless batch:
https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40429888504
SUCCESS in BOTH calibration and custom models jobs. The saved editable
scene reopens with exactly the original 200 R08 side quads and NO closing
endcaps. R19's 40 inner strakes and R18 original-measured lower fin keys
survived. The calibration artifact also includes two additional targeted
close-up PNG views of the cone lining and outboard fin root machinery.

Independent comparison of actual camera-matched R19 vs R20 axial, oblique
and fin-root closeups confirms:
- R19's formerly invisible deep cone longitudinal strakes ARE NOW VISIBLE
  as 40 radial ridges converging toward the dark central throat in R20.
- The 40+40 near-mouth and mid-zone ceramic scale geometries remain
  physically present. Deep liner is visibly *open*, not a flat disk.
- No change to overall body idle alpha bounds: both R19 and R20
  [54,179,263,517] on 320x640; source vanilla aspect still far slimmer.
- 13 original pipeline body captures (one idle, twelve running) remain
  hash-distinct. All frame and overlay clipping QA passed.
- Source-original vs R20 side-by-side remains a QUALITATIVE visual comparison
  with UNREGISTERED view projection; do not claim numeric pixel match.

Important remaining limitation: although R20 fixes the obstructed throat,
the visual surface is MUCH TOO SMOOTH/light with regular thin ridges and
tile detail mostly confined to mouth rim. Original original ZIP frame 00
shows a broader dark two-zone shingled refractory face, a denser annular
band of low-contrast recessed openings, and prominent irregular heat-scarred
external fin ends. Candidate support cradles are over-symmetric. The next
revision should target dark, layered, physical ceramic scale geometry
ACROSS the inner visible cone (not just its circular lip), while retaining
the now-verified 2.28 tile open nozzle, connected fin root assemblies, and
distinct conditional pipe / light effect layers. No Tech Priests production
art, Lua or gameplay is touched.

No claim of Factorio-runtime compatibility or finished vanilla-style
visual fidelity is made; user can inspect the real R20 GitHub capture ZIP.

## R21 — one MASTER source-referenced fin profile: thin sheet, ridge, holes, clevis

Reference: original user-supplied installed Factorio `thruster.zip`,
frame 00 body (not RGB glow), physical hot-tab region at source Y330–430.
Source is a 2D raster and does NOT uniquely show occluded fins/hinge axes.
Current R20 has eight visually thick, uniform slab-like fin ends. User
identifies real source as thin shovel/spade-like stamped panels, not cubes;
blue/pink heat tint is SURFACE OXIDATION, not extra distal thickness.
The source seems to show greater visible fin density than the current set,
but the exact hidden circumferential count is NOT verified.

R21 *model-first* change: all existing eight R16 supported fin objects
are replaced with exact copies of one geometric master profile, while
retaining original names and R16 mount graphs. The face starts narrow at
the root (half-span .062 rad), widens into a .150-radian shoulder midspan,
then gently tapers to .121 at the free end. Fin metal thickness is just
.024 Blender tiles throughout, instead of the R16 sheet's .084 radial
thickness; a narrow central raised fold adds apparent depth without making
the whole fin a solid bar. Mesh cells are physically omitted for two
3-cell-long side slots, and each hole has real interior walls, maintaining
the finite-thickness manifold. The hot lower end has a smoothly mixed
burnt-purple/blue VERTEX COLOR gradient, not 3D added geometry.

Two thin clevis ears and one transverse round pin are independent editable
mounting objects per fin, placed at the supported R16 root crosshead.
R18's existing real 64-key shape deformation is still applied AFTER the
new fin mesh so animation remains correct. R19 exterior ribs and R20
deep open interior are retained. The initial pass deliberately keeps 8
fins to validate ONE hero shape before changing angular spacing/count.
COUNT IS STILL UNCONFIRMED and 8 is not claimed to match original.

Required QA: manifold through-slot geometry via fixture/unit tests,
saved Blender scene reopens showing 8 panel meshes with R21 vertex
colors and two real pierced slots apiece, 8 independently pinned clevis
assemblies, independent 64-frame distal motion and R20 open nozzle.
Compare user source crop to actual Blender fin closeup at same zoom.
No Tech Priests production sprite/artwork or gameplay module touched.

## R22 — twelve-position fin-spacing CALIBRATION candidate

Actual user's original Factorio 64-frame body atlas, frame 00, shows
three separate central top heat-stained tab ends (approximately x54-84,
x110-147, x178-197 in 264x542 sprite, source rows 340–430). R21's verified
eight-slot candidate only exposed two comparable central hot tips.

R22 tests twelve evenly distributed circumferential slots, which makes
three source-like forward-facing fin groups possible without making the
source 2D art pretend to reveal an authoritative hidden 3D count.
`vane_layout_r22.py` is the one-count authority for all 12 vanilla
R11, R15, R16, R18, R19 and R21 fin/support stages.

R18's exact four measured lower silhouette envelopes remain mapped to
conservative LOWER slots 7,8,9,10. Eight other fins, and every rigid root,
stay static. R19 adds 12 outer root stiffeners while retaining 40
independent deep refractory ribs. R20's open legacy-drum fix remains
unchanged. Saved Blender QA now checks 12 actual thin punched fin meshes,
24 double braces, 12 pinned clevis mounts and 12 fin root ribs, with four
true lower animation curves.

Candidate evaluation must compare the actual camera-matched R21 and R22
nozzle render outputs. Count twelve is HYPOTHESIS, not source fact; exact
hidden original population and support pivots remain unverified.
All work remains in the VANILLA calibration benchmark, not the live
Tech Priests game asset paths or Lua.

### R22 actual visual review and R23 ten-fin count hypothesis

R22 12-slot Blender captured with BOTH calibration and models jobs
PASSING in https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40435360597.
Compared actual same-camera R21 eight-fin and R22 twelve-fin captures.
R22 indeed adds physical coverage but displays FOUR prominent upper
fin brackets against the original vanilla image's THREE main upper hot tips.
This source comparison does not prove the hidden total 3D fin count.

R23 changes the one shared fin-count authority to TEN slots. Geometric
spacing then gives three dominant upper-forward fins near 54,90,126 degrees.
R18 original 64 source-derived lower lip curves remap to indices 6..9,
while the other six fins, all hinge roots and inner machinery stay fixed.
All R21 panels, punched side holes, thin thickness, folded ridge, heat
tempering materials and R20 deep open refractory remain unchanged.
R23 must pass source functional tests AND real Blender saved-scene QA
and visual comparison before being accepted as the leading candidate.
No Tech Priests production entity artwork or gameplay touched.

### R23 ten-fin actual capture VERIFIED, comparative review

R23 source validation PASSED:
https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40436233151
R23 headless Blender calibration + other model regressions both PASSED:
https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40436232928
Saved Blender evidence was downloaded and actual matched-camera rear-axis,
three-quarter and fin-root attachment PNGs were visually compared with
R21 eight-fin and R22 twelve-fin benchmarks.

Physical arrangement result: R21 shows two strong upper central fins,
R22 shows four, and R23 TEN-position trial shows THREE prominent upper
fin attachments, matching the original source's visible central grouping.
This is a qualitative arrangement improvement, not proof of the original
hidden fin count, source CAD or any exact 3D joint reconstruction.

All three variants retained 13 distinct body preview images, 12 flame
frames, 4 named conditional pipe effects and zero alpha clipping risk.
Source QA idle frame alpha bounding boxes in 320x640 cells:
R21 8 fins: [54,179,263,515]; R22 12 fins: [50,179,267,518];
R23 10 fins: [51,179,266,519]. Original 264x542 body source has
bbox [4,0,263,532], but camera projection / cell registration are NOT
equivalent and should not be used as an absolute accuracy percentage.

Current leading candidate for the visible upper nozzle fin spacing is
R23's ten-position shared layout. R21's stamped master fin geometry,
two actual side through-slots, finite sheet thickness, integral formed
ridge and metallic (non-emissive) blue-purple tempered edge remain
the physical geometry for all ten R23 fins. Four measured source lower
motion sectors, all attached load-bearing supports and R20 open deep
nozzle are still validated by saved-scene QA.

Outstanding defects: source-visible tabs remain darker and more heavily
oxidized than our pale R23 tabs; rod-like supports still dominate over
compact clevis/hinge profiles, side slot silhouettes remain subtle
at actual sprite scale, and the whole benchmark model is too short/wide
and too clean compared with the original art. Do not claim visually
finished or Factorio runtime compatibility. No live Tech Priests
graphics/prototypes/gameplay have been modified.

## R25 — CORRECTION: TWO LARGE EXTERIOR SKID-COVER FINS, NOT INNER HEAT TABS

User clarified what the original sprite shows: the INTERNAL hanging
thermal-fin assembly is already satisfactory in shape and must be LEFT
ALONE. At the lower LEFT and lower RIGHT are TWO MUCH LARGER EXTERNAL
covering/skid-like fins. The game sprite is showing their UNDERSIDES,
not two additional slender inner tabs. They must be reconstructed as
separate physical model objects with separate hull attachment paths.

Source original frame00 264x542: far port and starboard exterior
covers run alongside mouth at approx x=8–50 and x=215–258,
with dark underside and blue/purple tempered metal near aft ends.
They are larger and deeper than the inner punched sheet fin panels.
Source cannot reveal completely hidden topsides/hinge mechanisms.
This is a morphological approximation from the original pixels, NOT
new design work, a duplicate internal fin count, or proven articulation.

R25 adds a new distinct editable Blender collection:
R25_EXTERNAL_LARGE_SKID_COVERS_NOT_INNER_FINS. Exactly 2 broad
finite-thickness curved underbody sheets (left/right) with heat
discoloration encoded in the nonemissive CORNER color attribute,
plus one continuous machine-casing support spine, one underside
longitudinal channel stiffener, one root boss and one clamp boss
PER SIDE. The full upper/topside remains deliberately unmodeled
beyond a thickness skin, because not visible in the source.
No independent animation is invented for these coverings.

R25 runs AFTER the current inner fin generator and R18 lower-tip
motion, and verifies the entire prior inner fin collection remains
unchanged. It does not change inner fin count, geometry, R21 metal
slots, lower motion curves, R19 liner, R20 open throat, or separate
original additive light/pipe/flame layers. This is CRITICAL:
NO reclassification of exterior skid covers as nine or ten inner fins.

R25 added two opposite-side Blender diagnostic cameras, plus
new saved-scene verification requiring both exterior panels,
both independent source-to-chassis support graphs, tinted underside
material and no new inner fin objects. The task remains awaiting
real calibrated PNG comparison and workflow pass.

### R25.1 — source-image comparison corrected oversized side flaps

The initial R25 real Blender output confirmed that TWO independent
external covering/skid fins were present and the old inner fins untouched.
But side-by-side source and real Blender camera images showed a major
proportion mismatch: first R25 side covers were too WIDE and wing-like
relative to the source narrower and longer exterior side skids.
Idle alpha bbox changed from R23 [51,179,266,519] to initial R25
[17,179,298,519] on the existing 320x640 camera. Not source matched.

First Blender QA failed because our new verifier incorrectly queried
membership of a Blender object in a bpy_prop_collection: API requires
NAME strings. We repaired the test itself in commit dcccd601 without
bypassing any structural or clipping gates.

R25.1 alters ONLY the pair of exterior skid-cover underside meshes:
maximum halfwidth reduced from .39 to .23 Blender tiles; aft extent
lengthened from Y=-3.73 to -4.04. The actual inner fin population
and 64-frame R18 movement curves are NOT touched. Heat oxide materials
are darkened and blue/purple transition moved along the distal underside;
these remain nonemissive surface colors rather than physical thickness.
Requires actual source-to-render comparison on the next CI capture.

### R25.1 independent source and Blender verification: PASS, not yet matched

R25.1 source-validation workflow:
https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40439336812
PASS. Current complete real headless Blender calibration + custom-model
regression:
https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40439336724
BOTH jobs PASS after fixing the actual bpy_prop_collection membership API
bug rather than disabling verification.

Actual R23/R25/R25.1 idle PNGs were extracted from all three independent
GitHub calibration archives and compared at identical 320x640 camera.
Alpha bounds:
- R23 without separate external skids: [51,179,266,519]
- initial R25 too-wide side flaps:    [17,179,298,519]
- corrected R25.1 narrower skids:   [24,179,289,519]

This demonstrates the relative width reduction (from span 281 to 265)
while retaining both newly visible independently supported exterior
coverings. Color correction makes the LOWER ends blue-purple rather than
assigning extra mesh volume. The full R25.1 calibration artifact includes
new port and starboard exterior UNDERSIDE closeups, saved editable .blend,
13 distinct body frames, all 4 independently captured named pipe effects,
12 independent flame frames and zero alpha-edge clipping.

Direct image inspection confirms R25.1 forms two wide support-shrouded
exterior pieces and leaves inner repeated nozzle tabs unmodified. However
the model is STILL TOO CLEAN and the exterior shapes/overall nozzle
perspective are not yet pixel-registered to the original Factorio image.
No claim that R25.1 faithfully reproduces the exact hidden geometry, that
inner fins have been recounted, or that sprites are production-ready.

Important user-corrected taxonomy: INNER fins (already modeled) are NOT
the same objects as TWO LARGE LOWER LATERAL EXTERNAL SKID-COVER FIN UNDERSIDES.
Keep separate collections, counts and support paths. Never count the large
external skid shrouds as two new little hot tabs.

## R26 — CORRECT UNDER-SHELL SKID POSITION + SOURCE-PORTRAIT PROPORTIONS

User correction: the two large COVERING fins are UNDER the thruster,
not attached at the left/right SIDES. R25/R25.1 were geometrically
wrong despite passing structural QA: their top shell surface sat near
Z=-.2..-.7, essentially lateral wings above the nozzle lower half.
The source shows only two dark/heat-aged UNDERSIDES below the lower cone.
R26 places the entire upper edge of both sheets BELOW Z=-1.1 in
unscaled Blender coordinates, trailing down to Z≈-1.92, with true casing
support stanchions located below the engine and still separate from
the R21 inner tab set. There is ZERO inner fin count/geometry edit.

User also notes original camera SCALE mismatch is intolerable.
Original source body RGBA idle bbox [4,0,263,532] in 264x542
gives 259/532≈.487 portrait silhouette ratio. R25.1 captured body
bbox [24,179,289,519] in 320x640 gives 265/340≈.779.
It is much too squat/wide and leaves 179 pixels unused at top.

R26 introduces an explicit, source-portrait CALIBRATION ONLY
parent scale (.86,1.28,1.0), orthographic vertical span 8.5 rather
than previous 11.2, and translates old R09 camera and target together
1.1 Blender tiles aft without changing camera rotation. This keeps
original editable fin mesh topology and all support connectivity intact,
and moves the 3D silhouette toward source portrait proportions.
The physical gameplay footprint remains 4x8 metadata; the
calibration-parent transform is NOT Factorio-world/runtime approval.
The independent flame pass keeps wider old 11.2 orthographic field
so the nozzle-close crop cannot clip independent jet emissions.

New scene QA checks upper envelope of both outer covers in local Z,
their independent role, source scale/camera metadata, and all old
R16/R18/R19/R20/R21 fin details. Previous geometry pass or source unit
success does NOT count as a full original-image match. Actual rendered
PNG geometry and clipping MUST be measured and inspected afterwards.

### R26 final VERIFIED capture — UNDERSIDE correction and portrait scale

R26 implementation commit:
https://github.com/mrcalzon02/HB-TTRPG-tools/commit/d25756787feb7844e2ce115eb097523c74c2be48
Root-cause fixes for the additional pre-existing strict QA assumptions:
- d4b1b4c: update obsolete camera-target coordinate assertion to
  new actual R26 camera target; retain matching exact comparison.
- b67300b: independent 12-frame exhaust pass must retain its own
  wider orthographic camera (13.6) after the body calibration. The
  original 11.2 field caused actual flame frames 1,2,7,8,9 to touch
  the bottom edge. Fix repositions effect IN ITS CAPTURE, not by
  disabling the existing capture clipping check.

R26 source procedure validation PASSED:
https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40441106065
R26 final REAL Blender calibration and four custom model regression PASSED:
https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40441105966

Verified saved Blender .blend reopens with 438 mesh parts in vanilla
reference. QA reports **zero clipping** for all 13 body frames,
12 independent flame frames, 4 named conditional pipe layers and
floor integration sprite. 13 body PNGs have distinct hashes.

Source original idle alpha bbox [4,0,263,532] native 264x542 =>
width/height 259/532=.48684.
R25.1 original-camera body bbox [24,179,289,519] in 320x640 =>
265/340=.77941, badly squat.
R26 calibrated body bbox [16,35,297,614] in 320x640 =>
281/579=.48532, i.e. only ~0.0015 ratio difference
from the source projected silhouette. This verifies width/height
PROPORTION, not native sprite registration or 3D mesh-detail fidelity.
R26 still has 35px blank above visible geometry, and its 3D components
are much too clean/sparse relative to the actual vanilla frame.

Critically, R26's TWO large exterior covers are now below the bell,
local MAX cover Z=-1.103 (rather than R25 lateral wing Z about -0.2)
and MIN cover Z≈-1.92. They remain two distinct editable underside
cover meshes in their own collection with hull supports; all internal
R21 fins, R18 motion, R19/refractory, R20 open nozzle remain intact.

Compare actual calibrated idle and 448x448 port/starboard underside
camera images from GH capture. R26 is a substantial correct-direction
change but the projected outer cover free ends still hang longer
than the real source's more conformal lower-shell cover silhouette.
The user specifically wants these covers UNDER the thruster, not
separate side wings; deeper conformal contour and source-derived
support geometry remain a future unapproved refinement.

**Not production ready:** applies a 3D scale and camera transformation
to the calibration scene ONLY, while leaving the 4x8 Factorio
prototype metadata untouched. Do not copy such transforms as tested
gameplay or runtime registration before native sprite/pivot validation.
No Tech Priests production art or LUA was modified.

## R27 — SOURCE ONLY. RETIRE INVENTED PER-FIN PISTON & TUBING RIGS

**Source authority:** user-reprovided original Factorio Space Age vanilla
thruster.zip SHA256 0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791,
two 8x4 sheets of 264x542 native RGBA body frames; source-visible screenshot
and upper/lower crops inspected directly. Source is the ONLY reference for
whether geometry exists; mechanical plausibility is not sufficient.

**Visible in original:** dark ribbed main nozzle and hanging heat-stained
thin metal tab faces, two large underside coverings, beige cast upper
root housing, very prominent silver/blue/copper tube-like machinery and
two corrugated coils in the TOP AND CENTRAL ENGINE CHASSIS. Fluid tubes
can be observed in this upper-body zone. The BODY image does NOT show
individual long tubular actuators or dual brace rods traversing each
hanging hot tab, nor distinct hoses delivering fuel into every fin
tip. These were speculative inventions in R11/R16/R19/R21 and R25,
not source-backed reconstructions.

**Corrective action:** a new stage after existing fin and outer-skid builds
removes 20 unsupported object-name families, including all repeated
R11 capillary/suspension-arm and R16 double-brace/ferrule/terminal
artifacts, R19 duplicated root back ribs/bolts, R21 speculative full-ring
clevis props and R25 per-cover fictitious underbody pneumatic/support
channels. It does NOT mask/disable/hide the geometry: Blender objects
are actually deleted from the editable source-calibration scene,
with every family and object name recorded for audit/reversibility
through Git history. It leaves identical visible metal fin panels,
R18 shapes/animation, distinct two R25 underside sheets, main R13/R15
upper pressure routing and all layer-specific effect objects intact.

The absence of observed actuation does **not prove there is none**
inside the real Wube engine. It establishes that the original SOURCE
RECONSTRUCTION TEST MUST NOT MODEL UNVERIFIABLE COMPONENTS in public
camera geometry. Observed short cast fin-root brackets still need
a pixel-registered profile, not invention of new rod links.
A strict, new source-evidence gate checks the exact original archive ID,
each family removed, actual panel geometry conserved, original upper
machinery retained, and no new inferred hinges animated.

Do NOT interpret this as proof the whole R08/R13 upper machine or
R19 refractory topology has been fully audited. That requires the
same object-by-object tracing before declaring global source fidelity.

### R27 VERIFIED: REMOVE ONLY source-unverified repeated fin mechanisms

R27 source-policy CI PASSED:
https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40469346475
Real Blender calibration AND other model regressions PASSED:
https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40469346537

Read-back from actual Blender 4.5.15 saved-scene verifier:
`R27_SOURCE_VISIBLE_ONLY_GATE_PASS ... removed_unsupported 198`.
All 20 precise repeated object-name families accounted for and
deleted as real Blender objects rather than hidden from render.
10 already-modeled inner sheet fin meshes and 2 large original
underside sheet covering meshes were retained, including original
R18 lower source-proxy keys, visible upper machine plumbing and
all R20 deep open nozzle geometry. The **ten** modeled internal fins
remain a prior hypothesis and DO NOT imply source count correctness.

Original R26 saved-scene vanilla mesh count 438 versus R27 334
(the difference in mesh counts is smaller than 198 because many
removed supports were Blender CURVE objects).
Actual 320x640 source-camera body idle alpha bounding box was
unchanged: R26 [16,35,297,614], R27 [16,35,297,614].
A genuine per-pixel comparison detects significant removal in
Y≈295–509, i.e. around upper fin roots and nozzle. R27 did NOT
fake a different scale or hide source-visible upper pipes.
13 distinct body frames and independent flame/pipes/capture tests
PASSED with zero clipping.

Critical qualification after comparing original Factorio frame00
against R26/R27 idle PNGs: the remaining reconstructed central
chassis has too few authentic small irregular structures, large
gray/bronze channels are still too geometric and symmetric, and
the overall scene is visually far from the original source.
Therefore R27 ACCEPTS THE REMOVAL OF UNVERIFIED GEOMETRY,
not the overall 3D sprite match.

Next source-first audit must map existing upper R05/R08/R13/R15
copper/silver tube paths to specific original XY contours and
remove/replace any unsupported large tube features. Record all
mechanical endpoints in the original first; do NOT assert that a
physical support or piston exists simply because it would look
plausible. Original raw Wube PNGs remain solely in private
user source workspace, not committed.

## R28 — source-observed LARGE OUTER UNDERBODY CLAMSHELL CUPS

Direct original source original-body crop Y290..541 (not additive glow)
shows the left and right outer covers curling INWARDS toward the bell
interior, with their inner lips partly shielding the lower heat-tinted
inner fins. In the R27 calibrated Blender original-camera PNG these
were two long, nearly FLAT, isolated strips; they were far too
sideward/low, not a close-fitting two-sided protective enclosure.

R28 does not add any unverified tubes, hinges, pistons, trim details,
bolts, struts or hidden interior components. It REPLACES the actual
MESH DATA of the two already source-established R25 underbody
covers after R27 removes unsupported mechanisms. Nine transverse
physical samples × eight axial stations × TWO constant-thickness
surfaces per cup reconstruct a shallow, open-topped C-shaped
profile with bowed outer rim, CONCAVE cross-section (center hangs
below both inner+outer lips), inward curl reaching abs(X)=0.98
rather than earlier minimum 1.16, and a shorter aft end
Y=-3.63 rather than -3.95. Outboard edge stays within abs(X)=2.07.
These are FIRST-PASS Blender coordinates derived from a visual
source contour, NOT exact hidden Wube source 3D coordinates.
The added narrow back skin is merely 0.036 tile solid-sheet thickness;
no closed housing or unseen upper mechanical structure is invented.

R28 real 3D saved-scene checks require:
- exactly 2 individually editable undershell meshes, both cup-shaped;
- no added Blender objects beyond the 2 existing R25 names;
- 10 current candidate inner fins retain identical vertex/face/key counts,
  original R18 source-proxy animation unchanged;
- left/right cups extend INBOARD beneath them, remain under the bell,
  no speculative mounts reintroduced after R27;
- original ZIP SHA and source ROIs explicitly retained;
- 3 new diagnostic cameras, including two BELOW the bell, validate
  actual underside curvature rather than judging only above views.

No claim of source fidelity is allowed until a real GitHub
Blender saved-scene QA run passes AND a viewer compares original
Source 264×542 against the rendered R28 idle frame/closeups.
Do not touch the production Tech Priests mod or original proprietary
images in the GitHub repository.

### R28 REAL Blender result — geometry works; outer shell still needs projection registration

Original source ZIP original RGB/A body frame 00: native 264x542
alpha bbox [4,0,263,532], W/H 259/532≈0.48684.

R27 source-camera Blender 320x640 body bbox [16,35,297,614],
W/H 281/579≈0.48532. Two nearly flat, long rear hanging external
strips looked too separate from the nozzle rim.

R28 source-camera Blender 320x640 body bbox [22,35,292,581],
W/H 270/546≈0.49451. The two revised physical shells now
hug the lower bell more closely, end visibly HIGHER, curve inward
and shelter lower fins as shallow underslung scoop/clamshell faces.
Overall bounding width to height remains within ~1.6% of source.
However BODY OCCUPANCY is only 546/640≈85.3%, compared with original
532/542≈98.2%. This remains a MAJOR scale/framing registration
deficit despite the similar silhouette aspect ratio; do not claim
native pixel registration or finished source reconstruction.

R28 final commit code repair:
https://github.com/mrcalzon02/HB-TTRPG-tools/commit/6a4e9ac6898c86de1ed823a84349a2d9a36aa9fd
Source procedures passed:
https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40473363304
Headless Blender real saved-scene + custom models passed:
https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40473363154
Saved scene read-back: R27_SOURCE_VISIBLE_ONLY_GATE_PASS
(198 unsupported objects absent); R28_UNDERBODY_CLAMSHELL_SOURCE_PASS;
ALL_EDITABLE_SCENES_PASS 4; 13 distinct body captures;
CAPTURE_QA test-04 clip_risk=False.

REAL diagnostics include separate port and starboard views from BELOW
the nozzle. They verify physically curved metal UNDERFACES and visible
thickness instead of fake painted curves. The original top/hidden side
remains deliberately UNINFERRED. No new pistol rods, hinge assemblies,
feedlines, struts or connection nubbins were added. Inner panels remain
the current provisional 10-slot scene and their meshes/motion were
unchanged; no source-count claim.

Remaining source fidelity defects seen side-by-side:
1. The source covers are closer fitting to the bell: R28 still appears
   as broad, individually detached paddles at the two lower edges;
   inward-protective silhouette needs further SOURCE-LANDMARK shaping.
2. Original outer heat blue is a thin localized discoloration along
   edges, while R28 gradient covers a relatively broad distal area.
3. The whole rendered body has far more empty frame margin than source,
   particularly above and below, even though aspect ratio is similar.
4. Upper main-engine housings, pipe routing, casing textures and deep
   nozzle surface are still substantially wrong (prior R27 finding).

Acceptance: R28 is a verified PROGRESSIVE geometry pass, not a faithful
completed 3D copy of original sprite or Factorio-production approved art.
