"""R121 - one ORIGINAL-SOURCE central fin as a real ROUND metal master.
The old R21 holes, false flat fins and separate hand-reshaped variants are
not the source design.  Start only from clean R120 bell and fins. Generate
source-camera views of a completely NEW central two-skin cylindrical shell;
then optionally instance that EXACT SAME mesh data via true circumferential
object matrices, never separately resculpting side fins.  Private original
thruster.zip (sha256 0670bc...) never enters public CI.
"""
import argparse,hashlib,json,math,sys
from pathlib import Path
from mathutils import Matrix,Vector
import bpy
HERE=Path(__file__).resolve().parent
if str(HERE) not in sys.path:sys.path.insert(0,str(HERE))
import physical_cut_separate_source_fins_r107 as core
import source_original_straight_fin_recovery_r116 as source_camera
import rebuild_bare_bell_fins_three_simple_hinges_r120 as clean

BASE="bare_original_bell_and_ten_metal_fins.blend"
REPORT="r120_clean_bell_fins_and_three_basic_hinge_candidates.json"
SRC_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
MAIN=(1,2,3)
COLS=17
ROWS=9
N=COLS*ROWS
FRAMES=(1,33)
CASES=(
 ("r120_clean_original_fin_control",None,False),
 ("central_master_round_40px_radius",40.,False),
 ("central_master_round_58px_radius",58.,False),
 ("shared_master_round_40_three_rotated_instances",40.,True),
)
# Physical silhouette measured against authentic user ORIGINAL 264x542 frame:
# source center plate starts below upper forged tabs, is cylindrical across
# width, slightly tapers toward its rounded blue-annealed distal toe.
ROOT=(110.,329.,153.)
TIP=(121.,392.,150.)
ENGINE_Z=-.43
def physical_signature(scene,except_ids=()):
    h=hashlib.sha256()
    for i in range(10):
        if i in except_ids:continue
        obj=bpy.data.objects[core.FIN_PREFIX+f"{i:02d}"]
        h.update(obj.name.encode())
        h.update(repr([(tuple(v.co)) for v in obj.data.vertices]).encode())
        h.update(repr([tuple(p.vertices) for p in obj.data.polygons]).encode())
    return h.hexdigest()

def physical_bell_signature(scene):
    import struct
    h=hashlib.sha256()
    for obj in sorted(scene.objects,key=lambda o:o.name):
        if obj.type!="MESH" or obj.name.startswith(core.FIN_PREFIX):continue
        h.update(obj.name.encode())
        h.update(repr(tuple(tuple(v.co) for v in obj.data.vertices)).encode())
        h.update(repr(tuple(obj.location)).encode())
    return h.hexdigest()

def camera_pixel_scale(scene):
    a=source_camera.source_pixel_world(scene,0,0,0)
    b=source_camera.source_pixel_world(scene,1,0,0)
    return (a-b).length

def lerp(a,b,t):return a+(b-a)*t
def heat(t,u):
    warm=(.24,.219,.203)
    purple=(.23,.125,.17)
    blue=(.044,.077,.208)
    b=max(0.,min(1.,(t-.69)/.23))
    a=max(0.,min(1.,(t-.48)/.30))
    mixed=[lerp(w,p,a) for w,p in zip(warm,purple)]
    mixed=[lerp(w,bb,b) for w,bb in zip(mixed,blue)]
    # Heat wraps around outside of toe, without inventing giant hot blobs.
    m=1.0-.09*math.sin(17*t+13*u)
    return tuple(min(1.,max(0.,c*m)) for c in mixed)+(1.,)

def generate_cylindrical_master(scene,radius):
    master=bpy.data.objects[core.FIN_PREFIX+"02"]
    old=master.data
    if len(old.vertices)!=198 or old.shape_keys or not old.color_attributes.get("R21_heat_tint"):
        raise RuntimeError("R121 requires exact R120 source-corrected finite metal center input")
    if not 32.<=radius<=80.:raise RuntimeError("invalid actual 3D curvature")
    px2m=camera_pixel_scale(scene)
    # Use existing actual fin center's world depth profile, not a generic 2D
    # billboard: radial curvature here is physically expressed in camera Z.
    skin_rows=[]
    for row in range(ROWS):
        front=source_camera.projected_pixel(
           scene,master.matrix_world@old.vertices[row*11+5].co)[2]
        back=source_camera.projected_pixel(
           scene,master.matrix_world@old.vertices[N+row*11+5].co)[2]
        skin_rows.append((max(front,back),min(front,back)))
    thickness=[max(.022,high-low) for high,low in skin_rows]
    if min(thickness)<=0:raise RuntimeError("no metal volume")
    inv=master.matrix_world.inverted_safe()
    verts=[]
    sagmax=0.
    for skin in range(2):
        for row in range(ROWS):
            t=row/(ROWS-1)
            xleft=lerp(ROOT[0],TIP[0],t*t)
            xright=lerp(ROOT[2],TIP[2],t*t)
            y=lerp(ROOT[1],TIP[1],t)
            for j in range(COLS):
                u=j/(COLS-1)
                x=lerp(xleft,xright,u)
                localx=(x-(xleft+xright)/2)
                # Circular *surface*, NOT three independent planar source
                # silhouettes.  Sagitta gives a constant-radius cylindrical
                # cross-section and grows consistently to both lateral edges.
                sag=radius-math.sqrt(max(.000001,radius*radius-localx*localx))
                sagmax=max(sag,sagmax)
                # Left/right edges recede, front center bulges.
                front_depth=skin_rows[row][0]-(sag*px2m)
                # One narrow pressed longitudinal center seam, not a slot.
                front_depth+=.006*max(0,1-abs(2*u-1)/.14)
                # The source free end is BLUNT but slightly bowed downward
                # at center and rolls gently toward the front.
                py=y+(3.0*(1-(abs(2*u-1)**4))-1.0)*t**11
                if t>.84:
                    front_depth+=.005*((t-.84)/.16)**2
                depth=front_depth if skin==0 else front_depth-thickness[row]
                point=source_camera.source_pixel_world(scene,x,py,depth)
                verts.append(tuple(inv@point))
    faces=[];materials=[]
    def add(f,m):
        faces.append(f);materials.append(m)
    for row in range(ROWS-1):
        for j in range(COLS-1):
            a=row*COLS+j;b=a+1;c=a+COLS+1;d=a+COLS
            zone=0 if row<2 else 1 if row<5 else 2 if row<7 else 3
            add((a,d,c,b),zone)
            add((N+a,N+b,N+c,N+d),zone)
    # Real physical sidewalls, rounded distal front/back connection.
    for j in range(COLS-1):
        a=j;b=j+1
        add((a,b,N+b,N+a),0)
        a=(ROWS-1)*COLS+j;b=a+1
        add((a,N+a,N+b,b),3)
    for row in range(ROWS-1):
        a=row*COLS;b=a+COLS
        add((a,N+a,N+b,b),2)
        a=row*COLS+COLS-1;b=a+COLS
        add((a,b,N+b,N+a),2)
    new=bpy.data.meshes.new("R121_ONE_CANONICAL_ROUNDED_FIN_3D_WITH_NO_FALSE_SLOTS")
    new.from_pydata(verts,[],faces);new.update()
    for m in old.materials:new.materials.append(m)
    attr=new.color_attributes.new(name="R21_heat_tint",type="FLOAT_COLOR",domain="CORNER")
    for poly,mi in zip(new.polygons,materials):
        poly.material_index=mi
        # Smoothed, truly curved face; root and toe edges physically remain.
        poly.use_smooth=mi!=0
        for li in poly.loop_indices:
            vertex_index=new.loops[li].vertex_index
            idx=vertex_index%N
            row=idx//COLS; j=idx%COLS
            attr.data[li].color=heat(row/(ROWS-1),2*j/(COLS-1)-1)
    okay,edges=core.manifold_edges(new)
    if not okay or any(face.area<1e-11 for face in new.polygons):
        raise RuntimeError("R121 rounded fin not a finite closed 3D metal shell")
    if N==198 or len(new.vertices)<=198:raise RuntimeError("R121 reused old punched planar profile")
    master.data=new
    master["R121_one_true_rounded_master_with_zero_fake_slots"]=True
    master["R121_actual_native_original_root"]=ROOT
    master["R121_radius_original_camera_pixels"]=radius
    master["R121_visual_shape_approval_pending"]=True
    if old.users==0:bpy.data.meshes.remove(old)
    return {"name":master.name,"vertices":len(new.vertices),
      "faces":len(new.polygons),"manifold_edges":edges,
      "physical_sagitta_px":round(sagmax,4),
      "cylinder_radius_pixels":radius,
      "real_world_sagitta_m":round(sagmax*px2m,6),
      "continuous_no_slot_surfaces":True}

def root_mid(scene,ob):
    a=source_camera.projected_pixel(scene,ob.matrix_world@ob.data.vertices[0].co)
    b=source_camera.projected_pixel(scene,ob.matrix_world@ob.data.vertices[COLS-1].co)
    return ((a[0]+b[0])*.5,(a[1]+b[1])*.5)
def clone_actual_master(scene):
    master=bpy.data.objects[core.FIN_PREFIX+"02"]
    if not master.get("R121_one_true_rounded_master_with_zero_fake_slots"):
        raise RuntimeError("R121 master not source rounded model")
    original_names={o.name for o in scene.objects}
    result=[]
    # R21 source physical positions: 10 evenly circumferential mounts.
    for i in (1,3):
        target=bpy.data.objects[core.FIN_PREFIX+f"{i:02d}"]
        target.data=master.data
        dtheta=math.tau*(i-2)/10.
        rotation=(Matrix.Translation((0,0,ENGINE_Z))@
                  Matrix.Rotation(dtheta,4,'Y')@
                  Matrix.Translation((0,0,-ENGINE_Z)))
        target.matrix_world=rotation@master.matrix_world
        bpy.context.view_layer.update()
        before=root_mid(scene,target)
        # Translation only registers the single rotated shared fin to the
        # measured original-root position; no independent mesh reshaping.
        anchor=source_camera.PROFILE[i]
        wanted=((anchor[0][0]+anchor[1][0])*.5,
                (anchor[0][1]+anchor[1][1])*.5)
        translation=(source_camera.source_pixel_world(scene,*wanted,0.)-
                     source_camera.source_pixel_world(scene,*before,0.))
        target.matrix_world=Matrix.Translation(translation)@target.matrix_world
        bpy.context.view_layer.update()
        after=root_mid(scene,target)
        error=math.dist(wanted,after)
        if error>1.5 or math.hypot(*translation)>3.0:
            raise RuntimeError(f"R121 source root register failure {i} {error} shift {tuple(translation)}")
        target["R121_shared_master_instance"]=True
        target["R121_real_circumference_rotation_degrees"]=round(math.degrees(dtheta),3)
        result.append({"fin":i,"rotation_deg":round(math.degrees(dtheta),3),
            "registered_root_px":[round(x,3) for x in after],
            "shift_m":round(translation.length,6),"pixel_error":round(error,5),
            "same_mesh_data_as_central":target.data is master.data})
    if {o.name for o in scene.objects}!=original_names:
        raise RuntimeError("R121 accidentally added external chassis or hinges")
    if not all(x["same_mesh_data_as_central"] for x in result):
        raise RuntimeError("R121 side fins not exact linked master mesh copies")
    return result

def render(scene,path):
    scene.render.resolution_x,scene.render.resolution_y=core.NATIVE
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.cycles.samples=8;scene.cycles.seed=0
    scene.cycles.use_animated_seed=False
    core.render(scene,path)
    if not path.exists() or path.stat().st_size<4000:
        raise RuntimeError("R121 native actual Blender frame missing")
def oblique(scene,path):
    source=scene.camera;data=source.data.copy()
    camera=bpy.data.objects.new("R121_TEMP_TRUE_3D_INSPECTION",data)
    scene.collection.objects.link(camera)
    try:
        camera.matrix_world=Matrix.Rotation(math.radians(35),4,"Y")@source.matrix_world
        scene.camera=camera
        bpy.context.view_layer.update()
        render(scene,path)
    finally:
        scene.camera=source
        bpy.data.objects.remove(camera,do_unlink=True)
        bpy.data.cameras.remove(data)
        bpy.context.view_layer.update()
def run(indir,outdir):
    root=Path(indir).resolve()
    upstream=json.loads((root/REPORT).read_text())
    original=[c for c in upstream["candidates"]
              if c["variant"]=="bare_original_bell_and_ten_metal_fins"]
    src=root/BASE
    if len(original)!=1 or hashlib.sha256(src.read_bytes()).hexdigest()!=original[0]["sha256"]:
        raise RuntimeError("R121 starts ONLY from exact successful bare original R120 scene")
    out=Path(outdir).resolve();out.mkdir(parents=True,exist_ok=True)
    report={"revision":"R121","user_original_source_sha256":SRC_SHA,
        "source_art_published_to_CI":False,
        "not_source_approved_yet":True,
        "active_geometry":"one curved cylindrical central fin, optional exact shared mesh circumferential copies",
        "scenes":[]}
    for tag,radius,copies in CASES:
        bpy.ops.wm.open_mainfile(filepath=str(src))
        scene=bpy.context.scene;scene.frame_set(1)
        names={o.name for o in scene.objects}
        cam=tuple(float(x) for row in scene.camera.matrix_world for x in row)
        bell=physical_bell_signature(scene)
        lower=core.lower_animated_fin_digest(scene)
        other=physical_signature(scene,(1,2,3))
        curve=None;instances=[]
        if radius is not None:
            curve=generate_cylindrical_master(scene,radius)
            if copies:
                instances=clone_actual_master(scene)
        bpy.context.view_layer.update()
        if {o.name for o in scene.objects}!=names or physical_bell_signature(scene)!=bell:
            raise RuntimeError("R121 altered bell, other objects or clutter")
        if physical_signature(scene,(1,2,3))!=other or core.lower_animated_fin_digest(scene)!=lower:
            raise RuntimeError("R121 altered other fins or lower animation")
        if tuple(float(x) for row in scene.camera.matrix_world for x in row)!=cam:
            raise RuntimeError("R121 altered original camera")
        frames={}
        for frame in FRAMES:
            scene.frame_set(frame)
            fname=tag+f"_source_frame{frame:02d}.png"
            render(scene,out/fname);frames[str(frame)]=fname
        scene.frame_set(1)
        angle=tag+"_real_3d_oblique35.png"
        oblique(scene,out/angle)
        scene["fsc_r121_master_fin_variant"]=tag
        scene["fsc_r121_visual_source_approved"]=False
        dest=out/(tag+".blend")
        bpy.ops.wm.save_as_mainfile(filepath=str(dest))
        bpy.ops.wm.open_mainfile(filepath=str(dest))
        scene=bpy.context.scene
        if scene.get("fsc_r121_master_fin_variant")!=tag or physical_bell_signature(scene)!=bell:
            raise RuntimeError("R121 saved 3D master/BELL mismatch")
        if core.lower_animated_fin_digest(scene)!=lower:
            raise RuntimeError("R121 original animated lower fins lost on Blender reopen")
        if curve is not None:
            m=bpy.data.objects[core.FIN_PREFIX+"02"].data
            if len(m.vertices)!=2*N or not core.manifold_edges(m)[0]:
                raise RuntimeError("R121 central round master collapsed on save")
            if copies and not all(bpy.data.objects[core.FIN_PREFIX+f"{i:02d}"].data is m
                                  for i in MAIN):
                raise RuntimeError("R121 REAL three fin copies do not share 3D mesh")
        report["scenes"].append({"tag":tag,"actual_cylindrical_master":curve,
           "shared_real_circumference_instances":instances,
           "native_frames":frames,"oblique_view":angle,
           "editable_blend":dest.name,
           "sha256":hashlib.sha256(dest.read_bytes()).hexdigest(),
           "all_original_bell_and_lower_animation_preserved":True,
           "source_visual_match_pending":True})
        (out/"r121_cylindrical_canonical_master_and_rotated_copies.json").write_text(
          json.dumps(report,indent=2)+"\n",encoding="utf8")
        print("R121_REAL_MASTER_3D_CYLINDER_SAVED_REOPENED",tag,flush=True)
    print("R121_ONE_FIN_THREE_ROTATED_MATRICES_NO_OLD_HINGE_MESS__NEEDS_ORIGINAL_VISUAL_REVIEW",flush=True)
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--r120-dir",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.r120_dir,a.out)
