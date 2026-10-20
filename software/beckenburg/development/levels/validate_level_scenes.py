"""Reopen delivered Blender levels and compare editable bodies/anchors with runtime exports.
Run with Blender --background --python; no files are resaved.
"""
import bpy, hashlib, json, math
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
reports=[]
def close(actual, expected):
    assert len(actual)==len(expected) and all(abs(a-b)<1e-5 for a,b in zip(actual,expected)), (actual,expected)

for site in ['house','farmhouse','school']:
    source=ROOT/'build/level-verification/scenes'/site
    path=ROOT/f'development/levels/blender/{site}-complete.blend'
    definition=json.loads((source/'definition.json').read_text())
    loose=json.loads((source/'loose-objects.json').read_text())
    fixtures=json.loads((source/'event-fixtures.json').read_text())
    bpy.ops.wm.open_mainfile(filepath=str(path))
    scene=bpy.context.scene
    assert scene['revision']==definition['revision'] and scene['hiding_density']==100
    objects=list(scene.objects)
    bodies={o['loose_object_id']:o for o in objects if 'loose_object_id' in o}
    devices={o['event_fixture_id']:o for o in objects if 'event_fixture_id' in o}
    assert len(bodies)==len(loose) and len(devices)==len(fixtures)
    for entry in loose:
        state=entry['state'];obj=bodies[state['id']]
        assert obj.type=='MESH' and len(obj.data.polygons)>0
        close(obj.location,(state['x'],-state['z'],state['y']))
        close(obj.rotation_euler,(0,-state['roll'],-state['yaw']))
        assert abs(obj['mass_kg']-entry['mass'])<1e-6
        assert abs(obj['collision_radius_m']-entry['radius'])<1e-6
    for state in fixtures:
        obj=devices[state['id']]
        assert obj['event_kind']==state['kind'] and obj['room']==state['room']
        assert obj.type==('EMPTY' if state['kind'].startswith('SINK') else 'MESH')
        close(obj.location,(state['x'],-state['z'],state['y']))
        close(obj.rotation_euler,(0,0,-state['yaw']))
    triangles=sum(len(o.data.polygons) for o in objects if o.type=='MESH' and o.get('source','').startswith('Exact runtime'))
    assert triangles==len(json.loads((source/'geometry.json').read_text()))
    assert all(image.packed_file for image in bpy.data.images if image.source=='FILE')
    reports.append(dict(site=site,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),revision=scene['revision'],runtime_architecture_triangles=triangles,editable_loose_objects=len(bodies),editable_event_fixtures=len(devices),all_diffuse_images_packed=True))
    print('PASS_EDITABLE_LEVEL',site,triangles,len(bodies),len(devices),flush=True)

(ROOT/'development/levels/verification/blender-level-scenes-results.json').write_text(json.dumps(reports,indent=2)+'\n')
