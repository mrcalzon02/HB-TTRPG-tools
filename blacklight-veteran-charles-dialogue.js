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

  const charlesDialogueBodies = {
    'returning-operative': [
      'The reorientation begins with the memory of the day Charles stopped acting like a private voice in a private earpiece and became something the whole gathered network had to reckon with. This is not a fresh induction. This is the record of people who had already been sent, paid, rescued, warned, moved, hidden, and used by Charles before the arrangement was forced into the open.',
      'The first restored line is small, almost swallowed by the size of the room around it. Charles seems to slow down, turns toward the crowd of operatives, responders, soldiers, fixers, paid witnesses, and people who only now realize they are not alone in this orbit, and says, ‘' + SOURCE_CHARLES_SPEECH.holdOn + '’',
      'That pause matters. Until then, Charles had been acceleration: another mission, another flight, another impossible transfer of money, another person watched in Seattle, another person watched in Bangladesh, another task completed because he needed eyes or hands somewhere at exactly the right moment. The pause is the first sign that the old tempo is about to break.',
      'The reorientation therefore does not ask whether your character belongs. They do. Their name, debts, rescues, payments, scars, and refusals already belong to the history. What this stage asks is what part of that history the character claims, what part they dispute, and what part they refuse to let Charles or the Company clean up into a neater story.'
    ],

    'warehouse-convergence': [
      'The summons brought everyone back to base at once. Suddenly everyone was there: the old team, half-remembered faces from prior scenes, people seen only in passing, responders whose lives had changed because the team rolled through and walked away, soldiers, people of financial import, uncomfortable street youths, and those who carried unmistakable signs of the supernatural or the supernatural-adjacent.',
      'This was normally the space where Charles spoke to the team, handed out tasks, and presented odd, impossible, or wondrous things from the other side of the veil. This time there were too many people in the room for the old illusion of a small private operation to survive.',
      'Everyone had the same earbud. Everyone had been connected to the same voice. Charles seemed to count the gathered crowd and then gave the only direct pause the source record preserves: ‘' + SOURCE_CHARLES_SPEECH.holdOn + '’',
      'Around the room, a thousand near-simultaneous whispered conversations began. Then the Watcher emerged from the crowd and asked the question everyone else was still trying to form: ‘Charles is this everyone?’'
    ],

    'charles-embodied': [
      'The forbidden rear doorway opened, the door everyone had been told never to ever open. Something emerged that looked like a mix of the Silver Surfer and Gort from The Day the Earth Stood Still, and it produced the voice the party had traditionally associated with Charles.',
      'The process was not pleasant. The Watcher and Charles approached and gnawed at one another in whatever language or pressure passed between them. The Watcher said, ‘It’s ready.’',
      'At that point the voice of Charles in every ear instructed the gathered people to remove the headsets. Some obeyed. Some argued. Some appeared to refuse. The headsets removed themselves anyway and vanished from existence, either at request or by force.',
      'The sight of it reframed everything. The party had seen Charles teleport objects before, usually at great cost and expense. Watching him do it thousands of times at once, with objects attached to living heads and with surgical precision enough not to take part of a skull, made his restraint and his violations visible at the same time.'
    ],

    'containment-cube': [
      'Charles began speaking loudly from the silver body form, and the source record preserves the order as speech rather than summary: ‘' + SOURCE_CHARLES_SPEECH.followOutside + '’',
      'The majority of the crowd followed him out into the main parking lot. Passing through the doorway brought a chill, and outside the building the parking lot had become the inside of a large translucent cube with a hole shaped over the doorway.',
      'The cube stretched over and around the cars, bins, trash, detritus, crowd, and entire parking lot. It was large enough to contain everyone, and once everyone was inside, Charles and the Watcher consulted with one another and rose to the top of it.',
      'The Watcher extended a hand toward the cube. Charles and the Watcher rose from the ground, and the cube rose with them. Inside, there was no motion, no inertia, only the sick understanding that the world outside had begun moving very quickly.'
    ],

    'leaving-earth': [
      'As the cube accelerated westward and the normal people started asking questions, Charles gave the answer preserved in the source document: ‘' + SOURCE_CHARLES_SPEECH.nonlinearMover + '’',
      'When the questions grew louder, Charles stuck his head down into the cube through the roof. People shouted about what was going on, where they were going, and who they were meeting. Charles answered, ‘' + SOURCE_CHARLES_SPEECH.neutralMeeting + '’',
      'He slowly developed features on the metallic face so he could look at people inside the cube with pointed gazes, then added, ‘' + SOURCE_CHARLES_SPEECH.frictionAside + '’',
      'As the cube angled upward and left the planet, the warning became sharper. Above the clouds, with the curvature of the Earth visible, Charles continued, ‘' + SOURCE_CHARLES_SPEECH.spaceWarning + '’',
      'Later, as the long trip became bodily and practical, he answered the supply questions with the same terrible Charles mixture of logistics and annoyance: ‘' + SOURCE_CHARLES_SPEECH.foodFacilities + '’'
    ],

    'look-repentant': [
      'The lunar gathering was not a court in any human sense. It was a collective menagerie of abominations, representatives, monolithic forces, eldritch powers, and entities so large in authority that even Charles and Watcher had been called to task before them.',
      'For hours, Charles and the Watcher spoke above the cube with the gathered powers. Forces gesticulated wildly. Several pointed at the group inside the cube. Factions formed, shifted, broke, and re-formed while the people most affected by the discussion were left to watch from below.',
      'Then Charles put his head through the roof again and said the line the source document preserves in full: ‘' + SOURCE_CHARLES_SPEECH.lookRepentant + '’',
      'That is the moment this stage records: Charles no longer sounded like the thing in control of the room. He sounded like someone who knew exactly how little control he had, and how much everyone else’s survival depended on performing the correct posture before beings that could erase them without meaningful resistance.'
    ],

    'return-and-silence': [
      'After the gathering broke apart, the cube returned to the warehouse where the journey had begun. The headsets were given back, and only then could people begin having actual conversations with Charles and pressing him for answers.',
      'Charles’s explanation is preserved as direct speech in the restored dialogue set: ‘' + SOURCE_CHARLES_SPEECH.postMeeting + '’',
      'The answer did not make the abduction clean. It made the scale visible. Charles and Watcher had been yelled at for hours by beings that controlled or constrained reality, and the team had been gathered quickly, with or without consent, because their presence had been demanded.'
    ],

    'new-arrangement': [
      'The new arrangement begins from the only line that could matter after the Moon: participation can no longer be treated as automatic. Charles tells the gathered operatives, ‘' + SOURCE_CHARLES_SPEECH.voluntaryExit + '’',
      'Then, because Charles remains Charles even after a reality-scale reprimand, he adds, ‘' + SOURCE_CHARLES_SPEECH.expensiveExit + '’',
      'For the team that has no ordinary home to return to, the warehouse remains the place they go. A few additions remain with them. Charles addresses the ones who stayed and says, ‘' + SOURCE_CHARLES_SPEECH.stayed + '’',
      'Then the headsets turn off. No amount of prodding the power button turns them back on. The silence that follows is the first proof that the old arrangement has ended and that whatever comes next must be built under different terms.'
    ]
  };

  function applyDialogueBodies(data) {
    for (const entry of data.entries || []) {
      const replacement = charlesDialogueBodies[entry.id];
      if (Array.isArray(replacement) && replacement.length) entry.body = replacement;
    }
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