"""Verified 2.0.77 vanilla thruster reference geometry and R07 separated flame.

Never mix Factorio map Y with Blender Y: Factorio south/down is +Y;
our modeling convention is Blender -Y aft/down. Factorio Y = -Blender Y.

This is benchmark art, not Wube original graphics or a game-ready asset.
Authoritative source: wube/factorio-data tag 2.0.77,
space-age/prototypes/entity/entities.lua, thruster entity definition.
"""
import math
import bpy

SOURCE="https://github.com/wube/factorio-data/blob/2.0.77/space-age/prototypes/entity/entities.lua"
VANILLA_WIKI_REFERENCE="https://wiki.factorio.com/File:Thruster_entity_anim.gif"
COLLISION_BOX=[[-1.7,-2.2],[1.7,2.2]]
SELECTION_BOX=[[-2,-2.5],[2,5.5]]
BUILDABLE_AREA=[[-1.8,-2.3],[1.8,2.3]]
EMPTY_SPACE_START_Y=2.7
FLAME_POSITION=(0,5.5)
FRAME_COUNT=64
ANIMATION_SPEED=0.5
SCALE=0.5
SHIFT=[0,3]
# Blender physical model is narrower/shorter than the selection overlay.
MOUNT_SPAN_TILES=(4.0,4.75)
BLENDER_NOZZLE_AXIS_Y=-(MOUNT_SPAN_TILES[1]/2+.20)
BLENDER_AFT_MAP_Y=lambda y:-y

def benchmark_contract():
    return {
        "reference":"Factorio 2.0.77 official vanilla prototype",
        "source_url":SOURCE,"screenshot_url":VANILLA_WIKI_REFERENCE,
        "collision_box_factorio":COLLISION_BOX,
        "selection_box_factorio":SELECTION_BOX,
        "ground_buildability_box_factorio":BUILDABLE_AREA,
        "factorio_positive_y":"aft/exhaust",
        "blender_negative_y":"aft/exhaust",
        "transformation":"Factorio Y=-Blender Y; same X",
        "flame_position_factorio":list(FLAME_POSITION),
        "main_engine_frame_count":FRAME_COUNT,
        "main_engine_animation_speed":ANIMATION_SPEED,
        "main_sprite_scale":SCALE,
        "main_sprite_shift":SHIFT,
        "model_mount_span_blender_tiles":list(MOUNT_SPAN_TILES),
        "model_aft_edge_blender_y":-MOUNT_SPAN_TILES[1]/2,
        "flame_pass":"separate from main body and floor integration",
        "reference_image_not_redistributed":True,
        "not_a_visual_fidelity_claim":True
    }

def _emissive_material(name,color,alpha,strength):
    material=bpy.data.materials.new(name)
    material.use_nodes=True
    nt=material.node_tree
    nt.nodes.clear()
    out=nt.nodes.new("ShaderNodeOutputMaterial")
    emissive=nt.nodes.new("ShaderNodeEmission")
    emissive.inputs["Color"].default_value=(*color,1)
    # Avoid AgX clipping every material to pale white: hue matters here.
    emissive.inputs["Strength"].default_value=float(strength)
    transparent=nt.nodes.new("ShaderNodeBsdfTransparent")
    blend=nt.nodes.new("ShaderNodeMixShader")
    blend.inputs[0].default_value=float(alpha)
    nt.links.new(transparent.outputs[0],blend.inputs[1])
    nt.links.new(emissive.outputs[0],blend.inputs[2])
    nt.links.new(blend.outputs[0],out.inputs["Surface"])
    return material

def _plume_mesh(name,y0,length,max_radius,material,root,collection,phase):
    rings=16
    sides=36
    verts=[]
    for k in range(rings):
        t=k/(rings-1)
        y=y0-length*t
        # Exhaust is narrow at the nozzle, broad in the shock diamond, and
        # fades to a trailing point; avoid a single cartoon cone.
        # Bell expansion into a broad, continuous blue plume: no truncated
        # icy triangular spear or zero-radius end cap.
        bell=math.sin(math.pi*max(.01,min(.99,t)))
        radius=max_radius*(.36+.90*bell**.72)
        radius*=max(.04,(1-t)**.48)
        # Concentric streamwise turbulence changes little frame-to-frame;
        # the art must remain registered to the unchanged engine body.
        for j in range(sides):
            a=2*math.pi*j/sides
            flutter=1+.045*math.cos(5*a+8*t+phase)
            verts.append((radius*math.cos(a)*flutter,y,
                          -.43+radius*math.sin(a)*flutter))
    faces=[]
    for k in range(rings-1):
        for j in range(sides):
            a=k*sides+j;b=k*sides+(j+1)%sides
            faces.append((a,b,b+sides,a+sides))
    mesh=bpy.data.meshes.new(name+"_mesh")
    mesh.from_pydata(verts,[],faces);mesh.update()
    ob=bpy.data.objects.new(name,mesh)
    collection.objects.link(ob)
    ob.parent=root
    ob.data.materials.append(material)
    for f in mesh.polygons:f.use_smooth=True
    ob.hide_render=True
    return ob

def add_flame_collection(scene,root,frame_count):
    """Keyframe a physically separate exhaust pass; not present at idle frame 1."""
    effect=bpy.data.collections.new("EXHAUST_FLAME_SEPARATE_PASS")
    scene.collection.children.link(effect)
    mats=[
        _emissive_material("flame_outer_cyan_r07",(.035,.23,1.0),.48,1.10),
        _emissive_material("flame_inner_blue_r07",(.06,.83,1.0),.64,1.55),
        _emissive_material("flame_hot_white_r07",(1.0,.74,.39),.79,2.10),
    ]
    # Factorio vanilla flame starts near map +5.5, i.e. Blender -5.5.
    # Generated geometry begins at nozzle exit then extends to -5.5:
    # explicit effect is independent of animation and integration patch.
    y0=-2.98
    # R10 extends the real stream beyond the rocket body; the original
    # R07 effect looked like a short cyan bubble at the nozzle mouth.
    lengths=(3.48,2.91,2.04)
    radii=(.79,.51,.21)
    objects=[]
    for i,mat in enumerate(mats):
        ob=_plume_mesh("flame_layer_%02d"%i,y0,lengths[i],radii[i],
                       mat,root,effect,phase=.55*i)
        objects.append(ob)
        ob.scale=(.001,.001,.001)
        ob.keyframe_insert(data_path="scale",frame=1)
        for frame in range(2,frame_count+2):
            flicker=1+.08*math.sin(frame*1.37+i*1.6)
            ob.scale=(flicker,1+.06*math.sin(frame*.88+i),flicker)
            ob.keyframe_insert(data_path="scale",frame=frame)
    scene["fsc_flame_effect_objects"]=len(objects)
    scene["fsc_flame_factorio_anchor_map_y"]=FLAME_POSITION[1]
    scene["fsc_flame_source"]="R10 elongated blue jet with separate hot core, not vanilla bitmap"
    scene["fsc_flame_hue_validation"]="no-whiteout material strength plus independent alpha bounds"
    return effect
