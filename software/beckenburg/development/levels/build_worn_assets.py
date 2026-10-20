"""Separate, deterministic aged diffuse skins. Never save over the clean sources.

All geometry, UV coordinates and floor pivots come from the original CC0 asset.
Only generated image pixels and material roughness change. No pack textures.
"""
import bpy,sys,json,hashlib,math,random
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'development/assets'))
import rebuild_support as s

def noise(x,y,seed):
    # Smooth coarse blotches avoid crisp white noise across the whole object.
    def h(a,b):return random.Random(f'{seed}:{a}:{b}').random()
    a=math.floor(x);b=math.floor(y);u=x-a;v=y-b
    u=u*u*(3-2*u);v=v*v*(3-2*v)
    return (h(a,b)*(1-u)+h(a+1,b)*u)*(1-v)+(h(a,b+1)*(1-u)+h(a+1,b+1)*u)*v

def age(image,key,industrial):
    w,h=image.size;original=list(image.pixels);out=[]
    wood=key in ('oak','pine');metal=key in ('iron','steel','brass','rust')
    paint=key in ('enamel','red','blue','black');paper=key=='paper'
    rng=random.Random(key+' worn marks')
    scratches=[(rng.randrange(w),rng.randrange(h),rng.randrange(3,15)) for _ in range(12 if wood else 5)]
    for y in range(h):
        for x in range(w):
            at=(y*w+x)*4;rgb=original[at:at+3];grey=sum(rgb)/3
            cloud=noise(x/13,y/15,key);damp=noise(x/6,y/24,key+'damp')
            bottom=(1-y/(h-1))**4
            # Reduced saturation and sun-faded finish under uneven ingrained dirt.
            fade=.20 if wood else .25
            rgb=[(c*(1-fade)+grey*fade)*(.76+.12*cloud) for c in rgb]
            grime=max(0,(damp-.35))*.39+bottom*(.19 if industrial else .10)
            if key in ('iron','rust','black'):grime+=.10*(1-cloud)
            rgb=[c*(1-grime) for c in rgb]
            # Long, soft water/condensate tracks; no uniform picture-frame border.
            streak=max(0,noise(x/3,1,key+'streak')-.59)*(.5+.5*y/h)
            if metal or paint:rgb=[c*(1-streak*.42) for c in rgb]
            patch=noise(x/4,y/5,key+'damage')
            edge=min(x,w-1-x,y,h-1-y)<2
            if paint:
                # Soft mineral/grease staining, with sparse small chips. A binary
                # coarse-noise mask makes enamel look like camouflage.
                stain=max(0,patch-.40)*.29
                rgb=[c*(1-stain)+v*stain for c,v in zip(rgb,(.15,.125,.085))]
                fine=noise(x/1.2,y/1.2,key+'chips')
                chip=max(0,(fine-.76)*2.5) if edge else max(0,(fine-.86)*2)
                rgb=[c*(1-chip)+v*chip for c,v in zip(rgb,(.105,.080,.052))]
            if metal and patch>.59:
                t=(patch-.59)*1.2
                rgb=[c*(1-t)+v*t for c,v in zip(rgb,(.18,.085,.035))]
            if wood:
                # Grey exposed grain and scattered dents, rather than bright scratches.
                if any(abs(x-a)<=0 and b<=y<b+length for a,b,length in scratches):
                    rgb=[c*.70+v*.30 for c,v in zip(rgb,(.18,.15,.105))]
                rgb=[c*(1-max(0,patch-.52)*.28) for c in rgb]
            if paper:
                fox=max(0,noise(x/2,y/2,key+'fox')-.65)
                rgb=[c*(1-fox*.8) for c in rgb]
                rgb=[rgb[0]*.98,rgb[1]*.92,rgb[2]*.78]
            if key in ('cloth','green','leather'):
                rgb=[c*(.81+.17*cloud) for c in rgb]
                rgb=[c*(1-max(0,patch-.50)*.20) for c in rgb]
            if key=='ivory':rgb=[rgb[0]*.91,rgb[1]*.88,rgb[2]*.79]
            out.extend([max(.004,min(1,c)) for c in rgb]+[original[at+3]])
    image.pixels.foreach_set(out);image.update();image.pack()

path=ROOT/'development/levels/lived-assets.json'
document=json.loads(path.read_text());clean=[r for r in document['assets'] if not r['id'].endswith('_worn')]
snapshot={r['id']:{'glb':hashlib.sha256((ROOT/f'assets/runtime/models/{r["id"]}.glb').read_bytes()).hexdigest(),
    'blend':hashlib.sha256((ROOT/r['editable']).read_bytes()).hexdigest(),
    'preview':hashlib.sha256((ROOT/f'development/levels/previews/{r["id"]}.png').read_bytes()).hexdigest()} for r in clean}
rows=[]
selected=set(sys.argv[sys.argv.index('--')+1:]) if '--' in sys.argv else set()
for row in clean:
    row['variant']='clean';row['family']=row['id']
    if selected and row['id'] not in selected:continue
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/row['editable']))
    bpy.context.preferences.filepaths.save_version=0
    obj=bpy.data.objects[row['id']];name=row['id']+'_worn';obj.name=name
    obj['texture_variant']='worn';obj['clean_variant']=row['id'];obj['license']='CC0-1.0'
    for mat in obj.data.materials:
        key=mat.name.removeprefix('Rebuild Original ')
        for node in mat.node_tree.nodes:
            if node.type=='TEX_IMAGE':
                node.image=node.image.copy();node.image.name=key+' worn diffuse'
                age(node.image,key,row['library']=='industrial')
        mat.name+=' worn';shader=mat.node_tree.nodes.get('Principled BSDF')
        shader.inputs['Roughness'].default_value=.98
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    target=ROOT/f'assets/runtime/models/{name}.glb'
    bpy.ops.export_scene.gltf(filepath=str(target),export_format='GLB',use_selection=True,export_yup=True,export_extras=True)
    editable=f'development/levels/blender/{name}.blend'
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/editable),compress=True)
    view=(4,-6,3.6) if row['id']=='level_boiler_coal' else (3,-4,3)
    s.render_family(name,[obj],path=ROOT/f'development/levels/previews/{name}.png',view=view)
    rows.append(dict(row,id=name,variant='worn',family=row['id'],editable=editable,
        bytes=target.stat().st_size,sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
    print('WORN',name,flush=True)
if selected:rows+=[r for r in document['assets'] if r['id'].endswith('_worn') and r['family'] not in selected]
for row in clean:
    for kind,p in [('glb',ROOT/f'assets/runtime/models/{row["id"]}.glb'),('blend',ROOT/row['editable']),('preview',ROOT/f'development/levels/previews/{row["id"]}.png')]:
        assert hashlib.sha256(p.read_bytes()).hexdigest()==snapshot[row['id']][kind], 'Clean version changed'
document['assets']=clean+rows;document['clean_preservation']=snapshot
path.write_text(json.dumps(document,indent=2)+'\n')
print('Preserved clean GLBs, Blender files and previews byte-for-byte:',len(clean),flush=True)
