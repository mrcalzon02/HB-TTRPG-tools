import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const rel=value=>path.join(root,value);
const read=value=>fs.readFileSync(rel(value),'utf8');
const json=value=>JSON.parse(read(value));
const failures=[];
const fail=message=>failures.push(message);

const runtimeFiles=[
  'npc-profile-generator-random.js',
  'npc-profile-generator-rules-core.js',
  'npc-profile-generator-rules-validation.js',
  'npc-generator-foundation.js',
  'npc-generator-compose.js',
  'npc-generator-mechanics.js',
  'npc-profile-generator-core.js'
];
for(const file of runtimeFiles)vm.runInThisContext(read(file),{filename:file});

const Rules=globalThis.NpcProfileRules;
const Foundation=globalThis.NpcProfileGeneratorFoundation;
const Mechanics=globalThis.NpcProfileGeneratorMechanics;
const Core=globalThis.NpcProfileGeneratorCore;
const fixture=json('data/npc-generator/fixtures/phase-9-mechanics-matrix.json');
const policies=json('data/npc-generator/archetypes/wave-a-policies.json');
const names=json('data/npc-generator/names/core-fantasy-names.json');
const ancestries=json('data/npc-generator/ancestries/core-fantasy.json');
const coreTables=json('data/npc-generator/tables/core-profile-tables.json');
const operational=json('data/npc-generator/tables/wave-a-operational-tables.json');
const mechanicsCore=json('data/npc-generator/mechanics/open-d20-core.json');
const packageManifest=json('data/npc-generator/mechanics/archetype-packages.json');
const packageFiles=packageManifest.componentFiles.map(name=>json(`data/npc-generator/mechanics/${name}`));
const ledger=json('data/npc-generator/phase-status.json');

const pack={
  packId:'generic-fantasy-core',
  version:'0.1.0',
  tables:{},
  sectionFields:coreTables.sectionFields||{},
  ageRanges:ancestries.ageRanges||{},
  mechanicsCore,
  mechanicalPackages:{},
  mechanicalLevelGuidance:{}
};
for(const source of[names.tables,ancestries.tables,coreTables.tables,operational.tables])for(const[id,entries]of Object.entries(source||{}))pack.tables[id]=entries;
for(const component of packageFiles){
  for(const[id,value]of Object.entries(component.packages||{})){
    if(pack.mechanicalPackages[id])fail(`Duplicate mechanical package ${id}.`);
    pack.mechanicalPackages[id]=value;
  }
  for(const[id,value]of Object.entries(component.levelGuidance||{}))pack.mechanicalLevelGuidance[id]=value;
}

function clone(value){return JSON.parse(JSON.stringify(value));}
function hasValue(value){
  if(value===undefined||value===null||value==='')return false;
  if(Array.isArray(value))return value.length>0;
  return true;
}
function mechanicsData(profile){return profile.sections?.mechanics?.data||null;}
function withoutMechanics(profile){
  const sections=clone(profile.sections||{});
  delete sections.mechanics;
  return sections;
}
function assertFields(data,fields,label){for(const field of fields)if(!hasValue(data?.[field]))fail(`${label}: missing ${field}.`);}
function validateFull(data,mechanicalPackage,label){
  assertFields(data,fixture.fullOnlyFields,label);
  const abilityKeys=Object.keys(data.abilityScores||{}).sort();
  if(JSON.stringify(abilityKeys)!==JSON.stringify([...fixture.abilityIds].sort()))fail(`${label}: ability score keys are incomplete.`);
  for(const ability of fixture.abilityIds){
    const score=data.abilityScores[ability];
    if(data.abilityModifiers?.[ability]!==Mechanics.modifier(score))fail(`${label}: ${ability} modifier does not match score.`);
  }
  const saveKeys=Object.keys(data.savingThrows||{}).sort();
  if(JSON.stringify(saveKeys)!==JSON.stringify([...fixture.saveIds].sort()))fail(`${label}: saving throws are incomplete.`);
  const skillKeys=Object.keys(data.skillBonuses||{}).sort();
  if(JSON.stringify(skillKeys)!==JSON.stringify([...(mechanicalPackage.skills||[])].sort()))fail(`${label}: trained skill package is incomplete.`);
  if(!Array.isArray(data.attacks)||data.attacks.length!==1||JSON.stringify(data.attacks[0])!==JSON.stringify(data.mainAttack))fail(`${label}: full attack list disagrees with main attack.`);
  if(data.initiative!==data.abilityModifiers.dexterity)fail(`${label}: initiative does not use Dexterity.`);
  if(!Number.isInteger(data.speed)||data.speed<5)fail(`${label}: speed is invalid.`);
}
function compareShared(light,full,label){
  const shared=fixture.lightFields.filter(field=>field!=='mechanicalMode');
  for(const field of shared)if(JSON.stringify(light[field])!==JSON.stringify(full[field]))fail(`${label}: Light and Full disagree on ${field}.`);
}
function validateMath(data,mechanicalPackage,label){
  if(!Number.isInteger(data.level)||data.level<0)fail(`${label}: level is invalid.`);
  if(!Number.isInteger(data.hitPoints)||data.hitPoints<1)fail(`${label}: hit points are invalid.`);
  if(!Number.isInteger(data.defense))fail(`${label}: defense is invalid.`);
  if(data.attackBonus!==data.mainAttack?.attackBonus)fail(`${label}: attack summary disagrees with main attack.`);
  if(data.classLabel!==mechanicalPackage.classLabel||data.role!==mechanicalPackage.role)fail(`${label}: package identity is inconsistent.`);
  const range=pack.mechanicalLevelGuidance[label.split(' ')[0]];
  if(data.level<range[0]||data.level>range[1])fail(`${label}: level ${data.level} is outside ${range[0]}-${range[1]}.`);
}

if(packageManifest.packageCount!==fixture.archetypeIds.length)fail(`Package manifest count ${packageManifest.packageCount} does not match ${fixture.archetypeIds.length}.`);
const packageIds=Object.keys(pack.mechanicalPackages).sort();
if(JSON.stringify(packageIds)!==JSON.stringify([...fixture.archetypeIds].sort()))fail(`Mechanical package coverage mismatch: ${packageIds.join(', ')}.`);
for(const[archetypeId,mechanicalPackage]of Object.entries(pack.mechanicalPackages)){
  if(!pack.mechanicalLevelGuidance[archetypeId])fail(`${archetypeId}: level guidance is missing.`);
  for(const ability of mechanicalPackage.primaryAbilities||[])if(!fixture.abilityIds.includes(ability))fail(`${archetypeId}: unknown primary ability ${ability}.`);
  for(const save of mechanicalPackage.goodSaves||[])if(!fixture.saveIds.includes(save))fail(`${archetypeId}: unknown good save ${save}.`);
  for(const skill of mechanicalPackage.skills||[])if(!mechanicsCore.skillAbilities[skill])fail(`${archetypeId}: skill ${skill} has no ability mapping.`);
  for(const id of mechanicalPackage.combatOptions||[])if(!mechanicsCore.weaponProfiles[id])fail(`${archetypeId}: combat option ${id} is undefined.`);
  for(const id of mechanicalPackage.protectionOptions||[])if(!mechanicsCore.armorProfiles[id])fail(`${archetypeId}: protection option ${id} is undefined.`);
}

let generated=0;
let deterministicRepeats=0;
let rerollChanges=0;
for(const archetypeId of fixture.archetypeIds){
  const resolved=Rules.resolveArchetype(archetypeId,policies.archetypes);
  if(!resolved.valid){fail(`${archetypeId}: archetype resolution failed.`);continue;}
  const mechanicalPackage=pack.mechanicalPackages[archetypeId];
  for(let index=0;index<fixture.seedsPerArchetype;index+=1){
    const seed=`phase9:${archetypeId}:${index}`;
    const profiles={};
    for(const mode of fixture.modes){
      const result=Core.generateProfile({seed,archetype:resolved.archetype,pack,mode:'standard',mechanicalMode:mode,mechanicalOptions:{mode,levelMode:'appropriate'},timestamp:fixture.timestamp});
      generated+=1;
      const label=`${archetypeId} ${mode} ${index}`;
      if(!result.valid||!result.profile){fail(`${label}: generation failed with ${result.diagnostics.map(item=>item.code).join(', ')}.`);continue;}
      const nonInfo=result.diagnostics.filter(item=>item.severity!=='info');
      if(nonInfo.length)fail(`${label}: diagnostics ${nonInfo.map(item=>item.code).join(', ')}.`);
      profiles[mode]=result.profile;
      if(result.profile.generator.mechanicalMode!==mode)fail(`${label}: receipt mechanical mode is incorrect.`);
      if(mode==='none'){
        if(result.profile.sections.mechanics?.state!=='none')fail(`${label}: narrative mechanics state is not none.`);
        const finalValidation=Rules.validateProfileAgainstArchetype(result.profile,resolved.archetype);
        if(!finalValidation.valid)fail(`${label}: narrative-only profile failed archetype validation.`);
      }else{
        const data=mechanicsData(result.profile);
        if(result.profile.sections.mechanics?.state!=='present'||!data){fail(`${label}: mechanics section is absent.`);continue;}
        assertFields(data,fixture.lightFields,label);
        validateMath(data,mechanicalPackage,label);
        if(mode==='open-d20-light')for(const field of fixture.fullOnlyFields)if(field in data)fail(`${label}: Full-only field ${field} appears in Light mode.`);
        else validateFull(data,mechanicalPackage,label);
      }
    }
    if(profiles['open-d20-light']&&profiles['open-d20-full'])compareShared(mechanicsData(profiles['open-d20-light']),mechanicsData(profiles['open-d20-full']),`${archetypeId} ${index}`);
    if(profiles['open-d20-full']){
      const repeat=Core.generateProfile({seed,archetype:resolved.archetype,pack,mode:'standard',mechanicalMode:'open-d20-full',mechanicalOptions:{mode:'open-d20-full',levelMode:'appropriate'},timestamp:fixture.timestamp});
      deterministicRepeats+=1;
      if(JSON.stringify(profiles['open-d20-full'])!==JSON.stringify(repeat.profile))fail(`${archetypeId} ${index}: Full mechanics are not deterministic.`);
    }
  }

  const range=pack.mechanicalLevelGuidance[archetypeId];
  const exact=Core.generateProfile({seed:`phase9:exact:${archetypeId}`,archetype:resolved.archetype,pack,mode:'standard',mechanicalMode:'open-d20-full',mechanicalOptions:{mode:'open-d20-full',levelMode:'exact',level:range[1]+10},timestamp:fixture.timestamp});
  if(mechanicsData(exact.profile)?.level!==range[1])fail(`${archetypeId}: out-of-range exact level did not clamp to ${range[1]}.`);
  if(!exact.diagnostics.some(item=>item.code==='MECHANICS_LEVEL_CLAMPED'&&item.severity==='info'))fail(`${archetypeId}: level clamp diagnostic is missing.`);

  const seed=`phase9:reroll:${archetypeId}`;
  const baseConfig={seed,archetype:resolved.archetype,pack,mode:'standard',mechanicalMode:'open-d20-full',mechanicalOptions:{mode:'open-d20-full',levelMode:'appropriate'},timestamp:fixture.timestamp};
  const original=Core.generateProfile(baseConfig);
  let changed=false;
  for(let counter=1;counter<=6&&!changed;counter+=1){
    const rerolled=Core.generateProfile({...baseConfig,previousProfile:original.profile,locks:['/sections/mechanics/data/level'],rerollCounters:{mechanics:counter}});
    if(rerolled.profile.sections.mechanics.data.level!==original.profile.sections.mechanics.data.level)fail(`${archetypeId}: locked mechanics level was not preserved.`);
    if(JSON.stringify(withoutMechanics(rerolled.profile))!==JSON.stringify(withoutMechanics(original.profile)))fail(`${archetypeId}: mechanics reroll changed unrelated sections.`);
    if(JSON.stringify(rerolled.profile.sections.mechanics)!==JSON.stringify(original.profile.sections.mechanics))changed=true;
  }
  if(!changed)fail(`${archetypeId}: mechanics reroll produced no change after six counters.`);
  else rerollChanges+=1;
}

const expected=fixture.archetypeIds.length*fixture.seedsPerArchetype*fixture.modes.length;
if(generated!==expected)fail(`Generated ${generated} profiles; expected ${expected}.`);
if(ledger.activeBranch!=='main')fail('Phase ledger must retain main as the only active branch.');
if(ledger.activePhaseId!=='phase-9-mechanical-profile-generation')fail('Phase 9 must be active.');
if(ledger.lastCompletedPhaseId!=='phase-8-archetype-specific-modules')fail('Phase 8 must be the last completed phase.');

if(failures.length){
  console.error('NPC Phase 9 validation failed:');
  failures.forEach(message=>console.error(`- ${message}`));
  process.exit(1);
}

console.log('NPC Phase 9 validation passed.');
console.log(`Mechanical packages verified: ${packageIds.length}`);
console.log(`Profiles generated: ${generated}`);
console.log(`Deterministic Full repeats: ${deterministicRepeats}`);
console.log(`Mechanics reroll changes observed: ${rerollChanges}`);
