import { Mechanics,fixture,pack } from './npc-phase-9-validation-fixture.mjs';

export const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const has=value=>value!==undefined&&value!==null&&value!==''&&(!Array.isArray(value)||value.length>0);

export function validatePackageReferences(fail){
  const ids=Object.keys(pack.mechanicalPackages).sort();
  for(const[id,pkg]of Object.entries(pack.mechanicalPackages)){
    if(!pack.mechanicalLevelGuidance[id])fail(`${id}: level guidance is missing.`);
    for(const ability of pkg.primaryAbilities||[])if(!fixture.abilityIds.includes(ability))fail(`${id}: unknown primary ability ${ability}.`);
    for(const save of pkg.goodSaves||[])if(!fixture.saveIds.includes(save))fail(`${id}: unknown good save ${save}.`);
    for(const skill of pkg.skills||[])if(!pack.mechanicsCore.skillAbilities[skill])fail(`${id}: skill ${skill} has no ability mapping.`);
    for(const option of pkg.combatOptions||[])if(!pack.mechanicsCore.weaponProfiles[option])fail(`${id}: combat option ${option} is undefined.`);
    for(const option of pkg.protectionOptions||[])if(!pack.mechanicsCore.armorProfiles[option])fail(`${id}: protection option ${option} is undefined.`);
  }
  return ids;
}

export function validateLight(data,pkg,id,fail){
  for(const field of fixture.lightFields)if(!has(data?.[field]))fail(`${id}: missing Light field ${field}.`);
  if(!Number.isInteger(data?.level)||data.level<0)fail(`${id}: level is invalid.`);
  if(!Number.isInteger(data?.hitPoints)||data.hitPoints<1)fail(`${id}: hit points are invalid.`);
  if(!Number.isInteger(data?.defense))fail(`${id}: defense is invalid.`);
  if(data?.attackBonus!==data?.mainAttack?.attackBonus)fail(`${id}: attack summary disagrees with main attack.`);
  if(data?.classLabel!==pkg.classLabel||data?.role!==pkg.role)fail(`${id}: package identity is inconsistent.`);
  const range=pack.mechanicalLevelGuidance[id.split(' ')[0]];
  if(data?.level<range[0]||data?.level>range[1])fail(`${id}: level ${data?.level} is outside ${range[0]}-${range[1]}.`);
}

export function validateFull(data,pkg,id,fail){
  for(const field of fixture.fullOnlyFields)if(!has(data?.[field]))fail(`${id}: missing Full field ${field}.`);
  if(!data?.abilityScores||!data?.abilityModifiers||!data?.savingThrows||!data?.skillBonuses)return;
  if(!same(Object.keys(data.abilityScores).sort(),[...fixture.abilityIds].sort()))fail(`${id}: ability score keys are incomplete.`);
  for(const ability of fixture.abilityIds)if(data.abilityModifiers[ability]!==Mechanics.modifier(data.abilityScores[ability]))fail(`${id}: ${ability} modifier is inconsistent.`);
  if(!same(Object.keys(data.savingThrows).sort(),[...fixture.saveIds].sort()))fail(`${id}: saving throws are incomplete.`);
  if(!same(Object.keys(data.skillBonuses).sort(),[...(pkg.skills||[])].sort()))fail(`${id}: trained skills are incomplete.`);
  if(!Array.isArray(data.attacks)||data.attacks.length!==1||!same(data.attacks[0],data.mainAttack))fail(`${id}: attacks disagree with main attack.`);
  if(data.initiative!==data.abilityModifiers.dexterity)fail(`${id}: initiative does not use Dexterity.`);
  if(!Number.isInteger(data.speed)||data.speed<5)fail(`${id}: speed is invalid.`);
}

export function compareLightAndFull(light,full,id,fail){
  for(const field of fixture.lightFields){
    if(field==='mechanicalMode')continue;
    if(!same(light?.[field],full?.[field]))fail(`${id}: Light and Full disagree on ${field}.`);
  }
}
