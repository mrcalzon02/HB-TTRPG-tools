"""R25: two SOURCE-VISIBLE outer covering/skid fins, NOT internal hot tabs.

Original Factorio vanilla thruster body frame 00 displays two large lateral
external cover/skid forms at the lower left and right. Only their UNDERSIDES
and trailing heat-marked edges are visible from the game view; do not guess
their obscured topside appearance or claim a source-proven moving hinge.

This module deliberately does NOT change R11/R16/R18/R21 internal fin count,
fin sheet profile, layout, animation, or vertex colors. Separate collection.
"""
import math
import bpy

REVISION="R25_two_large_external_underside_skid_covers"
SIDES=("port","starboard")
# (aft-axis Y, outward X radius, underside Z, halfwidth in lateral X)
# Source-reference calibrated CONCEPT dimensions; refine from real PNG views.
STATIONS=(
    (-1.65,1.63,-.19,.16),
    (-1.94,1.85,-.26,.25),
    (-2.29,2.03,-.34,.33),
    (-2.68,2.07,-.42,.37),
    (-3.07,2.04,-.53,.39),
    (-3.39,1.98,-.63,.39),
    (-3.62,1.88,-.70,.33),
    (-3.73,1.77,-.75,.29),
)
SHEET_THICKNESS=.050
LATERAL=(-1.,-.5,0.,.5,1.)

def material(name):
    mat=bpy.data.materials.new(name)
    mat.use_nodes=True
    mat.diffuse_color=(.071,.067,.062,1)
    shader=mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Metallic"].default_value=.42
    shader.inputs["Roughness"].default_value=.86
    attr=mat.node_tree.nodes.new("ShaderNodeAttribute")
    attr.attribute_name="R25_underside_thermal_patina"
    mat.node_tree.links.new(attr.outputs["Color"],
                            shader.inputs["Base Color"])
    return mat

def patina(y,u,side):
    # Oxide is surface color; the plate remains one constant sheet thickness.
    t=max(0.,min(1.,(-y-3.07)/.60))
    base=(.100,.090,.078)
    purple=(.137,.078,.113)
    blue=(.050,.064,.133)
    a=max(0.,min(1.,(t-.08)/.53))
    b=max(0.,min(1.,(t-.64)/.32))
    a2=tuple(x*(1-a)+v*a for x,v in zip(base,purple))
    m=.92+.08*math.sin(y*29+u*18+side)
    return tuple((v*(1-b)+w*b)*m for v,w in zip(a2,blue))

def panel_mesh(sign):
    vertices=[]
    nr=len(STATIONS);nc=len(LATERAL)
    for layer in (-1,1):
        for y,r,z,hw in STATIONS:
            for u in LATERAL:
                # Gradual forged centerline and shallow transverse curve.
                x=sign*(r+u*hw)
                height=z+.032*(1-u*u)+layer*SHEET_THICKNESS/2
                vertices.append((x,y,height))
    offset=nr*nc
    faces=[]
    for i in range(nr-1):
        for j in range(nc-1):
            n=i*nc+j
            faces.append((n,n+nc,n+nc+1,n+1))
            faces.append((offset+n,offset+n+1,
                          offset+n+nc+1,offset+n+nc))
    # Both skin edges plus two real end faces: NOT a flat plane.
    for i in range(nr-1):
        for j in (0,nc-1):
            n=i*nc+j
            faces.append((n,offset+n,offset+n+nc,n+nc))
    for i in (0,nr-1):
        for j in range(nc-1):
            n=i*nc+j
            faces.append((n,n+1,offset+n+1,offset+n))
    return vertices,faces

def move(ob,coll):
    for existing in list(ob.users_collection):
        existing.objects.unlink(ob)
    coll.objects.link(ob)

def create_panel(label,sign,root,coll,mat):
    vertices,faces=panel_mesh(sign)
    mesh=bpy.data.meshes.new(f"R25_{label}_large_external_skid_mesh")
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    mesh.materials.append(mat)
    paint=mesh.color_attributes.new(
        name="R25_underside_thermal_patina",
        type="FLOAT_COLOR",domain="CORNER")
    for poly in mesh.polygons:
        poly.use_smooth=False
        for loop_id in poly.loop_indices:
            v=mesh.vertices[mesh.loops[loop_id].vertex_index].co
            u=(abs(v.x)-1.95)/.39
            rgb=patina(v.y,u,sign)
            paint.data[loop_id].color=(*rgb,1.)
    ob=bpy.data.objects.new(f"R25_OUTER_SKID_UNDERSIDE_{label}",mesh)
    coll.objects.link(ob)
    ob.parent=root
    ob["R25_not_an_inner_afterburner_fin"]=True
    ob["R25_only_underside_reconstructed"]=True
    ob["R25_thermal_tint_not_geometric_depth"]=True
    ob["R25_constant_sheet_thickness"]=SHEET_THICKNESS
    ob["R25_source_side"]=label
    return ob

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):return
    inner=bpy.data.collections.get("R11_OUTBOARD_SUSPENDED_AFTERBURNERS")
    if inner is None:raise RuntimeError("R25 cannot locate untouched inner fins")
    inner_names=sorted(x.name for x in inner.objects)
    coll=bpy.data.collections.new("R25_EXTERNAL_LARGE_SKID_COVERS_NOT_INNER_FINS")
    scene.collection.children.link(coll)
    colored=material("R25_aged_external_skid_underside_with_heat_staining")
    outer_metal=bpy.data.materials.new("R25_external_hull_load_bracket")
    outer_metal.diffuse_color=(.071,.065,.057,1.)
    tube=api["tube"]
    ellipsoid=api["ellipsoid"]
    for label,sign in (("port",-1),("starboard",1)):
        ob=create_panel(label,sign,root,coll,colored)
        # Connected to outer machine casing, NOT any nozzle petal.
        inner_anchor=(sign*1.35,-1.27,-.21)
        shoulder=(sign*1.74,-1.64,-.18)
        frame=(sign*1.89,-2.11,-.33)
        clamp=(sign*2.04,-2.44,-.36)
        bracket=tube(f"R25_OUTER_SKID_CASING_SPINE_{label}",
                     [inner_anchor,shoulder,frame,clamp],
                     .094,outer_metal,root)
        move(bracket,coll)
        # Underbody folded rib, narrower than main underside sheet.
        rib=tube(f"R25_OUTER_SKID_UNDERBODY_CHANNEL_{label}",
                 [(sign*1.85,-2.11,-.32),(sign*2.07,-2.64,-.47),
                  (sign*1.99,-3.09,-.59),(sign*1.86,-3.46,-.71)],
                 .048,outer_metal,root)
        move(rib,coll)
        root_boss=ellipsoid(
            f"R25_OUTER_SKID_ROOT_BOSS_{label}",inner_anchor,
            (.13,.18,.13),outer_metal,root)
        move(root_boss,coll)
        joint=ellipsoid(
            f"R25_OUTER_SKID_CLAMP_BOSS_{label}",frame,
            (.09,.12,.09),outer_metal,root)
        move(joint,coll)
        ob["R25_chassis_support"]=bracket.name
        ob["R25_underside_reinforcement"]=rib.name
        ob["R25_root_boss"]=root_boss.name
        ob["R25_clamp_boss"]=joint.name
        if ob.animation_data:
            raise RuntimeError("R25 hidden outer skid hinge motion not observed")
    after_names=sorted(x.name for x in inner.objects)
    if inner_names!=after_names:
        raise RuntimeError("R25 touched inner fin collection unexpectedly")
    scene["fsc_r25_revision"]=REVISION
    scene["fsc_r25_large_outer_skids"]=2
    scene["fsc_r25_inner_afterburner_objects_unchanged"]=True
    scene["fsc_r25_outer_source_view"]="underside only, outer left and right"
    scene["fsc_r25_heat_source"]="underside material only, no baked glow"
