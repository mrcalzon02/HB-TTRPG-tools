(() => {
  'use strict';

  const DATA_URL_PART = 'data/blacklight-continuum/wiki/veteran-reintroduction.json';
  const SPEECH_TITLE = "Eva Frost's Financial and Legal Reality Speech";

  const speechBody = [
    'Eva did not begin with myth, power, or victory. She began with accounting. She told the warehouse that Charles had spent years using the digital economy the way he used locked doors, border crossings, medical systems, and transportation networks: as a set of obstacles to be bypassed when a life, a mission, or his private definition of necessity required it.',
    '‘In the past,’ Eva said, ‘Charles has used the digital economy to his advantage. Sometimes that meant routing money through legitimate holdings faster than any human department could approve. Sometimes it meant manufacturing liquidity out of timing, arbitrage, shell ownership, automated market behavior, emergency credit, and systems that were never designed to argue with something like him. Some of you experienced this as miracles. Rent paid. Flights purchased. Medical debt erased. Vehicles acquired. Hotels booked. Accounts repaired. People fed. People hidden. People moved.’',
    'The screens behind her filled with ledgers. Some lines were ordinary: wages, settlements, invoices, medical costs, hazard compensation, property repair, witness-support liability, and travel expenses that looked less like a budget than a weather event. Other lines were labeled provisional, contested, disputed, sovereign review, currency-impact inquiry, or government notice.',
    '‘Several governments noticed,’ Eva continued. ‘Several became very, very angry. Not because every payment was theft in the simple sense. That would have been easier. The greater accusation is that Charles repeatedly acted as though money could be made to appear wherever reality, software, and financial latency allowed it. When a private actor can magic money out of nothing, the rest of the economy still has to absorb the consequence. Inflation, devaluation, currency instability, sanctions exposure, tax liability, banking alarms, procurement fraud, and sovereign anger do not disappear because the original intent was rescue.’',
    'Charles attempted to object from a wall speaker. Eva lifted one finger without looking at him. The speaker went silent. The room learned several things from that gesture, not all of them fiscal.',
    '‘The Company will honor the agreements made to you,’ Eva said. ‘If Charles promised payment, support, housing, treatment, equipment replacement, legal defense, relocation, or recovery, those promises do not vanish because the method by which he intended to satisfy them has become politically, legally, or economically inconvenient. They become debts. Actual fiscal debts. Recorded debts. Debts owed by this organization because the organization is inheriting the obligations created by Charles and Blacklight Intelligence.’',
    'She paused long enough for the word debt to reach the people who had assumed they were standing inside a powerful new institution with infinite money. ‘For clarity, we are not starting clean. We are starting several thousand pounds sterling in debt before ordinary operating expenses, before compliance, before tax review, before settlement negotiation, and before any of you ask whether the cafeteria can stock something better than emergency protein blocks. The cause of that debt is attributable almost entirely to Charles’s boundless intelligence and his historic belief that an impossible solution is preferable to an accountable one.’',
    'Charles said nothing. Eva allowed the silence to remain useful.',
    '‘BlackLight has chosen primary incorporation in England,’ Eva continued. ‘The American branch will incorporate through Delaware, because apparently every American corporate attorney is legally required to say Delaware within the first twelve minutes of a serious conversation. Operationally, that branch will function mainly out of California. Because we are international, because our members cross borders, because our work touches financial systems, medical systems, weapons law, data law, labor law, tax law, immigration law, export controls, supernatural jurisdiction, and ordinary criminal law, we will have a great many rules applying to us at the same time.’',
    'The next screen showed a list long enough that several operatives laughed before realizing it was not a joke.',
    '‘Yes,’ Eva said, ‘this means that most of the time you will go through customs again. You will use normal transportation whenever normal transportation can accomplish the mission without unacceptable loss of life. You will have manifests, visas, licenses, declarations, insurance, payroll records, and people whose entire job is telling Charles no before a treasury department, border authority, tax office, or central bank does it more expensively. We are bound once again by rules and laws. This should not come as a great surprise to many of you. Several of you were present for the actions that made it necessary.’',
    'That was the moment the Company stopped sounding like a supernatural response team with better paperwork and started sounding like an institution that could be sued, audited, sanctioned, fined, regulated, and forced to pay what it owed. The warehouse did not cheer. The warehouse understood.'
  ];

  const speechTable = {
    title: SPEECH_TITLE,
    columns: ['Eva Explains', 'What It Means for the Company'],
    rows: [
      ['Charles used the digital economy as an operational tool', 'Past miracles of payment, travel, housing, medical intervention, and account repair now require accounting rather than admiration.'],
      ['Governments noticed and became angry', 'Financial manipulation can create inflation, devaluation, currency instability, sanctions exposure, banking alarms, tax liability, and sovereign retaliation.'],
      ['Old promises become real debts', 'Payment, treatment, housing, relocation, equipment replacement, legal defense, and recovery promises must be honored as fiscal obligations.'],
      ['The Company starts in debt', 'BlackLight begins several thousand pounds sterling in debt before ordinary operations because Charles created obligations the Company chose to inherit.'],
      ['Primary incorporation is in England', 'The Company accepts English corporate, financial, labor, tax, and compliance realities as a central legal foundation.'],
      ['The American branch incorporates in Delaware and operates mainly from California', 'United States operations carry Delaware corporate structure, California operational reality, federal law, state law, and international compliance pressure.'],
      ['International work means overlapping laws', 'Customs, immigration, export controls, weapons law, medical regulation, data law, tax law, labor law, criminal law, and supernatural jurisdiction can all apply at once.'],
      ['Normal travel returns by default', 'Teleportation, impossible routing, shell credentials, and magic-money logistics are no longer ordinary solutions when customs, visas, manifests, and legal transport can do the job.'],
      ['Charles is no longer allowed to be the whole finance department', 'Someone must be able to tell Charles no before a government, bank, court, or central authority does it by force.']
    ]
  };

  function patchData(data) {
    const entry = (data.entries || []).find(item => item.id === 'company-introduction');
    if (!entry) return data;
    const bodyText = (entry.body || []).join('\n');
    if (!bodyText.includes(SPEECH_TITLE) && !bodyText.includes('Eva did not begin with myth, power, or victory.')) {
      entry.body = [...(entry.body || []), ...speechBody];
    }
    entry.tables = Array.isArray(entry.tables) ? entry.tables : [];
    if (!entry.tables.some(table => table.title === SPEECH_TITLE)) entry.tables.push(speechTable);
    return data;
  }

  function patchStageExpansion() {
    const enhancements = globalThis.BLACKLIGHT_VETERAN_REORIENTATION_ENHANCEMENTS;
    const stage = enhancements?.stageExpansions?.['company-introduction'];
    if (!stage || !Array.isArray(stage.sections)) return;
    const recap = stage.sections.find(section => section.title === 'What This Adds to the Recap');
    if (recap && !recap.text.includes('digital-economy manipulation')) {
      recap.text = 'The Company formalizes a distinction that had never previously existed: the people, the corporate infrastructure, and Charles are related but not identical. Eva also makes the transition brutally material: Charles’s old habit of making money, travel, debt relief, and logistics appear through digital-economy manipulation has created debts, government anger, compliance exposure, and ordinary legal obligations the Company must now inherit.';
    }
    const decision = stage.sections.find(section => section.title === 'What the Character Is Deciding');
    if (decision && !decision.text.includes('customs')) {
      decision.text = 'The character is deciding whether formalization feels like protection, capture, legitimacy, delay, community, fiscal reality, or a cosmetic rewrite of the old system. The speech also asks whether the character accepts that normal law, customs, incorporation, payroll, debts, and transportation rules are now part of the mission environment.';
    }
    const carry = stage.sections.find(section => section.title === 'What Carries Forward');
    if (carry && !carry.text.includes('fiscal and legal process')) {
      carry.text = 'This reaction shapes how much institutional trust the character begins with, which structural promises they require proof of, and how they respond when BlackLight says that obeying ordinary fiscal and legal process is no longer optional.';
    }
  }

  patchStageExpansion();

  const nativeFetch = globalThis.fetch?.bind(globalThis);
  if (!nativeFetch || globalThis.__BLACKLIGHT_EVA_FISCAL_PATCHED__) return;
  globalThis.__BLACKLIGHT_EVA_FISCAL_PATCHED__ = true;

  globalThis.fetch = async (resource, init) => {
    const response = await nativeFetch(resource, init);
    const url = typeof resource === 'string' ? resource : String(resource?.url || '');
    if (!url.includes(DATA_URL_PART)) return response;
    const data = patchData(await response.clone().json());
    return new Response(JSON.stringify(data), {
      status: response.status,
      statusText: response.statusText,
      headers: { 'Content-Type': 'application/json' }
    });
  };
})();
