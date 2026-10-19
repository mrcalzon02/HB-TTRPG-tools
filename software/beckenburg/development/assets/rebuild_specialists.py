"""Rebuild specialist equipment as function-shaped, pixel-textured PSX instruments.

Assets only. Blender coordinates are metres, Z up, forward -Y. No baked evidence.
Run with Blender --background --python-exit-code 1 --python this_file [-- ID ...].
"""
import bpy, hashlib, json, math, random, sys
from pathlib import Path
from mathutils import Vector
sys.path.insert(0,str(Path(__file__).resolve().parent))
import rebuild_support as S

PROJECT=Path(__file__).resolve().parents[2]
DEV=Path(__file__).resolve().parent/'equipment-catalog'
RUNTIME=PROJECT/'assets/runtime/models'
TAU=2*math.pi
IDS=['ANCHOR_TRIANGULATOR','RESONANCE_TUNER','BAROMETRIC_PROBE','SEISMIC_RECORDER',
     'SPECTRAL_PRISM','EMF_ARRAY','THERMAL_BEACON','RITUAL_ANCHOR_METER',
     'WARD_STABILITY_PROBE','OBJECT_IMPRINT_SCANNER','SPECTRAL_FREQUENCY_ANALYZER','LASER_GRID']
LABELS={i['id']:i['label'] for i in json.loads((DEV/'equipment-assets.json').read_text())['items']}

def xyz(v):return [round(float(x),6) for x in v]
def gltf(v):return xyz((v[0],v[2],-v[1]))

def pixel_material(name,base,kind='metal'):
    """A real raster surface: directional grain, chipped edges and sparse machining.

    Each face spans a tile rather than sampling a single flat atlas pixel.
    """
    im=bpy.data.images.new('specialist_'+name,width=128,height=128,alpha=True)
    rng=random.Random(name);pixels=[]
    for y in range(128):
        for x in range(128):
            n=rng.uniform(-.032,.032);edge=min(x,y,127-x,127-y)
            if kind=='metal':n+=.018*math.sin(y*.8)+(.045 if y%13==0 else 0)
            if kind=='enamel':
                n+=.012*math.sin(x*.3)*math.cos(y*.2)
                if edge<3 and rng.random()<.35:n+=.16
                if rng.random()<.007:n-=.15
            if kind=='rubber':n+=.028 if x%9<2 else -.006
            if kind=='cloth':n+=.025 if (x+y)%4<2 else -.025
            if kind=='brass':n+=.022*math.sin(y*.8)+(.08 if edge<2 else 0)
            if kind=='glass':n+=.018*math.sin((x+y)*.06)+(.055 if 26<x-y<33 else 0)
            if kind=='paper':n+=.012 if (x+y)%5==0 else 0
            pixels.extend([max(0,min(1,c+n)) for c in base]+[1])
    im.pixels=pixels;im.filepath_raw=str(DEV/'textures'/f'specialist_{name}.png');im.file_format='PNG';im.save();im.pack()
    mat=bpy.data.materials.new('Pixel '+name);mat.use_nodes=True
    shader=mat.node_tree.nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=.77 if kind!='glass' else .30
    shader.inputs['Metallic'].default_value=.30 if kind in ('metal','brass') else 0
    node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=im;node.interpolation='Closest'
    mat.node_tree.links.new(node.outputs['Color'],shader.inputs['Base Color'])
    if name=='glass':
        shader.inputs['Alpha'].default_value=.48
        mat.surface_render_method='DITHERED'
    return mat

def palette():
    return {n:pixel_material(n,c,k) for n,c,k in [
        ('enamel',(.19,.25,.23),'enamel'),('blue',(.18,.25,.30),'enamel'),
        ('rust',(.32,.21,.14),'enamel'),('aluminum',(.53,.56,.54),'metal'),
        ('steel',(.25,.28,.29),'metal'),('brass',(.52,.40,.20),'brass'),
        ('rubber',(.045,.055,.054),'rubber'),('leather',(.24,.16,.10),'cloth'),
        ('ceramic',(.67,.67,.55),'enamel'),('glass',(.075,.17,.17),'glass'),
        ('screen',(.055,.095,.085),'glass'),('paper',(.69,.68,.55),'paper'),
        ('red',(.35,.10,.07),'enamel'),('copper',(.45,.26,.14),'brass')]}

class Instrument:
    def __init__(self,id,tier,state,materials):
        self.id=id;self.tier=tier;self.l=tier-1;self.state=state;self.mats=materials
        self.parts=[];self.screens=[];self.sockets={};self.features=[];self.sources=[]
    def mesh(self,name,vertices,faces,mat='steel',uv=None):
        data=bpy.data.meshes.new(name);data.from_pydata(vertices,[],faces);data.update()
        ob=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(ob)
        data.materials.append(self.mats[mat]);layer=data.uv_layers.new(name='UVMap')
        for p in data.polygons:
            verts=[data.vertices[i].co for i in p.vertices]
            normal=p.normal;drop=max(range(3),key=lambda i:abs(normal[i]));axes=[i for i in range(3) if i!=drop]
            lo=[min(v[a] for v in verts) for a in axes];hi=[max(v[a] for v in verts) for a in axes]
            for loop,v in zip(p.loop_indices,verts):
                layer.data[loop].uv=tuple(.02+.96*(v[a]-lo[j])/max(1e-8,hi[j]-lo[j]) for j,a in enumerate(axes))
        vg=ob.vertex_groups.new(name=name);vg.add(list(range(len(vertices))),1,'REPLACE')
        self.parts.append(ob);return ob
    def box(self,name,c,s,mat='enamel',bevel=0):
        x,y,z=c;w,d,h=[v/2 for v in s]
        v=[(x+a*w,y+b*d,z+e*h) for a,b,e in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
        o=self.mesh(name,v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],mat)
        if bevel:
            bpy.context.view_layer.objects.active=o;o.select_set(True)
            mod=o.modifiers.new('machined corner chamfers','BEVEL');mod.width=bevel;mod.segments=1
            bpy.ops.object.modifier_apply(modifier=mod.name);o.select_set(False)
            # Reassign planar UVs after the chamfer generated its new edge strips.
            layer=o.data.uv_layers.active
            for p in o.data.polygons:
                for j,loop in enumerate(p.loop_indices):layer.data[loop].uv=((.02,.02),(.98,.02),(.98,.98),(.02,.98))[j%4]
        return o
    def rod(self,name,a,b,r,mat='steel',n=10,r2=None):
        a,b=Vector(a),Vector(b);d=(b-a).normalized();ref=Vector((0,0,1)) if abs(d.z)<.9 else Vector((1,0,0))
        u=d.cross(ref).normalized();v=d.cross(u);verts=[]
        for center,radius in [(a,r),(b,r if r2 is None else r2)]:
            for i in range(n):verts.append(tuple(center+radius*(math.cos(TAU*i/n)*u+math.sin(TAU*i/n)*v)))
        faces=[tuple(range(n-1,-1,-1)),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
        return self.mesh(name,verts,faces,mat)
    def tube(self,name,points,r,mat='steel',sides=6):
        points=[Vector(p) for p in points];verts=[]
        for j,p in enumerate(points):
            d=(points[min(j+1,len(points)-1)]-points[max(0,j-1)]).normalized()
            ref=Vector((0,1,0)) if abs(d.y)<.9 else Vector((1,0,0));u=d.cross(ref).normalized();v=d.cross(u)
            for i in range(sides):verts.append(tuple(p+r*(math.cos(TAU*i/sides)*u+math.sin(TAU*i/sides)*v)))
        faces=[tuple(range(sides-1,-1,-1)),tuple((len(points)-1)*sides+i for i in range(sides))]
        for j in range(len(points)-1):
            for i in range(sides):faces.append((j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i))
        return self.mesh(name,verts,faces,mat)
    def ring(self,name,c,r,t=.004,mat='steel',plane='xz',segments=16):
        x,y,z=c;pts=[]
        for i in range(segments+1):
            a=TAU*i/segments
            pts.append((x+r*math.cos(a),y if plane=='xz' else y+r*math.sin(a),z+r*math.sin(a) if plane=='xz' else z))
        return self.tube(name,pts,t,mat,6)
    def screw(self,c,axis='y'):
        x,y,z=c;end=(x,y-.001,z) if axis=='y' else (x,y,z+.001)
        a=(x,y+.002,z) if axis=='y' else (x,y,z-.002)
        self.rod('slotted fastener',a,end,.0022,'aluminum',6)
        self.box('screwdriver slot',(x,y-.0012,z),(.0026,.0003,.00055),'rubber') if axis=='y' else None
    def screen(self,c,size,purpose='runtime measurement overlay'):
        x,y,z=c;w,h=size
        self.box('recessed display gasket',(x,y+.003,z),(w+.012,.009,h+.012),'rubber',.002)
        v=[(x-w/2,y-.002,z-h/2),(x+w/2,y-.002,z-h/2),(x+w/2,y-.002,z+h/2),(x-w/2,y-.002,z+h/2)]
        self.mesh('neutral replaceable display',v,[(0,1,2,3)],'screen')
        self.screens.append(dict(name='neutral replaceable display',corners_blender_z_up=[xyz(p) for p in v],corners_gltf_y_up=[gltf(p) for p in v],purpose=purpose+'; no readings baked'))
    def gauge(self,c,r=.025):
        x,y,z=c
        self.rod('metal gauge rim',(x,y+.006,z),(x,y-.004,z),r,'brass',16)
        self.rod('plain dial face',(x,y-.0041,z),(x,y-.005,z),r*.85,'paper',16)
        for i in range(13):
            a=math.pi*.22+i*math.pi*1.56/12
            p=(x+math.sin(a)*r*.64,y-.0055,z+math.cos(a)*r*.64)
            q=(x+math.sin(a)*r*.77,y-.0055,z+math.cos(a)*r*.77)
            self.rod('engraved scale tick',p,q,.00055,'rubber',4)
        self.sockets['dial_needle_pivot']=gltf((x,y-.006,z))
    def knob(self,c,r=.008,mat='rubber'):
        x,y,z=c
        self.rod('rotary control mounting spindle',(x,y+.010,z),(x,y-.002,z),r*.4,'steel',8)
        self.rod('knurled rotary control',(x,y+.002,z),(x,y-.009,z),r,mat,12)
        self.box('rotary index',(x,y-.0095,z+r*.5),(.0012,.0006,r*.48),'ceramic')
    def vent(self,c,count=5,width=.026):
        x,y,z=c
        for i in range(count):self.box('recessed ventilation slot',(x,y,z+(i-(count-1)/2)*.004),(width,.001,.0016),'rubber',.0005)
    def feet(self,w,d,z=.008):
        for x in (-w/2,w/2):
            for y in (-d/2,d/2):self.rod('isolating rubber foot',(x,y,0),(x,y,z),.009,'rubber',8)
    def cable(self,name,a,b,r=.0018,slack=.025,mat='rubber'):
        pts=[]
        for i in range(13):
            t=i/12;p=Vector(a).lerp(Vector(b),t);p.y+=math.sin(math.pi*t)*slack;p.z-=math.sin(math.pi*t)*slack*.35;pts.append(tuple(p))
        return self.tube(name,pts,r,mat,6)
    def source(self,name,c,maxdim,rotation=(0,0,0)):
        before=set(bpy.context.scene.objects);path=RUNTIME/(name+'.glb')
        bpy.ops.import_scene.gltf(filepath=str(path));imported=[o for o in bpy.context.scene.objects if o not in before]
        meshes=[o for o in imported if o.type=='MESH'];verts=[o.matrix_world@v.co for o in meshes for v in o.data.vertices]
        lo=Vector([min(v[i] for v in verts) for i in range(3)]);hi=Vector([max(v[i] for v in verts) for i in range(3)]);mid=(lo+hi)/2;scale=maxdim/max(hi-lo)
        from mathutils import Euler
        rot=Euler(rotation).to_matrix()
        for ob in meshes:
            transform=ob.matrix_world.copy()
            for v in ob.data.vertices:v.co=rot@((transform@v.co-mid)*scale)+Vector(c)
            ob.parent=None;ob.matrix_world.identity();ob.name='Archive source '+name
            self.parts.append(ob)
        for ob in imported:
            if ob.type!='MESH':bpy.data.objects.remove(ob,do_unlink=True)
        self.sources.append(dict(model=name,sha256=hashlib.sha256(path.read_bytes()).hexdigest(),transform='uniform scale, rigid rotation; original UVs and material slots preserved'))

def triangulator(m):
    l=m.l;r=.047+.007*l;z=.085+.008*l
    # A survey compass body: azimuth ring, central compass well, and folding sights.
    m.rod('azimuth chassis',(0,.012,z),(0,-.018,z),r,'enamel',16)
    m.gauge((0,-.022,z),r*.84)
    m.ring('protective compass rim',(0,-.026,z),r*.98,.003,'aluminum')
    m.rod('palm handle',(0,.006,.012),(0,.006,z-r*.65),.017,'rubber',8,r2=.020)
    for sign in (-1,1):
        x=sign*(r+.002)
        m.box('folding sight hinge',(x,0,z),(.013,.025,.018),'steel',.003)
        m.rod('survey sight blade',(x,-.002,z),(x,-.002,z+.040+.012*l),.003,'aluminum',6)
        m.ring('bearing aperture',(x,-.002,z+.047+.012*l),.009,.002,'brass')
    m.knob((r*.65,-.030,z-r*.77),.005,'brass')
    if l:
        # A hinged map/readout wing, not a giant triangular evidence marker.
        m.box('bearing wing connecting hinge',(r+.011,.003,z-.014),(.036,.024,.026),'steel',.003)
        m.box('hinged bearing display',(r+.050,.006,z-.014),(.076,.024,.077),'blue',.010)
        m.screen((r+.050,-.010,z-.006),(.056,.048),'bearing/map overlay')
        m.rod('second bearing aerial',(-r*.7,.014,z+r*.6),(-r*.7,.014,z+r+.045),.0025,'steel',6)
    if l==2:
        m.box('time history logger',(r+.050,.005,z-.061),(.073,.028,.021),'rubber',.006)
        m.rod('receiver mast',(r*.7,.010,z+r*.6),(r*.7,.010,z+r+.060),.0025,'steel',6)
        m.knob((r+.078,-.013,z-.038),.006)
    m.sockets.update(bearing_origin=gltf((0,-.025,z)),hand_grip=gltf((0,.006,.030)))
    m.features=['Survey compass and sight apertures shaped for physical bearing collection','Tier progression adds bearing display and receiver precision; no exact location/evidence artwork','Neutral dial with runtime needle socket']

def resonance(m):
    l=m.l;r=.026+.002*l;bottom=.120;top=.272+.006*l
    # One real U-shaped tuned fork. The yoke is a continuous curved sweep.
    points=[(-r,0,top),(-r,0,bottom)]
    points.extend([(r*math.cos(math.pi+i*math.pi/12),0,bottom+r*math.sin(math.pi+i*math.pi/12)) for i in range(1,13)])
    points.append((r,0,top))
    m.tube('single curved tuning fork and U yoke',points,.0048 if l<2 else .0055,'aluminum',4)
    m.rod('machined tuning stem',(0,0,.068),(0,0,bottom-r+.002),.006,'steel',8)
    m.rod('tapered insulated grip',(0,0,.014),(0,0,.080),.015,'leather',10,r2=.012)
    m.ring('piezo pickup collar',(0,0,.088),.010,.004,'copper',plane='xy',segments=12)
    # Small readout grows within the grip/heel, keeping the instrument strikeable.
    m.box('pickup readout heel',(0,-.004,.053),(.047+.010*l,.028,.067),'blue',.010)
    if l==0:m.gauge((0,-.022,.057),.017)
    else:m.screen((0,-.023,.058),(.038+.008*l,.035+.004*l),'frequency/pulse' if l==1 else 'spectral waterfall and fine tuning')
    m.knob((.020+.004*l,-.024,.029),.005,'brass')
    # Fully attached dock: a backplate overlaps the heel and holds a bottom sleeve
    # and closed retention bands. There are no floating mallet or clip parts.
    edge=(.047+.010*l)/2;mx=edge+.014
    m.box('striker dock attached backplate',(edge+.005,.009,.056),(.018,.020,.078),'steel',.003)
    m.rod('striker storage bottom cup',(mx,.002,.016),(mx,.002,.029),.007,'rubber',10)
    m.rod('removable docked striker shaft',(mx,.002,.023),(mx,.002,.134),.003,'leather',8)
    m.rod('soft striker head',(mx-.012,.002,.137),(mx+.012,.002,.137),.008,'rubber',8)
    for z in (.041,.078):
        m.ring('closed striker retention band',(mx,.002,z),.005,.002,'steel',plane='xy',segments=10)
        m.box('retention band saddle',(edge+.006,.007,z),(.018,.016,.007),'steel',.002)
    if l:
        m.box('sliding fine tune poise',(r,0,top-.037),(.017,.017,.018),'brass',.003)
        m.rod('poise clamp screw',(r+.007,0,top-.037),(r+.017,0,top-.037),.0035,'steel',8)
    if l==2:
        m.cable('shielded pickup lead',(.010,.008,.088),(.032,.009,.041),.0015,.018)
        m.box('calibration lock screw',(-r,0,top-.018),(.012,.014,.008),'brass',.002)
    m.sockets.update(strike_surface=gltf((r,0,top-.065)),pickup=gltf((0,0,.088)),hand_grip=gltf((0,0,.040)))
    m.features=['Single U fork with 0.18–0.19m tuned assembly; total carried height below 0.28m','Striker physically docked in heel-attached backplate, bottom cup and closed retention bands','Precision progresses through pickup/readout and a tuning poise, never a bundle of forks','No baked response or frequency values']

def barometer(m):
    l=m.l;r=.038+.004*l;z=.095
    m.rod('pressure instrument drum',(0,.024,z),(0,-.022,z),r,'blue',16)
    m.rod('shock protected handle',(0,.005,.012),(0,.005,z-r*.7),.016,'rubber',10)
    if l==0:m.gauge((0,-.027,z),r*.85)
    else:
        m.box('transducer readout housing',(0,-.007,z),(.082+.014*l,.043,.071+.009*l),'blue',.012)
        m.screen((0,-.032,z+.007),(.063+.010*l,.043+.009*l),'pressure differential and baseline trend')
        m.knob((.028+.005*l,-.035,z-.027),.006)
    # Clearly separate paired differential ports and real flexible capillary tubes.
    for sign in (-1,1):
        x=sign*(r+.012)
        m.rod('pressure hose barb',(sign*r*.7,.008,z+r*.7),(x,.008,z+r+.015),.004,'brass',8)
        m.cable('paired pressure line',(x,.008,z+r+.014),(x+.012*sign,.035,.036),.002,.028)
    m.ring('lanyard loop',(0,.015,.009),.009,.002,'steel')
    if l==2:
        # Exterior/HVAC comparison capsule is physically separate from the instrument.
        x=.092
        m.rod('paired baseline capsule',(x,0,.017),(x,0,.098),.018,'ceramic',12,r2=.014)
        for z2 in (.060,.068,.076,.084):m.ring('air inlet guard',(x,0,z2),.020,.002,'aluminum',plane='xy',segments=12)
        m.box('baseline mounting shoe',(x,.010,.012),(.044,.035,.016),'rubber',.005)
        m.rod('baseline antenna',(x,0,.095),(x,0,.138),.0015,'steel',6)
    m.sockets.update(pressure_inlet=gltf((-r-.012,.008,z+r+.015)),reference_inlet=gltf((r+.012,.008,z+r+.015)))
    m.features=['Pressure differential instrument with two hose barbs and paired capillary lines','Analog diaphragm drum progresses to transducer trace; paired ventilated baseline station at Tier III','No pressure readings or anomaly traces baked']

def seismic(m):
    l=m.l;r=.045+.010*l
    m.rod('floor coupling disk',(0,0,.009),(0,0,.025),r,'steel',16)
    m.rod('protected geophone canister',(0,0,.025),(0,0,.071+.008*l),r*.76,'enamel',12,r2=r*.66)
    m.ring('service seal',(0,0,.032),r*.77,.003,'rubber',plane='xy',segments=12)
    for i in range(3):
        a=TAU*i/3;x=math.cos(a)*r*.94;y=math.sin(a)*r*.94
        m.rod('leveling and contact screw',(x,y,.004),(x,y,.039),.004,'brass',8)
        m.rod('floor coupling contact',(x,y,.001),(x,y,.010),.008,'steel',8,r2=.004)
    m.box('sloped logger face',(0,-r*.55,.055),(.055+.012*l,.025,.049),'blue',.008)
    if l==0:m.gauge((0,-r*.55-.016,.058),.019)
    else:m.screen((0,-r*.55-.016,.060),(.046+.010*l,.027),'vibration channels/source direction')
    m.knob((r*.58,-r*.5,.035),.006)
    if l:
        m.ring('gimbal axis witness',(0,0,.074+.008*l),r*.35,.0025,'brass',plane='xy',segments=12)
        m.rod('second-axis pickup',(-r*.34,0,.081),(r*.34,0,.081),.006,'aluminum',8)
    if l==2:
        for i in range(3):
            a=TAU*i/3+.3;x=math.cos(a)*.105;y=math.sin(a)*.105
            m.cable('three axis sensor lead',(0,0,.036),(x,y,.018),.002,.008)
            m.rod('auxiliary floor contact pod',(x,y,.005),(x,y,.024),.018,'blue',10,r2=.014)
            m.rod('contact spike',(x,y,0),(x,y,.010),.004,'steel',6,r2=.001)
    m.sockets['floor_contact']=gltf((0,0,0))
    m.features=['Squat floor-coupled geophone with three leveling contacts and mechanical service seal','Additional axes use real contact pickups and leads','Neutral logger face; no baked impacts or traversal evidence']

def prism(m):
    l=m.l;w=.065+.042*l;h=.065+.023*l;z=.135
    if l==0:
        m.ring('rotatable polarizer mount',(0,0,z),.041,.006,'steel',segments=20)
        m.rod('polarized optical pane',(0,.001,z),(0,-.002,z),.035,'glass',20)
        m.ring('polarizer adjustment rim',(0,-.006,z),.043,.0025,'brass',segments=20)
    else:
        # Wide viewing pane, deliberately open and lens-like, not an opaque monitor.
        for x in (-w/2,w/2):m.rod('viewing frame side',(x,0,z-h/2),(x,0,z+h/2),.006,'steel',8)
        for z2 in (z-h/2,z+h/2):m.rod('viewing frame rail',(-w/2,0,z2),(w/2,0,z2),.006,'steel',8)
        m.box('polarized viewing pane',(0,0,z),(w-.008,.004,h-.008),'glass',.002)
        for x in (-w/2,w/2):m.knob((x,-.006,z),.009,'brass')
        if l==2:
            m.box('edge recording module',(w/2+.018,.003,z),(.031,.028,h*.70),'blue',.006)
            m.screen((w/2+.018,-.014,z),(.018,h*.40),'recording status overlay')
            m.box('record switch',(w/2+.018,-.015,z-h*.29),(.010,.004,.006),'red',.002)
    for x in ((0,) if l<2 else (-w*.34,w*.34)):
        m.rod('optical inspection grip',(x,0,.015),(x,0,z-h/2-.002),.013,'leather',10,r2=.010)
    m.sockets['optical_center']=gltf((0,0,z))
    m.features=['Physical polarizer/filter glass with adjustable metal mount and inspection grip','Wider pane progresses to edge recorder without any ghost silhouette artwork','Runtime optical overlay remains separate']

def sensor_pod(m,thermal=False,center=(0,0,0),mounted=True,index=0):
    x,y,z=center;l=m.l
    if thermal:
        # Small ventilated remote logger and an exposed shielded thermistor tip.
        m.rod('thermal logger lower capsule',(x,y,z+.017),(x,y,z+.052),.017,'ceramic',10,r2=.015)
        for j in range(4+l):
            zz=z+.053+j*.006
            m.rod('vented radiation shield louver',(x,y,zz),(x,y,zz+.0027),.020,'ceramic',10,r2=.017)
        m.rod('thermistor probe',(x,y,z+.054),(x,y,z+.091+.006*l),.0023,'steel',6)
        m.rod('thermistor tip',(x,y,z+.089+.006*l),(x,y,z+.095+.006*l),.003,'rubber',6)
        m.box('pairing pad',(x,y-.016,z+.033),(.012,.003,.008),'blue',.001)
        m.rod('remote thermal antenna',(x+.010,y,z+.027),(x+.010,y,z+.075+.012*l),.0012,'steel',6)
    else:
        m.box('EMF induction pod',(x,y,z+.045),(.043,.031,.069),'enamel',.009)
        m.box('shielded sensor head',(x,y,z+.079),(.048,.034,.017),'rubber',.005)
        m.ring('pickup induction loop',(x,y,z+.097),.019,.0032,'copper',segments=12)
        m.box('node sync status window',(x,y-.0155,z+.049),(.020,.003,.007),'glass',.002)
        m.rod('synchronization antenna',(x+.017,y+.006,z+.078),(x+.017,y+.006,z+.138+.006*l),.0014,'steel',6)
        if l:
            m.box('clock synchronization recess',(x,y-.0155,z+.029),(.021,.003,.009),'rubber',.002)
    m.box('magnetic mounting shoe',(x,y,z+.009),(.055,.039,.014),'rubber',.004)
    if mounted:
        m.box('wall or floor angle bracket',(x,y+.020,z+.034),(.044,.008,.052),'steel',.003)
        for sx in (-.014,.014):m.screw((x+sx,y+.0158,z+.051))
    else:
        m.box('folded mounting clip',(x,y+.019,z+.034),(.038,.006,.045),'steel',.002)
    m.sockets[f'node_{index}_mount']=gltf((x,y,z+.006))

def array(m,thermal=False):
    node=m.state in ('node','deployed')
    if node:sensor_pod(m,thermal,mounted=True)
    else:
        count=([2,4,6] if thermal else [2,3,5])[m.l]
        # Open docking comb: all objects are actual sensor pods, with no suitcase.
        cols=min(count,3);rows=(count+cols-1)//cols;spacing=.066
        for i in range(count):
            x=(i%cols-(cols-1)/2)*spacing;y=(i//cols-(rows-1)/2)*.055
            sensor_pod(m,thermal,(x,y,0),mounted=False,index=i)
        m.box('compact open charging rail',(0,0,.006),(cols*spacing-.007,rows*.055-.008,.012),'blue',.004)
        ry=(rows*.055-.008)/2-.004
        m.tube('attached open rack carrying bail',[(-.026,ry,.009),(-.026,ry,.042),(.026,ry,.042),(.026,ry,.009)],.004,'rubber',6)
    m.features=[('Vented compact remote temperature logger pods with shielded thermistor and magnet bracket' if thermal else 'Compact synchronized remote EMF induction nodes with coils, aerial and magnet bracket'),
        'Actual node count follows tier progression; compact open docking rail replaces old suitcase of handhelds',
        'Separate single mounted node/deployed form; no temperature values or EMF events baked']

def ritual(m,ward=False):
    l=m.l;headz=.175+.012*l;radius=.028+.006*l
    m.rod('insulated sensing handle',(0,0,.012),(0,0,.095),.017,'leather' if not ward else 'rubber',10,r2=.014)
    m.ring('handle stop',(0,0,.094),.021,.003,'brass',plane='xy',segments=12)
    m.box('field sampler shoulder',(0,.001,.118),(.062+.008*l,.034,.056),'rust' if ward else 'enamel',.010)
    if l==0:m.gauge((0,-.021,.121),.022)
    else:m.screen((0,-.022,.122),(.048+.008*l,.034),'ward stability/timeline' if ward else 'ritual affinity/load trend')
    m.knob((.025+.004*l,-.023,.099),.005,'brass')
    if ward:
        # Contact pair with replaceable ceramic isolation, unlike anchor's loop.
        for sign in (-1,1):
            x=sign*(.018+.003*l)
            m.rod('ward probe stem',(x,0,.144),(x,0,headz+.022),.005,'ceramic',8,r2=.0035)
            m.rod('replaceable contact tip',(x,0,headz+.022),(x,0,headz+.052),.0035,'brass',8,r2=.0015)
        m.box('guarded contact crosspiece',(0,.002,headz-.002),(.069+.008*l,.019,.012),'steel',.003)
        if l==2:m.ring('interference compensation loop',(0,.005,headz),.030,.002,'copper',segments=12)
    else:
        m.ring('ritual sensing open loop',(0,0,headz+.018),radius,.005,'steel',segments=16)
        for side in (-1,1):
            for i in range(5+l):
                a=(.24+i*.075)*math.pi*side
                x=radius*math.cos(a);z=headz+.018+radius*math.sin(a)
                radial=Vector((math.cos(a),0,math.sin(a)));center=Vector((x,0,z))
                points=[tuple(center+radial*(.0065*math.cos(TAU*j/8))+Vector((0,.0065*math.sin(TAU*j/8),0))) for j in range(9)]
                m.tube('closed copper pickup winding',points,.0016,'copper',5)
        m.rod('loop support neck',(0,0,.143),(0,0,headz-radius+.018),.007,'brass',8)
        if l==2:
            m.rod('fine tuning clamp attachment',(radius-.001,.005,headz+.018),(radius+.013,.005,headz+.018),.003,'steel',8)
            m.knob((radius+.013,-.005,headz+.018),.007,'brass')
    m.sockets.update(sampling_origin=gltf((0,0,headz+.040)),hand_grip=gltf((0,0,.048)))
    m.features=[('Paired replaceable ward contact tips with insulated stems and guarded spacing' if ward else 'Open induction head with actual copper winding and insulated sensing stem'),
        'Dedicated ritual instrument silhouette and neutral replaceable readout','No species reveal, sigil, ritual success or warning baked into the asset']

def imprint(m):
    l=m.l
    if l<2:
        w,d=(.15,.12) if l==0 else (.29,.22)
        m.box('object sampling contact plate',(0,0,.016),(w,d,.026),'steel',.009)
        m.box('nonmarking sampling mat',(0,-.005,.031),(w-.016,d-.024,.005),'rubber',.004)
        # Rail and non-evidence registration marks show where an object rests.
        for x in (-w/2+.010,w/2-.010):m.rod('sampling plate edge rail',(x,-d*.40,.034),(x,d*.40,.034),.0025,'brass',6)
        m.box('contact controller',(0,d/2+.016,.033),(w*.75,.040,.042),'blue',.006)
        m.screen((0,d/2-.006,.037),(w*.45,.024),'residual imprint sample/status')
        m.rod('sampling wand grip',(w/2+.023,-d*.35,.018),(w/2+.023,d*.18,.018),.009,'leather',8)
        m.rod('wand contact tip',(w/2+.023,-d*.35,.018),(w/2+.023,-d*.49,.018),.004,'ceramic',8)
        m.box('wand dock attached side shelf',(w/2+.008,-d*.08,.009),(.026,d*.72,.012),'steel',.003)
        for wy in (-d*.25,d*.08):m.ring('wand storage retention ring',(w/2+.023,wy,.018),.0095,.0015,'steel',segments=10)
        m.cable('wand shielded sampling cable',(w/2+.023,d*.18,.018),(w*.27,d/2+.018,.040),.0018,.030)
        m.feet(w*.76,d*.72)
    else:
        w=.40;d=.29
        m.box('table scanner base',(0,0,.021),(w,d,.036),'blue',.012)
        m.box('neutral object bed',(0,-.006,.042),(w-.028,d-.036,.008),'rubber',.005)
        # Gantry has usable object clearance: .31 m wide by .18 m tall.
        for x in (-.177,.177):
            m.box('scanner gantry column',(x,.025,.151),(.023,.046,.224),'aluminum',.004)
            m.rod('gantry guide shaft',(x-.010,.001,.061),(x-.010,.001,.247),.003,'steel',8)
        m.box('cross scan head bridge',(0,.025,.259),(.377,.057,.031),'blue',.006)
        m.box('downward sampling head',(0,.025,.236),(.156,.046,.019),'rubber',.004)
        m.box('neutral scan window',(0,-.006,.234),(.125,.003,.012),'glass',.002)
        m.box('archive wing attachment rail',(.205,.016,.050),(.042,.080,.018),'steel',.004)
        m.box('archive controller wing',(.244,.016,.081),(.077,.140,.105),'blue',.010)
        m.screen((.244,-.058,.091),(.059,.059),'serial archive/status; residual imprint only')
        m.knob((.263,-.060,.048),.008)
        m.feet(.33,.22)
    m.sockets['object_sampling_surface']=gltf((0,0,.044 if l==2 else .034))
    m.features=['Object-sized contact bed and sampling wand progress to a hands-free gantry with real clearance',
        'Instrument samples genuine residual imprints; ordinary object contact does not imply possession',
        'Empty neutral object bed and blank live readout; no ghost, possession mark or scan result baked']

def analyzer(m):
    l=m.l;w=.17+.067*l;d=.13+.035*l;h=.105+.025*l
    # Bench equipment with genuine sloped face, rear rack depth, feet and audio I/O.
    verts=[(-w/2,-d/2,0),(w/2,-d/2,0),(w/2,d/2,0),(-w/2,d/2,0),
           (-w/2,-d/2,h*.80),(w/2,-d/2,h*.80),(w/2,d/2,h),(-w/2,d/2,h)]
    m.mesh('sloped van audio analysis chassis',verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],'blue')
    m.box('front fascia',(0,-d/2-.003,h*.44),(w-.010,.009,h*.74),'steel',.004)
    if l==0:m.gauge((-.026,-d/2-.010,h*.51),.034)
    elif l==1:m.screen((-.024,-d/2-.010,h*.48),(.116,.072),'live harmonic trace')
    else:
        m.screen((-.051,-d/2-.010,h*.47),(.164,.085),'live multi-band spectrum/history')
        m.screen((.084,-d/2-.010,h*.52),(.065,.067),'recording session status')
    for i in range(2+l):m.knob((w/2-.023,-d/2-.013,.025+i*.025),.008 if l<2 else .007)
    for i in range(2):
        x=-w/2+.019+i*.018
        m.rod('line audio input collar',(x,-d/2-.006,.018),(x,-d/2-.014,.018),.005,'brass',8)
        m.rod('neutral audio socket',(x,-d/2-.014,.018),(x,-d/2-.015,.018),.003,'rubber',8)
    m.vent((0,d/2+.001,h*.56),8,w*.67)
    for x in (-w/2-.002,w/2+.002):
        m.tube('bent metal carrying bail',[(x,-.02,h*.45),(x,-.02,h+.035),(x,.055,h+.035),(x,.055,h*.7)],.004,'aluminum',6)
        m.rod('bail hand grip',(x,-.005,h+.035),(x,.040,h+.035),.007,'rubber',8)
    m.feet(w*.78,d*.70)
    m.sockets['recorded_audio_input']=gltf((-w/2+.019,-d/2-.015,.018))
    m.features=['Van bench audio analyzer with sloped fascia, line input sockets, rear ventilation and bent carrying bails',
        'Analog frequency instrument progresses to large live spectrum and session display','No waveform, species classification, live EVP or frequency response baked']

def laser(m):
    l=m.l;deployed=m.state=='deployed';z=.112 if deployed else .060
    # Structured-beam optical assembly, kept separate from D.O.T.S. assets.
    r=.025+.008*l;length=.087+.018*l
    m.rod('laser optical barrel',(0,length/2,z),(0,-length/2,z),r,'blue',12)
    m.rod('front focusing collar',(0,-length/2+.006,z),(0,-length/2-.006,z),r*1.12,'rubber',12)
    m.rod('structured beam optic',(0,-length/2-.0065,z),(0,-length/2-.008,z),r*.77,'glass',12)
    # Slit/grating aperture is physical geometry, not a projected field.
    for i in range(3+l):
        x=(i-(2+l)/2)*r*.25
        m.box('diffraction aperture rib',(x,-length/2-.009,z),(r*.055,.002,r*1.22),'steel')
    if l:
        m.ring('calibrated rotary azimuth plate',(0,0,z-.031),r*1.28,.004,'brass',plane='xy',segments=16)
        m.box('galvanometer enclosure',(0,.007,z+.024),(.047+.014*l,.049,.032),'enamel',.007)
        m.knob((r+.013,-.010,z+.002),.008,'brass')
    m.box('tilt mounting saddle',(0,.010,z-.032),(.069+.014*l,.035,.016),'steel',.004)
    for x in (-r-.010,r+.010):
        m.box('yoke upright support',(x,.008,z-.014),(.010,.022,.040),'steel',.003)
        sign=1 if x>0 else -1
        m.rod('barrel to yoke pivot',(x-sign*.014,.008,z),(x+sign*.006,.008,z),.006,'brass',8)
    # Folded legs remain compact for carry, splayed feet when deployed.
    m.rod('mounting column',(0,.010,.020),(0,.010,z-.035),.008,'steel',8)
    for i in range(3):
        a=TAU*i/3+.3;spread=.078+.014*l if deployed else .021
        p=(math.cos(a)*spread,.010+math.sin(a)*spread,.008)
        m.rod('folding support leg',(0,.010,z-.045),p,.0045,'aluminum',6)
        m.rod('non-slip foot',p,(p[0],p[1],p[2]-.006),.007,'rubber',8)
    m.box('rear battery cap',(0,length/2+.006,z),(.035,.012,.035),'rubber',.005)
    m.sockets.update(optical_emitter=gltf((0,-length/2-.010,z)),mount=gltf((0,.010,z-.040)))
    m.features=['Independent structured-beam barrel, focusing collar and physical diffraction aperture','Tilt yoke and folding support legs with separate carry/deployed forms','Catalog asset overlaps D.O.T.S. equipment; no invented evidence behavior or projected beams baked']

FACTORIES={'ANCHOR_TRIANGULATOR':triangulator,'RESONANCE_TUNER':resonance,'BAROMETRIC_PROBE':barometer,
 'SEISMIC_RECORDER':seismic,'SPECTRAL_PRISM':prism,'EMF_ARRAY':lambda m:array(m,False),
 'THERMAL_BEACON':lambda m:array(m,True),'RITUAL_ANCHOR_METER':ritual,
 'WARD_STABILITY_PROBE':lambda m:ritual(m,True),'OBJECT_IMPRINT_SCANNER':imprint,
 'SPECTRAL_FREQUENCY_ANALYZER':analyzer,'LASER_GRID':laser}

def main():
    selected=set(sys.argv[sys.argv.index('--')+1:]) if '--' in sys.argv else set(IDS)
    items=[]
    for id in IDS:
        if id not in selected:continue
        S.reset();mats=palette();display=[];allobs=[];item=dict(id=id,label=LABELS[id],stages=[])
        states=['default']+(['node','deployed'] if id in ('EMF_ARRAY','THERMAL_BEACON') else ['deployed'] if id=='LASER_GRID' else [])
        for tier in (1,2,3):
            record=None
            for state in states:
                m=Instrument(id,tier,state,mats);FACTORIES[id](m)
                floor=min((o.matrix_world@v.co).z for o in m.parts for v in o.data.vertices)
                for socket in m.sockets.values():socket[1]=round(socket[1]-floor,6)
                for surface in m.screens:
                    for point in surface['corners_blender_z_up']:point[2]=round(point[2]-floor,6)
                    surface['corners_gltf_y_up']=[gltf(p) for p in surface['corners_blender_z_up']]
                rec,ob=S.finish(id,tier,m.parts,state=state,features=m.features,sockets=m.sockets)
                rec['display_surfaces']=m.screens;rec['source_models']=m.sources
                rec['license']='Original authored geometry and pixel surface textures; archive-inspired PSX instrument style'
                rec['design_contract']='Function-shaped specialist equipment. Empty live surfaces. Asset-only, no evidence/gameplay implementation.'
                if state=='default':record=rec;display.append(ob);item['stages'].append(record)
                else:record['variants'][state]=rec
                ob.location=(len(allobs)*.8,0 if state=='default' else 1.2,0);allobs.append(ob)
        S.save_family(id,allobs);S.render_family(id,display)
        # Mounted variants are also rendered, so a rack cannot hide bad node designs.
        if id in ('EMF_ARRAY','THERMAL_BEACON'):
            nodes=[o for o in allobs if o.name.endswith('_node')]
            S.render_family(id,nodes,path=DEV/'previews'/f'{id.lower()}_nodes.png')
        items.append(item);print('SPECIALIST COMPLETE '+id,flush=True)
    # Selected rebuilds merge into this group's fragment only.
    fragment=DEV/'rebuild-specialists.json'
    if selected!=set(IDS) and fragment.exists():
        previous=json.loads(fragment.read_text())['items'];replacements={i['id']:i for i in items}
        items=[replacements.pop(i['id'],i) for i in previous]+list(replacements.values())
    S.write_fragment('rebuild-specialists.json',items)

if __name__=='__main__':main()
