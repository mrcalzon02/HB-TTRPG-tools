"""R31: deeper source-constrained cupped protective lower shells.

Source evidence: the user-provided Space Age thruster's original 64-frame
body sprite (264x542), archive SHA listed below. Its two peripheral shells
turn under the bell and taper inward at their aft tips. The last R29.2 mesh
was radial but had only a shallow sagitta, rendering as a flat hanging plane.

Edit ONLY the existing two R25 meshes after R29 has assigned the correctly
unheated beige material. No new hardware, hidden supports, fin edits, or
unverified outer-shell keyframes. Control values are inverse-projection
hypotheses requiring comparison with real saved Blender PNGs.
"""
import math

REVISION="R31_cupped_radial_shell_with_returned_aft_lips"
SOURCE_ARCHIVE_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
CUP_RADIAL_BULGE=.44
INNER_RIM_RETURN=.18
TAIL_INSET=(0.,0.,0.,0.,0.,.02,.09,.16)
TAIL_FORWARD=(0.,0.,0.,0.,0.,.02,.08,.16)
TAIL_ROLL=(0.,0.,0.,0.,0.,1.5,4.,7.)
# The R29 8x9x2 topology and R16 physical beige material are retained.
def point(station,u,side,skin,row):
    from vanilla_beige_radial_skids_r29 import (
        BELLCENTER_Z,SHEET_THICKNESS,OUTER_LIP_FLARE)
    y,r,outer,inner=station
    theta=math.radians(outer+(inner-outer)*u+TAIL_ROLL[row]*u)
    radius=(r+OUTER_LIP_FLARE*(1-u)**2
            +CUP_RADIAL_BULGE*math.sin(math.pi*u)**2
            -INNER_RIM_RETURN*u*u-TAIL_INSET[row]
            +skin*SHEET_THICKNESS/2)
    return (side*radius*math.cos(theta),
            y+TAIL_FORWARD[row],
            BELLCENTER_Z-radius*math.sin(theta))

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    import bpy
    from vanilla_beige_radial_skids_r29 import (
        STATIONS,CIRCUMFERENCE_SAMPLES,SOURCE_MATERIAL_NAME)
    outer=bpy.data.collections.get(
        "R25_EXTERNAL_LARGE_SKID_COVERS_NOT_INNER_FINS")
    inner=bpy.data.collections.get("R11_OUTBOARD_SUSPENDED_AFTERBURNERS")
    if outer is None or len(outer.objects)!=2 or inner is None:
        raise RuntimeError("R31 requires two existing R29 beige shells")
    def signature(ob):
        return (len(ob.data.vertices),len(ob.data.polygons),
                bool(ob.data.shape_keys),bool(ob.animation_data))
    protected={ob.name:signature(ob) for ob in inner.objects
               if ob.name.startswith("R11_SUSPENDED_AFTERBURNER_VANE_")}
    old_objects=set(obj.name for obj in scene.objects)
    half=len(STATIONS)*len(CIRCUMFERENCE_SAMPLES)
    for side,sign in (("port",-1),("starboard",1)):
        ob=outer.objects.get("R25_OUTER_SKID_UNDERSIDE_"+side)
        if ob is None or not ob.get("R29_bell_radial_wrap"):
            raise RuntimeError("R31 cannot locate source-constrained R29 outer shell")
        if ob.animation_data or len(ob.data.vertices)!=2*half:
            raise RuntimeError("R31 unexpected geometry or invented shell motion")
        if ob.data.materials[0].get("source_heat_tint",False):
            raise RuntimeError("R31 may not heat-color the unburnt protective cup")
        for skin_index,skin in enumerate((-1,1)):
            for row,st in enumerate(STATIONS):
                for col,u in enumerate(CIRCUMFERENCE_SAMPLES):
                    index=skin_index*half+row*len(CIRCUMFERENCE_SAMPLES)+col
                    ob.data.vertices[index].co=point(st,u,sign,skin,row)
        ob.data.update()
        row=3
        samples=[ob.data.vertices[half+row*9+j].co for j in (0,4,8)]
        outer_lip,belly,inner_lip=samples
        if not belly.z<min(outer_lip.z,inner_lip.z)-.10:
            raise RuntimeError("R31 shell has insufficient bowl concavity")
        if abs(inner_lip.x)>=abs(outer_lip.x)-.6:
            raise RuntimeError("R31 inner returned edge does not shelter fin circumference")
        if max(v.co.z for v in ob.data.vertices)>-1.1:
            raise RuntimeError("R31 outer covering rose above the lower nozzle")
        ob["R31_cupped_bowl_not_global_plane"]=True
        ob["R31_lower_belly_sag_tiles"]=round(
            float(min(outer_lip.z,inner_lip.z)-belly.z),5)
        ob["R31_returned_inner_lip"]=True
        ob["R31_source_64_frames_not_shell_rig_proof"]=True
        ob["R31_no_extra_visible_parts"]=True
        ob["R31_beige_material_preserved"]=SOURCE_MATERIAL_NAME
    if old_objects!={obj.name for obj in scene.objects}:
        raise RuntimeError("R31 added unsupported objects")
    if any(signature(bpy.data.objects[n])!=sig for n,sig in protected.items()):
        raise RuntimeError("R31 changed source-animated internal fin geometry or rig")
    scene["fsc_r31_revision"]=REVISION
    scene["fsc_r31_original_source_archive_sha256"]=SOURCE_ARCHIVE_SHA256
    scene["fsc_r31_cup_belly_radial_bulge"]=CUP_RADIAL_BULGE
    scene["fsc_r31_tip_curled_y"]=TAIL_FORWARD[-1]
    scene["fsc_r31_preserves_r18_64_frame_fin_motion"]=True
    scene["fsc_r31_inference_not_actual_source_cad"]=True
    scene["fsc_r31_outer_shell_stationary_until_evidence"]=True
