# Black Light FTL Abort Operation Scheduling, Resource Contention, and Critical-Path Manual

**Authority class:** derived engineering / generator authority  
**Primary design-intent source:** Google Drive, *The different lightspeed methods*, document `1e0Xp71EFubBZgXWjjvPxAqPoJIZNwqS6nu1-r7Kil7Y`, revision `ANLCKQllC5h6dLaX5H1RpK8aUFVWsi-IV7gbMHUd0Qq7mIe5uGsLFi5_Hrsr8B6dl8t_ezB0fTSygxrnIBtifAHW79bgSbswp1zF3NaEil0`  
**Runtime authority:** `blacklight-exo-ftl-abort-operation-scheduling-runtime.js`  
**Registry:** `data/exo-vessel/ftl-abort-operation-scheduling-registry.json`

## 1. Purpose

Black Light transit safety already distinguishes family physics, current machine condition, route blockers, prediction horizons, protected power, thermal reserve, and emergency response stages. This volume closes a remaining engineering ambiguity: an abort is not one indivisible timer.

An emergency sequence is a set of operations with dependencies. Some must occur in strict order. Some may overlap. Some share converters, command networks, cooling loops, field sinks, actuators, hydraulic distribution, reference buses, or protected-energy reserves.

The correct question is not:

> Do we add the operation times, or take the longest one?

The correct question is:

> What does the physical dependency graph permit, and can the surviving machinery support the permitted concurrency?

That distinction becomes critical on a damaged ship.

## 2. Core invariant

\[
\boxed{\text{dependency graph}+\text{resource limits}\rightarrow\text{abort duration}}
\]

not:

\[
\boxed{\text{author preference}\rightarrow\max(\cdot)\text{ or }\sum(\cdot)}
\]

If two operations are independent and the machinery can support them simultaneously, forcing them into sequence overstates abort time.

If two operations share a resource that cannot carry both loads, pretending that they overlap understates abort time.

If the resource cannot support both and no controller/arbitration authority says which operation wins, the correct engineering answer is **UNRESOLVED**.

## 3. Architecture

```text
family-specific abort machinery
          │
          ├── operation durations / physical bounds
          ├── precedence dependencies
          ├── renewable resource demands
          ├── consumable resource demands
          └── declared arbitration / serialization
          │
          ▼
+-------------------------------------+
| ABORT OPERATION SCHEDULER           |
|                                     |
|  DAG validation                     |
|  earliest-start / earliest-finish   |
|  critical path                      |
|  overlap windows                    |
|  capacity checks                    |
|  reserve checks                     |
+-------------------------------------+
          │
          ▼
schedule makespan upper bound
          │
          ▼
dynamic escape envelope
          │
          ▼
predictive blocker closure
          │
          ▼
operational route admission
```

The scheduler does not decide whether a gravitational shear fork exists, whether a fold endpoint is occupied, or whether a Q-address is valid. Those remain family/route authorities.

## 4. Precedence mathematics

Represent abort operations as a directed acyclic graph \(G=(V,E)\).

Each operation \(i\in V\) has conservative upper duration:

\[
d_i^{+}\ge 0.
\]

If operation \(j\) must finish before operation \(i\) begins, then:

\[
(j,i)\in E.
\]

For a source operation:

\[
ES_i = 0.
\]

Otherwise:

\[
\boxed{
ES_i=\max_{j\in pred(i)} EF_j
}
\]

and:

\[
\boxed{
EF_i=ES_i+d_i^{+}.
}
\]

The precedence-only makespan is:

\[
\boxed{
T_{\rm DAG}^{+}
=
\max_i EF_i.
}
\]

This is the longest-path problem on a DAG using operation duration as node weight.

A dependency cycle is not a “very long abort.” It is an invalid operation specification. A cycle becomes `CONFLICT`.

## 5. Why stage sums are not enough

The higher-level intervention chain remains useful:

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

But machinery can contain multiple operations inside or across those stages.

For example:

```text
                      ┌── field-sector slew ───────┐
command issued ───────┤                            ├── verify unwind
                      └── connect energy sink ─ dump field energy ┘
```

If sink connection can occur while field sectors begin slewing, a pure sum is unnecessarily pessimistic.

If both operations draw from the same converter at more than the available rating, a pure `max()` is dangerously optimistic.

The operation scheduler therefore acts as a lower-layer physical timing authority. The dynamic escape envelope must conservatively use whichever bound is larger:

\[
\boxed{
t_{\rm int,current}^{+}
\ge
\max
\left(
t_{\rm stage}^{+},
T_{\rm schedule}^{+}
\right).
}
\]

The scheduler is not permitted to make a previously certified ship “faster” merely because a newly written dependency graph happens to overlap work.

## 6. Renewable resource constraints

Let resource \(r\) have certified lower-bound capacity:

\[
C_r^{-}.
\]

Let operation \(i\) require bounded resource quantity:

\[
q_{i,r}^{+}
\]

while active.

For every instant:

\[
\boxed{
\sum_{i\in A(t)}
q_{i,r}^{+}
\le
C_r^{-}
}
\]

where \(A(t)\) is the set of operations active at time \(t\).

Typical renewable resources include:

- protected bus power;
- field-energy sink power;
- cooling transport/rejection;
- command-network channels or explicitly modeled bandwidth;
- solver compute where a capacity model actually exists;
- hydraulic flow;
- actuator authority;
- reference/synchronization channels.

The word “renewable” here means reusable across time during the abort, not magically inexhaustible.

### 6.1 Instantaneous demand is not average demand

Suppose two operations each require 3 MW for one second, overlap completely, and the protected bus can deliver 4 MW.

Total energy is only:

\[
E=6~{\rm MJ}.
\]

But instantaneous demand is:

\[
P=6~{\rm MW}>4~{\rm MW}.
\]

The schedule is not valid just because the battery contains more than 6 MJ.

\[
\boxed{
\text{enough joules}\neq\text{enough watts}.
}
\]

## 7. Consumable resources

Consumable reserve is handled separately.

For a protected-energy reserve:

\[
E_{\rm req}
=
\sum_i E_i.
\]

Certification requires:

\[
\boxed{
E_{\rm req}
\le
E_{\rm available}^{-}.
}
\]

If an operation has approximately constant bounded power over its bounded duration and that approximation is justified:

\[
E_i^{+}
\le
P_i^{+}d_i^{+}.
\]

Do not use that expression for a strongly time-varying load without a justified bound. The physically correct general relation is:

\[
\boxed{
E_i
=
\int_{t_0}^{t_1} P_i(t)\,dt.
}
\]

## 8. Resource contention and arbitration

A precedence-valid schedule can still be physically impossible.

Imagine:

```text
                     operation A: 3 MW
command complete ────┤
                     operation B: 3 MW

protected bus capacity: 4 MW
```

Precedence allows simultaneous execution.

Capacity does not.

If an authoritative control law says:

```text
A then B
```

the scheduler adds the serialization edge:

\[
A\rightarrow B.
\]

If it says:

```text
B then A
```

it adds:

\[
B\rightarrow A.
\]

If nothing selects an ordering, the runtime returns:

`AOS-CONTENTION-UNRESOLVED`.

It does not silently choose whichever order gives the prettier answer.

This matters because ordering can change survival.

One operation might restore sensor certainty while another opens a field-energy sink. There is no generic engineering rule saying which should always win.

## 9. Critical path

Once dependencies and authorized serialization are represented, the critical path is the source-to-sink path whose bounded duration equals the makespan.

For example:

```text
detect 0.4
   ↓
solve 0.8
   ↓
command 0.15
   ├───────────────┐
   ↓               ↓
isolate 0.30     slew 1.80
   ↓               │
dump 2.40          │
   └───────┬───────┘
           ↓
        clear 0.60
```

With enough protected power for `dump` and `slew` to overlap:

- detect: 0.00–0.40
- solve: 0.40–1.20
- command: 1.20–1.35
- isolate: 1.35–1.65
- slew: 1.35–3.15
- dump: 1.65–4.05
- clear: 4.05–4.65

Therefore:

\[
\boxed{
T_{\rm abort}^{+}=4.65~{\rm s}.
}
\]

But if `slew` needs 2 MW and `dump` needs 3 MW while only 4 MW is available, the overlap is not valid.

If authority serializes `slew` before `dump`:

- slew: 1.35–3.15
- dump: 3.15–5.55
- clear: 5.55–6.15

so:

\[
\boxed{
T_{\rm abort}^{+}=6.15~{\rm s}.
}
\]

The 1.5-second difference is not narrative flavor. It can decide whether the ship clears a route blocker.

## 10. Thermal contention

Cooling is also a shared resource.

For a short lumped thermal control volume:

\[
C_{\rm th}\frac{dT}{dt}
=
P_{\rm heat}
-
P_{\rm reject}.
\]

If multiple simultaneously active abort operations inject heat:

\[
P_{\rm heat,total}(t)
=
\sum_{i\in A(t)}P_{{\rm heat},i}(t).
\]

Then a cooling-capacity scheduler may impose:

\[
\boxed{
\sum_{i\in A(t)}q_{i,\rm cooling}
\le
C_{\rm cooling}^{-}
}
\]

when `q` is explicitly defined as required cooling transport/rejection.

This scheduling constraint does not replace the thermal-hold model. It answers whether the cooling system can support a concurrent machinery schedule. The thermal model answers how temperature evolves.

## 11. Command and reference networks

Network continuity is insufficient.

A surviving path has propagation:

\[
\tau_p=\sum_e\tau_e.
\]

The dynamic escape authority already charges excess latency:

\[
\Delta\tau=\max(0,\tau_p-\tau_0).
\]

The scheduling layer adds another question:

> Can the surviving network carry all simultaneous abort-control operations?

Only use a network-capacity quantity when the project has an actual definition for it. Do not invent Mbps requirements for an alien deterministic bus merely because terrestrial networks use bits per second.

A normalized `commandNetwork` capacity is acceptable only when its normalization is defined by the installation authority.

## 12. Family scheduling patterns

### 12.1 Inertial Torch

Likely concurrency:

- attitude slew while main-engine throttle changes;
- solver refinement while command distribution begins, if the control design permits speculative/rolling solutions;
- radiator deployment while braking starts.

Likely contention:

- shared propellant feed;
- thrust-vector actuators;
- attitude-control authority;
- structural acceleration limits;
- protected power.

The ordinary-space physics remain:

\[
t_F\ge\frac{m|\Delta v|}{F_{\rm available}}.
\]

The scheduler only decides when that operation can begin and which machinery it can share.

### 12.2 Metric Compression

Likely operations:

```text
detect fault
   ↓
freeze field growth
   ├── rebalance sectors
   └── connect sinks
            ↓
       dispose stored energy
            ↓
         unwind field
```

Whether sector rebalancing and sink connection overlap is an engineering-control question.

### 12.3 Gravitational Plane

The safety package may need:

- tidal-tensor branch localization;
- detach-boundary solution;
- coupling reduction;
- coupling-vector slew;
- release-energy sinking;
- plane detachment;
- shear-branch clearance.

The field basis remains:

\[
T_{ij}
=
\frac{\partial g_i}{\partial x_j}
=
-\frac{\partial^2\Phi}{\partial x_i\partial x_j}.
\]

Scheduling does not reinterpret the gravity model.

### 12.4 Slipstream Shear

The abort sequence may share distributed couplers, adhesion controllers, sinks, and cooling.

If several coupler banks must release in a controlled pattern, the operation graph should contain that pattern. Do not compress a physically staged release into one arbitrary `exitTime`.

### 12.5 Q-Lattice

A representative dependency chain can be:

```text
detect reference fault
        ↓
freeze address epoch
        ↓
solve rejection state
        ├── halt transition elements
        └── preserve local reference
                ↓
       isolate transition energy
                ↓
       verify no partial commit
```

Reference-bus contention can matter even when large power flows do not.

### 12.6 N-Manifold

Return-map verification and embedding-state control may compete for estimator/reference resources.

The system remains PRECOMMIT. Scheduling machinery does not imply continuous travel velocity.

### 12.7 Fold Jump

Endpoint rejection, closure arrest, sink switching and field-energy disposal can form a strongly resource-coupled abort.

A damaged sink bank may transform a previously parallel sequence into an explicitly serialized one.

### 12.8 Phase Displacement

Whole-object reference reconciliation can be bandwidth/reference-network limited even when energy physics remain deliberately unspecified.

The scheduler may model the coordination dependency without inventing a microscopic displacement mechanism.

### 12.9 Wormhole / Gate

Gate emergency scheduling frequently has occupancy dependencies:

```text
STOP NEW ADMISSION
        ↓
TRACK OCCUPIED APERTURE
        ↓
CLEAR / HOLD TRAFFIC
        ↓
BEGIN CLOSURE
        ↓
SINK THROAT ENERGY
        ↓
VERIFY BOTH MOUTHS
```

Some closure machinery may start before full traffic clearance only if a narrower gate authority explicitly permits partial-aperture sequencing.

## 13. Ar’nock machinery embodiment

For ordinary Ar’nock systems:

```text
solid-state sensor modules
          ↓
silicon estimators / interlocks
          ↓
deterministic sectional command network
          ↓
integrated converter / sink assemblies
          ↓
field-former / actuator modules

piezoelectric condition channels
          └──► alignment / structural /
               actuator-health evidence
```

Scheduling consequences can include:

- a surviving deterministic command path with insufficient simultaneous channel authority;
- converter modules that each pass static tests but cannot jointly support field slew and energy dumping;
- cooling modules that force sequential high-load operations;
- a replaced solid-state module with longer arbitration latency;
- piezoelectric evidence indicating an actuator bank cannot be used concurrently at full authority.

Bioprinting is still not the default answer to any of these problems.

## 14. Zwlei Mur’rek machinery embodiment

The same abstract schedule may be realized through:

```text
Sensor Choir / Forward Sensor Ampulla
              ↓
Navigation Current reference
              ↓
hydraulic command distribution
         ┌────┴─────┐
         ↓          ↓
field-vane slew   isolation valves
         │          │
         └────┬─────┘
              ↓
 bio-reactive power-fluid control
              ↓
dielectric / conductive-fluid recovery
```

Shared resources may include:

- hydraulic flow;
- pressure authority;
- bio-reactive power-fluid delivery;
- conductive coolant;
- Navigation Current reference channels;
- vane actuation authority.

A phrase such as “gravitic slipstream” still does not select a consolidated transit family.

## 15. Scaling

Scale only a dependency that has actual physical meaning.

Valid examples include:

\[
\tau_{\rm signal}\ge\frac{L}{v_{\rm signal}}
\]

for a known propagation path, or:

\[
t_F\ge\frac{m\Delta v}{F}
\]

for ordinary impulse.

An increased number of independently controlled field sectors may increase the number of operations or communication/resource demand **if the family authority says those sectors must be controlled independently**.

Do not assert:

- abort time scales as vessel length;
- compute time scales as protected volume;
- sink power scales as ship mass;
- gate closure time scales as aperture radius;

without an actual model.

## 16. Signatures

A schedule changes external and internal signatures.

Parallel operations can create a short high-amplitude power transient.

Serialized operations can produce a longer, lower-amplitude signature.

For power:

\[
P_{\rm total}(t)
=
\sum_{i\in A(t)}P_i(t).
\]

For energy:

\[
E_{\rm total}
=
\int P_{\rm total}(t)\,dt.
\]

Two abort schedules can consume similar energy while producing radically different peak power, heat, electromagnetic, hydraulic, optical, gravitational-field, or exhaust signatures.

Therefore:

\[
\boxed{
\text{same energy}\neq\text{same signature}.
}
\]

## 17. Failure taxonomy

| Code | Meaning |
|---|---|
| `AOS-CYCLE` | operation dependency graph cannot be executed |
| `AOS-DURATION-UNKNOWN` | required operation has no bounded duration |
| `AOS-DEPENDENCY-MISSING` | predecessor reference is absent |
| `AOS-CAPACITY-MISSING` | required shared resource lacks certified capacity |
| `AOS-CAPACITY-EXCEEDED` | one operation alone exceeds available capacity |
| `AOS-CONTENTION-UNRESOLVED` | legal DAG overlap exceeds capacity, but no arbitration authority selects an order |
| `AOS-ENERGY-RESERVE` | nonrenewable reserve is insufficient |
| `AOS-ORDER-CONFLICT` | declared serialization is contradictory/cyclic |
| `AOS-UNIT-CONFLICT` | resource units do not match |
| `AOS-PROVENANCE-GAP` | required scheduling evidence cannot be traced |

## 18. Practical procedure AOS-01

**FTL Abort Dependency and Resource Schedule Certification**

1. Identify the canonical transit family from family authority.
2. Obtain the current family-response machinery packet.
3. Enumerate physical abort operations. Do not write “abort drive” as one operation when the machine authority exposes smaller operations.
4. Assign a stable operation ID.
5. Assign a bounded duration or a traceable duration source.
6. Declare predecessors.
7. Declare renewable resource demand only for resources with defined capacity semantics.
8. Declare consumable demand separately.
9. Record every capacity lower bound and unit.
10. Run DAG validation.
11. Calculate earliest start/finish and precedence makespan.
12. Check every overlap window against resource capacity.
13. If contention exists, obtain explicit arbitration/serialization authority.
14. Re-run after adding only those authorized ordering edges.
15. Check consumable reserves.
16. Record the critical operations and makespan.
17. Feed the schedule packet into dynamic escape.
18. Compare the resulting current intervention burden with the predictive route-blocker horizon.
19. Preserve provenance and unresolved evidence.
20. Do not promote to operational admission from scheduling evidence alone.

## 19. API packet example

```json
{
  "family": "metric-compression",
  "operations": [
    {
      "id": "freeze",
      "durationUpperSeconds": 0.15,
      "predecessors": [],
      "resourceDemand": {"commandNetwork": 1},
      "provenance": ["service-certificate:MC-44"]
    },
    {
      "id": "slew",
      "durationUpperSeconds": 1.8,
      "predecessors": ["freeze"],
      "resourceDemand": {"protectedPower": 2000000}
    },
    {
      "id": "dump",
      "durationUpperSeconds": 2.4,
      "predecessors": ["freeze"],
      "resourceDemand": {"protectedPower": 3000000},
      "consumableDemand": {"protectedEnergy": 7200000}
    }
  ],
  "resourceCapacities": {
    "commandNetwork": 2,
    "protectedPower": 4000000
  },
  "consumableReserves": {
    "protectedEnergy": 12000000
  }
}
```

Because `slew` and `dump` are independent in the graph, their initial overlap requests 5 MW from a 4 MW bus.

Without an arbitration rule:

\[
\boxed{\text{UNRESOLVED}}.
\]

If a certified interlock says `slew` must complete before `dump`, add:

```json
{
  "resourceSerialization": [
    {
      "resource": "protectedPower",
      "order": ["slew", "dump"],
      "authority": "MC-44 abort interlock table 7"
    }
  ]
}
```

Then recompute the schedule.

## 20. Educational text: Transit Safety Engineering 810

### Course title

**Transit Safety Engineering 810 — Abort Critical Paths, Shared Resources, and Machine Scheduling**

### Learning objectives

A qualified engineer must be able to:

- distinguish precedence constraints from resource constraints;
- construct an abort-operation DAG from equipment documentation;
- calculate earliest-start and earliest-finish bounds;
- identify a critical path;
- demonstrate renewable resource capacity over every overlap interval;
- separate instantaneous power from stored energy;
- explain why an unresolved arbitration policy is an engineering uncertainty, not permission to choose an order;
- trace a resource-constrained makespan into dynamic escape and route safety;
- describe how Ar’nock and Mur’rek machinery embody the same scheduling mathematics differently.

### Examination prompt

A damaged fold vessel has two independent post-command operations:

- former slew: \(1.6\) s at \(2.5\) MW;
- sink establishment: \(1.1\) s at \(2.0\) MW.

Protected bus capacity is \(3.5\) MW.

Explain why the precedence graph alone does not certify simultaneous execution, why total stored energy cannot resolve the peak-power conflict, and what additional control-authority evidence is required before an abort time can be certified.

## 21. Generator doctrine

The generator must prefer an unresolved truth over a fabricated precision.

Never:

- pick serialization by array order;
- invent a priority from technology tier;
- assume all operations are sequential;
- assume all operations are parallel;
- average peak demand across the complete abort;
- convert stored energy into arbitrary peak power;
- erase a resource conflict because the route is otherwise favorable;
- infer a family from race or machinery aesthetics.

Always preserve the evidence needed to reproduce the schedule.

## 22. Canon safeguards

\[
\boxed{
\text{DAG-valid}
\neq
\text{resource-valid}
}
\]

\[
\boxed{
\text{resource-valid}
\neq
\text{route-safe}
}
\]

\[
\boxed{
\text{stored energy}
\neq
\text{instantaneous delivery capacity}
}
\]

\[
\boxed{
\text{possible concurrency}
\neq
\text{certified concurrency}
}
\]

\[
\boxed{
\text{missing arbitration}
\neq
\text{permission to choose an order}
}
\]

The purpose of this authority is not to make FTL machinery look complicated. It is to make its emergency behavior internally accountable: every second in the abort timeline should come from an operation, every operation should have a physical reason, every overlap should have enough machinery to support it, and every forced sequence should have an identifiable engineering authority behind it.
