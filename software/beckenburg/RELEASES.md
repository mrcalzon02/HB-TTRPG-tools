# Beckenburg — Windows installers and independent updates

Beckenburg is a separate product inside `mrcalzon02/HB-TTRPG-tools`, with its own GitHub Release tag namespace: **`beckenburg-vMAJOR.MINOR.PATCH`**. Do **not** use `/releases/latest`, because the same repository publishes Sound Manager and other products. Release downloads are at [Beckenburg release listings](https://github.com/mrcalzon02/HB-TTRPG-tools/releases?q=beckenburg-v).

## Dedicated GitHub Actions release job

`.github/workflows/beckenburg-release.yml` is authorized specifically for Beckenburg. On a push changing `software/beckenburg/**`, it attempts the next **patch** release. Use **Actions → Beckenburg Windows Installer and Release → Run workflow** to increment **patch**, **minor**, or **major** explicitly. The job serializes releases to prevent overlapping tags, obtains only existing Beckenburg tags, builds/executes the Java 17 regression suite on a Windows runner, and produces:

- `Beckenburg-X.Y.Z-Windows-x64.exe` — per-user Windows EXE installer;
- `Beckenburg-X.Y.Z-Windows-x64.msi` — Windows MSI installer;
- `Beckenburg-X.Y.Z-Windows-x64.zip` — portable JRE-bundled app image;
- `SHA256SUMS.txt` — hashes for all three assets.

Both installers use a **fixed upgrade UUID** so future Beckenburg versions upgrade the same installed app. Neither touches the separate Sound Manager installation. Packages include the Java runtime and currently shipped source-backed PSX meshes/sprites. Builds fail rather than publishing an installer missing the original model resources. Builds are unsigned: Windows SmartScreen may ask for confirmation. This remains a **development/alpha game**, not a claim that all intended game systems are finished.

The workflow creates a **draft**, uploads every asset, reads back asset names and sizes, then publishes only after verification. It passes `--latest=false` so Beckenburg does not hijack the repository's unrelated `/releases/latest`. Failed builds or uploads do not publish a new release. No raw purchased source pack ZIP is shipped separately; only selected assets already packaged in the game's executable JAR.

## In-game updater

The classic Beckenburg menu includes **UPDATES**. It checks its own `beckenburg-v*` release tags, and offers only newer, stable, published releases with the exact Beckenburg Windows installer name and a matching `SHA256SUMS.txt`. The update checker is asynchronous and optional; the checkbox controls daily background checks. It remains usable offline. The updater follows HTTPS redirects only within approved GitHub domains, enforces size limits, verifies SHA-256 before staging an installer in the user's app-data folder, and **never runs an installer without a second explicit confirmation**. Settings and saved profiles are kept outside the installation directory. This updater does not auto-install an arbitrary GitHub repo release.

The `release.properties` packaged resource is stamped with the actual version by the Windows workflow **after tests, before jpackage**. Locally built developer JARs without a stamp report `0.0.0` to distinguish them from verified release artifacts. `BeckenburgUpdatesTest` tests tag isolation, version ordering, and untrusted-URL rejection without network access. Native Windows packaging, WiX availability and installer execution must be verified from the GitHub Actions run before claiming an actual downloadable release.
