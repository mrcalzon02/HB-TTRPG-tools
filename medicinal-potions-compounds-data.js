(() => {
  'use strict';
  const packs = globalThis.HBMedicinalPotionDataPacks ||= {};
  const pack = {
  "bases": [
    {"id":"water","name":"triple-boiled spring water","tags":["universal"],"weight":22,"value":0.8,"stability":0,"shelf":0.7,"flavor":"clean mineral water","smell":"wet stone and steam"},
    {"id":"spirit","name":"purified grain spirit","tags":["antimicrobial","analgesic"],"weight":15,"value":1,"stability":2,"shelf":1.4,"flavor":"a brief alcoholic burn","smell":"clean volatile spirit"},
    {"id":"honey-syrup","name":"medicinal honey syrup","tags":["expectorant","restorative","dermal"],"weight":15,"value":1.05,"stability":1,"shelf":1.2,"flavor":"dark floral sweetness","smell":"warm beeswax"},
    {"id":"vinegar","name":"herbal vinegar","tags":["digestive","antimicrobial","astringent"],"weight":10,"value":0.9,"stability":2,"shelf":1.3,"flavor":"sharp sour vinegar","smell":"brine and cut herbs"},
    {"id":"oil","name":"pressed medicinal seed oil","tags":["dermal","anti-inflammatory"],"weight":10,"value":1,"stability":1,"shelf":1.1,"flavor":"mild nutty oil","smell":"seeds and warm fields"},
    {"id":"wine","name":"fortified herb wine","tags":["circulatory","calming"],"weight":8,"value":1.1,"stability":2,"shelf":1.5,"flavor":"tart wine and tannin","smell":"dark fruit and oak"},
    {"id":"broth","name":"mineral recovery broth","tags":["hydrating","mineral","restorative"],"weight":8,"value":0.85,"stability":-1,"shelf":0.45,"flavor":"savory herbs and salt","smell":"warm stock and roots"},
    {"id":"glycerite","name":"sweet vegetable glycerite","tags":["universal"],"weight":7,"value":1.1,"stability":2,"shelf":1.6,"flavor":"soft neutral sweetness","smell":"faint sugar and clean glass"},
    {"id":"quintessence","name":"bound alchemical quintessence","tags":["adaptive","regenerative","purifying"],"weight":2,"value":3.5,"stability":5,"shelf":3,"minTier":"major","flavor":"an impossible taste that changes with every breath","smell":"ozone, flowers, metal, and nothing at once"}
  ],
  "reagents": [
    {"id":"sea-salt","name":"blue sea salt","tags":["hydrating","mineral"],"weight":12,"value":0.8,"potency":1,"stability":1,"flavor":"mineral salt","smell":"clean sea air"},
    {"id":"charcoal","name":"activated black charcoal","tags":["antitoxin","purifying"],"weight":10,"value":0.9,"potency":1.04,"stability":2,"flavor":"smoky dryness","smell":"cold hearth ash"},
    {"id":"beeswax","name":"yellow beeswax","tags":["dermal","restorative"],"weight":10,"value":0.9,"potency":1,"stability":2,"flavor":"waxy honey","smell":"warm comb and pollen"},
    {"id":"lemon-peel","name":"dried lemon peel","tags":["digestive","antiemetic","stimulant"],"weight":10,"value":0.85,"potency":1.02,"stability":1,"flavor":"bright citrus bitterness","smell":"fresh citrus oil"},
    {"id":"clove","name":"clove oil","tags":["analgesic","antimicrobial"],"weight":8,"value":1,"potency":1.04,"stability":1,"flavor":"hot clove numbness","smell":"clove and warm spice"},
    {"id":"bone-salt","name":"calcined bone salt","tags":["osteogenic","mineral"],"weight":6,"value":1.2,"potency":1.08,"stability":2,"flavor":"chalky mineral dust","smell":"kiln ash and limestone"},
    {"id":"pearl-dust","name":"medicinal pearl dust","tags":["cooling","sensory"],"weight":5,"value":1.4,"potency":1.05,"stability":3,"flavor":"smooth mineral softness","smell":"almost no odor"},
    {"id":"silverleaf","name":"quicksilverleaf flakes","tags":["nervine","sensory","stimulant"],"weight":4,"value":1.5,"potency":1.1,"stability":-1,"flavor":"a metallic spark","smell":"storm air and metal"},
    {"id":"grave-wax","name":"purified grave-wax","tags":["regenerative","restorative"],"weight":3,"value":1.7,"potency":1.12,"stability":4,"flavor":"a persistent waxy finish","smell":"old stone and beeswax"},
    {"id":"blood-amber","name":"blood-amber powder","tags":["circulatory","regenerative","hemostatic"],"weight":3,"value":1.8,"potency":1.14,"stability":1,"flavor":"resin and iron","smell":"hot amber and copper"},
    {"id":"dream-salt","name":"dream salt","tags":["sedative","calming","nervine"],"weight":5,"value":1.3,"potency":1.06,"stability":2,"flavor":"saline sweetness","smell":"distant flowers and cool linen"},
    {"id":"sanctified-ash","name":"sanctified white ash","tags":["purifying","antimicrobial"],"weight":3,"value":1.6,"potency":1.1,"stability":3,"flavor":"clean dry bitterness","smell":"incense ash and sun-warmed stone"},
    {"id":"spider-silk","name":"dissolved white spider silk","tags":["hemostatic","restorative"],"weight":4,"value":1.4,"potency":1.07,"stability":1,"flavor":"nearly tasteless silk protein","smell":"rain and clean cloth"},
    {"id":"ginger-sugar","name":"ginger sugar","tags":["antiemetic","digestive","warming"],"weight":9,"value":0.9,"potency":1.02,"stability":1,"flavor":"sweet ginger heat","smell":"ginger and caramel"}
  ]
};
  packs.compounds = pack;
  if (typeof module !== 'undefined' && module.exports) module.exports = pack;
})();