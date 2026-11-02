"""R103: physically merge independently original-sprite-tested R97 and R101 real Blender meshes.

NOT a generic thruster redesign. R97 has distinct original-source-traced
forged LEFT/RIGHT 3D fin attachment castings. R101 physically repositions
original existing R11 annular baffle. This loads the EXACT verified saved
editable original-camera Blender models and replaces ONLY the actual baffle
mesh object data inside R97 scenes. It DOES NOT replace or paint images,
move the camera, rescale the fin system, invent actuators, or alter the R19
refractory and other machine geometry. Private original Wube sprite remains
the sole appearance specification for selecting any combination.
"""
import argparse,hashlib,json,struct,sys
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from save_connected_cast_candidate_r66 import fin_digest_all_frames
from fin_mount_geometry_sweep_r50 import FIN_PREFIX,MOUNT_PREFIX,MAIN
from mount_shape_fit_r52 import joint_gap_world
from mount_occlusion_diagnostic_r51 import render,NATIVE

REV="R103_combine_original_source_3d_asymmetric_forgings_R97_and_real_annular_R101"
ORIGINAL_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
RING="R11_recessed_internal_pressure_baffle_00"
R97={
 "right_chamfer_plus_left_heel":"5cc176fb4c4c7a1f166dc674b84cab21ac66688fada17dab47abd2d2010e95c7",
 "both_stepped_actual_sidewalls":"f8843af20fbe2f6c8190c4daba1008c39470e3fbc682253007b843d40a7c3caf"
}
R101={
 "recess_y_015":"f9bfd2070ca40029f3eda6d35d45bd7f209e650c6affb2b8185b8e3e697dc801",
 "source_irregular_recess_025":"06ba625fbbedb5f77fc577348f12871a5704cee5eff543fcaefd75b1322bd36a"
}
CASES=(
 ("right_chamfer_plus_left_heel","baseline"),
 ("both_stepped_actual_sidewalls","baseline"),
 ("right_chamfer_plus_left_heel","recess_y_015"),
 ("both_stepped_actual_sidewalls","recess_y_015"),
 ("right_chamfer_plus_left_heel","source_irregular_recess_025"),
 ("both_stepped_actual_sidewalls","source_irregular_recess_025"),
)
def mesh_digest(scene):
 h=hashlib.sha256()
 for ob in sorted(scene.objects,key=lambda o:o.name):
  if ob.type!="MESH" or ob.name==RING:continue
  h.update(ob.name.encode());h.update(struct.pack("<II",len(ob.data.vertices),len(ob.data.polygons)))
  for v in ob.data.vertices:h.update(struct.pack("<fff",*v.co))
  if ob.data.shape_keys:
   for block in ob.data.shape_keys.key_blocks:
    h.update(block.name.encode())
    for v in block.data:h.update(struct.pack("<fff",*v.co))
 return h.hexdigest()
def verify(scene,names,others,cam,mats,motion,joints,orig_mat):
 if {o.name for o in scene.objects}!=names or mesh_digest(scene)!=others:
  raise RuntimeError("R103 changed original R97 asymmetric casting or any R19 / R11 other geometry")
 if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=cam:
  raise RuntimeError("R103 altered original source camera")
 if {o.name:tuple(m.name for m in o.data.materials)
     for o in scene.objects if o.type=="MESH"}!=mats:
  raise RuntimeError("R103 changed actual existing model material allocations")
 if fin_digest_all_frames(scene)!=motion:
  raise RuntimeError("R103 changed original 64-frame heat-fin animation")
 baffle=bpy.data.objects[RING]
 if len(baffle.data.vertices)!=320 or len(baffle.data.polygons)!=320 or len(baffle.data.materials)!=1:
  raise RuntimeError("R103 real original baffle metal topology changed")
 if baffle.data.materials[0].name!=orig_mat:
  raise RuntimeError("R103 changed source existing metal baffle shader")
 for i in MAIN:
  g=joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
                    bpy.data.objects[FIN_PREFIX+f"{i:02d}"])
  if g>.003 or abs(g-joints[str(i)])>1e-6:
   raise RuntimeError("R103 detached actual original fin roots")
def run(r97dir,r101dir,out):
 r97dir=Path(r97dir).resolve();r101dir=Path(r101dir).resolve();out=Path(out).resolve()
 for name,sha in R97.items():
  path=r97dir/(name+".blend")
  if hashlib.sha256(path.read_bytes()).hexdigest()!=sha:
   raise RuntimeError("R103 genuine saved R97 source-fitted casting changed: "+name)
 for name,sha in R101.items():
  path=r101dir/(name+".blend")
  if hashlib.sha256(path.read_bytes()).hexdigest()!=sha:
   raise RuntimeError("R103 original source R101 real baffle altered: "+name)
 out.mkdir(parents=True,exist_ok=True)
 report={"revision":REV,"original_user_private_sprite_zip_sha256":ORIGINAL_SHA,
         "proprietary_original_pixels_uploaded_to_public_ci":False,
         "source_geometry_visually_approved":False,
         "original_r97_and_r101_3d_scenes_sha_verified":True,
         "candidates":[]}
 for side,part in CASES:
  source=r97dir/(side+".blend")
  bpy.ops.wm.open_mainfile(filepath=str(source))
  scene=bpy.context.scene;scene.frame_set(1)
  if scene.get("fsc_r97_revision") is None or scene.camera.data.type!="ORTHO":
   raise RuntimeError("R103 expected actual original camera R97 3D scene")
  names={ob.name for ob in scene.objects};others=mesh_digest(scene)
  cam=tuple(float(v) for row in scene.camera.matrix_world for v in row)
  mats={o.name:tuple(m.name for m in o.data.materials) for o in scene.objects if o.type=="MESH"}
  motion=fin_digest_all_frames(scene)
  joints={str(i):joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
            bpy.data.objects[FIN_PREFIX+f"{i:02d}"]) for i in MAIN}
  target=bpy.data.objects[RING];old_mat=target.data.materials[0]
  original_coords=tuple(tuple(v.co) for v in target.data.vertices)
  stats={"selected_original_source_cast":side,"selected_real_source_baffle":part}
  if part!="baseline":
   src=r101dir/(part+".blend")
   with bpy.data.libraries.load(str(src),link=False) as (data_from,data_to):
    if RING not in data_from.objects:
     raise RuntimeError("R103 cannot find original real R11 metal baffle in saved R101")
    data_to.objects=[RING]
   imported=data_to.objects[0]
   if imported is None or imported.data is None:
    raise RuntimeError("R103 failed to import genuine R101 physical baffle")
   if len(imported.data.vertices)!=320 or len(imported.data.polygons)!=320:
    raise RuntimeError("R103 imported R101 profile is not original baffle metal topology")
   new_mesh=imported.data.copy()
   new_mesh.materials.clear();new_mesh.materials.append(old_mat)
   old=target.data;target.data=new_mesh
   bpy.data.objects.remove(imported,do_unlink=True)
   if old.users==0:bpy.data.meshes.remove(old)
   if tuple(tuple(v.co) for v in target.data.vertices)==original_coords:
    raise RuntimeError("R103 R101 real annular geometry not actually transferred")
   target["R103_original_source_baffle_combined"]=part
   stats["material_preserved"]=target.data.materials[0].name
  bpy.context.view_layer.update()
  verify(scene,names,others,cam,mats,motion,joints,old_mat.name)
  scene.render.resolution_x,scene.render.resolution_y=NATIVE
  scene.render.resolution_percentage=100
  scene.render.image_settings.file_format="PNG"
  scene.render.image_settings.color_mode="RGBA"
  scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
  tag=side+"__"+part
  for frame in (1,33):
   scene.frame_set(frame);render(scene,out/(tag+f"_frame{frame:02d}.png"))
  saved=None
  if part!="baseline":
   scene.frame_set(1)
   scene["fsc_r103_revision"]=REV
   scene["fsc_r103_original_sprite_fidelity_approved"]=False
   scene["fsc_r103_reallife_3d_combination"]=tag
   saved=out/(tag+".blend")
   bpy.ops.wm.save_as_mainfile(filepath=str(saved))
   if saved.stat().st_size<100000:raise RuntimeError("R103 failed saving real multi-source 3D model")
   bpy.ops.wm.open_mainfile(filepath=str(saved));scene=bpy.context.scene
   verify(scene,names,others,cam,mats,motion,joints,old_mat.name)
   if bpy.data.objects[RING].get("R103_original_source_baffle_combined")!=part:
    raise RuntimeError("R103 actually combined R101 shape lost after reopen")
  report["candidates"].append({"tag":tag,"source_3d_subcomponents":stats,
    "native_frame1":tag+"_frame01.png","native_frame33":tag+"_frame33.png",
    "saved_editable_blend":saved.name if saved else None,
    "sha256":hashlib.sha256(saved.read_bytes()).hexdigest() if saved else None,
    "all_other_original_3d_geometry_motion_camera_and_materials_unchanged":True})
  print("R103_SOURCE_FIRST_REAL_3D_COMBINED_MESH",tag,flush=True)
 (out/"r103_original_source_real_metal_composite_candidates.json").write_text(
   json.dumps(report,indent=2)+"\n",encoding="utf8")
 print("R103_ACTUAL_ORIGINAL_SOURCE_3D_FORGINGS_AND_BAFFLE_COMBINED_SAVED_REOPENED_PASS",flush=True)
 print("R103_PRIVATE_USER_ORIGINAL_SPRITE_COMPARISON_REQUIRED",flush=True)
if __name__=="__main__":
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument("--r97-dir",type=Path,required=True)
 p.add_argument("--r101-dir",type=Path,required=True)
 p.add_argument("--out",type=Path,required=True)
 a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
 run(a.r97_dir,a.r101_dir,a.out)
