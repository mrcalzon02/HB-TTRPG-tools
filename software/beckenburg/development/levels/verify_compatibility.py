"""Recheck affected legacy contracts and the current online van against the level package.
Run verify_levels.py first. This does not replace the complete game release gate.
"""
import argparse,json,os,pathlib,subprocess,time
ROOT=pathlib.Path(__file__).resolve().parents[2]
CHECKS=['HorrorAudioRoutingTest','InvestigationSitesTest','ArchitecturalPlansTest',
        'VictorianHouseArchitectureTest','GrandSiteGeometryTest','LanSiteSelectionIntegrationTest',
        'SoloEnvironmentalEvidenceTest','LanClientDisconnectTest','LanGracefulLeaveTest',
        'LanWorldRenderTest','LanSoundTest','LanGhostHearingTest','VanStagingTest',
        'VanArrivalStreetTest','VanStreetAndCabinProportionsTest','VanModuleIntegrationTest','VanNavigationVisualTest',
        'GameplaySmokeTest','LanAcousticsTest','LanApparitionTest','LanGhostIdentityTest',
        'LanGhostIntegrationTest','LanSpatialCombatTest','LanSpatialEvidenceTest',
        'LanWorldIntegrationTest','LanWorldTest','VanHidingTest']
ap=argparse.ArgumentParser();ap.add_argument('--java-home',type=pathlib.Path,required=True);args=ap.parse_args()
java=args.java_home/'bin'/('java.exe' if os.name=='nt' else 'java')
stage=ROOT/'build/level-release';cp=os.pathsep.join([str(stage/'beckenburg-levels.jar'),str(stage/'test')]);report=[]
for name in CHECKS:
    start=time.monotonic()
    try:
        result=subprocess.run([str(java),'-Djava.awt.headless=true','-ea','-cp',cp,'org.beckenburg.'+name],cwd=ROOT,capture_output=True,text=True,timeout=60)
        code,output=result.returncode,result.stdout+result.stderr
    except subprocess.TimeoutExpired as error:code,output=124,str(error)
    report.append(dict(test=name,exit_code=code,seconds=round(time.monotonic()-start,3),output=output))
    (stage/'compatibility-results.json').write_text(json.dumps(report,indent=2)+'\n')
    print(('PASS ' if code==0 else 'FAIL ')+name,flush=True)
    if code:print(output[:1800],flush=True)
print(f'{sum(row["exit_code"]==0 for row in report)}/{len(report)} affected compatibility checks passed')
raise SystemExit(any(row['exit_code'] for row in report))
