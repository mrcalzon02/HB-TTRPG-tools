"""R56 physical fin exposure sweep from the VERIFIED R55 mounted .blend.

The original source shows 3 long heat-graded fins hanging clearly IN FRONT
of the open dark nozzle. R55 now has three genuine contact points but the
existing bell still obscures the actual R21 surfaces. Hold bespoke castings,
both center lugs, camera, rings, original lower animation and physical root
points FIXED. Only curve the free surface of upper five heat fins radially,
in real 3D, across a measurable sweep. Render source-native 264x542 and
measure ACTUAL first-hit faces, not just projected bounding boxes.

No proprietary Factorio sprite pixels are placed in this public repo.
No modified .blend is saved until original-source visual comparison.
"""
import argparse
from collections import Counter
from hashlib import sha256
import json
import math
from pathlib import Path
import sys

ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from fin_mount_geometry_sweep_r50 import AXIS_Z,FIN_PREFIX,UPPER,MAIN,MOUNT_PREFIX
from mount_occlusion_diagnostic_r51 import NATIVE,camera_ray,render
from mount_shape_fit_r52 import joint_gap_world

REVISION="R56_source_fin_exposure_radial_shell_relief_sweep"
OFFSETS=(0.,.20,.40,.60,.80)
UPPER_ROI=(38,225,336,444)

def curve_fin_off_mount(fin,original_vertices,amount):
    if len(original_vertices)!=220 or fin.data.shape_keys:
        raise RuntimeError("R56 cannot deform source-animated lower sheet")
    for v,(x,y,z) in zip(fin.data.vertices,original_vertices):
        row=(v.index%110)//11
        # 0 = clamped sheet root; 9 = free end, with gentle S-like
        # steel roll outward beyond the refractory bell edge.
        t=row/9.
        weight=t*t*(3.-2.*t)
        halfslot=(v.index%11)/10.
        # Deeper channel in the centre of the formed thermal sheet.
        middle=1.-.12*abs(halfslot-.5)*2
        radius=math.hypot(x,z-AXIS_Z)
        angle=math.atan2(z-AXIS_Z,x)
        displaced=radius+amount*weight*middle
        v.co=(displaced*math.cos(angle),y,
              AXIS_Z+displaced*math.sin(angle))
    fin.data.update()

def first_hit_fin_visibility(scene):
    dg=bpy.context.evaluated_depsgraph_get()
    x0,x1,y0,y1=UPPER_ROI
    hits=Counter()
    for y in range(y0,y1,4):
        for x in range(x0,x1,4):
            origin,direction=camera_ray(scene.camera,scene,x,y)
            hit,point,normal,face,obj,matrix=scene.ray_cast(
                dg,origin,direction,distance=300.)
            hits[obj.name if hit else "<NO_HIT>"]+=1
    total=sum(hits.values())
    upper_visible=sum(v for key,v in hits.items()
                      if key.startswith(FIN_PREFIX)
                      and int(key[len(FIN_PREFIX):len(FIN_PREFIX)+2]) in UPPER)
    return {"upper_fin_first_hit_pixels":upper_visible,
            "sampled_native_pixels":total,
            "upper_fin_first_hit_fraction":round(upper_visible/total,5),
            "by_physical_object":dict(hits.most_common(24))}

def run(output):
    original=output/"test-04-vanilla-approx"/"mounted-fin-candidate-r55"/"three_mounts_connected_candidate.blend"
    if not original.exists():
        raise RuntimeError("R56 needs R55 verified saved physical mounting candidate")
    original_hash=sha256(original.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(original))
    scene=bpy.context.scene
    from mounted_fin_candidate_r55 import REVISION as R55_REV,MAX_ROOT_CONNECTION
    if (scene.get("fsc_r55_revision")!=R55_REV or
        scene.get("fsc_r55_fin_root_connections")!=3 or
        not scene.camera or scene.camera.data.type!="ORTHO"):
        raise RuntimeError("R56 must preserve 3 verified bespoke fin attachments")
    if len(bpy.data.collections["R55_SOURCE_OBSERVED_CENTER_BRIDGE_TWO_LOCKING_LUGS"].objects)!=2:
        raise RuntimeError("R56 source central casting lugs absent")
    camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    oldnames={o.name for o in scene.objects}
    original_vertices={}
    for i in UPPER:
        name=f"{FIN_PREFIX}{i:02d}"
        fin=bpy.data.objects.get(name)
        if fin is None or fin.data.shape_keys or len(fin.data.vertices)!=220:
            raise RuntimeError("R56 may only alter mounted static upper heat fins")
        original_vertices[name]=tuple(tuple(v.co) for v in fin.data.vertices)
    original_frame=scene.frame_current
    old_render=(scene.render.resolution_x,scene.render.resolution_y,
                scene.render.resolution_percentage,scene.render.filepath,
                scene.render.image_settings.file_format,
                scene.render.image_settings.color_mode,scene.cycles.samples)
    output_dir=output/"test-04-vanilla-approx"/"source-fin-visibility-r56"
    output_dir.mkdir(parents=True,exist_ok=True)
    report={"revision":REVISION,"R55_saved_3D_candidate_sha256":original_hash,
            "original_source_rgba_not_in_git":True,
            "fin_root_points_remain_identical":True,
            "R55_mount_castings_and_lugs_unchanged":True,"variants":[]}
    try:
        scene.frame_set(1)
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=10
        for amount in OFFSETS:
            for label,points in original_vertices.items():
                curve_fin_off_mount(bpy.data.objects[label],points,amount)
            bpy.context.view_layer.update()
            visible=first_hit_fin_visibility(scene)
            joints={str(i):round(joint_gap_world(
                bpy.data.objects[f"{MOUNT_PREFIX}{i:02d}"],
                bpy.data.objects[f"{FIN_PREFIX}{i:02d}"]),7)
                for i in MAIN}
            if any(d>MAX_ROOT_CONNECTION for d in joints.values()):
                raise RuntimeError("R56 detached source-matched bespoke mounting")
            file=f"physically_cupped_radial_{amount:.2f}".replace(".","_")+".png"
            render(scene,output_dir/file)
            report["variants"].append({"distal_radial_exposure_tiles":amount,
                                       "first_hits":visible,"root_contact_gaps":joints,
                                       "native_image":file})
            print("R56_ACTUAL_FIN_VISIBILITY",amount,
                  visible["upper_fin_first_hit_pixels"],
                  visible["upper_fin_first_hit_fraction"],flush=True)
    finally:
        for label,pts in original_vertices.items():
            ob=bpy.data.objects[label]
            for v,pt in zip(ob.data.vertices,pts):v.co=pt
            ob.data.update()
        (scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.render.filepath,
         scene.render.image_settings.file_format,
         scene.render.image_settings.color_mode,scene.cycles.samples)=old_render
        scene.frame_set(original_frame)
        bpy.context.view_layer.update()
    report["source_3D_scene_restored"]=(
        all(all(max(abs(a-b) for a,b in zip(v.co,pt))<1e-6
                for v,pt in zip(bpy.data.objects[label].data.vertices,pts))
            for label,pts in original_vertices.items())
        and tuple(float(v) for row in scene.camera.matrix_world for v in row)==camera
        and {o.name for o in scene.objects}==oldnames
        and sha256(original.read_bytes()).hexdigest()==original_hash)
    if not report["source_3D_scene_restored"]:
        raise RuntimeError("R56 damaged physical saved source candidate")
    (output_dir/"fin-visible-physical-r56.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R56_SOURCE_MOUNTED_ANIMATED_SCENE_UNCHANGED",flush=True)

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    run(args.output.resolve())
