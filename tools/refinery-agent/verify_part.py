"""Independent Blender process verifies that a published kit part actually imports."""
import argparse,sys,json
from pathlib import Path
import bpy
argv=sys.argv[sys.argv.index('--')+1:]
p=argparse.ArgumentParser();p.add_argument('--glb',required=True);p.add_argument('--out',required=True);args=p.parse_args(argv)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=args.glb)
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
assert len(meshes)>=1 and all(len(o.data.polygons)>0 for o in meshes),'empty imported library part'
Path(args.out).write_text(json.dumps({'verified':True,'meshes':len(meshes),'vertices':sum(len(o.data.vertices) for o in meshes)},indent=2),encoding='utf-8')
print('MH7_PART_IMPORT_PASSED')
