"""R102 real source-informed R11 *physical* fluted liner reconstruction.

The user's exact original Factorio sprite, not a plausible nozzle, is the
target. R100 real-original pixel audit proved existing dark R11 liner itself
is source-mismatched, while removing R19 near mouth REAL plate meshes makes
the source fit worse. Keep all 80 R19 plates, four baffles, fins, camera,
hull/guards, shaders and 64-frame motion. Rebuild ONLY the existing R11
inner bore-facing 13-ring mesh using stitched real planar quad surfaces:
40 actual separate flutes from 80 circumferential stations, with
independent true geometric groove depths and sectional radial clearance.
No textured sprite cards, fake rings or copied images. All candidates
are independent experiments until private ORIGINAL sprite comparison.
"""
import argparse,hashlib,json,math,struct,sys
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from physical_original_refractory_flare_r98 import (
 BASE_SHA,ORIGINAL_SOURCE_SHA,render,NATIVE,MAIN,FIN_PREFIX,MOUNT_PREFIX,
 joint_gap_world,fin_digest_all_frames)
REV="R102_true_source_fluted_original_refractory_3d_liner"
LINER="R11_OPEN_DEEP_REFRACTORY_THROAT";AXIS_Z=-.43
N=80;RINGS=13
ORIG_N=40
PROFILE_STANDARD=(0.,0.,.16,.50,.84,1.,1.,.90,.74,.40,0.,0.,0.)
PROFILE_NEAR=(0.,.18,.54,.9,1.,1.,.80,.55,.35,.13,0.,0.,0.)
# tag, flutes, actual 3D concave depth, radial bore-facing clearance,
# axial distribution; off axis original material and camera stay fixed.
CASES=(
 ("baseline",None,None,None,None),
 ("liner_hidden",0,None,None,None),
 ("rebuild_20_flutes_008",20,.08,0.,"standard"),
 ("rebuild_20_flutes_016",20,.16,0.,"standard"),
 ("rebuild_40_flutes_006",40,.06,0.,"standard"),
 ("rebuild_40_flutes_010",40,.10,0.,"standard"),
 ("rebuild_40_flutes_016",40,.16,0.,"standard"),
 ("rebuild_40_flutes_022",40,.22,0.,"standard"),
 ("rebuild_40_near_010",40,.10,0.,"near"),
 ("rebuild_40_near_018",40,.18,0.,"near"),
 ("rebuild_40_012_outer_clearance_008",40,.12,.08,"standard"),
 ("rebuild_40_012_outer_clearance_016",40,.12,.16,"standard"),
 ("rebuild_40_near_014_outer_clearance_010",40,.14,.10,"near"),
)
def other_geometry_hash(scene):
 h=hashlib.sha256()
 for o in sorted(scene.objects,key=lambda x:x.name):
  if o.type!="MESH" or o.name==LINER:continue
  h.update(o.name.encode());h.update(struct.pack("<II",len(o.data.vertices),len(o.data.polygons)))
  for v in o.data.vertices:h.update(struct.pack("<fff",*v.co))
  if o.data.shape_keys:
   for k in o.data.shape_keys.key_blocks:
    h.update(k.name.encode())
    for v in k.data:h.update(struct.pack("<fff",*v.co))
 return h.hexdigest()
def model_physical_liner(obj,old_coords,flutes,groove,clearance,profile):
 old=obj.data
 if len(old_coords)!=520 or len(old.vertices)!=520 or len(old.polygons)!=480:
  raise RuntimeError("R102 must remesh ORIGINAL existing R39 13x40 3D R11 liner")
 if old.shape_keys or obj.animation_data or len(old.materials)!=1:
  raise RuntimeError("R102 moving or unoriginal liner cannot be remodeled")
 if flutes not in (20,40) or groove<.03 or groove>.24 or clearance<0 or clearance>.2:
  raise RuntimeError("R102 invalid actual source-directed flute geometry")
 weights=PROFILE_STANDARD if profile=="standard" else PROFILE_NEAR
 # Retain EXACT original physical R11 radial ring stations and one source
 # radius/axial coordinate per ring; make true connected 3D formed ribs.
 theta0=math.atan2(old_coords[0][2]-AXIS_Z,old_coords[0][0])
 vertices=[]
 sections=[]
 for row in range(RINGS):
  ring=old_coords[row*ORIG_N:(row+1)*ORIG_N]
  mean_r=sum(math.hypot(x,z-AXIS_Z) for x,y,z in ring)/ORIG_N
  mean_y=sum(y for x,y,z in ring)/ORIG_N
  radial_tension=clearance*weights[row]
  sections.append({"original_radius":mean_r,"original_y":mean_y})
  for k in range(N):
   angle=theta0+2*math.pi*k/N
   # Existing R39 has 20 smooth broad channels; replacing the actual
   # mesh permits independently shaped 40-channel refractory section.
   channel=(k%2==1) if flutes==40 else (k%4==2)
   rad=mean_r+radial_tension-(groove*weights[row] if channel else 0.)
   if rad<=.1:raise RuntimeError("R102 source physical open bore collapsed")
   vertices.append((rad*math.cos(angle),mean_y,AXIS_Z+rad*math.sin(angle)))
 faces=[]
 for row in range(RINGS-1):
  for k in range(N):
   j=(k+1)%N
   faces.append((row*N+k,row*N+j,(row+1)*N+j,(row+1)*N+k))
 mesh=bpy.data.meshes.new(LINER+"_R102_real_3d_original_source_fluted_surface")
 mesh.from_pydata(vertices,[],faces);mesh.update()
 if len(mesh.vertices)!=1040 or len(mesh.polygons)!=960 or any(f.area<1e-11 for f in mesh.polygons):
  raise RuntimeError("R102 bad actual 3D open quad flute topology")
 mesh.materials.append(old.materials[0])
 for f in mesh.polygons:f.use_smooth=False
 obj.data=mesh
 if old.users==0:bpy.data.meshes.remove(old)
 obj["R11_open_no_endcaps"]=True
 obj["R102_actual_physical_flutes"]=flutes
 return {"true_3d_quad_stitched_surface":True,
         "real_3d_flute_count":flutes,
         "real_3d_flute_depth":groove,
         "true_3d_bore_radial_clearance":clearance,
         "source_axial_geometry_stations":sections,
         "physical_3d_vertices":len(mesh.vertices),"physical_3d_faces":len(mesh.polygons),
         "open_original_bore_no_caps":True,
         "original_sprite_fidelity_approved":False}
def verify(scene,names,other,cam,mats,motion,joints):
 if {o.name for o in scene.objects}!=names or other_geometry_hash(scene)!=other:
  raise RuntimeError("R102 changed original R19 plates, outer bell, baffles or fins")
 if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=cam:
  raise RuntimeError("R102 moved original camera instead of physical liner")
 if {m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
     for m in bpy.data.materials}!=mats:
  raise RuntimeError("R102 changed source lighting/material instead of geometry")
 if fin_digest_all_frames(scene)!=motion:
  raise RuntimeError("R102 changed original 64 frames")
 for i in MAIN:
  d=joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
                    bpy.data.objects[FIN_PREFIX+f"{i:02d}"])
  if d>.003 or abs(d-joints[str(i)])>1e-6:
   raise RuntimeError("R102 fin support detached")
def run(source,out):
 source=Path(source).resolve();out=Path(out).resolve()
 if hashlib.sha256(source.read_bytes()).hexdigest()!=BASE_SHA:
  raise RuntimeError("R102 requires exact R94 working Blender model")
 bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene;scene.frame_set(1)
 if scene.get("fsc_r94_revision") is None or scene.camera.data.type!="ORTHO":
  raise RuntimeError("R102 not a source-camera reconstruction")
 original=[tuple(v.co) for v in bpy.data.objects[LINER].data.vertices]
 names={o.name for o in scene.objects}
 other=other_geometry_hash(scene)
 cam=tuple(float(v) for row in scene.camera.matrix_world for v in row)
 mats={m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
       for m in bpy.data.materials}
 motion=fin_digest_all_frames(scene)
 joints={str(i):joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
         bpy.data.objects[FIN_PREFIX+f"{i:02d}"]) for i in MAIN}
 out.mkdir(parents=True,exist_ok=True)
 report={"revision":REV,"original_private_factorio_zip_sha256":ORIGINAL_SOURCE_SHA,
         "proprietary_source_pixels_published":False,"actual_source_fidelity_approved":False,
         "untouched_original_R94_3d_sha256":BASE_SHA,"candidates":[]}
 for tag,flutes,groove,clearance,profile in CASES:
  bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene;scene.frame_set(1)
  ob=bpy.data.objects[LINER];stats=None
  if tag=="liner_hidden":ob.hide_render=True
  elif tag!="baseline":stats=model_physical_liner(ob,original,flutes,groove,clearance,profile)
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
   scene.frame_set(1);scene["fsc_r102_revision"]=REV
   scene["fsc_r102_actual_original_sprite_fidelity_approved"]=False
   scene["fsc_r102_source_fluted_form"]=tag
   saved=out/(tag+".blend");bpy.ops.wm.save_as_mainfile(filepath=str(saved))
   if saved.stat().st_size<100000:raise RuntimeError("R102 real Blender model not saved")
   bpy.ops.wm.open_mainfile(filepath=str(saved));scene=bpy.context.scene
   verify(scene,names,other,cam,mats,motion,joints)
   o=bpy.data.objects[LINER]
   if len(o.data.vertices)!=1040 or not o.get("R102_actual_physical_flutes"):
    raise RuntimeError("R102 physically formed new liner failed save/reopen")
  report["candidates"].append({"name":tag,"new_3d_source_liner":stats,
    "native_frame1":tag+"_frame01.png","native_frame33":tag+"_frame33.png",
    "editable_blend":saved.name if saved else None,
    "saved_sha256":hashlib.sha256(saved.read_bytes()).hexdigest() if saved else None,
    "protected_baffles_refractory_camera_and_64_frames_preserved":True})
  print("R102_GENUINE_3D_REAL_SOURCE_FLUTED_REFRACTORY",tag,flush=True)
 if hashlib.sha256(source.read_bytes()).hexdigest()!=BASE_SHA:
  raise RuntimeError("R102 altered R94 experiment")
 (out/"r102_source_true_fluted_3d_r11_liner.json").write_text(
  json.dumps(report,indent=2)+"\n",encoding="utf8")
 print("R102_ALL_GENUINE_SOURCE_3D_LINER_CASES_SAVED_REOPENED_PASS",flush=True)
 print("R102_PRIVATE_ORIGINAL_SPRITE_COMPARISON_REQUIRED",flush=True)
if __name__=="__main__":
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument("--source-blend",type=Path,required=True)
 p.add_argument("--out",type=Path,required=True)
 a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
 run(a.source_blend,a.out)
