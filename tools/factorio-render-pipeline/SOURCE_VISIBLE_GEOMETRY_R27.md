# R27 — Source-visible reconstruction, not speculative industrial art

## Goal
Replicate the actual 2D Factorio Space Age thruster in editable Blender
3D to calibrate pipeline camera, projection, scale, normals, materials and
light. The original user-provided thruster.zip is the reference, not
engineering conjecture. SHA256:
0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791.

## What the original BODY sprite visibly supports (264x542 native)

- Upper X50..97/Y0..57 and X155..199/Y0..60: TWO large corrugated
  hose/bellows-like features attached to upper engine housing.
- Body X61..201/Y172..339: copper bent pipes, silver tubing/elbows,
  blue and pale thin cable/hose lines, only in the central/upper
  engine chassis region.
- Hanging fin zone X39..224/Y340..438: thin soot-dark silver
  metal sheet/tab faces with heat-purple and blue distal staining,
  and isolated cream-colored cast root structures.
- Nozzle X29..235/Y395..523: substantial dark ribbed/lined cone,
  not a flat cap or decorative radial turbine.
- Two lower-side regions X8..66/Y374..520 and X197..258/Y374..520:
  large exterior LEFT and RIGHT skid/cover UNDERFACES that project
  BELOW the thruster, not wing-like protrusions mounted at sides.
- RGB thruster-light atlas: SEPARATE ADDITIVE GLOW, not geometry.

Do NOT interpret source-visible upper copper/silver tubes as support
that EVERY hanging fin has a long piston/pipe/double brace attached.
We cannot trace such individual mechanisms from original fin roots
into their tips. A hidden back-side mechanism count is not visible.

## R27 hard gate
Remove the exact 20 per-fin unsupported object-name families documented
in vanilla_evidence_prune_r27.py from the saved, editable calibration
scene. These include R11 capillaries/arms, R16 double braces/ferrules/
heat tip injector parts, R19 repeated back-root stiffeners, R21
uniform clevis cylinder props, and R25 cover underside channels.
This is deletion, NOT hide_render, test disabling, dummy geometry or
disguising missing source match with more procedural detail.

Retain original built FIN SHEET meshes, actual four R18 lower shape
animations, TWO real broad exterior underside covers, the dark open
nozzle and already authored UPPER machine manifolds. Those upper
model parts remain provisional hypotheses until compared one by one.
No new geometry or motion is introduced by this pruning.

## Required evidence for every future reconstructed object
1. Identify an observable sprite contour and original source XY rectangle;
   record where it appears across the 64 body frames.
2. Confirm the feature is NOT in a separate light/flame/pipe layer.
3. Construct only the minimal surface needed for that observed feature.
   Explicitly leave occluded 3D shapes unresolved, not guessed.
4. Capture in the same orientation, projection and measured pixel scale.
5. Compare object-specific source/render edge, placement, hue, value,
   shadow and heat oxide. Delete/revise if comparison fails.
6. Require passing source procedures, saved-scene verification, visual
   captures and clipping tests. Do not treat a passing test as a
   perfect visual replica.

This stage audits speculative per-fin tubes and piston-like parts
only. It does not prove that R08/R13/R15/R19 structures, inferred
10-position hidden 3D fin population, or R26 calibration transforms
are source-perfect. Protect the original user image; do not commit
Wube original PNGs or modified raster crops to the public repo.
Work remains isolated to mrcalzon02/HB-TTRPG-tools pipeline. The
live mrcalzon02/Tech-Priests mod/prototypes are not altered.
