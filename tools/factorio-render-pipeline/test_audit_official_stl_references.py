"""Test binary/ASCII official-reference STL auditing without Wube geometry."""
import struct
import tempfile
import unittest
from pathlib import Path
from audit_official_stl_references import inspect_stl, run

class STLAudit(unittest.TestCase):
    def test_exact_binary_triangle_bounds(self):
        with tempfile.TemporaryDirectory() as tmp:
            stl = Path(tmp)/"self_authored_fixture.stl"
            vertices=(0.,0.,0., 3.,0.,0., 0.,4.,5.)
            stl.write_bytes(b"\0"*80+struct.pack("<I",1)+
                            struct.pack("<12fH",0.,0.,1.,*vertices,0))
            result=inspect_stl(stl)
            self.assertEqual(result["triangle_count"],1)
            self.assertEqual(result["format"],"binary")
            self.assertEqual(result["dimensions_native_stl_units"],[3.,4.,5.])
            out=Path(tmp)/"audit.json"
            data=run(tmp,out)
            self.assertEqual(data["item_count"],1)
            self.assertNotIn("mesh_vertices",out.read_text())
    def test_ascii_not_confused_with_binary_header(self):
        with tempfile.TemporaryDirectory() as tmp:
            stl=Path(tmp)/"ascii.stl"
            stl.write_text("""solid audit
facet normal 0 0 1
outer loop
vertex 0 0 0
vertex 1 0 0
vertex 0 2 0
endloop
endfacet
endsolid audit
""")
            result=inspect_stl(stl)
            self.assertEqual(result["triangle_count"],1)
            self.assertEqual(result["dimensions_native_stl_units"],[1.,2.,0.])
            self.assertEqual(result["format"],"ascii")
    def test_reject_bad(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/"bad.stl"
            p.write_bytes(b"hi")
            with self.assertRaises(ValueError):
                inspect_stl(p)
if __name__=="__main__":unittest.main()
