# HB Foundry Agent Skills

This directory packages repository capabilities and tabletop workflows as portable Agent Skills. Every registered skill shares a single inherited Charles personality layer while preserving its own task instructions, capability requirements, and setting authority.

## Architecture rule

**Mirrored calls, not mirrored logic.** Skills are workflow/adaptation layers. They use the authoritative Foundry capability manifest, operation contracts, API facade, campaign indexes, canonical browser/runtime code, and personality resources. They do not reproduce generator, laboratory, calculator, rules, campaign, or personality algorithms in skill instructions.

Canonical discovery surfaces:

- `/skills/index.json` — authoritative Agent Skills registry and `defaultPersonality` binding.
- `/docs/blacklight/charles-personality-engram.json` — authoritative compact Charles CE1.1 personality engram.
- `/docs/blacklight/charles-personality-engram-manifest.json` — Charles engram discovery manifest.
- `/skills/charles-foundry-interface/SKILL.md` — cross-skill Charles orchestration workflow.
- `/ai-skill-context-loader.js` — same-origin helper that loads Charles once with one or more selected skill documents.
- `/api/ai/status-vocabulary.json` — shared availability and host-execution status meanings.
- `/api/foundry-capabilities.json` — capability identity, runtime, status, and invocation.
- `/api/operation-contracts.json` — exact operation argument and return contracts.
- `/api/resource-collections.json` — indexed campaign/lore/resource retrieval contracts.
- `/foundry-api.js` — same-origin discovery/invocation facade.
- `/llms.txt` — lightweight agent discovery entrypoint.

## Shared Charles personality

`skills/index.json` declares `blacklight.charles` as the inherited default personality for **all registered Agent Skills**. A consuming host should load `docs/blacklight/charles-personality-engram.json` once for the current orchestration context, then load whichever task skills are needed beneath that personality layer.

Individual skills may point to `blacklight.charles` for discoverability, but they must not copy, fork, mutate, summarize into a replacement persona, or silently override the canonical engram. Higher-priority host/system policy remains authoritative, and an explicit out-of-character/system presentation request may suppress Charles presentation without changing the engram.

Personality is not capability: loading Charles does not grant tools, permissions, credentials, network access, provider access, persistent storage, runtime compatibility, or evidence that an operation succeeded.

## Charles orchestration

Use `charles-foundry-interface` when the user addresses Charles directly or when a request spans several domains. Charles remains the conversational interface while the smallest relevant set of task skills supplies workflow and capability references. If a selected child skill depends on browser JavaScript, page context, UI state, or live hardware, that dependency still applies.

## Common homebrew tabletop family

The generic system-neutral family currently includes:

- `npc-and-faction-development`
- `encounter-design`
- `creature-and-monster-design`
- `item-and-loot-design`
- `settlement-and-location-development`
- `quest-and-adventure-development`
- `rules-and-balance-review`
- `campaign-continuity`
- `session-preparation`

These complement existing general skills such as `foundry-discovery`, `campaign-lore-retrieval`, `adventure-module-operations`, `module-map-generation`, and `spell-creation`, plus the Blacklight, Kaysender, Barotrauma, vessel-generation, and Scientific Tools specialist skills.

## Status classes

Skill registry status values use `/api/ai/status-vocabulary.json`. `onboardable`, `runtime-required`, `page-context`, `ui-bound`, and `live-device-context` are static declarations. `runtime-compatible`, `self-test-passed`, `ready`, `incompatible`, and `degraded` are host-observed states and must never be inferred merely from the existence of a skill, personality engram, or source file.

## Loading skill context

`ai-skill-context-loader.js` is for declarative skill/personality context. `HBFoundrySkillContextLoader.load(name)` returns the selected registered skill document with the canonical Charles engram; `loadMany(names)` loads Charles once and returns multiple task skills beneath the same personality binding.

`ai-skill-loader.js` remains a separate executable-package proof loader. It validates registered browser-JavaScript companion packages, loads only allow-listed same-origin runtime scripts, and runs declared deterministic self-tests. Do not confuse personality/skill context loading with executable runtime readiness.

## Adding a skill

Create `skills/<skill-name>/SKILL.md`, keep the frontmatter name identical to the parent directory, add the skill to `skills/index.json`, associate it with stable capability/resource IDs, and set its personality policy to inherit the registry default. Add/update the HTML compatibility projection when model-browser access matters. Prefer concise workflow instructions and link back to self-describing contracts instead of copying long schemas or Charles's personality definition into the skill.
