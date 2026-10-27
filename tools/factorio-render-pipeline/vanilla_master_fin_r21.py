"""R21: thin punch-profile thermal panel with REAL through-slots and clevis.

Based on user-provided original thruster.zip body frame 00. Individual fin
is a thin formed-metal shell with tapered shovel-like planform and an integral
folded spine. End-tip blue/purple is heat tint in the shader, NOT thickness.
The exact hidden source rig and total hidden fin population are unverified.
Runs after R16 but BEFORE R18: latter creates source-guided deform keys.
"""
import math
import json
import bpy
from mathutils import Vector
from vane_layout_r22 import VANE_COUNT

REVISION="R21_thin_formed_slotted_panel_and_pinned_clevis"
SOURCE_FRAME="original thruster-1.png frame 00 at 264x542"
STATIONS=(
    (-2.34,1.746,.062),
    (-2.45,1.719,.084),
    (-2.57,1.667,.112),
    (-2.70,1.620,.136),
    (-2.84,1.566,.149),
    (-2.98,1.509,.150),
    (-3.13,1.458,.144),
    (-3.29,1.414,.134),
    (-3.42,1.384,.123),
    (-3.47,1.383,.121),
)
LATERAL=(-1.,-.83,-.61,-.38,-.16,0.,.16,.38,.61,.83,1.)
RADIAL_THICKNESS=.024
# Two real through-slots at either side of the central pressed spine.
SLOTS={(row,col) for row in (2,3,4)
       for col in (1,8)}

def _point(theta,radius,y,u,half,skin):
    # The 3D pressed bead is localized to the axial CENTERLINE, neither
    # swelling the full plate thickness nor building a round rod.
    fold=.027*max(0.,1.-abs(u)/.38)
    r=radius+.0038*(1-abs(u))+fold+skin*RADIAL_THICKNESS/2
    angle=theta+u*half
    return (r*math.cos(angle),y,-.43+r*math.sin(angle))

def mesh_data(theta):
    """Return manifold two-skin finite-thickness shell with 2 punched slots.

    Omitted grid cells become actual openings with inner side walls.
    Mesh is intentionally symmetrical only within ONE master-fin profile.
    """
    rows=len(STATIONS);cols=len(LATERAL)
    n=rows*cols
    xyz=[]
    for skin in (-1,1):
        for y,r,half in STATIONS:
            for u in LATERAL:
                xyz.append(_point(theta,r,y,u,half,skin))
    def idx(s,i,j): return s*n+i*cols+j
    faces=[];mats=[]
    def quad(points,mat=1):
        faces.append(tuple(points));mats.append(mat)
    def active(i,j):
        return 0<=i<rows-1 and 0<=j<cols-1 and (i,j) not in SLOTS
    for i in range(rows-1):
        for j in range(cols-1):
            if not active(i,j):continue
            a=idx(0,i,j);b=idx(0,i+1,j)
            c=idx(0,i+1,j+1);d=idx(0,i,j+1)
            e=idx(1,i,j);f=idx(1,i+1,j)
            g=idx(1,i+1,j+1);h=idx(1,i,j+1)
            color=0 if i<2 else 1 if i<6 else 2 if i<8 else 3
            quad((a,b,c,d),color)
            quad((e,h,g,f),color)
            # Every boundary edge, including the punched slots, receives
            # a REAL narrow material-thickness wall.
            if not active(i-1,j): quad((a,d,h,e),0)
            if not active(i+1,j): quad((b,f,g,c),color)
            if not active(i,j-1): quad((a,e,f,b),color)
            if not active(i,j+1): quad((d,c,g,h),color)
    return xyz,faces,mats

def _surface_gradient(material):
    if not material.use_nodes:material.use_nodes=True
    nodes=material.node_tree.nodes
    shader=nodes.get("Principled BSDF")
    attr=nodes.get("R21_thermal_color_attribute")
    if attr is None:
        attr=nodes.new("ShaderNodeAttribute")
        attr.name="R21_thermal_color_attribute"
    attr.attribute_name="R21_heat_tint"
    socket=shader.inputs["Base Color"]
    for link in list(material.node_tree.links):
        if link.to_socket==socket:
            material.node_tree.links.remove(link)
    material.node_tree.links.new(attr.outputs["Color"],socket)
    shader.inputs["Metallic"].default_value=.33
    shader.inputs["Roughness"].default_value=.81

def _heat_rgb(y,u,theta):
    """Soft tempered-steel coloration, never a geometric blue tip."""
    t=max(0.,min(1.,(-y-2.93)/.53))
    warm=(.145,.136,.124)
    purple=(.182,.112,.149)
    blue=(.070,.095,.189)
    a=max(0.,min(1.,(t-.10)/.54))
    b=max(0.,min(1.,(t-.62)/.32))
    # Nonuniform oxidization; avoid flat RGB bands.
    mottled=.88+.12*math.sin(47*u+20*y+theta*2.1)
    middle=tuple(w*(1-a)+p*a for w,p in zip(warm,purple))
    return tuple(max(0.,min(1.,(x*(1-b)+z*b)*mottled))
                 for x,z in zip(middle,blue))

def _replace_fin(obj,theta):
    if obj.data.shape_keys:
        raise RuntimeError("R21 must run before R18 source-driven shape keys")
    xyz,faces,mats=mesh_data(theta)
    mesh=bpy.data.meshes.new(obj.name+"_R21_sheet_finned")
    mesh.from_pydata(xyz,[],faces)
    mesh.update()
    if len(mesh.polygons)<170:raise RuntimeError("R21 fin grid collapsed")
    if len(obj.data.materials)!=4:
        raise RuntimeError("R21 expected original 4 thermal material zones")
    for mat in obj.data.materials:
        mesh.materials.append(mat)
        _surface_gradient(mat)
    for poly,mat_index in zip(mesh.polygons,mats):
        poly.material_index=mat_index
        poly.use_smooth=False
    color=mesh.color_attributes.new(name="R21_heat_tint",type="FLOAT_COLOR",domain="CORNER")
    for face in mesh.polygons:
        for li in face.loop_indices:
            pos=mesh.vertices[mesh.loops[li].vertex_index].co
            radius=math.sqrt(pos.x*pos.x+(pos.z+.43)**2)
            ang=math.atan2(pos.z+.43,pos.x)-theta
            u=(ang+math.pi)%(2*math.pi)-math.pi
            half=next((w for y,r,w in STATIONS if abs(y-pos.y)<.00001),
                      STATIONS[-1][2])
            rgb=_heat_rgb(pos.y,u/half,theta)
            color.data[li].color=(rgb[0],rgb[1],rgb[2],1.)
    old=obj.data
    for modifier in list(obj.modifiers):
        obj.modifiers.remove(modifier)
    obj.data=mesh
    obj.modifiers.new("Edge softening on thin folded sheet","WEIGHTED_NORMAL")
    if old.users==0:bpy.data.meshes.remove(old)
    obj["R21_actual_punched_slot_pairs"]=2
    obj["R21_material_tempering_only_at_free_end"]=True
    obj["R21_sheet_metal_thickness_tiles"]=RADIAL_THICKNESS
    obj["R21_integral_centerline_ridge"]=True
    obj["R21_root_to_mid_taper"]=True
    return len(xyz),len(faces)

def _clevis(theta,n,root,collection,p):
    """Independent narrow stamped hinge ears and transverse shaft.

    Connected to R16 crosshead, but no animated hinge pivot is assumed.
    """
    tangent=Vector((-math.sin(theta),0.,math.cos(theta)))
    root_pt=Vector((1.74*math.cos(theta),-2.38,
                    -.43+1.74*math.sin(theta)))
    for sign,label in ((-1,"port"),(1,"starboard")):
        center=root_pt+tangent*(sign*.120)
        # Two narrow half-shell ears, not a thick cube across fin face.
        bpy.ops.mesh.primitive_cube_add(size=1,location=center)
        ear=bpy.context.object
        ear.name=f"R21_PINNED_CLEVIS_EAR_{label}_{n:02d}"
        ear.dimensions=(.065,.23,.055)
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        ear.rotation_mode="QUATERNION"
        ear.rotation_quaternion=Vector((1.,0.,0.)).rotation_difference(
            Vector((math.cos(theta),0.,math.sin(theta))))
        ear.parent=root
        ear.data.materials.append(p["dark"])
        place(ear,collection)
    bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.037,
                                        depth=.330,location=root_pt)
    pin=bpy.context.object
    pin.name=f"R21_CLEVIS_TRANSVERSE_PIN_{n:02d}"
    pin.rotation_mode="QUATERNION"
    pin.rotation_quaternion=Vector((0.,0.,1.)).rotation_difference(tangent)
    pin.parent=root
    pin.data.materials.append(p["steel"])
    place(pin,collection)

def place(ob,collection):
    for c in list(ob.users_collection):
        c.objects.unlink(ob)
    collection.objects.link(ob)

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):return
    coll=bpy.data.collections.get("R11_OUTBOARD_SUSPENDED_AFTERBURNERS")
    if coll is None:raise RuntimeError("R21 has no independent fin collection")
    sizes=[]
    for n in range(VANE_COUNT):
        fin=coll.objects.get(f"R11_SUSPENDED_AFTERBURNER_VANE_{n:02d}")
        if fin is None or not fin.get("R16_support_graph"):
            raise RuntimeError("Missing R16 original physically supported fin")
        theta=math.tau*(n+.5)/VANE_COUNT
        sizes.append(_replace_fin(fin,theta))
        _clevis(theta,n,root,coll,p)
    scene["fsc_r21_revision"]=REVISION
    scene["fsc_r21_master_sheet_thickness"]=RADIAL_THICKNESS
    scene["fsc_r21_punched_slots_per_fin"]=2
    scene["fsc_r21_stamped_center_ridge_count"]=VANE_COUNT
    scene["fsc_r21_clevis_pin_count"]=VANE_COUNT
    scene["fsc_r21_root_panel_count"]=VANE_COUNT
    scene["fsc_r21_source_count_status"]="12-slot calibration candidate, original source total unknown"
    scene["fsc_r22_population_candidate"]=VANE_COUNT
    scene["fsc_r21_source_reference"]=SOURCE_FRAME
