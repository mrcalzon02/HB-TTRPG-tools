package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/** Applies canonical station consequences immediately after a settlement project reaches exact completion. */
final class SettlementProjectConsequences {
    private SettlementProjectConsequences() { }

    static void apply(Connection connection, String projectId, long tick) throws SQLException {
        Project project = load(connection, projectId);
        if (!project.status().equals("COMPLETE") || project.progressUnits() != project.targetProgressUnits()) {
            throw new SQLException("Settlement consequences require a complete project at exact target progress.");
        }
        switch (project.kind()) {
            case "FOUNDING" -> throw new SQLException(
                    "Settlement founding requires a conserved arrived-population handoff before station creation.");
            case "EXPANSION" -> expand(connection, project, tick);
            case "ABANDONMENT" -> abandon(connection, project, tick);
            case "RECLAMATION" -> reclaim(connection, project, tick);
            default -> throw new SQLException("Unsupported settlement project kind: " + project.kind());
        }
    }

    private static void expand(Connection connection, Project project, long tick) throws SQLException {
        String stationId = requireTargetStation(project);
        try (PreparedStatement station = connection.prepareStatement(
                     "UPDATE station_simulation_state SET industry=MIN(100,industry+10),"
                             + "security=MIN(100,security+8),integrity=MIN(100,integrity+12),"
                             + "supplies=supplies+?,status=CASE WHEN status='FALLEN' THEN 'STRAINED' ELSE status END,"
                             + "last_tick=? WHERE station_id=? AND world_id=?");
             PreparedStatement civilization = connection.prepareStatement(
                     "UPDATE station_civilization_state SET civilization_strength=MIN(100,civilization_strength+10),"
                             + "frontier_position=MIN(100,frontier_position+8),"
                             + "frontier_state=CASE WHEN frontier_state='ABANDONED' THEN 'HOLDING' ELSE 'EXPANDING' END,"
                             + "last_tick=? WHERE station_id=? AND world_id=?");
             PreparedStatement population = connection.prepareStatement(
                     "UPDATE npc_population_state SET housing_capacity=housing_capacity+?,"
                             + "life_support_capacity=life_support_capacity+?,"
                             + "employment_capacity=employment_capacity+?,last_tick=? "
                             + "WHERE station_id=? AND world_id=?")) {
            station.setInt(1, project.committedSupplies());
            station.setLong(2, tick);
            station.setString(3, stationId);
            station.setString(4, project.worldId());
            requireOne(station.executeUpdate(), "Expansion target station simulation state is missing.");
            civilization.setLong(1, tick);
            civilization.setString(2, stationId);
            civilization.setString(3, project.worldId());
            requireOne(civilization.executeUpdate(), "Expansion target civilization state is missing.");
            int capacityGain = Math.max(1, project.committedPopulation());
            population.setInt(1, capacityGain);
            population.setInt(2, capacityGain);
            population.setInt(3, capacityGain);
            population.setLong(4, tick);
            population.setString(5, stationId);
            population.setString(6, project.worldId());
            requireOne(population.executeUpdate(), "Expansion target population state is missing.");
        }
    }

    private static void abandon(Connection connection, Project project, long tick) throws SQLException {
        String stationId = requireTargetStation(project);
        long population = scalar(connection,
                "SELECT civilians+industrial_workers+logistics_workers+security_personnel+medical_personnel+"
                        + "scientific_personnel+temporary_residents+refugees FROM npc_population_state "
                        + "WHERE station_id=? AND world_id=?", stationId, project.worldId());
        if (population != 0) {
            throw new SQLException("Settlement abandonment requires the station population to be fully evacuated.");
        }
        try (PreparedStatement station = connection.prepareStatement(
                     "UPDATE station_simulation_state SET status='FALLEN',industry=0,security=0,integrity=0,"
                             + "supplies=0,last_tick=? WHERE station_id=? AND world_id=?");
             PreparedStatement civilization = connection.prepareStatement(
                     "UPDATE station_civilization_state SET population_index=0,civilization_strength=0,"
                             + "frontier_state='ABANDONED',last_tick=? WHERE station_id=? AND world_id=?");
             PreparedStatement worldStation = connection.prepareStatement(
                     "UPDATE world_station SET has_economy=0 WHERE station_id=? AND world_id=?");
             PreparedStatement vendors = connection.prepareStatement(
                     "UPDATE station_vendor_offer SET active=0,last_tick=? WHERE station_id=?")) {
            bindTickStation(station, tick, stationId, project.worldId());
            requireOne(station.executeUpdate(), "Abandonment target station simulation state is missing.");
            bindTickStation(civilization, tick, stationId, project.worldId());
            requireOne(civilization.executeUpdate(), "Abandonment target civilization state is missing.");
            worldStation.setString(1, stationId);
            worldStation.setString(2, project.worldId());
            requireOne(worldStation.executeUpdate(), "Abandonment target station is missing.");
            vendors.setLong(1, tick);
            vendors.setString(2, stationId);
            vendors.executeUpdate();
        }
    }

    private static void reclaim(Connection connection, Project project, long tick) throws SQLException {
        String stationId = requireTargetStation(project);
        long population = scalar(connection,
                "SELECT civilians+industrial_workers+logistics_workers+security_personnel+medical_personnel+"
                        + "scientific_personnel+temporary_residents+refugees FROM npc_population_state "
                        + "WHERE station_id=? AND world_id=?", stationId, project.worldId());
        if (population < project.committedPopulation()) {
            throw new SQLException("Settlement reclamation requires its committed population at the target station.");
        }
        try (PreparedStatement station = connection.prepareStatement(
                     "UPDATE station_simulation_state SET status='STRAINED',industry=MAX(industry,25),"
                             + "security=MAX(security,35),integrity=MAX(integrity,40),supplies=supplies+?,"
                             + "last_tick=? WHERE station_id=? AND world_id=?");
             PreparedStatement civilization = connection.prepareStatement(
                     "UPDATE station_civilization_state SET civilization_strength=MAX(civilization_strength,30),"
                             + "frontier_position=MAX(frontier_position,20),frontier_state='HOLDING',"
                             + "last_tick=? WHERE station_id=? AND world_id=?");
             PreparedStatement worldStation = connection.prepareStatement(
                     "UPDATE world_station SET has_economy=1 WHERE station_id=? AND world_id=?");
             PreparedStatement vendors = connection.prepareStatement(
                     "UPDATE station_vendor_offer SET active=1,last_tick=? WHERE station_id=?")) {
            station.setInt(1, project.committedSupplies());
            station.setLong(2, tick);
            station.setString(3, stationId);
            station.setString(4, project.worldId());
            requireOne(station.executeUpdate(), "Reclamation target station simulation state is missing.");
            bindTickStation(civilization, tick, stationId, project.worldId());
            requireOne(civilization.executeUpdate(), "Reclamation target civilization state is missing.");
            worldStation.setString(1, stationId);
            worldStation.setString(2, project.worldId());
            requireOne(worldStation.executeUpdate(), "Reclamation target station is missing.");
            vendors.setLong(1, tick);
            vendors.setString(2, stationId);
            vendors.executeUpdate();
        }
    }

    private static Project load(Connection connection, String projectId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT world_id,project_kind,status,target_station_id,committed_supply_units,"
                        + "committed_population,progress_units,target_progress_units "
                        + "FROM settlement_project WHERE project_id=?")) {
            statement.setString(1, projectId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Unknown settlement project: " + projectId);
                return new Project(result.getString(1), result.getString(2), result.getString(3),
                        result.getString(4), result.getInt(5), result.getInt(6),
                        result.getInt(7), result.getInt(8));
            }
        }
    }

    private static long scalar(Connection connection, String sql, String stationId, String worldId)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId);
            statement.setString(2, worldId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Settlement target population state is missing.");
                return result.getLong(1);
            }
        }
    }

    private static String requireTargetStation(Project project) throws SQLException {
        if (project.targetStationId() == null || project.targetStationId().isBlank()) {
            throw new SQLException(project.kind() + " requires an existing target station.");
        }
        return project.targetStationId();
    }

    private static void bindTickStation(PreparedStatement statement, long tick,
                                        String stationId, String worldId) throws SQLException {
        statement.setLong(1, tick);
        statement.setString(2, stationId);
        statement.setString(3, worldId);
    }

    private static void requireOne(int count, String message) throws SQLException {
        if (count != 1) throw new SQLException(message);
    }

    private record Project(String worldId, String kind, String status, String targetStationId,
                           int committedSupplies, int committedPopulation,
                           int progressUnits, int targetProgressUnits) { }
}
