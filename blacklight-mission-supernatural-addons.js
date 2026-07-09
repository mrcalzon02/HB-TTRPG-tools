(() => {
  'use strict';

  const rivalryWeb = {
    'Blood Courts': ['Fae Courts', 'Hunter Orders', 'Gaian Packs', 'Black Archive Custodians'],
    'Fae Courts': ['Blood Courts', 'Gaian Spirit Pacts', 'Dream Cartels', 'Mirror Polities'],
    'Gaian Packs and Spirit Courts': ['Corrupted Shapechangers', 'Manufacturers and Extraction Interests', 'Fae Courts', 'Blood Courts'],
    'Dream Cartels': ['Fae Courts', 'Hollow Choir', 'Memory Parasites', 'Oracle Houses'],
    'Hunter Orders': ['Blood Courts', 'Fae Courts', 'Gaian Packs', 'Corrupted Shapechangers'],
    'Industrial Witches and Contract Engineers': ['Gaian Spirit Pacts', 'Oracle Houses', 'Manufacturers and Extraction Interests', 'Fae Courts'],
    'Memory Parasites': ['Corrupted Shapechangers', 'Dream Cartels', 'Oracle Houses', 'Blacklight Continuity'],
    'Mirror Polities': ['Fae Courts', 'Blood Courts', 'Oracle Houses', 'Black Archive Custodians'],
    'Oracle Houses': ['Dream Cartels', 'Industrial Witches', 'Memory Parasites', 'Mirror Polities'],
    'Hollow Choir': ['Dream Cartels', 'Corrupted Shapechangers', 'Hunter Orders', 'Gaian Spirit Pacts'],
    'Black Archive Custodians': ['Hunter Orders', 'Memory Parasites', 'Oracle Houses', 'Corrupted Shapechangers']
  };

  const supernaturalClients = [
    { family: 'Blood Courts', name: 'Vesper House Blood Steward', need: 'recover a ledger of feeding rights before sunrise', tell: 'The steward is calm, overdressed, and terrified of a debt older than the building.' },
    { family: 'Blood Courts', name: 'Exiled Crimson Herald', need: 'deliver terms to a hostile court without triggering open feeding reprisals', tell: 'They keep checking every reflective surface for a messenger following behind them.' },
    { family: 'Fae Courts', name: 'Winter Market Envoy', need: 'recover a stolen invitation before the wrong guest can use it', tell: 'Their smile is perfect, but none of their shadows agree where the light is.' },
    { family: 'Fae Courts', name: 'Unseelie Contract Auditor', need: 'locate a missing clause that changed ownership of a person, place, or memory', tell: 'They refuse to say please because the word has legal weight where they come from.' },
    { family: 'Gaian Packs and Spirit Courts', name: 'Territory Warden of the Green Teeth', need: 'identify a corrupted shapechanger before the pack tears itself apart', tell: 'Their phone case contains a tooth, a seed, and an old brass employee badge.' },
    { family: 'Gaian Packs and Spirit Courts', name: 'Old Creek Spirit Advocate', need: 'force recognition of a violated boundary pact before the river takes witnesses', tell: 'Water beads on their skin even in dry rooms.' },
    { family: 'Dream Cartels', name: 'Somnolent Broker in Blue Silk', need: 'recover a nightmare shipment before it is resold to a political client', tell: 'They are awake, but their reflection is asleep in every window.' },
    { family: 'Dream Cartels', name: 'Night Auction Clerk', need: 'verify whether a prophecy being auctioned is authentic, stolen, or manufactured', tell: 'They carry a numbered paddle for an auction nobody remembers attending.' },
    { family: 'Hunter Orders', name: 'Penitent Hunter Captain', need: 'prove an extermination order was forged before a cell opens fire', tell: 'They know they are dangerous and keep asking for oversight anyway.' },
    { family: 'Industrial Witches and Contract Engineers', name: 'Refinery Witch-General', need: 'unbind a cursed utility grid without bankrupting the city', tell: 'Every contract they touch smells faintly of hot copper and rain.' },
    { family: 'Memory Parasites', name: 'Polite Amnesiac Choirboy', need: 'discover whether they are the victim, host, or predator in a memory theft', tell: 'They apologize for things nobody else remembers them doing.' },
    { family: 'Mirror Polities', name: 'Deputy Minister from the Reflected City', need: 'serve a mirror subpoena before both jurisdictions claim the same official', tell: 'Their badge is reversed until photographed.' },
    { family: 'Oracle Houses', name: 'Blind Probability Heiress', need: 'prove a prediction was murdered rather than merely wrong', tell: 'She speaks about tomorrow with the exhaustion of someone reading old mail.' },
    { family: 'Hollow Choir', name: 'Empty Vessel Speaking in Three Voices', need: 'identify the voice using them before the next broadcast', tell: 'Every answer begins with a different throat clearing.' },
    { family: 'Black Archive Custodians', name: 'Archivist with a Burned Index Finger', need: 'recover a forbidden file before the archive forgets it ever existed', tell: 'They keep a list of books that deny being written.' }
  ];

  const missionLocations = [
    { site: 'abandoned ferry terminal', region: 'waterfront transit ruin', pressure: 'the tide exposes a door that should not exist for twenty-three minutes', clue: 'wet footprints walk inland and then become ash' },
    { site: 'sealed hospital records basement', region: 'medical administration', pressure: 'every file cabinet is labeled with a future patient name', clue: 'one drawer contains discharge papers for someone not yet born' },
    { site: 'corporate server room under emergency cooling', region: 'secure infrastructure', pressure: 'the backup fans chant in a borrowed human voice', clue: 'thermal cameras show a kneeling figure made of cold air' },
    { site: 'riverside courthouse archive', region: 'legal and civic records', pressure: 'the oldest docket keeps adding hearings from another jurisdiction', clue: 'a judge nobody remembers has signed tomorrow’s warrant' },
    { site: 'night market beneath a commuter rail station', region: 'liminal commerce', pressure: 'cash, names, memories, and blood are all accepted currencies', clue: 'the lost-and-found counter sells things before they are lost' },
    { site: 'decommissioned hydroelectric plant', region: 'industrial water site', pressure: 'the river spirit considers the turbines an unfinished body', clue: 'the warning signs are written in fish bones and OSHA language' },
    { site: 'luxury hotel conference level', region: 'corporate hospitality', pressure: 'the elevator opens onto different years depending on who presses the button', clue: 'a convention badge lists a company that closes next decade' },
    { site: 'suburban data recovery shop', region: 'small commercial technology', pressure: 'dead relatives are leaving repair tickets', clue: 'a cracked hard drive hums lullabies through the receipt printer' },
    { site: 'municipal utility tunnel', region: 'city infrastructure', pressure: 'a maintenance map includes rooms built by no known contractor', clue: 'the tunnel cameras show workers who retired in 1986' },
    { site: 'burned church converted into coworking space', region: 'repurposed sacred site', pressure: 'every signed rental agreement includes a vow nobody remembers making', clue: 'conference room names rearrange into an oath when read aloud' },
    { site: 'private airport customs office', region: 'controlled transit point', pressure: 'an envoy has arrived with a passport from a mirror government', clue: 'the passport photo moves when nobody is holding it' },
    { site: 'forest service road beside an illegal extraction camp', region: 'remote contested territory', pressure: 'the trees move closer whenever nobody records them', clue: 'survey stakes bleed sap and stamped serial numbers' },
    { site: 'call center after closing', region: 'communications workplace', pressure: 'every abandoned headset answers the same emergency line', clue: 'the hold music contains a confession when played backward' },
    { site: 'law firm document vault', region: 'legal storage', pressure: 'a contract keeps rewriting itself in the blood type of the reader', clue: 'the witness signature is older than the paper' },
    { site: 'university physics annex', region: 'academic research site', pressure: 'a locked laboratory is still publishing observations from inside', clue: 'chalk dust falls upward under one door' },
    { site: 'shopping mall aquarium court', region: 'public commercial liminal space', pressure: 'the koi pond receives diplomatic envoys at midnight', clue: 'the fish wear tiny tags naming dead monarchs' },
    { site: 'privately owned timber access road', region: 'manufacturer-controlled forest edge', pressure: 'the permit signs keep being clawed into warnings overnight', clue: 'a corrupted shapechanger has marked the boundary with symbols that make cameras misremember the road' },
    { site: 'chemical plant retention pond', region: 'industrial runoff site', pressure: 'the pond spirit has accepted a Gaian pact and refuses to stay silent', clue: 'the water reflects a factory that has not been built yet' }
  ];

  const motives = ['old debt', 'territory pressure', 'oath breach', 'resource theft', 'identity claim', 'jurisdictional insult', 'predation route', 'prophecy leverage', 'containment panic', 'commercial sabotage', 'spiritual contamination', 'database ownership dispute', 'cognitohazard corruption', 'manufacturing encroachment', 'broken spirit pact'];
  const complications = ['the client is withholding the original sin of the conflict', 'the opposition may be technically correct under old law', 'a human employee is already compromised', 'the mission site is protected by a third faction', 'Charles records disagree with eyewitness memory', 'the obvious monster is a decoy', 'the client and opposition both hired Blacklight through proxies', 'the location itself is alive enough to object', 'the case must remain invisible to ordinary emergency services', 'the mission clock is tied to sunrise, tide, power reserve, or dream cycle', 'the corrupted shapechanger used to belong to the client pack', 'the manufacturer has legal paperwork and illegal metaphysical consequences', 'the spirit pact is real but badly worded'];
  const concerns = ['avoid uncontrolled public exposure', 'preserve human ownership of final decisions', 'separate archive facts from supernatural claims', 'prevent a client from using Blacklight as a weapon', 'protect ordinary workers caught inside supernatural politics', 'keep Charles-adjacent systems read-only around dangerous controls', 'document source confidence before escalation', 'identify whether the rival faction is guilty or merely convenient', 'avoid treating the Gaian claim to guardianship as automatic legal authority', 'separate corrupted shapechanger infection from ordinary pack politics'];
  const codenames = ['ASH WINDOW', 'LOW TIDE', 'GLASS WARRANT', 'RIVER STATIC', 'HOLLOW DESK', 'BRASS MOON', 'SLEEPING LEDGER', 'BLACK KILN', 'MIRROR RAIN', 'COLD RECEIPT'];

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function titleCase(text) { return text.replace(/\b\w/g, char => char.toUpperCase()); }

  function injectStyles() {
    if (document.getElementById('blacklight-mission-supernatural-addons-style')) return;
    const style = document.createElement('style');
    style.id = 'blacklight-mission-supernatural-addons-style';
    style.textContent = `
      .supernatural-mission-panel{border:1px solid rgba(217,168,79,.35);border-radius:22px;background:linear-gradient(135deg,rgba(18,16,13,.97),rgba(4,4,4,.99));box-shadow:0 22px 55px rgba(0,0,0,.34);padding:18px;margin:18px 0;display:grid;gap:14px}
      .supernatural-mission-panel h2{margin:0;color:#f4efe5}.supernatural-mission-panel p{color:#bdb4a4;line-height:1.55}.supernatural-control-row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.supernatural-control-row label{color:#d9a84f;font-weight:900;text-transform:uppercase;letter-spacing:.08em;font-size:.78rem}.supernatural-control-row select{border:1px solid rgba(217,168,79,.28);border-radius:999px;background:#080706;color:#f4efe5;padding:9px 12px}.supernatural-control-row button{border:1px solid rgba(217,168,79,.62);border-radius:999px;background:rgba(217,168,79,.13);color:#f4efe5;font-weight:900;letter-spacing:.06em;text-transform:uppercase;padding:10px 14px;cursor:pointer}.supernatural-control-row button:hover{background:rgba(217,168,79,.23)}
      .supernatural-mission-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.supernatural-mission-chip{border:1px solid rgba(217,168,79,.2);border-radius:16px;background:rgba(0,0,0,.22);padding:12px}.supernatural-mission-chip strong{display:block;color:#d9a84f;text-transform:uppercase;letter-spacing:.08em;font-size:.72rem;margin-bottom:6px}.supernatural-mission-chip span{color:#f4efe5;line-height:1.45}.supernatural-brief{border:1px solid rgba(217,168,79,.2);border-radius:18px;background:rgba(0,0,0,.18);padding:14px;color:#f4efe5;line-height:1.6}.supernatural-links{display:flex;gap:10px;flex-wrap:wrap}.supernatural-links a{color:#d9a84f;font-weight:900;text-transform:uppercase;letter-spacing:.06em;text-decoration:none}.supernatural-links a:hover{text-decoration:underline}
    `;
    document.head.appendChild(style);
  }

  function buildPanel() {
    if (document.getElementById('supernatural-mission-panel')) return;
    const controls = document.querySelector('.mission-controls') || document.querySelector('.mission-shell') || document.body;
    const panel = document.createElement('section');
    panel.id = 'supernatural-mission-panel';
    panel.className = 'supernatural-mission-panel no-print';
    panel.innerHTML = `
      <div>
        <p class="eyebrow">Supernatural client, rivalry, and location generator</p>
        <h2>Client-linked mission pressure.</h2>
        <p>This add-on generates a supernatural client first, then selects a rival opposition faction from the known rivalry web and pairs the case with a Blacklight location seed.</p>
      </div>
      <div class="supernatural-control-row">
        <label for="supernatural-client-family">Client family</label>
        <select id="supernatural-client-family"><option value="any">Any supernatural client</option></select>
        <button type="button" id="supernatural-generate">Generate Client, Rival, and Location</button>
        <button type="button" id="supernatural-copy">Copy Add-On Brief</button>
      </div>
      <div class="supernatural-mission-grid">
        <div class="supernatural-mission-chip"><strong>Case code</strong><span id="supernatural-code">—</span></div>
        <div class="supernatural-mission-chip"><strong>Supernatural client</strong><span id="supernatural-client">—</span></div>
        <div class="supernatural-mission-chip"><strong>Client need</strong><span id="supernatural-need">—</span></div>
        <div class="supernatural-mission-chip"><strong>Opposing faction</strong><span id="supernatural-opposition">—</span></div>
        <div class="supernatural-mission-chip"><strong>Rivalry logic</strong><span id="supernatural-rivalry">—</span></div>
        <div class="supernatural-mission-chip"><strong>Location</strong><span id="supernatural-location">—</span></div>
        <div class="supernatural-mission-chip"><strong>Site pressure</strong><span id="supernatural-pressure">—</span></div>
        <div class="supernatural-mission-chip"><strong>Complication</strong><span id="supernatural-complication">—</span></div>
      </div>
      <div class="supernatural-brief" id="supernatural-brief">Generate a supernatural client package to attach to the current mission dossier.</div>
      <div class="supernatural-links"><a href="blacklight-supernatural-rivalry-web.html">Open rivalry web lore</a><a href="blacklight-systems-black.html">Return to Black archive</a></div>
    `;
    controls.insertAdjacentElement('afterend', panel);

    const select = panel.querySelector('#supernatural-client-family');
    Object.keys(rivalryWeb).forEach(family => {
      const option = document.createElement('option');
      option.value = family;
      option.textContent = family;
      select.appendChild(option);
    });

    let currentText = '';
    function chooseClient() {
      const wanted = select.value;
      const pool = wanted === 'any' ? supernaturalClients : supernaturalClients.filter(client => client.family === wanted);
      return pick(pool.length ? pool : supernaturalClients);
    }
    function generate() {
      const client = chooseClient();
      const rival = pick(rivalryWeb[client.family] || ['Unknown Rival Faction']);
      const location = pick(missionLocations);
      const motive = pick(motives);
      const complication = pick(complications);
      const concern = pick(concerns);
      const code = pick(codenames);
      const rivalry = `${rival} enters the case through ${motive}; the rivalry web marks this as a known pressure line against ${client.family}.`;
      const brief = `Case ${code}: ${client.name} requests Blacklight support to ${client.need}. Known opposition candidate: ${rival}. Rivalry logic: ${rivalry} Location generator result: ${titleCase(location.site)} (${location.region}); ${location.pressure}. Site clue: ${location.clue}. Complication: ${complication}. Blacklight concern: ${concern}. Client tell: ${client.tell}`;
      panel.querySelector('#supernatural-code').textContent = code;
      panel.querySelector('#supernatural-client').textContent = `${client.name} · ${client.family}`;
      panel.querySelector('#supernatural-need').textContent = client.need;
      panel.querySelector('#supernatural-opposition').textContent = rival;
      panel.querySelector('#supernatural-rivalry').textContent = rivalry;
      panel.querySelector('#supernatural-location').textContent = `${titleCase(location.site)} · ${location.region}`;
      panel.querySelector('#supernatural-pressure').textContent = `${location.pressure} Clue: ${location.clue}`;
      panel.querySelector('#supernatural-complication').textContent = `${complication}. Blacklight concern: ${concern}`;
      panel.querySelector('#supernatural-brief').textContent = brief;
      currentText = brief;
    }
    panel.querySelector('#supernatural-generate').addEventListener('click', generate);
    panel.querySelector('#supernatural-copy').addEventListener('click', async () => {
      if (!currentText) generate();
      try { await navigator.clipboard.writeText(currentText); } catch (_) { /* clipboard can be unavailable */ }
    });
  }

  function initialize() {
    injectStyles();
    buildPanel();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
