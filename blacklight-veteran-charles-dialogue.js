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
    lookRepentant: 'Look at the pulsing light in the middle of the gathering and look sad and look repentant. No I\'m serious, look sad and repentant now. Your lives depend on it. The gathered beings here could kill all of you right now and there would be nothing I could do to stop them. Nothing.',
    postMeeting: 'The meeting you just attended was a meeting of Eternals, Solars, various Eldrich sources, and other immensely powerful beings. And yes one of them was indeed a dragon, and yes one of them was indeed a representative of the Eldershogoth known as Cthulhu, and yes that was Cain, and yes those were the kings and queens of the Seely and Unseely courts. Yes there are other entities like Watcher whose jobs are to watch other entities like yourselves. Many of these forces are immutable, permanent, distinct, with abilities to shape reality itself in ways that even Charles cannot comprehend.',
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

  function patchEntry(entry) {
    const body = entry.body;
    if (!Array.isArray(body) || !body.length) return;

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
    }

    if (entry.id === 'return-and-silence') {
      insertAfterWhere(body, text => text.includes('Returning from the Moon') || text.includes('released from a threat'),
        'Once the cube returned and the headsets were given back, Charles finally began answering the questions he had ignored during the journey: ' + quote('postMeeting'));
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