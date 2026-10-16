# Alpha 0.7 — Host-Authoritative LAN Transport: Vertical Proof

The first LAN development slice implements an actual TCP listener and direct-IP client, not simulated message passing. Java 17 standard library only; no new online dependencies or GitHub Actions.

## Implemented
- TCP listener bound to specified interface/port, configurable direct-IP join UI, 3 hunter sockets + 1 ghost socket with seat-bound commands
- Protocol version handshake and clearly rejected incompatible/invalid/occupied seats; maximum 512 ASCII bytes/frame and validated numeric/name bounds
- Host-owned ready/start lifecycle: Hunter 1 authorizes launch after 3 hunters are ready, optional ready human ghost or AI vacancy
- 100ms host fixed-tick clock, with room-level host positions (not simulated 3D avatars) and filtered per-seat snapshots
- Ghost action path uses the existing `GhostDomain.dispatch` (same energy/tick/cooldown/damage as offline AI and local human practice)
- No client-supplied source, injuries, ghost energy, objective success or private observation; ghost cannot read hidden hunter rooms
- Unit/loopback integration cases: four sockets, fifth rejected, readiness/start gating, seat privilege rejection, replay, impossible movement, early attack, legal manifestation and incremental strike, AI fallback
- Swing Host/Join room-test panel added to existing playable app while preserving solo hunter and ghost practice.

## Limitations / mandatory next tasks
This is a networking **proof of shared host authority**, not completed 3v1 gameplay. Match state currently consists of rooms, energy, manifestations and injury events; full 3D transforms, client-side interpolation, object interactions, equipment evidence, rites, recovery, versioned content hashes, reconnect and authoritative payouts all require subsequent gates. Doors and body collision are not yet simulated for remote room moves. A complete host security model needs per-session credentials, packet budgets, denial-of-service handling, hostile peer tests and firewall/docs. The UI is diagnostic, not a finished lobby. Host disconnect stops the round; start a fresh host for new sessions.

## Validation
Run `sh build.sh` on OpenJDK 17+ (compiled with `javac --release 17`) to execute all existing solo tests plus `LanProtocolTest` and `LanLobbyTest`. For a physical LAN test run host+three peers on separate Windows instances and record focus, firewall, address selection, disconnects and latency. A passing localhost test does not satisfy physical LAN/Windows acceptance. All source must be committed to `main` and read back before reported delivered.
