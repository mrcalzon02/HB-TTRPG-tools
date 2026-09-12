# Black Light FTL Time-Aware Route Path Integration Manual

Status: DERIVED engineering integration manual with explicitly labeled PROPOSED extensions.

Primary authority remains `BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md`. Named race, vessel, organization, manufacturer, installation, and technology sources outrank this manual within their documented scope.

Design-intent source: **The different lightspeed methods**, document `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`, revision `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`.

---

## 1. Purpose

Black Light route physics already distinguishes ordinary gravitational evidence from fictional transit-family response. The remaining continuity problem is time.

A stellar catalog position is a state estimate at an epoch, not a permanent fixture in space. A physical route sampled against a frozen historical source geometry is therefore only as valid as the assumption that source motion is negligible over the relevant epoch separation.

This integration layer establishes the first executable bridge:

```text
source state at t0
   |
   | ephemeris propagation + covariance transport
   v
source state at route epoch tr
   |
   | ordinary gravity / curvature
   v
physical route samples
   |
   | family normalization + certification downstream
   v
route safety
```

The implemented model is intentionally bounded. It propagates authoritative source states to one route epoch and then samples the physical corridor against that propagated snapshot.

It does **not** yet claim a fully time-resolved encounter model in which every route fraction sees the gravitational system at a different time.

That distinction is an authority requirement, not a limitation to hide.

---

## 2. Core invariant

The governing identity is:

\[
\boxed{\text{catalog position at }t_0\neq\text{source position at }t_r}
\]

and therefore:

\[
\boxed{\text{frozen catalog gravity}\neq\text{time-aware route gravity}}
\]

unless the epoch difference is explicitly demonstrated to be negligible at the required navigation tolerance.

Missing source motion is never interpreted as stationary motion:

\[
\boxed{\mathbf v\ \text{missing}\neq\mathbf 0}
\]

Missing covariance is never interpreted as certainty:

\[
\boxed{\Sigma\ \text{missing}\neq 0}
\]

---

## 3. Authority and provenance chain

The present chain is:

```text
named-source canon
      >
consolidated propulsion/transit authority
      >
EXO published-first source authority
      >
time-dependent source-state registry/runtime
      >
time-aware route-path registry/runtime
      >
physical route-path registry/runtime
      >
segment/family certification
      >
presentation
```

The time-aware runtime is an integration authority for behavior. It does not promote a derived source state into new historical canon.

A propagated state is therefore recorded as engineering evidence at a target epoch, with the original source epoch and propagation model retained.

---

## 4. State model

For each gravitational source define the six-state vector

\[
\mathbf z=
\begin{bmatrix}
\mathbf r\\
\mathbf v
\end{bmatrix}.
\]

For linear kinematics:

\[
\mathbf r(t)=\mathbf r_0+\mathbf v_0\Delta t,
\]

\[
\mathbf v(t)=\mathbf v_0.
\]

The transition matrix is

\[
F(\Delta t)=
\begin{bmatrix}
I&\Delta t I\\
0&I
\end{bmatrix}.
\]

Covariance propagates as

\[
\Sigma(t)=F\Sigma_0F^T+Q.
\]

The process-noise term \(Q\) represents uncertainty introduced by unmodeled dynamics. It must not be silently omitted and then described as physical certainty.

Where a continuous white-acceleration model is explicitly selected, the one-axis process-noise block is

\[
Q_1=q_a
\begin{bmatrix}
T^3/3&T^2/2\\
T^2/2&T
\end{bmatrix}.
\]

The units of \(q_a\) are \(\mathrm{m^2\,s^{-3}}\).

---

## 5. Constant-acceleration model

When an acceleration vector is independently established, the runtime may use

\[
\mathbf r(t)=\mathbf r_0+\mathbf v_0\Delta t+\frac12\mathbf a\Delta t^2,
\]

\[
\mathbf v(t)=\mathbf v_0+\mathbf a\Delta t.
\]

Mass alone does not determine acceleration:

\[
\boxed{M\not\Rightarrow\mathbf a}.
\]

A valid acceleration solution requires the dynamical environment or an authoritative measured/modelled acceleration vector.

---

## 6. Approximation-validity bounds

For linear propagation with neglected acceleration bounded by \(a_{\max}\):

\[
\|\delta\mathbf r\|\le\frac12a_{\max}\Delta t^2,
\]

\[
\|\delta\mathbf v\|\le a_{\max}|\Delta t|.
\]

For constant-acceleration propagation with neglected jerk bounded by \(j_{\max}\):

\[
\|\delta\mathbf r\|\le\frac16j_{\max}|\Delta t|^3,
\]

\[
\|\delta\mathbf v\|\le\frac12j_{\max}\Delta t^2.
\]

When these bounds exceed the declared route-navigation tolerance, the correct state is

`OUTSIDE_MODEL_VALIDITY`

rather than a larger finite danger score.

---

## 7. Implemented encounter model: route-epoch snapshot

The current executable integration uses one route epoch \(t_r\).

Every source is first propagated to \(t_r\):

\[
\mathbf z_i(t_0)\rightarrow\mathbf z_i(t_r).
\]

The route is then sampled against that common source geometry.

For departure point \(\mathbf r_A\) and arrival point \(\mathbf r_B\):

\[
\mathbf r_{path}(s)=\mathbf r_A+s(\mathbf r_B-\mathbf r_A),
\qquad 0<s<1.
\]

At each sample the ordinary weak-field environment remains:

\[
\Phi(\mathbf r)=-\sum_i\frac{GM_i}{|\mathbf r-\mathbf r_i|},
\]

\[
\mathbf g(\mathbf r)=-\sum_iGM_i\frac{\mathbf r-\mathbf r_i}{|\mathbf r-\mathbf r_i|^3},
\]

\[
T_{jk}=\sum_i\frac{GM_i}{r_i^3}(3n_jn_k-\delta_{jk}).
\]

No new fictional transit physics is introduced here. This layer changes only the ordinary gravitational source geometry used downstream.

---

## 8. Why snapshot propagation matters

Suppose a source has transverse speed \(v=30\,\mathrm{km\,s^{-1}}\).

Over one year:

\[
\Delta r=v\Delta t
\approx 3.0\times10^4\times3.156\times10^7
\approx9.47\times10^{11}\ \mathrm m.
\]

That is roughly 6.3 AU.

A catalog position can therefore become materially wrong for a precision route calculation even though the star remains visually "in the same place" on an interstellar-scale map.

The relevant question is not whether the motion looks small relative to light-years. It is whether the resulting gravitational-field error is small relative to the route solver's required tolerance.

---

## 9. Error sensitivity

For one point-mass source,

\[
|\mathbf g|=\frac{GM}{r^2}.
\]

A small radial position error \(\delta r\) gives approximately

\[
\frac{|\delta g|}{g}\approx2\frac{|\delta r|}{r}.
\]

The characteristic tidal scale behaves as

\[
T\sim\frac{GM}{r^3},
\]

so approximately

\[
\frac{|\delta T|}{T}\approx3\frac{|\delta r|}{r}.
\]

Tidal predictions are therefore more sensitive to source-position error than simple acceleration magnitude.

This is one reason the gravitational-plane family, whose fictional response is strongly associated with shear structure, deserves tighter ephemeris and covariance discipline than a route model based only on scalar potential depth.

---

## 10. Covariance geometry

A source's uncertainty is not merely a radius around a point.

The position sub-block of the propagated covariance

\[
\Sigma_r
\]

defines an uncertainty ellipsoid.

For eigenpairs

\[
\Sigma_r\mathbf e_i=\lambda_i\mathbf e_i,
\]

the one-sigma principal semiaxes are

\[
a_i=\sqrt{\lambda_i}.
\]

A route passing along the long axis of an uncertainty ellipsoid may have a substantially different navigation risk than one passing orthogonally to it, even when both have the same scalar trace

\[
\operatorname{tr}(\Sigma_r).
\]

Future route solvers should therefore preserve the covariance matrix rather than collapse it prematurely into one scalar uncertainty number.

---

## 11. Correlated sources

Two sources fitted against the same astrometric reference frame may share correlated errors.

A joint state can require

\[
\Sigma_{AB}=
\begin{bmatrix}
\Sigma_A&C_{AB}\\
C_{AB}^T&\Sigma_B
\end{bmatrix}.
\]

Independent per-source packets do not prove

\[
C_{AB}=0.
\]

This matters particularly for binaries, barycentric decompositions, cluster solutions, and navigation networks sharing the same clock/reference-frame ancestry.

---

## 12. Future encounter model: continuous projected progress

**Status: PROPOSED. Not implemented by the current runtime.**

For a transit family whose route/control representation has a defensible projected progress rate \(v_p\), a first approximation is

\[
t(s)=t_0+\frac{sL}{v_p}.
\]

The physical route environment would then become

\[
\Phi(s)=\Phi(\mathbf r_{path}(s),t(s)),
\]

\[
\mathbf g(s)=\mathbf g(\mathbf r_{path}(s),t(s)),
\]

\[
T(s)=T(\mathbf r_{path}(s),t(s)).
\]

The source states must be propagated independently to each encounter epoch \(t(s)\).

This is a route/control representation. It is not a declaration that real-world local motion travels faster than light.

---

## 13. Future encounter model: PRECOMMIT systems

**Status: PROPOSED integration contract.**

Fold Jump, Q-Lattice Phase Translation, and Phase Displacement are already treated as PRECOMMIT systems in route certification unless higher authority supplies a meaningful continuous-progress model.

For these systems the correct time structure is not

\[
t(s)=t_0+sL/v_{FTL}
\]

with an invented \(v_{FTL}\).

Instead use physically meaningful epochs such as:

```text
commitment epoch
      |
      | predicted source evolution
      v
emergence/reconciliation epoch
      |
      v
endpoint physical environment
```

The navigation problem is therefore one of prediction horizon and endpoint state, not local traversal velocity.

---

## 14. Family consequences

### 14.1 Metric Compression

A continuous projected-progress representation is plausible as an engineering coordinate if higher authority permits it. Time-evolving source geometry primarily modifies field distortion, endpoint prediction, and recovery corridors.

### 14.2 Gravitational Plane / Shear Transit

Time dependence is especially important because source motion can rotate tidal eigendirections and move saddle structures.

For tidal tensor eigenpairs

\[
T\hat{\mathbf e}_k=\lambda_k\hat{\mathbf e}_k,
\]

future fork prediction should track both

\[
\dot\lambda_k
\]

and

\[
\dot{\hat{\mathbf e}}_k.
\]

The exact fictional shear-lane response remains PROPOSED.

### 14.3 Hyperspatial Slipstream

Moving physical sources alter ordinary gravitational entrance/exit constraints and the uncertainty of predicted interface geometry. They do not automatically define the slipstream's exotic boundary state.

### 14.4 Q-Lattice Phase Translation

Treat as PRECOMMIT unless a higher source establishes a continuous local progress representation. Source evolution matters primarily across prediction and emergence epochs.

### 14.5 N-Manifold Transit

A continuous path parameter may be useful for control representation, but it must not be confused with ordinary-space local velocity. Physical source motion should be evaluated only through an explicitly defined mapping between manifold progress and external epoch.

### 14.6 Fold Jump

Use commitment/emergence prediction. Do not fabricate a route-local speed merely to make the mathematics resemble a cruise drive.

### 14.7 Wormhole / Gate Transit

Source evolution matters for mouth geometry, approach/departure conditions, stationkeeping, and tidal environment at each mouth. The transit interior remains operator-specific.

### 14.8 Phase Displacement

Treat as PRECOMMIT unless explicit authority establishes otherwise. Reconciliation epoch and endpoint source state are the critical physical inputs.

### 14.9 Inertial Torch

Ordinary continuous dynamics apply. Time-dependent source gravity can be integrated directly with the vessel's trajectory rather than treated as exotic FTL boundary physics.

---

## 15. Technology-specific machinery embodiments

The mathematics can be shared without making every civilization build the same instrument.

### Terrestrial electromechanical

Typical embodiment: redundant timing buses, numerical covariance displays, star-tracker/gravimeter fusion, field computers, hardwired abort channels, modular replaceable navigation processors.

### Aquatic electrochemical / hydraulic

Typical embodiment: conductive-fluid reference cavities, pressure-balanced inertial assemblies, ionic timing networks, flow-topology displays, immersion-maintained sensor arrays.

### Cryogenic ammonia / halocarbon

Typical embodiment: low-temperature resonant clocks, cryogenic dielectric metrology, thermal-isolated covariance processors, sealed service modules.

### Gas-giant fluidic / electrostatic

Typical embodiment: pressure-layer reference systems, electrostatic field cages, distributed acoustic metrology, buoyancy-stabilized timing nodes.

### Biological / symbiotic

Typical embodiment: distributed sensory organs, neural-state prediction networks, metabolic timing references, regenerative but recertification-dependent sensor tissues.

### Mineral piezoelectric / photonic

Typical embodiment: crystal-axis inertial references, resonant photonic clocks, piezoelectric shear sensors, phase-stable optical computation.

### Field-mediated / adaptive

Typical embodiment: self-configuring reference lattices, distributed field-state observers, adaptive clock meshes, software-defined sensor fusion with explicit provenance locks.

None of these embodiments changes the underlying propagated source state.

---

## 16. Scaling behavior

A larger vessel experiences larger differential acceleration across its span:

\[
\Delta a\sim\|T\|L_v.
\]

A rough structural stress scale behaves as

\[
\sigma_{tidal}\sim\rho\|T\|L_v^2.
\]

Time-aware source geometry therefore matters disproportionately to very large vessels near rapidly changing tidal structures.

Distributed control remains constrained by

\[
\Pi_c=\frac{L_c}{v_c\tau_r}.
\]

When \(\Pi_c\gtrsim1\), control propagation across the installation is comparable to or slower than the required response time. Regional sensing and sectional abort authority become engineering necessities.

---

## 17. Power and recovery implications

Navigation accuracy does not replace recovery reserve.

A useful protected-power margin remains

\[
M_P=\frac{P_{available}-P_{nominal}-P_{recovery,reserved}}{\max(P_{nominal},\epsilon)}.
\]

A time-aware route can become less certain without the drive itself consuming more nominal power. However, greater uncertainty may require earlier abort decisions, longer protected recovery windows, or larger maneuver reserves.

The reserve must remain independently protected rather than spent to improve advertised cruise performance.

---

## 18. Signature consequences

Time-aware navigation infrastructure can create signatures independent of propulsion output:

- synchronized timing transmissions;
- gravimetric survey emissions;
- calibration maneuvers;
- active ranging;
- reference-beacon interrogation;
- high-rate navigation computation heat;
- distributed sensor synchronization traffic.

A ship attempting to reduce propulsion signature may therefore remain detectable through the infrastructure required to maintain a high-confidence dynamic route solution.

---

## 19. Failure taxonomy

### EPH-STALE

Source epoch too old for the declared propagation tolerance.

### EPH-NO-VEL

No authoritative velocity is available. Zero velocity is prohibited.

### EPH-COV-ABSENT

Source can be numerically propagated but covariance ancestry is incomplete. Result remains PARTIAL.

### EPH-MODEL-OOD

Propagation remainder exceeds tolerance. Result is OUTSIDE_MODEL_VALIDITY.

### EPH-FRAME-CONFLICT

Source states do not share a compatible reference frame and no authoritative transform is available.

### EPH-CORRELATION-LOSS

Known joint covariance was split into independent source packets, destroying cross-source error structure.

### ROUTE-SNAPSHOT-OVERCLAIM

A route-epoch snapshot is presented as though every route interval had been evaluated at its actual encounter epoch.

### PRECOMMIT-VELOCITY-FABRICATION

A nonlocal transit family is assigned an arbitrary local superluminal speed solely to force it into continuous-progress mathematics.

---

## 20. Practical equipment procedures

### TAR-01 — Source-State Intake

1. Record source identity and named authority.
2. Record reference frame.
3. Record source epoch.
4. Record position and velocity with units.
5. Record covariance and its ancestry.
6. Record physical radius and angular momentum only when established.
7. Reject any workflow that silently substitutes zero for missing motion or uncertainty.

### TAR-02 — Epoch Selection

1. Identify the route planning epoch.
2. Distinguish planning epoch, commitment epoch, encounter epoch, and emergence epoch.
3. Select the epoch appropriate to the implemented encounter model.
4. Record the choice in the route packet.

### TAR-03 — Propagation Model Selection

1. Use linear kinematics only with an explicit neglected-acceleration bound when certification depends on it.
2. Use constant acceleration only when acceleration is independently established.
3. Record the model ID and validity bounds.
4. Escalate to higher-fidelity dynamics when remainder bounds exceed tolerance.

### TAR-04 — Covariance Audit

1. Validate matrix dimensions and symmetry.
2. Verify units and variable ordering.
3. Identify process-noise assumptions.
4. Preserve cross-source covariance where known.
5. Do not convert missing covariance into zeros.

### TAR-05 — Route-Snapshot Generation

1. Propagate every required source to the declared route epoch.
2. Refuse the route if any mandatory source is OUTSIDE_MODEL_VALIDITY.
3. Pass propagated positions and masses to the physical route sampler.
4. Preserve the source-state packet beside the resulting path packet.

### TAR-06 — Gravity/Tidal Audit

1. Inspect potential, acceleration, and tidal metrics independently.
2. Confirm units before normalization.
3. Inspect adaptive sampling around rapidly changing intervals.
4. Record sampled extrema as sampled extrema, not analytic proofs.

### TAR-07 — Machinery Recertification

1. Recompute source states after a material ephemeris update.
2. Recompute the physical path.
3. Re-run family certification.
4. Re-run sensor/recovery/lookahead gates.
5. Archive the superseded certificate with provenance.

### TAR-08 — Alien Navigation Recovery

1. Identify native state representation before translating displays.
2. Preserve source epoch and frame even if native notation differs.
3. Determine whether uncertainty is covariance-like, interval-like, ensemble-like, biological confidence, or another representation.
4. Translate into a human-readable model without discarding native evidence.
5. Mark irreducible translation uncertainty explicitly.

---

## 21. Operator chart

| Condition | Allowed interpretation | Forbidden interpretation |
|---|---|---|
| Position + velocity + epoch + valid covariance | propagated route source | permanent canonical position |
| Position + velocity, no covariance | PARTIAL propagated evidence | perfect certainty |
| Position only | static catalog evidence | stationary star |
| Remainder exceeds tolerance | OUTSIDE_MODEL_VALIDITY | high-but-usable risk score |
| PRECOMMIT family | commitment/emergence timing | invented local FTL speed |
| Route-epoch snapshot | common-epoch corridor model | fully time-resolved trajectory |

---

## 22. Educational text: Transit Environment Physics 580

### Course purpose

Teach engineers to distinguish static astronomical catalogs from operational navigation state and to propagate source evidence without corrupting uncertainty or fictional transit-family canon.

### Module 1 — Reference Frames

Coordinate origin, orientation, epoch, inertial versus rotating frames, and transform provenance.

### Module 2 — State Vectors

Position, velocity, acceleration, state transition matrices, and unit discipline.

### Module 3 — Covariance

Covariance geometry, state uncertainty, cross-correlation, process noise, and measurement ancestry.

### Module 4 — Approximation Theory

Taylor remainder bounds, model validity, tolerance selection, and why numerical output does not guarantee physical validity.

### Module 5 — Route Gravity

Potential, acceleration, tidal tensors, compactness, curvature diagnostics, and physical route sampling.

### Module 6 — Transit Family Separation

Ordinary physics as input; fictional family response as downstream operator model.

### Module 7 — Time Models

Route-epoch snapshots, continuous encounter maps, and PRECOMMIT endpoint prediction.

### Module 8 — Certification

Conjunctive route safety, first blocker, lookahead, recovery, provenance, and recertification.

---

## 23. Worked exercise

A source has position uncertainty \(\sigma_r=1.0\times10^7\,\mathrm m\), velocity uncertainty \(\sigma_v=2\,\mathrm{m\,s^{-1}}\), and no correlation for a one-dimensional teaching example.

Under deterministic linear transport for \(T=30\) days,

\[
T=2.592\times10^6\ \mathrm s.
\]

Ignoring process noise for the exercise only,

\[
\sigma_r^2(T)=\sigma_r^2(0)+T^2\sigma_v^2.
\]

Thus

\[
\sigma_r(T)\approx\sqrt{(10^7)^2+(2.592\times10^6)^2(2)^2}
\approx1.126\times10^7\ \mathrm m.
\]

The position uncertainty grows by roughly 12.6% even though the central trajectory is a trivial straight line.

If realistic process noise is nonzero, the uncertainty grows further.

The engineering lesson is simple: a clean propagated point is not the same thing as a well-constrained propagated state.

---

## 24. Research directions

### 24.1 Universal-variable two-body propagation

**Status: PROPOSED.** Replace bounded kinematics with analytically stable Kepler propagation where a dominant central body is authoritative.

### 24.2 N-body numerical integration

**Status: PROPOSED.** Integrate coupled source dynamics when barycentric structure materially affects route gravity.

### 24.3 Variational equations

**Status: PROPOSED.** Propagate the state-transition matrix alongside N-body dynamics for physically consistent covariance transport.

### 24.4 Family-dependent encounter epochs

**Status: PROPOSED.** Evaluate each route sample at a family-appropriate encounter epoch rather than one common route epoch.

### 24.5 Tidal-eigensystem prediction

**Status: PROPOSED.** Track \(\lambda_i(t)\) and \(\hat{\mathbf e}_i(t)\) for gravitational-plane fork prediction.

### 24.6 Relativistic source dynamics

**Status: PROPOSED.** Escalate from Newtonian/post-Newtonian approximations only where compactness, velocity, or required precision justifies the complexity.

---

## 25. Proposed patent-class developments

### Dynamic Ephemeris Provenance Capsule

Embeds source epoch, model, covariance ancestry, remainder bounds, and target epoch directly into a route certificate.

### Model-Domain Refusal Interlock

Prevents an FTL route solver from converting an invalid source-propagation model into an apparently finite safety score.

### Correlated Source-State Lattice

Preserves joint covariance across binaries, clusters, and common reference-frame solutions.

### PRECOMMIT Epoch Fence

Prevents nonlocal families from accepting route solutions whose emergence environment has not been propagated to the predicted arrival epoch.

### Tidal Eigenfuture Predictor

Propagates source geometry and estimates future tidal eigenvalue/eigendirection evolution for shear-sensitive transit systems.

All five remain **PROPOSED** until promoted by higher authority.

---

## 26. Generator and API contract

The executable entrypoint is:

`BlacklightExoFTLTimeAwareRoutePathRuntime.resolveFTLTimeAwareRoutePath(context)`

Required high-value inputs are:

```text
from
to
routeEpoch
sourceStates[]
referenceFrame
sourcePropagation
```

The runtime delegates source evolution to:

`BlacklightExoFTLTimeDependentSourceStateRuntime`

and physical corridor sampling to:

`BlacklightExoFTLPhysicalRoutePathRuntime`.

The returned packet contains both the complete source-state propagation packet and the complete physical path packet. Neither is flattened into the other.

The result therefore preserves:

```text
source evidence
  + propagation evidence
  + physical route evidence
  + warnings
  + provenance
  + canon safeguards
```

rather than producing a single untraceable safety number.

---

## 27. Canon safeguards

1. Physically based source propagation does not prove FTL exists.
2. Physically based gravity does not determine fictional family-boundary hazards.
3. A simulation-selected family does not establish a race's canonical technology.
4. Named-source canon outranks generic machinery embodiment.
5. Derived source positions at a target epoch are engineering products, not new historical canon.
6. Missing velocity, covariance, epoch, acceleration, or cross-correlation remain missing.
7. Invalid approximations require model escalation, not numerical coercion.
8. PRECOMMIT families must not receive fabricated continuous superluminal speeds.
9. A route-epoch snapshot must remain labeled as a snapshot.
10. All PROPOSED extensions remain subordinate until explicitly promoted.

---

## 28. Next integration target

The next dependency-valid extension is a **family-dependent encounter-time mapper**.

For families with a defensible continuous projected-progress representation, it should compute

\[
t_i=t_0+\Delta t(s_i)
\]

and propagate gravitational sources independently to every \(t_i\).

For PRECOMMIT systems it should instead produce commitment, predicted emergence, and recovery epochs without inventing a local path velocity.

Only after that timing model is explicit should moving-source geometry be evaluated per interval rather than as one route-epoch snapshot.
