# Reusable native-game texture and model sources

**Repository-wide discovery, source-stage implemented 2026-11-04.** This index links nine curated files in [ReverieVR](https://github.com/mrcalzon02/ReverieVR) without copying binaries into the Home Brew Table Top website repository. Current shared source commit: `c27c7337a05db83fa296e9a19617fa95f2fc8a3e` (immutable). The source registry is `shared-assets/catalog-v1.json` at that commit; the HB index is `data/shared-native-assets/reverievr-v1.json`.

ReverieVR's single APK includes one instance of six small coastal-defense PNG material textures and three compact BWM1 prop models in `native/shared/v1/`. Breakwater uses all nine; Omega Front now references the same concrete and steel material bytes. The shared-source Git tree removed old duplicate source files, with **14,834 bytes uncompressed** eliminated from two obsolete Omega PNGs. Actual compressed APK size and Galaxy S9 performance remain unverified.

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

Owner-directed generated textures are available for the user's own native projects. Purchased Beckenburg/PSX Mega Pack derivatives retain the applicable original pack's restrictions; do **not** assume CC0 or publish the raw model library as freely reusable. Record the originating asset ID and immutable commit in each consuming project. Upgrade to v2 by adding new paths/IDs, not mutating the pinned v1 binary payload. Run a genuine target build after staging, and never delete a locally modified asset automatically.
