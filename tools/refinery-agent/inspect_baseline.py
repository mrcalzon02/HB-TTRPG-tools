"""Read the ACTUAL existing Water Purifier source for bounded Qwen geometry references."""
import argparse,hashlib,json,sys
from pathlib import Path
import bpy
from mathutils import Vector


def main():
    args=sys.argv[sys.argv.index('--')+1:]
    p=argparse.ArgumentParser()
    p.add_argument('--blend',required=True)
    p.add_argument('--out',required=True)
    a=p.parse_args(args)
    source=Path(a.blend)
    bpy.ops.wm.open_mainfile(filepath=str(source.resolve()))
    bpy.context.view_layer.update()
    objects=[]
    for o in sorted(bpy.context.scene.objects,key=lambda x:x.name):
        if o.type!='MESH' or not o.name.startswith('MH7_') or o.name.startswith('MH7_QWEN_'):
            continue
        coords=[o.matrix_world @ Vector(v) for v in o.bound_box]
        if not coords:continue
        low=[round(min(v[k] for v in coords),3) for k in range(3)]
        high=[round(max(v[k] for v in coords),3) for k in range(3)]
        center=[round((lo+hi)/2,3) for lo,hi in zip(low,high)]
        objects.append({'name':o.name,'center_xyz':center,
                        'bounds_xyz':[low,high],
                        'material_names':[m.name for m in o.data.materials if m]})
    if len(objects)<20:
        raise RuntimeError('Insufficient Blender source objects for measured design')
    output={'source':'reopened-native-water-purifier','baseline_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
            'axis':'+Z up','units':'Factorio tile','components':objects,
            'native_factorio_connection_cells_verified':False}
    Path(a.out).write_text(json.dumps(output,indent=2)+'\n',encoding='utf-8')
    print('MH7_MEASURED_COMPONENTS '+str(len(objects)),flush=True)


if __name__=='__main__':
    main()
