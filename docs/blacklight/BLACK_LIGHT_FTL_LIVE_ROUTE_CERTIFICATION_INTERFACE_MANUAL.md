# Black Light FTL Live Route Certification Interface Manual

Status: **DERIVED / PROPOSED implementation authority**  
Primary authority: `BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md`  
Design-intent source: **The different lightspeed methods** (`1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`)  
Current design-source revision: `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`

## 1. Purpose

This manual governs the presentation boundary between a generated propulsion/transit architecture and the family-specific route-safety certification system.

The generator answers:

> What can this machine theoretically do under the generated engineering model?

The route certificate answers:

> Is this machine, at this maturity, with this sensor/recovery architecture, admissible on this modeled route environment?

These are not interchangeable questions.

\[
\boxed{\text{generated capability}\neq\text{certified route capability}}
\]

A high clean-space rating must never cause `REJECTED`, `UNRESOLVED`, or `CONFLICT` to be displayed as an ordinary usable transit rate.

## 2. Authority chain

```text
Named race / vessel / manufacturer canon
                ↓
BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY
                ↓
Family mathematics + gravity/safety models
                ↓
Versioned safety calibration profile
                ↓
Route-environment integration model
                ↓
Safety certification runtime
                ↓
LIVE UI CERTIFICATION GATE
                ↓
Displayed dossier + exported dossier JSON
```

The UI layer has no authority to invent family mappings, physical constants, manufacturer specifications, historical facts, or named-race performance.

## 3. Runtime embodiment

The live EXO FTL page already loads `blacklight-exo-ftl-certification-ui.js`. That existing certification authority point now lazily loads, in dependency order:

1. `blacklight-exo-ftl-safety-calibration-runtime.js`
2. `blacklight-exo-ftl-safety-certification-runtime.js`
3. `blacklight-exo-ftl-route-safety-runtime.js`

This avoids creating a second page controller or duplicating the generator.

The active route certificate is exposed through:

```js
BlacklightExoGetActiveFTLSafety()
```

The generator's existing active rating remains available through:

```js
BlacklightExoGetActiveFTL()
```

The separation is deliberate.

## 4. Certification state machine

```text
GENERATED ARCHITECTURE
        │
        ▼
resolveGeneratedFTLRouteSafety(...)
        │
        ├── ADMISSIBLE ──► show generated rate + CERTIFIED
        │
        ├── MARGINAL ────► show generated rate + MARGINAL
        │
        ├── REJECTED ────► suppress ordinary certified-rate presentation
        │
        ├── UNRESOLVED ──► suppress ordinary certified-rate presentation
        │
        └── CONFLICT ────► suppress ordinary certified-rate presentation
```

Blocking states are:

\[
B=\{\text{REJECTED},\text{UNRESOLVED},\text{CONFLICT}\}.
\]

The page summary must therefore apply:

\[
R_{display}=\begin{cases}
R_{generated}+\text{CERTIFIED}, & C=\text{ADMISSIBLE}\\
R_{generated}+\text{MARGINAL}, & C=\text{MARGINAL}\\
\text{certificate disposition}, & C\in B
\end{cases}
\]

This is a presentation safeguard, not a new physical law.

## 5. Family preservation

The user may request a specific family, or may allow the generator to select a tier-compatible family.

If the UI selector is `random`, the certification adapter **must not** pass the literal string `random` into the family mapper. It must defer to the generated architecture's actual family.

\[
F_{cert}=\begin{cases}
F_{selected},&F_{selected}\neq\text{random}\\
F_{generated},&F_{selected}=\text{random}
\end{cases}
\]

This prevents an otherwise valid generated architecture from becoming spuriously `UNRESOLVED` at the certification boundary.

## 6. Environmental and calculation model

The live interface consumes the established route-environment vector:

\[
\mathbf E_r=
[|\Phi|,|\nabla\Phi|,\|\mathsf T\|,\|R\|,U_m,P_h,B_f]^T.
\]

Family response remains:

\[
P_f=a_fG+b_fG^2+c_fG^{n_f}+d_fU_m+e_fB_f,
\]

\[
\eta_{g,f}=e^{-P_f}.
\]

Calculation uncertainty remains independently represented:

\[
\eta_{calc,f}=
\exp[-k_fA_f^2\operatorname{tr}(\Sigma_E)].
\]

The interface displays these as engineering findings only when finite values are returned. Missing values remain **unresolved** rather than becoming zero.

## 7. Lookahead and intervention

Safety still depends on sufficient actionable time:

\[
t_{int}=t_{sensor}+t_{solver}+t_{decision}+t_{command}+t_{actuate}+t_{exit}+t_{clear}+t_{margin}.
\]

A certification can remain admissible only when the family-specific prediction/commit horizon exceeds the physical intervention burden with required margin.

For Fold, Q-Lattice, and Phase Displacement, the decision horizon is precommit rather than a fictitious local superluminal hull velocity.

## 8. Recovery reserve

Nominal operation may not consume the final recovery path:

\[
R_{available,nominal}=R_{total}-R_{protected}.
\]

\[
R_{protected}\ge R_{required,recovery}.
\]

Examples include Metric unwind, gravitational-plane recoupling, Slipstream detachment, Q-Lattice rejection, N-Manifold return, Fold closure, gate stabilization/closure, and Phase reconciliation.

## 9. UI readout chart

| Certificate state | Summary behavior | Export behavior | Operator meaning |
|---|---|---|---|
| ADMISSIBLE | Generated route rate plus `CERTIFIED` | Certificate embedded | Modeled route accepted |
| MARGINAL | Generated route rate plus `MARGINAL` | Certificate embedded | Reduced margin; operational caution |
| REJECTED | No ordinary certified-rate presentation | Certificate embedded and blocking | Route not authorized |
| UNRESOLVED | No ordinary certified-rate presentation | Certificate embedded and blocking | Evidence/model incomplete |
| CONFLICT | No ordinary certified-rate presentation | Certificate embedded and blocking | Calibration authority disagreement |

## 10. Export contract

The live export adds:

```json
{
  "routeSafetyCertificate": {},
  "certificationExport": {
    "schemaVersion": "1.0.0",
    "generatedCapabilityIsNotRouteCertification": true,
    "blocked": false,
    "status": "ADMISSIBLE",
    "provenance": []
  }
}
```

The certificate is embedded beside the generated architecture rather than rewriting generator fields.

This preserves replayability and prevents later consumers from confusing a route-safety decision with the generator's clean-space performance model.

## 11. Practical equipment procedure RCUI-01 — Live certificate verification

**Purpose:** verify that a generated dossier receives the route certificate before being treated as operationally usable.

1. Generate an architecture.
2. Record family, maturity/path, and route environment.
3. Confirm a `Route certificate` badge appears.
4. Confirm a modeled route-safety section appears in the certification corpus.
5. Compare the generated rate with the summary readout.
6. If the certificate is blocking, verify the summary displays the certificate disposition rather than an ordinary certified transit rate.
7. Export the dossier.
8. Verify `routeSafetyCertificate` and `certificationExport` exist.
9. Verify profile identity and provenance are retained.
10. Reject any export where generated capability is presented as route authorization without the certificate.

## 12. Practical equipment procedure RCUI-02 — Random-family preservation

1. Set Drive Family to `Tier-compatible drive family`.
2. Generate the dossier.
3. Record the actual generated family.
4. Run route certification.
5. Confirm certification uses the generated family rather than the selector token `random`.
6. If the family cannot be mapped, return `UNRESOLVED`; do not choose another family.

## 13. Practical equipment procedure RCUI-03 — Blocked route audit

For a `REJECTED`, `UNRESOLVED`, or `CONFLICT` route:

1. retain clean-space and route-degraded engineering calculations in the technical dossier;
2. do not delete them—they remain useful evidence of machine capability;
3. suppress their presentation as an authorized route rate;
4. display the blocking certificate state and reason;
5. retain calibration profile identity;
6. retain route-environment provenance;
7. preserve recovery and observability findings;
8. require recertification after any model, route, sensor, or recovery change.

## 14. Practical equipment procedure RCUI-04 — Calibration provenance audit

A displayed numerical safety result must retain the exact profile identity:

\[
P_t=(profileId,profileVersion).
\]

If the profile changes later, the old route certificate remains historically tied to its original profile.

\[
C_t=F(E_t,M_t,R_t,P_t).
\]

A later profile revision requires a new certificate; it does not silently rewrite the old result.

## 15. Failure modes

### 15.1 Runtime unavailable

The UI returns a blocking `UNRESOLVED` disposition. It does not fall back to treating the generated speed as certified.

### 15.2 Stale asynchronous result

Each generation receives a monotonically increasing local token. A slower certificate from an older generation is discarded if a newer generation has already begun.

This avoids:

```text
Generation A starts certification
Generation B is generated
Generation B displays
Generation A finally resolves
X Generation A must NOT overwrite B
```

### 15.3 Calibration conflict

Conflicting equally ranked calibration authority produces `CONFLICT`, not an averaged coefficient.

### 15.4 Missing family map

Missing family mapping produces `UNRESOLVED`. The UI may not infer a family from vocabulary resemblance.

### 15.5 Missing numerical field

`null`, `undefined`, and empty values remain unresolved. They are not numerical zero.

## 16. Signature and observability consequences

A route certificate depends on the ability to observe the family-specific hazards that matter. Reducing emissions, active sensing, beacon use, or external references may improve stealth while decreasing certification margin.

A useful operational trade model is:

\[
U_{mission}=w_sS_{stealth}+w_mM_{margin}+w_rR_{recovery}-w_hH_{unobserved}.
\]

This is a **PROPOSED** mission-planning utility function, not canon physics.

The invariant remains:

\[
\boxed{\text{loss of hazard observability}\Rightarrow\text{reject or abort}}
\]

unless an independently validated guard channel survives.

## 17. Scaling behavior

Larger installations cannot be certified merely by scaling reactor output.

\[
A_{operational}=\min(M_{sensor},M_{recovery},M_{structure},M_{thermal},M_{control}).
\]

A capital ship with extraordinary energy production can remain uncertifiable if sensor baseline, field coherence, structural alignment, endpoint validation, or recovery authority does not scale with protected volume.

## 18. Educational text — Transit Certification Engineering 214

Students should be able to explain why each statement is false:

- “The drive can do 5,000c, therefore this route is certified for 5,000c.”
- “The route has low absolute gravity, therefore gravitational shear is harmless.”
- “Three displays agree, therefore we have three independent sensors.”
- “A newer calibration profile should update all old certificates automatically.”
- “The user chose random family, therefore certification should choose a family independently.”
- “No hazard was detected, therefore the hazard was absent.”

A successful answer must distinguish capability, observability, covariance, calibration provenance, generated family identity, and route admission.

## 19. Advanced exercise

Given two candidate routes with identical generated transit rate, compare:

\[
\mathcal R_1=(G=0.25,U_m=0.05,B_f=0.08),
\]

\[
\mathcal R_2=(G=0.16,U_m=0.31,B_f=0.22).
\]

Students must show why a topology/reference-sensitive family may reject the apparently “milder” second gravity environment because uncertainty and family-boundary hazard dominate its certification model.

## 20. Research and thesis directions

`PROPOSED` research programs include:

- covariance-aware UI explanations that show why apparently redundant sensors are not independent;
- route-certificate replay across calibration versions;
- family-specific human factors for communicating `MARGINAL` without encouraging operators to treat it as ordinary clearance;
- certification-envelope visualization for gravitational shear-lane forks;
- automatic provenance diffing between generated capability and operational certificate;
- recovery-reserve escrow hardware that exposes protected authority directly to the certificate runtime.

## 21. Patent-style development concepts

All concepts below are **PROPOSED** and do not establish inventors, manufacturers, dates, or historical adoption.

### 21.1 Provenance-locked route certificate capsule

A tamper-evident data object binding route state, family, calibration profile, sensor ancestry, recovery reserve, and certificate disposition.

### 21.2 Independent route hazard ancestry display

A bridge display that groups hazard readings by physical sensor/reference ancestry so duplicated displays cannot masquerade as independent evidence.

### 21.3 Recovery-reserve escrow interlock

A hardware gate preventing optimization software from assigning protected de-transit/closure authority to nominal performance.

### 21.4 Certificate-aware navigation selector

A navigation control that visually distinguishes generated routes from admissible routes and refuses to label blocking states as certified transit solutions.

## 22. Generator safeguards

1. Never auto-select a different family to obtain a passing certificate.
2. Never convert `UNRESOLVED` to zero risk.
3. Never average conflicting calibration authority.
4. Never erase generated capability when a route is rejected.
5. Never present generated capability as authorized route performance when the certificate blocks it.
6. Never promote PROPOSED simulation coefficients into named-race canon.
7. Never infer Mur'rek `gravitic slipstream` family identity from vocabulary alone.
8. Never resolve the Ar'nock family without higher-authority evidence.
9. Always retain calibration identity and provenance in exported certification records.
10. Treat recertification as a new event, not retroactive mutation.

## 23. Closing engineering rule

The live page should make the distinction visible without forcing the operator to understand the entire mathematical corpus first:

\[
\boxed{\text{The machine's capability is a property of the machine model.}}
\]

\[
\boxed{\text{The certificate is a property of machine + route + evidence + calibration + recovery.}}
\]

The interface may display both. It may never pretend they are the same thing.
