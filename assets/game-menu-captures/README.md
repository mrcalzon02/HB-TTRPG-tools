# Authentic game menu capture archive

The image shown as a game's software-catalog title card must be an actual captured
framebuffer from a running build of that game. Marketing illustrations, source
concepts, UI wireframes, model previews, loading splashes, and another game's
screenshots are not substitutes.

## Contents and attribution
- `<repository>/title.png`: primary game-menu or active application screen.
- `<repository>/menu-*.png`: additional visible runtime navigation menus captured
  by interacting with the game's real controls.
- `<repository>/capture.json`: source repository commit SHA, capture origin,
  timestamp, screenshot checksums, and any runtime observations.
- `capture-report.json`: which records passed the archive publisher and which
  could not be promoted.

The previous original-art preview field in `software-catalog-data.js` is
preserved for historical/reference purposes; `previewLocal` takes precedence
only after a validated runtime screenshot is in this archive.

## Remote process

The [capture-game-menu-archive workflow](../../.github/workflows/capture-game-menu-archive.yml)
clones the authoritative repositories at explicit Git commits, opens the actual
running web or desktop game, captures visible menu frames and publishes only
validated PNGs. Its publisher verifies PNG structure, dimensions, contrast,
SHA-256 and source revision. Each game is independent: a failed build is logged,
never silently replaced with concept art or another game's frame.

The browser captures prove the running web versions of Nut Buster, Jewel Brook
and Fleet Designer; they **do not certify installed Android APK or signed-release
parity**. Java game capture uses a Linux X11 virtual display and is not Windows
or Android hardware acceptance.

ReverieVR, its individual native VR games, Adventure Game Studio legacy games,
Minecraft packs and Factorio/Valheim mods require their corresponding playable
host/runtime to obtain authentic menu screenshots. They remain uncaptured until
that actual runtime is exercised. No simulated host menus should be promoted.

Manual visual review is still appropriate for ensuring the menu is settled,
legible and representative; a checksum alone cannot prove artistic quality.
