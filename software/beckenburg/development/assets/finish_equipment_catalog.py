"""Write the asset handoff index and compact production reference sheets."""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

PROJECT=Path(__file__).resolve().parents[2]
ROOT=Path(__file__).resolve().parent/'equipment-catalog'
catalog=json.loads((ROOT/'equipment-assets.json').read_text())
font=ImageFont.truetype('C:/Windows/Fonts/consolab.ttf',17)
small=ImageFont.truetype('C:/Windows/Fonts/consola.ttf',12)
stages=[stage for item in catalog['items'] for stage in item['stages']]
variants=[variant for stage in stages for variant in stage['variants'].values()]
new_default=[s for s in stages if not s['existing_unchanged']]
new_variants=[s for s in variants if not s['existing_unchanged']]
catalog['summary']=dict(equipment_categories=len(catalog['items']),tier_stages=len(stages),
    new_canonical_glbs=len(new_default),new_state_glbs=len(new_variants),new_glbs=len(new_default)+len(new_variants),
    reused_stage_mappings=sum(s['existing_unchanged'] for s in stages),
    new_editable_blender_scenes=len(list((ROOT/'blender').glob('*.blend'))),
    new_texture_atlases=len(list((ROOT/'textures').glob('*.png'))),gameplay_changes=False,
    local_game_builds_created=False,game_tests_run=False)
(ROOT/'equipment-assets.json').write_text(json.dumps(catalog,indent=2)+'\n')

sheet=Image.new('RGB',(3*512,14*240),(31,39,44));draw=ImageDraw.Draw(sheet)
rows=['| Equipment | Tier I | Tier II | Tier III | Extra forms |','| --- | --- | --- | --- | --- |']
for index,item in enumerate(catalog['items']):
    x=(index%3)*512;y=(index//3)*240
    file=ROOT/'previews'/(item['id'].lower()+'.png')
    if file.exists():
        image=Image.open(file).convert('RGB');image.thumbnail((500,205))
        sheet.paste(image,(x+(512-image.width)//2,y+31))
        # The source drawings are intentionally limited-color PSX references.
        source=Image.open(file).convert('RGB').quantize(colors=128,dither=Image.Dither.NONE)
        source.save(file,optimize=True)
    else:
        # Recorder tiers were already authored in the preceding asset slice.
        for t in range(3):
            recorder=Image.open(PROJECT/f'development/assets/previews/sound-recorder-t{t+1}.png').convert('RGB')
            recorder.thumbnail((158,190));sheet.paste(recorder,(x+t*170+6,y+35))
    draw.text((x+12,y+7),item['id'].replace('_',' '),font=font,fill=(212,225,217))
    draw.line((x+8,y+237,x+504,y+237),fill=(66,81,87),width=1)
    for t in range(3):draw.text((x+70+t*169,y+220),f'TIER {t+1}',font=small,fill=(159,186,176))
    paths=[Path(s['model']).name for s in item['stages']]
    states=', '.join(sorted({state for s in item['stages'] for state in s['variants']})) or '—'
    rows.append('| '+item['id']+' | '+' | '.join(paths)+' | '+states+' |')
sheet.save(ROOT/'equipment-overview.jpg',quality=88,optimize=True,progressive=True)
(ROOT/'ASSET_INDEX.md').write_text('# Equipment asset index\n\n'+
    'Asset files only. All 42 categories and 126 tier mappings are listed below. '+
    'Gameplay and Java packaging are left for online integration.\n\n'+
    '\n'.join(rows)+'\n')
print(json.dumps(catalog['summary']))
