"""R62: material/light-response A/B for actual formed R19 refractory shingles.

R59 original-camera raycast: 26 exterior shell hits vs 346 R11 liner and
442 ORIGINAL R19 actual tile/strake hits in visible lower aperture.
R60 outward radial lift buried near-mouth tiles (334->0 first hits).
R61 inward relief exposed 380, but worsened source RGB MAE and still lacked
shingle definition. The physical 80 staggered plates already exist; changing
their projected radial position alone is the wrong source-matching approach.

Keep the previously verified actual R58 geometry and camera intact and
compare BARE existing, original non-emissive R19 dark/aged tile material
albedos at fixed lights, plus a tiny optional -0.04 physical original-tile
relief. DO NOT touch the source image, add image planes/billboards/glow,
turn off shadows, hide R11 or add unsupported rigid braces. ALL changes
are temporary, tracked and reverted after native renders. This sweep
isolates why source-visible thickness appears like an empty black bore.
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
    original_tiles,shift_tiles,actual_first_hits,LINER,NATIVE,
)
from mount_occlusion_diagnostic_r51 import render
from hanging_fin_candidate_r58 import REVISION as R58_REV,verify
from mounted_fin_candidate_r55 import MAX_ROOT_CONNECTION
from fin_mount_geometry_sweep_r50 import MAIN,FIN_PREFIX,MOUNT_PREFIX
from mount_shape_fit_r52 import joint_gap_world

REVISION="R62_original_refractory_real_R43_live_patina_contrast"
SOURCE_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
MATERIALS=("R19_chipped_black_refractory","R19_inner_oxidized_shingles")
MULTIPLIERS=(1.0,1.5,2.1,2.9)
RELIEF=(0.,-.04)

def get_materials():
    result={}
    for name in MATERIALS:
        mat=bpy.data.materials.get(name)
        if mat is None or not mat.use_nodes:
            raise RuntimeError("R62 original R19 physical material missing: "+name)
        shader=mat.node_tree.nodes.get("Principled BSDF")
        if shader is None or float(shader.inputs["Emission Strength"].default_value)!=0.:
            raise RuntimeError("R62 original refractory material was emissive")
        # R43/R44 link a live MULTIPLY patina node into the BSDF Base Color.
        # The Principled socket default is DORMANT while linked; changing it
        # renders pixel-identical PNGs (caught by private R62 analysis).
        # Calibrate the actual source-used shingle pigment input instead.
        if not shader.inputs["Base Color"].is_linked:
            raise RuntimeError("R62 requires R43/R44 linked original physical shader")
        live=mat.node_tree.nodes.get("R43_physical_base_color_times_patina")
        if live is None or live.type!="MIX_RGB":
            raise RuntimeError("R62 source R43 active pigment node missing")
        rgba=tuple(live.inputs["Color1"].default_value)
        result[name]=(mat,rgba,tuple(mat.diffuse_color),
                      float(shader.inputs["Metallic"].default_value),
                      float(shader.inputs["Roughness"].default_value))
    return result

def shade_shingles(original,multiplier):
    for name,(mat,rgba,diffuse,metallic,roughness) in original.items():
        shader=mat.node_tree.nodes["Principled BSDF"]
        new=tuple(min(.80,rgba[i]*multiplier) for i in range(3))+(rgba[3],)
        # The LIVE Color1 node feeds the R44 blended object patina path.
        # Never manipulate the dormant linked Principled input.
        mat.node_tree.nodes["R43_physical_base_color_times_patina"].inputs[
            "Color1"].default_value=new
        mat.node_tree.update_tag()
        mat.diffuse_color=new
        if (float(shader.inputs["Emission Strength"].default_value)!=0. or
            float(shader.inputs["Metallic"].default_value)!=metallic or
            float(shader.inputs["Roughness"].default_value)!=roughness):
            raise RuntimeError("R62 cannot change lighting model or metallic roughness")

def run(out):
    src=out/"test-04-vanilla-approx"/"physically-connected-fin-r58"/"source_connected_hanging_fins_r58.blend"
    if not src.exists():raise RuntimeError("R62 requires real saved R58 source-connected model")
    baseline_sha=sha256(src.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(src))
    scene=bpy.context.scene
    if scene.get("fsc_r58_revision")!=R58_REV or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R62 wrong original Blender geometry")
    cam=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    verify(scene,cam)
    tiles,tile_materials=original_tiles(scene)
    original_shader=get_materials()
    physical_liner=bpy.data.objects[LINER]
    if not physical_liner.get("R11_open_no_endcaps") or len(physical_liner.data.polygons)!=480:
        raise RuntimeError("R62 must preserve original open nozzle")
    original_liner=tuple(tuple(v.co) for v in physical_liner.data.vertices)
    before_scene={o.name for o in scene.objects}
    old=(scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.render.filepath,
         scene.render.image_settings.file_format,
         scene.render.image_settings.color_mode,
         scene.cycles.samples,scene.frame_current)
    dest=out/"test-04-vanilla-approx"/"physical-shingle-materials-r62"
    dest.mkdir(parents=True,exist_ok=True)
    record={"revision":REVISION,"input_scene_sha256":baseline_sha,
            "source_reference_sha256":SOURCE_SHA256,
            "source_rgba_pixel_files_exported":False,
            "source_materials_reused_no_baked_texture":True,
            "actually_modified_R43_live_connected_patina_Color1":True,
            "original_live_R43_patina_pigments":{k:list(v[1]) for k,v in original_shader.items()},
            "original_metal_roughness_preserved":True,
            "variants":[]}
    try:
        scene.frame_set(1)
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=10
        for inset in RELIEF:
            shift_tiles(tiles,inset,inset)
            for multiplier in MULTIPLIERS:
                shade_shingles(original_shader,multiplier)
                scene.view_layers[0].update()
                rays=actual_first_hits(scene)
                png=f"inset_{inset:+.2f}_albedo_{multiplier:.1f}".replace("+","plus").replace("-","minus").replace(".","_")+".png"
                render(scene,dest/png)
                record["variants"].append({
                    "inward_original_R19_tile_relief":-inset,
                    "original_R19_albedo_linear_multiplier":multiplier,
                    "actual_native_png":png,
                    "nonemissive":True,
                    "first_hits":rays})
                print("R62_TRUE_NONEMISSIVE_R19_TILES",inset,multiplier,
                      rays["physical_near_tile_first_hits"],
                      rays["physical_mid_tile_first_hits"],flush=True)
    finally:
        for name,(mat,rgba,diffuse,metallic,roughness) in original_shader.items():
            shader=mat.node_tree.nodes["Principled BSDF"]
            mat.node_tree.nodes["R43_physical_base_color_times_patina"].inputs[
                "Color1"].default_value=rgba
            mat.node_tree.update_tag()
            mat.diffuse_color=diffuse
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
    record["verified_all_original_properties_restored"]=(
        all(tuple(mat.node_tree.nodes["R43_physical_base_color_times_patina"].inputs["Color1"].default_value)==rgba
            and tuple(mat.diffuse_color)==diff
            for name,(mat,rgba,diff,metallic,roughness) in original_shader.items())
        and all(all(max(abs(a-b) for a,b in zip(v.co,pt))<1e-6
                    for v,pt in zip(obj.data.vertices,pts))
                and obj.data.materials[0].name==tile_materials[name]
                for name,(obj,kind,pts) in tiles.items())
        and all(max(abs(a-b) for a,b in zip(v.co,pt))<1e-6
                for v,pt in zip(physical_liner.data.vertices,original_liner))
        and all(joint_gap_world(bpy.data.objects[f"{MOUNT_PREFIX}{i:02d}"],
                                bpy.data.objects[f"{FIN_PREFIX}{i:02d}"])<=MAX_ROOT_CONNECTION
                for i in MAIN)
        and tuple(float(v) for row in scene.camera.matrix_world for v in row)==cam
        and {o.name for o in scene.objects}==before_scene
        and sha256(src.read_bytes()).hexdigest()==baseline_sha)
    if not record["verified_all_original_properties_restored"]:
        raise RuntimeError("R62 failed to restore original R58 source material and geometry")
    (dest/"physical-shingle-albedo-sweep.json").write_text(
        json.dumps(record,indent=2)+"\n",encoding="utf8")
    print("R62_NATIVE_R58_UNMODIFIED",len(record["variants"]),flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--output",type=Path,required=True)
    args=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    run(args.output.resolve())
