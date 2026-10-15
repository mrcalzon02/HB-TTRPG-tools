# The Beckenburg Project — Java 17, Swing, 3D and LAN Architecture
Status: engineering proposals requiring Stage 1 and Stage 3 technical proofs. Nothing here asserts working application code.

## Local engineering progress — 2026-10-15
`software/beckenburg/src/main/java/org/beckenburg/GhostDomain.java` now supplies one in-process GhostCommand dispatcher for legal adjacent drift, haunting whispers, room disturbances, manifestations and incremental strikes. It validates energy, target room, per-action cooldowns, early attack windows and command sequences. `AiController` sees only filtered room-local hunter presence, its own room/anchor, exits, legal actions and energy; it submits commands to the same dispatcher a human ghost controller will use. `InvestigationSession` now consumes authoritative resolutions rather than mutating ghost movement and damage directly. Unit tests compare AI/HUMAN-labeled action results and negative cases. This is **not LAN host authority, player ghost input, or completed P09**.

## Process model
Windows-distributed Java 17 desktop product. Swing/AWT launcher provides profiles, settings, local host/join, class selection, server browser, crash reporting and patch/version information. A real-time engine owns the 3D view, input mapping, world physics, scene graph, shaders, audio and rendering. jMonkeyEngine is a priority feasibility candidate; assess supported Java version, LWJGL backend, native packaging, GL driver compatibility, animation and physics, and Swing canvas integration. A dedicated 3D window launched from Swing is acceptable if embedding causes input/focus or rendering fragility. Prefer reliable behavior over artificial "Swing inside the 3D viewport" requirement. UI thread updates remain on EDT; renderer/world mutates on engine/simulation thread.

## Suggested modules (to validate)
launcher-swing: login-free profiles, settings and join flow.
client-3d: graphics, audio, scene, input, interpolation and HUD.
shared-protocol: versioned DTOs, enum IDs, schema tests and bounded serialization.
simulation-core: fixed-step state, host rules, command validation, damage, evidence, rituals, progression.
ghost-domain: archetypes, abilities, action dispatcher and sensory observation generator.
ghost-ai: command-selection controller based on legal GhostObservation; no extra action pathways.
multiplayer-lan: discovery, direct IP, reliable session control, transport, reconnect and host snapshots.
content-data: validated locations, props, classes, ghost definitions, ritual/equipment catalogs.
persistence: atomic profile/campaign saves, versioned migrations, safe-recovery backups.
test-harness: headless simulation, deterministic transcripts, cross-client sync tests and replay logs.
Keep dependency direction toward core. Do not allow desktop UI code into authoritative simulation module. Do not couple ghost AI decisions to a rendering scene node or the host window.

## Core event and command design
HunterCommand and GhostCommand are typed, timestamped, rate-limited requests with a source participant and sequence number. An AI ghost emits the same GhostCommand as a human player. Host command dispatcher validates seat, current state, target, energy, cooldown, line-of-influence, phase and map zone. It transforms the world and produces authoritative WorldEvents for audiovisual clients and journal recording. Never trust client-supplied coordinates, damage, observed type or XP. Event includes stable unique ID so replay, network retry and payout cannot apply it twice.

## Network specification
Local UDP broadcast/mDNS-like discovery is optional convenience, never the only way to connect; direct IPv4/IPv6 host address and configurable port are required. For the first slice consider a reliable transport for commands/mission state with timestamped state snapshots; test whether a hybrid fast-path is necessary for camera/player movement before deciding. Configurable host tick rate (initial experiment 20–30 Hz), buffered interpolation and packet serialization budgets are measured, not asserted. LAN sessions require version/content handshake and explicit host ownership. Four seats max in initial mode; unauthorized commands from wrong role rejected. Ship without port-forwarding, account or external relay dependency. Security still matters on LAN: bounded payloads, no arbitrary file writes, no unsafe Java deserialization, protocol validation and session-local token.

## Simulation and physics
Fixed step simulation independent of render update; consistent map coordinate frame and transforms for head/camera, prop center of mass, doors and ghost phase. Physics impulses constrained by host, with authoritative object transforms. Dead-reckon only visual player movement and smoothly reconcile; do not predict final ritual success, wounds or money. Every environment and spectral route resolves to an authored zone graph. Energy, damage and status effect resolution deterministic for repeatable seed/event sequences. Instrument readings derive from simulation events and calibrated environmental baselines. Events that ghost deliberately fakes have hidden true origin but objective physical effects.

## Human ghost / AI ghost symmetry
GhostController interface: receives same filtered GhostObservation (permitted sightings, heard sounds, sensed ritual disturbance, own energy, known zones and legal action affordances), emits GhostCommand. AI may keep uncertainty model and select weighted actions but cannot read hunter inventory/position by direct simulation access. Human HUD maps action IDs to buttons, target selection and cooldown indicators. Both dispatch through one validation path. Use automated golden-action tests for every archetype, with AI and human commands compared under identical world state. An explicit controller swap is event-logged.

## Content pipeline
Versioned JSON or equivalent human-editable definitions with schemas for maps, ghosts, equipment, rituals, class progression and economy. Level package contains scene asset manifest, zone graph, nav links, ritual sockets, prop placement, lights and acoustic graph. Build import validator detects duplicate IDs, missing references, cyclical invalid room paths, absent counterplay and unsupported versions. Content loading fails with readable diagnostics instead of silent fallbacks. Runtime mods/user maps are not part of minimum viable release.

## Persistence and recovery
Separate settings, player identity/profile, purchases/unlocks and host campaign/site state. Save atomically to temporary file + sync + rename where feasible; keep recoverable prior version and schema migration path. Host finalizes mission outcome with idempotent transaction identifier. Version/schema mismatch offers recovery guidance, not destructive implicit reset. Records remain local; document privacy and file location. Do not pretend local-host multiplayer has tamper-proof economy across self-managed hosts.

## Performance and QA targets
Choose hardware floors only after profiling. Measure client FPS/frame-time p95, CPU/GPU utilization, 1% low, network event backlog, tick p95, scene heap, startup time, 4-seat simultaneous player/object interactions, loading and memory growth across 20 resets. Offer resolution, shadows, light count, audio and interface scaling. Long-run physics prop tests and network tests must cover Windows installs on different hardware. Avoid baked-in vendor-specific renderer assumptions.

## Build, test and Windows release
Local reproducible toolchain and dependency lock; unit and headless integration tests executed with explicit commands. Verify Swing/engine integration in windowed and fullscreen modes, clean install and uninstall, unsigned/signed artifact provenance as authorized, JDK runtime packaging (jpackage candidate), asset integrity, version metadata and deterministic smoke levels. Respect project rule: do not introduce GitHub Actions by default. Only call a release downloadable after verifying the release asset and its downloaded contents.

## Risks and mitigation gates
- AWT/GL canvas focus and high-DPI: S1 spike with direct-window fallback.
- Frame/network tick disagreement: S2 replay and S3 jitter tests.
- Object explosion or door trap: bounded impulses, server collision checks and adversarial S4/S6 tests.
- AI omniscience: filtered observations and negative unit tests proving hidden state cannot be accessed by ghost AI.
- Inconsistent evidence: all readings are event-derived, seeded and correlated across clients.
- Fractured source of truth: one content schema and one authoritative main branch, decision log and read-back verified commits.
- Development under tight resource constraints: maintain vertical-slice priority over nine simultaneous maps, and gate content expansion on real LAN and simulator success.