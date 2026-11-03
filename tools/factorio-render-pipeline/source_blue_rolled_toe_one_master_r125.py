"""R125: conclude the ONE rounded central master fin's forged pressed spine and
distinct saturated blue/bright rolled lip based on PRIVATE original Factorio
sprite at native 264x542. No per-fin resculpting, no fake hinge/upper
mechanics, no original Wube pixels uploaded to public GitHub/Actions.

R124 proved the actual 3D depth and tapered outline; source still has a
shorter pressed central bead (dies out mid-body), mottled purple steel body
and a vivid short cobalt/violet temper band over a bright coined toe.
Keep R124 single-fin topology, only change real 3D surface and per-corner
thermal metal values on THIS central master. Preserve all 64 moving fins
world poses, real engine bell, camera and every unrelated material slot.
"""
import argparse,hashlib,json,math,sys
from pathlib import Path
import bpy
ROOT=Path(__file__).resolve().parent
if str(ROOT) not in sys.path:sys.path.insert(0,str(ROOT))
import physical_cut_separate_source_fins_r107 as core
import source_original_straight_fin_recovery_r116 as cam
import central_true_curved_master_fin_r121 as corefin
import inspect_real_round_center_normals_r123 as inspect
import refine_one_round_center_source_fin_r124 as prev

BASE="r124_pressed_3d_steel_with_source_dark_patina.blend"
PRIOR="r124_source_master_real_pressed_metal_and_toe.json"
MASTER=core.FIN_PREFIX+"02";COLS=17;ROWS=9;NSKIN=COLS*ROWS
CASES=(
  ("r124_dark_pressed_steel_control",False,False),
  ("r125_dark_original_steel_vivid_coined_cobalt_toe",False,True),
  ("r125_short_stamped_center_and_original_blue_rolled_toe",True,True),
)
def smooth(v):
    v=max(0.,min(1.,v))
    return v*v*(3.-2.*v)
def gaussian(x,s):
    return math.exp(-.5*(x/s)**2)
def pristine(scene):
    return {"bell":corefin.physical_bell_signature(scene),
       "other_fins":corefin.physical_signature(scene,(2,)),
       "lower_64_frame_motion":core.lower_animated_fin_digest(scene),
       "camera":tuple(float(q) for row in scene.camera.matrix_world for q in row),
       "objects":{o.name for o in scene.objects},
       "other_shader_slots":tuple((o.name,tuple(m.name for m in o.data.materials if m))
             for o in scene.objects if o.type=="MESH" and o.name!=MASTER)}
def validate(scene,before):
    later=pristine(scene)
    for key in before:
        if later[key]!=before[key]:
            raise RuntimeError("R125 accidentally changed protected "+key)
def shorten_true_3d_metal_crease(scene,fin):
    mesh=fin.data
    inv=fin.matrix_world.inverted_safe()
    delta_max=0.
    for skin in (0,1):
      for row in range(ROWS):
        t=row/(ROWS-1)
        # Visible source has a strong pressed spine starting near upper tabs
        # but its raised middle heel DIES OUT before the blue temper band.
        fade=smooth((t-.48)/.30)
        for j in range(COLS):
            u=2*j/(COLS-1)-1
            k=skin*NSKIN+row*COLS+j
            world=fin.matrix_world@mesh.vertices[k].co
            x,y,z=cam.projected_pixel(scene,world)
            # Remove the previous false full-length center protrusion
            # progressively; never change the correct 3D cylindrical arc.
            depth_delta=-.022*fade*gaussian(u,.16)
            # Form a short round termination at the bead heel instead of a
            # constant-width strip reaching all the way to the toe.
            depth_delta+=.012*gaussian(t-.55,.115)*gaussian(u,.14)
            new=inv@cam.source_pixel_world(scene,x,y,z+depth_delta)
            delta_max=max(delta_max,math.dist(tuple(mesh.vertices[k].co),tuple(new)))
            mesh.vertices[k].co=new
    mesh.update()
    if not core.manifold_edges(mesh)[0] or any(p.area<1e-11 for p in mesh.polygons):
        raise RuntimeError("R125 physical metal ridge termination invalid")
    fin["R125_ridge_ends_above_blue_temper_band"]=True
    return {"max_real_3d_vertex_delta_m":round(delta_max,6),
            "physical_mesh_vertices":len(mesh.vertices),
            "original_cylindrical_surface_retained":True,
            "manifold":core.manifold_edges(mesh)[0]}

def blend(c0,c1,t):
    return tuple((1-t)*a+t*b for a,b in zip(c0,c1))
def source_temper(t,u):
    # A non-horizontal heat zone, not four fake flat material stripes.
    # Warm/stressed steel transitions through rose and violet before the
    # very narrow cobalt rolled free lip seen in the actual source.
    steel=(.40,.345,.395)
    anneal=(.62,.295,.365)
    blue=(.050,.100,.94)
    top_to_rose=smooth((t-.47)/.24)
    threshold=.78+.042*math.cos(math.pi*(u+.15)*1.55)
    to_blue=smooth((t-threshold)/.15)
    base=blend(steel,anneal,top_to_rose)
    base=blend(base,blue,to_blue)
    # genuine original has a brighter blue glint on the forged lower lip.
    toe=smooth((t-.96)/.04)
    glint=(.11,.65,1.)
    base=blend(base,glint,.65*toe)
    # Mottle is only shading detail; physical folds and lips are actual
    # 3D vertex geometry, and this requires no user-owned image texture.
    grain=1.-.07*math.sin(23*u+29*t)*math.sin(44*u-39*t)
    return tuple(min(1.,max(0.,v*grain)) for v in base)+(1.,)
def recolor_single_actual_master(fin):
    mesh=fin.data
    attr=mesh.color_attributes.get("R21_heat_tint")
    if attr is None or len(mesh.materials)!=4:
        raise RuntimeError("R125 actual heat-color mesh and material copies missing")
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            vi=mesh.loops[li].vertex_index%NSKIN
            row=vi//COLS
            col=vi%COLS
            t=row/(ROWS-1);u=2*col/(COLS-1)-1
            attr.data[li].color=source_temper(t,u)
    mesh.update()
    fin["R125_actual_blue_hot_rolled_toe_material"]=True
    return {"actual_face_corners_colored":len(attr.data),
            "single_master_thermal_attribute":"R21_heat_tint",
            "last_row_bright_blue":list(map(lambda x:round(x,4),source_temper(1.,0.))),
            "upper_aged_gray":list(map(lambda x:round(x,4),source_temper(.10,0.))),
            "original_source_sprite_is_private":True}

def run(indir,outdir):
    root=Path(indir).resolve()
    prior=json.loads((root/PRIOR).read_text())
    same=[item for item in prior["cases"]
          if item["tag"]=="r124_pressed_3d_steel_with_source_dark_patina"]
    source=root/BASE
    if len(same)!=1 or hashlib.sha256(source.read_bytes()).hexdigest()!=same[0]["sha256"]:
        raise RuntimeError("R125 requires exact verified R124 dark physically rounded master")
    out=Path(outdir).resolve();out.mkdir(parents=True,exist_ok=True)
    report={"revision":"R125", "private_original_source_sha256":prior["private_original_sprite_sha256"],
        "original_sprite_upload_to_public_CI":False,
        "visual_original_source_approved":False,
        "one_master_real_round_fin_only":True,"scenes":[]}
    for tag,sculpt,blue in CASES:
        bpy.ops.wm.open_mainfile(filepath=str(source))
        scene=bpy.context.scene;scene.frame_set(1)
        preserved=pristine(scene)
        fin=bpy.data.objects[MASTER]
        if len(fin.data.vertices)!=306 or not fin.get("R124_real_formed_spine_twin_creases_and_rolled_toe"):
            raise RuntimeError("R125 needs genuine one-master source-rounded 3D metal")
        forge=shorten_true_3d_metal_crease(scene,fin) if sculpt else None
        temper=recolor_single_actual_master(fin) if blue else None
        bpy.context.view_layer.update()
        validate(scene,preserved)
        native={}
        for f in (1,33):
            scene.frame_set(f)
            filename=tag+f"_source_frame{f:02d}.png"
            inspect.render_native(scene,out/filename)
            native[str(f)]=filename
        scene.frame_set(1)
        physical={}
        for a in (0,35,65):
            filename=tag+f"_isolated_real_3D_{a:02d}.png"
            inspect.inspect_true_one_fin(scene,out/filename,a)
            physical[str(a)]=filename
        validate(scene,preserved)
        scene["fsc_r125_original_shape_case"]=tag
        scene["fsc_r125_original_appearance_approved"]=False
        blendfile=out/(tag+".blend")
        bpy.ops.wm.save_as_mainfile(filepath=str(blendfile))
        bpy.ops.wm.open_mainfile(filepath=str(blendfile))
        scene=bpy.context.scene
        validate(scene,preserved)
        fin=bpy.data.objects[MASTER]
        if fin.data.shape_keys or len(fin.data.vertices)!=306 or not core.manifold_edges(fin.data)[0]:
            raise RuntimeError("R125 single genuine rounded 3D metal fin lost after save")
        if scene.get("fsc_r125_original_shape_case")!=tag:
            raise RuntimeError("R125 saved Blender variant lost")
        report["scenes"].append({"tag":tag,"true_master_ridge_revision":forge,
           "actual_source_thermal_toe_revision":temper,
           "genuine_blender_source_camera_frames":native,
           "physical_macro_3d_views":physical,
           "editable_blender_scene":blendfile.name,
           "sha256":hashlib.sha256(blendfile.read_bytes()).hexdigest(),
           "restored_original_bell_other_fins_and_animation":True,
           "visual_source_match_unapproved":True})
        (out/"r125_one_cylindrical_fin_blue_rolled_toe_source_cases.json").write_text(
            json.dumps(report,indent=2)+"\n")
        print("R125_REAL_ONE_FIN_SOURCE_PRESSED_METAL_AND_BLUE_TOE_CASE_SAVED",tag,flush=True)
    print("R125_PHYSICAL_3D_CYLINDRICAL_SINGLE_MASTER_COMPLETE_NOT_VISUALLY_APPROVED",flush=True)
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--r124-dir",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    args=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(args.r124_dir,args.out)
