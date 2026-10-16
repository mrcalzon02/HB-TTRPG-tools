package org.beckenburg;

/** AI choices only use event-based acoustic memory and the same legal commands as the human ghost. */
public final class LanGhostPursuitTest {
    static void ok(boolean v,String m){if(!v)throw new AssertionError(m);}
    public static void main(String[] args) {
        HouseMap map=new HouseMap();
        LanGhostPursuit brain=new LanGhostPursuit(map,42);
        GhostDomain ghost=new GhostDomain(map,4);
        // Quiet footsteps three rooms away are inaudible. Van is always safe.
        brain.heard(4,HouseMap.EXTRACTION_ROOM,20.5,27.5,LanGhostPursuit.Sound.RITUAL,1);
        ok(brain.memory(1)==null,"van noises must not expose hunters");
        brain.heard(4,10,12.6,21.3,LanGhostPursuit.Sound.FOOTSTEP,1);
        ok(brain.memory(1)==null,"distant footsteps cannot become omniscient targets");
        // An actionable, loud equipment event one room east is audible and quantized.
        brain.heard(4,5,20.4,9.2,LanGhostPursuit.Sound.EQUIPMENT,1);
        LanGhostPursuit.Echo e=brain.memory(1);
        ok(e!=null&&e.room()==5&&e.approximateX()==21&&e.approximateZ()==9,
                "heard signal provides coarse area, not exact body coordinates");
        brain.heard(4,5,20.9,9.7,LanGhostPursuit.Sound.EQUIPMENT,2);
        ok(brain.memory(2).approximateX()==21&&brain.memory(2).approximateZ()==9,
                "same-cell movement cannot disclose sub-tile movement");
        GhostDomain.Observation obs=ghost.observe();
        // Tick 0 legal DRIFT; same observed conditions for either AI/human command.
        GhostDomain.Command command=brain.decide(obs,false);
        ok(command!=null&&command.action()==GhostDomain.Action.DRIFT&&command.targetRoom()==5,
                "AI pursues audible target through legal adjacency");
        GhostDomain.Resolution done=ghost.dispatch(command);
        ok(done.applied()&&ghost.room()==5,"AI must pass the normal GhostDomain dispatch rule");
        LanGhostSpatial spatial=new LanGhostSpatial(map,4);
        spatial.syncRoom(ghost.room());
        LanGhostPursuit.Impulse toward=brain.approach(ghost.observe(),spatial.pose());
        ok(toward!=null&&toward.dx()!=0&&toward.dz()!=0,"local approach uses bounded impulse");
        ok(spatial.step(toward.dx(),toward.dz(),1),"AI uses exact human ghost move validator");
        ok(spatial.pose().room()==5&&map.roomAt(spatial.pose().x(),spatial.pose().z())==5,
                "AI cannot step across a room wall");
        ok(brain.memory(80)==null,"the target must expire rather than persist forever");
        GhostDomain.Command missing=brain.decide(new GhostDomain.Observation(79,5,4,95,false,false,
                map.ghostExits(5),java.util.List.of(GhostDomain.Action.DRIFT, GhostDomain.Action.WHISPER)),false);
        ok(missing==null,"no sound and no patrol tick does not infer hidden hunters");
        // Loud ritual cues travel farther, and route selection uses graph edges only.
        LanGhostPursuit ritual=new LanGhostPursuit(map,123);
        ritual.heard(4,10,map.centerX(10),map.centerZ(10),LanGhostPursuit.Sound.RITUAL,20);
        ok(ritual.memory(20)!=null,"nearby ritual attracts ghost through multiple rooms");
        GhostDomain.Command first=ritual.decide(new GhostDomain.Observation(20,4,4,100,false,false,
                map.ghostExits(4),java.util.List.of(GhostDomain.Action.DRIFT)),false);
        ok(first!=null&&map.ghostExits(4).contains(first.targetRoom()),"path uses only legal exits");
        ok(ritual.memory(200)==null,"ritual scent fades");
        // A hidden, quiet hunter in the same room cannot cause AI omniscient attacks.
        LanGhostPursuit quiet=new LanGhostPursuit(map,777);
        GhostDomain.Command attack=quiet.decide(new GhostDomain.Observation(180,4,4,100,true,true,
                map.ghostExits(4),java.util.List.of(GhostDomain.Action.STRIKE)),true);
        ok(attack==null,"co-location alone cannot grant AI target acquisition without a sound event");
        // No new command may invent a powered strike if STRIKE is not legal.
        GhostDomain.Command forbidden=brain.decide(new GhostDomain.Observation(170,5,4,100,false,true,
                map.ghostExits(5),java.util.List.of(GhostDomain.Action.WHISPER)),true);
        ok(forbidden==null,"AI does not bypass cooldown or manifestation requirements");
        System.out.println("PASS: bounded ghost hearing, coarse memory, route choice, physical pursuit, parity and expiry");
    }
}
