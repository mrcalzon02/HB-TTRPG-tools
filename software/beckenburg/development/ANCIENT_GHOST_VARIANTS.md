# Ancient Ghosts — ten inherited variants

The roster is now **23 ghost types**: thirteen originals and ten **Ancient**
variants. Ancient types are not a second AI implementation; the original
parent's locomotion, doors/walls, energy gain, target preferences, Ghost Frenzy
cost/attacks, sound/behavior tell, sanity effects, damage and ordinary ritual
category are reused through `GhostIdentity.Type.baseType()`.

**Visual treatment:** reuse the same approved directional sprite frames
(`banshee` ghost turnaround currently used by the software renderer). Apply a
green RGB tint per pixel at render time; no new artwork or asset redistribution.
Ancient orbs receive an analogous green orb color. The host sends the tint flag
only alongside an already-visible apparition; the flag does not disclose the
hidden ghost identity while invisible.

**Ritual endurance:** exactly double the original ritual hold time. In
identity-required contracts, Cleansing 45 -> **90 ticks**, Banishment 55 ->
**110 ticks**, and Absolution 60 -> **120 ticks** (100ms host ticks). The
original ward/site requirements, interruption grace, correct-rite check and
victory/loss conditions remain intact. Legacy non-identity mode also doubles
its 45-tick cleansing if the selected entity is Ancient.

## Ancient family evidence — Medium difficulty

| New ghost | Parent behavior | Distinctive 3-evidence signature | Ritual |
|---|---|---|---|
| Ancient Possessive | Possessive | Ectoplasm + Spectral Shadow + Spirit Box | Absolution, 120 ticks |
| Ancient Poltergeist | Poltergeist | Seismic + Laser Grid + EMF | Banishment, 110 ticks |
| Ancient Demon | Demon | Resonance + Atmospheric Reversal + EMF | Banishment, 110 ticks |
| Ancient Yokai | Yokai | Resonance + Object Imprint + Spirit Box | Absolution, 120 ticks |
| Ancient Banshee | Banshee | Ectoplasm + Atmospheric Reversal + Temperature | Absolution, 120 ticks |
| Ancient Wraith | Wraith | Laser Grid + Spectral Shadow + EMF | Banishment, 110 ticks |
| Ancient Shade | Shade | Spectral Shadow + Object Imprint + Temperature | Cleansing, 90 ticks |
| Ancient Specter | Specter | Spectral Shadow + Resonance + Spirit Box | Cleansing, 90 ticks |
| Ancient Hantu | Hantu | Atmospheric Reversal + Ectoplasm + Temperature | Cleansing, 90 ticks |
| Ancient Twins | Twins | Seismic + Object Imprint + Spirit Box | Absolution, 120 ticks |

For every ghost Easy makes **at least four** compatible evidence families
available; Medium permits exactly the three above; Death Wish permits **one**
case-seeded family from that unique triple. The contract does not reveal
which family is enabled. An instrument displays only what the player sees:
residue, pressure, frequency, marks, a silhouette, a blank result, and so on.
There is **no automatic ghost-evidence verification** or identity oracle.

D.O.T.S. remains restricted to **the three original ghosts**, Wraith, Shade
and Specter. Ancient Wraith/Shade/Specter retain the same movement/behavior
patterns, but their different evidence profiles deliberately do not include
D.O.T.S. Ancients inherit parent EMF band and temperature polarity.

## Compatibility and QA

- The ten Ancient enum identifiers are appended after the original thirteen
  to avoid changing historical enum ordinals.
- Field Guide and existing ghost selection widgets enumerate the complete
  roster, with an Ancient explanation and parent behavioral hints.
- AI/human GhostDomain and GhostFrenzy share profile implementation.
- The LAN apparition protocol accepts an optional `GREEN` visual flag.
- `AncientGhostVariantsTest` tests the actual 23-ghost roster, ten parent
  inheritances, unique three-evidence signatures, D.O.T.S. count, doubled
  ritual durations and the directional alpha-sprite tint in pixels.
- `LanGhostIdentityTest`, `GhostBehaviorTest`, `HardEvidenceQuotaTest`
  and `GhostEvidenceMatrixTest` retain original-species assertions and
  cover all variants.
- Full Java regression build, LAN playtest, camera-only render path and
  packaged sprite resource acceptance remain necessary before declaring a
  playable release.
