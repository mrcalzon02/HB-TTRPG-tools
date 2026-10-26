"""R11 vanilla benchmark: truly deep open throat and OUTBOARD afterburner vanes.

Every afterburner vane is a three-dimensional component suspended from its own
support attached to machinery OUTSIDE the nozzle bell. It is NOT a bell petal,
not a decorative painted arrow, and not a fuel/oxidizer indicator overlay.

Blender coordinates: +Y towards front/platform, -Y aft/exhaust, deck z=0.
This remains an original approximation, not a reconstruction of Wube geometry.
"""
import json
import math

import bpy

BELL_CENTRE_Z=-.43
BELL_MOUTH_Y=-3.19
THROAT_END_Y=-.91
NUMBER_OF_VANES=8


def _solid_vane(name,theta,root,material,collection):
    """Cantilevered swept afterburner vane; independent shell, not a bell fin.

    Y continues aft beyond the existing main bell lip. A subtly rolled outer
    surface and shrinking azimuth width keep each vane visible at tile scale.
    """
    rows=(
        (-2.41,1.68,.106),
        (-2.64,1.65,.123),
        (-2.91,1.58,.099),
        (-3.15,1.48,.070),
        (-3.43,1.37,.038),
    )
    verts=[]
    # 5 x 3 points on each skin, closed along edges into a manifold.
    for side in (-1,1):
        for yi,(y,r,half) in enumerate(rows):
            for t in (-1,0,1):
                ang=theta+t*half
                camber=.038*(1-abs(t)) + .013*math.sin(yi*1.28)
                rr=r+camber+(side*.041)
                verts.append((rr*math.cos(ang),y,
                              BELL_CENTRE_Z+rr*math.sin(ang)))
    count=len(rows)*3
    faces=[]
    for i in range(len(rows)-1):
        for t in range(2):
            v=i*3+t
            faces.append((v,v+3,v+4,v+1))
            faces.append((count+v,count+v+1,count+v+4,count+v+3))
    # Side walls along left/right edges and forward/aft ends close the solid.
    for i in range(len(rows)-1):
        for t in (0,2):
            a=i*3+t;b=(i+1)*3+t
            faces.append((a,b,count+b,count+a))
    for i in (0,len(rows)-1):
        for t in range(2):
            a=i*3+t;b=a+1
            faces.append((a,count+a,count+b,b))
    mesh=bpy.data.meshes.new(name+"_solid_mesh")
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    ob=bpy.data.objects.new(name,mesh)
    collection.objects.link(ob)
    ob.parent=root
    ob.data.materials.append(material)
    for polygon in mesh.polygons:
        polygon.use_smooth=True
    bevel=ob.modifiers.new("Machined vane root and rolled edge","BEVEL")
    bevel.width=.017;bevel.segments=2
    ob.modifiers.new("Weighted afterburner normals","WEIGHTED_NORMAL")
    return ob


def _move_to_collection(ob,collection):
    for source in list(ob.users_collection):
        source.objects.unlink(ob)
    collection.objects.link(ob)


def apply(name,root,p,api,scene):
    if not name.startswith("test-04-vanilla-approx"):
        return
    lathe=api["lathe"]
    ring=api["ring"]
    tube=api["tube"]
    ellipsoid=api["ellipsoid"]
    # Do not let the R09 shallow liner and main nozzle inner dark cap conceal
    # the extra depth. The underlying bell shell remains fully editable.
    removed=[]
    for ob in list(scene.objects):
        if ob.parent==root and (
            ob.name.startswith("R09_deep_black_nozzle_cavity")
            or ob.name.startswith("R09_inner_refractory_stiffener")
            or ob.name.startswith("vanilla_reference_bell_dark_throat")
            or ob.name.startswith("R08_blue_energy_coupler")
        ):
            removed.append(ob.name)
            bpy.data.objects.remove(ob,do_unlink=True)

    dark=bpy.data.materials.get("R08_jet_bell_oxidized_titanium")
    aged=bpy.data.materials.get("R08_cast_heat_shield")
    if dark is None or aged is None:
        raise RuntimeError("R11 requires the prior reference pressure/nozzle materials")

    # Open all the way through: no end-cap triangles. 2.28 tile axial depth
    # reaches the machine's combustion chamber, substantially beyond R09.
    profile=[
        (-3.27,1.38),(-3.19,1.36),(-3.05,1.30),
        (-2.91,1.19),(-2.74,1.04),(-2.52,.82),
        (-2.31,.69),(-2.10,.55),(-1.88,.43),
        (-1.63,.34),(-1.39,.24),(-1.12,.16),
        (THROAT_END_Y,.11),
    ]
    cavity=lathe("R11_OPEN_DEEP_REFRACTORY_THROAT",profile,
                0,BELL_CENTRE_Z,dark,root,close_ends=False)
    cavity["R11_open_no_endcaps"]=True
    cavity["R11_throat_depth_tiles"]=round(THROAT_END_Y-BELL_MOUTH_Y,3)
    for index,(y,radius) in enumerate(
        ((-2.99,1.25),(-2.70,1.02),(-2.23,.62),(-1.80,.41))
    ):
        ring("R11_recessed_internal_pressure_baffle_%02d"%index,
             0,y,BELL_CENTRE_Z,radius,aged,root,.032)

    after=bpy.data.collections.new("R11_OUTBOARD_SUSPENDED_AFTERBURNERS")
    scene.collection.children.link(after)
    anchors=[]
    for n in range(NUMBER_OF_VANES):
        theta=math.tau*(n+.5)/NUMBER_OF_VANES
        x=math.cos(theta);z=math.sin(theta)
        suffix="%02d"%n
        # True outboard anchor: at radius 1.7, behind the reactor casing
        # but FORWARD of the nozzle lip. The vane itself is not the support.
        anchor=(1.71*x,-1.37,BELL_CENTRE_Z+1.71*z)
        elbow=(1.84*x,-1.95,BELL_CENTRE_Z+1.84*z)
        shoulder=(1.69*x,-2.46,BELL_CENTRE_Z+1.69*z)
        tip=(1.48*x,-3.15,BELL_CENTRE_Z+1.48*z)

        # Structural root reaches INTO the outboard engine housing before the
        # independent suspension arm extends over the rim. R11.0 could look
        # like an arc hanging in midair because its hinge had no chassis link.
        root_point=(1.19*x,-1.09,BELL_CENTRE_Z+1.19*z)
        gusset=(1.44*x,-1.19,BELL_CENTRE_Z+1.44*z)
        chassis_bridge=tube("R11_CASING_TO_OUTBOARD_ROOT_"+suffix,
                            [root_point,gusset,anchor],.112,p["steel"],root)
        _move_to_collection(chassis_bridge,after)
        socket=ellipsoid("R11_CHASSIS_ATTACHMENT_SOCKET_"+suffix,
                          root_point,(.14,.17,.14),p["dark"],root)
        _move_to_collection(socket,after)

        bracket=tube("R11_OUTBOARD_SUSPENSION_ARM_"+suffix,
                     [anchor,elbow,shoulder,tip],.082,p["dark"],root)
        _move_to_collection(bracket,after)
        feed=tube("R11_AFTERBURNER_FUEL_CAPILLARY_"+suffix,
                  [(1.78*x,-1.43,BELL_CENTRE_Z+1.78*z),
                   (1.91*x,-2.0,BELL_CENTRE_Z+1.91*z),
                   (1.76*x,-2.56,BELL_CENTRE_Z+1.76*z),
                   (1.54*x,-3.03,BELL_CENTRE_Z+1.54*z)],
                  .031,p["copper"],root)
        _move_to_collection(feed,after)
        boss=ellipsoid("R11_OUTBOARD_MACHINERY_HINGE_"+suffix,
                       anchor,(.115,.16,.115),p["steel"],root)
        _move_to_collection(boss,after)
        # This is a suspended cantilevered afterburner, NOT a decoration on
        # the main nozzle shell and not one of the existing heat-shield petals.
        # Narrow aged machined metal, never pale white ceramic strips that
        # form a visually dominant arch across the mouth.
        plate=_solid_vane("R11_SUSPENDED_AFTERBURNER_VANE_"+suffix,
                          theta,root,p["steel"] if n%3==0 else aged,after)
        plate["R11_support_anchor_xyz"]=json.dumps(anchor)
        plate["R11_span_from_machinery"]=True
        anchors.append({
            "index":n,"attachment_xyz":[round(a,5) for a in anchor],
            "overhang_y":-3.43,
            "angle_degrees":round(math.degrees(theta),3)
        })

    # Preserve purely informational content outside physically rendered scenes.
    overlays=bpy.data.collections.get("R11_INFORMATION_OVERLAYS_NOT_3D")
    if overlays is None:
        overlays=bpy.data.collections.new("R11_INFORMATION_OVERLAYS_NOT_3D")
        scene.collection.children.link(overlays)
    overlays.hide_render=True
    scene["fsc_informational_overlay_policy"]="arrows and fuel icons are UI images, zero 3D meshes"
    scene["fsc_afterburner_parent_collection"]=after.name
    scene["fsc_afterburner_vane_count"]=NUMBER_OF_VANES
    scene["fsc_afterburner_support_count"]=NUMBER_OF_VANES
    scene["fsc_afterburner_chassis_links"]=NUMBER_OF_VANES
    scene["fsc_afterburner_anchors"]=json.dumps(anchors)
    scene["fsc_nozzle_throat_revision"]="R11_2.28_tile_open_deep_liner"
    scene["fsc_throat_near_y"]=BELL_MOUTH_Y
    scene["fsc_throat_far_y"]=THROAT_END_Y
    scene["fsc_deleted_overlay_like_parts"]=json.dumps(removed)
    scene["fsc_engineering_revision"]="R11_1_chassis_braced_dark_suspended_afterburners"
