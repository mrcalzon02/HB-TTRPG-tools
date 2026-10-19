# Project Beckenburg — revised ghost evidence matrix
_Sourced from GhostEvidenceProfile, GhostTraits, GhostIdentity, GhostEvidenceMatrix and HardEvidenceQuota (LAN simulation)._

## Contract guarantee

**Easy:** at least **3** hard-evidence families; currently all compatible sources,
usually 4–6. **Medium:** exactly **2**, chosen from the species' compatible sources.
**Death Wish:** exactly **1**, chosen from the same compatible sources.
Medium and Death Wish select a fixed, host-owned, case-seeded subset. Do not
publish that per-case subset in the hunter journal: the table is **what the ghost
*can* produce**, not a report of which sources were selected in a particular match.

The seven implemented hard-evidence families are high EMF **8–10**, paranormal
**temperature extreme**, positive **spirit-box** response, authored **writing**,
genuine **D.O.T.S.** interaction, positive **UV trace**, and **spirit orbs**.
Ordinary EMF **2–7**, seasonal freezing/heat, no-response spirit-box scans and
behavioral sightings are still possible outside the hard-evidence quota.
**EMF suppression** on Shade, Specter and Hantu is diagnostically useful, but
cannot consume one of the guaranteed positive-evidence slots.

## Ghost by ghost

Legend: **✓** potential positive hard evidence; **—** unavailable;
**Supp.** high EMF suppressed (diagnostic trait only); **C** paranormal cold;
**H** paranormal heat. Writing styles: **Ch** child drawings, **Sc** frantic
scrawls, **Ci** ritual circles. The **Easy pool** counts families, not writing
subtypes.

| Ghost | EMF 8–10 | Temp | Spirit box | Writing | D.O.T.S. | UV | Orbs | Easy pool | Required rite |
|---|---|---|---|---|---|---|---|---:|---|
| Possessive | ✓ | — | ✓ | Ch, Ci | ✓ | ✓ | — | 5 | Absolution |
| Poltergeist | ✓ | H | ✓ | Sc | ✓ | ✓ | — | 6 | Banishment |
| Demon | ✓ | H | ✓ | Sc, Ci | ✓ | — | — | 5 | Banishment |
| Yokai | ✓ | — | ✓ | — | ✓ | — | ✓ | 4 | Absolution |
| Banshee | ✓ | C | ✓ | — | ✓ | — | — | 4 | Absolution |
| Wraith | ✓ | — | ✓ | Sc, Ci | ✓ | ✓ | — | 5 | Banishment |
| Shade | Supp. | C | ✓ | Ci | ✓ | ✓ | — | 5 | Cleansing |
| Specter | Supp. | — | ✓ | Ci | ✓ | ✓ | — | 4 | Cleansing |
| Spirit | ✓ | C | ✓ | Ch | ✓ | ✓ | — | 6 | Absolution |
| Hantu | Supp. | C | ✓ | — | ✓ | — | ✓ | 4 | Cleansing |
| Devil | ✓ | H | ✓ | Sc, Ci | ✓ | ✓ | — | 6 | Banishment |
| Mimic | ✓ | H | ✓ | Ch, Sc | ✓ | ✓ | — | 6 | Cleansing |
| Twins | ✓ | — | ✓ | — | ✓ | — | ✓ | 4 | Absolution |

## Interpretation and design limits

- All 13 species have possible **spirit-box** and **D.O.T.S.** events; these are
  not necessarily active in a Medium or Death Wish contract.
- Ghost writing counts as **one** evidence family, even if the species can
  produce multiple writing styles.
- Camera-only apparition, passage through walls, characteristic aggression,
  target selection, audible wails, footsteps and other behavioral clues remain
  available as deduction aids. They are **not** extra quota slots.
- Weather influences ambient electromagnetic and thermal noise but does not
  change the number of permitted hard-evidence families.
- Proposed ectoplasm, resonance, seismic, object-imprint and related
  expansion devices are **not yet producers in this seven-family matrix**.
- Slot availability does not guarantee instantaneous appearance: the ghost must
  perform the relevant event, and a player must detect it with functioning
  equipment. A playtest must verify that each selected family can generate a
  positive observation over a reasonable mission time.
- **Ritual completion is investigator victory**; a correct identification and
  retreat may earn partial pay but is not victory.

Authoritative sources:
- `src/main/java/org/beckenburg/HardEvidenceQuota.java`
- `src/main/java/org/beckenburg/GhostEvidenceProfile.java`
- `src/main/java/org/beckenburg/GhostTraits.java`
- `src/main/java/org/beckenburg/GhostEvidenceMatrix.java`
- `src/main/java/org/beckenburg/GhostIdentity.java`
