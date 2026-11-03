"""R124 original-sprite central-fin shape revision, not another invented fin family.

Based on verified R123 real cylindrical central master, with the false R21
weighted normals already removed. Restore observed SOURCE geometry:
a pressed longitudinal central bead bounded by shallow real creases,
slightly curled rolled distal toe, tighter distal lateral silhouette
and mild independently formed outer metal edges. Every change happens
to physical 3D positions in ONE existing Blender fin mesh. No new
non-source mounts, no per-side custom fin geometry, no source sprites
ever published to CI. Original private source is the ONLY visual target.
"""
import argparse,hashlib,json,math,sys
from pathlib import Path
import bpy

ROOT=Path(__file__).resolve().parent
if str(ROOT) not in sys.path:sys.path.insert(0,str(ROOT))
import physical_cut_separate_source_fins_r107 as core
import source_original_straight_fin_recovery_r116 as coords
import central_true_curved_master_fin_r121 as r121
import inspect_real_round_center_normals_r123 as r123

SRC="r123_strong_pressed_spine_real_smooth_curved_normals.blend"
R123_REPORT="r123_actual_round_master_normals_and_isolated_3d.json"
FIN=core.FIN_PREFIX+"02"
COLS=17;ROWS=9;PER_SKIN=COLS*ROWS
CASES=(
 ("r123_rounded_spine_control",0.,False),
 ("r124_real_pressed_steel_fold_and_rolled_toe",.75,False),
 ("r124_stronger_forged_spine_and_rolled_tip",1.15,False),
 ("r124_pressed_3d_steel_with_source_dark_patina",.75,True),
)
def easing(t):
    t=max(0.,min(1.,t))
    return t*t*(3-2*t)
def gaussian(x,sigma):return math.exp(-.5*(x/sigma)**2)
def signatures(scene):
    return {"other_fins":r121.physical_signature(scene,(2,)),
            "engine_bell":r121.physical_bell_signature(scene),
            "lower_motion":core.lower_animated_fin_digest(scene),
            "camera":tuple(float(v) for row in scene.camera.matrix_world for v in row),
            "objects":{o.name for o in scene.objects},
            "other_mats":tuple((o.name,tuple(m.name for m in o.data.materials if m))
                               for o in scene.objects
                               if o.type=="MESH" and o.name!=FIN)}
def check_signatures(scene,original):
    current=signatures(scene)
    for key in original:
        if current[key]!=original[key]:
            raise RuntimeError("R124 changed protected 3D model "+key)
def geometry_stats(scene,fin):
    m=fin.data;levels={}
    for row in (0,2,4,6,8):
        pts=[]
        for col in (0,3,5,8,11,13,16):
            p=fin.matrix_world@m.vertices[row*COLS+col].co
            pts.append(coords.projected_pixel(scene,p))
        levels[str(row)]={
          "face_depth_m":list(map(lambda p:round(p[2],5),pts)),
          "x_pixels":list(map(lambda p:round(p[0],2),pts)),
          "y_pixels":list(map(lambda p:round(p[1],2),pts))}
    return levels
def physically_form_one_fin(scene,strength):
    fin=bpy.data.objects[FIN];mesh=fin.data
    if not fin.get("R123_round_master_real_smooth_surface_normals"):
        raise RuntimeError("R124 needs true original rounded master with correct smooth normals")
    if len(mesh.vertices)!=2*PER_SKIN or mesh.shape_keys:
        raise RuntimeError("R124 refuses old punched planar or animated fake master")
    if not core.manifold_edges(mesh)[0]:
        raise RuntimeError("R124 source metal must start as a closed 3D shell")
    before=[tuple(v.co) for v in mesh.vertices]
    world=fin.matrix_world
    inverse=world.inverted_safe()
    disp=0.
    for skin in (0,1):
        for row in range(ROWS):
            t=row/(ROWS-1)
            # Do NOT alter hinge root contact at row 0.
            body=easing(t/.22)*(1-easing((t-.80)/.18))
            toe=easing((t-.73)/.27)
            for col in range(COLS):
                u=2*col/(COLS-1)-1
                k=skin*PER_SKIN+row*COLS+col
                p=world@mesh.vertices[k].co
                x,y,depth=coords.projected_pixel(scene,p)
                # The pressed bead is bounded by two shallow forged groove
                # channels, forming an actual 3D crease, not painted stripes.
                rib=(.026*gaussian(u,.11)
                     -.014*gaussian(abs(u)-.245,.075))
                edge=.012*(abs(u)**6)
                # Unlike R108 melted cupping: these remain LOCAL, small
                # stamped-metal section adjustments with true volume.
                z_delta=strength*body*(rib+edge)
                z_delta+=strength*toe*(.029+.011*(1-u*u))
                # Toe tapers from the shared round master silhouette and
                # is asymmetrically coined at its outside edge.
                tx=x+strength*(5.2*(1-u)/2-1.1*(1+u)/2)*toe
                ty=y+strength*(1.1*(1-u*u)-.50)*toe
                target=coords.source_pixel_world(scene,tx,ty,depth+z_delta)
                newco=inverse@target
                if not all(math.isfinite(v) for v in newco):
                    raise RuntimeError("R124 curved metal surface nonfinite")
                disp=max(disp,math.dist(tuple(mesh.vertices[k].co),tuple(newco)))
                mesh.vertices[k].co=newco
    mesh.update()
    okay,edges=core.manifold_edges(mesh)
    if not okay or any(face.area<1e-11 for face in mesh.polygons):
        raise RuntimeError("R124 deform broke true closed master or metal depth")
    if strength>0 and disp<.005:
        raise RuntimeError("R124 physical form made no meaningful 3D change")
    fin["R124_real_formed_spine_twin_creases_and_rolled_toe"]=True
    fin["R124_original_source_visual_approval_pending"]=True
    return {"real_vertices":len(mesh.vertices),"real_faces":len(mesh.polygons),
            "physical_edge_count":edges,"real_max_vertex_displacement_m":round(disp,6),
            "formed_strength":strength,"original_fin_mesh_replaced":False,
            "continuous_two_skins_no_holes":True,"cross_sections":geometry_stats(scene,fin)}

def correct_patina_only_this_fin(fin):
    """3D object-space material, source-led steel temper without texture cards.

    The model's current flat pale gradient does not resemble the original's
    darker/scuffed metal. This diagnostic uses independent material COPIES
    so no other fin, bell or global material is silently changed.
    """
    unique=[]
    for original in list(fin.data.materials):
        if original is None:raise RuntimeError("R124 missing original fin material")
        material=original.copy()
        material.name="R124_FIN_ONLY_DARK_SOURCE_STEEL_"+original.name
        if not material.use_nodes:material.use_nodes=True
        nodes=material.node_tree.nodes
        links=material.node_tree.links
        shader=nodes.get("Principled BSDF")
        if shader is None:raise RuntimeError("R124 missing physically based material")
        attribute=nodes.get("R21_thermal_color_attribute")
        if attribute is None:
            attribute=nodes.new("ShaderNodeAttribute")
            attribute.attribute_name="R21_heat_tint"
        texcoord=nodes.new("ShaderNodeTexCoord")
        noise=nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value=18.0
        noise.inputs["Detail"].default_value=4.0
        noise.inputs["Roughness"].default_value=.67
        links.new(texcoord.outputs["Generated"],noise.inputs["Vector"])
        ramp=nodes.new("ShaderNodeValToRGB")
        ramp.color_ramp.elements[0].position=.20
        ramp.color_ramp.elements[0].color=(.38,.38,.40,1.)
        ramp.color_ramp.elements[1].position=.80
        ramp.color_ramp.elements[1].color=(.90,.86,.90,1.)
        links.new(noise.outputs["Fac"],ramp.inputs["Fac"])
        mix=nodes.new("ShaderNodeMixRGB")
        mix.blend_type="MULTIPLY"
        mix.inputs[0].default_value=1.
        links.new(attribute.outputs["Color"],mix.inputs[1])
        links.new(ramp.outputs["Color"],mix.inputs[2])
        final=nodes.new("ShaderNodeMixRGB")
        final.blend_type="MULTIPLY"
        final.inputs[0].default_value=1.
        final.inputs[2].default_value=(.62,.60,.66,1.)
        links.new(mix.outputs["Color"],final.inputs[1])
        for old_link in list(shader.inputs["Base Color"].links):
            links.remove(old_link)
        links.new(final.outputs["Color"],shader.inputs["Base Color"])
        shader.inputs["Metallic"].default_value=.38
        shader.inputs["Roughness"].default_value=.89
        unique.append(material)
    for i,mat in enumerate(unique):
        fin.data.materials[i]=mat
    fin["R124_physical_object_independent_scuffed_metal_only"]=True
    return {"source_material_slot_copies":len(unique),
            "patina_noise_object_space":True,
            "other_material_datablocks_changed":False}

def run(r123_dir,outdir):
    root=Path(r123_dir).resolve();original=json.loads((root/R123_REPORT).read_text())
    matching=[c for c in original["scenes"] if c["variant"]==
              "r123_strong_pressed_spine_real_smooth_curved_normals"]
    src=root/SRC
    if len(matching)!=1 or hashlib.sha256(src.read_bytes()).hexdigest()!=matching[0]["sha256"]:
        raise RuntimeError("R124 requires exact verified R123 one curved fin scene")
    out=Path(outdir).resolve();out.mkdir(parents=True,exist_ok=True)
    report={"revision":"R124","private_original_sprite_sha256":original["original_source_sha256"],
        "proprietary_source_in_public_CI":False,"original_source_visually_approved":False,
        "model_rule":"only ONE actual existing rounded 3D central fin is modified",
        "cases":[]}
    for tag,strength,patina in CASES:
        bpy.ops.wm.open_mainfile(filepath=str(src))
        scene=bpy.context.scene;scene.frame_set(1)
        baseline=signatures(scene)
        shape=physically_form_one_fin(scene,strength)
        material=correct_patina_only_this_fin(bpy.data.objects[FIN]) if patina else None
        bpy.context.view_layer.update()
        check_signatures(scene,baseline)
        frames={}
        for f in (1,33):
            scene.frame_set(f)
            name=tag+f"_original_camera_frame{f:02d}.png"
            r123.render_native(scene,out/name)
            frames[str(f)]=name
        scene.frame_set(1)
        macros={}
        for angle in (0,35,65):
            name=tag+f"_ONE_FIN_TRUE_3D_{angle:02d}_DEGREES.png"
            r123.inspect_true_one_fin(scene,out/name,angle)
            macros[str(angle)]=name
        check_signatures(scene,baseline)
        scene["fsc_r124_original_sprite_candidate"]=tag
        scene["fsc_r124_source_approved"]=False
        saved=out/(tag+".blend")
        bpy.ops.wm.save_as_mainfile(filepath=str(saved))
        bpy.ops.wm.open_mainfile(filepath=str(saved))
        scene=bpy.context.scene
        check_signatures(scene,baseline)
        m=bpy.data.objects[FIN].data
        if len(m.vertices)!=306 or not core.manifold_edges(m)[0]:
            raise RuntimeError("R124 metal master collapsed after Blender save")
        if scene.get("fsc_r124_original_sprite_candidate")!=tag:
            raise RuntimeError("R124 saved master variant lost")
        report["cases"].append({"tag":tag,"physical_master":shape,
             "independent_source_patina":material,
             "native_source_camera_frames":frames,"isolated_real_3d_macros":macros,
             "saved_editable_blend":saved.name,
             "sha256":hashlib.sha256(saved.read_bytes()).hexdigest(),
             "other_fins_bell_and_64_frame_motion_preserved":True,
             "private_original_appearance_approval_pending":True})
        (out/"r124_source_master_real_pressed_metal_and_toe.json").write_text(
            json.dumps(report,indent=2)+"\n")
        print("R124_TRUE_ROUND_ONE_FIN_SAVED_REOPENED",tag,flush=True)
    print("R124_SOURCE_SHEET_PRESSED_CONTOURS_PASSED__NEEDS_PRIVATE_ORIGINAL_VISUAL_COMPARISON",flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--r123-dir",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.r123_dir,a.out)
