# Beckenburg — Ghost roster and evidence-loop acceptance catalog

**Corrected 2026-10-18:** Earlier versions of this catalog wrongly presented the obsolete `FIELD_SURGE/TETHER/KINETIC/INTERFERENCE`, four named cold anomalies and four named voice categories as real player evidence. **That design is rejected.** They are old code metadata, not intended identity signals, and the active journal no longer shows them as evidence. Do not implement them under a new name. The authoritative equipment/evidence design is [Equipment and Evidence Roadmap](EQUIPMENT_EVIDENCE_ROADMAP.md).

## Intended common loop

Locate disturbances; determine an actual haunted area through multiple environmental measurements; observe genuine server-authored events; collect **at least three distinct, mechanically obtainable positive evidence families** from a multi-device pool; compare physical behaviors and recordings; submit a deduction; prepare the haunting anchor; carry out the ghost's correct **banishment, cleansing or absolution** at the map's authored site; defend the ritual against interference, or withdraw.

**EMF** measures fluctuating event intensity from **1–10** and is positive at **7–10**, during real local paranormal activity. **Temperature** uses shared weather/season/day/night, room insulation, heat and local ghost anomalies; paranormal **below 0°C / 32°F** or **at least 90°F / 32.22°C** are candidate positives. Fahrenheit/Celsius presentation is a user choice, not different mechanics. Ordinary weather-driven extremes are not ghost evidence. Other positives must include functional UV, writing, orbs/video, structured light, recordings and original Beckenburg sampling/sensor systems.

**Present transition state:** `EvidenceSignals` implements the numeric environmental model. The host-side `LanCase.scanMeasured` and live `LanHost` measurement pathway use it; event strength comes from authorized ghost actions. Solo also uses the numeric environmental signal model; the LAN and solo equipment selectors still expose only the legacy three mandatory instrument categories. Full 14-family acquisition, ghost-specific evidence assignments, UI, physical devices, finished video and per-player °C/°F settings are **not complete**. The game must not be advertised as possessing them until end-to-end verification. An obsolete `LanCase.scan` remains for legacy fixtures; its subtype strings must not be treated as approved design.

## 13 ghost identities: actual mechanical behavior and resolution

| Ghost | Required rite | Behavior tag | Movement | Ghost tell | Evidence assignment |
| --- | --- | --- | --- | --- | --- |
| **POSSESSIVE** | absolution | object_claim | walk / doors | Small keepsakes shift toward a single object | **Pending functional evidence matrix** |
| **POLTERGEIST** | banishment | object_storm | walk / doors | Several unsecured objects rattle in sequence | **Pending functional evidence matrix** |
| **DEMON** | banishment | aggression | walk / doors | An aggressive impact shakes the nearest threshold | **Pending functional evidence matrix** |
| **YOKAI** | absolution | sound_reaction | float / doors | A familiar voice repeats from the wrong room | **Pending functional evidence matrix** |
| **BANSHEE** | absolution | wail | float / doors | A rising wail fills the corridor | **Pending functional evidence matrix** |
| **WRAITH** | banishment | phase_travel | float / walls | Footfall echoes shift to the far side of a wall | **Pending functional evidence matrix** |
| **SHADE** | cleansing | lurk | float / walls | An outline holds still in the darkest corner | **Pending functional evidence matrix** |
| **SPECTER** | cleansing | apparition | float / walls | An apparition lingers after the movement ends | **Pending functional evidence matrix** |
| **SPIRIT** | absolution | restless | walk / doors | A faint voice carries through the old rooms | **Pending functional evidence matrix** |
| **HANTU** | cleansing | cold_feed | float / doors | A sudden cold draft brushes past the investigators | **Pending functional evidence matrix** |
| **DEVIL** | banishment | bargain | walk / doors | A soft voice offers an unsettling promise | **Pending functional evidence matrix** |
| **MIMIC** | cleansing | imitation | walk / doors | The last call repeats with a slight delay | **Pending functional evidence matrix** |
| **TWINS** | absolution | paired_echo | float / doors | Two knocks answer from neighboring rooms | **Pending functional evidence matrix** |

## Supplementary observations tied to implemented source traits

- **POSSESSIVE:** Moves objects near its attachment; waits for isolation. Visibility: visible; energy recharge: isolation; requires one target in room for strike/signature; UV traces: yes. This describes source behavior, **not proof of complete audiovisual realization**.
- **POLTERGEIST:** Violent object storms and ordinary door passage. Visibility: visible; energy recharge: presence; may strike with multiple occupants; UV traces: yes. This describes source behavior, **not proof of complete audiovisual realization**.
- **DEMON:** Hard strikes; relatively little fear for the harm. Visibility: visible; energy recharge: ambient; may strike with multiple occupants; UV traces: no. This describes source behavior, **not proof of complete audiovisual realization**.
- **YOKAI:** Floating voice-chaser that still opens doors. Visibility: orbs; energy recharge: presence; may strike with multiple occupants; UV traces: no. This describes source behavior, **not proof of complete audiovisual realization**.
- **BANSHEE:** Wails and picks out isolated investigators. Visibility: visible; energy recharge: isolation; requires one target in room for strike/signature; UV traces: no. This describes source behavior, **not proof of complete audiovisual realization**.
- **WRAITH:** Floats directly through walls without opening doors. Visibility: visible; energy recharge: isolation; may strike with multiple occupants; UV traces: yes. This describes source behavior, **not proof of complete audiovisual realization**.
- **SHADE:** Camera apparition when no investigator is watching. Visibility: camera_only; energy recharge: isolation; requires one target in room for strike/signature; UV traces: yes. This describes source behavior, **not proof of complete audiovisual realization**.
- **SPECTER:** Camera-only figure and spectral wall traces. Visibility: camera_only; energy recharge: ambient; may strike with multiple occupants; UV traces: yes. This describes source behavior, **not proof of complete audiovisual realization**.
- **SPIRIT:** Footsteps, opened doors, and ordinary traces. Visibility: visible; energy recharge: ambient; may strike with multiple occupants; UV traces: yes. This describes source behavior, **not proof of complete audiovisual realization**.
- **HANTU:** Cold orbs moving through open doorways. Visibility: orbs; energy recharge: isolation; may strike with multiple occupants; UV traces: no. This describes source behavior, **not proof of complete audiovisual realization**.
- **DEVIL:** Feeds on a lone investigator's sanity. Visibility: visible; energy recharge: presence; requires one target in room for strike/signature; UV traces: yes. This describes source behavior, **not proof of complete audiovisual realization**.
- **MIMIC:** Repeats voices and gains strength from nearby listeners. Visibility: visible; energy recharge: presence; may strike with multiple occupants; UV traces: yes. This describes source behavior, **not proof of complete audiovisual realization**.
- **TWINS:** Twin orbs and paired knocks, never wall-phases. Visibility: orbs; energy recharge: ambient; may strike with multiple occupants; UV traces: no. This describes source behavior, **not proof of complete audiovisual realization**.

## Existing ritual installations (house)

| Rite | Host installation | Room | Duration | Host terminal outcome |
| --- | --- | ---: | ---: | --- |
| Banishment | Sealed Iron Circle, cellar | 9 | 55 ticks / 5.5 s | BANISHED |
| Cleansing | Purification Font, library | 6 | 45 ticks / 4.5 s | CLEANSED |
| Absolution | Memorial Lectern, foyer | 10 | 60 ticks / 6.0 s | ABSOLVED |

The host retains correct-species deduction, anchor ward, correct ritual, site proximity and ritual defense checks. Those safeguards must survive the evidence migration. Other maps require real authored, reachable ritual stations; a map selection entry is not a validated site.

## Completion criteria (per ghost; all 13)

1. At least three **different authentic positive types** assigned from the expanded evidence families, each with a host-authored producer, equipment detector, world interaction, timeout/decay and reproducible timing test.
2. Signal reliability verified through false positives: weather, ordinary electronics, normal movement, human-caused heat, camera limitations, player voices and non-ghost events must not silently satisfy a ghost proof.
3. Enough clues and behavioral differentiators to identify the species without hidden data leaks; a third proof should matter and no universal two-instrument species shortcut should exist.
4. Complete solo + 1–6 hunter LAN + human-ghost acquisition path. The same true event may create multiple instrument reactions, but it must not turn into automatically confirmed independent evidence by repeated polling.
5. All three ritual types reachable and completion defended; hostile ghost control must use identical authorized world event rules as AI; reconnect preserves installed sensors and private case history.
6. Java 17 headless/GUI, Windows and multiplayer acceptance logged in existing quality gates, not inferred from a successful text commit. No additional GitHub Actions.

**Source pointers:** `GhostIdentity.java`, `GhostTraits.java`, `GhostBehavior.java`, `GhostDomain.java`, `EvidenceSignals.java`, `EquipmentRegistry.java`, `LanCase.java`, `RitualSites.java`; project quality gates at `docs/beckenburg/QUALITY_GATES.md`.
