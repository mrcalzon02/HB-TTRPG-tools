# Third-Party Source Reference Archive

This directory is the provenance and retrieval index for external source material used as algorithmic or architectural reference by HB-TTRPG-tools.

## Rules

- Keep upstream source identity, author/maintainer credit, source-provider links, and license boundaries explicit.
- Do not silently merge third-party source into project-native code.
- Project-native engines should expose their own authoritative implementation and tests while documenting relevant upstream inspiration.
- Where redistribution boundaries or mixed-content rights matter, preserve a deterministic fetch helper instead of presenting the retrieved source as native project code.
- Machine-readable discovery is provided by `UPSTREAM-INDEX.json`.

## Indexed reference families

- `donjon-dungeon/` — random dungeon/topology reference; Donjon/drow; CC BY-NC 3.0 source reference.
- `donjon-world/` — fractal world-generation reference; John Olsson source provided by Donjon; GPL v2-or-later source family.
- `donjon-name/` — Markov name-generation reference; Donjon/drow generator released to the public domain; example datasets retain their own attribution/rights.

These references are intended to inform reusable project-native engines that may serve browser generators, mirrored AI/tool calls, and future APIs from one source of truth.
