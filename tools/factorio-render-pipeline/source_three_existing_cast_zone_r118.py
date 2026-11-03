"""R118: source-zone reshape of the EXISTING THREE actual 3D upper mount castings.

After exact original sprite recovery (SHA 0670bc...), R116 restored the
non-melted three sheet fins; R117 isolated the real owners and measured their
source-camera 3D bounds.  R114/R115 boulder shoulder meshes and pips are
rejected; this operation uses the pre-boulder R116 actual R89/R49 cast meshes.
Unlike prior guessed pin/ring rigs, NO NEW OBJECTS or false hinge machinery.
Physical finite-volume metal geometry is re-profiled in camera x,y while
preserving existing real z depth, material, manifold topology and all fins.
The local ORIGINAL frame 1 is the appearance authority; public CI never
receives or uploads that original bitmap. Neither case is pre-approved.
"""
import argparse,hashlib,json,math,sys
from pathlib import Path
from mathutils import Vector,Matrix
import bpy

HERE=Path(__file__).resolve().parent
if str(HERE) not in sys.path:sys.path.insert(0,str(HERE))
import physical_cut_separate_source_fins_r107 as core
import source_original_straight_fin_recovery_r116 as r116
import source_individual_hinge_casts_r110 as r110

REV="R118_original_source_three_actual_mount_casting_placement"
SOURCE_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
BASE="original_straight_sharp_fin_main_three.blend"
REPORT="r116_source_real_3d_straight_blunt_fin_candidates.json"
CASTS={
 "port":"R89_SOURCE_FITTED_PORT_CAST",
 "center":"R49_BESPOKE_CAST_MOUNT_02",
 "starboard":"R89_SOURCE_FITTED_STARBOARD_CAST",
}
# Actual R117 source camera projection boxes, computed from real Blender
# 3D vertices (frame1).  They are NOT guessed anchor positions.
OLD={
 "port":(39.0,297.0,88.0,352.0),
 "center":(94.02,311.75,163.83,336.48),
 "starboard":(166.02,306.87,219.2,360.3)
}
# Original first body sprite zone observations; deliberately approximate
# source-derived candidate envelopes pending true original visual inspection.
TARGET={
 "port":(34.0,304.0,97.0,356.0),
 "center":(96.0,307.0,163.0,341.0),
 "starboard":(159.0,303.0,230.0,360.0)
}
CASES=(
 ("r116_original_mount_geometry_control",0.,False),
 ("three_existing_castings_source_zone_registered",1.0,False),
 ("three_asymmetric_reformed_L_cast_supports",1.0,True)
)
FRAMES=(1,33)

def protected_digest(scene):
    return r110.mesh_digest(scene,set(CASTS.values()))

def geometry_bbox(scene,ob):
    c=[r116.projected_pixel(scene,ob.matrix_world@v.co)
       for v in ob.data.vertices]
    return tuple(round(fn(v[i] for v in c),4)
                 for i,fn in ((0,min),(1,min),(0,max),(1,max)))

def move_actual_cast(scene,key,strength,fold):
    ob=bpy.data.objects[CASTS[key]]
    m=ob.data
    if ob.type!="MESH" or m.shape_keys or not m.materials or ob.hide_render:
        raise RuntimeError("R118 needs visible original R89/R49 existing physical mount")
    # Preserve original imported mount topology exactly. The original R89
    # meshes can comprise several layered cast sections whose real exposed
    # sheet edges are NOT necessarily manifold; don't invent a new weld gate.
    was_manifold,original_edge_count=core.manifold_edges(m)
    if not original_edge_count:
        raise RuntimeError("R118 source casting has no 3D edges")
    original=geometry_bbox(scene,ob)
    expected=OLD[key]
    if any(abs(x-y)>1.3 for x,y in zip(original,expected)):
        raise RuntimeError("R118 source camera mounting owner changed since R117")
    before=[tuple(v.co) for v in m.vertices]
    x0,y0,x1,y1=original
    tx0,ty0,tx1,ty1=TARGET[key]
    inv=ob.matrix_world.inverted_safe()
    count=0
    for i,v in enumerate(m.vertices):
        current_world=ob.matrix_world@v.co
        px,py,depth=r116.projected_pixel(scene,current_world)
        u=(px-x0)/(x1-x0)
        t=(py-y0)/(y1-y0)
        newx=tx0+u*(tx1-tx0)
        newy=ty0+t*(ty1-ty0)
        if fold and key=="port":
            # Port original has a DOWNWARD irregular L heel and wider
            # outboard upper arm; form a real 3D shallow stagger in body.
            heel=max(0.,min(1.,(t-.49)/.51))
            newx-=3.3*heel*(1-u)
            newy+=1.6*heel*u
            depth+=.018*heel*math.sin(math.pi*u)
        elif fold and key=="starboard":
            # Right source has a kinked offset cover; do not mirror port.
            heel=max(0.,min(1.,(t-.47)/.53))
            newx+=3.4*heel*u
            newy+=1.0*heel*(1-u)
            depth+=.011*heel*math.cos(math.pi*u)
        elif fold and key=="center":
            # Center belongs to its ORIGINAL R49 3D saddle; no new lugs.
            # Keep its two attached downturned tabs registered to the
            # original native sprite zone, not floating over the fin.
            lower=max(0.,min(1.,(t-.51)/.49))
            newy+=1.3*lower
        newx=px+(newx-px)*strength
        newy=py+(newy-py)*strength
        if not all(math.isfinite(x) for x in (newx,newy,depth)):
            raise RuntimeError("R118 nonfinite source 3D cast coordinates")
        new_world=r116.source_pixel_world(scene,newx,newy,depth)
        v.co=inv@new_world
        count+=1
    m.update()
    ok,edges=core.manifold_edges(m)
    if ok!=was_manifold or edges!=original_edge_count or any(poly.area<1e-11 for poly in m.polygons):
        raise RuntimeError("R118 changed input's real 3D metal topology or collapsed a face")
    displacement=max(math.dist(before[i],tuple(v.co)) for i,v in enumerate(m.vertices))
    if displacement<.015:raise RuntimeError("R118 physically unchanged source cast")
    ob["R118_source_region_reformed_existing_real_cast"]=True
    ob["R118_no_added_invented_hinges"]=True
    ob["R118_original_sprite_geometry_unapproved"]=True
    return {"owner":ob.name,"old_camera_bbox":original,
            "source_target_zone":TARGET[key],
            "updated_projected_3d_bbox":geometry_bbox(scene,ob),
            "max_real_vertex_displacement":round(displacement,6),
            "real_vertices":count,"original_manifold":was_manifold,
            "result_manifold":ok,"unchanged_physical_edge_count":edges,
            "source_approved":False}

def orbit(scene,out):
    source=scene.camera;data=source.data.copy()
    camera=bpy.data.objects.new("R118_TEMP_SOURCE_GEOMETRY_OBLIQUE",data)
    scene.collection.objects.link(camera)
    try:
        camera.matrix_world=Matrix.Rotation(math.radians(35),4,"Y")@source.matrix_world
        scene.camera=camera
        bpy.context.view_layer.update()
        core.render(scene,out)
    finally:
        scene.camera=source
        bpy.data.objects.remove(camera,do_unlink=True)
        bpy.data.cameras.remove(data)
        bpy.context.view_layer.update()

def verify(scene,names,cam,mats,untouched,motion,edited,tag):
    if {o.name for o in scene.objects}!=names:
        raise RuntimeError("R118 added false new hinges or removed existing parts")
    if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=cam:
        raise RuntimeError("R118 moved original camera")
    if core.scene_used_material_signature(scene)!=mats:
        raise RuntimeError("R118 changed original material graphs or heat")
    if protected_digest(scene)!=untouched:
        raise RuntimeError("R118 altered actual corrected fins, nozzle or dark rolls")
    if core.lower_animated_fin_digest(scene)!=motion:
        raise RuntimeError("R118 altered 64-frame lower animation")
    for key in edited:
        ob=bpy.data.objects[CASTS[key]]
        if not ob.get("R118_source_region_reformed_existing_real_cast"):
            raise RuntimeError("R118 source metal forging lost on scene reopen")
        if any(poly.area<1e-11 for poly in ob.data.polygons):
            raise RuntimeError("R118 original 3D metal faces collapsed")
    if scene.get("fsc_r118_variant") and scene["fsc_r118_variant"]!=tag:
        raise RuntimeError("R118 saved candidate variant lost")

def run(source_dir,outdir):
    root=Path(source_dir).resolve()
    src=root/BASE
    prior=json.loads((root/REPORT).read_text(encoding="utf8"))
    matching=[x for x in prior["cases"] if x["variant"]=="original_straight_sharp_fin_main_three"
              and x["editable_blend"]==BASE]
    if len(matching)!=1 or hashlib.sha256(src.read_bytes()).hexdigest()!=matching[0]["sha256"]:
        raise RuntimeError("R118 requires exact same-run original R116 corrected source model")
    out=Path(outdir).resolve();out.mkdir(parents=True,exist_ok=True)
    report={"revision":REV,"private_original_sprite_sha256":SOURCE_SHA,
         "source_art_published":False,"visually_approved":False,
         "R114_R115_boulder_castings_rejected":True,
         "reconstructed_geometry":"three original existing Blender casting meshes, without false hinges",
         "cases":[]}
    for tag,strength,fold in CASES:
        bpy.ops.wm.open_mainfile(filepath=str(src))
        scene=bpy.context.scene;scene.frame_set(1)
        if scene.get("fsc_r116_variant")!="original_straight_sharp_fin_main_three":
            raise RuntimeError("R118 wrong original source model")
        names={o.name for o in scene.objects}
        cam=tuple(float(v) for row in scene.camera.matrix_world for v in row)
        mats=core.scene_used_material_signature(scene)
        rest=protected_digest(scene)
        motion=core.lower_animated_fin_digest(scene)
        changes={}
        if strength:
            for key in ("port","center","starboard"):
                changes[key]=move_actual_cast(scene,key,strength,fold)
        bpy.context.view_layer.update()
        verify(scene,names,cam,mats,rest,motion,changes,tag)
        scene.render.resolution_x,scene.render.resolution_y=core.NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
        frames={}
        for f in FRAMES:
            scene.frame_set(f)
            png=out/(tag+f"_source_camera_frame{f:02d}.png")
            core.render(scene,png)
            if png.stat().st_size<5000:raise RuntimeError("R118 native source Blender render absent")
            frames[str(f)]=png.name
        scene.frame_set(1)
        oblique=out/(tag+"_real_physical_35deg.png")
        orbit(scene,oblique)
        if oblique.stat().st_size<5000:raise RuntimeError("R118 3D angled mount view missing")
        verify(scene,names,cam,mats,rest,motion,changes,tag)
        scene["fsc_r118_revision"]=REV
        scene["fsc_r118_variant"]=tag
        scene["fsc_r118_source_visually_approved"]=False
        blend=out/(tag+".blend")
        bpy.ops.wm.save_as_mainfile(filepath=str(blend))
        bpy.ops.wm.open_mainfile(filepath=str(blend))
        verify(bpy.context.scene,names,cam,mats,rest,motion,changes,tag)
        report["cases"].append({"variant":tag,
           "physically_rebuilt_existing_original_mounts":changes,
           "source_fidelity_unapproved":True,
           "original_fin_3d_geometry_unchanged":True,
           "native_camera_frames":frames,"actual_angled_mesh_view":oblique.name,
           "editable_blend":blend.name,"sha256":hashlib.sha256(blend.read_bytes()).hexdigest()})
        (out/"r118_source_actual_existing_mounts.json").write_text(
             json.dumps(report,indent=2)+"\n",encoding="utf8")
        print("R118_3D_SOURCE_CAST_GEOMETRY_SAVED_REOPENED",tag,flush=True)
    print("R118_NOT_APPROVED_NEEDS_PRIVATE_ORIGINAL_SPRITE_FRAME1_33_COMPARISON",flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--r116-dir",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.r116_dir,a.out)
