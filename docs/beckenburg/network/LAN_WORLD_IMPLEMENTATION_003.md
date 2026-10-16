# Alpha 0.9 — First-person network world, host-authoritative movement and doors

Status: tested local **3D hunter viewport and host-synchronized transforms**, not a complete four-player first-person PvP mission.

### Source and authority
- `LanWorld` owns hunter positions, yaw, collision checks, physically bounded displacement (0.31 m per accepted step), one movement command per 100 ms authoritative simulation tick, and a minimum 3-tick door toggle gap. Clients cannot submit an absolute position.
- `LanHost` accepts a `VIEW3D` transition per hunter; subsequent legacy room-jump `MOVE` commands are rejected. `STEP|dx|dz|sequence`, `TURN|degrees|sequence` and `DOOR|sequence` are checked against the existing seat and monotonically increasing global hunter sequence. Ghost seats are prohibited.
- `HouseMap` serializes validated sorted open-door IDs for the same physical wall/collision geometry. A door cannot close through a player's capsule.
- `BODY` messages use millimeter fixed-point coordinates and server tick, scoped exclusively to hunter seats. `DOORS` are hunter-only; `STATE` still filters ghost manifestation according to the existing rules. Ghosts receive no hunter team transforms, evidence totals, or full world-door list.
- `LanWorldPanel` renders the actual 320×200 textured house at a scaled resolution, with physically positioned low-poly remote hunter models and host-declared visible ghost manifests. Initial van spawn pads are spaced to avoid body-mesh camera occlusion.
- `LanLobbyWindow` opens the shared 3D scene without replacing legacy lobby/evidence controls. The first-person world remains a separate window during this interim milestone.

### Verification performed on Linux / Java 17 target
`sh build.sh`: all previous gameplay, solo ghost, room networking and evidence/ritual tests pass, plus `LanWorldTest`, `LanWorldIntegrationTest` with four real TCP clients, and `LanWorldRenderTest`. `LanWorldGuiTest` passed in Xvfb, opening a real host window, starting a three-hunter AI-ghost lobby and rendering both remote avatars; screenshot `lan-world-preview.png` captured separately. The socket test rejects wrong role, replay, oversized motion, and legacy teleport after switching to 3D mode.

### Remaining actual production gates
The LAN case and first-person 3D positions run together but shared full-world equipment, door click raycast, player body collision, ghost spectral 3D player control, physics, reconnect and persistent payouts are not yet integrated. Camera yaw is client-side for smooth look while the server records bounded heading updates. Rendering still uses procedural placeholder models rather than original concept art. No Windows desktop LAN multi-machine test was performed and no installer or signed executable is available. Do not mark P07/P08/P18 complete.
