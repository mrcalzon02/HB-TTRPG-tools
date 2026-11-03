"""R110 — reshape the ACTUAL three original upper fin mounting castings.

The user-supplied genuine Factorio thruster frame is the sole appearance
authority. Do not invent a space-engine hinge or chase image-error metrics.

R109 produced substantially formed metal fins but retained an overly regular
upper mounting system. R110 reshapes EXISTING port/starboard source-traced
R89 cast upper/heel volumes and the original central R49 saddle. No fake
sprites, bevel-only dress-up, duplicate dummy machine parts or common ring.
Original lower fins, nozzle, other chassis meshes, fin sheets and camera
are strict-preserved; left and right mount profiles are independently cut.

Three uncertain physical shape hypotheses are emitted as real editable
Blender models. Original proprietary sprite pixels stay outside public CI.
"""
import argparse,hashlib,json,math,struct,sys
from pathlib import Path
from mathutils import Vector,Matrix
import bpy

ROOT=Path(__file__).resolve().parent
if str(ROOT) not in sys.path:sys.path.insert(0,str(ROOT))
import physical_cut_separate_source_fins_r107 as core
from original_source_3d_hinge_remesh_r89 import PORT,STARBOARD
from source_asymmetric_sidewalls_r97 import original_layout

REV="R110_original_sprite_bespoke_three_hinge_cast_shaping"
BASE="five_deep_clamshell_edges__five_differently_folded_lipped_pieces"
BASE_SHA="51627e06343eccbcfa85b3b7dabed0382a0af7c4ae396734e77e7144d5a7bb53"
ORIGINAL_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
CASTS={3:"R89_SOURCE_FITTED_PORT_CAST",
       1:"R89_SOURCE_FITTED_STARBOARD_CAST",
       2:"R49_BESPOKE_CAST_MOUNT_02"}
OUTLINES={3:PORT,1:STARBOARD}
# In original source-camera coordinates x right, y down, distinct from model mm.
# These are deliberate *candidate* deviations from original R89 traced polygons.
# The center is reshaped in its native circumferential mesh, never projected
# to a fictional mirrored left/right casting.
PROFILE={
 "source_shoulder_steps":{
   3:{"upper":{0:(-2,-2),1:(-3,-5),2:(-5,-7),3:(-4,-7),4:(-2,-5),5:(0,-2),6:(1,0),7:(1,1),8:(-1,0)},
      "heel":{0:(-2,-1),1:(-3,-2),2:(-2,-4),3:(-1,-2),4:(1,1),5:(1,2),6:(-1,1)}},
   1:{"upper":{0:(1,-3),1:(2,-6),2:(3,-7),3:(5,-6),4:(6,-3),5:(6,0),6:(3,1),7:(2,0),8:(1,-2),9:(0,-2)},
      "heel":{0:(1,-2),1:(4,-3),2:(5,-1),3:(5,1),4:(3,3),5:(1,1),6:(0,-1)}},
 },
 "offset_cast_ears":{
   3:{"upper":{0:(-4,0),1:(-6,-3),2:(-7,-7),3:(-6,-9),4:(-3,-8),5:(0,-4),6:(2,-2),7:(1,1),8:(-1,1)},
      "heel":{0:(-4,-1),1:(-5,-3),2:(-3,-5),3:(-1,-3),4:(2,0),5:(2,3),6:(-1,2)}},
   1:{"upper":{0:(2,-4),1:(4,-7),2:(7,-8),3:(8,-6),4:(9,-2),5:(7,2),6:(4,2),7:(1,0),8:(-1,-2),9:(0,-4)},
      "heel":{0:(1,-3),1:(5,-5),2:(8,-2),3:(7,3),4:(4,4),5:(1,2),6:(0,-1)}},
 },
 "staggered_lower_heel":{
   3:{"upper":{0:(-1,-3),1:(-4,-4),2:(-6,-5),3:(-4,-6),4:(-1,-7),5:(1,-4),6:(2,-1),7:(0,1),8:(-2,1)},
      "heel":{0:(-6,1),1:(-7,-2),2:(-5,-5),3:(-2,-1),4:(2,3),5:(1,5),6:(-3,5)}},
   1:{"upper":{0:(1,-5),1:(3,-8),2:(5,-9),3:(8,-6),4:(9,-2),5:(7,2),6:(5,2),7:(2,1),8:(-1,-2),9:(1,-5)},
      "heel":{0:(3,-4),1:(7,-5),2:(8,-1),3:(7,5),4:(3,7),5:(0,4),6:(1,-1)}},
 }
}
CASES=(("baseline_mounts",None,0.),
       ("source_shoulder_steps","source_shoulder_steps",.9),
       ("offset_cast_ears","offset_cast_ears",1.),
       ("staggered_lower_heel","staggered_lower_heel",1.15))
FRAMES=(1,33)

def mesh_digest(scene,excluded=()):
    h=hashlib.sha256()
    for o in sorted(scene.objects,key=lambda x:x.name):
        if o.type!="MESH" or o.name in excluded:continue
        h.update(o.name.encode())
        h.update(struct.pack("<II",len(o.data.vertices),len(o.data.polygons)))
        for v in o.data.vertices:h.update(struct.pack("<fff",*v.co))
        if o.data.shape_keys:
            for key in o.data.shape_keys.key_blocks:
                h.update(key.name.encode())
                for v in key.data:h.update(struct.pack("<fff",*v.co))
    return h.hexdigest()

def reshape_source_side(scene,index,design,strength):
    ob=bpy.data.objects[CASTS[index]]
    if ob.type!="MESH" or ob.data.shape_keys or ob.hide_render:
        raise RuntimeError("R110 requires visible independently formed R89 source cast")
    shape=OUTLINES[index]
    starts,expected=original_layout(shape)
    mesh=ob.data
    if len(mesh.vertices)<expected:
        raise RuntimeError("R110 missing original R89 layered metal construction")
    before=[tuple(v.co) for v in mesh.vertices]
    face_count=len(mesh.polygons)
    camera=scene.camera
    # Camera-space offsets correspond to small, measured source-view
    # silhouette differences. Real coordinates are transformed BACK to
    # the distinct, existing cast object vertex geometry.
    vf=camera.data.view_frame(scene=scene)
    wx=(max(v.x for v in vf)-min(v.x for v in vf))/core.NATIVE[0]
    wy=(max(v.y for v in vf)-min(v.y for v in vf))/core.NATIVE[1]
    inv=ob.matrix_world.inverted_safe()
    cinv=camera.matrix_world.inverted_safe()
    moved={}
    for layer,shifts in design.items():
        n=len(shape[layer])
        start=starts[layer]
        if n<5:raise RuntimeError("R110 source traced casting has too few stations")
        for station in range(n):
            dx,dy=shifts.get(station,(0,0))
            if max(abs(dx),abs(dy))>11:
                raise RuntimeError("R110 source-candidate contour change beyond bounded scale")
            # Every real 3D ring is reshaped. The back wall moves less than
            # the sculpted front, retaining substantial thickness and anchors.
            for ring,factor in ((0,.25),(1,.65),(2,1.)):
                k=start+ring*n+station
                world=ob.matrix_world@mesh.vertices[k].co
                cp=cinv@world
                cp.x+=dx*wx*strength*factor
                cp.y-=dy*wy*strength*factor
                # Shallow relief: not a camera-facing billboard.
                cp.z+=.011*strength*(1 if ring==2 else -.35)*(1-abs(station-(n-1)/2)/n)
                mesh.vertices[k].co=inv@(camera.matrix_world@cp)
            moved[f"{layer}_{station}"]=(dx,dy)
        # Move original exterior crown only within this same individual cast,
        # maintaining a real non-planar source-visible surface.
        center=start+3*n
        if center>=len(mesh.vertices):raise RuntimeError("R110 source 3D crown missing")
        cdx=sum(x for x,y in shifts.values())/len(shifts)
        cdy=sum(y for x,y in shifts.values())/len(shifts)
        cp=cinv@(ob.matrix_world@mesh.vertices[center].co)
        cp.x+=cdx*wx*strength*.65
        cp.y-=cdy*wy*strength*.65
        cp.z+=.016*strength
        mesh.vertices[center].co=inv@(camera.matrix_world@cp)
        # R97 added a distinct inset geometry ring on the PORT heel. Its
        # actual 3D vertices must follow the heel's outer contour; leaving
        # it fixed creates a stretched arbitrary surface.
        if index==3 and layer=="heel" and len(mesh.vertices)>=expected+n:
            for station in range(n):
                dx,dy=shifts.get(station,(0,0))
                ix=expected+station
                cp=cinv@(ob.matrix_world@mesh.vertices[ix].co)
                cp.x+=dx*wx*strength*.72
                cp.y-=dy*wy*strength*.72
                mesh.vertices[ix].co=inv@(camera.matrix_world@cp)
    mesh.update()
    if len(mesh.polygons)!=face_count or any(p.area<1e-11 for p in mesh.polygons):
        raise RuntimeError("R110 generated collapsed face on actual R89 side hinge")
    displacements=[math.dist(before[i],tuple(v.co)) for i,v in enumerate(mesh.vertices)]
    amount=max(displacements)
    if amount<.012:raise RuntimeError("R110 source 3D cast geometry did not change")
    ob["R110_asymmetric_actual_cast_reprofile"]=True
    ob["R110_no_generic_hinge_ring"]=True
    return {"casting":ob.name,"3d_vertices":len(mesh.vertices),
      "physical_faces":len(mesh.polygons),"max_local_vertex_displacement":round(amount,6),
      "source_region_layers":sorted(design),"modified_3d_stations":len(moved),
      "original_R89_body_anchor_geometry_intact":True}

def reshape_center_saddle(scene,strength,variant):
    ob=bpy.data.objects[CASTS[2]]
    if ob.type!="MESH" or ob.data.shape_keys or len(ob.data.vertices)!=60:
        raise RuntimeError("R110 central saddle must be existing source R49 60-vertex casting")
    mesh=ob.data
    before=[tuple(v.co) for v in mesh.vertices]
    for skin in range(2):
        for row in range(1,5):
            t=row/5.
            for j in range(5):
                u=(j-2)/2
                ix=skin*30+row*5+j
                x,y,z=before[ix]
                theta=math.atan2(z+.43,x)
                radial=math.hypot(x,z+.43)
                # Central shoulder is staggered, not copied from either
                # source-traced side. Root/tip contact rows 0 and 5 unchanged.
                amplitude=math.sin(math.pi*t)
                radial+=strength*amplitude*(.038*u*u+.025*u)
                angle=theta+strength*amplitude*(.015*u+.006*u*abs(u))
                axial=y+strength*amplitude*(.060*u+.024*(1-u*u))
                if variant=="staggered_lower_heel":
                    axial+=strength*amplitude*.018*u*u
                mesh.vertices[ix].co=(radial*math.cos(angle),axial,
                                     -.43+radial*math.sin(angle))
    mesh.update()
    if any(p.area<1e-11 for p in mesh.polygons):
        raise RuntimeError("R110 center saddle produced collapsed 3D metal")
    amount=max(math.dist(before[i],tuple(v.co)) for i,v in enumerate(mesh.vertices))
    if amount<.01:raise RuntimeError("R110 central casting shape unmodified")
    for row in (0,5):
        for skin in (0,1):
            for j in range(5):
                ix=skin*30+row*5+j
                if tuple(mesh.vertices[ix].co)!=before[ix]:
                    raise RuntimeError("R110 moved source original central casting contact edge")
    ob["R110_independently_shaped_central_saddle"]=True
    return {"casting":ob.name,"real_3d_vertices":len(mesh.vertices),
      "max_local_vertex_displacement":round(amount,6),
      "physical_contact_station_rows_unchanged":[0,5],
      "left_and_right_cast_are_not_copied":True}

def inspect_angle(scene,destination):
    original=scene.camera
    copy=original.data.copy()
    temporary=bpy.data.objects.new("R110_TEMP_ORBIT_CAMERA",copy)
    scene.collection.objects.link(temporary)
    try:
        temporary.matrix_world=Matrix.Rotation(math.radians(35),4,"Y")@original.matrix_world
        scene.camera=temporary
        bpy.context.view_layer.update()
        core.render(scene,destination)
    finally:
        scene.camera=original
        bpy.data.objects.remove(temporary,do_unlink=True)
        bpy.data.cameras.remove(copy)
        bpy.context.view_layer.update()

def verify(scene,original_names,camera,material,other,motion,changes,tag):
    if {o.name for o in scene.objects}!=original_names:
        raise RuntimeError("R110 added or removed unrelated 3D engine objects")
    if tuple(float(x) for row in scene.camera.matrix_world for x in row)!=camera:
        raise RuntimeError("R110 changed original source camera")
    if core.scene_used_material_signature(scene)!=material:
        raise RuntimeError("R110 changed used Blender material/shader instead of source geometry")
    if mesh_digest(scene,CASTS.values())!=other:
        raise RuntimeError("R110 changed nozzle, fin shapes, lower fins or other machinery")
    if core.lower_animated_fin_digest(scene)!=motion:
        raise RuntimeError("R110 changed original animated lower fin movement")
    if changes:
        if not all(bpy.data.objects[CASTS[i]].get(
            "R110_asymmetric_actual_cast_reprofile") for i in (1,3)):
            raise RuntimeError("R110 missing real physically remodeled distinct upper side cast")
        if not bpy.data.objects[CASTS[2]].get("R110_independently_shaped_central_saddle"):
            raise RuntimeError("R110 central real mounting saddle lost")
    if tag and scene.get("fsc_r110_variant")!=tag:
        raise RuntimeError("R110 editable Blender saved scene variant lost")

def run(source,out):
    source=Path(source).resolve();out=Path(out).resolve();out.mkdir(parents=True,exist_ok=True)
    src=source/(BASE+".blend")
    if hashlib.sha256(src.read_bytes()).hexdigest()!=BASE_SHA:
        raise RuntimeError("R110 requires exact successfully verified R109 source 3D assembly")
    report={"revision":REV,"private_original_sprite_sha256":ORIGINAL_SHA,
        "private_source_art_exported":False,"source_visual_fidelity_approved":False,
        "shape_goal":"physically distinct upper port/starboard and central original sprite hinge castings",
        "candidates":[]}
    for tag,profile,strength in CASES:
        bpy.ops.wm.open_mainfile(filepath=str(src))
        scene=bpy.context.scene;scene.frame_set(1)
        if scene.get("fsc_r109_revision") is None or scene.camera.data.type!="ORTHO":
            raise RuntimeError("R110 source R109 real saved scene/camera invalid")
        original_names={ob.name for ob in scene.objects}
        camera=tuple(float(x) for row in scene.camera.matrix_world for x in row)
        material=core.scene_used_material_signature(scene)
        other=mesh_digest(scene,CASTS.values())
        motion=core.lower_animated_fin_digest(scene)
        measurements={}
        if profile:
            for i in (3,1):
                measurements[str(i)]=reshape_source_side(scene,i,PROFILE[profile][i],strength)
            measurements["2"]=reshape_center_saddle(scene,strength,profile)
        bpy.context.view_layer.update()
        verify(scene,original_names,camera,material,other,motion,measurements,None)
        scene.render.resolution_x,scene.render.resolution_y=core.NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
        files={}
        for frame in FRAMES:
            scene.frame_set(frame)
            path=out/(tag+f"_source_frame{frame:02d}.png")
            core.render(scene,path)
            if path.stat().st_size<5000:
                raise RuntimeError("R110 original source-camera rendered 3D geometry missing")
            files[str(frame)]=path.name
        scene.frame_set(1)
        angled=out/(tag+"_genuine_3d_35deg.png")
        inspect_angle(scene,angled)
        if angled.stat().st_size<5000:
            raise RuntimeError("R110 actual non-source-angle geometry evidence missing")
        verify(scene,original_names,camera,material,other,motion,measurements,None)
        scene["fsc_r110_revision"]=REV
        scene["fsc_r110_source_approved"]=False
        scene["fsc_r110_variant"]=tag
        saved=out/(tag+".blend")
        bpy.ops.wm.save_as_mainfile(filepath=str(saved))
        bpy.ops.wm.open_mainfile(filepath=str(saved))
        scene=bpy.context.scene
        verify(scene,original_names,camera,material,other,motion,measurements,tag)
        if saved.stat().st_size<100000:
            raise RuntimeError("R110 source 3D native editable model not persisted")
        report["candidates"].append({"variant":tag,
          "actual_3d_rebuilt_existing_mounts":measurements,
          "native_original_camera_frames":files,
          "angled_3d_occupancy_view":angled.name,
          "editable_blend":saved.name,
          "editable_blend_sha256":hashlib.sha256(saved.read_bytes()).hexdigest(),
          "source_visual_match_not_approved":True,
          "surrounding_engine_fins_and_animation_unchanged":True})
        (out/"r110_real_asymmetric_hinge_cast_meshes.json").write_text(
            json.dumps(report,indent=2)+"\n",encoding="utf8")
        print("R110_ACTUAL_SEPARATE_SOURCE_HINGE_3D_CASE_SAVED_REOPENED",tag,flush=True)
    print("R110_ALL_GEOMETRIC_CANDIDATES_COMPLETED_SOURCE_VISUAL_ASSESSMENT_REQUIRED",flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--r109-dir",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.r109_dir,a.out)
