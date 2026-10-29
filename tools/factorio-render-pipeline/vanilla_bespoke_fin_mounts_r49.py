"""R49: relocate fin roots onto three BESPOKE source-visible upper mounts.

User's original 264x542 Factorio 2.0.77 thruster atlas, verified SHA below,
shows separate port/central/starboard castings ABOVE the dark recessed
annular band. The upper heat-stained plates start beneath those distinct
flanged castings, NOT from a common circular ring at y=-2.34.

R47/R48 extended/tapered metal but left all their root coordinates fixed at
the WRONG nozzle ring. Do not stretch further from that false attachment.
This pass repositions five source-facing R21 sheets' ORIGINAL proximal rows
for a longer REAL root-to-tip span, maintains their distal y envelope, and
builds ONLY three independently shaped, directly contacting cast attachment
shoes identifiable in the original sprite. No identical all-around machinery.
The four source-measured animated lower sheets stay untouched; fins retain
their R21 punched slots and original heat-color data. No camera, lights,
bell rim, ring, shader, or sprite-overlay cheats. This is inverse-projection
candidate geometry, not a claim of recovered original Factorio source CAD.
"""
import math

REVISION="R49_source_specific_upper_fins_and_bespoke_mounts"
SOURCE_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
FIN_COLLECTION="R11_OUTBOARD_SUSPENDED_AFTERBURNERS"
CAST_COLLECTION="R49_SOURCE_OBSERVED_THREE_UPPER_CAST_MOUNTS"
OLD_ROOT_Y=-2.34
AXIS_Z=-.43
# Native source shows distinct mounting sites and unequal fin profiles.
# Each tuple = new upstream attachment-Y, longitudinal bow, radial camber,
# lateral twist (radians at midspan); only first 5 visible upper fins.
UPPER_FIN_PROFILES={
    0:(-1.96,-.07,.035,-.014),  # outer port edge, partly obscured
    1:(-1.62,-.09,.088,-.020),  # broad right-of-center shaped plate
    2:(-1.44,-.12,.068,.005),   # central plate under two short bridge ears
    3:(-1.73,-.055,.108,.026), # canted left plate under angled casting
    4:(-1.87,-.035,.045,.014),  # outer starboard edge, partly obscured
}
OBSERVED_MOUNTS=(1,2,3)
# Proximal station offsets (forward of fin root), radius of actual source
# castings, angular spread, asymmetric angular taper. Distinct row counts,
# widths, slopes and angular biases: not ten identical braces.
MOUNT_STATIONS={
  1:((.81,1.22,.108,-.024),(.57,1.34,.145,-.012),
     (.31,1.51,.168,.008),(.11,1.68,.130,.014),(-.075,1.746,.102,.0)),
  2:((.93,1.14,.137,.009),(.72,1.28,.166,.010),
     (.47,1.42,.194,.004),(.23,1.57,.179,-.006),
     (.07,1.69,.139,.004),(-.085,1.746,.117,.0)),
  3:((.78,1.21,.126,.035),(.49,1.34,.148,.031),
     (.28,1.51,.156,.016),(.09,1.68,.143,.008),
     (-.065,1.746,.108,.0)),
}
CAST_MATERIAL_NAME="R16_oxidized_load_bearing_clevis"
SHEET_COUNT=5
ROOT_MIN_EXTENSION=.38

def reposition_sheet_point(point,index,old_tip):
    """Root advances onto an individual casting; tip stays at R47 extent."""
    if index not in UPPER_FIN_PROFILES:
        raise ValueError("R49 never retimes source-animated lower sheets")
    x,y,z=point
    new_root,bow,camber,twist=UPPER_FIN_PROFILES[index]
    if old_tip>=OLD_ROOT_Y-.8:
        raise ValueError("R49 expected original long R47 sheet")
    t=max(0.,min(1.,(OLD_ROOT_Y-y)/(OLD_ROOT_Y-old_tip)))
    arc=math.sin(math.pi*t)
    new_y=new_root+(old_tip-new_root)*t+bow*arc
    radial=math.hypot(x,z-AXIS_Z)
    angle=math.atan2(z-AXIS_Z,x)+twist*arc
    new_radial=radial+camber*arc
    return (new_radial*math.cos(angle),new_y,
            AXIS_Z+new_radial*math.sin(angle))

def casting_geometry(index):
    """Two-skinned formed castings connecting upper chassis to moved root."""
    if index not in MOUNT_STATIONS:
        raise ValueError("No invented unseen mounts for ten radial slots")
    rows=MOUNT_STATIONS[index]
    root_y=UPPER_FIN_PROFILES[index][0]
    theta=math.tau*(index+.5)/10
    lateral=(-1.,-.64,0.,.61,1.)
    vertices=[]
    for skin in (-1,1):
        for yy,radial,half,skew in rows:
            for u in lateral:
                a=theta+skew+half*u
                # Differential cast thickness is real physical surface relief.
                ridge=.025*(1.-abs(u))+.013*(1.-abs(u))**2
                r=radial+ridge+.050*skin
                vertices.append((r*math.cos(a),root_y+yy,
                                 AXIS_Z+r*math.sin(a)))
    cols=len(lateral)
    half_n=len(rows)*cols
    faces=[]
    for row in range(len(rows)-1):
        for col in range(cols-1):
            a=row*cols+col
            faces.append((a,a+cols,a+cols+1,a+1))
            faces.append((half_n+a,half_n+a+1,
                          half_n+a+cols+1,half_n+a+cols))
    for row in range(len(rows)-1):
        for col in (0,cols-1):
            a=row*cols+col
            faces.append((a,half_n+a,half_n+a+cols,a+cols))
    for row in (0,len(rows)-1):
        for col in range(cols-1):
            a=row*cols+col
            faces.append((a,a+1,half_n+a+1,half_n+a))
    return vertices,faces

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    import bpy
    from vane_layout_r22 import VANE_COUNT
    from vanilla_broader_fins_rearward_collar_r48 import REVISION as R48_REV
    from vanilla_deep_aperture_and_long_fins_r47 import REVISION as R47_REV
    if (VANE_COUNT!=10 or scene.get("fsc_r47_fin_root_fixed") is not True or
        scene.get("fsc_r18_revision") is not None or
        scene.get("fsc_r48_fins_widened")!=5 or
        scene.get("fsc_r47_revision") is not None):
        # R47 overall revision property appears later in the build at
        # bevel_aperture(), so test ONLY R47 fin-stage marker here.
        raise RuntimeError("R49 must follow R48 on original R47 meshes, before R18 keys")
    fins=bpy.data.collections.get(FIN_COLLECTION)
    if fins is None or bpy.data.collections.get(CAST_COLLECTION):
        raise RuntimeError("R49 original fin population or mount collection invalid")
    before={o.name for o in scene.objects}
    fin_signatures={}
    displaced=[]
    for i in range(VANE_COUNT):
        ob=fins.objects.get(f"R11_SUSPENDED_AFTERBURNER_VANE_{i:02d}")
        if (ob is None or len(ob.data.vertices)!=220 or
            ob.data.color_attributes.get("R21_heat_tint") is None or
            ob.data.shape_keys or ob.animation_data):
            raise RuntimeError("R49 cannot replace original slotted color sheets")
        sig=(ob.data.as_pointer(),len(ob.data.polygons),
             tuple(mat.as_pointer() for mat in ob.data.materials))
        fin_signatures[ob.name]=sig
        if i>=SHEET_COUNT:
            continue
        if not ob.get("R48_existing_formed_metal_face_widened"):
            raise RuntimeError("R49 requires actual R48 formed upper panels")
        old_tip=ob.data.vertices[9*11].co.y
        old_root=ob.data.vertices[0].co.y
        if abs(old_root-OLD_ROOT_Y)>.002:
            raise RuntimeError("R49 refuses moved original R48 fin roots")
        if UPPER_FIN_PROFILES[i][0]-old_root<ROOT_MIN_EXTENSION:
            raise RuntimeError("R49 source root not far enough forward of old ring")
        for v in ob.data.vertices:
            v.co=reposition_sheet_point(tuple(v.co),i,old_tip)
        ob.data.update()
        if (abs(ob.data.vertices[0].co.y-UPPER_FIN_PROFILES[i][0])>.002 or
            abs(ob.data.vertices[99].co.y-old_tip)>.002):
            raise RuntimeError("R49 source upstream root or distal tip position invalid")
        ob["R49_bespoke_mount_root_y"]=UPPER_FIN_PROFILES[i][0]
        ob["R49_old_ring_root_y_superseded"]=OLD_ROOT_Y
        ob["R49_longer_actually_attached_span"]=True
        ob["R49_unique_rig_geometry_not_copied"]=True
        displaced.append(i)
    if displaced!=list(range(SHEET_COUNT)):
        raise RuntimeError("R49 could not reposition all visible upper sheets")
    for label,sig in fin_signatures.items():
        ob=fins.objects[label]
        if (ob.data.as_pointer(),len(ob.data.polygons),
            tuple(mat.as_pointer() for mat in ob.data.materials))!=sig:
            raise RuntimeError("R49 destroyed original sheet/slot/pigment topology")

    material=bpy.data.materials.get(CAST_MATERIAL_NAME)
    if material is None or not material.use_nodes:
        raise RuntimeError("R49 cannot invent new beige mounting casting material")
    mount_group=bpy.data.collections.new(CAST_COLLECTION)
    scene.collection.children.link(mount_group)
    mount_count=0
    for i in OBSERVED_MOUNTS:
        vertices,faces=casting_geometry(i)
        mesh=bpy.data.meshes.new(f"R49_BESPOKE_CAST_MOUNT_{i:02d}_mesh")
        mesh.from_pydata(vertices,[],faces)
        mesh.update()
        mesh.materials.append(material)
        ob=bpy.data.objects.new(f"R49_BESPOKE_CAST_MOUNT_{i:02d}",mesh)
        mount_group.objects.link(ob)
        ob.parent=root
        for face in mesh.polygons:
            face.use_smooth=False
        bevel=ob.modifiers.new("Source formed nonidentical cast edges","BEVEL")
        bevel.width=.018
        bevel.segments=2
        ob["R49_source_visible_not_hidden_actuator"]=True
        ob["R49_original_fin_index"]=i
        ob["R49_connected_sheet_root_y"]=UPPER_FIN_PROFILES[i][0]
        ob["R49_no_animating_unverified_hinge"]=True
        mount_count+=1
    added={o.name for o in scene.objects}-before
    expected={f"R49_BESPOKE_CAST_MOUNT_{i:02d}" for i in OBSERVED_MOUNTS}
    if added!=expected or len(mount_group.objects)!=3:
        raise RuntimeError("R49 spawned unverified per-fin repeated mounts")
    if len({len(mount_group.objects[n].data.vertices) for n in expected})!=2:
        raise RuntimeError("R49 three observed castings have no distinct topology")
    scene["fsc_r49_revision"]=REVISION
    scene["fsc_r49_source_sha256"]=SOURCE_SHA256
    scene["fsc_r49_original_fin_root_station_superseded"]=OLD_ROOT_Y
    scene["fsc_r49_distinct_source_mount_count"]=mount_count
    scene["fsc_r49_five_original_upper_sheets_reanchored"]=len(displaced)
    scene["fsc_r49_materials_preserved_not_new"]=True
    scene["fsc_r49_64_frame_lower_morph_keys_not_yet_authored"]=True
    scene["fsc_r49_ignores_unverified_hidden_circumferential_mounts"]=True
    scene["fsc_r49_art_source_is_inverse_projection_not_recovered_cad"]=True
