"""Create an editable Blender level from exact exported runtime triangles.
1. Run LevelSceneSource against compiled/package resources.
2. blender --background --factory-startup --python development/levels/build_scene.py -- house
No manually maintained second floorplan or facade is used.
"""
import bpy,json,sys,math,collections
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
name=sys.argv[sys.argv.index('--')+1] if '--' in sys.argv else 'house'
SRC=ROOT/'build/level-verification/scenes'/name
definition=json.loads((SRC/'definition.json').read_text());faces=json.loads((SRC/'geometry.json').read_text())
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0

def point(p):return (p['x'],-p['z'],p['y'])
def collection(name):
    c=bpy.data.collections.new(name);bpy.context.scene.collection.children.link(c);return c

rooms={r['id']:collection(f'{r["id"]:02d} {r["name"]} Y{r["y"]:+g}m') for r in definition['rooms']}
groups=collections.defaultdict(list)
for f in faces:groups[(f['room'],f['material'],f['color'])].append(f)
materials={}
for (room,mid,color),group in groups.items():
    key=(mid,color)
    if key not in materials:
        mat=bpy.data.materials.new(f'Original diffuse {mid} tint {color:06x}');mat.use_nodes=True
        shader=mat.node_tree.nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=.9
        tint=tuple(((color>>shift)&255)/255 for shift in [16,8,0])+(1,)
        if mid>=0:
            im=bpy.data.images.load(str(SRC/f'textures/{mid}.png'),check_existing=True);im.pack()
            tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=im;tex.interpolation='Closest'
            mul=mat.node_tree.nodes.new('ShaderNodeMixRGB');mul.blend_type='MULTIPLY';mul.inputs[0].default_value=1;mul.inputs[2].default_value=tint
            mat.node_tree.links.new(tex.outputs['Color'],mul.inputs[1]);mat.node_tree.links.new(mul.outputs[0],shader.inputs['Base Color'])
        else:shader.inputs['Base Color'].default_value=tint
        materials[key]=mat
    verts=[];uv=[];triangles=[]
    for f in group:
        base=len(verts);verts.extend(point(f[k]) for k in ['a','b','c']);uv.extend([(f['au'],f['av']),(f['bu'],f['bv']),(f['cu'],f['cv'])]);triangles.append((base,base+1,base+2))
    mesh=bpy.data.meshes.new(f'{name} room{room} originalUV');mesh.from_pydata(verts,[],triangles);mesh.update()
    layer=mesh.uv_layers.new(name='Original runtime UV')
    for poly in mesh.polygons:
        for i in poly.loop_indices:layer.data[i].uv=uv[mesh.loops[i].vertex_index]
    obj=bpy.data.objects.new(f'Runtime room {room} material {mid}',mesh);rooms.get(room,rooms[13]).objects.link(obj);mesh.materials.append(materials[key])
    obj['source']='Exact runtime SceneRenderer triangles, original UV and material';obj['zone']=room

loose_path=SRC/'loose-objects.json'
if loose_path.exists():
    loose_collection=collection('INTERACTIVE loose objects — independent meshes and measured bodies')
    templates={}
    for entry in json.loads(loose_path.read_text()):
        state=entry['state'];asset='level_loose_'+state['kind'].lower()+'_worn'
        if asset not in templates:
            with bpy.data.libraries.load(str(ROOT/f'development/levels/blender/{asset}.blend'),link=False) as (incoming,outgoing):outgoing.objects=[asset]
            template=outgoing.objects[0]
            for vertex in template.data.vertices:vertex.co.z-=entry['half']
            templates[asset]=template
        obj=templates[asset].copy();loose_collection.objects.link(obj)
        obj.name=f'Loose {state["id"]:03d} {state["kind"]}'
        obj.location=(state['x'],-state['z'],state['y']);obj.rotation_euler=(0,-state['roll'],-state['yaw'])
        obj['loose_object_id']=state['id'];obj['mass_kg']=entry['mass'];obj['collision_radius_m']=entry['radius'];obj['collision_half_height_m']=entry['half']
        obj['interaction']='F5 pick up/drop; ] examine rotation; F12 throw; host authoritative'
metadata=collection('AUTHORING sockets, portals, stair support and collision')
def empty(label,p,data,display='PLAIN_AXES',size=.18):
    obj=bpy.data.objects.new(label,None);metadata.objects.link(obj);obj.location=p;obj.empty_display_type=display;obj.empty_display_size=size
    for k,v in data.items():obj[k]=json.dumps(v) if isinstance(v,(dict,list)) else v
    return obj
for s in definition['sockets']:empty(s['id'],point(s),s)
for p in definition['portals']:empty(f'Portal {p["id"]} {p["kind"]}',point(p),p,'CUBE',p['width']/2)
for r in definition['rooms']:empty(f'Spawn {r["id"]} {r["name"]}',point(r['spawn']),{'room':r['id']},'ARROWS',.4)
empty('Shared van dock',point(definition['dock']),definition['dock'],'ARROWS',2)
for i,c in enumerate(definition['colliders']):
    obj=empty(f'Collision {i}',point(c),c,'CUBE',1);obj.scale=(c['halfX'],c['halfZ'],c['height']/2);obj.location.z+=c['height']/2;obj.rotation_euler.z=-c['yaw']

scene=bpy.context.scene;scene.world=bpy.data.worlds.new('Night environment');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.07,.105,.18,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.23
for s in definition['sockets']:
    if s['type']!='light':continue
    bpy.ops.object.light_add(type='POINT',location=(s['x'],-s['z'],s['y']-.22))
    lamp=bpy.context.object;lamp.name=s['id']+' circuit '+str(s['room']);lamp.data.energy=65 if s['style']=='utility' else 95
    lamp.data.color=(.95,.81,.54) if s['style']!='utility' else (.72,.80,.87);lamp.data.shadow_soft_size=.23
bpy.ops.object.light_add(type='SUN',location=(15,-15,20));bpy.context.object.rotation_euler=(.38,-.55,-.9);bpy.context.object.data.energy=.7;bpy.context.object.data.color=(.40,.55,.85)
camera_poses={'house':((28,-34,3.8),(19,-19,3.0)),
              'farmhouse':((55,-48,15),(27,-20,2.8)),
              'school':((58,-57,17),(28,-24,3.5))}
position,look_at=camera_poses[name]
bpy.ops.object.camera_add(location=position);cam=bpy.context.object
target=Vector(look_at);cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.lens=30;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=1280;scene.render.resolution_y=800;scene.render.resolution_percentage=100
scene.view_settings.view_transform='Standard';scene.view_settings.look='None';scene.view_settings.exposure=.6
scene['level_id']=definition['id'];scene['revision']=definition['revision'];scene['source_of_truth']='LevelPlans.java / LevelDefinition.java; regenerate after layout edits'
scene['hiding_density']=100;scene['hiding_note']='All potential cupboards shown for authoring; runtime geometry/collision follow the contract density'
out=ROOT/'development/levels/blender';out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=str(out/(name+'-complete.blend')),compress=True)
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(ROOT/f'development/levels/previews/{name}-blender-exterior.png');bpy.ops.render.render(write_still=True)
print('EDITABLE_LEVEL_COMPLETE',name,len(faces),'runtime triangles')
