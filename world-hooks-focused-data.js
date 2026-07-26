(() => {
  'use strict';

  window.HBWorldHooksFocusedData = Object.freeze({
    migration: Object.freeze({
      centralMystery: ['Why does every viable destination become uninhabitable shortly before the caravan arrives?', 'Who marked the safest mountain route, and why do the markers move overnight?'],
      initialMystery: ['Scouts find warm fires, fresh wagon tracks, and graves bearing the colonists’ family names ahead of the caravan.', 'A sheltered valley contains exactly enough prepared homes for the arriving families.'],
      fantasyTwist: ['Dwarven ancestral relics become heavier whenever the colony breaks an oath made during the migration.', 'Mountains can be negotiated with, but they consider a century a brief conversation.'],
      limitation: ['The colony must arrive with enough people, tools, livestock, seed, records, and ancestral remains to found a society; merely reaching safety is failure.', 'No Mountain Home is legitimate unless every major clan enters it together.'],
      campaignStructure: ['Each leg contains route selection, weather preparation, a caravan crisis, contact with local inhabitants, and a decision about whether the site could become the Mountain Home.', 'Population, supplies, morale, clan unity, and cultural inheritance persist as campaign resources.'],
      settlementComplication: ['The sheltered valley is the winter calving ground of a migratory people’s only surviving herd.', 'The mountain has perfect stone and geothermal heat, but mining would awaken an old defensive network.'],
      environmentalPressure: ['Deep winter narrows travel to avalanche-prone mountain roads, whiteouts, ice fractures, exhausted draft animals, and blocked switchbacks.', 'Every delay increases the chance that the rear of the caravan is caught by the advancing winter wall.'],
      hiddenTruth: ['The lost Mountain Home was never a place but a covenant among traveling clans.', 'The winter pursuing the caravan follows the colony’s unresolved civil conflict rather than the weather.'],
      stakes: ['The colony may reach safety but scatter its clans, crafts, memories, and obligations across the mountains.', 'Choosing the wrong Mountain Home repeats displacement upon another people.']
    }),
    sunless: Object.freeze({
      centralMystery: ['Why are the oldest bioluminescent species dimming in a pattern resembling a countdown?', 'Why do distant tribes share the same forbidden story about a thing called the sun?'],
      initialMystery: ['A hunter returns with a flower emitting warm white light and shadows in the wrong direction.', 'A whole grove stops glowing, revealing a mural across the cavern ceiling.'],
      fantasyTwist: ['Bioluminescent organisms store memories in their glow, and eating them transfers fragments of experience.', 'Darkness is a competing ecology with its own creatures, crops, and sacred places.'],
      limitation: ['Artificial light attracts a predator that can follow illumination across any distance.', 'Every source of living light requires complete darkness to reproduce.'],
      campaignStructure: ['Each arc follows a changing migration of light-bearing life into a new ecological zone and tribal network.', 'Every expedition moves from illuminated safety through dimlands and into true dark where different rules apply.'],
      settlementComplication: ['The brightest grove is the breeding ground of the region’s light-bearing predators.', 'The cavern is abundant, but its glow cycle belongs to a tribe that navigates by darkness half the year.'],
      environmentalPressure: ['Light blooms and dark tides move like weather fronts, changing heat, visibility, predators, and borders.', 'Bioluminescent forests migrate toward mineral caverns, leaving settlements in lethal darkness.'],
      hiddenTruth: ['The sun still exists, but the living canopy protects the world from something beyond the sky.', 'The darkness is the original habitat; luminous life was introduced and is destabilizing the world.'],
      stakes: ['The loss of living light collapses food webs, trade routes, sacred calendars, and political identities.', 'Artificial illumination may save civilization while making the native ecosystem impossible.']
    }),
    frontier: Object.freeze({
      centralMystery: ['Why have three settlements failed after building on ideal land?', 'What was removed from every official survey of the region?'],
      initialMystery: ['The first well produces clean water and old coins from a kingdom absent from every map.', 'Someone has planted crops using techniques none of the settlers recognize.'],
      fantasyTwist: ['Settlement charters grow new magically binding clauses in response to how a town is governed.', 'Every permanent building attracts a spirit that must be housed, employed, or appeased.'],
      limitation: ['The charter forbids displacing any existing community, including nonhuman and nonverbal inhabitants.', 'The settlement must become self-sustaining before the next supply season without permanently exhausting any resource.'],
      campaignStructure: ['Sessions alternate between exploration beyond the settlement and civic consequences inside it.', 'Every new building unlocks a capability while creating a labor, political, ecological, or defensive burden.'],
      settlementComplication: ['The fertile valley is deliberately flooded by upstream communities under an old treaty.', 'The abandoned town transfers its unresolved debts and enemies to the next occupants.'],
      environmentalPressure: ['The first winter tests drainage, roofing, food preservation, fuel, sanitation, and road maintenance.', 'Seasonal flooding redraws property lines and exposes buried structures with old claimants.'],
      hiddenTruth: ['The frontier was deliberately depopulated by a government expecting its descendants to return.', 'The miraculous resource is waste from an ancient process beginning again.'],
      stakes: ['The settlement becomes a model for coexistence, a warning against expansion, or the first fort of a new empire.', 'Success through displacement teaches later settlers that negotiation was unnecessary.']
    }),
    strange: Object.freeze({
      centralMystery: ['Which law of nature is artificial, and what happens when its machinery stops?', 'Who is editing the constellations, and what message are the new stars spelling?'],
      initialMystery: ['Gravity fails for one room, but only for objects made after a particular year.', 'A doorway opens into the same building at a different age every time it is closed.'],
      fantasyTwist: ['Time is extracted as a resource, enriching cities while surrounding regions age too quickly.', 'The afterlife occupies physical territory and periodically changes borders with the living world.'],
      limitation: ['The world can be repaired only with tools that cease to exist once understood.', 'The party must preserve a contradiction; resolving it collapses one reality.'],
      campaignStructure: ['Each region obeys one altered law that can be learned, exploited, and tied to the larger failure.', 'Every answer reveals that a familiar natural law was once a political or technological decision.'],
      settlementComplication: ['The location exists only while nobody claims it.', 'The site is protected from every known disaster because it is reserved for one unknown disaster.'],
      environmentalPressure: ['The region periodically loses sound, weight, heat, or direction.', 'Distances expand when travelers are uncertain and contract when they agree on a destination.'],
      hiddenTruth: ['The world is not breaking; it is leaving a temporary stabilized state mistaken for nature.', 'Competing cosmologies are backup realities attempting to become primary.'],
      stakes: ['Stabilizing reality preserves current lives but may prevent the world from surviving the next age.', 'One reality becomes permanent while alternate histories become ghosts and ruins.']
    }),
    political: Object.freeze({
      centralMystery: ['Why do treaties signed in different centuries contain the same hidden clause?', 'Which power has been replaced without changing any public institution?'],
      initialMystery: ['A diplomat is murdered carrying three contradictory versions of the same signed treaty.', 'Two enemy armies arrive to defend the same village from one another.'],
      fantasyTwist: ['Laws enforced for a generation become literal laws of nature inside that jurisdiction.', 'Titles possess their holders and force them to repeat the behavior of earlier officeholders.'],
      limitation: ['No faction can be excluded because each controls one necessary part of the peace.', 'Any agreement reached without public consent becomes magically unenforceable after one year.'],
      campaignStructure: ['Each arc centers on an institution whose public function, dependency, beneficiaries, and victims must be understood before it can change.', 'Every alliance grants one capability while making another faction less willing to trust the party.'],
      settlementComplication: ['The site is neutral ground whose settlement would collapse a regional peace system.', 'The land is empty because rival powers agreed to leave it as proof of restraint.'],
      environmentalPressure: ['A shared river, road, or magical current changes course seasonally and moves power with it.', 'Refugee movement changes voting, taxation, military duty, and cultural authority faster than governments adapt.'],
      hiddenTruth: ['The peace treaty is also a containment ritual whose political clauses correspond to physical seals.', 'The enemy blamed for sabotage no longer exists; domestic institutions continued the threat to preserve emergency authority.'],
      stakes: ['Peace becomes more just, becomes openly coercive, or collapses into conflict.', 'The resolution decides whether legitimacy flows from ancestry, law, consent, magic, or material protection.']
    })
  });
})();
