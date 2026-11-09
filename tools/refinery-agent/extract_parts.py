"""Harvest actual source meshes, not conceptual placeholders, into a reusable GLB kit."""
import argparse,hashlib,json,sys
from pathlib import Path
import bpy

def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def main():
    argv=sys.argv[sys.argv.index('--')+1:];p=argparse.ArgumentParser()
    p.add_argument('--blend',required=True);p.add_argument('--out',required=True);p.add_argument('--report',required=True)
    args=p.parse_args(argv);bpy.ops.wm.open_mainfile(filepath=args.blend)
    candidates={}
    for o in bpy.data.objects:
        if o.type=='MESH' and o.get('tp_part_id'):
            candidates.setdefault(o['tp_part_id'],[]).append(o)
    output=[]
    for ident,objs in sorted(candidates.items()):
        if not ident.startswith('mh7-') or len(ident)>60:continue
        obj=objs[0]
        folder=Path(args.out)/ident/'v01';folder.mkdir(parents=True,exist_ok=True)
        if (folder/'part.glb').exists():continue # immutable masters, not overwritten
        bpy.ops.object.select_all(action='DESELECT');obj.select_set(True)
        bpy.context.view_layer.objects.active=obj
        filename=folder/'part.glb'
        bpy.ops.export_scene.gltf(filepath=str(filename),export_format='GLB',use_selection=True)
        # This is a genuinely exported Blender mesh, but separate clean import is still required.
        output.append({'part_id':ident,'revision':'v01','origin_object':obj.name,'origin_xyz':list(obj.location),
            'dimensions_xyz':list(obj.dimensions),'file':str(filename.resolve()),'glb_sha256':sha(filename),
            'status':'candidate','origin_blend_sha256':sha(args.blend)})
    Path(args.report).write_text(json.dumps({'extracted':output},indent=2),encoding='utf-8')
    print('MH7_PARTS_EXTRACTED '+str(len(output)))
main()
