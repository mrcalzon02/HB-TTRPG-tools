# Unified UI Atlas Correction Review

The deterministic atlas detector currently identifies 2,549 candidate regions across ten untouched 1254×1254 UI sprite sheets. The approved medical pass contributes 65 semantic assets. This unified pass selects another 554 complete-looking regions from the other nine sheets for visual correction review.

## Review states

The review deliberately distinguishes three states:

- `candidate`: detector output that has not been selected for detailed review;
- `assigned`: a complete-looking region selected for correction review but not yet named or runtime eligible;
- `approved`: a manually accepted rectangle with a stable semantic name.

Only approved assets can be addressed through `UiAtlasSliceIndex.findBySemanticName(...)` or `cropBySemanticName(...)`. Assigned regions remain development review material and cannot silently enter the application.

The current totals are:

| State | Count |
|---|---:|
| Approved medical assets | 65 |
| Assigned correction-review regions | 554 |
| Reviewed total | 619 |
| Unselected candidates | 1,930 |
| Detector total | 2,549 |

## Authoritative responsibilities

`UiAtlasSliceIndex` remains authoritative for source PNG loading, detector rectangles, approved medical corrections, stable candidate IDs, exact crops, and semantic lookup.

`UiAtlasUnifiedReview` is development-only selection tooling. It reads `ui-atlas-unified-review.tsv`, resolves the selected candidate IDs through `UiAtlasSliceIndex`, verifies every selected rectangle with a per-sheet fingerprint, and emits the unified review map. It does not alter source rectangles, assign semantic meanings, or provide a runtime fallback layer.

`UiAtlasUnifiedReviewPreview` renders two correction surfaces:

1. A unified slicing gallery showing every reviewed crop at a practical inspection size.
2. A unified boundary montage showing all ten source sheets and their detector rectangles.

No extracted replacement sprites are written into application resources. Preview PNGs and TSV maps are generated development artifacts.

## Visual legend

- Green border or rectangle ending in `A`: approved semantic medical asset.
- Cyan border or rectangle ending in `R`: provisionally assigned correction-review region.
- Red, orange, or magenta rectangle: ordinary first-pass candidate, colored by detector confidence.

A cyan region is not an approval. It may still be clipped, contain neighboring pixels, represent only part of a larger control, or need to be rejected entirely.

## Assigned counts by sheet

| Sheet | Assigned |
|---|---:|
| `futuristic-hud` | 42 |
| `futuristic-ui-elements` | 65 |
| `retro-futuristic-ui` | 72 |
| `game-hud-icons` | 42 |
| `hud-design` | 46 |
| `hud-elements` | 65 |
| `hud-collage` | 54 |
| `ui-collage` | 100 |
| `tech-interface` | 68 |
| **Total** | **554** |

The medical sheet remains at 65 approved assets and is included in the unified gallery for comparison.

## Correction workflow

Review the slicing gallery and boundary montage together. For each cyan `R` region:

1. Confirm that the crop represents one complete reusable visual element.
2. Check the full-sheet boundary for clipping, merged neighbors, and omitted faint edges.
3. Reject internal decoration, fragments, and duplicated variations that have no useful interface role.
4. Record any corrected rectangle in `UiAtlasSliceIndex`, preserving the candidate ID.
5. Assign a semantic name only after the corrected crop is accepted.
6. Regenerate both unified previews and verify the per-sheet fingerprint deliberately changes with the reviewed rectangle update.

Runtime role binding remains deferred until the relevant regions have been promoted from assigned to approved.

## Commands

```text
java io.github.mrcalzon02.barotrauma.assets.UiAtlasUnifiedReview --verify

java io.github.mrcalzon02.barotrauma.assets.UiAtlasUnifiedReview \
  --render-slices ./review/unified-ui-atlas-slicing-preview.png

java io.github.mrcalzon02.barotrauma.assets.UiAtlasUnifiedReview \
  --render-overlays ./review/unified-ui-atlas-overlay-preview.png

java io.github.mrcalzon02.barotrauma.assets.UiAtlasUnifiedReview \
  --write-map ./review/unified-ui-atlas-reviewed-map.tsv
```

The complete desktop verification suite also invokes `UiAtlasUnifiedReview.verifyContract()` after the existing detector and medical implementation checks.
