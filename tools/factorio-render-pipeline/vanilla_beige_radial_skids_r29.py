"""R29: source-oriented beige UNDERSLUNG clamshell shrouds.

The user's original Factorio 264×542 body frame depicts two LOWER OUTER
coverings that follow the CIRCUMFERENCE of the nozzle, sheltering internal
hot fins. Earlier R28 material wrongly transferred INNER FIN blue/purple
heat oxide to OUTER skid covers, and R28's shallow horizontal-ish cupping
still ignored the bell's radial inclination.

R29 replaces ONLY R28's existing two meshes, preserving their names and
objects, and uses the existing R16 beige inner ATTACHMENT material.
No new pistons, bolts, hinge parts, hidden shell backing or animation.
The measured 2D source alone does NOT establish exact unseen 3D topology.
"""
import math
import bpy

REVISION="R29_radially_wrapped_unburnt_beige_lower_shrouds"
ORIGINAL_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
# axial y, circumferential radius, OUTER lip degrees from lateral,
# INNER sheltered lip degrees from lateral, with 0=side and 90=bottom.
# Real source establishes wrapping and BEIGE material; these 3D control
# points remain explicit inverse-projection hypotheses to calibrate.
STATIONS=(
    (-1.61,1.67,31.,62.),
    (-1.94,1.75,30.,63.),
    (-2.28,1.84,28.,64.),
    (-2.60,1.86,27.,64.),
    (-2.91,1.88,27.,64.),
    (-3.17,1.84,28.,63.),
    (-3.40,1.77,30.,62.),
    (-3.57,1.71,32.,61.),
)
CIRCUMFERENCE_SAMPLES=(0.,.125,.25,.375,.5,.625,.75,.875,1.)
SHEET_THICKNESS=.036
BELLCENTER_Z=-.43
# R29.2 outer-lip correction from SOURCE silhouette: the original
# bell's external beige skid edge projects farther OUT than R29 did.
# Flare the OUTER rim only; the INNER sheltered lip stays where it is.
OUTER_LIP_FLARE=.36
SIDES=("port","starboard")
COLOR_ATTR="R29_beige_weathering_not_thermal_oxide"
SOURCE_MATERIAL_NAME="R16_oxidized_load_bearing_clevis"

def point(station,u,side,skin):
    y,r,outer_deg,inner_deg=station
    degrees=outer_deg+(inner_deg-outer_deg)*u
    theta=math.radians(degrees)
    # The plate is a true CYLINDRICAL/CONICAL ARCUATE segment around
    # engine local-Y. Its normal changes with θ; both underside faces
    # rotate rather than being a deformed globally level X/Z plane.
    radius=r+OUTER_LIP_FLARE*(1-u)*(1-u)+skin*SHEET_THICKNESS/2
    return (side*radius*math.cos(theta),y,
            BELLCENTER_Z-radius*math.sin(theta))

def mesh_data(side):
    rows=len(STATIONS);cols=len(CIRCUMFERENCE_SAMPLES)
    half=rows*cols
    vertices=[point(st,u,side,skin)
              for skin in (-1,1)
              for st in STATIONS
              for u in CIRCUMFERENCE_SAMPLES]
    polygons=[]
    for row in range(rows-1):
        for col in range(cols-1):
            q=row*cols+col
            polygons.append((q,q+cols,q+cols+1,q+1))
            polygons.append((half+q,half+q+1,
                             half+q+cols+1,half+q+cols))
    for row in range(rows-1):
        for col in (0,cols-1):
            q=row*cols+col
            polygons.append((q,half+q,half+q+cols,q+cols))
    for row in (0,rows-1):
        for col in range(cols-1):
            q=row*cols+col
            polygons.append((q,q+1,half+q+1,half+q))
    # Critical lighting correction: mirroring the original polygon
    # vertex positions across local X reverses winding. Without a
    # sign-dependent flip, the STARBOARD OUTER beige skin faces inward
    # and catches the wrong lighting, even though color/RGB is identical.
    # Keep INNER skin pointing inward and OUTER skin outward on BOTH sides.
    if side>0:
        polygons=[tuple(reversed(face)) for face in polygons]
    return vertices,polygons

def _beige_attachment_material():
    ref=bpy.data.materials.get(SOURCE_MATERIAL_NAME)
    if ref is None or not ref.use_nodes:
        raise RuntimeError("R29 must share EXISTING visible beige root casting material")
    shader=ref.node_tree.nodes.get("Principled BSDF")
    if shader is None:
        raise RuntimeError("R29 missing source-based beige attachment shader")
    rgba=shader.inputs["Base Color"].default_value
    # Material and its PBR roughness/metallic match the already built
    # beige inner attachment castings, NOT the scorching inner fin shader.
    material=ref.copy()
    material.name="R29_large_underskid_beige_same_as_root_castings"
    return material,tuple(float(v) for v in rgba[:3])

def _replace_existing_cover(obj,side,material,beige):
    v,f=mesh_data(side)
    old=obj.data
    mesh=bpy.data.meshes.new(obj.name+"_R29_circumferential_beige_shell")
    mesh.from_pydata(v,[],f)
    mesh.update()
    mesh.materials.append(material)
    paint=mesh.color_attributes.new(
        name=COLOR_ATTR,type="FLOAT_COLOR",domain="CORNER")
    for face in mesh.polygons:
        face.use_smooth=False
        for li in face.loop_indices:
            idx=mesh.loops[li].vertex_index%(len(STATIONS)*len(CIRCUMFERENCE_SAMPLES))
            row,col=divmod(idx,len(CIRCUMFERENCE_SAMPLES))
            # The material itself remains matching beige. This unconnected
            # color attribute is purely a readable QA/provenance record.
            # There is NO blue, purple, pink or glowing skid-tip gradient.
            paint.data[li].color=(*beige,1.0)
    obj.data=mesh
    if old.users==0:
        bpy.data.meshes.remove(old)
    obj["R29_bell_radial_wrap"]=True
    obj["R29_underside_only"]=True
    obj["R29_no_outer_heat_damage"]=True
    obj["R29_root_casting_material_match"]=SOURCE_MATERIAL_NAME
    obj["R29_unknown_topside_unmodeled"]=True
    obj["R29_angular_span_degrees"]=min(
        st[3]-st[2] for st in STATIONS)
    obj["R29_cross_section_not_global_plane"]=True
    obj["R29_no_added_piston_or_hinge"]=True
    return v,f

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    outer=bpy.data.collections.get(
        "R25_EXTERNAL_LARGE_SKID_COVERS_NOT_INNER_FINS")
    inner=bpy.data.collections.get("R11_OUTBOARD_SUSPENDED_AFTERBURNERS")
    if outer is None or len(outer.objects)!=2 or inner is None:
        raise RuntimeError("R29 requires 2 R28 shells independent of inner fins")
    signatures={ob.name:(len(ob.data.vertices),len(ob.data.polygons),
                         bool(ob.data.shape_keys),
                         bool(ob.animation_data))
                for ob in inner.objects
                if ob.name.startswith("R11_SUSPENDED_AFTERBURNER_VANE_")}
    existing=set(obj.name for obj in scene.objects)
    material,color=_beige_attachment_material()
    sides=[]
    for name,sign in (("port",-1),("starboard",1)):
        panel=outer.objects.get("R25_OUTER_SKID_UNDERSIDE_"+name)
        if panel is None or not panel.get("R28_cupped_section"):
            raise RuntimeError("R29 cannot find R28 original source shell")
        if panel.get("R27_underside_support_evidence")!="unresolved_not_constructed":
            raise RuntimeError("R29 cannot fabricate hidden skid attachment")
        v,f=_replace_existing_cover(panel,sign,material,color)
        if len(v)!=144 or len(f)!=142:
            raise RuntimeError("R29 incomplete two-surface radial clamshell")
        if max(x[2] for x in v)>-1.1:
            raise RuntimeError("R29 slipped out from under the nozzle")
        if not panel.get("R29_no_outer_heat_damage"):
            raise RuntimeError("R29 put inner-fin temper colors on skid")
        sides.append(name)
    if {ob.name for ob in scene.objects}!=existing:
        raise RuntimeError("R29 introduced unsupported objects")
    for ob in inner.objects:
        if ob.name in signatures:
            if signatures[ob.name]!=(
                len(ob.data.vertices),len(ob.data.polygons),
                bool(ob.data.shape_keys),bool(ob.animation_data)):
                raise RuntimeError("R29 altered inner fin mesh or motion")
    scene["fsc_r29_revision"]=REVISION
    scene["fsc_r29_source_sha256"]=ORIGINAL_SHA256
    scene["fsc_r29_outer_shroud_count"]=len(sides)
    scene["fsc_r29_source_material"]=SOURCE_MATERIAL_NAME
    scene["fsc_r29_unheated_beige_color"]=str(color)
    scene["fsc_r29_max_angular_span"]=max(st[3]-st[2] for st in STATIONS)
    scene["fsc_r29_all_covered_faces_follow_bell_circumference"]=True
    scene["fsc_r29_inner_fins_unchanged"]=True
    scene["fsc_r29_no_added_geometry"]=True
    scene["fsc_r29_2_source_outline_outer_lip_flare"]=OUTER_LIP_FLARE
    scene["fsc_r29_world_outward_normals_both_sides"]=True
    scene["fsc_r29_hidden_mechanisms_unknown"]=True
    scene["fsc_r25_heat_source"]="superseded by R29: beige unheated outer castings"
