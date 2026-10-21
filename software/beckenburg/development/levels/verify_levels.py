"""Repeatable Java17 level/package verification. Does not publish or modify source assets.
Uses an isolated output directory and never recursively deletes the user's build.
"""
import argparse,json,os,pathlib,shutil,subprocess,time

ROOT=pathlib.Path(__file__).resolve().parents[2]
CHECKS=['AuthoredLevelPhysicsTest','AuthoredLevelReachabilityTest','AuthoredLevelStateTest','AuthoredLevelNetworkTest','AuthoredLevelRitualCaseTest','WorldViewHandednessTest','MouseLookTest','AuthoredUtilitiesTest','SoloElevationTest','EquipmentAssetAssignmentsTest','EquipmentModelCatalogTest','PackagedSourceModelsTest','LevelRenderAcceptanceTest','LevelSurfaceIntegrityTest','LivedLevelDressingTest','LooseClutterTest','LooseClutterNetworkTest','HauntedFixturesTest','VanHumanScaleTest','VanRackStockTest','VanRackNetworkTest','InteractionFocusTest','InteractionNetworkTest','HeldDeviceReadoutTest']

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--java-home',type=pathlib.Path,required=True);ap.add_argument('--vehicle-archive',type=pathlib.Path);ap.add_argument('--full-regression',action='store_true');ap.add_argument('--package-only',action='store_true');args=ap.parse_args()
    stage=ROOT/'build/level-release';classes=stage/'classes';tests=stage/'test';classes.mkdir(parents=True,exist_ok=True);tests.mkdir(exist_ok=True)
    java=args.java_home/'bin'/('java.exe' if os.name=='nt' else 'java');javac=java.with_name('javac.exe' if os.name=='nt' else 'javac');jar=java.with_name('jar.exe' if os.name=='nt' else 'jar')
    def run(command):subprocess.run([str(x) for x in command],cwd=ROOT,check=True)
    for source,dest in [('main',classes),('test',tests)]:
        files=sorted((ROOT/f'src/{source}/java').rglob('*.java'))
        argfile=stage/f'{source}-sources.txt';argfile.write_text('\n'.join('"'+p.as_posix()+'"' for p in files),encoding='utf-8')
        run([javac,'--release','17','-encoding','UTF-8','-cp',classes,'-d',dest,'@'+str(argfile)])
    resource=classes/'org/beckenburg';resource.mkdir(parents=True,exist_ok=True)
    for name in ['models','level-textures','sfx','music']:
        shutil.copytree(ROOT/'assets/runtime'/name,resource/name,dirs_exist_ok=True)
    shutil.copyfile(ROOT/'assets/runtime/directional-sprites.zip',resource/'directional-sprites.zip')
    shutil.copyfile(ROOT/'assets/runtime/ui/psx-horror-ui-free-assets.zip',resource/'psx-horror-ui-free-assets.zip')
    with (resource/'ghost-sprite-expansion-v3.zip').open('wb') as out:
        for part in sorted((ROOT/'assets/runtime/ghost-sprite-parts').glob('ghost-sprite-expansion-v3.zip.part*')):
            with part.open('rb') as incoming:shutil.copyfileobj(incoming,out)
    run([java,'-Djava.awt.headless=true','-cp',classes,'org.beckenburg.KenneyMedievalAssets',ROOT/'assets/source/kenney_retro-medieval-kit.zip',resource/'models'])
    # Match the online Windows/Linux packaging contract: original vehicle atlases.
    archive=args.vehicle_archive or ROOT/'build/source/ggbot-original.zip'
    if not archive.exists():archive=ROOT/'assets/source/psx_style_cars_by_ggbot_august2023.zip'
    if not archive.exists():raise FileNotFoundError('Supply --vehicle-archive with the original checksum-pinned August 2023 GGBot ZIP')
    run([java,'-Djava.awt.headless=true','-cp',classes,'org.beckenburg.GgBotVehicleTextures',archive,ROOT/'assets/runtime/models',resource/'models'])
    # Legacy synth resources remain solely for the existing forge regression contract.
    # Current runtime prefab selections resolve the approved Blender/source catalog.
    run([java,'-Djava.awt.headless=true','-cp',classes,'org.beckenburg.TierModelForge',resource/'models'])
    artifact=stage/'beckenburg-levels.jar';run([jar,'--create','--file',artifact,'--main-class','org.beckenburg.InvestigationGame','-C',classes,'org/beckenburg'])
    if args.package_only:return
    names=CHECKS
    if args.full_regression:
        names=list(dict.fromkeys([s.strip() for s in (ROOT/'regression-tests.txt').read_text().splitlines() if s.strip() and not s.startswith('#')]+CHECKS))
    report=[];cp=os.pathsep.join((str(artifact),str(tests)))
    for name in names:
        if name=='SmokeTest' and not (tests/'org/beckenburg/SmokeTest.class').exists():continue
        start=time.monotonic()
        try:
            result=subprocess.run([str(java),'-Djava.awt.headless=true','-ea','-cp',cp,'org.beckenburg.'+name],cwd=ROOT,capture_output=True,text=True,timeout=60)
            code,output=result.returncode,result.stdout+result.stderr
        except subprocess.TimeoutExpired as e:
            code=124;output=str(e.stdout or '')+'\n'+str(e.stderr or '')+'\nTimed out at60seconds'
        row=dict(test=name,exit_code=code,seconds=round(time.monotonic()-start,3),output=output);report.append(row)
        (stage/'results.json').write_text(json.dumps(report,indent=2)+'\n')
        print(('PASS ' if code==0 else 'FAIL ')+name,flush=True)
        if code:print(output[:2000],flush=True)
    failed=[r for r in report if r['exit_code']]
    print(f'{len(report)-len(failed)}/{len(report)} passed; packaged artifact {artifact}',flush=True)
    raise SystemExit(bool(failed))

if __name__=='__main__':main()
