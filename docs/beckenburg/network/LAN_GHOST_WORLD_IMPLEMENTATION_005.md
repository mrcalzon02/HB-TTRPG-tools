# Beckenburg Alpha 1.1 — Spatial LAN Ghost and Unified Commands

**Delivered development slice:** real fourth-player ghost-facing first-person 3D viewport bound to an authenticated LAN ghost seat. Uses the same authoritative `GhostDomain` action dispatcher as AI. Does **not** yet deliver a completed four-player competitive 3D match, targeted 3D attack collision, finished equipment models, 13 ghost species or Windows production installation.

## Contract

- On joining a four-seat LAN lobby as Ghost, readying, and starting a match, **Enter 3D World** opens `LanGhostPanel`, separate from the hunter `LanWorldPanel`.
- The host alone owns the ghost's position within its current room (`LanGhostSpatial`). `GVIEW3D` opens the spectral feed; `GSTEP|dx|dz|sequence` submits normalized movement requests, once per simulation tick; `GTURN|degrees|sequence` submits heading. The server bounds speed, validates sequence, prevents safe-van ingress and prohibits crossing room boundaries through this pathway.
- **Crossing rooms** remains an ordinary paid, cooldown-gated `GhostDomain.Action.DRIFT` through the existing `GHOST` dispatch. Every other action (`WHISPER`, `DISTURB`, `MANIFEST`, `STRIKE`) retains identical AI/human energy, damage, visibility, gating and cooldown rules.
- The ghost-only `GPOSE|room|xMm|zMm|heading|tick` host frame updates the local spectral camera. It is never sent to hunters. The ghost never receives `BODY`, `TEAMMAP`, `DOORS` or `PROGRESS`, which contain private hunter world state and investigation data.
- The spectral camera is not an extra power. The host continues to apply evidence, hunt effects, manifestations and damage based on the existing `GhostDomain` room-level contract. First-person ghost movement inside a room does **not** improve attack range or reveal hunter coordinates. Next slices must connect spatial targeting, audible-only clues and line-of-sight gameplay without creating privileged ghost commands.
- Both hunter and ghost lobby field commands now call the typed `LanClient` methods, which own one monotonically increasing client input sequence. Mixing lobby controls and the first-person viewport cannot reset the action sequence.

## Controls

`WASD` roam spectrally within the current room; click once for unheld mouse-look (arrows also rotate); `[`/`]` select adjacent spectral destination; `SPACE`/`ENTER` requests `DRIFT`; `1` whisper; `2` disturb; `3` manifest; `4` strike; `ESC` closes viewport and restores pointer. Only available/legal ghost actions succeed; rejected actions return explicit host feedback. Initial manifestation and strikes remain restricted by the shared ghost timing and proximity rules.

## Verification and gates

New Java 17 tests:

- `LanGhostSpatialTest`: bounded movement, repeated tick rejection, room boundary confinement, van safe-room rule, legitimate drift camera reset.
- `LanGhostIntegrationTest`: actual four-client TCP session; wrong-role 3D requests rejected, oversized and replayed motion rejected, room drift governed by existing ghost rules, no private telemetry leak.
- `LanGhostGuiTest` (Linux graphical Xvfb): real ghost lobby connects, readies, starts via three real hunter connections, opens `LanGhostPanel` and produces a nonblank rendered 3D image with host-assigned spectral position.
- Modified `LanWorldGuiTest`: verifies original hunter viewport still opens through renamed shared **Enter 3D World** control.
- Existing headless gameplay, equipment, ghost parity, world collision, networking, van and material tests run by `build.sh`/`build.cmd` remain mandatory.

**Still blocking:** physical Windows multi-PC LAN acceptance; human ghost spatial attack/equipment counterplay; actual hunter/ghost overlap and event-driven visibility; lag, interpolation, reconnect and disconnect recovery; production models/UV atlases/original concept PNGs in source and gallery; thirteen species; balance, installer and release gate documentation.

No GitHub Actions are added or required. Only count committed when remote HEAD and each changed source blob are read back with matching bytes.
