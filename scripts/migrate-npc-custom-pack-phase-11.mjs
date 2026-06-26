import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

const profilePath=path.join(root,'data/schemas/npc-profile.schema.json');
const profileSchema=JSON.parse(fs.readFileSync(profilePath,'utf8'));
profileSchema.$defs.generatorReceipt.properties.customPackIds={type:'array',uniqueItems:true,items:{type:'string',pattern:'^[a-z0-9][a-z0-9-]{2,63}$'}};
fs.writeFileSync(profilePath,`${JSON.stringify(profileSchema,null,2)}\n`);

const archetypePath=path.join(root,'data/schemas/npc-archetype.schema.json');
const archetypeSchema=JSON.parse(fs.readFileSync(archetypePath,'utf8'));
const wave=archetypeSchema.properties?.implementationWave?.enum;
if(!Array.isArray(wave))throw new Error('Archetype implementationWave enum was not found.');
if(!wave.includes('custom'))wave.push('custom');
fs.writeFileSync(archetypePath,`${JSON.stringify(archetypeSchema,null,2)}\n`);

const entryPath=path.join(root,'npc-profile-generator-entry.js');
let entry=fs.readFileSync(entryPath,'utf8');
const afterExport="    ['npc-profile-generator-export.js', 'NpcProfileGeneratorExport'],";
const packRuntime=[
  "    ['npc-profile-generator-pack-validator.js', 'NpcProfileGeneratorPackValidator'],",
  "    ['npc-profile-generator-pack-manager.js', 'NpcProfileGeneratorPackManager'],",
  "    ['npc-profile-generator-pack-storage.js', 'NpcProfileGeneratorPackStorage'],"
].join('\n');
if(!entry.includes('npc-profile-generator-pack-validator.js')){
  if(!entry.includes(afterExport))throw new Error('NPC entrypoint export line was not found.');
  entry=entry.replace(afterExport,`${afterExport}\n${packRuntime}`);
}
const afterRestore="    ['npc-profile-generator-persistence-restore.js', 'NpcProfileGeneratorPersistenceRestore'],";
const packUi="    ['npc-profile-generator-pack-ui.js', 'NpcProfileGeneratorPackUI'],";
if(!entry.includes('npc-profile-generator-pack-ui.js')){
  if(!entry.includes(afterRestore))throw new Error('NPC entrypoint persistence restoration line was not found.');
  entry=entry.replace(afterRestore,`${afterRestore}\n${packUi}`);
}
const mechanicsEnrich='      await globalThis.NpcProfileGeneratorMechanicsData.enrich(workspace);';
const packEnrich='      await globalThis.NpcProfileGeneratorPackUI.enrich(workspace);';
if(!entry.includes(packEnrich)){
  if(!entry.includes(mechanicsEnrich))throw new Error('NPC mechanics enrichment call was not found.');
  entry=entry.replace(mechanicsEnrich,`${mechanicsEnrich}\n${packEnrich}`);
}
fs.writeFileSync(entryPath,entry);

console.log('NPC Phase 11 schema and custom-pack integration migration complete.');
