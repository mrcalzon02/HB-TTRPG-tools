"""R109: THREE-DIMENSIONAL original-sprite petal form, not pixel fitting.

R108 preserved genuine finite-thickness, cupped fin shells but left their
original R21 nearly-rectangular free-end silhouette and weak folds. The private
Factorio original instead depicts flared, separately shaped main petals,
a pressed raised return along each lateral side, unequal attachment shoulders,
and heavy rolled (not softly painted) free lips.

Load exact successful source-ranked R108 editable Blender artifacts, reshape
BOTH skins in their actual local 3D coordinates, optionally add truly closed
finite-radius lip mesh to each separate fin, render native source camera and
a real oblique camera without modifying the original source camera. Don't
export source sprites and don't claim automatic visual approval.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path
from collections import Counter
import bpy
from mathutils import Matrix

HERE=Path(__file__).resolve().parent
if str(HERE) not in sys.path:sys.path.insert(0,str(HERE))
import physical_cut_separate_source_fins_r107 as prior

REV="R109_trapezoid_folded_shouldered_fins_and_independent_rolled_metal_lips"
SOURCE_ART="private Factorio thruster.zip; never upload or use unrelated image reference"
SOURCES={
  "five_deep_clamshell_edges":"72288e6c38c54a0e68f9346588e04ac73bff39073b636fc982aec1f804b78ac3",
  "five_rolled_tip_form":"a10218ea99835e83de7d03af36f171d26cc4f5c020e9cf6a1700ab7a8c5d602a",
}
ROOT_PROFILE={
 # non-uniform center/side petal widths, edge flange, shoulder bite and toe bead
 0:(.14,.085,.055,.038,-.035),
 1:(.26,.100,.038,.045,-.009),
 2:(.31,.090,.068,.050,.011),
 3:(.24,.110,.046,.044,.027),
 4:(.16,.125,.070,.039,.039),
}
CASES=(
 ("three_flared_forged_plates",(1,2,3),.82,False),
 ("three_rolled_scalloped_metal",(1,2,3),1.12,True),
 ("five_differently_folded_lipped_pieces",(0,1,2,3,4),1.02,True),
)
NROW=9
NCOL=11
NSKIN=NROW*NCOL
ORIGINAL_FRAMES=(1,33)

def original_body_digest(scene):
 """Exclude explicitly authored NEW R109 lip meshes from unchanged-body audit.

 The original source chassis, mountings and animated lower fins are still
 strictly byte-fingerprinted; new lip geometry is independently verified
 as closed, parented and persistent by the later explicit checks.
 """
 from types import SimpleNamespace
 original=SimpleNamespace(objects=[ob for ob in scene.objects
                  if not ob.name.startswith("R109_TRUE_ROLLED_FREE_EDGE_")])
 return prior.other_mesh_fingerprint(original)

def section_measure(mesh):
 measures=[]
 for row in (0,1,2,4,6,8):
  xyz=[mesh.vertices[row*NCOL+j].co for j in range(NCOL)]
  outer=[xyz[0],xyz[-1]]
  mid=xyz[5]
  def radial(q):return math.hypot(q.x,q.z+.43)
  measures.append({"station":row,"y":round(mid.y,5),
      "full_side_to_side_chord":round(math.dist(tuple(outer[0]),tuple(outer[1])),5),
      "raised_side_flange_over_pressed_center":round((radial(outer[0])+radial(outer[1]))/2-radial(mid),5),
      "unequal_ends_y":[round(outer[0].y,5),round(outer[1].y,5)]})
 return measures

def reshape_real_shell(fin,index,intensity):
 if len(fin.data.vertices)!=198 or not fin.get("R108_real_cupped_shell"):
  raise RuntimeError("R109 needs actual R108 cupped 198-vertex source mesh")
 if not .3<=intensity<=1.6:raise RuntimeError("R109 invalid true 3D deformation intensity")
 m=fin.data
 coords=[tuple(v.co) for v in m.vertices]
 tipflare,fold,shoulder,lip_radius,hand=ROOT_PROFILE[index]
 delta_max=0.
 for skin in range(2):
  for row in range(NROW):
   t=row/(NROW-1)
   for j in range(NCOL):
    k=skin*NSKIN+row*NCOL+j
    x,y,z=coords[k]
    u=(j-5)/5
    angle=math.atan2(z+.43,x)
    r=math.hypot(x,z+.43)
    # Flaring is strongest near free edge and not identical by fin or side.
    # Angular sideways movement is real width, not 2D scaling of a bitmap.
    # Rotate about individual petal center azimuth, not world center.
    center=math.tau*(index+.5)/10
    local=math.atan2(math.sin(angle-center),math.cos(angle-center))
    angle=center+local*(1+tipflare*intensity*t**1.7)
    # Strengthened side flange: last two side columns become a folded return,
    # not a flat panel extended toward an invented hinge ring.
    edge=max(0.,(abs(u)-.55)/.45)
    rise=fold*intensity*edge**1.6*(.15+.85*math.sin(math.pi*(.1+.8*t)/2))
    # Shoulder steps change the actual outline at the attachment, with
    # different port/starboard offsets and no forced mesh intersection.
    shoulder_cut=shoulder*intensity*edge**1.5*max(0,1-t/.32)
    unequal=hand*intensity*u*(.8*(1-t)+.2*t)
    # Tip curl, and a deliberately unequal scallop near the free end.
    toe=max(0.,(t-.72)/.28)
    radial=r+rise+(.018*intensity*toe**2*edge)
    axial=y-shoulder_cut+unequal + (.025*intensity*toe**3*u*u)
    xyz=(radial*math.cos(angle),axial,-.43+radial*math.sin(angle))
    delta_max=max(delta_max,math.dist(coords[k],xyz))
    m.vertices[k].co=xyz
 m.update()
 okay,edges=prior.manifold_edges(m)
 if not okay or any(p.area<1.e-11 for p in m.polygons):
  raise RuntimeError("R109 warped original stamped sheet into non-manifold")
 if delta_max<.015:raise RuntimeError("R109 barely changed actual 3D geometry")
 if len(m.materials)!=4 or not m.color_attributes.get("R21_heat_tint"):
  raise RuntimeError("R109 lost authentic thermal shader or material slots")
 fin["R109_true_flared_edges"]=True
 fin["R109_flanged_folded_sides"]=True
 fin["R109_unequal_shoulder_cutouts"]=True
 fin["R109_original_source_is_visual_authority"]=True
 return {"max_real_vertex_move":round(delta_max,6),
         "real_198_vertices":len(m.vertices),"closed_shell_edges":edges,
         "actual_cross_sections":section_measure(m)}

def real_rolled_free_lip(fin,index,intensity):
 """CREATE a separate CLOSED metal geometry bead along physical fin free end.

 The user's spec explicitly permits independent formed parts. This is a
 ten-segment genuine rounded lip with 8-sided cross sections and two end
 caps, not a texture, mask, or required auto-welded whole-object manifold.
 """
 if not fin.get("R109_true_flared_edges"):
  raise RuntimeError("R109 fin profile must physically form before adding lip")
 n=10
 _,_,_,radius,hand=ROOT_PROFILE[index]
 mesh=fin.data
 vertices=[]
 for j in range(NCOL):
  p=mesh.vertices[8*NCOL+j].co
  q=mesh.vertices[NSKIN+8*NCOL+j].co
  cx,cy,cz=((p[k]+q[k])*.5 for k in range(3))
  rr=math.hypot(cx,cz+.43)
  radial=(cx/rr,0.,(cz+.43)/rr)
  thickness=radius*intensity*(.80+.20*math.sin(math.pi*j/10))
  for k in range(n):
   a=math.tau*k/n
   # Rounded cross-section in radial/axial plane; one axis is
   # genuinely axial, so the lip has nonzero swept volume.
   x=cx+radial[0]*thickness*math.cos(a)
   y=cy+thickness*.64*math.sin(a)
   z=cz+radial[2]*thickness*math.cos(a)
   vertices.append((x,y,z))
 faces=[]
 for j in range(NCOL-1):
  for k in range(n):
   nxt=(k+1)%n
   faces.append((j*n+k,(j+1)*n+k,(j+1)*n+nxt,j*n+nxt))
 faces.append(tuple(range(n-1,-1,-1)))
 faces.append(tuple((NCOL-1)*n+k for k in range(n)))
 lipmesh=bpy.data.meshes.new(f"R109_TIP_ROLLED_CLOSED_METAL_{index:02d}")
 lipmesh.from_pydata(vertices,[],faces)
 lipmesh.update()
 lipmesh.materials.append(mesh.materials[3])
 attr=lipmesh.color_attributes.new(name="R21_heat_tint",type="FLOAT_COLOR",domain="CORNER")
 original=mesh.color_attributes.get("R21_heat_tint")
 samples={}
 for polygon in mesh.polygons:
  for loop_index in polygon.loop_indices:
   vertex_idx=mesh.loops[loop_index].vertex_index
   if vertex_idx%NSKIN//NCOL == 8:
    col=vertex_idx%NCOL
    samples.setdefault(col,[]).append(tuple(original.data[loop_index].color))
 for polygon in lipmesh.polygons:
  polygon.material_index=0
  polygon.use_smooth=True
  for li in polygon.loop_indices:
   j=min(10,lipmesh.loops[li].vertex_index//n)
   colors=samples.get(j)
   if not colors:raise RuntimeError("R109 missing real source fin-tip heat tint")
   attr.data[li].color=tuple(sum(v[c] for v in colors)/len(colors) for c in range(4))
 okay,edges=prior.manifold_edges(lipmesh)
 if not okay or any(p.area<1.e-11 for p in lipmesh.polygons):
  raise RuntimeError("R109 separate 3D rolled lip mesh is not closed")
 lip=bpy.data.objects.new(f"R109_TRUE_ROLLED_FREE_EDGE_{index:02d}",lipmesh)
 fin.users_collection[0].objects.link(lip)
 lip.parent=fin
 lip.location=(0.,0.,0.)
 lip.rotation_euler=(0.,0.,0.)
 lip.scale=(1.,1.,1.)
 lip["R109_actual_standalone_rounded_solid"]=True
 lip["R109_attached_petal"]=index
 lip["R109_not_a_texture_or_mask"]=True
 return {"name":lip.name,"real_vertices":len(lipmesh.vertices),
         "real_faces":len(lipmesh.polygons),
         "closed_3d_mesh_edges":edges,"physical_lip_radius":radius*intensity,
         "parent":fin.name}

def render_oblique(scene,destination):
 # Inspection camera is ephemeral, actual source-calibrated camera untouched.
 source_camera=scene.camera
 info=source_camera.data.copy()
 orbit=bpy.data.objects.new("R109_TEMP_INSPECTION_CAMERA",info)
 scene.collection.objects.link(orbit)
 try:
  orbit.matrix_world=Matrix.Rotation(math.radians(35),4,"Y")@source_camera.matrix_world
  scene.camera=orbit
  bpy.context.view_layer.update()
  prior.render(scene,destination)
 finally:
  scene.camera=source_camera
  bpy.data.objects.remove(orbit,do_unlink=True)
  bpy.data.cameras.remove(info)
  bpy.context.view_layer.update()

def run(root,out):
 root=Path(root).resolve()
 out=Path(out).resolve();out.mkdir(parents=True,exist_ok=True)
 report={"revision":REV,"source_sprite_exported":False,
         "metric":"real_3d_mesh_geometry_not_pixel_mae",
         "candidate_source_blend_sha256":SOURCES,"candidates":[]}
 for name,sha in SOURCES.items():
  src=root/(name+".blend")
  if hashlib.sha256(src.read_bytes()).hexdigest()!=sha:
   raise RuntimeError("R109 requires exact successful R108 real cupped fin models")
  for tag,selected,strength,roll in CASES:
   bpy.ops.wm.open_mainfile(filepath=str(src))
   scene=bpy.context.scene;scene.frame_set(1)
   if not scene.get("fsc_r108_actual_3d_profile_revision") or not scene.camera:
    raise RuntimeError("R109 source original rig or cupped Blender revision absent")
   original_objects={o.name for o in scene.objects}
   original_cam=tuple(float(x) for row in scene.camera.matrix_world for x in row)
   other=original_body_digest(scene)
   motion=prior.lower_animated_fin_digest(scene)
   measures={};lips={}
   for index in selected:
    fin=bpy.data.objects[prior.FIN_PREFIX+f"{index:02d}"]
    measures[str(index)]=reshape_real_shell(fin,index,strength)
    if roll:lips[str(index)]=real_rolled_free_lip(fin,index,strength)
   bpy.context.view_layer.update()
   if original_body_digest(scene)!=other or prior.lower_animated_fin_digest(scene)!=motion:
    raise RuntimeError("R109 changed original body or animated lower fin objects")
   expected=set(original_objects)|{data["name"] for data in lips.values()}
   if {o.name for o in scene.objects}!=expected:
    raise RuntimeError("R109 injected unrelated model geometry")
   scene.render.resolution_x,scene.render.resolution_y=prior.NATIVE
   scene.render.resolution_percentage=100
   scene.render.image_settings.file_format="PNG"
   scene.render.image_settings.color_mode="RGBA"
   scene.cycles.samples=8
   scene.cycles.seed=0;scene.cycles.use_animated_seed=False
   slug=name+"__"+tag
   frames={}
   for frame in ORIGINAL_FRAMES:
    scene.frame_set(frame)
    path=out/(slug+f"_frame{frame:02d}.png")
    prior.render(scene,path)
    if path.stat().st_size<5000:raise RuntimeError("R109 3D native render missing")
    frames[str(frame)]=path.name
   scene.frame_set(1)
   oblique=out/(slug+"_actual_3d_angled.png")
   render_oblique(scene,oblique)
   if oblique.stat().st_size<5000:
    raise RuntimeError("R109 angled true 3D shape inspection missing")
   if tuple(float(x) for row in scene.camera.matrix_world for x in row)!=original_cam:
    raise RuntimeError("R109 changed original source camera")
   scene["fsc_r109_revision"]=REV
   scene["fsc_r109_is_source_approved"]=False
   scene["fsc_r109_variant"]=slug
   saved=out/(slug+".blend")
   bpy.ops.wm.save_as_mainfile(filepath=str(saved))
   if saved.stat().st_size<100000:
    raise RuntimeError("R109 real 3D editable Blender scene not saved")
   bpy.ops.wm.open_mainfile(filepath=str(saved));scene=bpy.context.scene
   if tuple(float(x) for row in scene.camera.matrix_world for x in row)!=original_cam:
    raise RuntimeError("R109 saved/reopened source camera changed")
   if original_body_digest(scene)!=other or prior.lower_animated_fin_digest(scene)!=motion:
    raise RuntimeError("R109 saved/reopened body/animated lower fins changed")
   if {o.name for o in scene.objects}!=expected:
    raise RuntimeError("R109 saved/reopened unique petal and separate-lip geometry not preserved")
   for k in selected:
    fin=bpy.data.objects[prior.FIN_PREFIX+f"{k:02d}"]
    if len(fin.data.vertices)!=198 or not fin.get("R109_flanged_folded_sides"):
     raise RuntimeError("R109 flared, formed real metal shape not retained")
    okay,_=prior.manifold_edges(fin.data)
    if not okay:raise RuntimeError("R109 resulting fin is not manifold")
   for k,data in lips.items():
    lip=bpy.data.objects[data["name"]]
    if lip.parent.name!=data["parent"] or not lip.get("R109_actual_standalone_rounded_solid"):
     raise RuntimeError("R109 rolled lip disconnected or flattened on saved scene")
    if not prior.manifold_edges(lip.data)[0]:
     raise RuntimeError("R109 saved 3D tip lip lost closed volume")
   report["candidates"].append({"source_r108":name,"tag":tag,
       "source_correctness_unapproved":True,
       "actual_3d_form_measurements":measures,"real_separate_lips":lips,
       "native_rendered_frames":frames,"angled_real_3d_render":oblique.name,
       "editable_blend":saved.name,"blend_sha256":hashlib.sha256(saved.read_bytes()).hexdigest(),
       "original_lower_animation_and_body_preserved":True})
   (out/"r109_real_forged_petal_source_form_cases.json").write_text(
       json.dumps(report,indent=2)+"\n",encoding="utf8")
   print("R109_ACTUAL_METAL_SHAPES_SAVED_REOPENED",slug,flush=True)
 print("R109_SOURCE_GEOMETRY_MESH_PASS_NO_VISUAL_SOURCE_APPROVAL",flush=True)

if __name__=="__main__":
 p=argparse.ArgumentParser()
 p.add_argument("--r108-dir",type=Path,required=True)
 p.add_argument("--out",type=Path,required=True)
 a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
 run(a.r108_dir,a.out)
