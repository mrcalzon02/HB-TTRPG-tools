"""Reproduce source-based equipment assets and their visual review gallery.

Use Python with Pillow and --blender PATH_TO_BLENDER. This performs asset
exports and captures only; it never builds the game or runs a test suite.
"""
from pathlib import Path
import argparse,subprocess,sys

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--blender',required=True,type=Path)
    args=parser.parse_args();folder=Path(__file__).resolve().parent
    for name in ('rebuild_fixtures.py','rebuild_medical_occult.py','rebuild_field_electronics.py','rebuild_specialists.py','render_delivered_models.py'):
        subprocess.run([str(args.blender),'--background','--python-exit-code','1','--python',str(folder/name)],check=True)
    subprocess.run([sys.executable,str(folder/'finalize_rebuilt_catalog.py')],check=True)

if __name__=='__main__':main()
