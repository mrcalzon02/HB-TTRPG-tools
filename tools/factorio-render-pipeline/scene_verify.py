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
    # Choose EMISSION THAT ACTUALLY BELONGS TO RENDERED MODEL GEOMETRY.
    # The R11 benchmark removes an informationally misleading blue coupler,
    # leaving an unused blue material datablock that can survive file save.
    # Testing that orphan shader gave a false animation failure. Orange
    # reactor thermal windows are the physically used animated shader.
    names=("07_ion_blue","08_void_violet","09_exhaust_amber")
    used_material_names={
        mat.name
        for obj in scene.objects if obj.type in {"MESH","CURVE"}
        for mat in obj.data.materials if mat is not None
    }
    diagnostics=[]
    animated=None
    for key in names:
        mat=bpy.data.materials.get(key)
        if mat is None or mat.name not in used_material_names or mat.node_tree is None:
            continue
        action=mat.node_tree.animation_data
        if action is None or action.action is None:
            diagnostics.append((key,"no keyed Action"));continue
        node=mat.node_tree.nodes.get("Principled BSDF")
        if node is None:
            diagnostics.append((key,"no Principled shader"));continue
        socket=node.inputs["Emission Strength"]
        scene.frame_set(1)
        candidate_idle=float(socket.default_value)
        scene.frame_set(2)
        candidate_run=float(socket.default_value)
        diagnostics.append((key,round(candidate_idle,3),round(candidate_run,3)))
        if abs(candidate_idle-candidate_run)>=.20:
            animated=(mat,candidate_idle,candidate_run)
            break
    if animated is None:
        raise RuntimeError("No actually used emissive model material has working "
                           "saved idle/run keyframes: "+repr(diagnostics))
    mat,idle,running=animated
    print("REAL_MODEL_EMISSION_PASS",path.name,mat.name,
          round(idle,3),round(running,3),flush=True)
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
        petal=[ob for ob in meshes if "_heat_shield_petal_" in ob.name]
        if len(petal)<10:raise RuntimeError("R05 expects actual separate sculpted nozzle petals")
        false_fans=[ob.name for ob in meshes if "_inner_flow_vane_" in ob.name]
        if false_fans:
            raise RuntimeError("R09 forbids turbine propeller blades inside thruster nozzle")
        longitudinal=[ob for ob in meshes if "_longitudinal_inner_liner_" in ob.name]
        if len(longitudinal)<24:
            raise RuntimeError("R09 missing deep combustion-bell lengthwise ribs")
        if not any("cast_pressure_panel_" in ob.name for ob in meshes) and not path.name.startswith("void-fusion"):
            raise RuntimeError("R05 lacks curved conformal armored segments")
        if not path.name.startswith("void-fusion"):
            weathered=[m for m in bpy.data.materials if m.get("R05_metal_surface")]
            if len(weathered)<4:raise RuntimeError("R05 procedural material surface stage missing")
        nozzle_specs=json.loads(scene.get("fsc_nozzle_profiles","[]"))
        if not nozzle_specs:
            raise RuntimeError("R06 missing authoritative nozzle geometry metadata")
        if len(nozzle_specs)*10>len(petal):
            raise RuntimeError("R06 lacks separate scalloped petals on nozzle bells")
        if any(abs(float(p["x"]))+float(p["diameter_tiles"])*.57>directions[0]/2+.02
               for p in nozzle_specs):
            raise RuntimeError("R06 nozzles exceed actual platform footprint")
        if not path.name.startswith("void-fusion"):
            if not any("_dorsal_pressure_rib_" in o.name for o in meshes):
                raise RuntimeError("R06 missing segmented dorsal armor")
        if path.name.startswith("test-04-vanilla-approx"):
            ref=json.loads(scene.get("fsc_vanilla_prototype_reference","null"))
            if not ref or ref["selection_box_factorio"]!=[[-2,-2.5],[2,5.5]]:
                raise RuntimeError("Vanilla 2.0.77 selection reference missing/wrong")
            if ref["ground_buildability_box_factorio"]!=[[-1.8,-2.3],[1.8,2.3]]:
                raise RuntimeError("Vanilla 2.0.77 mount reference missing/wrong")
            mount=float(scene.get("fsc_mount_length_blender_tiles",0))
            if not 4.5<=mount<=5.0:
                raise RuntimeError("Vanilla body was stretched across its 8 tile selection region")
            if scene.get("fsc_map_to_blender")!="Factorio Y = -Blender Y; X unchanged":
                raise RuntimeError("No verified Factorio/Blender coordinate conversion")
            effect=bpy.data.collections.get("EXHAUST_FLAME_SEPARATE_PASS")
            if not effect or len(effect.objects)<3:
                raise RuntimeError("R07 dedicated flame geometry missing")
            if any(not ob.hide_render for ob in effect.objects):
                raise RuntimeError("Flame is incorrectly baked into body atlas")
            animated=[ob for ob in effect.objects if ob.animation_data and ob.animation_data.action]
            if len(animated)<3:
                raise RuntimeError("Separated flame meshes have no persisted animation")
            if float(scene.get("fsc_flame_factorio_anchor_map_y",0))!=5.5:
                raise RuntimeError("Wrong official map-space flame anchor")
            expected_port_map={"pipe-1":(1.5,-2.0),
                               "pipe-2":(1.5,0.0),
                               "pipe-3":(-1.5,0.0),
                               "pipe-4":(-1.5,-2.0)}
            if int(scene.get("fsc_pipe_overlay_count",0))!=4:
                raise RuntimeError("All four official conditional ports are required")
            for port,(factorio_x,factorio_y) in expected_port_map.items():
                group=bpy.data.collections.get("CONDITIONAL_"+port)
                if not group or len(group.objects)<3:
                    raise RuntimeError("Missing conditional geometry for "+port)
                if any(not ob.hide_render for ob in group.objects):
                    raise RuntimeError("Pipe overlay is baked into primary body")
                anchors=[ob for ob in group.objects if ob.name.startswith("ANCHOR_"+port+"_")]
                if len(anchors)!=1:
                    raise RuntimeError("Missing source-map anchor for "+port)
                anchor=anchors[0]
                if abs(anchor.location.x-factorio_x)>0.001 or abs(anchor.location.y+factorio_y)>0.001:
                    raise RuntimeError("Incorrect map/Blender port mapping for "+port)
            if scene.get("fsc_reference_visual_pass")!="R08_blackened_segmented_furnace_with_supported_side_machinery":
                raise RuntimeError("Vanilla R08 reference-driven pressure reconstruction absent")
            if scene.get("fsc_idle_nozzle_contract")!="dark empty throat with no cyan face":
                raise RuntimeError("R09 vanilla idle nozzle must not have a bright cyan ignition disc")
            if any("_animated_ignition" in ob.name for ob in meshes):
                raise RuntimeError("Idle cyan ignition disc was incorrectly baked into source")
            if scene.get("fsc_camera_selection_evidence")!="R09 centered_high translated 1 tile aft for R10 flame clearance":
                raise RuntimeError("Vanilla camera selection lacks R09 angle and R10 exhaust framing evidence")
            camera_target=json.loads(scene.get("fsc_camera_target","null"))
            if camera_target is None or abs(camera_target[1]+1.0)>.01:
                raise RuntimeError("Camera target did not move aft with extended exhaust")
            if (abs(scene.camera.location.x-.18)>.01 or
                abs(scene.camera.location.z-10.0)>.05 or
                abs(scene.camera.location.y+7.8)>.05):
                raise RuntimeError("Vanilla camera drifted from corrected centered-high aft composition")
            expected_parts=[
                ("R08_parallel_pressure_bottle_side",2),
                ("R08_centerline_black_pressure_shield_",8),
                ("R08_rolled_nozzle_rivet",16),
                ("R08_aft_shroud_wing",2),
                ("R08_reactor_thermal_window",7),
            ]
            for prefix,count in expected_parts:
                matched=[ob for ob in meshes if ob.name.startswith(prefix)]
                if len(matched)<count:
                    raise RuntimeError("Missing R08 machined components: "+prefix+
                                       " expected="+str(count)+" observed="+str(len(matched)))
            # R11: a true open 2.28-tile nozzle, not a shallow black disc.
            # Afterburner vanes hang over the bell FROM MACHINE BRACKETS
            # outside its circumference. These are separate mesh objects.
            depth=float(scene.get("fsc_throat_far_y",0))-float(scene.get("fsc_throat_near_y",0))
            if depth<2.2:
                raise RuntimeError("R11 combustion throat is not actually deep")
            cavity=[ob for ob in meshes if ob.name.startswith("R11_OPEN_DEEP_REFRACTORY_THROAT")]
            if len(cavity)!=1:
                raise RuntimeError("Missing singular deep, hollow R11 throat")
            throat=cavity[0]
            if not throat.get("R11_open_no_endcaps"):
                raise RuntimeError("Deep throat appears capped")
            # Blender lathe must consist ONLY of quad strips. Triangulated
            # or N-gon endcaps would fill the combustion opening.
            if not throat.data.polygons or any(len(p.vertices)!=4 for p in throat.data.polygons):
                raise RuntimeError("Nozzle liner has closing faces")
            rings=len(throat.data.vertices)//40
            if rings<10 or len(throat.data.polygons)!=(rings-1)*40:
                raise RuntimeError("Nozzle throat mesh strip is incomplete")
            group=bpy.data.collections.get("R11_OUTBOARD_SUSPENDED_AFTERBURNERS")
            if group is None:
                raise RuntimeError("Afterburners must have separate outboard collection")
            vanes=[ob for ob in group.objects if ob.name.startswith("R11_SUSPENDED_AFTERBURNER_VANE_")]
            arms=[ob for ob in group.objects if ob.name.startswith("R11_OUTBOARD_SUSPENSION_ARM_")]
            feeds=[ob for ob in group.objects if ob.name.startswith("R11_AFTERBURNER_FUEL_CAPILLARY_")]
            links=[ob for ob in group.objects if ob.name.startswith("R11_CASING_TO_OUTBOARD_ROOT_")]
            sockets=[ob for ob in group.objects if ob.name.startswith("R11_CHASSIS_ATTACHMENT_SOCKET_")]
            anchors=json.loads(scene.get("fsc_afterburner_anchors","[]"))
            if (len(vanes)!=8 or len(arms)!=8 or len(feeds)!=8
                    or len(anchors)!=8 or len(links)!=8 or len(sockets)!=8):
                raise RuntimeError("Each of 8 vanes needs a chassis bridge, socket, cantilever and feedline")
            if scene.get("fsc_afterburner_chassis_links")!=8:
                raise RuntimeError("Afterburner external chassis attachment count not retained")
            if any(not ob.get("R11_span_from_machinery") for ob in vanes):
                raise RuntimeError("Suspended vanes lack mechanical support metadata")
            if any(len(ob.data.vertices)<24 for ob in vanes):
                raise RuntimeError("Afterburner vane is a placeholder polygon")
            if any((entry["attachment_xyz"][0]**2+
                    (entry["attachment_xyz"][2]+.43)**2)**.5<1.6
                   or entry["attachment_xyz"][1]>=-1.0
                   for entry in anchors):
                raise RuntimeError("Afterburner support anchors are inside bell, not outboard machinery")
            if any(min((ob.matrix_world@v.co).y for v in ob.data.vertices)>-3.25 for ob in vanes):
                raise RuntimeError("Afterburner vane does not overhang nozzle rim")
            labels=bpy.data.collections.get("R11_INFORMATION_OVERLAYS_NOT_3D")
            if labels is None or any(ob.type in {"MESH","CURVE"} for ob in labels.objects):
                raise RuntimeError("Fuel indicators and arrows must not be Blender model geometry")
            if any(ob.name.startswith("R08_blue_energy_coupler") for ob in meshes):
                raise RuntimeError("Fuel indicator artwork mistakenly modeled as physical machinery")
            if scene.get("fsc_informational_overlay_policy")!="arrows and fuel icons are UI images, zero 3D meshes":
                raise RuntimeError("Informational overlay exclusion policy missing")
            print("R11_DEEP_NOZZLE_AFTERBURNERS_PASS",path.name,
                  "depth_tiles",round(depth,3),"vanes",len(vanes),
                  "cantilever_brackets",len(arms),flush=True)
            print("R08_VISUAL_SOURCE_PASS",path.name,
                  "paired_reactors",2,"ribbed_heat_shields",8,flush=True)
            print("R07_CONDITIONAL_PIPES_PASS",path.name,"ports",len(expected_port_map),flush=True)
            print("R07_VANILLA_REFERENCE_PASS",path.name,
                  "mount_span",mount,"selection_span",directions[1],
                  "separate_effect_meshes",len(animated),flush=True)
        print("R06_GEOMETRY_PASS",path.name,"petals",len(petal),
              "nozzles",len(nozzle_specs),flush=True)
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
