package org.beckenburg;

import java.net.Socket;
import java.util.concurrent.*;

/** Real sockets, rack transactions, authored sound capture, playback and reconnection privacy. */
public final class LanSoundRecorderIntegrationTest {
    static void check(boolean pass,String message){if(!pass)throw new AssertionError(message);}
    static final class Peer implements AutoCloseable {
        final BlockingQueue<String> inbox=new LinkedBlockingQueue<>();
        final LanClient client;
        Peer(int port,boolean ghost,String name)throws Exception{client=new LanClient("127.0.0.1",port,ghost,name,inbox::offer);}
        Peer(int port,LanClient.ResumeTicket ticket)throws Exception{client=new LanClient("127.0.0.1",port,ticket,inbox::offer);}
        String await(String prefix)throws Exception{
            long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(8);
            while(System.nanoTime()<deadline){
                String frame=inbox.poll(80,TimeUnit.MILLISECONDS);if(frame==null)continue;
                if(client.seat().equals("GHOST")&&(frame.startsWith("RECAUDIO|")||frame.startsWith("RECORDER|")
                        ||frame.startsWith("CASEFILE|")||frame.startsWith("GEARSTATE|")))
                    throw new AssertionError("private recording leaked to ghost");
                if(frame.startsWith(prefix))return frame;
                if(frame.startsWith("REJECT|")&&!prefix.equals("REJECT|"))throw new AssertionError(frame+" waiting for "+prefix);
            }
            throw new AssertionError("missing "+prefix+" on "+client.seat());
        }
        void settle()throws Exception{
            inbox.clear();
            int start=Integer.parseInt(await("STATE|").split("\\|")[1]);
            int now=start;
            while(now-start<10)now=Integer.parseInt(await("STATE|").split("\\|")[1]);
        }
        public void close(){client.close();}
    }
    static void placeInRoom(LanHost host,int seat,int room)throws Exception{
        // Fixture setup only: move the authoritative body/room together. Sounds still
        // require a real legal ghost command and the normal host acoustic projection.
        var mutex=LanHost.class.getDeclaredField("mutex");mutex.setAccessible(true);
        var field=LanHost.class.getDeclaredField("world");field.setAccessible(true);
        var rooms=LanHost.class.getDeclaredField("hunterRooms");rooms.setAccessible(true);
        synchronized(mutex.get(host)){
            ((LanWorld)field.get(host)).setRoom(seat,room);((int[])rooms.get(host))[seat]=room;
        }
    }
    public static void main(String[] args)throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0);
            Peer h=new Peer(host.port(),false,"Recordist");
            Peer b=new Peer(host.port(),false,"Observer");
            Peer c=new Peer(host.port(),false,"Technician");
            Peer ghost=new Peer(host.port(),true,"Specter")){
            h.client.ready();b.client.ready();c.client.ready();ghost.client.ready();
            h.await("LOBBY|3|HUMAN|4|WAITING");h.client.start();h.await("INFO|mission started");
            h.client.view3D();h.await("ACCEPT|VIEW3D");
            String[] pose=h.await("BODY|0|").split("\\|");
            double x=Integer.parseInt(pose[2])/1000.0,z=Integer.parseInt(pose[3])/1000.0;
            var rack=new HouseMap().van().location(VanStaging.Station.EQUIPMENT);
            for(int step=0;Math.hypot(x-rack.x(),z-rack.z())>.55;step++){
                check(step<20,"physical rack reachable from actual spawn");
                Thread.sleep(120);
                double distance=Math.hypot(rack.x()-x,rack.z()-z);
                h.client.step((int)Math.round((rack.x()-x)*100/distance),(int)Math.round((rack.z()-z)*100/distance));
                h.await("ACCEPT|STEP");pose=h.await("BODY|0|").split("\\|");
                x=Integer.parseInt(pose[2])/1000.0;z=Integer.parseInt(pose[3])/1000.0;
            }
            h.client.equipAt(3,"SOUND_RECORDER");h.await("ACCEPT|GEAREQUIP|3|SOUND_RECORDER");
            h.client.buyEquipment("SOUND_RECORDER",EquipmentTiers.Tier.II);h.await("ACCEPT|GEARBUY|SOUND_RECORDER|II");
            h.client.buyEquipment("SOUND_RECORDER",EquipmentTiers.Tier.III);h.await("ACCEPT|GEARBUY|SOUND_RECORDER|III");
            h.client.serviceEquipment();h.await("ACCEPT|GEARREFILL");
            placeInRoom(host,0,4);
            h.client.useHeldEquipment();h.await("ACCEPT|GEARUSE|SOUND_RECORDER|REC ");
            ghost.client.ghost(GhostDomain.Action.WHISPER,4);ghost.await("ACCEPT|GHOST|WHISPER");
            h.await("SOUND|WHISPER|");h.settle();
            h.client.useHeldEquipment();h.await("ACCEPT|GEARUSE|SOUND_RECORDER|STOP");
            h.settle();h.client.playRecording();
            try(var decoder=new RecorderAudio()){
                decoder.accept(h.await("RECAUDIO|BEGIN|III|"));
                FieldSoundRecorder.Clip clip=null;
                while(clip==null)clip=decoder.accept(h.await("RECAUDIO|"));
                check(clip.samples().stream().anyMatch(s->s.cue()==LanSound.Cue.WHISPER),
                    "actual ghost-authored audible whisper is present in recording");
                check(clip.tier()==EquipmentTiers.Tier.III,"purchased real recorder hardware used");
            }
            h.client.serviceEquipment();check(h.await("REJECT|").contains("rack"),"remote recharge rejected");
            ghost.client.playRecording();ghost.await("REJECT|");
            var ticket=h.client.resumeTicket();
            var socket=LanClient.class.getDeclaredField("socket");socket.setAccessible(true);
            ((Socket)socket.get(h.client)).close();b.await("PEER|LOST|0");
            try(Peer resumed=new Peer(host.port(),ticket)){
                resumed.await("INFO|mission resumed");resumed.client.view3D();resumed.await("ACCEPT|VIEW3D");
                check(resumed.await("GEARSTATE|").contains("SOUND_RECORDER:III"),"owned/equipped tier survives reconnection");
                check(resumed.await("RECORDER|STATE|").contains("1 clips"),"recorded audio survives socket recovery");
                resumed.settle();resumed.settle();resumed.client.playRecording();
                resumed.await("RECAUDIO|BEGIN|III|");resumed.await("RECAUDIO|END");
                ghost.await("STATE|");check(host.running(),"recorder leaves host simulation running");
            }
        }
        System.out.println("PASS: real rack input, paid upgrades, authored audio, private playback, service authority and reconnect continuity");
    }
}
