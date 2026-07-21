package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.Cohort;
import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.Flow;
import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.FlowKind;
import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.FlowResult;
import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.OutcomeAllocation;
import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.Population;
import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.Vessel;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.EnumMap;

import static io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationEvidence.insertObservation;
import static io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationEvidence.insertTransition;
import static io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationEvidence.recordPopulationTerm;
import static io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationStore.*;

/** Schema-030 founding-site planning, staged arrival, and conserved canonical station handoff. */
final class SettlementFoundingMigrationTransaction {
    private SettlementFoundingMigrationTransaction() { }

    static FlowResult plan(Connection connection, FoundingPlanRequest request) throws SQLException {
        NpcPopulationMigrationTransaction.requireTick(request.tick());
        Project project = project(connection, request.projectId(), "PREPARING");
        Population origin = population(connection, request.originPopulationId());
        if (!origin.worldId().equals(project.worldId())) {
            throw new SQLException("Founding migration origin belongs to another world.");
        }
        if (project.relatedPopulationId() != null
                && !project.relatedPopulationId().equals(origin.populationId())) {
            throw new SQLException("Founding project population authority does not match the migration origin.");
        }
        if (request.quantity() < 1 || request.quantity() > origin.total()
                || request.quantity() != project.requiredPopulation()) {
            throw new SQLException("Founding migration must carry the exact required project population.");
        }
        if (stationAt(connection, project.targetLocationId())) {
            throw new SQLException("Founding migration target already contains a station.");
        }
        Vessel vessel = vessel(connection, request.assignedVesselId());
        requireIdle(origin, vessel);
        if (project.assignedVesselId() != null && !project.assignedVesselId().equals(vessel.vesselId())) {
            throw new SQLException("Founding migration must use the project-assigned transport.");
        }
        if (existingFlow(connection, project.projectId())) {
            throw new SQLException("Founding project already has a population flow.");
        }

        String flowId = NpcPopulationMigrationTransaction.deterministicId(
                project.worldId() + ":founding-flow:" + project.projectId() + ":" + request.tick());
        EnumMap<Cohort, Long> allocation = allocate(origin, FlowKind.ORDINARY_MIGRATION, request.quantity());
        insertFlow(connection, flowId, project, origin, vessel, request.quantity(), request.tick(), request.summary());
        insertCohorts(connection, flowId, allocation);
        insertTransition(connection, flowId, project.worldId(), "PLANNED", "PLANNED", request.tick(),
                request.quantity(), 0, 0, "founding-migration-plan", request.summary());
        insertObservation(connection, flowId + ":planned", project.worldId(), request.tick(), origin.populationId(),
                "MIGRATION", request.quantity(), "A founding cohort was assigned to settlement project "
                        + project.projectId() + ".");
        return result(connection, flowId);
    }

    static FlowResult prepare(Connection connection, String flowId, long tick) throws SQLException {
        requireFoundingFlow(connection, flowId, "PLANNED");
        return NpcPopulationMigrationTransaction.prepare(connection, flowId, tick);
    }

    static FlowResult depart(Connection connection, String flowId, long tick) throws SQLException {
        requireFoundingFlow(connection, flowId, "PREPARING");
        return NpcPopulationMigrationTransaction.depart(connection, flowId, tick);
    }

    static FlowResult stageArrival(Connection connection, String flowId, long tick, long losses)
            throws SQLException {
        NpcPopulationMigrationTransaction.requireTick(tick);
        FoundingFlow founding = requireFoundingFlow(connection, flowId, "IN_TRANSIT");
        Flow flow = flow(connection, flowId);
        if (losses < 0 || losses > flow.embarkedQuantity()) {
            throw new SQLException("Founding migration casualties exceed the embarked population.");
        }
        Vessel vessel = vessel(connection, flow.vesselId());
        requireArrivedLeg(connection, vessel, flow.destinationLocationId(), "OUTBOUND");
        long survivors = Math.subtractExact(flow.embarkedQuantity(), losses);
        if (survivors < founding.requiredPopulation()) {
            throw new SQLException("Founding migration arrived below the project population requirement.");
        }
        OutcomeAllocation outcome = outcome(cohorts(connection, flowId, "embarked_quantity"), losses);
        updateCohorts(connection, flowId, "arrived_quantity", outcome.survivors());
        updateCohorts(connection, flowId, "losses", outcome.losses());
        try (PreparedStatement update = connection.prepareStatement(
                "UPDATE population_flow SET status='ARRIVED',arrived_quantity=?,losses=?,arrival_tick=?,"
                        + "progress_ticks=COALESCE(duration_ticks,progress_ticks),updated_tick=? "
                        + "WHERE flow_id=? AND status='IN_TRANSIT' AND destination_mode='FOUNDING_SITE'")) {
            update.setLong(1, survivors);
            update.setLong(2, losses);
            update.setLong(3, tick);
            update.setLong(4, tick);
            update.setString(5, flowId);
            if (update.executeUpdate() != 1) throw new SQLException("Founding-site arrival was not applied once.");
        }
        dockVessel(connection, vessel.vesselId(), flow.destinationLocationId(), tick);
        insertObservation(connection, flowId + ":founding-arrival", flow.worldId(), tick, flow.populationId(),
                "IMMIGRATION", survivors, "A founding cohort reached its unoccupied settlement location with "
                        + survivors + " survivors and " + losses + " casualties.");
        insertTransition(connection, flowId, flow.worldId(), "IN_TRANSIT", "ARRIVED", tick,
                survivors, losses, 0, "founding-site-arrival",
                "Survivors reached the founding site and remain conserved in staging.");
        return result(connection, flowId);
    }

    static HandoffResult completeFounding(Connection connection, String projectId, long tick) throws SQLException {
        NpcPopulationMigrationTransaction.requireTick(tick);
        Project project = project(connection, projectId, "COMPLETE");
        FoundingArrival arrival = arrival(connection, project);
        if (arrival.arrivedQuantity() != project.committedPopulation()
                || arrival.arrivedQuantity() != project.requiredPopulation()) {
            throw new SQLException("Founding handoff population does not match the completed project commitment.");
        }
        if (stationAt(connection, project.targetLocationId())) {
            throw new SQLException("Founding target gained a station before the conserved handoff.");
        }

        String stationId = NpcPopulationMigrationTransaction.deterministicId(
                project.worldId() + ":founded-station:" + project.projectId());
        String sourceStationId = "founding:" + project.projectId();
        String populationId = NpcPopulationMigrationTransaction.deterministicId(
                project.worldId() + ":founded-population:" + project.projectId());
        String locationName = locationName(connection, project.targetLocationId());
        EnumMap<Cohort, Long> founders = cohorts(connection, arrival.flowId(), "arrived_quantity");
        long founderTotal = founders.values().stream().mapToLong(Long::longValue).sum();
        if (founderTotal != arrival.arrivedQuantity()) {
            throw new SQLException("Founding cohort evidence does not equal the staged survivor total.");
        }

        insertStationRoot(connection, project, stationId, sourceStationId, locationName, tick);
        insertZeroCivilization(connection, project, stationId, tick);
        insertStationSimulation(connection, project, stationId, tick);
        String seededPopulationId = seededPopulation(connection, stationId);
        applyFounders(connection, seededPopulationId, founders, founderTotal, tick);
        Population founded = population(connection, seededPopulationId);
        recordPopulationTerm(connection, founded, tick, 0, founderTotal, founderTotal, 0,
                "IMMIGRATION", arrival.flowId() + ":founding-handoff",
                "The staged founding cohort became the first conserved station population.");
        projectPopulation(connection, seededPopulationId, tick);
        activateStation(connection, project, stationId, tick);
        recordHandoff(connection, project, arrival, stationId, seededPopulationId, founders, tick);
        insertObservation(connection, arrival.flowId() + ":founding-handoff", project.worldId(), tick,
                seededPopulationId, "IMMIGRATION", founderTotal,
                "A conserved founding cohort activated " + locationName + " as a canonical settlement.");
        return new HandoffResult(project.projectId(), arrival.flowId(), stationId, seededPopulationId,
                founderTotal, tick);
    }

    private static void insertFlow(Connection connection, String flowId, Project project, Population origin,
                                   Vessel vessel, long quantity, long tick, String summary) throws SQLException {
        int units = Math.toIntExact(Math.max(1L, (quantity + 99L) / 100L));
        long capacity = Math.multiplyExact(units, 100L);
        String sql = "INSERT INTO population_flow(flow_id,world_id,entity_type,population_id,origin_location_id,"
                + "destination_location_id,quantity,cause,status,departure_tick,arrival_tick,losses,created_tick,"
                + "updated_tick,summary,flow_kind,destination_population_id,origin_station_id,destination_station_id,"
                + "assigned_npc_vessel_id,transport_units_required,transport_capacity,reserved_quantity,"
                + "embarked_quantity,arrived_quantity,returned_quantity,stranded_quantity,progress_ticks,origin_released,"
                + "destination_mode,settlement_project_id) "
                + "VALUES (?,?,'NPC_POPULATION',?,?,?,?,'MIGRATION','PLANNED',NULL,NULL,0,?,?,?,?,NULL,?,NULL,"
                + "?,?,?,0,0,0,0,0,0,0,'FOUNDING_SITE',?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            int parameter = 1;
            statement.setString(parameter++, flowId);
            statement.setString(parameter++, project.worldId());
            statement.setString(parameter++, origin.populationId());
            statement.setString(parameter++, origin.locationId());
            statement.setString(parameter++, project.targetLocationId());
            statement.setLong(parameter++, quantity);
            statement.setLong(parameter++, tick);
            statement.setLong(parameter++, tick);
            statement.setString(parameter++, NpcPopulationMigrationTransaction.text(summary, "summary", 1_000));
            statement.setString(parameter++, FlowKind.ORDINARY_MIGRATION.name());
            statement.setString(parameter++, origin.stationId());
            statement.setString(parameter++, vessel.vesselId());
            statement.setInt(parameter++, units);
            statement.setLong(parameter++, capacity);
            statement.setString(parameter, project.projectId());
            statement.executeUpdate();
        }
    }

    private static void insertStationRoot(Connection connection, Project project, String stationId,
                                          String sourceStationId, String locationName, long tick) throws SQLException {
        try (PreparedStatement station = connection.prepareStatement(
                     "INSERT INTO world_station(station_id,world_id,location_id,source_station_id,display_name,"
                             + "station_type,faction,has_economy) VALUES(?,?,?,?,?,'SETTLEMENT',?,1)");
             PreparedStatement location = connection.prepareStatement(
                     "UPDATE world_location SET is_station=1 WHERE location_id=? AND world_id=? AND is_station=0")) {
            station.setString(1, stationId);
            station.setString(2, project.worldId());
            station.setString(3, project.targetLocationId());
            station.setString(4, sourceStationId);
            station.setString(5, locationName + " Settlement");
            if (project.sponsorFaction() == null) station.setNull(6, Types.VARCHAR);
            else station.setString(6, project.sponsorFaction());
            station.executeUpdate();
            location.setString(1, project.targetLocationId());
            location.setString(2, project.worldId());
            if (location.executeUpdate() != 1) throw new SQLException("Founding location could not become a station.");
        }
    }

    private static void insertZeroCivilization(Connection connection, Project project, String stationId, long tick)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO station_civilization_state(station_id,world_id,population_index,civilization_strength,"
                        + "fauna_pressure,supply_consumption_base,last_consumption,shortage_ticks,surplus_ticks,"
                        + "frontier_position,frontier_state,last_tick) VALUES(?,?,0,0,20,2,0,0,0,0,'ABANDONED',?)")) {
            statement.setString(1, stationId);
            statement.setString(2, project.worldId());
            statement.setLong(3, tick);
            statement.executeUpdate();
        }
    }

    private static void insertStationSimulation(Connection connection, Project project, String stationId, long tick)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO station_simulation_state(station_id,world_id,credits,supplies,ore,industry,security,"
                        + "integrity,threat,research,status,last_tick) VALUES(?,?,5000,?,?,20,?,60,20,0,'FALLEN',?)")) {
            statement.setString(1, stationId);
            statement.setString(2, project.worldId());
            statement.setInt(3, project.committedSupplies());
            statement.setInt(4, Math.max(0, project.committedMaterials() / 4));
            statement.setInt(5, Math.max(project.requiredSecurity(), project.currentSecurity()));
            statement.setLong(6, tick);
            statement.executeUpdate();
        }
    }

    private static void applyFounders(Connection connection, String populationId, EnumMap<Cohort, Long> founders,
                                      long total, long tick) throws SQLException {
        long capacity = Math.max(total + 20, total * 2);
        StringBuilder sql = new StringBuilder("UPDATE npc_population_state SET ");
        int index = 0;
        for (Cohort cohort : Cohort.values()) {
            if (index++ > 0) sql.append(',');
            sql.append(cohort.column()).append("=?");
        }
        sql.append(",housing_capacity=?,life_support_capacity=?,employment_capacity=?,morale=65,")
                .append("seed_source='schema-030-founding-handoff',last_tick=? WHERE population_id=?");
        try (PreparedStatement statement = connection.prepareStatement(sql.toString())) {
            int parameter = 1;
            for (Cohort cohort : Cohort.values()) statement.setLong(parameter++, founders.get(cohort));
            statement.setLong(parameter++, capacity);
            statement.setLong(parameter++, capacity);
            statement.setLong(parameter++, capacity);
            statement.setLong(parameter++, tick);
            statement.setString(parameter, populationId);
            if (statement.executeUpdate() != 1) throw new SQLException("Founding population seed was not replaced once.");
        }
    }

    private static void activateStation(Connection connection, Project project, String stationId, long tick)
            throws SQLException {
        try (PreparedStatement station = connection.prepareStatement(
                     "UPDATE station_simulation_state SET status='STRAINED',industry=MAX(industry,25),"
                             + "security=MAX(security,?),integrity=MAX(integrity,60),threat=MIN(threat,25),last_tick=? "
                             + "WHERE station_id=? AND world_id=?");
             PreparedStatement civilization = connection.prepareStatement(
                     "UPDATE station_civilization_state SET civilization_strength=35,fauna_pressure=20,"
                             + "frontier_position=20,frontier_state='HOLDING' WHERE station_id=? AND world_id=?");
             PreparedStatement vendors = connection.prepareStatement(
                     "UPDATE station_vendor_offer SET active=1,last_tick=? WHERE station_id=?")) {
            station.setInt(1, Math.max(project.requiredSecurity(), project.currentSecurity()));
            station.setLong(2, tick);
            station.setString(3, stationId);
            station.setString(4, project.worldId());
            if (station.executeUpdate() != 1) throw new SQLException("Founded station activation failed.");
            civilization.setString(1, stationId);
            civilization.setString(2, project.worldId());
            if (civilization.executeUpdate() != 1) throw new SQLException("Founded civilization activation failed.");
            vendors.setLong(1, tick);
            vendors.setString(2, stationId);
            vendors.executeUpdate();
        }
    }

    private static void recordHandoff(Connection connection, Project project, FoundingArrival arrival,
                                      String stationId, String populationId, EnumMap<Cohort, Long> founders,
                                      long tick) throws SQLException {
        try (PreparedStatement handoff = connection.prepareStatement(
                     "INSERT INTO settlement_founding_handoff(project_id,flow_id,world_id,station_id,population_id,"
                             + "settled_quantity,handoff_tick,evidence_key,summary) VALUES(?,?,?,?,?,?,?,?,?)");
             PreparedStatement cohort = connection.prepareStatement(
                     "INSERT INTO settlement_founding_handoff_cohort(project_id,cohort_key,quantity) VALUES(?,?,?)")) {
            handoff.setString(1, project.projectId());
            handoff.setString(2, arrival.flowId());
            handoff.setString(3, project.worldId());
            handoff.setString(4, stationId);
            handoff.setString(5, populationId);
            handoff.setLong(6, arrival.arrivedQuantity());
            handoff.setLong(7, tick);
            handoff.setString(8, arrival.flowId() + ":founding-handoff");
            handoff.setString(9, "Staged founders became the canonical population of " + stationId + ".");
            handoff.executeUpdate();
            for (Cohort value : Cohort.values()) {
                cohort.setString(1, project.projectId());
                cohort.setString(2, value.name());
                cohort.setLong(3, founders.get(value));
                cohort.addBatch();
            }
            cohort.executeBatch();
        }
    }

    private static Project project(Connection connection, String projectId, String requiredStatus)
            throws SQLException {
        String sql = "SELECT project_id,world_id,status,sponsor_faction,target_location_id,related_population_id,"
                + "assigned_npc_vessel_id,required_material_units,committed_material_units,required_supply_units,"
                + "committed_supply_units,required_population,committed_population,required_security,current_security "
                + "FROM settlement_project WHERE project_id=? AND project_kind='FOUNDING'";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, NpcPopulationMigrationTransaction.token(projectId, "projectId"));
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Unknown founding settlement project: " + projectId);
                if (!result.getString(3).equals(requiredStatus)) {
                    throw new SQLException("Founding project must be " + requiredStatus + "; found "
                            + result.getString(3) + ".");
                }
                return new Project(result.getString(1), result.getString(2), result.getString(3),
                        result.getString(4), result.getString(5), result.getString(6), result.getString(7),
                        result.getInt(8), result.getInt(9), result.getInt(10), result.getInt(11),
                        result.getInt(12), result.getInt(13), result.getInt(14), result.getInt(15));
            }
        }
    }

    private static FoundingFlow requireFoundingFlow(Connection connection, String flowId, String status)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT f.flow_id,f.settlement_project_id,p.required_population FROM population_flow f "
                        + "JOIN settlement_project p ON p.project_id=f.settlement_project_id "
                        + "WHERE f.flow_id=? AND f.destination_mode='FOUNDING_SITE' AND f.status=? "
                        + "AND p.project_kind='FOUNDING'")) {
            statement.setString(1, NpcPopulationMigrationTransaction.token(flowId, "flowId"));
            statement.setString(2, status);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Founding flow is not " + status + ": " + flowId);
                return new FoundingFlow(result.getString(1), result.getString(2), result.getLong(3));
            }
        }
    }

    private static FoundingArrival arrival(Connection connection, Project project) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT flow_id,arrived_quantity,losses FROM population_flow WHERE settlement_project_id=? "
                        + "AND destination_mode='FOUNDING_SITE' AND status='ARRIVED' "
                        + "AND NOT EXISTS(SELECT 1 FROM settlement_founding_handoff h WHERE h.flow_id=population_flow.flow_id)")) {
            statement.setString(1, project.projectId());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Completed founding project lacks an unconsumed staged arrival.");
                return new FoundingArrival(result.getString(1), result.getLong(2), result.getLong(3));
            }
        }
    }

    private static boolean existingFlow(Connection connection, String projectId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT 1 FROM population_flow WHERE settlement_project_id=?")) {
            statement.setString(1, projectId);
            try (ResultSet result = statement.executeQuery()) { return result.next(); }
        }
    }

    private static boolean stationAt(Connection connection, String locationId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT 1 FROM world_station WHERE location_id=?")) {
            statement.setString(1, locationId);
            try (ResultSet result = statement.executeQuery()) { return result.next(); }
        }
    }

    private static String locationName(Connection connection, String locationId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT display_name FROM world_location WHERE location_id=?")) {
            statement.setString(1, locationId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Founding target location is missing.");
                return result.getString(1);
            }
        }
    }

    private static String seededPopulation(Connection connection, String stationId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT population_id FROM npc_population_state WHERE station_id=?")) {
            statement.setString(1, stationId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Station trigger chain did not seed a population authority.");
                return result.getString(1);
            }
        }
    }

    private static void requireIdle(Population origin, Vessel vessel) throws SQLException {
        if (!vessel.worldId().equals(origin.worldId())
                || !vessel.currentLocationId().equals(origin.locationId())
                || !vessel.status().equals("DOCKED") || vessel.missionId() != null) {
            throw new SQLException("Assigned founding transport is not idle at the origin station.");
        }
    }

    record FoundingPlanRequest(String projectId, String originPopulationId, String assignedVesselId,
                               long quantity, long tick, String summary) {
        FoundingPlanRequest {
            projectId = NpcPopulationMigrationTransaction.token(projectId, "projectId");
            originPopulationId = NpcPopulationMigrationTransaction.token(originPopulationId, "originPopulationId");
            assignedVesselId = NpcPopulationMigrationTransaction.token(assignedVesselId, "assignedVesselId");
            NpcPopulationMigrationTransaction.requireTick(tick);
            summary = NpcPopulationMigrationTransaction.text(summary, "summary", 1_000);
        }
    }

    record HandoffResult(String projectId, String flowId, String stationId, String populationId,
                         long settledQuantity, long handoffTick) { }

    private record Project(String projectId, String worldId, String status, String sponsorFaction,
                           String targetLocationId, String relatedPopulationId, String assignedVesselId,
                           int requiredMaterials, int committedMaterials, int requiredSupplies,
                           int committedSupplies, int requiredPopulation, int committedPopulation,
                           int requiredSecurity, int currentSecurity) { }

    private record FoundingFlow(String flowId, String projectId, long requiredPopulation) { }
    private record FoundingArrival(String flowId, long arrivedQuantity, long losses) { }
}
