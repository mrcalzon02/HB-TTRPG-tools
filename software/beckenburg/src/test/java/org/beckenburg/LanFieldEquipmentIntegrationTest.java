package org.beckenburg;

import java.util.concurrent.*;

/** Real TCP sockets test gear state, real readings, hunter-only records, and denied ghost access. */
public final class LanFieldEquipmentIntegrationTest {
    static void ok(boolean success,String reason){if(!success)throw new AssertionError(reason);}
    static final class Seat implements AutoCloseable {
        final BlockingQueue<String> events=new LinkedBlockingQueue<>();
        final LanClient client;
        Seat(int port,boolean ghost,String name)throws Exception{
            client=new LanClient("127.0.0.1",port,ghost,name,events::offer);
        }
        String await(String prefix)throws Exception{
            long stop=System.nanoTime()+TimeUnit.SECONDS.toNanos(9);
            while(System.nanoTime()<stop){
                String frame=events.poll(80,TimeUnit.MILLISECONDS);
                if(frame==null)continue;
                if(client.seat().equals("GHOST")&&(frame.startsWith("GEARSTATE|")
                    ||frame.startsWith("GEAROWNED|")||frame.startsWith("CASEFILE|")))
                    throw new AssertionError("ghost received private gear/casefile");
                if(frame.startsWith(prefix))return frame;
            }
            throw new AssertionError(client.seat()+" missing "+prefix);
        }
        public void close(){client.close();}
    }
    public static void main(String[] args)throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0);
            Seat h=new Seat(host.port(),false,"Researcher");
            Seat b=new Seat(host.port(),false,"Photographer");
            Seat c=new Seat(host.port(),false,"Technician");
            Seat ghost=new Seat(host.port(),true,"Specter")){
            h.client.ready();b.client.ready();c.client.ready();ghost.client.ready();
            h.await("LOBBY|3|HUMAN|4|WAITING");
            h.client.start();h.await("INFO|mission started");
            h.client.view3D();h.await("ACCEPT|VIEW3D");
            String state=h.await("GEARSTATE|");
            ok(state.contains("EMF_READER:I")&&state.contains("UV_LIGHT:I"),
                "starter working instruments and tiers are in actual host snapshot");
            h.client.useHeldEquipment();
            ok(h.await("ACCEPT|GEARUSE|EMF_READER|").contains("EMF "),
                "real held instrument returns ordinary measured EMF");
            LanEvidenceJournal.Entry first=LanEvidenceJournal.Entry.decode(b.await("CASEFILE|"));
            ok(first.tool().equals("EMF_READER")
                &&first.finding()==LanEvidenceJournal.Finding.OBSERVED,
                "measurement is automatically logged without confirmation");
            h.client.selectGearSlot(1);h.await("GEARSTATE|");
            h.client.useHeldEquipment();
            ok(h.await("ACCEPT|GEARUSE|THERMOMETER|").contains("Air "),
                "tiered thermometer reads genuine room climate");
            LanEvidenceJournal.Entry second=LanEvidenceJournal.Entry.decode(b.await("CASEFILE|"));
            ok(second.tool().equals("THERMOMETER"),"thermometer is logged");
            ghost.client.equipmentState();
            ok(ghost.await("REJECT|").contains("hunter"),
                "ghost cannot retrieve hunter equipment state");
            ghost.client.useHeldEquipment();
            ok(ghost.await("REJECT|").contains("hunter"),
                "ghost cannot operate investigator gear");
            h.client.buyEquipment("LASER_GRID",EquipmentTiers.Tier.II);
            ok(h.await("REJECT|").contains("rack"),
                "purchases require physical equipment rack");
            h.client.equipmentState();
            ok(h.await("GEARSTATE|").contains("THERMOMETER:I"),
                "gear tier/slot survives state read-back");
            System.out.println("PASS: real sockets, multi-slot gear readings, team journal and ghost privacy");
        }
    }
}
