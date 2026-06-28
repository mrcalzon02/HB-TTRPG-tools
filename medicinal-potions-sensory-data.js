(() => {
  'use strict';
  const packs = globalThis.HBMedicinalPotionDataPacks ||= {};
  const pack = {
  "sensoryProfiles": [
    {"id":"green-bitter","flavor":"intensely bitter green herbs with a dry mineral finish","smell":"crushed wormwood, nettles, and rain-dark soil","tags":["bitter","herbal","earthy"]},
    {"id":"citrus-resin","flavor":"sour citrus peel followed by pine resin and a faint numbing sweetness","smell":"expressed lemon oil, evergreen needles, and hot sap","tags":["sour","resinous","bright"]},
    {"id":"honey-root","flavor":"dark honey, medicinal roots, and peppery warmth","smell":"beeswax, dried roots, and warm spice","tags":["sweet","rooted","warming"]},
    {"id":"mint-cold","flavor":"clean mint that becomes sharply cold across the tongue","smell":"wintergreen, frost, and clean stone","tags":["mint","cold","clean"]},
    {"id":"cherry-iron","flavor":"thick cherry syrup with an unmistakable iron tang","smell":"cooked cherries, copper, and sterile cloth","tags":["fruit","metallic","rich"]},
    {"id":"licorice-smoke","flavor":"black licorice, smoked tea, and bitter charcoal","smell":"anise, hearth smoke, and toasted bark","tags":["anise","smoky","bitter"]},
    {"id":"salt-vinegar","flavor":"salt, vinegar, and cracked pepper with a bracing medicinal bite","smell":"pickling brine, peppercorns, and sharp alcohol","tags":["salty","acidic","sharp"]},
    {"id":"spiced-sugar","flavor":"burnt sugar, cinnamon, and clove over mild medicinal bitterness","smell":"caramelized sugar, clove oil, and warm bread","tags":["sweet","spiced","warm"]},
    {"id":"mushroom-broth","flavor":"savory mushroom broth with mossy and mineral undertones","smell":"dried mushrooms, wet moss, and earthen cellars","tags":["savory","fungal","earthy"]},
    {"id":"rose-chalk","flavor":"rosewater and powdered chalk with a clean floral finish","smell":"dried rose petals, limestone dust, and linen","tags":["floral","dry","clean"]},
    {"id":"berry-numb","flavor":"sweet dark berries followed by spreading numbness","smell":"crushed blackberries, cold air, and faint ozone","tags":["fruit","sweet","numbing"]},
    {"id":"aloe-water","flavor":"cucumber, aloe, and exceptionally clean water","smell":"cut cucumber, fresh aloe, and a nearly scentless mineral note","tags":["fresh","watery","mild"]},
    {"id":"violet-ozone","flavor":"violet flowers with a metallic spark and ozone aftertaste","smell":"violets immediately before a lightning strike","tags":["floral","electric","metallic"]},
    {"id":"ginger-citrus","flavor":"hot ginger, lemon peel, and a clean sweet finish","smell":"fresh ginger, citrus oil, and warm steam","tags":["spicy","bright","warming"]},
    {"id":"savory-salt","flavor":"light broth, mineral salt, and dried garden herbs","smell":"warm stock, celery leaf, and clean salt","tags":["savory","mineral","mild"]},
    {"id":"adaptive-neutral","flavor":"a mild taste that slowly resembles the drinker's preferred comfort food","smell":"a quiet familiar aroma unique to the intended patient","tags":["adaptive","mild","comforting"]}
  ],
  "ingredients": [
    {"id":"willow-bark","name":"white willow bark","tags":["analgesic","anti-inflammatory"],"sensory":"licorice-smoke","rarity":"Common","value":0.8,"stability":1},
    {"id":"feverfew","name":"frost feverfew","tags":["cooling","anti-inflammatory"],"sensory":"mint-cold","rarity":"Common","value":0.85,"stability":1},
    {"id":"ginger-root","name":"red ginger root","tags":["antiemetic","digestive","warming"],"sensory":"ginger-citrus","rarity":"Common","value":0.75,"stability":1},
    {"id":"honey-thyme","name":"honey thyme","tags":["expectorant","antimicrobial","warming"],"sensory":"honey-root","rarity":"Common","value":0.8,"stability":1},
    {"id":"moon-poppy","name":"moon-poppy milk","tags":["sedative","analgesic"],"sensory":"rose-chalk","rarity":"Controlled","value":1.3,"stability":-1},
    {"id":"peppermint","name":"river peppermint","tags":["digestive","antiemetic","cooling"],"sensory":"mint-cold","rarity":"Common","value":0.7,"stability":0},
    {"id":"yarrow","name":"red yarrow","tags":["hemostatic","astringent","circulatory"],"sensory":"cherry-iron","rarity":"Common","value":0.9,"stability":1},
    {"id":"glass-aloe","name":"glass aloe","tags":["dermal","cooling","restorative"],"sensory":"aloe-water","rarity":"Common","value":0.9,"stability":0},
    {"id":"saintberry","name":"saintberry","tags":["restorative","antimicrobial","dermal"],"sensory":"berry-numb","rarity":"Uncommon","value":1.2,"stability":1},
    {"id":"wormwood","name":"black wormwood","tags":["antiparasitic","bitter","digestive"],"sensory":"green-bitter","rarity":"Common","value":0.8,"stability":2},
    {"id":"chamomile","name":"gold chamomile","tags":["calming","sedative","antispasmodic"],"sensory":"spiced-sugar","rarity":"Common","value":0.75,"stability":0},
    {"id":"nettle","name":"iron nettle","tags":["mineral","circulatory","stimulant"],"sensory":"green-bitter","rarity":"Common","value":0.7,"stability":2},
    {"id":"comfrey","name":"knitbone comfrey","tags":["osteogenic","restorative","dermal"],"sensory":"mushroom-broth","rarity":"Uncommon","value":1.25,"stability":1},
    {"id":"milk-thistle","name":"silver milk-thistle","tags":["antitoxin","purifying","digestive"],"sensory":"green-bitter","rarity":"Uncommon","value":1.2,"stability":2},
    {"id":"storm-mint","name":"storm-mint","tags":["nervine","sensory","stimulant"],"sensory":"violet-ozone","rarity":"Uncommon","value":1.35,"stability":0},
    {"id":"marrow-moss","name":"marrow moss","tags":["osteogenic","circulatory","restorative"],"sensory":"mushroom-broth","rarity":"Rare","value":1.6,"stability":2},
    {"id":"memory-coral","name":"powdered memory coral","tags":["nervine","sensory","restorative"],"sensory":"salt-vinegar","rarity":"Rare","value":1.9,"stability":3},
    {"id":"dawn-salt","name":"consecrated dawn salt","tags":["purifying","antitoxin","antimicrobial"],"sensory":"citrus-resin","rarity":"Rare","value":2,"stability":4},
    {"id":"phoenix-saffron","name":"phoenix saffron","tags":["regenerative","restorative","circulatory"],"sensory":"spiced-sugar","rarity":"Very rare","value":2.8,"stability":2},
    {"id":"mimic-nectar","name":"adaptive mimic nectar","tags":["adaptive","regenerative","purifying"],"sensory":"adaptive-neutral","rarity":"Legendary","value":4.5,"stability":5}
  ]
};
  packs.sensory = pack;
  if (typeof module !== 'undefined' && module.exports) module.exports = pack;
})();