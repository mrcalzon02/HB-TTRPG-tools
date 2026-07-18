package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** Read-only evidence registry for fleet recovery, ecology, geology, resources, and natural events. */
public final class NaturalWorldAndFleetRegistry {
    private NaturalWorldAndFleetRegistry() { }

    public static Snapshot load(WorldPaths paths) throws IOException, SQLException {
        Objects.requireNonNull(paths, "paths");
        requireDriver();
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            configureReadOnly(connection);
            verifySchema(connection);
            return new Snapshot(summary(connection), ecology(connection), geology(connection), resources(connection),
                    events(connection), operations(connection), responseLogs(connection));
        }
    }

    private static Summary summary(Connection connection) throws SQLException {
        return new Summary(count(connection, "location_ecology_state"),
                scalar(connection, "SELECT COUNT(*) FROM location_ecology_state WHERE algal_bloom>=55"),
                scalar(connection, "SELECT COUNT(*) FROM location_ecology_state WHERE migration_pressure>=30"),
                scalar(connection, "SELECT COUNT(*) FROM location_geology_state WHERE hydrothermal_activity>=65 OR cave_instability>=65"),
                count(connection, "natural_resource_site"),
                scalar(connection, "SELECT COUNT(*) FROM fleet_response_operation WHERE status IN ('AVAILABLE','ACTIVE')"),
                scalar(connection, "SELECT COUNT(*) FROM fleet_response_operation WHERE status='COMPLETE'"));
    }

    private static List<EcologyRow> ecology(Connection connection) throws SQLException {
        List<EcologyRow> rows = new ArrayList<>();
        String sql = "SELECT l.display_name,l.ring,l.location_level,e.location_id,e.primary_producers,e.algal_bloom,"
                + "e.herbivore_biomass,e.predator_biomass,e.scavenger_biomass,e.bioaccumulator_mass,e.nutrient_load,"
                + "e.habitat_integrity,e.migration_pressure,e.last_tick FROM location_ecology_state e "
                + "JOIN world_location l ON l.location_id=e.location_id ORDER BY e.migration_pressure DESC,e.algal_bloom DESC,l.source_ordinal";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new EcologyRow(result.getString("location_id"), result.getString("display_name"),
                    result.getInt("ring"), result.getInt("location_level"), result.getInt("primary_producers"),
                    result.getInt("algal_bloom"), result.getInt("herbivore_biomass"), result.getInt("predator_biomass"),
                    result.getInt("scavenger_biomass"), result.getInt("bioaccumulator_mass"),
                    result.getInt("nutrient_load"), result.getInt("habitat_integrity"),
                    result.getInt("migration_pressure"), result.getLong("last_tick")));
        }
        return List.copyOf(rows);
    }

    private static List<GeologyRow> geology(Connection connection) throws SQLException {
        List<GeologyRow> rows = new ArrayList<>();
        String sql = "SELECT l.display_name,l.ring,l.location_level,g.location_id,g.tectonic_stress,g.hydrothermal_activity,"
                + "g.mineral_exposure,g.cave_instability,g.sediment_flux,g.last_tick FROM location_geology_state g "
                + "JOIN world_location l ON l.location_id=g.location_id ORDER BY g.mineral_exposure DESC,g.hydrothermal_activity DESC,l.source_ordinal";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new GeologyRow(result.getString("location_id"), result.getString("display_name"),
                    result.getInt("ring"), result.getInt("location_level"), result.getInt("tectonic_stress"),
                    result.getInt("hydrothermal_activity"), result.getInt("mineral_exposure"),
                    result.getInt("cave_instability"), result.getInt("sediment_flux"), result.getLong("last_tick")));
        }
        return List.copyOf(rows);
    }

    private static List<ResourceRow> resources(Connection connection) throws SQLException {
        List<ResourceRow> rows = new ArrayList<>();
        String sql = "SELECT r.site_id,r.resource_type,r.richness,r.accessibility,r.renewable,r.status,r.discovered_tick,"
                + "r.last_tick,l.display_name FROM natural_resource_site r JOIN world_location l ON l.location_id=r.location_id "
                + "ORDER BY r.status,r.richness DESC,r.discovered_tick DESC";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new ResourceRow(result.getString("site_id"), result.getString("display_name"),
                    result.getString("resource_type"), result.getInt("richness"), result.getInt("accessibility"),
                    result.getInt("renewable") == 1, result.getString("status"), result.getLong("discovered_tick"),
                    result.getLong("last_tick")));
        }
        return List.copyOf(rows);
    }

    private static List<EventRow> events(Connection connection) throws SQLException {
        List<EventRow> rows = new ArrayList<>();
        String sql = "SELECT e.event_id,e.tick_sequence,e.event_type,e.severity,e.summary,l.display_name "
                + "FROM natural_world_event e JOIN world_location l ON l.location_id=e.location_id "
                + "ORDER BY e.tick_sequence DESC,e.severity DESC LIMIT 500";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new EventRow(result.getString("event_id"), result.getLong("tick_sequence"),
                    result.getString("display_name"), result.getString("event_type"), result.getInt("severity"),
                    result.getString("summary")));
        }
        return List.copyOf(rows);
    }

    private static List<OperationRow> operations(Connection connection) throws SQLException {
        List<OperationRow> rows = new ArrayList<>();
        String sql = "SELECT o.operation_id,o.operation_type,o.status,o.progress,o.difficulty,o.spare_parts_required,"
                + "o.fuel_required,o.ammunition_required,o.medical_required,o.created_tick,o.updated_tick,o.completed_tick,"
                + "distressed.display_name distressed_name,responder.display_name responder_name,origin.display_name origin_name,"
                + "target.display_name target_station_name,l.display_name target_location_name FROM fleet_response_operation o "
                + "LEFT JOIN npc_vessel distressed ON distressed.npc_vessel_id=o.distressed_npc_vessel_id "
                + "LEFT JOIN npc_vessel responder ON responder.npc_vessel_id=o.assigned_npc_vessel_id "
                + "LEFT JOIN world_station origin ON origin.station_id=o.origin_station_id "
                + "LEFT JOIN world_station target ON target.station_id=o.target_station_id "
                + "JOIN world_location l ON l.location_id=o.target_location_id "
                + "ORDER BY CASE o.status WHEN 'ACTIVE' THEN 0 WHEN 'AVAILABLE' THEN 1 ELSE 2 END,o.updated_tick DESC";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new OperationRow(result.getString("operation_id"),
                    result.getString("operation_type"), result.getString("status"), result.getInt("progress"),
                    result.getInt("difficulty"), result.getString("distressed_name"), result.getString("responder_name"),
                    result.getString("origin_name"), result.getString("target_station_name"),
                    result.getString("target_location_name"), result.getInt("spare_parts_required"),
                    result.getInt("fuel_required"), result.getInt("ammunition_required"),
                    result.getInt("medical_required"), result.getLong("created_tick"), result.getLong("updated_tick"),
                    nullableLong(result, "completed_tick")));
        }
        return List.copyOf(rows);
    }

    private static List<ResponseLogRow> responseLogs(Connection connection) throws SQLException {
        List<ResponseLogRow> rows = new ArrayList<>();
        String sql = "SELECT l.log_id,l.operation_id,l.tick_sequence,l.event_type,l.summary,o.operation_type "
                + "FROM fleet_response_log l JOIN fleet_response_operation o ON o.operation_id=l.operation_id "
                + "ORDER BY l.tick_sequence DESC LIMIT 500";
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            while (result.next()) rows.add(new ResponseLogRow(result.getString("log_id"),
                    result.getString("operation_id"), result.getLong("tick_sequence"),
                    result.getString("operation_type"), result.getString("event_type"), result.getString("summary")));
        }
        return List.copyOf(rows);
    }

    private static int count(Connection connection, String table) throws SQLException {
        if (!List.of("location_ecology_state", "natural_resource_site").contains(table)) {
            throw new IllegalArgumentException("Unsupported natural-world registry table.");
        }
        return scalar(connection, "SELECT COUNT(*) FROM " + table);
    }

    private static int scalar(Connection connection, String sql) throws SQLException {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(sql)) {
            return result.next() ? result.getInt(1) : 0;
        }
    }

    private static Long nullableLong(ResultSet result, String column) throws SQLException {
        Object value = result.getObject(column);
        return value == null ? null : result.getLong(column);
    }

    private static void configureReadOnly(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA query_only=ON");
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("PRAGMA busy_timeout=5000");
        }
    }

    private static void verifySchema(Connection connection) throws SQLException {
        int version = scalar(connection, "SELECT COALESCE(MAX(version),0) FROM schema_migration");
        if (version != WorldStorageContracts.DATABASE_SCHEMA_VERSION) {
            throw new SQLException("Natural-world registry requires database schema "
                    + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "; found " + version + ".");
        }
    }

    private static void requireDriver() throws SQLException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch (ClassNotFoundException exception) { throw new SQLException("SQLite JDBC driver is unavailable.", exception); }
    }

    public record Snapshot(Summary summary, List<EcologyRow> ecology, List<GeologyRow> geology,
                           List<ResourceRow> resources, List<EventRow> events,
                           List<OperationRow> operations, List<ResponseLogRow> responseLogs) {
        public Snapshot {
            ecology = List.copyOf(ecology);
            geology = List.copyOf(geology);
            resources = List.copyOf(resources);
            events = List.copyOf(events);
            operations = List.copyOf(operations);
            responseLogs = List.copyOf(responseLogs);
        }
    }

    public record Summary(int locations, int activeBlooms, int predatorMigrationZones,
                          int geologicalHotspots, int resourceSites, int activeResponses,
                          int completedResponses) { }

    public record EcologyRow(String locationId, String locationName, int ring, int level,
                             int primaryProducers, int algalBloom, int herbivores, int predators,
                             int scavengers, int bioaccumulators, int nutrients,
                             int habitatIntegrity, int migrationPressure, long lastTick) { }

    public record GeologyRow(String locationId, String locationName, int ring, int level,
                             int tectonicStress, int hydrothermalActivity, int mineralExposure,
                             int caveInstability, int sedimentFlux, long lastTick) { }

    public record ResourceRow(String siteId, String locationName, String resourceType,
                              int richness, int accessibility, boolean renewable, String status,
                              long discoveredTick, long lastTick) { }

    public record EventRow(String eventId, long tickSequence, String locationName,
                           String eventType, int severity, String summary) { }

    public record OperationRow(String operationId, String operationType, String status,
                               int progress, int difficulty, String distressedVessel,
                               String responderVessel, String originStation, String targetStation,
                               String targetLocation, int spareParts, int fuel, int ammunition,
                               int medical, long createdTick, long updatedTick, Long completedTick) { }

    public record ResponseLogRow(String logId, String operationId, long tickSequence,
                                 String operationType, String eventType, String summary) { }
}
