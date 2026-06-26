import fs from 'node:fs';
import path from 'node:path';

export function createRecorder(){
  const scenarios=[],failures=[];
  const pass=(id,details={})=>scenarios.push({id,status:'passed',details});
  const fail=(id,message,details={})=>{scenarios.push({id,status:'failed',message,details});failures.push(`${id}: ${message}`);};
  async function check(id,action){
    try{const details=await action();pass(id,details||{});return details;}
    catch(error){fail(id,error?.message||String(error));return null;}
  }
  return{scenarios,failures,pass,fail,check};
}

export function installPageMonitoring(page,origin,label='page'){
  const consoleErrors=[],pageErrors=[],requestFailures=[],httpErrors=[];
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('requestfailed',request=>{if(request.url().startsWith(origin))requestFailures.push(`${request.method()} ${request.url()} ${request.failure()?.errorText||''}`.trim());});
  page.on('response',response=>{
    const url=response.url();
    if(url.startsWith(origin)&&response.status()>=400&&!url.endsWith('/favicon.ico'))httpErrors.push(`${response.status()} ${url}`);
  });
  return{
    consoleErrors,pageErrors,requestFailures,httpErrors,
    assertClean(){
      const combined=[...pageErrors,...requestFailures,...httpErrors,...consoleErrors];
      if(combined.length)throw new Error(`${label} browser errors: ${combined.join(' | ')}`);
      return{consoleErrors:0,pageErrors:0,requestFailures:0,httpErrors:0};
    }
  };
}

export async function stableProfile(page){
  return page.evaluate(()=>{
    const source=globalThis.NpcProfileGeneratorWorkspace?.currentProfile;
    if(!source)return null;
    const profile=JSON.parse(JSON.stringify(source));
    delete profile.createdAt;delete profile.updatedAt;
    return profile;
  });
}

export async function stableGroup(page){
  return page.evaluate(()=>{
    const source=globalThis.NpcProfileGeneratorWorkspace?.currentGroup;
    if(!source)return null;
    const group=JSON.parse(JSON.stringify(source));
    delete group.createdAt;delete group.updatedAt;
    for(const member of group.members||[]){delete member.profile?.createdAt;delete member.profile?.updatedAt;}
    return group;
  });
}

export const same=(left,right)=>JSON.stringify(left)===JSON.stringify(right);
export function requireValue(condition,message){if(!condition)throw new Error(message);}

export async function readDownload(download){
  const filePath=await download.path();
  if(!filePath)throw new Error(`Download ${download.suggestedFilename()} has no local path.`);
  const content=fs.readFileSync(filePath,'utf8');
  if(!content.trim())throw new Error(`Download ${download.suggestedFilename()} is empty.`);
  return{path:filePath,name:download.suggestedFilename(),bytes:Buffer.byteLength(content),content};
}

export function writeArtifact(root,outputPath,artifact){
  const resolved=path.resolve(root,outputPath);
  fs.mkdirSync(path.dirname(resolved),{recursive:true});
  fs.writeFileSync(resolved,`${JSON.stringify(artifact,null,2)}\n`);
  return resolved;
}
