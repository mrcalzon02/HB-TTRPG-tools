import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';

const root=process.cwd();
const read=filename=>fs.readFile(path.join(root,filename),'utf8');
const fail=message=>{throw new Error(message);};
const source=await read('blacklight-exo-vessel-diegetic-controls.js');
const css=await read('blacklight-exo-vessel-diegetic-controls.css');
const gameplayUi=await read('blacklight-exo-vessel-gameplay-ui.js');

for(const signature of ['enhanceSelect','enhanceNumber','MutationObserver','exo-vessel-native-authority','exo-diegetic-choice-rail','exo-diegetic-slider','allowAutomatic','log-zero','dispatchEvent(new Event'])if(!source.includes(signature))fail(`Diegetic control runtime lacks ${signature}.`);
for(const signature of ['exo-vessel-native-authority','exo-diegetic-selector','exo-diegetic-number','exo-diegetic-slider','exo-diegetic-choice','exo-diegetic-auto','INSTRUMENT'])if(!css.includes(signature))fail(`Diegetic control stylesheet lacks ${signature}.`);
for(const signature of ['blacklight-exo-vessel-diegetic-controls.css','blacklight-exo-vessel-diegetic-controls.js','loadVessel10Layers'])if(!gameplayUi.includes(signature))fail(`Gameplay UI does not load diegetic asset ${signature}.`);

class ClassList{constructor(owner){this.owner=owner;}add(...names){const set=new Set(this.owner.className.split(/\s+/).filter(Boolean));for(const name of names)set.add(name);this.owner.className=[...set].join(' ');}contains(name){return this.owner.className.split(/\s+/).includes(name);}}
class Element{
  constructor(tag='div'){this.tagName=tag.toUpperCase();this.children=[];this.parentNode=null;this.dataset={};this.attributes={};this.listeners=new Map();this.className='';this.classList=new ClassList(this);this.value='';this.id='';this.type='';this.min='';this.max='';this.step='';this.disabled=false;this.multiple=false;this.tabIndex=0;this.options=[];this.textContent='';}
  append(...items){for(const item of items){if(!item)continue;item.parentNode=this;this.children.push(item);}}
  insertAdjacentElement(_position,item){if(!this.parentNode){this.after=item;item.parentNode=null;return item;}const index=this.parentNode.children.indexOf(this);item.parentNode=this.parentNode;this.parentNode.children.splice(index+1,0,item);return item;}
  setAttribute(name,value){this.attributes[name]=String(value);}
  getAttribute(name){return this.attributes[name]??null;}
  addEventListener(type,handler){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(handler);}
  dispatchEvent(event){event.target=this;for(const handler of this.listeners.get(event.type)||[])handler.call(this,event);return true;}
  matches(selector){if(selector==='select')return this.tagName==='SELECT';if(selector==='input[type="number"]')return this.tagName==='INPUT'&&this.type==='number';if(selector==='select,input[type="number"]')return this.matches('select')||this.matches('input[type="number"]');return false;}
  closest(selector){if(selector==='label'){let node=this.parentNode;while(node){if(node.tagName==='LABEL')return node;node=node.parentNode;}}return null;}
  querySelector(selector){if(selector===':scope > span')return this.children.find(child=>child.tagName==='SPAN')||null;if(selector.startsWith('.'))return descendants(this).find(child=>child.classList.contains(selector.slice(1)))||null;return null;}
  querySelectorAll(selector){return descendants(this).filter(child=>child.matches(selector));}
  add(option){this.options.push(option);option.parentNode=this;if(!this.value)this.value=option.value;}
}
function descendants(root){const rows=[];for(const child of root.children||[]){rows.push(child,...descendants(child));}return rows;}
class OptionElement extends Element{constructor(text,value){super('option');this.textContent=text;this.value=value;this.disabled=false;}}
class FakeMutationObserver{constructor(callback){this.callback=callback;}observe(){}disconnect(){}}
const body=new Element('body'),main=new Element('main');body.className='exo-vessel-body';body.append(main);
const document={readyState:'loading',body,createElement:tag=>new Element(tag),addEventListener(){},querySelector(selector){if(selector==='.exo-vessel-body main')return main;return null;},querySelectorAll(){return[];}};
const context={console,Math,Number,Object,Array,Set,Map,String,Date,JSON,Promise,Error,WeakSet,WeakMap,document,MutationObserver:FakeMutationObserver,Event:class{constructor(type,options={}){this.type=type;this.bubbles=options.bubbles;}},Option:OptionElement};context.globalThis=context;vm.createContext(context);vm.runInContext(source,context,{filename:'blacklight-exo-vessel-diegetic-controls.js'});
const api=context.BlacklightExoVesselDiegeticControls;if(!api?.enhanceSelect||!api?.enhanceNumber||api.version!==1)fail('Diegetic control API did not initialize.');

function labelled(control,labelText){const label=new Element('label'),span=new Element('span');span.textContent=labelText;label.append(span,control);main.append(label);return label;}
const select=new Element('select');select.id='exo-vessel-role';select.add(new OptionElement('Explorer','explorer'));select.add(new OptionElement('Warship','warship'));select.value='explorer';const selectLabel=labelled(select,'Mission role');let selectChanges=0;select.addEventListener('change',()=>selectChanges++);api.enhanceSelect(select);const selectPanel=selectLabel.children.find(item=>item.classList.contains('exo-diegetic-selector'));if(!selectPanel||!select.classList.contains('exo-vessel-native-authority'))fail('Select authority was not replaced by a visible diegetic selector.');const choices=descendants(selectPanel).filter(item=>item.classList.contains('exo-diegetic-choice'));if(choices.length!==2)fail('Diegetic selector did not expose every select option.');choices[1].dispatchEvent(new context.Event('click'));if(select.value!=='warship'||selectChanges!==1)fail('Segmented selector did not update the canonical select and dispatch its change event.');

const number=new Element('input');number.type='number';number.id='exo-vessel-crew';number.value='40';number.min='1';number.step='1';const numberLabel=labelled(number,'Crew complement');let numberInputs=0,numberChanges=0;number.addEventListener('input',()=>numberInputs++);number.addEventListener('change',()=>numberChanges++);api.enhanceNumber(number);const numberPanel=numberLabel.children.find(item=>item.classList.contains('exo-diegetic-number')),slider=numberPanel?.querySelector('.exo-diegetic-slider');if(!numberPanel||!slider||!number.classList.contains('exo-vessel-native-authority'))fail('Numeric authority was not replaced by a calibrated diegetic slider.');slider.value='800';slider.dispatchEvent(new context.Event('input'));slider.dispatchEvent(new context.Event('change'));if(!(Number(number.value)>40)||numberInputs<2||numberChanges<1)fail('Diegetic slider did not update the canonical number input and preserve normal events.');

const payload=new Element('input');payload.type='number';payload.id='exo-vessel-payload';payload.value='';const payloadLabel=labelled(payload,'Mission payload');let payloadChanges=0;payload.addEventListener('change',()=>payloadChanges++);api.enhanceNumber(payload);const payloadPanel=payloadLabel.children.find(item=>item.classList.contains('exo-diegetic-number')),auto=payloadPanel?.querySelector('.exo-diegetic-auto');if(!auto||auto.dataset.active!=='true')fail('Role-derived payload did not initialize in automatic mode.');auto.dispatchEvent(new context.Event('click'));if(payload.value==='')fail('AUTO control did not enter a manual calibrated value.');auto.dispatchEvent(new context.Event('click'));if(payload.value!==''||payloadChanges<2)fail('AUTO control did not restore the blank role-derived canonical value.');

const workflow=await read('.github/workflows/pages.yml');if(!workflow.includes('node scripts/validate-exo-vessel-diegetic-controls.mjs'))fail('Pages workflow does not gate VESSEL-10 diegetic controls.');
console.log('EXO vessel VESSEL-10 diegetic control validation passed.');
console.log('Validated segmented select authority, calibrated numeric sliders, automatic values, hidden canonical fields, legacy input/change events, dynamic enhancement hooks, and synchronized VESSEL-10 asset loading.');
