# Black Light FTL Physical Route Environment Certification Manual

**Status:** MIXED — real-physics environmental mathematics, DERIVED integration logic, PROPOSED normalization/calibration.

**Primary authority:** `BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md`

**Design-intent source:** Google Drive, **The different lightspeed methods**, document `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`, revision `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`.

This manual defines the handoff between physically evaluated gravity/curvature and Black Light's fictional FTL safety operators. Its purpose is not to make an invented drive physically real. Its purpose is to stop the simulation from using invented gravity numbers when actual mass, position, velocity, radius, and uncertainty data are available.

---

## 1. Governing separation

The certification chain is:

```text
mass / ephemeris / radius / velocity / uncertainty
                    |
                    v
     ordinary gravity + curvature solver
                    |
                    v
          SI physical environment packet
                    |
          [versioned normalization]
                    |
                    v
        dimensionless safety environment
                    |
      + fictional family-boundary hazards
                    |
                    v
       family-specific FTL response model
                    |
                    v
          route safety certificate
```

The first half is ordinary physics within declared model limits. The second half is Black Light engineering fiction.

The system therefore enforces:

\[
\boxed{\text{physical environment}\neq\text{FTL operator physics}}
\]

and:

\[
\boxed{\text{normalization scale}\neq\text{constant of nature}}.
\]

---

## 2. Source precedence

When a route candidate contains an authoritative physical environment context, that physical packet outranks the generic route archetype for gravity and curvature.

The selection rule is:

```text
physicalEnvironmentContext supplied?
        |
       yes
        v
resolve SI physical environment
        |
  +-----+------------------+
  |                        |
READY                PARTIAL / UNRESOLVED / INVALID
  |                        |
  v                        v
normalize              BLOCK CERTIFICATION
  |
  v
route certificate

no physicalEnvironmentContext
        |
        v
PROPOSED route archetype fallback
```

A supplied bad measurement packet is **not permission to pretend no measurement exists**.

That means:

\[
\boxed{\text{invalid supplied physics}\not\Rightarrow\text{fallback archetype}}
\]

Only genuine absence of a physical packet permits the fallback.

---

## 3. Physical quantities

The upstream curvature environment runtime evaluates weak-field quantities from declared SI source records.

For sources \(M_a\) at positions \(\mathbf x_a\), field point \(\mathbf x\), and separation \(r_a=|\mathbf x-\mathbf x_a|\):

\[
\Phi(\mathbf x)=-\sum_a\frac{GM_a}{r_a}
\]

with a declared reference potential:

\[
\Delta\Phi=\Phi(\mathbf x)-\Phi_{\rm ref}.
\]

The dimensionless potential depth is:

\[
\epsilon_\Phi=\frac{|\Delta\Phi|}{c^2}.
\]

Coordinate gravitational acceleration is:

\[
\mathbf g(\mathbf x)=-\sum_a GM_a\frac{\mathbf x-\mathbf x_a}{r_a^3}.
\]

The point-mass weak-field tidal tensor is:

\[
T_{ij}=\sum_a\frac{GM_a}{r_a^3}\left(3n_i n_j-\delta_{ij}\right).
\]

The local engineering norm is:

\[
\|T\|_F=\sqrt{\sum_{ij}T_{ij}^2}.
\]

These are deliberately kept separate. Coordinate acceleration is not tidal stress, and neither is identical to curvature.

---

## 4. Curvature reference

For an isolated Schwarzschild source, the exact vacuum Kretschmann scalar is:

\[
K=R_{\alpha\beta\gamma\delta}R^{\alpha\beta\gamma\delta}
 =\frac{48G^2M^2}{c^4r^6}.
\]

The bridge uses:

\[
R_* = \sqrt{K}
\]

only as the maximum **single-source Schwarzschild-reference curvature scale** supplied by the upstream physical runtime.

It is not correct in general to write:

\[
K_{\rm binary}=K_1+K_2.
\]

Exact multi-body spacetime curvature is nonlinear. A binary, close compact pair, or other strongly relativistic system requires a higher-fidelity metric treatment when the weak-field model fails.

---

## 5. Model validity is a certification state

The physical environment resolver evaluates whether its own assumptions remain valid. A weak-field engineering packet is acceptable only while its declared validity conditions hold.

Representative checks include:

\[
\epsilon_\Phi\ll1,
\]

\[
\frac{r}{r_s}\gg1,
\qquad
r_s=\frac{2GM}{c^2},
\]

and small source velocity relative to light speed:

\[
\beta=\frac{v}{c}\ll1.
\]

When those assumptions fail, the result is:

`OUTSIDE_MODEL_VALIDITY`

not an arbitrarily enormous but finite gravity score.

For certification purposes:

| Physical status | Route action |
|---|---|
| RESOLVED | normalize and continue |
| PARTIAL | UNRESOLVED; do not certify |
| UNRESOLVED | UNRESOLVED; do not certify |
| OUTSIDE_MODEL_VALIDITY | REJECTED until a valid higher-fidelity model is supplied |

---

## 6. Why normalization is mandatory

A route-safety severity model cannot lawfully add raw values such as:

\[
|\Delta\Phi|+|\mathbf g|+\|T\|+R_*.
\]

The terms have different dimensions:

| Quantity | Units |
|---|---|
| \(|\Delta\Phi|\) | m² s⁻² |
| \(|\mathbf g|\) | m s⁻² |
| \(\|T\|\) | s⁻² |
| \(R_*\) | m⁻² |

Instead each term is divided by an explicit reference scale.

The current **PROPOSED** engineering normalization profile is:

\[
\epsilon_{\Phi,\rm ref}=10^{-8}
\]

\[
g_{\rm ref}=10^{-2}\;{\rm m\,s^{-2}}
\]

\[
T_{\rm ref}=10^{-10}\;{\rm s^{-2}}
\]

\[
R_{\rm ref}=10^{-24}\;{\rm m^{-2}}
\]

\[
\sigma_{\rm ref}=10^{-2}.
\]

These are simulation reference scales, not discoveries and not universal Black Light constants.

The normalized channels are:

\[
G_\Phi=\frac{\epsilon_\Phi}{\epsilon_{\Phi,\rm ref}},
\]

\[
G_g=\frac{|\mathbf g|}{g_{\rm ref}},
\]

\[
G_T=\frac{\|T\|_F}{T_{\rm ref}},
\]

\[
G_R=\frac{R_*}{R_{\rm ref}}.
\]

These dimensionless values can then enter the existing versioned route-safety calibration.

---

## 7. Mass-model uncertainty

A physical route is not fully defined by nominal mass and position values. Certification needs bounded uncertainty.

The bridge currently accepts nonnegative fractional one-sigma terms for mass, ephemeris, physical-model, clock, sensor, registration, and common-cause uncertainty.

A provisional mass/model burden is formed as a root-sum-square:

\[
\sigma_{m,\rm model}
=
\sqrt{
\sigma_m^2+
\sigma_{\rm eph}^2+
\sigma_{\rm model}^2
}.
\]

The normalized mass-model term becomes:

\[
U_m=rac{\sigma_{m,\rm model}}{\sigma_{\rm ref}}.
\]

The RSS construction assumes the three summarized errors are being treated as independent for this scalar engineering proxy. If the actual covariance is known, the covariance matrix is the better authority and this simplification should be replaced.

The bridge deliberately rejects missing uncertainty rather than applying:

\[
\sigma=0.
\]

Missing information is not perfect information.

---

## 8. Covariance transport

For the current bridge version, each supplied fractional one-sigma term is squared and transported as a diagonal covariance proxy:

\[
\Sigma_{ii}\approx\sigma_i^2.
\]

This is labeled **DERIVED** rather than real measurement covariance unless the source itself supplies a true covariance matrix.

Future high-fidelity navigation records should support:

\[
\Sigma' = J\Sigma J^T + \Sigma_{\rm model},
\]

where \(J\) is the Jacobian of the coordinate/model transformation.

That upgrade is especially important for gravitational-plane navigation near moving barycenters and for endpoint-constrained Fold/Q-Lattice calculations.

---

## 9. Handoff to the fictional family model

Once all physical quantities are dimensionless, the existing safety model applies its explicitly fictional family response.

The generic severity combination remains:

\[
G=
 w_\Phi G_\Phi+
 w_g G_g+
 w_T G_T+
 w_R G_R+
 w_U U_m.
\]

The operator-specific penalty remains:

\[
P_f=a_fG+b_fG^2+c_fG^{n_f}+d_fU_m+e_fB_f.
\]

Then:

\[
\eta_{g,f}=e^{-P_f}.
\]

Here \(B_f\) is a family-boundary hazard. It is **not** computed from Newtonian gravity alone. Q-boundaries, address-state instability, manifold topology, Fold closure state, wormhole throat stability, or displacement reconciliation are features of the fictional operator.

This is one of the most important authority boundaries in the entire FTL corpus.

---

## 10. Miscalculation efficiency

Calculation uncertainty continues to use the family-specific amplification model:

\[
\eta_{\rm calc,f}
=
\exp\left[-k_fA_f^2\operatorname{tr}(\Sigma_E)\right].
\]

Because the covariance terms now may originate from actual source uncertainty rather than a route archetype, identical drive machinery can produce materially different certification results in two observations of the same nominal route.

Improved astronomy, better clocks, more precise mass estimates, or better registration can therefore increase route confidence without changing the drive itself.

---

## 11. Gravitational-plane interpretation

The physically grounded precursor to a gravitational shear-lane fork is not a glowing road dividing in half.

It is a change in the structure of the gravitational/tidal field such that competing admissible route solutions emerge.

Useful physical observables include:

- principal eigenvalues of \(T_{ij}\);
- eigenvector direction and rate of rotation;
- local saddle structure;
- barycentric motion;
- hidden-mass covariance;
- temporal derivatives of the field solution.

A future fork indicator can be written schematically as:

\[
F_{\rm fork}
=
\mathcal F
\left(
\lambda_i,
\dot\lambda_i,
\hat e_i,
\dot{\hat e}_i,
\Sigma_M,
\Sigma_{\rm eph}
\right),
\]

but the exact functional form remains **PROPOSED** until the fictional gravitational-plane operator is further specified.

---

## 12. Metric-compression interpretation

Metric-compression systems are expected to respond strongly to curvature and field-boundary geometry.

Ordinary gravity contributes the external spacetime background against which the fictional engineered metric is imposed.

The physical route packet therefore constrains:

- external curvature;
- tidal gradient;
- background potential depth;
- clock-rate differences;
- field-boundary asymmetry induced by nearby masses.

It does not provide a real negative-energy solution or prove that a warp metric can be engineered.

---

## 13. Q-Lattice, Fold, N-Manifold, and Phase systems

For nonlocal or higher-dimensional families, ordinary gravity primarily constrains reference state, clock synchronization, endpoint covariance, local admissibility, and return/closure conditions.

Physical gravity therefore remains important even when the fictional travel operator is not represented as local superluminal motion.

A Fold route can be rejected because the destination physical state is inadequately known even though the Fold operator itself would nominally have enough power.

Likewise a Q-Lattice address can remain formally valid while its mapped physical endpoint covariance becomes unacceptable.

---

## 14. Scaling across vessel size

Physical environment burden is not independent of vessel geometry.

For characteristic separation vector \(\boldsymbol\xi\):

\[
\Delta\mathbf a\approx T\boldsymbol\xi.
\]

For characteristic vessel length \(L\):

\[
\Delta a\sim\|T\|L.
\]

A rough structural-stress scale is:

\[
\sigma_{\rm tidal}\sim\rho\|T\|L^2.
\]

This provides a physical reason larger ships can encounter disproportionately harder transit certification near strong tidal fields even when their reactors scale adequately.

A large installation should therefore scale sensor baseline, sectional field control, structural reserve, abort authority, and independent local recovery rather than simply increasing generator output.

---

## 15. Navigation infrastructure

A physically grounded route solution benefits from infrastructure that improves the upstream environment packet rather than only the drive.

Examples include:

- precision astrometric beacons;
- mass-distribution surveys;
- binary ephemeris networks;
- clock-transfer stations;
- distributed tidal observatories;
- gravimetric route monitors;
- occultation networks for hidden-mass detection;
- independent route-validation stations.

Infrastructure can reduce uncertainty even when it does not alter the transit mechanism.

Thus:

\[
\text{better infrastructure}
\Rightarrow
\text{smaller }\Sigma_E
\Rightarrow
\text{larger calculation margin}
\]

without implying a more powerful drive.

---

## 16. Signatures

The physical environment itself is not a drive signature. The ship's response to that environment may be.

Potential observable channels include:

- increased field-generator power;
- thermal rejection during high-burden operation;
- stronger active gravimetry;
- denser sensor emissions;
- repeated abort/recoupling pulses;
- station-keeping thrust near a hazardous commit point;
- synchronization traffic with external navigation infrastructure.

A civilization with better passive gravimetry may reduce one signature channel while increasing another through computational or cooling burden.

---

## 17. Failure taxonomy

### 17.1 Source-model failure

Mass, position, velocity, or radius are wrong or incomplete.

Result: physical packet becomes `UNRESOLVED`, `PARTIAL`, or invalid.

### 17.2 Approximation failure

Weak-field, point-mass, or slow-motion assumptions cease to hold.

Result: `OUTSIDE_MODEL_VALIDITY`.

### 17.3 Normalization failure

Reference scale is zero, missing, unversioned, or dimensionally inappropriate.

Result: certification must not proceed.

### 17.4 Covariance failure

Uncertainty is missing or incorrectly represented as zero.

Result: route cannot be certified from the physical packet.

### 17.5 Provenance failure

Physical and fallback archetype values are mixed without declaring origin.

Result: evidence contamination; certificate invalid.

### 17.6 Operator failure

Physical environment is valid, but the fictional FTL family cannot tolerate it.

Result: `REJECTED` or `MARGINAL` depending on the established safety model.

---

## 18. API contract

The bridge runtime is:

`BlacklightExoFTLPhysicalRouteEnvironmentRuntime.resolveFTLPhysicalRouteEnvironment(context)`

Primary input:

```js
{
  physicalEnvironmentContext: {
    referenceFrame: 'barycentric inertial frame',
    fieldPoint: {x: 0, y: 0, z: 0},
    sources: [/* SI mass/position/velocity/radius records */],
    potentialReferenceM2PerS2: 0,
    uncertainty: {
      massFractional1Sigma: 1e-6,
      ephemerisFractional1Sigma: 1e-7,
      modelFractional1Sigma: 1e-5,
      clockFractional1Sigma: 1e-10,
      sensorFractional1Sigma: 1e-5,
      registrationFractional1Sigma: 1e-6,
      commonCauseFractional1Sigma: 1e-6,
      hiddenMassProbability: 0.01
    }
  },
  familyBoundaryHazard: 0.3,
  epoch: 'route-solution-2044'
}
```

The bridge returns the original physical environment, normalized safety environment, uncertainty packet, profile identity, warnings, and provenance.

---

## 19. Route-safety integration

`resolveGeneratedFTLRouteSafety(context)` now has two environment modes.

### `PHYSICAL_SI`

Used whenever `physicalEnvironmentContext` is supplied and resolves fully.

The certificate records:

- physical environment provenance;
- physical normalization profile;
- ordinary safety calibration profile;
- family response;
- route hazards;
- recovery and lookahead state.

### `PROPOSED_ROUTE_ARCHETYPE`

Used only when no physical environment is supplied.

This remains useful for encounter generation, conceptual comparison, procedural worldbuilding, and incomplete sectors, but must never be presented as measured astrophysics.

---

## 20. Practical equipment procedure PRC-01 — source audit

1. Identify the coordinate frame.
2. Identify the field point and epoch.
3. Inventory every materially relevant massive source.
4. Record mass and position in SI units.
5. Record source velocity when model validity depends on slow motion.
6. Record physical radius for exterior point-mass validity.
7. Record angular momentum only if actually known.
8. Attach provenance to every source.
9. Reject any source with an invented zero used in place of missing data.

Pass condition: all required source records are physically interpretable and traceable.

---

## 21. PRC-02 — uncertainty audit

Verify bounded nonnegative one-sigma uncertainty for mass, ephemeris, model, clock, sensor, registration, and common-cause terms.

Do not certify if one of these fields is simply absent.

If the true covariance matrix is known, archive it even if the current bridge transports only diagonal proxies.

Pass condition: missing uncertainty has not been silently converted to certainty.

---

## 22. PRC-03 — model-validity audit

Check:

- weak-field potential depth;
- compactness ratio;
- source velocity;
- exterior point-mass applicability;
- any source-specific exceptions.

If any hard assumption fails, stop weak-field certification and escalate to an appropriate relativistic model.

Pass condition: the physical model is valid for the evaluated point and epoch.

---

## 23. PRC-04 — normalization audit

Confirm the exact normalization profile ID and version.

Verify each dimensional term is divided by the matching dimensional reference scale before combination.

Do not compare a raw tidal tensor norm numerically with acceleration or potential.

Pass condition: all combined route-severity inputs are dimensionless.

---

## 24. PRC-05 — family-boundary separation

Identify which hazards arise from ordinary physical environment and which arise from the fictional operator.

For example:

- tidal shear: physical;
- hidden mass: physical/model uncertainty;
- Q-boundary adhesion: fictional family boundary;
- Fold closure path: fictional family boundary;
- throat stability: fictional family boundary;
- collision course: ordinary physical trajectory hazard.

Pass condition: fictional operator hazards have not been mislabeled as real gravitational measurements.

---

## 25. PRC-06 — certificate provenance audit

A physical-route certificate must retain:

1. source environment provenance;
2. physical model status;
3. physical normalization profile and version;
4. FTL safety calibration profile and version;
5. family identity;
6. route identity;
7. measurement/covariance provenance;
8. certificate timestamp/epoch where available.

Pass condition: the certificate can be replayed without guessing which assumptions were used.

---

## 26. PRC-07 — invalid-model response

When `OUTSIDE_MODEL_VALIDITY` occurs:

- do not increase the numerical severity until it “looks dangerous enough”;
- do not use the proposed route archetype;
- do not lower the family performance rating;
- do not claim the route is impossible in absolute terms.

State only that the current physical model is insufficient for certification.

Pass condition: model ignorance is not disguised as a quantitative prediction.

---

## 27. PRC-08 — recertification after ephemeris change

A route certificate is epoch-dependent.

Recompute after material changes in:

- binary orbital phase;
- source mass estimate;
- hidden-mass discovery;
- ephemeris covariance;
- reference-frame solution;
- navigation infrastructure;
- route endpoint;
- drive family or installation state.

Pass condition: a certificate does not outlive the environment model that justified it.

---

## 28. Educational text — first principles

A student should be able to explain why the following statement is wrong:

> “Gravity at this point is 0.006 m/s², therefore tides are weak.”

Acceleration and gradient are not the same quantity. A spacecraft in free fall can have negligible proper acceleration while experiencing measurable differential gravity.

Likewise this statement is wrong:

> “The black hole route gets a severity of 500, so our model still works.”

If the weak-field approximation fails, the correct engineering answer is that the model is invalid, not that its score becomes very large.

---

## 29. Transit Environment Physics 510

Recommended modules:

1. Newtonian potential and reference choice.
2. Coordinate acceleration versus proper acceleration.
3. Tidal tensors and eigenanalysis.
4. Schwarzschild compactness and curvature invariants.
5. Weak-field validity and approximation discipline.
6. Measurement uncertainty and covariance.
7. Dimensionless normalization.
8. Route-model provenance.
9. Family-response separation.
10. Certification replay and recertification.

Laboratory work should include a single-star route, a binary route, a hidden-mass perturbation exercise, and a deliberate model-validity failure near a compact object.

---

## 30. Advanced thesis directions

### 30.1 Time-dependent tidal eigensystems

Develop numerically stable prediction of eigenvector rotation and branch formation in moving multi-body weak-field systems.

### 30.2 Covariance-aware shear-fork prediction

Construct a probabilistic fork detector that operates on source covariance rather than nominal masses alone.

### 30.3 Post-Newtonian route packets

Define the smallest useful post-Newtonian extension for systems where weak-field Newtonian gravity becomes inadequate but full numerical relativity is unnecessary.

### 30.4 Relativistic compact-object route refusal

Design a model-selection controller that transitions from weak-field to post-Newtonian to numerical-relativity data products without flattening all three into one fake “gravity score.”

### 30.5 Infrastructure observability economics

Quantify how distributed astrometric and gravimetric infrastructure changes route certification margins independently of drive hardware improvements.

---

## 31. Proposed patent-class developments

All items in this section are **PROPOSED** in-universe engineering developments.

### 31.1 Physical Packet Provenance Capsule

Cryptographically binds source masses, ephemerides, frame, epoch, covariance, model version, and normalization profile to the resulting transit certificate.

### 31.2 Approximation Refusal Interlock

Prevents a navigation computer from using a weak-field packet when compactness or source-motion limits have been exceeded.

### 31.3 Tidal Eigenbranch Predictor

Tracks the time evolution of principal tidal directions and warns of likely gravitational-plane branch bifurcation.

### 31.4 Covariance Ancestry Display

Shows which part of route uncertainty originates in astronomy, sensor noise, clock transfer, coordinate registration, or operator-model uncertainty.

### 31.5 Multi-Fidelity Route Solver

Maintains separate Newtonian, post-Newtonian, and high-fidelity relativistic solutions and exposes model disagreement as a safety channel instead of averaging the models together.

---

## 32. Generator safeguards

The generator must obey all of the following:

- Never fabricate SI physical inputs merely because a route type was selected.
- Never label a proposed route archetype as a measurement.
- Never silently replace an invalid supplied physical packet with a fallback archetype.
- Never add unlike dimensional physical quantities before normalization.
- Never call a normalization reference a physical constant.
- Never treat missing covariance as zero.
- Never infer FTL family from the physical environment.
- Never infer a named race's family limit from a generic calibration profile.
- Never convert `OUTSIDE_MODEL_VALIDITY` into a finite safe value.
- Never claim the physical model proves FTL itself.

---

## 33. Closing engineering principle

The purpose of physically based mathematics in Black Light is not decorative realism. It is constraint discipline.

The environment should behave like an environment that could be measured by competent engineers. The fictional drive should then have to live with those measurements.

That preserves the setting's intended distinction:

\[
\boxed{
\text{real gravity}
\rightarrow
\text{measured constraints}
\rightarrow
\text{invented transit response}
}
\]

rather than the much weaker construction:

\[
\boxed{
\text{route name}
\rightarrow
\text{arbitrary danger number}
}.
\]

The latter remains acceptable only as an explicitly labeled procedural fallback when the universe has not yet supplied enough physical information to do better.
