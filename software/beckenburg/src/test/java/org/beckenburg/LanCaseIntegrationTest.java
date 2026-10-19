package org.beckenburg;

import java.util.concurrent.*;

/** A real 4-socket team solves the host-owned room-level case; ghost cannot see hunter progress. */
public final class LanCaseIntegrationTest {
    private static final class Wire implements AutoCloseable {
        final BlockingQueue<String> q=new LinkedBlockingQueue<>();
        final LanClient c;
        Wire(int port,boolean ghost,String name)throws Exception{c=new LanClient("127.0.0.1",port,ghost,name,q::offer);}
        String waitFor(String prefix)throws Exception{
            long limit=System.nanoTime()+TimeUnit.SECONDS.toNanos(8);
            while(System.nanoTime()<limit){String line=q.poll(150,TimeUnit.MILLISECONDS);if(line!=null&&line.startsWith(prefix))return line;}
            throw new AssertionError(c.seat()+" did not receive "+prefix);
        }
        String waitForReading(LanCase.Tool tool)throws Exception{
            long until=System.nanoTime()+TimeUnit.SECONDS.toNanos(8);
            while(System.nanoTime()<until){
                String line=q.poll(150,TimeUnit.MILLISECONDS);
                if(line==null||!line.startsWith("CASEFILE|"))continue;
                LanEvidenceJournal.Entry entry=LanEvidenceJournal.Entry.decode(line);
                if(entry.tool().equals(tool.name()))return line;
            }
            throw new AssertionError(c.seat()+" missing team log for "+tool);
        }
        @Override public void close(){c.close();}
    }
    private static void check(boolean yes,String label){if(!yes)throw new AssertionError(label);}
    public static void main(String[] args)throws Exception {
        try(LanHost host=new LanHost("127.0.0.1",0);
            Wire a=new Wire(host.port(),false,"Alpha");
            Wire b=new Wire(host.port(),false,"Beta");
            Wire c=new Wire(host.port(),false,"Gamma");
            Wire g=new Wire(host.port(),true,"Entity")){
            a.c.ready();b.c.ready();c.c.ready();g.c.ready();
            a.waitFor("LOBBY|3|HUMAN|4|WAITING");a.c.start();
            a.waitFor("INFO|mission started");
            g.c.send("SCAN|EMF|1");check(g.waitFor("REJECT|").contains("hunter"),"ghost may not forge evidence");
            check(a.waitFor("TEAMMAP|").startsWith("TEAMMAP|"),"hunter gets team positions");
            a.c.scan(LanCase.Tool.EMF);
            check(a.waitFor("ACCEPT|SCAN").contains("READING"),"ordinary scan always returns a measured value");
            // Walk through the host room topology to the anchor, without client-supplied world positions.
            for(int room:new int[]{11,8,5,4}){a.c.move(room);a.waitFor("ACCEPT|MOVE|"+room);}
            a.c.cleanse();check(a.waitFor("REJECT|CLEANSE").contains("ward"),"rite requires actual preparation, not a scan quota");
            for(LanCase.Tool t:LanCase.Tool.values()) {
                a.c.scan(t);check(a.waitFor("ACCEPT|SCAN").contains("READING"),"real environmental reading "+t);
                check(b.waitForReading(t).startsWith("CASEFILE|"),"raw team log contains actual measurement");
            }
            a.c.send("SCAN|EMF|5");check(a.waitFor("REJECT|").contains("stale"),"global hunter sequence replay blocked across command types");
            b.c.cleanse();check(b.waitFor("REJECT|CLEANSE").contains("anchor"),"other room cannot cleanse");
            a.c.ward();check(a.waitFor("ACCEPT|WARD").contains("ANCHOR"),"ward at anchor");
            a.c.cleanse();check(a.waitFor("ACCEPT|CLEANSE").contains("RITUAL STARTED"),"human starts rite");
            check(b.waitFor("RITUAL|STARTED").startsWith("RITUAL"),"team knows ritual started");
            check(g.c.seat().equals("GHOST"),"real opponent present");
            check(g.q.stream().noneMatch(x->x.startsWith("PROGRESS|")||x.startsWith("CASEFILE|")||x.startsWith("RITUAL|")||x.startsWith("TEAMMAP|")),"ghost private intel remains hidden");
            check(a.waitFor("RESULT|CLEANSED").equals("RESULT|CLEANSED"),"host finishes rite after timed window");
            check(b.waitFor("RESULT|CLEANSED").equals("RESULT|CLEANSED"),"match result broadcast to team");
            check(g.waitFor("RESULT|CLEANSED").equals("RESULT|CLEANSED"),"ghost receives result only");
            a.c.scan(LanCase.Tool.EMF);check(a.waitFor("REJECT|").contains("unavailable"),"no mission actions after result");
            check(!host.running(),"case ended on host");
            System.out.println("PASS: 4-socket team evidence, anti-spoof, ritual, private projection and synchronized resolution");
        }
    }
}
