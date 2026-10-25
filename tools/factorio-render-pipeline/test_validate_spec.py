import json
import unittest
from pathlib import Path
from validate_spec import validate


class SpecTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads(Path(__file__).with_name("spec-template.json").read_text())

    def test_draft_valid(self):
        self.assertEqual([], validate(self.data))

    def test_draft_rejected_for_production(self):
        self.assertIn("production requires calibrated status", validate(self.data, strict=True))

    def test_duplicate_state_rejected(self):
        self.data["states"].append({"name": "run"})
        self.assertIn("duplicate state run", validate(self.data))

    def test_bad_footprint_rejected(self):
        self.data["footprint_tiles"] = [0, 3]
        self.assertIn("positive two-axis footprint required", validate(self.data, strict=True))


if __name__ == "__main__":
    unittest.main()