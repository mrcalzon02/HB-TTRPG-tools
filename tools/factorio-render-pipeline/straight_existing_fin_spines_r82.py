"""R82: straighten the actual 3D upper heat-sheet spines, not their silhouettes.

R81 fixed the real metal width taper but left old R49/R57 curved 3D fin
centerlines. User's actual original Factorio sprite shows considerably
straighter hanging fins. We retain the R81 root-to-tip alignment and
the exact row-0 hinge contact and distal row-9 edge. Every intermediate
row of each genuine 220-vertex twin-skin R21 mesh translates bodily
in the original plane of the fin. No shader, material, masks, guessed
actuator, animation key, fin length, camera or mount assembly is edited.
Original 64-frame artwork is private; visual acceptance is separate.
"""
import argparse,hashlib,json,math,sys
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
from fin_mount_geometry_sweep_r50 import FIN_PREFIX,MOUNT_PREFIX,MAIN,UPPER
from mount_shape_fit_r52 import joint_gap_world
from mount_occlusion_diagnostic_r51 import render,NATIVE
from real_source_correct_fin_taper_r80 import (rest_geometry_digest,COLS,STATIONS,ONE_SKIN)

REVISION="R82_genuinely_straight_metal_fins_existing_hinges_preserved"
SOURCE_SHA="0a8de6ccfe693726f71af8b5cfa4bfb44d5c7044d83607c20ba9019af58a803d"
ORIGINAL_SPRITE_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
STRENGTHS=(0.,.70,1.)
CENTRE_COLUMN=5
FIN_INDICES=(0,1,2,3,4)

def row_center(points,row):
    return (Vector(points[row*COLS+CENTRE_COLUMN])+
            Vector(points[ONE_SKIN+row*COLS+CENTRE_COLUMN]))*.5

def spine_deviations(points):
    a=row_center(points,0)
    b=row_center(points,STATIONS-1)
    if a.y-b.y<1.0:raise RuntimeError("R82 wrong source upper metal fin longitudinal endpoints")
    out=[]
    for row in range(STATIONS):
        c=row_center(points,row)
        t=(a.y-c.y)/(a.y-b.y)
        expected=a+(b-a)*t
        residual=math.hypot(c.x-expected.x,c.z-expected.z)
        out.append(round(residual,7))
    return out

def straighten_existing_3d_panel(fin,coords,strength):
    if (fin.type!="MESH" or len(fin.data.vertices)!=2*ONE_SKIN or
        fin.data.shape_keys or fin.get("R21_actual_punched_slot_pairs")!=2 or
        not fin.data.color_attributes.get("R21_heat_tint")):
        raise RuntimeError("R82 requires authentic original R21 finite-volume slotted sheet")
    if not 0<=strength<=1:raise ValueError(strength)
    if len(coords)!=2*ONE_SKIN:raise RuntimeError("R82 original 3D coordinates missing")
    origin=row_center(coords,0);tail=row_center(coords,STATIONS-1)
    orig_error=spine_deviations(coords)
    for row in range(STATIONS):
        old_center=row_center(coords,row)
        u=(origin.y-old_center.y)/(origin.y-tail.y)
        target=origin+(tail-origin)*u
        shift=(target-old_center)*strength
        if row in (0,STATIONS-1):shift=Vector((0.,0.,0.))
        for skin in range(2):
            for col in range(COLS):
                i=skin*ONE_SKIN+row*COLS+col
                pt=Vector(coords[i])
                fin.data.vertices[i].co=(pt.x+shift.x,pt.y,pt.z+shift.z)
    fin.data.update()
    current=[tuple(v.co) for v in fin.data.vertices]
    errors=spine_deviations(current)
    for i,(pt,old) in enumerate(zip(current,coords)):
        row=(i%ONE_SKIN)//COLS
        if row in (0,STATIONS-1) and (Vector(pt)-Vector(old)).length>1e-6:
            raise RuntimeError("R82 moved real pivot or original blunt free edge")
        if abs(pt[1]-old[1])>1e-6:
            raise RuntimeError("R82 altered fin axial length/animation placement")
    if strength>0 and max(errors[1:-1])>=max(orig_error[1:-1])-.0001:
        raise RuntimeError("R82 didn't actually remove original fin body curvature")
    if strength==1 and max(errors)>.00002:
        raise RuntimeError("R82 3D longitudinal body still bows after full correction")
    if any(p.area<1e-10 for p in fin.data.polygons):
        raise RuntimeError("R82 collapsed punched original physical slot or shell surface")
    return {"before_3d_spine_deviation_tiles":orig_error,
            "after_3d_spine_deviation_tiles":errors,
            "maximum_original_3d_bow_tiles":max(orig_error),
            "maximum_revised_3d_bow_tiles":max(errors),
            "original_root_and_blunt_end_untouched":True,
            "all_physical_original_two_skin_slot_faces_unchanged":True}

def protect(scene,nonfin,originals,cam,mats,names,gaps):
    if rest_geometry_digest(scene)!=nonfin:
        raise RuntimeError("R82 changed non-fin original hull, hinges, lower animations or support webs")
    if {x.name for x in scene.objects}!=names:
        raise RuntimeError("R82 invented new mechanic or removed original source geometry")
    if tuple(float(x) for row in scene.camera.matrix_world for x in row)!=cam:
        raise RuntimeError("R82 source camera moved")
    if {x.name:(tuple(x.diffuse_color),len(x.node_tree.nodes) if x.use_nodes else -1)
         for x in bpy.data.materials}!=mats:
        raise RuntimeError("R82 changed original material instead of shape")
    for i in FIN_INDICES:
        fin=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
        for k in range(2*ONE_SKIN):
            row=(k%ONE_SKIN)//COLS
            if row in (0,STATIONS-1):
                if (fin.data.vertices[k].co-Vector(originals[fin.name][k])).length>1e-5:
                    raise RuntimeError("R82 saved scene moved actual fin hinge or tip")
    for i in MAIN:
        mount=bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"]
        fin=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
        gap=joint_gap_world(mount,fin)
        if gap>.003 or abs(gap-gaps[str(i)])>1e-6:
            raise RuntimeError("R82 separated original bespoke fin root and fixed casting")

def run(source,out):
    source=Path(source).resolve();out=Path(out).resolve()
    if hashlib.sha256(source.read_bytes()).hexdigest()!=SOURCE_SHA:
        raise RuntimeError("R82 requires exact verified R81 .blend, not approximated new model")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene;scene.frame_set(1)
    if scene.get("fsc_r81_revision") is None or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R82 did not receive exact prior R81 corrected taper rig")
    cam=tuple(float(x) for row in scene.camera.matrix_world for x in row)
    mats={x.name:(tuple(x.diffuse_color),len(x.node_tree.nodes) if x.use_nodes else -1)
          for x in bpy.data.materials}
    names={x.name for x in scene.objects}
    nonfin=rest_geometry_digest(scene)
    originals={FIN_PREFIX+f"{i:02d}":tuple(tuple(v.co) for v in bpy.data.objects[FIN_PREFIX+f"{i:02d}"].data.vertices)
               for i in FIN_INDICES}
    gaps={str(i):joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
                                bpy.data.objects[FIN_PREFIX+f"{i:02d}"]) for i in MAIN}
    result={"revision":REVISION,"real_R81_source_SHA256":SOURCE_SHA,
            "original_wube_source_zip_SHA256":ORIGINAL_SPRITE_SHA,
            "original_sprite_pixels_or_atlases_in_artifact":False,
            "visual_source_approval":False,"candidates":[]}
    out.mkdir(parents=True,exist_ok=True)
    for factor in STRENGTHS:
        measurement={}
        for i in FIN_INDICES:
            obj=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
            measurement[str(i)]=straighten_existing_3d_panel(obj,originals[obj.name],factor)
        bpy.context.view_layer.update();scene.frame_set(1)
        protect(scene,nonfin,originals,cam,mats,names,gaps)
        tag="spine_straight_%03d"%round(factor*100)
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=10;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
        render(scene,out/(tag+"_frame01.png"))
        scene.frame_set(33)
        render(scene,out/(tag+"_frame33.png"))
        scene.frame_set(1)
        saved=None
        if factor>0:
            scene["fsc_r82_revision"]=REVISION
            scene["fsc_r82_spine_straightening_fraction"]=factor
            scene["fsc_r82_private_original_source_approved"]=False
            saved=out/(tag+".blend")
            bpy.ops.wm.save_as_mainfile(filepath=str(saved))
            if saved.stat().st_size<100000:
                raise RuntimeError("R82 failed to save actual editable Blender scene")
            bpy.ops.wm.open_mainfile(filepath=str(saved));scene=bpy.context.scene
            protect(scene,nonfin,originals,cam,mats,names,gaps)
            for i in FIN_INDICES:
                fin=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
                now=spine_deviations(tuple(tuple(v.co) for v in fin.data.vertices))
                before=measurement[str(i)]["maximum_original_3d_bow_tiles"]
                if factor==1 and max(now)>.00002:
                    raise RuntimeError("R82 saved/reopened fin still bends")
                if factor<1 and max(now)>before:
                    raise RuntimeError("R82 saved/reopened panel straightening not retained")
        result["candidates"].append({
            "strength":factor,"per_fin_real_3d_centerline_bow":measurement,
            "native_frame01":tag+"_frame01.png",
            "native_frame33":tag+"_frame33.png",
            "saved_reopened_actual_blend":saved.name if saved else None,
            "sha256":hashlib.sha256(saved.read_bytes()).hexdigest() if saved else None,
            "same_original_3d_hinge_contacts_fin_taper_and_lower_animation":True})
        if saved:
            bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene;scene.frame_set(1)
    if hashlib.sha256(source.read_bytes()).hexdigest()!=SOURCE_SHA:
        raise RuntimeError("R82 modified original R81 accepted working comparison scene")
    (out/"r82_real_3d_spine_straightening.json").write_text(
        json.dumps(result,indent=2)+"\n",encoding="utf8")
    print("R82_REAL_FIN_SPINE_STRAIGHTENED_SAVED_REOPEN_VERIFIED",flush=True)
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--source-blend",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.source_blend,a.out)
