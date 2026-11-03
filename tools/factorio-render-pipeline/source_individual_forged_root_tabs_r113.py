"""R113: source-visible individual fin-root retaining tabs, separate actual solids.

Original source has irregular stepped lugs between the port/starboard side
shoulders and the upper fins. R112 recovered thin broad forged metal but its
faces were undifferentiated. This stage attaches separate finite-volume forged
metal lugs, NOT decals, polygons without thickness, common mounting rings,
generic cubes, or another fictional space-engine assembly.

Source coordinates come only from the user's private genuine Factorio thruster
atlas; no original bitmap is exported, and no candidate is visually approved.
"""
import argparse,hashlib,json,math,sys
from pathlib import Path
from collections import Counter
from mathutils import Matrix,Vector
import bpy

HERE=Path(__file__).resolve().parent
if str(HERE) not in sys.path:sys.path.insert(0,str(HERE))
import physical_cut_separate_source_fins_r107 as core
import source_thin_independent_pressed_plates_r112 as r112
import source_individual_hinge_casts_r110 as r110

REV="R113_distinct_source_formed_3d_upper_fin_root_retaining_lugs"
INPUT="stepped_continuous_lap_plates"
SHA="67588f56d4869d3132494a0b138ef9dcad27dde7ad50a50d4e99e5eef89f148a"
SOURCE_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
# Hand-specific, visible candidate 2D FOOTPRINTS; every emitted object is
# physically extruded and inspected at non-source camera angles.
# These points are tentative, deliberately not claimed as original Wube CAD.
TABS={
 3:(
   ((42,344),(47,340),(52,341),(51,354),(44,354)),
   ((65,326),(69,324),(74,329),(73,338),(67,339)),
   ((89,332),(93,330),(97,335),(94,344),(89,344)),
 ),
 1:(
   ((170,325),(174,319),(180,322),(183,332),(176,335)),
   ((191,328),(197,325),(202,331),(201,341),(195,341)),
   ((213,347),(218,341),(222,346),(220,358),(214,357)),
 )
}
CASES=(("r112_without_separate_lugs",()),
       ("individual_original_root_tabs",(0,1,2)),
       ("only_outer_root_retaining_tabs",(0,2)))
FRAMES=(1,33)

def panel_digest(scene):
    # No existing machine/chassis/fin/camera data are edited, and newly
    # authored actual 3D retaining tabs are checked independently.
    ignore={o.name for o in scene.objects if o.name.startswith("R113_SOURCE_ROOT_LUG_")}
    return r110.mesh_digest(scene,ignore)

def actual_3d_tab(scene,side,number,outline):
    casting=bpy.data.objects[r112.CASTS[side]]
    if not casting.get("R112_unified_source_shoulder_forging"):
        raise RuntimeError("R113 must attach to real R112 thin source metal shoulder")
    if casting.hide_render:
        raise RuntimeError("R113 mounting casting unexpectedly hidden")
    n=len(outline)
    if n<4 or len(set(outline))!=n:
        raise RuntimeError("R113 requires unique source-fitted tab silhouette")
    area=r112.polygon_area(outline)
    if abs(area)<15:raise RuntimeError("R113 tab too small or degenerate")
    cam_inv=scene.camera.matrix_world.inverted_safe()
    depth=max((cam_inv@(casting.matrix_world@v.co)).z for v in casting.data.vertices)
    cx=sum(pt[0] for pt in outline)/n
    cy=sum(pt[1] for pt in outline)/n
    inv=casting.matrix_world.inverted_safe()
    # The rear half of each solid penetrates the already-existing shoulder;
    # the front half stands proud of the surface as a real metal lug.
    def local(x,y,z):
        return tuple(inv@r112.source_camera_point(scene,x,y,z))
    xyz=[local(x,y,depth-.026) for x,y in outline]
    xyz.extend(local(cx+(x-cx)*.93,cy+(y-cy)*.93,depth+.055)
               for x,y in outline)
    faces=[tuple(reversed(range(n))),tuple(n+i for i in range(n))]
    for j in range(n):
        k=(j+1)%n
        faces.append((j,k,n+k,n+j))
    mesh=bpy.data.meshes.new(f"R113_UNIQUE_SOURCE_HINGE_LUG_SOLID_{side}_{number}")
    mesh.from_pydata(xyz,[],faces)
    mesh.update()
    material=casting.data.materials[0]
    if not material:raise RuntimeError("R113 missing original cast family material")
    mesh.materials.append(material)
    for poly in mesh.polygons:
        poly.material_index=0
        poly.use_smooth=False
    okay,edges=core.manifold_edges(mesh)
    if not okay or any(p.area<1e-11 for p in mesh.polygons):
        raise RuntimeError("R113 genuine mounting tab is not a closed finite-volume mesh")
    obj=bpy.data.objects.new(f"R113_SOURCE_ROOT_LUG_{side}_{number}",mesh)
    casting.users_collection[0].objects.link(obj)
    obj.parent=casting
    obj.location=(0.,0.,0.)
    obj.rotation_euler=(0.,0.,0.)
    obj.scale=(1.,1.,1.)
    obj["R113_source_visible_real_solid"]=True
    obj["R113_original_sprite_3d_geometry_unapproved"]=True
    obj["R113_independent_casting_parent"]=casting.name
    return {"name":obj.name,"parent":casting.name,"real_vertices":len(mesh.vertices),
        "real_faces":len(mesh.polygons),"genuine_3d_closed_edges":edges,
        "source_silhouette_points":n,"local_forged_tab_depth":.081,
        "source_approved":False}

def angle_render(scene,path):
    source=scene.camera
    data=source.data.copy()
    cam=bpy.data.objects.new("R113_TEMPORARY_GEOMETRY_VIEW",data)
    scene.collection.objects.link(cam)
    try:
        cam.matrix_world=Matrix.Rotation(math.radians(35),4,"Y")@source.matrix_world
        scene.camera=cam
        bpy.context.view_layer.update()
        core.render(scene,path)
    finally:
        scene.camera=source
        bpy.data.objects.remove(cam,do_unlink=True)
        bpy.data.cameras.remove(data)
        bpy.context.view_layer.update()

def verify(scene,names,cam,mats,other,motion,added,case=None):
    current={o.name for o in scene.objects}
    if current!=names|{a["name"] for a in added}:
        raise RuntimeError("R113 changed unrelated original source-model objects")
    if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=cam:
        raise RuntimeError("R113 original camera moved")
    if panel_digest(scene)!=other:
        raise RuntimeError("R113 altered existing source 3D chassis, mounts, nozzle or fins")
    if core.lower_animated_fin_digest(scene)!=motion:
        raise RuntimeError("R113 altered original 64-frame lower fin motion")
    for item in added:
        ob=bpy.data.objects[item["name"]]
        if (ob.parent.name!=item["parent"] or
            not ob.get("R113_source_visible_real_solid") or
            not core.manifold_edges(ob.data)[0]):
            raise RuntimeError("R113 real separate 3D source lug did not persist")
    if case and scene.get("fsc_r113_variant")!=case:
        raise RuntimeError("R113 saved editable candidate variant missing")

def run(srcdir,out):
    src=Path(srcdir).resolve()/(INPUT+".blend")
    if hashlib.sha256(src.read_bytes()).hexdigest()!=SHA:
        raise RuntimeError("R113 requires exact successful source-tested R112 editable scene")
    out=Path(out).resolve()
    out.mkdir(parents=True,exist_ok=True)
    report={"revision":REV,"user_original_private_sprite_sha256":SOURCE_SHA,
            "original_sprite_uploaded":False,"original_source_correctness_approved":False,
            "geometry_goal":"independent, finite-solid asymmetrical metal shoulder retaining tabs",
            "cases":[]}
    for name,indices in CASES:
        bpy.ops.wm.open_mainfile(filepath=str(src))
        scene=bpy.context.scene
        scene.frame_set(1)
        if not scene.get("fsc_r112_revision") or scene.camera.data.type!="ORTHO":
            raise RuntimeError("R113 missing source-calibrated R112 actual metal casting")
        original_names={o.name for o in scene.objects}
        cam=tuple(float(v) for row in scene.camera.matrix_world for v in row)
        mats=core.scene_used_material_signature(scene)
        other=panel_digest(scene)
        motion=core.lower_animated_fin_digest(scene)
        authored=[]
        for side in (3,1):
            for number in indices:
                authored.append(actual_3d_tab(scene,side,number,TABS[side][number]))
        bpy.context.view_layer.update()
        verify(scene,original_names,cam,mats,other,motion,authored)
        scene.render.resolution_x,scene.render.resolution_y=core.NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
        frames={}
        for frame in FRAMES:
            scene.frame_set(frame)
            render=out/(name+f"_original_source_frame{frame:02d}.png")
            core.render(scene,render)
            if render.stat().st_size<5000:raise RuntimeError("R113 actual source camera render missing")
            frames[str(frame)]=render.name
        scene.frame_set(1)
        oblique=out/(name+"_real_3d_35deg.png")
        angle_render(scene,oblique)
        if oblique.stat().st_size<5000:raise RuntimeError("R113 oblique true metal solids absent")
        verify(scene,original_names,cam,mats,other,motion,authored)
        scene["fsc_r113_revision"]=REV
        scene["fsc_r113_variant"]=name
        scene["fsc_r113_source_approved"]=False
        blend=out/(name+".blend")
        bpy.ops.wm.save_as_mainfile(filepath=str(blend))
        if blend.stat().st_size<100000:raise RuntimeError("R113 editable original 3D not saved")
        bpy.ops.wm.open_mainfile(filepath=str(blend))
        verify(bpy.context.scene,original_names,cam,mats,other,motion,authored,name)
        report["cases"].append({"variant":name,"real_independent_solid_lugs":authored,
            "source_fidelity_not_approved":True,
            "source_native_frames":frames,"angled_3d_view":oblique.name,
            "editable_blend":blend.name,
            "blend_sha256":hashlib.sha256(blend.read_bytes()).hexdigest(),
            "all_prior_source_geometry_unchanged":True})
        (out/"r113_actual_3d_bespoke_shoulder_tabs.json").write_text(
            json.dumps(report,indent=2)+"\n",encoding="utf8")
        print("R113_GENUINE_BESPOKE_3D_METAL_TABS_SAVED_REOPENED",name,flush=True)
    print("R113_TRUE_3D_SOURCE_TABS_EXECUTED_VISUAL_APPROVAL_NOT_CLAIMED",flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--r112-dir",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.r112_dir,a.out)
