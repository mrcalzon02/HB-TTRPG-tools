"""R106 — CUT OFF the erroneous rearward/back-body continuation of R21 fins.

Original private Factorio thruster.zip body sprite is the ONLY visual target.
The upper fin panel does not continue to taper/merge into the rocky nozzle
motor behind the proximal slots. It is a distinct piece ending at the body
join. This stage **deletes** the proximal R21 sheet row-0 strip, physically
CAPS the two separate sheet skins at their new hard leading boundary, and
tests several shorter ends just behind the first through-slots. The
existing refractory body and unlike upper casting geometries are unchanged.
A deliberate sheet-to-casting gap is permissible; never lengthen the fin
to satisfy an earlier assumed mandatory 'everything must join' heuristic.

These are real finite-thickness manifold Blender meshes, not 2D sprite cards.
Original Wube art is not placed into public GitHub Actions artifacts.
No variant is approved until private original sprite visual comparison.
"""
import argparse,hashlib,json,math,struct,sys
from collections import Counter
from pathlib import Path

ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path: sys.path.insert(0,ROOT)
import bpy
from fin_mount_geometry_sweep_r50 import FIN_PREFIX
from mount_occlusion_diagnostic_r51 import render,NATIVE

REV="R106_remove_original_source_wrong_fin_aft_root_extensions"
SOURCE_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
BASES={
 "right_chamfer_plus_left_heel__recess_y_015":"d4a005ea703c1e788501e084bc43c90c63bd73fefd631b656d27c22e8f9539f7",
 "both_stepped_actual_sidewalls__recess_y_015":"609c55ea5bc330df582553fd19c165611f84a6e979ece3007469f46df1a80634",
}
ROW=11
ROWS=10
SKIN=ROWS*ROW
UPPER=(0,1,2,3,4)
MAIN=(1,2,3)
FRAMES=(1,33)
# tag / upper fin selection / interpolation of the newly exposed root
# station 1 towards station 2, the beginning of the REAL through-slits.
# 'full' means the largest root cut; no imaginary metal continuing into
# the housing behind the slots. Every cutoff retains the original slits.
CASES=(
 ("baseline",(),{}),
 ("main_cut_at_row1",MAIN,{1:0.,2:0.,3:0.}),
 ("all_upper_cut_at_row1",UPPER,{i:0. for i in UPPER}),
 ("main_short_root_035",MAIN,{1:.35,2:.35,3:.35}),
 ("main_short_root_065",MAIN,{1:.65,2:.65,3:.65}),
 ("main_short_root_085",MAIN,{1:.85,2:.85,3:.85}),
 ("all_upper_short_root_065",UPPER,{i:.65 for i in UPPER}),
 ("all_upper_short_root_085",UPPER,{i:.85 for i in UPPER}),
 ("bespoke_root_stops",UPPER,{0:.45,1:.72,2:.84,3:.66,4:.38}),
)

def other_mesh_fingerprint(scene):
 h=hashlib.sha256()
 for ob in sorted(scene.objects,key=lambda v:v.name):
  if ob.type!="MESH" or ob.name in {FIN_PREFIX+f"{i:02d}" for i in UPPER}:continue
  h.update(ob.name.encode())
  h.update(struct.pack("<II",len(ob.data.vertices),len(ob.data.polygons)))
  for v in ob.data.vertices:h.update(struct.pack("<fff",*v.co))
  if ob.data.shape_keys:
   for key in ob.data.shape_keys.key_blocks:
    h.update(key.name.encode())
    for v in key.data:h.update(struct.pack("<fff",*v.co))
 return h.hexdigest()

def lower_animated_fin_digest(scene):
 h=hashlib.sha256()
 old=scene.frame_current
 try:
  for frame in range(1,65):
   scene.frame_set(frame)
   for i in range(5,10):
    o=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
    h.update(repr((frame,o.name,tuple(o.location),tuple(o.rotation_euler),
      tuple(o.scale),tuple((k.name,round(k.value,8)) for k in
      o.data.shape_keys.key_blocks) if o.data.shape_keys else None)).encode())
 finally:scene.frame_set(old)
 for i in range(5,10):
  o=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
  for v in o.data.vertices:h.update(struct.pack("<fff",*v.co))
  if o.data.shape_keys:
   for key in o.data.shape_keys.key_blocks:
    for v in key.data:h.update(struct.pack("<fff",*v.co))
 return h.hexdigest()

def manifold_edges(mesh):
 count=Counter()
 for polygon in mesh.polygons:
  vs=list(polygon.vertices)
  for i,a in enumerate(vs):
   b=vs[(i+1)%len(vs)]
   count[tuple(sorted((a,b)))]+=1
 return count and all(n==2 for n in count.values()),len(count)

def cut_actual_fin(fin,alpha):
 """Remove 22 ACTUAL proximal vertices & surfaces, and seal a real 3D end.

 This is not scaling/occlusion; the old rearward row and connecting sheet
 quads cease to exist. Keep row2..row9 exactly as source-test baseline.
 """
 old=fin.data
 if (len(old.vertices)!=220 or not fin.get("R21_actual_punched_slot_pairs")==2
     or old.shape_keys or len(old.materials)!=4):
  raise RuntimeError("R106 expected existing real 220-vertex two-skin R21 fin")
 attr=old.color_attributes.get("R21_heat_tint")
 if not attr or attr.domain!="CORNER":
  raise RuntimeError("R106 refuses to discard original heat-stain vertex colors")
 if not (0<=alpha<=.92):
  raise RuntimeError("R106 invalid physical source rear cutoff distance")
 old_positions=[tuple(v.co) for v in old.vertices]
 keep=[i for i in range(220) if ((i%SKIN)//ROW)>=1]
 convert={before:after for after,before in enumerate(keep)}
 original_y=[old_positions[r*ROW+5][1] for r in range(ROWS)]
 if not all(original_y[i]>original_y[i+1]+.01 for i in range(ROWS-1)):
  raise RuntimeError("R106 original fin rows are not monotonically aft")
 newverts=[old_positions[i] for i in keep]
 # The new root is really cut short: use existing row1 geometry, then
 # terminate the metal closer to row2 (start of stamped holes).
 for skin in range(2):
  for col in range(ROW):
   oldi=skin*SKIN+ROW+col
   nexti=skin*SKIN+2*ROW+col
   a=old_positions[oldi];b=old_positions[nexti]
   newverts[convert[oldi]]=tuple(a[k]*(1-alpha)+b[k]*alpha for k in range(3))
 index_faces=[];meta=[]
 original_samples={}
 for poly in old.polygons:
  v=list(poly.vertices)
  cols=[tuple(attr.data[li].color) for li in poly.loop_indices]
  for oldi,c in zip(v,cols):original_samples.setdefault(oldi,[]).append(c)
  if not all(i in convert for i in v):continue
  index_faces.append(tuple(convert[i] for i in v))
  meta.append((poly.material_index,cols))
 # Explicitly cap the new station1 metal end; NO support web extends back
 # past the sheet termination. The original first stamped holes remain.
 for j in range(ROW-1):
  a=ROW+j;b=ROW+j+1
  d=SKIN+ROW+j;c=SKIN+ROW+j+1
  ids=(a,b,c,d)
  index_faces.append(tuple(convert[i] for i in ids))
  corners=[]
  for i in ids:
   samples=original_samples.get(i,[])
   if not samples:raise RuntimeError("R106 original material colors unavailable")
   corners.append(tuple(sum(c[k] for c in samples)/len(samples) for k in range(4)))
  meta.append((0,corners))
 mesh=bpy.data.meshes.new(fin.name+"_R106_TRUE_REAR_TERMINATION")
 mesh.from_pydata(newverts,[],index_faces);mesh.update()
 for material in old.materials:mesh.materials.append(material)
 cattr=mesh.color_attributes.new(name="R21_heat_tint",type="FLOAT_COLOR",domain="CORNER")
 for face,(mat,cols) in zip(mesh.polygons,meta):
  face.material_index=mat
  face.use_smooth=False
  if len(face.loop_indices)!=len(cols):
   raise RuntimeError("R106 source heat pigment corner mapping failed")
  for li,rgb in zip(face.loop_indices,cols):cattr.data[li].color=rgb
 ok,edges=manifold_edges(mesh)
 if not ok or any(p.area<1e-11 for p in mesh.polygons):
  raise RuntimeError("R106 cutoff does not create an actual capped manifold metal shell")
 new_root_y=mesh.vertices[convert[ROW+5]].co.y
 if new_root_y>=original_y[0]-.055 or new_root_y<original_y[2]-.005:
  raise RuntimeError("R106 fin did not terminate behind the real upper punched slits")
 if any(tuple(mesh.vertices[convert[i]].co)!=old_positions[i]
        for i in keep if ((i%SKIN)//ROW)>=2):
  raise RuntimeError("R106 modified distal visible fin/slit geometry")
 oldfaces=len(old.polygons)
 fin.data=mesh
 if old.users==0:bpy.data.meshes.remove(old)
 fin["R106_actual_proximal_fin_sheet_chopped"]=True
 fin["R106_new_root_starts_after_original_row0"]=True
 fin["R106_truncate_fraction_to_first_slot"]=float(alpha)
 fin["R106_no_assumed_merging_into_refractory"]=True
 return {"old_real_sheet_vertices":220,"new_real_sheet_vertices":len(mesh.vertices),
    "old_real_mesh_polygons":oldfaces,"new_real_mesh_polygons":len(mesh.polygons),
    "former_root_station_y":original_y[0],
    "new_true_cut_end_station_y":new_root_y,
    "first_slit_station_y":original_y[2],
    "root_sheet_metal_physically_removed":True,
    "rear_end_actual_cap_quads":ROW-1,
    "both_real_metal_skins_closed_manifold":True,
    "physical_closed_shell_unique_edges":edges,
    "source_heat_tint_corners_retained":True,
    "all_row2_to_row9_fin_geometry_unchanged":True,
    "source_fidelity_unapproved":True}

def scene_used_material_signature(scene):
 """Stable round-trip audit of ACTUALLY USED material slots and shader graphs.

 Blender drops orphan/unreferenced material datablocks on .blend save/reopen.
 Enumerating bpy.data.materials previously made real saved/reopened geometry
 falsely fail despite identical active shader assignments. Do NOT weaken
 detection of changes to actual material assignments or shader wiring.
 """
 slots=tuple(sorted((ob.name,tuple(mat.name if mat else None
                 for mat in ob.data.materials))
                 for ob in scene.objects if ob.type=="MESH"))
 used={mat.name:mat for ob in scene.objects if ob.type=="MESH"
       for mat in ob.data.materials if mat}
 materials=[]
 for name,mat in sorted(used.items()):
  nodes=tuple(sorted((node.name,node.bl_idname)
          for node in mat.node_tree.nodes)) if mat.use_nodes else ()
  links=tuple(sorted((link.from_node.name,link.from_socket.name,
                      link.to_node.name,link.to_socket.name)
          for link in mat.node_tree.links)) if mat.use_nodes else ()
  materials.append((name,tuple(round(float(x),6) for x in mat.diffuse_color),
                    bool(mat.use_nodes),nodes,links))
 return (slots,tuple(materials))

def verify(scene,baseline_objs,cam,mats,other,lower_motion,upper0,edited):
 if {o.name for o in scene.objects}!=baseline_objs:
  raise RuntimeError("R106 deleted/added unrelated chassis pieces")
 if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=cam:
  raise RuntimeError("R106 changed source camera")
 if scene_used_material_signature(scene)!=mats:
  current=scene_used_material_signature(scene)
  original_slots,original_shaders=mats
  current_slots,current_shaders=current
  raise RuntimeError("R106 used-scene material slots or shader graph changed "
                     "after real 3D fin edit/save/reopen: "+
                     repr({"slot_lists_same":original_slots==current_slots,
                           "shader_graph_same":original_shaders==current_shaders}))
 if other_mesh_fingerprint(scene)!=other:
  raise RuntimeError("R106 changed nozzle, baffle, mounting casts or original lower fins")
 if lower_animated_fin_digest(scene)!=lower_motion:
  raise RuntimeError("R106 changed original 64-frame LOWER fin motion")
 for i in UPPER:
  obj=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
  if i in edited:
   if len(obj.data.vertices)!=198 or not obj.get("R106_actual_proximal_fin_sheet_chopped"):
    raise RuntimeError("R106 real proximal sheet cutoff did not persist")
  elif len(obj.data.vertices)!=220 or any(tuple(v.co)!=c
              for v,c in zip(obj.data.vertices,upper0[i])):
   raise RuntimeError("R106 altered unselected original upper fin")
def run(srcdir,out):
 srcdir=Path(srcdir).resolve();out=Path(out).resolve();out.mkdir(parents=True,exist_ok=True)
 report={"revision":REV,"user_original_private_sprite_sha256":SOURCE_SHA,
 "source_sprite_pixels_exported":False,"source_fidelity_approved":False,
 "old_mandatory_mount_contact_heuristic_deliberately_superseded":True,
 "original_blends_verification":{},"candidates":[]}
 for base,sha in BASES.items():
  src=srcdir/(base+".blend")
  if hashlib.sha256(src.read_bytes()).hexdigest()!=sha:
   raise RuntimeError("R106 prior source-tested Blender source scene hash mismatch: "+base)
  report["original_blends_verification"][base]=sha
  for tag,targets,fractions in CASES:
   bpy.ops.wm.open_mainfile(filepath=str(src));scene=bpy.context.scene;scene.frame_set(1)
   if scene.get("fsc_r103_revision") is None or scene.camera.data.type!="ORTHO":
    raise RuntimeError("R106 requires actual source-calibrated R103 scene")
   objs={o.name for o in scene.objects}
   cam=tuple(float(v) for row in scene.camera.matrix_world for v in row)
   mats=scene_used_material_signature(scene)
   other=other_mesh_fingerprint(scene)
   lower_motion=lower_animated_fin_digest(scene)
   upper0={i:[tuple(v.co) for v in bpy.data.objects[FIN_PREFIX+f"{i:02d}"].data.vertices]
       for i in UPPER}
   metrics={}
   for i in targets:
    obj=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
    metrics[str(i)]=cut_actual_fin(obj,fractions[i])
   bpy.context.view_layer.update()
   verify(scene,objs,cam,mats,other,lower_motion,upper0,targets)
   scene.render.resolution_x,scene.render.resolution_y=NATIVE
   scene.render.resolution_percentage=100
   scene.render.image_settings.file_format="PNG"
   scene.render.image_settings.color_mode="RGBA"
   scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
   label=base+"__"+tag
   for frame in FRAMES:
    scene.frame_set(frame);render(scene,out/(label+f"_frame{frame:02d}.png"))
   saved=None
   if targets:
    scene.frame_set(1)
    scene["fsc_r106_revision"]=REV
    scene["fsc_r106_is_source_approved"]=False
    scene["fsc_r106_true_cutoff_label"]=tag
    saved=out/(label+".blend")
    bpy.ops.wm.save_as_mainfile(filepath=str(saved))
    if saved.stat().st_size<100000:raise RuntimeError("R106 actual 3D saved Blender scene missing")
    bpy.ops.wm.open_mainfile(filepath=str(saved));scene=bpy.context.scene
    verify(scene,objs,cam,mats,other,lower_motion,upper0,targets)
    if scene.get("fsc_r106_true_cutoff_label")!=tag:
     raise RuntimeError("R106 original fin cutoff was not persisted as editable scene")
   report["candidates"].append({"source_scene":base,"tag":tag,
      "real_fins_with_proximal_sheet_cutoff":metrics,
      "frame1":label+"_frame01.png","frame33":label+"_frame33.png",
      "editable_blend":saved.name if saved else None,
      "blend_sha256":hashlib.sha256(saved.read_bytes()).hexdigest() if saved else None,
      "camera_original_lower_motion_other_forgings_and_nozzle_unchanged":True})
   print("R106_ACTUALLY_CHOPPED_OFF_REAR_FIN_SHEET",base,tag,flush=True)
 if len(report["candidates"])!=len(BASES)*len(CASES):
  raise RuntimeError("R106 not all original source fin separation variants generated")
 (out/"r106_physical_aft_fin_cutoff_cases.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf8")
 print("R106_REAL_FIN_ROOT_CHOP_MANIFOLD_AND_SAVED_REOPENED_PASS",flush=True)
 print("R106_PRIVATE_ORIGINAL_SPRITE_COMPARISON_REQUIRED_BEFORE_ACCEPT",flush=True)
if __name__=="__main__":
 p=argparse.ArgumentParser()
 p.add_argument("--r103-dir",required=True,type=Path)
 p.add_argument("--out",required=True,type=Path)
 a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
 run(a.r103_dir,a.out)
