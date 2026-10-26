"""Blender 4.5 LTS CPU-only headless installation smoke render.

This deliberately renders a synthetic calibration cube, not a Tech Priests
thruster. The parent bootstrap checks the output PNG and hashes it.
"""
import argparse
from pathlib import Path
import bpy
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument("--output", required=True)
args = parser.parse_args(__import__("sys").argv[__import__("sys").argv.index("--") + 1:])

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

bpy.ops.mesh.primitive_cube_add(size=1.3, location=(0, 0, 0.65))
cube = bpy.context.object
cube.name = "Factorio calibration smoke cube"
mat = bpy.data.materials.new("Calibrated copper finish")
mat.diffuse_color = (0.78, 0.38, 0.09, 1.0)
mat.use_nodes = True
nodes = mat.node_tree.nodes
bsdf = nodes.get("Principled BSDF")
if bsdf is not None:
    bsdf.inputs["Base Color"].default_value = (0.78, 0.38, 0.09, 1.0)
    bsdf.inputs["Metallic"].default_value = 0.45
    bsdf.inputs["Roughness"].default_value = 0.34
cube.data.materials.append(mat)

bpy.ops.object.camera_add(location=(3.7, -5.1, 5.0))
camera = bpy.context.object
camera.name = "Fixed ortho calibration camera"
camera.rotation_euler = (Vector((0, 0, 0.5)) - camera.location).to_track_quat("-Z", "Y").to_euler()
camera.data.type = "ORTHO"
camera.data.ortho_scale = 3.3

bpy.ops.object.light_add(type="AREA", location=(-3, -4, 6))
light = bpy.context.object
light.data.energy = 750
light.data.shape = "DISK"
light.data.size = 5.0

scene = bpy.context.scene
scene.camera = camera
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = 8
scene.render.resolution_x = 96
scene.render.resolution_y = 96
scene.render.resolution_percentage = 100
scene.render.film_transparent = True
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.render.filepath = str(Path(args.output).resolve())
bpy.ops.render.render(write_still=True)
