package io.github.mrcalzon02.barotrauma.persistence;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import java.util.Comparator;

/** End-to-end contract for the current-schema deterministic default Europa world. */
public final class DefaultWorldGeneratorVerification {
    private DefaultWorldGeneratorVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-default-world-");
        try {
            DefaultWorldGenerator.GeneratedWorld generated =
                    DefaultWorldGenerator.create(root, "Generated Europa Contract");
            require(generated.schemaVersion() == WorldStorageContracts.DATABASE_SCHEMA_VERSION,
                    "Generated world did not use the current schema.");
            require(generated.locationCount() == DefaultWorldGenerator.EXPECTED_LOCATIONS
                            && generated.stationCount() == DefaultWorldGenerator.EXPECTED_STATIONS,
                    "Generated world topology changed.");
            require(generated.stationStateCount() == generated.stationCount()
                            && generated.detailedPopulationCount() == generated.stationCount()
                            && generated.aggregatePopulationCount() == generated.stationCount(),
                    "Generated world did not initialize every station and population authority.");
            require(generated.ecologyLocationCount() == generated.locationCount()
                            && generated.geologyLocationCount() == generated.locationCount(),
                    "Generated world did not initialize ecology and geology for every location.");
            require(generated.organizationCount() >= 50
                            && generated.sovereignFactionCount() >= 2
                            && generated.lockedHeadquartersCount() == generated.sovereignFactionCount(),
                    "Generated world did not initialize the expanded faction and institution ecology.");
            require(generated.alignedInstitutionCount() >= 20,
                    "Generated world did not align its headquartered institutions to sovereign factions.");
            require(generated.organizationOperationCount() >= generated.stationCount()
                            && generated.organizationNewsCount() >= generated.stationCount(),
                    "Generated world passive initialization did not produce institutional activity and observer news.");
            require(generated.initializedTick() >= 1 && generated.schedulerState().equals("PAUSED"),
                    "Generated world did not finish one canonical initialization tick in a paused state.");

            try (Connection connection = DriverManager.getConnection(
                    "jdbc:sqlite:" + generated.paths().database());
                 Statement statement = connection.createStatement()) {
                require(objectExists(statement, "table", "npc_demographic_state")
                                && objectExists(statement, "table", "population_flow")
                                && objectExists(statement, "table", "settlement_project")
                                && objectExists(statement, "table", "settlement_founding_handoff")
                                && objectExists(statement, "table", "settlement_project_contribution_disposition")
                                && objectExists(statement, "table", "world_observation_event")
                                && objectExists(statement, "table", "world_organization")
                                && objectExists(statement, "table", "organization_operation")
                                && objectExists(statement, "table", "organization_station_asset")
                                && objectExists(statement, "table", "organization_news_event")
                                && objectExists(statement, "table", "station_control_challenge"),
                        "Generated world is missing a current-system persistence authority.");
                require(objectExists(statement, "view", "organization_ecology_observation")
                                && objectExists(statement, "view", "station_political_observation")
                                && objectExists(statement, "view", "organization_operation_observation")
                                && objectExists(statement, "view", "organization_station_asset_observation")
                                && objectExists(statement, "view", "regional_conflict_observation"),
                        "Generated world is missing organization observer projections.");
                require(scalar(statement, "SELECT COUNT(*) FROM observation_snapshot") > 0,
                        "Generated world did not retain its initialization observation snapshot.");
                require(scalar(statement, "SELECT COUNT(*) FROM organization_operation_observation")
                                == generated.organizationOperationCount(),
                        "Organization operation observer view does not expose every generated operation.");
                require(scalar(statement, "SELECT COUNT(*) FROM organization_news_event")
                                == generated.organizationNewsCount(),
                        "Organization news count changed between generation and inspection.");
                require(foreignKeyViolations(statement) == 0,
                        "Generated world contains foreign-key violations.");
            }
        } finally {
            try (var stream = Files.walk(root)) {
                for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    private static boolean objectExists(Statement statement, String type, String name) throws Exception {
        String safeType = type.replace("'", "''");
        String safeName = name.replace("'", "''");
        try (ResultSet result = statement.executeQuery(
                "SELECT 1 FROM sqlite_master WHERE type='" + safeType + "' AND name='" + safeName + "'")) {
            return result.next();
        }
    }

    private static long scalar(Statement statement, String sql) throws Exception {
        try (ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new IllegalStateException("Expected generated-world scalar row.");
            return result.getLong(1);
        }
    }

    private static long foreignKeyViolations(Statement statement) throws Exception {
        long count = 0;
        try (ResultSet result = statement.executeQuery("PRAGMA foreign_key_check")) {
            while (result.next()) count++;
        }
        return count;
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Current-schema default Europa world generation passed.");
    }
}
