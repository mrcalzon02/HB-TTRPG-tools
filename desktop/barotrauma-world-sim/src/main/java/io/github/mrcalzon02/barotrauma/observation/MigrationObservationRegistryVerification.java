package io.github.mrcalzon02.barotrauma.observation;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.Comparator;
import java.util.UUID;

/** Query-only schema-028 migration-flow and conservation projection contract. */
public final class MigrationObservationRegistryVerification {
    private MigrationObservationRegistryVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-migration-observation-");
        try {
            UUID worldId = UUID.fromString("28100000-0000-0000-0000-000000000001");
            WorldPaths world = WorldStorageContracts.createWorld(root, "Migration Observation", worldId);
            createFixture(world, worldId);

            var rows = ObservationRegistry.migrationFlows(world, -1, 20);
            require(rows.size() == 1, "Migration Registry did not return its schema-028 flow.");
            var row = rows.get(0);
            require(row.flowKind().equals("REFUGEE_EVACUATION") && row.status().equals("IN_TRANSIT"),
                    "Migration Registry lost flow kind or lifecycle status.");
            require(row.quantity() == 80 && row.embarked() == 80 && row.arrived() == 0
                            && row.losses() == 0 && row.stranded() == 0,
                    "Migration Registry lost conserved flow quantities.");
            require(row.transportName().equals("Tender Vigil") && row.progressTicks() == 2
                            && row.durationTicks() == 5,
                    "Migration Registry lost transport or progress evidence.");
            require(ObservationRegistry.migrationFlows(world, 43, 20).isEmpty(),
                    "Migration changed-since query returned stale flow evidence.");
            expectFailure(() -> ObservationRegistry.migrationFlows(world, -2, 20),
                    "Migration Registry accepted an invalid changed-since tick.");
            expectFailure(() -> ObservationRegistry.migrationFlows(world, -1, 0),
                    "Migration Registry accepted an invalid result limit.");

            var conservation = ObservationRegistry.migrationConservation(world);
            require(conservation.stationPopulation() == 1_320
                            && conservation.populationInFlows() == 80
                            && conservation.recordedMigrationLosses() == 5
                            && conservation.accountedPopulation() == 1_405,
                    "Migration Registry lost world-level conservation evidence.");

            try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + world.database());
                 Statement statement = connection.createStatement()) {
                statement.execute("UPDATE schema_migration SET version=27");
            }
            expectFailure(() -> ObservationRegistry.migrationFlows(world, -1, 20),
                    "Migration Registry accepted a pre-schema-028 world.");
        } finally {
            try (var stream = Files.walk(root)) {
                for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    private static void createFixture(WorldPaths world, UUID worldId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + world.database());
             Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE schema_migration(version INTEGER PRIMARY KEY,applied_at TEXT)");
            statement.execute("INSERT INTO schema_migration VALUES(28,'2026-07-20T00:00:00Z')");
            statement.execute("CREATE VIEW observation_world_summary AS SELECT '" + worldId
                    + "' world_id,'Migration Observation' display_name,0 npc_populations,0 npc_population_total,"
                    + "0 creature_populations,0 creature_estimated_total,0 faction_presences,0 observation_events");
            statement.execute("CREATE VIEW npc_population_observation AS SELECT NULL population_id,NULL station_id,"
                    + "NULL station_name,0 civilians,0 industrial_workers,0 logistics_workers,0 security_personnel,"
                    + "0 medical_personnel,0 scientific_personnel,0 temporary_residents,0 refugees,0 total_population,"
                    + "0 housing_capacity,0 life_support_capacity,0 employment_capacity,0 morale,0 last_tick WHERE 0");
            statement.execute("CREATE VIEW npc_population_accounting_observation AS SELECT NULL ledger_id,NULL population_id,"
                    + "NULL station_id,NULL station_name,0 tick_sequence,0 before_total,0 births,0 deaths,0 immigration,"
                    + "0 emigration,0 disaster_losses,0 other_gains,0 other_losses,0 after_total,0 housing_capacity,"
                    + "0 life_support_capacity,0 employment_capacity,0 morale,0 population_index_before,"
                    + "0 population_index_after,NULL primary_cause,NULL evidence_key,NULL summary,0 baseline_population_per_index,"
                    + "NULL reconciliation_status WHERE 0");
            statement.execute("CREATE VIEW creature_population_observation AS SELECT NULL population_id,NULL location_id,"
                    + "NULL location_name,NULL species_key,NULL population_class,0 estimated_count,0 biomass,0 health,"
                    + "0 food_stress,0 habitat_support,0 migration_pressure,0 observation_confidence,NULL territory_status,"
                    + "0 territory_pressure,0 nest_strength,0 last_tick WHERE 0");
            statement.execute("CREATE VIEW npc_population_flow_observation AS SELECT "
                    + "'flow-1' flow_id,'" + worldId + "' world_id,'NPC_POPULATION' entity_type,'origin-pop' population_id,"
                    + "'destination-pop' destination_population_id,'REFUGEE_EVACUATION' flow_kind,'IN_TRANSIT' status,"
                    + "'EVACUATION' cause,80 quantity,0 reserved_quantity,80 embarked_quantity,0 arrived_quantity,"
                    + "0 returned_quantity,0 losses,0 stranded_quantity,1 transport_units_required,100 transport_capacity,"
                    + "'vessel-1' assigned_npc_vessel_id,'Tender Vigil' transport_name,'leg-1' transit_leg_id,"
                    + "'origin-station' origin_station_id,'Origin Nadir' origin_station_name,'destination-station' destination_station_id,"
                    + "'Haven Station' destination_station_name,'origin-location' origin_location_id,'Origin Shelf' origin_location_name,"
                    + "'destination-location' destination_location_id,'Haven Shelf' destination_location_name,40 preparation_started_tick,"
                    + "41 departure_tick,NULL arrival_tick,NULL return_tick,2 progress_ticks,5 duration_ticks,39 created_tick,"
                    + "43 updated_tick,NULL failure_reason,'Protected evacuation convoy' summary");
            statement.execute("CREATE VIEW npc_population_migration_conservation AS SELECT '" + worldId
                    + "' world_id,1320 station_population,80 population_in_flows,5 recorded_migration_losses");
        }
    }

    private static void expectFailure(ThrowingRunnable action, String message) throws Exception {
        try { action.run(); }
        catch (IllegalArgumentException | java.sql.SQLException expected) { return; }
        throw new IllegalStateException(message);
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    @FunctionalInterface
    private interface ThrowingRunnable { void run() throws Exception; }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Query-only schema-028 migration flow, changed-since, limits, transport evidence, and conservation projection passed.");
    }
}
