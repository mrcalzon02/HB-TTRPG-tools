#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const packPath = path.join(root, 'data', 'bestiary', 'archive-pack.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function decodePayload(payload) {
  return JSON.parse(zlib.gunzipSync(Buffer.from(payload, 'base64')).toString('utf8'));
}

const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
assert(pack.schemaVersion === '1.0.0', 'Unexpected archive pack schema version.');
assert(pack.encoding === 'gzip-base64', 'Unexpected archive pack encoding.');
assert(pack.payloads?.index && pack.payloads?.mellisande, 'Archive pack payloads are incomplete.');

const index = decodePayload(pack.payloads.index);
const mellisande = decodePayload(pack.payloads.mellisande);

assert(index.schemaVersion === '1.0.0', 'Unexpected bestiary index schema version.');
assert(Array.isArray(index.entries), 'Bestiary entries must be an array.');
assert(index.entries.length === 1000, `Expected 1000 Named Young, found ${index.entries.length}.`);
assert(Array.isArray(index.registers) && index.registers.length === 10, 'Expected ten thematic registers.');

const ids = new Set();
const numbers = new Set();
for (const entry of index.entries) {
  assert(Number.isInteger(entry.archiveNumber), `Archive number is invalid for ${entry.name}.`);
  assert(entry.archiveNumber >= 1 && entry.archiveNumber <= 1000, `Archive number out of range: ${entry.archiveNumber}.`);
  assert(entry.id && entry.name && entry.epithet && entry.summary, `Entry ${entry.archiveNumber} is incomplete.`);
  assert(!ids.has(entry.id), `Duplicate entry ID: ${entry.id}.`);
  assert(!numbers.has(entry.archiveNumber), `Duplicate archive number: ${entry.archiveNumber}.`);
  ids.add(entry.id);
  numbers.add(entry.archiveNumber);
}
for (let number = 1; number <= 1000; number += 1) {
  assert(numbers.has(number), `Archive number ${number} is missing.`);
}

for (const register of index.registers) {
  const entries = index.entries.filter(entry => entry.register === register.id);
  assert(entries.length === 100, `Register ${register.id} expected 100 entries and found ${entries.length}.`);
  assert(register.start === entries[0].archiveNumber, `Register ${register.id} start is inconsistent.`);
  assert(register.end === entries.at(-1).archiveNumber, `Register ${register.id} end is inconsistent.`);
}

const indexMellisande = index.entries.find(entry => entry.archiveNumber === 233);
assert(indexMellisande, 'Mellisande is missing from archive number 233.');
assert(indexMellisande.id === mellisande.id, 'Mellisande index and detail IDs do not match.');
assert(indexMellisande.recordDepth === 'full', 'Mellisande must be marked as a full dossier.');
assert(mellisande.archiveNumber === 233, 'Mellisande detail archive number must be 233.');
assert(mellisande.classification.includes('Outsider'), 'Mellisande classification is missing.');
assert(Array.isArray(mellisande.statBlock) && mellisande.statBlock.length >= 20, 'Mellisande stat block is incomplete.');
assert(Array.isArray(mellisande.sections) && mellisande.sections.length >= 80, 'Mellisande dossier sections are incomplete.');

console.log(`Bestiary validation passed: ${index.entries.length} entries, ${index.registers.length} registers, ${mellisande.sections.length} Mellisande sections.`);
