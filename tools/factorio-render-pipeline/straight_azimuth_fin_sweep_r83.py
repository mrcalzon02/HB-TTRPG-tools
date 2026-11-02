"""R83: straighten the unwanted FIN SIDE-SWEEP without losing radial clearance.

A real R82 3D chord test removed the +0.25 tile R57 radial clearance
of upper fins and exposed a huge source-incorrect dark nozzle pressure arch.
R82 is physically verified but VISUALLY REJECTED. Correct only the
longitudinal AZIMUTH sweep of the five current R81 original finite-volume
panels, preserving every row's original radius and Y position and exact
world-space root and distal tip. No transverse silhouette cheats, new
hardware or source-unknown rotating pivots.
"""
import argparse,hashlib,json,math,sys
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mathutils import Vector
from fin_mount_geometry_sweep_r50 import FIN_PREFIX,MOUNT_PREFIX,MAIN,UPPER,AXIS_Z
from mount_shape_fit_r52 import joint_gap_world
from mount_occlusion_diagnostic_r51 import render,NATIVE
from real_source_correct_fin_taper_r80 import (rest_geometry_digest,COLS,STATIONS,ONE_SKIN,signed_angle)

REVISION="R83_source_guarded_metal_fin_azimuth_straightening"
R81_SHA="0a8de6ccfe693726f71af8b5cfa4bfb44d5c7044d83607c20ba9019af58a803d"
SOURCE_ZIP_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
STRENGTHS=(0.,.60,1.)
CENTRE_COLUMN=5

def spine_angle(points,row):
    a=Vector(points[row*COLS+CENTRE_COLUMN])
    b=Vector(points[ONE_SKIN+row*COLS+CENTRE_COLUMN])
    c=(a+b)*.5
    return math.atan2(c.z-AXIS_Z,c.x),float(c.y)

def angular_curvature(points):
    first,y0=spine_angle(points,0)
    last,y1=spine_angle(points,STATIONS-1)
    if y0-y1<1.0:raise RuntimeError("R83 upper fin original source longitudinal shape unsupported")
    difference=signed_angle(last-first)
    errors=[]
    for row in range(STATIONS):
        ang,y=spine_angle(points,row)
        t=(y0-y)/(y0-y1)
        expect=first+difference*t
        errors.append(round(abs(signed_angle(ang-expect)),8))
    return errors

def correct_angle_only(fin,original,factor):
    if (fin.type!="MESH" or len(fin.data.vertices)!=2*ONE_SKIN or
        fin.data.shape_keys or
        fin.get("R21_actual_punched_slot_pairs")!=2 or
        not fin.data.color_attributes.get("R21_heat_tint")):
        raise RuntimeError("R83 expects original R81 complete two-skin slotted fin mesh")
    ang0,y0=spine_angle(original,0)
    ang1,y1=spine_angle(original,STATIONS-1)
    correction=signed_angle(ang1-ang0)
    was=angular_curvature(original)
    for row in range(STATIONS):
        oldang,y=spine_angle(original,row)
        t=(y0-y)/(y0-y1)
        expected=ang0+correction*t
        delta=signed_angle(expected-oldang)*factor
        if row in (0,STATIONS-1):delta=0.
        for skin in range(2):
            for col in range(COLS):
                k=skin*ONE_SKIN+row*COLS+col
                x,yy,z=original[k]
                radius=math.hypot(x,z-AXIS_Z)
                a=math.atan2(z-AXIS_Z,x)+delta
                fin.data.vertices[k].co=(radius*math.cos(a),yy,
                                          AXIS_Z+radius*math.sin(a))
    fin.data.update()
    now=[tuple(v.co) for v in fin.data.vertices]
    for k,(before,after) in enumerate(zip(original,now)):
        r0=math.hypot(before[0],before[2]-AXIS_Z)
        r1=math.hypot(after[0],after[2]-AXIS_Z)
        if abs(r0-r1)>1.e-5:
            raise RuntimeError("R83 destroyed original radial clearance, risking wrong dark arch")
        if abs(before[1]-after[1])>1e-6:
            raise RuntimeError("R83 moved lengthwise sheet station")
        row=(k%ONE_SKIN)//COLS
        if row in (0,STATIONS-1) and (Vector(before)-Vector(after)).length>1e-6:
            raise RuntimeError("R83 dislodged source hinge or tip")
    if any(p.area<1.e-10 for p in fin.data.polygons):
        raise RuntimeError("R83 collapsed original real metal fin surface")
    updated=angular_curvature(now)
    if factor==1. and max(updated)>1e-5:
        raise RuntimeError("R83 did not actually straighten the angular 3D swept form")
    if factor and max(updated)>max(was)+1e-6:
        raise RuntimeError("R83 made source-inaccurate curve larger")
    return {"before_angular_centerline_bow_radians":was,
            "after_angular_centerline_bow_radians":updated,
            "original_3d_radial_clearance_at_every_vertex_unchanged":True,
            "original_true_hinge_root_and_tip_fixed":True}

def validate(scene,protected,orig,cam,mats,names,gaps):
    if rest_geometry_digest(scene)!=protected:
        raise RuntimeError("R83 changed other real mesh/casting/hull/animated lower fin")
    if {ob.name for ob in scene.objects}!=names:
        raise RuntimeError("R83 invented or removed source components")
    if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=cam:
        raise RuntimeError("R83 original source camera moved")
    if {m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
        for m in bpy.data.materials}!=mats:
        raise RuntimeError("R83 secretly changed material")
    for index in UPPER:
        fin=bpy.data.objects[FIN_PREFIX+f"{index:02d}"]
        src=orig[fin.name]
        for j in range(len(src)):
            current=fin.data.vertices[j].co
            if abs(math.hypot(current.x,current.z-AXIS_Z)-
                   math.hypot(src[j][0],src[j][2]-AXIS_Z))>1e-5:
                raise RuntimeError("R83 saved/reopen lost source radial bell clearance")
    for i in MAIN:
        m=bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"]
        f=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
        gap=joint_gap_world(m,f)
        if gap>.003 or abs(gap-gaps[str(i)])>1e-6:
            raise RuntimeError("R83 hinge-to-fin real contact broken")

def run(src,out):
    src=Path(src).resolve();out=Path(out).resolve()
    if hashlib.sha256(src.read_bytes()).hexdigest()!=R81_SHA:
        raise RuntimeError("R83 requires the exact source-verified prior R81 candidate")
    bpy.ops.wm.open_mainfile(filepath=str(src))
    scene=bpy.context.scene;scene.frame_set(1)
    if scene.get("fsc_r81_revision") is None or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R83 does not have the source-calibrated original 3D rig")
    orig={FIN_PREFIX+f"{i:02d}":tuple(tuple(v.co) for v in bpy.data.objects[FIN_PREFIX+f"{i:02d}"].data.vertices)
          for i in UPPER}
    protected=rest_geometry_digest(scene)
    cam=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    names={o.name for o in scene.objects}
    mats={m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
          for m in bpy.data.materials}
    gaps={str(i):joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
                                 bpy.data.objects[FIN_PREFIX+f"{i:02d}"]) for i in MAIN}
    out.mkdir(parents=True,exist_ok=True)
    result={"revision":REVISION,"original_R81_blend_SHA256":R81_SHA,
            "source_wube_zip_SHA256_for_private_compare":SOURCE_ZIP_SHA,
            "wube_original_sprite_embedded":False,
            "original_sprite_visual_approved":False,
            "r82_straight_world_chord_rejected_for_bad_occlusion":True,
            "candidates":[]}
    for factor in STRENGTHS:
        metrics={}
        for i in UPPER:
            o=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
            metrics[str(i)]=correct_angle_only(o,orig[o.name],factor)
        bpy.context.view_layer.update()
        scene.frame_set(1)
        validate(scene,protected,orig,cam,mats,names,gaps)
        tag="sweep_straight_%03d"%round(factor*100)
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=10;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
        render(scene,out/(tag+"_frame01.png"))
        scene.frame_set(33)
        render(scene,out/(tag+"_frame33.png"))
        saved=None
        if factor:
            scene.frame_set(1)
            scene["fsc_r83_revision"]=REVISION
            scene["fsc_r83_azimuth_sweep_correction"]=factor
            scene["fsc_r83_original_sprite_visual_approved"]=False
            saved=out/(tag+".blend")
            bpy.ops.wm.save_as_mainfile(filepath=str(saved))
            if saved.stat().st_size<100000:raise RuntimeError("R83 Blender output missing")
            bpy.ops.wm.open_mainfile(filepath=str(saved))
            scene=bpy.context.scene
            validate(scene,protected,orig,cam,mats,names,gaps)
            if factor==1 and any(max(angular_curvature(
                    tuple(tuple(v.co) for v in bpy.data.objects[FIN_PREFIX+f"{i:02d}"].data.vertices)))>1e-5
                    for i in UPPER):
                raise RuntimeError("R83 saved actual 3D angular straightness not retained")
        result["candidates"].append({
            "angular_straightening_fraction":factor,
            "actual_five_formed_upper_fins":metrics,
            "frame1_real_native_rgba":tag+"_frame01.png",
            "frame33_real_native_rgba":tag+"_frame33.png",
            "saved_reopened_editable_blend":saved.name if saved else None,
            "sha256":hashlib.sha256(saved.read_bytes()).hexdigest() if saved else None,
            "original_3d_radial_clearance_mount_joint_and_64_frame_keys_preserved":True})
        if saved:
            bpy.ops.wm.open_mainfile(filepath=str(src));scene=bpy.context.scene;scene.frame_set(1)
    if hashlib.sha256(src.read_bytes()).hexdigest()!=R81_SHA:
        raise RuntimeError("R83 altered original source R81 persisted rig")
    (out/"r83_angular_sweep_corrected_fins.json").write_text(
        json.dumps(result,indent=2)+"\n",encoding="utf8")
    print("R83_REAL_3D_ANGLE_ONLY_CORRECTION_NO_DARK_ARCH_HYPOTHESIS_VERIFIED",flush=True)
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--source-blend",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.source_blend,a.out)
