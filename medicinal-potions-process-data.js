(() => {
  'use strict';
  const packs = globalThis.HBMedicinalPotionDataPacks ||= {};
  const pack = {
  "preparations": [
    {
      "id": "infusion",
      "label": "hot infusion",
      "minTier": "medicinal",
      "weight": 15,
      "shelf": 0.55,
      "stability": -1,
      "magic": 0,
      "states": [
        "liquid"
      ],
      "description": "The ingredients are steeped below a boil and strained."
    },
    {
      "id": "decoction",
      "label": "root decoction",
      "minTier": "medicinal",
      "weight": 13,
      "shelf": 0.8,
      "stability": 0,
      "magic": 0,
      "states": [
        "liquid",
        "syrup"
      ],
      "description": "Hard roots and bark are simmered down to a concentrated liquid."
    },
    {
      "id": "syrup",
      "label": "reduced medicinal syrup",
      "minTier": "medicinal",
      "weight": 12,
      "shelf": 1.1,
      "stability": 1,
      "magic": 0,
      "states": [
        "syrup"
      ],
      "description": "The active liquid is reduced with honey or sugar to preserve and dose it."
    },
    {
      "id": "tincture",
      "label": "alcohol tincture",
      "minTier": "medicinal",
      "weight": 12,
      "shelf": 1.5,
      "stability": 2,
      "magic": 0,
      "states": [
        "liquid"
      ],
      "description": "The ingredients are extracted in purified spirit for a stable concentrated dose."
    },
    {
      "id": "salve",
      "label": "wax-bound salve",
      "minTier": "medicinal",
      "weight": 10,
      "shelf": 1.2,
      "stability": 2,
      "magic": 0,
      "states": [
        "salve"
      ],
      "description": "The active compounds are suspended in oil and wax for external application."
    },
    {
      "id": "fermentation",
      "label": "controlled fermentation",
      "minTier": "medicinal",
      "weight": 7,
      "shelf": 1.3,
      "stability": 0,
      "magic": 0,
      "states": [
        "liquid",
        "syrup"
      ],
      "description": "A living fermentation transforms the ingredients before filtration."
    },
    {
      "id": "distillation",
      "label": "single alchemical distillation",
      "minTier": "minor",
      "weight": 10,
      "shelf": 1.8,
      "stability": 2,
      "magic": 1,
      "states": [
        "liquid"
      ],
      "description": "Volatile and magical fractions are separated and recombined."
    },
    {
      "id": "sterile-distillation",
      "label": "sterile fractional distillation",
      "minTier": "medium",
      "weight": 8,
      "shelf": 2.1,
      "stability": 3,
      "magic": 1,
      "states": [
        "liquid"
      ],
      "description": "Repeated sterile distillation removes contaminants and unstable fractions."
    },
    {
      "id": "sealed-reduction",
      "label": "sealed low-heat reduction",
      "minTier": "medium",
      "weight": 7,
      "shelf": 2.4,
      "stability": 4,
      "magic": 1,
      "states": [
        "syrup",
        "resin"
      ],
      "description": "The formula is concentrated without exposing it to air or ambient magic."
    },
    {
      "id": "calcination",
      "label": "calcination and reconstitution",
      "minTier": "medium",
      "weight": 5,
      "shelf": 2.8,
      "stability": 4,
      "magic": 1,
      "states": [
        "suspension"
      ],
      "description": "The ingredients are reduced to ash, purified, and reconstituted in a carrier."
    },
    {
      "id": "sublimation",
      "label": "thaumic sublimation",
      "minTier": "major",
      "weight": 4,
      "shelf": 3.2,
      "stability": 5,
      "magic": 2,
      "states": [
        "liquid",
        "crystal suspension"
      ],
      "description": "The active magical principle is vaporized and condensed into a purified medium."
    },
    {
      "id": "quintessence-binding",
      "label": "quintessence binding",
      "minTier": "elixir",
      "weight": 2,
      "shelf": 5,
      "stability": 7,
      "magic": 4,
      "states": [
        "liquid",
        "living suspension"
      ],
      "description": "A responsive magical essence is bound to the formula and keyed to living tissue."
    }
  ],
  "activators": [
    {
      "id": "body-heat",
      "name": "body heat",
      "minTier": "medicinal",
      "weight": 18,
      "tags": [
        "universal"
      ],
      "potency": 1,
      "stability": 0,
      "shelf": 1,
      "magic": 0,
      "risk": 0,
      "instruction": "Swallow or apply and allow living body heat to release the active compounds."
    },
    {
      "id": "hot-water",
      "name": "fresh hot water",
      "minTier": "medicinal",
      "weight": 15,
      "tags": [
        "digestive",
        "expectorant",
        "calming",
        "sedative"
      ],
      "potency": 1,
      "stability": -1,
      "shelf": 0.8,
      "magic": 0,
      "risk": 0,
      "instruction": "Reconstitute the dose in hot water immediately before use."
    },
    {
      "id": "shaking",
      "name": "vigorous shaking",
      "minTier": "medicinal",
      "weight": 12,
      "tags": [
        "universal"
      ],
      "potency": 1.02,
      "stability": 0,
      "shelf": 1,
      "magic": 0,
      "risk": 0.01,
      "instruction": "Shake for three breaths to recombine the settled suspension."
    },
    {
      "id": "acid",
      "name": "a drop of citrus acid",
      "minTier": "medicinal",
      "weight": 8,
      "tags": [
        "digestive",
        "antiemetic",
        "antitoxin"
      ],
      "potency": 1.04,
      "stability": 0,
      "shelf": 1,
      "magic": 0,
      "risk": 0.01,
      "instruction": "Add one drop of citrus acid to release the bound salts."
    },
    {
      "id": "silver-bead",
      "name": "dissolving silver catalyst bead",
      "minTier": "minor",
      "weight": 8,
      "tags": [
        "antitoxin",
        "purifying",
        "antimicrobial"
      ],
      "potency": 1.08,
      "stability": 2,
      "shelf": 1.3,
      "magic": 1,
      "risk": 0,
      "instruction": "Unseal the bottle and wait for the suspended silver bead to dissolve."
    },
    {
      "id": "spark",
      "name": "contained alchemical spark",
      "minTier": "medium",
      "weight": 6,
      "tags": [
        "nervine",
        "sensory",
        "stimulant"
      ],
      "potency": 1.1,
      "stability": -1,
      "shelf": 1.1,
      "magic": 2,
      "risk": 0.04,
      "instruction": "Break the inner ampoule to release the activating spark."
    },
    {
      "id": "spoken-key",
      "name": "spoken sympathetic key",
      "minTier": "major",
      "weight": 4,
      "tags": [
        "purifying",
        "regenerative",
        "adaptive"
      ],
      "potency": 1.12,
      "stability": 2,
      "shelf": 1.4,
      "magic": 2,
      "risk": 0.02,
      "instruction": "Speak the patient's full name over the open bottle before dosing."
    },
    {
      "id": "blood-key",
      "name": "patient blood key",
      "minTier": "major",
      "weight": 3,
      "tags": [
        "regenerative",
        "adaptive",
        "circulatory"
      ],
      "potency": 1.18,
      "stability": 0,
      "shelf": 1.1,
      "magic": 3,
      "risk": 0.08,
      "instruction": "Add one fresh drop of the patient's blood and wait for the formula to change color."
    },
    {
      "id": "moonlight",
      "name": "direct moonlight",
      "minTier": "minor",
      "weight": 5,
      "tags": [
        "sedative",
        "calming",
        "nervine"
      ],
      "potency": 1.07,
      "stability": 1,
      "shelf": 1.2,
      "magic": 1,
      "risk": 0,
      "instruction": "Expose the sealed vial to moonlight for one minute before use."
    },
    {
      "id": "self-awakening",
      "name": "self-awakening quintessence",
      "minTier": "elixir",
      "weight": 2,
      "tags": [
        "adaptive",
        "regenerative",
        "purifying"
      ],
      "potency": 1.25,
      "stability": 5,
      "shelf": 2,
      "magic": 4,
      "risk": 0.03,
      "instruction": "The elixir awakens when held by a living intended patient."
    }
  ]
};
  packs.process = pack;
  if (typeof module !== 'undefined' && module.exports) module.exports = pack;
})();