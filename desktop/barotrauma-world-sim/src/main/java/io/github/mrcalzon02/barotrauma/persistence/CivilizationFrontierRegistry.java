package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.io.IOException;
import java.nio.file.Files;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/** Read-only station consumption and civilization/fauna frontier evidence. */
public final class CivilizationFrontierRegistry {
    private CivilizationFrontierRegistry() { }

    public static Snapshot load(WorldPaths paths) throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        if (!Files.isRegularFile(paths.database())) throw new IOException("Desktop world database is missing.");
        requireDriver();
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configure(connection);
            verifySchema(connection);
            return new Snapshot(summary(connection), stations(connection), consumption(connection),
                    events(connection), responseMissions(connection));
        }
    }

    private static Summary summary(Connection connection) throws SQLException {
        String sql = "SELECT COUNT(*) stations,"
                + "SUM(CASE WHEN frontier_state='EXPANDING' THEN 1 ELSE 0 END) expanding,"
                + "SUM(CASE WHEN frontier_state='HOLDING' THEN 1 ELSE 0 END) holding,"
                + "SUM(CASE WHEN frontier_state='CONTESTED' THEN 1 ELSE 0 END) contested,"
                + "SUM(CASE WHEN frontier_state='CONTRACTING' THEN 1 ELSE 0 END) contracting,"
                + "SUM(CASE WHEN frontier_state='ABANDONED' THEN 1 ELSE 0 END) abandoned,"
                + "COALESCE(AVG(frontier_position),0) average_frontier,"
                + "COALESCE(AVG(civilization_strength),0) average_civilization,"
                + "COALESCE(AVG(fauna_pressure),0) average_fauna FROM station_civilization_state";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) return new Summary(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
            return new Summary(result.getInt("stations"), result.getInt("expanding"),
                    result.getInt("holding"), result.getInt("contested"),
                    result.getInt("contracting"), result.getInt("abandoned"),
                    result.getDouble("average_frontier"), result.getDouble("average_civilization"),
                    result.getDouble("average_fauna"), count(connection, "station_consumption_log"),
                    countWhere(connection, "station_consumption_log", "shortage=1"),
                    countWhere(connection, "civilization_frontier_event", "event_type='MONSTER_ATTACK'"));
        }
    }

    private static List<StationRow> stations(Connection connection) throws SQLException {
        List<StationRow> rows = new ArrayList<>();
        String sql = "SELECT c.station_id,ws.display_name,s.status,s.supplies,COALESCE(inv.quantity,0) ration_stock,"
                + "s.integrity,s.security,s.threat,s.industry,c.population_index,c.civilization_strength,"
                + "c.fauna_pressure,c.supply_consumption_base,c.last_consumption,c.shortage_ticks,c.surplus_ticks,"
                + "c.frontier_position,c.frontier_state,c.last_tick,p.baseline_kind,p.resident_count,p.workforce_count "
                + "FROM station_civilization_state c "
                + "JOIN station_simulation_state s ON s.station_id=c.station_id "
                + "JOIN station_population_state p ON p.station_id=c.station_id "
                + "JOIN world_station ws ON ws.station_id=c.station_id "
                + "LEFT JOIN station_inventory inv ON inv.station_id=c.station_id AND inv.item_id='item-rations' "
                + "ORDER BY CASE c.frontier_state WHEN 'ABANDONED' THEN 0 WHEN 'CONTRACTING' THEN 1 "
                + "WHEN 'CONTESTED' THEN 2 WHEN 'HOLDING' THEN 3 ELSE 4 END,c.frontier_position,ws.display_name";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new StationRow(
                    UUID.fromString(result.getString("station_id")), result.getString("display_name"),
                    result.getString("status"), result.getInt("supplies"), result.getInt("ration_stock"),
                    result.getInt("integrity"), result.getInt("security"), result.getInt("threat"),
                    result.getInt("industry"), result.getInt("population_index"),
                    result.getInt("civilization_strength"), result.getInt("fauna_pressure"),
                    result.getInt("supply_consumption_base"), result.getInt("last_consumption"),
                    result.getInt("shortage_ticks"), result.getInt("surplus_ticks"),
                    result.getInt("frontier_position"), result.getString("frontier_state"),
                    result.getLong("last_tick"), result.getString("baseline_kind"),
                    result.getInt("resident_count"), result.getInt("workforce_count")));
        }
        return List.copyOf(rows);
    }

    private static List<ConsumptionRow> consumption(Connection connection) throws SQLException {
        List<ConsumptionRow> rows = new ArrayList<>();
        String sql = "SELECT l.consumption_id,l.station_id,ws.display_name,l.tick_sequence,l.required_units,"
                + "l.ration_units_consumed,l.abstract_supply_delta,l.shortage,l.supplies_after,l.ration_stock_after "
                + "FROM station_consumption_log l JOIN world_station ws ON ws.station_id=l.station_id "
                + "ORDER BY l.tick_sequence DESC,ws.display_name LIMIT 3000";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new ConsumptionRow(result.getString("consumption_id"),
                    UUID.fromString(result.getString("station_id")), result.getString("display_name"),
                    result.getLong("tick_sequence"), result.getInt("required_units"),
                    result.getInt("ration_units_consumed"), result.getInt("abstract_supply_delta"),
                    result.getInt("shortage") == 1, result.getInt("supplies_after"),
                    result.getInt("ration_stock_after")));
        }
        return List.copyOf(rows);
    }

    private static List<EventRow> events(Connection connection) throws SQLException {
        List<EventRow> rows = new ArrayList<>();
        String sql = "SELECT e.event_id,e.station_id,ws.display_name,e.tick_sequence,e.event_type,e.severity,"
                + "e.supplies_delta,e.integrity_delta,e.security_delta,e.civilization_delta,e.fauna_delta,"
                + "e.frontier_delta,e.summary FROM civilization_frontier_event e "
                + "JOIN world_station ws ON ws.station_id=e.station_id "
                + "ORDER BY e.tick_sequence DESC,e.severity DESC,ws.display_name LIMIT 3000";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new EventRow(result.getString("event_id"),
                    UUID.fromString(result.getString("station_id")), result.getString("display_name"),
                    result.getLong("tick_sequence"), result.getString("event_type"),
                    result.getInt("severity"), result.getInt("supplies_delta"),
                    result.getInt("integrity_delta"), result.getInt("security_delta"),
                    result.getInt("civilization_delta"), result.getInt("fauna_delta"),
                    result.getInt("frontier_delta"), result.getString("summary")));
        }
        return List.copyOf(rows);
    }

    private static List<MissionRow> responseMissions(Connection connection) throws SQLException {
        List<MissionRow> rows = new ArrayList<>();
        String sql = "SELECT m.mission_id,m.origin_station_id,ws.display_name,m.mission_type,m.status,"
                + "wl.display_name target_name,m.difficulty,m.reward_credits,m.progress,m.created_tick,m.updated_tick "
                + "FROM world_mission m JOIN world_station ws ON ws.station_id=m.origin_station_id "
                + "JOIN world_location wl ON wl.location_id=m.target_location_id "
                + "WHERE m.mission_type IN ('FAUNA_CLEARING','DEFENSE','TRANSIT','RESEARCH') "
                + "ORDER BY m.updated_tick DESC,m.difficulty DESC LIMIT 2000";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new MissionRow(UUID.fromString(result.getString("mission_id")),
                    UUID.fromString(result.getString("origin_station_id")), result.getString("display_name"),
                    result.getString("mission_type"), result.getString("status"),
                    result.getString("target_name"), result.getInt("difficulty"),
                    result.getInt("reward_credits"), result.getInt("progress"),
                    result.getLong("created_tick"), result.getLong("updated_tick")));
        }
        return List.copyOf(rows);
    }

    private static int count(Connection connection, String table) throws SQLException {
        if (!List.of("station_consumption_log", "civilization_frontier_event").contains(table)) {
            throw new IllegalArgumentException("Unsupported frontier table.");
        }
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table)) {
            return result.next() ? result.getInt(1) : 0;
        }
    }

    private static int countWhere(Connection connection, String table, String predicate) throws SQLException {
        if (!List.of("station_consumption_log", "civilization_frontier_event").contains(table)) {
            throw new IllegalArgumentException("Unsupported frontier table.");
        }
        if (!List.of("shortage=1", "event_type='MONSTER_ATTACK'").contains(predicate)) {
            throw new IllegalArgumentException("Unsupported frontier predicate.");
        }
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM " + table + " WHERE " + predicate)) {
            return result.next() ? result.getInt(1) : 0;
        }
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
                throw new SQLException("Civilization frontier registry requires database schema "
                        + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "; found " + version + ".");
            }
        }
    }

    private static void requireDriver() throws SQLException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) { throw new SQLException("SQLite JDBC driver is unavailable.", exception); }
    }

    public record Snapshot(Summary summary, List<StationRow> stations,
                           List<ConsumptionRow> consumption, List<EventRow> events,
                           List<MissionRow> responseMissions) {
        public Snapshot {
            stations = List.copyOf(stations);
            consumption = List.copyOf(consumption);
            events = List.copyOf(events);
            responseMissions = List.copyOf(responseMissions);
        }
    }

    public record Summary(int stations, int expanding, int holding, int contested,
                          int contracting, int abandoned, double averageFrontier,
                          double averageCivilization, double averageFauna,
                          int consumptionRows, int shortageRows, int monsterAttacks) { }

    public record StationRow(UUID stationId, String stationName, String stationStatus,
                             int supplies, int rationStock, int integrity, int security,
                             int threat, int industry, int populationIndex,
                             int civilizationStrength, int faunaPressure,
                             int consumptionBase, int lastConsumption, int shortageTicks,
                             int surplusTicks, int frontierPosition, String frontierState,
                             long lastTick, String populationBaselineKind,
                             int residentCount, int workforceCount) { }

    public record ConsumptionRow(String consumptionId, UUID stationId, String stationName,
                                 long tickSequence, int requiredUnits, int rationUnitsConsumed,
                                 int abstractSupplyDelta, boolean shortage, int suppliesAfter,
                                 int rationStockAfter) { }

    public record EventRow(String eventId, UUID stationId, String stationName,
                           long tickSequence, String eventType, int severity,
                           int suppliesDelta, int integrityDelta, int securityDelta,
                           int civilizationDelta, int faunaDelta, int frontierDelta,
                           String summary) { }

    public record MissionRow(UUID missionId, UUID stationId, String stationName,
                             String missionType, String status, String targetName,
                             int difficulty, int rewardCredits, int progress,
                             long createdTick, long updatedTick) { }
}
