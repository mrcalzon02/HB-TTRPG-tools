"""Produce the missing PSX equipment meshes. Assets only: no Java build or gameplay changes.

Run prepare_equipment_catalog.py with Pillow, then Blender --background
--python-exit-code 1 --python development/assets/build_equipment_catalog.py.
All coordinates below are metres, Blender Z-up, device front facing -Y.
"""
import bpy, hashlib, json, math, re, sys
from pathlib import Path
from mathutils import Vector

PROJECT=Path(__file__).resolve().parents[2]
DEV=Path(__file__).resolve().parent/'equipment-catalog'
RUNTIME=PROJECT/'assets/runtime/models'
BRIEF=json.loads((DEV/'production-brief.json').read_text())
CACHE={}

def xyz(p): return [round(float(v),6) for v in p]
def gltf(p): return xyz((p[0],p[2],-p[1]))
def color_uv(index): return ((128+(index%4)*32+16)/256,1-((index//4)*32+16)/256)
def label_uv(index):
    x=(index%4)*64;y=128+(index//4)*32
    return [(x/256,1-(y+32)/256),((x+64)/256,1-(y+32)/256),((x+64)/256,1-y/256),(x/256,1-y/256)]

def template(name):
    if name in CACHE:return CACHE[name]
    before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(RUNTIME/(name+'.glb')))
    imported=[o for o in bpy.context.scene.objects if o not in before]
    vertices=[];faces=[];uvs=[]
    for obj in imported:
        if obj.type!='MESH':continue
        start=len(vertices);vertices.extend([tuple(obj.matrix_world@v.co) for v in obj.data.vertices])
        layer=obj.data.uv_layers.active
        for face in obj.data.polygons:
            faces.append(tuple(start+i for i in face.vertices))
            uvs.append([tuple(layer.data[l].uv) for l in face.loop_indices] if layer else [(0,0)]*len(face.vertices))
    for obj in imported:bpy.data.objects.remove(obj,do_unlink=True)
    lo=[min(v[i] for v in vertices) for i in range(3)];hi=[max(v[i] for v in vertices) for i in range(3)]
    CACHE[name]=dict(vertices=vertices,faces=faces,uvs=uvs,low=lo,high=hi,
        dimensions=[hi[i]-lo[i] for i in range(3)],triangles=sum(len(f)-2 for f in faces))
    return CACHE[name]

class Model:
    def __init__(self,item,tier,material,glass,source=None,state='default'):
        self.id=item;self.tier=tier;self.level=tier-1;self.material=material;self.glass=glass
        self.source=source;self.state=state;self.parts=[];self.screens=[];self.sockets={}
        self.features=[]
    def mesh(self,name,vertices,faces,color=0,uvs=None,glass=False):
        mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
        obj=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(obj)
        mesh.materials.append(self.glass if glass else self.material)
        layer=mesh.uv_layers.new(name='UVMap')
        for face,uv in zip(mesh.polygons,uvs or [[color_uv(color)]*len(f) for f in faces]):
            for loop,point in zip(face.loop_indices,uv):layer.data[loop].uv=point
        group=obj.vertex_groups.new(name=name);group.add(list(range(len(vertices))),1,'REPLACE')
        self.parts.append(obj);return obj
    def box(self,name,center,size,color=0):
        x,y,z=center;w,d,h=[v/2 for v in size]
        vertices=[(x+a*w,y+b*d,z+c*h) for a,b,c in [(-1,-1,-1),(1,-1,-1),(1,1,-1),(-1,1,-1),(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)]]
        return self.mesh(name,vertices,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],color)
    def rod(self,name,a,b,radius,color=1,sides=8,end_radius=None):
        a,b=Vector(a),Vector(b);axis=(b-a).normalized()
        cross=Vector((0,0,1)) if abs(axis.z)<.9 else Vector((1,0,0))
        u=axis.cross(cross).normalized();v=axis.cross(u).normalized()
        vertices=[]
        for center,r in [(a,radius),(b,radius if end_radius is None else end_radius)]:
            for i in range(sides):
                angle=i*2*math.pi/sides;vertices.append(tuple(center+r*(math.cos(angle)*u+math.sin(angle)*v)))
        faces=[tuple(range(sides-1,-1,-1)),tuple(range(sides,2*sides))]
        faces += [(i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides)]
        return self.mesh(name,vertices,faces,color)
    def lens(self,name,center,radius,depth=.014,color=10):
        x,y,z=center
        self.rod(name+' bezel',(x,y+depth/2,z),(x,y-depth/2,z),radius,1,12)
        self.rod(name+' glass',(x,y-depth/2,z),(x,y-depth/2-.0015,z),radius*.79,color,12)
        self.sockets[name]=gltf((x,y-depth/2-.0015,z))
    def screen(self,center,size,tag=True,label=1):
        x,y,z=center;w,h=size
        self.box('display bezel',(x,y+.001,z),(w+.012,.009,h+.012),3)
        vertices=[(x-w/2,y-.004,z-h/2),(x+w/2,y-.004,z-h/2),(x+w/2,y-.004,z+h/2),(x-w/2,y-.004,z+h/2)]
        self.mesh('live display surface',vertices,[(0,1,2,3)],uvs=[label_uv(label)])
        self.screens.append(dict(name='live display surface',corners_blender_z_up=[xyz(p) for p in vertices],
            corners_gltf_y_up=[gltf(p) for p in vertices],purpose='runtime measurement/video overlay; artwork is neutral'))
        if tag:self.label((x,y-.004,z+h/2+.018),(w,.018),0)
    def label(self,center,size,index):
        x,y,z=center;w,h=size
        self.mesh('label',[(x-w/2,y,z-h/2),(x+w/2,y,z-h/2),(x+w/2,y,z+h/2),(x-w/2,y,z+h/2)],[(0,1,2,3)],uvs=[label_uv(index)])
    def body(self,center,size):
        if not self.source:return self.box('equipment housing',center,size,0)
        data=template(self.source);lo=data['low'];hi=data['high']
        source_axes=sorted(range(3),key=lambda i:hi[i]-lo[i]);target_axes=sorted(range(3),key=lambda i:size[i])
        permutation={target:source for target,source in zip(target_axes,source_axes)}
        # Choose a proper axis rotation rather than reflecting the source geometry.
        inversions=sum(permutation[i]>permutation[j] for i in range(3) for j in range(i+1,3))
        signs=[-1 if inversions%2 and i==0 else 1 for i in range(3)]
        vertices=[]
        for p in data['vertices']:
            vertices.append(tuple(center[i]+signs[i]*(p[permutation[i]]-(lo[permutation[i]]+hi[permutation[i]])/2)*size[i]/max(.000001,hi[permutation[i]]-lo[permutation[i]]) for i in range(3)))
        uv=[[(u*.5,v*.5+.5) for u,v in face] for face in data['uvs']]
        obj=self.mesh('source-derived '+self.source,vertices,data['faces'],uvs=uv)
        self.features.append('Modified existing '+self.source+' geometry and retained source texture UVs')
        return obj
    def knob(self,center,r=.009):
        x,y,z=center;self.rod('control dial',(x,y+.004,z),(x,y-.006,z),r,2,8)
        self.box('dial index',(x,y-.007,z+r*.4),(.002,.002,r*.65),3)
    def buttons(self,center,count=2,spacing=.018):
        x,y,z=center
        for i in range(count):self.box('physical button',(x+(i-(count-1)/2)*spacing,y,z),(.010,.005,.007),5 if i==0 else 2)
    def battery(self,center,size=(.045,.007,.047)):
        self.box('battery compartment',center,size,13)
        x,y,z=center;self.box('battery latch',(x,y+size[1]/2+.001,z-size[2]*.33),(.012,.003,.004),2)
    def glow(self,obj):
        if not hasattr(self,'glow_material'):
            self.glow_material=self.material.copy();self.glow_material.name='Physical ember or flame'
            shader=self.glow_material.node_tree.nodes.get('Principled BSDF')
            shader.inputs['Emission Color'].default_value=(1,.29,.035,1)
            shader.inputs['Emission Strength'].default_value=1
        obj.data.materials[0]=self.glow_material
    def gauge(self,center,radius=.036):
        x,y,z=center;self.lens('dial instrument',(x,y,z),radius,.014,7)
        for i in range(11):
            a=math.pi*.18+i*math.pi*1.64/10
            self.rod('gauge tick',(x+math.sin(a)*radius*.62,y-.010,z+math.cos(a)*radius*.62),
                (x+math.sin(a)*radius*.83,y-.010,z+math.cos(a)*radius*.83),.0008,3,4)
        self.box('neutral needle',(x,y-.012,z-radius*.18),(.0018,.002,radius*.55),5)
        self.sockets['dial_needle_pivot']=gltf((x,y-.012,z))
    def ring(self,name,center,radius,tube=.004,color=1,segments=12,vertical=False):
        x,y,z=center
        for i in range(segments):
            a=i*2*math.pi/segments;b=(i+1)*2*math.pi/segments
            p=(x+radius*math.cos(a),y if vertical else y+radius*math.sin(a),z+radius*math.sin(a) if vertical else z)
            q=(x+radius*math.cos(b),y if vertical else y+radius*math.sin(b),z+radius*math.sin(b) if vertical else z)
            self.rod(name,p,q,tube,color,4)
    def feet(self,width=.11,depth=.08):
        for x in (-width/2,width/2):
            for y in (-depth/2,depth/2):self.box('rubber foot',(x,y,.009),(.018,.018,.018),3)
    def stand(self,height=.12,spread=.12,folded=False):
        self.rod('stand column',(0,0,.03),(0,0,height),.009,1)
        for i in range(3):
            a=i*2*math.pi/3
            radius=.024 if folded else spread
            self.rod('stand leg',(0,0,height*.67),(radius*math.cos(a),radius*math.sin(a),.008),.007,1)
        self.sockets['mount']=gltf((0,0,height))

def handheld(m,w=.082,d=.035,h=.17):
    m.body((0,0,h/2),(w,d,h))
    m.screen((0,-d/2-.006,h*.64),(w*.72,h*(.34+.035*m.level)))
    m.buttons((0,-d/2-.008,h*.23),2+m.level,spacing=w*.22)
    m.battery((0,d/2+.003,h*.24),(w*.65,.005,h*.34))
    m.sockets['hand_grip']=gltf((0,.008,h*.23))
    if m.level:m.knob((w*.35,-d/2-.008,h*.83),.007)

def book(m,opened=False):
    w=.12+.025*m.level;d=.17+.025*m.level
    if opened:
        m.box('open book binding',(0,0,.012),(w*2+.012,d,.012),8)
        for sign in (-1,1):
            m.box('blank pages',(sign*(w/2+.004),0,.024),(w-.008,d-.010,.015),12)
            for i in range(3):m.box('paper edge',(sign*(w/2+.004),d/2-.006,.019+i*.003),(w-.008,.001,.001),14)
        m.rod('central spine',(0,-d/2,.031),(0,d/2,.031),.003,8,6)
        m.sockets['writing_surface_left']=gltf((-w/2,0,.032));m.sockets['writing_surface_right']=gltf((w/2,0,.032))
        if m.tier==3:
            m.box('angleable book support',(0,.04,.004),(w*1.2,.08,.008),1)
    else:
        m.box('book spine',(0,0,.02),(w,d,.04+.007*m.level),8)
        m.box('paper block',(.004,0,.02),(w-.008,d-.008,.028+.006*m.level),12)
        for z in (.003,.040+.007*m.level):m.box('cloth cover',(0,0,z),(w+.006,d+.005,.005),9 if m.tier==2 else 1)
        m.box('cloth spine',(-w/2,0,.02),(.009,d,.04+.007*m.level),8)
        if m.level:m.box('closing strap',(w*.35,0,.045+.007*m.level),(.014,d*.9,.005),6)
    m.features+=['Blank writable paper; no ghost-authored marks baked into artwork','Physically distinct closed/open forms']

def projector(m,deployed=False):
    if m.tier==1:
        m.body((0,0,.065),(.035,.030,.13))
        for i in range(2):m.lens('grid emitter '+str(i),((i-.5)*.016,-.020,.112),.006,.010,4 if m.id=='DOTS_PROJECTOR' else 5)
        m.box('mounting clip',(0,.020,.068),(.020,.009,.060),1)
        m.buttons((0,-.019,.044),1)
    else:
        lift=.11 if deployed else .025
        if deployed:m.stand(.12+.025*m.level,.11+.025*m.level)
        w=.12+.035*m.level;d=.08+.025*m.level
        m.body((0,0,lift+.055),(w,d,.085))
        count=2+m.level
        for i in range(count):m.lens('grid emitter '+str(i),((i-(count-1)/2)*.026,-d/2-.004,lift+.055),.011+.002*m.level,.017,4 if m.id=='DOTS_PROJECTOR' else 5)
        m.knob((w/2-.012,-d/2-.005,lift+.083))
        m.battery((0,d/2+.002,lift+.05),(w*.65,.007,.045))
    m.features+=['Separate emitter apertures; projected light is supplied by the online game','Mechanical placement support' if deployed else 'Compact carried housing']

def camera(m,video=False):
    l=m.level
    if video:
        w=.105+.018*l;d=.15+.025*l;h=.075+.010*l
        m.body((0,0,.11),(w,d,h));m.lens('optical lens',(0,-d/2-.026,.11),.024+.009*l,.040,10)
        m.rod('hand grip',(w/2+.014,-.025,.052),(w/2+.014,.040,.052),.012,3)
        m.box('grip support',(w/2+.007,.010,.072),(.020,.055,.040),3)
        m.box('top handle',(0,.015,.178),(.035,.095,.012),1)
        for y in (-.025,.055):m.box('handle riser',(0,y,.157),(.025,.012,.030),1)
        m.screen((-w*.60,-.015,.128),(.070+.022*l,.050+.014*l))
        m.rod('camera microphone',(.025,-.035,.165),(.025,.025,.165),.008,3)
        m.box('microphone saddle',(.025,-.010,.153),(.020,.030,.025),1)
        m.buttons((w*.3,-d/2-.004,.14),1)
        m.sockets['camera_optical_center']=gltf((0,-d/2-.047,.11))
    else:
        w=.115+.016*l;d=.065+.008*l;h=.078+.009*l
        m.body((0,0,.085),(w,d,h));m.lens('photo lens',(-.010,-d/2-.016,.085),.025+.008*l,.035+.010*l,10)
        m.box('hand grip',(w*.40,-.003,.083),(.025,d*.85,h*.94),3)
        m.box('viewfinder',(0,.002,.137),(.035,.036,.026),1)
        m.lens('finder',(.030,-d/2-.003,.113),.008,.008,10)
        m.knob((w*.38,-d/2-.005,.118),.007)
        m.box('shutter',(w*.36,-.015,.132),(.014,.014,.008),5)
        m.label((0,d/2+.001,.09),(.065,.025),2)
        m.sockets['camera_optical_center']=gltf((-.010,-d/2-.035-.01*l,.085))
    m.battery((.012,.055 if video else .025,.05),(.06,.014,.035))
    m.sockets['hand_grip']=gltf((w*.4,0,.08))
    m.sockets['tripod_thread']=gltf((0,0,.025));m.features+=['Real lens, viewfinder, shutter/record control, grip and battery geometry']

def torch(m,uv=False):
    l=m.level;r=.020+.004*l;length=.17+.025*l
    m.body((0,.015,.043),(r*2,length,.045))
    m.rod('torch barrel',(0,.085,.043),(0,-length/2,.043),r,13,10)
    head=.030+.010*l
    if uv and m.tier==3:
        m.box('UV flood head',(0,-length/2-.008,.043),(.12,.030,.044),1)
        for i in range(5):m.lens('UV emitter '+str(i),((i-2)*.022,-length/2-.025,.043),.008,.010,11)
    else:m.lens('UV emitter' if uv else 'torch reflector',(0,-length/2-.011,.043),head,.027,11 if uv else 12)
    m.box('thumb switch',(0,-.010,.070),(.014,.028,.007),5 if uv else 2)
    m.rod('battery cap',(0,.085,.043),(0,.094,.043),r*1.05,1,10)
    if m.level:m.ring('lanyard loop',(0,.100,.043),.009,.002,1,8,True)
    m.sockets['emission_origin']=gltf((0,-length/2-.030,.043));m.sockets['hand_grip']=gltf((0,.025,.043))

def emf(m):
    handheld(m,.082+.010*m.level,.035,.17+.015*m.level)
    for i in range(5):m.box('segmented indicator '+str(i),((i-2)*.012,-.026,.154+.015*m.level),(.009,.004,.008),4 if i<3 else 6 if i==3 else 5)
    if m.tier==3:
        for i in range(3):m.box('side history key',(.049,.0,.07+i*.02),(.006,.013,.007),1)

def thermometer(m):
    handheld(m,.062+.008*m.level,.043,.17+.012*m.level)
    m.rod('probe stem',(0,0,.176+.012*m.level),(0,0,.225+.025*m.level),.005,2,8)
    m.lens('IR probe',(.0,-.028,.18+.012*m.level),.012+.003*m.level,.016,10)
    m.label((0,-.031,.046),(.030,.012),6)

def spirit_box(m):
    w=.13+.018*m.level;h=.105+.012*m.level;d=.042
    m.body((0,0,h/2),(w,d,h));m.screen((0,-d/2-.006,h*.69),(w*.72,.027+.006*m.level))
    for i in range(7):m.box('speaker grille',(-w*.27+i*w*.09,-d/2-.006,h*.30),(.003,.004,.027),3)
    for x in (-w*.35,w*.35):m.knob((x,-d/2-.009,.018),.010)
    for i in range(1 if m.tier==2 else 2):m.rod('receiver antenna',((i-.5)*w*.7,0,h),((i-.5)*w*.7,0,h+.08+.025*m.level),.003,2,6)
    m.battery((0,d/2+.002,.025),(.065,.006,.035))

def cross(m):
    height=.20+.035*m.level;w=.10+.025*m.level
    m.box('cross upright',(0,0,height/2),(.020,.014,height),9 if m.tier==2 else 2)
    m.box('cross arms',(0,0,height*.72),(w,.014,.020),9 if m.tier==2 else 2)
    for x in (-w*.42,w*.42):m.box('arm binding',(x,0,height*.72),(.008,.019,.028),6)
    for i in range(2+m.level):m.box('physical charge insert',((i-(1+m.level)/2)*.012,-.009,height*.42),(.008,.006,.012),6)
    if m.tier==3:m.box('deployment base',(0,0,.010),(.08,.055,.020),1)

def firelight(m,lit=False):
    l=m.level
    if m.tier==1:
        m.rod('candle wax',(0,0,.012),(0,0,.14),.020,12,10)
        m.rod('candle saucer',(0,0,.004),(0,0,.012),.042,8,12)
        top=.145
    else:
        r=.055+.012*l;top=.19+.035*l
        m.rod('lantern reservoir',(0,0,.012),(0,0,.062),r,1,10)
        shield=m.rod('wind shield',(0,0,.064),(0,0,top-.035),r*.83,15,10)
        shield.data.materials[0]=m.glass
        m.features.append('Transparent lantern windshield; retain alpha blending')
        for i in range(4):
            a=i*math.pi/2;m.rod('lantern guard',(r*.86*math.cos(a),r*.86*math.sin(a),.055),(r*.86*math.cos(a),r*.86*math.sin(a),top-.02),.004,1,6)
        m.rod('weather hood',(0,0,top-.035),(0,0,top),r*1.05,1,10,end_radius=r*.6)
        m.ring('carry bail',(0,0,top+.025),r*.65,.004,2,12,True)
        m.knob((r*.72,-r*.76,.043),.009);top=.112
    m.rod('wick',(0,0,top-.008),(0,0,top+.007),.002,3,6)
    if lit:
        m.glow(m.rod('flame',(0,0,top),(0,0,top+.030),.009,6,6,end_radius=.0005))
        m.sockets['flame']=gltf((0,0,top+.014))
    m.sockets['light_origin']=gltf((0,0,top+.014))

def igniter(m,lit=False):
    l=m.level;w=.026+.006*l;h=.065+.008*l
    m.box('lighter fuel body',(0,0,h/2),(w,.015+.004*l,h),5 if m.tier==1 else 2)
    m.box('burner guard',(0,-.002,h+.008),(w*.8,.014,.017),1)
    m.rod('striker wheel',(-w*.4,.003,h+.014),(w*.4,.003,h+.014),.005,13,8)
    m.box('thumb lever',(0,.010,h-.002),(w*.7,.010,.006),3)
    if l:
        m.box('hinged lid',(w*.80,0,h+.010),(w*.65,.020,.023),1)
        m.rod('hinge',(w*.46,-.010,h),(w*.46,.010,h),.003,2,6)
    if m.tier==3:
        for x in (-w*.40,w*.40):m.box('storm windguard',(x,0,h+.025),(.004,.023,.029),1)
        m.box('storm windguard back',(0,.010,h+.025),(w*.8,.004,.029),1)
        for x in (-.006,.006):
            m.rod('jet nozzle',(x,-.004,h+.014),(x,-.004,h+.025),.003,3,6)
            if lit:m.glow(m.rod('jet flame',(x,-.004,h+.025),(x,-.004,h+.050),.0035,6,6,end_radius=.0004))
    elif lit:m.glow(m.rod('lighter flame',(0,-.004,h+.018),(0,-.004,h+.039),.005,6,6,end_radius=.0005))
    m.sockets['flame']=gltf((0,-.004,h+(.038 if m.tier==3 else .025)))

def incense(m,burning=False):
    l=m.level
    if m.tier==1:
        for i in range(5):
            a=i*2*math.pi/5;x=.007*math.cos(a);y=.007*math.sin(a)
            m.rod('incense reed',(x,y,.005),(x+.002,y,.145),.0035,9,6)
            if burning:m.glow(m.rod('ember',(x+.002,y,.137),(x+.002,y,.146),.0037,5,6))
        for z in (.025,.065):m.ring('bundle twine',(0,0,z),.011,.0018,7,10)
        m.sockets['smoke_origin']=gltf((0,0,.145))
    else:
        r=.035+.008*l;h=.13+.025*l
        m.rod('incense canister',(0,0,.012),(0,0,h),r,1,10)
        m.rod('vented lid',(0,0,h),(0,0,h+.012),r*1.05,2,10)
        for i in range(5):
            x=(i-2)*r*.32;vent=m.box('lid vent',(x,-.005,h+.013),(.006,r*.7,.002),5 if burning else 3)
            if burning:m.glow(vent)
        m.box('heat guard',(0,r+.004,h*.5),(r*1.2,.006,h*.6),13)
        if m.tier==3:
            m.knob((0,-r-.007,h*.35),.012)
            m.ring('canister carry bail',(0,0,h+.038),r*.70,.004,2,12,True)
        m.sockets['smoke_origin']=gltf((0,0,h+.014))

def head_gear(m):
    l=m.level;r=.090
    m.ring('head strap',(0,.020,.060),r,.012,13,16)
    for x in (-.06,.06):m.rod('top strap',(x,.02,.06),(0,.02,.15),.010,13,6)
    m.box('forehead mount',(0,-.070,.064),(.074,.018,.035),1)
    count=2 if m.tier==3 else 1
    for i in range(count):
        x=0 if count==1 else (i-.5)*.044
        m.body((x,-.090,.067),(.038,.055,.032))
        m.lens('head optic '+str(i),(x,-.125,.067),.015+.003*l,.020,10)
    m.box('rear battery pack',(0,.105,.061),(.060+.008*l,.030,.038),0)
    m.buttons((.018,-.102,.095),1)
    m.sockets['head_mount']=gltf((0,.020,.060));m.sockets['optical_center']=gltf((0,-.14,.067))

def motion_sensor(m):
    l=m.level;w=.060+.012*l;h=.095+.012*l
    m.body((0,0,h/2+.015),(w,.034,h));m.box('mounting backplate',(0,.022,h/2),(.065,.008,h*.90),1)
    for i in range(1+l):m.lens('PIR zone '+str(i),((i-l/2)*.023,-.025,h*.60),.014,.015,12)
    m.box('indicator',(0,-.026,h*.2),(.012,.003,.005),4)
    if l:m.rod('hinge axle',(-w/2,0,.018),(w/2,0,.018),.006,1,8)
    m.battery((0,.025,h*.25),(.035,.005,.038));m.sockets['sensing_origin']=gltf((0,-.035,h*.60))
    m.sockets['wall_mount']=gltf((0,.026,h/2))

def microphone(m):
    l=m.level;r=.105+.030*l;z=.18+.03*l
    vertices=[(0,-.045,z)];rings=4;segments=12
    for j in range(1,rings+1):
        rad=r*j/rings;y=-.045-.055*(rad/r)**2
        for i in range(segments):
            a=i*2*math.pi/segments;vertices.append((rad*math.cos(a),y,z+rad*math.sin(a)))
    faces=[]
    for i in range(segments):faces.append((0,1+(i+1)%segments,1+i))
    for j in range(rings-1):
        for i in range(segments):
            a=1+j*segments+i;b=1+j*segments+(i+1)%segments
            faces.append((a,b,b+segments,a+segments))
    m.mesh('parabolic acoustic dish',vertices,faces,2)
    m.ring('dish rim',(0,-.10,z),r,.004,1,12,True)
    m.rod('dish focal strut',(0,.005,z),(0,-.16,z),.004,1,6)
    m.rod('focal microphone',(0,-.135,z),(0,-.16,z),.009,3,8)
    m.body((0,.018,.085),(.055+.006*l,.045,.12))
    m.rod('pistol grip',(0,.01,.012),(0,.01,.075),.018,13,8)
    if l:m.screen((.045,-.012,.095),(.06+.015*l,.040+.010*l))
    m.knob((-.026,-.014,.11),.009);m.sockets['acoustic_focus']=gltf((0,-.16,z))
    m.sockets['hand_grip']=gltf((0,.010,.045))

def salt(m,deployed=False):
    if deployed:
        count=9+4*m.level
        m.rod('salt pile',(0,0,.001),(0,0,.018+.003*m.level),.09+.025*m.level,12,12,end_radius=.025)
        for i in range(count):
            a=i*2.399;r=.030+.004*(i%9)
            m.box('salt granule',(r*math.cos(a),r*math.sin(a),.009),(.006,.005,.004),12)
    elif m.tier==3:
        m.rod('salt dispenser',(0,0,.010),(0,0,.19),.038,2,10)
        m.rod('sifter cap',(0,0,.19),(0,0,.20),.039,1,10)
        for i in range(5):m.box('sifter opening',((i-2)*.010,0,.201),(.004,.012,.001),3)
        m.label((0,-.039,.11),(.045,.025),0)
    else:
        w=.085+.025*m.level;h=.13+.025*m.level
        m.box('salt pouch',(0,0,h/2),(w,.042,h),7)
        m.box('folded bag seam',(0,0,h),(.9*w,.017,.015),8)
        for x in (-w*.44,w*.44):m.box('bag side crease',(x,-.022,h*.5),(.004,.003,h*.8),14)
        m.label((0,-.023,h*.6),(w*.72,.035),0)
        if m.tier==2:
            m.box('resealable zipper',(0,0,h+.008),(w,.012,.006),1)
            m.rod('pour spout',(w*.32,0,h),(w*.32,0,h+.028),.008,2,8)

def medication(m):
    if m.tier==1:
        m.box('blister backing',(0,0,.003),(.075,.045,.004),2)
        for x in (-.020,0,.020):m.rod('sealed tablet blister',(x,0,.005),(x,0,.012),.008,12,8)
    elif m.tier==2:
        m.rod('medicine bottle',(0,0,.005),(0,0,.085),.023,12,10)
        m.rod('childproof cap',(0,0,.085),(0,0,.100),.025,2,10)
        m.label((0,-.024,.046),(.035,.024),8)
        m.label((0,-.024,.069),(.018,.015),14)
    else:
        m.box('medical case',(0,0,.025),(.16,.105,.05),1)
        m.box('case lid',(0,0,.053),(.16,.105,.009),12)
        for x in (-.050,.050):m.box('case latch',(x,-.056,.035),(.018,.008,.020),2)
        m.label((0,-.054,.030),(.050,.024),8)
        m.box('carry handle',(0,.070,.033),(.070,.012,.012),13)

def sound_sensor(m):
    l=m.level;w=.09+.015*l
    m.body((0,0,.045),(w,.06,.065));m.feet(w*.75,.045)
    for i in range(1+l):
        x=(i-l/2)*.034
        m.rod('microphone capsule',(x,0,.077),(x,0,.12+.012*l),.012,2,8)
        for z in (.092,.103,.114):m.box('microphone grille',(x,-.013,z),(.018,.002,.002),3)
    m.buttons((0,-.034,.022),1);m.box('status lamp',(0,-.034,.057),(.012,.003,.005),4)
    m.sockets['audio_origin']=gltf((0,0,.11))

def tripod(m,folded=False):
    l=m.level;height=.60+.20*l;spread=.035 if folded else .22+.045*l
    m.rod('tripod center column',(0,0,.12),(0,0,height),.012,1,8)
    for i in range(3):
        a=i*2*math.pi/3;x=spread*math.cos(a);y=spread*math.sin(a)
        m.rod('telescoping leg upper',(0,0,height*.72),(x*.63,y*.63,height*.30),.012,1,6)
        m.rod('telescoping leg lower',(x*.63,y*.63,height*.30),(x,y,.012),.008,2,6)
        m.rod('leg spread brace',(0,0,height*.35),(x*.55,y*.55,height*.38),.003,1,6)
        m.box('non-slip foot',(x,y,.008),(.023,.023,.016),3)
        if l:m.rod('leg locking collar',(x*.61,y*.61,height*.31),(x*.64,y*.64,height*.28),.014,3,6)
    m.rod('pan bearing',(0,0,height),(0,0,height+.025),.030,1,10)
    m.box('tilt head',(0,0,height+.044),(.058,.060,.030),0)
    m.box('quick release plate',(0,0,height+.065),(.075,.070,.012),2)
    m.rod('pan handle',(.020,.010,height+.043),(.04,.14,height+.015),.006,13,6)
    if m.tier==3:
        m.box('pan motor',(.049,0,height+.045),(.035,.050,.038),1)
        m.box('control panel',(-.049,0,height+.045),(.025,.054,.040),0)
    m.sockets['camera_mount']=gltf((0,0,height+.071));m.sockets['pan_axis']=gltf((0,0,height));m.sockets['tilt_axis']=gltf((0,0,height+.045))

def clipboard(m):
    l=m.level;w=.17+.025*l;h=.23+.025*l
    if m.tier==3:
        m.body((0,0,h/2),(w,.024,h));m.screen((0,-.019,h*.55),(w*.82,h*.75),label=13)
    else:
        m.box('clipboard backing',(0,0,h/2),(w,.012,h),8 if m.tier==1 else 1)
        m.box('clean task sheet',(0,-.007,h*.49),(w*.90,.001,h*.86),12)
        m.box('paper clip',(0,-.013,h*.92),(w*.40,.010,.021),2)
        for i in range(5):
            z=h*.74-i*h*.12;m.box('empty checkbox',(-w*.34,-.009,z),(.012,.001,.012),1)
            m.box('task rule',(w*.08,-.009,z),(w*.56,.001,.001),14)
        if l:m.rod('pencil',(w*.56,0,.025),(w*.56,0,h*.90),.004,6,6)

def monitor(m,computer=False):
    l=m.level;w=.30+.10*l;h=.22+.045*l;lift=.10
    count=2 if m.tier==3 else 1
    for i in range(count):
        x=(i-(count-1)/2)*(w+.020)
        m.body((x,0,lift+h/2),(w,.065,h))
        m.screen((x,-.039,lift+h/2),(w*.85,h*.76),label=2)
        m.rod('monitor neck',(x,.015,.035),(x,.015,lift+.020),.018,1,8)
        m.box('monitor foot',(x,.012,.018),(w*.62,.13,.025),1)
        m.buttons((x,-.040,lift+.019),2+l,spacing=.023)
        m.label((x,-.040,lift+h*.87),(w*.65,.020),0)
    if computer:
        m.box('keyboard',(0,-.14,.018),(.28+.035*l,.095,.025),13)
        for row in range(4):
            for col in range(10):m.box('keyboard key',((col-4.5)*.025,-.168+row*.021,.033),(.020,.015,.005),2)
        m.box('mouse',(.23,-.13,.020),(.045,.065,.030),1)
        m.box('computer tower',(-.29,.07,.12),(.10,.20,.24),0)
        m.buttons((-.29,-.034,.19),1);m.label((-.29,-.034,.13),(.065,.025),15)

def board(m):
    l=m.level;w=.48+.16*l;h=.34+.10*l
    m.box('board backing',(0,0,h/2),(w,.035,h),8 if m.tier==1 else 1)
    if m.tier==3:m.screen((0,-.022,h/2),(w*.91,h*.86),label=13)
    else:
        m.box('board surface',(0,-.021,h/2),(w*.92,.003,h*.86),7 if m.tier==1 else 3)
        for x in (-w*.27,0,w*.27):
            m.box('blank objective card',(x,-.024,h*.58),(w*.22,.002,h*.50),12)
            m.box('card clip',(x,-.027,h*.84),(.015,.005,.010),6)
    if l:
        for x in (-w*.40,w*.40):m.box('board leg',(x,.02,.06),(.024,.04,.30),1)
        m.box('marker shelf',(0,-.060,.06),(w*.75,.08,.02),1)

def site_map(m):
    l=m.level;w=.19+.04*l;h=.24+.04*l
    if m.tier==3:
        m.body((0,0,h/2),(w,.025,h));m.screen((0,-.019,h*.52),(w*.86,h*.80),label=12)
    else:
        m.box('map folder',(0,0,h/2),(w+.018,.009,h+.015),8 if m.tier==1 else 1)
        m.box('map paper',(0,-.006,h/2),(w,.001,h),12)
        for row in range(5):
            for col in range(3):
                x=-w*.4+col*w*.27;z=.025+row*h*.17
                # The current authored house has a three-column, five-zone-row footprint.
                m.box('floorplan horizontal',(x+w*.12,-.007,z),(w*.25,.001,.0018),1)
                m.box('floorplan vertical',(x,-.007,z+h*.075),(.0018,.001,h*.15),1)
        if l:m.box('map retaining clip',(0,-.011,h*.94),(w*.50,.008,.016),2)
    m.features+=['Unoccupied floor-plan geometry; no player or ghost markers baked in']

def audio_monitor(m):
    l=m.level;w=.25+.09*l
    m.body((0,0,.10),(w,.10,.16));m.feet(w*.8,.075)
    if m.tier==1:m.gauge((0,-.059,.115),.050)
    else:
        count=2 if m.tier==2 else 3
        for i in range(count):m.screen(((i-(count-1)/2)*w/count,-.058,.125),(w/count*.81,.070),tag=False)
    for i in range(2+l):m.knob(((i-(1+l)/2)*.045,-.060,.045),.010)
    m.label((0,-.060,.18),(w*.65,.020),0)

def triangulator(m):
    handheld(m,.080+.015*m.level,.040,.17+.02*m.level)
    if m.tier==1:m.gauge((0,-.030,.115),.026)
    count=1+m.level
    for i in range(count):
        x=(i-(count-1)/2)*.045
        m.rod('bearing antenna',(x,0,.18),(x,0,.28+.02*m.level),.003,2,6)
        m.rod('antenna crossbar',(x-.030,0,.26),(x+.030,0,.26),.0025,2,6)
    m.sockets['bearing_origin']=gltf((0,0,.20))

def case_base(m,w=.20,d=.14,opened=False):
    m.box('equipment case',(0,0,.025),(w,d,.050),1)
    if opened:
        m.box('upright case lid',(0,d/2+.006,.090),(w,.012,.14),1)
        m.box('lid lining',(0,d/2-.002,.09),(w*.90,.004,.12),13)
    else:m.box('case lid',(0,0,.056),(w,d,.012),0)
    for x in (-w*.32,w*.32):m.box('case latch',(x,-d/2-.004,.035),(.018,.008,.024),2)
    m.box('case handle',(0,-d/2-.018,.026),(w*.40,.012,.015),13)
    m.sockets['case_handle']=gltf((0,-d/2-.018,.026))

def assay(m,opened=False):
    l=m.level;w=.20+.035*l;d=.14+.020*l
    case_base(m,w,d,opened)
    if opened:
        count=3+2*l
        for i in range(count):
            x=(i-(count-1)/2)*w*.11
            m.rod('empty assay vial',(x,.012,.045),(x,.012,.100),.008,12,8)
            m.rod('sealed vial cap',(x,.012,.100),(x,.012,.108),.009,2,8)
            m.rod('sterile swab',(x,-.035,.055),(x,-.035,.135),.0015,2,6)
            m.rod('swab cotton',(x,-.035,.125),(x,-.035,.14),.003,12,6)
        if m.tier==3:
            m.box('microscope stage',(w*.30,.015,.12),(.055,.045,.010),3)
            m.rod('microscope stand',(w*.38,.032,.055),(w*.38,.032,.20),.008,1,8)
            m.rod('microscope optics',(w*.33,.012,.17),(w*.33,-.010,.22),.009,1,8)
            m.rod('microscope objective',(w*.33,.012,.17),(w*.33,.012,.132),.006,2,8)
    m.features+=['Empty sterile sample containers; no ectoplasm sample baked in']

def resonance(m):
    l=m.level
    for fork in range(1+l):
        x=(fork-l/2)*.055
        m.rod('tuning fork handle',(x,0,.010),(x,0,.10),.007,9,8)
        m.box('fork yoke',(x,0,.108),(.032,.010,.018),2)
        for side in (-1,1):m.box('tuning fork tine',(x+side*.013,0,.16),(.007,.010,.10),2)
    if l:
        m.body((0,.040,.073),(.12+.035*l,.045,.10))
        m.screen((0,.013,.080),(.09+.020*l,.060));m.knob((.045,.012,.035),.008)

def barometer(m):
    l=m.level
    if m.tier==1:
        m.rod('barometer body',(0,.017,.09),(0,-.017,.09),.050,1,12)
        m.gauge((0,-.025,.09),.044)
        m.rod('pressure port',(0,0,.025),(0,0,.005),.006,2,8)
    else:
        handheld(m,.09+.015*l,.045,.17+.015*l)
        for i in range(2):m.rod('pressure connector',((i-.5)*.040,0,.18),((i-.5)*.040,0,.22),.006,2,8)
        if m.tier==3:
            m.rod('reference pressure station',(.085,0,.010),(.085,0,.12),.025,1,10)
            m.rod('reference inlet',(.085,0,.12),(.085,0,.15),.004,2,6)
        m.label((0,-.030,.045),(.035,.015),6)

def seismic(m):
    l=m.level;r=.065+.018*l
    m.rod('ground contact puck',(0,0,.005),(0,0,.027),r,2,12)
    m.body((0,0,.075),(.105+.025*l,.075,.085))
    m.screen((0,-.045,.080),(.075+.020*l,.046));m.knob((.038,-.043,.045),.008)
    for i in range(1+l):
        a=i*2*math.pi/(1+l);x=r*.8*math.cos(a);y=r*.8*math.sin(a)
        m.rod('axis pickup',(x,y,.015),(x,y,.045),.011,3,8)
    for i in range(3):
        a=i*2*math.pi/3;m.rod('ground foot',(r*.95*math.cos(a),r*.95*math.sin(a),.01),(r*.95*math.cos(a),r*.95*math.sin(a),.001),.004,2,6)
    m.sockets['ground_contact']=gltf((0,0,0))

def prism(m):
    l=m.level;w=.080+.035*l;h=.060+.020*l
    m.box('prism frame top',(0,0,.14+h/2),(w+.015,.026,.010),1)
    m.box('prism frame bottom',(0,0,.14-h/2),(w+.015,.026,.010),1)
    for x in (-w/2,w/2):m.box('prism frame side',(x,0,.14),(.009,.026,h),1)
    # A real triangular prism is retained behind the clear viewing aperture.
    v=[(-w/2,-.009,.14-h/2),(w/2,-.009,.14-h/2),(0,.012,.14-h/2),
       (-w/2,-.009,.14+h/2),(w/2,-.009,.14+h/2),(0,.012,.14+h/2)]
    m.mesh('spectral glass prism',v,[(0,2,1),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],15,glass=True)
    m.rod('optical handle',(0,0,.010),(0,0,.14-h/2),.012,13,8)
    if l:m.knob((w/2+.011,-.018,.14),.010)
    if m.tier==3:m.screen((0,-.021,.058),(w*.75,.030),tag=False)
    m.sockets['viewing_aperture']=gltf((0,-.010,.14));m.features+=['Transparent prism material; preserve alpha blending during online integration']

def array(m,thermal=False,node=False):
    l=m.level;count=([2,4,6] if thermal else [2,3,5])[l]
    if node:
        m.body((0,0,.070),(.042,.034,.12))
        m.rod('sensor mast',(0,0,.13),(0,0,.19),.0035,2,6)
        m.rod('ground foot',(0,0,.002),(0,0,.014),.028,1,8)
        if thermal:m.rod('temperature probe',(.018,0,.08),(.04,0,.08),.003,2,6)
        else:m.ring('EMF sensing coil',(0,-.023,.10),.014,.002,2,8,True)
        m.box('sensor status',(0,-.019,.044),(.009,.003,.004),4)
        m.sockets['sensing_origin']=gltf((0,0,.15))
    else:
        w=.15+count*.024;case_base(m,w,.15,True)
        for i in range(count):
            x=(i-(count-1)/2)*.040
            m.body((x,0,.095),(.034,.030,.10))
            m.rod('stored sensor antenna',(x,0,.15),(x,0,.18),.002,2,6)
            m.box('sensor charging contacts',(x,-.017,.062),(.016,.002,.006),6)
        m.features.append(f'{count} physically separate sensor housings and a charging/storage case')

def ritual_meter(m,ward=False):
    l=m.level;handheld(m,.08+.012*l,.038,.17+.012*l)
    if m.tier==1:m.gauge((0,-.029,.11),.024)
    if ward:
        for i in (-1,1):
            m.rod('ward contact probe',(i*.022,0,.18),(i*.022,0,.24+.015*l),.004,2,6)
            m.box('spring contact jaw',(i*.022,-.004,.24+.015*l),(.014,.008,.018),6)
        if m.tier==3:m.ring('field loop',(0,0,.23),.039,.003,2,10,True)
    else:
        m.ring('ritual field coil',(0,0,.22+.012*l),.035+.006*l,.004,6,12,True)
        m.rod('coil support',(0,0,.16),(0,0,.195+.012*l),.005,1,8)
        if l:
            for i in (-1,1):m.rod('differential pickup',(i*.034,0,.17),(i*.034,0,.215),.003,2,6)
    m.sockets['probe_origin']=gltf((0,0,.24+.015*l))

def imprint(m):
    l=m.level;w=.17+.06*l;d=.12+.035*l
    m.box('contact scanner base',(0,0,.025),(w,d,.050),1)
    m.box('empty sample contact plate',(0,-.005,.053),(w*.76,d*.68,.006),2)
    for x in (-w*.35,w*.35):m.box('sample retaining lip',(x,0,.06),(.008,d*.68,.012),3)
    m.body((0,d*.37,.10),(w*.80,.04,.08))
    m.screen((0,d*.37-.025,.10),(w*.56,.044))
    if m.tier==3:
        for x in (-w*.42,w*.42):m.rod('scan gantry column',(x,0,.04),(x,0,.24),.008,1,8)
        m.box('scanner gantry',(0,0,.24),(w,.035,.025),1)
        m.rod('downward optic barrel',(0,0,.228),(0,0,.200),.014,1,10)
        m.rod('downward scan lens',(0,0,.200),(0,0,.198),.011,10,10)
        m.sockets['scan_optic']=gltf((0,0,.198))
    m.sockets['sample_contact']=gltf((0,-.005,.057));m.features+=['Empty sample plate; no possessed object or spectral imprint baked into asset']

def chalk(m,deployed=False):
    l=m.level
    if deployed:
        r=.20+.08*l
        m.ring('chalk tracing',(0,0,.0015),r,.0025,12,16)
        for i in range(3+l):
            a=i*2*math.pi/(3+l);b=a+2*math.pi/(3+l)
            m.rod('chalk line',(r*.75*math.cos(a),r*.75*math.sin(a),.002),
                (r*.75*math.cos(b),r*.75*math.sin(b),.002),.002,12,4)
        m.features+=['Physical chalk marks only; no active ward/light effect baked in']
    else:
        w=.13+.035*l;case_base(m,w,.09,True)
        for i in range(3+2*l):
            x=(i-(2+2*l)/2)*.014
            m.rod('chalk stick',(x,-.026,.06),(x,.029,.06),.004,12,6)
        if m.tier==3:m.ring('portable tracing stencil',(0,.020,.12),.055,.003,2,12,True)

def frequency(m):
    l=m.level;w=.12+.035*l
    m.body((0,0,.080),(w,.055,.14))
    if m.tier==1:m.gauge((0,-.035,.100),.032)
    else:m.screen((0,-.035,.105),(w*.76,.065+.015*l))
    for i in range(2+l):m.knob(((i-(1+l)/2)*.028,-.036,.035),.008)
    for i in (-1,1):m.rod('audio input connector',(i*w*.30,0,.155),(i*w*.30,0,.17),.005,2,8)
    m.battery((0,.032,.05),(.07,.006,.045));m.label((0,-.036,.144),(w*.70,.017),0)

FACTORIES={
 'EMF_READER':emf,'THERMOMETER':thermometer,'SPIRIT_BOX':spirit_box,'FLASHLIGHT':torch,
 'UV_LIGHT':lambda m:torch(m,True),'GHOST_WRITING_BOOK':lambda m:book(m,m.state=='open'),
 'PHOTO_CAMERA':camera,'VIDEO_CAMERA':lambda m:camera(m,True),'DOTS_PROJECTOR':lambda m:projector(m,m.state=='deployed'),
 'LASER_GRID':lambda m:projector(m,m.state=='deployed'),'CRUCIFIX':cross,'FIRELIGHT':lambda m:firelight(m,m.state=='lit'),
 'IGNITER':lambda m:igniter(m,m.state=='lit'),'INCENSE':lambda m:incense(m,m.state=='burning'),
 'HEAD_GEAR':head_gear,'MOTION_SENSOR':motion_sensor,'PARABOLIC_MICROPHONE':microphone,
 'SALT':lambda m:salt(m,m.state=='deployed'),'SANITY_MEDICATION':medication,'SOUND_SENSOR':sound_sensor,
 'TRIPOD':lambda m:tripod(m,m.state=='folded'),'CLIPBOARDS':clipboard,'COMPUTER':lambda m:monitor(m,True),
 'OBJECTIVE_BOARD':board,'SANITY_MONITOR':monitor,'SITE_ACTIVITY_MONITOR':monitor,'SOUND_MONITOR':audio_monitor,
 'SITE_MAP':site_map,'ANCHOR_TRIANGULATOR':triangulator,'ECTOPLASM_SAMPLER':lambda m:assay(m,m.state=='open'),
 'RESONANCE_TUNER':resonance,'BAROMETRIC_PROBE':barometer,'SEISMIC_RECORDER':seismic,'SPECTRAL_PRISM':prism,
 'EMF_ARRAY':lambda m:array(m,False,m.state=='node'),'THERMAL_BEACON':lambda m:array(m,True,m.state=='node'),
 'RITUAL_ANCHOR_METER':ritual_meter,'WARD_STABILITY_PROBE':lambda m:ritual_meter(m,True),
 'OBJECT_IMPRINT_SCANNER':imprint,'CHALK_SIGIL_KIT':lambda m:chalk(m,m.state=='deployed'),
 'SPECTRAL_FREQUENCY_ANALYZER':frequency
}
STATES={'GHOST_WRITING_BOOK':['open'],'FIRELIGHT':['lit'],'IGNITER':['lit'],'INCENSE':['burning'],
 'SALT':['deployed'],'TRIPOD':['folded'],'ECTOPLASM_SAMPLER':['open'],'EMF_ARRAY':['node'],
 'THERMAL_BEACON':['node'],'CHALK_SIGIL_KIT':['deployed'],'DOTS_PROJECTOR':['deployed'],'LASER_GRID':['deployed']}

def materials(item):
    image=bpy.data.images.load(str(PROJECT/item['atlas']));image.pack()
    mat=bpy.data.materials.new('PSX '+item['id']);mat.use_nodes=True
    shader=mat.node_tree.nodes.get('Principled BSDF');shader.inputs['Roughness'].default_value=1
    node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=image;node.interpolation='Closest'
    mat.node_tree.links.new(node.outputs['Color'],shader.inputs['Base Color'])
    glass=mat.copy();glass.name='Tinted prism glass';glass.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.28
    glass.surface_render_method='DITHERED'
    return mat,glass

def existing_record(item,tier,name):
    file=RUNTIME/(name+'.glb');data=template(name)
    return dict(tier=tier,model=file.relative_to(PROJECT).as_posix(),existing_unchanged=True,
        sha256=hashlib.sha256(file.read_bytes()).hexdigest(),triangles=data['triangles'],dimensions_blender_z_up=xyz(data['dimensions']),
        source_model=name,license=('CC0 — Exploration Objects' if name.startswith(('exploration_','blender_sound_recorder_'))
                                  else 'Owner-licensed PSX Mega Pack; original game subset, see IMPORT_MANIFEST.md'),
        variants={},online_integration_status='not changed by this asset-only delivery')

def preserved_object(name,slot):
    before=set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(RUNTIME/(name+'.glb')))
    imported=[o for o in bpy.context.scene.objects if o not in before]
    meshes=[o for o in imported if o.type=='MESH']
    for obj in meshes:
        world=obj.matrix_world.copy()
        for vertex in obj.data.vertices:vertex.co=world@vertex.co
        obj.parent=None;obj.matrix_world.identity()
    for obj in imported:
        if obj.type!='MESH':bpy.data.objects.remove(obj,do_unlink=True)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes:obj.select_set(True)
    bpy.context.view_layer.objects.active=meshes[0]
    if len(meshes)>1:bpy.ops.object.join()
    obj=bpy.context.object;obj.name='Preserved '+name
    low=min(v.co.z for v in obj.data.vertices)
    obj.location=(slot*1.8,0,-low)
    return obj

def export(m,item,stage_index):
    parts=[]
    minimum=min(v.co.z for obj in m.parts for v in obj.data.vertices)
    shift=-minimum
    for obj in m.parts:
        parts.append(obj.name)
        for vertex in obj.data.vertices:vertex.co.z+=shift
    for screen in m.screens:
        for p in screen['corners_blender_z_up']:p[2]+=shift
        screen['corners_gltf_y_up']=[gltf(p) for p in screen['corners_blender_z_up']]
    for p in m.sockets.values():p[1]+=shift
    bpy.ops.object.select_all(action='DESELECT')
    for obj in m.parts:obj.select_set(True)
    bpy.context.view_layer.objects.active=m.parts[0]
    if len(m.parts)>1:bpy.ops.object.join()
    obj=bpy.context.object
    suffix='' if m.state=='default' else '_'+m.state
    name=f'blender_{m.id.lower()}_{m.tier}{suffix}'
    obj.name=name;obj['equipment_id']=m.id;obj['tier']=m.tier;obj['state']=m.state
    obj['forward']='Blender -Y / glTF +Z';obj['units']='metres'
    obj['part_names_json']=json.dumps(parts)
    obj.data.calc_loop_triangles();triangles=len(obj.data.loop_triangles)
    file=RUNTIME/(name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(file),export_format='GLB',use_selection=True,
        export_image_format='AUTO',export_normals=False,export_yup=True,export_extras=True)
    record=dict(tier=m.tier,state=m.state,model=file.relative_to(PROJECT).as_posix(),existing_unchanged=False,
        sha256=hashlib.sha256(file.read_bytes()).hexdigest(),triangles=triangles,
        dimensions_blender_z_up=xyz(obj.dimensions),texture_pixels=[256,256],materials=len(obj.data.materials),
        source_model=m.source,source_sha256=item.get('source_sha256'),
        license=('CC0 Exploration Objects components plus original procedural geometry' if m.source.startswith('exploration_')
                 else 'Owner-licensed PSX Mega Pack component plus original procedural geometry; game use only') if m.source else 'Original procedural geometry and texture',
        source_license_url='https://elbolilloduro.itch.io/exploration-objects' if m.source and m.source.startswith('exploration_') else None,
        editable=f'development/assets/equipment-catalog/blender/{m.id.lower()}.blend',
        component_vertex_groups=parts,display_surfaces=m.screens,sockets_gltf_y_up=m.sockets,features=list(dict.fromkeys(m.features)),
        online_integration_status='awaiting online code/packaging hookup; no gameplay behavior claimed')
    # Arrange the editable family scene after exporting zero-origin runtime meshes.
    obj.location=(stage_index*1.8,0,0)
    return record,obj

def render_family(item,objects):
    # Production contact sheet: three tier silhouettes on one sheet; no game build.
    if not objects:return
    scene=bpy.context.scene
    previous={obj:obj.location.copy() for obj in objects}
    width=max(obj.dimensions.x for obj in objects)
    spacing=width*1.50+.035
    for i,obj in enumerate(objects):obj.location.x=(i-(len(objects)-1)/2)*spacing
    bpy.context.view_layer.update()
    for obj in scene.objects:obj.hide_render=obj not in objects
    points=[obj.matrix_world@Vector(v) for obj in objects for v in obj.bound_box]
    lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)))
    center=(lo+hi)/2
    bpy.ops.object.camera_add(location=center+Vector((0,-2.4,1.1)))
    camera=bpy.context.object;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.type='ORTHO';camera.data.ortho_scale=max(hi.x-lo.x,(hi.z-lo.z)*2.4)*1.18+.10;scene.camera=camera
    scene.world=bpy.data.worlds.new('PSX asset studio');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.07,.085,.10,1)
    for position,energy,size in [(center+Vector((0,-2,3)),180,4),(center+Vector((-2,0,1)),80,3)]:
        bpy.ops.object.light_add(type='AREA',location=position);light=bpy.context.object
        light.data.energy=energy;light.data.size=size;light.rotation_euler=(center-position).to_track_quat('-Z','Y').to_euler()
    scene.render.engine='CYCLES';scene.cycles.samples=6
    scene.render.resolution_x=1024;scene.render.resolution_y=420;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(DEV/'previews'/f'{item["id"].lower()}.png')
    bpy.ops.render.render(write_still=True)
    for obj in list(scene.objects):
        if obj.type in ('CAMERA','LIGHT'):bpy.data.objects.remove(obj,do_unlink=True)
    for obj in scene.objects:obj.hide_render=False
    for obj,position in previous.items():obj.location=position

def main():
    for path in ('blender','previews'):(DEV/path).mkdir(parents=True,exist_ok=True)
    catalog=dict(schema_version=1,coordinates='New models: glTF +Y up, front +Z, metres; floor origin. Editable scenes: Blender +Z up, front -Y. Existing reused models retain their original transforms.',
        scope='Asset-only delivery. Gameplay, Java packaging, and tests left to online integration.',
        source_policy='Existing matching runtime models retained. New electronics derive from CC0 Exploration Objects; D.O.T.S. uses the owner-approved PSX vape shell. Other geometry is original.',
        items=[])
    selected=set(sys.argv[sys.argv.index('--')+1:]) if '--' in sys.argv else set()
    if '--previews-only' in selected:
        for item in BRIEF['items']:
            file=DEV/'blender'/f'{item["id"].lower()}.blend'
            if not file.exists():continue
            bpy.ops.wm.open_mainfile(filepath=str(file))
            objects=[o for o in bpy.context.scene.objects if o.type=='MESH' and abs(o.location.y)<.01]
            render_family(item,objects)
        return
    previous_catalog=json.loads((DEV/'equipment-assets.json').read_text()) if selected and (DEV/'equipment-assets.json').exists() else None
    for item in BRIEF['items']:
        if selected and item['id'] not in selected:continue
        bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
        output=dict(id=item['id'],label=item['label'],stages=[])
        if item['id']=='SOUND_RECORDER':
            for stage in item['stages']:output['stages'].append(existing_record(item,stage['tier'],stage['reuse']))
            catalog['items'].append(output);continue
        mat,glass=materials(item);display=[];editable_objects=[]
        for stage in item['stages']:
            t=stage['tier']
            if stage['reuse']:
                record=existing_record(item,t,stage['reuse'])
                # Place a real copy of the preserved asset in the editable/contact scene.
                obj=preserved_object(stage['reuse'],t);display.append(obj);editable_objects.append(obj)
            else:
                m=Model(item['id'],t,mat,glass,item['source']);FACTORIES[item['id']](m)
                record,obj=export(m,item,t);display.append(obj);editable_objects.append(obj)
                record['variants']={}
            for index,state in enumerate(STATES.get(item['id'],[])):
                if item['id']=='GHOST_WRITING_BOOK' and t==1:
                    record['variants']['open']=existing_record(item,t,'open_book_mp_1');continue
                m=Model(item['id'],t,mat,glass,item['source'],state);FACTORIES[item['id']](m)
                variant,obj=export(m,item,t);obj.location.y=1.4+index*1.4;editable_objects.append(obj)
                record['variants'][state]=variant
            output['stages'].append(record)
        # Model part names survive as vertex groups in compressed editable Blender sources.
        bpy.ops.wm.save_as_mainfile(filepath=str(DEV/'blender'/f'{item["id"].lower()}.blend'),compress=True)
        bpy.context.view_layer.update();render_family(item,display)
        catalog['items'].append(output)
        if not selected:(DEV/'equipment-assets.json').write_text(json.dumps(catalog,indent=2)+'\n')
        print('AUTHORED '+item['id'],flush=True)
    if previous_catalog:
        replacements={i['id']:i for i in catalog['items']}
        catalog['items']=[replacements.get(i['id'],i) for i in previous_catalog['items']]
    (DEV/'equipment-assets.json').write_text(json.dumps(catalog,indent=2)+'\n')
    print('FINISHED ASSETS: '+str(len(catalog['items']))+' categories',flush=True)

if __name__=='__main__':main()
