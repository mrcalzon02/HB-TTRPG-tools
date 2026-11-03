"""R112 original-sprite source geometry: continuous TWO independent cast shoulders.

R110 proved separate port/starboard/crown R89 castings are real editable mesh,
but the original camera shows a cluster of disconnected slate-like facets
instead of the broad weathered folded structural shoulders visible in the
user's ONLY authoritative original Factorio thruster.png frames.

R112 replaces each R89 side casting's ACTUAL mesh with a single physically
closed, thick, multi-bevel forged shell. The two outlines are different:
they were estimated from the ORIGINAL sprite visual parts, not mirrored and
not copied from unrelated mechanical art. The original 3D center saddle,
lower animations, nozzle, ribs and R109/R110 fin meshes are not changed.

The first variant is a source-control, other variants are provisional
real 3D hypotheses. Keep original sprite private, NEVER upload it.
"""
import argparse,hashlib,json,math,struct,sys
from pathlib import Path
from collections import Counter
from mathutils import Vector,Matrix
import bpy

HERE=Path(__file__).resolve().parent
if str(HERE) not in sys.path:sys.path.insert(0,str(HERE))
import physical_cut_separate_source_fins_r107 as core
import source_individual_hinge_casts_r110 as r110

REV="R112_unequal_port_starboard_continuous_original_forged_shoulders"
INPUT_SCENE="broad_stepped_forged_shoulders"
INPUT_SHA="43a6cb8b7327c96fa1c94ea725b2f09b10f1868812ac617768d6736227dd5bff"
SOURCE_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
# Original private atlas source-camera 264x542 pixel coordinates for the
# IMAGE REFERENCE landmarks ONLY. Every result below is an ACTUAL solid Blender
# mesh with bevel thickness/relief and perspective-independent geometry.
# These are estimated source shoulder silhouettes, not exact proprietary CAD.
PORT_SHOULDER=((31,345),(35,330),(42,320),(53,312),(65,309),(71,304),
               (81,309),(88,318),(99,323),(106,331),(101,339),(95,346),
               (91,353),(84,359),(81,371),(71,371),(62,367),(54,371),
               (45,369),(37,360))
STARBOARD_SHOULDER=((164,307),(173,304),(182,309),(190,316),
               (202,321),(209,331),(223,340),(229,351),(225,365),
               (217,370),(205,364),(195,354),(189,350),(176,342),
               (164,333),(157,326))
CASTS={3:"R89_SOURCE_FITTED_PORT_CAST",1:"R89_SOURCE_FITTED_STARBOARD_CAST"}
SHAPES={3:PORT_SHOULDER,1:STARBOARD_SHOULDER}
# Solid 3D cast thickness and crown relief are model-space camera-local
# magnitudes, not an image mask, with source geometry entirely replaceable.
CASES=(
 ("r111_thick_original_cast_control",None),
 ("thin_forged_steel_shoulders",(.985,.016,.028)),
 ("stepped_continuous_lap_plates",(1.0,.028,.041)),
 ("shallow_pressed_flanged_shoulders",(1.02,.048,.056)),
)
FRAMES=(1,33)

def polygon_area(shape):
    return .5*sum(shape[i][0]*shape[(i+1)%len(shape)][1]-
         shape[(i+1)%len(shape)][0]*shape[i][1]
         for i in range(len(shape)))

def original_geometry_digest(scene):
    # Only two actual side 3D cast meshes are replaced. The separately
    # formed center saddle, mouth and original animated fins remain exact.
    return r110.mesh_digest(scene,CASTS.values())

def cast_3d_sections(ob,camera):
    mesh=ob.data
    invcam=camera.matrix_world.inverted_safe()
    allcam=[invcam@(ob.matrix_world@v.co) for v in mesh.vertices]
    return {"real_vertices":len(mesh.vertices),"real_polygons":len(mesh.polygons),
      "camera_depth_extent":round(max(v.z for v in allcam)-min(v.z for v in allcam),6),
      "camera_x_extent":round(max(v.x for v in allcam)-min(v.x for v in allcam),6),
      "camera_y_extent":round(max(v.y for v in allcam)-min(v.y for v in allcam),6)}

def source_camera_point(scene,x,y,depth):
    camera=scene.camera
    corners=camera.data.view_frame(scene=scene)
    lx=min(v.x for v in corners);rx=max(v.x for v in corners)
    ly=min(v.y for v in corners);ry=max(v.y for v in corners)
    local=Vector((lx+x/core.NATIVE[0]*(rx-lx),
                  ry-y/core.NATIVE[1]*(ry-ly),depth))
    return camera.matrix_world@local

def forge_true_solid_side(scene,index,params):
    ob=bpy.data.objects[CASTS[index]]
    if ob.type!="MESH" or ob.data.shape_keys or ob.hide_render:
        raise RuntimeError("R112 cannot replace an unverified or hidden original R89 cast")
    if not ob.get("R111_unified_source_shoulder_forging"):
        raise RuntimeError("R112 needs existing geometrically verified R110 casting")
    shape=SHAPES[index]
    if len(shape)<12 or abs(polygon_area(shape))<1000:
        raise RuntimeError("R112 source traced shoulder perimeter invalid")
    old=ob.data
    before=cast_3d_sections(ob,scene.camera)
    oldslots=[m for m in old.materials]
    oldvertices=[tuple(v.co) for v in old.vertices]
    cam_inv=scene.camera.matrix_world.inverted_safe()
    inv=ob.matrix_world.inverted_safe()
    camera_pts=[cam_inv@(ob.matrix_world@old.vertices[k].co)
                for k in range(len(old.vertices))]
    # Anchored to the existing authored R110 casting depth, NOT an invented
    # camera-plane sprite card. Its 3D front/back follow previous cast depth.
    depthmin=min(q.z for q in camera_pts)
    depthmax=max(q.z for q in camera_pts)
    width,relief,bevel=params
    # Previous R111 stretched the whole old R89 multi-part depth envelope
    # into one grossly overthick lumpy shell (~1.3 model units). This is
    # SOURCE-INCORRECT: original shows a THIN, FOLDED CAST METAL SHOULDER,
    # not a gigantic round rock. Keep its original camera FRONT depth but
    # author a distinct shallow plate with real non-zero bevel thickness.
    low=min(depthmin,depthmax);high=max(depthmin,depthmax)
    span=high-low
    if span<.2:raise RuntimeError("R112 requires previous verified thick R111 reference volume")
    actual_sheet_thickness=.105+relief*1.7
    back=high-actual_sheet_thickness
    if not .11<=actual_sheet_thickness<=.20:
        raise RuntimeError("R112 physically thin source plate out of bounds")
    cx=sum(x for x,y in shape)/len(shape)
    cy=sum(y for x,y in shape)/len(shape)
    n=len(shape)
    vertices=[]
    # 4 distinct finite-volume 3D surface rings:
    # rear footprint, real side thickness, forged bevel, curled inset face.
    for ring in range(4):
        # Broad metal sheet, strong rolled outer lip and a shallow pressed
        # upper face. No enormous hollow rock/boulder spanning the original
        # multi-piece depth envelope and no invented continuous nozzle ring.
        scale=(1.0,.998,.968,.89)[ring]
        depth=(back,back+actual_sheet_thickness*.32,
               high+relief*.10,high+relief*.24)[ring]
        for j,(x,y) in enumerate(shape):
            side=-1 if index==3 else 1
            # The outer silhouette is not square/symmetrical. The left and
            # right sheet shoulders get different raised stamped changes.
            offset=(.9*side*math.sin(math.pi*j/n) if ring==2 else 0.)
            sx=cx+(x-cx)*scale*width+offset
            sy=cy+(y-cy)*scale*width
            # Lift the front crown as a genuine rounded/creased solid.
            z=depth+(bevel*.28*math.sin(math.tau*j/n) if ring>=2 else 0.)
            vertices.append(tuple(inv@source_camera_point(scene,sx,sy,z)))
    # Center crown is a real 3D vertex, producing triangular metal facets
    # oriented in space rather than a flat surface overlaid on an image.
    crown=tuple(inv@source_camera_point(scene,cx,cy,high+relief*.31+bevel*.12))
    vertices.append(crown)
    faces=[]
    faces.append(tuple(reversed(range(n))))  # original rear cap
    for layer in range(3):
        a=layer*n;b=(layer+1)*n
        for j in range(n):
            k=(j+1)%n
            faces.append((a+j,a+k,b+k,b+j))
    for j in range(n):
        k=(j+1)%n
        faces.append((3*n+j,3*n+k,4*n))
    mesh=bpy.data.meshes.new(ob.name+"_R112_CONTINUOUS_FORGED_SOLID")
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    for mat in oldslots:mesh.materials.append(mat)
    for poly in mesh.polygons:
        poly.use_smooth=False
        # Keep the R89 casting material family instead of introducing a
        # self-indulgent new metal. Crown and main shell use its original.
        poly.material_index=0
    ok,edge_count=core.manifold_edges(mesh)
    if not ok or any(p.area<1e-11 for p in mesh.polygons):
        raise RuntimeError("R112 unified casting must be actual closed 3D solid")
    # The two whole-shoulder volumes must be broad/deep, not thin ribbons.
    if len(mesh.vertices)!=4*n+1 or len(mesh.polygons)!=4*n+1:
        raise RuntimeError("R112 wrong true-solid vertex/face count")
    ob.data=mesh
    if old.users==0:bpy.data.meshes.remove(old)
    ob["R112_unified_source_shoulder_forging"]=True
    ob["R112_source_shape_physically_thinned_not_texture"]=True
    ob["R112_independently_traced_source_side"]="port" if index==3 else "starboard"
    ob["R112_no_common_ring_required"]=True
    ob["R112_source_correctness_unapproved"]=True
    after=cast_3d_sections(ob,scene.camera)
    if (after["camera_depth_extent"]<.10 or after["camera_depth_extent"]>.24
        or after["camera_x_extent"]<before["camera_x_extent"]*.5):
        raise RuntimeError("R112 not a substantial volumetric formed source mount")
    return {"casting":ob.name,"source_outline_points":n,
      "old_casting":before,"new_unified_forged_solid":after,"designed_plate_thickness":actual_sheet_thickness,
      "closed_two_sided_beveled_shell":True,"physical_manifold_edges":edge_count,
      "source_visually_unapproved":True}

def render_angle(scene,path):
    original=scene.camera
    camdata=original.data.copy()
    temporary=bpy.data.objects.new("R112_GENUINE_3D_TEMP_CAMERA",camdata)
    scene.collection.objects.link(temporary)
    try:
        temporary.matrix_world=Matrix.Rotation(math.radians(35),4,"Y")@original.matrix_world
        scene.camera=temporary
        bpy.context.view_layer.update()
        core.render(scene,path)
    finally:
        scene.camera=original
        bpy.data.objects.remove(temporary,do_unlink=True)
        bpy.data.cameras.remove(camdata)
        bpy.context.view_layer.update()

def verify(scene,names,camera,materials,other,motion,reshaped,variant=None):
    if {o.name for o in scene.objects}!=names:
        raise RuntimeError("R112 added or deleted original Blender scene objects")
    if tuple(float(q) for row in scene.camera.matrix_world for q in row)!=camera:
        raise RuntimeError("R112 moved the original source camera")
    if core.scene_used_material_signature(scene)!=materials:
        raise RuntimeError("R112 changed original active material/shader wiring")
    if original_geometry_digest(scene)!=other:
        raise RuntimeError("R112 changed other chassis, nozzle, center saddle or fins")
    if core.lower_animated_fin_digest(scene)!=motion:
        raise RuntimeError("R112 altered native lower fin animation")
    if reshaped:
        for index in CASTS:
            ob=bpy.data.objects[CASTS[index]]
            if not ob.get("R112_unified_source_shoulder_forging"):
                raise RuntimeError("R112 new physical cast disappeared")
            if not core.manifold_edges(ob.data)[0]:
                raise RuntimeError("R112 saved casting no longer manifold")
    if variant and scene.get("fsc_r112_variant")!=variant:
        raise RuntimeError("R112 saved/reopened candidate source metadata missing")

def run(srcdir,out):
    src=Path(srcdir).resolve()/(INPUT_SCENE+".blend")
    if hashlib.sha256(src.read_bytes()).hexdigest()!=INPUT_SHA:
        raise RuntimeError("R112 R111 verified original side hinge scene changed")
    out=Path(out).resolve();out.mkdir(parents=True,exist_ok=True)
    report={"revision":REV,"private_original_sprite_sha256":SOURCE_SHA,
            "source_art_exported":False,"source_visual_fidelity_approved":False,
            "geometry_goal":"two continuous independent asymmetrical forged shoulder 3D castings; center remains separate",
            "source_blend_sha256":INPUT_SHA,"corrects_r111_overthick_metal_not_color":True,"candidates":[]}
    for name,params in CASES:
        bpy.ops.wm.open_mainfile(filepath=str(src))
        scene=bpy.context.scene;scene.frame_set(1)
        if not scene.get("fsc_r110_revision") or scene.camera.data.type!="ORTHO":
            raise RuntimeError("R112 requires actual source-calibrated R111 model and camera")
        names={o.name for o in scene.objects}
        camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
        materials=core.scene_used_material_signature(scene)
        other=original_geometry_digest(scene)
        motion=core.lower_animated_fin_digest(scene)
        changes={}
        if params:
            for index in (3,1):
                changes[str(index)]=forge_true_solid_side(scene,index,params)
        bpy.context.view_layer.update()
        verify(scene,names,camera,materials,other,motion,changes)
        scene.render.resolution_x,scene.render.resolution_y=core.NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8;scene.cycles.seed=0
        scene.cycles.use_animated_seed=False
        frames={}
        for frame in FRAMES:
            scene.frame_set(frame)
            path=out/(name+f"_original_camera_frame{frame:02d}.png")
            core.render(scene,path)
            if path.stat().st_size<5000:raise RuntimeError("R112 true source view not rendered")
            frames[str(frame)]=path.name
        scene.frame_set(1)
        angle=out/(name+"_independent_real_3d_angled.png")
        render_angle(scene,angle)
        if angle.stat().st_size<5000:
            raise RuntimeError("R112 physical 3D angled render missing")
        verify(scene,names,camera,materials,other,motion,changes)
        scene["fsc_r112_revision"]=REV
        scene["fsc_r112_variant"]=name
        scene["fsc_r112_source_approved"]=False
        editable=out/(name+".blend")
        bpy.ops.wm.save_as_mainfile(filepath=str(editable))
        if editable.stat().st_size<100000:
            raise RuntimeError("R112 actual edited source 3D model not saved")
        bpy.ops.wm.open_mainfile(filepath=str(editable))
        verify(bpy.context.scene,names,camera,materials,other,motion,changes,name)
        report["candidates"].append({"variant":name,"source_visual_approved":False,
            "left_right_real_3d_side_forgings":changes,
            "original_camera_frames":frames,"genuine_angled_3d_render":angle.name,
            "editable_blend":editable.name,
            "blend_sha256":hashlib.sha256(editable.read_bytes()).hexdigest(),
            "original_other_parts_and_lower_animation_unchanged":True})
        (out/"r112_continuous_independent_source_shoulders.json").write_text(
            json.dumps(report,indent=2)+"\n",encoding="utf8")
        print("R112_CONTINUOUS_SOURCE_CAST_REAL_BLENDER_SCENE_SAVED_REOPENED",name,flush=True)
    print("R112_FORGED_INDEPENDENT_MOUNTS_GEOMETRY_TEST_DONE__SOURCE_VISUAL_REVIEW_REQUIRED",flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--r110-dir",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.r110_dir,a.out)
