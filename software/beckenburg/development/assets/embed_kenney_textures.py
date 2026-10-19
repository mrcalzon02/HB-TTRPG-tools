"""Repair the selected converted GLBs using exact CC0 textures from the owner's archive."""
import argparse, hashlib, json, pathlib, struct, zipfile

def repair(path, source):
    data=path.read_bytes()
    size=struct.unpack_from('<I',data,12)[0]
    root=json.loads(data[20:20+size])
    binary=bytearray(data[28+size:28+size+struct.unpack_from('<I',data,20+size)[0]])
    changed=[]
    for image in root['images']:
        if 'uri' not in image: continue
        member='Models/GLB format/'+image['uri']
        texture=source.read(member)
        if not texture.startswith(b'\x89PNG\r\n\x1a\n'):raise ValueError(member)
        while len(binary)%4:binary.append(0)
        index=len(root['bufferViews'])
        root['bufferViews'].append(dict(buffer=0,byteOffset=len(binary),byteLength=len(texture)))
        binary.extend(texture)
        image.pop('uri');image.update(bufferView=index,mimeType='image/png')
        changed.append(dict(member=member,sha256=hashlib.sha256(texture).hexdigest()))
    # Convert the authored unlit materials to this renderer's textured material
    # subset. Kenney's texture transforms select UV0 and have no spatial transform.
    extensions=root.get('extensionsUsed',[])
    if any(e not in ('KHR_materials_unlit','KHR_texture_transform') for e in extensions):
        raise ValueError('unexpected material extension')
    for material in root['materials']:
        material.pop('extensions',None)
        texture=material['pbrMetallicRoughness'].get('baseColorTexture',{})
        transform=texture.get('extensions',{}).get('KHR_texture_transform',{})
        if any(k!='texCoord' or v!=0 for k,v in transform.items()):
            raise ValueError('texture transform must be baked before conversion')
        texture.pop('extensions',None)
    root.pop('extensionsUsed',None);root.pop('extensionsRequired',None)
    if not changed and not extensions:return None
    root['buffers'][0]['byteLength']=len(binary)
    while len(binary)%4:binary.append(0)
    encoded=json.dumps(root,separators=(',',':')).encode()
    encoded+=b' '*((-len(encoded))%4)
    payload=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(binary))
    payload+=struct.pack('<II',len(encoded),0x4e4f534a)+encoded
    payload+=struct.pack('<II',len(binary),0x004e4942)+binary
    path.write_bytes(payload)
    return dict(model=path.name,original_sha256=hashlib.sha256(data).hexdigest(),runtime_sha256=hashlib.sha256(payload).hexdigest(),embedded=changed,converted_extensions=extensions)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('archive',type=pathlib.Path);a=p.parse_args()
    project=pathlib.Path(__file__).resolve().parents[2]
    with zipfile.ZipFile(a.archive) as source:
        license_text=source.read('License.txt').decode(errors='replace')
        if 'CC0' not in license_text:raise ValueError('CC0 license not found')
        results=[r for path in sorted((project/'assets/runtime/models').glob('kenney_*.glb')) if (r:=repair(path,source))]
    if results:
        manifest=pathlib.Path(__file__).parent/'kenney-embedded-textures.json'
        if manifest.exists():
            previous={r['model']:r for r in json.loads(manifest.read_text())['models']}
            for result in results:
                old=previous.get(result['model'])
                if old:
                    result['original_sha256']=old['original_sha256']
                    result['embedded']=result['embedded'] or old['embedded']
        output=dict(source_archive=str(a.archive),license='CC0; archive License.txt',models=results)
        manifest.write_text(json.dumps(output,indent=2)+'\n')
    print(f'Embedded exact source PNGs in {len(results)} GLBs; original geometry and UVs unchanged')
