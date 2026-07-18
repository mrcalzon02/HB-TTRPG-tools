package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.io.IOException;
import java.nio.file.Files;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** Read-only view of schema-006 station logistics and player route evidence. */
public final class StationLogisticsRegistry {
    private StationLogisticsRegistry() { }

    public static Snapshot load(WorldPaths paths) throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        if (!Files.isRegularFile(paths.database())) throw new IOException("Desktop world database is missing.");
        requireDriver();
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            verifySchema(connection);
            return new Snapshot(summary(connection), catalogue(connection), recipes(connection),
                    inventories(connection), offers(connection), productionRuns(connection), freight(connection),
                    treasury(connection), playerVessels(connection), playerLogs(connection), playerEncounters(connection));
        }
    }

    private static Summary summary(Connection connection) throws SQLException {
        return new Summary(count(connection, "item_catalogue"), count(connection, "production_recipe"),
                count(connection, "station_inventory"), count(connection, "station_vendor_offer"),
                count(connection, "station_production_run"), count(connection, "freight_lot"),
                count(connection, "treasury_transaction"), count(connection, "player_vessel_state"),
                count(connection, "player_transit_encounter"));
    }

    private static List<ItemRow> catalogue(Connection connection) throws SQLException {
        List<ItemRow> rows = new ArrayList<>();
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(
                "SELECT item_id,item_key,display_name,category,base_value,unit_mass FROM item_catalogue ORDER BY category,display_name")) {
            while (result.next()) rows.add(new ItemRow(result.getString("item_id"), result.getString("item_key"),
                    result.getString("display_name"), result.getString("category"), result.getInt("base_value"),
                    result.getDouble("unit_mass")));
        }
        return List.copyOf(rows);
    }

    private static List<RecipeRow> recipes(Connection connection) throws SQLException {
        List<RecipeRow> rows = new ArrayList<>();
        String sql = "SELECT r.recipe_id,r.recipe_key,r.display_name,r.cycle_ticks,r.credit_cost,"
                + "COALESCE((SELECT group_concat(i.display_name||' x'||ri.quantity,', ') FROM production_recipe_input ri "
                + "JOIN item_catalogue i ON i.item_id=ri.item_id WHERE ri.recipe_id=r.recipe_id),'') inputs,"
                + "COALESCE((SELECT group_concat(i.display_name||' x'||ro.quantity,', ') FROM production_recipe_output ro "
                + "JOIN item_catalogue i ON i.item_id=ro.item_id WHERE ro.recipe_id=r.recipe_id),'') outputs "
                + "FROM production_recipe r ORDER BY r.display_name";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new RecipeRow(result.getString("recipe_id"), result.getString("recipe_key"),
                    result.getString("display_name"), result.getInt("cycle_ticks"), result.getInt("credit_cost"),
                    result.getString("inputs"), result.getString("outputs")));
        }
        return List.copyOf(rows);
    }

    private static List<InventoryRow> inventories(Connection connection) throws SQLException {
        List<InventoryRow> rows = new ArrayList<>();
        String sql = "SELECT s.station_id,ws.display_name station_name,i.item_id,i.display_name item_name,i.category,"
                + "s.quantity,s.reserved,s.reorder_point,s.last_tick FROM station_inventory s "
                + "JOIN world_station ws ON ws.station_id=s.station_id JOIN item_catalogue i ON i.item_id=s.item_id "
                + "ORDER BY ws.display_name COLLATE NOCASE,i.category,i.display_name";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new InventoryRow(UUID.fromString(result.getString("station_id")),
                    result.getString("station_name"), result.getString("item_id"), result.getString("item_name"),
                    result.getString("category"), result.getInt("quantity"), result.getInt("reserved"),
                    result.getInt("reorder_point"), result.getLong("last_tick")));
        }
        return List.copyOf(rows);
    }

    private static List<VendorOfferRow> offers(Connection connection) throws SQLException {
        List<VendorOfferRow> rows = new ArrayList<>();
        String sql = "SELECT o.offer_id,o.station_id,ws.display_name station_name,o.item_id,i.display_name item_name,"
                + "COALESCE(inv.quantity,0) stock,o.buy_price,o.sell_price,o.stock_limit,o.active,o.last_tick "
                + "FROM station_vendor_offer o JOIN world_station ws ON ws.station_id=o.station_id "
                + "JOIN item_catalogue i ON i.item_id=o.item_id LEFT JOIN station_inventory inv "
                + "ON inv.station_id=o.station_id AND inv.item_id=o.item_id "
                + "ORDER BY ws.display_name COLLATE NOCASE,i.display_name";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new VendorOfferRow(result.getString("offer_id"),
                    UUID.fromString(result.getString("station_id")), result.getString("station_name"),
                    result.getString("item_id"), result.getString("item_name"), result.getInt("stock"),
                    result.getInt("buy_price"), result.getInt("sell_price"), result.getInt("stock_limit"),
                    result.getInt("active") == 1, result.getLong("last_tick")));
        }
        return List.copyOf(rows);
    }

    private static List<ProductionRunRow> productionRuns(Connection connection) throws SQLException {
        List<ProductionRunRow> rows = new ArrayList<>();
        String sql = "SELECT p.run_id,p.station_id,ws.display_name station_name,p.recipe_id,r.display_name recipe_name,"
                + "p.tick_sequence,p.cycles,p.status FROM station_production_run p "
                + "JOIN world_station ws ON ws.station_id=p.station_id JOIN production_recipe r ON r.recipe_id=p.recipe_id "
                + "ORDER BY p.tick_sequence DESC,ws.display_name LIMIT 1000";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new ProductionRunRow(result.getString("run_id"),
                    UUID.fromString(result.getString("station_id")), result.getString("station_name"),
                    result.getString("recipe_id"), result.getString("recipe_name"),
                    result.getLong("tick_sequence"), result.getInt("cycles"), result.getString("status")));
        }
        return List.copyOf(rows);
    }

    private static List<FreightRow> freight(Connection connection) throws SQLException {
        List<FreightRow> rows = new ArrayList<>();
        String sql = "SELECT f.lot_id,f.mission_id,f.source_station_id,src.display_name source_name,"
                + "f.destination_station_id,dst.display_name destination_name,f.item_id,i.display_name item_name,"
                + "f.quantity,f.status,f.assigned_npc_vessel_id,n.display_name npc_name,"
                + "f.assigned_player_vessel_id,p.display_name player_name,f.created_tick,f.updated_tick,f.delivered_tick "
                + "FROM freight_lot f LEFT JOIN world_station src ON src.station_id=f.source_station_id "
                + "LEFT JOIN world_station dst ON dst.station_id=f.destination_station_id "
                + "JOIN item_catalogue i ON i.item_id=f.item_id LEFT JOIN npc_vessel n ON n.npc_vessel_id=f.assigned_npc_vessel_id "
                + "LEFT JOIN vessel_instance p ON p.vessel_id=f.assigned_player_vessel_id "
                + "ORDER BY f.updated_tick DESC,f.lot_id LIMIT 1000";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new FreightRow(result.getString("lot_id"), uuid(result.getString("mission_id")),
                    uuid(result.getString("source_station_id")), result.getString("source_name"),
                    uuid(result.getString("destination_station_id")), result.getString("destination_name"),
                    result.getString("item_id"), result.getString("item_name"), result.getInt("quantity"),
                    result.getString("status"), uuid(result.getString("assigned_npc_vessel_id")),
                    result.getString("npc_name"), uuid(result.getString("assigned_player_vessel_id")),
                    result.getString("player_name"), result.getLong("created_tick"), result.getLong("updated_tick"),
                    nullableLong(result, "delivered_tick")));
        }
        return List.copyOf(rows);
    }

    private static List<TreasuryRow> treasury(Connection connection) throws SQLException {
        List<TreasuryRow> rows = new ArrayList<>();
        String sql = "SELECT t.transaction_id,t.station_id,ws.display_name station_name,t.tick_sequence,t.category,"
                + "t.credits_delta,t.counterparty_type,t.counterparty_id,t.memo FROM treasury_transaction t "
                + "LEFT JOIN world_station ws ON ws.station_id=t.station_id "
                + "ORDER BY t.tick_sequence DESC,t.transaction_id LIMIT 2000";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new TreasuryRow(result.getString("transaction_id"),
                    uuid(result.getString("station_id")), result.getString("station_name"),
                    result.getLong("tick_sequence"), result.getString("category"),
                    result.getInt("credits_delta"), result.getString("counterparty_type"),
                    result.getString("counterparty_id"), result.getString("memo")));
        }
        return List.copyOf(rows);
    }

    private static List<PlayerVesselRow> playerVessels(Connection connection) throws SQLException {
        List<PlayerVesselRow> rows = new ArrayList<>();
        String sql = "SELECT p.vessel_id,v.display_name,p.status,p.current_location_id,cl.display_name current_name,"
                + "p.destination_location_id,dl.display_name destination_name,p.hull,p.supplies,p.cargo,p.crew_quality,"
                + "p.navigation,p.engineering,p.combat,p.route_progress,p.route_ticks_required,p.route_action_sequence,"
                + "p.mission_type,p.last_tick FROM player_vessel_state p JOIN vessel_instance v ON v.vessel_id=p.vessel_id "
                + "JOIN world_location cl ON cl.location_id=p.current_location_id "
                + "LEFT JOIN world_location dl ON dl.location_id=p.destination_location_id ORDER BY v.display_name";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new PlayerVesselRow(UUID.fromString(result.getString("vessel_id")),
                    result.getString("display_name"), result.getString("status"),
                    UUID.fromString(result.getString("current_location_id")), result.getString("current_name"),
                    uuid(result.getString("destination_location_id")), result.getString("destination_name"),
                    result.getInt("hull"), result.getInt("supplies"), result.getInt("cargo"),
                    result.getInt("crew_quality"), result.getInt("navigation"), result.getInt("engineering"),
                    result.getInt("combat"), result.getInt("route_progress"), result.getInt("route_ticks_required"),
                    result.getLong("route_action_sequence"), result.getString("mission_type"),
                    result.getLong("last_tick")));
        }
        return List.copyOf(rows);
    }

    private static List<PlayerLogRow> playerLogs(Connection connection) throws SQLException {
        List<PlayerLogRow> rows = new ArrayList<>();
        String sql = "SELECT l.log_id,l.vessel_id,v.display_name,l.tick_sequence,l.action_sequence,l.canonical_time,"
                + "l.event_type,l.severity,l.summary,l.details,l.resolution,l.hull_delta,l.supplies_delta "
                + "FROM player_voyage_log l JOIN vessel_instance v ON v.vessel_id=l.vessel_id "
                + "ORDER BY l.tick_sequence DESC,l.action_sequence DESC LIMIT 2000";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new PlayerLogRow(UUID.fromString(result.getString("log_id")),
                    UUID.fromString(result.getString("vessel_id")), result.getString("display_name"),
                    result.getLong("tick_sequence"), result.getLong("action_sequence"),
                    Instant.parse(result.getString("canonical_time")), result.getString("event_type"),
                    result.getInt("severity"), result.getString("summary"), result.getString("details"),
                    result.getString("resolution"), result.getInt("hull_delta"),
                    result.getInt("supplies_delta")));
        }
        return List.copyOf(rows);
    }

    private static List<PlayerEncounterRow> playerEncounters(Connection connection) throws SQLException {
        List<PlayerEncounterRow> rows = new ArrayList<>();
        String sql = "SELECT e.encounter_id,e.vessel_id,v.display_name,e.tick_sequence,e.action_sequence,"
                + "e.canonical_time,e.route_id,e.hazard_type,e.challenge,e.resolution_roll,e.effective_capability,"
                + "e.margin,e.outcome,e.narrative FROM player_transit_encounter e "
                + "JOIN vessel_instance v ON v.vessel_id=e.vessel_id "
                + "ORDER BY e.tick_sequence DESC,e.action_sequence DESC LIMIT 2000";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new PlayerEncounterRow(UUID.fromString(result.getString("encounter_id")),
                    UUID.fromString(result.getString("vessel_id")), result.getString("display_name"),
                    result.getLong("tick_sequence"), result.getLong("action_sequence"),
                    Instant.parse(result.getString("canonical_time")), result.getString("route_id"),
                    result.getString("hazard_type"), result.getInt("challenge"),
                    result.getInt("resolution_roll"), result.getInt("effective_capability"),
                    result.getInt("margin"), result.getString("outcome"), result.getString("narrative")));
        }
        return List.copyOf(rows);
    }

    private static int count(Connection connection, String table) throws SQLException {
        if (!List.of("item_catalogue", "production_recipe", "station_inventory", "station_vendor_offer",
                "station_production_run", "freight_lot", "treasury_transaction", "player_vessel_state",
                "player_transit_encounter").contains(table)) throw new IllegalArgumentException("Unsupported table.");
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            return result.next() ? result.getInt(1) : 0;
        }
    }

    private static Long nullableLong(ResultSet result, String column) throws SQLException {
        Object value = result.getObject(column);
        return value == null ? null : result.getLong(column);
    }

    private static UUID uuid(String value) {
        return value == null || value.isBlank() ? null : UUID.fromString(value);
    }

    private static void configure(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA query_only=ON");
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("PRAGMA busy_timeout=5000");
        }
    }

    private static void verifySchema(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COALESCE(MAX(version),0) FROM schema_migration")) {
            int version = result.next() ? result.getInt(1) : 0;
            if (version != WorldStorageContracts.DATABASE_SCHEMA_VERSION) {
                throw new SQLException("Station logistics registry requires database schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "; found " + version + ".");
            }
        }
    }

    private static void requireDriver() throws SQLException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) { throw new SQLException("SQLite JDBC driver is unavailable.", exception); }
    }

    public record Snapshot(Summary summary, List<ItemRow> catalogue, List<RecipeRow> recipes,
                           List<InventoryRow> inventories, List<VendorOfferRow> offers,
                           List<ProductionRunRow> productionRuns, List<FreightRow> freight,
                           List<TreasuryRow> treasury, List<PlayerVesselRow> playerVessels,
                           List<PlayerLogRow> playerLogs, List<PlayerEncounterRow> playerEncounters) {
        public Snapshot {
            catalogue = List.copyOf(catalogue); recipes = List.copyOf(recipes);
            inventories = List.copyOf(inventories); offers = List.copyOf(offers);
            productionRuns = List.copyOf(productionRuns); freight = List.copyOf(freight);
            treasury = List.copyOf(treasury); playerVessels = List.copyOf(playerVessels);
            playerLogs = List.copyOf(playerLogs); playerEncounters = List.copyOf(playerEncounters);
        }
    }

    public record Summary(int items, int recipes, int inventoryRows, int vendorOffers,
                          int productionRuns, int freightLots, int treasuryEntries,
                          int playerVessels, int playerEncounters) { }
    public record ItemRow(String itemId, String itemKey, String displayName, String category,
                          int baseValue, double unitMass) { }
    public record RecipeRow(String recipeId, String recipeKey, String displayName,
                            int cycleTicks, int creditCost, String inputs, String outputs) { }
    public record InventoryRow(UUID stationId, String stationName, String itemId, String itemName,
                               String category, int quantity, int reserved, int reorderPoint, long lastTick) { }
    public record VendorOfferRow(String offerId, UUID stationId, String stationName, String itemId,
                                 String itemName, int stock, int buyPrice, int sellPrice,
                                 int stockLimit, boolean active, long lastTick) { }
    public record ProductionRunRow(String runId, UUID stationId, String stationName, String recipeId,
                                   String recipeName, long tickSequence, int cycles, String status) { }
    public record FreightRow(String lotId, UUID missionId, UUID sourceStationId, String sourceStationName,
                             UUID destinationStationId, String destinationStationName, String itemId,
                             String itemName, int quantity, String status, UUID npcVesselId, String npcVesselName,
                             UUID playerVesselId, String playerVesselName, long createdTick,
                             long updatedTick, Long deliveredTick) { }
    public record TreasuryRow(String transactionId, UUID stationId, String stationName, long tickSequence,
                              String category, int creditsDelta, String counterpartyType,
                              String counterpartyId, String memo) { }
    public record PlayerVesselRow(UUID vesselId, String displayName, String status, UUID currentLocationId,
                                  String currentLocationName, UUID destinationLocationId,
                                  String destinationLocationName, int hull, int supplies, int cargo,
                                  int crewQuality, int navigation, int engineering, int combat,
                                  int routeProgress, int routeTicksRequired, long routeActionSequence,
                                  String missionType, long lastTick) { }
    public record PlayerLogRow(UUID logId, UUID vesselId, String vesselName, long tickSequence,
                               long actionSequence, Instant canonicalTime, String eventType,
                               int severity, String summary, String details, String resolution,
                               int hullDelta, int suppliesDelta) { }
    public record PlayerEncounterRow(UUID encounterId, UUID vesselId, String vesselName, long tickSequence,
                                     long actionSequence, Instant canonicalTime, String routeId,
                                     String hazardType, int challenge, int roll, int effectiveCapability,
                                     int margin, String outcome, String narrative) { }
}
