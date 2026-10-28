"""R37: physically reveal the EXISTING original-source refractory scale pattern.

The user's verified two-page 64-frame thruster body atlas shows a visibly
layered and warmer refractory liner in the lower nozzle. The fixed-camera
native Blender baseline y410:455,x55:208 mean opaque RGB luminance is .0289,
versus the original source .0696 in the same 264x542 pixel region.
This is an observational brightness + detail mismatch, not a directive to
paint the source sprite on the geometry or alter lighting/exhaust effects.

Enhance the 80 EXISTING R19 formed-scale meshes with a subtle pressed
central corrugation that creates actual facet normal differences. Calibrate
only existing R19/R20 refractory materials and unique R11 throat material.
No new visible objects, tiles, endcaps, support fixtures or extra ligatures.
All R35 inner thermal fins and R36 moving exterior cups stay untouched.
"""
import math

REVISION="R37_existing_deep_refractory_facets_and_source_luminance_contrast"
ORIGINAL_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
SOURCE_LUMA_410_455=.0696
PRIOR_RENDER_LUMA_410_455=.0289
INNER_AXIS_Z=-.43
RIDGE_INWARD_TILES=.024
SHEET_ROW_TAPER=(.52,1.,1.,.52)
DARK_COLOR=(.110,.096,.078)
AGED_COLOR=(.185,.154,.119)
STRAKE_COLOR=(.154,.129,.099)
THROAT_COLOR=(.115,.101,.086)
THROAT_MATERIAL_NAME="R13_scorched_nonreflective_refractory"

def corrugate(center,shift):
    x,y,z=center
    radius=math.hypot(x,z-INNER_AXIS_Z)
    if radius<.12:
        raise ValueError("Refractory scale radial center must not cross throat axis")
    new_radius=radius-shift
    if new_radius<=0:
        raise ValueError("R37 corrugation crossed the open combustion bore")
    ratio=new_radius/radius
    return (x*ratio,y,INNER_AXIS_Z+(z-INNER_AXIS_Z)*ratio)

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    import bpy
    coll=bpy.data.collections.get("R19_EDITABLE_OPEN_CONE_INTERIOR")
    throat=bpy.data.objects.get("R11_OPEN_DEEP_REFRACTORY_THROAT")
    if coll is None or len(coll.objects)!=160 or throat is None:
        raise RuntimeError("R37 requires full preexisting R19 deep refractory")
    if not throat.get("R11_open_no_endcaps") or len(throat.data.materials)!=1:
        raise RuntimeError("R37 may not cap the R11 open refractory bore")
    before_objects={o.name for o in scene.objects}
    before_poly=len(throat.data.polygons)
    original_material=throat.data.materials[0]
    fin_names={o.name:o.data.as_pointer() for o in scene.objects
               if o.name.startswith("R11_SUSPENDED_AFTERBURNER_VANE_")}
    guard_names={o.name:o.data.as_pointer() for o in scene.objects
                 if o.name.startswith("R25_OUTER_SKID_UNDERSIDE_")}
    if len(fin_names)!=int(scene.get("fsc_r35_inner_heat_fins_remeshed",0)) or len(guard_names)!=2:
        raise RuntimeError("R37 would disrupt inner fins or independently cupped guards")
    for material_name,color in (
        ("R19_chipped_black_refractory",DARK_COLOR),
        ("R19_inner_oxidized_shingles",AGED_COLOR),
        ("R20_inner_oxidized_strake_contrast",STRAKE_COLOR)):
        material=bpy.data.materials.get(material_name)
        if material is None or not material.use_nodes:
            raise RuntimeError("R37 source refractory original material absent")
        bsdf=material.node_tree.nodes.get("Principled BSDF")
        if bsdf is None:
            raise RuntimeError("R37 source material lacks physical principled shader")
        bsdf.inputs["Base Color"].default_value=(*color,1.)
        material.diffuse_color=(*color,1.)
        if bsdf.inputs["Emission Strength"].default_value!=0:
            raise RuntimeError("R37 cannot fuse additive glow into physical liner")
    # R13 intentionally shares ONE scorched refractory material between
    # the open R11 cone and its nested reaction drum. Preserve the single
    # source-of-truth material datablock; changing only the throat would
    # break the actual R13 shared heat shielding architecture.
    drum=bpy.data.objects.get("R08_aft_internal_reaction_drum")
    if (drum is None or original_material.name!=THROAT_MATERIAL_NAME or
        drum.data.materials[0].as_pointer()!=original_material.as_pointer()):
        raise RuntimeError("R37 must keep original shared R13 refractory casting")
    throat_mat=original_material
    throat_mat.node_tree.nodes["Principled BSDF"].inputs[
        "Base Color"].default_value=(*THROAT_COLOR,1.)
    throat_mat.diffuse_color=(*THROAT_COLOR,1.)
    if throat_mat.node_tree.nodes["Principled BSDF"].inputs[
        "Emission Strength"].default_value!=0:
        raise RuntimeError("R37 cannot add glow to the R13 shared refractory")
    sculpted=0
    for prefix in ("R19_NEAR_MOUTH_TILE_","R19_MID_STAGGERED_TILE_"):
        for n in range(40):
            ob=coll.objects.get(f"{prefix}{n:02d}")
            if ob is None or len(ob.data.vertices)!=24 or ob.animation_data:
                raise RuntimeError("R37 missing existing static 24-vertex refractory tile")
            if len(ob.data.materials)!=1:
                raise RuntimeError("R37 is not allowed to merge original tile surfaces")
            topology=(len(ob.data.vertices),len(ob.data.polygons))
            for skin in range(2):
                for row,weight in enumerate(SHEET_ROW_TAPER):
                    index=skin*12+row*3+1
                    v=ob.data.vertices[index]
                    v.co=corrugate(v.co,RIDGE_INWARD_TILES*weight)
            ob.data.update()
            if (len(ob.data.vertices),len(ob.data.polygons))!=topology:
                raise RuntimeError("R37 destroyed original tile manifold topology")
            ob["R37_source_refractory_center_corrugation"]=True
            ob["R37_center_inset_tiles"]=RIDGE_INWARD_TILES
            ob["R37_original_refractory_tile_not_added"]=True
            sculpted+=1
    if sculpted!=80 or {o.name for o in scene.objects}!=before_objects:
        raise RuntimeError("R37 altered count of original visible refractory parts")
    if before_poly!=len(throat.data.polygons):
        raise RuntimeError("R37 reintroduced a forbidden refractory endcap")
    if any(bpy.data.objects[n].data.as_pointer()!=ptr
           for n,ptr in fin_names.items()):
        raise RuntimeError("R37 overwrote original moving inner fin meshes")
    if any(bpy.data.objects[n].data.as_pointer()!=ptr
           for n,ptr in guard_names.items()):
        raise RuntimeError("R37 overwrote R36 source-animated cupped guards")
    scene["fsc_r37_revision"]=REVISION
    scene["fsc_r37_exact_source_sha256"]=ORIGINAL_SHA256
    scene["fsc_r37_unmodified_tile_count"]=sculpted
    scene["fsc_r37_original_source_luminance_reference"]=SOURCE_LUMA_410_455
    scene["fsc_r37_r35_original_render_luminance"]=PRIOR_RENDER_LUMA_410_455
    scene["fsc_r37_inset_tiles"]=RIDGE_INWARD_TILES
    scene["fsc_r37_open_bore_unsealed"]=True
    scene["fsc_r37_no_original_sprite_texture_or_glow"]=True
    scene["fsc_r37_no_added_objects"]=True
    scene["fsc_r37_r13_shared_refractory_preserved"]=True
