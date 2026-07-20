# Packaged UI Atlas Slicing and Semantic Review

The ten original sci-fi UI PNGs in `src/main/resources/.../assets/sci_fi_ui_asset_sheets_10_images/`
remain untouched source sprite sheets. They are never rewritten, resaved, or replaced by extracted derivative
sprites.

## Current state

The deterministic detector identifies **2,549 candidate regions across ten 1254×1254 sheets**. Every candidate
has a stable reading-order asset id, exact source rectangle, semantic sheet zone, probable kind, confidence,
review status, and notes.

The current review has promoted **612 assets to approved semantic status** and explicitly rejects **7 unusable
fragments**. No selected region remains unresolved. The reviewed total remains 619; 1,930 detector candidates are
intentionally unselected.

| State | Count | Runtime semantic lookup |
|---|---:|---|
| `approved` | 612 | Yes |
| `rejected` | 7 | No |
| `assigned` | 0 | No |
| `candidate` | 1,930 | No |
| **Total** | **2,549** | |

Only approved assets can be addressed through `UiAtlasSliceIndex.findBySemanticName(...)` and
`cropBySemanticName(...)`. Rejected regions remain visible in the audit previews but cannot enter runtime use.

## One authoritative implementation

```text
src/main/java/io/github/mrcalzon02/barotrauma/assets/UiAtlasSliceIndex.java
```

`UiAtlasSliceIndex` owns the complete pipeline:

1. Load each untouched packaged PNG.
2. Detect visible connected regions against the black atlas background.
3. Tighten candidate rectangles and assign stable ids.
4. Apply explicit reviewed boundary corrections.
5. Apply approved semantic names and kinds.
6. Record explicit rejections for unusable fragments.
7. Verify every reviewed rectangle against the detector output.
8. Provide exact in-memory crops, semantic lookup, maps, and review overlays.

The former separate unified-review manifest and wrapper are obsolete. Assignment status, approval state, rectangle
verification, semantic lookup, overlays, and map output now come from the same index. Corrections must be made here,
not hidden behind another crop layer, copied sprite, post-processor, or display offset.

## Approved counts by sheet

| Sheet | Approved | Rejected | Reviewed |
|---|---:|---:|---:|
| `futuristic-hud` | 36 | 6 rejected | 42 |
| `medical-ui` | 65 | 0 rejected | 65 |
| `futuristic-ui-elements` | 65 | 0 rejected | 65 |
| `retro-futuristic-ui` | 72 | 0 rejected | 72 |
| `game-hud-icons` | 42 | 0 rejected | 42 |
| `hud-design` | 46 | 0 rejected | 46 |
| `hud-elements` | 65 | 0 rejected | 65 |
| `hud-collage` | 54 | 0 rejected | 54 |
| `ui-collage` | 99 | 1 rejected | 100 |
| `tech-interface` | 68 | 0 rejected | 68 |
| **Total** | **612** | **7 rejected** | **619** |

The promoted assets cover navigation controls, communications controls, equipment and inventory symbols, map
markers, vehicle silhouettes, environmental hazards, gauges, progress controls, data panels, faction emblems,
status lights, gestures, notification controls, and reusable panel chrome.

## Rejected regions

Seven reviewed regions are intentionally excluded from semantic lookup and runtime use:

- `fhud-024`: blurred decorative micro-glyph without a stable standalone role;
- `fhud-043`, `fhud-044`, `fhud-045`: embedded blurred numeric glyphs;
- `fhud-078`: merged glowing circle and neighboring dot;
- `fhud-165`: blurred decorative fragment;
- `uic-192`: embedded blurred numeric glyph.

## Review and implementation previews

The review surfaces are split by purpose while sharing the same authoritative index:

```text
src/main/java/io/github/mrcalzon02/barotrauma/assets/UiAtlasImplementationPreview.java
src/main/java/io/github/mrcalzon02/barotrauma/assets/UiAtlasSemanticPreview.java
```

`UiAtlasImplementationPreview` retains the focused medical composition preview.
`UiAtlasSemanticPreview` loads every crop from `UiAtlasSliceIndex` and generates:

- a unified semantic slicing gallery showing all 619 reviewed regions;
- a ten-sheet boundary montage showing each region in source context;
- a rejected-only audit preview.

Green `A` regions are approved semantic assets. Gray `X` regions are rejected fragments. Cyan `R` would indicate
an unresolved assignment, but none remain. Red, orange, and magenta rectangles remain ordinary detector candidates.

Commands:

```text
java io.github.mrcalzon02.barotrauma.assets.UiAtlasSliceIndex --verify

java io.github.mrcalzon02.barotrauma.assets.UiAtlasSliceIndex \
  --write-reviewed-map ./review/unified-ui-atlas-semantic-map.tsv

java io.github.mrcalzon02.barotrauma.assets.UiAtlasSemanticPreview \
  --render-slices ./review/unified-ui-atlas-semantic-preview.png

java io.github.mrcalzon02.barotrauma.assets.UiAtlasSemanticPreview \
  --render-overlays ./review/unified-ui-atlas-semantic-overlay.png

java io.github.mrcalzon02.barotrauma.assets.UiAtlasSemanticPreview \
  --render-rejected ./review/unified-ui-atlas-rejected-preview.png

java io.github.mrcalzon02.barotrauma.assets.UiAtlasImplementationPreview \
  --render-medical ./review/medical-ui-implementation-preview.png
```

## Correction procedure

For any region that looks clipped, merged, too loose, or semantically wrong:

1. Identify its stable asset id in the unified semantic preview.
2. Confirm the problem in the boundary montage at source-sheet scale.
3. Correct the expected and approved rectangles in `UiAtlasSliceIndex`.
4. Update the semantic name or status in the same authoritative adjustment record.
5. Regenerate the semantic preview, overlay, and reviewed map.
6. Run `UiAtlasSliceIndex --verify`, `UiAtlasImplementationPreview --verify`, and `UiAtlasSemanticPreview --verify`.

Runtime Swing binding remains deferred until the relevant visual roles are accepted in the implementation preview.
The intended source order remains donor installation first, approved packaged atlas second, and Java2D emergency
fallback last.
