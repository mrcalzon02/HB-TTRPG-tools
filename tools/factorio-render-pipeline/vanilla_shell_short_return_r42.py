"""R42 candidate: repair historic outer bell's overdeep inward return.

R41 SAVED-camera raycast found vanilla_reference_bell_bronzed_rolled_bell
first hit 191/234 native upper-nozzle pixels, occluding the genuine R11/R19
refractory. Its old R04 lathe has 12 rings: 8 real outer rolled bell rings,
followed by FOUR deep inward-return rings that cross the open combustion
path. Keep the 8 legitimate outer rings, but roll the same FOUR last
rings into a tight annular return near its mouth instead of projecting
through the visual bore. Do not hide/delete the bell or add parts.

This is a candidate source-proxy mesh revision, not original Wube CAD.
"""
import math
REVISION="R42_short_real_rolled_bell_inner_return_not_missing_shell"
ORIGINAL_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
NAME="vanilla_reference_bell_bronzed_rolled_bell"
RINGS=12
SIDES=40
AXIS_Z=-.43
CURLED_RETURN_RADIAL_LOSS=(.025,.047,.066,.079)
CURLED_RETURN_Y_DROP=(.01,.024,.045,.070)

def returned_rim(point,lip_y,lip_radius,turn):
    if not 0<=turn<4:
        raise IndexError("R42 internal return has exactly 4 original rings")
    x,_,z=point
    radius=math.hypot(x,z-AXIS_Z)
    if radius<.1 or lip_radius-CURLED_RETURN_RADIAL_LOSS[turn]<1.25:
        raise ValueError("R42 mouth fold crossed original open combustion bore")
    r=lip_radius-CURLED_RETURN_RADIAL_LOSS[turn]
    scale=r/radius
    return (x*scale,lip_y-CURLED_RETURN_Y_DROP[turn],
            AXIS_Z+(z-AXIS_Z)*scale)

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):return
    import bpy
    shell=bpy.data.objects.get(NAME)
    liner=bpy.data.objects.get("R11_OPEN_DEEP_REFRACTORY_THROAT")
    if shell is None or liner is None:
        raise RuntimeError("R42 must repair real R41 identified bell shell")
    mesh=shell.data
    if len(mesh.vertices)!=RINGS*SIDES or len(mesh.polygons)!=(RINGS-1)*SIDES:
        raise RuntimeError("R42 original 12x40 mesh topology missing")
    if not liner.get("R11_open_no_endcaps"):
        raise RuntimeError("R42 must not operate with a sealed old bore")
    before={ob.name for ob in scene.objects}
    mesh_ptr=mesh.as_pointer()
    original_material=mesh.materials[0].as_pointer()
    original_rims=[tuple(v.co) for v in mesh.vertices[:8*SIDES]]
    for k in range(SIDES):
        lip=mesh.vertices[7*SIDES+k].co
        radius=math.hypot(lip.x,lip.z-AXIS_Z)
        for t in range(4):
            v=mesh.vertices[(8+t)*SIDES+k]
            v.co=returned_rim(v.co,lip.y,radius,t)
    mesh.update()
    if len(mesh.polygons)!=(RINGS-1)*SIDES:
        raise RuntimeError("R42 added closed endcap to source bell")
    if [tuple(v.co) for v in mesh.vertices[:8*SIDES]]!=original_rims:
        raise RuntimeError("R42 modified original visible outer bell shape")
    if mesh.as_pointer()!=mesh_ptr or mesh.materials[0].as_pointer()!=original_material:
        raise RuntimeError("R42 substituted original physical bell or shader")
    if {ob.name for ob in scene.objects}!=before:
        raise RuntimeError("R42 deleted/added visible engine parts")
    shell["R42_true_rolled_lip_not_deep_opaque_inner_cap"]=True
    shell["R42_original_outer_8_rings_preserved"]=True
    shell["R42_reused_existing_four_inner_return_rings"]=True
    scene["fsc_r42_revision"]=REVISION
    scene["fsc_r42_original_sha256"]=ORIGINAL_SHA256
    scene["fsc_r42_original_outer_shell_object"]=NAME
    scene["fsc_r42_same_material_and_face_count"]=True
    scene["fsc_r42_source_candidate_requires_render"]=True
