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
