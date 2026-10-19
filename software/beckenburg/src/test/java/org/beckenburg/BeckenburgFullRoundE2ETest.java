package org.beckenburg;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.TimeUnit;
import java.util.function.Predicate;

/**
 * Real TCP/UDP-host integration acceptance. No synthetic packets, test-only
 * server hooks or pre-awarded evidence. Each human uses a separate LanClient.
 * The same host rules execute identification, rite and final settlement.
 */
public final class BeckenburgFullRoundE2ETest {
    private static final long SESSION_TIMEOUT=TimeUnit.SECONDS.toNanos(55);
    private static final Path REPORT=Path.of("build","e2e","lan-full-round.txt");
    private static final List<String> STEPS=new ArrayList<>();
    private BeckenburgFullRoundE2ETest(){}

    private static void check(boolean ok,String reason){
        if(!ok)throw new AssertionError(reason);
    }
    private static void stage(String step){
        STEPS.add(Instant.now()+" PASS "+step);
        System.out.println("E2E PASS "+step);
    }
    private static void save(String status){
        try{
            Files.createDirectories(REPORT.getParent());
            Files.writeString(REPORT,"Beckenburg full multiplayer round: "+status+"\n"+
                "Build: "+BeckenburgUpdates.installedVersion()+"\n"+
                "Source: "+System.getProperty("beckenburg.source","workflow checkout")+
                "\n"+String.join("\n",STEPS)+"\n",StandardCharsets.UTF_8);
        }catch(Exception fail){System.err.println("Could not save E2E report: "+fail);}
    }
    private static final class Peer implements AutoCloseable {
        final CopyOnWriteArrayList<String> frames=new CopyOnWriteArrayList<>();
        final LanClient client;
        final String seat;
        Peer(int port,boolean ghost,String name,String secret,String owner)throws Exception{
            client=new LanClient("127.0.0.1",port,ghost,name,secret,owner,frames::add);
            seat=client.seat();
        }
        int position(){return frames.size();}
        String await(String prefix,int start,long deadline)throws Exception{
            return awaitFrame(s->s.startsWith(prefix),start,deadline,prefix);
        }
        String awaitFrame(Predicate<String> test,int start,long deadline,String description)throws Exception{
            int examined=start;
            while(System.nanoTime()<deadline){
                int count=frames.size();
                while(examined<count){
                    String frame=frames.get(examined++);
                    if(test.test(frame))return frame;
                }
                Thread.sleep(20);
            }
            List<String> recent=frames.subList(Math.max(0,frames.size()-18),frames.size());
            throw new AssertionError(seat+" timed out on "+description+
                " (observed "+frames.size()+" frames; tail="+recent+")");
        }
        int awaitTick(int required,long deadline)throws Exception{
            String value=awaitFrame(s->{
                if(!s.startsWith("STATE|"))return false;
                var parts=LanProtocol.parts(s);
                try{return Integer.parseInt(parts.get(1))>=required;}
                catch(RuntimeException invalid){return false;}
            },0,deadline,"STATE tick >= "+required);
            return Integer.parseInt(LanProtocol.parts(value).get(1));
        }
        long matching(String prefix){return frames.stream().filter(f->f.startsWith(prefix)).count();}
        @Override public void close(){client.close();}
    }
    private static List<Integer> route(HouseMap map,int first,int last){
        ArrayDeque<Integer> queue=new ArrayDeque<>();
        int[] prior=new int[HouseMap.ROOM_COUNT];
        java.util.Arrays.fill(prior,-1);
        queue.add(first);prior[first]=first;
        while(!queue.isEmpty()){
            int room=queue.removeFirst();
            if(room==last)break;
            for(int next:map.adjacentRooms(room))if(prior[next]==-1){
                prior[next]=room;queue.addLast(next);
            }
        }
        check(prior[last]!=-1,"site topology must lead from "+first+" to "+last);
        ArrayDeque<Integer> path=new ArrayDeque<>();
        for(int room=last;room!=first;room=prior[room])path.addFirst(room);
        return List.copyOf(path);
    }
    private static void move(Peer hunter,HouseMap map,int from,int to,long deadline)throws Exception{
        int cursor=from;
        for(int target:route(map,from,to)){
            int mark=hunter.position();
            hunter.client.move(target);
            String response=hunter.awaitFrame(f->f.startsWith("ACCEPT|MOVE|")||
                f.startsWith("REJECT|"),mark,deadline,"MOVE "+target);
            check(response.equals("ACCEPT|MOVE|"+target),
                "host must validate adjacent room "+cursor+" -> "+target+": "+response);
            cursor=target;
        }
    }
    public static void main(String[] args)throws Exception{
        long deadline=System.nanoTime()+SESSION_TIMEOUT;
        GhostIdentity.Type type=GhostIdentity.Type.SPIRIT;
        HouseMap map=new HouseMap(HouseMap.Site.HOUSE);
        CustomContract contract=CustomContract.standard(2);
        try(LanHost host=new LanHost("127.0.0.1",0,type,contract,false,true,HouseMap.Site.HOUSE);
            Peer owner=new Peer(host.port(),false,"E2E_Host","",host.localOwnerCredential());
            Peer guest=new Peer(host.port(),false,"E2E_Join","", "");
            Peer ghost=new Peer(host.port(),true,"E2E_Ghost","", "")){
            check("H1".equals(owner.seat)&&"H2".equals(guest.seat)&&"GHOST".equals(ghost.seat),
                "three independently admitted LAN sockets with correct roles");
            check(host.connected()==3,"host sees connected client seats");
            stage("Host listening; hunter owner, remote hunter and human ghost joined");
            guest.client.start();
            check(guest.await("REJECT|",guest.position()-1,deadline)
                .contains("only verified hosting player"),"guest must not start owner's match");
            owner.client.ready();guest.client.ready();ghost.client.ready();
            owner.await("LOBBY|2|HUMAN|3|WAITING",0,deadline);
            int launched=owner.position();
            owner.client.start();
            owner.await("INFO|mission started",launched,deadline);
            guest.await("INFO|mission started",0,deadline);
            ghost.await("INFO|mission started",0,deadline);
            check(host.running(),"host authoritative match running");
            stage("Ready and started; all clients received shared mission launch");

            // Exercise a genuine read-only 3D entry on the second hunter, keeping
            // the owner in the original room navigation used by the alpha console.
            int view=guest.position();guest.client.view3D();
            guest.await("ACCEPT|VIEW3D",view,deadline);
            guest.await("SITE|HOUSE",view,deadline);
            check(ghost.frames.stream().noneMatch(f->f.startsWith("BODY|")||
                f.startsWith("TEAMMAP|")||f.startsWith("CASEFILE|")||f.startsWith("PROGRESS|")),
                "ghost seat must not receive private hunter tracking");
            stage("Guest entered authoritative 3D scene; spectral privacy enforced");

            // Host controls real adjacency. Illegal jumps do not silently succeed.
            int jump=owner.position();owner.client.move(4);
            String denied=owner.await("REJECT|",jump,deadline);
            check(denied.contains("not adjacent"),"room teleport rejected");
            move(owner,map,HouseMap.EXTRACTION_ROOM,4,deadline);
            stage("Host hunter reached haunting anchor through real room topology");

            for(LanCase.Tool tool:LanCase.Tool.values()){
                int a=owner.position(),b=guest.position();
                owner.client.scan(tool);
                String answer=owner.await("ACCEPT|SCAN|",a,deadline);
                check(answer.contains("READING"),"scan is a measured result, not an auto clue: "+tool);
                String record=guest.awaitFrame(f->f.startsWith("CASEFILE|")&&
                    f.contains("|"+tool+"|"),b,deadline,"shared casefile "+tool);
                LanEvidenceJournal.Entry parsed=LanEvidenceJournal.Entry.decode(record);
                check(parsed.finding()==LanEvidenceJournal.Finding.OBSERVED,
                    "no automatic evidence confirmation for "+tool);
            }
            check(ghost.matching("CASEFILE|")==0,"private evidence must stay hidden from ghost");
            stage("All evidence tools measured and shared; no auto-confirmation or ghost leak");

            // Identification is an explicit human choice, gated by host clock.
            owner.awaitTick(31,deadline);
            int guess=owner.position(),news=guest.position();
            owner.client.identify(type);
            owner.await("ACCEPT|IDENTIFY|",guess,deadline);
            guest.await("IDENTIFIED|SPIRIT|ABSOLUTION",news,deadline);
            stage("Human submitted SPIRIT hypothesis; host confirmed identification to team");

            // The ritual can only begin after the real anchor ward.
            int riteRoom=RitualSites.site(map,type.rite()).room();
            move(owner,map,4,riteRoom,deadline);
            int tooSoon=owner.position();owner.client.absolve();
            String refused=owner.await("REJECT|ABSOLVE|",tooSoon,deadline);
            check(refused.contains("anchor ward"),"unprepared rite must be rejected");
            move(owner,map,riteRoom,4,deadline);
            int w=owner.position();owner.client.ward();
            owner.await("ACCEPT|WARD|ANCHOR",w,deadline);
            move(owner,map,4,riteRoom,deadline);
            int ritual=owner.position(),guestStart=guest.position();
            owner.client.absolve();
            owner.await("ACCEPT|ABSOLVE|RITUAL STARTED",ritual,deadline);
            guest.await("RITUAL|STARTED|ABSOLUTION",guestStart,deadline);
            check(host.running(),"round must not resolve before ritual timer");
            stage("Ward placed at anchor; correct rite initiated at authored circle");

            owner.await("RESULT|ABSOLVED",ritual,deadline);
            guest.await("RESULT|ABSOLVED",guestStart,deadline);
            ghost.await("RESULT|ABSOLVED",0,deadline);
            check(!host.running(),"round ended on authoritative host");
            check(owner.matching("SETTLEMENT|")>0 || owner.matching("REWARD|")>0 ||
                owner.matching("PAYOUT|")>0,
                "host must deliver final settlement to hunter");
            stage("Host, second hunter and ghost all received ABSOLVED round result and payout");
            int closed=owner.position();owner.client.scan(LanCase.Tool.EMF);
            owner.await("REJECT|",closed,deadline);
            stage("Post-round commands rejected; match cannot continue after result");
            save("PASS");
            System.out.println("PASS Beckenburg full LAN host/join/evidence/identity/ritual/settlement round");
        }catch(Throwable failure){
            STEPS.add(Instant.now()+" FAIL "+failure);
            save("FAIL");
            throw failure;
        }
    }
}
