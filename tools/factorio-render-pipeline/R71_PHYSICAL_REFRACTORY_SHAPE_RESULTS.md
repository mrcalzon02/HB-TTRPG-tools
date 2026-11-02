# R71 — real formed refractory geometry, actual Blender result

**Source authority:** the user's original Factorio 2.0.77 thruster RGBA sprites, 64 native 264×542 frames, archive SHA256 `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`. No internet images, reconstructed sprites, or printed STLs are valid visual substitutes. The original source atlas pixels are unavailable in the current public Actions runner and were NOT used or published here.

## Physical-form problem and implementation

R66 contains 80 true 24-vertex thick and staggered `R19_NEAR_MOUTH_TILE_00..39` and `R19_MID_STAGGERED_TILE_00..39` refractory surfaces, but the nozzle still reads as a dark, mostly smooth opening. Previous R60/61 uniformly translated tiles radially, exposing/hiding faces without reproducing the visible **formed, stamped, overlapping lip shapes** described in the actual source observations.

`physical_stamped_refractory_candidate_r71.py` now deforms the **actual original interior bore-facing surface vertices 12–23** on all 80 R19 meshes, sculpting each plate's cross-sectional crown, subtly raised mouth lip and aft return. Unlike a whole-mesh translation, the ORIGINAL 12-vertex outer sheet surfaces and source profile remain untouched; physical inner-to-outer sheet thickness stays positive. The rest of the model, the original orthographic camera/lights, two cupped external guards, three distinct source-mounted upper castings, their fin roots and upper pressure-hull load paths, R11 open nozzle, and original 64-frame animation remain protected. No new scene objects, billboard planes, overlays, rings, guessed mechanical actuators or modified live Tech Priests game assets.

## Verified real headless Blender run

[Final corrected workflow #41378123612](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41378123612) **SUCCESS**, artifact **factorio-r71-3d-physically-formed-refractory-80-plates-editable-candidates**. The baseline saved R66 SHA remains `a1db423d69c1db0373eefc1b551966f15d6906f3e61dcce8d67f90753cc59547` unchanged. Both candidate Blender scenes were saved and **reopened** and actually rendered at the original native 264×542 camera for frames 1 and 33.

| Physical R19 inner face stamp amplitude (tiles) | Original R19 plate vertices moved | Minimum actual sheet thickness | True R19 first-hit rays (same native frame 1) | Result |
| --- | ---: | ---: | ---: | --- |
| 0 (R66) | 0 | .0210 | 441 = 334 near + 107 mid | Original reconstructed baseline |
| +.042 | 960 | .02352 | 460 = 352 near + 108 mid | Separate editable candidate |
| +.075 | 960 | .02550 | 473 = 364 near + 109 mid | Separate editable candidate |

The first R71 run encountered a genuine face orientation bug and failed (original R19 visible bore is vertices 12–23, not 0–11). This was corrected before the green run. A subsequent first-hit analysis found mismatched animation-frame contamination from an animated flame-layer mesh; the final verified run explicitly resets to frame 1 before **every** raycast. The actual R71 geometry and render validity were not compromised, and all final R19 source-camera hit counts are comparable.

The two saved editable model files in the final successful artifact:

- `source_refractory_form_042.blend`, SHA256 `3bd8053f52b381080d9491cda19ca76ffeaa405dbca656ce1186244b99b09964`.
- `source_refractory_form_075.blend`, SHA256 `e5aea187ab7b970791ba955913cf134905447b21f8c3fc3527beef1db0ed4aaa`.

## Crucial visual assessment and next steps

The real frame-1 native render comparisons show **subtle** contour/shading differences, not a definitive solution: the mouth still appears too smooth and dark compared with the historically described original. A rising first-hit statistic is NOT proof of correct form. Neither R71 candidate is accepted, and neither replaces R66 or any production sprite. Do not pursue additional blind geometry translation or motion percentages.

**Next priority:** recover the genuine original two RGBA atlas pages into a PRIVATE comparison workspace, use `source_3d_shape_correspondence_r70.py` to inspect original-versus-model physical **outlines, internal boundaries, overlaps, depth, fin profiles, unique mount shape and surface colors**, then modify the specific wrong 3D faces and rerender. Original source sprites and their private paired comparisons must never be uploaded into public GitHub artifacts.
