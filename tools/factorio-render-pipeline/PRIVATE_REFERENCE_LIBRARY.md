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


## Real public Wube samples: verified execution 2026-10-29

The new optional private acquisition tool **private_wube_acquire.py** obtains
one documented, original public STL per official set. It searches the
publisher's public Printables listing, requires an exact WubeSoftware owner
and model-title match, checks each model's reported license and published
file size, requests the public STL download link (no login bypass), and
records original model/file IDs, sample count, hashes, and STL geometry
statistics. It refuses unknown download hosts, large inputs and errors.

Use on a **private, non-redistributing workstation**:

    python tools/factorio-render-pipeline/private_wube_acquire.py \
      --root /private/wube-reference-stls \
      --report /private/wube-original-sample-provenance.json

Then pass that STL root to official_reference_library.py and your own saved
R58 reconstruction .blend as described above. Its output is a **separate
private working .blend**, never a redistributed package. This script's
15 genuine samples cover all 15 official *sets* but are **NOT** the 65
individual models or 247 STL variants. Those remain for per-model
download/assembly and stage-by-stage calibration if needed.

**Real validation:** GitHub Actions
https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40983585774
(success) downloaded 15 original Wube-published STL samples in a temporary
runner, verified their file contents/geometry, imported all fifteen into
the authentic saved R58 thruster reconstruction using Blender 4.5.15 LTS,
saved a private reference .blend, reopened it, verified 15 real editable
STL mesh objects and independent source camera, and compared the imported
file hashes to the download manifest. Only the metadata JSON was uploaded
as a CI artifact; STL bytes and the merged .blend remain private/ephemeral
and are not available to the public via this workflow.

**Sampling caveat:** Each downloaded STL is the largest individually
eligible print variant (max 48 MiB) from its corresponding official set.
It may depict a particular component, pose or print part rather than
the ideal source-frame assembly for the machine. Sampled meshes do not
prove printable-to-original sprite ratio, production camera, lighting,
animation or industrial design correctness. The community base and Wube
models are independent comparator evidence, not replacements for source
images. Continue the R58–R62 source-directed geometry calibration.

**Render environment diagnostics:** reference_rig_diagnostics.py compares
the actual imported community camera/light objects with the unchanged
reconstructed camera and lamp rig, publishing metadata differences only.
It MUST NOT retune production parameters just because the community example
differs. Use source sprite evidence for any subsequent physical geometry or
lighting changes.


### Verified camera and lighting isolation against the community scene

[Real Blender 4.5.15 test #40985016585](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40985016585)
passed all gates: reopened R58 thruster scene; appended the authentic pinned
factorio_basic.blend from the community author; verified 15 fixture collection
slots; independently captured original and copied camera/light metadata;
confirmed exact unchanged camera projection, stored position, view direction,
light positions/energies; and measured the *community* camera and lighting
as a separate, non-authoritative comparator. The run reports one real
community camera and publishes JSON metadata only.

Root cause of earlier red tests was a **Blender headless stale world-matrix
cache**, not verified source camera movement. The copied camera's saved
location and matrix_basis matched the original exactly, including calibrated
location [0.18,-8.9,10.15]; matrix_world from the inactive reference scene
reported the identity origin. The diagnostic now evaluates scenes and reads
stored matrix_basis for unparented, unconstrained rig objects. This is a
measurement fix; no source camera or render illumination was intentionally
retuned. Never adjust production calibration to conform to the unrelated
community scene without matching original game sprite evidence.


## Subsequent real native geometry and rendering tests (2026-10-29)

[Geometry + entire original 64-frame integrity test #40989012664](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40989012664)
passed with all 15 authentic public Wube model-set STL samples loaded into
Blender 4.5.15 LTS. The new verifier
[verify_official_geometry_integrity.py](verify_official_geometry_integrity.py)
independently loads both the saved baseline R58 .blend and imported combined
.blend, hashes the native source meshes and assigned materials, and samples
the original scene's keyframe inputs at all 64 animation frames. All source
static and 64-frame hashes match. For every individual imported sample,
Blender's saved native-coordinate mesh bounds agree with the underlying
downloaded STL's original bounds, with reported maximum coordinate error
0.0 native STL units across all 15. The imported parts remain in original
unscaled print coordinates, **not** claimed Factorio game tile units.

[Actual native four-frame RGBA render regression #40989846582](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40989846582)
independently rendered source-indexed frames 1, 17, 33, 49 from the
unchanged R58 .blend and from the reconstructed scene inside the combined
private reference library. Both use the same original saved source
orthographic camera, unchanged material/scene geometry, 264x542 transparent
canvas, and fixed Blender Cycles CPU sampling. After decoding the PNG
images, **all four frames have exactly 0 changed RGBA channels** across
the before/after renders. The PNG compressed byte counts differed but the
decoded image pixels did not. This experiment proves that the imported
official model references are isolated from the reconstructed thruster's
rendering. It **does not** prove that the reverse-reconstructed thruster
matches the private Factorio 2.0.77 source sprite atlas.

The run artifact includes metadata JSON and **four render previews of our
own R58 reconstruction only**. It does not include Wube's official
downloaded STL bytes, original licensed source sprites, or combined .blend.

Next evidence gates are (a) complete native source-sprite comparison for
the fin/mount/nozzle shape and all 64 source frames, (b) authenticated
per-part assembly of the relevant official Wube print variants, and (c)
source-sprite camera/tile-space registration for belt, inserter, assembler
and drill. The camera of the community base is a comparator, not a
replacement. None of these remaining tasks should silently change
Tech Priests gameplay or block a game release for subjective art checks.
