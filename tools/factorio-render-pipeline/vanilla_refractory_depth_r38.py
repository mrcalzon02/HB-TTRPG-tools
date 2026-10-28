"""R38: redistribute existing refractory depth and highlight topology.

The original 64-frame Factorio vanilla thruster body shows narrow long
refractory strakes visible farther into the OPEN throat, and uneven darker
scales near its lower/mouth edge. Actual R37.1 body PNG y395..500 has an
over-dark upper throat and uniform, too-bright lower scales. This pass
changes no object population, material names, camera, source art or lights:
it extends and tapers the original 40 Bezier strakes, shifts the original
80 R37 textured scales differentially along the bell, and reassigns ONLY
existing dark/aged material palettes to those same scales.

All geometry is a candidate inverse projection from original native RGBA.
No hidden CAD, pistons, end caps or additive glow is inferred.
"""
import math

REVISION="R38_source_depth_strakes_and_differential_scale_shading"
ORIGINAL_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
AXIS_Z=-.43
STRAKE_OLD_END_Y=-1.57
STRAKE_NEW_END_Y=-1.27
STRAKE_BEVEL=.022
MID_ROW_INSET=(0.,.004,.014,.015)
NEAR_RADIAL_RETURN=.010
NEAR_AGED_INDICES=(1,11,21,31)
MID_AGED_REMAINDERS=(0,1)
STRAKE_END_INSET=.038

def shifted_radius(point,shift):
    x,y,z=point
    old=math.hypot(x,z-AXIS_Z)
    if old<.13 or old+shift<.11 or old+shift>2:
        raise ValueError("R38 cannot cross or seal the original R11 bore")
    mul=(old+shift)/old
    return (x*mul,y,AXIS_Z+(z-AXIS_Z)*mul)

def extended_strake_endpoint(angle,radial):
    # Last original curve segment follows the actual R19 liner profile;
    # do not draw a straight support across the combustion bore.
    return (radial*math.cos(angle),STRAKE_NEW_END_Y,
            AXIS_Z+radial*math.sin(angle))

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    import bpy
    from vanilla_cone_interior_r19 import radius as liner_radius
    collection=bpy.data.collections.get("R19_EDITABLE_OPEN_CONE_INTERIOR")
    throat=bpy.data.objects.get("R11_OPEN_DEEP_REFRACTORY_THROAT")
    drum=bpy.data.objects.get("R08_aft_internal_reaction_drum")
    if collection is None or len(collection.objects)!=160:
        raise RuntimeError("R38 needs original 160 independent R19 pieces")
    if (throat is None or not throat.get("R11_open_no_endcaps") or
            drum is None or throat.data.materials[0] is not drum.data.materials[0]):
        raise RuntimeError("R38 cannot break R11 open bore/R13 shared refractory")
    dark=bpy.data.materials.get("R19_chipped_black_refractory")
    aged=bpy.data.materials.get("R19_inner_oxidized_shingles")
    if not dark or not aged or dark is aged:
        raise RuntimeError("R38 requires both original R19 physical materials")
    start_objects={o.name for o in scene.objects}
    fin_data={o.name:o.data.as_pointer() for o in scene.objects
              if o.name.startswith("R11_SUSPENDED_AFTERBURNER_VANE_")}
    guard_data={o.name:o.data.as_pointer() for o in scene.objects
                if o.name.startswith("R25_OUTER_SKID_UNDERSIDE_")}
    throat_polygons=len(throat.data.polygons)
    counters={"near":0,"mid":0,"strakes":0}
    for i in range(40):
        for kind in ("near","mid"):
            prefix=("R19_NEAR_MOUTH_TILE_" if kind=="near" else
                    "R19_MID_STAGGERED_TILE_")
            ob=collection.objects.get(prefix+f"{i:02d}")
            if ob is None or not ob.get("R37_source_refractory_center_corrugation"):
                raise RuntimeError("R38 requires existing R37 physical surface faceting")
            if len(ob.data.vertices)!=24 or ob.animation_data:
                raise RuntimeError("R38 source scale topology changed")
            original_faces=len(ob.data.polygons)
            for v_index,v in enumerate(ob.data.vertices):
                row=(v_index%12)//3
                shift=(NEAR_RADIAL_RETURN if kind=="near"
                       else -MID_ROW_INSET[row])
                v.co=shifted_radius(v.co,shift)
            ob.data.update()
            if len(ob.data.polygons)!=original_faces:
                raise RuntimeError("R38 altered original closed refractory scales")
            material=(aged if (i in NEAR_AGED_INDICES if kind=="near"
                              else i%5 in MID_AGED_REMAINDERS) else dark)
            ob.data.materials[0]=material
            ob["R38_existing_axial_scale_rebalanced"]=kind
            ob["R38_existing_material_reused"]=material.name
            counters[kind]+=1
        ob=collection.objects.get(f"R19_DEEP_COMBUSTOR_STRAKE_{i:02d}")
        if ob is None or ob.type!="CURVE" or len(ob.data.splines)!=1:
            raise RuntimeError("R38 original deep longitudinal strake missing")
        curve=ob.data
        spline=curve.splines[0]
        if spline.type!="BEZIER" or len(spline.bezier_points)!=4:
            raise RuntimeError("R38 unexpected source-derived four point spline")
        if abs(spline.bezier_points[-1].co.y-STRAKE_OLD_END_Y)>.002:
            raise RuntimeError("R38 baseline distal strake endpoint not present")
        p0=spline.bezier_points[-1]
        old=p0.co
        angle=math.atan2(old.z-AXIS_Z,old.x)
        p0.co=extended_strake_endpoint(
            angle,liner_radius(STRAKE_NEW_END_Y)-STRAKE_END_INSET)
        for bp in spline.bezier_points:
            bp.handle_left_type="AUTO"
            bp.handle_right_type="AUTO"
        curve.bevel_depth=STRAKE_BEVEL
        for j,bp in enumerate(spline.bezier_points):
            bp.radius=(.78,1.0,.95,.68)[j]
        ob["R38_long_refractory_strake"]=True
        ob["R38_original_curve_not_duplicate"]=True
        ob["R38_new_end_y"]=STRAKE_NEW_END_Y
        counters["strakes"]+=1
    if counters!={"near":40,"mid":40,"strakes":40}:
        raise RuntimeError("R38 source refractory detail count changed")
    if {o.name for o in scene.objects}!=start_objects:
        raise RuntimeError("R38 invented new nozzle parts")
    if len(throat.data.polygons)!=throat_polygons:
        raise RuntimeError("R38 sealed the open axial throat")
    if any(bpy.data.objects[n].data.as_pointer()!=ptr
           for n,ptr in {**fin_data,**guard_data}.items()):
        raise RuntimeError("R38 altered R35.1 fins or R36 moving cupped guards")
    scene["fsc_r38_revision"]=REVISION
    scene["fsc_r38_original_sprite_sha256"]=ORIGINAL_SHA256
    scene["fsc_r38_reused_near_tiles"]=40
    scene["fsc_r38_reused_mid_tiles"]=40
    scene["fsc_r38_extended_original_strakes"]=40
    scene["fsc_r38_new_end_y"]=STRAKE_NEW_END_Y
    scene["fsc_r38_existing_dark_aged_materials_only"]=True
    scene["fsc_r38_no_original_pixels_stored"]=True
    scene["fsc_r38_original_open_bore_and_shared_material"]=True
    scene["fsc_r38_no_camera_or_light_changes"]=True
    scene["fsc_r38_unverified_candidate_requires_render"]=True
