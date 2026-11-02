# R77 — actual original Factorio fin hinge sprite comparisons (private pixels, numeric-only public report)

## Verified execution

- Initial [R77 run #41392488171](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41392488171) **failed** because the saved/reopened original Blender .blend assigned new transient in-memory material pointers; verification wrongly compared address identity across Blender file loads. Geometry had saved and rendered the first 65% candidate. Fixed pointer-dependent verification at [462a06b](https://github.com/mrcalzon02/HB-TTRPG-tools/commit/462a06b29fa77b13ae2deebac9b1fd7cdd5d0fe0).
- Corrected [R77 real Blender run #41400852917](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41400852917) **SUCCESS**. Artifact **13121820048** `factorio-r77-original-source-center-hinge-physical-candidates`. It saved and reopened both fully editable `.blend` candidates, rendered two true native images for each, and verified three independent original real 3D casting-to-fin contacts, every unchanged non-ear mesh, material physical data, fixed camera, and all 64 frames of original source-fin motion.
- Recovered the exact privately supplied original `thruster.zip` from user's Library, checked SHA256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`. Its original 264×542 RGBA body frames 1 and 33 were cropped from original `thruster-1.png` and `thruster-2.png` **in private workspace** and compared directly against R77 rendered candidates. **No private original art in this GitHub repository, workflow or artifacts**.

## Original center-root ear geometry results

R77 changes only the four free-end vertices of each of two existing real eight-vertex/6-face center locking ears. Both their original top four attached vertices and all other meshes are untouched; no extra hinge actuator, paint, body mask, rings, or invented parts. The exact *original sprite* remains the acceptance reference. Values are normalized to [0,1], premultiplied RGB mean absolute error (lower is better).

| Geometry variant, both ears same proportional length | Frame 1 ROI center ears and root (x96..163,y328..384) | Frame 33 same ROI | Frame 1 center cast bridge (x95..162,y311..338) | Frame 33 same |
| --- | ---: | ---: | ---: | ---: |
| Existing R71 +0.075 unedited | 0.1798664 | 0.1759849 | 0.2092760 | 0.2088510 |
| 65% original ear length | 0.1762160 | 0.1727790 | 0.2092945 | 0.2089416 |
| **45% original ear length** | **0.1751742** | **0.1715309** | **0.2061851** | **0.2060176** |

Other original mounting zones remain largely unchanged, as expected: source mismatches on the left/right two individual casting profiles and the overly smooth/bright center main casting are not fixed by changing these two tabs. Combined all-three-mount ROI x27..224,y300..395: frame1 **0.1722424→0.1713153**; frame33 **0.1794129→0.1785236**.

Real saved/reopened R77 candidates:
- `hinge_ear_065.blend` SHA256 `c975abab4ce90e89acda96a443d64513b713a90dedf37a8ba948b165cf235130`
- `hinge_ear_045.blend` SHA256 `bc6ff4a0e5e53889987dc7d12d934b2e274a6a235b63d3d6109cf8daf36bb4d0`

**Interpretation:** 45% of original tab lengths makes a genuine two-frame source-pixel improvement over the existing U-shaped protrusion, but both model variants remain unapproved for full source fidelity; the source actually has asymmetric, smaller cream metal attachment shoes, and mismatched gray materials persist. Preserve the original scenes; retain the actual .blend candidates as controlled experiments. Do not claim the Blender green test alone validates source-accurate geometry.

**Next:** test separately shortened left/right original center tab ends and compare source-specific ROI in frames 1 and 33; then address original-specific shapes of three large upper cream load-bearing castings. Never invent hidden pivot actuation where the 64-frame original artwork does not demonstrate it. Art/fidelity checks are diagnostic, not release-blocking.
