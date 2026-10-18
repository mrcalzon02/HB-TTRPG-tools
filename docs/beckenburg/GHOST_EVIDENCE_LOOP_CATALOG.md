# Beckenburg — Ghost Evidence Loop and Complete 13-Species Catalog

**Authority:** current `main` game source (`GhostIdentity`, `GhostTraits`, `GhostBehavior`, `GhostDomain`, `LanCase`, `RitualSites`); cataloged 2026-10-18. **Status:** source-audited rules and design acceptance criteria, **not** a claim of fresh executable/Windows multiplayer playtesting. Maintain one canonical definition in Java; this document describes it and identifies future changes.

## Investigator loop — current authoritative rules

1. **Find the anchor.** Search for events, then sweep with the EMF meter, thermometer, and spirit box. In the current implementation, a strong result is anchored to the ghost's true haunting room. Room-only mode accepts all three at the anchor; first-person spatial mode additionally requires being within each instrument's own radius of the room center (EMF 2.6 m, thermometer 3.4 m, spirit box 2.1 m). A ghost visiting a different room can cause an inconclusive transient reading, never a substitute confirmed signature.
2. **Record positive, host-created evidence.** Exactly three tool families currently exist: EMF, thermal, spirit box. Every one of the 13 species has a distinct *subtype* in each family, as shown below. Repeats do not increment the three-family tally. The host owns scan position, result, investigator/tick record and shared hunter casefile. The ghost client must not receive private case notes.
3. **Observe behavior as corroboration.** Distinguish locomotion, wall phasing versus door traversal, salt response, UV traces, camera/orb visibility, ghost tells, energy context and target choice. The hunter journal supports manual SEEN / UNSURE / UNKNOWN observations; compatible traits affect the shortlist, while anecdotal sightings affect suspicion rather than automatically confirming the type. These notes **do not replace** any mandatory positive instrument reading.
4. **Identify the entity.** All three positive instrument families must be confirmed at the true anchor, and a hunter must submit the correct ghost species. A wrong guess raises that investigator's stress by 15 and a 30-tick cooldown prevents immediate retries. Species truth is host-owned; players cannot spoof identity or manufacture evidence via client messages.
5. **Prepare the anchor.** Place a ritual ward **at the original haunting anchor**, not at the destination rite station. A defensive or thrown ward placed elsewhere cannot satisfy the ritual-preparation gate.
6. **Complete its assigned rite.** Go to the correct fixed installation, stand within 2 m to start the channel in 3D, and hold/guard the room while the host timer runs. The three outcomes are distinct. If everyone leaves, progress pauses and the rite breaks after 20 unguarded simulation ticks (2 s); host-authorized disturbance/signature abilities can also reduce progress. Extraction remains a valid unresolved withdrawal.

## Canonical positive evidence combinations

| Ghost | EMF state | Thermal state | Spirit-box state | Required rite |
| --- | --- | --- | --- | --- |
| **POSSESSIVE** | EMF 5 — object tether resonance | Cold pocket, 3°C | Double echo through static | Absolution |
| **POLTERGEIST** | EMF 5 — clustered kinetic spikes | Thermal shear, 4°C | Broken syllables / distant reply | Banishment |
| **DEMON** | EMF 5 — patterned interference | Cold wall seam, 1°C | Voice from the wrong direction | Banishment |
| **YOKAI** | EMF 5 — pulsing field surge | Cold pocket, 3°C | Broken syllables / distant reply | Absolution |
| **BANSHEE** | EMF 5 — object tether resonance | Thermal shear, 4°C | Voice from the wrong direction | Absolution |
| **WRAITH** | EMF 5 — clustered kinetic spikes | Cold wall seam, 1°C | Clear direct response | Banishment |
| **SHADE** | EMF 5 — patterned interference | Unnatural cold, 2°C — anchor chill | Double echo through static | Cleansing |
| **SPECTER** | EMF 5 — pulsing field surge | Thermal shear, 4°C | Double echo through static | Cleansing |
| **SPIRIT** | EMF 5 — pulsing field surge | Unnatural cold, 2°C — anchor chill | Clear direct response | Absolution |
| **HANTU** | EMF 5 — object tether resonance | Cold wall seam, 1°C | Broken syllables / distant reply | Cleansing |
| **DEVIL** | EMF 5 — clustered kinetic spikes | Unnatural cold, 2°C — anchor chill | Voice from the wrong direction | Banishment |
| **MIMIC** | EMF 5 — patterned interference | Cold pocket, 3°C | Clear direct response | Cleansing |
| **TWINS** | EMF 5 — pulsing field surge | Cold wall seam, 1°C | Double echo through static | Absolution |

**Important implementation finding:** All 13 triples are unique, but all **13 EMF + thermal pairs are already unique**; 13/13 thermal + voice pairs and 11/13 EMF + voice pairs are also unique. Thus the third confirmed family is a code-enforced objective but often adds no deductive information. Every ghost always has exactly the same three mandatory instrument *families*, and `GhostIdentity.Type.signature(tool)` currently accepts any non-null instrument. The apparent variety comes from signal subtypes, not genuinely different equipment-family combinations. This is a **documented balance/design gap**, not a claim that heterogeneous evidence families exist.

## Behavioral profile and independent corroboration

| Ghost | Traversal | Visibility | Charge source | Solitary attacks only? | UV traces | Favored action |
| --- | --- | --- | --- | --- | --- | --- |
| POSSESSIVE | Walk / doors | Directly visible | Empty room | Yes | Yes | disturb |
| POLTERGEIST | Walk / doors | Directly visible | Hunter present | No | Yes | disturb |
| DEMON | Walk / doors | Directly visible | Ambient | No | No | strike |
| YOKAI | Float / doors | Orbs | Hunter present | No | No | whisper |
| BANSHEE | Float / doors | Directly visible | Empty room | Yes | No | whisper |
| WRAITH | Float / phase walls | Directly visible | Empty room | No | Yes | drift |
| SHADE | Float / phase walls | Camera only | Empty room | Yes | Yes | manifest |
| SPECTER | Float / phase walls | Camera only | Ambient | No | Yes | manifest |
| SPIRIT | Walk / doors | Directly visible | Ambient | No | Yes | whisper |
| HANTU | Float / doors | Orbs | Empty room | No | No | disturb |
| DEVIL | Walk / doors | Directly visible | Hunter present | Yes | Yes | whisper |
| MIMIC | Walk / doors | Directly visible | Hunter present | No | Yes | whisper |
| TWINS | Float / doors | Orbs | Ambient | No | No | drift |

`Empty room` is the implementation's `ISOLATION` *recharge* rule, not a synonym for hunting lone players; the separate `huntsSolitary` flag gates strike/signature actions to rooms occupied by exactly one hunter. `Hunter present` recharge means occupancy greater than zero. Salt affects **walkers**, not floaters. Camera-only and orb ghosts have host-side visibility categories, but a complete remote CCTV/surveillance view is not yet playable.

## Individual field casefiles

### POSSESSIVE
**Evidence:** EMF 5 — object tether resonance; Cold pocket, 3°C; Double echo through static. **Resolution:** Absolution.
**Host behavioral clue:** Moves objects near its attachment; waits for isolation. **Favored-action tell:** Small keepsakes shift toward a single object.
**Corroboration:** Walk / doors; directly visible; empty room energy recharge; strike/signature require a single hunter in room; can leave UV traces; can interact with floor salt. These are sourced attributes/tells, **not** proof all implied animations/physical set pieces have been built.

### POLTERGEIST
**Evidence:** EMF 5 — clustered kinetic spikes; Thermal shear, 4°C; Broken syllables / distant reply. **Resolution:** Banishment.
**Host behavioral clue:** Violent object storms and ordinary door passage. **Favored-action tell:** Several unsecured objects rattle in sequence.
**Corroboration:** Walk / doors; directly visible; hunter present energy recharge; strikes are not limited to single-occupant rooms; can leave UV traces; can interact with floor salt. These are sourced attributes/tells, **not** proof all implied animations/physical set pieces have been built.

### DEMON
**Evidence:** EMF 5 — patterned interference; Cold wall seam, 1°C; Voice from the wrong direction. **Resolution:** Banishment.
**Host behavioral clue:** Hard strikes; relatively little fear for the harm. **Favored-action tell:** An aggressive impact shakes the nearest threshold.
**Corroboration:** Walk / doors; directly visible; ambient energy recharge; strikes are not limited to single-occupant rooms; no UV traces from this trait; can interact with floor salt. These are sourced attributes/tells, **not** proof all implied animations/physical set pieces have been built.

### YOKAI
**Evidence:** EMF 5 — pulsing field surge; Cold pocket, 3°C; Broken syllables / distant reply. **Resolution:** Absolution.
**Host behavioral clue:** Floating voice-chaser that still opens doors. **Favored-action tell:** A familiar voice repeats from the wrong room.
**Corroboration:** Float / doors; orbs; hunter present energy recharge; strikes are not limited to single-occupant rooms; no UV traces from this trait; unaffected by floor salt. These are sourced attributes/tells, **not** proof all implied animations/physical set pieces have been built.

### BANSHEE
**Evidence:** EMF 5 — object tether resonance; Thermal shear, 4°C; Voice from the wrong direction. **Resolution:** Absolution.
**Host behavioral clue:** Wails and picks out isolated investigators. **Favored-action tell:** A rising wail fills the corridor.
**Corroboration:** Float / doors; directly visible; empty room energy recharge; strike/signature require a single hunter in room; no UV traces from this trait; unaffected by floor salt. These are sourced attributes/tells, **not** proof all implied animations/physical set pieces have been built.

### WRAITH
**Evidence:** EMF 5 — clustered kinetic spikes; Cold wall seam, 1°C; Clear direct response. **Resolution:** Banishment.
**Host behavioral clue:** Floats directly through walls without opening doors. **Favored-action tell:** Footfall echoes shift to the far side of a wall.
**Corroboration:** Float / phase walls; directly visible; empty room energy recharge; strikes are not limited to single-occupant rooms; can leave UV traces; unaffected by floor salt. These are sourced attributes/tells, **not** proof all implied animations/physical set pieces have been built.

### SHADE
**Evidence:** EMF 5 — patterned interference; Unnatural cold, 2°C — anchor chill; Double echo through static. **Resolution:** Cleansing.
**Host behavioral clue:** Camera apparition when no investigator is watching. **Favored-action tell:** An outline holds still in the darkest corner.
**Corroboration:** Float / phase walls; camera only; empty room energy recharge; strike/signature require a single hunter in room; can leave UV traces; unaffected by floor salt. These are sourced attributes/tells, **not** proof all implied animations/physical set pieces have been built.

### SPECTER
**Evidence:** EMF 5 — pulsing field surge; Thermal shear, 4°C; Double echo through static. **Resolution:** Cleansing.
**Host behavioral clue:** Camera-only figure and spectral wall traces. **Favored-action tell:** An apparition lingers after the movement ends.
**Corroboration:** Float / phase walls; camera only; ambient energy recharge; strikes are not limited to single-occupant rooms; can leave UV traces; unaffected by floor salt. These are sourced attributes/tells, **not** proof all implied animations/physical set pieces have been built.

### SPIRIT
**Evidence:** EMF 5 — pulsing field surge; Unnatural cold, 2°C — anchor chill; Clear direct response. **Resolution:** Absolution.
**Host behavioral clue:** Footsteps, opened doors, and ordinary traces. **Favored-action tell:** A faint voice carries through the old rooms.
**Corroboration:** Walk / doors; directly visible; ambient energy recharge; strikes are not limited to single-occupant rooms; can leave UV traces; can interact with floor salt. These are sourced attributes/tells, **not** proof all implied animations/physical set pieces have been built.

### HANTU
**Evidence:** EMF 5 — object tether resonance; Cold wall seam, 1°C; Broken syllables / distant reply. **Resolution:** Cleansing.
**Host behavioral clue:** Cold orbs moving through open doorways. **Favored-action tell:** A sudden cold draft brushes past the investigators.
**Corroboration:** Float / doors; orbs; empty room energy recharge; strikes are not limited to single-occupant rooms; no UV traces from this trait; unaffected by floor salt. These are sourced attributes/tells, **not** proof all implied animations/physical set pieces have been built.

### DEVIL
**Evidence:** EMF 5 — clustered kinetic spikes; Unnatural cold, 2°C — anchor chill; Voice from the wrong direction. **Resolution:** Banishment.
**Host behavioral clue:** Feeds on a lone investigator's sanity. **Favored-action tell:** A soft voice offers an unsettling promise.
**Corroboration:** Walk / doors; directly visible; hunter present energy recharge; strike/signature require a single hunter in room; can leave UV traces; can interact with floor salt. These are sourced attributes/tells, **not** proof all implied animations/physical set pieces have been built.

### MIMIC
**Evidence:** EMF 5 — patterned interference; Cold pocket, 3°C; Clear direct response. **Resolution:** Cleansing.
**Host behavioral clue:** Repeats voices and gains strength from nearby listeners. **Favored-action tell:** The last call repeats with a slight delay.
**Corroboration:** Walk / doors; directly visible; hunter present energy recharge; strikes are not limited to single-occupant rooms; can leave UV traces; can interact with floor salt. These are sourced attributes/tells, **not** proof all implied animations/physical set pieces have been built.

### TWINS
**Evidence:** EMF 5 — pulsing field surge; Cold wall seam, 1°C; Double echo through static. **Resolution:** Absolution.
**Host behavioral clue:** Twin orbs and paired knocks, never wall-phases. **Favored-action tell:** Two knocks answer from neighboring rooms.
**Corroboration:** Float / doors; orbs; ambient energy recharge; strikes are not limited to single-occupant rooms; no UV traces from this trait; unaffected by floor salt. These are sourced attributes/tells, **not** proof all implied animations/physical set pieces have been built.

## Ritual station catalog — starter house

| Rite | Actual site (`RitualSites`) | Room | Host channel | Terminal outcome |
| --- | --- | ---: | ---: | --- |
| **Banishment** | Sealed Iron Circle, storage cellar | 9 | 55 ticks / 5.5 s | BANISHED |
| **Cleansing** | Purification Font, library | 6 | 45 ticks / 4.5 s | CLEANSED |
| **Absolution** | Memorial Lectern, foyer | 10 | 60 ticks / 6.0 s | ABSOLVED |

These times apply when `identificationRequired` is enabled in the current modern LAN contract. A legacy compatibility contract remains a simpler 45-tick cleansing-at-anchor path; do not present legacy behavior as the intended full thirteen-ghost experience. Other authored location families must acquire independently traversable equivalent rite sites; do not claim nine finished playable maps merely because they appear in planning or selection.

## Design improvements still to implement — do not mislabel as shipped

- **Evidence diversity:** Retain at least **three positive, observable states per ghost** but broaden the source families and acquisition conditions. Make at least two archetypes remain plausible after two verified clues in normal cases; require a genuinely differentiating third clue and ensure no ghost can be identified by a trivial universal two-tool pair. Preserve three-positives gate, document any evidence-limited difficulty mode explicitly, and prevent unavoidable softlocks.
- **Independent tests:** Connect UV, salt, spectral photographs/orbs, manifestation, motion/footsteps and behavioral provocation to genuine, observable, reproducible player-facing logic. Avoid merely adding checkboxes or free host-only reveals. Distinguish rumor, observed behavior, and host-confirmed physical measurement.
- **Species-specific affordances:** Increase differences in power timing, reactions, limitations, environmental consequences and counterplay rather than treating the 13 profiles as different flavor strings. Particularly verify that MIMIC actually copies behavior if that becomes a promise, TWINS can create credible paired activity without being an invisible extra player, and camera-only species have a usable camera.
- **Fair asymmetric play:** Both AI and player-controlled ghosts must use the same energy, action legality, cooldown, hit checks, and evidence-producing world effects; ghost players get their own species only inside the live match. Neither role receives confidential opponent coordinates or notes. Counter tools cannot cancel an otherwise legal ghost action by client fiat.
- **Presentation:** Show recognizable visual/audio indications instead of just `TELL|` text, with subtitles/alternate channels, accessibility options, and no reliance on sound-only clues or subtle color discrimination. Distinguish premonition/minor/moderate/dangerous/signature event tiers and respect the agreed escalation budget.
- **Ritual defense:** Extend room-level guard validation to physically meaningful site-area defense when ready, record interruption/recovery feedback, and test each ghost/rite/map. Current channeling start requires 2 m proximity, but ongoing guard presence is only room-level in `LanCase.advance`.

## Acceptance gates and source pointers

- `software/beckenburg/src/main/java/org/beckenburg/GhostIdentity.java`: roster, canonical signature states, rites, distinct behavior IDs and printed instrument readings.
- `software/beckenburg/src/main/java/org/beckenburg/GhostTraits.java`: mobility, passage, sight, recharge, solitary rules, UV, health/fear multipliers.
- `software/beckenburg/src/main/java/org/beckenburg/GhostBehavior.java`: favored actions, discounts, cooldowns and nearby tells.
- `software/beckenburg/src/main/java/org/beckenburg/GhostDomain.java`: shared AI/human controller execution and signature action limits.
- `software/beckenburg/src/main/java/org/beckenburg/LanCase.java` and `RitualSites.java`: three-positive identification and rite sites, anchor ward, guard timing and terminal outcomes.
- `software/beckenburg/src/test/java/org/beckenburg/LanGhostIdentityTest.java`: iterates **all 13**, verifies unique triples, positives only at anchor, wrong guess/rite/site denial, and channel completion.
- `software/beckenburg/src/test/java/org/beckenburg/GhostTraitsTest.java`, `GhostBehaviorTest.java`: traits, action parity and balance assertions.
- `software/beckenburg/src/test/java/org/beckenburg/LanRiteNetworkTest.java`: four-socket Wraith investigation/banishment and hunter-only evidence/identity privacy.

**Before claiming a finished ghost:** rerun all ghost matrix/ritual tests from a clean Java 17 checkout, test all 13 in solo and hosted LAN including a human ghost, exercise false/duplicate scans, side effects, 1–6 hunters, reconnects, incapacitation, camera/UV/salt evidence and all ritual outcomes, then record verified outputs in `docs/beckenburg/stage-ledger.json`. Source audit and this catalog commit alone are not gameplay proof. Do not add GitHub Actions.
