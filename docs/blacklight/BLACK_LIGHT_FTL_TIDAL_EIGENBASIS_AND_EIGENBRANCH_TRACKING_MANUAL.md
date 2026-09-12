# BLACK LIGHT FTL TIDAL EIGENBASIS AND EIGENBRANCH TRACKING MANUAL

**Status:** DERIVED engineering authority; subordinate to named canon and `BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md`.

**Design-intent source:** *The different lightspeed methods*, Google Doc `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`, revision `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`.

## 1. Purpose

The existing Black Light physical route stack can calculate gravitational potential, acceleration, the tidal tensor, scalar tidal norms, principal tidal eigenvalues, source motion, covariance growth, encounter epochs, and adaptively refined physical route samples.

That is not yet enough to describe the geometry that matters most to Gravitational Plane and Slipstream/Shear navigation.

A scalar can answer:

> How strong is the tide here?

It cannot answer:

> Which way is the principal stretching axis pointing, is that axis rotating, and is the axis itself ceasing to be uniquely defined as the local field approaches a degeneracy?

This volume establishes the engineering mathematics and runtime contract for that missing information.

The governing physical statement is the symmetric tidal eigenproblem

\[
T\hat{\mathbf e}_k=\lambda_k\hat{\mathbf e}_k.
\]

The eigenvalues \(\lambda_k\) describe signed principal tidal strength. The eigenvectors \(\hat{\mathbf e}_k\) describe the instantaneous principal stretching/compression axes.

The new system tracks those axes through route position and encounter time while preserving the numerical and physical fact that eigenvectors become non-unique when eigenvalues become degenerate.

---

## 2. Authority chain

```text
published masses + source states + covariance
                    |
                    v
     time-dependent source propagation
                    |
                    v
             physical field point
                    |
                    v
      Newtonian/weak-field tidal tensor T
                    |
                    v
          symmetric eigendecomposition
          /          |           \
      lambda_1    lambda_2    lambda_3
         |           |           |
        e_1         e_2         e_3
          \          |          /
                    v
       continuity / branch matching
                    |
                    v
    degeneracy + rotation diagnostics
                    |
                    v
 family-specific fictional response layer
```

Everything through the tracked eigensystem is ordinary gravitational/numerical evidence within the declared weak-field model.

The existence of a literal FTL shear lane, shear fork, lensing-plane corridor, Q-boundary, Fold closure surface, or N-manifold branch remains fictional operator physics and must be handled by a separately versioned family-response model.

---

## 3. The tidal tensor

For point-mass sources in the currently implemented weak-field model,

\[
T_{ij}=\sum_a\frac{GM_a}{r_a^3}
\left(3n_{a,i}n_{a,j}-\delta_{ij}\right).
\]

Here

\[
\mathbf n_a=\frac{\mathbf r-\mathbf r_a}{|\mathbf r-\mathbf r_a|}.
\]

The matrix is real and symmetric:

\[
T=T^T.
\]

Therefore it admits an orthonormal eigenbasis:

\[
\hat{\mathbf e}_i\cdot\hat{\mathbf e}_j=\delta_{ij}.
\]

Outside matter in the Newtonian point-source model, the trace is approximately zero:

\[
\operatorname{tr}(T)=\lambda_1+\lambda_2+\lambda_3\approx0.
\]

That gives a useful numerical check, but it is not itself a safety criterion.

---

## 4. What eigenvalues mean

A positive principal eigenvalue corresponds locally to stretching along its eigenvector. A negative principal eigenvalue corresponds locally to compression.

For a single isolated point mass, one obtains the familiar pattern

\[
\lambda_r=+\frac{2GM}{r^3},
\]

\[
\lambda_{t1}=\lambda_{t2}=-\frac{GM}{r^3}.
\]

The radial axis is unique, but the two tangential eigenvalues are exactly degenerate.

This is important.

The single-source field does **not** define a unique pair of tangent directions. Any orthonormal basis spanning the tangent plane is equally valid.

A numerical solver may return two particular tangent vectors, but those vectors are not physical observables.

So:

\[
\boxed{\lambda_i=\lambda_j\Rightarrow\text{individual }\hat e_i,\hat e_j\text{ are not unique}}
\]

This is the first reason Black Light cannot simply calculate eigenvectors once and treat their raw directions as canon.

---

## 5. Eigenvector sign is gauge freedom

If

\[
T\hat{\mathbf e}=\lambda\hat{\mathbf e},
\]

then

\[
T(-\hat{\mathbf e})=\lambda(-\hat{\mathbf e}).
\]

Therefore \(\hat{\mathbf e}\) and \(-\hat{\mathbf e}\) represent the same physical axis.

A route display that shows an axis suddenly rotating by \(180^\circ\) merely because the numerical eigensolver changed the sign of its output is wrong.

For continuity, adjacent vectors are sign-aligned:

\[
\hat e_{k,b}\rightarrow
\operatorname{sign}(\hat e_{k,a}\cdot\hat e_{k,b})\hat e_{k,b}.
\]

The physically relevant axis rotation is therefore

\[
\Delta\psi_k=
\cos^{-1}
\left(
|\hat e_{k,a}\cdot\hat e_{k,b}|
\right).
\]

The absolute value removes the arbitrary arrow direction.

---

## 6. Why sorting eigenvalues is insufficient

Suppose two adjacent route samples return

| sample | numerical eigenvalues |
|---|---|
| A | \(5.1, 1.9, -7.0\) |
| B | \(5.0, 2.1, -7.1\) |

Sorting by value is probably harmless.

Now consider

| sample | numerical eigenvalues |
|---|---|
| A | \(5.1, 5.0, -10.1\) |
| B | \(5.0, 5.1, -10.1\) |

The first two numerical orderings swap even though the physical axes may vary smoothly.

Branch identity should instead maximize continuity of the eigenvectors.

Define the overlap matrix

\[
S_{ij}=|\hat e_{i,a}\cdot\hat e_{j,b}|.
\]

For three dimensions there are only six possible permutations. The branch tracker selects the permutation \(\pi\) maximizing

\[
\sum_iS_{i,\pi(i)}.
\]

After assignment, sign alignment is applied.

This provides stable branch identity whenever the eigensystem is sufficiently non-degenerate.

---

## 7. Degeneracy detection

A branch becomes numerically and physically ambiguous when two eigenvalues approach one another closely compared with the local tensor scale.

The versioned engineering diagnostic is

\[
\gamma_{ij}=
\frac{|\lambda_i-\lambda_j|}
{\max(|\lambda_i|,|\lambda_j|,\|T\|_F,\epsilon)}.
\]

If

\[
\gamma_{ij}<\gamma_{\min},
\]

then the affected vectors are flagged `DEGENERATE_SUBSPACE`.

The initial proposed engineering value is

\[
\gamma_{\min}=0.02.
\]

This is not a constant of nature. It is a numerical control and must remain versioned.

---

## 8. Degenerate subspaces

When two eigenvalues are degenerate, the correct physical object is their two-dimensional eigenspace.

```text
non-degenerate case                 two-way degeneracy

          e1                                  e3
          |                                   |
          |                                   |
     e2 --+-- e3                     =========+=========
                                          degenerate plane
```

If exactly one eigenvector remains non-degenerate, that vector is the normal to the degenerate plane. The plane's orientation can therefore still be tracked through the normal:

\[
\Delta\psi_{\rm subspace}=
\cos^{-1}
\left(
|\hat n_a\cdot\hat n_b|
\right).
\]

If all three eigenvalues are effectively degenerate, no preferred orientation exists. The correct result is unresolved orientation, not an arbitrary basis.

---

## 9. Tidal rotation versus tidal strength

Two route intervals can have almost identical scalar tidal norm while having very different directional behavior.

Example:

| quantity | interval A | interval B |
|---|---:|---:|
| \(\|T\|_F\) | \(4.0\times10^{-11}\,s^{-2}\) | \(4.1\times10^{-11}\,s^{-2}\) |
| relative scalar change | — | 2.4% |
| principal-axis rotation | — | 14° |

A scalar-only refinement rule might leave this interval untouched.

A directional route model should not.

This is exactly the distinction needed for believable gravitational-plane and shear-based navigation.

---

## 10. Physical interpretation of a moving saddle

For two or more moving gravitating bodies, the position and orientation of a local saddle structure changes with time.

The scalar acceleration can pass through a small value:

\[
|\mathbf g|\approx0,
\]

while the tidal tensor remains finite:

\[
\|T\|_F>0.
\]

At the same time, the eigendirections may rotate rapidly.

Therefore a plausible physical precursor to a fictional shear fork is not merely “gravity is large.”

It is some family-specific response to a combination such as

\[
\mathcal X=
\mathcal F
\left(
\lambda_k,
\dot\lambda_k,
\hat e_k,
\dot{\hat e}_k,
\Sigma,
\text{boundary state}
\right).
\]

The exact \(\mathcal F\) remains `PROPOSED` until explicitly established.

---

## 11. Rotation-rate estimates

For adjacent resolved samples separated by encounter time \(\Delta t\), a finite-difference axis rotation rate may be estimated as

\[
\omega_{e,k}\approx\frac{\Delta\psi_k}{\Delta t}.
\]

For spatial separation \(\Delta s\), one may similarly define

\[
\kappa_{e,k}\approx\frac{\Delta\psi_k}{\Delta s}.
\]

These are numerical diagnostics.

They are not exact derivatives unless convergence is demonstrated.

---

## 12. Adaptive sampling integration

The initial directional refinement threshold is

\[
\Delta\psi_{\max}=5^\circ
=0.0872664626\ \mathrm{rad}.
\]

A continuous route interval should request additional sampling when any resolved principal axis rotates beyond that control, or when a degeneracy appears whose topology cannot be resolved at the current sample spacing.

The intended future loop is

```text
sample endpoints
      |
      v
physical environment
      |
      v
tidal eigensystem
      |
      +---- scalar change too large? ----+
      |                                   |
      +---- axis rotation too large? -----+--> insert midpoint
      |                                   |
      +---- degeneracy unresolved? -------+
                                          |
                                          v
                              recompute from source authority
```

A midpoint must be recomputed from the encounter-time/source-state authority. It must not be obtained by interpolating two endpoint eigenvectors.

---

## 13. Why interpolation is dangerous

Eigenvectors do not form an ordinary globally smooth Cartesian state variable.

Linear interpolation can produce a non-unit vector, violate orthogonality, cross a sign gauge, or invent an orientation through a degenerate interval.

Therefore:

\[
\boxed{
\text{interpolated eigenvectors}
\neq
\text{authoritative midpoint eigensystem}
}
\]

---

## 14. Family-specific engineering use

### 14.1 Gravitational Plane

This family receives the strongest direct use of the new evidence.

Its route navigator can distinguish:

- stronger/weaker tidal structure;
- rotating principal geometry;
- approaching eigenspace degeneracy;
- branch identity exchange;
- covariance-driven uncertainty in the predicted axis state.

A fictional shear-plane fork can then be tied to a separately calibrated family-response model rather than being inferred from scalar gravity alone.

### 14.2 Slipstream / Shear

The same eigensystem provides a plausible physical environmental precursor for changing shear alignment and branch ambiguity.

The drive's fictional operator physics remains separate.

### 14.3 Metric Envelope

Directional tides matter mainly as external gradient and control-load information. Rapid orientation changes can increase distributed control burden across a large envelope even if the scalar norm remains moderate.

### 14.4 N-Manifold

The eigensystem can contribute to environmental prediction and endpoint/corridor conditioning without implying that the manifold itself is created by Newtonian tidal axes.

### 14.5 Inertial Torch

No exotic boundary is required, but tidal-axis orientation remains useful for structural load prediction, trajectory optimization, and sensor placement.

### 14.6 Q-Lattice, Fold Jump, Phase Displacement

These remain PRECOMMIT families. Tidal eigensystems are evaluated at commitment/emergence states rather than being turned into a fabricated continuous ordinary-space corridor.

### 14.7 Wormhole / Gate

Track the eigensystem independently at each portal mouth. Do not interpret the orientation difference as an ordinary-space path through the throat.

---

## 15. Scaling behavior

For vessel characteristic length \(L_v\), differential acceleration still scales roughly as

\[
\Delta a\sim\|T\|L_v.
\]

A rough structural stress scale remains

\[
\sigma_{\rm tidal}\sim\rho\|T\|L_v^2.
\]

The eigenbasis adds orientation.

A long vessel aligned with the strongest stretching axis experiences a different structural distribution than the same vessel rotated relative to that axis.

For a body-fixed unit vector \(\hat u\), the local tidal differential acceleration scale along that direction is proportional to

\[
\hat u^TT\hat u.
\]

Therefore capital-ship route planning can legitimately care about attitude as well as route position.

---

## 16. Distributed control

The existing control-latency parameter remains

\[
\Pi_c=\frac{L_c}{v_c\tau_r}.
\]

If the external principal axes rotate on a characteristic time \(\tau_e\), an additional useful engineering ratio is

\[
\Pi_e=\frac{\tau_r}{\tau_e}.
\]

When \(\Pi_e\ll1\), control can respond many times within the environmental rotation time.

When \(\Pi_e\sim1\), the environment changes on the same timescale as the control response.

When \(\Pi_e>1\), the controller is attempting to regulate against a geometry that rotates faster than its nominal reaction cycle.

This is a useful control-design quantity, not a universal safety threshold.

---

## 17. Power and recovery consequences

The eigensystem does not directly define drive power.

However, machinery that must keep a field geometry aligned to an external axis can acquire a reorientation burden.

A generic proposed control-power decomposition is

\[
P_{\rm total}=P_{\rm baseline}+P_{\rm environment}+P_{\rm slew}+P_{\rm reserve}.
\]

`P_slew` is family- and machine-specific and remains proposed.

No ordinary gravitational equation here proves that FTL field power scales with eigenaxis rotation.

---

## 18. Navigation infrastructure

A high-grade eigenbranch-navigation chain requires more than a drive core.

```text
mass survey
   -> ephemeris solution
      -> covariance + reference frame
         -> local gravimetry
            -> tidal tensor reconstruction
               -> eigenbranch tracker
                  -> family-response solver
                     -> certified route
```

Infrastructure improvements can therefore increase safe route availability without changing the drive machinery at all.

Better astronomy can produce better FTL navigation.

---

## 19. Sensor packages

A mature system should avoid common-cause dependence between all sensors used to reconstruct the tensor.

Possible terrestrial embodiments include:

- precision accelerometer/gradiometer arrays;
- optical or atom-interferometric baselines;
- distributed clock networks;
- independent astronomical ephemeris updates;
- hull-separated reference packages.

The exact alien embodiment depends on technology basis.

---

## 20. Technology-basis embodiments

### Terrestrial electromechanical

Use numerical tensor displays, three-axis glyphs, covariance ellipsoids, independent gradiometer clusters, and hardwired abort channels.

### Aquatic electrochemical / hydraulic

Represent principal axes as stable conductive-current and pressure-gradient directions within a fluidic reference volume. Axis rotation can be displayed as rotating current topology rather than Cartesian arrows.

### Biological / symbiotic

A distributed organism may encode the three-axis field as spatial salience, tension, vestibular-like synthetic sensation, or neural consensus. Degeneracy may feel like loss of directional confidence rather than a flashing numerical alarm.

### Mineral piezoelectric / photonic

Principal axes can map naturally onto lattice resonance, polarization, standing-wave orientation, or phase-coherence geometry. Degeneracy appears as mode broadening or mode exchange.

### Gas-giant / pressure-electrostatic

Use pressure strata, electrostatic orientation surfaces, distributed buoyant references, and large-baseline field reconstruction.

### Cryogenic resonant machinery

High-Q resonators may provide excellent axis sensitivity but can require careful bandwidth management when eigendirections rotate quickly.

### Hybrid / salvaged installations

Never collapse owner, operator, manufacturer, inventor, and technology ancestry into one identity. A captured alien drive can retain a native eigensystem sensor package while using locally built display electronics.

---

## 21. Signature model

A route-navigation eigensystem can produce observable signatures even before the main transit event.

Potential signatures include:

- synchronized gradiometer interrogation;
- repeated reference-pulse timing;
- rotating field trim commands;
- phased sensor-array activity;
- cooling load from high-precision metrology;
- increased computation during near-degenerate branch tracking.

These signatures depend on machinery embodiment and do not imply a universal emissions profile.

---

## 22. Failure taxonomy

### EIG-NO-TENSOR

No finite symmetric tidal tensor is available.

**Disposition:** `UNRESOLVED`.

### EIG-NONSYMMETRIC

The supplied tensor violates expected symmetry beyond numerical tolerance.

**Disposition:** reject the eigensystem packet and inspect upstream physics/numerics.

### EIG-SIGN-FLIP

Raw vectors reverse sign between samples.

**Disposition:** gauge-correct through sign alignment; do not call it a 180-degree physical rotation.

### EIG-BRANCH-SWAP

Numerical eigenvalue ordering changes while physical axes remain continuous.

**Disposition:** branch-match by maximum absolute overlap.

### EIG-DEGENERATE

Two or more eigenvalues become insufficiently separated.

**Disposition:** track the eigenspace, not arbitrary individual basis vectors.

### EIG-TRIPLE-DEGENERATE

No preferred axis remains.

**Disposition:** orientation unresolved.

### EIG-ROTATION-UNDERRESOLVED

Adjacent resolved axes rotate beyond the numerical-control threshold.

**Disposition:** request additional sampling where the family supports a continuous corridor.

### EIG-CANON-LEAK

A physical eigenaxis is directly relabeled as an FTL lane or named-race technology.

**Disposition:** provenance/canon failure.

---

## 23. Practical equipment procedures

### EIG-01 — Tensor intake

1. Verify field-point reference frame.
2. Verify source-state epoch and provenance.
3. Verify the tensor is finite and symmetric.
4. Verify the physical environment is not outside its declared model validity.
5. Preserve the original tensor packet.

### EIG-02 — Eigensystem solve

1. Diagonalize the symmetric tensor.
2. Normalize all eigenvectors.
3. Verify pairwise orthogonality.
4. Compare eigenvalue sum against the expected trace behavior.
5. Store solver provenance.

### EIG-03 — Degeneracy audit

1. Compute all pairwise relative gaps \(\gamma_{ij}\).
2. Apply the versioned degeneracy threshold.
3. Mark affected branches.
4. Do not report individual-axis rotation inside an unresolved degenerate subspace.

### EIG-04 — Branch continuity

1. Build the absolute-overlap matrix.
2. Evaluate all six branch permutations.
3. Select the maximum-overlap assignment.
4. Sign-align matched vectors.
5. Record the assignment.

### EIG-05 — Rotation audit

1. Compute sign-invariant axis rotations.
2. Compute degenerate-plane rotation when a unique normal exists.
3. Compare only to versioned numerical controls.
4. Request additional samples where appropriate.

### EIG-06 — Family handoff

1. Preserve physical eigenvalues/eigenvectors unchanged.
2. Hand them to the selected family-response model.
3. Do not manufacture a family boundary from ordinary gravity.
4. Preserve family-model version and coefficients.

### EIG-07 — Large-vessel attitude audit

1. Transform body axes into the same navigation frame.
2. Evaluate \(\hat u^TT\hat u\) along major structural axes.
3. Compare route attitude plans.
4. Re-run after material route/ephemeris changes.

### EIG-08 — Salvage / archaeological reconstruction

1. Identify native sensor channels before replacing displays.
2. Separate raw tensor evidence from native family interpretation.
3. Recover branch-tracking conventions if possible.
4. Treat unidentified axis labels as unresolved rather than translating them into familiar Human terminology.

---

## 24. Worked example: sign ambiguity

Suppose the same physical axis appears numerically as

\[
\hat e_a=(0.999,0.045,0)
\]

and

\[
\hat e_b=(-0.998,-0.063,0).
\]

The raw dot product is approximately \(-0.9998\).

A naive directed-vector angle is close to \(179^\circ\).

The physical axis angle uses the absolute dot product:

\[
\Delta\psi=\cos^{-1}(|-0.9998|)\approx1.1^\circ.
\]

That is the meaningful result.

---

## 25. Worked example: branch ambiguity

Let

\[
\lambda_1=5.00\times10^{-11}\,s^{-2}
\]

and

\[
\lambda_2=4.96\times10^{-11}\,s^{-2}.
\]

If

\[
\|T\|_F=8.0\times10^{-11}\,s^{-2},
\]

then

\[
\gamma_{12}=\frac{0.04\times10^{-11}}{8.0\times10^{-11}}=0.005.
\]

With the current proposed threshold \(0.02\), those axes are treated as a degenerate subspace.

Reporting a 37-degree rotation of one of those two solver-selected basis vectors would therefore be physically misleading.

---

## 26. Diagram: scalar-only versus topology-aware navigation

```text
SCALAR-ONLY
sample A -------- sample B
 |T| = 4.0e-11     |T| = 4.1e-11
        "small change"

TOPOLOGY-AWARE
sample A -------- sample B
 e1 --->             e1
                       \
                        \
                         v
              14 degree axis rotation

Same approximate tidal strength.
Different local geometry.
```

---

## 27. Educational curriculum

### Transit Environment Physics 610

**Title:** Tidal Eigensystems, Degenerate Subspaces, and Shear-Topology Navigation

#### Module 1 — Tensor foundations

- gravitational Hessians;
- tidal tensor construction;
- symmetry;
- trace and invariants;
- coordinate transformations.

#### Module 2 — Spectral decomposition

- real symmetric matrices;
- orthogonal eigenbases;
- eigenvalue ordering;
- normalization;
- Jacobi diagonalization.

#### Module 3 — Numerical continuity

- sign gauge;
- branch assignment;
- permutation matching;
- finite sampling;
- convergence.

#### Module 4 — Degenerate perturbation concepts

- repeated eigenvalues;
- eigenspace versus eigenvector;
- projector thinking;
- subspace principal angles;
- basis non-uniqueness.

#### Module 5 — Moving gravitational systems

- binaries;
- barycentric saddles;
- time-dependent source states;
- covariance growth;
- moving tidal axes.

#### Module 6 — Transit engineering

- Gravitational Plane;
- Slipstream/Shear;
- sensor lookahead;
- route refinement;
- emergency de-transit.

#### Module 7 — Large-vessel mechanics

- attitude-dependent tidal loading;
- structural scale;
- distributed control;
- response latency.

#### Module 8 — Provenance and canon

- physical evidence;
- derived models;
- proposed response laws;
- named-race authority;
- archaeological uncertainty.

---

## 28. Examination prompts

1. Show why eigenvector sign reversal is not a physical 180-degree rotation.
2. Derive the single-point-mass tidal eigenvalues.
3. Explain why a repeated eigenvalue makes individual basis vectors non-unique.
4. Given two 3x3 overlap matrices, determine the continuity-maximizing branch permutation.
5. Explain why \(|\mathbf g|\approx0\) does not imply \(\|T\|\approx0\).
6. Design a sampling criterion that distinguishes scalar tidal change from axis rotation.
7. Explain why an eigensystem cannot by itself prove the existence of a fictional FTL shear lane.
8. Design a fault-tolerant alien sensor embodiment that can recover the tidal eigenbasis without using terrestrial Cartesian displays.

---

## 29. Research program

Priority research questions:

1. Replace pairwise-gap degeneracy detection with projector-based cluster tracking.
2. Propagate full joint-source covariance into uncertainty on eigenvalues and eigendirections.
3. Derive first-order eigenvector perturbation covariance away from degeneracy.
4. Develop robust subspace principal-angle tracking through near-crossings.
5. Couple eigensystem uncertainty to family-specific fork prediction without collapsing physical and fictional layers.
6. Validate adaptive sampling against analytically controlled multi-body test problems.
7. Extend the weak-field model toward post-Newtonian moving-source tidal tensors where required.

---

## 30. Proposed patent-class developments

### P-610-01 — Eigenbranch Provenance Capsule

Stores tensor source, epochs, covariance, eigensolver version, branch assignment, degeneracy state, and family-response version with each route segment.

**Status:** PROPOSED.

### P-610-02 — Degenerate-Subspace Refusal Interlock

Prevents a guidance system from treating arbitrary numerical basis vectors inside a degenerate eigenspace as stable physical directions.

**Status:** PROPOSED.

### P-610-03 — Shear-Topology Salience Projector

Operator display that emphasizes axis rotation and degeneracy independently of scalar tidal strength.

**Status:** PROPOSED.

### P-610-04 — Multi-Basis Alien Translation Layer

Converts the same physical eigensystem into Cartesian, resonant, hydraulic, biological-salience, or pressure-electrostatic operator representations while preserving provenance.

**Status:** PROPOSED.

### P-610-05 — Predictive Eigenfuture Solver

Propagates source-state covariance forward and estimates probability distributions over future tidal eigenspaces for route lookahead.

**Status:** PROPOSED.

---

## 31. API contract

Runtime:

`blacklight-exo-ftl-tidal-eigenbranch-tracking-runtime.js`

Resolver:

`resolveFTLTidalEigenbranchTracking(context)`

Required practical input:

- route/encounter `samples` containing finite symmetric `tidalTensorPerS2` packets.

Optional controls:

- `familyId`;
- `encounterModel`;
- `degeneracyRelativeGap`;
- `maximumBranchRotationRad`;
- upstream provenance.

Principal output:

- tracked eigenbranches;
- degeneracy state;
- sign-invariant branch rotations;
- degenerate-subspace rotation where resolvable;
- refinement requests;
- warnings;
- provenance;
- canon safeguards.

---

## 32. Canon safeguards

The following are hard rules.

\[
\boxed{\text{tidal eigenaxis}\neq\text{FTL lane}}
\]

\[
\boxed{\text{degenerate numerical basis}\neq\text{physical preferred direction}}
\]

\[
\boxed{\text{simulation family selection}\neq\text{race technology canon}}
\]

\[
\boxed{\text{axis rotation}\neq\text{automatic catastrophe probability}}
\]

A named civilization's transit method remains governed by its specific named sources.

A physical route solver may test a hypothetical family without establishing that the civilization uses it.

---

## 33. Engineering conclusion

The route stack previously knew how much tidal gravity existed and how that scalar strength changed.

It can now retain the geometry of the tidal field itself.

That matters because the design intent behind Black Light's gravitational-plane and shear transit has always been topological: a route can become dangerous not only because gravity becomes stronger, but because the structure the drive is attempting to follow changes beneath it.

A believable engineering system therefore has to distinguish:

- magnitude change;
- direction change;
- branch exchange;
- degeneracy;
- uncertainty;
- fictional family-boundary response.

Those are now separate, provenance-preserving concepts rather than one generic `gravity danger` number.
