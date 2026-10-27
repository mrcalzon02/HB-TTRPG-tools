"""R32: render the editable vanilla R31 Blender body over ALL 64 source frames.

Fixed native 264x542 source-size camera canvas; no crop, no reframe, no
additive glow or conditional pipe merge. This captures the existing
source-measured R18 deformation keys, not invented outer-shell motion.
The original proprietary Wube images are never installed or committed.
"""
from pathlib import Path
import argparse
import json
import sys
import bpy

REVISION="R32_native_resolution_complete_64_source_cycle"
SOURCE_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
FRAME_COUNT=64
SOURCE_SIZE=(264,542)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--output",type=Path,required=True)
    argv=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    args=ap.parse_args(argv)
    root=args.output.resolve()
    blend=root/"test-04-vanilla-approx"/"scenes"/"test-04-vanilla-approx.blend"
    if not blend.is_file():
        raise RuntimeError("R32 requires real saved editable vanilla Blender scene")
    bpy.ops.wm.open_mainfile(filepath=str(blend))
    scene=bpy.context.scene
    if scene.get("fsc_r18_source_frames")!=64:
        raise RuntimeError("R32 source 64-frame R18 animation not authored")
    if scene.get("fsc_r31_revision")!=(
        "R31_cupped_radial_shell_with_returned_aft_lips"):
        raise RuntimeError("R32 requires source-cupped R31 mesh")
    if scene.get("fsc_r18_original_archive_sha256")!=SOURCE_SHA256:
        raise RuntimeError("R32 missing original source archive provenance")
    if not scene.render.film_transparent or not scene.camera:
        raise RuntimeError("R32 requires transparency and saved fixed camera")
    directory=root/"test-04-vanilla-approx"/"native-source-cycle-r32"
    directory.mkdir(parents=True,exist_ok=True)
    scene.render.resolution_x,scene.render.resolution_y=SOURCE_SIZE
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.cycles.samples=8
    manifest={"revision":REVISION,"source_archive_sha256":SOURCE_SHA256,
              "source_frame_count":FRAME_COUNT,
              "original_source_dimensions":list(SOURCE_SIZE),
              "candidate_dimensions":list(SOURCE_SIZE),
              "strict_camera_ortho":float(scene.camera.data.ortho_scale),
              "camera_location":list(scene.camera.location),
              "original_private_sprite_not_committed":True,
              "separate_body_only_no_glow_overlay":True,
              "source_frame_to_blender_frame_offset":1,
              "body_frame_files":[]}
    for original_index in range(FRAME_COUNT):
        frame=original_index+1
        scene.frame_set(frame)
        filename=f"body-{original_index:02d}.png"
        dest=directory/filename
        scene.render.filepath=str(dest)
        bpy.ops.render.render(write_still=True)
        if not dest.is_file() or dest.stat().st_size<256:
            raise RuntimeError(f"Missing real R32 Blender frame {original_index}")
        manifest["body_frame_files"].append(filename)
        print("R32_REAL_NATIVE_BODY_FRAME",original_index,flush=True)
    (directory/"cycle-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n")
    print("R32_ALL_REAL_NATIVE_BODY_FRAMES_PASS",FRAME_COUNT,flush=True)

if __name__=="__main__":
    main()
