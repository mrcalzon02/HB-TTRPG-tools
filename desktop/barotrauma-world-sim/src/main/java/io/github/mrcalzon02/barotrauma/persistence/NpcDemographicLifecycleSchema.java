package io.github.mrcalzon02.barotrauma.persistence;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

/** Schema 027: capacity-supported NPC births, mortality, morale, and demographic hysteresis. */
public final class NpcDemographicLifecycleSchema {
    private NpcDemographicLifecycleSchema() { }

    public static List<String> statements() {
        List<String> statements = new ArrayList<>();
        NpcDemographicLifecycleStructure.appendTo(statements);
        NpcDemographicLifecycleIntegration.appendTo(statements);
        statements.add(NpcDemographicLifecyclePlan.view());
        NpcDemographicLifecycleEvidence.appendTo(statements);
        statements.add(NpcDemographicLifecycleFinalizer.trigger());
        statements.add(StationConsumptionAndFrontierSchema.passiveConsumptionTrigger(
                "UPDATE npc_demographic_tick_baseline SET ready=1 WHERE station_id=NEW.station_id "
                        + "AND tick_sequence=NEW.last_tick"));
        return List.copyOf(statements);
    }

    /** Emits migration statements in a transport-safe form for dependency-free SQL verification. */
    public static void main(String[] args) {
        if (args.length != 1 || !args[0].equals("--base64")) {
            System.err.println("Usage: NpcDemographicLifecycleSchema --base64");
            System.exit(2);
        }
        for (String statement : statements()) {
            System.out.println(Base64.getEncoder().encodeToString(statement.getBytes(StandardCharsets.UTF_8)));
        }
    }
}
