"""R101 SOURCE-first physical reconstruction of existing R11 baffle_00 volume.

Actual original Factorio frame 1/33 R100 ablation: hiding THIS existing real
R11 baffle improves nozzle RGB ~6.9%, and hiding this + R11 liner improves
~11%. Neither object may be deleted as an accepted result: original shows
genuine annular mouth and formed fluted liner. This script changes only the
ACTUAL baffle's 320-vertex 320-face toroidal metal geometry: axial location,
radial major band position, real finite minor section, and unlike angular
recess. Source camera, shaders, R19 stamped plates, other R11 liner,
original hanging fins and 64-frame motion are protected and immutable.
No rendered/billboard tricks. Private source remains outside public CI.
"""
import argparse,hashlib,json,math,struct,sys
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from physical_original_refractory_flare_r98 import (
 BASE_SHA,ORIGINAL_SOURCE_SHA,render,NATIVE,MAIN,FIN_PREFIX,MOUNT_PREFIX,
 joint_gap_world,fin_digest_all_frames)

REVISION="R101_actual_source_correct_R11_annular_baffle_3d_registration"
RING="R11_recessed_internal_pressure_baffle_00"
AXIS_Z=-.43
# Different real 3D form hypotheses: axial move toward chamber (+Y),
# radial major-circle offset, physical toroidal section scales, limited
# asymmetric angular occlusion rebate. NOT observed/approved original CAD.
# Last tuple is (name, axial Y movement, major radius change, minor axial
# section scale, minor radial section scale, angular step in Blender tiles).
CANDIDATES=(
 ("baseline",0.,0.,1.,1.,0.),
 ("baffle_temporarily_hidden",None,None,None,None,None),
 ("recess_y_015",.15,0.,1.,1.,0.),
 ("recess_y_030",.30,0.,1.,1.,0.),
 ("recess_y_045",.45,0.,1.,1.,0.),
 ("advance_y_neg020",-.20,0.,1.,1.,0.),
 ("major_inset_012",0.,-.12,1.,1.,0.),
 ("major_inset_024",0.,-.24,1.,1.,0.),
 ("minor_thin_055_recess_025",.25,0.,.55,.55,0.),
 ("major_inset_012_recess_030",.30,-.12,.85,.85,0.),
 ("major_inset_024_recess_030",.30,-.24,.85,.75,0.),
 ("major_expand_010_recess_025",.25,+.10,.85,.85,0.),
 ("source_irregular_recess_025",.25,-.10,.82,.78,.10),
)
def protected_hash(scene):
 h=hashlib.sha256()
 for o in sorted(scene.objects,key=lambda x:x.name):
  if o.type!="MESH" or o.name==RING:continue
  h.update(o.name.encode());h.update(struct.pack("<II",len(o.data.vertices),len(o.data.polygons)))
  for v in o.data.vertices:h.update(struct.pack("<fff",*v.co))
  if o.data.shape_keys:
   for k in o.data.shape_keys.key_blocks:
    h.update(k.name.encode())
    for v in k.data:h.update(struct.pack("<fff",*v.co))
 return h.hexdigest()
def form_baffle(obj,original,axial,major,minor_y,minor_r,angular):
 if len(original)!=320 or len(obj.data.vertices)!=320 or len(obj.data.polygons)!=320:
  raise RuntimeError("R101 expected untouched ORIGINAL R11 actual 320x320 real metal ring")
 if obj.data.shape_keys or obj.animation_data or obj.hide_render:
  raise RuntimeError("R101 cannot change source moving/hidden physical annulus")
 radii=[math.hypot(x,z-AXIS_Z) for x,y,z in original]
 ys=[p[1] for p in original]
 center_radius=(min(radii)+max(radii))/2
 center_y=(min(ys)+max(ys))/2
 if abs(center_radius-1.385)>.035 or abs(center_y+3.61)>.03:
  raise RuntimeError("R101 unexpected R11 original existing physical ring location")
 if not (.45<=minor_y<=1.15 and .45<=minor_r<=1.15 and -.35<=major<=.20 and -.25<=axial<=.55 and 0<=angular<=.20):
  raise RuntimeError("R101 nonphysical source sectional baffle proposal")
 for obvert,(x,y,z) in zip(obj.data.vertices,original):
  old_r=math.hypot(x,z-AXIS_Z)
  theta=math.atan2(z-AXIS_Z,x)
  # Actual spatially positioned 3D toroidal center ring, never scaling
  # model-captured imagery or moving the original camera.
  new_r=center_radius+major+(old_r-center_radius)*minor_r
  if new_r<.35:
   raise RuntimeError("R101 source torus collapsed through actual nozzle")
  # Unlike sidewall geometry can be interrupted by an authentic-shaped
  # forged flat: sinusoidal camber is physically in 3D, not a shader image.
  side_rebate=angular*max(0.,math.cos(theta+0.5))**2
  new_y=center_y+axial+(y-center_y)*minor_y+side_rebate
  factor=new_r/old_r
  obvert.co=(x*factor,new_y,AXIS_Z+(z-AXIS_Z)*factor)
 obj.data.update()
 if any(p.area<1e-10 for p in obj.data.polygons):
  raise RuntimeError("R101 3D formed original torus has collapsed faces")
 obj["R101_original_source_3d_annular_section_candidate"]=True
 return {"original_existing_baffle_major_radius":center_radius,
         "original_existing_baffle_y":center_y,
         "real_3d_major_radius_offset":major,
         "real_3d_axial_offset":axial,
         "real_3d_minor_y_scale":minor_y,
         "real_3d_minor_radial_scale":minor_r,
         "real_3d_angular_rebate":angular,
         "unchanged_actual_toroidal_topology_vertices":len(obj.data.vertices),
         "unchanged_actual_toroidal_topology_faces":len(obj.data.polygons),
         "original_art_fidelity_approved":False}
def verify(scene,names,other,cam,mats,motion,joints):
 if {o.name for o in scene.objects}!=names or protected_hash(scene)!=other:
  raise RuntimeError("R101 modified non-baffle actual 3D source geometry")
 if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=cam:
  raise RuntimeError("R101 changed original source camera")
 if {m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
     for m in bpy.data.materials}!=mats:
  raise RuntimeError("R101 changed material instead of physical geometry")
 if fin_digest_all_frames(scene)!=motion:
  raise RuntimeError("R101 changed source 64-frame animation")
 for i in MAIN:
  d=joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
                    bpy.data.objects[FIN_PREFIX+f"{i:02d}"])
  if d>.003 or abs(joints[str(i)]-d)>1e-6:
   raise RuntimeError("R101 broke original fin metal contact")
def run(source,out):
 source=Path(source).resolve();out=Path(out).resolve()
 if hashlib.sha256(source.read_bytes()).hexdigest()!=BASE_SHA:
  raise RuntimeError("R101 needs selected unmodified real R94 editable 3D scene")
 bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene;scene.frame_set(1)
 if scene.get("fsc_r94_revision") is None or scene.camera.data.type!="ORTHO":
  raise RuntimeError("R101 true original camera R94 3D model not present")
 obj=bpy.data.objects[RING]
 if len(obj.data.vertices)!=320 or len(obj.data.polygons)!=320:
  raise RuntimeError("R101 physical R11 source baffle topology incorrect")
 names={o.name for o in scene.objects}
 other=protected_hash(scene)
 cam=tuple(float(v) for row in scene.camera.matrix_world for v in row)
 mats={m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
      for m in bpy.data.materials}
 motion=fin_digest_all_frames(scene)
 joints={str(i):joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
         bpy.data.objects[FIN_PREFIX+f"{i:02d}"]) for i in MAIN}
 original=[tuple(v.co) for v in obj.data.vertices]
 out.mkdir(parents=True,exist_ok=True)
 result={"revision":REVISION,"actual_private_original_sha256":ORIGINAL_SOURCE_SHA,
         "original_source_art_uploaded_to_ci":False,
         "actual_source_visual_approved":False,
         "unchanged_base_R94_sha256":BASE_SHA,"candidates":[]}
 for tag,axial,major,sy,sr,angular in CANDIDATES:
  bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene;scene.frame_set(1)
  ob=bpy.data.objects[RING]
  stats=None
  if tag=="baffle_temporarily_hidden":ob.hide_render=True
  elif tag!="baseline":stats=form_baffle(ob,original,axial,major,sy,sr,angular)
  bpy.context.view_layer.update()
  verify(scene,names,other,cam,mats,motion,joints)
  scene.render.resolution_x,scene.render.resolution_y=NATIVE
  scene.render.resolution_percentage=100
  scene.render.image_settings.file_format="PNG"
  scene.render.image_settings.color_mode="RGBA"
  scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
  for frame in (1,33):
   scene.frame_set(frame);render(scene,out/(tag+f"_frame{frame:02d}.png"))
  saved=None
  if stats:
   scene.frame_set(1);scene["fsc_r101_revision"]=REVISION
   scene["fsc_r101_original_source_3d_fidelity_approved"]=False
   scene["fsc_r101_annular_geometry_hypothesis"]=tag
   saved=out/(tag+".blend");bpy.ops.wm.save_as_mainfile(filepath=str(saved))
   if saved.stat().st_size<100000:raise RuntimeError("R101 actual 3D editable file not saved")
   bpy.ops.wm.open_mainfile(filepath=str(saved));scene=bpy.context.scene
   verify(scene,names,other,cam,mats,motion,joints)
   o=bpy.data.objects[RING]
   if not o.get("R101_original_source_3d_annular_section_candidate") or len(o.data.vertices)!=320:
    raise RuntimeError("R101 source 3D baffle shape failed reopening Blender")
  result["candidates"].append({"name":tag,"real_3d_baffle_section":stats,
    "original_camera_frame1":tag+"_frame01.png","original_camera_frame33":tag+"_frame33.png",
    "real_saved_reopened_blend":saved.name if saved else None,
    "blend_sha256":hashlib.sha256(saved.read_bytes()).hexdigest() if saved else None,
    "all_original_source_parts_except_real_baffle_untouched":True})
  print("R101_TRUE_3D_SOURCE_BAFFLE_GEOMETRY",tag,flush=True)
 if hashlib.sha256(source.read_bytes()).hexdigest()!=BASE_SHA:
  raise RuntimeError("R101 modified original R94 selected 3D source")
 (out/"r101_original_source_r11_real_baffle_geometry_candidates.json").write_text(
  json.dumps(result,indent=2)+"\n",encoding="utf8")
 print("R101_GENUINE_ORIGINAL_3D_BAFFLE_NATIVE_SAVED_REOPENED_PASS",flush=True)
 print("R101_FIDELITY_REQUIRES_PRIVATE_ORIGINAL_SPRITE_COMPARISON",flush=True)
if __name__=="__main__":
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument("--source-blend",required=True,type=Path)
 p.add_argument("--out",required=True,type=Path)
 a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
 run(a.source_blend,a.out)
