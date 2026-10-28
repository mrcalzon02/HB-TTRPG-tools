import copy
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("production", ROOT / "scripts/production.py")
p = importlib.util.module_from_spec(spec)
spec.loader.exec_module(p)


class EvidenceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name) / "packet"
        p.initialize(self.root, "test-map")
        self.path = self.root / "packet.json"
        self.packet = p.read_json(self.path)
        self.packet["input_revision"] = "a" * 40

    def write(self):
        self.path.write_text(json.dumps(self.packet), encoding="utf-8")

    def result(self, complete=False):
        self.write()
        return p.validate(self.path, complete)

    def complete(self):
        kinds = p.read_json(ROOT / "manifest.json")["evidence_kinds"]
        for kind in kinds:
            file = self.root / (kind + ".txt")
            file.write_text("SYNTHETIC TEST FIXTURE, NOT PRODUCTION EVIDENCE", encoding="utf-8")
            self.packet["artifacts"].append({"id": kind, "path": file.name,
                "sha256": p.digest(file), "kind": kind, "input_revision": "a" * 40})
        for gate in self.packet["gates"]:
            gate.update(status="passed", evidence=kinds[:], review={
                "reviewer": "Synthetic unit-test fixture", "reviewer_type": "human",
                "date": "2026-10-28", "scope": "Validator test data only",
                "outcome": "pass", "input_revision": "a" * 40})

    def test_open_packet_is_honest_in_progress(self):
        self.assertTrue(self.result()["record_valid"])
        self.assertFalse(self.result(True)["record_valid"])

    def test_initialized_revision_must_be_replaced(self):
        self.assertFalse(p.validate(self.path)["record_valid"])

    def test_complete_fixture_validates(self):
        self.complete()
        self.assertTrue(self.result(True)["record_valid"])

    def test_file_tampering_is_rejected(self):
        self.complete()
        (self.root / "native-geometry.txt").write_text("changed", encoding="utf-8")
        self.assertIn("SHA-256 mismatch", " ".join(self.result()["errors"]))

    def test_stale_pass_is_rejected(self):
        self.complete()
        self.packet["input_revision"] = "b" * 40
        self.assertFalse(self.result()["record_valid"])

    def test_missing_kind_is_rejected(self):
        self.complete()
        self.packet["gates"][0]["evidence"] = []
        self.assertFalse(self.result()["record_valid"])

    def test_downstream_gate_cannot_skip_terrain(self):
        self.complete()
        next(g for g in self.packet["gates"] if g["id"] == "terrain-desquareify")["status"] = "open"
        self.assertIn("prerequisite is not passed", " ".join(self.result()["errors"]))

    def test_agent_cannot_fill_human_gate(self):
        self.complete()
        next(g for g in self.packet["gates"] if g["id"] == "human-acceptance")["review"]["reviewer_type"] = "agent"
        self.assertFalse(self.result()["record_valid"])

    def test_missing_and_duplicate_gates_fail(self):
        original = copy.deepcopy(self.packet["gates"])
        self.packet["gates"].pop()
        self.assertFalse(self.result()["record_valid"])
        self.packet["gates"] = original + [original[0]]
        self.assertFalse(self.result()["record_valid"])

    def test_traversal_absolute_and_windows_paths_fail(self):
        self.complete()
        for path in ("../escape", "/tmp/escape", "C:/escape", "dir\\escape", "https://example.org/a"):
            with self.subTest(path=path):
                self.packet["artifacts"][0]["path"] = path
                self.assertFalse(self.result()["record_valid"])

    def test_symlink_escape_fails_when_supported(self):
        outside = Path(self.temp.name) / "outside.txt"
        outside.write_text("outside")
        link = self.root / "link.txt"
        try:
            link.symlink_to(outside)
        except OSError:
            self.skipTest("host cannot create symlinks")
        with self.assertRaises(ValueError):
            p.local_file(self.root, "link.txt")

    def test_duplicate_json_key_and_malformed_structure_fail(self):
        self.path.write_text('{"schema_version":1,"schema_version":1}')
        self.assertFalse(p.validate(self.path)["record_valid"])
        self.packet["gates"] = "passed"
        self.assertFalse(self.result()["record_valid"])

    def test_open_defect_prevents_complete(self):
        self.complete()
        self.packet["defects"] = [{"id": "D1", "summary": "test defect", "severity": "major",
            "status": "open", "affected_scope": "test only", "reproduction": "test",
            "regression": "test"}]
        self.assertTrue(self.result()["record_valid"])
        self.assertFalse(self.result(True)["record_valid"])

    def test_fixed_and_accepted_defects_need_evidence_or_reason(self):
        self.complete()
        defect = {"id": "D1", "summary": "test", "severity": "minor", "status": "fixed",
                  "affected_scope": "test", "reproduction": "test", "regression": "test"}
        self.packet["defects"] = [defect]
        self.assertFalse(self.result()["record_valid"])
        defect.update(fix_revision="a" * 40, evidence=["gameplay"])
        self.assertTrue(self.result()["record_valid"])
        defect["status"] = "accepted"
        self.assertFalse(self.result()["record_valid"])
        defect["acceptance_reason"] = "Explicit synthetic test limitation"
        self.assertTrue(self.result(True)["record_valid"])

    def test_initializer_preserves_existing_destination(self):
        with self.assertRaises(FileExistsError):
            p.initialize(self.root, "another-map")


if __name__ == "__main__":
    unittest.main()
