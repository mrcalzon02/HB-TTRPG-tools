# Project Beckenburg — corrected ghost evidence matrix

**EMF has three ghost signatures:** High (8–10), Low/Mid (2–7), or No EMF
(0 during the ghost's strong nearby action). All three are valid species-specific
EMF evidence, and each occupies **one** evidence family, never multiple.
Ambient/weather readings may still fluctuate 2–7 independently of ghost
signatures, including around a no-EMF ghost between events.

**D.O.T.S. evidence belongs to only three ghosts: Wraith, Shade and Specter.**
The projector can be deployed for any ghost, but the host only permits
a visible D.O.T.S. silhouette for those three ghosts and only when that evidence
family is enabled for the current contract.

**Contract guarantees:** Easy ≥4, Medium exactly 3, Death Wish exactly 1.
The instrument result is never an automatic ghost-identity confirmation:
a player sees a reading or no reading. The journal records `OBSERVED`.
Easy exposes all species-compatible families. Each ghost's unique three
Medium families now include an original Beckenburg instrument; Death Wish
permits one of those three. Weather does not create a ghost-specific event.
See `development/ADDITIONAL_EVIDENCE_INSTRUMENTS.md`.

Legend: H = high ghost EMF (8–10); L/M = low/mid ghost EMF (2–7);
0 = no EMF during a strong local spectral event (natural ambient may differ);
C = ghost-induced cold; Ht = ghost-induced heat; Ch = child drawings;
Sc = frantic scrawls; Ci = ritual circles; ✓ = positive evidence possible.
Writing styles count as one writing family.

## Ghost by ghost

| Ghost | EMF | Temperature | Spirit box | Writing | D.O.T.S. | UV | Orbs | Easy pool | Required rite |
|---|---|---|---|---|---|---|---|---:|---|
| Possessive | L/M | — | ✓ | Ch, Ci | — | ✓ | — | 4 | Absolution |
| Poltergeist | H | Ht | ✓ | Sc | — | ✓ | — | 5 | Banishment |
| Demon | H | Ht | ✓ | Sc, Ci | — | — | — | 4 | Banishment |
| Yokai | L/M | — | ✓ | Ci | — | — | ✓ | 4 | Absolution |
| Banshee | L/M | C | ✓ | Sc | — | — | — | 4 | Absolution |
| Wraith | L/M | — | ✓ | Sc, Ci | ✓ | ✓ | — | 5 | Banishment |
| Shade | 0 | C | ✓ | Ci | ✓ | ✓ | — | 5 | Cleansing |
| Specter | 0 | — | ✓ | Ci | ✓ | ✓ | — | 4 | Cleansing |
| Spirit | L/M | C | ✓ | Ch | — | ✓ | — | 5 | Absolution |
| Hantu | 0 | C | ✓ | — | — | — | ✓ | 4 | Cleansing |
| Devil | H | Ht | ✓ | Sc, Ci | — | ✓ | — | 5 | Banishment |
| Mimic | H | Ht | ✓ | Ch, Sc | — | ✓ | — | 5 | Cleansing |
| Twins | H | — | ✓ | Ch | — | — | ✓ | 4 | Absolution |

## Three-evidence identity signatures (Medium contracts)

Every row has **exactly three** positive, authored evidence families.
No two ghosts share the same triple. All three exist in the ghost's Easy
pool; Death Wish grants exactly one of these three families.

| Ghost | Unique three-evidence signature |
|---|---|
| Possessive | EMF + Spirit Box + Object Imprint |
| Poltergeist | EMF + Temperature + Seismic |
| Demon | EMF + Temperature + Resonance |
| Yokai | EMF + Writing + Resonance |
| Banshee | Temperature + Spirit Box + Ectoplasm |
| Wraith | EMF + D.O.T.S. + Laser Grid |
| Shade | Temperature + D.O.T.S. + Spectral Shadow |
| Specter | Writing + D.O.T.S. + Spectral Shadow |
| Spirit | Temperature + Spirit Box + Object Imprint |
| Hantu | EMF + Temperature + Atmospheric Reversal |
| Devil | Temperature + Writing + Resonance |
| Mimic | EMF + Temperature + Object Imprint |
| Twins | Spirit Box + Writing + Seismic |

The ghost doesn't need exclusive ownership of any one instrument or clue.
The **combination** is what uniquely identifies its type. On Easy, additional
compatible evidence can be produced; these are still real signatures and
can corroborate or distinguish a diagnosis.

### Future ghost capacity

Seven evidence families yield C(7,3) = **35** mathematical triples.
Because only three current ghosts can produce D.O.T.S., preserving that
restriction means at most C(6,3) = **20** non-D.O.T.S. signatures plus
the three existing D.O.T.S. signatures = **23** ghost signatures.
With 13 assigned now, up to **10 additional species** are combinatorially
possible without new evidence families or expanding D.O.T.S. eligibility.
This is an upper bound, not a guarantee that every available triple makes a
well-balanced, physically detectable ghost.

## Extra instruments now in active evidence production

Every existing ghost has two additional candidate phenomena from
`GhostEvidenceMatrix` and an authored device capable of reading them.
These are available in Easy and selected where present in Medium/Death Wish.
The detector shows observed measurements only, never "confirmed evidence"
or the correct identity. Read `ADDITIONAL_EVIDENCE_INSTRUMENTS.md` for
the complete seven-detector and seven-support-tool implementation status.

## Rules and distinction

- EMF **High**, **Low/Mid** and **No EMF** are mutually exclusive ghost identities.
  Ambient low/mid EMF by itself is not proof; it must correlate with a real local
  ghost event. A strong local event from a no-EMF ghost drives the field to zero.
- Only **Wraith, Shade and Specter** produce D.O.T.S. evidence; no other ghost does.
- Writing styles are appearance variants, not extra quota slots.
- The seven hard-evidence **families** remain EMF, Temperature, Spirit Box,
  Writing, D.O.T.S., UV and Orbs. A ghost's EMF category is a **subtype** of EMF.
- Ghost behavior, movement, attacks, target choices and ordinary weather signals
  can aid deduction but don't add hard-evidence slots.
- Proposed future devices (ectoplasm, resonance, seismic, object imprints, etc.)
  remain separate and do not enter the current implemented evidence quota.
- Contract guarantee means **available to produce and detect**, not that
  the ghost automatically emits all its evidence during the first few minutes.
  Timing and tier-specific detection still require real playtesting.
- The investigators only **win** when they finish the correct ritual;
  verified identification followed by withdrawal earns partial compensation.

### Source of truth

`GhostEvidenceProfile.emfBand()` and `dotsVisible()` own the species
assignments. `EvidenceSignals.emf()` implements three real EMF outcomes;
`HardEvidenceQuota` selects families; `LanCase` and `LanHost` enforce them.
`GhostEvidenceMatrix` and `GhostFieldGuide` consume those same traits.
