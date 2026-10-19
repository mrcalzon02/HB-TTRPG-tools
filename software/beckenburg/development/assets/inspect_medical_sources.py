import bpy, math, json
from pathlib import Path
from mathutils import Vector
P=Path(__file__).resolve().parent/'equipment-catalog'
bpy.ops.wm.read_factory_settings(use_empty=True)
data=[]
for i,f in enumerate(sorted((P/'source-cache/medical').glob('*.glb'))):
    before=set(bpy.data.objects);bpy.ops.import_scene.gltf(filepath=str(f));objs=[o for o in bpy.data.objects if o not in before and o.type=='MESH']
    pts=[o.matrix_world@v.co for o in objs for v in o.data.vertices];lo=Vector([min(p[k] for p in pts) for k in range(3)]);hi=Vector([max(p[k] for p in pts) for k in range(3)])
    data.append({'name':f.stem,'size':list(hi-lo),'objects':[o.name for o in objs]})
    factor=.22/max(hi-lo)
    for o in objs:
        mat=o.matrix_world.copy();o.parent=None;o.matrix_world.identity()
        for v in o.data.vertices:v.co=(mat@v.co-(lo+hi)/2)*factor+Vector(((i%4)*.32,(i//4)*.40,.12))
    bpy.ops.object.text_add(location=((i%4)*.32-.13,(i//4)*.40-.14,0))
    t=bpy.context.object;t.data.body=f.stem;t.data.size=.016;t.rotation_euler=(0,0,0)
print(json.dumps(data,indent=2));(P/'medical-source-dimensions.json').write_text(json.dumps(data,indent=2))
scene=bpy.context.scene
bpy.ops.object.camera_add(location=(.5,-1.4,2.7));cam=bpy.context.object;center=Vector((.48,.75,0));cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=2.3;scene.camera=cam
scene.world=bpy.data.worlds.new('Studio');scene.world.color=(.25,.25,.25)
for pos,power in [((1,-1,3),180),((-1,1,2),120)]:
    bpy.ops.object.light_add(type='AREA',location=pos);bpy.context.object.data.energy=power;bpy.context.object.data.size=3
scene.render.engine='CYCLES';scene.cycles.samples=12;scene.render.resolution_x=1300;scene.render.resolution_y=1600;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard';scene.render.image_settings.file_format='PNG';scene.render.filepath=str(P/'medical-source-sheet.png');bpy.ops.render.render(write_still=True)
