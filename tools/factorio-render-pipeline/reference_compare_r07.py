#!/usr/bin/env python3
"""DEPRECATED R07 entry point: original Factorio sprite reference ONLY.

The legacy R07 script fetched a two-frame Factorio Wiki GIF. That is NOT
the user's original 64-frame 264x542 RGBA sprite and cannot support the
requested source-faithful Blender calibration. No network fallback exists.
This compatibility entry point delegates exact private atlas comparisons
to the already implemented R34 procedure.

Usage:
  python reference_compare_r07.py --source-atlases ORIGINAL_PAGE_1.png \
      ORIGINAL_PAGE_2.png --blender-cycle /private/frames \
      --output /private/comparison

Do not commit or upload original Wube sprites, private comparisons or
reference images to public GitHub artifacts. Diagnostic only.
"""
import argparse
from pathlib import Path

from source_vs_native_capture_r34 import (
    source_rgba_frames, candidate_frames, compare
)

def main(argv=None):
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-atlases",nargs=2,type=Path,required=True,
                   metavar=("ORIGINAL_PAGE_1","ORIGINAL_PAGE_2"))
    p.add_argument("--blender-cycle",type=Path,required=True)
    p.add_argument("--output",type=Path,required=True)
    args=p.parse_args(argv)
    if any(not path.is_file() for path in args.source_atlases):
        p.error("Original user-supplied 64-frame sprite pages missing. No online substitute.")
    original,kind,background=source_rgba_frames(args.source_atlases)
    if kind!="original_rgba_atlas" or background is not None or len(original)!=64:
        raise RuntimeError("Source is not the actual 64-frame RGBA atlas layout")
    candidate=candidate_frames(args.blender_cycle)
    results=compare(original,candidate,kind,background,args.output)
    print("R07_LEGACY_ENTRY_ORIGINAL_64_FRAME_SPRITE_ONLY",
          results["source_kind"],results["status"],flush=True)

if __name__=="__main__":
    main()
