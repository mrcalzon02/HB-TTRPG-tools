"""R76 existing R11 baffle_00 cross-section candidate; authentic 3D, no overlays.

R75's real saved-camera isolation revealed this ORIGINAL annular collar exerts
10,974/19,890 pixels of >=2 RGB-level influence, mostly through rendering and
shadow; it is NOT permission to remove the ring. Test alternate real toroidal
section thicknesses without shifting the ring's center or making new parts.
The Wube source atlas is unavailable in public CI: no fidelity claim.
"""
import argparse
from hashlib import sha256
import json,math,struct,sys
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mathutils import Vector
from save_connected_cast_candidate_r66 import fin_digest_all_frames
from physical_stamped_refractory_candidate_r71 import (
    REVISION as R71_REV,verify_unmodified_protected)
from refractory_shingle_depth_r60 import original_tiles,actual_first_hits,NATIVE,LINER
from mount_occlusion_diagnostic_r51 import render

REVISION="R76_original_existing_baffle_00_toroidal_cross_section_hypotheses"
SOURCE_SHA="e5aea187ab7b970791ba955913cf134905447b21f8c3fc3527beef1db0ed4aaa"
RING="R11_recessed_internal_pressure_baffle_00"
AXIS_Z=-.43
EXPECTED_Y=-3.61
EXPECTED_MAJOR_RADIUS=1.385
# Candidate adjustments to the original torus *minor section* only;
# not removal, never off-axis translation of original circumferential mount.
PROFILE=((1.,1.),(.78,1.),(.58,.82))

def hash_protected(scene):
    out={}
    for ob in scene.objects:
        if ob.type!="MESH" or ob.name==RING:continue
        digest=sha256()
        digest.update(struct.pack("<II",len(ob.data.vertices),len(ob.data.polygons)))
        for v in ob.data.vertices:
            digest.update(struct.pack("<fff",*v.co))
        out[ob.name]=digest.hexdigest()
    return out

def form_real_baffle(ob,original,axial,radial):
    if ob.type!="MESH" or len(ob.data.vertices)!=320 or len(ob.data.polygons)!=320:
        raise RuntimeError("R76 requires original 320-vertex annular torus mesh")
    if ob.data.shape_keys or ob.animation_data:
        raise RuntimeError("R76 cannot reshape moving or speculative ring")
    if len(original)!=320 or not (.50<=axial<=1.) or not (.70<=radial<=1.):
        raise RuntimeError("R76 invalid protected original toroidal section")
    ys=[v[1] for v in original]
    rs=[math.hypot(v[0],v[2]-AXIS_Z) for v in original]
    cy=(min(ys)+max(ys))/2
    cr=(min(rs)+max(rs))/2
    if abs(cy-EXPECTED_Y)>.01 or abs(cr-EXPECTED_MAJOR_RADIUS)>.018:
        raise RuntimeError("R76 refused unexpected actual ring station/radius")
    for vertex,(x,y,z) in zip(ob.data.vertices,original):
        old_r=math.hypot(x,z-AXIS_Z)
        if old_r<.5:raise RuntimeError("R76 original torus radial anomaly")
        new_r=cr+(old_r-cr)*radial
        if new_r<1.:raise RuntimeError("R76 would collapse mouth rim")
        f=new_r/old_r
        vertex.co=(x*f,cy+(y-cy)*axial,AXIS_Z+(z-AXIS_Z)*f)
    ob.data.update()
    if len(ob.data.vertices)!=len(original) or any(p.area<1.e-10 for p in ob.data.polygons):
        raise RuntimeError("R76 introduced degenerate original 3D annular face")
    new_ys=[v.co.y for v in ob.data.vertices]
    new_rs=[math.hypot(v.co.x,v.co.z-AXIS_Z) for v in ob.data.vertices]
    if abs((min(new_ys)+max(new_ys))/2-cy)>.001 or abs((min(new_rs)+max(new_rs))/2-cr)>.001:
        raise RuntimeError("R76 moved original physical baffle ring, not just its section")
    return {"original_torus_station_y":cy,"original_major_radius":cr,
            "original_axial_span":max(ys)-min(ys),
            "new_axial_span":max(new_ys)-min(new_ys),
            "original_radial_span":max(rs)-min(rs),
            "new_radial_span":max(new_rs)-min(new_rs),
            "original_ring_topology_unchanged":True}

def run(source,out):
    source=Path(source).resolve();out=Path(out).resolve()
    if sha256(source.read_bytes()).hexdigest()!=SOURCE_SHA:
        raise RuntimeError("R76 needs previously verified R71 original scene")
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene;scene.frame_set(1)
    if scene.get("fsc_r71_revision")!=R71_REV or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R76 did not receive source-calibrated prior reconstruction")
    ring=bpy.data.objects[RING]
    original=[tuple(v.co) for v in ring.data.vertices]
    camera=tuple(float(v) for row in scene.camera.matrix_basis for v in row)
    motion=fin_digest_all_frames(scene)
    materials={m.name:tuple(m.diffuse_color) for m in bpy.data.materials}
    names={o.name for o in scene.objects}
    before_hash=hash_protected(scene)
    protected={}
    for ob in scene.objects:
        if ob.type!="MESH" or ob.name==RING:continue
        if (ob.name.startswith(("R25_OUTER_SKID_","R49_BESPOKE_CAST_","R64_"))
            or ob.name in (LINER,"vanilla_reference_bell_bronzed_rolled_bell",
                           "HYDROGEN_curved_pressure_hull")):
            protected[ob.name]=[tuple(v.co) for v in ob.data.vertices]
    original_render=(scene.render.resolution_x,scene.render.resolution_y,
       scene.render.resolution_percentage,scene.render.filepath,
       scene.render.image_settings.file_format,scene.render.image_settings.color_mode,
       scene.cycles.samples,scene.cycles.seed,scene.cycles.use_animated_seed)
    out.mkdir(parents=True,exist_ok=True)
    result={"revision":REVISION,"original_user_sprite_present":False,
        "source_image_visual_approval":False,"source_3d_blend_sha256":SOURCE_SHA,
        "existing_ring_retained":True,"original_camera_shaders_motion_and_all_other_geometry_preserved":True,
        "candidates":[]}
    for axial,radial in PROFILE:
        # Always start with EXACT original R71 torus coordinates, never chain edits.
        data=form_real_baffle(bpy.data.objects[RING],original,axial,radial)
        scene.frame_set(1)
        verify_unmodified_protected(scene,camera,motion,materials,names,protected)
        if hash_protected(scene)!=before_hash:
            raise RuntimeError("R76 inadvertently altered other original mesh vertices")
        hit=actual_first_hits(scene)
        label="section_%03d_%03d"%(round(axial*100),round(radial*100))
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=10
        scene.cycles.seed=0;scene.cycles.use_animated_seed=False
        scene.frame_set(1)
        render(scene,out/(label+"_frame01.png"))
        scene.frame_set(33)
        render(scene,out/(label+"_frame33.png"))
        saved=None
        if axial<1.:
            scene["fsc_r76_revision"]=REVISION
            scene["fsc_r76_original_source_visually_approved"]=False
            scene["fsc_r76_section_axial_scale"]=axial
            scene["fsc_r76_section_radial_scale"]=radial
            scene.frame_set(1)
            saved=out/(label+".blend")
            bpy.ops.wm.save_as_mainfile(filepath=str(saved))
            if saved.stat().st_size<100000:
                raise RuntimeError("R76 failed to save real editable candidate")
            bpy.ops.wm.open_mainfile(filepath=str(saved))
            scene=bpy.context.scene
            verify_unmodified_protected(scene,camera,motion,materials,names,protected)
            if hash_protected(scene)!=before_hash:
                raise RuntimeError("R76 saved scene alters unrelated real meshes")
            live=bpy.data.objects[RING]
            if any((live.data.vertices[i].co-Vector(original[i])).length<1e-6
                   for i in range(320)
                   if abs(original[i][1]-data["original_torus_station_y"])>.005):
                raise RuntimeError("R76 candidate torus cross-section failed to persist")
        result["candidates"].append({
            "section_axial_scale":axial,"section_radial_scale":radial,
            "original_face_morph":data,
            "actual_blender_4px_first_hit_diagnostic":hit,
            "native_render_01":label+"_frame01.png",
            "native_render_33":label+"_frame33.png",
            "editable_saved_reopened_scene":saved.name if saved else None,
            "saved_candidate_sha256":sha256(saved.read_bytes()).hexdigest() if saved else None,
            "unchanged_camera_other_original_meshes_materials_motion":True})
        if saved:
            bpy.ops.wm.open_mainfile(filepath=str(source))
            scene=bpy.context.scene
    if sha256(source.read_bytes()).hexdigest()!=SOURCE_SHA:
        raise RuntimeError("R76 changed original persisted R71 scene")
    (out/"R76_ORIGINAL_RING_SECTION_CANDIDATES.json").write_text(
        json.dumps(result,indent=2)+"\n",encoding="utf8")
    print("R76_EXISTING_TORUS_REAL_3D_CANDIDATES_AND_SAVED_REOPEN_PASS",flush=True)
    print("R76_PRIVATE_ORIGINAL_SOURCE_FIDELITY_UNVERIFIED",flush=True)
if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-blend",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    args=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(args.source_blend,args.out)
