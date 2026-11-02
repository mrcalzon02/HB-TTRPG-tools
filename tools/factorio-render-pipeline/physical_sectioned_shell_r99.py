"""R99: source-first 3D sector isolation of the R94 bell occluding actual liner.

R98 oversized flared sleeves ALL worsened genuine original sprite fit. R99
removes limited real 3D shell sectors and closes each exposed shell boundary
with physically thick walls, rather than inventing another continuous nozzle.
Original Factorio sprites are the only visual fidelity target and stay private.
Every candidate remains an experiment until direct source frame comparison.
"""
import argparse,hashlib,json,sys
from collections import Counter
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from physical_original_refractory_flare_r98 import (
  BASE_SHA,ORIGINAL_SOURCE_SHA,SHELL,non_shell_fingerprint,verify,render,NATIVE,
  MAIN,FIN_PREFIX,MOUNT_PREFIX,joint_gap_world,fin_digest_all_frames)
REV="R99_source_first_real_3d_segmented_bell_occlusion"
N=40;ROWS=8;INNER=N*ROWS
CASES=(
 ("baseline",None,None),
 ("shell_hidden",None,"hidden"),
 ("sector_00_09_lower",(range(0,10),range(3,7)),None),
 ("sector_10_19_lower",(range(10,20),range(3,7)),None),
 ("sector_20_29_lower",(range(20,30),range(3,7)),None),
 ("sector_30_39_lower",(range(30,40),range(3,7)),None),
 ("sector_00_09_middle",(range(0,10),range(1,6)),None),
 ("sector_10_19_middle",(range(10,20),range(1,6)),None),
 ("sector_20_29_middle",(range(20,30),range(1,6)),None),
 ("sector_30_39_middle",(range(30,40),range(1,6)),None),
 ("alternate_00_09_20_29",(list(range(0,10))+list(range(20,30)),range(2,7)),None),
 ("alternate_10_19_30_39",(list(range(10,20))+list(range(30,40)),range(2,7)),None),
 ("half_shell_00_19",(range(0,20),range(2,7)),None),
 ("half_shell_20_39",(range(20,40),range(2,7)),None),
)
def build_window(obj,sector,rows):
 old=obj.data
 if len(old.vertices)!=640 or len(old.polygons)!=640 or len(old.materials)!=1:
  raise RuntimeError("R99 requires exact R94 connected and thick 8x40 physical shell")
 columns=set(sector);axial=set(rows)
 if not columns or not axial or min(columns)<0 or max(columns)>=40 or min(axial)<0 or max(axial)>6:
  raise RuntimeError("R99 original sectional cutout indices invalid")
 def survives(r,k):return r not in axial or k not in columns
 verts=[tuple(v.co) for v in old.vertices];faces=[];outer_faces=[]
 for row in range(7):
  for k in range(40):
   if not survives(row,k):continue
   j=(k+1)%40;a=row*40+k;b=row*40+j;c=(row+1)*40+j;d=(row+1)*40+k
   outer_faces.append((a,b,c,d));faces.append((a,b,c,d))
   faces.append((INNER+d,INNER+c,INNER+b,INNER+a))
 for k in range(40):
  j=(k+1)%40
  if survives(0,k):faces.append((k,INNER+k,INNER+j,j))
  if survives(6,k):
   tail=7*40;faces.append((tail+j,INNER+tail+j,INNER+tail+k,tail+k))
 edge_count=Counter()
 for face in outer_faces:
  for i,a in enumerate(face):
   edge_count[tuple(sorted((a,face[(i+1)%4])))]+=1
 walls=0
 for (a,b),count in sorted(edge_count.items()):
  if count!=1:continue
  # Keep the original real axial collar walls at both surviving end rings.
  if a//40==b//40 and a//40 in (0,7):continue
  faces.append((a,b,INNER+b,INNER+a));walls+=1
 mesh=bpy.data.meshes.new(obj.name+"_R99_true_thick_segmented_source_shell")
 mesh.from_pydata(verts,[],faces);mesh.update()
 if any(p.area<1e-11 for p in mesh.polygons):
  raise RuntimeError("R99 formed metal collapsed to paper or zero area")
 counts=Counter()
 for p in mesh.polygons:
  vs=list(p.vertices)
  for i,a in enumerate(vs):counts[tuple(sorted((a,vs[(i+1)%len(vs)])))]+=1
 if not counts or any(n!=2 for n in counts.values()):
  raise RuntimeError("R99 physical sector cutout failed exact 2-face manifold test")
 mesh.materials.append(old.materials[0])
 for p in mesh.polygons:p.use_smooth=False
 obj.data=mesh
 if old.users==0:bpy.data.meshes.remove(old)
 obj["R99_source_shell_section_test"]=True
 return {"removed_actual_3d_shell_quads":len(columns)*len(axial),
         "new_physically_connected_thickness_walls":walls,
         "all_mesh_edges_manifold":True,
         "original_camera_and_refractory_surfaces_unchanged":True,
         "angular_source_shell_sections":sorted(columns),
         "axial_source_shell_rows":sorted(axial),
         "actual_3d_faces":len(mesh.polygons),
         "fidelity_to_original_user_sprite_approved":False}
def run(source,out):
 source=Path(source).resolve();out=Path(out).resolve()
 if hashlib.sha256(source.read_bytes()).hexdigest()!=BASE_SHA:
  raise RuntimeError("R99 must use exact R94 original model without changing working scene")
 bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene;scene.frame_set(1)
 if scene.get("fsc_r94_revision") is None or scene.camera.data.type!="ORTHO":
  raise RuntimeError("R99 original camera/real 3D saved scene missing")
 names={o.name for o in scene.objects}
 others=non_shell_fingerprint(scene)
 camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
 materials={m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
            for m in bpy.data.materials}
 motion=fin_digest_all_frames(scene)
 contacts={str(i):joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
           bpy.data.objects[FIN_PREFIX+f"{i:02d}"]) for i in MAIN}
 out.mkdir(parents=True,exist_ok=True)
 report={"revision":REV,"original_user_private_source_sha256":ORIGINAL_SOURCE_SHA,
         "private_original_sprite_uploaded_to_public_ci":False,
         "source_comparison_done_inside_public_ci":False,
         "source_fidelity_approved":False,"preserved_r94_blend_sha256":BASE_SHA,
         "cases":[]}
 for tag,cut,mode in CASES:
  bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene;scene.frame_set(1)
  shell=bpy.data.objects[SHELL];stats=None
  if mode=="hidden":shell.hide_render=True
  elif cut:stats=build_window(shell,*cut)
  bpy.context.view_layer.update()
  verify(scene,names,others,camera,materials,motion,contacts)
  scene.render.resolution_x,scene.render.resolution_y=NATIVE
  scene.render.resolution_percentage=100
  scene.render.image_settings.file_format="PNG"
  scene.render.image_settings.color_mode="RGBA"
  scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
  for frame in (1,33):
   scene.frame_set(frame);render(scene,out/(tag+f"_frame{frame:02d}.png"))
  saved=None
  if stats:
   scene.frame_set(1);scene["fsc_r99_revision"]=REV
   scene["fsc_r99_source_fidelity_approved"]=False
   scene["fsc_r99_3d_shell_section"]=tag
   saved=out/(tag+".blend");bpy.ops.wm.save_as_mainfile(filepath=str(saved))
   if saved.stat().st_size<100000:raise RuntimeError("R99 real 3D scene missing")
   bpy.ops.wm.open_mainfile(filepath=str(saved));scene=bpy.context.scene
   verify(scene,names,others,camera,materials,motion,contacts)
   s=bpy.data.objects[SHELL]
   if len(s.data.polygons)!=stats["actual_3d_faces"] or not s.get("R99_source_shell_section_test"):
    raise RuntimeError("R99 saved/reopened physically connected panel cutout absent")
  report["cases"].append({"tag":tag,"physical_3d_source_shell_cutout":stats,
     "native_frame1":tag+"_frame01.png","native_frame33":tag+"_frame33.png",
     "saved_reopened_editable_blend":saved.name if saved else None,
     "blend_sha256":hashlib.sha256(saved.read_bytes()).hexdigest() if saved else None,
     "all_protected_original_3d_parts_animation_and_camera_intact":True})
  print("R99_ORIGINAL_SOURCE_TRUE_PHYSICAL_SEGMENTED_METAL",tag,flush=True)
 if hashlib.sha256(source.read_bytes()).hexdigest()!=BASE_SHA:
  raise RuntimeError("R99 modified approved experimental baseline")
 (out/"r99_true_sectioned_real_source_shell.json").write_text(
    json.dumps(report,indent=2)+"\n",encoding="utf8")
 print("R99_ORIGINAL_CAMERA_REAL_3D_SHELL_WINDOWS_SAVED_REOPENED_PASS",flush=True)
 print("R99_PRIVATE_USER_ORIGINAL_SPRITE_COMPARISON_REQUIRED",flush=True)
if __name__=="__main__":
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument("--source-blend",type=Path,required=True)
 p.add_argument("--out",type=Path,required=True)
 a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
 run(a.source_blend,a.out)
