"""R74: physical stepped refractory lap at the EXISTING R19 near/mid seam.

This is a reversible, separately saved hypothesis, not source approval.
Extend and curl original 24-vertex R19 INNER faces into staggered laps.
Preserve every original outer-face vertex and all unrelated 3D parts,
shaders, original 64-frame animation, and source-calibrated Blender camera.
No original Factorio image or recreated art is used in public CI.
"""
import argparse
from hashlib import sha256
import json,math,sys
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mathutils import Vector
from physical_stamped_refractory_candidate_r71 import (
    REVISION as R71_REV,verify_unmodified_protected)
from save_connected_cast_candidate_r66 import fin_digest_all_frames
from refractory_shingle_depth_r60 import original_tiles,actual_first_hits,NATIVE
from mount_occlusion_diagnostic_r51 import render

REVISION="R74_true_3d_inner_staggered_refractory_lap"
SOURCE_SHA="e5aea187ab7b970791ba955913cf134905447b21f8c3fc3527beef1db0ed4aaa"
AXIS_Z=-.43
LEVELS=(0.0,.55,1.)
MIN_THICKNESS=.014

def fold_original_inner_face(ob,original,kind,level):
    """Move only inner 12..23 vertices to form real raised lapped edges.

    The near row extends aft toward the offset mid-sheet front; the
    mid-sheet front curls toward the near row. Faces retain original
    24-vertex/face topology, including original radial backing surface.
    """
    if ob.type!="MESH" or len(ob.data.vertices)!=24 or ob.data.shape_keys:
        raise RuntimeError("R74 expects original true 3D R19 plate")
    count=0
    for idx,original_co in enumerate(original):
        v=ob.data.vertices[idx]
        v.co=original_co
        if idx<12:continue
        row=(idx%12)//3
        col=idx%3
        # The bands meet at original near aft -2.78 and mid mouth -2.75;
        # these are 3D lap hypotheses, not source-derived CAD dimensions.
        if kind=="near":
            shift_y={2:.010,3:.036}.get(row,0.)*level
            radial={2:.005,3:.010}.get(row,0.)*level
            if col==1:radial+=({2:.009,3:.026}.get(row,0.))*level
        else:
            shift_y={0:-.020,1:-.006}.get(row,0.)*level
            radial={0:.009,1:.003}.get(row,0.)*level
            if col==1:radial+=({0:.020,1:.007}.get(row,0.))*level
        if not shift_y and not radial:continue
        x,y,z=original_co
        radius=math.hypot(x,z-AXIS_Z)
        if radius<.25:raise RuntimeError("R74 invalid original R19 radius")
        scale=(radius-radial)/radius
        if scale<=0:raise RuntimeError("R74 folded inner sheet crossed axis")
        v.co=(x*scale,y+shift_y,AXIS_Z+(z-AXIS_Z)*scale)
        count+=1
    ob.data.update()
    if any((ob.data.vertices[j].co-Vector(original[j])).length>1e-6
           for j in range(12)):
        raise RuntimeError("R74 changed source model original 12-vertex back")
    thickness=[]
    for j in range(12):
        outside=ob.data.vertices[j].co
        inside=ob.data.vertices[j+12].co
        gap=(math.hypot(outside.x,outside.z-AXIS_Z)-
             math.hypot(inside.x,inside.z-AXIS_Z))
        thickness.append(gap)
        if gap<MIN_THICKNESS:
            raise RuntimeError("R74 bent original plate inside-out")
    # Polygon faces must remain real nondegenerate 3D surfaces.
    if any(face.area<1e-9 for face in ob.data.polygons):
        raise RuntimeError("R74 made a degenerate original refractory face")
    return count,min(thickness)

def capture(source,out):
    source=Path(source).resolve()
    if sha256(source.read_bytes()).hexdigest()!=SOURCE_SHA:
        raise RuntimeError("R74 requires exact verified saved R71 +.075 scene")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    if scene.get("fsc_r71_revision")!=R71_REV or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R74 wrong saved original-camera physical candidate")
    scene.frame_set(1)
    camera=tuple(float(v) for row in scene.camera.matrix_basis for v in row)
    animation=fin_digest_all_frames(scene)
    materials={m.name:tuple(m.diffuse_color) for m in bpy.data.materials}
    names={ob.name for ob in scene.objects}
    tiles,_=original_tiles(scene)
    protected={}
    for ob in scene.objects:
        if ob.type=="MESH" and ob.name not in tiles and (
            ob.name.startswith(("R25_OUTER_SKID_","R49_BESPOKE_CAST_","R64_"))
            or ob.name in ("R11_OPEN_DEEP_REFRACTORY_THROAT",
                           "vanilla_reference_bell_bronzed_rolled_bell",
                           "HYDROGEN_curved_pressure_hull")):
            protected[ob.name]=[tuple(v.co) for v in ob.data.vertices]
    old_settings=(scene.render.resolution_x,scene.render.resolution_y,
                  scene.render.resolution_percentage,scene.render.filepath,
                  scene.render.image_settings.file_format,
                  scene.render.image_settings.color_mode,scene.cycles.samples)
    out=Path(out).resolve();out.mkdir(parents=True,exist_ok=True)
    report={"revision":REVISION,"actual_original_user_sprite_available":False,
            "original_sprite_geometry_approved":False,
            "saved_R71_source_sha256":SOURCE_SHA,
            "no_camera_shader_fins_mounts_guards_or_original_outer_faces_changed":True,
            "no_new_scene_objects_or_original_sprite_in_artifacts":True,
            "candidate_steps":[]}
    for level in LEVELS:
        changed=0;minimum=[]
        for name,(ob,kind,points) in tiles.items():
            count,gap=fold_original_inner_face(ob,points,kind,level)
            changed+=count;minimum.append(gap)
        verify_unmodified_protected(scene,camera,animation,materials,names,protected)
        scene.frame_set(1)
        bpy.context.view_layer.update()
        hits=actual_first_hits(scene)
        label="fold_%03d"%round(100*level)
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=10
        scene.frame_set(1)
        render(scene,out/(label+"_frame01.png"))
        scene.frame_set(33)
        render(scene,out/(label+"_frame33.png"))
        target=None
        if level:
            scene["fsc_r74_revision"]=REVISION
            scene["fsc_r74_existing_plate_lap_strength"]=level
            scene["fsc_r74_original_sprite_approved"]=False
            scene.frame_set(1)
            target=out/(label+".blend")
            bpy.ops.wm.save_as_mainfile(filepath=str(target))
            if target.stat().st_size<100000:
                raise RuntimeError("R74 editable real 3D candidate was not saved")
            bpy.ops.wm.open_mainfile(filepath=str(target))
            scene=bpy.context.scene
            verify_unmodified_protected(scene,camera,animation,materials,names,protected)
            for name,(ob,kind,pts) in tiles.items():
                actual=bpy.data.objects[name]
                if min((actual.data.vertices[i].co-Vector(pts[i])).length
                       for i in (18,19,20) if kind=="near"
                       )<1e-5 and kind=="near":
                    raise RuntimeError("R74 original near-mouth lap did not persist")
        report["candidate_steps"].append({
            "physical_lap_strength":level,
            "inner_3d_vertices_moved":changed,
            "minimum_original_sheet_radial_thickness":min(minimum),
            "model_first_hit_sampled_original_camera":hits,
            "source_camera_native_frame01":label+"_frame01.png",
            "source_camera_native_frame33":label+"_frame33.png",
            "saved_reopened_candidate_blend":target.name if target else None,
            "saved_reopened_candidate_sha256":sha256(target.read_bytes()).hexdigest() if target else None,
            "source_meshes_and_animation_verified":True})
        if target:
            bpy.ops.wm.open_mainfile(filepath=str(source))
            scene=bpy.context.scene
            tiles,_=original_tiles(scene)
    if sha256(source.read_bytes()).hexdigest()!=SOURCE_SHA:
        raise RuntimeError("R74 changed prior editable reference model on disk")
    (out/"r74_existing_refractory_lapped_form.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R74_REAL_NATIVE_3D_REFRACTORY_LAP_CANDIDATES_PASS",flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-blend",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    capture(a.source_blend,a.out)
