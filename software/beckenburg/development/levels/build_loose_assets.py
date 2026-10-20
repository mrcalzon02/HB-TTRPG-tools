"""Original independent CC0 household objects, at their real handheld size."""
import sys,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(Path(__file__).parent))
import build_lived_assets as b
s=b.s
for kind in ['mug','bottle','book','tin','bowl','toy','frame','candlestick']:
    m=b.init();p=[]
    if kind=='mug':
        p=[s.lathe('Hollow earthenware mug',[(0,.040),(.01,.046),(.105,.050),(.112,.049),(.112,.041),(.020,.036)],m['ivory'],16)]
        p+=s.tube('Integral curved handle',[(.043,0,.09),(.075,0,.095),(.086,0,.075),(.082,0,.04),(.043,0,.028)],.009,m['ivory'],8)
    elif kind=='bottle':
        p=[s.lathe('Old stoneware bottle',[(0,.042),(.015,.048),(.17,.048),(.20,.022),(.26,.020)],m['green'],16),s.lathe('Cork stopper',[(.26,.021),(.28,.021)],m['pine'],12),s.box('Faded paper label',(0,-.048,.11),(.061,.003,.075),m['paper'],.003)]
    elif kind=='book':
        p=[s.box('Uneven bound pages',(0,0,.020),(.14,.215,.028),m['paper'],.003)]
        for z in [.004,.037]:p.append(s.box('Worn cloth cover',(0,0,z),(.154,.228,.008),m['red'],.003))
        p.append(s.box('Rounded cloth spine',(-.077,0,.02),(.012,.228,.038),m['red'],.004))
        for y in [-.08,.08]:p.append(s.box('Spine gilt band',(-.084,y,.02),(.002,.005,.024),m['brass']))
    elif kind=='tin':
        p=[s.lathe('Pressed tin tea canister',[(0,.055),(.008,.059),(.135,.059),(.142,.062),(.155,.062)],m['steel'],16),s.rod('Lid pull',(0,0,.155),(0,0,.17),.015,m['brass'],10),s.box('Faded tea label',(0,-.060,.075),(.070,.002,.075),m['paper'])]
    elif kind=='bowl':p=[s.lathe('Hollow pottery bowl',[(0,.04),(.012,.05),(.045,.085),(.074,.10),(.081,.098),(.079,.087),(.037,.065),(.018,.03)],m['blue'],20)]
    elif kind=='toy':
        p=[s.box('Wooden toy engine',(0,0,.06),(.085,.18,.07),m['green'],.009),s.box('Engine cab',(0,.05,.12),(.085,.07,.08),m['red'],.005),s.rod('Chimney',(0,-.05,.095),(0,-.05,.145),.015,m['black'],8)]
        for x in [-.052,.052]:
            for y in [-.06,.065]:p.append(s.rod('Turned wooden wheel',(x-.008,y,.03),(x+.008,y,.03),.030,m['black'],12))
    elif kind=='frame':
        p=[s.box('Blank faded portrait paper',(0,0,.11),(.12,.009,.17),m['paper'])]
        for x in [-.071,.071]:p.append(s.box('Carved upright moulding',(x,-.006,.11),(.024,.023,.214),m['oak'],.004))
        for z in [.01,.21]:p.append(s.box('Carved cross moulding',(0,-.006,z),(.16,.023,.024),m['oak'],.004))
        p.append(s.rod('Physical folding easel',(0,.009,.17),(0,.08,.006),.009,m['oak'],6))
    else:
        p=[s.lathe('Turned brass candlestick',[(0,.06),(.01,.065),(.025,.045),(.045,.023),(.19,.014),(.20,.035),(.22,.035)],m['brass'],16),s.lathe('Unlit wax stump',[(.22,.024),(.31,.024),(.32,.019)],m['ivory'],12),s.rod('Black wick',(0,0,.32),(0,0,.33),.002,m['black'],5)]
    b.export('level_loose_'+kind,p,'household',view=(.38,-.55,.35))
path=ROOT/'development/levels/lived-assets.json';doc=json.loads(path.read_text());ids={r['id'] for r in b.LOG}
doc['assets']=[r for r in doc['assets'] if r['id'] not in ids]+b.LOG
path.write_text(json.dumps(doc,indent=2)+'\n')
