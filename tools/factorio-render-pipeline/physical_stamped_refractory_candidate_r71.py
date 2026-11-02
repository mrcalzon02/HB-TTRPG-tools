"""R71: real stamped refractory plate FORM, not more motion or flat art.

Physical 3D candidate-only revision of R66's eighty EXISTING 24-vertex
R19 refractory near/mid plates. The original Factorio sprite, NOT an
internet illustration or generated render, describes overlapping stepped,
longitudinally shaped refractory. R60-62 established a uniform radial offset
fails to reproduce that shape. So the upper surface is genuinely formed
into a crosswise crown and rounded staggered leading lip in REAL 3D, while
the rear skin, material, axes, open throat, fins, cups, mounts and rig are
unchanged. This must be reviewed privately against the ORIGINAL sprite
before any production acceptance.

Two geometry amplitudes are independently saved as .blend and rendered,
plus untouched R66 at exactly the original saved camera.
"""
import argparse
from hashlib import sha256
import json
import math
from pathlib import Path
import sys
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mathutils import Vector
from fin_mount_geometry_sweep_r50 import MAIN,FIN_PREFIX,MOUNT_PREFIX
from mount_shape_fit_r52 import joint_gap_world
from mounted_fin_candidate_r55 import MAX_ROOT_CONNECTION
from hanging_fin_candidate_r58 import REVISION as R58_REV
from save_connected_cast_candidate_r66 import (
    REVISION as R66_REV,fin_digest_all_frames,verify66)
from refractory_shingle_depth_r60 import (
    original_tiles,actual_first_hits,LINER,NATIVE)
from mount_occlusion_diagnostic_r51 import render

REVISION="R71_existing_80_shingle_bespoke_stamped_physical_thickness"
SOURCE_R66_SHA="a1db423d69c1db0373eefc1b551966f15d6906f3e61dcce8d67f90753cc59547"
AXIS_Z=-.43
ROI=[48,395,218,512]
# 0 baseline, two visible-surface real form hypotheses. Amplitudes are
# physical units, not any claim to have solved the source hidden geometry.
CANDIDATES=(0.,.042,.075)
THICKNESS_MIN=.014
# Keep the original back skin immobile. Front surface is "inward" into the
# open bore; the original near tile front radius is slightly smaller than back
# and therefore stays physically separated from the fixed back surface.
def form_existing_plate(ob,original,profile_amplitude,kind):
    if ob.type!="MESH" or len(ob.data.vertices)!=24 or len(ob.data.polygons)<12:
        raise RuntimeError("R71 requires 24-vertex true original R19 plate mesh")
    if ob.data.shape_keys or ob.animation_data:
        raise RuntimeError("R71 refuses moving or newly sculpted fake rigid part")
    if not (0<=profile_amplitude<=.08):
        raise RuntimeError("R71 amplitude must remain limited")
    previous=[]
    for idx,old in enumerate(original):
        x,y,z=old
        r=math.hypot(x,z-AXIS_Z)
        if r<=.2:raise RuntimeError("R71 invalid original R19 refractory radial vertex")
        if idx>=12:  # preserve real rear skin exact
            ob.data.vertices[idx].co=old
            continue
        row=(idx%12)//3
        col=idx%3
        u=row/3
        cross=(-1,0,1)[col]
        # Actual closed sheet: a broad physical crown, curled front lip and
        # subdued bevel toward both side edges. Varies by plate type, not
        # uniform outward shift (R60 was physically incorrect and rejected).
        crown=0.18+0.55*(1-cross*cross)
        mouth_lip=max(0.,1.-u/.40)**2
        aft_return=max(0.,(u-.65)/.35)**2
        # Nonidentical near and offset mid shingles; taper the forward lip
        # before the throat shoulder; no new parts or arbitrary actuators.
        shape=profile_amplitude*(crown
            +(0.35 if kind=="near" else 0.24)*mouth_lip
            -0.12*aft_return)
        # radial reduction goes into the open cone, not inside hidden liner
        # where prior R60 proof lost all physically rendered plate faces.
        target=r-shape
        if target<.25 or not math.isfinite(target):
            raise RuntimeError("R71 recessed throat radius would collapse")
        factor=target/r
        ob.data.vertices[idx].co=(x*factor,y,AXIS_Z+(z-AXIS_Z)*factor)
        previous.append((r,target))
    ob.data.update()
    for j in range(12):
        front=ob.data.vertices[j].co
        back=ob.data.vertices[j+12].co
        radial_diff=math.hypot(back.x,back.z-AXIS_Z)-math.hypot(front.x,front.z-AXIS_Z)
        if radial_diff<THICKNESS_MIN:
            raise RuntimeError("R71 physically inverted original refractory plate thickness")
    return {
        "front_3d_vertices_changed":sum(
            (ob.data.vertices[i].co-Vector(original[i])).length>1e-5
            for i in range(12)),
        "original_back_surface_12_vertices_preserved":all(
             (ob.data.vertices[i].co-Vector(original[i])).length<1e-6
             for i in range(12,24)),
        "minimum_crown_to_back_real_thickness":min(
            math.hypot(ob.data.vertices[j+12].co.x,ob.data.vertices[j+12].co.z-AXIS_Z)-
            math.hypot(ob.data.vertices[j].co.x,ob.data.vertices[j].co.z-AXIS_Z)
            for j in range(12))}
def verify_unmodified_protected(scene,cam_key,motion_digest,mat_digest,original_names,other_meshes):
    if scene.get("fsc_r66_revision")!=R66_REV or scene.get("fsc_r58_revision")!=R58_REV:
        raise RuntimeError("R71 source candidate scene revision changed")
    if tuple(float(v) for row in scene.camera.matrix_basis for v in row)!=cam_key:
        raise RuntimeError("R71 original orthographic camera moved")
    if fin_digest_all_frames(scene)!=motion_digest:
        raise RuntimeError("R71 modified original 64-frame 3D fin motion or geometry")
    if {ob.name for ob in scene.objects}!=original_names:
        raise RuntimeError("R71 added/removes unauthorized physical geometry")
    if bpy.data.objects[LINER].get("R11_open_no_endcaps")!=True:
        raise RuntimeError("R71 accidentally closed the original deep cone")
    for i in MAIN:
        if joint_gap_world(bpy.data.objects[f"{MOUNT_PREFIX}{i:02d}"],
                           bpy.data.objects[f"{FIN_PREFIX}{i:02d}"])>MAX_ROOT_CONNECTION:
            raise RuntimeError("R71 detached distinct upper fin/casting anchor")
    current_materials={m.name:tuple(m.diffuse_color) for m in bpy.data.materials}
    if current_materials!=mat_digest:
        raise RuntimeError("R71 changed pigment instead of correcting physical geometry")
    if other_meshes:
        for name,indices_and_coords in other_meshes.items():
            ob=bpy.data.objects[name]
            if len(ob.data.vertices)!=len(indices_and_coords):
                raise RuntimeError("R71 damaged protected shell, cup or hull topology")
            if any((v.co-Vector(x)).length>1.e-6
                   for v,x in zip(ob.data.vertices,indices_and_coords)):
                raise RuntimeError("R71 altered unrelated real 3D mesh: "+name)
    return True

def run(source,out):
    source=Path(source).resolve()
    if sha256(source.read_bytes()).hexdigest()!=SOURCE_R66_SHA:
        raise RuntimeError("R71 requires exact previously saved and reopened R66 file")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    if scene.get("fsc_r66_revision")!=R66_REV or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R71 wrong source edited 3D rig")
    scene.frame_set(1)
    camera=tuple(float(v) for row in scene.camera.matrix_basis for v in row)
    motion=fin_digest_all_frames(scene)
    mat_digest={m.name:tuple(m.diffuse_color) for m in bpy.data.materials}
    old_names={ob.name for ob in scene.objects}
    tiles,mat_assignments=original_tiles(scene)
    protected={}
    for ob in scene.objects:
        if ob.type!="MESH" or ob.name in tiles:
            continue
        # Verify all unrelated 3D surfaces unmodified: both cupped covers,
        # mounting castings, upper stays, open liner and bell panels.
        if (ob.name.startswith(("R25_OUTER_SKID_","R49_BESPOKE_CAST_","R64_"))
            or ob.name in (LINER,"vanilla_reference_bell_bronzed_rolled_bell",
                           "HYDROGEN_curved_pressure_hull")):
            protected[ob.name]=[tuple(v.co) for v in ob.data.vertices]
    out=Path(out).resolve();out.mkdir(parents=True,exist_ok=True)
    report={"revision":REVISION,"source_R66_SHA256":SOURCE_R66_SHA,
            "original_user_sprite_reloaded":False,
            "visual_source_approval":False,
            "originals_only_source_review_required":True,
            "physical_form_not_motion_target":True,
            "three_distinct_cast_mounts_unchanged":True,
            "source_camera_lights_unchanged":True,
            "original_source_not_in_artifacts":True,
            "candidate_profiles":[]}
    source_render_settings=(scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.render.filepath,
         scene.render.image_settings.file_format,
         scene.render.image_settings.color_mode,scene.cycles.samples,scene.frame_current)
    for amplitude in CANDIDATES:
        # IMPORTANT each candidate starts from original saved source geometry.
        total=0;min_gaps=[];changed={}
        for name,(ob,kind,points) in tiles.items():
            data=form_existing_plate(ob,points,amplitude,kind)
            changed[name]=data
            total+=int(data["front_3d_vertices_changed"])
            min_gaps.append(data["minimum_crown_to_back_real_thickness"])
            if not data["original_back_surface_12_vertices_preserved"]:
                raise RuntimeError("R71 damaged physical backface of stamped plate")
        verify_unmodified_protected(scene,camera,motion,mat_digest,old_names,protected)
        first=actual_first_hits(scene)
        name="source_refractory_form_%03d"%(round(amplitude*1000))
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=10
        scene.frame_set(1)
        render(scene,out/(name+"_01.png"))
        # Frame 33 to show fixed cast/geometry remains while lower fins move.
        scene.frame_set(33)
        render(scene,out/(name+"_33.png"))
        saved_blend=None
        if amplitude>0:
            scene["fsc_r71_revision"]=REVISION
            scene["fsc_r71_refractory_emboss_amplitude"]=amplitude
            scene["fsc_r71_original_sprite_approved"]=False
            scene.frame_set(1)
            saved_blend=out/(name+".blend")
            bpy.ops.wm.save_as_mainfile(filepath=str(saved_blend))
            if saved_blend.stat().st_size<100000:
                raise RuntimeError("R71 candidate physical Blender save failed")
            # Actually reopen candidate, not just claim in-memory validity.
            bpy.ops.wm.open_mainfile(filepath=str(saved_blend))
            scene=bpy.context.scene
            verify_unmodified_protected(scene,camera,motion,mat_digest,old_names,protected)
            for part,(o,kind,points) in tiles.items():
                live=bpy.data.objects[part]
                if min((live.data.vertices[i].co-Vector(points[i])).length
                       for i in range(12))<1e-6:
                    raise RuntimeError("R71 did not save physically sculpted original plate: "+part)
        report["candidate_profiles"].append({
            "original_plate_r19_physical_front_crown_amplitude":amplitude,
            "native_render_frame_1":name+"_01.png",
            "native_render_frame_33":name+"_33.png",
            "saved_reopened_editable_candidate":saved_blend.name if saved_blend else None,
            "saved_candidate_sha256":sha256(saved_blend.read_bytes()).hexdigest() if saved_blend else None,
            "actual_original_80_plate_surfaces_modified":sum(
                  1 for x in changed.values() if x["front_3d_vertices_changed"]>0),
            "real_vertices_moved":total,
            "least_3d_plate_radial_thickness":min(min_gaps),
            "actual_source_camera_ray_hit_geometry":first,
            "original_back_skin_preserved":True,
            "camera_3_mounts_lower_animation_and_guards_verified":True})
        print("R71_REAL_PHYSICAL_REFRACTORY_CROWNS",amplitude,
              "moved",total,"R19_firsthits",
              first["physical_near_tile_first_hits"]+
              first["physical_mid_tile_first_hits"],flush=True)
        if saved_blend:
            # Reopen original scene for the next variant and exact baseline.
            bpy.ops.wm.open_mainfile(filepath=str(source))
            scene=bpy.context.scene
            tiles,mat_assignments=original_tiles(scene)
    if sha256(source.read_bytes()).hexdigest()!=SOURCE_R66_SHA:
        raise RuntimeError("R71 modified original saved R66 Blender file")
    report["original_R66_unchanged"]=True
    (out/"r71-physical-stamped-refractory-report.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R71_3D_STAMPED_SHINGLE_EDITABLE_SCENES_AND_REAL_RENDERS_PASS",flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-blend",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.source_blend,a.out)
