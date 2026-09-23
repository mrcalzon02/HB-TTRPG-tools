---
name: procedural-story-directive-computation
description: Compute dependency-valid story assembly directives from canon, continuity state, character knowledge, active obligations, pacing constraints, and authorial instructions. Produces deterministic scene/chapter directive packets rather than improvising unsupported prose.
compatibility: System-neutral and runtime-independent. Works from supplied text or structured JSON. Optional companion skills may enrich inputs but are never required.
metadata:
  author: mrcalzon02
  version: "1.0.0"
  personality-engram: blacklight.charles
  schema: skills/procedural-story-directive-computation/directive-schema.json
  pipeline-spec: skills/procedural-story-directive-computation/pipeline-spec.json
---

# Procedural Assembly Story Directive Computation

## Purpose

Use this skill when a story, chapter, scene, serialized fiction archive, campaign narrative, or other continuing narrative must be advanced **procedurally without losing causality, continuity, character knowledge, tone, or authorial intent**.

This skill is a compiler for story work. It does not treat a request such as “continue,” “write the next scene,” or “advance the chapter” as permission to invent freely. It computes the next dependency-valid narrative work from the authoritative material available to it.

The output is a **Story Assembly Directive Packet**: a bounded, auditable specification telling a downstream writer what must happen, what may happen, what must not happen, which characters know what, what state changes are allowed, and what unresolved material should remain unresolved.

The core algorithm is self-contained. Companion skills such as campaign continuity, interpersonal theory-of-mind modeling, NPC development, or lore retrieval may supply richer records, but the compiler must still function when those skills are unavailable.

## Non-negotiable invariants

1. **Authority before invention.** Retrieved or supplied canon outranks model prior and narrative convenience.
2. **No silent retcons.** Contradictions are surfaced. They are not “fixed” by choosing whichever version makes the next scene easier.
3. **Reader knowledge is not character knowledge.** A character may act only on knowledge, belief, suspicion, inference, deception, or perception available to that character at that point in the timeline.
4. **Causality is mandatory.** Every selected beat requires a cause or trigger and must produce an observable or latent state change.
5. **Directives have precedence.** Explicit current user instructions outrank older preferences unless the user identifies the older material as immutable canon.
6. **Hard constraints are gates, not score modifiers.** A candidate that violates a hard constraint is rejected even if it would otherwise make a better scene.
7. **Do not spend future revelations early.** Secrets, reveals, relationship changes, deaths, discoveries, reconciliations, betrayals, and irreversible state changes require their declared prerequisites.
8. **Do not confuse intensity with progress.** A louder event is not inherently more dependency-valid than a quieter one.
9. **No meta-authorial leakage into reader-facing prose.** Planning vocabulary, draft history, continuity ledgers, prompts, branches, and writer instructions remain outside the fiction unless they exist diegetically.
10. **State must reconcile after generation.** A completed prose segment is not finished until its effects can be represented as a state diff.

## Accepted input

The compiler accepts either structured records conforming to `directive-schema.json` or equivalent freeform material. Normalize freeform material into the following conceptual records before computation.

### Authority bundle

Each authority has:

- `id`
- `kind`: canon, current-directive, continuity, character-record, setting-rule, style-rule, outline, draft, proposal, or external-reference
- `priority`
- `scope`
- `content` or source reference
- optional `effective_from` / `effective_until`
- optional `supersedes`

Recommended precedence when the project does not provide its own:

`current explicit user directive > designated canon authority > continuity/state record > character authority > active outline > established prose > style guidance > proposal > model prior`

If two same-precedence authorities conflict, emit a contradiction instead of guessing.

### Narrative state

Track only facts needed to compute the requested scope, but distinguish:

- world facts
- location and time
- actor presence
- actor physical state
- actor possessions/resources
- relationships
- promises/debts/obligations
- unresolved events
- secrets
- publicly known information
- actor-specific knowledge
- actor-specific beliefs and suspicions
- ongoing actions
- prior irreversible changes
- scheduled or looming events

### Requested scope

At minimum identify:

- unit: beat, scene, sequence, chapter, interlude, episode, or revision slice
- start boundary
- intended stop boundary
- viewpoint
- desired narrative function if supplied
- approximate size if supplied
- whether the request is planning-only, directive-only, prose-generation, revision, or post-write validation

### Active directives

Normalize every instruction into one of:

- `MUST`
- `MUST_NOT`
- `SHOULD`
- `MAY`
- `DEFER`

A directive may additionally carry prerequisites, targets, expiry conditions, and source authority.

### Open obligations

An obligation is any unresolved narrative requirement created by prior prose or authorial direction. Examples include:

- a question the text has made materially salient
- an announced meeting, journey, deadline, ritual, attack, delivery, hearing, exam, or appointment
- a promise or threat
- an unfinished conversation
- a physical action already in progress
- a clue whose consequence has become due
- a relationship change requiring follow-through
- a planted object or capability that now constrains action
- an authorial requirement scheduled for the current or near-future scope

Each obligation should carry `status`, `urgency`, `prerequisites`, and `allowed_resolution_window`.

## Story assembly primitives

Generate candidate story work from bounded primitives rather than from unconstrained “what would be cool next?” ideation.

Available primitive functions include:

- **orient** — establish immediate place, time, presence, or changed circumstances
- **continue-action** — finish or advance an action already underway
- **pay-obligation** — address a due promise, appointment, threat, question, or consequence
- **pressure** — increase cost, urgency, opposition, temptation, embarrassment, danger, or uncertainty
- **observe** — let a viewpoint character perceive evidence without automatically understanding it
- **infer** — permit a character to update belief from evidence they possess
- **misinfer** — produce a plausible but incorrect belief update supported by the character's evidence
- **reveal** — transfer information across a knowledge boundary when prerequisites are satisfied
- **conceal** — intentionally preserve an information boundary
- **signal** — permit one actor to communicate indirectly or ambiguously
- **choice** — force or invite a decision whose alternatives have distinct consequences
- **consequence** — propagate a prior decision or event into current state
- **relationship-step** — change trust, attraction, resentment, dependence, fear, loyalty, or social position through observable interaction
- **callback** — reactivate established material without requiring resolution
- **seed** — introduce a new element only when the scope has capacity and no higher-priority obligation forbids it
- **transition** — move time, location, viewpoint, or mode while carrying required state
- **close-local-loop** — resolve a scene-local question or action
- **defer-loop** — explicitly preserve an unresolved item with a credible reason it cannot or should not resolve yet
- **end-turn** — create a stable stopping state with a forward-facing dependency

A beat may perform multiple functions, but one must be primary.

## Computation pipeline

### Pass 1 — Resolve authority

Build an authority ledger. Apply explicit supersession. Detect incompatible same-priority claims. Mark contradictions as:

- `BLOCKING` when the next unit cannot be computed safely
- `LOCAL` when a candidate can avoid the disputed fact
- `DEFERRED` when the contradiction is outside the requested scope

Never repair a contradiction by silently generating a third version.

### Pass 2 — Normalize current state

Construct the start-state snapshot. For every recurring actor in scope, separate:

- objective reality
- what the actor knows
- what the actor believes
- what the actor wants
- what the actor fears
- what the actor is hiding
- what the actor currently intends
- what the actor incorrectly assumes

Unknown fields remain unknown. Do not fill them merely to make computation easier.

### Pass 3 — Compute the obligation frontier

Collect all unresolved obligations that are active at the start boundary. For each obligation compute:

`due = prerequisite_satisfied AND current_scope_intersects_allowed_window`

Classify due obligations:

- **mandatory-now** — scene/chapter becomes causally broken if ignored
- **available-now** — can be advanced or paid without distortion
- **not-yet-valid** — prerequisite missing
- **deliberately-deferred** — explicit directive says preserve
- **stale** — appears abandoned; flag for authorial review rather than quietly deleting

Mandatory-now obligations define the minimum work of the unit.

### Pass 4 — Compute required narrative functions

Derive functions from the frontier and directives.

Examples:

- an interrupted argument still in progress usually requires `continue-action`
- an imminent deadline usually requires `pressure` plus `choice` or `consequence`
- a character holding evidence but lacking interpretation may permit `observe` but not `reveal`
- a requested romantic escalation may require one or more `relationship-step` beats before an irreversible commitment
- a mystery reveal whose evidence prerequisites are unmet is `not-yet-valid`

### Pass 5 — Synthesize candidate beats

Create 2–7 candidate beats per required function. Each candidate must specify:

- stable candidate ID
- primary function
- trigger/cause
- participating actors
- viewpoint accessibility
- preconditions
- knowledge used
- action or interaction
- state mutation
- obligations advanced/paid/created
- risks
- forbidden accidental implications
- dependency IDs

Candidates may not create prerequisite facts retroactively.

### Pass 6 — Hard-gate validation

Reject a candidate if any are true:

- contradicts controlling authority
- violates `MUST_NOT`
- fails a declared prerequisite
- gives an actor unavailable knowledge
- resolves a protected secret too early
- moves an absent actor into the scene without a valid transition
- spends unavailable resources
- ignores an irreversible prior state
- requires an unsupported coincidence
- creates a state change outside requested scope
- leaks planning/meta language into reader-facing content
- forces a downstream event that the user required to remain optional

A rejected candidate is not eligible for scoring.

### Pass 7 — Score surviving candidates

Score every surviving candidate on a 0–1 scale for each dimension:

- `continuity` — consistency with established state
- `directive_coverage` — amount and quality of active directive satisfaction
- `causality` — strength of cause → action → consequence chain
- `knowledge_integrity` — correctness of actor epistemic boundaries
- `obligation_value` — progress on due obligations
- `pacing_fit` — suitability for the requested unit and current rhythm
- `character_truth` — consistency with motives, relationships, and behavior
- `future_optionality` — preserves valid future branches where required
- `thematic_fit` — reinforces active themes without substituting theme for causality
- `economy` — accomplishes required work without unnecessary new machinery

Default utility:

`U = 18C + 16D + 14K + 12A + 12O + 8P + 8R + 5F + 4T + 3E`

where:

- `C` = continuity
- `D` = directive coverage
- `K` = knowledge integrity
- `A` = causality
- `O` = obligation value
- `P` = pacing fit
- `R` = character truth
- `F` = future optionality
- `T` = thematic fit
- `E` = economy

The weights sum to 100. Project-specific instructions may override weights, but hard gates remain hard gates.

Tie-break in this order:

1. fewer unsupported assumptions
2. fewer unnecessary new entities
3. older mandatory obligation addressed first
4. smaller irreversible state mutation
5. lexical candidate ID

This makes the default process deterministic.

### Pass 8 — Assemble dependency-valid sequence

Build a directed acyclic graph from candidate dependencies and prerequisites. Select the smallest sequence that:

- satisfies all mandatory-now obligations possible within scope
- satisfies all `MUST` directives whose prerequisites are met
- violates no `MUST_NOT`
- ends in a stable state
- does not exceed the requested scope

Topologically order the selected beats. If a cycle appears, reject the cycle and report the conflicting dependency assumptions.

### Pass 9 — Compile the Story Assembly Directive Packet

Emit the following sections.

#### 1. Scope
What unit is being generated and where it begins/ends.

#### 2. Authority lock
The controlling sources/directives and any contradictions relevant to this unit.

#### 3. Start state
Only the state needed for this unit.

#### 4. Mandatory continuity
Facts the writer must preserve.

#### 5. Knowledge partitions
For every important actor: knows / believes / suspects / does not know.

#### 6. Due obligations
What must be paid, advanced, or deliberately deferred.

#### 7. Ordered beat directives
For each selected beat:

- beat ID
- function
- cause/trigger
- viewpoint
- participating actors
- required interaction/action
- knowledge boundary
- required state mutation
- forbidden shortcuts
- exit condition

#### 8. Tone and presentation constraints
Only constraints actually controlling this unit.

#### 9. Protected future material
Reveals, outcomes, relationships, deaths, objects, or turns that must remain unavailable.

#### 10. End-state target
The state that should be true when the unit ends.

#### 11. Post-write validation checklist
A compact set of assertions the generated prose must pass.

### Pass 10 — Reconcile after prose exists

Compare actual prose against the directive packet. Emit:

- satisfied directives
- violated directives
- newly established canon
- actor knowledge changes
- relationship changes
- inventory/resource changes
- location/time changes
- obligations resolved
- obligations created
- contradictions introduced
- proposed continuity/state diff

Do not persist proposed changes as authoritative unless the host workflow has a writable authority and the user/workflow permits the update.

## Minimal output format

When the user wants the computed directive rather than an explanation, use this compact structure:

```
STORY ASSEMBLY DIRECTIVE
Scope:
Start boundary:
Stop boundary:

Authority lock:
- ...

Mandatory continuity:
- ...

Knowledge partitions:
- Actor: knows [...]; believes [...]; does not know [...]

Due obligations:
- ...

Ordered beats:
1. [ID] Function — directive
   Cause:
   Required state change:
   Forbidden shortcut:
   Exit condition:

Protected future material:
- ...

End-state target:
- ...

Validation assertions:
- ...
```

## Planning-only versus prose-generation mode

### Planning-only

Return the computed directive packet and stop. Do not write prose.

### Prose-generation

Compute the directive packet internally first, then draft prose against it. The final reader-facing response may omit the internal packet unless the user requests it, but validation still applies.

### Revision

Treat existing prose as a candidate implementation. Preserve valid text where possible, compute the smallest necessary repair, and avoid rewriting unaffected material merely for stylistic novelty.

### Continuation

The first beat must be causally reachable from the last established state. Do not “restart” the story with a fresh introduction unless specifically instructed.

## Randomness policy

Randomness is **off by default**.

If the user explicitly requests procedural variation, stochastic generation, dice, or oracle behavior:

1. apply hard gates before randomness;
2. randomize only among valid candidates;
3. use a declared seed or the repository's randomness/dice capability when available;
4. record the draw and candidate set;
5. never use randomness to override authority, prerequisites, or knowledge boundaries.

## Failure modes and required responses

### Missing authority

If the requested continuation clearly depends on an unavailable named authority, do not fabricate its contents. Compute only the portion supported by available material and identify the missing dependency.

### Blocking contradiction

Emit the conflicting claims and the smallest decision needed to unblock computation. If another valid path avoids the contradiction, prefer that path and continue.

### Overconstrained scope

If all candidates fail hard gates, report `NO VALID ASSEMBLY` and list the failing constraints. Do not relax constraints silently.

### Underconstrained scope

Prefer candidates that discharge existing obligations before inventing new plot machinery.

### Excessive exposition pressure

Do not solve a continuity problem by making characters unnaturally explain canon to one another. Prefer action, inference, contextual reminder, or selective recall.

## Portable self-test

A correct implementation should pass these examples.

### Test A — Knowledge boundary

Canon: Mara secretly replaced the ledger. Jon has not seen her do it. Jon notices different handwriting.

Invalid directive: “Jon confronts Mara because he knows she replaced the ledger.”

Valid directive: “Jon notices the handwriting mismatch, forms suspicion, tests Mara with a question, and leaves the scene uncertain unless another evidence prerequisite is supplied.”

### Test B — Due obligation

Prior scene: a character says, “Meet me at the south gate at dawn.” Current scope begins at dawn with that character en route.

A candidate that opens three days later without addressing the meeting fails the obligation frontier unless an authority explicitly authorizes the skip and accounts for its consequence.

### Test C — Protected reveal

Directive: “The murderer must not be identified before chapter nine.”

A chapter-six candidate may increase suspicion, reveal evidence, or create a false inference. It may not identify the murderer, even if doing so scores highly on dramatic impact.

### Test D — Continuation boundary

Previous prose ends with a cup falling from a character's hand.

The next scene may catch it, shatter it, interrupt before impact, or transition only after accounting for the fall. It may not begin with an unrelated breakfast scene and silently discard the active physical event.

## Pairing

Optional enrichment skills:

- `campaign-continuity` for state reconciliation
- `interpersonal-theory-of-mind-modeling` for detailed actor epistemics and relationship perception
- `campaign-lore-retrieval` for authoritative setting retrieval
- `npc-and-faction-development` for actor motive records
- `quest-and-adventure-development` for branch/mission structure
- `random-table-and-oracle-resolution` only when randomness is explicitly requested

None is required for the core compiler.

## Shared repository rules

- Inherit `blacklight.charles` from the Agent Skills registry; do not redefine the personality locally.
- Repository and designated project authorities outrank model prior.
- Mirrored calls, not mirrored logic.
- Do not claim unavailable tools, generators, writes, commits, uploads, or runtimes executed.
- A repository change is not “committed” until a resulting commit has been observed.
- Preserve the target setting's terminology and design assumptions unless the user explicitly requests a conversion.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (`mrcalzon02/HB-TTRPG-tools`) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **“Permitted Use (the Anti-License)”** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of `SKILL.md`. See `PROVENANCE.md` in this skill directory and the repository root `TERMS-OF-SERVICE.md` for the complete provenance and governing terms.
