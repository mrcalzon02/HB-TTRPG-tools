"""R47: source-directed long upper heat tabs and deep physically beveled mouth.

Operator correction: upper heat-stained metal fins should be roughly twice
their current visible longitudinal length; the source side cuts are at the
position currently occupied by the bright brass rim, but the *mouth bevel*
continues deeper. The large circular arc must not stay across the fin faces;
retain existing ring as a recessed, oxidized metal mouth termination.

Change only the ORIGINAL R21 five upper sheet meshes BEFORE R18 lower
shape-key animation, the ORIGINAL R42 8-ring open exterior bell, the ORIGINAL
R11 13-ring open refractory wall, R45 existing castellated baffle and the
existing R04 rolled lip torus. Never add ring duplicates, flat caps, image
plane cheats, source textures, forced visibility or camera/lighting overrides.
Source-matched VISUAL accept/reject still requires actual 264x542 frames.
"""
import math

REVISION="R47_extended_source_fins_and_rolled_deep_aperture"
SOURCE_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
SEGMENTS=40
UPPER_SHEETS=5
FIN_ROOT_Y=-2.34
UPPER_LENGTH_MULTIPLIER=1.90
BELL_AXIS_Z=-.43
# Keep R42 exterior corner at original short-side cut; extend its actual
# 8th ring into a much longer, tapered bevel, without adding bell faces.
ORIGINAL_EXTERIOR_LAST_Y=-3.025
BEVELED_EXTERIOR_LAST_Y=-3.47
ORIGINAL_LINER_MOUTH_Y=-3.27
ORIGINAL_LINER_SECOND_Y=-3.19
BEVELED_LINER_MOUTH_Y=-3.54
BEVELED_LINER_SECOND_Y=-3.34
# R04 brass torus was crossing the hanging plates. Reposition the SAME
# real ring at the exhaust end and use the existing R13 oxidized shell
# shader. Never remove its load-bearing/profile role or duplicate it.
ROLLED_LIP_NAME="vanilla_reference_bell_rolled_lip"
ROLLED_LIP_OLD_CENTER_Y=-2.985
ROLLED_LIP_NEW_CENTER_Y=-3.47
ROLLED_LIP_OLD_MAJOR_RADIUS=1.4994
ROLLED_LIP_NEW_MAJOR_RADIUS=1.425
ROLLED_LIP_MATERIAL="R13_oxidized_rough_nozzle_shell"
# R46 saved-camera isolation proved the old baffle renders 2,621 alpha px
# alone but affects only 633 assembled ROI pixels. Move the SAME castellated
# R45 ring toward the physical bevel rather than adding another hidden one.
CASTELLATED_BAFFLE="R11_recessed_internal_pressure_baffle_01"
BAFFLE_OLD_CENTER_Y=-2.70
BAFFLE_NEW_CENTER_Y=-3.245
BAFFLE_OLD_MAJOR_RADIUS=1.02
BAFFLE_NEW_MAJOR_RADIUS=1.335

def deeper_fin_y(y):
    return FIN_ROOT_Y+(y-FIN_ROOT_Y)*UPPER_LENGTH_MULTIPLIER

def deeper_lip_profile(y,ring_index):
    if ring_index==0:return BEVELED_LINER_MOUTH_Y
    if ring_index==1:return BEVELED_LINER_SECOND_Y
    return y

def shift_torus_major(x,z,old_major,new_major):
    radial=math.hypot(x,z-BELL_AXIS_Z)
    if radial<.2:
        raise ValueError("R47 torus crossed its real combustion axis")
    radius=radial+(new_major-old_major)
    if radius<=.2:
        raise ValueError("R47 torus collapsed the original annular opening")
    ratio=radius/radial
    return x*ratio,BELL_AXIS_Z+(z-BELL_AXIS_Z)*ratio

def extend_fins(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    import bpy
    from vanilla_inner_fin_proportions_r35 import REVISION as R35_REV
    from vane_layout_r22 import VANE_COUNT
    if scene.get("fsc_r35_revision")!=R35_REV or scene.get("fsc_r18_revision") is not None:
        raise RuntimeError("R47 upper sheet extension must run after R35, BEFORE R18 keys")
    group=bpy.data.collections.get("R11_OUTBOARD_SUSPENDED_AFTERBURNERS")
    if group is None:
        raise RuntimeError("R47 missing original physical outboard heat tabs")
    start={o.name for o in scene.objects}
    population={}
    adjusted=0
    for i in range(VANE_COUNT):
        ob=group.objects.get(f"R11_SUSPENDED_AFTERBURNER_VANE_{i:02d}")
        if (ob is None or not ob.get("R35_planform_enlarged") or
            len(ob.data.vertices)!=220 or ob.data.shape_keys is not None or
            ob.animation_data is not None):
            raise RuntimeError("R47 cannot replace original R21 formed heat tabs")
        sig=(ob.data.as_pointer(),len(ob.data.polygons),
             tuple(mat.as_pointer() for mat in ob.data.materials))
        population[ob.name]=sig
        # Only source-visible upper trio plus partially hidden upper
        # circumference: do NOT extend the four source-measured animated
        # lower lips already matched to original y~529/511.
        if i>=UPPER_SHEETS:
            continue
        first=ob.data.vertices[0].co.y
        if abs(first-FIN_ROOT_Y)>.002:
            raise RuntimeError("R47 would move a sheet from its mounted root")
        previous_end=ob.data.vertices[(10-1)*11].co.y
        for v in ob.data.vertices:
            v.co.y=deeper_fin_y(v.co.y)
        ob.data.update()
        if (abs(ob.data.vertices[0].co.y-FIN_ROOT_Y)>.002 or
            abs((ob.data.vertices[99].co.y-FIN_ROOT_Y)/
                (previous_end-FIN_ROOT_Y)-UPPER_LENGTH_MULTIPLIER)>.002):
            raise RuntimeError("R47 source twofold fin reach not achieved")
        ob["R47_extended_original_upper_sheet"]=True
        ob["R47_upper_fin_reach_multiplier"]=UPPER_LENGTH_MULTIPLIER
        adjusted+=1
    if adjusted!=UPPER_SHEETS or start!={o.name for o in scene.objects}:
        raise RuntimeError("R47 changed original source fin population")
    if any(
        (group.objects[name].data.as_pointer(),len(group.objects[name].data.polygons),
         tuple(mat.as_pointer() for mat in group.objects[name].data.materials))!=sig
        for name,sig in population.items()):
        raise RuntimeError("R47 changed punched slot, topology or color materials")
    scene["fsc_r47_fin_root_fixed"]=True
    scene["fsc_r47_upper_long_sheets"]=adjusted
    scene["fsc_r47_fin_axial_multiplier"]=UPPER_LENGTH_MULTIPLIER
    scene["fsc_r47_no_lower_source_key_edits"]=True
    scene["fsc_r47_real_sheet_slots_preserved"]=True

def bevel_aperture(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    import bpy
    from vanilla_throat_mounts_r45 import REVISION as R45_REV
    from vanilla_legacy_bell_trim_r42 import EXTERIOR_FACES
    if scene.get("fsc_r45_revision")!=R45_REV or not scene.get("fsc_r47_fin_root_fixed"):
        raise RuntimeError("R47 requires R45 source mounts and extended physical fins")
    before={o.name for o in scene.objects}
    materials=set(bpy.data.materials.keys())
    exterior=bpy.data.objects.get("vanilla_reference_bell_bronzed_rolled_bell")
    liner=bpy.data.objects.get("R11_OPEN_DEEP_REFRACTORY_THROAT")
    torus=bpy.data.objects.get(ROLLED_LIP_NAME)
    baffle=bpy.data.objects.get(CASTELLATED_BAFFLE)
    mat=bpy.data.materials.get(ROLLED_LIP_MATERIAL)
    if any(ob is None or ob.type!="MESH" or ob.parent!=root
           for ob in (exterior,liner,torus,baffle)) or mat is None:
        raise RuntimeError("R47 missing an existing physical ring/bevel object")
    if (len(exterior.data.vertices)!=8*SEGMENTS or
        len(exterior.data.polygons)!=EXTERIOR_FACES or
        len(liner.data.vertices)!=13*SEGMENTS or
        len(liner.data.polygons)!=12*SEGMENTS or
        not liner.get("R11_open_no_endcaps") or
        len(torus.data.vertices)!=SEGMENTS*8 or
        len(torus.data.polygons)!=SEGMENTS*8 or
        len(baffle.data.vertices)!=SEGMENTS*8 or
        not baffle.get("R45_existing_castellated_baffle")):
        raise RuntimeError("R47 source open bevel/metal collar topology diverged")
    pointers={ob.name:ob.data.as_pointer() for ob in (exterior,liner,torus,baffle)}
    original_materials={ob.name:tuple(m.as_pointer() for m in ob.data.materials)
                        for ob in (exterior,liner,baffle)}
    original_liner_y=[liner.data.vertices[i*SEGMENTS].co.y for i in range(13)]
    if (abs(original_liner_y[0]-ORIGINAL_LINER_MOUTH_Y)>.003 or
        abs(original_liner_y[1]-ORIGINAL_LINER_SECOND_Y)>.003 or
        abs(exterior.data.vertices[7*SEGMENTS].co.y-ORIGINAL_EXTERIOR_LAST_Y)>.003):
        raise RuntimeError("R47 refused unknown R39/R42 source base dimensions")
    if any(ob.animation_data or ob.data.shape_keys for ob in (liner,exterior,torus,baffle)):
        raise RuntimeError("R47 refused moving nozzle shell without source evidence")

    # Last ring of original R42 shell forms a long cone wall BETWEEN the
    # existing side-cut crest (ring6) and the deep mouth edge (ring7).
    for i in range(SEGMENTS):
        v=exterior.data.vertices[7*SEGMENTS+i]
        v.co.y=BEVELED_EXTERIOR_LAST_Y
    exterior.data.update()
    for ring_idx in (0,1):
        for i in range(SEGMENTS):
            v=liner.data.vertices[ring_idx*SEGMENTS+i]
            v.co.y=deeper_lip_profile(v.co.y,ring_idx)
    liner.data.update()

    ys=[v.co.y for v in torus.data.vertices]
    if abs((max(ys)+min(ys))/2-ROLLED_LIP_OLD_CENTER_Y)>.003:
        raise RuntimeError("R47 original R04 brass ring has unexpected position")
    for v in torus.data.vertices:
        x,z=shift_torus_major(v.co.x,v.co.z,
                              ROLLED_LIP_OLD_MAJOR_RADIUS,
                              ROLLED_LIP_NEW_MAJOR_RADIUS)
        v.co=(x,v.co.y+ROLLED_LIP_NEW_CENTER_Y-ROLLED_LIP_OLD_CENTER_Y,z)
    torus.data.update()
    torus.data.materials[0]=mat
    torus["R47_same_ring_recessed_behind_fin_faces"]=True
    torus["R47_existing_R13_oxidized_shell_shader"]=True

    ys=[v.co.y for v in baffle.data.vertices]
    if abs((max(ys)+min(ys))/2-BAFFLE_OLD_CENTER_Y)>.003:
        raise RuntimeError("R47 original R45 castellated ring unexpected position")
    for v in baffle.data.vertices:
        x,z=shift_torus_major(v.co.x,v.co.z,
                              BAFFLE_OLD_MAJOR_RADIUS,
                              BAFFLE_NEW_MAJOR_RADIUS)
        v.co=(x,v.co.y+BAFFLE_NEW_CENTER_Y-BAFFLE_OLD_CENTER_Y,z)
    baffle.data.update()
    baffle["R47_existing_castellated_ring_moved_to_bevel"]=True

    if ({o.name for o in scene.objects}!=before or
        set(bpy.data.materials.keys())!=materials or
        any(ob.data.as_pointer()!=pointers[ob.name]
            for ob in (exterior,liner,torus,baffle)) or
        any(tuple(m.as_pointer() for m in ob.data.materials)!=original_materials[ob.name]
            for ob in (exterior,liner,baffle))):
        raise RuntimeError("R47 added/deleted source mesh or changed original shared material")
    if (len(exterior.data.polygons)!=EXTERIOR_FACES or
        len(liner.data.polygons)!=12*SEGMENTS or
        any(len(poly.vertices)!=4 for poly in liner.data.polygons)):
        raise RuntimeError("R47 closed the physically open original nozzle")
    scene["fsc_r47_revision"]=REVISION
    scene["fsc_r47_source_sha256"]=SOURCE_SHA256
    scene["fsc_r47_deep_liner_mouth_y"]=BEVELED_LINER_MOUTH_Y
    scene["fsc_r47_deep_exterior_last_y"]=BEVELED_EXTERIOR_LAST_Y
    scene["fsc_r47_recessed_R04_ring_y"]=ROLLED_LIP_NEW_CENTER_Y
    scene["fsc_r47_repositioned_R45_baffle_y"]=BAFFLE_NEW_CENTER_Y
    scene["fsc_r47_no_new_rings_meshes_cameras_lights_or_effects"]=True
    scene["fsc_r47_preserved_R18_lower_motion_and_R36_cups"]=True
    scene["fsc_r47_pending_exact_source_frame_comparison"]=True
