import fs from 'node:fs';
import vm from 'node:vm';
import cryptoModule from 'node:crypto';

const root=new URL('../',import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),'utf8');
const fail=message=>{throw new Error(message);};

class ClassList{
  constructor(element){this.element=element;}
  values(){return new Set(String(this.element.className||'').split(/\s+/).filter(Boolean));}
  contains(name){return this.values().has(name);}
  add(...names){const set=this.values();names.forEach(name=>set.add(name));this.element.className=[...set].join(' ');}
  remove(...names){const set=this.values();names.forEach(name=>set.delete(name));this.element.className=[...set].join(' ');}
  toggle(name,force){const set=this.values(),next=force===undefined?!set.has(name):Boolean(force);next?set.add(name):set.delete(name);this.element.className=[...set].join(' ');return next;}
}

class Element{
  constructor(tag='div',owner=null){this.tagName=String(tag).toUpperCase();this.ownerDocument=owner;this.children=[];this.parentNode=null;this.dataset={};this.style={};this.attributes={};this.listeners=new Map();this.className='';this.classList=new ClassList(this);this.textContent='';this.value='';this.hidden=false;this.disabled=false;this.type='';this.href='';this.src='';this.rel='';this.readyState='';}
  set id(value){this._id=String(value||'');if(this.ownerDocument&&this._id)this.ownerDocument.ids.set(this._id,this);}
  get id(){return this._id||'';}
  append(...nodes){for(const value of nodes){const child=typeof value==='string'?this.ownerDocument.createTextNode(value):value;if(!child)continue;child.parentNode=this;this.children.push(child);if(this===this.ownerDocument?.head)this.ownerDocument.onHeadAppend(child);}}
  appendChild(node){this.append(node);return node;}
  insertBefore(node,reference){node.parentNode=this;const index=this.children.indexOf(reference);if(index<0)this.children.push(node);else this.children.splice(index,0,node);return node;}
  insertAdjacentElement(_position,node){this.parentNode?.insertBefore(node,this.nextSibling||null);return node;}
  replaceChildren(...nodes){this.children=[];this.append(...nodes);}
  remove(){if(!this.parentNode)return;this.parentNode.children=this.parentNode.children.filter(child=>child!==this);this.parentNode=null;}
  addEventListener(type,handler){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(handler);}
  removeEventListener(type,handler){this.listeners.set(type,(this.listeners.get(type)||[]).filter(item=>item!==handler));}
  dispatchEvent(event){event.target=event.target||this;for(const handler of this.listeners.get(event.type)||[])handler.call(this,event);return true;}
  click(){this.dispatchEvent({type:'click',preventDefault(){},stopImmediatePropagation(){},target:this});}
  setAttribute(name,value){this.attributes[name]=String(value);if(name==='class')this.className=String(value);if(name==='id')this.id=value;if(name.startsWith('data-'))this.dataset[name.slice(5).replace(/-([a-z])/g,(_,letter)=>letter.toUpperCase())]=String(value);}
  getAttribute(name){return this.attributes[name]??null;}
  removeAttribute(name){delete this.attributes[name];}
  querySelector(selector){return queryFrom(this,selector)[0]||null;}
  querySelectorAll(selector){return queryFrom(this,selector);}
  scrollIntoView(){}
  select(){}
  get nextSibling(){if(!this.parentNode)return null;const index=this.parentNode.children.indexOf(this);return this.parentNode.children[index+1]||null;}
}

function descendants(root){const rows=[];for(const child of root.children||[]){rows.push(child,...descendants(child));}return rows;}
function matches(element,selector){
  if(selector.startsWith('#'))return element.id===selector.slice(1);
  if(selector.startsWith('.'))return selector.split('.').filter(Boolean).every(name=>element.classList.contains(name));
  const attr=selector.match(/^(script|link)\[(src|href)="([^"]+)"\]$/);if(attr)return element.tagName===attr[1].toUpperCase()&&String(element[attr[2]]||'')===attr[3];
  if(selector==='main')return element.tagName==='MAIN';
  if(selector==='button')return element.tagName==='BUTTON';
  return element.tagName===selector.toUpperCase();
}
function queryFrom(root,selector){
  if(selector.includes(' ')){const [first,...rest]=selector.split(/\s+/);return queryFrom(root,first).flatMap(item=>queryFrom(item,rest.join(' ')));}
  if(selector.endsWith(':last-child')){const base=selector.replace(':last-child',''),rows=queryFrom(root,base);return rows.length?[rows.at(-1)]:[];}
  return descendants(root).filter(element=>matches(element,selector));
}

class Document{
  constructor(){this.ids=new Map();this.listeners=new Map();this.readyState='complete';this.documentElement=new Element('html',this);this.head=new Element('head',this);this.body=new Element('body',this);this.documentElement.append(this.head,this.body);this.scriptLoader=null;}
  createElement(tag){return new Element(tag,this);}
  createElementNS(_ns,tag){return this.createElement(tag);}
  createTextNode(text){const node=this.createElement('#text');node.textContent=String(text);return node;}
  getElementById(id){return this.ids.get(id)||null;}
  querySelector(selector){if(matches(this.head,selector))return this.head;if(matches(this.body,selector))return this.body;return queryFrom(this.documentElement,selector)[0]||null;}
  querySelectorAll(selector){return queryFrom(this.documentElement,selector);}
  addEventListener(type,handler){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(handler);}
  dispatchEvent(event){for(const handler of this.listeners.get(event.type)||[])handler(event);return true;}
  execCommand(){return true;}
  onHeadAppend(node){
    if(node.tagName==='LINK'){queueMicrotask(()=>node.onload?.());return;}
    if(node.tagName==='SCRIPT'){queueMicrotask(()=>{try{this.scriptLoader?.(node.src);node.readyState='complete';node.dispatchEvent({type:'load'});}catch(error){node.dispatchEvent({type:'error',error});}});}
  }
}

class Storage{
  constructor(){this.map=new Map();}
  getItem(key){return this.map.has(key)?this.map.get(key):null;}
  setItem(key,value){this.map.set(key,String(value));}
  removeItem(key){this.map.delete(key);}
}

function addElement(document,id,tag='div',className='',parent=document.body){const element=document.createElement(tag);element.id=id;element.className=className;parent.append(element);return element;}
function baseContext(document){
  const listeners=new Map();
  const context={console,Math,Number,Object,Array,Set,Map,String,Date,JSON,Promise,Error,TypeError,RegExp,Intl,Uint32Array,structuredClone,performance:{now:()=>Date.now()},document,localStorage:new Storage(),sessionStorage:new Storage(),navigator:{userAgent:'EXO browser smoke validator',clipboard:{writeText:async()=>{}}},location:{href:'https://example.invalid/exo-smoke.html'},Blob:class Blob{constructor(parts,options){this.parts=parts;this.options=options;}},URL:{createObjectURL:()=> 'blob:smoke',revokeObjectURL(){}},CustomEvent:class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail;}},AbortController,crypto:{getRandomValues(array){const bytes=cryptoModule.randomBytes(array.byteLength);new Uint8Array(array.buffer).set(bytes);return array;}},setTimeout,clearTimeout,queueMicrotask,requestAnimationFrame:callback=>{queueMicrotask(()=>callback(Date.now()));return 1;},cancelAnimationFrame(){},requestIdleCallback:callback=>{queueMicrotask(()=>callback({timeRemaining:()=>50,didTimeout:false}));return 1;},cancelIdleCallback(){},IntersectionObserver:class{constructor(callback){this.callback=callback;}observe(target){queueMicrotask(()=>this.callback([{isIntersecting:true,target}]));}unobserve(){}disconnect(){}},MutationObserver:class{constructor(callback){this.callback=callback;}observe(){}disconnect(){}}};
  context.window=context;context.globalThis=context;context.addEventListener=(type,handler)=>{if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(handler);};context.dispatchGlobal=(type,event)=>{for(const handler of listeners.get(type)||[])handler(event);};return context;
}

function buildSectorDocument(){
  const document=new Document(),main=addElement(document,'sector-main','main','',document.body);
  const simpleIds=['exo-sector-summary-name','exo-sector-summary-mode','exo-sector-summary-clusters','exo-sector-summary-species','exo-sector-summary-worlds','exo-sector-summary-polities','exo-sector-summary-hash','exo-sector-progress-fill','exo-sector-status','exo-sector-cluster-name','exo-sector-cluster-summary','exo-sector-cluster-data','exo-sector-cluster-tags','exo-sector-map','exo-sector-snapshot-list','exo-sector-note','exo-sector-map-title'];
  simpleIds.forEach(id=>addElement(document,id,id==='exo-sector-map'?'svg':'div','',main));
  const buttons=['exo-sector-load-example','exo-sector-generate','exo-sector-random','exo-sector-export','exo-sector-save'];buttons.forEach(id=>addElement(document,id,'button','',main));
  const seed=addElement(document,'exo-sector-seed','input','',main);seed.value='EXAMPLE:SECTOR:HELIOS-VALE:001';
  const clusterCount=addElement(document,'exo-sector-cluster-count','select','',main);clusterCount.value='36';
  const speciesCount=addElement(document,'exo-sector-species-count','select','',main);speciesCount.value='32';
  const filter=addElement(document,'exo-sector-stance-filter','select','',main);filter.value='all';
  const sections=[['clusters','grid'],['worlds','body'],['species','grid'],['polities','body'],['fleets','grid'],['organizations','grid'],['relations','grid'],['extinct','grid'],['bestiary','grid']];
  for(const [name,suffix]of sections){const section=addElement(document,`exo-sector-${name}-section`,'section','exo-sector-lazy',main),head=document.createElement('div');head.className='bli-section-head';head.append(document.createElement('p'),document.createElement('h2'),addElement(document,`exo-sector-${name}-progress`,'p','',head));section.append(head);addElement(document,`exo-sector-${name}-${suffix}`,suffix==='body'?'tbody':'div','',section);}
  return document;
}

async function runSectorSmoke(){
  const document=buildSectorDocument(),context=baseContext(document);vm.createContext(context);
  for(const file of['blacklight-exo-runtime-supervisor.js','blacklight-exo-stellar-sector-data.js','blacklight-exo-stellar-sector-worlds.js','blacklight-exo-stellar-sector-generator.js','blacklight-exo-stellar-sector-contracts.js','blacklight-exo-stellar-sector.js'])vm.runInContext(read(file),context,{filename:file});
  await new Promise(resolve=>setTimeout(resolve,30));
  const fixed=context.BlacklightExoGetActiveSector?.();if(!fixed||fixed.recordStatus!=='fixed-deterministic-example')fail('Sector browser smoke did not initialize the fixed example.');
  if(document.getElementById('exo-sector-summary-name').textContent==='loading')fail('Sector summary remained in loading state.');
  if(document.getElementById('exo-sector-map').children.length<fixed.clusters.length)fail('Sector map did not render cluster nodes.');
  document.getElementById('exo-sector-seed').value='SMOKE:PROCEDURAL:SECTOR';document.getElementById('exo-sector-cluster-count').value='24';document.getElementById('exo-sector-species-count').value='12';document.getElementById('exo-sector-generate').click();await new Promise(resolve=>setTimeout(resolve,30));
  const generated=context.BlacklightExoGetActiveSector?.();if(!generated||generated.recordStatus!=='seeded-procedural-sector'||generated.clusters.length!==24||generated.species.length!==12)fail('Sector browser smoke did not switch to the requested procedural sector.');
  const report=context.BlacklightExoRuntimeSupervisor.report();if(report.failures.length)fail(`Sector runtime supervisor captured failures: ${report.failures.map(item=>item.message).join('; ')}`);
}

async function runCatalogueFallbackSmoke(){
  const document=new Document();addElement(document,'exo-cluster-status');
  const context=baseContext(document);context.fetch=async()=>{throw new Error('simulated offline catalogue source');};context.BlacklightExoFixedSystems={installMoonCatalog(){throw new Error('unexpected install');},markCatalogFailure(error){this.error=String(error);},getCatalogSummary(){return{status:'error',error:this.error,moons:0};}};vm.createContext(context);
  vm.runInContext(read('blacklight-exo-runtime-supervisor.js'),context,{filename:'blacklight-exo-runtime-supervisor.js'});vm.runInContext(read('blacklight-exo-jpl-moon-catalog-loader.js'),context,{filename:'blacklight-exo-jpl-moon-catalog-loader.js'});
  const summary=await context.BlacklightExoMoonCatalogReady;if(summary.status!=='error')fail('Offline satellite catalogue did not resolve to a fallback status.');
  if(!context.BlacklightExoFixedSystems.error)fail('Offline satellite catalogue did not mark fixed-system fallback state.');
  const report=context.BlacklightExoRuntimeSupervisor.report();if(!report.failures.some(item=>item.phase==='satellite-catalogue'))fail('Satellite catalogue failure was not captured by the runtime supervisor.');
}

await runSectorSmoke();
await runCatalogueFallbackSmoke();
console.log('EXO browser runtime smoke validation passed.');
