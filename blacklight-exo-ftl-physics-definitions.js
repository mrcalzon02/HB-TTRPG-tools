(() => {
  'use strict';

  const AU_KM = 149597870.7;
  const LY_AU = 63241.07708426628;
  const C_KM_S = 299792.458;
  const C_AU_S = C_KM_S / AU_KM;
  const C_AU_MIN = C_AU_S * 60;
  const C_AU_HOUR = C_AU_MIN * 60;
  const C_AU_DAY = C_AU_HOUR * 24;

  const TIERS = [
    {key:'t0',rank:0,label:'Relativistic Precursor',c:[0.03,0.28],rangeAU:[.5,18],spool:[3600,28800],cooldown:[1800,21600],errorKmAU:[120000,900000],description:'Conventional or exotic-propulsion craft operating far below light speed, but already requiring extreme energy storage, collision shielding, and relativistic navigation.',vessels:['probe','courier','large research craft'],hurdle:'sustained high-energy acceleration without destroying the crew or vehicle'},
    {key:'t1',rank:1,label:'Near-Light Compression',c:[0.28,.985],rangeAU:[12,420],spool:[1800,14400],cooldown:[1200,10800],errorKmAU:[25000,220000],description:'Metric or inertial compression reduces subjective and operational transit time while remaining subluminal.',vessels:['courier','shuttle','corvette'],hurdle:'maintaining a stable compressed metric without crossing a causal or field-instability threshold'},
    {key:'t2',rank:2,label:'Supra-Light Prototype',c:[1.05,12],rangeAU:[80,5000],spool:[900,7200],cooldown:[900,7200],errorKmAU:[8000,90000],description:'The first operationally superluminal systems. Routes remain short, inaccurate, and deeply sensitive to local gravity.',vessels:['research ship','corvette','fixed test ring'],hurdle:'creating a controllable superluminal topology while preserving a valid exit solution'},
    {key:'t3',rank:3,label:'System-Jump Capability',c:[12,420],rangeAU:[1000,180000],spool:[300,3600],cooldown:[300,3600],errorKmAU:[1000,18000],description:'Reliable outer-system and nearby-star transits become possible through prepared routes, beacons, or large shipboard machinery.',vessels:['frigate','cruiser','small gate station'],hurdle:'solving departure and emergence geometry faster than the environment changes'},
    {key:'t4',rank:4,label:'Operational Interstellar Drive',c:[420,8500],rangeAU:[80000,4200000],spool:[90,1200],cooldown:[120,1800],errorKmAU:[120,3200],description:'Routine interstellar movement supports trade, migration, and fleet operations, though infrastructure and route quality remain decisive.',vessels:['corvette','frigate','merchant hull','carrier'],hurdle:'scaling field uniformity across a full vessel while controlling thermal and navigational debt'},
    {key:'t5',rank:5,label:'Strategic Corridor Drive',c:[8500,85000],rangeAU:[800000,42000000],spool:[30,480],cooldown:[60,900],errorKmAU:[18,500],description:'Multiple systems can be crossed in a single transit. Governments begin to treat drive corridors as strategic geography.',vessels:['frigate','cruiser','capital ship','gate complex'],hurdle:'maintaining dimensional coherence across long routes and heterogeneous gravitational terrain'},
    {key:'t6',rank:6,label:'Deep-Range Manifold Drive',c:[85000,850000],rangeAU:[8000000,420000000],spool:[10,180],cooldown:[20,420],errorKmAU:[2,90],description:'Cluster-scale operations are possible without continuous gate support. Navigation becomes a high-dimensional computation and sensor problem.',vessels:['courier','cruiser','capital ship'],hurdle:'measuring and predicting Q-space or N-dimensional curvature beyond the direct sensor horizon'},
    {key:'t7',rank:7,label:'Compact Multisystem Drive',c:[850000,8500000],rangeAU:[80000000,4200000000],spool:[2,45],cooldown:[4,120],errorKmAU:[.2,12],description:'Drive assemblies shrink into tactical craft and fighters while retaining multisystem reach.',vessels:['fighter','shuttle','corvette','capital ship'],hurdle:'miniaturizing field generators, heat sinks, timing systems, and exotic-state containment without losing redundancy'},
    {key:'t8',rank:8,label:'Post-Material Transit Architecture',c:[8500000,850000000],rangeAU:[800000000,420000000000],spool:[.2,8],cooldown:[.5,20],errorKmAU:[.001,.5],description:'Transit is performed by state translation, remote reconstruction, engineered worm geometry, or equivalent post-material methods.',vessels:['cognitive packet','fighter-scale shell','distributed fleet','megastructure'],hurdle:'preserving identity, causality, and destination-state fidelity when the transported object is no longer merely a moving hull'}
  ];

  const FAMILIES = [
    {
      key:'inertial-torch',label:'Relativistic Inertial Torch',tiers:[0,1],dimension:'3+1 dimensional continuous trajectory',speed:[.68,.98],range:1.05,energy:1.35,accuracy:1.2,spool:1.1,cooldown:1.35,gravity:.9,
      infrastructures:['self-contained'],energySystems:['fusion-bank','antimatter','singularity'],
      constraints:['The craft must physically traverse every intervening kilometer.','Relativistic dust and photon impacts become strategic-scale hazards.','Acceleration, deceleration, and crew tolerance dominate mission planning.'],
      hurdles:['high-thrust propulsion with acceptable reaction mass','forward shielding against relativistic particles','waste-heat disposal during prolonged burns','clock synchronization across relativistic frames','reliable braking reserves at the destination'],
      failures:['runaway acceleration profile','forward shield ablation','reaction-mass exhaustion before braking','relativistic navigation-frame mismatch','crew or structure overload'],
      edge:['Dense debris fields can make a nominally empty route impassable.','A rescue craft cannot casually match the velocity of a disabled vessel.','Course corrections become exponentially expensive late in the flight.']
    },
    {
      key:'metric-envelope',label:'Metric Compression Envelope',tiers:[1,7],dimension:'4D local metric deformation',speed:[.75,1.35],range:1.1,energy:1.45,accuracy:.9,spool:1,cooldown:1.15,gravity:.62,
      infrastructures:['self-contained','beacon-assisted','corridor'],energySystems:['antimatter','vacuum-cell','singularity','q-condensate'],
      constraints:['The vessel remains inside a locally normal bubble while external distance is contracted ahead and expanded behind.','The envelope cannot be safely formed across steep gravitational gradients.','Matter and radiation accumulated at the leading boundary must be dispersed before collapse.'],
      hurdles:['negative or effectively negative stress-energy control','closed field topology around an irregular moving hull','preventing horizon formation inside the envelope','safe release of accumulated bow radiation','real-time metric correction under external perturbation'],
      failures:['asymmetric envelope collapse','bow-shock radiation discharge','partial hull exclusion from the field','causal horizon trapping control signals','destination overshoot after gradient distortion'],
      edge:['Large planets and stars produce exclusion volumes far beyond their visible surfaces.','Formation flight requires synchronized overlapping envelopes or strict separation.','A damaged radiator system may permit entry but make exit thermally impossible.']
    },
    {
      key:'gravitic-plane',label:'Gravitational-Plane Skimmer',tiers:[2,6],dimension:'4D geodesic plane with higher-order gradient correction',speed:[.82,1.12],range:1.25,energy:.86,accuracy:.75,spool:.9,cooldown:.85,gravity:.38,
      infrastructures:['beacon-assisted','corridor','self-contained'],energySystems:['fusion-bank','antimatter','singularity','vacuum-cell'],
      constraints:['The drive follows a low-curvature gravitational plane rather than an arbitrary straight line.','Departure and arrival vectors are restricted by the local barycentric plane and dominant mass distribution.','Crossing an unmodeled gravity ridge can eject the craft from the skim state.'],
      hurdles:['mapping gravitational equipotential surfaces over interstellar distances','predicting moving mass shadows','maintaining lift from the normal metric without losing geodesic lock','transitioning between incompatible local gravity planes','detecting compact dark masses before they perturb the route'],
      failures:['plane-lock loss','gravity-ridge impact','barycentric vector mismatch','uncommanded emergence at a saddle point','tidal tensor inversion'],
      edge:['Binary and trinary systems may offer only narrow seasonal entry windows.','Routes can lengthen dramatically when the direct line crosses a steep stellar gradient.','A small rogue planet can be more dangerous than a visible nebula if it is absent from the gravity map.']
    },
    {
      key:'slipstream-shear',label:'Hyperspatial Slipstream Shear',tiers:[3,7],dimension:'Q-space boundary layer adjacent to normal spacetime',speed:[1.05,1.55],range:1.38,energy:1.1,accuracy:1.05,spool:.82,cooldown:1.05,gravity:.48,
      infrastructures:['self-contained','beacon-assisted','corridor'],energySystems:['antimatter','vacuum-cell','q-condensate','singularity'],
      constraints:['The craft rides a metastable shear layer rather than entering a fully separate universe.','Route quality depends on Q-space flow, which can drift independently of visible-space geometry.','Exit requires matching both normal-space coordinates and local Q-phase velocity.'],
      hurdles:['measuring Q-space flow without entering it','maintaining boundary-layer adhesion','preventing hull polarization across the shear','forecasting Q-storms and phase turbulence','building sensors that remain coherent across both spaces'],
      failures:['shear delamination','Q-phase spinout','partial phase exposure','exit-vector inversion','route capture by an existing slipstream'],
      edge:['Two drives using the same corridor can create wake interference.','A corridor may remain fast in one direction and nearly unusable in the reverse direction.','Emergency exit can place the ship in normal space with a large residual vector.']
    },
    {
      key:'q-lattice',label:'Q-Lattice Phase Translation',tiers:[4,8],dimension:'quantized Q-state translation through indexed phase cells',speed:[1.18,1.82],range:1.65,energy:1.22,accuracy:.54,spool:.72,cooldown:.92,gravity:.55,
      infrastructures:['beacon-assisted','corridor','self-contained','paired-gate'],energySystems:['q-condensate','vacuum-cell','singularity'],
      constraints:['Space is treated as a lattice of addressable phase states rather than a continuous route.','The destination must possess a valid Q-address and phase epoch.','Translation errors appear as coordinate aliasing rather than ordinary course deviation.'],
      hurdles:['maintaining a coherent Q-address for a macroscopic object','preventing state aliasing between near-identical destinations','synchronizing phase epochs across relativistic clocks','encoding living and synthetic minds without decoherence','correcting lattice defects caused by high-energy events'],
      failures:['Q-address collision','phase-cell aliasing','partial object translation','identity-state divergence','arrival in the correct location but wrong phase epoch'],
      edge:['A destination beacon can be physically intact but phase-obsolete.','Deliberately falsified Q-addresses are a strategic weapon.','Repeated translation through the same cell may temporarily degrade its reliability.']
    },
    {
      key:'n-manifold',label:'N-Dimensional Manifold Drive',tiers:[5,8],dimension:'N-dimensional geodesic solution projected into 3+1 dimensions',speed:[1.25,2.1],range:1.95,energy:1.38,accuracy:.46,spool:.88,cooldown:1.12,gravity:.6,
      infrastructures:['self-contained','beacon-assisted','corridor'],energySystems:['q-condensate','singularity','vacuum-cell'],
      constraints:['The apparent route is a projection of a shorter geodesic through additional dimensions.','Every additional active dimension increases solution space, sensor burden, and topological failure modes.','The ship must preserve a valid embedding map back into normal spacetime.'],
      hurdles:['solving high-dimensional geodesics under incomplete information','stabilizing the vessel embedding across N dimensions','preventing topology changes during transit','detecting higher-dimensional obstacles with indirect sensors','verifying that the return projection preserves orientation and identity'],
      failures:['embedding-map collapse','N-axis coordinate permutation','topological self-intersection','projection into an inaccessible gravitational well','dimensional hysteresis after emergence'],
      edge:['A route that is short in six dimensions may intersect a hazard invisible in four.','Nearby normal-space destinations may require radically different N-space solutions.','Damage to one dimensional stabilizer can rotate the return projection rather than merely slowing the ship.']
    },
    {
      key:'fold-jump',label:'Discrete Fold-Jump Drive',tiers:[3,7],dimension:'temporary topological adjacency between origin and destination volumes',speed:[.95,1.45],range:1.18,energy:1.62,accuracy:.82,spool:1.28,cooldown:1.42,gravity:.44,
      infrastructures:['self-contained','beacon-assisted','paired-gate'],energySystems:['antimatter','singularity','vacuum-cell','q-condensate'],
      constraints:['Transit is effectively instantaneous after a long field solution and charge cycle.','Origin and destination volumes are briefly made adjacent, so both must satisfy strict exclusion rules.','The drive cannot make meaningful corrections once the fold commits.'],
      hurdles:['solving a stable two-volume topological identification','holding enormous energy without premature fold initiation','verifying destination clearance without faster-than-light sensors','preventing matter overlap at emergence','managing recoil and metric ringing after the fold'],
      failures:['misfold to a false solution','destination-volume overlap','premature adjacency collapse','fold recoil structural failure','duplicate or omitted boundary matter'],
      edge:['Fast transit does not mean fast response because spool and verification may dominate.','A moving destination can invalidate the solution seconds before commitment.','Jamming often attacks the destination solution rather than the drive itself.']
    },
    {
      key:'wormhole-gate',label:'Anchored Wormhole or Gate Transit',tiers:[2,8],dimension:'maintained multiply connected spacetime topology',speed:[1.5,3.5],range:2.6,energy:.62,accuracy:.28,spool:.35,cooldown:.48,gravity:.7,
      infrastructures:['paired-gate','fixed-gate','corridor'],energySystems:['star-fed','singularity','vacuum-cell','q-condensate'],
      constraints:['The route exists only between established mouths, anchors, or gate stations.','Moving a gate mouth changes the network and may require years of sublight transport.','Gate throughput, aperture, and scheduling replace raw vessel drive performance as the limiting factors.'],
      hurdles:['creating and stabilizing traversable topology','preventing mouth collapse under asymmetric mass flow','holding chronology-safe mouth synchronization','constructing anchors outside destructive gravity gradients','protecting a strategic fixed structure from attack'],
      failures:['mouth pinch-off','asymmetric time shift','aperture collapse around a vessel','network cascade after anchor loss','gate throat contamination'],
      edge:['A cheap vessel can cross an extremely advanced gate, concentrating power in infrastructure owners.','Destroying one node can isolate entire regions without damaging their fleets.','Bidirectional traffic can destabilize a throat unless mass flow is actively balanced.']
    },
    {
      key:'phase-displacement',label:'Quantum Phase Displacement',tiers:[4,8],dimension:'macroscopic state displacement across a nonlocal quantum basis',speed:[1.12,2.35],range:1.48,energy:1.55,accuracy:.42,spool:.62,cooldown:1.24,gravity:.68,
      infrastructures:['beacon-assisted','self-contained','paired-gate'],energySystems:['q-condensate','vacuum-cell','singularity'],
      constraints:['The vessel is displaced between compatible macroscopic states rather than moved through intervening space.','Destination compatibility depends on matter distribution, local fields, and phase reference quality.','Identity and continuity are engineering questions, not merely philosophical ones.'],
      hurdles:['maintaining macroscopic coherence','proving continuity of transported minds','avoiding destination-state occupation','building phase references resistant to spoofing','reconciling conservation laws across nonlocal displacement'],
      failures:['state decoherence','partial displacement','destination exclusion failure','memory or software divergence','residual duplicate state'],
      edge:['A destination can become invalid because a large ship or construction project changed local mass distribution.','Legal systems may treat displaced persons as copies unless continuity is certified.','Phase noise from strong magnetospheres can corrupt biological tissue before it affects the hull.']
    }
  ];

  globalThis.BlacklightExoFTLPhysicsDefinitions=Object.freeze({
    constants:Object.freeze({AU_KM,LY_AU,C_KM_S,C_AU_S,C_AU_MIN,C_AU_HOUR,C_AU_DAY}),
    tiers:Object.freeze(TIERS),
    families:Object.freeze(FAMILIES)
  });
})();