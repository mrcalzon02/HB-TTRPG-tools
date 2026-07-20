package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldLock;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

/** Applies the complete forward-only desktop world migration chain while the filesystem lock is held. */
final class WorldDatabaseMigrations {
    private WorldDatabaseMigrations() { }

    static void migrateExistingDatabase(WorldPaths paths) throws IOException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) {
            if (!Files.exists(paths.database())) return;
            throw new IOException("The SQLite JDBC driver is required to migrate this desktop world.", exception);
        }
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            int version = initializeIfNeeded(connection);
            version = bridgePreRenumberLocalSchema(connection, version);
            if (version > WorldStorageContracts.DATABASE_SCHEMA_VERSION) {
                throw new SQLException("World database schema " + version + " is newer than supported schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + ".");
            }
            while (version < WorldStorageContracts.DATABASE_SCHEMA_VERSION && version > 0) {
                int target = version + 1;
                applyMigration(connection, target, statementsFor(target), false);
                version = target;
            }
        } catch (SQLException exception) {
            throw new IOException("Desktop world database migration failed: " + exception.getMessage(), exception);
        }
    }

    private static int initializeIfNeeded(Connection connection) throws SQLException {
        if (tableExists(connection, "schema_migration")) return currentVersion(connection);
        try (Statement statement = connection.createStatement()) {
            statement.execute("CREATE TABLE schema_migration (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)");
        }
        applyMigration(connection, 1, WorldStorageContracts.initialSchemaStatements(), true);
        return 1;
    }

    private static List<String> statementsFor(int targetVersion) throws SQLException {
        return switch (targetVersion) {
            case 2 -> WorldStorageContracts.schema002Statements();
            case 3 -> WorldStorageContracts.schema003Statements();
            case 4 -> WorldStorageContracts.schema004Statements();
            case 5 -> WorldStorageContracts.schema005Statements();
            case 6 -> WorldStorageContracts.schema006Statements();
            case 7 -> WorldStorageContracts.schema007Statements();
            case 8 -> WorldStorageContracts.schema008Statements();
            case 9 -> WorldStorageContracts.schema009Statements();
            case 10 -> WorldStorageContracts.schema010Statements();
            case 11 -> WorldStorageContracts.schema011Statements();
            case 12 -> WorldStorageContracts.schema012Statements();
            case 13 -> WorldStorageContracts.schema013Statements();
            case 14 -> WorldStorageContracts.schema014Statements();
            case 15 -> WorldStorageContracts.schema015Statements();
            case 16 -> WorldStorageContracts.schema016Statements();
            case 17 -> WorldStorageContracts.schema017Statements();
            case 18 -> WorldStorageContracts.schema018Statements();
            case 19 -> WorldStorageContracts.schema019Statements();
            case 20 -> WorldStorageContracts.schema020Statements();
            case 21 -> WorldStorageContracts.schema021Statements();
            case 22 -> WorldStorageContracts.schema022Statements();
            case 23 -> WorldStorageContracts.schema023Statements();
            case 24 -> WorldStorageContracts.schema024Statements();
            case 25 -> WorldStorageContracts.schema025Statements();
            case 26 -> WorldStorageContracts.schema026Statements();
            default -> throw new SQLException("No forward migration is defined for schema " + targetVersion + ".");
        };
    }

    private static int bridgePreRenumberLocalSchema(Connection connection, int version) throws SQLException {
        if (version < 15 || version > 24
                || !tableExists(connection, "station_event")
                || tableExists(connection, "npc_population_state")) {
            return version;
        }

        int remappedVersion = version + 2;
        boolean originalAutoCommit = connection.getAutoCommit();
        connection.setAutoCommit(false);
        try (Statement statement = connection.createStatement()) {
            executeStatements(statement, WorldStorageContracts.schema015Statements());
            executeStatements(statement, WorldStorageContracts.schema016Statements());
            statement.executeUpdate("DELETE FROM schema_migration WHERE version >= 15");
            try (PreparedStatement insert = connection.prepareStatement(
                    "INSERT INTO schema_migration(version,applied_at) VALUES(?,?)")) {
                String appliedAt = Instant.now().toString();
                for (int migratedVersion = 15; migratedVersion <= remappedVersion; migratedVersion++) {
                    insert.setInt(1, migratedVersion);
                    insert.setString(2, appliedAt);
                    insert.addBatch();
                }
                insert.executeBatch();
            }
            connection.commit();
            return remappedVersion;
        } catch (SQLException exception) {
            try { connection.rollback(); }
            catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
            throw exception;
        } finally {
            connection.setAutoCommit(originalAutoCommit);
        }
    }

    private static void executeStatements(Statement statement, List<String> statements) throws SQLException {
        for (String sql : statements) {
            if (!sql.trim().toUpperCase().startsWith("PRAGMA ")) statement.execute(sql);
        }
    }

    private static List<String> preRenumberLocalStatements(int oldVersion) throws SQLException {
        return switch (oldVersion) {
            case 15 -> StationCausalitySchema.statements();
            case 16 -> StationConsumptionCausalitySchema.statements();
            case 17 -> StationProductionCausalitySchema.statements();
            case 18 -> StationDeliveryCausalitySchema.statements();
            case 19 -> StationFrontierCausalitySchema.statements();
            case 20 -> StationPopulationCausalitySchema.statements();
            case 21 -> FactionPlanCausalitySchema.statements();
            case 22 -> StationCommandCausalitySchema.statements();
            case 23 -> StationMutationCoverageSchema.statements();
            case 24 -> NpcTransitObserverSchema.statements();
            default -> throw new SQLException("No pre-renumber local migration is defined for schema " + oldVersion + ".");
        };
    }

    private static void applyMigration(Connection connection, int targetVersion,
                                       List<String> statements, boolean initial) throws SQLException {
        boolean originalAutoCommit = connection.getAutoCommit();
        connection.setAutoCommit(false);
        try (Statement statement = connection.createStatement()) {
            for (String sql : statements) {
                String normalized = sql.trim().toUpperCase();
                if (normalized.startsWith("PRAGMA ")) continue;
                if (initial && normalized.startsWith("CREATE TABLE SCHEMA_MIGRATION")) continue;
                statement.execute(sql);
            }
            try (PreparedStatement insert = connection.prepareStatement(
                    "INSERT INTO schema_migration(version, applied_at) VALUES (?, ?)")) {
                insert.setInt(1, targetVersion);
                insert.setString(2, Instant.now().toString());
                insert.executeUpdate();
            }
            connection.commit();
        } catch (SQLException exception) {
            try { connection.rollback(); }
            catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
            throw exception;
        } finally {
            connection.setAutoCommit(originalAutoCommit);
        }
    }

    private static int currentVersion(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COALESCE(MAX(version),0) FROM schema_migration")) {
            return result.next() ? result.getInt(1) : 0;
        }
    }

    private static boolean objectExists(Connection connection, String type, String name) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT 1 FROM sqlite_master WHERE type=? AND name=?")) {
            statement.setString(1, type);
            statement.setString(2, name);
            try (ResultSet result = statement.executeQuery()) { return result.next(); }
        }
    }

    private static boolean tableExists(Connection connection, String table) throws SQLException {
        return objectExists(connection, "table", table);
    }

    private static boolean columnExists(Connection connection, String table, String column) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("PRAGMA table_info(" + table + ")")) {
            while (result.next()) if (column.equals(result.getString("name"))) return true;
            return false;
        }
    }

    private static long count(Connection connection, String table) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            return result.next() ? result.getLong(1) : 0;
        }
    }

    private static long foreignKeyViolations(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("PRAGMA foreign_key_check")) {
            long count = 0;
            while (result.next()) count++;
            return count;
        }
    }

    private static void configure(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("PRAGMA busy_timeout=5000");
            statement.execute("PRAGMA journal_mode=WAL");
            statement.execute("PRAGMA synchronous=FULL");
        }
    }

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
            require(currentVersion(connection) == 26, "Fresh world did not initialize at schema 026.");
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
            require(currentVersion(connection) == 26, "Legacy world did not advance to schema 026.");
            require(columnExists(connection, "world_metadata", "source_suite_version"),
                    "Legacy world did not receive normalized-world metadata columns.");
            require(tableExists(connection, "station_civilization_state")
                            && tableExists(connection, "location_ecology_state")
                            && tableExists(connection, "fleet_response_transit_leg"),
                    "Legacy world did not retain the prior passive-world migration chain.");
            verifyObservationObjects(connection, "Legacy world");
            verifyPopulationAccountingObjects(connection, "Legacy world");
            verifyCausalityAndTransitObjects(connection, "Legacy world");
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
            require(currentVersion(connection) == 26,
                    "Pre-renumber schema " + oldVersion + " did not advance to schema 026.");
            verifyObservationObjects(connection, "Pre-renumber schema " + oldVersion);
            verifyPopulationAccountingObjects(connection, "Pre-renumber schema " + oldVersion);
            verifyCausalityAndTransitObjects(connection, "Pre-renumber schema " + oldVersion);
            require(count(connection, "station_event") >= 1,
                    "Pre-renumber schema " + oldVersion + " lost causal station records.");
            require(count(connection, "npc_population_state") == 1
                            && count(connection, "npc_population_reconciliation") == 1,
                    "Pre-renumber schema " + oldVersion
                            + " did not seed observation population and reconciliation state.");
            require(count(connection, "station_population_state") == 1,
                    "Pre-renumber schema " + oldVersion + " did not preserve authoritative station population state.");
            require(migrationVersionCount(connection, 15, 26) == 12,
                    "Pre-renumber schema " + oldVersion + " did not receive canonical 015-026 migration history.");
            require(foreignKeyViolations(connection) == 0,
                    "Pre-renumber schema " + oldVersion + " created foreign-key violations.");
        }
    }

    private static void seedPreRenumberWorld(Connection connection, UUID worldId, UUID locationId, UUID stationId)
            throws SQLException {
        try (PreparedStatement artifact = connection.prepareStatement(
                "INSERT INTO import_artifact(artifact_id,sha256,byte_length,source_name,source_kind,inspected_at) "
                        + "VALUES('pre-renumber-fixture',?,1,'pre-renumber.save','fixture',?)")) {
            artifact.setString(1, "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
            artifact.setString(2, "2026-07-19T00:00:00Z");
            artifact.executeUpdate();
        }
        try (PreparedStatement simulation = connection.prepareStatement(
                "INSERT INTO world_simulation_metadata(world_id,canonical_time,imported_tick_sequence,imported_at,"
                        + "source_artifact_id,current_tick_sequence) VALUES(?,?,?,?,?,?)")) {
            simulation.setString(1, worldId.toString());
            simulation.setString(2, "2175-01-01T00:42:00Z");
            simulation.setLong(3, 40);
            simulation.setString(4, "2026-07-19T00:00:00Z");
            simulation.setString(5, "pre-renumber-fixture");
            simulation.setLong(6, 42);
            simulation.executeUpdate();
        }
        try (PreparedStatement location = connection.prepareStatement(
                "INSERT INTO world_location(location_id,world_id,source_location_id,source_ordinal,display_name,"
                        + "location_type,ring,location_level,map_x,map_y,biome,faction,is_station) "
                        + "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1)")) {
            location.setString(1, locationId.toString());
            location.setString(2, worldId.toString());
            location.setString(3, "pre-renumber-location");
            location.setInt(4, 1);
            location.setString(5, "Preserved Station");
            location.setString(6, "outpost");
            location.setInt(7, 1);
            location.setInt(8, 1);
            location.setDouble(9, 0);
            location.setDouble(10, 0);
            location.setString(11, "cold");
            location.setString(12, "Coalition");
            location.executeUpdate();
        }
        try (PreparedStatement station = connection.prepareStatement(
                "INSERT INTO world_station(station_id,world_id,location_id,source_station_id,display_name,"
                        + "station_type,faction,has_economy) VALUES(?,?,?,?,?,?,?,1)")) {
            station.setString(1, stationId.toString());
            station.setString(2, worldId.toString());
            station.setString(3, locationId.toString());
            station.setString(4, "pre-renumber-station");
            station.setString(5, "Preserved Station");
            station.setString(6, "outpost");
            station.setString(7, "Coalition");
            station.executeUpdate();
        }
        try (PreparedStatement state = connection.prepareStatement(
                "INSERT INTO station_simulation_state VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")) {
            state.setString(1, stationId.toString());
            state.setString(2, worldId.toString());
            int[] values = {10_000, 70, 20, 60, 65, 90, 25, 0};
            for (int index = 0; index < values.length; index++) state.setInt(index + 3, values[index]);
            state.setString(11, "STABLE");
            state.setLong(12, 42);
            state.executeUpdate();
        }
        try (PreparedStatement civilization = connection.prepareStatement(
                "UPDATE station_civilization_state SET population_index=?,civilization_strength=?,"
                        + "fauna_pressure=?,supply_consumption_base=?,last_consumption=?,shortage_ticks=?,"
                        + "surplus_ticks=?,frontier_position=?,frontier_state=?,last_tick=? WHERE station_id=?")) {
            int[] values = {70, 75, 20, 2, 2, 1, 4, 60};
            for (int index = 0; index < values.length; index++) civilization.setInt(index + 1, values[index]);
            civilization.setString(9, "HOLDING");
            civilization.setLong(10, 42);
            civilization.setString(11, stationId.toString());
            civilization.executeUpdate();
        }
        try (PreparedStatement ecology = connection.prepareStatement(
                "UPDATE location_ecology_state SET primary_producers=?,algal_bloom=?,herbivore_biomass=?,"
                        + "predator_biomass=?,scavenger_biomass=?,bioaccumulator_mass=?,nutrient_load=?,"
                        + "habitat_integrity=?,migration_pressure=?,last_tick=? WHERE location_id=?")) {
            int[] values = {60, 10, 55, 45, 25, 15, 50, 80, 35};
            for (int index = 0; index < values.length; index++) ecology.setInt(index + 1, values[index]);
            ecology.setLong(10, 42);
            ecology.setString(11, locationId.toString());
            ecology.executeUpdate();
        }
    }

    private static void verifyObservationObjects(Connection connection, String prefix) throws SQLException {
        require(tableExists(connection, "npc_population_state")
                        && tableExists(connection, "creature_population_state")
                        && tableExists(connection, "creature_territory_state"),
                prefix + " is missing observation population or territory state.");
        require(tableExists(connection, "faction_location_presence")
                        && tableExists(connection, "population_flow")
                        && tableExists(connection, "world_observation_event"),
                prefix + " is missing influence, flow, or event evidence.");
        require(tableExists(connection, "observation_snapshot")
                        && tableExists(connection, "observation_metric_series")
                        && tableExists(connection, "observer_watch_rule"),
                prefix + " is missing snapshot, metric, or watch state.");
        require(objectExists(connection, "view", "npc_population_observation")
                        && objectExists(connection, "view", "creature_population_observation")
                        && objectExists(connection, "view", "observation_world_summary"),
                prefix + " is missing read-optimized observation views.");
        require(objectExists(connection, "trigger", "observation_npc_population_seed")
                        && objectExists(connection, "trigger", "observation_creature_population_seed")
                        && objectExists(connection, "trigger", "observation_creature_territory_seed"),
                prefix + " is missing observation seed triggers.");
    }

    private static void verifyPopulationAccountingObjects(Connection connection, String prefix) throws SQLException {
        require(tableExists(connection, "npc_population_reconciliation")
                        && tableExists(connection, "npc_population_ledger"),
                prefix + " is missing population reconciliation or ledger state.");
        require(objectExists(connection, "view", "npc_population_accounting_observation"),
                prefix + " is missing the population accounting observation view.");
        require(objectExists(connection, "trigger", "npc_population_reconciliation_seed")
                        && objectExists(connection, "trigger", "npc_population_tick_accounting"),
                prefix + " is missing population accounting triggers.");
    }

    private static long migrationVersionCount(Connection connection, int first, int last) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COUNT(*) FROM schema_migration WHERE version BETWEEN ? AND ?")) {
            statement.setInt(1, first);
            statement.setInt(2, last);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? result.getLong(1) : 0;
            }
        }
    }


    private static void verifyCausalityAndTransitObjects(Connection connection, String prefix) throws SQLException {
        require(tableExists(connection, "station_event")
                        && tableExists(connection, "station_change")
                        && tableExists(connection, "station_population_event")
                        && tableExists(connection, "faction_plan"),
                prefix + " is missing schema-017 station causality state.");
        require(tableExists(connection, "station_causal_tick_baseline")
                        && objectExists(connection, "trigger", "station_consumption_causal_event"),
                prefix + " is missing schema-018 consumption causality.");
        require(tableExists(connection, "station_production_outcome")
                        && objectExists(connection, "trigger", "station_production_apply"),
                prefix + " is missing schema-019 production causality.");
        require(tableExists(connection, "station_delivery_baseline")
                        && objectExists(connection, "trigger", "station_delivery_causal_event"),
                prefix + " is missing schema-020 delivery causality.");
        require(objectExists(connection, "trigger", "station_frontier_finalize_tick")
                        && objectExists(connection, "view", "station_frontier_story"),
                prefix + " is missing schema-021 frontier causality.");
        require(tableExists(connection, "station_population_state")
                        && objectExists(connection, "view", "station_population_coverage"),
                prefix + " is missing schema-022 station population causality.");
        require(tableExists(connection, "faction_plan_resource_allocation")
                        && objectExists(connection, "view", "station_faction_resource_availability"),
                prefix + " is missing schema-023 faction-plan backing.");
        require(tableExists(connection, "simulation_transaction_context")
                        && objectExists(connection, "view", "station_event_command_history"),
                prefix + " is missing schema-024 command provenance.");
        require(tableExists(connection, "station_explanation_policy")
                        && objectExists(connection, "view", "unexplained_station_mutation"),
                prefix + " is missing schema-025 mutation explanation coverage.");
        require(tableExists(connection, "npc_transit_leg")
                        && tableExists(connection, "npc_transit_incident_schedule")
                        && objectExists(connection, "view", "npc_observable_transit"),
                prefix + " is missing schema-026 time-gated NPC transit.");
    }

    private static void deleteTree(Path root) throws IOException {
        if (!Files.exists(root)) return;
        try (var stream = Files.walk(root)) {
            for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
        }
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }
}
