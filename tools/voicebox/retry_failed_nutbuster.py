#!/usr/bin/env python3
"""Retry only failed cues from an existing GitHub QA artifact and keep approved WAVs."""
import argparse
import io
import json
import sys
import wave
import zipfile
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from remote_luxtts_nutbuster import (lines, sha, package, generate_verified_take,
                                    TakeRejected)

BASE_RUN=40175726895
BASE_COUNT=68
FAILED_COUNT=6

def restore_previous(archive, output, expected):
    """Fail closed if prior artifact, SHA-256 hashes or coverage are inconsistent."""
    if output.exists():
        raise FileExistsError("Must not overwrite any previous recordings")
    with zipfile.ZipFile(archive) as z:
        manifest=json.loads(z.read("manifest.json"))
        good=manifest.get("clips",[])
        bad=manifest.get("failedTakes",[])
        if (manifest.get("requestedLineCount") != len(expected) or
            manifest.get("verifiedCount") != BASE_COUNT or
            manifest.get("failedCount") != FAILED_COUNT or
            len(good) != BASE_COUNT or len(bad) != FAILED_COUNT):
            raise ValueError("Expected EXACTLY 68 approved and 6 failed cues in the base artifact")
        good_ids=[c["key"] for c in good]
        bad_ids=[c["key"] for c in bad]
        if len(set(good_ids+bad_ids)) != len(expected) or set(good_ids+bad_ids) != set(expected):
            raise ValueError("Previous report does not cover the 74 distinct expected cue IDs")
        for clip in good:
            cue=clip["key"]
            if clip.get("asrVerified") is not True or clip.get("text") != expected[cue]:
                raise ValueError("Unverified or mismatched previous cue: "+cue)
            if clip.get("file") != cue+".wav":
                raise ValueError("Unexpected WAV filename: "+cue)
        output.mkdir(parents=True,exist_ok=False)
        for clip in good:
            raw=z.read(clip["file"])
            target=output/clip["file"]
            target.write_bytes(raw)
            if sha(target)!=clip["sha256"] or target.stat().st_size!=clip["bytes"]:
                raise ValueError("SHA-256/size mismatch: "+clip["key"])
            with wave.open(str(target),"rb") as wav:
                if (wav.getnchannels(), wav.getsampwidth(), wav.getframerate())!=(1,2,48000):
                    raise ValueError("Unusable approved WAV: "+clip["key"])
    return {c["key"]:c for c in good},bad_ids

def retry(archive, repo, reference, output):
    expected=lines(repo,"all")
    approved,rejected=restore_previous(archive,output,expected)
    if not reference.is_file() or reference.stat().st_size<10000:
        raise ValueError("No usable owner reference")
    import torch
    from zipvoice.luxvoice import LuxTTS
    torch.set_num_threads(2)
    voice=LuxTTS("YatharthS/LuxTTS", device="cpu", threads=2)
    prompt=voice.encode_prompt(str(reference),rms=0.01)
    failures=[]
    for i,cue in enumerate(rejected,1):
        print("RETRY %d/%d: %s"%(i,len(rejected),cue),flush=True)
        try:
            file,chosen,attempts=generate_verified_take(voice,prompt,cue,expected[cue],
                                                        output,retry_round=3)
        except TakeRejected as error:
            failures.append({"key":cue,"expectedText":expected[cue],
                             "reason":"Still failed speech QA after independent retry",
                             "attemptCount":len(error.diagnostics),
                             "attempts":[{**a,"heard":a.get("heard","")[:160]}
                                         for a in error.diagnostics]})
            continue
        with wave.open(str(file),"rb") as wav:
            seconds=wav.getnframes()/wav.getframerate()
        approved[cue]={"key":cue,"text":expected[cue],"file":file.name,"sha256":sha(file),
                       "bytes":file.stat().st_size,"durationSeconds":round(seconds,3),
                       "speechDurationSeconds":chosen["speechSeconds"],
                       "boundaryLeadMs":220,"boundaryTailMs":380,"asrVerified":True,
                       "asrTranscript":chosen["heard"],"asrMatchScore":chosen["matchScore"],
                       "synthesis":{k:chosen[k] for k in ("speed","numSteps","attempt")},
                       "retryFromRun":BASE_RUN}
    ordered=[approved[k] for k in expected if k in approved]
    manifest=package(output,ordered,output.parent/"nutbuster-voice-review.zip",
                     failures=failures,requested=len(expected))
    manifest["resumedFromRun"]=BASE_RUN
    manifest["preservedOriginalVerifiedCount"]=BASE_COUNT
    manifest["retriedCueCount"]=len(rejected)
    manifest["recoveredThisRun"]=len(rejected)-len(failures)
    (output/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
    # Rewrite ZIP with updated recovery metadata.
    package_path=output.parent/"nutbuster-voice-review.zip"
    with zipfile.ZipFile(package_path,"w",compression=zipfile.ZIP_DEFLATED) as archive_file:
        for item in sorted(output.iterdir()):
            if item.is_file():archive_file.write(item,item.name)
    print("RETRY RESULT: restored 68 original WAVs, recovered %d of 6; still rejected %d" %
          (manifest["recoveredThisRun"],manifest["failedCount"]),flush=True)
    return manifest

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--base-archive",type=Path,required=True)
    p.add_argument("--nutbuster",type=Path,required=True)
    p.add_argument("--reference",type=Path,required=True)
    p.add_argument("--out",type=Path,required=True)
    a=p.parse_args()
    retry(a.base_archive,a.nutbuster,a.reference,a.out)
if __name__=="__main__":
    main()
