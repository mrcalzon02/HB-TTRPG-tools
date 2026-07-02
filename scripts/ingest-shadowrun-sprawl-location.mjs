import fs from 'node:fs';
import path from 'node:path';

const body = process.env.ISSUE_BODY_FILE
  ? fs.readFileSync(process.env.ISSUE_BODY_FILE, 'utf8')
  : (process.env.ISSUE_BODY || '');
const marker = '<!-- SHADOWRUN_SPRAWL_LOCATION_PATCH -->';
if (!body.includes(marker)) throw new Error('Missing Shadowrun sprawl location registry marker.');

const match = body.match(/```json\s*([\s\S]*?)```/i);
if (!match) throw new Error('Missing fenced JSON Shadowrun package patch.');

let patch;
try {
  patch = JSON.parse(match[1]);
} catch (error) {
  throw new Error(`Shadowrun package patch is not valid JSON: ${error.message}`);
}

if (patch?.schemaVersion !== '1.1.0') throw new Error('Unsupported Shadowrun package schemaVersion.');
if (patch?.target !== 'data/shadowrun/sprawl_location_registry.json') throw new Error('Shadowrun registry patch target is not allowed.');
if (!/^srpkg-[0-9a-f]{8}$/.test(patch?.packageKey || '')) throw new Error('packageKey must use the srpkg-xxxxxxxx format.');
if (['__proto__', 'constructor', 'prototype'].includes(patch.packageKey)) throw new Error('Forbidden package key.');

const pkg = patch.package;
if (!pkg || typeof pkg !== 'object' || Array.isArray(pkg)) throw new Error('Missing Shadowrun package object.');
if (pkg.schemaVersion !== patch.schemaVersion) throw new Error('Patch and package schema versions must match.');
if (pkg.packageKey !== patch.packageKey) throw new Error('package.packageKey must match patch.packageKey.');
if (!/^srpoi-[0-9a-f]{8}$/.test(pkg.locationKey || '')) throw new Error('locationKey must use the srpoi-xxxxxxxx format.');
if (typeof pkg.generatedAt !== 'string' || Number.isNaN(Date.parse(pkg.generatedAt))) throw new Error('generatedAt must be an ISO-compatible timestamp.');
if (!['balanced', 'corporate', 'street', 'matrix', 'magic', 'security', 'smuggling'].includes(pkg.focus)) throw new Error('focus is invalid.');
if (typeof pkg.focusLabel !== 'string' || pkg.focusLabel.length > 200) throw new Error('focusLabel is invalid.');
if (!['low', 'standard', 'high', 'prime'].includes(pkg.threatProfile)) throw new Error('threatProfile is invalid.');
if (typeof pkg.threatLabel !== 'string' || pkg.threatLabel.length > 200) throw new Error('threatLabel is invalid.');
if (!['low', 'standard', 'high', 'prime'].includes(pkg.effectiveThreat)) throw new Error('effectiveThreat is invalid.');
if (!Number.isFinite(pkg.dangerIntensityPercent) || pkg.dangerIntensityPercent < 0 || pkg.dangerIntensityPercent > 100) throw new Error('dangerIntensityPercent must be between 0 and 100.');

const location = pkg.location;
if (!location || typeof location !== 'object' || Array.isArray(location)) throw new Error('Missing location snapshot.');
if (location.entryKey !== pkg.locationKey) throw new Error('location.entryKey must match package.locationKey.');
if (typeof location.name !== 'string' || !location.name.trim() || location.name.length > 200) throw new Error('location.name is required and must be 200 characters or fewer.');
if (typeof location.address !== 'string' || location.address.length > 500) throw new Error('location.address must be 500 characters or fewer.');
if (!location.coordinates || !Number.isFinite(location.coordinates.lat) || !Number.isFinite(location.coordinates.lng)) throw new Error('Finite coordinates are required.');
if (location.coordinates.lat < -90 || location.coordinates.lat > 90 || location.coordinates.lng < -180 || location.coordinates.lng > 180) throw new Error('Coordinates are outside valid latitude/longitude ranges.');
if (typeof location.sourceCategory !== 'string' || !/^[a-z0-9_]{2,50}$/.test(location.sourceCategory)) throw new Error('sourceCategory is invalid.');
if (!['STANDARD_UNCLAIMED', 'SUPPORTIVE', 'OPT_OUT'].includes(location.workspaceStatus)) throw new Error('workspaceStatus is invalid.');

for (const field of ['sourceCategoryLabel', 'archetypeId', 'archetypeName', 'shadowCategory']) {
  if (typeof location[field] !== 'string' || location[field].length > 240) throw new Error(`${field} is invalid.`);
}
for (const field of ['publicFacade', 'shadowUse', 'accessVector', 'security', 'matrix', 'magical', 'complication']) {
  if (typeof location[field] !== 'string' || location[field].length > 6000) throw new Error(`${field} must be a string of 6000 characters or fewer.`);
}
for (const field of ['mapsUrl', 'streetViewUrl']) {
  if (typeof location[field] !== 'string' || location[field].length > 2000) throw new Error(`${field} is invalid.`);
  if (location[field] && !/^https:\/\/(www\.)?google\.[^/]+\/maps\//i.test(location[field]) && !/^https:\/\/maps\.app\.goo\.gl\//i.test(location[field])) {
    throw new Error(`${field} must be a Google Maps URL.`);
  }
}
for (const field of ['clues', 'legwork']) {
  if (!Array.isArray(location[field]) || location[field].length > 12) throw new Error(`${field} must be an array with no more than 12 entries.`);
  for (const value of location[field]) {
    if (typeof value !== 'string' || value.length > 1000) throw new Error(`${field} contains an invalid value.`);
  }
}
if (!Array.isArray(location.relatedSites) || location.relatedSites.length > 12) throw new Error('relatedSites must be an array with no more than 12 entries.');
for (const related of location.relatedSites) {
  if (!related || typeof related !== 'object' || Array.isArray(related)) throw new Error('A relatedSites entry is invalid.');
  if (typeof related.siteKey !== 'string' || related.siteKey.length > 80) throw new Error('relatedSites.siteKey is invalid.');
  if (typeof related.name !== 'string' || related.name.length > 200) throw new Error('relatedSites.name is invalid.');
  if (typeof related.reason !== 'string' || related.reason.length > 500) throw new Error('relatedSites.reason is invalid.');
}

const targetPath = path.resolve(process.cwd(), patch.target);
const registry = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
if (registry.schemaVersion !== '1.1.0') throw new Error('Target Shadowrun registry is not schema version 1.1.0.');
registry.packages ||= {};

const canonical = value => {
  const copy = structuredClone(value);
  delete copy.submittedFromIssue;
  delete copy.committedAt;
  return JSON.stringify(copy);
};

const existing = registry.packages[patch.packageKey];
if (existing) {
  if (canonical(existing) !== canonical(pkg)) throw new Error(`Shadowrun package ${patch.packageKey} already exists with different immutable content.`);
  console.log(`Shadowrun package ${patch.packageKey} already exists with identical content; no overwrite required.`);
  process.exit(0);
}

registry.packages[patch.packageKey] = {
  ...pkg,
  submittedFromIssue: Number(process.env.ISSUE_NUMBER || 0),
  committedAt: new Date().toISOString()
};
registry.packages = Object.fromEntries(Object.entries(registry.packages).sort(([left], [right]) => left.localeCompare(right)));
fs.writeFileSync(targetPath, `${JSON.stringify(registry, null, 2)}\n`);
console.log(`Validated and stored Shadowrun package ${patch.packageKey}: ${location.name} at ${pkg.dangerIntensityPercent}% danger`);
