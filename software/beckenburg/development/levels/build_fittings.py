"""Measured environment fittings. Blender Z-up; glTF Y-up; all mounts retain origins."""
import bpy, sys, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'development/assets'))
import rebuild_support as s
OUT=ROOT/'development/levels/blender';OUT.mkdir(parents=True,exist_ok=True)
LOG=[]

def native(name,file):
    mat=bpy.data.materials.new(name);mat.use_nodes=True
    im=bpy.data.images.load(str(ROOT/'assets/runtime/level-textures'/file));im.pack()
    node=mat.node_tree.nodes.new('ShaderNodeTexImage');node.image=im;node.interpolation='Closest'
    mat.node_tree.links.new(node.outputs['Color'],mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'])
    return mat

def init():
    s.reset()
    return dict(wood=native('Original oak grain','wall_1_1.png'),stone=native('Original worn counter','floor_ceiling_1_1.png'),
        enamel=s.material('Aged ivory enamel',(.68,.65,.55),'ceramic'),metal=s.material('Tarnished nickel',(.32,.34,.32),'metal'),
        glass=s.material('Frosted warm glass',(.76,.68,.46),'ceramic'),dark=s.material('Hob iron',(.055,.062,.066),'metal'))

def bowl(name,rx,ry,height,z,mat,loc=(0,0)):
    # Outer lip, rolled rim, descending inner basin and bottom; actual open concavity.
    rings=[(rx*.88,ry*.87,z-height),(rx,ry,z-.025),(rx,ry,z),(rx-.028,ry-.028,z+.008),
        (rx-.052,ry-.052,z-.025),(rx*.64,ry*.60,z-height*.78),(rx*.34,ry*.30,z-height*.93)]
    verts=[(loc[0]+a*math.cos(i*math.tau/24),loc[1]+b*math.sin(i*math.tau/24),zz) for a,b,zz in rings for i in range(24)]
    faces=[]
    for r in range(len(rings)-1):
        for i in range(24):faces.append((r*24+i,r*24+(i+1)%24,(r+1)*24+(i+1)%24,(r+1)*24+i))
    faces.append(tuple((len(rings)-1)*24+i for i in range(24)))
    return s.mesh(name,verts,faces,mat)

def tap(x,y,z,mat):
    return s.tube('Arched fitted faucet',[(x,y,z),(x,y,z+.20),(x,y-.045,z+.26),(x,y-.13,z+.26),(x,y-.17,z+.20)],.016,mat,8)

def cabinet(name,x,width,m):
    parts=[s.box(name+' carcass',(x,0,.46),(width,.59,.80),m['wood'],.012),
        s.box(name+' recessed toe kick',(x,.015,.055),(width-.07,.49,.11),m['dark'])]
    for xx in [x-width/4,x+width/4]:
        parts.extend([s.box(name+' framed door',(xx,-.307,.45),(width/2-.025,.035,.68),m['wood'],.012),
            s.box(name+' recessed panel',(xx,-.331,.45),(width/2-.115,.013,.51),m['wood'],.006),
            s.rod(name+' handle',(xx+.07,-.36,.66),(xx+.07,-.36,.76),.012,m['metal'],8)])
    return parts

def export(name,parts,ceiling=False):
    obj=s.join(parts,name);bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    obj['mount_origin']='ceiling plane Z=0; extends downward' if ceiling else 'floor standing plane Z=0; centre XY'
    path=ROOT/'assets/runtime/models'/(name+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_yup=True,export_extras=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(name+'.blend')),compress=True)
    obj.data.calc_loop_triangles();LOG.append(dict(id=name,triangles=len(obj.data.loop_triangles),dimensions=list(obj.dimensions),mount=obj['mount_origin'],bytes=path.stat().st_size))
    s.render_family(name,[obj],path=ROOT/'development/levels/previews'/(name+'.png'),view=(2.5,-4,2.8))

def kitchen():
    m=init();p=cabinet('Sink cabinet',-.60,1.18,m)+cabinet('Cooking cabinet',.60,1.18,m)
    # Counter surrounds the basin rather than covering it with an opaque slab.
    for center,size in [((.60,0,.895),(1.22,.65,.05)),((-.60,.25,.895),(1.18,.15,.05)),((-.60,-.25,.895),(1.18,.15,.05)),((-1.12,0,.895),(.14,.36,.05)),((-.08,0,.895),(.14,.36,.05))]:p.append(s.box('Stone counter and sink aperture',center,size,m['stone'],.012))
    p.append(bowl('Inset enamel sink',.43,.20,.20,.92,m['enamel'],(-.60,0)))
    p+=tap(-.60,.21,.92,m['metal'])
    p.append(s.box('Inset hob plate',(.60,0,.93),(.97,.48,.025),m['dark'],.022))
    for x in [.33,.86]:
        for y in [-.12,.12]:
            p.append(s.lathe('Cast iron burner',[(.944,.10),(.961,.10),(.968,.075)],m['metal'],16,(x,y,0)))
            p.append(s.rod('Pan support',(x-.12,y,.977),(x+.12,y,.977),.012,m['dark'],6))
    export('level_kitchen_counter',p)

def basin():
    m=init();p=[s.lathe('Pedestal foot',[(0,.18),(.055,.21),(.13,.14),(.64,.10),(.69,.18)],m['enamel'],20),
        bowl('Concave washbasin',.33,.25,.17,.86,m['enamel'])]
    p+=tap(0,.20,.86,m['metal']);export('level_bath_basin',p)

def tub():
    m=init();p=[bowl('Rolled rim bath',.80,.375,.46,.60,m['enamel'])]
    for x in [-.53,.53]:
        for y in [-.22,.22]:p.append(s.rod('Bath foot',(x,y,.015),(x,y,.20),.045,m['metal'],10))
    p+=tap(.61,.19,.60,m['metal']);export('level_bathtub',p)

def lights():
    m=init();p=[s.lathe('Ceiling rose',[(-.028,.16),(0,.16)],m['metal'],20),
        s.lathe('Frosted glass dome',[(-.23,.045),(-.20,.15),(-.13,.245),(-.055,.27),(-.03,.25)],m['glass'],24)]
    export('level_domestic_light',p,True)
    m=init();p=[s.box('Ceiling mounting bar',(0,0,-.025),(1.16,.18,.05),m['metal'],.012),
        s.box('Reflector housing',(0,0,-.075),(1.12,.25,.07),m['enamel'],.018)]
    for y in [-.065,.065]:p.append(s.rod('Enclosed fluorescent tube',(-.50,y,-.13),(.50,y,-.13),.026,m['glass'],12))
    export('level_utility_light',p,True)
    m=init();p=[s.box('Wall back plate',(0,.028,0),(.13,.055,.23),m['metal'],.018)]
    p+=s.tube('Attached sconce arm',[(0,.04,-.04),(0,.16,-.10),(0,.24,-.04),(0,.24,.03)],.018,m['metal'],10)
    p.append(s.lathe('Lamp cap',[(.03,.13),(.06,.10)],m['metal'],16,(0,.24,0)))
    p.append(s.lathe('Glass chimney',[(.06,.09),(.10,.115),(.26,.09),(.29,.065)],m['glass'],16,(0,.24,0)))
    # Blender local -Y is glTF front +Z; back plate at frontZ0 after export.
    for o in p:
        for v in o.data.vertices:v.co.y=-v.co.y
        o.location.y=-o.location.y
    export('level_wall_sconce',p)

def bedding(single=False):
    m=init();cloth=native('Original patterned woven quilt','carpet_mp_1_0.png')
    half=.66 if single else 1.06;verts=[];faces=[];nx=24;ny=20
    for i in range(nx+1):
        x=-1.20+i*2.40/nx
        for j in range(ny+1):
            z=-half+j*2*half/ny
            # Folded cloth has ridges, a turned-down head edge and a hanging foot.
            height=.67+.022*math.sin(x*14+z*3)+.012*math.sin(z*21-x*2)
            edge=max(0,(abs(z)-half*.84)/(half*.16));height-=edge*.13
            if x>.98:height-=(x-.98)*.65
            if x<-.85:height+=.02
            verts.append((x,z,height))
    for i in range(nx):
        for j in range(ny):
            a=i*(ny+1)+j;faces.append((a,a+ny+1,a+ny+2,a+1))
    parts=[s.mesh('Folded draped woven quilt',verts,faces,cloth)]
    for z in ([0] if single else [-.50,.50]):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=8,location=(-.90,z,.745))
        o=bpy.context.object;o.name='Soft fabric pillow';o.scale=(.25,.38 if single else .37,.075);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        o.data.materials.append(s.material('Pillow cotton',(.63,.58,.45),'cloth'));s.uv_project(o);parts.append(o)
    export('level_bedding_single' if single else 'level_bedding_double',parts)

def table_lamp():
    m=init();p=[s.lathe('Turned bedside lamp base',[(0,.14),(.025,.16),(.055,.13),(.09,.07),(.27,.045),(.29,.07)],m['metal'],16),
        s.lathe('Pleated fabric lampshade',[(.25,.23),(.28,.23),(.48,.13),(.495,.13)],s.material('Woven linen shade',(.70,.59,.40),'cloth'),24)]
    p.append(s.rod('Lamp pull',(0,-.08,.29),(0,-.08,.19),.005,m['metal'],6));export('level_table_lamp',p)

kitchen();basin();tub();lights();bedding();bedding(True);table_lamp()
(OUT.parent/'fittings-manifest.json').write_text(json.dumps(LOG,indent=2)+'\n')
print('ENVIRONMENT_FITTINGS_COMPLETE',len(LOG))
