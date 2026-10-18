# Beckenburg — Complete equipment baseline and expanded paranormal investigation program

**Scope:** authoritative equipment comparison and implementation roadmap. Reference: [Phasmophobia Equipment](https://phasmophobia.fandom.com/wiki/Equipment) and [Evidence](https://phasmophobia.fandom.com/wiki/Evidence), examined 2026-10-18. We are matching the breadth of useful *functions*, not copying third-party text, art, proprietary game code, or claiming to ship them already. Original instruments and original ghost behavior/ritual resolution are a substantial part of Beckenburg's identity.

**Source of truth:** `software/beckenburg/src/main/java/org/beckenburg/EquipmentRegistry.java` (42 catalog records), `EvidenceSignals.java` (numeric climate / EMF model), `LanCase` (host-side measured scan path), and the existing live equipment code. Every `PARTIAL_SOURCE` label means a source fragment exists; **it is not finished, end-to-end validated, user selectable, or necessarily available in both modes**. `ABSENT` means the listed functional tool is still to be implemented. New classes/tests have been committed but the full application build and Windows multiplayer runtime remain to be verified.

## Corrections to the evidence definition

**EMF is a numeric local signal from 1 to 10, not an identity-specific subtype.** Readings fluctuate with actual events, strength, location and background variation. **Only a reading above 6** during a host-authorized local ghost event counts as high EMF evidence; ordinary EMF spikes and unrelated disturbances may register smaller numbers. Repeated reads in one observation window cannot generate additional ghost actions or reroll a desirable result.

**Temperature is a world/environment variable, not a four-label ghost code.** Season, weather, time of day, building insulation/heating, room-specific offsets, and paranormal heating/cooling influence measured room and outdoor temperatures. **Below 0°C / 32°F** qualifies as a cold extreme *when the anomaly is paranormal*; **90°F or higher (32.22°C)** qualifies as a hot extreme *when paranormal*. Outdoor freezing in winter or ordinary hot weather must not be sufficient to confirm ghost evidence. Dynamic readings should remain consistent across players and stable in the same measurement window. Fahrenheit or Celsius is a player display preference; the host stores and evaluates canonical temperatures in Celsius. Current LAN source reports both units; per-player selection/setting is still needed.

**Three positive evidence states minimum per ghost** remains the design rule. It must eventually mean three genuinely obtainable, varied evidence *families* from a broader pool, rather than all ghosts producing the same three tools. Behaviors, counter-tests, photos, recordings and auxiliary instruments must contribute useful deductive context; not every equipment interaction is automatically a qualifying positive. No ghost gets a promised evidence family until its producer, detector, journal, difficulty variations, host validation and acquisition tests actually exist.

## Evidence families

| Family | Qualifying observation | Instruments | Gate |
| --- | --- | --- | --- |
| High EMF | Local ghost-event strength produces EMF 7–10 | EMF reader, synchronized array | numeric LAN source slice |
| Freezing | Paranormal sub-zero room reading below 0°C | thermometer, thermal beacons | numeric LAN source slice |
| Extreme heat | Paranormal temperature at least 90°F | thermometer, thermal beacons | numeric LAN source slice |
| Direct spirit reply | Valid reply to actual question/interaction near ghost | spirit box, recording system | legacy partial; question handling needed |
| UV traces | Trace remains on interacted surface/footprint | UV light, photography | supplemental trace code only |
| Ghost writing | Ghost chooses/marks book and leaves inspectable writing | writing book, video camera | missing |
| Spirit orbs | Ghost-authored drifting orbs visible under correct optical conditions | camera, head gear, van video | visibility category only; feed missing |
| Structured-light silhouette | Real spectral motion distorts projector/laser volume | pattern projector, laser grid | missing |
| Ectoplasm | Ghost-authored sample with decay/contamination rules | swab, microscope/assay | original; missing |
| Resonance | Repeatable supernatural frequency response to a controlled stimulus | tuning forks, spectrum analyzer | original; missing |
| Seismic disturbance | Multi-sensor floor/structure response incompatible with ordinary traffic | seismic recorder | original; missing |
| Atmospheric inversion | Local pressure/airflow anomaly beyond HVAC and weather | barometric probe | original; missing |
| Spectral shadow | Authored apparition/optical displacement verified in camera system | prism, video camera | original; missing |
| Object imprint | Residual supernatural marking on an object after an actual interaction | object imprint scanner | original; missing |

**Restrictions:** Temperature variants can constitute distinct potential evidence categories but cannot both count as separate proof from the same room's one environmental anomaly unless explicit species rules and independent event validation justify it. Photos and audio recordings have separate media rewards; they should not automatically satisfy multiple evidence categories for one event. Movement and sanity changes are supporting deductions unless explicitly designed as obtainable positives.

## Complete reference equipment and original tools

### Eight starter-equivalent items

| ID | Device | Role | Solo / LAN source | Candidate signal(s) |
| --- | --- | --- | --- | --- |
| `DOTS_PROJECTOR` | Pattern projector | evidence | not yet / not yet | STRUCTURED_LIGHT |
| `EMF_READER` | EMF reader (1–10) | evidence | partial / partial | HIGH_EMF |
| `FLASHLIGHT` | Flashlight | survey | partial / partial | — |
| `GHOST_WRITING_BOOK` | Ghost writing book | evidence | not yet / not yet | GHOST_WRITING |
| `SPIRIT_BOX` | Spirit box | evidence | partial / partial | SPIRIT_REPLY |
| `THERMOMETER` | Thermometer (°C/°F) | evidence | partial / partial | FREEZING, EXTREME_HEAT |
| `UV_LIGHT` | UV light | evidence | partial / partial | UV_MARKS |
| `VIDEO_CAMERA` | Video camera / remote feed | evidence | not yet / not yet | SPIRIT_ORBS, SPECTRAL_SHADOW |

### Thirteen optional-equivalent items

| ID | Device | Role | Solo / LAN source | Candidate signal(s) |
| --- | --- | --- | --- | --- |
| `CRUCIFIX` | Protective cross | counter | partial / partial | — |
| `FIRELIGHT` | Firelight / candle | survey | not yet / not yet | — |
| `HEAD_GEAR` | Head camera / helmet light | survey | not yet / not yet | SPIRIT_ORBS |
| `IGNITER` | Igniter | survey | not yet / not yet | — |
| `INCENSE` | Incense / smoke dispersal | counter | not yet / not yet | — |
| `MOTION_SENSOR` | Motion sensor | survey | not yet / not yet | — |
| `PARABOLIC_MICROPHONE` | Parabolic microphone | survey | not yet / not yet | — |
| `PHOTO_CAMERA` | Photo camera | survey | partial / not yet | SPECTRAL_SHADOW |
| `SALT` | Salt | survey | partial / partial | UV_MARKS |
| `SANITY_MEDICATION` | Sanity treatment | consumable | partial / partial | — |
| `SOUND_RECORDER` | Sound recorder | survey | not yet / not yet | SPIRIT_REPLY |
| `SOUND_SENSOR` | Sound sensor | survey | not yet / not yet | — |
| `TRIPOD` | Tripod / camera mount | survey | not yet / not yet | — |

### Seven fixed truck/van systems

| ID | Device | Role | Solo / LAN source | Candidate signal(s) |
| --- | --- | --- | --- | --- |
| `CLIPBOARDS` | Task clipboards | monitor | not yet / not yet | — |
| `COMPUTER` | Camera console | monitor | not yet / not yet | SPIRIT_ORBS |
| `OBJECTIVE_BOARD` | Objective board | monitor | partial / partial | — |
| `SANITY_MONITOR` | Sanity monitor | monitor | not yet / partial | — |
| `SITE_ACTIVITY_MONITOR` | Site activity monitor | monitor | not yet / partial | — |
| `SITE_MAP` | Location map | monitor | partial / partial | — |
| `SOUND_MONITOR` | Sound monitor | monitor | not yet / not yet | — |

### Fourteen Beckenburg-original items

| ID | Device | Role | Solo / LAN source | Candidate signal(s) |
| --- | --- | --- | --- | --- |
| `ANCHOR_TRIANGULATOR` | Anchor triangulator | survey | not yet / not yet | — |
| `ECTOPLASM_SAMPLER` | Ectoplasm swab and assay | evidence | not yet / not yet | ECTOPLASM |
| `RESONANCE_TUNER` | Resonance tuning forks | evidence | not yet / not yet | RESONANCE |
| `BAROMETRIC_PROBE` | Barometric anomaly probe | evidence | not yet / not yet | ATMOSPHERIC_REVERSAL |
| `SEISMIC_RECORDER` | Seismic floor recorder | evidence | not yet / not yet | SEISMIC_IMPACT |
| `SPECTRAL_PRISM` | Spectral prism filter | evidence | not yet / not yet | SPECTRAL_SHADOW |
| `LASER_GRID` | Lidar displacement grid | evidence | not yet / not yet | STRUCTURED_LIGHT |
| `EMF_ARRAY` | Deployable EMF array | survey | not yet / not yet | HIGH_EMF |
| `THERMAL_BEACON` | Remote thermal probe array | survey | not yet / not yet | FREEZING, EXTREME_HEAT |
| `RITUAL_ANCHOR_METER` | Ritual anchor meter | ritual | not yet / not yet | — |
| `WARD_STABILITY_PROBE` | Ward stability probe | ritual | not yet / not yet | — |
| `OBJECT_IMPRINT_SCANNER` | Anomalous object imprint kit | evidence | not yet / not yet | OBJECT_IMPRINT |
| `CHALK_SIGIL_KIT` | Chalk and portable sigils | ritual | not yet / not yet | — |
| `SPECTRAL_FREQUENCY_ANALYZER` | Spectral frequency analyzer | survey | not yet / not yet | RESONANCE |

## Original equipment design contracts

- **Anchor triangulator:** Combine spatial evidence bearing measurements; uncertainty radius contracts with multiple placements, never an instant exact location reveal.
- **Ectoplasm swab and assay:** Recover fresh residue from eligible surfaces; sample integrity, contamination, lab readout and limited cartridges.
- **Resonance tuning forks:** Strike tuned forks and measure frequency-dependent paranormal responses, exposing the player to sound attraction.
- **Barometric anomaly probe:** Detect sustained indoor pressure reversals against exterior weather and room HVAC baselines.
- **Seismic floor recorder:** Mount on floors to register impacts and genuine traversal; distinguishes walkers and poltergeist object strikes.
- **Spectral prism filter:** Use polarized camera optics to resolve ghost silhouettes/shadow displacements that normal light cannot show.
- **Lidar displacement grid:** Structured beam volume; interruptions follow real ghost geometry and line-of-sight rather than random HUD popups.
- **Deployable EMF array:** Place three synchronized nodes to triangulate actual EMF events; every node receives delayed/noisy samples.
- **Remote thermal probe array:** Deploy remote temperature loggers; season, room insulation, heating and anomaly movement affect all readings.
- **Ritual anchor meter:** Find a ward's affinity with the verified haunting anchor; does not bypass the identity/evidence gate.
- **Ward stability probe:** Measure the defended rite's remaining stability and ghost interference in real time.
- **Anomalous object imprint kit:** Scan claimed objects for residual imprint after genuine interactions; false positives from human use are possible.
- **Chalk and portable sigils:** Lay portable defensive lines with materials/time cost; never a free substitute for a map's ritual installation.
- **Spectral frequency analyzer:** Analyze live EVP/resonance spectral features in the van; require a real recorded source and avoid directly revealing species.

## Ghost resolution and multiplayer safeguards

The case retains all 13 established ghost identities and their three ritual categories. Existing behavioral traits and required rites remain distinct from evidence types. The authored true evidence matrix must be created only after each chosen evidence producer exists; do not resurrect `FIELD_SURGE/TETHER/KINETIC/INTERFERENCE` or `ANCHOR_CHILL/COLD_SPOT/SHEAR/WALL_DRAFT` as required ghost evidence. Those old enums are internal compatibility metadata, not intended instrument outcomes.

All equipment effects and evidence confirmations originate on the server: spatial measurements use host-owned positions and line-of-sight; placeable sensors have host-owned placement, physics, lifetime, batteries, clocks and event association; hunters share journal records with origin/tick/room; a ghost client must not see casefile/secret species-inference or hunter location; AI/human ghost produce the same event signals. Reconnect must replay the *state* of sensors and their bounded historical readings without manufacturing new confirmations.

## Implementation gates and ownership

1. **Slice E-01 — sourced/partial:** register all 42 candidate tools and status; add `EvidenceSignals` for 1–10 EMF, true events and seasonal hot/cold thermals; connect live LAN scanner to it; retire fake identity-coded field-guide clues. Source/test entries committed. Fresh Java runtime acceptance not yet established.
2. **E-02 — next:** unify solo/LAN environmental simulation, hosted weather/heating switches, both temperature units as saved per-player settings; durable event intensity/falloff; fix remaining legacy helper methods and tests, prove event evidence does not appear from mere anchor proximity.
3. **E-03:** build 7 reference evidence families *end to end* (writing, D.O.T.S.-equivalent, UV, cameras/orbs and current instruments), with matching world props, meaningful audio/visual cues and isolated host tests.
4. **E-04:** connect own evidence categories from the original kits; design a balanced 13-ghost three-evidence matrix, verify each type has three reachable positives and no trivially deterministic two-instrument species code.
5. **E-05:** shop, loadout, inventory stock, upgrades/tiers, consumables, user-readable equipment interfaces, batteries and physical interactions. Make all 8 starter, 13 optional and 7 van categories genuinely selectable/usable where relevant.
6. **E-06:** repeatable LAN 1–6 hunter + ghost-controller runs; event timelines, power cuts, weather, death/reconnect, edge cases, interference and photo/video/audio evidence, host privacy and accessibility acceptance. Record pass/fail results in the project's existing stage ledger. Do not create GitHub Actions unless explicitly directed.

**No false completion claims:** a machine-readable registry, reference document or committed test is *not* equivalent to implementation of the instrument, running the test, packaging a Windows build, or confirming the UI exists. Further releases must prove those independently.
