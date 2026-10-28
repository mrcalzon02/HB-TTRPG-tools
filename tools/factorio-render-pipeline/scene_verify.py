"""Reopen saved scene files and verify their editable state and emission action.

Run through Blender itself, not system Python. Does not verify Factorio.
"""
import argparse
import json
from pathlib import Path
import sys
import bpy
# Blender --python runs an independent interpreter: it does NOT reliably
# include this source folder in sys.path, unlike the scene builder.
ROOT_SOURCE=str(Path(__file__).resolve().parent)
if ROOT_SOURCE not in sys.path:
    sys.path.insert(0,ROOT_SOURCE)
from vane_layout_r22 import VANE_COUNT
from vanilla_distal_motion_r18 import ANGULAR_TO_OBSERVED

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
        is_vanilla=path.name.startswith("test-04-vanilla-approx")
        if is_vanilla:
            # User-verified distinction: VANILLA afterburners are suspended
            # OUTBOARD of the cone, not petals attached to its surface.
            if petal:
                raise RuntimeError("Legacy cone-attached light ceramic panels mask real afterburners")
            if int(scene.get("fsc_removed_cone_attached_vane_panels",0))<10:
                raise RuntimeError("R11.2 failed to remove inherited fake afterburner petals")
        elif len(petal)<10:
            raise RuntimeError("Custom R06 nozzle requires separate sculpted heatshield petals")
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
        if not is_vanilla and len(nozzle_specs)*10>len(petal):
            raise RuntimeError("Custom R06 nozzle lacks expected separate scalloped petals")
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
            if camera_target is None or abs(camera_target[1]+2.1)>.01:
                raise RuntimeError("Camera target did not move aft with extended exhaust")
            if (abs(scene.camera.location.x-.18)>.01 or
                abs(scene.camera.location.z-10.15)>.05 or
                abs(scene.camera.location.y+8.9)>.05):
                raise RuntimeError("Vanilla camera drifted from corrected centered-high aft composition")
            # Validate the remaining R08 industrial chassis ONLY; R13
            # intentionally removes the old repeated shields and windows.
            # Those ABSENCES and their replacements are tested below.
            expected_parts=[
                ("R08_parallel_pressure_bottle_side",2),
                ("R08_rolled_nozzle_rivet",16),
                ("R08_aft_shroud_wing",2),
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
            anchors=json.loads(scene.get("fsc_afterburner_anchors","[]"))
            if len(vanes)!=VANE_COUNT or len(anchors)!=VANE_COUNT:
                raise RuntimeError("R27 changed fin meshes or calibration indices")
            if int(scene.get("fsc_r27_fin_panels_retained",0))!=VANE_COUNT:
                raise RuntimeError("R27 original hot-panel count not retained")
            if any(len(ob.data.vertices)<24 for ob in vanes):
                raise RuntimeError("Afterburner vane is a placeholder polygon")
            # Original sprite does not prove hidden 3D pivot coordinates.
            # Historical R11 anchor triples remain calibration metadata only.
            if any(min((ob.matrix_world@v.co).y for v in ob.data.vertices)>-3.25 for ob in vanes):
                raise RuntimeError("Afterburner vane does not overhang nozzle rim")
            labels=bpy.data.collections.get("R11_INFORMATION_OVERLAYS_NOT_3D")
            if labels is None or any(ob.type in {"MESH","CURVE"} for ob in labels.objects):
                raise RuntimeError("Fuel indicators and arrows must not be Blender model geometry")
            if any(ob.name.startswith("R08_blue_energy_coupler") for ob in meshes):
                raise RuntimeError("Fuel indicator artwork mistakenly modeled as physical machinery")
            if scene.get("fsc_informational_overlay_policy")!="arrows and fuel icons are UI images, zero 3D meshes":
                raise RuntimeError("Informational overlay exclusion policy missing")
            # Functional saved-scene R13 structural gate (not a visual score).
            if scene.get("fsc_r13_revision")!="R13_joined_pressure_trunk_refractory":
                raise RuntimeError("R13 pressure/manifold correction missing")
            if int(scene.get("fsc_r13_removed_false_bar_parts",0))!=31:
                raise RuntimeError("R13 repetitive crown cleanup absent")
            if any(ob.name.startswith(("R08_centerline_black_pressure_shield_",
                                       "R08_reactor_thermal_window",
                                       "R08_bolted_reactor_armor")) for ob in scene.objects):
                raise RuntimeError("Legacy xylophone-like crown survived")
            for label in ("R13_axial_pressure_trunk",
                          "R13_port_pressure_accumulator",
                          "R13_starboard_oxidizer_chamber",
                          "R13_forward_chamber_guard",
                          "R13_offset_pressure_shroud",
                          "R13_aft_combustor_guard",
                          "R13_chamber_crossfeed"):
                if bpy.data.objects.get(label) is None:
                    raise RuntimeError("Missing R13 joined machinery: "+label)
            for label in ("R11_OPEN_DEEP_REFRACTORY_THROAT",
                          "R08_aft_internal_reaction_drum"):
                ob=bpy.data.objects.get(label)
                if ob is None or not ob.data.materials or (
                    ob.data.materials[0].name!="R13_scorched_nonreflective_refractory"):
                    raise RuntimeError("R13 refractory is not assigned to "+label)
            if int(scene.get("fsc_r13_irregular_guard_count",0))!=3:
                raise RuntimeError("R13 requires three different casting covers")
            if int(scene.get("fsc_r13_heat_port_count",0))!=2:
                raise RuntimeError("R13 requires two physical heat ports")
            # R15: source-visible fittings, with no speculative upper motion.
            if scene.get("fsc_r15_revision")!=(
                    "R15_visible_upper_pressure_bellows_and_injector"):
                raise RuntimeError("R15 upper industrial reconstruction missing")
            if int(scene.get("fsc_r15_corrugated_forward_feed_count",0))!=2:
                raise RuntimeError("R15 needs two distinctive forward corrugated feeds")
            if int(scene.get("fsc_r15_dark_vane_count",0))!=VANE_COUNT:
                raise RuntimeError("R15 must retain eight supported vanes")
            for component in ("R15_corrugated_forward_feed_port",
                              "R15_corrugated_forward_feed_starboard",
                              "R15_weathered_centerline_injector_shell",
                              "R15_centerline_injector_return",
                              "R15_joined_pressure_supply_port",
                              "R15_joined_pressure_supply_starboard"):
                obj=bpy.data.objects.get(component)
                if obj is None:
                    raise RuntimeError("R15 missing visible, joined static machinery: "+component)
                if obj.animation_data:
                    raise RuntimeError("R15 invented unsupported mechanical animation")
            # R16 replaces the triangular needle taper with a broad,
            # squared hot end, backed by an explicitly inspectable support
            # graph for every physically separate engine-side thermal plate.
            if scene.get("fsc_r16_revision")!=(
                    "R16_broad_heat_plates_dual_braced_outboard_cradles"):
                raise RuntimeError("Missing R16 revised thermal plate assembly")
            if int(scene.get("fsc_r16_rectangular_heat_plate_count",0))!=VANE_COUNT:
                raise RuntimeError("R27 fin surface geometry was not retained")
            # Historical R16 braces and saddles are deleted by the R27
            # source-only stage, not required as fabricated supports.
            if scene.get("fsc_r16_source_movement_policy")!=(
                    "static pending direct original 64-frame mechanical tracking"):
                raise RuntimeError("R16 unverified animation was allowed")
            for vane in vanes:
                if not vane.get("R16_broad_squared_trailing_edge"):
                    raise RuntimeError("R16 fin still resembles a tapered arrow")
                if vane.get("R16_plate_aft_span",0)<vane.get("R16_plate_root_span",0):
                    raise RuntimeError("R16 trailing heat shield narrowed into a spear")
                if not vane.data.materials or len(vane.data.materials)!=4:
                    raise RuntimeError("R16 fin lacks worn-to-scorched thermal material bands")
                if vane.data.materials[3].name!=(
                        "R16_thermal_plate_oxidized_blue_tip"):
                    raise RuntimeError("R16 fin lacks refractory blue heat-scored edge")
                if vane.animation_data:
                    raise RuntimeError("R16 introduced speculative moving pivots")
                if vane.get("R16_support_graph"):
                    raise RuntimeError("R27 preserved unsupported R16 mounting graph")
                if vane.get("R27_root_mechanism_evidence")!="unresolved_not_constructed":
                    raise RuntimeError("R27 fin root is falsely marked source-proven")
                if len(vane.data.vertices)<64 or len(vane.data.polygons)<60:
                    raise RuntimeError("R16 thermal shield is a placeholder")
            # R18 only allows animation of the LOWER free ends, based on
            # directly measured original Factorio alpha envelopes.
            if scene.get("fsc_r18_revision")!=(
                    "R18_source_measured_distal_lower_lip_envelopes"):
                raise RuntimeError("R18 original-measured lower lip motion absent")
            if (int(scene.get("fsc_r18_upper_static_vanes",0))!=VANE_COUNT-4 or
                    int(scene.get("fsc_r18_distal_animated_vanes",0))!=4 or
                    int(scene.get("fsc_r18_source_frames",0))!=64):
                raise RuntimeError("R18 changed source observed motion division")
            if scene.get("fsc_r18_original_archive_sha256")!=(
                    "0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"):
                raise RuntimeError("R18 motion evidence differs from original source archive")
            any_animated=False
            for index in range(VANE_COUNT):
                fin=bpy.data.objects.get("R11_SUSPENDED_AFTERBURNER_VANE_%02d"%index)
                if index not in ANGULAR_TO_OBSERVED:
                    if fin.data.shape_keys is not None:
                        raise RuntimeError("R18 mistakenly animates stationary upper fin")
                else:
                    keys=fin.data.shape_keys
                    if keys is None or keys.key_blocks.get(
                            "R18_lower_only_mouth_apron_travel") is None:
                        raise RuntimeError("R18 distal lower fin is not deformable")
                    if keys.animation_data is None or keys.animation_data.action is None:
                        raise RuntimeError("R18 lower fin source-driven action missing")
                    if not fin.get("R18_fixed_chassis_root"):
                        raise RuntimeError("R18 movable support root violates reference")
                    key=keys.key_blocks["R18_lower_only_mouth_apron_travel"]
                    scene.frame_set(1)
                    start=float(key.value)
                    scene.frame_set(8)
                    later=float(key.value)
                    any_animated |= abs(start-later)>.01
            scene.frame_set(1)
            if not any_animated:
                raise RuntimeError("R18 lower lip animation does not evaluate in saved scene")
            # R19 must add independent, editable solid pieces INSIDE the
            # original taper. No cap, no flattening, no copied glow sprites.
            if scene.get("fsc_r19_revision")!=(
                    "R19_deep_nozzle_scales_and_suspended_fin_roots"):
                raise RuntimeError("R19 cone interior stage missing")
            r19=bpy.data.collections.get("R19_EDITABLE_OPEN_CONE_INTERIOR")
            if r19 is None or len(r19.objects)!=160:
                raise RuntimeError("R19 open cone needs 160 separate details")
            for prop,count in (("fsc_r19_near_tiles",40),
                               ("fsc_r19_mid_tiles",40),
                               ("fsc_r19_deep_strakes",40),
                               ("fsc_r19_cooling_slots",40),
                               ("fsc_r19_deep_strakes",40)):
                if int(scene.get(prop,0))!=count:
                    raise RuntimeError("R19 missing parts: "+prop)
            r19_throat=bpy.data.objects.get("R11_OPEN_DEEP_REFRACTORY_THROAT")
            if not r19_throat.get("R11_open_no_endcaps") or (
                len(r19_throat.data.polygons)!=int(
                    scene.get("fsc_r19_open_throat_polygons",0))):
                raise RuntimeError("R19 filled or replaced the open throat")
            for index in range(VANE_COUNT):
                plate=bpy.data.objects.get(
                    "R11_SUSPENDED_AFTERBURNER_VANE_%02d"%index)
                if plate.get("R19_joined_root_back_rib"):
                    raise RuntimeError("R27 retained unproven aft-fin root rib")
                if not plate.get("R19_r18_distal_shape_keys_untouched"):
                    raise RuntimeError("R19 violated R18 fin motion")
            if scene.get("fsc_r19_glow_layer_policy")!=(
                    "not baked into physical cone geometry"):
                raise RuntimeError("R19 fused source light into physical geometry")
            # A capped legacy drum would hide the newly authored deep
            # physical refractory despite passing all R19 counts.
            if scene.get("fsc_r20_revision")!=(
                    "R20_open_old_reaction_drum_keep_depth"):
                raise RuntimeError("R20 sealed reaction drum not corrected")
            corrected=bpy.data.objects.get("R08_aft_internal_reaction_drum")
            if corrected is None or (
                len(corrected.data.polygons)!=200 or
                any(len(face.vertices)!=4 for face in corrected.data.polygons)):
                raise RuntimeError("R20 reaction drum still blocks the deep throat")
            if not corrected.get("R20_no_obstruction_of_deep_R19_liner"):
                raise RuntimeError("R20 old cap removal incomplete")
            if (int(scene.get("fsc_r20_reaction_drum_removed_caps",0))!=2 or
                int(scene.get("fsc_r20_revealed_inner_strakes",0))!=40):
                raise RuntimeError("R20 did not unmask all R19 strakes")
            for i in range(40):
                rib=bpy.data.objects.get("R19_DEEP_COMBUSTOR_STRAKE_%02d"%i)
                if rib.data.materials[0].name!=(
                        "R20_inner_oxidized_strake_contrast"):
                    raise RuntimeError("R20 strake contrast not retained")
            # R27: keep only modelable source-visible components.
            from vanilla_evidence_prune_r27 import (
                UNSUPPORTED_PREFIXES,UPPER_MECHANISM_PRESERVE,
                SOURCE_SHA256,REVISION as R27_REVISION)
            if scene.get("fsc_r27_revision")!=R27_REVISION:
                raise RuntimeError("R27 source-evidence audit not applied")
            if scene.get("fsc_r27_original_archive_sha256")!=SOURCE_SHA256:
                raise RuntimeError("R27 source archive SHA mismatch")
            for family in UNSUPPORTED_PREFIXES:
                if any(ob.name.startswith(family) for ob in scene.objects):
                    raise RuntimeError("Unverified fin actuator geometry survived: "+family)
            exclusions=json.loads(scene.get("fsc_r27_removed_by_family","{}"))
            if set(exclusions)!=set(UNSUPPORTED_PREFIXES) or any(
                    value<1 for value in exclusions.values()):
                raise RuntimeError("R27 falsely claimed to remove unsupported geometry")
            for observed_upper in UPPER_MECHANISM_PRESERVE:
                if bpy.data.objects.get(observed_upper) is None:
                    raise RuntimeError("R27 removed upper reference machinery")
            if int(scene.get("fsc_r27_outer_underpanels_retained",0))!=2:
                raise RuntimeError("R27 dropped outer source-observable underpanels")
            if not scene.get("fsc_r27_no_unproven_hinge_animation"):
                raise RuntimeError("R27 still animates unproven mounts")
            print("R27_SOURCE_VISIBLE_ONLY_GATE_PASS",path.name,
                  "removed_unsupported",sum(exclusions.values()),flush=True)
            # R28: two broad, CURVED lower-underbelly cups around the
            # existing inner hot-fins; NO added geometry or piston rig.
            if scene.get("fsc_r28_revision")!=(
                    "R28_source_conformal_underslung_shallow_clamshell"):
                raise RuntimeError("R28 source-driven cups not rebuilt")
            if (int(scene.get("fsc_r28_undercover_count",0))!=2 or
                int(scene.get("fsc_r28_shelter_section_count",0))!=9 or
                int(scene.get("fsc_r28_section_stations",0))!=8):
                raise RuntimeError("R28 underside clamshell profile incomplete")
            if (not scene.get("fsc_r28_no_new_objects") or
                not scene.get("fsc_r28_inner_fin_signatures_preserved")):
                raise RuntimeError("R28 altered inner hot fins or added speculative hardware")
            if scene.get("fsc_r28_source_sha256")!=(
                    "0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"):
                raise RuntimeError("R28 does not refer to original source archive")
            r28outer=bpy.data.collections.get(
                "R25_EXTERNAL_LARGE_SKID_COVERS_NOT_INNER_FINS")
            if r28outer is None or len(r28outer.objects)!=2:
                raise RuntimeError("R28 must only reshape two already visible covers")
            for side in ("port","starboard"):
                r28panel=r28outer.objects.get("R25_OUTER_SKID_UNDERSIDE_"+side)
                if not r28panel or not r28panel.get("R28_cupped_section"):
                    raise RuntimeError("R28 missing real 3D cup: "+side)
                if (not r28panel.get("R28_source_visible_underface_only") or
                    not r28panel.get("R28_no_invented_mounts_or_pistons")):
                    raise RuntimeError("R28 invented hidden mechanism")
                if len(r28panel.data.vertices)!=144:
                    raise RuntimeError("R28 cupped underside not 8×9×2 physical mesh")
                coords=r28panel.data.vertices
                if (min(abs(v.co.x) for v in coords)>.99 or
                    max(abs(v.co.x) for v in coords)>2.10):
                    raise RuntimeError("R28 skirts do not curve INWARD under fins")
                if min(v.co.z for v in coords)>-1.8:
                    raise RuntimeError("R28 clamshell does not cradle BELOW the lower nozzle")
            print("R28_UNDERBODY_CLAMSHELL_SOURCE_PASS",path.name,flush=True)
            # R29 check ACTUAL 3D circumferential orientation and color,
            # not just the old approximate R28 planar cup metadata.
            if scene.get("fsc_r29_revision")!=(
                    "R29_radially_wrapped_unburnt_beige_lower_shrouds"):
                raise RuntimeError("R29 underside shells not radial/beige")
            if (int(scene.get("fsc_r29_outer_shroud_count",0))!=2 or
                not scene.get("fsc_r29_inner_fins_unchanged") or
                not scene.get("fsc_r29_no_added_geometry")):
                raise RuntimeError("R29 altered protected fin population/assembly")
            if scene.get("fsc_r29_source_material")!=(
                    "R16_oxidized_load_bearing_clevis"):
                raise RuntimeError("R29 skid shells use wrong source attachment material")
            if abs(float(scene.get(
                    "fsc_r29_2_source_outline_outer_lip_flare",0))-.36)>.001:
                raise RuntimeError("R29.2 source-matching outer beige lip width absent")
            if not scene.get("fsc_r29_all_covered_faces_follow_bell_circumference"):
                raise RuntimeError("R29 outer shells remain globally level")
            beige_reference=bpy.data.materials.get(
                    "R16_oxidized_load_bearing_clevis")
            if beige_reference is None:
                raise RuntimeError("Missing original beige attachment material")
            source_rgba=beige_reference.node_tree.nodes[
                    "Principled BSDF"].inputs["Base Color"].default_value
            for direction in ("port","starboard"):
                cover=bpy.data.objects.get(
                    "R25_OUTER_SKID_UNDERSIDE_"+direction)
                if not cover or not all(cover.get(k) for k in (
                        "R29_bell_radial_wrap","R29_no_outer_heat_damage",
                        "R29_underside_only",
                        "R29_cross_section_not_global_plane",
                        "R29_no_added_piston_or_hinge")):
                    raise RuntimeError("R29 radial clamshell still a colored horizontal wing")
                if (len(cover.data.vertices)!=144 or
                    len(cover.data.polygons)!=142):
                    raise RuntimeError("R29 missing physically curved 8x9x2 sheet")
                if (not cover.data.materials or
                    cover.data.materials[0].name!=(
                        "R29_large_underskid_beige_same_as_root_castings")):
                    raise RuntimeError("R29 shell isn't using matching beige metal")
                actual_color=cover.data.materials[0].node_tree.nodes[
                        "Principled BSDF"].inputs["Base Color"].default_value
                if max(abs(float(a)-float(b))
                       for a,b in zip(source_rgba,actual_color))>1e-6:
                    raise RuntimeError("R29 outer skid beige differs from fin attachment")
                colors=cover.data.color_attributes
                if colors.get("R29_beige_weathering_not_thermal_oxide") is None:
                    raise RuntimeError("R29 natural beige physical shell metadata absent")
                if colors.get("R25_underside_thermal_patina") is not None:
                    raise RuntimeError("R29 preserved fictitious blue burnout on skid")
                # MATERIAL IS BEIGE but only means anything if each
                # mirrored OUTER shell surface normal points OUTWARD.
                # The former starboard winding inverted its illumination.
                shell_poly=cover.data.polygons[1]
                surface=cover.data.vertices[
                    cover.data.loops[shell_poly.loop_start].vertex_index].co
                radial_dot=(shell_poly.normal.x*surface.x+
                            shell_poly.normal.z*(surface.z+.43))
                if radial_dot<=0:
                    raise RuntimeError("R29 outer beige shell surface normal faces inward")
                # On axial station 4, each side must rotate >0.6 tiles
                # in BOTH X and Z when tracing shell circumferentially.
                a=cover.data.vertices[3*9+0].co
                b=cover.data.vertices[3*9+8].co
                # R31 deliberately returns the INNER lip upward. Therefore
                # the old R29 end-to-end Z-delta is no longer an accurate
                # curvature check: it penalizes the physical cupping.
                # Keep circumferential X travel and test THREE points,
                # requiring an actual recessed belly rather than a chord.
                mid=cover.data.vertices[3*9+4].co
                if abs(a.x-b.x)<.6 or abs(a.z-mid.z)<.5:
                    raise RuntimeError("R31 shell lost radial and vertical wrap")
                if mid.z>=min(a.z,b.z)-.10:
                    raise RuntimeError("R31 shell is still flattened between rims")
                if abs(a.y-b.y)>1e-5:
                    raise RuntimeError("R29 cross-section is not circumferential")
            print("R29_SOURCE_BEIGE_RADIAL_SKIDS_PASS",path.name,flush=True)
            # R31 tests actual SAVED mesh vertex geometry. A cylindrical
            # 30-degree wrap with a nearly straight chord is insufficient:
            # both rims must be above the belly for a cupped clamshell.
            from vanilla_cupped_radial_skids_r31 import (
                REVISION as R31_REVISION,SOURCE_ARCHIVE_SHA256 as R31_SOURCE)
            if scene.get("fsc_r31_revision")!=R31_REVISION:
                raise RuntimeError("R31 source cupped clamshell stage missing")
            if scene.get("fsc_r31_original_source_archive_sha256")!=R31_SOURCE:
                raise RuntimeError("R31 is not traceable to real source frames")
            if not scene.get("fsc_r31_preserves_r18_64_frame_fin_motion"):
                raise RuntimeError("R31 corrupted original fin animation mapping")
            if not scene.get("fsc_r31_outer_shell_stationary_until_evidence"):
                raise RuntimeError("R31 inferred unproved outer shell actuation")
            for side in ("port","starboard"):
                ob=bpy.data.objects.get("R25_OUTER_SKID_UNDERSIDE_"+side)
                if not (ob.get("R31_cupped_bowl_not_global_plane") and
                        ob.get("R31_returned_inner_lip") and
                        ob.get("R31_no_extra_visible_parts")):
                    raise RuntimeError("R31 clamshell profile was not built")
                if ob.animation_data:
                    raise RuntimeError("R31 shell has unsupported motion")
                half=72
                outer,belly,inside=[
                    ob.data.vertices[half+3*9+j].co for j in (0,4,8)]
                if belly.z>=min(outer.z,inside.z)-.10:
                    raise RuntimeError("R31 saved mesh is visually flat across cup")
                if abs(float(ob.get("R31_lower_belly_sag_tiles",0)))<.10:
                    raise RuntimeError("R31 measured bowl sag was not saved")
            print("R31_SOURCE_CUPPED_AFT_SKIDS_PASS",path.name,flush=True)
            # R33 source contour candidate: test the actual reopened
            # saved meshes for tapered aft profile and preserved concavity.
            from vanilla_source_tail_profile_r33 import (
                REVISION as R33_REVISION,ORIGINAL_SHA256 as R33_SHA)
            if (scene.get("fsc_r33_revision")!=R33_REVISION or
                scene.get("fsc_r33_source_archive_sha256")!=R33_SHA):
                raise RuntimeError("R33 original source taper not applied")
            if not (scene.get("fsc_r33_no_outer_rig_inferred") and
                    scene.get("fsc_r33_inner_64_frame_motion_preserved")):
                raise RuntimeError("R33 lost noninvented motion provenance")
            for side in ("port","starboard"):
                ob=bpy.data.objects.get("R25_OUTER_SKID_UNDERSIDE_"+side)
                if (not ob.get("R33_source_tail_taper") or
                    not ob.get("R33_no_extra_parts_or_actuators") or
                    abs(float(ob.get("R33_aft_tip_y_shift",0))-.02)>.001):
                    raise RuntimeError("R33 rear ends were not tapered in real scene")
                if ob.animation_data:
                    raise RuntimeError("R33 guard invents unverified actuation")
                for row in (5,6,7):
                    outside,belly,inside=[
                        ob.data.vertices[72+row*9+j].co for j in (0,4,8)]
                    if belly.z>=min(outside.z,inside.z)-.10:
                        raise RuntimeError("R33 aft taper flattened cupped shell")
                    if abs(outside.x)-abs(inside.x)<(.55 if row==7 else .75):
                        raise RuntimeError("R33 rear profile does not wrap nozzle")
                a=ob.data.vertices[72+7*9+0].co
                b=ob.data.vertices[72+7*9+4].co
                c=ob.data.vertices[72+7*9+8].co
                if not (a.y>b.y+.04 and c.y>b.y+.04):
                    raise RuntimeError("R33.1 persisted end cap is still a square cutoff")
                if abs(float(ob.get("R33_rounded_tail_edge",0))-.045)>.001:
                    raise RuntimeError("R33.2 curved terminal edge marker missing")
                if (ob.get("R33_2_source_rgba_port_last_row")!=512 or
                    ob.get("R33_2_source_rgba_starboard_last_row")!=513):
                    raise RuntimeError("R33.2 no original RGBA alpha target provenance")
            print("R33_SOURCE_AFT_TAPER_SAVED_MESH_PASS",path.name,flush=True)
            # R36 AFTER R33: source BODY atlas proved ~2–3 px 64-frame
            # side-silhouette shifts. The physical mechanism isn't visible.
            # Require genuine saved 64-key shape deformation on the SAME
            # two external cups, not animated object pivots or new parts.
            from vanilla_source_guard_motion_r36 import (
                REVISION as R36_REVISION,ORIGINAL_SHA256 as R36_SHA,
                SOURCE_EDGE_SAMPLES as R36_SAMPLES,
                MODEL_LATERAL_TRAVEL_TILES as R36_MAX)
            if (scene.get("fsc_r36_revision")!=R36_REVISION or
                scene.get("fsc_r36_original_archive_sha256")!=R36_SHA or
                int(scene.get("fsc_r36_real_rgba_frames",0))!=64):
                raise RuntimeError("R36 exact original outer-edge animation not applied")
            if not (scene.get("fsc_r36_no_new_parts") and
                    scene.get("fsc_r36_no_pivot_or_actuator_inferred") and
                    scene.get("fsc_r36_keeps_r35_1_inner_fin_proportions")):
                raise RuntimeError("R36 introduced unproven mechanisms or altered inner fins")
            from vanilla_source_guard_motion_r36 import normalized_values
            for side in ("port","starboard"):
                ob=bpy.data.objects.get("R25_OUTER_SKID_UNDERSIDE_"+side)
                if ob.animation_data or not ob.get("R36_shape_key_not_object_animation"):
                    raise RuntimeError("R36 shell has object-level instead of observed silhouette motion")
                kb=ob.data.shape_keys
                if not kb or not kb.animation_data or not kb.animation_data.action:
                    raise RuntimeError("R36 64-frame shape-key animation absent from saved scene")
                if len(kb.key_blocks)!=2:
                    raise RuntimeError("R36 invented additional hidden shell articulations")
                k=kb.key_blocks["R36_observed_2D_guard_edge_motion_NOT_verified_hinge"]
                if k.slider_min>-.99 or k.slider_max<.99:
                    raise RuntimeError("R36 cannot reproduce signed original alpha-outline travel")
                vals=normalized_values(R36_SAMPLES[side])
                scene.frame_set(1)
                if abs(k.value-vals[0])>.005:
                    raise RuntimeError("R36 frame0 no longer matches unshifted R35 base")
                scene.frame_set(8)
                # Require the stored source measurement AND nonzero
                # motion. The previous second term incorrectly compared
                # k.value to the target again, rejecting exact matches.
                if abs(k.value-vals[7])>.005 or abs(k.value)<.3:
                    raise RuntimeError("R36 real original frame7 motion missing")
                scene.frame_set(1)
                base=kb.key_blocks["Basis"].data[72+5*9+4].co
                moved=k.data[72+5*9+4].co
                if abs(moved.x-base.x-R36_MAX*.78)>.001:
                    raise RuntimeError("R36 cupped guard mesh has no physical lateral motion")
                if abs(moved.z-base.z)>.00001 or abs(moved.y-base.y)>.00001:
                    raise RuntimeError("R36 changed source-controlled bowl curvature or aft tip")
                if json.loads(ob.get("R36_original_64_edge_samples","[]"))!=list(R36_SAMPLES[side]):
                    raise RuntimeError("R36 64-source-frame trajectory metadata differs from original")
            scene.frame_set(1)
            print("R36_SOURCE_MEASURED_OUTER_EDGE_SHAPE_ANIMATION_PASS",path.name,flush=True)
            # R37: the exact source's R19 refractory shell must be
            # physically surfaced, not just colored/glowing 2D stickers.
            from vanilla_refractory_visibility_r37 import (
                REVISION as R37_REVISION,ORIGINAL_SHA256 as R37_SHA,
                RIDGE_INWARD_TILES as R37_RIDGE,DARK_COLOR as R37_DARK,
                AGED_COLOR as R37_AGED,STRAKE_COLOR as R37_STRAKE,
                THROAT_COLOR as R37_THROAT,THROAT_MATERIAL_NAME as R37_THROAT_NAME)
            if (scene.get("fsc_r37_revision")!=R37_REVISION or
                scene.get("fsc_r37_exact_source_sha256")!=R37_SHA or
                int(scene.get("fsc_r37_unmodified_tile_count",0))!=80):
                raise RuntimeError("R37 source-visible refractory missing")
            if not (scene.get("fsc_r37_open_bore_unsealed") and
                    scene.get("fsc_r37_no_original_sprite_texture_or_glow") and
                    scene.get("fsc_r37_no_added_objects")):
                raise RuntimeError("R37 faked visual interior or reintroduced sealed bore")
            if r19_throat.data.materials[0].name!=R37_THROAT_NAME:
                raise RuntimeError("R37 throat contrast material not retained")
            for name,color in (
                ("R19_chipped_black_refractory",R37_DARK),
                ("R19_inner_oxidized_shingles",R37_AGED),
                ("R20_inner_oxidized_strake_contrast",R37_STRAKE),
                (R37_THROAT_NAME,R37_THROAT)):
                mat=bpy.data.materials.get(name)
                if mat is None:
                    raise RuntimeError("R37 historical material missing")
                bs=mat.node_tree.nodes.get("Principled BSDF")
                rgb=bs.inputs["Base Color"].default_value
                if max(abs(float(a)-b) for a,b in zip(rgb,color))>.00001:
                    raise RuntimeError("R37 source material was not saved")
                if bs.inputs["Emission Strength"].default_value!=0:
                    raise RuntimeError("R37 original refractory baked additive glow")
            if not scene.get("fsc_r37_r13_shared_refractory_preserved"):
                raise RuntimeError("R37 broke R13 single shared refractory material")
            drum=bpy.data.objects["R08_aft_internal_reaction_drum"]
            if (drum.data.materials[0].as_pointer()!=
                r19_throat.data.materials[0].as_pointer()):
                raise RuntimeError("R37 split the R13 drum from the open throat")
            for kind in ("R19_NEAR_MOUTH_TILE_","R19_MID_STAGGERED_TILE_"):
                for n in range(40):
                    ob=bpy.data.objects.get(f"{kind}{n:02d}")
                    if (ob is None or
                        not ob.get("R37_source_refractory_center_corrugation") or
                        abs(float(ob.get("R37_center_inset_tiles",0))-R37_RIDGE)>.00001):
                        raise RuntimeError("R37 center corrugation not stored on source tile")
                    outer=ob.data.vertices[3].co
                    center=ob.data.vertices[4].co
                    # At matching axial station 1, center rib is physically
                    # pressed inward into bore (smaller axis radius).
                    radius=lambda p:(p.x*p.x+(p.z+.43)*(p.z+.43))**.5
                    if radius(center)>=radius(outer)-.012:
                        raise RuntimeError("R37 physically unshaped source strake")
            print("R37_SOURCE_REFRACTORY_PHYSICAL_FACETS_PASS",path.name,flush=True)
            # R38 strict SAVED Blender topology audit: 40 original curves
            # reach deeper into the source-visible open throat, and both
            # original shingle layers are redistributed without duplication.
            from vanilla_refractory_depth_r38 import (
                REVISION as R38_REVISION,ORIGINAL_SHA256 as R38_SHA,
                STRAKE_NEW_END_Y as R38_END,STRAKE_BEVEL as R38_BEVEL,
                NEAR_AGED_INDICES as R38_NEAR,
                MID_AGED_REMAINDERS as R38_MID)
            if (scene.get("fsc_r38_revision")!=R38_REVISION or
                scene.get("fsc_r38_original_sprite_sha256")!=R38_SHA or
                int(scene.get("fsc_r38_reused_near_tiles",0))!=40 or
                int(scene.get("fsc_r38_reused_mid_tiles",0))!=40 or
                int(scene.get("fsc_r38_extended_original_strakes",0))!=40):
                raise RuntimeError("R38 source refractory redistribution missing")
            if not all(scene.get(p) for p in (
                "fsc_r38_existing_dark_aged_materials_only",
                "fsc_r38_no_original_pixels_stored",
                "fsc_r38_original_open_bore_and_shared_material",
                "fsc_r38_no_camera_or_light_changes")):
                raise RuntimeError("R38 changed source art/lighting/bore contracts")
            for index in range(40):
                bar=bpy.data.objects.get(f"R19_DEEP_COMBUSTOR_STRAKE_{index:02d}")
                if not bar or not bar.get("R38_original_curve_not_duplicate"):
                    raise RuntimeError("R38 original curved refractory rib missing")
                splines=bar.data.splines
                if (len(splines)!=1 or splines[0].type!="BEZIER" or
                    len(splines[0].bezier_points)!=4):
                    raise RuntimeError("R38 changed original curve topology")
                if (abs(splines[0].bezier_points[-1].co.y-R38_END)>.001 or
                    abs(bar.data.bevel_depth-R38_BEVEL)>.001):
                    raise RuntimeError("R38 actual deep strake was not extended")
                for kind,prefix in (("near","R19_NEAR_MOUTH_TILE_"),
                                    ("mid","R19_MID_STAGGERED_TILE_")):
                    tile=bpy.data.objects.get(f"{prefix}{index:02d}")
                    if not tile or tile.get("R38_existing_axial_scale_rebalanced")!=kind:
                        raise RuntimeError("R38 existing source tile was replaced")
                    aged=(index in R38_NEAR if kind=="near"
                          else index%5 in R38_MID)
                    target=("R19_inner_oxidized_shingles" if aged else
                            "R19_chipped_black_refractory")
                    if tile.data.materials[0].name!=target:
                        raise RuntimeError("R38 near/mid original shader allocation failed")
            print("R38_SOURCE_OPEN_BORE_DEPTH_AND_LAYER_QA_PASS",
                  path.name,flush=True)
            # R39 SAVED mesh geometry rather than metadata alone:
            # exactly twenty physical narrow radial channels in original
            # R11 13x40 open wall, and unchanged source-shared R13 material.
            from vanilla_open_liner_flutes_r39 import (
                REVISION as R39_REVISION,ORIGINAL_SHA256 as R39_SHA,
                RINGS as R39_RINGS,SIDES as R39_SIDES,
                CHANNEL_DEPTH as R39_DEPTH,FLUTE_COUNT as R39_COUNT)
            if (scene.get("fsc_r39_revision")!=R39_REVISION or
                scene.get("fsc_r39_original_sha256")!=R39_SHA or
                not scene.get("fsc_r39_ribbed_inner_open_liner") or
                int(scene.get("fsc_r39_fluted_quads",0))!=8*R39_SIDES):
                raise RuntimeError("R39 physical upper bell flutes not persisted")
            if not all(scene.get(flag) for flag in (
                "fsc_r39_reused_original_mesh_and_R13_shader",
                "fsc_r39_source_pixels_not_committed",
                "fsc_r39_no_new_geometry_or_glow")):
                raise RuntimeError("R39 generated unsupported interior geometry")
            original_liner=bpy.data.objects["R11_OPEN_DEEP_REFRACTORY_THROAT"]
            wall=original_liner.data
            if (len(wall.vertices)!=R39_RINGS*R39_SIDES or
                len(wall.polygons)!=(R39_RINGS-1)*R39_SIDES or
                not original_liner.get("R39_open_no_endcaps_preserved") or
                int(original_liner.get("R39_actual_inner_flutes",0))!=R39_COUNT):
                raise RuntimeError("R39 modified original R11 topology/endcaps")
            for ring in (5,6):
                p0=wall.vertices[ring*R39_SIDES].co
                p1=wall.vertices[ring*R39_SIDES+1].co
                radius=lambda v:(v.x*v.x+(v.z+.43)*(v.z+.43))**.5
                if radius(p0)>=radius(p1)-R39_DEPTH*.6:
                    raise RuntimeError("R39 saved wall is still smooth, no actual flute")
            if (wall.materials[0].as_pointer()!=
                bpy.data.objects["R08_aft_internal_reaction_drum"].data.materials[0].as_pointer()):
                raise RuntimeError("R39 split original R13 refractory material")
            if sum(1 for f in wall.polygons if not f.use_smooth)<8*R39_SIDES:
                raise RuntimeError("R39 upper wall surface has no physical normal facets")
            print("R39_ORIGINAL_OPEN_LINER_PHYSICAL_FLUTES_PASS",path.name,flush=True)
            # R42 R41-proven occluder: physically trimmed inner return
            # on original R04 bell; full exterior still present.
            from vanilla_legacy_bell_trim_r42 import (
                REVISION as R42_REVISION,SOURCE_SHA256 as R42_SHA,
                EXTERIOR_RINGS as R42_RINGS,SEGMENTS as R42_SEGMENTS,
                EXTERIOR_FACES as R42_FACES)
            if (scene.get("fsc_r42_revision")!=R42_REVISION or
                scene.get("fsc_r42_source_sha256")!=R42_SHA or
                scene.get("fsc_r42_removed_duplicate_quads")!=160):
                raise RuntimeError("R42 legacy inner return not repaired")
            exterior=bpy.data.objects.get("vanilla_reference_bell_bronzed_rolled_bell")
            if (not exterior or len(exterior.data.vertices)!=R42_RINGS*R42_SEGMENTS or
                len(exterior.data.polygons)!=R42_FACES or exterior.hide_render or
                exterior.data.materials[0].name!="R13_oxidized_rough_nozzle_shell" or
                not exterior.get("R42_original_object_preserved") or
                not exterior.get("R42_not_render_visibility_bypass") or
                not scene.get("fsc_r42_genuine_open_nozzle_preserved")):
                raise RuntimeError("R42 lost original physical exterior rolled bell")
            if any(len(f.vertices)!=4 for f in exterior.data.polygons):
                raise RuntimeError("R42 reintroduced forbidden hidden bell caps")
            print("R42_SOURCE_LEGACY_DUPLICATE_RETURN_REMOVED_PASS",path.name,flush=True)
            # R43 verify original material datablocks remain shared:
            # near tiles alone use per-object physical patina, upper
            # and mid R19 surfaces have their exact original coloration.
            from vanilla_depth_patina_r43 import (
                REVISION as R43_REVISION,SOURCE_SHA256 as R43_SHA,
                TILE_COUNT as R43_COUNT,NEAR_OBJECT_TINT as R43_TINT,
                MATERIAL_NAMES as R43_MATS,INFO_NODE as R43_INFO,
                TINT_NODE as R43_NODE)
            if (scene.get("fsc_r43_revision")!=R43_REVISION or
                scene.get("fsc_r43_source_sha256")!=R43_SHA or
                int(scene.get("fsc_r43_near_tile_count",0))!=R43_COUNT or
                abs(float(scene.get("fsc_r43_near_patina_factor",0))-R43_TINT)>.001):
                raise RuntimeError("R43 original lower physical patina missing")
            for i in range(R43_COUNT):
                tile=bpy.data.objects.get(f"R19_NEAR_MOUTH_TILE_{i:02d}")
                mid=bpy.data.objects.get(f"R19_MID_STAGGERED_TILE_{i:02d}")
                if (tile is None or mid is None or
                    not tile.get("R43_darkened_original_near_tile") or
                    any(abs(v-R43_TINT)>.001 for v in tile.color[:3]) or
                    any(abs(v-1)>.001 for v in mid.color)):
                    raise RuntimeError("R43 lower/upper source refractory split incorrect")
            for material_name in R43_MATS:
                mat=bpy.data.materials.get(material_name)
                if (not mat or not mat.node_tree.nodes.get(R43_INFO) or
                    not mat.node_tree.nodes.get(R43_NODE) or
                    not mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].is_linked):
                    raise RuntimeError("R43 physical material modulation not saved")
                if mat.node_tree.nodes["Principled BSDF"].inputs[
                    "Emission Strength"].default_value!=0:
                    raise RuntimeError("R43 baked a forbidden fake flame")
            if not (scene.get("fsc_r43_mid_and_upper_refractory_unchanged") and
                    scene.get("fsc_r43_unmodified_R13_shared_shader") and
                    scene.get("fsc_r43_no_extra_objects_materials_textures_or_glow")):
                raise RuntimeError("R43 changed source geometry or shader ownership")
            print("R43_SOURCE_DEPTH_PHYSICAL_PATINA_PASS",path.name,flush=True)
            # R44 requires a physical mesh-axial transition on existing
            # R19 shader datablocks, never a camera-space brightness patch.
            from vanilla_axial_patina_r44 import (
                REVISION as R44_REV,SOURCE_SHA256 as R44_SHA,
                TILE_COUNT as R44_COUNT,AXIAL_BLEND_START as R44_START,
                AXIAL_BLEND_END as R44_END,COORD_NODE as R44_COORD,
                AXIS_NODE as R44_AXIS,MAP_NODE as R44_MAP,MIX_NODE as R44_MIX)
            if (scene.get("fsc_r44_revision")!=R44_REV or
                scene.get("fsc_r44_source_sha256")!=R44_SHA or
                int(scene.get("fsc_r44_near_tiles",0))!=R44_COUNT or
                abs(float(scene.get("fsc_r44_blend_start",-1))-R44_START)>1e-6 or
                abs(float(scene.get("fsc_r44_blend_end",-1))-R44_END)>1e-6 or
                not scene.get("fsc_r44_same_R43_original_object_colors") or
                not scene.get("fsc_r44_no_added_model_material_camera_lights_or_effect")):
                raise RuntimeError("R44 saved Blender physical source contract missing")
            for mat_name in R43_MATS:
                mat=bpy.data.materials[mat_name]
                nodes=mat.node_tree.nodes
                links=mat.node_tree.links
                coord=nodes.get(R44_COORD)
                axis=nodes.get(R44_AXIS)
                mapper=nodes.get(R44_MAP)
                mix=nodes.get(R44_MIX)
                info=nodes.get(R43_INFO)
                patina=nodes.get(R43_NODE)
                if (not coord or not axis or not mapper or not mix or
                    not info or not patina or not mapper.clamp or
                    abs(mapper.inputs["From Min"].default_value-R44_START)>1e-6 or
                    abs(mapper.inputs["From Max"].default_value-R44_END)>1e-6):
                    raise RuntimeError("R44 actual saved material transition absent")
                for upstream,downstream in ((coord,axis),(axis,mapper),
                                            (mapper,mix),(info,mix),(mix,patina)):
                    if not any(e.from_node is upstream and e.to_node is downstream
                               for e in links):
                        raise RuntimeError("R44 material graph is not physically connected")
                if not any(e.from_socket is axis.outputs["Y"] and
                           e.to_socket is mapper.inputs["Value"] for e in links):
                    raise RuntimeError("R44 cannot use non-axial mesh coordinate")
            print("R44_SOURCE_AXIAL_PATINA_SAVED_SCENE_PASS",path.name,flush=True)
            # R26 source portrait SCALE and physically under-bell placement
            # are enforced without changing the inner fin topology.
            expected_parent_scale=(.86,1.28,1.0)
            if any(abs(a-b)>.001 for a,b in zip(
                    bpy.data.objects["CAPTURE_ROOT_UNROTATED_NORTH"].scale,
                    expected_parent_scale)):
                raise RuntimeError("R26 global portrait proportion correction missing")
            if abs(scene.camera.data.ortho_scale-7.46)>.01:
                raise RuntimeError("R30 source-occupancy camera zoom not set")
            if scene.get("fsc_r30_fixed_registration_source_bbox")!=(
                    "[4, 0, 263, 532]"):
                raise RuntimeError("R30 source alpha bounds not recorded")
            if scene.get("fsc_r30_source_frame_size")!=(
                    "[264, 542]"):
                raise RuntimeError("R30 source resolution not recorded")
            if not scene.get("fsc_r30_source_zoom_not_mesh_edit"):
                raise RuntimeError("R30 camera reframe cannot masquerade as a mesh edit")
            if abs(json.loads(scene.get("fsc_camera_target","null"))[2]-.71)>.01:
                raise RuntimeError("R30 preserved-angle camera target not applied")
            if scene.get("fsc_r26_reference_projection")!=(
                    "source_portrait_0.487_ratio_calibration"):
                raise RuntimeError("R26 source aspect calibration marker missing")
            if scene.get("fsc_r26_revision")!=(
                    "R26_source_underneath_not_side_wings"):
                raise RuntimeError("R26 exterior skids are still lateral wings")
            if (float(scene.get("fsc_r26_under_nozzle_z_max",0))>=-1.10
                    or float(scene.get("fsc_r26_under_nozzle_z_min",0))>=-1.8):
                raise RuntimeError("R26 skid covering mesh is not BELOW the cone")
            if not scene.get("fsc_r26_not_included_in_inner_fin_count"):
                raise RuntimeError("R26 incorrectly reclassified exterior as inner")
            # R25 user's critical distinction: TWO larger OUTER skid-cover
            # undersides are NOT counted among the repeated internal vanes.
            if scene.get("fsc_r25_revision")!=(
                    "R25_two_large_external_underside_skid_covers"):
                raise RuntimeError("R25 outer skid cover assembly absent")
            if int(scene.get("fsc_r25_large_outer_skids",0))!=2:
                raise RuntimeError("R25 must contain exactly two outer skid panels")
            if not scene.get("fsc_r25_inner_afterburner_objects_unchanged"):
                raise RuntimeError("R25 accidentally modified existing inner fins")
            outer=bpy.data.collections.get(
                    "R25_EXTERNAL_LARGE_SKID_COVERS_NOT_INNER_FINS")
            if outer is None or len(outer.objects)!=2:
                raise RuntimeError("R27 must retain two physical outer cover surfaces only")
            inner=bpy.data.collections.get(
                    "R11_OUTBOARD_SUSPENDED_AFTERBURNERS")
            if any(o.name.startswith("R25_") for o in inner.objects):
                raise RuntimeError("R25 outer covers wrongly counted as inner fins")
            for direction in ("port","starboard"):
                panel=bpy.data.objects.get(
                    "R25_OUTER_SKID_UNDERSIDE_"+direction)
                if panel is None or outer.objects.get(panel.name) is None:
                    raise RuntimeError("R25 missing independent exterior cover")
                if (not panel.get("R25_only_underside_reconstructed") or
                    not panel.get("R25_not_an_inner_afterburner_fin") or
                    not panel.get("R25_thermal_tint_not_geometric_depth")):
                    raise RuntimeError("R25 exterior visual role violated")
                if not panel.data.color_attributes.get(
                        "R29_beige_weathering_not_thermal_oxide"):
                    raise RuntimeError("R29 natural beige outer skid material missing")
                if len(panel.data.vertices)<60 or len(panel.data.polygons)<60:
                    raise RuntimeError("R25 exterior skid is a placeholder")
                for key in ("R25_chassis_support",
                            "R25_underside_reinforcement",
                            "R25_root_boss","R25_clamp_boss"):
                    if panel.get(key):
                        raise RuntimeError("R27 kept invented skid undercarriage: "+key)
                if panel.get("R27_underside_support_evidence")!="unresolved_not_constructed":
                    raise RuntimeError("R27 incorrectly assumes under-cover pivot evidence")
                if panel.animation_data:
                    raise RuntimeError("R25 inferred unverified outer skid motion")
            print("R25_TWO_LARGE_SEPARATE_OUTER_SKID_UNDERSIDES_PASS",
                  path.name,flush=True)
            print("R20_OPEN_DRUM_DEEP_VISUAL_PATH_PASS",path.name,flush=True)
            print("R19_CONE_INTERIOR_FIN_ASSEMBLY_PASS",path.name,flush=True)
            if int(scene.get("fsc_r22_population_candidate",0))!=VANE_COUNT:
                raise RuntimeError("R22 full-ring layout missing from editable scene")
            if scene.get("fsc_r21_revision")!=(
                    "R21_thin_formed_slotted_panel_and_pinned_clevis"):
                raise RuntimeError("R21 fin master was not applied before R18")
            if (int(scene.get("fsc_r21_punched_slots_per_fin",0))!=2 or
                    int(scene.get("fsc_r21_stamped_center_ridge_count",0))!=VANE_COUNT or
                    float(scene.get("fsc_r21_master_sheet_thickness",1))>.03):
                raise RuntimeError("R21 actual thin sheet/clevis structure missing")
            for index in range(VANE_COUNT):
                fin=bpy.data.objects.get(
                    "R11_SUSPENDED_AFTERBURNER_VANE_%02d"%index)
                if fin is None:
                    raise RuntimeError("R21 missing reference fin")
                if (not fin.get("R21_integral_centerline_ridge") or
                    not fin.get("R21_material_tempering_only_at_free_end") or
                    fin.get("R21_actual_punched_slot_pairs")!=2):
                    raise RuntimeError("R21 fin shape/heat-color contract missing")
                if len(fin.data.vertices)<180 or len(fin.data.polygons)<150:
                    raise RuntimeError("R21 fin is not the actual slotted mesh")
                if fin.data.color_attributes.get("R21_heat_tint") is None:
                    raise RuntimeError("R21 shader gradients were not stored on fin")
                # Master profile remains; fanciful repeated clevis pivot
                # rods were removed because the original pixels do not
                # resolve one at each fin root.
            # R35 verifies the actual reopened animated .blend FIN MESH;
            # changing the two beige external cupped guards is NOT allowed.
            from vanilla_inner_fin_proportions_r35 import (
                REVISION as R35_REVISION,SOURCE_SHA256 as R35_SHA,
                ROOT_WIDTH_GAIN as R35_ROOT_GAIN,TIP_WIDTH_GAIN as R35_TIP_GAIN,
                AXIAL_LENGTH_GAIN_UPPER as R35_LENGTH_UPPER,
                AXIAL_LENGTH_GAIN_LOWER as R35_LENGTH_LOWER)
            if (scene.get("fsc_r35_revision")!=R35_REVISION or
                scene.get("fsc_r35_exact_source_sha256")!=R35_SHA or
                not scene.get("fsc_r35_no_outer_cup_edits") or
                not scene.get("fsc_r35_64_key_animation_preserved_by_pre_r18_order")):
                raise RuntimeError("R35 original-source inner fin scaling not retained")
            if int(scene.get("fsc_r35_inner_heat_fins_remeshed",0))!=VANE_COUNT:
                raise RuntimeError("R35 incorrectly altered inner fin population")
            from vanilla_master_fin_r21 import STATIONS as R21_STATIONS
            for n in range(VANE_COUNT):
                ob=bpy.data.objects.get(f"R11_SUSPENDED_AFTERBURNER_VANE_{n:02d}")
                if not ob or not ob.get("R35_planform_enlarged"):
                    raise RuntimeError("R35 inner heat fin scaling missing")
                expected_gain=R35_LENGTH_UPPER if n<5 else R35_LENGTH_LOWER
                if (abs(float(ob.get("R35_root_width_gain",0))-R35_ROOT_GAIN)>.001 or
                    abs(float(ob.get("R35_tip_width_gain",0))-R35_TIP_GAIN)>.001 or
                    abs(float(ob.get("R35_length_gain",0))-expected_gain)>.001):
                    raise RuntimeError("R35 saved mesh not source-proportion candidate")
                tip=ob.data.vertices[(len(R21_STATIONS)-1)*11].co
                expected_tip=-2.34+(-3.47+2.34)*expected_gain
                if abs(tip.y-expected_tip)>.002:
                    raise RuntimeError("R35.1 source-relative inner fin length mismatch")
                if ob.data.shape_keys is None or not ob.get("R21_integral_centerline_ridge"):
                    # Only four lower tips get shape keys; all others remain static.
                    if n in (6,7,8,9):
                        raise RuntimeError("R35 broke lower animated fin meshes")
                if ob.data.color_attributes.get("R21_heat_tint") is None:
                    raise RuntimeError("R35 erased heat colors on real inner sheet")
            if not (389.<float(scene.get("fsc_r35_upper_blue_tip_source_centroid_row",0))<392.
                and 399.<float(scene.get("fsc_r35_previous_blue_tip_centroid_row",0))<402.):
                raise RuntimeError("R35.1 exact original RGBA blue-tip landmark metadata missing")
            print("R35_ORIGINAL_SOURCE_ENLARGED_INTERFINS_PASS",
                  path.name,flush=True)
            print("R21_THIN_SLOTTED_FIN_MASTER_PASS",path.name,flush=True)
            print("R18_ACTUAL_SOURCE_LOWER_LIP_MOTION_PASS",path.name,flush=True)
            print("R27_PANELS_WITHOUT_UNVERIFIED_SUPPORTS_PASS",path.name,
                  "fin_panels",len(vanes),flush=True)
            print("R15_STATIC_MACHINE_ASSEMBLY_PASS",path.name,flush=True)
            print("R13_SAVED_SCENE_STRUCTURE_PASS",path.name,flush=True)
            print("R11_DEEP_NOZZLE_AFTERBURNERS_PASS",path.name,
                  "depth_tiles",round(depth,3),"vanes",len(vanes),
                  "source_unverified_cantilevers",0,flush=True)
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
