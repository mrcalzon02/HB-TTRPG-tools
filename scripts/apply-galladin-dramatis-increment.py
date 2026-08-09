#!/usr/bin/env python3
from pathlib import Path
import hashlib
import subprocess

ROOT=Path(__file__).resolve().parents[1]
EXPECTED={
 'assets/warhammer-40k/imperial-dramatis-personae-v1.js':'6ebac7069b95b76934a27611edf08f5507dee1b0',
 'tests/warhammer-dramatis-personae-integrity.test.js':'442eba50fd59f3fb7a847e646955e27660e4b0ad',
 'warhammer-40k-archive-ui-v6.js':'3d3563ffafb3fe564f9ab1d66b770d7e5a45d897',
 'app-lite-view-mounts.js':'1d5bc88e822aaf35d7798ef2124ebbdd65f98b14',
 'warhammer-40k-map.html':'3c9f90ec819a4d0ac64137438368eaac2c38f2cb',
 'index.html':'fa5adb784bf1a6705b3e1a8301cb380f39e04485',
}

def blob_sha(data:bytes)->str:
    return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()

def read(path):
    p=ROOT/path
    data=p.read_bytes()
    actual=blob_sha(data)
    if actual!=EXPECTED[path]:
        raise SystemExit(f'{path} moved: {actual} != {EXPECTED[path]}')
    return data.decode('utf-8')

def replace_once(text,old,new,path):
    n=text.count(old)
    if n!=1:
        raise SystemExit(f'{path}: expected one occurrence of {old!r}, found {n}')
    return text.replace(old,new,1)

persona_path='assets/warhammer-40k/imperial-dramatis-personae-v1.js'
p=read(persona_path)
p=replace_once(p,"const VERSION='1.3.0';","const VERSION='1.4.0';",persona_path)
entries=""",
Object.freeze({
 id:'harbour-master-gaston-selecton',referenceId:'PERSONA-018',name:'Gaston Albertus Sel’ecton',title:'Harbour Master Gaston Albertus Sel’ecton',rank:'Harbour Master of Degravian Harbor',role:'Port authority, former sked captain and political intermediary controlling Galladin Prime’s principal winter harbor',branch:'Imperial civilian port authority / mercantile administration',affiliations:freezeList(['Degravian Harbor','Galladin’s Throne','Galladin system port administration']),currentLocation:'Galladin Prime · Galladin’s Throne · Degravian Harbor',mapNodeIds:freezeList(['node-galladin']),status:'Active at latest attached testimony; remains Harbour Master after the Arbites inspection and is preparing to manage the criminal and salvage consequences of the raid.',standing:'Chronicle-attached harbor authority and former sea captain',biography:'Gaston Albertus Sel’ecton is the Harbour Master of Degravian Harbor, the principal trade and winter-navigation node of Galladin Prime. Before acquiring the safer but politically dangerous harbor post he served as a sked captain, surviving years of brutal high-seas work, lost friends and vanished crews before deliberately maneuvering himself ashore. His present authority rests on a mixture of genuine logistical competence, guild negotiation, bribery, tolerated contraband and careful management of Galladin’s criminal families. When a city gunfight threatens to bring Imperial justice directly onto the docks, Gaston proves how much of the harbor actually runs through him: he orders every illicit warehouse stripped, forces the families to sacrifice cargo, presents a clean face to the Arbites and then immediately begins managing the clandestine salvage economy that follows. He fears the sea and the Imperium, but also remains addicted to the control, intrigue and risk that his office gives him.',temperament:freezeList(['Proud','Anxious beneath a practiced confident exterior','Politically agile','Cynically humorous','Corrupt but operationally competent','Highly protective of his office','Comfortable with threats and bribery','Still drawn to danger despite having left active sea command']),doctrine:'Degravian Harbor must remain functional, ice-free and outwardly lawful regardless of the compromises required beneath that appearance. Gaston treats bribes, quiet contraband, selective blindness and underworld contacts as manageable parts of port administration, but when Imperial scrutiny approaches he prioritizes preservation of the harbor and his authority over any single criminal family or cargo.',physicalHistory:freezeList(['Former sked captain who survived years of dangerous ocean service and the loss of friends and entire crews; no specific lasting bodily injury is stated.']),possessions:freezeList(['Harbour Master’s charts, dock maps and manifests','Office communications linking guilds, crews and criminal-family representatives','Administrative authority over Degravian Harbor berths, fuel allotments and winter channel operations']),relationships:freezeList([{name:'Jak',nature:'Trusted aide and runner whose reports, commlink work and dockside errands allow Gaston to act quickly across the harbor.'},{name:'De Luca family',nature:'Major contraband family whose escalating disregard for Gaston threatens both his office and the harbor’s political balance.'},{name:'Loris',nature:'De Luca representative whom Gaston personally orders to clear the family warehouses before the Arbites arrive.'},{name:'Berto of the Vellios family',nature:'Diplomatic underworld contact accustomed to paying Gaston’s administrative fees and receiving discreet warning.'},{name:'Linna of the Kalvos family',nature:'Cagey criminal-family contact ordered to empty suspect warehouses before the Imperial raid.'},{name:'Adeptus Arbites',nature:'External Imperial law authority Gaston deceives through a rapid purge of visible contraband while recognizing that their future scrutiny could destroy him.'}]),storyBeats:freezeList([{place:'Galladin Prime · Degravian Harbor',beat:'Reflected on his earlier life as a sked captain and the deliberate choice to secure a harbor-bound post where maritime experience could be converted into political power.'},{place:'Galladin Prime · Degravian Harbor',beat:'Managed worsening winter ice, failing sked availability, heating requirements, guild demands, merchant scrutiny and the bribery economy surrounding essential port operations.'},{place:'Galladin’s Throne',beat:'Learned from Jak that the De Luca family had abruptly evacuated a contraband warehouse, then connected that movement to a running gunfight involving an Imperial patrol.'},{place:'Degravian Harbor',beat:'Ordered criminal families, dock crews and smugglers to erase visible contraband before an imminent Arbites raid, sacrificing months of illicit cargo to keep the harbor clean.'},{place:'Degravian Harbor',beat:'Faced the Arbites inspection personally, maintained the fiction of an orderly Imperial port and survived the search without the hidden criminal network being exposed.'},{place:'Degravian Harbor',beat:'After the raid, warned salvage operators to work clandestinely and began maneuvering against the De Luca family when they openly reoccupied the warehouse that had nearly cost him his title.'}]),source:Object.freeze({label:'A Harbormaster’s Hope',url:'https://www.reddit.com/r/EmperorProtects/comments/1ggo76o/a_harbormasters_hope/',status:SOURCE_STATUS}),sourceAuthority:'Direct viewpoint character. His former sked command, harbor office, corruption, political network, Arbites deception and latest continued tenure are directly depicted; no later arrest, removal or death is established.'
}),
Object.freeze({
 id:'jak-degravian-harbor',referenceId:'PERSONA-019',name:'Jak',title:'Jak',rank:'Harbour Master’s aide',role:'Trusted aide, runner and dockside information conduit for Gaston Sel’ecton',branch:'Imperial civilian port administration',affiliations:freezeList(['Degravian Harbor','Office of the Harbour Master']),currentLocation:'Galladin Prime · Galladin’s Throne · Degravian Harbor',mapNodeIds:freezeList(['node-galladin']),status:'Active at latest attached testimony; carrying Gaston’s warning to the salvage yards after surviving the Arbites inspection.',standing:'Chronicle-attached harbor aide',biography:'Jak is one of Gaston Sel’ecton’s more trusted aides: a wiry, nervous man whose talent for getting near trouble also makes him useful as an information conduit. He is the person who brings Gaston the first actionable warning that the De Luca family has evacuated its contraband warehouse and continues to serve as runner, commlink operator and relay while the harbor scrubs itself ahead of an Arbites raid. Jak is visibly more frightened than his superior when Imperial troops arrive, but he does not abandon his post. After the inspection he is immediately sent back into the harbor’s shadow economy to warn salvage crews that recovering dumped contraband will bring renewed Imperial attention.',temperament:freezeList(['Nervous','Eager to be useful','Loyal to Gaston’s office','Excitable around dangerous information','Obedient under pressure','Capable of functioning despite visible fear']),doctrine:'Observe enough to warn the Harbour Master, keep dock crews quiet, and avoid seeing more than survival requires. Jak’s value lies in fast reporting and reliable execution rather than independent political authority.',physicalHistory:freezeList([]),possessions:freezeList(['Commlink used to relay Gaston’s emergency orders across Degravian Harbor']),relationships:freezeList([{name:'Harbour Master Gaston Albertus Sel’ecton',nature:'Direct superior and trusted patron; Gaston relies on Jak for sensitive intelligence, emergency communications and underworld-facing errands.'},{name:'Degravian Harbor dock crews',nature:'Operational network through which Jak spreads warnings and orders during the contraband purge.'},{name:'Perimeter informant',nature:'Unnamed harbor watcher whose observation of the De Luca convoy reaches Gaston through Jak.'},{name:'Salvage yards',nature:'Harbor operators Jak is ordered to warn after the raid so clandestine recovery does not immediately provoke another Arbites intervention.'}]),storyBeats:freezeList([{place:'Degravian Harbor · Harbour Master’s office',beat:'Reported the De Luca family’s full-scale warehouse evacuation and the conspicuous movement of senior family personnel into the city.'},{place:'Degravian Harbor',beat:'Used his commlink to relay emergency orders while harbor crews dumped or moved contraband ahead of the approaching Arbites transports.'},{place:'Degravian Harbor',beat:'Remained beside Gaston during the Imperial inspection despite obvious fear and witnessed the raid conclude without discovery of the criminal cargo network.'},{place:'Degravian Harbor',beat:'Was sent immediately afterward to warn salvage crews that attempts to recover the dumped contraband had to remain hidden from continuing Arbites surveillance.'}]),source:Object.freeze({label:'A Harbormaster’s Hope',url:'https://www.reddit.com/r/EmperorProtects/comments/1ggo76o/a_harbormasters_hope/',status:SOURCE_STATUS}),sourceAuthority:'Directly depicted throughout the harbor crisis as Gaston’s trusted aide. His duties and latest activity are explicit; no later promotion, arrest, injury or death is established.'
})"""
sentinel='\n]);\nconst byId=new Map(PERSONAE.map(p=>[p.id,p]));'
if p.count(sentinel)!=1:
    raise SystemExit('Personae array closing sentinel changed')
p=p.replace(sentinel,entries+sentinel,1)
p=replace_once(p,'allValid:PERSONAE.length===17&&!bad.length','allValid:PERSONAE.length===19&&!bad.length',persona_path)
(ROOT/persona_path).write_text(p,encoding='utf-8')

# Permanent integrity contract.
test_path='tests/warhammer-dramatis-personae-integrity.test.js'
t=read(test_path)
t=replace_once(t,"if(v.personae!==17)throw new Error(`Expected seventeen chronicle personae; received ${v.personae}.`);","if(v.personae!==19)throw new Error(`Expected nineteen chronicle personae; received ${v.personae}.`);",test_path)
t=replace_once(t,"'governor-talbor-varik','commissar-keeper-dren-solvik','domina-aestra-callen'];","'governor-talbor-varik','commissar-keeper-dren-solvik','domina-aestra-callen','harbour-master-gaston-selecton','jak-degravian-harbor'];",test_path)
anchor="for(const id of ['benson-pelcher','jerry-slassen','governor-talbor-varik','commissar-keeper-dren-solvik','domina-aestra-callen'])if(!by.get(id).mapNodeIds.includes('node-new-presidio'))throw new Error(`${id} lost New Presidio concordance.`);"
insert=anchor+"\nfor(const id of ['harbour-master-gaston-selecton','jak-degravian-harbor'])if(!by.get(id).mapNodeIds.includes('node-galladin'))throw new Error(`${id} lost Galladin concordance.`);"
t=replace_once(t,anchor,insert,test_path)
status_anchor="for(const id of ['governor-talbor-varik','commissar-keeper-dren-solvik','domina-aestra-callen'])if(/killed|dead|missing in action|removed from office/i.test(by.get(id).status)||!/Active at latest attached testimony/i.test(by.get(id).status))throw new Error(`${id} later outcome was invented beyond Antegra Station.`);"
status_insert=status_anchor+"\nfor(const id of ['harbour-master-gaston-selecton','jak-degravian-harbor'])if(/killed|dead|missing in action|arrested|removed from office/i.test(by.get(id).status)||!/Active at latest attached testimony/i.test(by.get(id).status))throw new Error(`${id} later outcome was invented beyond A Harbormaster’s Hope.`);\nif(!by.get('harbour-master-gaston-selecton').relationships.some(x=>/^Jak$/i.test(x.name))||!by.get('jak-degravian-harbor').relationships.some(x=>/Gaston/i.test(x.name)))throw new Error('Gaston and Jak lost their direct Degravian Harbor concordance.');\nif(!/former sked captain/i.test(by.get('harbour-master-gaston-selecton').biography)||!by.get('harbour-master-gaston-selecton').affiliations.some(x=>/Degravian Harbor/i.test(x)))throw new Error('Gaston lost his sked-captain history or harbor authority.');"
t=replace_once(t,status_anchor,status_insert,test_path)
source_anchor="['governor-talbor-varik','1lr8fmy'],['commissar-keeper-dren-solvik','1lr8fmy'],['domina-aestra-callen','1lr8fmy']"
t=replace_once(t,source_anchor,source_anchor+",\n ['harbour-master-gaston-selecton','1ggo76o'],['jak-degravian-harbor','1ggo76o']",test_path)
t=replace_once(t,"newPresidioBroadcast:2,antegra:3,sourceSealed:v.allSourceSealed","newPresidioBroadcast:2,antegra:3,galladinHarbor:2,sourceSealed:v.allSourceSealed",test_path)
(ROOT/test_path).write_text(t,encoding='utf-8')

# Delivery seals.
for path,old,new in [
 ('warhammer-40k-archive-ui-v6.js','imperial-dramatis-personae-v1.js?v=4','imperial-dramatis-personae-v1.js?v=5'),
 ('app-lite-view-mounts.js','imperial-dramatis-personae-v1.js?v=4','imperial-dramatis-personae-v1.js?v=5'),
 ('warhammer-40k-map.html','imperial-dramatis-personae-v1.js?v=4','imperial-dramatis-personae-v1.js?v=5'),
 ('index.html','app-lite-view-mounts.js?v=14','app-lite-view-mounts.js?v=15'),
]:
    s=read(path)
    s=replace_once(s,old,new,path)
    (ROOT/path).write_text(s,encoding='utf-8')

checks=[
 ['node','--check',persona_path],
 ['node','--check','warhammer-40k-archive-ui-v6.js'],
 ['node','--check','app-lite-view-mounts.js'],
 ['node','--check',test_path],
 ['node',test_path],
 ['node','tests/warhammer-diegetic-language-integrity.test.js'],
]
for cmd in checks:
    subprocess.run(cmd,cwd=ROOT,check=True)
print('Galladin Dramatis increment validated.')
