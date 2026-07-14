# Blacklight EXO Source Authority

**Authority version:** `2026.07.14`  
**Authoritative preset:** `EXAMPLE`

## Governing rule

The EXAMPLE sector is **published-first**. A generated value may fill a field only when the authority record marks that field as unknown or unavailable. A procedural value may never replace a published value, a published lower bound, or a published classification.

The order of precedence is:

1. Published measured or catalogued value
2. Published lower bound or model-constrained value, explicitly labeled
3. Candidate or disputed record, explicitly separated and excluded from confirmed totals
4. Deterministic RNG supplement, explicitly labeled hypothetical

Candidate planets are not counted as confirmed planets and are not included in confirmed gravitational mass totals. Unknown information remains unknown unless a fictional supplement is deliberately requested.

## Single source of truth

`blacklight-exo-source-authority.js` is the only source registry for the EXAMPLE sector. It owns:

- System identity and aliases
- Approximate heliocentric J2000 position
- Distance
- Stellar classification and system mass estimate
- Confirmed planet count
- Confirmed or conservative published orbiting mass
- Habitable-zone status when published
- Known population status
- Candidate and disputed records
- Composition, debris, atmosphere, and mineral-evidence notes
- Source identifiers and provenance policy

No renderer is permitted to maintain a second EXAMPLE sector table.

## Active consumers

`blacklight-exo-cluster.js`
: Creates cards directly from the authority registry. It does not generate placeholder EXAMPLE cards and wait for later scripts to rewrite them.

`blacklight-exo-source-authority-model.js`
: Applies authority positions and masses to cluster geometry, route topology, gravity fields, and lensing-node calculations. It does not alter the authority record.

`blacklight-exo-source-authority-controller.js`
: Controls detail-view provenance. Published records are shown first. Procedural objects are marked `RNG supplement` and remain hypothetical.

`blacklight-exo-sol-published.js`
: Specialized published Solar System renderer selected by the authority record’s `detailProvider`. It is a presentation provider, not a competing source selector.

Other orbital, lensing, camera, and Dalton–Zirconf modules are renderers. They may consume resolved values but may not decide whether generated or published data wins.

## Retired competing mutators

The following runtime writers were removed:

- `blacklight-exo-example-neighborhood.js`
- `blacklight-exo-example-reference-data.js`
- `blacklight-exo-example-reference-2026.js`
- `blacklight-exo-example-physics-2026.js`
- `blacklight-exo-example-reference-presentation.js`

Their card rewriting, mass replacement, geometry replacement, and presentation replacement responsibilities now flow through the authority registry and its two consumers.

## Source families

The authority registry currently identifies these principal source families:

- Fifth Catalogue of Nearby Stars (CNS5)
- The 10 parsec sample in the Gaia era
- SIMBAD Astronomical Database
- NASA Exoplanet Archive
- NASA Solar System Exploration and Planetary Fact Sheets
- JPL Solar System Dynamics
- System-specific peer-reviewed or preprint analyses for Proxima Centauri, Barnard’s Star, GJ 887, Epsilon Eridani, and Epsilon Indi

A source update must be made in `blacklight-exo-source-authority.js`. It must not be patched into a renderer.

## Update protocol

When new published data becomes available:

1. Update the relevant source entry and citation in `SOURCES`.
2. Update only the affected system record.
3. State whether the value is measured, a minimum mass, a model inference, a candidate, or disputed.
4. Do not silently promote candidates to confirmed status.
5. Do not invent mineralogy from mass alone; label composition inference clearly.
6. Increment the authority version.
7. Verify that cluster cards, cluster gravity, system inventory, and Sol rendering still agree.

## Runtime diagnostic

The page displays the active authority version and mode above the detailed system view. EXAMPLE cluster cards carry `data-authority-mode="published-first"`; generated supplemental rows carry `data-provenance="rng-supplement"`.
