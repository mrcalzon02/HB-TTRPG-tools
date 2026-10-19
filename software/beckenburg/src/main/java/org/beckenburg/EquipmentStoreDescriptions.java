package org.beckenburg;

import java.util.List;
import java.util.Objects;

/**
 * One purchase-facing source of truth for tier names, prices and capabilities.
 * Values come from the same EquipmentTiers.Stage that controls host hardware.
 * Nonworking catalog devices are explicitly labelled plans, never for sale.
 */
public final class EquipmentStoreDescriptions {
    private EquipmentStoreDescriptions(){}

    public record Listing(String id,String name,EquipmentTiers.Tier tier,
                          boolean currentlyPlayable,int price,String effect,
                          String capabilityLine,String specificationLine){
        public Listing{
            Objects.requireNonNull(id);Objects.requireNonNull(name);
            Objects.requireNonNull(tier);
            Objects.requireNonNull(effect);Objects.requireNonNull(capabilityLine);
            Objects.requireNonNull(specificationLine);
        }
        public String compactLabel(){
            return name+"  /  T"+(tier.ordinal()+1)+"  /  £"+price;
        }
        public String details(){
            return name+" — Tier "+(tier.ordinal()+1)+
                "\n"+(currentlyPlayable?"Field instrument":"PLANNED, NOT PURCHASABLE")+
                "\n"+effect+"\n"+capabilityLine+"\n"+specificationLine;
        }
        public String tooltipHtml(){
            String[] lines=details().split("\n",-1);
            StringBuilder out=new StringBuilder("<html><div style='width:360px'>");
            for(int i=0;i<lines.length;i++){
                if(i!=0)out.append("<br>");
                out.append(html(lines[i]));
            }
            return out.append("</div></html>").toString();
        }
    }
    private static String html(String text){
        return text.replace("&","&amp;").replace("<","&lt;")
            .replace(">","&gt;").replace("\"","&quot;");
    }
    /** Never sell an aspiration as a functioning tier upgrade. */
    private static String actualBenefit(String id,EquipmentTiers.Tier tier,
                                         EquipmentTiers.Stage stage){
        int at=tier.ordinal();
        return switch(id){
            case "EMF_READER"->"Handheld field strength 0–10; tiered sensing reach and response rate";
            case "THERMOMETER"->"Actual ambient air temperature; tiered sensing reach and response rate";
            case "SPIRIT_BOX"->"Physical voice receiver; tiered pickup reach and faster sampling";
            case "SOUND_RECORDER"->FieldSoundRecorder.durationTicks(tier)/10+
                "s clips; "+stage.capacity()+" stored clips; "+
                (tier==EquipmentTiers.Tier.I?"mono":"stereo")+" playback and WAV export";
            case "UV_LIGHT"->"Brighter UV pickup of genuine fading traces, up to "+
                new int[]{90,125,160}[at]+" host ticks after they were left";
            case "DOTS_PROJECTOR"->"Physical projected grid, coverage radius "+
                String.format(java.util.Locale.ROOT,"%.2f",stage.reachCm()/100.0)+
                "m; passage only on real ghost action";
            case "GHOST_WRITING_BOOK"->"Larger tiered handheld book visual; one real open book per placement";
            case "FLASHLIGHT"->"Actual brighter/wider beam and "+
                stage.batterySeconds()+" seconds charge before van recharge";
            case "PHOTO_CAMERA"->new int[]{1,6,12}[at]+
                " real shutter exposure(s); original scene recorded to a "+
                EquipmentOptics.forTier(tier).photoWidth()+"×"+
                EquipmentOptics.forTier(tier).photoHeight()+" PNG";
            case "VIDEO_CAMERA"->"Live remote scene video with "+
                (int)EquipmentOptics.forTier(tier).videoFieldOfView()+
                "° optical FOV and tiered battery life";
            case "HEAD_GEAR"->"Switchable true-scene night-vision filter; "+
                stage.batterySeconds()+" seconds battery life";
            case "FIRELIGHT"->"Switchable flame; "+stage.batterySeconds()+
                " seconds burn before automatic extinguishing";
            case "IGNITER"->stage.capacity()+" real sparks; each activation uses one charge";
            case "INCENSE"->stage.capacity()+" incense bundles; each produces "+
                stage.batterySeconds()+" seconds of visible smoke";
            default->stage.effect();
        };
    }
    public static Listing describe(String id,EquipmentTiers.Tier tier){
        Objects.requireNonNull(id);Objects.requireNonNull(tier);
        EquipmentRegistry.Tool tool=EquipmentRegistry.get(id);
        EquipmentTiers.Stage stage=EquipmentTiers.stage(id,tier);
        String specs;
        switch(id){
            case "PHOTO_CAMERA" -> {
                var p=EquipmentOptics.forTier(tier);
                specs=p.photos()+" exposure"+(p.photos()==1?"":"s")+
                    "; "+p.photoWidth()+"×"+p.photoHeight()+" saved PNG"+
                    (tier==EquipmentTiers.Tier.I?"; square instant-print crop":
                     tier==EquipmentTiers.Tier.II?"; standard full-frame image":
                        "; larger resampled full-frame image");
            }
            case "VIDEO_CAMERA" -> {
                var p=EquipmentOptics.forTier(tier);
                specs=(int)p.videoFieldOfView()+"° physical camera view; up to "+
                    p.monitorWidth()+"px monitor; "+
                    (p.videoNightMode()?"night-vision video available":"color feed");
                specs+="; charged runtime "+stage.batterySeconds()+"s";
            }
            case "FLASHLIGHT" -> {
                int[] reach={6,9,12};
                specs="Illuminated beam "+reach[tier.ordinal()]+"m; battery "+
                    stage.batterySeconds()+"s; recharge at the van";
            }
            case "UV_LIGHT" -> specs="Genuine trace visibility "+
                new int[]{90,125,160}[tier.ordinal()]+" ticks; sample battery "+
                stage.batterySeconds()+"s";
            case "DOTS_PROJECTOR" -> specs=String.format(java.util.Locale.ROOT,
                "Actual grid coverage %.2fm; real ghost passages only",
                stage.reachCm()/100.0);
            case "GHOST_WRITING_BOOK" -> specs="One actual deployed book; "+
                "larger held illustration at T"+(tier.ordinal()+1);
            case "HEAD_GEAR","FIRELIGHT" -> specs="Real on/off operation; "+
                "charge/fuel duration "+stage.batterySeconds()+"s";
            case "IGNITER" -> specs="Actual spark count "+stage.capacity();
            case "INCENSE" -> specs=stage.capacity()+" bundles; "+
                stage.batterySeconds()+"s visible smoke per bundle; "+
                "no invented paranormal evidence";
            default -> {
                var pieces=new java.util.ArrayList<String>();
                if(stage.reachCm()>0)
                    pieces.add(String.format(java.util.Locale.ROOT,"reach %.2fm",
                        stage.reachCm()/100.0));
                if(stage.intervalTicks()>0)
                    pieces.add(String.format(java.util.Locale.ROOT,"sample %.1fs",
                        stage.intervalTicks()/10.0));
                if(stage.capacity()>0)pieces.add("capacity "+stage.capacity());
                if(stage.batterySeconds()>0)
                    pieces.add("battery "+stage.batterySeconds()+"s");
                specs=pieces.isEmpty()?"No numeric hardware range specified":
                    String.join("; ",pieces);
            }
        }
        String line=switch(id){
            case "EMF_READER"->"Reads actual 0–10 EMF; 2–7 usual, 8–10 strong, 0 possible suppression. Faster sampling never generates a signal";
            case "THERMOMETER"->"Reads actual room air in °C/°F; ordinary variation remains measurable regardless of ghost";
            case "SPIRIT_BOX"->"Listens for real nearby vocal events; silence is an ordinary result";
            case "SOUND_RECORDER"->"R records/stops actual game sound cues; P replays and saves the last clip. Silent rooms record silence";
            case "UV_LIGHT"->"Inspects surfaces for real existing UV traces; no mark is invented";
            case "PHOTO_CAMERA"->"Every shutter press saves the scene, whether empty or haunted; film is finite";
            case "VIDEO_CAMERA"->"Relays the actual scene from the placed camera; no evidence or identity verdict";
            case "FLASHLIGHT"->"Switches on/off, improves real 3D illumination, drains charge when on";
            case "HEAD_GEAR"->"Switchable head-mounted night-vision enhancement; battery drains when on";
            case "DOTS_PROJECTOR"->"Projects actual light; only genuine moving ghost events produce silhouettes";
            case "GHOST_WRITING_BOOK"->"Placed physical book; ghost writing happens only after a real ghost interaction";
            case "INCENSE"->"Ignited physical incense cloud with an actual burn duration";
            case "FIRELIGHT"->"Switchable open flame; does not certify evidence";
            case "IGNITER"->"Creates a flame using a finite supply; never queries ghost identity";
            default->"Catalog design only; effect and numeric values are proposals until an event backend exists";
        };
        return new Listing(id,tool.name(),tier,FieldEquipment.functional(id),
            stage.creditCost(),
            FieldEquipment.functional(id)?actualBenefit(id,tier,stage):stage.effect(),
            line,specs);
    }
    public static List<Listing> tiers(String id){
        EquipmentRegistry.get(id);
        return java.util.Arrays.stream(EquipmentTiers.Tier.values())
            .map(t->describe(id,t)).toList();
    }
    public static String comparativeDescription(String id,EquipmentTiers.Tier current){
        Objects.requireNonNull(current);
        StringBuilder text=new StringBuilder();
        for(var item:tiers(id)){
            text.append("T").append(item.tier().ordinal()+1).append("  £")
                .append(item.price()).append(" — ").append(item.effect())
                .append("\n").append(item.specificationLine()).append("\n");
        }
        return text.toString().stripTrailing();
    }
}
