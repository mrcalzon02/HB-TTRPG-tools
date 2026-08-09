# Signals Laboratory — Development Roadmap

## Purpose

The Signals Laboratory remains the setting-neutral RF/electromagnetic research suite inside Scientific Tools. The existing implementation covers direct RF propagation, monopole/dipole mapping, idealized single-bounce reflectivity, coherence, attenuation, impedance, heterodyne translation, adjacent-carrier effects, nonlinear products, frequency inference, and progressive spatial sampling.

The next development stage must extend that baseline without replacing the authoritative Signals Laboratory runtime or creating a second propagation engine.

## Next-stage antenna configuration

The RF Environment Mapper should gain a configurable tunable-antenna layer rather than treating map radiator geometry and the general RLC workbench as independent concepts.

Required controls:

- antenna geometry: isotropic reference, quarter-wave monopole, half-wave dipole, and later extensible geometries;
- electrical tuning center frequency;
- resistance, inductance, capacitance, and feed impedance;
- quality factor Q / effective bandwidth;
- antenna orientation: azimuth and elevation;
- optional receive-side tuning distinct from transmit-side tuning;
- configurable polarization alignment or mismatch;
- configurable front-end coupling strength;
- explicit enable/disable control for applying electrical tuning attenuation to spatial map calculations;
- preset values may be supplied for common Wi-Fi-scale experiments, but presets must resolve into the same generalized antenna configuration used by custom RF sources.

The map should expose both the ideal geometric radiation-pattern gain and the electrical tuning response. A source or receiver may therefore be geometrically favorable while electrically detuned, or vice versa.

## Interfrequency modulation experiments

Add an Interfrequency Modulation workbench for examining effects created when two or more RF components interact through a specified nonlinear mechanism.

Required controls:

- primary frequency f1;
- secondary frequency f2;
- optional additional frequency inputs for later expansion;
- relative source powers/amplitudes;
- nonlinear coupling coefficient;
- mixer/front-end nonlinearity strength;
- maximum intermodulation order to evaluate;
- detector/receiver bandwidth;
- product-selection mode: direct carriers, |f1-f2| difference, f1+f2 sum, 2f1-f2, 2f2-f1, or complete bounded product set;
- product floor / minimum modeled detectable level;
- coherent versus incoherent treatment where physically applicable;
- explicit distinction between physical mixing in the antenna/front end and purely mathematical post-processing.

The laboratory must not imply that unrelated frequencies produce a stationary cross-frequency spatial interference pattern in a linear receiver. Sum, difference, beat, and higher-order spatial maps are only valid when a modeled nonlinear or mixer mechanism produces that product.

## Tuned map products

The RF mapper should be able to render separate but directly comparable maps for:

1. the primary carrier before antenna tuning loss;
2. the primary carrier after transmit/receive tuning response;
3. the secondary carrier;
4. selected interfrequency products;
5. a detector-integrated composite when the receiver model is configured to respond to multiple products.

All maps must use the same environmental geometry, source positions, reflector properties, wall losses, and sampling grid so visual differences are attributable to frequency/tuning physics rather than inconsistent scene setup.

## Mapping resolution diagnostics

Spatial display resolution and physically meaningful RF resolution must be reported separately.

For every map calculate and expose:

- cell width and cell height in meters;
- wavelength of every active carrier/product;
- samples per wavelength along X and Y;
- shortest active wavelength;
- Nyquist-style warning when the spatial grid is too coarse to represent modeled phase fringes;
- oversampling warning when the requested display resolution greatly exceeds the fidelity justified by the current propagation model;
- map-to-map convergence when progressive resolution is enabled;
- local gradient / fringe-density estimate so high-interference regions can request more samples than smooth regions;
- an effective-resolution/confidence indicator that accounts for wavelength, bandwidth, antenna Q, coherence, environmental-model fidelity, and receiver bandwidth.

Increasing pixel count alone must never be presented as increasing physical certainty.

## Antenna tuning effects on map resolution

The laboratory should explicitly explore whether antenna tuning changes the *useful* spatial information available to the mapper.

Examples to measure:

- high-Q narrowband tuning suppressing off-resonant carriers and therefore simplifying a multi-frequency field map;
- broad low-Q response admitting more carriers/intermodulation products and potentially increasing local spatial variation;
- detuning reducing SNR until fine spatial structure falls below the modeled noise floor even when the visual grid remains dense;
- different generated intermodulation products having different wavelengths and therefore different spatial fringe scales;
- coherent narrowband measurements retaining phase-sensitive multipath structure that becomes less stable when bandwidth or incoherence increases.

The resulting UI should report *why* effective map resolution changed: wavelength, tuning attenuation, SNR, detector bandwidth, coherence, or sampling density.

## Progressive and adaptive mapping

Extend the existing coarse-to-fine map workflow with configurable refinement criteria.

Planned controls:

- starting resolution;
- maximum resolution;
- refinement step;
- minimum dB gradient that triggers local refinement;
- minimum coherent-phase change that triggers local refinement;
- SNR threshold below which refinement stops;
- convergence tolerance between successive maps;
- selected active frequency/product used to drive refinement;
- option to refine against the worst-case/shortest-wavelength active product.

A future adaptive renderer may use nonuniform sampling internally, but the authoritative propagation equations must remain the same as the uniform-grid solver so adaptive sampling does not become a replacement physics implementation.

## Measurement and comparison outputs

Add directly comparable experiment summaries for:

- tuned vs untuned antenna;
- monopole vs dipole;
- narrow-Q vs broad-Q antenna;
- single-frequency vs multi-frequency environment;
- direct carrier vs generated intermodulation product;
- coherent vs incoherent multipath;
- coarse vs fine spatial sampling;
- requested display resolution vs estimated effective physical resolution.

Each comparison should expose deltas in peak level, mean level, fade depth, detectable-area percentage, spatial gradient density, and map convergence error.

## Physical boundary

The Signals Laboratory is an RF research and visualization model, not a full-wave Maxwell/FDTD solver and not a claim that software can recover electromagnetic energy that never physically couples to a sensor. Antenna tuning, heterodyne conversion, impedance perturbation, adjacent-carrier effects, and interfrequency modulation may expose otherwise difficult-to-observe energy only when a modeled physical coupling or nonlinear mechanism exists above noise and calibration uncertainty.

## Implementation order

1. Unify electrical antenna tuning parameters with RF Environment Mapper source/receiver configuration.
2. Add samples-per-wavelength and effective-resolution diagnostics to existing single-frequency maps.
3. Add a second configurable RF source and explicit interfrequency-product engine.
4. Allow selected generated products to be mapped using the same spatial solver and scene geometry.
5. Add comparative tuned/untuned and carrier/product map views.
6. Add adaptive/progressive refinement driven by wavelength, gradient, SNR, and convergence.
7. Expand environmental geometry from idealized infinite planes to material-aware floor-plan surfaces while preserving the same generalized source/antenna contract.
