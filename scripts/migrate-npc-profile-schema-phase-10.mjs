import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const target=path.join(root,'data/schemas/npc-profile.schema.json');
const schema=JSON.parse(fs.readFileSync(target,'utf8'));
const defs=schema.$defs;
if(!defs?.generatorReceipt||!defs?.sectionEnvelope||!defs?.profileSections||!defs?.diagnostic)throw new Error('NPC profile schema does not expose the expected Phase 1 definitions.');

Object.assign(defs.generatorReceipt.properties,{
  householdGeneratorVersion:{type:'string',pattern:'^\\d+\\.\\d+\\.\\d+$'},
  operationGeneratorVersion:{type:'string',pattern:'^\\d+\\.\\d+\\.\\d+$'},
  mechanicsGeneratorVersion:{type:'string',pattern:'^\\d+\\.\\d+\\.\\d+$'},
  mechanicalMode:{enum:['none','open-d20-light','open-d20-full']},
  mechanicalOptions:{
    type:'object',additionalProperties:false,
    properties:{
      mode:{enum:['none','open-d20-light','open-d20-full']},
      levelMode:{enum:['appropriate','exact','range']},
      level:{type:'integer',minimum:0,maximum:100},
      minimum:{type:'integer',minimum:0,maximum:100},
      maximum:{type:'integer',minimum:0,maximum:100}
    }
  }
});

defs.sectionEnvelope.properties.operationModule={
  type:'object',additionalProperties:false,required:['id','label','version'],
  properties:{
    id:{type:'string',pattern:'^[a-z0-9][a-z0-9-]{2,63}$'},
    label:{type:'string',minLength:1},
    version:{type:'string',pattern:'^\\d+\\.\\d+\\.\\d+$'}
  }
};
defs.profileSections.properties.extensions.propertyNames.pattern='^[a-z][A-Za-z0-9.-]{2,63}$';
Object.assign(defs.diagnostic.properties,{
  tableId:{type:'string',minLength:1},
  pointer:{type:'string',pattern:'^/'},
  archetypeId:{type:'string',minLength:1},
  targetKind:{type:'string',minLength:1},
  minimum:{type:'number'},
  maximum:{type:'number'},
  cycle:{type:'array',items:{type:'string',minLength:1}}
});

schema.description='Canonical Universal NPC profile schema, including deterministic postprocessor metadata, persistence-safe diagnostics, and extension envelopes.';
fs.writeFileSync(target,`${JSON.stringify(schema,null,2)}\n`);

const entryPath=path.join(root,'npc-profile-generator-entry.js');
let entry=fs.readFileSync(entryPath,'utf8');
const persistenceLine="    ['npc-profile-generator-persistence-ui.js', 'NpcProfileGeneratorPersistenceUI'],";
const restorationLine="    ['npc-profile-generator-persistence-restore.js', 'NpcProfileGeneratorPersistenceRestore'],";
if(!entry.includes(restorationLine)){
  if(!entry.includes(persistenceLine))throw new Error('NPC entrypoint persistence line was not found.');
  entry=entry.replace(persistenceLine,`${persistenceLine}\n${restorationLine}`);
  fs.writeFileSync(entryPath,entry);
}

const uiPath=path.join(root,'npc-profile-generator-persistence-ui.js');
let ui=fs.readFileSync(uiPath,'utf8');
const unsafe="    for(const[id,value]of Object.entries(values))if(this.controls[id]&&value!==undefined&&[...this.controls[id].options||[]].some?.(option=>option.value===String(value))!==false)this.controls[id].value=String(value);";
const safe="    for(const[id,value]of Object.entries(values)){const control=this.controls[id];if(!control||value===undefined||value===null)continue;if(control.tagName==='SELECT'&&![...control.options].some(option=>option.value===String(value)))continue;control.value=String(value);}";
if(ui.includes(unsafe)){
  ui=ui.replace(unsafe,safe);
  fs.writeFileSync(uiPath,ui);
}

console.log('NPC Phase 10 schema and interface migration complete.');
