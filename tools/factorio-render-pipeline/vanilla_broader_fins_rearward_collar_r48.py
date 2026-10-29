"""R48: widen source-visible R21 formed heat sheets; retreat forward throat collar.

Measured after actual successful R47 GitHub Blender captures:
  - R47 extends upper sheets far into the mouth but their projected surface
    width stays narrower than the original sprite's three broad tabs.
  - A distracting intermediate circular arc still crosses the aperture at
    the forward lip line. R47 moved the R04 lip and R45 _01 baffle already;
    this revision moves only the original R11 _00 forward baffle aft.
Do not expand the already overlong distal sheets axially; preserve root Y,
R18 lower 64-frame motion, the same R21 punched-slot faces, source pigments,
R42/R47 open bell, R36 two independent cupped shells and calibrated camera.
No new faces/objects, hinge claims, effect or image-plane substitutions.
"""
import math

REVISION="R48_broad_source_fins_rearward_existing_forward_collar"
SOURCE_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
FIN_COLLECTION="R11_OUTBOARD_SUSPENDED_AFTERBURNERS"
VISIBLE_FIN_COUNT=5
MAIN_FINS=(1,2,3)
PERIPHERAL_FINS=(0,4)
FIN_ROOT_Y=-2.34
MAIN_FIN_TIP_WIDTH_MULTIPLIER=1.47
PERIPHERAL_FIN_TIP_WIDTH_MULTIPLIER=1.22
MAX_FIN_HALF_ANGLE=.31  # less than the .31416 half-pitch of ten slots
FORWARD_COLLAR="R11_recessed_internal_pressure_baffle_00"
COLLAR_OLD_Y=-2.99
COLLAR_NEW_Y=-3.61
COLLAR_OLD_MAJOR_R=1.25
COLLAR_NEW_MAJOR_R=1.385
COLLAR_NEW_MATERIAL="R13_oxidized_rough_nozzle_shell"
AXIS_Z=-.43
RING_SECTORS=40
RING_TUBE_STEPS=8

def width_multiplier(progress,fin_index):
    """Preserve physical root crosshead, open the source-visible metal face."""
    if fin_index not in MAIN_FINS+PERIPHERAL_FINS:
        raise ValueError("R48 is not allowed to resize animated lower source fins")
    p=max(0.,min(1.,progress))
    smooth=p*p*(3.-2.*p)
    target=(MAIN_FIN_TIP_WIDTH_MULTIPLIER if fin_index in MAIN_FINS
            else PERIPHERAL_FIN_TIP_WIDTH_MULTIPLIER)
    return 1.+(target-1.)*smooth

def widen_existing_point(point,theta,fin_index,old_tip_y):
    x,y,z=point
    r=math.hypot(x,z-AXIS_Z)
    if r<.2 or abs(FIN_ROOT_Y-old_tip_y)<.3:
        raise ValueError("R48 invalid original radial sheet coordinates")
    d=(math.atan2(z-AXIS_Z,x)-theta+math.pi)%(2.*math.pi)-math.pi
    progress=(FIN_ROOT_Y-y)/(FIN_ROOT_Y-old_tip_y)
    new_delta=d*width_multiplier(progress,fin_index)
    if abs(new_delta)>MAX_FIN_HALF_ANGLE:
        raise ValueError("R48 fin would overlap its neighboring source tab")
    angle=theta+new_delta
    return (r*math.cos(angle),y,AXIS_Z+r*math.sin(angle))

def apply_fins(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    import bpy
    from vanilla_deep_aperture_and_long_fins_r47 import (
        REVISION as R47_REV,UPPER_LENGTH_MULTIPLIER)
    from vane_layout_r22 import VANE_COUNT
    if (scene.get("fsc_r47_revision") is not None or
        not scene.get("fsc_r47_fin_root_fixed") or
        scene.get("fsc_r18_revision") is not None):
        raise RuntimeError("R48 requires R47 fin extension, before R18 shape keys")
    if abs(UPPER_LENGTH_MULTIPLIER-1.90)>.0001 or VANE_COUNT!=10:
        raise RuntimeError("R48 refuses unverified changed 64-frame fin layout")
    col=bpy.data.collections.get(FIN_COLLECTION)
    if col is None:
        raise RuntimeError("R48 original R21 fin collection missing")
    objects={o.name for o in scene.objects}
    mats=set(bpy.data.materials.keys())
    fin_pointers={}
    modified=[]
    for i in range(VANE_COUNT):
        ob=col.objects.get(f"R11_SUSPENDED_AFTERBURNER_VANE_{i:02d}")
        if (ob is None or not ob.get("R47_extended_original_upper_sheet")==(i<VISIBLE_FIN_COUNT)
            or len(ob.data.vertices)!=220 or ob.data.shape_keys is not None
            or ob.animation_data or
            ob.data.color_attributes.get("R21_heat_tint") is None
            or ob.get("R21_actual_punched_slot_pairs")!=2):
            raise RuntimeError("R48 wrong original slotted thermal fin stage")
        fin_pointers[ob.name]=(ob.data.as_pointer(),len(ob.data.polygons),
                               tuple(m.as_pointer() for m in ob.data.materials))
        if i>=VISIBLE_FIN_COUNT:
            continue
        theta=math.tau*(i+.5)/VANE_COUNT
        old_tip_y=ob.data.vertices[9*11].co.y
        if (abs(ob.data.vertices[0].co.y-FIN_ROOT_Y)>.002 or
            old_tip_y>=-4.3):
            raise RuntimeError("R48 prior long R47 sheet not present")
        for v in ob.data.vertices:
            v.co=widen_existing_point(tuple(v.co),theta,i,old_tip_y)
        ob.data.update()
        ob["R48_existing_formed_metal_face_widened"]=True
        ob["R48_local_tip_width_multiplier"]=(
            MAIN_FIN_TIP_WIDTH_MULTIPLIER if i in MAIN_FINS
            else PERIPHERAL_FIN_TIP_WIDTH_MULTIPLIER)
        ob["R48_axial_root_and_tip_unchanged"]=True
        modified.append(i)
    if modified!=[0,1,2,3,4] or objects!={o.name for o in scene.objects}:
        raise RuntimeError("R48 changed the source fin population")
    if set(bpy.data.materials.keys())!=mats:
        raise RuntimeError("R48 added source-unverified fin material")
    for label,sig in fin_pointers.items():
        ob=col.objects[label]
        if (ob.data.as_pointer(),len(ob.data.polygons),
            tuple(m.as_pointer() for m in ob.data.materials))!=sig:
            raise RuntimeError("R48 damaged original punched slots/material IDs")
    scene["fsc_r48_fins_widened"]=len(modified)
    scene["fsc_r48_visible_main_fin_tip_width_gain"]=MAIN_FIN_TIP_WIDTH_MULTIPLIER
    scene["fsc_r48_visible_peripheral_fin_tip_width_gain"]=PERIPHERAL_FIN_TIP_WIDTH_MULTIPLIER
    scene["fsc_r48_preserves_upper_fin_length"]=True
    scene["fsc_r48_preserves_lower_original_motion"]=True

def apply_collar(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    import bpy
    from vanilla_deep_aperture_and_long_fins_r47 import REVISION as R47_REV
    if scene.get("fsc_r47_revision")!=R47_REV or not scene.get("fsc_r48_fins_widened"):
        raise RuntimeError("R48 must follow fully assembled R47 open nozzle")
    before={o.name for o in scene.objects}
    mats=set(bpy.data.materials.keys())
    ob=bpy.data.objects.get(FORWARD_COLLAR)
    mat=bpy.data.materials.get(COLLAR_NEW_MATERIAL)
    liner=bpy.data.objects.get("R11_OPEN_DEEP_REFRACTORY_THROAT")
    lip=bpy.data.objects.get("vanilla_reference_bell_rolled_lip")
    if (ob is None or ob.parent!=root or ob.type!="MESH" or mat is None or
        liner is None or lip is None or not liner.get("R11_open_no_endcaps") or
        len(ob.data.vertices)!=RING_SECTORS*RING_TUBE_STEPS or
        len(ob.data.polygons)!=RING_SECTORS*RING_TUBE_STEPS or
        ob.animation_data or ob.data.shape_keys):
        raise RuntimeError("R48 missing original movable forward aperture collar")
    old_pointer=ob.data.as_pointer()
    y=(max(v.co.y for v in ob.data.vertices)+min(v.co.y for v in ob.data.vertices))/2.
    if abs(y-COLLAR_OLD_Y)>.003:
        raise RuntimeError("R48 original forward collar was already moved")
    preserve={
      "liner_pointer":liner.data.as_pointer(),
      "lip_pointer":lip.data.as_pointer(),
      "liner_faces":len(liner.data.polygons),
      "lip_faces":len(lip.data.polygons),
      "fin_shapes":tuple(
          (label,len(bpy.data.objects[label].data.shape_keys.key_blocks)
           if bpy.data.objects[label].data.shape_keys else 0)
          for label in [f"R11_SUSPENDED_AFTERBURNER_VANE_{i:02d}" for i in range(10)])
    }
    for v in ob.data.vertices:
        x,y,z=tuple(v.co)
        radius=math.hypot(x,z-AXIS_Z)
        if abs(radius-COLLAR_OLD_MAJOR_R)>.04:
            raise RuntimeError("R48 unexpected original circular collar radius")
        new_r=radius+COLLAR_NEW_MAJOR_R-COLLAR_OLD_MAJOR_R
        factor=new_r/radius
        v.co=(x*factor,y+(COLLAR_NEW_Y-COLLAR_OLD_Y),
              AXIS_Z+(z-AXIS_Z)*factor)
    ob.data.update()
    ob.data.materials[0]=mat
    ob["R48_original_collaring_recessed_behind_source_side_cuts"]=True
    ob["R48_original_baffle_00_not_extra_ring"]=True
    if (ob.data.as_pointer()!=old_pointer or
        set(bpy.data.materials.keys())!=mats or
        {o.name for o in scene.objects}!=before or
        liner.data.as_pointer()!=preserve["liner_pointer"] or
        lip.data.as_pointer()!=preserve["lip_pointer"] or
        len(liner.data.polygons)!=preserve["liner_faces"] or
        len(lip.data.polygons)!=preserve["lip_faces"]):
        raise RuntimeError("R48 did not preserve existing open bell/torus")
    scene["fsc_r48_revision"]=REVISION
    scene["fsc_r48_source_sha256"]=SOURCE_SHA256
    scene["fsc_r48_recessed_forward_ring_new_y"]=COLLAR_NEW_Y
    scene["fsc_r48_original_ring_uses_existing_dark_shell"]=True
    scene["fsc_r48_no_added_models_materials_cameras_lights_or_effects"]=True
    scene["fsc_r48_original_64_frame_cycle_retained"]=True
    scene["fsc_r48_pending_pixel_acceptance"]=True
