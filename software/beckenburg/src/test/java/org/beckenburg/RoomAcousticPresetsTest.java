package org.beckenburg;

import java.util.HashSet;
import java.util.Set;

/** Every authored site obtains deterministic reusable room-ambience identities. */
public final class RoomAcousticPresetsTest {
    private static void ok(boolean v,String label){if(!v)throw new AssertionError(label);}
    public static void main(String[] args){
        Set<RoomAcousticPresets.Type> used=new HashSet<>();
        for(HouseMap.Site site:HouseMap.Site.values()){
            LevelDefinition level=new HouseMap(site).level();
            for(var room:level.rooms()){
                var preset=RoomAcousticPresets.forRoom(level,room.id());
                used.add(preset);
                if(room.outside())ok(preset==RoomAcousticPresets.Type.OUTDOOR,
                    "weather alone owns exterior ambience "+site);
                else{
                    short a=LevelSoundscape.sample(level,room.id(),true,150000);
                    short b=LevelSoundscape.sample(level,room.id(),true,150000);
                    ok(a==b,"stable acoustic bed "+site+" / "+room.name());
                    ok(Math.abs((int)a)<=1967,"safe bounded PSX audio gain");
                    ok(RoomAcousticPresets.microphoneLevel(level,room.id(),6)>=1,
                        "environmental microphone gain is bounded");
                }
            }
        }
        ok(used.size()>=7,"authored sites exercise distinct reusable acoustic presets");
        LevelDefinition house=new HouseMap(HouseMap.Site.HOUSE).level();
        ok(RoomAcousticPresets.forRoom(house,2)==RoomAcousticPresets.Type.KITCHEN,
            "kitchen preset overrides generic tile finish");
        ok(RoomAcousticPresets.forRoom(house,6)==RoomAcousticPresets.Type.SOFT_BEDROOM,
            "residential bedroom has soft reflections");
        ok(RoomAcousticPresets.forRoom(house,10)==RoomAcousticPresets.Type.MECHANICAL,
            "boiler room has mechanical ambience");
        System.out.println("PASS: reusable per-room soundscapes and host microphone gains");
    }
}
