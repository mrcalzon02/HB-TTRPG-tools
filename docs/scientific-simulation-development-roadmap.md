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
Status: PARTIAL / active.

Implemented:
- explicit H+ + H close encounters evaluate the local relative collision energy;
- the local energy-dependent charge-exchange cross section determines the effective interaction radius;
- successful exchange transforms projectile H+ → H and target H → H+;
- the energetic neutral immediately stops magnetic gyration and continues ballistically;
- reaction lineage, impact parameter, relative speed, energy and state transition are retained.

Required completion:
- stochastic mean-free-path event execution over continuum transport mode without double-counting explicit-particle encounters;
- re-ionization and additional reaction channels;
- broader cross-section provenance/data coverage;
- dedicated energetic-neutral inspection and detector products.

## ISM-06 — Momentum/energy-conserving oblique scattering
Status: PARTIAL / active.

Implemented:
- Debye-screened H+–H+ two-body center-of-momentum elastic scattering;
- oblique geometry derives the scattering plane from the actual impact parameter;
- projectile and target velocities are both updated;
- per-run maximum momentum residual and kinetic-energy error are reported;
- nonrelativistic solver is explicitly gated at relative β ≥ 0.1.

Required completion:
- relativistic two-body solver for higher-energy settings;
- additional species/mass combinations;
- validated limiting-case comparisons against Rutherford/screened-scattering expectations;
- conservation regression thresholds.

## ISM-07 — Temperature and Maxwellian target velocities
Status: PARTIAL / active.

Implemented foundation:
- Maxwellian thermal velocity is sampled from species mass and configured temperature;
- cold/warm/hot temperature presets remain available;
- closest approach now follows the relative projectile/target trajectory during each transport segment;
- relative speed drives local charge-exchange energy and Coulomb scattering.

Required completion:
- configurable bulk flow;
- species-specific temperature handling where appropriate;
- moving-particle spatial-index expansion for regimes where thermal displacement is no longer negligible across a segment.

## ISM-08 — Interaction inspection overlays and physical-regime diagnostics
Status: PARTIAL / active.

Implemented diagnostics:
- interaction regime classification from active collision and magnetic scales;
- collision optical depth and per-traversal collision probability;
- Knudsen λ/L;
- gyro-radius / cube scale;
- ωc / collision-frequency magnetization ratio;
- particles per Debye sphere and Debye-length / mean-spacing diagnostics;
- magnetic importance and collisionality labels;
- explicit solver validity gating and conservation residuals.

Required inspection overlays:
- selectable trajectory/event inspection;
- local velocity and momentum vectors;
- nearest candidates and closest approach geometry;
- impact parameter and relative velocity;
- Debye radius and local magnetic field;
- gyroradius and pitch angle;
- selected interaction probability/channel;
- solver/approximation used at the inspected event.

Required diagnostics should continue classifying effects as dominant, significant, small, negligible, below numerical resolution, or outside model validity when defensible.

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
Status: PARTIAL / active.

Implemented foundation:
- slit-specific photon polarization can mark the paths;
- a linear analyzer projects both paths into one transmitted polarization basis;
- the displayed detector distribution becomes the conditional transmitted ensemble;
- orthogonal path marking suppresses ordinary interference and analyzer projection can restore conditional interference;
- UI explicitly states that this does not imply retrocausal information transfer.

Required completion:
- paired complementary analyzer outputs / fringes and antifringes;
- simultaneous unconditional ensemble plus conditional subensemble comparison;
- event tagging by analyzer output channel;
- delayed-choice configuration may follow only after the ordinary eraser is validated.

## DSL-04 — Physical coherence controls
Status: PARTIAL / active.

Implemented:
- photon spectral FWHM, electron energy FWHM spread, and matter-wave wavelength FWHM spread;
- deterministic five-sample Gaussian spectral/energy averaging of the actual propagation kernel;
- transverse RMS source size and source-to-slit distance derive an angular source width;
- independent RMS angular divergence;
- Gaussian spatial-coherence factor suppresses the interference cross-term;
- approximate spectral coherence length λ²/Δλ and all angular/coherence factors are reported;
- residual phenomenological coherence remains explicitly labeled as residual rather than physical source geometry.

Required completion:
- higher-order/adaptive spectral quadrature for broad distributions;
- source-profile selection beyond Gaussian/RMS approximation;
- validation cases against analytic coherence envelopes;
- source-type-specific coherence terminology and energy/wavelength conversion diagnostics.

## DSL-05 — Polarization per slit
Status: PARTIAL / active.

Implemented:
- independent linear polarization angle at slit A and slit B;
- polarization overlap contributes quantitatively to path distinguishability;
- orthogonal path markers suppress the interference cross-term;
- optional linear analyzer applies Malus-law path amplitudes and restores interference in the conditional transmitted subset;
- analyzer transmission and polarization distinguishability are reported.

Required completion:
- circular and elliptical polarization states;
- complementary analyzer output channel rather than only transmitted conditional subset;
- polarization-state visualization and Stokes/Jones diagnostics where useful.

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
Status: PARTIAL / active.

Implemented:
- deterministic fast accumulation targets at 10, 100, 1,000, 10,000, and 100,000 events;
- fast accumulation samples the same active detector probability distribution and yields cooperatively;
- expected per-bin probabilities are derived from the active theoretical distribution;
- normalized distribution RMSE;
- Pearson χ² and reduced χ² only across bins whose expected count is at least 5;
- eligible-bin count and degrees of freedom are reported.

Required completion:
- residual plot rather than scalar metrics only;
- confidence/uncertainty bands;
- staged convergence history as N grows rather than only the current endpoint;
- statistical validation/regression cases for seeded runs.

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
Status: INCREMENTAL IMPLEMENTATION.

Implemented:
- homogeneous sphere analytic interior/exterior Newtonian field;
- symmetric pairwise extended-body force integration that applies equal/opposite forces and preserves linear momentum;
- deterministic equal-volume quadrature for rectangular prisms, tetrahedra, octahedra, icosahedra, finite elliptical disks, ellipsoids, and tori;
- user-selectable point-mass versus extended-geometry interaction model;
- user-controlled mass or density authority, physical X/Y/Z dimensions, and static Euler orientation independent from display scale;
- configurable quadrature resolution and far-field collapse threshold;
- current shape-force delta versus the point model;
- standardized 20-bounding-radius far-field comparison against the point-mass limit;
- resolution-to-resolution convergence diagnostic.

Still required before GRAV-02 is complete:
- higher-order/adaptive quadrature near surfaces and close encounters;
- analytic rectangular-prism comparison cases;
- explicit thin-ring limit and higher-fidelity disk/ring families;
- exact shape contact rather than conservative bounding-volume collision stops;
- broader regression cases across orientation, aspect ratio, density mode, and quadrature resolution.
## GRAV-03 — Multi-body experiment library
Status: INCREMENTAL IMPLEMENTATION.

Implemented:
- idealized circular restricted three-body state generator;
- numerically solved collinear L1 equilibrium plus analytic equilateral L4/L5 states;
- Earth–Moon L1, L4, and L5 demonstration presets using a 1 kg tracer so back-reaction remains negligible;
- a hierarchical triple benchmark with a two-body inner binary carried on an outer solar orbit;
- explicit preset provenance notes distinguishing idealized/reference initial conditions from date-specific ephemerides;
- inertial, full-system center-of-mass, and bodies-1–2 co-rotating display reference frames;
- reference-frame transforms are presentation-only and do not alter solver state.

Still required before GRAV-03 is complete:
- L2 and L3 user-facing presets;
- broader restricted-three-body families and mass-ratio controls;
- close-encounter and moving-planet gravity-assist/slingshot experiments;
- additional stable/unstable hierarchical triple configurations;
- date-specific ephemeris import as a separately labeled empirical initial-condition source;
- rotating-frame effective-potential / zero-velocity-surface diagnostics.
## GRAV-04 — Field, potential, and tidal diagnostics
Status: INCREMENTAL IMPLEMENTATION.

Implemented:
- 3D gravitational acceleration vector field inspection;
- scalar Newtonian potential Φ evaluation for point masses, analytic homogeneous spheres, and quadrature-based extended solids;
- analytic homogeneous-sphere interior potential;
- symmetric Newtonian tidal tensor evaluation ∂gᵢ/∂xⱼ;
- analytic homogeneous-sphere interior tidal tensor;
- quadrature-based extended-body tidal tensor with the same cell-scale regularization used by internal field sampling;
- page-visible potential and tidal-tensor slice maps in inertial, barycentric, or co-rotating display coordinates;
- logarithmic map rendering while retaining physical m²/s² and s⁻² ranges.

Still required before GRAV-04 is complete:
- equipotential contours and optional 3D isosurfaces;
- escape-speed surfaces and zero-velocity surfaces for compatible rotating-frame models;
- dominant-source decomposition and local contribution inspection;
- per-cell numerical-error / convergence overlays;
- principal tidal eigenvalue/eigenvector visualization and Roche-limit experiment support.
## GRAV-05 — Contact, collision, and finite-body interactions
Status: INCREMENTAL IMPLEMENTATION.

Implemented:
- explicit user-selectable collision handling rather than automatic hidden behavior;
- Halt mode preserves the pre-contact model boundary;
- perfectly inelastic spherical-remnant merge with mass, volume, and linear-momentum conservation audit;
- collision-remnant equivalent-volume radius and derived density;
- frictionless elastic hard-sphere impulse available only when both bodies are homogeneous spheres;
- center-of-mass-preserving positional depenetration for the hard-sphere approximation;
- collision audit reporting momentum residual, kinetic-energy change/error, mass error, and depenetration;
- velocity-Verlet reorganized into half-step velocity form so collision response occurs between drift and final acceleration kick;
- unsupported elastic shape combinations halt instead of silently applying sphere physics.

Still required before GRAV-05 is complete:
- exact shape contact rather than conservative bounding-volume overlap for non-spherical bodies;
- angular momentum transfer into remnant spin for inelastic mergers;
- rigid-body angular velocity, inertia tensors, friction, and tangential impulse;
- deformation/material response models;
- fragmentation remains disabled until an explicit material/failure model exists.
## GRAV-06 — General-relativistic model layers
Status: INCREMENTAL IMPLEMENTATION / weak-field test-particle layer only.

Implemented:
- exact speed-of-light constant c = 299,792,458 m/s;
- Schwarzschild radius Rs = 2GM/c² diagnostics for body 1;
- relative two-body orbital-element extraction for the selected tracer;
- static Schwarzschild clock-rate diagnostic sqrt(1 - Rs/r);
- first-order Schwarzschild periapsis-advance prediction 6πGM/[a(1-e²)c²];
- optional standard weak-field 1PN Schwarzschild test-particle acceleration correction for one selected target body around body 1;
- automatic validity gate that withholds the correction when target/central mass ratio exceeds 10⁻³, relative speed reaches 0.3c, or radius falls within 10 Rs;
- a compact-source precession demonstration using a 1 kg tracer around a 10-solar-mass source;
- live display of Rs, r/Rs, static dτ/dt, predicted periapsis advance, compactness, v/c, and mass-ratio validity information;
- explicit warning that the Newtonian energy-drift diagnostic is not a conserved 1PN energy integral.

Still required before GRAV-06 is complete:
- exact Schwarzschild test-particle geodesic integration and comparison against the 1PN approximation;
- measured numerical periapsis advance from completed simulated orbits versus the analytic weak-field prediction;
- proper 1PN conserved quantities / diagnostic ledger;
- comparable-mass 1PN or Einstein-Infeld-Hoffmann dynamics;
- proper-time accumulation along moving trajectories rather than only the static clock factor;
- Kerr metric and frame-dragging work in a separate explicitly labeled solver;
- gravitational-radiation reaction and waveform layers only after their own validity regime is implemented;
- never portray the Newtonian field arrows, scalar potential maps, or decorative embedding surfaces as a solution to Einstein's field equations.
## GRAV-07 — Non-Euclidean geometry laboratory
Status: INCREMENTAL IMPLEMENTATION / intrinsic mathematics layer only.

Implemented:
- explicit separation between intrinsic mathematical geometry and physical gravitational dynamics;
- 2D constant-curvature Euclidean, spherical, and hyperbolic models in geodesic polar coordinates;
- line element ds² = dr² + S_K(r)² dθ² with S_K(r) = r, R sin(r/R), or R sinh(r/R);
- Gaussian curvature K = 0, +1/R², or −1/R²;
- geodesic-circle circumference and disk-area calculations;
- normalized circumference C/(2πr), area A/(πr²), and radial geodesic-deviation J/r diagnostics;
- equilateral geodesic-triangle angle sum with positive spherical excess and negative hyperbolic defect;
- page-visible intrinsic-geometry chart comparing circumference and area growth against Euclidean geometry;
- explicit metric, coordinate system, dimensionality, curvature radius, and no-gravity-coupling declaration;
- no Euclidean 3D embedding is required or presented as the intrinsic geometry.

Still required before GRAV-07 is complete:
- arbitrary geodesic initial-value integration on selected metrics;
- explicit spherical and hyperbolic geodesic path visualizations;
- selectable coordinate charts, including stereographic/Poincaré representations labeled as coordinate models rather than embeddings;
- geodesic triangles with arbitrary side lengths and Gauss–Bonnet area cross-checks;
- parallel transport and holonomy demonstrations;
- higher-dimensional constant-curvature manifolds and user-supplied metric tensors only after metric validation and singularity handling are implemented;
- any coupling between non-Euclidean mathematics and a physical gravity model must be introduced as a separate solver with explicit field equations, not by reusing visualization curvature.
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
