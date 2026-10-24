"""Functional composition checks use synthesized test tones, never user voice data."""
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import compose_nutbuster as m

class TestComposition(unittest.TestCase):
    def setUp(self):
        if not m.shutil.which("ffmpeg") or not m.shutil.which("ffprobe"):
            self.skipTest("ffmpeg/ffprobe unavailable")
        self.tmp = tempfile.TemporaryDirectory(prefix="voicebox-test-")
        self.addCleanup(self.tmp.cleanup)
        self.home = Path(self.tmp.name)
        self.game = self.home / "game"
        self.rendered = self.home / "renders"
        self.rendered.mkdir()
        doc = self.game / "docs/wiki/Announcer-Expansion-Script.md"
        doc.parent.mkdir(parents=True)
        keys = list(m.PREVIEW) + ["extra-%02d" % i for i in range(68)]
        doc.write_text("# Synthetic fixture\n" + "".join(
            "| " + chr(96) + key + chr(96) + " | event | P1 | “Script for " + key + ".” | “Other.” |\n"
            for key in keys), encoding="utf-8")
        scripts = m.original_lines(self.game)
        files = []
        for key in m.PREVIEW:
            path = self.rendered / (key + ".mp3")
            subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y",
                "-f", "lavfi", "-i", "sine=frequency=440:duration=0.85",
                "-c:a", "libmp3lame", str(path)], check=True)
            files.append(dict(key=key, text=scripts[key], file=path.name,
                sha256=m.checksum(path), bytes=path.stat().st_size))
        self.manifest = self.rendered / "manifest.json"
        self.manifest.write_text(json.dumps(dict(schema=1, scope="preview",
            source_project="mrcalzon02/NUTBUSTER-R", profile="owner-authorized-original",
            reference_audio_uploaded=False, engine="luxtts", files=files)))
        self.output = self.home / "private" / "composition"

    def test_valid_review_pack_does_not_modify_inputs(self):
        originals = {p.name:m.checksum(p) for p in self.rendered.glob("*.mp3")}
        manifest = m.compose(self.game, self.rendered, self.output, "preview")
        self.assertEqual(manifest["lineCount"], 6)
        self.assertFalse(manifest["approved"])
        self.assertFalse(manifest["referenceAudioIncluded"])
        self.assertTrue((self.output / "audition.mp3").is_file())
        self.assertEqual(len(list((self.output/"clips").glob("*.mp3"))), 6)
        self.assertEqual(m.probe(self.output/"clips/start-first.mp3")["sampleRate"], 44100)
        self.assertEqual(originals, {p.name:m.checksum(p) for p in self.rendered.glob("*.mp3")})
        with self.assertRaises(FileExistsError):
            m.compose(self.game, self.rendered, self.output, "preview")

    def test_fails_closed_on_invalid_hash(self):
        manifest = json.loads(self.manifest.read_text())
        manifest["files"][0]["sha256"] = "bad"
        self.manifest.write_text(json.dumps(manifest))
        with self.assertRaisesRegex(ValueError, "hash/size mismatch"):
            m.compose(self.game, self.rendered, self.output, "preview")
        self.assertFalse(self.output.exists())

    def test_refuses_unsafe_render_record(self):
        manifest = json.loads(self.manifest.read_text())
        manifest["files"][0]["file"] = "../../wrong.mp3"
        self.manifest.write_text(json.dumps(manifest))
        with self.assertRaisesRegex(ValueError, "filename drift|text or filename drift"):
            m.compose(self.game, self.rendered, self.output, "preview")
        self.assertFalse(self.output.exists())

if __name__ == "__main__":
    unittest.main()
