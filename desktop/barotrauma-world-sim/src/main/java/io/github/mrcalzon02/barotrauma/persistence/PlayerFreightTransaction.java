package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldLock;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

/** Atomic player-vessel freight loading and delivery against station inventory and treasury state. */
public final class PlayerFreightTransaction {
    private static final int PLAYER_CARGO_CAPACITY = 100;

    private PlayerFreightTransaction() { }

    public static FreightResult load(WorldPaths paths, UUID vesselId, String lotId, String actor)
            throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        Objects.requireNonNull(vesselId, "vesselId");
        lotId = requireText(lotId, "Freight lot ID");
        requireDriver();
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            verifySchema(connection);
            boolean original = connection.getAutoCommit();
            connection.setAutoCommit(false);
            try {
                WorldClock world = readWorldClock(connection);
                PlayerPosition vessel = requireVessel(connection, vesselId);
                FreightLot lot = requireLot(connection, lotId);
                if (!vessel.worldId().equals(world.worldId()) || !lot.worldId().equals(world.worldId())) {
                    throw new SQLException("Player freight lot and vessel must belong to the opened world.");
                }
                if (!vessel.status().equals("DOCKED")) {
                    throw new SQLException("A player vessel must be docked before loading freight.");
                }
                if (!lot.status().equals("READY") || lot.playerVesselId() != null || lot.npcVesselId() != null) {
                    throw new SQLException("Freight lot is no longer available for player loading.");
                }
                if (lot.sourceStationId() == null || lot.destinationStationId() == null) {
                    throw new SQLException("Player freight requires explicit source and destination stations.");
                }
                UUID sourceLocation = stationLocation(connection, lot.sourceStationId());
                if (!vessel.currentLocationId().equals(sourceLocation)) {
                    throw new SQLException("Player vessel is not docked at the freight source station.");
                }
                if (vessel.cargo() + lot.quantity() > PLAYER_CARGO_CAPACITY) {
                    throw new SQLException("Freight lot exceeds the player vessel cargo capacity.");
                }
                int available = availableInventory(connection, lot.sourceStationId(), lot.itemId());
                if (available < lot.quantity()) {
                    throw new SQLException("Source station no longer has enough unreserved inventory for this freight lot.");
                }

                try (PreparedStatement inventory = connection.prepareStatement(
                        "UPDATE station_inventory SET quantity=quantity-?,last_tick=? WHERE station_id=? AND item_id=? "
                                + "AND quantity-reserved>=?")) {
                    inventory.setInt(1, lot.quantity());
                    inventory.setLong(2, world.tickSequence());
                    inventory.setString(3, lot.sourceStationId().toString());
                    inventory.setString(4, lot.itemId());
                    inventory.setInt(5, lot.quantity());
                    if (inventory.executeUpdate() != 1) throw new SQLException("Freight source inventory changed before loading.");
                }
                try (PreparedStatement freight = connection.prepareStatement(
                        "UPDATE freight_lot SET status='IN_TRANSIT',assigned_player_vessel_id=?,updated_tick=? "
                                + "WHERE lot_id=? AND status='READY' AND assigned_player_vessel_id IS NULL "
                                + "AND assigned_npc_vessel_id IS NULL")) {
                    freight.setString(1, vesselId.toString());
                    freight.setLong(2, world.tickSequence());
                    freight.setString(3, lotId);
                    if (freight.executeUpdate() != 1) throw new SQLException("Freight lot changed before player loading.");
                }
                try (PreparedStatement state = connection.prepareStatement(
                        "UPDATE player_vessel_state SET cargo=cargo+?,last_tick=? WHERE vessel_id=?")) {
                    state.setInt(1, lot.quantity());
                    state.setLong(2, world.tickSequence());
                    state.setString(3, vesselId.toString());
                    if (state.executeUpdate() != 1) throw new SQLException("Player vessel disappeared during freight loading.");
                }
                int value = Math.multiplyExact(lot.baseValue(), lot.quantity());
                applyStationCredits(connection, lot.sourceStationId(), value);
                insertTreasury(connection, world, lot.sourceStationId(), lotId + ":player-load",
                        "FREIGHT", value, "PLAYER_VESSEL", vesselId.toString(),
                        "Player vessel loaded freight lot " + lotId);
                insertVoyageLog(connection, world, vesselId, "FREIGHT_LOADED", 0,
                        "Freight loaded",
                        vessel.displayName() + " loaded " + lot.quantity() + " unit(s) of " + lot.itemName()
                                + " for delivery to " + lot.destinationStationName() + ".",
                        "IN_TRANSIT", 0, 0);
                insertAudit(connection, actor, "player_freight_loaded", vesselId,
                        "{\"lotId\":\"" + json(lotId) + "\",\"quantity\":" + lot.quantity() + "}");
                connection.commit();
                return result(connection, lotId, vesselId, world.tickSequence());
            } catch (SQLException | RuntimeException exception) {
                try { connection.rollback(); } catch (SQLException rollback) { exception.addSuppressed(rollback); }
                throw exception;
            } finally { connection.setAutoCommit(original); }
        }
    }

    public static FreightResult deliver(WorldPaths paths, UUID vesselId, String lotId, String actor)
            throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        Objects.requireNonNull(vesselId, "vesselId");
        lotId = requireText(lotId, "Freight lot ID");
        requireDriver();
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(paths);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            verifySchema(connection);
            boolean original = connection.getAutoCommit();
            connection.setAutoCommit(false);
            try {
                WorldClock world = readWorldClock(connection);
                PlayerPosition vessel = requireVessel(connection, vesselId);
                FreightLot lot = requireLot(connection, lotId);
                if (!vessel.status().equals("DOCKED")) {
                    throw new SQLException("A player vessel must dock before delivering freight.");
                }
                if (!lot.status().equals("IN_TRANSIT") || !vesselId.equals(lot.playerVesselId())) {
                    throw new SQLException("Freight lot is not assigned to this player vessel in transit.");
                }
                if (lot.destinationStationId() == null) throw new SQLException("Freight lot has no destination station.");
                UUID destinationLocation = stationLocation(connection, lot.destinationStationId());
                if (!vessel.currentLocationId().equals(destinationLocation)) {
                    throw new SQLException("Player vessel is not docked at the freight destination station.");
                }
                if (vessel.cargo() < lot.quantity()) {
                    throw new SQLException("Player vessel cargo is smaller than its assigned freight lot.");
                }

                try (PreparedStatement inventory = connection.prepareStatement(
                        "UPDATE station_inventory SET quantity=quantity+?,last_tick=? WHERE station_id=? AND item_id=?")) {
                    inventory.setInt(1, lot.quantity());
                    inventory.setLong(2, world.tickSequence());
                    inventory.setString(3, lot.destinationStationId().toString());
                    inventory.setString(4, lot.itemId());
                    if (inventory.executeUpdate() != 1) throw new SQLException("Destination inventory row is missing.");
                }
                try (PreparedStatement freight = connection.prepareStatement(
                        "UPDATE freight_lot SET status='DELIVERED',updated_tick=?,delivered_tick=? "
                                + "WHERE lot_id=? AND status='IN_TRANSIT' AND assigned_player_vessel_id=?")) {
                    freight.setLong(1, world.tickSequence());
                    freight.setLong(2, world.tickSequence());
                    freight.setString(3, lotId);
                    freight.setString(4, vesselId.toString());
                    if (freight.executeUpdate() != 1) throw new SQLException("Freight lot changed before delivery.");
                }
                try (PreparedStatement state = connection.prepareStatement(
                        "UPDATE player_vessel_state SET cargo=cargo-?,last_tick=? WHERE vessel_id=? AND cargo>=?")) {
                    state.setInt(1, lot.quantity());
                    state.setLong(2, world.tickSequence());
                    state.setString(3, vesselId.toString());
                    state.setInt(4, lot.quantity());
                    if (state.executeUpdate() != 1) throw new SQLException("Player cargo changed before freight delivery.");
                }
                int value = Math.multiplyExact(lot.baseValue(), lot.quantity());
                applyStationCredits(connection, lot.destinationStationId(), -value);
                insertTreasury(connection, world, lot.destinationStationId(), lotId + ":player-delivery",
                        "FREIGHT", -value, "PLAYER_VESSEL", vesselId.toString(),
                        "Player vessel delivered freight lot " + lotId);
                insertVoyageLog(connection, world, vesselId, "FREIGHT_DELIVERED", 0,
                        "Freight delivered",
                        vessel.displayName() + " delivered " + lot.quantity() + " unit(s) of " + lot.itemName()
                                + " to " + lot.destinationStationName() + ".",
                        "DELIVERED", 0, 0);
                insertAudit(connection, actor, "player_freight_delivered", vesselId,
                        "{\"lotId\":\"" + json(lotId) + "\",\"quantity\":" + lot.quantity() + "}");
                connection.commit();
                return result(connection, lotId, vesselId, world.tickSequence());
            } catch (SQLException | RuntimeException exception) {
                try { connection.rollback(); } catch (SQLException rollback) { exception.addSuppressed(rollback); }
                throw exception;
            } finally { connection.setAutoCommit(original); }
        }
    }

    private static FreightResult result(Connection connection, String lotId, UUID vesselId, long tick)
            throws SQLException {
        FreightLot lot = requireLot(connection, lotId);
        PlayerPosition vessel = requireVessel(connection, vesselId);
        return new FreightResult(lot.lotId(), lot.status(), vesselId, vessel.cargo(), lot.quantity(),
                lot.itemName(), lot.sourceStationName(), lot.destinationStationName(), tick);
    }

    private static FreightLot requireLot(Connection connection, String lotId) throws SQLException {
        String sql = "SELECT f.lot_id,f.world_id,f.source_station_id,src.display_name source_name,"
                + "f.destination_station_id,dst.display_name destination_name,f.item_id,i.display_name item_name,"
                + "i.base_value,f.quantity,f.status,f.assigned_npc_vessel_id,f.assigned_player_vessel_id "
                + "FROM freight_lot f JOIN item_catalogue i ON i.item_id=f.item_id "
                + "LEFT JOIN world_station src ON src.station_id=f.source_station_id "
                + "LEFT JOIN world_station dst ON dst.station_id=f.destination_station_id WHERE f.lot_id=?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, lotId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Freight lot does not exist.");
                return new FreightLot(result.getString("lot_id"), UUID.fromString(result.getString("world_id")),
                        uuid(result.getString("source_station_id")), result.getString("source_name"),
                        uuid(result.getString("destination_station_id")), result.getString("destination_name"),
                        result.getString("item_id"), result.getString("item_name"), result.getInt("base_value"),
                        result.getInt("quantity"), result.getString("status"),
                        uuid(result.getString("assigned_npc_vessel_id")),
                        uuid(result.getString("assigned_player_vessel_id")));
            }
        }
    }

    private static PlayerPosition requireVessel(Connection connection, UUID vesselId) throws SQLException {
        String sql = "SELECT p.world_id,p.current_location_id,p.status,p.cargo,v.display_name FROM player_vessel_state p "
                + "JOIN vessel_instance v ON v.vessel_id=p.vessel_id WHERE p.vessel_id=?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, vesselId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Imported vessel is not enrolled for player operations.");
                return new PlayerPosition(UUID.fromString(result.getString("world_id")),
                        UUID.fromString(result.getString("current_location_id")), result.getString("status"),
                        result.getInt("cargo"), result.getString("display_name"));
            }
        }
    }

    private static WorldClock readWorldClock(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(
                "SELECT wm.world_id,sm.canonical_time,COALESCE(sm.current_tick_sequence,sm.imported_tick_sequence) tick "
                        + "FROM world_metadata wm JOIN world_simulation_metadata sm ON sm.world_id=wm.world_id LIMIT 1")) {
            if (!result.next()) throw new SQLException("Player freight requires an imported normalized master world.");
            return new WorldClock(UUID.fromString(result.getString("world_id")),
                    Instant.parse(result.getString("canonical_time")), result.getLong("tick"));
        }
    }

    private static UUID stationLocation(Connection connection, UUID stationId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT location_id FROM world_station WHERE station_id=?")) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Freight station no longer exists.");
                return UUID.fromString(result.getString(1));
            }
        }
    }

    private static int availableInventory(Connection connection, UUID stationId, String itemId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT quantity-reserved FROM station_inventory WHERE station_id=? AND item_id=?")) {
            statement.setString(1, stationId.toString());
            statement.setString(2, itemId);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getInt(1) : 0; }
        }
    }

    private static void applyStationCredits(Connection connection, UUID stationId, int delta) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "UPDATE station_simulation_state SET credits=credits+? WHERE station_id=?")) {
            statement.setInt(1, delta);
            statement.setString(2, stationId.toString());
            if (statement.executeUpdate() != 1) throw new SQLException("Freight station simulation state is missing.");
        }
    }

    private static void insertTreasury(Connection connection, WorldClock world, UUID stationId,
                                       String transactionId, String category, int creditsDelta,
                                       String counterpartyType, String counterpartyId, String memo) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO treasury_transaction(transaction_id,world_id,station_id,tick_sequence,category,"
                        + "credits_delta,counterparty_type,counterparty_id,memo) VALUES (?,?,?,?,?,?,?,?,?)")) {
            statement.setString(1, transactionId);
            statement.setString(2, world.worldId().toString());
            statement.setString(3, stationId.toString());
            statement.setLong(4, world.tickSequence());
            statement.setString(5, category);
            statement.setInt(6, creditsDelta);
            statement.setString(7, counterpartyType);
            statement.setString(8, counterpartyId);
            statement.setString(9, memo);
            statement.executeUpdate();
        }
    }

    private static void insertVoyageLog(Connection connection, WorldClock world, UUID vesselId,
                                        String eventType, int severity, String summary, String details,
                                        String resolution, int hullDelta, int suppliesDelta) throws SQLException {
        UUID id = UUID.nameUUIDFromBytes((world.worldId() + ":player-freight-log:" + vesselId + ":"
                + world.tickSequence() + ":" + eventType + ":" + summary).getBytes(StandardCharsets.UTF_8));
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT OR IGNORE INTO player_voyage_log(log_id,world_id,vessel_id,tick_sequence,action_sequence,"
                        + "canonical_time,event_type,severity,summary,details,resolution,hull_delta,supplies_delta) "
                        + "VALUES (?,?,?,?,0,?,?,?,?,?,?,?,?)")) {
            statement.setString(1, id.toString());
            statement.setString(2, world.worldId().toString());
            statement.setString(3, vesselId.toString());
            statement.setLong(4, world.tickSequence());
            statement.setString(5, world.canonicalTime().toString());
            statement.setString(6, eventType);
            statement.setInt(7, severity);
            statement.setString(8, summary);
            statement.setString(9, details);
            statement.setString(10, resolution);
            statement.setInt(11, hullDelta);
            statement.setInt(12, suppliesDelta);
            statement.executeUpdate();
        }
    }

    private static void insertAudit(Connection connection, String actor, String action,
                                    UUID vesselId, String details) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO audit_entry(occurred_at,actor,action,entity_type,entity_id,details_json) "
                        + "VALUES (?,?,?,?,?,?)")) {
            statement.setString(1, Instant.now().toString());
            statement.setString(2, actor == null || actor.isBlank() ? "desktop-user" : actor.trim());
            statement.setString(3, action);
            statement.setString(4, "vessel_instance");
            statement.setString(5, vesselId.toString());
            statement.setString(6, details);
            statement.executeUpdate();
        }
    }

    private static String requireText(String value, String label) {
        if (value == null || value.isBlank()) throw new IllegalArgumentException(label + " cannot be blank.");
        return value.trim();
    }

    private static String json(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
    }

    private static UUID uuid(String value) {
        return value == null || value.isBlank() ? null : UUID.fromString(value);
    }

    private static void configure(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("PRAGMA busy_timeout=5000");
            statement.execute("PRAGMA journal_mode=WAL");
            statement.execute("PRAGMA synchronous=FULL");
        }
    }

    private static void verifySchema(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COALESCE(MAX(version),0) FROM schema_migration")) {
            int version = result.next() ? result.getInt(1) : 0;
            if (version != WorldStorageContracts.DATABASE_SCHEMA_VERSION) {
                throw new SQLException("Player freight requires database schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "; found " + version + ".");
            }
        }
    }

    private static void requireDriver() throws SQLException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) { throw new SQLException("SQLite JDBC driver is unavailable.", exception); }
    }

    private record WorldClock(UUID worldId, Instant canonicalTime, long tickSequence) { }
    private record PlayerPosition(UUID worldId, UUID currentLocationId, String status, int cargo,
                                  String displayName) { }
    private record FreightLot(String lotId, UUID worldId, UUID sourceStationId, String sourceStationName,
                              UUID destinationStationId, String destinationStationName, String itemId,
                              String itemName, int baseValue, int quantity, String status,
                              UUID npcVesselId, UUID playerVesselId) { }

    public record FreightResult(String lotId, String status, UUID vesselId, int vesselCargo,
                                int quantity, String itemName, String sourceStationName,
                                String destinationStationName, long tickSequence) { }
}
