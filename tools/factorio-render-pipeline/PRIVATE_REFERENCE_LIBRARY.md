# Private official Factorio 3D reference library — executable Blender import

The September 2026 Wube release contains **15 sets, 65 individual models and
247 STL file variants**. Wube's officially published printable models are
valuable independent visual references, **not** the original in-game
production Blender meshes. Their printability modifications, tolerances,
multiple poses, separately exported parts, and sometimes invented unseen
surfaces must never become a source-of-truth for Factorio animation.

## Provenance and boundaries

- Canonical official catalogue: https://www.printables.com/@WubeSoftware/models
- Release/provenance: https://factorio.com/blog/post/fff-447
- Community example: https://github.com/lawlessc/factorio_base_model
  (factorio_basic.blend). It is a useful *independent* camera/light
  comparison, **not** Wube's source. No verified reuse license was present
  in that repository when audited.
- The user-supplied Factorio 2.0.77 thruster body sprite atlases, all
  **64 original frames at 264×542** each, remain the sole image authority
  for the R58–R62 reverse reconstruction. Source sprites/effects/overlays
  stay private and out of public Actions artifacts.
- Before downloading and using each model, check its own Printables
  license. Keep STL/3MF files, licensed community base scene, and imported
  .blend files outside public repositories, releases, mod packages, CI
  artifacts and generated websites. Do not claim STL geometry equals the
  original production game mesh.

## Preparing all 15 sets (private workstation only)

Place *original* STL files in set-specific directories under one private
root. All fifteen recognized directory names are:

    assembling-machine/     belt-items/          biter/
    biter-spawner/           chests/              electric-mining-drill/
    inserters/               player-character/    small-electric-pole/
    spitter/                 steel-furnace/       stone-furnace/
    transport-belts/         walls/               worm/

Each directory may contain multiple files and nested printer-variant
subdirectories. **Never** combine multipart components automatically.
A collection of 15 files is *not* equivalent to all 65 distinct models
or 247 STL variants. The importer's report lists exactly what is supplied
and fails if --require-all-15 is set with a missing set.

    python tools/factorio-render-pipeline/official_reference_library.py \
      --stl-root /private/wube-reference-stls --plan-only \
      --require-all-15 --report /private/wube-inventory.json

The prerequisite source .blend is the ACTUAL saved/reopened thruster model
from R58's verified workflow #40968758379, artifact
factorio-r56-r58-fin-visibility-and-editable-model,
physically-connected-fin-r58/source_connected_hanging_fins_r58.blend.
Use the newest verified replacement scene once promoted by a later workflow;
do not regress into an unsaved R49 or image-only stand-in.

    blender -b --factory-startup --python \
      tools/factorio-render-pipeline/official_reference_library.py -- \
      --source-blend /private/source_connected_hanging_fins_r58.blend \
      --stl-root /private/wube-reference-stls --require-all-15 \
      --community-blend /private/factorio_basic.blend \
      --out-blend /private/factorio_official_reference_library.blend \
      --report /private/wube-import-report.json

Omit --community-blend if you have not legitimately obtained that file.
The script does not fetch copyrighted artwork, pretend missing inputs were
present, or publish a scene. It preserves the original production
reconstruction scene and its camera as the default on reopening. It adds:

1. WUBE_OFFICIAL_UNASSEMBLED_STL: fifteen distinct collection slots,
   containing real editable imported meshes, one subcollection per supplied
   STL. The actual calibrated Factorio camera and lights are *copied* from
   the source scene, not replaced or modified.
2. COMMUNITY_BASE_UNVERIFIED (optional): original community objects
   appended into a completely separate scene; its non-authoritative camera
   and lights can be compared manually without modifying the original.
3. Mesh metadata: exact source-relative filename and SHA256, official set,
   explicit unknown STL-print-unit-to-tile scale, and an unassembled flag.
   The JSON report records completeness, missing sets and source rig.

## Direct source comparison: important missing calibration

An STL file is generally a **print part**, not an automatically assembled
machine, animation rig, sprite frame, or measured Factorio tile. Importing
one at Blender's original coordinate scale does **not** calibrate it.

Before overlaying any official reference with a game sprite or using it
to tune future Tech Priests structures, explicitly establish for each
selected comparison variant:

- Its original printed configuration and individual part/join placement;
  assembly must be justified by Wube docs or actual model inspection.
- Tile correspondence (e.g. one straight belt module, 3×3 assembler),
  source sprite frame/orientation, native STL mm-to-tile conversion, model
  pivot/rotation and source-frame registration.
- Fixed orthographic Factorio camera, fixed lighting, unchanged materials,
  matching render/canvas/zoom, no independently cropped frames.
- Source-sprite silhouette/error ROIs **and** real physical visibility:
  first-hit mesh rays, occluded/detached mounts, and 64-frame animated motion
  before promoting geometry. Do not trust a single global RGB score.

The R58 reconstruction, R59–R62 throat diagnostics, and the complex
sprite-to-geometry reverse engineering scripts are unaffected. In particular
the three asymmetric upper mountings, mechanically attached long hanging
fins, deep open annular throat, refractory shingles and independently cupped
lower covers remain separate editable constructs. **No printable-model
import alone is permission to change their geometry, camera or shaders.**

## Verification

Source-only tests:
    python -m unittest discover -s tools/factorio-render-pipeline \
      -p 'test_official_reference_library.py' -v

The workflow factorio-official-reference-library.yml retrieves the
verified saved R58 Blender file and uses only self-authored triangle fixture
STLs to prove real Blender 4.5 import, separate scenes, unchanged source
rig, saved editable meshes and reopened-file checks. It publishes JSON
metadata **only**, never private meshes or a .blend.

**Acceptance state:** pipeline code and synthetic/importer checks can pass
without the actual Wube catalogue. Actual official-geometry imports,
15-set asset completeness, community .blend inspection, per-machine
assembly, dimensional registration and production-source visual fidelity
remain **UNVERIFIED** until their real inputs and renders are inspected.
