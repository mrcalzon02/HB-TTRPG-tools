"""Original measured farmhouse/school fittings; preserves original library image UV materials.

Blender Z-up exports glTF Y-up. Floor props retain floor-centre origins. Wall
props retain their back mounting plane (glTF Z=0), with their visible front +Z.
Original archives are read-only; outputs are selected game assets, not pack copies.
"""
import bpy, sys, math, json, hashlib, random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'development/assets'))
import rebuild_support as s
OUT=ROOT/'development/levels/blender'
PREV=ROOT/'development/levels/previews'
LOG=[]

def library(name,file):
    p=ROOT/'assets/runtime/level-textures'/file
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    im=bpy.data.images.load(str(p));im.pack()
    node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=im;node.interpolation='Closest'
    mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    mat['source_image']=str(p.relative_to(ROOT));mat['source_sha256']=hashlib.sha256(p.read_bytes()).hexdigest()
    return mat

def init():
    s.reset()
    return dict(wood=library('Original purchased oak trim','wall_1_1.png'),
        boards=library('Original weathered crate timber','wooden_crate_1_0.png'),
        metal=library('Original worn metal diffuse','floor_ceiling_3_0.png'),
        iron=s.material('Worn dark steel',(.12,.14,.13),'metal'),
        recess=s.material('Shadowed openings',(.035,.045,.04),'paint'))

def export(name,parts,mount='floor-centre Y0',view=(2.8,-4,2.6)):
    obj=s.join(parts,name);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    obj['mount_origin']=mount;obj['authorship']='Original Beckenburg site fitting; original purchased images retained where recorded'
    path=ROOT/'assets/runtime/models'/(name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_extras=True)
    OUT.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(name+'.blend')),compress=True)
    obj.data.calc_loop_triangles()
    lo=[min(v.co[i] for v in obj.data.vertices) for i in range(3)]
    hi=[max(v.co[i] for v in obj.data.vertices) for i in range(3)]
    sources=[dict(image=m['source_image'],sha256=m['source_sha256']) for m in obj.data.materials if m and 'source_image' in m]
    LOG.append(dict(id=name,triangles=len(obj.data.loop_triangles),bytes=path.stat().st_size,
        sha256=hashlib.sha256(path.read_bytes()).hexdigest(),mount=mount,
        bounds_blender_z_up=[lo,hi],bounds_gltf_y_up=[[lo[0],lo[2],-hi[1]],[hi[0],hi[2],-lo[1]]],
        texture_sources=sources,editable='development/levels/blender/'+name+'.blend'))
    s.render_family(name,[obj],path=PREV/(name+'.png'),view=view)

def hay():
    m=init();straw=s.material('Dry woven straw',(.40,.31,.14),'wood')
    fibre=s.material('Split straw fibres',(.54,.43,.22),'wood');twine=s.material('Bale binding sisal',(.24,.19,.10),'cloth')
    p=[s.box('Compressed rounded straw bale',(0,0,.325),(1.2,.75,.65),straw,.085)]
    rng=random.Random(27)
    # Actual faceted straw strands define the surface beyond the diffuse grain.
    for i in range(26):
        y=-.31+i*.62/25;z=.652-rng.random()*.014
        p.append(s.rod('Top straw strand',(-.51,y,z),(.51,y+rng.uniform(-.025,.025),z),.006,fibre,4))
    for i in range(18):
        z=.09+i*.47/17
        p.append(s.rod('Front straw strand',(-.52,-.374,z),(.52,-.374,z+rng.uniform(-.02,.02)),.006,fibre,4))
    for x in [-.35,.35]:
        points=[(x,-.30,.011),(x,.30,.011),(x,.379,.09),(x,.379,.56),
            (x,.30,.657),(x,-.30,.657),(x,-.379,.56),(x,-.379,.09),(x,-.30,.011)]
        p+=s.tube('Closed sisal binding',points,.009,twine,6)
        p.append(s.lathe('Sisal binding knot',[(.65,.02),(.675,.025),(.69,.012)],twine,8,(x,0,0)))
    export('level_hay_bale',p)

def stall():
    m=init();p=[]
    for x in [-1.34,1.34]:
        p.append(s.box('Square stall post',(x,0,.65),(.12,.16,1.3),m['boards'],.015))
        p.append(s.box('Post cap',(x,0,1.305),(.15,.19,.03),m['wood'],.008))
    for z in [.31,.70,1.09]:
        p.append(s.box('Horizontal stall rail',(0,-.012,z),(2.70,.10,.105),m['boards'],.012))
        for x in [-1.30,1.30]:p.append(s.rod('Rail bolt',(x,-.08,z),(x,-.063,z),.017,m['iron'],8))
    export('level_stall',p)

def leaf(name,base,angle,length,width,rise,mat):
    x,y,z=base;verts=[]
    for i in range(6):
        t=i/5;dist=length*t;zz=z+rise*math.sin(t*math.pi*.85)-.16*t*t
        w=max(.003,width*math.sin(math.pi*t)**.7)
        cx=x+math.cos(angle)*dist;cy=y+math.sin(angle)*dist
        verts.extend([(cx-math.sin(angle)*w,cy+math.cos(angle)*w,zz-.018),
            (cx,cy,zz+.015),(cx+math.sin(angle)*w,cy-math.cos(angle)*w,zz-.018)])
    count=len(verts);verts.extend([(xx,yy,zz-.006) for xx,yy,zz in verts]);faces=[]
    for i in range(5):
        for j in range(2):
            q=(i*3+j,(i+1)*3+j,(i+1)*3+j+1,i*3+j+1);faces.extend([q,tuple(v+count for v in reversed(q))])
    outline=[i*3 for i in range(6)]+[17]+[i*3+2 for i in range(4,-1,-1)]+[0]
    for a,b in zip(outline,outline[1:]):faces.append((a,b,b+count,a+count))
    return s.mesh(name,verts,faces,mat)

def corn():
    m=init();green=s.material('Faded corn leaves',(.20,.25,.09),'wood');stalk=s.material('Corn stalk ochre',(.30,.31,.11),'wood')
    tassel=s.material('Dry corn tassels',(.48,.38,.17),'wood');p=[]
    for idx,(x,y) in enumerate([(-.35,-.22),(.32,-.20),(0,.26)]):
        h=1.85+idx*.12;p.append(s.rod('Jointed corn stalk',(x,y,0),(x,y,h),.022,stalk,6,end_radius=.008))
        for j in range(6):
            a=j*2.35+idx*.6;p.append(leaf('Folded corn leaf',(x,y,.35+j*.23),a,.57-.025*j,.075,.22,green))
        for j in range(5):
            a=j*math.tau/5;p.append(s.rod('Corn tassel',(x,y,h-.12),(x+math.cos(a)*.12,y+math.sin(a)*.12,h+.15),.006,tassel,4))
    export('level_corn',p)

def chalk_text(body,location,size,mat):
    bpy.ops.object.text_add(location=location,rotation=(math.pi/2,0,0));obj=bpy.context.object
    obj.name='Chalk handwriting';obj.data.body=body;obj.data.size=size;obj.data.extrude=0
    obj.data.materials.append(mat);bpy.ops.object.convert(target='MESH');s.uv_project(obj);return obj

def blackboard():
    m=init();slate=s.material('Erased green classroom slate',(.055,.095,.075),'paint');chalk=s.material('White chalk',(.61,.63,.53),'paper')
    p=[s.box('Slate board',(0,-.037,.67),(2.4,.055,1.24),slate,.008)]
    for x in [-1.225,1.225]:p.append(s.box('Oak board side frame',(x,-.045,.67),(.065,.09,1.34),m['wood'],.009))
    for z in [.025,1.315]:p.append(s.box('Oak board frame',(0,-.045,z),(2.50,.09,.065),m['wood'],.009))
    p.append(s.box('Projecting chalk tray',(0,-.11,.045),(2.3,.22,.045),m['wood'],.008))
    p.append(s.rod('Resting chalk',(.75,-.13,.075),(.85,-.13,.075),.008,chalk,6))
    p.append(chalk_text('MATHEMATICS',(-1.08,-.069,1.06),.13,chalk))
    p.append(chalk_text('x + 3 = 7',(-1.02,-.069,.77),.18,chalk))
    p.append(chalk_text('x = 4',(-.96,-.069,.45),.18,chalk))
    export('level_blackboard',p,'lower-back mount; glTF Z0, front +Z',view=(2.5,-4,1.8))

def desk():
    m=init();p=[s.box('Rounded oak student desktop',(0,0,.722),(1.1,.65,.036),m['wood'],.025)]
    for x in [-.44,.44]:
        for y in [-.245,.245]:p.append(s.rod('Steel desk leg',(x,y,0),(x,y,.705),.023,m['iron'],8))
        p.append(s.rod('Desk side stretcher',(x,-.245,.24),(x,.245,.24),.018,m['iron'],8))
    p.append(s.box('Open book shelf',(0,.025,.585),(.88,.48,.025),m['boards'],.008))
    for x in [-.45,.45]:p.append(s.box('Shelf cheek',(x,.025,.635),(.025,.48,.12),m['boards'],.005))
    p.append(s.box('Shelf rear lip',(0,.255,.635),(.9,.025,.12),m['boards'],.005))
    export('level_student_desk',p)

def lockers():
    m=init();paint=s.material('Chipped institutional locker paint',(.18,.25,.24),'metal');p=[]
    p.append(s.box('Locker back sheet',(0,.232,.95),(2.4,.016,1.8),paint,.005))
    for x in [-1.2,-.6,0,.6,1.2]:p.append(s.box('Individual locker partition',(x,0,.95),(.026,.48,1.80),paint,.006))
    p.append(s.box('Locker floor plinth',(0,0,.025),(2.42,.48,.05),paint,.006))
    p.append(s.box('Locker top sheet',(0,0,1.85),(2.42,.48,.035),paint,.006))
    for i in range(4):
        x=-.9+i*.6
        p.append(s.box('Individual framed locker door',(x,-.249,.95),(.556,.026,1.73),paint,.012))
        p.append(s.box('Recessed door panel',(x,-.265,.95),(.45,.009,1.59),paint,.004))
        for z in [1.40,1.47,1.54,.36,.43,.50]:
            p.append(s.box('Vent opening',(x,-.272,z),(.28,.007,.025),m['recess'],.002))
            p.append(s.box('Bent ventilation louvre',(x,-.282,z+.016),(.30,.026,.012),paint,.002))
        p+=s.tube('Locker pull handle',[(x+.17,-.28,.88),(x+.17,-.32,.88),(x+.17,-.32,1.01),(x+.17,-.28,1.01)],.009,m['metal'],8)
        for z in [.25,1.62]:p.append(s.rod('Door hinge',(x-.24,-.277,z-.035),(x-.24,-.277,z+.035),.013,m['metal'],8))
    export('level_lockers',p)

def hoop():
    m=init();board=s.material('Aged backboard enamel',(.63,.62,.53),'ceramic');red=s.material('Oxidized hoop enamel',(.39,.17,.085),'metal');rope=s.material('Cotton basketball net',(.52,.51,.43),'cloth')
    p=[s.box('Wall bracket',(0,-.0175,0),(.20,.035,.45),m['metal'],.006),
        s.box('Basketball backboard',(0,-.11,0),(1.8,.055,1.05),board,.012)]
    for x in [-.29,.29]:p.append(s.box('Painted target side',(x,-.142,-.13),(.025,.005,.40),red))
    for z in [-.33,.07]:p.append(s.box('Painted target edge',(0,-.142,z),(.60,.005,.025),red))
    p+=s.tube('Rim support',[(0,-.12,-.35),(0,-.40,-.35),(0,-.64,-.35)],.025,red,8)
    ring=[(.23*math.cos(i*math.tau/24),-.64+.23*math.sin(i*math.tau/24),-.35) for i in range(25)]
    p+=s.tube('Closed steel basketball rim',ring,.017,red,8)
    for i in range(12):
        a=i*math.tau/12
        p+=s.tube('Hanging knotted net',[(.23*math.cos(a),-.64+.23*math.sin(a),-.36),(.18*math.cos(a+.16),-.64+.18*math.sin(a+.16),-.55),(.13*math.cos(a),-.64+.13*math.sin(a),-.77)],.0045,rope,4)
    for r,z in [(.18,-.55),(.13,-.77)]:p+=s.tube('Net cross ties',[(r*math.cos(i*math.tau/12),-.64+r*math.sin(i*math.tau/12),z) for i in range(13)],.0045,rope,4)
    export('level_basketball_hoop',p,'wall back Z0; board centre Y0, rim centre Y-.35',view=(2.5,-4,1.5))

hay();stall();corn();blackboard();desk();lockers();hoop()
(OUT.parent/'site-dressing-manifest.json').write_text(json.dumps(LOG,indent=2)+'\n',encoding='utf-8')
print('SITE_DRESSING_COMPLETE',len(LOG))
