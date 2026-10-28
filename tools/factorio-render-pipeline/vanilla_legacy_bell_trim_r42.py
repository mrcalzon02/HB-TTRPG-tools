"""R42 remove OLD bell's four duplicate inward-return rings, keep exterior.

R41 same-camera raycast: 191/234 rays hit the R04 rolled bell.
The last 4 of its 12 axial rings overlap R11/R39 open liner.
Keep original first 8 rings, all 280 quads, material, object and camera.
Never hide/delete the exterior bell or add false source artwork.
"""
REVISION="R42_trim_duplicate_legacy_bell_inner_return"
SOURCE_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
NAME="vanilla_reference_bell_bronzed_rolled_bell"
SEGMENTS=40
ORIGINAL_RINGS=12
EXTERIOR_RINGS=8
ORIGINAL_FACES=440
EXTERIOR_FACES=280
OLD_FIRST_HIT=191
OLD_RAYS=234

def retained_quads(face_indices):
    return [tuple(q) for q in face_indices if all(i<SEGMENTS*EXTERIOR_RINGS for i in q)]

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):return
    import bpy
    obj=bpy.data.objects.get(NAME)
    liner=bpy.data.objects.get("R11_OPEN_DEEP_REFRACTORY_THROAT")
    drum=bpy.data.objects.get("R08_aft_internal_reaction_drum")
    if obj is None or obj.type!="MESH" or liner is None or drum is None:
        raise RuntimeError("R42 original outer bell or R11 liner missing")
    old=obj.data
    if (len(old.vertices)!=ORIGINAL_RINGS*SEGMENTS or
        len(old.polygons)!=ORIGINAL_FACES or old.shape_keys is not None or
        obj.animation_data or len(old.materials)!=1):
        raise RuntimeError("R42 unknown legacy bell topology")
    if liner.data.materials[0].as_pointer()!=drum.data.materials[0].as_pointer():
        raise RuntimeError("R42 must preserve R13 shared refractory")
    if not scene.get("fsc_r39_ribbed_inner_open_liner"):
        raise RuntimeError("R42 requires real R39 physical liner")
    if old.materials[0].name!="R13_oxidized_rough_nozzle_shell":
        raise RuntimeError("R42 original external shell material missing")
    names={o.name for o in scene.objects}
    faces=retained_quads([tuple(f.vertices) for f in old.polygons])
    if len(faces)!=EXTERIOR_FACES:
        raise RuntimeError("R42 outer 7x40 physical shell faces not found")
    vertices=[tuple(v.co) for v in old.vertices[:SEGMENTS*EXTERIOR_RINGS]]
    mat=old.materials[0]
    new=bpy.data.meshes.new(old.name+"_R42_open_exterior_only")
    new.from_pydata(vertices,[],faces)
    new.update()
    new.materials.append(mat)
    for f in new.polygons:f.use_smooth=True
    obj.data=new
    if old.users==0:bpy.data.meshes.remove(old)
    if {o.name for o in scene.objects}!=names or obj.data.materials[0].as_pointer()!=mat.as_pointer():
        raise RuntimeError("R42 destroyed original exterior or its R13 material")
    if len(new.polygons)!=EXTERIOR_FACES or any(len(f.vertices)!=4 for f in new.polygons):
        raise RuntimeError("R42 sealed original rolled bell")
    obj["R42_original_8_exterior_rings"]=EXTERIOR_RINGS
    obj["R42_removed_4_redundant_inner_rings"]=ORIGINAL_RINGS-EXTERIOR_RINGS
    obj["R42_original_object_preserved"]=True
    obj["R42_not_render_visibility_bypass"]=True
    scene["fsc_r42_revision"]=REVISION
    scene["fsc_r42_source_sha256"]=SOURCE_SHA256
    scene["fsc_r42_exterior_quads"]=EXTERIOR_FACES
    scene["fsc_r42_removed_duplicate_quads"]=ORIGINAL_FACES-EXTERIOR_FACES
    scene["fsc_r42_genuine_open_nozzle_preserved"]=True
    scene["fsc_r42_original_scene_objects_preserved"]=True
