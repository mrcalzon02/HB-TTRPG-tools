# HB Foundry Agent Skills

This directory packages repository capabilities and tabletop workflows as portable Agent Skills. Every registered skill shares a single inherited Charles personality layer while preserving its own task instructions, capability requirements, and setting authority.

## Architecture rule

**Mirrored calls, not mirrored logic.** Skills are workflow/adaptation layers. They use the authoritative Foundry capability manifest, operation contracts, API facade, campaign indexes, canonical browser/runtime code, and personality resources. They do not reproduce generator, laboratory, calculator, rules, campaign, or personality algorithms in skill instructions. Reusable tabletop randomness and state logic belongs in one authoritative helper and is referenced by sibling skills instead of being copied across them.

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

Personality is not capability: loading Charles does not grant tools, permissions, credentials, network access, provider access, persistent storage, filesystem access, a random source, runtime compatibility, or evidence that an operation succeeded.

## Charles orchestration

Use `charles-foundry-interface` when the user addresses Charles directly or when a request spans several domains. Charles remains the conversational interface while the smallest relevant set of task skills supplies workflow and capability references. If a selected child skill depends on browser JavaScript, page context, UI state, live hardware, a writable sandbox, or a cryptographic RNG, that dependency still applies.

## Common homebrew tabletop family

The generic system-neutral design family currently includes:

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

## Common tabletop operations family

The system-neutral live-play and state-management family includes:

- `tabletop-dice-rolling` — dice-command recognition and auditable host-cryptographic rolling.
- `tabletop-check-resolution` — checks, saves, attacks, contests, tests, and opposed rolls.
- `random-table-and-oracle-resolution` — random and weighted tables routed through the dice authority.
- `character-sheet-import` — preserve and normalize observed character-sheet data.
- `character-stat-tracking` — current/max stats, resources, conditions, wounds, stress, XP, and arbitrary homebrew meters.
- `party-and-npc-roster-management` — stable entity IDs and group membership/status.
- `encounter-state-and-initiative` — rounds, turns, initiative, participants, conditions, and close-out.
- `inventory-and-resource-tracking` — equipment, consumables, ammunition, currency, charges, cargo, and supplies.
- `campaign-ledger-management` — append-only audit history for campaign-significant state changes.
- `tabletop-sandbox-data-management` — shared system-neutral CSV persistence and Python helper when a writable sandbox exists.

### Dice modes and randomness integrity

The dice skill accepts common case-insensitive notation including `d20`, `2d2`, `4D6`, and `10D100`, with a guaranteed portable range of 1–10 dice and 2–100 sides per die plus integer modifiers.

Two result modes are first-class. **`cumulative`** rolls every die and presents one summed total; any expression modifier applies to the aggregate. **`individual total`** rolls each die independently and reads every result separately in roll order without collapsing them into one displayed sum. Aliases `individual`, `each`, and `per die` resolve to `individual total`. If no mode is supplied, the default is `cumulative` unless an authoritative system skill explicitly defines another default.

Prefer Python `secrets.randbelow` or Web Crypto `crypto.getRandomValues` with rejection sampling. Do not silently fall back to `Math.random()` or a deterministic seeded PRNG while claiming a random roll. Cryptographic host randomness is not the same as an independently attested physical true-random-number generator.

### System-neutral CSV state

When the host exposes a writable sandbox, use a dedicated `ttrpg_state/` directory. In ChatGPT-style sandboxes prefer `/mnt/data/ttrpg_state/` when available. Never claim persistence beyond the lifetime or scope the host actually provides.

The canonical state files are:

- `characters.csv` — stable identity and provenance.
- `character_stats.csv` — long-form `scope/key/value` rows for arbitrary system or homebrew statistics.
- `roster.csv` — group membership, role, status, and location.
- `encounters.csv` — encounter identity, round, turn, scene, and active state.
- `encounter_participants.csv` — initiative, health/resources, conditions, and active state.
- `inventory.csv` — equipment, quantity, item state, location, and notes.
- `campaign_ledger.csv` — append-only audit trail of campaign-significant changes.

Use stable entity IDs; a display name is never the sole key. Preserve imported source files and normalize into working CSVs rather than destructively rewriting character sheets. Re-import is reconciliation, not blind replacement of in-play state.

## Status classes

Skill registry status values use `/api/ai/status-vocabulary.json`. `onboardable`, `runtime-required`, `page-context`, `ui-bound`, and `live-device-context` are static declarations. `runtime-compatible`, `self-test-passed`, `ready`, `incompatible`, and `degraded` are host-observed states and must never be inferred merely from the existence of a skill, personality engram, source file, or helper script.

## Loading skill context

`ai-skill-context-loader.js` is for declarative skill/personality context. `HBFoundrySkillContextLoader.load(name)` returns the selected registered skill document with the canonical Charles engram; `loadMany(names)` loads Charles once and returns multiple task skills beneath the same personality binding.

`ai-skill-loader.js` remains a separate executable-package proof loader. It validates registered browser-JavaScript companion packages, loads only allow-listed same-origin runtime scripts, and runs declared deterministic self-tests. Do not confuse personality/skill context loading with executable runtime readiness. Likewise, a tabletop skill's helper path does not prove the consuming host has Python, Web Crypto, writable file access, or successful persistence.

## Adding a skill

Create `skills/<skill-name>/SKILL.md`, keep the frontmatter name identical to the parent directory, add the skill to `skills/index.json`, associate it with stable capability/resource IDs or explicit host execution requirements, and set its personality policy to inherit the registry default. Add/update the HTML compatibility projection when model-browser access matters. Prefer concise workflow instructions and link back to self-describing contracts or shared helper scripts instead of copying long schemas, algorithms, or Charles's personality definition into the skill.
