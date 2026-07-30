# Binary Cube V13 Launch and Documentation Report

## Status

- Milestone: `V13 — Shadowrun Workspace Launch and Documentation`
- State: in progress
- Prerequisite: V12 accepted
- Public route: `https://mrcalzon02.github.io/HB-TTRPG-tools/#shadowrun`

## Promotion changes

- The **Binary Cube Encryption Laboratory** remains a dedicated Shadowrun workspace card.
- The **Binary Cube Encoder Visualizer** remains a separate dedicated card.
- Both cards are promoted from `prototype` to `available`.
- The Shadowrun asset version is advanced to `20260730-v13` so the public workspace receives the promoted card metadata and current assets.
- The landing-page lazy-view loader supports both explicit activation and direct `#shadowrun` navigation.

## User documentation

`docs/binary-cube-visualizer-user-guide.md` documents:

- opening the tool;
- quick start;
- the real transformation model;
- input and output faces;
- quarter-turn orientation;
- point identity and keyed depth;
- mask and deterministic filler;
- block framing;
- all ten trace phases;
- playback and inspection;
- rendering tiers;
- internal packages, secure exports, and authenticated envelopes;
- laboratory handoff;
- accessibility and exact 2D fallback;
- persistence, recovery, files, downloads, and troubleshooting;
- the experimental-obfuscation warning.

## Developer documentation

`docs/binary-cube-visualizer-architecture.md` records:

- the one-engine authority boundary;
- controller and renderer responsibilities;
- package and trace flows;
- rendering-tier policy;
- asynchronous generation-token invalidation;
- lifecycle and WebGL resource ownership;
- accessibility architecture;
- transport provenance;
- storage and desktop integration;
- no-build GitHub Pages deployment;
- permanent validation workflows and future change rules.

## Accepted prerequisite evidence

V12 accepted evidence is recorded in `docs/binary-cube-v12-runtime-failure-report.md`.

The accepted complete workflow proves:

- 24 of 24 V0–V12 checks pass;
- no check fails;
- the final accepted run required no browser retry;
- historical engine, trace, shell, renderer, animation, encoder, sequencing, performance, accessibility, compatibility, desktop, lifecycle, failure, and stale-work contracts remain green.

The accepted live Pages workflow proves:

- the `/HB-TTRPG-tools/#shadowrun` route works;
- the Shadowrun entry and visualizer lazy-load through the public repository subpath;
- the visualizer opens and produces a valid package, round trip, and trace;
- exact 2D mode remains complete;
- all core controls remain present;
- the `390 × 844` layout stacks correctly;
- no visible visualizer element causes horizontal overflow.

## V13 exit evidence to add

V13 will be accepted when permanent source and live-browser checks prove:

1. both promoted cards exist and are marked available;
2. the laboratory and visualizer remain separate launch targets;
3. the visualizer loader includes the canonical engine, auth, secure export, renderer, controller, and stylesheet;
4. the user guide covers the required concepts and warning;
5. the architecture guide covers authority, lifecycle, transport, storage, desktop, and deployment boundaries;
6. V12 is accepted before promotion;
7. the public Shadowrun route displays both available cards and opens the visualizer;
8. the complete V0–V12 and live Pages gates remain green after promotion.

## Acceptance note

This report establishes the V13 promotion scope. V13 remains in progress until the permanent launch gate and post-promotion public evidence pass.
