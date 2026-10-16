# The Beckenburg Project — Playable Solo Investigation Prototype (Java 17)

**Status:** a local solo investigation vertical slice, **not the finished four-player game**. It expands the original Swing/software-3D renderer experiment with a genuine 3D nine-zone test house, low-poly room props, an AI-driven Spirit ghost, working evidence tools and a complete case-resolution loop. All artwork here is procedural placeholder geometry; the user-approved full-resolution PNG concepts remain awaiting verified GitHub binary archival and model integration.

## Run on Windows

Install a **Java 17 or newer JDK** to build (`javac`, `java`, `jar` on PATH). From this directory run `build.cmd`, then `build.cmd run`; or run `java -jar build\beckenburg-game.jar` after building. Requires a graphical desktop. The produced JAR is a development build and **does not yet bundle a JRE, installer, code signature or tested Windows native GPU driver path**.

On Linux/macOS with a JDK: `sh build.sh`, `sh build.sh run`. The launcher and Java2D 3D rasterizer have no external dependencies. Target class files are produced with `javac --release 17` (the local test environment uses a JDK 21 compiler targeting Java 17).

## Currently implemented

- **Launcher:** title screen, Cleric/Observer/Demonologist selection, controls manual, session start and exit. Pausing exposes return/retreat safely.
- **Nine connected zone map:** Chapel, Library, Nursery, Kitchen, Central Hall, Bedroom, Cellar, Conservatory, Study. A single **grayboxed building**, not nine separate finished level categories. Rooms have real low-poly floor/wall/ceiling geometry and distinct simple props. Doors can be opened and closed, with authoritative collision in the local map model.
- **First-person 3D:** 320×200 internal RGB+depth triangle renderer, pixel-upscaled nearest-neighbor, simple fog and ordered pixel lighting. WASD movement, Shift sprint, drag or arrows look, room collision, flashlight.
- **Equipment:** EMF, Thermometer and Spirit Box emit different simulated signals linked to the ghost anchor or movement. Strong readings are journaled as confirmed evidence. The Observer and Demonologist get small profession-appropriate field advantages, and the Cleric receives an additional ward and reduced incoming damage.
- **Spirit ghost command foundation:** local AI chooses actions from a filtered GhostObservation and issues GhostCommand entries through the *same validator* human control will use. Adjacent-room drift, whisper, kinetic disturbance, timed manifestation and incremental strike have shared energy, cooldowns, sequence replay protection and opening-hunt safety. This is a host-style **local rules core only**: there is no remote host, authenticated multiplayer command transport or playable human-ghost session yet.
- **Case closure:** record three instrument clues, place a ward at the real anchor, complete a simple cleansing action and return to the initial Cellar extraction point. Early retreat pays only for collected evidence. Health defeat fails the case.
- **Progression seed:** atomic local Java Properties save, currency/experience rewards, schema validation, session receipt deduplication. Not a network economy or complete castle/shop.
- **Field interfaces:** map with marked rooms, live HUD, evidence journal, limited wards, case messages and equipment selection.

## Texture atlas production slice

The Java 17 renderer now uses an actual **128×128 source-color atlas with sixteen 32×32 PS-era diffuse tiles**. Stone, plaster, parquet, ceramic, doors, ceiling panels, carpet, brick, wallpaper, concrete, soil, iron, foliage, aged wood, glass and ritual material are procedurally authored and shaded. Each zone chooses its own floor and wall families; doors receive wood grain. The rasterizer interpolates UVs *perspective-correctly*, including geometry clipped by the near camera plane, while preserving the original 320×200 nearest-neighbor pixel look and distance fog. `MaterialAtlasTest` checks atlas reproducibility, tile wrapping, room differentiation, illumination and clipping. This is an implementable *starter palette*, not final user-approved texture art or a completed nine-site kit.

Detailed technical handoff: [Texture Implementation 001](TEXTURE_IMPLEMENTATION_001.md).

**Asset handoff:** `MaterialAtlas.java` is the current runtime authority for the starter diffuse colors; individual authored PNG atlases, UV-model import, exterior materials, and original PNG concept gallery remain independent follow-up deliverables. No JRE/Windows installer or LAN claim is implied.

## Controls

| Input | Action |
|---|---|
| WASD / Shift | Move / sprint |
| Drag left mouse / arrows | Look |
| F / E | Flashlight / interact with door |
| 1, 2, 3 | Select EMF / thermometer / spirit box |
| R | Scan and record instrument result |
| C | Place ward (near anchor it prepares the rite) |
| B | Cleanse (three clues and ward at correct anchor needed) |
| M / J | Floor map / evidence journal |
| X | Extract at entry marker |
| Escape | Pause / return-to-castle options |

## Validation and limits

`sh build.sh` / `build.cmd` compiles and runs `GameplaySmokeTest`, `GhostDomainTest` and the original `SmokeTest` where present before packaging. The new test covers nine zone identities, geometry/depth rendering, door/collision, instrument signals, ritual preconditions, class-independent completion, sequential ghost safety, atomic save/load, corrupt-profile refusal and replay-safe payout receipts. On a Linux graphical test display, run `java -cp build/classes:build/test org.beckenburg.GuiSmokeTest [screenshot.png]` to verify menu→3D panel and capture a screenshot. GUI testing under a Linux virtual X display is evidence of Swing functionality, **not** Windows compatibility or install verification. The original S1 prototype remains in `BeckenburgPrototype.java` for renderer comparison.

**Not yet built:** 3v1 LAN hosting, human ghost control and ghost AI parity; 12 other ghost implementations; final 3D engine/mesh pipeline, final maps/assets/audio; weaponless damage/status balancing, full ritual system, equipment purchases, castle hub navigation, Windows packaged install/release. See `../../docs/beckenburg/RELEASE_PRODUCTION_PLAN.md` and the single progress `stage-ledger.json`.

## Ghost command parity milestone (source only)

`GhostDomain.java` introduces `Observation`, `Command`, `Resolution` and a single `dispatch` method for `DRIFT`, `WHISPER`, `DISTURB`, `MANIFEST`, `STRIKE`. The source label (AI/HUMAN) is attribution only, with no branch on controller origin; `GhostDomainTest` executes the same action sequences from both labels and compares every state transition. Ghost AI chooses commands from its own room, permitted exits, energy, cooldowns and **room-local audible hunter presence**, not arbitrary player coordinates, health, role or private journal. `InvestigationSession.tick()` uses this dispatcher for the existing Spirit encounter rather than mutating ghost state directly. This is a prerequisite for later P09/P10 3v1 functionality, **not evidence those stages are complete**.
