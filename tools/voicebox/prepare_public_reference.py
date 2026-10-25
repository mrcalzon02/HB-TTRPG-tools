#!/usr/bin/env python3
"""Prepare a verified continuous voice reference from existing published NUTBUSTER announcer MP3s.

Use existing game files without changing the user's Windows installation.
"""
import argparse
import shutil
import sys
import tempfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
from nutbuster_batch import original_clips,montages,duration
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--nutbuster",type=Path,required=True)
    p.add_argument("--output",type=Path,required=True)
    args=p.parse_args()
    clips=original_clips(args.nutbuster)
    with tempfile.TemporaryDirectory(prefix="nutbuster-reference-") as tmp:
        reference=max(montages(clips,Path(tmp)),key=duration)
        if duration(reference)<5:raise RuntimeError("Voice reference under five seconds")
        args.output.parent.mkdir(parents=True,exist_ok=True)
        if args.output.exists():raise FileExistsError("Refusing to overwrite reference")
        shutil.copyfile(reference,args.output)
    print("Verified %d announcer originals; prepared %.2fs reference"%
          (len(clips),duration(args.output)),flush=True)
if __name__=="__main__":main()
