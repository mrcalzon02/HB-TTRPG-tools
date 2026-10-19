#!/usr/bin/env python3
"""Inventory the owner's private Models.zip: metadata only, no bulk extraction.

Reads zip directory and bounded glTF descriptors, never uploads original meshes.
"""
import argparse
from collections import Counter
import hashlib
import json
import math
from pathlib import Path, PurePosixPath
import re
import stat
import struct
import zipfile

SOURCE_ID="1WNdSqT0wtxvYy6HZ2OCU3vWHUt-uFZw8"
MODELS={".glb",".gltf",".obj",".fbx",".blend",".dae",".stl",".3ds",".usd",".usdz",".ply"}
TEXTURES={".png",".jpg",".jpeg",".tga",".dds",".webp",".tif",".bmp",".exr"}
HINTS={
 "breakwater-battery":("boat","landing","ship","bunker","soldier","naval","marine","tree","fort","turret"),
 "between-deliveries-red-ledger":("door","table","bar","room","house","chair","shelf","bed","lamp"),
 "omega-front":("tank","soldier","road","terrain","rifle","factory","tree","vehicle"),
 "beckenburg":("ghost","hunter","spirit","camera","book","van","emf","flashlight","evidence"),
 "gumball-armada":("fighter","spaceship","space","planet","rocket","station"),
 "ministry-lantern-desk":("aircraft","plane","airfield","farm","hangar","rail"),
}
MAX_RECORDS=100000
MAX_TOTAL=40*1024**3
MAX_JSON=16*1024**2

def safe(info):
    name=info.filename
    mode=(info.external_attr>>16)&0xffff
    if not name or name.startswith("/") or "\\" in name or ":" in name or "\x00" in name:
        return False
    if stat.S_IFMT(mode)==stat.S_IFLNK or info.flag_bits&1:
        return False
    return all(part not in (".","..","") for part in PurePosixPath(name).parts)

def matches(name):
    words=set(re.findall(r"[a-z0-9]+",name.casefold()))
    return [game for game,keywords in HINTS.items() if words.intersection(keywords)]

def gltf_details(blob):
    if blob[:4]==b"glTF":
        if len(blob)<20 or struct.unpack_from("<I",blob,4)[0]!=2:
            raise ValueError("unsupported GLB version")
        total=struct.unpack_from("<I",blob,8)[0]
        length,kind=struct.unpack_from("<II",blob,12)
        if kind!=0x4e4f534a or length>MAX_JSON or total<20+length or len(blob)<20+length:
            raise ValueError("invalid or truncated GLB JSON chunk")
        blob=blob[20:20+length]
    doc=json.loads(blob.decode("utf-8").strip("\x00 \t\r\n"))
    accessors=doc.get("accessors",[])
    primitives=[p for m in doc.get("meshes",[]) for p in m.get("primitives",[])]
    triangles=0
    bounds=[]
    for p in primitives:
        position=p.get("attributes",{}).get("POSITION")
        if isinstance(position,int) and 0<=position<len(accessors):
            accessor=accessors[position]
            lo,hi=accessor.get("min"),accessor.get("max")
            if isinstance(lo,list) and isinstance(hi,list) and len(lo)==len(hi)==3:
                if all(isinstance(v,(int,float)) and math.isfinite(v) for v in lo+hi):
                    bounds.append((lo,hi))
        index=p.get("indices")
        target=index if isinstance(index,int) else position
        if p.get("mode",4)==4 and isinstance(target,int) and 0<=target<len(accessors):
            triangles+=accessors[target].get("count",0)//3
    span=None
    if bounds:
        lo=[min(b[0][i] for b in bounds) for i in range(3)]
        hi=[max(b[1][i] for b in bounds) for i in range(3)]
        span={"min":lo,"max":hi,"size":[round(hi[i]-lo[i],6) for i in range(3)]}
    skins=doc.get("skins",[])
    return {"primitives":len(primitives),"meshes":len(doc.get("meshes",[])),
            "triangles_estimate":triangles,"materials":len(doc.get("materials",[])),
            "images":len(doc.get("images",[])),"nodes":len(doc.get("nodes",[])),
            "skins":len(skins),"joint_count":sum(len(s.get("joints",[])) for s in skins),
            "animations":len(doc.get("animations",[])),"raw_accessor_bounds":span,
            "rig_status":"skinned" if skins else "no skin declared",
            "scale_status":"raw mesh bounds only; normalize and verify scene node transforms"}

def inspect(path):
    path=Path(path)
    records=[];expanded=0;seen=set()
    with zipfile.ZipFile(path,"r",allowZip64=True) as archive:
        infos=archive.infolist()
        if not infos or len(infos)>MAX_RECORDS:
            raise ValueError("empty or excessively large ZIP directory")
        for member in infos:
            if not safe(member):
                raise ValueError("unsafe, encrypted or symbolic-link archive member: "+member.filename)
            folded=member.filename.casefold()
            if folded in seen:
                raise ValueError("case-colliding archive path: "+member.filename)
            seen.add(folded)
            if member.is_dir():
                continue
            expanded+=member.file_size
            if expanded>MAX_TOTAL:
                raise ValueError("expanded ZIP exceeds 40 GiB safety bound")
            ext=PurePosixPath(member.filename).suffix.lower()
            kind="model" if ext in MODELS else "texture" if ext in TEXTURES else "other"
            row={"path":member.filename,"kind":kind,"extension":ext,
                 "bytes":member.file_size,"compressed_bytes":member.compress_size,
                 "crc32":f"{member.CRC:08x}","candidate_games":matches(member.filename)}
            if kind=="model":
                row["status"]="needs selected-game conversion and real in-engine acceptance"
                row["review"]=["units/origin/orientation","materials/texture budget",
                               "mesh LOD and bounds","skeletal rig and animation requirements",
                               "collision/grips/sockets for selected gameplay"]
                if ext in (".gltf",".glb"):
                    try:
                        with archive.open(member) as stream:
                            if ext==".gltf":
                                if member.file_size>MAX_JSON:
                                    raise ValueError("oversized glTF JSON descriptor")
                                descriptor=stream.read(MAX_JSON+1)
                            else:
                                header=stream.read(20)
                                if len(header)!=20:
                                    raise ValueError("truncated GLB header")
                                length=struct.unpack_from("<I",header,12)[0]
                                if length>MAX_JSON:
                                    raise ValueError("oversized GLB JSON descriptor")
                                descriptor=header+stream.read(length)
                        row["geometry"]=gltf_details(descriptor)
                    except (ValueError,TypeError,UnicodeError,KeyError,json.JSONDecodeError,struct.error) as ex:
                        row["inspection_error"]=str(ex)[:200]
            records.append(row)
    digest=hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda:stream.read(8*1024*1024),b""):
            digest.update(block)
    counts=Counter(r["kind"] for r in records)
    return {"schema":1,"source":{"drive_id":SOURCE_ID,
            "name":"Models.zip","url":"https://drive.google.com/file/d/"+SOURCE_ID+"/view",
            "rights":"owner-attested hand-authored assets",
            "source_private":True,"bytes":path.stat().st_size,"sha256":digest.hexdigest()},
            "summary":{"file_count":len(records),"model_count":counts["model"],
                       "texture_count":counts["texture"],"expanded_bytes":expanded,
                       "model_formats":dict(Counter(r["extension"] for r in records
                                                    if r["kind"]=="model"))},
            "files":records,"release_gate":"Inventory only; no asset has been converted, rigged, released or rendered by running this indexer."}

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive",type=Path)
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    result=inspect(args.archive)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
    print(json.dumps({"output":str(args.output),**result["summary"],
                      "source_sha256":result["source"]["sha256"]}))

if __name__=="__main__":
    main()
