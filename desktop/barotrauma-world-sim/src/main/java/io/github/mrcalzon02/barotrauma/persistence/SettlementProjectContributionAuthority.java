package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Savepoint;

/** Reconciles schema-029 project commitments with canonical inventory, migration, and vessel state. */
final class SettlementProjectContributionAuthority {
    private SettlementProjectContributionAuthority() { }

    static SettlementProjectTransaction.ProjectResult commitInventory(
            Connection connection, String projectId, SettlementProjectTransaction.ContributionKind kind,
            String stationId, String itemId, int quantity, long tick, String evidenceKey) throws SQLException {
        requireTransaction(connection);
        if (kind != SettlementProjectTransaction.ContributionKind.MATERIALS
                && kind != SettlementProjectTransaction.ContributionKind.SUPPLIES) {
            throw new SQLException("Inventory may support only material or supply settlement contributions.");
        }
        Project project = project(connection, projectId);
        if (!stationId.equals(project.originStationId())) {
            throw new SQLException("Settlement inventory must originate at the project origin station.");
        }
        String requiredItem = kind == SettlementProjectTransaction.ContributionKind.MATERIALS
                ? "item-steel" : "item-rations";
        if (!requiredItem.equals(itemId)) {
            throw new SQLException(kind + " settlement contribution requires " + requiredItem + ".");
        }

        Savepoint savepoint = connection.setSavepoint("settlement_inventory_contribution");
        try {
            try (PreparedStatement update = connection.prepareStatement(
                    "UPDATE station_inventory SET quantity=quantity-?,last_tick=? "
                            + "WHERE station_id=? AND item_id=? AND quantity-reserved>=?")) {
                update.setInt(1, quantity);
                update.setLong(2, tick);
                update.setString(3, stationId);
                update.setString(4, itemId);
                update.setInt(5, quantity);
                if (update.executeUpdate() != 1) {
                    throw new SQLException("Settlement inventory contribution lacks unreserved stock.");
                }
            }
            SettlementProjectTransaction.ProjectResult result = SettlementProjectTransaction.contribute(connection,
                    new SettlementProjectTransaction.ContributionRequest(projectId, kind, quantity,
                            stationId, null, null, null, tick, evidenceKey,
                            "Committed " + quantity + " physical " + itemId + " units to settlement work."));
            connection.releaseSavepoint(savepoint);
            return result;
        } catch (SQLException | RuntimeException exception) {
            try { connection.rollback(savepoint); }
            catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
            try { connection.releaseSavepoint(savepoint); }
            catch (SQLException releaseFailure) { exception.addSuppressed(releaseFailure); }
            throw exception;
        }
    }

    static SettlementProjectTransaction.ProjectResult commitTransport(
            Connection connection, String projectId, String vesselId, long tick, String evidenceKey)
            throws SQLException {
        requireTransaction(connection);
        Project project = project(connection, projectId);
        if (project.assignedVesselId() == null || !project.assignedVesselId().equals(vesselId)) {
            throw new SQLException("Settlement transport must use the project-assigned NPC vessel.");
        }
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT 1 FROM npc_vessel WHERE npc_vessel_id=? AND world_id=? AND home_station_id=? "
                        + "AND current_location_id=(SELECT location_id FROM world_station WHERE station_id=?) "
                        + "AND status='DOCKED' AND mission_id IS NULL")) {
            statement.setString(1, vesselId);
            statement.setString(2, project.worldId());
            statement.setString(3, project.originStationId());
            statement.setString(4, project.originStationId());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Assigned settlement transport is not idle at the origin.");
            }
        }
        return SettlementProjectTransaction.contribute(connection,
                new SettlementProjectTransaction.ContributionRequest(projectId,
                        SettlementProjectTransaction.ContributionKind.TRANSPORT, 1,
                        project.originStationId(), null, vesselId, null, tick, evidenceKey,
                        "Reserved the assigned docked NPC vessel for settlement transport."));
    }

    static SettlementProjectTransaction.ProjectResult commitArrivedPopulation(
            Connection connection, String projectId, String flowId, int quantity, long tick, String evidenceKey)
            throws SQLException {
        requireTransaction(connection);
        Project project = project(connection, projectId);
        String sql;
        if (project.projectKind().equals("FOUNDING")) {
            sql = "SELECT 1 FROM population_flow f WHERE f.flow_id=? AND f.world_id=? "
                    + "AND f.entity_type='NPC_POPULATION' AND f.status='ARRIVED' "
                    + "AND f.destination_mode='FOUNDING_SITE' AND f.settlement_project_id=? "
                    + "AND f.destination_location_id=? AND f.arrived_quantity>=?";
        } else {
            sql = "SELECT 1 FROM population_flow f WHERE f.flow_id=? AND f.world_id=? "
                    + "AND f.entity_type='NPC_POPULATION' AND f.status='ARRIVED' "
                    + "AND f.destination_mode='STATION_POPULATION' AND f.destination_station_id=? "
                    + "AND f.arrived_quantity>=?";
        }
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, flowId);
            statement.setString(2, project.worldId());
            if (project.projectKind().equals("FOUNDING")) {
                statement.setString(3, projectId);
                statement.setString(4, project.targetLocationId());
                statement.setInt(5, quantity);
            } else {
                statement.setString(3, project.targetStationId());
                statement.setInt(4, quantity);
            }
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) {
                    throw new SQLException(project.projectKind().equals("FOUNDING")
                            ? "Settlement population requires a staged founding arrival linked to the project."
                            : "Settlement population requires an arrived flow at the target station.");
                }
            }
        }
        return SettlementProjectTransaction.contribute(connection,
                new SettlementProjectTransaction.ContributionRequest(projectId,
                        SettlementProjectTransaction.ContributionKind.POPULATION, quantity,
                        project.originStationId(), project.relatedPopulationId(), null, flowId, tick, evidenceKey,
                        "Committed " + quantity + " arrived migrants to settlement work."));
    }

    private static void requireTransaction(Connection connection) throws SQLException {
        if (connection.getAutoCommit()) {
            throw new SQLException("Physical settlement support requires an active transaction.");
        }
    }

    private static Project project(Connection connection, String projectId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT world_id,project_kind,origin_station_id,target_station_id,target_location_id,"
                        + "related_population_id,assigned_npc_vessel_id FROM settlement_project "
                        + "WHERE project_id=? AND status IN ('PLANNED','PREPARING')")) {
            statement.setString(1, projectId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Settlement project is not accepting physical commitments.");
                return new Project(result.getString(1), result.getString(2), result.getString(3),
                        result.getString(4), result.getString(5), result.getString(6), result.getString(7));
            }
        }
    }

    private record Project(String worldId, String projectKind, String originStationId, String targetStationId,
                           String targetLocationId, String relatedPopulationId, String assignedVesselId) { }
}
