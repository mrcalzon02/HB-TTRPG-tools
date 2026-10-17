package org.beckenburg;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/** Four real sockets verify hunter-authored notes never leak to the ghost's channel. */
public final class LanFieldJournalIntegrationTest {
    private static void ok(boolean yes,String reason){if(!yes)throw new AssertionError(reason);}
    private static final class Peer implements AutoCloseable {
        final BlockingQueue<String> messages=new LinkedBlockingQueue<>();
        final LanClient client;
        Peer(int port,boolean spectral,String nick)throws Exception{
            client=new LanClient("127.0.0.1",port,spectral,nick,messages::offer);
        }
        String await(String prefix)throws Exception{
            long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(8);
            while(System.nanoTime()<deadline){
                String message=messages.poll(95,TimeUnit.MILLISECONDS);
                if(message!=null && message.startsWith(prefix))return message;
            }
            throw new AssertionError("missing "+prefix+" for "+client.seat());
        }
        @Override public void close(){client.close();}
    }
    public static void main(String[] args)throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0);
            Peer a=new Peer(host.port(),false,"Archivist");
            Peer b=new Peer(host.port(),false,"Witness");
            Peer c=new Peer(host.port(),false,"Observer");
            Peer ghost=new Peer(host.port(),true,"Haunt")){
            a.client.ready();b.client.ready();c.client.ready();ghost.client.ready();
            a.await("LOBBY|3|HUMAN|4|WAITING");a.client.start();a.await("INFO|mission started");
            a.client.note(GhostFieldGuide.Clue.PHASE_WALL,FieldJournal.Status.SEEN);
            String marked=b.await("NOTE|PHASE_WALL|SEEN|0|");
            ok(FieldJournal.Note.decode(marked).seat()==0,"host stamps submitting hunter");
            b.client.journal();b.await("NOTES|RESET");b.await("NOTE|PHASE_WALL|SEEN|0|");
            ghost.client.send("NOTE|PHASE_WALL|SEEN|200");
            ok(ghost.await("REJECT|").contains("hunter"),"ghost cannot submit field notes");
            ok(ghost.messages.stream().noneMatch(m->m.startsWith("NOTE|")||m.startsWith("NOTES|")),
                "ghost never receives private investigator notes");
            ok(host.running(),"malicious notes cannot end the case");
            System.out.println("PASS: four-socket private field journal, replay, provenance and ghost isolation");
        }
    }
}