package org.beckenburg;

/** Gameplay regression: stacked rooms must not share evidence, wards, callouts or extraction. */
public final class SoloElevationTest {
    private static void check(boolean yes,String why){if(!yes)throw new AssertionError(why);}
    public static void main(String[] args){
        int rooms=0;
        for(HouseMap.Site site:new HouseMap.Site[]{HouseMap.Site.HOUSE,HouseMap.Site.FARMHOUSE,HouseMap.Site.SCHOOL}){
            HouseMap map=new HouseMap(site);
            for(int room=0;room<HouseMap.INDOOR_ROOMS;room++){
                var point=map.spawn(room);
                InvestigationSession session=new InvestigationSession(map,InvestigationSession.Role.CLERIC,1000+room);
                check(session.scan(InvestigationSession.Instrument.EMF,point.x(),point.y(),point.z()),site+" valid scan "+room);
                check(session.message().contains(map.roomName(room)),site+" measurement names actual storey "+room);
                check(!session.scan(InvestigationSession.Instrument.EMF,point.x(),point.y()+100,point.z()),site+" reject floating scan");
                TeamCallout.Board board=new TeamCallout.Board(map);
                var ping=board.submit(new TeamCallout.Request(0,TeamCallout.Phrase.HERE,
                    point.x(),point.z(),point.x(),point.z(),0),point.y(),point.y());
                check(ping!=null&&ping.zone()==room,site+" callout stays in actual storey "+room);
                check(session.deployCounter(HunterCounters.Kind.SALT,point.x(),point.y(),point.z(),0),site+" salt deploys at player elevation "+room);
                var marks=session.counterMarks();
                check(marks.size()==1&&Math.abs(marks.get(0).height()-point.y()-.045)<.01,
                    site+" deployed material stays on its actual deck "+room);
                rooms++;
            }
            InvestigationSession ritual=null;
            for(long seed=1;seed<1000;seed++){
                var candidate=new InvestigationSession(map,InvestigationSession.Role.CLERIC,seed);
                if(map.floorY(candidate.anchorRoom())>1){ritual=candidate;break;}
            }
            check(ritual!=null,site+" upper-floor attachment is supported");
            var anchor=map.spawn(ritual.anchorRoom());
            check(!ritual.cleanse(anchor.x(),0,anchor.z()),site+" ritual cannot hit upstairs anchor through floor");
            check(ritual.placeWard(anchor.x(),anchor.y(),anchor.z())&&ritual.wardPrepared(),site+" upstairs ward attaches to upstairs anchor");
            check(ritual.cleanse(anchor.x(),anchor.y(),anchor.z()),site+" upstairs rite can complete");
            var van=map.van().spawn();double dockY=map.level().dock().y();
            check(!ritual.extract(van.x(),dockY+3,van.z()),site+" extraction rejects another storey");
            check(ritual.extract(van.x(),dockY,van.z()),site+" correct extraction remains usable");
            var console=map.van().location(VanStaging.Station.EXTRACTION);
            check(ritual.extract(console.x(),dockY,console.z()),site+" physical console works at actual van dock");
        }
        System.out.println("PASS solo elevation: "+rooms+" room measurements/callouts/deployments; upstairs rites and extraction");
    }
}
