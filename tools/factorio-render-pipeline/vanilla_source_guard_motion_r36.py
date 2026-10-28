"""R36: ORIGINAL 64-frame alpha-edge motion; no unverified outer skid pivot.

SHA-matched private Space Age vanilla thruster RGBA body atlas measured as
64 * 264x542 frames. Values are median outer alpha edges (>=128) in y405:475,
port x0:50 and starboard x210:264, with integer pixel rounding.

These measurements observe a 2D combined silhouette, not an independently
proven moving part or recovered mechanical drive. Apply conservative shape
deformation as a TESTABLE silhouette proxy to the existing two R33.2 beige
cupped guards. Preserve all previous physical meshes, material assignments,
R27 evidence deletion, and the separate R18 animated INNER fin sheets.
"""
import json

REVISION="R36_source_original_rgba_64_key_outer_edge_proxy"
ORIGINAL_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
SAMPLING_Y=(405,475)
PIXELS_PER_TILE=542/7.46
MAX_ABS_SOURCE_DELTA_PX=3
MODEL_LATERAL_TRAVEL_TILES=.042
WEIGHT_BY_AXIAL_STATION=(0.,0.,.12,.35,.57,.78,1.,1.)
SOURCE_EDGE_SAMPLES={
    "port":(5, 6, 4, 3, 4, 4, 3, 3, 3, 4, 4, 5, 4, 3, 3, 2,
            3, 4, 4, 4, 5, 6, 7, 6, 5, 4, 4, 3, 3, 4, 3, 3,
            3, 5, 6, 6, 5, 4, 5, 5, 5, 4, 3, 3, 3, 4, 4, 4,
            4, 4, 4, 3, 2, 3, 4, 4, 4, 4, 4, 4, 3, 3, 4, 4),
    "starboard":(252, 251, 253, 253, 252, 252, 253, 254,
                 255, 254, 254, 253, 254, 255, 255, 254,
                 254, 254, 254, 254, 253, 251, 250, 250,
                 251, 252, 252, 252, 252, 254, 253, 251,
                 251, 253, 254, 253, 253, 252, 252, 253,
                 253, 253, 252, 252, 253, 254, 254, 252,
                 252, 251, 251, 253, 253, 252, 252, 252,
                 254, 254, 252, 250, 250, 250, 252, 252),
}

def normalized_values(samples):
    if len(samples)!=64:
        raise ValueError("The 64 original source atlas frames are mandatory")
    first=samples[0]
    result=[(v-first)/MAX_ABS_SOURCE_DELTA_PX for v in samples]
    if result[0]!=0 or max(abs(v) for v in result)>1.00001:
        raise ValueError("R36 source lateral motion beyond measured original envelope")
    return result

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    import bpy
    covers=bpy.data.collections.get(
        "R25_EXTERNAL_LARGE_SKID_COVERS_NOT_INNER_FINS")
    fins=bpy.data.collections.get("R11_OUTBOARD_SUSPENDED_AFTERBURNERS")
    if covers is None or len(covers.objects)!=2 or fins is None:
        raise RuntimeError("R36 requires exactly TWO original outer cups and existing inner fins")
    before={o.name for o in scene.objects}
    fin_signatures={
        o.name:(len(o.data.vertices),len(o.data.polygons),
                (o.data.shape_keys.as_pointer() if o.data.shape_keys else 0),
                bool(o.animation_data))
        for o in fins.objects
        if o.name.startswith("R11_SUSPENDED_AFTERBURNER_VANE_")}
    if len(fin_signatures)!=int(scene.get("fsc_r35_inner_heat_fins_remeshed",0)):
        raise RuntimeError("R36 must retain all R35.1 enlarged inner heat fins")
    for side in ("port","starboard"):
        ob=covers.objects.get("R25_OUTER_SKID_UNDERSIDE_"+side)
        if (ob is None or not ob.get("R33_source_tail_taper") or
            not ob.get("R31_cupped_bowl_not_global_plane")):
            raise RuntimeError("R36 cannot modify uncalibrated outer cup")
        if ob.animation_data or ob.data.shape_keys is not None:
            raise RuntimeError("R36 may not install hidden hinge or duplicate motion")
        if len(ob.data.vertices)!=144 or len(ob.data.polygons)!=142:
            raise RuntimeError("R36 cannot alter external guard topology")
        if len(ob.data.materials)!=1 or not ob.get("R29_no_outer_heat_damage"):
            raise RuntimeError("R36 cannot alter unheated original beige surfaces")
        base=ob.shape_key_add(name="Basis",from_mix=False)
        key=ob.shape_key_add(
            name="R36_observed_2D_guard_edge_motion_NOT_verified_hinge",
            from_mix=False)
        key.slider_min=-1.
        key.slider_max=1.
        span=72
        for skin_index in range(2):
            for row,weight in enumerate(WEIGHT_BY_AXIAL_STATION):
                for col in range(9):
                    index=skin_index*span+row*9+col
                    key.data[index].co.x+=MODEL_LATERAL_TRAVEL_TILES*weight
        for frame,amount in enumerate(normalized_values(SOURCE_EDGE_SAMPLES[side]),1):
            key.value=amount
            key.keyframe_insert(data_path="value",frame=frame)
        key.value=0
        key.keyframe_insert(data_path="value",frame=65)
        ob["R36_source_edge_side"]=side
        ob["R36_original_64_edge_samples"]=json.dumps(SOURCE_EDGE_SAMPLES[side])
        ob["R36_shape_key_not_object_animation"]=True
        ob["R36_contour_proxy_not_proven_mechanism"]=True
        ob["R36_source_atlas_private"]=True
    if {o.name for o in scene.objects}!=before:
        raise RuntimeError("R36 added unsupported moving objects")
    if any((len(bpy.data.objects[n].data.vertices),
            len(bpy.data.objects[n].data.polygons),
            (bpy.data.objects[n].data.shape_keys.as_pointer()
             if bpy.data.objects[n].data.shape_keys else 0),
            bool(bpy.data.objects[n].animation_data))!=sig
           for n,sig in fin_signatures.items()):
        raise RuntimeError("R36 corrupted the independently animated R18 fin rig")
    scene["fsc_r36_revision"]=REVISION
    scene["fsc_r36_original_archive_sha256"]=ORIGINAL_SHA256
    scene["fsc_r36_real_rgba_frames"]=64
    scene["fsc_r36_original_measurement_y"]=json.dumps(SAMPLING_Y)
    scene["fsc_r36_no_new_parts"]=True
    scene["fsc_r36_no_pivot_or_actuator_inferred"]=True
    scene["fsc_r36_original_source_pixel_measurement"]=True
    scene["fsc_r36_keeps_r35_1_inner_fin_proportions"]=True
    scene.frame_set(1)
