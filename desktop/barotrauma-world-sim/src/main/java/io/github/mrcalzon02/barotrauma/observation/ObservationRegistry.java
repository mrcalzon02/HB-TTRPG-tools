package io.github.mrcalzon02.barotrauma.observation;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** Strictly read-only schema-015 observation queries for desktop presentation and later export. */
public final class ObservationRegistry {
    private ObservationRegistry() { }

    public static Snapshot load(WorldPaths world) throws Exception {
        return loadChangedSince(world, -1L);
    }

    public static Snapshot loadChangedSince(WorldPaths world, long changedSinceTick) throws Exception {
        Objects.requireNonNull(world, "world");
        if (changedSinceTick < -1) throw new IllegalArgumentException("changedSinceTick must be -1 or greater.");
        requireDriver();
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + world.database())) {
            configureReadOnly(connection);
            verifySchema(connection);
            WorldSummary summary = readSummary(connection);
            return new Snapshot(summary,
                    readNpcPopulations(connection, changedSinceTick),
                    readCreaturePopulations(connection, changedSinceTick),
                    readFactionPresence(connection, changedSinceTick),
                    readFlows(connection, changedSinceTick),
                    readEvents(connection, changedSinceTick, null, null, 500),
                    readSnapshots(connection, changedSinceTick),
                    readMetrics(connection, changedSinceTick),
                    changedSinceTick);
        }
    }

    public static List<EventRow> eventsForEntity(WorldPaths world, String entityType,
                                                  String entityId, int limit) throws Exception {
        Objects.requireNonNull(world, "world");
        String type = requireText(entityType, "entityType");
        String id = requireText(entityId, "entityId");
        if (limit < 1 || limit > 5_000) throw new IllegalArgumentException("Event limit must be between 1 and 5000.");
        requireDriver();
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + world.database())) {
            configureReadOnly(connection);
            verifySchema(connection);
            return readEvents(connection, -1, type, id, limit);
        }
    }

    private static WorldSummary readSummary(Connection connection) throws SQLException {
        String sql = "SELECT s.world_id,s.display_name,s.npc_populations,s.npc_population_total,"
                + "s.creature_populations,s.creature_estimated_total,s.faction_presences,s.observation_events,"
                + "COALESCE(m.current_tick_sequence,m.imported_tick_sequence,0),w.canonical_time "
                + "FROM observation_world_summary s JOIN world_metadata w ON w.world_id=s.world_id "
                + "LEFT JOIN world_simulation_metadata m ON m.world_id=s.world_id LIMIT 1";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            if (!result.next()) throw new SQLException("Observation world summary is empty.");
            return new WorldSummary(result.getString(1), result.getString(2), result.getLong(3), result.getLong(4),
                    result.getLong(5), result.getLong(6), result.getLong(7), result.getLong(8),
                    result.getLong(9), result.getString(10));
        }
    }

    private static List<NpcPopulationRow> readNpcPopulations(Connection connection, long since) throws SQLException {
        String sql = "SELECT population_id,station_id,station_name,civilians,industrial_workers,logistics_workers,"
                + "security_personnel,medical_personnel,scientific_personnel,temporary_residents,refugees,total_population,"
                + "housing_capacity,life_support_capacity,employment_capacity,morale,last_tick "
                + "FROM npc_population_observation WHERE (? < 0 OR last_tick > ?) ORDER BY total_population DESC,station_name";
        List<NpcPopulationRow> rows = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            bindSince(statement, since);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) rows.add(new NpcPopulationRow(result.getString(1), result.getString(2),
                        result.getString(3), result.getLong(4), result.getLong(5), result.getLong(6),
                        result.getLong(7), result.getLong(8), result.getLong(9), result.getLong(10),
                        result.getLong(11), result.getLong(12), result.getLong(13), result.getLong(14),
                        result.getLong(15), result.getInt(16), result.getLong(17)));
            }
        }
        return List.copyOf(rows);
    }

    private static List<CreaturePopulationRow> readCreaturePopulations(Connection connection, long since) throws SQLException {
        String sql = "SELECT population_id,location_id,location_name,species_key,population_class,estimated_count,biomass,"
                + "health,food_stress,habitat_support,migration_pressure,observation_confidence,territory_status,"
                + "COALESCE(territory_pressure,0),COALESCE(nest_strength,0),last_tick "
                + "FROM creature_population_observation WHERE (? < 0 OR last_tick > ?) "
                + "ORDER BY biomass DESC,location_name,species_key";
        List<CreaturePopulationRow> rows = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            bindSince(statement, since);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) rows.add(new CreaturePopulationRow(result.getString(1), result.getString(2),
                        result.getString(3), result.getString(4), result.getString(5), result.getLong(6),
                        result.getInt(7), result.getInt(8), result.getInt(9), result.getInt(10),
                        result.getInt(11), result.getInt(12), result.getString(13), result.getInt(14),
                        result.getInt(15), result.getLong(16)));
            }
        }
        return List.copyOf(rows);
    }

    private static List<FactionPresenceRow> readFactionPresence(Connection connection, long since) throws SQLException {
        String sql = "SELECT f.presence_id,f.location_id,l.display_name,f.faction_key,f.influence,f.presence_state,"
                + "f.seed_source,f.last_tick FROM faction_location_presence f JOIN world_location l ON l.location_id=f.location_id "
                + "WHERE (? < 0 OR f.last_tick > ?) ORDER BY f.influence DESC,l.display_name,f.faction_key";
        List<FactionPresenceRow> rows = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            bindSince(statement, since);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) rows.add(new FactionPresenceRow(result.getString(1), result.getString(2),
                        result.getString(3), result.getString(4), result.getInt(5), result.getString(6),
                        result.getString(7), result.getLong(8)));
            }
        }
        return List.copyOf(rows);
    }

    private static List<FlowRow> readFlows(Connection connection, long since) throws SQLException {
        String sql = "SELECT f.flow_id,f.entity_type,f.population_id,o.display_name,COALESCE(d.display_name,''),"
                + "f.quantity,f.losses,f.cause,f.status,f.departure_tick,f.arrival_tick,f.created_tick,f.updated_tick,f.summary "
                + "FROM population_flow f JOIN world_location o ON o.location_id=f.origin_location_id "
                + "LEFT JOIN world_location d ON d.location_id=f.destination_location_id "
                + "WHERE (? < 0 OR f.updated_tick > ?) ORDER BY f.updated_tick DESC,f.flow_id";
        List<FlowRow> rows = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            bindSince(statement, since);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) rows.add(new FlowRow(result.getString(1), result.getString(2),
                        result.getString(3), result.getString(4), result.getString(5), result.getLong(6),
                        result.getLong(7), result.getString(8), result.getString(9), nullableLong(result, 10),
                        nullableLong(result, 11), result.getLong(12), result.getLong(13), result.getString(14)));
            }
        }
        return List.copyOf(rows);
    }

    private static List<EventRow> readEvents(Connection connection, long since, String type,
                                             String id, int limit) throws SQLException {
        StringBuilder sql = new StringBuilder("SELECT event_id,tick_sequence,canonical_time,category,primary_entity_type,"
                + "primary_entity_id,primary_cause,primary_evidence_key,contributing_factors,magnitude,visibility,confidence,summary "
                + "FROM world_observation_event WHERE (? < 0 OR tick_sequence > ?)");
        if (type != null) sql.append(" AND primary_entity_type=? AND primary_entity_id=?");
        sql.append(" ORDER BY tick_sequence DESC,event_id LIMIT ?");
        List<EventRow> rows = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(sql.toString())) {
            bindSince(statement, since);
            int index = 3;
            if (type != null) {
                statement.setString(index++, type);
                statement.setString(index++, id);
            }
            statement.setInt(index, limit);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) rows.add(new EventRow(result.getString(1), result.getLong(2),
                        result.getString(3), result.getString(4), result.getString(5), result.getString(6),
                        result.getString(7), result.getString(8), result.getString(9), result.getLong(10),
                        result.getString(11), result.getInt(12), result.getString(13)));
            }
        }
        return List.copyOf(rows);
    }

    private static List<SnapshotRow> readSnapshots(Connection connection, long since) throws SQLException {
        String sql = "SELECT snapshot_id,tick_sequence,parent_snapshot_id,rules_version,created_at,status,source "
                + "FROM observation_snapshot WHERE (? < 0 OR tick_sequence > ?) ORDER BY tick_sequence DESC,created_at DESC";
        List<SnapshotRow> rows = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            bindSince(statement, since);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) rows.add(new SnapshotRow(result.getString(1), result.getLong(2),
                        result.getString(3), result.getString(4), result.getString(5), result.getString(6),
                        result.getString(7)));
            }
        }
        return List.copyOf(rows);
    }

    private static List<MetricRow> readMetrics(Connection connection, long since) throws SQLException {
        String sql = "SELECT metric_id,entity_type,entity_id,metric_key,tick_sequence,numeric_value,unit,snapshot_id "
                + "FROM observation_metric_series WHERE (? < 0 OR tick_sequence > ?) "
                + "ORDER BY tick_sequence DESC,entity_type,entity_id,metric_key";
        List<MetricRow> rows = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            bindSince(statement, since);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) rows.add(new MetricRow(result.getString(1), result.getString(2),
                        result.getString(3), result.getString(4), result.getLong(5), result.getDouble(6),
                        result.getString(7), result.getString(8)));
            }
        }
        return List.copyOf(rows);
    }

    private static void verifySchema(Connection connection) throws SQLException {
        int version;
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COALESCE(MAX(version),0) FROM schema_migration")) {
            version = result.next() ? result.getInt(1) : 0;
        }
        if (version < 15) throw new SQLException("Observation Registry requires schema 015; world is schema " + version + ".");
        if (version > WorldStorageContracts.DATABASE_SCHEMA_VERSION) {
            throw new SQLException("World schema " + version + " is newer than this Observation Registry supports.");
        }
        requireObject(connection, "view", "observation_world_summary");
        requireObject(connection, "view", "npc_population_observation");
        requireObject(connection, "view", "creature_population_observation");
    }

    private static void requireObject(Connection connection, String type, String name) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT 1 FROM sqlite_master WHERE type=? AND name=?")) {
            statement.setString(1, type);
            statement.setString(2, name);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Observation schema object is missing: " + name);
            }
        }
    }

    private static void configureReadOnly(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("PRAGMA busy_timeout=5000");
            statement.execute("PRAGMA query_only=ON");
        }
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery("PRAGMA query_only")) {
            if (!result.next() || result.getInt(1) != 1) throw new SQLException("Observation connection is not query-only.");
        }
    }

    private static void bindSince(PreparedStatement statement, long since) throws SQLException {
        statement.setLong(1, since);
        statement.setLong(2, since);
    }

    private static Long nullableLong(ResultSet result, int column) throws SQLException {
        long value = result.getLong(column);
        return result.wasNull() ? null : value;
    }

    private static String requireText(String value, String name) {
        Objects.requireNonNull(value, name);
        String text = value.trim();
        if (text.isEmpty()) throw new IllegalArgumentException(name + " must not be blank.");
        return text;
    }

    private static void requireDriver() throws SQLException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) { throw new SQLException("SQLite JDBC driver is unavailable.", exception); }
    }

    public record WorldSummary(String worldId, String displayName, long npcPopulations,
                               long npcPopulationTotal, long creaturePopulations,
                               long creatureEstimatedTotal, long factionPresences,
                               long observationEvents, long currentTick, String canonicalTime) { }

    public record NpcPopulationRow(String populationId, String stationId, String stationName,
                                   long civilians, long industrialWorkers, long logisticsWorkers,
                                   long securityPersonnel, long medicalPersonnel, long scientificPersonnel,
                                   long temporaryResidents, long refugees, long totalPopulation,
                                   long housingCapacity, long lifeSupportCapacity,
                                   long employmentCapacity, int morale, long lastTick) { }

    public record CreaturePopulationRow(String populationId, String locationId, String locationName,
                                        String speciesKey, String populationClass, long estimatedCount,
                                        int biomass, int health, int foodStress, int habitatSupport,
                                        int migrationPressure, int confidence, String territoryStatus,
                                        int territoryPressure, int nestStrength, long lastTick) { }

    public record FactionPresenceRow(String presenceId, String locationId, String locationName,
                                     String factionKey, int influence, String presenceState,
                                     String seedSource, long lastTick) { }

    public record FlowRow(String flowId, String entityType, String populationId,
                          String origin, String destination, long quantity, long losses,
                          String cause, String status, Long departureTick, Long arrivalTick,
                          long createdTick, long updatedTick, String summary) { }

    public record EventRow(String eventId, long tickSequence, String canonicalTime,
                           String category, String entityType, String entityId,
                           String primaryCause, String evidenceKey, String contributingFactors,
                           long magnitude, String visibility, int confidence, String summary) { }

    public record SnapshotRow(String snapshotId, long tickSequence, String parentSnapshotId,
                              String rulesVersion, String createdAt, String status, String source) { }

    public record MetricRow(String metricId, String entityType, String entityId,
                            String metricKey, long tickSequence, double numericValue,
                            String unit, String snapshotId) { }

    public record Snapshot(WorldSummary summary, List<NpcPopulationRow> npcPopulations,
                           List<CreaturePopulationRow> creaturePopulations,
                           List<FactionPresenceRow> factionPresence, List<FlowRow> flows,
                           List<EventRow> events, List<SnapshotRow> snapshots,
                           List<MetricRow> metrics, long changedSinceTick) {
        public Snapshot {
            Objects.requireNonNull(summary, "summary");
            npcPopulations = List.copyOf(npcPopulations);
            creaturePopulations = List.copyOf(creaturePopulations);
            factionPresence = List.copyOf(factionPresence);
            flows = List.copyOf(flows);
            events = List.copyOf(events);
            snapshots = List.copyOf(snapshots);
            metrics = List.copyOf(metrics);
        }
    }
}
