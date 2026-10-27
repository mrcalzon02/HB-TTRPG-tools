"""R35: source-led planform enlargement of INNER hanging thermal fins.

The exact user's original vanilla thruster.zip (SHA below) shows the
three prominent inward-hanging heated tabs with visibly broader end faces
than our R33.2 264x542 registered Blender body image. This pass enlarges
ONLY the existing R21 slotted FIN mesh, around its own existing attachment
coordinate. It is intentionally applied AFTER R21 and BEFORE the R18
64-frame distal morph keys are authored.

This does NOT enlarge the two external beige cupped clamshells, move their
tips, create a pivot/hinge, add unsupported hardware, or assert ten fins
are the exact unseen original part count.
"""
import math

REVISION="R35_1_source_matched_upper_blue_fin_ratio"
SOURCE_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
ROOT_Y=-2.34
BELL_CENTRE_Z=-.43
BASE_TIP_Y=-3.47
ROOT_WIDTH_GAIN=1.16
TIP_WIDTH_GAIN=1.65
AXIAL_LENGTH_GAIN_UPPER=.98
AXIAL_LENGTH_GAIN_LOWER=1.10
SOURCE_VISIBLE_UPPER_GROUP_COUNT=3

def length_gain(theta):
    # Source-facing upper fins became too LONG in R35 (blue-tip row400).
    # Preserve lower source-observed moving fins' extra aft reach.
    return AXIAL_LENGTH_GAIN_UPPER if math.sin(theta)>0 else AXIAL_LENGTH_GAIN_LOWER

def resize_vertex(point, theta):
    x,y,z=point
    distance=min(1.0,max(0.0,(ROOT_Y-y)/(ROOT_Y-BASE_TIP_Y)))
    # Source frame00 shows broad hanging heat-tab tips; the attachment end
    # should remain seated within the already-supported R21 crosshead.
    gain=ROOT_WIDTH_GAIN+(TIP_WIDTH_GAIN-ROOT_WIDTH_GAIN)*distance
    phase=math.atan2(z-BELL_CENTRE_Z,x)
    delta=(phase-theta+math.pi)%(2*math.pi)-math.pi
    r=math.hypot(x,z-BELL_CENTRE_Z)
    angle=theta+delta*gain
    return (r*math.cos(angle),
            ROOT_Y+(y-ROOT_Y)*length_gain(theta),
            BELL_CENTRE_Z+r*math.sin(angle))

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    import bpy
    from vane_layout_r22 import VANE_COUNT
    from vanilla_master_fin_r21 import STATIONS
    fins=bpy.data.collections.get("R11_OUTBOARD_SUSPENDED_AFTERBURNERS")
    if fins is None:
        raise RuntimeError("R35 missing source-identifiable inner thermal fins")
    before={obj.name for obj in scene.objects}
    signature={}
    for n in range(VANE_COUNT):
        obj=fins.objects.get(f"R11_SUSPENDED_AFTERBURNER_VANE_{n:02d}")
        if obj is None or not obj.get("R21_integral_centerline_ridge"):
            raise RuntimeError("R35 only remeshes existing punched R21 fin sheets")
        if obj.data.shape_keys is not None or obj.animation_data:
            raise RuntimeError("R35 must precede R18 source 64-key animation")
        if obj.get("R35_planform_enlarged"):
            raise RuntimeError("R35 double scaled a heat fin")
        signature[obj.name]=(len(obj.data.vertices),len(obj.data.polygons),
                             tuple(m.name for m in obj.data.materials))
        theta=math.tau*(n+.5)/VANE_COUNT
        for v in obj.data.vertices:
            v.co=resize_vertex(v.co,theta)
        obj.data.update()
        col=len(STATIONS)-1
        count=11
        a=obj.data.vertices[col*count+0].co
        b=obj.data.vertices[col*count+count-1].co
        half=abs((math.atan2(a.z-BELL_CENTRE_Z,a.x)
             -math.atan2(b.z-BELL_CENTRE_Z,b.x)+math.pi)
                 %(math.tau)-math.pi)/2
        if not abs(half-STATIONS[-1][2]*TIP_WIDTH_GAIN)<.002:
            raise RuntimeError("R35 actual source-facing tip span was not enlarged")
        if not abs(a.y-(ROOT_Y+(BASE_TIP_Y-ROOT_Y)*length_gain(theta)))<.001:
            raise RuntimeError("R35 actual distal sheet was not lengthened")
        if len(obj.data.vertices)!=signature[obj.name][0] or (
            len(obj.data.polygons)!=signature[obj.name][1] or
            tuple(m.name for m in obj.data.materials)!=signature[obj.name][2]):
            raise RuntimeError("R35 destroyed R21 slots/material topology")
        obj["R35_planform_enlarged"]=True
        obj["R35_root_width_gain"]=ROOT_WIDTH_GAIN
        obj["R35_tip_width_gain"]=TIP_WIDTH_GAIN
        obj["R35_length_gain"]=length_gain(theta)
        obj["R35_upper_facing_fin"]=bool(math.sin(theta)>0)
        obj["R35_original_source_role"]="interior hanging heat shield"
        obj["R35_original_hidden_fin_population_unverified"]=True
    if before!={obj.name for obj in scene.objects}:
        raise RuntimeError("R35 introduced unsupported visible parts")
    scene["fsc_r35_revision"]=REVISION
    scene["fsc_r35_exact_source_sha256"]=SOURCE_SHA256
    scene["fsc_r35_inner_heat_fins_remeshed"]=VANE_COUNT
    scene["fsc_r35_unchanged_object_population"]=True
    scene["fsc_r35_no_outer_cup_edits"]=True
    scene["fsc_r35_64_key_animation_preserved_by_pre_r18_order"]=True
    scene["fsc_r35_original_upper_heat_tab_groups"]=SOURCE_VISIBLE_UPPER_GROUP_COUNT
    scene["fsc_r35_proportion_hypothesis_not_source_cad"]=True
    scene["fsc_r35_upper_blue_tip_source_centroid_row"]=390.3
    scene["fsc_r35_previous_blue_tip_centroid_row"]=400.1
