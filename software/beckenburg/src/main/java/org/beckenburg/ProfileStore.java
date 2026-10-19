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
    private final int[][] medicines=new int[2][3];
    // Legacy starter instruments are issued; optional instruments must be purchased.
    private final java.util.EnumSet<EquipmentLoadout.Item> purchasedEquipment=
        java.util.EnumSet.of(EquipmentLoadout.Item.EMF,EquipmentLoadout.Item.THERMOMETER,
            EquipmentLoadout.Item.SPIRIT_BOX,EquipmentLoadout.Item.PHOTO_CAMERA);
    public boolean ownsEquipment(EquipmentLoadout.Item item){return purchasedEquipment.contains(item);}
    public java.util.Set<EquipmentLoadout.Item> equipment(){return java.util.Set.copyOf(purchasedEquipment);}
    public static int equipmentPrice(EquipmentLoadout.Item item){
        return switch(item){
            case EMF,THERMOMETER,SPIRIT_BOX,PHOTO_CAMERA->0;
            case UV_LAMP->150;case SALT->80;
        };
    }
    public boolean purchaseEquipment(EquipmentLoadout.Item item)throws IOException{
        if(blocked)throw new IOException("Profile cannot be modified after failed load");
        if(item==null||purchasedEquipment.contains(item))return false;
        int cost=equipmentPrice(item);
        if(cost<=0||currency<cost)return false;
        currency-=cost;purchasedEquipment.add(item);
        try{save();}catch(IOException e){currency+=cost;purchasedEquipment.remove(item);throw e;}
        return true;
    }
    public int supplyCount(FieldSupplies.Kind kind,FieldSupplies.Tier tier){
        return medicines[kind.ordinal()][tier.ordinal()];
    }
    public FieldSupplies.Tier strongest(FieldSupplies.Kind kind){
        for(int t=FieldSupplies.Tier.values().length-1;t>=0;t--)
            if(medicines[kind.ordinal()][t]>0)return FieldSupplies.Tier.values()[t];
        return null;
    }
    public boolean purchase(FieldSupplies.Kind kind,FieldSupplies.Tier tier)throws IOException{
        if(blocked)throw new IOException("Profile cannot be modified after failed load");
        if(currency<tier.price||supplyCount(kind,tier)>=4)return false;
        currency-=tier.price;medicines[kind.ordinal()][tier.ordinal()]++;
        try{save();}catch(IOException e){
            currency+=tier.price;medicines[kind.ordinal()][tier.ordinal()]--;throw e;
        }
        return true;
    }
    public boolean consume(FieldSupplies.Kind kind,FieldSupplies.Tier tier)throws IOException{
        if(blocked)throw new IOException("Profile cannot be modified after failed load");
        if(supplyCount(kind,tier)==0)return false;
        medicines[kind.ordinal()][tier.ordinal()]--;
        try{save();}catch(IOException e){medicines[kind.ordinal()][tier.ordinal()]++;throw e;}
        return true;
    }
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
            for(FieldSupplies.Kind kind:FieldSupplies.Kind.values())
                for(FieldSupplies.Tier tier:FieldSupplies.Tier.values()){
                    String key="supply."+kind+"."+tier;
                    int count=Integer.parseInt(p.getProperty(key,"0"));
                    if(count<0||count>4)throw new NumberFormatException("invalid medicine stock");
                    medicines[kind.ordinal()][tier.ordinal()]=count;
                }
            for(EquipmentLoadout.Item item:EquipmentLoadout.Item.values()) {
                if(equipmentPrice(item)<=0)continue;
                // Persist enum identifiers, never a user-facing display label.
                // Earlier profiles used Item.toString() (e.g. "UV lamp").
                String stableKey="equipment."+item.name();
                String legacyKey="equipment."+item.toString();
                if(Boolean.parseBoolean(p.getProperty(stableKey,p.getProperty(legacyKey,"false"))))
                    purchasedEquipment.add(item);
            }
            String receipts=p.getProperty("awarded","");
            for(String receipt:receipts.split(",")) if(!receipt.isBlank()) {
                if(!receipt.matches("[0-9a-f\\-]{36}"))throw new NumberFormatException("invalid receipt");
                awarded.add(receipt);
            }
            blocked=false;
        }catch(NumberFormatException ex){throw new IOException("Invalid profile values",ex);}
    }
    /** Network case receipt is settled by the authoritative host, saved locally once.
     * Keep the same receipt set as solo payouts, using the host's UUID.
     */
    public boolean addNetworkPayout(java.util.UUID caseId,int credits,int xp)throws IOException {
        java.util.Objects.requireNonNull(caseId);
        if(credits<0||credits>100000||xp<0||xp>10000)
            throw new IllegalArgumentException("invalid network payout");
        if(blocked)throw new IOException("Profile load failed; payouts blocked.");
        String receipt=caseId.toString();
        if(awarded.contains(receipt))return false;
        int previousCredits=currency,previousExperience=experience;
        currency=Math.addExact(currency,credits);
        experience=Math.addExact(experience,xp);
        awarded.add(receipt);
        try{save();}catch(IOException ex){
            currency=previousCredits;experience=previousExperience;awarded.remove(receipt);throw ex;
        }
        return true;
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
    /**
     * Import a user-owned local progression file without changing the machine's
     * installation identity. Validate the staged bytes before replacing the
     * active profile; leave a versioned backup of the prior save.
     */
    public void importFrom(Path source) throws IOException {
        if (source == null) throw new IOException("No imported save selected");
        Path target = file.toAbsolutePath().normalize();
        Path selected = source.toAbsolutePath().normalize();
        if (selected.equals(target)) throw new IOException("Selected file is already the active save");
        if (!Files.isRegularFile(selected) || Files.size(selected) > 262144)
            throw new IOException("Imported file must be a readable Beckenburg save under 256 KiB");
        Path parent = target.getParent();
        if (parent == null) throw new IOException("Missing save directory");
        Files.createDirectories(parent);
        Path staged = Files.createTempFile(parent, "profile-import-", ".tmp");
        try {
            Files.copy(selected, staged, StandardCopyOption.REPLACE_EXISTING);
            ProfileStore candidate = new ProfileStore(staged);
            candidate.load(); // validate the actual staged bytes before touching the active save
            if (Files.exists(target)) {
                Path backup = parent.resolve("profile-before-import-" + java.util.UUID.randomUUID() + ".properties");
                Files.copy(target, backup);
            }
            try { Files.move(staged, target, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE); }
            catch (java.nio.file.AtomicMoveNotSupportedException e) {
                Files.move(staged, target, StandardCopyOption.REPLACE_EXISTING);
            }
            // Candidate was already validated, so in-memory state can be updated without reopening.
            currency = candidate.currency;
            experience = candidate.experience;
            blocked = false; // successful valid import can recover a previously corrupt profile
            awarded.clear(); awarded.addAll(candidate.awarded);
            purchasedEquipment.clear(); purchasedEquipment.addAll(candidate.purchasedEquipment);
            for (int k = 0; k < medicines.length; k++)
                System.arraycopy(candidate.medicines[k], 0, medicines[k], 0, medicines[k].length);
        } finally { Files.deleteIfExists(staged); }
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
            for(EquipmentLoadout.Item item:EquipmentLoadout.Item.values())
                if(equipmentPrice(item)>0)
                    p.setProperty("equipment."+item.name(),Boolean.toString(ownsEquipment(item)));
            for(FieldSupplies.Kind kind:FieldSupplies.Kind.values())
                for(FieldSupplies.Tier tier:FieldSupplies.Tier.values())
                    p.setProperty("supply."+kind+"."+tier,
                        Integer.toString(supplyCount(kind,tier)));
            try(OutputStream out=Files.newOutputStream(tmp)){p.store(out,"Beckenburg local profile v1");}
            try{Files.move(tmp,file,StandardCopyOption.REPLACE_EXISTING,StandardCopyOption.ATOMIC_MOVE);}
            catch(java.nio.file.AtomicMoveNotSupportedException e){Files.move(tmp,file,StandardCopyOption.REPLACE_EXISTING);}
        }finally{Files.deleteIfExists(tmp);}
    }
}