# BLACK LIGHT FTL TIME-DEPENDENT EPHEMERIS & COVARIANCE MANUAL

**Status:** DERIVED engineering authority support.  
**Governing design-intent source:** *The different lightspeed methods* — Google Doc `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`, revision `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`.  
**Primary integrated authority:** `docs/blacklight/BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md`.  
**Machine-readable registry:** `data/exo-vessel/ftl-time-dependent-source-state-registry.json`.  
**Runtime:** `blacklight-exo-ftl-time-dependent-source-state-runtime.js`.  
**Schema:** `data/schemas/exo-vessel-ftl-time-dependent-source-state.schema.json`.

---

## 1. PURPOSE

A route through a gravitational environment is not evaluated against a photograph of the universe. Stars move. Binaries orbit. Stations move. Compact objects move. Reference frames drift. Measurement uncertainty grows when state estimates are propagated away from the epoch at which they were measured.

The existing Black Light physical-route sampler already refuses to pretend that a missing velocity is zero and already marks an epochless path as an authority snapshot rather than a propagated ephemeris. This manual closes the next engineering gap: it defines how authoritative source states may be transported from their measurement epoch to a route-evaluation epoch without converting missing dynamics or uncertainty into fictitious certainty.

The governing principle is:

```text
measured source state at t0
        ↓
reference-frame / epoch verification
        ↓
chosen propagation model
        ↓
state transition to t
        ↓
covariance + process-noise propagation
        ↓
approximation-validity audit
        ↓
propagated SI source-state packet
        ↓
physical route-path sampler
        ↓
segment + family certification
```

The ephemeris layer does **not** assign an FTL family and does **not** alter the operator physics of Metric Compression, Gravitational Plane, Hyperspatial Slipstream, Q-Lattice, N-Manifold, Fold, Wormhole/Gate, Phase Displacement, or ordinary relativistic/torch propulsion.

It exists so those systems are exposed to a gravitational model evaluated at the correct time.

---

## 2. AUTHORITY AND PROVENANCE

Authority order within this layer is:

1. explicit named-source astrometry, orbital solutions, barycentric state vectors, covariance, and epoch records;
2. published-first EXAMPLE source authority;
3. consolidated propulsion/transit authority;
4. this manual and its registry/runtime;
5. DERIVED numerical propagation;
6. explicitly labeled PROPOSED higher-fidelity extensions.

A propagation result never outranks the source record from which it was calculated.

The following equivalences are prohibited:

\[
\boxed{\text{missing velocity}\neq \mathbf 0}
\]

\[
\boxed{\text{missing covariance}\neq \mathbf 0}
\]

\[
\boxed{\text{catalog coordinate}\neq\text{eternally fixed source position}}
\]

\[
\boxed{\text{propagated estimate}\neq\text{new historical canon}}
\]

Every propagated state therefore retains source identity, source epoch, target epoch, model identity, error bounds, covariance ancestry, and provenance.

---

## 3. STATE VECTOR

For the bounded kinematic model implemented here, the source state is

\[
\mathbf z=
\begin{bmatrix}
\mathbf r\\
\mathbf v
\end{bmatrix}
=
\begin{bmatrix}
x&y&z&v_x&v_y&v_z
\end{bmatrix}^{T}.
\]

Units are SI:

| Quantity | Unit |
|---|---|
| position \(\mathbf r\) | m |
| velocity \(\mathbf v\) | m s\(^{-1}\) |
| acceleration \(\mathbf a\) | m s\(^{-2}\) |
| covariance \(\Sigma\) | mixed state units |
| epoch difference \(\Delta t\) | s |

The reference frame must be explicit. A Cartesian vector without a frame and epoch is incomplete navigation evidence.

---

## 4. LINEAR KINEMATIC PROPAGATION

Where the source has a known position and velocity, and acceleration can be bounded over the requested interval, the first-order model is

\[
\mathbf r(t)=\mathbf r_0+\mathbf v_0\Delta t,
\]

\[
\mathbf v(t)=\mathbf v_0.
\]

The associated state-transition matrix is

\[
F(\Delta t)=
\begin{bmatrix}
I&\Delta t I\\
0&I
\end{bmatrix}.
\]

This is not an orbital solution. It is a local kinematic approximation.

If the magnitude of neglected acceleration is bounded by \(a_{\max}\), Taylor's theorem gives the conservative position remainder

\[
\|\delta\mathbf r\|
\le
\frac{1}{2}a_{\max}\Delta t^2
\]

and velocity remainder

\[
\|\delta\mathbf v\|
\le
a_{\max}|\Delta t|.
\]

These bounds are useful because they give the runtime a refusal condition instead of a vague statement that a prediction is "old."

If the caller declares maximum acceptable errors \(r_{\rm tol}\) and \(v_{\rm tol}\), linear propagation is outside its certified model domain whenever

\[
\frac12 a_{\max}\Delta t^2>r_{\rm tol}
\]

or

\[
a_{\max}|\Delta t|>v_{\rm tol}.
\]

The correct result is then:

`OUTSIDE_MODEL_VALIDITY`

—not a larger generic hazard score.

---

## 5. CONSTANT-ACCELERATION PROPAGATION

If an authoritative source explicitly supplies an acceleration vector, a second-order deterministic state update may be used:

\[
\mathbf r(t)=
\mathbf r_0+
\mathbf v_0\Delta t+
\frac12\mathbf a\Delta t^2,
\]

\[
\mathbf v(t)=
\mathbf v_0+\mathbf a\Delta t.
\]

Mass alone is not enough to infer \(\mathbf a\). Acceleration depends on the complete dynamical environment and frame. Therefore:

\[
\boxed{M\not\Rightarrow\mathbf a}
\]

without the positions and interactions of the other relevant masses.

If neglected jerk is bounded by \(j_{\max}\), the next Taylor remainders are approximately bounded by

\[
\|\delta\mathbf r\|
\le
\frac16 j_{\max}|\Delta t|^3,
\]

\[
\|\delta\mathbf v\|
\le
\frac12 j_{\max}\Delta t^2.
\]

No supplied jerk bound means the constant-acceleration result remains `PARTIAL` for model-validity purposes even if the arithmetic itself is complete.

---

## 6. COVARIANCE PROPAGATION

If the source-state covariance at \(t_0\) is \(\Sigma_0\), the linear covariance transport is

\[
\Sigma(t)=F\Sigma_0F^T+Q.
\]

This expression separates two physically different things:

- transported uncertainty already present in the source estimate;
- newly accumulated uncertainty from unmodeled dynamics, represented by \(Q\).

Setting \(Q=0\) is not a declaration that the universe contains no perturbations. It is a model statement that no process-noise contribution has been supplied.

The runtime keeps that distinction visible as a warning.

### 6.1 White-acceleration process noise

For isotropic continuous white acceleration noise with spectral density \(q_a\) in m\(^2\) s\(^{-3}\), the one-axis discrete process-noise block over duration \(T\ge0\) is

\[
Q_1=
q_a
\begin{bmatrix}
T^3/3&T^2/2\\
T^2/2&T
\end{bmatrix}.
\]

For the state ordering

\[
[x,y,z,v_x,v_y,v_z]^T,
\]

the three-dimensional matrix places identical blocks between each position axis and its corresponding velocity axis.

This is a standard stochastic kinematic model. It is still only a model.

Known anisotropy, binary orbital correlation, barycentric reference uncertainty, or correlated sensor error requires a fuller covariance model.

### 6.2 Backward propagation

Deterministic state transport can use negative \(\Delta t\).

A forward-time white-noise process model cannot simply be reversed by inserting negative time into \(Q\). Therefore the runtime refuses automatic white-acceleration process noise for backward propagation. A caller must provide an explicit reverse-time process-noise covariance or a higher-fidelity smoother solution.

---

## 7. COVARIANCE IS NOT A PERCENTAGE

A six-dimensional covariance matrix contains units and correlations. It is not a scalar "uncertainty percentage."

For example,

\[
\Sigma_{xv_x}
\]

has units of m\(^2\) s\(^{-1}\), while

\[
\Sigma_{xx}
\]

has units of m\(^2\).

Adding raw covariance elements with unlike units is meaningless.

A later route layer may derive dimensionless normalized uncertainty only after selecting explicit reference scales and a defined mapping.

---

## 8. CROSS-SOURCE COVARIANCE

The current runtime propagates each source packet independently.

That is useful but incomplete when several source states share a common reference solution.

If sources A and B have correlated errors, a joint state has covariance

\[
\Sigma_{AB}=
\begin{bmatrix}
\Sigma_A&C_{AB}\\
C_{AB}^T&\Sigma_B
\end{bmatrix}.
\]

Ignoring \(C_{AB}\) can overstate or understate the uncertainty of relative geometry.

This matters strongly for:

- barycentric binary solutions;
- sources derived from the same astrometric fit;
- navigation beacons disciplined by the same clock/reference network;
- multi-body reconstructions sharing common mass priors.

Current rule:

\[
\boxed{\text{independent packets}\neq\text{proof of independent errors}}
\]

Cross-source covariance remains a higher-fidelity input when available.

---

## 9. HANDOFF TO PHYSICAL ROUTE SAMPLING

The existing physical route sampler accepts caller-supplied gravitational source packets.

A propagated source is handed downstream with, at minimum:

```text
sourceId
massKg
positionM
velocityMPerS
physicalRadiusM (when known)
angularMomentumKgM2PerS (when known)
source epoch / target epoch
covariance ancestry
propagation status
provenance
```

The physical route sampler then evaluates its ordinary gravitational quantities at route points:

\[
\Phi(\mathbf x)
=
-\sum_a\frac{GM_a}{r_a},
\]

\[
\mathbf g(\mathbf x)
=
-\sum_aGM_a
\frac{\mathbf x-\mathbf x_a}{r_a^3},
\]

and the weak-field tidal tensor

\[
T_{ij}
=
\sum_a
\frac{GM_a}{r_a^3}
(3n_in_j-\delta_{ij}).
\]

The ephemeris layer does not recompute these quantities.

That separation prevents two competing gravitational implementations from emerging.

---

## 10. WHY TIME DEPENDENCE MATTERS TO FTL FAMILIES

Ordinary source motion does not prove any fictional transit mechanism. It changes the physical environment to which those mechanisms are exposed.

### Metric Compression

A moving high-mass source changes the potential, acceleration, and tidal gradients encountered by the bubble-control solution. A stale mass map can therefore shift an otherwise acceptable compression corridor into an interval whose required field authority exceeds the certified envelope.

### Gravitational Plane

This family is the most directly sensitive to evolving multi-source geometry. A shear-plane branch or saddle is not a static painted line. Its physical precursor changes as source positions and barycentric geometry evolve.

The tidal eigensystem obeys

\[
T\hat e_k=\lambda_k\hat e_k.
\]

As source states propagate,

\[
\lambda_k(t),\qquad \hat e_k(t)
\]

also change.

A future family-specific fork estimator may use those quantities, but the exact fictional mapping remains `PROPOSED`.

### Hyperspatial Slipstream

Propagated real-space source geometry constrains entry, emergence, and reference registration. It does not imply the slipstream medium itself follows Newtonian gravity.

### Q-Lattice / Phase Translation

The ephemeris primarily constrains commitment and re-entry geometry. It cannot manufacture missing Q-boundary state.

### N-Manifold

Source propagation constrains the ordinary-space endpoints and observed gravitational environment. Manifold topology remains separate operator physics.

### Fold

For a nonlocal Fold representation, endpoint state at the commitment epoch is more important than pretending the craft continuously samples an ordinary-space line at superluminal speed.

### Wormhole / Gate

The local dynamics of both mouths and their surrounding mass distributions matter. The throat's exotic stability remains a separate boundary state.

### Phase Displacement

Physical ephemerides constrain reconciliation with the destination environment but do not define the phase-space operator itself.

---

## 11. TIME-OF-FLIGHT AND EPOCH SEMANTICS

Three epochs must not be casually collapsed:

```text
observation epoch t_obs
route-solution epoch t_route
arrival / emergence epoch t_arr
```

For continuous ordinary propagation, a source may need to be evaluated at the time the vessel is expected to encounter a particular interval.

For nonlocal FTL operators, the relevant source epoch may instead be the predicted emergence epoch.

Therefore a future high-fidelity route model should permit

\[
t=t(s)
\]

rather than assuming every route sample uses one global epoch.

This manual does not yet promote such a mapping to runtime authority because the required time parameterization differs by transit family.

That remains a deliberate authority boundary.

---

## 12. SCALING BEHAVIOR

The farther the propagation epoch is from the source epoch, the more aggressively neglected dynamics can dominate.

For linear propagation, position remainder grows quadratically:

\[
\delta r\propto \Delta t^2.
\]

With a white-acceleration process model, position variance grows cubically:

\[
\sigma_r^2\propto T^3.
\]

Thus old ephemerides do not merely become linearly worse.

A route network spanning large temporal planning horizons needs:

- regular astrometric updates;
- reference-frame maintenance;
- clock synchronization;
- source-state covariance publication;
- orbit/dynamics model upgrades for high-curvature systems;
- recertification triggers when propagated uncertainty exceeds family-specific tolerance.

---

## 13. NAVIGATION INFRASTRUCTURE MODEL

A mature transit civilization requires more than drive machinery.

```text
source survey observatories
        ↓
reference-frame realization
        ↓
time standard / clock network
        ↓
state-vector estimation
        ↓
covariance publication
        ↓
ephemeris propagation
        ↓
physical route model
        ↓
family-specific certification
        ↓
vehicle navigation computer
```

Failure at an early stage can correctly produce an `UNRESOLVED` route even when the ship itself is mechanically perfect.

### Infrastructure signatures

A civilization maintaining this chain may reveal itself through:

- precision timing broadcasts;
- repeated gravimetric calibration traffic;
- astrometric beacon constellations;
- ephemeris update bursts;
- route-closure notices after mass-map revisions;
- distributed observatory baselines;
- calibration maneuvers around known reference bodies.

These are setting-useful consequences of the engineering model rather than arbitrary flavor.

---

## 14. TECHNOLOGY-BASIS EMBODIMENTS

The mathematics does not require every civilization to build the same machine.

### Terrestrial electromechanical / industrial

Likely embodiments include clock-disciplined inertial references, optical/radio astrometry, numerical covariance matrices, fault-isolated navigation processors, and independent abort buses.

### Aquatic electrochemical / hydraulic

The same state estimate may be represented through pressure-current topology, conductive-fluid reference channels, electrochemical timing standards, and hydraulic isolation of emergency navigation authority.

### Cryogenic ammonia / halocarbon

Reference stability may be tied to cryogenic resonators and ultra-low-noise sensor assemblies. Thermal drift becomes a major metrology-maintenance concern.

### Gas-giant fluidic / electrostatic

Ephemeris state may be represented as pressure-layer geometry, electrostatic field topology, acoustic timing, and distributed fluidic computation rather than a conventional screen-and-bus architecture.

### Biological / symbiotic

A biological navigation system may encode covariance as confidence/salience fields or distributed neural uncertainty rather than human-readable matrices. Translation must preserve the native state rather than replace it.

### Mineral piezoelectric / photonic

Timing and state propagation may be embodied through resonant crystal networks, photonic interference, phase-locked lattice references, and alignment-sensitive memory.

### Field-mediated / adaptive

The reference-frame realization itself may be distributed through adaptive field structures. Such machinery still has to expose enough provenance to show which measured source state was propagated to which epoch.

The rule remains:

\[
\boxed{\text{same mathematics}\neq\text{same machinery embodiment}}.
\]

---

## 15. RACE-SPECIFIC CANON SAFEGUARDS

A species' anatomy or known interface style does not automatically assign a source-propagation algorithm.

For the Zwlei Mur'rek, wet machinery, current-field controls, sensor choirs, and fluidic service requirements can inform embodiment when established by race-specific authority. They do not establish that every Mur'rek navigator uses this exact covariance model.

For the Ar'nock, biological computation and vibration-based interfaces can inform hypothetical implementation. They do not establish an FTL family or specific ephemeris tradition unless a higher-authority source says so.

Named-race authority outranks generic embodiment.

---

## 16. FAILURE MODEL

### 16.1 STALE EPOCH

**Condition:** the state vector is used far enough from its source epoch that the approximation error exceeds tolerance.

**Result:** `OUTSIDE_MODEL_VALIDITY`.

### 16.2 FALSE STATIC SOURCE

**Condition:** missing velocity is silently replaced by zero.

**Result:** invalid geometry; certification must be refused.

### 16.3 COVARIANCE ERASURE

**Condition:** missing covariance is treated as perfect certainty.

**Result:** falsely narrow route solution.

### 16.4 PROCESS-NOISE ERASURE

**Condition:** deterministic covariance transport is presented as proof that no unmodeled dynamics exist.

**Result:** understated future uncertainty.

### 16.5 FRAME CONFLICT

**Condition:** states expressed in incompatible frames are mixed without a documented transformation.

**Result:** `CONFLICT` or `UNRESOLVED` depending on evidence.

### 16.6 BACKWARD-NOISE FABRICATION

**Condition:** a forward stochastic process-noise formula is naively evaluated with negative time.

**Result:** invalid covariance treatment.

### 16.7 SOURCE-CORRELATION LOSS

**Condition:** correlated barycentric/source errors are treated as independent.

**Result:** relative-geometry covariance can be materially wrong.

---

## 17. PRACTICAL EQUIPMENT MANUAL

### EPH-01 — Source-State Intake

1. Identify the exact source record.
2. Record reference frame.
3. Record source epoch.
4. Verify position units.
5. Verify velocity units.
6. Record covariance if available.
7. Record source provenance.
8. Do not continue with an assumed zero velocity.

**Release criterion:** complete state identity and epoch, or explicit `UNRESOLVED` disposition.

### EPH-02 — Propagation-Model Selection

Use `LINEAR_KINEMATIC` only when velocity is known and neglected acceleration can be bounded or the result is explicitly allowed to remain `PARTIAL`.

Use `CONSTANT_ACCELERATION` only when the acceleration vector is explicitly supplied.

Do not infer a source acceleration from its own mass.

### EPH-03 — Remainder-Bound Audit

For linear propagation calculate

\[
e_r=\frac12a_{\max}\Delta t^2
\]

and

\[
e_v=a_{\max}|\Delta t|.
\]

Compare against navigation tolerances.

If either bound exceeds tolerance, stop and request a higher-fidelity ephemeris.

### EPH-04 — Covariance Audit

Verify the matrix is 6x6, numeric, symmetric within declared tolerance, and has nonnegative diagonal variances.

The present runtime does not certify positive semidefiniteness. High-assurance systems should perform eigenvalue or Cholesky-based PSD validation before route release.

### EPH-05 — Process-Noise Audit

If an explicit \(Q\) is supplied, retain its provenance.

If white-acceleration PSD is used, record \(q_a\), duration, and the assumption of independent equal-axis noise.

Do not apply the forward white-noise model to backward propagation.

### EPH-06 — Physical Route Handoff

Provide the propagated source packet to the existing physical route sampler.

Do not copy gravitational equations into the ephemeris subsystem.

Confirm the physical path result retains propagated source provenance.

### EPH-07 — Recertification After Ephemeris Update

Any material change to source position, velocity, covariance, mass, reference frame, or model must invalidate route certificates dependent on the previous packet.

A route certificate is evidence-dependent.

### EPH-08 — Archaeological / Alien System Recovery

When an alien ephemeris unit is recovered:

1. preserve the native record;
2. identify frame conventions before translation;
3. identify time standard;
4. identify state ordering;
5. identify units;
6. identify covariance representation;
7. identify whether uncertainty is probabilistic, bounded, modal, or qualitative;
8. only then construct a human-readable translation.

Never overwrite the native representation with the translation.

---

## 18. WORKED EXAMPLE

Suppose a source has

\[
\mathbf r_0=(1.0\times10^{11},0,0)\ {\rm m},
\]

\[
\mathbf v_0=(0,3.0\times10^4,0)\ {\rm m\,s^{-1}},
\]

and is propagated for one day:

\[
\Delta t=86400\ {\rm s}.
\]

Linear kinematics gives

\[
\Delta y=v_y\Delta t
=2.592\times10^9\ {\rm m}.
\]

If neglected acceleration is bounded by

\[
a_{\max}=6\times10^{-3}\ {\rm m\,s^{-2}},
\]

the position remainder bound is

\[
e_r
\le
\frac12(6\times10^{-3})(86400)^2
\approx2.24\times10^7\ {\rm m}.
\]

That is about 22,400 km.

So although the arithmetic propagation is trivial, whether it is **good enough** depends on the route-navigation tolerance.

If the permitted position error were 1,000 km, the linear model would be outside validity.

The correct engineering response is not to round the source coordinate and continue. It is to use a better orbital/dynamical solution.

---

## 19. EDUCATIONAL TEXT — TRANSIT ENVIRONMENT PHYSICS 570

### Course purpose

Teach navigation and transit engineers to distinguish measured state, propagated state, uncertainty, and model validity before family-specific FTL calculations are attempted.

### Module 1 — Reference Frames and Epochs

- inertial versus rotating frames;
- barycentric versus body-centered frames;
- epoch tagging;
- time-standard conversion;
- why a coordinate without epoch is incomplete.

### Module 2 — State-Space Kinematics

- Cartesian state vectors;
- state-transition matrices;
- Taylor expansion;
- linear and constant-acceleration models.

### Module 3 — Covariance

- variance and covariance units;
- correlation;
- propagation through linear transformations;
- numerical conditioning.

### Module 4 — Process Noise

- deterministic versus stochastic uncertainty;
- white-acceleration model;
- model mismatch;
- why \(Q=0\) is an assumption rather than a natural law.

### Module 5 — Approximation Validity

- Taylor remainders;
- tolerance design;
- refusal conditions;
- escalation to orbital or N-body models.

### Module 6 — Route Integration

- propagated source packets;
- physical route sampling;
- interval certification;
- first-blocker analysis.

### Module 7 — Alien Engineering

- nonhuman time standards;
- distributed/native uncertainty representation;
- translation without state destruction;
- provenance in archaeological systems.

### Module 8 — Certification

- evidence chains;
- stale ephemerides;
- recertification triggers;
- audit reconstruction.

---

## 20. EXAMINATION PROBLEMS

### Problem A

Derive \(F(\Delta t)\) for the six-state constant-velocity model and show explicitly how position-velocity covariance couples into future position variance.

### Problem B

For a source with acceleration bound \(a_{\max}\), derive the maximum \(|\Delta t|\) satisfying a position tolerance \(r_{\rm tol}\):

\[
|\Delta t|
\le
\sqrt{\frac{2r_{\rm tol}}{a_{\max}}}.
\]

Discuss why this is a model-validity horizon rather than an astrophysical constant.

### Problem C

Explain why a route built from independently propagated binary components can still have incorrect relative-position uncertainty when the components share correlated barycentric errors.

### Problem D

Explain why the same propagated source packet may be presented as a numerical covariance ellipsoid by a terrestrial system, a resonance manifold by mineral-photonic machinery, and a salience field by a biological system without changing the underlying physical evidence.

---

## 21. ADVANCED RESEARCH DIRECTIONS

### 21.1 Kepler / universal-variable propagation

A future bounded runtime can propagate two-body states using universal variables and Stumpff functions where an authoritative central-body relationship is explicitly known.

Status: **PROPOSED**.

### 21.2 N-body integration

Adaptive symplectic or high-order integrators can replace local kinematics in dynamically complex systems.

Requirements include:

- explicit component masses;
- synchronized state epoch;
- inertial reference frame;
- integration error control;
- covariance or ensemble propagation.

Status: **PROPOSED**.

### 21.3 State transition tensors / variational equations

For nonlinear dynamics

\[
\dot{\mathbf x}=f(\mathbf x,t),
\]

the state-transition matrix obeys

\[
\dot\Phi=A(t)\Phi,
\qquad
A=\frac{\partial f}{\partial x}.
\]

This supports covariance propagation through nonlinear orbital dynamics.

Status: **PROPOSED**.

### 21.4 Unscented / ensemble propagation

Strongly nonlinear or non-Gaussian source uncertainty may be better represented by sigma points or Monte Carlo ensembles than by first-order covariance alone.

Status: **PROPOSED**.

### 21.5 Relativistic ephemerides

Compact-object environments may require post-Newtonian or full relativistic propagation before the downstream curvature model itself is upgraded.

Status: **PROPOSED**.

---

## 22. PATENT-CLASS PROPOSED TECHNOLOGIES

### Temporal Provenance Capsule

Carries source state, epoch, reference frame, covariance, model, remainder bound, and every transformation applied before route use.

**Status:** PROPOSED.

### Stale-Ephemeris Refusal Interlock

Hard-blocks route release when the propagated error bound exceeds family-specific tolerances.

**Status:** PROPOSED.

### Cross-Source Covariance Loom

Maintains joint correlated source-state solutions instead of independent per-body covariance packets.

**Status:** PROPOSED.

### Multi-Fidelity Ephemeris Escalator

Automatically promotes a source from linear kinematics to two-body, N-body, post-Newtonian, or relativistic propagation when the current approximation leaves its validity domain.

**Status:** PROPOSED.

### Native-State Translation Witness

Maintains a cryptographically/verifiably linked copy of an alien native navigation state next to every translated human-readable state so the translation never silently becomes the authority.

**Status:** PROPOSED.

---

## 23. GENERATOR RULES

The generator/runtime must obey the following order:

```text
explicit source state + epoch exists?
    no → UNRESOLVED
    yes
      ↓
explicit velocity exists?
    no → UNRESOLVED
    yes
      ↓
select documented model
      ↓
propagate state
      ↓
propagate covariance / retain missing uncertainty
      ↓
calculate approximation remainder bound
      ↓
inside validity tolerance?
    no → OUTSIDE_MODEL_VALIDITY
    yes / incomplete evidence
      ↓
RESOLVED or PARTIAL
      ↓
hand packet to physical route sampler
```

The generator must never use species, manufacturer, or narrative preference to choose a physically convenient source trajectory.

---

## 24. API CONTRACT

Primary runtime:

```javascript
BlacklightExoFTLTimeDependentSourceStateRuntime
  .resolveFTLTimeDependentSourceStates(context)
```

Expected context fields include:

```javascript
{
  targetEpoch,
  referenceFrame,
  sources: [{
    sourceId,
    massKg,
    positionM,
    velocityMPerS,
    sourceEpoch,
    covariance6x6,
    physicalRadiusM,
    angularMomentumKgM2PerS,
    accelerationMPerS2,
    propagationModel,
    provenance
  }],
  neglectedAccelerationBoundMPerS2,
  neglectedJerkBoundMPerS3,
  positionToleranceM,
  velocityToleranceMPerS,
  whiteAccelerationPSD,
  processNoise6x6
}
```

Output source packets are designed to be convertible directly into the `sources` input accepted by `blacklight-exo-ftl-physical-route-path-runtime.js`.

No new gravity equation is introduced here.

---

## 25. MAINTENANCE AND RECERTIFICATION

An ephemeris system has maintenance requirements just as surely as a drive does.

Maintenance events include:

- clock replacement or recalibration;
- reference-frame solution update;
- astrometric sensor alignment;
- beacon-network geometry change;
- mass estimate revision;
- covariance-model revision;
- software/model version change;
- newly detected companion mass;
- altered binary orbital solution.

A successful repair does not preserve certification automatically.

\[
\boxed{\text{repaired}\neq\text{recertified}}
\]

and

\[
\boxed{\text{updated ephemeris}\Rightarrow\text{dependent route recertification}}
\]

when the change is material to a route's physical environment.

---

## 26. FINAL ENGINEERING RULE

The Black Light transit corpus should never need to claim that invented FTL physics makes ordinary navigation mathematics irrelevant.

The opposite is more believable and more useful:

**the more extreme the transit mechanism, the less tolerance there is for lying to it about where the universe actually is.**
