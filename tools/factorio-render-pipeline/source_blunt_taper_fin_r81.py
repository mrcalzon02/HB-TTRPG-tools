"""R81: real source-guided BLUNT tapered free ends on existing upper fins.

The R80 real saved-scene experiment fixed the R48 reversal but source-frame
comparison of R80 0.22/0.11 exposed overly skinny distal tips. Retain broad
near-hinge shoulders AND the genuine original source's fuller blunt distal
cross-section; do not return to R48 widening downstream. This reuses R80's
real editable 3D formed fin deformation, not copy/pasted model geometry.
Original 64 source sprites remain private to local comparison.
"""
import argparse,sys
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent)
if ROOT not in sys.path:sys.path.insert(0,ROOT)
from real_source_correct_fin_taper_r80 import run

REVISION="R81_correct_taper_with_source_blunt_distal_heat_fin"
CANDIDATES=((.20,.13),(.20,.15),(.22,.13),(.22,.15))

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--source-blend",required=True,type=Path)
    p.add_argument("--out",required=True,type=Path)
    a=p.parse_args(sys.argv[sys.argv.index("--")+1:] if "--" in sys.argv else sys.argv[1:])
    run(a.source_blend,a.out,candidates=CANDIDATES,revision=REVISION,
        report_name="r81_real_blunt_taper_fin_candidates.json")
    print("R81_BLUNT_TIPS_REAL_EXISTING_3D_SOURCE_CAMERA_SAVED_REOPENED",flush=True)
if __name__=="__main__":main()
