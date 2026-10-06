# Scientific Simulation Development Roadmap

Status: active implementation contract  
Scope: Scientific Tools / Double Slit Experiment Visualizer / Interstellar Media Collisions / Gravitational Simulation Laboratory  
Authority: this document records the intent to design, implement, validate, and retain the complete simulation program described below. Items marked partial are not complete merely because a first approximation exists.

## Scientific credibility contract

1. Established physics, numerical approximations, exploratory hypotheses, and fictional Blacklight interactions must be visibly distinguished in both code and UI.
2. Randomness may represent a defined stochastic process, sampled physical distribution, Monte Carlo transport, measurement statistics, or an explicitly fictional hypothesis. Randomness must never be added merely to make motion look interesting.
3. Controls must reach observable implemented behavior. No inert/placebo scientific controls.
4. Every approximation must expose its regime of validity where practical. A model should report when an effect is below numerical resolution or when the active approximation is outside its reliable domain.
5. Seeded runs remain reproducible unless a user explicitly requests nondeterministic sampling.
6. Conservation of momentum, energy, charge, and probability normalization must be checked wherever the modeled interaction requires them. Numerical drift must be reported rather than hidden.
7. Established-physics defaults should not silently enable speculative Quantum Foam, Shadow, Phase Light, or other Blacklight-only interactions.
8. Expensive calculations remain cooperative/interruptible so model fidelity does not require freezing the page.

# Interstellar Media Collisions program

## ISM-01 — Impact-parameter / closest-approach solver with oblique encounters
Status: PARTIAL / active.

Implemented foundation:
- explicit segment-to-particle closest approach;
- spatial neighborhood index;
- oblique encounter geometry and impact parameter;
- proximity-triggered interactions instead of choosing an arbitrary particle.

Required completion:
- moving-target closest approach;
- relative-velocity geometry;
- interaction-channel selection based on species, energy, charge state, and cross section;
- convergence/accuracy validation.

## ISM-02 — Energy-dependent cross sections and mean-free-path collision sampling
Status: PARTIAL / active.

Implemented foundation:
- provenance-labeled H+ + H charge-exchange table for 5–80 keV;
- log-space interpolation inside the data range with no silent extrapolation;
- mean free path λ = 1/(nσ);
- exponential free-path sampling s = -λ ln(U);
- optical/collision-depth diagnostics;
- explicit cross-section-radius encounter detection.

Required completion:
- broader projectile/target/process registry;
- production-grade ADAS/IAEA data ingestion and provenance;
- process branching and actual state transformation;
- validation across additional energy ranges.

## ISM-03 — Debye-screened proximity interactions for charged particles
Status: PARTIAL / active.

Implemented foundation:
- ionized-fraction and temperature inputs;
- Debye-length calculation;
- fixed-center screened Coulomb proximity deflection benchmark.

Required completion:
- moving charged targets;
- mutual momentum transfer;
- electrons and multiple ion species;
- clear distinction between binary-collision and collective-field regimes.

## ISM-04 — Species + charge-state foundation
Status: PARTIAL / active.

Implemented foundation:
- particle records now carry species id, mass, charge and velocity;
- catalog foundation exists for H, H+, electron, He and dust;
- current generated medium populates H/H+ while additional species remain staged for the next composition pass.

Required species foundation:
- H;
- H+;
- e-;
- He;
- He+ where useful;
- dust grains with mass, radius, composition, and charge state foundation.

Each particle record should support species, mass, charge, velocity, kinetic state, and current interaction state.

## ISM-05 — Charge exchange and energetic-neutral-atom trajectories
Status: PLANNED.

Required:
- proton + neutral-H charge exchange;
- state transformation rather than cosmetic effect;
- magnetic response ends when projectile becomes neutral;
- re-ionization/secondary interactions can restore charged behavior;
- record reaction lineage.

## ISM-06 — Momentum/energy-conserving oblique scattering
Status: PLANNED.

Required:
- center-of-momentum or equivalent two-body solution;
- target recoil;
- elastic scattering baseline;
- explicit conservation audit;
- screened Coulomb/Rutherford-style limiting cases where valid.

## ISM-07 — Temperature and Maxwellian target velocities
Status: PARTIAL / active.

Implemented foundation:
- Maxwellian thermal velocity is sampled from species mass and configured temperature;
- cold/warm/hot temperature presets remain available.

Required completion:
- configurable bulk flow;
- moving-target closest approach;
- relative velocity v_rel drives collision energy and channel selection;
- species-specific temperature handling where appropriate.

## ISM-08 — Interaction inspection overlays and physical-regime diagnostics
Status: PLANNED.

Required inspection:
- local velocity and momentum;
- nearest candidates and closest approach;
- impact parameter;
- relative velocity;
- Debye radius;
- mean particle spacing;
- local magnetic field;
- gyroradius and pitch angle;
- selected interaction probability/channel;
- solver/approximation used.

Required diagnostics should classify effects as dominant, significant, small, negligible, below numerical resolution, or outside model validity when defensible.

## ISM-09 — Hypothesis-layer isolation
Status: PARTIAL / active.

Implemented foundation:
- established proton transport is now the default laboratory path;
- Quantum Foam defaults Off;
- Shadow coupling defaults to zero and is explicitly labeled an optional fiction hypothesis;
- Phase Light wording has been removed from the default beam/run controls.

Required completion:
- formal layer registry with independent enable/disable state;
- hypothesis gain/amplification cannot be mistaken for physical prediction;
- established and fictional outputs should be separately reportable;
- Blacklight-specific Phase Light behavior, when implemented, must live only inside its explicit optional layer.

## ISM future extensions retained by intent
Status: PLANNED.

- proton–proton, proton–electron, and electron–electron mutual interactions;
- charged-beam self fields and space-charge effects;
- pairwise-vs-nearest-neighbor-vs-mean-field comparison;
- collective Particle-in-Cell-style field mode;
- plasma oscillations, ion-acoustic, Alfvén, and magnetosonic wave experiments;
- two-stream instability;
- beam halo/emittance behavior;
- spatially varying, curved, turbulent, helical, and shock-compressed magnetic fields;
- magnetic mirroring, pitch-angle scattering, and cross-field diffusion;
- oblique shock laboratory;
- wavelength/energy-dependent photon transport through ISM matter;
- a conservation/numerical-error auditor.

# Double Slit Experiment program

## DSL-01 — Fresnel ↔ Fraunhofer propagation
Status: IMPLEMENTED FOUNDATION / validation continuing.

Implemented:
- numerical finite-aperture Fresnel integral;
- automatic selection of Fresnel propagation in transition/near regimes and analytic Fraunhofer propagation in the far field;
- detector distance extended down to 1 mm;
- automatic Near field / Transition regime / Far field classification;
- paraxial-geometry validity diagnostic.

Required completion:
- numerical-vs-analytic convergence comparison in the far-field limit;
- validation cases and regression thresholds;
- optional higher-fidelity scalar propagation when the paraxial approximation is outside its reliable range.

## DSL-02 — Partial which-path measurement
Status: IMPLEMENTED FOUNDATION / validation continuing.

Implemented:
- continuous path distinguishability D rather than a binary checkbox;
- source-coherence-dependent fringe visibility;
- V, D, and V² + D² reporting;
- continuous suppression of the interference cross-term.

Required:
- apparatus-driven distinguishability from polarization/path markers rather than only a direct D slider;
- experimental-data validation.

## DSL-03 — Quantum eraser apparatus
Status: PLANNED.

Required:
- path marking;
- conditional subensembles;
- analyzer basis;
- recovered conditional fringes/antifringes;
- delayed-choice configuration may follow;
- explicit statement that the model does not imply retrocausal information transmission.

## DSL-04 — Physical coherence controls
Status: PLANNED.

Required:
- spectral bandwidth / energy spread;
- source size;
- angular divergence;
- derived temporal/spatial coherence;
- explain quantitatively why visibility is reduced.

## DSL-05 — Polarization per slit
Status: PLANNED.

Required:
- independent linear/circular polarization states;
- analyzer before detector;
- orthogonal path markers suppress interference;
- analyzer basis can recover conditional interference where appropriate.

## DSL-06 — Real detector physics
Status: PLANNED.

Required:
- pixel size;
- point-spread function;
- finite spatial resolution;
- quantum efficiency;
- dark counts;
- background;
- exposure time;
- Poisson counting noise;
- separate underlying probability from detector response.

## DSL-07 — Statistics / convergence laboratory
Status: PLANNED.

Required:
- observed vs theoretical distribution;
- residuals;
- χ² / reduced χ² where applicable;
- RMSE or comparable statistic;
- staged accumulation presets such as 10, 100, 1,000, 100,000 events;
- convergence reporting.

## DSL-08 — Single slit / double slit / N-slit grating
Status: PLANNED.

Required:
- N = 1...configurable;
- aperture geometry remains physically explicit;
- continuous diffraction → interference → grating behavior.

## DSL-09 — Unequal slit transmission
Status: PLANNED.

Required:
- independent amplitude/transmission per slit;
- optionally independent width;
- distinguish visibility loss from unequal amplitudes versus decoherence.

## DSL-10 — Phase plate / path phase control
Status: PLANNED.

Required:
- material refractive index and thickness for photon paths;
- optical-path phase shift;
- electron analogue via explicitly modeled electrostatic phase shifter where appropriate.

## DSL-11 — Momentum-space / uncertainty view
Status: PLANNED.

Required:
- aperture position-space view;
- transverse momentum distribution;
- slit-width changes visibly alter momentum spread;
- quantitative uncertainty diagnostics where the modeled state supports them.

## DSL-12 — Actual particle presets
Status: PLANNED.

Required foundation:
- photon;
- electron;
- proton;
- neutron;
- H atom;
- He atom;
- sodium atom;
- C60 fullerene;
- generic custom matter particle.

Matter presets should use mass and velocity/kinetic-energy controls rather than arbitrary wavelength alone.

## DSL-13 — Environmental decoherence
Status: PLANNED.

Required:
- background-gas pressure;
- temperature;
- scattering/decoherence rate;
- visibility loss derived from modeled environment rather than a cosmetic control.

## DSL-14 — Electromagnetic phase experiments
Status: PLANNED.

Required:
- advanced Aharonov–Bohm apparatus;
- enclosed magnetic flux changes relative phase;
- no fictitious classical force on shielded propagation paths;
- clear validity/idealization notes.

## DSL future extensions retained by intent
Status: PLANNED.

- charged many-particle beam mode distinct from single-event mode;
- proton/electron beam self-fields and space-charge behavior;
- neighbor and collective-field diagnostics;
- interaction-strength/regime gating so negligible effects remain negligible;
- ordinary optical photon mode with photon-photon interaction effectively zero;
- separately labeled strong-field/QED light-by-light research mode;
- nonlinear-medium optical propagation as matter-mediated photon interaction.

# Gravitational Simulation Laboratory program

## GRAV-01 — Newtonian N-body foundation
Status: IMPLEMENTED FOUNDATION / validation continuing.

Implemented:
- dedicated full-page laboratory rather than an overlay;
- 1–12 massive bodies with SI-unit internal state;
- editable mass, physical radius, 3D position, and 3D velocity;
- velocity-Verlet integration for pairwise Newtonian gravity;
- Earth–Moon, Sun–Earth, equal-mass binary, and three-body reference presets;
- physical-radius overlap detection that halts instead of inventing an impact/merger model;
- energy, momentum, angular-momentum, center-of-mass, and minimum-separation diagnostics;
- 3D trajectory trails and normalized Newtonian field-vector inspection;
- sphere, cube, tetrahedron, octahedron, icosahedron, and torus render primitives.

Scientific boundary:
- primitive shape affects rendering only in GRAV-01;
- point-mass gravity is not relabeled as solved cube, torus, or polyhedral gravity;
- visual trajectories are not represented as metric curvature.

Required completion:
- regression cases for two-body orbital period and conservation drift across timestep scales;
- adaptive timestep guidance and numerical-stability warnings;
- downloadable deterministic run state and diagnostic ledger.

## GRAV-02 — Euclidean extended-mass geometry
Status: PLANNED.

Required:
- homogeneous sphere analytic baseline;
- finite cube/rectangular prism mass integration;
- tetrahedral/polyhedral mass distributions;
- ring/torus and disk distributions;
- user-controlled density and dimensions distinct from display scale;
- comparison against point-mass far-field limits;
- numerical convergence/error diagnostics for discretized volume or surface integrals.

## GRAV-03 — Multi-body experiment library
Status: PLANNED.

Required:
- restricted three-body and circular restricted three-body configurations;
- Lagrange-point demonstrations;
- binary and hierarchical triple systems;
- close-encounter and slingshot experiments;
- configurable center-of-mass and barycentric reference frames;
- explicit presets must identify whether they are pedagogical initial conditions, idealized analytic cases, or date-specific ephemerides.

## GRAV-04 — Field, potential, and tidal diagnostics
Status: PLANNED.

Required:
- gravitational potential slices;
- acceleration magnitude contours and vector fields;
- tidal tensor / differential-acceleration inspection where numerically supported;
- escape-speed and zero-velocity surfaces for appropriate models;
- dominant-source and local-error diagnostics.

## GRAV-05 — Contact, collision, and finite-body interactions
Status: PLANNED.

Required:
- collision models must be selectable and physically labeled rather than automatic;
- inelastic merge baseline with mass and momentum conservation;
- elastic rigid-body approximation only when its assumptions are satisfied;
- fragmentation remains disabled until an explicit material/failure model exists;
- conservation audit before and after every resolved interaction.

## GRAV-06 — General-relativistic model layers
Status: PLANNED / separate solver.

Required:
- begin with explicitly scoped Schwarzschild test-particle/geodesic experiments;
- add periapsis precession and gravitational time-dilation demonstrations with validity ranges;
- later Kerr/frame-dragging work requires its own solver and diagnostics;
- never portray Newtonian force arrows or a decorative mesh warp as a solution to Einstein's field equations.

## GRAV-07 — Non-Euclidean geometry laboratory
Status: PLANNED / separate mathematics layer.

Required:
- distinguish mathematical non-Euclidean manifolds from physical general relativity;
- constant-curvature spherical and hyperbolic geometry demonstrations;
- geodesic/path behavior on selected metrics;
- metric, coordinates, curvature assumptions, dimensionality, and embedding visualization must be shown explicitly;
- an embedding picture is visualization only and must not be confused with the intrinsic geometry.

## GRAV-08 — Theory and hypothesis isolation
Status: PLANNED.

Required:
- established Newtonian/relativistic models, mathematical geometry experiments, exploratory alternatives, and fictional Blacklight hypotheses must have separate registries and visual labels;
- speculative modifications to gravity cannot alter the established baseline unless explicitly enabled;
- hypothesis outputs must carry their parameterization and cannot be reported as empirical prediction.

# Implementation order

The default implementation order is dependency-driven, not merely numeric:

1. DSL-01 true Fresnel propagation.
2. ISM-02 energy-dependent cross sections + mean-free-path sampling.
3. ISM-04 species/charge-state records + ISM-07 thermal velocities, because later interactions depend on them.
4. ISM-06 conservation-correct moving two-body scattering.
5. ISM-05 charge exchange.
6. ISM-08 inspection/regime diagnostics and shared conservation audit.
7. ISM-09 strict hypothesis-layer isolation.
8. DSL-04 physical coherence + DSL-05 polarization/path marking.
9. DSL-03 quantum eraser.
10. DSL-06 detector physics + DSL-07 convergence statistics.
11. DSL-08/09/10 aperture generalization, unequal transmission, and phase plates.
12. DSL-11/12 matter-wave and momentum-space expansion.
13. DSL-13/14 environmental decoherence and electromagnetic phase experiments.
14. Collective-field, plasma-wave, shock, nonlinear optics, and strong-field QED extensions.

This order may be revised when a prerequisite or validation result shows that a different dependency order is scientifically safer.
