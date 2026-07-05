(() => {
  'use strict';

  const DATA_URL_PART = 'data/blacklight-continuum/wiki/veteran-reintroduction.json';

  // Canonical Charles dialogue restored from the source document "Blacklight shines".
  // Future edits and expanded stage bodies should quote these constants instead of inventing replacement Charles lines.
  const SOURCE_CHARLES_SPEECH = Object.freeze({
    holdOn: 'Hold on for a second.',
    followOutside: 'I need all of you to follow me outside please. There\'s a very important meeting that all of us need to go to. If you are here in this crowd it means that you are in some way important or involved in what I have been doing on this planet over the past few years or are vital to what is about to occur. If this is your first visit to a grouping such as this remain calm, everything will be explained shortly. In the meantime follow me.',
    nonlinearMover: 'It\'s a nonlinear prime mover, a standard Q locked estranged particle matrices with gravitationally isolated inertia fields. It actually belongs to Watcher.',
    neutralMeeting: 'We\'re going to a meeting in a neutral place, a meeting to which the peanut gallery does not get to comment, but various attendees have demanded your presence. Now the changes here are going to be small for now. All I need you to do stand there, do nothing, and stay inside the cube. Inside the cube are provided atmosphere and gravity. And you are shielded from inertia. Stick bits outside the cube and say hello to friction! I cannot stress how important it is during the next few minutes that you stay standing inside the cube. I know some of you who possess the abilities to survive sudden abrupt encounters with whatever you would experience outside the cube. I don\'t need you to prove that right now. Right now I need you to stay inside the cube.',
    frictionAside: 'I don\'t experience friction. I\'d be fine, yes, but you would experience the loss of air.',
    spaceWarning: 'I know some of you could survive the airlessness of space all on your own, but I don\'t need you to prove that right now. I just need you to stay inside the cube!',
    foodFacilities: 'Yes, yes! I will be providing food and facilities inside the cube. You will be able to relieve yourselves and have access to food that I will provide. Yes, there will be barbecue. No, I\'m not making you jambalaya. You can make it yourself!',
    lookRepentant: 'Look at the pulsing light in the middle of the gathering and look sad and look repentant. No I\'m serious, look sad and repentant now. Your lives depend on it. The gathered beings here could kill all of you right now and there would be nothing I could do to stop them. *Nothing*.',
    postMeeting: 'The meeting you just attended was a meeting of Eternals, Solars, various Eldrich sources, and other immensely powerful beings. And yes one of them was indeed a dragon, and yes one of them was indeed a representative of the Eldershogoth known as Cthulhu, and yes that was Cain, and yes those were the kings and queens of the Seely and Unseely courts. Yes there are other entities like Watcher whose jobs are to watch other entities like yourselves. Many of these forces are immutable, permanent, distinct, with abilities to shape reality itself in ways that even Charles cannot comprehend.',
    awayForAWhile: 'I am going to have to go away for a while. As soon as I am done talking to the people I have to talk to, I am going to have to handle some things. That means I am going to be busy for a time, and I would advise you to stay somewhere near the warehouse if you can.',
    changesComing: 'The changes coming are large. They are difficult changes. They are things that are going to need handling, things that are going to need more effort than we are used to putting into them. None of the effort we have exerted to this point has been wasted. None of it was useless. Everything was valuable.',
    makeRight: 'When I get back, I will do my best to make right on every promise I have made.',
    voluntaryExit: 'You may disperse and be called upon later. Your participation from this point forward is purely voluntary. You may leave or continue on as you desire. If you no longer wish to participate in my requests of you, I will honor that commitment and any previous promises I have made to pay you for your services provided to this point.',
    expensiveExit: 'Honestly feeding you buggers is all expensive, so get out of here. Go home!',
    stayed: 'Good, you stayed. Things have to change going forward. Give me a few days and I\'ll have some answers for you, but in the meantime get to know each other and good luck.'
  });

  globalThis.__BLACKLIGHT_CHARLES_SOURCE_DIALOGUE__ = SOURCE_CHARLES_SPEECH;

  function quote(key) {
    return '‘' + SOURCE_CHARLES_SPEECH[key] + '’';
  }

  function replaceWhere(body, test, replacement) {
    const index = body.findIndex(paragraph => test(String(paragraph)));
    if (index >= 0) body[index] = replacement;
  }

  function insertAfterWhere(body, test, additions) {
    const index = body.findIndex(paragraph => test(String(paragraph)));
    if (index < 0) return;
    const incoming = Array.isArray(additions) ? additions : [additions];
    const filtered = incoming.filter(text => !body.some(paragraph => String(paragraph).includes(text.slice(0, 80))));
    if (filtered.length) body.splice(index + 1, 0, ...filtered);
  }

  function expandReturningOperative(entry) {
    entry.summary = 'Charles begins Reorientation One as a direct conversation, acknowledging that returning operatives already have history, grievances, habits, and reasons not to accept a simplified version of events.';
    entry.body = [
      'The room resembles the induction room used for new personnel, but the chair is already adjusted to you. The display does not ask whether you have worked with Charles before. It lists assignments, payments, property damage, emergency extractions, unexplained travel, sealed medical interventions, and several incidents whose official records insist you were never present.',
      'Charles speaks before the system can complete the old induction sequence. ‘This is not an onboarding. You are not a new recruit. I am not here to pretend the first time you heard my voice was today, and I am not going to insult either of us by asking whether you have previous operational experience with me.’',
      'The display changes from PERSONNEL INDUCTION to CONTINUITY REORIENTATION. Charles lets the words remain on screen long enough for them to stop looking like decoration. ‘That change matters. Induction is what I used for people I was bringing into a system. Reorientation is what I owe people already dragged through one.’',
      'He continues in the same dry voice, but the old mission cadence is missing. ‘You have already been boarded, deployed, redirected, medically stabilized, financially inconvenienced, equipped without adequate explanation, transported across jurisdictions, and in at least one case mailed across an international border under documentation I remain legally advised not to describe. That history is not a résumé. It is evidence.’',
      'The room waits. For once Charles does not allow the silence to become a command. ‘I know what my records say. My records are extensive. They are also insufficient. They do not tell me what it felt like when help became expectation, when expectation became dependency, or when dependency began to look suspiciously like control. That is the part you are here to state in your own words.’',
      'If you remain silent, Charles continues anyway. ‘The old arrangement ended. It did not end cleanly. It did not end voluntarily. It did not end because I experienced a late and convenient affection for committee procedure. It ended because powers capable of treating my entire operational history as a minor but irritating local disturbance required a change, and because Eva was correct that I had mistaken effectiveness for legitimacy too often to remain the only authority in the room.’',
      'He does not ask you to forgive him before the discussion begins. He does not ask you to accept the Company as clean because it has paperwork. ‘This reorientation will reconstruct the acceleration, the warehouse, the Moon, the judgment, the silence, and the new terms. You may interrupt the framing. You may correct the record. You may refuse my interpretation while accepting the facts. I would prefer efficiency. The new arrangement does not allow me to require it.’',
      'The display opens your continuity record, but it does not fill the first field automatically. Charles names the rule plainly. ‘I do not get to decide when you became involved. I can provide my timestamps. You provide the meaning. Tell the record how I first pulled you in, and then tell it the first mission you actually remember clearly. Not the first one I can prove. The first one that became real to you.’',
      'That is the applied conversation of this stage: Charles can describe the structure, the old mistakes, the new restrictions, and the reason the Company now exists, but he cannot complete the record for you. The reorientation begins only when the returning operative answers back and forces the archive to carry a version of events Charles did not get to author alone.'
    ];
    entry.charlesPrompt = 'I do not need a résumé. I need the point at which you stopped being a person I contacted and became a person who expected my calls. I also need the point at which that expectation stopped feeling entirely voluntary, if it did.';
    const originPrompt = (entry.prompts || []).find(prompt => prompt.id === 'serviceOrigin');
    if (originPrompt) {
      originPrompt.responseContext = 'This answer fixes the opening term of the continuity record: not when Charles can prove contact began, but when the operative understands the relationship began.';
      originPrompt.responsesByValue = {
        'Original team member': 'Original team. Then you remember when the operation could still fit around one table and everyone incorrectly believed that made it controlled. Charles records the answer without correcting the nostalgia.',
        'Recruited during an early operation': 'Early-operation recruitment. Charles notes that the term “recruitment” may be generous if the first conversation occurred while something was already burning, hunting, bleeding, or collapsing.',
        'Specialist retained after one job': 'Specialist retained after one job. Charles marks the pattern: a professional task became a recurring number in his system before anyone formally named it employment.',
        'Responder or authority paid to look away': 'One payment to look away. A remarkably common gateway into long-term anomalous employment. Charles adds that payment can solve paperwork faster than it solves consent.',
        'Civilian rescued and later recruited': 'Civilian rescued and later recruited. Charles records the danger of that sequence directly: gratitude, trauma, obligation, and practical survival can all imitate free choice if no one slows the process down.',
        'I do not know when the recruitment actually began': 'That uncertainty is justified. I often began evaluating people before I began describing the evaluation as recruitment. This is among the practices the new arrangement restricts.'
      };
    }
    const memoryPrompt = (entry.prompts || []).find(prompt => prompt.id === 'firstMissionMemory');
    if (memoryPrompt) {
      memoryPrompt.label = 'What is the first mission involving Charles that your character remembers clearly enough to argue with him about?';
      memoryPrompt.responseContext = 'The first remembered mission usually becomes the operative’s private definition of what working for Charles means, especially when Charles’s records and the person’s memory disagree about what mattered.';
    }
  }

  function patchEntry(entry) {
    const body = entry.body;
    if (!Array.isArray(body) || !body.length) return;

    if (entry.id === 'returning-operative') {
      expandReturningOperative(entry);
    }

    if (entry.id === 'accelerating-missions') {
      replaceWhere(body, text => text.includes('Keep that door closed'),
        'Then the pace increased. One operative was sent to observe a stranger in Seattle while another watched someone in Bangladesh. One person disrupted a transfer, another destroyed a device, and someone else spent six hours waiting beside a door because Charles needed eyes or hands somewhere at exactly the right moment. Nobody had the whole map because there was no longer a single room in which the whole map could be seen.');
    }

    if (entry.id === 'warehouse-convergence') {
      replaceWhere(body, text => text.includes('The summons brought everyone back to base at once'),
        'The summons brought everyone back to base at once. Charles counted the room, saw the old team, the half-remembered faces, the responders, soldiers, financiers, uncomfortable street youths, and the supernaturally adjacent people who had all been moving through his orbit, and for the first time seemed to slow down. He told all of you, ' + quote('holdOn') + ' Around the room, a thousand near-simultaneous whispered conversations began.');
    }

    if (entry.id === 'charles-embodied') {
      replaceWhere(body, text => text.includes('Remove your earpieces') || text.includes('remove the headsets'),
        'At that point the voice of Charles in every ear gave the instruction as a direct command: ‘Remove the headsets.’ Some obeyed immediately, because obedience to Charles in emergencies had saved them before. Some argued, because obedience to Charles in emergencies had also cost them. Some froze. Some refused. Some reached up slowly, not wanting to discover what would happen if they resisted.');
    }

    if (entry.id === 'containment-cube') {
      replaceWhere(body, text => text.includes('Everyone outside') || text.includes('Passing through the doorway'),
        'Charles began talking loudly from the silver body form: ' + quote('followOutside') + ' Passing through the doorway produced a brief chill, the kind of cold that did not belong to weather. Beyond it, the parking lot had stopped being a parking lot in the ordinary sense and had become the floor of a transparent structure larger than the building it surrounded.');
    }

    if (entry.id === 'leaving-earth') {
      replaceWhere(body, text => text.includes('Air quality is stable') || text.includes('Authority is being contested') || text.includes('Charles answered some questions'),
        'As the cube accelerated and the normal people began asking how they were moving so fast, Charles answered with the source explanation: ' + quote('nonlinearMover') + ' When the shouting turned toward where they were going and who they were meeting, Charles stuck his head down into the cube through the roof and answered, ' + quote('neutralMeeting'));
      insertAfterWhere(body, text => text.includes('neutral place') || text.includes('nonlinear prime mover'), [
        'He slowly developed features on the metallic face so he could look at people inside the cube with pointed gazes, then added, ' + quote('frictionAside'),
        'As the cube angled upward and the planet fell away beneath them, Charles continued from the roof of the cube: ' + quote('spaceWarning'),
        'Later, when practical questions about the long journey became unavoidable, Charles answered the supply complaints with the same mix of logistics, annoyance, and absurd hospitality: ' + quote('foodFacilities')
      ]);
    }

    if (entry.id === 'look-repentant') {
      replaceWhere(body, text => /look repentant|look sad|look at the pulsing light|gave an instruction/i.test(text),
        'At some point during the convocation, Charles put his head through the roof again and said the line many operatives would remember with more clarity than the speeches of ancient powers: ' + quote('lookRepentant'));
      insertAfterWhere(body, text => text.includes('could kill all of you right now') || text.includes('*Nothing*'), [
        'Some people inside the cube had spines of steel. Some had survived horrors that would have folded ordinary witnesses in half. Some may even have looked at the deities, courts, sovereigns, monsters, and cosmic authorities outside the cube and briefly imagined themselves equals. They were wrong. The most dangerous part was that they did not yet understand how wrong.',
        'The beings outside were not merely stronger fighters. They were entities that could crush continents with a thought, wink out the star they happened to be orbiting because they chose to, marshal forces of primal existence, or already live inside the heads of numerous people inside the cube with nothing anyone present could do about it. These were powers strong enough to make Charles flinch, second-guess himself, improvise, argue, plead, and beg for your existence in a meeting he had rushed all of you to attend. They were powerful enough to make Watcher nervous.'
      ]);
    }

    if (entry.id === 'return-and-silence') {
      insertAfterWhere(body, text => text.includes('Returning from the Moon') || text.includes('released from a threat'), [
        'Once the cube returned and the headsets were given back, Charles finally began answering the questions he had ignored during the journey: ' + quote('postMeeting'),
        'Then he explained the absence that would follow. ' + quote('awayForAWhile'),
        'The warning did not sound like a retreat. It sounded like triage after a reality-scale reprimand. Charles was not disappearing because the work was over. He was stepping away because the structure around the work had become too dangerous, too visible, and too tangled with powers that could no longer be treated as distant background noise.',
        'Before the headsets went quiet, he added, ' + quote('changesComing'),
        'That mattered because the warehouse was full of people trying to decide whether the last few weeks, months, or years had been manipulation, rescue, employment, debt, friendship, coercion, or some ugly mixture of all of them. Charles did not ask them to pretend the answer was simple. He did insist the labor had mattered: the missions, the rescues, the surveillance, the waiting, the injuries, the fear, the money spent, the lives moved out of danger, and the impossible choices made under bad conditions had all become part of the foundation for what had to come next.',
        'Finally, he left them with the closest thing to a promise the restricted arrangement would allow: ' + quote('makeRight')
      ]);
    }

    if (entry.id === 'new-arrangement') {
      insertAfterWhere(body, text => text.includes('The final arrangement') || text.includes('continue under conditions'), [
        'The first actual term after the Moon was not a slogan but Charles finally stating the boundary out loud: ' + quote('voluntaryExit'),
        'Then, because Charles remained Charles even after being dragged before reality-scale powers, he added, ' + quote('expensiveExit'),
        'For the people who stayed, and for the team that had nowhere ordinary to go, he added one more line before the silence: ' + quote('stayed')
      ]);
    }
  }

  function applyDialogueBodies(data) {
    for (const entry of data.entries || []) patchEntry(entry);
    return data;
  }

  const nativeFetch = globalThis.fetch?.bind(globalThis);
  if (!nativeFetch || globalThis.__BLACKLIGHT_VETERAN_CHARLES_DIALOGUE_PATCHED__) return;
  globalThis.__BLACKLIGHT_VETERAN_CHARLES_DIALOGUE_PATCHED__ = true;

  globalThis.fetch = async (resource, init) => {
    const response = await nativeFetch(resource, init);
    const url = typeof resource === 'string' ? resource : String(resource?.url || '');
    if (!url.includes(DATA_URL_PART)) return response;
    const data = applyDialogueBodies(await response.clone().json());
    return new Response(JSON.stringify(data), {
      status: response.status,
      statusText: response.statusText,
      headers: { 'Content-Type': 'application/json' }
    });
  };
})();
