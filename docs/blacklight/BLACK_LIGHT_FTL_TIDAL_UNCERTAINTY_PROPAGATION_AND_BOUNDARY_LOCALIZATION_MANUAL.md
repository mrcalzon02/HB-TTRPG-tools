# Black Light FTL Tidal Uncertainty Propagation and Boundary Localization Manual

Status: DERIVED engineering authority subordinate to `BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md`, named race/technology sources, and the physical source-state/curvature/eigenbranch authorities.

Design-intent source: **The different lightspeed methods**, Google Doc `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`, revision `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`.

## 1. Purpose

The navigation stack can now propagate gravitational sources through time, carry their covariance, sample a route, compute a weak-field tidal tensor, diagonalize that tensor, track its principal branches, detect degeneracy, and adaptively resample a changing route. The remaining defect was epistemic rather than geometric: the stack could say **where the tidal geometry appears to rotate** without quantifying how much the propagated astrometric uncertainty moves that conclusion.

This manual establishes the first implemented uncertainty bridge:

```text
source state + covariance
          |
          v
 encounter epoch propagation
          |
          v
source position covariance Sigma_r
          |
          v
weak-field tidal Jacobian J_T
          |
          v
   tensor covariance Sigma_T
          |
          +--------------------+
          |                    |
          v                    v
 eigenvalue variance      axis-orientation variance
          |                    |
          +----------+---------+
                     |
                     v
             boundary localization
```

The layer answers **how confidently the ordinary gravitational geometry is known**. It does not prove an FTL method, create a shear lane, or decide a fictional family hazard.

## 2. Authority boundary

The required reasoning order is

\[
\boxed{\text{source evidence}\rightarrow\text{physical uncertainty}\rightarrow\text{numerical confidence}\rightarrow\text{fictional family response}}.
\]

The order may not be reversed.

A Gravitational Plane controller may consume a narrow uncertainty envelope around a rotating tidal axis. That does not mean ordinary gravity has proven the existence of the fictional shear-plane structure. The same physical packet could also be consumed by structural control, an Inertial Torch navigator, or a scientific survey instrument.

## 3. State covariance already available upstream

For each gravitational source, the source-state authority carries

\[
\mathbf z=\begin{bmatrix}\mathbf r\\\mathbf v\end{bmatrix}
\]

and a propagated covariance

\[
\Sigma_z(t)=F\Sigma_z(t_0)F^T+Q.
\]

The positional block is

\[
\Sigma_r=
\begin{bmatrix}
\sigma_x^2 & \sigma_{xy} & \sigma_{xz}\\
\sigma_{xy} & \sigma_y^2 & \sigma_{yz}\\
\sigma_{xz} & \sigma_{yz} & \sigma_z^2
\end{bmatrix}.
\]

Missing covariance remains missing. The uncertainty layer never substitutes a zero matrix merely to produce a clean answer.

## 4. Weak-field tidal tensor

For a point-mass source of mass \(M_a\) at \(\mathbf r_a\), evaluated at field point \(\mathbf x\), define

\[
\mathbf d_a=\mathbf x-\mathbf r_a,
\qquad
r_a=|\mathbf d_a|,
\qquad
\mathbf n_a=\frac{\mathbf d_a}{r_a}.
\]

The Newtonian weak-field tidal tensor is

\[
T_{ij}^{(a)}=\frac{GM_a}{r_a^3}(3n_i n_j-\delta_{ij}).
\]

For independent source contributions,

\[
T=\sum_aT^{(a)}.
\]

The implementation vectorizes the six independent components as

\[
\operatorname{vec}_s(T)=
\begin{bmatrix}
T_{xx}&T_{yy}&T_{zz}&T_{xy}&T_{xz}&T_{yz}
\end{bmatrix}^{T}.
\]

## 5. Covariance propagation into the tensor

Let

\[
J_a=\frac{\partial\operatorname{vec}_s(T)}{\partial\mathbf r_a}
\]

be the \(6\times3\) Jacobian of the tidal components with respect to source position.

The implemented runtime evaluates this Jacobian with a centered finite difference:

\[
J_{:,j}\approx
\frac{
\operatorname{vec}_s[T(\mathbf r_a+h\hat e_j)]-
\operatorname{vec}_s[T(\mathbf r_a-h\hat e_j)]
}{2h}.
\]

The per-source tensor covariance contribution is

\[
\Sigma_{T,a}=J_a\Sigma_{r,a}J_a^T.
\]

When only independent per-source covariance packets are available, the implemented sum is

\[
\Sigma_T\approx\sum_a\Sigma_{T,a}.
\]

This is **not** a declaration that source errors are physically independent. It is the strongest result justified by separate covariance packets. A known joint astrometric solution must eventually use the full block covariance including cross terms.

## 6. What is still missing from the first implementation

The implemented \(\Sigma_T\) currently propagates source-position covariance. It does not silently invent zero uncertainty for:

- source mass;
- field-point position;
- reference-frame realization;
- known cross-source covariance;
- strong-field model error;
- unresolved higher-order source dynamics.

Where any of these materially dominate an application, the result is incomplete until the corresponding authority exists.

## 7. Eigenvalue uncertainty

For a symmetric tensor

\[
T\hat e_k=\lambda_k\hat e_k,
\]

a first-order perturbation obeys

\[
\delta\lambda_k=\hat e_k^T(\delta T)\hat e_k.
\]

For the six-component symmetric vectorization, define

\[
a_k=
\begin{bmatrix}
e_x^2& e_y^2& e_z^2&2e_xe_y&2e_xe_z&2e_ye_z
\end{bmatrix}^{T}.
\]

Then

\[
\sigma_{\lambda_k}^2=a_k^T\Sigma_Ta_k.
\]

This gives every resolved tidal branch a physically interpretable uncertainty in \(\mathrm{s^{-2}}\).

## 8. Covariance between eigenvalues

For branches \(i\) and \(j\),

\[
\operatorname{Cov}(\lambda_i,\lambda_j)=a_i^T\Sigma_Ta_j.
\]

Therefore the variance of the eigenvalue gap is

\[
\sigma_{g,ij}^2=
\sigma_{\lambda_i}^2+
\sigma_{\lambda_j}^2-
2\operatorname{Cov}(\lambda_i,\lambda_j),
\]

with

\[
g_{ij}=\lambda_i-\lambda_j.
\]

This is more accurate than adding two eigenvalue variances as if they were automatically independent.

## 9. Eigenvector orientation uncertainty

For a non-degenerate symmetric eigensystem, first-order eigenvector perturbation is

\[
\delta\hat e_k=
\sum_{j\neq k}
\hat e_j
\frac{\hat e_j^T(\delta T)\hat e_k}
{\lambda_k-\lambda_j}.
\]

The coupling term

\[
c_{jk}=\hat e_j^T(\delta T)\hat e_k
\]

is linear in the six tensor components and therefore has a variance obtained from \(\Sigma_T\).

A small-angle orientation variance is then approximated by

\[
\sigma_{\psi,k}^2\approx
\sum_{j\neq k}
\frac{\operatorname{Var}(c_{jk})}
{(\lambda_k-\lambda_j)^2}.
\]

The denominator is the important physical warning.

As two eigenvalues approach one another,

\[
|\lambda_k-\lambda_j|\rightarrow0,
\]

and individual-axis uncertainty diverges.

That is not an implementation bug. It is the mathematics announcing that the individual eigenvectors are ceasing to be physically identifiable.

## 10. Degenerate subspaces

Inside a degenerate eigenspace, an arbitrary orthogonal basis spans the same physical subspace. Therefore

\[
\boxed{\text{degenerate subspace}\Rightarrow\text{no unique individual-axis uncertainty}}.
\]

The runtime reports `DEGENERATE_SUBSPACE`, not a giant but finite angle.

This prevents an especially dangerous false claim: a user interface must never show an arbitrary numerical basis direction with an impressive-looking \(\pm0.2^\circ\) uncertainty while the underlying eigenvalues are actually degenerate.

## 11. Linearization domain

The default orientation warning threshold is

\[
\sigma_\psi=10^\circ\approx0.17453\ \mathrm{rad}.
\]

Above that value, the result is marked `OUTSIDE_LINEAR_MODEL` rather than clipped.

The threshold is a versioned engineering control, not a law of nature. Its purpose is to refuse a small-perturbation interpretation once the uncertainty ceases to be small.

## 12. Exact eigenvalue coalescence localization

Across adjacent route fractions \(s_a\) and \(s_b\), define

\[
g_a=\lambda_i(s_a)-\lambda_j(s_a),
\qquad
g_b=\lambda_i(s_b)-\lambda_j(s_b).
\]

If the tracked gap changes sign, a first-order crossing estimate is

\[
s_*=s_a-
\frac{g_a}{g_b-g_a}
(s_b-s_a).
\]

With a local finite-difference gap slope

\[
\left|\frac{dg}{ds}\right|
\approx
\left|\frac{g_b-g_a}{s_b-s_a}\right|,
\]

a first-order location uncertainty is

\[
\boxed{
\sigma_s\approx
\frac{\sigma_g}{|dg/ds|}
}.
\]

The implementation labels this as a local estimate, not an exact posterior distribution.

## 13. Degeneracy threshold versus exact coalescence

The existing route tracker defines near-degeneracy through the engineering quantity

\[
\gamma_{ij}=\frac{|\lambda_i-\lambda_j|}
{\max(|\lambda_i|,|\lambda_j|,\|T\|_F,\epsilon)}
\]

with the current control

\[
\gamma_{\min}=0.02.
\]

The adaptive sampler already localizes resolved-to-degenerate transitions under that criterion.

The present uncertainty runtime adds first-order uncertainty in the underlying eigenvalues and exact coalescence point. A future refinement should propagate the same covariance through the complete normalized \(\gamma_{ij}=\gamma_{\min}\) boundary expression, including uncertainty in its normalization scale. Until then, the exact-coalescence estimate and the adaptive tracker's threshold boundary remain separate evidence products.

That separation is intentional; the runtime does not pretend that \(g=0\) and \(\gamma=0.02\) are the same boundary.

## 14. Gravitational Plane interpretation

The design source makes Gravitational Plane unusually sensitive to gravitational shear geometry.

The physical precursor packet can now carry

\[
\lambda_k,\quad
\sigma_{\lambda_k},\quad
\hat e_k,\quad
\sigma_{\psi,k},\quad
\Delta\psi_k,\quad
\Sigma_T,\quad
\Sigma_r,\quad
t.
\]

A later family model can distinguish:

```text
axis rotates sharply
+ small sigma_psi
        => resolved physical rotation

axis appears to rotate
+ large sigma_psi
        => astrometry/tidal solution insufficient

axis enters degenerate subspace
        => individual axis ceases to be unique
```

None of those states by itself proves the fictional shear fork.

## 15. Slipstream/Shear interpretation

Slipstream/Shear may consume the same physical packet differently. It may be sensitive to rapid changes in tidal orientation, gradients, or family-specific boundary terms.

The ordinary gravitational layer supplies uncertainty in the measurable precursor. The exotic slipstream boundary remains separate:

\[
\boxed{B_f\text{ missing}\neq B_f=0}.
\]

## 16. Other family uses

**Metric Envelope** can use \(\Sigma_T\) and orientation uncertainty for hull-scale field-control margins.

**N-Manifold** can use the physical environment uncertainty while keeping manifold topology separate.

**Inertial Torch** can use it for structural attitude and high-precision navigation.

**Q-Lattice, Fold Jump, Phase Displacement** consume commitment/emergence endpoint uncertainty, not fabricated intermediate corridor samples.

**Wormhole/Gate** consumes entry/exit mouth uncertainty, not an ordinary-space corridor between anchors.

## 17. Vessel-scale mechanics

For vessel span \(L_v\), the established scaling remains

\[
\Delta a\sim\|T\|L_v.
\]

A rough stress scale remains

\[
\sigma_{\rm tidal}\sim\rho\|T\|L_v^2.
\]

With uncertainty in the tensor, a structural controller can no longer treat the nominal principal axis as exact. A useful implementation pattern is to evaluate load envelopes over the axis uncertainty rather than only at the mean orientation.

## 18. Distributed control

The existing control parameter remains

\[
\Pi_c=\frac{L_c}{v_c\tau_r}.
\]

If the environment's inferred axis orientation has uncertainty \(\sigma_\psi\), control design must distinguish actual rapid environmental rotation from estimator noise. High-rate actuator chasing of covariance-driven axis jitter can create a control instability even when the physical tensor changes smoothly.

## 19. Machinery embodiments

The mathematics is common; the machine representation is not.

### 19.1 Terrestrial electromechanical

Likely machinery includes redundant interferometric baselines, superconducting or atom-interferometric gradiometers, precision clocks, covariance processors, and displays that render both the nominal eigenaxis and its uncertainty cone.

### 19.2 Aquatic electrochemical/hydraulic

Uncertainty may be represented as a widening conductive-current or pressure-gradient manifold rather than a Cartesian error ellipse. Fluid reference cavities can act as inertial/gravity sensing media while electrochemical logic carries confidence state.

### 19.3 Biological/symbiotic

A symbiotic navigator may experience a resolved axis as directional salience and an uncertain axis as a broadening or bifurcating sensory field. The biological representation must still preserve the mathematical distinction between low confidence and high danger.

### 19.4 Mineral piezoelectric/photonic

The same covariance may appear as resonance linewidth, polarization-domain spread, or uncertainty in a lattice phase axis. Near degeneracy can manifest naturally as mode merging.

### 19.5 Gas-giant technology

Pressure surfaces, electrostatic reference volumes, distributed membrane clocks, and volumetric baseline networks can encode uncertainty as a spatial field rather than a point estimate.

## 20. Navigation infrastructure

A civilization using high-precision shear-sensitive transit requires more than a drive unit. Supporting infrastructure plausibly includes:

```text
astrometric survey network
        |
        v
reference-frame / clock authority
        |
        v
joint source-state solutions
        |
        v
route encounter-time prediction
        |
        v
tidal covariance propagation
        |
        v
family-specific route certification
```

An old vessel can have a functional drive and still be transit-unsafe because its source covariance, frame realization, or ephemeris infrastructure has decayed.

## 21. Power and thermal behavior

This uncertainty layer primarily increases:

- precision-sensor duty cycle;
- source-state solution frequency;
- covariance matrix transport;
- repeated route resampling;
- eigensystem computation;
- clock synchronization;
- cryogenic instrument load;
- control-network traffic.

It does not inherently require proportionally more drive power.

## 22. Signatures

Observable signatures of high-confidence transit preparation can include burst interferometry, active gravimetry, repeated timing synchronization, astrometric solution broadcasts, cryogenic heat rejection, and route-replanning bursts.

A civilization with mature infrastructure may externalize much of that activity to fixed navigation beacons, reducing onboard emissions while increasing dependence on the network.

## 23. Maintenance doctrine

Maintenance must verify not just the sensors, but the uncertainty machinery:

1. covariance matrices remain symmetric and physically valid;
2. frame transformations preserve covariance ancestry;
3. finite-difference scales remain inside their validated numerical regime;
4. tensor-vectorization ordering is consistent across runtime and schema;
5. eigenvalue sensitivities use the tracked branch basis;
6. near-degenerate axes are refused rather than overconfidently displayed;
7. exact coalescence localization is not mislabeled as the engineering degeneracy threshold;
8. missing covariance remains visibly incomplete.

## 24. Failure taxonomy

`TUC-NO-COV` — required source covariance absent.

`TUC-BAD-COV` — malformed or nonphysical covariance packet.

`TUC-FD-SCALE` — finite-difference scale outside validated range.

`TUC-NONLINEAR` — first-order covariance propagation no longer credible.

`TUC-DEGENERATE` — individual-axis uncertainty undefined because the eigenspace is degenerate.

`TUC-ORIENT-LIMIT` — orientation uncertainty exceeds the linearized-angle model.

`TUC-CROSS-COV-MISSING` — known source correlations absent from the supplied covariance model.

`TUC-BOUNDARY-FLAT` — gap slope too small for useful local boundary localization.

`TUC-CANON-LEAK` — ordinary gravitational uncertainty promoted into fictional family canon.

## 25. Practical equipment procedure TUC-01 — Source covariance intake

Confirm source identity, epoch, reference frame, covariance units, covariance ancestry, propagation model, process-noise model, and approximation-validity status. Reject the assumption that an omitted covariance means an exact source position.

## 26. TUC-02 — Tensor uncertainty solution

For each encounter sample, compute or retrieve the propagated source state. Build \(J_a\) for every usable source. Propagate \(\Sigma_{r,a}\) into \(\Sigma_{T,a}\). Preserve any omitted source as an explicit incompleteness warning.

## 27. TUC-03 — Eigenvalue confidence audit

Compute \(\sigma_{\lambda_k}\) from the tracked eigenbasis. Compare the uncertainty with physical branch separation. Do not use raw independently sorted eigenvectors if the branch tracker has already established continuity.

## 28. TUC-04 — Axis confidence audit

Evaluate the first-order orientation variance only for non-degenerate branches. If the branch enters a degenerate subspace, replace the individual-axis result with an explicit degeneracy state.

## 29. TUC-05 — Boundary localization

For a tracked eigenvalue-gap sign change, estimate the crossing fraction and \(\sigma_s\). Keep the adaptive tracker's near-degeneracy threshold boundary separate until normalized-gap uncertainty is implemented.

## 30. TUC-06 — Family handoff

Pass nominal physical quantities and their uncertainty together. A family response is not permitted to consume the mean while discarding the uncertainty packet merely because the mean is convenient.

## 31. TUC-07 — Salvaged alien machinery

When recovering a foreign navigation system, identify whether its displayed “width,” “blur,” resonance spread, biological ambiguity, or pressure-field envelope corresponds to statistical covariance, deterministic margin, sensor disagreement, or an exotic family state. Do not assume those concepts are interchangeable.

## 32. TUC-08 — Recertification

Any material change to astrometric source state, covariance, clock/frame authority, sensor calibration, source propagation model, or relevant route epoch requires recertification of the uncertainty packet.

## 33. Worked numerical example — eigenvalue uncertainty

Suppose a resolved branch has sensitivity vector \(a_k\), and the propagated tensor covariance yields

\[
a_k^T\Sigma_Ta_k=4\times10^{-26}\ \mathrm{s^{-4}}.
\]

Then

\[
\sigma_{\lambda_k}=2\times10^{-13}\ \mathrm{s^{-2}}.
\]

If the branch separation from its neighbor is only

\[
|\lambda_k-\lambda_j|=4\times10^{-13}\ \mathrm{s^{-2}},
\]

then the uncertainty is already a substantial fraction of the spectral gap. A visually sharp eigenvector arrow would be misleading even before formal degeneracy is reached.

## 34. Worked numerical example — boundary localization

Suppose adjacent samples are separated by

\[
\Delta s=0.01
\]

of the route and the eigenvalue gap changes by

\[
\Delta g=5\times10^{-12}\ \mathrm{s^{-2}}.
\]

Then

\[
\left|\frac{dg}{ds}\right|\approx5\times10^{-10}\ \mathrm{s^{-2}}.
\]

If the local gap uncertainty is

\[
\sigma_g=5\times10^{-13}\ \mathrm{s^{-2}},
\]

then

\[
\sigma_s\approx10^{-3}.
\]

The coalescence location is therefore uncertain by roughly one tenth of the current interval width. That is useful localization evidence. If instead \(\sigma_s\) exceeds the interval width, the correct response is further evidence/refinement, not a confident point marker.

## 35. Engineering chart — interpretation matrix

| Nominal topology | Uncertainty | Engineering interpretation |
|---|---|---|
| Stable axes | Small | Resolved geometry |
| Rapid axis rotation | Small | Resolved physical rotation candidate |
| Rapid axis rotation | Large | Astrometric/tidal ambiguity |
| Near degeneracy | Small eigenvalue uncertainty | Physical loss of individual-axis identity is well localized |
| Near degeneracy | Large uncertainty | Location and extent poorly constrained |
| Exact coalescence crossing | Small \(\sigma_s\) | Local crossing well localized |
| Exact coalescence crossing | Large \(\sigma_s\) | Crossing evidence insufficiently localized |

## 36. Education — Transit Environment Physics 630

**Course title:** Tidal Covariance, Spectral Perturbation, and Uncertainty-Aware FTL Navigation

Prerequisites: Transit Environment Physics 570–620 or equivalent.

Core modules:

- covariance transport and state estimation;
- tensor Jacobians and dimensional analysis;
- symmetric-matrix perturbation theory;
- eigenvalue covariance;
- eigenvector uncertainty and spectral gaps;
- degenerate perturbation concepts;
- numerical finite differences;
- route-boundary localization;
- family-specific engineering handoff;
- provenance and canon discipline.

## 37. Examination problems

1. Derive the six-component sensitivity vector for \(\delta\lambda=e^T\delta T e\).
2. Explain why the uncertainty in an individual eigenvector becomes ill-defined near degeneracy.
3. Given \(\Sigma_T\), compute the covariance between two eigenvalues.
4. Show why missing cross-source covariance cannot always be interpreted as statistical independence.
5. Derive the first-order boundary-location relation \(\sigma_s\approx\sigma_g/|dg/ds|\).
6. Explain why a near-degeneracy threshold boundary is not identical to an exact eigenvalue crossing.
7. Design an alien-machine representation of uncertainty that preserves the same mathematics without using a Cartesian display.

## 38. Research directions

Priority research includes analytic tidal Jacobians, automatic differentiation, joint-source covariance, barycentric covariance authority, field-point uncertainty, source-mass covariance, sigma-point/unscented propagation, Monte Carlo validation of the linear model, normalized-degeneracy-boundary uncertainty, and post-Newtonian tidal covariance.

## 39. Proposed patent-class technologies

The following remain `PROPOSED`:

**Spectral Confidence Lattice** — hardware that transports tensor/eigenbasis covariance through the route solution in real time.

**Degeneracy-Confidence Refusal Interlock** — prevents a control system from treating a numerically chosen basis inside an uncertain degenerate subspace as a physical axis.

**Joint Astrometric Covariance Beacon** — navigation infrastructure broadcasting correlated multi-source state solutions rather than isolated catalog entries.

**Shear-Localization Confidence Projector** — overlays physical topology and its location uncertainty without converting it into a fictional fork probability.

**Native-Uncertainty Translation Layer** — preserves covariance meaning when translating between radically different alien interface embodiments.

## 40. Generator/API doctrine

The generator should prefer explicit uncertainty-bearing packets over polished prose assertions. When evidence is incomplete, generated technical text should say that the geometry is insufficiently constrained rather than inventing a clean route state.

The API is intentionally downstream of source propagation and eigenbranch tracking. It does not own astrometry, source dynamics, the tidal solver, race identity, family assignment, or safety certification.

## 41. Final engineering rule

The essential distinction is:

\[
\boxed{
\text{the model predicts a rotating shear geometry here}
\neq
\text{the evidence locates that geometry precisely}
}
\]

Black Light transit engineering now has a machine-readable way to begin preserving that distinction.
