# Black Light FTL Technical Volume: Q-Lattice Phase Translation

**Authority status:** MIXED  
**Family:** Q-Lattice Phase Translation  
**Primary authority:** `docs/blacklight/BLACK_LIGHT_PROPULSION_TRANSIT_AUTHORITY.md`  
**Machine-readable companion:** `data/exo-vessel/ftl-q-lattice-technical-volume.json`  
**Legacy design source:** Google Drive document **“The different lightspeed methods”**, file `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`, current observed revision `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`.

Confirmed family identity, physical action, recovered Path implementation names, named race/manufacturer systems, and adopted setting facts outrank this volume. New mathematics and generic engineering consequences below are **DERIVED** unless explicitly identified otherwise. Numerical thresholds, historical incidents, inventors, institutions, ownership, and race assignments are **PROPOSED** or **UNRESOLVED** unless independently sourced.

---

## 1. Family identity

Q-Lattice translation is not a warp envelope, a gravitational shear-plane ride, or a slipstream boundary ride. Its defining operation is discrete: a protected vessel state is translated through **indexed quantized Q addresses** that are only mutually usable during valid phase epochs.

The core engineering question is therefore not “How fast can the ship cross ordinary distance?” but:

> Which sequence of authenticated Q-address transitions is valid for this vessel, during these epochs, with this reference solution, while preserving the protected state and leaving enough authority to reject or recover from a bad edge?

This difference must survive every generator, UI, API, educational text, and machinery embodiment.

---

## 2. Discrete address-space model

**DERIVED mathematical model.** Represent the locally usable Q-Lattice as a directed time-indexed graph

\[
G_Q(t)=(V_Q,E_Q),
\]

where each vertex \(\alpha\in V_Q\) is a stable quantized Q address and each edge

\[
e_{\alpha\beta}(t)\in E_Q
\]

represents a physically admissible protected-state translation from address \(\alpha\) to \(\beta\) during a valid phase epoch.

A practical address descriptor is

\[
A_Q=(\alpha,\tau,\mathcal F,\mathcal R,\Sigma_A),
\]

with address index \(\alpha\), phase epoch \(\tau\), destination/reference frame \(\mathcal F\), authenticated reference set \(\mathcal R\), and address covariance \(\Sigma_A\).

Ordinary-space separation does not determine adjacency. Two locations that are physically close can be far apart in the usable lattice; two locations separated by many light-years can, under the correct epoch and address conditions, be separated by very few admissible graph edges.

```text
NORMAL-SPACE MAP

 A --------- 3 ly --------- B ---------------------- 20 ly ---------------------- C

Q-LATTICE MAP AT EPOCH tau_1

 [A:17] ---> [X:04] ---> [C:81]
    \
     X----> [B:22]     edge invalid in tau_1

Q-LATTICE MAP AT EPOCH tau_2

 [A:17] ---> [B:22] ---> [Y:55] ---> [C:81]
```

A route planner must never substitute the upper diagram for the lower one.

---

## 3. Edge validity and phase epochs

**DERIVED.** A candidate translation edge can be represented by a validity function

\[
V_e(\alpha,\beta,t)=
I_A I_\tau I_C I_X,
\]

where:

- \(I_A\): address identity and reference authentication are valid,
- \(I_\tau\): the required phase epoch is open long enough to complete commit,
- \(I_C\): protected-state coverage is valid,
- \(I_X\): destination/exit state is physically admissible.

If any term is zero, the edge is invalid.

An epoch is not merely an appointment time. It is a physically meaningful interval during which the address pair, phase relationship, vessel state, and environmental/reference solution admit a certified translation. A controller that begins a commit near the end of that interval must account for the entire command-to-recovery duration, not merely the instant at which the operator presses a control.

---

## 4. Address covariance and aliasing

No serious Q-Lattice navigator can represent address certainty as one decorative percentage. Address inference has multiple contributors:

\[
\Sigma_A=
\Sigma_{ref}
+\Sigma_{clock}
+\Sigma_{model}
+\Sigma_{gravity}
+\Sigma_{infra}.
\]

The important failure mode is **aliasing**: two candidate addresses may produce sufficiently similar observations that a weak reference solution cannot distinguish them reliably.

Define

\[
P_{alias}=P(\text{unintended address}\mid\text{observations},\tau).
\]

A mature system must expose both the winning address posterior and plausible competitors. “99.2% address confidence” is not enough if the remaining 0.8% is concentrated in one catastrophic alias rather than distributed across harmless numerical noise.

### Operator rule

If two candidate addresses remain operationally plausible and lead to materially different exits, treat the solution as unresolved until additional independent evidence collapses the ambiguity.

---

## 5. Route objective

**DERIVED.** A strategic Q-Lattice route can be represented as

\[
\pi^*=\arg\min_\pi\sum_{e\in\pi}
\left[
 w_tT_e
+w_aC_{address}
+w_pC_{phase}
+w_uC_{unc}
+w_cC_{coverage}
+w_xC_{exit}
+w_rC_{recovery}
\right].
\]

The terms represent translation/commit time, address authentication burden, epoch synchronization burden, uncertainty, protected-volume burden, exit-state burden, and recovery reserve.

This produces a useful and intentional behavior: a route with more graph edges can be safer and cheaper than a nominally shorter route if the shorter route depends on poorly authenticated addresses, narrow epochs, difficult coverage, dangerous gravity-conditioned reference geometry, or weak recovery options.

---

## 6. Phase-clock engineering

Address identity alone is insufficient. The machine must enter the translation under a valid phase relationship.

A useful derived phase-error model is

\[
\Delta\phi(t)=\int(\omega_d-\omega_\tau)dt+\phi_{ref},
\]

where \(\omega_d\) is the drive/reference phase rate, \(\omega_\tau\) is the epoch solution, and \(\phi_{ref}\) contains reference error.

Commit requires

\[
|\Delta\phi|\le\phi_{max}
\]

throughout the protected volume for the entire certified commit interval.

This is why a single exquisite central clock is not automatically sufficient. A large vessel can have significant distribution delay, thermal drift, structural-path drift, or local reference corruption between the clock and remote cage sectors.

```text
                 EPOCH REFERENCE A
                       |
             +---------+---------+
             |                   |
        CLOCK VOTE 1         CLOCK VOTE 2
             |                   |
      +------+------+       +----+-----+
      |             |       |          |
   CAGE A         CAGE B  CAGE C     CAGE D
      \             |       |          /
       +------------+-------+---------+
                    |
             COMMIT CONTROLLER
                    |
              RECOVERY VOTE
```

Independent comparison is the point. Multiple clocks chained to one corrupted upstream reference are not true redundancy.

---

## 7. Protected-state coverage

The address machine does not translate a convenient abstract center point. It must preserve a protected state across the actual mass/field volume selected for translation.

Define local coverage quality \(c(x)\) over protected volume \(\Omega\):

\[
C_Q=\min_{x\in\Omega}c(x).
\]

A commanded translation is valid only when

\[
C_Q\ge C_{min}.
\]

The minimum matters more than the average. One uncovered docking boom, damaged field panel, externally mounted reactor loop, deployed sensor mast, or cargo module can be the relevant failure point even if 99.9% of the vessel has excellent coverage.

### Practical implication

Every configuration change that changes translated geometry can invalidate an old coverage certificate. Docked craft, cargo pods, temporary hull repairs, deployable radiators, survey booms, and battle damage all require re-evaluation.

---

## 8. Interaction with gravity

The legacy “different lightspeed methods” source establishes that all high-order transit families suffer around large gravity distortions, but with different coefficients and different failure behavior.

For Q-Lattice, the useful derived interpretation is that gravity primarily damages **reference-frame quality, clock/epoch prediction, address inference, and endpoint mapping**, while also potentially increasing the physical field authority required to maintain a clean protected state.

Represent the family-specific burden abstractly as

\[
C_g=f(\Phi,\nabla\Phi,R,\delta\mathcal F,\Sigma_A).
\]

This must not be copied numerically from Metric Compression, Gravitational-Plane Skimming, or Slipstream Shear. They solve different problems.

A high-gravity region can therefore leave an address mathematically present while making it operationally unusable because the vessel cannot authenticate the address, hold a sufficiently coherent epoch solution, or map the exit frame inside acceptable covariance.

---

## 9. Safety horizon in a discrete drive

For continuous transit systems it is natural to discuss sensor distance. For Q-Lattice, a second and often more useful measure is the number of future **certified address/epoch opportunities** that remain available.

**DERIVED:**

\[
N_{safe}\ge
N_{detect}+N_{auth}+N_{solve}+N_{commit}+N_{reject}+N_{recovery}.
\]

The equivalent time budget is

\[
T_{lookahead}\ge
 t_{detect}+t_{auth}+t_{solve}+t_{commit}+t_{reject}+t_{recovery}+t_{margin}.
\]

This directly implements the legacy design requirement that faster/more advanced transit requires correspondingly better sensing, mathematical solving, redundancy, and emergency de-transit capability. Advanced machines are not perfectly safe; they maintain larger useful margins and more viable future branches.

---

## 10. P0-P6 technological development

The following first three implementation names are inherited from the existing development-lineage authority. Later exact implementation names remain controlled by that registry and are deliberately not guessed here where the current connector view did not expose them in full.

### P0 — Q-Cell Addressing Monolith

The civilization proves stable, repeatable, discrete Q addresses exist. Machinery is monumental, stationary, reference-hungry, and incapable of payload translation. The major achievement is scientific: demonstrating that Q-state topology includes discrete addressable structure rather than only continuous boundary phenomena.

### P1 — Molecular Phase Conveyor

Adjacent address transitions are mapped for simple matter states. The key improvements are small protected-state cages, useful epoch clocks, and a known-address whitelist. The machine can translate very small payloads but has almost no tolerance for unknown addresses or complex state geometry.

### P2 — Macroscopic Lattice Translator

The problem changes from “Can one simple state translate?” to “Can a complicated macroscopic protected state remain coherent?” Large synchronized cage arrays, state buffers, and coverage diagnostics make local macroscopic jumps possible.

### P3 — autonomous ship-scale translation

**DERIVED deepening; exact recovered implementation label inherited from the lineage registry.** The main mathematical breakthrough is solving address chains while the source vessel is moving, the destination frame is moving, and future epochs are changing. The machine becomes a navigation system as much as a field machine.

### P4 — operational multi-path translation

**DERIVED deepening.** The system maintains several plausible address chains and ranks them by alias risk, phase margin, coverage, destination admissibility, and recovery options. Cage sectors become independently observable and isolatable.

### P5 — strategic address-graph navigation

**DERIVED deepening.** Address atlases, authenticated beacon histories, epoch observatories, and predictive graph solvers make sparse frontier routes practical. The civilization stops thinking in terms of individual jumps and starts planning journeys through a changing graph.

### P6 — continuous receding-horizon lattice solving

**DERIVED deepening.** The drive continuously co-solves the graph, future epochs, address posteriors, vessel-frame state, cage health, destination occupancy, and rollback/recovery options. Compactness comes from better materials, denser reference networks, more capable solvers, and more distributed control—not an unexplained tier multiplier.

The progression is therefore:

\[
\boxed{
\text{address discovery}
\rightarrow
\text{simple-state transfer}
\rightarrow
\text{macroscopic coverage}
\rightarrow
\text{autonomous address chains}
\rightarrow
\text{multi-path uncertainty control}
\rightarrow
\text{strategic graph navigation}
\rightarrow
\text{continuous co-solving}
}
\]

---

## 11. Machinery embodiment

A practical Q-Lattice vessel requires at least the following functional machine blocks.

### Address resonator

Excites and discriminates the selected quantized address. Failure is not just “low power”: resonance splitting or neighboring-address leakage can create an alias hazard.

### Epoch clock network

Maintains the phase/time solution under which the selected edge is valid. At high Path, this is distributed and voted rather than one central time source.

### Protected-state cage

Provides coherent translation coverage to the complete selected vessel volume.

### State buffer

Retains precommit descriptors, cage maps, reference snapshots, and recovery information through the translation event.

### Address navigation computer

Constructs candidate graph states, authenticates infrastructure and reference inputs, estimates address covariance, ranks routes, and refuses unsafe branches.

### Translation controller

Sequences address lock, epoch synchronization, coverage proof, final alias/occupancy validation, commit, exit verification, and settling.

### Recovery system

Maintains dedicated authority to reject an uncommitted edge and settle the vessel after a completed translation. Any partial-commit recovery behavior must be family/path-specific and sourced; this volume does not invent magical rollback.

---

## 12. Whole-vessel layout

```text
              LONG-BASELINE REFERENCES / GRAVIMETRY
       <------------------------------------------------>

       [R1]       [R2]       [R3]       [R4]
         |          |          |          |
   +--------------------------------------------------+
   |  CAGE A | CAGE B | SHIP CORE | CAGE C | CAGE D |
   +--------------------------------------------------+
         \          |       |       |          /
          +---------+-------+-------+---------+
                            |
                    ADDRESS RESONATOR
                            |
                      EPOCH CLOCK MESH
                            |
                   TRANSLATION CONTROLLER
                            |
                  +---------+---------+
                  |                   |
             PRIMARY ENERGY     ISOLATED RECOVERY
                  |                   |
                  +---------+---------+
                            |
                        STATE BUFFER
```

The address resonator can be physically centralized in some technology bases, but protected-state coverage and timing are inherently whole-vessel concerns.

---

## 13. Power and reserve model

**DERIVED:**

\[
E_{commit}=
E_{lock}+E_{phase}+E_{coverage}+E_{translation}+E_{exit}+E_{recovery}.
\]

A vessel also carries persistent loads for reference sensing, clocking, computation, thermal control, state-buffer maintenance, and health monitoring.

The important operational rule is that recovery reserve is not discretionary trip energy. A route that reaches the destination only by consuming the authority needed to reject a late bad edge is not a valid route.

A beacon can reduce \(E_{lock}\) or the uncertainty component of the solve by providing a trusted reference. It cannot replace a damaged cage, manufacture an absent graph edge, or guarantee an unoccupied destination.

---

## 14. Navigation and commit gates

Before every translation, the controller should require affirmative proof of all of the following:

1. The selected source and destination addresses are authenticated.
2. The phase epoch remains open through predicted commit plus margin.
3. Full protected-volume coverage is certified.
4. Destination state is physically admissible and unoccupied.
5. Recovery or rejection authority remains available.
6. Independent clocks/reference sources agree within certified bounds.

A route is not made valid by operator confidence, schedule pressure, or prior success.

---

## 15. Practical equipment procedure QL-01: pre-transit certification

**Purpose:** certify one intended Q-Lattice edge and its fallback before address lock.

**Procedure:**

1. Authenticate the current address atlas, beacon records, clock sources, destination occupancy source, and gravity/reference solution. Archive source identifiers and revision times.
2. Reconstruct the candidate address posterior. Record the best address and any material aliases.
3. Predict the valid phase epoch through the full lock/commit/recovery interval.
4. Run protected-state cage tomography against the vessel's exact current configuration.
5. Verify every independent epoch clock and test the voting path by intentionally isolating one source.
6. Solve the primary edge and at least one earlier reject/fallback state.
7. Reserve recovery energy so route optimization cannot spend it.
8. Perform a final destination occupancy and frame-correspondence check immediately before commit.
9. Permit address lock only after navigation, machinery, clock, and recovery votes concur.

**Do not certify** a route whose safety depends on an address source the ship cannot independently authenticate.

---

## 16. Practical equipment procedure QL-02: alias alarm

When the live posterior develops a second candidate address inside the operational acceptance region:

1. Freeze commit progression if commit has not begun.
2. Identify which observations distinguish the two addresses most strongly.
3. Down-rank stale/common-mode references; do not average contradictory sources into false confidence.
4. Seek an independent reference family: local Q spectroscopy, stellar frame, gravimetry, trusted beacon, or known-address calibration target.
5. Recompute \(P_{alias}\) with explicit covariance.
6. If ambiguity remains operationally material, reject the edge and select another authenticated route.
7. Quarantine the disputed atlas/beacon record until provenance review is complete.

---

## 17. Practical equipment procedure QL-03: clock split

If independent epoch clocks diverge beyond certified voting tolerance:

1. Inhibit new commit immediately.
2. Preserve raw clock phase/frequency logs.
3. Compare each clock against an independent external reference where possible.
4. Check distribution path delay, thermal state, power conditioning, radiation damage, and shared upstream reference sources.
5. Do not declare two clocks independent if both are disciplined by the same suspect source.
6. Restore quorum only after the faulty clock or common-mode source is isolated.
7. Re-solve all predicted phase epochs before resuming transit.

---

## 18. Practical equipment procedure QL-04: coverage fault

A local coverage minimum falling below certification is a state-integrity hazard.

1. Reject any uncommitted edge.
2. Identify the minimum-coverage physical region rather than relying on global average coverage.
3. Inspect recent configuration changes, hull damage, docked payloads, deployed appendages, temporary repairs, cage nodes, and timing paths.
4. Isolate the affected cage sector and re-run local tomography.
5. If the vessel can legally redefine a smaller protected volume, that requires an explicit new certificate; it is not an automatic workaround.
6. Re-enter service only after the minimum coverage baseline is restored and verified.

---

## 19. Maintenance bulletin QL-M12: slowly rising address-lock energy

A gradual increase in address-lock energy can arise from very different causes.

**Coherent rise across all sectors:** investigate reference drift, epoch-clock bias, address-model error, environmental gravity changes, or contaminated atlas/beacon inputs first.

**One-sector rise:** investigate local resonator coupling, cage geometry, field medium, connector/waveguide path, crystal/tissue state, cooling, or structural displacement depending on technology basis.

**Address-dependent rise:** investigate alias proximity, changed address topology, or incorrect local calibration for that address family.

Replacing the prime mover before separating these cases is poor maintenance practice.

---

## 20. Failure anatomy

### Address alias

The machine commits to an unintended address whose observables were insufficiently distinguished from the intended one.

### Epoch miss

The valid phase window closes before the physical commit/recovery sequence completes.

### Coverage hole

A region of protected mass loses sufficient coherent cage authority.

### Reference poisoning

Stale, corrupted, forged, or internally inconsistent atlas/beacon/reference data moves the address posterior toward a false solution.

### Destination conflict

The target state becomes occupied or otherwise inadmissible after route planning.

### Clock split

Independent timing solutions lose quorum.

### Recovery exhaustion

The route consumes energy, thermal, control, or timing authority required for rejection or safe settling.

An accident report that calls all of these “Q-drive overload” is technically inadequate.

---

## 21. Signature model

**DERIVED:**

\[
S_Q(t)=S_{lock}+S_{epoch}+S_{commit}+S_{exit}+S_{recovery}.
\]

Likely family observables include discrete Q resonance lines, address-lock pulse trains, phase-clock sidebands, a commit transient, and exit/settling activity. Higher Path machinery can reduce waste and shorten exposed transients, but may not erase the family-intrinsic discrete address/phase behavior without separate canon.

This provides a useful tactical distinction from Slipstream's extended wake signature and Metric systems' continuous geometric disturbance.

---

## 22. Infrastructure

### Address beacons

Provide authenticated reference data and epoch synchronization. They do **not** create an edge.

### Lattice atlas services

Accumulate historical edge validity, alias notes, gravity sensitivity, and successful route provenance. Old history becomes less authoritative as environment, infrastructure, or calibration changes.

### Epoch observatories

Improve prediction of future valid windows. They reduce covariance; they do not make future epochs perfectly deterministic.

### Translation stations

Can supply extremely large fixed cage/reference machinery and may enable lower-Path civilizations to perform transfers impossible for their shipboard equipment.

### Traffic and occupancy services

Reduce destination-conflict risk when data is current and authenticated. Latency must remain visible.

---

## 23. Scaling

Q-Lattice scaling is not a simple central-engine mass curve.

A larger vessel increases:

- protected-state volume and surface complexity,
- number of cage sectors,
- clock distribution length,
- simultaneity/phase-control burden,
- reference aperture requirements,
- commit energy,
- thermal settling burden,
- recovery reserve,
- failure-isolation complexity.

For very long hulls, timing distribution itself becomes a first-class engineering limit. More candidate graph branches also increase computation and provenance/authentication burden even when the physical machine does not become proportionally larger.

Multiple translators cannot simply add their “jump ratings.” Their cages, clocks, address solutions, and commit controllers must first be proven mutually coherent.

---

## 24. Technology-basis embodiments

These embodiments are **DERIVED** and do not assign the family to any race.

| Basis | Q-Lattice embodiment |
|---|---|
| Terrestrial mechanical | resonant cavities/rings, precision clocks, distributed field plates, hardened compute, redundant power buses |
| Aquatic pressure-native | pressure-qualified resonant membranes, wet photonics, fluid-isolated cage nodes, chemistry-controlled reference paths |
| Cryogenic superconducting | superconducting resonators, ultrastable cold clocks, quench-isolated cage sectors, low-noise reference meshes |
| Gas-giant/aerostat | distributed buoyant resonator cells, atmospheric baselines, flexible cage webs, storm-isolated reference nodes |
| Biological/symbiotic | cultivated address-sensitive tissues, synchronized neural/biochemical oscillators, living coverage membranes, regenerative reference organs |
| Mineral/crystalline | address-selective lattice domains, resonant defect clocks, coherent crystal cage volumes, prestress-tuned reference structures |
| Postmaterial/distributed | distributed coherent nodes, executable address proofs, self-validating reference meshes, continuously reconstructed protected-state boundaries |

The scientific problem remains the same while machinery language changes.

---

## 25. Race and manufacturer integration rule

When a named race or manufacturer has specific canon, resolve in this order:

```text
CONFIRMED FAMILY PHYSICS
          |
          v
CONFIRMED RACE / MANUFACTURER SYSTEM
          |
          v
OPERATIVE TECHNOLOGY BASIS
          |
          v
DERIVED MACHINE CONSEQUENCES
          |
          v
PROPOSED DETAILS ONLY WHERE NEEDED
```

Technology basis is not evidence that a civilization invented, owns, prefers, or even possesses Q-Lattice translation.

---

## 26. Educational text: why “address” is not “place”

A beginner's most common mistake is to imagine a Q address as a postal coordinate. That is too simple. A usable address is a relational physical state tied to reference frame, valid epoch, environmental solution, and uncertainty.

Two ships can therefore disagree about an address without either instrument being trivially “broken.” They may be using different reference sets, different clock solutions, or different environmental models. Engineering begins when the disagreement is represented explicitly instead of hidden behind one confidence number.

---

## 27. Advanced engineering note: graph connectivity versus geometric distance

Let \(d_M(A,B)\) denote ordinary-space separation and \(d_Q(A,B,t)\) the minimum weighted path cost through the valid lattice graph at epoch \(t\).

In general,

\[
d_Q(A,B,t)\not\propto d_M(A,B).
\]

Moreover,

\[
d_Q(A,B,t_1)\neq d_Q(A,B,t_2)
\]

because the edge set and costs can change with phase epoch, references, infrastructure, environment, and vessel capability.

This is the mathematical reason a Q-Lattice navigation chart should look more like a time-dependent authenticated network graph than a conventional star map.

---

## 28. Advanced engineering note: commit-risk decomposition

A derived route-risk representation can retain distinct causes:

\[
R_e=1-\prod_k(1-r_k),
\]

where \(r_k\) may include independent/conditionally modeled contributions from aliasing, epoch miss, coverage loss, destination conflict, reference corruption, recovery exhaustion, and environment mismatch.

The purpose is not to claim statistical independence. The purpose is to forbid one opaque “jump danger” number from erasing actionable causal structure. Production implementations should preserve covariance and dependency structure where the model supports it.

---

## 29. Training accident TA-QL-01

**Status: PROPOSED educational exemplar, not canon history.**

A transport repeatedly uses a beacon-supported two-edge route. A software update begins accepting a cached beacon signature after its freshness window. Simultaneously, a slow clock-distribution bias develops in an aft cage sector. Neither defect alone exceeds the old abort threshold.

During the next attempt, the cached beacon data makes a neighboring address alias appear more likely while the aft timing bias lowers local coverage margin. The route computer reports a still-acceptable global confidence because its UI averages both conditions into one quality score.

A properly designed system would instead expose:

- increasing \(P_{alias}\),
- stale provenance on the beacon observation,
- clock-vote innovation in the aft sector,
- falling minimum coverage \(C_Q\),
- reduced recovery margin.

The lesson is not “install a larger reactor.” The lesson is that provenance, distributed clock health, address covariance, and local coverage must remain separate operational quantities.

---

## 30. Generator/API contract

Required inputs should include at least:

```json
{
  "family": "q-lattice",
  "path": "P4",
  "technology_basis": "TERRESTRIAL_MECHANICAL",
  "vessel_geometry": "...",
  "protected_mass": "...",
  "origin_state": "...",
  "destination_state": "...",
  "reference_set": ["..."],
  "epoch_state": "...",
  "gravity_environment": "..."
}
```

Required outputs should expose:

```json
{
  "address_graph_summary": "...",
  "candidate_path": ["..."],
  "epoch_windows": ["..."],
  "alias_risk": "...",
  "coverage_margin": "...",
  "destination_admissibility": "...",
  "power_and_recovery_budget": "...",
  "signatures": ["..."],
  "failure_risks": ["..."],
  "provenance": {
    "confirmed_facts": ["..."],
    "derived_fields": ["..."],
    "proposed_values": ["..."],
    "unresolved_attributions": ["..."]
  }
}
```

### Hard generator safeguards

- Never convert ordinary-space distance directly into Q-Lattice adjacency.
- Never infer race ownership or invention from technology basis.
- Never let a beacon create a nonexistent edge or compensate for inadequate cage authority.
- Never hide alias, clock, coverage, destination, or recovery uncertainty.
- Never overwrite a recovered Path implementation label with a derived label.
- Never promote a derived equation or illustrative threshold to confirmed canon.
- Preserve source and revision provenance when generated material is persisted.

---

## 31. Provenance and authority note

The current legacy source requires transit families to have different gravity sensitivities, miscalculation/efficiency behavior, safety packages, redundancy, emergency de-transit behavior, and increasingly sophisticated mathematics as technology advances. It also asks for educational material, thesis-level work, design documentation, and incremental patent-like development.

This volume implements those requirements for Q-Lattice without converting extrapolation into setting history. The discrete indexed-address physical action is inherited from existing Black Light transit authority. The graph model, phase-error equation, covariance decomposition, protected-state minimum, route objective, and discrete safety-horizon formalism are **DERIVED** engineering mathematics. No numerical constants are adopted here. No race, inventor, company, institution, patent holder, or historical accident is assigned.

The unresolved P3-P6 implementation labels remain intentionally subordinate to the existing development-lineage registry rather than being guessed from naming conventions. That is an authority-chain safeguard, not missing physics.

---

## 32. Compact engineering comparison

| Question | Q-Lattice answer |
|---|---|
| What is manipulated? | indexed quantized Q address/state relationship |
| Continuous or discrete? | discrete translation graph |
| Primary navigation object | authenticated address/epoch graph |
| Primary environmental vulnerability | reference/frame/epoch distortion plus family-specific field burden |
| Main whole-vessel requirement | coherent protected-state cage and distributed timing |
| Characteristic navigation failure | alias or invalid edge/epoch |
| Characteristic machinery failure | cage/clock/reference loss |
| Key infrastructure | authenticated beacons, atlases, epoch observatories, occupancy services |
| What improves at high Path? | graph solving, reference quality, clocking, cage materials, branch count, recovery, compactness |
| What never becomes free? | authentication, coverage, recovery, uncertainty, destination admissibility |

---

## 33. Engineering doctrine summary

A Q-Lattice ship should be understood as an **address-authentication laboratory, distributed precision clock, whole-vessel protected-state machine, graph navigator, and recovery system that happens to be capable of superluminal translation**.

Its technological history therefore advances by learning to identify more addresses, distinguish aliases, hold larger and more complicated protected states, predict valid phase epochs farther ahead, navigate changing graphs, maintain trustworthy reference chains, isolate damaged cage sectors, and preserve more recovery options.

That is the family-specific mechanism by which later generations become safer, smaller, more capable, and longer-ranged without reducing Q-Lattice Phase Translation to another arbitrary “FTL speed rating.”
