#!/usr/bin/env python3
"""Prepare user-supplied PS1 horror stings for Java 17 (no runtime MP3/ZIP decoder).

The source pack has NO embedded redistribution license. --preview produces
local-only test assets outside shipped runtime; --release explicitly requires
--rights-confirmed and is NEVER run automatically by Beckenburg builds.

From the owner's identification: #1 = buildup, #5 = locked door being pulled
without opening, #2-4 and #6-20 = eighteen generic stings in three six-clip variant banks.
"""
from __future__ import annotations
import argparse
import csv
import hashlib
import pathlib
import re
import subprocess
import zipfile

ASSIGNMENTS = {
    "tension_build": 1,
    "locked_door_rattle": 5,
    # These eighteen are all generic; none may be substituted for physical Foley.
    "horror_sting_a_0": 2,  "horror_sting_a_1": 6,
    "horror_sting_a_2": 9,  "horror_sting_a_3": 12,
    "horror_sting_a_4": 15, "horror_sting_a_5": 18,
    "horror_sting_b_0": 3,  "horror_sting_b_1": 7,
    "horror_sting_b_2": 10, "horror_sting_b_3": 13,
    "horror_sting_b_4": 16, "horror_sting_b_5": 19,
    "horror_sting_c_0": 4,  "horror_sting_c_1": 8,
    "horror_sting_c_2": 11, "horror_sting_c_3": 14,
    "horror_sting_c_4": 17, "horror_sting_c_5": 20,
}
ENTRY_RE = re.compile(r"PS1_Horror_SFX\s*\((\d+)\)\.wav", re.IGNORECASE)
MAX_SOURCE_BYTES = 25 * 1024 * 1024

def members(archive: pathlib.Path) -> dict[int,str]:
    with zipfile.ZipFile(archive) as z:
        if z.testzip() is not None:
            raise ValueError("Source ZIP CRC verification failed")
        resolved = {}
        for info in z.infolist():
            name = info.filename
            m = ENTRY_RE.fullmatch(name)
            if m is None:
                raise ValueError("Unexpected/unsafe ZIP member " + name)
            number = int(m.group(1))
            if number in resolved or number not in range(1,21) or info.file_size > MAX_SOURCE_BYTES:
                raise ValueError("Invalid numbered recording " + name)
            resolved[number] = name
        if set(resolved) != set(range(1,21)):
            raise ValueError("Expected all 20 numbered recordings")
        return resolved

def prepare(archive: pathlib.Path, out: pathlib.Path, release: bool, confirmed: bool) -> None:
    if release != confirmed:
        raise ValueError("Public runtime export needs BOTH --release and --rights-confirmed")
    if not release and "assets/runtime/sfx" in out.as_posix():
        raise ValueError("Preview clips cannot be placed into shipped runtime assets")
    found = members(archive)
    out.mkdir(parents=True,exist_ok=True)
    rows = []
    with zipfile.ZipFile(archive) as z:
        for cue,number in ASSIGNMENTS.items():
            member = found[number]
            source = z.read(member)
            dest = out / (cue+".wav")
            args = [
                "ffmpeg","-nostdin","-hide_banner","-loglevel","error",
                "-f","wav","-i","pipe:0","-t","3.7",
                "-af","highpass=f=40,alimiter=limit=0.82,afade=t=in:st=0:d=0.025,afade=t=out:st=3.25:d=0.4",
                "-ar","16000","-ac","2","-c:a","pcm_s16le","-y",str(dest)
            ]
            done = subprocess.run(args,input=source,capture_output=True,check=False)
            if done.returncode or not dest.is_file() or dest.stat().st_size<=44:
                dest.unlink(missing_ok=True)
                raise RuntimeError("Conversion failed for "+member+": "+done.stderr.decode(errors="replace"))
            if dest.stat().st_size > 4 * 16000 * 4 + 256:
                raise RuntimeError("Effect longer than approved four-second audio budget")
            rows.append([cue,number,member,hashlib.sha256(source).hexdigest(),
                         dest.name,hashlib.sha256(dest.read_bytes()).hexdigest()])
            print(f"{cue}: #{number} -> {dest.name} ({dest.stat().st_size:,} bytes)")
    with (out/"PROVENANCE.tsv").open("w",encoding="utf8",newline="") as file:
        writer=csv.writer(file,delimiter="\t")
        writer.writerow(["cue","number","archive_member","original_sha256","export_name","export_sha256"])
        writer.writerows(rows)
    if not release:
        (out/"PREVIEW_ONLY.txt").write_text(
            "PRIVATE PREVIEW. Do not publish/redistribute derived clips until permission is verified.\n",
            encoding="utf8")

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument("archive",type=pathlib.Path)
    ap.add_argument("--scan",action="store_true",help="list source classification; no audio export")
    ap.add_argument("--out",type=pathlib.Path,default=pathlib.Path("build/ps1-sfx-preview"))
    ap.add_argument("--release",action="store_true")
    ap.add_argument("--rights-confirmed",action="store_true")
    options=ap.parse_args()
    if options.scan:
        found=members(options.archive)
        for number,member in sorted(found.items()):
            cue=next((cue for cue,n in ASSIGNMENTS.items() if n==number),"UNASSIGNED_HORROR_STING")
            print(f"{number:02d}\t{cue}\t{member}")
    else:prepare(options.archive,options.out,options.release,options.rights_confirmed)

if __name__ == "__main__":
    main()
