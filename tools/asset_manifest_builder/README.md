# Asset Manifest Builder

Small local Python utility for indexing the repo's asset folders and producing a machine-readable map of every image, audio file, video, font, document, archive, and other asset it finds.

The point of this tool is to stop guessing at asset paths. Run it from a local copy of the repo and it will generate manifests with normalized repo-relative paths that can be copied directly into HTML, CSS, and JavaScript.

## One-command Windows CMD workflow

From the base level of the repo in Windows CMD, run:

```cmd
scan-assets-and-push.cmd
```

That command performs the full workflow:

1. Moves to the repo base directory.
2. Confirms the folder is a Git repo.
3. Confirms the active branch is `main`.
4. Runs the asset scan.
5. Writes `asset-manifest.json`, `asset-manifest.md`, and `asset-manifest.js`.
6. Runs `git add -A`.
7. Commits any changes with `Update generated asset manifest`.
8. Pushes `main` to `origin`.

No separate scan command and no separate upload command are required.

## Manual scan only

```bash
python tools/build_asset_manifest.py --root . --assets assets --out asset-manifest.json --markdown asset-manifest.md --js-out asset-manifest.js
```

That creates:

- `asset-manifest.json` — full structured manifest.
- `asset-manifest.md` — human-readable inventory grouped by folder.
- `asset-manifest.js` — browser-friendly manifest attached to `window.REPO_ASSET_MANIFEST`.

## Optional installable command

```bash
python -m pip install -e tools/asset_manifest_builder
asset-manifest --root . --assets assets --out asset-manifest.json --markdown asset-manifest.md --js-out asset-manifest.js
```

## Useful options

```bash
asset-manifest --root . --assets assets
asset-manifest --root . --assets assets/blacklight --markdown docs/asset-manifest.md
asset-manifest --root . --assets assets --include-hashes
asset-manifest --root . --assets assets --query blacklight_homepage_promotional_images
```

By default the tool avoids expensive file hashes. Add `--include-hashes` when you want SHA-256 values for deduplication or verification.

## What gets recorded

Each asset entry includes the repo-relative path, public web path, filename, extension, asset kind, MIME type, folder, size, modified time, and searchable tokens. Image files also get dimensions when they can be read using the Python standard library.

The generated public path intentionally uses forward slashes and no leading slash, which is the safest form for GitHub Pages files referenced from pages in the same repo.
