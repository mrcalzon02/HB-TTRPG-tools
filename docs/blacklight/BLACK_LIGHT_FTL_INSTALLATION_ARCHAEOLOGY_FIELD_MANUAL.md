# Black Light FTL Installation Archaeology Field Manual

**Authority status:** MIXED — confirmed setting/vessel/family constraints plus explicitly labeled derived engineering methods.  
**Primary design source:** *The different lightspeed methods*, Google Drive document `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`, revision `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`.  
**Machine-readable companion:** `data/exo-vessel/ftl-installation-archaeology-registry.json`.  
**Validation contract:** `data/schemas/exo-vessel-ftl-installation-archaeology.schema.json`.

---

## 1. Purpose

This manual governs the layer between **finding alien machinery** and **claiming to know what it is**.

Black Light now has a family-level FTL forensic resolver capable of distinguishing Metric Compression, Gravitational-Plane Skimming, Hyperspatial Slipstream Shear, Q-Lattice Translation, N-Manifold Transit, Fold-Jump, Anchored Wormhole/Gate Transit, Quantum Phase Displacement, and a non-FTL relativistic torch control case. That resolver still needs trustworthy observations.

Installation archaeology produces those observations.

Its job is to answer questions such as:

- What volumes appear to belong to one installation?
- Which spaces are structurally or functionally coupled?
- What power, cooling, nutrient, timing, data, field, and maintenance networks serve them?
- Which residues are operational, accidental, biological-decay products, or investigator contamination?
- Which components are primary machinery, support machinery, recovery machinery, sensors, or merely nearby systems?
- Which absences are meaningful and which are consequences of damage?
- What evidence survives strongly enough to be exported to the family forensic resolver?

It does **not** answer “what FTL family is this?” by itself.

That separation is deliberate.

---

## 2. Canon firewall

The current Ar'nock derelict is confirmed to contain biological printers, medical systems, cultivated computation, environmental controls, storage, fabrication feedstock, damaged networks, and inaccessible compartments. It has no immediately readable name, registry, destination, or complete surviving historical explanation.

Those facts do not establish its transit family.

The following inference is prohibited:

```text
ALIEN BIOLOGICAL MACHINERY
        ↓
LOOKS LIKE A DRIVE
        ↓
PICK AN FTL FAMILY
        ↓
WRITE THE ROOM AS CANON
```

The allowed process is:

```text
RAW OBSERVATION
      ↓
SPATIAL / DEPENDENCY MAPPING
      ↓
DAMAGE + PROVENANCE REVIEW
      ↓
BOUNDED FUNCTIONAL HYPOTHESIS
      ↓
OPERATOR-LEVEL EVIDENCE EXPORT
      ↓
FTL FORENSIC RESOLVER
      ↓
ONLY THEN: FAMILY PROMOTION IF EARNED
```

A room name is therefore a **claim**.

“Compartment A-47 contains three concentric living annuli fed by two high-capacity energy trunks and one isolated timing network” is an observation-rich statement.

“Compartment A-47 is the Fold chamber” is a conclusion that requires additional evidence.

---

## 3. Installation as a multiplex graph

A vessel cannot be understood from floorplan adjacency alone.

Represent the installation as

\[
G_I=(V,E_S,E_P,E_T,E_F,E_D,E_C,E_M,\ldots)
\]

where the same compartment nodes \(V\) are connected through different edge layers:

- \(E_S\): structural load paths,
- \(E_P\): power distribution,
- \(E_T\): thermal/cooling paths,
- \(E_F\): fluidic or nutrient paths,
- \(E_D\): data/control,
- \(E_C\): clock/reference synchronization,
- \(E_M\): maintenance and access,
- plus field, crew, cargo, and external-interface layers as required.

Do not collapse these into one generic graph.

A compartment can be adjacent in the floorplan but isolated in timing and power. Two physically distant volumes can belong to one installation if they share a dedicated field network and mutually isolated recovery plant.

### 3.1 Why topology matters

Consider three unknown rooms:

```text
            [U-17]
          /   |   \
      POWER  DATA  COOLING
        /      |      \
   [U-04]---FIELD---[U-31]
        \             /
         \--TIMING---/
```

If U-04 and U-31 share a timing network and field bus not used elsewhere on the vessel, while U-17 supplies their power and cooling, the three rooms are stronger candidates for one functional installation than three neighboring chambers that share only ordinary ship services.

That statement remains true without knowing the transit family.

---

## 4. Neutral compartment records

Every compartment receives a neutral identifier before functional naming.

Minimum record:

```text
compartmentId
observedLabel
geometry
accessState
damageState
machineryObjects
residueObservations
structuralInterfaces
serviceInterfaces
archiveObjects
instrumentCoverage
provenanceRefs
unknowns
functionalHypotheses[]
```

`observedLabel` should preserve a genuine recovered glyph, translated label, crew annotation, or archive identifier if one exists. Do not replace it with the investigator's preferred interpretation.

### 4.1 Access states

Use:

`DIRECT`, `REMOTE_SENSOR`, `PARTIAL_VIEW`, `SEALED`, `BLOCKED`, `DESTROYED`, or `UNLOCATED`.

A sealed chamber is not an empty chamber.

A destroyed chamber is not evidence that no machinery existed there.

An unlocated chamber is not permission to invent a missing component.

---

## 5. Evidence weight

A compartment observation receives a derived working weight

\[
W_c=R_cD_cP_cS_c
\]

where:

- \(R_c\) is measurement reliability,
- \(D_c\) is damage-adjusted detectability,
- \(P_c\) is provenance independence,
- \(S_c\) is spatial specificity.

Each term is bounded from 0 to 1.

This is not canon probability. It is an engineering bookkeeping measure.

A high-resolution scanner reading of a visible intact field former can have high \(R\), \(D\), and \(S\). Five translated maintenance screens copied from one damaged archive ancestor may have high apparent detail but low provenance independence.

---

## 6. Damage-aware negative evidence

Absence becomes meaningful only when a marker could have survived and been observed.

Use the derived indicator

\[
A^-_m=I_mV_mS_m(1-D_m)
\]

where:

- \(I_m\): instrument capability,
- \(V_m\): relevant volume coverage,
- \(S_m\): expected survivability of the marker,
- \(D_m\): destructive damage fraction.

If \(A^-_m\) is low, “not found” carries little contradiction strength.

Example: the investigators do not find a paired-mouth synchronization processor. If forty percent of the suspected machinery complex is missing and the timing network is burned through, that absence cannot strongly falsify Gate Transit.

Conversely, if the timing plant is intact, fully surveyed, and demonstrably lacks any remote-mouth reference architecture, the absence becomes more meaningful.

---

## 7. Dependency centrality

A suspected transit installation often reveals itself through unusual dependence patterns before its operator is known.

Define a derived multi-layer centrality:

\[
C_d(v)=\sum_l\alpha_lC_l(v)
\]

where \(C_l(v)\) is a compartment's centrality in service layer \(l\), and \(\alpha_l\) is scenario-specific.

This does not mean “highest centrality = drive room.”

A reactor room may dominate power. A command center may dominate data. A spinal structural junction may dominate load transfer.

The useful signal is the **pattern**.

A transit-scale installation may combine:

- unusually strong power feed,
- dedicated cooling or nutrient supply,
- isolated timing/reference service,
- whole-hull field connection,
- structural reinforcement,
- independent recovery reserve,
- unusually dense sensing or telemetry.

The combination is more informative than any single feature.

---

## 8. Geometry consistency

Once a family hypothesis exists, observed geometry can be compared with the geometry implied by that operator.

A derived fit measure is

\[
G_f=\exp\left(-\frac12\delta_g^T\Sigma_g^{-1}\delta_g\right)
\]

where \(\delta_g\) is the difference between observed installation geometry and the family-conditioned geometry predicted from confirmed physics.

Again: ranking aid, not canon probability.

Examples of geometry questions include:

- Does the machinery cover the whole protected vessel volume?
- Are field-former sectors distributed in a way compatible with hull-scale control?
- Does a supposed Fold system contain geometry capable of defining an origin protected volume?
- Does a supposed Gate system possess installation-scale anchoring and aperture control rather than only a shipboard ring?
- Does a proposed Phase Displacement system have state-cage coverage rather than merely a local scanner?
- Does an N-Manifold hypothesis have independent return-map instrumentation?

---

## 9. Damage stratigraphy

Alien wreckage is not one moment frozen in time.

Investigators must separate:

1. normal operating wear,
2. pre-accident maintenance,
3. initiating failure,
4. secondary casualty damage,
5. abandonment decay,
6. biological necrosis or dormancy,
7. post-accident regrowth,
8. autonomous repair,
9. later scavenging,
10. operative intervention.

A useful relative sequence can be built without knowing calendar dates.

```text
ORIGINAL INSTALLATION
        ↓
CYCLIC SERVICE WEAR
        ↓
PRIMARY FAILURE
        ↓
SECONDARY STRUCTURAL DAMAGE
        ↓
POWER LOSS / BIOLOGICAL DIEBACK
        ↓
PARTIAL REGROWTH
        ↓
CURRENT INVESTIGATION
```

Do not mistake the final geometry for the original geometry.

For Ar'nock machinery this matters especially because living structures may heal, scar, atrophy, migrate, or regrow around surviving service lines.

A healed machine is not necessarily the same calibrated machine.

---

## 10. Residue archaeology

Residues include more than soot.

Record:

- electromagnetic remanence,
- abnormal gravimetric gradients,
- Q-state residuals,
- topology anomalies,
- thermal gradients,
- chemical products,
- biological stress markers,
- vibration histories where materials preserve them,
- wake/deposit traces,
- radiation or particle activation,
- strain memory,
- field-induced material alignment.

The residue record needs spatial location, measurement uncertainty, instrument identity, observation time, damage context, and intervention ancestry.

### 10.1 Contamination rule

Every action capable of altering evidence must be logged:

- opening a sealed compartment,
- energizing a bus,
- cutting a wall,
- moving a component,
- flushing a line,
- changing atmosphere,
- heating frozen machinery,
- supplying nutrients,
- allowing living systems to heal,
- applying a field,
- connecting a translation device.

The post-intervention state remains useful evidence, but it is not the pristine state.

---

## 11. Family-conditioned installation expectations

These are **derived expectations constrained by confirmed operator physics**, not evidence that the Ar'nock vessel contains the family.

### 11.1 Metric Compression Envelope

Look for distributed whole-vessel field geometry, metric/curvature sensing, structural compensation, sector timing, and independent unwind/recovery authority.

A local annular machine alone is insufficient.

### 11.2 Gravitational-Plane Skimmer

Look for long-baseline gravimetry, differential hull coupling, structural paths compatible with distributed loading, and navigation records keyed to gradients, shear branches, or focal terrain.

### 11.3 Hyperspatial Slipstream Shear

Look for Q-boundary sensing, distributed adhesion sectors, sectional correction pathways, forward environmental prediction, wake records, and detachment reserves.

### 11.4 Q-Lattice Phase Translation

Look for discrete address/epoch handling, synchronized reference meshes, protected-state cage coverage, alias rejection logic, and translation/recovery state buffers.

### 11.5 N-Dimensional Manifold Drive

Look for multi-axis instrumentation, parity/axis control, higher-dimensional tomography, separate return-map certification machinery, and route-computation infrastructure whose scaling grows sharply with active dimensionality.

### 11.6 Discrete Fold-Jump

Look for protected-volume definition, endpoint-proof machinery, topology-forming systems, precommit logic, closure/ringing recovery, and little evidence for post-commit steering.

### 11.7 Anchored Wormhole / Gate Transit

Look for installation-scale anchoring, aperture control, paired-mouth synchronization, remote-state authentication, mass-flux traffic machinery, chronology protection, and infrastructure characteristics larger than a normal shipboard drive.

### 11.8 Quantum Phase Displacement

Look for whole-object state mapping, continuity-invariant certification, target-state compatibility, reference ancestry controls, state-cage coverage, and post-arrival reconciliation machinery.

### 11.9 Relativistic Inertial Torch control case

Look for causal momentum exchange, continuous thrust load paths, reaction mass or beam/plasma momentum handling, thermal rejection, and acceleration-related structural evidence sufficient to explain propulsion without a nonlocal operator.

---

## 12. Practical manual IA-01 — pre-entry exterior survey

**Objective:** preserve evidence before opening or energizing anything.

Procedure:

1. Record vessel attitude, spin, thermal state, local gravity environment, nearby debris, and external radiation conditions.
2. Build an exterior geometry model.
3. Identify hull discontinuities, apertures, large annular structures, emitters, external sensor baselines, radiators, scars, and missing sections.
4. Perform passive field survey across all available channels.
5. Record thermal and chemical plumes.
6. Map external structural damage and debris trajectories where possible.
7. Mark areas whose evidence may be destroyed by docking, cutting, repressurization, heating, or atmosphere change.
8. Only then begin physical entry.

**Stop condition:** any unexplained active field, pressure hazard, autonomous defensive response, or structure whose disturbance could energize unknown machinery.

---

## 13. Practical manual IA-02 — compartment geometry census

**Objective:** create a neutral ship map.

Do not begin with “bridge,” “engine room,” or “FTL bay.” Begin with identifiers.

Example:

```text
A-01  accessible, degraded
A-02  accessible, intact
A-03  blocked, remote sensor only
A-04  sealed, no line of sight
...
```

For every volume record:

- length/width/height or irregular volume model,
- structural axis,
- doors and penetrations,
- equipment mounting geometry,
- human and Ar'nock accessibility,
- service interfaces,
- evidence of missing equipment,
- damage boundaries,
- biological viability,
- uncertainties.

The output is a geometry authority, not a room-name list.

---

## 14. Practical manual IA-03 — multiplex dependency mapping

**Objective:** find installation clusters.

Trace separately:

- primary energy,
- stored energy,
- cooling,
- nutrient/fluidic supply,
- command/data,
- clock/reference,
- field bus,
- structural reinforcement,
- crew/maintenance access,
- external interface.

Use color or layer coding in operator displays, but preserve the underlying typed graph.

### Diagnostic example

Suppose three compartments share:

- an isolated high-capacity power trunk,
- a dedicated timing loop,
- whole-hull field fibers,
- emergency thermal sinks,
- and structural reinforcement.

That is strong evidence they participate in one high-energy field installation.

It is **not yet evidence of which family**.

---

## 15. Practical manual IA-04 — residue and damage stratigraphy

**Objective:** distinguish original operation from wreckage artifacts.

Sample before cleaning.

Record spatial layers rather than only bulk composition.

For biological systems distinguish:

- viable tissue,
- dormant tissue,
- necrotic tissue,
- scarred tissue,
- regrowth,
- foreign graft,
- contamination.

A regrown conduit may reconnect a system while changing impedance, geometry, timing delay, field response, or structural compliance.

Never equate “alive again” with “certified again.”

---

## 16. Practical manual IA-05 — archive and telemetry ancestry

**Objective:** recover data without manufacturing independent confirmations.

Every recovered datum should retain:

```text
physical storage source
logical source identifier
clock/reference ancestry
translation version
checksum / integrity state
repair or reconstruction operations
parent record(s)
confidence/status
```

If four consoles all display a route reconstructed from one damaged navigation archive, that is one evidence lineage.

If a maintenance organ and an independent flight recorder agree using separate clocks and storage ancestry, that can be two independent lineages.

---

## 17. Practical manual IA-06 — functional hypothesis review

A machinery role should not be assigned from shape alone.

Promotion to `FUNCTION_INTERPRETED` requires:

- geometry or direct behavior supporting the role,
- plus at least one independent service/dependency, residue, telemetry, or load-path lineage.

Example:

A large biological ring becomes a credible **field former** if:

1. its geometry is compatible with generating a field over a known volume, and
2. a dedicated high-energy feed plus surviving field residue independently support that function.

It does **not** become a Fold former until operator-level evidence supports Fold physics.

---

## 18. Practical manual IA-07 — low-authority reversible excitation

Passive evidence comes first.

When passive methods cannot answer an important question, choose the test with useful information gain and bounded hazard:

\[
U_T=\frac{IG(T)}{1+\lambda_hH_T+\lambda_dD_T+\lambda_cC_T}.
\]

The test should:

- remain below commit-capable authority,
- have a known shutoff path,
- isolate the tested component from whole-vessel transit machinery where possible,
- preserve pre-test observations,
- instrument all relevant channels,
- stop automatically on unexpected topology, field, thermal, structural, or biological escalation.

Never energize an unknown system merely because “seeing what happens” would identify it faster.

---

## 19. Practical manual IA-08 — post-intervention recertification

After repair, cutting, regrowth, replacement, movement, or energization:

1. repeat geometry survey,
2. repeat dependency tracing,
3. repeat residue baseline,
4. record changed configuration,
5. link changed observations to intervention provenance,
6. invalidate calibration assumptions that depended on prior geometry,
7. rerun family-specific certification only if the system had already earned a family classification.

This is especially important for living machinery.

---

## 20. Ar'nock derelict survey program

The current case remains:

```text
VESSEL: unidentified damaged Ar'nock vessel
FTL FAMILY: UNRESOLVED
INSTALLATION ARCHAEOLOGY: ACTIVE
```

The next useful work inside the fiction is not “find the Fold core.”

It is:

1. freeze neutral compartment identifiers,
2. map all high-capacity service trunks,
3. identify unusual timing/reference islands,
4. locate whole-hull field pathways,
5. identify independent reserve systems,
6. image structural load paths around inaccessible large volumes,
7. capture residues before breach,
8. recover route and maintenance telemetry,
9. compare functional clusters against family operator expectations,
10. export only defensible operator-level observations to the forensic resolver.

### 20.1 Example evidence packet

A defensible packet might read:

```text
Observation: compartment C-112 contains a circumferential living structure.
Geometry: 18.4 m equivalent diameter, non-circular, six sectional nodes.
Power: dedicated high-capacity trunk, currently open-circuit upstream.
Timing: isolated reference loop shared with C-113 and C-119.
Field residue: weak non-EM residual detected; family unresolved.
Damage: two sectional nodes necrotic, one missing.
Archive ancestry: none.
Interpretation: probable high-energy field-forming component [DERIVED].
Family export: geometry + timing + residue observations only.
```

It must not read:

```text
The Ar'nock Fold ring is damaged.
```

unless later evidence earns that label.

---

## 21. Educational text — undergraduate installation forensics

### 21.1 Lesson: machines are systems, not objects

Students are given a room containing a large alien device and asked what it does.

The correct first answer is not a device name.

The correct questions are:

- What is connected to it?
- What loads pass through it?
- What does its geometry enclose or act upon?
- What residues surround it?
- What structures resist its forces?
- What control and timing systems serve it?
- What maintenance access exists?
- What changed when it failed?

### 21.2 Lesson: absence is conditional

A missing component falsifies a hypothesis only when the inspection was capable of detecting it.

This is the same logic used in experimental science: a null result is meaningful only when the experiment had sensitivity to the predicted effect.

### 21.3 Lesson: provenance is engineering

Source ancestry is not clerical paperwork. It changes the strength of the evidence.

Five measurements derived from one damaged sensor are not five confirmations.

---

## 22. Advanced course — transit installation inverse problems

Installation archaeology is an inverse problem.

We observe a damaged present state \(Y\) and attempt to infer a bounded set of historical installation states \(X\):

\[
Y=\mathcal H(X,D,I)+\epsilon
\]

where:

- \(\mathcal H\) is the observation process,
- \(D\) is accumulated damage and decay,
- \(I\) is investigator intervention,
- \(\epsilon\) is measurement/model error.

The problem is generally non-unique.

Therefore the objective is not to manufacture one vivid reconstruction. It is to narrow the admissible set while preserving uncertainty.

A mature solver returns:

- supported functions,
- alternate functions,
- contradictions,
- unknown volumes,
- evidence ancestry,
- tests that discriminate among alternatives.

---

## 23. Research and thesis directions

The following are `PROPOSED` research programs unless separately sourced:

- **Damage-aware field-residue inversion:** reconstruct original field topology from partial residuals and missing emitters.
- **Biological machinery morphometry:** distinguish calibrated regrowth from geometrically significant repair drift.
- **Multiplex installation graph inference:** infer hidden components from service topology without treating them as observed.
- **Transit-system load-path archaeology:** estimate original force distribution from reinforcement and fatigue patterns.
- **Archive ancestry reconstruction:** mathematically recover independence groups from damaged distributed storage.
- **Cross-family false-friend catalog:** identify machinery shapes and signals shared across multiple FTL families.
- **Minimal-risk active identification:** optimize low-authority test sequences for high information gain and low evidence loss.

---

## 24. Patent-style developmental examples

These are `PROPOSED` invention classes, not setting-historical patents or named inventors.

### 24.1 Multi-layer service tomography

A maintenance scanner that simultaneously maps power, coolant, nutrient, timing, and field carriers while preserving each network as a separate topology layer.

### 24.2 Residue-before-breach recorder

A stand-off system designed to capture fragile field and chemical evidence around sealed machinery spaces before opening changes pressure, temperature, or field boundary conditions.

### 24.3 Biological calibration-drift imager

A scanner that compares living machinery's present morphology with archived calibration geometry and predicts which regrowth regions require recertification.

### 24.4 Provenance-locked translation workstation

A translation environment where every interpreted term retains source bytes/glyphs, model version, operator edits, confidence, and parent ancestry.

---

## 25. API contract

Primary resolver:

```text
resolveTransitInstallationArchaeology(...)
```

Inputs:

```text
subject
compartments
interfaces
observations
damageModel
instrumentCapabilities
interventionLog
sourceSnapshot
authorityMode
```

Outputs:

```text
installationGraph
compartmentHypotheses
dependencyClusters
evidenceRecords
damageStratigraphy
unknownVolumes
recommendedInspections
forensicExports
provenanceGraph
canonWarnings
```

The resolver may produce:

```json
{
  "compartmentId": "C-112",
  "functionalHypotheses": [
    {
      "role": "high-energy field former",
      "status": "DERIVED",
      "support": ["geometry-group-14", "power-lineage-3", "residue-lineage-7"]
    }
  ],
  "family": "UNRESOLVED"
}
```

It may not silently produce:

```json
{
  "family": "fold-jump",
  "reason": "looks like a fold ring"
}
```

Family classification remains owned by `resolveTransitForensics()`.

---

## 26. Generator rules

When generating installation archaeology:

1. Start from authoritative observed facts.
2. Create neutral compartment identifiers before semantic names.
3. Preserve inaccessible volumes as unknown.
4. Separate network layers.
5. Track damage and detectability.
6. Track evidence ancestry.
7. Label derived functional hypotheses.
8. Export observations, not conclusions, to family forensics.
9. Preserve contradictions.
10. Record interventions.
11. Never upgrade species style into family ownership.
12. Never use generated material as independent evidence for itself.

### 26.1 Disclosure control

Player-facing text must respect the current classification state.

If the engineering record says:

```text
FUNCTION: probable field former
FAMILY: unresolved
```

acceptable prose is:

> A segmented living structure encircles the chamber, fed by thick energy vessels and an isolated timing lattice. Some weak field residue remains in the scarred surrounding structure.

Unacceptable prose is:

> You enter the Ar'nock jump-drive room.

The latter leaks an unearned answer.

---

## 27. Provenance model

```text
FOUNDATION LORE
  │
  ├── Ar'nock derelict observations
  └── Ar'nock species / machinery constraints
  │
  ▼
PROPULSION / TRANSIT AUTHORITY
  │
  ▼
FAMILY TECHNICAL VOLUMES
  │
  ▼
FTL FORENSIC IDENTIFICATION
  │
  ▼
INSTALLATION ARCHAEOLOGY
  │
  ├── compartment records
  ├── typed dependency graph
  ├── residues
  ├── damage stratigraphy
  ├── archive ancestry
  └── bounded functional hypotheses
  │
  ▼
FORENSIC EVIDENCE EXPORT
  │
  ▼
FAMILY CLASSIFICATION
```

The arrow does not run backward. A generated family hypothesis cannot rewrite the raw observations that produced it.

---

## 28. Final authority rules

The installation-archaeology layer exists to make Black Light's engineering corpus deeper without making it less trustworthy.

Its central safeguards are:

\[
\boxed{\text{unknown space} \neq \text{support for preferred theory}}
\]

\[
\boxed{\text{room appearance} \neq \text{machine function}}
\]

\[
\boxed{\text{machine function} \neq \text{FTL family}}
\]

\[
\boxed{\text{generated reconstruction} \neq \text{historical canon}}
\]

and, for the present Ar'nock case:

\[
\boxed{\text{FTL FAMILY = UNRESOLVED}}
\]

That unresolved state is not a lack of development. It is a controlled scientific state with explicit evidence requirements, measurable next investigations, bounded hypotheses, and an increasingly detailed technical corpus ready to accept a conclusion when the setting actually earns one.
