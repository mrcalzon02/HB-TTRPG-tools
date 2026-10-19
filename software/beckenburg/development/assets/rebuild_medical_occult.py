"""Source-preserving medical and ritual equipment production, Blender 5.

All source imports use one uniform scale. New forms have authored profiles and
material-specific, packed pixel textures. This script never builds the game.
"""
import bpy, math, random, json, hashlib, sys, copy
from pathlib import Path
from mathutils import Vector, Euler
sys.path.insert(0,str(Path(__file__).resolve().parent))
import rebuild_support as S

P=S.PROJECT;D=S.DEV;R=S.RUNTIME;CACHE=D/'source-cache/medical'
_original_source_path=S.source_path
S.source_path=lambda name: CACHE/(name+'.glb') if (CACHE/(name+'.glb')).exists() else _original_source_path(name)

def tex(name,color,kind='cloth'):
    key='Medical Ritual '+name
    old=bpy.data.materials.get(key)
    if old:return old
    mat=bpy.data.materials.new(key);mat.use_nodes=True
    bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.82
    if kind in ('metal','brass'):bs.inputs['Metallic'].default_value=.55;bs.inputs['Roughness'].default_value=.62
    im=bpy.data.images.new(key+' 128px diffuse',128,128);px=[];rng=random.Random(name)
    for y in range(128):
        for x in range(128):
            grain=rng.choice([-.045,-.025,0,.012,.03]);value=0
            if kind=='cloth':
                value=(.023 if x%3==0 else -.01)+(.02 if y%4==0 else 0)
                value-=.10 if x in (5,6,121,122) or y in (5,6,121,122) else 0
                value+=.11 if (x in (4,123) and y%6<3) or (y in (4,123) and x%6<3) else 0
                value-=.055*max(0,math.sin(x*.07+y*.11))
            elif kind=='leather':
                value=-.05 if (x*17+y*31)%89<4 else .015
                value+=.07 if (x<6 or x>121 or y<6 or y>121) else 0
                value+=.11 if (x in (7,120) and y%7<3) or (y in (7,120) and x%7<3) else 0
            elif kind=='wood':value=.065*math.sin(x*.39+math.sin(y*.08))+ .035*math.sin(x*.97+y*.025)
            elif kind=='herb':
                value=.07*math.sin(y*.38)+(.11 if abs((x-64)-math.sin(y*.10)*7)<2 else 0)
                value+=.06 if (x+y//2)%17==0 else 0
                value-=.06 if x<4 or x>124 else 0
            elif kind=='wax':value=.035*math.sin(x*.21)+.02*math.sin(x*.7+y*.03)-.05*(y/128)
            elif kind=='paper':value=.02*math.sin(y*.8)-(.07 if x<5 or y<5 or x>122 or y>122 else 0)
            elif kind=='salt':value=.10 if (x*3+y*7)%23<3 else -.015
            elif kind=='cork':value=-.15 if (x*13+y*23)%71<9 else .035
            elif kind=='brass':value=.06*math.sin(x*.16)*math.sin(y*.21)+(.1 if x<3 else 0)
            elif kind=='label':
                value=-.4 if (y in (26,27,38,39,50,51,62,63) and 17<x<100-(y%19)) else 0
                value-=.07 if x<5 or y<5 or x>122 or y>122 else 0
            elif kind=='metal':value=.03*math.sin(y*.55)+(.06 if x<3 else 0)-(.13 if (x*11+y*5)%181<3 else 0)
            elif kind=='chalk':value=.04*math.sin(y*.20)+.035*math.sin(x*.35+y*.15)
            else:value=.03*math.sin(x*.1+y*.09)
            px.extend([max(.005,min(1,c+grain+value)) for c in color]+[1])
    im.pixels.foreach_set(px);im.pack();node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=im;node.interpolation='Closest';mat.node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color']);return mat

class Kit:
    def __init__(self):self.parts=[];self.features=[]
    def add(self,o):self.parts.append(o);return o
    def src(self,n,size=None,loc=(0,0,0),rot=None):
        o=self.add(S.import_source(n,size=size,location=loc))
        if rot:
            matrix=Euler(rot,'XYZ').to_matrix()
            for v in o.data.vertices:v.co=matrix@v.co
            low=Vector([min(v.co[i] for v in o.data.vertices) for i in range(3)]);high=Vector([max(v.co[i] for v in o.data.vertices) for i in range(3)])
            origin=Vector(((low.x+high.x)/2,(low.y+high.y)/2,low.z))
            for v in o.data.vertices:v.co-=origin
        bpy.context.view_layer.update();self.features.append('Original '+n+' mesh, UVs and texture preserved; uniform scale only');return o
    def box(self,n,p,d,m,b=.002):return self.add(S.box(n,p,d,m,b))
    def rod(self,n,a,b,r,m,sides=8,end=None):return self.add(S.rod(n,a,b,r,m,sides,end))
    def mesh(self,n,v,f,m):return self.add(S.mesh(n,v,f,m))
    def lathe(self,n,p,m,segments=12,loc=(0,0,0)):return self.add(S.lathe(n,p,m,segments,loc))
    def tube(self,n,p,r,m,sides=6):
        for i,(a,b) in enumerate(zip(p,p[1:])):self.rod(n+str(i),a,b,r,m,sides)
    def ring(self,n,c,rad,tube,m,segments=16,vertical=False):
        x,y,z=c
        self.tube(n,[(x+rad*math.cos(i*2*math.pi/segments),y if vertical else y+rad*math.sin(i*2*math.pi/segments),z+rad*math.sin(i*2*math.pi/segments) if vertical else z) for i in range(segments+1)],tube,m,5)
    def slab(self,n,outline,depth,m,axis='z'):
        # Convex/concave silhouette extruded without changing its outline.
        v=[]
        for side in (-1,1):
            for a,b in outline:v.append((a,b,side*depth/2) if axis=='z' else (a,side*depth/2,b))
        count=len(outline);faces=[tuple(range(count-1,-1,-1)),tuple(range(count,count*2))]
        faces.extend((i,(i+1)%count,(i+1)%count+count,i+count) for i in range(count));return self.mesh(n,v,faces,m)
    def pouch(self,n,w,d,h,m,loc=(0,0,0)):
        # Tailored gusseted pouch, six corners per ring and rounded shoulders.
        rings=[(0,w*.40,d*.34),(.012,w*.50,d*.46),(h*.72,w*.49,d*.50),(h,w*.41,d*.36)]
        v=[]
        for z,x,y in rings:
            for xx,yy in [(-x*.78,-y),(x*.78,-y),(x,-y*.56),(x,y*.64),(-x,y*.64),(-x,-y*.56)]:v.append((xx+loc[0],yy+loc[1],z+loc[2]))
        faces=[tuple(range(5,-1,-1))]
        for j in range(3):
            for i in range(6):faces.append((j*6+i,j*6+(i+1)%6,(j+1)*6+(i+1)%6,(j+1)*6+i))
        return self.mesh(n,v,faces,m)
    def cross_mark(self,p,size,m):
        x,y,z=p;w,h=size;self.box('medical woven cross upright',(x,y,z),(w*.30,.001,h),m,.0003);self.box('medical woven cross arms',(x,y-.0002,z),(w,.001,h*.30),m,.0003)

def glass(name='old clear specimen glass'):
    m=tex(name,(.65,.73,.70),'metal');bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Metallic'].default_value=0;bs.inputs['Roughness'].default_value=.18;bs.inputs['Transmission Weight'].default_value=.8;bs.inputs['Alpha'].default_value=.24
    if hasattr(m,'surface_render_method'):m.surface_render_method='DITHERED'
    return m

def flame(k,p,size=.028):
    x,y,z=p;m=tex('warm flame',(1,.43,.05),'wax');bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Emission Color'].default_value=(1,.25,.01,1);bs.inputs['Emission Strength'].default_value=2
    profile=[(0,.001),(.007,.006),(.017,.004),(size,.0002)];k.lathe('low poly flame',profile,m,7,(x,y,z))

def health(t,state):
    k=Kit();cloth=tex('olive medical canvas',(.26,.29,.20));white=tex('unbleached dressing',(.77,.76,.65));green=tex('green medical mark',(.12,.26,.12));dark=tex('pouch binding',(.12,.14,.10),'leather');steel=tex('scissor steel',(.43,.46,.44),'metal')
    if t==1:
        k.src('bandage_mp_1',.12,rot=(0,0,-.20));k.features+=['Basic: original clean emergency bandage roll; design restoration 20 health']
    elif state=='default':
        w,d,h=(.18,.105,.070) if t==2 else (.245,.145,.095)
        k.pouch('closed tailored canvas first aid pouch',w,d,h,cloth)
        k.box('padded fitted top flap',(0,0,h), (w*.82,d*.72,.012),cloth,.005)
        x,y=w*.49,d*.50
        corners=[(-x*.78,-y),(x*.78,-y),(x,-y*.56),(x,y*.64),(-x,y*.64),(-x,-y*.56)]
        k.tube('sewn shoulder piping',[(xx,yy,h*.72) for xx,yy in corners+[corners[0]]],.0016,dark)
        patch_y=-d*.485
        k.box('cream medical identification patch',(0,patch_y,h*.41),(w*.39,.009,h*.55),white,.002)
        k.cross_mark((0,patch_y-.005,h*.41),(w*.22,h*.39),green)
        k.box('zipper rail',(0,-d*.367,h+.005),(w*.71,.003,.003),dark,.0007)
        k.rod('retained metal zipper pull',(w*.29,-d*.37,h+.005),(w*.32,-d*.40,h-.008),.002,steel,6)
        if t==3:
            for yy in (-d*.18,d*.18):
                pts=[(-w*.25,yy,h+.006),(-w*.25,yy,h+.025),(-w*.15,yy,h+.043),(w*.15,yy,h+.043),(w*.25,yy,h+.025),(w*.25,yy,h+.006)]
                for a,b in zip(pts,pts[1:]):k.rod('attached canvas carry handle',a,b,.0055,dark,6)
            k.features+=['Advanced: closed soft-sided first aid kit with attached handles, zipper and medical patch; design restoration 70 health']
        else:k.features+=['Improved: closed dressing pouch with medical patch and retained zipper; design restoration 40 health']
        k.features+=['Carried default is a closed coherent medical supply; separate open state exposes retained contents','Health supplies contain bandages, gauze and scissors independently of sanity medication']
    elif t==2:
        k.pouch('tailored open dressing pouch',.21,.115,.070,cloth)
        k.box('folded inner pocket lining',(0,.004,.025),(.173,.068,.026),cloth,.004)
        k.box('dark pocket opening',(0,.005,.068),(.17,.063,.006),dark,.005)
        k.src('bandage_mp_2',.125,(.038,-.004,.040),rot=(0,0,.28))
        k.box('folded sterile gauze',(-.052,.002,.078),(.060,.063,.030),white,.005)
        k.box('padded dressing divider',(-.052,.002,.049),(.062,.064,.028),cloth,.004)
        for x in (-.072,-.034):k.box('gauze packet seal',(x,.002,.095),(.002,.057,.001),dark,.0001)
        k.cross_mark((-.012,-.053,.035),(.045,.037),white)
        k.tube('bound upper pocket seam',[(-.093,-.040,.068),(-.079,-.048,.070),(.079,-.048,.070),(.093,-.034,.068)],.0017,dark)
        k.box('zipper slider',(.070,-.046,.071),(.012,.009,.005),steel,.001)
        k.features+=['Improved: dressed wound pouch with exposed gauze packet and compression bandage; design restoration 40 health']
    else:
        k.box('rolled out canvas first aid organizer',(0,0,.007),(.29,.20,.014),cloth,.014)
        for x in (-.13,.13):k.box('stitched outer binding',(x,0,.016),(.009,.18,.004),dark,.003)
        for x in (-.087,0,.086):k.pouch('tailored equipment pocket',.083,.086,.037,cloth,(x,.037,.012))
        for x in (-.087,0,.086):k.box('pocket interior support',(x,.036,.019),(.070,.066,.014),cloth,.003)
        k.src('bandage_mp_1',.11,(-.087,.012,.026),rot=(0,0,.10))
        k.box('folded secondary dressing packet',(.086,.032,.042),(.060,.065,.018),white,.004)
        k.box('sterile dressing packet',(0,.02,.042),(.063,.088,.012),white,.004)
        k.cross_mark((0,-.045,.030),(.032,.028),green)
        k.box('elastic tool band',(0,-.052,.035),(.240,.014,.008),dark,.002)
        for x in (-.025,.025):k.ring('trauma scissor finger ring',(x,-.068,.024),.014,.0024,steel,12)
        k.rod('scissor blade',(-.024,-.068,.025),(.020,-.002,.026),.0028,steel,5)
        k.rod('scissor blade',(.024,-.068,.025),(-.020,-.002,.026),.0028,steel,5)
        k.ring('carry loop',(0,.112,.017),.024,.005,dark,12)
        k.features+=['Advanced open organizer: retained dressing packets, pressure bandage and trauma scissors; no injection or sanity medicine','Design restoration 70 health']
    return k

def sanity(t,state):
    k=Kit()
    if t==1:k.src('pills_packet_1',.134);k.features+=['Basic sanity medication: sealed tablet blister; design restoration 18 sanity']
    elif t==2:k.src('pills_bottle_1',.114);k.features+=['Improved sanity medication: amber tablet bottle with child resistant cap; design restoration 36 sanity']
    else:
        # Correct prefilled medication source, kept at its original proportions.
        k.src('syringe_mp_1',.185,loc=(0,0,.013),rot=(0,0,-.14))
        rubber=tex('clinical injector cradle',(.20,.29,.26),'rubber');paper=tex('sterile injector wrapper',(.80,.81,.71),'paper')
        outline=[(-.040,-.112),(.040,-.112),(.045,-.100),(.045,.100),(.031,.113),(-.031,.113),(-.045,.100),(-.045,-.100)]
        o=k.slab('peel open sterile syringe carrier',outline,.005,paper);o.location.z=.004
        for y in (-.065,.055):k.box('flexible injector retaining saddle',(0,y,.018),(.045,.015,.012),rubber,.006)
        k.features+=['Advanced sanity medication: protected prefilled injector with opened sterile carrier; design restoration 65 sanity','Health and sanity supplies remain separate asset families']
    return k

def crucifix(t,state):
    k=Kit();brass=tex('aged brass cross',(.48,.37,.17),'brass');dark=tex('dark cross recess',(.14,.12,.08),'wood')
    if t<3:
        timber=k.src('cross_mp_2' if t==1 else 'cross_1',.32 if t==1 else .34,rot=(math.pi/2,0,0))
        if t==2:
            # Tiny brass pegs reinforce the actual imported timber cross.
            front=min(v.co.y for v in timber.data.vertices)
            for x,z in [(0,.235),(-.073,.243),(.073,.243),(0,.055)]:k.rod('forged reinforcement nail',(x,front+.002,z),(x,front-.003,z),.004,brass,6)
        k.features+=['Shaped timber cross with original weathered wood texture']
    else:
        # A continuous trefoil silhouette rather than intersecting cuboids.
        q=[(-.017,0),(.017,0),(.017,.192),(.070,.192),(.070,.179),(.096,.179),(.106,.192),(.106,.208),(.096,.222),(.070,.222),(.070,.209),(.017,.209),(.017,.283),(.031,.283),(.031,.309),(.017,.322),(-.017,.322),(-.031,.309),(-.031,.283),(-.017,.283),(-.017,.209),(-.070,.209),(-.070,.222),(-.096,.222),(-.106,.208),(-.106,.192),(-.096,.179),(-.070,.179),(-.070,.192),(-.017,.192)]
        k.slab('cast trefoil protective cross',q,.016,brass,axis='y')
        k.box('inset vertical dark patina',(0,-.0085,.158),(.009,.001,.275),dark,.001)
        k.box('inset transverse dark patina',(0,-.009,.200),(.167,.001,.007),dark,.001)
        for x,z in [(0,.304),(-.090,.200),(.090,.200),(0,.022)]:
            k.rod('silver terminal rivet',(x,-.009,z),(x,-.012,z),.005,tex('cross silver pin',(.58,.59,.52),'metal'),8)
        k.features+=['Advanced: cast metal trefoil cross, recessed patina channels and silver pins']
    points=[o.matrix_world@v.co for o in k.parts for v in o.data.vertices]
    lo=Vector([min(p[i] for p in points) for i in range(3)]);hi=Vector([max(p[i] for p in points) for i in range(3)])
    target=Vector((.18,.020,.28));factor=Vector([target[i]/(hi[i]-lo[i]) for i in range(3)])
    center=Vector(((lo.x+hi.x)/2,(lo.y+hi.y)/2,lo.z))
    for obj in k.parts:
        world=obj.matrix_world.copy()
        for v in obj.data.vertices:
            p=world@v.co-center;v.co=Vector([p[i]*factor[i] for i in range(3)])
        obj.matrix_world.identity();obj.data.update()
    k.features+=['All tiers have identical physical bounds: 180 x 20 x 280 mm; size does not upgrade']
    return k

def blank_pages(obj):
    mat=tex('blank antique book paper',(.72,.69,.57),'paper');obj.data.materials.append(mat);idx=len(obj.data.materials)-1
    # Replace source page-facing polygons only. Cover and binding retain UV/art.
    lo=min(v.co.z for v in obj.data.vertices)
    for f in obj.data.polygons:
        center=sum((obj.data.vertices[i].co for i in f.vertices),Vector())/len(f.vertices)
        if center.z>lo+.013 and f.normal.z>.25:f.material_index=idx

def books(t,state):
    k=Kit();leather=tex('oxblood journal strap',(.24,.10,.065),'leather');brass=tex('book brass clasp',(.43,.33,.15),'brass')
    if state=='open':
        obj=k.src('open_book_mp_1',.37 if t<3 else .42);blank_pages(obj)
        # Visible blank leaves follow a shallow valley at the sewn gutter.
        paper=tex('blank antique book paper',(.72,.69,.57),'paper');half=.175 if t<3 else .198;depth=.112 if t<3 else .127
        for sign in (-1,1):
            xs=[.004,half*.35,half*.72,half];zs=[.031,.044,.039,.025]
            v=[(sign*x,y,z) for y in (-depth,depth) for x,z in zip(xs,zs)]
            k.mesh('blank curved writing leaf',v,[(i,i+1,i+5,i+4) if sign==1 else (i+4,i+5,i+1,i) for i in range(3)],paper)
        k.features+=['Blank writable leaves without baked ghost-authored or printed marks','Source binding and cover artwork retained; page surface replaced with clean parchment']
    else:
        k.src('book_mp_2' if t<3 else 'book_mp_4',.24 if t<3 else .27)
        if t==3:
            k.box('leather closing strap',(.061,0,.050),(.021,.251,.005),leather,.002)
            k.box('brass folio clasp',(.061,-.122,.039),(.032,.015,.024),brass,.003)
            k.rod('wooden field pencil',(.109,-.095,.032),(.109,.088,.032),.004,tex('book pencil cedar',(.44,.27,.12),'wood'),6)
            for y in (-.050,.050):k.box('pencil retaining loops',(.098,y,.032),(.036,.011,.012),leather,.003)
        k.features+=['Bound writing journal with original textured cover and page edges']
    return k

def herb_bundle(k,t,burning=False,loc=(0,0,0)):
    herb=tex('dried sage leaves',(.31,.36,.23),'herb');leaf=tex('dried pale sage',(.43,.46,.31),'herb');stem=tex('herb stems',(.32,.27,.13),'wood');twine=tex('hemp binding',(.55,.45,.28),'cloth');rng=random.Random(91+t)
    length=.17 if t==1 else .19;radius=.022 if t==1 else .030
    # A dense tapered core of overlapping dried leaves prevents the bundle from
    # reading as a wire cage. Its centerline bends gently toward the burning end.
    rings=[(.014,.48),(.043,.86),(.082,1),(.127,.94),(length*.95,.65),(length*1.04,.36)]
    v=[];sides=11
    for j,(z,factor) in enumerate(rings):
        for i in range(sides):
            a=i*2*math.pi/sides;rr=radius*factor*(1+.10*math.sin(i*2.4+j*.9));v.append((loc[0]+rr*math.cos(a)+j*j*.00022,loc[1]+rr*math.sin(a)+j*j*.00045,loc[2]+z))
    faces=[]
    for j in range(len(rings)-1):
        for i in range(sides):faces.append((j*sides+i,j*sides+(i+1)%sides,(j+1)*sides+(i+1)%sides,(j+1)*sides+i))
    faces+=[tuple(range(sides-1,-1,-1)),tuple((len(rings)-1)*sides+i for i in range(sides))]
    core=k.mesh('dense curved taper of wrapped dried sage',v,faces,herb);core.data.materials.append(leaf)
    for f in core.data.polygons:f.material_index=1 if f.index%4==0 else 0
    for j in range(5):
        z=.028+j*length*.175
        for i in range(8):
            a=i*math.pi/4+j*.8;dx,dy=math.cos(a),math.sin(a);rr=radius*(.80 if j in (0,4) else 1.0);cx=loc[0]+dx*rr+j*j*.00022;cy=loc[1]+dy*rr+j*j*.00045;zz=loc[2]+z
            width=.006 if t==1 else .009
            k.mesh('overlapping pointed sage wrapping',[(cx-dy*width,cy+dx*width,zz),(cx+dy*width,cy-dx*width,zz+.006),(cx+dx*.004,cy+dy*.004,zz+.034),(cx+dx*.005,cy+dy*.005,zz+.014)],[(0,1,3),(1,2,3),(2,0,3)],leaf if (i+j)%3==0 else herb)
    # Stem curves taper upward; pointed leaves give a dry, irregular silhouette.
    for i in range(9 if t==1 else 14):
        a=i*2.399;rad=radius*math.sqrt((i+.5)/(9 if t==1 else 14));x=math.cos(a)*rad;y=math.sin(a)*rad
        points=[]
        for j in range(5):
            z=.018+j*length/4;points.append((loc[0]+x+math.sin(j*.8+i)*.005,loc[1]+y+j*j*.0006,loc[2]+z))
        k.tube('curved dried plant stem',points,.0015,stem,5)
        for j in range(1,5):
            px,py,pz=points[j];ang=a+j*1.1;dx=math.cos(ang);dy=math.sin(ang);span=.022+rng.random()*.015
            v=[(px,py,pz-.012),(px+dx*span*.45-dy*.007,py+dy*span*.45+dx*.007,pz-.001),(px+dx*span,py+dy*span,pz+.009),(px+dx*span*.45+dy*.007,py+dy*span*.45-dx*.007,pz+.002),(px+dx*span*.45,py+dy*span*.45,pz+.005)]
            k.mesh('pointed folded sage leaf',v,[(0,1,4),(1,2,4),(2,3,4),(3,0,4)],herb if (i+j)%3 else leaf)
    for z in (.046,.105,.145) if t>1 else (.065,.112):
        rr=radius*(.93 if z<.12 else .87)+.002
        pts=[(loc[0]+rr*math.cos(i*2*math.pi/14)+z*z*.10,loc[1]+rr*math.sin(i*2*math.pi/14)+z*z*.28,loc[2]+z+(i%2)*.001) for i in range(15)]
        k.tube('taut hemp smudge binding',pts,.002,twine,5)
    if burning:
        ash=tex('sage ash and embers',(.19,.16,.10),'herb')
        for i in range(5):
            a=i*1.9;k.rod('charred herb tip',(loc[0]+math.cos(a)*.018,loc[1]+.010+math.sin(a)*.016,loc[2]+length*.93),(loc[0]+math.cos(a)*.016,loc[1]+.013+math.sin(a)*.014,loc[2]+length*1.05),.004,ash,5)
        ember=tex('small smudge ember',(.57,.20,.045),'wax');bs=ember.node_tree.nodes.get('Principled BSDF');bs.inputs['Emission Color'].default_value=(.8,.09,.005,1);bs.inputs['Emission Strength'].default_value=.5
        k.rod('small glowing ember',(loc[0],loc[1]+.018,loc[2]+length),(loc[0],loc[1]+.018,loc[2]+length+.005),.006,ember,6)

def incense(t,state):
    k=Kit();burn=state=='burning'
    if t<3:herb_bundle(k,t,burn);k.features+=['Curved and tapered real leaf-and-stem smudge bundle with hand tied hemp; no metal canister','Basic: loose sage bundle' if t==1 else 'Improved: dense, close-bound mixed-herb smudge torch']
    else:
        bronze=tex('censer oxidized bronze',(.30,.28,.15),'brass');wood=tex('censer turned wooden handle',(.27,.17,.08),'wood');ash=tex('censer herb bed',(.28,.25,.13),'herb')
        k.lathe('low handled ritual brazier',[(0,.034),(.007,.040),(.014,.048),(.039,.057),(.044,.058),(.046,.052),(.025,.039)],bronze,12)
        k.lathe('loose dry herb bed',[(.025,.038),(.034,.045),(.036,.035)],ash,12)
        for i in range(12):
            a=i*math.pi/6;k.rod('pierced brass rim rivet',(.056*math.cos(a),.056*math.sin(a),.040),(.058*math.cos(a),.058*math.sin(a),.041),.002,wood,5)
        k.rod('heat isolated handle socket',(.045,0,.026),(.080,0,.029),.008,bronze,8)
        k.rod('tapered wooden censer handle',(.076,0,.029),(.175,0,.034),.011,wood,8,end=.008)
        herb_bundle(k,1,burn,loc=(0,0,.006))
        k.features+=['Advanced: reusable bronze herb brazier with heat isolated wood handle and replaceable handbound smudge','Burning variant has charred tips and restrained ember geometry; smoke remains a runtime effect']
    return k

def firelight(t,state):
    k=Kit();wax=tex('dripped beeswax',(.75,.65,.40),'wax');iron=tex('blackened candle iron',(.14,.15,.13),'metal');brass=tex('lamp burnished brass',(.43,.32,.14),'brass');wick=tex('carbon wick',(.075,.062,.04),'wood')
    if t<3:
        base=.004 if t==1 else .028;h=.15 if t==1 else .105;rad=.017 if t==1 else .027
        if t==2:
            k.lathe('candle carrying drip dish',[(0,.045),(.006,.060),(.014,.061),(.020,.050),(.025,.025)],iron,12)
            k.ring('finger loop',(.070,0,.040),.029,.004,iron,16,True)
        k.lathe('tapered wax candle',[(base,rad),(base+h*.66,rad*.95),(base+h*.97,rad*.91),(base+h,rad*.83),(base+h-.005,rad*.35)],wax,11)
        for i in range(6 if t==2 else 4):
            a=i*2.399;rr=rad*.95;z=base+h-.005;k.rod('hardened wax run',(rr*math.cos(a),rr*math.sin(a),z),((rr+.002)*math.cos(a),(rr+.002)*math.sin(a),z-.016-(i%3)*.008),.003,wax,5,end=.0017)
        tip=base+h+.007;k.rod('visible cotton wick',(0,0,base+h-.005),(0,0,tip),.0014,wick,5)
        if state=='lit':flame(k,(0,0,tip),.032)
    else:
        k.lathe('storm lamp oil reservoir',[(0,.040),(.008,.047),(.037,.045),(.050,.028),(.057,.026)],brass,12)
        k.lathe('wick burner collar',[(.055,.019),(.067,.022),(.072,.015)],iron,12)
        k.lathe('faceted hurricane glass chimney',[(.065,.031),(.073,.036),(.123,.037),(.169,.025),(.204,.023),(.207,.026),(.209,.025)],glass('smoked hurricane glass'),12)
        for x in (-.043,.043):k.tube('curved lamp guard',[(x,0,.035),(x*1.22,0,.077),(x*1.10,0,.168),(x*.55,0,.212)],.004,iron)
        k.lathe('vented lamp crown',[(.209,.027),(.215,.033),(.226,.025),(.234,.013)],iron,12)
        k.ring('hanging handle',(0,0,.244),.052,.0033,iron,16,True)
        k.rod('lamp wick',(0,0,.070),(0,0,.078),.003,wick,6)
        k.rod('wick adjustment spindle',(.015,-.005,.061),(.043,-.005,.061),.003,brass,6)
        k.rod('wick adjustment wheel',(.044,-.005,.061),(.048,-.005,.061),.009,iron,10)
        if state=='lit':flame(k,(0,0,.078),.037)
    k.features+=['Basic: taper with irregular hardened drips' if t==1 else 'Improved: stable candle dish and practical finger loop' if t==2 else 'Advanced: refillable oil storm lamp, faceted chimney, protective cage and adjustable wick','Separate unlit and lit meshes; illumination is supplied by runtime']
    return k

def igniter(t,state):
    k=Kit();wood=tex('match pale wood',(.62,.49,.29),'wood');red=tex('match head phosphorus',(.36,.13,.08),'chalk');steel=tex('jet lighter brushed steel',(.36,.39,.36),'metal');brass=tex('jet lighter warm brass',(.43,.31,.13),'brass');rubber=tex('jet ignition grip',(.16,.17,.13),'rubber')
    if t==1:
        k.src('matchbox_1',.075);k.rod('wood match resting on matchbox',(-.030,-.009,.020),(.026,.013,.020),.0016,wood,4)
        k.rod('match striking head',(.024,.012,.020),(.032,.016,.020),.0025,red,6)
        if state=='lit':flame(k,(.030,.015,.022),.025)
    elif t==2:
        k.src('lighter_mp_1',.105,rot=(math.pi/2,0,0))
        if state=='lit':flame(k,(0,-.001,.102),.027)
    else:
        k.lathe('refillable metal jet lighter body',[(0,.015),(.006,.019),(.080,.019),(.089,.015),(.100,.012)],brass,10)
        k.lathe('ribbed heat resistant grip',[(.013,.0195),(.065,.0195)],rubber,10)
        for z in (.025,.038,.051):k.ring('grip grooves',(0,0,z),.0198,.0012,steel,10)
        k.lathe('slim burner neck',[(.100,.007),(.130,.007),(.138,.010),(.155,.010),(.159,.006)],steel,10)
        k.box('hinged ignition safety paddle',(.021,0,.084),(.012,.024,.032),rubber,.004)
        k.rod('paddle hinge',(.019,-.015,.095),(.019,.015,.095),.003,steel,6)
        k.rod('refill valve',(0,0,0),(0,0,.003),.005,steel,8)
        if state=='lit':flame(k,(0,0,.158),.035)
    k.features+=['Basic: original matchbox and wood match' if t==1 else 'Improved: original textured disposable flint lighter' if t==2 else 'Advanced: refillable long-neck windproof jet lighter with safety paddle and fuel valve','No flame baked into default mesh; separate lit state']
    return k

def salt(t,state):
    k=Kit();cloth=tex('raw linen salt sack',(.62,.57,.42));saltmat=tex('coarse granular salt',(.77,.78,.70),'salt');twine=tex('salt sack tie',(.32,.25,.13),'cloth');ceramic=tex('worn enamel salt shaker',(.66,.69,.60),'ceramic');metal=tex('shaker tin',(.41,.43,.39),'metal');black=tex('salt perforations',(.075,.08,.065),'metal')
    if state=='deployed':
        # One continuous raised mound, not the carried dispenser plus a few dots.
        rng=random.Random(66);sections=28;rows=[];vertices=[]
        for i in range(sections+1):
            u=i/sections;x=u-.5;center=.006*math.sin(u*7.2)+rng.uniform(-.0015,.0015)
            width=.056*(.88+.12*math.sin(u*19))*max(.10,math.sin(math.pi*u)**.18)
            taper=max(.02,math.sin(math.pi*u)**.24);height=.048*taper*(.91+.09*math.sin(u*37))
            row=[(x,center-width,0),(x,center-width*.55,height*.52),(x,center,height),(x,center+width*.55,height*.48),(x,center+width,0)]
            rows.append((center,width,height));vertices.extend(row)
        faces=[]
        for j in range(sections):
            for i in range(4):faces.append((j*5+i,(j+1)*5+i,(j+1)*5+i+1,j*5+i+1))
            faces.append((j*5,(j+1)*5,(j+1)*5+4,j*5+4))
        faces.extend([(4,3,2,1,0),tuple(sections*5+i for i in range(5))])
        mound=k.mesh('continuous mounded line of deployed salt',vertices,faces,saltmat)
        mound.data.materials.append(tex('salt mound shaded crystal faces',(.59,.62,.56),'salt'))
        for face in mound.data.polygons:face.material_index=1 if face.index%5 in (0,3,4) else 0
        for j in range(110):
            u=.02+rng.random()*.96;index=min(sections-1,int(u*sections));f=u*sections-index
            center,width,height=[rows[index][a]*(1-f)+rows[index+1][a]*f for a in range(3)]
            offset=(rng.random()-.5)*width*1.55;ratio=abs(offset)/width
            h=height*(1-ratio*.48/.55) if ratio<=.55 else height*.50*(1-(ratio-.55)/.45)
            r=.0014+rng.random()*.0015
            k.lathe('embedded coarse salt crystal',[(0,r*.8),(.002,r),(.004,.0002)],saltmat,5,(u-.5,center+offset,max(0,h-.002)))
        k.features+=['Deployed material only: continuous 1 metre mounded salt line, approximately 11 cm wide and 5 cm high, with tapered irregular edges and granular crest','No sack, shaker, dispenser or carried inventory object included in the deployed model']
        return k
    if t==1:
        o=k.lathe('filled soft gathered salt sack',[(0,.025),(.008,.043),(.043,.049),(.087,.045),(.108,.030),(.125,.014),(.142,.024),(.149,.026)],cloth,11)
        for v in o.data.vertices:v.co.y*=.78;v.co.x+=.003*math.sin(v.co.z*30)
        k.ring('knotted twine neck',(0,0,.126),.015,.002,twine,12)
        k.tube('loose cord knot',[(.012,-.008,.126),(.035,-.014,.123),(.036,-.010,.111),(.018,-.009,.125),(.025,-.020,.100)],.0017,twine)
    elif t==2:
        k.lathe('refillable enamel salt shaker',[(0,.030),(.006,.034),(.090,.034),(.106,.026),(.114,.026)],ceramic,12)
        k.lathe('perforated tin dispensing cap',[(.109,.028),(.120,.030),(.124,.027)],metal,12)
        for x,y in [(-.009,0),(.009,0),(0,-.009),(0,.009),(0,0)]:k.rod('cap perforation',(x,y,.124),(x,y,.1245),.0028,black,6)
        k.box('salt paper label',(0,-.0345,.054),(.041,.001,.037),tex('salt shaker label',(.72,.72,.62),'label'),.001)
    else:
        plastic=tex('expedition salt dispenser',(.39,.43,.32),'rubber');orange=tex('salt spout latch',(.60,.31,.12),'paint')
        k.lathe('contoured field salt dispenser',[(0,.043),(.009,.048),(.050,.046),(.115,.032),(.143,.029),(.154,.026)],plastic,10)
        k.lathe('threaded broad pour collar',[(.142,.029),(.149,.034),(.160,.034),(.165,.028)],metal,10)
        k.box('pour lip',(.031,0,.158),(.047,.040,.012),ceramic,.006)
        k.box('hinged pour closure',(.030,0,.166),(.052,.044,.006),orange,.004)
        k.tube('molded handle',[(-.032,0,.119),(-.072,0,.114),(-.077,0,.048),(-.043,0,.033)],.008,plastic,8)
        for z in (.035,.055,.075):k.box('embossed fill graduation',(.014,-.043,z),(.014,.001,.0015),ceramic,.0002)
    k.features+=['Basic: knotted linen salt sack' if t==1 else 'Improved: refillable perforated shaker' if t==2 else 'Advanced: handled field dispenser with controlled pour spout and fill graduations']
    return k

def swab(k,x,y,z,length=.15):
    stem=tex('sterile swab shaft',(.55,.52,.40),'wood');cotton=tex('swab cotton fibers',(.80,.81,.72),'cloth');k.rod('wooden sterile swab shaft',(x,y,z),(x,y+length,z),.0014,stem,6);k.rod('dense cotton sampling tip',(x,y+length-.005,z),(x,y+length+.021,z),.0044,cotton,7,end=.003)

def specimen(k,p,dropper=False):
    x,y,z=p;clear=glass();cap=tex('specimen screw cap',(.21,.27,.23),'rubber');label=tex('specimen blank field label',(.72,.75,.64),'label')
    k.lathe('graduated specimen glass vial',[(0,.011),(.003,.014),(.060,.014),(.068,.010),(.074,.010),(.074,.0085),(.068,.0085),(.006,.012)],clear,10,(x,y,z))
    k.lathe('ribbed specimen screw closure',[(.071,.012),(.084,.012)],cap,10,(x,y,z))
    if dropper:k.lathe('rubber dropper bulb',[(.084,.007),(.103,.009),(.112,.005)],cap,9,(x,y,z))
    k.box('write on specimen label',(x,y-.0145,z+.036),(.020,.001,.031),label,.001)
    for dz in (.021,.030,.039,.048,.057):k.box('vial volume tick',(x+.008,y-.012,z+dz),(.005,.001,.001),cap,.0001)

def ectoplasm(t,state):
    k=Kit();paper=tex('sterile swab paper',(.71,.74,.63),'paper');cloth=tex('specimen field roll',(.25,.32,.27));rubber=tex('assay dark rubber',(.12,.20,.17),'rubber');ceramic=tex('neutral assay polymer',(.69,.74,.67),'ceramic')
    if t==1:
        k.box('opened sterile swab peel sleeve',(0,0,.002),(.031,.190,.004),paper,.005);swab(k,0,-.083,.008,.147)
        k.box('folded sterile wrapper lip',(0,-.091,.008),(.032,.021,.009),paper,.002)
        if state!='open':k.box('sealed sterile wrapper top',(0,0,.012),(.030,.189,.003),paper,.004)
    elif t==2:
        k.pouch('tailored swab specimen holder',.083,.052,.071,cloth)
        specimen(k,(-.018,0,.025))
        stem=tex('sterile swab shaft',(.55,.52,.40),'wood');cotton=tex('swab cotton fibers',(.80,.81,.72),'cloth')
        k.rod('upright retained swab',(.026,.007,.014),(.026,.007,.151),.0014,stem,6)
        k.rod('upright cotton sampling tip',(.026,.007,.144),(.026,.007,.171),.0044,cotton,7,end=.003)
        k.box('elastic specimen retaining band',(-.017,-.022,.058),(.040,.006,.013),rubber,.003)
        k.box('swab retaining loop',(.026,.004,.060),(.014,.014,.012),rubber,.003)
        if state=='open':
            k.box('clean opened sampling mat',(0,0,.002),(.157,.100,.004),paper,.006)
            for o in k.parts:
                if 'ribbed specimen screw closure' in o.name:
                    for v in o.data.vertices:v.co+=Vector((.080,0,-.092))
    else:
        k.box('folded field assay mat',(0,0,.004),(.20,.18,.008),cloth,.012)
        specimen(k,(-.063,.033,.008),True)
        # Correct slim lateral-flow assay body, with recessed neutral result and sample well.
        k.box('lateral flow assay cartridge',(-.025,.003,.015),(.039,.129,.018),ceramic,.009)
        k.box('recessed unmarked assay window',(-.025,.022,.0245),(.020,.045,.001),rubber,.002)
        k.box('blank result membrane',(-.025,.022,.0252),(.015,.037,.001),paper,.001)
        k.lathe('round sample well',[(.025,.007),(.028,.007),(.028,.0045),(.025,.0045)],rubber,10,(-.025,-.035,0))
        metal=tex('field microscope alloy',(.32,.36,.32),'metal')
        k.box('compact microscope shaped foot',(.045,.033,.018),(.070,.078,.020),rubber,.009)
        k.tube('continuous curved microscope C arm',[(.045,.055,.020),(.045,.064,.047),(.045,.064,.117),(.045,.046,.138),(.045,.018,.128)],.008,metal,8)
        k.box('specimen slide support stage',(.045,.018,.061),(.055,.045,.007),metal,.004)
        k.rod('specimen stage support',(.045,.052,.060),(.045,.019,.060),.007,metal,8)
        k.rod('downward microscope objective',(.045,.018,.128),(.045,.018,.080),.009,rubber,10,end=.005)
        k.rod('angled ocular tube',(.045,.018,.128),(.045,.045,.168),.009,metal,10)
        k.rod('rubber microscope eyecup',(.045,.042,.163),(.045,.049,.176),.012,rubber,10)
        k.rod('focus wheel spindle',(.045,.061,.101),(.068,.061,.101),.003,metal,8)
        k.rod('knurled focus wheel',(.064,.061,.101),(.071,.061,.101),.011,rubber,10)
        k.rod('substage illuminator',(.045,.017,.028),(.045,.017,.038),.011,ceramic,10)
        swab(k,.077,-.074,.011,.137)
        for y in (-.035,.030):k.box('swab elastic retaining loop',(.077,y,.012),(.013,.009,.008),rubber,.002)
        k.box('glass specimen slide',(-.057,-.051,.0095),(.055,.025,.003),glass('glass slide'),.001)
        if state=='open':
            for o in k.parts:
                if 'ribbed specimen screw closure' in o.name or 'rubber dropper bulb' in o.name:
                    for v in o.data.vertices:v.co+=Vector((.054,0,-.071))
        k.features+=['Advanced: compact field microscope with curved arm, focus wheel, ocular tube, objective and supported specimen stage; dropper vial, sterile swab and assay cassette','Result window and slide are deliberately blank; no evidence or detection outcome baked into model']
    k.features+=['Basic: sterile swab and peeled wrapper' if t==1 else 'Improved: labelled screw-cap specimen tube in a tailored holder' if t==2 else 'Separate sampling and assay tools with physical supplies']
    if state=='open':k.features+=['Open sampling layout; closures are separate named editable components before export']
    return k

def chalk(t,state):
    k=Kit();white=tex('worn field chalk',(.78,.77,.65),'chalk');paper=tex('chalk paper sleeve',(.55,.52,.37),'paper');leather=tex('chalk maker leather',(.31,.22,.12),'leather');brass=tex('sigil stencil brass',(.46,.35,.16),'brass')
    if state=='deployed':
        radius=.35
        k.ring('chalk tracing on floor',(0,0,.002),radius,.002,white,64)
        points=[(radius*math.sin(i*4*math.pi/5),radius*math.cos(i*4*math.pi/5),.002) for i in range(6)]
        k.tube('chalk stencil tracing on floor',points,.002,white,5)
        k.features+=['Deployed chalk markings only; no chalk sticks, sleeve, tool roll, compass or brass stencil included','Floor tracing follows the carried stencil outline; actual ward behavior remains online integration']
        return k
    if t==1:
        k.box('folded chalk paper sleeve',(0,-.015,.009),(.047,.058,.018),paper,.004)
        for i in range(3):k.rod('chipped chalk stick',((i-1)*.014,-.040,.013),((i-1)*.014,.044+(i%2)*.009,.013),.006,white,6,end=.005)
    elif t==2:
        k.box('opened stitched chalk tool roll',(0,0,.004),(.185,.135,.008),leather,.010)
        for x in (-.060,-.032):k.rod('chalk maker stick',(x,-.042,.013),(x,.047,.013),.007,white,7,end=.0055)
        k.box('elastic chalk keeper',(-.046,-.018,.020),(.060,.016,.007),tex('chalk elastic binding',(.16,.14,.09),'cloth'),.003)
        k.rod('marking compass left leg',(.032,.048,.012),(.003,-.040,.012),.0025,brass,6)
        k.rod('marking compass right leg',(.032,.048,.012),(.067,-.038,.012),.0025,brass,6)
        k.rod('compass hinge',(.032,.048,.009),(.032,.048,.019),.006,brass,8)
        k.tube('leather closing tie',[(.091,0,.008),(.119,-.01,.005),(.137,-.040,.003)],.003,leather)
    else:
        # A real open stencil: rings and five connected brass bars; empty areas stay empty.
        k.ring('stencil outer ring',(0,0,.004),.085,.0035,brass,20)
        k.ring('stencil inner ring',(0,0,.004),.074,.0016,brass,20)
        points=[(.073*math.sin(i*4*math.pi/5),.073*math.cos(i*4*math.pi/5),.004) for i in range(6)]
        k.tube('five point stencil bars',points,.0023,brass,5)
        for x in (-.081,.081):k.box('stencil finger lifting tab',(x,-.060,.004),(.026,.029,.008),brass,.004)
        k.rod('stencil chalk holder',(.111,-.063,.010),(.111,.048,.010),.008,leather,8)
        k.rod('exposed chalk stylus',(.111,.040,.010),(.111,.077,.010),.0055,white,6,end=.0035)
        for y in (-.040,.040):k.box('stencil stylus retaining bracket',(.095,y,.007),(.040,.009,.013),brass,.002)
        k.features+=['Advanced: physically open brass tracing stencil, lifting tabs, replaceable chalk stylus; no solid disk pretending to be a sigil']
    k.features+=['Basic: paper sleeve of chalk sticks' if t==1 else 'Improved: chalk maker roll with adjustable marking compass' if t==2 else 'Practical reusable tracing stencil kit']
    return k

FAMILIES=[('HEALTH_SUPPLIES','Health supplies',health,['open']),('SANITY_MEDICATION','Sanity medication',sanity,[]),('CRUCIFIX','Protective cross',crucifix,[]),('GHOST_WRITING_BOOK','Ghost writing book',books,['open']),('INCENSE','Incense and herb brazier',incense,['burning']),('FIRELIGHT','Firelight',firelight,['lit']),('IGNITER','Igniter',igniter,['lit']),('SALT','Salt',salt,['deployed']),('CHALK_SIGIL_KIT','Chalk and sigil kit',chalk,['deployed']),('ECTOPLASM_SAMPLER','Ectoplasm sampler',ectoplasm,['open'])]

def preserved_record(item,tier,name):
    path=R/(name+'.glb');o=S.import_source(name);o.data.calc_loop_triangles();bpy.context.view_layer.update()
    rec=dict(tier=tier,state='default',model=path.relative_to(P).as_posix(),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),existing_unchanged=True,triangles=len(o.data.loop_triangles),dimensions_blender_z_up=list(o.dimensions),source_model=name,variants={},editable=f'development/assets/equipment-catalog/blender/{item.lower()}.blend',features=['Existing matching game source retained byte-for-byte'],license='Owner-provided PSX Mega Pack; game subset only',online_integration_status='Existing matching asset retained')
    if item=='CRUCIFIX':
        matrix=Euler((math.pi/2,0,0),'XYZ').to_matrix()
        for v in o.data.vertices:v.co=matrix@v.co
        low=min(v.co.z for v in o.data.vertices)
        for v in o.data.vertices:v.co.z-=low
        bpy.context.view_layer.update()
    return rec,o

def main():
    selected=set(sys.argv[sys.argv.index('--')+1:]) if '--' in sys.argv else set();items=[]
    for item,label,fn,states in FAMILIES:
        if selected and item not in selected:continue
        S.reset();output=dict(id=item,label=label,stages=[]);all_objects=[];display=[];variants=[]
        for tier in (1,2,3):
            # Preserve established matching source paths; publish additional authored tiers.
            if item=='GHOST_WRITING_BOOK' and tier==1:rec,obj=preserved_record(item,tier,'book_mp_1')
            else:
                k=fn(tier,'default');rec,obj=S.finish(item,tier,k.parts,features=k.features)
            rec['tier_name']=['Basic','Improved','Advanced'][tier-1];rec['variants']={}
            if item=='HEALTH_SUPPLIES':rec['design_health_restoration']=[20,40,70][tier-1]
            if item=='SANITY_MEDICATION':rec['design_sanity_restoration']=[18,36,65][tier-1]
            output['stages'].append(rec);display.append(obj);all_objects.append(obj)
            for state in ([] if item=='HEALTH_SUPPLIES' and tier==1 else states):
                if item in ('SALT','CHALK_SIGIL_KIT') and state=='deployed' and tier>1:
                    v=copy.deepcopy(output['stages'][0]['variants'][state]);v['tier']=tier;rec['variants'][state]=v
                    continue
                k=fn(tier,state);v,o=S.finish(item,tier,k.parts,state,features=k.features);rec['variants'][state]=v;all_objects.append(o);variants.append(o)
        # Render before arranging the edit scene; source originals are normalized for preview only.
        view=(0,-2.5,1.8) if item not in ('CRUCIFIX','FIRELIGHT','IGNITER','INCENSE') else (0,-2.5,1.10)
        S.render_family(item,display,view=view)
        if variants:S.render_family(item,variants,path=D/'previews'/f'{item.lower()}_{states[0]}.png',view=view)
        S.save_family(item,all_objects);items.append(output);print('REBUILT MEDICAL '+item,flush=True)
    target=D/'rebuild-medical.json'
    if selected and target.exists():
        old=json.loads(target.read_text());repl={i['id']:i for i in items};items=[repl.pop(i['id'],i) for i in old['items']]+list(repl.values())
        old_sources={s['source']:s for s in old.get('sources',[])};old_sources.update(S.SOURCE_LOG);S.SOURCE_LOG.clear();S.SOURCE_LOG.update(old_sources)
    provenance_path=CACHE/'provenance.json'
    if provenance_path.exists():
        originals={s['name']:s for s in json.loads(provenance_path.read_text(encoding='utf-8-sig'))}
        for key,record in list(S.SOURCE_LOG.items()):
            original=originals.get(record['name'])
            if original:
                if original['sha256']!=record['sha256']:raise RuntimeError('Archive/cache hash mismatch: '+record['name'])
                record['working_copy']=record['source'];record['source']=original['source'];record['policy']='Owner-provided PSX Mega Pack original, uniformly scaled with original UVs and materials preserved'
                del S.SOURCE_LOG[key];S.SOURCE_LOG[original['source']]=record
    S.write_fragment('rebuild-medical.json',items)

if __name__=='__main__':main()
