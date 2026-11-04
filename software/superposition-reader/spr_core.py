"""SuperPosition Reader core: private archives, document extraction, sentence chunks and WAV caching.

No user document, recording or generated voice is written to the public checkout.
Python >= 3.10. PDF/DOCX handling requires optional installed libraries.
"""
from __future__ import annotations

import hashlib
import io
import json
import math
import os
from pathlib import Path
import re
import subprocess
import sys
import wave
import zipfile

SUPPORTED = {".txt", ".md", ".markdown", ".pdf", ".docx", ".epub"}
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
    elif suffix == ".epub":
        from spr_epub import extract_epub
        text = extract_epub(data)
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


def passage_chunks(text: str, max_chars: int = 420) -> list[str]:
    """Group adjacent sentences for book-length TTS without sacrificing text.

    Each group is limited in length and respects paragraph breaks. Detailed
    per-sentence timing within these passages will require forced alignment.
    """
    if max_chars < 80:
        raise ValueError("Passage size must be at least 80 characters")
    groups = []
    paragraphs = re.split(r"\n\s*\n", text.strip())
    for paragraph in paragraphs:
        sentences = sentence_chunks(paragraph, max_chars=max_chars)
        bucket = ""
        for sentence in sentences:
            if bucket and len(bucket) + 1 + len(sentence) > max_chars:
                groups.append(bucket)
                bucket = ""
            bucket = bucket + " " + sentence if bucket else sentence
        if bucket:
            groups.append(bucket)
    if not groups:
        raise ValueError("No readable passages in imported document")
    return groups


def _write_json_atomic(path: Path, payload: dict) -> None:
    tmp = path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    os.replace(tmp, path)


def _checked_word_cues(text: str, cues, duration: float) -> list[dict]:
    """Only persist bounded, measured, monotonic word offsets from an engine."""
    if not isinstance(cues, list) or len(cues) > len(text):
        return []
    checked = []
    last_char = 0
    last_time = 0.0
    for cue in cues:
        if not isinstance(cue, dict):
            return []
        start_char, end_char = cue.get("char_start"), cue.get("char_end")
        start, end = cue.get("start"), cue.get("end")
        if (type(start_char) is not int or type(end_char) is not int
                or not isinstance(start, (int, float))
                or not isinstance(end, (int, float))
                or isinstance(start, bool) or isinstance(end, bool)):
            return []
        if (not math.isfinite(start) or not math.isfinite(end)
                or not last_char <= start_char < end_char <= len(text)
                or not 0 <= start < end <= duration + 0.05
                or start < last_time - 0.005
                or not text[start_char:end_char].strip()):
            return []
        checked.append({"char_start": start_char, "char_end": end_char,
                        "start": float(start), "end": float(end)})
        last_char = end_char
        last_time = end
    return checked


def _epub_chapter_ranges(source: bytes, chunks: list[dict], mode: str) -> list[dict]:
    """Map original EPUB spine sections to exact cached passage boundaries.

    Never guess chapter boundaries when the section chunks don't match the
    already-imported text. A mismatch yields an ordinary whole-book export.
    """
    from spr_epub import extract_epub_sections
    chapters = []
    expected = []
    offset = 0
    for number, section in enumerate(extract_epub_sections(source), 1):
        pieces = passage_chunks(section) if mode == "passage" else sentence_chunks(section)
        heading = " ".join(section.split("\n\n", 1)[0].split())
        title = (heading if heading and len(heading) <= 90
                 and not heading.endswith((".", "!", "?"))
                 else f"Chapter {number}")
        chapters.append({"title": title, "start": offset,
                         "end": offset + len(pieces)})
        expected.extend(pieces)
        offset += len(pieces)
    if expected != [item["text"] for item in chunks]:
        return []
    return chapters


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
        # Books use passage-sized synthesis jobs; short documents retain
        # sentence-level highlighting for finer playback navigation.
        mode = "passage" if len(text) > 18000 else "sentence"
        chunks = passage_chunks(text) if mode == "passage" else sentence_chunks(text)
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "audio").mkdir(exist_ok=True)
        (folder / ("source" + Path(safe_name).suffix.lower())).write_bytes(data)
        manifest = {
            "id": book_id, "title": safe_name, "schema": 1,
            "source_sha256": hashlib.sha256(data).hexdigest(),
            "chunks": [{"index": i, "text": chunk} for i, chunk in enumerate(chunks)],
            "segment_mode": mode,
            "audio": {}
        }
        if Path(safe_name).suffix.lower() == ".epub":
            manifest["chapters"] = _epub_chapter_ranges(data, manifest["chunks"], mode)
        _write_json_atomic(manifest_path, manifest)
        return manifest

    def load(self, book_id: str) -> dict:
        folder = self.folder(book_id)
        record = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
        # Migrate existing EPUB archives without reimporting private source
        # files or regenerating any audio. Preserve the recorded chunk layout.
        if "chapters" not in record and (folder / "source.epub").is_file():
            try:
                record["chapters"] = _epub_chapter_ranges(
                    (folder / "source.epub").read_bytes(), record["chunks"],
                    record.get("segment_mode", "sentence"))
            except (OSError, ValueError, KeyError, zipfile.BadZipFile):
                record["chapters"] = []
            _write_json_atomic(folder / "manifest.json", record)
        # Cached WAV files can disappear after disk cleanup, interrupted copies or
        # migration. Do not advertise deleted clips as playable or complete.
        for index, entry in list(record.get("audio", {}).items()):
            filename = entry.get("file") if isinstance(entry, dict) else None
            if (not isinstance(filename, str) or Path(filename).name != filename
                    or not filename.endswith(".wav") or
                    not (folder / "audio" / filename).is_file()):
                del record["audio"][index]
        return record

    def library(self) -> list[dict]:
        parent = self.root / "books"
        if not parent.exists():
            return []
        results = []
        for path in parent.glob("*/manifest.json"):
            try:
                record = self.load(path.parent.name)
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
            # The existing cache hash already commits to engine, voice and rate.
            # Give earlier valid entries render metadata without regenerating audio.
            if "render" not in old:
                old["render"] = {"engine": engine.engine_id, "voice": voice, "rate": rate}
                _write_json_atomic(folder / "manifest.json", manifest)
            return False  # Already generated; resumable without recomputation
        temp = target.with_suffix(".partial.wav")
        try:
            metadata = engine.synthesize(chunk["text"], temp, voice=voice, rate=rate)
            with wave.open(str(temp), "rb") as wav:
                duration = wav.getnframes() / wav.getframerate()
                if duration <= 0:
                    raise ValueError("Speech engine produced empty audio")
            os.replace(temp, target)
        finally:
            temp.unlink(missing_ok=True)
        entry = {
            "key": key, "file": target.name, "seconds": duration,
            "render": {"engine": engine.engine_id, "voice": voice, "rate": rate},
        }
        cues = _checked_word_cues(chunk["text"],
                                  metadata.get("word_cues") if isinstance(metadata, dict) else None,
                                  duration)
        if cues:
            entry["word_cues"] = cues
        manifest["audio"][str(index)] = entry
        _write_json_atomic(folder / "manifest.json", manifest)
        return True

    def audio_file(self, book_id: str, index: int) -> Path:
        manifest = self.load(book_id)
        entry = manifest["audio"].get(str(index))
        if entry is None:
            raise FileNotFoundError("Audio has not been generated")
        filename = entry["file"]
        if Path(filename).name != filename or not filename.endswith(".wav"):
            raise ValueError("Unsafe cached audio file reference")
        path = self.folder(book_id) / "audio" / filename
        if not path.is_file():
            raise FileNotFoundError("Cached WAV is missing")
        return path

    def read_position(self, book_id: str) -> dict:
        path = self.folder(book_id) / "reading-position.json"
        if not path.exists():
            return {"index": 0, "fraction": 0.0}
        try:
            position = json.loads(path.read_text(encoding="utf-8"))
            index = int(position["index"])
            fraction = float(position["fraction"])
            count = len(self.load(book_id)["chunks"])
            if 0 <= index < count and 0.0 <= fraction <= 1.0:
                return {"index": index, "fraction": fraction}
        except (ValueError, TypeError, KeyError, OSError):
            pass
        return {"index": 0, "fraction": 0.0}

    def save_position(self, book_id: str, index: int, fraction: float = 0.0) -> dict:
        count = len(self.load(book_id)["chunks"])
        if not 0 <= index < count or not 0.0 <= fraction <= 1.0:
            raise ValueError("Reading position outside document")
        position = {"index": index, "fraction": fraction}
        _write_json_atomic(self.folder(book_id) / "reading-position.json", position)
        return position

    @staticmethod
    def _export_settings(manifest: dict) -> dict:
        if len(manifest["audio"]) != len(manifest["chunks"]):
            raise ValueError("Finish generating all narration before exporting")
        render_set = set()
        for index in range(len(manifest["chunks"])):
            entry = manifest["audio"].get(str(index))
            if entry is None:
                raise ValueError("Missing audio for sentence " + str(index + 1))
            render = entry.get("render")
            if not render:
                raise ValueError("Legacy audio is missing voice metadata; regenerate those sentences")
            render_set.add((render["engine"], render["voice"], render["rate"]))
        if len(render_set) != 1:
            raise ValueError("Book contains different voices or rates; regenerate to one setting before exporting")
        engine, voice, rate = next(iter(render_set))
        return {"engine": engine, "voice": voice, "rate": rate}

    def export_wav(self, book_id: str) -> Path:
        manifest = self.load(book_id)
        self._export_settings(manifest)
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

    def export_chapters_zip(self, book_id: str) -> Path:
        """Export complete narration as EPUB-spine chapter WAVs in a ZIP64 archive.

        Only a single chapter WAV is spooled at a time, so a long book does not
        require an enormous temporary combined WAV. Chapters are ordered and
        checked against the original passage index, never estimated by time.
        """
        manifest = self.load(book_id)
        render = self._export_settings(manifest)
        chapters = manifest.get("chapters") or [{
            "title": "Complete document", "start": 0, "end": len(manifest["chunks"])}]
        cursor = 0
        for chapter in chapters:
            if (type(chapter.get("start")) is not int
                    or type(chapter.get("end")) is not int
                    or chapter["start"] != cursor
                    or not cursor < chapter["end"] <= len(manifest["chunks"])):
                raise ValueError("Chapter boundaries do not match the imported document")
            cursor = chapter["end"]
        if cursor != len(manifest["chunks"]):
            raise ValueError("Chapter export would omit narration segments")
        folder = self.folder(book_id)
        output = folder / "narration-chapters.zip"
        temp = folder / "narration-chapters.partial.zip"
        index = []
        try:
            with zipfile.ZipFile(temp, "w", compression=zipfile.ZIP_DEFLATED,
                                 compresslevel=3, allowZip64=True) as bundle:
                for number, chapter in enumerate(chapters, 1):
                    filename = f"chapter-{number:03d}.wav"
                    spool = folder / f".export-chapter-{number:03d}.partial.wav"
                    params = None
                    bytes_written = 0
                    duration = 0.0
                    try:
                        with wave.open(str(spool), "wb") as target:
                            for chunk in range(chapter["start"], chapter["end"]):
                                with wave.open(str(self.audio_file(book_id, chunk)), "rb") as source:
                                    p = source.getparams()
                                    signature = (p.nchannels, p.sampwidth, p.framerate, p.comptype)
                                    if params is None:
                                        params = signature
                                        target.setparams((p.nchannels, p.sampwidth, p.framerate,
                                                          0, p.comptype, p.compname))
                                    elif signature != params:
                                        raise ValueError("Chapter contains incompatible audio formats")
                                    duration += p.nframes / p.framerate
                                    while block := source.readframes(65536):
                                        bytes_written += len(block)
                                        if bytes_written > 3_800_000_000:
                                            raise ValueError("One chapter exceeds the standard WAV limit")
                                        target.writeframesraw(block)
                        bundle.write(spool, filename)
                    finally:
                        spool.unlink(missing_ok=True)
                    index.append({"title": chapter["title"], "file": filename,
                                  "start": chapter["start"], "end": chapter["end"],
                                  "seconds": round(duration, 3)})
                bundle.writestr("chapters.json", json.dumps({
                    "source_sha256": manifest["source_sha256"],
                    "book_title": manifest["title"], "render": render,
                    "chapters": index
                }, indent=2, ensure_ascii=False))
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
