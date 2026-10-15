# The Beckenburg Project — Master Game Design Document
Version: 0.1, 2026-10-14. Status: **design and preproduction only**. Repository home: HB-TTRPG-tools; no Java application, assets, playable build, or LAN implementation is claimed by this document.

## 1. Creative statement
The Beckenburg Project is an original Windows-first 3D first-person supernatural investigation, survival and reclamation game. Three human investigators enter a haunted site while a fourth player controls a ghost, or an AI ghost fills that role. The hunt revolves around eliciting evidence, identifying an entity, exploiting its rules and conducting site-cleansing rituals while surviving escalating, *incremental* supernatural harm. The player-run Beckenburg Castle headquarters represents humanity reclaiming settlements site by site after a global metaphysical event has revived ancient spirits and fears. Conventional weapons are ineffective against these entities: understanding their metaphysics, evidence and countermeasures is the path to victory.

The target is **asymmetrical gameplay with mechanical parity between AI and player ghosts**. All ghosts, regardless of controller, derive from the same simulation components, legal action definitions, cooldown and energy costs, interactions, vulnerabilities, and combat rules. A human ghost must execute those actions manually and work within fair sensing and timing limitations; its powers are not secretly nerfed. AI is a controller, never a privileged alternate rules engine.

## 2. Product identity and constraints
- Working title: The Beckenburg Project. Original setting, maps, UI, music, characters, assets and ghost behaviours; genre inspiration is not a license to reuse Phasmophobia content, branding, evidence combinations or art.
- Primary mode: 4 total slots, 3 hunters + 1 ghost; locally hosted LAN with an AI-ghost fallback. Dedicated-server support and public Internet matchmaking are *out of scope at initial release*.
- Platform and application: Java 17, Windows distribution, Swing-based desktop launcher/settings and a real-time 3D first-person client rendered with a compatible Java 3D engine. jMonkeyEngine is a **candidate pending Stage 1 proof**, not an unconditional architecture decision; Swing alone is not a 3D renderer.
- Default experience: 25–40-minute mission as an initial design target, to be tested rather than promised. Exploration first, escalating supernatural pressure, a plausible retreat option and a meaningful hunt/climax.
- Primary users: cooperative players who enjoy investigative deduction and competitive players who prefer indirect environmental control, deception and asymmetric tactics.
- Launch quality: installable Windows package, actual LAN host/join, functional 3D level, three hunter archetypes, thirteen distinguishable ghost archetypes subject to balance gates, at least one complete site and a castle loop. Later site categories follow progression gates; content is *not* implemented until evidenced.
- Financial progression: earn mission currency and role XP. Currency buys equipment and repairs; XP unlocks measured specialization rather than invalidating early investigation.
- Licensing: undecided for original game code/art and separate from existing Sound Manager licensing. No commercial or distribution rights are assumed for third-party libraries/assets.

## 3. Player fantasy and game loop
1. At Beckenburg Castle, read an assignment, select specialist roles, purchase/load equipment, plan a route and choose an operation objective (identify, contain, banish, cleanse or rescue).
2. Host launches a LAN mission; players arrive at a mapped site with zones, doors, circuits, interactable items and an entity anchor. Hunters establish a temporary operations point.
3. Hunters investigate with tools and specialist methods. Ghost exerts influence by moving unseen, throwing or possessing objects, generating clues, mimicking signals, hunting or changing rooms. Counterplay must be possible but never trivial.
4. Pressure rises via a shared haunt/escalation simulation. Players observe clues, maintain a notebook with uncertainty and prepare the right ritual in the right location, under contested conditions.
5. Finale: successful site reclamation, partial containment, retreat with evidence or catastrophic failure. Apply injury, loss, payout, reputation, XP, equipment restoration and castle-state persistence.
6. Return to castle to recover, unlock services and select the next site. World reclamation should visibly transform mission availability and castle facilities.

## 4. Central competitive contract
- The ghost cannot immediately chain-kill a fresh team. Mandatory opening observation/manifestation windows, escalating attack costs, telegraphed hostile states and injury instead of automatic execution.
- Hunter choices must provoke *detectable but potentially misleading* responses; evidence is probabilistic and contextual, never guaranteed merely because a button was pressed.
- The ghost must have meaningful agency outside lethal hunts: manipulation, deception, room movement, possession, darkening/cold spots, audio, item displacement, splitting and ritual interruption.
- Three hunter roles must be necessary or useful without making a missing specialist an unwinnable hard-lock; teams should be able to improvise at a cost in time/risk/resources.
- Full shared rules for human/AI ghosts: action arbitration occurs on host, not in the AI code or the client. A player ghost can inspect only information allowed by ghost sensing; an AI ghost receives the same observational interface.
- Information asymmetry, not arbitrary hidden rule differences, generates tension. A human ghost can choose tactics and deception; the AI can use personality and weighted goals but not omniscience.

## 5. Primary hunter disciplines
**Cleric:** sanctification, protective circles, prayer/liturgical wards, stabilizing afflictions, consecrated boundaries, banishment leadership. Less specialized at raw evidence capture.

**Observer:** mapping, surveillance, recording, sound/temperature/environment inference, identifying movement patterns and anomalies, remote support, stronger evidence confidence. Less able to restrain a manifested entity alone.

**Demonologist:** forbidden-lore interpretation, true-name research, provocation, seances, possession diagnosis, high-risk negotiations and containment countermeasures. Faster ritual discovery at greater corruption/exposure risk.

Each discipline includes a loadout, active kit, passive contextual skills, learnable techniques, vulnerabilities and cooperative synergies. Role details and accessibility are specified in hunters-equipment-rituals.md.

## 6. Ghost catalogue
Possessive, Poltergeist, Demon, Yokai, Banshee, Wraith, Shade, Specter, Spirit, Hantu, Devil, Mimic and Twins. These are **distinct behaviour packages**, not just cosmetic labels or altered speed. Every entry must define a readable tell, signature clue families, at least two offensive or disruptive capabilities, counterplay, hunting style, room movement policy, sensory channel, cooldown/resource curve and special mechanics. See ghosts.md.

## 7. Site categories
House, mansion, prison, asylum, school, farmhouse, academy, college and church. Sites contain architect-authored zone graphs and believable navigation, contextual evidence devices, object sets, ritual anchors and ghost path connectivity. Stage 4 produces one polished small test house before scale expansion. See locations-environments.md.

## 8. Pillar requirements
**Presence:** robust first-person look/move with consistent pitch/yaw, collision, physical interaction, footsteps, door handling and readable proximity.

**Deduction:** multiple evidence channels with both positive and negative observations, ambient-noise baseline, acquisition thresholds, cross-checks, counterfeits and notebook confidence.

**Territoriality:** authored zones that affect haunting, rituals, AI navigation, light/electric systems, room designation, audio occlusion and environmental persistence.

**Escalation:** clear early warning, escalating encounters and attritional damage/status; danger is signalled by environmental changes, not unavoidable instant kills.

**Ritual agency:** seances, warding, containment, exorcism/banishment and cleansing require positioning, preconditions, repeated actions, vulnerable execution windows and meaningful resistance.

**Progression:** mission pay/XP balances risk, costs, insurance, recovery and ghost-player reward; no pay-to-win or exploitative grinding baseline.

**Reliability:** offline solo AI fallback, LAN host authoritative state, save versioning, crash recovery and deterministic encounter seeds for testing.

## 9. Interfaces and repository authority
- Production breakdown and dependency gates: production-stages.md
- World rooms, zones, props and per-location requirements: locations-environments.md
- Ghost powers, evidence families, human/AI parity: ghosts.md
- Hunter specializations, investigation gear, rites and economy: hunters-equipment-rituals.md
- Java/Swing/3D/network/serialization architecture: technical-architecture.md
- Acceptance matrix, scenario tests, blockers and next-action backlog: acceptance-and-backlog.md

## 10. Non-goals and design risks
No firearms-as-solution design; no paid multiplayer servers needed for LAN; no mandatory cloud account; no unlicensed imported ghosts/assets; no launch commitment for simultaneous nine fully decorated locations. Major risks: Java/Swing/3D focus/input conflicts, LAN latency and disconnections, AI unfair information, noisy evidence becoming unreadable, ghost trolling/soft-locking, huge environment-authoring cost and copyright overfamiliarity. Each has a scoped proof before content proliferation.

## 11. Decision record
D-001: Java 17 and Windows package requested and binding. D-002: Swing application shell requested and binding; engine chosen by prototype. D-003: 3v1 LAN, AI replacement, ghost mechanical parity binding. D-004: Incremental injury and nonlethal interaction early in match binding. D-005: Only confirmed and tested implementations may be called complete. D-006: Original game with familiar horror concepts, not an asset/content clone. D-007: Build in this repository starts with **planning web documents**, not implied working Java application. Future independent runtime module/repository requires a deliberate structural decision.
## 12. Current technical and visual proof (2026-10-15)
Original-PlayStation-era low-poly rendering is now the visual production target: see [visual direction](../../software/beckenburg/art/VISUAL_DIRECTION.md), [Cleric concept](../../software/beckenburg/art/profiles/cleric-01.svg) and [first equipment sheet](../../software/beckenburg/art/profiles/equipment-01.svg). The [source prototype](../../software/beckenburg/README.md) contains a Java-17-compatible, JDK-only Swing launcher and test-house software 3D rasterizer. It successfully compiles with `javac --release 17` and its headless tests run locally; it is a **narrow S1 proof** only. No Windows GUI or packaged app has been independently tested, and no LAN, real ghost AI, evidence, rituals or persistent progression are implemented. Engine selection remains open; do not let the software render spike accidentally become an untested permanent engine decision.
