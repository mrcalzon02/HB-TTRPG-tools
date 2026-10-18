package org.beckenburg;

public final class LanChatTest {
    static void ok(boolean cond,String message){if(!cond)throw new AssertionError(message);}
    static void denied(Runnable action){
        try{action.run();throw new AssertionError("invalid chat accepted");}
        catch(IllegalArgumentException expected){}
    }
    public static void main(String[] args){
        LanChat.Entry entry=new LanChat.Entry(LanChat.Channel.RADIO,5,88,"  Copy that.  ");
        ok(entry.message().equals("Copy that."),"trimmed message");
        ok(LanChat.Entry.decode(entry.frame()).equals(entry),"protocol roundtrip");
        denied(()->LanChat.clean("something|malformed"));
        denied(()->LanChat.clean(" "));
        denied(()->LanChat.clean("\nmic injection"));
        denied(()->LanChat.clean("x".repeat(81)));
        denied(()->LanChat.clean("Unicode emoji \u263A"));
        denied(()->LanChat.Entry.decode("CHAT|RADIO|6|88|bad seat"));
        HouseMap map=new HouseMap();
        LanWorld world=new LanWorld(map);
        LanWorld.Body first=world.body(0),second=world.body(1);
        ok(LanChat.localVisible(map,first,second),"same van proximity");
        world.setRoom(1,4);
        ok(!LanChat.localVisible(map,first,world.body(1)),"distant room conversation private");
        System.out.println("PASS: chat validation, radio framing, local wall/distance routing");
    }
}
