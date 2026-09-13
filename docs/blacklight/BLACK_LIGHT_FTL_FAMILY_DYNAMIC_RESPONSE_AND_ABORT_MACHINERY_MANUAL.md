# Black Light FTL Family Dynamic Response and Abort Machinery Manual

**Authority:** derived engineering manual subordinate to the consolidated propulsion/transit authority and the source document *The different lightspeed methods*.

**Machine authority:** `data/exo-vessel/ftl-family-dynamic-response-registry.json`

**Runtime:** `blacklight-exo-ftl-family-dynamic-response-runtime.js`

**Validation:** `data/schemas/exo-vessel-ftl-family-dynamic-response.schema.json`

## 1. Why this layer exists

The generic dynamic escape envelope correctly established that a damaged ship cannot continue using an unchanged certified intervention time. What it intentionally did not decide was **what an abort physically consists of for each transit family**.

That question cannot be answered by one generic multiplier.

A torch vessel brakes. A metric-compression vessel must unwind a field. A gravitational-plane vessel must detach from a dangerous branch. A Q-lattice system may have only a precommit rejection window. A gate must manage admission, occupancy and closure. Treating these as the same event would destroy the central premise of *The different lightspeed methods*: every transit technology has its own gravity sensitivity, errors, machinery, safety sensors and failure behavior.

The governing architecture is therefore:

```text
SOURCE / FAMILY AUTHORITY
          |
          v
 canonical transit family
          |
          v
 FAMILY RESPONSE PROFILE
  what must physically happen?
          |
          +---- sensors / solver
          +---- command network
          +---- actuators / field machinery
          +---- power / energy sinks
          +---- thermal support
          +---- clearing / recovery
          |
          v
 physically derived stage bounds
          |
          v
 GENERIC DYNAMIC ESCAPE ENVELOPE
          |
          v
 predictive route closure / admission
```

The family layer owns the **meaning of the response**. The generic dynamic layer owns the conservative combination of stage times and reserve horizons.

## 2. Shared intervention structure

Every family can still expose its response through the established intervention stages:

\[
t_{\rm int}
=
t_{\rm sensor}
+t_{\rm solver}
+t_{\rm decision}
+t_{\rm command}
+t_{\rm actuate}
+t_{\rm exit}
+t_{\rm clear}
+t_{\rm margin}.
\]

Those labels are interface terms, not claims that every family contains identical hardware.

A family profile answers what each term means physically. For example, `exit` means ordinary-space velocity separation for an Inertial Torch, field unwind for Metric Compression, plane detachment for Gravitational Plane, precommit rejection for Q-Lattice, and admission termination or controlled aperture closure for Wormhole/Gate.

### 2.1 Conservative bounds

For stage bounds

\[
t_i\in[L_i,U_i],
\]

the dynamic escape authority uses

\[
t_{\rm int}^{+}=\sum_i U_i.
\]

No missing stage becomes zero merely because zero would make the route work.

## 3. Physically admissible response models

### 3.1 Network reroute delay

If the certified command path delay is \(\tau_0\) and the surviving path delay is \(\tau_p\), only the excess is charged:

\[
\Delta\tau=\max(0,\tau_p-\tau_0).
\]

Then

\[
t_{\rm command,current}^{+}
=
t_{\rm command,certified}^{+}+\Delta\tau.
\]

This prevents nominal propagation already present in the certificate from being counted twice.

### 3.2 Energy-transfer lower bound

If an abort phase requires known energy transfer \(E_r\) through machinery that can provide only net power \(P_n>0\),

\[
t_r\ge\frac{E_r}{P_n}.
\]

This applies to field discharge or sink operations only where the family authority establishes that a finite energy transfer is actually part of the response.

Stored energy and power remain distinct. A ship can possess enough joules while lacking enough watts to complete the transfer before commitment.

### 3.3 Linear slew

For an explicitly modeled state variable \(q\),

\[
t_q\ge\frac{|\Delta q|}{\dot q_{\max}}.
\]

This can represent a field-sector command, vane/coupler state, aperture setting or other bounded-rate machinery. It may not be used for an undefined narrative quantity such as `damagePercent`.

### 3.4 Translational impulse

For approximately constant available force,

\[
F\Delta t=m\Delta v
\]

so

\[
t_F\ge\frac{m|\Delta v|}{F_{\rm available}}.
\]

This is principally useful for ordinary-space avoidance and braking, especially Inertial Torch.

### 3.5 Rotational impulse

For approximately constant torque and a known relevant moment of inertia,

\[
\tau\Delta t=I\Delta\omega
\]

therefore

\[
t_\tau\ge\frac{I|\Delta\omega|}{\tau_{\rm available}}.
\]

### 3.6 Braking closure

If a vessel travels at conservative upper speed \(v^+\), must wait through latency \(t_L^+\), and then has a conservative lower usable deceleration \(a^-\), the clearance requirement is at least

\[
d_{\rm req}^{+}
=
v^+t_L^+
+
\frac{(v^+)^2}{2a^-}.
\]

This is ordinary kinematics. It is not a model for fold, Q-lattice or gate transit.

### 3.7 Thermal hold

For a valid short lumped thermal model,

\[
C_{\rm th}\frac{dT}{dt}=P_{\rm heat}-P_{\rm reject}.
\]

If net heating is positive,

\[
t_{\rm thermal}
=
\frac{C_{\rm th}(T_{\rm limit}-T_0)}{P_{\rm heat}-P_{\rm reject}}.
\]

Do not extend this form through phase transitions, major flow-regime changes, spatial hot spots or strongly temperature-dependent behavior without a stronger model.

---

# 4. Family 1: Inertial Torch

## 4.1 Emergency sequence

```text
collision / thermal / structural warning
              |
              v
relative-state + braking solution
              |
              v
thrust cutoff / vector command
              |
              v
throttle + gimbal + attitude response
              |
              v
velocity / trajectory change
              |
              v
miss distance or safe stop
```

The abort is dominated by ordinary mechanics. It therefore scales strongly with current mass, usable thrust, structural acceleration limit, available attitude torque, thermal state and, for reaction-mass systems, remaining propellant or reaction mass.

The family-specific question is not "how damaged is the ship?" but "how much impulse and control authority remain?"

If current usable force is \(F^-\),

\[
a^- = \frac{F^-}{m^+}.
\]

A growth in ship mass after refit can invalidate braking performance even if the propulsion machinery itself is unchanged.

## 4.2 Practical technician checks

Verify actual throttle response, vector actuator travel and rate, thrust symmetry, attitude authority, command latency, structural acceleration limits, thermal rejection and reaction-mass state. A successful engine start is not a braking certificate.

## 4.3 Signatures

Emergency response can produce exhaust/plume changes, sudden radiator loading, attitude-control firing, power-bus transients and large structural acceleration. Those signatures emerge from machinery behavior; they are not arbitrary detectability bonuses.

---

# 5. Family 2: Metric Compression

Metric Compression does not "brake" in the torch sense. The emergency problem is controlled field unwind.

```text
curvature / symmetry / unwind-path warning
              |
              v
field-sector state estimate
              |
              v
stop field growth
              |
              v
rebalance sectors + assign sinks
              |
              v
remove stored field energy
              |
              v
restore traversable local metric
              |
              v
verify local recovery
```

If an authority establishes removable field energy \(E_f\) and available certified sink power \(P_s\),

\[
t_{\rm unwind}\ge\frac{E_f}{P_s}.
\]

If sector state must change by \(\Delta q\) with available slew \(\dot q\),

\[
t_{\rm sector}\ge\frac{|\Delta q|}{\dot q}.
\]

The slower physically required operation controls the stage bound.

Scaling should consider protected volume, field-former count and spacing, sink power, converter topology, field symmetry and cooling. No universal \(L^3\) or area law is asserted unless a narrower field model establishes one.

A large vessel commonly motivates sectional field control because signal latency, converter placement and fault containment become important before any speculative field equation is considered.

---

# 6. Family 3: Gravitational Plane

This family is the closest implementation of the source document's gravitational-shear-lane example.

The core hazard is a route branch or fork whose tidal structure becomes incompatible with continuing one coherent coupling state.

In a weak-field approximation, useful environmental quantities can begin from

\[
\Phi(\mathbf r)=-\sum_j\frac{GM_j}{|\mathbf r-\mathbf r_j|},
\]

\[
\mathbf g=-\nabla\Phi,
\]

and the tidal tensor

\[
T_{ij}=\frac{\partial g_i}{\partial x_j}.
\]

The family solver can track eigendirections or other branch observables derived from the selected model. The emergency machinery then must reduce, rotate, cancel or release coupling before the divergent branches impose destructive differential loading.

```text
tidal field estimate
       |
       v
branch / fork localization
       |
       v
detach boundary prediction
       |
       v
coupling-vector slew / release
       |
       v
plane detachment
       |
       v
clear divergent branch volume
```

If a coupling state must slew by an authority-defined \(\Delta q_c\),

\[
t_c\ge\frac{|\Delta q_c|}{\dot q_c}.
\]

If release requires removing explicitly modeled energy \(E_r\),

\[
t_r\ge\frac{E_r}{P_{\rm sink}}.
\]

Both can apply. The response is constrained by the slowest necessary step plus sensor, solver, command and clearance time.

A mature system may possess more independent tidal baselines, faster branch solvers, redundant couplers and larger sink reserve. Maturity is therefore represented by actual evidence, not a mystical `techLevel * 0.8` response multiplier.

---

# 7. Family 4: Slipstream Shear

This family is modeled as controlled coupling or adhesion to a transit boundary/state with a distinct detachment problem.

The crucial distinction from Gravitational Plane is authority: the source phrase or narrative word "slipstream" does not prove that the drive is using the gravitational-plane mechanism.

```text
boundary + adhesion sensing
         |
         v
adhesion-loss forecast
         |
         v
certified detachment-path solution
         |
         v
adhesion slew / release
         |
         v
controlled boundary crossing
         |
         v
clear unstable shear region
```

Relevant dynamic limits can include distributed actuator slew, energy sink capacity, boundary localization uncertainty, coupling area and cooling. A large distributed system can fail asymmetrically even when total installed power appears sufficient.

The engineering question is not merely total capacity but whether the correct sectors retain timely authority.

---

# 8. Family 5: Q-Lattice

Q-Lattice is a PRECOMMIT family. It does not receive a fabricated continuous hull velocity.

Its emergency sequence is dominated by reference integrity and commitment timing:

```text
reference / address validity monitor
             |
             v
pending solution judged invalid
             |
             v
freeze / reject address state
             |
             v
halt transition sequence
             |
             v
isolate or discharge transition machinery
             |
             v
revalidate local reference
```

The usable time is bounded by the earlier of prediction validity and commitment:

\[
t_{\rm available}^{-}
=
\min(H_P^{-},t_C^{-}).
\]

The machinery burden still enters through

\[
M_T=t_{\rm available}^{-}-t_{\rm int,current}^{+}.
\]

Reference-network latency can therefore be fatal without any concept of distance-to-hazard.

A partition that leaves two transition groups believing in different address epochs is not "50% functional." It is a control-state conflict requiring an explicit resolution authority.

---

# 9. Family 6: N-Manifold

N-Manifold is also PRECOMMIT. Its response is framed around embedding validity and a valid return/local state.

```text
embedding observables
       |
       v
manifold / topology validity solver
       |
       v
return-map verification
       |
       v
reject commitment
       |
       v
unwind / close embedding machinery
       |
       v
local chart + reference revalidation
```

The family authority may define an embedding control variable and bounded slew, or may expose only an explicit certified abort time. The common layer does not invent a physical coordinate merely because a linear-slew equation exists.

A solver convergence time is itself part of the intervention budget. If the return-map solution cannot be bounded before commitment, the result is unresolved or blocked rather than "probably fine."

---

# 10. Family 7: Fold Jump

Fold Jump abort occurs before endpoint/closure commitment.

```text
endpoint occupancy + covariance
             |
             v
endpoint solution rejected
             |
             v
closure sequencing halted
             |
             v
former state slewed toward safe state
             |
             v
stored energy routed to certified sinks
             |
             v
local geometry retained / restored
```

An endpoint occupancy probability is not an empty-volume certificate. Where an emergence region \(V_e\) has bounded positional uncertainty region \(B_u\), the conservative exclusion region can be represented as

\[
V_e^*=V_e\oplus B_u.
\]

The abort machinery itself may be limited by fold-former slew and energy sink power. If both apply,

\[
t_{\rm abort}^{+}
\ge
\max\left(
\frac{|\Delta q_f|}{\dot q_f^-},
\frac{E_f^+}{P_s^-}
\right)
\]

before adding sensor, solver, command and clearance contributions.

---

# 11. Family 8: Phase Displacement

Phase Displacement is defined conservatively because the family name alone does not justify a particular microscopic mechanism.

The response authority therefore emphasizes whole-object coverage and reference reconciliation:

```text
whole-object coverage monitor
           |
           v
reference-integrity check
           |
           v
halt additional displacement
           |
           v
certified reconciliation sequence
           |
           v
all protected components return to
one compatible reference state
```

A linear slew or energy-transfer model may be used only if a narrower Phase Displacement authority defines the corresponding state variable or energy transfer. Otherwise the family response must use explicit certified bounds.

This is deliberate. Mathematical notation does not make an undefined physical variable real.

---

# 12. Family 9: Wormhole / Gate

A gate is a PORTAL_ADMISSION system. Its emergency logic is about admission, occupancy, synchronization and closure rather than free-flight braking.

```text
mouth sync + throat + exit state
              |
              v
stop new admissions
              |
              v
identify occupied aperture volume
              |
              v
hold / reject / clear traffic
              |
              v
bounded aperture/throat control
              |
              v
energy sink / closure
              |
              v
verify both mouths and exit volume
```

If aperture state \(q_a\) has a certified closure slew,

\[
t_a\ge\frac{|\Delta q_a|}{\dot q_a^-}.
\]

If closure additionally requires removal of stored field energy,

\[
t_E\ge\frac{E_g^+}{P_s^-}.
\]

The aperture must not simply close through occupied transit volume unless a separate authority explicitly establishes safe behavior. Therefore occupancy clearance can dominate even when machinery could close faster.

The gate's conservative available time may remain

\[
t_{\rm available}^{-}
=
\min(H_P^{-},t_A^{-},t_C^{-}),
\]

where the terms represent prediction, admission validity and closure/rejection horizon.

---

# 13. Race and technology embodiments

## 13.1 Ar'nock

The corrected Ar'nock baseline remains solid-state electromechanical modular engineering with silicon computation, deterministic sectional control and piezoelectric condition/alignment instrumentation.

```text
family sensor modules
       |
solid-state conditioning
       |
silicon regional estimator
       |
deterministic sectional network
       |
field / converter / actuator modules
       |
abort machinery

piezoelectric diagnostics
       |
alignment + actuator + structural evidence
```

For an Ar'nock Gravitational Plane implementation, for example, plane-coupler assemblies may be modular solid-state field units, while piezoelectric instrumentation measures mechanical alignment, mounting state or actuator response. That instrumentation does not become a gravity sensor merely by proximity.

A replaced module can satisfy electrical interface requirements and still change:

- propagation delay;
- calibration;
- thermal burden;
- actuator slew;
- field response;
- resonance/alignment;
- protected-bus demand.

Therefore

\[
\text{functional replacement}\neq\text{automatic abort recertification}.
\]

## 13.2 Zwlei Mur'rek

Mur'rek machinery can embody the same family-level requirement through field vanes, hydraulic authority, dielectric fluid, bio-reactive power fluid, conductive coolant, Navigation Current references and Sensor Choir / Forward Sensor Ampulla evidence where the source authority supports them.

```text
Sensor Choir / Ampulla
          |
Navigation Current reference
          |
control interpretation
          |
hydraulic distribution
          |
field-vane response

power fluid + dielectric fluid + coolant
          |
response authority + thermal reserve
```

A vane response may therefore be bounded by hydraulic flow/pressure and mechanical/field slew rather than an Ar'nock solid-state actuator module.

The source term **gravitic slipstream** remains source terminology only:

\[
\text{gravitic slipstream}\not\Rightarrow\texttt{gravitational-plane}
\]

and

\[
\text{gravitic slipstream}\not\Rightarrow\texttt{slipstream-shear}.
\]

---

# 14. Scaling doctrine

Scaling is family- and embodiment-dependent. The generator must ask which physical quantity actually grows.

A longer vessel may increase signal delay roughly with path length:

\[
\tau\ge\frac{L}{v_{\rm signal}}
\]

for an applicable path, before switching and processing delay.

A heavier torch vessel changes acceleration at fixed thrust:

\[
a=\frac{F}{m}.
\]

A larger gate aperture can increase the volume that must be demonstrated clear, but this manual does not assert a universal aperture-energy law.

A distributed field system may add sectors and local controllers instead of forcing one central controller to scale linearly with vessel length.

The required rule is therefore:

\[
\boxed{\text{scale the physical dependency, not the narrative label}}
\]

---

# 15. Failure cascade doctrine

A proper failure cascade should trace causality.

Example:

```text
converter isolation
   -> lower sink power
   -> longer field-unwind time
   -> larger dynamic intervention bound
   -> negative predictive escape margin
   -> route rejection
```

Not:

```text
ship 30% damaged
   -> FTL 30% slower
```

The latter has no physical content.

Other useful cascades include command reroute -> latency -> missed commitment; coolant loss -> shorter thermal hold -> incomplete field discharge; actuator jam -> reduced slew -> late detachment; sensor baseline loss -> wider hazard localization bound -> shorter conservative predictive horizon.

---

# 16. API and generator contract

Call:

`resolveFTLFamilyDynamicResponse(context)`

The resolver returns a family-response packet and a `dynamicEscapeContext` designed to feed the generic dynamic escape resolver.

Important input groups are:

- `family` or another explicit family-bearing authority packet;
- `familyEvidence` / `responseEvidence`;
- `explicitStageUpperSeconds` when a narrower authority has certified stage bounds;
- `requiredFamilyResponseEvidence` when a particular evidence class must be present;
- installation timing and reserve evidence already consumed by the generic dynamic escape layer;
- provenance.

The adapter recognizes family-specific evidence names such as `fieldUnwindRequiredEnergyJ`, `fieldUnwindAvailableNetPowerW`, `couplingVectorRequiredStateChange`, `couplingVectorAvailableSlewRatePerSecond`, `foldAbortRequiredEnergyJ`, `foldAbortAvailableNetPowerW`, and gate aperture/closure equivalents.

Missing required evidence remains `UNRESOLVED`.

Unknown family aliases become `CONFLICT` rather than falling through to a convenient family.

---

# 17. Maintenance procedure FDR-01

**Family Dynamic Response Recertification**

1. Establish canonical family from authority.
2. Freeze the certified baseline intervention packet.
3. Identify which family machinery physically owns each emergency stage.
4. Trace power, cooling, reference, data and actuator dependencies.
5. Measure current command-path latency.
6. Measure or bound actuator/field slew where applicable.
7. Measure available sink/converter power separately from stored energy.
8. Verify thermal hold through the complete projected intervention interval.
9. Validate sensor and solver evidence appropriate to the family.
10. Produce conservative upper stage bounds.
11. Feed the stage models into the generic dynamic escape envelope.
12. Feed resulting current intervention time into predictive closure.
13. Record every source measurement, model and unresolved dependency.
14. Do not restore operational status merely because no alarm remains active.

---

# 18. Failure codes

| Code | Meaning |
|---|---|
| FDR-FAMILY-UNKNOWN | Family alias is not authoritative |
| FDR-STAGE-MISSING | Required family response stage has no bound |
| FDR-POWER-ZERO | Required energy transfer has no positive available power |
| FDR-SLEW-ZERO | Required state change has no positive slew authority |
| FDR-COMMIT-LATE | PRECOMMIT rejection cannot finish before commitment |
| FDR-GATE-OCCUPIED | Gate closure/admission state conflicts with occupied aperture |
| FDR-SINK-SATURATED | Required field-energy sink is insufficient |
| FDR-THERMAL-HOLD | Thermal reserve expires before response completes |
| FDR-NETWORK-LATE | Surviving command path exists but is too slow |
| FDR-REFERENCE-SPLIT | Distributed reference/epoch state disagrees |
| FDR-PROVENANCE | Required physical bound lacks traceable origin |

---

# 19. Educational progression

**Transit Safety Engineering 800: Family Dynamic Response and Abort Machinery**

Students should be able to:

1. Distinguish route semantics from machinery response semantics.
2. Derive ordinary-space braking and impulse bounds without applying them to nonlocal transit families.
3. Apply power/energy and slew bounds only to explicitly modeled machinery.
4. Explain why PRECOMMIT families use commitment horizons instead of fabricated FTL velocities.
5. Explain why a gate closure problem is an admission/occupancy problem.
6. Trace a hardware failure through power, timing, thermal and predictive consequences.
7. Translate Ar'nock and Mur'rek embodiments into the same abstract family response without homogenizing their hardware.
8. Preserve uncertainty and provenance instead of replacing missing quantities with convenient zeros.

### Examination problem

A Fold Jump installation has a certified closure-actuator baseline already represented in its intervention timing. Current damage leaves a fold-former state change of \(0.36\) normalized units with certified-compatible surviving slew of only \(0.12\,\mathrm{s^{-1}}\). The abort also requires removal of \(15\,\mathrm{MJ}\) through a surviving sink that can accept \(4\,\mathrm{MW}\). Ignore other new penalties for this exercise.

Actuator lower-bound time:

\[
t_q\ge\frac{0.36}{0.12}=3.0\,\mathrm{s}.
\]

Energy-transfer lower-bound time:

\[
t_E\ge\frac{15\times10^6}{4\times10^6}=3.75\,\mathrm{s}.
\]

If these operations must both finish before fold rejection can complete and cannot be shown to execute in parallel, the authority must not simply choose \(3.75\,\mathrm{s}\) as total abort time. Their scheduling relationship is required evidence. If a narrower engineering authority proves they occur concurrently, the controlling lower bound is the maximum. If it proves they are sequential, the lower bound includes their sum. If it proves neither, the scheduling relation is `UNRESOLVED`.

That example illustrates the central doctrine of the entire corpus:

\[
\boxed{\text{mathematical realism includes knowing what the equation does not establish.}}
\]

---

# 20. Canon safeguards

The following are forbidden unless a stronger authority explicitly establishes them:

- turning technology level into an abort-time multiplier;
- turning damage percentage into a response-time multiplier;
- turning stored energy into guaranteed peak power;
- treating an existing backup path as a timely path;
- assigning PRECOMMIT families a continuous local FTL velocity;
- treating endpoint occupancy probability as an empty-volume certificate;
- treating a generic resonance sensor as a gravity/topology/Q-state sensor;
- inferring family from race, manufacturer or descriptive drive vocabulary;
- assuming field energy scales with vessel volume without an actual field model;
- assuming separate abort operations are concurrent or sequential without scheduling authority;
- letting favorable route geometry erase a blocking family-response result.

The desired result is not maximal equation count. It is a believable engineering civilization in which equations, equipment, maintenance practice, training material and operational decisions all describe the same machine.
