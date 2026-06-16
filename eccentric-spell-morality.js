(() => {
  const combine = (starts, middles, ends, limit = 180) => {
    const output = [];
    for (const start of starts) for (const middle of middles) for (const end of ends) {
      const value = `${start} ${middle} ${end}`.replace(/\s+/g, ' ').trim();
      if (!output.includes(value)) output.push(value);
      if (output.length >= limit) return output;
    }
    return output;
  };

  const MORALITY = {
    saintly: {
      label: 'Goody Two-Shoes Good', rank: 0,
      adjectives: ['Kindly','Neighborly','Merciful','Wholesome','Responsible','Civic-Minded','Considerate','Gentle','Reassuring','Well-Mannered'],
      purposes: ['protects bystanders before affecting the subject','cannot harm anyone who apologizes sincerely','tidies the area and leaves everyone hydrated','offers fair warning and a second chance','marks loose hazards with warning signs','rewards honest cooperation','returns borrowed property automatically','pauses to verify informed consent','provides blankets to frightened witnesses'],
      flavors: ['a tiny halo appears over kind choices','the spell praises civic responsibility','a spectral safety inspector approves the area','nearby flowers briefly bloom','everyone receives a polite thank-you note','the effect apologizes for any inconvenience','a warm voice reminds everyone to communicate','the spell refuses to litter','a faint smell of fresh bread remains']
    },
    heroic: {
      label: 'Heroically Good', rank: 1,
      adjectives: ['Radiant','Valiant','Guardian’s','Liberating','Compassionate','Noble','Selfless','Dawn-Bright','Hopeful','Resolute'],
      purposes: ['prioritizes protection and rescue','weakens hostile magic while shielding innocents','rewards mercy and sacrifice','breaks coercion and fear','creates safe passage for allies','restores courage to the threatened','reveals hidden victims','redirects harm toward willing protectors','preserves life whenever possible'],
      flavors: ['the effect brightens when used selflessly','bystanders feel briefly reassured','a distant horn sounds','shadows retreat from the protected','wounds close with golden light','the caster’s oath appears in the air','a protective emblem forms overhead','the spell resists cruel commands','nearby allies hear a heartbeat like a drum']
    },
    neutral: {
      label: 'Morally Neutral', rank: 2,
      adjectives: ['Balanced','Unaligned','Pragmatic','Grey','Untethered','Impartial','Measured','Objective','Even-Handed','Axiomatic'],
      purposes: ['operates without moral preference','responds only to stated parameters','treats all creatures by the same rule','prioritizes measurable outcomes','ignores intent in favor of conditions','applies its effect symmetrically','records rather than judges','preserves equilibrium','follows literal targeting criteria'],
      flavors: ['the spell carries no moral resonance','its aura is colorless to divination','the effect produces an even tone','all subjects are outlined identically','no symbolic imagery appears','the residue fades without preference','the spell refuses emotional interpretation','its geometry remains perfectly balanced','the result is recorded without commentary']
    },
    sinister: {
      label: 'Sinister', rank: 3,
      adjectives: ['Cruel','Dread','Malignant','Pitiless','Black','Spiteful','Baleful','Hollow','Ruinous','Predatory'],
      purposes: ['inflicts unnecessary fear','extracts a price from weakness','leaves a reminder of hostility','turns hesitation into pain','isolates the subject from allies','magnifies guilt and dread','feeds on failed resistance','marks survivors for later torment','converts mercy into vulnerability'],
      flavors: ['shadows lean toward the victim','the spell whispers private doubts','nearby reflections stop smiling','a cold handprint appears','the subject hears distant chains','the air smells of extinguished candles','letters crawl across nearby walls','the caster’s shadow grows horns','a soft laugh follows the effect']
    },
    cartoon: {
      label: 'Cartoonishly Evil', rank: 4,
      adjectives: ['Supreme Villain’s','Diabolically Unnecessary','Mustache-Twirling','Orphanage-Cursing','Moon-Stealing','Cape-Billowing','Thunderclap-Approved','Monologue-Powered','Lair-Certified','Doomsday'],
      purposes: ['adds an elaborate evil laugh','targets puppies and flowers first','requires a lever labeled EVIL','makes the caster’s cape billow indoors','pauses for a villainous monologue','projects a map of the secret lair','brands the moon with the caster’s initials','summons disposable henchmen to applaud','creates a countdown clock for no reason'],
      flavors: ['a pipe-organ sting plays','lightning silhouettes the caster','a sign reads THIS WAS UNNECESSARY','a spotlight follows the villain','nearby ravens arrange themselves dramatically','the spell displays a skull-shaped logo','an invisible audience gasps','smoke machines activate from nowhere','a narrator announces the phase of the plan']
    }
  };

  for (const morality of Object.values(MORALITY)) {
    morality.names = combine(morality.adjectives, ['Moral','Ethical','Villainous','Virtuous','Aligned','Judicial','Emotional','Behavioral'], ['Edict','Mandate','Impulse','Doctrine','Compulsion','Manifesto','Judgment','Intervention']);
    morality.purposesExpanded = combine(['The spell deliberately','Its moral behavior','When resolving, it','The enchantment also','Its ethical clause'], morality.purposes, ['before applying its main spectacle','whenever a creature becomes involved','for the entire incident','unless the caster dismisses it','as part of its secondary function','even when narratively inconvenient','according to its alignment','without becoming any less theatrical']);
    morality.flavorsExpanded = combine(['During manifestation,','As the spell resolves,','Its aura ensures that','Witnesses observe that','The lingering magic causes'], morality.flavors, ['for several seconds','until the scene changes','throughout the affected area','without clarifying why','in a theatrically obvious way','as a recognizable alignment signature','before fading completely','whenever the effect is noticed']);
  }

  window.HBEccentricMorality = MORALITY;
})();
