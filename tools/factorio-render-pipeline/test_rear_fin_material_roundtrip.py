"""Pure-Python CI test of R106/R107 material roundtrip safeguards.

Extracts the actual production function from each Blender driver by AST, so
no Blender binary is required for this narrowly scoped invariant check.
"""
import ast
import unittest
from pathlib import Path
from types import SimpleNamespace as NS

HERE = Path(__file__).resolve().parent
SOURCES = (
    'physical_chop_rear_fins_r106.py',
    'physical_cut_separate_source_fins_r107.py',
)


def extract_signature(path):
    tree = ast.parse(path.read_text(encoding='utf-8'), filename=str(path))
    matches = [node for node in tree.body if isinstance(node, ast.FunctionDef)
               and node.name == 'scene_used_material_signature']
    if len(matches) != 1:
        raise AssertionError('Expected exactly one production material-signature function')
    code = compile(ast.Module(body=matches, type_ignores=[]), str(path), 'exec')
    namespace = {}
    exec(code, namespace)
    return namespace['scene_used_material_signature']


def make_mat(name='steel', surface='Base Color'):
    node_from = NS(name='Heat Color', bl_idname='ShaderNodeAttribute')
    node_to = NS(name='Principled BSDF', bl_idname='ShaderNodeBsdfPrincipled')
    link = NS(from_node=node_from, from_socket=NS(name='Color'),
              to_node=node_to, to_socket=NS(name=surface))
    return NS(name=name, diffuse_color=[0.17, 0.26, 0.38, 1.0], use_nodes=True,
              node_tree=NS(nodes=[node_from, node_to], links=[link]))


def make_scene(mat):
    mesh_obj = NS(name='Original Formed Fin', type='MESH', data=NS(materials=[mat]))
    inert = NS(name='Camera', type='CAMERA', data=None)
    return NS(objects=[mesh_obj, inert])


class UsedMaterialRoundtripTests(unittest.TestCase):
    def test_both_blender_drivers_ignore_orphans_and_retain_used_checks(self):
        for filename in SOURCES:
            with self.subTest(driver=filename):
                signature = extract_signature(HERE / filename)
                mat = make_mat()
                scene = make_scene(mat)
                before = signature(scene)
                # Blender may discard unreferenced bpy.data.materials on reopen;
                # neither the active scene nor its slots should appear changed.
                unused_materials = [make_mat('Unused Paint'), make_mat('Unused Brass')]
                unused_materials.clear()
                self.assertEqual(before, signature(scene))
                # Data-block identity is not stable after saving and reopening.
                reopened = make_scene(make_mat())
                self.assertEqual(before, signature(reopened))
                # But actual mounted material/active shader mutations must fail.
                reopened.objects[0].data.materials[0].node_tree.links[0].to_socket.name = 'Roughness'
                self.assertNotEqual(before, signature(reopened))
                reopened = make_scene(make_mat('Different Steel'))
                self.assertNotEqual(before, signature(reopened))
                reopened = make_scene(make_mat())
                reopened.objects[0].data.materials[0].diffuse_color[0] += 0.02
                self.assertNotEqual(before, signature(reopened))
                reopened = make_scene(make_mat())
                reopened.objects[0].data.materials.append(make_mat('New Material Slot'))
                self.assertNotEqual(before, signature(reopened))


if __name__ == '__main__':
    unittest.main()
