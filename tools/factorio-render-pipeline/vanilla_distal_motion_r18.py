"""R18: source-measured LOWER lip silhouette approximation, vanilla only.

Directly measured user-provided original thruster.zip SHA256:
0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791

These are opaque BODY sprite Y-extent envelopes, not artist-generated wiggles.
They are NOT proven 3D pivot angles or mechanical-joint recovery. Upper
shields and their casing support roots remain entirely static; only the
distal tips of four lower circumferential plates may deform. No source image
bytes are in the repository.
"""
import bpy
import json
from vane_layout_r22 import VANE_COUNT

REVISION="R18_source_measured_distal_lower_lip_envelopes"
SOURCE_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
# Each 64-sample curve is the deepest >=128 alpha pixel in the original
# 264x542 body image inside rows 475:542, x ranges given below.
# Values include occlusion and image sampling. They are NOT unique parts.
SAMPLES={
"port_inner":(529,527,528,530,532,536,539,539,537,535,533,532,531,532,532,532,532,533,533,531,530,530,529,529,530,531,529,528,529,531,532,530,528,527,527,526,526,524,522,522,525,528,528,528,527,527,529,530,530,530,531,532,532,531,530,529,529,529,530,531,531,531,531,531),
"port_outer":(512,512,513,513,513,512,512,512,512,512,513,514,514,513,512,513,513,512,512,512,512,511,511,512,513,512,511,511,511,512,513,514,513,513,513,513,513,513,512,511,512,513,514,514,513,513,513,513,512,512,512,511,511,512,513,513,513,513,512,511,512,512,512,513),
"starboard_outer":(511,509,510,512,512,512,513,513,514,513,512,511,512,514,514,514,513,512,512,511,510,509,508,508,509,510,510,511,511,513,513,511,510,511,512,513,511,510,511,511,512,512,512,511,511,511,510,511,512,511,511,512,513,511,510,510,511,512,511,510,510,511,512,511),
"starboard_inner":(526,523,522,523,525,528,530,529,529,528,527,527,527,528,528,530,532,535,537,538,538,536,534,533,533,533,531,527,525,525,524,522,521,522,523,524,523,522,523,527,532,535,533,530,527,524,522,521,521,520,519,519,520,522,523,524,526,527,527,527,528,527,528,528),
}
SOURCE_RECTS={
"port_inner":(50,475,95,542),
"port_outer":(8,475,45,542),
"starboard_outer":(220,475,256,542),
"starboard_inner":(165,475,215,542),
}
# Model lower-half angular order, not proven original rig correspondence.
# Ten evenly-spaced slots. Four observable lower fin ROIs only.
ANGULAR_TO_OBSERVED={6:"port_outer",7:"port_inner",
                     8:"starboard_inner",9:"starboard_outer"}

def normalized_samples(values):
    if len(values)!=64:
        raise ValueError("Real source atlas must supply 64 cyclic frames")
    low=min(values)
    # Pixel-per-tile is not calibrated exactly. A conservative <0.2 Blender
    # tile movement is applied to lower tips; reference Y pixel differences
    # are scaled by 24 pixels instead of asserting exact pixel registration.
    return [round((v-low)/24.0,6) for v in values]

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    collection=bpy.data.collections.get("R11_OUTBOARD_SUSPENDED_AFTERBURNERS")
    if collection is None:
        raise RuntimeError("R18 cannot find independently supported vanes")
    lower=[]
    for index in range(VANE_COUNT):
        ob=collection.objects.get(f"R11_SUSPENDED_AFTERBURNER_VANE_{index:02d}")
        if ob is None or not ob.get("R16_broad_squared_trailing_edge"):
            raise RuntimeError("R18 requires completed R16 solid heat shields")
        if index not in ANGULAR_TO_OBSERVED:
            if ob.data.shape_keys is not None:
                raise RuntimeError("R18 forbids animation on upper source-stationary fin")
            continue
        source=ANGULAR_TO_OBSERVED[index]
        keys=normalized_samples(SAMPLES[source])
        base=ob.shape_key_add(name="Basis",from_mix=False)
        tip=ob.shape_key_add(name="R18_lower_only_mouth_apron_travel",
                             from_mix=False)
        changed=0
        for a,b in zip(base.data,tip.data):
            # y near -2.35 is fixed chassis material; y near -3.47 is a
            # source-inspired deformable FREE END only.
            weight=max(0.,min(1.,(-3.09-a.co.y)/.35))
            if weight:
                b.co.y-=.22*weight
                changed+=1
        if changed<12:
            raise RuntimeError("R18 failed to isolate distal plate vertices")
        for frame,value in enumerate(keys,1):
            tip.value=value
            tip.keyframe_insert(data_path="value",frame=frame)
        tip.value=keys[0]
        tip.keyframe_insert(data_path="value",frame=65)
        ob["R18_lower_source_roi"]=source
        ob["R18_alpha_roi_pixels"]=json.dumps(SOURCE_RECTS[source])
        ob["R18_motion_proxy_not_unique_3D"]=True
        ob["R18_fixed_chassis_root"]=True
        lower.append(ob.name)
    if len(lower)!=4:
        raise RuntimeError("R18 lower-only mechanical isolation failed")
    scene["fsc_r18_revision"]=REVISION
    scene["fsc_r18_original_archive_sha256"]=SOURCE_SHA256
    scene["fsc_r18_upper_static_vanes"]=VANE_COUNT-len(lower)
    scene["fsc_r18_distal_animated_vanes"]=len(lower)
    scene["fsc_r18_source_frames"]=64
    scene["fsc_r18_animation_status"]="observable-2D-silhouette-fit_NOT_source-rig-recovered"
    scene.frame_set(1)
