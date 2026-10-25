#!/usr/bin/env python3
"""Ephemeral GitHub-hosted LuxTTS narrator; keeps unencrypted audio off GitHub."""
import argparse
import hashlib
import difflib
import re
import json
import sys
import wave
import zipfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from nutbuster_batch import PREVIEW, original_lines

def sha(path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1048576), b""):
            h.update(chunk)
    return h.hexdigest()

def lines(repo,scope):
    if scope not in ("preview","all"): raise ValueError("Unsupported scope")
    full=original_lines(repo)
    if len(full)!=74 or not all(x in full for x in PREVIEW):
        raise ValueError("Expected 74 original-announcer lines and 6 preview events")
    return {x:full[x] for x in PREVIEW} if scope=="preview" else full


def playback_safe_waveform(audio, sample_rate=48000, lead_ms=220, tail_ms=380):
    """Add actual silence outside synthetic speech, preserving spoken text.

    Models may produce nonzero signal on the very first and last samples.
    This function removes player-start gating and EOF cutoffs by guaranteeing
    meaningful silent margins in the stored WAV. It cannot reconstruct any
    phoneme that the model itself failed to synthesize.
    """
    import numpy as np
    signal = np.asarray(audio, dtype=np.float64).squeeze().copy()
    if signal.ndim != 1 or len(signal) < int(.05 * sample_rate) or not np.isfinite(signal).all():
        raise ValueError("Invalid 1D finite waveform from LuxTTS")
    fade = min(int(sample_rate * .006), max(1, len(signal) // 20))
    if fade:
        signal[:fade] *= np.sin(np.linspace(0, np.pi / 2, fade))
        signal[-fade:] *= np.sin(np.linspace(np.pi / 2, 0, fade))
    return np.pad(signal, (round(sample_rate * lead_ms / 1000),
                           round(sample_rate * tail_ms / 1000)), mode="constant")


def normalized_words(text):
    """Normalize pronunciation-equivalent spelling without hiding dropped words."""
    clean = text.lower().replace("'", "")
    clean = re.sub(r"\beuglorious\b", "you glorious", clean)
    number_names = ("zero one two three four five six seven eight nine ten eleven twelve "
                    "thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty").split()
    def say_number(match):
        value = int(match.group(0))
        if value <= 20:
            return number_names[value]
        if value in (100,200,300,400,500,600,700,800,900):
            return number_names[value//100] + " hundred"
        return str(value)
    clean = re.sub(r"\b\d+\b", say_number, clean)
    # Whisper writes these spoken words either joined or split.
    for fragment,joined in (("nut buster","nutbuster"),("nut dex","nutdex"),
                            ("nut tastic","nuttastic"),("in coming","incoming")):
        clean = re.sub(r"\b" + fragment.replace(" ", r"[\s-]+") + r"\b", joined, clean)
    return re.findall(r"[a-z0-9]+", clean)

def spoken_text(text):
    """Stop sending all-caps game announcer keys as screaming TTS prompts."""
    text = text.strip()
    return text[0].upper() + text[1:].lower() if text else text

def score_transcript(expected, heard, speech_seconds):
    """Catch omitted first/last words as well as impossibly short takes.

    Independent Whisper-tiny ASR ships with LuxTTS and is already loaded for
    reference encoding. Use it as a *gate*, not a substitute for human review.
    """
    target, actual = normalized_words(expected), normalized_words(heard)
    if not target or not actual:
        return False, 0.0
    score = difflib.SequenceMatcher(None, " ".join(target), " ".join(actual)).ratio()
    first = difflib.SequenceMatcher(None, target[0], actual[0]).ratio()
    last = max(difflib.SequenceMatcher(None, target[-1], word).ratio()
               for word in actual[-2:])
    min_duration = max(0.75, len(target) * 0.24)
    good = (score >= 0.68 and first >= 0.66 and last >= 0.67
            and speech_seconds >= min_duration)
    return good, round(score, 3)



def strip_verified_extra_opening(audio, expected, recognition, sample_rate=48000,
                                 leading_pad_seconds=0.220):
    """Remove ONE proven extra opening word using ASR word timestamps.

    No guessed fixed-duration cropping. Only attempt this if ASR hears an extra
    standalone 'if' (or other clearly extraneous filler) before the expected
    first word AND the entire remaining sentence, including its final word,
    already matches. Original generation is never modified in place.
    """
    import numpy as np
    if not isinstance(recognition, dict):
        return None
    actual = normalized_words(recognition.get("text", ""))
    target = normalized_words(expected)
    if len(actual) < len(target) + 1 or actual[0] not in ("if", "ive", "uh", "um", "a", "of", "have", "ever", "at", "without"):
        return None
    matched, _ = score_transcript(expected, " ".join(actual[1:]),
                                  len(audio) / sample_rate)
    if not matched:
        return None
    chunks = recognition.get("chunks")
    if not isinstance(chunks, list) or len(chunks) < 2:
        return None
    # Whisper may split contractions and punctuation differently. Find the
    # first timestamped token corresponding to the target's initial word.
    first_word_start = None
    for word in chunks[1:5]:
        words = normalized_words(word.get("text", ""))
        ts = word.get("timestamp")
        if not words or not isinstance(ts, (tuple, list)) or len(ts) < 1:
            continue
        if difflib.SequenceMatcher(None, target[0], words[0]).ratio() >= .75:
            if isinstance(ts[0], (float, int)):
                first_word_start = float(ts[0])
                break
    if first_word_start is None:
        return None
    # The ASR timestamps include the 220ms of leading WAV silence. Start
    # 45ms before the recognized true first word to preserve its onset.
    trim_seconds = max(0.0, first_word_start - leading_pad_seconds - .045)
    frames = round(trim_seconds * sample_rate)
    if frames < int(.045 * sample_rate) or frames > int(.85 * sample_rate):
        return None
    remaining = np.asarray(audio)[frames:]
    if len(remaining) < sample_rate * .75:
        return None
    return remaining.copy(), round(frames / sample_rate, 4)


class TakeRejected(RuntimeError):
    """Content verification failed; keep other verified takes and retry only this ID."""
    def __init__(self, key, diagnostics):
        super().__init__("Speech content QA rejected " + key)
        self.key = key
        self.diagnostics = diagnostics



def trim_intro_marker(audio, expected, recognition, sample_rate=48000):
    """Use ASR timestamps to remove the intentional 'Okay' setup phrase.

    The remaining recorded speech must pass the normal content check again.
    """
    import numpy as np
    if not isinstance(recognition, dict):
        return None
    words=normalized_words(recognition.get("text",""))
    target=normalized_words(expected)
    if "okay" not in words[:4]:
        return None
    remainder=words[words.index("okay")+1:]
    if not score_transcript(expected," ".join(remainder),len(audio)/sample_rate)[0]:
        return None
    seen=False
    start=None
    for chunk in recognition.get("chunks",[]):
        parts=normalized_words(chunk.get("text",""))
        if "okay" in parts:
            seen=True
            continue
        if seen and parts and target and difflib.SequenceMatcher(
                None,target[0],parts[0]).ratio()>=.75:
            stamp=chunk.get("timestamp")
            if isinstance(stamp,(tuple,list)) and stamp and isinstance(stamp[0],(int,float)):
                start=float(stamp[0])
                break
    if start is None:
        return None
    offset=round(max(0,start-.22-.045)*sample_rate)
    if not int(.06*sample_rate)<=offset<=int(3*sample_rate):
        return None
    remaining=np.asarray(audio)[offset:]
    if len(remaining)<.75*sample_rate:
        return None
    return remaining.copy(),round(offset/sample_rate,4)

def generate_verified_take(model, encoded, key, text, out, retry_round=0):
    import numpy as np
    import soundfile as sf
    import torch

    # CPU internal speed is multiplied by 1.3 upstream. Slow down the model,
    # keep a natural-case text prompt, and retry only if verification fails.
    prompt = spoken_text(text)
    presets = ([(0.92,8), (1.0,10), (0.80,9), (0.94,12), (1.08,8), (0.73,10)]
               if retry_round else [(0.76,6), (0.62,7), (0.52,8), (0.88,8)])
    diagnostics = []
    for attempt, (speed, steps) in enumerate(presets, 1):
        # Deterministic per-line, per-attempt seeds. Previous runs used the
        # same seed for every line, reproducing the same unwanted prefixes.
        salt = int.from_bytes(hashlib.sha256(key.encode()).digest()[:4], "big")
        torch.manual_seed((104729 + attempt * 7919 + salt +
                           retry_round * 1000003) % 2147483647)
        variant = ("Okay. " + prompt) if retry_round >= 4 else (
                  prompt if attempt % 2 else prompt.rstrip("!?.") + ".")
        generated = model.generate_speech(variant, encoded,
                                           num_steps=steps, speed=speed)
        audio = (generated.detach().cpu().numpy()
                 if hasattr(generated, "detach") else np.asarray(generated)).squeeze()
        if audio.ndim != 1 or len(audio) < 2400 or not np.isfinite(audio).all():
            diagnostics.append({"attempt": attempt, "error": "Invalid or empty synthesis"})
            continue
        candidate = out / (key + "-candidate-" + str(attempt) + ".wav")
        padded = playback_safe_waveform(audio, sample_rate=48000)
        sf.write(str(candidate), padded, 48000, subtype="PCM_16")
        heard = ""
        removed_prefix_seconds = 0.0
        try:
            try:
                result = model.transcriber(str(candidate), return_timestamps="word")
            except (TypeError, ValueError):
                result = model.transcriber(str(candidate))
            heard = result.get("text", "") if isinstance(result, dict) else str(result)
        except Exception as error:
            diagnostics.append({"attempt": attempt, "asrError": str(error)[:200]})
            candidate.unlink(missing_ok=True)
            continue
        seconds = len(audio) / 48000
        passed, match = score_transcript(text, heard, seconds)
        if not passed:
            adjusted = (trim_intro_marker(audio, text, result) if retry_round >= 4
                        else strip_verified_extra_opening(audio, text, result))
            if adjusted is not None:
                corrected_audio, trimmed_seconds = adjusted
                sf.write(str(candidate), playback_safe_waveform(corrected_audio),
                         48000, subtype="PCM_16")
                try:
                    corrected_result = model.transcriber(str(candidate))
                    corrected_heard = (corrected_result.get("text", "")
                                       if isinstance(corrected_result, dict)
                                       else str(corrected_result))
                    corrected_duration = len(corrected_audio) / 48000
                    corrected_passed, corrected_match = score_transcript(
                        text, corrected_heard, corrected_duration)
                    print("  Prefix correction for %s: removed %.3fs; heard %r; %s" %
                          (key, trimmed_seconds, corrected_heard,
                           "PASS" if corrected_passed else "RETRY"), flush=True)
                    if corrected_passed:
                        passed, match = corrected_passed, corrected_match
                        heard, seconds = corrected_heard, corrected_duration
                        removed_prefix_seconds = trimmed_seconds
                except Exception as error:
                    print("  Corrected ASR could not verify: %s" % str(error)[:150],
                          flush=True)
        diagnostics.append({"attempt": attempt, "speed": speed, "numSteps": steps,
                            "speechSeconds": round(seconds, 3), "heard": heard,
                            "matchScore": match, "accepted": passed,
                            "removedExtraPrefixSeconds": removed_prefix_seconds})
        print("  QA %s attempt %d: heard %r; expected %r; duration %.2fs; match %.2f; %s" %
              (key, attempt, heard[:180], text, seconds, match, "PASS" if passed else "RETRY"),
              flush=True)
        if passed:
            final = out / (key + ".wav")
            candidate.rename(final)
            return final, diagnostics[-1], diagnostics
        candidate.unlink(missing_ok=True)
    print("QA REJECTED for %s after %d attempts; preserving earlier verified audio" %
          (key, len(diagnostics)), flush=True)
    raise TakeRejected(key, diagnostics)

def package(directory, events, outfile, failures=None, requested=None):
    """Always preserve verified audio even when one or more lines fail QA.

    The manifest labels partial results clearly. A missing audition reel means
    no voice takes passed, rather than pretending a zero-length reel is useful.
    """
    failures = list(failures or [])
    requested = requested if requested is not None else len(events) + len(failures)
    if requested != len(events) + len(failures):
        raise ValueError("Expected one verification outcome per requested narration cue")
    if not events and not failures:
        raise ValueError("Cannot package an empty production request")
    reel = None
    if events:
        audition = directory / "audition.wav"
        with wave.open(str(audition), "wb") as joined:
            fmt = None
            for i, event in enumerate(events):
                with wave.open(str(directory / event["file"]), "rb") as wav:
                    props = (wav.getnchannels(), wav.getsampwidth(), wav.getframerate())
                    if fmt is None:
                        fmt = props
                        joined.setnchannels(props[0])
                        joined.setsampwidth(props[1])
                        joined.setframerate(props[2])
                    if props != fmt or wav.getnframes() < 1:
                        raise RuntimeError("Invalid audio format for " + event["file"])
                    while block := wav.readframes(48000):
                        joined.writeframesraw(block)
                    if i + 1 < len(events):
                        joined.writeframesraw(b"\0" * int(props[2] * .25) * props[0] * props[1])
        reel = {"file": "audition.wav", "sha256": sha(audition)}
    status = ("ALL_VERIFIED" if not failures else
              "PARTIAL_VERIFIED" if events else "NONE_VERIFIED")
    info = {
        "schema": 2, "source": "mrcalzon02/NUTBUSTER-R",
        "engine": "LuxTTS CPU", "status": status, "voiceSource": "owner-authorized",
        "playbackBoundaryProtection": {"leadMs": 220, "tailMs": 380, "fadeMs": 6,
            "limitation": "Silence cannot restore missing synthesized phonemes"},
        "requestedLineCount": requested, "lineCount": len(events),
        "verifiedCount": len(events), "failedCount": len(failures),
        "verification": {"method": "Whisper tiny ASR with first/last word and duration check",
                         "passed": len(events), "allPassed": not failures},
        "cloudUploadPlaintext": False,
        "clips": events, "failedTakes": failures, "audition": reel,
    }
    (directory / "manifest.json").write_text(json.dumps(info, indent=2, ensure_ascii=False) + "\n",
                                              encoding="utf-8")
    (directory / "failed-takes.json").write_text(json.dumps(failures, indent=2, ensure_ascii=False) + "\n",
                                                  encoding="utf-8")
    (directory / "retry-ids.txt").write_text("".join(f["key"] + "\n" for f in failures),
                                              encoding="utf-8")
    outfile.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(outfile, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for p in sorted(directory.rglob("*")):
            if p.is_file():
                archive.write(p, p.relative_to(directory).as_posix())
    print("PRODUCTION RESULT: %d/%d verified, %d failed content QA; %s" %
          (len(events), requested, len(failures), status), flush=True)
    return info

def render(repo,reference,out,scope,only=None):
    texts=lines(repo,scope)
    if only:
        if only not in lines(repo,"all"):
            raise ValueError("Unknown narration ID: " + only)
        texts = {only: lines(repo,"all")[only]}
    if not reference.is_file() or reference.stat().st_size<10000:
        raise ValueError("Private reference file missing or too small")
    if out.exists():raise FileExistsError("Refusing to overwrite existing output")
    out.mkdir(parents=True)
    import numpy as np
    import soundfile as sf
    import torch
    from zipvoice.luxvoice import LuxTTS
    torch.set_num_threads(2)
    print("Loading LuxTTS CPU on the GitHub-hosted runner",flush=True)
    model=LuxTTS("YatharthS/LuxTTS",device="cpu",threads=2)
    encoded=model.encode_prompt(str(reference),rms=0.01)
    events, failures = [], []
    for i, (key, text) in enumerate(texts.items(), 1):
        print("Generating %d/%d %s" % (i, len(texts), key), flush=True)
        try:
            path, chosen, attempts = generate_verified_take(model, encoded, key, text, out)
        except TakeRejected as error:
            failures.append({
                "key": key, "expectedText": text,
                "reason": "Speech recognition did not verify the complete line",
                "attemptCount": len(error.diagnostics),
                "attempts": [{**a, "heard": a.get("heard", "")[:200]} for a in error.diagnostics],
            })
            print("  Saved %d verified WAVs; flagged %s for later retry. Continuing." %
                  (len(events), key), flush=True)
            continue
        with wave.open(str(path), "rb") as wav:
            duration = wav.getnframes() / wav.getframerate()
        events.append({
            "key": key, "text": text, "file": path.name,
            "sha256": sha(path), "bytes": path.stat().st_size,
            "durationSeconds": round(duration, 3),
            "speechDurationSeconds": chosen["speechSeconds"],
            "boundaryLeadMs": 220, "boundaryTailMs": 380,
            "asrTranscript": chosen["heard"],
            "asrMatchScore": chosen["matchScore"],
            "asrVerified": True,
            "synthesis": {k: chosen[k] for k in ("speed", "numSteps", "attempt")},
        })
    output = out.parent / "nutbuster-voice-review.zip"
    return package(out, events, output, failures=failures, requested=len(texts))

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--nutbuster",type=Path,required=True)
    ap.add_argument("--reference",type=Path,required=True)
    ap.add_argument("--out",type=Path,required=True)
    ap.add_argument("--scope",choices=["preview","all"],default="preview")
    ap.add_argument("--validate",action="store_true")
    ap.add_argument("--only",default=None,help="Generate one event for quality diagnostics")
    args=ap.parse_args()
    print("Validated %d requested lines"%len(lines(args.nutbuster,args.scope)),flush=True)
    if not args.validate:render(args.nutbuster,args.reference,args.out,args.scope,args.only)

if __name__=="__main__":main()
