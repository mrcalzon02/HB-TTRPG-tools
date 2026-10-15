# The Beckenburg Project — Hunter, Evidence, Ritual and Economy Requirements
Status: design specification, not shipped gameplay.

## Shared hunter baseline
All three players have first-person movement, crouch/sprint, carry/drop/use, flashlight, map and journal, local/team communication, injury/stress state, limited inventory and standard escape/ward knowledge. They can communicate location and evidence and perform a slow fallback version of critical investigation. Role differences are efficiencies and signature tactics, not permanent unwinnable locks. Inventory and progression must be authoritative on the host.

### Cleric — defensiveness and cleansing
Core tool: blessed focus and portable ward markers.
Actions: consecrate threshold; bless teammate; stabilize fear/possession; establish temporary safe patch; lead banishment; sanctify anchor.
Costs: limited consecrated material and concentration; strong rites take time and produce audible/visual signatures the ghost can contest.
Upgrades: longer ward integrity, faster recovery, cooperative prayer radius, reduced ritual interruption.
Tactical weakness: lower analysis resolution; visible positioning exposes the cleric.

### Observer — inference and tracking
Core tool: synchronized environmental recorder.
Actions: triangulate movement, mark anomalies on map, compare instrument baselines, monitor devices remotely, document contradictory evidence, set sensors.
Costs: battery, vulnerable setup time, limited concurrent feeds and false positives in electrical storms.
Upgrades: calibration, multi-camera sync, better spatial confidence, prolonged recording and noise reduction.
Tactical weakness: weakest direct anti-ghost intervention during hunts.

### Demonologist — interaction and dangerous knowledge
Core tool: researched grimoire, summoning seal and reagent pouch.
Actions: formulate questions, trigger controlled provocation, identify lore-dependent anchors, lead séance, unbind bargains, counter possession.
Costs: corruption exposure, ghost attention, limited reagents and need to interpret ambiguous replies.
Upgrades: safer circles, wider dialect/lore clues, better pact-breaking, faster controlled interrogation.
Tactical weakness: premature provocation worsens pressure and may expose squad.

## Equipment requirements
Every item definition specifies: source/vendor/price, slot and mass, charge/consumable, placement or held mode, interaction range, baseline noise, ghost-produced signal mappings, environment-produced interference, calibration method, durability, repair, ownership and role compatibility, network events and visual/audio/readable text feedback. No device may show a "ghost event" reading unrelated to actual world state.

**Starting instruments:** EM anomaly meter (field spikes with falloff), digital temperature probe (air/surface and ambient baseline), directional recorder (distance and occlusion), low-light/spectral camera (video artifacts and image evidence), notebook/map (manual pinning, source/certainty). High-risk gear: spirit receiver/talking box, consecrated talismans, ritual chalk/cord, anchor-sampling vessel, motion tripwire, isolated offering and UV/spectral residue lamp. Expansion equipment: pressure sensor arrays, thermal imaging, reliquaries and evidence-development station.

## Evidence confidence model
EvidenceReading = detector ID + ghost/world event ID + position/zone + timestamp + observed intensity + baseline + confidence + contamination flags + optional recording pointer. An evidence family requires repeated or corroborated context except for unusually strong singular events. Fake signals are still world events tagged by simulator but may be disguised to hunters; debugging reveals provenance only in test mode.

A field journal records hypothesis lists, negative tests, confidence and contradictions, and does not automatically announce the ghost type. It can remind the team why a claim was added. Each ghost has at least three ways to be meaningfully differentiated over time even when Mimic/Twins or environmental contamination are present.

## Ritual sequence engine
RitualDefinition contains ID, objectives, permitted zone tags and site anchors, equipment/reagent budget, minimum participants, optional role advantages, focus timing, audibility, progression phases, conditions for interruption, ghost counter-commands, risk and success/failure effects. The mission host checks all conditions each stage.

**Séance:** identify an anchor candidate, establish circle, place focus object, ask a meaningful question, read response, choose to continue or close circle. Provides evidence and carries heightened attention; séance is not an automatic banishment.

**Warding/containment:** choose threshold and valid placement, inscribe linked glyphs, stabilize ward, defend while energy settles; may restrict roaming/hunt across the threshold temporarily, without indefinite trapping.

**Banishment/exorcism:** collect genuine evidence, select appropriate tradition, identify or reconstruct attachment/name, position at valid anchor, perform multi-phase team rite, adapt when ghost disrupts candles/wards and complete binding; incorrect type or broken circle increases risk.

**Site cleansing:** seal residual anchors, remove or secure cursed objects, re-enable safe electrics and inspect final zone status. Cleansing may follow banishment or partial containment and alters reclamation record.

**Pact-breaking:** analyze exact clauses, gather counterpart material, avoid triggering penalty, void or renegotiate; designed especially for Devil but sometimes relevant elsewhere.

No ritual is scripted cutscene-only. Each phase changes simulated world state and can be interrupted in specific fair ways; ghost must have limited energy and cooldowns for sabotage, and hunters need observable countermeasures.

## Injury, fear and loss
Proposed state axes: injury, stress, contamination/possession susceptibility, exhaustion and temporary incapacitation. Values and damage remain tunable; avoid cementing arbitrary hit points during planning. Minor harms persist during mission; medical treatment and warding reduce effects. A normal first ghost strike should not immediately kill a full-health investigator. Escalated repeated exposure, environmental accidents and deliberate dangerous provocation can become lethal with warnings. A downed player receives rescue/extraction opportunities where feasible. Death and retreat produce distinct financial and recovery outcomes.

## Economy and experience
Mission payout components: risk tier, location progress, documented evidence quality, correct identification confidence, ritual/cleansing outcome, optional objectives, survivor extraction and property damage. Repair, lost equipment, hospital/infirmary and consumables introduce meaningful expenditure but should not lock players into repeated unwinnable starter gear. Both ghost controllers use same scenario and powers; human ghost earns appropriate XP/currency or non-equipment reputation awards without incentivizing abusive griefing. Role XP unlocks sidegrades and tactical options; high-level characters cannot automatically trivialize low-level investigations.

## Network and abuse cases
Trade/drop spam, duplicate purchased tools, impossible equipment charge, fake readings, rapid ritual submissions and inventory desync are host-rejected. All monetary results applied once at mission finalization with transaction ID; session reconnection cannot double award. Save version and migration are recorded. Test each role against each of the thirteen ghosts with and without ideal equipment to uncover hard locks.