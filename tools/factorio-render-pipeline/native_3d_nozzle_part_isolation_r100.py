"""R100: actual R94 Blender nozzle surface ownership, native fixed camera.

The user's private ORIGINAL Factorio sprite is the only appearance target.
Test which EXISTING real metal meshes cast the source-mismatched dark mouth;
never manufacture decorative 3D machinery, paste a source screenshot onto
a surface, or infer source-fit from a green workflow alone. Temporarily
hide EXACT named physical objects and restore on every case. This does
not change existing geometry: it is causal isolation for the NEXT real
source-directed mesh revision. Source pixels never enter public CI.
"""
import argparse,hashlib,json,struct,sys
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from physical_original_refractory_flare_r98 import (
 BASE_SHA,ORIGINAL_SOURCE_SHA,SHELL,render,NATIVE,MAIN,FIN_PREFIX,
 MOUNT_PREFIX,joint_gap_world,fin_digest_all_frames)

REVISION="R100_source_real_3d_nozzle_liner_refractory_part_family_isolation"
LINER="R11_OPEN_DEEP_REFRACTORY_THROAT"
B={i:f"R11_recessed_internal_pressure_baffle_{i:02d}" for i in range(4)}
NEAR=[f"R19_NEAR_MOUTH_TILE_{i:02d}" for i in range(40)]
MID=[f"R19_MID_STAGGERED_TILE_{i:02d}" for i in range(40)]
CASES=(
 ("baseline",[]),
 ("only_hide_r94_bell",[SHELL]),
 ("only_hide_r11_liner",[LINER]),
 ("only_hide_baffle_00",[B[0]]),
 ("only_hide_baffle_01",[B[1]]),
 ("only_hide_baffle_02",[B[2]]),
 ("only_hide_baffle_03",[B[3]]),
 ("hide_all_four_r11_baffles",list(B.values())),
 ("hide_r19_near_40",NEAR),
 ("hide_r19_middle_40",MID),
 ("hide_both_r19_rows",NEAR+MID),
 ("hide_r11_liner_and_baffle_00",[LINER,B[0]]),
 ("hide_baffle_00_and_near_plates",[B[0]]+NEAR),
 ("hide_r11_liner_and_r19_shingles",[LINER]+NEAR+MID),
)

def fingerprint(scene):
 h=hashlib.sha256()
 for obj in sorted(scene.objects,key=lambda x:x.name):
  h.update(obj.name.encode());h.update(str(obj.hide_render).encode())
  h.update(str(tuple(float(v) for row in obj.matrix_world for v in row)).encode())
  if obj.type!="MESH":continue
  h.update(struct.pack("<II",len(obj.data.vertices),len(obj.data.polygons)))
  for v in obj.data.vertices:h.update(struct.pack("<fff",*v.co))
  if obj.data.shape_keys:
   for k in obj.data.shape_keys.key_blocks:
    h.update(k.name.encode())
    for v in k.data:h.update(struct.pack("<fff",*v.co))
 return h.hexdigest()

def verify(scene,expected,names,cam,mats,motion,contacts):
 if {o.name for o in scene.objects}!=names or fingerprint(scene)!=expected:
  raise RuntimeError("R100 changed source existing 3D parts or persisted visibility")
 if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=cam:
  raise RuntimeError("R100 source calibrated camera moved")
 if {m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
     for m in bpy.data.materials}!=mats:
  raise RuntimeError("R100 material changed instead of geometry isolation")
 if fin_digest_all_frames(scene)!=motion:
  raise RuntimeError("R100 modified original 64 fin motion frames")
 for i in MAIN:
  g=joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
                    bpy.data.objects[FIN_PREFIX+f"{i:02d}"])
  if g>.003 or abs(g-contacts[str(i)])>1e-6:
   raise RuntimeError("R100 real fin contact broke")

def run(source,out):
 source=Path(source).resolve();out=Path(out).resolve()
 if hashlib.sha256(source.read_bytes()).hexdigest()!=BASE_SHA:
  raise RuntimeError("R100 must use exact source-first R94 native 3D baseline")
 bpy.ops.wm.open_mainfile(filepath=str(source))
 scene=bpy.context.scene;scene.frame_set(1)
 if scene.get("fsc_r94_revision") is None or scene.camera.data.type!="ORTHO":
  raise RuntimeError("R100 calibrated original scene not present")
 original_names={o.name for o in scene.objects}
 if any(n not in original_names for tag,group in CASES for n in group):
  missing=[n for tag,group in CASES for n in group if n not in original_names]
  raise RuntimeError("R100 exact named original source parts missing: "+str(sorted(set(missing))))
 for tag,group in CASES:
  if any(bpy.data.objects[n].hide_render for n in group):
   raise RuntimeError("R100 cannot isolate geometry that is already hidden: "+tag)
 initial_vis={o.name:o.hide_render for o in scene.objects}
 original_fingerprint=fingerprint(scene)
 camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
 mats={m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
       for m in bpy.data.materials}
 motion=fin_digest_all_frames(scene)
 gaps={str(i):joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
      bpy.data.objects[FIN_PREFIX+f"{i:02d}"]) for i in MAIN}
 out.mkdir(parents=True,exist_ok=True)
 report={"revision":REVISION,"original_private_source_sha256":ORIGINAL_SOURCE_SHA,
         "private_sprite_pixels_in_public_artifact":False,
         "source_pixel_comparison_performed_in_public_ci":False,
         "source_fidelity_approved":False,
         "unchanged_r94_editable_scene_sha256":BASE_SHA,"cases":[]}
 for tag,group in CASES:
  scene.frame_set(1)
  for name in group:bpy.data.objects[name].hide_render=True
  bpy.context.view_layer.update()
  scene.render.resolution_x,scene.render.resolution_y=NATIVE
  scene.render.resolution_percentage=100
  scene.render.image_settings.file_format="PNG"
  scene.render.image_settings.color_mode="RGBA"
  scene.cycles.samples=8;scene.cycles.seed=0
  scene.cycles.use_animated_seed=False
  for frame in (1,33):
   scene.frame_set(frame);render(scene,out/(tag+f"_frame{frame:02d}.png"))
  for name in group:bpy.data.objects[name].hide_render=initial_vis[name]
  scene.frame_set(1);bpy.context.view_layer.update()
  verify(scene,original_fingerprint,original_names,camera,mats,motion,gaps)
  report["cases"].append({
    "name":tag,"existing_actual_3d_part_names_temporarily_isolated":group,
    "real_3d_objects_isolated":len(group),
    "native_frame1":tag+"_frame01.png",
    "native_frame33":tag+"_frame33.png",
    "original_solid_geometry_reinstated":True,
    "source_fidelity_approved":False})
  print("R100_ORIGINAL_CAMERA_REAL_NOZZLE_PART_ISOLATION",tag,flush=True)
 if hashlib.sha256(source.read_bytes()).hexdigest()!=BASE_SHA:
  raise RuntimeError("R100 overwrote original unchanged saved 3D source model")
 (out/"r100_original_3d_nozzle_surface_ownership.json").write_text(
  json.dumps(report,indent=2)+"\n",encoding="utf8")
 print("R100_ALL_ORIGINAL_3D_MESHES_RESTORED_AND_SOURCE_NATIVE_RENDERED",flush=True)
 print("R100_PRIVATE_ORIGINAL_SPRITE_COMPARISON_MUST_DETERMINE_NEXT_PHYSICAL_EDIT",flush=True)
if __name__=="__main__":
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument("--source-blend",type=Path,required=True)
 p.add_argument("--out",type=Path,required=True)
 a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
 run(a.source_blend,a.out)
