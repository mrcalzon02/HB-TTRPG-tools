(() => {
  'use strict';

  const implicationCards = [
    {
      title: 'The Pixie Dust Interreality Travel Problem',
      category: 'Magical aerospace and border control',
      concept: 'flight as cross-reality mobility infrastructure',
      precedent: 'aviation regulation, passport control, child endangerment, airspace law, and uncontrolled extradimensional transit',
      edge: 'whether a powder that lets children fly to another reality is transportation, magic, trafficking infrastructure, or a strategic material',
      media: 'Peter Pan-style pixie dust enabling flight toward Neverland and other impossible geographies',
      question: 'If pixie dust can let children fly across ordinary geography and into another reality, then it is not cute sparkles; it is unregulated aerospace technology, extradimensional border failure, child-abduction infrastructure, and a strategic substance every government, pirate, fairy court, and criminal network would immediately fight to control.'
    },
    {
      title: 'The Pixie Personhood and Fuel Economy Problem',
      category: 'Sentient resource extraction',
      concept: 'personhood converted into transportation fuel',
      precedent: 'bioresource exploitation, labor coercion, magical species rights, and extraction economies built on living bodies',
      edge: 'whether a sentient species can ethically produce a material that other people consume for mobility, war, and escape',
      media: 'pixies as small intelligent beings whose dust becomes the enabling medium of flight and access',
      question: 'If pixie dust comes from living intelligent pixies, then every flight has a supply-chain question: is dust shed freely, traded, stolen, farmed, taxed, weaponized, or harvested, and does pixie society become a sovereign people or a fuel reserve everyone politely refuses to call exploited?'
    },
    {
      title: 'The Neverland Child-Territory Problem',
      category: 'Minor sovereignty and isolation',
      concept: 'childhood without adult institutions',
      precedent: 'child welfare, missing-child investigations, failed guardianship, isolation psychology, and informal juvenile governance',
      edge: 'whether a land of children without adults is liberation, abandonment, or a governance collapse hidden inside fantasy',
      media: 'Neverland as a real place where children live outside ordinary family, school, law, and medical systems',
      question: 'If Neverland is physically real, then a population of children living beyond adult institutions is not just eternal play; it is a child-welfare nightmare involving missing persons, no courts, no hospitals, no education continuity, no abuse reporting, no safe succession, and no clear way for any child to consent to never growing up.'
    },
    {
      title: 'The Pirate War Against Children Problem',
      category: 'Irregular warfare and minors',
      concept: 'adventure violence as real combat exposure',
      precedent: 'piracy law, hostage-taking, child combatant ethics, maritime violence, and war-crime jurisdiction',
      edge: 'whether whimsical swordplay remains adventure when one side is an armed adult pirate crew and the other side is children',
      media: 'pirates in a Neverland-like world repeatedly fighting, kidnapping, hunting, and threatening children',
      question: 'If the pirates are real adults with weapons and the children are real children, then the conflict is not charming swashbuckling; it is armed adult criminals waging irregular warfare against minors in an extradimensional territory with no police, navy, court, or child-protection agency.'
    },
    {
      title: 'The Eternal Childhood Stasis Problem',
      category: 'Developmental arrest horror',
      concept: 'refusal to grow as metaphysical captivity',
      precedent: 'developmental psychology, trauma bonding, arrested development, and identity formation under isolation',
      edge: 'whether preserving childhood becomes violence when it prevents memory, responsibility, grief, and maturation',
      media: 'a Neverland-like realm where childhood can be prolonged, mythologized, or trapped outside ordinary time',
      question: 'If a world protects childhood by preventing growth, then it may not be preserving innocence; it may be freezing people before they can integrate trauma, form adult identity, consent to their future, mourn properly, or escape the charismatic leader who benefits from keeping everyone young.'
    },
    {
      title: 'The Fairy Geopolitics Problem',
      category: 'Tiny sovereigns with strategic mobility',
      concept: 'small beings as geopolitical superpowers',
      precedent: 'resource sovereignty, asymmetric warfare, controlled airspace, covert movement, and strategic-material monopolies',
      edge: 'whether the smallest political faction becomes the most important if it controls the only reliable means of flight',
      media: 'fairies or pixies controlling dust, flight, access, scouting, and interreality navigation',
      question: 'If fairies control the substance that makes flight and interreality access possible, then their size is irrelevant; they are a strategic mobility cartel, and every pirate captain, crown, military, smuggler, and lost child is dependent on a tiny sovereign power with unclear laws and enormous leverage.'
    },
    {
      title: 'The Anime-Speed Mecha Actuator Problem',
      category: 'Mechanical muscle horror',
      concept: 'humanoid machinery moving with organic agility',
      precedent: 'actuator physics, hydraulics, servo response, material fatigue, impact loading, and control-loop latency',
      edge: 'whether a machine the size of a building can move like a spry human without implying impossible materials and terrifying force output',
      media: 'anime mecha moving, dodging, punching, crouching, sprinting, and recovering with near-human agility',
      question: 'If a giant metal humanoid can move like a spry athlete, the disturbing implication is not just better hydraulics; it means metallic muscles, actuators, joints, and control systems capable of accelerating enormous mass with reaction speeds that would shatter ordinary materials, streets, pilots, and nearby buildings.'
    },
    {
      title: 'The Mecha Pilot G-Force Problem',
      category: 'Human body inside impossible motion',
      concept: 'pilot survivability under humanoid acceleration',
      precedent: 'aviation medicine, crash restraints, vestibular trauma, inertial damping, and high-acceleration injury',
      edge: 'whether the pilot survives only because the cockpit is using technology more impressive than the mech itself',
      media: 'giant robots performing anime-speed dodges, spins, jumps, sword strikes, and emergency stops with a human pilot inside',
      question: 'If the mech moves as fast as it appears to, the pilot should be pulp, concussed, unconscious, or neurologically wrecked unless the cockpit contains absurd inertial management; that means the real super-technology may be the chair, not the giant robot.'
    },
    {
      title: 'The Mecha Ground-Pressure City-Killer Problem',
      category: 'Infrastructure collapse under heroic machines',
      concept: 'weight as environmental violence',
      precedent: 'soil mechanics, pavement loading, bridge ratings, urban infrastructure limits, and seismic vibration',
      edge: 'whether a heroic footstep becomes an infrastructure attack when the machine weighs more than buildings are designed to tolerate',
      media: 'large humanoid combat machines running through cities, docks, bases, roads, bridges, and hangars',
      question: 'If a combat mech has real mass, every step is a municipal engineering event: roads fail, bridges crack, buried utilities rupture, foundations shake, ports deform, and the battlefield becomes unusable simply because the hero machine walked there.'
    },
    {
      title: 'The Mecha Maintenance Nation Problem',
      category: 'Military-industrial logistics',
      concept: 'spectacle weapons as supply-chain empires',
      precedent: 'depot maintenance, spare-parts logistics, military procurement, skilled labor bottlenecks, and operational readiness rates',
      edge: 'whether a weapon can be tactically impressive while strategically devouring the nation that fields it',
      media: 'battlefield mecha treated as deployable military platforms instead of rare national infrastructure projects',
      question: 'If mecha are real combat platforms, then every unit implies factories, rare materials, specialized crews, replacement joints, actuator rebuilds, software updates, pilot medicine, transport ships, ammunition, armor panels, and a budget large enough that losing one might be a national economic event.'
    },
    {
      title: 'The Mecha Heat and Power Rejection Problem',
      category: 'Thermal signature and waste energy',
      concept: 'movement as heat debt',
      precedent: 'thermodynamics, battery density, reactor cooling, hydraulic heat, and infrared detection',
      edge: 'whether a fast giant robot can hide when its waste heat should make it glow like a strategic target',
      media: 'mobile suits or combat mecha sprinting, flying, blocking, firing, and sword-fighting for extended engagements',
      question: 'If a giant robot is moving that much mass that quickly, the power system and waste heat become horrifying: cooling vents, reactor shielding, hydraulic heat, battery density, and infrared signature would be so extreme that the machine might be easier to track by thermal bloom than by radar.'
    },
    {
      title: 'The Mecha Close-Combat Absurdity Problem',
      category: 'Sword fighting with national assets',
      concept: 'ritualized heroism versus sane weapons doctrine',
      precedent: 'combined-arms doctrine, standoff weapons, missile economics, artillery, and risk management for high-value platforms',
      edge: 'whether humanoid melee combat is strategy or a political religion of heroic machines',
      media: 'giant robots using swords, punches, grapples, and close-quarters duels in conflicts with guns, missiles, drones, and artillery',
      question: 'If a mech costs as much as a warship and contains exotic actuators, reactors, pilots, and national prestige, why is anyone letting it sword-fight at arm’s length instead of using standoff weapons, drones, artillery, mines, or every boring tactic that keeps priceless hardware away from punching distance?'
    }
  ];

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[character]));
  }

  function cardHtml(card, index) {
    return `<article class="metaphysics-option pixie-mecha-metaphysics-card"><h3>${index}. ${escapeHtml(card.title)}</h3><p>${escapeHtml(card.question)}</p><small><strong>${escapeHtml(card.category)}</strong><br>Concept: ${escapeHtml(card.concept)}<br>Precedent: ${escapeHtml(card.precedent)}<br>Physics edge: ${escapeHtml(card.edge)}<br>Media lens: ${escapeHtml(card.media)}</small></article>`;
  }

  function injectCards() {
    const options = document.getElementById('metaphysics-options');
    if (!options) return;
    options.querySelectorAll('.pixie-mecha-metaphysics-card').forEach(node => node.remove());
    const start = options.children.length + 1;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = implicationCards.map((card, offset) => cardHtml(card, start + offset)).join('');
    options.append(...Array.from(wrapper.children));
  }

  function addCopyButton() {
    const actions = document.querySelector('.metaphysics-actions');
    if (!actions || document.getElementById('copy-pixie-mecha-cards')) return;
    const button = document.createElement('button');
    button.id = 'copy-pixie-mecha-cards';
    button.className = 'metaphysics-button';
    button.type = 'button';
    button.textContent = 'Copy Pixie/Mecha Cards';
    button.addEventListener('click', async () => {
      const text = implicationCards.map((card, index) => `${index + 1}. ${card.title}\n${card.question}\nCategory: ${card.category}\nConcept: ${card.concept}\nPrecedent: ${card.precedent}\nPhysics edge: ${card.edge}\nMedia lens: ${card.media}`).join('\n\n');
      try { await navigator.clipboard.writeText(text); } catch (_) { /* clipboard may be unavailable */ }
    });
    actions.appendChild(button);
  }

  function addNotice() {
    const note = document.querySelector('#narnia-metaphysics-note') || document.querySelector('.metaphysics-note');
    if (!note || document.getElementById('pixie-mecha-metaphysics-note')) return;
    const extra = document.createElement('p');
    extra.id = 'pixie-mecha-metaphysics-note';
    extra.className = 'metaphysics-note';
    extra.textContent = 'Pixie-dust interreality and mecha-mechanical audit cards are appended after generated batches to keep mobility magic, pirate child warfare, and giant-robot physics in the implication pool.';
    note.insertAdjacentElement('afterend', extra);
  }

  function initialize() {
    addCopyButton();
    addNotice();
    const generate = document.querySelector('[data-generate]');
    if (generate) generate.addEventListener('click', () => window.setTimeout(injectCards, 0));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
