# Provenance — Procedural Story Directive Computation

This directory defines the **Procedural Assembly Story Directive Computation** Agent Skill for Calzon's TTRPG Foundry.

## Authority

- Repository: `mrcalzon02/HB-TTRPG-tools`
- Skill ID: `procedural-story-directive-computation`
- Maintainer: `mrcalzon02`
- Initial version: `1.0.0`
- Initial integration date: 2026-09-22
- Personality binding: inherited repository default `blacklight.charles`

## Design intent

The skill exists to turn continuing-story work into a repeatable computation problem rather than unconstrained continuation. Its core responsibility is to reconcile controlling instructions, canon, continuity, character epistemics, unresolved obligations, prerequisites, and narrative scope before selecting the next dependency-valid story beats.

The core algorithm is intentionally runtime-independent and self-contained. Machine-readable companion files expose its input/output contract and pipeline, but `SKILL.md` contains the complete human-readable behavior required to implement the compiler.

## Authorship

Developed from direct human design requirements supplied by mrcalzon02, with AI-assisted specification drafting, normalization, schema construction, repository integration, and validation performed using OpenAI ChatGPT and GitHub tooling.

## Governing terms

Use is governed by the repository root `TERMS-OF-SERVICE.md`, including Section 3, “Permitted Use (the Anti-License).” Keep the provenance notice in `SKILL.md` with redistributed private copies of the skill.
