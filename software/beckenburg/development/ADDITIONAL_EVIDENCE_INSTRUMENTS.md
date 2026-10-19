# Beckenburg — playable original evidence tools (LAN integration)

## Observation rule

**Tools show observable things or they don't. No automatic conclusions.**
The new instruments display only residue, a frequency peak, a pressure
difference, a vibration, a silhouette, an imprint, a broken laser pattern
or the corresponding blank/ordinary readout. The host never transmits
`CONFIRMED`, `VERIFIED SOURCE`, a ghost name, a species verdict or a
secret evidence-suitability flag as an instrument result. The casebook
stores every sample as `OBSERVED`. The investigator decides what to
mark in the journal and which rite to perform.

## Active new LAN detection families

| Held tool | Family | What a player observes when the condition exists | Without a local event |
|---|---|---|---|
| Ectoplasm Sampler | ECTOPLASM | Glassy residue and sample mass | Clean swab |
| Resonance Tuner | RESONANCE | Frequency peak in Hz and dB | Broadband noise |
| Barometric Probe | ATMOSPHERIC | Local pressure dip in hPa | Stable pressure |
| Seismic Recorder | SEISMIC | Floor-vibration impulse in mm/s | No distinct impulse |
| Spectral Prism | SHADOW | Silhouette area in view | Clear view |
| Laser Grid | LASER | Occluded or displaced beams | Aligned beams |
| Object Imprint Scanner | IMPRINT | Surface-contact pattern and strength | Clear contact plate |

These observations use **existing host-accepted** ghost actions, their
event room and tick, equipment tier range, and the contract's private
evidence allowance. Weather and ambient noise alone never satisfy the
authored source-event condition. Pressing the instrument button without
a recent in-range event returns an ordinary reading, not a paranormal
observation. Only the host decides whether the sensor experienced the
event; it does not tell the player what to conclude.

## Supporting tools activated

Anchor Triangulator (coarse bearing after local events), EMF Array and
Thermal Beacon (stationary measurement using the existing field/air
simulation), Ritual Anchor Meter (nearby ritual needle), Ward Stability
Probe (physical ward present or absent), Chalk Sigil Kit (finite charges
deploying an actual protective ward), and Spectral Frequency Analyzer
(an additional resonance pickup with its own tier/range).

All fourteen original tools are enabled in the existing four-slot LAN
loadout and tiered van store. Their authored model entries are retained
through EquipmentModelCatalog; these changes do not constitute graphical
acceptance of models or installed launch builds. Neither legacy solo
mode nor full in-world deployable model/animation verification is claimed
complete here.

## Evidence quotas and ghost signatures

The seven new families join the existing seven: EMF (high/low-mid/none),
temperature, spirit box, writing, D.O.T.S., UV and orbs. Each family
counts once. The thirteen original ghosts retain unique three-family
signatures; each signature now includes one of the added instruments.
Easy offers >=4 compatible clues, Medium exactly the authored 3, and
Death Wish exactly one from those three. D.O.T.S. remains exclusive to
Wraith, Shade and Specter.

There are **still thirteen** currently playable ghost archetypes. Ten
new ghosts require their own integrated behavior, visual/audio identity,
ritual, balancing and runtime tests before release.

## Verification still needed

`AdditionalEvidenceTest` simulates all seven new detector types in
range, outside range, with and without an event, under evidence scarcity,
and checks the journal for `OBSERVED` without certifying language.
`FieldEquipmentTest`, `HardEvidenceQuotaTest` and
`GhostEvidenceMatrixTest` protect the loadout and family-count rules.
The full Java test suite and 3D network playtest still need execution;
a GitHub source commit is not a tested distributable.
