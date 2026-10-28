"""R04 sculpted, RECESSED Space Age thruster candidate geometry.

This is a Blender bpy module, imported by scene_capture_batch.py.
+Y is fore/platform, -Y aft/space, +Z up, platform deck z=0.
No floor plate is generated: structure hangs between two deck socket cheeks.
Not a replica of Wube copyrighted geometry or a Factorio-ready prototype.
"""
import math
import bpy
from mathutils import Vector

SIDES=40

def make_mesh(name,verts,faces,mat,root,smooth=True,bevel=0):
    mesh=bpy.data.meshes.new(name+"Mesh")
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    ob=bpy.data.objects.new(name,mesh)
    bpy.context.collection.objects.link(ob)
    ob.parent=root
    ob.data.materials.append(mat)
    if smooth:
        for poly in mesh.polygons:poly.use_smooth=True
    if bevel>0:
        mod=ob.modifiers.new("Soft machined edges","BEVEL")
        mod.width=bevel
        mod.segments=3
        ob.modifiers.new("Weighted normals","WEIGHTED_NORMAL")
    return ob

def ellipsoid(name,pos,scale,mat,root,subdiv=2):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=18,location=pos)
    ob=bpy.context.object
    ob.name=name
    ob.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    ob.parent=root
    ob.data.materials.append(mat)
    for face in ob.data.polygons:face.use_smooth=True
    return ob

def lathe(name,profile,x,z,mat,root,sides=SIDES,close_ends=True):
    """Rotate (axial Y, radius) profile about Y, leaving smooth continuous form."""
    if len(profile)<2:raise ValueError("Lathe requires >=2 profile points")
    verts=[(x+r*math.cos(i*2*math.pi/sides),y,
            z+r*math.sin(i*2*math.pi/sides))
           for y,r in profile for i in range(sides)]
    faces=[]
    for k in range(len(profile)-1):
        for i in range(sides):
            a=k*sides+i;b=k*sides+(i+1)%sides
            faces.append((a,b,b+sides,a+sides))
    if close_ends:
        faces.append(tuple(reversed(tuple(range(sides)))))
        off=(len(profile)-1)*sides
        faces.append(tuple(off+i for i in range(sides)))
    return make_mesh(name,verts,faces,mat,root)

def tube(name,coords,radius,mat,root,closed=False):
    """Smooth continuous cubic Bezier routed piping, never floating cylinders."""
    curve=bpy.data.curves.new(name,"CURVE");curve.dimensions="3D"
    curve.resolution_u=20;curve.bevel_depth=radius;curve.bevel_resolution=4
    spline=curve.splines.new("BEZIER")
    spline.bezier_points.add(len(coords)-1)
    for node,coord in zip(spline.bezier_points,coords):
        node.co=coord
        node.handle_left_type="AUTO";node.handle_right_type="AUTO"
    spline.use_cyclic_u=closed
    ob=bpy.data.objects.new(name,curve)
    bpy.context.collection.objects.link(ob)
    ob.parent=root
    ob.data.materials.append(mat)
    return ob

def ring(name,x,y,z,r,material,root,thickness=.055,ellipse=(1.,1.)):
    verts=[];faces=[]
    for i in range(SIDES):
        phi=i*2*math.pi/SIDES
        for j in range(8):
            a=j*2*math.pi/8
            rr=r+thickness*math.cos(a)
            verts.append((x+ellipse[0]*rr*math.cos(phi),
                          y+thickness*math.sin(a),
                          z+ellipse[1]*rr*math.sin(phi)))
    for i in range(SIDES):
        for j in range(8):
            a=i*8+j;b=((i+1)%SIDES)*8+j
            faces.append((a,b,((i+1)%SIDES)*8+(j+1)%8,i*8+(j+1)%8))
    return make_mesh(name,verts,faces,material,root)

def cast_panel(name,outline,z,thick,mat,root,bevel=.08):
    """Irregular triangular-ended cast sheet, not an axis-aligned box."""
    count=len(outline)
    verts=[(x,y,z) for x,y in outline]+[(x,y,z+thick) for x,y in outline]
    faces=[tuple(reversed(range(count))),tuple(range(count,2*count))]
    for i in range(count):
        j=(i+1)%count
        faces.append((i,j,j+count,i+count))
    return make_mesh(name,verts,faces,mat,root,smooth=False,bevel=min(bevel,thick*.4))

def socket_structure(w,h,p,root):
    """C-channel deck integration: open aft, no rectangular bottom base."""
    half=w/2;front=h/2-.18;aft=-h/2+.19
    rimw=min(.19,w*.15)
    for side in (-1,1):
        x=side*(half-rimw*.60)
        edge=[(x-rimw/2,front),(x+rimw/2,front),
              (x+rimw/2,aft+.20),(x,aft-.04),(x-rimw/2,aft+.20)]
        cast_panel("RECESSED_socket_side_{}".format(side),edge,-.27,.28,p["dark"],root,.038)
        # Articulated deck rim: subtle plate lip, not a plate underneath.
        top=[(x-rimw*.78,front),(x+rimw*.78,front),
             (x+rimw*.78,aft+.55),(x+rimw*.38,aft+.12),
             (x-rimw*.78,aft+.55)]
        cast_panel("deck_cutout_rim_{}".format(side),top,.045,.08,p["steel"],root,.023)
        tube("side_routed_coolant_{}".format(side),
            [(x*.72,front-.08,-.22),(x*.82,front-.75,-.38),
             (x*.82,-.15,-.43),(x*.78,aft+.48,-.29)],
            .058,p["copper"],root)
        for yy in (front-.20,front-.62):
            ellipsoid("socket_lock_fastener",(x,yy,.155),(.082,.082,.045),p["brass"],root)
    outline=[(-half+.18,front+.10),(half-.18,front+.10),
             (half-.32,front-.29),(-half+.32,front-.29)]
    cast_panel("front_platform_socket_bridge",outline,-.15,.26,p["dark"],root,.04)
    tube("north_deck_safety_lip",[(-half+.30,front-.10,.15),
             (0,front-.12,.12),(half-.30,front-.10,.15)],.06,p["brass"],root)

def smooth_housing(name,w,h,p,root,variant):
    """Multi-section elliptical loft, tapered fore-to-aft over suspended chassis."""
    if variant=="vanilla" and h>=4.6:
        # The selection area is 4x8 but the real mount/body spans ~4.6 tiles.
        # Keep the pressure hull INSIDE its deck cavity, not inside the plume.
        fore=h/2-.38
        aft=-h/2+.53
    else:
        fore=min(h/2-.50,1.25)
        aft=max(-h/2+.60,-1.60) if variant!="spine" else -h/2+1.0
    barrel=max(.20,min(w*.34,1.11))
    z=-.31 # inset BELOW platform z=0 instead of perched at z=.75
    profile=[
        (aft,barrel*.54,.43,z-.13),
        (aft+.20,barrel*.92,.52,z-.03),
        (aft+.53,barrel*1.07,.59,z+.05),
        ((aft+fore)*.48,barrel*1.12,.62,z+.07),
        (fore-.50,barrel*.93,.52,z+.01),
        (fore-.17,barrel*.68,.39,z-.04),
        (fore,barrel*.34,.20,z-.07),
    ]
    verts=[]
    for y,rx,rz,cz in profile:
        for i in range(SIDES):
            theta=i*2*math.pi/SIDES
            verts.append((rx*math.cos(theta),y,cz+rz*math.sin(theta)))
    faces=[]
    for j in range(len(profile)-1):
        for k in range(SIDES):
            a=j*SIDES+k;b=j*SIDES+(k+1)%SIDES
            faces.append((a,b,b+SIDES,a+SIDES))
    faces.append(tuple(reversed(tuple(range(SIDES)))))
    faces.append(tuple(range((len(profile)-1)*SIDES,len(profile)*SIDES)))
    ob=make_mesh(name,verts,faces,p["iron"],root)
    # Conformal armored panel surfaces sit above curved casing.
    for t in (.23,.57,.83):
        yy=aft+(fore-aft)*t
        rr=barrel*(1.11 if t>.15 and t<.8 else .89)
        # Expose and read as real rolled transverse heat bands; previous
        # bands were submerged INSIDE the casing and invisible in previews.
        ring("external_machined_pressure_band",0,yy,z,rr,p["brass"],root,.061,ellipse=(1,.83))
    return ob

def nozzle(name,x,y,z,diam,p,root,color="blue"):
    """Continuous bell with rolled exit and recessed inner throat; faces south."""
    r=diam/2
    profile=[
        (y+.58,r*.45),(y+.43,r*.46),(y+.26,r*.52),
        (y+.10,r*.64),(y-.10,r*.81),(y-.33,r*.98),
        (y-.40,r*1.04),(y-.45,r*.94),
        # curl backwards into nozzle's physical cavity instead of disc cap
        (y-.43,r*.75),(y-.29,r*.55),(y+.10,r*.37),
        (y+.35,r*.31)]
    lathe(name+"_bronzed_rolled_bell",profile,x,z,p["ceramic"] if color=="violet" else p["steel"],root,close_ends=False)
    ring(name+"_rolled_lip",x,y-.41,z,r*.98,p["brass"],root,.045)
    lathe(name+"_dark_throat",[(y-.30,r*.41),(y-.20,r*.45),
                               (y+.06,r*.25),(y+.22,r*.12)],
           x,z,p["dark"],root,close_ends=False)
    # Vanilla reference: keep the combustion throat dark when off. The
    # running illumination belongs to the independent flame/glow pass, not
    # a permanently visible blue disk baked into the body geometry.
    if not name.startswith("vanilla_reference_bell"):
        ellipsoid(name+"_animated_ignition",(x,y-.11,z),
                  (r*.24,.035,r*.24),p[color],root)
    # Symmetrical bell coolant and curved braces.
    for side in (-1,1):
        tube(name+"_canted_brace_"+str(side),
             [(x+side*r*.90,y+.24,z+.10),
              (x+side*r*1.05,y-.05,z+.25),
              (x+side*r*.93,y-.25,z+.17)],
             .043,p["iron"],root)

def curved_armor(w,h,p,root,variant):
    """Swooped/segmented overlapping shoulder panels avoid block silhouettes."""
    wide=min(w*.46,1.68)
    long=h*.44
    for side in (-1,1):
        # Angled gussets that taper toward the aft, wrapping over the socket.
        outline=[(side*.44,long-.19),(side*(wide-.16),long-.28),
                 (side*(wide-.06),long-.75),
                 (side*(wide-.22),.18),
                 (side*.60,-long+.27),(side*.36,-long+.12),
                 (side*.43,.15)]
        cast_panel("swept_cast_shoulder_"+str(side),outline,-.13,.29,p["steel"],root,.065)
        tube("rolled_shoulder_spine_"+str(side),
             [(side*.52,long-.24,.25),
              (side*(wide-.25),.48,.28),
              (side*(wide-.37),-long+.30,.21)],
             .071,p["brass"],root)
        for k in range(3):
            yy=.48-k*.48
            ellipsoid("recessed_seam_bolt",(side*(wide-.35),yy,.26),
                      (.057,.052,.035),p["copper"],root)

def routed_manifold(w,h,p,root,color="blue"):
    fx=min(w*.325,1.53)
    for side in (-1,1):
        # The ports are high/fore and pipes descend into the recessed case.
        tube("double_curved_propellant_supply_"+str(side),
             [(side*fx,h/2-.32,.12),
              (side*(fx-.12),h/2-.72,-.05),
              (side*(fx-.31),.41,-.34),
              (side*(fx-.40),-.58,-.33)],
             max(.046,w*.018),p["copper"],root)
        ellipsoid("cast_valve_coupler",(side*fx,h/2-.38,.09),
                  (.17,.17,.16),p["brass"],root)
        tube("secondary_braided_feed_"+str(side),
             [(side*(fx-.20),.78,.03),
              (side*(fx-.43),.34,.13),
              (side*(fx-.47),-.55,-.19)],.04,p["steel"],root)

def spine(w,h,p,root):
    socket_structure(w,h,p,root)
    # Narrow 1x9 "through deck" elongated pressure containment; no plate at z=.2.
    lathe("VOID_reactor_spinal_casing",
        [(-h/2+.60,.23),(-h/2+1.0,.34),
         (-h/2+1.5,.29),(0,.25),
         (h/2-1.0,.31),(h/2-.55,.23)],0,-.36,p["dark"],root)
    tube("continuous_spinal_coil",[(0,-h/2+.85,-.01),
         (.02,-1.2,.02),(-.02,1.2,.02),(0,h/2-.80,-.01)],
         .080,p["violet"],root)
    for i in range(9):
        yy=-h/2+.84+i*(h-1.68)/8
        ring("coaxial_magnetic_vane_"+str(i),0,yy,-.36,.28,
             p["brass"],root,.043,ellipse=(1.0,1.0))
        if i%2==0:
            ellipsoid("embedded_cell_window_"+str(i),
                      (0,yy,.05),(.17,.23,.065),p["violet"],root)
    from thruster_profile_r06 import nozzle_profiles
    for label,x,y,z,diam,color in nozzle_profiles("void-fusion-thruster",w,h):
        nozzle(label,x,y,z,diam,p,root,color)

def model(name,w,h,root,p):
    """Dispatch 4 bespoke industrial silhouettes plus vanilla diagnostic."""
    if name.startswith("void-fusion"):
        spine(w,h,p,root)
        return
    socket_structure(w,h,p,root)
    if name.startswith("large-void"):
        smooth_housing("HEAVY_dual_layer_pressure_hull",w,h,p,root,"heavy")
        curved_armor(w,h,p,root,"heavy")
        from thruster_profile_r06 import nozzle_profiles
        for label,x,y,z,diam,color in nozzle_profiles(name,w,h):
            nozzle(label,x,y,z,diam,p,root,color)
        for x in (-.9,.9):
            tube("reactor_loop_"+str(x),
                [(x,1.34,-.17),(x*.9,.56,.37),
                 (x*.9,-.63,.39),(x*.86,-1.20,-.12)],
                 .093,p["violet"],root)
        return
    if name.startswith("thetazine"):
        smooth_housing("THETAZINE_elliptical_pressure_hull",w,h,p,root,"thetazine")
        curved_armor(w,h,p,root,"thetazine")
        routed_manifold(w,h,p,root,"violet")
        from thruster_profile_r06 import nozzle_profiles
        for label,x,y,z,diam,color in nozzle_profiles(name,w,h):
            nozzle(label,x,y,z,diam,p,root,color)
        return
    # The close-to-vanilla model is a calibration silhouette, not a sprite copy.
    smooth_housing("HYDROGEN_curved_pressure_hull",w,h,p,root,"vanilla")
    curved_armor(w,h,p,root,"hydrogen")
    routed_manifold(w,h,p,root)
    from thruster_profile_r06 import nozzle_profiles
    for label,x,y,z,diam,color in nozzle_profiles(name,w,h):
        nozzle(label,x,y,z,diam,p,root,color)
    if name.startswith("test-04"):
        for side in (-1,1):
            tube("vanilla_benchmark_overloop_"+str(side),
                [(side*.95,1.24,.35),(side*1.15,.48,.48),
                 (side*.85,-.63,.33)],.075,p["copper"],root)
    # Parent object is centerline z=-0.31, shell is integrated into platform.

def build_thruster(name,w,h,root,p):
    # The Factorio 2.0.77 vanilla thruster uses a STATIC integration_patch
    # on integration_patch_render_layer='floor' in addition to its animation.
    # Move only socket/deck-cutout graphics into a separate hidden collection.
    # The actual thruster body DOES NOT carry this as a floor plate.
    before=set(ob.name for ob in bpy.context.scene.objects)
    if name.startswith("test-04-vanilla-approx"):
        from vanilla_benchmark_r07 import MOUNT_SPAN_TILES,benchmark_contract
        # The 4x8 vanilla selection region includes exhaust clearance.
        # Only the approx 4x4.75 source machinery is embedded in the deck.
        physical_h=MOUNT_SPAN_TILES[1]
        bpy.context.scene["fsc_vanilla_prototype_reference"]=__import__("json").dumps(benchmark_contract())
    else:
        physical_h=h
    model(name,w,physical_h,root,p)
    import industrial_detail_r05
    industrial_detail_r05.add_details(
        name,w,physical_h,root,p,
        {"tube":tube,"ring":ring,"ellipsoid":ellipsoid}
    )
    if name.startswith("test-04-vanilla-approx"):
        import vanilla_visual_refinement_r08
        vanilla_visual_refinement_r08.apply(
            name,root,p,
            {"tube":tube,"lathe":lathe,"ring":ring,
             "cast_panel":cast_panel,"ellipsoid":ellipsoid},
            bpy.context.scene
        )
        # R11 only enhances the VANILLA diagnostic: deepen the open throat,
        # hang real afterburner vanes from outboard machinery, and keep
        # colored informational labels out of the geometry altogether.
        import vanilla_afterburner_r11
        vanilla_afterburner_r11.apply(
            name,root,p,{"tube":tube,"lathe":lathe,"ring":ring,
                         "ellipsoid":ellipsoid},bpy.context.scene
        )
        # R13 runs AFTER R11; camera and custom thrusters remain unchanged.
        import vanilla_mechanical_r13
        vanilla_mechanical_r13.apply(
            name,root,p,{"tube":tube,"lathe":lathe,"ring":ring,
                         "cast_panel":cast_panel,"ellipsoid":ellipsoid},
            bpy.context.scene
        )
        # R15 restores source-visible STATIC upper assemblies.
        import vanilla_static_mechanisms_r15
        vanilla_static_mechanisms_r15.apply(
            name,root,p,{"tube":tube,"lathe":lathe,"ring":ring,
                         "ellipsoid":ellipsoid},bpy.context.scene
        )
        # R16 fin surface and casing-tether refinement (vanilla only).
        import vanilla_vane_supports_r16
        vanilla_vane_supports_r16.apply(
            name,root,p,{"tube":tube,"ellipsoid":ellipsoid},
            bpy.context.scene
        )
        # R21 replaces the R16 THICK blade mesh with a thin stamped panel
        # BEFORE R18 authors its actual source-driven distal morph keys.
        import vanilla_master_fin_r21
        vanilla_master_fin_r21.apply(
            name,root,p,{},bpy.context.scene
        )
        # R35: original frame has bigger interior hanging heat-shield fins
        # than R33.2. Widen and slightly lengthen SAME R21 sheet meshes,
        # attached to unchanged roots before R18 creates 64 morph keys.
        import vanilla_inner_fin_proportions_r35
        vanilla_inner_fin_proportions_r35.apply(
            name,root,p,{},bpy.context.scene
        )
        # R47 source correction: near-twofold reach for existing upper
        # metal tabs BEFORE R18 creates its four lower 64-frame shape keys.
        import vanilla_deep_aperture_and_long_fins_r47
        vanilla_deep_aperture_and_long_fins_r47.extend_fins(
            name,root,p,{},bpy.context.scene
        )
        # R18: only lower observable apron tips vary across 64 real frames.
        import vanilla_distal_motion_r18
        vanilla_distal_motion_r18.apply(
            name,root,p,{},bpy.context.scene
        )
        # R19: source-guided physical RECESSED cone scales/strakes and
        # fin-root welds, preserving R18 motion and separate light effects.
        import vanilla_cone_interior_r19
        vanilla_cone_interior_r19.apply(
            name,root,p,{"tube":tube,"ellipsoid":ellipsoid},
            bpy.context.scene
        )
        # R20 root-cause fix: remove legacy endcaps from the R08
        # reaction drum that hid the actual R19 deep inner strakes.
        import vanilla_open_drum_r20
        vanilla_open_drum_r20.apply(
            name,root,p,{},bpy.context.scene
        )
        # R25 separate LARGE EXTERIOR skid-fin undersides, unrelated to
        # the already-authored internal hanging heat-tab fin population.
        import vanilla_outer_skid_covers_r25
        vanilla_outer_skid_covers_r25.apply(
            name,root,p,{"tube":tube,"ellipsoid":ellipsoid},
            bpy.context.scene
        )
        # R27 SOURCE-ONLY cleanup: remove speculative tubes/pistons/braces
        # repeated at EVERY fin. Keep original user-source panels/upper tubes.
        import vanilla_evidence_prune_r27
        vanilla_evidence_prune_r27.apply(
            name,root,p,{},bpy.context.scene
        )
        # R28: source-observed curved lower underbody SHELL surfaces,
        # ONLY the existing two R25 skids; do not reintroduce R27 rods.
        import vanilla_underslung_clamshell_r28
        vanilla_underslung_clamshell_r28.apply(
            name,root,p,{},bpy.context.scene
        )
        # R29 source-correct orientation + color, not a new invented part:
        # wrap SAME two protective skid sheets around outer bell radius,
        # reuse warm BEIGE root casting material (NO blue/purple burn).
        import vanilla_beige_radial_skids_r29
        vanilla_beige_radial_skids_r29.apply(
            name,root,p,{},bpy.context.scene
        )
        # R31: retained TWO R29 beige meshes, deeply cup their source-visible
        # underside and curl the rear ends; internal 64-frame fins unchanged.
        import vanilla_cupped_radial_skids_r31
        vanilla_cupped_radial_skids_r31.apply(
            name,root,p,{},bpy.context.scene
        )
        # R33: source GIF lower-silhouette comparison found the two
        # lower exterior guards too long and broad at their rear ends.
        import vanilla_source_tail_profile_r33
        vanilla_source_tail_profile_r33.apply(
            name,root,p,{},bpy.context.scene
        )
        # R36 original 64 RGBA frames show independent left/right OUTER
        # outline motion. Deform SAME two existing cupped surfaces with
        # source-measured shape-key curves; no unknown hinges/pistons.
        import vanilla_source_guard_motion_r36
        vanilla_source_guard_motion_r36.apply(
            name,root,p,{},bpy.context.scene
        )
        # R37: source interior is layered refractory, not a near-black
        # smooth flat wall; expose existing 80 physical R19 scales
        # with real pressed normal facets and tuned NONemissive materials.
        import vanilla_refractory_visibility_r37
        vanilla_refractory_visibility_r37.apply(
            name,root,p,{},bpy.context.scene
        )
        # R38: keep the R37 facet geometry but recover the native
        # source's deeper visible longitudinal strakes and uneven near/mid
        # actual physical shingle distribution without new objects.
        import vanilla_refractory_depth_r38
        vanilla_refractory_depth_r38.apply(
            name,root,p,{},bpy.context.scene
        )
        # R39: edit the original R11 circular liner itself into real
        # tapered inner strakes; no new parts, shaders or axial caps.
        import vanilla_open_liner_flutes_r39
        vanilla_open_liner_flutes_r39.apply(
            name,root,p,{},bpy.context.scene
        )
        # R42: remove only R04's four redundant INNER return rings
        # obstructing R11/R19/R39 actual open refractory from camera.
        import vanilla_legacy_bell_trim_r42
        vanilla_legacy_bell_trim_r42.apply(
            name,root,p,{},bpy.context.scene
        )
        # R43: after revealing R11/R39 refractory, source-aligned
        # lower mouth tiles must darken independently of upper bore.
        import vanilla_depth_patina_r43
        vanilla_depth_patina_r43.apply(
            name,root,p,{},bpy.context.scene
        )
        # R44: restore deep-end pigment only on existing R43 physical tiles.
        import vanilla_axial_patina_r44
        vanilla_axial_patina_r44.apply(
            name,root,p,{},bpy.context.scene
        )
        # R45: source-visible open-throat collar + existing squared feed mounts.
        # Neither speculative new parts nor camera hacks are permitted.
        import vanilla_throat_mounts_r45
        vanilla_throat_mounts_r45.apply(
            name,root,p,{},bpy.context.scene
        )
        # R47: relocate existing metal rim, expose the physical
        # castellated band and extend R42/R11 geometry into deeper bevel.
        vanilla_deep_aperture_and_long_fins_r47.bevel_aperture(
            name,root,p,{},bpy.context.scene
        )
    floor=bpy.data.collections.new("FLOOR_INTEGRATION_PATCH")
    bpy.context.scene.collection.children.link(floor)
    prefixes=("RECESSED_socket_side_","deck_cutout_rim_",
              "front_platform_socket_bridge","north_deck_safety_lip",
              "socket_lock_fastener")
    for ob in list(bpy.context.scene.objects):
        if ob.name in before or not ob.name.startswith(prefixes):
            continue
        for collection in list(ob.users_collection):
            collection.objects.unlink(ob)
        floor.objects.link(ob)
        ob.hide_render=True
    bpy.context.scene["fsc_floor_integration_patch_count"]=len(floor.objects)
    if not floor.objects:
        raise RuntimeError("Missing floor integration geometry")
    bpy.context.scene["fsc_mounting_doctrine"]="DECK_RECESSED_NO_BASE_PLATE"
    bpy.context.scene["fsc_deck_z"]=0.0
    bpy.context.scene["fsc_exhaust_direction"]="-Y"
    bpy.context.scene["fsc_expected_rear_edge_y"]=-physical_h/2
    bpy.context.scene["fsc_selection_length_blender_tiles"]=h
    bpy.context.scene["fsc_mount_length_blender_tiles"]=physical_h
    from thruster_profile_r06 import metadata
    bpy.context.scene["fsc_nozzle_profiles"]=__import__("json").dumps(metadata(name,w,physical_h))
    bpy.context.scene["fsc_mounting_revision"]="r06_broad_nozzles_structural_detail"

# R05 geometry is composed in industrial_detail_r05 and intentionally does
# not alter Tech Priests Lua/entity prototypes or overwrite installed sprites.
