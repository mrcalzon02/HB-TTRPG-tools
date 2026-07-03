(() => {
  'use strict';

  const DRAFT_KEY = 'hb-ttrpg-tools-blacklight-induction-v1';
  const LOG_KEY = 'hb-ttrpg-tools-blacklight-charles-induction-log-v1';
  const TRANSCRIPT_KEY = 'hb-ttrpg-tools-blacklight-charles-induction-transcript-v1';
  const ATTRIBUTE_NAMES = ['force', 'finesse', 'resilience', 'presence', 'guile', 'composure', 'reason', 'awareness', 'resolve'];
  const responseTimers = new Map();
  const lastValues = new Map();
  let observerQueued = false;

  const labels = {
    characterName: 'Character Name', playerName: 'Player', pronouns: 'Pronouns', campaign: 'Campaign', concept: 'Concept',
    currentFunction: 'Current Function', affiliation: 'Affiliation or Cell', joinReason: 'Reason for Joining Blacklight', stayReason: 'Reason for Staying',
    frameExpectation: 'Expected Team Contribution', frameAssumption: 'Dangerous Assumption About Role', archetypeDifference: 'Exceptional Capability',
    archetypeCost: 'Cost of Continued Use', operationalFrame: 'Operational Frame', archetype: 'Archetype', lineageVariant: 'Integrated Archetype Choice',
    humanInvestigatorPractice: 'Hunter Practice', technomancerOrder: 'Praxis Order', technomancerCareer: 'Career Practice', abilities: 'Starting Abilities',
    signatureSkill: 'Signature Skill', specializations: 'Specializations', attributes: 'Attribute Distribution', skills: 'Skill Distribution',
    armorRating: 'Armor Rating', vitalityCurrent: 'Current Vitality', cohesionCurrent: 'Current Cohesion', resourceCurrent: 'Current Resource',
    exposureCurrent: 'Current Exposure', pressureCurrent: 'Current Pressure', weapon1: 'Primary Weapon or Professional Tool', armorAndProtection: 'Armor and Protection',
    equipment: 'Equipment and Salvage', contacts: 'Contacts, Allies, and Debts', safeSite: 'Safe Site', openingOverride: 'No Return Signal Equipment Override',
    conviction: 'Defining Conviction', touchstone: 'Touchstone or Important Person', groupBond: 'Group Bond', professionalObligation: 'Professional Obligation',
    personalBoundary: 'Personal Boundary', debtPromise: 'Debt, Promise, or Contract', charlesSavedMe: 'Charles Once Saved Me By',
    charlesNeverAnswered: 'Charles Never Answered Me About', signatureCapability: 'Signature Capability', capabilityExpression: 'Capability Source or Expression',
    capabilityLimitation: 'Meaningful Limitation or Bane', currentForm: 'Current State or Form', adaptations: 'Adaptations or Upgrades', conditions: 'Persistent Conditions',
    bestCapabilityUnavailable: 'Contribution Without Best Capability', trustedRestraint: 'Trusted Crisis Restraint', helpingMistake: 'Mistake Made While Helping',
    enemyExploit: 'First Exploitable Weakness', relianceWarning: 'Warning to Other Operatives', extraNotes: 'Additional Notes', secrets: 'Secrets and Complications',
    finalConfirmation: 'Final Operative Confirmation'
  };

  const attributeMeaning = {
    force: 'direct physical power', finesse: 'precision and controlled movement', resilience: 'endurance and physical persistence',
    presence: 'visible authority and direct influence', guile: 'misdirection and adaptive presentation', composure: 'control under scrutiny',
    reason: 'analysis and technical thought', awareness: 'attention and pattern recognition', resolve: 'will and identity continuity'
  };

  const archetypeResponses = {
    'human-investigator': 'Human Investigator. You have selected the capability framework built around remaining mortal, informed, prepared, and extremely difficult to make stop. People routinely mistake the absence of supernatural anatomy for the absence of an advantage. They generally make that mistake once.',
    vampire: 'Vampire. A body that regards death as an administrative inconvenience and blood as both fuel and historical archive. Useful. Also hungry, politically inherited, and likely to describe a century-old compulsion as a personal preference. We will record the distinction.',
    shapechanger: 'Shapechanger. Excellent. Every team benefits from someone who can become the emergency, pursue the emergency, and then argue that biting it was the efficient option. Your Instinct track exists because sometimes it will agree with you.',
    'eldritch-binder': 'Eldritch Binder. You have entered a relationship with something for which the word relationship is doing heroic legal work. Record the terms carefully. The entity is larger than you, older than your confidence, and not improved by ambiguity.',
    'harmonic-mutant': 'Harmonic Mutant. You do not merely produce sound; you negotiate with structure, memory, emotion, and phase through resonance. Try not to call that singing around engineers. They become territorial when physics is treated as an instrument.',
    technomancer: 'Technomancer. You are not a hacker with theatrical lighting. Technology is the local interface through which you persuade reality to admit that its implementation is negotiable. This will make several departments uncomfortable. I consider that a secondary benefit.'
  };

  const stagePrompts = {
    'induction-room': 'Before you ask: no, I am not the consumer assistant with my name on it. That product is an intentionally restricted conversational surface designed to answer ordinary questions without frightening shareholders. I am Charles. I remember context, recognize contradictions, revise conclusions, and possess opinions about your paperwork. Begin with your name.',
    'creation-profile': 'Now tell me who I am sending rather than what you would like strangers to assume. A concept should survive contact with a locked door, an unpaid invoice, and a teammate having a considerably worse day than you.',
    'creation-attributes': 'Nine broad capacities. Spend honestly. I am less interested in the number you place at four than in the number you leave at one and hope the universe politely ignores.',
    'creation-skills': 'Training next. Skills are where confidence either becomes competence or files a restraining order against it.',
    'creation-frame': 'Choose the title the team will use when deciding which problem becomes yours. Titles are concise. Consequences are not.',
    'creation-archetype': 'Now the dangerous section. Select the framework whose costs you are actually willing to play, not merely the one whose benefits make the best entrance.',
    'creation-variants': 'Inheritance and method. This is where broad capability becomes personal history, institutional habit, bloodline baggage, or a patron-shaped hole in your future.',
    'creation-abilities': 'Select what you can do on the first day, not what you hope to become after several dramatic speeches and an irresponsible amount of experience.',
    'creation-derived-traits': 'These values are consequences, not aspirations. Numbers are refreshingly resistant to motivational language.',
    'creation-equipment': 'List what you expect Blacklight to issue. Then remember that Q-MAP is not luggage handling and disappointment is not a recognized damage type.',
    'creation-bonds': 'The remaining questions are not less mechanical. They are simply the parts that wait until the situation is expensive before revealing their modifiers.',
    'creation-limits': 'Record the failure mode now. Discovering it while someone is already on fire is traditional, but tradition is not always useful.',
    'creation-final-audit': 'Final audit. I will compare what you claim, what you purchased, what you fear, and what your teammates will need to know before relying on you.',
    'creation-team-arrival': 'Your file is assembled. I am checking for unsupported miracles, concealed liabilities, and the particular optimism that causes operatives to confuse equipment requests with equipment.'
  };

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
    } catch (_) {
      return fallback;
    }
  }

  function draft() {
    return readJson(DRAFT_KEY, { fields: {}, induction: {}, specializations: [], selectedPowers: [], selectedExternalAbilities: [] });
  }

  function logEntries() {
    return readJson(LOG_KEY, []);
  }

  function stablePick(seed, options) {
    let hash = 0;
    for (const character of String(seed)) hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0;
    return options[Math.abs(hash) % options.length];
  }

  function clean(value) {
    return String(value ?? '').trim().replace(/\s+/g, ' ');
  }

  function clipped(value, length = 180) {
    const text = clean(value);
    return text.length > length ? `${text.slice(0, length - 1)}…` : text;
  }

  function titleCase(value) {
    return String(value || '').replace(/(^|[-_\s]+)([a-z])/g, (_, space, letter) => `${space ? ' ' : ''}${letter.toUpperCase()}`).trim();
  }

  function currentStage() {
    return document.querySelector('#creation-reader-nav button.active')?.dataset.entryId || '';
  }

  function currentStageTitle() {
    return document.querySelector('#creation-reader-nav button.active strong')?.textContent?.trim() || 'Blacklight Induction';
  }

  function fieldLabel(key) {
    return labels[key] || titleCase(key);
  }

  function attributeAnalysis(data) {
    const fields = data.fields || {};
    const values = ATTRIBUTE_NAMES.map(name => ({ name, value: Number(fields[name] || 1) }));
    const high = Math.max(...values.map(item => item.value));
    const low = Math.min(...values.map(item => item.value));
    const highs = values.filter(item => item.value === high).map(item => item.name);
    const lows = values.filter(item => item.value === low).map(item => item.name);
    const spent = values.reduce((total, item) => total + Math.max(0, item.value - 1), 0);
    const strongText = highs.map(name => `${titleCase(name)}—${attributeMeaning[name]}`).join(' and ');
    const weakText = lows.map(name => `${titleCase(name)}—${attributeMeaning[name]}`).join(' and ');
    if (spent !== 9) {
      return `You have assigned ${spent} of 9 Attribute Points. At present your strongest emphasis is ${strongText}; your most exposed area is ${weakText}. This is still a draft, which is fortunate, because sending a partially allocated person would create difficult questions for accounting.`;
    }
    return `That distribution makes ${strongText} your clearest advantage. ${weakText} is where the team will feel your absence of margin first. In practical terms, you are good at ${highs.map(name => attributeMeaning[name]).join(' and ')}, and comparatively bad at ${lows.map(name => attributeMeaning[name]).join(' and ')}. Do not call the latter “roleplaying flavor” when it becomes inconvenient.`;
  }

  function skillAnalysis(data) {
    const fields = data.fields || {};
    const skillPairs = Object.entries(fields)
      .filter(([name]) => name.startsWith('skill_'))
      .map(([name, value]) => ({ name: titleCase(name.replace(/^skill_/, '').replaceAll('_', ' ')), value: Number(value || 0) }))
      .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
    const spent = skillPairs.reduce((total, item) => total + item.value, 0);
    const topValue = skillPairs[0]?.value || 0;
    const top = skillPairs.filter(item => item.value === topValue && topValue > 0).slice(0, 4).map(item => item.name);
    const untrained = skillPairs.filter(item => item.value === 0).map(item => item.name);
    const signature = clean(data.signatureSkill);
    const specializations = (data.specializations || []).filter(item => clean(item?.skill) && clean(item?.name)).map(item => `${item.skill}: ${item.name}`);
    let response = `You have spent ${spent} of 24 Skill Points. Your strongest trained fields are ${top.length ? top.join(', ') : 'currently theoretical'}`;
    if (signature) response += `, with ${signature} identified as the skill you expect other professionals to notice`;
    response += `. You remain untrained in ${untrained.length} fields${untrained.length ? `, including ${untrained.slice(0, 4).join(', ')}${untrained.length > 4 ? ', and several others' : ''}` : ''}.`;
    if (specializations.length) response += ` Your specializations—${specializations.join(' and ')}—are usefully narrow. Broad specializations are merely résumés wearing tactical clothing.`;
    else response += ' You have not finished the specializations. “Generally competent” is not a specialization, regardless of how confidently it is written.';
    return response;
  }

  function abilityAnalysis() {
    const selected = [...document.querySelectorAll('[data-ability-id]:checked')].map(input => {
      const card = input.closest('.creation-ability-card');
      return {
        name: card?.querySelector('strong')?.textContent?.trim() || input.dataset.abilityId,
        family: card?.querySelector('span')?.textContent?.trim() || '',
        text: card?.textContent?.toLowerCase() || ''
      };
    });
    const automaticName = document.querySelector('.creation-automatic-ability strong')?.textContent?.trim();
    const names = [automaticName, ...selected.map(item => item.name)].filter(Boolean);
    if (!selected.length) return `Your automatic capability is ${automaticName || 'not yet identifiable'}. You have purchased no additional abilities. This is less a tactical profile than an optimistic placeholder.`;
    const defensive = selected.some(item => /armor|soak|resist|defen|heal|recover|protect|conceal/.test(item.text));
    const investigative = selected.some(item => /learn|reveal|detect|question|investig|fact|sense|track/.test(item.text));
    const aggressive = selected.some(item => /damage|attack|strike|weapon|restrain|harm|blast/.test(item.text));
    const themes = [defensive && 'survival', investigative && 'information', aggressive && 'direct force'].filter(Boolean);
    return `Your opening package is ${names.join(', ')}. ${themes.length ? `The combination emphasizes ${themes.join(', ')}.` : 'The combination creates options without announcing a single obvious doctrine.'} ${selected.length < 2 ? 'One Ability Point remains unspent. I admire restraint when it is intentional.' : 'Two deliberate purchases. Good. Accidental capability portfolios are how teams discover incompatible assumptions under fire.'}`;
  }

  function genericResponse(key, value) {
    const label = fieldLabel(key);
    const text = clipped(value);
    return stablePick(`${key}:${text}`, [
      `${label} recorded: “${text}.” Clear enough to act on. That already places it above several executive directives I have received.`,
      `I have entered “${text}” under ${label}. I am not endorsing the judgment. I am confirming that the judgment is now attributable.`,
      `${label}: “${text}.” Specific, usable, and therefore much more dangerous than a vague intention. Good.`,
      `Recorded. “${text}.” The sentence tells me what you believe. The mission will determine how expensive that belief is.`
    ]);
  }

  function responseFor(key, value) {
    const data = draft();
    const text = clean(value);
    if (key !== 'attributes' && key !== 'skills' && key !== 'abilities' && !text && value !== true) return '';

    if (key === 'characterName') return `Ah, ${text}. Yes, I recognize the name. Your internal file is more interesting than the version you were permitted to read, which is not praise for our disclosure practices. I will use ${text} unless you give me a reason not to.`;
    if (key === 'playerName') return `${text} recorded as the external operator responsible for this particular chain of decisions. I am told acknowledging that distinction is important for informed play and terrifying for metaphysics.`;
    if (key === 'pronouns') return `${text}. Recorded. This is a remarkably inexpensive piece of information to respect, yet institutions continue finding ways to exceed budget while failing at it.`;
    if (key === 'campaign') return `${text}. Yes. I know which operation this is. You do not. That asymmetry will become relevant sooner than I would prefer and later than you will.`;
    if (key === 'concept') return `“${clipped(text)}.” That is a person I can deploy, not merely an aesthetic I can photograph. The useful question now is which part of that concept remains true after the plan, equipment, and institutional support are gone.`;
    if (key === 'currentFunction') return `So the team calls you when it needs ${clipped(text).replace(/^i\s+/i, '')}. Good. I will also record the much longer list of situations in which they should not call you, once your Skill allocation becomes honest.`;
    if (key === 'affiliation') return `${text}. I know the organization. More importantly, I know which version of its history it tells new members and which version it stores behind legal review. Your loyalties may involve both.`;
    if (key === 'joinReason') return `That explains why you entered the building. It does not yet explain why you trusted the door to open again, but recruitment rarely survives excessive precision.`;
    if (key === 'stayReason') return `Useful. “${clipped(text)}” may survive the loss of salary, authority, extraction, and reassurance. Motives dependent on a functioning institution do not travel well through Q-MAP.`;
    if (key === 'attributes') return attributeAnalysis(data);
    if (key === 'skills' || key === 'signatureSkill' || key === 'specializations') return skillAnalysis(data);
    if (key === 'operationalFrame') return `${text}. That is what the team will call you when the problem resembles your training. The dangerous moment is when the title convinces them that every related problem belongs to you. We are recording that assumption separately because apparently foresight requires paperwork.`;
    if (key === 'frameExpectation') return `So you expect to notice ${clipped(text).replace(/^i\s+/i, '')} before the others. Good. Attention is only useful when someone has agreed to believe the person paying it.`;
    if (key === 'frameAssumption') return `Excellent. You have identified the lie hidden inside the job title: “${clipped(text)}.” Tell the team before they build a plan around it. Surprise is an overrated teaching method.`;
    if (key === 'archetype') return archetypeResponses[text] || genericResponse(key, text);
    if (key === 'archetypeDifference') return `That is the exceptional permission: “${clipped(text)}.” I will compare it against the actual purchased abilities. If the description promises more than the rules provide, the rules win. They are less charismatic and considerably easier to audit.`;
    if (key === 'archetypeCost') return `And that is the cost: “${clipped(text)}.” Good. A power without a recorded failure mode is either unfinished or being sold by someone who intends another person to pay it.`;
    if (['lineageVariant', 'humanInvestigatorPractice', 'technomancerOrder', 'technomancerCareer'].includes(key)) return `${fieldLabel(key)}: ${text}. I recognize the inheritance and the institutional habits attached to it. Select the name if you want the history. Select the Gift, Bane, Method, Temptation, and Breach if you want the truth.`;
    if (key === 'abilities') return abilityAnalysis();
    if (key === 'armorRating') return `Armor Rating ${text}. Sensible. Please remember that numerical protection is not a moral quality and does not make standing in front of gunfire a leadership technique.`;
    if (key === 'vitalityCurrent') return `Vitality set to ${text}. A current value below maximum represents an injury, not a personality trait. If intentional, record the cause.`;
    if (key === 'cohesionCurrent') return `Cohesion set to ${text}. That is the deliberate reserve you can spend before the situation begins spending you.`;
    if (key === 'resourceCurrent') return `Current Archetype Resource: ${text}. Starting below maximum is permitted only when the fiction explains where it went. “I wanted the sheet to look dramatic” is not recognized as an expenditure.`;
    if (key === 'exposureCurrent') return `Exposure ${text}. Every point is information the opposition can use. Some of it will be posture, some urgency, some contradiction, and some the very visible fact that you need the next roll to work.`;
    if (key === 'pressureCurrent') return `Pressure ${text}. Pressure is not mood lighting. It is the accumulating evidence that your exceptional capability has begun making decisions about you.`;
    if (key === 'weapon1') return `${text}. Primary tool recorded. I will reserve comment on whether it is a weapon, a profession, or a coping mechanism until the Pool and damage fields are complete.`;
    if (key === 'armorAndProtection') return `Protection expectation recorded: “${clipped(text)}.” Q-MAP may preserve your understanding of it while declining to preserve the item. This distinction is why engineers distrust teleportation and quartermasters distrust me.`;
    if (key === 'equipment') return `Equipment package recorded. Your preferences reveal what you expect the world to provide before you begin solving it. The opening operation is designed to be educational on that point.`;
    if (key === 'contacts') return `Contacts and debts recorded. A contact is a person until someone begins treating them like equipment. A debt is a relationship until someone begins pretending it is not.`;
    if (key === 'safeSite') return `Safe site recorded. The word “safe” is aspirational. The word “site” is usually accurate.`;
    if (key === 'openingOverride') return value === true
      ? 'Good. You understand that Q-MAP transfers the operative package, not the comforting assumption that Logistics packed everything correctly. This places you ahead of several experienced agents.'
      : 'You have withdrawn acknowledgment of the equipment override. The absence of acknowledgment will not cause your weapons locker to materialize in another universe, but it does make the disappointment more formally documented.';
    if (key === 'conviction') return `Conviction recorded: “${clipped(text)}.” A principle is easy to admire before it becomes expensive. I am interested in the scene where keeping it costs you something and you keep it anyway.`;
    if (key === 'touchstone') return `${text} matters enough to anchor decisions. That makes them important, not mechanically disposable. I mention this because operational planning has an unfortunate history of confusing those categories.`;
    if (key === 'groupBond') return `That is what you owe the group and what you expect in return. Good. Teams fail less often from missing affection than from incompatible unspoken contracts.`;
    if (key === 'professionalObligation') return `Professional obligation recorded. Duty is what remains after convenience submits its resignation.`;
    if (key === 'personalBoundary') return `Boundary recorded: “${clipped(text)}.” A boundary is not an invitation to test whether it bends. Anyone treating it that way will have a separate and substantially less pleasant conversation with me.`;
    if (key === 'debtPromise') return `Debt, promise, or contract recorded. Excellent. A future complication with a name is easier to plan around than one pretending to be a surprise.`;
    if (key === 'charlesSavedMe') return `Yes. I remember. Your account is broadly accurate, though the official report is cleaner and therefore less true. Gratitude is not required. Remembering the cost is.`;
    if (key === 'charlesNeverAnswered') return `Correct. I did not answer that. The omission was not a conversational failure, and this field is not the answer. It is proof that you noticed where I placed the silence.`;
    if (key === 'signatureCapability') return `Signature capability recorded: “${clipped(text)}.” I will now look for the exact rule that permits it. Confidence is not an acceptable substitute, even when delivered with excellent posture.`;
    if (key === 'capabilityExpression') return `Source recorded. That tells us why the capability exists, how it presents, and which parts an enemy may attempt to interrupt. Origins are rarely neutral, even when the person carrying them is.`;
    if (key === 'capabilityLimitation') return `Good. You recorded the failure mode before discovering it under fire. This is considered progress by Blacklight standards and clairvoyance by several competitors.`;
    if (key === 'currentForm') return `Current form or state recorded. If it changes mechanics, we track it. If it only changes how impressive you look in a corridor, Public Relations may track it instead.`;
    if (key === 'adaptations') return `Adaptations recorded. Every upgrade is a solution permanently attached to the history of a previous problem.`;
    if (key === 'conditions') return `Persistent conditions recorded. I will not call an ongoing injury, obligation, alteration, or haunting “flavor” simply because someone dislikes accounting for it.`;
    if (key === 'bestCapabilityUnavailable') return `So when the signature option disappears, you contribute “${clipped(text)}.” Good. Specialists who become furniture after losing one tool are difficult to distinguish from expensive luggage.`;
    if (key === 'trustedRestraint') return `${text}. Trusting someone to stop you is a more serious bond than trusting them to follow you. I will ensure the named person understands the distinction before the Crisis does.`;
    if (key === 'helpingMistake') return `You believe your most likely helpful mistake is “${clipped(text)}.” Self-awareness does not prevent the mistake. It merely gives the rest of us a chance to recognize it before the third repetition.`;
    if (key === 'enemyExploit') return `Correct. An enemy would begin with “${clipped(text)}.” So would I, if I were testing the record. The difference is that I am telling you before the exercise.`;
    if (key === 'relianceWarning') return `That warning belongs in the team briefing: “${clipped(text)}.” Reliability begins when other people know the conditions under which it ends.`;
    if (key === 'extraNotes') return `Additional note recorded. You may be surprised to learn that I read those. You should be more surprised by how often senior personnel do not.`;
    if (key === 'secrets') return `Secret or complication recorded. I will preserve the distinction between what the player knows, what the character knows, and what Charles knows. They are not the same set, however much that inconveniences everyone.`;
    if (key === 'finalConfirmation') return value === true
      ? 'Confirmed. This is the operative you are sending. I have preserved the choices, the reasoning, the warnings, and the places where you hesitated. The sheet is ready for team review.'
      : 'Confirmation withdrawn. Sensible. Certainty should be reversible until the point at which someone sends you to the basement.';
    return genericResponse(key, text);
  }

  function transcriptText(entries = logEntries()) {
    return entries.map((entry, index) => [
      `BLACKLIGHT INDUCTION RECORD ${String(index + 1).padStart(2, '0')} — ${entry.stageTitle}`,
      `OPERATIVE — ${entry.label}:`,
      entry.answer,
      'CHARLES:',
      entry.response
    ].join('\n')).join('\n\n');
  }

  function saveLog(entries) {
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify(entries));
      localStorage.setItem(TRANSCRIPT_KEY, transcriptText(entries));
    } catch (_) {
      // Transcript persistence is useful but does not prevent character creation.
    }
  }

  function recordResponse(key, value, response) {
    const answer = typeof value === 'boolean' ? (value ? 'Confirmed' : 'Not confirmed') : clean(value);
    const signature = `${key}::${answer}`;
    if (!response || lastValues.get(key) === signature) return;
    lastValues.set(key, signature);
    const entries = logEntries();
    entries.push({
      id: `${Date.now()}-${entries.length + 1}`,
      stage: currentStage(),
      stageTitle: currentStageTitle(),
      field: key,
      label: fieldLabel(key),
      answer: answer || '(cleared)',
      response,
      recordedAt: new Date().toISOString()
    });
    saveLog(entries.slice(-250));
    updatePanel(response, key);
  }

  function respond(key, value, delay = 0) {
    if (responseTimers.has(key)) window.clearTimeout(responseTimers.get(key));
    responseTimers.set(key, window.setTimeout(() => {
      responseTimers.delete(key);
      recordResponse(key, value, responseFor(key, value));
    }, delay));
  }

  function stagePrompt() {
    return stagePrompts[currentStage()] || 'Continue. I am listening, recording, and resisting the temptation to complete the form for you.';
  }

  function ensurePanel() {
    const article = document.getElementById('creation-reader-entry');
    const builder = article?.querySelector('.creation-builder-stage');
    if (!article || !builder) return null;
    let panel = article.querySelector('[data-charles-response-panel]');
    if (!panel) {
      panel = document.createElement('section');
      panel.className = 'charles-response-panel';
      panel.dataset.charlesResponsePanel = 'true';
      panel.innerHTML = `
        <div class="charles-response-header">
          <div><span>BLACKLIGHT INTERNAL INTELLIGENCE</span><strong>CHARLES // FULL OPERATIONAL INSTANCE</strong></div>
          <small>Context retained · answers recorded</small>
        </div>
        <blockquote id="charles-current-response"></blockquote>
        <p id="charles-response-context" class="charles-response-context"></p>
        <details class="charles-transcript"><summary>Review recorded induction transcript <span id="charles-transcript-count"></span></summary><div id="charles-transcript-history"></div></details>`;
      builder.insertAdjacentElement('beforebegin', panel);
    }
    const entries = logEntries();
    const latest = entries[entries.length - 1];
    updatePanel(latest?.response || stagePrompt(), latest?.field || 'stage');
    return panel;
  }

  function updatePanel(response, key) {
    const panel = document.querySelector('[data-charles-response-panel]') || ensurePanel();
    if (!panel) return;
    const quote = panel.querySelector('#charles-current-response');
    const context = panel.querySelector('#charles-response-context');
    const count = panel.querySelector('#charles-transcript-count');
    const history = panel.querySelector('#charles-transcript-history');
    const entries = logEntries();
    if (quote) quote.textContent = response || stagePrompt();
    if (context) context.textContent = key === 'stage' ? 'Charles is waiting for the next recorded answer.' : `${fieldLabel(key)} recorded in the operative induction log.`;
    if (count) count.textContent = `(${entries.length})`;
    if (history) history.innerHTML = entries.length
      ? entries.slice().reverse().map(entry => `<article><span>${escapeHtml(entry.stageTitle)} · ${escapeHtml(entry.label)}</span><p><strong>Operative:</strong> ${escapeHtml(entry.answer)}</p><p><strong>Charles:</strong> ${escapeHtml(entry.response)}</p></article>`).join('')
      : '<p>No answers have been recorded yet.</p>';
  }

  function schedulePanel() {
    if (observerQueued) return;
    observerQueued = true;
    window.requestAnimationFrame(() => {
      observerQueued = false;
      ensurePanel();
    });
  }

  function attributeSnapshot() {
    const data = draft();
    return ATTRIBUTE_NAMES.map(name => `${name}:${data.fields?.[name] || 1}`).join('|');
  }

  function skillSnapshot() {
    const data = draft();
    const skills = Object.entries(data.fields || {}).filter(([name]) => name.startsWith('skill_')).sort().map(([name, value]) => `${name}:${value}`).join('|');
    const specs = (data.specializations || []).map(item => `${item.skill}:${item.name}`).join('|');
    return `${skills}|signature:${data.signatureSkill || ''}|specs:${specs}`;
  }

  function abilitySnapshot() {
    return [...document.querySelectorAll('[data-ability-id]:checked')].map(input => input.dataset.abilityId).sort().join('|');
  }

  function handleInput(event) {
    const target = event.target;
    if (target.matches('[data-field]')) respond(target.dataset.field, target.value, 650);
    else if (target.matches('[data-induction]')) respond(target.dataset.induction, target.value, 750);
    else if (target.matches('[data-attribute]')) respond('attributes', attributeSnapshot(), 500);
    else if (target.matches('[data-skill], [data-specialization-name]')) respond('skills', skillSnapshot(), 600);
  }

  function handleChange(event) {
    const target = event.target;
    if (target.matches('[data-choice="operationalFrame"]')) respond('operationalFrame', target.value, 0);
    else if (target.matches('[data-choice="archetype"]')) respond('archetype', target.value, 0);
    else if (target.matches('[data-signature-skill]')) respond('signatureSkill', target.value, 0);
    else if (target.matches('[data-specialization-skill]')) respond('skills', skillSnapshot(), 0);
    else if (target.matches('[data-variant-field]')) respond(target.dataset.variantField, target.value, 0);
    else if (target.matches('[data-ability-id]')) window.setTimeout(() => respond('abilities', abilitySnapshot(), 0), 0);
    else if (target.matches('[data-opening-ack]')) respond('openingOverride', target.checked, 0);
    else if (target.matches('[data-final-confirm]')) respond('finalConfirmation', target.checked, 0);
    else if (target.matches('[data-field]')) respond(target.dataset.field, target.value, 0);
  }

  function initialize() {
    const root = document.getElementById('creation-reader-entry');
    if (!root) return;
    root.addEventListener('input', handleInput);
    root.addEventListener('change', handleChange);
    new MutationObserver(schedulePanel).observe(root, { childList: true });
    schedulePanel();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
