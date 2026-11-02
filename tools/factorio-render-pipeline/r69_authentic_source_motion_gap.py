"""R69: quantify REAL R66 64-frame silhouette motion shortfall.

Reference numbers ONLY from earlier authenticated private original Factorio
2.0.77 thruster atlas analysis, documented in SOURCE_REGISTRATION_R34.md.
No source sprite pixels are bundled, obtained from the web, or invented.

Compare the actual R67 264x542 reconstructed candidate 64-frame animation
with previously measured real original-source alpha-change bands. This is
motion DIAGNOSTICS ONLY, not a replacement for original frame-by-frame
source comparison and not an art approval/release-blocking threshold.
"""
import argparse
from hashlib import sha256
import json
from pathlib import Path

from PIL import Image
from source_vs_native_capture_r34 import (
    FRAMES,SIZE,alpha_masks,change_counts,motion_map,spatial_motion_activity
)

ORIGINAL_ATLAS_ARCHIVE_SHA="0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791"
# From SOURCE_REGISTRATION_R34.md: exact original 64-frame alpha threshold
# measured with genuine original archive, NOT Internet reference art.
ORIGINAL_CHANGED_TRANSITIONS_TOTAL=31334
ORIGINAL_UNIQUE_CHANGED_PIXELS=4496
ORIGINAL_BANDS={
    "upper_machine":6,
    "attachment_roots":0,
    "bell_throat_and_side_guards":9484,
    "lower_lips_and_guard_tips":21844,
}
R67_SHA="a1db423d69c1db0373eefc1b551966f15d6906f3e61dcce8d67f90753cc59547"

def analyze(directory,output):
    directory=Path(directory).resolve()
    output=Path(output).resolve()
    r67=json.loads((directory/"r67-native-cycle-report.json").read_text(encoding="utf-8"))
    if (r67["frame_count_verified"]!=FRAMES or
        r67["native_cell"]!=list(SIZE) or
        r67["blender_model_sha256"]!=R67_SHA or
        r67["source_sprite_visual_fidelity_approved"] is not False or
        r67["source_sprite_private_bytes_in_artifacts"] is not False):
        raise RuntimeError("R69 requires verified original R67 real R66 candidate frames")
    model=[]
    try:
        for i in range(FRAMES):
            name="body-%02d.png"%i
            path=directory/name
            if not path.is_file():
                raise RuntimeError("R69 missing true saved R66 rendered frame "+name)
            with Image.open(path) as src:
                if src.size!=SIZE or src.mode!="RGBA":
                    raise RuntimeError("R69 expected exact original native 264x542 RGBA body frame")
                src.load()
                expected=r67["cells"][i]
                if expected["source_index"]!=i or sha256(src.tobytes()).hexdigest()!=expected["pixel_sha256"]:
                    raise RuntimeError("R69 cannot use changed or reordered rendered frames")
                model.append(src.copy())
        masks=alpha_masks(model)
        changes=change_counts(masks)
        counts=motion_map(masks)
        bands=spatial_motion_activity(counts)
        observed_total=sum(changes)
        unique=sum(1 for x in counts if x>0)
        if observed_total==0 or unique==0:
            raise RuntimeError("R69 full source-indexed candidate animation is frozen")
        if sum(bands.values())!=observed_total:
            raise RuntimeError("R69 spatial motion pixel accounting is inconsistent")
        original_mean=ORIGINAL_CHANGED_TRANSITIONS_TOTAL/FRAMES
        model_mean=observed_total/FRAMES
        report={
            "revision":"R69_actual_64frame_candidate_alpha_motion_vs_measured_original",
            "status":"DIAGNOSTIC_ONLY_ORIGINAL_SOURCE_PIXEL_COMPARISON_STILL_PENDING",
            "authentic_original_sprite_archive_sha256":ORIGINAL_ATLAS_ARCHIVE_SHA,
            "reference_provenance":"SOURCE_REGISTRATION_R34.md, genuine private original RGBA atlas analysis",
            "original_sprite_pixels_loaded":False,
            "third_party_internet_reference_used":False,
            "source_64_frame_alpha_threshold":128,
            "candidate_real_R66_blender_model_sha256":R67_SHA,
            "candidate_full_cycle_indexed":True,
            "total_frames":FRAMES,
            "native_cell":list(SIZE),
            "original_64_transition_changed_pixel_total":ORIGINAL_CHANGED_TRANSITIONS_TOTAL,
            "original_average_changed_alpha_pixels_per_transition":round(original_mean,3),
            "original_unique_pixels_with_any_alpha_motion":ORIGINAL_UNIQUE_CHANGED_PIXELS,
            "original_changed_pixel_counts_by_vertical_band":ORIGINAL_BANDS,
            "candidate_64_transition_changed_pixel_total":observed_total,
            "candidate_average_changed_alpha_pixels_per_transition":round(model_mean,3),
            "candidate_unique_pixels_with_any_alpha_motion":unique,
            "candidate_changed_pixel_counts_by_vertical_band":bands,
            "candidate_to_historical_source_total_motion_ratio":round(observed_total/ORIGINAL_CHANGED_TRANSITIONS_TOTAL,5),
            "candidate_to_historical_source_unique_area_ratio":round(unique/ORIGINAL_UNIQUE_CHANGED_PIXELS,5),
            "candidate_to_source_by_band":{
                k:round(bands[k]/v,5) if v else None
                for k,v in ORIGINAL_BANDS.items()},
            "missing_source_motion_by_band":{
                k:max(0,v-bands[k]) for k,v in ORIGINAL_BANDS.items()},
            "actual_candidate_changed_pixels_by_frame_transition":changes,
            "no_unverified_new_actuators_or_model_mutations":True,
            "visual_art_acceptance":False,
            "game_release_blocked_by_art_diagnostics":False
        }
        output.parent.mkdir(parents=True,exist_ok=True)
        output.write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
        print("R69_AUTHENTIC_SPRITE_MEASURED_MOTION_VS_R66_REAL_64",
              "original",ORIGINAL_CHANGED_TRANSITIONS_TOTAL,
              "R66",observed_total,
              "ratios",report["candidate_to_source_by_band"],flush=True)
        return report
    finally:
        for im in model:im.close()

def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--candidate-cycle",required=True,type=Path)
    p.add_argument("--report",required=True,type=Path)
    args=p.parse_args()
    analyze(args.candidate_cycle,args.report)

if __name__=="__main__":
    main()
