'use strict';

const path = require('path');
const root = path.resolve(__dirname, '..');

global.window = globalThis;

[
  'assets/warhammer-40k/imperial-logistics-v1.js',
  'assets/warhammer-40k/imperial-vessel-history-v1.js',
  'assets/warhammer-40k/imperial-orbital-infrastructure-v1.js',
  'assets/warhammer-40k/imperial-personnel-lineage-v1.js',
  'assets/warhammer-40k/imperial-medicae-catalog-v1.js',
  'assets/warhammer-40k/imperial-medicae-institutions-v1.js'
].forEach(file => require(path.join(root, file)));

const logistics = globalThis.CafarronImperialLogisticsV1;
const history = globalThis.CafarronVesselHistoryV1;
const infrastructure = globalThis.CafarronOrbitalInfrastructureV1;
const personnel = globalThis.CafarronPersonnelLineageV1;
const medicae = globalThis.CafarronMedicaeInstitutionsV1;

for (const [name, value] of Object.entries({ logistics, history, infrastructure, personnel, medicae })) {
  if (!value) throw new Error(`${name} register did not initialize.`);
}

const personnelCheck = personnel.validate(logistics, history, infrastructure);
if (!personnelCheck.allValid) {
  throw new Error(`Personnel register failed validation: ${JSON.stringify(personnelCheck)}`);
}
if (!personnelCheck.allBiographiesBound || personnelCheck.biographies !== personnelCheck.people) {
  throw new Error(`Biography coverage failed: ${JSON.stringify(personnelCheck)}`);
}
if (personnelCheck.biographyErrors.length) {
  throw new Error(`Biography relationship errors remain: ${personnelCheck.biographyErrors.join(', ')}`);
}

const index = personnel.build(logistics, history, infrastructure);
if (!index.people.length) throw new Error('Personnel register generated no people.');

for (const person of index.people) {
  const biography = personnel.renderBiography;
  if (typeof biography !== 'function') throw new Error('Biography renderer is not exported.');
  if (!person.referenceId || !person.medical?.plausible) throw new Error(`Incomplete person ${person.personId}.`);
}

const medicaeCheck = medicae.validate(logistics, history, infrastructure, personnel);
if (!medicaeCheck.allValid) {
  throw new Error(`Medicae provenance failed validation: ${JSON.stringify(medicaeCheck)}`);
}

console.log(JSON.stringify({
  personnelVersion: personnel.VERSION,
  biographyVersion: personnel.BIOGRAPHY_VERSION,
  people: personnelCheck.people,
  careerOutcomes: personnelCheck.careerOutcomes,
  biographies: personnelCheck.biographies,
  longevityTreatments: personnelCheck.longevityTreatments,
  medicaeProviders: medicaeCheck.providers,
  medicaeProvenanceRecords: medicaeCheck.provenanceRecords
}, null, 2));
