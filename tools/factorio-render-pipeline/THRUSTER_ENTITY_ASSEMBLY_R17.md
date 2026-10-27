# R17 — Thruster entity, light and conditional component assembly

Authoritative source: https://github.com/wube/factorio-data/blob/2.0.77/space-age/prototypes/entity/entities.lua

## One body animation and one additive working-glow animation

Original game body atlases thruster-1.png and thruster-2.png contain 32 frames each, for 64 frames of 264x542 RGBA. Original glow atlases thruster-light-1.png and thruster-light-2.png are consecutive pages of ONE separate glow animation, 32 frames each, cell 384x832 RGB. Both are speed 0.5, scale 0.5 and prototype shift {0,3}. Glow uses additive blend, draw_as_glow=true and fadeout=true. Do not mistake two atlas pages for two light emitters or infer motion from light-only RGB changes.

## The entity is a conditional render graph

- graphics_set.animation: physical body and visible fin motion, 64 frames.
- integration_patch: static open deck/socket graphics, render_layer floor.
- working_visualisations: one named visual per connected fuel or oxidizer pipe.
- unnamed working_visualisation: 64-frame additive glow atlas with fadeout.
- flame_effect: specialized exhaust effect separate from body and glow.
- plumes.stateless_visualisations: smoke and smoke-glow layers, independent particles.

Original fluid ports and exact per-connection working-visualisation triggers:

| Visual | Fluid | Side | Factorio (X,Y) | Sprite Y shift |
| --- | --- | --- | --- | --- |
| pipe-1 | Oxidizer | East | (+1.5,-2) | +95 px |
| pipe-2 | Fuel | East | (+1.5,0) | +96 px |
| pipe-3 | Oxidizer | West | (-1.5,0) | +96 px |
| pipe-4 | Fuel | West | (-1.5,-2) | +95 px |

Ports have draw_only_when_connected=true. Each working visualisation has enabled_by_name=true and always_draw=true, meaning it is always drawn WHEN ENABLED, not when unconnected. Blender coordinate mapping for pipe anchor placement is (x,-y).

## Sound-synchronized mechanical inspection

The upstream entity defines mechanical stop and move accent cues at animation frames 25 and 52. Inspect body and light atlases independently at 24/25/26 and 51/52/53. Sound triggers do not establish which fin joint actually moves.

## Reproducible inspection without redistributing source art

Source contract: python tools/factorio-render-pipeline/thruster_entity_layers_r17.py --contract /private/contract.json

Optional original ZIP study: python tools/factorio-render-pipeline/thruster_entity_layers_r17.py --zip /private/thruster.zip --private-output /private/thruster-r17

That optional run generates private page contact sheets for both source light files and body cue frames. **Updated with directly inspected original ZIP (R18, 2026-10-26):** The user reattached `thruster.zip` and its actual 18 archive entries and 64+64 frames were decoded, including the original `thruster-light.lua`. ZIP SHA256: `0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`. The body descriptor has a `(1.5,-39)` pixel shift and the light descriptor a `(0,0)` shift. The 64 body-frame transitions changed 78,614 alpha pixels (>10 threshold), with 73,151 changes (93.05%) in original rows 410–541. The central upper fin/root block (source X100–163, Y340–424) had ZERO observed alpha changes; the moving silhouette is dominated by lower outer rim and lip ends, with region-specific displacements of 3–19 source pixels. Full measurement methodology and limitation are recorded in `CALIBRATION_FINDINGS.md` and committed R18 module. Private derived images must not be uploaded to this public repository.

R16 fin shape and support regression passed in https://github.com/mrcalzon02/HB-TTRPG-tools/actions/runs/40417003783, both calibration and models. No current R16 image-match or Factorio-runtime acceptance is implied. R17 only adds analysis code, tests, and this reference document.

Beware source sprite descriptor shifts: body and glow native cells differ in size, so a naive same-origin 2D alpha overlay would not represent Factorio's compositing. Do not turn raw RGB glow atlas into model geometry.
