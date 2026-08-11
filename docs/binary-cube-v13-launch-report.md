# Binary Cube V13 Launch and Documentation Report

## Status

- Milestone: `V13 — Unified Binary Cube Launch and Documentation`
- State: accepted
- Prerequisite: V12 accepted
- Shadowrun route: `https://mrcalzon02.github.io/HB-TTRPG-tools/#shadowrun`
- Centralized Scientific Tools route: `https://mrcalzon02.github.io/HB-TTRPG-tools/#scientific-tools`
- Permanent gate: `.github/workflows/binary-cube-v13-launch.yml`

## Promotion changes

- The **Binary Cube Encryption Laboratory** remains a dedicated Shadowrun workspace card.
- The **Binary Cube Encoder Visualizer** remains a separate dedicated card while delegating to the shared authoritative visualizer implementation.
- The centralized **Scientific Tools** workspace exposes the same Binary Cube visualizer rather than maintaining a duplicate renderer or controller.
- Both Shadowrun Binary Cube cards remain marked `available`.
- The current Shadowrun asset version is `20260809-v17-contextual-help`.
- The landing-page lazy-view loader supports explicit activation and direct `#shadowrun` and `#scientific-tools` navigation.
- Historical compatibility gates accept forward-moving dated asset versions while continuing to enforce their original encoder, accessibility, transport, storage, and desktop contracts.

## Serial demonstration promotion

The viewport **Play Encoding** demonstration now uses a dedicated serial presentation of the canonical immutable transformation trace:

- exactly one input bit is active at a time;
- every bit receives a fixed `1400 ms` route interval;
- the ordinary playback-speed selector does not accelerate the serial viewport demonstration;
- the moving bit follows the exact canonical route from input face cell to keyed interior coordinate to output face cell to emitted landing position;
- the white route grows progressively with the travelling bit instead of jumping between coarse phase states;
- a stationary pale marker remains at the exact keyed interior coordinate while the bit traverses the route;
- an on-canvas **KEYED TRANSLATION · (x, y, z)** label tracks that same canonical coordinate.

The serial renderer derives its four route anchors from existing canonical trace phases `3`, `4`, `7`, and `9`. It does not introduce a second encoding algorithm or reconstruct transformation geometry independently from the canonical trace.

## Demonstration-only key profile

The key generator now includes **DEMONSTRATION ONLY · Flat Z Ripple** for visual explanation. This profile still passes through the canonical key validator but deliberately uses identity row, column, and depth permutations, a full payload mask, and the predictable relation:

`z = (x + y) mod gridSize`

The deterministic ripple makes neighboring input cells visibly progress through depth in a comprehensible pattern. It is explicitly marked demonstration-only because its predictable geometry exists for visualization, not security.

## User documentation

`docs/binary-cube-visualizer-user-guide.md` documents:

- opening the shared tool from Shadowrun and Scientific Tools;
- ordinary canonical randomized keys and the Flat Z Ripple demonstration profile;
- the real transformation model;
- input and output faces and quarter-turn orientation;
- point identity, keyed depth, masks, deterministic filler, and block framing;
- all ten canonical trace phases;
- ordinary playback and the one-bit-at-a-time `1.4 s` viewport demonstration;
- the exact progressive route and keyed-translation marker/label;
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
- package, trace, and serial viewport flows;
- the exact serial route anchors and distance-weighted tweening;
- the stationary keyed-translation marker and label contract;
- the demonstration-only Flat Z Ripple profile;
- rendering-tier policy;
- asynchronous generation-token invalidation;
- lifecycle and WebGL resource ownership;
- accessibility architecture;
- transport provenance;
- storage and desktop integration;
- no-build GitHub Pages deployment;
- permanent validation workflows and future change rules.

## Accepted launch evidence

The V13 source contract proves:

- V12 is accepted before promotion;
- both Binary Cube Shadowrun cards are separate and marked `available`;
- the current forward-moving asset version remains compatible;
- the visualizer loader preserves the canonical engine, authentication, secure-export, renderer, controller, and stylesheet chain;
- direct-hash and explicit workspace activation remain available;
- the user and architecture guides contain the required launch concepts;
- the ten canonical phases and experimental-obfuscation warning remain in the promoted tool.

The public V13 browser receipt proves:

- the live Shadowrun route displays **Binary Cube Encryption Laboratory** with **Available** and **Open Laboratory**;
- the live route displays **Binary Cube Encoder Visualizer** with **Available** and **Open Visualizer**;
- both cards retain distinct launch identifiers;
- the promoted visualizer opens through its real public workspace card;
- renderer version `0.6.0` initializes;
- the canonical package, exact round trip, and selected-block trace settle successfully;
- the active transport remains an internal package;
- only one visualizer panel exists;
- the promoted responsive launch remains within the CSS viewport.

The dedicated public Scientific Tools serial receipt proves:

- **DEMONSTRATION ONLY · Flat Z Ripple** is present and activates the canonical demonstration key;
- the public controller reports `1400 ms` per serial bit;
- the normal speed selector can remain at `2×` while serial playback retains its dedicated timing boundary;
- route progress increases incrementally while the first bit remains active;
- the next active point is exactly the second input bit, with no skipped bit;
- the public **KEYED TRANSLATION** label is visible and its coordinate exactly matches the keyed point reported by the active serial route.

## Responsive public evidence

The V12 Pages browser gate requests a `390 × 844` mobile device viewport. Current Chromium exposes a `482 px` CSS layout viewport under that emulation, so the gate validates the responsive invariant rather than assuming those two coordinate systems are numerically identical.

The accepted public receipt proves:

- the deployed document has no horizontal page overflow;
- the Binary Cube panel remains narrower than the CSS viewport;
- control and main columns stack without overlap;
- all required controls remain present;
- the exact `4 × 4` 2D fallback exposes all `32` input/output cells;
- package, round-trip, and trace state remain valid.

Four measured nodes may extend beyond the CSS viewport without increasing document width. All four are `.sth-tooltip-bubble` spans and are retained as diagnostics rather than classified as page overflow. No control, panel, canvas, serial marker, or serial label caused document overflow in the accepted run.

## Post-promotion regression evidence

The complete V0–V12 aggregate now contains **27 checks**, including dedicated serial-demonstration evidence:

- exact four-anchor serial route contract;
- monotonic distance-weighted tweening;
- one-bit-at-a-time sequencing;
- fixed `1400 ms` serial-bit duration contract;
- ordinary playback-speed isolation;
- real Chromium serial playback;
- exact stationary keyed-translation marker;
- keyed-translation label correspondence;
- historical engine, trace, encoder, sequencing, performance, accessibility, compatibility, desktop, lifecycle, failure-path, and stale-work evidence.

The complete aggregate passes before V13 proceeds to public deployment checks.

## Permanent V13 enforcement

`.github/workflows/binary-cube-v13-launch.yml` now fails unless all of the following pass together:

1. V13 source and documentation contracts;
2. the complete 27-check V0–V12 aggregate;
3. byte-for-byte public deployment synchronization for the current repository `shadowrun-entry.js`;
4. the V12 live responsive and exact-fallback browser gate;
5. the V13 live promoted-card and visualizer-launch browser gate;
6. the live Scientific Tools one-bit serial demonstration gate.

The deployment synchronization step compares the public `shadowrun-entry.js` directly against the repository copy instead of depending on a hard-coded historical asset-version string. Logs for the V13 gate and the nested complete V0–V12 receipt are retained as workflow artifacts.

## Acceptance

V13 is accepted. The Binary Cube Encoder Visualizer is a documented, publicly launched shared tool with preserved Shadowrun laboratory access, centralized Scientific Tools exposure, exact one-bit serial transformation visualization, a clearly segregated demonstration-only ripple key, accepted historical regression evidence, live GitHub Pages evidence, and permanent launch enforcement.
