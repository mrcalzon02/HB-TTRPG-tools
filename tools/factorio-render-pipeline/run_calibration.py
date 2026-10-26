"""Launch real Blender calibration captures using installed unified environment."""
import argparse
import json
from pathlib import Path
import subprocess
import sys

import bootstrap

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--output",type=Path,required=True)
    ap.add_argument("--group",choices=("calibration","models","all"),default="all")
    args=ap.parse_args()
    root=Path(__file__).resolve().parent
    blender=bootstrap.find_blender()
    if not blender:
        raise SystemExit("Missing Blender: run bootstrap.py install first")
    print("BLENDER",bootstrap.check_blender(blender),flush=True)
    python=bootstrap.check_python_env()
    target=args.output.resolve()
    target.mkdir(parents=True,exist_ok=True)
    subprocess.run([str(blender),"-b","--factory-startup","-t","2","--python-exit-code","4","--python",
                    str(root/"scene_capture_batch.py"),"--","--output",
                    str(target),"--group",args.group],check=True)
    subprocess.run([str(blender),"-b","--factory-startup","-t","2","--python-exit-code","4","--python",
                    str(root/"scene_verify.py"),"--","--output",str(target)],check=True)
    scene_evidence=target/"editable-scene-qa.json"
    if not scene_evidence.is_file():
        raise RuntimeError("Blender scene verifier returned but saved no evidence")
    subprocess.run([str(python),str(root/"capture_analysis.py"),"--root",str(target),
                    "--fail-on-edge"],check=True)
    benchmark=target/"test-04-vanilla-approx"
    if benchmark.is_dir():
        subprocess.run([str(blender),"-b","--factory-startup","-t","2",
                        "--python-exit-code","4","--python",
                        str(root/"camera_sweep_r09.py"),"--","--output",str(target)],check=True)
        subprocess.run([str(python),str(root/"camera_sweep_report_r09.py"),
                        "--output",str(target)],check=True)
        # Optional, non-score visual comparison against the official wiki GIF.
        # Network/reference failure creates an unavailable status, not a false
        # pixel-similarity pass. No reference image is added to the repository.
        subprocess.run([str(python),str(root/"reference_compare_r07.py"),
                        "--candidate",str(benchmark)],check=True)
    print("Capture batch complete at",target,flush=True)

if __name__=="__main__":main()
