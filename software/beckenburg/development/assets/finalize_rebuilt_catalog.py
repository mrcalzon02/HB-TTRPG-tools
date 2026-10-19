"""Merge the source-based asset work and generate its visual review gallery.

Run with a Python environment containing Pillow, after the four Blender jobs.
Only retired files named in the previous asset catalog are removed.
"""
from pathlib import Path
import json, hashlib, html, math
from PIL import Image, ImageDraw, ImageFont

PROJECT=Path(__file__).resolve().parents[2]
ROOT=PROJECT/'development/assets/equipment-catalog'
RUNTIME=PROJECT/'assets/runtime/models'
MANIFEST=ROOT/'equipment-assets.json'
FRAGMENTS=['rebuild-fixtures.json','rebuild-medical.json','rebuild-electronics.json','rebuild-specialists.json']

def records(item):
    for stage in item['stages']:
        yield stage
        yield from stage.get('variants',{}).values()

def main():
    old=json.loads(MANIFEST.read_text(encoding='utf-8'))
    merged={};sources={}
    for name in FRAGMENTS:
        fragment=json.loads((ROOT/name).read_text(encoding='utf-8'))
        for item in fragment['items']:
            if item['id'] in merged:raise ValueError('Duplicate family '+item['id'])
            merged[item['id']]=item
        for source in fragment.get('sources',[]):
            sources[source.get('sha256',source.get('source',source.get('name','unknown')))]=source
    recorder=next(item for item in old['items'] if item['id']=='SOUND_RECORDER')
    recorder['preserved_prior_asset']=True
    merged['SOUND_RECORDER']=recorder
    original_ids=[item['id'] for item in old['items'] if item['id']!='HEALTH_SUPPLIES']
    missing=set(original_ids)-set(merged)
    if missing:raise ValueError('Missing asset families: '+', '.join(sorted(missing)))
    order=original_ids+sorted(set(merged)-set(original_ids))
    items=[merged[key] for key in order]
    for item in items:
        # Registry IDs are authoritative; sanitize only old mojibake labels.
        if any(x in item.get('label','') for x in ('\u00e2','\u20ac','\u00c2')):item['label']=item['id'].replace('_',' ').title()
        if item['id']=='EMF_READER':item['label']='EMF reader'
        if item['id']=='THERMOMETER':item['label']='Thermometer (°C / °F)'
        for record in records(item):
            file=PROJECT/record['model']
            if not file.is_file():raise FileNotFoundError(file)
            actual=hashlib.sha256(file.read_bytes()).hexdigest()
            if record.get('sha256') and record['sha256']!=actual:raise ValueError('Stale asset metadata: '+str(file))
            record['sha256']=actual
    used={record['model'] for item in items for record in records(item)}
    provenance_file=ROOT/'REBUILD_PROVENANCE.json'
    retired=json.loads(provenance_file.read_text(encoding='utf-8')).get('retired_models',[]) if provenance_file.exists() else []
    for item in old['items']:
        for record in records(item):
            rel=record['model'];file=PROJECT/rel
            if file.name.startswith('blender_') and rel not in used and file.exists():
                if file.resolve().parent!=RUNTIME.resolve():raise ValueError('Retirement escaped model directory')
                file.unlink();retired.append(rel)
    brief=ROOT/'production-brief.json'
    if brief.exists():
        legacy=json.loads(brief.read_text(encoding='utf-8'))
        for entry in legacy.get('items',[]):
            if not entry.get('atlas'):continue
            atlas=PROJECT/entry['atlas']
            if atlas.resolve().parent!=(ROOT/'textures').resolve():raise ValueError('Atlas outside legacy texture directory')
            if atlas.exists():atlas.unlink()
        brief.unlink()
    defaults={stage['model'] for item in items for stage in item['stages']}
    variants={record['model'] for item in items for stage in item['stages'] for record in stage.get('variants',{}).values()}
    fixed=[item['id'] for item in items if item.get('fixed_fixture')]
    summary=dict(equipment_categories=len(original_ids),additional_health_supply_family=True,
        catalog_families=len(items),fixed_van_fixture_families=len(fixed),tiered_families=len(items)-len(fixed),
        unique_canonical_glbs=len(defaults),unique_state_variant_glbs=len(variants-defaults),unique_referenced_glbs=len(used),
        retired_obsolete_glbs=len(set(retired)),gameplay_changes=False,local_game_builds_created=False,game_tests_run=False)
    catalog=dict(schema_version=2,scope='Runtime assets, editable Blender sources, exact model assignments, and rendered previews. Gameplay integration and packaging remain for online work.',
        coordinates='New GLBs use metres, +Y up, front +Z and floor origin. Original directly reused models retain documented original transforms.',
        fixed_fixture_policy='Van computer, sanity/activity/sound screens, site map, task clipboard and objective board have one physical asset each. All legacy stage slots alias that single fixture; no upgrade models.',
        health_supply_policy='HEALTH_SUPPLIES maps to FieldSupplies.Kind.HEALTH Basic/Improved/Advanced, independently of SANITY_MEDICATION.',
        summary=summary,items=items)
    MANIFEST.write_text(json.dumps(catalog,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    (ROOT/'REBUILD_PROVENANCE.json').write_text(json.dumps(dict(sources=list(sources.values()),retired_models=sorted(set(retired)),original_archive_policy='Purchased source archives are unchanged. Only selected game assets are exported; no source-pack redistribution.',preserved_sound_recorders='See development/assets/recorder-models.json and exploration-provenance.json'),indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
    make_gallery(items,summary)
    index=['# Equipment asset assignments','',
           'The seven fixed van fixture families have one physical model each. Their three compatibility slots are aliases. Health supplies are separate from sanity medication.','',
           '| Family | Model assignments | Additional physical states |','| --- | --- | --- |']
    for item in items:
        models=list(dict.fromkeys(Path(s['model']).name for s in item['stages']))
        state_names=sorted({state for s in item['stages'] for state in s.get('variants',{})})
        index.append('| '+item['id']+(' (fixed)' if item.get('fixed_fixture') else '')+' | '+'; '.join(models)+' | '+(', '.join(state_names) or '—')+' |')
    (ROOT/'ASSET_INDEX.md').write_text('\n'.join(index)+'\n',encoding='utf-8')
    print(json.dumps(summary))

def make_gallery(items,summary):
    font=ImageFont.truetype('C:/Windows/Fonts/consolab.ttf',22)
    small=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',17)
    columns=2;cellw=960;cellh=460
    sheet=Image.new('RGB',(columns*cellw,math.ceil(len(items)/columns)*cellh),(29,35,39));draw=ImageDraw.Draw(sheet)
    cards=[]
    for i,item in enumerate(items):
        key=item['id'].lower();file=ROOT/'previews'/(key+'.png')
        if not file.exists() and key=='sound_recorder':
            family=Image.new('RGB',(1536,640),(65,75,83))
            for tier in (1,2,3):
                im=Image.open(PROJECT/f'development/assets/previews/sound-recorder-t{tier}.png').convert('RGB');im.thumbnail((500,580));family.paste(im,((tier-1)*512+(512-im.width)//2,(640-im.height)//2))
            family.save(file)
        if not file.exists():raise FileNotFoundError(file)
        label=item.get('label') or item['id'].replace('_',' ').title()
        kind='Fixed van fixture' if item.get('fixed_fixture') else 'Basic / Improved / Advanced' if key=='health_supplies' else 'Tier I / II / III — left to right'
        x=(i%columns)*cellw;y=(i//columns)*cellh
        draw.text((x+22,y+14),label,font=font,fill=(233,232,218));draw.text((x+22,y+45),kind,font=small,fill=(165,188,177))
        im=Image.open(file).convert('RGB');im.thumbnail((cellw-30,cellh-90));sheet.paste(im,(x+(cellw-im.width)//2,y+76+(cellh-90-im.height)//2))
        draw.line((x+14,y+cellh-4,x+cellw-14,y+cellh-4),fill=(78,88,93),width=2)
        extra=[]
        for suffix,title in [('_open','Open'),('_burning','Burning'),('_lit','Lit'),('_deployed','Deployed'),('_nodes','Sensor pods'),('_profile','Profile')]:
            p=ROOT/'previews'/(key+suffix+'.png')
            if p.exists():extra.append(f'<a href="previews/{html.escape(p.name)}" target="_blank">{title}</a>')
        cards.append(f'<article data-name="{html.escape((label+" "+item["id"]).lower())}"><h2>{html.escape(label)}</h2><p>{kind}</p><a href="previews/{key}.png" target="_blank"><img loading="lazy" src="previews/{key}.png" alt="{html.escape(label)} rendered physical models"></a><nav>{" · ".join(extra)}</nav></article>')
    sheet.save(ROOT/'equipment-overview.jpg',quality=92,optimize=True)
    sheets=ROOT/'review-sheets';sheets.mkdir(exist_ok=True)
    for page in range(math.ceil(len(items)/6)):
        y=page*3*cellh
        sheet.crop((0,y,columns*cellw,min(sheet.height,y+3*cellh))).save(sheets/f'catalog-{page+1:02}.jpg',quality=92,optimize=True)
    highlight=Image.new('RGB',(1920,1380),(29,35,39));hd=ImageDraw.Draw(highlight)
    picks=[('health_supplies','Health supplies — carried'),('crucifix','Crosses — same 180 x 20 x 280 mm size'),('incense','Incense — seated in the herb bed'),('spirit_box','Spirit boxes — source radios'),('uv_light','UV lights'),('salt_deployed','Deployed salt — material only')]
    for index,(key,label) in enumerate(picks):
        x=(index%2)*960;y=(index//2)*460
        hd.text((x+20,y+15),label,font=font,fill=(233,232,218))
        im=Image.open(ROOT/'previews'/f'{key}.png').convert('RGB');im.thumbnail((936,402));highlight.paste(im,(x+(960-im.width)//2,y+53+(402-im.height)//2))
    highlight.save(ROOT/'revision-highlights.jpg',quality=94,optimize=True)
    document='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Beckenburg — equipment model review</title><style>
    *{box-sizing:border-box}body{margin:0;background:#1c2327;color:#e7e6d7;font:16px system-ui,sans-serif}header{padding:28px 4%;position:sticky;top:0;background:#1c2327ef;border-bottom:1px solid #55615d;z-index:1}h1{font-size:25px;margin:0 0 8px}p{color:#b4c5bb;margin:5px 0 12px}input{width:min(600px,100%);padding:12px;border:1px solid #77877d;background:#283237;color:#fff;border-radius:5px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(580px,100%),1fr));gap:22px;padding:26px 4%}article{border:1px solid #485851;border-radius:6px;overflow:hidden;background:#273238}h2{margin:17px 20px 3px;font-size:20px}article p,nav{margin:8px 20px 14px}img{width:100%;display:block}a{color:#c4d8bf}article[hidden]{display:none}
    </style><header><h1>Beckenburg equipment — rendered model review</h1><p>Actual equipment meshes. Select an image for full size. Van fixtures have one fixed model; field equipment tiers run left to right.</p><input id="search" type="search" placeholder="Find equipment…" aria-label="Find equipment"></header><main>'''+''.join(cards)+'''</main><script>document.getElementById('search').addEventListener('input',e=>{const q=e.target.value.toLowerCase();document.querySelectorAll('article').forEach(c=>c.hidden=!c.dataset.name.includes(q))})</script></html>'''
    (ROOT/'REVIEW.html').write_text(document,encoding='utf-8')

if __name__=='__main__':main()
