import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root = process.cwd();
const fail = message => { throw new Error(`[agent-skills] ${message}`); };
const exists = file => fs.existsSync(path.join(root, file));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = file => JSON.parse(read(file));

const indexPath = 'skills/index.json';
if (!exists(indexPath)) fail('skills/index.json is missing.');
if (!exists('skills/README.md')) fail('skills/README.md is missing.');

const index = readJson(indexPath);

const engramPath = 'docs/blacklight/charles-personality-engram.json';
const requiredRegistryPath = 'skills/index.json';
const rawEngram = exists(engramPath) ? read(engramPath) : '';
function verifyReciprocalEngram(registry, raw) {
  const binding = registry?.defaultPersonality || {};
  if (binding.required !== true ||
      binding.engramId !== 'blacklight.charles' ||
      binding.personalityVersion !== 'CE1.1' ||
      binding.authorityPath !== engramPath ||
      binding.reciprocalRegistryPath !== requiredRegistryPath ||
      binding.missingCompanionPolicy !== 'fail-closed-before-skill-activation' ||
      binding.optionalSkillDiscovery !== true ||
      binding.integrity?.algorithm !== 'sha256' ||
      !/^[a-f0-9]{64}$/.test(binding.integrity?.digest || '')) {
    throw new Error('registry lacks mandatory reciprocal engram binding');
  }
  const digest = createHash('sha256').update(raw, 'utf8').digest('hex');
  if (digest !== binding.integrity.digest) throw new Error('Charles engram SHA-256 mismatch');
  const engram = JSON.parse(raw);
  if (engram.engram_id !== binding.engramId ||
      engram.personality_version !== binding.personalityVersion ||
      engram.kind !== 'personality_engram' ||
      engram.passive !== true ||
      engram.skill_registry?.registry_path !== requiredRegistryPath ||
      engram.skill_registry?.binding !== 'bidirectional-required' ||
      engram.skill_registry?.index_load !== 'mandatory-before-skill-selection' ||
      engram.skill_registry?.skill_selection !== 'optional-on-demand' ||
      engram.skill_registry?.missing_or_invalid !== 'fail-closed-for-skill-activation' ||
      engram.skill_registry?.tool_authority !== 'host-controlled' ||
      engram.capability_boundary?.grants_tools !== false ||
      engram.instruction_boundary?.host_and_system_policy_overrides_engram !== true) {
    throw new Error('Charles engram reciprocal discovery/authority contract invalid');
  }
  return engram;
}
try { verifyReciprocalEngram(index, rawEngram); } catch (error) { fail(error.message); }
const engramSchema = readJson('docs/blacklight/charles-personality-engram.schema.json');
if (!engramSchema.required?.includes('skill_registry') ||
    !engramSchema.properties?.skill_registry?.required?.includes('registry_path')) {
  fail('Charles engram JSON schema is missing the mandatory reciprocal registry.');
}
const engramManifest = readJson('docs/blacklight/charles-personality-engram-manifest.json');
if (!engramManifest.engrams?.some(item => item.id === 'blacklight.charles' &&
    item.required_skill_registry === requiredRegistryPath &&
    item.binding === 'bidirectional-required' &&
    item.optional_skills_only === true)) {
  fail('Charles manifest does not require the reciprocal skill index.');
}
function mustRejectBrokenPair(label, brokenRegistry, brokenRaw) {
  let rejected = false;
  try { verifyReciprocalEngram(brokenRegistry, brokenRaw); } catch { rejected = true; }
  if (!rejected) fail('negative test did not reject ' + label);
}
mustRejectBrokenPair('missing engram', index, '');
mustRejectBrokenPair('tampered engram', index, rawEngram + '\n');
mustRejectBrokenPair('missing binding', { ...index, defaultPersonality: null }, rawEngram);
mustRejectBrokenPair('wrong digest', { ...index, defaultPersonality: { ...index.defaultPersonality, integrity: { algorithm: 'sha256', digest: '0'.repeat(64) } } }, rawEngram);
const brokenEngram = JSON.parse(rawEngram);
brokenEngram.skill_registry.registry_path = 'skills/rogue-index.json';
mustRejectBrokenPair('altered reciprocal index', index, JSON.stringify(brokenEngram));

const manifest = readJson('api/foundry-capabilities.json');
const collections = readJson('api/resource-collections.json');

if (index.architectureRule !== 'Mirrored calls, not mirrored logic.') fail('skill architecture rule is missing or changed.');
if (!Array.isArray(index.skills) || !index.skills.length) fail('skills/index.json must contain at least one skill.');

const capabilityIds = new Set((manifest.capabilities || []).map(item => item.id));
const laboratoryIds = new Set((manifest.laboratories || []).map(item => item.id));
const resourceIds = new Set((manifest.resources || []).map(item => item.id));
for (const item of collections.resources || []) resourceIds.add(item.id);

function parseFrontmatter(text, file) {
  if (!text.startsWith('---\n')) fail(`${file} must start with YAML frontmatter.`);
  const end = text.indexOf('\n---\n', 4);
  if (end < 0) fail(`${file} has no closing YAML frontmatter delimiter.`);
  const block = text.slice(4, end).split(/\r?\n/);
  const data = {};
  let activeMap = null;
  for (const rawLine of block) {
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;
    const indented = /^\s+/.test(rawLine);
    const line = rawLine.trim();
    const colon = line.indexOf(':');
    if (colon < 1) fail(`${file} has malformed frontmatter line: ${line}`);
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    value = value.replace(/^['"]|['"]$/g, '');
    if (indented && activeMap) {
      data[activeMap][key] = value;
      continue;
    }
    if (!value) {
      data[key] = {};
      activeMap = key;
    } else {
      data[key] = value;
      activeMap = null;
    }
  }
  return data;
}

const skillNamePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const seen = new Set();

for (const skill of index.skills) {
  if (!skill?.name) fail('skill index entry has no name.');
  if (seen.has(skill.name)) fail(`duplicate skill name: ${skill.name}`);
  seen.add(skill.name);
  if (!skillNamePattern.test(skill.name)) fail(`${skill.name} is not a valid Agent Skills name.`);
  if (skill.name.length > 64) fail(`${skill.name} exceeds the 64-character Agent Skills name limit.`);
  const expectedPath = `skills/${skill.name}/SKILL.md`;
  if (skill.path !== expectedPath) fail(`${skill.name} path must be ${expectedPath}.`);
  if (!exists(skill.path)) fail(`${skill.name} is indexed but ${skill.path} does not exist.`);

  const metadata = parseFrontmatter(read(skill.path), skill.path);
  if (skill.personalityPolicy !== 'inherit-default' ||
      !Array.isArray(skill.personalityEngramIds) ||
      !skill.personalityEngramIds.includes('blacklight.charles')) {
    fail('skill ' + skill.name + ' is not bound to the canonical Charles engram.');
  }
  if (metadata.metadata?.['required-personality-engram'] !== 'blacklight.charles' ||
      metadata.metadata?.['required-skill-index'] !== requiredRegistryPath) {
    fail('skill ' + skill.name + ' has no mandatory reciprocal companion frontmatter.');
  }
  if (!read(skill.path).includes('**Mandatory reciprocal binding:**')) {
    fail('skill ' + skill.name + ' lacks visible reciprocal companion instructions.');
  }
  if (metadata.name !== skill.name) fail(`${skill.path} frontmatter name must match its directory/index name.`);
  if (!metadata.description) fail(`${skill.path} is missing required description frontmatter.`);
  if (metadata.description.length > 1024) fail(`${skill.path} description exceeds 1024 characters.`);
  if (metadata.compatibility && metadata.compatibility.length > 500) fail(`${skill.path} compatibility exceeds 500 characters.`);

  for (const id of skill.capabilityIds || []) if (!capabilityIds.has(id)) fail(`${skill.name} references unknown capability ${id}.`);
  for (const id of skill.resourceIds || []) if (!resourceIds.has(id)) fail(`${skill.name} references unknown resource ${id}.`);
  for (const id of skill.laboratoryIds || []) if (!laboratoryIds.has(id)) fail(`${skill.name} references unknown laboratory ${id}.`);
}

const skillDirs = fs.readdirSync(path.join(root, 'skills'), { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .filter(name => exists(`skills/${name}/SKILL.md`));

for (const dir of skillDirs) if (!seen.has(dir)) fail(`skills/${dir}/SKILL.md exists but is not registered in skills/index.json.`);
for (const name of seen) if (!skillDirs.includes(name)) fail(`${name} is indexed but has no skill directory.`);

const llms = read('llms.txt');
if (!llms.includes('skills/index.json')) fail('llms.txt does not advertise the Agent Skills index.');

console.log(`[agent-skills] validated ${index.skills.length} reciprocal engram-bound Agent Skills, SHA-256 integrity, negative tamper cases, and all capability/resource/laboratory references.`);
