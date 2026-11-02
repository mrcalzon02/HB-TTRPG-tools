# R69: original sprite versus R66 genuine 64-frame reconstructed alpha motion

Status: objective source-derived **diagnostic only**. Do not block Tech Priests
game builds/releases based on artistic differences. The **only** visual authority
is the user's original Factorio sprite in the true privately supplied
thruster.zip (source archive SHA256
0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791).
There are no substitutes from the web. No original pixels were copied into
this repository, and the original sprite was not available for new
frame-by-frame visual inspection during this pass.

## Evidence actually tested

- The original sprite's recorded exact-alpha 64-frame motion evidence is
  in [SOURCE_REGISTRATION_R34.md](SOURCE_REGISTRATION_R34.md).
  Those values were obtained from the user-supplied **original RGBA atlas**,
  not an unofficial/online/Wiki GIF.
- The independent R66 model is the saved/reopened R66 Blender candidate from
  [R66 workflow #40995175908](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40995175908).
- R67 rendered and SHA-verified all 64 of that candidate's native 264x542
  RGBA frames, then checked its complete 8x8 sheet pixel-for-pixel.
  [Real 64-frame Blender capture #41372931965](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41372931965).
- R69 ran the exact same alpha threshold >=128, all 64 cyclic frame pairs,
  and the same Y bands on the **actual R67 PNGs**. It did not touch the .blend,
  invent actuator motion, or modify sprite geometry.
  [R69 actual-motion audit #41374067729](https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/41374067729).

| Original-frame motion measurement | Authenticated ORIGINAL sprite | R66 actual reconstruction |
| --- | ---: | ---: |
| Changed alpha pixels summed across 64 cyclic transitions | 31,334 | 7,636 |
| Average changed pixels per transition | 489.594 | 119.3125 |
| Unique native pixels with any movement in 64 frames | 4,496 | 1,133 |
| Upper machine rows 0–279 | 6 | 0 |
| Upper attachment roots rows 280–374 | 0 | 0 |
| Bell throat + side guards rows 375–474 | 9,484 | 2,170 |
| Lower lips + guard tips rows 475–541 | 21,844 | 5,466 |

The model reproduces only about 24.4% of the original recorded total
alpha-change activity. The reconstructed bell/guard band is at 22.9%
of the authentic original and the lower lips/guard tips band at 25.0%.
The authentic original has 4,496 independently changing pixels; R66 has 1,133.

## PRIORITY CORRECTION — physical shape, not movement statistics

**R69 is a secondary motion observation, not the primary modeling objective or a geometry target.** The goal is to reproduce the actual visible 3D object forms in the original sprite: each unique cream casting, long differently formed hanging sheet, cupped lower guard, recessed dark nozzle liner and overlapping refractory shingle. A mesh could match the source alpha movement perfectly while still being a visibly incorrect or physically flat object, and such a candidate MUST be rejected. Conversely, a physically accurate static form should not be distorted to increase a movement ratio.

The next engineering pass must **load the original private RGBA atlas** and run `source_3d_shape_correspondence_r70.py` for actual source-to-3D per-part shape, edge, proportions, placement and surface-color comparisons, then change the mismatched **3D vertices/faces** and rerender. No motion-area target can approve or justify invented actuators. Do not use online images.

## What this proves and what it does NOT prove

- This is a real frame-by-frame measurement of R66's generated animation,
  with original evidence recovered from R34, not fabricated output.
- Static first-hit mount visibility improvements in R65/R66 did NOT solve
  the underanimated outer bell/guards and moving lips.
- A genuinely faithful geometry revision should analyze the original
  64 frame source contours in the **375–541 native pixel Y range**, before
  identifying which actual model meshes should flex.
- The previous source analysis observed only a few-pixel displacement along
  original outermost edges in rows around 400–500. No new hinge, swept arc,
  moving upper machinery, or fabricated animation mechanism is justified.
- R69 does not have the actual original frame alpha data to calculate
  exact per-pixel errors or prove directional shape matching. A numeric
  activity-ratio target is NOT an approval criterion.
- All motion and silhouette comparisons remain diagnostics, **never**
  release-blocking game-build tests.

## Next concrete implementation

With exact original RGBA atlas available privately, run:

```bash
python tools/factorio-render-pipeline/source_vs_native_capture_r34.py \
  --source-atlases /private/ORIGINAL-thruster-1.png /private/ORIGINAL-thruster-2.png \
  --blender-cycle /private/r67/output/r67 \
  --output /private/actual-original-vs-R66-motion
```

Then map source original moving guard/lip silhouettes back onto the existing
R66 physical outer guards and R19/liner geometry, testing candidate deformations
without changing the three real upper hull-to-cast and cast-to-fin connections.
No guessed changes to the rig should be promoted until they are actually
compared to the authentic source frames.
