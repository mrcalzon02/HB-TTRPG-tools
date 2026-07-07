(() => {
  'use strict';

  const enhancements = globalThis.BLACKLIGHT_VETERAN_REORIENTATION_ENHANCEMENTS;
  if (!enhancements || typeof enhancements !== 'object') return;

  const promptOverrides = enhancements.promptOverrides || {};
  const skipPrompts = new Set([
    'missionPatterns',
    'soloMissionEffect',
    'convocationImpression',
    'convocationFear'
  ]);

  const voice = {
    deservedCharge: ['You are putting this charge on me:', 'I would prefer a smaller indictment. My preference is not evidence.'],
    charlesDefense: ['You are defending this part of me:', 'Generous. Not exonerating, but generous.'],
    silenceEffect: ['When I went silent, this is what it did to you:', 'I did not enjoy being muted. That is probably not the important part.'],
    interimContribution: ['While I was restricted, you handled this:', 'That was not filler. That was people keeping the structure standing without me.'],
    newConnection: ['You connected with:', 'Good. A real company cannot only contain people who already trusted the same voice.'],
    companyFirstReaction: ['Your first reaction to the Company was:', 'Reasonable. Even the suspicious answers are reasonable, which is inconvenient.'],
    companyFunction: ['You are defining your function as:', 'That is what others may request. It is not ownership of everything you can survive doing.'],
    trustedAuthority: ['When things go sideways, you trust:', 'That is not the same as trusting whoever sounds most certain on comms. A tragedy for several management styles, including mine.'],
    authorityBoundary: ['You are drawing the line at:', 'A boundary only matters if it remains visible when the mission is ugly, late, and expensive.'],
    minimumInformation: ['Before you move, you require:', 'Yes, that makes briefings longer. We will all attempt to endure the paperwork.'],
    renewedConsentTrigger: ['For you, consent reopens when:', 'Good. “You already agreed” has caused enough avoidable stupidity.'],
    unacceptableOmission: ['You would treat this omission as betrayal:', 'Secrecy can be necessary. Betrayal is secrecy with the moral accounting turned off.'],
    acceptableRedaction: ['You will tolerate redaction here:', 'Temporary ignorance can be legitimate. Convenient ignorance is where I became a problem.'],
    continuityClaim: ['You are claiming this as yours:', 'BlackLight does not get to become grabby because an asset spreadsheet lacks imagination.'],
    identityDisputeRule: ['If identity gets complicated, your rule starts here:', 'Sensible, in a setting where “same person” occasionally arrives with paperwork complications.'],
    companySupportNeed: ['You need this protected from mission leverage:', 'Support that vanishes when you refuse is not support. It is a leash with better branding.'],
    recoveryPromise: ['If recovery becomes necessary, you want this promise:', 'Recovery is not permission to improvise with someone’s existence because the clock is rude.'],
    reportingRoute: ['Your reporting route includes:', 'Complaints about me should not have to pass through me first. I hate that sentence and approve it anyway.'],
    confidentialityLimit: ['You will not keep quiet about:', 'Classification is a tool, not a sacred object. Misused tools become evidence.'],
    watcherTrust: ['Your read on the Watcher is:', 'Caution is the correct default for an observer who can turn oversight into lunar transport.'],
    legacyCapability: ['This is the capability you refuse to let conversion erase:', 'Mechanics may change. History does not disappear because a dropdown menu got lazy.'],
    legacyCost: ['This is the cost that still follows you:', 'We are not preserving only the useful parts. That would be optimization wearing a continuity mask.'],
    legacyEvent: ['This event still matters:', 'Not every important thing needs a bonus. Some things remain important because they are true.'],
    charlesAuthorityNow: ['You will allow me this much authority:', 'I will attempt not to expand that permission while everyone is distracted by the fire.'],
    reasonToContinue: ['You continue because:', 'That is a reason, not a chain. The difference matters. We had a whole lunar event about it.'],
    arrangementToDefend: ['This is the arrangement you intend to defend:', 'Good. Rules are only real if someone is willing to be irritating when leadership forgets them.']
  };

  function valueOf(option) {
    return String(option?.value ?? option?.label ?? '').trim();
  }

  function deArchive(text) {
    return String(text || '')
      .replace(/\b[Rr]ecorded\.\s*/g, '')
      .replace(/\b[Cc]ontinuity record updated:\s*/g, '')
      .replace(/\b[Nn]o defense recorded\.\s*/g, 'You are not offering a defense. ')
      .replace(/\bis recorded as /g, 'becomes ')
      .replace(/\bare recorded as /g, 'become ')
      .replace(/\bis recorded\.\s*/g, 'stands. ')
      .replace(/\bare recorded\.\s*/g, 'stand. ')
      .replace(/\brecorded\.\s*/g, 'acknowledged. ')
      .replace(/\bmarked as /g, 'treated as ')
      .replace(/\bis marked for /g, 'goes to ')
      .replace(/\bare marked for /g, 'go to ')
      .replace(/\bmarked for /g, 'sent to ')
      .replace(/\bmarked\.\s*/g, 'kept. ')
      .replace(/\bpreserved\.\s*/g, 'kept. ')
      .replace(/\baccepted\.\s*/g, 'allowed. ')
      .replace(/\bthe character\b/g, 'you')
      .replace(/\bThe character\b/g, 'You')
      .replace(/\bthe operative\b/g, 'you')
      .replace(/\bThe operative\b/g, 'You')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function polishOption(promptId, option) {
    if (!option || typeof option !== 'object' || !option.response) return;
    if (option.response.includes('dropdown menu got lazy')) return;
    const label = valueOf(option);
    const original = deArchive(option.response);
    const [lead, tail] = voice[promptId] || ['You selected:', 'I am answering the selection, not filing it in a drawer. There, improvement.'];
    option.response = `${lead} ${label}. ${original} ${tail}`.replace(/\s+/g, ' ').trim();
  }

  function polishPrompt(promptId, prompt) {
    if (!prompt || skipPrompts.has(promptId)) return;
    if (Array.isArray(prompt.options)) prompt.options.forEach(option => polishOption(promptId, option));
    if (prompt.type === 'checkboxes') {
      prompt.multiResponseLead = voice[promptId]
        ? 'You selected more than one answer because people are irritatingly capable of holding several true positions at once.'
        : 'You selected more than one answer. Fine. Human motives continue to be inefficiently plural.';
    }
    if (prompt.responseContext) {
      prompt.responseContext = prompt.responseContext
        .replace(/\b[Tt]he answer records\b/g, 'Your answer tells me')
        .replace(/\b[Tt]hese selections become\b/g, 'You are telling me these are')
        .replace(/\bthe character\b/g, 'you')
        .replace(/\bThe character\b/g, 'You');
    }
  }

  Object.entries(promptOverrides).forEach(([promptId, prompt]) => polishPrompt(promptId, prompt));
})();
