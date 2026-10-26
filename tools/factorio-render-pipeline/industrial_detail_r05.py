"""R05 industrial detail system for recessed Factorio thruster candidates.

Uses dimensional geometry instead of flat decal/noise proxies:
- angle-following bent shoulder panels with raised seams
- segmented ceramic nozzle petals, clamp collars and radial throat vanes
- pipe-fed manifolds with flanged valve joints and support saddles
- finned thermal/pressure assemblies and fastened inspection hatches
- restrained seeded procedural roughness at material level

Not a copy of Wube's meshes; game approval requires actual Factorio screenshots.
"""
import math
import bpy

SAMPLES=16

def _mesh(name,verts,faces,material,root,bevel=0):
    mesh=bpy.data.meshes.new(name+"_geo")
    mesh.from_pydata(verts,[],faces)
    mesh.update()
    obj=bpy.data.objects.new(name,mesh)
    bpy.context.scene.collection.objects.link(obj)
    obj.parent=root
    obj.data.materials.append(material)
    for face in mesh.polygons:face.use_smooth=True
    if bevel:
        mod=obj.modifiers.new("machined edge roll","BEVEL")
        mod.width=bevel
        mod.segments=3
        obj.modifiers.new("weighted face normals","WEIGHTED_NORMAL")
    return obj

def _ellipse_plate(name,root,material,profile,side,z_offset=-.31):
    """Curved quad surface conforming to successive pressure-vessel sections.

    profile = (y, rx, rz) stations. Side determines positive/negative X.
    Cross angles are chosen near the upper shoulders, keeping the reactor visible.
    """
    # Wide armored shoulder panels wrap the hull; the crown remains exposed.
    if side==1:angles=[.09+i*(1.29-.09)/SAMPLES for i in range(SAMPLES+1)]
    else:angles=[math.pi-1.29+i*(1.20)/SAMPLES for i in range(SAMPLES+1)]
    verts=[]
    for y,rx,rz in profile:
        for angle in angles:
            # x cosine distributes around the radial casing, z sine is shoulder.
            verts.append((rx*math.cos(angle),y,z_offset+rz*math.sin(angle)+.035))
    faces=[]
    step=len(angles)
    for j in range(len(profile)-1):
        for k in range(step-1):
            a=j*step+k;b=a+1
            faces.append((a,b,b+step,a+step))
    return _mesh(name,verts,faces,material,root,.018)

def _ring_fastener(name,x,y,z,mat,root,r=.063):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=8,location=(x,y,z))
    ob=bpy.context.object
    ob.name=name
    ob.scale=(r,r,r*.43)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    ob.parent=root
    ob.data.materials.append(mat)
    return ob

def _ribbed_finbank(name,root,p,side,y_middle,span_x=.46):
    """Finned radiator with alternating metallic spacing rather than box stack."""
    x=side*span_x
    for i in range(7):
        y=y_middle+(i-3)*.155
        verts=[(x-.22,y-.022,.11),(x+.22,y-.022,.11),
               (x+.15,y+.020,.38),(x-.15,y+.020,.38),
               (x-.22,y+.022,.11),(x+.22,y+.022,.11),
               (x+.15,y+.062,.38),(x-.15,y+.062,.38)]
        faces=[(0,1,2,3),(4,7,6,5),(0,4,5,1),(3,2,6,7)]
        _mesh(name+"_louver_"+str(i),verts,faces,p["steel"] if i%2 else p["dark"],root,.009)

def _pipe_saddle(name,root,p,x,y,z):
    bpy.ops.mesh.primitive_torus_add(major_segments=24,minor_segments=8,
                                    major_radius=.16,minor_radius=.040,
                                    location=(x,y,z),rotation=(math.pi/2,0,0))
    obj=bpy.context.object
    obj.name=name
    obj.parent=root
    obj.data.materials.append(p["brass"])

def _pipe_bundle(name,root,p,side,w,h,api):
    tube=api["tube"];ring=api["ring"]
    # Keep the pipe bundle anchored to the pressure vessel, not hanging outside
    # the platform's full width like unsupported copper strings.
    x=side*min(w*.325,1.53)
    lead_y=min(1.35,h/2-.52)
    for i,offset in enumerate((-.12,.12)):
        tube(name+"_feed_"+str(side)+"_"+str(i),
           [(x+side*offset,lead_y,-.02),
            (x-side*.16,lead_y-.45,.22),
            (x-side*.39,lead_y-1.07,.10),
            (x-side*.36,-.72,-.13),
            (x-side*.18,-1.27,-.29)],
           .050 if i==0 else .041,p["copper"] if i==0 else p["steel"],root)
    for yy in (lead_y-.47,lead_y-.93):
        _pipe_saddle(name+"_mounting_collar",root,p,x-side*.18,yy,.19)
    # Fill the outboard fuel input with a visible cast flange.
    api["ellipsoid"](name+"_two_part_pipe_union",(x,lead_y,-.07),
                     (.23,.24,.17),p["dark"],root)
    ring(name+"_pressure_gauge_rim",x,lead_y,-.07,.24,p["brass"],root,.040)
    _ring_fastener(name+"_port_bolt_1",x+side*.12,lead_y+.05,.12,p["steel"],root)
    _ring_fastener(name+"_port_bolt_2",x-side*.10,lead_y-.07,.12,p["steel"],root)

def _nozzle_petals(label,x,y,z,diam,root,p,variant):
    """Engine bell's *individual* sculpted scalloped panels, not another circle."""
    r=diam*.5
    count=12 if diam>=1 else 10
    for j in range(count):
        start=j*2*math.pi/count
        gap=.035
        span=2*math.pi/count
        # Four distinct axial meridians and seven angular samples per petal.
        sections=[(y+.21,r*.63),(y-.10,r*.82),
                  (y-.35,r*1.04),(y-.50,r*1.09),
                  (y-.56,r*1.015)]
        verts=[]
        for k,(yy,rr) in enumerate(sections):
            for m in range(8):
                t=m/7
                a=start+gap+span*t-2*gap
                # each petal forms a slightly dished section with raised center
                deep=1+.023*math.sin(t*math.pi)+.017*math.sin(k*.9+j*.23)
                verts.append((x+rr*deep*math.cos(a),yy,
                              z+rr*deep*math.sin(a)))
        faces=[]
        for k in range(len(sections)-1):
            for m in range(7):
                a=k*8+m
                faces.append((a,a+1,a+9,a+8))
        material=p["ceramic"] if j%3!=0 else p["steel"]
        _mesh(label+"_heat_shield_petal_%02d"%j,verts,faces,material,root,.012)
        # Luminous edge accent is small; don't substitute glowing rings for metal.
        theta=start+span*.5
        _ring_fastener(label+"_trailing_rivet_%02d"%j,
                       x+r*1.04*math.cos(theta),y-.40,
                       z+r*1.04*math.sin(theta),p["brass"],root,r*.068)

    # R09: the vanilla reference is a DEEP OPEN COMBUSTION BELL lined
    # with 24 slim lengthwise flutes, not nine radial 'propeller blades'.
    # The previous triangular fan filled the center and made the asset look
    # like a ventilation turbine rather than a rocket.
    for i in range(24):
        theta=i*math.tau/24
        width=.021
        profile=[(y-.48,r*.79),(y-.36,r*.73),
                 (y-.18,r*.56),(y+.01,r*.39),(y+.20,r*.27)]
        verts=[]
        for axial,radial in profile:
            for delta in (-width,width):
                a=theta+delta
                verts.append((x+radial*math.cos(a),axial,
                              z+radial*math.sin(a)))
        quads=[(k*2,k*2+1,k*2+3,k*2+2) for k in range(len(profile)-1)]
        _mesh(label+"_longitudinal_inner_liner_%02d"%i,verts,quads,
              p["steel"] if i%3 else p["dark"],root)
    # Keep the center cavity open. Retain thin radial cooling detail near
    # the outside wall, but no solid fan or central hub.

def _hull_panels(name,root,p,w,h):
    # Short segmented sections; do not bury panels inside the original hull.
    scale=min(w*.34,1.11)
    fore=h/2-.70 if h>=8 else min(h/2-.50,1.25)
    aft=-h/2+1.05 if h>=8 else max(-h/2+.60,-1.60)
    length=fore-aft
    for side in (-1,1):
        for band in range(4):
            ta=.14+band*.182
            tb=ta+.147
            a=aft+ta*length;b=aft+tb*length
            # Lofted shoulder curvature responds to y-station as hull tapers.
            stations=[(a,scale*.99,.60),
                      (a+(b-a)*.30,scale*1.105,.64),
                      (a+(b-a)*.70,scale*1.13,.64),
                      (b,scale*1.02,.59)]
            _ellipse_plate(name+"_cast_pressure_panel_%s_%d"%(side,band),
                           root,p["steel"] if band%2 else p["ceramic"],stations,side)
            edge_x=side*scale*.78
            _ring_fastener(name+"_panel_pin",edge_x,a+.08,.24,p["brass"],root,.058)
        _ribbed_finbank(name+"_cooling_stack",root,p,side,fore-.52,span_x=min(w*.28,.9))

def _dorsal_spine(name,root,p,w,h):
    # Articulated crown assembly interrupts the previous 'smooth steel egg'.
    fore=h/2-.86 if h>=8 else min(h/2-.63,1.09)
    aft=-h/2+1.14 if h>=8 else max(-h/2+.74,-1.42)
    for idx in range(6):
        center=aft+(idx+.5)*(fore-aft)/6
        arc=[(center-(fore-aft)*.050,.32,.55),
             (center-(fore-aft)*.020,.39,.68),
             (center+(fore-aft)*.022,.39,.68),
             (center+(fore-aft)*.047,.32,.55)]
        # Shallow conformal crown plate with beveled edges and exposed slots.
        verts=[]
        for yy,half_width,rise in arc:
            for j in range(6):
                x=-half_width+j*2*half_width/5
                verts.append((x,yy,-.31+rise-.12*(x/max(.15,half_width))**2))
        faces=[]
        for j in range(3):
            for k in range(5):
                a=j*6+k
                faces.append((a,a+1,a+7,a+6))
        _mesh(name+"_dorsal_pressure_rib_%02d"%idx,verts,faces,
              p["dark"] if idx%2 else p["copper"],root,.025)
        for side in (-1,1):
            _ring_fastener(name+"_dorsal_rivet",side*.30,center,.30,
                           p["brass"],root,.043)


def _thermal_coils(name,root,p,w,h,api):
    tube=api["tube"]
    if w<2: return
    # Copper-plated transfer loop, clearly separate from main pressure shell.
    for side in (-1,1):
        x=side*min(w*.29,1.0)
        tube(name+"_upper_supercharger_loop_"+str(side),
             [(x,h/2-.78,-.13),
              (x-side*.10,h/2-1.22,.48),
              (x-side*.06,-.20,.50),
              (x-side*.13,-.75,.34)],.075,p["copper"],root)
        for yy in (h/2-1.06,-.33):
            _pipe_saddle(name+"_coolant_retainer",root,p,x-side*.08,yy,.48)

def _void_spine_details(name,root,p,h,api):
    # Slim alternating shield windows give the 1x9 design repeating hierarchy.
    for idx in range(8):
        y=-h/2+.9+idx*(h-1.8)/7
        for side in (-1,1):
            _ring_fastener("VOID_spinal_coil_fastener_%s_%d"%(side,idx),
                           side*.29,y,.055,p["steel"],root,.05)
            if idx%2:
                api["ellipsoid"]("VOID_spinal_inspection_port",
                                 (side*.205,y,.09),(.10,.18,.05),
                                 p["ceramic"],root)
    tube=api["tube"]
    for side in (-1,1):
        tube("void_data_waveguide_"+str(side),
             [(side*.31,h/2-.58,-.25),
              (side*.34,1.6,.12),
              (side*.32,-1.6,.12),
              (side*.29,-h/2+.50,-.22)],.028,p["brass"],root)

def _weather_material(material,intensity=.17):
    if material is None or not material.use_nodes: return
    if material.get("R05_metal_surface"):return
    bsdf=material.node_tree.nodes.get("Principled BSDF")
    if not bsdf:return
    material["R05_metal_surface"]=True
    tree=material.node_tree
    nodes=tree.nodes;links=tree.links
    base=tuple(bsdf.inputs["Base Color"].default_value)
    tex=nodes.new("ShaderNodeTexNoise");tex.inputs["Scale"].default_value=37
    tex.inputs["Detail"].default_value=2.2
    tex.inputs["Roughness"].default_value=.72
    ramp=nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position=.16
    ramp.color_ramp.elements[1].position=.88
    ramp.color_ramp.elements[0].color=tuple(max(.008,min(1.,c*(1-intensity))) for c in base[:3])+(1,)
    ramp.color_ramp.elements[1].color=tuple(max(.008,min(1.,c*(1+intensity))) for c in base[:3])+(1,)
    links.new(tex.outputs["Fac"],ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"],bsdf.inputs["Base Color"])
    bump=nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value=.15
    bump.inputs["Distance"].default_value=.015
    links.new(tex.outputs["Fac"],bump.inputs["Height"])
    links.new(bump.outputs["Normal"],bsdf.inputs["Normal"])
    # Muted, oil-darkened machinery: less mirrorlike than the R04 capsule.
    bsdf.inputs["Roughness"].default_value=.57
    bsdf.inputs["Metallic"].default_value=.27 if "iron" in material.name else .42

def apply_finishes(p):
    for key in ("steel","dark","iron","brass","copper","ceramic"):
        _weather_material(p.get(key),.13 if key=="ceramic" else .19)

def add_details(name,w,h,root,p,api):
    """R06 material/shape QA uses the same nozzle profiles as the base meshes."""
    if "graybox" in name:return
    from thruster_profile_r06 import nozzle_profiles
    apply_finishes(p)
    profiles=nozzle_profiles(name,w,h)
    if name.startswith("void-fusion"):
        _void_spine_details(name,root,p,h,api)
    elif name.startswith("large-void"):
        _hull_panels("heavy_drive",root,p,w,h)
        _dorsal_spine("heavy_drive",root,p,w,h)
        _thermal_coils("heavy_drive",root,p,w,h,api)
    elif name.startswith("thetazine"):
        _hull_panels("thetazine",root,p,w,h)
        _dorsal_spine("thetazine",root,p,w,h)
        _thermal_coils("thetazine",root,p,w,h,api)
        for side in (-1,1):_pipe_bundle("thetazine",root,p,side,w,h,api)
    else:
        _hull_panels("single_reactor",root,p,w,h)
        _dorsal_spine("single_reactor",root,p,w,h)
        _thermal_coils("hydrogen",root,p,w,h,api)
        for side in (-1,1):_pipe_bundle("hydrogen",root,p,side,w,h,api)
    for label,x,y,z,diam,color in profiles:
        _nozzle_petals(label,x,y,z,diam,root,p,color)
