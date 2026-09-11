# Black Light FTL Measurement, Instrumentation, and Exploration Event Field Manual

**Document status:** MIXED — confirmed canon constraints plus clearly labeled engineering derivation and proposal material.  
**Machine-readable companion:** `data/exo-vessel/ftl-measurement-instrumentation-registry.json`  
**Schema:** `data/schemas/exo-vessel-ftl-measurement-instrumentation.schema.json`  
**Design source:** Google Drive, *The different lightspeed methods*, document `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`, revision `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`.

---

## 1. Purpose

This manual defines the measurement layer between physical exploration and propulsion/transit interpretation.

The existing evidence-instance authority already answers **what was observed, where, and with what provenance**. This volume answers the question immediately before that:

> **What did the instrument actually measure, how well could it have measured it, what changed the measurement, and what uncertainty must survive into every later interpretation?**

This is deliberately not a new FTL-family authority. It cannot assign a drive family, manufacturer, civilization, Path stage, T-tier, historical date, range, or performance constant merely because an instrument was capable of looking for one.

The operational chain is:

```text
PHYSICAL STATE
    ↓
INSTRUMENT RESPONSE
    ↓
RAW ACQUISITION
    ↓
CALIBRATION BINDING
    ↓
TIME + SPACE REGISTRATION
    ↓
DAMAGE / SATURATION / COVARIANCE ANNOTATION
    ↓
NORMALIZED OBSERVATION PACKET
    ↓
FTL EVIDENCE INSTANCE
    ↓
INSTALLATION ARCHAEOLOGY
    ↓
FORENSIC FAMILY RESOLVER
```

No stage may silently skip the stage above it.

---

## 2. Authority and canon discipline

### 2.1 Governing precedence

For measurement claims, use the strongest applicable authority in this order:

1. named vessel, installation, manufacturer, species, or historical source;
2. the consolidated propulsion/transit authority;
3. the evidence-instance, installation-archaeology, forensic, and environment-regression registries;
4. the EXO published-first source authority where astronomical/environmental facts are involved;
5. *The different lightspeed methods* as governing design intent;
6. labeled engineering derivation;
7. labeled proposal material.

A generated instrument never outranks a source describing what a real setting object contains.

### 2.2 Status vocabulary

Use these states literally:

- **CONFIRMED** — directly established by a governing source.
- **DERIVED** — engineering consequence inferred from confirmed physics or constraints.
- **PROPOSED** — useful design or teaching construct not established as setting fact.
- **UNRESOLVED** — current authority does not establish the value.
- **MIXED** — record contains more than one of the above and preserves them distinctly.

### 2.3 The principal firewall


a measurement of a family-compatible phenomenon is not automatically proof of that family.

Formally:

\[
M(x) \land C_f(x) \not\Rightarrow F=f
\]

where \(M(x)\) means a phenomenon was measured and \(C_f(x)\) means it is compatible with family \(f\).

The measurement layer reports the phenomenon. The forensic layer decides whether the whole evidence set discriminates among families.

---

## 3. Measurement model

### 3.1 Basic observation equation

**DERIVED.** A useful generic engineering model is

\[
y = H(x) + b + n + c
\]

where:

- \(x\) is the physical state;
- \(H(x)\) is the instrument response;
- \(b\) is calibrated bias;
- \(n\) is stochastic noise;
- \(c\) is contamination, interference, or unmodeled coupling.

The entire point of measurement engineering is to prevent \(b\), \(n\), and \(c\) from being mistaken for \(x\).

### 3.2 Uncertainty decomposition

A measurement packet should carry at least

\[
\mathcal U =
\{\Sigma_{random},\Sigma_{cal},\Sigma_{clock},\Sigma_{reg},\Sigma_{damage},\Sigma_{model},\Sigma_{contam}\}.
\]

These terms should not be prematurely collapsed into one confidence number.

Two packets can have the same nominal total uncertainty and radically different forensic meaning. A packet dominated by random noise can often be improved by repeated measurement. A packet dominated by an unknown shared clock offset cannot.

### 3.3 Error propagation

For a normalized observable

\[
z=f(x),
\]

first-order covariance propagation is

\[
\Sigma_z \approx J_f\Sigma_xJ_f^T + \Sigma_{instr}+\Sigma_{model}.
\]

This becomes especially important for transit systems because many useful observables are reconstructed rather than directly sensed: curvature, return-map conditioning, topology residuals, Q-domain state, or endpoint covariance.

### 3.4 Correlation is not repetition

If five displays are driven by one sensor, there are not five independent observations.

If three translated logs descend from one damaged archive block, there are not three independent historical sources.

If every field probe shares one master clock, clock failure can move the entire array coherently.

Therefore off-diagonal covariance is not optional bookkeeping. It is a description of shared failure ancestry.

---

## 4. Resolution, bandwidth, and dynamic range

### 4.1 Resolution rule

A phenomenon below instrument resolution is **UNRESOLVED**, not absent.

This applies separately to:

- spatial resolution;
- temporal resolution;
- spectral resolution;
- phase resolution;
- amplitude resolution;
- topology or state-space discrimination;
- translation/semantic resolution.

### 4.2 Sampling

**DERIVED.** For a signal with safety-relevant highest frequency \(f_{max}\), an idealized lower bound is

\[
f_s > 2f_{max}.
\]

Real instruments require additional margin for filtering, latency, clock error, transient detection, and reconstruction.

A transit recorder that samples slowly enough to miss a fold commit transient cannot later report that no commit transient occurred.

### 4.3 Dynamic range

Every packet records whether the channel was:

```text
IN_RANGE
NEAR_FLOOR
NEAR_SATURATION
SATURATED
CLIPPED
ALIASED
BANDWIDTH_EXCEEDED
UNKNOWN
```

A saturated channel proves only that the input exceeded what that channel could faithfully measure.

### 4.4 Negative evidence

The previous evidence authority uses damage-aware negative evidence. The measurement layer adds instrument admissibility.

**DERIVED:**

\[
A^- = I\,V\,R\,B\,S\,(1-D)
\]

where:

- \(I\) = instrument capability;
- \(V\) = observed spatial/temporal coverage;
- \(R\) = adequate resolution;
- \(B\) = valid bandwidth/dynamic range;
- \(S\) = expected marker survivability;
- \(D\) = destructive loss fraction.

If any required term is effectively unknown or near zero, absence should not be promoted into strong contradiction.

---

## 5. Calibration doctrine

### 5.1 Calibration is evidence

Calibration records are not maintenance trivia. They are part of the observation's ancestry.

Each evidentiary instrument records:

- instrument instance identity;
- zero and gain calibration;
- reference source;
- calibration epoch;
- calibration uncertainty;
- orientation and coordinate registration;
- clock source and offset;
- firmware/decoder/model version where applicable;
- damage or repair since calibration.

### 5.2 Calibration graph

```text
REFERENCE SOURCE
      ↓
CALIBRATION PROCEDURE
      ↓
INSTRUMENT INSTANCE
      ↓
MEASUREMENT EVENT
      ↓
OBSERVATION PACKET
```

If several instruments share the same damaged reference source, their apparent agreement must inherit that common-mode vulnerability.

### 5.3 Living instrumentation

**DERIVED FROM CONFIRMED AR'NOCK ENGINEERING BASIS.** Biological or cultivated instruments may change sensitivity as tissue heals, metabolizes, dehydrates, starves, molts, regrows, or is chemically stressed.

A living sensor therefore needs calibration state tied to physiological state.

A useful representation is

\[
C_{bio}=f(T,O,N,M,H,A),
\]

where the variables may represent temperature, oxygenation, nutrient state, metabolic activity, tissue health, and age/repair state.

The exact function is **UNRESOLVED** unless a named instrument source supplies it.

---

## 6. Instrument families

### 6.1 Passive multi-channel field recorder

Purpose: establish a pre-intervention baseline across as many passive channels as possible.

Typical channels include EM, thermal, gravitational, Q-domain proxies where available, topology/metric residuals where available, vibration, chemical/biological activity, and wake/residual changes.

It is intentionally family-neutral.

Operator rule:

> Record before touching.

### 6.2 Gravimetric gradient array

Measures gravitational acceleration, gradient tensors, time-dependent tidal structure, and unexpected mass-motion residuals.

It is especially useful for Metric and Gravitational-Plane work but remains relevant to every family because the source design document explicitly requires family-specific gravity behavior.

Potential false friends include moving cargo, fluid transfer, flexible hull distortion, nearby astronomical bodies, and damaged inertial compensation systems.

### 6.3 Topology and metric residual interferometer

Measures differential path-length and phase behavior across multiple baselines.

A generic residual may be compatible with several families. Geometry, timing, recovery state, and associated machinery must discriminate among them.

### 6.4 Service-network tracer

Traces continuity in distinct layers:

```text
STRUCTURAL
POWER
THERMAL
FLUIDIC
NUTRIENT
DATA
TIMING
FIELD
MAINTENANCE
CREW / ACCESS
EXTERNAL
```

Two compartments being adjacent does not create an edge.

### 6.5 Clock and reference ancestry analyzer

Determines where timestamps, navigation references, field epochs, and synchronized observations actually came from.

This instrument is essential for preventing one corrupted clock from becoming an entire fleet of confidently wrong measurements.

### 6.6 Chemical and biological residue analyzer

Measures chemical gradients, metabolites, necrosis, repair, coolant/nutrient residues, contamination, and tissue viability.

For Ar'nock systems this can be critical to understanding the machinery embodiment.

It is not a family selector.

### 6.7 Geometry and coverage scanner

Maps compartment boundaries, field-former positions, structural alignment, coverage regions, occlusions, and changed geometry.

This instrument is particularly important after repair or regrowth.

\[
\boxed{\text{healed geometry} \neq \text{certified geometry}}
\]

### 6.8 Low-authority stimulus and response rig

Applies a tightly bounded stimulus only after passive work is complete.

The test must record:

- waveform;
- amplitude;
- duration;
- injection point;
- isolation state;
- abort threshold;
- observed response;
- post-test contamination state.

Every such test creates a new evidence epoch.

### 6.9 Archive and translation workstation

Preserves the chain:

```text
RAW SYMBOL / SIGNAL
        ↓
DECODING
        ↓
LEXICAL MAPPING
        ↓
SEMANTIC INTERPRETATION
        ↓
TECHNICAL INTERPRETATION
```

A technical translation must never overwrite the raw record.

---

## 7. Observation packet format

A normalized packet requires, conceptually:

```json
{
  "packetId": "...",
  "eventId": "...",
  "subjectId": "...",
  "instrumentClass": "...",
  "instrumentInstanceId": "...",
  "epochId": "...",
  "spatialRef": "...",
  "timeRef": "...",
  "rawObservation": "...",
  "normalizedObservable": "...",
  "units": "...",
  "uncertainty": {},
  "resolution": {},
  "dynamicRangeState": "IN_RANGE",
  "calibrationRef": "...",
  "provenanceGroup": "...",
  "damageContext": "...",
  "interventionContext": "...",
  "status": "CONFIRMED"
}
```

The packet does not contain a required `family = ...` field.

That omission is intentional.

---

## 8. Event and epoch model

### 8.1 Why epochs exist

Exploration changes wrecks.

Opening a hatch changes atmosphere and temperature. Cutting a service line changes continuity. Energizing an unknown organ changes its residues. Taking a biological sample damages tissue. Repair causes regrowth. Translation software changes interpretation. Clock synchronization changes timing ancestry.

The evidence system must know **when** those things happened.

### 8.2 Event graph

```text
EPOCH 0 — untouched baseline
   |
   +-- passive survey
   +-- passive archive read
   |
   v
EVENT: access breach
   |
   v
EPOCH 1 — atmosphere / contamination changed
   |
   +-- geometry scan
   +-- residue sampling
   |
   v
EVENT: bounded energization
   |
   v
EPOCH 2 — field / thermal / chemical state changed
```

A measurement from Epoch 2 cannot be presented as untouched accident residue.

### 8.3 Immutable history

Corrections should append a superseding record rather than silently rewriting the acquisition history.

This permits forensic reconstruction and campaign continuity.

---

## 9. Family-specific measurement burdens

### 9.1 Metric Compression

Minimum useful measurement families:

- multi-baseline metric residuals;
- curvature and tidal environment;
- whole-vessel field coverage geometry;
- timing coherence among field-formers;
- unwind/recovery behavior.

Strong EM output without metric deformation is not enough.

### 9.2 Gravitational-Plane Skimmer

Measure:

- local and route-scale gravitational gradient structure;
- shear-plane continuity;
- fork formation;
- coupling state;
- recoupling transients.

The source design intent specifically makes shear forks a catastrophic concern, so sensor architecture must resolve impending bifurcation early enough to act.

### 9.3 Slipstream Shear

Measure:

- boundary adhesion state;
- Q-domain/weather proxy where available;
- whole-hull coverage continuity;
- detachment transient;
- wake/residual structures.

A quiet interior compartment cannot establish safe hull-wide adhesion.

### 9.4 Q-Lattice

Measure:

- discrete address state;
- epoch and reference ancestry;
- synchronization;
- rejection and recovery behavior;
- state-correspondence evidence.

A Q-domain signal does not automatically mean Q-Lattice, and Q-MAP terminology does not automatically mean Phase Displacement.

### 9.5 N-Manifold

Measure:

- route-state/tomographic residuals;
- active-axis behavior where observable;
- return-map conditioning evidence;
- hidden-obstacle inference residuals;
- re-embedding and return machinery behavior.

The system must preserve unexplained coherent residuals. It may not rename them noise merely because they make a route invalid.

### 9.6 Fold-Jump

Measure:

- finite protected-volume geometry;
- topology-former relationships;
- endpoint/reference covariance;
- precommit proof timing;
- commit-boundary transient;
- closure/ringing signature.

Post-commit steering must not be invented from a late sensor correction.

### 9.7 Wormhole / Gate

Measure:

- throat geometry;
- paired-mouth reference and synchronization;
- anchor state;
- mass flux;
- chronology protection state where exposed;
- closure and recovery behavior.

A local mouth cannot certify the remote mouth merely by prediction.

### 9.8 Phase Displacement

Measure:

- whole-object state coverage;
- target-state references;
- continuity-invariant certificates;
- reference ancestry;
- target occupancy evidence;
- post-arrival reconciliation.

Engineering continuity certification is not metaphysical proof of personal identity.

---

## 10. Scaling behavior

### 10.1 Volumetric coverage

**DERIVED.** A naive lower-bound intuition for independent volume samples is

\[
N_{sample} \gtrsim \frac{V_{effective}}{V_{resolution}}.
\]

Real installations may require far more or fewer samples depending on correlation length, field geometry, topology, and observability.

The equation is therefore a planning aid, not a universal law.

### 10.2 Data rate

A useful engineering budget is

\[
R_{data}=\sum_i N_i b_i f_i,
\]

where \(N_i\) is channel count, \(b_i\) bit depth, and \(f_i\) sample frequency.

Compression transforms become part of provenance. If lossy compression can remove a family-discriminating transient, the packet must say so.

### 10.3 Array baseline

Longer baselines can improve spatial or phase discrimination but increase synchronization, structural-registration, communication, and calibration burden.

There is no canonized universal optimum.

### 10.4 Technology maturity

More mature transit technology is expected by the governing design source to possess better safety sensing and larger practical warning margins.

That does not mean every advanced civilization uses identical sensors.

Technology basis can alter:

- carrier medium;
- sensor placement;
- computation architecture;
- repair method;
- human/alien interface;
- calibration ritual;
- redundancy pattern;
- emitted signature.

The underlying family physics remains the same.

---

## 11. Power, navigation, control, maintenance, and signature

### 11.1 Instrument power

Measurement systems should use protected clean power where possible.

If an instrument shares the propulsion bus it is observing, bus ripple and transients must be recorded as possible contamination.

### 11.2 Navigation and reference

Every measurement with spatial meaning depends on a coordinate frame.

Every measurement with temporal meaning depends on a clock.

Every claimed endpoint or route depends on reference ancestry.

These are evidence dependencies, not invisible metadata.

### 11.3 Control

Unknown transit machinery must never be energized simply because the investigation UI has a button labeled `SCAN`.

A safe control chain is:

```text
REQUEST
  ↓
AUTHORITY CHECK
  ↓
PASSIVE DATA SUFFICIENCY CHECK
  ↓
HAZARD BOUND
  ↓
ENERGY / AMPLITUDE LIMIT
  ↓
ABORT PATH PROOF
  ↓
STIMULUS
  ↓
AUTOMATIC CUTOFF
  ↓
NEW EPOCH
```

### 11.4 Maintenance

Maintenance events that invalidate or modify calibration include:

- sensor replacement;
- cable or service rerouting;
- clock replacement or resynchronization;
- firmware or model changes;
- biological healing or grafting;
- optical/interferometric realignment;
- structural movement;
- translation lexicon changes.

### 11.5 Instrument signature

Instrumentation itself can reveal the investigator.

Passive observation is generally quieter than active probing. Strong gravimetric, field, radar-like, Q-domain, or topology probes may be detectable and may modify fragile residues.

Signature cost therefore belongs in test selection.

---

## 12. Damage survivability of evidence

Different markers survive accidents differently.

| Marker | Survives well against | Vulnerable to |
|---|---|---|
| Structural geometry | power loss | breakup, scavenging, rebuild |
| Burn / heat-affected zones | data corruption | later heating, repair |
| Magnetic / EM residue | missing archives | cycling, demagnetization, later energization |
| Biological residue | missing electronics | metabolism, decay, contamination, healing |
| Digital telemetry | physical obscuration | overwrite, corruption, translation error |
| Metric/topology residual | missing labels | relaxation, reference drift, later exotic-field use |
| Service topology | missing room names | severing, rerouting, regrowth |

This table is **DERIVED** guidance, not universal physical constants.

---

## 13. Practical equipment manual MI-01 — Passive Baseline Acquisition

### Objective

Acquire the highest-value untouched state before any intervention.

### Procedure

1. Establish investigator clock and coordinate frame.
2. Photograph/map the accessible geometry without moving components.
3. Start passive EM, thermal, gravimetric, vibration, chemical/biological, and applicable exotic-field channels.
4. Record instrument dynamic-range state.
5. Record inaccessible and occluded volumes explicitly.
6. Bind calibration records.
7. Hash or otherwise identify raw acquisition products.
8. Create Epoch 0 observation packets.

### Abort / invalidation conditions

If the investigator has already energized, cut, repaired, sampled, vented, repressurized, or moved the target, do not label the resulting dataset untouched.

---

## 14. MI-02 — Calibration and ancestry audit

For every instrument answer:

- What calibrated it?
- When?
- Against what reference?
- Was the reference independent?
- Has the instrument been damaged or repaired since?
- Does it share a clock or reference with other instruments?
- What transform produced the displayed number?

A convenient ancestry diagram is:

```text
ATOMIC / STELLAR / LOCAL REFERENCE A ──┐
                                       ├─ CLOCK MASTER ── Sensor 1
                                       └─────────────── ── Sensor 2

INDEPENDENT REFERENCE B ──────────────────────────────── Sensor 3
```

Sensors 1 and 2 share a common-mode clock risk. Sensor 3 provides stronger independence.

---

## 15. MI-03 — Dynamic-range survey

Before using a missing signal as evidence:

1. verify the channel was operating;
2. verify the expected frequency/state was inside bandwidth;
3. verify the expected amplitude was above the noise floor;
4. verify no clipping or saturation occurred;
5. verify the relevant region/time was actually observed;
6. verify damage would not reasonably have erased the marker.

Only then may absence enter a family comparison with meaningful weight.

---

## 16. MI-04 — Service-trace measurement

Use the lowest-energy tracer compatible with the service type.

Record:

- start and end points;
- observed intermediate nodes;
- injected signal/energy;
- attenuation;
- branch behavior;
- interruption points;
- whether continuity was observed or inferred;
- before/after state.

Never convert physical adjacency into an observed edge.

---

## 17. MI-05 — Low-authority stimulus test

Active tests are permitted only after passive acquisition and hazard bounding.

A proposed utility function is

\[
U_T=\frac{IG(T)}{1+\lambda_hH_T+\lambda_cC_T+\lambda_sS_T+\lambda_dD_T}
\]

where information gain competes against hazard, contamination, signature, and destructive cost.

This is **PROPOSED** experiment-selection mathematics, not setting physics.

A test with enormous information gain may still be rejected because it risks destroying the installation.

---

## 18. MI-06 — Post-intervention rebaseline

After any state-changing event:

1. close the previous epoch;
2. record the intervention itself;
3. identify which evidence channels it can contaminate;
4. repeat passive baseline acquisition;
5. bind new calibration if geometry, sensors, clocks, or biological state changed;
6. relate new observations causally to the intervention.

Do not merge before and after datasets as though they describe one simultaneous state.

---

## 19. MI-07 — Telemetry translation packet

A translation packet preserves separate confidence components:

\[
C_{tr}=C_{lex}C_{sem}C_{clock}C_{context}.
\]

High lexical confidence does not repair unknown clock context.

A translation packet should retain:

```text
raw bytes / symbols
source object
source location
acquisition epoch
decoder version
lexicon version
literal gloss
semantic translation
technical interpretation
clock interpretation
confidence decomposition
provenance ancestors
```

The technical interpretation is a child of the raw record, never a replacement for it.

---

## 20. MI-08 — Forensic export review

Before export into the evidence-instance resolver verify:

- packet calibration is bound;
- clock and spatial references are explicit;
- saturation state is known;
- resolution is sufficient for the claim;
- damage survivability is considered;
- intervention epoch is correct;
- correlated source groups are labeled;
- interpretation has not been substituted for raw observation;
- player-facing disclosure level is respected;
- no family is auto-selected.

---

## 21. Worked training case — correlated clocks

Three interferometers report the same 18.2 microsecond transient offset.

At first glance the agreement appears powerful.

The ancestry audit reveals that all three instruments receive time from the same damaged master oscillator.

A fourth instrument with an independent clock does not show the transient.

Correct conclusion:

```text
OBSERVED: three channels share a coherent timestamp offset.
OBSERVED: all three share one clock ancestor.
OBSERVED: independent reference does not reproduce it.
DERIVED: common-mode clock fault is strongly plausible.
UNRESOLVED: whether any physical transit transient occurred.
```

Incorrect conclusion:

```text
CONFIRMED FOLD EVENT
```

The lesson is simple: agreement is not independence.

---

## 22. Worked training case — saturated gravimeter

A vessel passes close to a massive local body while an old gravimeter clips at full scale.

Later analysts ask whether a gravitational shear fork existed during the interval.

The recorder cannot answer from that channel because the information was destroyed by saturation.

Correct state:

```text
GRAVITY FIELD DURING CLIPPED INTERVAL: UNRESOLVED
```

not

```text
NO FORK DETECTED
```

This directly supports the source design requirement that family-specific safety depends on sufficiently advanced sensing rather than perfect interlocks.

---

## 23. Worked Ar'nock derelict application

The confirmed derelict remains an unidentified damaged Ar'nock vessel whose FTL family is **UNRESOLVED**.

The measurement layer may safely add instruments and observation packets without changing that state.

A valid early survey could produce:

```text
Packet A: biological tissue remains metabolically active in an accessible service trunk.
Packet B: two timing conduits share one damaged cultivated neural node.
Packet C: a large inaccessible volume prevents whole-vessel field-coverage assessment.
Packet D: no topology residual is resolved above the current interferometer floor.
```

Packet D does **not** mean "no Fold drive" if the instrument floor is inadequate or the marker should not be expected to survive.

Packets A and B constrain embodiment and dependency topology but do not select a family.

Packet C increases uncertainty and survey priority. It does not become evidence for whatever component an investigator hopes is hidden behind the door.

---

## 24. Educational text — undergraduate module

### Learning objectives

A student completing this unit should be able to:

1. distinguish measurement from interpretation;
2. propagate first-order uncertainty;
3. identify shared-source covariance;
4. explain saturation and aliasing;
5. construct a traceable calibration chain;
6. decide when absence is admissible evidence;
7. separate instrument capability from transit-family classification;
8. preserve an intervention history.

### Example examination prompt

> Four sensors detect the same phase anomaly, but all use one synchronization bus. A fifth independent sensor was saturated during the event. How many independent confirmations exist?

Expected reasoning: the first four form one correlated evidence group; the fifth supplies no independent negative confirmation during saturation.

---

## 25. Advanced course — inverse problems in damaged transit systems

The advanced problem is not simply estimating a parameter. It is reconstructing a partially observed machine whose sensors, geometry, service network, archives, and residues have all been altered by damage and time.

Represent the unknown installation state as \(x\), observations as \(y\), and damage/intervention history as \(d\):

\[
y=H(x,d)+n.
\]

The inverse problem seeks admissible states

\[
\mathcal X^*=\{x: L(y|x,d)\text{ remains acceptable under authority constraints}\}.
\]

The objective is not to force \(\mathcal X^*\) to one answer. If evidence supports several families, the correct engineering result is a candidate set.

---

## 26. Research and thesis program

Useful **PROPOSED** research directions include:

- covariance-aware family discrimination with shared clocks and archives;
- biological sensor calibration drift under healing and starvation;
- damage-conditioned marker survivability;
- optimal passive sensor placement in unknown vessel geometries;
- topology-residual persistence after catastrophic field collapse;
- gravimetric fork prediction under sparse baselines;
- N-Manifold hidden-obstacle observability;
- gate mouth synchronization metrology under disrupted infrastructure;
- state-cage coverage certification after structural repair;
- provenance-preserving alien technical translation.

These topics enrich the scientific history of the setting without assigning inventors or dates that canon has not established.

---

## 27. Patent-style incremental technologies

The following are **PROPOSED**, not confirmed historical patents:

### 27.1 Self-auditing calibration lattice

A distributed sensor array carries calibration ancestry beside every measurement and refuses to display a fused estimate without exposing common reference dependencies.

### 27.2 Intervention-aware residue recorder

A passive recorder automatically closes the current evidence epoch when it detects investigator cutting, power injection, atmosphere change, or field excitation.

### 27.3 Provenance-carrying translation engine

Every translated technical term remains cryptographically or structurally attached to raw symbols, decoder state, lexicon state, and source location.

### 27.4 Damage-adaptive gravimetric array

The array reweights surviving baselines after hull loss but marks the geometry change rather than pretending the original calibration still applies.

### 27.5 Whole-volume coverage tomography mesh

A distributed mesh measures whether a protected transit volume is actually covered, including deployables, repairs, docked craft, biological growth, and cargo geometry.

---

## 28. Generator rules

A generator using this authority must:

- produce instrument capabilities before claiming measurements;
- preserve raw measurements separately from interpretation;
- expose uncertainty, resolution, and saturation state;
- preserve common-source covariance;
- create intervention epochs for state-changing actions;
- use family-specific measurement requirements without using them as ownership claims;
- label generated instruments DERIVED or PROPOSED;
- keep exact universal coefficients unresolved unless sourced;
- preserve race/manufacturer attribution boundaries;
- export only admissible packets into the evidence-instance resolver.

It must not:

- invent a family because a scan mode exists;
- convert `UNRESOLVED` into zero;
- average incompatible canon into a convenient number;
- hide saturation;
- count duplicated telemetry as independent evidence;
- erase investigator contamination;
- rename a room after a favored family before classification;
- use an inaccessible compartment as positive evidence;
- turn a derived alien engineering embodiment into species ownership canon.

---

## 29. API contract

The primary resolver is:

```text
resolveTransitMeasurementPacket(context)
```

Inputs:

```text
subjectAuthoritySnapshot
instrumentInventory
calibrationRecords
rawMeasurements
eventHistory
damageModel
spatialRegistration
clockReferences
authorityMode
```

Outputs:

```text
normalizedObservationPackets
covarianceGroups
detectabilityBounds
saturationWarnings
calibrationWarnings
interventionEpochs
evidenceInstanceUpdates
canonWarnings
```

`familyAutoSelection = false` is mandatory.

Authority modes remain:

```text
AUTHORITY_ONLY
LABELED_DERIVATION
LABELED_PROPOSAL
```

---

## 30. Example packet API

```json
{
  "subjectId": "NRS-ARNOCK-DERELICT-001",
  "instrumentInstanceId": "survey-interferometer-01",
  "instrumentClass": "TOPOLOGY_AND_METRIC_RESIDUAL_INTERFEROMETER",
  "epochId": "EPOCH-0",
  "spatialRef": "ARK-C000",
  "dynamicRangeState": "IN_RANGE",
  "rawObservation": "coherent phase residual below family-discriminating threshold",
  "normalizedObservable": "phase_residual",
  "status": "DERIVED",
  "familyAssignment": null
}
```

The phrase `below family-discriminating threshold` is not equivalent to `zero` and not equivalent to `no fold drive`.

---

## 31. Readability and display guidance

Operator interfaces should show the measurement state without forcing users to read the entire provenance graph every time.

Recommended compact display:

```text
OBSERVABLE        VALUE / STATE          QUALITY
Metric residual   unresolved             resolution-limited
Clock ancestry    shared A/A/A, indep B  known
Grav gradient     measured               calibrated
Topology channel  saturated 0.4 s        unusable for absence
Bio activity      detected               contamination checked
Family result     not evaluated          forensic layer only
```

Every compact row should permit expansion into:

```text
RAW → CALIBRATION → CLOCK → REGISTRATION → DAMAGE → COVARIANCE → NORMALIZATION → INTERPRETATION
```

---

## 32. Canon safeguards

1. Preserve named and published canon over generation.
2. Keep the Ar'nock derelict transit family unresolved until evidence or a higher source establishes it.
3. Do not infer family identity from biological fabrication, crystalline construction, cultivated computation, interface style, or cultural aesthetics.
4. Do not infer race ownership from a technology-basis embodiment.
5. Do not equate Q-domain evidence or Q-MAP terminology with Phase Displacement without explicit authority.
6. Do not infer absence below resolution.
7. Do not infer absence through saturation, clipping, aliasing, or missing coverage.
8. Do not count shared-source evidence as independent.
9. Do not rewrite post-intervention residue into pre-intervention history.
10. Do not invent exact universal thresholds, gravity coefficients, range constants, or marker lifetimes.
11. Do not make generated educational or patent material historical canon.
12. Do not let a display label outrank its source and status.

---

## 33. Integration status

This manual sits immediately upstream of:

- `data/exo-vessel/ftl-evidence-instance-registry.json`;
- `data/exo-vessel/ftl-installation-archaeology-registry.json`;
- `data/exo-vessel/ftl-forensic-identification-registry.json`.

It consumes family/operator boundaries from the consolidated propulsion/transit authority and environmental measurement context from the environment-regression authority.

Its purpose is to make every future discovery more trustworthy, not more certain than the evidence deserves.

---

## 34. Final engineering principle

The best alien instrument is not the one that produces the most decisive-looking number.

It is the one that can answer:

> **What did I actually observe, what could I have missed, what assumptions shaped the answer, what changed while I was looking, and which parts of this conclusion belong to physics rather than to me?**

That is the measurement standard required for a transit corpus intended to feel as though generations of scientists, engineers, operators, salvage crews, accident investigators, and students have actually had to live with these machines.
