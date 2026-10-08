"""Port TGMC tile geometry to pinned SS14 format 7; generated maps are local mapping sandboxes."""
from pathlib import Path
import json,collections,base64,struct,math,re,hashlib,yaml
ROOT=Path('/home/adminis/Documents/Data'); HERE=ROOT/'Tools/SS14/tgmc-port'; DEST=ROOT/'Projects/SS14/Resources/Maps/TGMC'
P=json.loads((HERE/'prototypes.json').read_text()); T=json.loads((HERE/'tiles.json').read_text())
class L(yaml.CSafeLoader):pass
L.add_multi_constructor('!',lambda l,t,n:l.construct_mapping(n) if isinstance(n,yaml.MappingNode) else l.construct_sequence(n) if isinstance(n,yaml.SequenceNode) else l.construct_scalar(n))
# Variant prototypes are expanded by SS14 before prototype loading.
for f in (ROOT/'Projects/SS14/Resources/Prototypes/Entities/Structures/Piping/Atmospherics').glob('*.yml'):
 for d in yaml.load(f.read_text(),Loader=L) or []:
  if isinstance(d.get('id'),dict):
   for id in d['id'].get('values',[]):P[id]={**d,'id':id}
cache={}
def components(proto):
 if proto in cache:return cache[proto]
 d=P.get(proto,{}); out={};parents=d.get('parent',[]);parents=[parents] if isinstance(parents,str) else parents
 for p in parents:out.update(components(p))
 for c in d.get('components',[]):out[c['type']]={**out.get(c['type'],{}),**c}
 cache[proto]=out;return out

def choose(*ids):
 for id in ids:
  if id in P and not P[id].get('abstract'):return id
 raise ValueError(ids)

def native(path):
 """Return native prototype plus an explicit disposition for every source type."""
 s=path.lower()
 if s.startswith('/area/'):return None,'area metadata retained in conversion record'
 if s.startswith('/turf/'):
  if '/water' in s:return choose('FloorWaterEntity'),'native water with movement slowdown and drawable water'
  if '/closed/' in s:
   if '/gm/' in s:return choose('FloraTree'),'solid jungle obstacle'
   if '/mineral' in s:return choose('WallRock'),'native mineable rock'
   if 'reinforced' in s or 'bulkhead' in s or 'indestructible' in s:return choose('WallReinforced'),'reinforced wall'
   return choose('WallSolid'),'wall'
  return None,'floor/space geometry'
 if s.endswith('/xeno_resin_wall'):return choose('WallXenoResin','WallMeat'),'native resin obstacle preserving original wall footprint'
 if s.endswith('/xeno_resin_door'):return choose('Airlock'),'native door preserving original resin doorway'
 if s.startswith('/obj/effect/'):
  if '/landmark' in s or '/ai_node' in s:return None,'TGMC game marker omitted; native SS14 spawn points added'
  if '/decal' in s or '/alien' in s:return None,'cosmetic or TGMC-only effect recorded'
  return None,'TGMC-only effect recorded'
 if s=='/obj/structure/lattice':return None,'native lattice tile, geometry retained'
 if s.startswith('/mob/'):return None,'TGMC mob omitted; no automatic hostile spawns'
 if '/vending/' in s:
  choices={'coffee':'VendingMachineCoffee','cola':'VendingMachineCola','sovietsoda':'VendingMachineSovietSoda','cigarette':'VendingMachineCigs','booze':'VendingMachineBooze','dinnerware':'VendingMachineDinnerware','hydroseeds':'VendingMachineSeedsUnlocked','hydronutrients':'VendingMachineNutri','engineering':'VendingMachineEngivend','engivend':'VendingMachineEngivend','tool':'VendingMachineYouTool','medical':'VendingMachineMedical','marinemed':'VendingMachineMedical','nanomed':'VendingMachineMedical','security':'VendingMachineSec','robotics':'VendingMachineRobotics','uniform':'VendingMachineClothing','dress':'VendingMachineClothing','marinefood':'VendingMachineSustenance'}
  for token,id in choices.items():
   if token in s:return choose(id),'native stocked vendor'
  return choose('VendingMachineSnack'),'native stocked vendor replacement'
 if '/table/' in s or s.endswith('/table'):
  return choose('TableWood' if 'wood' in s else 'TableReinforced' if 'reinforced' in s else 'Table'),'native table'
 if '/computer/' in s:
  choices={'medical':'ComputerMedicalRecords','security':'ComputerCriminalRecords','solar':'ComputerSolarControl','power':'ComputerPowerMonitoring','atmos':'ComputerAtmosMonitoring','research':'ComputerResearchAndDevelopment','arcade':'ComputerArcade','supply':'ComputerCargoOrders','communications':'ComputerComms'}
  for token,id in choices.items():
   if token in s and id in P:return choose(id),'native console; uses SS14 station systems'
 if '/door/window' in s:return choose('Windoor'),'interactive windoor'
 if '/door/airlock' in s:
  if 'glass' in s:return choose('AirlockGlass'),'interactive glass airlock'
  return choose('Airlock'),'interactive airlock'
 if '/door/' in s or '/mineral_door' in s:return choose('Airlock'),'interactive door replacement'
 if '/window' in s:
  if '/full' not in s:return choose('WindowReinforcedDirectional' if 'reinforced' in s else 'WindowDirectional'),'native directional window preserving separate edges'
  return choose('ReinforcedWindow' if 'reinforced' in s else 'Window'),'airtight full-tile window'
 if '/cable' in s:return choose('CableApcExtension'),'native LV cable'
 if '/atmospherics/pipe/' in s:
  layer='Alt1' if '/scrubbers/' in s else 'Alt2' if '/green/' in s else ''
  shape='GasPipeFourway' if 'manifold4w' in s else 'GasPipeTJunction' if 'manifold' in s else 'GasPipeStraight'
  return choose(shape+layer,shape),'native gas pipe'
 if '/atmospherics/' in s:
  for token,id in [('volume_pump','GasVolumePump'),('cryo_cell','CryoPod'),('filter','GasFilter'),('mixer','GasMixer'),('portables_connector','GasPortableConnector'),('freezer','GasThermoMachineFreezer'),('heater','GasThermoMachineHeater')]:
   if token in s and id in P:return id,'native atmos machine; pipe routing requires SS14 redesign'
  if 'vent_scrubber' in s:return choose('GasVentScrubberAlt1','GasVentScrubber'),'native scrubber'
  if 'vent_pump' in s:return choose('GasVentPump'),'native vent'
  if '/pump' in s:return choose('GasPressurePump'),'native pump'
  if '/valve' in s:return choose('GasValve'),'native valve'
  return None,'TGMC atmos device requires manual redesign; not replaced by a misleading prop'
 rules=[
 ('/foamedmetal','WallSolid'),('/bookcase','Bookshelf'),('/morgue','Morgue'),('/mirror','Mirror'),('/paper_bin','PaperBin20'),('/curtain','CurtainsWhite'),
 ('/reagent_dispensers/water_cooler','WaterCooler'),('/reagent_dispensers/watertank','WaterTankFull'),('/reagent_dispensers/fueltank','WeldingFuelTankFull'),
 ('/air_alarm','AirAlarm'),('/firealarm','FireAlarm'),('/landinglight','AlwaysPoweredSmallLight'),('/camera','SurveillanceCamera'),('/cell_charger','PowerCellRecharger'),
 ('/conveyor_switch','SignalSwitch'),('/conveyor','ConveyorBelt'),('/smartfridge','SmartFridgeMedical'),('/space_heater','SpaceHeaterAnchored'),('/recycler','Recycler'),('/seed_extractor','SeedExtractor'),('/biogenerator','Biogenerator'),
 ('/power/port_gen','GeneratorRTG'),('/power/geothermal','GeneratorRTG'),('/power/monitor','ComputerPowerMonitoring'),('/optable','MedicalBed'),('/bodyscanner','MedicalScanner'),
 ('/portable_atmospherics/scrubber','PortableScrubber'),('/portable_atmospherics/canister/oxygen','OxygenCanister'),('/portable_atmospherics/canister/nitrogen','NitrogenCanister'),('/portable_atmospherics/canister','AirCanister'),
 ('/item/defibrillator','Defibrillator'),('/item/bodybag','BodyBagFolded'),('/item/cell','PowerCellHigh'),

 ('/lattice','Lattice'),('/grille','Grille'),('/barricade','Barricade'),('/fence','FenceMetalStraight'),
 ('/largecrate','CrateGenericSteel'),('/table','Table'),('/rack','Rack'),('/bed/chair','Chair'),('/bed','Bed'),('/chair','Chair'),('/stool','Stool'),
 ('/closet/crate','CrateGenericSteel'),('/closet','LockerSteel'),('/storage/secure','LockerSteel'),('/filingcabinet','filingCabinet'),
 ('/toilet','ToiletFilled'),('/sink','Sink'),('/shower','Shower'),('/hydroponics','HydroponicsTrayEmpty'),
 ('/light','AlwaysPoweredWallLight'),('/floodlight','AlwaysPoweredLightExterior'),('/solar','SolarPanel'),
 ('/power/apc','APCBasic'),('/power/smes','SubstationBasic'),('/power/generator','GeneratorRTG'),('/power/terminal','CableTerminal'),
 ('/vending/medical','VendingMachineMedical'),('/vending/engineering','VendingMachineEngivend'),('/vending','VendingMachineSnack'),
 ('/computer','ComputerCrewMonitoring'),('/autolathe','Autolathe'),('/microwave','KitchenMicrowave'),('/reagentgrinder','ReagentGrinderIndustrial'),('/chem_dispenser','ChemDispenser'),('/chem_master','ChemMaster'),
 ('/sleeper','MedicalScanner'),('/body_scan','MedicalScanner'),('/cryopod','CryoPod'),('/recharge_station','WeaponCapacitorRecharger'),('/recharger','WeaponCapacitorRecharger'),('/suit_storage_unit','SuitStorageStandard'),
 ('/disposal','DisposalUnit'),('/flora/jungle/vines','FloraTreeStump'),('/flora','FloraTree'),('/ore_box','OreBox'),('/crate','CrateGenericSteel'),
 ('/item/tool/screwdriver','Screwdriver'),('/item/tool/wrench','Wrench'),('/item/tool/wirecutters','Wirecutter'),('/item/tool/weldingtool','Welder'),('/item/tool/crowbar','Crowbar'),('/item/tool/multitool','Multitool'),
 ('/item/stack/sheet/metal','SheetSteel'),('/item/stack/sheet/glass','SheetGlass'),('/item/stack','SheetSteel'),
 ('/item/weapon/gun','WeaponRifleAk'),('/item/weapon/combat_knife','CombatKnife'),('/item/ammo_magazine','MagazineLightRifle'),
 ('/item/reagent_containers/glass/beaker','Beaker'),('/item/reagent_containers/syringe','Syringe'),('/item/reagent_containers','DrinkWaterBottleFull'),
 ('/item/storage/firstaid','MedkitFilled'),('/item/storage/toolbox','ToolboxMechanicalFilled'),('/item/storage/backpack','ClothingBackpack'),('/item/storage','ToolboxMechanical'),
 ('/item/seeds','WheatSeeds'),('/item/clothing/head','ClothingHeadHelmetBasic'),('/item/clothing/shoes','ClothingShoesBootsWork'),('/item/clothing/gloves','ClothingHandsGlovesColorBlack'),('/item/clothing','ClothingUniformJumpsuitColorGrey'),
 ('/item/tank','OxygenTankFilled'),('/item/flashlight','FlashlightLantern'),('/item/radio','RadioHandheld'),('/item/paper','Paper'),('/item/book','BookRandom'),('/item/weapon','Crowbar'),
 ]
 for token,id in rules:
  if token in s:
   if id in P and not P[id].get('abstract'):return id,'native equivalent'
   return None,'candidate '+id+' unavailable; manual replacement listed'
 return None,'no reliable native equivalent; manual replacement listed'

def tile(path):
 s=path.lower()
 if '/space' in s:return 'Space'
 if '/grass' in s:return 'FloorGrass'
 if '/water' in s:return 'FloorAsteroidSand'
 if '/ground' in s or '/mineral' in s or '/gm/' in s:return 'FloorDirt'
 if '/plating' in s:return 'Plating'
 if '/wood' in s:return 'FloorWood'
 if '/engine' in s:return 'FloorReinforced'
 return 'FloorSteel'

def emit_map(name):
 src=json.loads((HERE/(name+'.json')).read_text());out=DEST/(name+'.yml');groups=collections.defaultdict(list);uid=2;chunks={};air={};usedtiles={'Space':0};seen=collections.Counter();dispositions={};floors=set();walls=set();entitycoords=collections.defaultdict(list);support_tiles=[]
 def spawn(proto,x,y,vars=None,extra=None):
  nonlocal uid
  assert proto in P and not P[proto].get('abstract'),proto
  uid+=1;tr={'type':'Transform','parent':2,'pos':f'{x+.5},{y+.5}'};c=components(proto)
  if 'Transform' in c and c['Transform'].get('anchored'):tr['anchored']=True
  v=vars or {};di=int(v.get('dir','2')) if str(v.get('dir','2')).isdigit() else 2
  pipe_rotation=None
  if proto.startswith(('GasPipeStraight','GasPipeBend','GasPipeTJunction','GasPipeFourway')):
   desired=15 if proto.startswith('GasPipeFourway') else 15^di if proto.startswith('GasPipeTJunction') else di if di in [5,6,9,10] else 3 if di in [1,2] else 12
   mask=15 if proto.startswith('GasPipeFourway') else 14 if proto.startswith('GasPipeTJunction') else 10 if proto.startswith('GasPipeBend') else 3
   for quarter in range(4):
    if mask==desired:pipe_rotation=quarter*math.pi/2;break
    mask=sum(b for a,b in [(1,8),(2,4),(4,1),(8,2)] if mask&a)
   assert pipe_rotation is not None,(proto,di,desired)

  tr['rot']={1:math.pi,2:0,4:math.pi/2,8:3*math.pi/2,5:3*math.pi/4,6:math.pi/4,9:5*math.pi/4,10:7*math.pi/4}.get(di,0)
  if pipe_rotation is not None:tr['rot']=pipe_rotation
  if c.get('Transform',{}).get('noRot',False):tr['rot']=0
  tr['rot']=f"{tr['rot']} rad"
  comp=[tr]
  # Mapping sandbox profile: machines operate independently while engineering networks are redesigned.
  if 'ApcPowerReceiver' in c:comp.append({'type':'ApcPowerReceiver','needsPower':False})
  if 'AccessReader' in c:comp.append({'type':'AccessReader','access':[]})
  if extra:comp+=extra
  if v.get('name') and v['name'].startswith('"'):comp.append({'type':'MetaData','name':v['name'].strip('"')})
  groups[proto].append({'uid':uid,'components':comp});entitycoords[(x,y)].append(proto)
 for coord,atoms in src['cells']:
  x,y,z=coord;x-=1;y-=1
  if z!=1:raise ValueError('multi-z requires explicit port handling')
  turf=next(p for p,v in atoms if p.startswith('/turf/'));tid=tile(turf)
  if tid=='Space' and any('/lattice' in p for p,v in atoms):tid='Lattice'
  assert tid in T,tid
  if tid!='Space':
   usedtiles.setdefault(tid,len(usedtiles));ci=(x//16,y//16);ch=chunks.setdefault(ci,bytearray(16*16*7));struct.pack_into('<iBBB',ch,((y%16)*16+x%16)*7,usedtiles[tid],0,0,0)
   if '/closed/' not in turf and tid!='Lattice':air[f'{x},{y}']=0;floors.add((x,y))
   else:walls.add((x,y))
  if '/water' in turf:floors.add((x,y))
  local=set()
  for path,v in atoms:
   proto,reason=native(path);dispositions.setdefault(path,{'prototype':proto,'reason':reason,'native_variants':[]});seen[path]+=1
   if not proto:continue
   # Retain separate window edges; consolidate only genuinely duplicated geometry.
   if path.startswith('/obj/structure/window') and '/full' not in path:proto=choose('WindowReinforcedDirectional' if 'reinforced' in path else 'WindowDirectional')
   geometry_key=(proto,str(v.get('dir','2'))) if proto in ['WindowDirectional','WindowReinforcedDirectional'] else proto
   if (proto in ['Window','ReinforcedWindow','WindowDirectional','WindowReinforcedDirectional','Grille','Lattice'] or path.startswith('/turf/')) and geometry_key in local:continue
   local.add(geometry_key)
   # Straight pipes become bends if old direction joins perpendicular sides.
   if proto.startswith('GasPipeStraight') and str(v.get('dir')) in ['5','6','9','10']:proto=proto.replace('Straight','Bend')
   if tid=='Space' and proto=='Lattice':
    # SS14 supports lattice on empty cells; retain vacuum rather than invent flooring.
    pass
   if tid=='Space' and components(proto).get('Transform',{}).get('anchored',False):
    tid='Lattice';usedtiles.setdefault(tid,len(usedtiles));ci=(x//16,y//16);ch=chunks.setdefault(ci,bytearray(16*16*7));struct.pack_into('<iBBB',ch,((y%16)*16+x%16)*7,usedtiles[tid],0,0,0);support_tiles.append({'coordinate':[x,y],'trigger':proto})
   if proto not in dispositions[path]['native_variants']:dispositions[path]['native_variants'].append(proto)
   spawn(proto,x,y,v)
 # Pick genuine clear walkable start areas, with space for the joining player.
 def blocked(proto):
  c=components(proto)
  if c.get('Physics',{}).get('canCollide') is False:return False
  return any(f.get('hard',True) for f in c.get('Fixtures',{}).get('fixtures',{}).values())
 clear=[p for p in floors if not any(blocked(q) for q in entitycoords[p])]
 assert clear,'No unobstructed spawn tile'
 center=(src['size'][0]/2,src['size'][1]/2)
 start=min(clear,key=lambda p:(abs(p[0]-center[0])+abs(p[1]-center[1])))
 for id in ['SpawnPointLatejoin','SpawnPointObserver','SpawnPointAnyJob']:spawn(id,*start)
 gridcomp=[{'type':'MetaData','name':name.replace('_',' ')+' — TGMC port'},{'type':'Transform','parent':1,'pos':f'{-start[0]-.5},{-start[1]-.5}'},{'type':'MapGrid','chunks':{f'{x},{y}':{'ind':f'{x},{y}','tiles':base64.b64encode(b).decode(),'version':7} for (x,y),b in sorted(chunks.items())}},{'type':'Broadphase'},{'type':'Physics','bodyType':'Static','fixedRotation':True},{'type':'Fixtures','fixtures':{}},{'type':'GridPathfinding'},{'type':'BecomesStation','id':'TGMC'+name.replace('_','')},{'type':'OccluderTree'},{'type':'Gravity','inherent':True,'enabled':True},{'type':'SpreaderGrid'},{'type':'ImplicitRoof'},{'type':'GridAtmosphere','version':1,'uniqueMixes':[{'temperature':293.15,'volume':2500,'moles':{'Oxygen':21.824879,'Nitrogen':82.10312}}],'tiles':air}]
 mapcomp=[{'type':'MetaData','name':name.replace('_',' ')},{'type':'Transform'},{'type':'Map','mapPaused':True},{'type':'GridTree'},{'type':'Broadphase'},{'type':'OccluderTree'},{'type':'ChunkContainer','chunkEntities':[]},{'type':'MapLight','ambientLightColor':'#999999FF'}]
 if name in ['Port_Hamburg','Vapor_Processing']:mapcomp.append({'type':'MapAtmosphere','space':False,'mixture':{'temperature':293.15,'volume':2500,'moles':{'Oxygen':21.824879,'Nitrogen':82.10312}}})
 entities=[{'proto':'','entities':[{'uid':1,'components':mapcomp},{'uid':2,'components':gridcomp}]}]+[{'proto':p,'entities':e} for p,e in sorted(groups.items())]
 data={'meta':{'format':7,'category':'Map','engineVersion':'292.0.0','forkId':'','forkVersion':'','time':'10/07/2026 05:30:00','entityCount':uid},'maps':[1],'grids':[2],'orphans':[],'nullspace':[],'tilemap':{v:k for k,v in usedtiles.items()},'entities':entities}
 DEST.mkdir(parents=True,exist_ok=True);out.write_text(yaml.dump(data,Dumper=yaml.CSafeDumper,sort_keys=False,width=100000))
 report={'source':str(ROOT/'Projects/TGMC/_maps/map_files'/name/(name+'.dmm')),'source_sha256':hashlib.sha256((ROOT/'Projects/TGMC/_maps/map_files'/name/(name+'.dmm')).read_bytes()).hexdigest(),'port':str(out),'port_sha256':hashlib.sha256(out.read_bytes()).hexdigest(),'size':src['size'],'entities':uid,'floor_tiles':len(floors),'wall_tiles':len(walls),'spawn_tile':list(start),'added_lattice_support_tiles':support_tiles,'native_objects':{p:len(e) for p,e in groups.items()},'types':{p:{**dispositions[p],'source_instances':n} for p,n in sorted(seen.items())},'profile':'Local mapping sandbox: breathable atmosphere; gravity; unrestricted, independently powered APC devices; no TGMC game rules.'}
 (HERE/(name+'-report.json')).write_text(json.dumps(report,indent=2)+'\n');print(name,uid,'entities',len(floors),'walkable tiles',out.stat().st_size,'bytes',flush=True)
for n in ['Tyson_Station','Port_Hamburg','SS_Ourang_Medan','Vapor_Processing']:emit_map(n)
