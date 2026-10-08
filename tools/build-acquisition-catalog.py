#!/usr/bin/env python3
"""Build the dated library source catalog from local acquisition records and package metadata.
Run on the prepared Linux laptop; does not download, install, or publish anything.
"""
from pathlib import Path
from collections import Counter
import argparse,configparser,csv,hashlib,html,json,re,shlex,subprocess
parser=argparse.ArgumentParser();parser.add_argument('--data-root',type=Path,default=Path(__file__).resolve().parents[3]);args=parser.parse_args()
base=args.data_root.resolve();repo=base/'Projects/HB-TTRPG-tools';out=repo/'data/acquisition-library';out.mkdir(parents=True,exist_ok=True)
def run(cmd):return subprocess.run(cmd,check=True,capture_output=True,text=True).stdout
def read(p):return json.loads(p.read_text())
def relative(p):
 try:return str(Path(p).relative_to(base))
 except ValueError:return str(p).replace(str(Path.home()),'~')
def digest(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
 return h.hexdigest()
items=[]
def add(name,category,status,source='',download='',version='',local='',install='',notes='',sha256='',evidence=''):
 items.append(dict(id=f'item-{len(items)+1}',name=name,category=category,status=status,source=source,download=download,version=version,local=relative(local) if local else '',reacquire=install,notes=notes,sha256=sha256,evidence=evidence))
# Snapshot every installed Debian package, including dependencies, without host identifiers.
packages={}
for line in run(['dpkg-query','-W','-f=${binary:Package}\t${Version}\t${db:Status-Abbrev}\t${Homepage}\n']).splitlines():
 p,v,status,homepage=(line.split('\t')+['']*4)[:4]
 if status.startswith('ii'):packages[p]=dict(package=p,version=v,homepage=homepage)
manual=run(['apt-mark','showmanual']).splitlines()
(out/'installed-system-packages.json').write_text(json.dumps(list(packages.values()),indent=2)+'\n')
(out/'manual-package-names.txt').write_text('\n'.join(manual)+'\n')
with (out/'installed-system-packages.tsv').open('w') as f:
 w=csv.writer(f,delimiter='\t',lineterminator='\n');w.writerow(['package','version','homepage']);w.writerows((p,x['version'],x['homepage'] or '(not recorded)') for p,x in sorted(packages.items()))
def package(p):return packages.get(p) or packages.get(p+':amd64')
# Human-facing packages requested during this trip, including pending installations.
requested=set()
for script in [base/'Juneau-Kit/install-starter.sh',base/'Juneau-Kit/install-next-batch.sh',base/'Juneau-Kit/install-games-tools-batch3.sh',base/'Juneau-Kit/Games/install-retro.sh']:
 for line in script.read_text().splitlines():
  if 'apt-get install -y ' in line:requested.update(line.split('apt-get install -y ',1)[1].split())
requested.update('pdfarranger handbrake ffmpeg meld filezilla remmina gsmartcontrol hardinfo gparted geany mame supertuxkart wine winetricks unrar firefox libreoffice-writer libreoffice-calc gimp celluloid rhythmbox xreader warpinator'.split())
games=set('openttd openttd-opengfx openttd-openmsx openttd-opensfx wesnoth aisleriot sgt-puzzles frozen-bubble freedoom prboom-plus hedgewars supertux supertuxkart neverball neverputt chromium-bsu lbreakout2 pingus freedroidrpg endless-sky gnuchess stockfish quakespasm'.split())
emulators=set('dosbox scummvm mame'.split())
# Cache package-homepage metadata also for requested-but-missing packages.
for p in sorted(requested):
 x=package(p)
 homepage=x['homepage'] if x else ''
 if not x:
  proc=subprocess.run(['apt-cache','show',p],capture_output=True,text=True)
  match=re.search(r'^Homepage: (.+)$',proc.stdout,re.M)
  if match:homepage=match.group(1)
 if not homepage:homepage={'firefox':'https://www.mozilla.org/firefox/','warpinator':'https://github.com/linuxmint/warpinator'}.get(p,'https://packages.ubuntu.com/search?keywords='+p)
 category='Games — native' if p in games else ('Emulators' if p in emulators else 'Applications and utilities')
 add(p,category,'Installed' if x else 'Prepared, not installed',homepage,version=x['version'] if x else '',install=f'sudo apt-get install {shlex.quote(p)}',notes='Linux Mint/Ubuntu package name. Use the target OS package manager or upstream site on another OS.',evidence='dpkg-query snapshot; trip installer scripts')
# List other package-owned desktop applications too, rather than silently omitting pre-existing software.
paths=sorted(Path('/usr/share/applications').glob('*.desktop'))
owner_proc=subprocess.run(['dpkg-query','-S',*[str(p) for p in paths]],capture_output=True,text=True)
owners={}
for line in owner_proc.stdout.splitlines():
 if ': /' in line:
  pkg,path=line.split(': /',1);owners['/'+path]=pkg.split(',')[0]
groups={}
for p in paths:
 cfg=configparser.ConfigParser(interpolation=None,strict=False)
 try:cfg.read(p);entry=cfg['Desktop Entry']
 except (configparser.Error,KeyError):continue
 if entry.get('Type')!='Application' or entry.get('Hidden','false').lower()=='true':continue
 pkg=owners.get(str(p),'');x=package(pkg)
 if not x or pkg in requested or pkg.split(':')[0] in requested:continue
 groups.setdefault(pkg,[]).append(entry.get('Name',p.stem))
for pkg,names in sorted(groups.items()):
 x=package(pkg);home=x['homepage']
 mint_packages=set('captain fingwit hypnotix lightdm-settings mintbackup mintdesktop mintdrivers mintinstall mintlocale mintreport mintsources mintstick mintsysadm mintupdate mintwelcome sticky thingy webapp-manager xed'.split())
 source=home or ('https://packages.linuxmint.com/' if pkg in mint_packages else 'https://packages.ubuntu.com/search?keywords='+pkg)
 note='Package-owned desktop entries: '+', '.join(sorted(set(names)))+'. Original installation date/source was not recorded.'
 if not home:note+=' Linked distribution package index is the reacquisition route; original installer origin is unrecorded.'
 if pkg in ['chatgpt','codex']:note+=' This package name alone does not establish an official OpenAI distribution.'
 add(sorted(set(names))[0]+' ('+pkg+')','Other installed desktop apps','Installed',source,version=x['version'],install=f'Locate {pkg} in the target system’s package manager; if unavailable, use the source site. The original package source may be a local DEB.',notes=note,evidence='Current desktop entries and dpkg package metadata')
# Every installed Flatpak application, with exact identifiers and versions.
flatpaks=[]
for line in run(['flatpak','list','--app','--columns=application,name,version,origin']).splitlines():
 app,name,version,origin=(line.split('\t')+['']*4)[:4];flatpaks.append(dict(application=app,name=name,version=version,origin=origin))
 cat='Emulators' if app in ['io.github.dosbox-staging','io.mgba.mGBA','org.duckstation.DuckStation','org.flycast.Flycast','org.libretro.RetroArch','org.ppsspp.PPSSPP'] else 'Flatpak applications'
 add(name,cat,'Installed','https://flathub.org/apps/'+app,version=version,install=f'flatpak install flathub {app}',notes=f'Installed remote: {origin}. Flatpak and the Flathub remote must be configured on the other system. Game data/core/BIOS availability is separate.',evidence='flatpak list --app')
(out/'installed-flatpak-apps.json').write_text(json.dumps(flatpaks,indent=2)+'\n')
# Saved portable applications and development dependencies.
add('GitKraken Desktop','Applications and utilities','Downloaded and extracted','https://help.gitkraken.com/gitkraken-desktop/how-to-install/','https://release.gitkraken.com/linux/gitkraken-amd64.tar.gz',local=base/'Juneau-Kit/Tools/GitKraken',install='Download the vendor Linux tarball and extract into a user folder; launch gitkraken/gitkraken. Complete first-run sign-in/license choices separately.',notes='Vendor URL is mutable; exact saved archive version was not recorded. Interactive startup was not verified.',sha256=read(base/'Backups/HB-TTRPG-tools/manifest.json')['files'][2]['sha256'],evidence='GitKraken README and backup manifest')
add('Flare: Empyrean Campaign','Games — native','Installed portable game' if (base/'Juneau-Kit/Games/Portable/flare-installed/squashfs-root/AppRun').is_file() else 'Portable file present','https://flarerpg.org/download/','https://github.com/flareteam/flare-game/releases/download/v1.15/flare-linux64-v1.15.AppImage','1.15',base/'Juneau-Kit/Games/Portable/flare-linux64-v1.15.AppImage','Download the AppImage, mark executable, then launch. Use --appimage-extract-and-run if FUSE is unavailable.','Gameplay not manually tested.',digest(base/'Juneau-Kit/Games/Portable/flare-linux64-v1.15.AppImage'),'Saved AppImage and official Flare download page')
add('Simple Sound Manager','Applications and utilities','Installed local launcher','https://github.com/mrcalzon02/HB-TTRPG-tools','https://mrcalzon02.github.io/HB-TTRPG-tools/simple-sound-manager.html','0.7.0',Path.home()/'.local/share/simple-sound-manager','Use the Foundry Sound Manager page or repository releases; select the build for your operating system.','Installed source reports version 0.7.0; pre-existing source ZIPs 0.6.0/0.6.3 are also in Downloads.','', 'Local launcher, README and __version__')
add('Vocalinux','Applications and utilities','Installed local launcher','https://github.com/VocaHQ/vocalinux',version='0.17.0',local=Path.home()/'.local/share/vocalinux',install='Follow the upstream Linux installation instructions and download your chosen speech model.',notes='Installed from a local source checkout. Model choices/files are not enumerated here.',evidence='Installed package METADATA and source checkout remote')
# TGMC bundle includes hashes/URLs for eight tool artifacts.
for row in read(repo/'data/ss13-ss14/setup/tgmc/downloads.json'):
 n=row['file'];name={'byond.zip':'BYOND Linux development tools','strongdmm.zip':'StrongDMM','node.tar.xz':'Node.js','librust_g.so':'rust-g 32-bit native library'}.get(n,n)
 version={'byond.zip':'516.1659','strongdmm.zip':'2.18.0.alpha','node.tar.xz':'22.11.0','librust_g.so':'3.11.0'}.get(n,'suite-1.11')
 add(name,'Development tools','Installed portable tool',row['url'],row['url'],version,'Tools/TGMC','Use the TGMC Development Setup bundle; installs dependencies, pinned tools, map editor and local host.','Development Setup covers Linux x86-64. Other OS builds are available from the linked upstream projects.',row['sha256'],'TGMC setup downloads.json')
sdk=read(base/'Tools/SS14/sdk-download.json')
add('.NET SDK and runtime','Development tools','Installed portable tool','https://dotnet.microsoft.com/download/dotnet/10.0',sdk['url'],sdk['version'],'Tools/SS14/dotnet','Use the SS14 Development Setup bundle. SDK archive SHA-512 is recorded in the downloadable setup metadata.','Installed SDK 10.0.401; runtime 10.0.12.',evidence='Tools/SS14/sdk-download.json')
add('Python map-tool environment','Development tools','Installed portable environment','https://pypi.org/project/bidict/','https://pypi.org/project/Pillow/',local='Tools/TGMC/python',install='python3 -m venv map-tools; install bidict==0.23.1 and Pillow==10.4.0 using that environment’s pip.',notes='Included in TGMC setup. Use system Python 3 with venv support.',evidence='TGMC setup installer')
add('Microsoft Visual C++ x86 redistributable','Development tools','Downloaded and installed in Wine','https://learn.microsoft.com/cpp/windows/latest-supported-vc-redist','https://aka.ms/vs/17/release/vc_redist.x86.exe',local='Tools/TGMC/vc_redist.x86.exe',install='Install the official x86 VC redistributable into a dedicated Wine prefix before running the Windows BYOND player.',notes='URL is mutable. The map-editor bundles do not install the Windows player/Wine prefix.',sha256=digest(base/'Tools/TGMC/vc_redist.x86.exe'),evidence='Saved TGMC player dependency')
add('Wine Gecko x86','Development tools','Downloaded and installed in Wine','https://wiki.winehq.org/Gecko','https://dl.winehq.org/wine/wine-gecko/2.47.4/wine-gecko-2.47.4-x86.msi','2.47.4','Tools/TGMC/wine-gecko-x86.msi','Install official Gecko into the dedicated Wine prefix used by the BYOND player.',sha256=digest(base/'Tools/TGMC/wine-gecko-x86.msi'),evidence='Saved TGMC player dependency')
add('BYOND Windows player','Development tools','Downloaded; Wine launch verified','https://www.byond.com/download/build/516/','https://www.byond.com/download/build/516/516.1659_byond.zip','516.1659','Tools/TGMC/byond-windows.zip','Download the official Windows archive; use Windows or a dedicated 32-bit Wine prefix with VC runtime/Gecko.','Login and actual game control not manually verified.',digest(base/'Tools/TGMC/byond-windows.zip'),'TGMC setup records')
# All project repositories from their individual verified archive manifests.
for parent in [base/'Backups/GitHub-projects',base/'Backups/SS14',base/'Backups/SS14/dependencies']:
 for p in sorted(parent.glob('*/manifest.json')):
  d=read(p)
  if not isinstance(d,dict) or 'repository' not in d:continue
  url=d.get('url','https://github.com/'+d['repository']+'.git');refs=d.get('refs',[])
  heads=[line for line in refs if ' refs/heads/main' in line or ' refs/heads/master' in line]
  version='; '.join(heads) if heads else ''
  note='Archive status: '+d.get('status','not recorded')+'. Source backup does not mean a built/installed application.'
  add(d['repository'],'Project repositories','Empty repository archived' if 'empty' in d.get('status','') else 'Source/history archived',url.removesuffix('.git'),url,version,p.parent, f'git clone {shlex.quote(url)} NEW-FOLDER',note,d.get('sha256',''),relative(p))
add('HB-TTRPG-tools','Project repositories','Working checkout and offline site','https://github.com/mrcalzon02/HB-TTRPG-tools','https://github.com/mrcalzon02/HB-TTRPG-tools.git',run(['git','-C',str(repo),'rev-parse','HEAD']).strip(),'Projects/HB-TTRPG-tools','git clone https://github.com/mrcalzon02/HB-TTRPG-tools.git NEW-FOLDER; serve the site with a local HTTP server.','Original verified bundle is under Backups/HB-TTRPG-tools. The catalog is being added after the snapshot commit recorded here.',evidence='Working Git checkout and verified backup')
add('Main TGMC development workspace','Project repositories','Built and local hosting verified','https://github.com/tgstation/TerraGov-Marine-Corps','https://github.com/tgstation/TerraGov-Marine-Corps.git','d17228095d2bbc94359acaf7421119a60c672261','Projects/TGMC','Use the TGMC Development Setup bundle to recover the restored maps and matching tools.','Upstream sources alone do not contain the locally restored Tyson/Hamburg/Ourang edits. Vapor remains current upstream.',evidence='Tools/TGMC/setup-manifest.json')
add('Local dated project files','Project repositories','Local archive preserved',local='Backups/local-project-files-2026-10-07.tar',install='Copy the local TAR archive and its JSON manifest from your backup drive; extract into a NEW folder.',notes='86 local project files. There is no public download source for unpublished work.',sha256=read(base/'Backups/local-project-files-2026-10-07.json')['sha256'],evidence='Local archive manifest')
# All DOS/ScummVM archives, with direct links where records or official catalogue establish them.
extra={'doom-box.zip':('DOOM 1.9 shareware','https://www.dosgamesarchive.com/download/doom',''), 'gotfree.zip':('God of Thunder','https://www.scummvm.org/games/','https://downloads.scummvm.org/frs/extras/God%20of%20Thunder/gotfree.zip'),'bass-cd-1.2.zip':('Beneath a Steel Sky (CD)','https://www.scummvm.org/games/','https://downloads.scummvm.org/frs/extras/Beneath%20a%20Steel%20Sky/bass-cd-1.2.zip'),'FOTAQ_Floppy.zip':('Flight of the Amazon Queen (floppy)','https://www.scummvm.org/games/','https://downloads.scummvm.org/frs/extras/Flight%20of%20the%20Amazon%20Queen/FOTAQ_Floppy.zip'),'bm-fw.zip':('Bio Menace (three episodes)','https://www.dosgamesarchive.com/file/bio-menace/bm-fw',''),'tyrianfw.zip':('Tyrian 2.1','https://www.dosgamesarchive.com/file/tyrian/tyrianfw',''),'stargunnerfreeware.zip':('Stargunner','https://www.dosgamesarchive.com/file/stargunner/stargunnerfreeware','')}
for url,file,checksum in read(base/'Juneau-Kit/Games/Archives/next-batch-sources.json'):
 extra[file]=({'drascula-1.0.zip':'Dráscula (English)','dreamweb-cd-us-1.1.zip':'DreamWeb (English US CD)','FOTAQ_Talkie-original.zip':'Flight of the Amazon Queen (voiced CD)','lure-1.1.zip':'Lure of the Temptress (English)'}[file],'https://www.scummvm.org/games/',url)
for d in read(base/'Juneau-Kit/Games/Archives/shareware-batch3-sources.json'):
 extra[Path(d['local']).name]=(Path(d['local']).stem,'https://github.com/libretro/libretro-content',d['url'])
for f in sorted((base/'Juneau-Kit/Games/Archives').glob('*.zip')):
 title,source,url=extra.get(f.name,(f.stem,'',''))
 engine='ScummVM' if f.name in ['bass-cd-1.2.zip','FOTAQ_Floppy.zip','FOTAQ_Talkie-original.zip','drascula-1.0.zip','dreamweb-cd-us-1.1.zip','lure-1.1.zip'] else ('Quakespasm' if f.name.startswith('Quake') else 'DOSBox')
 add(title,'Games — DOS and adventures','Downloaded and extracted',source,url,local=f,install=f'Download the archived release, extract it and run with {engine}. Keep original installers and any bundled configuration.',notes='Shareware/freeware release recorded in trip guides. Gameplay not individually verified. Quakespasm is still pending if marked not installed above.',sha256=digest(f),evidence='Saved game archive; trip guides and source manifests')
for folder,cat in [('ROMs','Games — homebrew ROMs'),('MAME','Games — MAME')]:
 for d in read(base/f'Juneau-Kit/Games/{folder}/sources.json'):
  f=Path(d['local']) if 'local' in d else base/'Juneau-Kit/Games/MAME/roms'/d['file']
  name=Path(d.get('path',d.get('file',''))).stem
  source='https://github.com/libretro/libretro-content' if folder=='ROMs' else 'https://www.mamedev.org/roms/'
  add(name,cat,'Downloaded',source,d.get('url',d.get('source','')),local=f,install='Use the matching emulator/core; keep MAME archive names and ZIP packaging unchanged.' if folder=='MAME' else 'Download the exact homebrew ROM and use the matching emulator/core. Extract ZIPs when required.',notes='Emulator/core compatibility and gameplay not individually verified. MAME creator-authorized terms require non-commercial use and separate redistribution permission.' if folder=='MAME' else 'Selected publicly distributed homebrew/demo games; no commercial BIOS collection included.',sha256=d.get('sha256',''),evidence=f'Games/{folder}/sources.json')
# Optional installed homebrew emulator cores, with exact saved download hashes.
core_manifest=base/'Juneau-Kit/Games/RetroArch-Cores/sources.json'
if core_manifest.is_file():
 for core in read(core_manifest):
  library=base/'Juneau-Kit/Games/RetroArch-Cores'/core['archive'].removesuffix('.zip')
  add(library.stem,'Emulators','Installed portable core','https://www.libretro.com/',core['source'],local=library.parent/core['archive'],install='Download the official Linux x86-64 Libretro core ZIP, extract, and launch RetroArch with -L pointing to the .so and the homebrew ROM.',notes='NES: FCEUmm; SNES: Snes9x. Download archive SHA-256 recorded; nightlies are mutable. Both libraries loaded successfully; RetroArch sandbox file access checked.',sha256=core['sha256'],evidence='Juneau-Kit/Games/RetroArch-Cores/sources.json')
# Media/reference manifests preserve individual source URLs, not only collection homepages.
for d in read(base/'Juneau-Kit/Books/sources.json'):
 f=Path(d['local']);add(d['title'],'Books','Downloaded','https://www.gutenberg.org/ebooks/'+str(d['id']),d['url'],local=f,install='Download EPUB from Project Gutenberg and open in Foliate or Calibre.',notes='Shelf: '+d['folder']+'. Follow the source usage terms for your location.',sha256=d['sha256'],evidence='Books/sources.json')
for d in read(base/'Juneau-Kit/Music/sources.json'):
 f=Path(d['path']);add(f.stem,'Music','Downloaded',d['source'],d['url'],local=f,install='Download the source audio and open in VLC/Rhythmbox; retain credits and track licensing.',notes='Recorded license: '+d.get('license','not recorded')+'. Source MD5: '+d.get('md5',''),evidence='Music/sources.json')
f=next((base/'Juneau-Kit/Music/Classical/Holst - The Planets').glob('*.flac'))
add('Holst: The Planets — Holst / London Symphony Orchestra 1922–23','Music','Downloaded original and MP3 copy','https://commons.wikimedia.org/wiki/File:Holst_-_The_Planets_(Columbia_1922-23).flac',local=f,install='Download the original FLAC from Wikimedia Commons; convert a personal MP3 copy with FFmpeg if desired.',notes='Historic mono recording. Retain the source’s public-domain and attribution information.',sha256=digest(f),evidence='Holst SOURCE.md')
for url,checksum in re.findall(r"download '([^']+)' '([^']+)'",(base/'Juneau-Kit/download-wikis.sh').read_text()):
 f=base/'Juneau-Kit/Wikis'/url.rsplit('/',1)[1]
 add(f.stem,'Offline references','Downloaded','https://library.kiwix.org/',url,'September 2026',f,'Install Kiwix and open the downloaded .zim file.',notes='Snapshot archive; a newer filename may be needed if the historical download is retired.',sha256=checksum,evidence='download-wikis.sh and offline reference guide')
add('D&D 3.5 SRD — Sovelior/Sage compilation','Offline references','Offline mirror preserved','https://d20.odk.com/SRD/home.html',local='Juneau-Kit/TTRPG/SRD35',install='Acquire the compilation from its source or copy the archived SRD35 folder; open SRD/home.html. Retain all license pages.',notes='210 HTML pages archived. Some source links are malformed or external. The separate d20srd landing page is not a full mirror.',evidence='TTRPG/README.md')
for name,choice in [('Tyson Station','tyson'),('Port Hamburg','hamburg'),('SS Ourang Medan','ourang'),('Vapor Processing','vapor')]:
 add(name+' — restored TGMC and native SS14 layouts','Map workspaces','Converted; native validation passed','ss13-ss14.html','ss13-ss14-dev-setup.html',local='Tools/SS14/tgmc-port',install=f'Download the TGMC or SS14 Development Setup bundle, install in a new folder, then run edit.sh {choice}.',notes='Local edits/ports require the bundled payload, not an upstream clone alone. SS14 missions and full engineering networks remain pending.',evidence='SS13–SS14 conversion and setup records')
# Existing downloads whose acquisition provenance was never captured: no invented source.
add('Civil War Generals 2 — pre-existing local game downloads','Other local acquisitions','Local archives present; source unrecorded',local='~/Downloads',install='Recover from your own original installer/discs or licensed backup. The original download URL was not recorded.',notes='ISO/7z, patch, manual and reference-card filenames are present. Installation/play status was not verified; game files are not redistributed in this catalog.',evidence='Read-only Downloads filename inventory')
# No false claims of movies/GOG games being installed from suggested shopping lists.
counts=dict(Counter(x['category'] for x in items))
meta={'snapshot_date':'2026-10-07','system':'Linux Mint 22.3 x86-64','scope':'Trip acquisitions, portable tools, all current package-owned desktop apps, installed Flatpak apps, archived repositories, books, music and references. Full installed system-package snapshot is a separate supplement.','entry_count':len(items),'categories':counts,'installed_system_package_count':len(packages),'flatpak_app_count':len(flatpaks),'notes':['Installed/downloaded/source-archived/pending statuses are separate. No acquisition timeline can be inferred for pre-existing apps.','URLs are recorded sources, not a promise of future availability. Some vendor URLs are mutable.','Empty Movies and GOG-Installers folders do not establish downloaded movies or installed GOG titles.','Local browser campaign data, passwords, account credentials and media/device identifiers are not included.'],'items':items}
(out/'catalog.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
with (out/'catalog.tsv').open('w') as f:
 w=csv.DictWriter(f,fieldnames=list(items[0]),delimiter='\t',lineterminator='\n');w.writeheader();w.writerows(items)
# A readable static page also works without JS and without an HTTP server.
e=html.escape
rows=''
for x in items:
 links=[]
 for label,key in [('Source','source'),('Download / setup','download')]:
  url=x[key]
  if url:links.append(f'<a href="{e(url,quote=True)}">{label}</a>')
 detail=f'<p>{e(x["notes"])}</p><p><strong>Reacquire:</strong> {e(x["reacquire"])}</p>'
 if x['local']:detail+=f'<p><strong>Local copy:</strong> <code>{e(x["local"])}</code></p>'
 if x['sha256']:detail+=f'<p><strong>Saved SHA-256:</strong> <code>{e(x["sha256"])}</code></p>'
 detail+=f'<p><small>Evidence: {e(x["evidence"])}</small></p>'
 rows+=f'<tr data-category="{e(x["category"],quote=True)}" data-status="{e(x["status"],quote=True)}"><th scope="row"><details><summary>{e(x["name"])}</summary>{detail}</details></th><td>{e(x["category"])}</td><td>{e(x["status"])}<small>{e(x["version"])}</small></td><td>{" · ".join(links) or "Source not recorded"}</td></tr>\n'
options=''.join(f'<option>{e(c)}</option>' for c in sorted(counts))
page='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acquired Software and Source Library | Calzon’s TTRPG Foundry</title><meta name="description" content="Sources and reinstall instructions for acquired applications, games, emulators, development tools, archived projects, books, music and offline references."><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="workspace-landing.css"><style>.source-library{max-width:1300px;margin:auto;padding:1rem}.source-library p{line-height:1.6}.filters{display:flex;flex-wrap:wrap;gap:1rem}.filters label{display:flex;flex-direction:column;gap:.4rem}.filters input,.filters select{font:inherit;padding:.65rem;max-width:100%}.table-scroll{overflow:auto}table{border-collapse:collapse;width:100%}th,td{padding:.8rem;text-align:left;vertical-align:top;border-bottom:1px solid currentColor}summary{cursor:pointer}small{display:block;margin-top:.4rem}details{min-width:210px}details p{font-weight:normal}code{overflow-wrap:anywhere}.library-actions{display:flex;flex-wrap:wrap;gap:1rem;margin:1rem 0}tr[hidden]{display:none}@media(max-width:600px){th,td{padding:.5rem;font-size:.9rem}}</style></head><body><header class="site-header no-print"><div><p class="eyebrow">Acquisition record · 7 October 2026</p><h1>Sources and Reinstall Library</h1><p class="subtitle">Find the original source and rebuild your collection on another system.</p></div><nav class="top-nav" aria-label="Primary"><a class="nav-button" href="index.html">Tools</a><a class="nav-button active" href="acquisition-library.html" aria-current="page">Sources Library</a><a class="nav-button" href="low-power-system-setup-archive.html">Low power system setup archive</a><a class="nav-button" href="ss13-ss14-dev-setup.html">SS13–SS14 Setup</a><a class="nav-button" href="site-map.html">Site Map</a></nav></header><main class="source-library"><section class="hero-card"><h2>What is recorded</h2><p>ENTRYCOUNT entries cover acquired files, installed applications and archived projects, including pre-existing desktop applications and emulators. Expand any title to see its recovery steps, local location and available checksum. Status records distinguish installed apps, downloaded game/media files, archived source, and prepared installers that still need running.</p><p>This is a dated Linux Mint 22.3 snapshot. Source links were recovered from saved manifests, official download pages and current package metadata. Historical files and exact package versions may eventually disappear from upstream. Keep your own verified backup for exact recovery. Use the upstream source to choose the appropriate version for a different operating system.</p><div class="library-actions"><a href="data/acquisition-library/catalog.json" download>Download full JSON catalog</a><a href="data/acquisition-library/catalog.tsv" download>Download tab-separated catalog</a><a href="data/acquisition-library/REINSTALL.md">Recovery guide</a><a href="ss13-ss14-dev-setup.html">Complete TGMC and SS14 setup bundles</a></div></section><section><h2>Reinstall on another machine</h2><p>Mint/Ubuntu apps list their package names. Flatpak apps list their exact Flathub IDs. Portable apps, games, books and recordings include source/download links. Projects include their repository URLs and local archive locations; source archives are not automatically installed games.</p><p>The separate <a href="data/acquisition-library/installed-system-packages.tsv" download>installed system-package snapshot</a> records PACKAGECOUNT packages, including libraries and operating-system components. It is a reference rather than a script to apply wholesale to another operating system. <a href="data/acquisition-library/installed-flatpak-apps.json">Flatpak app snapshot</a> and <a href="data/acquisition-library/manual-package-names.txt">manually marked package names</a> are also saved.</p><p>No downloaded movie collection or installed GOG game collection was found in the trip folders. MiniGalaxy is installed; sign into your GOG account to obtain your own titles. Account credentials and browser-saved campaigns are not included. Export campaign data separately.</p></section><section aria-labelledby="catalog-title"><h2 id="catalog-title">Browse the source catalog</h2><div class="filters"><label>Search titles, sources and recovery notes<input id="library-search" type="search" placeholder="Doom, Holst, Tyson, Calibre…"></label><label>Category<select id="library-category"><option value="">All categories</option>OPTIONS</select></label><button id="library-reset" type="button" class="link-button">Clear filters</button></div><p id="library-count" role="status" aria-live="polite">ENTRYCOUNT entries</p><div class="table-scroll"><table><thead><tr><th>Title and recovery details</th><th>Category</th><th>Recorded state / version</th><th>Acquire again</th></tr></thead><tbody id="library-rows">ROWS</tbody></table></div></section><p>Original notices and source-specific licenses remain applicable. This page lists sources; it does not redistribute the recorded game ROMs, music or ebooks.</p></main><script src="acquisition-library.js"></script></body></html>'''.replace('ENTRYCOUNT',str(len(items))).replace('PACKAGECOUNT',str(len(packages))).replace('OPTIONS',options).replace('ROWS',rows)
(repo/'acquisition-library.html').write_text(page)
(repo/'acquisition-library.js').write_text('''"use strict";
const librarySearch = document.getElementById("library-search");
const libraryCategory = document.getElementById("library-category");
const libraryRows = [...document.querySelectorAll("#library-rows tr")];
const libraryText = libraryRows.map(row => row.textContent.toLowerCase());
function filterLibrary() {
  const query = librarySearch.value.trim().toLowerCase();
  let shown = 0;
  libraryRows.forEach((row, i) => {
    const visible = (!query || libraryText[i].includes(query)) && (!libraryCategory.value || row.dataset.category === libraryCategory.value);
    row.hidden = !visible;
    if (visible) shown++;
  });
  document.getElementById("library-count").textContent = `${shown} of ${libraryRows.length} entries`;
}
librarySearch.addEventListener("input", filterLibrary);
libraryCategory.addEventListener("change", filterLibrary);
document.getElementById("library-reset").addEventListener("click", () => {
  librarySearch.value = "";
  libraryCategory.value = "";
  filterLibrary();
  librarySearch.focus();
});
filterLibrary();
''')
(out/'REINSTALL.md').write_text('''# Reacquire this laptop's collection

Snapshot: 7 October 2026, Linux Mint 22.3 x86-64.

Open acquisition-library.html for the searchable listing, or retain catalog.json
and catalog.tsv. Each entry includes status, source, direct download when known,
local path relative to the Data folder, recovery instructions and checksums when
recorded. ~/.local entries refer to the user's home folder on this laptop.

## Applications

Use the package name in each Mint/Ubuntu app entry with your target distribution's
package manager. Version numbers are observations, not a claim that those exact
versions remain in current repositories. Packages from local DEBs may need their
original vendor installer rather than apt. A source that could not be established
is explicitly blank/unrecorded. This is not a substitute OS backup.

Installed Flatpak app identifiers are in installed-flatpak-apps.json. Configure
Flatpak and Flathub, then use the individual catalog install command.

GitKraken: use the official Linux tarball/vendor OS installer. First-run account
and license choices are separate. Flare: download its official 1.15 AppImage and
mark executable. The saved original archives permit exact recovery even when
mutable vendor URLs change.

## Game data and media

DOS games need DOSBox; ScummVM adventure files must be added through ScummVM.
Quake shareware needs Quakespasm; check its current catalog installation status. MAME archives
remain zipped and their expected names must be preserved; audit compatibility
with your installed core. Homebrew cartridge files need a matching emulator.
Refer to original source terms before redistributing files.

Books: obtain the EPUB from Project Gutenberg and use Foliate/Calibre.
Music: exact recorded file URLs and album sources are in the catalog, with source
license and MD5 notes. Holst's original FLAC is accompanied by a local MP3 copy.
Wikis: download the source .zim snapshot and open in Kiwix; use a newer filename
if the older snapshot is retired. The archived SRD folder keeps source licenses.

## Development and project recovery

Use the SS13–SS14 Development Setup bundles for fresh TGMC/StrongDMM and native
SS14 editor/server installations; they include all four maps. Upstream clones
alone do not restore locally converted or modified maps.

For other projects, clone the repository URL into a NEW directory. To restore a
saved Git bundle, first run `git bundle verify PATH.bundle`, then
`git clone PATH.bundle NEW-FOLDER`. Empty repository backups contain no commits.
Full SS14 source dependencies and Git history are separately archived under
Backups/SS14. TGMC history is under Backups/TGMC-upstream. Copy map-edit backups
and original maps as well as source bundles to the new system.

Local dated project files have no public source: copy the saved TAR and manifest
from Backups, check its SHA-256, and extract into a new folder. Browser-local
campaigns and sheets require a separate export; account passwords are not in
these archives. Source-code backups do not prove an application was built.

## Coverage and limitations

The catalog includes requested trip packages (even those still missing), current
package-owned desktop apps, all installed Flatpak apps, locally saved portable
tools, project archive manifests and individual media/game source records.
The full installed-system-packages snapshot includes dependencies. The manually
marked package list includes base OS components too; do not blindly install it
on another OS. Pre-existing app installation dates were not recorded.
Private photos/videos and account data are excluded. A pre-existing Civil War
Generals 2 download is listed with unrecorded provenance, not a fabricated link.
No installed GOG titles or movie downloads were found in the trip folders.
This catalog is not a complete scan of every arbitrary file outside those sources.
''')
print(json.dumps({'entries':len(items),'categories':counts,'system_packages':len(packages),'flatpak_apps':len(flatpaks)},indent=2))
