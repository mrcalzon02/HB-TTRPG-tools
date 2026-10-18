package org.beckenburg;

import java.io.IOException;
import java.util.concurrent.LinkedBlockingQueue;

/** Real localhost admissions: passwords, lock, local-owner API and reserved-seat distinction. */
public final class LanHostAccessIntegrationTest {
    private static void check(boolean yes,String reason){if(!yes)throw new AssertionError(reason);}
    public static void main(String[] args)throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0)){
            host.setLobbyPassword("friends-only");
            try{
                new LanClient("127.0.0.1",host.port(),false,"Wrong","nope",s->{});
                throw new AssertionError("wrong password accepted");
            }catch(IOException expected){
                check(expected.getMessage().contains("incorrect room password"),"wrong password explains denial");
            }
            check(host.connected()==0,"invalid password must not occupy seat");
            try(LanClient a=new LanClient("127.0.0.1",host.port(),false,"Owner","friends-only",s->{})){
                check("H1".equals(a.seat()),"valid password joined original host seat");
                try{host.setLobbyPassword("changed");throw new AssertionError("password change bypassed active lobby");}
                catch(IllegalStateException expected){}
                host.setLobbyLocked(true);
                check(host.lobbyLocked(),"local host locked lobby");
                try{
                    new LanClient("127.0.0.1",host.port(),false,"Intruder","friends-only",s->{});
                    throw new AssertionError("locked lobby let a new player in");
                }catch(IOException expected){
                    check(expected.getMessage().contains("lobby locked"),"locked reason explicit");
                }
                host.setLobbyLocked(false);
                try(LanClient b=new LanClient("127.0.0.1",host.port(),false,"Friend","friends-only",s->{})){
                    check("H2".equals(b.seat()),"unlock admits second valid guest");
                    check(host.connected()==2,"only authorized peers counted");
                }
            }
        }
        try(LanHost publicLan=new LanHost("127.0.0.1",0);
            LanClient plain=new LanClient("127.0.0.1",publicLan.port(),false,"Legacy",s->{})){
            check("H1".equals(plain.seat()),"existing passwordless protocol still works");
        }
        System.out.println("PASS: password admission, denied guests, locked lobby, legacy join and local-only host controls");
    }
}
