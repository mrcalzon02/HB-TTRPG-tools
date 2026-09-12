# Black Light FTL Topology-Hazard Applicability & Provenance Manual

**Authority class:** DERIVED engineering integration manual  
**Primary design-intent source:** *The different lightspeed methods*  
**Machine authority:** `data/exo-vessel/ftl-topology-hazard-applicability-registry.json`  
**Runtime:** `blacklight-exo-ftl-topology-hazard-applicability-runtime.js`

## 1. Purpose

The Black Light transit stack now distinguishes three questions that must never be collapsed into one:

1. **What does ordinary spacetime geometry do?**
2. **Does a fictional transit family care about that physical condition?**
3. **Does a particular certified hazard become blocking early enough to require intervention?**

The first question belongs to physical gravity, covariance, tidal tensors, eigenbranches and route sampling. The second belongs to this applicability authority. The third belongs to family-segment certification and route safety.

```text
ordinary source state + covariance
             |
             v
       physical tidal tensor
             |
             v
 eigenvalues / eigenspaces / gamma
             |
             v
  physical topology boundary
             |
             |  DOES CANON LINK THIS TO THE FAMILY HAZARD?
             v
 topology-hazard applicability record
             |
             v
 separately certified fictional hazard
             |
             v
 conservative blocker / intervention
```

The central safeguard is therefore:

\[
\boxed{\text{physical precursor}\neq\text{fictional hazard}}
\]

and, separately,

\[
\boxed{\text{fictional hazard}\neq\text{physical precursor relationship}}
\]

A drive can possess a fictional shear-fork failure mechanism without every ordinary tidal degeneracy becoming such a fork. Conversely, ordinary tidal topology can become badly conditioned without proving that any FTL lane exists.

## 2. Why a Boolean Was Insufficient

The previous family certification API accepted a caller control equivalent to:

```text
topologyBoundaryAppliesToFirstBlocker = true / false
```

That was operationally convenient but epistemically weak. It discarded:

- who established the relationship;
- which family it applies to;
- which hazard it applies to;
- which physical evidence type it consumes;
- whether it is canonical, derived, proposed or simulation-only;
- whether a named technology overrides the generic family relationship;
- whether a later archaeological identification should supersede an earlier generic assumption.

The applicability registry replaces that bit with a provenance-bearing record.

## 3. Authority Model

Applicability resolves by specificity:

| Rank | Scope | Example |
|---:|---|---|
| 60 | installation | one damaged gate, one calibrated drive room |
| 50 | vessel | a named vessel refit |
| 40 | named technology | a specific drive model or patent lineage |
| 30 | manufacturer | a maker-specific implementation |
| 20 | race/species | a civilization engineering convention |
| 10 | family | generic gravitational-plane behavior |

Higher-specificity records outrank generic records **only inside their stated scope**.

Equal-precedence contradiction produces:

```text
CONFLICT
```

not an arbitrary tie-break between physical consequences.

No matching canonical record produces:

```text
UNRESOLVED
```

not `false`.

This distinction matters. `false` says authority knows the precursor is irrelevant. `UNRESOLVED` says the corpus does not yet know.

## 4. Physical Evidence Type: Normalized Tidal Degeneracy

For principal tidal eigenvalues \(\lambda_i,\lambda_j\), define

\[
\gamma_{ij}
=
\frac{|\lambda_i-\lambda_j|}
{\max(|\lambda_i|,|\lambda_j|,\|T\|_F,\epsilon)}.
\]

The versioned navigation threshold currently uses

\[
\gamma_{\min}=0.02.
\]

When

\[
\gamma_{ij}\le\gamma_{\min},
\]

individual branch identity is considered operationally unreliable under the current engineering model.

This is a statement about the conditioning and distinguishability of the **ordinary tidal eigensystem**. It is not a statement that an FTL shear lane has forked.

### 4.1 Uncertainty

The upstream uncertainty authority provides

\[
\gamma\pm\sigma_\gamma
\]

and a conservative boundary-location envelope

\[
f_*=\text{nominal boundary fraction},
\]

\[
f_{\rm early}=\operatorname{clamp}(f_*-k\sigma_f,0,1).
\]

This manual does not recompute those values. Applicability only says whether a family hazard is permitted to consume them.

## 5. Gravitational Plane / Shear-Plane Family

The governing design-intent source explicitly describes transit along gravitational shear planes between focal regions and states that a fork in a gravity-shear lane can pull the ship in incompatible directions and destroy it.

That supports the following derived relationship:

```text
ordinary tidal branch/topology loss
        |
        v
physically necessary warning precursor
        |
        v
separately modeled gravitational-plane shear-fork hazard
```

The physical precursor is **required evidence**, but it is not sufficient evidence.

Formally, if \(H_f\) is the fictional shear-fork hazard and \(P_T\) is the physical topology precursor,

\[
H_f \Rightarrow P_T
\]

may be adopted within the documented family model, while

\[
P_T \not\Rightarrow H_f.
\]

This one-way implication is the core canon safeguard.

## 6. Slipstream / Shear Systems

Slipstream/shear machinery may consume tidal topology as supporting environmental evidence, but its named hazards can remain distinct—adhesion loss, boundary detachment, Q-boundary behavior, or implementation-specific wall failures.

For such a relationship the registry may label the physical topology as:

```text
SUPPORTING_PHYSICAL_PRECURSOR
```

rather than

```text
REQUIRED_PHYSICAL_PRECURSOR
```

A supporting precursor is useful for sensing, maintenance and route confidence but does **not** by itself authorize moving a certified blocker earlier. A named technology source may later strengthen, narrow or reject that relationship.

## 7. Conservative Blocker Rule

Suppose a family certificate has already produced a nominal blocker at route fraction \(f_B\), and upstream topology analysis supplies \(f_{\rm early}\).

Only a qualifying applicability record may permit:

\[
f_{B,\mathrm{eff}}=\min(f_B,f_{\rm early}).
\]

The required conditions are:

1. the family matches;
2. the hazard matches;
3. the physical evidence type matches;
4. the applicability resolution is `RESOLVED`;
5. `applicable=true`;
6. the relationship authorizes blocker tightening;
7. a fictional blocker already exists.

Otherwise:

\[
f_{B,\mathrm{eff}}=f_B.
\]

### 7.1 Continuous families

For a continuous projected-progress representation,

\[
D_{B,\mathrm{eff}}
=
\max[0,(f_{B,\mathrm{eff}}-f_c)L]
\]

and

\[
D_{\rm int}=v_p t_{\rm int}.
\]

The conservative intervention margin is

\[
M_D=D_{B,\mathrm{eff}}-D_{\rm int}.
\]

A positive margin is required:

\[
M_D>0.
\]

The quantity \(v_p\) remains a projected route/control progress rate. It is not automatically local hull velocity.

### 7.2 PRECOMMIT families

Fold, Q-Lattice and Phase Displacement retain prediction-horizon reasoning:

\[
M_T=t_{\rm prediction}-t_{\rm int}.
\]

An applicability record cannot create a fictitious intermediate superluminal speed merely because a physical boundary has a route coordinate.

## 8. Machinery Embodiments

The mathematics is shared; the machines are not.

| Technology basis | Applicability embodiment |
|---|---|
| terrestrial electromechanical | explicit hazard/precursor provenance cards, gradiometer vector displays, hardwired abort gates |
| aquatic electrochemical/hydraulic | pressure/current topology channels with separate precursor and hazard manifolds |
| biological/symbiotic | sensory salience distinguishes environmental ambiguity from drive-specific threat recognition |
| mineral-photonic | polarization/resonance channels identify physical mode merger separately from drive-lattice failure state |
| gas-giant volumetric | nested electrostatic/pressure confidence volumes with family-hazard overlays |

The invariant is:

\[
\boxed{\text{same evidence relation}\neq\text{same machinery embodiment}}.
\]

## 9. Scaling Behavior

The underlying vessel-scale tidal problem remains

\[
\Delta a\sim\|T\|L_v
\]

and approximately

\[
\sigma_{\rm tidal}\sim\rho\|T\|L_v^2.
\]

Distributed reaction difficulty remains characterized by

\[
\Pi_c=\frac{L_c}{v_c\tau_r}.
\]

For a large vessel, applicability matters because the same physical precursor may require very different actions depending on the family machinery: field unwind, plane shunt, wall detachment, sectional isolation, or controlled return.

## 10. Power and Recovery Model

Applicability never grants extra power. It changes **when a named safety response is justified**.

A family-specific intervention budget may be written schematically as

\[
E_{\rm protected}
\ge
E_{\rm detect}
+E_{\rm solve}
+E_{\rm reconfigure}
+E_{\rm exit}
+E_{\rm clear}
+E_{\rm reserve}.
\]

The protected recovery reserve is not nominal performance capacity.

If the applicability link is unresolved, the correct action for a canon-required certificate is not to spend more power; it is to refuse the unsupported physical-to-fictional inference.

## 11. Navigation and Control

A compliant controller keeps separate channels for:

```text
PHYSICAL STATE
  T, lambda, eigenbasis, gamma, covariance

APPLICABILITY STATE
  family, hazard, source, scope, status

FICTIONAL HAZARD STATE
  calibrated family response / blocker

CONTROL STATE
  intervention horizon / recovery reserve
```

Mixing these channels is a provenance defect.

## 12. Signatures

Applicability affects observable engineering signatures indirectly.

A system with explicit topology-linked hazard doctrine tends to carry:

- higher-rate gradiometry during relevant transit phases;
- branch/eigenbasis compute load;
- dedicated prediction buffers;
- protected de-transit/shunt actuation;
- diagnostic logs that retain both physical and fictional state;
- maintenance calibration for the sensor-to-hazard mapping.

These signatures may support archaeological inference, but they do not by themselves identify family canon.

## 13. Maintenance Doctrine

### THA-01 — Applicability Authority Audit

1. Identify the active family and named technology.
2. Identify the certified hazard under review.
3. Identify the physical evidence type.
4. Resolve applicability through the registry.
5. Record selected scope and source revision.
6. Refuse manual boolean substitution in canonical mode.

### THA-02 — Gradiometer-to-Hazard Chain Test

1. Inject a known physical tidal-topology case.
2. Verify the physical channel reports only physical quantities.
3. Verify applicability resolves independently.
4. Verify the fictional hazard channel remains absent if no hazard certificate exists.
5. Verify an already-certified compatible hazard may consume the precursor.

### THA-03 — Named Override Test

1. Load a family-level record.
2. Load a named-technology record at higher specificity.
3. Confirm the named record wins only within its named scope.
4. Remove the named identity and confirm resolution returns to family authority.

### THA-04 — Conflict Test

Create two equal-precedence contradictory records. The expected result is:

```text
CONFLICT
```

Any automatic preference is a failure.

### THA-05 — Salvage / Archaeology Procedure

For alien or derelict machinery, preserve separately:

- observed physical sensor architecture;
- inferred drive family;
- manufacturer/owner identity;
- applicability evidence;
- confidence/status;
- operator interpretation.

Never rewrite inference as manufacturer canon.

### THA-06 — Emergency Interlock Test

Confirm that a topology precursor cannot trigger a family-specific emergency actuator unless both the hazard and applicability chain are authorized.

### THA-07 — Provenance Loss Test

Remove the source record. The system must become `UNRESOLVED`, not retain a cached boolean as canon.

### THA-08 — Simulation Isolation Test

Simulation-only overrides are permitted only when canonical resolution is explicitly disabled. Outputs must remain labeled `SIMULATION_ONLY`.

## 14. Failure Taxonomy

| Code | Meaning |
|---|---|
| THA-NO-RECORD | no canonical applicability record |
| THA-CONFLICT | equal-precedence records disagree |
| THA-FAMILY-MISMATCH | applicability record and certified family differ |
| THA-HAZARD-MISMATCH | applicability record addresses another hazard |
| THA-EVIDENCE-MISMATCH | physical precursor type differs |
| THA-SCOPE-LEAK | named authority applied outside its scope |
| THA-BOOLEAN-BYPASS | canonical path used a raw caller boolean |
| THA-CANON-LEAK | ordinary gravity promoted directly into fictional canon |
| THA-SIMULATION-LEAK | simulation-only override presented as canonical |

## 15. Generator Rules

A generator producing family-specific engineering must:

1. generate or select the physical evidence independently;
2. identify the family/hazard independently;
3. resolve applicability from authority;
4. preserve the selected applicability record and source revision;
5. keep `UNRESOLVED` and `CONFLICT` visible;
6. never infer applicability from race identity alone;
7. never infer an exotic hazard merely because the physical precursor exists;
8. generate race/technology machinery differences as embodiment, not new physics unless a higher authority says otherwise.

## 16. API Example

```js
const result = await BlacklightExoFTLTopologyHazardApplicabilityRuntime
  .resolveFTLTopologyHazardApplicability({
    family: 'gravitational-plane',
    hazardKey: 'shear-fork',
    physicalEvidenceType: 'NORMALIZED_TIDAL_DEGENERACY_BOUNDARY',
    canonicalResolutionRequired: true
  });
```

A canonical result must carry:

```text
status
applicable
relationship
selected record
matched record ids
scope resolution
warnings
provenance
canon safeguards
```

## 17. Education — Transit Safety Engineering 670

**Course:** *Physical Precursors, Fictional Hazard Authority, and Provenance-Bearing Certification*

### Learning objectives

Students must be able to:

- distinguish a physical condition from a fictional family response;
- derive and interpret the normalized tidal-degeneracy metric;
- explain one-way precursor logic;
- resolve family versus named-technology authority;
- diagnose provenance conflicts;
- calculate conservative blocker and intervention margins without fabricating local FTL motion;
- translate the same evidence relation into different technological embodiments.

### Examination problem A

A route has a certified gravitational-plane `shear-fork` blocker at \(f_B=0.44\). The normalized tidal-degeneracy authority gives \(f_{\rm early}=0.41\). A valid `REQUIRED_PHYSICAL_PRECURSOR` applicability record exists.

Find:

\[
f_{B,\rm eff}=\min(0.44,0.41)=0.41.
\]

Then explain why the same \(f_{\rm early}\) cannot create a blocker if the family certificate contains no `shear-fork` hazard.

### Examination problem B

A physical topology transition is measured precisely, but no applicability record exists for an archaeological alien drive. The correct canonical state is `UNRESOLVED`. Explain why both `true` and `false` overclaim the evidence.

## 18. Research Program

The next maturity steps are:

```text
family applicability records
        ↓
named technology applicability records
        ↓
race/manufacturer engineering doctrines
        ↓
installation-specific calibration history
        ↓
field evidence / archaeology reconciliation
        ↓
probabilistic provenance confidence without canon collapse
```

Future work should add named alien technologies only when their source documents actually support the relationship.

## 19. Proposed Patent-Class Developments

The following remain **PROPOSED**:

- **Dual-Channel Precursor/Hazard Interlock** — electrically or logically prevents physical sensor state from directly asserting fictional hazard state.
- **Applicability Provenance Capsule** — stores family, hazard, precursor type, source revision and selected scope with each route certificate.
- **Scoped Authority Comparator** — detects equal-precedence contradictions before route commitment.
- **Archaeological Applicability Reconstructor** — retains observation and inference as separate evidence layers for recovered alien machinery.
- **Hazard-Relationship Self-Test Lattice** — injects known physical precursor patterns without asserting the exotic failure state, testing the complete separation chain.

## 20. Canon Close

The practical doctrine is compact:

\[
\boxed{\text{measure physics first}}
\]

\[
\boxed{\text{resolve applicability second}}
\]

\[
\boxed{\text{apply fictional family response third}}
\]

\[
\boxed{\text{retain provenance through certification and presentation}}
\]

That ordering preserves physical mathematics, family specificity, alien technological variety, and the central Black Light rule that uncertainty and missing authority remain visible rather than being patched over by convenient numbers.
