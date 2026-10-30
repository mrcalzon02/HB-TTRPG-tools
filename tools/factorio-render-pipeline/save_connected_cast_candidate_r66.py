"""R66: persist the conservative source-observed three-cast face relief.

Make a SEPARATE editable Blender candidate from the REAL saved R64 model.
R65 physical source ROI rays measured that .16 tiles exposed center cast
78/96 versus 45/96 without moving its fin-root or upper-hull web anchors.
Apply that same variant only to three existing distinct R49 pale cast meshes.
No original 64-frame motion, R19 refractory, nozzle ring, lighting,
orthographic camera or external Wube printable meshes are changed.
Do not automatically promote this source-UNAPPROVED model to the game.
"""
import argparse
from array import array
from hashlib import sha256
import json
from pathlib import Path
import sys
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from fin_mount_geometry_sweep_r50 import MAIN,FIN_PREFIX,MOUNT_PREFIX
from mount_radial_visibility_r53 import per_mount_visibility
from mount_shape_fit_r52 import joint_gap_world
from mounted_fin_candidate_r55 import MAX_ROOT_CONNECTION
from mount_occlusion_diagnostic_r51 import NATIVE,render
from upper_hull_loadpath_candidate_r64 import (
    REVISION as R64_REV,COLLECTION,untouched_digest,verify_candidate
)
from cast_surface_exposure_r65 import move_front_cheek

REVISION="R66_saved_source_cast_faces_with_R64_upper_hull_loadpaths"
RELIEF=.16

def fin_digest_all_frames(scene):
    h=sha256()
    orig=scene.frame_current
    try:
        for frame in range(1,65):
            scene.frame_set(frame)
            for i in range(10):
                ob=bpy.data.objects[f"{FIN_PREFIX}{i:02d}"]
                h.update(repr((frame,ob.name,tuple(ob.location),
                               tuple(ob.rotation_euler),tuple(ob.scale),
                               len(ob.data.vertices),
                               tuple((k.name,float(k.value)) for k in
                                     ob.data.shape_keys.key_blocks)
                                 if ob.data.shape_keys else None)).encode())
    finally:
        scene.frame_set(orig)
    # All 10 physical fin mesh vertices including R21 upper heat and lower
    # four original keyed R18 shape key blocks are examined.
    for i in range(10):
        ob=bpy.data.objects[f"{FIN_PREFIX}{i:02d}"]
        a=array("f",[0.])*(len(ob.data.vertices)*3)
        ob.data.vertices.foreach_get("co",a)
        h.update(a.tobytes())
        if ob.data.shape_keys:
            for key in ob.data.shape_keys.key_blocks:
                a=array("f",[0.])*(len(key.data)*3)
                key.data.foreach_get("co",a)
                h.update(a.tobytes())
    return h.hexdigest()

def root_contact_indices(ob,fin,stay):
    roots=list(fin.data.vertices[:11])+list(fin.data.vertices[110:121])
    gaps=[]
    for v in ob.data.vertices:
        d=min((ob.matrix_world@v.co-fin.matrix_world@f.co).length for f in roots)
        gaps.append((d,v.index))
    closest=min(gaps)
    if closest[0]>MAX_ROOT_CONNECTION:
        raise RuntimeError("R66 started with a disconnected fin casting")
    locked={i for d,i in gaps if d<=MAX_ROOT_CONNECTION+1.e-5}
    locked.add(int(stay["R64_real_cast_vertex_index"]))
    return locked

def verify66(scene,source_motion_sha,source_camera):
    if scene.get("fsc_r66_revision")!=REVISION:
        raise RuntimeError("R66 revised 3D model stamp absent")
    verify_candidate(scene,untouched_digest(scene))
    if fin_digest_all_frames(scene)!=source_motion_sha:
        raise RuntimeError("R66 altered original 64-frame fin animation")
    if tuple(float(v) for row in scene.camera.matrix_basis for v in row)!=source_camera:
        raise RuntimeError("R66 altered calibrated original Factorio camera")
    for i in MAIN:
        mount=bpy.data.objects[f"{MOUNT_PREFIX}{i:02d}"]
        fin=bpy.data.objects[f"{FIN_PREFIX}{i:02d}"]
        if joint_gap_world(mount,fin)>MAX_ROOT_CONNECTION:
            raise RuntimeError("R66 altered R55/R58 root contact")
    return True

def run(source,out):
    source=source.resolve()
    initial=sha256(source.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    if scene.get("fsc_r64_revision")!=R64_REV or scene.get("fsc_r66_revision"):
        raise RuntimeError("R66 requires saved R64 model, not already revised")
    scene.frame_set(1)
    before_geom=untouched_digest(scene)
    verify_candidate(scene,before_geom)
    camera=tuple(float(v) for row in scene.camera.matrix_basis for v in row)
    finsha=fin_digest_all_frames(scene)
    before=per_mount_visibility(scene)
    original_joints={}
    altered=[]
    for i in MAIN:
        ob=bpy.data.objects[f"{MOUNT_PREFIX}{i:02d}"]
        fin=bpy.data.objects[f"{FIN_PREFIX}{i:02d}"]
        stay=next(s for s in bpy.data.collections[COLLECTION].objects
                  if s.get("anchored_to_exact_existing_cast")==ob.name)
        coords=tuple(tuple(v.co) for v in ob.data.vertices)
        locked=root_contact_indices(ob,fin,stay)
        original_joints[str(i)]=sorted(locked)
        count=move_front_cheek(ob,coords,i,RELIEF,locked)
        altered.append({"original_cast":ob.name,"locked_source_joint_indices":sorted(locked),
                        "original_mesh_vertex_count":len(ob.data.vertices),
                        "interior_vertices_considered":count,
                        "radial_cheek_relief":RELIEF})
    scene["fsc_r66_revision"]=REVISION
    scene["fsc_r66_source_approval"]=False
    scene["fsc_r66_same_source_wube_camera"]=True
    scene["fsc_r66_cast_face_relief"]=RELIEF
    verify66(scene,finsha,camera)
    after=per_mount_visibility(scene)
    out=out.resolve();out.mkdir(parents=True,exist_ok=True)
    blend=out/"saved_three_source_cast_face_stays_r66.blend"
    scene.render.resolution_x,scene.render.resolution_y=NATIVE
    scene.render.resolution_percentage=100
    scene.render.image_settings.file_format="PNG"
    scene.render.image_settings.color_mode="RGBA"
    scene.cycles.samples=8
    scene.frame_set(1)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    if blend.stat().st_size<100000:
        raise RuntimeError("R66 saved Blender model empty")
    for frame in (1,17,33,49):
        scene.frame_set(frame)
        render(scene,out/("R66_native_%02d.png"%frame))
    bpy.ops.wm.open_mainfile(filepath=str(blend))
    verify66(bpy.context.scene,finsha,camera)
    if sha256(source.read_bytes()).hexdigest()!=initial:
        raise RuntimeError("R66 changed R64 baseline .blend")
    summary={
        "revision":REVISION,"input_saved_R64_sha256":initial,
        "new_saved_R66_sha256":sha256(blend.read_bytes()).hexdigest(),
        "saved_model_bytes":blend.stat().st_size,
        "original_R64_file_untouched":True,
        "original_64_frame_fin_motion_geometry_unchanged":True,
        "original_orthographic_camera_unchanged":True,
        "three_cast_to_pressure_hull_real_contacts_preserved":True,
        "three_cast_to_fin_contact_preserved":True,
        "source_art_or_public_official_STLs_bundled":False,
        "visual_source_approval":False,
        "altered_original_cast_meshes":altered,
        "first_hit_R64_original":{str(i):before[str(i)]["first_hits_cast"] for i in MAIN},
        "first_hit_R66_candidate":{str(i):after[str(i)]["first_hits_cast"] for i in MAIN},
        "source_native_sample_counts":{str(i):after[str(i)]["native_sample_count"]
                                       for i in MAIN},
        "native_screen_original_source_comparator_not_embedded":True,
        "saved_reopened_editable_candidate_passed":True,
    }
    (out/"r66-connected-casting-report.json").write_text(
        json.dumps(summary,indent=2)+"\n",encoding="utf8")
    print("R66_64_FRAME_SAVED_EDITABLE_CAST_RELIEF_AND_REAL_HULL_JOINTS_PASS",
          summary["first_hit_R64_original"],summary["first_hit_R66_candidate"],flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-blend",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    args=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    run(args.source_blend,args.out)
