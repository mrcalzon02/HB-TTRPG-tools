# Packaged UI Atlas Slicing Index

The ten original sci-fi UI PNGs in `src/main/resources/.../assets/sci_fi_ui_asset_sheets_10_images/`
are source sprite sheets. They are not treated as whole-window artwork and they are never rewritten,
resaved, or replaced by extracted derivative sprites.

## Current state

The first indexing pass identifies **2,549 selectable candidate regions across ten 1254×1254 sheets**.
Each candidate receives a stable reading-order asset id, exact `x`, `y`, `width`, and `height`, a semantic
sheet zone, a probable asset kind, and a confidence level.

The first manual assignment pass now approves **65 complete assets from `medical-ui`**. Every approved
asset has a stable semantic name such as `medical-large-panel`, `medical-warning-status-icon`, or
`medical-vital-signs-panel`. The remaining 146 regions on that sheet stay candidates and are not exposed
as approved semantic assets.

This is deliberately a reviewable draft. Dense generated sprite sheets do not provide authoritative
sprite metadata, and black spacing is not perfectly regular. A first-pass rectangle may therefore:

- clip a faint antialiased edge;
- include a narrow strip of a neighboring asset;
- split one visual control into two candidates;
- merge closely spaced controls into one candidate;
- identify an internal decorative element as a selectable asset.

The detector, semantic zones, crop loader, approval assignments, manual rectangle corrections, map exporter,
and review-overlay generator live together in `UiAtlasSliceIndex`. The application must not work around a
bad rectangle with another crop layer, ad-hoc offsets, or copied derivative files. Sheet-specific corrections
are incorporated into this authoritative indexing implementation before runtime UI roles select the affected
asset.

Each manual assignment records the detector rectangle that was reviewed. If later detector changes move or
resize that candidate, verification fails instead of silently applying an old semantic name to a different
piece of artwork. The same assignment structure supports an explicitly corrected rectangle when visual
inspection shows clipping or neighboring artwork.

## Authoritative implementation

```text
src/main/java/io/github/mrcalzon02/barotrauma/assets/UiAtlasSliceIndex.java
```

The class performs one deterministic pipeline:

1. Load the untouched packaged PNG.
2. Separate visible pixels from the black atlas background.
3. Close tiny internal gaps and join nearby pixels inside one candidate.
4. identify connected candidate regions.
5. Tighten each rectangle back to the visible source pixels.
6. Remove tiny noise regions.
7. Sort candidates in stable reading order and assign ids.
8. Classify each candidate by sheet zone, probable kind, confidence, and review notes.
9. Apply explicit reviewed assignments and any approved boundary corrections.
10. Expose only approved slices through stable semantic names.

The detector can export per-sheet TSV maps and full-resolution numbered overlays to any development
directory. Those outputs are review artifacts, not runtime resources, and do not create a second source
of truth.

## Review overlay legend

- red rectangle: high-confidence first-pass candidate;
- orange rectangle: medium-confidence candidate needing closer inspection;
- magenta rectangle: low-confidence candidate likely to need correction;
- green rectangle: manually reviewed and semantically approved asset;
- yellow number: the numeric suffix of the stable asset id;
- yellow number ending in `A`: approved asset.

For example, rectangle `137` on the medical sheet corresponds to `med-137`.


## Controlled implementation preview

```text
src/main/java/io/github/mrcalzon02/barotrauma/assets/UiAtlasImplementationPreview.java
```

The preview composes approved medical assets into practical desktop interface arrangements: navigation
cards, panel chrome, diagnostic displays, status controls, storage controls, instrumentation, and footer
strips. It always loads crops by semantic name from `UiAtlasSliceIndex`; it does not copy, re-export, or
maintain another rectangle map.

The preview is the controlled proving ground for scaling, black-background behavior, visual density, and
component compatibility before these assets replace existing application roles. Corrections discovered in
the preview must be made in `UiAtlasSliceIndex` and then regenerated.

Commands:

```text
java io.github.mrcalzon02.barotrauma.assets.UiAtlasImplementationPreview --verify

java io.github.mrcalzon02.barotrauma.assets.UiAtlasImplementationPreview \
  --render-medical ./review/medical-ui-implementation-preview.png

java io.github.mrcalzon02.barotrauma.assets.UiAtlasImplementationPreview --show-medical
```

## Sheet inventory

| Sheet id | Primary content | Candidates |
|---|---|---:|
| `futuristic-hud` | radar, telemetry, ship schematics, gauges, controls, badges | 228 |
| `medical-ui` | physiology, diagnostics, body panels, medical icons, laboratory controls | 211 |
| `futuristic-ui-elements` | general controls, pointers, progress, panels, textures, maps | 224 |
| `retro-futuristic-ui` | tabs, modal actions, status rows, gauges, map markers, frames | 268 |
| `game-hud-icons` | equipment, weapons, tools, inventory slots, rank badges, item cards | 287 |
| `hud-design` | panels, topographic maps, radar, sliders, toggles, progress bars | 284 |
| `hud-elements` | world map, location markers, vehicles, missions, gauges, icon rows | 329 |
| `hud-collage` | navigation, alerts, system controls, gauges, map, footer frames | 272 |
| `ui-collage` | communications, channels, messages, signal state, waveform, network maps | 214 |
| `tech-interface` | faction emblems, warnings, maps, networks, alerts, pins, textures | 232 |

## Per-sheet refinement procedure

Review one sheet at a time. For every numbered candidate:

1. Generate its full-resolution review overlay and TSV map.
2. Compare the rectangle against the untouched source image at 1:1 scale.
3. Decide whether it is a complete reusable asset, a fragment, a merged group, or decorative noise.
4. Correct the sheet-specific detector or explicit source rectangle in `UiAtlasSliceIndex`.
5. Regenerate the overlay and verify that surrounding candidate ids remain stable.
6. Record the approved semantic purpose before binding the asset to a Swing role.

Commands:

```text
java io.github.mrcalzon02.barotrauma.assets.UiAtlasSliceIndex --verify

java io.github.mrcalzon02.barotrauma.assets.UiAtlasSliceIndex   --render-review medical-ui ./review/medical-ui.png

java io.github.mrcalzon02.barotrauma.assets.UiAtlasSliceIndex   --write-map medical-ui ./review/medical-ui.tsv

java io.github.mrcalzon02.barotrauma.assets.UiAtlasSliceIndex   --render-review-all ./review/overlays

java io.github.mrcalzon02.barotrauma.assets.UiAtlasSliceIndex   --write-map-all ./review/maps
```

The approved medical batch is now available for controlled implementation review. Binding individual
semantic roles into the main application should proceed only after the preview is accepted or corrected.
Donor-installed Barotrauma graphics remain a separate donor-first source and are not changed by this index.
