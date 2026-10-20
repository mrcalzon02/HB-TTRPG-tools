package org.beckenburg;

import java.net.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;

/** A deliberate exit must deliver LEAVE even with unread inbound data on Windows TCP. */
public final class LanGracefulLeaveTest {
    public static void main(String[] args)throws Exception{
        for(int round=0;round<12;round++){
            try(ServerSocket listener=new ServerSocket(0)){
                AtomicReference<Throwable> failure=new AtomicReference<>();
                CountDownLatch observerEntered=new CountDownLatch(1),releaseObserver=new CountDownLatch(1);
                Thread server=new Thread(()->{
                    try(Socket socket=listener.accept()){
                        socket.setSoTimeout(3000);
                        var reader=LanProtocol.reader(socket.getInputStream());
                        var writer=LanProtocol.writer(socket.getOutputStream());
                        LanProtocol.read(reader);LanProtocol.write(writer,"WELCOME|H1|"+LanProtocol.VERSION);
                        LanProtocol.write(writer,"INFO|first queued update");
                        for(int i=0;i<200;i++)LanProtocol.write(writer,"INFO|pending update "+i);
                        if(!"LEAVE".equals(LanProtocol.read(reader)))throw new AssertionError("intentional leave was lost");
                        if(LanProtocol.read(reader)!=null)throw new AssertionError("client output was not half-closed");
                        // Input EOF must not reset the receive half or discard pending bytes.
                        LanProtocol.write(writer,"INFO|host processed leave");
                    }catch(Throwable error){failure.set(error);}
                },"beckenburg-graceful-leave-test");
                server.start();
                try(LanClient client=new LanClient("127.0.0.1",listener.getLocalPort(),false,"Tester",s->{
                    observerEntered.countDown();
                    try{releaseObserver.await(3,TimeUnit.SECONDS);}catch(InterruptedException error){Thread.currentThread().interrupt();}
                })){
                    if(!observerEntered.await(3,TimeUnit.SECONDS))throw new AssertionError("client is receiving pending updates");
                    client.close();releaseObserver.countDown();
                    server.join(3000);
                    if(server.isAlive())throw new AssertionError("leave did not finish in bounded time");
                    if(failure.get()!=null)throw new AssertionError("graceful leave under pending data",failure.get());
                }finally{releaseObserver.countDown();}
            }
        }
        System.out.println("PASS: 12 TCP exits deliver LEAVE and EOF despite unread incoming updates");
    }
}
