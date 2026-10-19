# Beckenburg — thirteen-ghost evidence matrix (authoritative design)

**Status (2026-10-18):** the complete proposed ghost/equipment evidence matrix, aligned with the currently implemented ghost identity, environmental, writing and physical-trait generators. Each row is also exposed by `GhostEvidenceMatrix.java`, which reads `GhostEvidenceProfile.java`, `GhostTraits.java`, and `GhostIdentity.java` instead of copying those source rules into a second table. New devices and tests below are **not** automatically available to players. Existing source code for current instruments/ghost actions must be validated in an actual Java runtime before a release can be called complete.

## The revised matrix

**Ordinary readings exist for everybody.** Every ghost can produce **EMF 2–7** during ordinary hauntings, and every thermometer samples changing room air. Only some ghosts have additional **EMF 8–10, ghost-authored suppression to 0, freezing below 0°C, or paranormal heat at or above 90°F** as distinctive phenomena. “Normal only” means no species-authored temperature extreme, not a static temperature.

| Ghost | EMF (ordinary 2–7 for all) | Temperature | Ghost writing | UV | Visual | Optional instruments: two distinct readings¹ | Rite |
|---|---|---|---|---|---|---|---|
| Possessive | High 8–10 | **Normal only** | Child; ritual | Yes | Figure | Imprint scanner: possessed-object contact strength; ectoplasm sampler: residue mass | Absolution |
| Poltergeist | High 8–10 | **Extreme heat** | Frantic | Yes | Figure | Seismic: clustered impacts and mm/s; imprint: fresh contact pattern | Banishment |
| Demon | High 8–10 | **Extreme heat** | Frantic; ritual | No | Figure | Resonance: low Hz/dB harmonics; barometer: strike-related hPa drop | Banishment |
| Yokai | High 8–10 | **Normal only** | None | No | Orbs | Resonance: voice-reply harmonics/delay; seismic: door knock impulses | Absolution |
| Banshee | High 8–10 | **Freezing** | None | No | Figure | Ectoplasm: deposited mist mass; resonance: wail pitch/duration | Absolution |
| Wraith | High 8–10 | **Normal only** | Frantic; ritual | Yes | Figure | Light grid: genuine wall-pass occlusions; barometer: wall pressure differential | Banishment |
| Shade | **0 suppression** | **Freezing** | Ritual | Yes | Camera-only | Spectral prism: actual camera silhouette; barometer: stagnant air pressure | Cleansing |
| Specter | **0 suppression** | **Normal only** | Ritual | Yes | Camera-only | Spectral prism: lingering afterimage; resonance: spectral hum/fade | Cleansing |
| Spirit | High 8–10 | **Freezing** | Child | Yes | Figure | Imprint: door-handle contact; seismic: footsteps and mm/s | Absolution |
| Hantu | **0 suppression** | **Freezing** | None | No | Orbs | Barometer: cold air-front pressure; ectoplasm: real deposited material | Cleansing |
| Devil | High 8–10 | **Extreme heat** | Frantic; ritual | Yes | Figure | Resonance: actual whisper harmonics; imprint: touched bargaining item | Banishment |
| Mimic | High 8–10 | **Extreme heat** | Child; frantic | Yes | Figure | Imprint: repeated object mark; resonance: recorded voice correlation | Cleansing |
| Twins | High 8–10 | **Normal only** | None | No | Orbs | Seismic: paired impact timing; resonance: paired audible bands | Absolution |

¹ Additional devices and readout variants are **proposed functionality** from `OptionalEvidenceReadings.java`, not yet implemented as physical sensors. Each has a real-world event producer and a defined observable output target, rather than an instant ghost identifier. Full display formats, required physical triggers and all three upgrade stages per device are in the [three-tier equipment matrix](EQUIPMENT_TIER_MATRIX.md) and `OptionalEvidenceReadings.java`.

D.O.T.S. is **partially implemented in LAN source**: the owner-supplied `vape_mp_1` acts as the Tier I emitter, physical placement projects a real grid, and only genuine host-authorized MANIFEST/SIGNATURE events inside its range can produce a recorded ghost passage. Candidate species remain Yokai, Wraith, Shade, Specter, Hantu and Twins. Full Java compilation, playtesting, model visuals and camera acceptance are still pending. The existing confirmed source traits for salt, UV and optical forms are unchanged, and our original three rites remain species-specific.

## Core rules governing the table

**All instruments measure; the journal does not validate.** A numerical reading or an observed mark enters the automatic measurement log. A hunter separately clicks evidence checkboxes by choice; these mark subjective conclusions and grey incompatible ghosts in the full roster. Unticking restores them, and even contradictory notes remain editable. No automatic marking or a required number of readings for identification/ritual completion.

**EMF:** every ghost produces genuinely fluctuating ordinary readings **2–7**. A strong local ghost action may instead read **8–10** for high-field species. Suppression-capable ghosts can briefly collapse the field to **0**, but their weaker hauntings still produce ordinary **2–7** values. A 0 reading is immediately logged and may be ticked at the player's discretion; there is no repeated-observation or confirmation gate. Low ordinary activity is not automatically a suppression event. The current three suppression profiles are Shade, Specter and Hantu.

**Temperature:** the whole environment has weather/season/time, heating and room temperature variation. **All 13 ghosts**, including the five neutral species, produce normal changing air measurements. Four types can cause ghost-induced freezing (below 0°C) and four can cause paranormal extreme heat (at least 90°F, approximately 32.2°C); the other five produce no distinctive ghost-driven thermal extreme. A cold/hot ghost's room starts modestly cooler/warmer and can develop the extreme as real activity strengthens. Natural climate conditions are still displayed as actual ambient measurements, **but no unrelated environment source is allowed to invent ghost-specific activity or markings**. Celsius/Fahrenheit is display preference, not an identity code.

**Writing:** a ghost must actually interact with an existing placed book. Markings are child drawings, frantic scrawls, or ritual circles drawn in its permitted style set. The same style can occur for multiple ghosts. Some ghosts never write; absence of writing in an otherwise blank book is merely what the player observed, not a game-issued negative proof. The current ghost-writing event path is partial until page graphics and the open-book mesh are rendered in the world.

**UV/visual:** UV clues only come from genuine ghost traversal or relevant interactions. Sight and orbs are taken from the existing ghost traits; camera-only forms must not become ordinary naked-eye figures. A physical ghost movement or manifestation must drive projectors and camera footage rather than drawing a fake clue on the HUD.

**Voice/behavior:** the existing spirit-box code can respond in a ghost's current room for all 13 species, so the general spirit-box checkbox currently cannot eliminate a type. Future reply styles and sound tools may introduce further meaningful differences **only after** actual producers and detectors exist. Behavior tells, favored actions, walls versus doors, isolated attacks, and sound reactions are complementary sources of deduction, not invisible instrument subtype passwords.

## Matching producer and ghost-player cadence

A real ghost action from a human or AI uses the same `GhostDomain.dispatch` and `LanHost.resolveGhostAction` authority. Whisper, disturbance, manifestation, strike and signature can generate authorized audiovisual effects and momentary local EMF changes; walking/drifting must not substitute for a haunting event. The human-ghost action-window system has a short menu, a repeating host deadline, and a legal actual-event fallback if a player remains idle. Those systems cannot create a supposed signal without an event. An action that is not legal because of energy, cooldown, wards or target restrictions cannot be forced through the validator.

Species-specific behavior remains essential where species intentionally share instrument observations. Shade and Specter, for example, both suppress EMF, can leave ritual writing and UV traces, and have camera-only forms; **Shade can freeze its room, while Specter has neutral temperature variations**. Their recovery conditions, tells and supplementary instruments also differ. Neither is identified automatically by any measurement. Do **not** manufacture inaccurate instrument signals solely to make a unique triple.

## Strict integrity and acceptance gates

1. Keep all 13 ghosts and their assigned rite. A minimum of three distinct genuine obtainable clues must be implemented for each ghost before marking the evidence system release-ready; this is a **content production requirement**, not a player quota.
2. Keep the equipment logger and player-marked journal independent. No ghost client receives hunter casefile, notes, secret identity deductions or private player location from evidence.
3. For every candidate evidence family, trace **actual ghost/event → world prop/surface → detector/measurement → casefile reading → optional manual journal tick**. Every ghost-caused abnormal observation has an actual authorized source. No fake anomalies, decoy paranormal imprints, random ghost marks, fabricated sounds, or forged high readings.
4. The field journal must use the same `GhostEvidenceProfile` + `GhostTraits` compatibility as the ghost event generators. `GhostEvidenceMatrixTest` checks the 13 derived rows and implementation/proposal separation. The host and client ghost action cadence requires its own runnable end-to-end multiplayer checks.
5. Full Java 17 build, graphical displays, simulated multiplayer endurance and Windows release artifact are still unverified. Do not mark the full project complete on the basis of file commits.

**Source references:** `software/beckenburg/src/main/java/org/beckenburg/{GhostEvidenceMatrix,GhostEvidenceProfile,GhostFieldGuide,GhostIdentity,GhostTraits,GhostWriting,EvidenceSignals,EquipmentRegistry,GhostDomain,GhostActionCadence,LanHost}.java`. Equipment status: [equipment roadmap](EQUIPMENT_EVIDENCE_ROADMAP.md); hand-marked journal: [manual evidence journal](MANUAL_EVIDENCE_JOURNAL.md).
