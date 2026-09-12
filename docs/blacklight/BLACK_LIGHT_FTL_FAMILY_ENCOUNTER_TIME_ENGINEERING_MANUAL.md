# Black Light FTL Family Encounter-Time Engineering Manual

**Authority class:** DERIVED engineering integration.  
**Primary authority:** `BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md`.  
**Design-intent source:** *The different lightspeed methods*.  
**Machine authority:** `data/exo-vessel/ftl-family-encounter-time-registry.json`.  
**Executable authority:** `blacklight-exo-ftl-family-encounter-time-runtime.js`.

---

## 1. Purpose

A route does not exist in a frozen universe.

Stars move. Binary components move. Planetary masses move. Survey solutions age. Covariance grows. A route that crosses a gravitational saddle does not encounter the same saddle merely because the endpoints have not changed on a sector map.

The preceding Black Light route work established three important layers:

1. physical source-state propagation from an authoritative source epoch to a target epoch;
2. physical gravitational/curvature evaluation at a declared field point;
3. path and interval certification that refuses to average a dangerous interval away.

This volume closes the next gap: **which epoch belongs to which physical route state for each transit family?**

The answer is not universal.

```text
                    AUTHORITATIVE SOURCE STATES
                       r0, v0, Sigma0, t0
                               |
                               v
                    FAMILY ENCOUNTER MODEL
                +--------------+--------------+
                |              |              |
                v              v              v
          CONTINUOUS       PRECOMMIT       ANCHORED
          t = t(s)        endpoints only   portal mouths
                |              |              |
                +--------------+--------------+
                               |
                               v
                  PROPAGATE SOURCES TO t_i
                               |
                               v
                   PHYSICAL ENVIRONMENT AT i
                Phi, g, T, curvature, validity
                               |
                               v
                     FAMILY CERTIFICATION
```

The presentation is family-specific. The underlying ordinary gravity remains ordinary gravity.

---

# Part I — Authority and physical boundaries

## 2. What this model does

The encounter-time model determines the epoch at which the gravitational source-state authority must be evaluated for a route location or family commitment state.

It does **not** prove any FTL mechanism physically realizable.

It does **not** derive a civilization's transit family from species identity.

It does **not** convert a procedural family selection into historical canon.

It does **not** permit fictional boundary state to be inferred from ordinary gravity.

The authority chain is:

```text
named race / vessel / installation authority
                 |
                 v
consolidated propulsion/transit authority
                 |
                 v
family definition and live operator behavior
                 |
                 v
source-state / gravity authorities
                 |
                 v
family encounter-time integration
                 |
                 v
family interval certification
```

## 3. Fundamental invariant

For a moving source \(i\), the physical environment is a function of both position and epoch:

\[
\Phi=\Phi(\mathbf x,t),
\qquad
\mathbf g=\mathbf g(\mathbf x,t),
\qquad
T=T(\mathbf x,t).
\]

Therefore:

\[
\boxed{\text{route fraction }s\text{ alone is insufficient}}
\]

unless the route model establishes the epoch corresponding to that fraction.

---

# Part II — Source-state mathematics

## 4. State vector

For the present bounded kinematic layer:

\[
\mathbf z=
\begin{bmatrix}
\mathbf r\\
\mathbf v
\end{bmatrix}.
\]

Linear propagation is:

\[
\mathbf r(t)=\mathbf r_0+\mathbf v_0\Delta t,
\]

\[
\mathbf v(t)=\mathbf v_0.
\]

For explicitly established constant acceleration:

\[
\mathbf r(t)=\mathbf r_0+\mathbf v_0\Delta t+
\frac12\mathbf a\Delta t^2,
\]

\[
\mathbf v(t)=\mathbf v_0+\mathbf a\Delta t.
\]

The invariant remains:

\[
\boxed{M\not\Rightarrow\mathbf a}.
\]

A source mass does not determine its acceleration without the dynamical system acting on it.

## 5. Covariance propagation

For the linear state model:

\[
F(\Delta t)=
\begin{bmatrix}
I&\Delta t I\\
0&I
\end{bmatrix}.
\]

Uncertainty propagates as:

\[
\Sigma(t)=F\Sigma_0F^T+Q.
\]

This separates measurement uncertainty from process/model uncertainty.

A missing covariance is not a zero covariance:

\[
\boxed{\Sigma_{\rm missing}\neq0}.
\]

## 6. Approximation refusal

For a linear trajectory with bounded neglected acceleration \(a_{\max}\):

\[
\|\delta\mathbf r\|\le\frac12a_{\max}\Delta t^2,
\]

\[
\|\delta\mathbf v\|\le a_{\max}|\Delta t|.
\]

For a constant-acceleration model with bounded neglected jerk \(j_{\max}\):

\[
\|\delta\mathbf r\|\le\frac16j_{\max}|\Delta t|^3,
\]

\[
\|\delta\mathbf v\|\le\frac12j_{\max}\Delta t^2.
\]

When a declared navigation tolerance is exceeded, the correct state is:

`OUTSIDE_MODEL_VALIDITY`

not “very dangerous but still numerically usable.”

---

# Part III — Encounter models

## 7. Continuous projected progress

The implemented continuous family set is:

| Family id | Engineering interpretation |
|---|---|
| `metric-envelope` | route/control progress through a continuously evaluated metric solution |
| `gravitic-plane` | continuous progress across gravitational-plane/shear geometry |
| `slipstream-shear` | continuous route progress along a Q-boundary/slipstream solution |
| `n-manifold` | continuous projected route progress through a higher-dimensional path representation |
| `inertial-torch` | ordinary causal physical travel |

Let the ordinary route-reference chord be:

\[
\mathbf r(s)=\mathbf r_A+s(\mathbf r_B-\mathbf r_A),
\qquad 0\le s\le1.
\]

Its reference length is:

\[
L=\|\mathbf r_B-\mathbf r_A\|.
\]

When the family/controller has a meaningful projected-progress representation \(v_p\):

\[
\boxed{t(s)=t_0+\frac{sL}{v_p}}.
\]

For true-FTL families this equation is an **encounter-time/control mapping**. It is not automatically a claim that the hull possesses a local real-space velocity \(v_p>c\).

The runtime therefore requires a `progressSemantic` alongside `projectedProgressMPerS`.

Examples of acceptable semantics include:

- `metric-route-coordinate-progress`;
- `shear-lane-solution-progress`;
- `slipstream-control-progress`;
- `manifold-projection-progress`;
- `ordinary-coordinate-speed` for the inertial torch.

## 8. Continuous sampling diagram

```text
t0                                                       t1
|---------------------------------------------------------|
A----s1------s2---------s3-----------s4--------------s5---B
     |       |          |            |               |
     v       v          v            v               v
   t(s1)   t(s2)      t(s3)        t(s4)           t(s5)
     |       |          |            |               |
 propagate every gravitational source independently to t(si)
     |       |          |            |               |
 evaluate Phi, g, T, curvature and approximation validity
```

A moving binary can therefore rotate or translate materially between early and late route samples.

## 9. PRECOMMIT endpoint model

The implemented PRECOMMIT family set is:

- `q-lattice`;
- `fold-jump`;
- `phase-displacement`.

These families do not receive a fabricated continuous corridor speed.

The physical timing model is instead:

```text
commitment epoch                           emergence epoch
       |                                         |
       v                                         v
origin environment                         destination environment
       |                                         |
       +---- prediction / operator solution -----+
```

The required physical states are:

\[
E_C=E(\mathbf r_A,t_C),
\]

\[
E_E=E(\mathbf r_B,t_E).
\]

No intermediate ordinary-space points are asserted merely to make plotting convenient.

## 10. Anchored portal model

`wormhole-gate` is treated separately.

The relevant physical environments are the entry and exit mouths at their respective encounter epochs:

\[
E_{\rm in}=E(\mathbf r_{\rm mouth,A},t_{\rm in}),
\]

\[
E_{\rm out}=E(\mathbf r_{\rm mouth,B},t_{\rm out}).
\]

The model does not assert that the vessel traverses the ordinary-space chord between the mouths.

This matters because a portal connection can join locations separated by kiloparsecs while the physical engineering burden is concentrated at the mouth structures.

---

# Part IV — Ordinary gravitational environment

## 11. Weak-field potential

At sample position \(\mathbf x\) and encounter epoch \(t_i\):

\[
\Phi(\mathbf x,t_i)=
-\sum_a\frac{GM_a}{|\mathbf x-\mathbf r_a(t_i)|}.
\]

Potential reference choice must remain explicit when converting this quantity into an engineering normalization.

## 12. Acceleration

\[
\mathbf g(\mathbf x,t_i)=
-\sum_a GM_a
\frac{\mathbf x-\mathbf r_a(t_i)}
{|\mathbf x-\mathbf r_a(t_i)|^3}.
\]

This is coordinate gravitational acceleration in the weak-field model. It is not automatically the proper acceleration measured by a freely falling vessel.

## 13. Tidal tensor

For point-source weak-field components:

\[
T_{jk}(\mathbf x,t_i)=
\sum_a\frac{GM_a}{r_a^3}
\left(3n_jn_k-\delta_{jk}\right).
\]

Tidal geometry is crucial to the gravitational-plane family because cancellation of net acceleration can coexist with strong differential structure.

Thus:

\[
|\mathbf g|\approx0
\]

does not imply

\[
\|T\|\approx0.
\]

## 14. Ephemeris sensitivity

For a single source:

\[
g=\frac{GM}{r^2}.
\]

A small radial error produces approximately:

\[
\frac{|\delta g|}{g}\approx2\frac{|\delta r|}{r}.
\]

Tidal scale behaves as:

\[
T\sim\frac{GM}{r^3},
\]

so:

\[
\frac{|\delta T|}{T}\approx3\frac{|\delta r|}{r}.
\]

Tidal/shear route inference is therefore more sensitive to position error than scalar acceleration.

---

# Part V — Relativistic boundary of the model

## 15. This is not a full retarded-field solution

The current implementation propagates source state to a declared coordinate epoch and evaluates the existing weak-field environment model there.

It does not solve the Einstein field equations for a moving multi-body system.

It does not perform a post-Minkowskian retarded-field calculation.

It does not model gravitational radiation reaction.

It does not claim exact strong-field binary dynamics.

For source speeds approaching relativistic values, compact-object close passes, or precision requirements outside the weak-field regime, the correct engineering response is higher-fidelity dynamics or `OUTSIDE_MODEL_VALIDITY`.

A useful warning parameter remains:

\[
\beta=\frac{|\mathbf v|}{c}.
\]

Large \(\beta\) is not a scalar “danger score”; it is evidence that the slow-source approximation may fail.

---

# Part VI — Family-specific engineering consequences

## 16. Metric compression envelope

A continuous metric controller can use encounter-time source geometry to forecast changing gravitational burden and modify field-shaping commands before reaching the affected interval.

Machinery implications:

- synchronized gravimetry;
- high-order field-shape control;
- covariance-aware prediction buffers;
- independent emergency envelope-collapse channels;
- sectional field authority on large vessels.

A stale route epoch can bias both the predicted environmental load and the phase at which corrective shaping is applied.

## 17. Gravitational-plane skimmer

This family benefits most visibly from encounter-time tidal geometry.

The physically based precursor to a shear fork is not a literal railway junction. It is a changing eigensystem of the tidal tensor:

\[
T\hat e_k=\lambda_k\hat e_k.
\]

The future route solver should track:

\[
\lambda_k(t),\quad \dot\lambda_k(t),\quad
\hat e_k(t),\quad \dot{\hat e}_k(t)
\]

with source-state covariance.

A moving binary can rotate the eigendirections during transit even if the route endpoints are fixed.

## 18. Hyperspatial slipstream shear

Continuous encounter timing can determine when ordinary gravitational geometry predicts the vessel will reach a changing boundary region.

Ordinary gravity does **not** establish the Q-boundary state itself.

The required certification remains conjunctive:

```text
physical environment known
        AND
slipstream boundary state observed/predicted
        AND
recovery path protected
```

## 19. Q-Lattice phase translation

Q-Lattice remains PRECOMMIT.

The physically relevant ordinary-space states are commitment and emergence environments, plus whatever separate Q-state authority the family operator requires.

Assigning a local route speed solely to create intermediate timestamps is prohibited.

## 20. N-dimensional manifold drive

A projected progress representation may exist for control and navigation even when the actual path resides partly outside ordinary three-space.

The encounter-time mapper therefore uses the declared route/control representation only.

It does not claim the ordinary-space chord is the actual manifold geodesic.

## 21. Fold jump

Fold is a boundary-value problem.

The physical machinery must know the source environment at commitment and predict the emergence environment at the expected termination epoch.

A correct endpoint prediction can require substantial ephemeris work even when the subjective transit interval is negligible.

## 22. Wormhole/gate transit

Gate infrastructure is dominated by mouth state, anchor metrology, throat control, power conditioning, and termination recovery.

The source states at both mouths may differ significantly in epoch and reference-frame ancestry.

The gate network therefore requires clock-transfer and reference-frame infrastructure as much as gross energy.

## 23. Phase displacement

Phase displacement remains PRECOMMIT because no physically meaningful intermediate ordinary-space trajectory is established by the current operator model.

The destination environment at emergence is an input to reconciliation and recovery, not merely a cosmetic map overlay.

## 24. Inertial torch

This is the control case.

For ordinary causal motion:

\[
t(s)=t_0+\frac{sL}{v}
\]

can correspond directly to physical coordinate motion under the limitations of the trajectory approximation.

At sufficiently high fractions of \(c\), proper-time and relativistic trajectory treatment become necessary.

---

# Part VII — Technology-basis embodiments

## 25. Terrestrial electromechanical

Likely embodiment:

- atomic-clock spine;
- interferometric navigation rack;
- redundant ephemeris computers;
- numerical covariance display;
- hardwired abort bus;
- replaceable gravimeter clusters.

Maintenance concentrates on clock drift, sensor calibration, connector integrity, timing-bus latency, and software/model provenance.

## 26. Aquatic electrochemical/hydraulic

The same state estimate may appear as:

- conductive-fluid reference cavities;
- ionic timing gradients;
- pressure-balanced sensor manifolds;
- hydraulic isolation logic;
- current-topology route displays.

A human technician translating this machinery must preserve the underlying covariance and epoch semantics rather than reducing the native representation to “fluid gauges.”

## 27. Cryogenic ammonia/halocarbon

Likely priorities include:

- thermally stable resonant cavities;
- cryogenic clock references;
- low-noise superconducting sensing;
- controlled phase-transition calibration standards;
- strict thermal-cycle maintenance records.

Ephemeris quality may be excellent while warm-start recovery remains poor.

## 28. Gas-giant fluidic/electrostatic

Possible embodiment:

- pressure-layer reference networks;
- electrostatic field topology;
- distributed buoyant sensor organs/modules;
- atmospheric baseline arrays;
- large-area low-density computation.

Reference-frame stability may be encoded across pressure surfaces rather than a rigid hull coordinate system.

## 29. Biological/symbiotic

A biological system can carry mathematically rigorous state estimation in non-numeric presentation forms:

- distributed sensory confidence;
- learned spatial salience;
- metabolically encoded uncertainty;
- neural consensus timing;
- tissue-level fault isolation.

Biological does not mean imprecise.

Maintenance may mean nutrition, regeneration, microbiome control, neural retraining, sensory remapping, and preservation of learned calibration states.

## 30. Mineral piezoelectric/photonic

Possible embodiment:

- crystal-axis timing standards;
- photonic delay networks;
- piezoelectric gravimetric sensing;
- resonance-space covariance representation;
- lattice defect diagnostics.

Ephemeris uncertainty may be rendered as phase broadening rather than a printed ellipse.

## 31. Field-mediated postmaterial

A mature postmaterial system may bind state estimation, sensing and control directly into the field architecture.

The engineering risk is not absence of machinery but reduced separability of failure domains.

Certification must still preserve independently auditable provenance wherever possible.

---

# Part VIII — Scaling behavior

## 32. Tidal scaling

Across a vessel span \(L_v\):

\[
\Delta a\sim\|T\|L_v.
\]

A rough structural stress scale is:

\[
\sigma_{\rm tidal}\sim\rho\|T\|L_v^2.
\]

Large vessels therefore become increasingly sensitive to route intervals whose tidal geometry changes during the time needed to cross the vessel's own control/recovery horizon.

## 33. Distributed control

The dimensionless control-latency parameter remains:

\[
\Pi_c=\frac{L_c}{v_c\tau_r}.
\]

When \(\Pi_c\) approaches or exceeds unity, centralized control cannot respond across the installation inside the required response time.

Encounter-time prediction then becomes regional:

```text
forward sensors --> regional estimator --> local field authority
       |                  |                    |
       +-------- synchronized provenance ------+
```

A capital ship may need multiple local encounter-time estimates tied to a common route state.

---

# Part IX — Power and recovery

## 34. Power is not the only timing constraint

A larger power plant cannot compensate for stale navigation evidence.

Protected recovery remains conceptually:

\[
M_P=
\frac{P_{\rm available}-P_{\rm nominal}-P_{\rm recovery,reserved}}
{\max(P_{\rm nominal},\epsilon)}.
\]

But encounter-time state quality controls **when** that reserve must be available.

A drive that predicts a blocker late can possess sufficient recovery energy and still fail because the power is not conditioned, routed, or synchronized in time.

## 35. Continuous intervention reach

For continuously represented progress:

\[
t_{\rm int}=
 t_{\rm sensor}+t_{\rm solver}+t_{\rm decision}+t_{\rm command}+
 t_{\rm actuate}+t_{\rm exit}+t_{\rm clear}+t_{\rm margin}.
\]

Then:

\[
D_{\rm int}=v_p t_{\rm int}.
\]

Encounter-time propagation improves the estimate of when the first physical hazard enters this intervention horizon.

---

# Part X — Signatures

## 36. Navigation signatures

High-grade encounter-time systems create observable signatures even before transit:

- distributed clock traffic;
- gravimeter calibration cycles;
- beacon interrogation;
- ephemeris synchronization bursts;
- increased computational heat;
- repeated field-probe pulses;
- biological sensory entrainment;
- photonic reference-lattice stabilization.

A civilization's pre-transit signature may therefore expose its navigation philosophy and machinery basis even when the drive operator itself remains unidentified.

## 37. Intelligence implications

An observer that sees a vessel repeatedly updating source geometry before a jump can infer that the vessel's transit solution is environment-sensitive.

That does **not** uniquely identify the family.

The forensic inference must remain probabilistic and provenance-bounded.

---

# Part XI — Failure taxonomy

## 38. Encounter-time failures

| Code | Failure | Consequence |
|---|---|---|
| `ET-NO-EPOCH` | required encounter epoch absent | route state unresolved |
| `ET-NO-PROGRESS` | continuous family lacks progress mapping | no defensible \(t(s)\) |
| `ET-SEMANTIC-LOSS` | progress value lacks meaning declaration | local-velocity confusion |
| `ET-SOURCE-STALE` | source state propagated beyond valid model domain | model refusal |
| `ET-COV-LOSS` | covariance ancestry missing | uncertainty understated |
| `ET-PRECOMMIT-FABRICATION` | intermediate times invented for discrete family | false physics |
| `ET-PORTAL-CORRIDOR-FABRICATION` | gate represented as ordinary-space transit | false geometry |
| `ET-FRAME-CONFLICT` | source and route reference frames disagree | conflicted solution |
| `ET-BOUNDARY-LEAK` | ordinary gravity treated as exotic boundary state | canon/physics contamination |
| `ET-AVERAGING-LEAK` | bad encounter sample hidden by benign samples | unsafe certification |

---

# Part XII — Practical equipment procedures

## 39. ECT-01 — Family identity audit

1. Read the explicit transit-family id.
2. Verify provenance.
3. Do not infer family from race, hull style, atmosphere, control morphology or technology basis.
4. Select the corresponding encounter policy.
5. Record the policy with the route certificate.

**Reject** the solution if family identity is required but unresolved.

## 40. ECT-02 — Source-state intake

For every gravitational source verify:

- source id;
- mass;
- position;
- velocity;
- source epoch;
- reference frame;
- covariance if available;
- physical radius if available;
- propagation-model validity data;
- provenance.

Missing velocity is unresolved motion, not zero motion.

## 41. ECT-03 — Continuous progress mapping

For a continuous family:

1. establish route start epoch;
2. establish route-reference length;
3. obtain a family-valid projected-progress value;
4. record its semantic meaning;
5. select route fractions;
6. compute \(t(s_i)\);
7. propagate every source to every \(t(s_i)\).

Do not reuse equivalent arrival speed unless the family authority explicitly makes it the encounter-time progress coordinate.

## 42. ECT-04 — PRECOMMIT endpoint audit

For Q-Lattice, Fold or Phase Displacement:

1. record commitment epoch;
2. record predicted emergence epoch;
3. propagate source states independently to both;
4. evaluate origin and destination environments;
5. retain separate operator-boundary evidence;
6. do not create intermediate ordinary-space encounter samples.

## 43. ECT-05 — Gate-mouth audit

For wormhole/gate transit:

1. identify entry mouth coordinates and epoch;
2. identify exit mouth coordinates and epoch;
3. verify anchor reference frames;
4. propagate source states at both mouths;
5. certify mouth environments independently;
6. retain throat/operator state separately.

## 44. ECT-06 — Approximation validity audit

Check:

- source speed relative to \(c\);
- compactness;
- point-mass validity;
- propagation remainder bound;
- covariance growth;
- reference-frame consistency;
- duration since source epoch.

A model outside its domain must refuse certification.

## 45. ECT-07 — Maintenance recertification

Recertify after:

- navigation database update;
- sensor replacement;
- clock replacement;
- route-controller update;
- significant source ephemeris revision;
- field-control latency change;
- recovery-system modification;
- translation of alien/native interface layers.

## 46. ECT-08 — Salvaged/alien machinery reconstruction

When recovering an unknown system:

1. preserve native timing references;
2. identify whether source state is represented numerically, resonantly, biologically or fluidically;
3. reconstruct epoch semantics before converting units;
4. separate operator-boundary sensing from ordinary gravity sensing;
5. preserve uncertainty instead of substituting human defaults;
6. retain manufacturer/ancestry separately from owner/operator.

---

# Part XIII — Educational text

## 47. Transit Environment Physics 590

**Course title:** Family Encounter-Time Mechanics and Navigation Dynamics.

### Module 1 — Epochs and reference frames

Students distinguish source epoch, route epoch, commitment epoch, encounter epoch and emergence epoch.

### Module 2 — State propagation

Students derive linear and constant-acceleration state equations and identify their validity domains.

### Module 3 — Covariance

Students propagate \(6\times6\) state covariance and analyze process-noise assumptions.

### Module 4 — Time-dependent gravity

Students compute \(\Phi(\mathbf x,t)\), \(\mathbf g(\mathbf x,t)\), and weak-field tidal tensors for moving sources.

### Module 5 — Continuous FTL representations

Students learn why a route/control progress coordinate can be useful without being a local physical velocity.

### Module 6 — Discrete operators

Students compare PRECOMMIT and portal models with continuously traversed routes.

### Module 7 — Numerical certification

Students identify false averaging, insufficient sampling, stale ephemerides and model-domain violations.

### Module 8 — Alien engineering

Students translate the same mathematical state estimate across terrestrial, aquatic, biological, mineral and postmaterial machinery without collapsing provenance.

---

# Part XIV — Worked example

## 48. Continuous route with moving source

Suppose a route-reference length is:

\[
L=2.0\times10^{16}\ {\rm m}.
\]

A family controller declares:

\[
v_p=2.0\times10^{12}\ {\rm m\,s^{-1}}
\]

with semantic label `metric-route-coordinate-progress`.

The route-control traversal time is:

\[
\Delta t=\frac{L}{v_p}=10^4\ {\rm s}.
\]

At \(s=0.65\):

\[
t(0.65)=t_0+6500\ {\rm s}.
\]

A gravitational source with transverse velocity

\[
v_s=4.0\times10^4\ {\rm m\,s^{-1}}
\]

moves during that interval by:

\[
\Delta r_s=v_s\Delta t=2.6\times10^8\ {\rm m}.
\]

Whether that displacement is negligible depends on the source distance and the required tidal precision. The correct decision comes from the propagated state and uncertainty—not from the statement that \(2.6\times10^8\) m “looks small” on an interstellar map.

---

# Part XV — Generator contract

## 49. Required generator sequence

```text
1. resolve explicit family
2. select family encounter policy
3. resolve route/anchor coordinates
4. resolve source-state authority
5. resolve required epochs or continuous progress mapping
6. propagate every source to each required encounter epoch
7. evaluate ordinary gravity/curvature per sample
8. preserve covariance and model validity
9. pass physical packets to family-specific certification
10. preserve all provenance in export / dossier output
```

## 50. Forbidden generator shortcuts

The generator must not:

- infer family from species;
- infer zero source motion;
- infer zero covariance;
- convert equivalent speed into local hull speed by default;
- invent Fold/Q/Phase intermediate times;
- invent ordinary-space wormhole corridor traversal;
- hide `OUTSIDE_MODEL_VALIDITY` behind a finite score;
- average a blocked sample away;
- derive exotic operator-boundary state from ordinary gravity;
- promote a generated engineering estimate to setting-wide canon.

---

# Part XVI — API examples

## 51. Continuous family

```js
await BlacklightExoFTLFamilyEncounterTimeRuntime.resolveFTLFamilyEncounterTime({
  familyId: 'gravitic-plane',
  from: {x: 0, y: 0, z: 0},
  to: {x: 2.0e16, y: 0, z: 0},
  routeStartEpoch: '2246-04-13T00:00:00Z',
  projectedProgressMPerS: 2.0e12,
  progressSemantic: 'shear-lane-solution-progress',
  fractions: [0.05, 0.15, 0.35, 0.5, 0.65, 0.85, 0.95],
  sourceStates,
  referenceFrame: 'EXAMPLE-BARYCENTRIC-ICRF'
});
```

## 52. Fold jump

```js
await BlacklightExoFTLFamilyEncounterTimeRuntime.resolveFTLFamilyEncounterTime({
  familyId: 'fold-jump',
  from: originControlPoint,
  to: destinationControlPoint,
  commitmentEpoch: '2246-04-13T00:00:00Z',
  emergenceEpoch: '2246-04-13T00:00:18Z',
  sourceStates,
  referenceFrame: 'EXAMPLE-BARYCENTRIC-ICRF'
});
```

## 53. Wormhole gate

```js
await BlacklightExoFTLFamilyEncounterTimeRuntime.resolveFTLFamilyEncounterTime({
  familyId: 'wormhole-gate',
  from: entryMouth,
  to: exitMouth,
  entryEpoch: '2246-04-13T00:00:00Z',
  exitEpoch: '2246-04-13T00:00:02Z',
  sourceStates,
  referenceFrame: 'GATE-NETWORK-SOLUTION-42'
});
```

---

# Part XVII — Research directions

## 54. Next-fidelity work

### 54.1 Adaptive time-aware refinement

Refine samples not only when gravity changes quickly with route fraction but also when source-state covariance or encounter time causes large temporal change.

A future criterion may combine spatial and temporal sensitivity:

\[
\Delta_q^{*}=
\max\left(
\Delta_q^{\rm spatial},
\Delta_q^{\rm temporal},
\Delta_q^{\rm covariance}
\right).
\]

### 54.2 Joint source covariance

Binary and barycentric solutions may require cross-source covariance:

\[
\Sigma_{AB}=
\begin{bmatrix}
\Sigma_A&C_{AB}\\
C_{AB}^T&\Sigma_B
\end{bmatrix}.
\]

Independent source packets must not be mistaken for proof that \(C_{AB}=0\).

### 54.3 Higher-fidelity dynamics

Planned model ladder:

```text
linear kinematics
      |
constant acceleration
      |
two-body / universal-variable propagation
      |
N-body integration
      |
post-Newtonian dynamics
      |
relativistic source / field solution
```

Every upward step must have a clear validity reason. Complexity for its own sake is not an engineering virtue.

### 54.4 Tidal eigenfuture prediction

For gravitational-plane navigation, future work should propagate tidal eigensystems with uncertainty to estimate branch/fork risk before arrival.

### 54.5 Family-boundary fusion

Ordinary physical packets should eventually be fused with independently observed operator-specific boundary channels without destroying their separate provenance.

---

# Part XVIII — Proposed patent-class developments

All items in this section are **PROPOSED**, not established canon.

## 55. Encounter Epoch Provenance Capsule

Cryptographically binds source-state authority, source epoch, encounter epoch, propagation model, covariance, route fraction and family-control state.

## 56. Progress-Semantic Interlock

Prevents a route-control progress value from being used until its semantics are declared and compatible with the selected family.

## 57. PRECOMMIT Corridor Refusal Gate

Rejects software that attempts to generate intermediate ordinary-space encounter times for Fold, Q-Lattice or Phase Displacement without explicit higher authority.

## 58. Portal Mouth Twin-State Recorder

Maintains synchronized physical-state evidence for paired gate mouths while keeping throat/operator state separately auditable.

## 59. Tidal Eigenfuture Predictor

Propagates source states, covariance and tidal eigensystems across the expected encounter-time horizon to warn of developing shear forks.

---

# Part XIX — Closing engineering doctrine

The important change is conceptual as much as computational.

A route is not merely a line between two places. It is a sequence of **physical states encountered at particular times under a particular transit representation**.

For continuous families:

\[
(\mathbf x,s)\rightarrow(\mathbf x,t(s)).
\]

For discrete families:

\[
\text{commitment state}\rightarrow\text{predicted emergence state}.
\]

For portals:

\[
\text{entry-mouth state}\leftrightarrow\text{exit-mouth state}.
\]

The machinery, cognition, maintenance tradition and display language may vary radically between civilizations. The mathematical obligation does not:

**preserve epoch, uncertainty, model validity, family semantics and provenance all the way from observation to certification.**
