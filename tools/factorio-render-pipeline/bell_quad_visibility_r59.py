"""R59 – pinpoint actual saved R58 smooth-bore obstruction, no deletion.

Inspect native Blender R58 (three connected bespoke mounts, 2 lugs, still
original R19 shingled refractory), not a generic new nozzle. Use same saved
orthographic camera and old studio lights. First-hit histogram includes
per-quad original R42 exterior shell bands, R11 physical liner and R19.
Render genuinely isolated shell/liner/drum A/B to identify where source-like
layer detail should appear (temporary hide_render; original mesh restored).

Physically reprofile only R42's INTERMEDIATE original exterior bell rings
in a small signed range; NEVER delete old rings, distort the true forward
chassis or weld a disk into the open mouth. Compare native 264×542 captures
privately against source atlas; no source pixels in CI.
"""
import argparse
from collections import Counter
from hashlib import sha256
import json,math
from pathlib import Path
import sys

ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mount_occlusion_diagnostic_r51 import NATIVE,camera_ray,render
from hanging_fin_candidate_r58 import REVISION as R58_REV,verify
from mounted_fin_candidate_r55 import MAX_ROOT_CONNECTION
from fin_mount_geometry_sweep_r50 import MAIN,FIN_PREFIX,MOUNT_PREFIX
from mount_shape_fit_r52 import joint_gap_world

REVISION="R59_real_bell_quad_first_hit_and_interior_exposure"
SHELL="vanilla_reference_bell_bronzed_rolled_bell"
LINER="R11_OPEN_DEEP_REFRACTORY_THROAT"
DRUM="R08_aft_internal_reaction_drum"
CAVITY="R09_deep_black_nozzle_cavity"
ROI=(44,220,383,518)
AXIS_Z=-.43
SEGMENTS=40
EXTERIOR_RINGS=8
# A real bell contour experiment, with originals rings 0/1/7 fixed.
# negative tucks the problematic middle of the actual R42 shell in.
CONTOUR_SHIFTS=(0.,-.12,-.24,+.12,+.24)
PROFILE_BY_RING=(0.,0.,.35,.70,1.,.82,.36,0.)

def shell_profile(ob):
    if (ob.type!="MESH" or len(ob.data.vertices)!=EXTERIOR_RINGS*SEGMENTS
        or len(ob.data.polygons)!=280 or ob.hide_render):
        raise RuntimeError("R59 cannot alter original open R42 8-ring exterior shell")
    return [
      {"ring":r,
       "mean_y":round(sum(ob.data.vertices[r*SEGMENTS+s].co.y for s in range(SEGMENTS))/SEGMENTS,5),
       "mean_radius":round(sum(math.hypot(ob.data.vertices[r*SEGMENTS+s].co.x,
                                          ob.data.vertices[r*SEGMENTS+s].co.z-AXIS_Z)
                                for s in range(SEGMENTS))/SEGMENTS,5)}
      for r in range(EXTERIOR_RINGS)]

def contour_shell(ob,original,offset):
    for v,old in zip(ob.data.vertices,original):
        ring=v.index//SEGMENTS
        factor=PROFILE_BY_RING[ring]*offset
        x,y,z=old
        radius=math.hypot(x,z-AXIS_Z)
        if radius<.2 or radius+factor<.6:
            raise RuntimeError("R59 shell radial topology would collapse")
        newradius=radius+factor
        scale=newradius/radius
        v.co=(x*scale,y,AXIS_Z+(z-AXIS_Z)*scale)
    ob.data.update()

def first_hit_face_hist(scene):
    bpy.context.view_layer.update()
    dg=bpy.context.evaluated_depsgraph_get()
    hits=Counter();bell_faces=Counter();bell_ring_bands=Counter()
    x0,x1,y0,y1=ROI
    for y in range(y0,y1,4):
        for x in range(x0,x1,4):
            ori,ray=camera_ray(scene.camera,scene,x,y)
            hit,point,normal,face,obj,matrix=scene.ray_cast(dg,ori,ray,distance=300.)
            if not hit:
                hits["<NO_HIT>"]+=1
                continue
            hits[obj.name]+=1
            if obj.name==SHELL:
                bell_faces[face]+=1
                polygon=obj.data.polygons[face]
                # The face's original ring band is determined from real
                # source mesh vertex indices, NOT the polygon order.
                ids=[int(v) for v in polygon.vertices]
                bands=tuple(sorted({i//SEGMENTS for i in ids}))
                bell_ring_bands[str(bands)]+=1
    return {"source_native_roi_xyxy":list(ROI),
            "sampled_pixels":sum(hits.values()),
            "mesh_first_hits":dict(hits.most_common()),
            "bell_quad_first_hit_counts":dict(bell_faces.most_common()),
            "bell_ring_pair_first_hits":dict(bell_ring_bands.most_common()),
            "r19_visible_hit_count":sum(v for k,v in hits.items() if k.startswith("R19_")),
            "r11_liner_hit_count":hits[LINER],
            "exterior_shell_hit_count":hits[SHELL]}

def load_source_scene(out):
    path=out/"test-04-vanilla-approx"/"physically-connected-fin-r58"/"source_connected_hanging_fins_r58.blend"
    if not path.is_file():raise RuntimeError("R59 needs verified persisted R58 candidate")
    digest=sha256(path.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(path))
    scene=bpy.context.scene
    if scene.get("fsc_r58_revision")!=R58_REV or not scene.camera or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R59 cannot analyze non-R58 geometry")
    original_camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    verify(scene,original_camera)
    return path,digest,scene,original_camera

def run(out):
    path,digest,scene,camera=load_source_scene(out)
    geometry={obj.name:obj for obj in scene.objects}
    exterior=geometry.get(SHELL)
    liner=geometry.get(LINER)
    if exterior is None or liner is None or not liner.get("R11_open_no_endcaps"):
        raise RuntimeError("R59 real bell/liner missing")
    previous_verts=tuple(tuple(v.co) for v in exterior.data.vertices)
    names_before=set(geometry)
    original_render=(scene.render.resolution_x,scene.render.resolution_y,
                     scene.render.resolution_percentage,scene.render.filepath,
                     scene.render.image_settings.file_format,
                     scene.render.image_settings.color_mode,
                     scene.cycles.samples,scene.frame_current)
    dest=out/"test-04-vanilla-approx"/"original-geometry-ray-test-r59"
    dest.mkdir(parents=True,exist_ok=True)
    data={"revision":REVISION,"baseline_sha256":digest,
          "proprietary_source_pixels_not_included":True,
          "camera_not_changed":True,"first_hit_is_render_proxy_not_pixel_approval":True,
          "baseline_shell_profile":shell_profile(exterior),
          "shell_faces_before":len(exterior.data.polygons),
          "temporary_object_isolations":{},"real_contour_cases":[]}
    hidden_before={}
    try:
        scene.frame_set(1)
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.cycles.samples=10
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        data["baseline_rays"]=first_hit_face_hist(scene)
        render(scene,dest/"R58_native_baseline.png")
        for name in (SHELL,LINER,DRUM,CAVITY):
            obj=geometry.get(name)
            if obj is None:
                data["temporary_object_isolations"][name]={"not_present":True}
                continue
            hidden_before[name]=obj.hide_render
            obj.hide_render=True
            bpy.context.view_layer.update()
            png=f"AB_{name}.png"
            render(scene,dest/png)
            # Rendering hide does not remove object from scene raycast;
            # do not treat raycast with hide_render as newly exposed mesh.
            data["temporary_object_isolations"][name]={"file":png,
                              "render_temporarily_hidden":True}
            obj.hide_render=hidden_before[name]
        for offset in CONTOUR_SHIFTS:
            contour_shell(exterior,previous_verts,offset)
            bpy.context.view_layer.update()
            rays=first_hit_face_hist(scene)
            filename=f"shell_middle_{offset:+.2f}".replace(".","_").replace("+","plus").replace("-","minus")+".png"
            render(scene,dest/filename)
            data["real_contour_cases"].append({
                "radial_mid_ring_delta_tiles":offset,
                "native_png":filename,"first_hits":rays,
                "shell_ring_profile":shell_profile(exterior)})
            print("R59_PHYSICAL_SHELL_CONTOUR",offset,
                  rays["exterior_shell_hit_count"],rays["r19_visible_hit_count"],flush=True)
    finally:
        for name,hidden in hidden_before.items():geometry[name].hide_render=hidden
        for v,old in zip(exterior.data.vertices,previous_verts):v.co=old
        exterior.data.update()
        (scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.render.filepath,
         scene.render.image_settings.file_format,
         scene.render.image_settings.color_mode,
         scene.cycles.samples,frame)=original_render
        scene.frame_set(frame)
        bpy.context.view_layer.update()
    data["verified_original_scene_unchanged"]=(
        all(max(abs(a-b) for a,b in zip(v.co,old))<1e-6
            for v,old in zip(exterior.data.vertices,previous_verts))
        and len(exterior.data.polygons)==280
        and all(geometry[n].hide_render==val for n,val in hidden_before.items())
        and tuple(float(v) for row in scene.camera.matrix_world for v in row)==camera
        and set(o.name for o in scene.objects)==names_before
        and all(joint_gap_world(geometry[f"{MOUNT_PREFIX}{i:02d}"],
                                geometry[f"{FIN_PREFIX}{i:02d}"])<=MAX_ROOT_CONNECTION
                for i in MAIN)
        and sha256(path.read_bytes()).hexdigest()==digest)
    if not data["verified_original_scene_unchanged"]:
        raise RuntimeError("R59 failed original connected source model restore")
    (dest/"bell-quad-visibility.json").write_text(json.dumps(data,indent=2)+"\n",encoding="utf8")
    print("R59_SAVED_BASELINE_UNCHANGED",data["verified_original_scene_unchanged"],flush=True)

if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--output",type=Path,required=True)
    args=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    run(args.output.resolve())
