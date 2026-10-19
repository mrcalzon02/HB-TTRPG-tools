"""Render the delivered GLBs themselves, including separate deployment states.

This is an asset review capture. No game build or gameplay execution occurs.
"""
import sys,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import rebuild_support as S

FRAGMENTS=['rebuild-fixtures.json','rebuild-medical.json','rebuild-electronics.json','rebuild-specialists.json']

def main():
    items={i['id']:i for f in FRAGMENTS for i in json.loads((S.DEV/f).read_text(encoding='utf-8'))['items']}
    selected=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else list(items)
    for key in selected:
        item=items[key];S.reset();objects=[];loaded={}
        for stage in item['stages']:
            if stage['model'] in loaded:continue
            rotation=stage.get('preview_rotation_blender')
            size=.145 if key=='PHOTO_CAMERA' and stage.get('existing_unchanged') else None
            obj=S.import_source(Path(stage['model']).stem,size=size,rotation=rotation);objects.append(obj);loaded[stage['model']]=obj
        angle=(0,-2.5,1.20) if key in ('CRUCIFIX','INCENSE','SPIRIT_BOX','VIDEO_CAMERA','RESONANCE_TUNER') else (0,-2.5,1.80)
        S.render_family(key,objects,view=angle)
        if key in ('CRUCIFIX','INCENSE','HEALTH_SUPPLIES','PHOTO_CAMERA','VIDEO_CAMERA','RESONANCE_TUNER','UV_LIGHT','PARABOLIC_MICROPHONE'):
            S.render_family(key,objects,path=S.DEV/'previews'/f'{key.lower()}_profile.png',view=(2,-1.5,1.15))
        for state in sorted({state for stage in item['stages'] for state in stage.get('variants',{})}):
            S.reset();objects=[];seen=set()
            for stage in item['stages']:
                rec=stage.get('variants',{}).get(state)
                if not rec or rec['model'] in seen:continue
                seen.add(rec['model']);objects.append(S.import_source(Path(rec['model']).stem))
            placement_view=(2.0,-1.6,1.8) if key=='SALT' and state=='deployed' else (0,-2.5,1.7)
            S.render_family(key,objects,path=S.DEV/'previews'/f'{key.lower()}_{state}.png',view=placement_view)
        print('DELIVERED GLB CAPTURE '+key,flush=True)

if __name__=='__main__':main()
