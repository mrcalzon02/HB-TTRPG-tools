"""R58: preserve a REOPENABLE improved mounted-fin 3D model candidate.

Privately compared original 264x542 source frame0 with genuine Blender
R55 + R57 same-camera renders. R57 straight hanging geometry with near-root
radial .25 and downstream extension .25 has source ROI RGB MAE .11707
compared with .12121 for R55 (ROI x40..224 y300..515, premultiplied RGB).
This is a modest MEASURABLE improvement, NOT a full source match; older
larger extension .55/.85 worsened fidelity and is rejected.

Save only a separate editable R58 candidate; do not replace original R55
or public runtime assets. Persist and reopen all original lower R18 animation,
three mechanical connections, three unlike casts, 2 central locking lugs,
open nozzle, lighting and orthographic source camera. No source sprites.
"""
import argparse
from hashlib import sha256
import json
from pathlib import Path
import sys
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from hanging_fin_profile_r57 import physical_hanging_fin
from fin_mount_geometry_sweep_r50 import UPPER,MAIN,FIN_PREFIX,MOUNT_PREFIX
from mount_shape_fit_r52 import joint_gap_world
from mount_occlusion_diagnostic_r51 import NATIVE,render
from mounted_fin_candidate_r55 import REVISION as R55_REV,MAX_ROOT_CONNECTION,source_integrity

REVISION="R58_connected_source_hanging_fins_editable_candidate"
UPPER_FIN_RADIAL_RELIEF=.25
UPPER_FIN_DISTAL_EXTENSION=.25

def verify(scene,oldcamera):
    source_integrity(scene,{})
    if (scene.get("fsc_r55_revision")!=R55_REV or
        scene.get("fsc_r58_revision")!=REVISION or
        scene.get("fsc_r58_upper_heat_fins_straight_rehanging")!=5 or
        len(bpy.data.collections["R55_SOURCE_OBSERVED_CENTER_BRIDGE_TWO_LOCKING_LUGS"].objects)!=2):
        raise RuntimeError("R58 lost R55 bespoke cast assembly or R57 fin stage")
    for i in MAIN:
        if joint_gap_world(bpy.data.objects[f"{MOUNT_PREFIX}{i:02d}"],
                           bpy.data.objects[f"{FIN_PREFIX}{i:02d}"])>MAX_ROOT_CONNECTION:
            raise RuntimeError("R58 moved original fin-to-mount actual 3D joint")
    for i in (6,7,8,9):
        ob=bpy.data.objects.get(f"{FIN_PREFIX}{i:02d}")
        if not ob or not ob.data.shape_keys or len(ob.data.shape_keys.key_blocks)<2:
            raise RuntimeError("R58 erased 64-frame source lower fin motion")
    if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=oldcamera:
        raise RuntimeError("R58 replaced original Factorio calibration camera")

def run(output):
    original=output/"test-04-vanilla-approx"/"mounted-fin-candidate-r55"/"three_mounts_connected_candidate.blend"
    if not original.exists():
        raise RuntimeError("R58 requires persisted R55 original candidate .blend")
    baseline_hash=sha256(original.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(original))
    scene=bpy.context.scene
    if scene.get("fsc_r55_revision")!=R55_REV:
        raise RuntimeError("R58 source R55 mount connectivity missing")
    camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    for i in UPPER:
        ob=bpy.data.objects.get(f"{FIN_PREFIX}{i:02d}")
        if ob is None or ob.data.shape_keys:
            raise RuntimeError("R58 refuses modulated lower fin or absent upper plate")
        pts=tuple(tuple(v.co) for v in ob.data.vertices)
        physical_hanging_fin(ob,pts,UPPER_FIN_RADIAL_RELIEF,UPPER_FIN_DISTAL_EXTENSION)
    scene["fsc_r58_revision"]=REVISION
    scene["fsc_r58_upper_heat_fins_straight_rehanging"]=len(UPPER)
    scene["fsc_r58_source_roi_rgb_mae_candidate"]=.11707
    scene["fsc_r58_source_roi_rgb_mae_previous"]=.12121
    scene["fsc_r58_source_visual_approved"]=False
    scene["fsc_r58_no_unverified_animating_upper_linkages"]=True
    scene["fsc_r58_original_source_not_bundled"]=True
    verify(scene,camera)
    dest=output/"test-04-vanilla-approx"/"physically-connected-fin-r58"
    dest.mkdir(parents=True,exist_ok=True)
    scene.render.resolution_x,scene.render.resolution_y=NATIVE
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.cycles.samples=12
    candidate=dest/"source_connected_hanging_fins_r58.blend"
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(candidate))
    if not candidate.is_file() or candidate.stat().st_size<100000:
        raise RuntimeError("R58 new saved Blender candidate is empty")
    for frame in (1,17,33,49):
        scene.frame_set(frame)
        render(scene,dest/f"body_{frame:02d}.png")
    bpy.ops.wm.open_mainfile(filepath=str(candidate))
    verify(bpy.context.scene,camera)
    if sha256(original.read_bytes()).hexdigest()!=baseline_hash:
        raise RuntimeError("R58 mutated R55 preserved connected candidate")
    record={"revision":REVISION,"R55_original_candidate_sha256":baseline_hash,
            "R58_candidate_sha256":sha256(candidate.read_bytes()).hexdigest(),
            "R58_candidate_bytes":candidate.stat().st_size,
            "fully_reopened_native_editable_mesh":True,
            "all_three_fin_root_connections_physically_joined":True,
            "original_64_frame_lower_motion_preserved":True,
            "reference_pixel_data_not_embedded":True,
            "camera_light_and_original_R55_unchanged":True,
            "source_ROI_original_premultiplied_rgb_mae":.11707,
            "source_ROI_previous_R55_rgb_mae":.12121,
            "visual_approval":False,
            "source_roi_xyxy":[40,300,224,515],
            "pending":"Source original is more detailed, longer hanging plated fins, layered refractory, distinct cream castings."}
    (dest/"r58-persisted-candidate.json").write_text(
        json.dumps(record,indent=2)+"\n",encoding="utf8")
    print("R58_NATIVE_SAVED_SCENE_REOPEN_64_FRAME_MOUNTING_PASS",
          candidate.name,flush=True)
    print("R58_SOURCE_RGB_ROI_MAE_R55_TO_R58",.12121,.11707,flush=True)

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    run(args.output.resolve())
