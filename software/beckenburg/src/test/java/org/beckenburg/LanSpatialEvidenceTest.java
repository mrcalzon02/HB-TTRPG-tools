package org.beckenburg;

/** Spatial evidence requires a real host body close enough for the selected instrument. */
public final class LanSpatialEvidenceTest {
    static void ok(boolean yes,String label){if(!yes)throw new AssertionError(label);}
    public static void main(String[] args){
        HouseMap map=new HouseMap();
        LanCase caseFile=new LanCase(4);
        double cx=map.centerX(4),cz=map.centerZ(4);
        LanWorld.Body distant=new LanWorld.Body(cx+2.7,cz+2.0,0,4);
        LanWorld.Body near=new LanWorld.Body(cx+1.2,cz,0,4);
        LanWorld.Body farther=new LanWorld.Body(cx+2.9,cz+2.2,0,4);
        ok(map.roomAt(distant.x(),distant.z())==4,"test body truly inside anchor room");
        ok(caseFile.scanSpatial(0,LanCase.Tool.EMF,distant,4,map).message().startsWith("READING "),
                "weak EMF at >2.6m");
        ok(caseFile.scanSpatial(0,LanCase.Tool.SPIRIT_BOX,distant,4,map).message().startsWith("READING "),
                "weak spirit box at >2.1m");
        ok(caseFile.scanSpatial(0,LanCase.Tool.THERMOMETER,distant,4,map)
                .message().startsWith("READING "),"thermometer has longer 3.4m reach");
        ok(caseFile.evidenceCount()==0,"measurements never auto-award evidence");
        ok(caseFile.scanSpatial(0,LanCase.Tool.THERMOMETER,farther,4,map)
                .message().startsWith("READING "),"thermometer not room-global");
        ok(caseFile.scanSpatial(0,LanCase.Tool.EMF,near,4,map).message().startsWith("READING "),
                "approaching hotspot reads EMF");
        ok(caseFile.scanSpatial(0,LanCase.Tool.SPIRIT_BOX,near,4,map).message().startsWith("READING "),
                "approaching hotspot reads spirit box");
        ok(caseFile.evidenceCount()==0,"repeated measurements do not unlock clues");
        ok(!caseFile.scanSpatial(1,LanCase.Tool.EMF,new LanWorld.Body(cx,cz,0,7),4,map)
                .accepted(),"mismatched body room rejected");
        ok(!caseFile.scanSpatial(1,LanCase.Tool.EMF,new LanWorld.Body(Double.NaN,cz,0,4),4,map)
                .accepted(),"invalid body coordinate rejected");
        LanCase legacy=new LanCase(4);
        ok(legacy.scan(0,LanCase.Tool.EMF,4,4).message().startsWith("READING "),
                "room-only callers receive a measurement");
        ok(legacy.scanSpatial(0,LanCase.Tool.EMF,new LanWorld.Body(map.centerX(5),map.centerZ(5),0,5),4,map)
                .message().startsWith("READING "),"outside rooms give observations, never auto proof");
        System.out.println("PASS: real 3D instrument ranges, no remote evidence, body validation and room-mode compatibility");
    }
}
