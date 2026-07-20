package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument;
import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument.WorldDocument;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ImportPlan;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock;
import io.github.mrcalzon02.barotrauma.simulation.SimulationCommandExecutor;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.time.Duration;
import java.util.Comparator;
import java.util.UUID;

/** End-to-end schema-013 contract for finite extraction, delivery settlement, and renewable recovery. */
public final class NaturalResourceHarvestingVerification {
    private static final UUID ORE_SITE = UUID.fromString("9b000000-0000-0000-0000-000000000010");
    private static final UUID ALGAE_SITE = UUID.fromString("9b000000-0000-0000-0000-000000000020");

    private NaturalResourceHarvestingVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-resource-harvest-");
        try {
            UUID worldId = UUID.fromString("9b000000-0000-0000-0000-000000000001");
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Harvest Europa", worldId);
            WorldDocument document = WebSuiteV22WorldDocument.inspect(
                    fixture().getBytes(StandardCharsets.UTF_8), "resource-harvest.json");
            ImportPlan plan;
            try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
                plan = store.inspectAndPlan(document.inspection());
            }
            WebWorldV22ImportTransaction.commit(paths, new WebWorldV22ImportTransaction.ImportRequest(
                    plan.artifactId(), plan.artifact().artifactIdentity().digest(), "resource-harvest-test", document));

            SimulationCheckpointStore.RecoveryState recovery = SimulationCheckpointStore.load(paths, Duration.ofMinutes(1));
            try (SimulationCommandExecutor executor = new SimulationCommandExecutor(
                    DeterministicSimulationClock.restore(recovery.snapshot()),
                    "resource-harvest-contract-writer", recovery.lastExecutionSequence())) {
                var enabled = executor.submit(new SimulationCommandExecutor.Enable(), "resource-harvest-test").join();
                SimulationCheckpointStore.persist(paths, enabled, "Enable resource harvesting contract");
                var firstTick = executor.submit(new SimulationCommandExecutor.Step(1), "resource-harvest-test").join();
                PassiveWorldTickTransaction.commit(paths, firstTick);
            }

            require(schemaVersion(paths) == WorldStorageContracts.DATABASE_SCHEMA_VERSION,
                    "Resource-harvesting fixture did not migrate to the current schema.");
            require(!triggerSql(paths, "passive_station_logistics_cycle").contains("item_id='item-ore'"),
                    "Passive logistics still creates unbounded free ore.");

            UUID locationId = location(paths, "resource-field");
            UUID stationId = station(paths);
            UUID minerId = vessel(paths, "MINER");
            resetOperationalState(paths, minerId);
            insertSite(paths, ORE_SITE, worldId, locationId, "ORE_VEIN", 48, 80, false);

            int reserveBefore = siteInt(paths, ORE_SITE, "remaining_units");
            int richnessBefore = siteInt(paths, ORE_SITE, "richness");
            int creditsBefore = stationInt(paths, stationId, "credits");
            int oreBefore = stationInt(paths, stationId, "ore");
            int industryBefore = stationInt(paths, stationId, "industry");
            int inventoryBefore = inventory(paths, stationId, "item-ore");
            int geologyBefore = geology(paths, locationId, "mineral_exposure");

            assignAndCompleteResourceMission(paths, ORE_SITE, minerId, stationId, locationId, "MINING");

            require(count(paths, "resource_extraction_batch") == 1,
                    "Completing a resource mission did not create one extraction batch.");
            int quantity = extractionInt(paths, ORE_SITE, "quantity");
            require(quantity > 0 && quantity <= 30, "Extraction quantity escaped its bounded harvesting rate.");
            require(siteInt(paths, ORE_SITE, "remaining_units") == reserveBefore - quantity,
                    "Finite reserve did not decline by the extracted quantity.");
            require(siteInt(paths, ORE_SITE, "richness") <= richnessBefore,
                    "Extraction unexpectedly increased site richness.");
            require("SURVEYED".equals(siteText(paths, ORE_SITE, "status")),
                    "A partially exhausted site did not return to surveyed status.");
            require(geology(paths, locationId, "mineral_exposure") < geologyBefore,
                    "Mineral extraction did not affect local geology.");
            require("item-ore".equals(extractionText(paths, ORE_SITE, "item_id")),
                    "Ore extraction mapped to the wrong catalogue item.");
            require("IN_TRANSIT".equals(freightText(paths, ORE_SITE, "status")),
                    "Extracted resources were not placed into an in-transit freight lot.");

            require(stationInt(paths, stationId, "credits") == creditsBefore,
                    "The old generic mission credit reward was not compensated.");
            require(stationInt(paths, stationId, "ore") == oreBefore,
                    "The old generic +35 ore reward was not compensated.");
            require(stationInt(paths, stationId, "industry") == industryBefore,
                    "The old generic mining industry reward was not compensated.");
            require(vesselCargo(paths, minerId) == 0,
                    "The old generic mining cargo reward was not compensated.");

            deliverResourceFreight(paths, minerId, stationId);
            require("DELIVERED".equals(freightText(paths, ORE_SITE, "status")),
                    "Resource freight did not settle on NPC docking.");
            requireNpcDeliveryCausality(paths, ORE_SITE, quantity);
            require(inventory(paths, stationId, "item-ore") == inventoryBefore + quantity,
                    "Delivered extraction did not enter station inventory.");
            require(stationInt(paths, stationId, "ore") == oreBefore + quantity,
                    "Delivered ore did not support the abstract station economy.");
            require(treasuryCategory(paths, ORE_SITE).equals("MINING"),
                    "Resource delivery treasury evidence was not classified as mining.");
            require(treasuryCounterparty(paths, ORE_SITE).equals("RESOURCE_SITE"),
                    "Resource delivery treasury evidence lost site provenance.");

            insertSite(paths, ALGAE_SITE, worldId, locationId, "ALGAE_HARVEST", 30, 90, true);
            cancelMission(paths, ALGAE_SITE);
            primeRenewableDormancy(paths, ALGAE_SITE);
            long linkedBefore = linkedMissions(paths, ALGAE_SITE);
            advancePassiveRecovery(paths);
            require("SURVEYED".equals(siteText(paths, ALGAE_SITE, "status")),
                    "A renewable site did not return from dormancy.");
            require(siteInt(paths, ALGAE_SITE, "remaining_units") > 0,
                    "Renewable recovery did not restore harvestable units.");
            require(linkedMissions(paths, ALGAE_SITE) > linkedBefore,
                    "Recovered renewable resources did not re-enter the mission queue.");

            depleteNonrenewable(paths, ORE_SITE);
            require("DEPLETED".equals(siteText(paths, ORE_SITE, "status")),
                    "A nonrenewable exhausted site reopened as renewable or dormant.");
        } finally {
            try (var stream = Files.walk(root)) {
                for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    private static void resetOperationalState(WorldPaths paths, UUID minerId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement()) {
            statement.executeUpdate("UPDATE world_mission SET status='CANCELLED',assigned_npc_vessel_id=NULL WHERE status IN ('AVAILABLE','ASSIGNED','ACTIVE')");
            statement.executeUpdate("UPDATE npc_vessel SET status='DOCKED',mission_id=NULL,destination_location_id=NULL,route_progress=0,cargo=0");
            statement.executeUpdate("UPDATE npc_vessel SET mining=96,engineering=90,research=90 WHERE npc_vessel_id='" + minerId + "'");
        }
    }

    private static void insertSite(WorldPaths paths, UUID siteId, UUID worldId, UUID locationId,
                                   String type, int richness, int accessibility, boolean renewable) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "INSERT INTO natural_resource_site(site_id,world_id,location_id,resource_type,richness,accessibility,renewable,status,discovered_tick,last_tick) VALUES (?,?,?,?,?,?,?,'EXPOSED',100,100)")) {
            statement.setString(1, siteId.toString());
            statement.setString(2, worldId.toString());
            statement.setString(3, locationId.toString());
            statement.setString(4, type);
            statement.setInt(5, richness);
            statement.setInt(6, accessibility);
            statement.setInt(7, renewable ? 1 : 0);
            statement.executeUpdate();
        }
        require(siteInt(paths, siteId, "remaining_units") > 0,
                "New resource site did not receive a finite reserve.");
        require(linkedMissions(paths, siteId) == 1,
                "New resource site did not create its first harvesting mission.");
    }

    private static void assignAndCompleteResourceMission(WorldPaths paths, UUID missionId, UUID vesselId,
                                                           UUID stationId, UUID locationId, String missionType)
            throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            try (PreparedStatement mission = connection.prepareStatement(
                    "UPDATE world_mission SET mission_type=?,status='ACTIVE',origin_station_id=?,target_location_id=?,assigned_npc_vessel_id=?,progress=99,updated_tick=101 WHERE mission_id=?")) {
                mission.setString(1, missionType);
                mission.setString(2, stationId.toString());
                mission.setString(3, locationId.toString());
                mission.setString(4, vesselId.toString());
                mission.setString(5, missionId.toString());
                mission.executeUpdate();
            }
            try (PreparedStatement vessel = connection.prepareStatement(
                    "UPDATE npc_vessel SET status='WORKING',home_station_id=?,current_location_id=?,destination_location_id=?,mission_id=?,cargo=0,last_tick=101 WHERE npc_vessel_id=?")) {
                vessel.setString(1, stationId.toString());
                vessel.setString(2, locationId.toString());
                vessel.setString(3, locationId.toString());
                vessel.setString(4, missionId.toString());
                vessel.setString(5, vesselId.toString());
                vessel.executeUpdate();
            }
            int reward = scalarInt(connection, "SELECT reward_credits FROM world_mission WHERE mission_id='" + missionId + "'");
            try (PreparedStatement complete = connection.prepareStatement(
                    "UPDATE world_mission SET status='COMPLETE',progress=100,updated_tick=102,completed_tick=102 WHERE mission_id=?")) {
                complete.setString(1, missionId.toString());
                complete.executeUpdate();
            }
            try (PreparedStatement generic = connection.prepareStatement(
                    "UPDATE station_simulation_state SET credits=credits+?,ore=ore+35,industry=MIN(100,industry+2) WHERE station_id=?")) {
                generic.setInt(1, reward);
                generic.setString(2, stationId.toString());
                generic.executeUpdate();
            }
            try (PreparedStatement returning = connection.prepareStatement(
                    "UPDATE npc_vessel SET status='RETURNING',cargo=cargo+20,last_tick=102 WHERE npc_vessel_id=?")) {
                returning.setString(1, vesselId.toString());
                returning.executeUpdate();
            }
        }
    }

    private static void deliverResourceFreight(WorldPaths paths, UUID vesselId, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement update = connection.prepareStatement(
                     "UPDATE npc_vessel SET status='WORKING',home_station_id=?,last_tick=103 WHERE npc_vessel_id=?")) {
            update.setString(1, stationId.toString());
            update.setString(2, vesselId.toString());
            update.executeUpdate();
        }
    }

    private static void cancelMission(WorldPaths paths, UUID siteId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement update = connection.prepareStatement(
                     "UPDATE world_mission SET status='CANCELLED',updated_tick=104 WHERE mission_id=?")) {
            update.setString(1, siteId.toString());
            update.executeUpdate();
        }
    }

    private static void primeRenewableDormancy(WorldPaths paths, UUID siteId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement update = connection.prepareStatement(
                     "UPDATE natural_resource_site SET remaining_units=0,status='DORMANT',recovery_progress=95,dormant_until_tick=0,last_tick=104 WHERE site_id=?")) {
            update.setString(1, siteId.toString());
            update.executeUpdate();
        }
    }

    private static void advancePassiveRecovery(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement()) {
            long current = scalarLong(connection, "SELECT COALESCE(last_cycle_tick,0) FROM passive_simulation_config LIMIT 1");
            statement.executeUpdate("UPDATE passive_simulation_config SET last_cycle_tick=" + (current + 1)
                    + ",updated_at='2026-07-18T13:00:00Z'");
        }
    }

    private static void depleteNonrenewable(WorldPaths paths, UUID siteId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement update = connection.prepareStatement(
                     "UPDATE natural_resource_site SET remaining_units=0,status='DORMANT',recovery_progress=50,dormant_until_tick=999 WHERE site_id=?")) {
            update.setString(1, siteId.toString());
            update.executeUpdate();
        }
    }

    private static UUID location(WorldPaths paths, String sourceId) throws Exception {
        return UUID.fromString(text(paths, "SELECT location_id FROM world_location WHERE source_location_id='" + sourceId + "'"));
    }

    private static UUID station(WorldPaths paths) throws Exception {
        return UUID.fromString(text(paths, "SELECT station_id FROM world_station ORDER BY source_station_id LIMIT 1"));
    }

    private static UUID vessel(WorldPaths paths, String role) throws Exception {
        return UUID.fromString(text(paths, "SELECT npc_vessel_id FROM npc_vessel WHERE role='" + role + "' ORDER BY npc_vessel_id LIMIT 1"));
    }

    private static int stationInt(WorldPaths paths, UUID stationId, String column) throws Exception {
        require(java.util.Set.of("credits", "ore", "industry").contains(column), "Unsupported station column.");
        return keyedInt(paths, "SELECT " + column + " FROM station_simulation_state WHERE station_id=?", stationId);
    }

    private static int siteInt(WorldPaths paths, UUID siteId, String column) throws Exception {
        require(java.util.Set.of("remaining_units", "carrying_capacity", "richness", "recovery_progress").contains(column),
                "Unsupported resource-site column.");
        return keyedInt(paths, "SELECT " + column + " FROM natural_resource_site WHERE site_id=?", siteId);
    }

    private static String siteText(WorldPaths paths, UUID siteId, String column) throws Exception {
        require(column.equals("status"), "Unsupported resource-site text column.");
        return keyedText(paths, "SELECT " + column + " FROM natural_resource_site WHERE site_id=?", siteId);
    }

    private static int extractionInt(WorldPaths paths, UUID missionId, String column) throws Exception {
        require(java.util.Set.of("quantity", "remaining_before", "remaining_after", "richness_before", "richness_after").contains(column),
                "Unsupported extraction column.");
        return keyedInt(paths, "SELECT " + column + " FROM resource_extraction_batch WHERE mission_id=?", missionId);
    }

    private static String extractionText(WorldPaths paths, UUID missionId, String column) throws Exception {
        require(column.equals("item_id"), "Unsupported extraction text column.");
        return keyedText(paths, "SELECT " + column + " FROM resource_extraction_batch WHERE mission_id=?", missionId);
    }

    private static String freightText(WorldPaths paths, UUID missionId, String column) throws Exception {
        require(column.equals("status"), "Unsupported freight column.");
        return keyedText(paths, "SELECT f." + column + " FROM freight_lot f JOIN resource_extraction_batch b ON b.freight_lot_id=f.lot_id WHERE b.mission_id=?", missionId);
    }

    private static void requireNpcDeliveryCausality(WorldPaths paths, UUID missionId, int expectedQuantity)
            throws Exception {
        String sql = "SELECT e.actor_type,c.delta_value,(SELECT COUNT(*) FROM station_delivery_baseline b "
                + "WHERE b.lot_id=x.freight_lot_id) baselines FROM resource_extraction_batch x "
                + "JOIN station_event e ON e.cause_type='FREIGHT_LOT' AND e.cause_id=x.freight_lot_id "
                + "JOIN station_change c ON c.event_id=e.event_id AND c.change_id=x.freight_lot_id||':delivery-inventory' "
                + "WHERE x.mission_id=? AND ABS((c.previous_value+c.delta_value)-c.resulting_value)<0.000001";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, missionId.toString());
            try (ResultSet result = statement.executeQuery()) {
                require(result.next() && "NPC_VESSEL".equals(result.getString("actor_type"))
                                && result.getInt("delta_value") == expectedQuantity
                                && result.getInt("baselines") == 0,
                        "NPC resource delivery did not retain exact carrier-attributed causality.");
            }
        }
    }

    private static int inventory(WorldPaths paths, UUID stationId, String itemId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT quantity FROM station_inventory WHERE station_id=? AND item_id=?")) {
            statement.setString(1, stationId.toString());
            statement.setString(2, itemId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Station inventory row is missing.");
                return result.getInt(1);
            }
        }
    }

    private static int vesselCargo(WorldPaths paths, UUID vesselId) throws Exception {
        return keyedInt(paths, "SELECT cargo FROM npc_vessel WHERE npc_vessel_id=?", vesselId);
    }

    private static int geology(WorldPaths paths, UUID locationId, String column) throws Exception {
        require(column.equals("mineral_exposure"), "Unsupported geology column.");
        return keyedInt(paths, "SELECT " + column + " FROM location_geology_state WHERE location_id=?", locationId);
    }

    private static long linkedMissions(WorldPaths paths, UUID siteId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT COUNT(*) FROM resource_harvest_mission WHERE site_id=?")) {
            statement.setString(1, siteId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static String treasuryCategory(WorldPaths paths, UUID missionId) throws Exception {
        return text(paths, "SELECT t.category FROM treasury_transaction t JOIN resource_extraction_batch b ON t.transaction_id=b.freight_lot_id||':delivery' WHERE b.mission_id='" + missionId + "'");
    }

    private static String treasuryCounterparty(WorldPaths paths, UUID missionId) throws Exception {
        return text(paths, "SELECT t.counterparty_type FROM treasury_transaction t JOIN resource_extraction_batch b ON t.transaction_id=b.freight_lot_id||':delivery' WHERE b.mission_id='" + missionId + "'");
    }

    private static int keyedInt(WorldPaths paths, String sql, UUID key) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, key.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Expected verification row is missing.");
                return result.getInt(1);
            }
        }
    }

    private static String keyedText(WorldPaths paths, String sql, UUID key) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, key.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Expected verification row is missing.");
                return result.getString(1);
            }
        }
    }

    private static long count(WorldPaths paths, String table) throws Exception {
        if (!table.equals("resource_extraction_batch")) throw new IllegalArgumentException("Unsupported table.");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            return result.next() ? result.getLong(1) : 0;
        }
    }

    private static int schemaVersion(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            return scalarInt(connection, "SELECT MAX(version) FROM schema_migration");
        }
    }

    private static String triggerSql(WorldPaths paths, String trigger) throws Exception {
        return text(paths, "SELECT sql FROM sqlite_master WHERE type='trigger' AND name='" + trigger + "'");
    }

    private static String text(WorldPaths paths, String sql) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new IllegalStateException("Expected text result is missing.");
            return result.getString(1);
        }
    }

    private static int scalarInt(Connection connection, String sql) throws Exception {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new IllegalStateException("Expected integer result is missing.");
            return result.getInt(1);
        }
    }

    private static long scalarLong(Connection connection, String sql) throws Exception {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new IllegalStateException("Expected long result is missing.");
            return result.getLong(1);
        }
    }

    private static String fixture() {
        return """
                {"version":22,"exportedAt":"2026-07-18T12:00:00Z","masterWorldId":"RESOURCE-HARVEST",
                "worldEconomyVersion":"1.0.0","worldStateSchemaVersion":"2.2.0","state":{
                "world":{"canonicalTime":"2175-01-01T00:00:00Z","realEpoch":"2026-06-20T08:00:00Z",
                "map":{"rings":48,"shellRadius":7008,"nodes":[
                {"id":"station-a","name":"Alpha Station","ring":48,"level":1,"type":"station","x":10,"y":20},
                {"id":"station-b","name":"Beta Station","ring":38,"level":4,"type":"station","x":100,"y":50},
                {"id":"station-c","name":"Gamma Station","ring":28,"level":6,"type":"station","x":190,"y":100},
                {"id":"station-d","name":"Delta Station","ring":18,"level":8,"type":"station","x":270,"y":160},
                {"id":"resource-field","name":"Prospector Rift","ring":12,"level":9,"type":"location","x":340,"y":220}]}},
                "worldEconomy":{"vessels":{},"stationEconomies":{"station-a":{},"station-b":{},
                "station-c":{},"station-d":{}},"simulation":{"tickSequence":30,
                "lastSimulatedAt":"2175-01-01T00:00:00Z"}},
                "submarine":{"name":"Prospector","model":"Dugong","crewRoster":[]}}}
                """;
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Barotrauma natural resource harvesting contracts passed.");
    }
}
