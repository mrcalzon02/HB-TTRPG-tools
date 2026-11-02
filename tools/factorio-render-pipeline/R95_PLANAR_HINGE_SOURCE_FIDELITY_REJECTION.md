# R95 — actual 3D stitched upper hinge plane test: mechanically valid, source-fidelity REJECTED

The user suggested forming the object from planar sheets, merging them into connected 3D shapes. **This is a 3D modeling method, not permission to invent a generic hinge.** The exact original Factorio sprite remains the specification.

[Real Blender 4.5 LTS workflow #41495133996](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41495133996) **SUCCESS**. Starting from the selected R94 R92-based true native camera scene `panel_trim_025_rear_018.blend` (SHA256 `221629095354e1c695e95b861c6630c1c9e55739f7fb1f04ea1e0277825bf252`), R95 modeled each unlike left/right mounting from independently traced original native-pixel planar strips. Those were joined into genuine manifold finite-thickness surfaces with raised formed metal ridges and *two integrated physically stitched branches reaching original R49 casting load anchors*; no disconnected sprites/cards/paint. All original R08 shroud, pressure roll, 64-frame fin animation, R49 hinge contacts, R94 refractory/bell surfaces, camera/materials and all noncandidate geometry preserved. Seven candidates were rendered at actual original-camera 264×542 frames 1 and 33. Six source-plane scene variants were saved and reopened as editable .blend files, with real physical mesh topology reverified. Artifact id **13165448331** `factorio-r95-original-source-stitched-left-and-right-real-hinge-planes`.

**Source correctness test:** Private-only original user Wube `thruster.zip`, checksum `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`, source frames 1 and 33. Two-frame average normalized alpha-premultiplied RGB MAE (lower = closer). No source pixels in GitHub or public CI artifacts.

| True 3D hinged casting profile | Port/left ROI x27–90,y314–358 | Starboard/right ROI x166–220,y313–356 | Full hinge ROI x26–225,y298–420 |
| --- | ---: | ---: | ---: |
| **R94 baseline, real R89 source-fitted three-layer each-side castings** | **0.159425** | 0.140695 | **0.137996** |
| Rebuild only left as one continuous stitched planar strip | 0.170429 | 0.140698 | 0.140005 |
| Rebuild only right as one continuous stitched planar strip | 0.159423 | 0.154134 | 0.139235 |
| Both continuous planar strips | 0.170427 | 0.154135 | 0.141244 |
| Both 9% narrower strips | 0.170932 | 0.150965 | 0.140831 |
| Both moved three source pixels up | 0.171771 | 0.150504 | 0.140879 |
| Both with more real 3D center ridge relief | 0.174246 | 0.140004 | 0.139253 |

**VISUAL REJECTION:** Every full-hinge R95 candidate makes original-source error WORSE than R94. R95's broadly swept strips form attractive but generic silver arc shapes. The original has **nonidentical irregular forged housings, staggered layered shoulders, asymmetric stepped metal heel, recessed dark cutouts and separate short locking tabs**. A single bent continuous strip on each side is still the wrong source geometry, regardless of being a good manifold 3D mesh. No R95 candidate is promoted to working or production.

**Next original-source-guided use of planar building:** Keep the source-closer three layered R89/R92 cast silhouettes and R94 bell. Do NOT make generic hinge ribbons. Instead split each **actual original observed forging** into several small **source-mapped planar patches**, stitch each contour/edge into a joined 3D surface with discrete angled facets, beveled/punched details, real underlying depth layers, and real hull/fin anchors. The shape of each planar patch should come from a corresponding authentic source image boundary and be compared against original across frames, not inferred from functional expectations.

**Release rule:** Art/visual metrics are purely diagnostic and never block unrelated actual functional game builds.
