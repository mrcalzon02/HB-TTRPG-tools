"""R119 diagnostic: audit exactly what can be removed for fins+engine bell clean rebuild.

Do not automatically preserve broad invented sci-fi chassis, hinge plates,
pressure-roll arch, pipes, decorative greebles, arbitrary upper fittings.
Use existing saved R116 genuine 3D fin models (before rejected R114/R115),
the real nozzle assembly, true source camera, actual bottom-frame Blender
geometry owner bboxes. Emit owner inventory and three isolated previews.
Private user original sprite never enters public CI or public .blend.
"""
import argparse,hashlib,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector
HERE=Path(__file__).resolve().parent
if str(HERE) not in sys.path:sys.path.insert(0,str(HERE))
import physical_cut_separate_source_fins_r107 as core
import source_original_straight_fin_recovery_r116 as r116

BASE="original_straight_sharp_fin_main_three.blend"
SRC_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
R19="R19_EDITABLE_OPEN_CONE_INTERIOR"
BELL_NAMES={
  "vanilla_reference_bell_bronzed_rolled_bell",
  "R11_OPEN_DEEP_REFRACTORY_THROAT",
  "R08_aft_internal_reaction_drum"
}
# Intentionally exclude broad "nozzle", "rim", "baffle", "fins" string
# matching: those terms are also used for visually incorrect peripherals.
EXTRAS=("R19_cone", "R39_physically_fluted", "R42_")

def bounds(scene,ob):
    if ob.type not in {"MESH","CURVE"}:return None
    if ob.type=="MESH":
        pts=[ob.matrix_world@v.co for v in ob.data.vertices]
    else:
        pts=[ob.matrix_world@Vector(x) for x in ob.bound_box]
    if not pts:return None
    xy=[r116.projected_pixel(scene,p) for p in pts]
    return [round(min(p[0] for p in xy),2),round(min(p[1] for p in xy),2),
            round(max(p[0] for p in xy),2),round(max(p[1] for p in xy),2)]
def render(scene,out):
    scene.render.resolution_x,scene.render.resolution_y=core.NATIVE
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
    scene.render.filepath=str(out)
    bpy.ops.render.render(write_still=True)
    if not out.is_file() or out.stat().st_size<5000:raise RuntimeError("R119 Blender render absent")

def run(root,out):
    root=Path(root).resolve()
    report=json.loads((root/"r116_source_real_3d_straight_blunt_fin_candidates.json").read_text())
    candidates=[c for c in report["cases"] if c["variant"]=="original_straight_sharp_fin_main_three"]
    src=root/BASE
    if len(candidates)!=1 or hashlib.sha256(src.read_bytes()).hexdigest()!=candidates[0]["sha256"]:
        raise RuntimeError("R119 original full model changed from R116 verified candidate")
    bpy.ops.wm.open_mainfile(filepath=str(src))
    scene=bpy.context.scene;scene.frame_set(1)
    if scene.camera.data.type!="ORTHO":
        raise RuntimeError("R119 original source camera missing")
    out=Path(out).resolve();out.mkdir(parents=True,exist_ok=True)
    native={}
    col=bpy.data.collections.get(R19)
    r19={o.name for o in col.objects} if col else set()
    for ob in scene.objects:
        if ob.type not in {"MESH","CURVE"}:continue
        b=bounds(scene,ob)
        native[ob.name]={
          "type":ob.type,"bbox_native_source_camera":b,
          "vertices":len(ob.data.vertices) if ob.type=="MESH" else None,
          "render_hidden_at_input":ob.hide_render,
          "collections":[c.name for c in ob.users_collection],
          "is_original_fin":ob.name.startswith(core.FIN_PREFIX),
          "is_named_bell":ob.name in BELL_NAMES,
          "is_original_inner_cone":ob.name in r19,
          "is_later_outer_bell_detail":ob.name.startswith(EXTRAS),
          "is_spatial_bell_candidate":(
             b is not None and b[1]>=368 and b[3]>=415 and b[0]>=-45 and b[2]<=310
          )
        }
    if len([k for k,v in native.items() if v["is_original_fin"]])!=10:
        raise RuntimeError("R119 missing actual source animated 10 metal fins")
    for n in BELL_NAMES:
        if n not in native:
            raise RuntimeError("R119 missing real engine bell key mesh: "+n)
    print("R119_SCENE_MESH_OWNER_COUNT",len(native),flush=True)
    print("R119_RENDER_VISIBLE_NAMES_AND_BOUNDS",json.dumps([
        [n,v["bbox_native_source_camera"]] for n,v in native.items()
        if not v["render_hidden_at_input"]],indent=2),flush=True)
    old_hidden={n:bpy.data.objects[n].hide_render for n in native}
    def isolate(tag,choose):
        for name,prev in old_hidden.items():
            bpy.data.objects[name].hide_render=prev or not choose(name,native[name])
        scene.frame_set(1)
        render(scene,out/(tag+"_source_camera_frame01.png"))
        scene.frame_set(33)
        render(scene,out/(tag+"_source_camera_frame33.png"))
        scene.frame_set(1)
        return [n for n in native if not bpy.data.objects[n].hide_render]
    try:
        full=isolate("full_original_model_control",lambda n,v:True)
        minimal=isolate("only_genuine_fins_and_named_bell",lambda n,v:
            v["is_original_fin"] or v["is_named_bell"] or v["is_original_inner_cone"])
        extended=isolate("fins_bell_and_spatial_lower_3d_parts",lambda n,v:
            v["is_original_fin"] or v["is_named_bell"] or v["is_original_inner_cone"]
            or v["is_spatial_bell_candidate"])
    finally:
        for name,hidden in old_hidden.items():bpy.data.objects[name].hide_render=hidden
    out_report={"revision":"R119 source-authoritative scrap-existing-hinge planning",
       "original_private_sha256":SRC_SHA,
       "source_sprite_never_exported":True,
       "replacement_hinge_geometry_created":False,
       "native_source_camera_resolution":list(core.NATIVE),
       "baseline_model":BASE,
       "preserved_original_moving_fins":len([v for v in native.values() if v["is_original_fin"]]),
       "scene_inventory":native,
       "candidates":{
           "full_original_model_control":full,
           "only_genuine_fins_and_named_bell":minimal,
           "fins_bell_and_spatial_lower_3d_parts":extended}
    }
    (out/"r119_exact_owner_inventory_and_cut_candidate.json").write_text(
      json.dumps(out_report,indent=2)+"\n",encoding="utf8")
    print("R119_SOURCE_BELL_AND_FIN_TRUE_3D_CLEAN_REBUILD_INVENTORY_PASS",flush=True)

if __name__=="__main__":
 p=argparse.ArgumentParser()
 p.add_argument("--r116-dir",type=Path,required=True)
 p.add_argument("--out",type=Path,required=True)
 a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
 run(a.r116_dir,a.out)
