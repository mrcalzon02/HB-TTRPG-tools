#!/usr/bin/env python3
from pathlib import Path
import hashlib
import subprocess

ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {
    'assets/warhammer-40k/imperial-dramatis-personae-v1.js': '7c1bb20909db3f59919df9eed1dd8704658f7098',
    'tests/warhammer-dramatis-personae-integrity.test.js': '05001334050957bb383b3b6fd213ae26808a4f30',
    'app-lite-view-mounts.js': 'df1f2a06f7326cfc112c313f84be7f1105259700',
    'warhammer-40k-map.html': 'c78e8c5bcace2a47f63e296c5b11f4aedd3b591b',
    'index.html': '9aa761a84613739dc8e8a59ea06d982dc94656d4',
}


def blob_sha(data: bytes) -> str:
    return hashlib.sha1(b'blob ' + str(len(data)).encode() + b'\0' + data).hexdigest()


def read(path: str) -> str:
    data = (ROOT / path).read_bytes()
    actual = blob_sha(data)
    if actual != EXPECTED[path]:
        raise SystemExit(f'{path} moved: {actual} != {EXPECTED[path]}')
    return data.decode('utf-8')


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one anchor, found {count}')
    return text.replace(old, new, 1)


persona_path = 'assets/warhammer-40k/imperial-dramatis-personae-v1.js'
p = read(persona_path)
p = replace_once(p, "const VERSION='1.5.0';", "const VERSION='1.6.0';", 'personae version')

p = replace_once(
    p,
    "currentLocation:'Galladin’s Throne · city outskirts and regimental barracks',mapNodeIds:freezeList(['node-galladin']),status:'Active at latest attached testimony; returned toward his unit after learning of Corporal Kathine’s execution. The cause of an observed resistance to Neverborn influence remains unsealed.'",
    "currentLocation:'Galladin’s Throne · mobile patrols, ambush sites and rotating urban checkpoints',mapNodeIds:freezeList(['node-galladin']),status:'Active at latest attached testimony; commanding his depleted ad hoc unit through weeks of traitor ambushes and rotating checkpoint duty. The cause of the earlier observed resistance to Neverborn influence remains unsealed.'",
    'Vange latest testimony',
)

p = replace_once(
    p,
    "His surviving testimony ends in grief, fatigue and stubborn refusal to surrender responsibility for his people, while an unseen Neverborn observer discovers that attempts to manipulate his emotions meet an unexplained resistance whose cause the chronicle does not identify.'",
    "His first attached testimony ends in grief, fatigue and stubborn refusal to surrender responsibility for his people, while an unseen Neverborn observer discovers that attempts to manipulate his emotions meet an unexplained resistance whose cause the chronicle does not identify. A later attached chronicle follows him back into active duty: Vange rides with Lieutenant Durak through a traitor ambush, learns the lieutenant’s account of an earlier Cadian breakout and the provenance of his ancient Volkite rifle, then spends weeks watching his formation erode into rotating checkpoint duty under repeated insurgent strikes before enemy landers begin descending over the city.'",
    'Vange biography continuation',
)

p = replace_once(
    p,
    "{name:'Unidentified Neverborn observer',nature:'Hidden entity that attempts to exploit Vange’s grief and anger but encounters an unexplained resistance; neither Vange nor the archive establishes the cause.'}])",
    "{name:'Unidentified Neverborn observer',nature:'Hidden entity that attempts to exploit Vange’s grief and anger but encounters an unexplained resistance; neither Vange nor the archive establishes the cause.'},{name:'Lieutenant Durak',nature:'Cadian lieutenant and Chimera commander serving alongside Vange; his Volkite relic, aggressive battlefield conduct and Kerodan VII account become part of Vange’s later attached testimony.'},{name:'Private Cren',nature:'Young trooper in Vange’s unit who repeatedly looks to him for tactical interpretation and relief from the psychological grind of Galladin checkpoint duty.'}])",
    'Vange relationships continuation',
)

p = replace_once(
    p,
    "{place:'Galladin’s Throne · barracks perimeter',beat:'Passed unknowingly near a hidden Neverborn observer whose attempts to shape his grief, fear and anger repeatedly failed against an unexplained resistance.'}])",
    "{place:'Galladin’s Throne · barracks perimeter',beat:'Passed unknowingly near a hidden Neverborn observer whose attempts to shape his grief, fear and anger repeatedly failed against an unexplained resistance.'},{place:'Galladin’s Throne · mobile patrol',beat:'Rode with Lieutenant Durak through an organized traitor-Guard ambush and witnessed Durak openly deploy an ancient Volkite rifle from the Chimera.'},{place:'Galladin’s Throne · Chimera transit',beat:'Listened as Durak recounted the Kerodan VII breakout, his Cadian bravery citation and his own account of how the Volkite relic entered his custody.'},{place:'Galladin’s Throne · rotating checkpoints',beat:'Led his exhausted formation through weeks of ambushes, repeated redeployments and guard posts until enemy landers descending through the city’s defenses triggered an order to fall back and consolidate.'}])",
    'Vange story continuation',
)

p = replace_once(
    p,
    "source:Object.freeze({label:'Galladin’s Throne',url:'https://www.reddit.com/r/EmperorProtects/comments/1fakl6i/galladins_throne/',status:SOURCE_STATUS}),sourceAuthority:'Direct viewpoint character. Promotion, prior traitor-Marine survival, command crisis, relationship to Kathine and the observed but unexplained resistance to Neverborn influence are directly depicted; no later supernatural classification, corruption, promotion or death is established.'",
    "source:Object.freeze({label:'Galladin’s Throne',url:'https://www.reddit.com/r/EmperorProtects/comments/1fakl6i/galladins_throne/',status:SOURCE_STATUS}),additionalSources:freezeList([{label:'Galladins Throne, Part-3',url:'https://www.reddit.com/r/EmperorProtects/comments/1ggo856/galladins_throne_part3/',status:SOURCE_STATUS}]),sourceAuthority:'Direct viewpoint character across two attached Galladin chronicles. The first establishes his promotion, prior traitor-Marine survival, Kathine crisis and observed but unexplained resistance to Neverborn influence; Part-3 directly continues his patrol and checkpoint service with Durak and Cren. No supernatural classification, corruption, later promotion or death is established.'",
    'Vange secondary chronicle seal',
)

new_personae = """Object.freeze({
 id:'lieutenant-durak',referenceId:'PERSONA-023',name:'Durak',title:'Lieutenant Durak',rank:'Lieutenant',role:'Cadian lieutenant and Chimera commander serving within Vange’s ad hoc Galladin formation',branch:'Astra Militarum',affiliations:freezeList(['Cadian regimental lineage','Galladin’s Throne Imperial garrison','Vange’s ad hoc survivor formation']),currentLocation:'Galladin’s Throne · rotating urban checkpoints / Chimera command',mapNodeIds:freezeList(['node-galladin']),status:'Active at latest attached testimony; preparing with Vange’s unit as enemy landers descend on Galladin’s Throne. No later fate is established.',standing:'Chronicle-attached Cadian lieutenant and vehicle commander',biography:'Lieutenant Durak is a Cadian veteran folded into the same improvised Galladin formation as Sergeant Vange after what he describes as a bureaucratic reassignment error. During a traitor-Guard ambush he reveals an ancient Volkite rifle hidden aboard his Chimera and uses it with unnerving enthusiasm, after which he gives Vange’s soldiers his own account of its provenance. Durak says that on Kerodan VII his former company was cut off by Chaos forces with command and vox contact lost; rather than wait for destruction, he led a breakout and later received a Cadian Meritorious Citation for Excessive Bravery. He further says his regimental commander entrusted the Volkite to him as a relic of an older Cadian guard before transfer orders misplaced him into another regiment. Durak claims formal command does not know he possesses it, while later narration makes clear that among personnel who work with him regularly the weapon has become an open secret. His latest attached appearance finds him meticulously maintaining the relic as rotating checkpoint duty gives way to the alarm of enemy landers descending over Galladin’s Throne.',temperament:freezeList(['Recklessly brave under fire','Cadian-proud','Dryly cynical about Imperial bureaucracy','Meticulous with personal equipment','Enjoys unsettling or impressing nearby troopers','Capable of abrupt shifts from manic battle exhilaration to controlled professionalism']),doctrine:'When encirclement becomes a death sentence, Durak favors decisive aggression over waiting to be destroyed. On Galladin he treats his Chimera and relic weapon as practical survival assets, keeps the Volkite outside ordinary paperwork, and maintains readiness even during monotonous checkpoint assignments.',physicalHistory:freezeList(['No specific lasting bodily wound is stated in the attached chronicle.','Self-reports surviving the Kerodan VII encirclement and breakout that destroyed or scattered much of his former company.']),possessions:freezeList(['Ancient Volkite rifle kept in a concealed Chimera compartment and maintained obsessively','Helmet bearing a small white-silver Cadian Meritorious Citation for Excessive Bravery']),relationships:freezeList([{name:'Sergeant Vange',nature:'Fellow leader in the ad hoc Galladin formation; Vange witnesses Durak deploy the Volkite, listens to his Cadian history and continues serving beside him through later checkpoint rotations.'},{name:'Former Cadian regimental commander',nature:'According to Durak’s own account, the officer presented him with the Volkite relic after the Kerodan VII breakout and instructed him to keep it safe and use it well.'},{name:'Private Cren and Vange’s troopers',nature:'Nearby soldiers who question Durak about the relic and gradually treat his unusual weapon and battlefield manner as part of the unit’s reality.'},{name:'Imperial command bureaucracy',nature:'Durak blames a transfer-paperwork mix-up for separating him from an intended Cadian reassignment; he also claims formal command need not know about the Volkite, despite its later status as an open secret among close associates.'}]),storyBeats:freezeList([{place:'Galladin’s Throne · traitor ambush',beat:'Opened the Chimera hatch under incoming las-fire and used the ancient Volkite rifle against traitor Guardsmen, forcing the surviving attackers into a rapid withdrawal.'},{place:'Kerodan VII · recounted prior service',beat:'Told Vange’s squad that his Cadian company had been cut off with command and vox contact lost, and that he led a breakout rather than wait for the formation to be destroyed.'},{place:'Kerodan VII · recounted decoration',beat:'Displayed the helmet mark he identified as a Cadian Meritorious Citation for Excessive Bravery and said his regimental commander then entrusted the Volkite relic to him.'},{place:'Galladin’s Throne · Chimera transit',beat:'Explained that a transfer error placed him in a different regiment instead of another Cadian unit and stated that formal command did not know about the relic.'},{place:'Galladin’s Throne · rotating checkpoint',beat:'Maintained the Volkite openly and meticulously enough that the chronicle describes it as an open secret among people who regularly work with him.'},{place:'Galladin’s Throne · air-raid alarm',beat:'Identified descending enemy landers as Vange’s unit received orders to fall back and consolidate with other Guard elements.'}]),source:Object.freeze({label:'Galladins Throne, Part-3',url:'https://www.reddit.com/r/EmperorProtects/comments/1ggo856/galladins_throne_part3/',status:SOURCE_STATUS}),sourceAuthority:'Directly depicted on Galladin’s Throne. The Volkite’s use, Durak’s present rank, Chimera role and checkpoint service are direct testimony; Kerodan VII, the citation’s circumstances, relic transfer and reassignment error are preserved explicitly as Durak’s own account rather than independently witnessed archive fact.'
}),
Object.freeze({
 id:'private-cren',referenceId:'PERSONA-024',name:'Cren',title:'Private Cren',rank:'Private',role:'Young Astra Militarum trooper serving under Sergeant Vange during the Galladin traitor campaign',branch:'Astra Militarum',affiliations:freezeList(['Galladin’s Throne Imperial garrison','Vange’s ad hoc survivor formation']),currentLocation:'Galladin’s Throne · rotating urban checkpoints',mapNodeIds:freezeList(['node-galladin']),status:'Active at latest attached testimony; serving at Vange’s checkpoint before the order to fall back as enemy landers descend. No later fate is established.',standing:'Chronicle-attached enlisted trooper',biography:'Private Cren is a young trooper in Sergeant Vange’s increasingly exhausted Galladin formation. His surviving testimony is deliberately narrow but recurrent: he approaches Vange pale and shaken while they inspect a Chimera destroyed in a coordinated traitor ambush, asks whether the victims simply wandered into the wrong sector, and later remains with the same unit through weeks of rotating checkpoint duty. Cren’s later banter about guard duty shows the small, grim humor by which the squad manages boredom and fear. The chronicle does not supply his homeworld, earlier service, family, wounds or later outcome.',temperament:freezeList(['Young','Visibly affected by battlefield casualties','Curious about immediate tactical circumstances','Uses dry barracks humor to manage prolonged tension','Remains attentive during monotonous duty']),doctrine:'Cren’s limited testimony supports no independent command doctrine. He observes, asks practical questions of his sergeant and maintains vigilance while the unit waits through repeated checkpoint rotations.',physicalHistory:freezeList([]),possessions:freezeList([]),relationships:freezeList([{name:'Sergeant Vange',nature:'Immediate commander and primary source of tactical interpretation; Cren repeatedly addresses him during ambush aftermath and checkpoint duty.'},{name:'Lieutenant Durak',nature:'Vehicle commander serving with the same formation; Cren is among the troopers living with Durak’s conspicuous Volkite relic and unusual battlefield conduct.'},{name:'Corporal Whit',nature:'Fellow checkpoint soldier whose bleak joke about Imperial guard duty answers Cren’s attempt to describe the posting as the easy part of soldiering.'}]),storyBeats:freezeList([{place:'Galladin’s Throne · destroyed Chimera',beat:'Approached Vange pale and shaken while inspecting a patrol vehicle destroyed by heavy weapons and asked what had hit it.'},{place:'Galladin’s Throne · ambush aftermath',beat:'Questioned whether the destroyed patrol had become lost far outside its intended sector, helping frame Vange’s realization that the victims had been exposed to a prepared attack.'},{place:'Galladin’s Throne · rotating checkpoint',beat:'Remained with Vange through later guard rotations and used grim humor with Corporal Whit about the supposed ease of checkpoint duty.'}]),source:Object.freeze({label:'Galladins Throne, Part-3',url:'https://www.reddit.com/r/EmperorProtects/comments/1ggo856/galladins_throne_part3/',status:SOURCE_STATUS}),sourceAuthority:'Directly named and depicted in several scenes within Part-3. Rank, repeated service under Vange and checkpoint presence are explicit; no origin, promotion, casualty, specialist role or later fate is invented.'
})"""

p = replace_once(p, "\n})\n]);\nconst byId", "\n}),\n" + new_personae + "\n]);\nconst byId", 'append Durak and Cren')
p = replace_once(
    p,
    "const byId=new Map(PERSONAE.map(p=>[p.id,p]));\nfunction E",
    "const byId=new Map(PERSONAE.map(p=>[p.id,p]));\nfunction sourceHistory(p){return Object.freeze([p.source,...(p.additionalSources||[])])}\nfunction E",
    'source history helper',
)
p = replace_once(
    p,
    "source:p.source,keyStory:p.source.label,logistics:",
    "source:p.source,sources:sourceHistory(p),keyStory:p.source.label,logistics:",
    'record source history',
)
p = replace_once(
    p,
    "['Present standing',p.status],['Archive authority',p.sourceAuthority],['Temperament entered from testimony',p.temperament]",
    "['Present standing',p.status],['Attached chronicle seals',sourceHistory(p).map(s=>s.label)],['Archive authority',p.sourceAuthority],['Temperament entered from testimony',p.temperament]",
    'render source history',
)
old_validate = "function validate(){const ids=new Set(),refs=new Set(),bad=[];for(const p of PERSONAE){if(ids.has(p.id)||refs.has(p.referenceId)||!p.name||!p.source?.url||p.source.status!=='verified'||!p.biography||!p.mapNodeIds?.length||!p.storyBeats?.length||!p.relationships?.length)bad.push(p.id);ids.add(p.id);refs.add(p.referenceId)}return Object.freeze({personae:PERSONAE.length,duplicateOrInvalid:Object.freeze(bad),allSourceSealed:PERSONAE.every(p=>/^https:\\/\\/www\\.reddit\\.com\\/r\\/EmperorProtects\\/comments\\/[a-z0-9]+\\//i.test(p.source.url)),allValid:PERSONAE.length===22&&!bad.length})}"
new_validate = "function validate(){const ids=new Set(),refs=new Set(),bad=[],sourceRoute=/^https:\\/\\/www\\.reddit\\.com\\/r\\/EmperorProtects\\/comments\\/[a-z0-9]+\\//i;for(const p of PERSONAE){const sources=sourceHistory(p);if(ids.has(p.id)||refs.has(p.referenceId)||!p.name||!sources.length||sources.some(s=>!s?.url||s.status!=='verified'||!sourceRoute.test(s.url))||!p.biography||!p.mapNodeIds?.length||!p.storyBeats?.length||!p.relationships?.length)bad.push(p.id);ids.add(p.id);refs.add(p.referenceId)}return Object.freeze({personae:PERSONAE.length,duplicateOrInvalid:Object.freeze(bad),allSourceSealed:PERSONAE.every(p=>sourceHistory(p).every(s=>sourceRoute.test(s.url)&&s.status==='verified')),allValid:PERSONAE.length===24&&!bad.length})}"
p = replace_once(p, old_validate, new_validate, 'personae validation contract')
p = replace_once(
    p,
    "window.CafarronDramatisPersonaeV1=Object.freeze({VERSION,PERSONAE,records,byId,renderRecordContext,validate});",
    "window.CafarronDramatisPersonaeV1=Object.freeze({VERSION,PERSONAE,records,byId,sourceHistory,renderRecordContext,validate});",
    'export source history',
)
write(persona_path, p)

test_path = 'tests/warhammer-dramatis-personae-integrity.test.js'
t = read(test_path)
t = replace_once(t, "if(v.personae!==22)throw new Error(`Expected twenty-two chronicle personae; received ${v.personae}.`);", "if(v.personae!==24)throw new Error(`Expected twenty-four chronicle personae; received ${v.personae}.`);", 'test count')
t = replace_once(t, "'sergeant-vange','commissar-velraden','corporal-kathine'];", "'sergeant-vange','commissar-velraden','corporal-kathine','lieutenant-durak','private-cren'];", 'test expected ids')
t = replace_once(t, "['harbour-master-gaston-selecton','jak-degravian-harbor','sergeant-vange','commissar-velraden','corporal-kathine']", "['harbour-master-gaston-selecton','jak-degravian-harbor','sergeant-vange','commissar-velraden','corporal-kathine','lieutenant-durak','private-cren']", 'test Galladin concordance')

vange_anchor = "if(!by.get('sergeant-vange').storyBeats.some(x=>/Neverborn/i.test(x.beat)&&/unexplained resistance/i.test(x.beat)))throw new Error('Vange lost the observed-but-unexplained Neverborn resistance testimony.');"
vange_more = vange_anchor + "\nif(!P.sourceHistory(by.get('sergeant-vange')).some(s=>/1ggo856/i.test(s.url)))throw new Error('Vange lost his Galladin Part-3 secondary chronicle seal.');\nif(!by.get('sergeant-vange').storyBeats.some(x=>/Durak/i.test(x.beat)&&/Volkite/i.test(x.beat))||!by.get('sergeant-vange').storyBeats.some(x=>/rotating checkpoints/i.test(x.place)))throw new Error('Vange lost his Part-3 continuation testimony.');"
t = replace_once(t, vange_anchor, vange_more, 'test Vange secondary chronicle')

kathine_anchor = "if(!by.get('sergeant-vange').relationships.some(x=>/Kathine/i.test(x.name))||!by.get('corporal-kathine').relationships.some(x=>/Vange/i.test(x.name)))throw new Error('Vange and Kathine lost their direct command concordance.');"
new_checks = kathine_anchor + "\nconst durak=by.get('lieutenant-durak');\nif(!/Lieutenant/.test(durak.rank)||!/Active at latest attached testimony/i.test(durak.status)||/killed|dead|missing in action/i.test(durak.status))throw new Error('Durak rank or unresolved later fate was corrupted.');\nif(!durak.possessions.some(x=>/Volkite/i.test(x))||!durak.possessions.some(x=>/Cadian Meritorious Citation/i.test(x)))throw new Error('Durak lost the Volkite or citation testimony.');\nif(!/Kerodan VII/i.test(durak.biography)||!/Durak’s own account/i.test(durak.sourceAuthority))throw new Error('Durak backstory lost its self-reported evidentiary boundary.');\nif(!/formal command does not know/i.test(durak.biography)||!/open secret/i.test(durak.biography))throw new Error('Durak command-awareness contradiction was flattened instead of preserved.');\nconst cren=by.get('private-cren');\nif(!/Private/.test(cren.rank)||!/Active at latest attached testimony/i.test(cren.status)||/killed|dead|missing in action|promoted/i.test(cren.status))throw new Error('Cren narrow enlisted record over-resolved his later life.');\nif(!by.get('sergeant-vange').relationships.some(x=>/Lieutenant Durak/i.test(x.name))||!durak.relationships.some(x=>/Sergeant Vange/i.test(x.name)))throw new Error('Vange and Durak lost their direct field concordance.');\nif(!by.get('sergeant-vange').relationships.some(x=>/Private Cren/i.test(x.name))||!cren.relationships.some(x=>/Sergeant Vange/i.test(x.name)))throw new Error('Vange and Cren lost their direct command concordance.');"
t = replace_once(t, kathine_anchor, new_checks, 'test Durak and Cren')

t = replace_once(
    t,
    "['sergeant-vange','1fakl6i'],['commissar-velraden','1fakl6i'],['corporal-kathine','1fakl6i']",
    "['sergeant-vange','1fakl6i'],['commissar-velraden','1fakl6i'],['corporal-kathine','1fakl6i'],['lieutenant-durak','1ggo856'],['private-cren','1ggo856']",
    'test exact sources',
)
t = replace_once(
    t,
    "for(const p of P.PERSONAE){if(!/^https:\\/\\/www\\.reddit\\.com\\/r\\/EmperorProtects\\/comments\\/[a-z0-9]+\\//i.test(p.source.url))throw new Error(`${p.id} lacks an EmperorProtects chronicle route.`);if(!p.storyBeats.length||!p.relationships.length)throw new Error(`${p.id} lacks narrative or relationship depth.`)}",
    "for(const p of P.PERSONAE){for(const s of P.sourceHistory(p))if(!/^https:\\/\\/www\\.reddit\\.com\\/r\\/EmperorProtects\\/comments\\/[a-z0-9]+\\//i.test(s.url))throw new Error(`${p.id} lacks an EmperorProtects chronicle route.`);if(!p.storyBeats.length||!p.relationships.length)throw new Error(`${p.id} lacks narrative or relationship depth.`)}",
    'test all source routes',
)
t = replace_once(t, "galladinThrone:3,sourceSealed", "galladinThrone:5,multiChroniclePersonae:1,sourceSealed", 'test report counts')
write(test_path, t)

app_path = 'app-lite-view-mounts.js'
app = read(app_path)
app = replace_once(app, "assets/warhammer-40k/imperial-dramatis-personae-v1.js?v=6", "assets/warhammer-40k/imperial-dramatis-personae-v1.js?v=7", 'app Dramatis cache seal')
write(app_path, app)

map_path = 'warhammer-40k-map.html'
map_text = read(map_path)
map_text = replace_once(map_text, "assets/warhammer-40k/imperial-dramatis-personae-v1.js?v=6", "assets/warhammer-40k/imperial-dramatis-personae-v1.js?v=7", 'standalone map Dramatis cache seal')
write(map_path, map_text)

index_path = 'index.html'
index = read(index_path)
index = replace_once(index, 'app-lite-view-mounts.js?v=16', 'app-lite-view-mounts.js?v=17', 'outer app cache seal')
write(index_path, index)

subprocess.run(['node', '--check', persona_path], cwd=ROOT, check=True)
subprocess.run(['node', '--check', app_path], cwd=ROOT, check=True)
subprocess.run(['node', '--test', test_path], cwd=ROOT, check=True)
subprocess.run(['git', 'diff', '--check'], cwd=ROOT, check=True)
print('Galladin Part-3 Dramatis increment validated: 24 canonical personae, Vange multi-chronicle seal, Durak and Cren added.')
