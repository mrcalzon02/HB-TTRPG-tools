"""Package and publish original CC0 assets to the repository's existing Pages website.
Third-party game scenery is deliberately outside these original libraries.
"""
import pathlib,json,hashlib,shutil,zipfile,html
ROOT=pathlib.Path(__file__).resolve().parents[2];SITE=ROOT.parents[1]
source=json.loads((ROOT/'development/levels/lived-assets.json').read_text());rows=source['assets']
DEDICATION='''Beckenburg original scenery — CC0 1.0 Universal

The rights holder dedicates these original models, their embedded procedural
textures, editable Blender assets, preview renders, original synthesized fixture
audio and activation example data to the public domain
under CC0 1.0 Universal, to the extent permitted by law.

License: https://creativecommons.org/publicdomain/zero/1.0/
Legal code: https://creativecommons.org/publicdomain/zero/1.0/legalcode
SPDX identifier: CC0-1.0

Commercial use, modification and redistribution are permitted. Attribution is
not required. No warranty is provided. This dedication applies only to the
files enumerated in this library's manifest. Purchased/source-pack game assets
are not included in these original libraries.
'''
titles={'industrial':'Boilers, heating and service machinery','household':'Inherited furniture and household curiosities','hiding':'Walk-in hiding cupboard','events':'Ghost event fixtures'}
descriptions={'industrial':'Three boiler generations, an expansion vessel, coal bunker, service pipework, switchgear, a workbench and radiator.',
    'household':'Bookcases, pantry stores, a collected display, sideboard, card table, ottoman, trunk, correspondence, kitchenware, toys and linen press.',
    'hiding':'A hollow cupboard with louvered leaves and coat rail. Its clear entrance and interior are designed for first-person use.',
    'events':'A rotary telephone, twin-bell bedside alarm, wall fire alarm, portable radio, cassette boom box and turned-leg telephone table. Clean and worn standalone models; game activation logic is documented separately.'}
libraries=[];sections=[]
for library,title in titles.items():
    folder=SITE/f'assets/beckenburg/libraries/{library}';folder.mkdir(parents=True,exist_ok=True)
    entries=[];cards=[]
    for row in rows:
        if row['library']!=library:continue
        assert row['license']=='CC0-1.0' and row['source']=='original geometry and procedural textures'
        name=row['id'];paths={}
        for kind,path in [('models',ROOT/f'assets/runtime/models/{name}.glb'),('source',ROOT/row['editable']),('previews',ROOT/f'development/levels/previews/{name}.png')]:
            dest=folder/kind/path.name;dest.parent.mkdir(exist_ok=True);shutil.copyfile(path,dest)
            paths[kind]=dest.relative_to(SITE).as_posix()
        assert hashlib.sha256((SITE/paths['models']).read_bytes()).hexdigest()==row['sha256']
        entries.append(dict(row,files=paths));label=row.get('family',name).removeprefix('level_').replace('_',' ').title()+' — '+row.get('variant','clean').title()
        cards.append(f'''<article class="asset" data-name="{html.escape(label.lower())}"><a href="{paths['previews']}"><img loading="lazy" src="{paths['previews']}" alt="Actual Blender preview of {html.escape(label)}" width="1536" height="640"></a><div><span class="license">CC0 1.0</span><h3>{html.escape(label)}</h3><p>{row['triangles']:,} triangles · Metres · Embedded textures</p><a download href="{paths['models']}">Download GLB</a> · <a download href="{paths['source']}">Editable Blender source</a></div></article>''')
    extras=[]
    if library=='events':
        extra_sources=[(p,'audio/'+p.name) for p in sorted((ROOT/'development/levels/event-audio').glob('*.wav'))]
        extra_sources += [(ROOT/'development/levels/EVENT_LIBRARY.md','INTERACTION.md'),(ROOT/'development/levels/event-activation-examples.json','activation-examples.json')]
        for path,relative in extra_sources:
            dest=folder/relative;dest.parent.mkdir(exist_ok=True);shutil.copyfile(path,dest)
            extras.append(dict(path=dest.relative_to(SITE).as_posix(),archive_path=relative,license='CC0-1.0',sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
        assert len(extras)==7,'Five original WAVs and two interaction documents must be present'
        cards.append('<p>Also included: <a href="assets/beckenburg/libraries/events/INTERACTION.md">interaction guide</a>, <a href="assets/beckenburg/libraries/events/activation-examples.json">activation examples</a>, and five original CC0 WAV cues in the library ZIP.</p>')
    manifest=dict(id=library,title=title,license='CC0-1.0',license_url='https://creativecommons.org/publicdomain/zero/1.0/',variants=['clean','worn'],assets=entries,extras=extras)
    (folder/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n');(folder/'LICENSE.txt').write_text(DEDICATION,encoding='utf-8')
    (folder/'README.txt').write_text(f'{title}\nCC0 1.0 Universal\n\nGLB: metres, +Y up; front +Z.\nBlender: metres, +Z up; front -Y.\nOriginal floor-centre origins are retained.\nAdd this folder in Blender Preferences > File Paths > Asset Libraries to use asset-library.blend.\nThe pipework is a measured school-service-room assembly; the other assets are individually reusable.\nSee manifest.json for hashes and dimensions.\n',encoding='utf-8')
    archive=folder/f'beckenburg-{library}-cc0.zip'
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
        for path in sorted(folder.rglob('*')):
            if path.is_file() and path!=archive and path.suffix!='.zip':
                info=zipfile.ZipInfo(path.relative_to(folder).as_posix(),date_time=(2026,10,20,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o644<<16;z.writestr(info,path.read_bytes())
    libraries.append(dict(id=library,title=title,license='CC0-1.0',count=len(entries),manifest=(folder/'manifest.json').relative_to(SITE).as_posix(),download=archive.relative_to(SITE).as_posix(),sha256=hashlib.sha256(archive.read_bytes()).hexdigest()))
    sections.append(f'''<section id="{library}"><h2>{title}</h2><p>{descriptions[library]}</p><p><a class="download" download href="{archive.relative_to(SITE).as_posix()}">Download {library} CC0 library — {len(entries)} assets</a> <a href="assets/beckenburg/libraries/{library}/LICENSE.txt">CC0 license</a> · <a href="assets/beckenburg/libraries/{library}/manifest.json">Asset manifest</a></p><div class="grid">{''.join(cards)}</div></section>''')
(SITE/'assets/beckenburg/libraries/index.json').write_text(json.dumps(dict(license='CC0-1.0',libraries=libraries),indent=2)+'\n')
page='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Beckenburg CC0 Asset Libraries</title><meta name="description" content="Download original CC0 PSX scenery: boilers, machinery, lived-in household furniture, clutter and walk-in cupboards. GLB and editable Blender Asset Browser libraries."><link rel="canonical" href="https://mrcalzon02.github.io/HB-TTRPG-tools/beckenburg-asset-libraries.html"><style>body{font:17px/1.55 system-ui,sans-serif;background:#14191f;color:#e6e4dc;max-width:1400px;margin:auto;padding:28px}a{color:#b6d8e3}h1{font-size:clamp(2rem,5vw,3.5rem);line-height:1.1}h2{margin-top:52px}nav{display:flex;flex-wrap:wrap;gap:22px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:20px}.asset{background:#232b32;border:1px solid #46535a;border-radius:9px;overflow:hidden}.asset img{width:100%;height:auto;display:block}.asset div{padding:16px}.asset h3{margin:8px 0}.asset p{font-size:.9rem;color:#c1c9c8}.license{display:inline-block;font-size:.85rem;font-weight:700;background:#b8d4b7;color:#182d1e;border-radius:4px;padding:3px 8px}.download{display:inline-block;background:#c9bd93;color:#242a24;font-weight:700;padding:10px 16px;margin:0 15px 10px 0;border-radius:5px}input{font:inherit;padding:10px;max-width:94%;width:440px;background:#232b32;color:white;border:1px solid #7c909a;border-radius:4px}a:focus-visible,input:focus-visible{outline:3px solid #eed68b;outline-offset:4px}.intro{max-width:950px}small{color:#c1c9c8}</style></head><body><nav><a href="beckenburg.html">The Beckenburg Project</a><a href="#industrial">Industrial</a><a href="#household">Household</a><a href="#hiding">Hiding cupboard</a><a href="#events">Ghost event fixtures</a></nav><main><h1>Original CC0 asset libraries</h1><p class="intro">Reusable PSX scenery built for Beckenburg. Every asset on this page—including its embedded textures—is original and released under <a rel="license" href="https://creativecommons.org/publicdomain/zero/1.0/">CC0 1.0 Universal</a>. Use, modify and redistribute it, including commercially; attribution is not required.</p><p class="intro">Download individual GLBs or editable Blender sources below. Each library ZIP also contains a native Blender Asset Browser library, previews, dimensions, hashes and its CC0 license. Purchased archive assets used inside the game are outside these downloads.</p><label for="search">Find an asset</label><p><input id="search" type="search" placeholder="Boiler, card table, cupboard…" autocomplete="off"></p>'''+''.join(sections)+'''</main><footer><p><small>Actual model renders, not concept illustrations. Original asset coordinates and embedded materials are retained. CC0 applies to the files enumerated by each library manifest.</small></p></footer><script>document.getElementById('search').addEventListener('input',function(){const query=this.value.toLowerCase().trim();document.querySelectorAll('.asset').forEach(card=>{card.hidden=!card.dataset.name.includes(query)});});</script></body></html>'''
page=page.replace('Download individual GLBs or editable Blender sources below.', 'Each model has a preserved Clean version and a separate Worn version. Both have identical geometry, UVs, metre scale and pivots. The worn set is used in the game. Download individual GLBs or editable Blender sources below.')
(SITE/'beckenburg-asset-libraries.html').write_text(page,encoding='utf-8')
print('Published',len(rows),'original CC0 assets in',len(libraries),'downloadable libraries')
