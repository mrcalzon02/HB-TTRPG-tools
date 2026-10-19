#!/usr/bin/env python3
"""Inventory and curate CC0 NOX Sound Essentials without unpacking its 988 MB source.

Usage:
  python development/import_nox_foley.py --scan /path/to/Essentials_Series_NOX_SOUND.zip
  python development/import_nox_foley.py --build /path/to/Essentials_Series_NOX_SOUND.zip \
       --mapping development/nox-selections.tsv

The mapping is deliberately reviewed, never filled from mere filename similarity.
Track the original archive in Google Drive. Only tiny curated, CC0 per-event WAVs
are copied into assets/runtime/sfx for packaged Java 17 playback.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import io
import pathlib
import re
import subprocess
import sys
import zipfile

KNOWN={
    "STEP","FOOTFALL","DOOR","SWITCH","BREAKER","VAN_DOOR",
    "UI_CLICK","UI_BACK","PICKUP","SELECT","DEVICE_ON","DEVICE_OFF",
    "SCANNER","CAMERA","BOOK","POTION","IMPACT"
}
CLUES={
    "STEP":("footstep","footsteps","tile","wood","gravel","metal"),
    "FOOTFALL":("footstep","footsteps"),
    "VAN_DOOR":("trunk","van","vehicle","car door"),
    "DOOR":("door",),
    "SWITCH":("button","click","switch"),
    "BREAKER":("electric","switch","relay"),
    "UI_CLICK":("button","keyboard","click"),
    "UI_BACK":("button","click"),
    "PICKUP":("cloth","key","handling"),
    "SELECT":("button","key","click"),
    "DEVICE_ON":("router","neon","electric","laptop"),
    "DEVICE_OFF":("router","electric","switch"),
    "SCANNER":("electromagnetic","electric","neon"),
    "CAMERA":("camera","shutter","button"),
    "BOOK":("paper","book"),
    "POTION":("water","liquid"),
    "IMPACT":("hit","impact","pain"),
}
MAX_BYTES=32*1024*1024

def scan(archive: pathlib.Path):
    with zipfile.ZipFile(archive) as z:
        files=[f for f in z.infolist() if not f.is_dir() and f.filename.lower().endswith((".wav",".aiff",".aif",".flac",".ogg"))]
        print(f"Archive: {archive.name}; candidate audio files: {len(files)}",file=sys.stderr)
        wr=csv.writer(sys.stdout,delimiter="\t")
        wr.writerow(["suggested_cue","archive_member","uncompressed_bytes"])
        for entry in files:
            lower=entry.filename.lower().replace("_"," ").replace("-"," ")
            guesses=[cue for cue,words in CLUES.items() if any(w in lower for w in words)]
            wr.writerow([",".join(guesses),entry.filename,entry.file_size])

def build(archive:pathlib.Path,mapping:pathlib.Path,out:pathlib.Path):
    out.mkdir(parents=True,exist_ok=True)
    if not mapping.is_file():raise SystemExit(f"Missing reviewed selection file {mapping}")
    with mapping.open(newline="",encoding="utf-8-sig") as src:
        selected=list(csv.DictReader(src,delimiter="\t"))
    if not selected:raise SystemExit("Mapping has no approved sound entries")
    seen=set()
    with zipfile.ZipFile(archive) as z:
        names=set(z.namelist())
        provenance=[]
        for row in selected:
            cue=row.get("cue","").strip().upper()
            member=row.get("archive_member","").strip()
            if cue not in KNOWN or cue in seen:raise SystemExit(f"Unsupported/duplicate cue: {cue}")
            if member not in names:raise SystemExit(f"Source member not found: {member}")
            data=z.getinfo(member)
            if data.file_size<=0 or data.file_size>MAX_BYTES:raise SystemExit(f"Source clip invalid/too large: {member}")
            # Do not rely on extraction paths, allowlist every selected filename.
            raw=z.read(member)
            dest=out/(cue.lower()+".wav")
            command=["ffmpeg","-hide_banner","-loglevel","error","-nostdin",
                     "-i","pipe:0","-t","3.8","-af","highpass=f=45",
                     "-ar","16000","-ac","2","-c:a","pcm_s16le","-f","wav","-y",str(dest)]
            result=subprocess.run(command,input=raw,stdout=subprocess.PIPE,stderr=subprocess.PIPE,check=False)
            if result.returncode or not dest.is_file() or dest.stat().st_size<=44:
                dest.unlink(missing_ok=True)
                raise SystemExit(f"ffmpeg failed converting {member}: {result.stderr.decode(errors='replace')}")
            provenance.append((cue,member,hashlib.sha256(raw).hexdigest(),dest.name))
            print(f"Created {dest.name} ({dest.stat().st_size:,} bytes)",file=sys.stderr)
            seen.add(cue)
    with (out/"PROVENANCE.tsv").open("w",newline="",encoding="utf-8") as file:
        wr=csv.writer(file,delimiter="\t")
        wr.writerow(["cue","NOX_archive_member","source_sha256","export_wav"])
        wr.writerows(provenance)
    print(f"Imported {len(provenance)} unique reviewed CC0 cues. No complete NOX archive was copied.")

def main():
    arg=argparse.ArgumentParser(description=__doc__)
    mode=arg.add_mutually_exclusive_group(required=True)
    mode.add_argument("--scan",type=pathlib.Path,metavar="NOX_ZIP")
    mode.add_argument("--build",type=pathlib.Path,metavar="NOX_ZIP")
    arg.add_argument("--mapping",type=pathlib.Path,default=pathlib.Path("development/nox-selections.tsv"))
    arg.add_argument("--out",type=pathlib.Path,default=pathlib.Path("assets/runtime/sfx"))
    opts=arg.parse_args()
    if opts.scan:scan(opts.scan)
    else:build(opts.build,opts.mapping,opts.out)
if __name__=="__main__":main()
