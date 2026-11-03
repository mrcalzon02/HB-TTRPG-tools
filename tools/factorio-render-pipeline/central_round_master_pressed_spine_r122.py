"""R122: physically emboss the original central fin's NARROW pressed spine.
Input is the verified R121 actual round ONE-MASTER 3D shell, not old R120
punched rectangular sheet. Its curvature/outline remain unchanged; only
the small integrated original-source spine height and surface patina vary.
NO new hinge gizmos, no separate fin geometry, no made-up engine housing.
The private user original thruster sprite remains outside public Actions.
"""
import argparse,hashlib,json,math,sys
from pathlib import Path
import bpy
HERE=Path(__file__).resolve().parent
if str(HERE) not in sys.path:sys.path.insert(0,str(HERE))
import physical_cut_separate_source_fins_r107 as core
import source_original_straight_fin_recovery_r116 as coords
import central_true_curved_master_fin_r121 as earlier
START="central_master_round_40px_radius.blend"
REPORT="r121_cylindrical_canonical_master_and_rotated_copies.json"
MASTER=core.FIN_PREFIX+"02"
COLS=17;ROWS=9;NSKIN=COLS*ROWS
CASES=(
 ("round_master_no_pressed_spine_control",0.,1.),
 ("round_master_narrow_pressed_spine_025m",.025,1.),
 ("round_master_narrow_pressed_spine_055m",.055,1.),
 ("round_master_pressed_spine_035m_darker_metal",.035,.70),
)
def other_fin_3d_signature(scene):
    return earlier.physical_signature(scene,(2,))
def real_bell_3d_signature(scene):
    return earlier.physical_bell_signature(scene)
def emboss(master,scene,height,color_scale):
    mesh=master.data
    if len(mesh.vertices)!=2*NSKIN or mesh.shape_keys or not master.get("R121_one_true_rounded_master_with_zero_fake_slots"):
        raise RuntimeError("R122 requires exactly one previously verified ROUND real source fin")
    baseline=[tuple(v.co) for v in mesh.vertices]
    inv=master.matrix_world.inverted_safe()
    moved=0.
    for skin in range(2):
        for row in range(ROWS):
            t=row/(ROWS-1)
            # Raised plate fold begins below the two source beige hinge ears,
            # slowly fades toward the heat-blue rounded free tip.
            if t<.72:fade=1.-.35*(t/.72)
            else:fade=max(0.,.65*(1.-(t-.72)/.28))
            for col in range(COLS):
                u=2*col/(COLS-1)-1.
                # No pin-shaped spur or artificial R21 through-slot:
                # this is a smooth integrated longitudinal *rounded ridge*.
                bulge=height*fade*math.exp(-.5*(u/.135)**2)
                k=skin*NSKIN+row*COLS+col
                world=master.matrix_world@mesh.vertices[k].co
                x,y,z=coords.projected_pixel(scene,world)
                dest=coords.source_pixel_world(scene,x,y,z+bulge)
                co=inv@dest
                moved=max(moved,math.dist(tuple(mesh.vertices[k].co),tuple(co)))
                mesh.vertices[k].co=co
    mesh.update()
    if not core.manifold_edges(mesh)[0] or any(p.area<1e-11 for p in mesh.polygons):
        raise RuntimeError("R122 actually deformed source master into nonphysical 3D topology")
    attr=mesh.color_attributes.get("R21_heat_tint")
    if attr is None or len(attr.data)==0:
        raise RuntimeError("R122 lost original thermo-metal material support")
    if color_scale!=1.:
        for entry in attr.data:
            old=tuple(entry.color)
            entry.color=tuple(min(1.,old[k]*color_scale) for k in range(3))+(old[3],)
    master["R122_one_shared_master_spine_height_m"]=height
    master["R122_original_source_visual_approval_pending"]=True
    return {"actual_vertices":len(mesh.vertices),
        "true_physical_emboss_displacement_m":round(moved,6),
        "height_m":height,"thermal_color_value_scale":color_scale,
        "same_original_source_cylinder_radius_px":master.get("R121_radius_original_camera_pixels"),
        "real_closed_thickness":True}
def orbit(scene,path):
    earlier.oblique(scene,path)
def run(indir,outdir):
    root=Path(indir).resolve()
    prior=json.loads((root/REPORT).read_text())
    c=[case for case in prior["scenes"] if case["tag"]=="central_master_round_40px_radius"]
    src=root/START
    if len(c)!=1 or hashlib.sha256(src.read_bytes()).hexdigest()!=c[0]["sha256"]:
        raise RuntimeError("R122 needs verified R121 rounded ONE-master actual 3D source")
    out=Path(outdir).resolve();out.mkdir(parents=True,exist_ok=True)
    report={"revision":"R122",
        "private_original_source_sha256":earlier.SRC_SHA,
        "source_sprite_in_public_CI":False,
        "visual_original_source_approval_pending":True,
        "cases":[]}
    for tag,height,tint in CASES:
        bpy.ops.wm.open_mainfile(filepath=str(src))
        scene=bpy.context.scene;scene.frame_set(1)
        oldcamera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
        names={o.name for o in scene.objects}
        other=other_fin_3d_signature(scene)
        bell=real_bell_3d_signature(scene)
        lower=core.lower_animated_fin_digest(scene)
        fin=bpy.data.objects[MASTER]
        geom=emboss(fin,scene,height,tint)
        bpy.context.view_layer.update()
        if {o.name for o in scene.objects}!=names or other_fin_3d_signature(scene)!=other:
            raise RuntimeError("R122 changed other fin copies or created fake upper machine")
        if real_bell_3d_signature(scene)!=bell or core.lower_animated_fin_digest(scene)!=lower:
            raise RuntimeError("R122 changed original actual bell or animated lower fins")
        if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=oldcamera:
            raise RuntimeError("R122 moved source camera")
        native={}
        for frame in (1,33):
            scene.frame_set(frame)
            name=tag+f"_source_camera_frame{frame:02d}.png"
            earlier.render(scene,out/name)
            native[str(frame)]=name
        scene.frame_set(1)
        angled=tag+"_physical_cylinder_35deg.png"
        orbit(scene,out/angled)
        scene["fsc_r122_round_master_variant"]=tag
        scene["fsc_r122_source_approved"]=False
        saved=out/(tag+".blend")
        bpy.ops.wm.save_as_mainfile(filepath=str(saved))
        bpy.ops.wm.open_mainfile(filepath=str(saved))
        scene=bpy.context.scene
        if scene.get("fsc_r122_round_master_variant")!=tag or not core.manifold_edges(bpy.data.objects[MASTER].data)[0]:
            raise RuntimeError("R122 physical central master not saved/reopened")
        if other_fin_3d_signature(scene)!=other or real_bell_3d_signature(scene)!=bell:
            raise RuntimeError("R122 copied fin or bell altered in saved scene")
        if core.lower_animated_fin_digest(scene)!=lower:
            raise RuntimeError("R122 lower animation changed")
        report["cases"].append({"variant":tag,
             "master_true_3d_formed_spine":geom,
             "source_shape_visually_approved":False,
             "original_camera_renders":native,
             "angled_physical_view":angled,
             "editable_blend":saved.name,
             "sha256":hashlib.sha256(saved.read_bytes()).hexdigest()})
        (out/"r122_real_master_source_cylinder_spine_cases.json").write_text(json.dumps(report,indent=2)+"\n")
        print("R122_ONE_ROUND_CENTRAL_SOURCE_SPINE_SAVED",tag,flush=True)
    print("R122_PHYSICAL_CYLINDRICAL_SPINE_SOURCE_CANDIDATES_PASS_PENDING_SOURCE_VISUAL_SELECTION",flush=True)
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--r121-dir",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.r121_dir,a.out)
