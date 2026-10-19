package org.beckenburg;

import java.util.List;

/** Authored source-backed stone trims, not a second grid-derived wall system.
 * The physical castle walls, apertures, stairwell and decks are exclusively
 * maintained by CastleHubArchitecturalPlan. This adapter keeps old test tools
 * reading the same real trim source without independently inventing geometry.
 */
public final class CastleHubArchitecture {
    private CastleHubArchitecture(){}
    public record Piece(String model,double x,double y,double z,
                        double scaleX,double scaleY,double scaleZ,double yaw){}
    public static List<Piece> create(CastleHubMap map){
        if(map==null||!map.valid())
            throw new IllegalArgumentException("Castle navigation data invalid");
        return CastleHubArchitecturalPlan.trims().stream()
            .map(p->new Piece(p.mesh(),p.x(),p.y(),p.z(),
                p.sx(),p.sy(),p.sz(),p.yaw())).toList();
    }
}
