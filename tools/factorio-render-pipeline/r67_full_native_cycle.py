"""R67: export ALL 64 native source-indexed frames from real saved R66 Blender.

This is a RECONSTRUCTION candidate capture for private comparison against
the user's ORIGINAL Factorio 2.0.77 thruster sprite, never an acceptance
comparison with web pictures or an invented reference image.

Two explicit modes:
  blender --python r67_full_native_cycle.py -- --source-blend ... --out ...
  python r67_full_native_cycle.py --assemble --out ...

No proprietary source art or official Wube printable models are loaded.
Never change the original .blend. Preserve full 264x542 RGBA cells, native
camera, 64 keyed lower-fin motion, and zero-based Factorio frame ordering.
"""
import argparse
from hashlib import sha256
import json
from pathlib import Path
import sys

REVISION="R67_real_full_64_frame_native_cycle_from_connected_R66"
R66_REV="R66_saved_source_cast_faces_with_R64_upper_hull_loadpaths"
R66_SHA256="a1db423d69c1db0373eefc1b551966f15d6906f3e61dcce8d67f90753cc59547"
ATLAS_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
CELL=(264,542)
ROWS=COLS=8
FRAMES=64
LOWER=(6,7,8,9)

def digest(path):
    h=sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()

def capture(source,out):
    import bpy
    source=source.resolve()
    if not source.is_file():
        raise RuntimeError("Original saved R66 .blend is missing")
    original_hash=digest(source)
    if original_hash!=R66_SHA256:
        raise RuntimeError("R67 refuses a different, unverified R66 .blend: "+original_hash)
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    if scene.get("fsc_r66_revision")!=R66_REV:
        raise RuntimeError("R67 requires the original successfully saved R66 revision")
    if scene.get("fsc_status")!="CALIBRATION_ONLY_NOT_FACTORIO_APPROVED":
        raise RuntimeError("Do not promote R66 reconstruction to approved Factorio art")
    if scene.camera is None or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R67 original orthographic camera missing")
    if scene.get("fsc_r18_source_frames")!=FRAMES:
        raise RuntimeError("R67 original 64-frame keyed fin contract missing")
    if scene.render.engine!="CYCLES":
        raise RuntimeError("R67 original native Cycles engine missing")
    if bpy.context.window:
        bpy.context.window.scene=scene
    camera_basis=tuple(float(v) for row in scene.camera.matrix_basis for v in row)
    ortho=float(scene.camera.data.ortho_scale)
    for index in LOWER:
        fin=bpy.data.objects.get("R11_SUSPENDED_AFTERBURNER_VANE_%02d"%index)
        if fin is None or not fin.data.shape_keys or len(fin.data.shape_keys.key_blocks)<2:
            raise RuntimeError("R67 lost the actual animated lower fin "+str(index))
    original_scene_objects={o.name for o in scene.objects}
    original_materials={m.name for m in bpy.data.materials}
    out=out.resolve()
    out.mkdir(parents=True,exist_ok=True)
    scene.render.resolution_x,scene.render.resolution_y=CELL
    scene.render.resolution_percentage=100
    scene.render.film_transparent=True
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.render.image_settings.color_depth="8"
    scene.cycles.samples=8
    scene.cycles.seed=0
    scene.cycles.use_animated_seed=False
    manifest={
       "revision":REVISION,
       "source_candidate_revision":R66_REV,
       "source_reconstruction_blend_sha256":original_hash,
       "original_private_sprite_sha256_reference_only":ATLAS_SHA256,
       "original_private_sprite_pixels_loaded":False,
       "uses_only_original_factorio_sprite_for_future_fidelity_review":True,
       "visual_fidelity_approved":False,
       "reference_3d_printable_models_loaded":False,
       "frame_count":FRAMES,"frame_index_base":0,
       "blender_frame_offset":1,"frame_size":list(CELL),
       "atlas_layout":{"columns":COLS,"rows":ROWS,"width":COLS*CELL[0],"height":ROWS*CELL[1]},
       "factorio_animation_speed":0.5,
       "factorio_graphics_scale":0.5,
       "factorio_graphics_shift":[0,3],
       "render_engine":"CYCLES",
       "frames":[]
    }
    for index in range(FRAMES):
        scene.frame_set(index+1)
        if (tuple(float(v) for row in scene.camera.matrix_basis for v in row)!=camera_basis
            or float(scene.camera.data.ortho_scale)!=ortho):
            raise RuntimeError("Source camera shifted at frame "+str(index))
        keyed=[]
        for fin_idx in LOWER:
            fin=bpy.data.objects["R11_SUSPENDED_AFTERBURNER_VANE_%02d"%fin_idx]
            keyed.append([round(float(key.value),7)
                          for key in fin.data.shape_keys.key_blocks[1:]])
        name="body-%02d.png"%index
        path=out/name
        scene.render.filepath=str(path)
        bpy.ops.render.render(write_still=True,scene=scene.name)
        if not path.is_file() or path.stat().st_size<1000:
            raise RuntimeError("Real R66 Blender body frame not rendered: "+name)
        manifest["frames"].append({"source_index":index,
                                    "blender_frame":index+1,
                                    "name":name,
                                    "png_bytes":path.stat().st_size,
                                    "png_sha256":digest(path),
                                    "lower_fin_key_values":keyed})
        if index%8==0 or index==63:
            print("R67_ACTUAL_R66_NATIVE_FRAME",index,"of",FRAMES-1,
                  "bytes",path.stat().st_size,flush=True)
    if len({json.dumps(f["lower_fin_key_values"]) for f in manifest["frames"]})<2:
        raise RuntimeError("R67 lower source fin shape-key motion is frozen")
    if digest(source)!=original_hash:
        raise RuntimeError("R67 unexpectedly modified the original R66 scene file")
    if {o.name for o in scene.objects}!=original_scene_objects:
        raise RuntimeError("R67 added/removed source model geometry")
    if {m.name for m in bpy.data.materials}!=original_materials:
        raise RuntimeError("R67 added/removed original model materials")
    (out/"capture-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",
                                             encoding="utf-8")
    print("R67_ALL_64_ORIGINAL_INDEXED_NATIVE_BLEND_FRAMES_RENDERED",flush=True)

def assemble(out):
    from PIL import Image
    out=out.resolve()
    manifest=json.loads((out/"capture-manifest.json").read_text(encoding="utf-8"))
    if (manifest["revision"]!=REVISION or manifest["source_candidate_revision"]!=R66_REV
        or manifest["source_reconstruction_blend_sha256"]!=R66_SHA256
        or manifest["frame_count"]!=FRAMES or manifest["frame_size"]!=list(CELL)
        or manifest["original_private_sprite_pixels_loaded"]
        or manifest["visual_fidelity_approved"]):
        raise RuntimeError("R67 manifest provenance/geometry is inconsistent")
    frames=manifest["frames"]
    if len(frames)!=FRAMES or [f["source_index"] for f in frames]!=list(range(FRAMES)):
        raise RuntimeError("R67 source frame order is not exactly 0..63")
    if [f["blender_frame"] for f in frames]!=list(range(1,FRAMES+1)):
        raise RuntimeError("R67 Blender animation frame offset must remain +1")
    atlas=Image.new("RGBA",(CELL[0]*COLS,CELL[1]*ROWS),(0,0,0,0))
    distinct=set()
    entries=[]
    for i,record in enumerate(frames):
        path=out/record["name"]
        if not path.is_file() or digest(path)!=record["png_sha256"]:
            raise RuntimeError("R67 source-indexed PNG absent/modified "+record["name"])
        with Image.open(path) as src:
            if src.size!=CELL or src.mode!="RGBA":
                raise RuntimeError("R67 source-native cell RGBA contract broken")
            src.load()
            alpha=src.getchannel("A")
            if alpha.getbbox() is None:
                raise RuntimeError("R67 rendered blank body frame "+record["name"])
            pixelhash=sha256(src.tobytes()).hexdigest()
            distinct.add(pixelhash)
            x=(i%COLS)*CELL[0]
            y=(i//COLS)*CELL[1]
            atlas.paste(src,(x,y))
            entries.append({"source_index":i,"atlas_col":i%COLS,"atlas_row":i//COLS,
                            "frame":record["name"],"pixel_sha256":pixelhash,
                            "alpha_bbox":list(alpha.getbbox())})
    if len(distinct)<2:
        raise RuntimeError("R67 full source cycle generated 64 identical images")
    atlas_file=out/"r67-reconstruction-candidate-8x8-64.png"
    atlas.save(atlas_file,optimize=True)
    # Verify serialized atlas is an exact lossless repack of all 64 PNG cells.
    with Image.open(atlas_file) as stored:
        if stored.mode!="RGBA" or stored.size!=(COLS*CELL[0],ROWS*CELL[1]):
            raise RuntimeError("R67 output sprite sheet dimension/alpha invalid")
        for entry in entries:
            x=entry["atlas_col"]*CELL[0]
            y=entry["atlas_row"]*CELL[1]
            cropped=stored.crop((x,y,x+CELL[0],y+CELL[1]))
            if sha256(cropped.tobytes()).hexdigest()!=entry["pixel_sha256"]:
                raise RuntimeError("R67 atlas cell changed original rendered pixels")
    report={
        "status":"PASS_REAL_SAVED_R66_COMPLETE_CYCLE_NATIVE_RGAB_ASSET",
        "source_sprite_visual_fidelity_approved":False,
        "source_sprite_private_bytes_in_artifacts":False,
        "external_web_images_used":False,
        "blender_model_sha256":R66_SHA256,
        "frame_count_verified":FRAMES,
        "unique_rgba_frames":len(distinct),
        "native_cell":list(CELL),
        "atlas_dimensions":list(atlas.size),
        "atlas_sha256":digest(atlas_file),
        "all_64_atlas_cells_verified_bit_identical_to_real_blender_frames":True,
        "frame_order":"source index 0..63, left-to-right then top-to-bottom",
        "cells":entries,
    }
    (out/"r67-native-cycle-report.json").write_text(
         json.dumps(report,indent=2)+"\n",encoding="utf-8")
    print("R67_ALL_64_REAL_R66_FRAMES_ATLAS_PIXEL_VERIFIED",
          len(distinct),"distinct",list(atlas.size),flush=True)
    return report

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-blend",type=Path)
    p.add_argument("--assemble",action="store_true")
    p.add_argument("--out",type=Path,required=True)
    args=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    if args.assemble==bool(args.source_blend):
        p.error("Choose exactly one of --source-blend (Blender) or --assemble (Pillow)")
    if args.source_blend:
        capture(args.source_blend,args.out)
    else:
        assemble(args.out)

if __name__=="__main__":
    main()
