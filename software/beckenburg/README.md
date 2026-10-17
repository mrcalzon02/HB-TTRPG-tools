# The Beckenburg Project — Playable Solo Investigation Prototype (Java 17)

## Solo field equipment and environment selection (development)

In the **solo** investigator launcher, choose the **House** location and one of three live scenarios: Normal weather, Power outage, or Heavy ground fog. These modify the real-time scene lighting and fog. Power-outage cases start dark; in the utility room, press **E** at the visible breaker to turn the building power on or off. The other eight listed location families remain **not playable** until individual geometry and traversal are implemented; the game does not load a renamed house in their place. LAN sessions continue to use their existing host-controlled house and three evidence tools; this new four-slot equipment rack is currently solo-only.

**Solo loadout controls:** **1–4** select one of four carried items, **R** operates the selected item, and **E** beside the van equipment rack opens a four-slot exchange panel. Every carried item must be distinct. The rack also refills camera film (6) and salt (3). EMF, thermometer, and spirit box remain the only three confirmed evidence types needed for the solo cleansing contract. UV scans for recent ghost traces; salt marks an interior room for later spectral passage; the camera requires a manifested apparition in front of the lens, within range and not hidden by a closed door. The first successful apparition photograph adds limited case payout on successful cleansing or retreat, not repeatable reward farming. Equipment, breaker and weather variants are connected to the real game session and software 3D scene, not a separate viewer.

For developer validation, `build.sh` and `build.cmd` compile the new cases `EquipmentSelectionTest`, `SoloEquipmentUseTest`, `SiteSelectionTest`, `CameraAimTest`, and `EquipmentSightTest`, and both package the directional sprite resource into the game JAR. Passing those tests and a GUI walk-through on the target machine remain release gates; an accepted source commit alone is not evidence of a Windows game run.

## Alpha 2.7 — 13 ghost evidence triples and three resolution sites (development)

New LAN matches hosted through the launcher choose one of the thirteen original ghosts. Each has three positive anchored evidence readings (EMF, thermometer, spirit-box), with subtype combinations that distinguish the full roster. The hunters must investigate, select a ghost identity (**I** cycles, **P** submits a deduction), prepare an anchor ward (**C**), then travel to the correct ritual installation and guard it: **N** banishes at the storage-cellar iron circle, **B** cleanses at the library font, or **V** performs absolution at the foyer memorial. Every type has exactly one correct rite; the host checks the equipment readings, deduction, room, and two-metre 3D rite range. Banishment, cleansing and absolution have different 55/45/60 tick channel lengths and terminal outcomes. The new PS-era low-poly fixtures are drawn in the existing house renderer. Teammate notes remain hunter-private. Human ghost clients are told their own species; their powers use the same type-modified energy, cooldown, fear and damage rules as AI ghost commands. Each archetype has a distinct favored action, host-audited mechanical profile and recognizable nearby supernatural tell; the full planned special-power repertoire and other eight complete 3D maps are **not yet** built.

Legacy room-mode demos using the two-argument `LanHost` constructor retain the original Spirit/anchor-cleansing behavior for compatibility; this is not the normal new-launcher session.

**Status:** a local solo investigation vertical slice, **not the finished four-player game**. It expands the original Swing/software-3D renderer experiment with a fifteen-zone test house (twelve interior rooms and three exterior spaces), low-poly room props, an AI-driven Spirit ghost, working evidence tools and a complete case-resolution loop. All artwork here is procedural placeholder geometry; the user-approved full-resolution PNG concepts remain awaiting verified GitHub binary archival and model integration.

## Alpha 2.6 — shared hunter casefile (development)

Host-authored LAN evidence now retains the investigator seat, named room, host tick, tool, finding confidence and actual reading from every accepted scan. Connected hunters get the same capped 32-note history; duplicate one-second samples are coalesced. Press **J** in the LAN 3D hunter view to open/close the compact casefile while the simulation continues. Closing and reopening the 3D view requests a replay without forging new evidence. Human and AI ghosts receive neither the private notes nor journal command access. This adds collaborative observation; ghost-type identification and final deductions remain future work.

The local unit and four-socket tests are `LanEvidenceJournalTest`, `LanCaseFileIntegrationTest` and `LanCaseFileHudTest`. These run with the existing `build.sh` or `build.cmd` commands.

## Alpha 1.5 — bounded AI acoustic pursuit (development)

The LAN AI ghost now listens to **legitimate footsteps, opened doors, equipment use and rituals** rather than drifting at random indefinitely. It retains one short-lived approximate sound location in two-metre cells, respects room-distance hearing limits and van safety, and follows the legal `GhostDomain` room graph to investigate. Once it reaches the source room, it walks toward the approximate cue using the **same host-validated spatial step** that the human ghost uses. The AI cannot access live hunter coordinates, private evidence or health; merely occupying the same room does not authorize a silent omniscient pursuit. Strike/manifest power costs, range, cooldowns and wind-ups still use the shared ghost dispatcher. `LanGhostPursuitTest` covers acoustic falloff, cue expiration, movement legality, route choices and information boundaries.

This is the first room-and-tile-level search behavior, **not finished player-equivalent AI**, positional audio, furniture navigation, Windows acceptance, or Gold release. See `LAN_GHOST_PURSUIT_009.md`.

## Alpha 1.4 — host-timed spectral attacks (development)

In the shared first-person LAN house, a legal spatial ghost strike now **winds up for eight authoritative 100 ms ticks** before dealing damage. Hunters in the affected room receive `THREAT|START` and a visible **GHOST STRIKE WIND-UP** warning; moving out of two-meter range, breaking door line of sight, or changing rooms avoids the hit. The host locks the original target at initiation: impact never silently retargets another investigator. Successful contact yields one victim-only damage event; evasion yields no damage, but the original energy and cooldown still apply to the ghost. This is the same resolution path for AI and human-ghost commands. Older non-spatial room-mode sessions retain their prior behavior. See `LAN_TELEGRAPHED_STRIKES_008.md` and the new `LanTelegraphedStrikeTest` and four-socket `LanTelegraphedStrikeIntegrationTest`.

**Remaining:** directional animation, supernatural audio and pursuit, online reconnect, authored assets, final balance, tested Windows LAN and installer; this is not Gold.

## Alpha 1.2 — spatial ghost strike targeting (development)

In the LAN match, both AI and player ghosts use one host-side reach and sight test before a strike consumes energy. A 3D strike reaches up to **2 meters** through unobstructed space and damages only the nearest eligible 3D hunter; closed doors stop it. Hunter coordinates remain private from the ghost client. Room-only compatibility seats retain their older abstract encounter behavior. The host rejects out-of-reach attacks and consumes their network sequence numbers to prevent replay; `LanSpatialCombatTest` validates reach, sight and single-target damage. This is **not yet** cross-map pursuit, spatial ghost animations or a complete 3v1 balance pass. See `LAN_SPATIAL_COMBAT_006.md`.

## Alpha 1.1 — first-person LAN ghost (development)

Three hunters and one human ghost can now enter their own rendered first-person LAN views. When the host starts a match, click **Enter 3D World**. Hunters use physical server-controlled movement, doors, equipment and rituals. The fourth player uses a violet spectral 3D camera, `WASD` movement within the current ghost room and mouse-look (click once to capture). Use `[`/`]` to choose an adjacent room and `SPACE` to make a host-validated, energy-costed `DRIFT`. `1` whisper, `2` disturb, `3` manifest, `4` strike; `ESC` returns to the lobby. Ghost abilities retain AI parity via `GhostDomain` and reject illegal actions. See `LAN_GHOST_WORLD_IMPLEMENTATION_005.md`.

**Limits:** Ghost pose is a view-only within-room camera, not positional attack authority; attacks, sensing and evidence still resolve at room level. The ghost never receives exact hunter positions or private evidence. This does not yet make the entire competitive 3v1 encounter spatial. Java 17 target; Windows real-machine build/install and multi-PC tests remain unverified.

## Run on Windows

Install a **Java 17 or newer JDK** to build (`javac`, `java`, `jar` on PATH). From this directory run `build.cmd`, then `build.cmd run`; or run `java -jar build\beckenburg-game.jar` after building. Requires a graphical desktop. The produced JAR is a development build and **does not yet bundle a JRE, installer, code signature or tested Windows native GPU driver path**.

On Linux/macOS with a JDK: `sh build.sh`, `sh build.sh run`. The launcher and Java2D 3D rasterizer have no external dependencies. Target class files are produced with `javac --release 17` (the local test environment uses a JDK 21 compiler targeting Java 17).


## Alpha 1.0: mouse-look and unified LAN field hotkeys

**Mouse control:** Click anywhere in the playable first-person viewport to lock and hide the pointer. Then move the mouse to look around **without holding a button**. The pointer automatically recenters on supported desktop systems to permit unlimited turning; it releases when the window loses focus, when the view closes, and when a solo case is paused. Click the view again to recapture after a menu or Alt-Tab. Arrow keys remain available. This applies to the solo hunter, local ghost practice and 3D LAN hunter. If the window manager prohibits desktop pointer movement, the camera falls back to relative movement inside the panel. The 3D HUD indicates whether capture is active.

**LAN first-person tools:** 1 EMF, 2 thermometer, 3 spirit box, R scan, C defensive ward, B cleansing, X extraction and E door. These actions go through the existing authenticated session command sequence and host-owned `LanCase`; nothing is locally awarded from pressing a key. The ghost-player 3D viewpoint is implemented as a host-validated spatial camera; precise 3D ghost attacks, full equipment models, gameplay balance, Windows hardware testing and a production installer remain to be implemented.

## Alpha 0.9: synchronized first-person LAN house (partial gameplay)

After the host starts a ready match, each player can select **Enter 3D World** in the LAN lobby. Hunter seats open the 3D hunter panel; the ghost seat opens the spectral 3D panel. That opens a separate textured first-person window with **WASD** movement, **click once to capture mouse-look** (no held button) or use arrow keys, **E** to open or close nearby doors, and **Esc** to return to the lobby. The original room-number controls remain as a **legacy room-simulation** mode, but are rejected once that player enters 3D mode. The host, not the client, advances bodies by a bounded movement impulse per simulation tick and checks collisions against the same physical `HouseMap` used by the renderer. It also owns door states, distributes teammate avatars to hunters, and displays host-declared manifestations; private hunter transforms and the team journal are not sent to the ghost seat.

To run the actual 3D LAN demo: on one machine choose LAN Host, then connect two other hunters by host LAN IP; optionally join a human ghost from a fourth client. All connected players choose Ready and Hunter 1 clicks Start Match, then hunter players click **Enter 3D House**. In the 3D viewport, press **1/2/3** for EMF/thermometer/spirit box, **R** to scan, **C** to ward, **B** to start cleansing and **X** to extract; each command is validated by the host. The legacy lobby still provides those controls; do **not** mistake this for a finished seamless 3v1 first-person experience. LAN operates on TCP port 27717 by default and may need Windows Firewall permission. The game still requires a local Java runtime.

Test with `sh build.sh` / `build.cmd` (includes `LanWorldTest`, `LanWorldIntegrationTest`, `LanWorldRenderTest`); under a Linux graphical display run `java -cp build/classes:build/test org.beckenburg.LanWorldGuiTest <optional_screenshot_path>`. This suite has passed locally on OpenJDK targeting Java 17 and Linux Xvfb; multi-PC Windows acceptance and real network latency testing remain outstanding.

## Currently implemented

- **Launcher:** title screen, Cleric/Observer/Demonologist selection, controls manual, session start and exit. Pausing exposes return/retreat safely.
- **Fifteen-zone starter house:** twelve named interior rooms (bathroom, master bedroom, nursery, living room, main hall, kitchen, library, dining room, study, storage cellar, foyer and utility room) plus rear garden, front porch and standard van staging. A single **grayboxed building**, not nine separate finished level categories. Rooms have real low-poly floor/wall/ceiling geometry and distinct simple props. Doors can be opened and closed, with authoritative collision in the local map model.
- **First-person 3D:** 320×200 internal RGB+depth triangle renderer, pixel-upscaled nearest-neighbor, simple fog and ordered pixel lighting. WASD movement, Shift sprint, click-to-capture mouse-look or arrows, room collision, flashlight.
- **Equipment:** EMF, Thermometer and Spirit Box emit different simulated signals linked to the ghost anchor or movement. Strong readings are journaled as confirmed evidence. The Observer and Demonologist get small profession-appropriate field advantages, and the Cleric receives an additional ward and reduced incoming damage.
- **Spirit ghost command foundation:** local AI chooses actions from a filtered GhostObservation and issues GhostCommand entries through the *same validator* human control will use. Adjacent-room drift, whisper, kinetic disturbance, timed manifestation and incremental strike have shared energy, cooldowns, sequence replay protection and opening-hunt safety. The shared local rules core now also feeds the experimental LAN room simulation below. Full remotely synchronized 3D movement, equipment and rites are not implemented.
- **Case closure:** record three instrument clues, place a ward at the real anchor, complete a simple cleansing action and return to the shared van staging extraction point. Early retreat pays only for collected evidence. Health defeat fails the case.
- **Progression seed:** atomic local Java Properties save, currency/experience rewards, schema validation, session receipt deduplication. Not a network economy or complete castle/shop.
- **Field interfaces:** map with marked rooms, live HUD, evidence journal, limited wards, case messages, equipment selection, and a contextual hold-Q wheel with eight validated map pings.
- **Shared staging van:** rotatable modular cargo shell, briefing panel, equipment rack, evidence/ping relay and functional extraction console. `E` interacts with its nearby stations, without breaking regular door interaction. This is one reusable layout designed for all maps; it is currently instantiated only in the test house.

## Texture atlas production slice

The Java 17 renderer now uses an actual **128×128 source-color atlas with sixteen 32×32 PS-era diffuse tiles**. Stone, plaster, parquet, ceramic, doors, ceiling panels, carpet, brick, wallpaper, concrete, soil, iron, foliage, aged wood, glass and ritual material are procedurally authored and shaded. Each zone chooses its own floor and wall families; doors receive wood grain. The rasterizer interpolates UVs *perspective-correctly*, including geometry clipped by the near camera plane, while preserving the original 320×200 nearest-neighbor pixel look and distance fog. `MaterialAtlasTest` checks atlas reproducibility, tile wrapping, room differentiation, illumination and clipping. This is an implementable *starter palette*, not final user-approved texture art or a completed nine-site kit.

Detailed technical handoff: [Texture Implementation 001](TEXTURE_IMPLEMENTATION_001.md).

**Asset handoff:** `MaterialAtlas.java` is the current runtime authority for the starter diffuse colors; individual authored PNG atlases, UV-model import, exterior materials, and original PNG concept gallery remain independent follow-up deliverables. No JRE/Windows installer or finished 3v1 LAN claim is implied.

## Controls

| Input | Action |
|---|---|
| WASD / Shift | Move / sprint |
| Click view once, then move mouse / arrows | First-person look without holding a button |
| F / E | Flashlight / interact with door |
| 1, 2, 3 | Select EMF / thermometer / spirit box |
| R | Scan and record instrument result |
| C | Place ward (near anchor it prepares the rite) |
| B | Cleanse (three clues and ward at correct anchor needed) |
| M / J | Floor map / evidence journal |
| X | Extract at entry marker |
| Hold Q, aim mouse/arrow direction, release Q | Contextual eight-option callout with local map ping |
| E in van | Interact with nearest briefing, equipment, relay, or extraction station |
| Escape | Pause / return-to-castle options |

## Validation and limits

`sh build.sh` / `build.cmd` compiles and runs `GameplaySmokeTest`, `GhostDomainTest`, `MaterialAtlasTest`, `TeamCalloutTest`, `VanStagingTest` and the original `SmokeTest` where present before packaging. The new test covers fifteen zone identities, geometry/depth rendering, door/collision, instrument signals, ritual preconditions, class-independent completion, sequential ghost safety, atomic save/load, corrupt-profile refusal and replay-safe payout receipts. On a Linux graphical test display, run `java -cp build/classes:build/test org.beckenburg.GuiSmokeTest [screenshot.png]` to verify menu→3D panel and capture a screenshot. GUI testing under a Linux virtual X display is evidence of Swing functionality, **not** Windows compatibility or install verification. The original S1 prototype remains in `BeckenburgPrototype.java` for renderer comparison.

**Not yet built:** production-quality unified 3v1 spatial combat and full gameplay parity across the 13-ghost roster; 12 other complete ghost implementations; final 3D mesh pipeline, maps/assets/audio; comprehensive damage/status balancing, all ritual types, equipment purchases, castle hub navigation, Windows packaged install/release. See `../../docs/beckenburg/RELEASE_PRODUCTION_PLAN.md` and the single progress `stage-ledger.json`.

## Ghost command parity milestone (source only)

`GhostDomain.java` introduces `Observation`, `Command`, `Resolution` and a single `dispatch` method for `DRIFT`, `WHISPER`, `DISTURB`, `MANIFEST`, `STRIKE`. The source label (AI/HUMAN) is attribution only, with no branch on controller origin; `GhostDomainTest` executes the same action sequences from both labels and compares every state transition. Ghost AI chooses commands from its own room, permitted exits, energy, cooldowns and **room-local audible hunter presence**, not arbitrary player coordinates, health, role or private journal. `InvestigationSession.tick()` uses this dispatcher for the existing Spirit encounter rather than mutating ghost state directly. This is a prerequisite for later P09/P10 3v1 functionality, **not evidence those stages are complete**.

Detailed handoffs: [Shared Van Module](VAN_MODULE.md), [Alpha 0.5 Implementation](IMPLEMENTATION_SLICE.md).

## Alpha 0.6 — Local human-ghost practice

The **GHOST PRACTICE / LOCAL** button is a functional second game mode. It starts a
spectral first-person camera in the 15-zone house and uses `GhostPracticeSession` as
an in-process controller for the real `GhostDomain` host-style rules. Ghost movement
is room-to-room phasing at this stage, not a full free-flying spectral rig. The
practice hunter is an intentionally basic scripted trainee, not a playable hunter
or one of three LAN participants. Two legal incremental strikes complete the
practice objective; it does not award campaign currency or XP.

| Ghost input | Action |
| --- | --- |
| `[`, `]` | Select adjacent spectral destination |
| Space / Enter | Phase into selected adjacent room, subject to legal action rules |
| `1`, `2` | Whisper / environmental disturbance |
| `3`, `4` | Manifest / strike, subject to warning and cooldown rules |
| Click view once, then move mouse / arrows | Orient spectral viewpoint |
| Escape | Return to main menu and the original hunter mode |

The ghost HUD exposes own room, current energy, legal actions, permitted exits,
nearby *audible* hunter presence and match-state feedback. It does **not** reveal
the trainee's unseen position, private evidence, health or equipment. Both the AI
and manually controlled ghost use `GhostDomain.dispatch()`. `GhostPracticeTest`
verifies accepted and rejected actions, first-hunt safety, cooldowns, state
transition, information filtering and the nonlethal-first training objective.

**Not implemented:** LAN, four-player real-time sessions, a human-controlled ghost
in another player's mission, positional sound, independent hunter AI, thirteen
playable ghost types and final animated character models. These are future stages.

On a graphical Linux test display, `xvfb-run -a java -cp build/classes:build/test
org.beckenburg.GhostPracticeGuiTest ghost-practice.png` verifies the second
launcher mode, renders the actual viewport and checks Escape restores the original
hunter control flow. It does **not** constitute Windows or multiplayer acceptance.

## Alpha 0.7 — LAN room simulation (first real socket transport)

From the launcher choose **LAN HOST / JOIN (ROOM TEST)**. One player hosts on TCP port `27717` (or another chosen local port). Other clients join by entering that machine's private LAN IP and choosing Hunter or Ghost. Three hunter seats and one ghost seat are available. Everyone marks Ready, then Hunter 1 chooses Start Match. If no human has taken the ghost seat, the AI ghost uses the existing shared `GhostDomain` rules. This is a local network test and should not be exposed directly to the public Internet.

Use the room number spinner with Move Room for legal adjacent hunter steps; ghost players can select an action and its target room. The host rejects remote damage, commands from the wrong seat, replayed commands, invalid room jumps, and actions denied by the ghost's energy/cooldown/timing constraints. The room-level state projection gives human ghosts their own room, energy, legal actions and **only permitted local hunter sensing**, never other players' exact hidden locations. Disconnecting a participant ends the match; reopen a new LAN host to start again.

**Current boundaries:** LAN discovery, reconnect, full 3D prop/item replication, audio, seamless spatial ritual/ghost combat, network-compatible saves, more ghost types and Windows clean-machine QA are **not yet implemented**. Host-authoritative first-person hunter positions, door states, room-level cleansing and a spectral ghost viewport **are** implemented. Room-number movement is temporary infrastructure for testing authority; it does not simulate 3D body physics. Do not advertise this as complete 3v1 gameplay. Run `sh build.sh` (or `build.cmd`) to compile and execute `LanProtocolTest` and the four-socket `LanLobbyTest` alongside the established gameplay suites.

## Alpha 0.8 — host-owned cooperative investigation (16 October 2026)

The LAN **room-level** proof now also supports shared mission evidence, team positions, investigator injury/fear, ward charges, a spatially validated ward, a timed cleansing ritual with ghost disruption, retreat and synchronized match results. All evidence and damage are resolved by `LanHost` + `LanCase`; no client-provided clue or damage values are accepted. Hunter-only `PROGRESS`, `EVIDENCE`, `TEAMMAP` and `RITUAL` messages never go to the ghost seat. The ghost remains bound to the same `GhostDomain` action costs/cooldowns and legally filtered observations.

In the LAN window, after joining and starting the session, hunter buttons are **Scan**, **Ward**, **Ritual** and **Extract**. The ghost uses **Ghost Action**. Valid room targets use the spinner and **Move Room**. All hunter actions use the same monotonic sequence budget, preventing a movement sequence replayed as a scan. A host-owned 45-tick rite finishes when three distinct tool clues and a true-anchor ward are present; `DISTURB` at the ritual zone reduces progress by 12 ticks. Result broadcasts are synchronized. `sh build.sh` / `build.cmd` include `LanCaseTest` and `LanCaseIntegrationTest` for these rules.

**Limits:** The newer Alpha 0.9–1.1 slices synchronize 3D hunter positions/avatars, doors and a host-owned ghost viewpoint. Still missing are movable-prop physics, voice chat, persistent LAN profiles, continuous spatial attacks and a complete production PvP match. A real multi-machine Windows LAN test is still needed; the local run was a multi-socket loopback test under Linux. The original character/environment PNG upload and the actual art gallery remain separate unresolved requirements.

## Alpha 1.3 — Spatial apparition projection (2026-10-16)

The LAN host now broadcasts `APPARITION|VISIBLE|x_mm|z_mm|tick` only to a hunter using the first-person view who can legitimately see the currently manifested ghost: same authored room, within 10 meters, no intervening solid wall or closed door. Other hunter clients receive `APPARITION|HIDDEN|tick`; the ghost never receives these hunter-facing sight packets. A ghost moving through a legal `DRIFT`, changing position or demanifesting causes the projection to update and disappear as appropriate.

The shared 3D hunter renderer displays the actual authorized ghost position, rather than the room center, with an on-screen **ENTITY MANIFESTED** warning. The AI ghost and the human ghost share the same authority. `LanApparitionTest`, `LanApparitionRenderTest` and the genuine four-socket `LanApparitionIntegrationTest` cover privacy, range, door occlusion, spatial drawing and despawn.

Alpha 1.4 adds a timed attack telegraph and locked-target impact validation, but not directional attack animation or finished 3v1 content. The warning accompanies manifestation; strikes still obey host-authoritative rules and cooldowns. Host/client do not yet support positional audio or interpolation of remote ghost movement. Physical Windows multi-machine testing and original image archival are still outstanding.

## Alpha 1.6 — Architectural acoustics and finite ghost search

LAN sound detection is now host-weighted by actual room transitions. Open doors pass footsteps that closed doors suppress, cellar masonry and exterior wind add attenuation, and the van remains a protected sound-free zone. A decaying 2-meter acoustic memory lets AI ghosts pursue a clue, then briefly search neighboring positions around the stale sound instead of tracking a player forever. Room travel and local steps use the same `GhostDomain` and `LanGhostSpatial` rules as human ghosts. The human-ghost `STATE` hearing flag now represents a recent valid sound, not silent same-room player presence; the ghost still receives no private hunter positions. These are *simulation-level acoustic decisions*, not positional audio playback or finished AI personalities. See `LAN_ACOUSTIC_SEARCH_010.md` for costs, limitations and regression evidence.

## Alpha 1.7 — Positional paranormal audio (incremental LAN feature)

The shared 3D LAN hunter view now receives host-projected `SOUND` cues when a **validated** AI/human ghost whispers, disturbs objects, manifests or prepares a strike, plus occasional spectral footfalls when a manifested AI ghost moves. The host sends only a quantized left/center/right bearing and volume, not hidden ghost coordinates. Door/cellar acoustics and distance attenuate the cue. The Java runtime synthesizes stereo sounds locally without an audio asset dependency; failed sound-device initialization cannot stop a mission. Start the game with `-Dbeckenburg.audio.mute=true` to mute effects; the directional on-screen captions remain visible. Existing combat warnings remain above audio-caption priority.

Tests: `LanSoundTest`, `LanSoundIntegrationTest` (four TCP peers), `LanSoundHudTest` (silent GUI caption), plus the preexisting suites. See `docs/beckenburg/network/LAN_POSITIONAL_AUDIO_011.md` in the repository for scope and limits. Actual Windows sound cards and multi-PC networked sessions still require hands-on acceptance. Full authored audio/visual asset integration is a separate production stage.
