package io.github.mrcalzon02.barotrauma.observation;

import io.github.mrcalzon02.barotrauma.persistence.SettlementContributionDispositionSchema;
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

/** Query-only contract for schema-031 returned, stranded, consumed, and lost contribution evidence. */
public final class SettlementContributionDispositionObservationRegistryVerification {
    private SettlementContributionDispositionObservationRegistryVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-disposition-observation-");
        try {
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Disposition Observation",
                    UUID.fromString("99200000-0000-0000-0000-000000000001"));
            createFixture(paths);
            String before = fingerprint(paths);

            var all = ObservationRegistry.settlementContributionDispositions(paths, -1, 10);
            require(all.size() == 2, "Disposition observation did not return both classifications.");
            var lost = all.get(0);
            require(lost.dispositionId().equals("disposition-lost")
                            && lost.projectId().equals("project-failed")
                            && lost.projectKind().equals("RECLAMATION")
                            && lost.projectStatus().equals("FAILED")
                            && lost.contributionKind().equals("TRANSPORT")
                            && lost.disposition().equals("LOST")
                            && lost.quantity() == 1
                            && lost.tickSequence() == 30,
                    "Lost transport disposition lifecycle fields are incorrect.");
            require("vessel-a".equals(lost.sourceVesselId())
                            && "Builder One".equals(lost.sourceVesselName())
                            && "transport-lost".equals(lost.evidenceKey()),
                    "Lost transport disposition source or evidence fields are incorrect.");

            var returned = all.get(1);
            require(returned.dispositionId().equals("disposition-returned")
                            && returned.projectId().equals("project-cancelled")
                            && returned.projectStatus().equals("CANCELLED")
                            && returned.contributionKind().equals("MATERIALS")
                            && returned.disposition().equals("RETURNED")
                            && returned.quantity() == 10
                            && returned.tickSequence() == 20,
                    "Returned material disposition lifecycle fields are incorrect.");
            require("station-a".equals(returned.sourceStationId())
                            && "Alpha Station".equals(returned.sourceStationName())
                            && "materials-returned".equals(returned.evidenceKey()),
                    "Returned material disposition source or evidence fields are incorrect.");

            var changed = ObservationRegistry.settlementContributionDispositions(paths, 20, 10);
            require(changed.size() == 1 && changed.get(0).dispositionId().equals("disposition-lost"),
                    "Disposition changed-since filtering is incorrect.");
            var limited = ObservationRegistry.settlementContributionDispositions(paths, -1, 1);
            require(limited.size() == 1 && limited.get(0).dispositionId().equals("disposition-lost"),
                    "Disposition observation result limit is incorrect.");
            reject(() -> ObservationRegistry.settlementContributionDispositions(paths, -2, 10),
                    IllegalArgumentException.class, "changedSinceTick");
            reject(() -> ObservationRegistry.settlementContributionDispositions(paths, -1, 0),
                    IllegalArgumentException.class, "limit");
            require(before.equals(fingerprint(paths)),
                    "Query-only disposition observation mutated durable project evidence.");

            try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
                 Statement statement = connection.createStatement()) {
                statement.executeUpdate("DELETE FROM schema_migration WHERE version=31");
            }
            reject(() -> ObservationRegistry.settlementContributionDispositions(paths, -1, 10),
                    SQLException.class, "requires schema 031");
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
            statement.execute("INSERT INTO schema_migration VALUES(31,'2026-07-21T00:01:00Z')");
            statement.execute("CREATE TABLE world_metadata(world_id TEXT PRIMARY KEY,display_name TEXT,canonical_time TEXT)");
            statement.execute("CREATE TABLE world_simulation_metadata(world_id TEXT PRIMARY KEY,current_tick_sequence INTEGER,imported_tick_sequence INTEGER)");
            statement.execute("CREATE TABLE world_location(location_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,display_name TEXT NOT NULL,is_station INTEGER NOT NULL DEFAULT 0)");
            statement.execute("CREATE TABLE world_station(station_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,location_id TEXT NOT NULL,display_name TEXT NOT NULL)");
            statement.execute("CREATE TABLE npc_population_state(population_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,station_id TEXT NOT NULL)");
            statement.execute("CREATE TABLE npc_vessel(npc_vessel_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,display_name TEXT NOT NULL)");
            statement.execute("CREATE TABLE population_flow(flow_id TEXT PRIMARY KEY,world_id TEXT NOT NULL)");
            statement.execute("CREATE TABLE station_change_reason(reason_code TEXT PRIMARY KEY,display_name TEXT NOT NULL,reason_family TEXT NOT NULL)");
            statement.execute("CREATE TABLE npc_population_ledger(ledger_id TEXT PRIMARY KEY,world_id TEXT NOT NULL)");
            statement.execute("CREATE TABLE settlement_project(project_id TEXT PRIMARY KEY,world_id TEXT NOT NULL,project_kind TEXT NOT NULL,status TEXT NOT NULL)");
            statement.execute("CREATE TABLE settlement_project_contribution(contribution_id TEXT PRIMARY KEY,project_id TEXT NOT NULL,world_id TEXT NOT NULL,contribution_kind TEXT NOT NULL,quantity INTEGER NOT NULL,source_station_id TEXT,source_population_id TEXT,source_npc_vessel_id TEXT,related_flow_id TEXT,tick_sequence INTEGER NOT NULL,evidence_key TEXT NOT NULL,summary TEXT NOT NULL)");
            statement.execute("CREATE VIEW observation_world_summary AS SELECT 'world-1' world_id,'Disposition World' display_name,0 npc_populations,0 npc_population_total,0 creature_populations,0 creature_estimated_total,0 faction_presences,0 observation_events");
            statement.execute("CREATE VIEW npc_population_observation AS SELECT '' population_id,'' station_id,'' station_name,0 civilians,0 industrial_workers,0 logistics_workers,0 security_personnel,0 medical_personnel,0 scientific_personnel,0 temporary_residents,0 refugees,0 total_population,0 housing_capacity,0 life_support_capacity,0 employment_capacity,0 morale,0 last_tick WHERE 0");
            statement.execute("CREATE VIEW npc_population_accounting_observation AS SELECT '' ledger_id,'' population_id,'' station_id,'' station_name,0 tick_sequence,0 before_total,0 births,0 deaths,0 immigration,0 emigration,0 disaster_losses,0 other_gains,0 other_losses,0 after_total,0 housing_capacity,0 life_support_capacity,0 employment_capacity,0 morale,0 population_index_before,0 population_index_after,'' primary_cause,'' evidence_key,'' summary,0.0 baseline_population_per_index,'' reconciliation_status WHERE 0");
            statement.execute("CREATE VIEW creature_population_observation AS SELECT '' population_id,'' location_id,'' location_name,'' species_key,'' population_class,0 estimated_count,0 biomass,0 health,0 food_stress,0 habitat_support,0 migration_pressure,0 observation_confidence,'' territory_status,0 territory_pressure,0 nest_strength,0 last_tick WHERE 0");
            for (String sql : SettlementContributionDispositionSchema.statements()) statement.execute(sql);

            statement.execute("INSERT INTO world_metadata VALUES('world-1','Disposition World','2175-01-01T00:00:00Z')");
            statement.execute("INSERT INTO world_simulation_metadata VALUES('world-1',40,0)");
            statement.execute("INSERT INTO world_location VALUES('location-a','world-1','Alpha',1)");
            statement.execute("INSERT INTO world_station VALUES('station-a','world-1','location-a','Alpha Station')");
            statement.execute("INSERT INTO npc_population_state VALUES('population-a','world-1','station-a')");
            statement.execute("INSERT INTO npc_vessel VALUES('vessel-a','world-1','Builder One')");
            statement.execute("INSERT INTO settlement_project VALUES('project-cancelled','world-1','EXPANSION','ACTIVE')");
            statement.execute("INSERT INTO settlement_project VALUES('project-failed','world-1','RECLAMATION','ACTIVE')");
            statement.execute("INSERT INTO settlement_project_contribution VALUES('contribution-materials','project-cancelled','world-1','MATERIALS',10,'station-a',NULL,NULL,NULL,10,'materials','Materials committed')");
            statement.execute("INSERT INTO settlement_project_contribution VALUES('contribution-transport','project-failed','world-1','TRANSPORT',1,'station-a',NULL,'vessel-a',NULL,15,'transport','Transport committed')");
            statement.execute("INSERT INTO settlement_project_contribution_disposition VALUES('disposition-returned','contribution-materials','project-cancelled','world-1','MATERIALS','RETURNED',10,20,'materials-returned','Materials returned to origin')");
            statement.execute("INSERT INTO settlement_project_contribution_disposition VALUES('disposition-lost','contribution-transport','project-failed','world-1','TRANSPORT','LOST',1,30,'transport-lost','Transport lost during project failure')");
            statement.execute("UPDATE settlement_project SET status='CANCELLED' WHERE project_id='project-cancelled'");
            statement.execute("UPDATE settlement_project SET status='FAILED' WHERE project_id='project-failed'");
        }
    }

    private static String fingerprint(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery(
                     "SELECT (SELECT COUNT(*) FROM settlement_project_contribution_disposition)||':'||"
                             + "(SELECT SUM(quantity+tick_sequence) FROM settlement_project_contribution_disposition)||':'||"
                             + "(SELECT group_concat(project_id||':'||status,'|') FROM (SELECT project_id,status FROM settlement_project ORDER BY project_id))")) {
            if (!result.next()) throw new IllegalStateException("Disposition observation fingerprint is empty.");
            return result.getString(1);
        }
    }

    private static void reject(ThrowingWork work, Class<? extends Throwable> type, String expected) throws Exception {
        try {
            work.run();
            throw new IllegalStateException("Expected disposition observation rejection containing: " + expected);
        } catch (Throwable failure) {
            if (failure instanceof IllegalStateException
                    && failure.getMessage().startsWith("Expected disposition observation")) {
                throw (IllegalStateException) failure;
            }
            require(type.isInstance(failure), "Unexpected disposition observation rejection type: " + failure);
            require(failure.getMessage() != null && failure.getMessage().contains(expected),
                    "Unexpected disposition observation rejection: " + failure.getMessage());
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    @FunctionalInterface
    private interface ThrowingWork { void run() throws Exception; }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Query-only settlement contribution disposition observation contracts passed.");
    }
}
