# R34: private-source versus native Blender animation comparison

This is a **diagnostic**, not an acceptance mark for source-faithful geometry.

R32 renders the `test-04-vanilla-approx.blend` 3D model to 64 native-size 264×542 body PNGs in `capture-output/test-04-vanilla-approx/native-source-cycle-r32/`. R34 compares that true Blender output frame-by-frame against the user's private original Space Age thruster body atlas. **Never commit the original Wube PNGs or derivative private artwork to public GitHub.**

## Preferred: exact original RGBA source (two pages)

```bash
python tools/factorio-render-pipeline/source_vs_native_capture_r34.py \
    --source-atlases /private/thruster-body-1.png /private/thruster-body-2.png \
    --blender-cycle capture-output/test-04-vanilla-approx/native-source-cycle-r32 \
    --output /private/compare-R34
```

The source atlas pages must each be 2112×2168 and contain 8 columns × 4 rows of native 264×542 body sprites in animation order. This script extracts the first 32 frames from page one, the next 32 from page two. The origin and orientation must already match the source body layer, not the glow or flame layers. Treat independent additive-light masks separately.

## Fallback: private analysis GIF, visual alignment only

```bash
python tools/factorio-render-pipeline/source_vs_native_capture_r34.py \
    --source-gif /private/original_thruster_body_vs_glow_64_frames_PRIVATE.gif \
    --blender-cycle capture-output/test-04-vanilla-approx/native-source-cycle-r32 \
    --output /private/compare-R34
```

The previous analysis GIF's left panel is cropped from (6,6) to (270,548) within a 550×588 combined preview. It is palette-quantized and composited on a gray background, **not original alpha**. Its boundaries/IoU are marked `preview_only` and its source temporal-motion count is deliberately **null**. Do not interpret GIF palette flicker as movement or use a GIF-derived score for final geometry acceptance.

## Output and limitations

R34 produces `source-vs-blender-motion.json` with actual original-alpha overlap only when true PNG atlases are provided. It also gives estimated port/starboard outer-guard last-visible rows and eight evenly-spaced source-versus-Blender image pairs in `eight-frame-source-blender-pairs.png`. These are frame-aligned, fixed-canvas comparisons with **no auto-crop or best-fit translation**.

The script neither invents 3D geometry nor proves one unique hidden topology or accurate actuator geometry. The source example left/right outboard guards appear more tightly tapered than R32's. Source color/material and fine mechanics remain separate art-matching problems. R33's rear taper must be checked in a new actual Blender capture before being accepted.
