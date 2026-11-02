"""R105: source-first eight-frame source-rig 3D animation reconstruction audit.

The exact user-owned Factorio original sprite body atlases have 64 frames,
each 264×542, and may contain nontrivial original geometry/lighting changes.
Render 8 spread authentic original frame indices on TWO independently
original-source-tested, saved and reopened 3D Blender scenes from R103.
This is not fabricated animation or replacement imagery, no overlays.
Keep the original SHA-verified .blend input unchanged and compare source
privately, never in public GitHub Actions/artifacts. No 3D geometry edits.
"""
import argparse,hashlib,json,struct,sys
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mount_occlusion_diagnostic_r51 import render,NATIVE
from save_connected_cast_candidate_r66 import fin_digest_all_frames
from fin_mount_geometry_sweep_r50 import MAIN,FIN_PREFIX,MOUNT_PREFIX
from mount_shape_fit_r52 import joint_gap_world
ORIG_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
SCENES={
 "both_stepped_actual_sidewalls__recess_y_015":"609c55ea5bc330df582553fd19c165611f84a6e979ece3007469f46df1a80634",
 "right_chamfer_plus_left_heel__recess_y_015":"d4a005ea703c1e788501e084bc43c90c63bd73fefd631b656d27c22e8f9539f7"
}
FRAMES=(1,9,17,25,33,41,49,57)
def protected_fingerprint(scene):
 h=hashlib.sha256()
 for o in sorted(scene.objects,key=lambda x:x.name):
  h.update(o.name.encode());h.update(str(o.hide_render).encode())
  if o.type!="MESH":continue
  h.update(struct.pack("<II",len(o.data.vertices),len(o.data.polygons)))
  for v in o.data.vertices:h.update(struct.pack("<fff",*v.co))
  if o.data.shape_keys:
   for b in o.data.shape_keys.key_blocks:
    h.update(b.name.encode())
    for v in b.data:h.update(struct.pack("<fff",*v.co))
 return h.hexdigest()
def capture(root,out):
 root=Path(root).resolve();out=Path(out).resolve();out.mkdir(parents=True,exist_ok=True)
 result={"revision":"R105_real_eight_frame_original_factorio_source_3d_animation_audit",
    "private_original_factorio_archive_sha256":ORIG_SHA,
    "source_pixels_in_public_artifact":False,
    "source_fidelity_approved":False,"native_shape":list(NATIVE),
    "original_frame_indices":list(FRAMES),"scenes":[]}
 for tag,sha in SCENES.items():
  src=root/(tag+".blend")
  if hashlib.sha256(src.read_bytes()).hexdigest()!=sha:
   raise RuntimeError("R105 refused altered verified R103 original 3D source scene: "+tag)
  bpy.ops.wm.open_mainfile(filepath=str(src));scene=bpy.context.scene;scene.frame_set(1)
  if scene.get("fsc_r103_revision") is None or scene.camera is None or scene.camera.data.type!="ORTHO":
   raise RuntimeError("R105 requires actual original camera R103 saved 3D scene")
  m=protected_fingerprint(scene)
  cam=tuple(float(x) for row in scene.camera.matrix_world for x in row)
  old_motion=fin_digest_all_frames(scene)
  if not old_motion:raise RuntimeError("R105 original animation is missing")
  joints={str(i):joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],bpy.data.objects[FIN_PREFIX+f"{i:02d}"])
          for i in MAIN}
  for i in MAIN:
   if joints[str(i)]>.003:raise RuntimeError("R105 source fin root detached before testing")
  captures=[]
  scene.render.resolution_x,scene.render.resolution_y=NATIVE
  scene.render.resolution_percentage=100
  scene.render.image_settings.file_format="PNG"
  scene.render.image_settings.color_mode="RGBA"
  scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
  for frame in FRAMES:
   scene.frame_set(frame)
   dest=out/(tag+f"_frame{frame:02d}.png")
   render(scene,dest)
   if dest.stat().st_size<5000:raise RuntimeError("R105 genuine native 3D render absent")
   captures.append({"frame":frame,"real_native_blender_render":dest.name})
  scene.frame_set(1)
  if tuple(float(x) for row in scene.camera.matrix_world for x in row)!=cam:
   raise RuntimeError("R105 original projection camera changed")
  if protected_fingerprint(scene)!=m or fin_digest_all_frames(scene)!=old_motion:
   raise RuntimeError("R105 original 3D geometry or 64-frame animation changed")
  for i in MAIN:
   d=joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],bpy.data.objects[FIN_PREFIX+f"{i:02d}"])
   if d>.003 or abs(d-joints[str(i)])>1e-6:
    raise RuntimeError("R105 original physical fin root detached after animated render")
  if hashlib.sha256(src.read_bytes()).hexdigest()!=sha:
   raise RuntimeError("R105 overwrote original editable source scene")
  result["scenes"].append({"source_tested_real_3d_scene":tag,"sha256":sha,
    "true_rig_animation_intact":True,
    "unaltered_original_camera_shaders_and_3d_geometry":True,
    "frames":captures})
  print("R105_TRUE_ORIGINAL_CAMERA_3D_EIGHT_FRAME_SCENE",tag,flush=True)
 (out/"r105_original_eight_frame_3d_source_audit.json").write_text(json.dumps(result,indent=2)+"\n",encoding="utf8")
 print("R105_VERIFIED_BLENDER_SOURCE_ANIMATION_EIGHT_FRAMES_EACH_PASS",flush=True)
 print("R105_ONLY_PRIVATE_ORIGINAL_SPRITE_CAN_APPROVE_GEOMETRIC_FIDELITY",flush=True)
if __name__=="__main__":
 p=argparse.ArgumentParser()
 p.add_argument("--r103-dir",type=Path,required=True)
 p.add_argument("--out",type=Path,required=True)
 a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
 capture(a.r103_dir,a.out)
