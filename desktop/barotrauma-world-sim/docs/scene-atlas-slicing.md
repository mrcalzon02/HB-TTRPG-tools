# Packaged Scene Atlas Partitioning

The desktop resources contain twenty untouched 2048×768 background atlas PNGs:

- ten cold blue exterior, wreck, shipyard, ruin, and industrial-city atlases under `assets/composite_atlas_images/`;
- ten warm retro-futurist bridge, workshop, engineering, laboratory, storage, and corridor atlases under `assets/retro_futurist_interior_atlas_10_images/`.

Every source is a 3×2 composite. The source PNGs are never rewritten, resized, resaved, or replaced by exported derivative scenes.

## Current state

All twenty sheets are partitioned into **120 approved scene cells**:

| Family | Atlases | Approved cells |
|---|---:|---:|
| Exterior | 10 | 60 |
| Interior | 10 | 60 |
| **Total** | **20** | **120** |

Each cell has:

- a stable scene id such as `ext-06-r2c2` or `int-04-r1c3`;
- an exact reviewed source rectangle;
- a unique semantic name;
- a scene category;
- a plain-language description;
- an intended application use.

The atlas generator did not place every separator at mathematically equal thirds. Several sheets use wider outer frames or slightly uneven columns. The reviewed map therefore records the actual dark separator bands for each source instead of dividing every image at fixed pixel coordinates. This removes the black outer borders and internal gutters without trimming scene content.

## Authoritative implementation

```text
src/main/java/io/github/mrcalzon02/barotrauma/assets/SceneAtlasIndex.java
src/main/java/io/github/mrcalzon02/barotrauma/assets/SceneAtlasPreview.java
src/main/resources/io/github/mrcalzon02/barotrauma/assets/scene-atlas-exterior.tsv
src/main/resources/io/github/mrcalzon02/barotrauma/assets/scene-atlas-interior.tsv
```

`SceneAtlasIndex` owns the complete scene partitioning pipeline:

1. Load the twenty packaged source PNGs unchanged.
2. Read the reviewed, human-readable exterior and interior cell maps.
3. Verify every source remains 2048×768.
4. Verify six non-overlapping cells per atlas in a complete 3×2 arrangement.
5. Enforce unique scene ids and semantic names.
6. Produce exact in-memory crops without replacement sprite exports.
7. Provide semantic and role-based lookup.
8. Export a complete audit TSV.

`SceneAtlasPreview` is a development review surface that reads only from `SceneAtlasIndex` and generates family galleries, per-sheet overlays, and the twenty-sheet boundary montage. It contains no source rectangles or semantic assignments of its own.

The source rectangles and their semantic assignments live in the two packaged review maps consumed directly by this index. They are not duplicated in copied image files, compatibility wrappers, post-processing steps, or per-screen crop offsets.

## Prepared background roles

The index provides reviewed defaults for these application purposes:

- application shell;
- world map;
- fleet management;
- logistics;
- observation;
- import review;
- registry;
- simulation;
- recovery.

These mappings identify the intended packaged scenes. The next runtime step is to incorporate them directly into the existing semantic asset catalogue so background resolution follows the established order:

```text
donor installation → approved packaged scene atlas → Java2D emergency fallback
```

No separate background-catalogue wrapper should be added.

## Review outputs

```text
java io.github.mrcalzon02.barotrauma.assets.SceneAtlasIndex --verify

java io.github.mrcalzon02.barotrauma.assets.SceneAtlasPreview \
  --render-gallery exterior ./review/scene-atlas-exterior-gallery.png

java io.github.mrcalzon02.barotrauma.assets.SceneAtlasPreview \
  --render-gallery interior ./review/scene-atlas-interior-gallery.png

java io.github.mrcalzon02.barotrauma.assets.SceneAtlasPreview \
  --render-montage ./review/scene-atlas-boundary-montage.png

java io.github.mrcalzon02.barotrauma.assets.SceneAtlasPreview \
  --render-overlays ./review/scene-overlays

java io.github.mrcalzon02.barotrauma.assets.SceneAtlasIndex \
  --write-map ./review/scene-atlas-map.tsv
```

The full desktop verification suite invokes both `SceneAtlasIndex.verifyContract()` and `SceneAtlasPreview.verifyContract()` before the UI atlas verification chain.
