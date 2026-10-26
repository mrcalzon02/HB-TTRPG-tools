# R12 — Vanilla assembled thruster atlas calibration (Factorio Space Age)

This document records source-neutral observations from the user's installed-game
thruster.zip and prior character.zip / wooden-chest.png references. **Never
upload the original proprietary game image sheets or derived contact-sheet
pictures to the public HB-TTRPG-tools repository.** The local audit utility
makes private visual references from a user-supplied ZIP.

## Verified atlas format

| Source bitmap | Pixel size | Sprite cells / role |
| --- | --- | --- |
| thruster-1.png and thruster-2.png | 2112 × 2168 RGBA each | 8 columns × 4 rows of 264 × 542; total **64 frames** |
| thruster-light-1.png and thruster-light-2.png | 3072 × 3328 RGB each | 8 × 4 of 384 × 832; total **64 light frames** |
| thruster-bckg.png | 302 × 452 RGBA | Separate stationary open platform/socket art |
| thruster-pipe-connection-1..4.png | 384 × 832 RGBA each | Four conditional connection patches |
| thruster-flame.png | 384 × 832 RGB | Separate flame/effect texture |
| thruster-smoke.png | 2024 × 1680 RGBA | Independent smoke atlas |
| thruster-smoke-glow.png | 2024 × 1216 RGBA | Independent smoke/glow atlas |
| thruster-remnants.png | 310 × 558 RGBA | Destroyed/ruined variation |

The provided thruster.lua specifies shift = util.by_pixel(1.5, -39.0).
The thruster-bckg.lua specifies shift = util.by_pixel(2.0, -72.5).
The official 2.0.77 prototype further specifies 64 animation frames,
animation speed 0.5, scale 0.5, prototype shift {0,3}, and separate floor
integration. Do not blindly add/override the two shifts without inspecting
Factorio's actual sprite_load implementation.

Official source:
https://github.com/wube/factorio-data/blob/2.0.77/space-age/prototypes/entity/entities.lua

## Measured animation locations

63 consecutive actual body frame transitions, comparing **alpha silhouette**
change (>10 / 255 difference):

| Vertical pixel rows within 264 × 542 frame | Mean changed alpha pixels / transition |
| --- | ---: |
| 0–100 | 0.44 |
| 100–200 | 0 |
| 200–280 | 0 |
| 280–340 | 0 |
| 340–410 | 84.90 |
| 410–470 | 285.41 |
| 470–542 | 855.32 |

Approximately **93% of changed silhouette pixels are in rows 410–541**.
The top/mid-body outline is almost completely stationary. Color/lighting
changes are visible through the rest of the machine, so RGB differences alone
do not prove articulated joints. This means the previously attempted global
reactor pulse/wobble is not a valid substitute for the vanilla 64-frame
nozzle/afterburner animation.

The sprite shows deep dark refractory nozzle internals, external machinery
supporting cantilevered thermal vanes near the bell circumference, elaborate
irregular heavy housings, overlapping tubes/pumps and physically joined
conduits. It does not have a row of freestanding identical xylophone bars.
User-confirmed arrows and fuel indicators belong to informational overlays,
not modeled engine parts.

There are **no native 3D mesh, .blend or rig files** in thruster.zip.
2D baked sprites can constrain plausible geometry and visible motion but
cannot uniquely recover 3D topology or occluded moving parts.

## Quantitative R11 benchmark mismatch

Source vanilla body-only frame 0: alpha bounds [4,0,263,532],
visible width/height = 259/532 = **0.487**.

R11 Blender body-only idle frame: alpha bounds [55,185,262,511]
on 320 × 640, visible width/height = 207/326 = **0.635**.

R11 therefore appears approximately **30% too wide relative to height**
when comparing visible shapes after cropping. This is not a registered
pixel similarity score: camera/view angles, sprite pivots, sampling and
actual mesh proportions must be aligned together before interpreting it as
a required scale edit. The vanilla is longer/slimmer and much denser and
darker than the clean R11 capsule.

The native integration patch is an **open, suspended socket structure**,
not a full machine base plate; the pipe sprites are small connection patches
positioned within large transparent cells. The RGB native light and flame
artwork makes much richer luminous/thermal effects than the early Blender
translucent-cone approximation. Those require separate compositor passes,
not additional solid engine geometry.

## Local reproducible inspection (do not commit texture output)

From a Homebrew Tabletop Tools checkout with Pillow installed:

    python tools/factorio-render-pipeline/audit_vanilla_atlas.py /path/to/thruster.zip --output /path/to/local/reference-audit

Output: numerical atlas/alpha motion manifest, selected extracted frames
and local reference contact sheet. The original user-owned ZIP stays local.

The user's character.zip includes base, mask and shadow animation layers
that may help validate a general-purpose sprite compositor; wooden-chest.png
is a 62 × 72 RGBA sprite useful for an independent static render/color test.
Neither determines thruster-specific 3D topology or animation.

## Next gates (not completed by this reference audit)

1. Align camera/pivot and candidate sprite-cell geometry to the real
   264 × 542 source frame before interpreting silhouette differences.
2. Animate nozzle and overhanging afterburner assembly **locally**, while
   keeping the upper casing motion consistent with observed alpha changes.
3. Rebuild cast housings into dense, joined, irregular industrial sections,
   not evenly spaced decorative bars.
4. Match floor integration, 4 conditional pipes, light, flame and smoke in
   independently rendered layers with correct color/alpha semantics.
5. Render a real comparison in the Blender CI workflow; accept changes only
   after visual review, frame validation and eventually a disposable Factorio
   2.0.77 in-game placement test.

**Status:** actual source frames analyzed; script committed. No graphics or
gameplay file in Tech Priests has been replaced or approved by this audit.
