"""Curate unchanged owner-library source props and record their native origins/bounds."""
import argparse,pathlib,hashlib,json,shutil,struct
ROOT=pathlib.Path(__file__).resolve().parents[2]
NAMES='coffee_table_1 display_cabinet_mp_1 display_cabinet_mp_2_1 shelf_mp_4 table_large_2 cardboard_box_1 cardboard_box_2 wooden_crate_2 metal_barrel_mp_1 book_mp_3 book_mp_4 book_mp_5 notebook_1 pencil_mp_1 photo_frame_mp_2 clock_2 tv_remote_mp_1 planter_pot_mp_1_full potted_cactus_mp_1 toy_brick_1 toy_brick_1_1 toy_brick_1_2 vhs_tape_1 tin_can_mp_1_rusty jerrycan_1 canned_food_mp_1 canned_food_mp_2'.split()
ap=argparse.ArgumentParser();ap.add_argument('--archive',type=pathlib.Path,required=True);args=ap.parse_args()
index={p.stem:p for p in args.archive.rglob('*.glb')};out=ROOT/'assets/runtime/models';records=[]
for name in NAMES:
    source=index[name];target=out/(name+'.glb');shutil.copyfile(source,target)
    data=target.read_bytes();length=struct.unpack_from('<I',data,12)[0];gltf=json.loads(data[20:20+length])
    positions=[gltf['accessors'][p['attributes']['POSITION']] for m in gltf.get('meshes',[]) for p in m['primitives']]
    records.append(dict(id=name,source=str(source),sha256=hashlib.sha256(data).hexdigest(),bytes=len(data),
        local_position_bounds=[dict(min=p.get('min'),max=p.get('max')) for p in positions],
        modification='none; original GLB hierarchy, images and UVs preserved'))
(ROOT/'development/levels/clutter-sources.json').write_text(json.dumps(records,indent=2)+'\n')
print('Imported',len(records),'unchanged source props')
