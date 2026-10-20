"""Record real check outputs and hashes of the inspected level delivery.
Run after verification, runtime captures and Blender export. No pass status is invented.
"""
import hashlib,json,pathlib,shutil
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=ROOT/'development/levels';reports=OUT/'verification';reports.mkdir(exist_ok=True)
inputs={
    'focused-results.json':ROOT/'build/level-release/results.json',
    'compatibility-results.json':ROOT/'build/level-release/compatibility-results.json',
    'full-sweep-before-fixture-migration.json':ROOT/'build/level-verification/full-regression-before-final-fixes.json',
    'baseline-failure-comparison.json':ROOT/'build/level-verification/baseline-failure-comparison.json'}
for name,path in inputs.items():shutil.copyfile(path,reports/name)
data={name:json.loads((reports/name).read_text()) for name in inputs}
focused=data['focused-results.json'];compat=data['compatibility-results.json'];full=data['full-sweep-before-fixture-migration.json'];baseline=data['baseline-failure-comparison.json']
assert all(row['exit_code']==0 for row in focused),'Cannot record acceptance with failed focused level checks'
red={row['test'] for row in full if row['exit_code']};rechecked={row['test'] for row in focused+compat if row['exit_code']==0}
previous={row['test'] for row in baseline if row['baseline']['exit_code']}
assert all(row['exit_code']==0 or row['test'] in previous for row in compat),'Investigate new compatibility failures before recording acceptance'
compat_passes=sum(row['exit_code']==0 for row in compat)
compat_failed=[row['test'] for row in compat if row['exit_code']]
library_count=len(json.loads((ROOT.parents[1]/'assets/beckenburg/libraries/index.json').read_text())['libraries'])
remaining=sorted(red-rechecked)
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
assets=json.loads((OUT/'lived-assets.json').read_text())
live_path=reports/'live-libraries-results.json'
live=json.loads(live_path.read_text()) if live_path.exists() else None
if live and sum(d['kind']=='GLB' for d in live['downloads'])!=len(assets['assets']):live=None
manifest={'date':'2026-10-20','focused_passes':len(focused),'compatibility_passes':compat_passes,'compatibility_checks':len(compat),'compatibility_failures':compat_failed,
    'original_asset_families':len(assets['clean_preservation']),'asset_variants':len(assets['assets']),
    'runtime_texture_variant':'worn','public_libraries':'https://mrcalzon02.github.io/HB-TTRPG-tools/beckenburg-asset-libraries.html','sites':[]}
if live:manifest['live_publication_verified_at']=live['verified_at'];manifest['live_downloads_verified']=len(live['downloads'])
for site in ['house','farmhouse','school']:
    source=ROOT/f'build/level-verification/scenes/{site}';definition=json.loads((source/'definition.json').read_text())
    blend=OUT/f'blender/{site}-complete.blend';views=sorted((OUT/'previews/runtime').glob(site+'-*.png'))
    manifest['sites'].append(dict(id=site,revision=definition['revision'],rooms=len(definition['rooms']),stairs=len(definition['stairs']),
        triangles=len(json.loads((source/'geometry.json').read_text())),loose_objects=len(json.loads((source/'loose-objects.json').read_text())) if (source/'loose-objects.json').exists() else 0,hiding_cupboards=sum(s['type']=='hide' for s in definition['sockets']),
        event_fixtures=len(json.loads((source/'event-fixtures.json').read_text())) if (source/'event-fixtures.json').exists() else 0,
        worn_prop_groups=sum(p['mesh'].endswith('_worn') for p in definition['props']),
        blender_source=blend.relative_to(ROOT).as_posix(),blender_sha256=digest(blend),
        runtime_views=[dict(path=p.relative_to(ROOT).as_posix(),sha256=digest(p)) for p in views]))
scene_results=json.loads((reports/'blender-level-scenes-results.json').read_text())
for scene in scene_results:
    delivered=next(site for site in manifest['sites'] if site['id']==scene['site'])
    assert delivered['blender_sha256']==scene['sha256'] and delivered['revision']==scene['revision']
manifest['editable_scene_verification']='development/levels/verification/blender-level-scenes-results.json'
(OUT/'delivery-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
rows='\n'.join(f'| {row["test"]} | '+('pass' if row['exit_code']==0 else 'pre-existing failure')+f' | {row["seconds"]:.3f}s |' for row in focused+compat)
unresolved='\n'.join('- '+name+(' — failed on the pre-level baseline too.' if name in previous else ' — needs further investigation.') for name in remaining)
text=f'''# Level revision verification — 2026-10-20

The lived-in dressing, physical hiding cupboards and clean/worn asset revision passes {len(focused)}/{len(focused)} focused level checks and {compat_passes}/{len(compat)} expanded compatibility checks. The two retained failures are GhostDomainTest's old flat-map adjacency expectation and AncientGhostVariantsTest's duplicate ANCIENT_HANTU evidence signature; both were already present in the recorded audit. All checks used the integrated Java 17 package. Actual outputs are preserved under `verification/`. Runtime views were visually inspected after rebuilding; the gallery contains {sum(len(s['runtime_views']) for s in manifest['sites'])} original game-camera captures with CRT/grain effects disabled for inspection only.

## Current asset and dressing delivery

- The school plant contains three retired riveted coal boilers at the back, two later oil-fired sectional boilers and three modern condensing units toward the front. Flues, separated retired steam lines and paired active headers, circulation pumps, expansion vessel, suspended ventilation, electrical switchgear, coal/ash handling, service workbench and spares use measured room coordinates. Stair and breaker approaches remain usable.
- House and farm have room-specific furniture and supported belongings: inherited displays, sideboards, card-table corner, ottoman, trunk, linens, toys, pantry and root-cellar stores, barn/workshop furniture and native source cabinets. The room placement helper retains wall support, source bounds, windows and door/stair clearance.
- Eighteen walk-in cupboards are scattered across the three sites (house 5, farm 7, school 6). Their actual geometry and hollow collision follow the same deterministic hiding-density setting. A 0% cupboard disappears completely; 100% makes all potential cupboards present. Hiding requires physically entering the correct-floor interior. Solo movement exposes the player; LAN host/client and ghost views share presence without disclosing hunter hiding state.
- {len(assets['clean_preservation'])} original asset families have two separate diffuse-texture versions, {len(assets['assets'])} GLBs total. The clean GLBs, Blender files and previews are preserved byte-for-byte. Worn models keep exactly the same vertices, normals, UVs, index buffers and pivots; every diffuse image is changed. Runtime uses the worn set. The texture pass reduces saturation and adds soft ingrained dirt, fine chips, oxidation, water tracks, faded cloth, handled timber and foxed paper. Oversized binary noise patches were removed after inspecting them in rooms. `verification/worn-assets-results.json` records actual family-by-family verification.
- {library_count} original CC0 libraries provide individual GLBs, editable Blender sources, real preview renders and native Blender Asset Browser libraries, in clean and worn versions. Every entry, model metadata, native asset and ZIP license explicitly states CC0 1.0 Universal. The 27 unchanged archive props used as additional game scenery retain their separate source licensing and are excluded from these CC0 downloads. Public-file, embedded-image, ZIP/hash, local-link and native embedded-preview validators were run against the generated libraries.
- Editable complete levels show all potential cupboards for authoring (100%); runtime still follows the selected contract. Their geometry comes directly from the runtime export, including the worn materials. The clean/worn comparison uses actual Blender model renders with identical studio lighting.

## Independent physical objects

The house has {manifest['sites'][0]['loose_objects']} independent objects, the farm {manifest['sites'][1]['loose_objects']} and the school {manifest['sites'][2]['loose_objects']}. All eight original loose-object families have clean/worn versions. F5 picks up/drops, ] rotates for examination and F12 throws along the view. Host-owned gravity, swept collision, support, inelastic bounce, mass and body contact determine motion. Every ghost species can fling up to three existing, unheld objects during accepted sanity events; frenzy DREAD also scatters objects. These environmental flings have no player targeting or collision damage. Only poltergeist DISTURB events launch aimed, armed projectiles; damage requires actual contact, while a dodge or missing object causes no projectile damage. Held coordinates/owners are redacted from ghost snapshots. Initial placements are retained as separate editable meshes in each Blender level, with IDs and collision/mass metadata. The detailed recipe and practical limits are in `LOOSE_OBJECTS_WORKFLOW.md`.

## Activated ghost-event fixtures

The sites contain {manifest['sites'][0]['event_fixtures']}, {manifest['sites'][1]['event_fixtures']} and {manifest['sites'][2]['event_fixtures']} individually controlled devices/anchors respectively. Phones ring, bedside alarms and room fire bells sound, radios/boom boxes play, and taps fill/drain the existing hollow basins. Each site has twelve individually mounted room alarms. Player E toggles an aimed fixture; ghost F5 submits a host-validated ordinary disturbance. Accepted AI/human events share costs, cooldowns, room/range/LOS validation and state replay. Five original synthesized sounds and portable activation examples accompany the separate CC0 Events archive. Water stays below the basin rim; overflow/flooding and separate phone receivers are outside this implementation. The full recipe is in `EVENT_FIXTURES_WORKFLOW.md`.

The final visual review caught an interaction angle error concealed by shared test helpers. Pickup/held-object/throw and fixture aim now match the visible camera's positive-sine horizontal X direction. The actual +X socket fixture changed from 270 to 90 degrees; the network test was recompiled and rerun. Initial failed and corrected review attempts are documented in the workflows. Six corrected active/idle device captures and two held-mug captures are included in the gallery.

## Retained architectural corrections

- Opposing rooms previously shared a wall plane; full plaster faces also remained behind lower timber panels. Walls now have 160mm sections and mutually exclusive finish bands. Frames are authored once per opening. A farmhouse bedroom door was moved away from its wall corner after the surface check caught a frame overlap.
- Floor/ceiling tiles previously clipped stair holes by tile centres. Exact aperture edges now split both decks, and the last tread stops at the landing. Both flights have handrails; deck openings have three-sided guards with matching collision. The house basement flight moved 300mm to preserve its doorway approach.
- Kitchen/bath/corridor walls use glazed wall tiles, distinct from floor tiles. Plain plaster has no baked timber trim. Adjoining low roof eaves stop before taller rooms; the gym no longer shows an intruding roof edge or hall material.
- Switches, breakers and wall props mount against finished wall faces. Source furniture pivots and original UVs are retained. Generic decorative books use `book_mp_2`, avoiding the Tier I investigation book.
- The van safe zone is its current narrowed cargo interior. The arrival street stays exterior, supported ground. Frenzy seals operate at the actual cargo threshold. The online runner's current van, street architecture and checksum-pinned original GGBot textures are integrated.
- Original mesh front faces, mouse movement, strafe and spatial sound now use one camera orientation. Stereo/coarse sound direction is checked against screen position.

## Verified scope and limits

House has a ground-floor room loop, private upper floor and cellar. Farm has a separate house, barn, hayloft and tool shed. School has classrooms, upper circulation/library/assembly space, nurse/cafeteria wings, a tall gym and service cellar. Shared authored coordinates drive geometry, swept navigation, spawns, doors/windows, circuits, acoustics and interaction sockets. The three editable `.blend` files are rebuilt from runtime triangles, not separate presentation models. Their revisions and hashes are in `delivery-manifest.json`.

These checks establish the reported geometry and gameplay contracts; they do not establish a completed native interactive Windows playthrough or a clean game-wide release gate. The new room dressing has been inspected in actual renderer captures, but further art review and native performance review remain appropriate. At 960×600 with inspection effects disabled, warm software-renderer captures took roughly 130–350ms per view on this machine, with slower first-frame asset loading; these are inspection timings, not a target-resolution interactive frame-rate claim. Mansion, Prison, Asylum, Academy, College and Church remain locked development layouts. The current van's further work remains coordinated with the online runner.

## Broader regression audit

The last complete sweep, before final fixture/schema migrations and the latest van integration, passed {sum(row['exit_code']==0 for row in full)}/{len(full)} checks. Of its {len(red)} failures, {len(red&rechecked)} have subsequently been rechecked and now pass. The remaining {len(remaining)} failed in that sweep and remain unresolved; the two expanded-audit failures were rerun and still fail, while the others have not been rerun after these final changes; {len(set(remaining)&previous)} of them also failed on baseline `b89e3bbc`. This is an audit trail, not a claim that the complete suite is green. The raw baseline comparison includes outputs and source hashes.

Fixtures were migrated from old flat-map coordinates to authored XYZ positions; packet expectations now include map revisions/elevation. Public door state supports both player cameras; private hunter bodies, maps and journal state remain rejected by ghost privacy checks. Rack aiming is tested from an actual reachable operating position rather than beyond pickup range. No collision or privacy gate was disabled to pass these checks.

## Current focused and compatibility results

| Check | Result | Time |
|---|---|---|
{rows}

## Unresolved broader-suite failures

{unresolved}

## Repeat

Use `verify_levels.py --java-home <JDK17> --vehicle-archive <original August2023 GGBot ZIP>`, then `verify_compatibility.py --java-home <JDK17>`. Both use the isolated ignored `build/level-release` package. `--full-regression` runs the historical gate as well. Use `LevelVisualCapture`, `LevelDressingCapture`, `LevelSceneSource`, `build_scene.py`, `build_wear_review.py`, `build_review.py`, then this script to regenerate the review artifacts and record actual outputs. `validate_worn_assets.py` and both public-library validators read the final asset files. Original clean/worn diffuse and geometry checks remain recorded separately. The latest packaged gameplay code was used for corrected first-person interaction captures. `validate_level_scenes.py` reopens every complete Blender level and checks the exported interactive objects, fixture anchors and exact architecture counts. No test binary is published with these source commits.
'''
if live:
    publication=f"\nLive publication was read back at {live['verified_at']}: the public CC0 page, all {library_count} manifests/licenses, all {len(assets['assets'])} individual GLBs and all {library_count} ZIPs and all seven original event sound/data extras matched the validated local publication. Actual downloaded-byte SHA-256 values are preserved in `verification/live-libraries-results.json`. The published asset checkpoint is `{live['published_commit']}`.\n"
    text=text.replace('## Retained architectural corrections',publication+'\n## Retained architectural corrections')
(OUT/'VERIFICATION.md').write_text(text,encoding='utf-8')
print(f'Recorded {len(focused)+compat_passes} passing checks; {len(remaining)} historical failures remain documented')
