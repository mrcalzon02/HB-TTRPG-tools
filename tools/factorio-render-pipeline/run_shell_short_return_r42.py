"""Run targeted R42 candidate from actual R40 artifact, avoiding 64-frame rebuild."""
from pathlib import Path
import argparse,subprocess
import bootstrap
def main():
    p=argparse.ArgumentParser()
    p.add_argument("--artifact-root",type=Path,required=True)
    p.add_argument("--output",type=Path,required=True)
    args=p.parse_args()
    blender=bootstrap.find_blender()
    if not blender:raise RuntimeError("R42 requires pinned Blender environment")
    root=Path(__file__).resolve().parent
    blend=args.artifact_root.resolve()/"capture-output/test-04-vanilla-approx/scenes/test-04-vanilla-approx.blend"
    subprocess.run([str(blender),"-b","--factory-startup","-t","2","--python-exit-code","4",
                    "--python",str(root/"render_shell_short_return_r42.py"),
                    "--","--source",str(blend),"--output",str(args.output.resolve())],check=True)
if __name__=="__main__":main()
