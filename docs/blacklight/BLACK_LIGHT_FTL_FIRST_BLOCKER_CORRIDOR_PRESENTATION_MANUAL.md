# Black Light FTL First-Blocker Corridor Presentation Manual

**Status:** DERIVED engineering / operator-interface reference.  
**Authority:** subordinate to named canon and `BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md`.  
**Design-intent source:** *The different lightspeed methods*, Google document `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`, revision `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`.  
**Implementation:** `blacklight-exo-ftl-first-blocker-presentation-runtime.js`.  

## 1. Purpose

This manual defines the operator-facing presentation layer between the already-certified family-specific physical route intervals and a live EXO engineering interface. Its job is not to solve route physics. Its job is to make the existing result difficult to misunderstand.

The governing distinction is:

\[
\boxed{\text{presentation}\neq\text{certification}}
\]

A display may format, order, label, and visualize certified evidence. It may not recalculate ordinary gravity, family response, observability, recovery, intervention reach, or canon provenance.

The input authority is the output of `blacklight-exo-ftl-family-segment-certification-runtime.js`.

```text
published / measured source state
        ↓
physical route sampling
        ↓
physical interval construction
        ↓
family-specific interval certification
        ↓
FIRST-BLOCKER PRESENTATION MODEL
        ↓
operator display / dossier / export
```

The interface is therefore downstream of every safety decision.

## 2. Why the first blocker matters

Route safety is conjunctive:

\[
C_{\rm route}=\bigwedge_{i=0}^{N-1}C_{f,i}.
\]

If one mandatory interval is `REJECTED`, `UNRESOLVED`, `OUTSIDE_MODEL_VALIDITY`, or `CONFLICT`, the route cannot be made safe by averaging that interval with more benign intervals.

For the set of blocking intervals

\[
\mathcal B=\left\{i\mid C_{f,i}\in
\{R,U,O,C\}\right\},
\]

where the symbols denote the four blocking states above, the first blocker is

\[
i_B=\arg\min_{i\in\mathcal B} f_{i,0},
\]

with \(f_{i,0}\) the interval start fraction.

The presentation runtime verifies that this ordering agrees with the `firstBlockingSegmentIndex` already returned by certification. If the records disagree, the correct presentation state is `CONFLICT`. The UI must not silently choose the prettier result.

## 3. Corridor geometry

For route length \(L\), interval \(i\) covers fractional span

\[
\Delta f_i=f_{i,1}-f_{i,0}
\]

and geometric baseline span

\[
\Delta s_i=\Delta f_i L.
\]

A corridor display should therefore allocate horizontal width according to \(\Delta f_i\), not according to danger severity.

```text
DEPARTURE                                                     ARRIVAL
0.0                                                               1.0
|---------|-----------------|---|----------------------|------------|
 ADMISS.       ADMISS.       M      REJECTED                 ?
                              ^
                         narrow state
                                       ^
                                  FIRST BLOCKER
```

A narrow interval must remain narrow. Inflating a dangerous interval visually may be useful as an annotation, but it must not masquerade as route geometry.

## 4. The corridor is not a synthetic safety score

The following quantities are physically or operationally distinct:

\[
\epsilon_\Phi=\frac{|\Delta\Phi|}{c^2},
\qquad
|\mathbf g|,
\qquad
\|T\|_F,
\qquad
R_*,
\]

along with uncertainty, family response, hazard observability, recovery reserve, and intervention reach.

They cannot be added in raw form because their dimensions and meanings differ. Even after the family model has normalized them, the presentation layer must not reverse that careful separation by inventing an ungoverned number such as:

\[
S_{\rm pretty}=0.2G+0.2U+0.2R+0.2O+0.2L.
\]

That number is prohibited unless a higher authority explicitly defines it. In the current system, safety remains conjunctive rather than averaged.

## 5. Physical quantities shown at an interval

Where supplied by the certification runtime, the interface may display separate environmental channels.

Weak-field potential difference relative to the declared reference:

\[
\Delta\Phi=\Phi(\mathbf x)-\Phi(\mathbf x_{\rm ref}).
\]

Dimensionless potential depth:

\[
\epsilon_\Phi=\frac{|\Delta\Phi|}{c^2}.
\]

Coordinate gravitational acceleration:

\[
\mathbf g(\mathbf x)=
-\sum_a GM_a\frac{\mathbf x-\mathbf x_a}{r_a^3}.
\]

Weak-field tidal tensor:

\[
T_{ij}=\sum_a\frac{GM_a}{r_a^3}
\left(3n_i n_j-\delta_{ij}\right).
\]

Tidal Frobenius norm:

\[
\|T\|_F=\sqrt{\sum_{ij}T_{ij}^2}.
\]

These values describe ordinary gravitational environment. They do **not** establish that a fictional transit family is physically real.

## 6. Family response remains a downstream fictional model

Only after dimensional normalization does the established family response operate:

\[
G_i=
 w_\Phi G_{\Phi,i}
+w_gG_{g,i}
+w_TG_{T,i}
+w_RG_{R,i}
+w_UU_i,
\]

\[
P_{f,i}=a_fG_i+b_fG_i^2+c_fG_i^{n_f}+d_fU_i+e_fB_{f,i},
\]

\[
\eta_{g,f,i}=e^{-P_{f,i}}.
\]

Calculation retention remains independent:

\[
\eta_{{\rm calc},f,i}
=
\exp\left[-k_fA_f^2\operatorname{tr}(\Sigma_{E,i})\right].
\]

The presentation runtime merely extracts those returned values. It does not calculate them again.

This matters because a second implementation of the equations inside a UI would create a second safety authority. Eventually the two implementations would diverge.

## 7. Family-boundary hazards

For exotic families, the boundary term \(B_{f,i}\) may represent fictional operator-specific conditions such as shear-lane ambiguity, fold closure state, Q-boundary stability, N-manifold return topology, throat state, or phase reconciliation.

The rule remains:

\[
\boxed{B_{f,i}\text{ missing}\neq0}.
\]

Ordinary gravity cannot manufacture a missing operator-specific state. The corridor therefore displays `UNRESOLVED` if certification has not established the required boundary channel.

## 8. First-blocker distance

For the first blocker beginning at route fraction \(f_B\), vessel route fraction \(f_c\), and route baseline length \(L\):

\[
D_B=\max\left[0,(f_B-f_c)L\right].
\]

The presentation may display `distanceToFirstBlockingSegmentM` only when certification supplied it.

It may convert meters into human-readable SI prefixes, astronomical units, or light-seconds for display, but the stored source value must remain available.

## 9. Continuous intervention reach

For a transit family where projected local progress is a meaningful model:

\[
D_{\rm int}=v_p t_{\rm int},
\]

where

\[
t_{\rm int}=
 t_{\rm sensor}
+t_{\rm solver}
+t_{\rm decision}
+t_{\rm command}
+t_{\rm actuate}
+t_{\rm exit}
+t_{\rm clear}
+t_{\rm margin}.
\]

The distance margin is

\[
M_D=D_B-D_{\rm int}.
\]

If \(M_D\le0\), the modeled intervention chain cannot clear the blocker before reaching it.

Again, the presentation runtime consumes the certification result. It does not reconstruct this timing chain.

## 10. PRECOMMIT operators

Fold, Q-Lattice, and Phase Displacement remain precommit-style operators where a local superluminal corridor velocity is not necessarily meaningful.

Their decision margin is instead represented as

\[
M_T=t_{\rm prediction}-t_{\rm int}.
\]

The UI must never invent a fictitious local FTL velocity merely so that it can display a countdown.

If certification does not return `timeToFirstBlockingSegmentS`, the presentation displays time as unresolved.

## 11. Data flow and API contract

Input:

```js
const view = await BlacklightExoFTLFirstBlockerPresentationRuntime
  .resolveFTLFirstBlockerPresentation({
    familySegmentCertification: certifiedPacket
  });
```

Output includes:

```text
status
family
path
corridor.segments[]
firstBlocker
warnings[]
provenance[]
canonSafeguards[]
```

Each corridor segment retains:

```text
index
fractionStart
fractionEnd
fractionSpan
status
blocking
reasons
gravityEfficiency
calculationEfficiency
interventionReachable
environment
uncertainty
provenance
```

The presentation model intentionally retains no independent physics solver.

## 12. Provenance rule

The visual route map inherits provenance from the certification packet.

```text
source observations
  ↳ physical model
      ↳ route sampler
          ↳ physical interval
              ↳ family interval certificate
                  ↳ presentation model
```

Removing any upstream provenance does not make the display simpler; it makes the result less auditable.

A screenshot of the corridor is not sufficient engineering evidence by itself. The underlying JSON interval certificates remain the auditable record.

## 13. Conflict handling

Two possible first-blocker statements may exist in input:

1. the `routeDisposition.firstBlockingSegmentIndex` supplied by certification;
2. the first blocking interval implied by sorting certified segment fractions.

Normally they are identical.

If

\[
i_{B,\rm disposition}\neq i_{B,\rm ordered},
\]

the presentation state becomes `CONFLICT`.

This is deliberately conservative. A UI is not authorized to adjudicate an upstream disagreement.

## 14. Race- and technology-specific embodiment

The information content remains common, while machinery embodiment may vary enormously.

| Technology basis | Plausible native corridor presentation | Maintenance implication |
|---|---|---|
| terrestrial electromechanical | layered vector strip, numeric alarms, independent abort bus | calibration, connector integrity, timing references |
| aquatic electrochemical/hydraulic | pressure/current topology, moving fluid vectors | fluid purity, seals, ionic calibration, pressure reserve |
| cryogenic ammonia/halocarbon | thermal-state corridor with quench boundaries | cold reference, phase purity, thermal cycling |
| gas-giant fluidic/electrostatic | pressure-strata map and electrostatic contours | membrane integrity, pressure balance, charge reference |
| biological/symbiotic | sensory manifold, neural hazard salience, metabolic reserve | tissue health, microbiome, neural recertification |
| mineral piezoelectric/photonic | resonance bands, crystal-axis discontinuities | preload, fracture, resonator alignment |
| field-mediated/adaptive | live topology manifold and rollback envelope | reference anchors, metrology, rollback-energy escrow |

The rule is:

\[
\boxed{\text{same certified evidence}\neq\text{same operator representation}}.
\]

A translation layer must preserve the native state rather than overwrite it.

## 15. Mur'rek safeguard

A Mur'rek current-well or wet-system display may be used to express the corridor evidence, but this does not resolve the Mur'rek term **gravitic slipstream** into a consolidated transit family.

Their FTL family remains unresolved unless a higher-authority source resolves it.

## 16. Ar'nock safeguard

An Ar'nock biological/vibrational interface may express route evidence through cultivated neural structures, distributed sensation, or vibration state. That does not assign the Ar'nock a transit family.

A hypothetical engineering simulation remains hypothetical.

## 17. Technology ancestry

The corridor display must not flatten technological history.

\[
\text{owner}\neq
\text{operator}\neq
\text{manufacturer}\neq
\text{inventor}\neq
\text{technology ancestry}.
\]

A captured foreign drive may be controlled by an indigenous retrofit display. A licensed drive may retain the original manufacturer's native diagnostic channels. A hybrid installation may expose several representations simultaneously.

## 18. Scaling behavior

The display itself is not the difficult part of large-ship scaling. The source sensing and intervention network is.

Across vessel span \(L_v\):

\[
\Delta a\sim\|T\|L_v.
\]

A rough structural stress scaling remains:

\[
\sigma_{\rm tidal}\sim\rho\|T\|L_v^2.
\]

Distributed control pressure can be represented by

\[
\Pi_c=\frac{L_c}{v_c\tau_r}.
\]

As \(\Pi_c\) grows, sectional sensing, local authority, independent recovery paths, and regional abort logic become more important.

The corridor UI should therefore be capable of showing both whole-route state and the specific section of the vessel whose abort/recovery authority is relevant.

That latter feature remains **PROPOSED** until implementation and source authority establish it.

## 19. Signature implications

A route-corridor presentation does not itself materially alter the transit signature, but the sensing and intervention systems behind it can.

Relevant signature channels may include:

\[
\mathbf S=
[S_{EM},S_T,S_A,S_C,S_B,S_P,S_{ph},S_g,S_w]^T,
\]

representing electromagnetic, thermal, acoustic, chemical, biological, pressure, photonic, gravitic, and wake channels.

Alien machinery may redistribute signature between these channels. It does not become invisible merely because it uses unfamiliar instrumentation.

## 20. Infrastructure model

Reliable first-blocker presentation ultimately depends on a chain of infrastructure:

```text
astrometry / mass survey
        ↓
clock + reference-frame infrastructure
        ↓
route computation
        ↓
independent hazard sensing
        ↓
family-specific certification
        ↓
bridge / native operator representation
        ↓
abort + recovery authority
```

A failure in upstream navigation infrastructure may render the corridor `UNRESOLVED` even while the display hardware itself works perfectly.

## 21. Failure taxonomy

### FB-01 — DISPLAY/CERTIFICATE DIVERGENCE
The interface is showing a stale or transformed state inconsistent with the current certificate.

**Response:** invalidate the display state and reload from the authoritative packet.

### FB-02 — FIRST-BLOCKER CONFLICT
Route disposition and ordered interval evidence disagree.

**Response:** `CONFLICT`; no UI-side arbitration.

### FB-03 — FALSE ZERO
Missing distance, time, uncertainty, boundary state, or physical channel was rendered as zero.

**Response:** reject the presentation implementation.

### FB-04 — AVERAGING LEAK
A dangerous narrow interval disappeared into an average route score.

**Response:** reject the presentation implementation.

### FB-05 — PRECOMMIT VELOCITY FABRICATION
A nonlocal family was assigned a local FTL speed to generate an attractive countdown.

**Response:** remove fabricated velocity; use supplied precommit timing only.

### FB-06 — PROVENANCE COLLAPSE
The visual state no longer exposes source ancestry sufficient to reconstruct the certificate.

**Response:** mark unresolved for engineering release until provenance is restored.

## 22. Practical equipment procedure — FBC-01 Certificate intake

1. Confirm packet source is the family-segment certification runtime.
2. Confirm family and path identity.
3. Confirm calibration/normalization provenance is retained upstream.
4. Confirm segment array is nonempty.
5. Confirm route fractions are bounded and ordered.
6. Refuse display certification if evidence has been substituted by a screenshot or prose summary.

## 23. Practical equipment procedure — FBC-02 Corridor build

1. Sort intervals by `fractionStart` for presentation only.
2. Preserve original interval index.
3. Set visual span proportional to `fractionEnd-fractionStart`.
4. Preserve all blocking states.
5. Preserve `MARGINAL` as distinct from `ADMISSIBLE`.
6. Do not calculate a route average.

## 24. Practical equipment procedure — FBC-03 First-blocker verification

1. Read the certified `firstBlockingSegmentIndex`.
2. Independently identify the earliest blocking interval from the supplied segment statuses and fractions.
3. If both agree, display the interval.
4. If they disagree, set `CONFLICT`.
5. Never silently choose one source over the other.

## 25. Practical equipment procedure — FBC-04 Reachability display

1. Read certified distance-to-block.
2. Read certified time-to-block if present.
3. Read certified intervention reachability.
4. Display null values as unresolved.
5. Do not infer local velocity for PRECOMMIT families.
6. Preserve the intervention timing chain in the detailed engineering view.

## 26. Practical equipment procedure — FBC-05 Physics-channel inspection

At the first blocker, inspect environmental channels independently:

- normalized potential-depth contribution;
- normalized acceleration contribution;
- normalized tidal contribution;
- normalized curvature reference contribution;
- mass/model uncertainty;
- family-boundary state where applicable.

Do not relabel any of these as the others.

## 27. Practical equipment procedure — FBC-06 Alien-interface translation

1. Capture native presentation state non-destructively.
2. Record translation model and version.
3. Render human-readable state as an overlay or derived view.
4. Preserve native raw state and provenance.
5. Verify safety-relevant distinctions survived translation.
6. If the translation merges two native states that have different certification meanings, reject it for operational use.

## 28. Practical equipment procedure — FBC-07 Maintenance and recertification

The following remain distinct:

\[
\boxed{\text{repaired}\neq\text{recertified}}
\]

\[
\boxed{\text{healed}\neq\text{recertified}}
\]

\[
\boxed{\text{displaying}\neq\text{observing}}
\]

Following sensor replacement, neural regrowth, resonator replacement, clock-reference change, hydraulic repair, field-anchor replacement, or route-model update, repeat the appropriate calibration and route certification before restoring an operational corridor display.

## 29. Practical equipment procedure — FBC-08 Export audit

A dossier export containing this presentation should preserve:

- the complete family-segment certificate;
- the presentation model;
- first-blocker summary;
- source calibration identity;
- physical normalization identity;
- provenance roots;
- canon safeguards.

The presentation model is a convenience index. It is not a replacement for the underlying certificate.

## 30. Worked example

Assume a route contains five certified intervals:

| interval | route fraction | state | \(\eta_g\) | \(\eta_{calc}\) |
|---|---:|---|---:|---:|
| 0 | 0.02–0.15 | ADMISSIBLE | 0.96 | 0.99 |
| 1 | 0.15–0.43 | ADMISSIBLE | 0.91 | 0.97 |
| 2 | 0.43–0.47 | MARGINAL | 0.78 | 0.92 |
| 3 | 0.47–0.63 | REJECTED | 0.54 | 0.81 |
| 4 | 0.63–0.98 | ADMISSIBLE | 0.93 | 0.98 |

The route state is not the arithmetic mean of those efficiencies.

It is:

\[
C_{\rm route}=A\land A\land M\land R\land A=R.
\]

The first blocker is interval 3 at \(f_B=0.47\).

If the route baseline is

\[
L=4.0\;\mathrm{ly}
\]

and the current route fraction is \(f_c=0.10\), then the geometric distance to the blocker is

\[
D_B=(0.47-0.10)(4.0\;\mathrm{ly})=1.48\;\mathrm{ly}.
\]

This calculation is appropriate only when the baseline route geometry and certification model define the distance that way. The presentation runtime itself does not redo it; it displays the certified result.

## 31. Educational text — Transit Safety Engineering 560

### Module 1 — Evidence versus presentation
Students distinguish measured state, physical model, family response, certification, and presentation.

### Module 2 — Conjunctive safety
Students prove why an arithmetic mean cannot represent a route whose safety requirements are logical gates.

### Module 3 — Dimensional discipline
Students identify invalid equations that mix potential, acceleration, tidal gradient, curvature, uncertainty, and probability without normalization.

### Module 4 — Numerical route geometry
Students analyze interval fractions, sampled extrema, adaptive refinement, and why sampled maximum is not guaranteed analytic maximum.

### Module 5 — Human factors
Students design displays that make narrow but catastrophic blockers visible without falsifying route geometry.

### Module 6 — Alien cognition
Students translate one certificate into terrestrial, aquatic, biological, mineral, and field-mediated operator representations while preserving information content.

### Module 7 — Abort reachability
Students distinguish continuous projected-progress intervention from precommit decision horizons.

### Module 8 — Provenance
Students reconstruct a displayed blocker back through family certificate, interval evidence, physical route samples, and source observations.

## 32. Examination problem

A route display shows a blocker 0.30 ly ahead and reports a 30-minute countdown. The selected family is Fold. The family-segment certificate contains `distanceToFirstBlockingSegmentM` but `timeToFirstBlockingSegmentS = null`.

**Question:** Is the countdown admissible?

**Answer:** No. The UI has invented a local traversal velocity that the precommit model does not establish. It may display certified distance if that value is meaningful in the route model, but time remains unresolved unless supplied by the appropriate precommit certification logic.

## 33. Examination problem

A corridor has 100 intervals. Ninety-nine are `ADMISSIBLE`; one 0.2%-wide interval is `OUTSIDE_MODEL_VALIDITY`.

**Question:** May the display label the route 99% safe?

**Answer:** No. The blocking state is categorical and conjunctive. `OUTSIDE_MODEL_VALIDITY` means the governing physical approximation cannot support certification there. The correct route-level result remains blocking.

## 34. Research directions

### 34.1 Perceptual salience without geometric distortion
Develop operator displays that make catastrophic narrow intervals perceptually salient while preserving their true route-fraction span.

### 34.2 Uncertainty visualization
Represent covariance growth and common-cause uncertainty without collapsing a matrix into a misleading single confidence gauge.

### 34.3 Native alien state translation
Measure information loss when translating pressure topology, neural manifold, resonant crystal state, or electrostatic fluid logic into human displays.

### 34.4 Temporal corridor evolution
Animate route intervals under moving source ephemerides while retaining epoch and covariance provenance.

### 34.5 Multi-vessel certification
Study whether two vessels with different family, scale, sensor ancestry, recovery reserve, or maintenance state should see different blockers on the same physical route.

The expected answer is often yes: the physical corridor can be shared while certification remains vessel/family specific.

## 35. Proposed patent-class developments

All concepts in this section are **PROPOSED** and do not become canon merely by appearing here.

### 35.1 First-Blocker Provenance Capsule
A tamper-evident packet binding displayed interval geometry to the exact underlying certificate hashes, calibration profile, physical packet, and source epoch.

### 35.2 Conjunctive Corridor Interlock
A hardware or native-equivalent interlock that refuses transit commitment whenever any mandatory interval is blocking, regardless of route-average presentation.

### 35.3 Narrow-Hazard Salience Lens
A display transformation that increases perceptual prominence without changing the encoded geometric span, with explicit dual-scale annotation.

### 35.4 Native-State Translation Auditor
A system that measures whether a human-readable translation preserves the safety-relevant distinctions present in an alien native control representation.

### 35.5 Stale-Certificate Phase Fence
A route-control interlock that invalidates a corridor display when source epoch, mass model, route path, sensor ancestry, calibration profile, or maintenance certificate changes beyond the recorded validity window.

## 36. Canon and inference safeguards

1. Named-race canon outranks this generic presentation model.
2. A display cannot assign an unresolved FTL family.
3. Physical mathematics constrains the fictional model but does not prove FTL exists.
4. `DERIVED` and `PROPOSED` content stays labeled.
5. Missing values remain missing.
6. `OUTSIDE_MODEL_VALIDITY` remains blocking.
7. Presentation code does not recalculate certification.
8. The first blocker is never replaced by a route average.
9. PRECOMMIT operators are never assigned fabricated local superluminal velocity.
10. Technology basis changes embodiment, not the underlying physical/certification evidence.
11. Technology ancestry remains distinct from current ownership and operation.
12. Every exported presentation retains enough provenance to find the underlying interval certificate.

## 37. Generator rules

A generator may produce a first-blocker presentation only from an existing family-segment certification packet.

```text
IF familySegmentCertification missing
    presentation = UNRESOLVED
    DO NOT synthesize corridor safety
ELSE
    preserve all segments
    verify interval fractions
    verify certified first blocker
    IF disagreement
        status = CONFLICT
    ELSE
        display certified result
```

A procedural route archetype may still be used upstream where no authoritative physical packet exists and the governing route-safety authority permits it. This presentation layer does not decide that question.

## 38. Closing engineering doctrine

The live route display should answer four operator questions immediately:

1. **Does the selected family certify this entire route?**
2. **Where is the first interval that stops that answer from being yes?**
3. **Why does that interval block this family?**
4. **Can the vessel still intervene before commitment or arrival at the blocker?**

Everything else is supporting detail.

The display remains useful precisely because it refuses to become another source of physics.
