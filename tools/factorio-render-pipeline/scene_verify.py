"""Reopen saved scene files and verify their editable state and emission action.

Run through Blender itself, not system Python. Does not verify Factorio.
"""
import argparse
import json
from pathlib import Path
import sys
import bpy

def test_one(path):
    bpy.ops.wm.open_mainfile(filepath=str(path))
    scene=bpy.context.scene
    if scene.get("fsc_status")!="CALIBRATION_ONLY_NOT_FACTORIO_APPROVED":
        raise RuntimeError("Missing safe capture status: "+str(path))
    if scene.camera is None or scene.camera.data.type!="ORTHO":
        raise RuntimeError("Camera not orthographic: "+str(path))
    if scene.render.film_transparent is not True:
        raise RuntimeError("Transparency disabled in "+str(path))
    meshes=[ob for ob in scene.objects if ob.type=="MESH"]
    if len(meshes)<5:
        raise RuntimeError("Too few editable mesh parts in "+str(path))
    directions=json.loads(scene["fsc_footprint_tiles"])
    if len(directions)!=2 or min(directions)<=0:
        raise RuntimeError("Invalid footprint metadata")
    # Blender discards unused shader datablocks when saving a .blend. The
    # heavy/void models use violet while hydrogen models use blue.
    mat=next((bpy.data.materials.get(key) for key in
              ("07_ion_blue","08_void_violet","09_exhaust_amber")
              if bpy.data.materials.get(key) is not None),None)
    if mat is None or mat.node_tree is None:
        raise RuntimeError("No used emissive material saved in Blender source")
    if not mat.node_tree.animation_data or not mat.node_tree.animation_data.action:
        raise RuntimeError("Saved Blender file has no authored emission Action")
    socket=mat.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
    scene.frame_set(1)
    idle=float(socket.default_value)
    scene.frame_set(2)
    running=float(socket.default_value)
    if abs(idle-running)<0.20:
        raise RuntimeError("Saved idle/run keyframes did not produce different values")
    if not path.name.startswith("test-01-graybox"):
        if scene.get("fsc_mounting_doctrine")!="DECK_RECESSED_NO_BASE_PLATE":
            raise RuntimeError("R04 must declare recessed mount doctrine")
        floor=bpy.data.collections.get("FLOOR_INTEGRATION_PATCH")
        if floor is None or not floor.objects:
            raise RuntimeError("Missing separate floor integration patch collection")
        if any(not ob.hide_render for ob in floor.objects):
            raise RuntimeError("Floor integration patch is baked into the body render")
        if int(scene.get("fsc_floor_integration_patch_count",0))!=len(floor.objects):
            raise RuntimeError("Mismatch between saved patch objects and scene metadata")
        forbidden=("central_support","platform_mating_flange","longitudinal_frame_rail")
        if any(any(ob.name.startswith(word) for word in forbidden) for ob in meshes):
            raise RuntimeError("Legacy floor-plate components remain in model")
        # The body must penetrate below the deck, while actual nozzle vertices
        # extend BEYOND the southern platform boundary.
        required_y=float(scene["fsc_expected_rear_edge_y"])
        root=bpy.data.objects.get("CAPTURE_ROOT_UNROTATED_NORTH")
        if root is None:raise RuntimeError("Missing fixed root/pivot")
        nozzle_meshes=[ob for ob in meshes if "bell" in ob.name.lower()]
        if not nozzle_meshes:raise RuntimeError("No sculpted bell mesh")
        nozzle_low=min((ob.matrix_world@v.co).y for ob in nozzle_meshes for v in ob.data.vertices)
        if nozzle_low>=required_y-.12:
            raise RuntimeError("Exhaust bell does not project beyond platform edge")
        curved_meshes=[ob for ob in meshes if len(ob.data.vertices)>=400]
        if len(curved_meshes)<1:
            raise RuntimeError("Expected high-resolution curved housing/bell mesh")
        if not any(min((ob.matrix_world@v.co).z for v in ob.data.vertices)<-.20
                   for ob in curved_meshes):
            raise RuntimeError("Body not embedded below platform top z=0")
        if len([ob for ob in scene.objects if ob.type=="CURVE"])<3:
            raise RuntimeError("Insufficient swept piping/geometry, legacy boxy scene suspected")
        print("RECESSED_MOUNT_PASS",path.name,"rear_y",round(nozzle_low,3),
              "platform_edge",required_y,"curved_meshes",len(curved_meshes),flush=True)
    print("SCENE_REOPEN_PASS",path.name,"mesh_parts",len(meshes),
          "footprint",directions,"idle_strength",round(idle,4),
          "run_strength",round(running,4),flush=True)
    return {"file":path.name,"parts":len(meshes),"idle":idle,"run":running}

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--output",type=Path,required=True)
    args=ap.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    root=args.output.resolve()
    paths=sorted(root.glob("*/scenes/*.blend"))
    if not paths:raise RuntimeError("No editable Blender scenes to validate")
    records=[test_one(p) for p in paths]
    (root/"editable-scene-qa.json").write_text(json.dumps(records,indent=2)+"\n")
    print("ALL_EDITABLE_SCENES_PASS",len(records),flush=True)
if __name__=="__main__":main()
