"""R101: source-image-driven replacement of WRONG existing R11 physical surfaces.

R100 two-frame original Factorio source comparison: hiding the R11 real liner
plus first annular baffle improves mouth RGB error .075590 -> .067292, but
deleting physical source-visible parts is NOT an acceptable model. Instead,
reprofile ONLY their actual vertices (existing 13x40 radial throat and actual
320-vertex toroidal first baffle). Original R19 near/mid plates and all
sources of fin/mount/cup geometry, camera, materials, motion unchanged.
No image planes, masks, generic invented rings, or 'plausible thruster' parts.
All candidates remain unapproved until comparison with private user
thruster.zip SHA256 0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791.
"""
import argparse,hashlib,json,math,struct,sys
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from fin_mount_geometry_sweep_r50 import MAIN,FIN_PREFIX,MOUNT_PREFIX
from mount_shape_fit_r52 import joint_gap_world
from save_connected_cast_candidate_r66 import fin_digest_all_frames
from mount_occlusion_diagnostic_r51 import render,NATIVE
from physical_original_refractory_flare_r98 import BASE_SHA,ORIGINAL_SOURCE_SHA

REV="R101_original_source_real_3d_refractory_wall_and_first_baffle_geometry"
LINER="R11_OPEN_DEEP_REFRACTORY_THROAT"
BAFFLE="R11_recessed_internal_pressure_baffle_00"
AXIS_Z=-.43
LINER_RINGS=13;SEGS=40
BAND=(0.,.14,.55,.88,1.,1.,.84,.54,.18,0.,0.,0.,0.)
# Distinct actual 3D hypotheses: (near-wall radial relief, extra fluted
# channel depth, baffle axial station displacement, baffle radial major
# displacement, baffle minor section scale, physical perimeter scallop).
# No candidate is granted fidelity by an error number alone.
CASES=(
 ("baseline",0.,0.,0.,0.,1.,0.),
 ("liner_reveal_006",.06,0.,0.,0.,1.,0.),
 ("liner_reveal_012",.12,0.,0.,0.,1.,0.),
 ("liner_reveal_020",.20,0.,0.,0.,1.,0.),
 ("liner_reveal_012_flute_010",.12,.10,0.,0.,1.,0.),
 ("liner_reveal_012_flute_017",.12,.17,0.,0.,1.,0.),
 ("baffle00_axial_deeper_018",0.,0.,.18,0.,1.,0.),
 ("baffle00_axial_deeper_032",0.,0.,.32,0.,.88,0.),
 ("baffle00_recess_outboard_016",0.,0.,.16,.16,1.,0.),
 ("baffle00_recess_inboard_014",0.,0.,.14,-.14,1.,0.),
 ("baffle00_irregular_angular",0.,0.,.18,0.,1.,.12),
 ("liner_reveal_012_baffle_axial_018",.12,0.,.18,0.,1.,0.),
 ("liner_reveal_012_baffle_outboard_016",.12,0.,.16,.16,1.,0.),
 ("liner_reveal_020_baffle_axial_032",.20,0.,.32,0.,.88,0.),
)
def hash_protected(scene):
 h=hashlib.sha256()
 for obj in sorted(scene.objects,key=lambda o:o.name):
  if obj.type!="MESH" or obj.name in (LINER,BAFFLE):continue
  h.update(obj.name.encode())
  h.update(struct.pack("<II",len(obj.data.vertices),len(obj.data.polygons)))
  for v in obj.data.vertices:h.update(struct.pack("<fff",*v.co))
  if obj.data.shape_keys:
   for k in obj.data.shape_keys.key_blocks:
    h.update(k.name.encode())
    for v in k.data:h.update(struct.pack("<fff",*v.co))
 return h.hexdigest()
def physical_reprofile_liner(obj,original,amplitude,flute):
 if not obj.get("R11_open_no_endcaps") or len(original)!=LINER_RINGS*SEGS or len(obj.data.polygons)!=(LINER_RINGS-1)*SEGS or obj.data.shape_keys:
  raise RuntimeError("R101 genuine original 13x40 open R11 physical liner missing")
 if not 0<=amplitude<=.25 or not 0<=flute<=.20:
  raise RuntimeError("R101 R11 physical source wall proposal invalid")
 moved=0;minrad=100.
 for i,(v,p) in enumerate(zip(obj.data.vertices,original)):
  row=i//SEGS;col=i%SEGS
  x,y,z=p
  r=math.hypot(x,z-AXIS_Z)
  if r<.08:raise RuntimeError("R101 R11 axial geometry invalid")
  # The original R19 80 plate surfaces were buried behind this current
  # smooth dark wall; reprofile the MID cone surface outward, NOT the real
  # mouth rim or inner throat end. Alternate channels follow original
  # R39 physical forty-vertex molded 20-flute cross-section topology.
  delta=amplitude*BAND[row] - (flute*BAND[row] if col%2==0 else 0.)
  rr=r+delta
  if rr<.11:raise RuntimeError("R101 collapsed through real open throat")
  fac=rr/r;v.co=(x*fac,y,AXIS_Z+(z-AXIS_Z)*fac)
  minrad=min(minrad,rr)
  if abs(delta)>1e-8:moved+=1
 obj.data.update()
 if any(p.area<1e-10 for p in obj.data.polygons):
  raise RuntimeError("R101 real R11 liner folded or collapsed")
 if any(tuple(obj.data.vertices[i].co)!=original[i] for row in (0,9,10,11,12) for i in range(row*SEGS,(row+1)*SEGS)):
  raise RuntimeError("R101 wrongly deformed mouth or distant original refractory section")
 return {"real_inner_wall_vertices_physically_reprofiled":moved,
   "amplitude_world_tiles":amplitude,"extra_3d_channel_depth":flute,
   "open_throat_not_capped":True,"minimum_actual_radial_radius":minrad}
def physical_reprofile_baffle(obj,original,axial,radial,section,scallop):
 if len(original)!=320 or len(obj.data.polygons)!=320 or obj.data.shape_keys:
  raise RuntimeError("R101 original 320x320 R11 annular metal baffle missing")
 if not -.20<=radial<=.20 or not 0<=axial<=.40 or not .75<=section<=1.1 or not 0<=scallop<=.15:
  raise RuntimeError("R101 original source annular section proposal invalid")
 radii=[math.hypot(p[0],p[2]-AXIS_Z) for p in original]
 yc=(min(p[1] for p in original)+max(p[1] for p in original))*.5
 rc=(min(radii)+max(radii))*.5
 if abs(yc+3.61)>.04 or abs(rc-1.385)>.06:
  raise RuntimeError("R101 did not find actual original source-positioned first R11 annular baffle")
 for v,(x,y,z) in zip(obj.data.vertices,original):
  r=math.hypot(x,z-AXIS_Z)
  theta=math.atan2(z-AXIS_Z,x)
  # Existing formed torus stays an actual physical volume, not hidden or
  # removed. Independently change its station, major radius and original
  # minor section; optional uneven radius tests genuinely nonuniform shape.
  rr=rc+radial+(r-rc)*section+scallop*math.cos(theta*5+0.3)
  if rr<.7:raise RuntimeError("R101 physically collapsed baffle wall")
  v.co=(x*(rr/r),yc+axial+(y-yc)*section,AXIS_Z+(z-AXIS_Z)*(rr/r))
 obj.data.update()
 if any(f.area<1e-10 for f in obj.data.polygons):
  raise RuntimeError("R101 annular baffle lacks real metal cross section")
 return {"existing_original_annular_baffle_retained":True,
  "actual_3d_baffle_vertices":len(obj.data.vertices),
  "baffle_axial_shift_tiles":axial,
  "baffle_major_radius_shift_tiles":radial,
  "minor_section_multiplier":section,"nonuniform_circumferential_radial_scallop":scallop}
def verify(scene,names,protected,camera,materials,motion,gaps):
 if {o.name for o in scene.objects}!=names or hash_protected(scene)!=protected:
  raise RuntimeError("R101 changed noncandidate original R19 fins/casts/cups/metal")
 if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=camera:
  raise RuntimeError("R101 moved original sprite camera")
 if {m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
     for m in bpy.data.materials}!=materials:
  raise RuntimeError("R101 changed original illumination/materials")
 if fin_digest_all_frames(scene)!=motion:
  raise RuntimeError("R101 changed original 64 frame motion")
 for i in MAIN:
  g=joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],bpy.data.objects[FIN_PREFIX+f"{i:02d}"])
  if g>.003 or abs(g-gaps[str(i)])>1e-6:raise RuntimeError("R101 disconnected original real fin root")
def run(source,out):
 source=Path(source).resolve();out=Path(out).resolve()
 if hashlib.sha256(source.read_bytes()).hexdigest()!=BASE_SHA:
  raise RuntimeError("R101 requires exact selected R94 original calibrated Blender scene")
 bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene;scene.frame_set(1)
 if scene.get("fsc_r94_revision") is None or scene.camera.data.type!="ORTHO":
  raise RuntimeError("R101 original calibrated source scene missing")
 liner=bpy.data.objects[LINER];baffle=bpy.data.objects[BAFFLE]
 coords_l=[tuple(v.co) for v in liner.data.vertices]
 coords_b=[tuple(v.co) for v in baffle.data.vertices]
 names={o.name for o in scene.objects}
 protected=hash_protected(scene)
 camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
 materials={m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
            for m in bpy.data.materials}
 motion=fin_digest_all_frames(scene)
 gaps={str(i):joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
           bpy.data.objects[FIN_PREFIX+f"{i:02d}"]) for i in MAIN}
 out.mkdir(parents=True,exist_ok=True)
 report={"revision":REV,"actual_original_private_source_sha256":ORIGINAL_SOURCE_SHA,
    "source_art_in_public_outputs":False,"source_fidelity_accepted":False,
    "original_source_not_available_inside_public_ci":True,
    "unmodified_R94_blend_sha256":BASE_SHA,"candidates":[]}
 for tag,expand,flute,axial,major,section,scallop in CASES:
  bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene;scene.frame_set(1)
  props={}
  if expand or flute:
   props["R11_true_inner_wall"]=physical_reprofile_liner(bpy.data.objects[LINER],coords_l,expand,flute)
  if axial or major or section!=1. or scallop:
   props["R11_first_annular_baffle"]=physical_reprofile_baffle(bpy.data.objects[BAFFLE],coords_b,axial,major,section,scallop)
  bpy.context.view_layer.update()
  verify(scene,names,protected,camera,materials,motion,gaps)
  scene.render.resolution_x,scene.render.resolution_y=NATIVE
  scene.render.resolution_percentage=100
  scene.render.image_settings.file_format="PNG"
  scene.render.image_settings.color_mode="RGBA"
  scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
  for frame in (1,33):
   scene.frame_set(frame);render(scene,out/(tag+f"_frame{frame:02d}.png"))
  saved=None
  if props:
   scene.frame_set(1)
   scene["fsc_r101_revision"]=REV
   scene["fsc_r101_original_source_fidelity_accepted"]=False
   scene["fsc_r101_source_wall_baffle_candidate"]=tag
   saved=out/(tag+".blend");bpy.ops.wm.save_as_mainfile(filepath=str(saved))
   if saved.stat().st_size<100000:raise RuntimeError("R101 actual formed editable 3D scene did not save")
   bpy.ops.wm.open_mainfile(filepath=str(saved));scene=bpy.context.scene
   verify(scene,names,protected,camera,materials,motion,gaps)
   if scene.get("fsc_r101_source_wall_baffle_candidate")!=tag:
    raise RuntimeError("R101 3D geometry edit not persisted after reopen")
  report["candidates"].append({"name":tag,"true_original_metal_mesh_changes":props,
    "frame01":tag+"_frame01.png","frame33":tag+"_frame33.png",
    "editable_blend":saved.name if saved else None,
    "blend_sha256":hashlib.sha256(saved.read_bytes()).hexdigest() if saved else None,
    "original_3d_R19_refractory_plates_cups_fins_camera_shaders_and_motion_unchanged":True})
  print("R101_AUTHENTIC_SOURCE_PHYSICAL_R11_REFRACTORY_MESH",tag,flush=True)
 if hashlib.sha256(source.read_bytes()).hexdigest()!=BASE_SHA:
  raise RuntimeError("R101 overwrote previous real Blender reconstruction")
 (out/"r101_reprofiled_real_3d_liner_baffle.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf8")
 print("R101_REAL_BLENDER_R11_3D_MESHES_RENDERED_AND_PERSISTED_PASS",flush=True)
 print("R101_PRIVATE_USER_ORIGINAL_SOURCE_GEOMETRIC_COMPARE_REQUIRED",flush=True)
if __name__=="__main__":
 p=argparse.ArgumentParser(description=__doc__)
 p.add_argument("--source-blend",required=True,type=Path)
 p.add_argument("--out",required=True,type=Path)
 a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
 run(a.source_blend,a.out)
