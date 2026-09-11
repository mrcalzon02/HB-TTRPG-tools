# BLACK LIGHT FTL TECHNOLOGY ANCESTRY & HYBRID INTEGRATION MANUAL

**Status:** MIXED — authority integration, derived engineering doctrine, and explicitly proposed interface mathematics  
**Primary authority:** `docs/blacklight/BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md`  
**Design-intent source:** *The different lightspeed methods*  
**Source document ID:** `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`  
**Source revision:** `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`  
**Machine registry:** `data/exo-vessel/ftl-technology-ancestry-registry.json`  
**Runtime:** `blacklight-exo-ftl-technology-ancestry-runtime.js`

---

## 1. Purpose

Black Light now distinguishes four things that are routinely and incorrectly collapsed into one label:

1. who owns the vessel;
2. who operates the vessel;
3. who manufactured a subsystem;
4. which engineering tradition and technology basis the subsystem descends from.

The distinction is mandatory for propulsion and FTL because a vessel may contain native engines, imported field coils, captured navigation hardware, reverse-engineered control organs, licensed gate references, salvaged recovery machinery, or a purpose-built hybrid installation.

The governing rule is:

\[
\boxed{\text{owner}\neq\text{operator}\neq\text{manufacturer}\neq\text{inventor}\neq\text{technology ancestry}}
\]

unless an authoritative source explicitly says that they are the same.

This manual prevents the generator from turning species identity into a universal engineering stereotype.

---

## 2. Authority and canon boundary

The current design-intent document requires family-specific gravity sensitivity, miscalculation loss, safety sensing, emergency de-transit, increasing technological safety margins, and physically credible mathematics. It does **not** say that every machine used by a civilization must have been invented by that civilization.

Therefore:

\[
\boxed{\text{race/species identity}\not\Rightarrow\text{technology basis}}
\]

\[
\boxed{\text{technology ancestry}\not\Rightarrow\text{FTL family}}
\]

\[
\boxed{\text{continued use}\not\Rightarrow\text{native manufacture}}
\]

Named canon always outranks this manual.

The Zwlei Mur'rek remain a named hardware case with their own wet machinery and unresolved transit-family classification. The Ar'nock remain a named biological/interface case without a universal all-technology organic assignment and without an automatically inferred FTL family.

---

## 3. The ancestry record

Every materially important propulsion/transit subsystem may carry an ancestry record:

```text
origin record
 ├─ origin id
 ├─ origin mode
 ├─ technology basis
 ├─ named source / manufacturer
 ├─ provenance status
 ├─ source references
 ├─ subsystem roles
 └─ interface packet
```

The supported origin modes are:

| Mode | Meaning |
|---|---|
| NATIVE | designed and manufactured within the owning engineering tradition |
| LICENSED | locally built from an externally sourced design/license |
| IMPORTED | externally manufactured hardware installed in the vessel |
| CAPTURED | retained from adversarial or nonconsensual acquisition |
| SALVAGED | recovered hardware with potentially incomplete service ancestry |
| REVERSE_ENGINEERED | locally reproduced/adapted from studied external hardware |
| HYBRID | intentionally combines multiple traditions or technology bases |
| UNKNOWN | origin remains unresolved |

The mode is provenance, not a performance multiplier.

---

## 4. Provenance states

Each origin's basis claim carries one of four states:

- **CONFIRMED** — an authoritative source explicitly establishes the basis or exact mapping.
- **DERIVED** — the basis is an engineering interpretation supported by evidence but not directly stated.
- **PROPOSED** — a design possibility or generator extension.
- **UNRESOLVED** — insufficient evidence.

Auto-population is intentionally strict:

\[
\text{auto-populate basis}
\iff
\text{exactly one material basis is CONFIRMED}
\]

If multiple confirmed bases participate:

\[
\boxed{\text{basis state}=\text{CONFIRMED\_MULTI}}
\]

No majority vote is permitted.

---

## 5. Why majority basis is bad engineering

Suppose a ship contains:

- a terrestrial reactor;
- a Mur'rek-derived wet gravitic regulator;
- a mineral-photonic timing spine;
- an imported wormhole throat stabilizer;
- local mechanical structure.

Counting components and declaring the vessel “terrestrial technology” destroys the information that matters for maintenance, failure analysis, field alignment, and recovery.

The correct representation is a graph:

```text
[reactor ancestry]
       |
       v
[power interface] ---> [field regulator ancestry]
                              |
                              v
[timing ancestry] ---> [control / phase interface]
                              |
                              v
                    [transit operator hardware]
                              |
                              v
                     [recovery architecture]
```

The safety question is not “Which culture has more boxes?”

It is “Can every required interface remain within its physical envelope while preserving an abort path?”

---

## 6. Interface graph

A mixed-origin installation is represented as a directed multigraph:

\[
G_A=(V,E_P,E_T,E_C,E_H,E_S,E_N,E_R)
\]

where:

- \(V\) are ancestry-bearing subsystems;
- \(E_P\) power interfaces;
- \(E_T\) timing/reference interfaces;
- \(E_C\) control/data interfaces;
- \(E_H\) thermal/service-environment interfaces;
- \(E_S\) structural/field-reference interfaces;
- \(E_N\) navigation/metrology interfaces;
- \(E_R\) recovery/abort interfaces.

Physical adjacency does not imply an engineering connection.

A recovered cable, fluid line, neural graft, optical path, or field coupling should be represented by the interface type it actually provides.

---

## 7. Control coordination

For a control command that must cross an origin boundary, define the proposed dimensionless coordination number:

\[
\Pi_c=\frac{L_{interface}}{v_{signal}\tau_{response}}.
\]

Here:

- \(L_{interface}\) is the effective propagation distance;
- \(v_{signal}\) is signal or actuation-information velocity through the interface;
- \(\tau_{response}\) is the required response timescale.

Interpretation:

- \(\Pi_c\ll1\): communication latency is small relative to control response;
- \(\Pi_c\sim1\): latency materially consumes control margin;
- \(\Pi_c>1\): a central controller cannot reliably command the required response before the local process evolves.

A large mixed-origin installation should therefore acquire regional autonomy rather than a larger centralized bridge display.

---

## 8. Timing and phase coherence

FTL machinery frequently depends on coherent timing, phase, geometry, or reference state.

For an interface whose upstream and downstream systems do not share a native timing standard:

\[
\Pi_t=\frac{\sigma_t}{\tau_{phase}}
\]

where \(\sigma_t\) is effective timing jitter after translation and \(\tau_{phase}\) is the permitted phase/coherence window.

The certification implication is straightforward:

\[
\Pi_t\ge1
\Rightarrow
\text{coherent high-authority operation is not demonstrated}.
\]

More power cannot repair a timing-reference mismatch.

---

## 9. Thermal and service-environment compatibility

Alien machinery may require environments that are mutually hostile.

Examples include:

- warm humid wet biological decks;
- dielectric immersion;
- cryogenic superconductive spaces;
- high-pressure reactive atmospheres;
- clean resonance-controlled mineral spaces;
- dry terrestrial electrical cabinets.

For subsystem \(i\), define the normalized service margin:

\[
M_{T,i}=\min\left(
\frac{T_{max,i}-T_{oper,i}}{\Delta T_{ref}},
\frac{T_{oper,i}-T_{min,i}}{\Delta T_{ref}}
\right).
\]

The coupled installation is limited by:

\[
M_T=\min_i(M_{T,i}).
\]

If \(M_T\le0\), at least one component is outside its certified thermal/service state.

This form is deliberately generic. Chemical, pressure, radiation, humidity, biological, and dielectric compatibility should receive equivalent service margins where relevant rather than being converted into fake temperature numbers.

---

## 10. Power and protected recovery

For a coupled installation:

\[
M_P=
\frac{P_{available}-P_{nominal}-P_{recovery,reserved}}
{\max(P_{nominal},\epsilon)}.
\]

A positive nominal power margin is not sufficient unless the recovery reserve is excluded from ordinary use.

The key rule remains:

\[
\boxed{\text{recovery power is escrowed power}}
\]

A captured or imported subsystem cannot be permitted to consume the final recovery reserve simply because its native control philosophy expects a different emergency architecture.

---

## 11. Recovery cut sets

A hybrid system can possess abundant total reserve while still having no usable abort path.

Represent each required recovery path as a cut set with surviving authority \(R_k\):

\[
R_{survive}=\min_k R_k.
\]

If any required cut set has zero surviving authority:

\[
R_{survive}\le0
\Rightarrow
\text{recovery architecture fails certification}.
\]

This is intentionally a weakest-path measure, not an average.

---

## 12. Navigation and metrology translation

A hybrid installation may need to translate between fundamentally different route representations.

Examples:

- numerical covariance matrices;
- flowing current fields;
- crystal resonance modes;
- neural sensory manifolds;
- pressure-layer topology;
- live field-state geometry.

Translation should be modeled as:

\[
\mathcal T_{a\rightarrow b}:X_a\rightarrow X_b
\]

with explicit uncertainty growth:

\[
\Sigma_b = J_{\mathcal T}\Sigma_aJ_{\mathcal T}^{T}+\Sigma_{translation}.
\]

A translation layer that hides \(\Sigma_{translation}\) is unsafe.

The human-readable display is never the native state itself.

---

## 13. Scaling behavior

Hybridization introduces scale burdens beyond raw vessel mass.

A proposed integration burden is:

\[
B_I=
\alpha_oN_o+
\alpha_bN_b+
\alpha_eN_e+
\alpha_rN_r+
\alpha_dD_I
\]

where:

- \(N_o\) = material origin count;
- \(N_b\) = distinct technology-basis count;
- \(N_e\) = certified interface count;
- \(N_r\) = independent recovery regions;
- \(D_I\) = interface dependency depth.

This is a design heuristic, not a universal law. It encodes the physically reasonable fact that a four-origin installation usually has more certification boundaries than a one-origin installation even if both have equal mass.

---

## 14. Signature model

Mixed-origin machinery can create composite signatures:

\[
\mathbf S_{hybrid}=
\sum_i\mathbf S_i+
\sum_{i\ne j}\mathbf S_{ij}^{interface}.
\]

The interface term matters.

A wet electrochemical subsystem joined to a terrestrial electrical bus may create galvanic or ionic signatures not present in either subsystem alone. A cryogenic-photonic timing package coupled through warm conversion electronics may create thermal cycling and optical leakage signatures. A biological controller driving mineral resonators may produce characteristic mechanical sidebands.

Hybrid does not mean stealth.

---

## 15. Failure taxonomy

### 15.1 Provenance failure

The machine works, but its origin record is wrong or incomplete.

Operational consequence: wrong maintenance assumptions, wrong parts, wrong calibration ancestry.

### 15.2 Translation failure

The native system state is converted incorrectly into another culture's representation.

Operational consequence: false confidence without a physical subsystem failure.

### 15.3 Environmental incompatibility

Two otherwise functional systems cannot coexist in one service state without isolation.

### 15.4 Timing-domain failure

Each subsystem remains individually healthy, but their clocks/reference states diverge.

### 15.5 Adapter saturation

The interface converter reaches its bandwidth, power, thermal, pressure, chemical, or dynamic-range limit.

### 15.6 Recovery-path mismatch

The nominal transit path functions, but the foreign subsystem's emergency behavior does not cooperate with the host recovery architecture.

### 15.7 False domestication

Long service history causes maintainers to treat imported/captured machinery as if it were native and fully understood.

This is a provenance error, not a technological maturation event.

---

## 16. Generator rules

The generator must preserve these rules:

```text
IF authoritative source explicitly names one basis
    -> CONFIRMED_SINGLE
ELSE IF multiple confirmed bases materially participate
    -> CONFIRMED_MULTI
ELSE IF only derived basis candidates exist
    -> DERIVED_CANDIDATE
ELSE
    -> UNRESOLVED
```

Never:

```text
species name -> technology basis
owner -> manufacturer
operator -> inventor
captured -> native
reverse engineered -> ancestry erased
majority component count -> safety authority
```

---

## 17. API contract

The runtime entrypoint is:

`resolveFTLTechnologyAncestry(context)`

Input may contain:

```json
{
  "transitFamily": "metric-compression",
  "origins": [
    {
      "originId": "reactor",
      "originMode": "NATIVE",
      "technologyBasis": "TERRESTRIAL_ELECTROMECHANICAL_INDUSTRIAL",
      "provenanceStatus": "CONFIRMED",
      "sourceRefs": ["source-a"],
      "roles": ["prime-power"]
    },
    {
      "originId": "timing-spine",
      "originMode": "IMPORTED",
      "technologyBasis": "MINERAL_PIEZOELECTRIC_PHOTONIC",
      "provenanceStatus": "CONFIRMED",
      "sourceRefs": ["source-b"],
      "roles": ["timing-reference"]
    }
  ]
}
```

The result retains both bases and returns `CONFIRMED_MULTI`; it does not select one.

---

## 18. Practical equipment procedure TA-01 — Origin inventory

1. De-energize or place the installation in the safest inspectable state.
2. Identify materially distinct subsystems.
3. Record manufacturer marks, biological lineage markers, crystal signatures, materials, connector standards, control dialects, service media, and repair history.
4. Separate owner/operator markings from manufacturer evidence.
5. Record unknowns as unknowns.
6. Assign no technology basis until evidence supports it.

Acceptance criterion: every material subsystem has an origin record or an explicit unresolved placeholder.

---

## 19. TA-02 — Interface boundary survey

1. Trace power crossing each origin boundary.
2. Trace timing/reference links independently.
3. Trace control/data links.
4. Record thermal, pressure, chemistry, dielectric, biological, and mechanical isolation.
5. Identify navigation/metrology translation stages.
6. Trace every recovery/abort path.

Acceptance criterion: no required safety path depends on an undocumented interface.

---

## 20. TA-03 — Timing compatibility test

1. Establish independent time references on both sides of the interface.
2. Measure jitter and drift under nominal load.
3. Repeat under spool, transit simulation, abort-command simulation, and recovery load.
4. Determine the smallest applicable phase/coherence window.
5. Compute \(\Pi_t\).
6. Reject high-authority coordination if the measured margin is inadequate.

Do not improve the reported result by filtering away physically real jitter.

---

## 21. TA-04 — Service-environment compatibility

1. Record native operating environment for each ancestry-bearing subsystem.
2. Record the actual local environment.
3. Identify conversion boundaries.
4. Inspect seals, thermal breaks, pressure boundaries, fluid isolation, biological barriers, vibration isolation, and reference frames.
5. Calculate bounded service margins where source data permit.
6. Leave missing dimensions unresolved.

Acceptance criterion: all required subsystems remain inside their certified service envelope simultaneously.

---

## 22. TA-05 — Protected recovery audit

1. Enumerate the recovery action expected from every participating subsystem.
2. Identify the power, pressure, stored field energy, cold reserve, chemical reserve, biological energy, or structural authority used by each action.
3. Identify shared resources.
4. Remove nominal-use allocations from the recovery budget.
5. Compute each recovery cut set.
6. Reject if any mandatory path lacks surviving authority.

---

## 23. TA-06 — Captured/imported hardware audit

Captured and imported hardware require extra questions:

- Is the current operator using the original service doctrine?
- Are calibration references authentic?
- Are hidden lockouts or identity checks present?
- Does the current maintenance environment reproduce the original one?
- Has translation replaced native diagnostics?
- Has the unit been modified without updated certification?

Age in service is not proof of understanding.

---

## 24. TA-07 — Reverse-engineered lineage audit

For reverse-engineered machinery:

1. identify the source technology;
2. identify which geometry, materials, algorithms, organs, resonators, or field principles were copied;
3. identify which portions were redesigned locally;
4. separate source ancestry from present manufacturer;
5. recertify every changed interface;
6. preserve the lineage in export.

The result is neither purely native nor merely imported.

---

## 25. TA-08 — Hybrid vessel dossier export

Before export verify that:

- every material origin survives serialization;
- provenance state survives serialization;
- manufacturer and operator remain separate;
- multiple confirmed bases remain multiple;
- interface metrics remain explicitly proposed/measured/derived as appropriate;
- unresolved values remain unresolved;
- the FTL family was not inferred from ancestry.

---

## 26. Educational text — introductory problem

A human polity operates a vessel with a locally built reactor, an imported mineral timing lattice, and a salvaged wet regulator of unknown origin.

Question: what is the vessel's technology basis?

Correct answer: the question is malformed if it expects one value.

The installation contains at least two established engineering ancestries and one unresolved ancestry. The correct object is a provenance graph plus an interface-certification record.

---

## 27. Transit Integration Engineering 630

### Course scope

A graduate-level course in mixed-origin propulsion and FTL systems.

### Modules

1. provenance reconstruction;
2. technology-basis taxonomy;
3. timing-domain translation;
4. service-environment isolation;
5. multi-origin navigation metrology;
6. power and recovery escrow;
7. adapter saturation and nonlinear control;
8. failure propagation across cultural engineering boundaries;
9. captured and reverse-engineered machinery;
10. certification of intentionally hybrid vessels.

### Laboratory requirement

Students must construct a complete ancestry and interface graph for a three-origin transit installation and demonstrate that no averaging operation hides a failed recovery path.

---

## 28. Research and thesis directions

### 28.1 Cross-basis timing translators

Study physically bounded translation between timing systems whose native reference concepts differ.

### 28.2 Native-state preserving maintenance translators

Develop tools that expose foreign diagnostics without overwriting the native state representation.

### 28.3 Hybrid recovery graph synthesis

Find minimum independent abort architectures that remain safe across multiple engineering traditions.

### 28.4 Provenance-aware fault isolation

Use ancestry information to improve diagnosis without stereotyping failure by species.

### 28.5 Adaptive service-environment interfaces

Develop boundaries that can maintain radically different pressure, chemistry, temperature, biological, and field-reference regimes in adjacent machinery.

---

## 29. Proposed patent-class concepts

All concepts in this section are **PROPOSED**, not setting canon.

### 29.1 Provenance-Preserving Interface Passport

A hardware-bound record that carries manufacturer, ancestry, service envelope, translation chain, and calibration history through installation changes.

### 29.2 Recovery Cut-Set Escrow Controller

A controller that prevents nominal subsystems from consuming resources required by any certified hybrid recovery path.

### 29.3 Multi-Domain Coherence Bridge

A timing/reference translator that reports added covariance rather than pretending the translation is exact.

### 29.4 Service-Envelope Membrane

A configurable physical boundary providing thermal, pressure, chemical, electrical, biological, and metrology isolation between incompatible machines.

### 29.5 Ancestry-Aware Diagnostic Compiler

A translator that maps native diagnostic states into operator-readable form while cryptographically retaining the untranslated source state and provenance.

---

## 30. Canon safeguards

1. A race is not a technology basis.
2. A polity is not a manufacturer.
3. A manufacturer is not necessarily an inventor.
4. A vessel owner is not necessarily the builder.
5. Captured hardware does not become native through repeated use.
6. Reverse engineering does not erase source ancestry.
7. A hybrid installation may have multiple confirmed bases.
8. Missing compatibility data is unresolved, not zero.
9. More total power cannot fix timing, geometry, chemistry, pressure, biological, or reference incompatibility.
10. Technology ancestry cannot select an FTL family.
11. Generic models remain subordinate to named canon.
12. Proposed mathematics remain proposed until setting sources or measured datasets establish numerical values.

---

## 31. Integration sequence

```text
named source / manufacturer / installation evidence
                   |
                   v
         technology ancestry records
                   |
                   v
       basis-resolution state machine
                   |
        +----------+-----------+
        |                      |
        v                      v
control embodiment      interface certification
        |                      |
        +----------+-----------+
                   v
         route safety certificate
                   |
                   v
          provenance-safe dossier
```

This order is deliberate.

The generator should know what the machinery is and where it came from before it decides how to render its controls, service it, certify its interfaces, or explain its failures.

---

## 32. Closing engineering rule

The most believable interstellar technology base is not one in which every civilization owns a perfectly isolated tech tree.

It is one in which hardware has history.

Machines are sold, stolen, licensed, copied, repaired, captured, salvaged, inherited, misunderstood, improved, mistranslated, and hybridized.

The engineering corpus must preserve that history without allowing narrative ancestry to substitute for physics.

\[
\boxed{\text{provenance tells us where the machine came from; certification tells us whether it can be trusted now}}
\]
