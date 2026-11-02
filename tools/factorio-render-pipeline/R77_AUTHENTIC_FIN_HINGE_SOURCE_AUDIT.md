# R77 — rechecking the TRUE original Factorio fin mountings (private source evidence)

## Original source actually recovered and verified in local private workspace

Previous R71–R76 runs DID NOT have the original body image in public CI. This audit retrieved the user's previously uploaded **`thruster.zip`** directly from their personal Project Library. Verified SHA256 **`0670bc10c11800e89beb4d39dd692dc32a4d3ea4b967b742559b54a8d7967791`**. ZIP contains two genuine original `thruster/thruster-1.png`, `thruster/thruster-2.png`, each 2112×2168 RGBA, eight columns × four rows; 64 264×542 body frames in correct archive frame order. Separate `thruster-light-1/2.png` glow and flame/pipe layers are **NOT** part of the physical model. This is real source evidence; do not substitute web/reference images.

The original source files and enlarged original frame crops **remain private in the local workflow**, never committed to this public GitHub repository, never uploaded to Actions. Only text observations and numeric measurements appear here.

Comparison source: recovered original body frames **1 and 33** versus actual saved Blender R71 +.075 frame renders `section_100_100_frame01.png` and `section_100_100_frame33.png` (R76 zero-change baseline) at the same native coordinates, not resized for metrics. Same 264×542 frame dimensions. **This is now an actual source-pixel comparison**, not source-image guesswork.

## Distinct physical brackets actually visible in the original

1. **Port/left cast**, approx x27–90,y314–358: asymmetric angled/light cream casting with real upper bolted flange, uneven lower shoe and a distinct attachment to the blue-purple stamped hanging plate. Current Blender shell reads as smooth/slab-like tapered shield and lacks much of the source-side physical detail.
2. **Center cast**, approx x95–163,y311–339: broad pale metal bridge, **two short separate downward integral locking ears**, two copper feeds above; the central hanging stamped plate begins behind and beneath the cast. Blender R55 bars are too long and U-like; its center source-space cast is too bright/gray, too smooth and visually distinct from the original aged cream casting.
3. **Starboard/right cast**, approx x166–220,y313–356: offset, asymmetrical heavy cream cover with red control wire behind/around upper edge, distinct lower mounting shoe. Blender version is far more simply tapered and lacks the original depth and exposed bespoke contours.

The original casting is **above** the recessed annular band, not attached to a common torus or a per-fin repeated mechanical fixture. The source does not establish a visible hydraulic actuator or spinning hinge bearing: don't invent animated pivots, bolts/pistons or duplicate unseen mounts.

A selected original 8-frame animation source review showed mounting neighborhoods remain recognizable, with subtle translation/deformation/shading. Local ±4-pixel RGB alignment tests of frames 1,9,17,25,33,41,49,57 found best shifts of about **0–2 px** for each casting; no independent angular hinge motion was conclusively established. Do not claim pixel-identical static regions either: source frame intensities/edges change.

## Measured exact original vs actual Blender, source-camera unchanged

All numbers measured at original **native 264×542 pixels**, black premultiplied RGB (RGBA RGB×alpha/255), mean of three absolute 0..255 channels normalized to [0,1]. The model is already imperfect in material/lighting/background so the MAE does NOT uniquely identify a geometric mismatch. It is an independent metric to detect whether a candidate **actually improves** the exact original pixels in the targeted native ROI. Use both frames to avoid single-frame overfit.

| Real original crop (x0,y0,x1,y1) | R71/76 baseline MAE frame 1 | Frame 33 | Original RGB luminance frame 1 | Blender luminance frame 1 |
| --- | ---: | ---: | ---: | ---: |
| Left cast (27,314,90,358) | .18572 | .19319 | .2481 | .3132 |
| Center bridge (95,311,163,339) | .20928 | .20885 | .2078 | .3684 |
| Right cast (166,313,220,356) | .17528 | .17615 | .1393 | .2940 |
| Center two ears + fin root (96,328,164,385) | .17987 | .17598 | .1804 | .3401 |
| Left fin root (38,340,99,401) | .16952 | .21298 | .2660 | .3300 |
| Right fin root (164,340,223,402) | .12010 | .11531 | .1198 | .2059 |
| All mount region (27,300,225,396) | .17224 | .17941 | .1841 | .3013 |

**Main realization:** the center bridge's *rendered brightness* is .3684 versus original .2078 in its source ROI, and visually has an incorrect long-U appearance. Later changing shader alone would not fix the two overlong 3D locking tabs; conversely geometry can improve without changing source brightness. Do geometry first, prove exposure/fit, then adjust aged-metal shader when source shape better matches. No global lighting changes.

## Candidate R77 and next validation steps

[Physical editable R77 correction](https://github.com/mrcalzon02/HB-TTRPG-tools/commit/7d34ebb179a039e2f69adba2fdbf93baf64d4436) modifies the **existing two R55 central locking ear solids**, not invented parts. Two free-end scale variants .65 and .45 of their original length; each keeps the upper four attachment vertices EXACT, same six 3D faces and true eight-vertex solid mesh, same materials, no movement of three genuine R49 casting-to-R21 fin joints, no new objects or camera/animation changes. Blender CI saves/reopens .blend and renders true native frames 1/33; this **does not grant original-source approval**. Original source MUST stay local; compare the new true model renders against verified original frames privately using the above native regions.

Choose candidate only if actual source ROI contours and visually observed two short ears improve while physical connectivity and source animation remain intact. Recheck the left and right asymmetric mounting shoes after the center, independently; do not make all three copies of the same clamp. Preserve original fin metal stamping, original outer clamshell cups, R11 open bore and actual mount load paths.

**Global release gate:** fidelity, color, art and style diagnostics MUST NOT block unrelated builds. Actual failures to build, launch, run or required multiplayer/update functionality may block.
