package org.beckenburg;

import java.util.EnumMap;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * Source-authoritative planned gear progression; no item is made playable by
 * registering a tier. A better device samples the SAME genuine ghost events:
 * never raises a low EMF sample into a ghost signature or manufactures marks.
 */
public final class EquipmentTiers {
    private EquipmentTiers(){}
    public enum Tier { I, II, III }
    public enum Role { SENSOR, AUDIO, OPTICAL, PROJECTOR, DEPLOYABLE,
        DEFENSE, CONSUMABLE, MONITOR, RITUAL, UTILITY }
    public record Plan(String id,Role role,int basicPrice,int reachCm,
                       int intervalTicks,int capacity,int batterySeconds,
                       String first,String second,String third){
        public Plan{
            Objects.requireNonNull(id);Objects.requireNonNull(role);
            if(basicPrice<0||reachCm<0||intervalTicks<0||capacity<0||batterySeconds<0)
                throw new IllegalArgumentException("negative gear tuning");
            if(first==null||second==null||third==null||first.isBlank()
                    ||second.isBlank()||third.isBlank())
                throw new IllegalArgumentException("missing tier behavior");
        }
    }
    public record Stage(String id,Tier tier,int creditCost,int reachCm,
                        int intervalTicks,int capacity,int batterySeconds,
                        int displayScalePercent,String effect){
        public Stage{
            if(creditCost<0||reachCm<0||intervalTicks<0||capacity<0
                    ||batterySeconds<0||displayScalePercent<100||effect.isBlank())
                throw new IllegalArgumentException("invalid stage");
        }
    }
    private static Plan p(String id,Role role,int price,int range,int interval,
                          int capacity,int battery,String one,String two,String three){
        return new Plan(id,role,price,range,interval,capacity,battery,one,two,three);
    }
    private static final List<Plan> PLANS=List.of(
        p("DOTS_PROJECTOR",Role.PROJECTOR,75,220,14,0,180,"Fixed sparse dot field","Wider fan and faster refresh","Full-room adjustable structured-light volume"),
        p("EMF_READER",Role.SENSOR,50,260,12,0,240,"Small segmented 0–10 scale","Larger numbered scale; faster polling","Backlit large digits and event-history strip"),
        p("FLASHLIGHT",Role.UTILITY,30,800,0,0,280,"Narrow beam; charge 280 seconds","Wider brighter beam; charge 420 seconds","Broad efficient beam; charge 630 seconds"),
        p("GHOST_WRITING_BOOK",Role.DEPLOYABLE,45,120,0,1,0,"Small paper book; one writable surface","Wider pages and clearer ink visibility","Oversized high-contrast pages and angleable stand"),
        p("SPIRIT_BOX",Role.AUDIO,55,210,12,0,180,"Simple radio dial","Larger response display, quieter speaker","Broadband receiver, waveform and directional headset"),
        p("THERMOMETER",Role.SENSOR,40,340,13,0,280,"Slow handheld analog temperature","Responsive digital probe with unit switch","Large backlit readout, temperature trend history"),
        p("UV_LIGHT",Role.OPTICAL,35,280,0,0,200,"Narrow UV inspection cone","Stronger UV beam and broader coverage","Wide UV flood with visible trace contrast"),
        p("VIDEO_CAMERA",Role.OPTICAL,80,500,0,0,240,"Narrow 65-degree live camera; grainy small CRT feed","93-degree wider view with clearer feed","120-degree wide-angle lens, large monitor and night video"),
        p("CRUCIFIX",Role.DEFENSE,70,180,0,2,0,"Short-range simple cross","Larger protective reach and durability","Extended defense coverage and clear charge indicators"),
        p("FIRELIGHT",Role.UTILITY,15,120,0,2,120,"Small flame in lantern","Wind-shielded broad lantern","Long-burn adjustable brightness lantern"),
        p("HEAD_GEAR",Role.OPTICAL,75,450,0,0,240,"Simple strapped lamp","Hands-free camera and tilt mount","Lightweight wide-angle sensor and clear recorder status"),
        p("IGNITER",Role.UTILITY,10,0,0,8,0,"Disposable lighter","Refillable lighter with status window","Stormproof ignition with abundant uses"),
        p("INCENSE",Role.DEFENSE,60,200,0,2,25,"Brief localized smoke","Longer burn and larger protective cloud","Adjustable dispersal with clear depletion indicator"),
        p("MOTION_SENSOR",Role.DEPLOYABLE,55,400,8,1,220,"Single narrow detection beam","Wider sweep and visible indicator","Multi-zone detector with positional log"),
        p("PARABOLIC_MICROPHONE",Role.AUDIO,60,600,14,0,220,"Single directional audio pickup","Better aiming cone and gain dial","Large spectrogram and precise directional controls"),
        p("PHOTO_CAMERA",Role.OPTICAL,45,450,0,1,0,"One-exposure Polaroid; low-resolution square print","Six-shot camera; full-frame clearer images","Twelve-shot camera; large high-clarity images and improved framing"),
        p("SALT",Role.DEPLOYABLE,20,140,0,3,0,"Three small piles","More salt per pouch and larger floor coverage","Greater capacity and high-visibility footprint contrast"),
        p("SANITY_MEDICATION",Role.CONSUMABLE,50,0,0,1,0,"Basic sanity restoration (18)","Improved sanity restoration (36)","Advanced sanity restoration (65)"),
        p("SOUND_RECORDER",Role.AUDIO,60,400,12,2,240,"8-second mono clips; 2 clip memory","16-second stereo clips; 3 clip memory","32-second stereo clips; 4 clip memory and greater pickup range"),
        p("SOUND_SENSOR",Role.DEPLOYABLE,65,500,12,1,240,"Single room sound pickup","Longer range and louder event annunciator","Multi-zone pickup with timed history"),
        p("TRIPOD",Role.DEPLOYABLE,30,0,0,1,0,"Fixed-height camera stand","Adjustable height and pan","Motorized pan/tilt with fine aiming"),
        p("CLIPBOARDS",Role.MONITOR,20,0,0,1,0,"Paper assignment list","Editable clear task slate","Shared synchronized assignment board"),
        p("COMPUTER",Role.MONITOR,150,0,8,1,0,"One small camera feed","Multiple feeds and larger display","Tiled live video and rapid switching"),
        p("OBJECTIVE_BOARD",Role.MONITOR,35,0,0,1,0,"Basic printed objectives","Larger writable board","Room-linked objectives and progress map"),
        p("SANITY_MONITOR",Role.MONITOR,160,0,14,1,0,"Slow numeric health/sanity list","Responsive color-coded chart","Large multi-investigator trend panel"),
        p("SITE_ACTIVITY_MONITOR",Role.MONITOR,170,0,14,1,0,"Single activity trend","Faster graph and readable room ranges","Multi-sensor graph with event timestamps"),
        p("SITE_MAP",Role.MONITOR,50,0,0,1,0,"Printed house map","Readable floor plan and placement marks","Zoomable map with sensor coverage overlays"),
        p("SOUND_MONITOR",Role.MONITOR,165,0,13,1,0,"One-channel audio meters","Multiple live room inputs","Selectable waveform/spectrum array"),
        p("ANCHOR_TRIANGULATOR",Role.SENSOR,100,300,14,0,280,"Single bearing needle","Dual-angle bearings and map overlay","Large multi-sensor triangle with position history"),
        p("ECTOPLASM_SAMPLER",Role.SENSOR,105,100,12,3,0,"Three small swabs and manual assay","Larger sample vials and readable vial labels","Field microscope and multiple sample wells"),
        p("RESONANCE_TUNER",Role.AUDIO,120,260,13,0,180,"Handheld tone and pulse meter","Frequency readout with stronger response pickup","Spectral waterfall and precise tuning"),
        p("BAROMETRIC_PROBE",Role.SENSOR,110,240,13,0,280,"Dial pressure differential","Digital pressure trace and room baseline","Large differential trend display with station pairing"),
        p("SEISMIC_RECORDER",Role.DEPLOYABLE,135,450,12,1,240,"Single-channel vibration needle","Dual-axis floor pickup","Three-axis array with source direction"),
        p("SPECTRAL_PRISM",Role.OPTICAL,145,340,0,0,210,"Small optical sight","Wider polarized viewing pane","Full-width spectral overlay and recording"),
        p("LASER_GRID",Role.PROJECTOR,135,290,15,0,220,"Single sparse beam plane","Dense fan projection and quicker updates","Volume-filling geometry mesh with visible occlusion"),
        p("EMF_ARRAY",Role.DEPLOYABLE,155,320,12,2,250,"Two sensor nodes with basic ticks","Three synchronized range sensors","Five-node coverage and readable event history"),
        p("THERMAL_BEACON",Role.DEPLOYABLE,130,370,12,2,240,"Two remote temperatures","Four stations and faster reporting","Six stations with continuous history"),
        p("RITUAL_ANCHOR_METER",Role.SENSOR,160,190,14,0,210,"Small ritual-stability needle","Quicker ritual field sampler","Large ritual-load trend and distance indicator"),
        p("WARD_STABILITY_PROBE",Role.SENSOR,130,230,12,0,220,"Slow ward strength dial","Fast stability graph","Long-life ward timeline and clear warning"),
        p("OBJECT_IMPRINT_SCANNER",Role.SENSOR,140,160,12,2,180,"Single-object contact plate","Wider item contact mat and sample memory","Hands-free table scanner with serial archive"),
        p("CHALK_SIGIL_KIT",Role.DEPLOYABLE,40,150,0,3,0,"Three short chalk wards","Larger chalk kit and stronger line contrast","Longer sigil paths and easily visible integrity"),
        p("SPECTRAL_FREQUENCY_ANALYZER",Role.AUDIO,185,450,14,0,250,"Single audio frequency needle","Responsive harmonic trace","Large multi-band spectrum and full session history")
    );
    private static final Map<String,Plan> BY_ID;
    static {
        Map<String,Plan> lookup=new HashMap<>();
        for(Plan plan:PLANS){
            EquipmentRegistry.get(plan.id()); // every tier refers to a real catalog item
            if(lookup.put(plan.id(),plan)!=null)
                throw new AssertionError("duplicated equipment tiers: "+plan.id());
        }
        if(lookup.size()!=EquipmentRegistry.all().size())
            throw new AssertionError("equipment without progression data");
        BY_ID=Map.copyOf(lookup);
    }
    public static List<Plan> all(){return PLANS;}
    public static Plan get(String id){
        Plan result=BY_ID.get(Objects.requireNonNull(id));
        if(result==null)throw new IllegalArgumentException("unknown tiered tool: "+id);
        return result;
    }
    public static Stage stage(String id,Tier tier){
        Plan plan=get(id);Objects.requireNonNull(tier);
        int at=tier.ordinal();
        int credits=plan.basicPrice() * new int[]{1,2,4}[at];
        if(id.equals("SANITY_MEDICATION"))
            credits=FieldSupplies.Tier.values()[at].price; // actual existing shop prices
        int reach=plan.reachCm()==0?0:(plan.reachCm()*new int[]{100,135,175}[at]+50)/100;
        int interval=plan.intervalTicks()==0?0:
            Math.max(2,(plan.intervalTicks()*new int[]{100,75,50}[at]+50)/100);
        int capacity=plan.capacity()==0?0:
            (plan.capacity()*new int[]{100,150,220}[at]+50)/100;
        // Film magazine hardware is not a generic +50% consumable scaling:
        // Polaroid 1, mid-range 6, professional 12 actual exposures.
        if(id.equals("PHOTO_CAMERA"))capacity=new int[]{1,6,12}[at];
        int duration=plan.batterySeconds()==0?0:
            (plan.batterySeconds()*new int[]{100,150,225}[at]+50)/100;
        String effect=switch(tier){
            case I->plan.first();case II->plan.second();case III->plan.third();
        };
        return new Stage(id,tier,credits,reach,interval,capacity,duration,
            (plan.role()==Role.CONSUMABLE||plan.role()==Role.DEFENSE)?100:
                new int[]{100,125,150}[at],effect);
    }
    public static List<Stage> stages(String id){
        return java.util.Arrays.stream(Tier.values()).map(t->stage(id,t)).toList();
    }
}
