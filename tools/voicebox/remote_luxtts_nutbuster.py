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
    """Normalize capitalization, possessives and punctuation for phrase comparison."""
    return re.findall(r"[a-z0-9]+", text.lower().replace("'", ""))

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


def generate_verified_take(model, encoded, key, text, out):
    import numpy as np
    import soundfile as sf
    import torch

    # CPU internal speed is multiplied by 1.3 upstream. Slow down the model,
    # keep a natural-case text prompt, and retry only if verification fails.
    prompt = spoken_text(text)
    presets = [(0.76, 6), (0.62, 7), (0.52, 8), (0.88, 8)]
    diagnostics = []
    for attempt, (speed, steps) in enumerate(presets, 1):
        torch.manual_seed(104729 + attempt * 7919)
        generated = model.generate_speech(prompt, encoded,
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
        try:
            result = model.transcriber(str(candidate))
            heard = result.get("text", "") if isinstance(result, dict) else str(result)
        except Exception as error:
            diagnostics.append({"attempt": attempt, "asrError": str(error)[:200]})
            candidate.unlink(missing_ok=True)
            continue
        seconds = len(audio) / 48000
        passed, match = score_transcript(text, heard, seconds)
        diagnostics.append({"attempt": attempt, "speed": speed, "numSteps": steps,
                            "speechSeconds": round(seconds, 3), "heard": heard,
                            "matchScore": match, "accepted": passed})
        print("  QA %s attempt %d: heard %r; expected %r; duration %.2fs; match %.2f; %s" %
              (key, attempt, heard, text, seconds, match, "PASS" if passed else "RETRY"),
              flush=True)
        if passed:
            final = out / (key + ".wav")
            candidate.rename(final)
            return final, diagnostics[-1], diagnostics
        candidate.unlink(missing_ok=True)
    print("QA FAILED for %s: %s" % (key, json.dumps(diagnostics)), flush=True)
    raise RuntimeError("Speech QA failed for %s: model keeps omitting or mispronouncing words; "
                       "refusing to publish that take." % key)

def package(directory,events,outfile):
    audit=directory/"audition.wav"
    with wave.open(str(audit),"wb") as joined:
        fmt=None
        for i,event in enumerate(events):
            with wave.open(str(directory/event["file"]),"rb") as wav:
                props=(wav.getnchannels(),wav.getsampwidth(),wav.getframerate())
                if fmt is None:
                    fmt=props
                    joined.setnchannels(props[0]);joined.setsampwidth(props[1]);joined.setframerate(props[2])
                if props!=fmt or wav.getnframes()<1: raise RuntimeError("Invalid audio format for "+event["file"])
                while data:=wav.readframes(48000): joined.writeframesraw(data)
                if i+1<len(events):
                    joined.writeframesraw(b"\0"*int(props[2]*0.25)*props[0]*props[1])
    info={"schema":1,"source":"mrcalzon02/NUTBUSTER-R",
          "engine":"LuxTTS CPU","status":"UNREVIEWED","voiceSource":"owner-authorized",
          "playbackBoundaryProtection":{"leadMs":220,"tailMs":380,"fadeMs":6,
              "limitation":"Silence margins cannot reconstruct missing synthesized phonemes"},
          "cloudUploadPlaintext":False,"lineCount":len(events),
          "verification":{"method":"Whisper tiny ASR, first/last token check, duration gate",
              "passed":len(events),"allPassed":all(x.get("asrVerified") for x in events)},
          "clips":events,
          "audition":{"file":"audition.wav","sha256":sha(audit)}}
    (directory/"manifest.json").write_text(json.dumps(info,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    with zipfile.ZipFile(outfile,"w",compression=zipfile.ZIP_DEFLATED) as archive:
        for p in sorted(directory.rglob("*")):
            if p.is_file():archive.write(p,p.relative_to(directory).as_posix())
    return outfile

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
    events=[]
    for i,(key,text) in enumerate(texts.items(),1):
        print("Generating %d/%d %s"%(i,len(texts),key),flush=True)
        path, chosen, attempts = generate_verified_take(model, encoded, key, text, out)
        with wave.open(str(path),"rb") as wav:
            duration = wav.getnframes()/wav.getframerate()
        events.append({"key":key,"text":text,"file":path.name,
                       "sha256":sha(path),"bytes":path.stat().st_size,
                       "durationSeconds":round(duration,3),
                       "speechDurationSeconds":chosen["speechSeconds"],
                       "boundaryLeadMs":220,"boundaryTailMs":380,
                       "asrTranscript":chosen["heard"],
                       "asrMatchScore":chosen["matchScore"],
                       "asrVerified":True,
                       "synthesis":{k:chosen[k] for k in ("speed","numSteps","attempt")}})
    output=out.parent/"nutbuster-voice-review.zip"
    package(out,events,output)
    print("Synthesized %d clips; review ZIP ready for encryption"%len(events),flush=True)

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
