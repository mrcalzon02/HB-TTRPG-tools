"""R127 remove the *real 3D lengthwise curl* in the master fin.

R126 corrected only source-camera X/Y taper and asymmetric hooked tip.
The 35-degree Blender macro still revealed a S-shaped sweep BACKWARD in
camera depth along the fin length. R121 had inherited nonuniform 3D depth
from R107/R116's individually hand-shaped former fins. It is NOT the
authentic fairly square-edge forged fin. Keep cross-sectional cylinder
and stamped ridge, but correct longitudinal DEPTH of the same 3D master.

For each axial station measure average of both physical skin edges, not
the raised central stamped ridge. Replace that old bent centerline with
straight constant-depth or gently raked centerline (three controls).
Every cross-section of both skins is translated by SAME amount; hence
curved face, pressed metal, thickness, real toe and source X/Y edges
remain unchanged. No ancient hinge parts or separate fin modeling.
"""
import argparse,hashlib,json,sys,math
from pathlib import Path
import bpy
HERE=Path(__file__).resolve().parent
if str(HERE) not in sys.path:sys.path.insert(0,str(HERE))
import physical_cut_separate_source_fins_r107 as core
import source_original_straight_fin_recovery_r116 as coord
import central_true_curved_master_fin_r121 as r121
import inspect_real_round_center_normals_r123 as views

MASTER=core.FIN_PREFIX+"02"
SRC="r126_original_nearly_parallel_square_plate.blend"
UPSTREAM="r126_source_square_plate_fin_real_3d.json"
ROWS=9;COLS=17;SKIN=ROWS*COLS
CASES=(
 ("r126_source_square_profile_inherited_axial_curl_control",None),
 ("r127_square_plate_no_axial_curl",0.),
 ("r127_square_plate_mild_original_root_rake_025",.25),
 ("r127_square_plate_half_old_root_rake_050",.50),
)
def signatures(scene):
    return {
        "other_fins":r121.physical_signature(scene,(2,)),
        "engine_bell":r121.physical_bell_signature(scene),
        "lower_fin_64_frame_motion":core.lower_animated_fin_digest(scene),
        "camera":tuple(float(x) for row in scene.camera.matrix_world for x in row),
        "object_names":{o.name for o in scene.objects},
        "other_material_slots":tuple((o.name,tuple(m.name for m in o.data.materials if m))
            for o in scene.objects if o.type=="MESH" and o.name!=MASTER)}
def verify(scene,baseline):
    for key,v in baseline.items():
        if signatures(scene)[key]!=v:
            raise RuntimeError("R127 changed original bell/other fins/camera/anim "+key)
def camera_depth(scene,fin,index):
    p=fin.matrix_world@fin.data.vertices[index].co
    return coord.projected_pixel(scene,p)[2]
def row_edge_mean_depth(scene,fin,row):
    indices=[s*SKIN+row*COLS+c for s in (0,1) for c in (0,COLS-1)]
    return sum(camera_depth(scene,fin,i) for i in indices)/4.
def source_xy(scene,fin):
    # For both metal skins, check all original screen-plane coordinates
    # exactly, not merely root and tip.
    return [coord.projected_pixel(scene,fin.matrix_world@v.co)[:2] for v in fin.data.vertices]
def real_depth_repair(scene,fin,fraction):
    mesh=fin.data
    if not fin.get("R126_true_3d_slightly_curved_face_but_squarish_outline"):
        raise RuntimeError("R127 requires square source silhouette before fixing old 3D depth")
    if len(mesh.vertices)!=306 or mesh.shape_keys or not core.manifold_edges(mesh)[0]:
        raise RuntimeError("R127 doesn't accept flat or broken metal fin")
    camera_xy=source_xy(scene,fin)
    before=[row_edge_mean_depth(scene,fin,r) for r in range(ROWS)]
    start=before[0]
    end=before[-1]
    old_lengthwise_rake=end-start
    inv=fin.matrix_world.inverted_safe()
    maxmove=0.
    for row in range(ROWS):
        t=row/(ROWS-1)
        # Every cross-section's FOUR edge depths get same translation,
        # and all 17 columns of both skins follow; no false mesh curl.
        target=start+fraction*old_lengthwise_rake*t
        delta=target-before[row]
        for skin in (0,1):
            for col in range(COLS):
                k=skin*SKIN+row*COLS+col
                old=fin.matrix_world@mesh.vertices[k].co
                x,y,z=coord.projected_pixel(scene,old)
                dest=inv@coord.source_pixel_world(scene,x,y,z+delta)
                maxmove=max(maxmove,math.dist(tuple(mesh.vertices[k].co),tuple(dest)))
                mesh.vertices[k].co=dest
    mesh.update()
    after=[row_edge_mean_depth(scene,fin,r) for r in range(ROWS)]
    if not core.manifold_edges(mesh)[0] or any(p.area<1e-11 for p in mesh.polygons):
        raise RuntimeError("R127 straightening axial centerline broke real 3D fin volume")
    if maxmove<.005:
        raise RuntimeError("R127 axial depth correction was insignificant; no work done")
    deviation=max(abs(after[i]-(start+fraction*old_lengthwise_rake*(i/(ROWS-1))))
                  for i in range(ROWS))
    if deviation>.0001:raise RuntimeError("R127 real 3D fin still has nonlinearly bent axial spine")
    after_xy=source_xy(scene,fin)
    err=max(math.dist(a,b) for a,b in zip(camera_xy,after_xy))
    if err>.001:raise RuntimeError("R127 altered source-square image silhouette while changing camera depth")
    fin["R127_axial_3d_centerline_straight_rake_fraction"]=fraction
    fin["R127_original_cross_section_curvature_preserved"]=True
    fin["R127_shape_source_approval_pending"]=True
    return {
       "actual_two_skin_3d_mesh_vertices":len(mesh.vertices),
       "real_max_physical_3d_displacement_m":round(maxmove,6),
       "old_row_edge_center_depths":[round(z,6) for z in before],
       "new_row_edge_center_depths":[round(z,6) for z in after],
       "old_root_to_toe_rake_depth_m":round(old_lengthwise_rake,6),
       "new_root_to_toe_rake_depth_m":round(after[-1]-after[0],6),
       "remaining_non_linear_axial_depth_error_m":round(deviation,7),
       "native_source_camera_silhouette_max_shift_px":round(err,7),
       "real_camera_depth_of_all_cross_sections_changed":True,
       "original_round_front_and_back_cross_section_preserved":True,
       "square_end_and_nearly_parallel_outline_preserved":True,
       "original_source_approved":False}
def run(indir,outdir):
    root=Path(indir).resolve();prior=json.loads((root/UPSTREAM).read_text())
    c=[case for case in prior["cases"] if case["name"]=="r126_original_nearly_parallel_square_plate"]
    src=root/SRC
    if len(c)!=1 or hashlib.sha256(src.read_bytes()).hexdigest()!=c[0]["sha256"]:
        raise RuntimeError("R127 requires successful exact source-square R126 Blender master")
    out=Path(outdir).resolve();out.mkdir(parents=True,exist_ok=True)
    report={"revision":"R127",
        "private_original_source_sha256":prior["private_original_sha256"],
        "private_original_bitmap_uploaded_to_GitHub":False,
        "original_sprite_approval_pending":True,
        "physical_repair_target":"3D axial centerline sweep, not arched cross-sectional metal form",
        "cases":[]}
    for tag,slope in CASES:
        bpy.ops.wm.open_mainfile(filepath=str(src))
        scene=bpy.context.scene;scene.frame_set(1)
        baseline=signatures(scene)
        fin=bpy.data.objects[MASTER]
        diag=real_depth_repair(scene,fin,slope) if slope is not None else None
        verify(scene,baseline)
        photos={}
        for f in (1,33):
            scene.frame_set(f)
            name=tag+f"_original_camera_frame{f:02d}.png"
            views.render_native(scene,out/name)
            photos[str(f)]=name
        scene.frame_set(1)
        angled={}
        for angle in (0,35,65):
            name=tag+f"_physical_3d_fin_{angle:02d}deg.png"
            views.inspect_true_one_fin(scene,out/name,angle)
            angled[str(angle)]=name
        verify(scene,baseline)
        scene["fsc_r127_source_square_axial_centerline"]=tag
        scene["fsc_r127_original_appearance_approved"]=False
        saved=out/(tag+".blend")
        bpy.ops.wm.save_as_mainfile(filepath=str(saved))
        bpy.ops.wm.open_mainfile(filepath=str(saved))
        scene=bpy.context.scene
        verify(scene,baseline)
        if scene.get("fsc_r127_source_square_axial_centerline")!=tag:
            raise RuntimeError("R127 Blender file did not preserve real depth correction")
        if not core.manifold_edges(bpy.data.objects[MASTER].data)[0]:
            raise RuntimeError("R127 real round fin isn't still 3D solid")
        report["cases"].append({
            "name":tag,"real_axial_bend_correction":diag,
            "original_camera_renders":photos,
            "isolated_3d_render_angles":angled,
            "editable_blend":saved.name,
            "sha256":hashlib.sha256(saved.read_bytes()).hexdigest(),
            "all_other_fins_bell_and_motion_intact":True,
            "visual_original_approval_pending":True})
        (out/"r127_squarish_fin_true_3d_axial_curl_repair.json").write_text(
            json.dumps(report,indent=2)+"\n",encoding="utf8")
        print("R127_REAL_ROUND_METAL_AXIAL_STRAIGHTENED_SAVED",tag,flush=True)
    print("R127_REAL_FIN_SOURCE_SQUARE_CROSS_SECTION_PRESERVED_AND_AXIAL_BEND_CORRECTED__VISUAL_APPROVAL_PENDING",flush=True)
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--r126-dir",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.r126_dir,a.out)
