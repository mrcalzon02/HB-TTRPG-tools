# Donjon Random Dungeon Generator — Reference Archive

This directory is the provenance anchor for the procedural-topology work inspired by the public Donjon random dungeon generator reference implementation.

## Upstream

- Project: **donjon; Random Dungeon Generator**
- Author / upstream credit: **drow / donjon**
- Project page: https://donjon.bin.sh/code/dungeon/
- Published source file: https://donjon.bin.sh/code/dungeon/dungeon.pl
- Published license: **Creative Commons Attribution-NonCommercial 3.0 Unported (CC BY-NC 3.0)**
- License page: https://creativecommons.org/licenses/by-nc/3.0/
- Archive/provenance record established: **2026-08-21**

The upstream page describes `dungeon.pl` as a simplified implementation of the Donjon random dungeon generator and explicitly publishes that source under CC BY-NC 3.0. The original source is third-party material and is **not relicensed as native HB-TTRPG-tools code**.

## Why this is archived

The Donjon generator exposes a reusable procedural topology pattern that is useful well beyond a fantasy dungeon. Its important contribution to this project is the separation of spatial construction into ordered phases: initialize a constrained cell field, place spaces, create entrances, carve a connectivity network, place special connectors, clean the resulting topology, and only then render the map.

HB-TTRPG-tools intends to use that model as an architectural reference for a **shared topology engine** capable of supporting multiple generators, including:

- generic adventure/module map generation;
- dungeon and ruin layouts;
- facilities, laboratories, compounds, and stations;
- alien spacecraft and multi-deck vessels;
- faction- or culture-specific constructed environments;
- future generators that need coherent connected spaces rather than independently scattered rooms.

For alien vessels, semantic generators should determine what spaces and systems are required first. Race, faction, technology, mission, crew, scale, and vessel-role outputs become constraints supplied to the topology engine. The topology engine then produces a coherent spatial/connectivity solution. It must not generate an arbitrary dungeon first and merely rename rooms afterward.

## Licensing boundary

Everything in this directory that originates from Donjon remains governed by its upstream license. Native HB-TTRPG-tools implementations should be independently authored against the documented algorithmic model unless a component deliberately incorporates upstream source and is therefore kept under the applicable upstream terms.

The production topology engine must not silently import or execute `dungeon.pl`. This archive exists to preserve attribution, provenance, the upstream reference, and the design lineage.

## Source snapshot

The canonical upstream filename is `dungeon.pl`. A deterministic acquisition helper is provided as `fetch-original.sh`; it downloads the currently published upstream file into this directory, validates the expected attribution/license markers, and prints a SHA-256 digest so a retrieved snapshot can be identified precisely.

A byte-for-byte upstream snapshot should retain its original header and licensing information unchanged.

See also:

- `UPSTREAM-MANIFEST.json` — machine-readable provenance metadata.
- `LICENSE-NOTICE.md` — license boundary and attribution notice.
- `TOPOLOGY-ADAPTATION.md` — rules for reusing the architectural model across generators.
- `fetch-original.sh` — deterministic source-acquisition helper.
