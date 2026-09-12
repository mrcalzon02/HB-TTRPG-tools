# Black Light FTL Normalized Degeneracy Boundary Uncertainty Manual

**Status:** DERIVED engineering and educational authority subordinate to `BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md` and named race/vessel sources.  
**Design-intent source:** *The different lightspeed methods*, document `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`, revision `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`.  
**Primary implementation:** `blacklight-exo-ftl-normalized-degeneracy-uncertainty-runtime.js`.

---

## 1. Purpose

The Black Light route stack already distinguishes physical gravity from fictional transit-family response. It also tracks the eigenvalues and eigenvectors of the weak-field tidal tensor and propagates source-position covariance into uncertainty in those quantities. The remaining operational problem is that the adaptive navigation system does not declare branch identity lost only at exact eigenvalue equality. It uses a finite, versioned engineering threshold:

\[
\gamma_{ij}=\frac{|\lambda_i-\lambda_j|}{\max(|\lambda_i|,|\lambda_j|,\|T\|_F,\epsilon)}
\]

and treats a pair as near-degenerate when

\[
\gamma_{ij}<\gamma_{\min}.
\]

The current default is

\[
\gamma_{\min}=0.02.
\]

That number is not a constant of nature. It is a numerical/navigation control saying that the two modes have become too poorly separated, relative to the local tidal scale, for an individual eigenvector label to remain a trustworthy operational identity.

This manual defines how uncertainty in the underlying tidal tensor propagates into uncertainty in \(\gamma_{ij}\) itself and then into uncertainty in the route location where the operational boundary

\[
\gamma_{ij}=\gamma_{\min}
\]

is crossed.

This distinction is essential. Exact mathematical coalescence,

\[
\lambda_i=\lambda_j,
\]

is not the same event as operational branch-identity loss. A navigation computer can legitimately stop trusting the individual directions before the eigenvalues become exactly equal.

---

## 2. Authority chain and provenance

```text
survey / astrometric observations
            |
            v
source state + covariance at source epoch
            |
            v
time-dependent source propagation
            |
            v
family encounter epoch
            |
            v
weak-field gravity + tidal tensor T
            |
            v
tracked eigenbranches {lambda_k, e_k}
            |
            v
tidal covariance Sigma_T
            |
            v
normalized gap gamma_ij + sigma_gamma
            |
            v
operational gamma_min boundary envelope
            |
            v
adaptive refinement / family certification
```

No stage below the physical environment layer is permitted to retroactively alter the source measurements. No presentation layer is permitted to convert a confidence interval into a new physical or historical fact.

The provenance invariant is:

\[
D_{\gamma}
=
D_{\rm source}
\oplus
D_{\rm propagation}
\oplus
D_T
\oplus
D_{\rm eigen}
\oplus
D_{\Sigma_T}
\oplus
D_{\gamma}.
\]

A route log must be capable of reconstructing which source state, covariance, encounter epoch, tensor solution, branch assignment, and engineering threshold produced a boundary estimate.

---

## 3. Physical starting point: the tidal tensor

For a weak-field point-mass source the already-established physical environment model uses

\[
T_{jk}
=
\frac{GM}{r^3}(3n_jn_k-\delta_{jk}).
\]

For multiple sources the tensors superpose in the weak-field approximation:

\[
T=\sum_a T_a.
\]

The tensor is real and symmetric, so it has an orthonormal eigenbasis:

\[
T\hat e_k=\lambda_k\hat e_k,
\qquad
\hat e_i\cdot\hat e_j=\delta_{ij}.
\]

The tensor is represented for covariance propagation by the six independent components

\[
\mathbf t=
\operatorname{vec}_s(T)
=
[T_{xx},T_{yy},T_{zz},T_{xy},T_{xz},T_{yz}]^T.
\]

Its Frobenius norm is

\[
\|T\|_F
=
\sqrt{
T_{xx}^2+T_{yy}^2+T_{zz}^2
+2T_{xy}^2+2T_{xz}^2+2T_{yz}^2
}.
\]

The factor of two on the off-diagonal components matters because those elements appear twice in the full 3x3 matrix norm.

---

## 4. Eigenvalue sensitivities

For branch \(k\), first-order symmetric perturbation theory gives

\[
\delta\lambda_k
=
\hat e_k^T\delta T\hat e_k.
\]

Define the six-component sensitivity vector

\[
\mathbf a_k=
[
 e_x^2,
 e_y^2,
 e_z^2,
 2e_xe_y,
 2e_xe_z,
 2e_ye_z
]^T.
\]

Then

\[
\delta\lambda_k=\mathbf a_k^T\delta\mathbf t.
\]

For the signed eigenvalue gap

\[
g_{ij}=\lambda_i-\lambda_j,
\]

we therefore have

\[
\delta g_{ij}
=(\mathbf a_i-\mathbf a_j)^T\delta\mathbf t.
\]

With tidal covariance \(\Sigma_T\),

\[
\sigma_{g,ij}^2
=
(\mathbf a_i-\mathbf a_j)^T
\Sigma_T
(\mathbf a_i-\mathbf a_j).
\]

This automatically keeps the correlation between the two eigenvalues because both derive from the same uncertain tensor.

---

## 5. The normalized operational gap

The branch tracker uses

\[
\gamma_{ij}=\frac{|g_{ij}|}{S}
\]

with

\[
S=\max
\left(
|\lambda_i|,
|\lambda_j|,
\|T\|_F,
\epsilon
\right).
\]

The scale floor \(\epsilon\) prevents division by a numerically meaningless zero-scale environment. The current implementation uses a versioned engineering floor; it is not a physical constant.

The use of \(S\) is intentional. A raw difference of \(10^{-12}\,\mathrm{s^{-2}}\) can be enormous in one environment and negligible in another. The normalized gap asks whether the difference is large compared with the actual tidal scale present at the sample.

---

## 6. Why the denominator cannot be treated as exact

A common but incorrect shortcut is

\[
\sigma_\gamma
\stackrel{\rm wrong}{\approx}
\frac{\sigma_g}{S}.
\]

That assumes \(S\) is exact and independent of the numerator.

It is neither.

If the active scale is \(|\lambda_i|\), then the same tensor uncertainty that changes the numerator also changes the denominator through \(\lambda_i\). If the active scale is \(\|T\|_F\), every tensor component participates in both quantities.

The correct first-order treatment uses one gradient with respect to the same tensor vector \(\mathbf t\).

---

## 7. Piecewise derivative of the normalization scale

The max function is piecewise smooth. Away from ties, exactly one candidate is active.

If

\[
S=|\lambda_i|,
\]

then

\[
\nabla_{\mathbf t}S
=
\operatorname{sgn}(\lambda_i)\mathbf a_i.
\]

If

\[
S=|\lambda_j|,
\]

then

\[
\nabla_{\mathbf t}S
=
\operatorname{sgn}(\lambda_j)\mathbf a_j.
\]

If

\[
S=\|T\|_F,
\]

then

\[
\nabla_{\mathbf t}\|T\|_F
=
\frac{1}{\|T\|_F}
[
T_{xx},T_{yy},T_{zz},2T_{xy},2T_{xz},2T_{yz}
]^T.
\]

If the fixed floor \(\epsilon\) is uniquely active,

\[
\nabla_{\mathbf t}S=0.
\]

### 7.1 Max-function ties

If two candidates are equal, or sufficiently close that finite numerical precision and covariance can change which candidate is active, the max function is not represented by one unique local derivative.

The runtime therefore returns:

`NONSMOOTH_SCALE`

instead of arbitrarily choosing a denominator derivative.

This is not a failure of the physics. It is an honest statement about a non-smooth numerical definition.

---

## 8. Gradient of gamma

For a nonzero gap and a unique active scale branch,

\[
\nabla_{\mathbf t}|g|
=
\operatorname{sgn}(g)
(\mathbf a_i-\mathbf a_j).
\]

The quotient rule gives

\[
\boxed{
\nabla_{\mathbf t}\gamma
=
\frac{\operatorname{sgn}(g)(\mathbf a_i-\mathbf a_j)}{S}
-
\frac{|g|}{S^2}\nabla_{\mathbf t}S
}.
\]

Therefore

\[
\boxed{
\sigma_\gamma^2
=
(\nabla\gamma)^T
\Sigma_T
(\nabla\gamma)
}.
\]

This single equation preserves the covariance between numerator and denominator automatically.

---

## 9. The absolute-value cusp

At

\[
g=0,
\]

\(|g|\) has no unique derivative.

Even when the nominal gap is nonzero, if

\[
|g|\lesssim k\sigma_g,
\]

the sign of the underlying gap is not stably identified by the linearized evidence.

The default implementation uses

\[
k=1
\]

as a versioned engineering refusal threshold and reports:

`NONSMOOTH_GAP`.

It does not choose a sign solely to manufacture a neat uncertainty bar.

A future sigma-point or Monte Carlo treatment can model the folded distribution of \(|g|\) directly without requiring a differentiable cusp.

---

## 10. Operational degeneracy boundary

Define

\[
h_{ij}=\gamma_{ij}-\gamma_{\min}.
\]

Then:

\[
h>0
\]

means the pair remains outside the operational near-degeneracy region, while

\[
h<0
\]

means the pair lies inside it.

The boundary is

\[
\boxed{h=0}.
\]

This is the actual transition the adaptive branch tracker uses.

It must not be confused with exact coalescence:

\[
\boxed{
\gamma=\gamma_{\min}
\neq
\lambda_i=\lambda_j
}.
\]

---

## 11. Localizing the boundary in route fraction

For adjacent samples \(a\) and \(b\), let

\[
h_a=h(s_a),
\qquad
h_b=h(s_b).
\]

If the signs differ, a local linear boundary estimate is

\[
\boxed{
s_*
=
s_a-
\frac{h_a}{h_b-h_a}
(s_b-s_a)
}.
\]

The local slope is

\[
\left|\frac{dh}{ds}\right|
\approx
\frac{|h_b-h_a|}{|s_b-s_a|}.
\]

If that slope is nearly zero, the boundary cannot be localized by this first-order interval model and remains `BOUNDARY_UNCERTAIN`.

---

## 12. Boundary uncertainty without cross-sample covariance

The statistically exact covariance between \(\gamma(s_a)\) and \(\gamma(s_b)\) is not currently carried by the navigation packet. The two samples commonly share source-state ancestry, so assuming independence would be unjustified.

The runtime therefore does **not** report a falsely precise one-sigma boundary interval.

Let

\[
w=\frac{s_*-s_a}{s_b-s_a}.
\]

It uses the conservative linear bound

\[
\sigma_{h,*}^{\rm upper}
\approx
(1-w)\sigma_{\gamma,a}
+w\sigma_{\gamma,b}.
\]

Then

\[
\boxed{
\sigma_{s,*}^{\rm upper}
\approx
\frac{
\sigma_{h,*}^{\rm upper}
}{
|dh/ds|
}
}.
\]

This is intentionally labeled an **upper-bound linear construction**, not an exact Gaussian confidence interval.

When cross-sample covariance becomes available, the correct interpolation variance can replace this conservative envelope.

---

## 13. Geometry of the result

```text
resolved branches             uncertain identity zone

lambda_1  --------------------\
                               \
                                \      branch identity weak
                                 \   [ gamma < gamma_min ]
lambda_2  -----------------------X--------------------------
                                /
                               /
                              /

route fraction:  ----a----[ s* +/- envelope ]----b---->
```

The envelope describes uncertainty in **where the operational identity threshold lies**.

It does not describe the width of a fictional shear lane.

---

## 14. Gravitational Plane engineering interpretation

The design source describes transit methods that can depend strongly on gravitational lensing/shear geometry and can fail catastrophically when a route forks or the vessel is effectively pulled into incompatible field paths.

The ordinary-physics precursor packet can now contain:

\[
\lambda_k,
\quad
\hat e_k,
\quad
\sigma_{\lambda_k},
\quad
\sigma_{\psi,k},
\quad
\gamma_{ij},
\quad
\sigma_{\gamma,ij},
\quad
s_*,
\quad
\sigma_{s,*}^{\rm upper}.
\]

That supports three materially different engineering statements:

1. **Resolved transition:** a branch-identity boundary exists and is tightly localized.
2. **Uncertain transition:** the nominal boundary exists, but astrometric/tidal uncertainty makes its location broad.
3. **Non-smooth evidence:** the first-order model cannot assign a trustworthy derivative at the sample.

Only after that physical evidence exists may a separately versioned Gravitational Plane family model evaluate whether the geometry corresponds to an exotic shear fork, whether the drive can remain coupled, and whether emergency de-transit is possible.

---

## 15. Slipstream/Shear engineering interpretation

For Slipstream/Shear systems, the same tidal topology can be represented as a candidate corridor, lane, or branch condition, but the separation remains mandatory:

\[
\boxed{
\text{ordinary tidal degeneracy}
\neq
\text{fictional shear-lane state}
}.
\]

A narrow \(\gamma\)-boundary envelope means the ordinary gravitational transition is well known. It does not prove a lane exists.

A broad envelope means the navigation authority cannot say exactly where branch identity is lost. That can force a conservative refusal even if the drive itself is perfectly healthy.

---

## 16. Other family uses

| Family | Use of normalized-degeneracy uncertainty |
|---|---|
| Metric Envelope | Secondary structural/field-distortion confidence input |
| Gravitational Plane | Primary physical precursor for branch/fork navigation |
| Slipstream/Shear | Primary physical precursor for lane topology |
| Q-Lattice | Commitment/emergence endpoint evidence only |
| N-Manifold | Secondary ordinary-environment topology confidence |
| Fold Jump | Commitment/emergence endpoint evidence only |
| Wormhole/Gate | Entry/exit mouth evidence only |
| Phase Displacement | Commitment/emergence endpoint evidence only |
| Inertial Torch | Tidal-load and attitude/navigation confidence |

PRECOMMIT and anchored-portal families do not acquire fabricated intermediate corridor samples merely because this uncertainty model exists.

---

## 17. Machinery embodiment: terrestrial electromechanical systems

A terrestrial implementation is likely to expose the calculation in recognizably numerical form:

```text
TIDAL BRANCH PAIR 0/1
GAMMA              0.0218
SIGMA_GAMMA        0.0011
IDENTITY LIMIT     0.0200
BOUNDARY RANGE     0.431 +/- 0.018 route fraction (upper-bound)
MODEL              LINEARIZED
```

Likely machinery includes interferometric gradiometers, timing standards, covariance-processing racks, redundant route computers, solid-state inertial packages, and a physically separate abort authority.

The important point is that the display is downstream of the evidence. The screen does not define the threshold merely by drawing a red zone.

---

## 18. Machinery embodiment: aquatic electrochemical/hydraulic systems

An aquatic or conductive-fluid technological lineage can implement the same state through field topology rather than Cartesian vector graphics.

A widening uncertainty envelope may be rendered as a thickening conductive channel, a split pressure manifold, or a phase-lagged ionic contour. The operator can perceive that the branch-loss location is broad without ever seeing a decimal covariance matrix.

The underlying value remains \(\sigma_\gamma\); the representation changes.

---

## 19. Machinery embodiment: biological/symbiotic systems

A biological navigator can encode branch confidence as neural salience.

A well-resolved boundary may feel like a narrow, stable sensory discontinuity. A broad covariance envelope may present as a diffuse region in which two navigational directional states cannot be cleanly distinguished.

That does not make the mathematics subjective. It means the organism is the display and part of the sensor-fusion stack.

Maintenance therefore includes sensory calibration, tissue-state baselining, metabolic stability, and comparison against external reference stimuli.

---

## 20. Machinery embodiment: mineral-photonic systems

Mineral/piezoelectric/photonic technology can represent eigenbranch separation through resonance structure.

As \(\gamma\) falls, two modal signatures approach one another relative to the total field scale. Uncertainty appears as linewidth broadening and overlap. A `NONSMOOTH_SCALE` event can naturally appear as competition between two equally dominant normalization channels.

A service technician may inspect resonance spectra rather than matrix tables while still implementing the same mathematics.

---

## 21. Machinery embodiment: gas-giant systems

Gas-giant engineering can distribute the calculation across pressure surfaces, electrostatic volumes, buoyancy-stabilized sensor cells, and extended baseline arrays.

A route boundary may therefore be represented volumetrically: a moving shell of reduced topological confidence rather than a point on a line.

The route fraction remains a useful archival abstraction, but the native machinery need not resemble a terrestrial plotting console.

---

## 22. Technology ancestry and hybrid installations

Always preserve:

\[
\text{owner}
\neq
\text{operator}
\neq
\text{manufacturer}
\neq
\text{inventor}
\neq
\text{technology ancestry}.
\]

A Human-operated captured drive can retain alien sensor mathematics. A rebuilt alien vessel can use terrestrial clocks but native field couplers. A recovered computer may display uncertainty according to a civilization that no longer exists.

The generator must not infer ancestry from the family selection used for a route simulation.

---

## 23. Scaling behavior

For vessel characteristic length \(L_v\), differential tidal acceleration remains approximately

\[
\Delta a\sim\|T\|L_v.
\]

A rough structural stress scaling remains

\[
\sigma_{\rm tidal}\sim\rho\|T\|L_v^2.
\]

The consequence is that topology uncertainty matters more, not less, as the vehicle grows. A kilometer-scale vessel cannot necessarily treat a poorly localized tidal transition as a point-like navigation nuisance. Different sections of the vehicle can be separated by meaningful differential acceleration and control latency.

Distributed control remains characterized by

\[
\Pi_c=\frac{L_c}{v_c\tau_r}.
\]

A topology transition whose uncertainty envelope is comparable to the distance traversed during distributed response latency can force a conservative abort even when the nominal center of the boundary remains outside the hull's immediate path.

---

## 24. Power and recovery consequences

This authority does not define a new drive-energy equation. It changes when a route controller is justified in applying existing family-response and recovery models.

A wide boundary envelope can increase required protected recovery reserve because the controller may need to initiate de-transit before the nominal hazard center.

The distinction is:

\[
\text{uncertainty reserve}
\neq
\text{extra gravity energy cost}.
\]

The former is an operational margin. The latter would require a family-specific physical model.

---

## 25. Navigation infrastructure

A high-confidence route may depend on civilization-scale infrastructure:

```text
survey telescopes / ranging baselines
             |
             v
reference-frame and clock authority
             |
             v
joint astrometric solution
             |
             v
source covariance propagation
             |
             v
encounter-time gravity solution
             |
             v
tidal covariance
             |
             v
gamma-boundary confidence
```

A derelict vessel can therefore have a functional drive, functional sensors, and functional computers while still being unable to certify a route because its external astrometric covariance products are centuries out of date.

This is a maintenance and infrastructure failure, not necessarily a drive failure.

---

## 26. Signature model

Uncertainty processing itself is primarily computational, but the machinery supporting it can create signatures:

- repeated high-baseline active ranging;
- synchronized interferometric sweeps;
- gradiometer excitation cycles;
- increased navigation-compute heat rejection;
- repeated calibration maneuvers;
- photonic resonance sweeps;
- biological metabolic loading in living navigation substrates;
- pressure/electrostatic reference cycling in gas-giant systems.

A vessel attempting to reduce \(\sigma_\gamma\) before transit may therefore become more observable even if the drive has not yet energized.

---

## 27. Failure taxonomy

### NDU-NO-TENSOR-COV
No tidal covariance is available. The normalized boundary uncertainty is unresolved, not zero.

### NDU-NO-BRANCH
Tracked branch sensitivity is missing or branch identity is unavailable.

### NDU-NONSMOOTH-SCALE
Two or more normalization candidates are effectively tied. The max function has no unique active derivative.

### NDU-NONSMOOTH-GAP
The signed eigenvalue gap lies at or inside its uncertainty cusp. The derivative of \(|g|\) is not trusted.

### NDU-LINEAR-OOD
\(\sigma_\gamma\) exceeds the configured first-order operating envelope.

### NDU-FLAT-BOUNDARY
\(h\) changes too slowly across the interval to localize the boundary reliably.

### NDU-X-SAMPLE-COV
Cross-sample covariance is unavailable. The runtime reports a conservative upper-bound localization envelope rather than an exact one-sigma interval.

### NDU-CANON-LEAK
A UI, generator, or downstream model treats the physical topology boundary as proof of an exotic FTL lane/fork or race-specific technology assignment.

---

## 28. Practical equipment procedure NDU-01 — Evidence intake

1. Confirm family and encounter model are explicit.
2. Confirm every route sample preserves encounter epoch and field point.
3. Confirm source covariance reached the tidal-uncertainty packet.
4. Confirm the tracked branch packet and uncertainty packet refer to the same ordered samples.
5. Refuse certification if missing covariance has been replaced with zeros.

Acceptance criterion: the operator can trace every \(\gamma\) uncertainty value back to a tidal covariance matrix and tracked branch sensitivity.

---

## 29. Procedure NDU-02 — Normalization audit

For every branch pair:

1. Compute \(|\lambda_i|\).
2. Compute \(|\lambda_j|\).
3. Compute \(\|T\|_F\).
4. Compare to \(\epsilon\).
5. Determine the unique active maximum.
6. If the top candidates fall within the configured tie tolerance, mark `NONSMOOTH_SCALE`.

Do not resolve a tie by preferred branch number or previous-frame state.

---

## 30. Procedure NDU-03 — Gap-cusp audit

Compute

\[
g=\lambda_i-\lambda_j
\]

and \(\sigma_g\).

If

\[
|g|\le k\sigma_g,
\]

mark `NONSMOOTH_GAP`.

Do not choose the nominal sign simply because it is numerically nonzero.

---

## 31. Procedure NDU-04 — Gamma covariance solve

For smooth samples:

1. Construct \(\nabla |g|\).
2. Construct \(\nabla S\).
3. Apply the quotient gradient.
4. Evaluate

\[
\sigma_\gamma^2=(\nabla\gamma)^T\Sigma_T(\nabla\gamma).
\]

5. Compare \(\sigma_\gamma\) to the configured linear-model envelope.
6. Preserve the gradient with the packet for audit/replay.

---

## 32. Procedure NDU-05 — Boundary bracket

For adjacent samples and each branch pair:

1. Compute \(h_a=\gamma_a-\gamma_{\min}\).
2. Compute \(h_b=\gamma_b-\gamma_{\min}\).
3. If the signs do not differ, report `NO_CROSSING` for that interval.
4. If either endpoint is non-smooth, report `NONSMOOTH_ENDPOINT` and request more physical evidence if resources permit.
5. Otherwise solve the local crossing fraction.

---

## 33. Procedure NDU-06 — Boundary uncertainty

Compute interpolation weight \(w\), local slope \(|dh/ds|\), and the conservative endpoint uncertainty bound.

Report both

\[
s_*
\]

and

\[
\sigma_{s,*}^{\rm upper}.
\]

Never label the latter as a statistically exact one-sigma value while cross-sample covariance is absent.

---

## 34. Procedure NDU-07 — Maintenance recertification

Recompute the normalized boundary whenever any of these changes:

- source ephemeris revision;
- source covariance revision;
- route epoch;
- reference frame;
- gradiometer calibration;
- branch-tracker version;
- \(\gamma_{\min}\) engineering profile;
- finite-difference or covariance model;
- family certification profile.

A cached boundary is not timeless.

---

## 35. Procedure NDU-08 — Salvaged or alien installation

1. Establish what the native machinery actually measures.
2. Translate native uncertainty representation into SI/covariance evidence only where justified.
3. Preserve native provenance.
4. Do not assume a visual or sensory "fork" indicator corresponds exactly to \(\gamma_{\min}\).
5. Run parallel external measurements where possible.
6. If the native system's threshold cannot be recovered, mark it unresolved rather than silently assigning the Human/default 0.02 value.

---

## 36. Worked example

Suppose the tracked pair has

\[
\lambda_i=5.00\times10^{-11}\,\mathrm{s^{-2}},
\]

\[
\lambda_j=3.95\times10^{-11}\,\mathrm{s^{-2}},
\]

and

\[
\|T\|_F=5.20\times10^{-11}\,\mathrm{s^{-2}}.
\]

Then

\[
g=1.05\times10^{-11}\,\mathrm{s^{-2}}
\]

and the active normalization is the Frobenius norm:

\[
S=5.20\times10^{-11}\,\mathrm{s^{-2}}.
\]

Therefore

\[
\gamma
=\frac{1.05}{5.20}
\approx0.2019.
\]

This is far outside the default near-degenerate region.

Now consider a later sample with

\[
\lambda_i=4.10\times10^{-11},
\qquad
\lambda_j=4.03\times10^{-11},
\qquad
\|T\|_F=5.00\times10^{-11}.
\]

Then

\[
g=7.0\times10^{-13},
\]

\[
\gamma=0.014.
\]

The pair lies inside the operational near-degeneracy threshold even though the eigenvalues are not equal.

That is precisely why exact-coalescence uncertainty alone is insufficient for the navigation system.

---

## 37. Boundary example

Assume adjacent route samples give

\[
\gamma_a=0.026,
\qquad
\gamma_b=0.014,
\]

with

\[
\gamma_{\min}=0.020.
\]

Then

\[
h_a=+0.006,
\qquad
h_b=-0.006.
\]

The local linear crossing lies halfway between them:

\[
w=0.5.
\]

If

\[
\sigma_{\gamma,a}=0.001,
\qquad
\sigma_{\gamma,b}=0.002,
\]

then the conservative interpolated uncertainty is

\[
\sigma_h^{\rm upper}
\approx
0.5(0.001)+0.5(0.002)=0.0015.
\]

If the samples are separated by \(\Delta s=0.04\), then

\[
\left|\frac{dh}{ds}\right|
\approx
\frac{0.012}{0.04}=0.3.
\]

Hence

\[
\sigma_{s,*}^{\rm upper}
\approx
\frac{0.0015}{0.3}=0.005.
\]

The route controller should therefore treat the operational identity-loss boundary as occupying an uncertainty envelope on the order of half a percent of route fraction under this local model, not as an exact point.

---

## 38. Adaptive-sampling integration

The correct future closed loop is:

```text
adaptive physical samples
        |
        v
tracked eigensystem
        |
        v
tidal covariance
        |
        v
gamma + sigma_gamma
        |
        +--> narrow boundary -> retain / certify
        |
        +--> broad boundary  -> refine if resources permit
        |
        +--> non-smooth      -> refine or refuse linear model
```

A future version may add a tolerance such as maximum permitted \(\sigma_{s,*}^{\rm upper}\) before refinement is requested.

That tolerance must be versioned and family/profile aware. It must not be presented as a natural constant.

---

## 39. Control and emergency de-transit

For continuously represented transit, an uncertainty envelope around a topology boundary must eventually be compared with the existing intervention reach:

\[
D_{\rm int}=v_p t_{\rm int}.
\]

If the earliest plausible boundary lies at distance \(D_{B,\rm early}\), then a conservative control system should use

\[
M_D
=
D_{B,\rm early}-D_{\rm int}
\]

rather than the nominal center alone.

For PRECOMMIT families, use the existing timing margin

\[
M_T=t_{\rm prediction}-t_{\rm int}
\]

at commitment/emergence states. Do not fabricate an intermediate local FTL velocity.

This manual does not yet implement that downstream uncertainty-aware intervention margin. It establishes the physical/navigation boundary packet required for it.

---

## 40. Educational course: Transit Environment Physics 640

### Course title
**Normalized Spectral Degeneracy, Non-smooth Uncertainty, and Operational Topology Boundaries**

### Prerequisites
Transit Environment Physics 570 through 630, linear algebra, multivariable calculus, probability/covariance, numerical methods, weak-field gravitation, and basic control systems.

### Learning objectives
Students must be able to:

- derive eigenvalue sensitivity for a symmetric tensor;
- derive the normalized gap gradient;
- explain why numerator and denominator uncertainty are correlated;
- recognize the absolute-value cusp and max-function non-smoothness;
- distinguish exact spectral coalescence from engineering branch-identity loss;
- localize an operational \(\gamma\) boundary;
- explain why absent cross-sample covariance prevents an exact boundary confidence interval;
- preserve physical evidence separately from fictional FTL family response.

### Laboratory 1 — Smooth denominator branch
Given \(T\), \(\Sigma_T\), and tracked eigenvectors, compute \(\sigma_\gamma\) when \(\|T\|_F\) is uniquely active.

### Laboratory 2 — Scale tie
Construct a state where \(|\lambda_i|\) and \(\|T\|_F\) are equal within numerical tolerance. Demonstrate why two different derivative choices produce inconsistent first-order answers.

### Laboratory 3 — Gap cusp
Propagate a Gaussian perturbation through a gap whose mean is smaller than its standard deviation. Compare the folded distribution of \(|g|\) with an invalid signed linear approximation.

### Laboratory 4 — Route boundary
Use a sequence of encounter samples to bracket \(\gamma=0.02\), compute the local crossing, and report an upper-bound localization envelope.

### Laboratory 5 — Canon discipline
Given a sharply localized physical boundary, identify which additional evidence is still required before claiming a Gravitational Plane shear fork.

---

## 41. Examination problems

**Problem A:** Derive \(\nabla\gamma\) when \(S=|\lambda_i|\). Identify all points where the derivative is non-unique.

**Problem B:** Show why \(\sigma_g^2=\sigma_i^2+\sigma_j^2\) is generally wrong when \(\lambda_i\) and \(\lambda_j\) arise from the same uncertain tensor.

**Problem C:** For a point-mass field, explain why the two tangential modes form a degenerate subspace and why no unique transverse pair of eigenvectors should be archived as physical fact.

**Problem D:** A route segment brackets \(\gamma_{\min}\), but the active normalization changes from \(\|T\|_F\) to \(|\lambda_i|\) inside the segment. Explain why the local piecewise model should request refinement rather than smoothly extrapolate one derivative through the switch.

**Problem E:** Explain the difference between a broad \(\gamma\)-boundary envelope and a high fictional hazard probability.

---

## 42. Research program

### R-640.1 Cross-sample covariance
Carry the shared source-state covariance ancestry through multiple encounter epochs so boundary localization can use the true covariance between endpoint \(\gamma\) estimates.

### R-640.2 Joint-source covariance
Replace the independent-source approximation with joint barycentric or survey-solution covariance where available.

### R-640.3 Unscented propagation
Use sigma points to handle the nonlinearity of eigenvalue gaps, max normalization, and the absolute-value cusp without requiring a single local derivative.

### R-640.4 Monte Carlo validation
Compare first-order \(\sigma_\gamma\) and boundary envelopes with sampled source-state distributions.

### R-640.5 Interval arithmetic
Investigate guaranteed enclosures for \(\gamma\) and boundary location where statistical assumptions are undesirable.

### R-640.6 Family-response coupling
Only after physical uncertainty is stable, study versioned Gravitational Plane and Slipstream/Shear response models that consume the physical packet while retaining separate exotic-boundary provenance.

---

## 43. Proposed technologies

The following are **PROPOSED**, not established setting canon.

### Normalized Topology Confidence Interlock
A hardware interlock that refuses family engagement when \(\gamma\)-boundary confidence exceeds a profile-specific localization envelope.

### Spectral Cusp Classifier
A numerical accelerator that detects when the branch-gap probability mass straddles zero and automatically switches from linear propagation to a sigma-point model.

### Active-Scale Provenance Recorder
A flight recorder that stores which normalization branch controlled every \(\gamma\) estimate and marks scale-switch events for replay.

### Boundary Envelope Projector
A native operator display that renders the earliest plausible and latest plausible branch-identity transition separately from the nominal center.

### Covariance-Ancestry Mesh
A distributed navigation network that retains cross-time and cross-source covariance rather than reducing every encounter sample to an isolated uncertainty packet.

---

## 44. Generator and API requirements

The generator must preserve:

- family ID and encounter model;
- route fraction and encounter epoch;
- tensor covariance provenance;
- tracked branch IDs;
- branch sensitivities;
- active normalization source;
- \(\gamma\), \(\sigma_\gamma\), and \(h\);
- non-smooth status;
- boundary interval and boundary-location envelope;
- versioned \(\gamma_{\min}\);
- warnings and canon safeguards.

The generator must never silently replace:

`NONSMOOTH_SCALE` with a preferred denominator;

`NONSMOOTH_GAP` with a chosen sign;

`OUTSIDE_LINEAR_MODEL` with a clipped error bar;

missing covariance with zero covariance;

physical topology with a fictional FTL lane;

simulation family selection with race or technology ancestry.

---

## 45. Canon safeguards

The authoritative interpretation is:

\[
\boxed{
\text{well-known tidal boundary}
\neq
\text{known exotic FTL fork}
}
\]

and:

\[
\boxed{
\text{poorly known tidal boundary}
\neq
\text{high fictional danger probability}
}.
\]

The first statement prevents physics evidence from manufacturing setting canon.

The second prevents uncertainty from being mislabeled as danger.

The design source asks for believable, deeply developed transit science with different family responses to gravitational environment and imperfect safety. This authority supports that intent by making the navigation system more capable of saying **what it knows, how well it knows it, and where its mathematics stops being justified**.

---

## 46. Engineering summary chart

| Quantity | Meaning | Units | Authority |
|---|---|---:|---|
| \(\lambda_k\) | Principal tidal eigenvalue | s\(^{-2}\) | physical environment/eigenbranch |
| \(g_{ij}\) | Signed eigenvalue gap | s\(^{-2}\) | DERIVED physical quantity |
| \(S\) | Local tidal normalization scale | s\(^{-2}\) | DERIVED numerical definition |
| \(\gamma_{ij}\) | Relative branch separation | dimensionless | DERIVED numerical definition |
| \(\gamma_{\min}\) | Operational identity threshold | dimensionless | versioned engineering control |
| \(\sigma_\gamma\) | Linearized normalized-gap uncertainty | dimensionless | DERIVED uncertainty |
| \(s_*\) | Local boundary route fraction | dimensionless | DERIVED interpolation |
| \(\sigma_{s,*}^{upper}\) | Conservative boundary-location uncertainty | dimensionless | DERIVED upper bound |
| \(B_f\) | Exotic family-boundary state | family-specific | separate family authority |

---

## 47. Final doctrine

Black Light navigation is not allowed to claim precision merely because the computer can print more digits.

The route system now has a formal path from uncertain astronomical measurements to uncertainty in the **actual branch-identity threshold used operationally by the adaptive sampler**. It can say that a topology transition is well resolved, poorly localized, non-smooth under the current approximation, or outside the linear model.

That is the required foundation for later family-specific shear/fork safety logic, practical maintenance doctrine, alien machinery translation, and uncertainty-aware emergency de-transit—without sacrificing the separation between ordinary physics, derived engineering models, and fictional transit canon.
