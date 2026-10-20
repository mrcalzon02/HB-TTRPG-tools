"""Original CC0 activatable fixtures; water uses the existing hollow sink geometry."""
import sys,json,math
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(Path(__file__).parent))
import build_lived_assets as b
s=b.s
for kind in ['phone','alarm_clock','fire_alarm','radio','boom_box','side_table']:
    m=b.init();p=[]
    if kind=='phone':
        p=[s.box('Rounded telephone pedestal',(0,0,.035),(.28,.22,.07),m['black'],.025),s.lathe('Rotary dial plate',[(.071,.065),(.078,.065)],m['brass'],20,(0,-.035,0))]
        for i in range(10):
            a=i*math.tau/10;p.append(s.lathe('Dial finger recess',[(.078,.011),(.080,.011)],m['black'],8,(.047*math.cos(a),-.035+.047*math.sin(a),0)))
        p+=s.tube('Attached handset bridge',[(-.10,.06,.11),(-.07,.06,.15),(.07,.06,.15),(.10,.06,.11)],.018,m['black'],10)
        for x in [-.10,.10]:p.append(s.lathe('Handset earpiece',[(.075,.037),(.09,.042),(.13,.026)],m['black'],12,(x,.06,0)))
        points=[(.125+.009*math.cos(i*.8),.06-i*.003,.085+.009*math.sin(i*.8)) for i in range(42)]
        p+=s.tube('Attached coiled handset cord',[(.10,.06,.11)]+points+[(.10,-.08,.055)],.003,m['black'],5)
    elif kind=='alarm_clock':
        p=[s.rod('Clock metal case',(0,.025,.095),(0,-.025,.095),.080,m['steel'],24),s.rod('Clock dial',(0,-.027,.095),(0,-.029,.095),.071,m['ivory'],24)]
        for i in range(12):
            a=i*math.tau/12;p.append(s.rod('Dial hour tick',(.061*math.sin(a),-.031,.095+.061*math.cos(a)),(.052*math.sin(a),-.031,.095+.052*math.cos(a)),.002,m['black'],4))
        p+=s.tube('Clock hands',[(.028,-.034,.11),(0,-.034,.095),(-.008,-.034,.14)],.003,m['black'],5)
        for x in [-.055,.055]:
            p.append(s.rod('Clock foot',(x,0,0),(x*.8,0,.045),.009,m['brass'],8))
            p.append(s.rod('Bell support',(x*.75,0,.15),(x,0,.185),.006,m['brass'],8))
            p.append(s.lathe('Alarm bell',[(.175,.035),(.185,.037),(.205,.022)],m['red'],16,(x,0,0)))
        p.append(s.rod('Attached bell striker',(0,0,.16),(0,0,.195),.004,m['steel'],6))
    elif kind=='fire_alarm':
        p=[s.box('Wall mounting plate',(0,0,.12),(.23,.035,.24),m['steel'],.008),s.rod('Fire alarm gong',(0,-.02,.135),(0,-.065,.135),.11,m['red'],24),s.rod('Gong central screw',(0,-.066,.135),(0,-.072,.135),.009,m['brass'],8),s.box('Indicator bezel',(0,-.03,.27),(.11,.05,.055),m['black'],.008),s.box('White strobe lens',(0,-.06,.27),(.082,.025,.035),m['ivory'],.006)]
    elif kind=='side_table':
        p=[s.box('Rounded telephone table top',(0,0,.735),(.46,.40,.04),m['oak'],.015),s.box('Small dovetailed drawer',(0,-.01,.65),(.37,.31,.10),m['pine'],.008),s.rod('Drawer brass pull',(-.035,-.18,.65),(.035,-.18,.65),.007,m['brass'],8)]
        for x in [-.16,.16]:
            for y in [-.13,.13]:p.append(s.lathe('Turned tapering table leg',[(0,.014),(.05,.023),(.14,.016),(.57,.022),(.70,.026)],m['oak'],10,(x,y,0)))
    else:
        boom=kind=='boom_box';w=.46 if boom else .30;h=.24 if boom else .20
        p=[s.box('Rounded portable cabinet',(0,0,h/2),(w,.13,h),m['black'] if boom else m['oak'],.018)]
        for x in ([-.145,.145] if boom else [-.065]):
            p.append(s.rod('Recessed loudspeaker',(x,-.067,h*.48),(x,-.071,h*.48),.072 if boom else .062,m['iron'],20))
            p+=b.ring('Speaker rim',(x,-.074,h*.48),.073 if boom else .063,.004,m['steel'],segments=20)
            for z in range(9):p.append(s.box('Speaker grille slot',(x,-.075,h*.48-.045+z*.011),(.10,.003,.002),m['black']))
        if boom:
            p.append(s.box('Cassette door',(0,-.073,.10),(.105,.012,.095),m['steel'],.006))
            for x in [-.025,.025]:p.append(s.rod('Cassette reel',(x,-.081,.105),(x,-.083,.105),.013,m['black'],10))
        p.append(s.box('Tuning window',(.04 if not boom else 0,-.074,h*.82),(.13 if not boom else .30,.007,.026),m['ivory'],.003))
        p.append(s.box('Tuning needle',(.05,-.080,h*.82),(.003,.002,.023),m['red']))
        for x in ([.096,.13] if not boom else [-.19,.19]):p.append(s.rod('Physical tuning knob',(x,-.07,.04),(x,-.083,.04),.012,m['brass'],10))
        p+=s.tube('Integral carrying handle',[(-w*.30,0,h),(-w*.30,0,h+.045),(w*.30,0,h+.045),(w*.30,0,h)],.009,m['steel'],8)
        p.append(s.rod('Telescopic aerial',(-w*.42,.025,h),(-w*.42-.04,.025,h+.25),.003,m['steel'],6))
    b.export('level_event_'+kind,p,'events',view=(.6,-.9,.55))
path=ROOT/'development/levels/lived-assets.json';doc=json.loads(path.read_text());ids={r['id'] for r in b.LOG}
doc['assets']=[r for r in doc['assets'] if r['id'] not in ids]+b.LOG;path.write_text(json.dumps(doc,indent=2)+'\n')
