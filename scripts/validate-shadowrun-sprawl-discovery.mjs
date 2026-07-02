import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const root = process.cwd();
const engine = require(path.join(root, 'shadowrun-sprawl-discovery-engine.js'));
const outputPath = path.resolve(root, process.argv[2] || 'artifacts/shadowrun-sprawl-discovery-verification.json');
const checks = [];

function check(condition, message) {
  if (!condition) throw new Error(message);
  checks.push(message);
}

const input = {
  seed: 'static-shadowrun-sprawl-stage-1',
  label: 'Seattle - Pioneer Square',
  lat: 47.6016,
  lng: -122.3334,
  radiusMeters: 1100,
  count: 10,
  focus: 'matrix',
  threat: 'high'
};

const first = engine.generateSprawlDiscovery(input);
const second = engine.generateSprawlDiscovery(input);
const alternate = engine.generateSprawlDiscovery({ ...input, seed: 'alternate-shadowrun-sprawl-stage-1' });

check(engine.version === '1.0.0', 'engine exposes schema version 1.0.0');
check(JSON.stringify(first) === JSON.stringify(second), 'same input produces identical discovery package');
check(first.packageKey !== alternate.packageKey, 'different seed changes discovery package identity');
check(first.schemaVersion === '1.0.0' && first.module === 'shadowrun-sprawl-street-view-discovery', 'discovery package declares the expected schema and module');
check(first.sites.length === input.count, 'requested site count is honored');
check(new Set(first.sites.map(site => site.siteKey)).size === first.sites.length, 'site keys are unique');
check(new Set(first.sites.map(site => site.category)).size >= 5, 'site mix spans at least five categories');
check(first.sites.every(site => site.distanceMeters <= input.radiusMeters + 25), 'generated sites remain inside the requested radius');
check(first.sites.every(site => site.mapsUrl.includes('google.com/maps') && site.streetViewUrl.includes('map_action=pano')), 'every site exposes Maps and Street View links');
check(first.sites.every(site => site.clues.length === 2 && site.legwork.length === 2 && site.relatedSites.length === 2), 'every site contains clues, legwork, and related nearby sites');

const validation = engine.validateDiscoveryPackage(first);
check(validation.valid, `package validator accepts generated package: ${validation.failures.join(', ')}`);

const parsedAt = engine.parseCoordinates('https://www.google.com/maps/@47.610001,-122.330002,3a,75y');
const parsedViewpoint = engine.parseCoordinates('https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=47.620001,-122.340002');
const parsedPlain = engine.parseCoordinates('47.630001, -122.350002');
check(parsedAt.lat === 47.610001 && parsedAt.lng === -122.330002, 'parser reads @lat,lng map URLs');
check(parsedViewpoint.lat === 47.620001 && parsedViewpoint.lng === -122.340002, 'parser reads Street View viewpoint URLs');
check(parsedPlain.lat === 47.630001 && parsedPlain.lng === -122.350002, 'parser reads plain coordinate input');

const geojson = engine.buildGeoJson(first);
const kml = engine.buildKml(first);
check(geojson.type === 'FeatureCollection' && geojson.features.length === first.sites.length, 'GeoJSON export includes every site');
check(kml.includes('<kml') && (kml.match(/<Placemark>/g) || []).length === first.sites.length, 'KML export includes every site');

const entry = fs.readFileSync(path.join(root, 'shadowrun-entry.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'shadowrun-sprawl-discovery.js'), 'utf8');
const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
check(entry.includes('shadowrun-sprawl-discovery-engine.js') && entry.includes('shadowrun-sprawl-discovery.js'), 'Shadowrun entry lazy-loads the discovery engine and panel');
check(entry.includes('data-shadowrun-open="${esc(module[3])}"') && entry.includes('Open Discovery'), 'Shadowrun module card opens the discovery tool');
check(ui.includes('window.ShadowrunSprawlDiscoveryEngine') && ui.includes('data-sr-discovery-generate'), 'browser panel consumes the discovery engine and exposes generate controls');
check(!index.includes('shadowrun-sprawl-discovery-engine.js') && !index.includes('shadowrun-sprawl-discovery.js'), 'discovery scripts are not eagerly loaded from index.html');

const receipt = {
  receiptType: 'shadowrunSprawlDiscoveryValidationSummary',
  schemaVersion: '1.0.0',
  result: 'passed',
  checks,
  packageKey: first.packageKey,
  siteCount: first.sites.length,
  categories: first.summary.categories,
  nearestSiteKey: first.summary.nearestSiteKey,
  exports: {
    geojsonFeatures: geojson.features.length,
    kmlPlacemarks: (kml.match(/<Placemark>/g) || []).length
  }
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(receipt, null, 2)}\n`);
console.log('Shadowrun Sprawl Discovery validation passed.');
