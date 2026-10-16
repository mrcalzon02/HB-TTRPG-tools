# The Beckenburg Project — Alpha 1.6: Architectural Acoustics & Finite Search

**Status:** Implemented in the Java 17 LAN host and covered by automated regression tests. This is **not** produced sound effects, fully simulated spatial audio, a pathfinding navmesh, final ghost AI personalities, or a Windows-tested release.

## Working gameplay

`LanAcoustics` propagates sound over the actual authored room graph. Open thresholds cost one propagation unit; closed doors cost three. Cellar masonry and the garden/exterior transition impose additional absorption. Each sound class has a finite budget: quiet footsteps 1, doors/equipment 4, rituals 8. A closed door therefore blocks weak footsteps that the same open door would transmit. Ghost-safe van staging is excluded regardless of event loudness. The server uses its own door state; clients cannot supply acoustic costs or privately disclose hunter positions.

A legitimate host-validated footstep, door, scan, ward or ritual may create an acoustic event. The AI retains one most-relevant **quantized two-meter** sound tile and a finite lifetime that shortens with architectural attenuation. It uses the existing legal room transitions and validated `LanGhostSpatial.step()` to investigate. Upon expiry, it briefly searches the old region using a series of four waypoint offsets. No subsequent live position update is supplied to the search. After 24 additional ticks, the sweep is forgotten; new sounds can replace it. A search alone cannot authorize `STRIKE` or `MANIFEST`. Human and AI ghosts retain identical ability costs, damage and cooldowns.

The ghost's network `STATE` no longer exposes a raw same-room-hunter flag. Its single-bit hearing cue becomes active only after an actual audible host event and expires after 12 ticks. Private hunter body coordinates, team map, evidence progress and AI memory are not transmitted to the human ghost.

## Tests and acceptance

- `LanAcousticsTest`: threshold open/closed changes and sound budgets; stone cellar, exterior and van exclusion
- `LanGhostSearchTest`: clue expiration, four bounded stale-area search positions, legal DRIFT, no post-expiry attacks, final cleanup
- `LanGhostHearingIntegrationTest`: four real TCP clients, ghost hearing message lifetime, no private hunter telemetry
- `LanGhostPursuitTest`: existing 2m memory, legal route and spatial movement parity
- Prior network, ritual, positional appearance, strike wind-up, renderer and economy tests remain mandatory

**Architectural scope limit:** Small weighted room graph only. This does not perform waveform simulation, ray-cast hearing through different solid materials, multistory reverberation, environmental audio playback, spatial footstep volume cues, full furniture collision search, or realistic occlusion on the other eight maps. Those must be validated when the site and audio authoring pipeline matures.

**Next recommended slice:** Sound event prioritization, AI visual investigation/search animations, chase de-escalation and player-facing gameplay/audio cues, followed by map-specific sound materials and deterministic profiling on Windows.
