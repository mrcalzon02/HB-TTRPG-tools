"""R120 clean reconstruction of ACTUAL 3D engine bell + fins with basic hinges.

User explicitly rejected the old assembly above the rounded bell:
  * SCRAP ALL old hinge arrangements and upper spaghetti/industrial clutter.
  * Preserve existing corrected real metal fins and open engine bell.
  * Restart hinges as THREE simple root-registered finite 3D forms.
  * Original private Factorio sprite is the sole appearance authority;
    compare source locally, never upload it to public CI.

All changes are in NEW editable .blend candidates based on verified R116,
not an overwrite of any original or historical variant. Compare (1) bare,
(2) three clean single pads, (3) same pads plus individual simple axles.
No extra fictional body, collar, pumps, valves, pips, blocks on top.
"""
import argparse,hashlib,json,math,sys
from pathlib import Path
from mathutils import Matrix,Vector
import bpy

HERE=Path(__file__).resolve().parent
if str(HERE) not in sys.path:sys.path.insert(0,str(HERE))
import physical_cut_separate_source_fins_r107 as core
import source_original_straight_fin_recovery_r116 as r116
import strip_to_bell_fin_inventory_r119 as base

REV="R120_bare_original_bell_ten_fins_clean_three_basic_hinges"
SOURCE_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
INPUT=base.BASE
MAIN=(1,2,3)
FRAMES=(1,33)
CASES=(
 ("bare_original_bell_and_ten_metal_fins",False,False),
 ("three_simple_forged_root_pads",True,False),
 ("three_basic_pads_and_plain_pivot_axles",True,True)
)
PRESERVE_EXACT={
 "vanilla_reference_bell_bronzed_rolled_bell",
 "vanilla_reference_bell_rolled_lip",
 "R08_aft_internal_reaction_drum",
 "R11_OPEN_DEEP_REFRACTORY_THROAT"
}
INNER_LINER_PREFIX="vanilla_reference_bell_longitudinal_inner_liner_"
FORBIDDEN_PREFIXES=(
 "R49_BESPOKE_CAST_MOUNT_", "R89_SOURCE_FITTED_",
 "R08_black_exhaust_pressure_roll", "R113", "R114", "R115",
)
# No arbitrary retained body/rings, root pads, faux hinge, pressure pipes.
# All lower cone tiles in this original source collection are TRUE bell
# interior, not upper scaffolding.
INNER_COLLECTION="R19_EDITABLE_OPEN_CONE_INTERIOR"

def kept_names(scene):
    inner=bpy.data.collections.get(INNER_COLLECTION)
    if inner is None or len(inner.objects)!=160:
        raise RuntimeError("R120 original 160 physical bell interior elements absent")
    keep={ob.name for ob in inner.objects}
    keep.update(PRESERVE_EXACT)
    keep.update(ob.name for ob in scene.objects
        if ob.name.startswith((core.FIN_PREFIX,INNER_LINER_PREFIX)))
    if len([n for n in keep if n.startswith(core.FIN_PREFIX)])!=10:
        raise RuntimeError("R120 source ten fin meshes incomplete")
    for name in PRESERVE_EXACT:
        if name not in bpy.data.objects:
            raise RuntimeError("R120 original physical bell piece missing: "+name)
    if not any(n.startswith(INNER_LINER_PREFIX) for n in keep):
        raise RuntimeError("R120 source bell longitudinal internal forms missing")
    return keep

def fin_mesh_signature(scene):
    h=hashlib.sha256()
    for index in range(10):
        fin=bpy.data.objects[core.FIN_PREFIX+f"{index:02d}"]
        if fin.type!="MESH":
            raise RuntimeError("R120 original fin not a physical Blender solid")
        h.update(fin.name.encode())
        h.update(repr([tuple(v.co) for v in fin.data.vertices]).encode())
        h.update(repr([tuple(p.vertices) for p in fin.data.polygons]).encode())
        h.update(repr([m.name if m else None for m in fin.data.materials]).encode())
        h.update(repr(fin.parent.name if fin.parent else None).encode())
    return h.hexdigest()

def motion_matrix_signature(scene):
    original=scene.frame_current
    h=hashlib.sha256()
    try:
        for frame in range(1,65):
            scene.frame_set(frame)
            for index in range(10):
                fin=bpy.data.objects[core.FIN_PREFIX+f"{index:02d}"]
                h.update(repr(tuple(round(x,7) for row in fin.matrix_world for x in row)).encode())
    finally:
        scene.frame_set(original)
    return h.hexdigest()

def camera_rect(scene,ob):
    points=[r116.projected_pixel(scene,ob.matrix_world@v.co) for v in ob.data.vertices]
    return [round(min(p[0] for p in points),3),round(min(p[1] for p in points),3),
            round(max(p[0] for p in points),3),round(max(p[1] for p in points),3)]

def validate_clean(scene,keep,old_camera,original_motion,original_world,original_mesh,original_material):
    remaining={ob.name for ob in scene.objects if ob.type in {"MESH","CURVE"}}
    if not keep.issubset(remaining):
        raise RuntimeError("R120 cut actual original fin or bell part from source model")
    if any(name.startswith(FORBIDDEN_PREFIXES) for name in remaining):
        raise RuntimeError("R120 old alien hinge/collar geometry survived cleanup")
    if scene.camera is None or tuple(float(x) for row in scene.camera.matrix_world for x in row)!=old_camera:
        raise RuntimeError("R120 original orthographic source camera lost")
    if fin_mesh_signature(scene)!=original_mesh:
        raise RuntimeError("R120 melted/rebuilt source-corrected real original fin geometry")
    if core.lower_animated_fin_digest(scene)!=original_motion:
        raise RuntimeError("R120 original lower 64-frame fin motion damaged")
    if motion_matrix_signature(scene)!=original_world:
        raise RuntimeError("R120 original fin-world motion changed while scrapping topology")
    for name in keep:
        ob=bpy.data.objects[name]
        if ob.type=="MESH" and ob.data and ob.data.materials:
            if [x.name if x else None for x in ob.data.materials]!=original_material[name]:
                raise RuntimeError("R120 source retained bell/fin shader slot changed "+name)
    return remaining

def source_pad(scene,fin_index,material):
    fin=bpy.data.objects[core.FIN_PREFIX+f"{fin_index:02d}"]
    if len(fin.data.vertices)!=198 or not fin.get("R116_source_original_outline_real_solid"):
        raise RuntimeError("R120 needs the actual R116 original-thruster-based two-skin finite metal fin")
    # Original physical root is row0 of the R107-cut sheet, NOT a guessed
    # cylinder assembled 100 pixels above the source fin. Derive exact
    # source-camera root corners and real 3D front/back thickness.
    skin=99
    root_world=[fin.matrix_world@fin.data.vertices[k].co
                for k in list(range(11))+list(range(skin,skin+11))]
    roots=[r116.projected_pixel(scene,p) for p in root_world]
    left=roots[0];right=roots[10]
    x0=min(left[0],right[0]);x1=max(left[0],right[0])
    if not 15<x0<x1<250 or not 280<left[1]<425:
        raise RuntimeError("R120 hinge is not located at actual source upper fin root")
    # Axle lies on the existing 3D metal sheet's root; the basic mounting
    # pad is only a single simple cast bar overlapping that boundary.
    thick_front=max(p[2] for p in roots)+.035
    thick_back=min(p[2] for p in roots)-.055
    upper_y=min(left[1],right[1])-5.5
    lower_y=max(left[1],right[1])+2.0
    # Real physical volumetric rectangular solid in original camera plane.
    pix=[(x0-1.5,upper_y),(x1+1.5,upper_y),
         (x1+1.5,lower_y),(x0-1.5,lower_y)]
    verts=[tuple(r116.source_pixel_world(scene,px,py,z))
           for z in (thick_front,thick_back) for px,py in pix]
    # Blender camera's projected y points down; reverse front face winding.
    faces=[(0,3,2,1),(4,5,6,7),(0,1,5,4),
           (1,2,6,5),(2,3,7,6),(3,0,4,7)]
    mesh=bpy.data.meshes.new(f"R120_HINGE_BASIC_PAD_REAL_3D_MESH_{fin_index:02d}")
    mesh.from_pydata(verts,[],faces);mesh.update()
    mesh.materials.append(material)
    ob=bpy.data.objects.new(f"R120_SIMPLE_SOURCE_FIN_ROOT_PAD_{fin_index:02d}",mesh)
    scene.collection.objects.link(ob)
    ob["R120_this_is_a_real_volumetric_3d_part"]=True
    ob["R120_all_coordinates_from_actual_unchanged_fin_root"]=True
    ob["R120_not_a_rotated_sprite_card"]=True
    if not core.manifold_edges(mesh)[0] or any(p.area<1e-11 for p in mesh.polygons):
        raise RuntimeError("R120 actual physical root pad not manifold")
    return {"fin_index":fin_index,"root_pixels":[list(map(lambda q:round(q,3),left[:2])),
                       list(map(lambda q:round(q,3),right[:2]))],
            "part_name":ob.name,
            "pad_projected_bbox":camera_rect(scene,ob),
            "pivot_axis_front_depth":thick_front,
            "pivot_axis_back_depth":thick_back,
            "pad_3d_vertices":len(mesh.vertices),
            "source_approved":False}

def source_axle(scene,pad,material):
    i=pad["fin_index"]
    f=bpy.data.objects[core.FIN_PREFIX+f"{i:02d}"]
    start,end=pad["root_pixels"]
    # One short, plain 12-sided pin across the TRUE sloping root edge.
    # No layered collars, false upper hinge box or surrounding greebles.
    x0,y0=start;x1,y1=end
    z0=pad["pivot_axis_front_depth"]-.025
    z1=pad["pivot_axis_back_depth"]+.025
    # The R120 first pin test was *completely invisible*: it sat behind
    # the pad's front plane. Project the one physical shaft just ahead of
    # that plane so we can SEE the actual axle on the source camera.
    # This is still exactly at the authentic fin ROOT, not a new guessed
    # upper chassis hinge location.
    center_z=pad["pivot_axis_front_depth"]+.035
    pxunit=(r116.source_pixel_world(scene,x0+1,y0,center_z)-
            r116.source_pixel_world(scene,x0,y0,center_z)).length
    radius_px=2.2
    n=12
    verts=[]
    for t in (0.,1.):
        x=x0+(x1-x0)*t
        y=y0+(y1-y0)*t-1.0
        for k in range(n):
            a=math.tau*k/n
            # radial section in screen-y and scene-depth axes; finite 3D.
            py=y+radius_px*math.sin(a)
            depth=center_z+radius_px*pxunit*math.cos(a)
            verts.append(tuple(r116.source_pixel_world(scene,x,py,depth)))
    faces=[]
    faces.append(tuple(range(n-1,-1,-1)))
    faces.append(tuple(range(n,n*2)))
    for k in range(n):
        j=(k+1)%n
        faces.append((k,j,n+j,n+k))
    mesh=bpy.data.meshes.new(f"R120_ROOT_SINGLE_SIMPLE_AXLE_MESH_{i:02d}")
    mesh.from_pydata(verts,[],faces);mesh.update()
    mesh.materials.append(material)
    ob=bpy.data.objects.new(f"R120_BASIC_HINGE_AXIS_{i:02d}",mesh)
    scene.collection.objects.link(ob)
    ob["R120_real_one_piece_cylindrical_pivot"]=True
    ob["R120_fin_index"]=i
    if not core.manifold_edges(mesh)[0] or any(p.area<1e-11 for p in mesh.polygons):
        raise RuntimeError("R120 single plain axle mesh isn't a real closed physical object")
    pin_front=max(r116.projected_pixel(scene,ob.matrix_world@v.co)[2]
                  for v in ob.data.vertices)
    return {"name":ob.name,"fin_index":i,"real_vertices":len(mesh.vertices),
            "frontmost_actual_3d_depth":round(pin_front,6),
            "pad_frontmost_3d_depth":round(pad["pivot_axis_front_depth"],6),
            "pin_protrudes_forward_from_pad":pin_front>pad["pivot_axis_front_depth"],
            "source_approved":False}

def material():
    mat=bpy.data.materials.get("R120_BARE_ORIGINAL_SOURCE_HINGE_METAL")
    if mat:return mat
    mat=bpy.data.materials.new("R120_BARE_ORIGINAL_SOURCE_HINGE_METAL")
    mat.use_nodes=True
    shader=mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value=(.36,.36,.34,1.)
    shader.inputs["Metallic"].default_value=.52
    shader.inputs["Roughness"].default_value=.67
    mat.diffuse_color=(.36,.36,.34,1.)
    return mat

def pin_material():
    mat=bpy.data.materials.get("R120_SINGLE_EXPOSED_PIN_DARK_STEEL")
    if mat:return mat
    mat=bpy.data.materials.new("R120_SINGLE_EXPOSED_PIN_DARK_STEEL")
    mat.use_nodes=True
    shader=mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value=(.095,.10,.105,1.)
    shader.inputs["Metallic"].default_value=.64
    shader.inputs["Roughness"].default_value=.56
    mat.diffuse_color=(.095,.10,.105,1.)
    return mat

def oblique(scene,path):
    old=scene.camera;data=old.data.copy()
    cam=bpy.data.objects.new("R120_SOURCE_ONLY_TEMP_OBLIQUE_35",data)
    scene.collection.objects.link(cam)
    try:
        cam.matrix_world=Matrix.Rotation(math.radians(35),4,"Y")@old.matrix_world
        scene.camera=cam
        bpy.context.view_layer.update()
        core.render(scene,path)
    finally:
        scene.camera=old
        bpy.data.objects.remove(cam,do_unlink=True)
        bpy.data.cameras.remove(data)
        bpy.context.view_layer.update()

def run(source_dir,outdir):
    root=Path(source_dir).resolve();src=root/INPUT
    upstream=json.loads((root/"r116_source_real_3d_straight_blunt_fin_candidates.json").read_text())
    cases=[v for v in upstream["cases"] if v["variant"]=="original_straight_sharp_fin_main_three"]
    if len(cases)!=1 or hashlib.sha256(src.read_bytes()).hexdigest()!=cases[0]["sha256"]:
        raise RuntimeError("R120 exact reference verified R116 original 3D fin scene missing")
    out=Path(outdir).resolve();out.mkdir(parents=True,exist_ok=True)
    report={"revision":REV,"source_original_private_sha256":SOURCE_SHA,
        "original_Wube_sprite_in_public_artifact":False,
        "original_full_blender_scene_untouched":True,
        "scrap_rejected_all_R114_R115_hinge_geometry":True,
        "no_extraneous_above_bell_housing_or_invented_upper_pipes":True,
        "visual_source_approved":False,"candidates":[]}
    for tag,add_pads,add_axles in CASES:
        bpy.ops.wm.open_mainfile(filepath=str(src))
        scene=bpy.context.scene;scene.frame_set(1)
        if scene.get("fsc_r116_variant")!="original_straight_sharp_fin_main_three":
            raise RuntimeError("R120 starts from wrong fin geometry")
        keep=kept_names(scene)
        baseline_objects={ob.name for ob in scene.objects if ob.type in {"MESH","CURVE"}}
        old_camera=tuple(float(x) for row in scene.camera.matrix_world for x in row)
        original_motion=core.lower_animated_fin_digest(scene)
        original_world=motion_matrix_signature(scene)
        original_mesh=fin_mesh_signature(scene)
        original_material={name:[x.name if x else None for x in bpy.data.objects[name].data.materials]
                           for name in keep if bpy.data.objects[name].type=="MESH"}
        removed=[]
        for ob in list(scene.objects):
            if ob.type in {"MESH","CURVE"} and ob.name not in keep:
                removed.append(ob.name)
                bpy.data.objects.remove(ob,do_unlink=True)
        if len(removed)<170:raise RuntimeError("R120 did not really scrap obsolete upper mesh topology")
        if len(keep)<180:raise RuntimeError("R120 cut too many original physical bell parts")
        validate_clean(scene,keep,old_camera,original_motion,original_world,
                       original_mesh,original_material)
        edits=[];axles=[]
        if add_pads:
            mat=material()
            for i in MAIN:
                edits.append(source_pad(scene,i,mat))
            if add_axles:
                dark_pin=pin_material()
                for item in edits:axles.append(source_axle(scene,item,dark_pin))
        bpy.context.view_layer.update()
        original_count=len(keep)
        expected=keep|{p["part_name"] for p in edits}|{a["name"] for a in axles}
        actual={ob.name for ob in scene.objects if ob.type in {"MESH","CURVE"}}
        if expected!=actual:
            raise RuntimeError("R120 wrong 3D assembly objects after physical pruning")
        validate_clean(scene,keep,old_camera,original_motion,original_world,
                       original_mesh,original_material)
        scene.render.resolution_x,scene.render.resolution_y=core.NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
        frames={}
        for frame in FRAMES:
            scene.frame_set(frame)
            png=out/(tag+f"_source_camera_frame{frame:02d}.png")
            core.render(scene,png)
            if png.stat().st_size<4000:raise RuntimeError("R120 cleaned Blender render blank")
            frames[str(frame)]=png.name
        scene.frame_set(1)
        angled=out/(tag+"_physical_3d_oblique35.png")
        oblique(scene,angled)
        if angled.stat().st_size<4000:raise RuntimeError("R120 real 3D oblique view blank")
        scene["fsc_r120_revision"]=REV
        scene["fsc_r120_variant"]=tag
        scene["fsc_r120_original_visual_approved"]=False
        saved=out/(tag+".blend")
        bpy.ops.wm.save_as_mainfile(filepath=str(saved))
        if saved.stat().st_size<100000:raise RuntimeError("R120 no editable Blender output")
        bpy.ops.wm.open_mainfile(filepath=str(saved))
        scene=bpy.context.scene
        validate_clean(scene,keep,old_camera,original_motion,original_world,
                       original_mesh,original_material)
        if {o.name for o in scene.objects if o.type in {"MESH","CURVE"}}!=expected:
            raise RuntimeError("R120 save-reopened historical hinge garbage returned")
        if any(not core.manifold_edges(bpy.data.objects[p["part_name"]].data)[0]
               for p in edits):
            raise RuntimeError("R120 actual casting primitives damaged after reopen")
        if any(not core.manifold_edges(bpy.data.objects[a["name"]].data)[0]
               for a in axles):
            raise RuntimeError("R120 actual pin primitives damaged after reopen")
        report["candidates"].append({
           "variant":tag,"original_source_sprite_visual_match_unapproved":True,
           "preserved_ten_real_fins_and_lower_64_frame_motion":True,
           "original_bell_meshes_preserved":True,
           "removed_old_obsolete_mesh_and_curve_objects":len(removed),
           "removed_original_names":removed,
           "retained_original_fin_and_bell_count":original_count,
           "new_actual_root_hinge_pads":edits,"new_plain_individual_axles":axles,
           "actual_visible_model_object_count":len(expected),
           "original_source_camera_renders":frames,
           "oblique_real_3d_preview":angled.name,
           "editable_blend":saved.name,
           "sha256":hashlib.sha256(saved.read_bytes()).hexdigest()})
        (out/"r120_clean_bell_fins_and_three_basic_hinge_candidates.json").write_text(
            json.dumps(report,indent=2)+"\n",encoding="utf8")
        print("R120_CLEAN_BELL_FIN_SOURCE_ROOT_CANDIDATE_SAVED",tag,len(expected),flush=True)
    print("R120_SOURCE_ORIGINAL_3D_BELL_AND_FINS_CLEAN_MODEL_PASS__HUMAN_VISUAL_APPROVAL_PENDING",flush=True)

if __name__=="__main__":
 p=argparse.ArgumentParser()
 p.add_argument("--r116-dir",type=Path,required=True)
 p.add_argument("--out",type=Path,required=True)
 a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
 run(a.r116_dir,a.out)
