"""Headless Blender 4.5 calibration and R03 thruster scene/capture batch.

Produces editable .blend scenes, registered transparent PNG sequences and
per-asset metadata. These are candidate visual tests, not Factorio art swaps.
Blender +X=east, +Y=north, +Z=height; exhaust exits -Y (south).
"""
import argparse
import json
import math
import sys
from pathlib import Path

# Blender --python does not guarantee the calling script directory is importable.
SOURCE_ROOT=str(Path(__file__).resolve().parent)
if SOURCE_ROOT not in sys.path:sys.path.insert(0,SOURCE_ROOT)

import bpy
from mathutils import Vector

SPECS = {
    "test-01-graybox": (4, 4, 192, 192, 1, 4),
    "test-02-emission": (4, 4, 192, 256, 5, 1),
    "test-03-animation-drift": (4, 4, 192, 256, 12, 1),
    "test-04-vanilla-approx": (4, 8, 320, 640, 12, 1),
    "hydrogen-thruster-r09": (4, 4, 192, 384, 7, 1),
    "thetazine-thruster-r09": (5, 5, 192, 384, 2, 1),
    "void-fusion-thruster-r09": (1, 9, 160, 512, 2, 1),
    "large-void-fusion-thruster-r09": (4, 4, 256, 384, 1, 1),
}
PROTOTYPE = {
    # Vanilla calibration geometry: the Space Age thruster is 4x8, not 4x4.
    # The official graphics_set uses a separate floor integration_patch,
    # 64-frame animation at speed .5, shift {0,3}, scale .5 in Factorio 2.0.77.
    # Preview cell 192x416 is NOT asserted to be vanilla production sprite size.
    "test-04-vanilla-approx": {"selection_box":[[-2,-2.5],[2,5.5]],
       "ground_buildability_box":[[-1.8,-2.3],[1.8,2.3]],
       "mount_span_tiles":[4,4.75],"preview_extent":[4,8],
       "vanilla_engine_animation_frames":64,"speed":0.5,"scale":0.5,
       "shift":[0,3],"integration_patch_render_layer":"floor",
       "flame_effect_position_factorio":[0,5.5],"blender_to_factorio_y_sign":-1},

    "hydrogen-thruster-r09": {"full_cell": [256,512], "speed": 0.18, "scale": 0.54, "shift": [0,1.25], "pipes":[[-1.8,-1.0],[1.8,-1.0]]},
    "thetazine-thruster-r09": {"full_cell": [256,512], "speed": 0.12, "scale": 0.55, "shift": [0,1.65], "pipes":[[-2.1,-1.0],[2.1,-1.0]]},
    "void-fusion-thruster-r09": {"full_cell": [192,576], "speed": 0.08, "scale": 0.50, "shift": [0,-0.10], "pipes":[]},
    "large-void-fusion-thruster-r09": {"full_cell": [384,512], "speed": 0.08, "scale": 0.40, "shift": [0,1.25], "pipes":[]},
}

def mat(name, rgb, metallic=0.45, roughness=0.38, emit=False):
    result = bpy.data.materials.new(name)
    result.diffuse_color = (*rgb, 1)
    result.use_nodes = True
    bsdf = result.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = (*rgb, 1)
    bsdf.inputs["Metallic"].default_value = metallic
    bsdf.inputs["Roughness"].default_value = roughness
    if emit:
        bsdf.inputs["Emission Color"].default_value = (*rgb, 1)
        bsdf.inputs["Emission Strength"].default_value = 1.2
    return result

def setup_palette():
    return {
        "iron":mat("01_oiled_iron",(.17,.22,.25)),
        "steel":mat("02_polished_steel",(.45,.53,.58)),
        "dark":mat("03_oxidized_metal",(.055,.075,.09)),
        "copper":mat("04_heat_aged_copper",(.44,.20,.085)),
        "brass":mat("05_brass_clamps",(.55,.34,.105)),
        "ceramic":mat("06_hot_ceramic",(.62,.61,.52),.1),
        "blue":mat("07_ion_blue",(.045,.55,.9),0,.35,True),
        "violet":mat("08_void_violet",(.47,.14,.88),0,.35,True),
        "orange":mat("09_exhaust_amber",(1,.25,.025),0,.5,True),
    }

ROOT = None
MATERIALS = {}
GLOW_MATS = []

def own(obj, material, label):
    obj.name=label
    obj.data.materials.append(MATERIALS[material])
    obj.parent=ROOT
    return obj

def cube(label, xyz, dims, metal="iron", bevel=.055):
    bpy.ops.mesh.primitive_cube_add(size=1, location=xyz)
    ob=bpy.context.object
    ob.dimensions=dims
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel>0:
        m=ob.modifiers.new("Radiused machined edges","BEVEL")
        m.width=min(bevel,min(dims)*.2);m.segments=2
        ob.modifiers.new("Weighted machined normals","WEIGHTED_NORMAL")
    return own(ob,metal,label)

def cyl(label, xyz, radius, depth, metal="steel", vertices=24, axis="Z"):
    rot=(math.pi/2,0,0) if axis=="Y" else (0,0,0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=xyz,rotation=rot)
    ob=bpy.context.object
    ob.modifiers.new("Weighted normals","WEIGHTED_NORMAL")
    return own(ob,metal,label)

def nozzle(label, x, y, z, radius=.52, metal="steel"):
    bpy.ops.mesh.primitive_cone_add(vertices=32, radius1=radius, radius2=radius*.56,
                                  depth=.90, location=(x,y,z), rotation=(math.pi/2,0,0))
    ob=own(bpy.context.object,metal,label)
    ob.modifiers.new("Weighted normals","WEIGHTED_NORMAL")
    cyl(label+"_exit_lip",(x,y-.46,z),radius*.94,.12,"brass",axis="Y")
    cyl(label+"_recess",(x,y-.54,z),radius*.66,.035,"dark",axis="Y")
    cyl(label+"_field",(x,y-.555,z),radius*.44,.04,"blue" if "hydrogen" in label else "violet",axis="Y")

def torus(label,x,y,z,major,metal,minor=.07,axis="Y"):
    bpy.ops.mesh.primitive_torus_add(major_segments=32, minor_segments=8,
       location=(x,y,z), rotation=((math.pi/2,0,0) if axis=="Y" else (0,0,0)),
       major_radius=major,minor_radius=minor)
    return own(bpy.context.object,metal,label)

def rail_and_mount(w,h):
    front=h/2-.28
    cube("platform_mating_flange",(0,front,.19),(w-.32,.36,.3),"dark")
    cube("platform_gold_socket_strip",(0,front,.42),(w-.34,.16,.14),"brass")
    for side in (-1,1):
        sx=side*(w/2-.23)
        cube("longitudinal_frame_rail",(sx,.06,.28),(.16,h-.70,.23),"steel")
        for y in (front-.28,front-.72):
            cyl("mounting_bolt",(sx,y,.50),.07,.10,"brass")
    cube("central_support",(0,.10,.20),(max(.30,w-.72),max(1.,h-1.0),.22),"iron")

def chemical(w,h,advanced=False):
    rail_and_mount(w,h)
    cyl("primary_reactor",(0,.54,.77),.69 if not advanced else .85,1.5,"dark",axis="Y")
    for y in (-.15,.22,.65,1.03):
        torus("reaction_chamber_rib",0,y,.77,.72 if not advanced else .88,"brass")
    nozzle_y=-1.09 if not advanced else -1.35
    coords=[0] if not advanced else [-.75,.75]
    for i,x in enumerate(coords):
        nozzle(("thetazine" if advanced else "hydrogen")+"_nozzle_"+str(i),x,nozzle_y,.75,.53 if not advanced else .49)
    for side in (-1,1):
        sx=side*(w/2-.68)
        cyl("propellant_tank",(sx,.55,.64),.32,1.45,"copper" if not advanced else "dark",axis="Y")
        for y in (-.12,.93):
            torus("tank_collar",sx,y,.64,.36,"brass")
        cube("flank_guard",(side*(w/2-.13),-.10,.67),(.18,1.85,.23),"ceramic" if advanced else "iron")
        cube("feed_port",(sx,1.16,.73),(.35,.35,.25),"steel")
    if advanced:
        cube("reactor_command_deck",(0,1.58,1.1),(1.25,.64,.26),"steel")
        for x in (-.34,0,.34):
            cube("status_light",(x,1.52,1.25),(.14,.12,.06),"violet",0)
    else:
        for x in (-.9,.9):
            cube("cooling_vent",(x,-.37,1.03),(.24,.72,.12),"brass")

def void_spine():
    rail_and_mount(1,9)
    cube("sealed_reliquary_housing",(0,0,.72),(.62,7.15,.72),"dark")
    cube("violet_core_guide",(0,0,1.11),(.15,6.3,.09),"violet",.015)
    for i in range(9):
        y=-3.45+i*.85
        cube("transverse_containment_clamp",(0,y,1.05),(.78,.14,.17),"brass",.015)
        cyl("spine_reactor_cell",(0,y,.76),.24,.31,"steel",axis="Y")
    nozzle("void_spine_exit",0,-3.80,.76,.29)
    cube("front_electronics",(0,3.34,1.18),(.56,.52,.29),"steel")

def heavy_void():
    rail_and_mount(4,4)
    cube("heavy_reactor_housing",(0,.65,.78),(2.55,1.44,1.1),"dark")
    cube("armored_reactor_spine",(0,.67,1.38),(1.63,.98,.27),"steel")
    for x in (-.99,0,.99):
        nozzle("heavy_void_nozzle_"+str(x),x,-.9,.72,.48)
        cube("violet_field_tile",(x,.88,1.54),(.30,.55,.10),"violet")
    for side in (-1,1):
        cube("wing_armor",(side*1.48,.10,.76),(.32,2.55,.42),"ceramic")
        cube("reinforcement_rib",(side*1.23,.90,1.06),(.20,1.18,.22),"brass")

def vanilla_approx():
    rail_and_mount(4,4)
    cube("reference_housing",(0,.38,.62),(2.15,2.23,.87),"iron")
    cube("reference_top_machining",(0,1.0,1.11),(1.7,.76,.24),"steel")
    cyl("reference_reaction_core",(0,-.14,.78),.56,1.45,"dark",axis="Y")
    for y in (-.56,.12,.69):
        torus("reference_circular_rib",0,y,.78,.61,"brass")
    nozzle("hydrogen_vanilla_reference",0,-1.04,.70,.73)
    for side in (-1,1):
        cube("reference_supply_pipe",(side*1.27,.60,.74),(.27,1.65,.24),"copper")
        cyl("reference_flange",(side*1.27,1.35,.74),.21,.14,"steel",axis="Y")

def graybox():
    cube("readable_body",(0,.35,.62),(2.35,2.18,.95),"iron")
    cube("mounting_rail",(0,1.70,.21),(3.7,.35,.35),"steel")
    nozzle("hydrogen_graybox",0,-1.08,.61,.70)
    cube("orientation_mark_left",(-1.05,1.03,1.22),(.35,.48,.14),"orange")
    cube("orientation_mark_right",(1.05,1.03,1.22),(.35,.48,.14),"blue")

def benchmark(name,w,h):
    if name.endswith("graybox"):
        graybox()
    else:
        # R04 uses genuine contoured/lofted meshes and a recessed C-channel
        # mount rather than R03's freestanding plate plus boxes.
        import sculpted_thruster_r04
        sculpted_thruster_r04.build_thruster(name,w,h,ROOT,MATERIALS)

def add_nonrender_jig(w,h):
    guides=bpy.data.collections.new("CALIBRATION_NOT_RENDERED")
    bpy.context.scene.collection.children.link(guides)
    for axis,count in ((0,w),(1,h)):
        for k in range(count+1):
            a=Vector((-w/2+k,-h/2,.02)) if axis==0 else Vector((-w/2,-h/2+k,.02))
            b=Vector((-w/2+k,h/2,.02)) if axis==0 else Vector((w/2,-h/2+k,.02))
            curve=bpy.data.curves.new("tile_grid","CURVE")
            curve.dimensions="3D"
            curve.bevel_depth=.015
            poly=curve.splines.new("POLY");poly.points.add(1)
            poly.points[0].co=(*a,1);poly.points[1].co=(*b,1)
            ob=bpy.data.objects.new("tile_grid_guide",curve);guides.objects.link(ob);ob.hide_render=True
    mark=bpy.data.objects.new("PLATFORM_EDGE_SOUTH_Y_NEGATIVE",None)
    guides.objects.link(mark);mark.location=(0,-h/2,0);mark.hide_render=True

def configure_scene(name,w,h,width,height,num_frames):
    global ROOT,MATERIALS
    bpy.ops.wm.read_factory_settings(use_empty=True)
    ROOT=bpy.data.objects.new("CAPTURE_ROOT_UNROTATED_NORTH",None)
    bpy.context.scene.collection.objects.link(ROOT)
    MATERIALS=setup_palette()
    benchmark(name,w,h)
    add_nonrender_jig(w,h)
    if name.startswith("test-04-vanilla-approx"):
        from vanilla_benchmark_r07 import add_flame_collection
        from vanilla_pipe_overlays_r07 import add_pipe_visuals
        add_flame_collection(bpy.context.scene,ROOT,num_frames)
        add_pipe_visuals(bpy.context.scene,ROOT,MATERIALS)
    for ob in bpy.context.scene.objects:
        if ob.type=="MESH" and ob.parent==ROOT and len(ob.data.vertices):
            ob["source_family"]=name
    # Orthographic scale denotes VERTICAL span. Account for portrait aspect
    # when constraining model width; old 128x256 frames clipped most drives.
    # Keep the 1x9 void spine near front-on to avoid diagonal horizontal spill.
    # Long 4x8 vanilla benchmark should have almost axial projection; the
    # old 3.2-unit lateral offset pushed its large aft bell off the left edge.
    cam_x=(.65 if w==1 else (w*.25 if h>=8 else min(4.,w*.80)))
    # R09 camera sweep verified a more centered, higher view against the
    # vanilla reference. Do not alter custom thrusters' calibrated cameras.
    vanilla_camera=name.startswith("test-04-vanilla-approx")
    camera_origin=((.18,-6.8,10.0) if vanilla_camera
                   else (cam_x,-max(6.,h*.85),max(5.,h*.86)))
    bpy.ops.object.camera_add(location=camera_origin)
    cam=bpy.context.object
    cam.rotation_euler=(Vector((0,0,.56))-cam.location).to_track_quat("-Z","Y").to_euler()
    cam.data.type="ORTHO"
    cam.data.ortho_scale=(max(h*1.40,w*1.35*height/width)
                          if name.startswith("test-04-vanilla-approx")
                          else max(h*1.55,w*1.75*height/width))
    bpy.ops.object.light_add(type="AREA",location=(-4,-5,8))
    light=bpy.context.object;light.data.energy=1100;light.data.size=6
    bpy.ops.object.light_add(type="AREA",location=(4,4,5))
    light=bpy.context.object;light.data.energy=450;light.data.size=4
    scene=bpy.context.scene
    scene.camera=cam
    scene.render.engine="CYCLES";scene.cycles.device="CPU";scene.cycles.samples=8
    scene.render.resolution_x=width;scene.render.resolution_y=height
    scene.render.resolution_percentage=100
    scene.render.film_transparent=True
    scene.render.image_settings.file_format="PNG";scene.render.image_settings.color_mode="RGBA"
    scene.view_settings.view_transform="AgX"
    scene.render.film_transparent=True
    scene.frame_start=1;scene.frame_end=num_frames+1
    # Saved .blend is itself an animated editable object. Keyframe the
    # emissive intensity for idle and run, not merely transient render values.
    for color in ("blue","violet","orange"):
        socket=MATERIALS[color].node_tree.nodes["Principled BSDF"].inputs["Emission Strength"]
        socket.default_value=.08
        socket.keyframe_insert(data_path="default_value",frame=1)
        for k in range(num_frames):
            socket.default_value=max(.05,.9+.65*math.sin((k+1)*math.pi*2/max(1,num_frames)))
            socket.keyframe_insert(data_path="default_value",frame=k+2)
    if name.startswith("test-04"):
        # R09 dark idle throat intentionally has no fixed cyan ignition mesh.
        # R10 running light is already authored in the independent Blender
        # EXHAUST_FLAME_SEPARATE_PASS; do not reintroduce a glowing disc.
        if any("_animated_ignition" in ob.name for ob in bpy.context.scene.objects):
            raise RuntimeError("Vanilla benchmark unexpectedly reintroduced an ignition disc")
    scene.frame_set(1)
    scene["fsc_status"]="CALIBRATION_ONLY_NOT_FACTORIO_APPROVED"
    scene["fsc_axis"]="Blender +X=east,+Y=fore,-Y=aft,+Z=up; Factorio map +Y=aft"
    scene["fsc_map_to_blender"]="Factorio Y = -Blender Y; X unchanged"
    scene["fsc_footprint_tiles"]=json.dumps([w,h])
    scene["fsc_model_revision"]=("r10-vanilla-twelve-frame-hot-jet" if name.startswith("test-04")
                                 else "r09-nozzle-interiors-r06-housing")
    scene["fsc_capture_ortho_scale"]=cam.data.ortho_scale
    scene["fsc_capture_camera_position"]=json.dumps(list(cam.location))
    scene["fsc_camera_selection_evidence"]=("R09 centered_high no-clipping three-angle sweep"
                                            if vanilla_camera else "R06 custom model camera")
    scene["fsc_capture_direction"]="prototype orientation south exhaust, no dynamic rotation for source"
    scene["fsc_full_prototype_metadata"]=json.dumps(PROTOTYPE.get(name,{}))
    return scene

def capture_one(out_dir,name):
    w,h,width,height,frames,directions=SPECS[name]
    scene=configure_scene(name,w,h,width,height,frames)
    target=out_dir/name
    (target/"scenes").mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str((target/"scenes"/(name+".blend")).resolve()))
    manifest={"asset":name,"footprint_tiles":[w,h],"preview_cell":[width,height],"run_frames":frames,
              "directions":directions,"prototype_reference":PROTOTYPE.get(name),
              "source_revision":"r10-vanilla-long-jet" if name.startswith("test-04") else "r09-nozzle-liner",
              "status":"candidate_environment_test_not_game_approved",
              "blender_version":bpy.app.version_string,"frame_files":[],
              "floor_integration_patch":None,"floor_layer_hint":"integration_patch_render_layer = floor",
              "flame_frames":[],"pipe_overlay_files":{},
              "pipe_overlay_contract":"2.0.77 graphics_set conditional working visualisations",
              "flame_effect_contract":"independent optional effect, not in engine atlas",
              "vanilla_prototype_geometry":json.loads(scene.get("fsc_vanilla_prototype_reference","null"))}
    # Render the static under-deck integration patch separately from the
    # engine animation, as in the original Space Age thruster graphics_set.
    floor=bpy.data.collections.get("FLOOR_INTEGRATION_PATCH")
    if floor and len(floor.objects):
        floor_set=set(floor.objects)
        renderable=[ob for ob in scene.objects if ob.type in {"MESH","CURVE","SURFACE"}]
        previous={ob:ob.hide_render for ob in renderable}
        for ob in renderable: ob.hide_render=(ob not in floor_set)
        scene.frame_set(1)
        patch=target/"integration_patch.png"
        scene.render.filepath=str(patch.resolve())
        try:
            bpy.ops.render.render(write_still=True)
        finally:
            for ob,hidden in previous.items(): ob.hide_render=hidden
        if not patch.is_file():raise RuntimeError("Missing floor integration patch image")
        manifest["floor_integration_patch"]="integration_patch.png"
    for direction in range(directions):
        ROOT.rotation_euler[2]=math.radians(direction*360/directions)
        for state,count in (("idle",1),("run",frames)):
            # Graybox does not need a separate animation test.
            if name=="test-01-graybox" and state=="run":continue
            for k in range(count):
                scene.frame_set(1+k if state=="idle" else k+2)
                relative=Path("frames")/("direction-%02d"%direction)/state/("%03d.png"%(k+1))
                output=target/relative
                output.parent.mkdir(parents=True,exist_ok=True)
                scene.render.filepath=str(output.resolve())
                bpy.ops.render.render(write_still=True)
                if not output.is_file():raise RuntimeError("Render missing "+str(output))
                manifest["frame_files"].append(str(relative).replace("\\","/"))
    ROOT.rotation_euler[2]=0
    if name.startswith("test-04-vanilla-approx"):
        from vanilla_pipe_overlays_r07 import PORTS
        preserve={ob:ob.hide_render for ob in scene.objects
                  if ob.type in {"MESH","CURVE","SURFACE"}}
        try:
            scene.frame_set(1)
            for identifier,kind,map_x,map_y in PORTS:
                group=bpy.data.collections["CONDITIONAL_"+identifier]
                active=set(group.objects)
                for ob in preserve:ob.hide_render=ob not in active
                relative=Path("pipe-overlays")/(identifier+".png")
                output=target/relative;output.parent.mkdir(parents=True,exist_ok=True)
                scene.render.filepath=str(output.resolve())
                bpy.ops.render.render(write_still=True)
                if not output.is_file():raise RuntimeError("Missing conditional overlay "+str(output))
                manifest["pipe_overlay_files"][identifier]=str(relative).replace("\\","/")
        finally:
            for ob,hidden in preserve.items():ob.hide_render=hidden
    flame=bpy.data.collections.get("EXHAUST_FLAME_SEPARATE_PASS")
    if flame and flame.objects:
        # Separate exported effect: never bake the dynamic plume into the
        # animated body or static floor patch (Factorio has flame_effect).
        preserve={ob:ob.hide_render for ob in scene.objects
                  if ob.type in {"MESH","CURVE","SURFACE"}}
        effect=set(flame.objects)
        try:
            for ob in preserve:ob.hide_render=ob not in effect
            for k in range(frames):
                scene.frame_set(k+2)
                relative=Path("effects")/"flame"/("%03d.png"%(k+1))
                output=target/relative;output.parent.mkdir(parents=True,exist_ok=True)
                scene.render.filepath=str(output.resolve())
                bpy.ops.render.render(write_still=True)
                if not output.is_file():raise RuntimeError("Missing separate flame pass "+str(output))
                manifest["flame_frames"].append(str(relative).replace("\\","/"))
        finally:
            for ob,old in preserve.items():ob.hide_render=old
            scene.frame_set(1)
    (target/"capture-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
    print("CAPTURE_SUCCESS",name,len(manifest["frame_files"]),flush=True)

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--output",type=Path,required=True)
    ap.add_argument("--group",choices=["calibration","models","all"],default="all")
    args=ap.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else [])
    selected=[n for n in SPECS if args.group=="all" or
             (args.group=="calibration")==n.startswith("test-")]
    output=args.output.resolve()
    for asset in selected:capture_one(output,asset)
    print("BATCH_COMPLETE",args.group,len(selected),str(output),flush=True)

if __name__=="__main__":main()
