(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const clamp = (v, a = 0, b = 100) => Math.min(b, Math.max(a, v));
  const d10 = () => Math.floor(Math.random() * 10) + 1;
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const escapeXml = value => String(value).replace(/[<>&'\"]/g, ch => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;", "'":"&apos;", '\"':"&quot;" }[ch]));
  const N = (id, kind, zone, x, y, w, h, label, opts = {}) => ({ id, kind, zone, x, y, w, h, label, ...opts });
  const E = (id, from, to, kind, opts = {}) => ({ id, from, to, kind, ...opts });

  const STATIONS = Object.freeze({
    helm:{
      label:"Helm",
      output:"RCS / main-drive command interface",
      labels:{guard:"Flight inhibit guard",mode:"Flight-mode rotary",bus:"Thruster manifold selector",dial:"Attitude trim knob",slider:"Translation demand slider",lever:"Thrust gate lever",confirmA:"Vector confirm",confirmB:"Pilot acknowledge",execute:"Thrust execution relay"},
      topologyNote:"Inertial reference, attitude controller, reaction-control drivers and main-drive command gating."
    },
    navigation:{
      label:"Navigation",
      output:"Committed solution / Helm data link",
      labels:{guard:"Solution inhibit guard",mode:"Solution-mode rotary",bus:"Reference-source selector",dial:"Transfer index knob",slider:"Δv bias slider",lever:"Solution gate lever",confirmA:"Vector confirm",confirmB:"Timebase lock",execute:"Solution commit relay"},
      topologyNote:"Clock discipline, inertial reference, ephemeris storage, trajectory processing and solution-buffer handoff."
    },
    gunnery:{
      label:"Gunnery",
      output:"Weapon-enable / firing command interface",
      labels:{guard:"Weapon arm guard",mode:"Fire-control rotary",bus:"Track / weapon feed selector",dial:"Range-rate gate knob",slider:"Capacitor demand slider",lever:"Weapon arm lever",confirmA:"Track confirm",confirmB:"Weapons acknowledge",execute:"Weapon execution relay"},
      topologyNote:"Sensor-track conditioning, fire-control processing, energy-state supervision and weapon-enable interlocks."
    },
    engineering:{
      label:"Engineering",
      output:"Plant / distribution configuration interface",
      labels:{guard:"Plant safety guard",mode:"Plant-mode rotary",bus:"Distribution-source selector",dial:"Load-share trim knob",slider:"Coolant / load command slider",lever:"Bus-tie lever",confirmA:"Plant confirm",confirmB:"Casualty acknowledge",execute:"Configuration execution relay"},
      topologyNote:"Breaker distribution, load-share control, bus-tie contactors, coolant-loop control and plant feedback."
    },
    science:{
      label:"Science / Scanning",
      output:"Sensor acquisition / emitter command interface",
      labels:{guard:"Emitter inhibit guard",mode:"Sensor-mode rotary",bus:"Aperture / receiver selector",dial:"Receiver-gain knob",slider:"Integration-time slider",lever:"Emitter gate lever",confirmA:"Track confirm",confirmB:"Analyst acknowledge",execute:"Acquisition execution relay"},
      topologyNote:"Low-noise receive path, digitization, spectral processing, aperture switching and active-emitter drive."
    },
    comms:{
      label:"Comms",
      output:"RF / tightbeam transmitter command interface",
      labels:{guard:"Transmit inhibit guard",mode:"Link-mode rotary",bus:"Carrier-path selector",dial:"Frequency vernier knob",slider:"Power / beamwidth slider",lever:"Transmit key lever",confirmA:"Address confirm",confirmB:"Crypto acknowledge",execute:"Transmit execution relay"},
      topologyNote:"Power conditioning, cryptographic processing, carrier synthesis, modem, RF switching, power amplification and antenna steering."
    }
  });

  const AUTH_NODES = Object.freeze([
    N("auth-key","key receptacle","authorization",460,416,118,58,"Authorization key receptacle",{faults:["loose-connector"],front:["execute-relay"]}),
    N("auth-lock","keyed interlock","authorization",604,416,118,58,"SAFE / ARM key lock",{faults:["loose-connector"],front:["execute-relay"]}),
    N("shield-switch","shield interlock","authorization",748,416,118,58,"Execution shield interlock",{faults:["loose-connector"],front:["execute-relay"]}),
    N("execute-relay","safety relay","output",842,510,128,58,null,{key:"execute",faults:["relay-failure"],front:["execute-relay"]}),
    N("feedback-return","feedback monitor","output",286,510,142,58,"Command-state feedback monitor",{faults:["loose-connector"],front:["confirm-b"]}),
    N("station-output","downstream interface","output",612,516,180,58,null,{output:true,faults:["loose-connector"],front:["execute-relay"]})
  ]);

  const AUTH_EDGES = Object.freeze([
    E("sig-confirm-auth","confirm-b","auth-key","signal",{faults:["open-conductor"],front:["confirm-b","execute-relay"]}),
    E("safe-key-lock","auth-key","auth-lock","safety",{faults:["open-conductor"],front:["execute-relay"]}),
    E("safe-lock-shield","auth-lock","shield-switch","safety",{faults:["open-conductor"],front:["execute-relay"]}),
    E("safe-shield-relay","shield-switch","execute-relay","safety",{faults:["open-conductor"],front:["execute-relay"]}),
    E("safe-relay-output","execute-relay","station-output","safety",{faults:["open-conductor"],front:["execute-relay"]}),
    E("return-output-monitor","station-output","feedback-return","return",{faults:["open-conductor"],front:["confirm-b"]}),
    E("return-monitor-confirm","feedback-return","confirm-b","return",{faults:["open-conductor"],front:["confirm-b"]})
  ]);

  function commonControlNodes(station) {
    const l = station.labels;
    return [
      N("guard","guarded switch","controls",480,58,120,58,null,{key:"guard",faults:["loose-connector"],front:["guard"]}),
      N("mode","rotary selector","controls",624,58,120,58,null,{key:"mode",faults:["loose-connector"],front:["mode"]}),
      N("bus-selector","source selector","controls",768,58,150,58,null,{key:"bus",faults:["loose-connector"],front:["bus-selector"]}),
      N("dial","rotary trim","controls",480,154,120,58,null,{key:"dial",faults:["loose-connector"],front:["dial"]}),
      N("slider","linear command","controls",624,154,120,58,null,{key:"slider",faults:["loose-connector"],front:["slider"]}),
      N("lever","three-position lever","controls",768,154,150,58,null,{key:"lever",faults:["loose-connector"],front:["lever"]}),
      N("confirm-a","momentary confirm","controls",512,292,138,56,null,{key:"confirmA",faults:["loose-connector"],front:["confirm-a"]}),
      N("confirm-b","momentary acknowledge","controls",704,292,154,56,null,{key:"confirmB",faults:["loose-connector"],front:["confirm-b"]})
    ];
  }

  const TOPOLOGIES = Object.freeze({
    helm:{
      drawing:"FLIGHT CONTROL / PROPULSION COMMAND",
      zones:[
        [18,214,440,130,"A · FLIGHT CONTROL POWER / COMPUTE"],
        [460,24,510,350,"B · PILOT INPUT / ATTITUDE CONTROL"],
        [426,388,460,104,"C · KEYED THRUST AUTHORIZATION"],
        [266,492,710,96,"D · RCS / MAIN-DRIVE OUTPUT + FEEDBACK"]
      ],
      nodes:[
        N("power-in","power feed","power",28,252,104,58,"28 VDC flight-control feed",{faults:["loose-connector"]}),
        N("main-fuse","protective fuse","power",154,252,104,58,"FC-1 flight-control fuse",{faults:["blown-fuse"],front:["guard","mode","bus-selector","dial","slider","lever"]}),
        N("inertial-ref","inertial reference","power",280,224,148,58,"Inertial reference unit",{faults:["relay-failure","loose-connector"],front:["dial","confirm-a"]}),
        N("attitude-controller","control processor","power",280,292,148,58,"Attitude control computer",{faults:["relay-failure","loose-connector"],front:["mode","dial","confirm-a"]}),
        ...commonControlNodes(STATIONS.helm),
        N("rcs-driver","thruster driver","controls",470,232,132,54,"RCS valve driver",{faults:["relay-failure","loose-connector"],front:["bus-selector","lever"]}),
        N("drive-controller","drive controller","controls",626,232,142,54,"Main-drive command conditioner",{faults:["relay-failure","loose-connector"],front:["slider","lever"]}),
        N("manifold-driver","thruster driver","controls",792,232,142,54,"Thruster manifold driver",{faults:["relay-failure","loose-connector"],front:["bus-selector"]}),
        ...AUTH_NODES
      ],
      edges:[
        E("pwr-a","power-in","main-fuse","power",{faults:["ground-short","open-conductor"],front:["guard","mode","slider"]}),
        E("pwr-ir","main-fuse","inertial-ref","power",{faults:["ground-short","open-conductor"],front:["dial","confirm-a"]}),
        E("pwr-att","main-fuse","attitude-controller","power",{faults:["ground-short","open-conductor"],front:["mode","confirm-a"]}),
        E("pwr-rcs","main-fuse","rcs-driver","power",{faults:["ground-short"],front:["bus-selector","lever"]}),
        E("pwr-drive","main-fuse","drive-controller","power",{faults:["ground-short"],front:["slider","lever"]}),
        E("ref-att","inertial-ref","attitude-controller","signal",{faults:["open-conductor"],front:["dial","confirm-a"]}),
        E("sig-guard-att","guard","attitude-controller","signal",{faults:["open-conductor"],front:["guard","mode"]}),
        E("sig-mode-att","mode","attitude-controller","signal",{faults:["open-conductor"],front:["mode"]}),
        E("sig-dial-att","dial","attitude-controller","signal",{faults:["open-conductor"],front:["dial"]}),
        E("sig-bus-rcs","bus-selector","manifold-driver","signal",{faults:["open-conductor"],front:["bus-selector"]}),
        E("sig-att-rcs","attitude-controller","rcs-driver","signal",{faults:["open-conductor"],front:["confirm-a","lever"]}),
        E("sig-slider-drive","slider","drive-controller","signal",{faults:["open-conductor"],front:["slider"]}),
        E("sig-lever-drive","lever","drive-controller","signal",{faults:["open-conductor"],front:["lever"]}),
        E("sig-rcs-confirm","rcs-driver","confirm-a","signal",{faults:["open-conductor"],front:["confirm-a"]}),
        E("sig-drive-confirm","drive-controller","confirm-a","signal",{faults:["open-conductor"],front:["confirm-a"]}),
        E("sig-confirm-a-b","confirm-a","confirm-b","signal",{faults:["open-conductor"],front:["confirm-a","confirm-b"]}),
        ...AUTH_EDGES
      ]
    },

    navigation:{
      drawing:"ASTROGATION / REFERENCE + SOLUTION COMPUTE",
      zones:[
        [18,214,440,130,"A · TIMEBASE / REFERENCE / COMPUTE"],
        [460,24,510,350,"B · ASTROGATION INPUT / SOLUTION CONTROL"],
        [426,388,460,104,"C · KEYED SOLUTION AUTHORIZATION"],
        [266,492,710,96,"D · HELM LINK / SOLUTION FEEDBACK"]
      ],
      nodes:[
        N("power-in","power feed","power",28,252,104,58,"28 VDC nav-compute feed",{faults:["loose-connector"]}),
        N("main-fuse","protective fuse","power",154,252,104,58,"NAV-1 protective fuse",{faults:["blown-fuse"],front:["mode","bus-selector","dial","slider"]}),
        N("timebase","precision timebase","power",280,214,142,54,"Disciplined mission timebase",{faults:["relay-failure","loose-connector"],front:["confirm-b"]}),
        N("inertial-ref","inertial reference","power",280,278,142,54,"Navigation inertial reference",{faults:["relay-failure","loose-connector"],front:["bus-selector","confirm-b"]}),
        N("ephemeris","data memory","power",280,342,142,54,"Ephemeris / body-state memory",{faults:["loose-connector"],front:["mode","dial"]}),
        ...commonControlNodes(STATIONS.navigation),
        N("trajectory-cpu","trajectory processor","controls",470,226,142,54,"Finite-burn trajectory processor",{faults:["relay-failure","loose-connector"],front:["mode","dial","slider"]}),
        N("solution-buffer","interface buffer","controls",636,226,132,54,"Validated solution buffer",{faults:["relay-failure","loose-connector"],front:["confirm-a","lever"]}),
        N("helm-link","data interface","controls",792,226,138,54,"Helm solution data link",{faults:["relay-failure","loose-connector"],front:["lever","execute-relay"]}),
        ...AUTH_NODES
      ],
      edges:[
        E("pwr-a","power-in","main-fuse","power",{faults:["ground-short","open-conductor"],front:["mode","bus-selector"]}),
        E("pwr-time","main-fuse","timebase","power",{faults:["ground-short"],front:["confirm-b"]}),
        E("pwr-ref","main-fuse","inertial-ref","power",{faults:["ground-short"],front:["bus-selector"]}),
        E("pwr-eph","main-fuse","ephemeris","power",{faults:["ground-short"],front:["mode","dial"]}),
        E("time-cpu","timebase","trajectory-cpu","signal",{faults:["open-conductor"],front:["confirm-b","mode"]}),
        E("ref-cpu","inertial-ref","trajectory-cpu","signal",{faults:["open-conductor"],front:["bus-selector"]}),
        E("eph-cpu","ephemeris","trajectory-cpu","signal",{faults:["open-conductor"],front:["dial"]}),
        E("sig-guard-cpu","guard","trajectory-cpu","signal",{faults:["open-conductor"],front:["guard"]}),
        E("sig-mode-cpu","mode","trajectory-cpu","signal",{faults:["open-conductor"],front:["mode"]}),
        E("sig-bus-ref","bus-selector","inertial-ref","signal",{faults:["open-conductor"],front:["bus-selector"]}),
        E("sig-dial-cpu","dial","trajectory-cpu","signal",{faults:["open-conductor"],front:["dial"]}),
        E("sig-slider-cpu","slider","trajectory-cpu","signal",{faults:["open-conductor"],front:["slider"]}),
        E("cpu-buffer","trajectory-cpu","solution-buffer","signal",{faults:["open-conductor"],front:["confirm-a"]}),
        E("buffer-confirm","solution-buffer","confirm-a","signal",{faults:["open-conductor"],front:["confirm-a"]}),
        E("time-confirm","timebase","confirm-b","return",{faults:["open-conductor"],front:["confirm-b"]}),
        E("sig-lever-link","lever","helm-link","signal",{faults:["open-conductor"],front:["lever"]}),
        E("buffer-link","solution-buffer","helm-link","signal",{faults:["open-conductor"],front:["lever","execute-relay"]}),
        E("sig-confirm-a-b","confirm-a","confirm-b","signal",{faults:["open-conductor"],front:["confirm-a","confirm-b"]}),
        ...AUTH_EDGES.map(e=>e.id==="safe-relay-output"?E(e.id,e.from,"helm-link",e.kind,e):e),
        E("link-output","helm-link","station-output","signal",{faults:["open-conductor"],front:["execute-relay"]})
      ]
    },

    gunnery:{
      drawing:"FIRE CONTROL / ENERGY + WEAPON ENABLE",
      zones:[
        [18,214,440,130,"A · TRACK / FIRE-CONTROL COMPUTE"],
        [460,24,510,350,"B · TARGETING / ENERGY / WEAPON CONTROL"],
        [426,388,460,104,"C · KEYED WEAPON AUTHORIZATION"],
        [266,492,710,96,"D · WEAPON ENABLE / FIRING FEEDBACK"]
      ],
      nodes:[
        N("power-in","power feed","power",28,252,104,58,"28 VDC fire-control feed",{faults:["loose-connector"]}),
        N("main-fuse","protective fuse","power",154,252,104,58,"FC-ARM protective fuse",{faults:["blown-fuse"],front:["guard","mode","slider","lever"]}),
        N("track-input","sensor input","power",280,214,142,54,"Sensor-track conditioning input",{faults:["loose-connector"],front:["confirm-a"]}),
        N("fire-control-cpu","fire-control processor","power",280,278,142,54,"Fire-control solution processor",{faults:["relay-failure","loose-connector"],front:["mode","dial","confirm-a"]}),
        N("capacitor-monitor","energy monitor","power",280,342,142,54,"Weapon capacitor state monitor",{faults:["relay-failure","loose-connector"],front:["slider","confirm-b"]}),
        ...commonControlNodes(STATIONS.gunnery),
        N("range-gate","range-rate gate","controls",470,226,132,54,"Range / range-rate gate",{faults:["loose-connector"],front:["dial"]}),
        N("weapon-select","weapon interface","controls",626,226,136,54,"Weapon-group interface",{faults:["relay-failure","loose-connector"],front:["bus-selector"]}),
        N("arming-contactor","power contactor","controls",786,226,144,54,"Weapon-enable contactor",{faults:["relay-failure","loose-connector"],front:["lever","execute-relay"]}),
        ...AUTH_NODES
      ],
      edges:[
        E("pwr-a","power-in","main-fuse","power",{faults:["ground-short","open-conductor"],front:["guard","mode"]}),
        E("pwr-cpu","main-fuse","fire-control-cpu","power",{faults:["ground-short"],front:["mode","confirm-a"]}),
        E("pwr-cap","main-fuse","capacitor-monitor","power",{faults:["ground-short"],front:["slider","confirm-b"]}),
        E("pwr-arm","main-fuse","arming-contactor","power",{faults:["ground-short"],front:["lever","execute-relay"]}),
        E("track-cpu","track-input","fire-control-cpu","signal",{faults:["open-conductor"],front:["confirm-a"]}),
        E("sig-guard-cpu","guard","fire-control-cpu","signal",{faults:["open-conductor"],front:["guard"]}),
        E("sig-mode-cpu","mode","fire-control-cpu","signal",{faults:["open-conductor"],front:["mode"]}),
        E("sig-bus-weapon","bus-selector","weapon-select","signal",{faults:["open-conductor"],front:["bus-selector"]}),
        E("sig-dial-range","dial","range-gate","signal",{faults:["open-conductor"],front:["dial"]}),
        E("range-cpu","range-gate","fire-control-cpu","signal",{faults:["open-conductor"],front:["dial","confirm-a"]}),
        E("sig-slider-cap","slider","capacitor-monitor","signal",{faults:["open-conductor"],front:["slider"]}),
        E("cap-cpu","capacitor-monitor","fire-control-cpu","return",{faults:["open-conductor"],front:["slider","confirm-b"]}),
        E("cpu-confirm","fire-control-cpu","confirm-a","signal",{faults:["open-conductor"],front:["confirm-a"]}),
        E("weapon-confirm","weapon-select","confirm-b","signal",{faults:["open-conductor"],front:["confirm-b"]}),
        E("sig-lever-arm","lever","arming-contactor","safety",{faults:["open-conductor"],front:["lever"]}),
        E("sig-confirm-a-b","confirm-a","confirm-b","signal",{faults:["open-conductor"],front:["confirm-a","confirm-b"]}),
        ...AUTH_EDGES.map(e=>e.id==="safe-relay-output"?E(e.id,e.from,"arming-contactor",e.kind,e):e),
        E("arm-output","arming-contactor","station-output","safety",{faults:["open-conductor"],front:["execute-relay"]})
      ]
    },

    engineering:{
      drawing:"PLANT CONTROL / BUS + COOLANT DISTRIBUTION",
      zones:[
        [18,214,440,130,"A · PLANT POWER / BREAKER DISTRIBUTION"],
        [460,24,510,350,"B · LOAD SHARE / COOLANT / BUS-TIE CONTROL"],
        [426,388,460,104,"C · KEYED PLANT AUTHORIZATION"],
        [266,492,710,96,"D · CONTACTOR OUTPUT / PLANT FEEDBACK"]
      ],
      nodes:[
        N("power-in","power feed","power",28,252,104,58,"28 VDC plant-control feed",{faults:["loose-connector"]}),
        N("main-fuse","protective fuse","power",154,252,104,58,"ENG-CONTROL protective fuse",{faults:["blown-fuse"],front:["mode","bus-selector","slider"]}),
        N("breaker-bank","breaker bank","power",280,214,142,54,"Control breaker distribution bank",{faults:["relay-failure","loose-connector"],front:["bus-selector"]}),
        N("load-controller","load-share controller","power",280,278,142,54,"Generator load-share controller",{faults:["relay-failure","loose-connector"],front:["dial","bus-selector"]}),
        N("coolant-controller","coolant controller","power",280,342,142,54,"Coolant-loop control module",{faults:["relay-failure","loose-connector"],front:["slider","confirm-b"]}),
        ...commonControlNodes(STATIONS.engineering),
        N("bus-tie-contactor","power contactor","controls",470,226,140,54,"Main bus-tie contactor",{faults:["relay-failure","loose-connector"],front:["lever"]}),
        N("pump-drive","pump driver","controls",636,226,132,54,"Coolant pump drive interface",{faults:["relay-failure","loose-connector"],front:["slider"]}),
        N("plant-sense","feedback monitor","controls",792,226,138,54,"Reactor / bus telemetry conditioner",{faults:["loose-connector"],front:["confirm-a","confirm-b"]}),
        ...AUTH_NODES
      ],
      edges:[
        E("pwr-a","power-in","main-fuse","power",{faults:["ground-short","open-conductor"],front:["mode","bus-selector"]}),
        E("pwr-breakers","main-fuse","breaker-bank","power",{faults:["ground-short"],front:["bus-selector"]}),
        E("pwr-load","breaker-bank","load-controller","power",{faults:["ground-short"],front:["dial"]}),
        E("pwr-cool","breaker-bank","coolant-controller","power",{faults:["ground-short"],front:["slider"]}),
        E("pwr-tie","breaker-bank","bus-tie-contactor","power",{faults:["ground-short"],front:["lever"]}),
        E("pwr-pump","breaker-bank","pump-drive","power",{faults:["ground-short"],front:["slider"]}),
        E("sig-guard-load","guard","load-controller","signal",{faults:["open-conductor"],front:["guard"]}),
        E("sig-mode-load","mode","load-controller","signal",{faults:["open-conductor"],front:["mode"]}),
        E("sig-bus-breaker","bus-selector","breaker-bank","signal",{faults:["open-conductor"],front:["bus-selector"]}),
        E("sig-dial-load","dial","load-controller","signal",{faults:["open-conductor"],front:["dial"]}),
        E("sig-slider-cool","slider","coolant-controller","signal",{faults:["open-conductor"],front:["slider"]}),
        E("cool-pump","coolant-controller","pump-drive","signal",{faults:["open-conductor"],front:["slider"]}),
        E("sig-lever-tie","lever","bus-tie-contactor","signal",{faults:["open-conductor"],front:["lever"]}),
        E("sense-confirm-a","plant-sense","confirm-a","return",{faults:["open-conductor"],front:["confirm-a"]}),
        E("sense-confirm-b","plant-sense","confirm-b","return",{faults:["open-conductor"],front:["confirm-b"]}),
        E("load-sense","load-controller","plant-sense","return",{faults:["open-conductor"],front:["dial","confirm-a"]}),
        E("cool-sense","coolant-controller","plant-sense","return",{faults:["open-conductor"],front:["slider","confirm-b"]}),
        E("sig-confirm-a-b","confirm-a","confirm-b","signal",{faults:["open-conductor"],front:["confirm-a","confirm-b"]}),
        ...AUTH_EDGES.map(e=>e.id==="safe-relay-output"?E(e.id,e.from,"bus-tie-contactor",e.kind,e):e),
        E("tie-output","bus-tie-contactor","station-output","safety",{faults:["open-conductor"],front:["execute-relay"]})
      ]
    },

    science:{
      drawing:"SENSOR RECEIVE / PROCESS + ACTIVE EMITTER",
      zones:[
        [18,214,440,130,"A · SENSOR POWER / RECEIVE CHAIN"],
        [460,24,510,350,"B · APERTURE / GAIN / INTEGRATION / EMITTER"],
        [426,388,460,104,"C · KEYED ACTIVE-EMISSION AUTHORIZATION"],
        [266,492,710,96,"D · TRACK OUTPUT / SENSOR FEEDBACK"]
      ],
      nodes:[
        N("power-in","power feed","power",28,252,104,58,"28 VDC sensor-control feed",{faults:["loose-connector"]}),
        N("main-fuse","protective fuse","power",154,252,104,58,"SCI-SENSOR protective fuse",{faults:["blown-fuse"],front:["mode","bus-selector","dial"]}),
        N("lna","low-noise amplifier","power",280,204,142,50,"Low-noise receiver amplifier",{faults:["relay-failure","loose-connector"],front:["dial","bus-selector"]}),
        N("digitizer","digitizer","power",280,264,142,50,"Wideband signal digitizer",{faults:["relay-failure","loose-connector"],front:["slider","confirm-a"]}),
        N("spectral-cpu","spectral processor","power",280,324,142,50,"Spectral / correlation processor",{faults:["relay-failure","loose-connector"],front:["mode","confirm-a","confirm-b"]}),
        ...commonControlNodes(STATIONS.science),
        N("aperture-switch","RF switch","controls",470,226,138,54,"Aperture / receiver matrix",{faults:["relay-failure","loose-connector"],front:["bus-selector"]}),
        N("emitter-driver","emitter driver","controls",636,226,132,54,"Active-ranging emitter driver",{faults:["relay-failure","loose-connector"],front:["guard","lever"]}),
        N("track-buffer","interface buffer","controls",792,226,138,54,"Track / classification buffer",{faults:["loose-connector"],front:["confirm-a","confirm-b"]}),
        ...AUTH_NODES
      ],
      edges:[
        E("pwr-a","power-in","main-fuse","power",{faults:["ground-short","open-conductor"],front:["mode","bus-selector"]}),
        E("pwr-lna","main-fuse","lna","power",{faults:["ground-short"],front:["dial","bus-selector"]}),
        E("pwr-digitizer","main-fuse","digitizer","power",{faults:["ground-short"],front:["slider"]}),
        E("pwr-cpu","main-fuse","spectral-cpu","power",{faults:["ground-short"],front:["mode","confirm-a"]}),
        E("pwr-emitter","main-fuse","emitter-driver","power",{faults:["ground-short"],front:["guard","lever"]}),
        E("sig-bus-aperture","bus-selector","aperture-switch","signal",{faults:["open-conductor"],front:["bus-selector"]}),
        E("aperture-lna","aperture-switch","lna","signal",{faults:["open-conductor"],front:["bus-selector","dial"]}),
        E("lna-digitizer","lna","digitizer","signal",{faults:["open-conductor"],front:["dial","slider"]}),
        E("digitizer-cpu","digitizer","spectral-cpu","signal",{faults:["open-conductor"],front:["slider","mode"]}),
        E("sig-dial-lna","dial","lna","signal",{faults:["open-conductor"],front:["dial"]}),
        E("sig-slider-digitizer","slider","digitizer","signal",{faults:["open-conductor"],front:["slider"]}),
        E("sig-mode-cpu","mode","spectral-cpu","signal",{faults:["open-conductor"],front:["mode"]}),
        E("sig-guard-emitter","guard","emitter-driver","safety",{faults:["open-conductor"],front:["guard"]}),
        E("sig-lever-emitter","lever","emitter-driver","signal",{faults:["open-conductor"],front:["lever"]}),
        E("cpu-track","spectral-cpu","track-buffer","signal",{faults:["open-conductor"],front:["confirm-a","confirm-b"]}),
        E("track-confirm-a","track-buffer","confirm-a","signal",{faults:["open-conductor"],front:["confirm-a"]}),
        E("track-confirm-b","track-buffer","confirm-b","signal",{faults:["open-conductor"],front:["confirm-b"]}),
        E("sig-confirm-a-b","confirm-a","confirm-b","signal",{faults:["open-conductor"],front:["confirm-a","confirm-b"]}),
        ...AUTH_EDGES.map(e=>e.id==="safe-relay-output"?E(e.id,e.from,"emitter-driver",e.kind,e):e),
        E("emitter-output","emitter-driver","station-output","safety",{faults:["open-conductor"],front:["execute-relay"]})
      ]
    },

    comms:{
      drawing:"CRYPTO / MODEM / RF TRANSMIT + TIGHTBEAM",
      zones:[
        [18,214,440,130,"A · COMMS POWER / CRYPTO / CARRIER"],
        [460,24,510,350,"B · CHANNEL / RF / ANTENNA CONTROL"],
        [426,388,460,104,"C · KEYED TRANSMIT AUTHORIZATION"],
        [266,492,710,96,"D · PA / ANTENNA OUTPUT + RETURN"]
      ],
      nodes:[
        N("power-in","power feed","power",28,252,104,58,"28 VDC communications feed",{faults:["loose-connector"]}),
        N("main-fuse","protective fuse","power",154,252,104,58,"COMMS-PA control fuse",{faults:["blown-fuse"],front:["mode","slider","lever"]}),
        N("crypto","crypto module","power",280,204,142,50,"Link cryptographic module",{faults:["relay-failure","loose-connector"],front:["confirm-b","mode"]}),
        N("synth","frequency synthesizer","power",280,264,142,50,"Carrier frequency synthesizer",{faults:["relay-failure","loose-connector"],front:["dial"]}),
        N("modem","modem processor","power",280,324,142,50,"Burst / voice modem processor",{faults:["relay-failure","loose-connector"],front:["mode","confirm-a"]}),
        ...commonControlNodes(STATIONS.comms),
        N("rf-switch","RF switch","controls",470,226,132,54,"Carrier / antenna RF switch",{faults:["relay-failure","loose-connector"],front:["bus-selector"]}),
        N("power-amp","power amplifier","controls",626,226,138,54,"Transmitter power amplifier",{faults:["relay-failure","loose-connector"],front:["slider","lever"]}),
        N("antenna-control","antenna controller","controls",788,226,144,54,"Tightbeam antenna steering",{faults:["relay-failure","loose-connector"],front:["slider","bus-selector"]}),
        ...AUTH_NODES
      ],
      edges:[
        E("pwr-a","power-in","main-fuse","power",{faults:["ground-short","open-conductor"],front:["mode","slider"]}),
        E("pwr-crypto","main-fuse","crypto","power",{faults:["ground-short"],front:["confirm-b"]}),
        E("pwr-synth","main-fuse","synth","power",{faults:["ground-short"],front:["dial"]}),
        E("pwr-modem","main-fuse","modem","power",{faults:["ground-short"],front:["mode","confirm-a"]}),
        E("pwr-pa","main-fuse","power-amp","power",{faults:["ground-short"],front:["slider","lever"]}),
        E("sig-mode-modem","mode","modem","signal",{faults:["open-conductor"],front:["mode"]}),
        E("sig-dial-synth","dial","synth","signal",{faults:["open-conductor"],front:["dial"]}),
        E("synth-modem","synth","modem","signal",{faults:["open-conductor"],front:["dial","mode"]}),
        E("crypto-modem","crypto","modem","signal",{faults:["open-conductor"],front:["confirm-b","mode"]}),
        E("sig-bus-rf","bus-selector","rf-switch","signal",{faults:["open-conductor"],front:["bus-selector"]}),
        E("modem-rf","modem","rf-switch","signal",{faults:["open-conductor"],front:["confirm-a","bus-selector"]}),
        E("sig-slider-pa","slider","power-amp","signal",{faults:["open-conductor"],front:["slider"]}),
        E("rf-pa","rf-switch","power-amp","signal",{faults:["open-conductor"],front:["bus-selector","slider"]}),
        E("sig-lever-pa","lever","power-amp","safety",{faults:["open-conductor"],front:["lever"]}),
        E("rf-antenna","rf-switch","antenna-control","signal",{faults:["open-conductor"],front:["bus-selector"]}),
        E("pa-antenna","power-amp","antenna-control","signal",{faults:["open-conductor"],front:["slider","lever"]}),
        E("modem-confirm","modem","confirm-a","signal",{faults:["open-conductor"],front:["confirm-a"]}),
        E("crypto-confirm","crypto","confirm-b","signal",{faults:["open-conductor"],front:["confirm-b"]}),
        E("sig-confirm-a-b","confirm-a","confirm-b","signal",{faults:["open-conductor"],front:["confirm-a","confirm-b"]}),
        ...AUTH_EDGES.map(e=>e.id==="safe-relay-output"?E(e.id,e.from,"power-amp",e.kind,e):e),
        E("pa-output","power-amp","station-output","safety",{faults:["open-conductor"],front:["execute-relay"]}),
        E("antenna-return","antenna-control","feedback-return","return",{faults:["open-conductor"],front:["bus-selector","confirm-b"]})
      ]
    }
  });

  function topologyForStation(key = activeStation) {
    const base = TOPOLOGIES[key];
    if (!base) throw new Error(`Missing repair topology for ${key}`);
    const station = STATIONS[key];
    const nodes = base.nodes.map(node => ({
      ...node,
      label: node.output ? station.output : node.key ? station.labels[node.key] : node.label
    }));
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = base.edges.filter(edge => nodeIds.has(edge.from) && nodeIds.has(edge.to)).map(edge => ({ ...edge }));
    return { ...base, nodes, edges };
  }

  const FAULT_TYPES = Object.freeze({
    "blown-fuse":{
      label:"protective fuse open",target:"node",repairAction:"replace",visual:"obvious",faceplate:"CONTROL POWER DROP",
      candidates:graph=>graph.nodes.filter(n=>n.faults?.includes("blown-fuse")),
      symptom:(s,t)=>`${s.label} suffers a protective-feed interruption around ${t.label}. Upstream power may be present while one control group or the whole station loses stable feed.`,
      expected:t=>["isolate-power",`continuity-test:${t}`,`replace:${t}`,"restore-power","functional-test"]
    },
    "relay-failure":{
      label:"relay / switching device failure",target:"node",repairAction:"replace",visual:"subtle",faceplate:"COMMAND DEVICE NO PICKUP",
      candidates:graph=>graph.nodes.filter(n=>n.faults?.includes("relay-failure")),
      symptom:(s,t)=>`${s.label} accepts operator inputs but ${t.label} fails to transfer its commanded state reliably to the next stage.`,
      expected:t=>["isolate-power",`inspect:${t}`,`continuity-test:${t}`,`replace:${t}`,"restore-power","functional-test"]
    },
    "loose-connector":{
      label:"high-resistance / loose connection",target:"node",repairAction:"reseat",visual:"subtle",faceplate:"INTERMITTENT CONTROL STATE",
      candidates:graph=>graph.nodes.filter(n=>n.faults?.includes("loose-connector")),
      symptom:(s,t)=>`${s.label} develops intermittent indication or command dropout associated with the ${t.label} service connection.`,
      expected:t=>["isolate-power",`inspect:${t}`,`reseat:${t}`,`continuity-test:${t}`,"restore-power","functional-test"]
    },
    "open-conductor":{
      label:"open conductor",target:"edge",repairAction:"splice",visual:"hidden",faceplate:"COMMAND / FEEDBACK PATH DROPOUT",
      candidates:graph=>graph.edges.filter(e=>e.faults?.includes("open-conductor")),
      symptom:(s,t)=>`${s.label} retains local power, but one electrical path no longer carries its expected ${t.subtype.replace(" conductor","")} state between adjacent service components.`,
      expected:t=>["isolate-power",`continuity-test:${t}`,`splice:${t}`,`continuity-test:${t}`,"restore-power","functional-test"]
    },
    "ground-short":{
      label:"branch short to chassis",target:"edge",repairAction:"splice",visual:"subtle",faceplate:"BRANCH OVERCURRENT / BROWNOUT",
      candidates:graph=>graph.edges.filter(e=>e.faults?.includes("ground-short")),
      symptom:(s,t)=>`${s.label} experiences a local voltage collapse or current-limiting event when the ${t.label} branch is energized.`,
      expected:t=>["isolate-power",`ground-test:${t}`,`splice:${t}`,`ground-test:${t}`,"restore-power","functional-test"]
    }
  });

  const ACTION_LABELS = Object.freeze({
    "isolate-power":"Opened service disconnect",
    "inspect":"Visual inspection",
    "continuity-test":"Continuity test",
    "ground-test":"Insulation / ground test",
    "replace":"Replaced component",
    "splice":"Spliced / replaced conductor",
    "reseat":"Reseated connector",
    "restore-power":"Closed service disconnect",
    "functional-test":"Functional test / DM relay"
  });

  const FRONT_CONTROLS = Object.freeze([
    ["guard","GUARD"],["mode","MODE"],["bus-selector","SOURCE"],["dial","TRIM"],["slider","COMMAND"],["lever","GATE"],["confirm-a","CONFIRM"],["confirm-b","ACK"],["execute-relay","EXECUTE"]
  ]);

  let activeStation = "engineering";
  let state = freshState();

  function freshState(){
    return {fault:null,selected:null,servicePower:"energized",sequence:[],relay:null,instrument:"No test performed",trainingOverlay:false,safetyViolations:0,revealedFault:false,log:[],clock:0};
  }

  function graph(){ return topologyForStation(); }
  function nodesForStation(){ return graph().nodes; }
  function edgesForStation(){ return graph().edges; }
  function nodeMap(){ return Object.fromEntries(nodesForStation().map(n=>[n.id,n])); }

  function rawTarget(id){
    const g = graph();
    return g.nodes.find(n=>n.id===id) || g.edges.find(e=>e.id===id) || null;
  }

  function targetRecord(id){
    const g=graph();
    const node=g.nodes.find(n=>n.id===id);
    if(node)return{id,kind:"component",label:node.label,subtype:node.kind,front:node.front||[]};
    const edge=g.edges.find(e=>e.id===id); if(!edge)return null;
    const map=Object.fromEntries(g.nodes.map(n=>[n.id,n]));
    return{id,kind:"wire run",label:`${map[edge.from].label} → ${map[edge.to].label}`,subtype:`${edge.kind} conductor`,front:edge.front||[]};
  }

  function addLog(source,message){state.clock+=1;state.log.unshift({time:state.clock,source,message});state.log=state.log.slice(0,80);renderLog();}
  const timeString=n=>`${String(Math.floor(n/60)).padStart(2,"0")}:${String(n%60).padStart(2,"0")}`;

  function renderTabs(){
    $("repair-station-tabs").innerHTML=Object.entries(STATIONS).map(([k,s])=>`<button type="button" class="exo-repair-tab" data-repair-station="${k}" aria-selected="${k===activeStation}">${s.label}</button>`).join("");
  }

  function edgePath(edge,map){
    const a=map[edge.from],b=map[edge.to];
    const x1=a.x+a.w/2,y1=a.y+a.h/2,x2=b.x+b.w/2,y2=b.y+b.h/2;
    if(edge.via?.length){
      return `M ${x1} ${y1} ${edge.via.map(p=>`L ${p[0]} ${p[1]}`).join(" ")} L ${x2} ${y2}`;
    }
    const mid=(x1+x2)/2;
    return `M ${x1} ${y1} H ${mid} V ${y2} H ${x2}`;
  }

  function edgeMid(edge,map){
    const a=map[edge.from],b=map[edge.to];
    return{x:(a.x+a.w/2+b.x+b.w/2)/2,y:(a.y+a.h/2+b.y+b.h/2)/2};
  }

  function faultGraphicVisible(){
    if(!state.fault)return false;
    return state.trainingOverlay||state.revealedFault||state.fault.visual==="obvious"||state.fault.repaired;
  }

  function deviceGlyph(node){
    const cx=node.w/2,cy=node.h/2;
    switch(node.kind){
      case "power feed": return `<path class="glyph-line" d="M ${cx-10} ${cy+14} l 11-19 h-7 l 10-17 -2 14 h8 z"/>`;
      case "protective fuse": return `<line class="glyph-line" x1="24" y1="${cy}" x2="${node.w-24}" y2="${cy}"/><rect class="glyph-detail" x="${cx-24}" y="${cy-8}" width="48" height="16" rx="8"/>`;
      case "breaker bank": return `${[20,34,48].map(y=>`<line class="glyph-line" x1="22" y1="${y}" x2="${node.w-22}" y2="${y}"/>`).join("")}${[38,68,98].map(x=>`<rect class="glyph-detail" x="${x}" y="15" width="12" height="38" rx="2"/>`).join("")}`;
      case "inertial reference": return `<circle class="glyph-detail" cx="${cx}" cy="30" r="18"/><path class="glyph-line" d="M ${cx-25} 30 h50 M ${cx} 5 v50 M ${cx-13} 17 q13-12 26 0 M ${cx-13} 43 q13 12 26 0"/>`;
      case "precision timebase": return `<circle class="glyph-detail" cx="${cx}" cy="29" r="18"/><path class="glyph-line" d="M ${cx} 29 l0-12 M ${cx} 29 l10 7"/><circle class="glyph-dot" cx="${cx}" cy="29" r="3"/>`;
      case "data memory": return `<rect class="glyph-detail" x="${cx-31}" y="15" width="62" height="30" rx="3"/>${[-18,-6,6,18].map(dx=>`<line class="glyph-line" x1="${cx+dx}" y1="15" x2="${cx+dx}" y2="45"/>`).join("")}`;
      case "control processor":
      case "trajectory processor":
      case "fire-control processor":
      case "spectral processor":
      case "modem processor":
      case "load-share controller":
      case "coolant controller":
        return `<rect class="glyph-detail" x="${cx-28}" y="14" width="56" height="32" rx="4"/><path class="glyph-line" d="M ${cx-18} 23 h36 M ${cx-18} 31 h24 M ${cx-18} 39 h31"/>`;
      case "thruster driver":
      case "drive controller":
      case "pump driver":
      case "emitter driver":
      case "power amplifier":
        return `<path class="glyph-detail" d="M ${cx-28} 15 h38 l18 15 -18 15 h-38 z"/><path class="glyph-line" d="M ${cx-16} 30 h27"/>`;
      case "sensor input":
      case "low-noise amplifier":
        return `<path class="glyph-detail" d="M ${cx-28} 42 V18 l42 12 z"/><path class="glyph-line" d="M ${cx+14} 30 h18"/>`;
      case "digitizer":
        return `<path class="glyph-line" d="M ${cx-31} 37 h13 v-14 h13 v14 h13 v-14 h13 v14 h10"/>`;
      case "energy monitor":
      case "feedback monitor":
        return `<rect class="glyph-detail" x="${cx-30}" y="15" width="60" height="30" rx="3"/><path class="glyph-line" d="M ${cx-24} 34 l10-8 9 7 12-12 17 10"/>`;
      case "interface buffer":
      case "data interface":
      case "weapon interface":
        return `<rect class="glyph-detail" x="${cx-32}" y="17" width="64" height="26" rx="3"/>${[-18,-6,6,18].map(dx=>`<circle class="glyph-dot" cx="${cx+dx}" cy="30" r="3"/>`).join("")}`;
      case "range-rate gate":
        return `<path class="glyph-line" d="M ${cx-30} 38 h18 l10-18 10 18 h22"/><line class="glyph-line" x1="${cx-5}" y1="14" x2="${cx-5}" y2="46"/><line class="glyph-line" x1="${cx+9}" y1="14" x2="${cx+9}" y2="46"/>`;
      case "power contactor":
      case "safety relay":
        return `<rect class="glyph-detail" x="${cx-28}" y="18" width="56" height="27" rx="4"/><path class="glyph-line" d="M ${cx-18} 32 q8-12 16 0 t16 0"/>`;
      case "RF switch":
        return `<circle class="glyph-detail" cx="${cx}" cy="30" r="17"/><path class="glyph-line" d="M ${cx-25} 30 h15 M ${cx+10} 30 h15 M ${cx-9} 30 l17-10"/>`;
      case "crypto module":
        return `<rect class="glyph-detail" x="${cx-25}" y="16" width="50" height="31" rx="4"/><path class="glyph-line" d="M ${cx-10} 16 v-7 q10-9 20 0 v7 M ${cx} 28 v10"/>`;
      case "frequency synthesizer":
        return `<path class="glyph-line" d="M ${cx-31} 34 q10-18 20 0 t20 0 t20 0"/><circle class="glyph-dot" cx="${cx-31}" cy="34" r="3"/>`;
      case "antenna controller":
        return `<path class="glyph-line" d="M ${cx} 43 V22 M ${cx} 22 l-14-12 M ${cx} 22 l14-12 M ${cx-24} 46 q24-20 48 0"/>`;
      case "guarded switch": return `<rect class="glyph-detail" x="${cx-24}" y="17" width="48" height="27" rx="4"/><line class="glyph-line" x1="${cx}" y1="43" x2="${cx+13}" y2="18"/>`;
      case "rotary selector":
      case "rotary trim": return `<circle class="glyph-detail" cx="${cx}" cy="30" r="17"/><line class="glyph-line" x1="${cx}" y1="30" x2="${cx+10}" y2="18"/>`;
      case "source selector": return `<circle class="glyph-detail" cx="${cx}" cy="30" r="16"/><circle class="glyph-dot" cx="${cx-24}" cy="30" r="3"/><circle class="glyph-dot" cx="${cx+24}" cy="30" r="3"/>`;
      case "linear command": return `<rect class="glyph-detail" x="20" y="25" width="${node.w-40}" height="10" rx="5"/><rect class="glyph-solid" x="${cx-6}" y="18" width="12" height="24" rx="3"/>`;
      case "three-position lever": return `<circle class="glyph-detail" cx="${cx}" cy="37" r="10"/><line class="glyph-line lever" x1="${cx}" y1="37" x2="${cx+16}" y2="14"/>`;
      case "momentary confirm":
      case "momentary acknowledge": return `<circle class="glyph-solid" cx="${cx}" cy="30" r="15"/><circle class="glyph-detail" cx="${cx}" cy="30" r="20"/>`;
      case "key receptacle": return `<circle class="glyph-detail" cx="${cx}" cy="29" r="16"/><path class="glyph-line" d="M ${cx} 21 v17 m0-8 h9"/>`;
      case "keyed interlock": return `<circle class="glyph-detail" cx="${cx}" cy="29" r="18"/><line class="glyph-line" x1="${cx}" y1="29" x2="${cx+13}" y2="19"/>`;
      case "shield interlock": return `<path class="glyph-detail" d="M ${cx-17} 17 h34 v23 q-17 15 -34 0 z"/>`;
      case "downstream interface": return `<rect class="glyph-detail" x="${cx-35}" y="18" width="70" height="27" rx="3"/>${[-24,-12,0,12,24].map(dx=>`<circle class="glyph-dot" cx="${cx+dx}" cy="31" r="3"/>`).join("")}`;
      default:return `<rect class="glyph-detail" x="${cx-24}" y="18" width="48" height="26" rx="4"/><path class="glyph-line" d="M ${cx-16} 31 h32"/>`;
    }
  }

  function damageMarkupForNode(node){
    if(!state.fault||state.fault.targetId!==node.id||!faultGraphicVisible())return "";
    if(state.fault.repaired)return `<g class="repair-mark"><circle cx="${node.w-16}" cy="14" r="10"/><path d="M ${node.w-21} 14 l4 4 8-9"/></g>`;
    const severe=state.fault.severity>=3?" severe":"";
    if(state.fault.typeId==="blown-fuse")return `<g class="damage-mark burn${severe}"><ellipse cx="${node.w/2}" cy="${node.h/2}" rx="35" ry="24"/><path d="M ${node.w/2-13} 15 l9 13 -7 9 15 10"/></g>`;
    if(state.fault.typeId==="relay-failure")return `<g class="damage-mark burn${severe}"><ellipse cx="${node.w/2}" cy="${node.h/2}" rx="40" ry="23"/><path d="M 18 18 l15 13 -8 12 19 8"/></g>`;
    if(state.fault.typeId==="loose-connector")return `<g class="damage-mark loose"><path d="M ${node.w-34} 12 l17 10 -12 12 16 9"/><circle cx="${node.w-19}" cy="19" r="5"/></g>`;
    return `<g class="damage-mark"><path d="M 18 12 l14 17 -9 8 18 14"/></g>`;
  }

  function renderNode(node,selected,related){
    const isFault=state.fault?.targetId===node.id;
    const classes=["exo-device",selected?"selected":"",related?"related":"",isFault&&faultGraphicVisible()&&!state.fault.repaired?"damaged":"",isFault&&state.fault?.repaired?"repaired":""].filter(Boolean).join(" ");
    const short=node.label.length>27?`${node.label.slice(0,26)}…`:node.label;
    return `<g class="${classes}" data-schematic-target="${node.id}" transform="translate(${node.x} ${node.y})">
      <rect class="device-shell" width="${node.w}" height="${node.h}" rx="7"></rect>
      ${deviceGlyph(node)}
      <circle class="port left" cx="0" cy="${node.h/2}" r="4"/><circle class="port right" cx="${node.w}" cy="${node.h/2}" r="4"/>
      <text class="node-title" x="9" y="${node.h-14}">${escapeXml(short)}</text>
      <text class="node-kind" x="9" y="${node.h-4}">${escapeXml(node.kind)}</text>
      ${damageMarkupForNode(node)}
      <title>${escapeXml(node.label)} · ${escapeXml(node.kind)}</title>
    </g>`;
  }

  function renderDamageForEdge(edge,map){
    if(!state.fault||state.fault.targetId!==edge.id||!faultGraphicVisible())return "";
    const p=edgeMid(edge,map);
    if(state.fault.repaired)return `<g class="wire-repair" transform="translate(${p.x} ${p.y})"><rect x="-16" y="-6" width="32" height="12" rx="5"/><path d="M -8 0 h16"/></g>`;
    if(state.fault.typeId==="open-conductor")return `<g class="wire-break" transform="translate(${p.x} ${p.y})"><circle r="14"/><path d="M -11 -7 l8 7 -8 7 M 11 -7 l-8 7 8 7"/></g>`;
    if(state.fault.typeId==="ground-short")return `<g class="wire-arc" transform="translate(${p.x} ${p.y})"><circle r="17"/><path d="M -4 -15 l8 9 -6 4 8 8 -5 8"/></g>`;
    return "";
  }

  function renderSchematic(){
    const g=graph(),nodes=g.nodes,edges=g.edges,map=Object.fromEntries(nodes.map(n=>[n.id,n]));
    const selectedId=state.selected?.id;
    const selectedEdge=edges.find(e=>e.id===selectedId);
    const relatedNodes=new Set(selectedEdge?[selectedEdge.from,selectedEdge.to]:[]);
    if(nodes.some(n=>n.id===selectedId))edges.filter(e=>e.from===selectedId||e.to===selectedId).forEach(e=>{relatedNodes.add(e.from);relatedNodes.add(e.to);});
    const live=state.servicePower==="energized";
    const zones=g.zones.map(z=>`<rect x="${z[0]}" y="${z[1]}" width="${z[2]}" height="${z[3]}" rx="10"/><text x="${z[0]+12}" y="${z[1]+18}">${escapeXml(z[4])}</text>`).join("");
    const svg=`<svg viewBox="0 0 1000 600" role="img" aria-label="${escapeXml(STATIONS[activeStation].label)} service schematic" class="${live?"is-live":"is-isolated"}">
      <defs>
        <pattern id="svc-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M 20 0 H 0 V 20" class="grid-minor"/></pattern>
        <pattern id="svc-grid-major" width="100" height="100" patternUnits="userSpaceOnUse"><rect width="100" height="100" fill="url(#svc-grid)"/><path d="M 100 0 H 0 V 100" class="grid-major"/></pattern>
        <filter id="glow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
      </defs>
      <rect class="schematic-paper" width="1000" height="600"/><rect class="schematic-grid" width="1000" height="600" fill="url(#svc-grid-major)"/>
      <g class="service-zones">${zones}</g>
      <g class="exo-wire-underlay">${edges.map(e=>`<path d="${edgePath(e,map)}"/>`).join("")}</g>
      <g class="exo-wire-layer">${edges.map(edge=>{
        const selected=selectedId===edge.id;
        const related=!selected&&nodes.some(n=>n.id===selectedId)&&(edge.from===selectedId||edge.to===selectedId);
        const isFault=state.fault?.targetId===edge.id;
        const cls=["exo-wire",edge.kind,selected?"selected":"",related?"related":"",isFault&&faultGraphicVisible()&&!state.fault.repaired?"damaged":"",isFault&&state.fault?.repaired?"repaired":""].filter(Boolean).join(" ");
        return `<path class="${cls}" data-schematic-target="${edge.id}" d="${edgePath(edge,map)}"><title>${escapeXml(targetRecord(edge.id).label)}</title></path>${renderDamageForEdge(edge,map)}`;
      }).join("")}</g>
      <g class="exo-node-layer">${nodes.map(n=>renderNode(n,selectedId===n.id,relatedNodes.has(n.id)&&selectedId!==n.id)).join("")}</g>
      <g class="schematic-corner-note"><text x="30" y="580">BLV-071 / ${escapeXml(STATIONS[activeStation].label.toUpperCase())} / ${escapeXml(g.drawing)} / REV 8A</text><text x="760" y="580">${live?"CAUTION — CONTROL POWER ENERGIZED":"SERVICE SAFE — DISCONNECT OPEN"}</text></g>
    </svg>`;
    $("repair-schematic").innerHTML=svg;
    $("schematic-title").textContent=`${STATIONS[activeStation].label} · ${g.drawing.toLowerCase()}`;
    $("schematic-power-banner").textContent=live?"LIVE CONTROL POWER":"SERVICE DISCONNECT OPEN";
    $("schematic-power-banner").dataset.live=String(live);
  }

  function visibleConditionText(){
    if(!state.fault)return "No visible damage";
    if(state.fault.repaired)return "Repair hardware visible; panel awaiting functional verification";
    if(state.fault.visual==="obvious")return state.fault.faceplate;
    if(state.fault.visual==="subtle")return `Subtle symptom: ${state.fault.faceplate}`;
    return "No conclusive exterior damage; electrical diagnosis required";
  }

  function faceControlClass(id){
    if(!state.fault)return "";
    const affected=state.fault.frontAffected?.includes(id);
    if(state.fault.repaired&&affected)return " repaired";
    if(!faultGraphicVisible()&&!affected)return "";
    if(affected){
      if(state.fault.typeId==="loose-connector")return " damaged damage-loose-connector";
      if(state.fault.typeId==="ground-short")return " brownout";
      if(state.fault.typeId==="blown-fuse")return " dimmed";
      return ` damaged damage-${state.fault.typeId}`;
    }
    if(state.fault.typeId==="blown-fuse")return " dimmed";
    return "";
  }

  function renderFaceplate(){
    const station=STATIONS[activeStation];
    const live=state.servicePower==="energized";
    const alarm=state.fault&&!state.fault.repaired;
    const controls=FRONT_CONTROLS.map(([id,label],i)=>{
      const node=nodesForStation().find(n=>n.id===id);
      const cls=faceControlClass(id);
      const form=i===3?"dial":i===4?"slider":i===5?"lever":i>=6?"button":"selector";
      return `<div class="face-control ${form}${cls}" data-face-control="${id}"><span>${label}</span><b>${escapeXml(node?.label||label)}</b><i></i></div>`;
    }).join("");
    const severity=state.fault?.severity||0;
    $("repair-faceplate").innerHTML=`
      <div class="faceplate-shell ${alarm?"has-fault":""} severity-${severity} ${live?"live":"isolated"}">
        <div class="faceplate-rail"><span>BLV-071 · ${escapeXml(station.label.toUpperCase())} OPERATOR PANEL</span><b>${live?"BUS LIVE":"SERVICE SAFE"}</b></div>
        <div class="faceplate-alerts">
          <i class="lamp power"></i><span>PWR</span><i class="lamp fault ${alarm?"on":""}"></i><span>FAULT</span><i class="lamp service ${state.fault?.repaired?"on":""}"></i><span>SERVICE</span>
          <strong>${state.fault?escapeXml(state.fault.faceplate):escapeXml(station.topologyNote)}</strong>
        </div>
        <div class="faceplate-controls">${controls}</div>
        <div class="faceplate-damage-caption"><span>VISIBLE OPERATOR-SIDE CONDITION</span><strong>${escapeXml(visibleConditionText())}</strong></div>
      </div>`;
  }

  function targetConditionText(){
    if(!state.selected)return "Unknown";
    if(!state.fault)return "No active ticket";
    if(state.selected.id!==state.fault.targetId)return "No confirmed defect";
    if(state.fault.repaired)return "Repair applied / verify";
    if(state.trainingOverlay||state.revealedFault||state.fault.visual==="obvious")return `Confirmed ${state.fault.label}`;
    return "Suspect — not yet confirmed";
  }

  function renderSelection(){
    $("selected-target").textContent=state.selected?.label||"None";
    $("selected-kind").textContent=state.selected?`${state.selected.kind} · ${state.selected.subtype}`:"—";
    $("target-condition").textContent=targetConditionText();
    $("instrument-result").textContent=state.instrument;
  }

  function renderFault(){
    const station=STATIONS[activeStation];
    $("repair-status-station").textContent=station.label;
    if(!state.fault){
      $("repair-status-fault").textContent="none injected";
      $("fault-severity").textContent="No fault";
      $("fault-symptom").textContent="Inject randomized damage to begin a repair attempt.";
      $("repair-attempt-state").textContent="Awaiting fault";
      $("fault-visibility-state").textContent="—";
    }else{
      $("repair-status-fault").textContent="active service ticket";
      $("fault-severity").textContent=`Severity ${state.fault.severity}`;
      $("fault-symptom").textContent=state.fault.symptom;
      $("repair-attempt-state").textContent=state.fault.repaired?"Repair applied; verify":"Fault active";
      $("fault-visibility-state").textContent=state.revealedFault?"diagnosed":state.fault.visual;
    }
    $("visible-condition").textContent=visibleConditionText();
    $("service-power-state").textContent=state.servicePower.toUpperCase();
    $("repair-hazard-state").textContent=state.servicePower==="energized"?(state.fault?.typeId==="ground-short"&&!state.fault.repaired?"LIVE / SHORT HAZARD":"LIVE PANEL"):"DE-ENERGIZED";
  }

  function renderSequence(){
    const host=$("repair-sequence");
    if(!state.sequence.length){host.innerHTML=`<li class="empty">No actions recorded.</li>`;return;}
    host.innerHTML=state.sequence.map((e,i)=>`<li><b>${i+1}</b>${e.label}${e.targetLabel?` · <span class="target">${e.targetLabel}</span>`:""}</li>`).join("");
  }

  function renderRelay(){
    const r=state.relay;
    $("repair-difficulty").textContent=r?r.difficulty:"—";
    $("repair-status-difficulty").textContent=r?`Difficulty ${r.difficulty}`:"pending";
    $("repair-pips").innerHTML=Array.from({length:10},(_,i)=>`<i class="${r&&i<r.difficulty?"active":""}">${i+1}</i>`).join("");
    if(!r){
      $("repair-relay-status").textContent="Awaiting functional test";
      $("repair-relay-detail").innerHTML=`<div><span>Station</span><strong>${STATIONS[activeStation].label}</strong></div><div><span>Topology</span><strong>${graph().drawing}</strong></div><div><span>Sequence quality</span><strong>—</strong></div><div><span>Safety</span><strong>—</strong></div><div><span>Random d10</span><strong>—</strong></div><div><span>Repair state</span><strong>—</strong></div>`;
      $("repair-relay-call").textContent="The repair console does not determine whether the system is restored. Complete a repair attempt and run the functional test to produce a DM-facing difficulty.";
      return;
    }
    $("repair-relay-status").textContent=`${r.classification} · suggested difficulty`;
    $("repair-relay-detail").innerHTML=`<div><span>Station</span><strong>${r.station}</strong></div><div><span>Fault</span><strong>${r.faultLabel} · severity ${r.severity}</strong></div><div><span>Sequence quality</span><strong>${r.quality}% · ${r.classification}</strong></div><div><span>Safety</span><strong>${r.safetyViolations?`${r.safetyViolations} unsafe action(s)`:"procedure-safe"}</strong></div><div><span>Random d10</span><strong>${r.randomD10} (${r.randomShift>=0?"+":""}${r.randomShift})</strong></div><div><span>Repair state</span><strong>${r.repaired?"correct repair action applied":"fault not correctly repaired"}</strong></div>`;
    $("repair-relay-call").textContent=`DM REPAIR RELAY: call for the character's normal World of Darkness-derived technical / repair dice pool against Difficulty ${r.difficulty}. The console reports ${r.repaired?"a plausible repair configuration":"an unresolved or incorrectly treated fault"}, but the DM determines whether the repair succeeds, how long it takes, and whether it remains stable.`;
  }

  function renderLog(){
    const h=$("repair-log");
    h.innerHTML=state.log.length?state.log.map(i=>`<li><time>${timeString(i.time)}</time><strong>${i.source}</strong><span>${i.message}</span></li>`).join(""):`<li><time>00:00</time><strong>System</strong><span>No maintenance events logged.</span></li>`;
  }

  function renderAll(){
    renderTabs();renderFaceplate();renderSchematic();renderSelection();renderFault();renderSequence();renderRelay();renderLog();
    $("repair-training-overlay").setAttribute("aria-pressed",String(state.trainingOverlay));
  }

  function injectFault(){
    const g=graph();
    const available=Object.entries(FAULT_TYPES).map(([id,type])=>({id,type,candidates:type.candidates(g)})).filter(x=>x.candidates.length);
    const chosen=pick(available);
    const target=pick(chosen.candidates);
    const rec=targetRecord(target.id);
    const severity=1+Math.floor(Math.random()*3);
    let visual=chosen.type.visual;
    if(severity===3&&visual==="hidden")visual="subtle";
    const frontAffected=[...(target.front||rec.front||[])];
    const symptom=chosen.type.symptom(STATIONS[activeStation],rec);
    state.fault={
      typeId:chosen.id,label:chosen.type.label,targetId:target.id,targetKind:chosen.type.target,repairAction:chosen.type.repairAction,
      severity,visual,frontAffected,faceplate:chosen.type.faceplate,symptom,expected:chosen.type.expected(target.id),repaired:false
    };
    state.sequence=[];state.relay=null;state.selected=null;state.instrument="No test performed";state.servicePower="energized";state.safetyViolations=0;state.revealedFault=false;
    addLog("Damage",`${STATIONS[activeStation].label} service ticket opened on ${g.drawing}: randomized ${chosen.type.label} injected. Exterior visibility classified ${visual}; exact service location remains hidden unless physically evident or diagnosed.`);
    renderAll();
  }

  function selectTarget(id){state.selected=targetRecord(id);state.instrument="Target selected; choose a diagnostic action.";renderSelection();renderSchematic();}
  function actionToken(action,targetId){return ["isolate-power","restore-power","functional-test"].includes(action)?action:`${action}:${targetId||"none"}`;}
  function recordAction(action,target){const targetId=target?.id||null;state.sequence.push({token:actionToken(action,targetId),action,targetId,label:ACTION_LABELS[action],targetLabel:target?.label||""});if(state.sequence.length>30)state.sequence.shift();}

  function shouldReveal(action,target){
    if(!state.fault||!target||target.id!==state.fault.targetId)return false;
    const t=state.fault.typeId;
    if(action==="inspect"&&["blown-fuse","relay-failure","loose-connector"].includes(t))return true;
    if(action==="continuity-test"&&["blown-fuse","relay-failure","loose-connector","open-conductor"].includes(t))return true;
    if(action==="ground-test"&&t==="ground-short")return true;
    return false;
  }

  function diagnosticResult(action,target){
    if(!state.fault)return "No active fault ticket.";
    if(!target)return "Select a component or wire run first.";
    const hit=target.id===state.fault.targetId,repairedHit=hit&&state.fault.repaired;
    if(action==="inspect"){
      if(repairedHit)return "Repair area is seated, secured and shows no remaining visible defect in the simulated service model.";
      if(!hit)return "No visible heat damage, looseness, contamination or displaced hardware.";
      if(state.fault.typeId==="loose-connector")return "Connector shell movement and contact fretting observed; seating is not secure.";
      if(state.fault.typeId==="relay-failure")return `${target.label} shows abnormal heating, failed pickup evidence or contact discoloration.`;
      if(state.fault.typeId==="blown-fuse")return "Fuse indicator is open and the body shows transient heating; electrical confirmation recommended.";
      return "No conclusive external damage; electrical testing is required.";
    }
    if(action==="continuity-test"){
      if(repairedHit)return target.kind==="wire run"?"Post-repair continuity nominal across selected conductor.":"Post-repair continuity / contact path within expected range.";
      if(!hit)return target.kind==="wire run"?"Continuity nominal across selected conductor.":"Continuity / contact path within expected range.";
      if(["blown-fuse","open-conductor"].includes(state.fault.typeId))return "OPEN CIRCUIT / no continuity measured.";
      if(state.fault.typeId==="loose-connector")return "Intermittent high resistance; reading changes with connector movement.";
      if(state.fault.typeId==="relay-failure")return "Command and switched-contact state disagree; expected transfer path fails continuity under commanded pickup.";
      if(state.fault.typeId==="ground-short")return "Very low branch resistance; continuity alone cannot distinguish load from chassis fault. Perform insulation test.";
    }
    if(action==="ground-test"){
      if(repairedHit)return "Post-repair insulation resistance nominal; no significant leakage to chassis ground.";
      if(hit&&state.fault.typeId==="ground-short")return "INSULATION FAILURE: low resistance to chassis ground on selected branch.";
      return "Insulation resistance nominal; no significant leakage to chassis ground.";
    }
    return "Instrument action complete.";
  }

  function runRepairAction(action){
    if(!state.fault){addLog("Service","Action ignored: inject randomized fault before beginning maintenance.");return;}
    const needsTarget=!["isolate-power","restore-power","functional-test"].includes(action),target=needsTarget?state.selected:null;
    if(needsTarget&&!target){state.instrument="Select a component or wire run before using this action.";renderSelection();return;}
    if(action==="isolate-power"){
      state.servicePower="isolated";recordAction(action,null);state.instrument="Service disconnect OPEN. Control panel de-energized for maintenance.";addLog("Technician","Service disconnect opened; panel placed in maintenance-safe de-energized state.");
    }else if(action==="restore-power"){
      state.servicePower="energized";recordAction(action,null);state.instrument="Service disconnect CLOSED. Panel control power restored.";addLog("Technician","Service disconnect closed; panel re-energized for verification.");
    }else if(["inspect","continuity-test","ground-test"].includes(action)){
      if(["continuity-test","ground-test"].includes(action)&&state.servicePower!=="isolated"){state.safetyViolations+=1;addLog("Safety",`${ACTION_LABELS[action]} attempted while service power remained energized.`);}
      recordAction(action,target);state.instrument=diagnosticResult(action,target);
      if(shouldReveal(action,target)){state.revealedFault=true;addLog("Diagnostic",`Fault location confirmed at ${target.label}. Schematic damage annotation unlocked.`);}
      addLog("Diagnostic",`${ACTION_LABELS[action]} on ${target.label}: ${state.instrument}`);
    }else if(["replace","splice","reseat"].includes(action)){
      if(state.servicePower!=="isolated"){state.safetyViolations+=1;addLog("Safety",`${ACTION_LABELS[action]} performed while service power remained energized.`);}
      recordAction(action,target);
      const correctTarget=target.id===state.fault.targetId,correctMethod=action===state.fault.repairAction;
      if(correctTarget&&correctMethod){
        state.fault.repaired=true;state.revealedFault=true;state.instrument=`${ACTION_LABELS[action]} applied to suspected fault location. Restoration still requires verification.`;
        addLog("Repair",`Correct repair method applied at ${target.label}; repair hardware now shown on the ${graph().drawing} service drawing pending functional test.`);
      }else{
        state.instrument=`${ACTION_LABELS[action]} completed, but no confirmed fault correction is indicated.`;
        addLog("Repair",`${ACTION_LABELS[action]} applied at ${target.label}; no confirmed correction.`);
      }
    }else if(action==="functional-test"){
      recordAction(action,null);
      if(state.servicePower!=="energized"){state.instrument="Functional test cannot exercise the station while the service disconnect remains open.";addLog("Test","Functional test attempted with service power isolated; no live response available.");}
      else if(state.fault.repaired){state.instrument="Functional test produces a nominal simulated response path through the station-specific topology. DM adjudication still required.";addLog("Test",`Functional test reached the ${STATIONS[activeStation].output} after repair work.`);}
      else{state.instrument="Functional test still reproduces the reported symptom / unresolved path.";addLog("Test","Functional test indicates the service fault remains unresolved in the repair model.");}
      evaluateRepair();
    }
    renderAll();
  }

  function editDistance(a,b){const m=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));for(let i=0;i<=a.length;i++)m[i][0]=i;for(let j=0;j<=b.length;j++)m[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){const c=a[i-1]===b[j-1]?0:1;m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+c);}return m[a.length][b.length];}
  function repairQuality(actual,expected){if(!actual.length)return 0;const max=Math.max(actual.length,expected.length,1),similarity=clamp(1-editDistance(actual,expected)/max,0,1),aligned=expected.reduce((n,t,i)=>n+(actual[i]===t?1:0),0)/Math.max(expected.length,1);return clamp(Math.round((similarity*.7+aligned*.3)*100));}
  const classifyQuality=q=>q>=94?"manual-correct":q>=80?"serviceable sequence":q>=64?"improvised sequence":q>=44?"poor maintenance practice":"hazardous / incorrect sequence";
  const baseDifficulty=q=>q>=94?5:q>=80?6:q>=64?7:q>=44?8:9;

  function evaluateRepair(){
    const f=state.fault;if(!f)return;
    const actual=state.sequence.map(e=>e.token),quality=repairQuality(actual,f.expected),randomD10=d10(),randomShift=randomD10<=2?-1:randomD10>=9?1:0,severityShift=f.severity===1?0:f.severity===2?1:2,unresolvedShift=f.repaired?0:2,safetyShift=Math.min(2,state.safetyViolations),overrunShift=actual.length>f.expected.length+4?1:0,difficulty=clamp(baseDifficulty(quality)+severityShift+unresolvedShift+safetyShift+overrunShift+randomShift,2,10);
    state.relay={station:STATIONS[activeStation].label,faultLabel:f.label,severity:f.severity,quality,classification:classifyQuality(quality),repaired:f.repaired,safetyViolations:state.safetyViolations,randomD10,randomShift,difficulty};
    addLog("DM Relay",`${f.label} repair attempt evaluated at ${quality}% procedural quality; suggested Difficulty ${difficulty}. No repair success resolved.`);
  }

  function clearAttempt(){
    state.sequence=[];state.relay=null;state.selected=null;state.instrument="No test performed";state.servicePower="energized";state.safetyViolations=0;state.revealedFault=false;
    if(state.fault)state.fault.repaired=false;
    addLog("System","Current repair attempt cleared; fault ticket retained and visible symptoms reset to pre-diagnosis state.");
    renderAll();
  }

  function reset(){
    state=freshState();activeStation="engineering";
    addLog("System","Console Repair Bay initialized with six station-specific service topologies. Select a station and inject randomized damage.");
    renderAll();
  }

  function changeStation(key){
    activeStation=key;state=freshState();
    addLog("System",`${STATIONS[key].label} topology loaded: ${STATIONS[key].topologyNote}`);
    renderAll();
  }

  function bindEvents(){
    $("repair-station-tabs").addEventListener("click",e=>{const b=e.target.closest("[data-repair-station]");if(b)changeStation(b.dataset.repairStation);});
    $("repair-schematic").addEventListener("click",e=>{const t=e.target.closest("[data-schematic-target]");if(t)selectTarget(t.dataset.schematicTarget);});
    document.querySelector(".exo-repair-actions").addEventListener("click",e=>{const b=e.target.closest("[data-repair-action]");if(b)runRepairAction(b.dataset.repairAction);});
    $("repair-new-fault").addEventListener("click",injectFault);
    $("repair-reset").addEventListener("click",reset);
    $("repair-clear-sequence").addEventListener("click",clearAttempt);
    $("repair-log-clear").addEventListener("click",()=>{state.log=[];renderLog();});
    $("repair-fit").addEventListener("click",()=>{const h=$("repair-schematic");h.scrollLeft=0;h.scrollTop=0;});
    $("repair-training-overlay").addEventListener("click",()=>{state.trainingOverlay=!state.trainingOverlay;addLog("Training",`Fault-location overlay ${state.trainingOverlay?"enabled":"disabled"}.`);renderAll();});
  }

  document.addEventListener("DOMContentLoaded",()=>{reset();bindEvents();});
})();