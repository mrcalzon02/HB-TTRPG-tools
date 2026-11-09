#!/usr/bin/env python3
"""Read-only, standard-library PNG, alpha, and 1x1 Factorio prototype check.

Validates the V7->V8 packed render without invoking Blender or Ollama.
"""
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct
import zlib

FRAME = 128
TILE = 32
DIRS = ('north','east','south','west')


def checksum(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def decode_rgba(path):
    src=Path(path).read_bytes()
    assert src[:8]==b'\x89PNG\r\n\x1a\n', f'Not PNG: {path}'
    pos=8;pack=b''; width=height=None;have_end=False
    while pos+12<=len(src):
        length=struct.unpack('>I',src[pos:pos+4])[0]
        name=src[pos+4:pos+8]
        assert length<=100_000_000,'oversized PNG chunk'
        data=src[pos+8:pos+8+length]
        assert len(data)==length
        crc=struct.unpack('>I',src[pos+8+length:pos+12+length])[0]
        assert zlib.crc32(name+data)&0xFFFFFFFF ==crc,(path,name,'bad CRC')
        pos+=12+length
        if name==b'IHDR':
            width,height,depth,ct,comp,fil,interlace=struct.unpack('>IIBBBBB',data)
            assert (depth,ct,comp,fil,interlace)==(8,6,0,0,0),(path,'unsupported PNG variant')
            assert 1<=width<=8192 and 1<=height<=8192
        elif name==b'IDAT':pack+=data
        elif name==b'IEND':have_end=True;break
    assert have_end and width and height
    decomp=zlib.decompress(pack)
    row_size=width*4
    assert len(decomp)==(row_size+1)*height,(path,'scanline length')
    rows=[];prev=bytearray(row_size)
    index=0
    for y in range(height):
        filt=decomp[index];index+=1
        raw=bytearray(decomp[index:index+row_size]);index+=row_size
        assert filt in (0,1,2,3,4)
        for x in range(row_size):
            a=raw[x-4] if x>=4 else 0
            b=prev[x]
            c=prev[x-4] if x>=4 else 0
            if filt==1:raw[x]=(raw[x]+a)&255
            elif filt==2:raw[x]=(raw[x]+b)&255
            elif filt==3:raw[x]=(raw[x]+((a+b)//2))&255
            elif filt==4:
                p=a+b-c;pa=abs(p-a);pb=abs(p-b);pc=abs(p-c)
                raw[x]=(raw[x]+(a if pa<=pb and pa<=pc else b if pb<=pc else c))&255
        rows.append(raw);prev=raw
    return width,height,rows


def alpha_bbox(rows,x0=0,y0=0,w=FRAME,h=FRAME,threshold=20):
    min_x=w;min_y=h;max_x=-1;max_y=-1
    for y in range(y0,y0+h):
        row=rows[y]
        for x in range(x0,x0+w):
            if row[x*4+3]>threshold:
                lx=x-x0;ly=y-y0
                min_x=min(min_x,lx);min_y=min(min_y,ly);max_x=max(max_x,lx);max_y=max(max_y,ly)
    return None if max_x==-1 else [min_x,min_y,max_x+1,max_y+1]


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--assets',required=True,type=Path)
    parser.add_argument('--lua',required=True,type=Path)
    parser.add_argument('--info',required=True,type=Path)
    parser.add_argument('--out',required=True,type=Path)
    a=parser.parse_args()
    man=json.loads((a.assets/'manifest.json').read_text())
    info=json.loads(a.info.read_text())
    assert info['name']=='tanks_for_bob_fork' and info['factorio_version']=='2.1'
    assert man['scale']==0.33 and man['shift']==[0,-0.07]
    assert man['frame_count']==96 and man['line_length']==12 and man['directions']==list(DIRS)
    lua=a.lua.read_text()
    for required in ('data.raw["assembling-machine"]', 'bench.selection_box = {{-0.5, -0.5}, {0.5, 0.5}}',
                     'scale = 0.33','shift = {0, -0.07}', 'animation = four_way(false)',
                     'idle_animation = four_way(true)'):
        assert required in lua, ('missing override',required)
    assert not re.search(r'bench\.(?:fluid_boxes|collision_box|crafting_speed|crafting_categories|energy_source)\s*=',lua), 'Gameplay properties modified'
    result={'passed':True,'status':'art_asset_validation_only',
            'native_game_visual_approval':False,'factorio_version':'2.1',
            'footprint_tiles':[1,1],'scale':0.33,'shift':[0,-0.07],
            'directions':{},'total_verified_cells':0}
    for d in DIRS:
        spec=man['per_direction'][d]
        idle_path=a.assets/f'idle-{d}.png'
        work_path=a.assets/f'working-{d}.png'
        assert checksum(idle_path)==spec['idle_png_sha256']
        assert checksum(work_path)==spec['working_atlas_sha256']
        w,h,idle=decode_rgba(idle_path)
        assert (w,h)==(FRAME,FRAME)
        iw,ih,working=decode_rgba(work_path)
        assert (iw,ih)==(12*FRAME,8*FRAME)
        rest=alpha_bbox(idle)
        assert rest==spec['rest_alpha_bbox'],(d,'rest bbox differs',rest)
        rest_w=(rest[2]-rest[0])*0.33
        rest_h=(rest[3]-rest[1])*0.33
        assert rest_w<=TILE and rest_h<=TILE,(d,'exceeds one tile',rest_w,rest_h)
        # Readback all 96 transparent atlas cells; first cell must be the idle source
        # and the hammer's six strike frames must be physically nonempty.
        for index in range(96):
            x=(index%12)*128;y=(index//12)*128
            bbox=alpha_bbox(working,x,y)
            assert bbox is not None,(d,index,'empty animation frame')
            if index==0:
                for row in range(128):
                    assert working[row][0:512]==idle[row],(d,'idle working pose mismatch',row)
            result['total_verified_cells']+=1
        result['directions'][d]={
            'idle_bbox':rest,'idle_width_tiles':round(rest_w/32,4),
            'idle_height_tiles':round(rest_h/32,4),
            'atlas_sha256':checksum(work_path),'idle_sha256':checksum(idle_path),'frames_verified':96
        }
    a.out.parent.mkdir(parents=True,exist_ok=True)
    a.out.write_text(json.dumps(result,indent=2)+'\n')
    print('WORKBENCH_ONE_TILE_VERIFIED: 4 directions, 384 frames; idle body <=1 tile; source hashes match',flush=True)

if __name__=='__main__':main()
