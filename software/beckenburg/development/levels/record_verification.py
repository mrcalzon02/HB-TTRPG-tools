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
assert all(row['exit_code']==0 for row in focused+compat),'Cannot record acceptance with failed focused checks'
red={row['test'] for row in full if row['exit_code']};rechecked={row['test'] for row in focused+compat if row['exit_code']==0}
previous={row['test'] for row in baseline if row['baseline']['exit_code']}
remaining=sorted(red-rechecked)
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
manifest={'date':'2026-10-20','focused_passes':len(focused),'compatibility_passes':len(compat),'sites':[]}
for site in ['house','farmhouse','school']:
    source=ROOT/f'build/level-verification/scenes/{site}';definition=json.loads((source/'definition.json').read_text())
    blend=OUT/f'blender/{site}-complete.blend';views=sorted((OUT/'previews/runtime').glob(site+'-*.png'))
    manifest['sites'].append(dict(id=site,revision=definition['revision'],rooms=len(definition['rooms']),stairs=len(definition['stairs']),
        triangles=len(json.loads((source/'geometry.json').read_text())),blender_source=blend.relative_to(ROOT).as_posix(),blender_sha256=digest(blend),
        runtime_views=[dict(path=p.relative_to(ROOT).as_posix(),sha256=digest(p)) for p in views]))
(OUT/'delivery-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
rows='\n'.join(f'| {row["test"]} | pass | {row["seconds"]:.3f}s |' for row in focused+compat)
unresolved='\n'.join('- '+name+(' — failed on the pre-level baseline too.' if name in previous else ' — needs further investigation.') for name in remaining)
text=f'''# Level revision verification — 2026-10-20

The wall/stair revision passes {len(focused)} focused level checks and {len(compat)} affected compatibility checks against the integrated Java 17 package. Actual outputs are preserved under `verification/`. Runtime views were visually inspected after rebuilding; the gallery contains 36 original game-camera captures with CRT/grain effects disabled for inspection only.

## Corrected defects

- Opposing rooms previously shared a wall plane; full plaster faces also remained behind lower timber panels. Walls now have 160mm sections and mutually exclusive finish bands. Frames are authored once per opening. A farmhouse bedroom door was moved away from its wall corner after the surface check caught a frame overlap.
- Floor/ceiling tiles previously clipped stair holes by tile centres. Exact aperture edges now split both decks, and the last tread stops at the landing. Both flights have handrails; deck openings have three-sided guards with matching collision. The house basement flight moved 300mm to preserve its doorway approach.
- Kitchen/bath/corridor walls use glazed wall tiles, distinct from floor tiles. Plain plaster has no baked timber trim. Adjoining low roof eaves stop before taller rooms; the gym no longer shows an intruding roof edge or hall material.
- Switches, breakers and wall props mount against finished wall faces. Source furniture pivots and original UVs are retained. Generic decorative books use `book_mp_2`, avoiding the Tier I investigation book.
- The van safe zone is its current narrowed cargo interior. The arrival street stays exterior, supported ground. Frenzy seals operate at the actual cargo threshold. The online runner's current van, street architecture and checksum-pinned original GGBot textures are integrated.
- Original mesh front faces, mouse movement, strafe and spatial sound now use one camera orientation. Stereo/coarse sound direction is checked against screen position.

## Verified scope and limits

House has a ground-floor room loop, private upper floor and cellar. Farm has a separate house, barn, hayloft and tool shed. School has classrooms, upper circulation/library/assembly space, nurse/cafeteria wings, a tall gym and service cellar. Shared authored coordinates drive geometry, swept navigation, spawns, doors/windows, circuits, acoustics and interaction sockets. The three editable `.blend` files are rebuilt from runtime triangles, not separate presentation models. Their revisions and hashes are in `delivery-manifest.json`.

These checks establish the reported geometry and gameplay contracts; they do not establish a completed native interactive Windows playthrough or a clean game-wide release gate. Farm/school exterior detailing and room-specific dressing still need further art review. Mansion, Prison, Asylum, Academy, College and Church remain locked development layouts. The current van's further work remains coordinated with the online runner.

## Broader regression audit

The last complete sweep, before final fixture/schema migrations and the latest van integration, passed {sum(row['exit_code']==0 for row in full)}/{len(full)} checks. Of its {len(red)} failures, {len(red&rechecked)} have subsequently been rechecked and now pass. The remaining {len(remaining)} failed in that sweep and have not been rerun after the final changes; {len(set(remaining)&previous)} of them also failed on baseline `b89e3bbc`. This is an audit trail, not a claim that the complete suite is green. The raw baseline comparison includes outputs and source hashes.

Fixtures were migrated from old flat-map coordinates to authored XYZ positions; packet expectations now include map revisions/elevation. Public door state supports both player cameras; private hunter bodies, maps and journal state remain rejected by ghost privacy checks. Rack aiming is tested from an actual reachable operating position rather than beyond pickup range. No collision or privacy gate was disabled to pass these checks.

## Current focused and compatibility results

| Check | Result | Time |
|---|---|---|
{rows}

## Unresolved broader-suite failures

{unresolved}

## Repeat

Use `verify_levels.py --java-home <JDK17> --vehicle-archive <original August2023 GGBot ZIP>`, then `verify_compatibility.py --java-home <JDK17>`. Both use the isolated ignored `build/level-release` package. `--full-regression` runs the historical gate as well. Use `LevelVisualCapture`, `LevelSceneSource`, `build_scene.py`, `build_review.py`, then this script to regenerate the review artifacts and record actual outputs. No test binary is published with these source commits.
'''
(OUT/'VERIFICATION.md').write_text(text,encoding='utf-8')
print(f'Recorded {len(focused)+len(compat)} passing checks; {len(remaining)} historical failures remain documented')
