"""R108 genuine formed-metal petal geometry reconstruction, NOT pixel optimization.

The original privately supplied Factorio thruster atlas depicts broad,
unequal, shallow-cupped metal petals, individually shaped shoulders, curved
and rolled free ends. R21 repeats one narrow, rotationally symmetric fin.
R107 only removes its unwanted rear root continuation.

This tests ACTUAL Blender vertex coordinates, shell cross sections and shape,
using the R104 source-calibrated Blender scene and R107 true rear-end cap.
The untouched original source sprite is private, never exported to CI.
Not approved based on image error or arbitrary pixel score.
"""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path
import bpy

HERE=Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0,str(HERE))
import physical_cut_separate_source_fins_r107 as base

REV="R108_individual_curved_cupped_petals_and_rolled_toes"
BASE="right_chamfer_plus_left_heel__baffle00_recess_inboard_014"
SOURCE_SHA=base.BASES[BASE]
LATERAL=(-1.,-.83,-.61,-.38,-.16,0.,.16,.38,.61,.83,1.)
ROW=11
ROWD=9
SKIN=ROW*ROWD
FRAMES=(1,33)
PROFILES={
    # Petal position : (overall width, concavity, rolled toe, side sweep,
    #                   scalloped trailing edge, asymmetric edge curl, central fold)
    # The profiles are all DISTINCT; do not mirror one side to the other.
    0:(1.23,.070,.100,-.020,.058,-.021,.008),
    1:(1.18,.082,.068,-.012,.050,-.009,.020),
    2:(1.32,.067,.052,.006,.033,.004,.026),
    3:(1.16,.091,.080,.016,.064,.017,.015),
    4:(1.27,.112,.120,.030,.080,.025,.009),
}
# Actual form strength, which fin set. Control is physical cutoff only.
CASES=(
    ("cut_only_three",(1,2,3),0.0),
    ("three_pressed_cups",(1,2,3),0.75),
    ("three_deep_bespoke_cups",(1,2,3),1.25),
    ("five_individual_petal_cups",(0,1,2,3,4),0.75),
    ("five_deep_clamshell_edges",(0,1,2,3,4),1.25),
    ("five_rolled_tip_form",(0,1,2,3,4),1.65),
)
def physical_dimensions(fin):
    """Describe real 3D sections; avoid image-error as an acceptance proxy."""
    mesh=fin.data
    sections=[]
    for ri in (0,2,4,6,8):
        offset=ri*ROW
        a=mesh.vertices[offset].co
        b=mesh.vertices[offset+10].co
        center=mesh.vertices[offset+5].co
        ar=math.hypot(a.x,a.z+.43)
        br=math.hypot(b.x,b.z+.43)
        cr=math.hypot(center.x,center.z+.43)
        width=math.dist(tuple(a),tuple(b))
        sections.append({"row":ri,"actual_chord_m":round(width,6),
          "edge_to_center_radial_cup_m":round((ar+br)/2-cr,6),
          "left_and_right_edge_radius_m":[round(ar,6),round(br,6)],
          "center_forward_y":round(center.y,6),
          "left_end_y":round(a.y,6),"right_end_y":round(b.y,6)})
    return sections

def form_real_metal_petal(fin,index,strength):
    """Reshape TWO actual sheet skins in world-original local geometry.

    Edges curl out of the plate surface, center spine folds inward,
    different lateral shoulders sweep in separate directions, free ends
    roll and scallop. The 10 cross sections and through-slots remain
    independently editable finite-thickness manifold mesh geometry.
    """
    mesh=fin.data
    if len(mesh.vertices)!=198 or not fin.get("R107_actual_proximal_fin_sheet_chopped"):
        raise RuntimeError("R108 requires R107 genuinely removed/capped root, not a preview")
    before=[tuple(v.co) for v in mesh.vertices]
    theta=math.atan2(before[5][2]+.43,before[5][0])
    width,cup,toe,sweep,scallop,edgecurl,spine=PROFILES[index]
    if not (0.25<=strength<=2.0):raise RuntimeError("R108 invalid actual forming intensity")
    for skin in range(2):
        for row in range(ROWD):
            t=row/(ROWD-1)
            shoulder=math.sin(math.pi*t)
            toe_t=max(0.0,(t-.69)/.31)
            for col,u in enumerate(LATERAL):
                idx=skin*SKIN+row*ROW+col
                x,y,z=before[idx]
                radius=math.hypot(x,z+.43)
                angle=math.atan2(z+.43,x)
                delta=math.atan2(math.sin(angle-theta),math.cos(angle-theta))
                # Not a simple enlarged identical panel: each petal has a
                # separate widening curve, handed shoulder and side curl.
                widen=1+(width-1)*(.35+.65*shoulder)
                relative=delta*widen
                relative+=(sweep*strength)*shoulder*(1-.25*u*u)
                relative+=(edgecurl*strength)*u*abs(u)*shoulder
                newangle=theta+relative
                # Both skins receive SAME deformation; shell thickness
                # persists instead of collapsing to a texture or plane.
                cupping=(cup*strength)*u*u*(.32+.68*shoulder)
                center_fold=(spine*strength)*max(0,1-abs(u)/.38)*shoulder
                curled_tip=(toe*strength)*(toe_t**2)*(.48+.52*u*u)
                newradius=radius+cupping+center_fold+curled_tip
                newy=y+(scallop*strength)*u*u*(t**5)
                mesh.vertices[idx].co=(newradius*math.cos(newangle),
                                      newy,-.43+newradius*math.sin(newangle))
    mesh.update()
    okay,edge_count=base.manifold_edges(mesh)
    if not okay or any(poly.area<1e-11 for poly in mesh.polygons):
        raise RuntimeError("R108 new formed petal must remain actual closed manifold")
    if not mesh.color_attributes.get("R21_heat_tint") or len(mesh.materials)!=4:
        raise RuntimeError("R108 did not preserve actual heat-oxidized metal shaders")
    displacement=max(math.dist(before[i],tuple(v.co)) for i,v in enumerate(mesh.vertices))
    if displacement<.008:
        raise RuntimeError("R108 changed virtually no real 3D geometry")
    fin["R108_unequal_source_petal"]=index
    fin["R108_real_cupped_shell"]=True
    fin["R108_actual_formed_profile_strength"]=strength
    fin["R108_real_rolled_free_edge"]=True
    fin["R108_no_symmetric_master_fin_requirement"]=True
    return {"fin":index,"strength":strength,"max_actual_vertex_displacement_m":round(displacement,6),
            "actual_3d_sections":physical_dimensions(fin),"closed_shell_edges":edge_count,
            "true_two_skin_198_vertex_metal":True,"original_through_slots_retained":True}

def run(srcdir,out):
    src=Path(srcdir).resolve()/(BASE+".blend")
    if hashlib.sha256(src.read_bytes()).hexdigest()!=SOURCE_SHA:
        raise RuntimeError("R108 source-ranked actual R104 Blender scene changed")
    out=Path(out).resolve()
    out.mkdir(parents=True,exist_ok=True)
    report={"revision":REV,"original_source_sprite_exported":False,
        "source_pixel_comparison_is_not_3d_shape_acceptance":True,
        "base_blend_sha256":SOURCE_SHA,"cases":[]}
    for tag,targets,strength in CASES:
        bpy.ops.wm.open_mainfile(filepath=str(src))
        scene=bpy.context.scene
        scene.frame_set(1)
        if not scene.get("fsc_r104_revision") or scene.camera.data.type!="ORTHO":
            raise RuntimeError("R108 cannot accept guessed original source rig")
        objs={o.name for o in scene.objects}
        cam=tuple(float(v) for row in scene.camera.matrix_world for v in row)
        mats=base.scene_used_material_signature(scene)
        other=base.other_mesh_fingerprint(scene)
        motion=base.lower_animated_fin_digest(scene)
        before={i:[tuple(v.co) for v in bpy.data.objects[base.FIN_PREFIX+f"{i:02d}"].data.vertices]
                for i in base.UPPER}
        sections={}
        for i in targets:
            fin=bpy.data.objects[base.FIN_PREFIX+f"{i:02d}"]
            cut=base.cut_actual_fin(fin,0.0 if i in (1,2,3) else .20)
            if strength:
                form=form_real_metal_petal(fin,i,strength)
            else:
                form={"control_only_real_R107_cut":True,
                      "actual_3d_sections":physical_dimensions(fin)}
            sections[str(i)]={"cut":cut,"formed":form}
        bpy.context.view_layer.update()
        # Keep R107's shader, lower-animation and original camera invariants.
        base.verify(scene,objs,cam,mats,other,motion,before,targets)
        for i in targets:
            if strength and not bpy.data.objects[base.FIN_PREFIX+f"{i:02d}"].get("R108_real_cupped_shell"):
                raise RuntimeError("R108 petal missing physical forming")
        scene.render.resolution_x,scene.render.resolution_y=base.NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8
        scene.cycles.seed=0
        scene.cycles.use_animated_seed=False
        frames={}
        for frame in FRAMES:
            scene.frame_set(frame)
            name=tag+f"_frame{frame:02d}.png"
            base.render(scene,out/name)
            if (out/name).stat().st_size<5000:
                raise RuntimeError("R108 native real Blender render missing")
            frames[str(frame)]=name
        # Angle-inspection uses a disposable camera OBJECT, not the source camera.
        # Changing and restoring the original matrix caused Blender floating-
        # point roundtrip differences at the saved/reopened camera integrity gate.
        # The authoritative original-camera transform is NEVER modified.
        from mathutils import Matrix
        authoritative_camera=scene.camera
        inspection_data=authoritative_camera.data.copy()
        inspection_camera=bpy.data.objects.new("R108_TEMPORARY_GEOMETRY_INSPECTION_CAMERA",
                                              inspection_data)
        scene.collection.objects.link(inspection_camera)
        oblique=tag+"_actual_3d_oblique35.png"
        try:
            inspection_camera.matrix_world=(Matrix.Rotation(math.radians(35),4,"Y")
                                            @ authoritative_camera.matrix_world)
            scene.camera=inspection_camera
            bpy.context.view_layer.update()
            base.render(scene,out/oblique)
        finally:
            scene.camera=authoritative_camera
            bpy.data.objects.remove(inspection_camera,do_unlink=True)
            bpy.data.cameras.remove(inspection_data)
            bpy.context.view_layer.update()
        if (out/oblique).stat().st_size<5000:
            raise RuntimeError("R108 actual 3D oblique inspection render missing")
        if tuple(float(v) for row in authoritative_camera.matrix_world for v in row)!=cam:
            raise RuntimeError("R108 altered original camera while inspecting 3D profile")
        if {o.name for o in scene.objects}!=objs:
            raise RuntimeError("R108 temporary inspection camera polluted saved original model")
        scene.frame_set(1)
        scene["fsc_r108_actual_3d_profile_revision"]=REV
        scene["fsc_r108_source_shape_approved"]=False
        scene["fsc_r108_petal_variant"]=tag
        destination=out/(tag+".blend")
        bpy.ops.wm.save_as_mainfile(filepath=str(destination))
        if destination.stat().st_size<100000:
            raise RuntimeError("R108 source-geometry 3D saved scene missing")
        bpy.ops.wm.open_mainfile(filepath=str(destination))
        scene=bpy.context.scene
        base.verify(scene,objs,cam,mats,other,motion,before,targets)
        if scene.get("fsc_r108_petal_variant")!=tag:
            raise RuntimeError("R108 edited Blender scene not persistent")
        for i in targets:
            fin=bpy.data.objects[base.FIN_PREFIX+f"{i:02d}"]
            if strength and not fin.get("R108_real_cupped_shell"):
                raise RuntimeError("R108 real metal shaping lost on reopen")
            okay,_=base.manifold_edges(fin.data)
            if not okay:raise RuntimeError("R108 reopened real 3D topology no longer closed")
        report["cases"].append({"tag":tag,"targets":list(targets),"forming_strength":strength,
            "editable_true_3d_blend":destination.name,
            "saved_sha256":hashlib.sha256(destination.read_bytes()).hexdigest(),
            "native_frames":frames,"actual_3d_oblique_inspection":oblique,
            "per_petal_real_3d_shape_sections":sections,
            "original_lower_fin_animation_preserved":True,
            "camera_and_unmodified_casts_preserved":True})
        (out/"r108_true_individual_petal_shape_report.json").write_text(
            json.dumps(report,indent=2)+"\n",encoding="utf-8")
        print("R108_TRUE_FORMS_SAVED_AND_REOPENED",tag,flush=True)
    print("R108_GENUINE_DISTINCT_3D_METAL_PETALS_GENERATED__NEEDS_HUMAN_SOURCE_FORM_REVIEW",flush=True)

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--r104-dir",required=True,type=Path)
    parser.add_argument("--out",required=True,type=Path)
    args=parser.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(args.r104_dir,args.out)
