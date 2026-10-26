"""R07 vanilla prototype-conditioned pipe connection overlays.

From Factorio 2.0.77 space-age/prototypes/entity/entities.lua:
pipe-1 oxidizer east +1.5,-2 ; pipe-2 fuel east +1.5,0 ;
pipe-3 oxidizer west -1.5,0 ; pipe-4 fuel west -1.5,-2.

Input positions are FACTORIO map coordinates (+Y aft). Blender Y is
the negative of Factorio Y. Each generated collection is hidden until
exported as its own independent static PNG, never baked into body frames.
"""
import bpy

PORTS=(
    ("pipe-1","oxidizer",+1.5,-2.0),
    ("pipe-2","fuel",+1.5,0.0),
    ("pipe-3","oxidizer",-1.5,0.0),
    ("pipe-4","fuel",-1.5,-2.0),
)

def _tube(label,points,radius,material,collection,root):
    curve=bpy.data.curves.new(label,"CURVE")
    curve.dimensions="3D";curve.resolution_u=20
    curve.bevel_depth=radius;curve.bevel_resolution=4
    spl=curve.splines.new("BEZIER")
    spl.bezier_points.add(len(points)-1)
    for p,coords in zip(spl.bezier_points,points):
        p.co=coords;p.handle_left_type="AUTO";p.handle_right_type="AUTO"
    ob=bpy.data.objects.new(label,curve);collection.objects.link(ob)
    ob.data.materials.append(material);ob.parent=root
    ob.hide_render=True
    return ob

def _torus(label,pos,major,minor,material,collection,root):
    bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=8,
                                    location=pos,rotation=(0,1.5707963267948966,0),
                                    major_radius=major,minor_radius=minor)
    ob=bpy.context.object;ob.name=label
    for previous in list(ob.users_collection):previous.objects.unlink(ob)
    collection.objects.link(ob)
    ob.data.materials.append(material);ob.parent=root
    ob.hide_render=True
    return ob

def add_pipe_visuals(scene,root,materials):
    for visual_name,kind,map_x,map_y in PORTS:
        collection=bpy.data.collections.new("CONDITIONAL_"+visual_name)
        scene.collection.children.link(collection)
        x,y=map_x,-map_y
        side=1 if x>0 else -1
        pipe_material=materials["copper"] if kind=="fuel" else materials["steel"]
        # Actual physical connection is at the prototype map x/y. Only
        # its rendered stub/coupler is conditional. Do not move it to
        # the visually convenient center of the body.
        _tube(visual_name+"_provenance_map_port",
              [(x+side*.25,y,-.26),(x,y,-.26),
               (x-side*.35,y-.23,-.30),(x-side*.64,y-.48,-.34)],
              .093,pipe_material,collection,root)
        _torus(visual_name+"_outer_flanged_adapter",
               (x,y,-.26),.20,.055,materials["brass"],collection,root)
        _torus(visual_name+"_inner_sealing_ring",
               (x+side*.04,y,-.26),.13,.03,materials["dark"],collection,root)
        label=bpy.data.objects.new("ANCHOR_"+visual_name+"_factorio_x"+
             str(map_x)+"_y"+str(map_y),None)
        collection.objects.link(label)
        label.location=(x,y,-.26)
        label.hide_render=True
    scene["fsc_pipe_connection_contract"]=str(list(PORTS))
    scene["fsc_pipe_overlay_count"]=len(PORTS)
    return ["CONDITIONAL_"+x[0] for x in PORTS]
