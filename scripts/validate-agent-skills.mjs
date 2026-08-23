import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const fail = message => { throw new Error(`[agent-skills] ${message}`); };
const exists = file => fs.existsSync(path.join(root, file));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = file => JSON.parse(read(file));

const indexPath = 'skills/index.json';
if (!exists(indexPath)) fail('skills/index.json is missing.');
if (!exists('skills/README.md')) fail('skills/README.md is missing.');

const index = readJson(indexPath);
const manifest = readJson('api/foundry-capabilities.json');
const collections = readJson('api/resource-collections.json');

if (index.architectureRule !== 'Mirrored calls, not mirrored logic.') fail('skill architecture rule is missing or changed.');
if (!Array.isArray(index.skills) || !index.skills.length) fail('skills/index.json must contain at least one skill.');

const capabilityIds = new Set((manifest.capabilities || []).map(item => item.id));
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
  if (metadata.name !== skill.name) fail(`${skill.path} frontmatter name must match its directory/index name.`);
  if (!metadata.description) fail(`${skill.path} is missing required description frontmatter.`);
  if (metadata.description.length > 1024) fail(`${skill.path} description exceeds 1024 characters.`);
  if (metadata.compatibility && metadata.compatibility.length > 500) fail(`${skill.path} compatibility exceeds 500 characters.`);

  for (const id of skill.capabilityIds || []) if (!capabilityIds.has(id)) fail(`${skill.name} references unknown capability ${id}.`);
  for (const id of skill.resourceIds || []) if (!resourceIds.has(id)) fail(`${skill.name} references unknown resource ${id}.`);
}

const skillDirs = fs.readdirSync(path.join(root, 'skills'), { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .filter(name => exists(`skills/${name}/SKILL.md`));

for (const dir of skillDirs) if (!seen.has(dir)) fail(`skills/${dir}/SKILL.md exists but is not registered in skills/index.json.`);
for (const name of seen) if (!skillDirs.includes(name)) fail(`${name} is indexed but has no skill directory.`);

const llms = read('llms.txt');
if (!llms.includes('skills/index.json')) fail('llms.txt does not advertise the Agent Skills index.');

console.log(`[agent-skills] validated ${index.skills.length} Agent Skills and all capability/resource references.`);
