# The Beckenburg Project — Playable Solo Investigation Prototype (Java 17)

**Status:** a local solo investigation vertical slice, **not the finished four-player game**. It expands the original Swing/software-3D renderer experiment with a fifteen-zone test house (twelve interior rooms and three exterior spaces), low-poly room props, an AI-driven Spirit ghost, working evidence tools and a complete case-resolution loop. All artwork here is procedural placeholder geometry; the user-approved full-resolution PNG concepts remain awaiting verified GitHub binary archival and model integration.

## Run on Windows

Install a **Java 17 or newer JDK** to build (`javac`, `java`, `jar` on PATH). From this directory run `build.cmd`, then `build.cmd run`; or run `java -jar build\beckenburg-game.jar` after building. Requires a graphical desktop. The produced JAR is a development build and **does not yet bundle a JRE, installer, code signature or tested Windows native GPU driver path**.

On Linux/macOS with a JDK: `sh build.sh`, `sh build.sh run`. The launcher and Java2D 3D rasterizer have no external dependencies. Target class files are produced with `javac --release 17` (the local test environment uses a JDK 21 compiler targeting Java 17).


## Alpha 1.0: mouse-look and unified LAN field hotkeys

**Mouse control:** Click anywhere in the playable first-person viewport to lock and hide the pointer. Then move the mouse to look around **without holding a button**. The pointer automatically recenters on supported desktop systems to permit unlimited turning; it releases when the window loses focus, when the view closes, and when a solo case is paused. Click the view again to recapture after a menu or Alt-Tab. Arrow keys remain available. This applies to the solo hunter, local ghost practice and 3D LAN hunter. If the window manager prohibits desktop pointer movement, the camera falls back to relative movement inside the panel. The 3D HUD indicates whether capture is active.

**LAN first-person tools:** 1 EMF, 2 thermometer, 3 spirit box, R scan, C defensive ward, B cleansing, X extraction and E door. These actions go through the existing authenticated session command sequence and host-owned `LanCase`; nothing is locally awarded from pressing a key. Ghost-player 3D viewpoint, full equipment models, gameplay balance, Windows hardware testing and production installer remain to be implemented.

## Alpha 0.9: synchronized first-person LAN house (partial gameplay)

After three hunters are ready and the host starts the match, each hunter can select **Enter 3D House** in the LAN lobby. That opens a separate textured first-person window with **WASD** movement, **click once to capture mouse-look** (no held button) or use arrow keys, **E** to open or close nearby doors, and **Esc** to return to the lobby. The original room-number controls remain as a **legacy room-simulation** mode, but are rejected once that player enters 3D mode. The host, not the client, advances bodies by a bounded movement impulse per simulation tick and checks collisions against the same physical `HouseMap` used by the renderer. It also owns door states, distributes teammate avatars to hunters, and displays host-declared manifestations; private hunter transforms and the team journal are not sent to the ghost seat.

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

**Not yet built:** 3v1 LAN hosting, human ghost control and ghost AI parity; 12 other ghost implementations; final 3D engine/mesh pipeline, final maps/assets/audio; weaponless damage/status balancing, full ritual system, equipment purchases, castle hub navigation, Windows packaged install/release. See `../../docs/beckenburg/RELEASE_PRODUCTION_PLAN.md` and the single progress `stage-ledger.json`.

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

**Current boundaries:** LAN discovery, reconnect, synchronized first-person camera/position/doors/items, audio, full match investigation/cleansing, network-compatible saves, more ghost types and Windows clean-machine QA are **not yet implemented**. Room-number movement is temporary infrastructure for testing authority; it does not simulate 3D body physics. Do not advertise this as complete 3v1 gameplay. Run `sh build.sh` (or `build.cmd`) to compile and execute `LanProtocolTest` and the four-socket `LanLobbyTest` alongside the established gameplay suites.

## Alpha 0.8 — host-owned cooperative investigation (16 October 2026)

The LAN **room-level** proof now also supports shared mission evidence, team positions, investigator injury/fear, ward charges, a spatially validated ward, a timed cleansing ritual with ghost disruption, retreat and synchronized match results. All evidence and damage are resolved by `LanHost` + `LanCase`; no client-provided clue or damage values are accepted. Hunter-only `PROGRESS`, `EVIDENCE`, `TEAMMAP` and `RITUAL` messages never go to the ghost seat. The ghost remains bound to the same `GhostDomain` action costs/cooldowns and legally filtered observations.

In the LAN window, after joining and starting the session, hunter buttons are **Scan**, **Ward**, **Ritual** and **Extract**. The ghost uses **Ghost Action**. Valid room targets use the spinner and **Move Room**. All hunter actions use the same monotonic sequence budget, preventing a movement sequence replayed as a scan. A host-owned 45-tick rite finishes when three distinct tool clues and a true-anchor ward are present; `DISTURB` at the ritual zone reduces progress by 12 ticks. Result broadcasts are synchronized. `sh build.sh` / `build.cmd` include `LanCaseTest` and `LanCaseIntegrationTest` for these rules.

**Limits:** This is a synchronized room-graph mission **not synchronized 3D avatars, doors, movable prop physics, voice chat, persistent LAN profiles or a complete PvP match**. A real multi-machine Windows LAN test is still needed; the local run was a multi-socket loopback test under Linux. The original character/environment PNG upload and the actual art gallery remain separate unresolved requirements.
