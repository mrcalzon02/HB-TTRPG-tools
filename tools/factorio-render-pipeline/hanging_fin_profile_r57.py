"""R57: source-hanging elongated heat fins, fixed to connected R55 cast mounts.

R56 curved the distal tips OUTWARD and yielded an incorrect saddle/arch over
the bell. The original source shows hanging near-vertical formed plates with
long purple-blue free ends. Hold ALL 3 source casting anchor surfaces fixed,
including 2 authentic central locking lugs, and give each upper R21 sheet
small near-root radial relief which then remains parallel over its body,
while advancing the distal Y DOWNSTREAM instead of lifting the end.

All eight physically derived variants are rendered in native source
coordinates with the R55 editable scene. No original bitmap in the artifact.
This calibrates positions, not color acceptance or the refractory yet.
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
from fin_mount_geometry_sweep_r50 import AXIS_Z,FIN_PREFIX,UPPER,MAIN,MOUNT_PREFIX
from mount_occlusion_diagnostic_r51 import NATIVE,render,projected_bounds
from mount_shape_fit_r52 import joint_gap_world
from fin_exposure_r56 import first_hit_fin_visibility

REVISION="R57_straighter_elongated_source_hanging_heat_fins"
LATERAL=(.12,.25,.38)
AFT_EXTENSION=(.25,.55,.85)
TOTAL_VARIANTS=len(LATERAL)*len(AFT_EXTENSION)

def physical_hanging_fin(fin,pts,lateral,extension):
    if fin.data.shape_keys or len(pts)!=220:
        raise RuntimeError("R57 requires original unanimated upper R21 formed sheet")
    for vert,(x,y,z) in zip(fin.data.vertices,pts):
        row=(vert.index%110)//11
        t=row/9.
        # Immediate relief below casting, then the body stays parallel.
        s=min(1.,row/3.)
        front=s*s*(3.-2.*s)
        # Long, straight hanging panel, not R56's raised-tip saddle.
        down=t*t*(3.-2.*t)
        radius=math.hypot(x,z-AXIS_Z)
        a=math.atan2(z-AXIS_Z,x)
        new_r=radius+lateral*front
        vert.co=(new_r*math.cos(a),y-extension*down,
                 AXIS_Z+new_r*math.sin(a))
    fin.data.update()

def run(output):
    src=output/"test-04-vanilla-approx"/"mounted-fin-candidate-r55"/"three_mounts_connected_candidate.blend"
    if not src.is_file():
        raise RuntimeError("R57 missing verified saved R55 mounted fin Blender scene")
    h=sha256(src.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(src))
    scene=bpy.context.scene
    from mounted_fin_candidate_r55 import REVISION as R55_REV, MAX_ROOT_CONNECTION
    if scene.get("fsc_r55_revision")!=R55_REV or scene.get("fsc_r55_fin_root_connections")!=3:
        raise RuntimeError("R57 must retain exact source-connected bespoke fin roots")
    if len(bpy.data.collections["R55_SOURCE_OBSERVED_CENTER_BRIDGE_TWO_LOCKING_LUGS"].objects)!=2:
        raise RuntimeError("R57 lost source-specific two central mount ears")
    cam=tuple(float(c) for row in scene.camera.matrix_world for c in row)
    names={o.name for o in scene.objects}
    original={}
    for i in UPPER:
        name=f"{FIN_PREFIX}{i:02d}"
        ob=bpy.data.objects.get(name)
        if ob is None or len(ob.data.vertices)!=220 or ob.data.shape_keys:
            raise RuntimeError("R57 only deforms five original upper static R21 fins")
        original[name]=tuple(tuple(v.co) for v in ob.data.vertices)
    previous=(scene.render.resolution_x,scene.render.resolution_y,
              scene.render.resolution_percentage,scene.render.filepath,
              scene.render.image_settings.file_format,
              scene.render.image_settings.color_mode,
              scene.cycles.samples,scene.frame_current)
    out=output/"test-04-vanilla-approx"/"hanging-fin-profile-r57"
    out.mkdir(parents=True,exist_ok=True)
    report={"revision":REVISION,"source_candidate_scene_sha256":h,
            "source_pixels_bundled":False,"source_camera_unchanged":True,
            "fin_root_contact_preserved":True,"reversible_only":True,
            "variants":[]}
    try:
        scene.frame_set(1)
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=10
        for radial in LATERAL:
            for downstream in AFT_EXTENSION:
                for name,pts in original.items():
                    physical_hanging_fin(bpy.data.objects[name],pts,radial,downstream)
                bpy.context.view_layer.update()
                gaps={str(i):round(joint_gap_world(
                    bpy.data.objects[f"{MOUNT_PREFIX}{i:02d}"],
                    bpy.data.objects[f"{FIN_PREFIX}{i:02d}"]),7)
                    for i in MAIN}
                if any(v>MAX_ROOT_CONNECTION for v in gaps.values()):
                    raise RuntimeError("R57 displaced actual mounted fin root")
                exposure=first_hit_fin_visibility(scene)
                bounds={str(i):projected_bounds(scene,f"{FIN_PREFIX}{i:02d}")
                        for i in MAIN}
                filename=f"parallel_{radial:.2f}_tail_{downstream:.2f}".replace(".","_")+".png"
                render(scene,out/filename)
                report["variants"].append({
                    "upper_sheet_radial_front_relief":radial,
                    "upper_sheet_downstream_extension":downstream,
                    "source_native_screenshot":filename,
                    "source_facing_first_hits":exposure,
                    "mount_joint_gaps_tiles":gaps,
                    "individual_fin_projected_bounds":bounds})
                print("R57_HANGING_SHEET_SOURCE_VISIBILITY",radial,downstream,
                      exposure["upper_fin_first_hit_pixels"],flush=True)
    finally:
        for name,pts in original.items():
            ob=bpy.data.objects[name]
            for v,p in zip(ob.data.vertices,pts):v.co=p
            ob.data.update()
        (scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.render.filepath,
         scene.render.image_settings.file_format,
         scene.render.image_settings.color_mode,
         scene.cycles.samples,frame)=previous
        scene.frame_set(frame)
        bpy.context.view_layer.update()
    report["original_3D_candidate_restored"]=(
        all(all(max(abs(a-b) for a,b in zip(v.co,p))<1e-6
                for v,p in zip(bpy.data.objects[name].data.vertices,pts))
            for name,pts in original.items())
        and tuple(float(c) for row in scene.camera.matrix_world for c in row)==cam
        and {o.name for o in scene.objects}==names
        and sha256(src.read_bytes()).hexdigest()==h)
    if not report["original_3D_candidate_restored"] or len(report["variants"])!=TOTAL_VARIANTS:
        raise RuntimeError("R57 did not restore source native shape/camera")
    (out/"source-hanging-fin-geometry.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R57_NO_SOURCE_BASELINE_MUTATION",TOTAL_VARIANTS,flush=True)

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    run(args.output.resolve())
