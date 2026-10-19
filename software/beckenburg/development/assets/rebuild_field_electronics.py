"""Source-preserving field electronics rebuild. Asset-only; no gameplay build.
Run Blender --background --factory-startup --python this_file [-- ITEM ...].
New cases have shaped silhouettes and material-specific 64px wear maps. Matching
baseline sources stay byte-identical in the catalog. Every family is rendered.
"""
import bpy, math, json, copy, sys, hashlib
from pathlib import Path
from mathutils import Vector, Matrix, Euler
sys.path.insert(0,str(Path(__file__).resolve().parent))
import rebuild_support as S
P=S.PROJECT; D=S.DEV
OLD={v['id']:v for v in json.loads((D/'equipment-assets.json').read_text())['items']}
PI=math.pi
# Bake axial source rotations into vertices explicitly, preserving original UVs.
# Blender's dependency graph may otherwise keep an earlier imported transform.
_source_import=S.import_source
def source_import(name,size=None,rotation=None,location=(0,0,0),scale=None):
 o=_source_import(name,size=size,rotation=None,location=(0,0,0),scale=scale)
 if rotation:
  matrix=Euler(rotation).to_matrix()
  for v in o.data.vertices:v.co=matrix@v.co
  lo=Vector([min(v.co[i] for v in o.data.vertices) for i in range(3)])
  hi=Vector([max(v.co[i] for v in o.data.vertices) for i in range(3)])
  center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
  for v in o.data.vertices:v.co-=center
 o.location=location;o.data.update();bpy.context.view_layer.update();return o
S.import_source=source_import

def mats():
 return {k:S.material(k,c,kind) for k,c,kind in [
 ('charcoal chassis',(.115,.13,.135),'paint'),('rubber grip',(.045,.052,.052),'rubber'),
 ('brushed alloy',(.48,.50,.49),'metal'),('dark anodized',(.18,.20,.21),'metal'),
 ('ivory instrument',(.63,.65,.59),'paint'),('olive instrument',(.24,.28,.19),'paint'),
 ('warning yellow',(.66,.48,.075),'paint'),('violet filter',(.24,.10,.39),'ceramic'),
 ('optical blue glass',(.10,.20,.25),'ceramic'),('white fresnel',(.7,.72,.65),'ceramic'),
 ('canvas strap',(.11,.13,.10),'cloth'),('red control',(.48,.055,.035),'rubber'),
 ('green signal',(.13,.48,.19),'ceramic'),('dish smoked acrylic',(.30,.35,.34),'ceramic')]}
M={}
def optical_material(name,kind='blue'):
 mat=bpy.data.materials.new(name);mat.use_nodes=True;sh=mat.node_tree.nodes['Principled BSDF'];sh.inputs['Roughness'].default_value=.26;sh.inputs['Metallic'].default_value=.24
 im=bpy.data.images.new(name+' radial optical map',width=128,height=128);pixels=[]
 for iy in range(128):
  for ix in range(128):
   x=(ix-63.5)/63.5;y=(iy-63.5)/63.5;r=math.sqrt(x*x+y*y);a=math.atan2(y,x)
   if kind=='reflector':
    c=.19+.46*min(1,r)+.035*math.cos(a*12)+.025*math.sin(r*87);rgb=[c*.94,c*.96,c*.91]
    if r<.15:rgb=[.72,.64,.35] if r<.095 else [.22,.23,.19]
   elif kind=='violet':rgb=[.085+.11*(1-min(1,r)),.023+.022*(1-min(1,r)),.14+.15*(1-min(1,r))]
   else:rgb=[.018+.026*(1-min(1,r)),.045+.045*(1-min(1,r)),.060+.065*(1-min(1,r))]
   if .78<r<.83:rgb=[c+.10 for c in rgb]
   if .40<r<.43:rgb=[c+.025 for c in rgb]
   # Small off-axis reflection and diagonal coating reflection, painted in texels.
   glint=((x+.32)/.24)**2+((y-.40)/.095)**2
   light=.34 if glint<1 else .075 if abs(y-.4*x-.40)<.035 and r<.76 else 0
   rgb=[min(1,max(0,c+light)) for c in rgb];pixels.extend(rgb+[1])
 im.pixels.foreach_set(pixels);im.pack();tx=mat.node_tree.nodes.new('ShaderNodeTexImage');tx.image=im;tx.interpolation='Closest';mat.node_tree.links.new(tx.outputs['Color'],sh.inputs['Base Color']);return mat

def box(n,p,d,m='charcoal chassis',b=.003):return S.box(n,p,d,M[m],b)
def rod(n,a,b,r,m='dark anodized',s=10,er=None):return S.rod(n,a,b,r,M[m],s,er)
def mesh(n,v,f,m='charcoal chassis'):return S.mesh(n,v,f,M[m])
def lathe_y(n,profile,loc=(0,0,0),m='charcoal chassis',seg=12):
 o=S.lathe(n,profile,M[m],seg);matrix=Euler((PI/2,0,0)).to_matrix();[setattr(v,'co',matrix@v.co) for v in o.data.vertices];o.location=loc;o.data.update();bpy.context.view_layer.update();return o

def case(n,center,size,mat='charcoal chassis',ch=.007,taper=0):
 # Chamfered octagonal perimeter, with a shallow rearward taper.
 w,d,h=size;x,y,z=center;r=min(ch,w*.23,h*.23)
 outline=[(-w/2+r,-h/2),(w/2-r,-h/2),(w/2,-h/2+r),(w/2,h/2-r),(w/2-r,h/2),(-w/2+r,h/2),(-w/2,h/2-r),(-w/2,-h/2+r)]
 v=[(x+a*(1-taper if j else 1),y+(-d/2 if j==0 else d/2),z+b*(1-taper if j else 1)) for j in range(2) for a,b in outline]
 f=[tuple(range(7,-1,-1)),tuple(range(8,16))]+[(i,(i+1)%8,(i+1)%8+8,i+8) for i in range(8)]
 return mesh(n,v,f,mat)

def cap(n,p,r,depth=.006,mat='dark anodized'):
 x,y,z=p;return rod(n,(x,y+depth/2,z),(x,y-depth/2,z),r,mat,12)

def ring(n,center,ro,ri,depth=.006,mat='dark anodized',sides=16):
 x,y,z=center;v=[]
 for yy,rr in [(y+depth/2,ro),(y-depth/2,ro),(y-depth/2,ri),(y+depth/2,ri)]:
  v.extend((x+rr*math.cos(i*2*PI/sides),yy,z+rr*math.sin(i*2*PI/sides)) for i in range(sides))
 f=[]
 for j in range(4):
  for i in range(sides):f.append((j*sides+i,j*sides+(i+1)%sides,((j+1)%4)*sides+(i+1)%sides,((j+1)%4)*sides+i))
 return mesh(n,v,f,mat)

def lens(p,r=.018,depth=.018):
 x,y,z=p
 return [lathe_y('stepped optical barrel',[(0,r*.86),(.004,r),(.009,r),(.011,r*.91),(depth,r*.91)],(x,y+depth,z),'dark anodized'),ring('recessed lens bezel',(x,y,z),r*.91,r*.71,.004),cap('coated optical lens',(x,y-.003,z),r*.70,.002,'optical blue glass')]

GLYPHS={'0':['111','101','101','101','111'],'1':['010','110','010','010','111'],'2':['111','001','111','100','111'],'3':['111','001','111','001','111'],'4':['101','101','111','001','001'],'5':['111','100','111','001','111'],'6':['111','100','111','101','111'],'7':['111','001','010','010','010'],'8':['111','101','111','101','111'],'9':['111','101','111','001','111'],'.':['0','0','0','0','1'],'-':['000','000','111','000','000'],'C':['111','100','100','100','111'],'F':['111','100','110','100','100'],'M':['10101','11111','10101','10101','10101'],'H':['101','101','111','101','101'],'Z':['111','001','010','100','111'],'D':['110','101','101','101','110'],'B':['110','101','110','101','110'],'R':['110','101','110','101','101'],'I':['111','010','010','010','111'],'P':['110','101','110','100','100'],'A':['010','101','111','101','101'],'V':['101','101','101','101','010'],'O':['111','101','101','101','111'],'N':['101','111','111','111','101'],'S':['111','100','111','001','111'],' ':['0','0','0','0','0']}
def panelmat(name,text,bg=(.13,.20,.15),fg=(.52,.65,.45)):
 name='Display '+name
 if bpy.data.materials.get(name):return bpy.data.materials[name]
 im=bpy.data.images.new(name,width=128,height=64);pix=[list(bg)+[1] for _ in range(128*64)]
 def put(x,y,c):
  if 0<=x<128 and 0<=y<64:pix[y*128+x]=list(c)+[1]
 for y in range(64):
  for x in range(128):
   if x<3 or x>124 or y<3 or y>60:put(x,y,tuple(c*.45 for c in bg))
 x=9
 for char in text:
  glyph=GLYPHS.get(char.upper(),GLYPHS[' ']);scale=3 if len(text)<9 else 2
  for j,row in enumerate(glyph):
   for i,v in enumerate(row):
    if v=='1':
     for a in range(scale):
      for b in range(scale):put(x+i*scale+a,24+(4-j)*scale+b,fg)
  x+=(len(glyph[0])+1)*scale
 for x in range(9,113):
  if x%8<5:put(x,12,fg)
 im.pixels.foreach_set([v for p in pix for v in p]);im.pack();mat=bpy.data.materials.new(name);mat.use_nodes=True;sh=mat.node_tree.nodes['Principled BSDF'];sh.inputs['Roughness'].default_value=.7;tx=mat.node_tree.nodes.new('ShaderNodeTexImage');tx.image=im;tx.interpolation='Closest';mat.node_tree.links.new(tx.outputs['Color'],sh.inputs['Base Color']);return mat

def screen(n,p,size,text):
 x,y,z=p;w,h=size
 o=S.mesh(n,[(x-w/2,y,z-h/2),(x+w/2,y,z-h/2),(x+w/2,y,z+h/2),(x-w/2,y,z+h/2)],[(0,1,2,3)],panelmat(n,text));return o

def tint_source(obj,factor=(.70,.76,.8)):
 # Keep the source texel layout and engraved markings, make one charcoal variant.
 for i,old in enumerate(list(obj.data.materials)):
  mat=old.copy();mat.name=old.name+' charcoal field finish';obj.data.materials[i]=mat
  for nd in mat.node_tree.nodes:
   if nd.type=='TEX_IMAGE' and nd.image:
    image=nd.image.copy();image.name+=' charcoal';px=list(image.pixels)
    for j in range(0,len(px),4):
     r,g,b=px[j:j+3];lum=.30*r+.59*g+.11*b
     if True:
      px[j:j+3]=[lum*f for f in factor]
    image.pixels.foreach_set(px);image.pack();nd.image=image

def band(name,rx,ry,z,width=.02,thickness=.004,mat='canvas strap'):
 v=[];n=24
 for zz,rr in [(z-width/2,0),(z+width/2,0),(z+width/2,-thickness),(z-width/2,-thickness)]:
  for i in range(n):
   a=2*PI*i/n;v.append(((rx+rr)*math.sin(a),(ry+rr)*math.cos(a),zz))
 f=[(j*n+i,j*n+(i+1)%n,((j+1)%4)*n+(i+1)%n,((j+1)%4)*n+i) for j in range(4) for i in range(n)]
 return mesh(name,v,f,mat)

def unchanged(item,tier,name,rotation=None):
 old=copy.deepcopy(OLD[item]['stages'][tier-1]);old['existing_unchanged']=True;old['variants']={};old['model']=f'assets/runtime/models/{name}.glb';old['features']=['Matching original source retained byte-for-byte, including full texture and UV layout'];o=S.import_source(name,size=.145 if item=='PHOTO_CAMERA' else None,rotation=rotation);o['equipment_id']=item;o['tier']=tier;o.data.calc_loop_triangles();old['source_model']=name;old['sha256']=hashlib.sha256(S.source_path(name).read_bytes()).hexdigest();old['triangles']=len(o.data.loop_triangles);old['dimensions_blender_z_up']=list(o.dimensions);old['preview_rotation_blender']=list(rotation) if rotation else None;return old,o

def radio(t,state='default'):
 source='walkie_talkie_1' if t==1 else 'walkie_talkie_2'
 o=S.import_source(source,size=.27 if t==1 else .28,rotation=(PI/2,0,0));parts=[o]
 if t==3:
  tint_source(o,(.6,.66,.69))
  # A proper higher-quality receiver: same faithful radio form, sturdier volume dial.
  parts += [rod('knurled receiver volume',(.021,-.010,.163),(.021,-.010,.177),.010,'dark anodized',12),cap('scan control',(.028,-.019,.108),.004,.004,'red control')]
 return parts,['Original textured radio shell, speaker grille, keyed controls and aerial retained','Receiver tiers use complete radio forms; charcoal III has a knurled tuning control']

def emf(t,state='default'):
 source='dosimeter_4' if t==2 else 'dosimeter_2'
 o=S.import_source(source,size=.205 if t==2 else .22,rotation=(PI/2,0,0));return [o],['Source analog field meter retained at its original proportions with full dial artwork and switches','Unwarped shell, original material and UV coordinates']

def thermometer(t,state='default'):
 if t==3:
  return [S.import_source('exploration_thermal_camera',size=.235)],['Purpose-matched thermal measurement pistol with original textured screen, sensor and grip; no camera repurposing']
 p=[case('tapered contact thermometer',(0,0,.075),(.052,.027,.15),'ivory instrument',.008,.09),case('rear rubber overmould',(0,.011,.072),(.055,.018,.14),'rubber grip',.009,.05),box('recessed display trim',(0,-.014,.103),(.041,.004,.045),'rubber grip',.003),screen('contact temperature LCD',(0,-.0165,.104),(.034,.034),'-- C')]
 p += [rod('stainless immersion probe',(0,0,.148),(0,0,.235),.0025,'brushed alloy',8,.0015),rod('probe seating collar',(0,0,.145),(0,0,.158),.007,'dark anodized',10)]
 for x,mat in [(-.014,'red control'),(0,'rubber grip'),(.014,'rubber grip')]:p.append(cap('sealed thermometer key',(x,-.017,.052),.005,.003,mat))
 return p,['Tapered rubber-protected contact thermometer with stainless immersion probe','Inset temperature LCD and three sealed physical keys']

def flashlight(t,state='default',uv=False):
 if t==2:
  o=S.import_source('flashlight_mp_1',size=.25,rotation=(0,0,-PI/2));p=[o]
  if uv:
   tint_source(o,(.39,.40,.46));p.append(cap('UV optical filter',(0,-.126,.043),.030,.003,'violet filter'))
  return p,['Complete original textured lamp with battery barrel, switch, flared reflector and collar','Violet optical filter over reflector' if uv else 'Original source materials and UVs retained']
 if uv and t==3:
  p=[case('inspection lamp grip',(0,0,.056),(.046,.038,.112),'rubber grip',.009,.13),case('lower lamp shoe',(0,0,.117),(.069,.041,.027),'dark anodized',.009),case('upper lamp cap',(0,0,.292),(.068,.041,.023),'dark anodized',.008),rod('violet fluorescent tube',(0,-.006,.132),(0,-.006,.278),.009,'violet filter',12)]
  # Open reflector trough, rather than an opaque plastic box around the lamp.
  v=[]
  for z in (.13,.28):
   for i in range(9):
    a=PI*i/8;v.append((.026*math.cos(a),.007+.016*math.sin(a),z))
  p.append(mesh('curved aluminum UV reflector',v,[(i,i+1,i+10,i+9) for i in range(8)],'brushed alloy'))
  for x in (-.026,.026):p.append(rod('protective inspection guard',(x,-.017,.128),(x,-.017,.281),.0025,'dark anodized',6))
  p += [box('inspection power key',(0,-.021,.079),(.018,.006,.021),'red control',.003),ring('hanging eye',(0,0,.31),.011,.006,.005)]
  return p,['Fluorescent UV inspection lamp with exposed tube, curved reflector, guard rails and shaped handgrip','One coherent lamp assembly; hanging eye and sealed switch']
 # Real lathed torch shell with a controlled continuous taper and faceted reflector.
 slim=uv;L=.165 if slim else .235;R=.014 if slim else .023
 profile=[(0,R*.82),(.006,R),(.022,R),(.025,R*.89),(L*.62,R*.89),(L*.67,R),(L*.72,R*1.26),(L*.87,R*1.60),(L-.006,R*1.60),(L,R*1.52)]
 p=[lathe_y('continuous torch body',profile,(0,L/2,R*1.65),'charcoal chassis'),ring('torch metal bezel',(0,-L/2,R*1.65),R*1.54,R*1.28,.007,'dark anodized'),cap('UV filter' if uv else 'reflector glass',(0,-L/2-.003,R*1.65),R*1.25,.003,'violet filter' if uv else 'reflector glass')]
 for y in (.01,.023,.036,.049,.062):p.append(ring('grip groove',(0,y,R*1.65),R*.96,R*.88,.003,'rubber grip',12))
 p += [box('rubber thumb switch',(0,0,R*2.6),(.014,.024,.007),'rubber grip',.003)]
 return p,['Faceted battery tube, tapered lamp head, recessed single reflector and textured grip rings','Violet filtered pocket UV lamp' if uv else 'Black duty flashlight with machined reflector collar']

def hood(center):
 x,y,z=center;n=16;v=[]
 for yy,rr in [(y+.002,.029),(y-.015,.033),(y-.015,.030),(y+.002,.026)]:
  v.extend((x+rr*math.cos(i*2*PI/n),yy,z+rr*math.sin(i*2*PI/n)) for i in range(n))
 return mesh('flared single lens hood',v,[(j*n+i,j*n+(i+1)%n,((j+1)%4)*n+(i+1)%n,((j+1)%4)*n+i) for j in range(4) for i in range(n)],'dark anodized')

def camera(t,state='default',video=False):
 if not video:
  o=S.import_source('exploration_photo_camera',size=.145 if t==2 else .158);p=[o];h=o.dimensions.z;front=-o.dimensions.y/2
  p += [case('integrated camera handgrip',(-.057,-.001,h*.40),(.029,.040,h*.82),'rubber grip',.010,.06),rod('top mode dial',(-.048,.008,h*.94),(-.048,.008,h*1.03),.010,'dark anodized',12)]
  if t==3:
   # Shaped pentaprism merges into the top shoulder, rather than a block on a box.
   v=[(-.021,-.014,h*.94),(.021,-.014,h*.94),(.019,.015,h*.94),(-.019,.015,h*.94),(-.012,-.009,h*1.17),(.012,-.009,h*1.17),(.011,.011,h*1.17),(-.011,.011,h*1.17)]
   p += [mesh('sloping pentaprism housing',[(x+.02218,y,z) for x,y,z in v],[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)]),hood((.02218,front,h*.460)),box('hotshoe contacts',(.02218,.007,h*1.18),(.018,.015,.003),'brushed alloy',.001)]
  return p,['Original compact camera shell, telescope lens and full source face texture retained','Integrated grip, real shutter/mode control and optical viewfinder','Tier III adds a sloping pentaprism and one lens hood']
 w=.066 if t==1 else .073 if t==2 else .083;length=.138 if t<3 else .181;h=.073 if t<3 else .083;z=.077
 p=[case('camcorder integrated chassis',(0,.012,z),(w,length,h),'ivory instrument' if t==1 else 'charcoal chassis',.011,.07),case('ribbed tape door',(w/2+.002,.014,z),(.008,length*.65,h*.76),'rubber grip',.004),box('upper camera shoulder',(0,.019,z+h*.46),(w*.77,length*.70,.014),'dark anodized',.005)]
 p += lens((0,-length/2-.006,z+.003),.022 if t<3 else .028,.024)
 for offset in (.001,.006,.011):p.append(ring('lens focus knurl',(0,-length/2+offset,z+.003),.0223 if t<3 else .0283,.021 if t<3 else .027,.002,'rubber grip'))
 p += [case('rear camcorder battery',(0,length/2+.017,z-.007),(w*.69,.026,h*.69),'rubber grip',.005),box('zoom rocker',(w*.22,-.032,z+h*.56),(.012,.025,.005),'rubber grip',.002)]
 # Woven wrist strap follows the side of the tape housing.
 p += [S.mesh('padded camcorder hand strap',[(w/2+.010,-.040,z-.018),(w/2+.021,-.031,z-.018),(w/2+.023,.056,z-.018),(w/2+.008,.067,z-.018),(w/2+.010,-.040,z+.008),(w/2+.021,-.031,z+.008),(w/2+.023,.056,z+.008),(w/2+.008,.067,z+.008)],[(0,1,5,4),(1,2,6,5),(2,3,7,6)],M['canvas strap']),rod('viewfinder eyecup',(-w*.28,length/2+.005,z+h*.25),(-w*.28,length/2+.029,z+h*.25),.010,'rubber grip',8),box('record key',(w*.28,-.005,z+h*.60),(.011,.018,.005),'red control',.003)]
 if t>=2:
  p += [case('hinged LCD monitor',(-w*.79,-.004,z),(.047,.009,.038),'dark anodized',.004),screen('camcorder monitor',(-w*.79,-.009,z),(.039,.029),'AV 03'),rod('screen hinge',(-w/2,.014,z-.021),(-w/2,.014,z+.021),.004,'dark anodized',8)]
 if t==3:
  # Closed top handle rises only as much as a hand needs.
  for yy in (-.037,.062):p.append(case('handle saddle',(0,yy,z+h*.70),(.022,.014,.030),'dark anodized',.004))
  p += [case('carrying handle',(0,.013,z+h*.93),(.025,.116,.015),'rubber grip',.006),rod('directional microphone',(.025,-.061,z+h*.71),(.025,.018,z+h*.71),.007,'rubber grip',10)]
  for yy in (-.025,.010):p.append(rod('microphone suspension pedestal',(.025,yy,z+h*.49),(.025,yy,z+h*.72),.004,'dark anodized',8))
 for yy in (.003,.013,.023,.033):p.append(box('camcorder cooling slit',(-w/2-.0005,yy,z+h*.26),(.002,.005,.015),'rubber grip',.0004))
 return p,['Purpose-built proportioned camcorder body, single lens, tape door, eyecup and woven hand strap','Tier II fold-out LCD; Tier III shoulder, carry handle and directional microphone']

def stand(t,fold=False,height=None):
 h=height or [.60,.82,1.04][t-1];spread=.035 if fold else h*.38;parts=[];mat='brushed alloy' if t==1 else 'dark anodized'
 parts += [rod('telescopic center column',(0,0,h*.40),(0,0,h-.035),.008,mat,10),rod('leg spider',(0,0,h*.56),(0,0,h*.63),.017,'charcoal chassis',10),box('camera quick-release plate',(0,0,h),(.055,.040,.010),'rubber grip',.004),rod('tripod tilt head',(0,0,h-.036),(0,0,h-.002),.019,'dark anodized',10),rod('pan handle',(.013,.015,h-.02),(.028,.127,h+.007),.004,'dark anodized',8),rod('pan handle grip',(.024,.092,h),(.028,.134,h+.009),.007,'rubber grip',8)]
 for i in range(3):
  a=i*2*PI/3;top=Vector((.014*math.cos(a),.014*math.sin(a),h*.60));foot=Vector((spread*math.cos(a),spread*math.sin(a),.010));mid=top.lerp(foot,.62)
  parts += [rod('upper tripod leg',top,mid,.010 if t<3 else .011,mat,8,.008),rod('lower telescoping leg',mid,foot,.006,mat,8),rod('clamping collar',mid.lerp(top,.03),mid.lerp(foot,.045),.011,'rubber grip',8),rod('rubber tripod foot',foot+Vector((0,0,.015)),foot,.009,'rubber grip',8)]
  if not fold:parts.append(rod('leg spreader',(0,0,h*.43),top.lerp(foot,.50),.003,'dark anodized',6))
 return parts

def projector(t,state='default'):
 deployed=state=='deployed';raisez=.10 if deployed and t>1 else .02
 if t==1:
  o=S.import_source('vape_mp_1',size=.155,rotation=(0,0,PI/2));tint_source(o,(.30,.36,.33));p=[o];z=o.dimensions.z/2
  p += [ring('projector focus collar',(0,-.080,z),.017,.012,.009,'dark anodized'),cap('single laser aperture',(0,-.086,z),.010,.002,'green signal'),box('projector pocket clip',(.016,.013,z+.006),(.005,.066,.008),'dark anodized',.002)]
  return p,['Original cylindrical PSX source shell kept in proportion, with one focus collar and laser aperture','Pocket projector with mechanical clip; runtime supplies the projected dots']
 w=.106 if t==2 else .134;d=.10 if t==2 else .12;h=.050 if t==2 else .063;z=raisez+h/2
 p=[case('sloping projector chassis',(0,0,z),(w,d,h),'charcoal chassis',.010,.10)]
 p += lens((0,-d/2-.012,z),.019 if t==2 else .025,.017)
 p.append(cap('green projection optic',(0,-d/2-.017,z),.012 if t==2 else .017,.002,'green signal'))
 for i in range(5):p.append(box('projector ventilation groove',(-w/2-.0008,-.024+i*.012,z),(.002,.006,h*.49),'rubber grip',.0007))
 p += [rod('focus wheel',(w*.35,-.020,z+h*.39),(w*.35,-.020,z+h*.60),.008,'dark anodized',12),cap('power status',(-w*.30,-d/2-.001,z+h*.28),.0025,.002,'green signal')]
 if deployed:p += stand(1,height=.10)
 else:p += [box('projector underside rail',(0,0,.011),(.064,.068,.015),'rubber grip',.004)]
 return p,['Compact projector with sloping case, single focused optical aperture, cooling vents and adjustment dial','Deployed form has a mechanical tabletop support']

def headgear(t,state='default'):
 p=[band('woven adjustable head band',.088,.100,.065),box('rear strap adjuster',(0,.101,.065),(.040,.010,.026),'rubber grip',.004)]
 # Continuous overhead crown strap.
 pts=[(0,-.098+ .196*i/12,.065+.072*math.sin(PI*i/12)) for i in range(13)]
 v=[(x+dx,y,z) for x,y,z in pts for dx in (-.010,.010)]
 p.append(mesh('crown webbing',v,[(i*2,i*2+1,i*2+3,i*2+2) for i in range(12)],'canvas strap'))
 p += [case('front mounting cradle',(0,-.102,.068),(.053,.018,.038),'dark anodized',.006)]
 if t==1:
  p+=lens((0,-.128,.068),.018,.018);p[-1].data.materials[0]=M['reflector glass']
 elif t==2:
  p += [case('head camera tapered housing',(0,-.126,.068),(.046,.042,.033),'charcoal chassis',.007,.10)]+lens((0,-.154,.068),.013,.012)
 else:
  p += [lathe_y('monocular night scope',[(0,.014),(.014,.019),(.065,.019),(.074,.025),(.085,.025)],(0,-.108,.067),'charcoal chassis'),ring('night scope focus ring',(0,-.177,.067),.027,.021,.010),cap('night scope objective',(0,-.194,.067),.019,.003,'optical blue glass'),case('counterweight battery',(0,.107,.067),(.053,.026,.034),'rubber grip',.006)]
 return p,['Wearable cloth headband, adjustable rear buckle, crown strap and metal mounting cradle','One front lamp, compact camera or monocular optic, with believable wearable proportions']

def sphere(n,p,size,mat='white fresnel'):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=12,ring_count=6,radius=1,location=p);o=bpy.context.object;o.name=n;o.scale=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(M[mat]);S.uv_project(o);return o

def motion(t,state='default'):
 w=.048+.007*(t-1);h=.091+.011*(t-1);p=[case('tapered PIR alarm case',(0,0,h/2), (w,.032,h),'ivory instrument' if t<3 else 'charcoal chassis',.010,.12),sphere('fresnel detection window',(0,-.016,h*.43),(w*.38,.014,h*.23)),cap('alarm indicator',(0,-.017,h*.82),.003,.002,'red control'),case('wall mounting plate',(0,.020,h*.49),(w*.69,.008,h*.79),'dark anodized',.004)]
 # Ribbed translucent-looking Fresnel lens; geometry provides real optical segmentation.
 for i in range(-2,3):p.append(rod('fresnel lens ribs',(-w*.27,-.028,h*.43+i*h*.065),(w*.27,-.028,h*.43+i*h*.065),.0007,'white fresnel',4))
 if t>=2:p += [cap('sensitivity trim',(.015,-.017,h*.16),.004,.002),box('sealed rubber case seam',(0,.001,h*.12),(w*.82,.034,.002),'rubber grip',.001)]
 if t==3:p += [rod('swivel mounting neck',(0,.025,h*.5),(0,.047,h*.5),.008,'dark anodized',8)]
 return p,['Recognizable wall-mounted PIR sensor with tapered alarm case and segmented convex Fresnel lens','Sealed case seam, status LED and mechanical wall mount']

def sound(t,state='default'):
 h=.11+.022*(t-1);p=[case('sound receiver lower case',(0,0,h*.36),(.052,.039,h*.65),'olive instrument' if t==1 else 'charcoal chassis',.009,.09),rod('microphone preamp stem',(0,0,h*.60),(0,0,h*.83),.010,'dark anodized',10),rod('acoustic microphone head',(0,0,h*.78),(0,0,h*1.06),.018 if t<3 else .021,'rubber grip',12),case('wall receiver mounting shoe',(0,.024,h*.30),(.035,.010,h*.47),'dark anodized',.004),cap('receiver live indicator',(-.015,-.021,h*.42),.0026,.002,'green signal')]
 for z in [h*(.82+i*.045) for i in range(5)]:p.append(band('microphone grille band',.0186 if t<3 else .0216,.0186 if t<3 else .0216,z,.002,.001,'dark anodized'))
 if t>=2:p += [screen('sound pressure LCD',(0,-.020,h*.34),(.032,.022),'-- DB')]
 if t==3:p += [rod('receiver stub antenna',(.020,.007,h*.61),(.020,.007,h*1.16),.0025,'rubber grip',8,.0015)]
 return p,['Dedicated acoustic monitoring instrument with preamplifier neck, vented microphone head and wall shoe','Screen and radio receiver appear only on higher tiers']

def parabolic(t,state='default'):
 R=.105+.015*(t-1);Z=.205+.012*(t-1);depth=.051+.008*(t-1);N=20;rings=7;v=[]
 for j in range(rings):
  r=R*j/(rings-1)
  for i in range(N):
   a=2*PI*i/N;v.append((r*math.cos(a),.020-depth*(r/R)**2,Z+r*math.sin(a)))
 f=[(j*N+i,j*N+(i+1)%N,(j+1)*N+(i+1)%N,(j+1)*N+i) for j in range(rings-1) for i in range(N)]
 p=[mesh('concave parabolic reflector',v,f,'dish smoked acrylic'),ring('rolled dish rim',(0,.020-depth,Z),R+.002,R-.002,.004,'dark anodized',20),case('dish receiver handgrip',(0,.034,.070),(.035,.044,.115),'rubber grip',.008,.09),case('receiver electronics bridge',(0,.032,.136),(.070,.052,.040),'olive instrument' if t==1 else 'charcoal chassis',.008,.06),rod('central microphone pickup',(0,-.062,Z),(0,-.097,Z),.008,'rubber grip',10)]
 for a in (PI/2,PI*7/6,PI*11/6):p.append(rod('dish focal pickup strut',(R*.82*math.cos(a),.020-depth*.82*.82,Z+R*.82*math.sin(a)),(0,-.073,Z),.0022,'dark anodized',6))
 p += [rod('dish backbone mounting stem',(0,.032,.151),(0,.020,Z),.007,'dark anodized',10),screen('parabolic receiver level',(0,.0058,.136),(.047,.023),'DB --' if t>=2 else 'DB'),rod('gain control mounting spindle',(.026,.010,.136),(.026,.002,.136),.003,'dark anodized',8),cap('receiver gain',(.026,.003,.136),.006,.003)]
 if t==3:p.append(rod('support wrist rail',(-.032,.056,.040),(.032,.056,.040),.005,'dark anodized',8))
 return p,['True concave dish profile with rolled rim, focal pickup and three thin supporting struts','Integrated pistol receiver, textured grip and gain control; measured tier dimensions']

BUILD={'EMF_READER':emf,'THERMOMETER':thermometer,'SPIRIT_BOX':radio,'FLASHLIGHT':flashlight,'UV_LIGHT':lambda t,s:flashlight(t,s,True),'PHOTO_CAMERA':camera,'VIDEO_CAMERA':lambda t,s:camera(t,s,True),'DOTS_PROJECTOR':projector,'HEAD_GEAR':headgear,'MOTION_SENSOR':motion,'SOUND_SENSOR':sound,'PARABOLIC_MICROPHONE':parabolic,'TRIPOD':lambda t,s:(stand(t,s=='folded'),['Physical telescoping camera tripod, spreader braces, tilt head, quick release and pan handle','Separate folded leg state for carrying'])}
BASE={'EMF_READER':('exploration_emf_detector',(PI/2,0,0)),'THERMOMETER':('exploration_thermometer',None),'FLASHLIGHT':('exploration_flashlight',(0,0,PI)),'PHOTO_CAMERA':('exploration_photo_camera',None)}
requested=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else list(BUILD)
items=[]
for item in requested:
 S.reset();M=mats();M['optical blue glass']=optical_material('Coated blue optics');M['violet filter']=optical_material('Violet optical filter','violet');M['reflector glass']=optical_material('Faceted reflector with central LED','reflector');stages=[];defaults=[];allobs=[]
 for t in (1,2,3):
  if t==1 and item in BASE:
   rec,obj=unchanged(item,t,*BASE[item]);stages.append(rec);defaults.append(obj);allobs.append(obj);continue
  parts,features=BUILD[item](t,'default');rec,obj=S.finish(item,t,parts,features=features);stages.append(rec);defaults.append(obj);allobs.append(obj)
  if item in ('DOTS_PROJECTOR','TRIPOD'):
   state='deployed' if item=='DOTS_PROJECTOR' else 'folded';parts,features=BUILD[item](t,state);vrec,vobj=S.finish(item,t,parts,state=state,features=features);rec['variants'][state]=vrec;allobs.append(vobj)
 S.render_family(item,defaults,view=(.5,-2.5,1.2));S.save_family(item,allobs)
 items.append(dict(id=item,label=OLD[item]['label'],stages=stages));print('FINISHED_FAMILY',item,flush=True)
# Merge reruns into this agent-owned fragment without changing another category.
frag=D/'rebuild-electronics.json'
if frag.exists():
 previous=json.loads(frag.read_text());merged={x['id']:x for x in previous['items']};merged.update({x['id']:x for x in items});items=list(merged.values());prior_sources={s['source']:s for s in previous.get('sources',[])};prior_sources.update(S.SOURCE_LOG);S.SOURCE_LOG.clear();S.SOURCE_LOG.update(prior_sources)
S.write_fragment('rebuild-electronics.json',items)
