"""SuperPosition Reader core: private archives, document extraction, sentence chunks and WAV caching.

No user document, recording or generated voice is written to the public checkout.
Python >= 3.10. PDF/DOCX handling requires optional installed libraries.
"""
from __future__ import annotations

import hashlib
import io
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import wave

SUPPORTED = {".txt", ".md", ".markdown", ".pdf", ".docx"}
MAX_DOCUMENT_BYTES = 64 * 1024 * 1024
ID_PATTERN = re.compile(r"^[0-9a-f]{16}$")


def default_data_dir() -> Path:
    if os.name == "nt":
        return Path(os.environ.get("LOCALAPPDATA", str(Path.home()))) / "SuperPositionReader"
    return Path(os.environ.get("XDG_DATA_HOME", str(Path.home() / ".local/share"))) / "SuperPositionReader"


def extract_text(filename: str, data: bytes) -> str:
    suffix = Path(filename).suffix.lower()
    if suffix not in SUPPORTED:
        raise ValueError("Unsupported document type: " + suffix)
    if not data or len(data) > MAX_DOCUMENT_BYTES:
        raise ValueError("Document must be between 1 byte and 64 MiB")
    if suffix in {".txt", ".md", ".markdown"}:
        text = data.decode("utf-8-sig", errors="replace")
    elif suffix == ".pdf":
        try:
            import fitz
        except ImportError as exc:
            raise RuntimeError("PDF support requires PyMuPDF; run the SPR installer") from exc
        with fitz.open(stream=data, filetype="pdf") as document:
            text = "\n\n".join(page.get_text(sort=True) for page in document)
    else:
        try:
            from docx import Document
        except ImportError as exc:
            raise RuntimeError("DOCX support requires python-docx; run the SPR installer") from exc
        doc = Document(io.BytesIO(data))
        text = "\n\n".join(p.text for p in doc.paragraphs if p.text.strip())
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    if not text.strip():
        raise ValueError("No selectable text found (scanned PDFs need OCR; not yet implemented)")
    return text


def sentence_chunks(text: str, max_chars: int = 360) -> list[str]:
    """Split at natural breaks; no content is dropped even in long unpunctuated prose."""
    if max_chars < 40:
        raise ValueError("max_chars must be >= 40")
    text = re.sub(r"[ \t]+", " ", text).strip()
    candidates = re.split(r"(?<=[.!?])\s+|\n{2,}", text)
    chunks: list[str] = []
    for candidate in candidates:
        candidate = re.sub(r"\s+", " ", candidate).strip()
        if not candidate:
            continue
        while len(candidate) > max_chars:
            cut = candidate.rfind(" ", 0, max_chars + 1)
            if cut < max_chars // 3:
                cut = max_chars
            chunks.append(candidate[:cut].strip())
            candidate = candidate[cut:].strip()
        if candidate:
            chunks.append(candidate)
    if not chunks:
        raise ValueError("Document yielded no readable sentences")
    return chunks


def _write_json_atomic(path: Path, payload: dict) -> None:
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)


class Archive:
    def __init__(self, root: Path | None = None):
        self.root = Path(root) if root is not None else default_data_dir()
        self.root.mkdir(parents=True, exist_ok=True)

    def folder(self, book_id: str) -> Path:
        if not ID_PATTERN.fullmatch(book_id):
            raise ValueError("Invalid document ID")
        return self.root / "books" / book_id

    def import_document(self, filename: str, data: bytes) -> dict:
        safe_name = Path(filename.replace("\\", "/")).name[:160]
        if Path(safe_name).suffix.lower() not in SUPPORTED:
            raise ValueError("Unsupported file extension")
        book_id = hashlib.sha256(data).hexdigest()[:16]
        folder = self.folder(book_id)
        manifest_path = folder / "manifest.json"
        if manifest_path.is_file():
            return self.load(book_id)
        text = extract_text(safe_name, data)
        chunks = sentence_chunks(text)
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "audio").mkdir(exist_ok=True)
        (folder / ("source" + Path(safe_name).suffix.lower())).write_bytes(data)
        manifest = {
            "id": book_id, "title": safe_name, "schema": 1,
            "source_sha256": hashlib.sha256(data).hexdigest(),
            "chunks": [{"index": i, "text": chunk} for i, chunk in enumerate(chunks)],
            "audio": {}
        }
        _write_json_atomic(manifest_path, manifest)
        return manifest

    def load(self, book_id: str) -> dict:
        return json.loads((self.folder(book_id) / "manifest.json").read_text(encoding="utf-8"))

    def library(self) -> list[dict]:
        parent = self.root / "books"
        if not parent.exists():
            return []
        results = []
        for path in parent.glob("*/manifest.json"):
            try:
                record = json.loads(path.read_text(encoding="utf-8"))
                results.append({"id": record["id"], "title": record["title"],
                                "chunks": len(record["chunks"]), "ready": len(record["audio"])})
            except (OSError, ValueError, KeyError):
                continue
        return sorted(results, key=lambda x: x["title"].lower())

    @staticmethod
    def cache_key(text: str, engine_id: str, voice: str, rate: int) -> str:
        data = json.dumps([text, engine_id, voice, rate], ensure_ascii=False).encode("utf-8")
        return hashlib.sha256(data).hexdigest()

    def generate_chunk(self, book_id: str, index: int, engine, voice: str = "", rate: int = 0) -> bool:
        manifest = self.load(book_id)
        if not 0 <= index < len(manifest["chunks"]):
            raise IndexError("Chunk index out of range")
        chunk = manifest["chunks"][index]
        key = self.cache_key(chunk["text"], engine.engine_id, voice, rate)
        folder = self.folder(book_id)
        target = folder / "audio" / f"{index:06d}-{key[:16]}.wav"
        old = manifest["audio"].get(str(index))
        if old and old.get("key") == key and target.is_file() and target.stat().st_size > 44:
            return False  # Already generated; resumable without recomputation
        temp = target.with_suffix(".partial.wav")
        try:
            engine.synthesize(chunk["text"], temp, voice=voice, rate=rate)
            with wave.open(str(temp), "rb") as wav:
                duration = wav.getnframes() / wav.getframerate()
                if duration <= 0:
                    raise ValueError("Speech engine produced empty audio")
            os.replace(temp, target)
        finally:
            temp.unlink(missing_ok=True)
        manifest["audio"][str(index)] = {"key": key, "file": target.name, "seconds": duration}
        _write_json_atomic(folder / "manifest.json", manifest)
        return True

    def audio_file(self, book_id: str, index: int) -> Path:
        manifest = self.load(book_id)
        entry = manifest["audio"].get(str(index))
        if entry is None:
            raise FileNotFoundError("Audio has not been generated")
        path = self.folder(book_id) / "audio" / entry["file"]
        if not path.is_file():
            raise FileNotFoundError("Cached WAV is missing")
        return path

    def export_wav(self, book_id: str) -> Path:
        manifest = self.load(book_id)
        if len(manifest["audio"]) != len(manifest["chunks"]):
            raise ValueError("Finish generating all narration before exporting")
        output = self.folder(book_id) / "narration.wav"
        temp = output.with_suffix(".partial.wav")
        params = None
        total_bytes = 0
        try:
            with wave.open(str(temp), "wb") as target:
                for index in range(len(manifest["chunks"])):
                    with wave.open(str(self.audio_file(book_id, index)), "rb") as source:
                        p = source.getparams()
                        signature = (p.nchannels, p.sampwidth, p.framerate, p.comptype)
                        if params is None:
                            params = signature
                            target.setparams((p.nchannels, p.sampwidth, p.framerate, 0, p.comptype, p.compname))
                        elif signature != params:
                            raise ValueError("Audio format changed; cannot concatenate without resampling")
                        data = source.readframes(p.nframes)
                        total_bytes += len(data)
                        if total_bytes > 3_800_000_000:
                            raise ValueError("Audio exceeds standard WAV limit; chapter export is needed")
                        target.writeframesraw(data)
            os.replace(temp, output)
        finally:
            temp.unlink(missing_ok=True)
        return output


class WindowsSapiEngine:
    engine_id = "windows-sapi5-v1"

    def __init__(self):
        if os.name != "nt":
            raise RuntimeError("Windows SAPI synthesis is available on Windows only")
        self.script = Path(__file__).with_name("sapi_synthesize.ps1")

    def synthesize(self, text: str, target: Path, voice: str = "", rate: int = 0) -> None:
        if not -10 <= rate <= 10:
            raise ValueError("SAPI rate must be -10..10")
        text_file = target.with_suffix(".text.txt")
        text_file.write_text(text, encoding="utf-8-sig")
        try:
            args = ["powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass",
                    "-File", str(self.script), "-InputPath", str(text_file),
                    "-OutputPath", str(target), "-Rate", str(rate)]
            if voice:
                args += ["-VoiceName", voice]
            subprocess.run(args, check=True, capture_output=True, text=True, timeout=180)
        finally:
            text_file.unlink(missing_ok=True)

    def voices(self) -> list[str]:
        command = ("Add-Type -AssemblyName System.Speech; "
                   "$s=New-Object System.Speech.Synthesis.SpeechSynthesizer; "
                   "$s.GetInstalledVoices() | Where-Object {$_.Enabled} | "
                   "ForEach-Object {$_.VoiceInfo.Name}; $s.Dispose()")
        try:
            proc = subprocess.run(["powershell.exe", "-NoProfile", "-NonInteractive", "-Command", command],
                                  capture_output=True, text=True, timeout=20, check=True)
            return [x.strip() for x in proc.stdout.splitlines() if x.strip()]
        except (OSError, subprocess.SubprocessError):
            return []
