"""R16 vanilla-only nozzle thermal plates and verified support topology.

Reference: user-supplied Factorio vanilla thruster contact sheet, especially
frame 00. Visible plates are broad, squared-off, and heat stained over the
mouth; their physical supports come from OUTSIDE the nozzle. The source is a
2D animation, so unknown articulations remain stationary until demonstrated.
Do not include Wube-owned sprite pixels in source control.
"""
import json
import math
import bpy

REVISION="R16_broad_heat_plates_dual_braced_outboard_cradles"
PLATES=8
BELL_CENTRE_Z=-.43

def _surface(name,color,metallic=.3,roughness=.76):
    m=bpy.data.materials.new(name)
    m.use_nodes=True
    m.diffuse_color=(*color,1)
    shader=m.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value=(*color,1)
    shader.inputs["Metallic"].default_value=metallic
    shader.inputs["Roughness"].default_value=roughness
    return m

def _at(theta,r,y):
    return (r*math.cos(theta),y,BELL_CENTRE_Z+r*math.sin(theta))

def _replace_plate(plate,theta,materials):
    """Replace the needle-tip strip with a broad, closed, folded heat shield.

    Unlike R11 the trailing edge stays broad. There is no central spine that
    narrows to an arrowpoint. This is a PRIVATE-CALIBRATION visual hypothesis,
    not an assertion that the underlying source contains eight rigid plates.
    """
    #   axial Y, radius from throat axis, angular half-span.
    # Forward edge hooks under load-bearing crosshead; rear edge is flat-ish.
    stations=(
        (-2.35,1.700,.082),
        (-2.49,1.686,.115),
        (-2.65,1.623,.132),
        (-2.83,1.556,.144),
        (-3.02,1.486,.148),
        (-3.22,1.418,.143),
        (-3.42,1.386,.132),
        (-3.47,1.386,.121),
    )
    across=(-1.,-.52,0.,.52,1.)
    nr=len(across)
    n=len(stations)
    vertices=[]
    for surface in (-1.,1.):
        for index,(y,radius,halfspan) in enumerate(stations):
            for t in across:
                phase=math.sin(index*.85+.4*t)
                curl=.025*(1-abs(t))+.007*phase
                # A shallow radial curve gives actual 3D relief; two surfaces
                # remain separated even at the bell rim.
                r=radius+curl+surface*.042
                vertices.append(_at(theta+t*halfspan,r,y))
    offset=n*nr
    faces=[]
    face_mats=[]
    for index in range(n-1):
        for col in range(nr-1):
            a=index*nr+col
            faces.append((a,a+nr,a+nr+1,a+1))
            face_mats.append(0 if index<=1 else 1 if index<=3
                             else 2 if index<=4 else 3)
            faces.append((offset+a,offset+a+1,offset+a+nr+1,
                          offset+a+nr))
            face_mats.append(0 if index<=1 else 1 if index<=3
                             else 2 if index<=4 else 3)
    # Edge walls: no holes and no invisible paper-thin billboard fins.
    for index in range(n-1):
        for col in (0,nr-1):
            a=index*nr+col
            faces.append((a,offset+a,offset+a+nr,a+nr))
            face_mats.append(1 if index<=3 else 3)
    for row in (0,n-1):
        for col in range(nr-1):
            a=row*nr+col
            faces.append((a,a+1,offset+a+1,offset+a))
            face_mats.append(0 if row==0 else 3)

    mesh=bpy.data.meshes.new(plate.name+"_R16_broad_heat_shield_mesh")
    mesh.from_pydata(vertices,[],faces)
    mesh.update()
    for mat in materials:
        mesh.materials.append(mat)
    for polygon,mat_index in zip(mesh.polygons,face_mats):
        polygon.material_index=mat_index
        polygon.use_smooth=True

    old=plate.data
    for modifier in list(plate.modifiers):
        plate.modifiers.remove(modifier)
    plate.data=mesh
    bevel=plate.modifiers.new("Rolled thermal shield margins","BEVEL")
    bevel.width=.014
    bevel.segments=2
    plate.modifiers.new("Weighted thermal plate normals","WEIGHTED_NORMAL")
    if old.users==0:
        bpy.data.meshes.remove(old)

    plate["R16_plate_rear_y"]=stations[-1][0]
    plate["R16_plate_root_span"]=stations[0][2]*2
    plate["R16_plate_aft_span"]=stations[-1][2]*2
    plate["R16_broad_squared_trailing_edge"]=True
    plate["R16_heat_discoloration_is_material_not_overlay"]=True
    return stations

def _set_parented_collection(ob,root,collection):
    ob.parent=root
    for old in list(ob.users_collection):
        old.objects.unlink(ob)
    collection.objects.link(ob)
    return ob

def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    vanes=bpy.data.collections.get("R11_OUTBOARD_SUSPENDED_AFTERBURNERS")
    if vanes is None:
        raise RuntimeError("R16 missing R11 independent outboard-vane collection")
    originals=sorted((ob for ob in vanes.objects
                      if ob.name.startswith("R11_SUSPENDED_AFTERBURNER_VANE_")),
                     key=lambda obj: obj.name)
    if len(originals)!=PLATES:
        raise RuntimeError("R16 requires eight prior independently supported plates")

    # Source shows pale oxidized ROOT metal with purple/blue scarring at hot
    # distal edges. The gradient is a material zone, not a flame or UI arrow.
    metals=(
        _surface("R16_bracket_root_dull_cast",(.105,.105,.099),.40,.84),
        _surface("R16_thermal_plate_worn_face",(.176,.165,.148),.30,.81),
        _surface("R16_thermal_plate_heat_purple",(.167,.108,.148),.20,.85),
        _surface("R16_thermal_plate_oxidized_blue_tip",(.104,.103,.173),.21,.88)
    )
    suspension=_surface("R16_dark_stressed_cradle_metal",
                        (.074,.077,.075),.43,.80)
    socket_metal=_surface("R16_oxidized_load_bearing_clevis",
                          (.115,.106,.091),.47,.77)
    hose_metal=_surface("R16_afterburner_hose_ferrule",
                        (.129,.102,.080),.45,.72)
    tube=api["tube"]
    ellipsoid=api["ellipsoid"]
    built=[]
    for n,plate in enumerate(originals):
        theta=math.tau*(n+.5)/PLATES
        suffix=f"{n:02d}"
        _replace_plate(plate,theta,metals)
        if plate.animation_data:
            raise RuntimeError("Source did not establish moving hinges for the fins")

        # Every plate now has a visible source-to-load path:
        # engine casing -> outward saddle -> BOTH angled brace arms ->
        # transverse root clamp -> broad refractory shield. This is not an
        # inferred animation linkage; every connection is permanently fixed.
        base=_at(theta,1.38,-1.56)
        outward=_at(theta,1.83,-1.93)
        hinge=_at(theta,1.73,-2.35)
        crossbar=tube("R16_FIN_ROOT_CROSSHEAD_"+suffix,
                      [_at(theta-.090,1.735,-2.39),
                       _at(theta,1.745,-2.38),
                       _at(theta+.090,1.735,-2.39)],
                      .079,socket_metal,root)
        _set_parented_collection(crossbar,root,vanes)
        saddle=tube("R16_CASING_TO_FIN_SADDLE_"+suffix,
                    [base,_at(theta,1.66,-1.76),outward,hinge],
                    .107,suspension,root)
        _set_parented_collection(saddle,root,vanes)
        ferrules=[]
        for sign,word in ((-1,"port"),(1,"starboard")):
            t=theta+sign*.086
            branch=tube("R16_FIN_DOUBLE_BRACE_"+word+"_"+suffix,
                        [_at(t,1.75,-1.88),_at(t,1.83,-2.06),
                         _at(t,1.80,-2.26),_at(t,1.72,-2.40)],
                        .061,suspension,root)
            _set_parented_collection(branch,root,vanes)
            lug=ellipsoid("R16_ROOT_CLAMP_EAR_"+word+"_"+suffix,
                          _at(t,1.71,-2.41),(.081,.118,.081),
                          socket_metal,root)
            _set_parented_collection(lug,root,vanes)
            ferrules.append(lug.name)
        bolt=ellipsoid("R16_OUTBOARD_CRADLE_PIVOT_BOSS_"+suffix,
                       outward,(.12,.13,.12),socket_metal,root)
        _set_parented_collection(bolt,root,vanes)
        # Finish the already-routed R11 capillary with an actual metal
        # termination on the hot plate, not a loose floating tube end.
        terminating=tube("R16_FIN_HEAT_FEED_TERMINAL_"+suffix,
                         [_at(theta,1.60,-2.96),_at(theta,1.53,-3.03),
                          _at(theta,1.51,-3.08)],.043,hose_metal,root)
        _set_parented_collection(terminating,root,vanes)
        lip=ellipsoid("R16_FIN_CAPILLARY_NOZZLE_SOCKET_"+suffix,
                      _at(theta,1.51,-3.08),(.077,.10,.077),
                      hose_metal,root)
        _set_parented_collection(lip,root,vanes)
        # Store exact support topology for later saved-scene verification.
        plate["R16_support_graph"]=json.dumps({
            "chassis_link":"R11_CASING_TO_OUTBOARD_ROOT_"+suffix,
            "saddle":saddle.name,
            "crosshead":crossbar.name,
            "double_braces":[
                "R16_FIN_DOUBLE_BRACE_port_"+suffix,
                "R16_FIN_DOUBLE_BRACE_starboard_"+suffix],
            "clamp_ears":ferrules,
            "heat_feed_terminal":terminating.name,
            "terminal_socket":lip.name,
            "outer_boss":bolt.name,
        })
        built.append(plate.name)
    scene["fsc_r16_revision"]=REVISION
    scene["fsc_r16_rectangular_heat_plate_count"]=len(built)
    scene["fsc_r16_dual_load_brace_count"]=2*len(built)
    scene["fsc_r16_independent_crosshead_count"]=len(built)
    scene["fsc_r16_external_support_graph"]="housing-saddle-double_brace-crosshead-shield"
    scene["fsc_r16_source_movement_policy"]="static pending direct original 64-frame mechanical tracking"
