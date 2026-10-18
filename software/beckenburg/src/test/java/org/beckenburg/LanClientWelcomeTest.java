package org.beckenburg;

import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.atomic.AtomicReference;

/** Real localhost protocol proof for legacy and new five-field WELCOME frames. */
public final class LanClientWelcomeTest {
    private static void ok(boolean pass,String reason){if(!pass)throw new AssertionError(reason);}
    private static final String TOKEN="0123456789abcdef0123456789abcdef0123456789abcdef";
    private static final String ROTATED="fedcba9876543210fedcba9876543210fedcba9876543210";
    private static void scenario(String welcome,boolean reconnect,int expectedNext) throws Exception {
        try(ServerSocket listener=new ServerSocket(0)){
            AtomicReference<Throwable> failure=new AtomicReference<>();
            AtomicReference<String> hello=new AtomicReference<>();
            AtomicReference<String> action=new AtomicReference<>();
            Thread server=new Thread(()->{
                try(Socket socket=listener.accept()){
                    socket.setSoTimeout(3000);
                    var reader=LanProtocol.reader(socket.getInputStream());
                    var writer=LanProtocol.writer(socket.getOutputStream());
                    hello.set(LanProtocol.read(reader));
                    LanProtocol.write(writer,welcome);
                    action.set(LanProtocol.read(reader));
                }catch(Throwable problem){failure.set(problem);}
            },"welcome-regression-host");
            server.start();
            try(LanClient client=reconnect
                    ?new LanClient("127.0.0.1",listener.getLocalPort(),
                        new LanClient.ResumeTicket("H2",TOKEN,3),s->{})
                    :new LanClient("127.0.0.1",listener.getLocalPort(),false,"Tester",s->{})){
                if(welcome.split("\\|").length>=4){
                    ok(client.resumeTicket()!=null,"host-issued resume secret accepted");
                    ok(client.resumeTicket().token().equals(reconnect?ROTATED:TOKEN),"correct token retained");
                }else ok(client.resumeTicket()==null,"legacy WELCOME is non-resumable");
                client.note(GhostFieldGuide.Clue.FOOTPRINTS,FieldJournal.Status.SEEN);
            }
            server.join(3500);
            ok(!server.isAlive(),"fake server closes after request");
            if(failure.get()!=null)throw new AssertionError("server socket error",failure.get());
            ok(hello.get().startsWith(reconnect?"RESUME|1|H2|":"JOIN|1|HUNTER|"),
                "expected host admission handshake");
            ok(action.get().equals("NOTE|FOOTPRINTS|SEEN|"+expectedNext),
                "host accepted command watermark; got "+action.get());
        }
    }
    public static void main(String[] args)throws Exception{
        scenario("WELCOME|H2|1|"+ROTATED+"|41",true,42);
        scenario("WELCOME|H1|1|"+TOKEN,false,1);
        scenario("WELCOME|H1|1",false,1);
        System.out.println("PASS: five-field resume, rotated secret, host replay watermark, four- and three-field compatibility");
    }
}
