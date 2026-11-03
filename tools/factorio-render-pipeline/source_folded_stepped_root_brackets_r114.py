"""R114: replace rectangular R113 retaining pips with individual formed 3D mounts.

These are candidate *physical* notched/folded metal brackets, reconstructed
from the user's private authentic Factorio thruster sprite landmarks. They are
not sprites, decals, mirrored pieces, generic new rings or Wube CAD.

The original image remains PRIVATE. Source visual approval is not assumed.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path
from mathutils import Matrix
import bpy

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))
import physical_cut_separate_source_fins_r107 as core
import source_thin_independent_pressed_plates_r112 as r112
import source_individual_hinge_casts_r110 as r110

REV = "R114_source_bespoke_notched_folded_hinge_brackets"
SOURCE_SHA = "0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
INPUT = "individual_original_root_tabs.blend"
OLD_PREFIX = "R113_SOURCE_ROOT_LUG_"
NEW_PREFIX = "R114_SOURCE_FOLDED_BRACKET_"
FRAMES = (1, 33)
# Source-camera native 264x542 landmarks. Each outline is physically
# formed in 3D, with a different concave return/lip and individual volume.
# The source-visible geometry is tentative: not yet private-source approved.
OUTLINES = {
    3: (
        ((39,344),(44,339),(49,337),(53,341),(54,345),(51,346),
         (49,350),(49,354),(45,356),(43,350),(40,350)),
        ((62,327),(66,323),(72,323),(76,329),(74,332),(71,333),
         (72,339),(67,342),(64,337),(64,331),(62,331)),
        ((86,333),(91,328),(97,330),(99,335),(96,337),
         (95,344),(90,347),(88,340),(88,337),(86,337)),
    ),
    1: (
        ((168,325),(172,320),(178,318),(183,322),(185,328),
         (181,331),(179,336),(173,335),(171,330),(168,330)),
        ((188,329),(194,324),(200,326),(204,332),(201,337),
         (199,338),(201,342),(194,344),(190,339),(191,334),(188,334)),
        ((211,347),(216,341),(221,341),(225,347),(222,352),
         (223,356),(217,361),(213,355),(213,351),(211,351)),
    ),
}
# control, sculpted narrow-crown, deeper return/stronger outer form.
CASES = (
    ("r113_rectangular_pip_control", None),
    ("independent_forged_lips", (0.93, 0.033, 0.050)),
    ("stepped_offset_return_brackets", (1.02, 0.070, 0.085)),
)

def polygon_area(points):
    return .5 * sum(points[i][0]*points[(i+1)%len(points)][1] -
                    points[(i+1)%len(points)][0]*points[i][1]
                    for i in range(len(points)))

def crosses(a,b,c,d):
    def cross(p,q,r):
        return (q[0]-p[0])*(r[1]-p[1]) - (q[1]-p[1])*(r[0]-p[0])
    return cross(a,b,c)*cross(a,b,d)<0 and cross(c,d,a)*cross(c,d,b)<0

def validate_footprints():
    if set(OUTLINES)!={1,3} or any(len(p)!=3 for p in OUTLINES.values()):
        raise RuntimeError("R114 requires three distinct source brackets on each side")
    for side, shapes in OUTLINES.items():
        for number, points in enumerate(shapes):
            n=len(points)
            if n<9 or len(set(points))!=n or abs(polygon_area(points))<100:
                raise RuntimeError("R114 invalid physical bracket footprint")
            for i in range(n):
                for j in range(i+2,n):
                    if i==0 and j==n-1:
                        continue
                    if crosses(points[i],points[(i+1)%n],
                               points[j],points[(j+1)%n]):
                        raise RuntimeError("R114 crossed bracket section")

def preserved_digest(scene):
    omit={ob.name for ob in scene.objects
          if ob.name.startswith((OLD_PREFIX,NEW_PREFIX))}
    return r110.mesh_digest(scene, omit)

def old_tabs(scene):
    return {ob.name for ob in scene.objects if ob.name.startswith(OLD_PREFIX)}

def insert_formed_solid(scene, side, number, profile):
    casting=bpy.data.objects[r112.CASTS[side]]
    if not casting.get("R112_unified_source_shoulder_forging"):
        raise RuntimeError("R114 source fitted *thin* side shoulder is missing")
    if casting.type!="MESH" or casting.hide_render:
        raise RuntimeError("R114 cannot parent real bracket to hidden mount")
    footprint=OUTLINES[side][number]
    n=len(footprint)
    scale,fold,depth=profile
    cx=sum(p[0] for p in footprint)/n
    cy=sum(p[1] for p in footprint)/n
    caminv=scene.camera.matrix_world.inverted_safe()
    maxfront=max((caminv@(casting.matrix_world@v.co)).z
                 for v in casting.data.vertices)
    inv=casting.matrix_world.inverted_safe()
    # Back ring cuts INTO existing R112 shoulder; forward two rings form
    # an actual finite-thickness folded lip, not a camera-plane overlay.
    def pos(x,y,z):
        return tuple(inv@r112.source_camera_point(scene,x,y,z))
    verts=[]
    for ring in range(3):
        for i,(x,y) in enumerate(footprint):
            delta_x=x-cx; delta_y=y-cy
            # Mildly pitched side-to-side crease, different on both sides.
            handed=-1 if side==3 else 1
            skew=(handed*(i/n-.5)*1.15 if ring==1 else 0.)
            shrink=(1.,scale*1.017,scale*.89)[ring]
            px=cx+delta_x*shrink+skew
            py=cy+delta_y*shrink
            z=(maxfront-.055 if ring==0 else
               maxfront+.018 if ring==1 else
               maxfront+depth+fold*(.17 + .44*(i%3)/2))
            verts.append(pos(px,py,z))
    faces=[tuple(reversed(range(n)))]
    for layer in range(2):
        for i in range(n):
            j=(i+1)%n
            a=layer*n
            b=(layer+1)*n
            faces.append((a+i,a+j,b+j,b+i))
    faces.append(tuple(2*n+i for i in range(n)))
    mesh=bpy.data.meshes.new(f"{NEW_PREFIX}{side}_{number}_MESH")
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    material=casting.data.materials[0]
    if material is None:
        raise RuntimeError("R114 cannot guess unknown material from source")
    mesh.materials.append(material)
    for face in mesh.polygons:
        face.use_smooth=False
        face.material_index=0
    manifold,edge_count=core.manifold_edges(mesh)
    if not manifold or any(poly.area<1.e-10 for poly in mesh.polygons):
        raise RuntimeError("R114 bracket is not closed physical 3D metal")
    if len(mesh.vertices)!=3*n or len(mesh.polygons)!=2*n+2:
        raise RuntimeError("R114 geometry lost forged front/back section")
    obj=bpy.data.objects.new(f"{NEW_PREFIX}{side}_{number}",mesh)
    casting.users_collection[0].objects.link(obj)
    obj.parent=casting
    obj.location=(0.,0.,0.)
    obj.rotation_euler=(0.,0.,0.)
    obj.scale=(1.,1.,1.)
    obj["R114_original_sprite_source_landmark_candidate"]=True
    obj["R114_original_source_visual_unapproved"]=True
    obj["R114_parent_source_shoulder"]=casting.name
    return {"object":obj.name,"side":side,"source_lug_number":number,
            "parent":casting.name,"real_vertices":len(mesh.vertices),
            "real_faces":len(mesh.polygons),"physical_manifold_edges":edge_count,
            "notched_source_footprint_points":n,
            "finite_crown_depth":round(depth+fold*.61+.055,5),
            "source_visually_approved":False}

def orbit(scene,out):
    original=scene.camera
    temporary_data=original.data.copy()
    temporary=bpy.data.objects.new("R114_TEMP_3D_SHAPE_VIEW",temporary_data)
    scene.collection.objects.link(temporary)
    try:
        temporary.matrix_world=Matrix.Rotation(math.radians(35),4,"Y")@original.matrix_world
        scene.camera=temporary
        bpy.context.view_layer.update()
        core.render(scene,out)
    finally:
        scene.camera=original
        bpy.data.objects.remove(temporary,do_unlink=True)
        bpy.data.cameras.remove(temporary_data)
        bpy.context.view_layer.update()

def verify(scene,original,oldnames,camera,materials,untouched,motion,created,case):
    if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=camera:
        raise RuntimeError("R114 moved original sprite-calibrated camera")
    if core.scene_used_material_signature(scene)!=materials:
        raise RuntimeError("R114 altered original shader slots/materials")
    if preserved_digest(scene)!=untouched:
        raise RuntimeError("R114 changed original fins, hinges, nozzle, or chassis")
    if core.lower_animated_fin_digest(scene)!=motion:
        raise RuntimeError("R114 lost 64-frame original lower fin animation")
    actual={ob.name for ob in scene.objects}
    expected=(original if case==CASES[0][0]
              else (original-oldnames)|{a["object"] for a in created})
    if actual!=expected:
        raise RuntimeError("R114 extra, missing or discarded 3D geometry")
    for part in created:
        obj=bpy.data.objects[part["object"]]
        if (obj.parent.name!=part["parent"] or
            not obj.get("R114_original_source_visual_unapproved") or
            not core.manifold_edges(obj.data)[0]):
            raise RuntimeError("R114 formed source metal cannot be reopened")
    if scene.get("fsc_r114_variant") and scene["fsc_r114_variant"]!=case:
        raise RuntimeError("R114 saved source 3D case mismatch")

def run(r113dir,outdir):
    validate_footprints()
    source=Path(r113dir).resolve()/INPUT
    out=Path(outdir).resolve()
    out.mkdir(parents=True,exist_ok=True)
    if not source.is_file() or source.stat().st_size<100000:
        raise RuntimeError("R114 needs original successfully saved R113 editable model")
    report={"revision":REV,"original_private_sprite_sha256":SOURCE_SHA,
            "source_bitmap_exported":False,"visual_match_approved":False,
            "geometry_target":"replace source-wrong small square pips with individually formed, stepped notched real solids",
            "cases":[]}
    for tag,profile in CASES:
        bpy.ops.wm.open_mainfile(filepath=str(source))
        scene=bpy.context.scene
        scene.frame_set(1)
        if (not scene.get("fsc_r113_revision")
            or scene.get("fsc_r113_variant")!="individual_original_root_tabs"
            or scene.camera.data.type!="ORTHO"):
            raise RuntimeError("R114 expected actual R113 verified root casting geometry")
        original={ob.name for ob in scene.objects}
        oldnames=old_tabs(scene)
        if len(oldnames)!=6:
            raise RuntimeError("R114 does not have six separate real R113 root pips")
        camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
        mats=core.scene_used_material_signature(scene)
        other=preserved_digest(scene)
        motion=core.lower_animated_fin_digest(scene)
        created=[]
        if profile:
            for name in sorted(oldnames):
                obj=bpy.data.objects[name]
                datablock=obj.data
                bpy.data.objects.remove(obj,do_unlink=True)
                if datablock.users==0:
                    bpy.data.meshes.remove(datablock)
            for side in (3,1):
                for number in range(3):
                    created.append(insert_formed_solid(scene,side,number,profile))
        bpy.context.view_layer.update()
        verify(scene,original,oldnames,camera,mats,other,motion,created,tag)
        scene.render.resolution_x,scene.render.resolution_y=core.NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8
        scene.cycles.seed=0
        scene.cycles.use_animated_seed=False
        frames={}
        for frame in FRAMES:
            scene.frame_set(frame)
            outfile=out/(tag+f"_original_camera_frame{frame:02d}.png")
            core.render(scene,outfile)
            if outfile.stat().st_size<5000:
                raise RuntimeError("R114 failed native original-frame Blender rendering")
            frames[str(frame)]=outfile.name
        scene.frame_set(1)
        angled=out/(tag+"_true_3d_oblique.png")
        orbit(scene,angled)
        if angled.stat().st_size<5000:
            raise RuntimeError("R114 35-degree real-shape view missing")
        verify(scene,original,oldnames,camera,mats,other,motion,created,tag)
        scene["fsc_r114_revision"]=REV
        scene["fsc_r114_variant"]=tag
        scene["fsc_r114_source_visually_approved"]=False
        blend=out/(tag+".blend")
        bpy.ops.wm.save_as_mainfile(filepath=str(blend))
        if blend.stat().st_size<100000:
            raise RuntimeError("R114 3D model not saved")
        bpy.ops.wm.open_mainfile(filepath=str(blend))
        verify(bpy.context.scene,original,oldnames,camera,mats,other,motion,created,tag)
        report["cases"].append({"variant":tag,
            "replaced_prior_incorrect_pips":bool(profile),
            "existing_original_machine_geometry_unchanged":True,
            "genuine_notched_solid_brackets":created,
            "native_source_camera_frames":frames,
            "actual_3d_oblique_render":angled.name,
            "editable_blend":blend.name,
            "sha256":hashlib.sha256(blend.read_bytes()).hexdigest(),
            "source_shape_fidelity_unapproved":True})
        (out/"r114_physically_notched_bracket_candidates.json").write_text(
            json.dumps(report,indent=2)+"\n",encoding="utf8")
        print("R114_TRUE_3D_NOTCHED_SOURCE_BRACKET_SAVED_REOPENED",tag,flush=True)
    print("R114_SOURCE_FORMED_BESPOKE_3D_DONE_VISUAL_APPROVAL_PENDING",flush=True)

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--r113-dir",required=True,type=Path)
    parser.add_argument("--out",required=True,type=Path)
    args=parser.parse_args(sys.argv[sys.argv.index("--")+1:]
                           if "--" in sys.argv else sys.argv[1:])
    run(args.r113_dir,args.out)
