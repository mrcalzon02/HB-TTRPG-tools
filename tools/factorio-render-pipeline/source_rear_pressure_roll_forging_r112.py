"""R112 source-first REAL shape revision of the original upper hinge dark roll.

The user rejects a clean/thick circular arc replacing the original sprite's
unequal mechanical housing behind the upper fins. The R111 actual owner
isolation proves four R08_black_exhaust_pressure_roll existing meshes draw
that arc; R93 proved *hiding ALL FOUR* harms original source fidelity. Thus
R112 reshapes ONLY the two rearward actual ring meshes (.002/.003), never
deletes all four, never changes materials, never makes a 2D overlay and
never touches source-ranked asymmetric cast shoulders or true R109 fins.

This stage emits distinct REAL Blender cross sections to inspect against the
user's private original artwork, with the original camera and lower animation.
It is a speculative 3D reconstruction, NOT recovered Wube CAD.
"""
import argparse,hashlib,json,math,sys,struct
from pathlib import Path
from mathutils import Vector,Matrix
import bpy
HERE=Path(__file__).resolve().parent
if str(HERE) not in sys.path:sys.path.insert(0,str(HERE))
import physical_cut_separate_source_fins_r107 as core
from source_individual_hinge_casts_r110 import mesh_digest

REV="R112_actual_rear_iron_pressure_roll_asymmetric_3d_sections"
SOURCE_SCENE="broad_stepped_forged_shoulders"
SOURCE_SHA="43a6cb8b7327c96fa1c94ea725b2f09b10f1868812ac617768d6736227dd5bff"
ORIGINAL_SOURCE_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
ROLL="R08_black_exhaust_pressure_roll"
REAR=(ROLL+".002",ROLL+".003")
PRESERVE=(ROLL,ROLL+".001")
AXIS_Z=-.43
# label, rear ring .003 radial inset, y setback, angular lobe amplitude,
# whether to vary prior .002 rear ring as well. These are true real vertex edits.
CASES=(
 ("original_continuous_forgings_and_rolls",0.,0.,0.,False),
 ("rear_003_local_radial_recess",.135,-.095,.022,False),
 ("rear_003_strong_unequal_cast",.205,-.12,.060,False),
 ("rear_002_003_staggered_relief",.155,-.125,.048,True),
 ("rear_003_bespoke_deep_section",.26,-.075,.075,False),
)
FRAMES=(1,33)

def real_ring_sections(ob):
 xyz=[ob.matrix_world@v.co for v in ob.data.vertices]
 radial=[math.hypot(p.x,p.z-AXIS_Z) for p in xyz]
 return {"real_vertices":len(xyz),
  "real_polygons":len(ob.data.polygons),
  "radius_min_m":round(min(radial),6),
  "radius_max_m":round(max(radial),6),
  "radius_mean_m":round(sum(radial)/len(radial),6),
  "y_min_m":round(min(p.y for p in xyz),6),
  "y_max_m":round(max(p.y for p in xyz),6)}

def physically_reprofile_existing_roll(scene,name,radial_inset,axial_shift,lobing):
 ob=bpy.data.objects[name]
 if ob.type!="MESH" or ob.hide_render or ob.data.shape_keys:
    raise RuntimeError("R112 actual original dark pressure roll missing")
 mesh=ob.data
 if len(mesh.vertices)<16 or not mesh.materials:
    raise RuntimeError("R112 actual R08 rolled metal is not a physical mesh")
 before=[tuple(v.co) for v in mesh.vertices]
 start=real_ring_sections(ob)
 if start["radius_min_m"]<.5 or start["radius_max_m"]>3.5:
    raise RuntimeError("R112 pressure roll geometry bounds unexpected")
 camera_inv=scene.camera.matrix_world.inverted_safe()
 corners=[camera_inv@(ob.matrix_world@v.co) for v in mesh.vertices]
 zmin=min(c.z for c in corners);zmax=max(c.z for c in corners)
 if zmax-zmin<.02:raise RuntimeError("R112 roll is not an actual 3D volume")
 inverse=ob.matrix_world.inverted_safe()
 for idx,v in enumerate(mesh.vertices):
    world=ob.matrix_world@v.co
    theta=math.atan2(world.z-AXIS_Z,world.x)
    radial=math.hypot(world.x,world.z-AXIS_Z)
    depth=(corners[idx].z-zmin)/(zmax-zmin)
    front=max(0.,min(1.,depth))
    # An asymmetric, shallow STEPPED forging rather than a perfect uniform
    # circular band: continuous volume, still an open annular pressure roll.
    front_form=.22+.78*front**1.8
    handed=.5*math.sin(theta+.39)+.30*math.sin(2*theta-.61)
    # Reduce only the visible overbroad arch radius. Lobing shifts true metal
    # out of perfect rotational symmetry, not the source pixels or shader.
    shift_r=-radial_inset*front_form+lobing*front_form*handed
    shift_y=axial_shift*front_form*(1+.20*math.cos(theta+.52))
    rr=radial+shift_r
    if rr<.65:raise RuntimeError("R112 forged arc would cross original motor axis")
    new_world=Vector((rr*math.cos(theta),world.y+shift_y,
                      AXIS_Z+rr*math.sin(theta)))
    v.co=inverse@new_world
 mesh.update()
 if any(p.area<1.e-11 for p in mesh.polygons):
    raise RuntimeError("R112 source-specific real metal altered to degenerate faces")
 delta=max(math.dist(before[i],tuple(v.co)) for i,v in enumerate(mesh.vertices))
 if delta<.035:raise RuntimeError("R112 did not substantially reshape real metal")
 ob["R112_real_asymmetric_forged_roll"]=True
 ob["R112_original_source_visual_not_approved"]=True
 ob["R112_rear_roll_only_preserving_forward_rolls"]=True
 return {"name":name,"before":start,"after":real_ring_sections(ob),
       "max_real_vertex_displacement_m":round(delta,6),
       "no_original_source_bitmap_in_geometry":True,
       "original_source_working_shape_not_approved":True}

def orbit(scene,out):
 original=scene.camera
 data=original.data.copy()
 camera=bpy.data.objects.new("R112_TEMP_TRUE_3D_GEOMETRY_ORBIT",data)
 scene.collection.objects.link(camera)
 try:
    camera.matrix_world=Matrix.Rotation(math.radians(35),4,"Y")@original.matrix_world
    scene.camera=camera
    bpy.context.view_layer.update()
    core.render(scene,out)
 finally:
    scene.camera=original
    bpy.data.objects.remove(camera,do_unlink=True)
    bpy.data.cameras.remove(data)
    bpy.context.view_layer.update()

def validate(scene,allnames,camera,mat,lower,other,protected,changed):
 if {o.name for o in scene.objects}!=allnames:
    raise RuntimeError("R112 replaced or added unrelated engine objects")
 if tuple(float(x) for row in scene.camera.matrix_world for x in row)!=camera:
    raise RuntimeError("R112 moved authentic original source-calibrated camera")
 if core.scene_used_material_signature(scene)!=mat:
    raise RuntimeError("R112 changed shader instead of real 3D pressure roll geometry")
 if core.lower_animated_fin_digest(scene)!=lower:
    raise RuntimeError("R112 changed lower animated source fins")
 if mesh_digest(scene,changed)!=other:
    raise RuntimeError("R112 changed original forged side hinges, nozzle, fins or other real geometry")
 for name,coords in protected.items():
    o=bpy.data.objects[name]
    if tuple(tuple(v.co) for v in o.data.vertices)!=coords:
       raise RuntimeError("R112 damaged source-consistent front R08 pressure roll "+name)
 for name in changed:
    if not bpy.data.objects[name].get("R112_real_asymmetric_forged_roll"):
       raise RuntimeError("R112 reworked metal missing after editable 3D model reopen")

def run(source_dir,out):
 source=Path(source_dir).resolve()/(SOURCE_SCENE+".blend")
 if hashlib.sha256(source.read_bytes()).hexdigest()!=SOURCE_SHA:
    raise RuntimeError("R112 needs successful REAL R111 continuous source-fitted 3D cast model")
 out=Path(out).resolve();out.mkdir(parents=True,exist_ok=True)
 report={"revision":REV,"private_user_original_sprite_sha256":ORIGINAL_SOURCE_SHA,
   "private_original_artwork_exported":False,"source_shape_approval":False,
   "R93_all_four_pressure_roll_deletion_rejected":True,"cases":[]}
 for tag,inset,axial,lobe,two in CASES:
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene;scene.frame_set(1)
    if not scene.get("fsc_r111_revision") or scene.camera.data.type!="ORTHO":
       raise RuntimeError("R112 source traced real original hinge and camera absent")
    allnames={o.name for o in scene.objects}
    original_cam=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    materials=core.scene_used_material_signature(scene)
    motion=core.lower_animated_fin_digest(scene)
    protected={name:tuple(tuple(v.co) for v in bpy.data.objects[name].data.vertices)
               for name in PRESERVE}
    edited=(REAR if two else (REAR[1],)) if inset else ()
    immutable=mesh_digest(scene,edited)
    changed={}
    if inset:
       for name in edited:
          factor=.65 if name.endswith(".002") else 1.
          changed[name]=physically_reprofile_existing_roll(
             scene,name,inset*factor,axial*factor,lobe*factor)
    bpy.context.view_layer.update()
    validate(scene,allnames,original_cam,materials,motion,immutable,protected,edited)
    scene.render.resolution_x,scene.render.resolution_y=core.NATIVE
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
    frames={}
    for frame in FRAMES:
       scene.frame_set(frame)
       path=out/(tag+f"_source_frame{frame:02d}.png")
       core.render(scene,path)
       if path.stat().st_size<5000:raise RuntimeError("R112 actual Blender shape image missing")
       frames[str(frame)]=path.name
    scene.frame_set(1)
    oblique=out/(tag+"_real_3d_oblique.png")
    orbit(scene,oblique)
    validate(scene,allnames,original_cam,materials,motion,immutable,protected,edited)
    scene["fsc_r112_revision"]=REV
    scene["fsc_r112_source_visual_approved"]=False
    scene["fsc_r112_real_metal_case"]=tag
    saved=out/(tag+".blend")
    bpy.ops.wm.save_as_mainfile(filepath=str(saved))
    bpy.ops.wm.open_mainfile(filepath=str(saved))
    scene=bpy.context.scene
    validate(scene,allnames,original_cam,materials,motion,immutable,protected,edited)
    if saved.stat().st_size<100000:raise RuntimeError("R112 editable real Blender model missing")
    report["cases"].append({"name":tag,"genuine_3d_reshaped_rolls":changed,
      "forward_source_consistent_roll_meshes_unchanged":True,
      "original_r111_source_casts_and_refractory_and_fins_unchanged":True,
      "source_camera_frames":frames,"angled_3d_inspection":oblique.name,
      "editable_3d_blend":saved.name,
      "blend_sha256":hashlib.sha256(saved.read_bytes()).hexdigest(),
      "source_shape_not_approved":True})
    (out/"r112_physical_asymmetric_rear_roll_mesh_cases.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R112_GENUINE_REAR_PRESSURE_METAL_VERTEX_GEOMETRY_SAVED_REOPENED",tag,flush=True)
 print("R112_PHYSICAL_SHAPE_SWEEP_COMPLETE_PRIVATE_ORIGINAL_VISUAL_REVIEW_REQUIRED",flush=True)

if __name__=="__main__":
 p=argparse.ArgumentParser()
 p.add_argument("--r111-dir",required=True,type=Path)
 p.add_argument("--out",required=True,type=Path)
 a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
 run(a.r111_dir,a.out)
