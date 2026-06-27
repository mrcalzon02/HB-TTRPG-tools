# Milestone 3.2 — World-Seeded Location Packages

**Status: Complete**

This milestone changes generated location content from one flat browser result into separate, selectable Chronicle worlds.

## World seed model

The browser presents one combined selector containing:

- **Embedded global worlds** loaded from `data/world-of-darkness/generated_location_registry.json`.
- **Local browser worlds** stored in `localStorage`.

A browser receives a random local world seed when no local world exists. Users may create additional local worlds with either a random value or a supplied seed phrase. The active seed remains selectable so the user can continue building the same local Chronicle over multiple sessions.

Selecting an embedded world reproduces and extends that shared world. Selecting a local world keeps generation private until a package is submitted globally.

## Location package identity

A package key is derived from:

`world seed key + stable real-location key + game line`

This produces one stable package identity for a location and game line inside one world while permitting the same real business to exist differently in any number of other worlds.

Examples:

- The same corner store may be mundane in one world.
- It may be tangential to a Kindred route in another world.
- It may be an active unregistered Ventrue operation in a third world.
- None of those packages overwrite one another because they belong to different world seed keys.

## Generated package contents

Each package stores a complete immutable snapshot containing:

- World seed identity and label.
- Stable location key, name, address, category, coordinates, and reference URL.
- Game line.
- World-specific inventory status and one of the 210 location variants.
- Public facade, hidden function, evidence confidence, catalogue note, and supernatural registry interpretation.
- Population.
- Local struggle.
- Adventure hook.
- Location seed.
- Content item.
- Links to Urban Mystification, Street-Level Nobody, Rumor and Resonance, Character Profiling, Domain Politics, and Chronicle Consequences.

The full generated text is saved rather than only its random seed. Later edits to generator tables therefore do not silently rewrite already published worlds.

## Save Locally

**Save Locally** writes the exact package into browser `localStorage` beneath its world seed.

Local packages are immutable. Saving the same package again loads the existing snapshot. A different package cannot replace it under the same key. The local package must be deleted before it can be regenerated.

Deleting a local package does not delete the local world seed. The user can continue building the same world or regenerate the deleted location.

## Submit Globally

**Submit Globally** opens a prefilled GitHub issue containing:

- Immutable world seed metadata.
- The complete package snapshot.
- The package and location keys.

The repository owner runs `.github/workflows/ingest-wod-location-package.yml` with the issue number. `scripts/ingest-wod-location-package.mjs` validates the submission and commits it beneath the appropriate world in `generated_location_registry.json`.

If the world seed does not yet exist globally, the first accepted package embeds it. Additional packages stack inside the same world. Contributions to other world seeds remain completely separate.

## Immutability and deletion

Global world seed metadata is immutable after embedding.

Global packages are also immutable:

- An identical resubmission is harmless.
- A different package under the same key is rejected.
- A package must be explicitly deleted before regeneration.

The owner-only `.github/workflows/delete-wod-location-package.yml` workflow deletes one package from one embedded world. The world seed itself remains available for further contributions.

## Browsing and sharing

Selecting an embedded or local package updates the page URL with:

- `wodWorld`
- `wodScope`
- `wodPackage`

Embedded packages can therefore be linked directly after GitHub Pages deploys the updated registry. Local-world links remain useful only in browsers that possess that local seed and local package data.

## Claimed businesses

Businesses already present in the central claimed POI registry are excluded from this system. The interface disables world-seeded package generation and global submission for them.

Claimed-business integration will be implemented later through its own panel and governance rules rather than being mixed into unclaimed generated worlds.

## Active files

- `world-of-darkness-location-package-bridge.js`
- `data/world-of-darkness/location_crosslink_core.json`
- `data/world-of-darkness/generated_location_registry.json`
- `scripts/ingest-wod-location-package.mjs`
- `scripts/delete-wod-location-package.mjs`
- `scripts/validate-wod-world-seed-packages.mjs`
- `.github/workflows/ingest-wod-location-package.yml`
- `.github/workflows/delete-wod-location-package.yml`
