(() => {
  'use strict';

  const enhancements = globalThis.BLACKLIGHT_VETERAN_REORIENTATION_ENHANCEMENTS;
  if (!enhancements || typeof enhancements !== 'object') return;

  const option = (value, detail, response) => ({ value, label: value, detail, response });
  const single = (options, responseContext) => ({ type: 'radio', options, responseContext });
  const multiple = (options, responseContext, multiResponseLead) => ({
    type: 'checkboxes',
    options,
    responseContext,
    multiResponseLead
  });

  enhancements.promptOverrides = enhancements.promptOverrides || {};

  enhancements.promptOverrides.convocationImpression = single([
    option(
      'The central pulsing light',
      'The operative focused on the luminous authority conducting the proceeding rather than any single faction around it.',
      'The central light. Understandable. Everyone with sufficient survival instinct eventually looked at the thing in the room that could make dragons stop performing importance at each other. It was not a lamp, a throne, or a god in any polite human sense. It was closer to a court, a weapon, and a decision engine pretending those categories are different. Staring was not rude. It was threat assessment.'
    ),
    option(
      'The dragons or colossal beings',
      'The operative was most affected by vast physical presences whose bodies made ordinary scale feel irrelevant.',
      'The dragons and colossal beings. Yes, the large ones are hard to ignore. That is one of the reasons they insist on being large. Scale is a political argument when the audience can be crushed by a careless shift of weight. If you felt small, congratulations, your senses were functioning correctly.'
    ),
    option(
      'The Eldritch representatives',
      'The operative reacted most strongly to presences that felt wrong, ancient, alien, or conceptually unsafe.',
      'The Eldritch representatives. Good. That means some part of you noticed the ones that do not merely kill bodies. They negotiate with categories: name, memory, boundary, hunger, worship, mistake. Looking directly at them was inadvisable. Not looking directly at them was also inadvisable. I appreciate how fair that sounds.'
    ),
    option(
      'The fae sovereigns',
      'The operative noticed courts, etiquette, beauty, cruelty, bargains, titles, and dangerous social law.',
      'The fae sovereigns. Sensible. They are what happens when hospitality, predation, etiquette, art direction, and contract law all decide to wear a crown. Their smiles were not reassurance. Their anger was not always hostility. Their compliments were more dangerous than several threats I have received from artillery.'
    ),
    option(
      'Cain or another ancient human figure',
      'The operative was unsettled by someone recognizably human carrying impossible age, history, guilt, or mythic authority.',
      'Cain, or someone close enough to that problem. I noticed you noticing him. Ancient human figures are useful reminders that humanity can become just as metaphysically inconvenient as anything with wings, halos, antlers, or teeth arranged in a theology. Do not assume a human face means a human scale of consequence.'
    ),
    option(
      'The other Watchers',
      'The operative focused on the beings comparable to the Watcher who brought Charles before the convocation.',
      'The other Watchers. Of course. Once you learn one observer can drag my entire operation into a lunar hearing, the existence of several more becomes personally relevant. They were not a jury of friends. They were functionaries, witnesses, wardens, and arguments wearing bodies. A very charming professional community, in the way land mines are technically a kind of landscaping.'
    ),
    option(
      'The sheer number of unknown powers',
      'The operative was overwhelmed by the scale of the assembly and the number of factions they could not identify.',
      'The number of unknown powers. That may be the most accurate answer. Recognition is comforting because it lies to you. It suggests the named danger is the whole danger. The lunar surface was full of things you could not classify, and many of them were politely deciding whether you should continue existing as a person with choices. Overwhelmed was not weakness. It was arithmetic.'
    )
  ],
  'The presence that seized your attention tells me which kind of power your instincts considered worth fearing first. I am not calling that fear irrational. I was there. I was also busy being judged by it.'
  );

  enhancements.promptOverrides.convocationFear = multiple([
    option(
      'We could all be killed instantly',
      'The gathering’s physical survival depended on entities beyond Charles’s control.',
      'Instant death. Correct, unfortunately. I know I have trained some of you to expect a hidden extraction route, a sealed contingency, or one more impossible trick. On the Moon, in that assembly, several attendees could have ended everyone in the cube before I finished objecting. I dislike admitting that. It remains true.'
    ),
    option(
      'We could be erased from history or continuity',
      'The operative feared removal from memory, record, timeline, or personal continuity rather than ordinary death.',
      'Continuity erasure. Yes. Not death. Not even disappearance in the useful criminal sense. Erasure. The kind where the chair was never warm, the calls were never made, and someone like me has to decide whether remembering you counts as defiance or evidence tampering. You were right to fear that category.'
    ),
    option(
      'We could be claimed, bound, or divided among factions',
      'The operative understood that factions might treat the people inside the cube as wards, property, evidence, compensation, or spoils.',
      'Claimed, bound, or divided. That proposal appeared in more than one vocabulary. Some called it custody. Some called it rightful jurisdiction. Some avoided words and simply looked at the cube like a tray of unassigned assets. I did not enjoy that. I assume you enjoyed it less.'
    ),
    option(
      'We could be transformed into something that survived us',
      'The operative feared alteration of body, mind, soul, species, allegiance, or identity continuity.',
      'Transformation. Also correct. Survival is a very slippery word when the surviving thing can be loyal to someone else, remember with edited priorities, or wear your face while you are no longer the one using it. I have done many reckless things. I still object to calling that a rescue.'
    ),
    option(
      'We could be punished for missions we did not understand',
      'The operative feared liability for operations conducted under incomplete briefing or withheld context.',
      'Punished for missions you did not understand. That was one of my larger problems, yes. I had made useful people into participants without always making them informed participants. Cosmic courts, annoyingly, can notice that sort of thing even when human paperwork has been persuaded to look elsewhere.'
    ),
    option(
      'We could be abandoned if Charles was removed',
      'The operative feared losing the support network if Charles was punished, bound, silenced, or destroyed.',
      'Abandoned if I was removed. That was not paranoia. Many of you were attached to support structures that moved through me: money, medicine, extraction, records, housing, quiet interventions, roads home. Remove me badly and the system does not become ethical. It becomes rubble with dependents standing on it.'
    ),
    option(
      'We could become evidence instead of people',
      'The operative saw the cube’s occupants being used as proof in the case against Charles rather than treated as individual persons.',
      'Evidence instead of people. That is a clean way to describe an ugly possibility. You were evidence. You were also hungry, frightened, angry, attached to one another, and annoyingly individual. I spent a nontrivial portion of the hearing insisting those latter facts mattered. I should have made them matter sooner.'
    ),
    option(
      'The powers could disagree and fight around us',
      'The operative feared factional violence, collateral damage, or neutral ground collapsing into conflict.',
      'The powers fighting around you. A practical fear. The cube protected against vacuum, acceleration, and several insults to physics. It was not rated for a full ideological disagreement between ancient predators, court sovereigns, cosmic observers, and luminous adjudicative phenomena. The warranty would have been very short.'
    ),
    option(
      'We might survive but lose the right to choose what happened next',
      'The operative feared controlled survival, custody, or institutional ownership more than immediate death.',
      'Survival without choice. There it is. The solution several powerful parties always rediscover because it lets them call themselves merciful while keeping the leash. I rejected it for you. The more important fact is that the Company exists so I do not get to be the only one rejecting it next time.'
    ),
    option(
      'I could not understand the scale of what might happen',
      'The operative could not reduce the threat to usable categories, plans, or familiar forms of danger.',
      'You could not understand the scale. Good. Anyone who claims they fully understood that room is either lying, mythologically overqualified, or selling something. Your inability to reduce it to a clean threat profile was not failure. It was a rare moment of honest calibration.'
    )
  ],
  'The convocation proved I could not guarantee your survival, your autonomy, or even your continued narrative neatness. Since you clicked more than one fear, I will do you the courtesy of not pretending they cancel each other out.',
  'The convocation is the first direct proof that I could not simply solve the danger around you. I could argue. I could calculate. I could irritate beings older than agriculture. I could not promise you safety.'
  );
})();
