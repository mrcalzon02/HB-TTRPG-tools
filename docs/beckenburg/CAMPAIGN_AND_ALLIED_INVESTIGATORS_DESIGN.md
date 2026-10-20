# The Beckenburg Project — Solo Campaign, Allied Investigators and Ghost Campaign

**Status:** future design concepts proposed 2026-10-20; not implemented, funded, scheduled, playtested or added to the binding release scope. Existing 3v1 asymmetric LAN, AI-ghost fallback, Castle Beckenburg hub, evidence/ritual systems and nine site families retain their production obligations. Stage and completion claims belong only in [stage-ledger.json](stage-ledger.json).

## Product shape

The expanded named-location roster creates three complementary experiences on the same simulated world and shared mechanics:

1. **Cooperative investigation:** the existing human-investigator versus human/AI-ghost contract remains intact.
2. **Solo investigator campaign:** one human investigator accepts a chain of contracts, gradually restores Castle Beckenburg, earns money and reputation, and optionally hires or deploys AI companions.
3. **Solo ghost campaign:** one human ghost defends its territory and develops a haunting against AI-controlled investigators, while exploring a different perspective on linked events.

A larger roster is an opportunity for narrative structure, not proof that every proposed site is already available. The modes reuse authored sites, legal ghost actions, equipment and evidence rules rather than creating an incompatible second game.

## Named-site identity and persistence

Every location has a compact persistent **SiteDossier** distinct from its scenario instance:
- stable site ID, title, region, authored-zone map version, history summary, era and physical hazards;
- discovered records, personal accounts, environmental changes, optional historical puzzles and regional connections;
- contract availability, visited/cleared/abandoned state, optional future revisits and player-found discoveries;
- references to authored architecture, ambient audio, site-specific ordinary props and procedural scenario eligibility.

Each mission instance keeps its own ghost controller/type, eligible anchor/ritual zones, weather, actual instrument events, objectives, escalation and result. An inherited location backstory must not reveal or guarantee a ghost identity, ritual, or evidence combination. Story beats and environmental red herrings are distinguishable from player-observed evidence; no automatic journal confirmation or deliberate uncaused false detector readings.

Example: Blackpine's missing payroll entries and ruined sawmill persist between visits, while a particular contract's ghost behavior, evidence, and anchor remain variable. A manifest might later connect Blackpine to Dead Man's Claim. A campaign revisit can expose a newly navigable basement or archive only when that geometry actually exists and is tested.

## Solo investigator campaign loop

At **Castle Beckenburg** the player consults a compact contract board and site dossiers, selects a job, reviews risk, chooses equipment and any paid companions, and deploys to the chosen map. Investigation and manual deduction proceed under the normal simulation. Successful identity, containment, banishment, cleansing, absolution, rescue, retrieval or retreat outcomes feed a post-mission report with evidence, costs and consequences.

The resulting credits, optional professional experience, local reputation and site discoveries fund the next expedition. Castle services can be restored progressively: archive/research, workshop and repairs, supply armory, infirmary, training and dispatch capacity. Improvements should change understandable functionality rather than add large empty menu screens. Save state must preserve player, castle, location discoveries and contracted assets independently of momentary LAN/mission state.

**Contract families (proposals):** routine survey; evidence documentation; escalating activity response; lost-person search; item retrieval; containment; banishment or cleansing; follow-up on incomplete prior work; region-linked special case. Not every contract demands a successful full exorcism; partial success, controlled retreat and remaining uncertainty can be legitimate results.

**Campaign structure (proposal):** nearby relatively safe sites introduce tools and risk; remote sites introduce longer searches, vertical routes and environmental confounders; regional dossiers allow cross-location discoveries; later operations can explore why Castle Beckenburg and the reclaimed districts are at the center of renewed supernatural activity. The story may have a central arc without forcing linear mission selection.

## Hireable AI allies — economy, roles and orders

Allies are **in-world NPC investigators hired, equipped, deployed and paid through the campaign**, not purchased supernatural advantages or automatic clue-solvers. Prefer transparent hire fees and optional ongoing wages/recovery costs to premium currency or random gacha rolls. Full survivor and equipment-loss consequences must be consistent with existing economy rules and never create a no-recovery financial soft lock.

| Working recruit type | Legal contributions | Boundaries |
| --- | --- | --- |
| Field Assistant | Carries assigned player-owned gear, holds position, places it when ordered, extracts supplies | Cannot conjure gear, teleport freely or know ghost type |
| Evidence Technician | Operates an assigned detector/camera, reads raw results, reports time and location | Does not label the evidence “confirmed” or fill the player's journal |
| Researcher | Indexes discovered physical records and develops site-history leads | Does not learn live ghost identity from lore alone |
| Occult Specialist | Supports valid rites, gathers specified materials and maintains wards | Does not bypass rite prerequisites or reduce risk to zero |
| Security / Recovery Contractor | Watches a route, assists evacuations and recovers incapacitated teammates | No firearms-as-solution or immune bodyguard behavior |
| Veteran Investigator | Executes bounded independent zone sweeps, uses approved tools and retreats on observed danger | No access to hidden ghost state or omniscient enemy locations |

Keep initial NPC scope small: begin with one functional assistant using the same real movement, pickup, inventory, detector, ghost perception and ritual APIs as players. Role variety and autonomous mission planning come **after** verified shared behavior; titles in this table are archetype proposals, not completed characters or purchases.

**Player orders:** follow, hold, go to named zone, investigate using specified owned tool, observe/record, regroup, assist reachable rite, carry/recover and retreat/extract. Orders need meaningful acknowledgments, cancellations, path recovery, line-of-sight/range constraints, condition-based refusals and a concise readable orders panel. Avoid sprawling tabs and control explanations that duplicate the label.

**Behavior contract:** AI acts only on sensory inputs its embodied agent could legally perceive; it uses the same tool-specific signal provenance, cooldowns, hazards, transport capacities and path graph as the player. Reports are plain-language summaries of observations, not exposure of internal hidden simulator state. Companions may be mistaken, delayed, injured, separated or frightened, but must not deliberately cheat or become useless by arbitrary random failure. The player chooses which readings to enter into the **manual** journal.

**Economy and multiplayer boundary:** campaign NPCs occupy explicit expedition capacity/seats; never silently exceed a host's configured team-size rules. Money changes, wages, purchases, rewards and ownership persist through transactional save operations and cannot double-apply after reconnect. No recruit becomes an illicit inventory source or uncontrolled multiplayer actor.

## Solo ghost campaign — second perspective

Allow the human to control a ghost from its own permitted observation and action interface as increasingly competent AI investigators arrive. The objective is not a simple instant-kill arena: the spirit may have to protect an anchor, preserve secrecy, prevent a rite, misdirect evidence interpretation, hold territory long enough to accomplish a story goal, or uncover memories associated with a named location.

**Core loop:** choose/receive a haunting assignment, inspect legally known territory and anchor relationships, budget influence energy and cooldowns, listen and observe via the same ghost sensing contract, manipulate surroundings, disturb or mislead investigators using legal simulation events, resist rituals, and resolve the encounter. Outcomes may include successful defense, displaced haunting, negotiation, loss of anchor, reclamation or banishment. Specific victory conditions should remain legible and counterable by the AI hunter team.

**Progression proposal:** an optional campaign-only haunt-development layer can unlock new narrative tactics, environmental affordances or archetype-specific sidegrades. It must not secretly upgrade a human ghost's stats against the existing multiplayer parity contract. New legal abilities require the same dispatcher, resource costs, telegraphs, counters and exposure for AI/human ghosts; keep campaign progression isolated from standardized LAN balance unless a separately tested rule set explicitly opts in.

**AI investigator opponents:** leverage the exact observation, equipment, movement, investigation, journal, inventory and rite modules created for solo campaign companions. Agents must investigate causally, react to apparent evidence and retreat based on knowledge available to human hunters—not inspect hidden ghost type, legal anchor map or debug data. Different veteran/novice profiles can change choices, reaction latency and competence, not privileged world-state access.

**Narrative contrast:** the investigator campaign presents partial accounts of unexplained deaths and disappearances; the ghost campaign can revisit the same sites from an entity's perspective, expose contradictory memories, and reframe why a ghost objects to intrusion. Ghosts need not all be innocent, nor every investigator mistaken. A place's history offers a story; the simulated encounter retains genuine replayability.

## Shared simulation and technical seams

- **Site catalog and zone data:** stable IDs, distinct geometry, named routes, weather baselines, acoustic/vertical connectivity and ritual sockets; follow [locations-environments.md](locations-environments.md).
- **Evidence and notebook:** only actual world events drive instrument data; investigator manually interprets/ticks evidence. Neither NPC researcher nor campaign plot grants pre-confirmed answers; follow [MANUAL_EVIDENCE_JOURNAL.md](MANUAL_EVIDENCE_JOURNAL.md).
- **Ghost actions:** AI and human controllers use the same legal host-authoritative action dispatcher, costs and visible feedback; follow [ghosts.md](ghosts.md).
- **Owned equipment:** only actually issued/purchased, carried and deployed items exist in the mission; never dress a site with free investigative gear; follow [LOCATION_EXPANSION.md](LOCATION_EXPANSION.md).
- **Saves:** site history, campaign player progression, NPC contracts and ghost-campaign progression need versioned records with idempotent transactions and migration tests. Never conflate story completion with evidence or an active network snapshot.
- **Interface:** one compact contract/region view, accessible site dossier, companion roster/orders and concise result report; no compulsory repetitive dialogs. Maps should be scrollable and searchable when scale justifies it.
- **Accessibility and difficulty:** independent options for navigation cues, text/audio equivalents, AI-companion support, and reduced environmental visual noise; do not hide core rules behind difficulty.

## Proposed phased implementation and gates

**C0 — Narrative/site model.** Author site IDs, proper-name catalog, lore fields, region associations and narrative-state schema with no fabricated playable claims. Validate serialization and cross-reference integrity.

**C1 — First wilderness graybox.** Prove Blackpine as a connected dispersed site (then Camp Hollow Creek and Red Mesa for outdoor and vertical traversal). Test all detector baselines, three ritual locations, hazards and human/ghost access before building a broad roster.

**C2 — Solo contract persistence.** Implement an actual playable contract board, payouts/recovery, durable location discoveries and repeatable mission seeds using existing Castle Beckenburg facilities.

**C3 — One real companion.** Implement embodied observation + navigation + orders + owned equipment; playtest against multiple ghost types and outdoor/indoor maps. Extend with specialists only after it works.

**C4 — Ghost versus AI hunters.** Reuse those embodied investigative agents as opponents and validate human/AI ghost command parity; add ghost campaign goals, mission resolution and stories only after adversarial playability.

**C5 — Region arcs and additional locations.** Expand naming/story links and map count at verified, affordable increments; do not claim 30–60 locations or a finished campaign from the existence of a design roster.

These are **concept phases**, not additions to the live 32-stage production ledger or a replacement for initial-release M0–M5 gates. Adding features to a release milestone needs an explicit scope and acceptance decision.

## Acceptance questions for a future approved milestone

Can a solo player finish an entire real contract with one companion without receiving magical information? Can an NPC issue a timestamped raw observation without automatically solving the journal? Can both ghost controller types execute the same lawfully restricted action in identical state? Can the AI investigator find, flee and perform a valid rite without reading privileged simulator memory? Can the campaign survive crashes, returns to castle, equipment recovery, repeated site visits and reconnect without duplicating rewards? Can all three investigation outcomes work on the first new wilderness map with unique geometry? If not, the corresponding feature stays **design only**.

Related: [remote site roster](environments/WILDERNESS_AND_REMOTE_SITE_ROSTER.md), [environment contract](locations-environments.md), [ghost parity](ghosts.md), [hunter/economy requirements](hunters-equipment-rituals.md), and [release production plan](RELEASE_PRODUCTION_PLAN.md).
