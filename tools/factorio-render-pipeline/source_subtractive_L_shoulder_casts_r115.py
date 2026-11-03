"""R115: cut actual existing R112 side cast meshes into unlike L/stepped contours.

Geometry-first original-sprite reconstruction. Unlike tiny R113/R114 tabs,
this stage alters the *dominant* source-camera silhouette and physical
depth/faceting of the two real R89/R112 side cast shoulder solids.
No decals, generic engine greebles, source sprite uploads, or approval claims.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path
from mathutils import Matrix
import bpy

HERE=Path(__file__).resolve().parent
if str(HERE) not in sys.path:sys.path.insert(0,str(HERE))
import physical_cut_separate_source_fins_r107 as core
import source_thin_independent_pressed_plates_r112 as r112
import source_individual_hinge_casts_r110 as r110

REV="R115_actual_asymmetric_L_casting_subtractive_contour_form"
SOURCE_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
BASE="stepped_offset_return_brackets.blend"
FRAMES=(1,33)
# Source frame pixel-space proposed cut-ins, from the PRIVATE original only.
# Indices are the perimeter stations in the existing R112 solid shoulder.
# This reconstructs the source-visible asymmetric mechanical silhouette,
# not a generic mirrored engine mount or a separately pasted patch.
SHIFTS={
 3:{
  10:(-2,-2),11:(-9,-9),12:(-13,-15),13:(-11,-12),
  14:(-2,-9),16:(1,-2),
 },
 1:{
  9:(-1,-2),10:(-2,-7),11:(-7,-10),12:(-7,-8),13:(-2,-1),
 }
}
CASES=(("r114_original_broad_shoulder_control",0.,0.),
       ("asymmetric_L_cut_and_kinked_return",.86,.027),
       ("deeper_port_notch_right_stepped_heel",1.2,.065))

def crossing(a,b,c,d):
    def cross(p,q,r):
        return (q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0])
    return cross(a,b,c)*cross(a,b,d)<0 and cross(c,d,a)*cross(c,d,b)<0

def validate_projected_source_outlines(strength):
    for side,contour in r112.SHAPES.items():
        mapped=[(x+strength*SHIFTS[side].get(j,(0,0))[0],
                 y+strength*SHIFTS[side].get(j,(0,0))[1])
                for j,(x,y) in enumerate(contour)]
        if abs(r112.polygon_area(mapped))<1500:
            raise RuntimeError("R115 source shoulder silhouette collapsed")
        n=len(mapped)
        for j in range(n):
            for k in range(j+2,n):
                if j==0 and k==n-1:continue
                if crossing(mapped[j],mapped[(j+1)%n],
                            mapped[k],mapped[(k+1)%n]):
                    raise RuntimeError("R115 source source notched contour crossed itself")

def immutable_digest(scene):
    return r110.mesh_digest(scene,r112.CASTS.values())

def remesh_actual_original_cast(scene,side,strength,fold):
    ob=bpy.data.objects[r112.CASTS[side]]
    mesh=ob.data
    n=len(r112.SHAPES[side])
    if (ob.type!="MESH" or not ob.get("R112_unified_source_shoulder_forging")
       or mesh.shape_keys or ob.hide_render or len(mesh.vertices)!=4*n+1):
        raise RuntimeError("R115 expected real R112 thin cast 4-ring physical mesh")
    if not core.manifold_edges(mesh)[0]:
        raise RuntimeError("R115 original thin solid shoulder isn't physically closed")
    before=[tuple(v.co) for v in mesh.vertices]
    cam=scene.camera
    invcamera=cam.matrix_world.inverted_safe()
    points=cam.data.view_frame(scene=scene)
    sx=(max(v.x for v in points)-min(v.x for v in points))/core.NATIVE[0]
    sy=(max(v.y for v in points)-min(v.y for v in points))/core.NATIVE[1]
    invobject=ob.matrix_world.inverted_safe()
    altered=0
    for ring in range(4):
        # Back of original cast is restrained; the raised front stamping
        # receives the full source notch and the angular 3D fold. The
        # machine-facing body remains a real solid, NOT a floating pixel card.
        factor=(.72,.83,1.0,.94)[ring]
        for station,(dx,dy) in SHIFTS[side].items():
            idx=ring*n+station
            w=ob.matrix_world@mesh.vertices[idx].co
            p=invcamera@w
            p.x+=dx*sx*strength*factor
            p.y-=dy*sy*strength*factor
            # Hand-specific, stepped *geometry* depth: a shallow stamped
            # lower return, not a new material/shader and not a new ring.
            peak=(.35 if ring==0 else (.55 if ring==1 else 1.0))
            p.z-=fold*peak*(.55+((station+side)%4)*.13)
            mesh.vertices[idx].co=invobject@(cam.matrix_world@p)
            altered+=1
    # Move existing physical crown toward its own L-section, so a smooth
    # central bulge does not remain stretched across the source cutout.
    idx=4*n
    w=ob.matrix_world@mesh.vertices[idx].co
    p=invcamera@w
    p.x+=(-4.2 if side==3 else 3.5)*sx*strength
    p.y+=3.4*sy*strength
    p.z-=fold*.80
    mesh.vertices[idx].co=invobject@(cam.matrix_world@p)
    mesh.update()
    if not core.manifold_edges(mesh)[0] or any(poly.area<1e-11 for poly in mesh.polygons):
        raise RuntimeError("R115 cut damaged physical solid faces")
    displacement=max(math.dist(before[i],tuple(v.co)) for i,v in enumerate(mesh.vertices))
    if displacement<.04:
        raise RuntimeError("R115 didn't actually reshape existing 3D casting")
    ob["R115_original_side_cast_L_section_reprofile"]=True
    ob["R115_source_approval_pending"]=True
    return {"name":ob.name,"station_count":n,"3d_vertex_count":len(mesh.vertices),
            "physical_polygon_count":len(mesh.polygons),
            "edited_real_vertices":altered+1,
            "real_max_displacement":round(displacement,6),
            "source_pixels_as_reference_only":True,
            "physically_closed":True,
            "approved_against_original_sprite":False}

def oblique(scene,path):
    source=scene.camera
    copy=source.data.copy()
    view=bpy.data.objects.new("R115_TEMP_35_DEG_PHYSICAL_VIEW",copy)
    scene.collection.objects.link(view)
    try:
        view.matrix_world=Matrix.Rotation(math.radians(35),4,"Y")@source.matrix_world
        scene.camera=view
        bpy.context.view_layer.update()
        core.render(scene,path)
    finally:
        scene.camera=source
        bpy.data.objects.remove(view,do_unlink=True)
        bpy.data.cameras.remove(copy)
        bpy.context.view_layer.update()

def verify(scene,names,cam,mats,immutable,motion,changed,case):
    if {ob.name for ob in scene.objects}!=names:
        raise RuntimeError("R115 destroyed or created source machine objects")
    if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=cam:
        raise RuntimeError("R115 changed source-calibrated 3D camera")
    if core.scene_used_material_signature(scene)!=mats:
        raise RuntimeError("R115 changed original material instead of cast geometry")
    if immutable_digest(scene)!=immutable:
        raise RuntimeError("R115 changed original fins/nozzle/collars/R114 brackets")
    if core.lower_animated_fin_digest(scene)!=motion:
        raise RuntimeError("R115 broke original lower 64-frame animation")
    for side in changed:
        ob=bpy.data.objects[r112.CASTS[side]]
        if not ob.get("R115_original_side_cast_L_section_reprofile"):
            raise RuntimeError("R115 did not persist modified physical casting")
        if not core.manifold_edges(ob.data)[0]:
            raise RuntimeError("R115 3D cast no longer manifold")
    if scene.get("fsc_r115_variant") and scene["fsc_r115_variant"]!=case:
        raise RuntimeError("R115 scene variant lost after save/reopen")

def run(source,out):
    source=Path(source).resolve()/BASE
    out=Path(out).resolve()
    out.mkdir(parents=True,exist_ok=True)
    if not source.is_file() or source.stat().st_size<100000:
        raise RuntimeError("R115 needs exact real R114 verified source-shape Blender model")
    report={"revision":REV,"original_private_sprite_sha256":SOURCE_SHA,
            "original_proprietary_sprite_published":False,
            "source_geometry_visually_approved":False,
            "goal":"large real upper-side shoulder L and kinked contour corrections, not small lug dress-up",
            "cases":[]}
    for tag,strength,fold in CASES:
        if strength:validate_projected_source_outlines(strength)
        bpy.ops.wm.open_mainfile(filepath=str(source))
        scene=bpy.context.scene
        scene.frame_set(1)
        if (scene.get("fsc_r114_variant")!="stepped_offset_return_brackets"
            or scene.camera.data.type!="ORTHO"):
            raise RuntimeError("R115 requires verified R114 real source-camera geometry")
        names={ob.name for ob in scene.objects}
        cam=tuple(float(v) for row in scene.camera.matrix_world for v in row)
        mats=core.scene_used_material_signature(scene)
        immutable=immutable_digest(scene)
        motion=core.lower_animated_fin_digest(scene)
        changes={}
        if strength:
            for side in (3,1):
                changes[side]=remesh_actual_original_cast(scene,side,strength,fold)
        bpy.context.view_layer.update()
        verify(scene,names,cam,mats,immutable,motion,changes,tag)
        scene.render.resolution_x,scene.render.resolution_y=core.NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8;scene.cycles.seed=0
        scene.cycles.use_animated_seed=False
        frames={}
        for frame in FRAMES:
            scene.frame_set(frame)
            path=out/(tag+f"_source_camera_frame{frame:02d}.png")
            core.render(scene,path)
            if path.stat().st_size<5000:raise RuntimeError("R115 native Blender image missing")
            frames[str(frame)]=path.name
        scene.frame_set(1)
        angled=out/(tag+"_real_3d_35deg.png")
        oblique(scene,angled)
        if angled.stat().st_size<5000:
            raise RuntimeError("R115 genuine 3D angled comparison missing")
        verify(scene,names,cam,mats,immutable,motion,changes,tag)
        scene["fsc_r115_revision"]=REV
        scene["fsc_r115_variant"]=tag
        scene["fsc_r115_source_visually_approved"]=False
        blend=out/(tag+".blend")
        bpy.ops.wm.save_as_mainfile(filepath=str(blend))
        bpy.ops.wm.open_mainfile(filepath=str(blend))
        verify(bpy.context.scene,names,cam,mats,immutable,motion,changes,tag)
        if blend.stat().st_size<100000:
            raise RuntimeError("R115 real editable Blender model absent")
        report["cases"].append({
            "variant":tag,"real_asymmetric_existing_casting_reprofiles":changes,
            "unchanged_other_original_engine_components":True,
            "source_shape_fidelity_unapproved":True,
            "native_original_camera_frames":frames,
            "oblique_genuine_3d_view":angled.name,
            "editable_blend":blend.name,
            "blend_sha256":hashlib.sha256(blend.read_bytes()).hexdigest()})
        (out/"r115_source_physical_cast_L_notch_candidates.json").write_text(
            json.dumps(report,indent=2)+"\n",encoding="utf8")
        print("R115_ACTUAL_SOURCE_CAST_VOLUMETRIC_L_FORM_SAVED_REOPENED",tag,flush=True)
    print("R115_ORIGINAL_SOURCE_PHYSICAL_CASTS_COMPLETE__NO_VISUAL_APPROVAL",flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--r114-dir",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.r114_dir,a.out)
