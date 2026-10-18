# Beckenburg — Ghost roster and evidence-loop acceptance catalog

**Corrected 2026-10-18:** Earlier versions of this catalog wrongly presented the obsolete `FIELD_SURGE/TETHER/KINETIC/INTERFERENCE`, four named cold anomalies and four named voice categories as real player evidence. **That design is rejected.** They are old code metadata, not intended identity signals, and the active journal no longer shows them as evidence. Do not implement them under a new name. The authoritative equipment/evidence design is [Equipment and Evidence Roadmap](EQUIPMENT_EVIDENCE_ROADMAP.md), with the complete [source-backed thirteen-ghost matrix](GHOST_EVIDENCE_MATRIX.md).

## Intended common loop

Locate disturbances; determine an actual haunted area through multiple environmental measurements; observe genuine server-authored events; take whatever instrument readings are useful and let each measurement enter the journal automatically; the available evidence pool offers at least three distinct possible observations per ghost, but no mandatory confirmation sequence exists; compare physical behaviors and recordings; submit a deduction; prepare the haunting anchor; carry out the ghost's correct **banishment, cleansing or absolution** at the map's authored site; defend the ritual against interference, or withdraw.

**EMF** yields ordinary fluctuating **2–7** during weaker hauntings for all ghosts, **8–10** for powerful high-field events or **0** for a real suppressive event. **Temperature** uses shared weather/season/day/night, room insulation and real ghost activity: all ghosts produce varying ordinary room measurements, while only selected ghosts can create freezing below 0°C or heat of at least 90°F. Fahrenheit/Celsius presentation is a user choice, not different mechanics. Ordinary weather-driven extremes are not ghost evidence. Other positives must include functional UV, writing, orbs/video, structured light, recordings and original Beckenburg sampling/sensor systems.

**Present transition state:** `EvidenceSignals` implements the numeric environmental model. The host-side `LanCase.scanMeasured` and live `LanHost` measurement pathway use it, and now return raw readings rather than confirmed/inconclusive labels; event strength comes from authorized ghost actions. Solo also uses the numeric environmental signal model; the LAN and solo equipment selectors currently expose only the legacy three principal instruments, **but using all three is no longer a gate**. The full physical 14-family acquisition, remaining equipment/UI, finished video and per-player °C/°F settings are **not complete**; ghost-specific intended assignments are now cataloged in [the matrix](GHOST_EVIDENCE_MATRIX.md). The game must not be advertised as possessing them until end-to-end verification. The room-only `LanCase.scan` compatibility entry point also returns ordinary readings, not fabricated species subtypes.

## 13 ghost identities: actual mechanical behavior and resolution

| Ghost | Required rite | Behavior tag | Movement | Ghost tell | Evidence assignment |
| --- | --- | --- | --- | --- | --- |
| **POSSESSIVE** | absolution | object_claim | walk / doors | Small keepsakes shift toward a single object | [Matrix cataloged; tools pending](GHOST_EVIDENCE_MATRIX.md) |
| **POLTERGEIST** | banishment | object_storm | walk / doors | Several unsecured objects rattle in sequence | [Matrix cataloged; tools pending](GHOST_EVIDENCE_MATRIX.md) |
| **DEMON** | banishment | aggression | walk / doors | An aggressive impact shakes the nearest threshold | [Matrix cataloged; tools pending](GHOST_EVIDENCE_MATRIX.md) |
| **YOKAI** | absolution | sound_reaction | float / doors | A familiar voice repeats from the wrong room | [Matrix cataloged; tools pending](GHOST_EVIDENCE_MATRIX.md) |
| **BANSHEE** | absolution | wail | float / doors | A rising wail fills the corridor | [Matrix cataloged; tools pending](GHOST_EVIDENCE_MATRIX.md) |
| **WRAITH** | banishment | phase_travel | float / walls | Footfall echoes shift to the far side of a wall | [Matrix cataloged; tools pending](GHOST_EVIDENCE_MATRIX.md) |
| **SHADE** | cleansing | lurk | float / walls | An outline holds still in the darkest corner | [Matrix cataloged; tools pending](GHOST_EVIDENCE_MATRIX.md) |
| **SPECTER** | cleansing | apparition | float / walls | An apparition lingers after the movement ends | [Matrix cataloged; tools pending](GHOST_EVIDENCE_MATRIX.md) |
| **SPIRIT** | absolution | restless | walk / doors | A faint voice carries through the old rooms | [Matrix cataloged; tools pending](GHOST_EVIDENCE_MATRIX.md) |
| **HANTU** | cleansing | cold_feed | float / doors | A sudden cold draft brushes past the investigators | [Matrix cataloged; tools pending](GHOST_EVIDENCE_MATRIX.md) |
| **DEVIL** | banishment | bargain | walk / doors | A soft voice offers an unsettling promise | [Matrix cataloged; tools pending](GHOST_EVIDENCE_MATRIX.md) |
| **MIMIC** | cleansing | imitation | walk / doors | The last call repeats with a slight delay | [Matrix cataloged; tools pending](GHOST_EVIDENCE_MATRIX.md) |
| **TWINS** | absolution | paired_echo | float / doors | Two knocks answer from neighboring rooms | [Matrix cataloged; tools pending](GHOST_EVIDENCE_MATRIX.md) |

## Supplementary observations tied to implemented source traits

- **POSSESSIVE:** Moves objects near its attachment; waits for isolation. Visibility: visible; energy recharge: isolation; requires one target in room for strike/signature; UV traces: yes..
- **POLTERGEIST:** Violent object storms and ordinary door passage. Visibility: visible; energy recharge: presence; may strike with multiple occupants; UV traces: yes..
- **DEMON:** Hard strikes; relatively little fear for the harm. Visibility: visible; energy recharge: ambient; may strike with multiple occupants; UV traces: no..
- **YOKAI:** Floating voice-chaser that still opens doors. Visibility: orbs; energy recharge: presence; may strike with multiple occupants; UV traces: no..
- **BANSHEE:** Wails and picks out isolated investigators. Visibility: visible; energy recharge: isolation; requires one target in room for strike/signature; UV traces: no..
- **WRAITH:** Floats directly through walls without opening doors. Visibility: visible; energy recharge: isolation; may strike with multiple occupants; UV traces: yes..
- **SHADE:** Camera apparition when no investigator is watching. Visibility: camera_only; energy recharge: isolation; requires one target in room for strike/signature; UV traces: yes..
- **SPECTER:** Camera-only figure and spectral wall traces. Visibility: camera_only; energy recharge: ambient; may strike with multiple occupants; UV traces: yes..
- **SPIRIT:** Footsteps, opened doors, and ordinary traces. Visibility: visible; energy recharge: ambient; may strike with multiple occupants; UV traces: yes..
- **HANTU:** Cold orbs moving through open doorways. Visibility: orbs; energy recharge: isolation; may strike with multiple occupants; UV traces: no..
- **DEVIL:** Feeds on a lone investigator's sanity. Visibility: visible; energy recharge: presence; requires one target in room for strike/signature; UV traces: yes..
- **MIMIC:** Repeats voices and gains strength from nearby listeners. Visibility: visible; energy recharge: presence; may strike with multiple occupants; UV traces: yes..
- **TWINS:** Twin orbs and paired knocks, never wall-phases. Visibility: orbs; energy recharge: ambient; may strike with multiple occupants; UV traces: no..

## Existing ritual installations (house)

| Rite | Host installation | Room | Duration | Host terminal outcome |
| --- | --- | ---: | ---: | --- |
| Banishment | Sealed Iron Circle, cellar | 9 | 55 ticks / 5.5 s | BANISHED |
| Cleansing | Purification Font, library | 6 | 45 ticks / 4.5 s | CLEANSED |
| Absolution | Memorial Lectern, foyer | 10 | 60 ticks / 6.0 s | ABSOLVED |

The host retains correct-species deduction, anchor ward, correct ritual, site proximity and ritual defense checks. Those safeguards must survive the evidence migration. Other maps require real authored, reachable ritual stations; a map selection entry is not a validated site.

## Completion criteria (per ghost; all 13)

1. At least three **different observable evidence opportunities** designed for each ghost, each with a world-authored source and usable instrument; no requirement for the investigator to collect or 'confirm' all three.
2. Never manufacture paranormal evidence: weather, ordinary electronics, normal movement, human-caused heat, camera limitations, player voices and non-ghost events are ordinary observations and cannot create a ghost-authored signature. Every spectral finding must trace to an actual ghost action, physical effect and corresponding instrument reading.
3. Enough clues and behavioral differentiators to identify the species without hidden data leaks; a third proof should matter and no universal two-instrument species shortcut should exist.
4. Complete solo + 1–6 hunter LAN + human-ghost observation path. The same event can produce multiple readings; each is logged without granting automatic proof or deducing the species.
5. All three ritual types reachable and completion defended; hostile ghost control must use identical authorized world event rules as AI; reconnect preserves installed sensors and private case history.
6. Java 17 headless/GUI, Windows and multiplayer acceptance logged in existing quality gates, not inferred from a successful text commit. No additional GitHub Actions.

**Source pointers:** `GhostIdentity.java`, `GhostTraits.java`, `GhostBehavior.java`, `GhostDomain.java`, `EvidenceSignals.java`, `EquipmentRegistry.java`, `LanCase.java`, `RitualSites.java`; project quality gates at `docs/beckenburg/QUALITY_GATES.md`.
