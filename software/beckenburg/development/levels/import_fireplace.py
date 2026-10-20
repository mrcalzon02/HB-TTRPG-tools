"""Import selected Victorian Study fireplace; native UVs and diffuse color retained.
The editable source is original FBX geometry uniformly fitted to a 1.55m mantel.
"""
import bpy,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'build/level-verification/victorian'
bpy.ops.wm.read_factory_settings(use_empty=True)
for stem in ['fireplace_Base','fireplace_Wall']:
    bpy.ops.import_scene.fbx(filepath=str(SRC/(stem+'.fbx')))
    image=bpy.data.images.load(str(next(SRC.glob(stem+'*Albedo.png'))))
    original=list(image.size)
    if max(image.size)>1024:
        factor=1024/max(image.size);image.scale(round(image.size[0]*factor),round(image.size[1]*factor))
    image.pack()
    for obj in bpy.context.selected_objects:
        if obj.type!='MESH':continue
        for mat in obj.data.materials:
            if not mat:continue
            mat.use_nodes=True;p=mat.node_tree.nodes.get('Principled BSDF');p.inputs['Roughness'].default_value=.9
            node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;node.interpolation='Closest'
            mat.node_tree.links.new(node.outputs['Color'],p.inputs['Base Color'])
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
for o in meshes:
    transform=o.matrix_world.copy()
    for v in o.data.vertices:v.co=transform@v.co
    o.parent=None;o.matrix_world.identity()
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();obj=bpy.context.object
lo=Vector(tuple(min(v.co[i] for v in obj.data.vertices) for i in range(3)));hi=Vector(tuple(max(v.co[i] for v in obj.data.vertices) for i in range(3)))
print('FIREPLACE_NATIVE_BOUNDS',list(lo),list(hi))
scale=1.55/(hi.x-lo.x);center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
for v in obj.data.vertices:v.co=(v.co-center)*scale
obj.name='level_fireplace';obj['source']='Victorian Study original fireplace Base+Wall FBXs; original albedo UV; diffuse resized to1024 for runtime4MB budget'
out=ROOT/'assets/runtime/models/level_fireplace.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_yup=True)
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'development/levels/blender/level_fireplace.blend'),compress=True)
obj.data.calc_loop_triangles();bpy.context.view_layer.update()
(ROOT/'development/levels/fireplace-source.json').write_text(json.dumps(dict(source_archive='E:/ARCHIVE/PSX assets/Victorian Study.zip',models=['fireplace_Base.fbx','fireplace_Wall.fbx'],uniform_scale=scale,dimensions=list(obj.dimensions),triangles=len(obj.data.loop_triangles),bytes=out.stat().st_size,texture_policy='original diffuse preserved; maximum1024px to fit documented runtime budget'),indent=2))
print('FIREPLACE_IMPORTED',list(obj.dimensions),out.stat().st_size)
