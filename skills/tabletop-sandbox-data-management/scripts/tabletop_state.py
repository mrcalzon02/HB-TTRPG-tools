#!/usr/bin/env python3
"""System-neutral CSV campaign-state helper for HB-TTRPG-tools Agent Skills."""
from __future__ import annotations

import argparse
import csv
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

SCHEMAS = {
    "characters.csv": ["character_id","name","kind","system","player","source_file","status","notes","updated_at"],
    "character_stats.csv": ["character_id","scope","key","value","value_type","max_value","unit","notes","updated_at"],
    "roster.csv": ["roster_id","entity_id","group_id","role","status","location","notes","updated_at"],
    "encounters.csv": ["encounter_id","name","round","turn_index","active","status","scene","updated_at"],
    "encounter_participants.csv": ["encounter_id","participant_id","initiative","order_key","hp_current","hp_max","conditions","resources","active","notes","updated_at"],
    "inventory.csv": ["owner_id","item_id","name","quantity","state","unit","location","notes","updated_at"],
    "campaign_ledger.csv": ["timestamp","entity_id","event_type","key","old_value","new_value","source","notes"],
}

def now(): return datetime.now(timezone.utc).isoformat()

def ensure_dir(root: Path):
    root.mkdir(parents=True, exist_ok=True)
    for filename, fields in SCHEMAS.items():
        path=root/filename
        if not path.exists():
            with path.open('w', newline='', encoding='utf-8') as f:
                csv.DictWriter(f, fieldnames=fields).writeheader()

def read_rows(path: Path):
    if not path.exists(): return []
    with path.open(newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))

def atomic_write(path: Path, fields, rows):
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=path.name+'.', dir=str(path.parent), text=True)
    try:
        with os.fdopen(fd, 'w', newline='', encoding='utf-8') as f:
            w=csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
            w.writeheader(); w.writerows(rows)
        os.replace(tmp, path)
    finally:
        if os.path.exists(tmp): os.unlink(tmp)

def upsert(root: Path, filename: str, match: dict, values: dict):
    ensure_dir(root)
    fields=SCHEMAS[filename]
    path=root/filename; rows=read_rows(path); found=False; old=None
    for row in rows:
        if all(row.get(k)==str(v) for k,v in match.items()):
            old=dict(row); row.update({k:str(v) for k,v in values.items() if k in fields}); found=True; break
    if not found:
        row={k:'' for k in fields}; row.update({k:str(v) for k,v in {**match,**values}.items() if k in fields}); rows.append(row)
    atomic_write(path, fields, rows)
    return old, row

def ledger(root: Path, entity_id, event_type, key='', old_value='', new_value='', source='assistant', notes=''):
    ensure_dir(root); path=root/'campaign_ledger.csv'; fields=SCHEMAS['campaign_ledger.csv']; rows=read_rows(path)
    rows.append({"timestamp":now(),"entity_id":entity_id,"event_type":event_type,"key":key,"old_value":old_value,"new_value":new_value,"source":source,"notes":notes})
    atomic_write(path, fields, rows)

def upsert_character(root: Path, character_id: str, **values):
    values['updated_at']=now(); old,row=upsert(root,'characters.csv',{'character_id':character_id},values)
    ledger(root, character_id, 'character_upsert', old_value=json.dumps(old or {}, sort_keys=True), new_value=json.dumps(row, sort_keys=True))
    return row

def set_stat(root: Path, character_id: str, key: str, value, scope='core', value_type='text', max_value='', unit='', notes='', source='assistant'):
    vals={"value":value,"value_type":value_type,"max_value":max_value,"unit":unit,"notes":notes,"updated_at":now()}
    old,row=upsert(root,'character_stats.csv',{'character_id':character_id,'scope':scope,'key':key},vals)
    ledger(root, character_id, 'stat_set', key=f'{scope}.{key}', old_value=(old or {}).get('value',''), new_value=value, source=source, notes=notes)
    return row

def get_character(root: Path, character_id: str):
    ensure_dir(root)
    character=next((r for r in read_rows(root/'characters.csv') if r.get('character_id')==character_id), None)
    stats=[r for r in read_rows(root/'character_stats.csv') if r.get('character_id')==character_id]
    inventory=[r for r in read_rows(root/'inventory.csv') if r.get('owner_id')==character_id]
    return {"character": character, "stats": stats, "inventory": inventory}

def main():
    p=argparse.ArgumentParser(); p.add_argument('--root', default='/mnt/data/ttrpg_state')
    sub=p.add_subparsers(dest='cmd', required=True)
    sub.add_parser('init')
    c=sub.add_parser('upsert-character'); c.add_argument('character_id'); c.add_argument('--name',default=''); c.add_argument('--kind',default='character'); c.add_argument('--system',default=''); c.add_argument('--player',default=''); c.add_argument('--source-file',default=''); c.add_argument('--status',default='active'); c.add_argument('--notes',default='')
    s=sub.add_parser('set-stat'); s.add_argument('character_id'); s.add_argument('key'); s.add_argument('value'); s.add_argument('--scope',default='core'); s.add_argument('--value-type',default='text'); s.add_argument('--max-value',default=''); s.add_argument('--unit',default=''); s.add_argument('--notes',default=''); s.add_argument('--source',default='assistant')
    g=sub.add_parser('get-character'); g.add_argument('character_id')
    args=p.parse_args(); root=Path(args.root)
    if args.cmd=='init': ensure_dir(root); out={"root":str(root),"tables":list(SCHEMAS)}
    elif args.cmd=='upsert-character': out=upsert_character(root,args.character_id,name=args.name,kind=args.kind,system=args.system,player=args.player,source_file=args.source_file,status=args.status,notes=args.notes)
    elif args.cmd=='set-stat': out=set_stat(root,args.character_id,args.key,args.value,args.scope,args.value_type,args.max_value,args.unit,args.notes,args.source)
    else: out=get_character(root,args.character_id)
    print(json.dumps(out, indent=2))
if __name__=='__main__': main()
