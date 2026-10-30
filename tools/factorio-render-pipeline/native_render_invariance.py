"""Native-frame render invariant for the original R58 Factorio reconstruction.

Compare before/after real Blender scene renders at 264x542 for source-indexed
frames 1,17,33,49. No official model STL or proprietary source sprite is
rendered or published. Only our editable reverse-construction scene is rendered.

Capture (run under Blender): --capture-blend PATH --out PATH
Compare (run under Python with Pillow): --baseline DIR --candidate DIR --out PATH
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys

NATIVE=(264,542)
FRAMES=(1,17,33,49)


def capture(path,out):
    import bpy
    path=path.resolve()
    if not path.is_file():raise RuntimeError("Missing saved source scene")
    original_hash=hashlib.sha256(path.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(path))
    original=[s for s in bpy.data.scenes
              if s.get("fsc_status")=="CALIBRATION_ONLY_NOT_FACTORIO_APPROVED"]
    if len(original)!=1:raise RuntimeError("Exactly one recovered R58 source scene required")
    scene=original[0]
    if scene.camera is None or scene.camera.data.type!="ORTHO":
        raise RuntimeError("Original fixed orthographic camera unavailable")
    if bpy.context.window:
        bpy.context.window.scene=scene
    scene.render.resolution_x,scene.render.resolution_y=NATIVE
    scene.render.resolution_percentage=100
    scene.render.film_transparent=True
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.render.image_settings.color_depth="8"
    if scene.render.engine!="CYCLES":
        raise RuntimeError("Saved Factorio source render engine unexpectedly changed")
    scene.cycles.samples=8
    scene.cycles.seed=0
    scene.cycles.use_animated_seed=False
    out=out.resolve()
    out.mkdir(parents=True,exist_ok=True)
    record={
        "candidate_source_artwork_included":False,
        "proprietary_wube_stls_included":False,
        "frame_type":"R58 reconstructed 3D body ONLY",
        "input_blend_sha256":original_hash,
        "source_scene":scene.name,
        "render_engine":scene.render.engine,
        "native_source_cell":list(NATIVE),
        "frame_indices":list(FRAMES),
        "frames":[],
    }
    for frame in FRAMES:
        scene.frame_set(frame)
        output=out/("%03d.png"%frame)
        scene.render.filepath=str(output)
        bpy.ops.render.render(write_still=True,scene=scene.name)
        if not output.is_file() or output.stat().st_size<100:
            raise RuntimeError("No real Blender frame output "+str(output))
        record["frames"].append({
            "frame":frame,"name":output.name,"size_bytes":output.stat().st_size,
            "png_sha256":hashlib.sha256(output.read_bytes()).hexdigest()})
        print("R58_REAL_NATIVE_FRAME_CAPTURE",frame,output.stat().st_size,flush=True)
    if hashlib.sha256(path.read_bytes()).hexdigest()!=original_hash:
        raise RuntimeError("Render capture overwrote original source .blend")
    (out/"render-manifest.json").write_text(
        json.dumps(record,indent=2)+"\n",encoding="utf-8")


def compare(baseline,candidate,out):
    from PIL import Image,ImageChops
    baseline=baseline.resolve()
    candidate=candidate.resolve()
    first=json.loads((baseline/"render-manifest.json").read_text())
    second=json.loads((candidate/"render-manifest.json").read_text())
    for key in ("source_scene","render_engine","native_source_cell","frame_indices"):
        if first[key]!=second[key]:
            raise RuntimeError("Render invariant capture metadata differs: "+key)
    records=[]
    for frame in FRAMES:
        name="%03d.png"%frame
        with Image.open(baseline/name) as a,Image.open(candidate/name) as b:
            if a.size!=NATIVE or b.size!=NATIVE:
                raise RuntimeError("Native source atlas cell size changed: "+name)
            if a.mode!="RGBA" or b.mode!="RGBA":
                raise RuntimeError("Native RGBA mode lost: "+name)
            pixels_a=a.tobytes()
            pixels_b=b.tobytes()
            changed=sum(x!=y for x,y in zip(pixels_a,pixels_b))
            maximum=max((abs(x-y) for x,y in zip(pixels_a,pixels_b)),default=0)
            rgb_abs=sum(abs(x-y) for x,y in zip(pixels_a,pixels_b))
            if changed!=0:
                raise RuntimeError("True native-frame regression: frame="+name+
                                   " changed_channels="+str(changed)+
                                   " max_RGBA_delta="+str(maximum)+
                                   " total_diff="+str(rgb_abs))
            records.append({
                "frame":frame,"changed_rgba_channels":changed,
                "max_rgba_channel_delta":maximum,
                "baseline_pixel_sha256":hashlib.sha256(pixels_a).hexdigest(),
                "candidate_pixel_sha256":hashlib.sha256(pixels_b).hexdigest(),
            })
            print("R58_UNCHANGED_RENDER_264x542_FRAME",frame,"changed_channels",changed,flush=True)
    report={
        "result":"PASS_EXACT_NATIVE_FRAME_PIXEL_INVARIANCE",
        "frames":records,
        "original_game_sprite_fidelity_tested":False,
        "source_reference_64frame_rgba_not_committed":True,
        "official_stl_mesh_rendered":False,
        "source_reconstruction_frames_equal_after_reference_import":True,
    }
    out.parent.mkdir(parents=True,exist_ok=True)
    out.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print("ALL_RECONSTRUCTION_NATIVE_RENDER_INVARIANCE_PASSED",len(records),flush=True)


def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--capture-blend",type=Path)
    p.add_argument("--baseline",type=Path)
    p.add_argument("--candidate",type=Path)
    p.add_argument("--out",type=Path,required=True)
    args=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    if args.capture_blend is not None:
        if args.baseline or args.candidate:
            p.error("Capture and comparison modes cannot be combined")
        capture(args.capture_blend,args.out)
    else:
        if args.baseline is None or args.candidate is None:
            p.error("Compare requires --baseline and --candidate")
        compare(args.baseline,args.candidate,args.out)


if __name__=="__main__":main()
