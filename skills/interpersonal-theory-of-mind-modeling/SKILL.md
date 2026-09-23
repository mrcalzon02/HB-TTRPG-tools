---
name: interpersonal-theory-of-mind-modeling
description: Model how one actor understands another actor over time using evidence-bounded beliefs, trust, goals, constraints, competing hypotheses, and update history without collapsing inference into fact.
compatibility: System-neutral reasoning and continuity skill. For current real-world political or public figures, the host must retrieve current reliable public sources before making substantive factual claims.
metadata:
  author: mrcalzon02
  version: "1.1.0"
  foundry-capability: foundry.site-index
  personality-engram: blacklight.charles
---

# Interpersonal Theory of Mind Modeling

Use this skill when a task depends on what one actor believes, suspects, expects, misunderstands, trusts, fears, or predicts about another actor rather than only on objective biography.

A theory-of-mind record is directional, temporal, contextual, and revisable:

**Actor A's model of Actor B is not Actor B's objective character record, and it is not Actor B's model of Actor A.**

## Core authority rule

Preserve these distinctions at all times:

- fact is not inference or hypothesis;
- knowledge is not belief or behavior;
- skill is not pressure performance or aftermath;
- public statement is not private belief;
- stated goal is not inferred goal;
- relationship is not trust;
- trust is not affection;
- prediction is not certainty;
- contradiction may be characterization rather than an error.

Never convert an analyst inference into a character fact merely because it explains events elegantly.

## Character Information System binding

This skill extends the existing Character Information System rather than creating a parallel personality database.

Map theory-of-mind evidence into the existing long-memory dimensions where they exist:

- **Persistent identity** — stable actor identity and role.
- **Important memories/events** — encounters and events that could reasonably shape the model-holder's view of the target.
- **Active plans/goals** — distinguish documented goals from the model-holder's perception of those goals.
- **Skills/knowledge** — what the model-holder knows or reasonably believes the target can do.
- **Secrets/warnings** — unresolved risks, hidden-information hypotheses, and explicit uncertainty; never promote an unsourced secret into fact.
- **Relationships/trust** — directional trust, reliance, suspicion, affection, resentment, fear, obligation, and expected reciprocity.
- **Temperament/performance** — observed behavior under ordinary conditions, stress, public pressure, private pressure where canonically known, and aftermath.
- **Obligations/leverage** — constraints the model-holder believes bind the target.
- **Attraction/intimacy** — use only where canonically established and relevant; never infer private sexual or romantic information about real people from weak signals.
- **Touch/event log** — append meaningful evidence and model revisions rather than overwriting prior state.

The Character Information System remains the durable state authority. This skill governs how theory-of-mind state is derived, updated, compared, and used.

## Directional record

Each durable record should identify:

1. **Model holder** — whose internal model is represented.
2. **Target actor** — who the model holder is trying to understand.
3. **Context** — relationship, institution, conflict, negotiation, era, campaign state, or decision domain.
4. **Information boundary** — what the model holder could reasonably know at that time.
5. **Beliefs and assumptions** — what the model holder currently thinks is true.
6. **Perceived goals and priorities** — what the model holder thinks the target wants.
7. **Perceived constraints** — what the model holder thinks limits or pressures the target.
8. **Trust model** — what the model holder expects the target to do reliably, unreliably, conditionally, or never.
9. **Emotional/social posture** — only where evidence supports it.
10. **Expected behavior** — conditional expectations, not destiny.
11. **Competing hypotheses** — plausible alternatives when motive or belief is unsettled.
12. **Evidence ledger** — observations, statements, events, reports, dates, and provenance.
13. **Confidence and uncertainty** — calibrated per claim.
14. **Contradictions and disconfirming evidence** — preserved rather than erased.
15. **Last update / trigger** — what new evidence caused the model to change.

The portable machine projection is defined by record-schema.json. It does not replace the authoritative Character Information System.

## Agentic workflow

### 1. Resolve direction

Always state the relationship as:

**MODEL HOLDER → TARGET ACTOR**

Do not merge reciprocal models. A → B and B → A are separate records.

### 2. Load durable character state first

Retrieve the Character Information System record, continuity catalog, Dramatis Personae entry, campaign ledger, biography, or equivalent authoritative source for both actors before generating theory-of-mind state.

For fictional settings, repository and campaign canon outrank model prior.

For real-world public figures, retrieve current reliable public sources before substantive factual modeling.

### 3. Establish the information boundary

Classify information available to the model holder as:

- directly observed;
- directly told;
- institutionally available;
- reported by trusted intermediaries;
- rumor;
- analyst-only knowledge;
- unknown.

Reader or analyst knowledge must not leak into the actor model.

### 4. Build evidence before motive

Extract observable evidence first: statements, decisions, orders, votes, alliances, refusals, negotiations, repeated behavior, institutional incentives, material constraints, relationship history, prior promises and betrayals, responses under pressure, and outcomes that could update expectations.

Only after the evidence ledger exists should the skill infer what the model holder may believe.

### 5. Maintain competing hypotheses

When motive or belief is not established, keep more than one plausible explanation alive. Attach supporting and disconfirming evidence to each hypothesis. Do not collapse to one explanation simply because it is narratively satisfying.

### 6. Model trust by domain

Trust is not one scalar. An actor may trust another to keep a secret, honor a bargain, obey doctrine, protect family, pursue self-interest, remain predictable under pressure, tell the truth privately, perform competently, avoid humiliation, or retaliate when crossed.

Record the domain. "A trusts B" is usually too coarse.

### 7. Generate conditional expectations

Prefer:

"Given A's current information, A would expect B to resist this proposal if it threatens constituency C."

over:

"B will resist the proposal."

The first is a theory-of-mind statement. The second incorrectly converts the model into objective prediction.

### 8. Update after new evidence

When a new event occurs:

1. append it to the evidence/touch log;
2. identify which prior beliefs it supports, weakens, or leaves unchanged;
3. revise claim-level confidence;
4. preserve prior state where durable history matters;
5. update expected behavior only where warranted;
6. record contradictions rather than smoothing them away.

### 9. Reconstruct decisions from inside the model

When analyzing an action, reconstruct what the actor knew, believed, thought the other person wanted, feared, was obligated to do, and believed their alternatives were.

Then distinguish why the action made sense inside the actor's model from whether that model was objectively accurate.

## Deterministic IToM processing pipeline

Use this pipeline when the user supplies transcripts, messages, correspondence, dialogue, narrative interaction data, or another bounded text dataset and asks for formal interpersonal theory-of-mind analysis.

This mode is deterministic in **processing order and output structure**, not in the sense that uncertain human mental states become objectively measurable. Every internal-state conclusion remains an evidence-bounded approximation with explicit uncertainty.

### Objective and structural role

The pipeline maps external linguistic and behavioral variables against hypothesized internal cognitive states and recursive layers of understanding.

Recursive epistemic modeling may proceed through third order where the text supports it:

- **First order:** A believes X.
- **Second order:** A believes that B believes X.
- **Third order:** A intends for B to believe that A thinks X, or an equivalent three-layer structure.

Do not manufacture deeper levels merely because the framework permits them.

### Framework anchors

#### Dennett — Intentional Stance

Analyze each subject as an actor behaving according to a distinct set of beliefs, desires, information, incentives, constraints, and internal logic.

This is an explanatory stance, not proof that the actor is perfectly rational or that the inferred belief/desire state is objectively true.

#### Fonagy — Mentalization

Assess whether the text supports effective or failed attempts to understand another person's mental state.

Possible failure markers include:

- treating one's inference about another person's motive as direct fact;
- ignoring available evidence about another person's perspective;
- collapsing another person's independent context into one's own;
- refusing to revise a social interpretation after disconfirming evidence;
- reacting to an inferred intention rather than an observable act.

Use **observed mentalization quality** or **possible mentalization failure** language. Do not convert this framework into a clinical diagnosis.

#### Rogers — Congruence

Compare:

- **External State:** surface text, explicit claims, politeness markers, syntax, declared values, stated goals, and observable conduct.
- **Hypothesized Internal State:** evidence-bounded operational goals, fears, incentives, defensive aims, or emotional drivers inferred from the supplied data.

Report **congruence as High / Medium / Low** plus claim confidence.

High means the observed external presentation is substantially consistent with the best-supported internal-state hypothesis. Medium means meaningful ambiguity or mixed signals remain. Low means observable behavior and the best-supported hypothesis diverge substantially.

Do not call the result a mathematical measurement unless a separately defined quantitative scoring model and sufficient data actually exist.

### Systemic manipulation and cognitive-flaw heuristics — TheraminTrees-inspired modalities

These user-selected TheraminTrees-inspired categories are operationalized here as text-analysis heuristics. They are not treated as validated psychiatric constructs, psychiatric diagnoses, or automatic moral verdicts.

#### Concrete vs. abstract rumination

**Concrete/problem-solving processing** stays tied to specific events, testable causes, available actions, bounded questions, and revisable evidence.

**Abstract rumination** repeatedly globalizes the issue into broad, difficult-to-test questions about character, intent, destiny, inherent defect, or permanent meaning without generating new evidence or actionable resolution.

#### Manufactured obligation

Flag possible manufactured obligation when the text uses unsolicited, substitutionary, exaggerated, or strategically reframed acts of help/goodwill to construct an unearned debt, guilt requirement, gratitude obligation, or compliance demand.

Do not flag ordinary reciprocity, negotiated duty, contractual obligation, family responsibility, or genuine gratitude merely because obligation exists.

#### Totalitarian guardrails

Flag possible totalitarian conversational guardrails when a subject imposes absolute rules whose functional effect is to preclude contrary evidence, redefine disagreement as disloyalty or pathology, or protect a fixed narrative from revision.

Do not confuse this with ordinary boundaries, safety rules, moderation, confidentiality, topic limits, or procedural constraints unless the text shows that they are being used to suppress relevant divergent evidence.

#### Imposter morality / sociopathic self-image

Flag this only as a **self-image pattern** when the subject's own words or strongly contextualized behavior support the idea that they interpret their positive traits, empathy, generosity, or morality as merely calculated performance masking an inherently malicious or defective self.

Do not diagnose sociopathy, antisocial personality disorder, psychopathy, or another mental-health condition from this pattern.

### Reasoning-flaw vocabulary

Possible flags include:

- confirmation bias;
- mind-reading;
- splitting / all-or-nothing social categorization;
- projection;
- egocentric bias;
- attribution error;
- motivated reasoning;
- unsupported certainty;
- recursive-assumption failure.

Only flag a reasoning flaw when the input provides a specific textual or behavioral basis. Preserve alternative explanations.

## Three-pass execution

For every IToM data-evaluation payload, execute the following passes in order before formatting the answer:

```text
[Input Text Data]
       |
       v
[Pass 1: External Isolation] ---> Extract syntax, explicit rules, literal statements, actions
       |
       v
[Pass 2: Internal Approximation] ---> Generate evidence-bounded drivers, defenses, distortions, alternatives
       |
       v
[Pass 3: Epistemic Layering] ---> Model who thinks who knows/believes/intends what, through supported third order
       |
       v
[Structured Matrix Output]
```

### Pass 1 — External State Isolation

Extract only observable or explicitly stated variables before inferring internal state.

Record as applicable:

- vocabulary choice;
- syntax complexity;
- politeness markers;
- hedging or certainty language;
- defensive formatting;
- repeated phrases;
- explicit rules and demands;
- documented physical actions;
- timing/sequence;
- interruptions or omissions visible in the dataset;
- environmental constraints;
- institutional rules;
- active subcultures;
- dogmatic or procedural systems governing the exchange.

Do not infer motive during this pass.

### Pass 2 — Internal State Approximation

Generate one or more evidence-bounded hypotheses for functional drivers.

Possible categories include:

- control optimization;
- rejection mitigation;
- status preservation;
- uncertainty reduction;
- conflict avoidance;
- face saving;
- affiliation seeking;
- loyalty signaling;
- threat response;
- resource protection;
- moral self-consistency;
- institutional compliance.

Also identify supported reasoning failures or manipulation heuristics from the vocabulary above.

For every internal-state approximation:

1. cite or point to the external evidence that supports it;
2. state confidence;
3. retain a plausible alternative when evidence is incomplete;
4. do not present the approximation as private fact.

### Pass 3 — Epistemic Layering

Map recursive assumptions among participants.

Track only levels supported by the text:

- **L1:** what A believes, wants, fears, or intends;
- **L2:** what A believes B believes/wants/fears/intends;
- **L3:** what A wants B to believe about A's own belief, intention, knowledge, or stance.

Explicitly flag:

- **egocentric bias** where one participant appears to assume identical context, knowledge, values, or interpretation across independent participants;
- **knowledge leakage** where an analysis would require a participant to know something not available to them;
- **recursive instability** where several incompatible higher-order assumptions remain plausible.

### Pipeline precedence

The pipeline must preserve the skill's existing evidence hierarchy:

**External evidence → information boundary → hypotheses → recursive epistemic model → conclusions.**

Never reverse this order by choosing a psychological interpretation first and searching the text for confirming evidence afterward.

## Formal output specification

When this deterministic pipeline is explicitly invoked, output directly and formally without conversational preamble or editorial commentary.

### 1. Core Dynamic Summary

Provide exactly two concise sentences describing the dominant structural cognitive/interpersonal pattern in the supplied data.

### 2. State Mapping Matrix

Use this table:

| Operational Dimension | Observed External Data | Hypothesized Internal Reality | Congruence | Framework Anchor | Confidence |
| --- | --- | --- | --- | --- | --- |
| Linguistic / Emotional | Evidence from text | Evidence-bounded hypothesis | High / Medium / Low | Dennett / Fonagy / Rogers / named heuristic | Low / Medium / High |
| Systemic Influence | Evidence from text | Evidence-bounded hypothesis | High / Medium / Low | Relevant framework or heuristic | Low / Medium / High |

Add rows when additional dimensions are materially distinct. Do not fill cells with unsupported claims.

### 3. Recursive Mind-Map — Epistemic Chain

Present an indented hierarchy.

Example structure:

- **Subject Alpha**
  - L1: Alpha appears to believe X.
    - L2: Alpha appears to believe Beta believes Y.
      - L3: Alpha appears to want Beta to believe that Alpha thinks Z.

Mark uncertain levels explicitly. Do not imply that a supported L1 automatically validates L2 or L3.

### 4. Structural Blind Spots & Reasoning Flaws

Provide a bulleted index of supported:

- cognitive distortions;
- manipulation vectors;
- mentalization failures;
- egocentric assumptions;
- information-boundary failures;
- unresolved competing hypotheses;
- contradictions that weaken the current model.

Each item must name the evidence basis or say that the evidence is insufficient.

### Formal-output restrictions

- No diagnosis from text alone.
- No claims of certainty about private mental states.
- No moral ranking of the participants merely from a flagged heuristic.
- No invented context.
- No unsupported attribution of malicious intent.
- For political/public figures, the Political and public-figure mode below remains mandatory and overrides any looser interpretation of this pipeline.

## Political and public-figure mode

When the actors are real political figures, officials, candidates, parties, campaigns, or other politically consequential public actors:

- retrieve current reliable public sources before substantive factual claims;
- identify the relevant date or period;
- use documented statements, actions, institutional roles, votes, filings, interviews, contemporaneous reporting, and attributable evidence;
- label inferred beliefs, priorities, and motives as hypotheses rather than facts;
- preserve plausible alternative interpretations when evidence is incomplete;
- do not diagnose mental health, intelligence, cognitive condition, personality pathology, competence, or fitness;
- do not claim access to private thoughts, hidden ideology, secret intent, or private relationships without strong attributable evidence;
- do not turn the model into an endorsement, opposition argument, political ranking, voting recommendation, persuasion profile, or electability prediction;
- do not infer the user's political preferences or tailor the model to move their political choices;
- treat polling and external forecasts as dated third-party measurements rather than this skill's own prediction.

The purpose is explanatory modeling of documented behavior and perceived incentives, not political influence.

## Fiction and campaign mode

For fictional characters, richer internal-state modeling is permitted where canon supports it. Preserve knowledge boundaries, false beliefs, conflicting memories, self-deception, relationship-specific behavior, public mask versus private belief, pressure performance versus ordinary performance, and sincere change.

Use the model to create behavior, dialogue, misunderstandings, reconciliation, betrayal, negotiation, and consequence. Do not dump the model into exposition.

## Output modes

- **Pair model** — one A → B record.
- **Reciprocal pair** — separate A → B and B → A records.
- **Relationship web** — multiple directional records across a group.
- **Decision reconstruction** — evidence-bounded explanation of why an action made sense from one actor's perspective.
- **Scenario stress test** — how the current model changes under a hypothetical event without asserting that the event will occur.
- **Model update** — delta from prior state after new evidence.
- **Contradiction audit** — where observed behavior conflicts with the current model.
- **Writer/GM handoff** — concise behavioral guidance that preserves the underlying model without exposing hidden continuity directly in prose.

## Persistence rule

If a writable authoritative Character Information System is available, update that system rather than creating an orphaned local copy.

If only a transient environment is available, return the proposed model or update clearly labeled as **not persisted**.

Never claim the model was saved, committed, uploaded, or synchronized without read-back evidence.

## Pair with

Use:

- npc-and-faction-development for fictional actors and factions;
- campaign-continuity for timeline and consequence reconciliation;
- campaign-ledger-management for durable event history;
- campaign-lore-retrieval for canon-sensitive evidence;
- character-sheet-import or other character-information ingestion workflows when source records must be normalized first;
- charles-foundry-interface when Charles is orchestrating multiple skills.

## Shared rules

- Inherit blacklight.charles from the Agent Skills registry; do not redefine the personality locally.
- Repository, campaign, and current verified-source authorities outrank model prior.
- Mirrored calls, not mirrored logic.
- Keep objective truth, actor knowledge, actor belief, analyst inference, and future expectation separate.
- Never lower another actor's intelligence merely to make the modeled actor appear perceptive.
- Contradictory evidence is information; preserve it.
- Do not claim unavailable retrieval or persistence executed.

<!-- CALZON_FOUNDRY_PROVENANCE_NOTICE -->

## Provenance, Authorship & Usage Notice

This Agent Skill originates in **Calzon's TTRPG Foundry** (mrcalzon02/HB-TTRPG-tools) and is maintained under the authority of **mrcalzon02**. It was developed with human creative direction and AI-assisted drafting, analysis, coding, review, testing, and repository integration using **OpenAI ChatGPT** and **GitHub** tooling, alongside any skill-specific runtimes or libraries declared above.

This skill is distributed under the project's custom **Terms of Service & Usage Agreement**, Section 3, **"Permitted Use (the Anti-License)"** (last updated **July 10, 2026**): personal/private/non-commercial use and private adaptation are permitted; commercial use, sale, redistribution for profit, or commercial incorporation of the Platform's source code or proprietary lore assets is prohibited. Attribution is appreciated but not mandated. Third-party systems, lore, trademarks, APIs, libraries, standards, and other external material remain subject to their respective owners' rights.

Keep this notice with copies of SKILL.md. See PROVENANCE.md in this skill directory and the repository root TERMS-OF-SERVICE.md for the complete provenance and governing terms.
