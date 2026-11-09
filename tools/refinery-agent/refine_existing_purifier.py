"""Safely augment a saved editable Water Purifier without rewriting its seed.

Run via Blender --background --python refine_existing_purifier.py -- [args].
Untrusted inference may only submit geometry data from goal_water_purifier.safe_actions.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def emit_mesh(collection,name,vertices,faces,mat):
    mesh=bpy.data.meshes.new(name)
    mesh.from_pydata(vertices,[],faces);mesh.update()
    obj=bpy.data.objects.new(name,mesh);collection.objects.link(obj)
    if mat is not None:mesh.materials.append(mat)
    return obj


def tube(collection,name,start,end,radius,mat):
    a,b=Vector(start),Vector(end);vector=b-a;length=vector.length
    if length<=.10:raise ValueError('zero-length tube')
    axial=vector.normalized()
    u=axial.cross(Vector((0,0,1)))
    if u.length < .01:u=axial.cross(Vector((0,1,0)))
    u.normalize();v=axial.cross(u).normalized()
    verts=[];faces=[];N=24;inner=radius*.77
    for center,r in ((a,radius),(b,radius),(a,inner),(b,inner)):
        for i in range(N):
            phase=i*math.tau/N;pos=center+r*(u*math.cos(phase)+v*math.sin(phase));verts.append(tuple(pos))
    for i in range(N):
        j=(i+1)%N
        faces.extend(((i,j,N+j,N+i),(2*N+i,3*N+i,3*N+j,2*N+j),
                      (i,2*N+i,2*N+j,j),(N+i,N+j,3*N+j,3*N+i)))
    return emit_mesh(collection,name,verts,faces,mat)


def main():
    p=argparse.ArgumentParser()
    p.add_argument('--baseline',required=True)
    p.add_argument('--geometry',required=True)
    p.add_argument('--out',required=True)
    n=sys.argv.index('--')
    args=p.parse_args(sys.argv[n+1:]);out=Path(args.out).resolve();out.mkdir(parents=True,exist_ok=True)
    baseline=Path(args.baseline).resolve()
    data=json.loads(Path(args.geometry).read_text(encoding='utf-8'))
    if data.get('baseline_sha256')!=sha(baseline):raise RuntimeError('Baseline hash mismatch')
    additions=data.get('additions',[])
    if not isinstance(additions,list) or not 1<=len(additions)<=32:raise ValueError('Invalid additions count')
    bpy.ops.wm.open_mainfile(filepath=str(baseline))
    scene=bpy.context.scene
    orig=[o for o in scene.objects if o.type=='MESH' and o.name.startswith('MH7_')]
    if len(orig)<20:raise RuntimeError('Unknown or damaged baseline mesh')
    originals={o.name for o in orig};orig_materials={o.name for o in orig}
    orig_keys=(len(orig),sum(len(o.data.vertices) for o in orig))
    must_have=('MH7_central sealed purifier vessel','MH7_replaceable filter cartridge',
               'MH7_low supported pump motor','MH7_raw_water_input_mouth','MH7_purified_water_output_mouth')
    for name in must_have:
        if not any(o.name.startswith(name) for o in orig):raise RuntimeError('Missing essential baseline component '+name)
    collection=bpy.data.collections.get('MH7_QWEN_PILOT_ADDITIONS')
    if collection is not None:raise RuntimeError('Base scene already contains Qwen pilot edits')
    collection=bpy.data.collections.new('MH7_QWEN_PILOT_ADDITIONS');scene.collection.children.link(collection)
    materials={}
    for obj in orig:
        for mat in obj.data.materials:
            if mat and mat.name.startswith('MH7 '):materials[mat.name[4:]]=mat
    if not all(k in materials for k in ('iron','steel','red','brass')):raise RuntimeError('Missing known source materials')
    new_objs=[]
    for idx,action in enumerate(additions):
        kind=action['type'];purpose=action['purpose']
        name='MH7_QWEN_'+str(idx).zfill(2)+'_'+action['goal']+'_'+purpose[:32].replace(' ','_')
        material=materials.get(action['material'],materials['steel'])
        if kind in ('beam','tube'):
            if kind=='tube':obj=tube(collection,name,action['start'],action['end'],action['radius'],material)
            else:
                a,b=Vector(action['start']),Vector(action['end']);v=b-a
                bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=action['radius'],depth=v.length,location=(a+b)*.5)
                obj=bpy.context.object;obj.rotation_euler=v.to_track_quat('Z','Y').to_euler()
        elif kind=='box':
            bpy.ops.mesh.primitive_cube_add(size=1,location=action['position'])
            obj=bpy.context.object;obj.dimensions=action['size']
            bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        elif kind=='cylinder':
            bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=action['radius'],depth=action['depth'],location=action['position'])
            obj=bpy.context.object
            if action['axis']=='X':obj.rotation_euler[1]=math.pi/2
            elif action['axis']=='Y':obj.rotation_euler[0]=math.pi/2
        elif kind=='torus':
            bpy.ops.mesh.primitive_torus_add(major_segments=36,minor_segments=8,location=action['position'],
                  major_radius=action['major_radius'],minor_radius=action['minor_radius'])
            obj=bpy.context.object
            if action['axis']=='X':obj.rotation_euler[1]=math.pi/2
            elif action['axis']=='Y':obj.rotation_euler[0]=math.pi/2
        else:raise RuntimeError('Unsupported geometry operation')
        if kind!='tube':
            for c in tuple(obj.users_collection):c.objects.unlink(obj)
            collection.objects.link(obj)
            obj.name=name
            obj.data.materials.append(material)
        obj['goal_id']=action['goal'];obj['inference_geometry']=True
        new_objs.append(obj)
    bpy.context.view_layer.update()
    all_bounds=[]
    for obj in new_objs:
        world=[obj.matrix_world @ v.co for v in obj.data.vertices]
        if not world:raise RuntimeError('Empty inferred mesh')
        lo=[min(v[i] for v in world) for i in range(3)];hi=[max(v[i] for v in world) for i in range(3)]
        if (lo[0]<-1.51 or hi[0]>1.51 or lo[1]<-1.51 or hi[1]>1.51 or
            lo[2]<.08 or hi[2]>4.6):
            raise RuntimeError('Inferred object violates physical model-space envelope: '+obj.name)
        all_bounds.append({'name':obj.name,'min_xyz':lo,'max_xyz':hi,'vertices':len(obj.data.vertices)})
    # Ensure the original native parts, including 2 pipe mouths, survive untouched.
    assert all(o in bpy.data.objects for o in originals)
    base_meshes=[o for o in scene.objects if o.type=='MESH' and o.name.startswith('MH7_') and not o.name.startswith('MH7_QWEN_')]
    if (len(base_meshes),sum(len(o.data.vertices) for o in base_meshes))!=orig_keys:
        raise RuntimeError('Original model mesh unexpectedly modified')
    scene.render.engine='CYCLES';scene.cycles.samples=8;scene.cycles.device='CPU'
    scene.render.resolution_x=560;scene.render.resolution_y=560;scene.render.resolution_percentage=100
    scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG'
    scene.render.image_settings.color_mode='RGBA'
    bpy.ops.file.pack_all();blend=out/'water-purifier-pilot.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
    scene.render.filepath=str(out/'inspection_3quarter.png');bpy.ops.render.render(write_still=True)
    bpy.ops.object.select_all(action='DESELECT')
    included=[o for o in scene.objects if o.type=='MESH' and o.name.startswith('MH7_')]
    for obj in included:obj.select_set(True)
    bpy.context.view_layer.objects.active=included[0]
    glb=out/'water-purifier-pilot.glb'
    bpy.ops.export_scene.gltf(filepath=str(glb),export_format='GLB',use_selection=True)
    audit={'pass':True,'baseline_sha256':sha(baseline),'geometry_input_sha256':sha(args.geometry),
           'blend_sha256':sha(blend),'glb_sha256':sha(glb),
           'preview_sha256':sha(out/'inspection_3quarter.png'),
           'original_mesh_count':orig_keys[0],'inferred_part_count':len(new_objs),
           'source_geometry_preserved':True,'inferred_bounds':all_bounds,
           'game_native_connectivity_verified':False,'human_visual_approval':False}
    (out/'geometry_audit.json').write_text(json.dumps(audit,indent=2,default=float)+'\n',encoding='utf-8')
    print('MH7_GOAL_GEOMETRY_SAVED '+json.dumps({'parts':len(new_objs),'baseline_sha256':sha(baseline)},sort_keys=True),flush=True)

if __name__=='__main__':main()
