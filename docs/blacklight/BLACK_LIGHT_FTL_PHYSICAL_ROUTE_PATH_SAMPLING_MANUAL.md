# Black Light FTL Physical Route Path Sampling Manual

**Document class:** DERIVED engineering / educational authority support  
**Primary authority:** `BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md`  
**Design-intent source:** *The different lightspeed methods*  
**Drive document ID:** `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`  
**Drive revision:** `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`  
**Status:** DERIVED where it interprets existing canon; PROPOSED where it defines sampling/calibration procedure.

---

## 1. Purpose

The earlier physical-environment work answered a useful but incomplete question:

> What gravitational environment exists at this field point?

A transit route is not a field point.

A vessel departing one stellar system, traversing interstellar space, crossing barycentric saddles, passing neighboring sources, and entering another system encounters a **field varying continuously along the path**.

This manual defines the physical route-path layer that samples that changing environment before fictional FTL-family response is applied.

The governing chain is:

```text
published / measured source records
             │
             ▼
source positions + masses + uncertainties
             │
             ▼
route geometry in a declared reference frame
             │
             ▼
physical samples along the route
             │
             ├── potential
             ├── acceleration vector
             ├── tidal tensor / eigensystem
             ├── weak-field curvature diagnostics
             └── model-validity state
             │
             ▼
route-wide physical envelope
             │
             ▼
family-specific fictional response
             │
             ▼
route certification
```

The physical layer does **not** prove that an FTL method exists.

It constrains what the invented transit operator must survive if the ordinary gravitational environment is known.

---

## 2. Authority and provenance

For the EXAMPLE sector, `BLACKLIGHT_EXO_SOURCE_AUTHORITY.md` and `blacklight-exo-source-authority.js` remain published-first.

A procedural number may fill only a genuinely unknown field, and must remain labeled hypothetical.

Candidate or disputed planets are excluded from confirmed gravitational totals unless a higher authority promotes them.

The path sampler therefore consumes the authority registry rather than maintaining a second star table.

### 2.1 Provenance ladder

| Rank | Route-environment evidence |
|---|---|
| 1 | measured/catalogued source state with epoch and covariance |
| 2 | published model-constrained source state, labeled |
| 3 | published static catalog snapshot without complete kinematics |
| 4 | derived engineering interpolation |
| 5 | explicit RNG/procedural supplement |
| 6 | unresolved |

A lower rank does not overwrite a higher rank.

---

## 3. Coordinate geometry

For the current EXAMPLE authority, catalog positions are represented in an approximate heliocentric J2000 equatorial Cartesian frame.

For right ascension \(\alpha\), declination \(\delta\), and heliocentric distance \(d\):

\[
\mathbf r =
\begin{bmatrix}
 d\cos\delta\cos\alpha\\
 d\cos\delta\sin\alpha\\
 d\sin\delta
\end{bmatrix}.
\]

The current authority constructs these positions in astronomical units and the physical sampler converts them to SI metres.

\[
1\ \mathrm{AU}=149\,597\,870\,700\ \mathrm{m}.
\]

A route from system A to system B is initially represented as the straight chord:

\[
\mathbf r(s)=\mathbf r_A+s(\mathbf r_B-\mathbf r_A),
\qquad 0<s<1.
\]

This is a **sampling baseline**, not a claim that any particular FTL family literally travels in a Euclidean straight line.

Family-specific route geometry may later map its operator path onto a different manifold, lane, throat, fold, lattice address, or displacement relation.

---

## 4. Why the endpoints are open

The authority coordinate of a system is a catalog/system reference coordinate.

It is not:

- a stellar photosphere coordinate;
- a safe FTL emergence point;
- a station coordinate;
- a gravitational-plane node;
- a gate mouth;
- a fold endpoint;
- a Q-Lattice address.

Therefore the default sampler uses an **open interval**:

\[
0<s_i<1.
\]

Sampling the exact catalog endpoint would frequently place the field point on top of a point-mass source and create a mathematical singularity that represents a bad coordinate interpretation, not useful engineering.

---

## 5. Endpoint-clustered sampling

Uniform sampling is inefficient for stellar routes because the gravitational field changes most strongly near massive endpoints and much more slowly through large portions of interstellar space.

The default sampling therefore uses cosine spacing:

\[
 u_i=\frac{1-\cos\theta_i}{2},
\qquad
\theta_i=\frac{\pi(i+1)}{N+1},
\]

with:

\[
 i=0,1,\ldots,N-1.
\]

If a caller supplies a guard fraction \(g\), the route coordinate becomes:

\[
 s_i=g+(1-2g)u_i.
\]

This produces dense sampling near departure and arrival without evaluating the singular catalog endpoints.

### 5.1 Shape of the sampling density

```text
A                                                            B
|                                                            |
  .. . .  .   .      .        .        .      .   .  . . ..
  high density                                      high density
                 lower density in the interior
```

This is a numerical strategy only.

It does not canonize a safe departure radius.

---

## 6. Physical source model

For source \(a\) with mass \(M_a\) and displacement from the field point:

\[
\mathbf d_a=\mathbf r-\mathbf r_a,
\qquad
r_a=\|\mathbf d_a\|.
\]

The weak-field Newtonian potential is:

\[
\Phi(\mathbf r)=-\sum_a\frac{GM_a}{r_a}.
\]

Coordinate gravitational acceleration is:

\[
\mathbf g(\mathbf r)
=-\sum_a GM_a\frac{\mathbf d_a}{r_a^3}.
\]

These quantities are not interchangeable.

A freely falling vessel can have near-zero proper acceleration while still occupying a strong gravitational potential and experiencing tidal gradients.

---

## 7. Tidal tensor

For point source \(a\):

\[
T_{ij}^{(a)}=
\frac{GM_a}{r_a^3}
\left(3n_i n_j-\delta_{ij}\right),
\]

where:

\[
\mathbf n=\frac{\mathbf d_a}{r_a}.
\]

Within the Newtonian weak-field approximation:

\[
T_{ij}=\sum_a T_{ij}^{(a)}.
\]

The Frobenius norm is:

\[
\|T\|_F=\sqrt{\sum_{ij}T_{ij}^2}.
\]

The principal tidal eigenvalues:

\[
\lambda_1,\lambda_2,\lambda_3
\]

and their eigenvectors are particularly important for future gravitational-plane route work.

---

## 8. Physical meaning of a shear-lane precursor

The setting's gravitational-plane transit method describes dangerous forks in gravitational shear routes.

The ordinary-physics precursor should not be treated as an invisible railway switch.

A credible precursor is a changing field topology involving:

- competing gravitational sources;
- barycentric saddle structures;
- changing eigenvalue ordering;
- rotating principal tidal directions;
- source motion;
- uncertainty in masses and ephemerides;
- multiple locally plausible continuation branches.

A future fork estimator may therefore depend schematically on:

\[
F_{\rm fork}
=
\mathcal F
\left(
\lambda_i,
\frac{d\lambda_i}{dt},
\hat{\mathbf e}_i,
\frac{d\hat{\mathbf e}_i}{dt},
\Sigma_M,
\Sigma_{\rm eph}
\right).
\]

The functional form remains **PROPOSED**.

---

## 9. Curvature diagnostics

For a single Schwarzschild source, the Kretschmann scalar is:

\[
K=\frac{48G^2M^2}{c^4r^6}.
\]

The implementation uses this only as a **single-source reference diagnostic**.

It does not claim:

\[
K_{\rm multi}=\sum_aK_a.
\]

That relation is generally false in general relativity.

Potential, acceleration, and the Newtonian tidal tensor may be superposed within their approximation.

Exact spacetime curvature invariants cannot be naively added.

---

## 10. Compactness and model refusal

The Schwarzschild radius of a source is:

\[
r_s=\frac{2GM}{c^2}.
\]

The route evaluator records:

\[
\chi=\frac{r}{r_s}.
\]

When weak-field assumptions fail, the correct engineering response is not to manufacture a larger finite danger score.

It is:

```text
OUTSIDE_MODEL_VALIDITY
```

A post-Newtonian or numerical-relativity model is then required.

---

## 11. Source motion

A static catalog snapshot is not a propagated ephemeris.

For source position \(\mathbf r_a(t)\):

\[
\mathbf r_a(t)=\mathbf r_{a,0}+\int_{t_0}^{t}\mathbf v_a(t')dt'.
\]

The current EXAMPLE source registry has excellent identity/mass/position utility but does not provide complete route-grade velocity vectors for every source.

Therefore the physical path sampler correctly reports `PARTIAL` when the underlying point evaluator cannot certify the slow-source-motion condition.

It must not convert unknown velocity to:

\[
\mathbf v=\mathbf 0.
\]

---

## 12. Physical radius

A point-mass exterior model should not be evaluated inside a body's physical radius.

If radius is known:

\[
r>R_{\rm physical}
\]

is required.

If radius is absent, the model may still calculate weak-field quantities, but full exterior-model certification remains incomplete.

Unknown radius is not zero radius.

---

## 13. Route-wide extrema

For each sampled quantity \(q_i\), the route packet records sampled extrema such as:

\[
q_{\max}^{\rm sampled}=\max_i q_i
\]

or:

\[
q_{\min}^{\rm sampled}=\min_i q_i.
\]

Current extrema include:

| Quantity | Route operator |
|---|---:|
| dimensionless potential depth | maximum |
| acceleration magnitude | maximum |
| tidal Frobenius norm | maximum |
| single-source curvature scale | maximum |
| Schwarzschild-radius ratio | minimum |

These are **sampled extrema**.

They are not exact global extrema unless a convergence or analytic proof establishes that fact.

---

## 14. Adaptive refinement

The first sampling pass is followed by bounded refinement where adjacent samples differ strongly.

For scalar metric \(q\), define relative change:

\[
\Delta_q=
\frac{|q_{i+1}-q_i|}
{\max(|q_i|,|q_{i+1}|,\epsilon)}.
\]

If:

\[
\Delta_q>\tau_q,
\]

a midpoint sample is inserted.

The initial proposed default is:

\[
\tau_q=0.20.
\]

The acceleration-vector direction is checked separately:

\[
\Delta\theta
=
\cos^{-1}
\left(
\frac{\mathbf g_i\cdot\mathbf g_{i+1}}
{|\mathbf g_i||\mathbf g_{i+1}|}
\right).
\]

The proposed default angular refinement threshold is:

\[
\Delta\theta>5^\circ.
\]

Both thresholds are numerical-engineering parameters, not laws of nature.

---

## 15. Why direction matters

A scalar acceleration magnitude can remain modest while the direction rotates rapidly near a saddle or multi-source transition.

A transit system sensitive to geometry may care more about:

\[
\frac{d\hat{\mathbf g}}{ds}
\]

or tidal eigendirection rotation than about \(|\mathbf g|\) alone.

This is especially relevant to gravitational-plane and metric-like families.

---

## 16. Route sampling and uncertainty

A route path without uncertainty is not a complete certification packet.

For a source-state vector \(\mathbf x\) with covariance \(\Sigma_x\), a derived quantity \(\mathbf y=f(\mathbf x)\) has first-order covariance:

\[
\Sigma_y\approx J_f\Sigma_xJ_f^T,
\]

where:

\[
J_f=\frac{\partial f}{\partial\mathbf x}.
\]

For time propagation with state-transition matrix \(\Phi(t,t_0)\):

\[
\Sigma(t)=
\Phi(t,t_0)\Sigma(t_0)\Phi(t,t_0)^T+Q(t),
\]

where \(Q\) represents process/model uncertainty.

The present runtime preserves caller uncertainty but does not invent a missing covariance matrix.

---

## 17. Route epoch

A physically serious route packet must ultimately answer:

> At what time is this geometry supposed to exist?

The future high-fidelity route packet should carry a common epoch:

\[
t_0
\]

and propagate all relevant source states to the route evaluation time.

Without that epoch, the current catalog positions are an authority snapshot, not a synchronized navigation ephemeris.

---

## 18. The EXAMPLE-sector limitation

The published-first EXAMPLE authority currently provides strong system-level identity, approximate J2000 position, distance, and mass information.

It does **not** yet provide every item needed for a fully resolved interstellar navigation solution:

- full Cartesian velocity for every source;
- complete covariance matrices;
- physical radii for every gravitational source;
- synchronized route epoch;
- binary component state vectors for every multiple system;
- complete planet state vectors.

Therefore a route path can be mathematically useful and still correctly remain `PARTIAL`.

That is not an implementation failure.

It is evidence discipline.

---

## 19. Binary and multiple systems

A system-level catalog mass placed at a barycentric point is useful at long range.

Near a binary, it is not equivalent to resolving both stellar components.

For binary component positions \(\mathbf r_1\) and \(\mathbf r_2\):

\[
\Phi=-\frac{GM_1}{|\mathbf r-\mathbf r_1|}-\frac{GM_2}{|\mathbf r-\mathbf r_2|}.
\]

The barycentric lumped approximation:

\[
\Phi_{\rm lumped}
=-\frac{G(M_1+M_2)}{|\mathbf r-\mathbf r_{\rm bary}|}
\]

converges far from the binary but loses local tidal structure.

This distinction is vital for gravitational shear-plane work.

A future system-component registry should therefore replace lumped masses **only where component authority exists**.

---

## 20. Planetary systems

Confirmed orbiting mass may contribute to a distant system mass budget.

It should not be treated as a point at the stellar barycenter when evaluating close planetary departure corridors if orbital state vectors are available.

Likewise, disputed candidate planets do not enter confirmed gravity totals merely because they make a route more interesting.

---

## 21. Potential reference

Gravitational potential is defined up to an additive constant.

The weak-field point evaluator may use zero at infinity:

\[
\Phi(\infty)=0.
\]

or a declared route reference:

\[
\Delta\Phi=\Phi-\Phi_{\rm ref}.
\]

The reference choice must travel with the packet.

A route certificate may not compare potential depths produced with incompatible references as though they were identical measurements.

---

## 22. Physically distinct route channels

The route packet deliberately keeps separate:

\[
\Phi,
\quad
\mathbf g,
\quad
T_{ij},
\quad
K_{\rm ref},
\quad
\Sigma.
\]

The invalid operation remains:

\[
|\Phi|+|\mathbf g|+\|T\|+\sqrt K.
\]

The units differ.

Any combined severity score must first use dimensionless, versioned normalization.

---

## 23. Handoff to fictional family response

Only after the physical route environment is established may the setting-specific family model apply.

For normalized physical severity \(G_{\rm norm}\):

\[
P_f
=
a_fG_{\rm norm}
+b_fG_{\rm norm}^2
+c_fG_{\rm norm}^{n_f}
+d_fU_m
+e_fB_f,
\]

\[
\eta_{g,f}=e^{-P_f}.
\]

The coefficients \(a_f,b_f,c_f,n_f,d_f,e_f\) are setting/calibration terms.

They are not known physical constants.

The physical path sampler does not choose them.

---

## 24. Family-boundary hazard remains separate

Ordinary gravity can constrain:

- potential;
- acceleration;
- tides;
- curvature approximation;
- source uncertainty.

It does not directly tell us:

- Q-Lattice address integrity;
- Fold closure topology;
- N-manifold return conditioning;
- wormhole throat stability;
- phase-reconciliation fidelity;
- hyperspatial boundary adhesion.

Those remain operator-specific fictional quantities.

---

## 25. Route-wide certification is conjunctive

The future full path certificate should satisfy:

\[
C_{\rm path}
=
\bigwedge_{i=1}^{N}C_i.
\]

A route is not certified merely because the average sample is safe.

One catastrophic segment is enough to reject the route.

This matters especially near:

- departure and arrival wells;
- barycentric saddles;
- close neighboring systems;
- compact objects;
- unresolved hidden-mass candidates;
- rapid eigendirection changes.

---

## 26. Why averaging is dangerous

Suppose 99 samples have benign severity \(G=0.1\), but one sample has a catastrophic boundary condition.

The arithmetic mean is approximately:

\[
\bar G\approx0.109.
\]

That does not make the catastrophic point safe.

Transit safety is dominated by constraint violation, not aesthetic smoothness of the average.

---

## 27. Scaling with route length

A longer route does not necessarily have a proportionally larger maximum gravitational burden.

However, it increases:

- the number of relevant source domains;
- ephemeris propagation time;
- probability of unresolved source interaction;
- computational sampling burden;
- uncertainty accumulation;
- need for model segmentation.

If characteristic correlation length is \(\ell_c\) and path length is \(L\), a crude resolution burden scales like:

\[
N\sim\mathcal O\left(\frac{L}{\ell_c}\right)
\]

before adaptive refinement.

This is a numerical planning relation, not setting canon.

---

## 28. Navigation infrastructure

A civilization operating mature FTL routes may invest in infrastructure that improves the **environmental solution**, not only the drive.

Examples include:

- precision astrometric beacons;
- gravimetric observatories;
- binary-component ephemeris relays;
- route covariance services;
- distributed clocks;
- lane-monitoring arrays;
- compact-object warning catalogs;
- persistent shear topology surveys.

Better infrastructure can improve route certainty without changing the drive's fundamental physics.

---

## 29. Signature implications

Improved route sensing can itself create signatures.

Active ranging, beacon interrogation, synchronization traffic, gravimetric calibration pulses, and high-energy field probes may increase observability.

Thus:

\[
\text{better navigation certainty}
\not\Rightarrow
\text{lower signature}.
\]

A stealth doctrine may choose passive observation and accept larger covariance.

---

## 30. Maintenance implications

A route solution depends on more than the drive core.

A physically grounded navigation stack may require maintenance of:

- clocks;
- inertial references;
- star trackers;
- gravimeters;
- baseline geometry;
- sensor alignment;
- ephemeris databases;
- reference-frame transforms;
- covariance propagation software;
- emergency recovery sensors.

A repaired drive with stale navigation state is not necessarily route-certified.

---

## 31. Failure taxonomy

### 31.1 Source omission

A relevant mass is absent from the model.

Effect: biased potential, acceleration, tides, and route geometry.

### 31.2 Candidate promotion

A disputed body is silently treated as confirmed.

Effect: canon corruption and false physical certainty.

### 31.3 Epoch mismatch

Sources are evaluated at inconsistent times.

Effect: false geometry and covariance.

### 31.4 Barycentric over-lumping

A multiple star is represented as one point too close to the system.

Effect: local tidal structure disappears.

### 31.5 Under-sampling

The route misses a sharp change between sample points.

Effect: sampled maxima underestimate the true path extremum.

### 31.6 Dimensional collapse

Potential, acceleration, tides, and curvature are combined without normalization.

Effect: meaningless mathematics.

### 31.7 Model-domain trespass

Weak-field equations are used beyond their validity.

Effect: apparently precise but physically invalid output.

---

## 32. Practical Equipment Procedure PRP-01 — Source Authority Audit

1. Identify departure and arrival systems by authoritative seed/name.
2. Record authority version.
3. Record source IDs supporting each system.
4. Confirm disputed/candidate masses are excluded.
5. Confirm route code did not substitute a second source table.
6. Record any caller-provided source-state supplements separately.

Acceptance: every gravitational source has traceable ancestry.

---

## 33. PRP-02 — Route Geometry Audit

1. Record reference frame.
2. Record departure and arrival Cartesian coordinates.
3. Compute:

\[
L=\|\mathbf r_B-\mathbf r_A\|.
\]

4. Confirm \(L>0\).
5. Confirm the endpoints represent catalog/system positions, not claimed emergence points.
6. Record any endpoint guard distance.

Acceptance: route geometry is explicit and reproducible.

---

## 34. PRP-03 — Initial Sampling Run

1. Select sample count \(N\).
2. Use cosine-clustered open-interval fractions unless a higher-authority path discretization exists.
3. Evaluate physical environment at each field point.
4. Preserve per-sample status and provenance.
5. Do not discard `PARTIAL` samples.

Acceptance: the complete first-pass path can be replayed.

---

## 35. PRP-04 — Adaptive Refinement

1. Compare adjacent scalar physical metrics.
2. Compute acceleration direction change.
3. Insert midpoint samples where thresholds are exceeded.
4. Repeat to bounded depth.
5. Record threshold/version values.
6. Stop at the declared sample ceiling.

Acceptance: high-gradient intervals receive denser sampling without unbounded computation.

---

## 36. PRP-05 — Model Validity Audit

At every sample inspect:

- dimensionless potential depth;
- Schwarzschild-radius ratio;
- source-motion validity;
- point-mass exterior validity;
- model notes.

If any required model is outside its domain, route physics is blocked pending higher-fidelity analysis.

Do not replace the failed sample with a large finite danger number.

---

## 37. PRP-06 — Route Extrema Audit

1. Find sampled maximum potential depth.
2. Find sampled maximum acceleration magnitude.
3. Find sampled maximum tidal Frobenius norm.
4. Find sampled maximum single-source curvature scale.
5. Find sampled minimum Schwarzschild ratio.
6. Record the sample index and route fraction for each.
7. Verify that different metrics are allowed to have different worst locations.

Acceptance: route severity is not falsely collapsed to one physical scalar.

---

## 38. PRP-07 — Uncertainty Audit

1. Verify route epoch.
2. Verify mass covariance or uncertainty.
3. Verify ephemeris covariance.
4. Verify clock/reference uncertainty.
5. Verify registration uncertainty.
6. Verify model uncertainty.
7. Verify common-cause assumptions.

Missing terms remain unresolved.

Acceptance: no unknown covariance channel is silently zeroed.

---

## 39. PRP-08 — Family Handoff Audit

Before physical route data enters a family model:

1. preserve SI packet;
2. preserve route sample identity;
3. preserve normalization profile identity;
4. preserve physical-model status;
5. preserve uncertainty;
6. preserve family-boundary hazard separately;
7. preserve calibration version;
8. certify all required route segments rather than averaging them.

Acceptance: fiction begins only after ordinary physics is traceable.

---

## 40. Operator chart

| Route state | Meaning | Operator response |
|---|---|---|
| RESOLVED | physical sampling model has complete required evidence | proceed to family response |
| PARTIAL | field computed but evidence/model completeness is insufficient | gather missing evidence or use explicitly bounded analysis |
| UNRESOLVED | required source/geometry/model data missing | do not certify |
| OUTSIDE_MODEL_VALIDITY | equations used are not valid for at least one segment | escalate physical model |

---

## 41. Educational text: introductory problem

**Problem:** Why is the midpoint of a route inadequate?

For equal masses \(M\) separated by distance \(D\), the acceleration can vanish at the midpoint by symmetry:

\[
\mathbf g_{\rm mid}=0.
\]

Yet the tidal tensor is not zero.

Therefore a midpoint-only test can incorrectly suggest a benign environment while differential gravity remains important.

This is one reason route certification cannot use acceleration magnitude alone.

---

## 42. Educational text: potential versus acceleration

At a saddle between two sources, vector acceleration can partially cancel.

Potential adds as a scalar:

\[
\Phi=-\frac{GM_1}{r_1}-\frac{GM_2}{r_2}.
\]

Thus:

\[
|\mathbf g|\approx0
\]

does not imply:

\[
|\Phi|\approx0.
\]

Nor does it imply low tidal stress.

---

## 43. Educational text: tidal scaling

For a point mass:

\[
\|T\|\propto\frac{M}{r^3}.
\]

Moving ten times farther away decreases the characteristic tidal scale by roughly:

\[
10^3=1000.
\]

This explains why endpoint-focused sampling is efficient.

---

## 44. Educational text: vessel scale

Differential acceleration across characteristic vessel length \(L_v\) is approximately:

\[
\Delta a\sim\|T\|L_v.
\]

A rough structural stress scale is:

\[
\sigma_{\rm tidal}\sim\rho\|T\|L_v^2.
\]

Therefore a larger vessel can encounter a larger structural consequence in the same external tidal tensor even when center-of-mass acceleration is identical.

---

## 45. Transit Environment Physics 520

### Module 1 — Catalog astrometry

Coordinate frames, right ascension, declination, parallax/distance, epoch.

### Module 2 — Gravitational fields

Potential, acceleration, field superposition.

### Module 3 — Differential gravity

Tidal tensors, eigensystems, geodesic deviation.

### Module 4 — Numerical route sampling

Open intervals, Chebyshev/cosine clustering, adaptive refinement.

### Module 5 — Approximation discipline

Weak-field limits, point-mass exterior conditions, model refusal.

### Module 6 — Uncertainty

Covariance propagation, state transitions, model error.

### Module 7 — FTL handoff

Dimensionless normalization and fictional family response.

### Module 8 — Certification

Conjunctive route safety and evidence provenance.

---

## 46. Graduate problems

### Problem A

Derive the tidal tensor for a single point mass from the Hessian of the Newtonian potential.

### Problem B

Show why vector acceleration may vanish at a two-body saddle while the tidal tensor does not.

### Problem C

Implement a convergence study comparing uniform and cosine-clustered sampling for a route passing near one dominant star.

### Problem D

Propagate a six-dimensional Cartesian state covariance through a linear state-transition model and quantify its effect on route-field uncertainty.

### Problem E

Compare a barycentric lumped binary model with a resolved two-source binary model at increasing distance and determine where the tidal error becomes acceptably small.

---

## 47. Research directions

1. **Adaptive tidal eigensystem tracking** — follow eigenvectors continuously through near-degeneracies.
2. **Route-extremum certification** — develop interval bounds that prove extrema between samples.
3. **Post-Newtonian route packets** — extend beyond the Newtonian/weak-field environment.
4. **Time-dependent binary corridor models** — evaluate moving saddle topology.
5. **Covariance-aware shear-fork prediction** — connect field uncertainty to branch ambiguity.
6. **Observability economics** — determine how much infrastructure is needed to lower route covariance.
7. **Route topology under hidden mass** — quantify robustness to unresolved bodies.
8. **Multi-fidelity certification** — automatically escalate only the route segments that exceed a model's validity domain.

---

## 48. Thesis proposal — Tidal Eigenbranch Tracking for Gravitational-Plane Navigation

**Question:** Can continuous eigensystem tracking predict route bifurcation earlier than scalar gravity thresholds?

**Method:**

- propagate source states with covariance;
- compute \(T_{ij}(s,t)\);
- track eigenvalues/eigenvectors;
- identify eigenvalue near-degeneracy and rapid eigendirection rotation;
- compare against simulated branch failures.

**Canon status:** PROPOSED research direction.

---

## 49. Thesis proposal — Certified Route Extrema Without Exhaustive Sampling

**Question:** Can interval arithmetic or Lipschitz bounds establish safe upper limits between route samples?

A target result is a bound:

\[
q(s)\le q_{\max}^{\rm certified}
\]

for all \(s\) in an interval, not merely at sampled points.

This would materially strengthen safety certification.

---

## 50. Proposed patent-class concept: Path Provenance Capsule

A route packet carries immutable hashes/identities for:

- source catalog version;
- source state epoch;
- covariance model;
- physical solver version;
- sampling strategy;
- refinement thresholds;
- calibration profile;
- family response model.

Purpose: make a historical route certificate replayable.

Status: **PROPOSED**.

---

## 51. Proposed patent-class concept: Eigenbranch Sentinel

A dedicated processor tracks tidal eigenvalue separation and eigendirection rate of change.

Candidate warning metric:

\[
S_e=
\sum_{i<j}
\frac{\omega_{ij}}
{|\lambda_i-\lambda_j|+\epsilon}
\]

where \(\omega_{ij}\) represents relative eigendirection rotation.

The exact metric is **PROPOSED** and requires calibration.

---

## 52. Proposed patent-class concept: Approximation Escalation Relay

A navigation system does not merely say "unsafe" when the weak-field model fails.

It identifies the segment, model assumption, and required replacement fidelity:

```text
Newtonian weak-field
        ↓ failure
post-Newtonian
        ↓ failure
relativistic multipole / local exact model
        ↓ failure
numerical spacetime solution
```

Status: **PROPOSED**.

---

## 53. Proposed patent-class concept: Covariance Ancestry Matrix

Every displayed route uncertainty is traceable back to:

- mass measurement;
- source position;
- source velocity;
- clock;
- registration;
- sensor;
- physical model;
- shared/common-cause uncertainty.

Purpose: prevent a polished display from hiding the origin of uncertainty.

Status: **PROPOSED**.

---

## 54. API contract

Primary runtime:

```text
BlacklightExoFTLPhysicalRoutePathRuntime.resolveFTLPhysicalRoutePath(context)
```

Important context fields:

```text
from
to
epoch
uncertainty
sampleCount
endpointGuardM
adaptiveRefinement
relativeMetricTolerance
directionChangeRad
maximumRefinementDepth
sourceStateById
```

The runtime may also receive explicit sources or an injected authority/curvature runtime for testing.

---

## 55. API result

The route result preserves:

```text
status
route
sampling
samples
extrema
uncertainty
warnings
provenance
canonSafeguards
```

Each sample preserves its own physical environment result.

This prevents route-wide summarization from erasing local failure evidence.

---

## 56. Generator rule

A generator may use the path sampler only when it knows which authoritative route endpoints it is evaluating.

It may not generate a random mass field and label the result as the published EXAMPLE sector.

For fictional/generated sectors, the same mathematical machinery may be used, but the source packet must be labeled as generated.

---

## 57. Certification rule

A route-wide physical path packet must not be flattened into one average environment before certification.

The intended future certification form is:

\[
C_{\rm path}=\bigwedge_i C_i.
\]

Where computationally expensive, hierarchical bounding may reduce the number of full family evaluations, but any such optimization must prove that skipped segments cannot violate the active thresholds.

---

## 58. Canon safeguard summary

1. Published data outrank generated supplements.
2. Candidate masses remain candidates.
3. Missing velocity is not zero velocity.
4. Missing radius is not zero radius.
5. Missing covariance is not perfect certainty.
6. Catalog position is not a safe FTL emergence point.
7. Sampled maximum is not automatically the exact maximum.
8. Weak-field failure is a model-domain failure, not a bigger ordinary score.
9. Ordinary gravity does not establish fictional family-boundary physics.
10. Physical calculations do not assign FTL technology to a race or vessel.
11. Route averages cannot erase a catastrophic segment.
12. Every numerical result carries source and model provenance.

---

## 59. Engineering conclusion

Black Light transit should feel as though generations of scientists, navigators, maintainers, surveyors, and accident investigators have been forced to learn a simple lesson:

**space between stars is not empty merely because the ship is far from a planet.**

It contains a continuously varying gravitational geometry whose potential, acceleration, differential field, uncertainty, and model validity all matter differently.

The fictional transit families may respond to that geometry in different invented ways.

The geometry itself should be calculated as honestly as the available evidence permits.
