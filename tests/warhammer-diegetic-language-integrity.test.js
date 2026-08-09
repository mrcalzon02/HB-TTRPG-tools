'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');

const files = Object.freeze({
  archive: 'warhammer-40k-archive-ui-v6.js',
  workspace: 'warhammer-40k-workspace-v8.js',
  survey: 'assets/warhammer-40k/system-survey-v1.js',
  assay: 'warhammer-40k-survey-assay-v8.js',
  chronology: 'assets/warhammer-40k/imperial-chronology-v1.js',
  vessel: 'assets/warhammer-40k/imperial-vessel-history-v1.js',
  components: 'assets/warhammer-40k/imperial-component-lineage-v1.js',
  personnel: 'assets/warhammer-40k/imperial-personnel-lineage-v1.js',
  events: 'assets/warhammer-40k/imperial-sector-events-v1.js',
  medicae: 'assets/warhammer-40k/imperial-medicae-institutions-v1.js',
  mercatura: 'assets/warhammer-40k/imperial-mercatura-house-ledger-v1.js'
});

const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [
  key,
  fs.readFileSync(path.join(root, file), 'utf8')
]));
const all = Object.values(source).join('\n');

const forbiddenPlayerFacingPhrases = [
  'Generated Local-System Survey Census',
  'deterministic survey register',
  'Unified Historical Event Seal',
  'Historical Event Cross-Index',
  'Personnel & Command Cross-Index',
  'Cross-indexed professional network',
  'Cross-indexed interventions',
  'Institutional treatment provenance',
  'Major Component Genealogy',
  'System Detail Reference',
  'Navis Cartographica System Detail',
  'Resolving orbital custodians, major relic-component genealogy, period command personnel and unified sector-event seals',
  'Extended lineage register unavailable',
  'The Archivum is comparing the Reddit',
  'Reddit returned',
  'Reddit confirms',
  'No external record was opened',
  'Registered Cafarron examples',
  'Reference basis'
];

for (const phrase of forbiddenPlayerFacingPhrases) {
  if (all.includes(phrase)) throw new Error(`Out-of-universe archive language returned: ${phrase}`);
}

const required = Object.freeze({
  archive: [
    'Imperial Void, Dockyard, Medicae, Chronicle & Mercatura Index',
    'Archivum concordance',
    'Concordant Dockets',
    'Imperial Archive Seal Withheld',
    'Active carriage writs',
    'Renewals within one standard year'
  ],
  workspace: [
    'Navis Contact Dossier',
    'Navis Cartographica Contact Dossier',
    'local-system augur return'
  ],
  survey: [
    'Navis Cartographica Local-System Census',
    'sealed Cartographica writ',
    'Xenobiologis vitality index'
  ],
  chronology: [
    'End of the Plague Wars',
    'ca. 012.M42',
    'Cafarron First Cicatrix Maledictum',
    'Cafarron Corridor Archivum Chronometric Concordance',
    'Terran dates are approximate concordance values'
  ],
  vessel: [
    'Registered Hulls & Service Lineages',
    'Authenticated lineage span',
    'sector chronicle rolls'
  ],
  components: [
    'Adeptus Mechanicus · Relic-Assembly Custody Roll',
    'Donor-Hull & Relic Transfer Lineage',
    'authenticated relic lineage'
  ],
  personnel: [
    'Personnel & Command Concordance',
    'Medicae retention doctrine',
    'Professional concordance'
  ],
  events: [
    'Archivum Historical Concordance Seal',
    'Concordant sector chronicle',
    'participant-local testimony'
  ],
  medicae: [
    'Medicae treatment lineage',
    'Treatment lineage seal',
    'retained-personnel treatment ledger'
  ],
  mercatura: [
    'Navis Mercatura · Chartered House Continuity Roll',
    'Commercial Writs & Factorate Standing',
    'Unseal active carriage writs',
    'Unseal bonded suppliers & counterparties',
    'Unseal major organizational upheavals',
    'Current Mercantile Pressures',
    'Chronometric concordance'
  ]
});

for (const [fileKey, phrases] of Object.entries(required)) {
  for (const phrase of phrases) {
    if (!source[fileKey].includes(phrase)) {
      throw new Error(`${files[fileKey]} lost required diegetic phrase: ${phrase}`);
    }
  }
}

if (source.workspace.includes('wh-vigil-panel')) {
  throw new Error('Deprecated duplicate Passive Vigil panel returned to the workspace source.');
}
if (!source.workspace.includes("showSystemReference(node,records")) {
  throw new Error('Unified Navis Contact Dossier path is missing.');
}

console.log(JSON.stringify({
  checkedFiles: Object.values(files).length,
  forbiddenPhrases: forbiddenPlayerFacingPhrases.length,
  requiredPhrases: Object.values(required).reduce((total, list) => total + list.length, 0),
  navisContactDossierUnified: true,
  chronologyAuthoritySealed: true,
  diegeticArchiveLanguage: true
}, null, 2));
