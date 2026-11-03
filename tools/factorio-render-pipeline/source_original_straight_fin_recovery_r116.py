"""R116: original-source 3D fin reconstruction after rejected R109–R115 shapes.

Only the user's ORIGINAL Factorio thruster.zip body sprite frames are an
appearance reference.  Its private bitmap is NOT in this repository or CI.
R114/R115 speculative pips, broad plate forgings and source-wrong hinges
are deliberately NOT used.  We start from the verified R108 *cut_only_three*
editable 3D scene, before melted-looking petal cupping and rounded lip additions.

The user asks for actual 3D shapes: this code changes BOTH physical skins
of the three main metal fins with the original camera registration while
PRESERVING each skin's existing non-planar camera depth, finite thickness,
punched faces, heat color attributes and 64-frame lower animation.
The source-derived per-fin 2D landmarks are initial hypotheses for the
visible forms, NOT source-derived Wube CAD or accepted match.
"""
import argparse, hashlib, json, math, sys
from pathlib import Path
from mathutils import Matrix, Vector
import bpy

ROOT=Path(__file__).resolve().parent
if str(ROOT) not in sys.path:sys.path.insert(0,str(ROOT))
import physical_cut_separate_source_fins_r107 as core
import source_individual_hinge_casts_r110 as r110

REV="R116_original_frame_measured_three_real_source_fin_shapes"
INPUT="cut_only_three.blend"
INPUT_SHA="96d7892d37bf2234bae8490dcb7014137fc7155744ca2134002298c25a7e0dab"
ORIGINAL_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
MAIN=(1,2,3)
FRAMES=(1,33)
ROW=11
RINGS=9
SKIN=ROW*RINGS
# x,y pixel station of the real original body sprite native 264x542 frame 1:
#  left fin upper left/right, distal left/right, independently each side.
# Deliberately no symmetry and NO further speculative new hinges or collars.
# Source has distinct abrupt upper fin roots and relatively straight lateral
# edges, blunt rather than melted / pillow-shaped hot distal metal.
PROFILE={
  1:((42,344),(75,339),(55,409),(82,398)),
  2:((100,328),(153,328),(104,391),(148,391)),
  3:((174,344),(212,351),(181,394),(212,406)),
}
CASES=(("r108_cut_only_source_control",0.,0.),
       ("original_straight_sharp_fin_main_three",1.,0.),
       ("original_lateral_heel_and_blunt_tip",1.,.18))

def finite(x):
    return math.isfinite(x)

def old_main_3d_digest(scene):
    return r110.mesh_digest(scene,{core.FIN_PREFIX+f"{i:02d}" for i in MAIN})

def source_pixel_world(scene,x,y,depth):
    camera=scene.camera
    frame=camera.data.view_frame(scene=scene)
    left=min(v.x for v in frame);right=max(v.x for v in frame)
    bot=min(v.y for v in frame);top=max(v.y for v in frame)
    p=Vector((left+x/core.NATIVE[0]*(right-left),
              top-y/core.NATIVE[1]*(top-bot),depth))
    return camera.matrix_world@p

def projected_pixel(scene,world):
    camera=scene.camera
    point=camera.matrix_world.inverted_safe()@world
    frame=camera.data.view_frame(scene=scene)
    left=min(v.x for v in frame);right=max(v.x for v in frame)
    bot=min(v.y for v in frame);top=max(v.y for v in frame)
    return ((point.x-left)/(right-left)*core.NATIVE[0],
            (top-point.y)/(top-bot)*core.NATIVE[1],point.z)

def shape_real_fin(scene,index,strength,lip_flatten):
    fin=bpy.data.objects[core.FIN_PREFIX+f"{index:02d}"]
    mesh=fin.data
    if (fin.type!="MESH" or not fin.get("R107_actual_proximal_fin_sheet_chopped")
        or mesh.shape_keys or len(mesh.vertices)!=2*SKIN
        or len(mesh.materials)!=4
        or not mesh.color_attributes.get("R21_heat_tint")):
        raise RuntimeError("R116 requires real verified R108 cut-only finite metal sheets")
    if not core.manifold_edges(mesh)[0]:
        raise RuntimeError("R116 cannot build source shape from non-manifold input")
    # No folded/rounded thermal toes from R108/R109.
    if fin.get("R108_real_cupped_shell") or fin.get("R109_flanged_folded_sides"):
        raise RuntimeError("R116 rejects deformed melted-looking R108/R109 input")
    before=[tuple(v.co) for v in mesh.vertices]
    object_to_world=fin.matrix_world
    world_to_object=object_to_world.inverted_safe()
    upperleft,upperright,tipleft,tipright=PROFILE[index]
    camdepths=[]
    for ring in range(2):
        for row in range(RINGS):
            for col in range(ROW):
                k=ring*SKIN+row*ROW+col
                oldworld=object_to_world@mesh.vertices[k].co
                camdepths.append(projected_pixel(scene,oldworld)[2])
    # CHECK: original geometry genuinely extends into three dimensions,
    # and its two physical metal skins remain separated in camera depth.
    sep=[abs(camdepths[row*ROW+j]-camdepths[SKIN+row*ROW+j])
         for row in range(RINGS) for j in range(ROW)]
    if max(sep)<.0001:
        raise RuntimeError("R116 original metal has no real physical depth")
    moved=[]
    for skin in range(2):
        for row in range(RINGS):
            t=row/(RINGS-1)
            # Profile is linearly ruled along its length, instead of previous
            # erroneous R108 sine bowing and R109 rounded-bulged toe.
            for j in range(ROW):
                u=j/(ROW-1)
                k=skin*SKIN+row*ROW+j
                x=(1-t)*((1-u)*upperleft[0]+u*upperright[0])+t*((1-u)*tipleft[0]+u*tipright[0])
                y=(1-t)*((1-u)*upperleft[1]+u*upperright[1])+t*((1-u)*tipleft[1]+u*tipright[1])
                # At the free edge, original frame shows only a SMALL hard
                # coined curl, not a big sweeping bowl. Keep the end blunt.
                if lip_flatten and row>=6:
                    y+=lip_flatten*3.*math.sin(math.pi*u)*(t-.66)/.34
                oldworld=object_to_world@mesh.vertices[k].co
                oldx,oldy,depth=projected_pixel(scene,oldworld)
                tx=oldx+(x-oldx)*strength
                ty=oldy+(y-oldy)*strength
                # Retain ORIGINAL physical camera-depth + cup relief,
                # including differentiated front/back skins, not a 2D card.
                newworld=source_pixel_world(scene,tx,ty,depth)
                coords=world_to_object@newworld
                if not all(finite(v) for v in coords):
                    raise RuntimeError("R116 nonfinite source-registered 3D vertex")
                moved.append(math.dist(tuple(mesh.vertices[k].co),tuple(coords)))
                mesh.vertices[k].co=coords
    mesh.update()
    ok,edges=core.manifold_edges(mesh)
    if not ok or any(face.area<1e-11 for face in mesh.polygons):
        raise RuntimeError("R116 source-fitted metal warped into non-physical fins")
    if max(moved)<.04:
        raise RuntimeError("R116 did not actually change original mesh shape")
    fin["R116_source_original_outline_real_solid"]=True
    fin["R116_original_sprite_visual_approval_pending"]=True
    fin["R116_no_invented_hinge_mounts"]=True
    return {"index":index,"name":fin.name,"closed_manifold":True,
            "real_vertices":len(mesh.vertices),"real_polygons":len(mesh.polygons),
            "physical_manifold_edges":edges,
            "max_real_vertex_displacement":round(max(moved),6),
            "original_source_landmarks":PROFILE[index],
            "source_approved":False,
            "real_front_back_separation":round(max(sep),6)}

def orbit(scene,path):
    original=scene.camera;data=original.data.copy()
    temporary=bpy.data.objects.new("R116_TEMP_35_DEG_GENUINE_SHAPE_VIEW",data)
    scene.collection.objects.link(temporary)
    try:
        temporary.matrix_world=Matrix.Rotation(math.radians(35),4,"Y")@original.matrix_world
        scene.camera=temporary
        bpy.context.view_layer.update()
        core.render(scene,path)
    finally:
        scene.camera=original
        bpy.data.objects.remove(temporary,do_unlink=True)
        bpy.data.cameras.remove(data)
        bpy.context.view_layer.update()

def verify(scene,names,camera,mats,protected,motion,edited,tag):
    if {o.name for o in scene.objects}!=names:
        raise RuntimeError("R116 added unknown hinge rings/tabs or removed source body parts")
    if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=camera:
        raise RuntimeError("R116 altered original camera")
    if core.scene_used_material_signature(scene)!=mats:
        raise RuntimeError("R116 changed source heat material graph or other shader")
    if old_main_3d_digest(scene)!=protected:
        raise RuntimeError("R116 changed original chassis, real hinges, collars, outer fins or nozzle")
    if core.lower_animated_fin_digest(scene)!=motion:
        raise RuntimeError("R116 changed original 64-frame lower fins")
    for index in edited:
        fin=bpy.data.objects[core.FIN_PREFIX+f"{index:02d}"]
        if not fin.get("R116_source_original_outline_real_solid") or not core.manifold_edges(fin.data)[0]:
            raise RuntimeError("R116 real metal reconstruction failed round-trip")
    if scene.get("fsc_r116_variant") and scene["fsc_r116_variant"]!=tag:
        raise RuntimeError("R116 saved source model case mismatch")

def run(source_dir,out_dir):
    src=Path(source_dir).resolve()/INPUT
    if hashlib.sha256(src.read_bytes()).hexdigest()!=INPUT_SHA:
        raise RuntimeError("R116 requires exact R108 pre-melt genuine editable source model")
    out=Path(out_dir).resolve();out.mkdir(parents=True,exist_ok=True)
    report={"revision":REV,"original_private_sprite_sha256":ORIGINAL_SHA,
       "original_bitmap_uploaded_to_public_CI":False,"visual_source_approved":False,
       "rejected_successors":["R109","R110","R111","R112","R113","R114","R115"],
       "restored_model_input":"R108 cut_only_three (original 3D machine camera and fin-cast elements retained)",
       "source_frame_landmarks_are_speculative_until_private_visual_comparison":True,
       "cases":[]}
    for tag,strength,lip in CASES:
        bpy.ops.wm.open_mainfile(filepath=str(src))
        scene=bpy.context.scene;scene.frame_set(1)
        if scene.get("fsc_r108_petal_variant")!="cut_only_three" or scene.camera.data.type!="ORTHO":
            raise RuntimeError("R116 wrong original source rig")
        names={o.name for o in scene.objects}
        camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
        mats=core.scene_used_material_signature(scene)
        protected=old_main_3d_digest(scene)
        motion=core.lower_animated_fin_digest(scene)
        changed={}
        if strength:
            for i in MAIN:
                changed[str(i)]=shape_real_fin(scene,i,strength,lip)
        bpy.context.view_layer.update()
        verify(scene,names,camera,mats,protected,motion,tuple(map(int,changed)),tag)
        scene.render.resolution_x,scene.render.resolution_y=core.NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
        rendered={}
        for frame in FRAMES:
            scene.frame_set(frame)
            png=out/(tag+f"_source_camera_frame{frame:02d}.png")
            core.render(scene,png)
            if png.stat().st_size<5000:raise RuntimeError("R116 actual Blender native frame missing")
            rendered[str(frame)]=png.name
        scene.frame_set(1)
        oblique=out/(tag+"_physical_3d_oblique35.png")
        orbit(scene,oblique)
        if oblique.stat().st_size<5000:raise RuntimeError("R116 3D view missing")
        verify(scene,names,camera,mats,protected,motion,tuple(map(int,changed)),tag)
        scene["fsc_r116_revision"]=REV
        scene["fsc_r116_variant"]=tag
        scene["fsc_r116_source_shape_approved"]=False
        blend=out/(tag+".blend")
        bpy.ops.wm.save_as_mainfile(filepath=str(blend))
        if blend.stat().st_size<100000:raise RuntimeError("R116 real 3D scene did not save")
        bpy.ops.wm.open_mainfile(filepath=str(blend))
        verify(bpy.context.scene,names,camera,mats,protected,motion,tuple(map(int,changed)),tag)
        report["cases"].append({
            "variant":tag,"genuine_3d_source_profile_changes":changed,
            "native_original_camera_frames":rendered,
            "real_oblique_3d_view":oblique.name,
            "editable_blend":blend.name,
            "sha256":hashlib.sha256(blend.read_bytes()).hexdigest(),
            "original_camera_and_moving_lower_fins_unchanged":True,
            "original_fin_shape_visual_approved":False})
        (out/"r116_source_real_3d_straight_blunt_fin_candidates.json").write_text(
            json.dumps(report,indent=2)+"\n",encoding="utf8")
        print("R116_GENUINE_3D_FIN_SOURCE_FORM_SAVED_REOPENED",tag,flush=True)
    print("R116_SOURCE_APPEARANCE_REQUIRES_LOCAL_PRIVATE_ORIGINAL_COMPARISON",flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--r108-dir",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.r108_dir,a.out)
