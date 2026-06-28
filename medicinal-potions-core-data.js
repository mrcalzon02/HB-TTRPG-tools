(() => {
  'use strict';
  const packs = globalThis.HBMedicinalPotionDataPacks ||= {};
  const pack = {
  "schemaVersion": "0.2.0",
  "generatorId": "hb-potion-formulary",
  "currencyLabel": "gp",
  "compatibility": {
    "system": "Open d20-compatible homebrew",
    "note": "Minor through Elixir are project potency tiers inspired by open-d20 potion conventions. Medicinal is a weaker, slower, everyday chemical and low-alchemical tier below Minor.",
    "standardPotionVolume": "1 ounce",
    "standardPotionUse": "Single use; higher-tier potions normally take a standard action and act immediately."
  },
  "tiers": [
    {
      "id": "medicinal",
      "label": "Medicinal",
      "rank": 0,
      "weight": 58,
      "baseValue": 4,
      "healingDie": null,
      "reagentCount": [1, 2],
      "baseShelfLifeYears": 1.5,
      "forms": ["remedy", "tea", "tincture", "syrup", "draught", "wash", "salve", "liniment", "powder"],
      "activation": "Usually 1 minute, 10 minutes, or part of a rest; rarely useful as an emergency combat dose.",
      "scope": "Common pain, coughs, fever, stomach trouble, sleep, minor infections, household injuries, and everyday village medicine."
    },
    {
      "id": "minor",
      "label": "Minor",
      "rank": 1,
      "weight": 22,
      "baseValue": 50,
      "healingDie": "1d4",
      "reagentCount": [2, 3],
      "baseShelfLifeYears": 4,
      "forms": ["potion", "cordial", "phial", "tonic"],
      "activation": "Normally a standard action with an immediate magical effect.",
      "scope": "Minor magical healing, short protections, and reliable treatment beyond ordinary medicine."
    },
    {
      "id": "medium",
      "label": "Medium",
      "rank": 2,
      "weight": 12,
      "baseValue": 300,
      "healingDie": "1d6",
      "reagentCount": [3, 4],
      "baseShelfLifeYears": 8,
      "forms": ["potion", "restorative", "compound", "serum"],
      "activation": "Normally a standard action with an immediate or one-round magical effect.",
      "scope": "Serious healing, ordinary disease and poison treatment, and substantial temporary enhancement."
    },
    {
      "id": "major",
      "label": "Major",
      "rank": 3,
      "weight": 6,
      "baseValue": 750,
      "healingDie": "1d10",
      "reagentCount": [4, 5],
      "baseShelfLifeYears": 18,
      "forms": ["greater potion", "grand draught", "serum", "sovereign restorative"],
      "activation": "Normally a standard action; major reconstruction may continue for several rounds.",
      "scope": "Severe trauma, advanced toxins, broken bones, paralysis, and dangerous supernatural conditions."
    },
    {
      "id": "elixir",
      "label": "Elixir",
      "rank": 4,
      "weight": 2,
      "baseValue": 2500,
      "healingDie": "1d20",
      "reagentCount": [5, 7],
      "baseShelfLifeYears": 40,
      "forms": ["elixir", "panacea", "quintessence", "sovereign cure"],
      "activation": "Immediate when safely activated; some formulas permanently alter or reconstruct the patient.",
      "scope": "Extraordinary restoration, regrowth, adaptive cures, and effects beyond ordinary potion manufacture."
    }
  ],
  "qualities": [
    {"id":"adulterated","label":"Adulterated","weight":3,"potency":0.45,"value":0.2,"stability":-5,"shelf":0.35,"risk":0.65,"description":"Substituted ingredients, contamination, or deliberate fraud make the batch unreliable."},
    {"id":"crude","label":"Crude","weight":14,"potency":0.75,"value":0.6,"stability":-2,"shelf":0.7,"risk":0.18,"description":"Useful but harsh medicine produced with rough measurements and poor filtration."},
    {"id":"serviceable","label":"Serviceable","weight":40,"potency":1,"value":1,"stability":0,"shelf":1,"risk":0.04,"description":"Ordinary dependable production suitable for general sale."},
    {"id":"fine","label":"Fine","weight":25,"potency":1.2,"value":1.45,"stability":2,"shelf":1.35,"risk":0.01,"description":"Carefully balanced, cleanly filtered, and consistently dosed."},
    {"id":"superior","label":"Superior","weight":13,"potency":1.45,"value":2.1,"stability":4,"shelf":1.8,"risk":0,"description":"Expert work with unusually pure ingredients and excellent preservation."},
    {"id":"masterwork","label":"Masterwork","weight":5,"potency":1.8,"value":3.5,"stability":7,"shelf":2.6,"risk":0,"description":"A reference-quality batch whose preparation can become a named historical formula."}
  ],
  "originTypes": [
    {"id":"village-healer","label":"Village healer or herbalist","weight":24,"tierWeights":{"medicinal":8,"minor":2,"medium":0.7,"major":0.15,"elixir":0.03},"prestige":0.8,"qualityBias":0,"preferredPreparations":["infusion","decoction","syrup","salve","poultice"],"makerPatterns":["{surname}'s Kitchen Physic","{place} Village Remedies","The {plant} and Pestle"],"productPatterns":["{ingredient} {form}","{effectCommon} Remedy","Old {surname}'s {effectCommon} {form}"],"description":"Plainspoken local medicine built around ingredients people can gather, recognize, and afford."},
    {"id":"apothecary","label":"Town apothecary","weight":22,"tierWeights":{"medicinal":5,"minor":4,"medium":2,"major":0.5,"elixir":0.08},"prestige":1,"qualityBias":1,"preferredPreparations":["tincture","syrup","distillation","suspension","salve"],"makerPatterns":["{surname} & {surname2}, Apothecaries","{place} Amber Bottle","The {color} Mortar"],"productPatterns":["{ingredient} {effectFormal} {form}","{effectFormal} Compound No. {number}","{color} Label {effectCommon} {form}"],"description":"Commercially repeatable remedies with labeled doses, batch marks, and recognizable house formulas."},
    {"id":"physician","label":"Physician or chirurgeon","weight":14,"tierWeights":{"medicinal":4,"minor":3,"medium":2.5,"major":1.2,"elixir":0.15},"prestige":1.2,"qualityBias":1,"preferredPreparations":["tincture","suspension","sterile-distillation","injection-serum"],"makerPatterns":["Doctor {given} {surname}, Chirurgeon","{place} College of Physic","{surname} Clinical Preparations"],"productPatterns":["{effectFormal} Preparation {roman}","{clinicalRoot} Compound {number}","{effectFormal} Standard Formula"],"description":"Clinical preparations named for function, dosage, and repeatable treatment rather than folklore."},
    {"id":"witch","label":"Witch or cunning-worker","weight":12,"tierWeights":{"medicinal":5,"minor":3,"medium":1.8,"major":0.9,"elixir":0.25},"prestige":1.05,"qualityBias":0,"preferredPreparations":["moon-infusion","cauldron-decoction","fermentation","salve","smoke-condensation"],"makerPatterns":["{epithet}'s Crooked Kettle","The {omen} Herb House","{surname} of {place}"],"productPatterns":["{omen} {ingredient} {form}","{animal}'s {effectCommon} {form}","{ingredient} under the {omen} Moon"],"description":"Household chemistry, hedge magic, omens, and locally guarded recipes expressed through symbolic names."},
    {"id":"shaman","label":"Shaman or spirit-healer","weight":9,"tierWeights":{"medicinal":4,"minor":2.5,"medium":1.5,"major":0.8,"elixir":0.25},"prestige":1.05,"qualityBias":0,"preferredPreparations":["ritual-infusion","smoke-condensation","fermentation","stone-boiling"],"makerPatterns":["{animal}-Breath Medicine Lodge","{place} Spirit Medicine","Keeper {given} of the {spirit} Path"],"productPatterns":["{spirit} Walk {form}","{animal}'s {effectCommon} Medicine","{effectCommon} of the {spirit} Path"],"description":"Medicine prepared as a relationship among patient, ingredient, place, ancestor, and invoked spirit."},
    {"id":"monastic","label":"Temple or monastic infirmary","weight":8,"tierWeights":{"medicinal":2.5,"minor":3,"medium":2.5,"major":1.3,"elixir":0.35},"prestige":1.25,"qualityBias":2,"preferredPreparations":["consecrated-infusion","distillation","syrup","reliquary-aging"],"makerPatterns":["Hospice of Saint {saint}","Abbey of the {virtue} Hand","{place} Temple Infirmary"],"productPatterns":["Saint {saint}'s {effectCommon} Cordial","{virtue} {form}","Litany of {effectFormal}"],"description":"Regulated charitable medicine whose formulas are preserved as liturgy, duty, and institutional memory."},
    {"id":"guild","label":"Chartered medicinal guild","weight":6,"tierWeights":{"medicinal":1.8,"minor":3,"medium":3,"major":2,"elixir":0.55},"prestige":1.45,"qualityBias":2,"preferredPreparations":["standardized-distillation","suspension","calcination","sealed-reduction"],"makerPatterns":["{place} Chartered Apothecaries","{surname} & Sons Alchemical Works","Royal College of the {color} Seal"],"productPatterns":["{effectFormal}, Guild Formula {number}","{code}-{number} {form}","{color} Seal {clinicalRoot}"],"description":"Certified formulas, serial numbers, licensed ingredients, and enforceable manufacturing standards."},
    {"id":"military","label":"Military field chirurgery","weight":3,"tierWeights":{"medicinal":1.2,"minor":2.5,"medium":3,"major":2.2,"elixir":0.25},"prestige":1.2,"qualityBias":1,"preferredPreparations":["sterile-distillation","pressure-emulsion","field-tablet","suspension"],"makerPatterns":["{place} Field Chirurgery","{ordinal} Quartermaster Medical Foundry","{color} Banner Medical Corps"],"productPatterns":["Field {code}-{number}","{effectFormal} Service Draught","Campaign Formula {roman}"],"description":"Rugged, fast, standardized treatment designed for transport, triage, and harsh conditions."},
    {"id":"itinerant","label":"Traveling remedy seller","weight":5,"tierWeights":{"medicinal":5,"minor":1.5,"medium":0.5,"major":0.12,"elixir":0.02},"prestige":0.65,"qualityBias":-2,"preferredPreparations":["syrup","tincture","fermentation","powdered-dose"],"makerPatterns":["{epithet}'s Universal Remedy Wagon","Professor {surname}'s Traveling Cabinet","The Marvelous {animal} Company"],"productPatterns":["Universal {virtue} {form}","Genuine {place} {effectCommon} Cure","{epithet}'s Celebrated {ingredient} {form}"],"description":"Popular, aggressively marketed remedies ranging from honest household medicine to spectacular fraud."},
    {"id":"high-alchemist","label":"High alchemical laboratory","weight":2,"tierWeights":{"medicinal":0.3,"minor":1,"medium":2,"major":3,"elixir":2.5},"prestige":2,"qualityBias":3,"preferredPreparations":["fractional-distillation","sublimation","quintessence-binding","sealed-reduction"],"makerPatterns":["{place} Royal Laboratory","The {color} Crucible Collegium","Master {given} {surname}'s Atelier"],"productPatterns":["{clinicalRoot} Quintessence {roman}","{ingredient} Sovereign {form}","The {color} {effectFormal} Elixir"],"description":"Rare, expensive, heavily documented formulas using magical catalysts and precision equipment."}
  ],
  "nameParts": {
    "given":["Alda","Beren","Corin","Dessa","Elian","Fara","Garran","Hesta","Iven","Jora","Marek","Nella","Orin","Pella","Rovan","Sera"],
    "surname":["Amberleaf","Blackroot","Brightwater","Cask","Dawnwell","Fenroot","Greycap","Hart","Ironbloom","Mallow","Reed","Thorne","Vale","Willow"],
    "place":["Alderford","Blackmere","Dun Hollow","Eastwatch","Greyhaven","Highspire","Mossbridge","Redwater","Saint’s Crossing","Westbarrow"],
    "plant":["Willow","Yarrow","Nettle","Feverfew","Comfrey","Thyme","Saffron","Mint"],
    "color":["Amber","Blue","Green","Red","Silver","White","Violet","Black"],
    "epithet":["Auntie Bramble","Old Crow","Mother Moss","Doctor Marvel","Grandmother Ash","Three-Coin Toma","Red-Hand Jory"],
    "omen":["Black Star","Crooked Moon","First Frost","Red Dawn","Silent Bell","Three Crows","Waning Lantern"],
    "animal":["Fox","Hare","Heron","Hound","Moth","Raven","Stag","Wolf"],
    "spirit":["Ash","Cold River","Deep Root","First Fire","Green Wind","Quiet Ancestor","Stone Sleep"],
    "saint":["Orra","Vey","Halden","Mira","Celestine","Brannoc","Ilyra"],
    "virtue":["Merciful","Steady","Open","Healing","Patient","Unbroken","Sheltering"],
    "ordinal":["First","Third","Seventh","Ninth","Twelfth"]
  }
};
  packs.core = pack;
  if (typeof module !== 'undefined' && module.exports) module.exports = pack;
})();