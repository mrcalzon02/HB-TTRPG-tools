"""R52: measure mount-only inverse-projection against three observed castings.

R51 proved R49 root castings are ~50-120 native pixels too far upstream.
Starting from the R50-D unsaved hypothesis, physically reshape ONLY the
existing three distinct editable R49 casting meshes to the manually measured
silhouette envelopes of original source frame 00. Fin geometry is kept at
R50-D for comparison but NEVER corrected or saved as part of this exercise.
All transformations remain on actual nonzero-depth 3D vertices; the camera,
lens, lamps, nozzle, fin topology, and original source pixels are untouched.
This is a temporary BBOX calibration, NOT an accepted mounting geometry:
visible chamfered casting profiles, paired center lugs and actual connection
to upper fin roots require subsequent separate approval.
"""
import argparse
from hashlib import sha256
import json
from pathlib import Path
import sys

ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path: sys.path.insert(0,ROOT)
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

from fin_mount_geometry_sweep_r50 import FIN_PREFIX,MOUNT_PREFIX,UPPER,MAIN
from mount_occlusion_diagnostic_r51 import (
    NATIVE, deform_r50_d, projected_bounds, sample_first_hits, render,
)

REVISION="R52_three_distinct_mount_envelopes_on_true_3D_castings"
# Source frame 00 approx visible cast outlines, original 264x542 pixel space.
# Right outer, broad central injector bridge, left swept cover, respectively.
# These are manually drawn calibration ranges, not an alpha mask or CAD.
MOUNT_TARGETS={
    1:(166.,313.,220.,356.),
    2:(95.,311.,163.,339.),
    3:(27.,314.,90.,358.),
}
PALE_EXISTING_CAST="R15_weathered_centerline_injector_cast"

def fit_projected_cast(scene,obj,target):
    """Reshape the real 3D cast, retaining each vertex' original view depth."""
    measured=projected_bounds(scene,obj.name)
    mx0,my0,mx1,my1=measured
    tx0,ty0,tx1,ty1=target
    if mx1-mx0<5 or my1-my0<5:
        raise RuntimeError("R52 existing mount is not a projected 3D casting")
    sx=(tx1-tx0)/(mx1-mx0)
    sy=(ty1-ty0)/(my1-my0)
    if not (.3<sx<3. and .3<sy<3.):
        raise RuntimeError("R52 mount inverse projection implausibly scaled")
    cx=(mx0+mx1)*.5;cy=(my0+my1)*.5
    tcx=(tx0+tx1)*.5;tcy=(ty0+ty1)*.5
    camera=scene.camera
    frame=camera.data.view_frame(scene=scene)
    ux=(max(p.x for p in frame)-min(p.x for p in frame))/NATIVE[0]
    uy=(max(p.y for p in frame)-min(p.y for p in frame))/NATIVE[1]
    world_inv=obj.matrix_world.inverted()
    for vertex in obj.data.vertices:
        world=obj.matrix_world@vertex.co
        p=world_to_camera_view(scene,camera,world)
        px=float(p.x)*NATIVE[0];py=(1.-float(p.y))*NATIVE[1]
        wanted_x=tcx+(px-cx)*sx;wanted_y=tcy+(py-cy)*sy
        delta_camera=Vector(((wanted_x-px)*ux,-(wanted_y-py)*uy,0.))
        translated=world+(camera.matrix_world.to_quaternion()@delta_camera)
        vertex.co=world_inv@translated
    obj.data.update()
    bpy.context.view_layer.update()
    actual=projected_bounds(scene,obj.name)
    if max(abs(a-b) for a,b in zip(actual,target))>1.0:
        raise RuntimeError("R52 physical casting failed source native projection")
    return {"before":measured,"target":list(target),"actual":actual,
            "horizontal_inset_scale":round(sx,4),
            "vertical_inset_scale":round(sy,4)}

def joint_gap_world(mount,fin):
    """Minimum spatial clearance, not an image-space attachment assertion."""
    roots=list(fin.data.vertices[:11])+list(fin.data.vertices[110:121])
    return min(((mount.matrix_world@v.co)-(fin.matrix_world@f.co)).length
               for v in mount.data.vertices for f in roots)

def run(output):
    path=output/"test-04-vanilla-approx"/"scenes"/"test-04-vanilla-approx.blend"
    if not path.is_file():
        raise RuntimeError("R52 needs actual existing R49 .blend")
    disk_sha=sha256(path.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(path))
    scene=bpy.context.scene
    from vanilla_bespoke_fin_mounts_r49 import REVISION as R49_REV
    if scene.get("fsc_r49_revision")!=R49_REV or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R52 refuses non-source-validated R49 reference")
    scene.frame_set(1)
    camera_before=tuple(float(c) for row in scene.camera.matrix_world for c in row)
    root_names={o.name for o in scene.objects}
    pale=bpy.data.materials.get(PALE_EXISTING_CAST)
    if pale is None or not pale.use_nodes:
        raise RuntimeError("R52 can't replace original cast with unverified color")
    original_render=(scene.render.resolution_x,scene.render.resolution_y,
                     scene.render.resolution_percentage,scene.render.filepath,
                     scene.render.image_settings.file_format,
                     scene.render.image_settings.color_mode,
                     scene.cycles.samples,scene.frame_current)
    objects={};originals={};parameters={};materials={}
    for i in UPPER:
        name=f"{FIN_PREFIX}{i:02d}"
        ob=bpy.data.objects.get(name)
        if ob is None or ob.data.shape_keys:
            raise RuntimeError("R52 must preserve original upper fin mesh")
        objects[name]=ob
        originals[name]=tuple(tuple(v.co) for v in ob.data.vertices)
        parameters[i]=(float(ob.data.vertices[0].co.y),
                       float(ob.data.vertices[99].co.y))
    for i in MAIN:
        name=f"{MOUNT_PREFIX}{i:02d}"
        ob=bpy.data.objects.get(name)
        if ob is None or ob.type!="MESH" or len(ob.data.materials)!=1:
            raise RuntimeError("R52 missing the three actual R49 source castings")
        objects[name]=ob
        originals[name]=tuple(tuple(v.co) for v in ob.data.vertices)
        materials[name]=ob.data.materials[0]
    dest=output/"test-04-vanilla-approx"/"mount-shape-calibration-r52"
    dest.mkdir(parents=True,exist_ok=True)
    data={"revision":REVISION,"source_native_size":list(NATIVE),
          "source_bboxes_are_manual_approximate_observations":True,
          "physical_3D_cast_vertices_not_2D_overlay":True,
          "reuses_existing_three_distinct_mounts":True,
          "changes_only_unsaved_3D_meshes_and_existing_shader_slots":True,
          "original_sprite_not_in_artifact":True,
          "original_blend_sha256":disk_sha,
          "not_approved_to_promote_before_attachment_repair":True}
    try:
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.cycles.samples=8
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        deform_r50_d(objects,originals,parameters)
        data["D_before_fit"]={str(i):projected_bounds(
            scene,f"{MOUNT_PREFIX}{i:02d}") for i in MAIN}
        data["D_joint_clearance_before"]={str(i):round(joint_gap_world(
            objects[f"{MOUNT_PREFIX}{i:02d}"],
            objects[f"{FIN_PREFIX}{i:02d}"]),5) for i in MAIN}
        render(scene,dest/"before_mount_only_fit.png")
        data["mount_cast_physical_fit"]={}
        for i in MAIN:
            ob=objects[f"{MOUNT_PREFIX}{i:02d}"]
            data["mount_cast_physical_fit"][str(i)]=fit_projected_cast(
                scene,ob,MOUNT_TARGETS[i])
            ob.data.materials[0]=pale
        data["mount_bbox_after"]={str(i):projected_bounds(
            scene,f"{MOUNT_PREFIX}{i:02d}") for i in MAIN}
        data["joint_clearance_after"]={str(i):round(joint_gap_world(
            objects[f"{MOUNT_PREFIX}{i:02d}"],
            objects[f"{FIN_PREFIX}{i:02d}"]),5) for i in MAIN}
        data["first_hits_after"],data["first_hit_examples_after"]=sample_first_hits(scene)
        render(scene,dest/"three_source_envelope_castings_mounts_only.png")
    finally:
        for name,points in originals.items():
            ob=objects[name]
            for v,p in zip(ob.data.vertices,points): v.co=p
            ob.data.update()
        for name,material in materials.items():
            objects[name].data.materials[0]=material
        (scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.render.filepath,
         scene.render.image_settings.file_format,
         scene.render.image_settings.color_mode,
         scene.cycles.samples,frame)=original_render
        scene.frame_set(frame)
        bpy.context.view_layer.update()
    data["verified_restore"]=(
        all(all(max(abs(a-b) for a,b in zip(v.co,p))<1.e-6
                for v,p in zip(objects[name].data.vertices,points))
            for name,points in originals.items())
        and all(objects[name].data.materials[0]==m for name,m in materials.items())
        and {o.name for o in scene.objects}==root_names
        and tuple(float(c) for row in scene.camera.matrix_world for c in row)==camera_before
        and sha256(path.read_bytes()).hexdigest()==disk_sha)
    if not data["verified_restore"]:
        raise RuntimeError("R52 failed unsaved native scene restoration")
    (dest/"three-casting-geometry-fit.json").write_text(
        json.dumps(data,indent=2)+"\n",encoding="utf8")
    print("R52_MOUNT_ONLY_3D_PROJECTION_BOUNDS",
          json.dumps(data["mount_bbox_after"]),flush=True)
    print("R52_MOUNT_TO_FIN_CONTACT_GAPS",
          json.dumps(data["joint_clearance_after"]),flush=True)
    print("R52_SCENE_UNCHANGED",data["verified_restore"],flush=True)

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    run(args.output.resolve())
