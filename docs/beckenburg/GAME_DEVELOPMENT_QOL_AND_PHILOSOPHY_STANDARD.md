# Game Development: Mandatory Quality-of-Life and Design Philosophy

**Recovered cross-project standard — version 1.0, 17 October 2026**

**Status:** Reconstructed working standard, not a claim that every item is implemented in any repository. The requirements identified as **CORE** are drawn from prior explicit project contracts and the recovered document. **CONDITIONAL** requirements become mandatory when the relevant game mechanic or platform exists. **DESIGN** items are prior stated game-design philosophies, not universal mechanical prescriptions. **PROPOSED TEST** items are acceptance checks derived for enforcement; they are new synthesis rather than quotations from the source documents.

## Original documents and provenance

1. **Gaming defaults mistakes** — recovered catalogue of ordinary game annoyances; base building, logistics, production, crafting, item quality, inventory, markets, and Infopedia solutions. [Google Drive original](https://docs.google.com/document/d/1HWiIyY4Flg58PPWLW4Eac5nB2Let_3p1ZFF99w0z-As/edit).
2. **GUI design assistance** — Unified Contextual Window Framework; consistent Escape/back behavior, inventories, dialogue, machine windows, and input shortcuts. [Google Drive original](https://docs.google.com/document/d/18KA6FjWVhV_Omr5qeXNjDpG8j6AHrZrf5GbRNJuIEcE/edit).
3. **Design Initiative Additions** — decoupled rendering, input scaling, and independent coexistence of keyboard/controller input. Includes an example Java/Swing stack, which is **not** a cross-engine mandate. [Google Drive original](https://docs.google.com/document/d/1TXPgKgh7JlH1kYWOiZQZJp1uzBtH1iP8vg1Yn8zSDXk/edit).
4. **Holding Court on Gaming Freedom** — standalone/offline play, player agency, mod friendliness, flexible progression, and respect for time. [Google Drive original](https://docs.google.com/document/d/1-kWgE9Fdvtgwz60gHIlL5WrLntc7cUTI1gt2gsyH_Rk/edit).
5. **Stop Killing Games and Stop Destroying Games** — preservation, an end-of-service path, and avoiding unnecessary dependence on proprietary servers. [Google Drive original](https://docs.google.com/document/d/1OYlex5_0cDrTCkdk70iUoqHdGEoeZ6LNZytWvZ-4-nU/edit).
6. **ReverieVR Project Instructions** — existing platform contract on reference hardware, shell recovery, offline/phone-first operation, accessibility, performance, game modules. [GitHub main](https://github.com/mrcalzon02/ReverieVR/blob/main/docs/project/INSTRUCTIONS.md).
7. **ReverieVR Repository Execution Contract** — no inert controls, audible/visual action feedback, no false acceptance claims, verified source changes. [GitHub main](https://github.com/mrcalzon02/ReverieVR/blob/main/docs/project/EXECUTION_CONTRACT.md).
8. **ReverieVR Acceptance Ledger** — planned/draft/static-accepted/device-accepted distinctions for executable game features. [GitHub main](https://github.com/mrcalzon02/ReverieVR/blob/main/docs/project/ACCEPTANCE_LEDGER.md).
9. **Prior conversations** — October 5, 2026: no dead controls; positive/negative audio cues; optional QoL toggles. October 14–17, 2026: compact information-dense UI; actual game assets, connected game menus and gameplay; game-specific native modules and independently updatable releases.

> **Governing philosophy:** Challenge must arise from the game and its intended systems, not preventable friction, opaque information, broken controls, repetitive clerical work, misleading graphics, or unreliable software. A player-facing feature is either functional and verifiable or is not exposed as functional.

---

## A. Non-negotiable cross-project requirements [CORE]

### A1. Honest, functional interfaces

- **CORE-001 — No dead controls.** Every visible button, switch, setting, menu item, purchase, equipment slot and interaction performs real observable behavior. Incomplete features are not presented as available. Do not substitute placeholder successes or inert state changes.
- **CORE-002 — Recognizable states.** Focus, hover, pressed/selected, loading, accepted, unavailable and rejected states must be visually distinguishable as relevant. Disabled controls explain their reason and, when possible, the corrective action.
- **CORE-003 — Audible feedback.** Actions get a normal activation sound; rejected/failed actions get a *different* sound, with a visual equivalent and volume/accessibility control. Silent refusal is unacceptable where feedback is expected.
- **CORE-004 — Compact density.** Put a control, its relevant current state, and its result together. Remove repeated headlines, explanatory cards, duplicated status, wide blank margins and unnecessary navigation. Self-explanatory controls do not need paragraphs explaining their labels.
- **CORE-005 — One authoritative status.** Avoid simultaneously presenting contradictory HUD/menu/state copies. Controls always reflect actual active state, with no stale selections or fictional inventory.
- **CORE-006 — Usable back/exit.** A consistent Back/Escape path returns one navigation layer; pause/resume and a discoverable exit/quit path exist. The user is not trapped in modal windows, menus, calibration screens, or binding states.
- **CORE-007 — Visible consequences.** Buying, equipping, building, switching, upgrading, crafting and configuring changes actual game state, affects rendering/gameplay when applicable, and survives the appropriate persistence boundary.
- **CORE-008 — Real playable menus.** A menu is a workflow, not visual decoration. All essential functions work using the game's primary and fallback input methods.

### A2. Controls and accessibility

- **CORE-009 — Action mapping.** Bind gameplay to abstract actions, not magic hardware button numbers; provide rebinding when the hardware/platform permits it.
- **CORE-010 — Input coexistence.** Keyboard, mouse, controller, touch and headset-specific input sources must not spuriously cancel one another. Releasing one source must not release an action still held on another. Input focus changes must not cause phantom clicks.
- **CORE-011 — Choice of hold/toggle.** Make hold-versus-toggle options for sprint, crouch, aim and other prolonged actions where appropriate.
- **CORE-012 — Sensible movement and pointers.** Avoid mandatory mouse acceleration; provide sensitivity and meaningful dead-zone calibration for analog devices where relevant. No click-and-hold prerequisite for unrelated movement.
- **CORE-013 — Readability.** Legible fonts, scaling, contrast and predictable responsive layouts for target resolutions and viewed distance. Primary instructions must not rely solely on color or on audio.
- **CORE-014 — Captions.** Subtitle/caption support for dialogue, story, critical audio and actionable warnings; preferably available before the first cinematic. All essential evidence has a visual equivalent.
- **CORE-015 — Motion comfort.** Motion blur, extreme screen shake, disruptive depth-of-field, flashing and VR comfort options are independently configurable as relevant and not forced on players.
- **CORE-016 — Recovery route.** Bad bindings, missing controllers, invalid calibration, display settings and input interruptions never permanently lock the player out. Provide a known reset/back route appropriate to the platform.

### A3. Audio, visuals and defaults

- **CORE-017 — Safe sound startup.** Do not blast full-volume intro music. Expose separate Master, Music, Effects, Voice/Dialogue, and where useful Ambience sliders; remember settings.
- **CORE-018 — Respect attention.** Do not force repeated startup logo sequences or replay unskippable cinematics after retries. Skip and replay options must not compromise essential information.
- **CORE-019 — No flashbang loading.** Loading and transitions should be visually comfortable, especially when returning from a dark scene.
- **CORE-020 — Default quality is functional.** Native window size, fullscreen/borderless modes, aspect ratio, pointer mapping and safe fallback presentation must work on the intended platform. When downscaled rendering is supported, input coordinates must map accurately back to the logical view.
- **CORE-021 — Integrated art/audio.** If a project has approved finished assets, actually integrate them into the rendered world, UI and sound paths. A source file merely present in an archive is not game implementation. Avoid provisional primitive or text substitutes for finished available assets unless explicitly retained by art direction.
- **CORE-022 — Resource-constrained design.** Prioritize stable frame pacing, load reliability, input responsiveness and sustained thermal performance over effects that do not improve gameplay. VR reference-device constraints are specified in its own project contract.

### A4. Persistence, time and agency

- **CORE-023 — Persistent settings.** Volume, controls, accessibility, graphics, display mode, relevant placements and selected QoL automation survive ordinary relaunches.
- **CORE-024 — Reliable progress.** Document, implement and test save/restore boundaries. Avoid losing meaningful progress through arbitrary crashes or transitions. Save-anywhere is strongly preferred for suitable single-player games; in co-op, competitive, roguelike or simulation games, use an explicitly designed safe snapshot/checkpoint model instead.
- **CORE-025 — Respect player time.** Do not impose redundant clicks, constant manual sorting, forced busywork or grind introduced merely to occupy hours or encourage purchases.
- **CORE-026 — Optional automation.** QoL automation that changes player behavior should be an understandable, configurable option rather than an irreversible imposed rule. Keep a direct manual path when feasible.
- **CORE-027 — Standalone where reasonable.** A single-player game should not require an unrelated online account/server to continue playing. The design should preserve local saves and provide an end-of-service path when a network backend is genuinely required.
- **CORE-028 — Honest game rules.** Communicate required knowledge, practical consequences and mechanical restrictions at the point the player needs them. Intended hidden information in mystery/strategy games is different from opaque interface rules or broken explanations.

---

## B. Genre-triggered requirements [CONDITIONAL]

These become mandatory only if the corresponding system is actually present. Do not transplant every colony-simulation function into a chess game or VR media shell.

### B1. Inventory, equipment, item quality and commerce

- **COND-101 — Consistent inventory layouts.** Personal inventory has a predictable location and the same interaction model in loot containers, crafting benches, trade, cargo, and machine interfaces.
- **COND-102 — Efficient transfers.** Single-click modifiers, move-all, quick-store, quick-take, sort and search as appropriate; avoid mandatory long-distance dragging.
- **COND-103 — Useful filters.** Smart storage/category rules, deposit-all-matching and configurable auto-loot/auto-scrap/auto-sell when the game supports those activities.
- **COND-104 — Distinguishable objects.** Clearly render item type, quality, rarity, durability and important modifiers in-world and in inventory, including shape/icon/text cues in addition to color.
- **COND-105 — Favorites protection.** Lock/favorite important items against accidental drop, trade, salvage or sale; support naming when the game gives items enduring identity.
- **COND-106 — Safe stacking.** Do not silently collapse incompatible durability, quality, spoilage or ownership states into one deceptive stack.
- **COND-107 — Quick inspect/compare.** Inventory and world interactions support fast stat inspection, inferior-item warnings when appropriate, visible low durability and safe upgrades.

### B2. Crafting, technology and production

- **COND-108 — Full recipe discovery.** Show *Made At*, *Requires*, *Used In*, prerequisites and reverse dependency chains without external lookup or guesswork.
- **COND-109 — Production targets.** Support 'produce until stock reaches X,' keep-at-least stock thresholds, pause/resume and explicit quantity orders.
- **COND-110 — Honest stock counts.** Distinguish usable inventory, reserved materials, in-transit cargo, machine-output buffers and unavailable stock. No 'ghost inventory' caused by ignored adjacent resources.
- **COND-111 — Reservation consistency.** Assign/reserve recipe materials without concurrent jobs stealing them or permanently orphaning them.
- **COND-112 — Configurable substitutions.** Players can include/exclude material variants (e.g. ordinary wood versus precious wood) when recipes accept types.
- **COND-113 — Output routing.** Supported chains can route production to containers, drain full buffers, use overflow targets, and consume accessible outputs for downstream jobs.
- **COND-114 — Explain stalled work.** Every idle/stopped machine identifies its actual blocker (missing input, no power, full output, no worker, broken path, insufficient research).
- **COND-115 — Pin progression.** Allow pinning a build/recipe/research goal with live input counters, including optional blueprints for future technology that clearly cannot yet be built.

### B3. Physical construction, pathfinding and zoning

- **COND-116 — No accidental imprisonment.** Blueprint overlays and unfinished structures must not introduce invisible collision; scaffolding, build reach and path planning should avoid sealing workers or the player inside.
- **COND-117 — Efficient repetitive construction.** Batch/drag/hold-to-repeat placement, forgiving snapping and upgrade/replace-in-place tools as relevant.
- **COND-118 — No tiny-obstacle hell.** Reasonable auto-step, transparent carry visuals and no pixel-perfect positioning burdens for ordinary building.
- **COND-119 — Explain stability/zones.** Show structural-support and zoning restrictions; preserve room names, assignments and stable metadata during renovations whenever rules allow.
- **COND-120 — Legible multi-level maps.** Floor/z-level awareness, visibility modes, overlay transparency and navigation links to relevant positions.
- **COND-121 — Path explainability.** Visualize planned routes, obstructions and forbidden/hazard zones when AI path choices matter materially.

### B4. Faction/worker AI, logistics and automation

- **COND-122 — Survival beats trivia.** AI must not prioritize cleaning, hauling, trading or other low-value routines during attack, starvation, exhaustion or imminent danger.
- **COND-123 — Competent defenders.** Guards/units respond to intended threats, with rational target range and faction assignment rather than silently idling or attacking themselves/friendlies.
- **COND-124 — Efficient jobs.** Batch resource trips, collect from alternate known stockpiles, avoid infinite task switching and worker traffic jams.
- **COND-125 — Rules are visible.** Job priorities, allowed areas, workforce assignments, min/max stock targets and reasons for idle behavior are inspectable and configurable as appropriate.
- **COND-126 — Actionable alerts.** Warn about depleted critical resources, disrupted supply lines, catastrophic threats, or worker deaths with who/where/why and direct navigation. Do not train users to ignore permanent false emergencies.
- **COND-127 — Trace history.** Record meaningful event explanations and let players understand why an important failure, job change, conflict or loss occurred.

### B5. Economy, strategy and systemic world information

- **COND-128 — Market visibility.** When the game models meaningful price differences, provide local/global prices, trade routes and demand/supply displays rather than obscure economic simulation.
- **COND-129 — Configurable trade rules.** Support reasonable buy-below/sell-above thresholds when automated trading exists; suspend dangerous civilian trade actions during active threats where intended.
- **COND-130 — Useful knowledge indexes.** Hyperlink items, recipes, technologies, locations, factions and production pathways. An Infopedia should navigate the actual current game's data rather than static obsolete descriptions.
- **COND-131 — Information boundaries.** In fog-of-war/intelligence games, distinguish known/reported/estimated information from authoritative unseen world truth. UI must not leak hidden simulator state; uncertainty is meaningful gameplay, but interface ambiguity is not.
- **COND-132 — Multiple strategies.** Where the game premise allows it, encourage meaningful alternatives and agency rather than prescribing tedious single-solution progress.

---

## C. Architecture, production and integrity [ENGINEERING]

- **ENG-201 — Authoritative game state.** Draw UI from real systems; don't maintain parallel 'display' state that can drift from purchases, inventory, ability legality, AI decisions or saved progress.
- **ENG-202 — Unified interfaces.** Prefer shared menu/input/tooltip components and a standard back/focus mechanism, rather than bespoke inconsistent one-off panels. Exact layout is genre- and platform-sensitive; no huge universal UI chrome is compulsory.
- **ENG-203 — Separate simulation, rendering and input.** Preserve clear ownership and update boundaries. Reuse abstract input actions, decoupled draw state and reliable viewport-to-logical mapping. Use language/framework appropriate patterns (the original Java/Swing notes are examples, not universal mandates).
- **ENG-204 — Keep the game playable.** Each new character, weapon, level, menu or asset should have a reachable interaction and verifiable gameplay effect. 'Added file' does not equal 'implemented feature'.
- **ENG-205 — Licensed, traceable assets.** Import only assets needed for a specific game; track license and provenance. Shared libraries may store owned/purchased material without implying all such raw packs are freely redistributable. Distribution policy is asset-specific.
- **ENG-206 — Modular update identities.** Independent games/modules need their own IDs, versions, release manifests, changelogs, update checks and integrity validation; the hosting shell must not confuse one game's release with another.
- **ENG-207 — No silent regression.** Audio, controls, art, collision, purchases, persistence and progression should have targeted regression checks when touched. Do not 'fix' one game's menu by accidentally changing another game's shell.
- **ENG-208 — Root cause over masking.** Repair the authoritative source. Do not pass tests by stubbing, disabling checks, writing placeholders or leaving dormant duplicates.
- **ENG-209 — Verified change contract.** INTENT → EXECUTE → OBSERVE → VERIFY → CLAIM. A commit is not an installed build, an archived asset is not a rendered asset, and a passed isolated compiler test is not phone/device gameplay proof.
- **ENG-210 — Single-source documentation.** Requirements, active source, regression tests and acceptance ledger must be consistent. Mark pending device/runtime proof rather than claiming it.
- **ENG-211 — Efficient target hardware.** Test real hardware and sustained use; retro and constrained devices favor legibility and smooth frame pacing over excessive polygon/texture/effect fidelity.
- **ENG-212 — Preserve offline operation.** No unnecessary external account, always-online dependency or PC companion prerequisite for content that is meant to run locally.

---

## D. Release acceptance checklist [PROPOSED TEST]

A game-specific adaptation of the following checklist must be run on *each game* before claiming the feature or release is ready. Mark **PASS**, **FAIL**, **NOT APPLICABLE**, or **NOT YET TESTED**; do not silently omit checks.

1. **Boot and return:** Start from cold launch; start the game; pause, resume and return or quit; repeat without UI traps.
2. **Every affordance works:** Enumerate all visible controls and test normal, invalid and disabled states. No decorative buttons masquerade as actions.
3. **Multiple inputs:** Test every supported source; alternate sources while holding actions; verify focus does not trap or misfire.
4. **Layout and readability:** Test every menu at minimum supported screen size, in-game scaling and camera/VR distance, including longest expected labels.
5. **Audio and accessibility:** Change each slider and toggle; listen for activation/failure; verify captions and visual critical-cue equivalents.
6. **Actual content:** Verify approved models, textures, icons, sounds and animations are loaded, visible/audible and attributed; no unexpected placeholder substitute.
7. **Transactions and interactions:** Purchase, equip, build, upgrade, consume, repair and undo where applicable; compare actual state and visual representation.
8. **Progression:** Complete realistic encounters/waves/jobs/campaign transitions with meaningful pacing; no zero-content stages or premature completion.
9. **Persistence:** Save/relaunch/reload; test corrupt or old save migration; verify settings and economic state.
10. **AI and physical logic:** Exercise genuine attacks, friendly fire restrictions, pathing, enemy life/death rules, spawns and exhaustion/retreat as applicable.
11. **Performance:** Measure sustained framerate/frame-time, memory, thermal stability, crash-free cycles and input lag on target hardware.
12. **Offline/recovery:** Disconnect network/peripherals where appropriate and verify safe graceful behavior, recovered controls, usable exits and persisted state.
13. **Packaging and updates:** Confirm platform package launches; module package IDs/version/update URLs are game-specific; update preserves data and can be verified by integrity checks.
14. **Evidence and disclosure:** Link tested revision/build; distinguish static/host-level/device-level validation; list untested paths without laundering them into passes.

## E. Application profiles

| Game category | Mandatory beyond core |
|---|---|
| Native classic games (chess, cards, puzzles) | Complete official rule set, full expected board/deck sizes, legal moves/turns, undo/restart where suitable, actual opponent AI when advertised, genuine imagery and sound, persistence of settings |
| Arcade/action games (Breakwater Battery, Omega Front, Gumball Armada) | Real hit detection, targets/waves, meaningful stage/score/reward loop, clear HUD, readable controls, correct friendly/enemy behavior, genuine deployed audiovisual assets |
| Horror/co-op games (Red Ledger / Between Deliveries) | Functional lobby and role assignment, equipment/evidence/health/sanity loops, clear danger feedback, audio evidence caption equivalents, role fairness, playable environments and reliable reconnection |
| Construction, factory and colony simulations (The Mechanist and applicable modes) | Inventory/production/logistics/job automation, recipe chain discovery, work reasons, pathing/faction safety, zoning and efficient repetitive construction |
| Recon/strategy simulations (Ministry of Intelligence) | No hidden truth leakage, confidence/uncertainty model, map/source provenance, orders with visibly changing state, coherent sector and time progression |
| ReverieVR hosting shell and phone-only games | Phone-resident operation, native module lifecycle, controller/gaze shell recovery, per-game update identity, stable frame pacing and battery/thermal status, Samsung S9/Daydream validation |

## F. Rules of use

1. **Attach this standard to every game plan**, and select a game-specific profile. Cross-project principles are shared; feature lists are conditional on gameplay. Do not add unnecessary production-factory controls to a small chess game.
2. **Translate each active requirement into an acceptance test**, with code owners, verified state and evidence. A requirement is not complete because it appears in a design document.
3. **Keep settings minimal but functional.** Don't build menu sections just to explain hypothetical features; expose real toggles where settings are meaningful.
4. **No lowering of a documented acceptance gate without explicit scope approval.** Hardware/tool unavailability means pending proof, not accepted proof.
5. **Maintain a central source and reference it from projects** rather than letting multiple conflicting versions of the philosophy proliferate.

**Recovery note:** The original *Gaming defaults mistakes* Google document is still the most comprehensive inventory of game-specific annoyances; this file reorganizes it with other prior contracts into a portable enforcement framework. It does not overwrite the Google original or commit to any project repository.