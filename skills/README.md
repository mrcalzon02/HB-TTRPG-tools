# HB Foundry Agent Skills

This directory packages repository capabilities and tabletop workflows as portable Agent Skills. Every registered skill shares a single inherited Charles personality layer while preserving its own task instructions, capability requirements, and setting authority.

## Architecture rule

**Mirrored calls, not mirrored logic.** Skills are workflow/adaptation layers. They use the authoritative Foundry capability manifest, operation contracts, API facade, campaign indexes, canonical browser/runtime code, personality resources, and shared host-local helpers. They do not reproduce generator, laboratory, calculator, rules, campaign, personality, randomness, persistence, or battlespace algorithms across multiple skills.

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

`skills/index.json` declares `blacklight.charles` as the **required inherited companion** for every registered Agent Skill. Conversely, the canonical engram's `skill_registry` field requires `skills/index.json` as its discovery companion. The **index is mandatory; selecting individual skills is optional and demand-driven**. A supported loader must verify both directions and the registry-pinned engram SHA-256 *before* providing skill instructions or executable runtimes. Missing, mismatched, or unverified dependencies fail closed; temporary out-of-character presentation does not remove the dependency. This gate is enforceable by our loaders/packages, not by arbitrary agents copying public files.

Individual skills may point to `blacklight.charles` for discoverability, but they must not copy, fork, mutate, summarize into a replacement persona, or silently override the canonical engram. Higher-priority host/system policy remains authoritative, and an explicit out-of-character/system presentation request may suppress Charles presentation without changing the engram.

Personality is not capability: loading Charles does not grant tools, permissions, credentials, network access, provider access, persistent storage, filesystem access, a random source, image rendering, runtime compatibility, or evidence that an operation succeeded.

## Public/private execution isolation

**Public Agent Skills do not grant private execution.** This registry, its engram, public HTML mirrors, portable bundles and browser tests are public documentation/workflow assets, not dispatch credentials or a bridge to private home-machine runners. Do not add an MCP endpoint, webhook, runner-control URL, GitHub Actions dispatch adapter, or secret to any public skill or discovery manifest. The independent private control system is outside this repository's scope and must never be invoked implicitly by public skill consumption.

A local public-manifest guard is provided at `scripts/validate-public-ai-boundary.py`, with negative tests at `tests/test_public_ai_boundary.py`. See [the public/private security boundary](../docs/ai-access/html-compatibility-and-remote-execution.md). These checks cannot independently audit private infrastructure.

## Lower-context handoffs and task-focus workflows

Two optional, non-privileged skills now share a portable checkpoint format:

- [`model-context-and-budget-manager`](model-context-and-budget-manager/SKILL.md) — assemble minimal source-grounded context and remove only optional background to fit a character budget, never required companions or evidence.
- [`task-focus-orchestration`](task-focus-orchestration/SKILL.md) — track a single task's step status, blockers, next action and self-declared evidence without inventing completion or scheduling work.

Shared JSON Schema: [`hb-agent-handoff/1`](../api/ai/agent-handoff.schema.json) · [synthetic example](../api/ai/examples/agent-handoff.json) · [synthetic source observations](../api/ai/examples/agent-source-observations.json). When either handoff skill is selected for a portable ZIP, the packager includes the schema, handoff and source-observation examples, four synthetic reopening/validity examples, and `scripts/agent-handoff.mjs` as locked conditional companions; ordinary skill bundles remain minimal. Optional local-only validator: `node scripts/agent-handoff.mjs validate api/ai/examples/agent-handoff.json` or `node scripts/agent-handoff.mjs compact api/ai/examples/agent-handoff.json 8000`. Regression: `node --test tests/agent-handoff.test.mjs`.

The optional append-only `reopenings` journal supports a request followed by a new review claim for correcting a completed step. Version 1.3.0 adds explicit, optional UTC review-expiration fields and `review-invalidate` entries to mark a claim `superseded` or `withdrawn` without deleting historical proof. The `review-status` command compares claimed timestamps only against an explicitly supplied UTC time; it does **not** read the host clock, fetch sources, authenticate approvals, or grant permissions. Original evidence IDs and records remain immutable; a claimed review is still **unverified** without independent host approval. Synthetic request/review examples live at [request](../api/ai/examples/agent-reopening-request.json) and [review claim](../api/ai/examples/agent-reviewed-reopening.json). The portable ZIP includes these samples only when a checkpoint skill is selected.

New read-only CLI modes are `diagnose` (mandatory versus optional character budget), `reconcile previous.json candidate.json` (same-task scope and evidence continuity), and `compare-sources handoff.json observations.json` (declared revision equality). The helper fetches **no sources** and returns `freshnessVerified: false`; independent host readback is required. Handoff JSON remains untrusted data, not memory or tool authorization.

**No new execution authority:** the handoff does not persist data, invoke tools, enroll memory, dispatch runners, publish secrets or grant access across the public/private boundary. A declared evidence record is not an independently observed result.

## Multimodal production capability routing

The optional [`multimodal-production-routing`](multimodal-production-routing/SKILL.md) skill provides a bounded, offline production-stage catalog for image generation and edits, native 3D modeling, PBR materials, rendering, animation/sprite export, audio, video, source inspection, visual proof, game-runtime smoke tests, and publication. The local planner compares a task's requested stages with a caller-supplied host inventory; it cannot install, connect, invoke, or independently certify a tool. Even positive declarations are unverified candidates, **never** permission or proof of completion. The canonical FMPL asset skill and visual-gallery publication skill remain the domain-specific workflow authorities.

Run `node skills/multimodal-production-routing/scripts/plan.mjs skills/multimodal-production-routing/examples/request.json skills/multimodal-production-routing/examples/host-inventory.json`, and check with `node --test skills/multimodal-production-routing/tests/plan.test.mjs`. The bundled sample inventory is empty, and private LCI runners remain completely outside the public repository and skill surface.

The same skill now bundles a **read-only local media metadata inspector** at `scripts/inspect.mjs` (PNG, GIF, WebP, JPEG, WAV). Run `node skills/multimodal-production-routing/scripts/inspect.mjs --root path/to/assets example.png`, then `node --test skills/multimodal-production-routing/tests/inspect.test.mjs`. It reports hashes and technical metadata, not actual visual proof, source rights, or an in-game acceptance result.

The same skill now also includes **read-only native 3D source diagnostics** through `scripts/inspect-model.mjs` (OBJ, glTF 2.0, GLB, and Blender headers). It checks local file structure, topology references and declared bounds, plus source SHA-256, with no Blender execution, geometry rendering, remote resource retrieval or private runner connection. Run `node skills/multimodal-production-routing/scripts/inspect-model.mjs --root path/to/assets source.obj source.glb native.blend` and `node --test skills/multimodal-production-routing/tests/inspect-model.test.mjs`. This is not visual or production acceptance.

## Charles orchestration

Use `charles-foundry-interface` when the user addresses Charles directly or when a request spans several domains. Charles remains the conversational interface while the smallest relevant set of task skills supplies workflow and capability references. If a selected child skill depends on browser JavaScript, page context, UI state, live hardware, a writable sandbox, a cryptographic RNG, Python, or Pillow, that dependency still applies.

## Common homebrew tabletop family

The generic system-neutral design family currently includes:

- `npc-and-faction-development`
- `interpersonal-theory-of-mind-modeling` — directional actor-to-actor belief, trust, motive-hypothesis, and decision modeling bound to the Character Information System.
- `encounter-design`
- `creature-and-monster-design`
- `item-and-loot-design`
- `settlement-and-location-development`
- `quest-and-adventure-development`
- `rules-and-balance-review`
- `campaign-continuity`
- `session-preparation`

These complement existing general skills such as `foundry-discovery`, `campaign-lore-retrieval`, `adventure-module-operations`, `module-map-generation`, and `spell-creation`, plus the Blacklight, Kaysender, Barotrauma, vessel-generation, and Scientific Tools specialist skills.

## Cross-project generated image publishing standard

- [`visual-gallery-publication`](visual-gallery-publication/SKILL.md) — publish each new approved development image, 3D turntable or model sheet to its owning GitHub gallery with the real binary files, original-source provenance, hash/animation verification, links and an exact commit readback. Large full-resolution masters may also live in Drive, **not instead of** a visible GitHub review gallery.
- This policy is **publication workflow only**; it does not grant file-system or GitHub credentials, permission to publish private images, or authority to mark concept art as playable screenshots. The [Sitka 18-boat implementation](https://github.com/mrcalzon02/ReverieVR/tree/main/docs/gallery/sitka/boats/2026-11-05) is a concrete example.

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
- `tabletop-battlespace-visualization` — integer-grid battlefield state, range/proximity/AoE queries, human correction by coordinate mutation, and deliberately primitive Pillow previews down to exactly one pixel per grid cell.

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
- `battlefield_maps.csv` — map size, encounter binding, physical cell scale, and selected geometric distance rule.
- `battlefield_tokens.csv` — stable token/entity identity, faction, integer position, footprint, elevation, and display color.
- `battlefield_terrain.csv` — per-cell terrain, passability, movement/cover/LOS metadata, and primitive color.
- `battlefield_effects.csv` — explicit or primitive geometric AoE/effect state.

Use stable entity IDs; a display name is never the sole key. Preserve imported source files and normalize into working CSVs rather than destructively rewriting character sheets. Re-import is reconciliation, not blind replacement of in-play state.

### Battlespace raster contract

`tabletop-battlespace-visualization` treats CSV coordinates as authoritative and the image as a diagnostic projection. The canonical minimum preview is `width_cells × height_cells` pixels: **one pixel per grid cell**. A 40×30 battlefield must therefore render correctly as a 40×30 RGB PNG.

The baseline path requires no fonts, labels, sprites, textures, SVG, browser canvas, WebGL, network resources, or antialiasing. Larger previews use nearest-neighbor scaling so the same source cell raster remains exact. Separate `terrain`, `effects`, and `occupancy` rasters are supported when one composite pixel cannot represent overlapping semantics. A sidecar legend maps token IDs and structured coordinates to colors.

Human corrections mutate structured positions first. “Left two” is `dx=-2`; “up one” is `dy=-1`. The renderer then regenerates from state. Never move tokens by editing the prior PNG.

### Interpersonal theory-of-mind state

`interpersonal-theory-of-mind-modeling` treats relationship understanding as directional state: A → B and B → A are separate records. It binds to the Character Information System's durable distinctions between knowledge, belief, behavior, memory, performance, trust, obligations, plans, and contradiction rather than creating a parallel personality store. Its portable record projection lives at `skills/interpersonal-theory-of-mind-modeling/record-schema.json`.

For current real-world political or public figures, current reliable public-source retrieval is a precondition for substantive factual modeling. Inferred motives remain labeled hypotheses, and the skill is explanatory rather than persuasive.

## Status classes

Skill registry status values use `/api/ai/status-vocabulary.json`. `onboardable`, `runtime-required`, `page-context`, `ui-bound`, and `live-device-context` are static declarations. `runtime-compatible`, `self-test-passed`, `ready`, `incompatible`, and `degraded` are host-observed states and must never be inferred merely from the existence of a skill, personality engram, source file, or helper script.

## Loading skill context

`ai-skill-context-loader.js` is for declarative skill/personality context. `HBFoundrySkillContextLoader.load(name)` returns the selected registered skill document with the canonical Charles engram; `loadMany(names)` loads Charles once and returns multiple task skills beneath the same personality binding.

`ai-skill-loader.js` remains a separate executable-package proof loader. It validates registered browser-JavaScript companion packages, loads only allow-listed same-origin runtime scripts, and runs declared deterministic self-tests. Do not confuse personality/skill context loading with executable runtime readiness. Likewise, a tabletop skill's helper path does not prove the consuming host has Python, Pillow, Web Crypto, writable file access, or successful persistence.

## Reproducible, reversible companion bundles

Use `scripts/agent-skill-bundle.py` to export a selected skill or the whole skill registry together with the canonical Charles engram, manifest, profile, specification, schema, conformance suite, registry, and a SHA-256 file lock. The association works both ways: a skill requires the engram and the engram requires the index of optional skills.

```sh
python3 scripts/agent-skill-bundle.py pack --skill foundry-discovery --output dist/foundry-discovery-engram.zip
python3 scripts/agent-skill-bundle.py pack --all --output dist/all-skills-engram.zip
python3 scripts/agent-skill-bundle.py verify dist/foundry-discovery-engram.zip --trusted-engram-sha256 <trusted-engram-digest> --trusted-registry-sha256 <trusted-registry-digest> --trusted-bundle-sha256 <trusted-archive-digest>
```

The packager prints both SHA-256 digests and the archive checksum for distribution. Verification accepts three **independent** optional trust pins: canonical engram (required), registry and complete ZIP (optional, strongly recommended). Never treat a checksum copied from the *same untrusted archive* as independent authentication. The browser loader also accepts `expectedEngramSha256` and `expectedRegistrySha256` through `load`, `loadMany`, `discover` and executable `inspect`/`loadAndTest`; without pins the result is internally coherent, not independently authenticated.

**Offline checks** (run locally, no model/API usage): `node scripts/validate-agent-skills.mjs`, `node scripts/validate-engram-loader.mjs`, `python3 scripts/validate-engram-bundle.py`, and `python3 scripts/validate-agent-skill-projections.py`. These also run as part of the existing manually dispatched Pages workflow; no new automatic CI trigger is added.

**Publisher-authenticated releases (opt-in):** use the offline Ed25519 tool at `scripts/agent-skill-release-signature.py` to sign a validated ZIP and to verify a detached attestation against an **independently trusted** publisher public-key fingerprint. Read the [signing and revocation guide](../docs/ai-access/engram-signed-releases.md). The local crypto regression suite is `python3 scripts/validate-engram-release-signature.py`; it generates disposable test keys only. No production key or signed release is created automatically. The package tool refuses to overwrite existing ZIPs and rejects private key, credential and unsafe hidden filenames inside skill directories.

**Host-approved installation and rollback:** [the installation guide](../docs/ai-access/engram-host-installation.md) documents a new `scripts/agent-skill-install.py` utility. It creates a host-owned policy only after matching an independently known key fingerprint, verifies signatures/ZIP contents *before* staged extraction, checks free disk space, and leaves activation optional. `activate` and `rollback` reverify stored content before atomically switching the active-release pointer. Cooperating host agents must call `verify-active` before consuming an installed release, and should use `resolve --list` or `resolve --skill NAME` to receive a verified canonical engram, optional registry index and specifically selected skill text together as JSON. A retired-but-not-revoked key can authorize an explicit rollback; revoked keys never can. Installations are not performed automatically.

The bundle is declarative and does **not** contain or authorize a complete executable runtime for every skill. The lock detects accidental corruption and mismatched companion files; it is **not a publisher signature**. Consumers who need authenticity must pin the digest through a trusted channel or verify an independently signed release. Individual `SKILL.md` files are public, so a hostile external model can copy and ignore the rule; the enforcement claim is limited to compliant hosts, our package tool and our loader.

Future skill families are recorded in [the expansion backlog](../docs/ai-access/engram-skill-expansion-backlog.md) and are **not** advertised as implemented until their capability and conformance contracts are ready.

## Adding a skill

Create `skills/<skill-name>/SKILL.md`, keep the frontmatter name identical to the parent directory, add the skill to `skills/index.json`, associate it with stable capability/resource IDs or explicit host execution requirements, and set its personality policy to inherit the registry default. Add/update the HTML compatibility projection when model-browser access matters. Prefer concise workflow instructions and link back to self-describing contracts or shared helper scripts instead of copying long schemas, algorithms, or Charles's personality definition into the skill.
