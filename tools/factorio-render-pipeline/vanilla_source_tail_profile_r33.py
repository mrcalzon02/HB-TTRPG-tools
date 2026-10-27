"""R33: source-silhouette tail taper for the existing two R31 clamshell guards.

The original 264x542 thruster animation shows two relatively slim outboard
guard silhouettes wrapping the rear nozzle. The R32 Blender native-frame
capture reveals broad guard ends persisting about 8-12px farther aft than
the GIF-derived source body preview. Those preview pixels are approximate;
the original source atlas (SHA below) is authoritative when present.

This stage adjusts ONLY the existing R25 outer-skid mesh vertices after R31,
with no new objects, pivots, guessed hardware or temperature coloration.
The center remains a 3D cupped bowl BELOW its lips.
"""
import math
from vanilla_cupped_radial_skids_r31 import point as r31_point

REVISION="R33_2_exact_rgba_guard_tip_candidate"
ORIGINAL_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
BELL_CENTER_Z=-.43
# Source-aligned inverse-projection candidates. Control each axial station;
# last three rows only: pull tips forward and slim their exposed outer edges.
AFT_Y_RELIEF=(0.,0.,0.,0.,0.,.05,.07,.02)
AFT_OUTER_TUCK=(0.,0.,0.,0.,0.,.02,.05,.09)
AFT_INNER_ANGLE_DEG=(0.,0.,0.,0.,0.,-5.,-9.,-22.)
AFT_TIP_EDGE_ROUND=(0.,0.,0.,0.,0.,0.,.015,.045)

def point(station,u,side,skin,row):
    x,y,z=r31_point(station,u,side,skin,row)
    # Using the existing R31's real 3D radial bowl as the starting
    # surface means tapering does NOT revert to a flat world-Z plate.
    old_radial=math.hypot(x,z-BELL_CENTER_Z)
    theta=math.atan2(BELL_CENTER_Z-z,abs(x))
    theta+=math.radians(AFT_INNER_ANGLE_DEG[row]*u*u)
    radius=old_radial-AFT_OUTER_TUCK[row]*(1-u)*(1-u)
    return (side*radius*math.cos(theta),
            y+AFT_Y_RELIEF[row]+AFT_TIP_EDGE_ROUND[row]*(2*u-1)**2,
            BELL_CENTER_Z-radius*math.sin(theta))

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    import bpy
    from vanilla_beige_radial_skids_r29 import STATIONS,CIRCUMFERENCE_SAMPLES
    shrouds=bpy.data.collections.get("R25_EXTERNAL_LARGE_SKID_COVERS_NOT_INNER_FINS")
    hot=bpy.data.collections.get("R11_OUTBOARD_SUSPENDED_AFTERBURNERS")
    if shrouds is None or len(shrouds.objects)!=2 or hot is None:
        raise RuntimeError("R33 requires two existing R31 cups and source-animated inner fins")
    before_objects={o.name for o in scene.objects}
    signatures={o.name:(len(o.data.vertices),len(o.data.polygons),
                        bool(o.data.shape_keys),bool(o.animation_data))
                for o in hot.objects if o.name.startswith("R11_SUSPENDED_AFTERBURNER_VANE_")}
    span=len(STATIONS)*len(CIRCUMFERENCE_SAMPLES)
    for label,side in (("port",-1),("starboard",1)):
        ob=shrouds.objects.get("R25_OUTER_SKID_UNDERSIDE_"+label)
        if (ob is None or not ob.get("R31_cupped_bowl_not_global_plane") or
                not ob.get("R29_no_outer_heat_damage") or ob.animation_data):
            raise RuntimeError("R33 guard must retain original R31 cup and static beige role")
        if len(ob.data.vertices)!=span*2 or len(ob.data.polygons)!=142:
            raise RuntimeError("R33 guard mesh no longer has original 8x9x2 topology")
        material=ob.data.materials[0]
        for skinidx,skin in enumerate((-1,1)):
            for row,station in enumerate(STATIONS):
                for col,u in enumerate(CIRCUMFERENCE_SAMPLES):
                    i=skinidx*span+row*len(CIRCUMFERENCE_SAMPLES)+col
                    ob.data.vertices[i].co=point(station,u,side,skin,row)
        ob.data.update()
        def p(row,u):
            return ob.data.vertices[span+row*len(CIRCUMFERENCE_SAMPLES)+
                                    round(u*(len(CIRCUMFERENCE_SAMPLES)-1))].co
        for row in (3,5,6,7):
            outside,belly,inside=[p(row,u) for u in (0.,.5,1.)]
            if belly.z>=min(outside.z,inside.z)-.10:
                raise RuntimeError("R33 flattened the source-visible cupped shell")
            if abs(outside.x)-abs(inside.x)<(.55 if row==7 else .75):
                raise RuntimeError("R33 folded guard; only observed rear tip may taper narrow")
        # R33.2 recovered the EXACT original RGBA source: the rear guard
        # reaches farther aft than the GIF-derived R33.1 guess. Instead
        # of the now-obsolete .11 cap, require a smooth monotonic axial
        # transition over the final 2 sculpt stations (no fold/collapse).
        axial_gap=p(7,.5).y-p(6,.5).y
        if not (-.20<axial_gap<-.08):
            raise RuntimeError("R33.2 final cupped tail lacks smooth aft station spacing")
        if ob.data.materials[0] is not material:
            raise RuntimeError("R33 replaced original unburnt beige metal shader")
        ob["R33_source_tail_taper"]=True
        ob["R33_no_extra_parts_or_actuators"]=True
        ob["R33_unheated_beige_preserved"]=material.name
        ob["R33_mirrored_source_profile"]=label
        ob["R33_aft_tip_y_shift"]=AFT_Y_RELIEF[-1]
        ob["R33_rounded_tail_edge"]=AFT_TIP_EDGE_ROUND[-1]
        ob["R33_2_source_rgba_port_last_row"]=512
        ob["R33_2_source_rgba_starboard_last_row"]=513
        if p(7,0.).y<=p(7,.5).y+.04:
            raise RuntimeError("R33.1 lower shroud still ends with square flat cap")
    if {o.name for o in scene.objects}!=before_objects:
        raise RuntimeError("R33 created unobserved guard supports")
    if any((len(bpy.data.objects[n].data.vertices),
            len(bpy.data.objects[n].data.polygons),
            bool(bpy.data.objects[n].data.shape_keys),
            bool(bpy.data.objects[n].animation_data))!=v
           for n,v in signatures.items()):
        raise RuntimeError("R33 altered source-derived lower fin animation")
    scene["fsc_r33_revision"]=REVISION
    scene["fsc_r33_source_archive_sha256"]=ORIGINAL_SHA256
    scene["fsc_r33_no_outer_rig_inferred"]=True
    scene["fsc_r33_inner_64_frame_motion_preserved"]=True
    scene["fsc_r33_source_gif_observation_not_pixel_proven"]=True
