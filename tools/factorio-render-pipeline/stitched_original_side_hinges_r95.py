"""R95: source-first *stitched planar 3D* left/right hinge castings.

The source is the exact original Factorio thruster body sprite; it does not
describe a plausible thruster. Existing R89 port/starboard covers are three
intersecting disconnected convex volumes each. Here construct each side from
a source-observed set of transverse PLANAR strips and JOIN them into one
continuous metal skin with a rear thickness layer and two integrated 3D
attachment branches to the exact ORIGINAL hull web / real fin root.

No image-plane cards, no identical mirrored mounts, no hidden machinery
invention. Each quad shares vertices and edges with the next. Both skin,
rims and two anchor branches form a single watertight physical mesh.
All original R49 cast contacts and R64 chassis webs stay present and fixed.
The actual original user sprite atlas is NEVER published in CI; compare the
rendered native Blender frames against exact source offline.
"""
import argparse, hashlib, json, math, struct, sys
from collections import Counter
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mathutils import Vector
from fin_mount_geometry_sweep_r50 import FIN_PREFIX,MOUNT_PREFIX,MAIN
from mount_shape_fit_r52 import joint_gap_world
from save_connected_cast_candidate_r66 import fin_digest_all_frames
from upper_hull_loadpath_candidate_r64 import COLLECTION as WEB_COLLECTION
from speculative_real_cast_alignment_r84 import cast_lock_indices
from mount_occlusion_diagnostic_r51 import render,NATIVE

REVISION="R95_original_sprites_to_sewn_3d_hinge_planar_bridges"
BASE_SHA="221629095354e1c695e95b861c6630c1c9e55739f7fb1f04ea1e0277825bf252"
USER_ORIGINAL="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
CASTS={3:"R89_SOURCE_FITTED_PORT_CAST",1:"R89_SOURCE_FITTED_STARBOARD_CAST"}
# These are source-image frame-1 outline stations, original native 264x542.
# Every tuple is a genuine separate cross section of a source-observed
# forged hinge assembly, left from upper cheek toward lower heel.
# Port descends left/down; starboard descends right/down. Do NOT mirror.
PORT=(
 ((76,304),(83,303)),((65,313),(80,311)),((55,323),(73,319)),
 ((45,337),(63,329)),((40,348),(55,343)),((41,353),(50,357)))
STARBOARD=(
 ((166,309),(173,306)),((172,314),(185,312)),((183,321),(198,324)),
 ((193,330),(207,335)),((202,344),(218,353)),((208,355),(220,360)))
# candidates: side(s), common slight source contour relative span scale,
# source-frame projection y registration and physical ridge depth in tiles
CANDIDATES=(
 ("baseline",(),1.,0.,.035),
 ("port_only",(3,),1.,0.,.035),
 ("starboard_only",(1,),1.,0.,.035),
 ("both_stitched",(3,1),1.,0.,.035),
 ("both_tight",(3,1),.91,0.,.035),
 ("both_raised",(3,1),1.,-3.,.035),
 ("both_deeper_ridge",(3,1),1.,0.,.095),
)
ROWS=6
COLS=3
SIDE_COUNT=ROWS*COLS

def unchanged_mesh_digest(scene):
    h=hashlib.sha256()
    for ob in sorted(scene.objects,key=lambda o:o.name):
        if ob.type!="MESH" or ob.name in CASTS.values():continue
        h.update(ob.name.encode())
        h.update(struct.pack("<II",len(ob.data.vertices),len(ob.data.polygons)))
        for v in ob.data.vertices:h.update(struct.pack("<fff",*v.co))
        if ob.data.shape_keys:
            for b in ob.data.shape_keys.key_blocks:
                h.update(b.name.encode())
                for v in b.data:h.update(struct.pack("<fff",*v.co))
    return h.hexdigest()

def projected(scene,x,y,z):
    plane=scene.camera.data.view_frame(scene=scene)
    l=min(v.x for v in plane);r=max(v.x for v in plane)
    b=min(v.y for v in plane);t=max(v.y for v in plane)
    local=Vector((l+x/NATIVE[0]*(r-l),
                  t-y/NATIVE[1]*(t-b),z))
    return scene.camera.matrix_world@local

def make_shared_panel_mesh(scene,index,existing,mount,stay,scale,dy,ridge):
    points=PORT if index==3 else STARBOARD
    if len(points)!=ROWS:
        raise RuntimeError("R95 traced authentic contour rows missing")
    local_camera=scene.camera.matrix_world.inverted_safe()
    max_depth=max((local_camera@(existing.matrix_world@v.co)).z for v in existing.data.vertices)
    inv=existing.matrix_world.inverted_safe()
    body_depth=max_depth+.04
    ys=[(p[0][1]+p[1][1])/2 for p in points]
    xs=[(p[0][0]+p[1][0])/2 for p in points]
    verts=[]
    # For each source line segment construct three vertices: left edge,
    # formed raised middle ridge, right edge. Stitch strips longitudinally.
    # Return face and back skin at true separately sampled 3D depths.
    for skin in (0,1):
        for row,(left,right) in enumerate(points):
            mid=((left[0]+right[0])/2,(left[1]+right[1])/2)
            xcenter=mid[0]
            ycenter=mid[1]
            for col,src in enumerate((left,mid,right)):
                x=xcenter+(src[0]-xcenter)*scale
                y=ycenter+(src[1]-ycenter)*scale+dy
                # Outer ridge physically raised, not a painted emboss.
                # Corresponding back skin remains a deep, independent plane.
                z=body_depth + (.03 if skin==0 else -.13)
                if skin==0 and col==1:z+=ridge
                # Individual true 3D longitudinal lean, not one flat billboard.
                z+=.015*(row-2.5)
                verts.append(tuple(inv@projected(scene,x,y,z)))
    face_list=[]
    def idx(s,r,c):return s*SIDE_COUNT+r*COLS+c
    # One source-visible front skin and rear skin, each made of 10 stitched
    # adjoining quad planes. Plane boundaries use same indexed vertices.
    for s in (0,1):
        for r in range(ROWS-1):
            for c in (0,1):
                quad=(idx(s,r,c),idx(s,r,c+1),
                      idx(s,r+1,c+1),idx(s,r+1,c))
                if s==1:quad=tuple(reversed(quad))
                face_list.append(quad)
    # Both long edges + end caps join front/rear, forming one real shell.
    for r in range(ROWS-1):
        for c in (0,2):
            q=(idx(0,r,c),idx(1,r,c),idx(1,r+1,c),idx(0,r+1,c))
            if c==2:q=tuple(reversed(q))
            face_list.append(q)
    for c in (0,1):
        face_list.append((idx(0,0,c+1),idx(0,0,c),
                          idx(1,0,c),idx(1,0,c+1)))
        face_list.append((idx(0,ROWS-1,c),idx(0,ROWS-1,c+1),
                          idx(1,ROWS-1,c+1),idx(1,ROWS-1,c)))
    # Connect two EXISTING REAL anchor vertices (upper R64 hull stay, lower
    # fin-root cast) with continuous face-extrusion bridges, each formed
    # from a different back-skin quad, not disconnected overlay boxes.
    anchor_hull=int(stay["R64_real_cast_vertex_index"])
    fin=bpy.data.objects[FIN_PREFIX+f"{index:02d}"]
    lock=cast_lock_indices(mount,fin,stay)
    fin_locks=sorted(set(lock)-{anchor_hull})
    if not fin_locks:raise RuntimeError("R95 physical original fin root locks absent")
    fin_anchor=min(fin_locks,key=lambda i:
      (mount.matrix_world@mount.data.vertices[i].co-
       mount.matrix_world@mount.data.vertices[anchor_hull].co).length)
    anchors=(("hull",anchor_hull,0,0),("fin",fin_anchor,ROWS-2,1))
    anchor_info={}
    for role,anchor_id,row,col in anchors:
        # Remove exactly one back-face quad and grow an attached sleeve
        # from its SAME four original vertices to the existing casting.
        rim=(idx(1,row,col+1),idx(1,row,col),
             idx(1,row+1,col),idx(1,row+1,col+1))
        # Face orientation was reversed above; match via set.
        target=frozenset(rim)
        found=[i for i,f in enumerate(face_list) if frozenset(f)==target]
        if len(found)!=1:raise RuntimeError("R95 could not locate shared physical rear panel")
        source_rim=face_list.pop(found[0])
        center=mount.matrix_world@mount.data.vertices[anchor_id].co
        # The sleeve's small physical contact pad terminates at the real
        # fixed hull/fin anchor in true world-space coordinates.
        center_local=inv@center
        camera_q=scene.camera.matrix_world.to_quaternion()
        e1=inv.to_3x3()@(camera_q@Vector((.026,0,0)))
        e2=inv.to_3x3()@(camera_q@Vector((0,.022,0)))
        base=len(verts)
        for u,v in ((-1,-1),(-1,1),(1,1),(1,-1)):
            verts.append(tuple(center_local+u*e1+v*e2))
        for j in range(4):
            k=(j+1)%4
            face_list.append((source_rim[j],source_rim[k],base+k,base+j))
        # Connect exact original mounting vertex to the end pad.
        exact=len(verts);verts.append(tuple(center_local))
        for j in range(4):
            face_list.append((base+j,base+(j+1)%4,exact))
        anchor_info[role]={"original_existing_R49_cast_vertex":anchor_id,
            "real_3d_anchor_world":list(center),
            "connected_source_panel_row":row,
            "anchor_core_vertex_index":exact}
    mesh=bpy.data.meshes.new(existing.name+"_R95_true_stitched_source_surface")
    mesh.from_pydata(verts,[],face_list);mesh.update()
    if any(p.area<1e-10 for p in mesh.polygons):
        raise RuntimeError("R95 source geometric panel degenerated")
    counts=Counter()
    for f in mesh.polygons:
        for k in range(len(f.vertices)):
            edge=tuple(sorted((f.vertices[k],f.vertices[(k+1)%len(f.vertices)])))
            counts[edge]+=1
    if not counts or any(n!=2 for n in counts.values()):
        raise RuntimeError("R95 disconnected plane seams or nonmanifold attached metal surface")
    mesh.materials.append(existing.data.materials[0])
    for p in mesh.polygons:p.use_smooth=False
    original=existing.data;existing.data=mesh
    if original.users==0:bpy.data.meshes.remove(original)
    existing["R95_source_first_stitched_side_cast"]=True
    return {"side_original_source_landmarks":list(points),
            "two_physically_attached_3d_anchor_branches":anchor_info,
            "actual_3d_vertices":len(verts),
            "actual_stitched_faces":len(face_list),
            "connected_manifold_metal_skin":True,
            "real_3d_outer_skin_ridge_depth":ridge,
            "real_3d_skin_thickness":.16}

def verify(scene,names,original_camera,mats,original_noncast,motion,contacts):
    if {o.name for o in scene.objects}!=names or unchanged_mesh_digest(scene)!=original_noncast:
        raise RuntimeError("R95 changed original lower cup, fin, hollow refractory, old R49 or pressure rolls")
    if tuple(float(x) for row in scene.camera.matrix_world for x in row)!=original_camera:
        raise RuntimeError("R95 moved original source camera")
    if {m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
        for m in bpy.data.materials}!=mats:
        raise RuntimeError("R95 original source material changed")
    if fin_digest_all_frames(scene)!=motion:
        raise RuntimeError("R95 original 64-frame fins moved")
    for i in MAIN:
        gap=joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
                            bpy.data.objects[FIN_PREFIX+f"{i:02d}"])
        if gap>.003 or abs(gap-contacts[str(i)])>1e-6:
            raise RuntimeError("R95 real physical fin mount/hull stay root disconnected")

def run(source,out):
    source=Path(source).resolve();out=Path(out).resolve()
    if hashlib.sha256(source.read_bytes()).hexdigest()!=BASE_SHA:
        raise RuntimeError("R95 requires exact R94 chosen source-calibrated editable scene")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene;scene.frame_set(1)
    if scene.get("fsc_r94_revision") is None or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R95 requires source-first R94 source-shaped original 3D bell scene")
    original_noncast=unchanged_mesh_digest(scene)
    names={o.name for o in scene.objects}
    camera=tuple(float(x) for row in scene.camera.matrix_world for x in row)
    mats={m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
          for m in bpy.data.materials}
    motion=fin_digest_all_frames(scene)
    contacts={str(i):joint_gap_world(bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"],
                bpy.data.objects[FIN_PREFIX+f"{i:02d}"]) for i in MAIN}
    webs=bpy.data.collections.get(WEB_COLLECTION)
    if webs is None:raise RuntimeError("R95 original real hull stay load path missing")
    stays={}
    for i in CASTS:
        orig=bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"]
        stays[i]=next(x for x in webs.objects
                      if x.get("anchored_to_exact_existing_cast")==orig.name).name
        o=bpy.data.objects[CASTS[i]]
        if o.type!="MESH" or o.hide_render or len(o.data.materials)!=1:
            raise RuntimeError("R95 source R89 physical cover missing")
    out.mkdir(parents=True,exist_ok=True)
    report={"revision":REVISION,
        "actual_original_source_atlas_sha256":USER_ORIGINAL,
        "original_source_art_exported":False,
        "source_visual_fidelity_approved":False,
        "original_R94_blend_SHA256":BASE_SHA,
        "experiments":[]}
    for tag,sides,scale,dy,ridge in CANDIDATES:
        bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene
        scene.frame_set(1)
        shape={}
        for i in sides:
            o=bpy.data.objects[CASTS[i]]
            mount=bpy.data.objects[MOUNT_PREFIX+f"{i:02d}"]
            stay=bpy.data.objects[stays[i]]
            shape[str(i)]=make_shared_panel_mesh(scene,i,o,mount,stay,scale,dy,ridge)
        bpy.context.view_layer.update()
        verify(scene,names,camera,mats,original_noncast,motion,contacts)
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
        scene.frame_set(1);render(scene,out/(tag+"_frame01.png"))
        scene.frame_set(33);render(scene,out/(tag+"_frame33.png"))
        saved=None
        if sides:
            scene.frame_set(1)
            scene["fsc_r95_revision"]=REVISION
            scene["fsc_r95_source_3d_hinge_variant"]=tag
            scene["fsc_r95_original_source_fidelity_approved"]=False
            saved=out/(tag+".blend")
            bpy.ops.wm.save_as_mainfile(filepath=str(saved))
            if saved.stat().st_size<100000:raise RuntimeError("R95 actual geometry scene save failed")
            bpy.ops.wm.open_mainfile(filepath=str(saved));scene=bpy.context.scene
            verify(scene,names,camera,mats,original_noncast,motion,contacts)
            for i in sides:
                obj=bpy.data.objects[CASTS[i]]
                if not obj.get("R95_source_first_stitched_side_cast"):
                    raise RuntimeError("R95 saved/reopened original 3D stitched panel object absent")
                if len(obj.data.vertices)!=shape[str(i)]["actual_3d_vertices"]:
                    raise RuntimeError("R95 saved/reopened true metal cross section topology changed")
        report["experiments"].append({
            "name":tag,"original_source_sides_rebuilt":list(sides),
            "source_row_width_scale":scale,"native_y_shift":dy,
            "formed_metal_center_ridge_depth":ridge,
            "actual_3d_stitched_metal_geometry":shape,
            "true_original_camera_frame1":tag+"_frame01.png",
            "true_original_camera_frame33":tag+"_frame33.png",
            "saved_reopened_blend":saved.name if saved else None,
            "sha256":hashlib.sha256(saved.read_bytes()).hexdigest() if saved else None,
            "all_existing_original_fin_hull_cup_and_pressure_geometry_intact":True})
        print("R95_SOURCE_FIRST_PLANAR_HINGE_ASSEMBLY",tag,flush=True)
    if hashlib.sha256(source.read_bytes()).hexdigest()!=BASE_SHA:
        raise RuntimeError("R95 modified previous source working Blender scene")
    (out/"r95_true_stitched_source_side_hinges.json").write_text(
        json.dumps(report,indent=2)+"\n",encoding="utf8")
    print("R95_TRUE_3D_SOURCE_HINGES_STITCHED_FROM_JOINED_PLANES_SAVED_REOPENED_PASS",flush=True)
    print("R95_SOURCE_SPRITE_PRIVATE_COMPARISON_REQUIRED_BEFORE_APPROVAL",flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--source-blend",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.source_blend,a.out)
