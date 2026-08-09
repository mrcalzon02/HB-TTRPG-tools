'use strict';
const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..');
const ctx={window:{},console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root,'assets/warhammer-40k/imperial-dramatis-personae-v1.js'),'utf8'),ctx,{filename:'imperial-dramatis-personae-v1.js'});
const P=ctx.window.CafarronDramatisPersonaeV1;
if(!P)throw new Error('Archivum Personae register did not answer.');
const v=P.validate();
if(!v.allValid)throw new Error(`Personae validation failed: ${JSON.stringify(v)}`);
if(v.personae!==12)throw new Error(`Expected twelve chronicle personae; received ${v.personae}.`);
const by=new Map(P.PERSONAE.map(p=>[p.id,p]));
const expected=['vishwa-love','karenov','lieutenant-mandrel','besorev','interrogator-javard','pontiff-montpclair','chancellor-ardenal','grand-reverend-grellholm','prefect-lorus','minister-heldforned','sergeant-maximillion-dewinter','lieutenant-abereneth'];
for(const id of expected)if(!by.has(id))throw new Error(`Missing chronicle persona ${id}.`);
for(const id of ['vishwa-love','karenov','lieutenant-mandrel','besorev'])if(!by.get(id).mapNodeIds.includes('node-kertora'))throw new Error(`${id} lost Kertora concordance.`);
for(const id of ['interrogator-javard','pontiff-montpclair'])if(!by.get(id).mapNodeIds.includes('node-jhasyiapan'))throw new Error(`${id} lost Jhasyi’apan concordance.`);
for(const id of ['chancellor-ardenal','grand-reverend-grellholm','prefect-lorus','minister-heldforned'])if(!by.get(id).mapNodeIds.includes('node-presteria'))throw new Error(`${id} lost Presteria concordance.`);
for(const id of ['sergeant-maximillion-dewinter','lieutenant-abereneth'])if(!by.get(id).mapNodeIds.includes('node-panthes'))throw new Error(`${id} lost Panthes concordance.`);
if(!/Critical casualty/i.test(by.get('vishwa-love').status)||/dead|killed/i.test(by.get('vishwa-love').status))throw new Error('Vishwa outcome was over-resolved beyond the attached chronicle.');
if(!/not established/i.test(by.get('besorev').status))throw new Error('Besorev survival uncertainty was lost.');
if(!/Alive when removed/i.test(by.get('pontiff-montpclair').status))throw new Error('Montpclair medicae status is over-resolved or missing.');
if(!/killed in action|death is explicitly/i.test(by.get('sergeant-maximillion-dewinter').status))throw new Error('Dewinter explicit death seal was weakened or lost.');
if(/killed|dead|missing in action/i.test(by.get('lieutenant-abereneth').status)||!/Active at latest attached testimony/i.test(by.get('lieutenant-abereneth').status))throw new Error('Abereneth later fate was over-resolved.');
if(!/Interrogator/.test(by.get('interrogator-javard').rank)||!by.get('interrogator-javard').affiliations.some(x=>/Kelford del Blank/i.test(x)))throw new Error('Javard inquisitorial service seal is incomplete.');
const g=by.get('grand-reverend-grellholm');
if(!g.physicalHistory.some(x=>/xenos-derived|xenos derivatives/i.test(x))||!g.physicalHistory.some(x=>/wholly human|human Imperial alternative/i.test(x)))throw new Error('Grellholm Prolong provenance testimony is incomplete.');
if(g.physicalHistory.some(x=>/administered|received the wholly human|underwent the wholly human/i.test(x)))throw new Error('Grellholm treatment administration was invented beyond the chronicle.');
const exactSources=new Map([
 ['chancellor-ardenal','1vfnma7'],['grand-reverend-grellholm','1vfnma7'],['prefect-lorus','1vfnma7'],['minister-heldforned','1vfnma7'],
 ['sergeant-maximillion-dewinter','1msi8aa'],['lieutenant-abereneth','1msi8aa']
]);
for(const[id,post]of exactSources)if(!new RegExp(`/comments/${post}/`,'i').test(by.get(id).source.url))throw new Error(`${id} lost its exact chronicle seal.`);
for(const p of P.PERSONAE){if(!/^https:\/\/www\.reddit\.com\/r\/EmperorProtects\/comments\/[a-z0-9]+\//i.test(p.source.url))throw new Error(`${p.id} lacks an EmperorProtects chronicle route.`);if(!p.storyBeats.length||!p.relationships.length)throw new Error(`${p.id} lacks narrative or relationship depth.`)}
console.log(JSON.stringify({personae:v.personae,kertora:4,jhasyiapan:2,presteria:4,panthes:2,sourceSealed:v.allSourceSealed,allValid:v.allValid},null,2));
