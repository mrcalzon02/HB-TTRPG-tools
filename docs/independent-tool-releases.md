# Independent Foundry tool releases

Each desktop or mobile tool may publish actual GitHub Releases in this repository using a unique product tag prefix and numeric version. Simple Sound Manager uses `simple-sound-manager-v0.6.1`. Other tools should reserve their own prefix, not share version tags or assume the repository's latest release belongs to them.

Publish a release against the full source commit, with clearly named platform assets, source, release notes, and SHA256SUMS.txt. Stage the release as a draft until all assets are uploaded, then publish it. Do not mark an independent tool as the repository-wide latest release: existing Barotrauma download links use `/releases/latest`. Sound Manager's updater skips drafts, previews, and other tools, and compares its own versions numerically.

An updater must identify its exact product and compatible platform asset, validate GitHub HTTPS download URLs and published SHA-256 digests, bound download/extraction, and reject unsafe archives. Failed/offline checks must preserve local functionality. Show installed and offered versions, release notes, and explicit Update / Not now. Installation must be a deliberate action with recoverable settings and clean shutdown of active resources.

Keep the public tool page and per-tool release.json synchronized with the published tag and download assets. Never commit runtime settings, audio recordings, user logs, credentials, or build environments. App binaries belong in release assets rather than repository history.
