# Beckenburg Alpha 1.2 — Host-Owned Spatial Ghost Contact

**Implemented:** LAN strike targeting through the shared `GhostDomain` command path. This slice does not finalize all PvP combat, behavior, 13 ghost species or a Windows release.

## Server-side acceptance

- `LanSpatialCombat` uses the host's `LanWorld` hunter bodies and `LanGhostSpatial` pose, never client-supplied hit coordinates. The strike radius is 2.0 world units. A short sampled ray checks `HouseMap.solid`, including server-controlled closed doors.
- Among 3D hunter seats in the ghost's room, only the nearest reachable hunter receives direct strike injury. Separated or occluded 3D teammates are unharmed. Ties are resolved deterministically by seat index.
- Legacy room-only seats keep the room-based contact behavior until the legacy lobby simulation is retired. This is a compatibility exception by simulation mode, **not AI/human ghost type**.
- Both AI and human ghosts are gated by the same `LanSpatialCombat.victims()` test. A human attempt without eligible victims is rejected before consuming ability energy. The host consumes the input sequence even for rejected out-of-reach attempts, preventing delayed replay. AI does not gain hunter coordinate telemetry; it still needs proper bounded sensory navigation in a later slice.
- `LanCase.applyGhostEffect` now accepts a host-computed victim mask for exact per-seat harm and fear projection. No client can submit damage or a victim mask. Wards, normal room-based haunting, and cleansing disruption retain their established behavior.

## Verified tests (Linux, Java 17-targeted)

- `LanSpatialCombatTest`: unique nearest target, out-of-range rejection, line-of-sight through open/closed doors, legacy mode compatibility and targeted `LanCase` injury.
- Existing `LanLobbyTest` four-client scenario: same AI/human `GhostDomain` gates, staged manifestation, incremental injury and anti-replay continue working.
- Full `sh build.sh` Java 17-targeted test suite passed after an initial combined-run timeout; isolated `LanLobbyTest` and a full clean rerun both passed.
- Previous Alpha 1.1 four-seat `LanGhostGuiTest` Xvfb test passed; this slice changes no rendering.

## Remaining hard gates

AI perception-limited proximity navigation and hunt approach; attacker facing arc; visible strike windup and animation; real teammate capsule collision and lag compensation; 3D ghost sight/footstep clues; ghost-type variation; physical Windows multi-PC playtest; profile/save reconnection and complete visual asset pipeline. The Beckenburg stage ledger must not mark P08/P10 complete based on this preparatory slice.
