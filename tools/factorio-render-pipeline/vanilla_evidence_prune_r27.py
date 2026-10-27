"""R27 source-visible calibration: retire fabricated per-fin hose/piston trees.

Reference: operator-provided ORIGINAL thruster.zip, 2.0.77,
SHA256 0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791.
This is not a claim that all these objects are impossible, only that they
have NO individually observable source-sprite pixels sufficient to warrant
their inclusion in a SOURCE-FIDELITY calibration scene.

Keep the already authored FIN PANELS, the two large OUTER UNDERSIDE covers,
the open refractory, original top-manifold pipes, and effects separate.
Do not replace rejected details with other invented 'cool' mechanisms.
"""
import bpy
import json
from vane_layout_r22 import VANE_COUNT

REVISION="R27_original_sprite_only_no_invented_fin_actuation"
SOURCE_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
# Exact per-fin speculative objects first authored in R11/R16/R19/R21.
# Neither photos nor original Lua establishes these at every hot tab.
UNSUPPORTED_PREFIXES=(
    "R11_CASING_TO_OUTBOARD_ROOT_",
    "R11_CHASSIS_ATTACHMENT_SOCKET_",
    "R11_OUTBOARD_SUSPENSION_ARM_",
    "R11_AFTERBURNER_FUEL_CAPILLARY_",
    "R11_OUTBOARD_MACHINERY_HINGE_",
    "R16_FIN_ROOT_CROSSHEAD_",
    "R16_CASING_TO_FIN_SADDLE_",
    "R16_FIN_DOUBLE_BRACE_",
    "R16_ROOT_CLAMP_EAR_",
    "R16_OUTBOARD_CRADLE_PIVOT_BOSS_",
    "R16_FIN_HEAT_FEED_TERMINAL_",
    "R16_FIN_CAPILLARY_NOZZLE_SOCKET_",
    "R19_FIN_ROOT_BACK_RIB_",
    "R19_FIN_ROOT_BOLT_",
    "R21_PINNED_CLEVIS_EAR_",
    "R21_CLEVIS_TRANSVERSE_PIN_",
    # Underside panels are visible but repeated actuators/channels below
    # them are not (both large coverings show an UNDERSIDE, not piston rig).
    "R25_OUTER_SKID_CASING_SPINE_",
    "R25_OUTER_SKID_UNDERBODY_CHANNEL_",
    "R25_OUTER_SKID_ROOT_BOSS_",
    "R25_OUTER_SKID_CLAMP_BOSS_",
)

# The source DOES contain tube-like objects on the MAIN ENGINE CHASSIS.
# Their shape and routing are STILL hypotheses; do not paint them as exact.
UPPER_MECHANISM_PRESERVE=(
    "R15_corrugated_forward_feed_port",
    "R15_corrugated_forward_feed_starboard",
    "R15_joined_pressure_supply_port",
    "R15_joined_pressure_supply_starboard",
    "R15_weathered_centerline_injector_shell",
)
# Conservative original-frame pixel observations, native 264x542 body.
# A class can have source evidence without proving 1:1 Blender shape.
VISIBLE_CLASS_ROIS={
    "corrugated_upper_pair":[[50,0,97,57],[155,0,199,60]],
    "copper_silver_manifold_pipe_cluster":[[61,172,201,339]],
    "three_upper_hot_tab_bodies":[[39,340,224,438]],
    "dark_refractory_nozzle_bell":[[29,395,235,523]],
    "two_large_underside_cover_edges":[[8,374,66,520],[197,374,258,520]],
}
# No independent tube or piston is traced from a hot-tab root to its tip.
EVIDENCE_POLICY=(
 "SOURCE_VISIBLE_ONLY: tubing exists in upper manifold; repeating "
 "R11/R16/R19/R21 per-fin feedlines, pistons, double braces and ferrules "
 "cannot be independently identified in the original sprite"
)

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    inner=bpy.data.collections.get("R11_OUTBOARD_SUSPENDED_AFTERBURNERS")
    outer=bpy.data.collections.get("R25_EXTERNAL_LARGE_SKID_COVERS_NOT_INNER_FINS")
    if inner is None or outer is None:
        raise RuntimeError("R27 requires BOTH already authored fin groups")

    panels=[inner.objects.get("R11_SUSPENDED_AFTERBURNER_VANE_%02d"%i)
            for i in range(VANE_COUNT)]
    covers=[outer.objects.get("R25_OUTER_SKID_UNDERSIDE_"+side)
            for side in ("port","starboard")]
    if any(x is None for x in panels+covers):
        raise RuntimeError("R27 cannot preserve existing source-visible panels")
    signatures={x.name:(len(x.data.vertices),len(x.data.polygons),
                        bool(x.data.shape_keys)) for x in panels+covers}

    for name in UPPER_MECHANISM_PRESERVE:
        if bpy.data.objects.get(name) is None:
            raise RuntimeError("R27 would discard source-visible upper machinery")

    removed=[]
    categories={prefix:0 for prefix in UNSUPPORTED_PREFIXES}
    for ob in list(scene.objects):
        for prefix in UNSUPPORTED_PREFIXES:
            if ob.name.startswith(prefix):
                removed.append(ob.name)
                categories[prefix]+=1
                bpy.data.objects.remove(ob,do_unlink=True)
                break
    if any(count<1 for count in categories.values()):
        raise RuntimeError("R27 missing a staged unsupported family: "+
                           repr({k:v for k,v in categories.items() if not v}))
    if len(removed)<(VANE_COUNT*10+8):
        raise RuntimeError("R27 removal was too small to eliminate false per-fin tubes")
    if any(ob.name.startswith(UNSUPPORTED_PREFIXES) for ob in scene.objects):
        raise RuntimeError("R27 left speculative tube/brace actuation geometry")

    # Remove metadata that falsely claims an attached support still exists.
    for fin in panels:
        for key in ("R16_support_graph","R19_joined_root_back_rib",
                    "R11_support_anchor_xyz","R11_span_from_machinery"):
            if key in fin:
                del fin[key]
        fin["R27_root_mechanism_evidence"]="unresolved_not_constructed"
    for cover in covers:
        for key in ("R25_chassis_support","R25_underside_reinforcement",
                    "R25_root_boss","R25_clamp_boss"):
            if key in cover: del cover[key]
        cover["R27_underside_support_evidence"]="unresolved_not_constructed"

    for ob in panels+covers:
        signature=(len(ob.data.vertices),len(ob.data.polygons),
                   bool(ob.data.shape_keys))
        if signature!=signatures[ob.name]:
            raise RuntimeError("R27 accidentally changed an approved panel mesh")
    scene["fsc_r27_revision"]=REVISION
    scene["fsc_r27_original_archive_sha256"]=SOURCE_SHA256
    scene["fsc_r27_source_observation_regions"]=json.dumps(VISIBLE_CLASS_ROIS)
    scene["fsc_r27_exclusion_policy"]=EVIDENCE_POLICY
    scene["fsc_r27_removed_unverified_geometry"]=json.dumps(removed)
    scene["fsc_r27_removed_by_family"]=json.dumps(categories,sort_keys=True)
    scene["fsc_r27_fin_panels_retained"]=len(panels)
    scene["fsc_r27_outer_underpanels_retained"]=len(covers)
    scene["fsc_r27_upstream_mechanism_preserved"]=len(UPPER_MECHANISM_PRESERVE)
    scene["fsc_r27_no_unproven_hinge_animation"]=True
    # Historical stage-build counts remain as provenance of what was built;
    # current verified counts MUST be queried from scene objects.
    scene["fsc_r27_status"]="source_only_simplification_not_finished_3D_reconstruction"
