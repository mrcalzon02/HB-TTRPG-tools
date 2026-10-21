package org.beckenburg;

/** A deployed writing book is a location with a reachable, inspectable surface. */
public final class GhostWritingSpatialTest {
    private static void ok(boolean v,String reason){if(!v)throw new AssertionError(reason);}
    public static void main(String[] args){
        GhostWriting book=new GhostWriting();
        book.place(0,3,20,5.25,1.1,8.75,EquipmentTiers.Tier.III);
        ok(book.physicallyPlaced()&&book.tier()==EquipmentTiers.Tier.III,
            "book has spatial pose and purchased model tier");
        ok(book.deploymentFrame().split("\\|").length==7,
            "book state is replayable through bounded wire message");
        ok(book.reachable(new LanWorld.Body(5.4,1.1,8.7,0,3),1.6),
            "nearby hunter can read or pick up physical book");
        ok(!book.reachable(new LanWorld.Body(9.2,1.1,8.7,0,3),1.6),
            "same room is not unlimited interaction reach");
        ok(!book.reachable(new LanWorld.Body(5.4,1.1,8.7,0,4),1.6),
            "wall-separated hunter cannot retrieve book");
        ok(!book.removeNear(1,new LanWorld.Body(9,1.1,8.7,0,3)),
            "remote pickup denied without deleting the book");
        ok(book.removeNear(1,new LanWorld.Body(5.2,1.1,8.7,0,3)),
            "cooperative nearby pickup succeeds");
        ok(!book.placed(),"retrieval clears world state");
        System.out.println("PASS: book world pose, proximity, pickup, snapshot");
    }
}
