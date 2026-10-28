"""R44: source-measured axial patina correction on existing R43 tiles.

Original frame0 upper/mid/lower/center mean luma .069579/.071002/.082032/.055115.
R42 .038096/.078657/.116520/.053251.
R43 .032716/.064545/.093591/.045846. Uniform near-tile .64 patina
fixes lower but darkens upper/center. Recover physical pigment toward the
deep end of the SAME tiles, leaving their near-mouth faces shaded.
Generated coordinates use original tile local Y, not screen or camera space.
"""
REVISION="R44_existing_tile_axial_patina_transition"
SOURCE_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
TILE_COUNT=40
AXIAL_BLEND_START=.50
AXIAL_BLEND_END=.92
COORD_NODE="R44_tile_local_generated"
AXIS_NODE="R44_tile_axial_Y"
MAP_NODE="R44_axial_patina_blend"
MIX_NODE="R44_original_color_recovery"

def expected_tint(baseline,axial_fraction):
    f=max(0.,min(1.,(axial_fraction-AXIAL_BLEND_START)/
                    (AXIAL_BLEND_END-AXIAL_BLEND_START)))
    return baseline+(1.-baseline)*f

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    import bpy
    from vanilla_depth_patina_r43 import (
        REVISION as R43_REVISION,NEAR_OBJECT_TINT,MATERIAL_NAMES,
        INFO_NODE,TINT_NODE)
    if scene.get("fsc_r43_revision")!=R43_REVISION:
        raise RuntimeError("R44 requires real R43 geometry/material contract")
    coll=bpy.data.collections.get("R19_EDITABLE_OPEN_CONE_INTERIOR")
    if coll is None or len(coll.objects)!=160:
        raise RuntimeError("R44 original R19 physical pieces missing")
    objects={ob.name for ob in scene.objects}
    materials=set(bpy.data.materials.keys())
    mesh_ids={}
    for i in range(TILE_COUNT):
        near=coll.objects.get(f"R19_NEAR_MOUTH_TILE_{i:02d}")
        mid=coll.objects.get(f"R19_MID_STAGGERED_TILE_{i:02d}")
        if not near or not mid or len(near.data.vertices)!=24 or len(mid.data.vertices)!=24:
            raise RuntimeError("R44 original 24-vertex refractory pieces altered")
        if near.animation_data or mid.animation_data:
            raise RuntimeError("R44 refuses tile motion changes")
        if (any(abs(x-NEAR_OBJECT_TINT)>1e-4 for x in near.color[:3])
                or any(abs(x-1.)>1e-4 for x in mid.color)):
            raise RuntimeError("R44 existing source split missing")
        for ob in (near,mid):
            mesh_ids[ob.name]=(ob.data.as_pointer(),len(ob.data.polygons))
    for material_name in MATERIAL_NAMES:
        mat=bpy.data.materials.get(material_name)
        if not mat or not mat.use_nodes:
            raise RuntimeError("R44 original R19 shared material missing")
        n=mat.node_tree.nodes
        links=mat.node_tree.links
        info=n.get(INFO_NODE);patina=n.get(TINT_NODE)
        bsdf=n.get("Principled BSDF")
        if (not info or not patina or not bsdf or
            any(n.get(k) for k in (COORD_NODE,AXIS_NODE,MAP_NODE,MIX_NODE))):
            raise RuntimeError("R44 R43 shader contract invalid")
        original=[e for e in links if e.to_socket==patina.inputs["Color2"]]
        if len(original)!=1 or original[0].from_node!=info:
            raise RuntimeError("R44 original R43 Object Info link missing")
        if bsdf.inputs["Emission Strength"].default_value!=0:
            raise RuntimeError("R44 no emissive/overlay workaround allowed")
        coord=n.new("ShaderNodeTexCoord");coord.name=COORD_NODE
        axis=n.new("ShaderNodeSeparateXYZ");axis.name=AXIS_NODE
        mapping=n.new("ShaderNodeMapRange");mapping.name=MAP_NODE
        mapping.clamp=True
        mapping.inputs["From Min"].default_value=AXIAL_BLEND_START
        mapping.inputs["From Max"].default_value=AXIAL_BLEND_END
        mapping.inputs["To Min"].default_value=0.
        mapping.inputs["To Max"].default_value=1.
        mix=n.new("ShaderNodeMixRGB");mix.name=MIX_NODE
        mix.blend_type="MIX"
        mix.inputs["Color2"].default_value=(1.,1.,1.,1.)
        links.new(coord.outputs["Generated"],axis.inputs["Vector"])
        links.new(axis.outputs["Y"],mapping.inputs["Value"])
        links.new(mapping.outputs["Result"],mix.inputs["Fac"])
        links.new(info.outputs["Color"],mix.inputs["Color1"])
        links.new(mix.outputs["Color"],patina.inputs["Color2"])
        if not bsdf.inputs["Base Color"].is_linked:
            raise RuntimeError("R44 disconnected existing physical source shader")
    if objects!={ob.name for ob in scene.objects} or materials!=set(bpy.data.materials.keys()):
        raise RuntimeError("R44 added forbidden objects or materials")
    for label,(pointer,polygons) in mesh_ids.items():
        ob=bpy.data.objects[label]
        if ob.data.as_pointer()!=pointer or len(ob.data.polygons)!=polygons:
            raise RuntimeError("R44 modified physical tile geometry")
    scene["fsc_r44_revision"]=REVISION
    scene["fsc_r44_source_sha256"]=SOURCE_SHA256
    scene["fsc_r44_near_tiles"]=TILE_COUNT
    scene["fsc_r44_blend_start"]=AXIAL_BLEND_START
    scene["fsc_r44_blend_end"]=AXIAL_BLEND_END
    scene["fsc_r44_same_R43_original_object_colors"]=True
    scene["fsc_r44_no_added_model_material_camera_lights_or_effect"]=True
    scene["fsc_r44_unverified_candidate_requires_render"]=True
