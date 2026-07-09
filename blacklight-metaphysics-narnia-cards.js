(() => {
  'use strict';

  const narniaCards = [
    {
      title: 'Narnia Is Not a Dream Problem',
      category: 'Physical portal-world horror',
      concept: 'portal worlds as sovereign physical realities',
      precedent: 'material travel, object transfer, time displacement, cross-world contamination, and interdimensional causality',
      edge: 'whether a child adventure becomes foreign intervention when the destination world is fully real',
      media: 'Narnia as a physical world rather than a dream, metaphor, or private moral hallucination',
      question: 'If Narnia and the other worlds are materially real, then the children are not imagining moral lessons; they are crossing borders into sovereign worlds, changing governments, fighting wars, killing or helping kill real enemies, and returning to Earth with no court, treaty, debriefing, or accountability structure at all.'
    },
    {
      title: 'The Charn Omnicide Containment Failure',
      category: 'World-ending weapon aftermath',
      concept: 'evil as civilizational extinction rather than personal wickedness',
      precedent: 'genocide studies, weapons of mass destruction, extinct civilizations, and containment failure around surviving perpetrators',
      edge: 'whether a dead world creates legal and moral obligations for any world that accidentally imports its last tyrant',
      media: 'Charn as a real dead world whose ruler survives after using a world-killing word',
      question: 'If Charn was a real world with real civilians, cultures, children, ecosystems, and history, then Jadis is not merely a fantasy witch; she is the surviving perpetrator of omnicide, and two children accidentally bringing her to Earth is an interdimensional containment disaster.'
    },
    {
      title: 'The Deplorable Word Arms-Control Problem',
      category: 'Metaphysical WMD policy',
      concept: 'language as a weapon of mass extinction',
      precedent: 'nuclear deterrence, dead-hand systems, forbidden knowledge, memetic weapons, and command authorization theory',
      edge: 'whether a word that can kill a world is speech, magic, code, weaponry, or the final failure of governance',
      media: 'a royal house preserving a verbal world-ending weapon as an ultimate dynastic option',
      question: 'If a single spoken word can erase a world, then the most dangerous object in the setting is not a sword, crown, or spellbook but a piece of knowledge; who controls it, who records it, who forgets it, and what kind of civilization keeps such a thing as an inheritance?' 
    },
    {
      title: 'The Newborn World Contamination Problem',
      category: 'Creation and biosecurity',
      concept: 'creation as moral responsibility',
      precedent: 'invasive species ecology, quarantine protocol, founding violence, and contaminated origin events',
      edge: 'whether a creator is accountable for allowing a newborn world to be seeded with a tyrant from another universe',
      media: 'Narnia being created after outsiders and a world-killer have already entered the cosmological scene',
      question: 'If Narnia is physically created while alien visitors and Jadis are present, then its origin is not pure pastoral innocence; it is a contaminated founding event where a newborn ecosystem inherits another world’s apocalypse before it has institutions, defenses, or history.'
    },
    {
      title: 'The Imported Child Monarch Problem',
      category: 'Sovereignty without consent',
      concept: 'divine appointment versus political legitimacy',
      precedent: 'constitutional theory, colonial administration, child welfare, and emergency government legitimacy',
      edge: 'whether prophecy can override the consent of native citizens',
      media: 'Earth children becoming kings and queens of a real multi-species kingdom',
      question: 'If Earth children are installed as monarchs over real Narnians, then the problem is not just whether they are good children; it is whether native citizens have any say when foreign minors arrive under prophecy and become sovereigns over their courts, armies, land, taxes, and law.'
    },
    {
      title: 'The Child-Soldier Prophecy Pipeline',
      category: 'Sacred child militarization',
      concept: 'destiny as coercive recruitment',
      precedent: 'child-soldier ethics, just-war theory, emergency coercion, and religiously legitimated violence',
      edge: 'whether a war remains righteous when its sacred solution requires children from another world to fight it',
      media: 'portal children being armed, tested, and placed into battles with real casualties',
      question: 'If the battles are real, then the children are not playing at courage; they are being recruited by cosmic emergency into war, command, killing, and trauma, which makes prophecy look less like wonder and more like a child-soldier pipeline with divine branding.'
    },
    {
      title: 'The Adult Reign in a Child Body Problem',
      category: 'Identity and time trauma',
      concept: 'personhood across broken body-time and mind-time',
      precedent: 'trauma psychology, developmental identity, time dilation, and memory continuity under bodily reversal',
      edge: 'whether returning an adult mind to a child body is rescue, erasure, or metaphysical mutilation',
      media: 'children who live years as adult monarchs in Narnia and then return to Earth as children',
      question: 'If the Pevensies physically lived adult lives as rulers and then returned to child bodies, they are not simply children with memories; they are displaced adults trapped in childhood status, carrying war, rule, grief, maturity, and identity into a world that cannot legally or socially recognize them.'
    },
    {
      title: 'The Real Narnian Casualty Problem',
      category: 'War without abstraction',
      concept: 'fantasy battle as real death',
      precedent: 'civilian casualty accounting, veteran trauma, command responsibility, and postwar reconstruction',
      edge: 'whether heroic myth can obscure the administrative reality of who died and who paid for victory',
      media: 'Narnian wars fought by real animals, humans, fauns, dwarfs, centaurs, and other peoples',
      question: 'If Narnia is real, every battle has bodies, widows, orphans, missing limbs, ruined farms, PTSD, disputed command decisions, and postwar grievances; heroic coronation does not erase the fact that real Narnians died in conflicts shaped by imported children and divine politics.'
    },
    {
      title: 'The Talking-Animal Citizenship Crisis',
      category: 'Multi-species civil rights',
      concept: 'personhood beyond human form',
      precedent: 'animal cognition, legal personhood, citizenship theory, species hierarchy, and civil-rights law',
      edge: 'whether a kingdom can remain morally coherent when some animals are citizens and others may still be food',
      media: 'Narnia as a society of talking animals, non-talking animals, humans, fauns, dwarfs, and other rational beings',
      question: 'If talking animals are real persons, then Narnia needs law for property, testimony, labor, riding, predation, marriage, military service, and diet; otherwise it is a multi-species kingdom pretending personhood is obvious when its food chain may contain citizens.'
    },
    {
      title: 'The Hundred-Year Winter Atrocity',
      category: 'Ecological mass death',
      concept: 'tyranny as environmental collapse',
      precedent: 'crop failure, famine ecology, population crash, supply-chain collapse, and climate disaster recovery',
      edge: 'whether a fairy-tale curse becomes genocide when the affected world has real agriculture and real bodies',
      media: 'the White Witch imposing a century of winter on a real Narnia',
      question: 'If the hundred-year winter happened in a real ecosystem, then it means famine, frozen trade, dead forests, collapsing herds, failed reproduction, depopulated villages, and generations of trauma; Narnia should not bounce back like a stage set after the villain exits.'
    },
    {
      title: 'The Telmarine Colonization Problem',
      category: 'Interdimensional colonial settlement',
      concept: 'portal migration as conquest',
      precedent: 'colonial history, settler legitimacy, cultural suppression, land seizure, and restoration politics',
      edge: 'whether a colonizer’s heir can liberate a land without reproducing the logic of conquest',
      media: 'Earth-descended Telmarines entering, settling, ruling, and suppressing old Narnia',
      question: 'If the Telmarines descend from humans who crossed worlds and built a regime over older Narnian peoples, then Prince Caspian is not only restoration fantasy; it is an interdimensional colonial settlement crisis where legitimacy passes through the heir of the occupying order.'
    },
    {
      title: 'The Calormen Reality Problem',
      category: 'Empire and religious othering',
      concept: 'moral geography as political danger',
      precedent: 'orientalism, empire studies, slavery, religious pluralism, and narrative othering',
      edge: 'whether a fantasy empire can remain a simple villain faction once its people are fully real',
      media: 'Calormen as a real civilization with real civilians, religion, slavery, class structure, and imperial politics',
      question: 'If Calormen is materially real, then it is not just the exotic enemy empire; it is a huge society of real people, slaves, believers, officials, families, dissidents, and victims, which makes every broad moral contrast between Narnia and Calormen politically and theologically explosive.'
    },
    {
      title: 'The Tash and Emeth Problem',
      category: 'Religious pluralism under real gods',
      concept: 'sincere virtue under mistaken worship',
      precedent: 'theology of religious pluralism, moral luck, salvation theory, and imperial universalism',
      edge: 'whether a true god can justly judge people formed inside a rival religious system',
      media: 'a world where Aslan, Tash, and sincere worshippers of the wrong god exist within the same moral universe',
      question: 'If Tash, Aslan, and Calormene worship are real forces rather than literary symbols, then Emeth raises a terrifying question: are sincere believers saved despite their religion, condemned by cultural birth, or absorbed into Aslan’s truth in a way that still makes Narnia’s theology imperial?' 
    },
    {
      title: 'The False Aslan Information-Warfare Problem',
      category: 'Sacred fraud and propaganda',
      concept: 'religious authority as an attack surface',
      precedent: 'propaganda studies, cult dynamics, authentication failure, and crisis governance',
      edge: 'whether divine kingship becomes politically dangerous when ordinary citizens cannot verify the divine',
      media: 'a false Aslan being used to manipulate a frightened population',
      question: 'If a fake Aslan can move public opinion, command obedience, and enable tyranny, then Narnia has a catastrophic authentication problem: how does any ordinary citizen distinguish revelation from propaganda when sacred authority is the highest political currency?' 
    },
    {
      title: 'The Dwarfs Were Not Entirely Irrational Problem',
      category: 'Skepticism under magical manipulation',
      concept: 'epistemology under impossible conditions',
      precedent: 'conspiracy psychology, institutional betrayal, information disorder, and trauma-driven distrust',
      edge: 'whether skepticism becomes damnable only after the world has made trust nearly impossible',
      media: 'dwarfs refusing to be taken in after living through magic, manipulation, false prophecy, and political betrayal',
      question: 'If Narnia is full of real magic, false Aslans, tyrants, prophecies, and world-ending claims, then the dwarfs’ refusal to be taken in is tragic but not stupid; the world has given them every reason to treat sacred certainty as another scam.'
    },
    {
      title: 'The Narnian Apocalypse Accountability Problem',
      category: 'End-of-world ethics',
      concept: 'history under final judgment',
      precedent: 'apocalyptic theology, transitional justice, memory preservation, and the moral status of destroyed worlds',
      edge: 'whether a truer world redeems the first world or overwrites the suffering that happened there',
      media: 'Narnia ending as a real world and giving way to a deeper true Narnia',
      question: 'If old Narnia was physically real, then its end is not just a beautiful finale; it is cosmic annihilation followed by metaphysical replacement, forcing the question of whether eternal consolation honors every dead life or politely files a whole world under completed story.'
    },
    {
      title: 'The Train Crash Salvation Problem',
      category: 'Death as portal resolution',
      concept: 'afterlife as narrative closure',
      precedent: 'grief ethics, religious consolation, traumatic death, and portal fantasy escapism',
      edge: 'whether dying into the truest world is comfort, horror, or both at once',
      media: 'children and allies entering final Narnia through death in a railway accident',
      question: 'If the final return to Narnia happens through a real train crash, then the ending is not simply children going back to a fantasy land; it is death translated into paradise, which is theologically beautiful inside the frame and deeply unsettling outside it.'
    },
    {
      title: 'The Earth Debriefing Failure',
      category: 'Unrecognized interdimensional trauma',
      concept: 'witness memory without institutional recognition',
      precedent: 'veteran reintegration, child trauma, impossible testimony, and state ignorance of anomalous events',
      edge: 'whether a society harms witnesses again by having no category for what actually happened to them',
      media: 'children returning from real portal worlds to ordinary Earth families, schools, and institutions',
      question: 'If children return from real wars, reigns, deaths, and cosmic encounters but Earth treats them as ordinary minors or imaginative children, then the second injury is institutional disbelief: there is no debriefing, no care, no legal status, and no way to testify about a real world.'
    },
    {
      title: 'The Divine Story Versus Civil Rights Problem',
      category: 'Metaphysical truth and political accountability',
      concept: 'sacred narrative as governance',
      precedent: 'theocracy, emergency powers, civil rights theory, and legitimacy under divine command',
      edge: 'whether real metaphysical truth makes political accountability more important, not less',
      media: 'Narnia as a world where Aslan, prophecy, monarchy, talking animals, and final judgment are all real',
      question: 'If Aslan is real and prophecy is real, Narnia does not become politically simple; it becomes more dangerous, because consent, citizenship, child protection, law, and accountability can all be overridden by sacred narrative unless someone insists that real gods do not eliminate real rights.'
    }
  ];

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function cardHtml(card, index) {
    return `<article class="metaphysics-option narnia-metaphysics-card"><h3>${index}. ${escapeHtml(card.title)}</h3><p>${escapeHtml(card.question)}</p><small><strong>${escapeHtml(card.category)}</strong><br>Concept: ${escapeHtml(card.concept)}<br>Precedent: ${escapeHtml(card.precedent)}<br>Physics edge: ${escapeHtml(card.edge)}<br>Media lens: ${escapeHtml(card.media)}</small></article>`;
  }

  function injectNarniaCards() {
    const options = document.getElementById('metaphysics-options');
    if (!options) return;
    options.querySelectorAll('.narnia-metaphysics-card').forEach(node => node.remove());
    const wrapper = document.createElement('div');
    wrapper.innerHTML = narniaCards.map((card, offset) => cardHtml(card, offset + 11)).join('');
    options.append(...Array.from(wrapper.children));
  }

  function addNarniaCopyButton() {
    const actions = document.querySelector('.metaphysics-actions');
    if (!actions || document.getElementById('copy-narnia-cards')) return;
    const button = document.createElement('button');
    button.id = 'copy-narnia-cards';
    button.className = 'metaphysics-button';
    button.type = 'button';
    button.textContent = 'Copy Narnia Cards';
    button.addEventListener('click', async () => {
      const text = narniaCards.map((card, index) => `${index + 1}. ${card.title}\n${card.question}\nCategory: ${card.category}\nConcept: ${card.concept}\nPrecedent: ${card.precedent}\nPhysics edge: ${card.edge}\nMedia lens: ${card.media}`).join('\n\n');
      try { await navigator.clipboard.writeText(text); } catch (_) { /* clipboard may be unavailable */ }
    });
    actions.appendChild(button);
  }

  function addNotice() {
    const note = document.querySelector('.metaphysics-note');
    if (!note || document.getElementById('narnia-metaphysics-note')) return;
    const extra = document.createElement('p');
    extra.id = 'narnia-metaphysics-note';
    extra.className = 'metaphysics-note';
    extra.textContent = 'Narnia physical-world audit cards are appended to each generated batch because the portal worlds are treated as materially real, not dreamlike metaphors.';
    note.insertAdjacentElement('afterend', extra);
  }

  function initialize() {
    addNarniaCopyButton();
    addNotice();
    const generate = document.querySelector('[data-generate]');
    if (generate) generate.addEventListener('click', () => window.setTimeout(injectNarniaCards, 0));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
