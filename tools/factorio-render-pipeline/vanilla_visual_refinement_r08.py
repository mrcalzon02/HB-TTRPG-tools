"""R08 reference-driven refinement: vanilla thruster benchmark ONLY.

The official 300x300 wiki in-game animation shows a dark, heavily machined,
multi-system thruster, not a clean single silver cylinder. This module adds
a visible hierarchy of shadowed pressure modules, opposing injector systems,
cast central heat shields and a heavy armored aft nozzle housing.

All geometry is an independent approximation. Never embed/copy original
Factorio artwork into the distributable Blender source.
"""
import bpy
import math

REFERENCE="https://wiki.factorio.com/File:Thruster_entity_anim.gif"

def _mat(name,color,metal=.5,rough=.55,emit=0):
    mat=bpy.data.materials.new(name)
    mat.diffuse_color=(*color,1)
    mat.use_nodes=True
    bs=mat.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value=(*color,1)
    bs.inputs["Metallic"].default_value=metal
    bs.inputs["Roughness"].default_value=rough
    if emit:
        bs.inputs["Emission Color"].default_value=(*color,1)
        bs.inputs["Emission Strength"].default_value=emit
    return mat

def _darken_previous_materials(p):
    factors={"steel":.40,"iron":.63,"ceramic":.47,"copper":.72,
             "brass":.68,"dark":.88}
    for name,factor in factors.items():
        mat=p[name]
        nt=mat.node_tree
        if not nt:continue
        ramp=next((x for x in nt.nodes if x.type=="VALTORGB"),None)
        if ramp:
            for element in ramp.color_ramp.elements:
                c=element.color
                element.color=(c[0]*factor,c[1]*factor,c[2]*factor,c[3])
        else:
            bs=nt.nodes.get("Principled BSDF")
            if bs:
                c=bs.inputs["Base Color"].default_value
                bs.inputs["Base Color"].default_value=(c[0]*factor,c[1]*factor,c[2]*factor,1)

def apply(name,root,p,api,scene):
    """The benchmark remains a 4x4.75 mount inside a 4x8 selection/render region."""
    if not name.startswith("test-04-vanilla-approx"):return
    _darken_previous_materials(p)
    steel=_mat("R08_black_steel",(.075,.078,.080),.57,.64)
    bronze=_mat("R08_red_brown_pressure_alloy",(.23,.083,.041),.62,.52)
    aged=_mat("R08_cast_heat_shield",(.22,.21,.18),.37,.71)
    dark=_mat("R08_jet_bell_oxidized_titanium",(.04,.045,.055),.49,.64)
    red=_mat("R08_incandescent_vent",(.76,.082,.022),.15,.58,0.25)
    cable=_mat("R08_black_rubber_feed",(.049,.055,.063),.1,.72)
    bright=p["brass"]
    tube=api["tube"];lathe=api["lathe"];ring=api["ring"]
    cast=api["cast_panel"];ellipsoid=api["ellipsoid"]

    # PAIRED OVERLAPPING PRESSURE MACHINERY, replacing the featureless capsule.
    # Each side has its own joined chamber, thermal ribs, injector and valve.
    for side in (-1,1):
        x=side*1.13
        lathe("R08_parallel_pressure_bottle_side_%s"%side,
              [(1.63,.22),(1.39,.37),(.95,.43),(.53,.39),
               (.15,.39),(-.41,.44),(-.72,.30),(-.91,.20)],
              x,-.11,bronze,root)
        for yy,r in ((1.35,.38),(.79,.45),(.32,.43),(-.33,.47),(-.64,.38)):
            ring("R08_subchamber_cast_band",x,yy,-.11,r,steel,root,.067)
        # Real pipe routing has functional support and a joined fuel inlet.
        tube("R08_primary_heat_exchanger_"+str(side),
             [(side*1.61,1.55,-.14),(side*1.42,1.16,.06),
              (side*1.37,.54,.37),(side*1.15,-.19,.35),
              (side*.90,-.69,-.20)],.102,bronze,root)
        for y,z in ((1.04,.11),(.37,.37),(-.34,.28)):
            ring("R08_feed_pipe_saddle",side*1.39,y,z,.15,bright,root,.041)
        # Paired top-vent oxidizer and fuel lamps; red/blue explicitly mapped.
        for y in (1.19,.02):
            ellipsoid("R08_blue_energy_coupler",
                      (side*1.44,y,.38),(.18,.20,.13),p["blue"],root)
            ellipsoid("R08_steel_valve_cage",
                      (side*1.47,y,.26),(.23,.24,.13),steel,root)
        # Heavy x-wrapped structural gusset along rear nozzle attachment.
        cast("R08_knee_guard",[(side*.84,-1.02),(side*1.52,-1.12),
             (side*1.58,-1.79),(side*1.11,-2.21),
             (side*.66,-1.72)],-.29,.29,aged,root,.085)
        # Supporting black cables in the recess, not loose loops in the air.
        tube("R08_recessed_injection_line_"+str(side),
             [(side*1.38,1.55,-.18),(side*1.44,.93,-.38),
              (side*1.27,.02,-.46),(side*.95,-1.32,-.47)],
             .063,cable,root)

    # Segmented top reactor cover: tough irregular castings with visible gaps.
    for i in range(8):
        yc=1.54-i*.33
        cast("R08_centerline_black_pressure_shield_%02d"%i,
             [(-.51,yc+.085),(.49,yc+.085),(.56,yc-.11),
              (.22,yc-.19),(-.30,yc-.17),(-.59,yc-.05)],
             .36,.12,dark if i%2 else aged,root,.037)
        for xx in (-.33,.31):
            ellipsoid("R08_bolted_reactor_armor",(xx,yc-.025,.51),
                      (.050,.052,.034),bronze,root)
    # Live thermal channels visibly occupy gaps between the heavy heat plates.
    for i in range(7):
        y=1.38-i*.33
        ellipsoid("R08_reactor_thermal_window",(0,y,.46),
                  (.19,.062,.050),p["orange"],root)

    # High-value graphic: deep multi-section exhaust nozzle secured by
    # a dark, heavy cast ring and rows of rim fasteners.
    lathe("R08_aft_internal_reaction_drum",
          [(-1.30,.48),(-1.62,.74),(-1.91,.88),
           (-2.18,1.08),(-2.38,1.24),(-2.48,1.38)],
          0,-.43,steel,root)
    for yy,rad in ((-1.87,.97),(-2.20,1.15),(-2.39,1.35),(-2.59,1.50)):
        ring("R08_black_exhaust_pressure_roll",0,yy,-.43,rad,dark,root,.096)
    for i in range(16):
        angle=i*math.tau/16
        ellipsoid("R08_rolled_nozzle_rivet",
                  (1.43*math.cos(angle),-2.60,
                   -.43+1.43*math.sin(angle)),
                  (.045,.038,.045),bright,root)
    # Flared structural fairings surround the bell without blocking the throat.
    for side in (-1,1):
        cast("R08_aft_shroud_wing_"+str(side),
             [(side*.72,-1.63),(side*1.43,-1.75),
              (side*1.59,-2.28),(side*1.51,-2.55),
              (side*.94,-2.31)],-.45,.28,steel,root,.075)

    scene["fsc_reference_visual_pass"]="R08_blackened_segmented_furnace_with_supported_side_machinery"
    scene["fsc_reference_visual_source"]=REFERENCE
    scene["fsc_reference_visual_claim"]="qualitative original-inspired approximation, not matched raw sprite"
