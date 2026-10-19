"""Blender background production: derive three recognisable recorders from the existing shell.

blender --background --python development/assets/build_recorders.py
Original conversion stays untouched. Each output has one mesh/material and a 256x128 atlas.
"""
import bpy, bmesh, hashlib, json, math
from pathlib import Path
from mathutils import Vector

PROJECT=Path(__file__).resolve().parents[2]
RUNTIME=PROJECT/'assets/runtime/models'
PRODUCTION=Path(__file__).resolve().parent
PREVIEWS=PRODUCTION/'previews'
EDITABLE=PRODUCTION/'blender'
SOURCE=RUNTIME/'exploration_voice_recorder.glb'
SWATCHES=[(.055,.07,.085,1),(.22,.26,.28,1),(.58,.64,.63,1),(.3,.68,.58,1),(.74,.13,.1,1),(.06,.14,.13,1)]

def component(name, location, dimensions, material, swatch, cylinder=False):
    if cylinder:
        bpy.ops.mesh.primitive_cylinder_add(vertices=8, radius=1, depth=2,location=location,rotation=(math.pi/2,0,0))
    else: bpy.ops.mesh.primitive_cube_add(size=1,location=location)
    obj=bpy.context.object;obj.name=name;obj.dimensions=dimensions
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    obj.data.materials.clear();obj.data.materials.append(material)
    layer=obj.data.uv_layers.active or obj.data.uv_layers.new()
    u=.5+((swatch%4)+.5)/8;v=((swatch//4)+.5)/4
    for loop in layer.data:loop.uv=(u,v)
    return obj

def build(tier):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(SOURCE))
    meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes:obj.select_set(True)
    bpy.context.view_layer.objects.active=meshes[0]
    bpy.ops.object.join();shell=bpy.context.object;shell.name=f'Recorder_T{tier}_source_shell'
    shell.rotation_euler.z+=math.pi/2
    bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
    # Imported geometry is a thin side-facing shell. Face it forward and fit measured metres.
    verts=[shell.matrix_world@v.co for v in shell.data.vertices]
    low=Vector(tuple(min(v[i] for v in verts) for i in range(3)))
    high=Vector(tuple(max(v[i] for v in verts) for i in range(3)))
    center=(low+high)/2
    desired=Vector((.095+.014*(tier-1),.035+.006*(tier-1),.22+.016*(tier-1)))
    for vertex,point in zip(shell.data.vertices,verts):
        vertex.co=Vector(tuple((point[i]-center[i])*desired[i]/(high[i]-low[i]) for i in range(3)))
    shell.matrix_world.identity()
    original=next(n.image for m in shell.data.materials if m and m.use_nodes for n in m.node_tree.nodes if n.type=='TEX_IMAGE' and n.image)
    original.scale(128,128)
    source_pixels=list(original.pixels)
    atlas=bpy.data.images.new(f'recorder_T{tier}_atlas',width=256,height=128,alpha=True)
    pixels=[0.0]*(256*128*4)
    for y in range(128):
        pixels[(y*256)*4:(y*256+128)*4]=source_pixels[y*128*4:(y+1)*128*4]
        for x in range(128,256):
            index=((y//32)*4+(x-128)//32)%len(SWATCHES)
            pixels[(y*256+x)*4:(y*256+x+1)*4]=SWATCHES[index]
    atlas.pixels[:]=pixels;atlas.filepath_raw=str(EDITABLE/f'recorder-t{tier}-atlas.png')
    atlas.file_format='PNG';atlas.save();atlas.pack()
    mat=bpy.data.materials.new('PSX_recorder_single_atlas');mat.use_nodes=True
    nodes=mat.node_tree.nodes;shader=nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value=1
    tex=nodes.new('ShaderNodeTexImage');tex.image=atlas;tex.interpolation='Closest'
    mat.node_tree.links.new(tex.outputs['Color'],shader.inputs['Base Color'])
    shell.data.materials.clear();shell.data.materials.append(mat)
    for face in shell.data.polygons:face.material_index=0
    for loop in shell.data.uv_layers.active.data:loop.uv.x*=.5
    width,depth,height=desired
    component('LCD bezel',(0,-depth/2-.002,.025),(width*.83,.007,.070+.012*tier),mat,0)
    component('LCD actual display surface',(0,-depth/2-.006,.025),(width*.72,.002,.058+.012*tier),mat,5)
    for i,label in enumerate(('RECORD','STOP','PLAY')):
        component(label,((i-1)*width*.25,-depth/2-.007,-.055),(width*.15,.009,.016),mat,4 if i==0 else 2,cylinder=True)
    component('Battery compartment',(0,depth/2+.001,-.045),(width*.72,.004,.060),mat,1)
    component('Battery latch',(0,depth/2+.004,-.065),(.018,.005,.007),mat,2)
    # Mic ports/grilles are geometry. Higher tiers have separate stereo capsules.
    for i in range(1 if tier==1 else 2):
        x=0 if tier==1 else (-1 if i==0 else 1)*width*.30
        component('Microphone capsule',(x,0,height/2+.010),(.025,.030,.022+.004*tier),mat,2,cylinder=True)
        for slit in range(3):
            component('Mic grille',(x,-.016,height/2+.003+slit*.005),(.019,.002,.0018),mat,0)
    if tier==3:
        component('Gain wheel',(width/2+.006,0,.025),(.013,.031,.028),mat,1,cylinder=True)
        component('Monitor jack',(-width/2-.003,0,.065),(.007,.018,.012),mat,0)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in list(bpy.context.scene.objects):
        if obj.type=='MESH':obj.select_set(True)
    bpy.context.view_layer.objects.active=shell;bpy.ops.object.join()
    # Collapse material slots introduced by join and remove duplicate vertices.
    for polygon in shell.data.polygons:polygon.material_index=0
    while len(shell.data.materials)>1:shell.data.materials.pop(index=len(shell.data.materials)-1)
    mesh=bmesh.new();mesh.from_mesh(shell.data)
    bmesh.ops.remove_doubles(mesh,verts=list(mesh.verts),dist=0.000001)
    bmesh.ops.recalc_face_normals(mesh,faces=list(mesh.faces));mesh.to_mesh(shell.data);mesh.free()
    shell.name=f'Beckenburg_sound_recorder_T{tier}'
    shell['source']=SOURCE.name;shell['production_script']='development/assets/build_recorders.py'
    shell['tier']=tier;shell['live_display']='Host REC/STOP, elapsed time and actual peak level'
    blend=EDITABLE/f'sound-recorder-t{tier}.blend'
    bpy.context.preferences.filepaths.save_version=0
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))
    name=f'blender_sound_recorder_{tier}'
    output=RUNTIME/f'{name}.glb'
    bpy.ops.export_scene.gltf(filepath=str(output),export_format='GLB',use_selection=True,
        export_image_format='AUTO',export_normals=False,export_yup=True,export_extras=True)
    # Reopen the real exported file, rather than trusting the in-memory source scene.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(output))
    exported=[o for o in bpy.context.scene.objects if o.type=='MESH']
    triangles=sum(len(p.vertices)-2 for o in exported for p in o.data.polygons)
    if len(exported)!=1 or not 100<=triangles<=1200:raise RuntimeError((name,triangles,len(exported)))
    if any(len(o.data.materials)!=1 for o in exported):raise RuntimeError('material budget')
    dimensions=list(exported[0].dimensions)
    bpy.ops.object.camera_add(location=(.34,-.54,.28))
    camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,.02))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=.36
    scene=bpy.context.scene;scene.camera=camera
    scene.render.engine='CYCLES';scene.cycles.samples=12
    for location,power,size in [((.3,-.4,.6),35,.4),((-.3,-.1,.2),15,.3)]:
        bpy.ops.object.light_add(type='AREA',location=location)
        light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size
        light.rotation_euler=(-light.location).to_track_quat('-Z','Y').to_euler()
    scene.world=bpy.data.worlds.new('studio');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.045,.055,.065,1)
    scene.render.resolution_x=512;scene.render.resolution_y=512;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(PREVIEWS/f'sound-recorder-t{tier}.png')
    bpy.ops.render.render(write_still=True)
    return dict(tier=tier,model=output.relative_to(PROJECT).as_posix(),editable=blend.relative_to(PROJECT).as_posix(),
        sha256=hashlib.sha256(output.read_bytes()).hexdigest(),triangles=triangles,dimensions_blender_z_up=dimensions,
        material_count=1,texture_size=[256,128],source_glb=SOURCE.relative_to(PROJECT).as_posix(),
        source_sha256=hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        source_archive='Exploration objects.rar / Exploration objects/Voice_Recorder/Voice_Recorder.fbx',
        license_status='CC0; creator declaration verified 2026-10-18',
        license_source='https://elbolilloduro.itch.io/exploration-objects',
        reopened_in_blender=True,java_renderer_verified=False)

EDITABLE.mkdir(parents=True,exist_ok=True);PREVIEWS.mkdir(parents=True,exist_ok=True)
results=[build(tier) for tier in (1,2,3)]
(PRODUCTION/'recorder-models.json').write_text(json.dumps(dict(blender=bpy.app.version_string,models=results),indent=2)+'\n')
print('PASS: three source-derived recorder GLBs exported, reopened, measured and previewed')
