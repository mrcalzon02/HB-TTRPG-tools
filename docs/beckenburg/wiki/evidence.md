# Evidence — Measurements, Journal and Ghost Compatibility

[Wiki home](README.md) · [Ghost roster](ghosts.md) · [Equipment](equipment.md)

## The distinction that matters

**An instrument records a measurement. A hunter decides whether that measurement is meaningful.** The raw CASEFILE records readings, device, room and time—even a zero value or a non-response. The separate evidence journal has manual **seen / unsure / unmarked** selections. Ticking a candidate clue dims or strikes incompatible ghosts from the thirteen-name list, without changing the real secret identity. Clearing the tick restores possibilities. Contradictory selections may leave no ghost highlighted. A ghost guess is separate from a journal mark.

**No invented paranormal false positives:** a game-authored ghost evidence event must have a real supernatural cause, not a random dice-roll counterfeit. Normal weather, power systems and human activity still produce *ordinary measurements*, which players can compare against baselines; they do not silently become a qualifying ghost event. A Mimic can perform real, imitative paranormal actions subject to its rules, but instruments must not fabricate ghosts that never acted. This principle supersedes older speculative documents describing arbitrary contamination or fabricated evidence. **No automatic proof or ghost identification** is delivered by a device.

**Thresholds:** host EMF scale is **0–10**; a genuine event at **7–10** is high EMF, while **0** may represent ghost-caused field suppression for a compatible ghost. Ambient EMF is not automatically supernatural. Paranormal temperature **below 0°C (32°F)** is freezing; paranormal temperature **at or above 90°F (about 32.22°C)** is extreme heat. Ambient day/night, season, room and heating influence temperature. Fahrenheit/Celsius client preference is planned, not a new underlying signal.

The game should offer **at least three distinctive observable evidence opportunities for every ghost**. This is a *content standard*, not a requirement to collect or verify three pieces before an identification or ritual. Physical movement, visual behavior and recordings can also guide your deduction.

## Current player-facing journal clues

EMF over 6; EMF zero/suppressed field; freezing; extreme heat; spirit reply; ghost writing and its child drawings / frantic scrawls / ritual circle styles; foot/salt tracks; floating; movement through walls or doors; UV residue; photographic shape; remote empty-room figure; orbs; and **D.O.T.S. projection (planned)**. Attack patterns, repeated targeting and nearby sanity drain are low-confidence behavioral notes, not hard exclusions. Old four-way named EMF/cold/voice pseudo-evidence enums are excluded from the live journal.

**Current source-compatibility table** below is derived from [GhostEvidenceProfile.java](../../../software/beckenburg/src/main/java/org/beckenburg/GhostEvidenceProfile.java), not the obsolete three-code signatures in GhostIdentity. This table describes permitted *types of clues*, not assurance that every associated instrument already works end-to-end.

| Ghost | EMF pattern | Temperature | Allowed writing styles |
| --- | --- | --- | --- |
| Possessive | High 7–10 | Freezing | Child drawings, ritual circles |
| Poltergeist | High 7–10 | Extreme heat | Frantic scrawls |
| Demon | High 7–10 | Extreme heat | Frantic scrawls, ritual circles |
| Yokai | High 7–10 | Extreme heat | None |
| Banshee | High 7–10 | Freezing | None |
| Wraith | High 7–10 | Freezing | Frantic scrawls, ritual circles |
| Shade | Suppressed 0 | Freezing | Ritual circles |
| Specter | Suppressed 0 | Freezing | Ritual circles |
| Spirit | High 7–10 | Freezing | Child drawings |
| Hantu | Suppressed 0 | Freezing | None |
| Devil | High 7–10 | Extreme heat | Frantic scrawls, ritual circles |
| Mimic | High 7–10 | Extreme heat | Child drawings, frantic scrawls |
| Twins | High 7–10 | Extreme heat | None |

**Source correction:** a dated journal design note describes Shade as the only zero-EMF type, but the current GhostEvidenceProfile source lists **Shade, Specter and Hantu**. The source is used here until reconciled. The code currently allows spirit-box replies for all thirteen ghosts; merely being able to register a nearby reply does not certify the final device interaction design.

## Full evidence-device program

| Family | Intended instrument | State of delivery |
| --- | --- | --- |
| High/suppressed EMF | EMF meter, array | Numeric host scan source |
| Paranormal freezing/extreme heat | Thermometer, thermal beacons | Numeric host climate source |
| Spirit response | Spirit box, recorder | Partial, richer question/reply still needed |
| UV residue | UV lamp, photography | Partial trace/scan source |
| Ghost writing | Placed writing book | Host-authored book/page source exists; registry still not a finished catalog item |
| Spirit orbs | Video camera, head camera, van feed | Planned full visualization |
| Structured-light form | Pattern/D.O.T.S. projector, laser grid | Planned detector/projection |
| Ectoplasm | Swab and assay | Planned |
| Resonance | Tuning forks and frequency analyzer | Planned |
| Seismic anomalies | Floor sensors | Planned |
| Atmospheric inversion | Barometer and air-flow sensing | Planned |
| Spectral shadow | Prism / camera | Planned |
| Object imprint | Object scanner | Planned |

Photos, audio, movements, temperature and sensor arrays should all derive from actual host-owned events and geometry. Some test hooks and guide checkboxes predate full in-world devices and must not be advertised as finished evidence capture.

For the actual filters and logs consult [GhostFieldGuide.java](../../../software/beckenburg/src/main/java/org/beckenburg/GhostFieldGuide.java), [FieldJournal.java](../../../software/beckenburg/src/main/java/org/beckenburg/FieldJournal.java), [EvidenceSignals.java](../../../software/beckenburg/src/main/java/org/beckenburg/EvidenceSignals.java), [GhostWriting.java](../../../software/beckenburg/src/main/java/org/beckenburg/GhostWriting.java), [LanCase.java](../../../software/beckenburg/src/main/java/org/beckenburg/LanCase.java), [manual journal decision](../MANUAL_EVIDENCE_JOURNAL.md) and [evidence roadmap](../EQUIPMENT_EVIDENCE_ROADMAP.md).
