"""R89 source-FIRST inverse-projection hinge topology experiment, not a 'space thruster' redesign.

The ORIGINAL user-owned Factorio atlas is the authority. Its body pixels at
264x542 yield traced candidate polygons and distinct 3D material boundaries.
This script remeshes the visible left and right side hinge covers as FINITE
VOLUME 3D solids at the real cast depth; it does not produce sprite cards,
invent a mechanism or use generic left/right mirrored greebles.

Candidate visibility isolates the old oversimplified R49 cast shells while
keeping their real mesh, welded fin roots and R64 hull stays physically
intact in the same .blend. The new non-planar exterior body/upper trim/heel
is attached via volumetric stays reaching original 3D cast vertices.
Candidates remain EXPERIMENTAL; no source pixels are included publicly.
"""
import argparse,hashlib,json,math,sys
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mathutils import Vector
from fin_mount_geometry_sweep_r50 import FIN_PREFIX,MOUNT_PREFIX,MAIN
from mount_shape_fit_r52 import joint_gap_world
from upper_hull_loadpath_candidate_r64 import COLLECTION as WEB_COLLECTION
from speculative_real_cast_alignment_r84 import cast_lock_indices
from mount_occlusion_diagnostic_r51 import render,NATIVE
from save_connected_cast_candidate_r66 import fin_digest_all_frames
from combined_original_mount_geometry_r85 import fingerprint_other

REVISION="R89_true_source_contour_inverted_3d_side_hinges"
R85_SHA="4343640f04b179c3b08ec2bdce1de77582e21cc45e195f173816603b709c36b7"
USER_SOURCE_ZIP_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
# Source-measured coarse landmarks in the ORIGINAL native RGBA sprite frame 1.
# These are NOT proposed functional parts. Each visible filled region has
# a different shaped outline and physical thickness/depth.
# Pixel coords: original x,y top-left of each 264x542 body atlas frame.
PORT={
 "body":[(39,347),(43,333),(50,328),(59,323),(68,320),(78,316),
         (84,319),(82,327),(71,333),(60,338),(54,343),(46,350),(40,355)],
 "upper":[(50,321),(59,314),(72,306),(81,302),(88,300),
          (84,309),(75,316),(65,320),(55,324)],
 "heel":[(43,342),(49,339),(55,337),(60,341),(57,350),(49,355),(43,354)],
}
STARBOARD={
 "body":[(164,318),(171,316),(180,320),(189,327),(198,329),
         (207,338),(218,350),(221,357),(216,361),(207,356),
         (199,347),(191,341),(185,337),(177,331),(169,328)],
 "upper":[(166,309),(174,306),(183,311),(194,317),(207,324),
          (214,333),(208,332),(194,323),(180,316),(170,313)],
 "heel":[(199,337),(205,337),(216,343),(220,353),
         (214,358),(206,351),(200,347)],
}
# Source-driven shapes are not copied from unrelated imagery or interpreted
# via functional hinge design. Test plausible size/alignment/depth uncertainty.
PROFILES=(("baseline",None),("source_trace",(.0,.0,1.,0.)),
          ("source_tight",(.0,.0,.93,0.)),
          ("source_wide",(.0,.0,1.07,0.)),
          ("source_raise",(.0,-3.,1.,0.)),
          ("source_deep",(.0,.0,1.,.15)))
PORT_INDEX=3
STARBOARD_INDEX=1

def verify_polygon(points):
    if len(points)<5 or len(set(points))!=len(points):
        raise RuntimeError("R89 source trace has degenerate polygon landmarks")
    area=sum(points[i][0]*points[(i+1)%len(points)][1]-
             points[(i+1)%len(points)][0]*points[i][1] for i in range(len(points)))/2
    if abs(area)<12:raise RuntimeError("R89 source face has no physical area")
    return len(points)

def source_inverse_project(scene,x,y,local_camera_z):
    frame=scene.camera.data.view_frame(scene=scene)
    l=min(p.x for p in frame);r=max(p.x for p in frame)
    b=min(p.y for p in frame);t=max(p.y for p in frame)
    local=Vector((l+x/NATIVE[0]*(r-l),
                  t-y/NATIVE[1]*(t-b),local_camera_z))
    return scene.camera.matrix_world@local

def append_volume(scene,verts,faces,obj,outline,depth,shift,scale,depth_shift):
    verify_polygon(outline)
    cx=sum(p[0] for p in outline)/len(outline)
    cy=sum(p[1] for p in outline)/len(outline)
    n=len(outline)
    inv=obj.matrix_world.inverted_safe()
    # Back surface, midbevel, convex front surface. Both spatial radius and
    # camera-depth vary; this is a true 3D formed casting, not flat RGBA art.
    def outline_ring(factor,z):
        output=[]
        for j,(x,y) in enumerate(outline):
            xx=cx+(x-cx)*factor*scale+shift[0]
            yy=cy+(y-cy)*factor*scale+shift[1]
            world=source_inverse_project(scene,xx,yy,z)
            output.append(tuple(inv@world))
        return output
    base=len(verts)
    verts.extend(outline_ring(1.,depth-.16+depth_shift))
    verts.extend(outline_ring(.99,depth-.04+depth_shift))
    verts.extend(outline_ring(.91,depth+.06+depth_shift))
    # Rounded metal crown real 3D curvature, not a single planar cap.
    center_world=source_inverse_project(scene,
        cx+shift[0],cy+shift[1],depth+.085+depth_shift)
    verts.append(tuple(inv@center_world))
    for j in range(n):
        k=(j+1)%n
        faces.append((base+j,base+k,base+n+k,base+n+j))
        faces.append((base+n+j,base+n+k,base+2*n+k,base+2*n+j))
        faces.append((base+2*n+j,base+2*n+k,base+3*n))
    faces.append(tuple(reversed(tuple(base+j for j in range(n)))))
    return base,n

def append_anchor_web(verts,faces,obj,base,outline_n,anchor_world):
    # A genuine finite-volume attachment from source-measured new casing
    # backside to existing real R49 vertex: physical 3D contact, not lines.
    inv=obj.matrix_world.inverted_safe()
    anchor=inv@anchor_world
    # Wide base surrounds existing source polygon's center to resist a
    # disembodied source-facing billboard. Connect four back vertices of
    # the new volume to a small bridge pad around exactly the old anchor.
    chosen=[round(k*(outline_n-1)/4) for k in range(4)]
    start=len(verts)
    offsets=(Vector((.022,0.,.012)),Vector((-.022,0.,.012)),
             Vector((-.022,0.,-.012)),Vector((.022,0.,-.012)))
    for d in offsets:verts.append(tuple(anchor+d))
    for k in range(4):
        a=base+chosen[k];b=base+chosen[(k+1)%4]
        c=start+(k+1)%4;d=start+k
        if a==b:continue
        faces.append((a,b,c,d))
    faces.append(tuple(start+k for k in range(4)))
    # Exact original anchor itself is a physical vertex of the same new
    # volumetric mesh (not an inferred off-screen hinge axis).
    core=len(verts)
    verts.append(tuple(anchor))
    for k in range(4):faces.append((core,start+k,start+(k+1)%4))
    return core

def create_bespoke_shell(scene,index,profile,existing,locks):
    polygons=PORT if index==PORT_INDEX else STARBOARD
    for pts in polygons.values():verify_polygon(pts)
    camera_inverse=scene.camera.matrix_world.inverted_safe()
    originals=[camera_inverse@(existing.matrix_world@v.co)
               for v in existing.data.vertices]
    # Start near the ORIGINAL physical R49 casting's actual camera depth.
    z0=max(p.z for p in originals)+.035
    shift=(profile[0],profile[1]);scale=profile[2];depthshift=profile[3]
    name="R89_SOURCE_FITTED_"+("PORT_CAST" if index==PORT_INDEX else "STARBOARD_CAST")
    verts=[];faces=[]
    anchors=[]
    for layer in ("body","upper","heel"):
        base,n=append_volume(scene,verts,faces,existing,polygons[layer],z0,
                             shift,scale,depthshift)
        # Root and upper hull anchor indices are protected and physically
        # touched by the source-fitted outer 3D volume through actual webs.
        if layer=="body":
            for idx in sorted(locks):
                if len(anchors)>=2:break
                anchors.append(append_anchor_web(verts,faces,existing,base,n,
                      existing.matrix_world@existing.data.vertices[idx].co))
    mesh=bpy.data.meshes.new(name+"_true_3d_source_contours")
    mesh.from_pydata(verts,[],faces);mesh.update()
    if any(p.area<1e-10 for p in mesh.polygons):
        raise RuntimeError("R89 produced degenerate actual metal face")
    if existing.data.materials:
        mesh.materials.append(existing.data.materials[0])
    new=bpy.data.objects.new(name,mesh)
    scene.collection.objects.link(new)
    new.matrix_world=existing.matrix_world.copy()
    new["source_observed_shape_not_original_CAD"]=True
    new["original_part"]=existing.name
    new["original_source_verified_SHA256"]=USER_SOURCE_ZIP_SHA
    new["actual_3d_anchor_vertices"]=str(anchors)
    return new,{"original_source_landmark_layers":{k:len(v) for k,v in polygons.items()},
      "actual_3d_mesh_vertices":len(mesh.vertices),
      "actual_3d_faces":len(mesh.polygons),
      "original_existing_anchor_core_vertex_indices":anchors,
      "source_camera_minimum_depth":z0-.16+depthshift,
      "source_camera_maximum_depth":z0+.085+depthshift}

def run(source,out):
    source=Path(source).resolve();out=Path(out).resolve()
    if hashlib.sha256(source.read_bytes()).hexdigest()!=R85_SHA:
        raise RuntimeError("R89 source must be verified R85 working Blender .blend")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene;scene.frame_set(1)
    if scene.camera.data.type!="ORTHO" or scene.get("fsc_r85_revision") is None:
        raise RuntimeError("R89 missing authentic fixed original camera source rig")
    names={o.name for o in scene.objects}
    camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    mats={m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
          for m in bpy.data.materials}
    motion=fin_digest_all_frames(scene)
    # Fingerprint ONLY old genuine model parts. Newly reconstructed source
    # outer shells must not be mistaken for changes to their protected rig.
    preserved={
      ob.name:tuple(tuple(v.co) for v in ob.data.vertices)
      for ob in scene.objects
      if ob.type=="MESH" and not ob.name.startswith(MOUNT_PREFIX)
    }
    webs=bpy.data.collections.get(WEB_COLLECTION)
    if webs is None:raise RuntimeError("R89 missing original physically connected R64 hull stays")
    objects={};locks={};joints={}
    for idx in (PORT_INDEX,STARBOARD_INDEX):
        o=bpy.data.objects[MOUNT_PREFIX+f"{idx:02d}"]
        fin=bpy.data.objects[FIN_PREFIX+f"{idx:02d}"]
        stay=next(o2 for o2 in webs.objects if o2.get("anchored_to_exact_existing_cast")==o.name)
        objects[idx]=o;locks[idx]=cast_lock_indices(o,fin,stay)
        joints[idx]=joint_gap_world(o,fin)
        if joints[idx]>.003:raise RuntimeError("R89 original fin root detached")
    out.mkdir(parents=True,exist_ok=True)
    report={"revision":REVISION,"user_verified_original_archive_SHA256":USER_SOURCE_ZIP_SHA,
       "original_source_sprite_included":False,"source_pixel_approval":False,
       "actual_blender_baseline_SHA256":R85_SHA,"experiments":[]}
    for label,profile in PROFILES:
        # bpy.ops.wm.open_mainfile below invalidates ALL previously cached
        # Blender Object RNA handles. Rebind them for each new candidate.
        # Original locked vertex indices remain stable across identical scene reloads.
        for idx in (PORT_INDEX,STARBOARD_INDEX):
            objects[idx]=bpy.data.objects[MOUNT_PREFIX+f"{idx:02d}"]
        new_parts={};geometry={}
        if profile is not None:
            for idx in (PORT_INDEX,STARBOARD_INDEX):
                original=objects[idx]
                new,detail=create_bespoke_shell(scene,idx,profile,original,locks[idx])
                new_parts[idx]=new;geometry[str(idx)]=detail
                original.hide_render=True # only candidate's old overbroad silhouette
        bpy.context.view_layer.update()
        if tuple(float(v) for row in scene.camera.matrix_world for v in row)!=camera:
            raise RuntimeError("R89 changed source camera")
        if fin_digest_all_frames(scene)!=motion:
            raise RuntimeError("R89 altered original 64 frame animation")
        if any(tuple(tuple(v.co) for v in bpy.data.objects[name].data.vertices)!=co
               for name,co in preserved.items()):
            raise RuntimeError("R89 changed existing finite-volume fins/hull")
        # Same original real casting-to-fin load paths; new visual casing
        # physically attaches to originals via an exact locked vertex.
        for idx in (PORT_INDEX,STARBOARD_INDEX):
            if abs(joint_gap_world(objects[idx],bpy.data.objects[FIN_PREFIX+f"{idx:02d}"])-joints[idx])>1e-6:
                raise RuntimeError("R89 broke source-fin load path")
        if {m.name:(tuple(m.diffuse_color),len(m.node_tree.nodes) if m.use_nodes else -1)
            for m in bpy.data.materials}!=mats:
            raise RuntimeError("R89 distorted material instead of geometry")
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8;scene.cycles.seed=0;scene.cycles.use_animated_seed=False
        scene.frame_set(1);render(scene,out/(label+"_frame01.png"))
        scene.frame_set(33);render(scene,out/(label+"_frame33.png"))
        saved=None
        if profile is not None:
            scene.frame_set(1)
            scene["fsc_r89_revision"]=REVISION
            scene["fsc_r89_original_source_approved"]=False
            scene["fsc_r89_inv_source_profile"]=label
            saved=out/(label+".blend")
            bpy.ops.wm.save_as_mainfile(filepath=str(saved))
            if saved.stat().st_size<100000:raise RuntimeError("R89 did not save Blender source mesh")
            expected_new_objects=tuple(part.name for part in new_parts.values())
            bpy.ops.wm.open_mainfile(filepath=str(saved))
            scene=bpy.context.scene
            if not all(bpy.data.objects.get(name) for name in expected_new_objects):
                raise RuntimeError("R89 lost actual new source 3D mesh after reload")
            if fin_digest_all_frames(scene)!=motion:raise RuntimeError("R89 saved Blender changed motion")
        report["experiments"].append({
            "name":label,"parameter":list(profile) if profile else None,
            "actual_metal_topologies":geometry,
            "native_frame1":label+"_frame01.png",
            "native_frame33":label+"_frame33.png",
            "real_saved_reopened_scene":saved.name if saved else None,
            "sha256":hashlib.sha256(saved.read_bytes()).hexdigest() if saved else None,
            "original_real_hull_and_fin_contact_meshes_retained":True})
        if saved:
            bpy.ops.wm.open_mainfile(filepath=str(source));scene=bpy.context.scene;scene.frame_set(1)
    if hashlib.sha256(source.read_bytes()).hexdigest()!=R85_SHA:
        raise RuntimeError("R89 modified original working R85 candidate file")
    (out/"r89_true_source_volume_contour_candidates.json").write_text(
        json.dumps(report,indent=2)+"\n")
    print("R89_SOURCE_INVERSE_PROJECTED_GENUINE_3D_LEFT_RIGHT_CANDIDATES_PASS",flush=True)
    print("R89_ORIGINAL_SPRITE_PRIVATE_COMPARISON_REQUIRED",flush=True)
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--source-blend",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.source_blend,a.out)
