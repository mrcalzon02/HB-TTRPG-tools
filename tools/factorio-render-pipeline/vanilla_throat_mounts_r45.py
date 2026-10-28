"""R45: source-constrained throat aperture collar and top feed mount castings.

The exact original 264x542 Factorio Space Age body frame shows a serrated,
dark segmented throat transition behind the hanging fins and rectangular
flanges surrounding two upper corrugated feed mouths. R44 still has a smooth
round baffle and round feed collars. Shape only those THREE already present
R11/R15 physical meshes; neither original Wube CAD nor arbitrary invisible
load paths are asserted. Preserve existing mesh/face counts, materials,
original 13-ring open R11 refractory, R42 outer rolled shell, 64-frame
animations, camera, and separate sprite effects.
"""
import math

REVISION = "R45_source_visible_aperture_castellations_and_upper_mounts"
SOURCE_SHA256 = "0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
SIDES = 40
PROFILE_SAMPLES = 8
THROAT_NAME = "R11_recessed_internal_pressure_baffle_01"
UPPER_NAMES = ("R15_bellows_end_collar_port_1",
               "R15_bellows_end_collar_starboard_1")
THROAT_RING_CENTER = (0., -2.70, -.43)
THROAT_RING_MAJOR_RADIUS = 1.02
THROAT_ALTERNATING_RELIEF = .047
THROAT_RELIEF_BASE = -.010
THROAT_MINOR_RADIAL_SCALE = 1.34
THROAT_AXIAL_WIDTH_SCALE = 1.65
MOUNT_RADIAL_SCALE = 1.20
MOUNT_SQUARE_FACTOR = .74
MOUNT_AXIAL_SCALE = 1.40

def squared_radius_factor(angle):
    """Square-shouldered ring profile using original 40 radial mesh sectors."""
    c=max(abs(math.cos(angle)),abs(math.sin(angle)))
    return MOUNT_RADIAL_SCALE * (1. + MOUNT_SQUARE_FACTOR*(1./c-1.))

def throat_sector_offset(sector):
    """Castellated physical collar, not 40 separate speculative fasteners."""
    return THROAT_RELIEF_BASE + (THROAT_ALTERNATING_RELIEF if sector%2==0 else 0.)

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    import bpy
    from vanilla_axial_patina_r44 import REVISION as R44_REV
    from vanilla_legacy_bell_trim_r42 import EXTERIOR_FACES
    if scene.get("fsc_r44_revision")!=R44_REV:
        raise RuntimeError("R45 requires saved R44 refractory source contract")
    before_objs={o.name for o in scene.objects}
    before_materials=set(bpy.data.materials.keys())
    liner=bpy.data.objects.get("R11_OPEN_DEEP_REFRACTORY_THROAT")
    exterior=bpy.data.objects.get("vanilla_reference_bell_bronzed_rolled_bell")
    if not liner or not exterior or not liner.get("R11_open_no_endcaps"):
        raise RuntimeError("R45 must preserve original open aperture and exterior")
    liner_id=liner.data.as_pointer()
    exterior_id=exterior.data.as_pointer()
    if len(liner.data.polygons)!=480 or len(exterior.data.polygons)!=EXTERIOR_FACES:
        raise RuntimeError("R45 original open nozzle topology changed")

    target=bpy.data.objects.get(THROAT_NAME)
    if (target is None or target.type!="MESH" or target.parent!=root or
        len(target.data.vertices)!=SIDES*PROFILE_SAMPLES or
        len(target.data.polygons)!=SIDES*PROFILE_SAMPLES or
        len(target.data.materials)!=1 or
        target.data.materials[0].name!="R13_heat_aged_pressure_alloy"):
        raise RuntimeError("R45 original R11 recessed pressure baffle missing")
    if target.animation_data or target.data.shape_keys:
        raise RuntimeError("R45 may not retime or remesh animated nozzle")
    target_mesh=target.data.as_pointer()
    target_material=target.data.materials[0].as_pointer()
    for sector in range(SIDES):
        angle=sector*math.tau/SIDES
        radial_offset=throat_sector_offset(sector)
        for tube_step in range(PROFILE_SAMPLES):
            idx=sector*PROFILE_SAMPLES+tube_step
            v=target.data.vertices[idx]
            x,y,z=tuple(v.co)
            old_radius=math.hypot(x,z-THROAT_RING_CENTER[2])
            if abs(y-THROAT_RING_CENTER[1])>.034 or abs(old_radius-THROAT_RING_MAJOR_RADIUS)>.034:
                raise RuntimeError("R45 baffle original physical ring coordinates drifted")
            minor_radial=old_radius-THROAT_RING_MAJOR_RADIUS
            radius=THROAT_RING_MAJOR_RADIUS + (
                minor_radial*THROAT_MINOR_RADIAL_SCALE + radial_offset)
            if radius<=.85:
                raise RuntimeError("R45 would obstruct the open throat bore")
            v.co=(radius*math.cos(angle),
                  THROAT_RING_CENTER[1]+(y-THROAT_RING_CENTER[1])*THROAT_AXIAL_WIDTH_SCALE,
                  THROAT_RING_CENTER[2]+radius*math.sin(angle))
    target.data.update()
    if (target.data.as_pointer()!=target_mesh or
        target.data.materials[0].as_pointer()!=target_material):
        raise RuntimeError("R45 substituted the source baffle mesh/material")
    target["R45_existing_castellated_baffle"]=True
    target["R45_no_new_pressure_apertures"]=True

    mounts=[]
    for label in UPPER_NAMES:
        ob=bpy.data.objects.get(label)
        if (ob is None or ob.type!="MESH" or ob.parent!=root or
            len(ob.data.vertices)!=SIDES*PROFILE_SAMPLES or
            len(ob.data.polygons)!=SIDES*PROFILE_SAMPLES or
            len(ob.data.materials)!=1 or
            ob.data.materials[0].name!="R15_blackened_cast_pressure_flange" or
            ob.animation_data or ob.data.shape_keys):
            raise RuntimeError("R45 existing original upper feed flange missing: "+label)
        mesh_id=ob.data.as_pointer()
        mat_id=ob.data.materials[0].as_pointer()
        xs=[v.co.x for v in ob.data.vertices]
        ys=[v.co.y for v in ob.data.vertices]
        zs=[v.co.z for v in ob.data.vertices]
        center_x=(min(xs)+max(xs))/2
        center_y=(min(ys)+max(ys))/2
        center_z=(min(zs)+max(zs))/2
        if abs(center_y-1.80)>.002 or abs(abs(center_x)-.86)>.005:
            raise RuntimeError("R45 unexpected twin top mount location")
        for sector in range(SIDES):
            angle=sector*math.tau/SIDES
            scale=squared_radius_factor(angle)
            for step in range(PROFILE_SAMPLES):
                v=ob.data.vertices[sector*PROFILE_SAMPLES+step]
                v.co=(center_x+(v.co.x-center_x)*scale,
                      center_y+(v.co.y-center_y)*MOUNT_AXIAL_SCALE,
                      center_z+(v.co.z-center_z)*scale)
        ob.data.update()
        if (ob.data.as_pointer()!=mesh_id or
            ob.data.materials[0].as_pointer()!=mat_id or
            len(ob.data.polygons)!=SIDES*PROFILE_SAMPLES):
            raise RuntimeError("R45 upper feed mounting infrastructure lost")
        ob["R45_existing_upper_square_feed_mount"]=True
        ob["R45_no_added_unsupported_pistons"]=True
        mounts.append(label)
    if {o.name for o in scene.objects}!=before_objs or set(bpy.data.materials.keys())!=before_materials:
        raise RuntimeError("R45 invented/discarded nozzle or mount components")
    if liner.data.as_pointer()!=liner_id or exterior.data.as_pointer()!=exterior_id:
        raise RuntimeError("R45 altered original throat/exterior identities")
    scene["fsc_r45_revision"]=REVISION
    scene["fsc_r45_source_sha256"]=SOURCE_SHA256
    scene["fsc_r45_source_visible_castellated_ring_count"]=1
    scene["fsc_r45_existing_square_feed_mounts"]=len(mounts)
    scene["fsc_r45_original_aperture_open_preserved"]=True
    scene["fsc_r45_original_mount_geometry_not_added"]=True
    scene["fsc_r45_original_cam_lights_fins_guards_untouched"]=True
    scene["fsc_r45_needs_exact_source_visual_acceptance"]=True
