"""No copyrighted source frames; synthetic test fixture and real prototype metadata."""
import tempfile
from pathlib import Path
import unittest
from test_atlas_audit import generate_fixture
from thruster_entity_layers_r17 import (
    PORTS,MARKERS,contract,light_frame_location,conditional_pipes,
    inspect_source_zip
)

class LayerAssemblyTests(unittest.TestCase):
    def test_single_64_frame_glow_has_two_atlas_pages(self):
        c=contract(); light=c["light"];body=c["body"]
        self.assertEqual(light["frame_count"],64)
        self.assertEqual(body["animation_speed"],light["animation_speed"])
        self.assertTrue(light["draw_as_glow"])
        self.assertEqual(light["blend_mode"],"additive")
        self.assertTrue(light["fadeout"])
        self.assertNotEqual(body["cell"],light["cell"])
        self.assertEqual([light_frame_location(n)["page"] for n in
                          (0,31,32,63)],[1,1,2,2])
        with self.assertRaises(ValueError):light_frame_location(64)

    def test_four_independent_fuel_and_oxidizer_connection_visuals(self):
        c=contract()
        self.assertEqual(len(c["ports"]),4)
        self.assertEqual([(p["visual"],p["fluid"],p["direction"],
                           tuple(p["factorio_xy"]),p["visual_shift_px"][-1])
                          for p in c["ports"]],list(PORTS))
        self.assertEqual(conditional_pipes([]),[])
        self.assertEqual(conditional_pipes(["pipe-4","pipe-1"]),
                         ["pipe-1","pipe-4"])
        with self.assertRaises(ValueError):conditional_pipes(["bad"])

    def test_sound_accents_are_inspection_cues_not_rig_proof(self):
        self.assertEqual(MARKERS[25],"thruster-mechanic-stop")
        self.assertEqual(MARKERS[52],"thruster-mechanic-move")
        self.assertTrue(contract()["light"]["not_physical_machinery"])

    def test_source_zip_pages_and_cue_contact_outputs_on_fixture(self):
        with tempfile.TemporaryDirectory() as tmp:
            zip_path=Path(tmp)/"source.zip"
            generate_fixture(zip_path)
            output=Path(tmp)/"private"
            record=inspect_source_zip(zip_path,output,strict=False)
            self.assertEqual((record["body_count"],record["light_count"]),(64,64))
            self.assertEqual(record["per_frame_light"][25]["sound_cue"],MARKERS[25])
            self.assertEqual(record["per_frame_light"][52]["sound_cue"],MARKERS[52])
            for name in ("light-phase-cues_PRIVATE.png",
                         "light-page-contact_PRIVATE.png",
                         "body-phase-cues_PRIVATE.png",
                         "atlas_layer_inspection_PRIVATE.json"):
                self.assertTrue((output/name).is_file(),name)
            with self.assertRaisesRegex(ValueError,"264"):
                inspect_source_zip(zip_path,output/"strict",strict=True)

if __name__=="__main__":unittest.main()
