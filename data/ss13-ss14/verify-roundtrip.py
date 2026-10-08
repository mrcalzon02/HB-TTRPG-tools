from pathlib import Path
import yaml,base64,struct,json,collections,hashlib,math
r=Path(__file__).resolve().parent;root=r.parents[2]
class L(yaml.CSafeLoader):pass
L.add_multi_constructor('!',lambda l,t,n:l.construct_mapping(n) if isinstance(n,yaml.MappingNode) else l.construct_sequence(n) if isinstance(n,yaml.SequenceNode) else l.construct_scalar(n))
def read(p):return yaml.load(p.read_text(),Loader=L)
def tiles(d):
 out={}
 for group in d['entities']:
  for entity in group['entities']:
   for comp in entity.get('components',[]):
    if comp['type']!='MapGrid':continue
    for key,chunk in comp['chunks'].items():
     cx,cy=map(int,key.split(','));b=base64.b64decode(chunk['tiles']);assert len(b)==16*16*7
     for y in range(16):
      for x in range(16):
       id,flags,var,rot=struct.unpack_from('<iBBB',b,7*(y*16+x));name=d['tilemap'][id]
       if name!='Space':out[(cx*16+x,cy*16+y)]=(name,flags,var,rot)
 return out
def counts(d):return {g['proto']:len(g['entities']) for g in d['entities']}
def transforms(d):
 all_entities={e['uid']:e for g in d['entities'] for e in g['entities']};cache={}
 def world(uid):
  if uid in cache:return cache[uid]
  if uid not in all_entities:return (0.,0.,0.)
  tr=next((c for c in all_entities[uid].get('components',[]) if c['type']=='Transform'),{})
  x,y=map(float,str(tr.get('pos','0,0')).split(','));angle=str(tr.get('rot',0));rot=float(angle[:-3]) if angle.endswith('rad') else math.radians(float(angle))
  px,py,pr=world(tr.get('parent',0));value=(px+x*math.cos(pr)-y*math.sin(pr),py+x*math.sin(pr)+y*math.cos(pr),(pr+rot)%(2*math.pi));cache[uid]=value;return value
 out=collections.Counter()
 for g in d['entities']:
  for e in g['entities']:out[(g['proto'],tuple(round(v,5) for v in world(e['uid'])))]+=1
 return out
results={}
for n,label in [('Vapor_Processing','Vapor'),('SS_Ourang_Medan','Ourang'),('Tyson_Station','Tyson'),('Port_Hamburg','Hamburg')]:
 src=root/'Projects/SS14/Resources/Maps/TGMC'/(n+'.yml');saved=root/'Tools/SS14/port-test-data'/(label+'-roundtrip.yml')
 if not saved.exists():continue
 a,b=read(src),read(saved);assert tiles(a)==tiles(b),(n,'tile geometry changed');assert counts(a)==counts(b),(n,'entity counts changed');assert transforms(a)==transforms(b),(n,'object positions or rotations changed');results[n]={'saved_map':str(saved),'tile_geometry_identical':True,'entity_counts_identical':True,'positions_and_rotations_identical':True,'entities':a['meta']['entityCount'],'tiles':len(tiles(a)),'saved_sha256':hashlib.sha256(saved.read_bytes()).hexdigest()};print(n,results[n])
(r/'roundtrip-validation.json').write_text(json.dumps(results,indent=2)+'\n')
