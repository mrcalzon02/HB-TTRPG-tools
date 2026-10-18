package org.beckenburg;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.*;
import java.nio.file.attribute.PosixFilePermission;
import java.time.Instant;
import java.util.EnumSet;
import java.util.Optional;
import java.util.Properties;

/**
 * Best-effort local, short-lived LAN reconnection ticket. Not a player identity,
 * profile save, authentication service or portable credential for other machines.
 */
public final class LanResumeStore {
    private static final String VERSION="1";
    private static final long MAX_AGE_SECONDS=24*60*60;
    private LanResumeStore() { }

    public record Saved(String address,int port,String seat,String token,long sequence,Instant written) { }

    public static Path defaultPath() {
        return ProfileStore.defaultPath().getParent().resolve("lan-resume.properties");
    }

    private static void validate(String address,int port,String seat,String token,long sequence) {
        if(address==null||address.isBlank()||address.length()>253
                ||address.chars().anyMatch(ch->ch<33||ch>126||ch=='|'||ch=='\\'))
            throw new IllegalArgumentException("invalid LAN hostname/address");
        if(port<1||port>65535)throw new IllegalArgumentException("invalid LAN port");
        if(seat==null||!seat.matches("H[1-6]|GHOST"))
            throw new IllegalArgumentException("invalid LAN seat");
        if(token==null||!token.matches("[0-9a-f]{48}"))
            throw new IllegalArgumentException("invalid resume token");
        if(sequence<0||sequence>999999999999999L)
            throw new IllegalArgumentException("invalid sequence");
    }

    public static void save(Path path,String address,int port,String seat,String token,long sequence)
            throws IOException {
        validate(address,port,seat,token,sequence);
        Path parent=path.toAbsolutePath().getParent();
        if(parent==null)throw new IOException("resume storage requires a parent directory");
        Files.createDirectories(parent);
        Path tmp=Files.createTempFile(parent,"lan-resume-", ".tmp");
        try {
            restrictOwner(tmp);
            Properties p=new Properties();
            p.setProperty("schema",VERSION);
            p.setProperty("address",address);
            p.setProperty("port",Integer.toString(port));
            p.setProperty("seat",seat);
            p.setProperty("token",token);
            p.setProperty("sequence",Long.toString(sequence));
            p.setProperty("written",Instant.now().toString());
            try(OutputStream out=Files.newOutputStream(tmp)){p.store(out,"Beckenburg local LAN recovery capability - treat as private");}
            try { Files.move(tmp,path,StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE); }
            catch(AtomicMoveNotSupportedException e) { Files.move(tmp,path,StandardCopyOption.REPLACE_EXISTING); }
            restrictOwner(path);
        } finally { Files.deleteIfExists(tmp); }
    }

    public static Optional<Saved> load(Path path) throws IOException {
        if(!Files.exists(path))return Optional.empty();
        if(!Files.isRegularFile(path)||Files.size(path)>4096)
            throw new IOException("invalid stored LAN recovery ticket file");
        Properties p=new Properties();
        try(InputStream in=Files.newInputStream(path)){p.load(in);}
        if(!VERSION.equals(p.getProperty("schema")))throw new IOException("unsupported LAN recovery ticket");
        try {
            String address=p.getProperty("address");
            int port=Integer.parseInt(p.getProperty("port",""));
            String seat=p.getProperty("seat"),token=p.getProperty("token");
            long sequence=Long.parseLong(p.getProperty("sequence",""));
            validate(address,port,seat,token,sequence);
            Instant written=Instant.parse(p.getProperty("written",""));
            long age=Instant.now().getEpochSecond()-written.getEpochSecond();
            // 24h is only a local display safety limit. The host enforces its own
            // much shorter disconnect-grace period and authoritative seat checks.
            if(age<0||age>MAX_AGE_SECONDS)return Optional.empty();
            return Optional.of(new Saved(address,port,seat,token,sequence,written));
        }catch(RuntimeException ex){throw new IOException("invalid stored LAN recovery ticket",ex);}
    }

    public static void clear(Path path) throws IOException {Files.deleteIfExists(path);}

    private static void restrictOwner(Path path) throws IOException {
        try {
            Files.setPosixFilePermissions(path,EnumSet.of(
                PosixFilePermission.OWNER_READ,PosixFilePermission.OWNER_WRITE));
        }catch(UnsupportedOperationException ex){
            // Normal on Windows NTFS: inherited ACLs are controlled by Windows.
        }
    }
}
