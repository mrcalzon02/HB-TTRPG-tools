"""Independent fresh-Blender readback for an authored machine and its exported GLB."""
import argparse,hashlib,json,sys
from pathlib import Path
import bpy

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def main():
    argv=sys.argv[sys.argv.index('--')+1:];p=argparse.ArgumentParser()
    p.add_argument('--blend',required=True);p.add_argument('--glb',required=True);p.add_argument('--out',required=True)
    args=p.parse_args(argv);blend=Path(args.blend);glb=Path(args.glb)
    bpy.ops.wm.open_mainfile(filepath=str(blend))
    orig=[o for o in bpy.data.objects if o.type=='MESH' and o.name.startswith('MH7_')]
    assert len(orig)>=20, 'not enough actual model mesh objects in reopened .blend'
    bmin=[min((o.matrix_world @ v.co)[k] for o in orig for v in o.data.vertices) for k in (0,1,2)]
    bmax=[max((o.matrix_world @ v.co)[k] for o in orig for v in o.data.vertices) for k in (0,1,2)]
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(glb));im=[o for o in bpy.context.scene.objects if o.type=='MESH']
    assert len(im)>=20, 'GLB did not independently import enough mesh objects'
    assert all(len(o.data.vertices)>=3 for o in im), 'GLB invalid mesh'
    report={'pass':True,'blend_sha256':sha(blend),'glb_sha256':sha(glb),
            'source_meshes':len(orig),'imported_meshes':len(im),
            'source_world_bounds':{'min':bmin,'max':bmax},'model_units':'Blender tiles'}
    Path(args.out).write_text(json.dumps(report,indent=2),encoding='utf-8')
    print('MH7_REOPEN_VERIFY_PASSED '+json.dumps(report,sort_keys=True))
main()
