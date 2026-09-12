# BLACK LIGHT FTL UNCERTAINTY-AWARE BOUNDARY REFINEMENT AND INTERVENTION MANUAL

**Authority class:** DERIVED engineering/manual authority  
**Governing design-intent source:** *The different lightspeed methods*  
**Purpose:** close the numerical and operational gap between a nominally detected tidal branch-identity transition and a ship crew's need to know how early that transition might plausibly occur, whether the route model has localized it well enough, and whether the vessel can still execute a family-appropriate emergency response before reaching it.

---

## 1. Why this volume exists

The existing Black Light propulsion stack already distinguishes ordinary gravitational physics from fictional FTL-family response. It propagates source states through time, evaluates route gravity and tidal curvature, tracks the principal tidal eigensystem, detects near-degenerate eigenbranch states, propagates source covariance into tidal covariance, and carries that uncertainty into the normalized operational branch-identity function

\[
\gamma_{ij}=\frac{|\lambda_i-\lambda_j|}{\max(|\lambda_i|,|\lambda_j|,\|T\|_F,\epsilon)}.
\]

The current operational branch-identity threshold is the versioned engineering control

\[
\gamma_{\min}=0.02.
\]

The actual boundary used by navigation is therefore

\[
h_{ij}=\gamma_{ij}-\gamma_{\min}=0.
\]

A boundary location without a boundary uncertainty is not enough for emergency navigation. If the nominal branch-loss point is at route fraction 0.420 but the available astrometry only constrains it to an uncertainty envelope that reaches back to 0.400, the conservative planning problem starts near 0.400, not at 0.420.

This volume defines that handoff.

---

## 2. Authority chain

```text
AUTHORITATIVE ASTROMETRY / SOURCE STATE
              |
              v
TIME-DEPENDENT SOURCE PROPAGATION
              |
              v
FAMILY ENCOUNTER-TIME MODEL
              |
              v
PHYSICAL GRAVITY + TIDAL TENSOR
              |
              v
ADAPTIVE SPATIOTEMPORAL SAMPLING
              |
              v
TIDAL EIGENBRANCH TRACKING
              |
              v
TIDAL COVARIANCE
              |
              v
NORMALIZED GAMMA UNCERTAINTY
              |
              v
UNCERTAINTY-AWARE BOUNDARY REFINEMENT
              |
              v
EARLIEST PLAUSIBLE ORDINARY-PHYSICS BOUNDARY
              |
              +-------------------------------+
              |                               |
              v                               v
CONTINUOUS INTERVENTION                PRECOMMIT / PORTAL
DISTANCE + TIME MARGIN                 FAMILY TIMING AUTHORITY
```

The new layer does not replace any upstream calculation. It consumes their evidence and asks a narrower engineering question: **is the operational topology boundary localized well enough for navigation, and what is the earliest conservative location the vessel must plan against?**

---

## 3. Boundary localization

For adjacent route samples \(a\) and \(b\), with route fractions \(f_a\) and \(f_b\), define

\[
h_a=\gamma_a-\gamma_{\min},
\qquad
h_b=\gamma_b-\gamma_{\min}.
\]

When the interval brackets the operational threshold, the local linear estimate is

\[
\boxed{
 f_*=f_a-\frac{h_a}{h_b-h_a}(f_b-f_a)
}
\]

This is a numerical localization model, not a statement that the true physical function is globally linear.

The normalized-degeneracy uncertainty authority supplies the conservative boundary-fraction uncertainty upper bound

\[
\sigma_{f,\mathrm{upper}}
\approx
\frac{\sigma_{h,\mathrm{upper}}}{|dh/df|}.
\]

Because cross-sample covariance is not yet represented, this quantity is deliberately described as a **conservative linear upper-bound construction**, not an exact one-sigma confidence interval.

---

## 4. Earliest and latest plausible operational boundary

Let \(k\) be the declared engineering sigma multiplier. The default control is

\[
k=2.
\]

Then

\[
\boxed{
 f_{\mathrm{early}}
 =
 \operatorname{clamp}(f_*-k\sigma_{f,\mathrm{upper}},0,1)
}
\]

and

\[
\boxed{
 f_{\mathrm{late}}
 =
 \operatorname{clamp}(f_*+k\sigma_{f,\mathrm{upper}},0,1).
}
\]

These quantities are planning envelopes. They are not probabilities of encountering an exotic hazard.

### Diagram: nominal versus conservative boundary

```text
route fraction --->

0.00 ----------------------------------------------------------- 1.00
                     [----------- uncertainty -----------]
                                 X
                                 ^ nominal f*
                     ^
                     earliest plausible f_early

ship ----->
```

The left edge is the conservative planning location for continuous emergency-response calculations.

---

## 5. Why uncertainty itself drives refinement

A route can be spatially well sampled and still be operationally under-resolved.

Suppose an interval is only 0.01 of route length wide, but its boundary uncertainty is 0.006. The numerical grid has not actually localized the branch-loss transition usefully.

Two versioned engineering controls are therefore introduced:

| Control | Default | Meaning |
|---|---:|---|
| maximum boundary sigma fraction | 0.0025 | absolute route-fraction uncertainty tolerated before more sampling is requested |
| maximum boundary sigma / interval span | 0.25 | relative localization requirement |
| sigma multiplier | 2 | conservative envelope multiplier |
| uncertainty refinement depth | 4 | secondary refinement depth after the ordinary adaptive pass |
| maximum total samples | 1536 | compute/resource ceiling |

These are engineering controls, not constants of nature.

An interval requests more resolution when:

\[
\sigma_{f,\mathrm{upper}}>0.0025
\]

or

\[
\frac{\sigma_{f,\mathrm{upper}}}{f_b-f_a}>0.25.
\]

It also requests more evidence when the normalized-boundary solver reports `BOUNDARY_UNCERTAIN` or `NONSMOOTH_ENDPOINT`.

Every inserted midpoint is then physically recomputed. The system does **not** interpolate the tidal tensor, covariance, eigenvalues, \(\gamma\), or boundary state.

---

## 6. Midpoint reconstruction

For a requesting interval

\[
[f_a,f_b],
\]

the numerical midpoint is

\[
f_m=\frac{f_a+f_b}{2}.
\]

But only the route parameter is interpolated. The physical state is regenerated through the complete authority chain:

```text
f_m
 |
 v
encounter epoch t(f_m)
 |
 v
propagate each source to t(f_m)
 |
 v
propagate covariance
 |
 v
calculate Phi, g, T
 |
 v
solve eigensystem
 |
 v
propagate tidal uncertainty
 |
 v
recalculate gamma +/- sigma_gamma
```

Thus

\[
\boxed{
\text{midpoint parameter interpolation}
\neq
\text{midpoint physics interpolation}
}
\]

---

## 7. Continuous-family intervention mathematics

For continuous projected-progress families, define current route fraction \(f_c\), route length \(L\), and earliest plausible boundary \(f_{\mathrm{early}}\).

The conservative remaining distance is

\[
\boxed{
D_{B,\mathrm{early}}
=
\max[0,(f_{\mathrm{early}}-f_c)L].
}
\]

The total modeled intervention time is

\[
\boxed{
t_{\mathrm{int}}
=t_{\mathrm{sensor}}
+t_{\mathrm{solver}}
+t_{\mathrm{decision}}
+t_{\mathrm{command}}
+t_{\mathrm{actuate}}
+t_{\mathrm{exit}}
+t_{\mathrm{clear}}
+t_{\mathrm{margin}}.
}
\]

If the family/controller exposes a defensible projected route-progress speed \(v_p\), then

\[
D_{\mathrm{int}}=v_pt_{\mathrm{int}}.
\]

The conservative clearance margin is

\[
\boxed{
M_{D,\mathrm{early}}
=D_{B,\mathrm{early}}-D_{\mathrm{int}}.
}
\]

Positive margin is required:

\[
M_{D,\mathrm{early}}>0.
\]

If

\[
M_{D,\mathrm{early}}\le0,
\]

the modeled response chain does not establish positive clearance before the conservative branch-loss boundary.

Where \(v_p>0\), the equivalent time margin is

\[
\boxed{
M_{T,\mathrm{early}}
=\frac{D_{B,\mathrm{early}}}{v_p}-t_{\mathrm{int}}.
}
\]

### Important semantic safeguard

\[
\boxed{
v_p>c\not\Rightarrow v_{\mathrm{hull,local}}>c}
\]

Projected progress is a route/controller representation. It is not automatically local velocity through ordinary spacetime.

---

## 8. PRECOMMIT and anchored-portal families

Q-Lattice, Fold Jump, and Phase Displacement remain PRECOMMIT families. Wormhole/Gate remains an anchored-portal family.

They do not receive fabricated intermediate corridor speeds merely to reuse continuous intervention equations.

For PRECOMMIT systems the relevant relationship remains of the form

\[
M_T=t_{\mathrm{prediction}}-t_{\mathrm{int}}.
\]

For portal systems, entry-mouth and exit-mouth state certification remains separate.

The new runtime therefore reports continuous-distance intervention as not applicable for those encounter models.

---

## 9. Family interpretation chart

| Transit family | Boundary refinement role | Intervention interpretation |
|---|---|---|
| Metric Envelope | secondary ordinary-curvature confidence | continuous projected-progress margin when family model supports it |
| Gravitational Plane | primary shear-topology precursor localization | continuous emergency detransit/shunt margin |
| Slipstream / Shear | primary lane-topology precursor localization | continuous exit/clearance margin |
| N-Manifold | secondary topology-confidence input | family-specific continuous representation if established |
| Inertial Torch | structural/navigation confidence | maneuver and structural-clearance timing |
| Q-Lattice | endpoint only | PRECOMMIT timing margin |
| Fold Jump | endpoint only | PRECOMMIT timing margin |
| Phase Displacement | endpoint only | PRECOMMIT timing margin |
| Wormhole / Gate | mouth-state only | entry/exit timing and anchor-state authority |

---

## 10. Ordinary physics versus fictional family response

The following are ordinary-physics/navigation evidence:

- source positions and velocities;
- source covariance;
- gravitational potential;
- acceleration;
- tidal tensor;
- tidal covariance;
- eigenvalues and eigenvectors;
- normalized branch-identity function \(\gamma\);
- boundary localization and boundary uncertainty.

They do not, by themselves, prove a fictional transit structure.

The family-specific response may consume these quantities, but it must preserve a separate exotic boundary/state term where one exists.

Conceptually:

\[
R_f
=
\mathcal F_f
(\Phi,\mathbf g,T,\lambda_k,\hat e_k,\Sigma_T,\gamma,\sigma_\gamma,B_f).
\]

The ordinary-physics stack can constrain every term except the fictional family-state term \(B_f\) unless a setting authority separately establishes it.

Therefore:

\[
\boxed{
\text{well-localized tidal topology}
\neq
\text{confirmed shear lane}
}
\]

and

\[
\boxed{
\text{poorly-localized tidal topology}
\neq
\text{high shear-lane danger probability}.
}
\]

---

## 11. Vessel scaling

For vessel characteristic size \(L_v\), differential gravitational loading still scales approximately as

\[
\Delta a\sim\|T\|L_v.
\]

A rough structural stress scale remains

\[
\sigma_{\mathrm{tidal}}\sim\rho\|T\|L_v^2.
\]

A large vessel therefore converts a navigation-localization problem into a distributed structural/control problem. Even before an FTL-specific failure mode is considered, uncertainty in where a tidal topology transition occurs changes how soon sectional loads, actuators, field projectors, and escape systems must be prepared.

Distributed control remains characterized by

\[
\Pi_c=\frac{L_c}{v_c\tau_r},
\]

where \(L_c\) is control-network scale, \(v_c\) is signal propagation speed in that network, and \(\tau_r\) is the characteristic environmental response time.

---

## 12. Power and recovery model

An uncertainty-aware emergency response should not be represented as a single power number.

The practical reserve model separates:

```text
sensing reserve
solver reserve
control reserve
field-actuation reserve
exit / collapse reserve
post-exit stabilization reserve
thermal reserve
structural reserve
```

The drive may have enough gross reactor output to sustain transit while lacking the **fast-dispatch recovery reserve** necessary to leave the corridor before the conservative boundary.

This creates a realistic distinction between steady-state drive power and emergency maneuver authority.

---

## 13. Signatures

The uncertainty-aware safety stack itself can produce observable signatures.

Terrestrial systems may emit increased interferometric, timing, compute, cooling, and high-bandwidth control activity as a route approaches a poorly localized transition.

Mineral-photonic systems may show resonance broadening and polarization-domain activity.

Biological/symbiotic systems may enter heightened sensory/metabolic states.

Aquatic electrochemical/hydraulic systems may show pressure/current redistribution.

Gas-giant systems may produce changing electrostatic and pressure-field patterns.

These are machinery signatures of **measurement and response**, not proof of the FTL phenomenon being measured.

---

## 14. Technology-basis machinery embodiments

### 14.1 Terrestrial electromechanical

Typical embodiment:

```text
astrometric receiver
 -> clock/reference rack
 -> covariance processor
 -> gradiometer array
 -> route solver
 -> boundary-envelope display
 -> independent abort bus
 -> field-collapse / detransit actuator
```

Operator display can show a nominal boundary line plus the conservative early/late envelope.

### 14.2 Aquatic electrochemical / hydraulic

The same mathematical packet can be embodied as conductive-current topology and pressure-manifold width. A widening uncertainty envelope may literally appear as a broader allowable/forbidden current channel rather than a Cartesian error bar.

### 14.3 Biological / symbiotic

A biological navigator can experience a narrow boundary as strong directional/topological salience and a broad envelope as a diffuse or bifurcating sensory region. The underlying packet must still retain explicit numerical provenance for cross-platform translation.

### 14.4 Mineral piezoelectric / photonic

Branch identity maps naturally to resonance separation and polarization domains. A near-degenerate region appears as merging modes; uncertainty appears as linewidth/domain spread.

### 14.5 Gas-giant pressure / electrostatic

A volumetric architecture may express the conservative boundary as a pressure/electrostatic confidence shell around a route corridor rather than as a point.

### 14.6 Hybrid and salvaged machinery

Preserve separately:

- original sensor ancestry;
- solver ancestry;
- drive ancestry;
- control retrofit manufacturer;
- present owner;
- present operator;
- displayed representation.

\[
\boxed{
\text{owner}\neq\text{operator}\neq\text{manufacturer}\neq\text{inventor}\neq\text{technology ancestry}
}
\]

---

## 15. Failure taxonomy

**UBR-NO-COV** — required covariance is absent.  
**UBR-BOUNDARY-BROAD** — normalized branch boundary exists but exceeds localization controls.  
**UBR-NONSMOOTH** — local normalized-boundary derivative is not uniquely defined.  
**UBR-SAMPLE-CEILING** — compute/resource ceiling reached before localization converged.  
**UBR-DEPTH-CEILING** — allowed refinement depth exhausted.  
**UBR-NO-ROUTE-LENGTH** — distance-to-boundary cannot be established.  
**UBR-NO-INTERVENTION-TIME** — response-chain time is incomplete.  
**UBR-NO-PROGRESS-SEMANTIC** — projected progress is unavailable or semantically invalid for continuous clearance.  
**UBR-UNREACHABLE** — conservative continuous response margin is non-positive.  
**UBR-PRECOMMIT-VELOCITY-FABRICATION** — implementation attempted to assign a fake corridor speed to an endpoint family.  
**UBR-CANON-LEAK** — ordinary topology evidence was incorrectly promoted into fictional FTL-state canon.

---

## 16. Practical equipment procedures

### UBR-01 — Boundary evidence intake

1. Confirm family identity from authority, not operator assumption.
2. Confirm route encounter model.
3. Verify adaptive route packet provenance.
4. Verify tidal covariance packet provenance.
5. Verify normalized-\(\gamma\) packet uses the same \(\gamma_{\min}\).
6. Refuse missing covariance rather than substituting zero.

### UBR-02 — Localization audit

1. Identify every `BOUNDARY_ESTIMATED` interval.
2. Record \(f_*\) and \(\sigma_{f,\mathrm{upper}}\).
3. Compare uncertainty with both absolute and interval-relative controls.
4. Mark over-broad intervals for midpoint reconstruction.

### UBR-03 — Non-smooth boundary audit

1. Preserve `NONSMOOTH_SCALE` and `NONSMOOTH_GAP` states.
2. Do not average the two sides into a synthetic derivative.
3. Request additional local physical samples where family semantics permit.
4. If non-smoothness persists, retain the unresolved state.

### UBR-04 — Conservative boundary planning

1. Select the declared \(k\) multiplier.
2. Calculate \(f_{\mathrm{early}}\).
3. Archive \(k\), nominal boundary, sigma upper bound, and source packet IDs.
4. Do not relabel the result as a statistical confidence interval unless a stronger covariance model justifies that claim.

### UBR-05 — Continuous emergency reachability

1. Establish \(f_c\) and \(L\).
2. Establish \(v_p\) and its semantic meaning.
3. Sum the complete intervention chain.
4. Calculate \(D_{B,\mathrm{early}}\).
5. Calculate \(D_{\mathrm{int}}\).
6. Require positive \(M_D\).
7. Record every timing component; do not hide latency inside one opaque number.

### UBR-06 — PRECOMMIT audit

1. Reject any fabricated intermediate velocity.
2. Use prediction/commit/emergence timing authority.
3. Preserve endpoint covariance independently.
4. Apply the family timing margin, not the continuous distance margin.

### UBR-07 — Maintenance recertification

Repeat uncertainty-aware route certification after changes to:

- astrometric catalog;
- clock/reference authority;
- gradiometer calibration;
- navigation processor;
- field-control latency;
- emergency-collapse hardware;
- structural clearance time;
- software threshold version.

### UBR-08 — Archaeological / alien recovery

When recovering a derelict or alien installation, identify whether apparently missing navigation capability is actually missing **infrastructure ancestry**. A functioning drive may still be unusable if its civilization-scale astrometric covariance service, reference frame, or clock authority no longer exists.

---

## 17. Worked example

Assume:

\[
f_c=0.300,
\qquad
L=8.0\times10^{15}\ \mathrm m.
\]

A normalized branch-identity transition is estimated at

\[
f_*=0.420
\]

with conservative upper-bound uncertainty

\[
\sigma_f=0.004.
\]

Using \(k=2\):

\[
f_{\mathrm{early}}
=0.420-2(0.004)
=0.412.
\]

Therefore

\[
D_{B,\mathrm{early}}
=(0.412-0.300)(8.0\times10^{15})
=8.96\times10^{14}\ \mathrm m.
\]

Suppose the controller exposes

\[
v_p=2.0\times10^{10}\ \mathrm{m\,s^{-1}}
\]

as a projected-progress representation, and the complete emergency chain totals

\[
t_{\mathrm{int}}=3.8\times10^4\ \mathrm s.
\]

Then

\[
D_{\mathrm{int}}
=(2.0\times10^{10})(3.8\times10^4)
=7.6\times10^{14}\ \mathrm m.
\]

The conservative distance margin is

\[
M_D
=8.96\times10^{14}-7.6\times10^{14}
=1.36\times10^{14}\ \mathrm m.
\]

The modeled intervention chain therefore retains positive clearance.

If the covariance worsens so that \(\sigma_f=0.012\), then

\[
f_{\mathrm{early}}=0.396,
\]

and

\[
D_{B,\mathrm{early}}=7.68\times10^{14}\ \mathrm m.
\]

The margin falls to

\[
8.0\times10^{12}\ \mathrm m.
\]

The drive did not become weaker. The route did not necessarily become physically more dangerous. **The navigation evidence became less certain, consuming the emergency-response margin.**

That distinction is central to Black Light engineering.

---

## 18. Educational sequence

### Transit Environment Physics 650 — Uncertainty-Aware Operational Boundaries and Intervention Reachability

Students should be able to:

- derive the local normalized branch-loss boundary;
- distinguish exact eigenvalue coalescence from the operational \(\gamma_{\min}\) threshold;
- explain why cross-sample covariance matters;
- derive conservative early/late boundary envelopes;
- explain why uncertainty can consume safety margin without increasing physical hazard probability;
- calculate continuous intervention distance and time margins;
- identify when projected progress may not be interpreted as local velocity;
- distinguish continuous, PRECOMMIT, and anchored-portal response logic;
- reconstruct provenance from source astrometry to emergency-control decision.

### Examination problem

A route segment has

\[
f_a=0.51,
\quad
f_b=0.53,
\quad
h_a=0.012,
\quad
h_b=-0.008.
\]

1. Calculate the nominal operational boundary fraction.
2. Given \(\sigma_{f,\mathrm{upper}}=0.003\), calculate the \(k=2\) conservative early boundary.
3. Determine whether the interval meets a 0.25 sigma/span control.
4. Explain why a failure of that control requests more evidence rather than directly increasing the fictional shear-fork probability.

---

## 19. Proposed patent-class technologies

All items in this section are **PROPOSED**, not setting canon unless promoted by a higher authority.

**Uncertainty-Envelope Route Interlock** — inhibits commitment when the conservative operational boundary enters the declared emergency-response envelope.

**Cross-Sample Covariance Route Solver** — carries correlated sample uncertainty so boundary location can move from a conservative upper bound toward a statistically defined posterior estimate.

**Topology Boundary Salience Projector** — translates nominal and conservative topology envelopes into species-native sensory/control representations.

**Fast Replan Abort Bus** — couples new midpoint evidence directly to independent field-collapse authority without waiting for the full strategic-navigation stack.

**Archaeological Reference-Frame Emulator** — reconstructs missing historical astrometric/clock infrastructure sufficiently to evaluate whether an ancient drive can be safely certified.

---

## 20. Research ladder

```text
conservative independent-sample boundary bound
                |
                v
cross-sample covariance
                |
                v
joint source + route-state covariance
                |
                v
sigma-point / unscented boundary propagation
                |
                v
Monte Carlo nonlinear boundary posterior
                |
                v
higher-fidelity moving-source gravity
                |
                v
family-specific uncertainty-aware hazard response
```

Every stage must preserve provenance and distinguish ordinary physical inference from fictional FTL-family mechanics.

---

## 21. Canon safeguards

1. A numerical route family selection does not assign that technology to a named species.
2. A well-localized ordinary tidal transition does not prove an exotic shear lane.
3. A broad covariance envelope does not mean the fictional hazard is highly probable.
4. Missing covariance does not mean perfect certainty.
5. Missing timing data does not mean zero latency.
6. Missing family boundary state does not mean safe state.
7. Projected progress does not automatically mean local hull velocity.
8. PRECOMMIT and portal families do not gain intermediate corridor states merely because continuous equations are convenient.
9. Engineering thresholds are versioned controls, not constants of nature.
10. Sample ceilings are compute limits, not proofs of convergence.

---

## 22. Generator/API requirement

Generators should preserve the following evidence path:

```text
source-state provenance
 -> encounter-time provenance
 -> physical environment provenance
 -> eigenbranch provenance
 -> tidal covariance provenance
 -> normalized gamma provenance
 -> uncertainty-refinement provenance
 -> conservative boundary provenance
 -> intervention timing provenance
 -> final family certification
```

A UI may summarize this chain, but it may not replace it with a single unexplained percentage.

The machine-readable authority for this volume is:

- `data/exo-vessel/ftl-uncertainty-aware-boundary-refinement-registry.json`
- `data/schemas/exo-vessel-ftl-uncertainty-aware-boundary-refinement.schema.json`
- `blacklight-exo-ftl-uncertainty-aware-boundary-refinement-runtime.js`

---

## 23. Closing engineering principle

The central operational distinction is:

\[
\boxed{
\text{Where the model says the boundary is}
\neq
\text{How early the boundary might plausibly be}
}
\]

and therefore:

\[
\boxed{
\text{nominal clearance}
\neq
\text{conservative emergency clearance}.
}
\]

That difference is where covariance becomes machinery, maintenance doctrine, navigation infrastructure, and ultimately survivability.
