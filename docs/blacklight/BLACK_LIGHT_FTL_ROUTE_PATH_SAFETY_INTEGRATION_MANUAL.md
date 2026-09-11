# Black Light FTL Route-Path Safety Integration Manual

**Status:** DERIVED engineering integration with explicitly labeled PROPOSED transit-response elements  
**Design-intent source:** *The different lightspeed methods*  
**Google document ID:** `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`  
**Design-intent revision:** `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`  
**Primary setting authority:** `BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md`  
**Runtime integration authority:** `data/exo-vessel/ftl-route-safety-integration.json`

---

## 1. Purpose

This manual closes the handoff between physical route sampling, interval construction, family-specific interval certification, and the route-level safety answer shown to downstream systems.

The central rule is simple:

\[
\boxed{C_{\rm route}=\bigwedge_i C_{f,i}}
\]

A route is not the arithmetic mean of its intervals. One interval that cannot be certified for the selected transit family blocks the route.

The implementation therefore distinguishes three environmental authority levels:

```text
physical route path / segment packet
        ↓ highest available environmental authority
family-specific interval certification
        ↓
route-level first-blocker disposition

single physical field-point packet
        ↓ secondary when no path exists
single-point family certification

no physical evidence supplied
        ↓ fallback only
PROPOSED route archetype model
```

A lower layer may not overwrite a higher layer merely because it is easier to evaluate.

---

## 2. Authority and provenance

### 2.1 Precedence

Within this integration scope, use:

1. named canon sources for a race, vessel, manufacturer, installation, or exact technology;
2. the consolidated propulsion/transit authority;
3. current physical-route and family-segment runtime evidence;
4. machine-readable registries and schemas;
5. this manual;
6. labeled DERIVED models;
7. labeled PROPOSED extensions.

### 2.2 What physical mathematics does and does not establish

Ordinary gravitational calculations can constrain fictional transit machinery. They do not prove that the FTL mechanism exists.

A physically correct tidal tensor can tell the route model that the environment changes strongly. It cannot, by itself, prove that a Q-Lattice boundary is open, a Fold endpoint closes correctly, or a gravitational shear lane forks.

Thus:

\[
\boxed{\text{ordinary gravity evidence}\neq\text{operator-boundary state}}
\]

and:

\[
\boxed{\text{selected family}\neq\text{historical evidence that a named race uses that family}}
\]

---

## 3. Physical path model

Let the sampled route contain ordered positions

\[
\mathbf r_0,\mathbf r_1,\ldots,\mathbf r_N
\]

with monotonically increasing route fractions

\[
0<f_0<f_1<\cdots<f_N<1.
\]

Each adjacent pair defines interval \(i\):

\[
I_i=[f_i,f_{i+1}].
\]

For route length \(L\), the physical interval span is

\[
\Delta s_i=(f_{i+1}-f_i)L.
\]

The path sampler retains ordinary-physics values separately, including potential depth, coordinate acceleration, tidal tensor information, and curvature diagnostics.

They may not be added directly because their units differ.

---

## 4. Dimensionless normalization before fictional family response

The existing physical-route bridge defines versioned reference scales. The family-segment layer converts physical maxima into dimensionless engineering quantities:

\[
G_{\Phi,i}=\frac{\epsilon_{\Phi,i}}{\epsilon_{\Phi,\rm ref}},
\]

\[
G_{g,i}=\frac{|\mathbf g_i|}{g_{\rm ref}},
\]

\[
G_{T,i}=\frac{\|T_i\|_F}{T_{\rm ref}},
\]

\[
G_{R,i}=\frac{R_{*,i}}{R_{\rm ref}}.
\]

Only dimensionless normalized quantities may enter a combined fictional family response.

A representative family severity form remains:

\[
G_i=w_\Phi G_{\Phi,i}+w_gG_{g,i}+w_TG_{T,i}+w_RG_{R,i}+w_UU_i.
\]

The reference scales and weights are calibration parameters, not constants of nature.

---

## 5. Family response remains fictional and versioned

For transit family \(f\), the currently modeled environmental response retains the generic form:

\[
P_{f,i}=a_fG_i+b_fG_i^2+c_fG_i^{n_f}+d_fU_i+e_fB_{f,i}.
\]

The retained gravity/environment efficiency is

\[
\eta_{g,f,i}=\exp[-P_{f,i}].
\]

Calculation retention remains covariance-sensitive:

\[
\eta_{{\rm calc},f,i}=\exp\left[-k_fA_f^2\operatorname{tr}(\Sigma_{E,i})\right].
\]

Here \(B_{f,i}\) is the family-boundary hazard. It is not ordinary gravity.

For exotic families:

\[
\boxed{B_{f,i}\ \text{missing}\neq0}
\]

Missing boundary evidence is unresolved unless an authoritative source explicitly establishes that the boundary channel is absent.

---

## 6. Why generic route-archetype boundary values cannot be injected into a physical path

A route archetype may contain a PROPOSED family-boundary number for simulation comparison. Once a physical path exists, that number does not become measured evidence.

This is prohibited:

```text
physical stellar masses + ephemerides
        ↓
real gravitational path
        ↓
"binary" archetype familyBoundaryHazard = 0.62
        ↓
pretend it was observed
```

The correct chain is:

```text
physical stellar masses + ephemerides
        ↓
real gravitational path
        ↓
family-boundary sensing / explicit model evidence
        ↓
B_f,i with provenance
```

If the final channel is unavailable, the result remains `UNRESOLVED`.

---

## 7. Conjunctive route certification

For every interval:

\[
C_{f,i}
=
C_{\rm physical,i}
\land
C_{\rm efficiency,i}
\land
C_{\rm observability,i}
\land
C_{\rm lookahead,i}
\land
C_{\rm recovery,i}.
\]

Then:

\[
C_{\rm route}=\bigwedge_iC_{f,i}.
\]

No average is permitted.

### 7.1 Example

Suppose 120 intervals are evaluated:

| Interval set | Count | State |
|---|---:|---|
| benign interstellar interior | 116 | ADMISSIBLE |
| uncertain endpoint approach | 2 | MARGINAL |
| unresolved shear-fork region | 1 | UNRESOLVED |
| excessive family penalty | 1 | REJECTED |

The route is `REJECTED`.

The 116 benign intervals do not vote.

---

## 8. First blocking interval

The route-level integration must preserve the earliest interval whose status is one of:

- `REJECTED`
- `UNRESOLVED`
- `OUTSIDE_MODEL_VALIDITY`
- `CONFLICT`

Define the first blocking fraction as \(f_B\). For current route fraction \(f_c\):

\[
D_B=\max[0,(f_B-f_c)L].
\]

This value has direct operational meaning: it is the remaining modeled path distance before the earliest known interval that cannot presently be authorized.

Later safe intervals are irrelevant to the immediate decision.

---

## 9. Continuous intervention reachability

Where projected progress along the modeled route is meaningful, define projected progress rate \(v_p\).

The intervention chain remains:

\[
t_{\rm int}=t_{\rm sensor}+t_{\rm solver}+t_{\rm decision}+t_{\rm command}+t_{\rm actuate}+t_{\rm exit}+t_{\rm clear}+t_{\rm margin}.
\]

The intervention distance is

\[
D_{\rm int}=v_pt_{\rm int}.
\]

The reach margin is

\[
M_D=D_B-D_{\rm int}.
\]

If

\[
M_D\le0,
\]

then the modeled response chain cannot clear the first blocker before reaching it.

This remains a model result, not a promise of survival.

---

## 10. Precommit families

For Fold, Q-Lattice, and Phase Displacement, a local continuous superluminal progress rate is not imposed merely to make the route diagram convenient.

Those operators use decision-horizon logic:

\[
M_T=t_{\rm prediction}-t_{\rm int}.
\]

The route can therefore have a physically sampled ordinary-space environment while the transit operator still requires precommit certification rather than continuous mid-course intervention.

This distinction is essential:

\[
\boxed{\text{continuous reachability}\neq\text{precommit reachability}}
\]

---

## 11. Recovery reserve

Protected recovery authority remains unavailable for nominal optimization.

\[
R_{\rm available,nominal}=R_{\rm total}-R_{\rm protected}.
\]

The certification condition remains:

\[
R_{\rm protected}\ge R_{\rm required,recovery}.
\]

A vessel with high nominal drive output can still fail certification if the first blocker requires an abort mode whose reserve has been consumed by routine performance.

---

## 12. Hazard observability

Required hazards must remain observable or independently guarded:

\[
H_R\subseteq H_O\cup H_G.
\]

The path integration does not permit a route to become safe because an interval-specific hazard was averaged into a route-wide sensor confidence score.

For a gravitational-plane operator, for example, losing observability of a shear-fork channel on one critical interval is enough to block the route even if ordinary gravitational sensing remains excellent everywhere else.

---

## 13. Race- and technology-specific machinery embodiment

The route mathematics is shared; the hardware need not be.

| Technology basis | Likely route-path implementation emphasis |
|---|---|
| terrestrial electromechanical | distributed clocks, gravimeters, inertial references, hardened processors, independent abort bus |
| aquatic electrochemical/hydraulic | pressure-balanced sensor trunks, fluidic actuation, wet dielectric isolation, hydraulic emergency reserve |
| cryogenic ammonia/halocarbon | cryogenic metrology, quench-aware timing distribution, thermal-reference maintenance |
| gas-giant fluidic/electrostatic | pressure-layer topology, acoustic/electrostatic sensing, distributed buoyancy/pressure authority |
| biological/symbiotic | sensory tissue arrays, neural consensus, metabolic reserve, tissue-state recertification |
| mineral piezoelectric/photonic | resonant metrology, photonic phase comparison, crystal preload and flaw surveillance |
| field-mediated/adaptive | distributed reference anchors, adaptive field tomography, rollback-energy escrow |

A technology basis changes machinery embodiment, service infrastructure, failure signatures, and operator workflow. It does not change the underlying route evidence or assign an unresolved FTL family to a named race.

---

## 14. Scaling behavior

Larger vessels cannot be modeled merely by multiplying power.

Differential acceleration across characteristic vessel span \(L_v\) remains approximately:

\[
\Delta a\sim\|T\|L_v.
\]

A rough structural stress scaling remains:

\[
\sigma_{\rm tidal}\sim\rho\|T\|L_v^2.
\]

Distributed-control pressure can be represented by:

\[
\Pi_c=\frac{L_c}{v_c\tau_r}.
\]

As \(\Pi_c\) grows, control architecture should move toward regional sensing, sectional abort authority, local recovery reserves, and independent timing ancestry.

A physically safe route for a small courier may therefore require materially different certification margins for a kilometer-scale habitat carrier even when both vessels use the same transit family.

---

## 15. Signature model

Segment certification can also produce route-dependent signatures.

A general signature vector remains:

\[
\mathbf S=
[S_{\rm EM},S_{\rm thermal},S_{\rm acoustic},S_{\rm chemical},S_{\rm biological},S_{\rm pressure},S_{\rm photonic},S_{\rm gravitic},S_{\rm wake}]^T.
\]

The physical corridor can change what a drive must do to retain margin, which can change observable emissions even when the drive's basic machinery is unchanged.

Examples include increased field power near difficult geometry, longer sensor integration times, larger thermal dumps after repeated solver retries, or stronger emergency reserve activation.

These relationships are engineering consequences, not universal stealth constants.

---

## 16. Failure taxonomy

### 16.1 Physical-model failure

The ordinary gravity/curvature approximation is invalid.

Result: `OUTSIDE_MODEL_VALIDITY`.

Do not replace this with an enormous finite severity number.

### 16.2 Evidence failure

Required masses, ephemerides, covariance, boundary state, or sensor ancestry are incomplete.

Result: `UNRESOLVED`.

### 16.3 Family-efficiency failure

The normalized physical environment drives \(\eta_g\) or \(\eta_{calc}\) below the active calibration threshold.

Result: `REJECTED`.

### 16.4 Observability failure

A required hazard channel is neither observed nor independently guarded.

Result: `REJECTED` or `UNRESOLVED`, depending on the governing certificate state.

### 16.5 Reachability failure

A blocker is detected but emergency response cannot clear it before commitment or arrival.

Result: route remains blocked.

### 16.6 Authority conflict

Two controlling calibration or named-source rules disagree.

Result: `CONFLICT`.

---

## 17. Runtime API contract

`resolveGeneratedFTLRouteSafety(context)` now recognizes a physical route path when any of the following are supplied:

- `physicalRoutePathContext`
- `pathPacket`
- `segmentPacket`

That path outranks single-point and archetype modes.

Relevant route-path inputs include:

```text
family
path
physicalRoutePathContext | pathPacket | segmentPacket
familyBoundaryHazard | familyBoundaryHazardKnownAbsent
projectedProgressRate
currentRouteFraction
measurementPacket
safetyState
recoveryState
requestedProfileId / requestedProfileVersion
namedOverrideIds
provenance
```

New route-level outputs include:

```text
environmentSource = PHYSICAL_ROUTE_PATH
familySegmentCertification
firstBlockingSegment
certificate = representative interval certificate when available
presentation
warnings
provenance
```

The representative interval certificate exists for presentation compatibility. It does not replace the full interval record.

---

## 18. Canon safeguards

1. Do not collapse a physical path into a single field point when path evidence exists.
2. Do not average interval safety states.
3. Do not inject route-archetype boundary values into a physical route.
4. Do not replace missing boundary evidence with zero.
5. Do not replace `OUTSIDE_MODEL_VALIDITY` with a finite severity value.
6. Do not infer a named civilization's FTL family from a simulation selection.
7. Do not call normalization references physical constants.
8. Do not describe a representative interval certificate as the entire route's evidence.
9. Do not spend protected recovery reserve on nominal performance.
10. Do not claim perfect safety at any technological maturity.

---

## 19. Practical equipment procedures

### RPSI-01 — Route evidence audit

1. Record route identity and epoch.
2. Record source authority for masses and positions.
3. Verify covariance or uncertainty ancestry.
4. Verify path samples remain ordered.
5. Verify no catalog coordinate is being treated as a safe emergence point by default.
6. Reject silent zero substitution for missing radius, velocity, epoch, or covariance.

### RPSI-02 — Family-boundary audit

1. Identify the selected family.
2. List the family-specific boundary hazards.
3. Identify the sensor or model that establishes each boundary state.
4. Mark each state `CONFIRMED`, `DERIVED`, `PROPOSED`, or `UNRESOLVED`.
5. Refuse certification if a required exotic boundary state is absent without an authoritative known-absent rule.

### RPSI-03 — First-blocker audit

1. Sort family-certified intervals by `fractionStart`.
2. Select the earliest blocking state.
3. Record its interval index and route fraction.
4. Calculate \(D_B\).
5. Record the exact reasons and provenance attached to that interval.
6. Confirm later intervals have not replaced the first blocker in presentation.

### RPSI-04 — Intervention audit

1. Determine whether the family uses continuous or precommit reachability.
2. For continuous mode, verify projected progress rate provenance.
3. Calculate \(t_{int}\).
4. Calculate \(D_{int}\) and \(M_D\).
5. For precommit mode, calculate \(M_T\) instead.
6. Reject any implementation that invents a local superluminal speed for a nonlocal operator solely to populate the equation.

### RPSI-05 — Recovery audit

1. Inventory total recovery authority.
2. Identify protected reserve.
3. Identify the worst credible recovery requirement associated with the first blocker.
4. Verify protected reserve remains unavailable for normal performance.
5. Repeat after maintenance, reconfiguration, software changes, or major route-model updates.

### RPSI-06 — Large-vessel audit

1. Record vessel characteristic span.
2. Evaluate tidal differential across that span.
3. Inspect regional sensor and controller topology.
4. Verify sectional abort authority.
5. Verify synchronization and timing ancestry.
6. Re-run route certification after material geometry changes.

### RPSI-07 — Alien-system service audit

1. Identify native navigation representation.
2. Identify native sensing and control channels.
3. Verify translation preserves the native state rather than replacing it.
4. Verify service-environment compatibility.
5. Re-certify after regrowth, crystal replacement, hydraulic repair, quench, biological healing, or adaptive-field reconfiguration.

### RPSI-08 — Export audit

1. Preserve the generated performance record.
2. Preserve every family-certified interval.
3. Preserve first-blocker identity.
4. Preserve calibration and normalization profile versions.
5. Preserve physical and fictional provenance separately.
6. Verify blocked states remain blocked after serialization.

---

## 20. Educational text — Transit Safety Engineering 550

### Module 1 — Why routes are not averages

Students prove with counterexamples that a conjunctive hazard chain cannot be represented by the arithmetic mean of segment scores.

### Module 2 — Dimensional discipline

Students classify \(\Phi\), \(g\), \(T\), and curvature quantities by units, then construct valid dimensionless normalization.

### Module 3 — Numerical path evidence

Students examine sampled extrema, finite differences, convergence, and the difference between a sampled envelope and an analytic bound.

### Module 4 — Covariance and missing knowledge

Students propagate uncertainty and demonstrate why missing covariance cannot be replaced by perfect certainty.

### Module 5 — Family-specific response

Students compare two families over the same physical path and explain why identical ordinary gravity can produce different fictional transit margins.

### Module 6 — Observability and common cause

Students design sensor ancestry such that two displays driven by one physical transducer are recognized as one sensor lineage rather than two independent channels.

### Module 7 — Intervention reachability

Students derive continuous and precommit reachability separately and identify the assumptions under which each is valid.

### Module 8 — Maintenance and recertification

Students audit a repaired installation and explain why functional recovery does not itself restore certification.

---

## 21. Worked classroom problem

A route is \(L=4.0\times10^{16}\,\mathrm m\) long. The first blocking interval begins at fraction

\[
f_B=0.740.
\]

The vessel is at

\[
f_c=0.700.
\]

Then

\[
D_B=(0.740-0.700)(4.0\times10^{16})
=1.6\times10^{15}\,\mathrm m.
\]

Assume, only for this continuous-mode exercise,

\[
v_p=2.0\times10^{13}\,\mathrm{m\,s^{-1}}
\]

and

\[
t_{int}=90\,\mathrm s.
\]

Then

\[
D_{int}=v_pt_{int}=1.8\times10^{15}\,\mathrm m.
\]

Therefore

\[
M_D=D_B-D_{int}=-2.0\times10^{14}\,\mathrm m.
\]

The blocker is detected too late under the modeled intervention chain.

The correct operational answer is not "92% safe." It is "reject or abort before commitment."

---

## 22. Research directions

- time-dependent tidal eigensystem tracking across moving multi-star systems;
- covariance-aware prediction of shear-fork topology;
- post-Newtonian escalation near compact objects;
- sensor common-cause analysis for alien instrumentation architectures;
- route-dependent signature prediction under safety-margin stress;
- optimal placement of navigation beacons to maximize uncertainty reduction per infrastructure cost;
- hybrid imported/native drive certification where control, sensing, and recovery have different technological ancestry;
- human factors for presenting first-blocker state without hiding the native alien representation.

---

## 23. Proposed patent-class developments

All items below are `PROPOSED` setting technology concepts, not current canon facts.

### 23.1 First-Blocker Provenance Capsule

A tamper-evident route record binding the earliest blocker to source observations, calibration profile, operator model, and software version.

### 23.2 Boundary-Ancestry Interlock

A hardware interlock that refuses to substitute generic boundary assumptions when the required family-specific sensing ancestry is absent.

### 23.3 Predictive Margin Corridor Display

A display that renders \(D_B\), \(D_{int}\), and margin evolution as separate quantities instead of one synthetic safety score.

### 23.4 Distributed Recovery Escrow Controller

A regional control architecture that prevents local performance optimizers from consuming reserve authority required by another section's emergency exit path.

### 23.5 Multi-Origin Transit Certification Ledger

A provenance ledger for hybrid installations in which sensors, control systems, drive machinery, and recovery systems come from different civilizations or manufacturers.

---

## 24. Closing engineering rule

The route safety system should answer the question an engineer actually needs answered:

> **Where is the first place this specific machine, using this specific transit family, ceases to have a defensible safe solution—and can we still do anything about it before we get there?**

That question is more useful than a route average, more honest than a generated speed rating, and considerably less likely to kill everyone aboard.
