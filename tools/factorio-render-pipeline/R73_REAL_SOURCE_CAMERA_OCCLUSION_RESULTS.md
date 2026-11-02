# R73 — actual native-camera mesh occlusion, saved/reopened R66 vs R71

**Verified real Blender 4.5 LTS workflow:** [#41384386345](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41384386345) **SUCCESS**. This is a geometry **diagnostic**, not a Factorio release gate or an artistic acceptance. The workflow downloaded the authoritative already-saved R66 scene and two actual R71 .blend candidates, raycast the same 264×542 orthographic source camera at frame 1, and wrote model-only false-color first-hit maps and a JSON mesh census. No proprietary original sprite pixels were available, published, or replaced with internet assets. All three source .blend hashes were unchanged.

The measured fixed native ROI is x=48..217, y=395..511, exactly **170 × 117 = 19,890 pixel rays** per model. Full per-object and 16-row breakdowns are in workflow artifact `factorio-r73-model-only-native-mesh-occlusion-maps`.

| First-hit actual 3D surface | Unmodified R66 | R71 +.042 | R71 +.075 |
| --- | ---: | ---: | ---: |
| R19 near-mouth plates | 5,603 | 5,963 | 6,181 |
| R19 middle staggered plates | 1,757 | 1,801 | 1,836 |
| **R19 combined** | **7,360** | **7,764** | **8,017** |
| R11 open refractory liner | 4,828 | 4,615 | 4,481 |
| R11 recessed baffles 00/01 | 2,579 | 2,522 | 2,519 |
| Existing suspended vanes | 2,338 | 2,338 | 2,338 |
| Original rolled lip | 759 | 759 | 759 |
| Other original geometry | 1,830 | 1,696 | 1,580 |
| No mesh hit | 196 | 196 | 196 |

**Measured finding:** +.075 reveals **657 additional R19 first-hit pixels** versus R66 (about **3.30 percentage points of the ROI**, or **8.93% relative** to the initial 7,360 R19 hits). Of those, **347 previously struck R11 liner**, **60 previously struck R11 baffles**, and **250 previously struck other geometry**. There are **856 individual mesh-ID changes** total, including 199 switches between different near-mouth plates. This is a real and physically local 3D effect, not a silhouette or animation metric.

However, even after the +.075 treatment, the R11 open liner and its two recessed baffles together remain **7,000 of 19,890 first hits (35.19%)**. The source-camera actual Blender render still reads as dark and relatively smooth; the 3D part-ID map shows separate near/mid plates but does **not** show that the rendered plate-to-plate junctions look like the original bitmap. Thus the extra first hits **DO NOT** warrant promoting either R71 candidate to accepted art.

## Next **physical** revision (must use user's ORIGINAL source)

1. Open the actual private source `thruster.zip` (SHA256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`) alongside the native R71 candidate and R73 model-derived mesh-ID maps. Do not use unofficial or substitute art.
2. Align the original's actual staggered scale lip/crease positions with the measured mesh groups and the R70/R72 internal edge diagnostics, *not* with the global alpha silhouette alone. Separate real polygon occlusion from pigment and low-contrast lighting.
3. If the source requires it, adjust only the specifically offending **existing** physical R19 plate surface edges/overlaps, or **existing** R11 liner/baffle surface relief. Do not indiscriminately widen, hide, delete, or displace the R11 ring; the actual original shows annular throat structures. Do not fabricate new rings, actuators, hidden parts or 2D source-pixel overlays.
4. Preserve the source-calibrated camera/light, open nozzle, fixed cast fin mounts above—not attached to—the annular band, two cupped outer shell undersides, and original 64-frame fin motion. Correct any remaining nine-versus-ten inner-fin discrepancy **only after actual original-image verification**.
5. Verify save/reopen, visible native renders and **private original-source** appearance correspondence before accepting any new physical candidate. The release itself must not be blocked on visual style.

The first-hit category PNGs are **artificial diagnostic colors** derived from our own Blender reconstruction; they are neither source images nor alternative visual references. No production sprites or model scenes were changed by R73.
