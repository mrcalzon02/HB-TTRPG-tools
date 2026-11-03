"""R126 correct the wrongly CURLED source fin silhouette without flattening its
TRUE 3D curved cross-section or touching the remaining engine and fins.

User observed source fin is a fairly square-edged metal plate. The error
originates in R121 profile ROOT=(110,329,153) to TIP=(121,392,150),
compounded by R124 toe x += .75*(5.2*(1-u)/2-1.1*(1+u)/2)*toe.
This gratuitous sideways shift created the recurring rightward hook.

Here retain single 306-vertex rounded finite-thickness center master,
actual R125 short pressed ridge and blue temper, but replace only the
*camera-plane X/Y profile* with almost parallel edges and a substantially
level, subtly rounded bottom end. Existing real physical camera depth and
two separate skins untouched, which is how a plate can have an arched face
WITHOUT a hooked/crescent outer silhouette.

Never upload user's private original Factorio sprite into public GitHub.
"""
import argparse,hashlib,json,math,sys
from pathlib import Path
import bpy
HERE=Path(__file__).resolve().parent
if str(HERE) not in sys.path:sys.path.insert(0,str(HERE))
import physical_cut_separate_source_fins_r107 as core
import source_original_straight_fin_recovery_r116 as coord
import central_true_curved_master_fin_r121 as r121
import inspect_real_round_center_normals_r123 as visual

MASTER=core.FIN_PREFIX+"02"
SRC="r125_short_stamped_center_and_original_blue_rolled_toe.blend"
REPORT="r125_one_cylindrical_fin_blue_rolled_toe_source_cases.json"
ROWS,COLS=9,17
PER_SKIN=ROWS*COLS
SOURCE_ROOT_Y=329.
SOURCE_TIP_Y=392.
ROOT_LEFT,ROOT_RIGHT=110.,153.
# Root and toe boundaries in ORIGINAL source-camera native pixels, not
# arbitrary 3D fin art. Original has near-parallel sides, near-level toe.
CASES=(
    ("r125_incorrect_hooked_fin_control",None),
    ("r126_square_full_width_plate", (110.,153.,.85)),
    ("r126_original_nearly_parallel_square_plate",(111.,152.,1.1)),
    ("r126_mild_symmetric_plate_taper",(112.,151.,1.1)),
)
def eased(t):
    t=max(0.,min(1.,t))
    return t*t*(3-2*t)
def protected(scene):
    return {
      "objects":{o.name for o in scene.objects},
      "camera":tuple(float(v) for row in scene.camera.matrix_world for v in row),
      "bell":r121.physical_bell_signature(scene),
      "all_other_fins":r121.physical_signature(scene,(2,)),
      "lower_64_frame_motion":core.lower_animated_fin_digest(scene),
      "other_material_names":[
        (ob.name,tuple(mat.name for mat in ob.data.materials if mat))
        for ob in sorted(scene.objects,key=lambda x:x.name)
        if ob.type=="MESH" and ob.name!=MASTER
      ],
    }
def validate(scene,before):
    now=protected(scene)
    for key in before:
        if now[key]!=before[key]:
            raise RuntimeError("R126 damaged original preserved scene: "+key)
def edge_pixels(scene,fin):
    def pixel(k):
        return coord.projected_pixel(scene,fin.matrix_world@fin.data.vertices[k].co)
    return {str(row):{
        "left":list(round(v,3) for v in pixel(row*COLS)[:2]),
        "right":list(round(v,3) for v in pixel(row*COLS+COLS-1)[:2]),
        "center":list(round(v,3) for v in pixel(row*COLS+COLS//2)[:2]),
    } for row in (0,2,4,6,7,8)}
def straighten_master(scene,fin,toe):
    mesh=fin.data
    if len(mesh.vertices)!=2*PER_SKIN or mesh.shape_keys:
        raise RuntimeError("R126 requires exactly original R125 continuous 306 vertex single 3D master")
    if not fin.get("R121_one_true_rounded_master_with_zero_fake_slots"):
        raise RuntimeError("R126 refuses replaced geometry/old false slotted panel")
    if not core.manifold_edges(mesh)[0]:
        raise RuntimeError("R126 cannot straighten damaged unclosed 3D source metal")
    before=edge_pixels(scene,fin)
    old=[tuple(v.co) for v in mesh.vertices]
    inv=fin.matrix_world.inverted_safe()
    left_toe,right_toe,corner_radius=toe
    biggest=0.
    for skin in (0,1):
        for row in range(ROWS):
            t=row/(ROWS-1)
            # Straight generators; no R124 asymmetric shift and NO
            # creative R121 14px left-side taper. A real stamped plate.
            shift=eased(t)
            left=ROOT_LEFT+(left_toe-ROOT_LEFT)*shift
            right=ROOT_RIGHT+(right_toe-ROOT_RIGHT)*shift
            for col in range(COLS):
                u=col/(COLS-1)
                x=left*(1-u)+right*u
                # Almost straight end. Only soft, <=1.1 native-pixel end
                # corners; don't round entire bottom into a point!
                tip_round=eased((t-.84)/.16)
                corner=corner_radius*(abs(2*u-1)**12)*tip_round
                y=SOURCE_ROOT_Y+(SOURCE_TIP_Y-SOURCE_ROOT_Y)*t-corner
                index=skin*PER_SKIN+row*COLS+col
                original_world=fin.matrix_world@mesh.vertices[index].co
                _,_,camera_depth=coord.projected_pixel(scene,original_world)
                dest=coord.source_pixel_world(scene,x,y,camera_depth)
                new=inv@dest
                if not all(math.isfinite(v) for v in new):
                    raise RuntimeError("R126 projected source fin point nonfinite")
                biggest=max(biggest,math.dist(tuple(mesh.vertices[index].co),tuple(new)))
                mesh.vertices[index].co=new
    mesh.update()
    okay,count=core.manifold_edges(mesh)
    if not okay or any(face.area<1e-11 for face in mesh.polygons):
        raise RuntimeError("R126 straightening destroyed finite thickness or closed topology")
    after=edge_pixels(scene,fin)
    # Check source-frame silhouette — *geometry*, not color/pixel MAE.
    for rowdata in after.values():
        if rowdata["left"][0]>=rowdata["right"][0]:
            raise RuntimeError("R126 source upper/lower edges inverted")
    root=after["0"];end=after["8"]
    if abs(root["left"][0]-end["left"][0])>3.0 or abs(root["right"][0]-end["right"][0])>3.0:
        raise RuntimeError("R126 wrong hooked source shape persisted")
    if abs(end["left"][1]-end["right"][1])>2.0:
        raise RuntimeError("R126 fin tip is not square edged")
    if abs(end["center"][1]-end["left"][1])>2.0:
        raise RuntimeError("R126 fin end over-rounded, not plate-like")
    if biggest<.05:
        raise RuntimeError("R126 geometry change too small to correct old sideways hook")
    fin["R126_true_3d_slightly_curved_face_but_squarish_outline"]=True
    fin["R126_old_R124_lateral_curl_removed"]=True
    fin["R126_private_original_visual_approval_pending"]=True
    return {
        "max_physically_moved_vertex_m":round(biggest,6),
        "cross_section_camera_depth_untouched":True,
        "original_two_skin_closed_manifold":True,
        "actual_fin_vertices":len(mesh.vertices),
        "actual_fin_faces":len(mesh.polygons),
        "source_camera_edges_before":before,
        "source_camera_edges_after":after,
        "left_root_to_toe_delta_px":round(end["left"][0]-root["left"][0],4),
        "right_root_to_toe_delta_px":round(end["right"][0]-root["right"][0],4),
        "end_edge_levelness_delta_px":round(abs(end["left"][1]-end["right"][1]),4),
        "original_source_approved":False}
def run(indir,outdir):
    root=Path(indir).resolve()
    report=json.loads((root/REPORT).read_text())
    candidates=[c for c in report["scenes"] if c["tag"]==
        "r125_short_stamped_center_and_original_blue_rolled_toe"]
    src=root/SRC
    if len(candidates)!=1 or hashlib.sha256(src.read_bytes()).hexdigest()!=candidates[0]["sha256"]:
        raise RuntimeError("R126 exact R125 rounded one-master reference missing/changed")
    out=Path(outdir).resolve();out.mkdir(parents=True,exist_ok=True)
    results={"revision":"R126",
       "private_original_sha256":report["private_original_source_sha256"],
       "private_original_sprite_uploaded":False,
       "original_source_visual_approval_pending":True,
       "causal_defect":"R121 overly narrowed toe plus R124 asymmetric lateral toe shift",
       "cases":[]}
    for name,toe in CASES:
        bpy.ops.wm.open_mainfile(filepath=str(src))
        scene=bpy.context.scene;scene.frame_set(1)
        protected_state=protected(scene)
        fin=bpy.data.objects[MASTER]
        stats=straighten_master(scene,fin,toe) if toe is not None else None
        if not core.manifold_edges(fin.data)[0]:
            raise RuntimeError("R126 any central fin must remain 3D closed")
        validate(scene,protected_state)
        frames={}
        for f in (1,33):
            scene.frame_set(f)
            filename=name+f"_source_camera_frame{f:02d}.png"
            visual.render_native(scene,out/filename)
            frames[str(f)]=filename
        scene.frame_set(1)
        angles={}
        for a in (0,35,65):
            filename=name+f"_actual_round_plate_3d_{a:02d}deg.png"
            visual.inspect_true_one_fin(scene,out/filename,a)
            angles[str(a)]=filename
        validate(scene,protected_state)
        scene["fsc_r126_squarish_metal_outline_case"]=name
        scene["fsc_r126_appearance_source_approved"]=False
        blend=out/(name+".blend")
        bpy.ops.wm.save_as_mainfile(filepath=str(blend))
        bpy.ops.wm.open_mainfile(filepath=str(blend))
        scene=bpy.context.scene
        validate(scene,protected_state)
        if scene.get("fsc_r126_squarish_metal_outline_case")!=name:
            raise RuntimeError("R126 saved scene failed Blender reopen")
        if not core.manifold_edges(bpy.data.objects[MASTER].data)[0]:
            raise RuntimeError("R126 reopened squared fin isn't physically closed")
        results["cases"].append({
          "name":name,"physical_squarish_shape":stats,
          "original_camera_native_frames":frames,"isolated_real_3d_views":angles,
          "blender_editable_scene":blend.name,
          "sha256":hashlib.sha256(blend.read_bytes()).hexdigest(),
          "original_lower_motion_and_bell_preserved":True,
          "visual_approval_pending":True,
        })
        (out/"r126_source_square_plate_fin_real_3d.json").write_text(
            json.dumps(results,indent=2)+"\n",encoding="utf8")
        print("R126_ACTUAL_BLENDER_SQUARE_EDGED_CYLINDRICAL_MASTER_SAVED",name,flush=True)
    print("R126_SQUARISH_FIN_REAL_3D_MODEL_VERIFIED__SOURCE_VISUAL_REVIEW_PENDING",flush=True)
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--r125-dir",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.r125_dir,a.out)
