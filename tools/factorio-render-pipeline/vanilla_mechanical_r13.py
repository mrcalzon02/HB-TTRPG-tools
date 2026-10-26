"""R13: reference-constrained vanilla thruster crown and nozzle refinement.

Only the calibration benchmark changes. R12 vanilla source measurements show
almost no upper-housing silhouette motion; do not invent a moving piston.
Original Factorio bitmaps must never be embedded in this module.
"""
import bpy

REVISION="R13_joined_pressure_trunk_refractory"

def _material(name, color, metallic, roughness):
    m=bpy.data.materials.new(name)
    m.use_nodes=True
    m.diffuse_color=(*color,1)
    shader=m.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value=(*color,1)
    shader.inputs["Metallic"].default_value=metallic
    shader.inputs["Roughness"].default_value=roughness
    return m

def _rematerial(scene, label, material):
    ob=scene.objects.get(label)
    if ob is None or ob.type!="MESH" or not ob.data.materials:
        raise RuntimeError("R13 missing reference mesh: "+label)
    ob.data.materials[0]=material

def apply(name, root, p, api, scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    # Remove the repeated equal-spaced pressure 'keyboard', NOT structural
    # bell petals or any custom Tech Priests thruster meshes.
    prefixes={
       "R08_centerline_black_pressure_shield_":8,
       "R08_reactor_thermal_window":7,
       "R08_bolted_reactor_armor":16
    }
    for prefix, count in prefixes.items():
        old=[o for o in list(scene.objects)
             if o.parent==root and o.name.startswith(prefix)]
        if len(old)!=count:
            raise RuntimeError("R13 expected %s %d, found %d" % (prefix,count,len(old)))
        for ob in old:
            bpy.data.objects.remove(ob,do_unlink=True)

    refractory=_material("R13_scorched_nonreflective_refractory",
                         (.013,.017,.022),.13,.94)
    shell=_material("R13_oxidized_rough_nozzle_shell",
                    (.060,.064,.067),.42,.82)
    cast_iron=_material("R13_dark_valve_body_casting",
                        (.047,.052,.055),.47,.77)
    copper=_material("R13_heat_aged_pressure_alloy",
                     (.128,.100,.083),.56,.67)
    _rematerial(scene,"R11_OPEN_DEEP_REFRACTORY_THROAT",refractory)
    _rematerial(scene,"R08_aft_internal_reaction_drum",refractory)
    _rematerial(scene,"vanilla_reference_bell_bronzed_rolled_bell",shell)
    for ob in scene.objects:
        if ob.name.startswith("R11_recessed_internal_pressure_baffle_"):
            if not ob.data.materials:
                raise RuntimeError("R13 unshaded nozzle baffle")
            ob.data.materials[0]=copper

    tube=api["tube"]
    lathe=api["lathe"]
    ring=api["ring"]
    cast=api["cast_panel"]
    ellipsoid=api["ellipsoid"]

    # Continuous axial manifold, two offset accumulator/valve chambers.
    # All piping ends at named chamber fittings, not free-floating corners.
    lathe("R13_axial_pressure_trunk",
          [(-1.18,.19),(-.96,.27),(-.54,.31),(-.12,.27),
           (.34,.32),(.73,.28),(1.07,.24),(1.45,.17)],
          .07,.32,cast_iron,root)
    lathe("R13_port_pressure_accumulator",
          [(-.97,.13),(-.72,.25),(-.20,.28),(.11,.22),(.42,.14)],
          -.47,.37,copper,root)
    lathe("R13_starboard_oxidizer_chamber",
          [(-.48,.11),(-.20,.21),(.14,.24),(.55,.24),(.85,.14)],
          .52,.38,cast_iron,root)

    # Three DIFFERENT joined heavy covers replace 8 evenly spaced bars.
    covers=[
      ("R13_forward_chamber_guard",
       [(-.39,1.30),(.33,1.38),(.52,1.09),(.33,.91),
        (-.16,.96),(-.50,1.08)],.53,.14,cast_iron),
      ("R13_offset_pressure_shroud",
       [(-.85,.49),(-.40,.69),(-.11,.40),(-.20,.02),
        (-.65,-.09),(-.79,.16)],.56,.12,copper),
      ("R13_aft_combustor_guard",
       [(-.49,-.49),(.39,-.35),(.63,-.69),(.35,-.94),
        (-.33,-.99),(-.57,-.73)],.51,.14,cast_iron),
    ]
    for label, outline, z, depth, mat in covers:
        cast(label,outline,z,depth,mat,root,.06)

    tube("R13_port_accumulator_feed",
         [(-.81,1.17,.18),(-.77,.84,.42),(-.49,.43,.59),
          (-.43,.06,.59)],.060,copper,root)
    tube("R13_starboard_oxidizer_feed",
         [(1.14,1.21,.22),(.85,.93,.40),(.52,.48,.58),
          (.50,-.13,.52),(.27,-.55,.34)],.077,p["copper"],root)
    tube("R13_chamber_crossfeed",
         [(-.47,-.41,.49),(-.20,-.50,.60),(.10,-.35,.60),
          (.50,-.10,.55)],.052,copper,root)
    tube("R13_aft_pressure_return",
         [(.49,-.45,.40),(.78,-.79,.27),
          (.67,-1.11,.02)],.069,p["dark"],root)
    for label, xyz, radius in [
       ("R13_accumulator_pressure_flange",(-.47,.47,.37),.245),
       ("R13_aft_chamber_pressure_flange",(.52,-.34,.38),.235)
    ]:
        ring(label,*xyz,radius,copper,root,.042)
    for label, xyz, scale in [
       ("R13_intake_valve_head",(-.81,1.17,.18),(.16,.19,.14)),
       ("R13_crossfeed_isolation_valve",(.10,-.35,.60),(.17,.16,.115)),
       ("R13_pressure_return_socket",(.67,-1.11,.02),(.16,.18,.12))
    ]:
        ellipsoid(label,xyz,scale,cast_iron,root)
    # 2 actual incandescent slots, not 7 uniform LEDs or fuel UI overlays.
    for label, xyz in [
       ("R13_forward_heat_port",(.16,.76,.63)),
       ("R13_rear_heat_port",(-.13,-.73,.67))
    ]:
        ellipsoid(label,xyz,(.11,.135,.043),p["orange"],root)

    scene["fsc_r13_revision"]=REVISION
    scene["fsc_r13_removed_false_bar_parts"]=31
    scene["fsc_r13_irregular_guard_count"]=3
    scene["fsc_r13_heat_port_count"]=2
    scene["fsc_r13_reference_constraint"]="R12 stationary upper alpha; lower nozzle silhouette changes"
    scene["fsc_r13_scope"]="vanilla benchmark only; no live art or gameplay"
