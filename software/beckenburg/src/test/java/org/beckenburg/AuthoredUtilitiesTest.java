package org.beckenburg;

/** Exercises authored sockets, stair acoustics and vertical separation on production sites. */
public final class AuthoredUtilitiesTest {
    private static final java.util.List<String> failures=new java.util.ArrayList<>();
    private static void check(boolean yes,String why){if(!yes&&!failures.contains(why))failures.add(why);}
    public static void main(String[] args){
        int switches=0,doors=0,stairs=0;
        for(HouseMap.Site site:new HouseMap.Site[]{HouseMap.Site.HOUSE,HouseMap.Site.FARMHOUSE,HouseMap.Site.SCHOOL}){
            HouseMap map=new HouseMap(site);RoomLighting lights=new RoomLighting();
            for(int room=0;room<HouseMap.INDOOR_ROOMS;room++){
                var socket=map.level().socket("switch",room);
                var plate=RoomLighting.location(map,room);
                check(socket!=null&&plate.x()==socket.x()&&plate.y()==socket.y()&&plate.z()==socket.z(),
                    site+" switch must use architectural mount coordinates "+room);
                check(plate.y()-map.floorY(room)>.9&&plate.y()-map.floorY(room)<1.5,
                    site+" reachable plate height "+room);
                var space=map.level().room(room);
                check(Math.min(Math.min(Math.abs(plate.x()-space.x0()),Math.abs(plate.x()-space.x1())),
                    Math.min(Math.abs(plate.z()-space.z0()),Math.abs(plate.z()-space.z1())))<.06,
                    site+" switch attaches to room wall "+room);
                for(var portal:map.level().portals())if(!portal.kind().equals("stair")&&Math.abs(portal.y()-space.y())<.1){
                    double normal=portal.alongX()?Math.abs(plate.z()-portal.z()):Math.abs(plate.x()-portal.x());
                    double tangent=portal.alongX()?Math.abs(plate.x()-portal.x()):Math.abs(plate.z()-portal.z());
                    check(normal>.12||tangent>portal.width()/2+.08,site+" switch has solid backing outside opening "+room+" / "+portal.id());
                }
                var fixture=map.level().socket("light",room);
                check(fixture!=null&&Math.abs(fixture.y()-map.floorY(room)-map.level().room(room).height())<.1,
                    site+" light socket attaches to ceiling "+room);
                boolean reachable=false;int floorCandidates=0,clearCandidates=0;
                for(int direction=0;direction<16;direction++){
                    double angle=direction*Math.PI/8;
                    double x=plate.x()+Math.sin(angle)*.85,z=plate.z()+Math.cos(angle)*.85;
                    if(map.roomAt(x,map.floorY(room),z)!=room)continue;
                    floorCandidates++;
                    if(!map.traversable(x,map.floorY(room),z))continue;
                    clearCandidates++;
                    double yaw=Math.atan2(plate.x()-x,plate.z()-z);
                    if(lights.aimed(map,x,map.floorY(room),z,yaw)==room){
                        reachable=true;
                        check(lights.aimed(map,x,map.floorY(room)+3,z,yaw)!=room,
                            site+" cannot reach circuit from another storey "+room);
                    }
                }
                check(reachable,site+" mounted switch needs a clear operating position "+room
                    +" ("+floorCandidates+" room candidates, "+clearCandidates+" clear; plate="+plate+")");
                lights.toggle(room);
                check(lights.brightness(room,0)<.1,site+" circuit off darkens its own room "+room);
                for(int other=0;other<HouseMap.INDOOR_ROOMS;other++)if(other!=room)
                    check(lights.brightness(other,0)>.9,site+" circuit does not switch another room "+room+" -> "+other);
                lights.toggle(room);
                switches++;
            }
            lights.setBreaker(false);
            for(int room=0;room<HouseMap.INDOOR_ROOMS;room++)check(lights.brightness(room,0)<.1,site+" breaker isolates room "+room);
            lights.setBreaker(true);
            var breaker=RoomLighting.breaker(map);
            check(Math.abs(breaker.y()-map.floorY(breaker.room())-1.35)<.3,site+" service-panel mount");
            boolean breakerReachable=false;
            for(int direction=0;direction<16;direction++){
                double angle=direction*Math.PI/8;
                double x=breaker.x()+Math.sin(angle)*.85,z=breaker.z()+Math.cos(angle)*.85;
                double y=map.floorY(breaker.room());
                if(map.traversable(x,y,z)&&RoomLighting.breakerAimed(map,x,y,z,
                        Math.atan2(breaker.x()-x,breaker.z()-z)))breakerReachable=true;
            }
            check(breakerReachable,site+" service-panel has clear operating position");
            for(var portal:map.level().portals()){
                int closed=LanAcoustics.physicalEdgeCost(map,portal.a(),portal.b());
                check(closed<Integer.MAX_VALUE,site+" physical acoustic portal "+portal.id());
                if(portal.door()){
                    map.openDoorBetweenRooms(portal.a(),portal.b());
                    int open=LanAcoustics.physicalEdgeCost(map,portal.a(),portal.b());
                    check(open<=closed,site+" opening door cannot increase sound loss "+portal.id());
                    doors++;
                }
                if(portal.kind().equals("stair")){
                    check(map.floorY(portal.a())!=map.floorY(portal.b()),site+" stair changes storey");
                    check(LanAcoustics.cost(map,portal.a(),portal.b())<Integer.MAX_VALUE,
                        site+" stair carries sound between floors");stairs++;
                }
                if(portal.kind().equals("window")){
                    check(map.toggleNearestWindow(portal.x(),portal.y(),portal.z()),site+" operable window");
                    check(map.windowOpen(portal.id()),site+" correct glazing opened");
                    check(LanAcoustics.physicalEdgeCost(map,portal.a(),portal.b())<=closed,
                        site+" opened glazing transmits sound");
                }
            }
            check(LanAcoustics.cost(map,13,14)==Integer.MAX_VALUE,site+" van hides hunter from ghost hearing");
            check(LanAcoustics.physicalCost(map,13,14)<Integer.MAX_VALUE,site+" mundane sound reaches van");
            for(int room=0;room<12;room++){
                var p=map.spawn(room);
                var listener=new LanWorld.Body(p.x(),p.y(),p.z(),0,room);
                check(LanSound.project(map,listener,room,p.x(),p.y(),p.z(),LanSound.Cue.WHISPER,4)!=null,
                    site+" valid same-storey source "+room);
                check(LanSound.project(map,listener,room,p.x(),p.y()+100,p.z(),LanSound.Cue.WHISPER,4)==null,
                    site+" reject sound source elevation outside room "+room);
            }
            long energy=0;
            for(long frame=0;frame<16000*40;frame+=31){
                short value=LevelSoundscape.sample(map.level(),0,true,frame);
                check(Math.abs((int)value)<=1967,site+" low ambience ceiling");
                check(value==LevelSoundscape.sample(map.level(),0,true,frame),site+" deterministic ambience");
                energy+=Math.abs((int)value);
                check(LevelSoundscape.sample(map.level(),14,true,frame)==0,site+" exterior bed not doubled");
            }
            check(energy>0,site+" distinct building ambience produces sound");
        }
        if(!failures.isEmpty())throw new AssertionError(String.join("\n",failures));
        System.out.println("PASS authored utilities: "+switches+" reachable wall switches, "+doors
            +" door acoustic links, "+stairs+" vertical stair links, source elevation and ambience");
    }
}
