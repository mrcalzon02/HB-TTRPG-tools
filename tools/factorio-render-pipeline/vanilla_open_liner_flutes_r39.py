"""R39: mold physical longitudinal cooling flutes into the EXISTING R11 liner.

Original source frame 00 reveals deep longitudinal ribs in upper cone which
remain invisible in R37/R38 despite extending the independent R19 strakes.
R11's source-rendered physical bell wall remains completely round/smoothed,
so smooth normals cannot pick up real upper circumferential rib relief.

Reshape ONLY the 13-ring x 40-segment existing open-liner MESH (no new face,
part, texture, material, keyframe, camera, glow, or cap). Twenty flutes are
representable at its current segment resolution: alternate inward channel
vertices with unchanged radial crest vertices, tapered axially away from
both ends so the mouth and deep opening stay exactly the same dimensions.
Make only fluted-band quads faceted to express sculpted metal normals.
This is inverse-projection geometry, not original recovered CAD.
"""
import math
REVISION="R39_physically_fluted_original_open_refractory_liner"
ORIGINAL_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
SIDES=40
RINGS=13
AXIS_Z=-.43
CHANNEL_DEPTH=.062
AXIAL_PROFILE=(0.,0.,.16,.5,.84,1.,1.,.90,.74,.40,0.,0.,0.)
FLUTE_COUNT=SIDES//2

def shaped_point(point,ring,segment):
    if ring<0 or ring>=RINGS or segment<0 or segment>=SIDES:
        raise IndexError("R39 original R11 liner vertex outside known lathe")
    x,y,z=point
    r=math.hypot(x,z-AXIS_Z)
    if r<.105:
        raise ValueError("R39 must preserve open central nozzle bore")
    inset=CHANNEL_DEPTH*AXIAL_PROFILE[ring] if segment%2==0 else 0.
    if r-inset<=.1:
        raise ValueError("R39 may not cross the original inner-wall axis")
    t=(r-inset)/r
    return (x*t,y,AXIS_Z+(z-AXIS_Z)*t)

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):return
    import bpy
    throat=bpy.data.objects.get("R11_OPEN_DEEP_REFRACTORY_THROAT")
    drum=bpy.data.objects.get("R08_aft_internal_reaction_drum")
    if (throat is None or not throat.get("R11_open_no_endcaps") or
        drum is None or throat.data.materials[0] is not drum.data.materials[0]):
        raise RuntimeError("R39 only works on original R11 open R13-shared liner")
    mesh=throat.data
    if len(mesh.vertices)!=RINGS*SIDES or len(mesh.polygons)!=(RINGS-1)*SIDES:
        raise RuntimeError("R39 unexpected original R11 open 13-ring topology")
    if mesh.shape_keys is not None or throat.animation_data:
        raise RuntimeError("R39 may not change independently moving nozzle parts")
    before={ob.name for ob in scene.objects}
    owned=mesh.as_pointer()
    old_material=mesh.materials[0].as_pointer()
    for ring in range(RINGS):
        for segment in range(SIDES):
            idx=ring*SIDES+segment
            original=mesh.vertices[idx].co
            edited=shaped_point(original,ring,segment)
            mesh.vertices[idx].co=edited
    facets=0
    for polygon in mesh.polygons:
        ring=polygon.index//SIDES
        if 2<=ring<=9:
            polygon.use_smooth=False
            facets+=1
    mesh.update()
    if facets!=8*SIDES:
        raise RuntimeError("R39 upper textured band physical facets not made")
    if {ob.name for ob in scene.objects}!=before:
        raise RuntimeError("R39 added new hardware")
    if mesh.as_pointer()!=owned or mesh.materials[0].as_pointer()!=old_material:
        raise RuntimeError("R39 substituted source mesh/shared material")
    if len(mesh.polygons)!=(RINGS-1)*SIDES:
        raise RuntimeError("R39 sealed the originally open bell")
    for ring in (0,1,10,11,12):
        if AXIAL_PROFILE[ring]!=0:
            raise RuntimeError("R39 would change shell mouth/axial outlet rim")
    throat["R39_actual_inner_flutes"]=FLUTE_COUNT
    throat["R39_open_no_endcaps_preserved"]=True
    throat["R39_subdivided_only_original_faces"]=True
    throat["R39_source_candidate_not_recovered_CAD"]=True
    scene["fsc_r39_revision"]=REVISION
    scene["fsc_r39_original_sha256"]=ORIGINAL_SHA256
    scene["fsc_r39_ribbed_inner_open_liner"]=True
    scene["fsc_r39_reused_original_mesh_and_R13_shader"]=True
    scene["fsc_r39_original_face_count"]=len(mesh.polygons)
    scene["fsc_r39_fluted_quads"]=facets
    scene["fsc_r39_source_pixels_not_committed"]=True
    scene["fsc_r39_no_new_geometry_or_glow"]=True
