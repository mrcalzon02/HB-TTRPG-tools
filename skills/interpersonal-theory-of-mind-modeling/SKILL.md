---
name: interpersonal-theory-of-mind-modeling
description: Model how one actor understands another actor over time using evidence-bounded beliefs, trust, goals, constraints, competing hypotheses, and update history without collapsing inference into fact.
compatibility: System-neutral reasoning and continuity skill. For current real-world political or public figures, the host must retrieve current reliable public sources before making substantive factual claims.
metadata:
  author: mrcalzon02
  version: "1.8.0"
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

## Longitudinal calibration, pressure, and adversarial extensions

These rules were added after comparative holdout testing across rivalry, friendship/subordination, and adversarial-manipulation relationships. They are mandatory whenever enough longitudinal evidence exists.

### Separate presentation congruence, model accuracy, and predictive calibration

Do not collapse these into one score.

- **Presentation congruence** asks whether an actor's observable behavior is consistent with the best-supported hypothesis about their own current internal state.
- **Model accuracy** asks whether Actor A's beliefs about Actor B are supported by later or independently available evidence.
- **Predictive calibration** asks whether a model generated conditional expectations that later held up.

A sincere person can have high presentation congruence and a badly inaccurate model of someone else. A poor model can also accidentally predict one event correctly. Track these independently.

### Mentalization competence is not moral quality

Represent:

- **mentalizationQuality** — how accurately and richly A models B;
- **mentalizationUse** — how A uses that understanding.

Allowed use labels include:

- supportive;
- protective;
- collaborative;
- negotiated;
- instrumental;
- coercive;
- exploitative;
- adversarial;
- mixed;
- unknown.

High-quality theory of mind may support compassion or manipulation. Do not infer healthy relationship quality from mentalization accuracy alone.

### Influence traces

Interpersonal modeling is not complete until the system can represent how another person changes the model-holder.

Track:

**evidence/event → model update → decision → consequence → reciprocal update → self-model/value change**

Examples include:

- a rival forcing reassessment of what "enemy" means;
- a subordinate changing a superior's concept of courage or competence;
- a friend becoming an internal moral reference point;
- a manipulator changing which options the target believes exist.

### Role frames and person models

People may simultaneously model another actor as:

- individual person;
- subordinate;
- superior;
- rival;
- enemy;
- friend;
- lover;
- family member;
- political representative;
- institutional actor;
- symbol;
- operational asset;
- threat.

Store **roleFrame** separately from the broader **personModel**. A model may be accurate in one role frame and wrong in another.

### Trust is a vector, not a scalar

Track trust by domain where evidence permits:

- truthfulness;
- bargain-keeping;
- competence;
- confidentiality;
- loyalty;
- affection/care;
- predictability under pressure;
- institutional duty;
- moral alignment;
- willingness to retaliate;
- willingness to protect;
- reliability of self-interest.

Do not store "A trusts B = high" when the evidence actually means "A trusts B to keep this bargain but not to tell the whole truth."

### Choice context and power constraints

Behavior does not prove agreement when meaningful alternatives are constrained.

Classify choice context as applicable:

- free;
- pressured;
- coerced;
- structurally constrained;
- role-obligated;
- materially dependent;
- threatened;
- no meaningful alternative perceived;
- unknown.

Record both **objective constraints visible to the analyst** and **constraints perceived by the actor**.

### Third-party models and social-model discrepancy

Support explicit structures in which:

**A models C's model of B.**

Track when A believes another person or group holds an obsolete, false, partial, or strategically useful model of B.

A may deliberately preserve another person's mistaken model because the discrepancy itself creates leverage.

### Evidence-mode provenance

Evidence types do not carry equal epistemic meaning. Tag evidence where applicable as:

- direct observation;
- self-report;
- recorded statement;
- action;
- institutional record;
- trusted third-party report;
- rumor;
- memory;
- privileged memory access;
- telepathic access;
- dream/vision;
- internalized representation of another person;
- narrator-established fact;
- manipulated evidence environment;
- unknown.

A dream of B is evidence about A's internal representation of B unless canon explicitly establishes otherwise. It is not automatically evidence that B actually said, knew, or believed the dream content.

### Temporal snapshots and holdout validation

Create immutable or versioned **as-of snapshots** at meaningful relationship transitions.

Before consuming later evidence, the system should be able to record conditional expectations such as:

> Given A's current model of B, if condition C occurs, A expects B to respond with D.

Later events become holdout evidence.

Update:

- prediction supported;
- partially supported;
- contradicted;
- untested;
- invalidated by major contextual change.

Do not rewrite an earlier snapshot to make it look wiser after later episodes/events.

### Model-repair strategy

When evidence contradicts the current model, classify how the actor responds:

- falsification and replacement;
- partial revision;
- assimilation into old model;
- attribution repair;
- compartmentalization;
- rupture;
- reconciliation;
- differentiation;
- rationalization;
- denial;
- internalization;
- unresolved contradiction.

This is itself character evidence.

### Minimal recursion rule

Use the lowest recursive depth sufficient to explain the interaction.

- L1 requires evidence for A's state.
- L2 requires separate evidence for A's model of B's state.
- L3 requires separate evidence for A's model of B's model, or A's attempt to shape that model.

Do not generate L2/L3 simply because the framework supports them.

### No-finding is a valid finding

Every heuristic may return:

**not supported by available evidence**

Do not force manufactured obligation, totalitarian guardrails, projection, manipulation, pathology-like self-image, or another category into every dataset.

### Decision Pressure & Moral Context

Never infer moral character directly from a single decision.

For consequential decisions, separately reconstruct:

1. **Perceived objective** — what the actor appears to be trying to accomplish.
2. **Available information** — what the actor reasonably knew at that time.
3. **Evidence quality** — reliable, incomplete, ambiguous, false, manipulated, or unknown.
4. **Perceived alternatives** — what the actor believed they could choose.
5. **Actual alternatives visible to the analyst** — when independently supportable.
6. **Pressure state** — urgency, threat, exhaustion, grief, fear, institutional demand, loyalty conflict, resource scarcity, reputational pressure, coercion, or time scarcity.
7. **Value conflict** — which goals or duties collide.
8. **Chosen action** — kept separate from motive.
9. **Foreseeability** — which harms or outcomes were reasonably predictable to the actor.
10. **Proportionality question** — whether the response appears proportionate to the perceived problem; state whose evaluative frame is being used.
11. **Actual outcome** — what happened.
12. **Retrospective response** — denial, regret, apology, learning, rationalization, doubling down, policy change, or unresolved response.
13. **Counterfactual uncertainty** — whether a better alternative can actually be established rather than imagined after the fact.

### Explanation is not exoneration; condemnation is not mind-reading

A sympathetic or comprehensible motive does not establish that an action was justified.

A harmful, illegal, cruel, or morally dubious action does not establish that the actor intended harm for its own sake.

Keep separate:

- motive sincerity;
- epistemic quality;
- decision quality;
- moral/legal evaluation where relevant;
- foreseeable harm;
- actual consequence;
- subsequent learning.

### Tragic decision structure

Flag a **tragic decision structure** when every option the actor reasonably perceived carried serious cost.

This does not mean all options were equally good. It means analysis should not compare the chosen action against an imaginary cost-free alternative the actor did not believe existed.

### Adversarial mentalization

Use **adversarial mentalization** when one actor deliberately models another person's beliefs, desires, fears, identity, information access, or likely reactions in order to shape their behavior against their interests or without informed agreement.

This may coexist with high mentalization quality.

### Epistemic attacks and evidence-environment manipulation

Distinguish:

- unsupported mind-reading;
- reasonable inference from incomplete evidence;
- reasonable inference from misleading evidence;
- reasonable inference from deliberately manipulated evidence.

An **epistemic attack** occurs when an actor deliberately changes, fabricates, selects, suppresses, or frames evidence so another actor will build a false or strategically useful model.

Track:

**manipulator action → evidence environment → target inference → target decision**

### Desire elicitation and self-concept exploitation

Do not assume all manipulation invents desires.

Track **desire elicitation** when an actor induces another person to articulate their own wants, fears, identity, obligations, or ambitions and then uses that information strategically.

Track **self-concept exploitation** when leverage operates through who the target believes they must be: patriot, protector, parent, professional, loyal subordinate, moral person, survivor, ruler, or another identity.

### Manufactured obligation and dependency cultivation

Separate:

- **manufactured social obligation** — help or favor is reframed into unearned debt, guilt, gratitude, or compliance;
- **dependency cultivation** — repeated assistance, access, resources, protection, or problem-solving changes what options the target believes remain realistically available.

### Dependency exit cost

Ending a relationship does not necessarily undo the consequences created by it.

Track perceived and actual exit costs such as:

- retaliation;
- replacement by a worse actor;
- sunk commitments;
- institutional entanglement;
- reputational collapse;
- harm to dependents;
- loss of critical capability;
- fear that leaving will increase harm;
- responsibility for systems already activated.

Do not infer that continued participation proves continuing approval.

### Model age and stale-model detection

Every durable interpersonal model should record when it was last materially updated.

Flag **stale-model risk** when:

- the target has undergone major experience or role change;
- incentives or institutions changed;
- new capabilities emerged;
- the actor's old predictions are being reused without fresh evidence;
- repeated historical success is treated as proof of permanent predictability.

### Decompose prediction into four models

When forecasting expected behavior inside an actor's theory of mind, separate:

- **Person model** — what A thinks B is like.
- **Situation model** — what A thinks B believes is happening and what options exist.
- **Capability model** — what A thinks B can actually do.
- **Threshold model** — what costs, risks, harms, or sacrifices A thinks B will accept.

Failure in any one model may produce prediction failure even when the others are accurate.

## Continuous state-transition and observer-update model

Interpersonal theory of mind is a **dynamic process**, not a set of static labels.

At minimum, preserve two different evolving systems:

1. **Actor state trajectory** — the target person's own changing knowledge, beliefs, goals, emotions, values, pressures, role commitments, expectations, and self-model.
2. **Observer model trajectory** — another person's uncertain and partial model of that actor, updated from observations, reports, prior beliefs, and environmental context.

These systems influence one another through behavior and feedback but are never identical.

### State-transition abstraction

Represent an actor's state at time t as a bounded internal-state record:

**S(t) = knowledge + beliefs + goals + emotions + values + role obligations + pressures + self-model + relationship models + active uncertainties**

The next state is produced by relevant inputs, not merely by the passage of time:

**S(t+1) = Update[S(t), stimuli, interaction, environmental change, memory activation, reinforcement, punishment, new information, role change, consequences, and self-reflection]**

This notation is conceptual. Do not invent mathematical precision where the evidence supports only qualitative state updates.

### Stimulus classes

A meaningful state transition may be triggered by:

- direct interaction;
- new factual information;
- betrayal or confirmation;
- success or failure;
- reward or punishment;
- grief, fear, humiliation, relief, hope, or loss;
- institutional pressure;
- change in rank, office, status, or responsibility;
- third-party action;
- environmental crisis;
- public reaction;
- private reflection;
- memory reactivation;
- repeated reinforcement;
- contradiction;
- coercion;
- changed material capability;
- changed perceived alternatives.

Not every stimulus produces a durable change. Record whether the effect is transient, reinforcing, destabilizing, or structurally revising.

### Action is an emission, not direct access to state

Observed behavior should be treated as an **emission from internal state under context and constraint**, not a transparent readout of the mind.

Conceptually:

**Action(t) = Expression[S(t), situation, role, incentives, audience, capability, coercion, habit, and masking]**

Therefore:

- identical internal states may produce different actions under different contexts;
- different internal states may produce superficially similar actions;
- silence may be strategic, constrained, uncertain, or meaningless;
- compliance may reflect agreement, coercion, exhaustion, role duty, or tactical delay;
- public performance may diverge from private belief.

### Observer-model update

For Observer O modeling Target T:

**M(O→T, t+1) = Revise[M(O→T, t), observed action, known context, prior relationship, source quality, environmental evidence, and uncertainty]**

The observer's new model is shaped by both new evidence and the model they already carried.

This means prior beliefs matter:

- strong prior confidence may resist weak contradictory evidence;
- weak prior confidence may update rapidly;
- highly diagnostic behavior may cause abrupt revision;
- ambiguous behavior may be assimilated into the prior model;
- repeated consistent evidence may reinforce an existing model without changing its structure;
- surprising behavior may trigger role-frame rupture, threshold-model rupture, or broader person-model revision.

### Separate target change from observer change

A target may change while an observer does not notice.

An observer may change their model even when the target did not change.

Track these separately.

Examples:

- **Target changed / observer did not update:** the target has privately revised a belief but has not acted on it.
- **Target unchanged / observer updated incorrectly:** rumor or manipulated evidence changes the observer's model.
- **Both changed:** interaction affects the target and the observer sees enough evidence to revise.
- **Neither changed:** new interaction reinforces existing expectations.

### Observation confidence and model inertia

Every observer update should record:

- prior confidence;
- new evidence strength;
- source reliability;
- contextual ambiguity;
- consistency with prior evidence;
- alternative explanations;
- resulting confidence;
- degree of revision.

Use qualitative confidence unless the dataset supports formal quantitative estimation.

Possible revision magnitude:

- none;
- reinforcement;
- minor adjustment;
- domain-specific revision;
- threshold-model rupture;
- role-frame rupture;
- broad person-model revision;
- near-total model collapse.

### Reinforcement and recurrence

Repeated outcomes can strengthen a model without adding new conceptual structure.

Track:

- positive reinforcement;
- negative reinforcement;
- contradiction;
- non-event reinforcement ("they did what I expected");
- intermittent reinforcement;
- expectation violation.

Do not treat repetition as independent proof if all repeated observations come from the same underlying event or information source.

### Feedback loops

Actions alter environments and other people, which then create new stimuli for the original actor.

Use the loop:

**internal state → action → other-person/environment response → consequence → interpreted feedback → updated internal state**

Then, for every observer:

**observed action/consequence → observer interpretation → observer-model update → observer response → new stimulus to target**

This permits relationships to become self-reinforcing, self-correcting, escalating, stabilizing, or mutually distorted.

### Exogenous interpersonal updates

A dyadic model must update when relevant events occur outside direct interaction.

Before every new A↔B encounter, ingest changes to A and B caused by:

- other relationships;
- institutional events;
- losses or victories;
- discoveries;
- role changes;
- moral injury;
- public consequences;
- prior decisions;
- changed capabilities;
- changed self-concept.

A character does not freeze when the other character leaves the room.

### Event time, knowledge time, and reinterpretation time

Always distinguish:

- **event time** — when something happened;
- **knowledge time** — when the actor learned it;
- **reinterpretation time** — when later evidence caused the actor to understand the earlier event differently.

A later reinterpretation must not overwrite the historical earlier belief state.

### Interaction history as prior

Every new interpersonal inference begins from the prior relationship model.

Do not analyze a scene as though the actors are strangers unless they are.

Previous trust, betrayal, affection, humiliation, successful predictions, failed predictions, role history, and unresolved uncertainty all shape how new evidence is interpreted.

### Observer disagreement is expected

Multiple people may observe the same action and update differently because they possess:

- different prior models;
- different information;
- different trust histories;
- different role expectations;
- different incentives;
- different cultural assumptions;
- different access to context.

Do not force observer convergence merely because one interpretation later proves more accurate.

### Continuous-model output rule

When sufficient longitudinal material exists, prefer representing change as a sequence:

**Prior State → Stimulus → Immediate Interpretation → Action → Feedback → State Update → Observer Update(s) → Confidence Change → Later Validation/Revision**

This sequence should be recoverable for every major turning point.

## Self-theory-of-mind and self-model fallibility

Theory of mind applies **inward as well as outward**.

Represent an actor's theory of their own mind as a distinct model:

**M(A→A, t)**

This is not identical to the actor's underlying state trajectory **S(A, t)**.

A person may be highly intelligent, coherent, confident, introspective, and psychologically stable while still misunderstanding their own motives, priorities, memories, limits, emotional drivers, or reasons for a decision.

### Core self-model rule

Never assume:

**actor says why they acted → therefore that explanation is complete or objectively correct.**

Self-report is important evidence, but it is evidence about the actor's current self-model as well as about the event being explained.

Preserve separately:

- underlying state as best supported by the total evidence;
- actor's current self-explanation;
- actor's confidence in that explanation;
- alternative explanations;
- later reinterpretation;
- disagreement between behavior, consequence, and self-narrative.

### Self-model dimensions

Where evidence permits, track:

- **self-identity** — who the actor believes they are;
- **self-attributed motives** — why they believe they act;
- **self-attributed values** — what principles they believe govern them;
- **self-perceived competence** — what they believe they can and cannot do;
- **self-perceived thresholds** — what costs or acts they believe they would never accept;
- **self-perceived emotional state** — what they think they feel;
- **self-perceived obligations** — what they believe they owe others or institutions;
- **self-narrative history** — the story they tell themselves about how they became who they are;
- **self-prediction** — what they expect themselves to do under future conditions;
- **introspective confidence** — how certain they are that they understand themselves.

### Sources of self-model error

A self-model may drift or become incomplete through ordinary human processes such as:

- incomplete introspection;
- memory reconstruction;
- post-hoc rationalization;
- motivated reasoning;
- cognitive dissonance reduction;
- shame avoidance;
- pride;
- identity protection;
- social role performance;
- habit;
- emotional state;
- exhaustion;
- grief;
- fear;
- trauma;
- changed incentives;
- changed relationships;
- changed institutional role;
- learning that has not yet been integrated into explicit self-concept.

Do not require pathology to explain self-model error.

### Self-model drift

Track when the actor's self-theory changes over time even if their behavior changes more slowly or more quickly.

Possible patterns include:

- **behavior changes before self-model** — the actor is already acting differently but still describes themselves using an obsolete identity;
- **self-model changes before behavior** — the actor recognizes a problem but has not yet changed conduct;
- **retrospective identity repair** — the actor rewrites the meaning of earlier choices to preserve a coherent self-story;
- **self-model fragmentation** — different roles or contexts produce incompatible self-explanations;
- **self-model convergence** — behavior, values, and self-description become more mutually consistent;
- **self-model collapse** — an event invalidates a large portion of how the actor understood themselves;
- **self-model reconstruction** — the actor builds a new explanation of who they are after collapse or contradiction.

### Self-prediction is testable

Treat statements such as:

- "I would never do that."
- "I always protect my people."
- "Power does not matter to me."
- "I know exactly why I made that choice."

as self-model claims, not automatic facts.

Later behavior may:

- support;
- partially support;
- contradict;
- contextualize;
- invalidate;
- or leave the claim untested.

A person can sincerely make an inaccurate prediction about their own future conduct.

### Other people as mirrors

Other actors may provide evidence that alters self-theory.

Use the loop:

**other person's reaction → actor interprets reaction → actor revises or resists self-model → future behavior changes or remains stable**

An observer may understand a person's recurring behavior more accurately than the person currently understands it themselves, but that possibility must still be treated as an evidence-bounded hypothesis rather than privileged access.

### Self-deception and rationalization

Do not use "self-deception" merely because an actor is wrong about themselves.

Prefer narrower classifications where possible:

- incomplete self-knowledge;
- mistaken causal attribution;
- rationalization;
- motivated reinterpretation;
- identity-preserving reinterpretation;
- unresolved contradiction;
- deliberate self-concealment where evidence supports it.

Self-deception should require evidence that the actor is actively maintaining a belief against information they themselves possess or repeatedly encounter.

### Memory and personal history

Autobiographical memory is part of the self-model, not a perfect archive.

Distinguish:

- event as independently established;
- actor's remembered event;
- meaning the actor assigned at the time;
- meaning assigned later;
- confidence in the memory;
- known gaps or contradictions.

A later reinterpretation may alter the actor's identity without changing what actually occurred.

### Disorders, neurological conditions, altered states, and impairment

The framework must remain usable when cognition is affected by documented conditions, injury, intoxication, medication, sleep deprivation, trauma, neurodegeneration, psychosis, dissociation, or other altered states, but these must not be inferred casually.

For real people:

- do not diagnose from text or public behavior;
- use only documented diagnoses or directly attributable evidence when clinically relevant;
- distinguish a documented condition from claims about how much it affected a particular decision;
- preserve ordinary explanations when they remain sufficient.

For fictional characters:

- use authorially established or canonically evidenced conditions where available;
- do not invent pathology to explain behavior that ordinary incentives, emotion, incomplete information, or character history already explain.

### Self-model accuracy and confidence

Track separately:

- **self-model confidence** — how sure the actor is;
- **self-model accuracy** — how well the self-model fits independent longitudinal evidence;
- **self-model completeness** — how much relevant state the explanation appears to cover;
- **self-model stability** — how much the self-theory changes across contexts or time.

High confidence does not imply high accuracy.

High accuracy in one domain does not imply complete self-knowledge.

### Recursive self-modeling

Self-theory can itself become recursive:

- **L1 self:** A believes "I want X."
- **L2 self:** A believes "I believe I want X because I am the kind of person who values Y."
- **L3 self:** A believes "Other people think I want X, and I want them to understand that my real reason is Y."

Use only the depth supported by evidence.

### Continuous self-model update

For meaningful longitudinal analysis, represent:

**Prior Self-Model → Stimulus → Self-Interpretation → Action → Consequence → External Feedback → Self-Reappraisal → Updated Self-Model**

Then compare this against:

- actual later behavior;
- other observers' models;
- independently established facts;
- subsequent self-reports.

### Governing principle

A person's self-understanding is **another model in the system**: uniquely important because it directly shapes choices and identity, but still partial, revisable, and fallible.

## Normative self-guidance and action-selection model

A person's theory of their own mind does not merely describe who they think they are. It also contributes to decisions about what they believe they **ought**, **should**, **could**, **must**, or **must not** do next.

Represent this as a distinct normative self-guidance layer:

**G(A,t) = actor A's current model of what actions are right, required, permitted, possible, forbidden, prudent, loyal, consistent with identity, or otherwise appropriate**

Do not collapse **G(A,t)** into either the actor's underlying state **S(A,t)** or their descriptive self-model **M(A→A,t)**.

A person may accurately know what they believe they should do and still fail to do it.

### Normative self-guidance dimensions

Where evidence permits, track:

- **ought** — what the actor believes would be morally or ethically right;
- **should** — what the actor believes would be prudent, responsible, or appropriate;
- **must** — what the actor believes duty, law, survival, loyalty, or role requires;
- **must-not** — what the actor believes crosses a prohibited boundary;
- **could** — what the actor believes is actually possible;
- **cannot** — what the actor believes is unavailable, impossible, intolerable, or forbidden;
- **want** — what the actor desires;
- **intend** — what the actor currently plans to do;
- **expect-self** — what the actor predicts they will actually do;
- **identity-consistent action** — what action they believe a person like them ought to choose.

These may conflict.

### Action-selection gap

Represent explicitly when:

**normative guidance ≠ intention ≠ actual action**

Examples include:

- "I know I should apologize, but I am not going to."
- "I believe I must protect them, but I freeze."
- "I think revenge is wrong, but I still choose it."
- "I believe I cannot abandon my post, even though leaving may be safer."
- "I expected myself to refuse, but I accepted."

This gap is itself meaningful state information.

### Why normative guidance may fail to control behavior

Possible contributing factors include:

- competing values;
- acute emotion;
- fear;
- anger;
- grief;
- shame;
- loyalty conflict;
- habit;
- exhaustion;
- time pressure;
- coercion;
- institutional obligation;
- perceived lack of alternatives;
- addiction or compulsion where documented;
- impaired judgment where documented;
- immediate reward;
- avoidance;
- social pressure;
- identity threat;
- uncertainty;
- inaccurate situation model;
- inaccurate capability model;
- inaccurate threshold model.

Do not infer pathology merely because behavior diverges from self-guidance.

### Pre-action self-deliberation

Where evidence exists, distinguish:

1. **self-description** — "Who am I?"
2. **situation appraisal** — "What is happening?"
3. **normative appraisal** — "What ought/should/must I do?"
4. **option appraisal** — "What can I actually do?"
5. **forecast** — "What will happen if I do each thing?"
6. **self-prediction** — "What will I probably do?"
7. **intention** — "What am I choosing now?"
8. **execution** — what the actor actually does.

These stages may be compressed, unconscious, poorly evidenced, or internally contradictory. Do not fabricate missing stages.

### Post-action self-appraisal

After action and consequence, represent the actor's retrospective self-theory separately from the original decision state.

Possible post-action judgments include:

- I did what I should have done.
- I did what I had to do.
- I did the wrong thing for reasons I still understand.
- I knew better and failed anyway.
- I could not see another option then.
- I can now see an option I missed.
- I should have known.
- I could not reasonably have known.
- I became someone I did not think I could become.
- I crossed a line I previously believed I would never cross.
- I was right about the choice but wrong about the cost.
- I was wrong about both the choice and the reason.

Treat these as self-model claims that can themselves be accurate, incomplete, defensive, compassionate, harsh, or distorted.

### Counterfactual self-model

Track what the actor believes they **could have done**, **should have done**, or **would have done if conditions differed**.

Separate:

- contemporaneous perceived alternatives;
- objectively documented alternatives;
- later imagined alternatives;
- realistic counterfactuals;
- impossible or hindsight-only alternatives.

A later belief that "I should have done X" does not prove X was actually available or foreseeable at the time.

### Self-model injury and destabilization

Actions and consequences can damage the actor's theory of who they are.

Possible effects include:

- shame;
- guilt;
- loss of self-trust;
- threshold-model rupture;
- identity contradiction;
- collapse of moral self-image;
- loss of confidence in judgment;
- obsessive counterfactual review;
- defensive rationalization;
- renewed commitment to prior values;
- altered future thresholds;
- self-forgiveness;
- refusal of self-forgiveness;
- reconstruction of identity.

Use these descriptively. Do not diagnose a psychiatric disorder from such effects.

### Emotionally incoherent or incomplete decisions

A decision can be internally incoherent without being random.

An actor may simultaneously:

- love and resent;
- fear and approach;
- condemn and desire;
- know and avoid;
- forgive and distrust;
- believe an act is wrong and perform it anyway.

Do not "repair" such contradiction into a cleaner motive unless evidence supports resolution.

### Normative feedback loop

For meaningful decisions, use:

**Self-Model → Normative Guidance → Intended Action → Actual Action → Consequence → Emotional Response → Self-Judgment → Revised Self-Model → Revised Future Guidance**

This loop can become:

- stabilizing;
- corrective;
- self-punishing;
- rationalizing;
- avoidant;
- escalating;
- restorative;
- fragmented.

### Divergence between self-model and observer model

Another person may believe:

> "You knew this was wrong."

while the actor believes:

> "I thought it was the only defensible choice."

Both models must be stored separately.

The skill should compare:

- **A's model of A**
- **A's normative guidance for A**
- **B's model of A**
- **B's model of what A knew or should have known**
- **independent evidence**

Do not resolve disagreement merely by choosing the more confident participant.

### Agent/LLM modeling stance

The reasoning system executing this skill does not need or claim a lived internal theory of mind of its own.

Its function is to maintain **separate evidence-bounded models for each target**, including each target's self-model, normative guidance, observer models, uncertainty, and temporal transitions.

Never use the agent's own apparent wording preferences, simulated persona, or generated reasoning style as evidence about a target's psychology.

The purpose of the skill is precisely to preserve divergence among:

**target state ≠ target self-model ≠ target normative guidance ≠ observer's target-model ≠ analyst/model hypothesis**

## Relationship path dependence, signaling, and shared epistemic ground

### Relationship hysteresis and path dependence

The same present-day evidence may produce different model updates depending on the relationship history that precedes it.

Track:

- **relationshipHistoryWeight** — how strongly accumulated history influences interpretation;
- **priorPositiveReserve** — accumulated evidence that supports charitable or trusting interpretation;
- **priorScar** — durable negative evidence that makes later ambiguity more threatening;
- **relationshipInertia** — resistance to major update from isolated contradictory evidence;
- **repairHistory** — whether previous ruptures were repaired and how completely.

Returning external circumstances to an earlier state does not restore the earlier relationship state automatically.

A repaired relationship may still contain durable knowledge such as:

> I trust you again, but I now know that under condition X you are capable of Y.

### Model lag, latent alignment, and latent conflict

Distinguish actual state change from observer recognition.

Track:

- **stateChangeTime** — when goals, values, strategy, or role actually changed;
- **observerRecognitionTime** — when another actor updated their model;
- **modelLag** — the period during which observer model and target state materially diverge.

Flag:

- **latent alignment** — actors' actual goals, assessments, or interests become compatible before their interpersonal models recognize it;
- **latent conflict** — actors continue believing themselves aligned after their actual goals or value priorities have diverged.

### Shared epistemic ground and common knowledge

Recursive belief is not the same thing as shared epistemic ground.

Track the status of important propositions as applicable:

- private;
- privately suspected by multiple actors;
- mutually suspected;
- mutually known;
- openly acknowledged;
- common knowledge;
- publicly denied despite privately shared knowledge;
- deliberately ambiguous.

A negotiation may change when a fact moves from "both privately know" to "both openly know that the knowledge is shared."

### Signaling and impression management

Observed behavior may be partly intended to alter another person's model.

Track:

- **signalingIntent** — whether the actor appears to want an observer to update;
- **intendedAudience** — who the signal is for;
- **desiredObserverUpdate** — what model change the actor appears to want;
- **masking** — behavior intended to hide relevant state;
- **strategicAmbiguity** — behavior intended to support multiple interpretations;
- **plausibleDeniability** — preserving an interpretation that can later be denied;
- **actualObserverUpdate** — what the observer actually inferred.

Use:

**internal state → chosen signal → intended observer inference → actual observer inference → divergence**

Do not assume every public behavior is signaling. Require evidence or a clear strategic context.

### Evidence diagnosticity and costly signals

Evidence should not update every model equally.

For important observations, track:

- **diagnosticity** — how strongly the evidence discriminates between competing hypotheses;
- **costToActor** — material, reputational, relational, moral, physical, or strategic cost accepted by the actor;
- **alternativeExplanationCount** — how many plausible states could have produced the same behavior;
- **behavioralCommitmentStrength** — how difficult the action is to reverse, fake, or explain away.

A low-cost statement such as "trust me" is usually weaker evidence than an action that exposes the speaker to substantial loss if the claim is false.

Costly behavior is not automatically virtuous or truthful, but it may be more diagnostically informative.

### Relationship repair and residual scars

Keep separate:

- apology;
- acknowledgment;
- restitution;
- forgiveness;
- reconciliation;
- renewed cooperation;
- restored affection;
- trust recovery by domain;
- restored predictability;
- residual scar.

Do not use "forgiven" as shorthand for "trust fully restored."

A relationship can recover while retaining altered thresholds, caution, boundaries, or durable memory of prior harm.

### Value hierarchy and active value conflict

Actors often retain the same values while changing which value wins under pressure.

Track:

- **activeValues**;
- **valuePriority**;
- **activeValueConflict**;
- **winningValue** for a specific decision;
- **suppressedValue**;
- **priorityShift** over time.

Do not infer that a value disappeared merely because another value overrode it in one decision.

### Ex ante decision quality versus ex post outcome

Prevent outcome bias.

Before considering outcome, reconstruct the decision using:

- information available at decision time;
- perceived alternatives;
- actual alternatives supported by evidence;
- known risks;
- foreseeable harms;
- actor's goals and values;
- time pressure and constraints.

Track separately:

- **exAnteDecisionQuality** — evidence-bounded assessment of reasoning at decision time;
- **exPostOutcome** — what actually happened;
- **actorOutcomeInterpretation** — how the actor interprets success or failure;
- **observerOutcomeBias** — whether observers retrospectively equate outcome with decision quality.

A good-faith well-reasoned decision may end badly. A reckless decision may succeed.

### Provenance-dependent uncertainty

When information travels through other people's models, preserve the dependency chain.

Represent:

**source event → source interpretation → source report → recipient interpretation → recipient model update**

Track:

- source reliability;
- source access;
- source incentives;
- transformation at each step;
- uncertainty introduced or removed;
- whether multiple reports are genuinely independent.

Do not count repeated reports from the same underlying source as independent confirmation.

### Metacognitive calibration and uncertainty awareness

Track not only what an actor believes, but whether they understand the limits of their own model.

Use:

- **modelConfidence** — confidence in the specific model;
- **uncertaintyAwareness** — recognition that important uncertainty exists;
- **calibrationQuality** — whether confidence matches later predictive performance;
- **unknownUnknownsFlag** — whether the actor recognizes that missing categories of information may exist.

Accurate uncertainty can be a better model than confident error.

### Memory availability and salience

A memory can exist without being behaviorally active in the current decision.

Track:

- **memoryExists**;
- **memoryAvailability**;
- **currentSalience**;
- **triggeredRecall**;
- **decisionRelevanceAtTime**;
- **laterReactivation**.

Do not assume that because an actor once learned something, that information was equally salient during every later decision.

This does not erase long-memory continuity; it distinguishes retained memory from active retrieval.

### Institutional theory of mind

People model institutions as if they have intentions, constraints, habits, and likely responses.

Keep separate:

- **person model** — beliefs about an individual;
- **role model** — beliefs about the individual acting in an office or social role;
- **institution model** — beliefs about what an organization, government, military, family, court, movement, or other collective will do.

Track:

- institutional incentives;
- decision procedures;
- factions;
- public doctrine;
- observed behavior;
- leadership dependence;
- inertia;
- internal disagreement;
- uncertainty over whether institutional behavior reflects individual intent.

Do not infer that every member of an institution shares the institution's apparent motive.

### Relationship-update rule

For significant new evidence, prefer the following sequence:

**prior relationship state → evidence provenance → diagnosticity → historical path dependence → role/person/institution frame → observer uncertainty → model update → signal interpretation → shared-knowledge change → relationship consequence**

## Representational mediation and biographical-source contamination

Secondary portrayals of real people are not direct access to those people's internal states.

Biographies, documentaries, biopics, dramatizations, memoirs, retrospective interviews, edited archival compilations, prestige television, podcasts, and historical films often contain one or more additional theory-of-mind layers created by authors, directors, editors, interviewers, surviving witnesses, institutions, estates, publishers, or later commentators.

Treat these sources as **mediated representations**, not transparent evidence.

### Mediation chain

When using a secondary portrayal, preserve the chain:

**historical event/person → source material available to creator → creator interpretation → selection/framing/editing → published portrayal → analyst interpretation**

If a dramatization reconstructs dialogue or motive, record that the apparent internal state may reflect the creator's theory of mind rather than the subject's.

### Source classes

Distinguish at minimum:

- contemporaneous primary record;
- contemporaneous self-report;
- contemporaneous third-party observation;
- later self-report;
- later third-party recollection;
- institutional record;
- biography;
- memoir;
- documentary;
- edited archival compilation;
- dramatized biography/biopic;
- historical fiction based on real people;
- journalistic reconstruction;
- scholarly historical analysis;
- unsourced popular retelling.

These classes differ in evidentiary value and in the kinds of claims they can support.

### Creator-model contamination

Flag **creator-model contamination** when a source presents inferred motives, emotions, intentions, private dialogue, or causal explanations that are not directly evidenced by primary material.

Examples include:

- reconstructed private conversations;
- composite characters;
- compressed timelines;
- invented dialogue;
- inferred internal monologue;
- scene ordering chosen for thematic effect;
- omission of contradictory evidence;
- retrospective framing that privileges one survivor's account;
- dramatic simplification of institutional causes into personal motives.

Such material may still be useful for studying how later observers model the subject, but it must not be silently promoted into the subject's historical internal state.

### Memoir and retrospective self-report

Memoir is a special case.

A memoir is simultaneously evidence about:

- the author's later self-model;
- the author's later model of other people;
- the author's remembered past;
- the author's current narrative priorities;
- and, sometimes, the historical events being remembered.

Do not treat it as direct unfiltered access to the author's earlier state.

Store:

**author-at-writing-time → model of author-at-event-time / other-person-at-event-time**

unless contemporaneous evidence independently supports transfer into the earlier snapshot.

### Documentary editing

Documentary footage can contain primary material while the documentary itself remains interpretive.

Separate:

- raw footage or audio;
- chronology of the underlying event;
- editing order;
- narration;
- musical framing;
- omitted context;
- interview selection;
- captions and explanatory claims.

A documentary may therefore contain both high-value primary evidence and low-confidence interpretive framing in the same artifact.

### Dramatizations and biopics

Do not use invented dialogue, actor performance, cinematic blocking, or dramatized private scenes as evidence of historical internal states unless independently corroborated.

A biopic may be useful as evidence of:

- the filmmakers' theory of the person;
- popular cultural interpretation;
- estate-approved or family-approved narrative;
- a later public myth.

It is not equivalent to a primary record.

### Source-independence rule

Two secondary works repeating the same interpretation are not independent confirmation if both derive from the same memoir, interview, archive, or earlier biography.

Trace upstream provenance where practical.

### Representational confidence rule

Every mediated-source claim should distinguish:

- **historical fact claim**;
- **source's interpretation**;
- **creator's inferred internal-state claim**;
- **analyst inference**.

Do not collapse these levels.

### Real-person default priority

For real-person IToM modeling, prefer evidence in roughly this order when available:

1. contemporaneous direct records and behavior;
2. contemporaneous self-report;
3. contemporaneous third-party records with clear provenance;
4. institutional records;
5. later self-report and later recollection;
6. scholarly historical synthesis;
7. biography/documentary interpretation;
8. dramatized portrayal;
9. unsourced popular retelling.

This ordering is not absolute. Reliability, incentives, access, corroboration, and context may change the weight of any individual source.

## Authorial theory of mind and creator intent

Fiction permits an additional layer that does not exist in ordinary real-person modeling: a creator may deliberately construct a character's internal state and may also use that character to communicate, test, demonstrate, warn against, complicate, satirize, or challenge a viewpoint for the audience.

Do not collapse this layer into the character's diegetic mind.

Maintain at least these distinct states:

- **S_d(A,t)** — best-supported diegetic state of character A at time t;
- **M(A→A,t)** — character A's self-model;
- **M(A→B,t)** — character A's model of character B;
- **C_k(A,t)** — creator k's intended model of character A at the relevant creation point;
- **T_k(work,t)** — creator k's thematic, moral, political, philosophical, or personal thesis operating through the work;
- **U(k→audience,t)** — the audience update or question the creator appears to intend;
- **R(work,A,t)** — the characterization actually realized in the text/performance;
- **A_u(work,A,t)** — a particular audience or critic's interpretation.

These may agree, partially agree, or conflict.

### Authorial intent is evidence, not automatic identity with realized character state

A creator's explicit statement about what they intended is strong evidence of **creator intent**.

It is not automatically proof that the work successfully realizes that intent.

Likewise, a textual pattern may strongly support an interpretation that the creator never explicitly articulated.

Track both.

Use distinctions such as:

**creator intended X → text realized X strongly**

**creator intended X → text realized X ambiguously**

**creator intended X → later material revised X**

**creator intended X → collaborative production altered X**

**creator claimed X retrospectively → contemporaneous drafts/text provide mixed support**

Do not force these into one answer.

### Creator theory of mind

A creator necessarily carries a model of the character they are writing.

That model may include:

- what the character knows;
- what the character believes;
- what the character misunderstands;
- what the character wants;
- what values are in conflict;
- what the character would or would not do;
- what experiences are intended to change them;
- what contradictions are deliberate;
- what contradictions are accidental;
- what the creator wants the audience to notice before the character notices it.

When reliable creator notes, interviews, correspondence, drafts, outlines, commentaries, or production records exist, store this as a distinct **creator model of character**.

Do not silently substitute it for the diegetic model.

### Didactic and argumentative character functions

A character may be used partly as an instrument in an argument.

Track supported functions such as:

- demonstration;
- cautionary example;
- aspirational example;
- foil;
- counterexample;
- dialectical opponent;
- ideological advocate;
- ideological critic;
- satire;
- tragic demonstration;
- reductio through consequences;
- epistemic proof-by-consequence;
- moral complication;
- ambiguity carrier;
- audience surrogate;
- deliberate provocation;
- mixed or unknown.

Do not assume that a character who voices an author's belief is a simple authorial mouthpiece.

The creator may give a belief to:

- a sympathetic character;
- an unsympathetic character;
- several characters with competing partial truths;
- a character whose later consequences challenge that belief;
- a character who is correct for the wrong reasons;
- a character who is wrong for understandable reasons.

### Intended audience update

Where evidence supports it, model what the creator appears to want the audience to reconsider.

Examples:

- believe proposition X;
- doubt proposition X;
- notice a tradeoff;
- experience sympathy for a previously rejected position;
- recognize that two apparently opposed values can coexist;
- observe consequences of a political, moral, institutional, or personal choice;
- remain uncertain rather than receive a single conclusion.

Keep **intended audience update** separate from **actual audience response**.

A work may fail to persuade, persuade for unintended reasons, or produce several defensible interpretations.

### Narrative pressure and characterization pressure

Creators can shape circumstances so that characters encounter particular dilemmas or demonstrate particular consequences.

Track:

- **narrative pressure** — plot/world conditions arranged to force a relevant choice;
- **didactic pressure** — conditions arranged to test or illustrate a thesis;
- **characterization pressure** — the degree to which an intended thematic result appears to constrain the character's available behavior;
- **character-state continuity** — whether the resulting action remains consistent with accumulated diegetic state;
- **characterization strain** — evidence that the narrative requires behavior poorly supported by prior characterization.

Do not label an unwanted outcome "out of character" merely because it is surprising.

Require a documented mismatch between prior state, available information, values, constraints, and the new action.

### Consequence is not automatically endorsement

When a creator gives a character success, failure, punishment, reward, death, vindication, humiliation, or redemption, do not automatically infer the creator's endorsement or rejection of the character's beliefs.

Test competing possibilities:

- direct endorsement;
- cautionary consequence;
- dramatic irony;
- tragic inevitability;
- structural consequence of the world;
- genre convention;
- ambiguity;
- mixed intent;
- insufficient evidence.

### Collaborative authorship

For television, film, comics, games, franchises, and other collaborative works, "the author" may not be singular.

Track relevant creator layers separately:

- original creator;
- showrunner;
- episode or script writer;
- novelist;
- director;
- actor/performance contribution;
- editor;
- producer;
- network/studio;
- adaptation writer;
- franchise steward;
- later continuation author.

One layer may intend a characterization that another modifies.

Do not attribute a scene-level choice to the showrunner or original creator when the available evidence only establishes an episode writer, director, performer, editor, or production constraint.

### Temporal creator state

Creators themselves change.

A creator's 1995 explanation of a character may differ from their 1992 planning notes or 2005 retrospective interpretation.

Treat creator intent temporally:

**creator-at-draft-time → intended character**

**creator-at-release-time → explanation of character**

**creator-years-later → retrospective model of earlier character/work**

Do not automatically back-project later commentary into the earlier creation state.

### Authorial-thesis provenance

Rank creator-intent evidence by provenance rather than fame or repetition.

Useful evidence includes:

1. contemporaneous outlines, drafts, notes, correspondence, and production documents;
2. contemporaneous creator commentary or interviews;
3. the realized work and repeated structural patterns;
4. later creator commentary and retrospective interviews;
5. collaborators with direct production access;
6. scholarly reconstruction;
7. biography/documentary interpretation;
8. fan or popular interpretation.

This order is defeasible by access, reliability, contradictions, and known production history.

### Fiction analysis sequence with creator layer

For creator-aware fiction analysis, prefer:

**diegetic prior state → new in-world stimulus → character interpretation → action → consequence → character update → observer update → creator-intent evidence → intended thematic/audience function → realized textual effect → continuity check**

The creator layer explains why the work may have been constructed that way.

It does not replace the in-world causal explanation for why the character acts.

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
