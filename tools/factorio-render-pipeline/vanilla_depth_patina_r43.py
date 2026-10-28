"""R43: physically shade EXISTING lower refractory shingles by source depth.

Exact original RGBA frame0 lower x65..202,y450..485 luma=.08203;
R42 newly unobstructed Blender=.11652. Upper bore is still too dark,
so global lighting or shared R13 shader changes are incorrect.
Use the ORIGINAL two R19 tile materials with object-info color
modulation ONLY on the 40 existing NEAR-mouth tile objects. Mid-depth
tiles keep white object colors and identical material behavior.
No extra parts, fake overlay, original sprite texture or emissive glow.
"""
REVISION="R43_source_depth_local_near_refractory_patina"
SOURCE_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
ORIGINAL_LOWER_LUMA=.08203
R42_LOWER_LUMA=.11652
NEAR_OBJECT_TINT=.64
TILE_COUNT=40
MATERIAL_NAMES=("R19_chipped_black_refractory","R19_inner_oxidized_shingles")
INFO_NODE="R43_existing_object_patina_color"
TINT_NODE="R43_physical_base_color_times_patina"

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):return
    import bpy
    if not scene.get("fsc_r42_genuine_open_nozzle_preserved"):
        raise RuntimeError("R43 needs corrected physical R42 open nozzle")
    coll=bpy.data.collections.get("R19_EDITABLE_OPEN_CONE_INTERIOR")
    if coll is None or len(coll.objects)!=160:
        raise RuntimeError("R43 source R19 inner construction missing")
    before={o.name for o in scene.objects}
    before_materials=set(bpy.data.materials.keys())
    old_colors={}
    for n in range(TILE_COUNT):
        near=coll.objects.get(f"R19_NEAR_MOUTH_TILE_{n:02d}")
        mid=coll.objects.get(f"R19_MID_STAGGERED_TILE_{n:02d}")
        if not near or not mid or not near.get("R38_existing_axial_scale_rebalanced"):
            raise RuntimeError("R43 must shade original existing source refractory tiles")
        if near.data.materials[0].name not in MATERIAL_NAMES or (
            mid.data.materials[0].name not in MATERIAL_NAMES):
            raise RuntimeError("R43 original R19 near/mid material names changed")
        if any(abs(x-1.)>.0001 for x in mid.color):
            raise RuntimeError("R43 mid/upper refractory is not unmodified white")
        old_colors[near.name]=tuple(near.color)
        near.color=(NEAR_OBJECT_TINT,)*3+(1.,)
        near["R43_darkened_original_near_tile"]=True
        near["R43_true_source_color_proxy_not_emission"]=True
    for material_name in MATERIAL_NAMES:
        mat=bpy.data.materials.get(material_name)
        if mat is None or not mat.use_nodes:
            raise RuntimeError("R43 legacy physical shader is missing")
        nodes=mat.node_tree.nodes
        bsdf=nodes.get("Principled BSDF")
        if not bsdf or nodes.get(INFO_NODE) or nodes.get(TINT_NODE):
            raise RuntimeError("R43 expected unmodified original R19 physical shader")
        original=tuple(bsdf.inputs["Base Color"].default_value)
        if bsdf.inputs["Base Color"].is_linked:
            raise RuntimeError("R43 cannot disrupt externally driven source shader")
        if bsdf.inputs["Emission Strength"].default_value!=0:
            raise RuntimeError("R43 cannot add additive glow")
        info=nodes.new("ShaderNodeObjectInfo")
        info.name=INFO_NODE
        patina=nodes.new("ShaderNodeMixRGB")
        patina.name=TINT_NODE
        patina.blend_type="MULTIPLY"
        patina.inputs["Fac"].default_value=1.
        patina.inputs["Color1"].default_value=original
        mat.node_tree.links.new(info.outputs["Color"],patina.inputs["Color2"])
        mat.node_tree.links.new(patina.outputs["Color"],bsdf.inputs["Base Color"])
        if tuple(bsdf.inputs["Base Color"].default_value)!=original:
            raise RuntimeError("R43 altered original base material source contract")
    if {o.name for o in scene.objects}!=before or (
        set(bpy.data.materials.keys())!=before_materials):
        raise RuntimeError("R43 added unsupported objects or shader datablocks")
    scene["fsc_r43_revision"]=REVISION
    scene["fsc_r43_source_sha256"]=SOURCE_SHA256
    scene["fsc_r43_original_lower_luma"]=ORIGINAL_LOWER_LUMA
    scene["fsc_r43_r42_lower_luma"]=R42_LOWER_LUMA
    scene["fsc_r43_near_tile_count"]=TILE_COUNT
    scene["fsc_r43_near_patina_factor"]=NEAR_OBJECT_TINT
    scene["fsc_r43_mid_and_upper_refractory_unchanged"]=True
    scene["fsc_r43_unmodified_R13_shared_shader"]=True
    scene["fsc_r43_no_extra_objects_materials_textures_or_glow"]=True
    scene["fsc_r43_candidate_requires_render_comparison"]=True
