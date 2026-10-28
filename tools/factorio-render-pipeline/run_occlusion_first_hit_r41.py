"""Run standalone R41 diagnostic from specific VERIFIED R40 artifact only."""
import argparse
from pathlib import Path
import subprocess
import bootstrap
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--artifact-root",type=Path,required=True)
    p.add_argument("--output",type=Path,required=True)
    args=p.parse_args()
    blender=bootstrap.find_blender()
    if not blender:raise RuntimeError("Missing pinned Blender 4.5.15 workstation")
    source=args.artifact_root.resolve()/"capture-output"/"test-04-vanilla-approx"/"scenes"/"test-04-vanilla-approx.blend"
    if not source.is_file():raise RuntimeError("R40 verified editable Blender file was not downloaded")
    out=args.output.resolve()
    out.mkdir(parents=True,exist_ok=True)
    root=Path(__file__).resolve().parent
    subprocess.run([str(blender),"-b","--factory-startup","-t","2",
                    "--python-exit-code","4","--python",
                    str(root/"occlusion_first_hit_r41.py"),"--","--source",
                    str(source),"--output",str(out)],check=True)
if __name__=="__main__":main()
