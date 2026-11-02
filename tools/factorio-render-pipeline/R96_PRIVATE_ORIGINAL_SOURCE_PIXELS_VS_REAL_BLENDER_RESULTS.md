# R96 — private ORIGINAL sprite comparison and R97 geometry decision

**Purpose:** recreate the actual Factorio thruster sprite's depicted 3D shapes in Blender, not a plausible new thruster. Visual/shape metrics are diagnostic only, never game build/release blockers.

## Provenance and reproducibility

- Private source recovered from the user's own Library `thruster.zip`. Verified SHA256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`, two original native body atlas pages, each with 32 frames.
- Authenticated frame **1** and frame **33** are cropped from each page's first original **264×542** cell. NO flames, light, pipes or unrelated internet photos are used as source 3D geometry.
- Actual Blender original-camera renders and editable .blend models: [R96 successful run #41501865571](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41501865571), artifact 13168399787 (`factorio-r96-original-asymmetric-forging-facets-source-geometry-candidates`). Actual Blender 4.5.15 LTS, 9 independent cases × 2 frames, 8 saved/reopened scenes.
- The underlying baseline is original selected R94 `panel_trim_025_rear_018.blend` SHA256 `221629095354e1c695e95b861c6630c1c9e55739f7fb1f04ea1e0277825bf252`. This is a working experiment, not accepted production CAD.
- Errors are 2-frame average per native pixel, normalized [0,1], mean absolute RGB after alpha-premultiplication against black. **Lower error is better**. This metric is NOT a geometric surface or visual-fidelity acceptance oracle.
- Proprietary source pixels and private comparison contact sheet remain OUT of public GitHub and CI artifacts.

## Measured authentic source vs R96 3D candidates

| Changed genuine 3D asymmetric casting pieces | Left (x27:90, y314:358) | Right (x166:220, y313:356) | Full hinge (x26:225, y298:420) | Three hanging fins (x40:225, y336:444) |
|---|---:|---:|---:|---:|
| **R94 baseline** | 0.1594246 | 0.1406946 | 0.1379965 | 0.1167961 |
| Port upper stepped | 0.1604502 | 0.1406941 | 0.1385562 | 0.1167940 |
| Port heel short physical facet | **0.1579617** | 0.1406946 | 0.1378204 | 0.1165850 |
| Port body lower cheek | 0.1632018 | 0.1406930 | 0.1384239 | 0.1168218 |
| Starboard upper stepped | 0.1594261 | 0.1384157 | 0.1374296 | 0.1168333 |
| Starboard body recessed facet | 0.1594254 | **0.1300973** | 0.1369722 | 0.1162134 |
| Starboard heel short | 0.1594248 | 0.1388603 | 0.1378025 | 0.1165603 |
| Both upper steps | 0.1604516 | 0.1384138 | 0.1379890 | 0.1168313 |
| **Port heel + starboard body recession** | **0.1579618** | **0.1300973** | **0.1367959** | **0.1160022** |

**R96 best:** combined real 3D left short-heel facet + right body recess. The original-source right mounting error improves ~7.53%, left mounting improves ~0.92%, and overall hinge improves ~0.87% vs selected R94. These numbers are actual comparisons against the source, not CI-invented figures. They cannot establish a globally accurate model.

**Reject as source-fit hypotheses:** R96 port upper and port body changes worsen source alignment. R95 stitched generic left/right strips previously made both worse; never promote them on successful topology validation alone.

## Source shape audit (most important)

A local side-by-side original frame 1 vs actual R94/R96 Blender renders exposes **large shape differences that the small local wins do not cure**:

1. The original lower object is an enormous, fully visible flared and individually fluted/shingled refractory funnel. The saved Blender renders still show a nearly black smooth round bell mouth, with much of the source's physical flared liner absent or occluded. This needs a source-directed **new 3D sectional/liner construction**, not painted darkness, hiding geometry or a new generic rocket ring.
2. The original left and right upper metal castings are unlike irregular pale/aged forged housings with staggered shoulders, distinct sidewalls, heel cuts and an offset wire on right. The Blender castings remain far too smooth and broadly overlapped; the right recess improves part of the image but not final topology or silhouette.
3. Original hanging fin ends are physically broad, heat-stained blue-purple and hover over the visible refractory shape. The current rendered heat fins and their mount/liner occlusions do not yet correspond faithfully. Do not reintroduce wrong outward widening of free tips or central too-long tabs.
4. The original central casting has two short locking ears; preserve R79 corrected geometry and actual fin roots while reconstructing side housings.

## Next geometry experiments

R97 deliberately tests **larger non-affine 3D sidewall profiles** from the correct R89/R94 source-traced contours, with separate port/heel and starboard/body/upper proposals and no generic mirrored part substitution. R97 must be saved/reopened and rendered, then privately compared against this same original archive and across BOTH frames before any further geometry is promoted. The original source stays private.

After that, prioritize real source-constrained section reconstruction of flared refractory liners and their occluding exterior bell. Preserve original animation, actual metal 3D connectivity, camera, untouched source art and rollback baseline. Cosmetic checks are *diagnostics*, not unrelated release blockers.
