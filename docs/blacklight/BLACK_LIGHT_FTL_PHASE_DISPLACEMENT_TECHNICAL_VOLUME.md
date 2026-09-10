# Black Light FTL Technical Volume — Quantum Phase Displacement

**Status:** MIXED — recovered family identity and development roles are authoritative within their source scope; engineering mathematics and embodiments below are DERIVED unless explicitly marked otherwise.

**Primary authority:** `docs/blacklight/BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md`

**Development lineage:** `data/exo-vessel/ftl-development-lineage-registry.json`

**Technology-basis embodiments:** `data/exo-vessel/ftl-family-basis-embodiment-registry.json`

**Legacy design source:** Google Drive document *The different lightspeed methods*, file `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`, current reconciled revision `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`.

---

## 1. Family identity

Quantum Phase Displacement maps a protected macroscopic source state to a compatible nonlocal target state while preserving the continuity invariants required by the installation, operator doctrine, and setting authority.

It is not Metric Compression, because it does not continuously reshape a route. It is not Slipstream, because there is no continuously ridden Q-boundary. It is not Q-Lattice, because the target is not selected merely as an indexed quantized address and epoch. It is not Fold-Jump, because the source and destination are not made temporarily adjacent. It is not Gate Transit, because no persistent throat is maintained between endpoints.

The engineering question is therefore not simply, **“Where does the ship go?”** It is:

> Can this exact certified protected state be mapped to that exact admissible target state while preserving every invariant the system is required to preserve, with enough evidence to prove that the target is unique, unoccupied, recoverable, and still valid at commit?

That question defines the machinery.

---

## 2. Canon and provenance guard

The recovered family action and exact P0–P6 historical-role names outrank extrapolation in this document. Equations below are engineering models intended to make that canon calculable and generatable; they do not supersede it.

The following rule is mandatory:

```text
CONFIRMED source fact
        ↓
DERIVED engineering consequence
        ↓
PROPOSED coefficient / example / training case
        ↓
NEVER silently promoted upward
```

A generated technical record must retain its own provenance. A training accident is not historical canon. A patent-style developmental invention does not acquire a named inventor unless a source supplies one. A machinery basis does not establish which race invented or possesses the drive.

---

## 3. The mathematical object

Represent the certified source state as

\[
S_o = \{z_o,\Omega_o,R_o,I_o,E_o\},
\]

where \(z_o\) is a state descriptor, \(\Omega_o\) is the protected payload domain, \(R_o\) is the authenticated reference set, \(I_o\) is the configured invariant set, and \(E_o\) is the local environment.

A displacement event applies a nonlocal map

\[
\mathcal D_\tau:S_o\rightarrow S_t.
\]

The parameter \(\tau\) denotes the committed mapping solution, not ordinary travel time through the intervening region.

The destination is a **target state**, not merely a coordinate.

---

## 4. Target-state compatibility

Let \(z^*\) describe the target state demanded by navigation, local environment, exclusion rules, and receiving conditions. A derived compatibility distance is

\[
d_C(S_t,S^*)=
\sqrt{(z_t-z^*)^T W_C(z_t-z^*)}.
\]

The weighting matrix \(W_C\) determines which discrepancies matter most for the current vehicle and operation. Its coefficients are not universal setting constants.

A cargo pallet may tolerate state discrepancies that a living crew compartment, antimatter containment system, active reactor, biological vessel, or postmaterial coherence volume cannot.

Thus:

\[
d_C\le d_{C,\max}
\]

is necessary but not sufficient for commit.

---

## 5. Continuity invariants

The family lineage establishes identity/continuity preservation as an engineering concern. It does not establish a universal philosophical solution to personal identity.

The practical controller therefore works with an explicit invariant set:

\[
I=\{I_1,I_2,\ldots,I_n\}.
\]

Possible invariant classes may include, depending on authority and payload type:

- conserved physical quantities;
- protected subsystem state;
- cryptographically authenticated configuration history;
- biological continuity markers;
- reference-state ancestry;
- software/process continuity for synthetic or postmaterial systems;
- vessel topology and component identity;
- legally or culturally mandated continuity records.

These examples are DERIVED categories. A specific culture's metaphysical interpretation remains unresolved unless sourced.

Define a derived continuity margin

\[
\mu_I=I_{available}-I_{required}.
\]

A planned mapping requires

\[
\mu_I>0.
\]

The important operator display is not simply **IDENTITY: PASS**. A defensible display says what was checked:

```text
CONTINUITY CERTIFICATE
Physical conserved-state checks      PASS
Protected configuration ancestry     PASS
Biological reference set             PASS
Independent reference roots          3
Common-mode reference warning        NONE
Unresolved philosophical identity    NOT CLAIMED
```

---

## 6. Whole-object coverage

A phase-displacement machine cannot certify only the average ship. Every required payload region must be enclosed by the protected state map.

Let \(c(x)\) be local state-cage coverage over payload domain \(\Omega_p\). Define

\[
\mu_C=
\min_{x\in\Omega_p}c(x)-c_{required}.
\]

Therefore:

\[
\mu_C\le0\Rightarrow\text{COMMIT VETO}.
\]

This is intentionally a minimum, not an average. A deployment mast, docked cutter, repair blister, cargo sling, unfolded radiator, biological growth, or temporary field cable can invalidate an otherwise excellent whole-ship average.

### Coverage diagram

```text
          FORWARD TARGET / REFERENCE ARRAY
        <------------------------------>

        +==============================+
        || C1  C2  C3  C4  C5  C6    ||
        ||                              ||
        ||      PROTECTED PAYLOAD       ||
        ||                              ||
        || C7  C8  C9 C10 C11 C12     ||
        +==============================+
              |              |
        continuity refs   mapper buses
              |              |
        +--------------------------------+
        | isolated recovery/reconciliation|
        +--------------------------------+

     Any required local sector below threshold
                    = NO COMMIT
```

---

## 7. Target covariance and evidence independence

Long-baseline displacement becomes difficult even when energy is abundant because the target must be known well enough to establish a unique, safe state correspondence.

A useful covariance decomposition is

\[
\Sigma_T=
J_n\Sigma_{nav}J_n^T
+\Sigma_{ref}
+\Sigma_{model}
+\Sigma_{grav}
+\Sigma_{occ}.
\]

This separates navigation error, reference uncertainty, model error, gravity/environment uncertainty, and occupancy uncertainty.

### Correlation safeguard

Three observations derived from one beacon are not three independent confirmations.

If

```text
Beacon A clock ──┬── navigator solution
                 ├── occupancy solution
                 └── target-state solution
```

then failure of Beacon A may corrupt all three apparent votes simultaneously.

The system must track evidence ancestry:

```text
Observation
   ↓
Sensor / archive / beacon
   ↓
Reference root
   ↓
Independence class
   ↓
Confidence contribution
```

A generator may report three channels but must not call them independent if they share the same root.

---

## 8. Hard commit admissibility

Phase displacement is not safely represented as a weighted score in which a favorable range result can compensate for an occupied target or failed continuity proof.

Use hard veto logic:

\[
A_{commit}=
(d_C\le d_{max})
\land(\mu_I>0)
\land(\mu_C>0)
\land A_{target}
\land X_{clear}
\land R_{valid}.
\]

Where:

- \(A_{target}\): target evidence is authenticated;
- \(X_{clear}\): target exclusion/occupancy state is admissible;
- \(R_{valid}\): protected recovery authority remains available.

Only after every hard veto passes should the controller rank multiple admissible candidates.

---

## 9. Candidate target optimization

For admissible target \(k\), a derived cost function may be

\[
J_k=
 w_c d_{C,k}
+w_u U_k
+w_r R_k
+w_e E_k
+w_s S_k,
\]

representing compatibility distance, uncertainty, recovery burden, energy burden, and signature/strategic burden.

The optimum is

\[
k^*=\arg\min_{k\in\mathcal A}J_k,
\]

where \(\mathcal A\) is the already-admissible set.

This ordering matters. Unsafe candidates never enter the ranking stage.

---

## 10. Safety horizon

The legacy source requires safety sensing and emergency de-transit sophistication to increase with drive performance. For Phase Displacement, the decisive interval is precommit plus protected reconciliation:

\[
T_{precommit}\ge
 t_{detect}
+t_{auth}
+t_{model}
+t_{crosscheck}
+t_{command}
+t_{state}
+t_{recovery}
+t_{margin}.
\]

A mature system can safely commit later because sensing, authentication, target inference, state preparation, and recovery all become faster. It does not become perfectly safe.

---

## 11. Recovered development sequence

| Path | Recovered historical role | Engineering meaning |
|---|---|---|
| P0 | Quantum State Conveyor | Proves controlled nonlocal mapping of simple prepared states. |
| P1 | Gram-to-Tonne Displacement Vault | Extends state mapping to bounded macroscopic matter. |
| P2 | Macroscopic Phase Chamber | Preserves defined continuity invariants across complex payloads. |
| P3 | Beacon-Coupled Vessel Displacement | Resolves remote target state against authenticated beacon observations. |
| P4 | Autonomous Phase Drive | Infers compatible targets without a fully prepared receiver. |
| P5 | Strategic Nonlocal Transit Core | Solves long-baseline compatibility under imperfect observations. |
| P6 | Compact Identity-Preserving Displacer | Continuously solves target compatibility and invariant preservation in compact real time. |

The technological progression is therefore:

\[
\boxed{
\text{simple prepared state}
\rightarrow
\text{macroscopic state}
\rightarrow
\text{continuity-preserving payload}
\rightarrow
\text{authenticated remote target}
\rightarrow
\text{autonomous target inference}
\rightarrow
\text{strategic uncertain target}
\rightarrow
\text{compact continuous certification}
}
\]

---

## 12. Machinery embodiment

A working Phase-Displacement drive is a whole-vessel installation.

### 12.1 Energy conditioning

Supplies preparation, reference excitation, target lock, mapping, reconciliation, and protected recovery power. The recovery reserve must be independently observable.

### 12.2 State mapper

Implements the actual family operator over the protected source state. Its physical embodiment varies with technology basis; its function does not.

### 12.3 Whole-object state cage

Defines which matter, fields, subsystems, crew, cargo, appendages, and attached craft are part of the certified displacement state.

### 12.4 Continuity-reference system

Maintains the invariant evidence and source-state ancestry used to prove that the committed mapping satisfies the configured continuity requirements.

### 12.5 Target sensing and authentication

Builds the destination state from beacons, astronomy, gravimetry, local endpoint reports, historical records, and other available evidence while preserving provenance.

### 12.6 Transit controller

Applies hard vetoes, candidate ranking, countdown control, commit authority, and forensic event logging.

### 12.7 Reconciliation and recovery plant

Keeps the arrival in a protected state long enough to verify correspondence, isolate anomalies, and normalize vessel systems.

### 12.8 Independent control / thermal / abort backbone

Prevents one mapper fault from simultaneously destroying clocks, evidence logs, heat rejection, interlocks, and recovery authority.

---

## 13. Power model

A useful event decomposition is

\[
E_{event}=E_{prepare}+E_{reference}+E_{target-lock}+E_{map}+E_{reconcile}+E_{recovery}.
\]

The operationally available energy is not all stored energy:

\[
E_{discretionary}=E_{stored}-E_{protected\ recovery}.
\]

A route that works only by consuming protected recovery reserve is inadmissible.

More reactor power cannot compensate for an occupied target, missing payload coverage, corrupt reference ancestry, unresolved aliasing, or failed continuity certification.

---

## 14. Scaling behavior

Phase-Displacement scaling is not simply proportional to payload mass.

A conceptual burden function is

\[
B_{PD}=f(M,V,A,N_{interfaces},N_{articulation},C_{state},\Sigma_T,R_q).
\]

Relevant growth terms include mass, protected volume, surface/interface count, articulated geometry, state complexity, target covariance, and required reference quality.

A massive inert cargo ingot may be an easier payload than a much lighter vessel containing living crew, active computation, volatile field systems, externally docked craft, distributed biological structures, and rapidly changing internal state.

### Parallel machinery

Multiple mapper modules do not simply add displacement capacity. Their cages, reference roots, timing systems, and recovery paths must remain coherent. Common-mode references can make nominal redundancy illusory.

---

## 15. Navigation and target control

A mature navigator should expose at least:

```text
SOURCE MODEL          current / stale / invalid
TARGET AUTHORITY      authenticated / predicted / unresolved
TARGET COVARIANCE     bounded estimate + provenance
OCCUPANCY STATE       clear / occupied / unresolved
CONTINUITY MARGIN     positive / warning / veto
MIN COVERAGE MARGIN   positive / warning / veto
REFERENCE ROOTS       independent classes, not raw sensor count
RECOVERY RESERVE      protected available authority
COMMIT STATE          hold / admissible / veto
```

The UI must not collapse unresolved evidence into a green aggregate percentage.

---

## 16. Practical equipment manual

### PD-01 — Pre-Displacement Certification

1. Freeze the displacement configuration record.
2. Inventory the complete payload, external modules, docking state, cargo, deployed surfaces, repair structures, and active field systems.
3. Authenticate local continuity-reference roots.
4. Verify reference independence rather than merely channel count.
5. Survey every state-cage sector and compute minimum coverage margin.
6. Build the current source-state model.
7. Acquire target evidence and retain observation provenance.
8. Compute target covariance and occupancy/exclusion state.
9. Evaluate compatibility and continuity invariants.
10. Reserve reconciliation/recovery energy.
11. Execute commit only when all hard vetoes independently pass.

### PD-02 — Target Ambiguity Alarm

**Indication:** two or more target states remain plausible.

**Action:**

1. Freeze the commit countdown.
2. Split target evidence by provenance root.
3. Remove false independence caused by shared beacons, clocks, ephemerides, or models.
4. Recompute candidate covariance.
5. Reject any candidate with unresolved occupancy conflict.
6. Resume only if one target becomes admissible under current rules.

Do not average two incompatible target states into one apparently precise state.

### PD-03 — Continuity-Invariant Disagreement

1. Hold before commit.
2. Identify the exact invariant that failed.
3. Identify which observation or reference supplied each conflicting value.
4. Check isolated onboard reference stores.
5. Re-run the source-state measurement if physical configuration may have changed.
6. Abort if the configured required set cannot be certified.

### PD-04 — Coverage Fault

1. Hold commit.
2. Localize the minimum-coverage sector.
3. Compare with current geometry manifest.
4. Inspect for repairs, deployed appendages, docked loads, cargo movement, biological growth, deformation, or failed cage media.
5. Repair the authoritative source of the coverage loss.
6. Re-survey the whole protected domain; do not waive the weak region because average coverage remains high.

### PD-05 — Post-Arrival Reconciliation

1. Keep ordinary external interfaces restricted.
2. Acquire local arrival environment independently of the precommit target model.
3. Compare arrival state against the committed state and invariant record.
4. Quarantine discrepant subsystems or payload zones.
5. Confirm recovery reserve remains sufficient for normalization.
6. Release systems progressively after evidence converges.
7. Preserve complete event records for engineering review.

---

## 17. Maintenance doctrine

### State-cage coverage survey

Coverage is a geometry problem and a media-health problem. Survey after structural work, docking configuration changes, major cargo reconfiguration, hull growth, or any repair that passes through protected-volume boundaries.

### Reference-root independence audit

The audit asks **“How many independent facts exist?”**, not **“How many instruments show green?”**

### State-media integrity test

Measure mapper drift, hysteresis, thermal sensitivity, radiation damage, biological health, lattice defects, or coherence decay according to technology basis.

### Target-model residual review

Persistent coherent residuals are evidence. They must not be dismissed as generic sensor noise merely because accepting them invalidates the planned displacement.

### Recovery-system proof test

Recovery must be testable without relying on the same controller, energy path, or state media whose failure would require recovery.

---

## 18. Failure taxonomy

| Failure | Immediate engineering meaning | Required response |
|---|---|---|
| Coverage hole | Required payload region is outside certified state map | Commit veto; repair and re-survey |
| Target alias | More than one target remains consistent with evidence | Freeze commit; acquire independent evidence |
| Continuity-proof failure | Required invariants disagree or cannot be demonstrated | Commit veto / quarantine |
| Reference poisoning | Trusted evidence is stale, corrupt, or falsely independent | Rebuild evidence chain |
| Occupancy conflict | Target volume cannot be certified compatible and clear | Hard veto |
| Reconciliation divergence | Arrival state does not converge on committed expectation | Maintain protected quarantine |
| Recovery exhaustion | Safe normalization authority unavailable | Route/event inadmissible before commit |
| Configuration drift | Certified source model no longer matches actual payload | Re-inventory and rebuild source state |

“Drive overload” is not an acceptable final root cause if one of these lower-level causes can be established.

---

## 19. Signature model

The drive can produce both preparation and event signatures.

A derived observation vector is

\[
\mathbf S_{PD}=
\{S_{ref},S_{cage},S_{sense},S_{prep},S_{map},S_{arrival},S_{thermal}\}.
\]

A P6 machine may shorten or localize some signatures through better materials and computation, but nonlocal mapping and reconciliation remain intrinsic events. Reduced support infrastructure does not mean invisibility.

---

## 20. Infrastructure

### Prepared receiver chambers

At lower maturity, prepared receivers reduce target uncertainty and provide controlled reconciliation volumes.

### Authenticated target beacons

Beacons provide evidence; they do not guarantee safety. Their state can be stale, spoofed, damaged, or environmentally obsolete.

### Reference archives

Long-lived signed reference chains allow state ancestry and false-independence checks.

### Strategic sensor/reference networks

Higher Path systems can use many independent observations to build targets without dedicated chambers, but increased autonomy shifts burden onto inference quality and provenance.

---

## 21. Technology-basis embodiments

These embodiments are DERIVED and must never be used as evidence that a race invented or owns the family.

| Technology basis | Likely physical language | Dominant maintenance language |
|---|---|---|
| TERRESTRIAL_ELECTROMECHANICAL | segmented cages, superconducting buses, precision clocks, hardened computers | alignment, insulation, clocks, cage continuity, cooling |
| AQUATIC_ELECTROCHEMICAL_HYDRAULIC | pressure-balanced ionic membranes, wet photonics, hydraulic geometry control | chemistry, fouling, pressure, cavitation, ionic drift |
| CRYOGENIC_AMMONIA_HALOCARBON | superconductive state loops, cryogenic cavities, quench-isolated recovery | cryogen purity, quench history, thermal cycling, cavity drift |
| GAS_GIANT_FLUIDIC_ELECTROSTATIC | electrostatic state nodes in tension structures and fluidic control paths | charge balance, membrane tension, storm coupling, delay calibration |
| BIOLOGICAL_SYMBIOTIC | cultivated state-sensitive tissues, neural references, regenerative phase membranes | viability, immune compatibility, neural synchronization, scar-state review |
| MINERAL_PIEZOELECTRIC_PHOTONIC | prestressed crystalline cages, photonic references, resonant mineral media | fracture, defect maps, prestress, resonance, optical contamination |
| FIELD_MEDIATED_POSTMATERIAL | distributed coherent programmable nodes and executable reference proofs | consensus, proof integrity, coherence, ancestry, reconstruction history |

---

## 22. Educational text — undergraduate level

### Why “teleportation” is an inadequate engineering word

A coordinate answers only where a target is. A displacement engineer needs to know what physical state is admissible there, whether the destination is occupied, how certain those observations are, whether the complete source object is inside the mapping volume, whether the required continuity invariants can be demonstrated, and whether the receiving state can be safely normalized.

The first lesson is therefore:

\[
\text{destination coordinate}\neq\text{destination state}.
\]

The second is:

\[
\text{successful mapping}\neq\text{complete safety proof}.
\]

The third is:

\[
\text{engineering continuity certificate}\neq\text{universal philosophy of identity}.
\]

---

## 23. Advanced engineering lecture — state estimation and provenance

A mature P5/P6 drive should be treated as a receding-horizon estimator-controller.

At update \(k\):

1. assimilate new target observations;
2. update evidence ancestry;
3. recompute \(\Sigma_T^{(k)}\);
4. update source-state configuration;
5. recompute \(d_C^{(k)}\), \(\mu_I^{(k)}\), and \(\mu_C^{(k)}\);
6. remove inadmissible targets;
7. rank the remaining candidates;
8. maintain recovery reserve;
9. repeat until commit.

This means a later observation can invalidate a route even after enormous preparation energy has been invested. Sunk cost is not a safety variable.

---

## 24. Training accident — PROPOSED, not setting history

### Case PD-T17: False Triple Confirmation

A strategic vessel prepares to displace to an uncrewed deep-space service point. Three navigation products agree on the target within tolerance: beacon timing, occupancy solution, and local gravitational model.

The controller reports high confidence.

During the final precommit audit, a provenance check reveals that all three products inherit their epoch from the same remote beacon clock. That clock has drifted after a radiation event. The occupancy model and gravitational reconstruction are therefore not independent confirmations; they are correlated derivatives of one damaged reference.

After the shared covariance is restored, two target states become plausible. One overlaps a newly parked service tender.

The displacement is aborted.

**Instructional lesson:** confidence values are meaningless without ancestry. Three derived products from one bad reference constitute one bad evidence family.

This case is PROPOSED instructional material and must not be generated as a confirmed historical accident.

---

## 25. Research and thesis directions

Derived research programs suitable for in-universe technical literature include:

- robust invariant selection under partial reference failure;
- target-state inference with explicitly correlated beacon networks;
- minimum sufficient protected-state descriptor sets;
- whole-object coverage under articulated and deformable geometry;
- post-arrival reconciliation under incomplete external sensing;
- compact mapper architectures with physically independent recovery;
- cultural/legal continuity criteria as interface constraints rather than universal physics;
- anomaly detection for persistent target-model residuals.

Each thesis should state which assertions are recovered canon, which mathematics is derived, which coefficients are proposed, and which historical attribution is unresolved.

---

## 26. Patent-class developmental records

Patent-style records may be generated for developmental texture, but attribution remains UNRESOLVED unless independently sourced.

Example classes:

```text
INVENTION CLASS: Provenance-Isolated Continuity Reference Store
Problem: nominally redundant continuity checks share one corrupted source.
Advance: physically and logically isolated reference ancestry with cross-root comparison.
Changed limit: common-mode reference failure.
Status: DERIVED concept; inventor/date/manufacturer UNRESOLVED.
```

```text
INVENTION CLASS: Sectional Whole-Object State Cage
Problem: monolithic coverage failure invalidates the complete payload.
Advance: independently measurable local cage sectors with global minimum-margin solver.
Changed limit: diagnosability and damage tolerance.
Status: DERIVED concept; attribution UNRESOLVED.
```

```text
INVENTION CLASS: Covariance-Ancestry Target Resolver
Problem: correlated observations masquerade as independent certainty.
Advance: propagate covariance and evidence ancestry together through target inference.
Changed limit: long-baseline target ambiguity.
Status: DERIVED concept; attribution UNRESOLVED.
```

---

## 27. Generator/API contract

### Required inputs

```json
{
  "pathTier": "P0..P6",
  "technologyBasis": "authority basis identifier",
  "payloadGeometry": "current certified geometry/state domain",
  "payloadComplexity": "bounded descriptor",
  "targetEvidence": "observations with provenance roots",
  "targetEnvironment": "observed/predicted endpoint state",
  "referenceState": "authenticated continuity/reference inputs",
  "infrastructureSupport": "receiver/beacon/network availability",
  "damageState": "observed vessel condition",
  "maintenanceState": "current certification status"
}
```

### Required outputs

```json
{
  "stateMapClass": "family-specific mapping solution",
  "compatibilityAssessment": "target-state result",
  "continuityInvariantReport": "what was actually certified",
  "coverageMargin": "worst local margin",
  "targetCovariance": "uncertainty plus ancestry",
  "powerAndRecoveryBudget": "nominal plus protected reserve",
  "signatureProfile": "persistent/transient observables",
  "failureExposures": [],
  "operatingProcedures": [],
  "provenance": {}
}
```

### Hard generator guards

1. Never describe Phase Displacement as continuous travel through intervening space.
2. Never convert an engineering continuity check into a universal metaphysical declaration.
3. Never average away a local state-cage coverage hole.
4. Never average away an occupied or incompatible target volume.
5. Never count correlated observations as independent evidence.
6. Never infer race ownership or invention from technology basis.
7. Never turn PROPOSED coefficients into canon because they appeared in generated output.
8. Never promote training accidents, thesis examples, or patent-style records into history without an authority source.
9. Never consume protected reconciliation/recovery reserve merely to improve nominal range.
10. Preserve unresolved questions as unresolved.

---

## 28. Compact engineering comparison

| Question | Phase Displacement answer |
|---|---|
| What physically changes? | A protected source state is mapped to a compatible nonlocal target state. |
| What primarily limits range? | Target/reference uncertainty, compatibility, continuity proof, coverage and recovery—not energy alone. |
| What makes larger payloads harder? | State complexity and whole-object coverage as well as mass/volume. |
| What is the decisive safety instant? | Precommit, followed by protected arrival reconciliation. |
| What cannot be traded away? | Occupancy exclusion, continuity requirements, minimum coverage and recovery reserve. |
| What improves with maturity? | State modeling, sensing, provenance, cage density, computation, autonomous inference and reconciliation. |
| What remains unresolved? | Universal metaphysical identity doctrine and unsourced race/manufacturer/inventor attribution. |

---

## 29. Authority conclusion

Phase Displacement is now sufficiently specified to generate coherent machinery, manuals, education, failure analysis, research literature and API records without flattening it into generic teleportation.

Its defining engineering discipline is **proof before commit**: prove the source state, prove the protected domain, prove the target, prove the evidence ancestry, prove the configured continuity invariants, preserve recovery authority, then map.

Where the setting has not answered what personal identity ultimately means, the technical corpus does not pretend that a controller has solved philosophy. It reports exactly what invariants were preserved, how they were measured, and where the evidence came from.
