# Beckenburg — thirteen-ghost evidence matrix (authoritative design)

**Status (2026-10-18):** the complete proposed ghost/equipment evidence matrix, aligned with the currently implemented ghost identity, environmental, writing and physical-trait generators. Each row is also exposed by `GhostEvidenceMatrix.java`, which reads `GhostEvidenceProfile.java`, `GhostTraits.java`, and `GhostIdentity.java` instead of copying those source rules into a second table. New devices and tests below are **not** automatically available to players. Existing source code for current instruments/ghost actions must be validated in an actual Java runtime before a release can be called complete.

## The matrix

| Ghost | EMF reading | Thermal reading | Ghost writing | UV traces | Optical manifestation | D.O.T.S. candidate¹ | Original device target² | Rite |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Possessive | 7–10 | Freezing | Child drawings; ritual circles | Yes | Visible figure | — | Object imprint scanner | Absolution |
| Poltergeist | 7–10 | Extreme heat | Frantic scrawls | Yes | Visible figure | — | Seismic impact recorder | Banishment |
| Demon | 7–10 | Extreme heat | Frantic scrawls; ritual circles | No | Visible figure | — | Resonance tuner | Banishment |
| Yokai | 7–10 | Extreme heat | None | No | Spirit orbs | Yes | Resonance tuner | Absolution |
| Banshee | 7–10 | Freezing | None | No | Visible figure | — | Ectoplasm sampler | Absolution |
| Wraith | 7–10 | Freezing | Frantic scrawls; ritual circles | Yes | Visible figure | Yes | Structured-light grid | Banishment |
| Shade | **0 (suppression)** | Freezing | Ritual circles | Yes | Camera-only figure | Yes | Spectral prism | Cleansing |
| Specter | **0 (suppression)** | Freezing | Ritual circles | Yes | Camera-only figure | Yes | Spectral prism; resonance tuner | Cleansing |
| Spirit | 7–10 | Freezing | Child drawings | Yes | Visible figure | — | Object imprint scanner | Absolution |
| Hantu | **0 (suppression)** | Freezing | None | No | Spirit orbs | Yes | Barometric anomaly probe | Cleansing |
| Devil | 7–10 | Extreme heat | Frantic scrawls; ritual circles | Yes | Visible figure | — | Resonance tuner | Banishment |
| Mimic | 7–10 | Extreme heat | Child drawings; frantic scrawls | Yes | Visible figure | — | Object imprint scanner | Cleansing |
| Twins | 7–10 | Extreme heat | None | No | Spirit orbs | Yes | Seismic impact recorder | Absolution |

¹ **D.O.T.S. is a candidate design rule, not an implemented projector.** The current compatibility rule assigns it to species with wall phasing or orb manifestations: Yokai, Wraith, Shade, Specter, Hantu and Twins. No checkbox automatically creates D.O.T.S. activity. The actual laser/projector interaction, ghost passage and visibility restrictions must be completed before it becomes a usable clue.

² **Original-device column is explicitly future-target equipment**, not a claim that these devices or their phenomena exist in a playable build. It gives each species another specific equipment interaction to develop. Their functional source, prop, placement, authoring, audiovisual feedback, instrument readout, log entry and host validation are future gates. For an unavailable instrument, the corresponding ghost is still deducible through its other designed traits and behavior.

## Core rules governing the table

**All instruments measure; the journal does not validate.** A numerical reading or an observed mark enters the automatic measurement log. A hunter separately clicks evidence checkboxes by choice; these mark subjective conclusions and grey incompatible ghosts in the full roster. Unticking restores them, and even contradictory notes remain editable. No automatic marking or a required number of readings for identification/ritual completion.

**EMF:** every ghost has dynamic environmental readings. Normal activity fluctuates 1–10 as genuine ghost actions strengthen, with high readings in the **7–10** range when supported by its type. A suppression-capable ghost can instead collapse a working meter to **0** during an actual nearby spectral event. A 0 reading is immediately logged and may be ticked at the player's discretion; there is no repeated-observation or confirmation gate. Low ordinary activity is not automatically a suppression event. The current three suppression profiles are Shade, Specter and Hantu.

**Temperature:** the whole environment has weather/season/time, heating and room temperature variation. Ghost-induced freezing (below 0°C) or extreme heat (at least 90°F, approximately 32.2°C) can change the room, consistently with its species profile. Natural climate conditions are still displayed as actual ambient measurements, **but no unrelated environment source is allowed to invent ghost-specific activity or markings**. Celsius/Fahrenheit is display preference, not an identity code.

**Writing:** a ghost must actually interact with an existing placed book. Markings are child drawings, frantic scrawls, or ritual circles drawn in its permitted style set. The same style can occur for multiple ghosts. Some ghosts never write; absence of writing in an otherwise blank book is merely what the player observed, not a game-issued negative proof. The current ghost-writing event path is partial until page graphics and the open-book mesh are rendered in the world.

**UV/visual:** UV clues only come from genuine ghost traversal or relevant interactions. Sight and orbs are taken from the existing ghost traits; camera-only forms must not become ordinary naked-eye figures. A physical ghost movement or manifestation must drive projectors and camera footage rather than drawing a fake clue on the HUD.

**Voice/behavior:** the existing spirit-box code can respond in a ghost's current room for all 13 species, so the general spirit-box checkbox currently cannot eliminate a type. Future reply styles and sound tools may introduce further meaningful differences **only after** actual producers and detectors exist. Behavior tells, favored actions, walls versus doors, isolated attacks, and sound reactions are complementary sources of deduction, not invisible instrument subtype passwords.

## Matching producer and ghost-player cadence

A real ghost action from a human or AI uses the same `GhostDomain.dispatch` and `LanHost.resolveGhostAction` authority. Whisper, disturbance, manifestation, strike and signature can generate authorized audiovisual effects and momentary local EMF changes; walking/drifting must not substitute for a haunting event. The human-ghost action-window system has a short menu, a repeating host deadline, and a legal actual-event fallback if a player remains idle. Those systems cannot create a supposed signal without an event. An action that is not legal because of energy, cooldown, wards or target restrictions cannot be forced through the validator.

Species-specific behavior remains essential where species intentionally share an instrument combination. Shade and Specter, for example, both have silent EMF, freezing, ritual writing, UV and camera-only forms, but differ in charge/recovery, attack restrictions, tell, and later supplementary instrumentation. Do **not** manufacture inaccurate instrument signals solely to make a unique triple.

## Strict integrity and acceptance gates

1. Keep all 13 ghosts and their assigned rite. A minimum of three distinct genuine obtainable clues must be implemented for each ghost before marking the evidence system release-ready; this is a **content production requirement**, not a player quota.
2. Keep the equipment logger and player-marked journal independent. No ghost client receives hunter casefile, notes, secret identity deductions or private player location from evidence.
3. For every candidate evidence family, trace **actual ghost/event → world prop/surface → detector/measurement → casefile reading → optional manual journal tick**. Every ghost-caused abnormal observation has an actual authorized source. No fake anomalies, decoy paranormal imprints, random ghost marks, fabricated sounds, or forged high readings.
4. The field journal must use the same `GhostEvidenceProfile` + `GhostTraits` compatibility as the ghost event generators. `GhostEvidenceMatrixTest` checks the 13 derived rows and implementation/proposal separation. The host and client ghost action cadence requires its own runnable end-to-end multiplayer checks.
5. Full Java 17 build, graphical displays, simulated multiplayer endurance and Windows release artifact are still unverified. Do not mark the full project complete on the basis of file commits.

**Source references:** `software/beckenburg/src/main/java/org/beckenburg/{GhostEvidenceMatrix,GhostEvidenceProfile,GhostFieldGuide,GhostIdentity,GhostTraits,GhostWriting,EvidenceSignals,EquipmentRegistry,GhostDomain,GhostActionCadence,LanHost}.java`. Equipment status: [equipment roadmap](EQUIPMENT_EVIDENCE_ROADMAP.md); hand-marked journal: [manual evidence journal](MANUAL_EVIDENCE_JOURNAL.md).
