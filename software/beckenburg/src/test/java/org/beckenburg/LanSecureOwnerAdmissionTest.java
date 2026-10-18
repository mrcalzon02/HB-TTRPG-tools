package org.beckenburg;

import java.io.IOException;
import java.util.concurrent.LinkedBlockingQueue;

/** Host slot cannot be stolen by a remote peer connecting before the local UI client. */
public final class LanSecureOwnerAdmissionTest {
    private static void ok(boolean value,String message){if(!value)throw new AssertionError(message);}
    private static void deny(int port,boolean ghost,String password,String forged,String reason)throws Exception{
        try(LanClient forbidden=new LanClient("127.0.0.1",port,ghost,"Impersonator",password,forged,s->{})){
            throw new AssertionError("host accepted "+reason);
        }catch(IOException expected){
            ok(expected.getMessage().contains(reason),"explicit host rejection for "+reason+": "+expected);
        }
    }
    public static void main(String[] args)throws Exception{
        try(LanHost host=new LanHost("127.0.0.1",0,
                GhostIdentity.Type.SPIRIT,CustomContract.standard(3),false,true)){
            host.setLobbyPassword("friends");
            try(LanClient earlyGuest=new LanClient("127.0.0.1",host.port(),false,
                    "GuestFirst","friends",s->{})){
                ok("H2".equals(earlyGuest.seat()),"pre-owner guest cannot steal H1");
                deny(host.port(),false,"friends","000000000000000000000000000000000000000000000000",
                    "unauthorized owner claim");
                try(LanClient owner=new LanClient("127.0.0.1",host.port(),false,
                        "Owner","friends",host.localOwnerCredential(),s->{})){
                    ok("H1".equals(owner.seat()),"actual host claims its original H1 role");
                    ok(host.connected()==2,"only authorized guest and owner are connected");
                }
            }
        }
        try(LanHost host=new LanHost("127.0.0.1",0,
                GhostIdentity.Type.SPIRIT,CustomContract.standard(3),true,true)){
            try(LanClient firstHunter=new LanClient("127.0.0.1",host.port(),
                    false,"GuestH1",s->{})){
                ok("H1".equals(firstHunter.seat()),"guest H1 allowed when host is ghost");
                try(LanClient wrongGhost=new LanClient("127.0.0.1",host.port(),
                        true,"SpoofGhost",s->{})){
                    throw new AssertionError("remote ghost stole owner ghost seat");
                }catch(IOException expected){
                    ok(expected.getMessage().contains("host ghost seat reserved"),
                        "unclaimed local ghost seat stays unavailable to remote guests");
                }
                try(LanClient hostGhost=new LanClient("127.0.0.1",host.port(),
                        true,"RealGhostOwner","",host.localOwnerCredential(),s->{})){
                    ok("GHOST".equals(hostGhost.seat()),"local owner claims ghost role");
                }
            }
        }
        System.out.println("PASS: local owner role protected before join, false owner denied, ghost-owner reservation");
    }
}
