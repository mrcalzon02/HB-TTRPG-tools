"""Read back the actual public page, manifests, every GLB and all three ZIPs.

Compare with the locally validated publication; never infer publication from push.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from urllib.request import urlopen,Request
from datetime import datetime,timezone
import json,hashlib,argparse
ROOT=Path(__file__).resolve().parents[2];SITE=ROOT.parents[1]
ap=argparse.ArgumentParser();ap.add_argument('--published-commit',required=True);args=ap.parse_args()
BASE='https://mrcalzon02.github.io/HB-TTRPG-tools/'
def get(path):
    with urlopen(Request(BASE+path,headers={'User-Agent':'Beckenburg-asset-publication-verifier/1.0'}),timeout=90) as response:
        assert response.status==200
        return response.read()
def digest(data):return hashlib.sha256(data).hexdigest()
index=json.loads(get('assets/beckenburg/libraries/index.json'))
assert index==json.loads((SITE/'assets/beckenburg/libraries/index.json').read_text()),'Live index differs from validated local publication'
page=get('beckenburg-asset-libraries.html').decode('utf-8')
assert 'Clean version' in page and 'Worn version' in page
assert page.count('class="license">CC0 1.0')==sum(library['count'] for library in index['libraries'])
jobs=[];libraries=[]
for library in index['libraries']:
    manifest=json.loads(get(library['manifest']))
    assert manifest==json.loads((SITE/library['manifest']).read_text())
    assert manifest['license']=='CC0-1.0' and set(manifest['variants'])=={'clean','worn'}
    assert 'CC0 1.0 Universal' in get(f'assets/beckenburg/libraries/{library["id"]}/LICENSE.txt').decode()
    for asset in manifest['assets']:jobs.append((asset['files']['models'],asset['sha256'],'GLB'))
    jobs.append((library['download'],library['sha256'],'ZIP'))
    libraries.append(dict(id=library['id'],variants=library['count'],license=manifest['license']))
def check(job):
    path,expected,kind=job;data=get(path);actual=digest(data)
    assert actual==expected,'Live download hash differs: '+path
    print('PASS_LIVE',path,flush=True)
    return dict(path=path,kind=kind,bytes=len(data),sha256=actual)
with ThreadPoolExecutor(max_workers=4) as pool:downloads=list(pool.map(check,jobs))
report=dict(verified_at=datetime.now(timezone.utc).isoformat(),published_commit=args.published_commit,
    page=BASE+'beckenburg-asset-libraries.html',libraries=libraries,downloads=downloads)
out=ROOT/'development/levels/verification/live-libraries-results.json'
out.write_text(json.dumps(report,indent=2)+'\n')
print('PASS live CC0 page, 3 manifests/licenses,',len(downloads)-3,'individual GLBs and 3 library ZIP hashes',flush=True)
