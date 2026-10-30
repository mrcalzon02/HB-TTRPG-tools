# NPC/AI Tools — Host Telemetry, Navigation Audits & Seeded Rule Scenarios

**2026-10-30 implementation checkpoint.** Companion to [NPC/AI canonical rule inspector](psx-npc-ai-authoring.md) and the [PSX NPC-AI adoption analysis](https://github.com/mrcalzon02/The-Beckenburg-Project/blob/main/docs/ai/PSX_NPC_AI_ADOPTION.md). This page records actual Java 17 source entrypoints and explicitly distinguishes host instrumentation from authoring-only tests.

## Live, per-host performance sampling

`org.beckenburg.editor.ai.NpcAiTelemetry` is a **portable, bounded diagnostic recorder**, compiled into both the standalone level editor kit and the game. `LanHost` owns **one instance per host**, and `LanGhostPursuit` receives that instance for acoustic/route timing. Metrics are:

| Metric | Actual code path instrumented | Note |
| --- | --- | --- |
| `HOST_TICK` | `LanHost.tickSafely()`, including real simulation processing | Whole host tick, not AI-only CPU cost |
| `PERCEPTION` | `ghost.observe()` inside authoritative AI tick | Host-generated legal action observation only |
| `DECISION` | `LanGhostPursuit.decide(...)` inside host tick | Actual production AI choice, not the authoring workbench |
| `APPROACH` | `LanGhostPursuit.approach(...)` inside host tick | Direction decision; `LanGhostSpatial.step` still owns movement |
| `HEARING` | `LanAcoustics.audible(...)` in real host sound delivery, and `LanGhostPursuit.heard` acoustic processing | May record two distinct checks for one audible event |
| `ROUTE` | `LanGhostPursuit.route(...)` | Real bounded BFS; no replacement pathfinder |

Each metric records **at most the newest 256 durations**, while retaining a total call count. `snapshot()` computes p50/p95/p99, minimum, maximum and mean over the current window. **No hunter coordinates, identity, health, inventory, secret role, journal, inferred position, acoustic cell location, or other player information is recorded.** No telemetry is sent to any multiplayer packet or GhostDomain observation.

Profiling is disabled by default. To enable it for a **locally controlled host process**, start the JVM with `-Dbeckenburg.ai.profile=true`, or invoke `LanHost.enableAiDiagnostics(true)` through trusted *in-process* developer code. `LanHost.aiDiagnosticsSnapshot()` returns a read-only snapshot; `aiDiagnosticsCsv()` provides a CSV report. When a profiled host is closed, it prints the aggregate CSV to **local stderr**, never the LAN. `NpcAiTelemetryReport.save(...)` supports atomic export of the same aggregate CSV. The flag is opt-in because even nanosecond sampling has runtime overhead.

**Important limits:** these are Java wall-clock timings of real functions on the hardware that executes them, **not GPU frametimes**, absolute CPU-cycle counts, complete Java allocation/GC analysis, or proof of stable 30/60 FPS. Compare p50/p95/p99 to real baseline captures and the separate door-opening profiler before altering cadence. Disabled sampling must impose negligible overhead and never change the AI decision logic.

## Real-world portal and acoustic navigation audit

`GhostAiNavigationAudit` reads the actual `HouseMap.ghostExits` (including authored doors/stairs) and `LanAcoustics.cost`. It lists directed links, reverse-link problems, unreachable room IDs, acoustic disconnects and the van/extraction boundary. `GhostAiNavigationAudit.path(map,from,to)` computes a **read-only** bounded breadth-first traversal; it **cannot** move the ghost or grant illegal wall travel. Closed doors can still be an authorized route: the collision/door API decides whether physical passage is possible at execution time.

The editor's **NPC / AI → AUDIT NAV** takes an existing authored site from `HouseMap.Site`, constructs a **fresh, isolated** map, and reports links, route-to-origin and hearing losses. It does not edit that map or perform live-scene traversal. Findings are diagnostic: an intentionally isolated room may not be a gameplay defect; verify authored layout before repair. Future live visualization should use actual editor camera/viewport overlays and jump-to-problem rather than a second scene renderer.

## Seeded, bounded ghost-rule scenarios

`GhostAiScenarioRunner.run(species,site,durationTicks,seed,syntheticSound)` runs for **1–1800 ticks** using actual:
- `GhostDomain.advance/observe/dispatch`, including real energy/cooldowns/legal actions;
- `GhostActionCadence` with a **seeded authoring-test RNG** for reproducibility;
- `LanGhostPursuit.decide/heard`, with the game's real `LanAcoustics` and portal graph;
- the shared `NpcAiTelemetry` for observed rule/decision/hearing/route costs.

A synthetic sound source may pulse every 40 ticks from **authored room 4**. Its position is a controlled test marker, **not a real player tracker**. No physical strike contact is ever supplied, so the runner rejects all `STRIKE` attempts. It stores at most 128 recent action resolutions. Results expose accepted, rejected and DRIFT counts, remaining rule-domain energy and aggregate timings. All rule decisions use real code, but this **is not a full LAN host, physics, ghost pose/collision, camera/lighting, ward, frenzy or player-contact simulation**. The editor's **NPC / AI → PROFILE RULES** displays this isolated trace and performance metrics, with explicit scope warnings.

## Diagnostics acceptance and next integrations

- The `NpcAiTelemetryTest` portable regression validates default-off behavior, bounded rolling percentiles, opt-in toggles, reset, and CSV with **no session secrets**.
- The `GhostAiNavigationAuditTest` game diagnostic validates actual portal edges, hearing costs, no extraction path and instrumented pursuit hearing.
- The `GhostAiScenarioRunnerTest` runs multiple base/Ancient/Elder species with a fixed seed, compares repeatable action traces, and forbids synthetic strikes. These game-side performance/behavior tests are **non-blocking diagnostics** under the release policy; failures still need repair and honest reporting.
- The full game build/launch, authentic ghost-human parity and essential multiplayer are the only applicable objective release gates. Subjective AI balance, timing targets and retro aesthetics remain advisory.

**Still outstanding:** a permissioned **live-host readout** wired into the developer UI (currently profiling is readable in the local process or stderr, while editor profiling is isolated), physical waypoint/door geometry visualization, acoustic topology invalidation metrics, event/collision/animation and memory-allocation profiling, actual Frenzy/ward/ritual scenarios, AI ally adapters, and LAN AI/human equivalence tests. No hardcoded native-PS1 scratchpad or NPC slot limits.
