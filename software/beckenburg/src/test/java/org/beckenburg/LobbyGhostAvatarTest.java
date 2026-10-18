package org.beckenburg;

import java.util.Random;

/** Cosmetic appearance is independent of secret species; not an evidence channel. */
public final class LobbyGhostAvatarTest {
    private static void ok(boolean yes,String why){if(!yes)throw new AssertionError(why);}
    public static void main(String[] args){
        var random=new Random(26);
        java.util.HashSet<String> seen=new java.util.HashSet<>();
        for(int i=0;i<150;i++){
            var look=LobbyGhostAvatar.random(random);
            ok(LobbyGhostAvatar.Look.decode(look.frame()).equals(look),"appearance frame round trip");
            ok(!look.frame().contains("WRAITH")&&!look.frame().contains("BANSHEE"),
                "no ghost archetype disclosed");
            ok(DirectionalSprites.frame("banshee",look.facing())!=null,
                "only real packaged approved ghost art used");
            seen.add(look.frame());
        }
        ok(seen.size()>4,"randomized ghost appearances");
        try{LobbyGhostAvatar.Look.decode("LOBBYAVATAR|4|0");
            throw new AssertionError("unsupported orientation accepted");
        }catch(IllegalArgumentException expected){}
        try{LobbyGhostAvatar.Look.decode("LOBBYAVATAR|0|99");
            throw new AssertionError("invalid palette accepted");
        }catch(IllegalArgumentException expected){}
        System.out.println("PASS: independent cosmetic lobby ghost, valid art, no species disclosure");
    }
}
