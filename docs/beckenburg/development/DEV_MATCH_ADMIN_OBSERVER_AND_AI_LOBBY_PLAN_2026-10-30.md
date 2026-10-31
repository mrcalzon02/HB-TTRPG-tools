# Beckenburg — Developer Full-Lobby AI Match and Invisible Admin Observer

**Status:** implementation plan / not a claim that the observer or full-lobby AI already works.  
**Date:** 2026-10-30  
**Owners:** The Beckenburg Project Java 17 editor, LAN game runtime, AI module and Windows Actions diagnostics.  
**Intent:** run a REAL multiplayer investigation under the ordinary authoritative host, with six autonomous AI hunters, one AI ghost controlling the **real ghost player seat**, and a hidden developer administrator observing the entire investigation. No public player menu, marketplace, or production spectator role.

## Unambiguous seat count

- **H1–H6:** six genuine `LanClient` hunter peers, each controlled by a separate AI driver.
- **GHOST:** one genuine `LanClient` ghost peer driven by ghost AI. This must suppress the host's usual unoccupied-ghost AI takeover so we do **not** have two ghost controllers.
- **ADMIN:** one extra development-only observer **outside** `LanHost.seats[0..6]`, outside `LanWorld`'s six hunters, and outside `LanCase` party count/outcome/settlement. Technically **8 roles in the development session** (7 networked players + 1 host-local observer initially), even if informally called the "secret seventh player."

The admin is invisible in normal lobby/participant UI, cannot take gear, block doors, be injured, consume a hunter slot, receive payouts, vote in readiness, or accidentally become an in-world witness. Its camera is detached from actor collision, not a hunter avatar with god mode.

## Explicit scope choice: development-only, not a packet-security project

The owner explicitly wants **no dedicated packet-hardening or visual secrecy effort** for this tool. Keep the implementation simple:
- Opt in through a developer launcher or JVM flag, e.g. `--dev-ai-match` or `-Dbeckenburg.dev.match=true`, **never** through the public multiplayer menu. The exact syntax is chosen at implementation time.
- Initially run the developer administrator on the **same local machine/process** as the host with a direct, read-only host snapshot adapter (one additional observer session logically, without needing a fake `H7` socket). Optionally add a local observer socket later only if truly needed for a separate admin desktop process.
- Do **not** alter normal `JOIN HUNTER`/`JOIN GHOST` behavior, build public observer discovery, or introduce an extensive authentication/protocol redesign.
- Visibility restrictions are irrelevant **for ADMIN only**. The seven bot clients must still receive the same gameplay-appropriate information as human players; never feed omniscient coordinates from the admin to their decision logic.
- Normal builds and public multiplayer screens do not display the admin entrypoint. The test harness alone creates the observer.

## Verified current repository interfaces (October 30)

| Existing code | What it does | Implication |
| --- | --- | --- |
| `LanHost` `HUNTERS=6`, `GHOST_SEAT=6`, `Peer[7]` | authoritative hunter/ghost matching, lifecycle, 10Hz tick | Do not shoehorn ADMIN into these arrays; preserve all for-loops and outcome rules |
| `LanClient` | actual TCP protocol clients with `ready/start/view3D/step/door/scan/note/identify/ward/absolve/banish/ghost/ghostStep/frenzy` | Every simulated player uses the ordinary commands |
| `LanHost.prepareCampaignBots` / `CampaignGuestBot` | hired hunters already use `LanClient` | Useful transport/controller proof, **not** a complete investigator: follow-leader + limited scan only |
| `GhostPracticeHunterAi` | solo embodied AI investigator that listens to legitimate measured/sound events | Reuse decision ideas, not its private world state or movement to cheat LAN |
| `LanGhostPursuit` | existing authoritative AI ghost path when ghost seat is empty | A new **client-side** ghost adapter uses filtered ghost-seat frames and the same `GHOST/GSTEP` actions; no host-only hunter data |
| `GhostDomain`, `GhostActionCadence`, `GhostFrenzy` | host legality, energy/cooldowns/hunts | Must still decide whether bot commands apply and when deadlines force activity |
| `LanWorld`, `LanGhostSpatial`, `LanSpatialCombat` | actual 3D poses, collision and strike reach | Admin hitbox wireframes and ghost/hunter contact diagnostics read these, not reconstructed sprites |
| `SceneRenderer`, `LanWorldPanel`, `LanGhostPanel` | current engine render and actual player viewports | Admin uses the SAME renderer; add a distinct debug overlay after geometry depth, not a counterfeit scene |
| `casefile`, `fieldNotes`, `LanCase`, `HardEvidenceQuota` | actual observed readings, team notes and authoritative evidence rules | Admin compares true configured ghost/evidence eligibility to **actually observed** readings, clearly separated |
| `BeckenburgFullRoundE2ETest` / `beckenburg-full-round-e2e.yml` | real socket-based host + hunters + ghost, evidence and ritual acceptance | Extend by *additional* opt-in developer workflow; do not replace or weaken this normal multiplayer test |

## Module boundaries

1. **`DevMatchLauncher` / `DevMatchSession`** (new developer module): starts a private localhost `LanHost`, configures one test site and contract, joins seven normal client connections, creates the admin observer, drives start/end and deterministic test seeds, closes all actors cleanly. It must own no alternative game-state machine.
2. **`DevHunterClientAi`** (six instances): owns *only* its assigned `LanClient`, the exact frames that client receives, local tactical memory and chosen AI plan. It issues genuine player commands; all collision, tool resources, scans, equipment inventory, evidence verification, rituals and damage are still host-owned. Separate sensory inputs and plan/act loops; never call `LanWorld.move` or `LanCase` from this driver.
3. **`DevGhostClientAi`** (one instance): occupies the actual `GHOST` seat, enters `GVIEW3D`, reads the actual ghost's filtered `GPROMPT`, `GHEAR`, `GPOSE`, energy/cadence and activity cues, then submits genuine `GHOST/GSTEP/GDEVICE/FRENZY/FATTACK` commands. It may not inspect the admin's exact hunter positions. It must actually act as a human ghost would, not leave the ghost seat vacant and silently rely on `LanGhostPursuit`.
4. **`DevAdminSnapshot`** (host-local, immutable): one host-tick-consistent record containing all six hunter bodies (room, XYZ, facing, stance, alive/health/sanity/gear/role as available), ghost and Twin poses/phase, collision/hit shapes, doors/windows/portals, equipment and active sensors, mission/evidence/ritual state, recent events, bot intents and counters. Distinguish true ghost species from the players' journal guesses. Sampling 2–5Hz for UI independently of 10Hz authority; no world mutation during snapshot.
5. **`DevAdminPanel`** (developer UI): normal `SceneRenderer` map, unrestricted fly camera, floor filter/cutaway, top-down overview, select/follow/orbit actors, player/ghost hitboxes and headings drawn **through walls**, portal/line-of-sight debug, chronological timeline, compact per-actor cards, evidence and inventory inspector and AI decision explanations. Overlay mode choices: entities, world collision, audio, sensor volumes, evidence, path/route, behavior and perf.
6. **`DevMatchController`** (host-local operations only): safely start/stop the developer match; pause/resume/step authoritative tick as one coherent operation, swap AI test presets, select actor to watch, adjust the admin-only camera or toggle overlays. Do not make pause dependent on GUI rendering. Mutating scenario injections (force event, replenish gear, place evidence, change health) come **later**, separately marked `INJECTED` in logs; never silently alter real game rules.
7. **`DevMatchRecorder`**: bounded tick-stamped event timeline, accepted/rejected player commands, bot intent transitions, authoritative evidence observations, strike/contact geometry, snapshots, actual rendered screenshots, p50/p95/p99, and a scenario manifest with source SHA/seed/map/ghost/difficulty. Retain finite diagnostic artifacts and rotate by size. Prefer text/CSV/JSONL + PNG without arbitrary binary dependencies.

## Behavioral requirements for FULL autonomous bots

**Hunter AI responsibilities** (not just follower movement): spawn in van; equip/choose a real loadout; navigate stairs/doors; move without wall-clipping; search distinct rooms rather than crowding a leader; react to real audio, EMF, temperature and camera cues; place and use gear within actual resource budgets; communicate observations using normal note/team feeds; gather required evidence; handle sanity/threats, hide, flee or deploy available counters; identify only from acquired readings (no truth oracle); ward correct anchor and finish an actual Banishment/Cleansing/Absolution; use van extraction controls correctly. Coordinated team tactics via **in-game shared casefile/radio**, not an admin backchannel. Support behavior presets such as investigative, cautious, aggressive, and inexperienced, with a deterministic seed for reproducibility. Multiple tactical competencies can be added after basic honest behavior works.

**Ghost AI responsibilities**: control the host-recognized ghost player seat from real filtered ghost observation; traverse through its *legal* species movement; handle host action energy, cooldown and cadence; investigate heard sound rather than omniscience; enact varied preferred and secondary events; issue legitimate physical attacks only when host permits; execute Frenzy and recover; respect wards, LOS, camera-only forms, and multi-body Twins behavior; preserve host control over evidence and actual damage. Test AI-to-human and human-to-AI ownership changes as separate cases.

**Admin** may see the real ghost identity, the full team, evidence truth, collision and hidden entities. The *bots* must not.

## Phased implementation, with concrete checkpoints

### Phase 0 — Lobby/harness foundation
- Add an explicit **development match launcher** that creates a real local LAN host and seven `LanClient` peers (six hunter identities and one ghost) with the existing 10Hz tick.
- Keep ADMIN as an independent developer-side observer, not an eighth `seats[]` entry, and do not advertise it in lobbies or menus.
- Connect all clients, ready them, start as actual H1 owner, enter their proper 3D modes, and assert each gets an assigned legitimate seat.
- **Pass:** 7 player connections, 6 equipped hunter seats, 1 occupied ghost seat, admin absent from party/ready/live-count; baseline player and ghost commands reach ordinary host validators.

### Phase 1 — Read-only omniscient admin and viewport
- Create one consistent `DevAdminSnapshot` from host state, including all bodies, ghosts/Twins, doors, evidence, hit volumes and 10Hz tick; independently expose *debug* collision and sight geometry with the actual world geometry.
- Build developer window with fly/no-clip camera, top-down overview, x-ray hitbox outlines, actor follow/orbit, actor-selection and per-client event/evidence pane.
- **Pass:** admin sees the correct host coordinates even for ghosts behind walls; normal player renderers still obey their usual visibility; admin camera never collides with or moves world actors, cannot take damage or trigger sensors.

### Phase 2 — Six real-client autonomous hunters
- Start from `CampaignGuestBot`'s genuine client connection but replace follower-only behavior with per-client sensor → belief → planning → input loop. Adapt suitable `GhostPracticeHunterAi` techniques to real received game frames.
- Add mission objectives one at a time: room exploration, tool use, clues, shared notes, hazard response, ward, actual rite and extraction. No free scans/evidence, no direct host move calls.
- **Pass:** six clients issue real movement/equipment/evidence actions and independent plans; real host validates/rejects commands; at least one fully observed investigation chain is demonstrated; no unmeasured ghost oracle.

### Phase 3 — Ghost driven by its real player client
- New ghost bot takes the actual GHOST seat, parses filtered ghost frames and uses real ghost player inputs. Host AI fallback does **not** act concurrently.
- Run species-specific scenarios including door-only/phase, camera-only, Frenzy and ancient/Elder variants. Physical attacks require actual host contact.
- **Pass:** true bot-originated ghost commands are recorded at ghost seat with ordinary action costs and host results; a deliberately idle ghost client still exercises existing host activity deadlines without becoming a second independent ghost.

### Phase 4 — Admin match controls and diagnostic capture
- Add pause/resume/single-authoritative-tick stepping, start/finish/restart-as-new-host, AI intent pause/override and actor following; all host timing and outcomes remain coherent.
- Record log with “game action / admin control / injected test condition” visibly distinct, plus real renderer screenshots and optional video capture if feasible.
- **Pass:** stepping one tick advances the complete world once; pause freezes simulation rather than just visuals; admin never participates in ritual/settlement/strike/sanity.

### Phase 5 — Windows developer workflow with substantive evidence
- Add a separate, **manual or opt-in scheduled** GitHub Actions workflow, e.g. `.github/workflows/beckenburg-dev-ai-match.yml`; reuse Java 17 and existing build resources, not Blender/Chocolatey as game dependencies.
- Run actual local TCP multiplayer actors on the Windows runner, full lobby for bounded duration or actual round outcome, with scenario seeds/difficulties/maps, optional screenshots from game-rendered admin viewport, log timeline, authoritative state snapshots, command traces, and AI timing CSV.
- Save artifact bundle even on failure (progress, missing actions, join failure, hang, exception, thread dumps). Use clean host/process disposal after run; no endless Actions job.
- **Pass:** artifacts prove 6 genuine hunter clients and 1 genuine ghost client were controlled and active, and admin observed them. Screenshots cannot be fake illustrative stand-ins. Distinguish **completed win/loss**, **bounded stalemate**, **test timeout**, **runtime crash**, and **startup failure**.
- **Release policy:** this diagnostic scenario's AI tactics, balance, aesthetics, and duration are *not* release blockers. Genuine broken build/launch, essential multiplayer transport, or gameplay failures are objectively actionable. Keep existing E2E workflows authoritative for normal shipment.

## Key test matrix

| Case | Test evidence | Required finding |
| --- | --- | --- |
| Eight-role separation | host session summary | H1–H6 and GHOST are 7 actual client roles; ADMIN not in party array, victory or player lobby |
| Full lobby independent actors | per-client command logs / host readback | six unique hunter clients with individual actions; one ghost client with accepted/denied actions |
| Ghost seat prevents double control | action trace | occupied ghost stops internal AI ownership, while ordinary cadence/deadline rules remain valid |
| X-ray observer | host pose versus rendered overlay capture | ghost & H1–H6 true hitboxes visible through geometry |
| Admin free-fly | camera transformation and world snapshot | camera crosses walls/floors while world collision and hunter positions are unchanged |
| Evidence provenance | host evidence, casefile and admin comparison | genuine observation differs visibly from ghost truth when unproven; no free evidence produced |
| Hunter objective chain | tool/equipment/scan/ward/ritual event trace | every stage accepted by normal host, with no direct changes to mission state by bots |
| No hunter omniscience | bot input manifest | bot decisions depend on player-delivered frames, not admin ghost truth/hunter positions |
| Core match outcome | normal round result and settlement | complete through normal host code or give truthful bounded diagnostic timeout |
| Camera/frame budget | renderer p50/p95/p99 | diagnostic evidence only, do not impose subjective art/FPS release gate |
| No normal UI exposure | ordinary GUI launch and lobby test | no admin button or ADMIN seat shown in public screens |
| Cleanup | workflow finalizer | sockets, headless bots, observer window, host tick and logs terminate cleanly |

## What NOT to build in this iteration

- A second multiplayer server or an alternate `GhostDomain`; no fake evidence, scripted winner, ghost teleport, or AI-only attack bypass.
- Real account-system administration, sophisticated cryptographic packet rights, or public spectator roles. The owner explicitly excluded this overhead.
- An ADMIN entry in `LanWorld.Body[6]`, `mission.alive()`, ordinary `seats`, `partyMembers`, `broadcastWorld` hunters, or `GhostDomain` perception.
- Broad production rewrites or hard limits based on the original PlayStation's hardware.
- A GitHub Actions “remote match” presented as a live publicly joinable game. CI runners are temporary local test machines; they can produce **recorded match artifacts**. The live interactive admin camera is for locally launched developer builds.

## First engineering PR/commit sequence

1. Keep this spec and acceptance ledger adjacent to existing `docs/ai`, `docs/network`, `docs/wiki` contracts. No gameplay changes until the harness's exact participant/observer ownership is established.
2. `DevMatchSession` plus developer-only launch entrypoint; normal `LanClient` seat-count and no-admin-lobby tests.
3. Host-local immutable `DevAdminSnapshot` and text-mode diagnostic inspector. Validate snapshot versus real world positions before painting hitboxes.
4. `DevAdminPanel` with real `SceneRenderer` + free camera + through-wall outlines + evidence inspector.
5. Independent hunter bot adapters and ghost seat bot, then a bounded seven-client smoke test.
6. Single tick controls, workflow artifacts and multi-map repeatable scenarios.

Do the **socket/seat harness and admin snapshot first**. A polished admin GUI over a simulated/non-player match would defeat the test's purpose.
