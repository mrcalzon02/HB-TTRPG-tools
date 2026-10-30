"""Reference-catalogue tests: all geometry fixtures are authored here, not Wube assets."""
import tempfile
import unittest
from pathlib import Path
from official_reference_library import CATALOG, inventory

TRIANGLE = """solid fixture
facet normal 0 0 1
outer loop
vertex 0 0 0
vertex 1 0 0
vertex 0 1 0
endloop
endfacet
endsolid fixture
"""


class ReferenceLibraryTests(unittest.TestCase):
    def test_all_fifteen_sets_are_not_confused_with_fifteen_stl_parts(self):
        self.assertEqual(len(CATALOG), 15)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            for group in CATALOG:
                path = root / group / "self_authored_fixture.stl"
                path.parent.mkdir()
                path.write_text(TRIANGLE, encoding="utf-8")
            # A second file in the same set is a distinct print variant, not
            # a new official model set or a manufactured assembled machine.
            (root / CATALOG[0] / "self_authored_second_variant.stl").write_text(
                TRIANGLE, encoding="utf-8")
            report = inventory(root, require_all=True)
            self.assertEqual(report["stl_count"], 16)
            self.assertEqual(len(report["present_sets"]), 15)
            self.assertEqual(report["missing_sets"], [])
            self.assertTrue(all(e["triangle_count"] == 1 for e in report["entries"]))
            self.assertTrue(all(e["sha256"] for e in report["entries"]))
            self.assertEqual(report["status"], "UNASSEMBLED_PRIVATE_REFERENCE_ONLY")

    def test_fail_closed_on_incomplete_catalogue(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "transport-belts").mkdir()
            (root / "transport-belts" / "tile.stl").write_text(TRIANGLE)
            report = inventory(root)
            self.assertEqual(report["present_sets"], ["transport-belts"])
            self.assertEqual(len(report["missing_sets"]), 14)
            with self.assertRaisesRegex(ValueError, "Incomplete 15-set"):
                inventory(root, require_all=True)

    def test_reject_untagged_and_unknown_parts(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "unassigned.stl").write_text(TRIANGLE)
            with self.assertRaisesRegex(ValueError, "official set folder"):
                inventory(root)
            (root / "unassigned.stl").unlink()
            (root / "not-a-wube-set").mkdir()
            (root / "not-a-wube-set" / "unknown.stl").write_text(TRIANGLE)
            with self.assertRaisesRegex(ValueError, "Unknown Wube"):
                inventory(root)

    def test_do_not_accept_empty_or_corrupt_geometry(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "inserters").mkdir()
            (root / "inserters" / "bad.stl").write_bytes(b"oops")
            with self.assertRaises(ValueError):
                inventory(root)


if __name__ == "__main__":
    unittest.main()
