"""R40: diagnostic ONLY — identify which physical layers hide the R39 wall.

All renders use the saved vanilla orthographic camera, unmodified studio
lights and actual Blender meshes; they merely toggle object.hide_render in
memory and restore it before exiting. No source artwork or lighting hacks.
The editable .blend file on disk is never overwritten by this diagnostic.
"""
import argparse
import json
from pathlib import Path
import sys
import bpy

REVISION="R40_same_camera_nozzle_layer_visibility_diagnostics"
SOURCE_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
LINER="R11_OPEN_DEEP_REFRACTORY_THROAT"
DRUM="R08_aft_internal_reaction_drum"
R19_COLLECTION="R19_EDITABLE_OPEN_CONE_INTERIOR"
NAMES=("full_engine","open_liner_only","liner_plus_R19","liner_R19_and_reaction_drum")

def allowed(name,source_collection):
    if name=="full_engine":return None
    if name=="open_liner_only":return {LINER}
    if name=="liner_plus_R19":return {LINER}|source_collection
    if name=="liner_R19_and_reaction_drum":return {LINER,DRUM}|source_collection
    raise KeyError("R40 unknown physical layer")

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",type=Path,required=True)
    a=sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else []
    args=parser.parse_args(a)
    output=args.output.resolve()
    source=output/"test-04-vanilla-approx"/"scenes"/"test-04-vanilla-approx.blend"
    if not source.is_file():
        raise RuntimeError("R40 requires previously saved real Blender vanilla scene")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    if (scene.get("fsc_r39_revision")!=
        "R39_physically_fluted_original_open_refractory_liner" or
        scene.get("fsc_r38_original_sprite_sha256")!=SOURCE_SHA256):
        raise RuntimeError("R40 diagnostic requires source-traced R39 scene")
    col=bpy.data.collections.get(R19_COLLECTION)
    throat=bpy.data.objects.get(LINER)
    if col is None or len(col.objects)!=160 or not throat:
        raise RuntimeError("R40 source hierarchy incomplete")
    if scene.camera is None or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R40 native camera missing")
    if not scene.render.film_transparent:
        raise RuntimeError("R40 cannot diagnose on an opaque fake background")
    member_names={ob.name for ob in col.objects}
    originals={ob.name:ob.hide_render for ob in scene.objects
               if ob.type in {"MESH","CURVE"}}
    refs=set(originals)
    if not {LINER,DRUM}.issubset(refs):
        raise RuntimeError("R40 cannot isolate both source nozzle layers")
    camera=scene.camera
    original_render=(scene.render.resolution_x,scene.render.resolution_y,
                     scene.render.resolution_percentage,scene.render.filepath,
                     scene.cycles.samples)
    dest=output/"test-04-vanilla-approx"/"nozzle-layer-isolation-r40"
    dest.mkdir(parents=True,exist_ok=True)
    record={"revision":REVISION,"source_sha256":SOURCE_SHA256,
            "camera_object":camera.name,
            "camera_matrix":list(map(list,camera.matrix_world)),
            "orthographic_scale":float(camera.data.ortho_scale),
            "same_saved_studio_lighting":True,
            "no_extra_model_or_lighting_objects":True,
            "temporary_visibility_only":True,
            "rendered_layers":[]}
    try:
        scene.frame_set(1)
        scene.render.resolution_x=264
        scene.render.resolution_y=542
        scene.render.resolution_percentage=100
        scene.cycles.samples=8
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        for stage in NAMES:
            allow=allowed(stage,member_names)
            for name,original in originals.items():
                bpy.data.objects[name].hide_render=(
                    original if allow is None else original or name not in allow)
            scene.view_layers.update()
            filename=stage+".png"
            path=dest/filename
            scene.render.filepath=str(path)
            bpy.ops.render.render(write_still=True)
            if not path.is_file() or path.stat().st_size<400:
                raise RuntimeError("R40 Blender diagnostic image missing: "+filename)
            record["rendered_layers"].append({"name":stage,"file":filename,
                                               "visible_source_layers":(
                                                   "original unchanged" if allow is None else
                                                   sorted(allow))})
            print("R40_NATIVE_SAME_CAMERA_LAYER",stage,flush=True)
    finally:
        for name,flag in originals.items():
            bpy.data.objects[name].hide_render=flag
        (scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.render.filepath,
         scene.cycles.samples)=original_render
        scene.camera=camera
    record["restored_every_original_visibility_flag"]=all(
        bpy.data.objects[name].hide_render==flag for name,flag in originals.items())
    if not record["restored_every_original_visibility_flag"]:
        raise RuntimeError("R40 failed to restore saved scene model visibility")
    (dest/"layer-manifest.json").write_text(json.dumps(record,indent=2)+"\n")
    print("R40_SAVED_SCENE_UNCHANGED_DIAGNOSTIC_COMPLETE",len(NAMES),flush=True)

if __name__=="__main__":main()
