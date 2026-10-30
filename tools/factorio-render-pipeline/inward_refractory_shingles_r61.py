"""R61 reverse-direction refractory protrusion, required by real R60 rays.

R60 showed radial OUTWARD physically buries original R19 shingles behind
the R11 open liner: at near+.08 mid+.06, near shingle first hits collapse
from 334 to 0 and R11 shell hits rise to 714. Slight color-error reduction
was therefore a false geometry improvement: reject it.

Keep 80 original R19 stamped shingle meshes and the complete R58 scene,
then move only those real 3D tile surfaces radially INWARD (toward the actual
open nozzle bore) so finite-thickness tiles can appear on top of liner.
Retain parent model, original mesh polygons, materials, open source bore,
three bespoke mounts/joints, central pair of cast lugs, R36 cupped guards
and R18 lower 64-frame animation. All changes reversed, no .blend saved.
"""
import argparse
from hashlib import sha256
import json
from pathlib import Path
import sys

ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from refractory_shingle_depth_r60 import (
    REVISION as R60_REV,LINER,NATIVE,original_tiles,shift_tiles,actual_first_hits,
)
from mount_occlusion_diagnostic_r51 import render
from hanging_fin_candidate_r58 import REVISION as R58_REV,verify
from fin_mount_geometry_sweep_r50 import MAIN,FIN_PREFIX,MOUNT_PREFIX
from mount_shape_fit_r52 import joint_gap_world
from mounted_fin_candidate_r55 import MAX_ROOT_CONNECTION

REVISION="R61_real_source_refractory_shingles_inward_toward_bore"
PAIRS=((-0.02,-0.02),(-0.04,-0.04),(-0.08,-0.04),
       (-0.12,-0.06),(-0.16,-0.08),(-0.20,-0.10),
       (-0.08,-0.12),(-0.12,-0.18))
def run(out):
    baseline=out/"test-04-vanilla-approx"/"physically-connected-fin-r58"/"source_connected_hanging_fins_r58.blend"
    if not baseline.is_file():raise RuntimeError("R61 needs saved R58 3D model")
    digest=sha256(baseline.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(baseline))
    scene=bpy.context.scene
    if scene.get("fsc_r58_revision")!=R58_REV or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R61 cannot replace source-connected R58 model")
    camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    verify(scene,camera)
    liner=bpy.data.objects[LINER]
    original_liner=tuple(tuple(v.co) for v in liner.data.vertices)
    if not liner.get("R11_open_no_endcaps") or len(liner.data.polygons)!=480:
        raise RuntimeError("R61 may not flatten or seal the original open R11 bore")
    tiles,materials=original_tiles(scene)
    names={ob.name for ob in scene.objects}
    old=(scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.render.filepath,
         scene.render.image_settings.file_format,
         scene.render.image_settings.color_mode,
         scene.cycles.samples,scene.frame_current)
    dest=out/"test-04-vanilla-approx"/"inward-refractory-shingles-r61"
    dest.mkdir(parents=True,exist_ok=True)
    report={"revision":REVISION,"source_R58_blend_sha256":digest,
            "R60_wrong_outward_depth_rejected":True,
            "original_factorio_sprite_not_in_artifacts":True,
            "source_original_editable_model_saved_unmodified":True,
            "inward_cases":[]}
    try:
        scene.frame_set(1)
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=10
        for near,mid in PAIRS:
            shift_tiles(tiles,near,mid)
            scene.view_layers[0].update()
            rays=actual_first_hits(scene)
            png=f"near_{near:.2f}_mid_{mid:.2f}".replace("-","negative").replace(".","_")+".png"
            render(scene,dest/png)
            report["inward_cases"].append({
              "inward_near_tiles":-near,"inward_mid_tiles":-mid,
              "first_hits":rays,"native_render":png,
              "three_mount_contacts_preserved":all(
                joint_gap_world(bpy.data.objects[f"{MOUNT_PREFIX}{i:02d}"],
                                bpy.data.objects[f"{FIN_PREFIX}{i:02d}"])<=MAX_ROOT_CONNECTION
                for i in MAIN)})
            print("R61_ACTUAL_BORE_SHINGLE_FIRST_HITS",near,mid,
                  rays["physical_near_tile_first_hits"],
                  rays["physical_mid_tile_first_hits"],
                  rays["R11_liner_first_hits"],flush=True)
    finally:
        for name,(obj,kind,pts) in tiles.items():
            for v,p in zip(obj.data.vertices,pts):v.co=p
            obj.data.update()
        (scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.render.filepath,
         scene.render.image_settings.file_format,
         scene.render.image_settings.color_mode,
         scene.cycles.samples,frame)=old
        scene.frame_set(frame)
        scene.view_layers[0].update()
    report["original_blend_full_restore"]=(
      all(all(max(abs(a-b) for a,b in zip(v.co,pt))<1e-6
              for v,pt in zip(obj.data.vertices,pts))
          for name,(obj,kind,pts) in tiles.items())
      and all(tiles[name][0].data.materials[0].name==mat for name,mat in materials.items())
      and all(max(abs(a-b) for a,b in zip(v.co,p))<1e-6
              for v,p in zip(liner.data.vertices,original_liner))
      and tuple(float(v) for row in scene.camera.matrix_world for v in row)==camera
      and {o.name for o in scene.objects}==names
      and sha256(baseline.read_bytes()).hexdigest()==digest
      and all(v["three_mount_contacts_preserved"] for v in report["inward_cases"]))
    if not report["original_blend_full_restore"]:
        raise RuntimeError("R61 damage to native camera, liner, mounts or tile meshes")
    (dest/"inward_shingle_source_projection.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R61_UNMODIFIED_SOURCE_SAVED_SCENE",len(report["inward_cases"]),flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--output",type=Path,required=True)
    args=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    run(args.output.resolve())
