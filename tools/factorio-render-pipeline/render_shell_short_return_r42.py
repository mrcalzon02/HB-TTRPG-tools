"""Render-only A/B candidate for R42 on VERIFIABLE previously saved R40."""
import argparse,sys,json
from pathlib import Path
import bpy
import vanilla_shell_short_return_r42 as candidate
def main():
    p=argparse.ArgumentParser();p.add_argument("--source",type=Path,required=True)
    p.add_argument("--output",type=Path,required=True)
    args=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    source=args.source.resolve()
    if not source.is_file():raise RuntimeError("R42 real R40 base .blend unavailable")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    if scene.get("fsc_r39_revision")!="R39_physically_fluted_original_open_refractory_liner":
        raise RuntimeError("R42 requires prior R39 saved geometry")
    before={ob.name:ob.hide_render for ob in scene.objects}
    camera=scene.camera
    before_camera=camera.as_pointer()
    candidate.apply("test-04-vanilla-approx",None,None,None,scene)
    scene.frame_set(1)
    output=args.output.resolve();output.mkdir(parents=True,exist_ok=True)
    scene.render.resolution_x=264;scene.render.resolution_y=542
    scene.render.resolution_percentage=100
    scene.cycles.samples=8
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.render.filepath=str(output/"r42_candidate_native.png")
    bpy.ops.render.render(write_still=True)
    if not (output/"r42_candidate_native.png").is_file():
        raise RuntimeError("R42 did not produce an actual Blender image")
    if (any(bpy.data.objects[n].hide_render!=flag for n,flag in before.items())
        or scene.camera.as_pointer()!=before_camera):
        raise RuntimeError("R42 changed render flags or original saved camera")
    (output/"candidate-geometry.json").write_text(json.dumps({
        "revision":candidate.REVISION,
        "root_cause":"R41 top ray hit 191/234 original bronzed bell mesh",
        "candidate_only_not_saved_as_original_blend":True,
        "original_outer_8_rings_unchanged":True,
        "same_native_camera":True,
        "source_sprite_not_committed":True},indent=2)+"\n")
    print("R42_REAL_ORIGINAL_CAMERA_PREVIEW_PASS",flush=True)
if __name__=="__main__":main()
