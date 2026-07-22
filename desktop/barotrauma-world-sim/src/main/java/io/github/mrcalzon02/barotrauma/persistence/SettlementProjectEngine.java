package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

/** Deterministic passive lifecycle progression for schema-029 settlement projects. */
public final class SettlementProjectEngine {
    private SettlementProjectEngine() { }

    public static EngineResult advance(Connection connection, String worldId, long tick) throws SQLException {
        if (tick < 0) throw new SQLException("Settlement engine tick must be nonnegative.");
        List<Project> projects = readProjects(connection, worldId);
        int prepared = 0;
        int activated = 0;
        int advanced = 0;
        int blocked = 0;
        int resumed = 0;
        int completed = 0;
        for (Project project : projects) {
            if (project.status().equals("PLANNED")) {
                SettlementProjectTransaction.prepare(connection, project.projectId(), tick);
                prepared++;
                continue;
            }

            int security = currentSecurity(connection, project);
            synchronizeSecurity(connection, project.projectId(), security, tick);
            if (project.status().equals("PREPARING")) {
                Project refreshed = readProject(connection, project.projectId());
                if (supportReady(refreshed, security)) {
                    SettlementProjectTransaction.activate(connection, refreshed.projectId(), tick);
                    activated++;
                }
                continue;
            }
            if (project.status().equals("ACTIVE") && security < project.requiredSecurity()) {
                SettlementProjectTransaction.transition(connection, project.projectId(), tick, "BLOCKED",
                        "security-below-requirement:" + tick,
                        "Settlement work blocked because security fell to " + security
                                + " below the required " + project.requiredSecurity() + ".");
                blocked++;
                continue;
            }
            if (project.status().equals("BLOCKED")) {
                if (security < project.requiredSecurity()) continue;
                SettlementProjectTransaction.transition(connection, project.projectId(), tick, "ACTIVE",
                        "security-restored:" + tick,
                        "Settlement work resumed after security recovered to " + security + ".");
                resumed++;
            }
            Project refreshed = readProject(connection, project.projectId());
            if (!refreshed.status().equals("ACTIVE")) continue;
            int work = deterministicWork(refreshed);
            var result = SettlementProjectTransaction.advance(connection, refreshed.projectId(), tick, work,
                    "passive-settlement-work:" + tick,
                    "Committed crews completed " + work + " settlement work units.");
            advanced++;
            if (result.status().equals("COMPLETE")) {
                SettlementProjectConsequences.apply(connection, refreshed.projectId(), tick);
                completed++;
            }
        }
        return new EngineResult(projects.size(), prepared, activated, advanced, blocked, resumed, completed);
    }

    private static boolean supportReady(Project project, int security) {
        return project.committedMaterialUnits() >= project.requiredMaterialUnits()
                && project.committedSupplyUnits() >= project.requiredSupplyUnits()
                && project.committedPopulation() >= project.requiredPopulation()
                && project.committedTransportUnits() >= project.requiredTransportUnits()
                && security >= project.requiredSecurity();
    }

    private static List<Project> readProjects(Connection connection, String worldId) throws SQLException {
        List<Project> projects = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT project_id,status,origin_station_id,target_station_id,required_security,current_security,"
                        + "required_material_units,committed_material_units,required_supply_units,committed_supply_units,"
                        + "required_population,committed_population,required_transport_units,committed_transport_units,"
                        + "progress_units,target_progress_units FROM settlement_project WHERE world_id=? "
                        + "AND status IN ('PLANNED','PREPARING','ACTIVE','BLOCKED') ORDER BY project_id")) {
            statement.setString(1, worldId);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) projects.add(read(result));
            }
        }
        return projects;
    }

    private static Project readProject(Connection connection, String projectId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT project_id,status,origin_station_id,target_station_id,required_security,current_security,"
                        + "required_material_units,committed_material_units,required_supply_units,committed_supply_units,"
                        + "required_population,committed_population,required_transport_units,committed_transport_units,"
                        + "progress_units,target_progress_units FROM settlement_project WHERE project_id=?")) {
            statement.setString(1, projectId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Settlement project disappeared during passive progression.");
                return read(result);
            }
        }
    }

    private static Project read(ResultSet result) throws SQLException {
        return new Project(result.getString(1), result.getString(2), result.getString(3), result.getString(4),
                result.getInt(5), result.getInt(6), result.getInt(7), result.getInt(8), result.getInt(9),
                result.getInt(10), result.getInt(11), result.getInt(12), result.getInt(13), result.getInt(14),
                result.getInt(15), result.getInt(16));
    }

    private static int currentSecurity(Connection connection, Project project) throws SQLException {
        String stationId = project.targetStationId() != null ? project.targetStationId() : project.originStationId();
        if (stationId == null) return project.currentSecurity();
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT security FROM station_simulation_state WHERE station_id=?")) {
            statement.setString(1, stationId);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? result.getInt(1) : project.currentSecurity();
            }
        }
    }

    private static void synchronizeSecurity(Connection connection, String projectId, int security, long tick)
            throws SQLException {
        try (PreparedStatement update = connection.prepareStatement(
                "UPDATE settlement_project SET current_security=?,updated_tick=? WHERE project_id=?")) {
            update.setInt(1, Math.max(0, Math.min(100, security)));
            update.setLong(2, tick);
            update.setString(3, projectId);
            if (update.executeUpdate() != 1) throw new SQLException("Settlement project security synchronization failed.");
        }
    }

    private static int deterministicWork(Project project) {
        int support = project.committedMaterialUnits() / 20
                + project.committedSupplyUnits() / 20
                + project.committedPopulation() / 10
                + project.committedTransportUnits();
        return Math.max(1, Math.min(10, 1 + support));
    }

    private record Project(String projectId, String status, String originStationId, String targetStationId,
                           int requiredSecurity, int currentSecurity, int requiredMaterialUnits,
                           int committedMaterialUnits, int requiredSupplyUnits, int committedSupplyUnits,
                           int requiredPopulation, int committedPopulation, int requiredTransportUnits,
                           int committedTransportUnits, int progressUnits, int targetProgressUnits) { }

    public record EngineResult(int eligibleProjects, int preparedProjects, int activatedProjects,
                               int advancedProjects, int blockedProjects, int resumedProjects,
                               int completedProjects) { }
}
