package io.github.mrcalzon02.barotrauma.persistence;

import static io.github.mrcalzon02.barotrauma.persistence.WorldDatabaseMigrationFixture.*;
import static io.github.mrcalzon02.barotrauma.persistence.WorldDatabaseMigrationAssertions.*;
import static io.github.mrcalzon02.barotrauma.persistence.WorldDatabaseMigrations.*;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldLock;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.UUID;

/** Fresh, legacy, and pre-renumber migration verification. */
final class WorldDatabaseMigrationsVerification {
    private WorldDatabaseMigrationsVerification() { }

    static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-schema-upgrade-");
        try {
            verifyFreshWorld(root);
            verifyLegacyWorld(root);
            verifyPreRenumberLocalWorld(root, 15,
                    UUID.fromString("94000000-0000-0000-0000-000000000015"));
            verifyPreRenumberLocalWorld(root, 24,
                    UUID.fromString("94000000-0000-0000-0000-000000000024"));
        } finally {
            deleteTree(root);
        }
    }

    private static void verifyFreshWorld(Path root) throws Exception {
        UUID worldId = UUID.fromString("92000000-0000-0000-0000-000000000001");
        WorldPaths paths = WorldStorageContracts.createWorld(root, "Fresh Europa", worldId);
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths)) { }
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            require(currentVersion(connection) == WorldStorageContracts.DATABASE_SCHEMA_VERSION,
                    "Fresh world did not initialize at the current schema.");
            require(tableExists(connection, "world_location") && tableExists(connection, "simulation_command_receipt"),
                    "Fresh world is missing normalized-world or command-receipt state.");
            require(tableExists(connection, "station_simulation_state") && tableExists(connection, "station_inventory"),
                    "Fresh world is missing passive station or logistics state.");
            require(tableExists(connection, "station_civilization_state")
                            && objectExists(connection, "trigger", "frontier_expansion_mission"),
                    "Fresh world is missing civilization-frontier state.");
            require(tableExists(connection, "location_ecology_state")
                            && tableExists(connection, "resource_extraction_batch"),
                    "Fresh world is missing ecology or finite extraction state.");
            require(tableExists(connection, "fleet_response_transit_leg")
                            && objectExists(connection, "trigger", "fleet_response_responder_returns_home"),
                    "Fresh world is missing response transit or towing completion.");
            verifyObservationObjects(connection, "Fresh world");
            verifyPopulationAccountingObjects(connection, "Fresh world");
            verifyCausalityAndTransitObjects(connection, "Fresh world");
            verifySettlementLifecycleObjects(connection, "Fresh world");
            require(foreignKeyViolations(connection) == 0, "Fresh schema contains foreign-key violations.");
        }
    }

    private static void verifyLegacyWorld(Path root) throws Exception {
        UUID worldId = UUID.fromString("93000000-0000-0000-0000-000000000001");
        UUID artifactId = UUID.fromString("93000000-0000-0000-0000-000000000002");
        WorldPaths paths = WorldStorageContracts.createWorld(root, "Legacy Europa", worldId);
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            try (Statement statement = connection.createStatement()) {
                for (String sql : WorldStorageContracts.initialSchemaStatements()) {
                    if (!sql.trim().toUpperCase().startsWith("PRAGMA ")) statement.execute(sql);
                }
            }
            try (PreparedStatement version = connection.prepareStatement(
                    "INSERT INTO schema_migration(version,applied_at) VALUES(1,?)")) {
                version.setString(1, "2026-07-01T00:00:00Z");
                version.executeUpdate();
            }
            try (PreparedStatement world = connection.prepareStatement(
                    "INSERT INTO world_metadata(world_id,display_name,created_at) VALUES(?,?,?)")) {
                world.setString(1, worldId.toString());
                world.setString(2, "Legacy Europa");
                world.setString(3, "2026-07-01T00:00:00Z");
                world.executeUpdate();
            }
            try (PreparedStatement artifact = connection.prepareStatement(
                    "INSERT INTO import_artifact(artifact_id,sha256,byte_length,source_name,source_kind,inspected_at) VALUES(?,?,7,'legacy.sub','official-submarine',?)")) {
                artifact.setString(1, artifactId.toString());
                artifact.setString(2, "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
                artifact.setString(3, "2026-07-01T00:00:00Z");
                artifact.executeUpdate();
            }
        }
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths)) { }
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            require(currentVersion(connection) == WorldStorageContracts.DATABASE_SCHEMA_VERSION,
                    "Legacy world did not advance to the current schema.");
            require(columnExists(connection, "world_metadata", "source_suite_version"),
                    "Legacy world did not receive normalized-world metadata columns.");
            require(tableExists(connection, "station_civilization_state")
                            && tableExists(connection, "location_ecology_state")
                            && tableExists(connection, "fleet_response_transit_leg"),
                    "Legacy world did not retain the prior passive-world migration chain.");
            verifyObservationObjects(connection, "Legacy world");
            verifyPopulationAccountingObjects(connection, "Legacy world");
            verifyCausalityAndTransitObjects(connection, "Legacy world");
            verifySettlementLifecycleObjects(connection, "Legacy world");
            try (PreparedStatement statement = connection.prepareStatement(
                    "SELECT source_name FROM import_artifact WHERE artifact_id=?")) {
                statement.setString(1, artifactId.toString());
                try (ResultSet result = statement.executeQuery()) {
                    require(result.next() && "legacy.sub".equals(result.getString(1)),
                            "Legacy migration did not preserve schema-001 records.");
                }
            }
            require(count(connection, "observation_snapshot") == 1,
                    "Legacy world did not receive one root observation snapshot.");
            require(foreignKeyViolations(connection) == 0, "Legacy schema contains foreign-key violations.");
        }
    }

    private static void verifyPreRenumberLocalWorld(Path root, int oldVersion, UUID worldId) throws Exception {
        WorldPaths paths = WorldStorageContracts.createWorld(root, "Pre-Renumber " + oldVersion, worldId);
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            try (Statement statement = connection.createStatement()) {
                for (String sql : WorldStorageContracts.initialSchemaStatements()) {
                    if (!sql.trim().toUpperCase().startsWith("PRAGMA ")) statement.execute(sql);
                }
            }
            try (PreparedStatement version = connection.prepareStatement(
                    "INSERT INTO schema_migration(version,applied_at) VALUES(1,?)")) {
                version.setString(1, "2026-07-19T00:00:00Z");
                version.executeUpdate();
            }
            try (PreparedStatement world = connection.prepareStatement(
                    "INSERT INTO world_metadata(world_id,display_name,created_at) VALUES(?,?,?)")) {
                world.setString(1, worldId.toString());
                world.setString(2, "Pre-Renumber " + oldVersion);
                world.setString(3, "2026-07-19T00:00:00Z");
                world.executeUpdate();
            }
            for (int target = 2; target <= 14; target++) {
                applyMigration(connection, target, statementsFor(target), false);
            }
            UUID locationId = UUID.fromString("95000000-0000-0000-0000-000000000001");
            UUID stationId = UUID.fromString("95000000-0000-0000-0000-000000000002");
            seedPreRenumberWorld(connection, worldId, locationId, stationId);
            for (int target = 15; target <= oldVersion; target++) {
                applyMigration(connection, target, preRenumberLocalStatements(target), false);
            }
            try (Statement statement = connection.createStatement()) {
                statement.executeUpdate("INSERT INTO station_event(event_id,world_id,station_id,tick_sequence,"
                        + "canonical_time,event_type,severity,headline,narrative,cause_type,deterministic_key,"
                        + "visibility,correlation_id,policy_version,created_at) VALUES ('pre-renumber-event-"
                        + oldVersion + "','" + worldId + "','" + stationId
                        + "',42,'2175-01-01T00:42:00Z','ACCIDENT',1,'Preserved development event',"
                        + "'This causal record must survive schema renumbering.','TEST','pre-renumber:"
                        + oldVersion + "','OBSERVED','pre-renumber:" + oldVersion
                        + "',1,'2026-07-19T00:00:00Z')");
            }
            require(tableExists(connection, "station_event") && !tableExists(connection, "npc_population_state"),
                    "Pre-renumber fixture does not represent the old local schema chain.");
        }

        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths)) { }
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            require(currentVersion(connection) == WorldStorageContracts.DATABASE_SCHEMA_VERSION,
                    "Pre-renumber schema " + oldVersion + " did not advance to the current schema.");
            verifyObservationObjects(connection, "Pre-renumber schema " + oldVersion);
            verifyPopulationAccountingObjects(connection, "Pre-renumber schema " + oldVersion);
            verifyCausalityAndTransitObjects(connection, "Pre-renumber schema " + oldVersion);
            verifySettlementLifecycleObjects(connection, "Pre-renumber schema " + oldVersion);
            require(count(connection, "station_event") >= 1,
                    "Pre-renumber schema " + oldVersion + " lost causal station records.");
            require(count(connection, "npc_population_state") == 1
                            && count(connection, "npc_population_reconciliation") == 1,
                    "Pre-renumber schema " + oldVersion
                            + " did not seed observation population and reconciliation state.");
            require(count(connection, "station_population_state") == 1,
                    "Pre-renumber schema " + oldVersion + " did not preserve authoritative station population state.");
            require(migrationVersionCount(connection, 15, WorldStorageContracts.DATABASE_SCHEMA_VERSION)
                            == WorldStorageContracts.DATABASE_SCHEMA_VERSION - 14,
                    "Pre-renumber schema " + oldVersion + " did not receive complete canonical migration history.");
            require(foreignKeyViolations(connection) == 0,
                    "Pre-renumber schema " + oldVersion + " created foreign-key violations.");
        }
    }
}
