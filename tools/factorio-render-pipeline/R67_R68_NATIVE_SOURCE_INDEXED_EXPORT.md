# R67–R68: full original-indexed thruster rendering and atlas layout

## Original-reference rule (mandatory)

The **only** visual reference for this Factorio 2.0.77 thruster
reconstruction is the user's original 64-frame sprite extracted from
thruster.zip, specifically the two original 8x4 RGBA atlas pages with
SHA256 archive provenance
0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791.
Each cell is 264x542, each page is 2112x2168. NEVER compare to a Wiki GIF,
an arbitrary internet image, a generated illustration, or a Wube printable STL
instead of the source. Original sprite pixels remain private.

R66 is an *unapproved* editable reverse-engineering candidate.
The proven model bytes, not a cosmetic screenshot, are authoritative for
the new candidate frame sequence:
SHA256 a1db423d69c1db0373eefc1b551966f15d6906f3e61dcce8d67f90753cc59547
(`saved_three_source_cast_face_stays_r66.blend`).

## R67: render every actual mesh animation frame

[Successful complete real Blender workflow #41372931965](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41372931965).

- Recover previously saved R66 from successful Actions #40995175908,
  without source sprites, official Wube STLs, or web imagery.
- Reopen the real saved Blender scene. Check revision flag, calibrated original
  orthographic camera, transparent film, original Cycles engine and R18
  64-frame lower-fin morph sequence.
- Render all frames 1..64, corresponding exactly to original source indices
  0..63, in native 264x542 RGBA and 8-sample deterministic Cycles.
- Verify saved model SHA unchanged; report each source-indexed frame,
  actual PNG digest, and actual lower fin shape key values.
- Assemble 8x8 review sheet 2112x4336. Independently verify all 64
  serialized cells have EXACTLY the RGBA pixels of their original real Blender
  PNG render. All 64 reconstructed frames were genuinely different.
- The workflow publishes frames, reconstruction-only review atlas and proof
  metadata. None of this constitutes visual source fidelity acceptance.

## R68: original TWO-page 8x4 atlas format

Python pipeline: `r68_original_atlas_page_layout.py`.
Input: the existing verified R67 64 real-frame PNG artifact and manifest.
Output: page 1 indices 0..31, page 2 indices 32..63, both 2112x2168
native RGBA spritesheets. No frame scaling, frame reordering, alpha loss,
new art or source imagery. Checks all 64 serialized cell hashes against the
real R67 captured Blender pixels.

The pair is labeled
`R68_CANDIDATE_NOT_ORIGINAL_thruster_body_page_{1,2}.png`
to avoid mistaking a reconstructed model for actual Factorio sprite art.

## How to run the ONLY valid visual comparison (private local original sprites)

After recovering the genuine source pages and extracting the R67 artifact:

```bash
python tools/factorio-render-pipeline/source_vs_native_capture_r34.py \
  --source-atlases /private/ORIGINAL_thruster-1.png /private/ORIGINAL_thruster-2.png \
  --blender-cycle /private/r67/output/r67 \
  --output /private/original-vs-R66-candidate
```

This produces fixed native-frame source-versus-model silhouette and
original 64-frame motion diagnostics. Neither source art nor the private
side-by-side comparisons should be uploaded into public CI artifacts.

`run_calibration.py` now accepts `--source-atlases ORIGINAL_PAGE1 ORIGINAL_PAGE2`
and otherwise records original visual comparison as UNAVAILABLE. The legacy
R07 comparison entry point is also source-only: it is not allowed to fetch a
Wiki animation or any other internet stand-in.

## Release policy

Camera, model, 64-frame sequencing, and the two-page reconstruction layout
are independently testable functional contracts. The degree to which this
model looks like the original game's art is **diagnostic only** and must not
block a game release. No claim of original sprite correspondence is permitted
without a direct private comparison to the original exact RGBA frames.
