# Reusable native-game texture and model sources

**Repository-wide discovery, source-stage implemented 2026-11-04.** This index links nineteen curated files in [ReverieVR](https://github.com/mrcalzon02/ReverieVR) without copying binaries into the Home Brew Table Top website repository. Current shared source commit: `ecd63ee28da0d03b6cc77758451c92544248e1c7` (immutable). The source registry is `shared-assets/catalog-v1.json` at that commit; the HB index is `data/shared-native-assets/reverievr-v1.json`.

ReverieVR's single APK includes one instance of sixteen compact coastal-defense PNG material textures and three compact BWM1 prop models in `native/shared/v1/`. Breakwater uses all nineteen; Omega Front now references the same concrete and steel material bytes. The shared-source Git tree removed old duplicate source files, with **14,834 bytes uncompressed** eliminated from two obsolete Omega PNGs. Actual compressed APK size and Galaxy S9 performance remain unverified.

## Import into another internal game project

With a **local** ReverieVR checkout holding the referenced blobs, run from HB-TTRPG-tools:

```bash
python3 tools/shared-native-assets/import_assets.py \
  --source-root ../ReverieVR \
  --dest-assets ../OtherGame/app/src/main/assets \
  --id coastal.quay_concrete \
  --id coastal.oxidized_steel
# Inspect the dry run; rerun with --apply to stage only the selected bytes.
```

The importer checks file sizes and exact Git content hashes, plus SHA-256 where published, refuses traversal and destination conflicts, and does not access the internet. Model IDs such as `psx.wooden_crate_1` additionally need an owner-rights review and explicit `--allow-restricted`. A BWM1 consumer must actually implement or reuse the compatible parser; this staging utility does not claim models render in arbitrary engines.

This is **build-time selective sourcing**, not a CDN, in-game asset store, shared Android GPU texture cache, or install-once inter-APK asset broker. Other independent APKs that each bundle the same file will still include duplicate download bytes; the user-approved single ReverieVR APK is currently where physical payload deduplication is achieved.

## Licensing and upgrade rules

Owner-directed generated textures are available for the user's own native projects. Purchased Beckenburg/PSX Mega Pack derivatives retain the applicable original pack's restrictions; do **not** assume CC0 or publish the raw model library as freely reusable. Record the originating asset ID and immutable commit in each consuming project. Keep existing v1 binary blobs immutable and append reviewed IDs with a new pinned commit; use a v2 path only when file formats or meanings change. Run a genuine target build after staging, and never delete a locally modified asset automatically.

## Breakwater generated material expansion (2026-11-04)

Ten additional 64×64, 64-color indexed PNGs are now discoverable: `coastal.dock_planks`, `coastal.mossy_seawall`, `coastal.corrugated_roof`, `coastal.camo_netting`, `coastal.diamond_plate`, `coastal.trench_soil`, `coastal.reinforced_concrete`, `coastal.crate_planks`, `coastal.riveted_bulkhead`, `coastal.pebble_ground`. Their 33,396 source bytes are committed as ten independently verified Git blobs in ReverieVR, while the six previous tiles are untouched. The active Breakwater native atlas packs all 16 into 128×768 RGBA8 after bounded one-time decode; its bunker and 3D coast place each new tile where it belongs. Three BWM1 prop files are separately cataloged and retain owner-rights review.

High-resolution generated reference images and game-ready sources are preserved outside the APK in [Breakwater Shared Material Sources](https://drive.google.com/drive/folders/1Z_vqO-jRM6KVkEXkqpEAlnmPRhwi51fO). These 19 entries remain *source-stage available* to other games; the importer does not prove 3D rendering or runtime byte deduplication across independent installed APKs. The built Android game and S9 visual/performance acceptance are tracked separately in ReverieVR.
