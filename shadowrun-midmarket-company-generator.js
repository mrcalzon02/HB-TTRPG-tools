(() => {
  'use strict';

  const STORAGE_KEY = 'hb-shadowrun-midmarket-company-history-v1';
  const MODULE_VERSION = '2026-07-09.1';
  const DEFAULT_SEED = 'assembly-bid-war';

  const state = {
    installed: false,
    current: null,
    history: []
  };

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));

  const slug = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 96) || 'shadowrun-midmarket-company';

  const SECTORS = {
    any: { label: 'Any middle-market supplier' },
    industrial: { label: 'Industrial assemblies and machine tooling' },
    electronics: { label: 'Electronics, sensors, and control boards' },
    logistics: { label: 'Logistics, cold-chain, and bonded warehousing' },
    biotech: { label: 'Biotech inputs and wet-lab subcontracting' },
    security: { label: 'Security hardware and response subcontracting' },
    consumer: { label: 'Consumer product components and packaging' },
    matrix: { label: 'Matrix services, firmware, and host support' },
    magical: { label: 'Awakened materials and ritual supply chain' }
  };

  const VOLATILITY = {
    low: { label: 'Stable bid cycle', collapseBase: 4, debtBias: -1 },
    standard: { label: 'Normal Shadowrun turbulence', collapseBase: 3, debtBias: 0 },
    high: { label: 'Predatory bid war', collapseBase: 2, debtBias: 1 },
    terminal: { label: 'Already bleeding out', collapseBase: 1, debtBias: 2 }
  };

  const CORP_CLIENTS = [
    'Ares Macrotechnology weapons logistics division',
    'Aztechnology consumer protein and agri-security procurement',
    'Evo biomedical systems subcontracting office',
    'Horizon behavioral analytics and media hardware unit',
    'Mitsuhama Computer Technologies robotics procurement',
    'NeoNET legacy asset liquidator',
    'Renraku Computer Systems embedded host services',
    'Saeder-Krupp heavy industrial acquisitions cell',
    'Shiawase Envirotech infrastructure purchasing',
    'Wuxing maritime and port automation group',
    'local extraterritorial arcology maintenance board',
    'anonymous AAA procurement shell using a disposable purchasing agent'
  ];

  const NAME_ROOTS = [
    'Apex', 'Blueknife', 'Brackwater', 'Caldera', 'Cascade', 'Cinderline', 'Copper Vein', 'Crown Fork', 'Daggerfin', 'Delta Nine', 'Everlock', 'FerroDyne',
    'Gallows Bay', 'Greyline', 'Helix Ward', 'Iron Orchard', 'Jade Rail', 'Kestrel', 'Longshore', 'Morrow', 'Nightglass', 'Northstar', 'Obsidian',
    'Orca Point', 'Pillar', 'Quicksilver', 'Redhook', 'Rivet Crown', 'Sable Yard', 'Signal Mercy', 'Steelwake', 'Talon', 'UmbraWorks', 'Vantage', 'Wardline'
  ];

  const NAME_SUFFIXES = [
    'Applied Systems', 'Assembly Group', 'Biologics', 'Circuit Foundry', 'Component Works', 'Contract Services', 'Data Fixtures', 'Fabrication', 'Industrial Partners',
    'Logistics', 'Machining', 'Materials', 'Microforge', 'Procurement Services', 'Response Systems', 'Security Devices', 'Signal Fabricators', 'Supply Cooperative',
    'Systems Integration', 'Warehousing', 'Wetworks Supply'
  ];

  const SECTOR_TABLES = {
    industrial: {
      products: ['actuator housings', 'servo armatures', 'pressure-rated valve trees', 'microfactory print heads', 'maintenance drone chassis', 'machine-tool replacement assemblies', 'industrial toaster-line calibration rigs'],
      clients: ['factory automation integrators', 'vehicle assembly plants', 'heavy equipment yards', 'arcology maintenance departments'],
      secrets: ['a supposedly new product line is rebuilt salvage with falsified certification tags', 'the QA department knows a tolerance defect will only appear after six months of field stress', 'their best machinist is actually a drone swarm running stolen shop-floor routines'],
      missions: ['steal the only clean tolerance file before the final client audit', 'replace a batch of actuator housings with subtly sabotaged units', 'extract the foreman who knows which units are going to fail']
    },
    electronics: {
      products: ['sensor clusters', 'RF shielding laminates', 'low-end drone control boards', 'cheap cybereye support chips', 'vehicle telemetry bricks', 'smart-appliance controller assemblies'],
      clients: ['consumer electronics brands', 'drone resellers', 'security installers', 'smart-home megacorp subsidiaries'],
      secrets: ['their firmware contains a dormant backdoor added by a previous client', 'a subcontractor quietly swapped certified chips for counterfeit lots', 'one prototype board is too close to a patented AAA design to survive litigation'],
      missions: ['plant a data ghost in the production firmware', 'recover counterfeit chips before the client inspection', 'intercept a courier carrying the only non-infringing board layout']
    },
    logistics: {
      products: ['bonded warehouse capacity', 'cold-chain pallet tracking', 'port clearance services', 'hazmat routing paperwork', 'last-mile drone dispatch', 'customs reconciliation packages'],
      clients: ['port authorities', 'pharma distributors', 'food-security contractors', 'extraterritorial procurement offices'],
      secrets: ['one warehouse aisle is leased to a shell company that never appears on the books', 'their cold-chain logs are being rewritten by an underpaid night spider', 'several sealed pallets are technically people, not products'],
      missions: ['make a container disappear without triggering customs alarms', 'prove a rival altered cold-chain logs', 'protect the dispatcher long enough to testify to a corporate auditor']
    },
    biotech: {
      products: ['reagent packs', 'vat nutrient media', 'cultured organ scaffolds', 'gene-sequencing sample kits', 'biohazard disposal contracts', 'synthetic protein stabilizers'],
      clients: ['clinic chains', 'agri-food divisions', 'body-shop franchises', 'wet-lab subcontractors'],
      secrets: ['failed trial samples were relabeled as industrial cultures', 'the disposal contractor is skimming viable tissue', 'their lead scientist sold emergency reserve samples to a street doc network'],
      missions: ['recover mislabeled samples before they enter a clinic supply chain', 'destroy a freezer manifest linking the client to illegal trials', 'extract the lab accountant who can prove the disposal fraud']
    },
    security: {
      products: ['maglock controller kits', 'camera mast assemblies', 'cheap response drones', 'panic-room integration packages', 'perimeter sensor poles', 'guard dispatch software'],
      clients: ['mall security companies', 'warehouse parks', 'private clinics', 'minor corporate campuses'],
      secrets: ['their default install password is still used by half the city', 'response-drone batteries fail below freezing', 'a former employee kept master keys for every client site'],
      missions: ['obtain a master installer package before it is patched', 'prove the battery defect caused a high-value breach', 'kidnap or protect the ex-employee with the key archive']
    },
    consumer: {
      products: ['toaster heating elements', 'soy processor feed augers', 'beverage cartridge valves', 'smart packaging tags', 'cheap appliance hinges', 'retail shelf sensor strips'],
      clients: ['white-label appliance brands', 'arcology food courts', 'automated retail chains', 'corporate housing suppliers'],
      secrets: ['the component that passed safety testing is not the component now shipping', 'the founder bet payroll on a single holiday retail contract', 'a harmless household part doubles as a military-compatible igniter'],
      missions: ['swap the inspection sample with the real shipping part', 'blackmail the founder into throwing a bid', 'trace who discovered the igniter compatibility before the wrong syndicate buys it']
    },
    matrix: {
      products: ['legacy host maintenance', 'device fleet patching', 'industrial firmware signing', 'low-grade IC leasing', 'AR inventory surfaces', 'credential reconciliation services'],
      clients: ['small corporate campuses', 'logistics contractors', 'retail chains', 'municipal shell authorities'],
      secrets: ['their root signing key was copied during a merger that never closed', 'the overnight support desk is an AI agent pretending to be six people', 'their cheapest IC package phones home to a dead company domain now owned by criminals'],
      missions: ['recover the root signing key before the client learns it leaked', 'prove the support desk is not legally staffed', 'burn the dead callback domain without alerting the criminals using it']
    },
    magical: {
      products: ['ward chalk compounds', 'ritual-grade reagents', 'spirit license paperwork', 'awakened botanical stabilizers', 'thaumaturgic survey services', 'mana-sensitive storage crates'],
      clients: ['boutique talismongers', 'corporate magical-security offices', 'research lodges', 'medical thaumaturgy clinics'],
      secrets: ['a reagent source is inside protected tribal land', 'one supplier pact is with a spirit rather than a legal entity', 'their clean astral certification was purchased from a compromised inspector'],
      missions: ['recover stolen reagent lots before the spirit claimant arrives', 'erase proof that the source site is protected land', 'protect the compromised inspector from everyone he sold signatures to']
    }
  };

  const OWNERSHIP = [
    'family-owned until the bank quietly took operational control',
    'private-equity backed with a three-year strip-and-flip mandate',
    'employee-owned on paper, creditor-owned in practice',
    'founded by ex-megacorp engineers under a brutal non-compete shadow',
    'owned by a holding company that exists only to bid on contracts and absorb lawsuits',
    'minority-owned by a AAA procurement shell that denies the relationship',
    'cooperative branding over a boardroom knife fight between three founders',
    'municipal partner on public documents, private contractor everywhere else'
  ];

  const BID_STATES = [
    'incumbent supplier whose renewal price just got undercut by 14 percent',
    'wild-card bidder offering delivery terms nobody sane would promise',
    'technically disqualified but still useful as a stalking horse bid',
    'preferred vendor until a rival filed an anonymous safety complaint',
    'sole local supplier after a port strike crippled everyone larger',
    'cheap emergency replacement for a larger contractor that failed publicly',
    'last surviving bidder after two rivals were bought, burned, or raided',
    'paper winner of a contract the client never intended to honor'
  ];

  const CASH_STATES = [
    'two missed payrolls from panic',
    'cash-rich for exactly nine days because the last invoice finally cleared',
    'floating operations on invoice factoring and threats',
    'solvent only while the current client keeps accepting partial shipments',
    'hiding a debt covenant breach from its lender',
    'borrowing from suppliers by refusing to pay them on time',
    'using one secret client to subsidize three respectable contracts',
    'one warehouse accident away from liquidation'
  ];

  const PRESSURE_POINTS = [
    'single-source material supplier', 'patent exposure', 'counterfeit component lot', 'burned-out night shift', 'customs hold', 'ransomware in the accounting host',
    'union drive', 'poached plant manager', 'expired safety certification', 'warehouse lease renewal', 'spoiled reagent lot', 'client-side procurement purge',
    'insurance audit', 'municipal inspection', 'hidden toxic spill', 'senior engineer with gambling debt'
  ];

  const SECURITY = [
    'one bored guard, bad cameras, strong locks, and a surprisingly aggressive night-shift dog',
    'overbuilt physical security but a fragile Matrix surface everyone ignores',
    'contract guards who know exactly how little they are paid to care',
    'decent cameras, poor badge discipline, and one ex-military operations manager',
    'silent alarm routed through a third-party response desk with a ten-minute gap',
    'good perimeter sensors around the wrong building',
    'maglocks and drones leased from a vendor with its own unpaid invoice dispute',
    'tight receiving controls, loose executive-suite access, and a terrified receptionist'
  ];

  const CULTURES = [
    'patriotic family-business rhetoric wrapped around wage theft and fear',
    'startup hustle language deployed on a factory floor where people can lose fingers',
    'old union shop gutted by subcontracting but still full of institutional memory',
    'ex-megacorp competence trapped under cheap ownership',
    'founder cult collapsing into creditor discipline',
    'friendly front office, vicious purchasing department, desperate back dock',
    'everyone knows the company is doomed, so everyone is stealing something different',
    'competent workers carrying executives who think procurement is a video game'
  ];

  const JOHNSONS = [
    'procurement vice president who will deny ever speaking to runners',
    'operations manager trying to save the company without telling the owner',
    'lender-appointed turnaround consultant with no patience and no loyalty',
    'founder who still believes one more contract will fix everything',
    'AAA purchasing agent using the firm as disposable leverage',
    'union organizer who needs proof before the plant disappears overnight',
    'rival bidder offering a clean job that will become dirty by the second call',
    'fixer representing employees who know the severance fund is fake'
  ];

  const FALLOUT = [
    'the company dissolves before the runners can collect the second half',
    'the Johnson changes employers and pretends the conversation never happened',
    'the winning bid is transferred to a shell company with the same machines and none of the debts',
    'the client buys the assets at auction and blacklists everyone who knew too much',
    'the workers occupy the plant for three nights before corporate security clears it',
    'a rival supplier hires the same runners for the opposite side of the same contract',
    'the audit succeeds, the firm survives, and the client punishes them for embarrassing procurement',
    'the product recall becomes public and every involved executive claims subcontractor fraud'
  ];

  function hash32(input, seed = 0x811c9dc5) {
    let hash = seed >>> 0;
    const text = String(input || '');
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x85ebca6b);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35);
    hash ^= hash >>> 16;
    return hash >>> 0;
  }

  function rng(seedText) {
    let value = hash32(seedText || DEFAULT_SEED, 0x6d2b79f5) || 1;
    return () => {
      value += 0x6d2b79f5;
      let result = value;
      result = Math.imul(result ^ (result >>> 15), result | 1);
      result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
      return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(random, list) {
    return list[Math.floor(random() * list.length)] ?? list[0];
  }

  function sample(random, list, count) {
    const copy = [...list];
    const output = [];
    while (copy.length && output.length < count) {
      output.push(copy.splice(Math.floor(random() * copy.length), 1)[0]);
    }
    return output;
  }

  function chooseSector(random, selected) {
    if (selected && selected !== 'any' && SECTOR_TABLES[selected]) return selected;
    return pick(random, Object.keys(SECTOR_TABLES));
  }

  function rating(random, base, min = 1, max = 6) {
    return Math.max(min, Math.min(max, base + Math.floor(random() * 3) - 1));
  }

  function clock(random, volatility) {
    const profile = VOLATILITY[volatility] || VOLATILITY.standard;
    const segments = Math.max(1, Math.min(6, profile.collapseBase + Math.floor(random() * 3) - 1));
    const filled = Math.max(0, Math.min(segments, Math.floor(random() * (segments + profile.debtBias + 2))));
    return { segments, filled, label: `${filled}/${segments} collapse segments filled` };
  }

  function generateCompany(options = {}) {
    const market = String(options.market || 'Seattle metroplex').trim() || 'Seattle metroplex';
    const volatility = options.volatility || 'standard';
    const random = rng(`${options.seed || DEFAULT_SEED}|${market}|${options.sector || 'any'}|${volatility}|${Date.now() && options.lockedTime ? Date.now() : ''}`);
    const sectorKey = chooseSector(random, options.sector || 'any');
    const sector = SECTOR_TABLES[sectorKey];
    const name = `${pick(random, NAME_ROOTS)} ${pick(random, NAME_SUFFIXES)}`;
    const coreProducts = sample(random, sector.products, 3);
    const pressure = sample(random, PRESSURE_POINTS, 3);
    const collapse = clock(random, volatility);
    const leverageRating = rating(random, volatility === 'terminal' ? 4 : 3, 1, 6);
    const securityRating = rating(random, sectorKey === 'security' ? 4 : 3, 1, 6);
    const heatRating = rating(random, volatility === 'high' || volatility === 'terminal' ? 4 : 3, 1, 6);
    const shadowValue = rating(random, sectorKey === 'matrix' || sectorKey === 'magical' ? 4 : 3, 1, 6);
    const missionSeeds = sample(random, sector.missions, 2);
    const secret = pick(random, sector.secrets);
    const packageKey = `sr-midco-${hash32(`${name}|${market}|${sectorKey}|${coreProducts.join('|')}`, 0xa11ce55).toString(16).padStart(8, '0')}`;

    return {
      schemaVersion: MODULE_VERSION,
      packageKey,
      generatedAt: new Date().toISOString(),
      name,
      market,
      sectorKey,
      sectorLabel: SECTORS[sectorKey].label,
      publicProfile: `${name} is a ${SECTORS[sectorKey].label.toLowerCase()} firm operating out of the ${market} supply chain. It is not a AAA, not a prime mover, and not important enough to survive a real procurement war without help. It builds the pieces used by companies that build pieces used by companies that build the final product.`,
      ownership: pick(random, OWNERSHIP),
      mainClient: pick(random, CORP_CLIENTS),
      localCustomers: sample(random, sector.clients, 2),
      currentBidState: pick(random, BID_STATES),
      cashState: pick(random, CASH_STATES),
      coreProducts,
      pressurePoints: pressure,
      security: pick(random, SECURITY),
      workerCulture: pick(random, CULTURES),
      johnson: pick(random, JOHNSONS),
      hiddenTruth: secret,
      runHooks: missionSeeds.concat([
        `decide whether the runners are saving ${name}, killing it cleanly, or helping someone wear its corpse as a new vendor number`,
        `follow the bid chain upward and find the real buyer before the public employer becomes legally dead`
      ]),
      ratings: {
        contractLeverage: leverageRating,
        siteSecurity: securityRating,
        heatRisk: heatRating,
        shadowValue
      },
      collapseClock: collapse,
      aftermath: pick(random, FALLOUT),
      gmRead: `${name} should feel useful, desperate, and disposable. It is big enough to hire runners, small enough to die between sessions, and connected enough that its collapse can move heat, evidence, equipment, employees, and debts into the next run.`
    };
  }

  function readHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(parsed) ? parsed.slice(0, 12) : [];
    } catch (_) {
      return [];
    }
  }

  function writeHistory(items) {
    state.history = items.slice(0, 12);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.history));
    } catch (_) {
      // Optional browser storage must not block the generator.
    }
  }

  function remember(company) {
    writeHistory([company, ...readHistory().filter(item => item.packageKey !== company.packageKey)].slice(0, 12));
  }

  function injectStyles() {
    if (document.getElementById('shadowrun-midmarket-company-style')) return;
    const style = document.createElement('style');
    style.id = 'shadowrun-midmarket-company-style';
    style.textContent = `
      .sr-midco{border:1px solid var(--line);border-radius:20px;background:#0b0d12;overflow:hidden;margin:18px 0 28px}
      .sr-midco-header{display:flex;justify-content:space-between;gap:16px;align-items:start;padding:20px 22px 13px;border-bottom:1px solid var(--line)}
      .sr-midco-header h2{margin:.15rem 0 .5rem}.sr-midco-header p{max-width:980px}
      .sr-midco-layout{display:grid;grid-template-columns:minmax(320px,380px) minmax(460px,1fr);min-height:620px}
      .sr-midco-controls{padding:14px;background:#101218;border-right:1px solid var(--line)}
      .sr-midco-output{padding:16px;background:#15181e;min-width:0}
      .sr-midco-card{background:#181b22;padding:14px;margin:0 0 13px;border:1px solid #333;border-left:5px solid #2bb673;border-radius:11px}
      .sr-midco-card h3{margin-top:0}.sr-midco-card label{display:grid;gap:4px;margin-top:9px;color:var(--muted);font-size:.8rem}
      .sr-midco-card input,.sr-midco-card select,.sr-midco-card textarea{width:100%;box-sizing:border-box;background:#11151d;border:1px solid var(--line);color:var(--ink);border-radius:9px;padding:9px}
      .sr-midco-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.sr-midco-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:9px;margin-top:10px}
      .sr-midco-field{border-left:3px solid var(--accent);padding:9px;background:#10131a;border-radius:7px}.sr-midco-field strong{display:block;margin-bottom:3px}.sr-midco-field span{white-space:pre-wrap}
      .sr-midco-pills{display:flex;flex-wrap:wrap;gap:5px;margin:8px 0}.sr-midco-pill{border:1px solid var(--line);border-radius:999px;padding:3px 7px;font-size:.7rem;color:var(--muted)}
      .sr-midco-score{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;padding:8px;background:#10131a;border:1px solid var(--line);border-radius:8px}
      .sr-midco-bars{display:flex;gap:3px}.sr-midco-bar{width:12px;height:12px;border-radius:2px;background:#2bb67344;border:1px solid #2bb67388}.sr-midco-bar.on{background:#2bb673}
      .sr-midco-history{display:grid;gap:7px;margin-top:8px}.sr-midco-history button{width:100%;text-align:left;border:1px solid var(--line);border-radius:9px;background:#151820;color:var(--ink);padding:8px;cursor:pointer}
      .sr-midco-history button:hover{border-color:var(--accent)}.sr-midco-status{padding:9px;border:1px solid var(--line);border-radius:9px;color:var(--muted);font-size:.8rem;background:#0d1016;margin-top:10px}.sr-midco-status.success{border-color:#4c9a75;color:#b9f5dc}.sr-midco-status.error{border-color:#9b3f3f;color:#ffb3b3}
      .sr-midco-print{white-space:pre-wrap;background:#0f1218;border:1px solid var(--line);border-radius:10px;padding:12px;color:var(--ink);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.78rem;line-height:1.45;overflow:auto;max-height:560px}
      @media(max-width:980px){.sr-midco-layout{grid-template-columns:1fr}.sr-midco-controls{border-right:0;border-bottom:1px solid var(--line)}}
    `;
    document.head.appendChild(style);
  }

  function sectorOptions() {
    return Object.entries(SECTORS).map(([id, info]) => `<option value="${escapeHtml(id)}">${escapeHtml(info.label)}</option>`).join('');
  }

  function volatilityOptions() {
    return Object.entries(VOLATILITY).map(([id, info]) => `<option value="${escapeHtml(id)}">${escapeHtml(info.label)}</option>`).join('');
  }

  function buildPanel() {
    const view = document.getElementById('shadowrun');
    if (!view) return false;
    if (document.getElementById('shadowrun-midmarket-company-panel')) return true;
    injectStyles();
    const panel = document.createElement('section');
    panel.id = 'shadowrun-midmarket-company-panel';
    panel.className = 'sr-midco no-print';
    panel.hidden = true;
    panel.setAttribute('aria-labelledby', 'sr-midco-title');
    panel.innerHTML = `
      <header class="sr-midco-header">
        <div><p class="eyebrow">Shadowrun supply-chain generator</p><h2 id="sr-midco-title">Mid-Market Supplier Company Generator</h2><p>These are not the big AAA firms. These are the middle-water suppliers, component houses, job shops, service contractors, and desperate subcontractors that build the assemblies the big firms use to build the thing that builds the toaster. They are sharp enough to hire runners and disposable enough to vanish before the next invoice clears.</p></div>
        <button type="button" class="secondary-action" data-sr-midco-close>Hide</button>
      </header>
      <div class="sr-midco-layout">
        <aside class="sr-midco-controls">
          <section class="sr-midco-card">
            <h3>Generation Controls</h3>
            <label>Seed<input id="sr-midco-seed" value="${escapeHtml(DEFAULT_SEED)}"></label>
            <label>Market / metroplex<input id="sr-midco-market" value="Seattle metroplex"></label>
            <label>Supplier sector<select id="sr-midco-sector">${sectorOptions()}</select></label>
            <label>Bid volatility<select id="sr-midco-volatility">${volatilityOptions()}</select></label>
            <div class="sr-midco-actions"><button type="button" class="primary-action" data-sr-midco-generate>Generate Company</button><button type="button" class="secondary-action" data-sr-midco-reroll>Reroll Seed</button></div>
            <p class="helper-note">Use this for firms that sit below AAA attention: manufacturers, warehousers, firmware shops, reagent vendors, security installers, and other fragile procurement-world survivors.</p>
            <div id="sr-midco-status" class="sr-midco-status">Ready.</div>
          </section>
          <section class="sr-midco-card">
            <h3>Saved Local Results</h3>
            <div id="sr-midco-history" class="sr-midco-history"></div>
          </section>
        </aside>
        <main class="sr-midco-output">
          <div id="sr-midco-display"></div>
        </main>
      </div>
    `;
    view.appendChild(panel);
    panel.addEventListener('click', event => {
      if (event.target.closest('[data-sr-midco-close]')) panel.hidden = true;
      if (event.target.closest('[data-sr-midco-generate]')) runGenerate(false);
      if (event.target.closest('[data-sr-midco-reroll]')) runGenerate(true);
      if (event.target.closest('[data-sr-midco-copy]')) void copyCurrent();
      if (event.target.closest('[data-sr-midco-download]')) downloadCurrent();
      const historyButton = event.target.closest('[data-sr-midco-history-key]');
      if (historyButton) loadFromHistory(historyButton.dataset.srMidcoHistoryKey);
    });
    state.history = readHistory();
    runGenerate(false);
    renderHistory();
    return true;
  }

  function formOptions(reroll) {
    const seedInput = document.getElementById('sr-midco-seed');
    if (reroll && seedInput) seedInput.value = `${seedInput.value || DEFAULT_SEED}-${Math.floor(Math.random() * 999999).toString(36)}`;
    return {
      seed: seedInput?.value || DEFAULT_SEED,
      market: document.getElementById('sr-midco-market')?.value || 'Seattle metroplex',
      sector: document.getElementById('sr-midco-sector')?.value || 'any',
      volatility: document.getElementById('sr-midco-volatility')?.value || 'standard'
    };
  }

  function runGenerate(reroll) {
    const company = generateCompany(formOptions(reroll));
    state.current = company;
    remember(company);
    renderCompany(company);
    renderHistory();
    setStatus(`Generated ${company.name}.`, false, true);
  }

  function renderCompany(company) {
    const target = document.getElementById('sr-midco-display');
    if (!target) return;
    target.innerHTML = `
      <section class="sr-midco-card">
        <p class="eyebrow">${escapeHtml(company.packageKey)}</p>
        <h3>${escapeHtml(company.name)}</h3>
        <p>${escapeHtml(company.publicProfile)}</p>
        <div class="sr-midco-pills"><span class="sr-midco-pill">${escapeHtml(company.sectorLabel)}</span><span class="sr-midco-pill">${escapeHtml(company.market)}</span><span class="sr-midco-pill">${escapeHtml(company.collapseClock.label)}</span></div>
        <div class="sr-midco-actions"><button type="button" class="secondary-action" data-sr-midco-copy>Copy JSON</button><button type="button" class="secondary-action" data-sr-midco-download>Download JSON</button></div>
      </section>
      <section class="sr-midco-card">
        <h3>Business and Procurement Read</h3>
        <div class="sr-midco-grid">
          ${field('Ownership', company.ownership)}
          ${field('Main corporate client', company.mainClient)}
          ${field('Local customers', company.localCustomers.join(' | '))}
          ${field('Current bid state', company.currentBidState)}
          ${field('Cash state', company.cashState)}
          ${field('Core products / services', company.coreProducts.join(' | '))}
        </div>
      </section>
      <section class="sr-midco-card">
        <h3>Pressure, Security, and Worker Reality</h3>
        <div class="sr-midco-grid">
          ${field('Pressure points', company.pressurePoints.join(' | '))}
          ${field('Security posture', company.security)}
          ${field('Worker culture', company.workerCulture)}
          ${field('Likely Johnson', company.johnson)}
          ${field('Hidden truth', company.hiddenTruth)}
          ${field('Likely aftermath', company.aftermath)}
        </div>
      </section>
      <section class="sr-midco-card">
        <h3>Shadow Utility Ratings</h3>
        <div class="sr-midco-grid">
          ${score('Contract leverage', company.ratings.contractLeverage)}
          ${score('Site security', company.ratings.siteSecurity)}
          ${score('Heat risk', company.ratings.heatRisk)}
          ${score('Shadow value', company.ratings.shadowValue)}
        </div>
      </section>
      <section class="sr-midco-card">
        <h3>Run Hooks</h3>
        <div class="sr-midco-grid">${company.runHooks.map((hook, index) => field(`Hook ${index + 1}`, hook)).join('')}</div>
        <p><strong>GM read:</strong> ${escapeHtml(company.gmRead)}</p>
      </section>
      <section class="sr-midco-card">
        <h3>Printable JSON Snapshot</h3>
        <pre class="sr-midco-print">${escapeHtml(JSON.stringify(company, null, 2))}</pre>
      </section>
    `;
  }

  function field(label, value) {
    return `<div class="sr-midco-field"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`;
  }

  function score(label, value) {
    const bars = Array.from({ length: 6 }, (_, index) => `<span class="sr-midco-bar ${index < value ? 'on' : ''}"></span>`).join('');
    return `<div class="sr-midco-score"><strong>${escapeHtml(label)}</strong><span class="sr-midco-bars" aria-label="${escapeHtml(`${value} of 6`)}">${bars}</span></div>`;
  }

  function renderHistory() {
    const target = document.getElementById('sr-midco-history');
    if (!target) return;
    state.history = readHistory();
    target.innerHTML = state.history.length ? state.history.map(item => `<button type="button" data-sr-midco-history-key="${escapeHtml(item.packageKey)}"><strong>${escapeHtml(item.name)}</strong><br><span>${escapeHtml(item.sectorLabel)} · ${escapeHtml(item.collapseClock?.label || 'no clock')}</span></button>`).join('') : '<p class="helper-note">No saved local companies yet.</p>';
  }

  function loadFromHistory(key) {
    const item = readHistory().find(candidate => candidate.packageKey === key);
    if (!item) return setStatus('Saved company was not found in local storage.', true);
    state.current = item;
    renderCompany(item);
    setStatus(`Loaded ${item.name}.`, false, true);
  }

  function exportCurrent() {
    if (!state.current) state.current = generateCompany(formOptions(false));
    return state.current;
  }

  async function copyCurrent() {
    const current = exportCurrent();
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(JSON.stringify(current, null, 2));
      setStatus('Company JSON copied to clipboard.', false, true);
    } catch (_) {
      setStatus('Clipboard access was not available; use the printable JSON or download control.', true);
    }
  }

  function downloadCurrent() {
    const current = exportCurrent();
    const url = URL.createObjectURL(new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${slug(current.name)}-${current.packageKey}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setStatus('Company JSON downloaded.', false, true);
  }

  function setStatus(message, error = false, success = false) {
    const target = document.getElementById('sr-midco-status');
    if (!target) return;
    target.textContent = message;
    target.classList.toggle('error', error);
    target.classList.toggle('success', success && !error);
  }

  function openPanel() {
    if (!buildPanel()) throw new Error('The Shadowrun workspace is not ready yet.');
    const panel = document.getElementById('shadowrun-midmarket-company-panel');
    panel.hidden = false;
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return state.current;
  }

  async function install() {
    if (state.installed) return;
    state.installed = true;
    let attempts = 0;
    while (!buildPanel() && attempts < 100) {
      attempts += 1;
      await new Promise(resolve => window.setTimeout(resolve, 100));
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else void install();

  window.ShadowrunMidmarketCompanyGenerator = Object.freeze({
    openPanel,
    generateCompany,
    getCurrentCompany: () => state.current,
    getHistory: () => readHistory()
  });
})();
