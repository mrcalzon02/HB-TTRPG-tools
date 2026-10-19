"""Read original archives without extracting or modifying them. Unknown facts stay null."""
import argparse, collections, hashlib, json, pathlib, struct, subprocess, zipfile

def glb_details(data):
    length = struct.unpack_from('<I', data, 12)[0]
    root = json.loads(data[20:20+length])
    accessors = root.get('accessors', [])
    primitives = [p for m in root.get('meshes', []) for p in m['primitives']]
    bounds = [accessors[p['attributes']['POSITION']] for p in primitives]
    minimum = [min(a.get('min', [0]*3)[i] for a in bounds) for i in range(3)]
    maximum = [max(a.get('max', [0]*3)[i] for a in bounds) for i in range(3)]
    return dict(triangles=sum(accessors[p['indices']]['count']//3 for p in primitives if 'indices' in p),
                mesh_local_bounds=[minimum, maximum],
                dimensions=[maximum[i]-minimum[i] for i in range(3)],
                orientation='glTF +Y up; node transforms retained',
                materials=[m.get('name') for m in root.get('materials',[])],
                textures=[dict(mime_type=i.get('mimeType'), external_uri=i.get('uri')) for i in root.get('images',[])])

def main():
    args = argparse.ArgumentParser()
    args.add_argument('library', type=pathlib.Path)
    args.add_argument('project', type=pathlib.Path)
    args.add_argument('--sevenzip', default=r'C:\Program Files\7-Zip\7z.exe')
    options = args.parse_args()
    manifest = dict(schema_version=1, source_root=str(options.library),
        audit_note='Archive inventory complete; null geometry/license fields require source inspection. No inferred redistribution grant.',
        archives=[], files=[], runtime=[])
    for archive in sorted(options.library.iterdir()):
        if archive.suffix.lower() not in ('.zip','.rar','.7z'):
            continue
        print('Inventory', archive.name, flush=True)
        record = dict(path=str(archive), bytes=archive.stat().st_size, license_documents=[])
        manifest['archives'].append(record)
        if archive.suffix.lower() == '.zip':
            with zipfile.ZipFile(archive) as source:
                entries = [dict(name=i.filename, bytes=i.file_size, crc32=f'{i.CRC:08x}') for i in source.infolist() if not i.is_dir()]
                for entry in entries:
                    if any(s in entry['name'].lower() for s in ('license','licence','copyright')) and entry['bytes']<100000:
                        text = source.read(entry['name']).decode('utf-8',errors='replace')
                        record['license_documents'].append(dict(path=entry['name'], text=text))
        else:
            listing = subprocess.run([options.sevenzip,'l','-slt','-ba','-sccUTF-8',str(archive)], check=True, capture_output=True).stdout.decode('utf-8',errors='replace')
            entries=[]
            for block in listing.split('\n\n'):
                fields=dict(line.split(' = ',1) for line in block.splitlines() if ' = ' in line)
                if fields.get('Folder')=='+' or 'Size' not in fields: continue
                entries.append(dict(name=fields['Path'], bytes=int(fields['Size']),crc32=fields.get('CRC')))
        for entry in entries:
            name=entry['name']; suffix=pathlib.PurePosixPath(name.replace('\\','/')).suffix.lower()
            future_lobby='medieval' in archive.name.lower()
            license_status='unconfirmed; inspect archive license documents'
            if any('CC0' in d['text'] for d in record['license_documents']):
                license_status='CC0; archive license document'
            if archive.name=='Exploration objects.rar' and (options.project/'development/assets/EXPLORATION_LICENSE.md').exists():
                license_status='CC0; https://elbolilloduro.itch.io/exploration-objects (verified 2026-10-18)'
            manifest['files'].append(dict(archive=str(archive), filename=name, format=suffix, bytes=entry['bytes'],
                crc32=entry.get('crc32'), dimensions=None, polygon_count=None, materials=None, textures=None,
                orientation=None, license_status=license_status,
                classification='reserved_future_lobby' if future_lobby else ('component_candidate' if suffix in ('.fbx','.obj','.blend','.glb','.gltf') else 'supporting_file'),
                potential_role='future character lobby' if future_lobby else ('equipment components' if any(s in name.lower() for s in ('camera','dosimeter','recorder','radio','thermom','flashlight','vape','book','switch')) else None)))
        record['entry_count']=len(entries)
    for model in sorted((options.project/'assets/runtime/models').glob('*.glb')):
        data=model.read_bytes()
        manifest['runtime'].append(dict(path=model.relative_to(options.project).as_posix(),
            sha256=hashlib.sha256(data).hexdigest(),bytes=len(data),classification='existing_converted_runtime',
            source_provenance='assets/runtime/models/IMPORT_MANIFEST.md; otherwise unconfirmed', **glb_details(data)))
    output=options.project/'development/assets/local-library-manifest.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest,separators=(',',':'))+'\n',encoding='utf-8')
    print(json.dumps(dict(archives=len(manifest['archives']),entries=len(manifest['files']),runtime_models=len(manifest['runtime']),output=str(output))))

if __name__=='__main__': main()
