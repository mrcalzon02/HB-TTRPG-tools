(() => {
  'use strict';

  const labels = Object.freeze({
    premise: 'Campaign World', centralMystery: 'Central Mystery', theme: 'Theme',
    centralConflict: 'Central Conflict', initialMystery: 'Initial Mystery',
    fantasyTwist: 'Fantasy Setting Twist', limitation: 'Unexpected Limitation or Requirement',
    campaignStructure: 'Recurring Campaign Structure', settlementComplication: 'Why the Obvious Refuge Fails',
    environmentalPressure: 'Environmental Pressure', hiddenTruth: 'Hidden Truth', stakes: 'What Failure Changes'
  });

  const focuses = Object.freeze({
    any: 'Any world foundation', migration: 'Migration and journey',
    sunless: 'Sunless and bioluminescent', frontier: 'Frontier settlement',
    strange: 'Strange cosmology', political: 'Political and factional'
  });

  const tones = Object.freeze({
    any: 'Random style and tone',
    bubblegum: 'Bubble-gum fantasy',
    cartoon: 'Saturday-morning cartoon',
    storybook: 'Storybook whimsy',
    heroic: 'Heroic high fantasy',
    mythic: 'Mythic epic',
    grounded: 'Grounded adventure',
    noir: 'Fantasy noir',
    gritty: 'Gritty low fantasy',
    ultraRealistic: 'Ultra-realistic survival',
    grimdark: 'Grimdark',
    weird: 'Surreal weird fantasy'
  });

  const premises = Object.freeze([
    ['migration', 'The Long White Road', 'A displaced dwarven colony must cross frozen mountains in an old-West-style migration caravan, guiding families, livestock, forge wagons, ancestral relics, and the seed-stones of a future Mountain Home through deep winter. Nearly every ideal valley already belongs to someone, hides an old claim, or contains a danger that prevents permanent settlement.'],
    ['migration', 'The Walking City', 'An entire city has been dismantled into wagons, sledges, shrine-carts, and mobile workshops. Its people must carry their laws, dead, archives, and industries across a continent before the temporary road behind them closes forever.'],
    ['sunless', 'The World Beneath the Glow', 'There is no sun. Civilizations survive inside a fungal and bioluminescent ecosystem where luminous forests, drifting spores, radiant reefs, and migrating glow-beasts provide heat, food, navigation, and sacred calendars. Tribal borders follow living light rather than geography.'],
    ['sunless', 'Night Has Always Been', 'No culture remembers daylight, but newly opened ruins contain windows, sundials, and murals depicting a bright disk in an impossible blue sky. The discovery threatens religions built around darkness as creation’s natural state.'],
    ['frontier', 'The New Borderlands', 'Thousands of refugees have been promised land beyond the mapped kingdoms, but the frontier is neither empty nor unclaimed. The campaign follows road building, water rights, first-winter survival, and the choice between becoming a colony, a neighbor, or an invading power.'],
    ['frontier', 'A Town Built Around the Wrong Thing', 'A new town prospers around a miraculous resource that solves every immediate survival problem, but the resource is part of a larger living, magical, and political system the settlers do not understand.'],
    ['strange', 'The World That Must Be Wound', 'Seasons, tides, and gravity continue only because ancient stations are periodically visited and manually reset. Civilization survives through maintenance pilgrimages whose true purpose has been forgotten.'],
    ['strange', 'The Borrowed Sky', 'The sky belongs to another world and appears through a colossal magical breach. Weather, stars, flying creatures, and omens cross between realities, while closing the breach would also remove the light and rain sustaining civilization.'],
    ['strange', 'The Sleeping Continent', 'Nations occupy the body of a continent-sized sleeping being. Mountains are bones, rivers are blood, mines are wounds, and every earthquake may be a sign that the world is beginning to wake.'],
    ['political', 'Peace Built on One Missing Signature', 'A generation-long war ended through a treaty accepted by every major power except one supposedly extinct people. Evidence that they survived makes the peace legally, morally, and magically incomplete.'],
    ['political', 'The Moving Borders', 'Borders are enforced by ancient guardian spirits that physically relocate roads, rivers, and settlements according to treaties no living ruler can fully interpret.'],
    ['political', 'The Crown Without a Country', 'The only universally recognized monarch rules no territory, yet their blessing is required for every lawful succession. When the monarch disappears, dozens of governments begin losing legitimacy at once.']
  ]);

  const common = Object.freeze({
    centralMystery: [
      'Why are maps from unrelated cultures showing the same unreachable place?',
      'What force removes one ordinary fact from history every generation?',
      'Why do children remember events that have not happened yet?',
      'Who benefits from keeping the world’s true age uncertain?',
      'Why are ancient wards failing only around thriving communities?'
    ],
    theme: [
      'The difference between finding a home and taking one.',
      'What people preserve when survival makes preservation expensive.',
      'Whether inherited duty remains moral after its purpose is lost.',
      'How communities decide who belongs when resources are finite.',
      'The cost of treating a living world as empty territory.'
    ],
    centralConflict: [
      'Several communities need the same irreplaceable resource, but each use makes the others’ survival impossible.',
      'An institution can prevent immediate catastrophe only by preserving the injustice that created it.',
      'The safest solution requires cooperation between peoples whose identities were built around refusing one another.',
      'A changing environment makes every old border, law, and promise difficult to enforce.',
      'The heroes must choose between stabilizing the current world and allowing a dangerous transformation.'
    ],
    initialMystery: [
      'A dead courier arrives with a message written tomorrow.',
      'A familiar road passes through a village that did not exist last week.',
      'Every animal turns toward the same empty hill at midnight.',
      'A routine repair reveals records of the party’s first adventure before it occurs.',
      'A missing person returns safely but casts no reflection in still water.'
    ],
    fantasyTwist: [
      'Every spell creates a physical object that must be stored, traded, hidden, or destroyed.',
      'The gods can perceive communities but never individuals.',
      'Dragons are what settlements become after accumulating enough wealth, memory, and defensive magic.',
      'Dungeons are immune responses generated by the land around wounds in reality.',
      'Prophecy describes obligations rather than outcomes and becomes a contract once heard.'
    ],
    limitation: [
      'The central opposition cannot simply be killed because everyone depends on the system it maintains.',
      'Every permanent victory must be accepted by at least one faction that loses power because of it.',
      'Travel is safe only while carrying something entrusted by a stranger.',
      'No settlement may remain in the same place through two full seasonal cycles.',
      'Magic works reliably only when its cost is paid by the person who benefits.'
    ],
    campaignStructure: [
      'Each arc presents an ideal solution, reveals who already depends on it, and forces the party to redefine success.',
      'Travel or investigation episodes alternate with community decisions where resources and consequences are recorded.',
      'Every victory creates a responsibility that follows the party into later regions.',
      'Each arc forces a choice between solving one local problem and carrying another danger forward.',
      'Rumors become locations, locations become obligations, and obligations reshape the central conflict.'
    ],
    settlementComplication: [
      'The site is used seasonally by people who reject permanent ownership.',
      'The location is safe only because an unseen community maintains defenses mistaken for natural features.',
      'The land supports far fewer people than the arriving population.',
      'The site is ideal now and catastrophically exposed during a rare cycle locals remember.',
      'The ruins are not abandoned; their inhabitants experience time too slowly to notice newcomers.'
    ],
    environmentalPressure: [
      'A season arrives unpredictably and changes which roads, foods, creatures, and magic remain usable.',
      'The safest route shifts each month as the landscape reorganizes itself.',
      'A vital resource is abundant but spoils within hours of extraction.',
      'Weather responds to concentrated population, making large settlements difficult to sustain.',
      'Migrations large enough to function like natural disasters cross the region.'
    ],
    hiddenTruth: [
      'The crisis is the world attempting to heal from an older intervention.',
      'The opposition has been preventing a worse outcome but concealed the cost.',
      'The promised solution was designed for a different species, era, or physical law.',
      'The founding myth is accurate but reverses who sacrificed and who benefited.',
      'Several factions each know one true part and one false part of the same history.'
    ],
    stakes: [
      'Failure determines which communities pay for the world’s continuation.',
      'Future generations inherit a functioning society, a survivable wilderness, or a stable injustice.',
      'The people may survive while losing the knowledge and identity needed to remain the same culture.',
      'A local decision becomes the precedent neighboring powers use to justify expansion or restraint.',
      'One interpretation of belonging, authority, or personhood becomes dominant.'
    ]
  });

  window.HBWorldHooksCoreData = Object.freeze({ labels, focuses, tones, premises, common });
})();
