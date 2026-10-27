"""R20: remove a real sealed mesh cap that masks deep nozzle detail.

R08 originally builds an internal reaction drum using the generic lathe
default with two N-gon endcaps. The outboard-drum sleeve should remain,
but a solid disk in its axial path defeats R11's later open-throat intent
and hides R19's inner refractory strakes. Correct the legacy mesh itself;
do not disable rendering or add a workaround overlay.
Calibration vanilla ONLY; no Tech Priests production meshes or art altered.
"""
import bpy

REVISION="R20_open_old_reaction_drum_keep_depth"
def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    obj=bpy.data.objects.get("R08_aft_internal_reaction_drum")
    if obj is None or obj.type!="MESH":
        raise RuntimeError("R20 cannot locate legacy reaction drum")
    old=obj.data
    quads=[tuple(f.vertices) for f in old.polygons if len(f.vertices)==4]
    caps=[f for f in old.polygons if len(f.vertices)!=4]
    if len(caps)!=2 or len(quads)!=200:
        raise RuntimeError("R20 expected exactly 2 sealed endcaps and 200 side quads")
    vertices=[tuple(v.co) for v in old.vertices]
    replacement=bpy.data.meshes.new(old.name+"_R20_open_axial_shell")
    replacement.from_pydata(vertices,[],quads)
    replacement.update()
    for mat in old.materials:
        replacement.materials.append(mat)
    obj.data=replacement
    for face in replacement.polygons:face.use_smooth=True
    if old.users==0:bpy.data.meshes.remove(old)
    obj["R20_legacy_cap_faces_removed"]=len(caps)
    obj["R20_retained_side_wall_quads"]=len(quads)
    obj["R20_no_obstruction_of_deep_R19_liner"]=True

    # Keep inner ribs as material-level oxidized steel, not emissive grooves.
    mat=bpy.data.materials.new("R20_inner_oxidized_strake_contrast")
    mat.use_nodes=True
    mat.diffuse_color=(.079,.073,.064,1)
    bs=mat.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value=(.079,.073,.064,1)
    bs.inputs["Metallic"].default_value=.32
    bs.inputs["Roughness"].default_value=.86
    count=0
    for i in range(40):
        bar=bpy.data.objects.get("R19_DEEP_COMBUSTOR_STRAKE_%02d"%i)
        if bar is None or bar.type!="CURVE" or not bar.data.materials:
            raise RuntimeError("R20 requires R19's full deep cone strakes")
        bar.data.materials[0]=mat
        count+=1
    scene["fsc_r20_revision"]=REVISION
    scene["fsc_r20_reaction_drum_removed_caps"]=len(caps)
    scene["fsc_r20_reaction_drum_open_quads"]=len(quads)
    scene["fsc_r20_revealed_inner_strakes"]=count
    scene["fsc_r20_glow_not_geom"]=True
