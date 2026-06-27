import fs from 'node:fs';
import path from 'node:path';

const body = process.env.ISSUE_BODY_FILE
  ? fs.readFileSync(process.env.ISSUE_BODY_FILE, 'utf8')
  : (process.env.ISSUE_BODY || '');
const marker = '<!-- WOD_POI_REGISTRY_PATCH -->';
if (!body.includes(marker)) throw new Error('Missing Chronicle Spatial Engine registry marker.');

const match = body.match(/```json\s*([\s\S]*?)```/i);
if (!match) throw new Error('Missing fenced JSON registry patch.');

let patch;
try {
  patch = JSON.parse(match[1]);
} catch (error) {
  throw new Error(`Registry patch is not valid JSON: ${error.message}`);
}

if (patch?.schemaVersion !== '1.0.0') throw new Error('Unsupported registry patch schemaVersion.');
if (patch?.target !== 'data/world-of-darkness/poi_registry.json') throw new Error('Registry patch target is not allowed.');
if (!/^gmaps-[0-9a-f]{8}$/.test(patch?.entryKey || '')) throw new Error('entryKey must use the gmaps-xxxxxxxx format.');
if (['__proto__', 'constructor', 'prototype'].includes(patch.entryKey)) throw new Error('Forbidden entry key.');

const entry = patch.entry;
if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Missing registry entry.');
if (entry.place_id !== patch.entryKey) throw new Error('entry.place_id must match entryKey.');
if (typeof entry.place_name !== 'string' || !entry.place_name.trim() || entry.place_name.length > 200) throw new Error('place_name is required and must be 200 characters or fewer.');
if (typeof entry.formatted_address !== 'string' || entry.formatted_address.length > 500) throw new Error('formatted_address must be 500 characters or fewer.');
if (typeof entry.google_maps_url !== 'string' || entry.google_maps_url.length > 2000) throw new Error('google_maps_url must be 2000 characters or fewer.');
if (entry.google_maps_url && !/^https:\/\/(www\.)?google\.[^/]+\/maps\//i.test(entry.google_maps_url) && !/^https:\/\/maps\.app\.goo\.gl\//i.test(entry.google_maps_url)) {
  throw new Error('google_maps_url must be a Google Maps URL.');
}
if (typeof entry.primary_type !== 'string' || !/^[a-z0-9_]{2,50}$/.test(entry.primary_type)) throw new Error('primary_type is invalid.');
if (!entry.coordinates || !Number.isFinite(entry.coordinates.lat) || !Number.isFinite(entry.coordinates.lng)) throw new Error('Finite coordinates are required.');
if (entry.coordinates.lat < -90 || entry.coordinates.lat > 90 || entry.coordinates.lng < -180 || entry.coordinates.lng > 180) throw new Error('Coordinates are outside valid latitude/longitude ranges.');
if (!['STANDARD_UNCLAIMED', 'SUPPORTIVE', 'OPT_OUT'].includes(entry.veil_interaction)) throw new Error('veil_interaction is invalid.');
if (typeof entry.claimed !== 'boolean' || typeof entry.opt_out !== 'boolean') throw new Error('claimed and opt_out must be booleans.');
if (entry.opt_out !== (entry.veil_interaction === 'OPT_OUT')) throw new Error('opt_out must agree with veil_interaction.');
if (!entry.submitted_lore || typeof entry.submitted_lore !== 'object' || Array.isArray(entry.submitted_lore)) throw new Error('submitted_lore must be an object.');
for (const [key, value] of Object.entries(entry.submitted_lore)) {
  if (!['publicFacade', 'hiddenFunction'].includes(key)) throw new Error(`Unsupported submitted_lore field: ${key}`);
  if (typeof value !== 'string' || value.length > 6000) throw new Error(`${key} must be a string of 6000 characters or fewer.`);
}
if (typeof entry.spatial_token !== 'string' || entry.spatial_token.length > 500) throw new Error('spatial_token is invalid.');
if (!Number.isInteger(entry.deterministic_seed) || entry.deterministic_seed < 0 || entry.deterministic_seed > 0xffffffff) throw new Error('deterministic_seed must be an unsigned 32-bit integer.');

const targetPath = path.resolve(process.cwd(), patch.target);
const registry = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
registry.entries ||= {};
registry.entries[patch.entryKey] = {
  ...entry,
  submitted_from_issue: Number(process.env.ISSUE_NUMBER || 0),
  committed_at: new Date().toISOString()
};
registry.entries = Object.fromEntries(Object.entries(registry.entries).sort(([a], [b]) => a.localeCompare(b)));
fs.writeFileSync(targetPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Validated and stored ${patch.entryKey}: ${entry.place_name}`);
