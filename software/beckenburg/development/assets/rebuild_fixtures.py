"""One physical van fixture per role. No equipment-tier model progression."""
import sys, math, json, hashlib
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import rebuild_support as s

ITEMS=[]

def fixed(item,label,objects,features,source_model=None):
    if source_model:
        obj=objects[0];path=s.source_path(source_model);obj.data.calc_loop_triangles()
        base=dict(tier=1,model=path.relative_to(s.PROJECT).as_posix(),sha256=hashlib.sha256(path.read_bytes()).hexdigest(),existing_unchanged=True,triangles=len(obj.data.loop_triangles),variants={},source_model=source_model,features=features,editable=f'development/assets/equipment-catalog/blender/{item.lower()}.blend')
    else:base,obj=s.finish(item,1,objects,filename='blender_'+item.lower()+'_fixed',features=features)
    base['fixed_fixture']=True;base['tier_upgrade']=False
    s.render_family(item,[obj],view=(.5,-2.5,1.15))
    s.save_family(item,[obj])
    # Legacy stage slots are aliases of one physical fixture, never upgrades.
    stages=[dict(base,tier=t,fixed_fixture=True,tier_upgrade=False) for t in (1,2,3)]
    ITEMS.append(dict(id=item,label=label,fixed_fixture=True,tier_upgrade=False,stage_policy='All compatibility stage slots reference one identical physical fixture; no upgrades',stages=stages))

def monitor(item,label):
    s.reset();obj=s.import_source('monitoring_screen_mp_1')
    fixed(item,label,[obj],['Original textured owner-provided monitoring screen retained','Dedicated live display content supplied during online integration','Fixed van fixture; no physical tiers'],'monitoring_screen_mp_1')

def computer():
    s.reset()
    objects=[s.import_source('pc_monitor_mp_1',size=.46,location=(0,.025,.04)),
             s.import_source('pc_mp_1',size=.46,location=(-.38,.02,0)),
             s.import_source('pc_keyboard_mp_1',size=.38,location=(0,-.32,0)),
             s.import_source('pc_mouse_mp_1',size=.10,location=(.25,-.32,0))]
    fixed('COMPUTER','Camera console',objects,['Original matched PSX computer, CRT, keyboard and mouse; original material maps and UVs retained','One complete computer workstation; fixed physical asset'])

def clipboard():
    s.reset();wood=s.material('Dark clipboard fibreboard',(.22,.15,.09),'wood');paper=s.material('Unwritten assignment paper',(.75,.72,.61),'paper');metal=s.material('Clipboard galvanized clip',(.46,.48,.45),'metal')
    parts=[s.box('Thin rounded clipboard',(0,0,.014),(.23,.012,.32),wood,.008),s.box('Replaceable blank task sheet',(0,-.007,.015),(.205,.0015,.277),paper,.001)]
    parts.append(s.rod('Spring hinge',(-.035,-.014,.149),(.035,-.014,.149),.006,metal,8))
    parts.append(s.box('Arched spring clamp',(0,-.016,.135),(.072,.010,.030),metal,.006))
    parts.append(s.box('Paper gripping jaw',(0,-.020,.119),(.068,.004,.004),metal,.001))
    fixed('CLIPBOARDS','Assignment clipboard',parts,['Thin fibreboard and spring-loaded metal clip','Blank paper for live assignment content','Fixed task list; no upgrade variants'])

def board(item,label,map_board=False):
    s.reset();wood=s.material('Worn oak board frame',(.27,.20,.12),'wood');paper=s.material('Map sheet' if map_board else 'Objective paper',(.73,.71,.61),'paper');cork=s.material('Noticeboard cork',(.35,.26,.17),'leather');brass=s.material('Board brass pins',(.47,.39,.21),'metal')
    w,h=(.70,.50) if map_board else (.85,.58)
    parts=[s.box('Noticeboard backing',(0,.014,h/2), (w,.025,h),cork,.004)]
    for x in (-w/2,w/2):parts.append(s.box('Oak vertical frame',(x,-.002,h/2),(.025,.035,h+.03),wood,.004))
    for z in (0,h):parts.append(s.box('Oak horizontal frame',(0,-.002,z),(w,.035,.025),wood,.004))
    if map_board:
        parts.append(s.box('Site specific map surface',(0,-.002,h/2),(w-.075,.002,h-.075),paper,.001))
        for x in (-w*.42,w*.42):
            for z in (.05,h-.05):parts.append(s.rod('Map retaining pin',(x,-.007,z),(x,-.013,z),.004,brass,6))
    else:
        for x in (-.23,0,.23):
            sheet=s.box('Pinned objective sheet',(x,-.003,h*.53),(.19,.002,.31),paper,.001);parts.append(sheet)
            parts.append(s.rod('Brass paper pin',(x,-.009,h*.53+.14),(x,-.016,h*.53+.14),.0045,brass,6))
    fixed(item,label,parts,['Fixed van board; no tier upgrades','Blank replaceable paper surfaces for actual map/objective content; no fictional readings baked in','Textured oak, cork and paper with correctly proportioned thin frame'])

def main():
    computer()
    for item,label in [('SANITY_MONITOR','Sanity monitor'),('SITE_ACTIVITY_MONITOR','Site activity monitor'),('SOUND_MONITOR','Sound monitor')]:monitor(item,label)
    clipboard();board('SITE_MAP','Site map',True);board('OBJECTIVE_BOARD','Objective board')
    s.write_fragment('rebuild-fixtures.json',ITEMS)
    print('Rebuilt seven fixed fixture families, no upgrades.')

if __name__=='__main__':main()
