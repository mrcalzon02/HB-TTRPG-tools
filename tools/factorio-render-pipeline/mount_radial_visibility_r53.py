"""R53: physically raise bespoke mount castings in radial direction, quantify exposure.

R52 bbox fit by itself was false acceptance: front-facing 3D castings were
covered by nozzle shell and rolled pressure mechanisms. R53 reuses R52's
native source-fit and the same saved Blender scene, then tests how much real
RADIAL mounting clearance reveals each distinct surface. It reports
first-hit mesh visibility inside source-derived envelopes, not just vertices'
screen projection. Importantly each hypothetical object edit is restored and
the original .blend is never saved.

This is source-constrained diagnostic, NOT a production mount correction.
"""
import argparse
from collections import Counter
from hashlib import sha256
import json
import math
from pathlib import Path
import sys

ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
import bpy
from mathutils import Vector
from fin_mount_geometry_sweep_r50 import FIN_PREFIX,MOUNT_PREFIX,MAIN,UPPER,AXIS_Z
from mount_occlusion_diagnostic_r51 import NATIVE,camera_ray,deform_r50_d,projected_bounds,render
from mount_shape_fit_r52 import MOUNT_TARGETS,PALE_EXISTING_CAST,fit_projected_cast,joint_gap_world

REVISION="R53_source_mount_visibility_and_radial_load_path_probing"
RADIAL_OPTIONS=(0.,.24,.48,.72,.96)
STEP_PIXELS=4

def radial_casting(obj,distance):
    for v in obj.data.vertices:
        x,y,z=v.co
        angle=math.atan2(z-AXIS_Z,x)
        v.co=(x+math.cos(angle)*distance,y,
              z+math.sin(angle)*distance)
    obj.data.update()

def per_mount_visibility(scene):
    dg=bpy.context.evaluated_depsgraph_get()
    observed={}
    for i,(x0,y0,x1,y1) in MOUNT_TARGETS.items():
        cast=f"{MOUNT_PREFIX}{i:02d}"
        hits=Counter(); total=0
        for yy in range(int(y0)+2,int(y1)-2,STEP_PIXELS):
            for xx in range(int(x0)+2,int(x1)-2,STEP_PIXELS):
                origin,direction=camera_ray(scene.camera,scene,xx,yy)
                hit,point,normal,face,obj,matrix=scene.ray_cast(
                    dg,origin,direction,distance=300.)
                hits[obj.name if hit else "<NO_HIT>"]+=1
                total+=1
        visible=hits[cast]
        observed[str(i)]={"projected_bbox":projected_bounds(scene,cast),
                          "native_sample_count":total,
                          "first_hits_cast":visible,
                          "cast_visible_fraction":round(visible/total,4),
                          "top_first_hits":hits.most_common(12)}
    return observed

def run(output):
    source=output/"test-04-vanilla-approx"/"scenes"/"test-04-vanilla-approx.blend"
    if not source.is_file():
        raise RuntimeError("R53 needs actual prior R49 Blender native scene")
    disk_hash=sha256(source.read_bytes()).hexdigest()
    bpy.ops.wm.open_mainfile(filepath=str(source))
    scene=bpy.context.scene
    from vanilla_bespoke_fin_mounts_r49 import REVISION as R49_REV
    if scene.get("fsc_r49_revision")!=R49_REV or not scene.camera or scene.camera.data.type!="ORTHO":
        raise RuntimeError("R53 requires correctly sourced R49 mesh history")
    scene.frame_set(1)
    original_camera=tuple(float(v) for row in scene.camera.matrix_world for v in row)
    before_names={o.name for o in scene.objects}
    originals={};objects={};parameters={};materials={}
    for i in UPPER:
        name=f"{FIN_PREFIX}{i:02d}"
        ob=bpy.data.objects.get(name)
        if not ob or ob.data.shape_keys:raise RuntimeError("R53 fin source changed")
        objects[name]=ob
        originals[name]=tuple(tuple(v.co) for v in ob.data.vertices)
        parameters[i]=(ob.data.vertices[0].co.y,ob.data.vertices[99].co.y)
    for i in MAIN:
        name=f"{MOUNT_PREFIX}{i:02d}"
        ob=bpy.data.objects.get(name)
        if not ob or len(ob.data.materials)!=1:
            raise RuntimeError("R53 source-specific cast absent: "+name)
        objects[name]=ob
        originals[name]=tuple(tuple(v.co) for v in ob.data.vertices)
        materials[name]=ob.data.materials[0]
    pale=bpy.data.materials.get(PALE_EXISTING_CAST)
    if not pale: raise RuntimeError("R53 existing cast shader absent")
    previous=(scene.render.resolution_x,scene.render.resolution_y,
              scene.render.resolution_percentage,scene.render.filepath,
              scene.render.image_settings.file_format,
              scene.render.image_settings.color_mode,scene.cycles.samples,
              scene.frame_current)
    dest=output/"test-04-vanilla-approx"/"mount-radial-visibility-r53"
    dest.mkdir(parents=True,exist_ok=True)
    data={"revision":REVISION,"source_cell":list(NATIVE),"saved_scene_sha256":disk_hash,
          "source_pixels_in_output":False,"variants":[],"candidate_only":True}
    try:
        deform_r50_d(objects,originals,parameters)
        scene.render.resolution_x,scene.render.resolution_y=NATIVE
        scene.render.resolution_percentage=100
        scene.render.image_settings.file_format="PNG"
        scene.render.image_settings.color_mode="RGBA"
        scene.cycles.samples=8
        for distance in RADIAL_OPTIONS:
            # Start from the identical, actual D-repositioned mount geometry,
            # not from the previous test's inflated or shrunken mesh.
            for i in MAIN:
                ob=objects[f"{MOUNT_PREFIX}{i:02d}"]
                ob.data.materials[0]=materials[ob.name]
                for v,original in zip(ob.data.vertices,originals[ob.name]):
                    x,y,z=original;r=math.hypot(x,z-AXIS_Z)
                    a=math.atan2(z-AXIS_Z,x)
                    v.co=((r-.34)*math.cos(a),y-.92,
                          AXIS_Z+(r-.34)*math.sin(a))
                ob.data.update()
                radial_casting(ob,distance)
                fit_projected_cast(scene,ob,MOUNT_TARGETS[i])
                ob.data.materials[0]=pale
            bpy.context.view_layer.update()
            values=per_mount_visibility(scene)
            for i in MAIN:
                values[str(i)]["root_gap_tiles"]=round(joint_gap_world(
                    objects[f"{MOUNT_PREFIX}{i:02d}"],
                    objects[f"{FIN_PREFIX}{i:02d}"]),4)
            tag=f"radial_{distance:.2f}".replace(".","_")
            render(scene,dest/(tag+".png"))
            data["variants"].append({"radial_outward_tiles":distance,
                                     "results":values,"image":tag+".png"})
            print("R53_RADIAL_CAST_VISIBILITY",distance,json.dumps({
                  k:(v["cast_visible_fraction"],v["root_gap_tiles"])
                  for k,v in values.items()}),flush=True)
    finally:
        for name,pts in originals.items():
            ob=objects[name]
            for v,pt in zip(ob.data.vertices,pts):v.co=pt
            ob.data.update()
        for name,mat in materials.items():
            objects[name].data.materials[0]=mat
        (scene.render.resolution_x,scene.render.resolution_y,
         scene.render.resolution_percentage,scene.render.filepath,
         scene.render.image_settings.file_format,
         scene.render.image_settings.color_mode,
         scene.cycles.samples,frame)=previous
        scene.frame_set(frame)
        bpy.context.view_layer.update()
    data["verified_restore"]=(
        all(all(max(abs(a-b) for a,b in zip(v.co,pt))<1e-6
                for v,pt in zip(objects[name].data.vertices,points))
            for name,points in originals.items())
        and all(objects[name].data.materials[0]==mat for name,mat in materials.items())
        and tuple(float(v) for row in scene.camera.matrix_world for v in row)==original_camera
        and {o.name for o in scene.objects}==before_names
        and sha256(source.read_bytes()).hexdigest()==disk_hash)
    if not data["verified_restore"]:
        raise RuntimeError("R53 cast visibility sweep mutated source original")
    (dest/"mount-radial-first-hit.json").write_text(
        json.dumps(data,indent=2)+"\n",encoding="utf8")
    print("R53_SAVED_SCENE_RESTORED",data["verified_restore"],flush=True)

if __name__=="__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    run(args.output.resolve())
