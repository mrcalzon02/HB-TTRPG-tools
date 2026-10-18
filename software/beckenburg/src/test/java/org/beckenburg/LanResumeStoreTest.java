package org.beckenburg;

import java.io.IOException;
import java.nio.file.*;
import java.time.Instant;
import java.util.Properties;
import java.util.Optional;

/** Offline file-level proof: restoring a LAN seat capability never touches progression. */
public final class LanResumeStoreTest {
    private static void check(boolean pass,String why){if(!pass)throw new AssertionError(why);}
    private static void expectInvalid(Path file)throws Exception{
        try{LanResumeStore.load(file);throw new AssertionError("corrupt ticket accepted");}
        catch(IOException expected){}
    }
    public static void main(String[] args)throws Exception {
        Path root=Files.createTempDirectory("beckenburg-resume-store-");
        Path file=root.resolve("lan-resume.properties");
        String token="0123456789abcdef0123456789abcdef0123456789abcdef";
        String newer="fedcba9876543210fedcba9876543210fedcba9876543210";
        try {
            check(LanResumeStore.load(file).isEmpty(),"absent recovery offer does not invent a ticket");
            LanResumeStore.save(file,"192.168.0.25",27717,"H2",token,17);
            var stored=LanResumeStore.load(file).orElseThrow();
            check(stored.address().equals("192.168.0.25")
                &&stored.port()==27717&&stored.seat().equals("H2")
                &&stored.token().equals(token)&&stored.sequence()==17,
                "ticket persists accurate connection and command high-water fields");
            // A freshly started JVM does not need the previous client's in-memory state.
            check(LanResumeStore.load(file).orElseThrow().token().equals(token),"restart loads same secret");
            Path gameSave=root.resolve("profile.properties");
            Files.writeString(gameSave,"schema=1\ncurrency=999999\nexperience=6\n");
            String profileBefore=Files.readString(gameSave);
            LanResumeStore.save(file,"fe80::aabb",27717,"GHOST",newer,152);
            check(LanResumeStore.load(file).orElseThrow().token().equals(newer),"rotation overwrites old ticket");
            check(Files.readString(gameSave).equals(profileBefore),"no progress or account file changes");
            String previous=Files.readString(file);
            try{LanResumeStore.save(file,"127.0.0.1",27717,"H1","bad",0);
                throw new AssertionError("invalid secret saved");}
            catch(IllegalArgumentException expected){}
            check(Files.readString(file).equals(previous),"rejected input preserves original ticket");
            Properties stale=new Properties();
            try(var in=Files.newInputStream(file)){stale.load(in);}
            stale.setProperty("written",Instant.now().minusSeconds(2*24*3600).toString());
            try(var out=Files.newOutputStream(file)){stale.store(out,"expired");}
            check(LanResumeStore.load(file).isEmpty(),"old session not offered on next launch");
            stale.setProperty("written","nonsense");
            try(var out=Files.newOutputStream(file)){stale.store(out,"bad timestamp");}
            expectInvalid(file);
            check(Files.readString(file).contains("nonsense"),"bad recovery ticket preserved for diagnosis");
            LanResumeStore.clear(file);
            check(Files.notExists(file),"intentional Leave removes saved capability");
            LanResumeStore.clear(file);
        }finally{
            try(var all=Files.walk(root)){
                all.sorted(java.util.Comparator.reverseOrder()).forEach(p->{
                    try{Files.delete(p);}catch(IOException ex){throw new RuntimeException(ex);}
                });
            }
        }
        System.out.println("PASS: LAN resume file, rotation, expiry, corruption preservation and profile isolation");
    }
}
