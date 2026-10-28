---
name: environment-production
description: Develop and review authored 3D maps and their supporting models through terrain, architecture, functional integration, visual refinement, story dressing, and evidence-based acceptance. Use for iterative environment production or migration of its workflow between local, web, and CI hosts.
compatibility: Documents are remotely readable; evidence tools require Python 3.10+ and writable storage. Rendering and gameplay checks require target-engine adapters.
metadata:
  version: 1.0.0
---

# Iterative environment production

Use this workflow to advance an existing environment from its current verified stage. Preserve accepted work; do not regenerate a map merely because a new session starts. The portable package is an evidence and production protocol, not a replacement game engine or procedural map generator.

1. Read the project's instructions, latest handoff, current map packet and open defects. Inspect branch, HEAD and uncommitted work. Agree on one concrete milestone within the user's scope; audit existing terrain before adding structures.
2. Read [the production guide](references/WORKFLOW.md) for stage gates and [standards and mathematics](references/STANDARDS.md) for geometry, support, lighting and capture contracts. Use project-specific tolerances and gameplay rules rather than importing Beckenburg constants blindly.
3. Build or refine the smallest useful batch. Follow dependency invalidation: terrain changes reopen support/routes; model bounds reopen collision and placement; lighting changes reopen material and blackout reviews. Record new defects immediately and identify older-map audit obligations.
4. Verify actual exported geometry, runtime integration and appropriate gameplay paths. Capture overhead and human-height views, plus close-ups of the changed details. Include negative and positive controls where a fix could hide the entire effect. Tests and attractive stills have separate scopes.
5. Read [host adapters and evidence format](references/PORTABILITY.md) to use `scripts/production.py`. Initialize a packet, attach real artifacts and reviews, and validate it. Never relabel native previews as runtime, offline rendering as measured FPS, or automated checks as human acceptance.
6. Publish source, exports, captures, report and a resumable handoff together when authorized. Verify remote commit and deployed artifact hashes separately. Preserve unresolved gates explicitly.

Read [worked examples](references/CASE_STUDIES.md) when diagnosing recurring errors or explaining why these standards exist. [Provenance](PROVENANCE.md) identifies the pinned source, original review reports and governing terms.

## Host boundaries

- Reading these documents requires ordinary file or HTTP access. Python 3.10+ with a writable sandbox runs the evidence helper without third-party dependencies.
- Blender, renderer, physics, networking, audio and hardware tests remain project adapters. The helper checks the supplied evidence record; it cannot independently prove the recorded observation occurred.
- Static GitHub Pages provides discovery and downloads. It does not execute Python, edit a repository or render a game for a remote model. Use an authorized sandbox, CI runner or local host for those operations.
- In the Foundry inherit the registry's `blacklight.charles` presentation policy. No personality or skill grants tools, credentials or publication permission. The standalone production method does not depend on that persona.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance and use

Origin: Calzon's TTRPG Foundry, maintained by mrcalzon02; distilled from The Beckenburg Project under human creative direction with OpenAI ChatGPT-assisted implementation and review. Keep [PROVENANCE.md](PROVENANCE.md) and the bundled [terms](TERMS-OF-SERVICE.md) with redistributed packages. Existing Foundry terms apply; this package does not relicense the game, purchased models, external references or third-party modules.
