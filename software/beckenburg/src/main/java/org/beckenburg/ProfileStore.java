package org.beckenburg;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Properties;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Set;

/** Local, atomic, versioned profile persistence. No executable deserialization. */
public final class ProfileStore {
    private final Path file;
    private int currency, experience;
    private final Set<String> awarded=new HashSet<>();
    private boolean blocked;
    public ProfileStore(Path file) { this.file=file; }
    public int currency() { return currency; }
    public int experience() { return experience; }
    public static Path defaultPath() { return Path.of(System.getProperty("user.home"),".beckenburg","profile.properties"); }
    public void load() throws IOException {
        if(!Files.exists(file))return;
        Properties p=new Properties();
        try(InputStream input=Files.newInputStream(file)){p.load(input);}
        blocked=true;
        if(!"1".equals(p.getProperty("schema")))throw new IOException("Unsupported profile schema");
        try{
            int money=Integer.parseInt(p.getProperty("currency"));
            int xp=Integer.parseInt(p.getProperty("experience"));
            if(money<0||xp<0)throw new NumberFormatException("negative balance");
            currency=money;experience=xp;
            String receipts=p.getProperty("awarded","");
            for(String receipt:receipts.split(",")) if(!receipt.isBlank()) {
                if(!receipt.matches("[0-9a-f\\-]{36}"))throw new NumberFormatException("invalid receipt");
                awarded.add(receipt);
            }
            blocked=false;
        }catch(NumberFormatException ex){throw new IOException("Invalid profile values",ex);}
    }
    public boolean addPayout(InvestigationSession session) throws IOException {
        // Caller issues one award per unique mission instance; this is a local solo prototype.
        if(session.outcome()==InvestigationSession.Outcome.ACTIVE)throw new IllegalStateException("mission unresolved");
        if(blocked)throw new IOException("Profile load failed; payouts blocked until recovery.");
        if(awarded.contains(session.missionId()))return false;
        int oldMoney=currency,oldXp=experience;
        currency=Math.addExact(currency,session.payout());
        experience=Math.addExact(experience,session.outcome()==InvestigationSession.Outcome.CLEANSED?100:20);
        awarded.add(session.missionId());
        try{save();}catch(IOException ex){currency=oldMoney;experience=oldXp;awarded.remove(session.missionId());throw ex;}
        return true;
    }
    public void save() throws IOException {
        if(blocked) throw new IOException("Previous profile load failed; save blocked to preserve existing data.");
        Path parent=file.toAbsolutePath().getParent();
        if(parent==null)throw new IOException("Missing save directory");
        Files.createDirectories(parent);
        Path tmp=Files.createTempFile(parent,"profile-",".tmp");
        try{
            Properties p=new Properties();p.setProperty("schema","1");
            p.setProperty("currency",Integer.toString(currency));p.setProperty("experience",Integer.toString(experience));
            p.setProperty("awarded",String.join(",",new ArrayList<>(awarded)));
            try(OutputStream out=Files.newOutputStream(tmp)){p.store(out,"Beckenburg local profile v1");}
            try{Files.move(tmp,file,StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE);}
            catch(java.nio.file.AtomicMoveNotSupportedException e){Files.move(tmp,file,StandardCopyOption.REPLACE_EXISTING);}
        }finally{Files.deleteIfExists(tmp);}
    }
}
