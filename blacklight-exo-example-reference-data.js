(() => {
  'use strict';

  const EARTHS_PER_SOLAR_MASS = 332946.0487;
  const PRESET = 'EXAMPLE';
  const UPDATED = '2026-07-13';

  // Conservative, human-readable reference layer. Planet masses are lower-bound
  // totals where the literature is incomplete or only minimum masses are known.
  const REFERENCE = [
    {
      name:'Sol', confirmed:'8 planets; extensive dwarf-planet, moon, asteroid, comet, and trans-Neptunian populations',
      knownOrbitingMassEarth:446.7, confidence:'Measured Solar System inventory',
      material:'Rock–iron terrestrial planets; C/S/M-type asteroid populations; hydrogen–helium gas giants; volatile-rich ice giants and outer icy bodies.',
      note:'The map origin. Published Solar System masses replace the generated orbital mass in cluster gravity.'
    },
    {
      name:'Alpha Centauri', confirmed:'2 confirmed planets around Proxima Centauri (b and d); Proxima c remains disputed; no confirmed planet around A or B',
      knownOrbitingMassEarth:1.33, confidence:'Confirmed minimum-mass lower bound',
      material:'No direct mineral inventory. Rocky composition for the confirmed Proxima worlds is an inference from their low masses, not a measured surface analysis.',
      note:'The three stellar components are represented as one cluster-system mass.'
    },
    {
      name:"Barnard's Star", confirmed:'4 confirmed sub-Earth planets; all orbit interior to the conventional habitable zone',
      knownOrbitingMassEarth:0.93, confidence:'Published approximate minimum-mass sum',
      material:'Likely rocky because of their low minimum masses; no direct mineral spectra or surface composition measurements.',
      note:'The displayed planetary mass is a conservative lower bound.'
    },
    {
      name:'Luhman 16', confirmed:'No confirmed planets', knownOrbitingMassEarth:0,
      confidence:'Nearby brown-dwarf binary reference',
      material:'Substellar condensate-cloud chemistry is observed and modeled; this is not a resolved planetesimal or mineral inventory.',
      note:'Both brown dwarfs are combined into one system mass.'
    },
    {
      name:'Wolf 359', confirmed:'No confirmed planets; previous planet claims remain disputed', knownOrbitingMassEarth:0,
      confidence:'No confirmed orbiting-mass contribution', material:'No secure resolved debris or mineralogical inventory.',
      note:'Unseen planets may exist; zero means no confirmed mass included.'
    },
    {
      name:'Lalande 21185', confirmed:'At least 2 reported confirmed planets and an additional candidate',
      knownOrbitingMassEarth:2.99, confidence:'Conservative published minimum-mass lower bound',
      material:'The inner confirmed planet is classed as a super-Earth by minimum mass; no direct mineral analysis.',
      note:'Only the securely recoverable published lower-bound mass is included in gravity.'
    },
    {
      name:'Sirius', confirmed:'No confirmed planets', knownOrbitingMassEarth:0,
      confidence:'Binary stellar mass dominates', material:'A-type primary plus white-dwarf companion; no secure planetary mineral inventory.',
      note:'The combined stellar system is treated as one cluster source.'
    },
    {
      name:'Luyten 726-8', confirmed:'No confirmed planets', knownOrbitingMassEarth:0,
      confidence:'No confirmed orbiting-mass contribution', material:'No resolved debris or mineralogical inventory included.',
      note:'A flare-star red-dwarf binary.'
    },
    {
      name:'Ross 154', confirmed:'No confirmed planets', knownOrbitingMassEarth:0,
      confidence:'No confirmed orbiting-mass contribution', material:'No resolved debris or mineralogical inventory included.',
      note:'Zero is a catalog lower bound, not proof that the system is planet-free.'
    },
    {
      name:'Ross 248', confirmed:'No confirmed planets', knownOrbitingMassEarth:0,
      confidence:'No confirmed orbiting-mass contribution', material:'No resolved debris or mineralogical inventory included.',
      note:'Zero is a catalog lower bound, not proof that the system is planet-free.'
    },
    {
      name:'Epsilon Eridani', confirmed:'1 confirmed Jupiter analogue (Epsilon Eridani b)',
      knownOrbitingMassEarth:311.4, confidence:'2025 joint astrometry/radial-velocity mass estimate',
      material:'Observed warm inner silicate dust, additional inner belts, and a broad outer planetesimal/debris belt near 70 AU containing silicate and volatile-bearing material.',
      note:'The confirmed planet mass is used; observed debris is documented but not assigned an invented bulk mass.'
    },
    {
      name:'Lacaille 9352', confirmed:'2 confirmed super-Earth planets; an additional signal has been discussed',
      knownOrbitingMassEarth:11.8, confidence:'Approximate minimum-mass sum for confirmed planets',
      material:'Masses are consistent with rocky or volatile-rich super-Earths, but no direct mineral composition has been measured.',
      note:'Also catalogued as GJ 887.'
    },
    {
      name:'Ross 128', confirmed:'1 confirmed temperate terrestrial-mass planet (Ross 128 b)',
      knownOrbitingMassEarth:1.35, confidence:'Published radial-velocity minimum mass',
      material:'Host-star C/O/Mg/Al/K/Ca/Ti/Fe abundances support a rock-and-iron interior model; published modeling suggests a potentially larger iron core than Earth.',
      note:'Composition remains an inference from stellar chemistry and mass–radius models.'
    },
    {
      name:'EZ Aquarii', confirmed:'No confirmed planets', knownOrbitingMassEarth:0,
      confidence:'Triple-star reference; no confirmed orbiting mass', material:'No resolved debris or mineralogical inventory included.',
      note:'The three red dwarfs are combined into one cluster-system source.'
    },
    {
      name:'61 Cygni', confirmed:'No confirmed planets', knownOrbitingMassEarth:0,
      confidence:'Binary stellar mass dominates', material:'No secure planet or resolved debris mineral inventory.',
      note:'Two K dwarfs are combined into one system source.'
    },
    {
      name:'Procyon', confirmed:'No confirmed planets', knownOrbitingMassEarth:0,
      confidence:'Binary stellar mass dominates', material:'F-type subgiant/main-sequence primary plus white-dwarf companion; no confirmed planetary mineral inventory.',
      note:'The binary is represented as one system source.'
    },
    {
      name:'Struve 2398', confirmed:'No confirmed planets', knownOrbitingMassEarth:0,
      confidence:'Binary stellar mass dominates', material:'No resolved debris or mineralogical inventory included.',
      note:'Two red dwarfs are combined into one system source.'
    },
    {
      name:'Groombridge 34', confirmed:'2 confirmed planets around component A',
      knownOrbitingMassEarth:39.03, confidence:'Published minimum-mass sum',
      material:'One super-Earth and one Neptune-mass planet are indicated by dynamics; neither has a directly measured mineral composition.',
      note:'The stellar binary and confirmed planetary lower-bound mass are combined.'
    },
    {
      name:'Epsilon Indi', confirmed:'1 confirmed cold super-Jupiter around Epsilon Indi A; two brown-dwarf companions are also present',
      knownOrbitingMassEarth:2005, confidence:'Approximate 6.31-Jupiter-mass contemporary estimate',
      material:'A cold giant atmosphere is directly imageable; no confirmed circumstellar debris disk has been detected around the primary.',
      note:'The giant planet and brown-dwarf companions materially affect the system mass.'
    },
    {
      name:'Tau Ceti', confirmed:'No planets treated as confirmed here; several low-mass candidates remain debated',
      knownOrbitingMassEarth:0, confidence:'Candidates excluded from gravitational mass total',
      material:'Resolved broad cold debris disk/Kuiper-belt analogue, modeled from roughly 1–10 AU inner edge to about 55 AU outer edge; detailed mineral fractions are not directly measured.',
      note:'Candidate planets are displayed as candidates and excluded from confirmed mass.'
    }
  ];

  const byName = new Map(REFERENCE.map(item => [item.name, item]));
  globalThis.BlacklightExoExampleReference = Object.freeze({
    preset: PRESET,
    updated: UPDATED,
    systems: REFERENCE.map(item => ({...item}))
  });

  const $ = id => document.getElementById(id);

  function isExample() {
    return $('exo-cluster-seed')?.value.trim().toUpperCase() === PRESET;
  }

  function applyReference() {
    if (!isExample()) return;
    const cards = [...document.querySelectorAll('#exo-cluster-grid .exo-cluster-card')];
    if (!cards.length) return;

    cards.forEach((card, index) => {
      const reference = byName.get(card.dataset.catalogName || card.querySelector('h3')?.textContent.trim()) || REFERENCE[index];
      if (!reference) return;
      const seed = card.querySelector('.exo-cluster-seed')?.textContent.trim();
      const existing = globalThis.BlacklightExoSystemMasses?.get(seed);
      const stellarMass = Number(card.dataset.stellarMass) || existing?.stellarMassSolar || 1;
      const orbitingMassSolar = reference.knownOrbitingMassEarth / EARTHS_PER_SOLAR_MASS;
      const publishedRecord = {
        ...(existing || {}),
        seed,
        stellarMassSolar: stellarMass,
        planetMassEarth: reference.knownOrbitingMassEarth,
        moonMassEarth: 0,
        beltMassLunar: 0,
        planetaryMassSolar: orbitingMassSolar,
        beltMassSolar: 0,
        totalSolarMass: stellarMass + orbitingMassSolar,
        provenance: 'published-reference-lower-bound',
        referenceUpdated: UPDATED,
        generatedScenarioMass: existing ? {...existing} : null
      };
      if (seed && globalThis.BlacklightExoSystemMasses instanceof Map) {
        globalThis.BlacklightExoSystemMasses.set(seed, publishedRecord);
      }
      card.dataset.planetaryMass = String(orbitingMassSolar);
      card.dataset.systemMass = String(publishedRecord.totalSolarMass);
      decorateCard(card, reference, publishedRecord);
    });

    ensureProvenancePanel();
    document.dispatchEvent(new CustomEvent('blacklight:example-reference-applied'));
  }

  function decorateCard(card, reference, record) {
    let details = card.querySelector('.exo-real-reference-facts');
    if (!details) {
      details = document.createElement('details');
      details.className = 'exo-real-reference-facts';
      const summary = document.createElement('summary');
      summary.textContent = 'Published astronomy and composition record';
      const data = document.createElement('dl');
      details.append(summary, data);
      card.querySelector('.exo-cluster-open')?.insertAdjacentElement('beforebegin', details);
    }
    const data = details.querySelector('dl');
    const rows = [
      ['Planetary record', reference.confirmed],
      ['Mass confidence', reference.confidence],
      ['Known orbiting mass used', `${reference.knownOrbitingMassEarth.toLocaleString(undefined, {maximumFractionDigits:2})} M⊕`],
      ['Total gravity-source mass', `${record.totalSolarMass.toFixed(record.totalSolarMass >= 1 ? 6 : 7)} M☉`],
      ['Material / mineral evidence', reference.material],
      ['Interpretation note', reference.note]
    ];
    const signature = JSON.stringify(rows);
    if (data.dataset.signature === signature) return;
    data.dataset.signature = signature;
    data.replaceChildren(...rows.flatMap(([label, value]) => {
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = label;
      dd.textContent = value;
      return [dt, dd];
    }));
  }

  function ensureProvenancePanel() {
    if ($('exo-example-provenance')) return;
    const status = $('exo-cluster-status');
    if (!status) return;
    const panel = document.createElement('details');
    panel.id = 'exo-example-provenance';
    panel.className = 'exo-example-provenance';
    panel.innerHTML = `
      <summary>EXAMPLE reference methodology and data boundaries</summary>
      <p><strong>Astrometry:</strong> approximate heliocentric J2000 positions derived from published right ascension, declination, and distance values, with Sol fixed at the origin.</p>
      <p><strong>Gravity mass:</strong> published stellar-system estimates plus confirmed or conservative minimum planetary masses. Candidate planets are listed but excluded from the mass total.</p>
      <p><strong>Mineralogy:</strong> only directly observed debris chemistry or composition constrained by spectroscopy and host-star abundance modeling is reported. Unknown composition is left unknown.</p>
      <p><strong>Detailed orbital pages:</strong> remain deterministic EXO scenarios unless explicitly identified as a measured Solar System record.</p>
      <p class="exo-reference-source-line">Reference families: Gaia Catalogue of Nearby Stars; SIMBAD/CDS; NASA Exoplanet Archive; published radial-velocity, astrometric, debris-disk, and stellar-abundance studies. Reference review: ${UPDATED}.</p>
    `;
    status.insertAdjacentElement('afterend', panel);
  }

  function initialize() {
    const grid = $('exo-cluster-grid');
    const seed = $('exo-cluster-seed');
    if (!grid || !seed || !(globalThis.BlacklightExoSystemMasses instanceof Map)) {
      requestAnimationFrame(initialize);
      return;
    }
    let queued = false;
    const schedule = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        applyReference();
      });
    };
    new MutationObserver(schedule).observe(grid, {childList:true, subtree:true});
    seed.addEventListener('change', schedule);
    document.addEventListener('blacklight:system-mass-measured', schedule);
    schedule();
  }

  initialize();
})();
