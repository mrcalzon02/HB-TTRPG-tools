"""Verify the aged skins preserve every clean mesh, UV, pivot and source file."""
from pathlib import Path
import json,struct,hashlib
ROOT=Path(__file__).resolve().parents[2]
document=json.loads((ROOT/'development/levels/lived-assets.json').read_text())
assets={r['id']:r for r in document['assets']}
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def read(name):
    data=(ROOT/f'assets/runtime/models/{name}.glb').read_bytes()
    n=struct.unpack_from('<I',data,12)[0]
    return json.loads(data[20:20+n]),data[28+n:]
def mesh_data(name):
    doc,blob=read(name)
    def accessor(index):
        a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']]
        begin=v.get('byteOffset',0)
        return ({k:v for k,v in a.items() if k!='bufferView'},blob[begin:begin+v['byteLength']])
    geometry=[]
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            geometry.append(({k:accessor(v) for k,v in primitive['attributes'].items()},accessor(primitive['indices'])))
    transforms=[{k:n[k] for k in ('matrix','translation','rotation','scale') if k in n} for n in doc['nodes'] if 'mesh' in n]
    textures=[blob[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']] for image in doc['images'] for v in [doc['bufferViews'][image['bufferView']]]]
    return geometry,transforms,textures
results=[]
for name,hashes in document['clean_preservation'].items():
    row=assets[name]
    for kind,path in [('glb',ROOT/f'assets/runtime/models/{name}.glb'),('blend',ROOT/row['editable']),('preview',ROOT/f'development/levels/previews/{name}.png')]:
        assert digest(path)==hashes[kind],f'Clean {kind} changed: {name}'
    clean=mesh_data(name);worn=mesh_data(name+'_worn')
    assert clean[:2]==worn[:2],f'Geometry/UV/pivot changed: {name}'
    assert len(clean[2])==len(worn[2]) and all(a!=b for a,b in zip(clean[2],worn[2])),f'Unchanged diffuse image: {name}'
    assert assets[name+'_worn']['variant']=='worn'
    assert row['bounds']==assets[name+'_worn']['bounds']
    results.append(dict(family=name,clean_sources_unchanged=True,geometry_uv_indices_transforms_identical=True,
        all_diffuse_images_replaced=True,clean_glb_sha256=row['sha256'],worn_glb_sha256=assets[name+'_worn']['sha256']))
report=ROOT/'development/levels/verification/worn-assets-results.json';report.parent.mkdir(exist_ok=True)
report.write_text(json.dumps(results,indent=2)+'\n')
print('PASS',len(document['clean_preservation']),'clean sources unchanged byte-for-byte; all worn vertices, normals, UVs, indices and pivots identical; every diffuse image replaced')
