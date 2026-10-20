"""Original CC0 scenery: no imported meshes, fonts, photographs or pack textures.
Blender Z-up -> glTF Y-up. Floor-centre origins; local front is glTF +Z.
"""
import bpy,sys,math,json,hashlib,random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'development/assets'))
import rebuild_support as s
LOG=[];TAU=math.tau

def init():
    s.reset()
    materials={k:s.material('Original '+k,c,kind) for k,c,kind in [
        ('oak',(.23,.14,.075),'wood'),('pine',(.38,.29,.16),'wood'),('iron',(.085,.095,.092),'metal'),
        ('rust',(.25,.12,.065),'metal'),('steel',(.37,.40,.39),'metal'),('brass',(.46,.34,.14),'metal'),
        ('enamel',(.62,.63,.55),'paint'),('red',(.30,.075,.045),'paint'),('blue',(.075,.18,.25),'paint'),
        ('paper',(.62,.55,.39),'paper'),('cloth',(.28,.24,.16),'cloth'),('leather',(.20,.10,.055),'leather'),
        ('black',(.018,.023,.022),'paint'),('ivory',(.69,.65,.51),'ceramic'),('green',(.09,.20,.12),'cloth')]}
    # Timber uses restrained proportional grain. Absolute RGB noise turns dark
    # oak into bright tiger stripes when the low-resolution texture is enlarged.
    for key,base in [('oak',(.23,.14,.075)),('pine',(.38,.29,.16))]:
        image=next(n.image for n in materials[key].node_tree.nodes if n.type=='TEX_IMAGE')
        rng=random.Random(key+'-grain');pixels=[]
        for y in range(64):
            for x in range(64):
                grain=.055*math.sin(x*.81+math.sin(y*.07)*.35)+.02*math.sin(x*2.6+y*.015)
                factor=1+grain+rng.uniform(-.025,.025)
                pixels.extend([c*factor for c in base]+[1])
        image.pixels.foreach_set(pixels);image.pack()
    return materials

def export(name,parts,library,view=(3,-4,3)):
    obj=s.join(parts,name);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    obj['license']='CC0-1.0';obj['provenance']='Original Beckenburg geometry and procedural diffuse textures; no third-party components'
    target=ROOT/f'assets/runtime/models/{name}.glb'
    bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_yup=True,export_extras=True)
    folder=ROOT/'development/levels/blender';folder.mkdir(exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(folder/(name+'.blend')),compress=True)
    lo=[min(v.co[i] for v in obj.data.vertices) for i in range(3)];hi=[max(v.co[i] for v in obj.data.vertices) for i in range(3)]
    obj.data.calc_loop_triangles()
    LOG.append(dict(id=name,library=library,license='CC0-1.0',license_url='https://creativecommons.org/publicdomain/zero/1.0/',
        sha256=hashlib.sha256(target.read_bytes()).hexdigest(),bytes=target.stat().st_size,triangles=len(obj.data.loop_triangles),
        bounds=[ [lo[0],lo[2],-hi[1]], [hi[0],hi[2],-lo[1]] ],source='original geometry and procedural textures',
        editable=f'development/levels/blender/{name}.blend'))
    if target.stat().st_size>4_000_000:raise ValueError('Runtime size budget exceeded: '+name)
    s.render_family(name,[obj],path=ROOT/f'development/levels/previews/{name}.png',view=view)
    print('ASSET',name,len(obj.data.loop_triangles),'triangles',flush=True)

def ring(name,center,radius,tube,mat,axis='Y',segments=16):
    x,y,z=center;parts=[]
    for i in range(segments):
        a=i*TAU/segments;b=(i+1)*TAU/segments
        p=(x+radius*math.cos(a),y,z+radius*math.sin(a)) if axis=='Y' else (x+radius*math.cos(a),y+radius*math.sin(a),z)
        q=(x+radius*math.cos(b),y,z+radius*math.sin(b)) if axis=='Y' else (x+radius*math.cos(b),y+radius*math.sin(b),z)
        parts.append(s.rod(name,p,q,tube,mat,6))
    return parts

def gauge(x,y,z,m,r=.13):
    p=[s.rod('Gauge brass bezel',(x,y,z),(x,y-.035,z),r,m['brass'],20),s.rod('Gauge ivory dial',(x,y-.037,z),(x,y-.04,z),r*.86,m['ivory'],20)]
    for i in range(9):
        a=(-.75+i*1.5/8)*math.pi
        p.append(s.rod('Dial graduation',(x+math.sin(a)*r*.65,y-.043,z+math.cos(a)*r*.65),(x+math.sin(a)*r*.77,y-.043,z+math.cos(a)*r*.77),.004,m['black'],4))
    p.append(s.rod('Actual gauge needle',(x,y-.047,z),(x+r*.49,y-.047,z+r*.31),.008,m['red'],5));return p

def valve(x,y,z,m,r=.13):
    p=ring('Handwheel',(x,y,z),r,.017,m['red'])
    p.append(s.rod('Valve stem',(x,y,z),(x,y+.16,z),.027,m['brass'],8))
    for i in range(4):
        a=i*TAU/4;p.append(s.rod('Wheel spoke',(x,y,z),(x+r*math.cos(a),y,z+r*math.sin(a)),.012,m['red'],6))
    return p

def boiler_coal():
    m=init();p=[s.box('Masonry foundation',(0,0,.15),(2.8,4.2,.30),m['rust'],.025)]
    p.append(s.rod('Riveted horizontal pressure vessel',(0,-1.7,1.32),(0,1.7,1.32),.91,m['iron'],24))
    for y in [-1.65,-.8,0,.8,1.65]:
        p+=ring('Wrought iron boiler band',(0,y,1.32),.925,.035,m['rust'],segments=24)
        for i in range(12):
            a=i*TAU/12;p.append(s.rod('Band rivet',(.941*math.cos(a),y-.027,1.32+.941*math.sin(a)),(.941*math.cos(a),y+.027,1.32+.941*math.sin(a)),.024,m['brass'],6))
    p.append(s.box('Refractory firebox',(0,-1.46,.62),(2.0,.88,.94),m['rust'],.04))
    for x in [-.5,.5]:
        p.append(s.box('Arched furnace door lower',(x,-1.93,.81),(.79,.08,.55),m['iron'],.035))
        p.append(s.rod('Arched furnace door crown',(x,-1.94,1.04),(x,-1.99,1.04),.395,m['iron'],16))
        for z in [.68,.79,.90]:p.append(s.box('Fire door vent slit',(x,-1.996,z),(.43,.008,.025),m['black']))
        p.append(s.rod('Door latch',(x+.24,-2.04,.83),(x+.24,-2.04,1.02),.022,m['brass'],8))
    p.append(s.box('Ash cleanout hatch',(0,-1.98,.37),(1.36,.06,.20),m['iron'],.015))
    p.append(s.lathe('Steam dome',[(1.95,.20),(2.05,.28),(2.40,.28),(2.47,.20)],m['iron'],16))
    p+=gauge(0,-.3,2.40,m);p+=valve(.33,0,2.30,m)
    p.append(s.rod('Back flue collar',(0,1.7,1.5),(0,1.98,1.5),.31,m['iron'],16))
    for x in [-1.13,1.13]:p.append(s.box('Cast support saddle',(x,.6,.48),(.24,1.7,.35),m['iron'],.025))
    export('level_boiler_coal',p,'industrial',view=(4,-6,3.6))

def boiler_oil():
    m=init();p=[s.box('Steel skid',(0,0,.1),(2.45,2,.2),m['iron'],.025)]
    for y in [-.7,-.42,-.14,.14,.42,.7]:
        p.append(s.box('Cast iron sectional block',(0,y,1.02),(1.95,.25,1.65),m['iron'],.15))
        p.append(s.rod('Curved section crown',(-.82,y,1.7),(.82,y,1.7),.22,m['iron'],12))
    for x in [-.99,.99]:p.append(s.box('Olive jacket side',(x,0,1.05),(.05,1.65,1.65),m['green'],.02))
    p.append(s.box('Service door front',(0,-.87,1.14),(1.85,.07,1.34),m['enamel'],.04))
    p.append(s.rod('Oil burner barrel',(0,-.88,.66),(0,-1.40,.66),.22,m['red'],16))
    p.append(s.rod('Burner fan motor',(.20,-1.20,.66),(.65,-1.20,.66),.18,m['iron'],12))
    p+=gauge(.48,-.94,1.55,m)
    p+=s.tube('Oil feed',[(.5,-1.2,.5),(.85,-1.2,.5),(.85,-.5,.5),(.85,-.5,.15)],.022,m['brass'],8)
    p.append(s.rod('Flue outlet',(0,.80,1.65),(0,1.05,1.65),.23,m['rust'],16))
    export('level_boiler_oil',p,'industrial')

def boiler_modern():
    m=init();p=[s.box('Raised service plinth',(0,0,.08),(1.1,1.05,.16),m['iron'],.025),
        s.box('Rounded enamel heat exchanger jacket',(0,0,1.04),(1.02,.94,1.84),m['enamel'],.075)]
    for x in [-.46,.46]:p.append(s.box('Seamed jacket edge',(x,-.477,1.03),(.018,.018,1.64),m['steel']))
    p.append(s.box('Recessed control panel',(0,-.482,1.52),(.69,.026,.36),m['iron'],.022))
    p.append(s.box('Control LCD',(-.10,-.498,1.56),(.36,.008,.12),m['green'],.008))
    for i in range(3):p.append(s.rod('Control button',(.19+i*.07,-.503,1.5),(.19+i*.07,-.52,1.5),.022,m['ivory'],8))
    for i in range(9):p.append(s.box('Lower ventilation slit',(0,-.485,.40+i*.04),(.65,.01,.012),m['iron']))
    for x,key in [(-.29,'red'),(.29,'blue')]:
        p+=s.tube('Heating connection',[(x,.20,1.96),(x,.20,2.3),(x,.49,2.3)],.047,m[key],10)
        p+=valve(x,.27,2.15,m,.09)
    p.append(s.rod('Concentric flue collar',(0,.17,1.95),(0,.17,2.08),.14,m['steel'],16))
    export('level_boiler_modern',p,'industrial')

def tank():
    m=init();p=[s.lathe('Expansion vessel rounded pressure shell',[(.25,.18),(.30,.32),(.43,.39),(1.68,.39),(1.85,.30),(1.91,.14)],m['red'],20)]
    for x in [-.23,.23]:p.append(s.box('Vessel leg',(x,0,.15),(.09,.3,.30),m['iron'],.015))
    p+=gauge(0,-.40,1.3,m,.1)
    p+=s.tube('Pressure connection',[(.25,0,.4),(.65,0,.4),(.65,0,.9)],.04,m['steel'],10)
    export('level_expansion_vessel',p,'industrial')

def pipework():
    m=init();p=[]
    def xyz(x,y,z):return (x,-z,y)
    def run(name,points,r,mat):p.extend(s.tube(name,[xyz(*v) for v in points],r,mat,10))
    # Coordinates relative to school service room X10/Z12, floor Y-3.
    # Centres match LevelDressing: three retired units at Z16.5,
    # two oil boilers at Z23, three modern boilers at Z32.5.
    for x in [4,9,14]:
        run('Retired coal smoke flue',[(x,1.5,2.52),(x,2.52,2.52),(x,2.52,.35)],.30,m['rust'])
        run('Isolated original steam branch',[(x,2.47,4.5),(x,2.65,4.5),(x,2.65,1.1)],.10,m['rust'])
    for x in [5.5,11]:run('Later oil smoke flue',[(x,1.65,9.95),(x,2.58,9.95),(x,2.58,.35)],.23,m['iron'])
    for x in [4,9,14,5.5,11]:
        p.append(s.box('Wall flue inspection plate',xyz(x,2.58,.13),(.9,.08,.72),m['iron'],.02))
    for offset,key in [(-.29,'red'),(.29,'blue')]:
        run('Active paired wall header',[(2+offset,.35,23),(2+offset,2.47,23),(2+offset,2.47,2)],.055,m[key])
        for x in [4,8.5,13]:
            run('Boiler heating circuit',[(x+offset,2.3,20.01),(x+offset,2.47,20.01),(2+offset,2.47,20.01)],.047,m[key])
        for z in [3,7,11,15,19]:
            p.append(s.box('Pipe wall support',xyz(2+offset,2.47,z),(.18,.22,.045),m['steel']))
            run('Bracket anchor',[(.10,2.47,z),(2+offset,2.47,z)],.012,m['iron'])
    for x in [4,8.5,13]:run('Modern flue to external riser',[(x,2.08,20.33),(x,2.78,20.33),(x,2.78,1)],.13,m['steel'])
    run('Expansion vessel circuit',[(3.35,.9,17.5),(3.35,2.47,17.5),(1.71,2.47,17.5)],.04,m['steel'])
    for z in [13,17]:
        run('Circulation pump motor',[(1.71,.68,z),(2.1,.68,z)],.14,m['green'])
        run('Pump casing',[(1.71,.55,z),(1.71,.81,z)],.16,m['iron'])
        run('Pump branch',[(1.71,.55,z),(1.71,.35,z),(1.71,.35,23)],.055,m['red'])
    run('Disconnected original steam header',[(4,2.65,1.1),(15,2.65,1.1)],.10,m['rust'])
    for x in [4,8,12,15]:
        p+=ring('Steam flange',xyz(x,2.65,1.1),.145,.025,m['iron'],axis='Z')
        run('Steam header hanger',[(x,2.65,1.1),(x,2.96,1.1)],.015,m['steel'])
    # Closed rectangular ventilation trunk and actual ceiling hangers.
    for z in range(2,24,2):
        p.append(s.box('Galvanized ventilation trunk',xyz(20,2.70,z),(.66,2,.32),m['steel'],.02))
        for dx in [-.39,.39]:run('Trunk ceiling hanger',[(20+dx,2.48,z),(20+dx,2.96,z)],.015,m['iron'])
        p.append(s.box('Duct hanger crossbar',xyz(20,2.48,z),(.88,.05,.04),m['iron']))
    run('Ventilation intake branch',[(20,2.70,3),(22.5,2.70,3),(22.5,2.2,3)],.18,m['steel'])
    export('level_school_pipework',p,'industrial',view=(18,-25,20))

def electrical():
    m=init();p=[]
    for x in [-.76,0,.76]:
        p.append(s.box('Wall service cabinet',(x,0,.8),(.70,.28,1.6),m['enamel'],.025))
        p.append(s.box('Recessed sealed service door',(x,-.15,.81),(.61,.035,1.46),m['steel'],.012))
        p.append(s.rod('Isolator rotary handle',(x,-.18,.85),(x,-.23,.85),.085,m['red'],12))
        p.append(s.box('Warning plate',(x,-.176,1.30),(.22,.008,.16),m['paper']))
        for z in [.3,.45,.60]:p.append(s.box('Switchgear ventilation',(x,-.178,z),(.42,.008,.015),m['iron']))
        p+=s.tube('Rigid conduit',[(x,.04,1.61),(x,.04,2),(x+.15,.04,2.10)],.022,m['steel'],8)
    export('level_electrical_bank',p,'industrial')

def book(x,y,z,m,angle=0,color='red',w=.20,d=.28,h=.035):
    p=[s.box('Original cloth-bound book',(x,y,z+h/2),(w,d,h),m[color],.004),s.box('Aged page block',(x+.003,y-.002,z+h/2),(w-.013,d-.012,h-.009),m['paper'])]
    return p

def mug(x,y,z,m,r=.055):
    p=[s.lathe('Hollow ceramic cup',[(z,r*.8),(z+.012,r),(z+.12,r),(z+.125,r-.009),(z+.02,r-.009)],m['ivory'],12,(x,y,0))]
    # Upright handle loop is attached to the cup at two points.
    p+=s.tube('Cup handle',[(x+r*.85,y,z+.105),(x+r*1.6,y,z+.105),(x+r*1.7,y,z+.035),(x+r*.85,y,z+.035)],.009,m['ivory'],6)
    return p

def jar(x,y,z,m,r=.065,h=.18):
    return [s.lathe('Preserve jar',[(z,r*.8),(z+.015,r),(z+h-.04,r),(z+h-.025,r*.72),(z+h,r*.72)],m['green'],12,(x,y,0)),
        s.lathe('Jar lid',[(z+h,r*.8),(z+h+.017,r*.8)],m['brass'],12,(x,y,0)),s.box('Jar paper label',(x,y-r-.002,z+h*.5),(r*1.4,.006,h*.4),m['paper'])]

def furniture(kind):
    m=init();p=[]
    if kind in ['shelf','pantry','curio']:
        w=1.28;d=.42;h=1.85
        for x in [-w/2,w/2]:p.append(s.box('Cabinet side',(x,0,h/2),(.055,d,h),m['oak'],.008))
        p.append(s.box('Cabinet back',(0,d/2-.018,h/2),(w,.035,h),m['pine']))
        for z in [.12,.56,1.0,1.44,1.84]:p.append(s.box('Supported timber shelf',(0,0,z),(w+.05,d+.03,.045),m['oak'],.008))
        for row,z in enumerate([.145,.585,1.025,1.465]):
            for col in range(5):
                x=-.48+col*.23
                if kind=='pantry':p+=jar(x,-.035,z,m,h=.19+col*.02)
                elif kind=='curio':
                    choice=(row*2+col)%5
                    if choice==0:p+=book(x,0,z,m,color='red',w=.16,d=.25)
                    elif choice==1:
                        p.append(s.box('Small inherited portrait frame',(x,.04,z+.12),(.17,.035,.24),m['brass'],.012))
                        p.append(s.box('Original faded portrait field',(x,.017,z+.12),(.135,.008,.20),m['paper']))
                    elif choice==2:p.append(s.lathe('Collected shallow ceramic bowl',[(z,.05),(z+.02,.07),(z+.08,.10),(z+.09,.10),(z+.085,.085),(z+.025,.04)],m['blue'],14,(x,0,0)))
                    elif choice==3:p.append(s.lathe('Old brass candlestick',[(z,.07),(z+.025,.07),(z+.045,.03),(z+.20,.02),(z+.23,.045),(z+.25,.045)],m['brass'],12,(x,0,0)))
                    else:p.append(s.lathe('Collected bulbous vase',[(z,.045),(z+.04,.08),(z+.14,.09),(z+.23,.03),(z+.27,.04)],m['ivory'],12,(x,0,0)))
                else:
                    for j in range(3):p+=book(x,-.015,z+j*.035,m,color=['red','blue','green'][(row+col+j)%3],w=.18,d=.28)
        if kind=='curio':
            for x in [-.65,.65]:p.append(s.box('Display door upright',(x,-.24,.99),(.04,.04,1.72),m['oak'],.006))
            p.append(s.box('Display hutch stepped cornice',(0,0,1.91),(1.45,.50,.10),m['oak'],.025))
    elif kind=='sideboard':
        p+=[s.box('Sideboard carcass',(0,0,.48),(1.42,.46,.61),m['oak'],.025),s.box('Overhanging sideboard top',(0,0,.82),(1.53,.53,.055),m['oak'],.012)]
        for x in [-.58,.58]:
            for y in [-.15,.15]:p.append(s.lathe('Turned timber foot',[(0,.04),(.04,.055),(.12,.035),(.20,.05)],m['oak'],10,(x,y,0)))
        for x in [-.47,0,.47]:
            p.append(s.box('Recessed drawer front',(x,-.24,.50),(.43,.035,.47),m['pine'],.012))
            p.append(s.rod('Drawer brass pull',(x-.06,-.28,.59),(x+.06,-.28,.59),.012,m['brass'],8))
        p+=book(-.42,0,.85,m);p+=book(-.42,0,.89,m,color='blue');p+=mug(.40,-.04,.85,m)
        for x in [.02,.20]:
            p.append(s.box('Inherited standing photograph frame',(x,.03,1.015),(.15,.035,.25),m['brass'],.006))
            p.append(s.box('Original faded abstract photograph',(x,.008,1.015),(.12,.009,.215),m['paper']))
    elif kind=='card_table':
        p=[s.box('Folding card table rim',(0,0,.73),(1.02,1.02,.055),m['oak'],.018),s.box('Inset green baize',(0,0,.76),(.93,.93,.008),m['green'])]
        for x in [-.35,.35]:
            p+=s.tube('Folding crossed legs',[(x,-.4,0),(x,.3,.69),(x,-.3,.69),(x,.4,0)],.025,m['steel'],8)
            p.append(s.rod('Folding hinge pin',(x-.03,0,.35),(x+.03,0,.35),.04,m['brass'],8))
        for i in range(6):
            x=-.22+i*.08;y=-.1+(i%2)*.09
            p.append(s.box('Playing card',(x,y,.768),(.065,.095,.003),m['paper']))
            p.append(s.rod('Card suit pip',(x,y,.77),(x,y,.773),.009,m['red'],4))
        p+=mug(.33,.27,.765,m)
    elif kind=='ottoman':
        p=[s.box('Rounded upholstered ottoman',(0,0,.27),(.84,.60,.36),m['leather'],.09),s.box('Piped tufted cushion',(0,0,.46),(.87,.63,.11),m['cloth'],.045)]
        for x in [-.3,.3]:
            for y in [-.19,.19]:p.append(s.lathe('Ottoman turned foot',[(0,.035),(.06,.045),(.12,.03)],m['oak'],10,(x,y,0)))
        for x in [-.22,0,.22]:p.append(s.lathe('Tuft button',[(.514,.012),(.52,.013)],m['leather'],8,(x,0,0)))
    elif kind=='trunk':
        p=[s.box('Old pine storage trunk',(0,0,.28),(.96,.57,.52),m['pine'],.035),s.box('Rounded trunk lid',(0,0,.57),(.98,.59,.10),m['oak'],.045)]
        for x in [-.33,.33]:p.append(s.box('Iron trunk binding',(x,0,.625),(.045,.59,.012),m['iron']))
        p.append(s.box('Trunk hasp',(0,-.302,.49),(.09,.025,.17),m['brass'],.008))
        for i in range(3):p.append(s.box('Folded inherited linen',(.17,.02,.65+i*.035),(.50-i*.03,.37,.033),m['cloth'],.018))
        p+=book(-.3,-.04,.63,m,w=.2,d=.26)
    elif kind=='desk_clutter':
        for i in range(4):p.append(s.box('Uneven correspondence pile',(-.12+i*.005,0,.004+i*.004),(.28,.22,.003),m['paper']))
        p+=book(.20,.05,0,m,w=.19,d=.25);p+=mug(-.25,.13,0,m)
        p.append(s.rod('Writing pencil',(-.19,-.15,.014),(.08,-.11,.014),.004,m['pine'],6))
    elif kind=='kitchenware':
        p=[s.box('Worn kitchen tray',(0,0,.025),(.65,.45,.05),m['pine'],.02)]
        for x in [-.19,.06,.23]:p+=mug(x,-.06,.05,m)
        p.append(s.lathe('Ceramic teapot body',[(.05,.08),(.07,.13),(.20,.14),(.25,.09)],m['ivory'],16,(0,.10,0)))
        p+=s.tube('Teapot spout',[(.1,.1,.13),(.2,.1,.17),(.23,.1,.26)],.035,m['ivory'],8)
    elif kind=='toy_basket':
        p=[s.lathe('Woven toy basket',[(0,.23),(.03,.31),(.35,.36),(.38,.34),(.35,.31),(.06,.28)],m['pine'],20)]
        for i in range(8):
            a=i*TAU/8;p.append(s.rod('Basket wicker upright',(.28*math.cos(a),.28*math.sin(a),.03),(.35*math.cos(a),.35*math.sin(a),.35),.012,m['oak'],6))
        for i in range(6):
            x=(i%3-1)*.14;y=(i//3-.5)*.16
            p.append(s.box('Old painted toy block',(x,y,.22+(i%2)*.13),(.13,.13,.13),m[['red','blue','green'][i%3]],.018))
        p.append(s.lathe('Toy ball',[(.32,.02),(.35,.09),(.42,.11),(.50,.08),(.52,.015)],m['red'],12,(.14,.02,0)))
    elif kind=='linen_press':
        p=[s.box('Linen cupboard carcass',(0,0,1.02),(1.1,.52,2.04),m['oak'],.025)]
        for x in [-.27,.27]:
            p.append(s.box('Framed press door',(x,-.28,1.03),(.51,.045,1.88),m['pine'],.025))
            p.append(s.box('Recessed press panel',(x,-.307,1.04),(.39,.018,1.64),m['oak'],.015))
            p.append(s.rod('Linen press handle',(x+(.18 if x<0 else -.18),-.34,.95),(x+(.18 if x<0 else -.18),-.34,1.10),.012,m['brass'],8))
    export('level_lived_'+kind,p,'household')

def workbench():
    m=init();p=[s.box('Scarred bench top',(0,0,.90),(1.8,.68,.09),m['pine'],.015),s.box('Lower storage shelf',(0,0,.18),(1.65,.57,.05),m['oak'])]
    for x in [-.76,.76]:
        for y in [-.25,.25]:p.append(s.box('Workbench steel leg',(x,y,.44),(.065,.065,.88),m['iron']))
    p.append(s.box('Cast bench vise',(-.60,-.24,1.03),(.31,.23,.19),m['blue'],.025))
    p.append(s.rod('Vise screw',(-.8,-.30,1.03),(-.35,-.30,1.03),.025,m['steel'],10))
    for x in [-.73,-.44]:p.append(s.box('Vise jaw',(x,-.24,1.16),(.04,.25,.12),m['steel'],.006))
    for x in [-.3,.1,.45]:p.append(s.lathe('Spare pipe coupling',[(.95,.065),(1.04,.065),(1.04,.04),(.95,.04)],m['rust'],10,(x,0,0)))
    p+=book(.35,.1,.95,m,w=.25,d=.30)
    for x in [-.45,.1,.55]:p.append(s.box('Spare parts box',(x,0,.32),(.37,.4,.26),m['paper'],.015))
    export('level_workbench',p,'industrial')

def radiator():
    m=init();p=[]
    for i in range(10):
        x=-.45+i*.1
        p+=s.tube('Cast radiator section',[(x,-.06,.12),(x,-.06,.76),(x,.06,.82),(x,.12,.76),(x,.12,.12),(x,-.06,.12)],.035,m['enamel'],8)
    for z in [.15,.70]:p.append(s.rod('Radiator nipple manifold',(-.52,.03,z),(.52,.03,z),.026,m['iron'],10))
    for x in [-.35,.35]:p.append(s.box('Radiator foot',(x,.02,.05),(.10,.24,.1),m['iron'],.015))
    p+=valve(.58,-.02,.72,m,.065)
    export('level_radiator',p,'industrial')

def closet():
    m=init();p=[]
    # Hollow 1.7 x 1.2m walk-in cupboard, front glTF +Z. Floor is the room deck.
    for x in [-.82,.82]:p.append(s.box('Cupboard side',(x,0,1.15),(.06,1.20,2.30),m['oak'],.01))
    p.append(s.box('Cupboard back',(0,.57,1.15),(1.64,.06,2.30),m['pine']))
    p.append(s.box('Cupboard top',(0,0,2.28),(1.70,1.20,.06),m['oak'],.012))
    p.append(s.box('Top transom',(0,-.58,2.15),(1.70,.06,.26),m['oak'],.01))
    # Partly open louvered leaves leave a .72m clear centre entrance.
    for side in [-1,1]:
        x=side*.62
        p.append(s.box('Louvered door outer stile',(x,-.61,1.05),(.38,.055,2.02),m['pine'],.015))
        for z in [.20+i*.10 for i in range(17)]:
            p.append(s.box('Actual door louver',(x,-.65,z),(.29,.04,.045),m['oak'],.004))
        p.append(s.rod('Cupboard door brass pull',(side*.45,-.69,.95),(side*.45,-.69,1.10),.012,m['brass'],8))
    p.append(s.rod('Clothes rail',(-.68,.27,1.91),(.68,.27,1.91),.022,m['steel'],10))
    for x in [-.60,.57]:
        p+=s.tube('Coat hanger',[(x,.27,1.9),(x-.13,.27,1.73),(x+.13,.27,1.73),(x,.27,1.9)],.012,m['oak'],6)
        p.append(s.box('Hanging old coat',(x,.25,1.28),(.28,.18,.84),m['cloth'],.06))
    export('level_hiding_cupboard',p,'hiding')

def coal_bunker():
    m=init();p=[]
    for x in [-1,1]:p.append(s.box('Coal bunker plank side',(x,0,.40),(.08,1.5,.8),m['pine'],.015))
    p.append(s.box('Coal bunker back',(0,.71,.4),(2,.08,.8),m['oak']))
    p.append(s.box('Coal bunker low front',(0,-.71,.14),(2,.08,.28),m['oak']))
    rng=random.Random(82)
    for i in range(65):
        x=rng.uniform(-.85,.85);y=rng.uniform(-.58,.58);z=.18+.31*(1-abs(x))+.12*rng.random()
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1,radius=rng.uniform(.09,.15),location=(x,y,z))
        o=bpy.context.object;o.name='Faceted coal lump';o.data.materials.append(m['black']);s.uv_project(o);p.append(o)
    p.append(s.rod('Ash shovel handle',(.82,-.3,.1),(.82,.25,1.28),.025,m['pine'],8))
    p.append(s.box('Ash shovel steel blade',(.82,-.30,.15),(.26,.055,.32),m['iron'],.035))
    export('level_coal_bunker',p,'industrial')

if __name__=='__main__':
    selected=set(sys.argv[sys.argv.index('--')+1:]) if '--' in sys.argv else set()
    tasks=[boiler_coal,boiler_oil,boiler_modern,tank,pipework,electrical,workbench,radiator,closet,coal_bunker]
    for task in tasks:
        if not selected or task.__name__ in selected:task()
    for kind in ['shelf','pantry','curio','sideboard','card_table','ottoman','trunk','desk_clutter','kitchenware','toy_basket','linen_press']:
        if not selected or kind in selected:furniture(kind)
    previous=ROOT/'development/levels/lived-assets.json'
    if selected and previous.exists():
        ids={r['id'] for r in LOG};LOG=[r for r in json.loads(previous.read_text())['assets'] if r['id'] not in ids]+LOG
    (ROOT/'development/levels/lived-assets.json').write_text(json.dumps(dict(license='CC0-1.0',assets=LOG),indent=2)+'\n')
