"""Single authoritative geometric placement contract for R06 thruster bells.

Units: tiles / Blender world units. +Y platform, -Y aft exhaust; z<0 inset
into platform. This contract describes candidate geometry only. Final game
sprite shift/scale still comes from Tech Priests Lua and Factorio 2.0.77.
"""

def nozzle_profiles(name, w, h):
    rear=-h/2
    z=-.43
    if name.startswith("large-void"):
        result=[("heavy_fusion_bell_%s"%x,x,rear-.20,z,1.15,"violet")
                for x in (-1.03,0.,1.03)]
    elif name.startswith("void-fusion"):
        result=[("spinal_void_bell",0.,rear-.16,-.36,.74,"violet")]
    elif name.startswith("thetazine"):
        result=[("thetazine_dual_bell_%s"%x,x,rear-.16,z,1.56,"violet")
                for x in (-.88,.88)]
    elif name.startswith("test-04"):
        result=[("vanilla_reference_bell",0.,rear-.20,z,3.06,"blue")]
    else:
        result=[("hydrogen_reactor_bell",0.,rear-.20,z,2.55,"blue")]
    # Reject physically impossible bell geometry before Blender is launched.
    for label,x,y,level,dia,color in result:
        if abs(x)+dia*.57>w/2+.02:
            raise ValueError("Bell protrudes sideways outside permitted footprint: "+label)
        if not y<rear:
            raise ValueError("Thruster exit must be aft of the platform: "+label)
        if level>=0:
            raise ValueError("Thruster axis should be inset below deck: "+label)
    return result

def metadata(name,w,h):
    details=nozzle_profiles(name,w,h)
    return [{"label":n,"x":x,"y":y,"z":z,"diameter_tiles":d,"glow":g}
            for n,x,y,z,d,g in details]
