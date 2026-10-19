"""Shared source-preserving equipment production helpers, Blender 5.

Source meshes retain their UVs/materials and are scaled uniformly. New surfaces
use small material-specific diffuse maps, never the old single-pixel swatches.
This module exports assets and renders them; it does not build/run the game.
"""
import bpy, math, json, hashlib, random
from pathlib import Path
from mathutils import Vector

PROJECT=Path(__file__).resolve().parents[2]
DEV=PROJECT/'development/assets/equipment-catalog'
RUNTIME=PROJECT/'assets/runtime/models'
ARCHIVE=Path('E:/ARCHIVE/PSX assets/PSX Mega Pack v3.2.1/PSX Mega Pack/Models/GLB (recommended)')
SOURCE_LOG={}

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.preferences.filepaths.save_version=0

def source_path(name):
    p=RUNTIME/(name if name.endswith('.glb') else name+'.glb')
    if p.exists(): return p
    results=list(ARCHIVE.rglob(name if name.endswith('.glb') else name+'.glb'))
    if not results: raise FileNotFoundError(name)
    return results[0]

def join(objects,name='Equipment'):
    bpy.ops.object.select_all(action='DESELECT')
    meshes=[o for o in objects if o and o.type=='MESH']
    for o in meshes:
        group=o.vertex_groups.get(o.name) or o.vertex_groups.new(name=o.name)
        group.add(list(range(len(o.data.vertices))),1,'REPLACE')
        o.select_set(True)
    bpy.context.view_layer.objects.active=meshes[0]
    if len(meshes)>1:bpy.ops.object.join()
    obj=bpy.context.object;obj.name=name
    return obj

def import_source(name,size=None,rotation=None,location=(0,0,0),scale=None):
    """Return one joined mesh, baked world transform, center XY/floor Z.
    size is target LONGEST dimension, in metres (uniform scaling only).
    rotation is XYZ Euler in radians, applied before bounds normalization.
    """
    path=source_path(name);before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(path))
    imported=[o for o in bpy.context.scene.objects if o not in before]
    meshes=[o for o in imported if o.type=='MESH']
    for o in meshes:
        world=o.matrix_world.copy()
        for v in o.data.vertices:v.co=world@v.co
        o.parent=None;o.matrix_world.identity()
    for o in imported:
        if o.type!='MESH':bpy.data.objects.remove(o,do_unlink=True)
    obj=join(meshes,name)
    if rotation:
        obj.rotation_mode='XYZ'
        obj.rotation_euler=rotation
        bpy.context.view_layer.update()
        bpy.ops.object.transform_apply(location=False,rotation=True,scale=False)
    low=Vector(tuple(min(v.co[i] for v in obj.data.vertices) for i in range(3)))
    high=Vector(tuple(max(v.co[i] for v in obj.data.vertices) for i in range(3)))
    factor=scale if scale is not None else size/max(high-low) if size else 1
    origin=Vector(((low.x+high.x)/2,(low.y+high.y)/2,low.z))
    for v in obj.data.vertices:v.co=(v.co-origin)*factor
    obj.location=location
    obj.data.update();bpy.context.view_layer.update()
    sha=hashlib.sha256(path.read_bytes()).hexdigest()
    SOURCE_LOG[str(path)]=dict(name=path.name,sha256=sha,source=str(path),policy='Owner-provided original game asset; preserve source materials and UVs')
    obj['source_file']=str(path);obj['source_sha256']=sha
    return obj

def material(name,color=(.3,.3,.3),kind='paint',roughness=.88):
    """64px pixel-painted surface with deterministic grain, seams and wear."""
    mat=bpy.data.materials.get('Rebuild '+name)
    if mat:return mat
    mat=bpy.data.materials.new('Rebuild '+name);mat.use_nodes=True
    shader=mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Roughness'].default_value=roughness
    image=bpy.data.images.new(name+' diffuse',width=64,height=64)
    rng=random.Random(name);pixels=[]
    for y in range(64):
        for x in range(64):
            n=rng.choice([-.07,-.035,0,.025,.04])*({'paper':.15,'metal':.25,'ceramic':.18,'paint':.4}.get(kind,.6));line=0
            if kind=='wood':
                line=.07*math.sin(x*.65+math.sin(y*.09)*1.3)+.025*math.sin(x*1.7+y*.03)
            elif kind=='cloth':line=(.035 if (x+y)%3==0 else -.02)+(-.065 if x in (3,60) or y in (3,60) else 0)
            elif kind=='paper':line=.004*math.sin(y*.7)+(-.025 if x<2 or y<2 else 0)
            elif kind=='metal':line=.025*math.sin(y*.5)+(.10 if x in (1,62) else 0)
            elif kind=='rubber':line=-.07 if x%9 in (0,1) else .01
            elif kind=='leather':line=-.08 if (x*7+y*11)%37<2 else .018
            elif kind=='ceramic':line=.015*math.sin(y*.13)+(.06 if x<3 else 0)
            else:line=.035 if (x*19+y*7)%109<2 else 0
            pixels.extend([max(0,min(1,c+n+line)) for c in color]+[1])
    image.pixels.foreach_set(pixels);image.pack()
    node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;node.interpolation='Closest'
    mat.node_tree.links.new(node.outputs['Color'],shader.inputs['Base Color'])
    return mat

def uv_project(obj):
    mesh=obj.data;layer=mesh.uv_layers.active or mesh.uv_layers.new(name='UVMap')
    lo=[min(v.co[i] for v in mesh.vertices) for i in range(3)]
    hi=[max(v.co[i] for v in mesh.vertices) for i in range(3)]
    for f in mesh.polygons:
        axis=max(range(3),key=lambda i:abs(f.normal[i]));axes=[i for i in range(3) if i!=axis]
        for loop in f.loop_indices:
            p=mesh.vertices[mesh.loops[loop].vertex_index].co
            layer.data[loop].uv=[.025+.95*(p[i]-lo[i])/max(.00001,hi[i]-lo[i]) for i in axes]

def mesh(name,vertices,faces,mat):
    data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update()
    obj=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(obj)
    if mat:data.materials.append(mat)
    uv_project(obj);return obj

def box(name,location,size,mat,bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=location)
    obj=bpy.context.object;obj.name=name;obj.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=obj.modifiers.new('Shaped edges','BEVEL');mod.width=bevel;mod.segments=1
        bpy.ops.object.modifier_apply(modifier=mod.name)
    obj.data.materials.append(mat);uv_project(obj);return obj

def rod(name,a,b,radius,mat,sides=10,end_radius=None):
    a,b=Vector(a),Vector(b);axis=(b-a).normalized()
    ref=Vector((0,0,1)) if abs(axis.z)<.95 else Vector((1,0,0))
    u=axis.cross(ref).normalized();v=axis.cross(u).normalized();vertices=[]
    for center,r in [(a,radius),(b,radius if end_radius is None else end_radius)]:
        for i in range(sides):
            t=i*2*math.pi/sides;vertices.append(tuple(center+r*(math.cos(t)*u+math.sin(t)*v)))
    faces=[tuple(range(sides-1,-1,-1)),tuple(range(sides,2*sides))]
    faces.extend((i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides))
    return mesh(name,vertices,faces,mat)

def lathe(name,profile,mat,segments=12,location=(0,0,0)):
    verts=[(location[0]+r*math.cos(i*2*math.pi/segments),location[1]+r*math.sin(i*2*math.pi/segments),location[2]+z) for z,r in profile for i in range(segments)]
    faces=[]
    for j in range(len(profile)-1):
        for i in range(segments):faces.append((j*segments+i,j*segments+(i+1)%segments,(j+1)*segments+(i+1)%segments,(j+1)*segments+i))
    faces.extend([tuple(range(segments-1,-1,-1)),tuple((len(profile)-1)*segments+i for i in range(segments))])
    return mesh(name,verts,faces,mat)

def tube(name,points,radius,mat,sides=6):
    return [rod(name+' '+str(i),a,b,radius,mat,sides) for i,(a,b) in enumerate(zip(points,points[1:]))]

def finish(item,tier,objects,state='default',features=None,sockets=None,filename=None):
    obj=join(objects,item.lower());bpy.context.view_layer.update()
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    low=min(v.co.z for v in obj.data.vertices)
    for v in obj.data.vertices:v.co.z-=low
    name=filename or f'blender_{item.lower()}_{tier}'+('' if state=='default' else '_'+state)
    obj.name=name;obj['equipment_id']=item;obj['tier']=tier;obj['state']=state
    path=RUNTIME/(name+'.glb');obj.data.calc_loop_triangles();bpy.context.view_layer.update()
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_extras=True,export_normals=False)
    mats=[m for m in obj.data.materials if m]
    images={node.image.name:node.image for m in mats if m.use_nodes for node in m.node_tree.nodes if node.type=='TEX_IMAGE' and node.image}
    record=dict(tier=tier,state=state,model=path.relative_to(PROJECT).as_posix(),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),triangles=len(obj.data.loop_triangles),dimensions_blender_z_up=list(obj.dimensions),materials=len(mats),texture_images=[dict(name=i.name,size=list(i.size)) for i in images.values()],component_vertex_groups=[g.name for g in obj.vertex_groups],existing_unchanged=False,variants={},features=features or [],sockets_gltf_y_up=sockets or {},editable=f'development/assets/equipment-catalog/blender/{item.lower()}.blend',license='Owner-provided original game-use subset and original authored geometry; individual sources recorded in rebuild provenance',online_integration_status='Asset delivery; gameplay/packaging left for online integration')
    return record,obj

def render_family(item,objects,path=None,view=(.30,-2.5,1.45),labels=None):
    """Render actual mesh lineup with neutral readable lighting, no palette loss."""
    scene=bpy.context.scene
    originals={o:o.location.copy() for o in objects}
    width=max(o.dimensions.x for o in objects);spacing=width*1.28+.025
    for i,o in enumerate(objects):o.location.x=(i-(len(objects)-1)/2)*spacing
    bpy.context.view_layer.update()
    for o in scene.objects:o.hide_render=o not in objects
    points=[o.matrix_world@Vector(v) for o in objects for v in o.bound_box]
    lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)));center=(lo+hi)*.5
    bpy.ops.object.camera_add(location=center+Vector(view));cam=bpy.context.object;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO'
    rotation=cam.rotation_euler.to_matrix().transposed()
    projected=[rotation@(p-center) for p in points]
    width=max(p.x for p in projected)-min(p.x for p in projected)
    height=max(p.y for p in projected)-min(p.y for p in projected)
    cam.data.ortho_scale=max(width,height*(1536/640),.12)*1.14;scene.camera=cam
    scene.world=bpy.data.worlds.new('Neutral asset studio');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.11,.13,.15,1)
    for pos,power,size in [(center+Vector((-1,-2,3)),220,3),(center+Vector((2,1,2)),140,2)]:
        bpy.ops.object.light_add(type='AREA',location=pos);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(center-pos).to_track_quat('-Z','Y').to_euler()
    scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.use_denoising=True
    scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast' if 'Medium High Contrast' in [] else 'None'
    scene.render.resolution_x=1536;scene.render.resolution_y=640;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(path or DEV/'previews'/f'{item.lower()}.png')
    Path(scene.render.filepath).parent.mkdir(parents=True,exist_ok=True);bpy.ops.render.render(write_still=True)
    for o in list(scene.objects):
        if o.type in ('CAMERA','LIGHT'):bpy.data.objects.remove(o,do_unlink=True)
        else:o.hide_render=False
    for o,loc in originals.items():o.location=loc

def save_family(item,objects):
    for i,obj in enumerate(objects):obj.location=(i*.8,0,0)
    path=DEV/'blender'/f'{item.lower()}.blend';path.parent.mkdir(parents=True,exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(path),compress=True)

def write_fragment(name,items):
    (DEV/name).write_text(json.dumps(dict(items=items,sources=list(SOURCE_LOG.values())),indent=2)+'\n',encoding='utf-8')
