# The Beckenburg Project — Ghost Catalogue and Parity Rules
All entries are **design candidates**, not implemented content. Every ghost inherits movement, evidence, manifestation, harassment, harm and retreat capabilities; differences come from legal extra abilities, costs, priorities and countermeasures, never separate AI-only or player-only powers. The exact signature evidence distribution must be playtested so no archetype is trivially inferred from one first-minute clue.

## Shared simulation contract
GhostState contains archetype, anchor room, location (including phased layer), manifestation, influence energy, agitation, hunt charge, action cooldowns, observation knowledge and objective pressures. Authoritative GhostCommand uses actor ID, action ID, target/zone, timestamp/sequence and optional bounded parameters. Dispatcher validates cooldown, energy, LOS/spectral line, evidence/ritual precondition, valid target, range, room tag, pressure phase and injury caps. Server emits authoritative events with tell and evidentiary trace. Both controllers see legal observations and issue commands; AI can react to heard sounds and visible hunter activity but cannot query unobserved inventory, private notebook, ritual inputs or exact hidden player positions. Host debug overlay may expose extra information only in isolated test builds.

### Default shared abilities
Quiet drift and legal passage/phasing; ambient murmur, temperature disturbance and knocks; brief apparition/partial silhouette; move/tip/throw props; manipulate selected switches/doors; summon misleading sound; induce fear; inflict limited manifested strike; short hunt with warning/cooldown; return to chosen anchor or roam. Archetypes modify ranges and costs. Abilities must have timers, visibility or discoverable telemetry and counters; no free unbounded action spam.

### AI/human parity audit
Test each action ID under matching actor world state for both sources and compare accepted/rejected results, energy delta, damage, cooldown, physical effect, created evidence and audio/visual tell. Human ghosts may be harder to *operate* because aiming, spatial reading and concentration require player input; AI may have heuristics, reaction delay and uncertain knowledge. Human and AI must not have different stats disguised as convenience. Every special action must be reachable from the human ghost HUD and callable by AI through the same public action dispatcher.

## Entity profiles
### Possessive
Identity: attachments and claimed belongings; chooses victims carrying marked objects.
Behaviour: tags an item with affinity, moves it toward a claimed room; temporary possession of suitable objects and occasional susceptible hunter impairments.
Evidence: recurring item displacement, linked personal-object temperature shifts, involuntary voice/audio artifacts and specific resonance to relinquishment rituals.
Counter: identify/separate claimed possession, cleanse an item or break ownership link; dangerous while affected hunter carries it.
Hunt: stalks afflicted carrier; ramped impairment before direct physical attack.
Risk: avoid stealing player agency for long periods; possession has a brief, disclosed limit and recovery.

### Poltergeist
Identity: a physics manipulator in cluttered environments.
Behaviour: multi-object throw chain, temporary object orbit, room-level clutter traps and audible propulsion.
Evidence: force vectors inconsistent with gravity, grouped displacement signatures and vibration bursts.
Counter: clear/secure objects, quiet the affected zone and use anchored wards; throws require valid mass/energy budget.
Hunt: pushes or knocks down; thrown objects deal capped incremental injury, not instant death.
Risk: physics must be deterministic enough to network and not create unresolvable door jams.

### Demon
Identity: pressure, intrusion and openly hostile possession of cursed thresholds.
Behaviour: corrupts wards, feeds on provocation, short forceful manifestations, attack cadence as agitation rises.
Evidence: hostile sigil patterns, fast pressure accumulation, ward degradation and concordant audible threats.
Counter: correct sanctification, lower provocation and rotate wards; unusually responsive to Cleric protection.
Hunt: forceful but well-telegraphed; recovery exhaustion after powerful assault.
Risk: no first-contact instant lethal outburst.

### Yokai
Identity: place-bound spirit strongly influenced by sound, etiquette and local customs.
Behaviour: redirects voices, reacts to speech/name misuse, wanders between culturally meaningful spaces, masks itself in household audio.
Evidence: voice-position paradoxes, scripted etiquette reactions, patterned routes through tagged thresholds.
Counter: silence, respect a discoverable site rule, correct offerings or lore-informed address.
Hunt: targets noisy actors; limited long-range visual tracking.
Risk: player microphones are optional; all reactions available through in-game speaking/provocation controls.

### Banshee
Identity: grief and warning before violence.
Behaviour: long-distance wails, target preoccupation, false death omens, dread build-up tied to an individual.
Evidence: identifiable spectral cry, personal resonance and localized grief residue.
Counter: acoustic triangulation, protective companions and warded respite.
Hunt: focused pursuit after audible crescendo; vulnerable during post-wail recovery.
Risk: hard-of-hearing players receive equivalent visible waveform/annotation clue.

### Wraith
Identity: thin presence spanning walls and occult pathways.
Behaviour: traverses spectral shortcuts, leaves disjoint track positions, momentarily emerges at surfaces.
Evidence: mismatch between physical route and sighting, cold extrusion at walls, low material impact.
Counter: mark spectral thresholds and deploy phase wards; requires legal zone adjacency even through walls.
Hunt: ambush repositioning, relatively weaker physical shove.
Risk: never unrestricted teleport anywhere or unavoidable wall hit.

### Shade
Identity: feeds on shadow and lack of witnesses.
Behaviour: dims local lights, becomes bolder in isolated darkness, withdraws from lit groups.
Evidence: correlated light attenuation, suppressed manifestations near teams, distinctive shadow edges.
Counter: illuminate key rooms, move in pairs, timed camera flashes.
Hunt: solitary targets in darkness; interrupted by strong light or witnesses.
Risk: darkness cannot render all gameplay illegible.

### Specter
Identity: visual apparition that intermittently slips out of conventional sight.
Behaviour: apparitions, decoy silhouettes, afterimages, viewpoint-dependent sightings.
Evidence: video artifacts versus direct perception, multi-angle discrepancies and timed spectral residues.
Counter: camera cross-check, multi-observer triangulation, controlled flashes.
Hunt: disorientation and brief manifested hits; decoys cannot cause unannounced damage.
Risk: decoys must have at least one learnable distinguishing tell.

### Spirit
Identity: versatile baseline restless human or ancient presence.
Behaviour: conventional wandering, object touches, knocks, variable temperament; responds to address and funerary rite.
Evidence: balanced electro/temperature/audio/marking clue spread with consistent room affinity.
Counter: follow site history and anchor identification; easy-to-understand basic warding.
Hunt: predictable escalation, fair beginner tutorial identity.
Risk: generic does not mean evidence-free; must be solvable without guessing.

### Hantu
Identity: an entity of cold and drafts.
Behaviour: drains warmth, changes fog/draft, accelerates in cold zones, slows near stabilized heat.
Evidence: directional temperature gradients, condensation and frost signatures, disturbances at vents.
Counter: restore heat, seal drafts and carry warming/warding kit.
Hunt: zone-temperature-dependent pursuit and chill injury over time.
Risk: harsh climate/weather must not confuse generated haunting evidence without baseline calibration.

### Devil
Identity: manipulative contract maker; different from the assault-oriented Demon.
Behaviour: tempting offers, delayed bargain consequences, falsified pact documents, conditional access to information.
Evidence: contract residues, truthful-but-misleading exchange clues, a repeated binding phrase.
Counter: refuse/void bargains, discover terms, cleanse contractual anchors and avoid accepting free boons.
Hunt: stronger when conditions are met, weaker when bargains are correctly severed.
Risk: never require player to accept an irreversible trap without any warning.

### Mimic
Identity: copies sights, sounds and limited supernatural signatures.
Behaviour: temporary copy of one legal signal/tell profile, impersonates benign or dangerous ghost behaviour, can adopt another ghost's non-exclusive trick at additional cost.
Evidence: inconsistent time-separated signatures, repeated imitation lag and copy degradation.
Counter: take longitudinal evidence, test permanent weakness/anchor rather than a single signal.
Hunt: unpredictable borrowed style within cost and cooldown budget.
Risk: deliberately fake evidence must remain logically falsifiable, not random unsolvable noise.

### Twins
Identity: two linked manifestations of one participant slot.
Behaviour: local paired presences, complementary room haunting, brief convergences; one ghost entity resource pool controlled by a human or AI.
Evidence: correlated simultaneous or alternating events in two adjacent zones, shared resonance and interlinked anchors.
Counter: trace shared tether and simultaneous containment; splitting spreads influence thin.
Hunt: flanks by alternating manifestations; no two independent lethal hunters acting simultaneously unless energy and telegraph permit clear counterplay.
Risk: AI path/visibility and UI must convey two avatars, one controller and one legal action budget.

## Evidence families and cross-confirmation
EM/anomalous field; temperature and air-current disturbances; audio/voice/EVP; spectrographic camera manifestations; physical displacement and residue; inscriptions or response writing; ritual/relic resonance; spectral movement route; possession/corruption markers; historical/contractual site clues. A clue has cause, strength, locality, timestamp, decay, discoverability, possible contamination and affected instruments. False clues from weather, electronics and deliberate ghost action must have coherent provenance, not pure dice rolls.

## Mandatory per-ghost authoring schema
ID and original visual identity; anchor affinity; movement constraints; base and special commands; energy/cooldowns/telegraphs; hunter-perceivable clues and their confidence; roaming and hunt state policies; injury/corruption profile; strengths and counter-rites; site/prop compatibility; AI priorities using legal observations; player HUD cues; tutorial exposure; automated parity tests and balance metrics. No roster entry marked implemented until schema, gameplay, network, visual/audio accessibility and counterplay tests pass.

## Fairness targets to verify empirically
First major hunt only after discoverable escalation; at least two viable counterplay routes per archetype; recoverable injuries and observable relief after successful defense; no map-specific unescapable lock; clear failure cause on summary screen. Win-rate goals are **placeholders subject to playtest**, not balance promises.