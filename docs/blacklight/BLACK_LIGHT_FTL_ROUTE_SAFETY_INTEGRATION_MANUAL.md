# BLACK LIGHT FTL ROUTE SAFETY INTEGRATION MANUAL

**Authority class:** MIXED — integration engineering, labeled derived/proposed simulation layer  
**Primary authority:** `BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md`  
**Design-intent source:** Google Drive, **The different lightspeed methods**, document `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`, revision `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`  
**Machine authority:** `data/exo-vessel/ftl-route-safety-integration.json`  
**Runtime:** `blacklight-exo-ftl-route-safety-runtime.js`

---

## 1. Purpose

The EXO FTL generator already knows that a drive performs differently in deep space, a planetary well, a binary system, a compact-object neighborhood, a nebula, an uncharted route, or disturbed Q/N-dimensional terrain. The safety-certification subsystem already knows how to evaluate environmental severity, family-specific efficiency loss, calculation uncertainty, lookahead, hazard observability, and protected recovery authority.

Until this integration layer, those systems were adjacent rather than connected.

This manual defines the bridge.

The bridge is intentionally conservative. It does **not** claim that a generated route archetype is a measured astrophysical environment. It translates the generator's existing route classes into **PROPOSED normalized simulation packets** so the safety mathematics can operate and the interface can preserve a distinction between:

- what a drive could do in principle;
- what the selected route does to that capability;
- whether the modeled route can presently be certified;
- what remains unresolved because the model lacks evidence.

The core rule is:

\[
\boxed{\text{generated capability}\neq\text{route certification}}
\]

A machine can have a spectacular clean-space rating and still receive `REJECTED` for the route in front of it.

---

## 2. Authority chain

```text
Named race / vessel / manufacturer / installation canon
                         ↓
BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md
                         ↓
Existing family physics + route definitions
                         ↓
FTL safety calibration profile registry
                         ↓
FTL safety certification runtime
                         ↓
Route-safety integration registry/runtime
                         ↓
EXO generator presentation and exported dossier
```

The lower layer never gets to reverse the arrows.

A normalized compact-object archetype cannot establish a universal physical constant. A proposed calibration profile cannot establish what a named civilization historically achieved. A UI selection cannot identify an unresolved archaeological drive family.

---

## 3. The operational problem

The design source requires all transit methods to experience gravity-related penalties, but not equally. It also requires each family to have matching sensors, safety interlocks, lookahead, emergency de-transit or recovery behavior, and increasing safety margins as the technology matures.

That implies at least five distinct questions for every generated route:

1. **Environmental burden:** how severe is the selected region for spacetime manipulation or precision navigation?
2. **Family response:** how strongly does this particular transit operator suffer from that burden?
3. **Calculation burden:** how badly do uncertainty and model error amplify for this family?
4. **Intervention horizon:** can the machine detect and react to danger before the safe-exit boundary closes?
5. **Recovery reserve:** after ordinary operation, does independent authority still remain to survive the failure?

The integration layer turns those questions into one replayable route certificate.

---

## 4. Route environment vector

For generator use, the route is represented by a normalized environmental state:

\[
\mathbf E_r=
[
|\Phi|,
|\nabla\Phi|,
\|\mathsf T\|,
\|R\|,
U_m,
P_h,
B_f
]^T
\]

where:

- \(|\Phi|\) is normalized potential burden;
- \(|\nabla\Phi|\) is normalized acceleration/gradient burden;
- \(\|\mathsf T\|\) is normalized tidal-tensor magnitude;
- \(\|R\|\) is normalized curvature burden;
- \(U_m\) is mass-model uncertainty;
- \(P_h\) is hidden-mass probability;
- \(B_f\) is family-boundary hazard.

These are **simulation coordinates**, not SI measurements.

If a later named source supplies real in-setting measurements for a location or installation, those measurements outrank the archetype.

---

## 5. Route archetypes

### 5.1 Deep interstellar space

Deep space is the comparison baseline, not a magical zero-hazard zone. Residual route-model error, destination occupancy, hidden bodies, clocks, traffic, and family-specific boundary conditions remain.

### 5.2 Planetary gravity well

Planetary proximity raises potential, acceleration, tidal stress, emergence exclusion, and mass-shadow concerns. This is the ordinary example of why a drive's clean-space speed does not imply it can commit from low orbit.

### 5.3 Gas giant / magnetosphere

The gas-giant archetype combines gravity burden with magnetic and plasma interference. A transit machine may remain mechanically healthy while its safety sensors lose the quality necessary for certification.

### 5.4 Binary or multiple-star system

Binary systems emphasize time-varying gradients, moving barycenters, and shear-lane ambiguity. For gravitational-plane travel this is especially important because a route fork is not merely navigational inconvenience; it can become mutually incompatible field guidance across the vessel.

### 5.5 Compact-object neighborhood

Compact-object operation is intentionally modeled to fail often. The integration layer is not supposed to normalize dangerous proximity to neutron stars or black holes merely because the generator can produce a large number.

### 5.6 Nebula

The dominant burden is sensor and model quality rather than raw gravity. Plasma, charge separation, scattering, and obscuration can make an otherwise modest gravitational environment uncertifiable.

### 5.7 Uncharted route

Uncharted routes are uncertainty-dominated. The important quantity is not simply what mass is known to be present; it is the probability that the mass model is incomplete.

### 5.8 Q/N disturbed region

This archetype raises family-boundary and model uncertainty sharply. It exists to distinguish a region that is ordinary-space mild but dangerous to higher-dimensional correspondence, embedding, or phase-reference systems.

---

## 6. Family normalization

The historical generator names and consolidated authority do not always use identical keys. The adapter therefore performs a deterministic key mapping rather than pretending they are separate physics.

```text
metric-envelope  → metric-compression
gravitic-plane   → gravitational-plane
slipstream-shear → slipstream-shear
q-lattice        → q-lattice
n-manifold       → n-manifold
fold-jump        → fold-jump
wormhole-gate    → wormhole-gate
phase-displacement → phase-displacement
inertial-torch   → inertial-torch
```

This normalization is implementation vocabulary only. It does not authorize mapping source-local terminology such as the Zwlei/Mur'rek **gravitic slipstream** to any consolidated family.

---

## 7. Environmental severity

The existing certification engine evaluates a weighted normalized severity:

\[
G=
\sum_i
w_i\left|\frac{x_i}{x_{i,ref}}\right|.
\]

The calibration profile supplies both reference scales and weights.

The route adapter supplies the route archetype values.

Neither is a universal setting constant.

---

## 8. Family efficiency loss

For family \(f\):

\[
P_f=a_fG+b_fG^2+c_fG^{n_f}+d_fU_m+e_fB_f
\]

and

\[
\eta_{g,f}=e^{-P_f}.
\]

This has a useful engineering interpretation. Two drives can occupy the same location yet incur different operating penalties because the same external spacetime geometry interferes with different operators in different ways.

For gravitational-plane transit, geometry is both roadway and hazard. For Fold, endpoint covariance and precommit certainty may dominate. For Q-Lattice, reference identity and epoch may dominate. For ordinary inertial propulsion, exotic field-collapse penalties are absent even though gravity still matters to navigation and energy.

---

## 9. Calculation efficiency

A second penalty is retained for uncertainty:

\[
\eta_{calc,f}
=
\exp[-k_f A_f^2\operatorname{tr}(\Sigma_E)].
\]

This is deliberately independent of raw gravity efficiency.

A route may be physically mild but poorly known.

An uncharted route is the canonical example.

---

## 10. Maturity and safety margin

The P0–P6 path scale changes four different things:

- lookahead factor;
- covariance factor;
- recovery factor;
- redundancy factor.

It does **not** simply make every number better by one multiplier.

A useful conceptual relation is:

\[
M_{safe}=F(L,C,R,D)
\]

where \(L\) is lookahead, \(C\) covariance quality, \(R\) recovery authority, and \(D\) redundancy diversity.

This preserves the design-source rule that more advanced drives gain larger safety margins without becoming perfectly safe.

---

## 11. Actionable lookahead

The adapter constructs a complete intervention chain:

\[
t_{int}=
 t_{sensor}
+t_{solver}
+t_{decision}
+t_{command}
+t_{actuate}
+t_{exit}
+t_{clear}
+t_{margin}.
\]

The prediction horizon must exceed it:

\[
M_t=t_{prediction}-t_{int}>0.
\]

For continuously propagating transit this can be projected into distance:

\[
M_d=v_{projected}M_t.
\]

For Fold, Q-Lattice, and Phase Displacement, the runtime uses a **precommit decision horizon** instead of pretending that an instantaneous/nonlocal transition has a meaningful local hull velocity during the jump.

---

## 12. Hazard observability

Every route contributes route hazards. Every family contributes operator hazards.

The required set is:

\[
H_{required}=H_{route}\cup H_{family}.
\]

Certification then asks whether each hazard has either direct observation or an independently validated guard channel.

The governing invariant remains:

\[
\boxed{\text{loss of hazard observability}\Rightarrow\text{reject/abort}}
\]

A machine does not become safe because its broken sensor stopped reporting the danger.

---

## 13. Family hazard examples

### Metric Compression

- curvature limit;
- field symmetry;
- unwind path.

### Gravitational-Plane

- shear fork;
- tidal shear;
- recoupling path.

### Slipstream Shear

- Q-boundary condition;
- adhesion loss;
- detachment path.

### Q-Lattice

- reference integrity;
- address/epoch validity;
- rejection path.

### N-Manifold

- manifold topology;
- return-map condition;
- embedding validity.

### Fold Jump

- destination occupancy;
- endpoint covariance;
- closure path.

### Wormhole / Gate

- throat stability;
- mouth synchronization;
- closure path.

### Phase Displacement

- reference integrity;
- whole-object coverage;
- reconciliation path.

### Inertial Torch

- collision course;
- thermal margin;
- deceleration reserve.

---

## 14. Protected recovery reserve

A route certificate keeps emergency authority separate from ordinary performance:

\[
R_{available,nominal}=R_{total}-R_{protected}
\]

with

\[
R_{protected}\ge R_{required,recovery}.
\]

No generator optimization may spend the final unwind, recoupling, detachment, rejection, return, closure, stabilization, reconciliation, braking, or thermal survival reserve merely to raise the displayed travel rate.

---

## 15. Admission states

### `ADMISSIBLE`

All presently modeled safety gates pass. This does not mean perfect safety; it means the route is supportable inside the declared simulation and provenance envelope.

### `MARGINAL`

The route passes but has little margin. Operational doctrine should reduce authority, improve sensing, improve route knowledge, or increase recovery reserve.

### `REJECTED`

At least one governing safety requirement fails. A performance number may still exist, but it is not a certified route solution.

### `UNRESOLVED`

Required evidence, calibration, mapping, or measurement is missing. This is not equivalent to safe and not equivalent to unsafe; it is a refusal to fabricate certainty.

### `CONFLICT`

Equally ranked calibration authorities disagree. The runtime refuses to average them into a fictional compromise.

---

## 16. Presentation rule

The display contract is:

\[
\boxed{
status\in\{REJECTED,UNRESOLVED,CONFLICT\}
\Rightarrow
\text{do not present capability as certified}
}
\]

A UI may still show the clean-space or theoretical machine rating for engineering comparison, but must label it as capability rather than route authorization.

---

## 17. Scaling behavior

Route certification inherits the broader scaling rule that drive size is not merely a power problem.

\[
B_{scale}
=
C_V(V/V_r)^{\alpha_V}
+C_A(A/A_r)^{\alpha_A}
+C_L(L/L_r)^{\alpha_L}
+C_S(L_s/L_{s,r})^{\alpha_S}.
\]

As installation size grows, the certification problem may worsen through:

- larger protected volume;
- longer field boundary;
- greater synchronization span;
- larger sensor baseline;
- longer signal/command paths;
- more structural flexure modes;
- increased heat rejection distance;
- more common-cause failure opportunities;
- greater recovery energy and field volume.

More available power can help some terms while leaving others untouched.

---

## 18. Power and infrastructure interpretation

Infrastructure is part of safety, not merely convenience.

A self-contained drive has to carry its own references, recovery authority, heat sink, calibration system, and route sensors.

Beacon-assisted operation can improve covariance but introduces trust, synchronization, spoofing, and availability dependencies.

Prepared corridors reduce route uncertainty but become infrastructure targets.

Paired and fixed gates can move large portions of sensing, stabilization, and recovery authority off the vessel while creating mouth synchronization, governance, throughput, and closure requirements.

The adapter must therefore never interpret lower shipboard burden as lower total system burden.

---

## 19. Signature model

A route decision also changes observability. A useful cross-family signature vector is:

\[
\mathbf S=
[S_{EM},S_{thermal},S_{grav},S_Q,S_{topology},S_{wake},S_{chronometric},S_{bio}]^T.
\]

High-power correction, emergency de-transit, gate stabilization, shear-lane recoupling, and repeated route probing may produce more detectable signatures than steady nominal operation.

This manual does not assign universal signature numbers. Those require family- and installation-specific evidence.

---

## 20. Failure model

```text
route model error
      ↓
incorrect environmental state
      ↓
family penalty underestimated
      ↓
lookahead or recovery requirement understated
      ↓
false certification
```

The integration architecture prevents the final step by preserving provenance and making unresolved inputs explicit.

A second failure path is:

```text
sensor degradation
      ↓
required hazard no longer observable
      ↓
independent guard available? ── yes → degraded certification
             │
             no
             ↓
          REJECTED
```

---

## 21. Practical procedure RS-01 — Generated route certification

1. Generate the transit architecture normally.
2. Preserve the selected route key and generated family.
3. Normalize the family key through the integration registry.
4. Load the exact calibration profile and version.
5. Apply only authority-valid named overrides.
6. Build the route archetype packet.
7. Build covariance from route uncertainty and path maturity.
8. Build the family + route hazard set.
9. Build timing and recovery states.
10. Run the certification resolver.
11. Apply minimum family-efficiency thresholds.
12. Preserve status, reasons, profile identity, and provenance in the exported dossier.

---

## 22. Practical procedure RS-02 — Rejected route

When the status is `REJECTED`:

1. Do not delete the generated capability figures.
2. Relabel them as theoretical/clean-space capability.
3. Surface the certification reason.
4. Offer engineering actions rather than silently overriding the gate: lower authority, safer route, improved covariance, restored sensing, more recovery reserve, or different infrastructure.
5. Re-run certification after a meaningful state change.

---

## 23. Practical procedure RS-03 — Unresolved route

When status is `UNRESOLVED`:

1. Identify whether the missing item is family mapping, calibration, environmental input, hazard observability, timing, or recovery authority.
2. Do not insert zero.
3. Do not borrow a named-race limit from the generic profile.
4. Do not treat uncertainty as a reason to choose the most convenient family.
5. Acquire the missing evidence or remain unresolved.

---

## 24. Practical procedure RS-04 — Calibration conflict

When status is `CONFLICT`:

1. Preserve both authorities and their provenance.
2. Compare scope and authority rank.
3. Narrower higher-authority named evidence wins within scope.
4. If equally ranked sources genuinely disagree, do not average.
5. Require explicit reconciliation or a new source.

---

## 25. Practical procedure RS-05 — Gravitational shear-lane survey

For a gravitational-plane candidate:

1. Map the gravitational potential and tidal tensor along the intended route.
2. Identify focal-node structure and candidate shear planes.
3. Search specifically for lane bifurcation.
4. Determine whether both branches can remain inside one coherent guidance solution.
5. If the vessel could be driven toward mutually incompatible solutions, mark `shear-fork` observed.
6. Confirm an independent recoupling path before raising authority.

A route fork is a structural hazard, not a cosmetic route-choice penalty.

---

## 26. Practical procedure RS-06 — Sensor independence audit

1. Enumerate required hazards.
2. Trace every displayed hazard channel to its physical sensor root.
3. Group displays that share one sensor, clock, calibration table, model, or data bus.
4. Count independent guard coverage, not screen count.
5. If a required hazard has neither direct independent observation nor a validated guard, reject certification.

---

## 27. Practical procedure RS-07 — Recovery reserve audit

1. Measure total recovery authority.
2. Identify the minimum authority required for the family-specific emergency transition.
3. Ring-fence protected reserve.
4. Verify ordinary route optimization cannot consume it.
5. Recompute after damage, refit, biological regrowth, or payload geometry change.

\[
\boxed{\text{available power}\neq\text{available recovery authority}}
\]

---

## 28. Practical procedure RS-08 — Recertification

Recertification is mandatory after any change that alters:

- drive geometry;
- sensor ancestry;
- route environment;
- calibration version;
- mass distribution;
- structural alignment;
- software/controller authority;
- recovery hardware;
- named-source family identification.

Historical certificates retain their original profile/version. They are not silently rewritten after calibration updates.

---

## 29. API

### Resolver

`resolveGeneratedFTLRouteSafety(context)`

### Inputs

- `rating`
- `request`
- optional preloaded integration registry
- optional preloaded calibration registry
- explicit calibration profile ID/version
- named override IDs
- provenance

### Outputs

- `status`
- normalized `family`
- path maturity
- route key
- calibration identity
- full safety certificate
- presentation guard
- warnings
- provenance

### Required downstream behavior

The dossier/export layer must retain the profile identity and route-certificate status. A downstream system may add explanation but may not turn a blocked status into ordinary certified capability.

---

## 30. Generator doctrine

The generator should answer two separate questions:

**Capability:** what can this architecture do under its modeled operating assumptions?

**Admission:** is this route safe enough, known enough, observable enough, and recoverable enough to authorize now?

The first can exist without the second.

That separation is the entire point of this layer.

---

## 31. Educational text — undergraduate problem set

### Problem A

Two drives have the same clean-space speed. One is gravitational-plane and one is Q-Lattice. Explain why a binary system may penalize the first primarily through shear topology and the second primarily through reference/covariance burden.

### Problem B

A vessel doubles reactor output but loses one of two independent gravity-gradient arrays. Explain why route safety can decrease despite greater available power.

### Problem C

A route has a low environmental severity but very high mass-model uncertainty. Identify which terms in the certification chain become dominant.

### Problem D

Explain why a generated `REJECTED` route may still display a theoretical travel time without contradiction.

---

## 32. Advanced course — Transit Certification Engineering 601

Topics:

1. inverse gravitational terrain reconstruction;
2. family-conditioned route operators;
3. covariance ancestry and common-cause sensors;
4. nonlocal precommit decision horizons;
5. protected recovery allocation;
6. route-certificate replay and versioning;
7. adversarial navigation infrastructure;
8. certification under incomplete family identification;
9. topology-aware failure envelopes;
10. post-casualty recertification.

Final examination: certify or refuse a mixed-evidence route without converting unknown values to zero and without using performance as a substitute for safety.

---

## 33. Thesis directions

### 33.1 Shear-fork observability before commitment

Develop minimum sensor baselines capable of distinguishing a true lane bifurcation from a temporary model artifact.

### 33.2 Covariance-aware beacon trust

Model how several nominally independent navigation beacons can share hidden ephemeris, clock, or political control roots.

### 33.3 Nonlocal transition decision theory

Develop precommit safety criteria for Fold, Q-Lattice, and Phase systems without importing a fictitious local superluminal velocity.

### 33.4 Recovery reserve economics

Study how commercial operators underinvest in protected recovery authority when market pressure rewards advertised range and throughput.

### 33.5 Biological recertification

Determine how living drive structures should be re-certified after regrowth changes geometry, material state, or sensor alignment.

---

## 34. Proposed technology / patent-class concepts

These concepts are **PROPOSED**, not historical canon.

### 34.1 Independent hazard ancestry meter

A controller that displays not the number of hazard channels but the number of provenance-independent physical sensor roots supporting them.

### 34.2 Recovery-reserve hardware escrow

A physically isolated authority reservoir that nominal navigation cannot access without entering an emergency state.

### 34.3 Shear-fork predictive interferometer

A distributed gravity/tidal interferometer optimized for detecting route bifurcations before a gravitational-plane vessel enters the no-safe-split region.

### 34.4 Route-certificate provenance capsule

A tamper-evident record containing environment epoch, model version, calibration profile, sensor ancestry, family operator, and recovery state for later forensic replay.

### 34.5 Multi-family uncertainty translator

A planning instrument that takes one environmental covariance model and shows how each admissible drive family amplifies the same uncertainty differently.

---

## 35. Race- and technology-specific integration

Named technology is allowed to be different.

The generic profile is a fallback simulation baseline only.

A Mur'rek regulator, Ar'nock derelict system, human manufacturer, gate civilization, biological drive lineage, or machine intelligence may have different sensor architecture, maintenance logic, route mathematics, signature, redundancy, recovery machinery, and failure modes when those differences are established by source.

The correct operation is:

```text
named source exists?
      │
   yes│             no
      ↓              ↓
apply scoped      use generic
named authority   proposed baseline
      ↓              ↓
retain provenance and status
```

Never invert that process.

---

## 36. Canon safeguards

1. Route archetype numbers are simulation parameters.
2. Calibration coefficients are simulation parameters unless explicitly promoted by higher authority.
3. UI family selection is not archaeological evidence.
4. An unresolved named drive remains unresolved.
5. `REJECTED` is not converted to `MARGINAL` for convenience.
6. `UNRESOLVED` is not converted to zero.
7. More maturity increases safety margin but never creates perfect safety.
8. More power does not substitute for sensing, geometry, reference integrity, or recovery.
9. Historical certificates retain the calibration version that produced them.
10. Family auto-selection remains prohibited.

---

## 37. Final engineering principle

Black Light transit should feel like generations of engineers have been forced to live with the consequences of their physics.

That means the impressive number is never the whole machine.

The machine also needs to know where it is, what spacetime is doing, how uncertain that knowledge is, what failure looks like for its particular operator, how far ahead it can see, how quickly it can react, and whether it has deliberately preserved enough authority to survive being wrong.

The generator now has a formal place for that answer.
