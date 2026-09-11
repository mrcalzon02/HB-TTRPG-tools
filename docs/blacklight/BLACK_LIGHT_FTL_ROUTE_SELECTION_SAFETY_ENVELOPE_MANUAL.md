# Black Light FTL Route Selection & Safety Envelope Manual

**Status:** DERIVED / PROPOSED engineering integration reference  
**Authority:** subordinate to `BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md` and any specific named race, vessel, manufacturer, installation, or technology source  
**Primary design-intent source:** *The different lightspeed methods*  
**Google Drive document:** `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`  
**Source revision:** `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`

## 1. Purpose

This manual defines how a Black Light EXO operator, engineer, investigator, simulator, or generator should move from **drive capability** to **route-specific certification** without silently converting a clean-space performance number into permission to transit.

The governing design source establishes several constraints that must survive implementation: different FTL families lose efficiency differently near gravity; errors propagate differently by family; gravitational-shear travel can encounter catastrophic forks; each family requires its own safety-sensing and emergency de-transit architecture; more advanced systems gain larger warning and recovery margins without becoming perfectly safe; and the engineering corpus should be documented deeply enough to support education, maintenance, design history, and incremental technological development.

Accordingly:

\[
\boxed{\text{generated capability}\neq\text{route certification}}
\]

and:

\[
\boxed{\text{route certification}\neq\text{setting-wide physical law}}
\]

Numerical profiles used by the current EXO runtime are labeled simulation calibration unless a higher-authority source says otherwise.

---

## 2. Authority and provenance chain

```text
Named race / vessel / manufacturer / installation canon
                         |
                         v
BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md
                         |
                         v
Family physics + engineering registries
                         |
                         v
Versioned calibration profile
                         |
                         v
Generated drive capability
                         |
                         v
Route environmental packet
                         |
                         v
Safety certificate
                         |
             +-----------+-----------+
             |                       |
             v                       v
Route selector guard          Dossier/export record
```

The direction of authority is downward. A generated route matrix cannot rewrite a named civilization's canon. A derived coefficient cannot become a physical constant merely because it appears in a user interface.

### Provenance rule

Every numerical certificate should retain enough information to reconstruct:

- transit family;
- route archetype or measured route state;
- maturity/path level;
- calibration profile identity and version;
- named overrides, if any;
- environment packet origin;
- uncertainty/covariance origin;
- reasons for rejection or marginality;
- protected recovery state;
- hazard-observability state.

Historical certificates are records of the assumptions and calibration active when they were issued. Updating a calibration profile does not retroactively rewrite them.

---

## 3. Route-selection state machine

```text
                    +----------------------+
                    | generated drive      |
                    | capability exists    |
                    +----------+-----------+
                               |
                               v
                    +----------------------+
                    | resolve route matrix |
                    +----------+-----------+
                               |
               +---------------+----------------+
               |               |                |
               v               v                v
          ADMISSIBLE        MARGINAL       REJECTED /
                                             UNRESOLVED /
                                             CONFLICT
               |               |                |
               v               v                v
        selectable and    selectable with   blocked as a
        certifiable       warning/reduced   normal alternate
                          authority
```

The currently selected route may remain visible even when blocked so the operator can understand *why* it failed. Other blocked alternatives should not masquerade as ordinary choices.

A route-control guard is therefore a presentation of an engineering conclusion, not a replacement for the underlying conclusion.

---

## 4. Environmental model

The shared route environment is represented as:

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

- \(|\Phi|\) is potential magnitude;
- \(|\nabla\Phi|\) is gravitational acceleration/gradient magnitude;
- \(\|\mathsf T\|\) is tidal burden;
- \(\|R\|\) is curvature burden;
- \(U_m\) is mass-model uncertainty;
- \(P_h\) is hidden-mass probability or equivalent incomplete-map burden;
- \(B_f\) is a family-specific boundary/topology hazard term.

The uncertainty state is independent:

\[
\mathbf U_E=
[
\Sigma_{eph},
\Sigma_{mass},
\Sigma_{clock},
\Sigma_{sensor},
\Sigma_{reg},
\Sigma_{model},
\Sigma_{common}
]^T.
\]

A severe environment with a good map and a moderate environment with a bad map are not equivalent engineering problems.

---

## 5. Family-specific gravity and calculation loss

The current derived family penalty model is:

\[
P_f=a_fG+b_fG^2+c_fG^{n_f}+d_fU_m+e_fB_f
\]

and retained gravity/environment efficiency is:

\[
\eta_{g,f}=e^{-P_f}.
\]

Calculation efficiency is represented separately:

\[
\eta_{calc,f}=
\exp[-k_fA_f^2\operatorname{tr}(\Sigma_E)].
\]

This separation is necessary. A Gravitational-Plane Skimmer may be dominated by changing gravitational topology and shear forks, while a Q-Lattice system may tolerate ordinary gravity better but become dangerously sensitive to reference identity, epoch mismatch, or address covariance.

### Engineering interpretation chart

| Family | Dominant route question | Typical rejection concern |
|---|---|---|
| Inertial Torch | Can the vehicle accelerate, brake, reject heat, and survive? | braking/thermal margin |
| Metric Compression | Can the metric envelope remain closed, symmetric, and unwind safely? | curvature/tidal distortion |
| Gravitational-Plane | Is the gravitational route single-valued and recoverable? | shear-lane fork / recoupling failure |
| Slipstream Shear | Can the vessel maintain and then safely break boundary adhesion? | adhesion/detachment/wake instability |
| Q-Lattice | Is the destination/reference address authentic and current? | epoch/reference corruption |
| N-Manifold | Is the embedding and return map sufficiently conditioned? | failed return solution |
| Fold Jump | Is the endpoint proof good enough before commit? | endpoint covariance/occupancy |
| Wormhole/Gate | Can both mouths and the throat remain synchronized and closable? | throat collapse / paired-mouth disagreement |
| Phase Displacement | Is full-object coverage and destination-state continuity demonstrable? | incomplete reconciliation |

This chart is an engineering interpretation of already established family differences, not a claim that every civilization implements them identically.

---

## 6. Actionable lookahead

Safety sensing is meaningful only when the machine can still react.

For continuously traversed routes:

\[
D_{predict}=v_{projected}t_{predict}
\]

\[
D_{intervene}=v_{projected}t_{int}
\]

and:

\[
M_D=D_{predict}-D_{intervene}.
\]

The intervention chain is:

\[
t_{int}=t_{sensor}+t_{solver}+t_{decision}+t_{command}+t_{actuate}+t_{exit}+t_{clear}+t_{margin}.
\]

The route requires:

\[
M_D>0.
\]

For Fold, Q-Lattice, Phase Displacement, and other effectively nonlocal commit models, forcing a fictitious local superluminal hull velocity into the equation is inappropriate. Those systems instead use a precommit timing condition:

\[
M_T=t_{prediction}-t_{int}>0.
\]

The practical doctrine is unchanged:

\[
\boxed{\text{detectable hazard}\neq\text{avoidable hazard}}
\]

---

## 7. Hazard observability

A required hazard channel may be satisfied by either direct observation or an independently validated guard channel.

Let:

\[
H_R=\{h_1,h_2,\ldots,h_n\}
\]

be the required hazard set, \(H_O\) the directly observed set, and \(H_G\) the independently guarded set. Certification requires:

\[
H_R\subseteq H_O\cup H_G.
\]

If a required hazard falls outside both:

\[
\boxed{\text{loss of hazard observability}\Rightarrow\text{reject or abort}}
\]

This is particularly important when multiple displays inherit one damaged clock, mass model, sensor fusion root, or calibration table. Agreement among dependent displays is not independent redundancy.

---

## 8. Protected recovery reserve

Nominal performance cannot consume the machine's final survival mechanism.

\[
R_{available,nominal}=R_{total}-R_{protected}
\]

with:

\[
R_{protected}\ge R_{required,recovery}.
\]

Family-specific examples include:

- Metric unwind authority;
- Gravitational-Plane decoupling and recoupling authority;
- Slipstream detachment authority;
- Q-Lattice rejection authority;
- N-Manifold return-map authority;
- Fold closure/recovery authority;
- Gate throat stabilization and closure;
- Phase reconciliation;
- Inertial braking and thermal survival reserve.

The operating rule is simple:

\[
\boxed{\text{more nominal power}\not\Rightarrow\text{more recovery margin}}
\]

---

## 9. Five-axis engineering safety envelope

The live interface visualizes five independent normalized quantities rather than one synthetic "safety percentage."

```text
                gravity retention
                       1.0
                        |
                        |
 calculation <----------+----------> actionable
 retention              |           lookahead
                        |
                        |
               recovery + observability
```

The axes are:

1. gravity/environment retention \(\eta_{g,f}\);
2. calculation retention \(\eta_{calc,f}\);
3. actionable lookahead margin;
4. protected recovery margin;
5. hazard-observability coverage.

Environment severity is shown separately because severity is a burden, not a positive margin.

### Why the envelope is not averaged

Suppose a route has:

- gravity retention = 0.92;
- calculation retention = 0.95;
- lookahead margin = 0.80;
- recovery margin = 0.76;
- hazard observability = 0.00.

The mean is 0.686. Calling that route "69% safe" would be engineering malpractice. A completely unobserved required hazard is a blocking failure regardless of the other four numbers.

The correct composition is therefore constraint-based rather than average-based:

\[
C_{route}=\bigwedge_i C_i.
\]

---

## 10. Route matrix

For a fixed generated machine and selected family, the route matrix evaluates every route archetype using the same calibration lineage.

```text
                           ROUTE MATRIX

Deep space ................. ADMISSIBLE
Planetary well ............. MARGINAL
Gas giant .................. REJECTED
Binary system .............. REJECTED
Compact-object region ...... REJECTED
Nebula ..................... ADMISSIBLE
Uncharted route ............ UNRESOLVED
Q/N-disturbed region ....... CONFLICT / REJECTED
```

The values above are an illustrative chart, not a canonical outcome.

The matrix provides two benefits:

- the operator sees that certification is route-dependent;
- blocked alternatives can be visibly marked and guarded before they are mistaken for ordinary choices.

### Selector behavior

The current route remains visible even when rejected so the failed case can be inspected. Other `REJECTED`, `UNRESOLVED`, or `CONFLICT` options are guarded from ordinary selection after the matrix is resolved.

Changing route or family triggers recertification against the already generated drive rather than waiting for another full generation cycle.

---

## 11. Failure taxonomy

### 11.1 Gravity-dominated failure

Symptoms:

- rapid decline in \(\eta_{g,f}\);
- increasing source/power burden;
- unstable geometry or route topology;
- family-specific gravity hazard warnings.

Response:

- reduce authority if physically meaningful;
- increase stand-off distance;
- choose a lower-hazard route;
- reject transit when no common safe state exists.

### 11.2 Calculation-dominated failure

Symptoms:

- acceptable gravity retention;
- poor \(\eta_{calc,f}\);
- large covariance;
- unstable endpoint/reference/return solution.

Response:

- improve map/reference quality;
- recalibrate clocks and registration;
- reacquire independent observations;
- reject commit until uncertainty becomes bounded.

### 11.3 Observability failure

Symptoms:

- saturated sensors;
- shared-reference disagreement;
- missing required hazard channel;
- a failed primary channel without an independent guard.

Response:

- abort or refuse commit;
- restore independent sensing;
- do not translate silence into a negative detection.

### 11.4 Recovery failure

Symptoms:

- protected reserve below required reserve;
- recovery path shares a common failure with the primary system;
- nominal optimization consumes recovery authority.

Response:

- physically escrow recovery authority;
- reduce nominal capability;
- repair independent recovery path;
- refuse transit.

### 11.5 Provenance failure

Symptoms:

- calibration version unknown;
- family inferred from source-local vocabulary;
- generated values represented as measurements;
- named-race override replaced by a generic profile.

Response:

- mark `UNRESOLVED` or `CONFLICT`;
- recover the authority chain;
- do not fabricate the missing fact.

---

## 12. Machinery embodiments by technology basis

The same mathematical requirement can have radically different machinery embodiments.

A conventional industrial civilization may implement hazard sensing through interferometers, precision clocks, field probes, and redundant processors. A wet-machine civilization may implement the same role through fluidic sensor bodies, distributed electrochemical timing, deformable field vanes, and living calibration tissues. A post-material architecture may distribute reference identity across a Q-Lattice or phase-state consensus system.

The generator may vary embodiment only when it preserves function and provenance.

### Embodiment rule

```text
required function
      |
      v
technology basis
      |
      v
machinery embodiment
      |
      v
maintenance burden
      |
      v
failure signature
```

It may not reverse this chain and invent civilization history merely because a visually interesting component was generated.

---

## 13. Scaling behavior

Transit machinery does not scale as one reactor-power number.

A useful derived scaling burden is:

\[
B_{scale}=
C_V\left(\frac{V}{V_0}\right)^{\alpha_V}
+C_A\left(\frac{A}{A_0}\right)^{\alpha_A}
+C_L\left(\frac{L}{L_0}\right)^{\alpha_L}
+C_S\left(\frac{L_{sync}}{L_{sync,0}}\right)^{\alpha_S}.
\]

Protected volume, boundary area, structural span, synchronization distance, sensor baseline, heat rejection, field-control bandwidth, and recovery reserve may scale differently.

Operational authority is a weakest-link problem:

\[
A_{op}=\min(M_{sensor},M_{recovery},M_{structure},M_{thermal},M_{control}).
\]

A capital ship with a vast power plant can therefore be less certifiable in a difficult environment than a smaller vessel with superior sensing, geometry control, and recovery authority.

---

## 14. Signature model

Certification and stealth may conflict.

A generalized signature vector remains:

\[
\mathbf S=
[S_{EM},S_{thermal},S_{grav},S_{topology},S_{subspace},S_{wake},S_{bio}]^T.
\]

Improving lookahead may require more active sensing. Increasing recovery reserve may require energized standby machinery. Route-conditioning infrastructure may leave persistent wakes. A stealth doctrine therefore cannot simply suppress every observable channel without potentially reducing safety.

A design trade is:

\[
U=U_{mission}-\lambda_s S-\lambda_r R_{risk}-\lambda_u U_{uncertainty}.
\]

The coefficients are doctrine-dependent and remain derived unless a named source specifies them.

---

## 15. Practical equipment procedures

### RSSE-01 — Route Matrix Certification

**Purpose:** establish the status of every available route archetype for one generated drive/family state.

1. Verify generated family and maturity/path level.
2. Verify calibration profile identity and version.
3. Resolve the active route certificate.
4. Resolve every alternate route using the same generated drive state.
5. Record `ADMISSIBLE`, `MARGINAL`, `REJECTED`, `UNRESOLVED`, or `CONFLICT` separately.
6. Guard blocked alternatives from ordinary selection.
7. Preserve the currently selected blocked route for diagnosis rather than silently changing it.
8. Export the matrix with the dossier.

**Acceptance:** no blocked route is visually indistinguishable from an admissible route.

### RSSE-02 — Gravity Retention Audit

1. Verify environmental packet provenance.
2. Confirm the family coefficient set belongs to the active versioned profile.
3. Compute normalized severity \(G\).
4. Compute \(P_f\).
5. Compute \(\eta_{g,f}\).
6. Compare against the profile threshold.
7. Never label a profile coefficient a universal constant.

### RSSE-03 — Calculation Retention Audit

1. Audit covariance ancestry.
2. Remove duplicated dependent observations from any independence claim.
3. Compute the covariance-trace proxy.
4. Apply family-specific amplification \(A_f\).
5. Compute \(\eta_{calc,f}\).
6. Reject the route if the versioned threshold is violated.

### RSSE-04 — Actionable Lookahead Audit

1. Measure or derive the prediction horizon.
2. Sum every intervention delay.
3. Use distance margin for continuous traversal.
4. Use time/precommit margin for nonlocal commit architectures.
5. Reject non-positive margin.
6. Mark marginal positive margin separately from comfortable margin.

### RSSE-05 — Hazard Observability Audit

1. List required route hazards.
2. Add family-specific hazards.
3. Map each to a direct sensor or independent guard.
4. Trace shared clocks, references, processors, and power sources.
5. Reject false redundancy.
6. Reject or abort when an uncovered required hazard remains.

### RSSE-06 — Protected Recovery Audit

1. Identify the family-specific recovery mechanism.
2. Measure total recovery authority.
3. Physically or logically escrow the protected portion.
4. Calculate required recovery authority for this route.
5. Verify positive recovery margin.
6. Confirm nominal optimization cannot spend the protected reserve.

### RSSE-07 — Route-Control Guard Verification

1. Generate a dossier.
2. Allow the route matrix to resolve.
3. Confirm every route option is labeled with its modeled state.
4. Confirm blocked alternatives are disabled.
5. Confirm the selected blocked route remains inspectable.
6. Change family and verify recertification occurs without stale results overwriting the new state.
7. Change route and verify the summary and engineering envelope update.

### RSSE-08 — Dossier Export Audit

1. Confirm the current certificate exists.
2. Confirm the route matrix exists.
3. Confirm `generatedCapabilityIsNotRouteCertification=true`.
4. Confirm blocking state is explicit.
5. Confirm calibration/provenance roots are retained.
6. Confirm the original generated engineering record remains intact.

---

## 16. Educational text — introductory module

### Lesson: Why 5,000c is not a route clearance

A propulsion student is given a drive with a clean-space performance rating of 5,000c. The assigned destination lies behind a multiple-star region with a changing barycenter and poorly constrained hidden mass.

The wrong solution is to reduce 5,000c by an arbitrary percentage and call the result a certified speed.

The correct analysis asks:

- Which transit family is operating?
- How strongly does this family couple to the gravitational environment?
- How uncertain is the map?
- What family-specific hazard exists here?
- How far ahead can the safety system detect it?
- Can the machine complete its exit/recovery chain in time?
- Is sufficient independent recovery authority protected?

Only after these questions are answered does a route disposition exist.

### Exercise

Explain why three bridge displays that all use the same forward gravimetric solution do not constitute three independent hazard sensors.

**Expected concept:** display count is not sensor ancestry. Common-cause failure remains common-cause failure.

---

## 17. Advanced course — Transit Certification Engineering 602

### Unit I — Operator-sensitive gravitational environments

Students derive family penalties from a common environmental vector while preserving separate coefficient provenance.

### Unit II — Covariance-aware route planning

Students construct uncertainty packets and identify false independence caused by shared clocks, maps, calibration tables, and reconstruction models.

### Unit III — Intervention reachability

Students prove whether a hazard discovered at time \(t_0\) can still be escaped before irreversible state \(t_c\).

### Unit IV — Recovery escrow

Students design a control architecture in which the optimization system physically cannot spend the final recovery reserve.

### Unit V — Human-machine presentation

Students must present a rejected route in a way that preserves diagnostic information without making it appear selectable for ordinary transit.

---

## 18. Thesis and research directions

### TCE-602-T1 — Shear-fork prediction under incomplete mass models

Develop a probabilistic topology predictor for gravitational-plane transit without assuming the lane remains single-valued between observation updates.

### TCE-602-T2 — Common-cause-resistant transit sensing

Design sensing packages whose independent guard channels do not share clock, processor, power, spatial registration, or calibration ancestry with the primary channel.

### TCE-602-T3 — Recovery-reserve escrow architectures

Compare mechanical, computational, field-topological, and biological methods for guaranteeing that nominal operation cannot consume the final recovery mechanism.

### TCE-602-T4 — Cross-family route uncertainty translation

Develop a representation capable of translating one measured environment into family-specific uncertainty without flattening all operators into one generic FTL risk score.

### TCE-602-T5 — Certification-state human factors

Measure whether operators correctly distinguish generated capability, modeled route certification, and live operational clearance when interfaces contain large headline performance numbers.

---

## 19. Proposed patent-style developments

The following are **PROPOSED** technologies, not retroactive history.

### BL-PAT-RSSE-01 — Independent Hazard Ancestry Meter

A diagnostic controller that traces each hazard indication to sensor, clock, calibration, processor, power, and registration ancestry and refuses to count dependent channels as redundant.

### BL-PAT-RSSE-02 — Recovery Authority Escrow Interlock

A hardware/field-control interlock that places the protected recovery reserve outside the nominal performance optimizer's reachable command space.

### BL-PAT-RSSE-03 — Shear Fork Predictive Interferometer

A family-specific gravimetric array optimized to detect divergence in candidate gravitational-shear routes before the vessel enters the unrecoverable fork region.

### BL-PAT-RSSE-04 — Route Certificate Provenance Capsule

A tamper-evident certificate object retaining environment epoch, family, path, calibration version, covariance ancestry, safety margins, rejection reasons, and recertification lineage.

### BL-PAT-RSSE-05 — Multi-Family Environmental Translator

A controller that accepts one measured route environment and produces separate family-specific hazard/covariance packets without declaring the families physically equivalent.

---

## 20. API and export contract

The live EXO interface consumes:

```text
resolveGeneratedFTLRouteSafety({
  rating,
  request: { family, route }
})
```

and exposes the current result through:

```text
BlacklightExoGetActiveFTLSafety()
```

The route matrix is exposed through:

```text
BlacklightExoGetActiveFTLRouteMatrix()
```

The dossier export appends:

```json
{
  "routeSafetyCertificate": {},
  "routeSafetyMatrix": {},
  "certificationExport": {
    "schemaVersion": "1.1.0",
    "generatedCapabilityIsNotRouteCertification": true,
    "blocked": false,
    "status": "ADMISSIBLE",
    "routeSelectorGuarded": true,
    "provenance": []
  }
}
```

The structural validation boundary is:

`data/schemas/exo-vessel-ftl-live-route-certification.schema.json`

That schema validates data transport, not physical truth.

---

## 21. Canon safeguards

1. Source-local terminology does not automatically map to a consolidated family.
2. A generic calibration profile does not establish named-race performance.
3. Generated route values are not field measurements.
4. `UNRESOLVED` is a valid answer and must not be replaced with zero.
5. `CONFLICT` is a valid authority state and must not be silently averaged away.
6. More power does not override missing observability or recovery.
7. More displays do not prove independent sensing.
8. A route matrix is an implementation decision aid, not civilization history.
9. A disabled route option reflects the active modeled certificate, not an eternal physical prohibition.
10. A later calibration revision requires recertification; it does not rewrite the original certificate.
11. Named source facts outrank generic simulation calibration.
12. DERIVED mathematics must remain labeled as derived.
13. PROPOSED technologies, patents, thresholds, and research programs must remain labeled as proposed.

---

## 22. Readability doctrine

The engineering corpus should remain dense without becoming opaque. Every advanced mathematical layer should therefore answer four questions in plain language:

**What is being measured or modeled?**  
**Why does it matter operationally?**  
**What can make the result wrong?**  
**What happens when the answer is unsafe or unresolved?**

A believable interstellar engineering tradition is not created by adding more jargon. It is created by showing the machinery, mathematics, training, maintenance practice, failure evidence, provenance, and generations of incremental improvement that connect a theory to a machine people can actually operate.
