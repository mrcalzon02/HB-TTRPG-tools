# Black Light FTL Eigenbranch-Adaptive Refinement Integration Manual

Status: DERIVED engineering authority subordinate to `BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md`, the adaptive spatiotemporal refinement registry, the tidal eigenbranch tracking registry, and named race/technology sources.

Design-intent source: **The different lightspeed methods**, Google Doc `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`, revision `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`.

## 1. Purpose

The route stack can solve a time-dependent tidal tensor, diagonalize it, track its principal axes, detect near-degenerate eigenspaces, and request more numerical resolution. This manual closes the loop between those capabilities.

Before this integration, the eigenbranch tracker could correctly emit `refinementRequested = true` without forcing the adaptive sampler to insert a new physical midpoint. A navigation system that recognizes inadequate resolution but continues to use the inadequate grid has detected its own failure without correcting it.

The closed loop is now:

```text
authoritative source states
          |
          v
family encounter-time mapping
          |
          v
physical gravity / curvature sample
          |
          v
      tidal tensor T_ij
          |
          v
  eigensystem {lambda_k,e_k}
          |
          v
branch + degeneracy audit
       /       \
      /         \
 adequate    refine requested
   |               |
   v               v
retain        midpoint fraction
                  |
                  v
            new encounter epoch
                  |
                  v
          propagate every source
                  |
                  v
          recompute physical field
                  |
                  v
           solve eigensystem again
```

The inserted midpoint is a new physical encounter calculation, never a display interpolation.

## 2. Authority boundary

This layer answers whether the numerical route grid is dense enough to represent the ordinary gravitational geometry supplied to downstream FTL-family certification. It does not decide whether the route is safe, manufacture a shear lane, assign a transit family to a civilization, infer alien technology ancestry, or turn a tidal-axis rotation directly into a fictional fork probability.

The required separation is

\[
\boxed{\text{ordinary gravitational evidence}\rightarrow\text{numerical resolution}\rightarrow\text{fictional family response}}.
\]

## 3. Physical eigensystem

For the symmetric weak-field tidal tensor,

\[
T\hat{\mathbf e}_k=\lambda_k\hat{\mathbf e}_k,
\]

with

\[
\hat{\mathbf e}_i\cdot\hat{\mathbf e}_j=\delta_{ij}.
\]

The eigenvectors are principal axes rather than arrows, so

\[
\hat{\mathbf e}_k\equiv-\hat{\mathbf e}_k.
\]

The branch rotation is therefore evaluated as

\[
\Delta\psi_k=\cos^{-1}\left(\left|\hat{\mathbf e}_{k,a}\cdot\hat{\mathbf e}_{k,b}\right|\right).
\]

The absolute value removes the arbitrary sign gauge. A numerical eigenvector sign flip is not a physical 180-degree rotation.

## 4. Branch identity

Numerical eigenvalue order can exchange even when the physical axes evolve smoothly. The tracker constructs

\[
S_{ij}=\left|\hat{\mathbf e}_{i,a}\cdot\hat{\mathbf e}_{j,b}\right|
\]

and chooses the permutation \(\pi\) maximizing

\[
\sum_i S_{i,\pi(i)}.
\]

For three axes there are only \(3!=6\) assignments, so exhaustive matching is cheap and deterministic.

Branch continuity is valid only while the eigenspace remains non-degenerate.

## 5. Degeneracy

Define the relative eigenvalue gap

\[
\gamma_{ij}=\frac{|\lambda_i-\lambda_j|}{\max(|\lambda_i|,|\lambda_j|,\|T\|_F,\epsilon)}.
\]

The current engineering threshold is

\[
\gamma_{\min}=0.02.
\]

When \(\gamma_{ij}<\gamma_{\min}\), the affected axes become `DEGENERATE_SUBSPACE`. Individual basis vectors inside that subspace are not physically unique.

For an isolated point mass,

\[
\lambda_r=+\frac{2GM}{r^3},\qquad \lambda_{t1}=\lambda_{t2}=-\frac{GM}{r^3}.
\]

The two transverse axes may rotate freely inside the tangent plane without changing the physical tensor. A route sampler must not chase that arbitrary numerical basis rotation until it consumes the entire sample budget.

## 6. Degeneracy boundary versus stable degeneracy

For adjacent samples \(a\) and \(b\), define

\[
D_{ab}=\operatorname{XOR}(a\in\mathcal D,b\in\mathcal D),
\]

where \(\mathcal D\) denotes `DEGENERATE_SUBSPACE`.

If \(D_{ab}=1\), the interval crosses into or out of a region where individual branch identity is lost. That interval requests subdivision so the boundary can be localized.

If both endpoints remain inside a broad stable degenerate region, degeneracy alone does not request unlimited subdivision. Where a two-dimensional degenerate plane has a unique non-degenerate normal \(\hat{\mathbf n}\), the physical subspace orientation is compared through

\[
\Delta\psi_{\rm subspace}=\cos^{-1}(|\hat{\mathbf n}_a\cdot\hat{\mathbf n}_b|).
\]

This distinction preserves real degeneracy without creating numerical runaway.

## 7. Closed-loop refinement controls

| Evidence channel | Default trigger |
|---|---:|
| Physical scalar relative change | 0.20 |
| Principal eigenvalue relative change | 0.20 |
| Acceleration direction | 5 degrees |
| Tidal branch rotation | 5 degrees |
| Degeneracy relative gap | 0.02 |
| Position-covariance trace change | 0.20 |
| Source motion / local range | 0.02 |
| Maximum route-fraction span | 0.05 |
| Resolved-to-degenerate boundary | any crossing |
| Unresolved eigensystem transition | subdivision while resources remain |

These are versioned numerical engineering controls, not constants of nature and not direct safety probabilities.

A route can have nearly constant \(\|T\|_F\) while its principal axes rotate rapidly. Conversely, its tidal norm can change substantially while the eigendirections remain stable. Scalar strength and topology are independent evidence channels.

## 8. Midpoint rule

For a requesting interval \([s_a,s_b]\),

\[
s_m=\frac{s_a+s_b}{2}.
\]

For a continuous projected-progress family,

\[
t(s_m)=t_0+\frac{s_mL}{v_{\rm progress}}.
\]

Every gravitational source is propagated to that encounter epoch. The field is recomputed:

\[
\Phi(\mathbf x,t)=-\sum_a\frac{GM_a}{|\mathbf x-\mathbf r_a(t)|},
\]

\[
\mathbf g(\mathbf x,t)=-\sum_aGM_a\frac{\mathbf x-\mathbf r_a(t)}{|\mathbf x-\mathbf r_a(t)|^3},
\]

and

\[
T_{ij}(\mathbf x,t)=\sum_a\frac{GM_a}{r_a^3}(3n_in_j-\delta_{ij}).
\]

Only then is the midpoint eigensystem solved.

Thus

\[
\boxed{T(s_m)\neq[T(s_a)+T(s_b)]/2}
\]

as an assumed physical rule. The numerical value may be similar in a smooth regime, but the solver does not assume interpolation.

## 9. Moving saddles

Near a multi-source saddle,

\[
|\mathbf g|\approx0
\]

can coexist with a substantial tidal tensor. The saddle itself can also move as the source system evolves.

```text
sample A                               sample B
   |                                      |
   |  similar |g| and ||T||               |  similar |g| and ||T||
   |                                      |
   +--------------- ? --------------------+
                   ^
            moving saddle,
            rotating eigensystem,
            or degeneracy boundary
```

A scalar-only sampler can miss this event. A topology-aware sampler asks whether the physical axes remain adequately represented between the endpoints.

## 10. Convergence

The adaptive packet now carries `sampling.convergenceEstablished` and `sampling.unresolvedIntervalCount`.

Convergence is established only when no adjacent interval still requests subdivision under the active controls.

\[
\boxed{N=N_{\max}\not\Rightarrow\text{converged}}
\]

and

\[
\boxed{d=d_{\max}\not\Rightarrow\text{converged}}.
\]

If sample or depth limits are exhausted first, the result is at least `PARTIAL`. This is a numerical-evidence state, not a declaration that the route is physically unsafe.

## 11. Compute scaling

Let \(N_s\) be route samples, \(N_a\) propagated gravitational sources, \(C_E\) the cost of one source/environment evaluation, and \(C_T\) the cost of one 3x3 eigensystem solve. A rough budget is

\[
C_{\rm total}\sim N_s(N_aC_E+C_T).
\]

For a 3x3 symmetric tensor, \(C_T\) is small. The expensive operation is repeatedly propagating every relevant source with covariance and recalculating the environment at new encounter epochs.

The sample ceiling is therefore a real compute-resource limit, not evidence of route smoothness.

## 12. Vessel scaling

For vessel span \(L_v\),

\[
\Delta a\sim\|T\|L_v,
\]

and a rough structural scaling remains

\[
\sigma_{\rm tidal}\sim\rho\|T\|L_v^2.
\]

For a structural axis \(\hat{\mathbf u}\), orientation enters through

\[
a_{\rm tidal,\hat u}\propto\hat{\mathbf u}^{T}T\hat{\mathbf u}.
\]

A capital ship aligned with a stretching axis is not mechanically equivalent to the same ship rotated relative to the eigensystem, even if the scalar tidal norm is unchanged.

## 13. Control dynamics

The established distributed-control parameter remains

\[
\Pi_c=\frac{L_c}{v_c\tau_r}.
\]

If the eigenbasis rotates on timescale \(\tau_e\), define the derived diagnostic

\[
\Pi_e=\frac{\tau_r}{\tau_e}.
\]

When \(\Pi_e\ll1\), many controller cycles fit inside the environmental rotation timescale. When \(\Pi_e\sim1\), the geometry evolves on the same timescale as the controller. These are engineering descriptors rather than universal FTL safety constants.

## 14. Gravitational Plane and Slipstream/Shear

These are the primary fictional consumers because the design-intent source makes them unusually sensitive to gravitational shear structure.

The physical precursor packet can now retain

\[
\lambda_k,\quad\Delta\lambda_k,\quad\hat{\mathbf e}_k,\quad\Delta\psi_k,\quad D_{ab},\quad\Sigma,\quad t.
\]

A separately versioned family-response model may eventually use a fictional estimator such as

\[
F_{\rm fork}=\mathcal F(\lambda_k,\dot\lambda_k,\hat{\mathbf e}_k,\dot{\hat{\mathbf e}}_k,\Sigma,B_f).
\]

The exotic family-boundary term \(B_f\) remains independent evidence. Ordinary gravity cannot manufacture it.

## 15. Other transit families

**Metric Envelope** may use eigenbasis evolution as a secondary field-distortion and structural input.

**N-Manifold** may consume the same physical evidence without claiming the manifold itself is defined by ordinary tidal axes.

**Inertial Torch** uses the eigensystem primarily for navigation and distributed structural loading.

**Q-Lattice, Fold Jump, and Phase Displacement** retain PRECOMMIT endpoint semantics and do not receive invented intermediate corridor samples.

**Wormhole/Gate** remains a mouth-state problem; its topological connection is not converted into ordinary-space travel to reuse this sampler.

## 16. Machinery embodiments

The equations are shared; the machinery is not.

Terrestrial electromechanical systems may use orthogonal superconducting gradiometers, interferometric baselines, atomic-clock spines, numerical eigensystem processors, and hardwired refusal relays.

Aquatic electrochemical or hydraulic systems may express the same geometry through pressure-gradient manifolds, ionic-current anisotropy, conductive-fluid resonance, and distributed timing cells.

Biological or symbiotic systems may encode branch stability as sensory confidence, degeneracy as loss of directional salience, subspace orientation as distributed vestibular state, and refinement demand as unresolved neural consensus.

Mineral piezoelectric or photonic systems may use crystal-axis resonance splitting, polarization-domain tracking, lattice phase comparison, and coherence-domain subdivision.

Gas-giant systems may use pressure-surface gradients, electrostatic topology, membrane-distributed timing, and floating volumetric baselines.

## 17. Power, maintenance, and signatures

Topology-aware refinement primarily increases precision-sensor duty cycle, astrometric propagation work, clock synchronization, data-bus traffic, eigensystem computation, active gravimetry, and instrument cooling load. It need not directly increase drive power.

Observable signatures can include bursty interferometer operation, active gravimeter emissions, repeated high-stability timing synchronization, increased cryogenic rejection, control-network synchronization pulses, and repeated field-precharge or abort-readiness cycles.

Maintenance must verify tensor-sensor orthogonality, timing coherence, covariance transport, sign-gauge handling, branch permutation, degeneracy detection, midpoint insertion, ceiling annunciation, and refusal behavior when convergence is not established.

## 18. Failure taxonomy

`EIG-REF-DISCONNECT` — eigenbranch tracking requests refinement but the adaptive sampler does not insert a midpoint.

`EIG-DEG-BOUNDARY-ALIAS` — a resolved/degenerate transition is not localized.

`EIG-DEG-RUNAWAY` — stable broad degeneracy recursively consumes samples solely because degeneracy exists.

`EIG-BASIS-FICTION` — arbitrary numerical vectors inside a degenerate subspace are treated as physical directions.

`EIG-SIGN-FLIP-FICTION` — eigenvector sign gauge is interpreted as physical rotation.

`EIG-BRANCH-SORT` — raw eigenvalue order is treated as persistent branch identity.

`EIG-MIDPOINT-INTERPOLATION` — midpoint tidal evidence is fabricated instead of recomputed.

`EIG-CONVERGENCE-FALSE` — depth or sample ceiling is treated as proof of convergence.

`EIG-FORK-CANON-LEAK` — ordinary tidal topology is promoted directly into fictional shear-lane canon.

## 19. Practical equipment procedure EAR-01 — intake

Verify explicit transit family, encounter model, reference frame, route start epoch, source-state provenance, covariance availability, and tolerance-set version. Race, owner, manufacturer, operator, and hull identity do not substitute for family identity.

## 20. EAR-02 — initial physical grid

Generate initial samples through the family encounter-time authority. Do not initialize the closed loop from presentation-only points or interpolated evidence.

## 21. EAR-03 — eigensystem audit

At every sample verify a finite symmetric tensor, solve eigenvalues and normalized eigenvectors, audit orthonormality, mark near-degenerate branches, and retain source/tensor provenance.

## 22. EAR-04 — transition audit

For every adjacent pair, branch-match non-degenerate axes by overlap, remove sign gauge, calculate resolved rotations, detect degeneracy boundaries, calculate degenerate-plane normal rotation where defined, and set `refinementRequested` only from legitimate numerical-resolution evidence.

## 23. EAR-05 — midpoint insertion

When either scalar/temporal or topology evidence requests more resolution, insert

\[
s_m=(s_a+s_b)/2
\]

and recompute the complete encounter state. Do not average source positions, covariance, gravity, or the tidal tensor as a substitute for calculation.

## 24. EAR-06 — stable degeneracy

When both endpoints are degenerate, verify subspace dimensionality and the unique normal where one exists. Compare physical subspace orientation rather than arbitrary basis vectors. Stable degeneracy is a valid physical result.

## 25. EAR-07 — convergence audit

Rerun complete eigenbranch tracking on the final sample set. Recompute every interval reason. If any remain, set `convergenceEstablished = false` and retain the requesting interval count.

## 26. EAR-08 — post-maintenance recertification

After replacing any clock, gravimeter, baseline, navigation processor, or topology computer, inject synthetic sign flips, branch reorderings, a degeneracy boundary, and a broad stable degeneracy. The system must reject false rotations, localize the boundary, avoid runaway subdivision, and surface resource-ceiling failure as `PARTIAL`.

## 27. Education — Transit Environment Physics 620

**Closed-Loop Tidal Topology Sampling for FTL Navigation**

Core modules: symmetric tensor eigensystems; numerical eigenvector gauge; branch assignment; degenerate perturbation concepts; adaptive mesh refinement; source-state propagation; covariance; moving multi-source saddles; transit-family authority separation; and failure reconstruction.

A passing student must be able to explain why stable degeneracy can be physically real without forcing infinite numerical refinement.

## 28. Worked example — rotation

Suppose

\[
\hat{\mathbf e}_{1,a}=(1,0,0)
\]

and

\[
\hat{\mathbf e}_{1,b}=(\cos8^\circ,\sin8^\circ,0).
\]

Then \(\Delta\psi_1=8^\circ\). With a 5-degree threshold, the interval subdivides. If the two child intervals later measure 3.7 and 4.3 degrees, this topology criterion is locally resolved. That does not prove the route is safe; it proves only that this numerical criterion has adequate resolution.

## 29. Worked example — degeneracy boundary

If

\[
\gamma_{12}(s_a)=0.031
\]

and

\[
\gamma_{12}(s_b)=0.014,
\]

then with \(\gamma_{\min}=0.02\), the left sample is resolved and the right sample is degenerate. The boundary requests subdivision. If the midpoint gives \(\gamma_{12}=0.019\), the transition has been localized into the left child interval.

## 30. Worked example — stable broad degeneracy

If three consecutive samples all satisfy \(\gamma_{23}<0.02\), while the unique non-degenerate normal rotates only 1.1 degrees and then 0.8 degrees, the region is physically degenerate but numerically stable under the current 5-degree subspace-rotation control. Degeneracy alone does not demand infinite refinement.

## 31. Research directions

Priority work includes Davis-Kahan-style eigenspace perturbation bounds, principal-angle tracking for changing degenerate subspaces, joint source-state covariance for binaries, adaptive controls based on predicted eigenspace curvature, higher-order source propagation with explicit error bounds, post-Newtonian moving-source corrections, and separately versioned family-specific shear-fork response models.

## 32. Proposed patent-class technologies

The following remain **PROPOSED** rather than established setting canon: Topology-Triggered Midpoint Interlock; Degeneracy Boundary Locator; Stable-Subspace Suppression Gate; Eigenbranch Provenance Recorder; Predictive Tidal Topology Scheduler.

## 33. Generator/API rules

Generated packets must retain physical samples, refinement events, topology-specific refinement reasons, the final eigenbranch-tracking packet, convergence state, unresolved interval count, active tolerances, provenance, and canon safeguards. Presentation layers may summarize these values but may not delete the underlying evidence and retain only a colored route line.

## 34. Canon safeguards

The closed loop does not establish that FTL exists in real physics, that tidal eigenvectors are literal interstellar rails, that degeneracy is a fictional shear fork, that a named race uses a selected family, that a simulated machinery embodiment is historical canon, or that numerical convergence automatically means route safety.

It establishes only that ordinary physical evidence has been sampled to the declared numerical standard.

## 35. Final engineering rule

\[
\boxed{\text{Did the physical topology demand more resolution, and if so, did we actually recompute it?}}
\]

If resource bounds prevent that answer from becoming yes, the correct state is `PARTIAL`, not “safe enough.”
