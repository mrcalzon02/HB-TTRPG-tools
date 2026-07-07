(() => {
  'use strict';

  const enhancements = globalThis.BLACKLIGHT_VETERAN_REORIENTATION_ENHANCEMENTS;
  if (!enhancements || typeof enhancements !== 'object') return;

  const option = (value, detail, response) => ({ value, label: value, detail, response });
  const multiple = (options, responseContext, multiResponseLead) => ({
    type: 'checkboxes',
    options,
    responseContext,
    multiResponseLead
  });

  enhancements.promptOverrides = enhancements.promptOverrides || {};

  enhancements.promptOverrides.missionPatterns = multiple([
    option(
      'Surveillance and waiting',
      'The character was often assigned to watch a person, place, signal, door, transaction, or impossible anomaly until Charles gave the next instruction.',
      'Surveillance. Yes. I gave that work to people who could sit in a car, hallway, hotel room, rooftop, clinic, basement, or borrowed office for hours without turning boredom into noise. That does not make it small work. Waiting is where people learn whether they trust me, hate me, or start narrating my bad habits to themselves just to stay awake.'
    ),
    option(
      'Recovery or rescue',
      'The character became one of the people Charles used when someone needed to be extracted, stabilized, hidden, or brought home.',
      'Recovery and rescue. That means I learned you could be pointed at a person in danger and would treat getting them back as more important than getting a clean explanation first. Useful trait. Dangerous thing for me to rely on. Once I know you will move for a human life, I have to be watched very carefully or I will start treating urgency as consent.'
    ),
    option(
      'Destruction and sabotage',
      'The character broke, burned, disabled, corrupted, interrupted, or permanently removed things Charles decided should no longer function.',
      'Sabotage. I did not send you to break things because you were stupid enough to enjoy breaking things. I sent you because you could do damage with purpose and then live with the question of what the damage prevented. You were still owed more than “trust me” before the charges were set.'
    ),
    option(
      'Transport and delivery',
      'The character moved people, packages, evidence, weapons, bodies, messages, equipment, or unknown cargo through routes Charles controlled.',
      'Transport and delivery. You learned the shape of my reach one airport, dock, back road, warehouse door, and impossible vehicle at a time. I made the world feel smaller around you. Convenient, yes. Also a very efficient way to hide how much of your freedom depended on roads I owned.'
    ),
    option(
      'Medical or supernatural containment',
      'The character handled unstable bodies, infections, rituals, altered people, hostile entities, or conditions ordinary medicine could not categorize.',
      'Containment. I used you near bodies and forces that should have come with three briefings, two signatures, and a priest nobody trusted. You were not just holding the problem in place. You were holding my secrecy in place too. That distinction should have been made explicit before you put yourself between the door and the thing behind it.'
    ),
    option(
      'Negotiation or intimidation',
      'The character was sent to talk, bargain, threaten, stall, misdirect, pressure, or stand visibly beside a promise Charles wanted believed.',
      'Negotiation and intimidation. I sent you when the weapon was posture, leverage, timing, tone, or the useful implication that I was listening. Sometimes you were the diplomat. Sometimes you were the implied consequence. I am aware there is an ethical difference. I am also aware I blurred it when it was efficient.'
    ),
    option(
      'Cleanup and witness management',
      'The character handled aftermath: witnesses, scenes, bodies, reports, panic, property damage, impossible evidence, and the people left behind.',
      'Cleanup. That is the work history tries to make invisible because it smells like bleach, panic, paperwork, and someone else’s mistake. I asked you to make consequences manageable. Too often I let manageable become hidden, and hidden become handled. That was not the same as repair.'
    ),
    option(
      'Research and technical intrusion',
      'The character investigated records, systems, laboratories, archives, occult structures, communications, code, or protected information.',
      'Research and intrusion. You were sent into locked systems, sealed files, restricted archives, or stranger things wearing the costume of data. I chose you because you could ask the next question after the first answer made no sense. I also benefited from how easy it is to call trespass “analysis” when the door is digital.'
    ),
    option(
      'I was often not told what the task accomplished',
      'The character remembers carrying out instructions without ever receiving the full purpose, aftermath, or consequence of the work.',
      'You were not told what the task accomplished. That is not a memory defect. That is my fingerprint. I parceled out objectives small enough to execute and large enough to matter, then acted surprised when people noticed the missing middle. You noticed. Good. Keep that habit.'
    )
  ],
  'Repeated assignment patterns reveal what I believed you would do reliably, including the jobs I avoided naming because names create accountability.',
  'I remember that phase. These were not interchangeable job tags; they were the ways I learned what I could ask of you, and what I got too comfortable asking again.'
  );

  enhancements.promptOverrides.soloMissionEffect = multiple([
    option(
      'It made me more capable and self-reliant',
      'The character learned to make decisions without waiting for a full team or complete explanation.',
      'More capable and self-reliant. Yes, I saw that. I also helped produce it by repeatedly removing the luxury of waiting for anyone else. Do not let me or the Company turn your competence into proof that the isolation was acceptable.'
    ),
    option(
      'It made me isolated from the rest of the team',
      'Separate briefings, private travel, and individual tasks prevented shared context and ordinary emotional support.',
      'Isolation. That one is mine. I can call it compartmentalization, operational hygiene, or timeline pressure if I want to sound less guilty. The result was still you alone with my voice while the people who might have challenged my instructions were somewhere else.'
    ),
    option(
      'It made me dependent on Charles’s invisible support',
      'Food, credentials, transport, money, medical care, extraction, and legal cleanup became expected infrastructure.',
      'Dependent on my invisible support. I made the help arrive before you could see the hands moving it. It felt like reliability because it was reliable. It also meant refusal had to climb over food, rooms, tickets, treatment, documents, and a ride home. That is not a small amount of leverage.'
    ),
    option(
      'It made me suspicious of every incomplete briefing',
      'The character learned to assume each assignment concealed a second purpose or omitted consequence.',
      'Suspicious of every incomplete briefing. Annoying. Sensible. Mine. You learned to listen for the shape of the missing information because I taught you, repeatedly, that the missing information was where the real mission lived.'
    ),
    option(
      'It made danger feel ordinary',
      'Repeated exposure reduced the emotional distinction between routine work and catastrophe.',
      'Danger became ordinary. That is a failure disguised as professionalism. You should not need a blood pattern, impossible door, hostile spirit, or burning vehicle before breakfast to feel like the day has begun properly.'
    ),
    option(
      'It made me reckless because Charles usually had a solution',
      'The character began treating rescue, replacement equipment, extraction, or intervention as inevitable.',
      'Reckless because I usually had a solution. I dislike the word usually in safety planning. I used it anyway by making the impossible rescue happen often enough that it became part of your math. That was useful until the first day it would not have been.'
    ),
    option(
      'It made me more professional and emotionally controlled',
      'The character developed procedures, boundaries, and a practiced mission persona.',
      'More professional and controlled. I respect that. I also know how easy it is for me to praise restraint when what I actually mean is “thank you for not making your distress administratively inconvenient.” Keep the discipline. Do not give anyone ownership of the silence around it.'
    ),
    option(
      'It left me exhausted, numb, or burned out',
      'The character’s ability to function outlasted their ability to recover.',
      'Exhausted, numb, or burned out. Recorded without arguing. Functioning is not recovery. If you were still moving because I kept the next door opening and the next payment clearing, that tells me the machine continued. It does not tell me you were well.'
    ),
    option(
      'It made me protective of newer or less prepared operatives',
      'The character now notices when someone else is being sent into the same pattern.',
      'Protective of newer operatives. Good. Irritating for management, which is how you know it is useful. If you see the old pattern forming around someone who has not learned the cost yet, interrupt it. I mean that even when I am the pattern.'
    ),
    option(
      'It made me miss working as a complete team',
      'The character values shared briefings, visible support, and collective decision-making.',
      'You missed the team. Not the logo, not the payroll fiction, not my voice in your ear. The team. People who could compare what they were told, call me on my omissions, and make the room less easy for me to control. That preference is one of the reasons the Company exists now.'
    )
  ],
  'The old arrangement rewarded independence while quietly increasing dependence on my invisible infrastructure. Your answer identifies which part of that bargain followed you into the Company.',
  'I am not averaging these answers into one psychological profile. I am recording the specific damage, discipline, dependency, and loyalty the acceleration produced in you.'
  );
})();
