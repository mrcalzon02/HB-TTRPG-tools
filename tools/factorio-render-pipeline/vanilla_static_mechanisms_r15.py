"""R15 vanilla-only morphological reconstruction of SOURCE-VISIBLE upper parts.

The 64-frame source constrains a mostly fixed upper silhouette. The structures
here are editable original geometry, not recovered Wube 3D source meshes.
Do not fabricate compressor cycles, injector pistons, or vane pivots.
"""
import bpy
from vane_layout_r22 import VANE_COUNT

REVISION="R15_visible_upper_pressure_bellows_and_injector"

def _surface(name,color,metallic,roughness):
    material=bpy.data.materials.new(name)
    material.use_nodes=True
    material.diffuse_color=(*color,1)
    node=material.node_tree.nodes.get("Principled BSDF")
    node.inputs["Base Color"].default_value=(*color,1)
    node.inputs["Metallic"].default_value=metallic
    node.inputs["Roughness"].default_value=roughness
    return material

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    lathe=api["lathe"];tube=api["tube"];ring=api["ring"]
    ellipsoid=api["ellipsoid"]
    soot=_surface("R15_dark_corrugated_hose",(.025,.028,.031),.19,.90)
    flange=_surface("R15_blackened_cast_pressure_flange",
                    (.075,.071,.067),.55,.79)
    pale=_surface("R15_weathered_centerline_injector_cast",
                  (.18,.17,.15),.35,.76)
    afterburner=_surface("R15_heat_oxidized_outboard_vanes",
                         (.115,.119,.124),.40,.82)
    # Confirmed VISIBLE forms: twin dark corrugated bodies at the upper end.
    # Function of the original occluded mechanisms remains unverified.
    bellows=[]
    for side,which in ((-1,"port"),(1,"starboard")):
        x=side*.86
        profile=[(.79,.18),(.90,.22),(.96,.28),(1.03,.16),
                 (1.09,.27),(1.15,.16),(1.22,.275),(1.28,.16),
                 (1.35,.27),(1.41,.17),(1.48,.26),(1.55,.17),
                 (1.62,.25),(1.69,.16),(1.77,.20),(1.83,.14)]
        label="R15_corrugated_forward_feed_"+which
        lathe(label,profile,x,.55,soot,root)
        bellows.append(label)
        for i,y in enumerate((.84,1.80)):
            ring("R15_bellows_end_collar_"+which+"_"+str(i),
                 x,y,.55,.21,flange,root,.055)
        tube("R15_joined_pressure_supply_"+which,
             [(x,1.78,.57),(x+side*.14,1.57,.68),
              (side*.58,1.34,.65),(side*.36,1.08,.67)],
             .067,p["copper"] if side==-1 else p["steel"],root)
        ellipsoid("R15_supply_foot_socket_"+which,
                  (side*.36,1.08,.67),(.12,.16,.12),flange,root)

    # Confirmed VISIBLE form: a broad irregular central injection casing.
    # This is not proof of the original internal fluid plumbing topology.
    lathe("R15_weathered_centerline_injector_shell",
          [(-.31,.16),(-.12,.23),(.13,.24),(.38,.32),
           (.65,.285),(.88,.31),(1.11,.25),(1.38,.28),(1.62,.20)],
          0,.68,pale,root)
    for i,(y,radius) in enumerate(((.06,.24),(.82,.30),(1.32,.27))):
        ring("R15_injector_machined_clamp_"+str(i),
             0,y,.68,radius,flange,root,.047)
    tube("R15_centerline_injector_return",
         [(-.15,1.59,.71),(-.21,1.22,.84),(.06,.82,.92),
          (.23,.32,.79),(.24,-.35,.52)],.065,flange,root)
    ellipsoid("R15_injector_reaction_interface",
              (.24,-.35,.52),(.15,.19,.14),flange,root)

    # Keep eight physically separate outboard suspended vanes, but remove
    # bright arrowhead-like metal appearance (UI arrows are never 3D geometry).
    vanes=[ob for ob in scene.objects
           if ob.name.startswith("R11_SUSPENDED_AFTERBURNER_VANE_")]
    if len(vanes)!=VANE_COUNT:
        raise RuntimeError("R15 must preserve shared R22 reference fin population")
    for ob in vanes:
        if not ob.data.materials:
            raise RuntimeError("Missing thermal vane material: "+ob.name)
        ob.data.materials[0]=afterburner
        if ob.animation_data is not None:
            raise RuntimeError("R15 unsupported mechanical vane animation")
    scene["fsc_r15_revision"]=REVISION
    scene["fsc_r15_corrugated_forward_feed_count"]=len(bellows)
    scene["fsc_r15_dark_vane_count"]=len(vanes)
    scene["fsc_r15_mechanism_interpretation"]="visible forms only; motion/pivots unconfirmed"
    scene["fsc_r15_source_contract"]="R12 upper silhouette mostly unchanged"
