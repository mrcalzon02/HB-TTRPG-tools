"""Trusted Blender geometry compiler for the TP-MH7 art pilot.

Model output comes from real bpy meshes. The local language model may supply only
bounded, declarative additional components; it cannot execute its own scripts.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

PALETTE = {
    'iron': ((0.094, 0.100, 0.110, 1), .75, .78),
    'gunmetal': ((0.16, 0.18, 0.19, 1), .80, .48),
    'steel': ((0.36, 0.37, 0.36, 1), .75, .43),
    'red': ((0.30, 0.060, 0.044, 1), .58, .72),
    'brass': ((0.43, 0.24, 0.080, 1), .80, .38),
    'copper': ((0.40, 0.15, 0.075, 1), .72, .40),
    'dark': ((0.038, 0.043, 0.046, 1), .30, .80),
    'cyan': ((0.014, 0.55, 0.68, 1), .16, .19),
    'green': ((0.037, 0.40, 0.068, 1), .18, .24),
    'amber': ((0.72, 0.29, 0.038, 1), .15, .25),
}

def checksum(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

class Machine:
    def __init__(self, task, registry):
        bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
        self.task=task; self.name=task['id']; self.w,self.d=task['planned_footprint_tiles']; self.objects=[]
        self.materials={}; self.reused=[]; self.registry=registry
        self.collection=bpy.data.collections.new('MH7_ASSET_'+self.name.upper()); bpy.context.scene.collection.children.link(self.collection)
        self.stage=[]
    def mat(self, color):
        if color not in PALETTE: color='gunmetal'
        if color in self.materials: return self.materials[color]
        rgba,metal,rough=PALETTE[color]
        m=bpy.data.materials.new('MH7 '+color);m.diffuse_color=rgba;m.use_nodes=True
        shader=m.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Base Color'].default_value=rgba
        shader.inputs['Metallic'].default_value=metal
        shader.inputs['Roughness'].default_value=rough
        if color in ('cyan','green','amber'):
            shader.inputs['Emission Color'].default_value=rgba
            shader.inputs['Emission Strength'].default_value=1.2 if color=='cyan' else .42
        self.materials[color]=m;return m
    def own(self,obj,name,color,part=None):
        obj.name='MH7_'+name[:75]
        for col in list(obj.users_collection): col.objects.unlink(obj)
        self.collection.objects.link(obj)
        obj.data.materials.append(self.mat(color))
        # An already verified component is genuinely appended from the earlier
        # machine's exported GLB, not merely re-created and counted as reuse.
        master=next((p for p in self.registry.get('parts',[]) if part and
                     p.get('part_id')==part and p.get('status')=='verified' and
                     Path(p.get('file','')).is_file()),None)
        if master and all(abs(float(a)-float(b))<.003 for a,b in zip(obj.dimensions,master.get('dimensions_xyz',[]))):
            try:
                pre=set(bpy.data.objects)
                bpy.ops.import_scene.gltf(filepath=str(master['file']))
                imported=[x for x in bpy.data.objects if x not in pre and x.type=='MESH']
                if imported:
                    fitted=imported[0]
                    fitted.location=obj.location.copy()
                    fitted.rotation_euler=obj.rotation_euler.copy()
                    for col in list(fitted.users_collection):col.objects.unlink(fitted)
                    self.collection.objects.link(fitted)
                    bpy.data.objects.remove(obj,do_unlink=True)
                    obj=fitted
                    obj['tp_part_revision']=master.get('revision','v01')
                    obj['tp_part_source_sha256']=master.get('glb_sha256','')
                    self.reused.append(part)
                for extra in imported[1:]:bpy.data.objects.remove(extra,do_unlink=True)
            except (RuntimeError,ValueError,KeyError):
                # This candidate remains useful geometry but NOT counted as reuse.
                pass
        if part:obj['tp_part_id']=part
        self.objects.append(obj)
        return obj
    def box(self,name,pos,dim,color='iron',part=None,bevel=.06):
        bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.dimensions=dim
        bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
        o=self.own(o,name,color,part)
        if bevel and not o.get('tp_part_source_sha256'):
            mod=o.modifiers.new('small cast edge breaks','BEVEL');mod.width=min(bevel,min(dim)*.23);mod.segments=2
            mod2=o.modifiers.new('smooth cast normals','WEIGHTED_NORMAL')
        return o
    def cyl(self,name,pos,radius,depth,color='iron',axis='Z',part=None,verts=24):
        bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth,location=pos)
        o=bpy.context.object
        if axis=='X':o.rotation_euler[1]=math.pi/2
        if axis=='Y':o.rotation_euler[0]=math.pi/2
        return self.own(o,name,color,part)
    def cone(self,name,pos,r1,r2,h,color='iron'):
        bpy.ops.mesh.primitive_cone_add(vertices=32,radius1=r1,radius2=r2,depth=h,location=pos)
        return self.own(bpy.context.object,name,color)
    def beam(self,name,start,end,radius=.07,color='gunmetal',part=None):
        a,b=Vector(start),Vector(end);diff=b-a
        if diff.length<1e-4:return None
        bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=radius,depth=diff.length,location=(a+b)*.5)
        o=bpy.context.object;o.rotation_euler=diff.to_track_quat('Z','Y').to_euler()
        return self.own(o,name,color,part)
    def torus(self,name,center,major,minor=.055,color='brass',axis='Z'):
        bpy.ops.mesh.primitive_torus_add(major_segments=36,minor_segments=8,location=center,major_radius=major,minor_radius=minor)
        o=bpy.context.object
        if axis=='X':o.rotation_euler[1]=math.pi/2
        elif axis=='Y':o.rotation_euler[0]=math.pi/2
        return self.own(o,name,color)
    def hollow(self,name,start,end,outer=.285,bore=.245,color='steel',part=None):
        a,b=Vector(start),Vector(end);v=b-a
        if v.length<.005:return None
        direction=v.normalized();x=direction.cross(Vector((0,0,1)))
        if x.length<.01:x=direction.cross(Vector((0,1,0)))
        x.normalize();y=direction.cross(x).normalized();verts=[];faces=[];n=24
        # Two concentric cylinders, genuinely open at both ends.
        for center,r in ((a,outer),(b,outer),(a,bore),(b,bore)):
            for i in range(n):
                t=math.tau*i/n;point=center+r*(x*math.cos(t)+y*math.sin(t));verts.append(tuple(point))
        for i in range(n):
            j=(i+1)%n
            faces.extend(((i,j,n+j,n+i), (2*n+i,3*n+i,3*n+j,2*n+j),
                          (i,2*n+i,2*n+j,j), (n+i,n+j,3*n+j,3*n+i)))
        mesh=bpy.data.meshes.new(name+'_mesh');mesh.from_pydata(verts,[],faces);mesh.update()
        obj=bpy.data.objects.new(name,mesh);self.collection.objects.link(obj)
        obj.data.materials.append(self.mat(color));self.objects.append(obj)
        if part: obj['tp_part_id']=part
        return obj
    def pipe(self,name,points,radius=.285,color='gunmetal',port=False):
        for j in range(len(points)-1):self.hollow(name+'_run_'+str(j),points[j],points[j+1],radius,radius*.82,color)
        if port:
            self.torus(name+'_mouth',points[-1],radius+.035,.058,'brass',axis='X' if abs(points[-1][0]-points[-2][0])>abs(points[-1][1]-points[-2][1]) else 'Y')
            self.stage.append({'id':name,'model_mouth_center_xyz_tiles':list(points[-1]),'verified':False})
    def foundation(self):
        self.box('base bed',(0,0,.12),(self.w-.16,self.d-.16,.24),'iron',bevel=.08)
        for x in (-self.w/2+.27,self.w/2-.27):
            for y in (-self.d/2+.27,self.d/2-.27):
                self.box('foundation socket',(x,y,.23),(.40,.40,.38),'red',part='mh7-structural-cast-foot')
        for x in (-self.w/2+.20,self.w/2-.20):
            self.box('chassis length rail',(x,0,.38),(.14,self.d-.4,.32),'gunmetal')
        for y in (-self.d/2+.2,self.d/2-.2):
            self.box('chassis width rail',(0,y,.38),(self.w-.4,.15,.28),'steel')
    def ui(self,x,y,z=.85):
        # Established emergency/cogitator family: real recessed green CRT and four tactile round buttons.
        self.box('service interface casting',(x,y,z),(.74,.27,.57),'iron',part='mh7-service-cogitator-case')
        self.box('service inset CRT',(x,y-.145,z+.055),(.43,.024,.27),'green')
        for j,col in enumerate(('red','amber','green','dark')):
            self.cyl('control push button',(x+.26+(j%2)*.082,y-.153,z+.11-(j//2)*.16),.031,.035,col,axis='Y',verts=12)
    def ribs(self,x,y,z=1.25,h=1.4):
        self.box('cast red load column',(x,y,z),(.20,.22,h),'red',part='mh7-structural-haunch')
    def pipe_port(self,ident,x0,y0,x1,y1,turn=False):
        z=.36
        if turn:
            points=[(x0,y0,z+.55),(x0,y0,z),(x1,y1,z)]
        else:points=[(x0,y0,z),(x1,y1,z)]
        self.pipe(ident,points,port=True)
    def build_purifier(self):
        self.foundation();self.cyl('central sealed purifier vessel',(0,.10,1.63),.76,2.15,'gunmetal')
        self.cone('domed vessel neck',(0,.10,2.83),.76,.37,.34,'steel');self.cyl('vessel crown',(0,.10,3.02),.36,.12,'brass')
        for z in (.72,1.52,2.48):self.torus('pressure sealing bands',(0,.10,z),.75,.065,'brass')
        for x in (-1.12,1.12):
            for y in (-1.12,1.12):
                self.ribs(x,y,1.32,h=1.66)
                self.beam('supported upper tank tie',(x,y,2.05),(x*.47,y*.47,2.58),.10,'red')
        for x in (-.90,-.50):
            self.cyl('replaceable filter cartridge',(x,-.25,1.16),.17,.89,'steel')
            self.torus('filter cartridge collar',(x,-.25,1.63),.17,.039,'brass')
            self.box('filter retaining bracket',(x,-.22,.69),(.35,.40,.12),'gunmetal')
        self.cyl('low supported pump motor',(-.57,-.79,.61),.29,.56,'iron',axis='Y')
        self.pipe_port('raw_water_input',-.88,-.78,-1.50,-.78)
        self.pipe_port('purified_water_output',.70,-.62,1.50,-.62)
        self.ui(.76,-1.18,.90)
    def build_electrolyzer(self):
        self.foundation()
        for x in (-.56,.56):
            self.cyl('sealed electrolytic column',(x,.15,1.6),.41,1.95,'gunmetal')
            self.cyl('electrolyte sight strip',(x,-.253,1.48),.075,1.24,'cyan')
            for z in (.70,1.92,2.54):self.torus('cell end clamping',(x,.15,z),.42,.055,'brass')
            self.box('power insulator mount',(x,.15,2.75),(.30,.30,.24),'steel')
        for x in (-1.25,1.25):
            for y in (-1.60,1.60):self.ribs(x,y,1.56,h=2.10)
        self.box('rectifier bus bridge',(0,.16,2.9),(2.35,.22,.20),'gunmetal')
        for x in (-.56,.56):self.beam('electrode conductor',(x,.15,2.63),(x,.15,2.85),.08,'copper')
        self.pipe_port('water_input',-.20,-.68,-.20,-2)
        self.pipe('hydrogen_output',[(-.56,.16,2.59),(-1.12,.16,2.59),(-1.12,1.76,.36),(-1.12,2.00,.36)],.215,'gunmetal',True)
        self.pipe('oxygen_output',[(.56,.16,2.59),(1.12,.16,2.59),(1.12,1.76,.36),(1.12,2.00,.36)],.215,'steel',True)
        self.ui(.30,-1.72,.76)
    def build_compressor(self):
        self.foundation()
        for x in (-.74,0,.74):
            self.cyl('three compressor cylinder',(x,-.05,1.15),.32,2.25,'steel',axis='Y')
            for y in (-1.08,.96):self.torus('cylinder cap',(x,y,1.15),.30,.056,'brass',axis='Y')
            self.box('supported saddle',(x,0,.68),(.51,1.78,.22),'iron')
            self.beam('reciprocating rod',(x,-1.20,1.16),(x,-1.55,1.16),.10,'copper')
        self.cyl('drive flywheel',(1.18,.58,1.28),.50,.18,'brass',axis='X')
        self.cyl('drive shaft',(1.02,.58,1.28),.16,.72,'steel',axis='X')
        self.box('motor enclosure',(1.00,1.11,.80),(.55,.53,.80),'gunmetal')
        self.pipe_port('hydrogen_suction',-.60,-.86,-.60,-2)
        self.pipe_port('hydrogen_discharge',.66,1.20,.66,2)
        self.ui(-.72,-1.62,.69)
    def build_metallizer(self):
        self.foundation();self.cyl('pressure metallization crucible',(0,0,2.0),1.14,2.68,'iron')
        self.cone('closed pressure crown',(0,0,3.50),1.13,.56,.30,'steel')
        self.cyl('top service lock',(0,0,3.70),.43,.18,'brass')
        for z in (.90,1.75,2.58,3.21):self.torus('seated thermal pressure band',(0,0,z),1.12,.09,'brass')
        for x in (-2.08,2.08):
            for y in (-2.08,2.08):
                self.box('crucible grounded buttress foot',(x,y,.49),(.65,.66,.60),'red',part='mh7-structural-cast-foot')
                self.beam('tapered pressure haunch',(x,y,.72),(x*.52,y*.52,3.03),.19,'red',part='mh7-structural-haunch')
        self.cyl('service pressure hatch',(0,-1.143,2.07),.37,.15,'brass',axis='Y')
        self.pipe_port('conditioned_hydrogen_input',-1.22,-1.32,-2.5,-1.32)
        self.pipe_port('intermediate_output',1.20,-1.32,2.5,-1.32)
        self.ui(1.55,-2.12,.86)
    def build_pelletizer(self):
        self.foundation()
        # Visible open hopper: tapered shell, not a sealed block.
        self.cone('feed hopper tapered shell',(0,.56,2.34),.41,.74,.88,'steel')
        self.cyl('visible feed throat',(0,.56,1.72),.20,.38,'brass')
        for x in (-1.10,1.10):
            self.ribs(x,.14,1.68,h=2.43)
        self.box('press crossbar',(0,.10,3.02),(2.38,.40,.29),'red')
        self.cyl('guided press ram',(0,.12,2.28),.22,1.14,'steel')
        self.cyl('pellet pressing die',(0,.12,1.07),.48,.22,'gunmetal')
        self.box('removable pellets pickup tray',(0,-.72,.53),(1.42,.53,.16),'steel')
        self.box('inserter pickup side',(.02,-1.20,.48),(.94,.22,.18),'gunmetal')
        self.ui(.93,-.85,.76)
    def build_fabricator(self):
        self.foundation()
        for y in (-.72,.72):
            for x in (-.85,.85):self.cyl('rolling saddle',(x,y,.73),.25,.54,'brass',axis='Y')
        self.cyl('hollow vessel blank',(0,0,1.25),.60,2.40,'steel',axis='X')
        for x in (-1.21,1.21):self.torus('vessel end seat',(x,0,1.25),.61,.066,'brass',axis='X')
        for x in (-1.63,1.63):
            for y in (-1.63,1.63):self.ribs(x,y,1.86,h=2.70)
        self.box('weld gantry linear beam',(0,0,3.12),(3.23,.28,.27),'red')
        self.box('seam welder carriage',(0,-.05,2.83),(.43,.44,.34),'gunmetal')
        self.beam('guided seam welding head',(0,-.05,2.70),(0,-.05,1.93),.09,'brass')
        self.cyl('tube drive motor',(-1.30,.82,.85),.29,.45,'iron',axis='X')
        self.ui(1.15,-1.65,.76)
    def build_canister(self):
        self.foundation();self.cyl('indexed turntable',(0,0,.65),1.00,.24,'gunmetal')
        positions=[(-.54,-.32),(.53,-.32),(0,.56)]
        for i,(x,y) in enumerate(positions):
            self.cyl('canister station '+str(i),(x,y,1.29),.24,.92,'steel')
            self.torus('station shoulder ring '+str(i),(x,y,1.74),.25,.044,'brass')
            self.cyl('station top socket '+str(i),(x,y,1.84),.12,.16,'gunmetal')
        for x in (-1.62,1.62):
            for y in (-1.64,1.64):self.ribs(x,y,1.52,h=2.32)
        self.box('rigid sealing crossbar',(0,0,2.84),(3.25,.28,.28),'red')
        self.box('indexed sealing head mount',(-.54,-.32,2.55),(.36,.33,.37),'gunmetal')
        self.cyl('sealing ram aligned with first station',(-.54,-.32,2.12),.15,.67,'brass')
        self.box('metered pellet feeder',(1.13,.56,1.45),(.65,.58,.68),'iron')
        self.beam('pellet feed tube',(1.00,.56,1.61),(.25,.56,1.61),.11,'steel')
        self.box('filled canister outfeed access',(.72,-1.12,.52),(1.03,.40,.18),'steel')
        self.ui(1.12,-1.61,.78)
    def extra(self,mods):
        if not isinstance(mods,list):return []
        created=[]
        for i,p in enumerate(mods[:20]):
            if not isinstance(p,dict):continue
            kind=p.get('type');n='inferred_'+str(i)+'_'+str(p.get('purpose','part'))[:25]
            col=p.get('material','steel');col=col if col in PALETTE else 'steel'
            try:
                if kind=='box':
                    pos,dim=p['position'],p['size'];self.box(n,pos,dim,col)
                elif kind=='cylinder':
                    self.cyl(n,p['position'],p['radius'],p['depth'],col,p.get('axis','Z'))
                elif kind=='beam':
                    self.beam(n,p['start'],p['end'],p['radius'],col)
                elif kind=='torus':
                    self.torus(n,p['position'],p['major_radius'],p['minor_radius'],col,p.get('axis','Z'))
                else:continue
                created.append(n)
            except (KeyError,ValueError,TypeError):continue
        return created
    def run(self):
        {'water-purifier':self.build_purifier,'electrolyzer':self.build_electrolyzer,
        'hydrogen-compressor':self.build_compressor,'metallization-crucible':self.build_metallizer,
        'pelletization-forge':self.build_pelletizer,'pressure-vessel-fabricator':self.build_fabricator,
        'canister-assembler':self.build_canister}[self.name]()

def main():
    idx=sys.argv.index('--') if '--' in sys.argv else -1
    args=argparse.ArgumentParser();args.add_argument('--spec',required=True);args.add_argument('--machine',required=True)
    args.add_argument('--out',required=True);args.add_argument('--modifications',required=True)
    args=args.parse_args(sys.argv[idx+1:] if idx>=0 else [])
    spec=json.loads(Path(args.spec).read_text(encoding='utf-8'))
    task=next(t for t in spec['tasks'] if t['id']==args.machine)
    if args.machine not in ('water-purifier','electrolyzer','hydrogen-compressor','metallization-crucible','pelletization-forge','pressure-vessel-fabricator','canister-assembler'):
        raise ValueError('Unknown, unsafe machine')
    out=Path(args.out);out.mkdir(parents=True,exist_ok=True)
    doc=json.loads(Path(args.modifications).read_text(encoding='utf-8'))
    registry=doc.get('registry',{})
    b=Machine(task,registry);b.run();added=b.extra(doc.get('additions',[]))
    scene=bpy.context.scene
    env=bpy.data.collections.new('MH7_INSPECTION_ENVIRONMENT_NOT_ASSET');scene.collection.children.link(env)
    # Neutral matte is for cast contact visibility, not part of the GLB.
    bpy.ops.mesh.primitive_plane_add(size=30,location=(0,0,-.05))
    plane=bpy.context.object;plane.name='Inspection matte';
    for c in list(plane.users_collection):c.objects.unlink(plane)
    env.objects.link(plane)
    m=bpy.data.materials.new('Inspection backdrop');m.diffuse_color=(.038,.041,.044,1);plane.data.materials.append(m)
    def light(name,loc,power,size):
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
        o=bpy.data.objects.new(name,data);env.objects.link(o);o.location=loc;o.rotation_euler=(Vector((0,0,1.2))-o.location).to_track_quat('-Z','Y').to_euler()
    light('Left studio softbox',(-5,-4,9),1250,7)
    light('Right rim softbox',(5,2,7),1050,6)
    camdata=bpy.data.cameras.new('Game style fixed inspection 45 degrees');camdata.type='ORTHO';camdata.ortho_scale=max(b.w,b.d)*1.82+2
    cam=bpy.data.objects.new('GAME_CAMERA_FIXED',camdata);env.objects.link(cam)
    cam.location=(7,-7,10.5);cam.rotation_euler=(Vector((0,0,1.60))-cam.location).to_track_quat('-Z','Y').to_euler();scene.camera=cam
    scene.render.engine='CYCLES';scene.cycles.samples=12;scene.cycles.device='CPU'
    scene.render.resolution_x=680;scene.render.resolution_y=680;scene.render.resolution_percentage=100
    scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
    try: scene.view_settings.view_transform='AgX'
    except (AttributeError, TypeError, ValueError): scene.view_settings.view_transform='Standard'
    bpy.ops.file.pack_all();blend=out/(args.machine+'.blend')
    bpy.ops.wm.save_as_mainfile(filepath=str(blend),compress=True)
    scene.render.filepath=str(out/'inspection_3quarter.png');bpy.ops.render.render(write_still=True)
    for obj in bpy.context.selected_objects:obj.select_set(False)
    for o in b.objects:o.select_set(True)
    bpy.context.view_layer.objects.active=b.objects[0]
    bpy.ops.export_scene.gltf(filepath=str(out/(args.machine+'.glb')),export_format='GLB',use_selection=True,export_apply=False)
    results={
       'asset':b.name,'footprint_tiles':[b.w,b.d],'model_object_count':len(b.objects),
       'new_inference_objects':added,'modeled_unverified_port_mouths':b.stage,
       'registered_parts_used':sorted(set(b.reused)),'blender_version':bpy.app.version_string,
       'blend_sha256':checksum(blend),'glb_sha256':checksum(out/(args.machine+'.glb')),
       'render_sha256':checksum(out/'inspection_3quarter.png'),
       'state':'candidate_not_game_integrated',
    }
    (out/'build_receipt.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    print('MH7_MODEL_BUILT '+json.dumps(results,sort_keys=True))

if __name__=='__main__':main()
