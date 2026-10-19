import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'development/assets/equipment-catalog'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
names=['exploration_spirit_box','walkie_talkie_1','walkie_talkie_2','exploration_photo_camera','exploration_thermal_camera','exploration_flashlight','flashlight_mp_1','exploration_emf_detector','dosimeter_1','dosimeter_2','dosimeter_4','exploration_thermometer','vape_mp_1']
report=[]
for idx,name in enumerate(names):
 before=set(bpy.context.scene.objects);bpy.ops.import_scene.gltf(filepath=str(ROOT/'assets/runtime/models'/f'{name}.glb'));objs=[o for o in bpy.context.scene.objects if o not in before]
 pts=[o.matrix_world@v.co for o in objs if o.type=='MESH' for v in o.data.vertices];lo=Vector([min(p[i] for p in pts) for i in range(3)]);hi=Vector([max(p[i] for p in pts) for i in range(3)]);dims=hi-lo
 report.append(dict(name=name,lo=list(lo),hi=list(hi),dims=list(dims),meshes=[dict(name=o.name,mats=[m.name for m in o.data.materials]) for o in objs if o.type=='MESH']))
 s=.7/max(dims);center=(lo+hi)/2;target=Vector(((idx%4-1.5)*1.3,(idx//4)*1.4,0.45))
 for o in objs:
  if o.parent is None:o.location=(o.location-center)*s+target;o.scale*=s
 bpy.ops.object.text_add(location=(target.x-.45,target.y-.55,.01),rotation=(0,0,0));t=bpy.context.object;t.data.body=name.replace('exploration_','');t.data.size=.085;t.data.align_x='LEFT'
(OUT/'electronics-source-inspection.json').write_text(json.dumps(report,indent=2))
bpy.ops.object.camera_add(location=(6,-9,8));cam=bpy.context.object;cam.rotation_euler=(Vector((0,2,0))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=7.2;bpy.context.scene.camera=cam
for pos,power,size in [((1,-2,8),1500,8),((-6,3,4),900,5)]:
 bpy.ops.object.light_add(type='AREA',location=pos);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,2,0))-l.location).to_track_quat('-Z','Y').to_euler()
sc=bpy.context.scene;sc.render.engine='CYCLES';sc.cycles.samples=24;sc.world.color=(.27,.27,.27);sc.view_settings.view_transform='Standard';sc.render.resolution_x=1600;sc.render.resolution_y=1600;sc.render.resolution_percentage=100;sc.render.filepath=str(OUT/'electronics-source-inspection.png');bpy.ops.render.render(write_still=True)
