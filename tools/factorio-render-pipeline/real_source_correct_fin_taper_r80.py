"""R80: correct the INVERTED taper of five existing R21 metal heat fins.

The original native Factorio sprite shows distinct wide metal shoulders near
each real upper casting and a narrower free end. Historic R48 widened free
tips by 1.47x (main) / 1.22x (peripheral), creating the backwards paddles.
Repair the REAL two-skinned, slotted, embossed 220-vertex meshes in Blender,
not just silhouette masks. Preserve EXACT existing hinge row 0 vertices,
all three source-specific casting-to-fin contacts, panels' Y profiles,
depth/central spine, slots, materials/heat tint, and 64 lower-frame keys.
The two already-shortened central hinge ears come from verified R79 .blend.
Never upload original proprietary sprites in a public CI artifact.
"""
import argparse,hashlib,json,math,struct,sys
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mathutils import Vector
from fin_mount_geometry_sweep_r50 import FIN_PREFIX,MOUNT_PREFIX,UPPER,MAIN,AXIS_Z
from mount_shape_fit_r52 import joint_gap_world
from mount_occlusion_diagnostic_r51 import render,projected_bounds,NATIVE

REVISION="R80_real_metal_fin_shoulder_to_taper_original_sprite"
R79_SOURCE_SHA="82e46c882738e038d8c7e09e7d91eed0516d92ad505890614bc86371d33a79d5"
USER_SOURCE_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
# Real angular half-widths at each station, not image plane scale factors.
# source-distinct 0/4 have a smaller exposed shoulder than main 1/2/3.
# all candidates monotonically NARROW from row 2 through the free end.
CANDIDATES=((.19,.08),(.19,.11),(.22,.08),(.22,.11))
ROW_RATIO=(None,.78,1.,.98,.92,.81,.69,.57,.47,None)
STATIONS=10
COLS=11
ONE_SKIN=STATIONS*COLS

def rest_geometry_digest(scene):
    digest=hashlib.sha256()
    for ob in sorted(scene.objects,key=lambda o:o.name):
        if ob.type!="MESH" or ob.name in {FIN_PREFIX+f"{i:02d}" for i in UPPER}:
            continue
        digest.update(ob.name.encode())
        digest.update(struct.pack("<II",len(ob.data.vertices),len(ob.data.polygons)))
        for v in ob.data.vertices:digest.update(struct.pack("<fff",*v.co))
        if ob.data.shape_keys:
            for block in ob.data.shape_keys.key_blocks:
                digest.update(block.name.encode())
                for v in block.data:digest.update(struct.pack("<fff",*v.co))
    return digest.hexdigest()

def signed_angle(a):
    return (a+math.pi)%(math.tau)-math.pi

def actual_width(fin,row):
    left=fin.data.vertices[row*COLS].co
    right=fin.data.vertices[row*COLS+COLS-1].co
    a=math.atan2(left.z-AXIS_Z,left.x)
    b=math.atan2(right.z-AXIS_Z,right.x)
    return abs(signed_angle(b-a))/2.

def shape_original_real_fin(fin,original,shoulder,free):
    if (fin.type!="MESH" or len(fin.data.vertices)!=2*ONE_SKIN
        or fin.data.shape_keys or not fin.data.color_attributes.get("R21_heat_tint")
        or fin.get("R21_actual_punched_slot_pairs")!=2):
        raise RuntimeError("R80 requires original genuine R21 punched formed twin skin")
    if len(original)!=220:raise RuntimeError("Original actual fin vertices absent")
    index=int(fin.name.rsplit("_",1)[-1])
    if index not in UPPER:raise RuntimeError("R80 refuses original keyed lower animation")
    factor=.84 if index in (0,4) else 1.
    width_shoulder=shoulder*factor
    width_free=free*factor
    wanted=[]
    for row in range(STATIONS):
        if row==0:
            wanted.append(None)
        elif row==STATIONS-1:
            wanted.append(width_free)
        else:
            # One continuous strictly decreasing curve; never rebound at free edge.
            # Smoothstep preserves a broader formed shoulder than a linear wedge.
            t=(row-2)/7.
            eased=t*t*(3.-2.*t)
            wanted.append(width_shoulder+(width_free-width_shoulder)*eased)
    if not all(wanted[row]>wanted[row+1] for row in range(2,9)):
        raise RuntimeError("R80 refused incorrect widening towards free end")
    for skin in range(2):
        for row in range(STATIONS):
            # Use each skin's existing 3D center and LOCAL angle: preserves
            # the individual fin bow, twist, sectional metal ridge and depth.
            center=Vector(original[skin*ONE_SKIN+row*COLS+5])
            axis=math.atan2(center.z-AXIS_Z,center.x)
            start=Vector(original[skin*ONE_SKIN+row*COLS])
            end=Vector(original[skin*ONE_SKIN+row*COLS+COLS-1])
            a=signed_angle(math.atan2(start.z-AXIS_Z,start.x)-axis)
            b=signed_angle(math.atan2(end.z-AXIS_Z,end.x)-axis)
            half=(abs(a)+abs(b))/2.
            if half<.02 or half>.32:
                raise RuntimeError("R80 original fin sheet has unexpected radial width")
            scale=(wanted[row]/half) if wanted[row] is not None else 1.
            for col in range(COLS):
                pos=skin*ONE_SKIN+row*COLS+col
                x,y,z=original[pos]
                radius=math.hypot(x,z-AXIS_Z)
                delta=signed_angle(math.atan2(z-AXIS_Z,x)-axis)
                new_a=axis+delta*scale
                fin.data.vertices[pos].co=(radius*math.cos(new_a),y,
                                            AXIS_Z+radius*math.sin(new_a))
    fin.data.update()
    if any((fin.data.vertices[j].co-Vector(original[j])).length>1e-6
           for j in list(range(COLS))+list(range(ONE_SKIN,ONE_SKIN+COLS))):
        raise RuntimeError("R80 modified true fin clamp contact row")
    after=[actual_width(fin,row) for row in range(STATIONS)]
    if not all(after[row]>after[row+1] for row in range(2,9)):
        raise RuntimeError("R80 actual width still expands away from hinge")
    if after[-1]>=after[2]*.85:
        raise RuntimeError("R80 failed to narrow terminal tip")
    if any(p.area<1.e-9 for p in fin.data.polygons):
        raise RuntimeError("R80 collapsed genuine slot or heat-finned face")
    if any(abs(fin.data.vertices[j].co.y-original[j][1])>1e-6
           for j in range(220)):
        raise RuntimeError("R80 changed original sheet length or axial trajectory")
    return {"real_half_width_angle_per_station":[round(v,6) for v in after],
            "root_contact_rows_intact":True,
            "punched_pair_slots_retained":2,
            "stamped_embossed_spine_and_3D_skin_depth_intact":True}

def verify(scene,orig,nonfin,camera,mats,names,joints):
    if rest_geometry_digest(scene)!=nonfin:
        raise RuntimeError("R80 mutated unrelated original hardware or lower fin animation")
    if {ob.name for ob in scene.objects}!=names:
        raise RuntimeError("R80 created or removed a non-source object")
    if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=camera:
        raise RuntimeError("R80 altered original calibrated Factorio camera")
    if {m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
        for m in bpy.data.materials}!=mats:
        raise RuntimeError("R80 altered original material shade or shader node topology")
    for i in UPPER:
        ob=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
        coords=orig[ob.name]
        for row in (0,9):
            for skin in range(2):
                for col in range(COLS):
                    v=ob.data.vertices[skin*ONE_SKIN+row*COLS+col].co
                    if row==0 and (v-Vector(coords[skin*ONE_SKIN+col])).length>1e-6:
                        raise RuntimeError("R80 real hinge was moved")
                    if abs(v.y-coords[skin*ONE_SKIN+row*COLS+col][1])>1e-6:
                        raise RuntimeError("R80 altered source original fin length")
    for i in MAIN:
        gap=joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
                            bpy.data.objects[FIN_PREFIX+f"{i:02d}"])
        if gap>.003 or abs(gap-joints[str(i)])>1e-6:
            raise RuntimeError("R80 disconnected original bespoke physical fin mount")

def run(source,out,candidates=None,revision=REVISION,report_name="r80_physically_correct_fin_taper.json"):
    source=Path(source).resolve();out=Path(out).resolve()
    if hashlib.sha256(source.read_bytes()).hexdigest()!=R79_SOURCE_SHA:
        raise RuntimeError("R80 needs exact saved R79 true original-mounted geometry")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene;scene.frame_set(1)
    if scene.get("fsc_r79_revision") is None or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R80 requires previous physical R79 hinge scene")
    camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    mats={m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
          for m in bpy.data.materials}
    names={o.name for o in scene.objects}
    nonfin=rest_geometry_digest(scene)
    originals={FIN_PREFIX+f"{i:02d}":tuple(tuple(v.co) for v in bpy.data.objects[FIN_PREFIX+f"{i:02d}"].data.vertices)
               for i in UPPER}
    joints={str(i):joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
               bpy.data.objects[FIN_PREFIX+f"{i:02d}"]) for i in MAIN}
    out.mkdir(parents=True,exist_ok=True)
    if candidates is None:candidates=CANDIDATES
    results={"revision":revision,"original_user_sprite_zip_sha256":USER_SOURCE_SHA,
        "original_source_sprite_included":False,"visually_approved":False,
        "original_r79_saved_scene_sha256":R79_SOURCE_SHA,"candidates":[]}
    for shoulder,free in candidates:
        for i in UPPER:
            fin=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
            shape_original_real_fin(fin,originals[fin.name],shoulder,free)
        bpy.context.view_layer.update()
        scene.frame_set(1)
        verify(scene,originals,nonfin,camera,mats,names,joints)
        tag=f"shoulder_{round(shoulder*100):02d}_tip_{round(free*100):02d}"
        report={str(i):{"half_width_radians":[round(actual_width(bpy.data.objects[FIN_PREFIX+f"{i:02d}"],row),6)
                                           for row in range(STATIONS)],
                        "bbox_source_camera":list(projected_bounds(scene,FIN_PREFIX+f"{i:02d}"))}
                for i in UPPER}
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=10
        scene.cycles.seed=0;scene.cycles.use_animated_seed=False
        render(scene,out/(tag+"_frame01.png"))
        scene.frame_set(33)
        render(scene,out/(tag+"_frame33.png"))
        scene.frame_set(1)
        scene["fsc_r80_revision" if revision==REVISION else "fsc_r81_revision"]=revision
        scene["fsc_r80_physical_fin_shoulder_half_width"]=shoulder
        scene["fsc_r80_physical_fin_tip_half_width"]=free
        scene["fsc_r80_original_source_visual_approved"]=False
        blend=out/(tag+".blend")
        bpy.ops.wm.save_as_mainfile(filepath=str(blend))
        if blend.stat().st_size<100000:
            raise RuntimeError("R80 Blender did not save real 3D candidate")
        bpy.ops.wm.open_mainfile(filepath=str(blend))
        scene=bpy.context.scene
        verify(scene,originals,nonfin,camera,mats,names,joints)
        for i in UPPER:
            sheet=bpy.data.objects[FIN_PREFIX+f"{i:02d}"]
            widths=[actual_width(sheet,row) for row in range(2,STATIONS)]
            if not all(widths[k]>widths[k+1] for k in range(len(widths)-1)):
                raise RuntimeError("R80 saved/reopened fin taper is still backwards")
        results["candidates"].append({
            "shoulder_half_angle":shoulder,"free_tip_half_angle":free,
            "file":blend.name,"editable_blend_sha256":hashlib.sha256(blend.read_bytes()).hexdigest(),
            "real_native_frame_01":tag+"_frame01.png",
            "real_native_frame_33":tag+"_frame33.png",
            "per_fin_actual_3d_half_widths_and_projection":report,
            "all_three_3d_mounting_roots_unchanged":True,
            "lower_four_original_64_frame_keyed_fins_unmodified":True,
            "true_slot_topology_and_heat_tint_materials_retained":True})
        bpy.ops.wm.open_mainfile(filepath=str(source))
        scene=bpy.context.scene;scene.frame_set(1)
    if hashlib.sha256(source.read_bytes()).hexdigest()!=R79_SOURCE_SHA:
        raise RuntimeError("R80 modified original saved hinge-calibrated 3D file")
    (out/report_name).write_text(json.dumps(results,indent=2)+"\n",encoding="utf8")
    print("R80_REAL_SOURCE_DIRECTION_METAL_FINS_SAVED_REOPENED_AND_TAPER_VERIFIED")
    print("R80_ORIGINAL_USER_SPRITE_PRIVATE_COMPARISON_REQUIRED")
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--source-blend",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.source_blend,a.out)
