package org.beckenburg;

import java.net.ServerSocket;
import java.net.Socket;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;

/** A normal TCP EOF is a terminal UI event; deliberate local close is silent. */
public final class LanClientDisconnectTest {
    static void ok(boolean yes,String label){if(!yes)throw new AssertionError(label);}
    static void waitServer(Thread thread,AtomicReference<Throwable> fail)throws Exception {
        thread.join(3000);
        ok(!thread.isAlive(),"test socket server shuts down");
        if(fail.get()!=null)throw new AssertionError("server failed",fail.get());
    }
    public static void main(String[] args)throws Exception {
        try(ServerSocket listener=new ServerSocket(0)){
            AtomicReference<Throwable> problem=new AtomicReference<>();
            Thread server=new Thread(()->{
                try(Socket accepted=listener.accept()){
                    LanProtocol.read(LanProtocol.reader(accepted.getInputStream()));
                    LanProtocol.write(LanProtocol.writer(accepted.getOutputStream()),"WELCOME|H1|"+LanProtocol.VERSION);
                    // Closing the stream without malformed bytes is a clean EOF.
                }catch(Throwable failure){problem.set(failure);}
            },"beckenburg-eof-test-server");
            server.start();
            BlockingQueue<String> events=new LinkedBlockingQueue<>();
            try(LanClient client=new LanClient("127.0.0.1",listener.getLocalPort(),false,"Alpha",events::offer)){
                ok("INFO|network connection ended".equals(events.poll(3,TimeUnit.SECONDS)),
                    "remote graceful close notifies client");
                ok(events.poll(150,TimeUnit.MILLISECONDS)==null,"only one terminal event");
            }
            waitServer(server,problem);
        }
        try(ServerSocket listener=new ServerSocket(0)){
            CountDownLatch release=new CountDownLatch(1);
            AtomicReference<Throwable> problem=new AtomicReference<>();
            Thread server=new Thread(()->{
                try(Socket accepted=listener.accept()){
                    LanProtocol.read(LanProtocol.reader(accepted.getInputStream()));
                    LanProtocol.write(LanProtocol.writer(accepted.getOutputStream()),"WELCOME|H1|"+LanProtocol.VERSION);
                    release.await(3,TimeUnit.SECONDS);
                }catch(Throwable failure){problem.set(failure);}
            },"beckenburg-local-close-test-server");
            server.start();
            BlockingQueue<String> events=new LinkedBlockingQueue<>();
            try(LanClient client=new LanClient("127.0.0.1",listener.getLocalPort(),false,"Alpha",events::offer)){
                client.close();release.countDown();
                ok(events.poll(350,TimeUnit.MILLISECONDS)==null,
                    "deliberate client close does not report network loss");
            }finally{release.countDown();}
            waitServer(server,problem);
        }
        System.out.println("PASS: genuine TCP EOF emits exactly one disconnect; local close stays silent");
    }
}
