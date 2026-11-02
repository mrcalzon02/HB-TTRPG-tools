"""R104 ORIGINAL SPRITE FIRST upper machine 3D mesh ownership census.

Inspect the ACTUAL currently saved Blender R103 source-contour-preferred model:
identify which existing physical 3D object renders at each original native
Factorio sprite pixel in upper machinery, using exact immutable camera rays.
The original user sprite is the ONLY appearance authority, not internet art
or self-justifying plausible spacecraft components. This mesh ownership and
temporary reversible hide diagnostic is preparation for physically replacing
wrong shaped solids, not source fidelity approval or a geometry edit.
No original copyrighted Factorio art in public CI output.
"""
import argparse,hashlib,json,sys,struct
from pathlib import Path
from collections import Counter
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mount_occlusion_diagnostic_r51 import NATIVE,camera_ray,render
from save_connected_cast_candidate_r66 import fin_digest_all_frames
REV="R104_authentic_source_upper_machinery_3d_first_hit_ownership"
SOURCE_SHA="d4a005ea703c1e788501e084bc43c90c63bd73fefd631b656d27c22e8f9539f7"
ORIGINAL_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
ROIS={
 "source_upper_left":(12,0,105,156),
 "source_upper_center":(83,0,173,175),
 "source_upper_right":(158,0,252,158),
 "source_mid_left":(12,140,108,303),
 "source_mid_center":(79,150,178,304),
 "source_mid_right":(154,143,250,306)
}
def census(scene):
 scene.frame_set(1);bpy.context.view_layer.update()
 dg=bpy.context.evaluated_depsgraph_get()
 report={};global_counts=Counter()
 for region,(x0,y0,x1,y1) in ROIS.items():
  counts=Counter()
  for y in range(y0,y1,3):
   for x in range(x0,x1,3):
    origin,direction=camera_ray(scene.camera,scene,x,y)
    hit,p,n,idx,obj,mtx=scene.ray_cast(dg,origin,direction,distance=300.)
    name=obj.name if hit else "<NO_HIT>"
    counts[name]+=1;global_counts[name]+=1
  report[region]={"original_source_frame_region_xyxy":[x0,y0,x1,y1],
    "actual_3d_camera_sample_stride_pixels":3,
    "pixel_rays":sum(counts.values()),
    "foremost_existing_meshes":dict(counts.most_common())}
 return report,global_counts
def fingerprint(scene):
 h=hashlib.sha256()
 for o in sorted(scene.objects,key=lambda x:x.name):
  h.update(o.name.encode())
  h.update(b"1" if o.hide_render else b"0")
  if o.type=="MESH":
   h.update(struct.pack("<II",len(o.data.vertices),len(o.data.polygons)))
   for v in o.data.vertices:h.update(struct.pack("<fff",*v.co))
 return h.hexdigest()
def run(src,out):
 src=Path(src).resolve();out=Path(out).resolve()
 if hashlib.sha256(src.read_bytes()).hexdigest()!=SOURCE_SHA:
  raise RuntimeError("R104 requires exact private original-source-ranked R103 saved 3D Blender candidate")
 bpy.ops.wm.open_mainfile(filepath=str(src));scene=bpy.context.scene;scene.frame_set(1)
 if scene.get("fsc_r103_revision") is None or scene.camera.data.type!="ORTHO":
  raise RuntimeError("R104 original 3D source camera / merged R103 casting missing")
 names={o.name for o in scene.objects};cam=tuple(float(v) for row in scene.camera.matrix_world for v in row)
 motion=fin_digest_all_frames(scene)
 vis={o.name:bool(o.hide_render) for o in scene.objects}
 original=fingerprint(scene)
 source_meshes,counts=census(scene)
 chosen=[]
 for name,n in counts.most_common():
  o=bpy.data.objects.get(name)
  if o and o.type=="MESH" and not o.hide_render and name not in chosen:
   chosen.append(name)
  if len(chosen)>=8:break
 if len(chosen)<4:raise RuntimeError("R104 did not observe enough real upper machine physical meshes")
 out.mkdir(parents=True,exist_ok=True)
 report={"revision":REV,"source_3d_model_sha256":SOURCE_SHA,
   "original_private_factorio_sprite_sha256":ORIGINAL_SHA,
   "copyright_original_source_pixels_in_artifacts":False,
   "original_3d_geometry_modified":False,
   "original_sprite_source_fidelity_approved":False,
   "real_native_3d_first_hit_by_source_region":source_meshes,
   "source_upper_3d_objects_selected_for_causal_isolation":chosen,
   "isolations":[]}
 for tag,hidden in [("baseline",None)]+[(f"hide_upper_owner_{i:02d}",name) for i,name in enumerate(chosen)]:
  scene.frame_set(1)
  if hidden:bpy.data.objects[hidden].hide_render=True
  bpy.context.view_layer.update()
  scene.render.resolution_x,scene.render.resolution_y=NATIVE
  scene.render.resolution_percentage=100
  scene.render.image_settings.file_format="PNG"
  scene.render.image_settings.color_mode="RGBA"
  scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
  for frame in (1,33):
   scene.frame_set(frame);render(scene,out/(tag+f"_frame{frame:02d}.png"))
  if hidden:bpy.data.objects[hidden].hide_render=vis[hidden]
  scene.frame_set(1);bpy.context.view_layer.update()
  if fingerprint(scene)!=original or {o.name for o in scene.objects}!=names:
   raise RuntimeError("R104 failed to restore original real source machine geometry")
  if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=cam or fin_digest_all_frames(scene)!=motion:
   raise RuntimeError("R104 changed source camera or 64 animation")
  report["isolations"].append({"name":tag,"actual_existing_3d_object_temporarily_hidden":hidden,
    "native_source_camera_frame1":tag+"_frame01.png",
    "native_source_camera_frame33":tag+"_frame33.png",
    "actual_original_3d_scene_restored":True})
  print("R104_SOURCE_FIRST_REAL_UPPER_3D_PART_OWNERSHIP",tag,hidden,flush=True)
 if hashlib.sha256(src.read_bytes()).hexdigest()!=SOURCE_SHA:
  raise RuntimeError("R104 altered selected source-original 3D Blender candidate file")
 (out/"r104_original_source_upper_machine_actual_mesh_owners.json").write_text(
   json.dumps(report,indent=2)+"\n",encoding="utf8")
 print("R104_REAL_UPPER_ORIGINAL_3D_SOURCE_FIRST_HIT_RAYS_AND_MODEL_RESTORATION_PASS",flush=True)
 print("R104_PRIVATE_ORIGINAL_SPRITE_MUST_SELECT_NEXT_TRUE_PHYSICAL_MESH_REPLACEMENTS",flush=True)
if __name__=="__main__":
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument("--source-blend",type=Path,required=True)
 p.add_argument("--out",type=Path,required=True)
 a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
 run(a.source_blend,a.out)
