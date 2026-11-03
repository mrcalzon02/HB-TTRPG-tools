"""R111 — actual Blender object-ownership diagnostic for the WRONG dark collar.

The Factorio original sprite is the ONLY shape reference. User criticism:
the modeled upper-fin hinge network remains too regular and the smooth dark
arch under the mounting castings is unlike the irregular source housings.

Instead of blindly deleting or stretching other real 3D parts, isolate the
specific already-existing Blender mesh families that could be drawing that
arch. All original geometry and camera/motion/materials remain unchanged.
The ONLY per-candidate state change is .hide_render of named actual objects.
This stage is diagnostic and CANNOT count as visual source approval.
Never upload private Wube sprite data to public artifacts.
"""
import argparse,hashlib,json,sys
from pathlib import Path
import bpy
from mathutils import Matrix
HERE=Path(__file__).resolve().parent
if str(HERE) not in sys.path:sys.path.insert(0,str(HERE))
import physical_cut_separate_source_fins_r107 as core
from source_individual_hinge_casts_r110 import mesh_digest

SOURCE_NAME="staggered_lower_heel"
SOURCE_SHA="0360eefc7cbe3ae970f320edbee8143858d03b7bfa0c4a0483f0fea07c7e8607"
REV="R111_visible_collar_actual_3d_mesh_ownership_diagnostic"
GROUPS={
 "black_pressure_roll":("R08_black_exhaust_pressure_roll",),
 "subchamber_cast_bands":("R08_subchamber_cast_band",),
 "external_machined_band":("external_machined_pressure_band",),
 "forward_bellows_collars":("R15_bellows_end_collar_port_0",
                              "R15_bellows_end_collar_port_1",
                              "R15_bellows_end_collar_starboard_0",
                              "R15_bellows_end_collar_starboard_1"),
}
CASES=(
 ("unaltered_R110_source_mounted_meshes",()),
 ("isolate_black_pressure_roll",("black_pressure_roll",)),
 ("isolate_subchamber_cast_bands",("subchamber_cast_bands",)),
 ("isolate_external_machined_band",("external_machined_band",)),
 ("isolate_forward_bellows_collars",("forward_bellows_collars",)),
 ("isolate_pressure_roll_and_subchamber",("black_pressure_roll","subchamber_cast_bands")),
)
FRAMES=(1,33)

def matching(group):
 selected=[]
 for stem in GROUPS[group]:
    selected.extend(o for o in bpy.context.scene.objects if
       o.type=="MESH" and (o.name==stem or o.name.startswith(stem+".")))
 return sorted(set(selected),key=lambda x:x.name)

def orbit(scene,path):
 source=scene.camera
 clone_data=source.data.copy()
 temporary=bpy.data.objects.new("R111_TEMP_REAL_3D_CAMERA",clone_data)
 scene.collection.objects.link(temporary)
 try:
    temporary.matrix_world=Matrix.Rotation(.6108652382,4,"Y")@source.matrix_world
    scene.camera=temporary
    bpy.context.view_layer.update()
    core.render(scene,path)
 finally:
    scene.camera=source
    bpy.data.objects.remove(temporary,do_unlink=True)
    bpy.data.cameras.remove(clone_data)
    bpy.context.view_layer.update()

def validate(scene,names,camera,materials,motion,mesh,prior_visibility,hidden):
 if {o.name for o in scene.objects}!=names:
    raise RuntimeError("R111 ownership diagnostic modified original 3D object set")
 if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=camera:
    raise RuntimeError("R111 diagnostic modified the original source camera")
 if core.scene_used_material_signature(scene)!=materials:
    raise RuntimeError("R111 diagnostic modified actual source-model material")
 if core.lower_animated_fin_digest(scene)!=motion:
    raise RuntimeError("R111 modified lower original 64-frame fin motion")
 if mesh_digest(scene)!=mesh:
    raise RuntimeError("R111 moved actual nozzle/casting/fin mesh geometry")
 for o in scene.objects:
    expected=True if o.name in hidden else prior_visibility[o.name]
    if o.hide_render!=expected:
       raise RuntimeError("R111 hid wrong model owner "+o.name)

def run(source_dir,out):
 out=Path(out).resolve();out.mkdir(parents=True,exist_ok=True)
 source=Path(source_dir).resolve()/(SOURCE_NAME+".blend")
 if hashlib.sha256(source.read_bytes()).hexdigest()!=SOURCE_SHA:
    raise RuntimeError("R111 requires exact verified R110 physically modified Blender source scene")
 report={"revision":REV,"original_sprite_exported":False,
         "original_source_visual_geometry_not_yet_approved":True,
         "only_hide_existing_object_for_owner_diagnostics":True,
         "source_blend_sha256":SOURCE_SHA,
         "candidates":[]}
 for tag,groups in CASES:
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene;scene.frame_set(1)
    if not scene.get("fsc_r110_revision") or scene.camera.data.type!="ORTHO":
       raise RuntimeError("R111 original R110 native source rig absent")
    names={o.name for o in scene.objects}
    camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    materials=core.scene_used_material_signature(scene)
    mesh=mesh_digest(scene)
    motion=core.lower_animated_fin_digest(scene)
    prior_visibility={o.name:o.hide_render for o in scene.objects}
    hidden={}
    for group in groups:
       candidates=matching(group)
       if not candidates:
          raise RuntimeError("R111 original modeled collar geometry family absent "+group)
       changed=[]
       for obj in candidates:
          if not obj.hide_render:
             obj.hide_render=True
             changed.append(obj.name)
             hidden[obj.name]=group
       if not changed:
          raise RuntimeError("R111 expected visible real shape not already hidden: "+group)
    bpy.context.view_layer.update()
    validate(scene,names,camera,materials,motion,mesh,prior_visibility,hidden)
    scene.render.resolution_x,scene.render.resolution_y=core.NATIVE
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
    frames={}
    for frame in FRAMES:
       scene.frame_set(frame)
       target=out/(tag+f"_native_frame{frame:02d}.png")
       core.render(scene,target)
       if target.stat().st_size<5000:
          raise RuntimeError("R111 genuine isolated-3D object owner rendered no image")
       frames[str(frame)]=target.name
    scene.frame_set(1)
    angle=out/(tag+"_true_3d_oblique.png")
    orbit(scene,angle)
    validate(scene,names,camera,materials,motion,mesh,prior_visibility,hidden)
    scene["fsc_r111_diagnostic_only"]=True
    scene["fsc_r111_object_ownership_case"]=tag
    scene["fsc_r111_not_approved_for_visual_source_fidelity"]=True
    target=out/(tag+".blend")
    bpy.ops.wm.save_as_mainfile(filepath=str(target))
    bpy.ops.wm.open_mainfile(filepath=str(target))
    scene=bpy.context.scene
    validate(scene,names,camera,materials,motion,mesh,prior_visibility,hidden)
    if target.stat().st_size<100000:
       raise RuntimeError("R111 real editable Blender owner isolation not preserved")
    report["candidates"].append({
      "name":tag,"hidden_3d_owner_objects":hidden,
      "real_native_frame_1_and_33":frames,
      "real_geometry_oblique_view":angle.name,
      "editable_3d_scene":target.name,
      "scene_blend_sha256":hashlib.sha256(target.read_bytes()).hexdigest(),
      "source_fidelity_approved":False,
      "all_actual_meshes_and_original_camera_unmodified":True})
    (out/"r111_real_ring_collar_mesh_owner_diagnostics.json").write_text(
      json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R111_ACTUAL_3D_GEOMETRY_OWNER_ISOLATED_AND_REOPEN_VERIFIED",tag,flush=True)
 print("R111_OWNER_IDENTIFICATION_ONLY_NO_NEW_FAKE_3D_GEOMETRY_NO_VISUAL_APPROVAL",flush=True)

if __name__=="__main__":
 p=argparse.ArgumentParser()
 p.add_argument("--r110-dir",required=True,type=Path)
 p.add_argument("--out",required=True,type=Path)
 a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
 run(a.r110_dir,a.out)
