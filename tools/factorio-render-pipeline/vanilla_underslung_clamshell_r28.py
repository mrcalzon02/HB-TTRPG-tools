"""R28: source-observed lower LEFT/RIGHT shallow clamshell UNDERcovers.

Original vanilla thruster RGBA frame00, 264x542: two broad, curled
UNDERSIDE shells at x~8..74 and x~190..256 around nozzle rows 380..515.
Their outer lips follow the bell; their INNER lips bend toward the
lower hot fins, sheltering them. Neither is a flat lateral wing nor a
freestanding rearward blade. Fully occluded upper faces are unknown.

Only reshape the existing two R25 exterior underpanels AFTER the R27
unsupported support cleanup. NO extra objects, struts, fasteners, hinges,
hidden back-surface volume, nor changes to R21 inner fin geometry/motion.
"""
import math
import bpy

REVISION="R28_source_conformal_underslung_shallow_clamshell"
SOURCE_ARCHIVE_SHA256="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
SIDES=("port","starboard")
# (axial_Y, inner_absX, outer_absX, inner_lip_Z, outer_lip_Z, pocket_depth)
# Distances are CALIBRATION estimates from source contour, not solved
# source CAD coordinates. Dip at center creates true cupped cross-section.
STATIONS=(
    (-1.59, .98,1.40,-1.13,-1.15,.045),
    (-1.89,1.03,1.68,-1.16,-1.21,.110),
    (-2.25,1.04,1.93,-1.23,-1.34,.175),
    (-2.60,1.06,2.04,-1.34,-1.44,.205),
    (-2.96,1.07,2.07,-1.42,-1.53,.215),
    (-3.27,1.13,2.01,-1.53,-1.64,.177),
    (-3.49,1.20,1.86,-1.61,-1.72,.145),
    (-3.63,1.29,1.70,-1.67,-1.73,.050),
)
CROSS_SECTION=(0.,.125,.25,.375,.5,.625,.75,.875,1.)
SHEET_THICKNESS=.036

def source_roi(side):
    # Approximate source-native ROIs; not photogrammetric 3D evidence.
    return (8,365,83,516) if side=="port" else (181,365,258,516)

def shaped_station(station,u,sign,skin):
    y,inside,outside,zin,zout,dip=station
    # The outer lip is the shell's OUTBOARD leading contour; the inboard
    # edge curls toward, and partially shelters, lower inner hot tabs.
    abs_x=inside+(outside-inside)*u
    rim_z=zin+(zout-zin)*u
    pocket=rim_z-dip*math.sin(math.pi*u)
    return (sign*abs_x,y,pocket+skin*SHEET_THICKNESS/2)

def mesh_data(sign):
    nr=len(STATIONS);nc=len(CROSS_SECTION)
    verts=[shaped_station(st,u,sign,skin)
           for skin in (-1,1)
           for st in STATIONS for u in CROSS_SECTION]
    half=nr*nc
    faces=[]
    # Separate actual underface and minimally thick back skin, with
    # perimeter closed only for mesh validity. NOT speculative back rig.
    for row in range(nr-1):
        for col in range(nc-1):
            q=row*nc+col
            faces.append((q,q+nc,q+nc+1,q+1))
            faces.append((q+half,q+half+1,q+half+nc+1,q+half+nc))
    for row in range(nr-1):
        for col in (0,nc-1):
            q=row*nc+col
            faces.append((q,q+half,q+half+nc,q+nc))
    for row in (0,nr-1):
        for col in range(nc-1):
            q=row*nc+col
            faces.append((q,q+1,q+half+1,q+half))
    return verts,faces

def heat_patina(y,u,sign):
    # Tempering on METAL skin, no sculpted "blue material thickness".
    # Broad soot-dark surface, asymmetric wear; purple into cobalt tips.
    aft=max(0.,min(1.,(-y-3.0)/.61))
    warm=(.074,.069,.062)
    purple=(.163,.083,.132)
    blue=(.047,.092,.205)
    a=max(0.,min(1.,(aft-.10)/.48))
    b=max(0.,min(1.,(aft-.53)/.38))
    base=tuple(c*(1-a)+p*a for c,p in zip(warm,purple))
    base=tuple(c*(1-b)+v*b for c,v in zip(base,blue))
    variation=.89+.11*math.sin(27*y+12*u+sign*.5)
    return tuple(max(0.,min(1.,c*variation)) for c in base)

def _swap_mesh(panel,sign):
    xyz,faces=mesh_data(sign)
    prior=panel.data
    mesh=bpy.data.meshes.new(panel.name+"_R28_shallow_cupped_underside")
    mesh.from_pydata(xyz,[],faces)
    mesh.update()
    for material in prior.materials:
        mesh.materials.append(material)
    attr=mesh.color_attributes.new(
        name="R25_underside_thermal_patina",
        type="FLOAT_COLOR",domain="CORNER")
    nc=len(CROSS_SECTION)
    half=len(STATIONS)*nc
    for face in mesh.polygons:
        face.use_smooth=False
        for li in face.loop_indices:
            vert_idx=mesh.loops[li].vertex_index%half
            row,col=divmod(vert_idx,nc)
            y=STATIONS[row][0]
            u=CROSS_SECTION[col]
            attr.data[li].color=(*heat_patina(y,u,sign),1.0)
    panel.data=mesh
    if prior.users==0:
        bpy.data.meshes.remove(prior)
    panel["R28_cupped_section"]=True
    panel["R28_source_visible_underface_only"]=True
    panel["R28_no_invented_mounts_or_pistons"]=True
    panel["R28_original_source_roi"]=str(source_roi(
        "port" if sign<0 else "starboard"))
    return len(xyz),len(faces)

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    inner=bpy.data.collections.get("R11_OUTBOARD_SUSPENDED_AFTERBURNERS")
    outer=bpy.data.collections.get(
        "R25_EXTERNAL_LARGE_SKID_COVERS_NOT_INNER_FINS")
    if inner is None or outer is None or len(outer.objects)!=2:
        raise RuntimeError("R28 requires R27's exactly TWO bare skid underfaces")

    def signature(ob):
        return (len(ob.data.vertices),len(ob.data.polygons),
                ob.data.shape_keys is not None,
                ob.animation_data is not None)
    protected={ob.name:signature(ob) for ob in inner.objects
               if ob.name.startswith("R11_SUSPENDED_AFTERBURNER_VANE_")}
    before_objects={ob.name for ob in scene.objects}

    bounds={}
    for side,sign in (("port",-1),("starboard",1)):
        panel=outer.objects.get("R25_OUTER_SKID_UNDERSIDE_"+side)
        if panel is None or panel.animation_data:
            raise RuntimeError("R28 cannot find stationary external underside")
        if panel.get("R27_underside_support_evidence")!=(
                "unresolved_not_constructed"):
            raise RuntimeError("R28 would invent unverified skid support")
        xyz,faces=_swap_mesh(panel,sign)
        if xyz!=2*len(STATIONS)*len(CROSS_SECTION):
            raise RuntimeError("R28 failed full 3D section generation")
        if faces<100:
            raise RuntimeError("R28 replaced scooped shell with a placeholder")
        bounds[side]={
            "source_roi":source_roi(side),
            "mesh_vertices":xyz,"mesh_faces":faces,
            "range_abs_x":[min(abs(v.co.x) for v in panel.data.vertices),
                           max(abs(v.co.x) for v in panel.data.vertices)],
            "range_z":[min(v.co.z for v in panel.data.vertices),
                       max(v.co.z for v in panel.data.vertices)]}
    if before_objects!={ob.name for ob in scene.objects}:
        raise RuntimeError("R28 inserted unsupported new parts")
    if any(signature(bpy.data.objects[n])!=sig for n,sig in protected.items()):
        raise RuntimeError("R28 altered approved inner fins or animation")
    if max(v["range_z"][1] for v in bounds.values())>=-1.1:
        raise RuntimeError("R28 shell must remain under engine")
    if min(v["range_abs_x"][0] for v in bounds.values())>=1.2:
        raise RuntimeError("R28 shell doesn't actually curl inward over fins")
    if max(v["range_abs_x"][1] for v in bounds.values())>2.10:
        raise RuntimeError("R28 improperly extends like side wings")
    scene["fsc_r28_revision"]=REVISION
    scene["fsc_r28_source_sha256"]=SOURCE_ARCHIVE_SHA256
    scene["fsc_r28_undercover_count"]=2
    scene["fsc_r28_shelter_section_count"]=len(CROSS_SECTION)
    scene["fsc_r28_section_stations"]=len(STATIONS)
    scene["fsc_r28_no_new_objects"]=True
    scene["fsc_r28_inner_fin_signatures_preserved"]=True
    scene["fsc_r28_source_roi_and_model_bounds"]=str(bounds)
    scene["fsc_r28_visibility_uncertainty"]=(
        "two visible underside surfaces only; hidden top attachment unmodeled")
