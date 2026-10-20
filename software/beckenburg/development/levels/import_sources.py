"""Copy the owner's original environment meshes without changing pivots, UVs or pixels.
Run with Python; --archive points at the original GLB (recommended) directory.
"""
import argparse, hashlib, json, pathlib, shutil, struct

ROOT=pathlib.Path(__file__).resolve().parents[2]
NAMES='bed_4 bed_5 bed_1 bed_2 bedside_table_1 toilet_mp_1 carpet_mp_1 photo_frame_mp_1 painting_1 clock_1 wooden_crate_1 pipe_1 book_mp_2 plate_mp_1 lamp_1_on lamp_1_off lamp_2_on lamp_2_off lamp_5_on lamp_5_off ceiling_lamp_2_on ceiling_lamp_2_off ceiling_lamp_mp_1_on ceiling_lamp_mp_1_off'.split()

def chunks(path):
    data=path.read_bytes(); n=struct.unpack_from('<I',data,12)[0]
    return json.loads(data[20:20+n]),data[28+n:]

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--archive',type=pathlib.Path,required=True);args=ap.parse_args()
    out=ROOT/'assets/runtime/models';out.mkdir(parents=True,exist_ok=True)
    indexed={p.stem:p for p in args.archive.rglob('*.glb')}
    result=[]
    for name in NAMES:
        source=indexed[name]; target=out/(name+'.glb');shutil.copyfile(source,target)
        result.append(dict(id=name,source=str(source),bytes=target.stat().st_size,sha256=hashlib.sha256(target.read_bytes()).hexdigest(),modification='none; native hierarchy/pivot/UVs retained'))
    tex=ROOT/'assets/runtime/level-textures';tex.mkdir(parents=True,exist_ok=True)
    # Preserve every source image; the material mapping is explicit in source-textures.json.
    materials={}
    for name in ['wall_1','floor_ceiling_1','floor_ceiling_2','floor_ceiling_3','wall_1_plain','carpet_mp_1','wooden_crate_1']:
        glb,blob=chunks(indexed[name]);entries=[]
        for i,im in enumerate(glb.get('images',[])):
            view=glb['bufferViews'][im['bufferView']];raw=blob[view.get('byteOffset',0):view.get('byteOffset',0)+view['byteLength']]
            filename=f'{name}_{i}.png';(tex/filename).write_bytes(raw)
            entries.append(dict(file=filename,name=im.get('name',''),sha256=hashlib.sha256(raw).hexdigest()))
        materials[name]=dict(images=entries,materials=glb.get('materials',[]))
    (ROOT/'development/levels/source-meshes.json').write_text(json.dumps(result,indent=2)+'\n')
    (ROOT/'development/levels/source-textures.json').write_text(json.dumps(materials,indent=2)+'\n')
    print(f'Imported {len(result)} unchanged source meshes and {sum(len(m["images"]) for m in materials.values())} original texture images')
if __name__=='__main__':main()
