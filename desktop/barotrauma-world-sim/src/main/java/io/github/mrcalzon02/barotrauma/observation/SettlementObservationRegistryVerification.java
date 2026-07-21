package io.github.mrcalzon02.barotrauma.observation;

import io.github.mrcalzon02.barotrauma.persistence.SettlementLifecycleSchema;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Comparator;
import java.util.UUID;

/** Query-only contract for schema-029 settlement project observations. */
public final class SettlementObservationRegistryVerification {
    private SettlementObservationRegistryVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-settlement-observation-");
        try {
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Settlement Observation",
                    UUID.fromString("99000000-0000-0000-0000-000000000001"));
            createFixture(paths);
            String before = fingerprint(paths);

            var all = ObservationRegistry.settlementProjects(paths, -1, 10);
            require(all.size() == 2, "Settlement observation did not return both projects.");
            var newest = all.get(0);
            require(newest.projectId().equals("project-2") && newest.projectKind().equals("RECLAMATION")
                            && newest.status().equals("ACTIVE"),
                    "Settlement observation ordering or lifecycle fields are incorrect.");
            require(newest.requiredMaterials() == 80 && newest.committedMaterials() == 80
                            && newest.requiredPopulation() == 30 && newest.committedPopulation() == 30,
                    "Settlement observation commitment fields are incorrect.");
            require(newest.progressUnits() == 12 && newest.targetProgressUnits() == 24
                            && newest.progressPercent() == 50,
                    "Settlement observation progress projection is incorrect.");
            require(newest.preparationStartedTick() == 21 && newest.activatedTick() == 22
                            && newest.completedTick() == null,
                    "Settlement observation nullable timing fields are incorrect.");

            var changed = ObservationRegistry.settlementProjects(paths, 20, 10);
            require(changed.size() == 1 && changed.get(0).projectId().equals("project-2"),
                    "Settlement changed-since filtering is incorrect.");
            var limited = ObservationRegistry.settlementProjects(paths, -1, 1);
            require(limited.size() == 1 && limited.get(0).projectId().equals("project-2"),
                    "Settlement observation result limit is incorrect.");
            reject(() -> ObservationRegistry.settlementProjects(paths, -2, 10),
                    IllegalArgumentException.class, "changedSinceTick");
            reject(() -> ObservationRegistry.settlementProjects(paths, -1, 0),
                    IllegalArgumentException.class, "limit");
            require(before.equals(fingerprint(paths)),
                    "Query-only settlement observation mutated durable project state.");

            try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
                 Statement statement = connection.createStatement()) {
                statement.executeUpdate("DELETE FROM schema_migration WHERE version=29");
            }
            reject(() -> ObservationRegistry.settlementProjects(paths, -1, 10),
                    SQLException.class, "requires schema 029");
        } finally {
            try (var stream = Files.walk(root)) {
                for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    private static void createFixture(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("CREATE TABLE schema_migration(version INTEGER PRIMARY KEY,applied_at TEXT NOT NULL)");
            statement.execute("INSERT INTO schema_migration VALUES(16,'2026-07-21T00:00:00Z')");
            statement.execute("INSERT INTO schema_migration VALUES(29,'2026-07-21T00:01:00Z')");
            statement.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY,display_name TEXT,canonical_time TEXT)");
            statement.execute("CREATE TABLE world_simulation_metadata(world_id TEXT PRIMARY KEY,current_tick_sequence INTEGER,imported_tick_sequence INTEGER)");
            statement.execute("CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,display_name TEXT NOT NULL,is_station INTEGER NOT NULL DEFAULT 0)");
            statement.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,location_id TEXT NOT NULL,display_name TEXT NOT NULL)");
            statement.execute("CREATE TABLE npc_population_state(population_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,station_id TEXT NOT NULL)");
            statement.execute("CREATE TABLE npc_vessel(npc_vessel_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,display_name TEXT NOT NULL)");
            statement.execute("CREATE TABLE population_flow(flow_id TEXT PRIMARY KEY,world_id TEXT NOT NULL)");
            statement.execute("CREATE TABLE station_change_reason(reason_code TEXT PRIMARY KEY,display_name TEXT NOT NULL,reason_family TEXT NOT NULL)");
            statement.execute("CREATE TABLE npc_population_ledger(ledger_id TEXT PRIMARY KEY,world_id TEXT NOT NULL)");
            statement.execute("CREATE VIEW observation_world_summary AS SELECT 'world-1' world_id,'Settlement World' display_name,0 npc_populations,0 npc_population_total,0 creature_populations,0 creature_estimated_total,0 faction_presences,0 observation_events");
            statement.execute("CREATE VIEW npc_population_observation AS SELECT '' population_id,'' station_id,'' station_name,0 civilians,0 industrial_workers,0 logistics_workers,0 security_personnel,0 medical_personnel,0 scientific_personnel,0 temporary_residents,0 refugees,0 total_population,0 housing_capacity,0 life_support_capacity,0 employment_capacity,0 morale,0 last_tick WHERE 0");
            statement.execute("CREATE VIEW npc_population_accounting_observation AS SELECT '' ledger_id,'' population_id,'' station_id,'' station_name,0 tick_sequence,0 before_total,0 births,0 deaths,0 immigration,0 emigration,0 disaster_losses,0 other_gains,0 other_losses,0 after_total,0 housing_capacity,0 life_support_capacity,0 employment_capacity,0 morale,0 population_index_before,0 population_index_after,'' primary_cause,'' evidence_key,'' summary,0.0 baseline_population_per_index,'' reconciliation_status WHERE 0");
            statement.execute("CREATE VIEW creature_population_observation AS SELECT '' population_id,'' location_id,'' location_name,'' species_key,'' population_class,0 estimated_count,0 biomass,0 health,0 food_stress,0 habitat_support,0 migration_pressure,0 observation_confidence,'' territory_status,0 territory_pressure,0 nest_strength,0 last_tick WHERE 0");
            for (String sql : SettlementLifecycleSchema.statements()) statement.execute(sql);
            statement.execute("INSERT INTO world_metadata VALUES('world-1','Settlement World','2175-01-01T00:00:00Z')");
            statement.execute("INSERT INTO world_simulation_metadata VALUES('world-1',30,0)");
            statement.execute("INSERT INTO world_location VALUES('location-a','world-1','Alpha',1)");
            statement.execute("INSERT INTO world_location VALUES('location-b','world-1','Beta',0)");
            statement.execute("INSERT INTO world_station VALUES('station-a','world-1','location-a','Alpha Station')");
            statement.execute("INSERT INTO npc_population_state VALUES('population-a','world-1','station-a')");
            statement.execute("INSERT INTO npc_vessel VALUES('vessel-a','world-1','Builder One')");
            statement.execute("INSERT INTO settlement_project(project_id,world_id,project_kind,status,origin_station_id,target_station_id,target_location_id,related_population_id,assigned_npc_vessel_id,required_material_units,committed_material_units,required_supply_units,committed_supply_units,required_population,committed_population,required_transport_units,committed_transport_units,required_security,current_security,progress_units,target_progress_units,created_tick,preparation_started_tick,activated_tick,completed_tick,updated_tick,summary) VALUES('project-1','world-1','EXPANSION','COMPLETE','station-a','station-a','location-a','population-a','vessel-a',20,20,10,10,10,10,1,1,40,60,8,8,10,11,12,20,20,'Completed expansion')");
            statement.execute("INSERT INTO settlement_project(project_id,world_id,project_kind,status,sponsor_faction,origin_station_id,target_location_id,related_population_id,assigned_npc_vessel_id,required_material_units,committed_material_units,required_supply_units,committed_supply_units,required_population,committed_population,required_transport_units,committed_transport_units,required_security,current_security,progress_units,target_progress_units,created_tick,preparation_started_tick,activated_tick,updated_tick,summary) VALUES('project-2','world-1','RECLAMATION','ACTIVE','Coalition','station-a','location-b','population-a','vessel-a',80,80,60,60,30,30,1,1,70,80,12,24,20,21,22,30,'Active reclamation')");
            statement.execute("INSERT INTO settlement_project_contribution VALUES('contribution-1','project-2','world-1','MATERIALS',80,'station-a',NULL,NULL,NULL,21,'materials','Delivered materials')");
            statement.execute("INSERT INTO settlement_project_transition VALUES('transition-1','project-2','world-1','PREPARING','ACTIVE',22,0,'activated','Project activated')");
        }
    }

    private static String fingerprint(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery(
                     "SELECT (SELECT COUNT(*) FROM settlement_project)||':'||"
                             + "(SELECT SUM(updated_tick+progress_units) FROM settlement_project)||':'||"
                             + "(SELECT COUNT(*) FROM settlement_project_contribution)||':'||"
                             + "(SELECT COUNT(*) FROM settlement_project_transition)")) {
            if (!result.next()) throw new IllegalStateException("Settlement observation fingerprint is empty.");
            return result.getString(1);
        }
    }

    private static void reject(ThrowingWork work, Class<? extends Throwable> type, String expected) throws Exception {
        try {
            work.run();
            throw new IllegalStateException("Expected settlement observation rejection containing: " + expected);
        } catch (Throwable failure) {
            if (failure instanceof IllegalStateException && failure.getMessage().startsWith("Expected settlement")) {
                throw (IllegalStateException) failure;
            }
            require(type.isInstance(failure), "Unexpected settlement observation rejection type: " + failure);
            require(failure.getMessage() != null && failure.getMessage().contains(expected),
                    "Unexpected settlement observation rejection: " + failure.getMessage());
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    @FunctionalInterface
    private interface ThrowingWork { void run() throws Exception; }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Query-only settlement project observation contracts passed.");
    }
}
