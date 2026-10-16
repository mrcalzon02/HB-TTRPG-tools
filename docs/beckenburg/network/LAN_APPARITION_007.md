# Alpha 1.3 — Host-Authorized Spatial Apparitions

## Implemented

- `LanApparition`: a pure visibility projector using server-owned ghost pose and hunter body, checked against same-room, 10-meter line-of-sight and current solid/door map state. No client-supplied target coordinates.
- `LanHost`: per-hunter `APPARITION|VISIBLE|x_mm|z_mm|tick` or `APPARITION|HIDDEN|tick` packets on 3D entry, manifestation, drift, spectral movement, and the periodic authoritative snapshot. Never transmitted to the ghost seat.
- `LanWorldPanel`: parses strict bounded packets on the Swing EDT; clears stale visual manifestations; displays an immediate in-world warning.
- `SceneRenderer`: accepts a spatial apparition model and positions the low-poly entity at the host-provided coordinates, while leaving the original legacy room-only rendering API intact.

## Acceptance checks

- `LanApparitionTest`: visible/hidden transitions, different rooms, room-only compatibility, door occlusion, 10m range, malformed coordinates/tick.
- `LanApparitionRenderTest`: full 320x200 raster changes as the ghost position changes, and returns exactly to baseline upon despawn.
- `LanApparitionIntegrationTest`: four real TCP clients, distant hunter privacy, a naturally-timed, legal manifestation by a human ghost, and authoritative despawn after a legitimate `DRIFT`.
- All preceding gameplay/ghost/domain/room/van/network tests must remain green.

## Limitations and next slice

This is **a positional sight projection and warning**, not completed AI hearing/pursuit, a delayed strike telegraph, directional swing animation, client-side interpolation, or final low-poly character assets. The core GhostDomain ability legality/cost/cooldown rules are unchanged, preserving human/AI parity. Tested with OpenJDK 21 `javac --release 17` and local loopback sockets on Linux. No Windows 3v1 physical test has been performed. Future iteration: a reversible, readable pre-strike wind-up validated again at impact against same-origin target and closed doors, then spatial hunt/chase.
