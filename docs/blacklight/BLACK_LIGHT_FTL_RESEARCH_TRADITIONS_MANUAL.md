# Black Light FTL Research Traditions, Patent Lineages & Engineering Education Manual

**Status:** subordinate engineering, research-history, provenance, education, maintenance, and generator reference.  
**Primary authority:** `docs/blacklight/BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md`.  
**Machine-readable source:** `data/exo-vessel/ftl-research-tradition-registry.json`.  
**Legacy design source:** Google Drive document **“The different lightspeed methods”**, file ID `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`, retrieved revision `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`.

The legacy source explicitly asks for mathematically realistic transit functions, different gravity/error coefficients, safety and emergency de-transit systems that mature with transit performance, vigorous documentation, full educational courses, thesis-level mathematical treatments, design documents, and alien patent-style incremental improvements. This manual provides that **research-culture and documentation layer**. It does not invent historical ownership.

`CONFIRMED` means directly recovered authority within the stated scope. `DERIVED` is a constrained engineering consequence. `PROPOSED` is an extension awaiting adoption. `UNRESOLVED` means the repository does not establish the fact. A plausible alien engineering history is not automatically setting history.

---

## 1. Why research tradition is a real engineering variable

Two civilizations may possess the same confirmed FTL family and Path maturity while building machines that differ radically. The family fixes the physical action. The Path level fixes the class of problem that can be solved. Technology basis fixes what kinds of machinery can embody the solution. A **research tradition** explains how the civilization represents the problem, what it measures first, what it considers proof, how it records uncertainty, which failures it treats as fundamental, and which improvements it can discover efficiently.

The resolver therefore becomes

\[
R_{instance}=T_{basis}\left(T_{tradition}\left(T_{family}(E,P,T,V)\right)\right).
\]

`T_tradition` is deliberately subordinate. It may change solver style, instruments, service doctrine, training, patent families, and optimization preferences. It may not turn Fold-Jump into N-Manifold transit or assign a drive to a race without authority.

```mermaid
flowchart LR
    A[Confirmed family operator] --> B[Path mathematical capability]
    B --> C[Technology-basis machinery]
    C --> D[Research tradition]
    D --> E[Instruments / proofs / patents]
    E --> F[Shipboard embodiment]
    F --> G[Maintenance & incident doctrine]
    G --> H[Generated instance provenance]
```

---

## 2. The common invention equation

Every credible technological improvement must cross five linked steps:

\[
\boxed{\mathcal M_n\rightarrow\mathcal P_{n+1}\rightarrow\mathcal H_{n+1}\rightarrow\Delta\Lambda\rightarrow\Delta R}
\]

where `M` is the previously solvable model, `P` is a new proof/estimator/algorithm or experimentally established relation, `H` is the instrument/material/control system capable of realizing it, `ΔΛ` is the engineering limit actually moved, and `ΔR` is the resulting range, efficiency, gravity tolerance, safety margin, scale reduction, or maintainability gain.

A patent or historical invention that skips the middle three terms is not useful worldbuilding. “A more powerful drive doubled range” is insufficient. “A covariance-aware endpoint solver reduced fold-solution rejection by ranking several admissible topologies, enabled by higher-dynamic-range gravimetry and sectional topology waveguides” is a valid development statement.

---

## 3. Research schools by transit family

### 3.1 Metric Geometry School

The Metric Compression Envelope is studied as a constrained geometry/control problem:

\[
J_M=\int_\Gamma\sqrt{\gamma^{eff}_{ij}dx^idx^j}+\lambda_h H+\lambda_s S+\lambda_r R.
\]

The first term is effective route length; the additional terms penalize horizon formation, structural burden, and poor recovery margin. A primitive school begins with interferometry and fixed weak-field perturbations. Mature schools teach closed three-dimensional boundary solving, causal-horizon proofs, tensor-field optimal control, gravity-conditioned routing, and structural co-design. Their characteristic inventions are better phased sectors, clocks, active materials, load paths, regional controllers, and recovery systems—not merely “bigger warp cores.”

**Practical laboratory note:** a lower measured proper interval is not evidence of a usable drive unless field closure, payload coverage, causal exit, and structural residuals all pass independently.

### 3.2 Natural Geometry Navigation School

Gravitational-Plane Skimmer research treats the universe itself as infrastructure:

\[
J_G(\Gamma)=\int_\Gamma(1+a_g\chi_g+a_t\chi_t+a_u u_r+a_f p_{fork})\,ds.
\]

The decisive breakthroughs are often metrological rather than energetic: finer gravimetry, longer baselines, better mass-map assimilation, branch prediction, and faster controlled decoupling. Mature doctrine prices uncertainty explicitly instead of hiding it inside a generic safety factor.

**Incident rule:** if a skimmer draws unexpectedly high power, diagnose route geometry and coupling quality before assuming a failed reactor.

### 3.3 Boundary Dynamics School

Slipstream Shear researchers study a moving metastable boundary:

\[
J_S=w_q\epsilon_q+w_v\epsilon_v+w_a(1-A_{adh})+w_x\epsilon_{exit}.
\]

The school therefore merges propulsion, navigation, meteorology, control theory, and emergency recovery. Stronger adhesion without better prediction is a dangerous dead end: a machine that grips a failing boundary more tightly can make de-transit worse.

### 3.4 Discrete State Topology School

Q-Lattice research treats transit as addressable graph traversal:

\[
\mathcal G_Q=(V_Q,E_Q),\qquad J_Q(P)=\sum_{e\in P}(c_e+\lambda_u u_e+\lambda_a a_e)+\lambda_c(1-C_{coverage}).
\]

The core intellectual technologies are stable addressing, epoch synchronization, reachability proofs, anti-alias theory, and trusted-reference graph optimization. Hardware follows: resonators, cage clocks, state buffers, beacon indexes, and anti-alias estimators.

**Operator doctrine:** a geometrically correct destination with the wrong Q address or epoch is not a small navigation error. It is the wrong state-transition target.

### 3.5 Embedding Geometry School

N-Manifold transit is a higher-dimensional shortest-path problem constrained by return quality:

\[
J_N=D_N+\lambda_\kappa\kappa(R_{return})+\lambda_g C_g+\lambda_u U.
\]

A civilization may discover extra axes long before it can use them. The practical historical transition occurs when it can prove that a shortcut has a sufficiently conditioned projection back into ordinary spacetime. Mature schools explicitly reject “shortest manifold route wins.”

### 3.6 Adjacency Topology School

Fold-Jump research asks whether two protected volumes can be placed into safe temporary adjacency:

\[
J_F=w_d d_{M'}(A,B)+w_c\Sigma_{end}+w_o O+w_g G+w_r R.
\]

The progression is local adjacency -> finite protected volume -> paired endpoints -> moving origin -> multiple candidate solutions -> gravity/reference-conditioned long fold -> adaptive precommit solving.

The exact physical field geometry, including a toroidal closed-boundary implementation, remains implementation-specific unless higher authority confirms it. The invariant is the adjacency operation.

```text
ordinary topology:       A ------------------------------ B
candidate manipulation:  A --------\              /------ B
                                 \____ADJACENT____/
commit state:            [protected A volume] ~ [target B volume]
```

**Commit discipline:** after topology commit, operators do not pretend they are steering through ordinary distance. Meaningful authority shifts to execution monitoring, occupancy protection, topology integrity, and recovery.

### 3.7 Aperture Topology School

Wormhole/Gate researchers move from throat existence to transportation engineering. Strategic performance often depends on

\[
t_{total}=t_{approach}+t_{queue}+t_{sync}+t_{aperture}+t_{departure}.
\]

The most important inventions may live in infrastructure rather than aboard ships: throat support, mouth clocks, reserve-energy plants, traffic scheduling, state telemetry, anchoring, and chronology-safe network standards.

### 3.8 State Correspondence School

Phase Displacement research works on the validity of a nonlocal state map

\[
J:\Psi_A\rightarrow\Psi_B
\]

subject to bounded invariants

\[
C_k(\Psi_A,\Psi_B)\le\epsilon_k.
\]

Its development therefore depends on representation, sensing, provenance, identity/continuity theory, target authentication, and uncertainty rejection. More energy is useful only after the destination state is known well enough to define a valid mapping.

---

## 4. The same science through seven technology bases

| Technology basis | What counts as a laboratory | Typical research record | Characteristic maintenance evidence |
|---|---|---|---|
| Terrestrial mechanical | metrology lab, test stand, simulation cluster | standards, equations, patents, test reports | calibration logs, component wear, phase residuals |
| Aquatic pressure | pressure-stable wet lab and distributed fluid sensor volume | flow maps, hydroacoustic records, pressure-qualified design ledgers | cavitation, chemistry drift, seal/flow asymmetry |
| Cryogenic | low-noise cryostat and superconducting reference network | cooldown qualification, coherence ledgers, thermal proofs | quench history, thermal gradients, reference noise |
| Gas-giant floating | buoyant distributed observatory across atmospheric layers | long-baseline atmospheric charts and calibration ephemerides | membrane strain, buoyancy changes, baseline deformation |
| Biological symbiotic | cultivated sensory/field tissues and trained neural networks | growth lineages, physiological codices, phenotypic design records | tissue fatigue, neural disagreement, metabolic reserve |
| Mineral crystalline | grown crystal domains and resonance/defect laboratories | lattice inscriptions, defect atlases, prestress maps | domain fractures, resonance drift, defect migration |
| Postmaterial | dynamically reconfigurable experimental body/reference mesh | executable proofs and authenticated reconstruction histories | reference divergence, reconstruction mismatch, coherence debt |

These mappings are `DERIVED`. They describe how a known technology basis could conduct the same family research. They do not establish which race owns which transit technology.

---

## 5. Patent lineage without false canon

A Black Light patent-style record should contain at least:

```json
{
  "family": "fold-jump",
  "pathBand": "P3-P4",
  "problem": "moving-origin endpoint covariance",
  "mathematicalAdvance": "rank several admissible adjacency solutions under reference uncertainty",
  "physicalEnabler": "redundant topology solvers, sectional waveguides and improved gravimetry",
  "changedLimit": "endpoint covariance and precommit rejection margin",
  "performanceEffect": "more valid long-range solutions with earlier rejection of unsafe folds",
  "inventor": null,
  "inventorStatus": "UNRESOLVED",
  "historyStatus": "DERIVED"
}
```

The null inventor is important. A convincing invention is not evidence that a particular civilization invented it. A named inventor, laboratory, company, polity, date, war, disaster, or first-use claim must be inherited from higher authority.

---

## 6. Research disputes make the corpus believable

| Family | Plausible mature dispute |
|---|---|
| Metric | maximize route contraction vs preserve larger causal/recovery margin |
| Gravitic | exploit high-gain shear vs choose lower-gain route with better fork observability |
| Slipstream | stronger adhesion authority vs easier emergency detachment |
| Q-Lattice | shortest address path vs most strongly authenticated path |
| N-Manifold | shortest geodesic vs best-conditioned return map |
| Fold-Jump | minimum manipulated separation vs lowest endpoint covariance/occupancy risk |
| Gate | peak aperture throughput vs lifetime/stability/maintenance interval |
| Phase | broad target acceptance vs strict continuity/identity rejection |

These disputes can later support schools, regulations, manufacturers, and cultural engineering styles, but named historical attribution remains unresolved until sourced.

---

## 7. Practical equipment manual: post-incident mathematical reconstruction

After any abnormal transit, technicians reconstruct the event in this order:

1. Freeze family, Path level, shared tier, technology basis, vessel mass/volume, route, environment, solver version, reference epoch, and named-source overrides.
2. Test clock, gravimetric, Q-state, beacon, mouth-state, target-state, or endpoint references appropriate to the family.
3. Re-run the exact solution with recorded inputs and determine whether it was valid under the model certified at departure.
4. Compare requested field/structure/control/recovery authority with measured available authority.
5. Reconstruct detection, solving, command, field response, and exit timing.
6. Compare predicted loading and recovery heat with measured deformation and sink history.
7. Determine whether gravity, shear, Q-weather, occupancy, or reference uncertainty exceeded the model's certified domain.
8. Classify the primary defect as mathematics, reference data, field/material authority, structure, control, recovery, environment, infrastructure, or unresolved interaction.

The mandatory safety relation remains

\[
L_{sensor}\ge v_{eff}(t_{detect}+t_{solve}+t_{command}+t_{field}+t_{exit})+D_{margin}.
\]

A failure to satisfy it is not repaired by better crew reaction time alone.

---

## 8. Educational corpus

Every mature family should support at least seven instructional layers.

**Public primer:** what the drive changes physically, what it does not do, and why gravity and safety matter.

**Operator course:** spool, route acceptance, commit boundaries, warnings, abort logic, infrastructure coordination.

**Maintainer qualification:** reference calibration, local machinery tests, failure signatures, contamination/fatigue, recovery systems, safe isolation.

**Engineering degree:** governing mathematics, numerical methods, instrumentation, materials, structural integration, control, and uncertainty.

**Navigation specialization:** environment reconstruction, route optimization, reference trust, exclusion volumes, fork/alias/return/target analysis.

**Incident and forensic school:** telemetry preservation, reconstruction, model-vs-hardware fault separation, post-event uncertainty.

**Research/thesis track:** open mathematical problems, estimators, material limits, topology/geometry proofs, experimental design, and falsifiable proposals.

A generated thesis proposal should identify

\[
\text{known operator}+\text{current limiting term}+\text{proposed mathematical improvement}+\text{required physical experiment}+\text{falsification criterion}.
\]

Without the falsification criterion it is flavor text rather than a research document.

---

## 9. Generator and API contract

The research-tradition resolver accepts:

```json
{
  "family": "n-manifold",
  "pathLevel": "P4",
  "sharedTier": "T4",
  "technologyBasis": "MINERAL_CRYSTALLINE",
  "namedEntityAuthority": null,
  "environment": "binary-shear",
  "vesselScale": "cruiser",
  "mode": "LABELED_DERIVATION"
}
```

and returns family research school, objective function, relevant disciplines, instrumentation tradition, patent classes, education sequence, failure-review doctrine, and field-level provenance.

Three modes remain mandatory: `AUTHORITY_ONLY` leaves unresolved facts unresolved; `LABELED_DERIVATION` permits constrained consequences as `DERIVED`; `LABELED_PROPOSAL` permits speculative numeric calibration, names, or experimental extensions as `PROPOSED`. No mode may upgrade generated repetition into canon.

---

## 10. Canon and origin safeguards

1. Family physics comes from the confirmed transit family and higher named sources.
2. Path mathematics comes from established P0-P6 development authority.
3. Technology basis changes embodiment and research medium, not possession.
4. Research-school names in this manual are organizational conveniences and remain `DERIVED`.
5. Patent classes are invention categories, not proof of historical patents.
6. A race or manufacturer may be attached only when higher authority directly supports the association.
7. Unknown inventors, dates, institutions, and first-use events remain `UNRESOLVED`.
8. Numeric coefficients are `PROPOSED` until deliberately calibrated/adopted.
9. A generated vessel may retain instance-local authoritative provenance, but it never rewrites setting-wide history.
10. If later canon conflicts with this manual, later specific canon wins and this layer must be re-resolved rather than defended.

---

## 11. Next research depth

The next coherent layer is a set of **worked academic and engineering documents**: one proof note, one operator training handout, one maintenance bulletin, one incident report, and one thesis proposal for each family. Those artifacts can then be rendered through each technology basis while preserving identical underlying physics and explicit provenance.
