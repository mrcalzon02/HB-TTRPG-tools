# Black Light FTL Safety Calibration Profile Manual

**Status:** MIXED — authoritative integration guidance + DERIVED mathematics + PROPOSED numerical calibration

**Primary authority:** `docs/blacklight/BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md`

**Design-intent source:** Google Drive, **The different lightspeed methods**, document `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`, revision `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`.

**Machine-readable companions:**

- `data/exo-vessel/ftl-safety-calibration-profiles.json`
- `data/schemas/exo-vessel-ftl-safety-calibration-profile.schema.json`
- `blacklight-exo-ftl-safety-calibration-runtime.js`
- `data/exo-vessel/ftl-safety-certification-registry.json`
- `blacklight-exo-ftl-safety-certification-runtime.js`

---

## 1. Purpose

The propulsion/transit corpus already defines what the nine families are, what physical action each performs, why gravity matters, what kinds of errors become dangerous, what machinery embodiments are plausible, and how sensing and recovery mature from primitive demonstrations to advanced operational systems.

What it did not yet define cleanly was **how a runtime is allowed to turn those qualitative and symbolic differences into numbers**.

That omission is dangerous because numerical convenience can silently become fake canon. If a generator invents one coefficient for Gravitational-Plane Skimming and another for Fold, later documents may begin repeating those numbers as if a named civilization actually measured them.

This manual therefore establishes a calibration boundary:

```text
NAMED CANON / OPERATOR PHYSICS
            ↓
SYMBOLIC / DERIVED FAMILY MATHEMATICS
            ↓
VERSIONED CALIBRATION PROFILE
            ↓
SAFETY CERTIFICATE
            ↓
GENERATOR / UI / ENCOUNTER OUTPUT
```

A calibration profile is not a discovery about the universe. It is a controlled numerical interpretation of already-established differences.

The governing invariant is:

\[
\boxed{\text{calibration value}\neq\text{setting constant}}
\]

and, for named technologies:

\[
\boxed{\text{generic profile}\not\Rightarrow\text{named-race specification}}
\]

---

## 2. Authority and provenance doctrine

The authority order is:

1. Specific named race/species, organization, manufacturer, vessel, installation, or technology source.
2. `BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md`.
3. Family-specific operator physics and recovered archive definitions.
4. Existing mathematical/gravity/safety models.
5. Runtime implementation behavior within its implementation scope.
6. Machine-readable calibration profiles.
7. Engineering manuals and educational material.
8. Labeled DERIVED interpretation.
9. Labeled PROPOSED values and research extensions.

A profile may narrow behavior only inside the scope its provenance actually supports.

A confirmed named manufacturer limit overrides a generic profile.

A generic profile does **not** backfill missing manufacturer history.

An unresolved named installation remains unresolved even if the generic profile could generate a perfectly usable answer.

---

## 3. The design source and what it actually requires

The design source establishes several requirements that calibration must preserve:

- Different FTL families must lose efficiency differently when gravity and spacetime distortion increase.
- Large gravity wells are hostile to all exotic transit families, though to different degrees.
- Some families are especially dependent on gravitational geometry and are therefore especially vulnerable to shear, forks, and hidden masses.
- More advanced systems require safety sensing that reaches far enough ahead to match their transit authority.
- Emergency de-transit, shunting, detachment, unwind, rejection, closure, or reconciliation behavior must be family-specific.
- Increased technology improves safety margin, redundancy, and prediction, but never creates perfect safety.
- Mathematical models may need to be invented, but should remain internally coherent and clearly separated from adopted canon.

Calibration exists to implement those requirements without falsely canonizing its own numbers.

---

## 4. Profile identity is part of the engineering record

Every certificate that uses a numerical profile should retain:

```text
profileId
profileVersion
status
path / maturity
applied named overrides
ignored or unresolved overrides
provenance
```

A certificate without profile identity is not replayable.

The relevant principle is:

\[
C_t = F(E_t, M_t, R_t, P_t)
\]

where:

- \(E_t\) is the measured environment at time \(t\),
- \(M_t\) is the measurement uncertainty state,
- \(R_t\) is the route / recovery state,
- \(P_t\) is the exact calibration profile version.

If \(P_t\) changes, an old certificate does not silently become a new certificate.

It must be recomputed or explicitly recertified.

---

## 5. Shared environmental severity

The safety runtime uses the family-neutral environmental vector:

\[
\mathbf E_g=
[
|\Phi|,
|\nabla\Phi|,
\|\mathsf T\|,
\|R\|,
U_m,
P_{hidden},
B_f
]^T.
\]

A calibration profile provides reference scales and weights for the terms used by the current runtime severity scalar:

\[
G =
 w_\Phi\frac{|\Phi|}{\Phi_{ref}}
+w_g\frac{|\nabla\Phi|}{g_{ref}}
+w_T\frac{\|\mathsf T\|}{T_{ref}}
+w_R\frac{\|R\|}{R_{ref}}
+w_U\frac{U_m}{U_{ref}}.
\]

The baseline profile intentionally weights tidal and curvature terms more heavily than raw potential because route safety is often controlled more by differential distortion than by a single scalar depth.

That weighting is **PROPOSED runtime calibration**, not a universal law.

### 5.1 Reference-scale rule

Reference scales are normalizers.

They are not automatically physical thresholds.

\[
\frac{x}{x_{ref}}=1
\]

means only that the input has reached the profile's normalization scale.

It does not mean the universe becomes unsafe at exactly that value.

---

## 6. Family penalty model

The safety-certification layer uses:

\[
P_f=a_fG+b_fG^2+c_fG^{n_f}+d_fU_m+e_fB_f
\]

and:

\[
\eta_{g,f}=e^{-P_f}.
\]

The terms provide distinct knobs for:

- first-order environmental burden,
- nonlinear growth,
- extreme-regime curvature,
- mass-model uncertainty,
- family-specific boundary hazard.

This structure is useful because it allows two families to share the same environment while responding differently.

### 6.1 Why Gravitational-Plane is harshly tuned

The design source explicitly makes gravitational shear routes especially dangerous.

The transit medium itself is gravitational geometry.

A lane fork is not merely turbulence. It can create incompatible path solutions across the same maintained transit state.

The baseline simulation profile therefore gives Gravitational-Plane the strongest general environment coefficient set.

That is a **PROPOSED interpretation of explicit qualitative canon**.

### 6.2 Why Q-Lattice, Fold, N-Manifold, and Phase emphasize uncertainty

These families can be less directly burdened by local gravity than Gravitational-Plane yet more sensitive to:

- address ambiguity,
- endpoint covariance,
- return-map conditioning,
- target-state identity,
- reference ancestry,
- timing/epoch mismatch.

Their calibration therefore shifts more risk into \(k_f\) and miscalculation amplification rather than merely increasing \(a_f\).

---

## 7. Miscalculation model

The derived family-error model is:

\[
A_f=\|J_{f,E}\|
\]

and:

\[
\eta_{calc,f}
=
\exp[-k_fA_f^2\operatorname{tr}(\Sigma_E)].
\]

The baseline profile does not claim to know the true physical Jacobian of alien transit operators.

Instead, `miscalculationAmplification` is a runtime proxy for how strongly unresolved environment/reference uncertainty should penalize that family.

This retains the design-source requirement that different FTL methods have different miscalculation behavior.

---

## 8. Maturity calibration: P0 through P6

The design source states that better transit technology should also have better safety sensing and larger margins.

The profile therefore provides separate maturity factors for:

- lookahead,
- covariance reduction,
- recovery authority,
- redundancy.

These are planning modifiers, not magic multipliers applied to observations.

Observed data remain observed data.

### 8.1 Baseline maturity chart

| Path | Lookahead | Covariance burden | Recovery | Redundancy | Engineering interpretation |
|---|---:|---:|---:|---:|---|
| P0 | 0.35 | 1.80 | 0.55 | 0.50 | static demonstration; known test volume |
| P1 | 0.52 | 1.55 | 0.68 | 0.65 | controlled repeatable experiment |
| P2 | 0.72 | 1.30 | 0.82 | 0.82 | captive operational system |
| P3 | 1.00 | 1.00 | 1.00 | 1.00 | baseline independent vessel operation |
| P4 | 1.35 | 0.78 | 1.20 | 1.35 | mature fleet-grade sensing/recovery |
| P5 | 1.75 | 0.60 | 1.45 | 1.75 | predictive hidden-terrain inference |
| P6 | 2.25 | 0.45 | 1.75 | 2.20 | adaptive, high-bandwidth, deeply redundant system |

All values in this table are **PROPOSED simulation calibration**.

The shape matters more than the numbers:

```text
P0   P1   P2   P3   P4   P5   P6
|----|----|----|----|----|----|
   growing prediction horizon  →
   shrinking unresolved error  →
   growing protected recovery  →
   growing diverse redundancy  →
```

### 8.2 Safety never reaches infinity

Even P6 does not imply perfect prediction.

The design source explicitly rejects absolute safety.

The maturity curve therefore approaches larger margins, not certainty.

---

## 9. Scaling model

A central rule of this corpus is that propulsion systems do not scale as one reactor number multiplied by hull mass.

The profile uses the conceptual burden relation:

\[
B_{scale}=
C_V\left(\frac{V}{V_{ref}}\right)^{\alpha_V}
+C_A\left(\frac{A}{A_{ref}}\right)^{\alpha_A}
+C_L\left(\frac{L}{L_{ref}}\right)^{\alpha_L}
+C_{sync}\left(\frac{L_{sync}}{L_{sync,ref}}\right)^{\alpha_{sync}}.
\]

The terms may represent:

- protected volume,
- field-boundary area,
- characteristic structural length,
- synchronization span.

A vessel can have enough power and still fail certification because its field boundary is too large, sensor baseline too short, timing network too slow, heat sink too small, structural alignment too poor, or recovery reserve too shallow.

### 9.1 Operational limiting relation

A useful derived readiness expression is:

\[
A_{operational}
=
\min(
M_{sensor},
M_{recovery},
M_{structure},
M_{thermal},
M_{control}
).
\]

This prevents one extremely strong subsystem from hiding the weakest necessary subsystem.

---

## 10. Power model

Calibration must distinguish **nominal drive power** from **protected safety authority**.

\[
R_{available,nominal}=R_{total}-R_{protected}.
\]

The protected reserve may represent:

- Metric unwind capacity,
- Gravitational-Plane decoupling/recoupling authority,
- Slipstream detachment reserve,
- Q-Lattice rejection capacity,
- N-Manifold return-map authority,
- Fold closure/ringing sink,
- Gate throat stabilization and closure,
- Phase reconciliation capacity,
- ordinary maneuver reserve for the Inertial Torch.

A generator may not spend this reserve to make a route look faster.

---

## 11. Navigation and control consequences

The same profile numbers should not be interpreted identically across families.

### Metric Compression

The route solver cares about external curvature, envelope symmetry, wall closure, and unwind margin.

### Gravitational-Plane

The route solver treats gravitational geometry as the roadway itself. Hidden mass and forks therefore affect both efficiency and survivability.

### Slipstream Shear

The route solver tracks normal/Q correspondence, adhesion, shear state, exit mapping, and detachment margin.

### Q-Lattice

Navigation is graph/address/reference management rather than continuous path steering.

### N-Manifold

The control problem is an embedding and return-map problem.

### Fold

The safety problem is primarily precommit endpoint proof, protected-volume geometry, and closure.

### Gate

The system must certify throat geometry, mouth synchronization, external loading, anchor state, and closure.

### Phase Displacement

The system must certify complete state coverage, target authenticity, exclusion, continuity, and reconciliation.

---

## 12. Signature consequences

Calibration can also alter how hard a system must work to remain inside its safety envelope.

A general signature vector is:

\[
\mathbf S_f=
[
S_{EM},
S_{thermal},
S_{grav},
S_Q,
S_{topology},
S_{subspace},
S_{wake},
S_{acoustic},
S_{bio}
]^T.
\]

Higher environmental burden may require stronger fields, longer preconditioning, larger correction authority, or earlier abort preparation.

That can increase signature even when effective transit speed decreases.

Therefore:

\[
\boxed{\text{lower efficiency}\not\Rightarrow\text{lower signature}}
\]

and:

\[
\boxed{\text{higher power}\not\Rightarrow\text{higher safe speed}}
\]

---

## 13. Infrastructure models

Calibration profiles may eventually contain infrastructure-specific overrides, but only when their scope is explicit.

Examples include:

- surveyed gravitic corridors,
- Q-reference beacons,
- Fold endpoint survey grids,
- paired gate mouths,
- manifold reference stations,
- phase-authentication arrays.

Infrastructure can reduce uncertainty and increase actionable lookahead.

It does not abolish operator physics.

A beacon cannot make a Gravitational-Plane fork cease to exist.

A gate anchor cannot make external tidal loading irrelevant.

---

## 14. Named-race and named-installation rules

### 14.1 Zwlei Mur'rek

The Mur'rek source confirms a **bio-reactive gravitic slipstream system**, flexible regulator vanes, wet working systems, gravitic references, and transit prediction machinery.

The consolidated operator family remains unresolved.

Therefore the profile registry contains an explicit unresolved override.

The runtime rule is:

\[
F_{Mur'rek}=UNRESOLVED
\Rightarrow
\text{no named Mur'rek family coefficient promotion}.
\]

The generic profile may be used in a sandbox comparison of hypotheses.

It may not become a Mur'rek specification sheet.

### 14.2 Ar'nock derelict

The Ar'nock investigation likewise retains an unresolved FTL family.

No generic profile may backfill a named Ar'nock family calibration.

---

## 15. Calibration selection algorithm

The resolver uses the following precedence:

```text
named installation override
        ↓
named manufacturer override
        ↓
named civilization override
        ↓
technology-basis override
        ↓
explicit requested profile
        ↓
default PROPOSED baseline
```

Conflicting equally authoritative values are not averaged.

They produce `CONFLICT`.

Missing required values produce `UNRESOLVED`.

---

## 16. Runtime API

The resolver is:

`resolveFTLSafetyCalibrationProfile(context)`

### Inputs

- `registry`
- `requestedProfileId`
- `requestedProfileVersion`
- `family`
- `path`
- `technologyBasis`
- `civilization`
- `manufacturer`
- `installation`
- `authoritySnapshot`
- `namedOverrideIds`
- `namedOverrides`
- `provenance`

### Outputs

- `profile`
- `profileIdentity`
- `appliedOverrides`
- `ignoredOverrides`
- `maturityModifier`
- `warnings`
- `provenance`
- `status`

### Status values

- `READY`
- `UNRESOLVED`
- `CONFLICT`

A `READY` profile means the numerical package is complete enough for the safety-certification runtime.

It does **not** mean the values are canon.

---

## 17. Generator integration

The intended generator sequence is:

```text
resolve authority
      ↓
resolve actual FTL family
      ↓
resolve calibration profile + exact version
      ↓
load measured environment and uncertainty
      ↓
load path / maturity
      ↓
calculate family response
      ↓
prove lookahead + abort + recovery
      ↓
emit certificate
      ↓
expose route only if certificate allows it
```

The generator is forbidden from doing this:

```text
requested cool route
      ↓
route looks unsafe
      ↓
reduce gravity number until route passes
```

It must instead reduce authority, select another route, improve information, repair hardware, or return `REJECTED`/`UNRESOLVED`.

---

# Practical Equipment Procedures

## CAL-01 — Profile Identity Verification

**Purpose:** Ensure the calibration used by a certificate is actually identifiable and replayable.

### Required equipment

- engineering terminal,
- authority manifest,
- calibration registry,
- certificate ledger.

### Procedure

1. Read `profileId`.
2. Read `profileVersion`.
3. Confirm profile status.
4. Verify the exact profile exists in the registry.
5. Verify the certificate records the same identity.
6. Verify any named override identities.
7. Record provenance.

### Reject if

- the profile ID is missing,
- multiple versions exist and none is specified,
- a named override was applied without provenance,
- an unresolved named installation was silently assigned generic coefficients as canon.

---

## CAL-02 — Environmental Normalization Audit

**Purpose:** Verify that measured environmental terms are normalized using the intended profile and not arbitrary UI scaling.

### Procedure

1. Confirm measured \(|\Phi|\), \(|\nabla\Phi|\), tidal norm, curvature norm, and mass-model uncertainty.
2. Confirm each quantity has provenance.
3. Load the profile reference scales.
4. Compute normalized values.
5. Apply profile weights.
6. Record \(G\).
7. Preserve original measured values beside the normalized result.

### Failure condition

If the raw values are unavailable, the normalized scalar is not sufficient for forensic reconstruction.

---

## CAL-03 — Family Coefficient Audit

**Purpose:** Prevent accidental use of one family's coefficients for another.

### Procedure

1. Confirm family identity from authority.
2. Reject unresolved family identity for named scope unless testing explicit hypotheses.
3. Load only the matching family coefficient block.
4. Record its status.
5. Verify all eight required numeric terms.
6. Record rationale.

### Warning

A user-visible name resembling another family is not sufficient to select that family's coefficient block.

---

## CAL-04 — Path Maturity Audit

**Purpose:** Ensure technological maturity affects safety support rather than rewriting observed physics.

### Procedure

1. Resolve P0–P6 from authoritative technology state.
2. Load maturity modifier.
3. Apply lookahead/redundancy modifiers only to generated/planning capability where appropriate.
4. Never multiply a measured sensor reading simply because the vessel is advanced.
5. Keep hardware degradation separate from nominal maturity.

### Principle

\[
\boxed{\text{maturity}\neq\text{measurement correction}}
\]

---

## CAL-05 — Named Override Review

**Purpose:** Safely apply manufacturer, civilization, or installation-specific calibration.

### Procedure

1. Resolve the narrowest named scope.
2. Verify source authority.
3. Verify override status.
4. Reject `UNRESOLVED` overrides.
5. Apply higher-authority values before lower-authority values.
6. Refuse equally ranked conflicts.
7. Preserve ignored values in the audit record.

---

## CAL-06 — Scale-Up Engineering Review

**Purpose:** Certify that a profile has not been misused to scale a drive by reactor output alone.

### Review domains

- protected volume,
- field-boundary area,
- characteristic span,
- sensor baseline,
- timing/synchronization span,
- heat rejection,
- structure,
- control bandwidth,
- recovery reserve.

### Reject if

- only mass and power were scaled,
- field coverage was assumed,
- sensor lookahead did not scale with authority,
- recovery reserve was consumed as nominal power,
- structural alignment was ignored.

---

## CAL-07 — Replay and Recertification

**Purpose:** Preserve historical engineering truth after profile updates.

### Procedure

1. Read historical certificate profile identity.
2. Replay with the historical version first.
3. If a new profile exists, calculate a separate comparison certificate.
4. Label the new result as recertification.
5. Do not overwrite the old certificate.

### Result

This allows the setting to contain generations of changing engineering doctrine without pretending earlier engineers had later calibration knowledge.

---

## CAL-08 — UI and Route-Selection Guard

**Purpose:** Prevent presentation code from converting uncertain or rejected routes into normal selectable options.

### Required UI behavior

- `READY` calibration + `ADMISSIBLE` certificate → selectable according to normal route policy.
- `READY` calibration + `MARGINAL` certificate → selectable only with explicit marginal-state treatment.
- `UNRESOLVED` calibration → route remains unresolved.
- `CONFLICT` calibration → engineering conflict state.
- `REJECTED` safety certificate → not presented as ordinary safe transit.

### Canon guard

The UI may explain uncertainty.

It may not erase it.

---

# Educational Material

## 18. Introductory engineering course: FTL Calibration I

### Learning objectives

Students should be able to:

- distinguish physical law from calibration,
- distinguish measured values from normalized values,
- explain why family coefficients differ,
- explain why numerical tuning is not historical canon,
- reproduce a profile identity chain,
- identify inappropriate named-race inference.

### Exercise 1

Two engineers use the same environment packet but different profile versions.

Question: which is correct?

Answer: neither is automatically more physically true. They are different calibration interpretations unless one version has superseding authority for the intended runtime scope.

### Exercise 2

A P6 vessel has a lower covariance factor than a P2 vessel.

Question: does that mean the P6 sensor measurement should be divided by the covariance factor?

Answer: no. The factor belongs to the modeled planning capability unless the actual measured covariance independently demonstrates the improvement.

---

## 19. Advanced engineering course: FTL Calibration II

### Topic: identifiability

A calibration problem is identifiable only if observed behavior constrains the coefficients sufficiently.

A simplified family response is:

\[
y=\exp[-(aG+bG^2+dU)].
\]

If all observations occur at nearly the same \(G\) and \(U\), many \((a,b,d)\) combinations can fit the same results.

Therefore:

\[
\boxed{\text{good fit}\neq\text{unique physical explanation}}
\]

### Topic: covariance

If two calibration experiments share the same gravimetric model, they are not independent simply because two ships performed them.

A hierarchical calibration should retain common covariance roots.

---

## 20. Graduate course: Transit Safety Model Validation

### Recommended topics

- Bayesian calibration with bounded priors,
- interval methods for sparse alien data,
- robust control under family-model uncertainty,
- structural identifiability,
- common-cause sensor covariance,
- out-of-distribution gravity terrain,
- survival-biased wreck evidence,
- cross-civilization metrology incompatibility.

### Core assignment

Construct two different calibration profiles that reproduce the same low-gravity observations but diverge near a high-curvature environment.

Then identify what new experiment would distinguish them without violating the unknown-family active-test safety rule.

---

# Research and Thesis Program

## 21. Thesis: Nonlinear gravity penalty identification

**Question:** What minimum observation set is required to separate \(a_f\), \(b_f\), and \(c_f\) in the family penalty model?

**Constraint:** Do not assume high-gravity tests are ethically or operationally admissible.

---

## 22. Thesis: Maturity versus survivorship bias

Advanced recovered vessels may appear safer because unsafe architectures did not survive.

Develop a method that distinguishes true maturity improvement from survivorship-biased evidence.

---

## 23. Thesis: Manufacturer calibration inheritance

Study whether a manufacturer-specific coefficient set should inherit civilization-wide defaults or start unresolved when machinery embodiment changes significantly.

---

## 24. Thesis: Cross-family normalization failure

Investigate whether a single scalar environmental severity \(G\) becomes too lossy for very advanced systems and determine when vector-valued certification should replace the scalar approximation.

---

# Proposed Technology and Patent Classes

All concepts in this section are **PROPOSED** and do not establish historical ownership.

## 25. Calibration Provenance Cartridge

A sealed, versioned machine-readable package containing:

- profile identity,
- authority snapshot,
- metrology units,
- reference scales,
- family coefficients,
- uncertainty assumptions,
- validation cases,
- cryptographic or non-cryptographic integrity metadata appropriate to the civilization.

Its purpose is engineering traceability, not mysticism.

---

## 26. Adaptive Profile Boundary Detector

A controller that detects when observed environmental state leaves the training/calibration envelope.

A simple proposal is:

\[
D_M=(\mathbf x-\mu)^T\Sigma^{-1}(\mathbf x-\mu).
\]

When \(D_M\) exceeds the certified domain, the controller marks the profile **out of distribution** and reduces transit authority or rejects the route.

---

## 27. Common-Cause Calibration Auditor

A dedicated system that traces whether apparently independent sensors, route models, and calibration datasets descend from one shared clock, one mass catalog, one translation model, or one reference beacon.

Its purpose is to prevent false redundancy.

---

## 28. Calibration-Aware Recovery Governor

A controller that reserves recovery authority before route optimization.

The optimizer receives only:

\[
R_{nominal}=R_{total}-R_{protected}.
\]

It never sees the protected reserve as spendable cruise capacity.

---

# Worked Example

## 29. Generic P4 Gravitational-Plane route

Assume the baseline simulation profile and normalized measured values:

\[
|\Phi|=0.3,
\quad
|\nabla\Phi|=0.4,
\quad
\|T\|=0.55,
\quad
\|R\|=0.25,
\quad
U_m=0.20.
\]

Using the baseline weights:

\[
G=
0.14(0.3)
+0.18(0.4)
+0.27(0.55)
+0.26(0.25)
+0.15(0.20).
\]

This yields a moderate normalized severity.

The Gravitational-Plane coefficient block then applies stronger nonlinear and boundary penalties than the Inertial Torch or Q-Lattice baseline.

That outcome does not prove Gravitational-Plane physics is "worse."

It reflects the established fact that the family uses gravitational geometry as the route medium and is especially vulnerable to forks and shear.

If the mass model becomes uncertain, the penalty increases further.

If a P4 sensor suite provides better prediction and redundancy, the route may still certify despite the environmental burden.

The correct engineering question is therefore not:

> Which drive has the highest number?

It is:

> Does this drive, at this maturity, in this environment, with this uncertainty and this recovery state, retain a certified path to safe operation and safe exit?

---

# Failure Taxonomy

## 30. Calibration failures

### CF-01 — profile identity loss

A certificate cannot be deterministically replayed.

### CF-02 — named-scope leakage

Generic values are presented as named civilization/manufacturer specifications.

### CF-03 — hidden version substitution

A historical certificate is replayed using a newer profile without recording the change.

### CF-04 — unresolved-to-zero coercion

Missing coefficient, measurement, or override value is silently converted to zero.

### CF-05 — maturity laundering

A high Path rating is used to overwrite measured sensor uncertainty rather than represent improved nominal engineering capability.

### CF-06 — power-only scaling

Larger machinery is assumed safe because reactor output scaled with mass.

### CF-07 — recovery cannibalization

Protected abort/recovery authority is spent on nominal range or speed.

### CF-08 — common-cause inflation

Multiple displays or sensors sharing one underlying reference are counted as independent redundancy.

### CF-09 — out-of-distribution confidence

A profile calibrated in low-curvature space is extrapolated into severe gravity terrain without uncertainty growth.

### CF-10 — UI safety promotion

A rejected or unresolved route is made selectable because presentation code wants a result.

---

# Canon Safeguards

## 31. Hard rules

1. Numerical profile values are not universal Black Light constants.
2. Numerical profile values are not automatic historical capability claims.
3. Named sources outrank generic profiles within their scope.
4. Unresolved family identity remains unresolved.
5. A source-local word such as *slipstream* cannot auto-select a consolidated family.
6. P0–P6 maturity does not generate dates, inventors, or manufacturers.
7. More mature safety systems enlarge margin; they do not create perfect safety.
8. Gravity remains operationally important across exotic families.
9. Large gravity-well restrictions cannot be tuned away merely to satisfy route generation.
10. Protected recovery reserve is not nominal performance capacity.
11. Scaling includes geometry, timing, sensing, thermal, structure, and recovery effects.
12. `UNRESOLVED` is a valid engineering output.
13. `CONFLICT` is a valid engineering output.
14. `REJECTED` is a valid engineering output.
15. Profile updates require version changes and recertification where results change.
16. Replay uses the historical profile unless an explicit recertification is requested.
17. Experimental fitting must preserve provenance and covariance ancestry.
18. Calibration does not grant machinery behavior not supported by operator physics.

---

## 32. Closing engineering principle

The profile system exists so Black Light can possess numerical depth without mistaking numerical convenience for lore.

A mature technological setting should contain generations of changing calibration practice, revised safety doctrine, competing metrology standards, manufacturer-specific limits, conservative fleets, aggressive research programs, and old certificates that remain understandable in their historical context.

The result should feel like engineering history rather than a table of arbitrary modifiers.

The calibration layer therefore answers one narrow question:

\[
\boxed{
\text{Given the physics and evidence we are allowed to claim, what numerical model are we using here, and exactly where is it allowed to apply?}
}
\]
