# Black Light FTL Adaptive Spatiotemporal Refinement Manual

Status: DERIVED engineering authority subordinate to `BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md` and named race/technology sources.

Design-intent source: **The different lightspeed methods**, Google Doc `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`, revision `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`.

## 1. Purpose

A route may be adequately sampled in ordinary space and still be badly sampled in time. A moving binary saddle, rotating acceleration vector, rapidly growing covariance packet, or short-lived tidal branch can pass between two samples whose spatial separation looks acceptable.

This manual defines the adaptive refinement layer that closes that gap for transit families represented by continuous projected progress.

The layer does **not** introduce a new gravity model. It repeatedly asks the existing encounter-time authority to evaluate additional midpoint states.

```text
published source state
        |
        v
time-dependent source propagation
        |
        v
family encounter-time evaluation
        |
        v
initial route samples
        |
        v
adaptive spatiotemporal audit
   /      |       \
space    time   covariance
   \      |       /
        refine
        |
        v
new midpoint encounter state
        |
        v
repeat until tolerances or resource ceiling
```

## 2. Authority boundary

The refinement runtime may decide **where more evidence is required**. It may not decide what FTL physics is true.

It consumes:

- the explicit transit family;
- the family encounter model;
- propagated source states;
- ordinary weak-field gravity/curvature outputs;
- propagated covariance;
- route/control encounter timing.

It does not assign a drive family to a civilization, manufacture family-boundary hazards, infer missing velocity, or convert uncertainty into gravity.

## 3. Why purely spatial refinement is insufficient

For a static field, ordinary adaptive sampling may compare adjacent values of potential, acceleration, or tidal loading. For moving sources the field is instead

\[
\Phi=\Phi(\mathbf x,t),\qquad
\mathbf g=\mathbf g(\mathbf x,t),\qquad
T=T(\mathbf x,t).
\]

For a continuous projected-progress family,

\[
\mathbf r(s)=\mathbf r_A+s(\mathbf r_B-\mathbf r_A)
\]

and

\[
t(s)=t_0+\frac{sL}{v_{\rm progress}}.
\]

Therefore two adjacent route samples differ in both position **and** epoch.

A saddle that moves by a meaningful fraction of its distance from the ship can matter even when the route geometry itself changes very little.

## 4. Core refinement tests

The runtime evaluates each adjacent sample pair independently.

### 4.1 Relative physical-metric change

For any scalar diagnostic \(q\),

\[
\Delta_q=
\frac{|q_2-q_1|}
{\max(|q_1|,|q_2|,\epsilon)}.
\]

The current physical-metric set includes:

- dimensionless potential depth;
- acceleration magnitude;
- tidal Frobenius norm;
- single-source curvature scale.

The default trigger is

\[
\Delta_q>0.20.
\]

This threshold is an engineering sampling control, not a constant of nature.

### 4.2 Principal tidal eigenvalue change

The curvature authority returns the ordered principal tidal eigenvalues

\[
\lambda_1,\lambda_2,\lambda_3.
\]

Each ordered component is compared with the same relative-change form.

This is especially important to gravitational-plane and slipstream/shear technologies because a changing tidal eigenspectrum is a physically meaningful precursor to a changing local gravitational topology even though it is not itself a fictional shear lane.

### 4.3 Acceleration-direction rotation

For adjacent acceleration vectors,

\[
\Delta\theta=
\cos^{-1}
\left(
\frac{\mathbf g_1\cdot\mathbf g_2}
{|\mathbf g_1||\mathbf g_2|}
\right).
\]

The default trigger is

\[
\Delta\theta>5^\circ.
\]

Near a gravitational saddle, acceleration magnitude may approach zero while the surrounding field geometry changes rapidly. Direction therefore remains a separate refinement signal.

### 4.4 Covariance growth

For the propagated six-state covariance, this layer uses the positional trace

\[
\operatorname{tr}(\Sigma_r)
=\Sigma_{xx}+\Sigma_{yy}+\Sigma_{zz}.
\]

Between samples,

\[
\Delta_\Sigma=
\frac{|\operatorname{tr}(\Sigma_{r,2})-
\operatorname{tr}(\Sigma_{r,1})|}
{\max(\operatorname{tr}(\Sigma_{r,1}),
\operatorname{tr}(\Sigma_{r,2}),\epsilon)}.
\]

The default trigger is

\[
\Delta_\Sigma>0.20.
\]

Covariance is not gravitational severity. It is uncertainty evidence. The refinement layer uses it only to decide that an interval needs more temporal resolution.

### 4.5 Source motion relative to range

For source \(a\), define source motion over the interval as

\[
\Delta r_a=
|\mathbf r_a(t_2)-\mathbf r_a(t_1)|.
\]

Let \(R_{a1}\) and \(R_{a2}\) be source-to-field-point distances at the two samples. The refinement ratio is

\[
\mu_a=
\frac{\Delta r_a}
{\max(\min(R_{a1},R_{a2}),\epsilon)}.
\]

The runtime uses

\[
\mu=\max_a\mu_a.
\]

The default trigger is

\[
\mu>0.02.
\]

This is a dimensionless numerical trigger. It is not a transit efficiency coefficient.

### 4.6 Encounter-time span

Even if the field appears numerically smooth, an interval may cover too much of the route's encounter timeline.

For normalized route fractions,

\[
\Delta s_f=s_2-s_1.
\]

The default maximum unresolved encounter span is

\[
\Delta s_f\le0.05.
\]

Exceeding it requests midpoint subdivision.

This criterion prevents a very long temporal interval from being accepted merely because its endpoint values happen to look similar.

## 5. Midpoint insertion

When any trigger fires, the runtime inserts

\[
s_m=\frac{s_1+s_2}{2}.
\]

It does **not** interpolate the physical state.

Instead, the midpoint is sent through the family encounter-time runtime, which independently performs:

1. encounter-epoch construction;
2. source-state propagation;
3. covariance propagation;
4. model-validity checks;
5. ordinary gravity and curvature evaluation.

That distinction is critical.

\[
\boxed{\text{new sample}\neq\text{interpolated old samples}}
\]

## 6. Bounded refinement

Adaptive sampling is finite.

The default bounds are:

| Control | Default |
|---|---:|
| Maximum refinement depth | 6 |
| Maximum total samples | 1024 |
| Physical metric relative-change trigger | 0.20 |
| Principal tidal eigenvalue trigger | 0.20 |
| Acceleration-direction trigger | 5 degrees |
| Covariance-trace trigger | 0.20 |
| Source-motion/range trigger | 0.02 |
| Maximum encounter-span fraction | 0.05 |

If the sample ceiling is reached while intervals still request subdivision, the correct conclusion is **not** convergence.

The result must carry a warning that the resource ceiling prevented complete refinement.

## 7. Convergence language

Adaptive refinement increases evidence density. It does not prove that no narrower interior extremum exists.

Therefore:

\[
q_{\max}^{\rm sampled}
\neq
q_{\max}^{\rm proven}
\]

unless an analytic bound or demonstrated convergence supports that stronger statement.

The same rule applies to minima, saddle crossings, covariance spikes, and branch transitions.

## 8. Family behavior

### 8.1 Continuous projected-progress families

The current continuous set is:

- Metric Envelope;
- Gravitational Plane;
- Slipstream/Shear;
- N-Manifold;
- Inertial Torch.

These families may receive midpoint corridor samples because their route/control representation supplies a defensible continuous encounter mapping.

For true-FTL members of the set,

\[
 v_{\rm progress}>c
\]

remains a route/control quantity unless a higher authority explicitly equates it with local hull velocity.

### 8.2 PRECOMMIT families

Q-Lattice, Fold Jump, and Phase Displacement retain explicit commitment/emergence evaluation.

They do not receive fabricated intermediate ordinary-space samples merely because the adaptive controller exists.

### 8.3 Anchored portal transit

Wormhole/Gate transit remains an entry-mouth / exit-mouth problem. The topological connection is not converted into an ordinary-space path for refinement.

## 9. Gravitational-plane interpretation

The design-intent source describes catastrophic forks in gravitational shear paths.

The refinement system gives that fiction a better physical precursor without pretending general relativity predicts a literal FTL rail switch.

A future family-specific fork estimator can consume time-resolved quantities such as

\[
\lambda_i(t),\quad
\dot\lambda_i(t),\quad
\mathbf g(t),\quad
\dot{\mathbf g}(t),\quad
\Sigma(t),
\]

plus explicitly fictional family-boundary state.

A rapidly changing eigenspectrum or acceleration direction can therefore cause the numerical sampler to increase resolution before family certification decides whether a fictional shear fork exists.

## 10. Scaling behavior

For a vessel span \(L_v\), differential acceleration remains approximately

\[
\Delta a\sim\|T\|L_v.
\]

A rough structural stress scaling remains

\[
\sigma_{\rm tidal}\sim\rho\|T\|L_v^2.
\]

Time-dependent refinement matters more as vessel scale grows because a capital installation can simultaneously occupy a larger differential-gravity volume while its distributed control system has a longer coordination path.

The control parameter remains

\[
\Pi_c=\frac{L_c}{v_c\tau_r}.
\]

When \(\Pi_c\) ceases to be small, regional sensing and sectional abort authority become increasingly important.

## 11. Machinery embodiments

The mathematics is shared; the embodiment is not.

**Terrestrial electromechanical systems** commonly expose refinement as covariance ellipsoids, clock-error bands, vector strips, automatic sample insertion, and hard abort thresholds.

**Aquatic electrochemical/hydraulic systems** may express the same information as pressure/current topology, conductive-fluid phase drift, and distributed ionic timing gradients.

**Biological or symbiotic systems** may experience refinement demand as rising uncertainty salience, sensory discord, metabolic prediction strain, or distributed neural disagreement.

**Mineral piezoelectric/photonic systems** may encode the same state as resonance splitting, phase broadening, lattice-axis discontinuity, and coherence-domain subdivision.

**Gas-giant systems** may map the evidence onto pressure strata, electrostatic topology, and distributed membrane-state timing.

None of those interfaces changes the underlying equations.

## 12. Power and computation

Adaptive refinement primarily increases sensing, ephemeris propagation, covariance transport, and solver work.

A first-order computational budget can be written schematically as

\[
C_{\rm total}\sim N_sN_aC_E,
\]

where \(N_s\) is sample count, \(N_a\) is the number of gravitational sources, and \(C_E\) is the cost of one propagated environment evaluation.

The sample ceiling therefore has a real engineering purpose: it prevents a pathological interval from consuming unbounded navigation resources.

The ceiling is a resource limit, not a safety declaration.

## 13. Signatures

A vessel entering aggressive refinement may reveal itself indirectly through:

- increased navigation-compute emissions;
- additional active gravimetry or interferometric ranging;
- more frequent clock synchronization;
- higher internal data-bus utilization;
- repeated field-precharge and abort-system readiness checks;
- increased cryogenic or thermal load in precision sensor systems.

Different technology bases may leak different signatures even while evaluating the same route mathematics.

## 14. Failure taxonomy

`REF-METRIC-GAP` — physical scalar changes exceed tolerance without subdivision.

`REF-EIGEN-GAP` — principal tidal eigenvalue change exceeds tolerance without subdivision.

`REF-DIRECTION-GAP` — acceleration-vector rotation exceeds tolerance without subdivision.

`REF-COV-BLOOM` — propagated covariance changes too rapidly across an interval.

`REF-MOTION-ALIAS` — source motion is large relative to source-to-field-point range.

`REF-TIME-ALIAS` — encounter-time span is too broad despite apparently benign endpoint values.

`REF-CEILING` — sample/depth ceiling reached before all requesting intervals are resolved.

`REF-PRECOMMIT-FABRICATION` — an implementation invents intermediate corridor samples for a PRECOMMIT family.

`REF-PORTAL-FABRICATION` — an implementation treats an anchored portal as ordinary-space travel to reuse refinement mathematics.

## 15. Practical procedure — REF-01 Authority intake

Verify the explicit family id, route endpoints, source-state provenance, reference frame, source epochs, and encounter-time policy. Race, owner, hull, or technology basis does not substitute for family identity.

## 16. Practical procedure — REF-02 Initial sample audit

Run the family encounter-time resolver and inspect every initial sample for source-state and environment status. Do not begin refinement by interpolating unresolved evidence.

## 17. Practical procedure — REF-03 Physical-change audit

Compare potential depth, acceleration magnitude, tidal norm, curvature scale, principal tidal eigenvalues, and acceleration direction across every adjacent sample pair.

## 18. Practical procedure — REF-04 Covariance audit

Track positional covariance trace for each propagated source. Missing covariance remains missing and must not become a numerical zero merely to avoid subdivision.

## 19. Practical procedure — REF-05 Source-motion audit

Compare source displacement to the minimum source-to-field-point range over the interval. Large relative source motion requires greater temporal resolution.

## 20. Practical procedure — REF-06 Midpoint recomputation

For each requesting interval, evaluate the midpoint through the full encounter-time authority. Never interpolate a midpoint gravity packet from its neighbors.

## 21. Practical procedure — REF-07 Ceiling audit

If maximum depth or sample count is reached, preserve the unresolved refinement demand in warnings and certification provenance.

## 22. Practical procedure — REF-08 Family handoff

Pass the refined sample packet downstream intact. Family certification may use the denser evidence, but refinement itself does not manufacture boundary hazards or certify the route.

## 23. Education — Transit Environment Physics 600

**Course title:** Adaptive Spatiotemporal Sampling for Relativistic Navigation Engineering

Core modules:

1. numerical sampling theory;
2. weak-field multi-source gravity;
3. state propagation and covariance;
4. adaptive quadrature concepts versus safety sampling;
5. tidal eigensystems;
6. moving-source aliasing;
7. bounded refinement and computational cost;
8. transit-family encounter semantics;
9. certification provenance;
10. failure reconstruction.

A passing student must be able to explain why two nearly equal endpoint accelerations do not prove that the interval between them is benign.

## 24. Worked example

Suppose adjacent samples have

\[
\|T_1\|=4.0\times10^{-11}\;{\rm s^{-2}}
\]

and

\[
\|T_2\|=5.2\times10^{-11}\;{\rm s^{-2}}.
\]

Then

\[
\Delta_T=
\frac{1.2\times10^{-11}}
{5.2\times10^{-11}}
\approx0.231.
\]

Because

\[
0.231>0.20,
\]

the interval requests subdivision even if every other trigger remains below threshold.

If the midpoint later reveals a tidal peak of

\[
7.0\times10^{-11}\;{\rm s^{-2}},
\]

the original two-point representation was demonstrably under-resolved.

## 25. Research directions

Research programs should investigate:

- convergence guarantees for moving multi-source weak-field corridors;
- adaptive sampling based on tidal eigenvectors once the curvature solver exposes stable eigenbases;
- covariance-aware branch prediction near binaries and hierarchical multiples;
- higher-order temporal interpolation with explicit error bounds;
- post-Newtonian source propagation;
- joint-source covariance rather than independent-source approximations;
- family-specific refinement weights that remain separated from ordinary physical evidence.

## 26. Proposed patent-class developments

The following remain **PROPOSED** rather than established setting canon.

**Temporal Alias Refusal Interlock** — prevents route release when encounter-time span exceeds the validated sampling envelope.

**Covariance Bloom Sentinel** — requests local route resampling when propagated source uncertainty grows faster than the current certification grid.

**Eigenbranch Refinement Controller** — uses stable tidal eigenbasis tracking to focus samples near changing gravitational topology.

**Source-Motion Range Gate** — compares source displacement directly to field-point range before admitting an interval as sufficiently resolved.

**Bounded Refinement Provenance Capsule** — records every inserted sample, trigger, depth, threshold version, and resource ceiling for later reconstruction.

## 27. Final engineering rule

The correct question is not merely whether the route has enough samples.

It is:

\[
\boxed{
\text{Are the samples dense enough in both space and encounter time to support the safety claim being made?}
}
\]

If the answer cannot be demonstrated within the declared model and resource bounds, the route remains unresolved rather than becoming safe by numerical convenience.
