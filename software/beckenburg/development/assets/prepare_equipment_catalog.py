"""Prepare compact equipment atlases and the production brief from repository sources."""
import hashlib, io, json, re, struct
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

PROJECT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent/'equipment-catalog'
MODELS=PROJECT/'assets/runtime/models'
PALETTE=['#252c30','#495253','#aab4ac','#131c20','#79bba5','#a34438','#c6ae70','#ded4b5',
         '#5c4d39','#76583e','#668896','#5f477f','#ddd9cc','#34393b','#c9c0a0','#90c2d1']
SOURCES={
 'EMF_READER':'exploration_emf_detector','THERMOMETER':'exploration_thermometer',
 'SPIRIT_BOX':'exploration_spirit_box','FLASHLIGHT':'exploration_flashlight',
 'UV_LIGHT':'exploration_flashlight_poquet','PHOTO_CAMERA':'exploration_photo_camera',
 'VIDEO_CAMERA':'exploration_thermal_camera','DOTS_PROJECTOR':'vape_mp_1',
 'HEAD_GEAR':'exploration_thermal_camera','MOTION_SENSOR':'exploration_emf_detector',
 'PARABOLIC_MICROPHONE':'exploration_voice_recorder','SOUND_SENSOR':'exploration_voice_recorder',
 'COMPUTER':'exploration_thermal_camera','SANITY_MONITOR':'exploration_thermal_camera',
 'SITE_ACTIVITY_MONITOR':'exploration_thermal_camera','SOUND_MONITOR':'exploration_voice_recorder',
 'ANCHOR_TRIANGULATOR':'exploration_emf_detector','BAROMETRIC_PROBE':'exploration_emf_detector',
 'SEISMIC_RECORDER':'exploration_voice_recorder','LASER_GRID':'exploration_thermal_camera',
 'EMF_ARRAY':'exploration_emf_detector','THERMAL_BEACON':'exploration_thermometer',
 'RITUAL_ANCHOR_METER':'exploration_emf_detector','WARD_STABILITY_PROBE':'exploration_emf_detector',
 'OBJECT_IMPRINT_SCANNER':'exploration_thermal_camera',
 'SPECTRAL_FREQUENCY_ANALYZER':'exploration_voice_recorder','RESONANCE_TUNER':'exploration_voice_recorder',
 'CLIPBOARDS':'exploration_thermal_camera','SITE_MAP':'exploration_thermal_camera'
}
REUSE={
 ('EMF_READER',1):'exploration_emf_detector',('SPIRIT_BOX',1):'exploration_spirit_box',
 ('THERMOMETER',1):'exploration_thermometer',('FLASHLIGHT',1):'exploration_flashlight_poquet',
 ('FLASHLIGHT',2):'exploration_flashlight',('PHOTO_CAMERA',1):'exploration_photo_camera',
 ('GHOST_WRITING_BOOK',1):'book_mp_1',('CRUCIFIX',1):'cross_mp_2',('COMPUTER',1):'pc_mp_1',
 ('SANITY_MONITOR',1):'monitoring_screen_mp_1',('SITE_ACTIVITY_MONITOR',1):'monitoring_screen_mp_1',
 **{('SOUND_RECORDER',t):f'blender_sound_recorder_{t}' for t in (1,2,3)}
}
TAGS={'DOTS_PROJECTOR':'D.O.T.S.','GHOST_WRITING_BOOK':'JOURNAL','PARABOLIC_MICROPHONE':'PARA MIC',
 'SANITY_MEDICATION':'CALM','SPECTRAL_FREQUENCY_ANALYZER':'SPECTRUM','OBJECT_IMPRINT_SCANNER':'IMPRINT',
 'RITUAL_ANCHOR_METER':'ANCHOR','WARD_STABILITY_PROBE':'WARD','BAROMETRIC_PROBE':'PRESSURE',
 'ANCHOR_TRIANGULATOR':'BEARING','THERMAL_BEACON':'TEMP POD','ECTOPLASM_SAMPLER':'ASSAY',
 'SEISMIC_RECORDER':'SEISMIC','SITE_ACTIVITY_MONITOR':'ACTIVITY','SANITY_MONITOR':'SANITY',
 'SOUND_MONITOR':'AUDIO','THERMOMETER':'TEMP','EMF_READER':'EMF','CLIPBOARDS':'TASKS'}

def source_image(path):
    data=path.read_bytes();size=struct.unpack_from('<I',data,12)[0]
    root=json.loads(data[20:20+size]);image=root['images'][0]
    view=root['bufferViews'][image['bufferView']]
    start=28+size+view.get('byteOffset',0)
    return Image.open(io.BytesIO(data[start:start+view['byteLength']])).convert('RGBA')

def atlas(item,source):
    image=Image.new('RGBA',(256,256),(28,34,37,255))
    if source:image.paste(source_image(MODELS/(source+'.glb')).resize((128,128),Image.Resampling.NEAREST),(0,0))
    draw=ImageDraw.Draw(image)
    for i,color in enumerate(PALETTE):
        x=128+(i%4)*32;y=(i//4)*32
        draw.rectangle((x,y,x+31,y+31),fill=color)
        for k in range(3):draw.line((x+2,y+4+k*9,x+28,y+4+k*9),fill=color)
    font_path=Path('C:/Windows/Fonts/consolab.ttf')
    font=ImageFont.truetype(str(font_path),10) if font_path.exists() else ImageFont.load_default()
    texts=[TAGS.get(item,item.replace('_',' ')[:9]),'--','OFF','I','II','III',
           'hPa' if item=='BAROMETRIC_PROBE' else 'TEMP' if 'THERM' in item else 'Hz' if ('RESONANCE' in item or 'FREQUENCY' in item) else 'LEVEL',
           'REC','CALM','PAGE','IN','OUT','MAP','TASKS','+','USB']
    for i,text in enumerate(texts):
        x=(i%4)*64;y=128+(i//4)*32
        draw.rectangle((x,y,x+63,y+31),fill='#111e20')
        box=draw.textbbox((0,0),text,font=font)
        draw.text((x+(64-(box[2]-box[0]))/2,y+(32-(box[3]-box[1]))/2-box[1]),text,font=font,fill='#b0d6bc')
    file=OUT/'textures'/f'{item.lower()}.png';image.save(file)
    return file.relative_to(PROJECT).as_posix()

def main():
    (OUT/'textures').mkdir(parents=True,exist_ok=True)
    registry=(PROJECT/'src/main/java/org/beckenburg/EquipmentRegistry.java').read_text()
    entries=re.findall(r'entry\("([A-Z_]+)","([^"]+)"',registry)
    brief=[]
    for item,label in entries:
        if item=='SOUND_RECORDER':
            brief.append(dict(id=item,label=label,source=None,atlas=None,stages=[dict(tier=t,reuse=REUSE[(item,t)]) for t in (1,2,3)]));continue
        source=SOURCES.get(item)
        brief.append(dict(id=item,label=label,source=source,
            source_sha256=hashlib.sha256((MODELS/(source+'.glb')).read_bytes()).hexdigest() if source else None,
            atlas=atlas(item,source),stages=[dict(tier=t,reuse=REUSE.get((item,t))) for t in (1,2,3)]))
    (OUT/'production-brief.json').write_text(json.dumps(dict(items=brief,palette=PALETTE),indent=2)+'\n')
    print(f'Prepared {len(brief)} equipment families; {sum(s["reuse"] is None for b in brief for s in b["stages"])} missing canonical models')

if __name__=='__main__':main()
