"""R19: editable source-visible inner heat scales and suspended vane roots.

Original user's vanilla thruster body shows longitudinal refractory strakes,
staggered internal shielding and an annular slot pattern. This is a Blender
geometry hypothesis, not the original Wube 3D rig. Lighting stays separate.
"""
import bpy
import math
from vane_layout_r22 import VANE_COUNT
REVISION="R19_deep_nozzle_scales_and_suspended_fin_roots"
COUNT=40
Z=-.43
PROFILE=((-3.27,1.38),(-3.19,1.36),(-3.05,1.30),(-2.91,1.19),
         (-2.74,1.04),(-2.52,.82),(-2.31,.69),(-2.10,.55),
         (-1.88,.43),(-1.63,.34),(-1.39,.24),(-1.12,.16),(-.91,.11))
def radius(y):
    for a,b in zip(PROFILE,PROFILE[1:]):
        if a[0]<=y<=b[0]:
            f=(y-a[0])/(b[0]-a[0])
            return a[1]*(1-f)+b[1]*f
    raise ValueError("Outside R11 open liner")
def point(t,y,inset=0):
    r=radius(y)-inset
    return (r*math.cos(t),y,Z+r*math.sin(t))
def material(name,color,metal,rough):
    m=bpy.data.materials.new(name);m.use_nodes=True
    m.diffuse_color=(*color,1)
    bs=m.node_tree.nodes.get("Principled BSDF")
    bs.inputs["Base Color"].default_value=(*color,1)
    bs.inputs["Metallic"].default_value=metal
    bs.inputs["Roughness"].default_value=rough
    return m
def place(ob,collection):
    for c in list(ob.users_collection):c.objects.unlink(ob)
    collection.objects.link(ob)
def scale(name,t,front,back,width,mat,root,inset):
    verts=[]
    for depth in (0,.021):
        for j in range(4):
            y=front+(back-front)*j/3
            for k in (-1,0,1):
                verts.append(point(t+k*width*(1-.07*j),y,inset+depth))
    n=12;faces=[]
    for j in range(3):
        for k in range(2):
            q=j*3+k
            faces.extend(((q,q+3,q+4,q+1),
                          (n+q,n+q+1,n+q+4,n+q+3)))
        for k in (0,2):
            q=j*3+k
            faces.append((q,n+q,n+q+3,q+3))
    for j in (0,3):
        for k in range(2):
            q=j*3+k
            faces.append((q,q+1,n+q+1,n+q))
    mesh=bpy.data.meshes.new(name+"_solid_mesh")
    mesh.from_pydata(verts,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(obj);obj.parent=root
    mesh.materials.append(mat)
    obj["R19_open_nested_refractory"]=True
    return obj
def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):return
    throat=bpy.data.objects.get("R11_OPEN_DEEP_REFRACTORY_THROAT")
    if throat is None or not throat.get("R11_open_no_endcaps"):
        raise RuntimeError("R19 requires open deep R11 throat")
    polygons=len(throat.data.polygons)
    if polygons!=(len(throat.data.vertices)//40-1)*40:
        raise RuntimeError("R19 refuses capped R11 throat")
    liner=bpy.data.collections.new("R19_EDITABLE_OPEN_CONE_INTERIOR")
    scene.collection.children.link(liner)
    dark=material("R19_chipped_black_refractory",(.045,.048,.049),.21,.91)
    aged=material("R19_inner_oxidized_shingles",(.077,.074,.066),.29,.87)
    soot=material("R19_annular_cooling_recess",(.012,.014,.017),.13,.96)
    cast=material("R19_worn_root_mount_metal",(.103,.095,.083),.46,.80)
    tube=api["tube"];ellipsoid=api["ellipsoid"]
    for i in range(COUNT):
        t=(i+.5)*math.tau/COUNT
        a=scale("R19_NEAR_MOUTH_TILE_%02d"%i,t,-3.23,-2.78,
                .073,aged if i%5==0 else dark,root,.044)
        place(a,liner)
        b=scale("R19_MID_STAGGERED_TILE_%02d"%i,
                t+math.pi/COUNT,-2.75,-2.37,.060,
                dark if i%5 else aged,root,.050)
        place(b,liner)
        rib=tube("R19_DEEP_COMBUSTOR_STRAKE_%02d"%i,
                 [point(t,y,inset) for y,inset in
                  ((-2.35,.078),(-2.10,.063),(-1.84,.051),(-1.57,.040))],
                 .014,soot,root)
        place(rib,liner)
        slot=ellipsoid("R19_ANNULAR_PRESSURE_RECESS_%02d"%i,
                       point(t,-2.43,.085),(.029,.046,.023),soot,root)
        place(slot,liner)
    fins=bpy.data.collections.get("R11_OUTBOARD_SUSPENDED_AFTERBURNERS")
    if fins is None:raise RuntimeError("R19 needs R16 fin supports")
    for i in range(VANE_COUNT):
        t=(i+.5)*math.tau/8
        fin=fins.objects.get("R11_SUSPENDED_AFTERBURNER_VANE_%02d"%i)
        if fin is None or not fin.get("R16_support_graph"):
            raise RuntimeError("Missing R16 load path")
        def pos(r,y):return (r*math.cos(t),y,Z+r*math.sin(t))
        brace=tube("R19_FIN_ROOT_BACK_RIB_%02d"%i,
                   [pos(r,y) for r,y in ((1.82,-2.39),(1.8,-2.55),
                                        (1.75,-2.74),(1.67,-2.94))],
                   .038 if i%3 else .046,cast,root)
        place(brace,fins)
        bolt=ellipsoid("R19_FIN_ROOT_BOLT_%02d"%i,
                       pos(1.82,-2.39),(.070,.075,.070),aged,root)
        place(bolt,fins)
        fin["R19_joined_root_back_rib"]=brace.name
        fin["R19_r18_distal_shape_keys_untouched"]=True
    if len(throat.data.polygons)!=polygons:
        raise RuntimeError("R19 changed original deep liner")
    scene["fsc_r19_revision"]=REVISION
    scene["fsc_r19_near_tiles"]=COUNT
    scene["fsc_r19_mid_tiles"]=COUNT
    scene["fsc_r19_deep_strakes"]=COUNT
    scene["fsc_r19_cooling_slots"]=COUNT
    scene["fsc_r19_fin_root_ribs"]=VANE_COUNT
    scene["fsc_r19_open_throat_polygons"]=polygons
    scene["fsc_r19_glow_layer_policy"]="not baked into physical cone geometry"
