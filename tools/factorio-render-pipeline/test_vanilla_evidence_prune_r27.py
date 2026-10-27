"""R27 source-policy contracts, no Blender or original copyrighted sprites."""
import ast
from pathlib import Path
import unittest

SOURCE=Path(__file__).with_name("vanilla_evidence_prune_r27.py")
class OriginalOnlyGeometryTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.src=SOURCE.read_text(encoding="utf-8")
        cls.tree=ast.parse(cls.src)
        cls.defs={n.name for n in cls.tree.body if isinstance(n,ast.FunctionDef)}
    def test_source_visible_vs_hypothesized_are_separated(self):
        self.assertIn("UPPER_MECHANISM_PRESERVE",self.src)
        self.assertIn("VISIBLE_CLASS_ROIS",self.src)
        self.assertIn("UNSUPPORTED_PREFIXES",self.src)
        self.assertIn("R11_AFTERBURNER_FUEL_CAPILLARY_",self.src)
        self.assertIn("R16_FIN_DOUBLE_BRACE_",self.src)
        self.assertIn("R19_FIN_ROOT_BACK_RIB_",self.src)
        self.assertIn("R25_OUTER_SKID_UNDERBODY_CHANNEL_",self.src)
    def test_real_panels_retained_and_hypothetical_rods_deleted(self):
        self.assertIn("bpy.data.objects.remove(ob,do_unlink=True)",self.src)
        self.assertIn("R11_SUSPENDED_AFTERBURNER_VANE_",self.src)
        self.assertIn("R25_OUTER_SKID_UNDERSIDE_",self.src)
        self.assertIn("signatures[ob.name]",self.src)
        self.assertIn("fsc_r27_removed_unverified_geometry",self.src)
        self.assertNotIn("hide_render=True",self.src)
        self.assertNotIn("hide_viewport=True",self.src)
        self.assertNotIn("shape_key_add",self.src)
    def test_no_unproven_articulations_or_new_procedural_nubbins(self):
        self.assertIn("R27_root_mechanism_evidence",self.src)
        self.assertIn("unresolved_not_constructed",self.src)
        self.assertNotIn("primitive_cube_add",self.src)
        self.assertNotIn("primitive_cylinder_add",self.src)
        self.assertNotIn("keyframe_insert",self.src)
    def test_source_reference_is_exact_user_archive(self):
        self.assertIn("0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791",self.src)
        self.assertIn("source_only_simplification_not_finished_3D_reconstruction",self.src)
        self.assertIn("apply",self.defs)
if __name__=="__main__":unittest.main()
