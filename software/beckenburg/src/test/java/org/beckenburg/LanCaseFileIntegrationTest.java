package org.beckenburg;

import java.util.concurrent.*;

/** Real LAN seat delivery and hunter-only journal replay. */
public final class LanCaseFileIntegrationTest {
    static void ok(boolean yes,String message){if(!yes)throw new AssertionError(message);}
    static final class Seat implements AutoCloseable{
        final BlockingQueue<String> events=new LinkedBlockingQueue<>();
        final LanClient client;
        Seat(int port,boolean ghost,String name)throws Exception{
            client=new LanClient("127.0.0.1",port,ghost,name,events::offer);
        }
        String await(String prefix)throws Exception{
            long end=System.nanoTime()+TimeUnit.SECONDS.toNanos(8);
            while(System.nanoTime()<end){
                String line=events.poll(100,TimeUnit.MILLISECONDS);
                if(line==null)continue;
                if(client.seat().equals("GHOST")&&(line.startsWith("CASEFILE|")
                        ||line.startsWith("EVIDENCE|")||line.startsWith("PROGRESS|")))
                    throw new AssertionError("ghost received private casefile data: "+line);
                if(line.startsWith(prefix))return line;
            }
            throw new AssertionError("missing "+prefix+" on "+client.seat());
        }
        public void close(){client.close();}
    }
    public static void main(String[] args)throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0);
            Seat h=new Seat(host.port(),false,"Cleric");
            Seat o=new Seat(host.port(),false,"Observer");
            Seat d=new Seat(host.port(),false,"Demonologist");
            Seat g=new Seat(host.port(),true,"Ghost")){
            h.client.ready();o.client.ready();d.client.ready();g.client.ready();
            h.await("LOBBY|3|HUMAN|4|WAITING");
            h.client.start();h.await("INFO|mission started");
            h.client.scan(LanCase.Tool.EMF);
            h.await("ACCEPT|SCAN|INCONCLUSIVE");
            var first=LanEvidenceJournal.Entry.decode(o.await("CASEFILE|"));
            ok(first.seat()==0&&first.room()==HouseMap.EXTRACTION_ROOM
                    &&first.finding()==LanEvidenceJournal.Finding.INCONCLUSIVE,"teammate receives weak reading");
            // Every hunter receives this first casefile packet. Consume it for D too;
            // otherwise the next assertion mistakenly reads the earlier weak clue.
            ok(LanEvidenceJournal.Entry.decode(d.await("CASEFILE|")).finding()
                    ==LanEvidenceJournal.Finding.INCONCLUSIVE,"third hunter receives weak reading");
            for(int room:new int[]{11,8,5,4}){
                h.client.move(room);h.await("ACCEPT|MOVE|"+room);
            }
            h.client.scan(LanCase.Tool.THERMOMETER);
            h.await("ACCEPT|SCAN|CONFIRMED");
            var strong=LanEvidenceJournal.Entry.decode(d.await("CASEFILE|"));
            ok(strong.room()==4&&strong.finding()==LanEvidenceJournal.Finding.CONFIRMED,"confirmed anchor source");
            o.client.journal();
            o.await("CASEFILE|RESET");
            ok(LanEvidenceJournal.Entry.decode(o.await("CASEFILE|")).finding()
                    ==LanEvidenceJournal.Finding.INCONCLUSIVE,"weak clue replay");
            ok(LanEvidenceJournal.Entry.decode(o.await("CASEFILE|")).finding()
                    ==LanEvidenceJournal.Finding.CONFIRMED,"strong clue replay");
            o.await("ACCEPT|JOURNAL");
            g.client.journal();
            ok(g.await("REJECT|").contains("active hunter"),"ghost cannot request casefile");
            System.out.println("PASS: four-seat LAN casefile delivery, replay and ghost privacy");
        }
    }
}
