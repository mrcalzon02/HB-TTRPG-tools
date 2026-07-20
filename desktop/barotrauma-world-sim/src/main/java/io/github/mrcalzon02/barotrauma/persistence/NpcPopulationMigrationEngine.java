package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.Flow;
import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.FlowKind;
import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.PlanRequest;
import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.Population;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Deterministic schema-028 passive planner and transit synchronizer.
 *
 * <p>This class does not mutate population or flow lifecycle fields directly. It reads the existing station,
 * demographic, vessel, and transit authorities and invokes {@link NpcPopulationMigrationTransaction} for every
 * lifecycle mutation.</p>
 */
final class NpcPopulationMigrationEngine {
    private static final int MAX_FLOW_QUANTITY = 100;

    private NpcPopulationMigrationEngine() { }

    static CycleResult advanceAndPlan(Connection connection, UUID worldId, long tick) throws SQLException {
        Objects.requireNonNull(connection, "connection");
        Objects.requireNonNull(worldId, "worldId");
        NpcPopulationMigrationTransaction.requireTick(tick);
        int synchronizedFlows = synchronizeActiveFlows(connection, worldId.toString(), tick);
        String plannedFlowId = planOneFlow(connection, worldId.toString(), tick);
        return new CycleResult(synchronizedFlows, plannedFlowId == null ? 0 : 1, plannedFlowId);
    }

    private static int synchronizeActiveFlows(Connection connection, String worldId, long tick) throws SQLException {
        List<String> flowIds = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT flow_id FROM population_flow WHERE world_id=? AND entity_type='NPC_POPULATION' "
                        + "AND status IN ('PREPARING','IN_TRANSIT','RETURNING') ORDER BY created_tick,flow_id")) {
            statement.setString(1, worldId);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) flowIds.add(result.getString(1));
            }
        }

        int synchronizedFlows = 0;
        for (String flowId : flowIds) {
            Flow flow = NpcPopulationMigrationStore.flow(connection, flowId);
            VesselSnapshot vessel = vessel(connection, flow.vesselId());
            synchronizeProgress(connection, flowId, vessel.vesselId(), tick);
            switch (flow.status()) {
                case "PREPARING" -> {
                    if (vessel.status().equals("IN_TRANSIT")
                            && NpcPopulationMigrationStore.activeLeg(connection, vessel.vesselId(),
                            flow.destinationLocationId()) != null) {
                        NpcPopulationMigrationTransaction.depart(connection, flowId, tick);
                        synchronizedFlows++;
                    } else if (vessel.status().equals("LOST") || vessel.status().equals("DISABLED")) {
                        NpcPopulationMigrationTransaction.fail(connection, flowId, tick, 0, 0,
                                "Assigned transport failed before the population departed.");
                        synchronizedFlows++;
                    }
                }
                case "IN_TRANSIT" -> {
                    if (vessel.status().equals("WORKING")
                            && vessel.currentLocationId().equals(flow.destinationLocationId())) {
                        Population destination = NpcPopulationMigrationStore.population(
                                connection, flow.destinationPopulationId());
                        if (flow.embarkedQuantity() > NpcPopulationMigrationStore.destinationSpare(destination, flow.kind())) {
                            NpcPopulationMigrationTransaction.beginReturn(connection, flowId, tick,
                                    "Destination capacity fell below the surviving embarked population.");
                        } else {
                            NpcPopulationMigrationTransaction.arrive(connection, flowId, tick,
                                    travelLosses(flow, vessel, tick));
                        }
                        synchronizedFlows++;
                    } else if (vessel.status().equals("LOST")) {
                        NpcPopulationMigrationTransaction.fail(connection, flowId, tick,
                                flow.embarkedQuantity(), 0, "Migration transport was lost in transit.");
                        synchronizedFlows++;
                    } else if (vessel.status().equals("DISABLED")) {
                        long losses = disabledLosses(flow, vessel, tick);
                        NpcPopulationMigrationTransaction.fail(connection, flowId, tick, losses,
                                flow.embarkedQuantity() - losses,
                                "Migration transport was disabled; surviving passengers remain stranded.");
                        synchronizedFlows++;
                    }
                }
                case "RETURNING" -> {
                    if (vessel.status().equals("WORKING")
                            && vessel.currentLocationId().equals(flow.originLocationId())) {
                        NpcPopulationMigrationTransaction.completeReturn(connection, flowId, tick,
                                travelLosses(flow, vessel, tick));
                        synchronizedFlows++;
                    } else if (vessel.status().equals("LOST")) {
                        NpcPopulationMigrationTransaction.fail(connection, flowId, tick,
                                flow.embarkedQuantity(), 0, "Returning migration transport was lost.");
                        synchronizedFlows++;
                    } else if (vessel.status().equals("DISABLED")) {
                        long losses = disabledLosses(flow, vessel, tick);
                        NpcPopulationMigrationTransaction.fail(connection, flowId, tick, losses,
                                flow.embarkedQuantity() - losses,
                                "Returning migration transport was disabled; survivors remain stranded.");
                        synchronizedFlows++;
                    }
                }
                default -> { }
            }
        }
        return synchronizedFlows;
    }

    private static String planOneFlow(Connection connection, String worldId, long tick) throws SQLException {
        List<OriginCandidate> origins = origins(connection, worldId, tick);
        origins.sort(Comparator.comparingInt(OriginCandidate::priority).reversed()
                .thenComparing(OriginCandidate::populationId));
        for (OriginCandidate origin : origins) {
            FlowKind kind = kind(origin);
            if (kind == null) continue;
            long requested = requestedQuantity(origin, kind);
            if (requested < 1) continue;
            DestinationCandidate destination = destination(connection, worldId, origin, kind, requested, tick);
            if (destination == null) continue;
            String vesselId = idleVessel(connection, worldId, origin.stationId(), origin.locationId(), kind);
            if (vesselId == null) continue;
            String summary = "Passive " + kind.name().toLowerCase().replace('_', ' ')
                    + " planned from " + origin.stationName() + " to " + destination.stationName()
                    + " after pressure=" + origin.pressure() + ", support=" + origin.support()
                    + ", morale=" + origin.morale() + ".";
            var planned = NpcPopulationMigrationTransaction.plan(connection,
                    new PlanRequest(kind, origin.populationId(), destination.populationId(), vesselId,
                            Math.min(requested, destination.spare()), tick, summary));
            NpcPopulationMigrationTransaction.prepare(connection, planned.flowId(), tick);
            return planned.flowId();
        }
        return null;
    }

    private static List<OriginCandidate> origins(Connection connection, String worldId, long tick)
            throws SQLException {
        String sql = "SELECT p.population_id,p.station_id,ws.location_id,ws.display_name,"
                + "p.civilians+p.industrial_workers+p.logistics_workers+p.security_personnel+"
                + "p.medical_personnel+p.scientific_personnel+p.temporary_residents+p.refugees total_population,"
                + "p.industrial_workers+p.logistics_workers+p.security_personnel+p.medical_personnel+"
                + "p.scientific_personnel workforce,p.employment_capacity,p.morale,s.supplies,s.integrity,s.threat,"
                + "s.status,COALESCE(c.frontier_state,'HOLDING') frontier_state,"
                + "COALESCE(d.support_score,MAX(0,MIN(100,(s.supplies+s.integrity+s.security+(100-s.threat)+p.morale)/5))) support_score,"
                + "COALESCE(d.pressure_score,MAX(0,MIN(100,(100-s.supplies)+(100-s.integrity)+s.threat+(100-p.morale))/4)) pressure_score,"
                + "COALESCE(d.shortage_pressure_ticks,0) shortage_ticks,COALESCE(d.overcrowding_ticks,0) overcrowding_ticks,"
                + "COALESCE(d.overcrowding_state,'WITHIN_CAPACITY') overcrowding_state "
                + "FROM npc_population_state p JOIN world_station ws ON ws.station_id=p.station_id "
                + "JOIN station_simulation_state s ON s.station_id=p.station_id "
                + "LEFT JOIN station_civilization_state c ON c.station_id=p.station_id "
                + "LEFT JOIN npc_demographic_tick_result d ON d.population_id=p.population_id AND d.tick_sequence=? "
                + "WHERE p.world_id=? AND (p.civilians+p.industrial_workers+p.logistics_workers+p.security_personnel+"
                + "p.medical_personnel+p.scientific_personnel+p.temporary_residents+p.refugees)>0 "
                + "AND NOT EXISTS(SELECT 1 FROM population_flow f WHERE f.population_id=p.population_id "
                + "AND f.entity_type='NPC_POPULATION' AND f.status IN ('PLANNED','PREPARING','IN_TRANSIT','RETURNING'))";
        List<OriginCandidate> result = new ArrayList<>();
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, tick);
            statement.setString(2, worldId);
            try (ResultSet rows = statement.executeQuery()) {
                while (rows.next()) {
                    OriginCandidate candidate = new OriginCandidate(rows.getString(1), rows.getString(2),
                            rows.getString(3), rows.getString(4), rows.getLong(5), rows.getLong(6),
                            rows.getLong(7), rows.getInt(8), rows.getInt(9), rows.getInt(10), rows.getInt(11),
                            rows.getString(12), rows.getString(13), rows.getInt(14), rows.getInt(15),
                            rows.getInt(16), rows.getInt(17), rows.getString(18));
                    result.add(candidate.withPriority(priority(candidate)));
                }
            }
        }
        return result;
    }

    private static DestinationCandidate destination(Connection connection, String worldId, OriginCandidate origin,
                                                    FlowKind kind, long quantity, long tick) throws SQLException {
        String capacity = kind == FlowKind.WORKER_TRANSFER
                ? "MIN(p.housing_capacity,p.life_support_capacity,p.employment_capacity)"
                : "MIN(p.housing_capacity,p.life_support_capacity)";
        String sql = "SELECT p.population_id,p.station_id,ws.location_id,ws.display_name,"
                + capacity + "-(p.civilians+p.industrial_workers+p.logistics_workers+p.security_personnel+"
                + "p.medical_personnel+p.scientific_personnel+p.temporary_residents+p.refugees) spare,"
                + "p.morale,s.supplies,s.integrity,s.threat,"
                + "COALESCE(d.support_score,MAX(0,MIN(100,(s.supplies+s.integrity+s.security+(100-s.threat)+p.morale)/5))) support_score "
                + "FROM npc_population_state p JOIN world_station ws ON ws.station_id=p.station_id "
                + "JOIN station_simulation_state s ON s.station_id=p.station_id "
                + "LEFT JOIN station_civilization_state c ON c.station_id=p.station_id "
                + "LEFT JOIN npc_demographic_tick_result d ON d.population_id=p.population_id AND d.tick_sequence=? "
                + "WHERE p.world_id=? AND p.population_id<>? AND s.status<>'FALLEN' "
                + "AND COALESCE(c.frontier_state,'HOLDING')<>'ABANDONED' AND " + capacity
                + "-(p.civilians+p.industrial_workers+p.logistics_workers+p.security_personnel+"
                + "p.medical_personnel+p.scientific_personnel+p.temporary_residents+p.refugees)>=? "
                + "ORDER BY (p.morale+s.supplies+s.integrity-s.threat+"
                + "COALESCE(d.support_score,0)) DESC,spare DESC,p.population_id";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, tick);
            statement.setString(2, worldId);
            statement.setString(3, origin.populationId());
            statement.setLong(4, quantity);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) return null;
                DestinationCandidate candidate = new DestinationCandidate(result.getString(1), result.getString(2),
                        result.getString(3), result.getString(4), result.getLong(5), result.getInt(6),
                        result.getInt(7), result.getInt(8), result.getInt(9), result.getInt(10));
                int destinationQuality = candidate.morale() + candidate.supplies() + candidate.integrity()
                        - candidate.threat() + candidate.support();
                int originQuality = origin.morale() + origin.supplies() + origin.integrity()
                        - origin.threat() + origin.support();
                return kind == FlowKind.EMERGENCY_RELOCATION || destinationQuality >= originQuality + 20
                        ? candidate : null;
            }
        }
    }

    private static String idleVessel(Connection connection, String worldId, String stationId,
                                     String locationId, FlowKind kind) throws SQLException {
        String sql = "SELECT v.npc_vessel_id FROM npc_vessel v WHERE v.world_id=? AND v.home_station_id=? "
                + "AND v.current_location_id=? AND v.status='DOCKED' AND v.mission_id IS NULL "
                + "AND NOT EXISTS(SELECT 1 FROM population_flow f WHERE f.assigned_npc_vessel_id=v.npc_vessel_id "
                + "AND f.status IN ('PLANNED','PREPARING','IN_TRANSIT','RETURNING')) "
                + "ORDER BY CASE WHEN ? IN ('REFUGEE_EVACUATION','EMERGENCY_RELOCATION') AND v.role IN ('COURIER','PATROL','TRADER') THEN 0 "
                + "WHEN ?='WORKER_TRANSFER' AND v.role IN ('TRADER','COURIER') THEN 0 ELSE 1 END,"
                + "v.hull DESC,v.supplies DESC,v.npc_vessel_id LIMIT 1";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, worldId);
            statement.setString(2, stationId);
            statement.setString(3, locationId);
            statement.setString(4, kind.name());
            statement.setString(5, kind.name());
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? result.getString(1) : null;
            }
        }
    }

    private static void synchronizeProgress(Connection connection, String flowId, String vesselId, long tick)
            throws SQLException {
        String sql = "UPDATE population_flow SET progress_ticks=COALESCE((SELECT elapsed_ticks FROM npc_transit_leg "
                + "WHERE npc_vessel_id=? ORDER BY started_tick DESC LIMIT 1),progress_ticks),updated_tick=MAX(updated_tick,?) "
                + "WHERE flow_id=? AND status IN ('PREPARING','IN_TRANSIT','RETURNING')";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, vesselId);
            statement.setLong(2, tick);
            statement.setString(3, flowId);
            statement.executeUpdate();
        }
    }

    private static VesselSnapshot vessel(Connection connection, String vesselId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT npc_vessel_id,status,current_location_id,hull FROM npc_vessel WHERE npc_vessel_id=?")) {
            statement.setString(1, vesselId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Population flow transport disappeared: " + vesselId);
                return new VesselSnapshot(result.getString(1), result.getString(2), result.getString(3),
                        result.getInt(4));
            }
        }
    }

    private static FlowKind kind(OriginCandidate origin) {
        if (origin.status().equals("FALLEN") || origin.frontierState().equals("ABANDONED")) return null;
        if (origin.integrity() <= 30 || origin.threat() >= 85 || origin.status().equals("BESIEGED")) {
            return FlowKind.EMERGENCY_RELOCATION;
        }
        if (origin.pressure() >= 70 || origin.shortageTicks() >= 4
                || origin.overcrowdingState().equals("CRITICAL")) {
            return FlowKind.REFUGEE_EVACUATION;
        }
        if (origin.workforce() > origin.employment() + 20) return FlowKind.WORKER_TRANSFER;
        if (origin.morale() < 45 && origin.pressure() >= 45) return FlowKind.ORDINARY_MIGRATION;
        return null;
    }

    private static int priority(OriginCandidate origin) {
        FlowKind kind = kind(origin);
        if (kind == null) return 0;
        int classScore = switch (kind) {
            case EMERGENCY_RELOCATION -> 400;
            case REFUGEE_EVACUATION -> 300;
            case WORKER_TRANSFER -> 200;
            case ORDINARY_MIGRATION -> 100;
        };
        return classScore + origin.pressure() + origin.threat() + Math.max(0, 50 - origin.integrity())
                + Math.max(0, 50 - origin.morale());
    }

    private static long requestedQuantity(OriginCandidate origin, FlowKind kind) {
        long value = switch (kind) {
            case EMERGENCY_RELOCATION -> Math.max(10, origin.total() / 10);
            case REFUGEE_EVACUATION -> Math.max(10, origin.total() / 20);
            case WORKER_TRANSFER -> Math.max(5, origin.workforce() - origin.employment());
            case ORDINARY_MIGRATION -> Math.max(5, origin.total() / 50);
        };
        return Math.min(Math.min(origin.total(), MAX_FLOW_QUANTITY), value);
    }

    private static long travelLosses(Flow flow, VesselSnapshot vessel, long tick) {
        int damage = Math.max(0, 100 - vessel.hull());
        if (damage < 35 || flow.embarkedQuantity() == 0) return 0;
        long base = Math.max(1, flow.embarkedQuantity() * damage / 1_500);
        long deterministicExtra = Math.floorMod(Objects.hash(flow.flowId(), tick), 3);
        return Math.min(flow.embarkedQuantity(), base + deterministicExtra);
    }

    private static long disabledLosses(Flow flow, VesselSnapshot vessel, long tick) {
        if (flow.embarkedQuantity() == 0) return 0;
        int damage = Math.max(80, 100 - vessel.hull());
        long base = Math.max(1, flow.embarkedQuantity() * damage / 500);
        long deterministicExtra = Math.floorMod(Objects.hash(flow.flowId(), tick, vessel.hull()), 4);
        return Math.min(flow.embarkedQuantity(), base + deterministicExtra);
    }

    record CycleResult(int synchronizedFlows, int plannedFlows, String plannedFlowId) { }

    private record VesselSnapshot(String vesselId, String status, String currentLocationId, int hull) { }

    private record DestinationCandidate(String populationId, String stationId, String locationId,
                                        String stationName, long spare, int morale, int supplies,
                                        int integrity, int threat, int support) { }

    private record OriginCandidate(String populationId, String stationId, String locationId, String stationName,
                                   long total, long workforce, long employment, int morale, int supplies,
                                   int integrity, int threat, String status, String frontierState, int support,
                                   int pressure, int shortageTicks, int overcrowdingTicks,
                                   String overcrowdingState, int priority) {
        OriginCandidate(String populationId, String stationId, String locationId, String stationName,
                        long total, long workforce, long employment, int morale, int supplies,
                        int integrity, int threat, String status, String frontierState, int support,
                        int pressure, int shortageTicks, int overcrowdingTicks, String overcrowdingState) {
            this(populationId, stationId, locationId, stationName, total, workforce, employment, morale,
                    supplies, integrity, threat, status, frontierState, support, pressure, shortageTicks,
                    overcrowdingTicks, overcrowdingState, 0);
        }

        OriginCandidate withPriority(int value) {
            return new OriginCandidate(populationId, stationId, locationId, stationName, total, workforce,
                    employment, morale, supplies, integrity, threat, status, frontierState, support, pressure,
                    shortageTicks, overcrowdingTicks, overcrowdingState, value);
        }
    }
}
