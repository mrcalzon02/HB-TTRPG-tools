"""Read back published GLBs, ZIPs, manifests and all local page download links."""
from pathlib import Path
from html.parser import HTMLParser
import json,hashlib,struct,zipfile
ROOT=Path(__file__).resolve().parents[2];SITE=ROOT.parents[1]
index=json.loads((SITE/'assets/beckenburg/libraries/index.json').read_text());count=0
assert index['license']=='CC0-1.0'
for library in index['libraries']:
    manifest_path=SITE/library['manifest'];manifest=json.loads(manifest_path.read_text())
    assert manifest['license']=='CC0-1.0' and len(manifest['assets'])==library['count']
    archive=SITE/library['download'];assert hashlib.sha256(archive.read_bytes()).hexdigest()==library['sha256']
    with zipfile.ZipFile(archive) as z:
        assert {'LICENSE.txt','README.txt','manifest.json','asset-library.blend','blender_assets.cats.txt'}<=set(z.namelist())
        assert 'CC0 1.0 Universal' in z.read('LICENSE.txt').decode()
        assert len([name for name in z.namelist() if name.endswith('.glb')])==library['count']
        for extra in manifest.get('extras',[]):
            data=(SITE/extra['path']).read_bytes();assert extra['license']=='CC0-1.0' and hashlib.sha256(data).hexdigest()==extra['sha256']
            assert data==z.read(extra['archive_path'])
        for asset in manifest['assets']:
            path=SITE/asset['files']['models'];data=path.read_bytes();size=struct.unpack_from('<I',data,12)[0];glb=json.loads(data[20:20+size])
            assert asset['license']=='CC0-1.0' and asset['source']=='original geometry and procedural textures'
            assert hashlib.sha256(data).hexdigest()==asset['sha256']
            assert any(node.get('extras',{}).get('license')=='CC0-1.0' for node in glb['nodes'])
            assert all('bufferView' in image and 'uri' not in image for image in glb.get('images',[]))
            assert not any(node.get('extras',{}).get('source_file') for node in glb['nodes'])
            assert data==z.read('models/'+path.name)
            for kind in ['models','source','previews']:assert (SITE/asset['files'][kind]).is_file()
            count+=1
class Links(HTMLParser):
    def handle_starttag(self,tag,attrs):
        for name,value in attrs:
            if name in ['href','src'] and value and not value.startswith(('http:','https:','#')):
                assert (SITE/value.split('#')[0]).exists(),'Broken published link: '+value
page=(SITE/'beckenburg-asset-libraries.html').read_text(encoding='utf-8');Links().feed(page)
assert page.count('class="license">CC0 1.0')==count
assert 'beckenburg-asset-libraries.html' in (SITE/'beckenburg.html').read_text(encoding='utf-8')
print('PASS',count,'CC0 model/texture declarations, native source files, ZIP hashes, license labels and page download links')
