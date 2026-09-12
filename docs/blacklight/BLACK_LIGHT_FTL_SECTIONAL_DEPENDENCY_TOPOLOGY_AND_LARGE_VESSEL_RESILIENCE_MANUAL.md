# Black Light FTL Sectional Dependency Topology and Large-Vessel Resilience Manual

**Authority class:** DERIVED / PROPOSED ENGINEERING MODEL unless a narrower named source is cited.

**Design-intent source:** *The different lightspeed methods*.

**Purpose:** extend Black Light propulsion/transit safety engineering from installation-wide common-cause readiness into explicit sectional infrastructure. This manual describes how a large vessel can lose one machinery province, bus, coolant trunk, command path, recovery store, biological support loop, or field-control circuit without either falsely declaring the entire vessel dead or falsely treating physically connected systems as independent.

---

## 1. Authority boundary

The design source requires different transit systems to possess different gravity tolerances, prediction packages, emergency de-transit mechanisms, and increasingly sophisticated but imperfect safety margins. This document does not create new FTL physics. It answers a narrower machinery question:

> When a vessel is large enough to contain multiple service regions, which safety functions remain physically supportable after a local infrastructure failure?

The order remains:

```text
external spacetime / route physics
        ↓
family-specific hazard evidence
        ↓
named applicability / canon
        ↓
sectional machinery connectivity
        ↓
common-cause transient degradation
        ↓
installation timing and recovery
        ↓
route certification
```

A sectional power failure does not prove a shear fork exists. A shear fork does not prove every section of a vessel has lost power.

---

## 2. Why a single vessel-wide scalar fails

For a compact craft, treating one coolant loop or one command bus as installation-wide may be acceptable. For a kilometer-scale vessel it becomes physically misleading.

A large vessel can contain:

- several power-generation and conversion zones;
- multiple cooling loops and cross-connects;
- independent command trunks;
- local sensor processors;
- distributed field actuators;
- protected recovery-energy stores;
- sectional hydraulic circuits;
- dielectric baths isolated by valves;
- cultivated biological support provinces;
- local reference and navigation relays.

The wrong model is:

```text
coolant fault anywhere
        ↓
whole vessel coolant readiness = 0
        ↓
every FTL safety channel = 0
```

The equally wrong opposite model is:

```text
coolant fault in one shared trunk
        ↓
only one arbitrarily named subsystem affected
        ↓
all other physically connected loads untouched
```

The correct model requires topology.

---

## 3. Section graph

Represent the installation as a directed multigraph

\[
G=(V,E)
\]

where:

- \(V\) are machinery sections or provinces;
- \(E\) are service connections;
- each edge has a service type, availability and propagation latency;
- service sources originate power, cooling, command, reference, recovery, fluid or biological support.

A vessel may use several graphs over the same sections because power, coolant, command and recovery do not necessarily share the same physical routes.

### 3.1 Example

```text
           [POWER A]
              │
        ┌─────┴─────┐
        │           │
   [FORE SENSOR] [CORE SOLVER]
        │           │
        └──COMMAND──┤
                    │
              [FIELD RING 1]
                    │
              [FIELD RING 2]

[POWER B] ─────── [RECOVERY BAY]
      │                 │
      └──── cross-tie ──┘
```

A failed line between CORE SOLVER and FIELD RING 1 does not remove POWER B. A failed common cross-tie may affect both if the graph says it does.

---

## 4. Deterministic service availability

This authority deliberately does not invent failure probabilities.

For a service path \(p\), define deterministic path availability

\[
A_p=\min\left(A_{\rm source},\min_{e\in p}A_e\right).
\]

This is a bottleneck quantity. If a path includes links with availability

\[
0.95,\ 0.72,\ 0.88,
\]

then the path can support at most

\[
A_p=0.72.
\]

For section \(s\), the best available path is

\[
\boxed{A_s=\max_p A_p}.
\]

This is the **widest-path** problem.

It means "the strongest physically connected support route currently available." It does **not** mean a 72% chance of success.

---

## 5. Propagation latency

For serial links,

\[
\boxed{\tau_p=\sum_{e\in p}\tau_e}.
\]

When several routes have the same bottleneck availability, choose the lowest-latency route for response analysis.

This produces two separate engineering questions:

1. Can the service reach the section at sufficient strength?
2. Can it reach the section soon enough?

A redundant aft command path that takes 1.8 s longer may preserve eventual control while still destroying a 0.9 s emergency timing margin.

---

## 6. Channel dependencies

Each safety channel consumes declared services.

A generic terrestrial-style map may be:

| Safety channel | Typical required services |
|---|---|
| Sensor | power, cooling, sensor-data |
| Navigation | power, cooling, navigation-data, reference |
| Reference | power, reference |
| Solver | power, cooling, navigation-data |
| Command | power, command |
| Actuator | power, command |
| Exit | power, command, recovery |
| Clearance | sensor-data, command |
| Recovery | power, recovery |
| Thermal | cooling |
| Structure | no generic service assumption |

For channel \(i\) in section \(s\),

\[
\boxed{
r_{s,i}=\min\left(r_{s,i}^{\rm local}, A_{s,q_1},A_{s,q_2},\ldots\right)
}
\]

for the declared required services \(q_j\).

This is intentionally conservative: a required support channel cannot be substituted by an unrelated healthy service.

---

## 7. Redundant sections and k-of-n safety

Large craft often do not require every field ring, sensor cluster or recovery bank simultaneously.

If a safety group contains \(n\) members but requires only \(k\), the group readiness is the \(k\)-th largest member readiness:

\[
\boxed{
r_{\rm group}=r_{(k)}^{\downarrow}
}
\]

where \(r^{\downarrow}\) is the descending ordered list.

Example:

```text
Four field-control rings
readiness = [0.96, 0.91, 0.62, 0.00]
minimum required = 3
```

Then:

\[
r_{\rm group}=0.62.
\]

The dead fourth ring does not kill the vessel. The third-best surviving ring sets the safety margin.

If the requirement is four of four, the same state becomes blocked.

### 7.1 Why k must be explicit

Never infer redundancy from visual symmetry or repeated names.

Two identical coils might be:

- active-active halves of one required system;
- one primary and one spare;
- independent port/starboard channels;
- two of six members in a distributed field shell.

The engineering source must declare the safety requirement.

---

## 8. Installation aggregate readiness

For each safety channel, installation readiness becomes the minimum readiness of all mandatory groups associated with that channel:

\[
\boxed{
r_i^{\rm installation}=\min_g r_{g,i}.
}
\]

Channels with no declared sectional group retain their incoming readiness.

This prevents topology from inventing a new dependency merely because a graph happens to exist.

---

## 9. Coupling to common-cause degradation

Sectional topology resolves **where support can go**.

Common-cause transient modeling resolves **how healthy the support is**.

The order is therefore:

\[
r_i^{\rm incoming}
\rightarrow
r_i^{\rm sectional}
\rightarrow
r_i^{\rm coupled}.
\]

For the existing MAX_ENVELOPE degradation model,

\[
d_i=1-r_i^{\rm sectional}
\]

and

\[
\boxed{
d_{i,\rm eff}=\max\left[d_i,\max_k(c_{ki}s_k)\right]
}
\]

followed by

\[
r_{i,\rm eff}=1-d_{i,\rm eff}.
\]

A physically isolated section is not restored merely because the global coolant temperature is acceptable.

Likewise, a connected section is not guaranteed healthy if the shared coolant reaching it is itself overheating.

---

## 10. Large-vessel scaling

The existing distributed-control parameter remains

\[
\boxed{
\Pi_c=\frac{L_c}{v_c\tau_r}
}
\]

where:

- \(L_c\) is control span;
- \(v_c\) is command/signal propagation speed through the relevant machinery;
- \(\tau_r\) is required response time.

As \(\Pi_c\) approaches or exceeds unity, central control becomes increasingly incapable of treating the installation as instantaneous.

Sectional architecture is therefore not cosmetic redundancy. It is a scaling response to finite propagation speed.

A very large vessel tends toward:

```text
local sensing
 + local authority
 + local recovery reserve
 + regional coordination
 + slower vessel-wide arbitration
```

rather than one magical bridge computer instantly controlling every FTL machine.

---

## 11. Power-zone embodiment

A terrestrial electromechanical vessel might contain:

```text
REACTOR A → CONVERTER A → BUS A → FORE FIELD RINGS
                     │
                     └→ SENSOR / SOLVER PROVINCE

REACTOR B → CONVERTER B → BUS B → AFT FIELD RINGS
                     │
                     └→ RECOVERY STORES

BUS A ⇄ protected cross-tie ⇄ BUS B
```

The cross-tie can preserve survival after a reactor trip, but only if:

- its capacity is sufficient;
- protection permits closure;
- propagation/control latency is acceptable;
- remaining generation can support emergency load;
- the tie does not itself create a common failure path.

The sectional graph records connectivity. The power-transient model still determines whether the surviving source has enough energy.

---

## 12. Cooling-zone embodiment

Cooling topology should distinguish:

- heat generation;
- heat transport;
- heat rejection.

A local pump can be healthy while the radiator trunk is isolated.

A radiator can be healthy while coolant never reaches it.

The lumped short-horizon relation remains

\[
C_{\rm th}\frac{dT}{dt}=P_{\rm heat}-P_{\rm reject}.
\]

Sectional topology decides whether \(P_{\rm reject}\) is physically available to that province.

---

## 13. Command partitions

A command network has at least three relevant properties:

1. reachability;
2. latency;
3. authority.

A surviving path does not necessarily carry legal or technical abort authority.

A complete named installation model may therefore distinguish:

```text
physical link alive
        ↓
command packet arrives
        ↓
local controller authenticates
        ↓
local actuator has power
        ↓
local actuator has recovery authority
        ↓
action occurs
```

Future named records may add arbitration and authentication detail. The generic topology runtime does not invent them.

---

## 14. Protected local recovery stores

A distributed vessel should not necessarily place all emergency recovery energy in one compartment.

If local protected store \(j\) contains energy \(E_j\) and emergency load is \(P_j\), then the local hold time is

\[
\boxed{t_{h,j}=\frac{E_j}{P_j}}.
\]

For a section whose exit sequence requires \(t_{\rm int,j}\), local reserve is adequate only if

\[
t_{h,j}\ge t_{\rm int,j}.
\]

A vessel-wide energy total can therefore be misleading. Ten healthy recovery banks aft do not save a forward field ring if no surviving path can deliver their authority in time.

---

## 15. Gravitational Plane machinery implications

The underlying gravity/topology mathematics remains unchanged.

A gravitational-plane craft may distribute:

- gradiometers;
- eigenbranch solvers;
- field-plane actuators;
- emergency de-transit stores;
- regional reference clocks;
- sectional shear alarms.

A shear-fork hazard may be externally certified while only part of the vessel has lost the machinery needed to respond.

Thus the operational problem becomes:

\[
\text{hazard detected}
+\text{sectional response topology}
+\text{timing margin}.
\]

The graph never creates the shear fork.

---

## 16. Slipstream / Shear machinery implications

A slipstream vessel can plausibly require distributed adhesion/field-control sections along its hull.

A localized aft control loss could produce:

- asymmetric field authority;
- rising steering error;
- reduced emergency-exit coherence;
- increased local heating;
- detectable phase or field asymmetry.

Whether any specific fictional drive behaves this way requires named authority. This manual supplies the engineering representation, not universal canon.

---

## 17. PRECOMMIT families

Fold, Q-Lattice and Phase systems remain PRECOMMIT where their existing family authority says so.

Sectional topology still matters before commitment:

- can all required endpoint solvers be reached?
- can reference clocks communicate?
- can protected abort authority reach enough commit controllers?
- can local recovery stores survive the precommit window?

But no intermediate local superluminal speed is fabricated.

Their safety margin remains timing-based:

\[
M_T=t_{\rm prediction}-t_{\rm int}.
\]

---

## 18. Wormhole / Gate systems

Gate systems are naturally sectional:

- throat-control machinery;
- mouth stabilization;
- synchronization/reference systems;
- local power sectors;
- aperture safety interlocks.

A remote mouth can remain physically present while losing enough command or stabilization connectivity to become unusable.

Again, topology describes machinery support, not whether a wormhole exists.

---

## 19. Ar'nock embodiment

Ar'nock machinery should not be flattened into human wiring diagrams.

A sectional Ar'nock installation may instead be represented as biological provinces:

```text
METABOLIC HEART CLUSTER
      │
      ├── sensory tissue beds
      ├── cultivated neural solver lobes
      ├── contractile actuator organisms
      ├── reference / orientation tissue
      └── recovery-response organs

vascular cross-connects
neural relay trunks
isolation sphincters
metabolite reserve sacs
```

Useful service types can map as:

| Abstract service | Possible Ar'nock embodiment |
|---|---|
| power | metabolite / electrochemical supply |
| cooling | heat-carrying circulatory flow |
| command | cultivated neural relay |
| recovery | reserve metabolic / field-response organ |
| sensor-data | sensory nerve or optical-biological carrier |
| reference | orientation / gravitic sensory tissue |

No canonical Ar'nock FTL family or numeric topology is inferred.

---

## 20. Zwlei Mur'rek embodiment

The Mur'rek machinery corpus already supplies stronger physical embodiments:

```text
BIO-REACTIVE POWER FLUID
      ├── vane-control machinery
      ├── sensor support
      └── emergency recovery

CONDUCTIVE COOLANT
      ├── solver province
      ├── vane baths
      └── recovery hardware

HYDRAULIC CONTROL
      └── field-vane geometry

NAVIGATION CURRENT WELL
      ├── reference
      └── navigation distribution
```

A Mur'rek sectional graph can therefore represent known physical dependencies without resolving the consolidated FTL family.

The phrase **gravitic slipstream** remains local terminology.

---

## 21. Signature model

Sectional failure should create spatially structured signatures.

Examples:

| Failure | Likely observable pattern |
|---|---|
| isolated power zone | local bus sag, converter load transfer, protected-store discharge |
| cooling trunk loss | thermal rise downstream of isolation boundary |
| command partition | healthy power with frozen or locally autonomous actuator state |
| hydraulic isolation | delayed/asymmetric vane movement |
| dielectric section loss | localized leakage / field asymmetry |
| metabolic province loss | tissue chemistry and neural-latency changes localized by vascular topology |

A spatially localized machinery signature is not automatically an exotic transit signature.

---

## 22. Maintenance doctrine

A sectional system creates additional maintenance obligations:

- topology records must match refits;
- cross-ties must be exercised;
- isolation devices must be tested;
- local reserves must be capacity-tested;
- propagation latency must be measured, not assumed;
- emergency authority must be verified through the actual surviving path;
- abandoned or repurposed sections must be removed from active safety groups;
- refits must not leave phantom redundancy in software.

A topology map that no longer matches the ship is itself a safety defect.

---

## 23. Practical procedure: sectional survey

1. Identify physical sections without assuming system boundaries from room names.
2. Inventory service sources.
3. Trace each service connection.
4. Record directionality and isolation points.
5. Measure or bound link availability.
6. Measure propagation latency.
7. Identify safety-critical consumers.
8. Define k-of-n groups from engineering authority.
9. Run loss-of-one-section cases.
10. Run loss-of-one-trunk cases.
11. Reconcile results against installation timing.
12. Preserve provenance for every inferred edge.

---

## 24. Practical procedure: battle-damage isolation

When a section is lost:

```text
CONFIRM DAMAGE
   ↓
ISOLATE FAILED LINKS
   ↓
RE-SOLVE SERVICE PATHS
   ↓
RE-EVALUATE k-of-n GROUPS
   ↓
RE-EVALUATE COMMON-CAUSE TRANSIENTS
   ↓
RECALCULATE INTERVENTION TIMING
   ↓
CERTIFY / REJECT TRANSIT
```

Do not simply subtract one generic "system health" point.

---

## 25. Practical procedure: refit certification

After a refit:

1. Compare old and new topology.
2. Identify moved service sources.
3. Identify removed cross-connects.
4. Identify newly shared failure paths.
5. Re-measure latency.
6. Rebuild safety groups.
7. Verify local recovery stores.
8. Update machine-readable records.
9. Re-run route-safety cases.
10. Archive superseded topology with provenance.

---

## 26. Practical procedure: derelict archaeology

A derelict may preserve machinery but lose the infrastructure that made it safe.

Investigators should distinguish:

- component present;
- component powered;
- service path connected;
- service path capable;
- command path reachable;
- recovery authority available;
- original topology understood.

A functional drive core surrounded by severed command and recovery topology is not a transit-capable installation.

---

## 27. Failure taxonomy

`SDT-NO-NETWORK` — sectional behavior requested without a network.

`SDT-UNKNOWN-SECTION` — source, edge or safety group references an unknown section.

`SDT-DISCONNECTED-SERVICE` — required service cannot reach a section.

`SDT-GROUP-UNDERPOPULATED` — fewer than k known members exist.

`SDT-GROUP-BLOCKED` — fewer than k capable members remain.

`SDT-LATENCY-UNRESOLVED` — required path exists but response latency cannot be established.

`SDT-PHANTOM-REDUNDANCY` — documentation claims redundancy not represented by independent physical paths.

`SDT-STALE-REFIT-MAP` — topology no longer matches the installation.

`SDT-PROBABILITY-LEAK` — deterministic availability was misrepresented as failure probability.

`SDT-CANON-LEAK` — machinery topology was used to invent family identity or exotic hazard existence.

---

## 28. Generator rules

Generated Black Light machinery should obey the following:

- small craft may legitimately use one installation-wide domain;
- large craft should acquire sectional topology when scale and function justify it;
- redundancy must have physical separation or cross-connect logic;
- every safety group declares k and n;
- no race receives universal numeric topology without source authority;
- no alien terminology is normalized into a transit family by keyword;
- section damage must alter only services reachable through affected graph edges;
- common-cause transients apply after sectional reachability;
- timing and recovery consume the resulting readiness;
- provenance follows every named topology record.

---

## 29. API packet

The runtime resolver is:

```text
resolveFTLSectionalDependencyTopology(context)
```

Primary inputs:

```text
readiness
network.sections
network.sources
network.edges
network.groups
profileId
serviceChannelMap
provenance
```

Primary outputs:

```text
status
aggregateReadiness
sectionResults
  ├── localReadiness
  ├── effectiveReadiness
  ├── services
  ├── channelLatencies
  └── blockedChannels
groupResults
serviceDiagnostics
warnings
provenance
```

---

## 30. Worked example

Consider three field sections: fore, center and aft. At least two must remain capable.

Initial actuator readiness:

\[
[0.94,0.91,0.89].
\]

A command trunk is severed so aft command availability becomes zero while fore and center remain 0.96 and 0.92.

The actuator readiness becomes approximately:

\[
[0.94,0.91,0].
\]

For a two-of-three group:

\[
r_{\rm group}=0.91.
\]

The vessel remains capable, but margin is reduced.

If center then loses cooling and falls to 0.40:

\[
[0.94,0.40,0].
\]

then:

\[
r_{\rm group}=0.40.
\]

It remains technically two-of-three only if the readiness floor permits 0.40. If the declared floor is 0.50, only one qualifying section remains and the group blocks.

Nothing in this calculation changes the external FTL hazard. It changes whether the ship can respond to it.

---

## 31. Education module

### Transit Safety Engineering 710

**Sectional Infrastructure Graphs, Distributed Recovery, and Large-Vessel Transit Resilience**

Students should be able to:

1. distinguish topology from probability;
2. solve widest-path service availability;
3. calculate serial propagation latency;
4. evaluate k-of-n safety groups;
5. distinguish local failure from common-cause failure;
6. propagate sectional readiness into intervention timing;
7. preserve PRECOMMIT family semantics;
8. model alien embodiments without imposing terrestrial machinery;
9. identify phantom redundancy;
10. preserve canon and provenance boundaries.

### Examination problem

A vessel has four de-transit actuator provinces. Three are required. Their best command-path availabilities are

\[
[0.98,0.83,0.77,0.51]
\]

with local actuator readiness

\[
[0.95,0.92,0.80,0.90].
\]

The effective member readiness values are

\[
[0.95,0.83,0.77,0.51].
\]

Therefore the three-of-four group readiness is

\[
\boxed{0.77}.
\]

If the third member's command path is cut, the ordered readiness becomes

\[
[0.95,0.83,0.51,0],
\]

and group readiness becomes

\[
\boxed{0.51}.
\]

Whether 0.51 remains certifiable depends on the named installation's timing and readiness floor. It is not a probability of survival.

---

## 32. Research progression

The next research layers should be developed in this order:

```text
static service reachability
        ↓
sectional latency
        ↓
k-of-n safety groups
        ↓
section-local power/thermal transients
        ↓
capacity-constrained simultaneous load flow
        ↓
dynamic switching and isolation
        ↓
fault propagation over time
        ↓
probabilistic reliability, only where historical data actually exists
```

The current runtime deliberately stops before simultaneous capacity-constrained flow and stochastic reliability. Widest-path availability is a defensible deterministic first authority and does not pretend to solve problems for which the project does not yet have evidence.

---

## 33. Proposed patent-class developments

The following are suitable as in-universe proposed technologies, not historical canon unless later sourced:

**Distributed Abort Authority Lattice** — local de-transit controllers with protected authority and authenticated regional consensus.

**Self-Proving Cross-Tie Controller** — continuously demonstrates that an alternate power/coolant/command path can actually carry the emergency load rather than merely appearing connected.

**Topology-Aware Route Certifier** — includes current sectional infrastructure state directly in transit admission.

**Metabolic Province Isolation Organ** — Ar'nock-style biological mechanism that isolates poisoned or damaged support circulation while preserving neighboring cultivated machinery.

**Mur'rek Vane Province Recovery Manifold** — sectional hydraulic/dielectric bypass architecture designed to retain symmetric vane authority after local damage.

---

## 34. Canon safeguards

The following statements are prohibited unless a narrower authority establishes them:

- "Every advanced vessel uses this graph architecture."
- "An Ar'nock vessel has these numeric latencies."
- "A Mur'rek gravitic slipstream is therefore gravitational-plane."
- "A 0.7 service availability means a 70% chance of survival."
- "A disconnected field section proves an external shear hazard exists."
- "Redundant labels prove independent redundancy."

The safe interpretation is narrower:

\[
\boxed{
\text{topology tells us what machinery can support what other machinery}
}
\]

and nothing more.

---

## 35. Engineering conclusion

The practical consequence of sectional modeling is simple but important:

\[
\boxed{
\text{large ship}\neq\text{small ship multiplied by mass}
}
\]

A large transit vessel is a distributed control system with finite propagation speed, multiple infrastructure provinces, local reserves, cross-connects, isolation boundaries and failure paths.

Its FTL drive may remain physically capable while one region is unable to receive abort authority. Another region may remain safe behind an isolation boundary. A third may have power but no cooling. A fourth may have healthy machinery but a severed command path.

A believable Black Light engineering corpus must preserve those distinctions.
