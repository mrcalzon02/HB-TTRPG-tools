"""R98 source-FIRST original thruster refractory flare: actual 3D metal sections.

The ORIGINAL Factorio sprite's physical lower refractory funnel is broad,
long, flared, fluted and visibly shingled. The R94 Blender model instead
shows an oversized black circular aperture. A dark hole is NOT source
geometry. Test geometric terminal bell expansion, axial extension and
CONNECTED, finite-thickness real 3D refractory sections. No painted image
planes or invented functional spacecraft engines.

This is a private-source-fidelity-unapproved experiment. Do NOT promote a
numeric improvement alone: inspect actual native renders against the exact
user-owned thruster.zip (SHA256 below), offline.
"""
import argparse
import hashlib
import json
import math
import struct
import sys
from collections import Counter
from pathlib import Path

ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from fin_mount_geometry_sweep_r50 import MAIN,FIN_PREFIX,MOUNT_PREFIX
from mount_shape_fit_r52 import joint_gap_world
from save_connected_cast_candidate_r66 import fin_digest_all_frames
from mount_occlusion_diagnostic_r51 import render,NATIVE

REVISION="R98_source_directed_finite_volume_flared_refractory_nozzle"
BASE_SHA="221629095354e1c695e95b861c6630c1c9e55739f7fb1f04ea1e0277825bf252"
ORIGINAL_SOURCE_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
SHELL="vanilla_reference_bell_bronzed_rolled_bell"
SEGMENTS=40
AXIS_Z=-.43
THICKNESS=.038

# Name, radial cross-section scale for ORIGINAL eight rings, additional
# axial y translation at each ring, and physical segmented shingle depth.
# R94 baseline deliberately kept. Source original widens toward its far
# end; prior R42/R94 geometry closes slightly at its terminal, displaying
# a dark internal round hole. Test truly different flare shapes instead.
CASES=(
 ("baseline",None,None,0.),
 ("terminal_135_axial_040",(1,1,1,1,1,1,1.03,1.35),(0,0,0,0,0,0,-.08,-.40),0.),
 ("terminal_155_axial_065",(1,1,1,1,1,1,1.08,1.55),(0,0,0,0,0,0,-.15,-.65),0.),
 ("terminal_175_axial_085",(1,1,1,1,1,1,1.12,1.75),(0,0,0,0,0,0,-.20,-.85),0.),
 ("progressive_155_axial_075",(1,1,1,1,1.02,1.07,1.18,1.55),(0,0,0,0,-.08,-.12,-.30,-.75),0.),
 ("progressive_180_axial_115",(1,1,1,1.02,1.08,1.14,1.27,1.80),(0,0,0,-.06,-.14,-.25,-.45,-1.15),0.),
 ("shingle_155_axial_065",(1,1,1,1,1,1,1.08,1.55),(0,0,0,0,0,0,-.15,-.65),.050),
 ("shingle_175_axial_085",(1,1,1,1,1,1,1.12,1.75),(0,0,0,0,0,0,-.20,-.85),.075),
 ("shingle_progressive_180",(1,1,1,1.02,1.08,1.14,1.27,1.80),(0,0,0,-.06,-.14,-.25,-.45,-1.15),.085),
 ("shingle_longwide_195",(1,1,1,1.02,1.12,1.22,1.35,1.95),(0,0,0,-.08,-.20,-.34,-.58,-1.30),.095),
)

def non_shell_fingerprint(scene):
    h=hashlib.sha256()
    for o in sorted(scene.objects,key=lambda x:x.name):
        if o.type!="MESH" or o.name==SHELL:continue
        h.update(o.name.encode())
        h.update(struct.pack("<II",len(o.data.vertices),len(o.data.polygons)))
        for v in o.data.vertices:h.update(struct.pack("<fff",*v.co))
        if o.data.shape_keys:
            for key in o.data.shape_keys.key_blocks:
                h.update(key.name.encode())
                for v in key.data:h.update(struct.pack("<fff",*v.co))
    return h.hexdigest()

def reprofile(shell,radials,axials,shingle):
    if len(radials)!=8 or len(axials)!=8:
        raise RuntimeError("R98 source array needs actual eight existing R94 rings")
    old=shell.data
    if len(old.vertices)!=640 or len(old.polygons)!=640 or old.shape_keys:
        raise RuntimeError("R98 requires original real 3D R94 8x40 stitched finite bell")
    actual=[tuple(old.vertices[k].co) for k in range(320)]
    original_r=[]
    for row in range(8):
        rs=[math.hypot(actual[row*40+k][0],actual[row*40+k][2]-AXIS_Z)
            for k in range(40)]
        original_r.append(sum(rs)/40)
    if min(original_r)<.3 or not all(r>0 for r in radials):
        raise RuntimeError("R98 geometry source profile is not a valid real annular wall")

    rings=[]
    for row in range(8):
        shape=[]
        for k in range(40):
            x,y,z=actual[row*40+k]
            shape.append((x*radials[row],
                          y+axials[row],
                          AXIS_Z+(z-AXIS_Z)*radials[row]))
        rings.append(shape)
    physical=[]
    for row in range(7):
        physical.append(rings[row])
        if shingle:
            mid=[]
            for k in range(40):
                a=rings[row][k]; b=rings[row+1][k]
                x=(a[0]+b[0])*.5;y=(a[1]+b[1])*.5;z=(a[2]+b[2])*.5
                rr=math.hypot(x,z-AXIS_Z)
                # A real alternately stepped metallic shingle/baffle lap:
                # varied by circumferential plate, not a painted stripe.
                fac=1+shingle*(.72+.28*((k+row)%5)/4)/max(rr,.3)
                mid.append((x*fac,y,AXIS_Z+(z-AXIS_Z)*fac))
            physical.append(mid)
    physical.append(rings[-1])
    nrows=len(physical)
    outer=[p for ring in physical for p in ring]
    verts=list(outer)
    for x,y,z in outer:
        r=math.hypot(x,z-AXIS_Z)
        if r<THICKNESS+.3:
            raise RuntimeError("R98 physical metal collapsed across axial throat")
        f=(r-THICKNESS)/r
        verts.append((x*f,y,AXIS_Z+(z-AXIS_Z)*f))
    n=len(outer)
    faces=[]
    for row in range(nrows-1):
        for k in range(40):
            j=(k+1)%40
            a=row*40+k;b=row*40+j
            c=(row+1)*40+j;d=(row+1)*40+k
            faces.append((a,b,c,d))
            faces.append((n+d,n+c,n+b,n+a))
    tail=(nrows-1)*40
    for k in range(40):
        j=(k+1)%40
        faces.append((k,n+k,n+j,j))
        faces.append((tail+j,n+tail+j,n+tail+k,tail+k))
    mesh=bpy.data.meshes.new(SHELL+"_R98_real_source_sectional_flare")
    mesh.from_pydata(verts,[],faces);mesh.update()
    if any(f.area<1e-10 for f in mesh.polygons):
        raise RuntimeError("R98 source bell has degenerate formed metal facet")
    counts=Counter()
    for f in mesh.polygons:
        for k in range(len(f.vertices)):
            edge=tuple(sorted((f.vertices[k],f.vertices[(k+1)%len(f.vertices)])))
            counts[edge]+=1
    if not counts or any(v!=2 for v in counts.values()):
        raise RuntimeError("R98 source real bell metal panels not manifold stitched")
    mesh.materials.append(old.materials[0])
    for f in mesh.polygons:f.use_smooth=False
    shell.data=mesh
    if old.users==0:bpy.data.meshes.remove(old)
    shell["R98_original_source_flare_candidate"]=True
    return {
      "physical_axial_mouth_open":True,
      "source_original_section_radii":original_r,
      "flared_terminal_ring_radii_scale":list(radials),
      "original_section_axial_displacements":list(axials),
      "real_shingle_step_height":shingle,
      "stitched_actual_3d_ring_count":nrows,
      "physical_3d_volume_vertices":len(mesh.vertices),
      "physical_3d_quad_faces":len(mesh.polygons),
      "all_edges_contiguous_3d_manifold":True,
      "unaltered_existing_shingle_liner_not_replaced_by_image":True
    }

def verify(scene,names,other,cam,mats,motion,contacts):
    if {o.name for o in scene.objects}!=names:
        raise RuntimeError("R98 source nozzle modification invented/deleted other parts")
    if non_shell_fingerprint(scene)!=other:
        raise RuntimeError("R98 changed genuine fins, casting, cup, refractory or actual liner")
    if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=cam:
        raise RuntimeError("R98 displaced original sprite camera")
    if {m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
        for m in bpy.data.materials}!=mats:
        raise RuntimeError("R98 changed material instead of actual flare geometry")
    if fin_digest_all_frames(scene)!=motion:
        raise RuntimeError("R98 lost original 64-frame animation")
    for i in MAIN:
        d=joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
                          bpy.data.objects[FIN_PREFIX+f"{i:02d}"])
        if abs(d-contacts[str(i)])>1e-6 or d>.003:
            raise RuntimeError("R98 modified actual fin-cast metal attachment")

def run(source,out):
    source=Path(source).resolve();out=Path(out).resolve()
    if hashlib.sha256(source.read_bytes()).hexdigest()!=BASE_SHA:
        raise RuntimeError("R98 must start from exact authentic R94 source-best 3D scene")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene;scene.frame_set(1)
    if scene.get("fsc_r94_revision") is None or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R98 expected real source-native calibrated original R94 scene")
    shell=bpy.data.objects.get(SHELL)
    if not shell or shell.type!="MESH" or shell.hide_render or len(shell.data.materials)!=1:
        raise RuntimeError("R98 original real 3D stitched metal bell missing")
    names={o.name for o in scene.objects}
    other=non_shell_fingerprint(scene)
    cam=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    mats={m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
          for m in bpy.data.materials}
    motion=fin_digest_all_frames(scene)
    contacts={str(i):joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
              bpy.data.objects[FIN_PREFIX+f"{i:02d}"]) for i in MAIN}
    out.mkdir(parents=True,exist_ok=True)
    results={"revision":REVISION,"exact_private_source_sha256":ORIGINAL_SOURCE_SHA,
      "original_wube_source_art_in_artifact":False,
      "original_source_pixels_compared_inside_public_ci":False,
      "original_source_geometry_approved":False,
      "preserved_unmodified_base_blend_sha256":BASE_SHA,"experiments":[]}
    for tag,radial,axial,shingle in CASES:
        bpy.ops.wm.open_mainfile(filepath=str(source))
        scene=bpy.context.scene;scene.frame_set(1)
        geom=None
        if radial is not None:
            geom=reprofile(bpy.data.objects[SHELL],radial,axial,shingle)
        bpy.context.view_layer.update()
        verify(scene,names,other,cam,mats,motion,contacts)
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8;scene.cycles.seed=0
        scene.cycles.use_animated_seed=False
        for frame in (1,33):
            scene.frame_set(frame);render(scene,out/(tag+f"_frame{frame:02d}.png"))
        saved=None
        if geom is not None:
            scene.frame_set(1)
            scene["fsc_r98_revision"]=REVISION
            scene["fsc_r98_original_source_fidelity_approved"]=False
            scene["fsc_r98_refractory_flare_candidate"]=tag
            saved=out/(tag+".blend")
            bpy.ops.wm.save_as_mainfile(filepath=str(saved))
            if saved.stat().st_size<100000:
                raise RuntimeError("R98 actual 3D editable source file not saved")
            bpy.ops.wm.open_mainfile(filepath=str(saved));scene=bpy.context.scene
            verify(scene,names,other,cam,mats,motion,contacts)
            obj=bpy.data.objects[SHELL]
            if len(obj.data.vertices)!=geom["physical_3d_volume_vertices"] or not obj.get("R98_original_source_flare_candidate"):
                raise RuntimeError("R98 actual formed source-section 3D model failed save/reopen")
        results["experiments"].append({
          "name":tag,"physical_nozzle_reconstruction":geom,
          "native_original_camera_frame1":tag+"_frame01.png",
          "native_original_camera_frame33":tag+"_frame33.png",
          "real_editable_blend":saved.name if saved else None,
          "blend_sha256":hashlib.sha256(saved.read_bytes()).hexdigest() if saved else None,
          "all_non_nozzle_source_geometry_camera_material_animation_unchanged":True})
        print("R98_ORIGINAL_SOURCE_3D_REFRACTORY_FLARE",tag,flush=True)
    if hashlib.sha256(source.read_bytes()).hexdigest()!=BASE_SHA:
        raise RuntimeError("R98 overwrote original R94 source-calibrated working scene")
    (out/"r98_physical_original_source_flared_refractory_candidates.json").write_text(
       json.dumps(results,indent=2)+"\n",encoding="utf8")
    print("R98_REAL_ORIGINAL_SOURCE_3D_FLARE_NATIVE_RENDERS_SAVED_REOPENED_PASS",flush=True)
    print("R98_ORIGINAL_SOURCE_PRIVATE_PIXEL_AND_SHAPE_APPROVAL_REQUIRED",flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--source-blend",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.source_blend,a.out)
