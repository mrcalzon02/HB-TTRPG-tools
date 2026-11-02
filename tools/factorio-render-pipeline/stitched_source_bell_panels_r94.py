"""R94: original-source guided planar-panel -> stitched 3D exterior bell rebuild.

User construction method: lay down actual quadrilateral strips as planes,
stitch them at shared edges into the target surface, give real metal thickness.
Not texture planes, NOT a graphic of the rendered shape. Reprofile the original
R42 eight longitudinal 40-segment ring section (open mouth), because the R93
original-art pixel ablation showed the old wide bronzed generic bell is not
in the source correct configuration. Keep original 3D object identity and
material; replace *only its mesh data* on separate editable .blend candidates.
All other R92 original source-matched fin hinges, R08 pressure rolls, R11 and
R19 refractory, source camera and 64 animation frames unchanged.

Original user Wube sprite is PRIVATE and absent from public CI. Numeric
source-photo comparison must occur privately before choosing candidates.
"""
import argparse, hashlib, json, math, struct, sys
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mathutils import Vector
from fin_mount_geometry_sweep_r50 import MAIN,FIN_PREFIX,MOUNT_PREFIX
from mount_shape_fit_r52 import joint_gap_world
from save_connected_cast_candidate_r66 import fin_digest_all_frames
from mount_occlusion_diagnostic_r51 import render,NATIVE

REVISION="R94_source_first_stitched_real_planar_bell_plates"
ORIGINAL_SOURCE_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
BASE_SHA="693c77e521a1da37ba3e1c72e9696ed6986492eb80a2f8d8ca11f3d74f694a49"
SHELL="vanilla_reference_bell_bronzed_rolled_bell"
SEGMENTS=40
RINGS=8
AXIS_Z=-.43
# name, radial shrink mid-envelope, axial retreat mid-envelope, front-sector
# radial relief, fractional mouth-ring setback.
# R93 shows the wrong gray-wall contribution comes from this one real mesh.
# Test genuinely different physical silhouettes rather than micrometers.
PROFILES=(
  ("baseline",0.,0.,0.,0.),
  ("isolate_shell",None,None,None,None),
  ("panel_trim_012",.12,0.,0.,0.),
  ("panel_trim_025",.25,0.,0.,0.),
  ("panel_trim_038",.38,0.,0.,0.),
  ("panel_trim_025_rear_018",.25,-.18,0.,0.),
  ("panel_trim_038_rear_028",.38,-.28,0.,0.),
  ("panel_visor_relief",.22,-.09,-.12,0.),
  ("panel_mouth_recede",.21,-.12,0.,-.12),
)
# Do not move the two ORIGINAL end rings unless explicitly testing mouth
# retreat (which still preserves an open continuous physical annular rim).
PROFILE_WEIGHTS=(0.,.12,.40,.78,1.,.90,.50,0.)

def hash_other(scene):
    d=hashlib.sha256()
    for obj in sorted(scene.objects,key=lambda o:o.name):
        if obj.type!="MESH" or obj.name==SHELL:continue
        d.update(obj.name.encode())
        d.update(struct.pack("<II",len(obj.data.vertices),len(obj.data.polygons)))
        for v in obj.data.vertices:
            d.update(struct.pack("<fff",*v.co))
        if obj.data.shape_keys:
            for block in obj.data.shape_keys.key_blocks:
                d.update(block.name.encode())
                for v in block.data:
                    d.update(struct.pack("<fff",*v.co))
    return d.hexdigest()

def shell_profile(original):
    if len(original)!=RINGS*SEGMENTS:
        raise RuntimeError("R94 expected 8x40 real original R42 bell cross sections")
    report=[]
    for row in range(RINGS):
        ring=original[row*SEGMENTS:(row+1)*SEGMENTS]
        rs=[math.hypot(v[0],v[2]-AXIS_Z) for v in ring]
        report.append({"section":row,
          "mean_axial_y":round(sum(v[1] for v in ring)/len(ring),6),
          "mean_radius":round(sum(rs)/len(rs),6),
          "min_radius":round(min(rs),6),
          "max_radius":round(max(rs),6)})
    return report

def cross_sections(original,shrink,axial,sector,mouth):
    # Real sectional vertices; each edge of adjacent two angular/axial
    # quad strips SHARES THE SAME indexed 3D vertex, not disconnected cards.
    outer=[]
    for ring in range(RINGS):
        w=PROFILE_WEIGHTS[ring]
        for col in range(SEGMENTS):
            x,y,z=original[ring*SEGMENTS+col]
            radius=math.hypot(x,z-AXIS_Z)
            if radius<.2:raise RuntimeError("R94 original physical shell radius unexpected")
            theta=math.atan2(z-AXIS_Z,x)
            # Mild front-facing sector relief corrects an overly bulky visor
            # without deleting entire annular source structure.
            # The plane of curvature is the existing original cylindrical axis.
            f=.5+.5*math.cos(theta)
            delta=shrink*w+sector*w*f
            new_r=radius-delta
            if new_r<.65:
                raise RuntimeError("R94 panel would cross through physical nozzle axis")
            outer.append((new_r*math.cos(theta),
                          y+axial*w+mouth*(1. if ring==RINGS-1 else 0.),
                          AXIS_Z+new_r*math.sin(theta)))
    return outer

def stitch_real_shell(name,outer,original_mat,thickness=.038):
    """Build shared-vertex metal surface from neighboring flat quad strips.

    Original 8x40 outer section layout is stitched to a parallel 3D radial
    inner skin. Boundary loops are BRIDGED, not filled across the exhaust mouth.
    The generated surface has real volume and two open orifices.
    """
    count=len(outer)
    vertices=list(outer)
    for x,y,z in outer:
        r=math.hypot(x,z-AXIS_Z)
        factor=(r-thickness)/r
        vertices.append((x*factor,y,AXIS_Z+(z-AXIS_Z)*factor))
    faces=[]
    # 280 outer panels, 280 inner panels, and two 40-quad rim collars.
    # Every wall quad physically shares indexed vertices with its neighbors.
    for row in range(RINGS-1):
        for k in range(SEGMENTS):
            n=(k+1)%SEGMENTS
            a=row*SEGMENTS+k;b=row*SEGMENTS+n
            c=(row+1)*SEGMENTS+n;d=(row+1)*SEGMENTS+k
            faces.append((a,b,c,d))
            faces.append((count+d,count+c,count+b,count+a))
    for k in range(SEGMENTS):
        n=(k+1)%SEGMENTS
        faces.append((k,count+k,count+n,n))
        tail=(RINGS-1)*SEGMENTS
        faces.append((tail+n,count+tail+n,count+tail+k,tail+k))
    mesh=bpy.data.meshes.new(name+"_R94_connected_panel_skin")
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    mesh.materials.append(original_mat)
    if len(mesh.vertices)!=640 or len(mesh.polygons)!=640:
        raise RuntimeError("R94 actual stitched panel mesh topology incorrect")
    if any(p.area<1e-10 for p in mesh.polygons):
        raise RuntimeError("R94 collapsed physical planar metal surface")
    for face in mesh.polygons:
        face.use_smooth=False # source shows discrete panel edges, not a giant smooth plastic sleeve
    edges={}
    for f in mesh.polygons:
        vs=f.vertices
        for i in range(len(vs)):
            key=tuple(sorted((vs[i],vs[(i+1)%len(vs)])))
            edges[key]=edges.get(key,0)+1
    if not edges or any(n!=2 for n in edges.values()):
        raise RuntimeError("R94 stitched 3D surface has open/disconnected panel seams")
    return mesh,{"actual_finite_3d_skin_vertices":len(mesh.vertices),
       "actual_quad_panels":len(mesh.polygons),
       "all_edges_stitched_manifold":True,
       "open_axial_mouth_no_polygon_end_cap":True,
       "physical_skin_radial_thickness":thickness,
       "outer_sections":RINGS,"panels_per_section":SEGMENTS}

def validate(scene,baseline,names,cam,mats,motion,joints):
    if {o.name for o in scene.objects}!=names:
        raise RuntimeError("R94 invented or removed non-source thruster geometry")
    if hash_other(scene)!=baseline:
        raise RuntimeError("R94 changed genuine hinge, fin, liner, guard or pressure roll geometry")
    if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=cam:
        raise RuntimeError("R94 changed original calibration camera")
    if {m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
        for m in bpy.data.materials}!=mats:
        raise RuntimeError("R94 changed materials instead of physical geometry")
    if fin_digest_all_frames(scene)!=motion:
        raise RuntimeError("R94 changed original 64-frame fin motion")
    for i in MAIN:
        d=joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
             bpy.data.objects[FIN_PREFIX+f"{i:02d}"])
        if d>.003 or abs(d-joints[str(i)])>1e-6:
            raise RuntimeError("R94 lost original physical load-path fin roots")

def run(src,out):
    src=Path(src).resolve();out=Path(out).resolve()
    if hashlib.sha256(src.read_bytes()).hexdigest()!=BASE_SHA:
        raise RuntimeError("R94 must receive the exact source-best R92 saved native Blender scene")
    bpy.ops.wm.open_mainfile(filepath=str(src))
    scene=bpy.context.scene;scene.frame_set(1)
    if scene.get("fsc_r92_revision") is None or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R94 expected actual R92 native camera and source-traced left/right hinges")
    bell=bpy.data.objects.get(SHELL)
    if (bell is None or bell.type!="MESH" or bell.hide_render or
        len(bell.data.vertices)!=320 or len(bell.data.polygons)!=280 or
        len(bell.data.materials)!=1 or bell.data.shape_keys):
        raise RuntimeError("R94 expected untouched real 8x40 exterior reference bell")
    original=[tuple(v.co) for v in bell.data.vertices]
    sections=shell_profile(original)
    matname=bell.data.materials[0].name
    original_material=bpy.data.materials[matname]
    cam=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    mats={m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
        for m in bpy.data.materials}
    names={o.name for o in scene.objects}
    motion=fin_digest_all_frames(scene)
    protected=hash_other(scene)
    joints={str(i):joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
             bpy.data.objects[FIN_PREFIX+f"{i:02d}"]) for i in MAIN}
    out.mkdir(parents=True,exist_ok=True)
    result={"revision":REVISION,"original_private_source_sha256":ORIGINAL_SOURCE_SHA,
       "original_user_sprite_pixels_in_artifact":False,
       "original_visual_fidelity_approved":False,
       "unaltered_R92_original_3d_source_sha256":BASE_SHA,
       "old_original_bell_sections":sections,
       "candidates":[]}
    for tag,shrink,axial,sector,mouth in PROFILES:
        # Always load same pristine source rig for independent hypotheses,
        # never iteratively deform an earlier candidate or retain stale RNA.
        bpy.ops.wm.open_mainfile(filepath=str(src))
        scene=bpy.context.scene;scene.frame_set(1)
        bell=bpy.data.objects[SHELL]
        stats=None
        if tag=="isolate_shell":
            bell.hide_render=True
        elif tag!="baseline":
            coords=cross_sections(original,shrink,axial,sector,mouth)
            mesh,stats=stitch_real_shell(SHELL,coords,bpy.data.materials[matname])
            previous=bell.data
            bell.data=mesh
            if previous.users==0:
                bpy.data.meshes.remove(previous)
            if not bell.get("R42_original_8_exterior_rings"):
                raise RuntimeError("R94 source bell reference identity lost")
        bpy.context.view_layer.update()
        validate(scene,protected,names,cam,mats,motion,joints)
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8;scene.cycles.seed=0
        scene.cycles.use_animated_seed=False
        scene.frame_set(1)
        render(scene,out/(tag+"_frame01.png"))
        scene.frame_set(33)
        render(scene,out/(tag+"_frame33.png"))
        scene.frame_set(1)
        saved=None
        if tag not in ("baseline","isolate_shell"):
            scene["fsc_r94_revision"]=REVISION
            scene["fsc_r94_speculative_panel_cross_section"]=tag
            scene["fsc_r94_original_sprite_fidelity_approved"]=False
            saved=out/(tag+".blend")
            bpy.ops.wm.save_as_mainfile(filepath=str(saved))
            if saved.stat().st_size<100000:raise RuntimeError("R94 actual edit not saved")
            bpy.ops.wm.open_mainfile(filepath=str(saved))
            scene=bpy.context.scene
            validate(scene,protected,names,cam,mats,motion,joints)
            b=bpy.data.objects[SHELL]
            if (len(b.data.vertices)!=640 or len(b.data.polygons)!=640 or
                b.hide_render or b.data.materials[0].name!=matname):
                raise RuntimeError("R94 saved/reopened physical panel stitch data lost")
        result["candidates"].append({
            "name":tag,"3d_radial_middle_trim":shrink,
            "3d_axial_middle_setback":axial,
            "3d_visible_visor_relief":sector,
            "3d_terminal_ring_axial_recede":mouth,
            "real_stitched_connected_surface":stats,
            "true_native_frame1":tag+"_frame01.png",
            "true_native_frame33":tag+"_frame33.png",
            "saved_reopened_editable_blend":saved.name if saved else None,
            "verified_blend_sha256":hashlib.sha256(saved.read_bytes()).hexdigest() if saved else None,
            "all_original_source_cast_fin_and_animation_intact":True})
        print("R94_ACTUAL_ORIGINAL_CAMERA_STITCHED_BELL",tag,flush=True)
    if hashlib.sha256(src.read_bytes()).hexdigest()!=BASE_SHA:
        raise RuntimeError("R94 altered original R92 saved 3D source candidate")
    (out/"r94_stitched_bell_original_source_hypotheses.json").write_text(
        json.dumps(result,indent=2)+"\n",encoding="utf8")
    print("R94_REAL_3D_STITCHED_PLANES_WITH_METAL_THICKNESS_SAVED_REOPENED_PASS",flush=True)
    print("R94_PRIVATE_WUBE_SOURCE_COMPARE_BEFORE_SELECTING_CANDIDATE",flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-blend",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.source_blend,a.out)
