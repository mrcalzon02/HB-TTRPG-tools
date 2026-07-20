package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.Cohort;
import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.Flow;
import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.FlowKind;
import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.FlowResult;
import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.OutcomeAllocation;
import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.Population;
import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.TransitLeg;
import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.Vessel;
import io.github.mrcalzon02.barotrauma.simulation.NpcTransitScheduleEngine;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.EnumMap;
import java.util.List;

/** Direct schema-028 storage operations used by the authoritative migration transaction. */
final class NpcPopulationMigrationStore {
    private NpcPopulationMigrationStore() { }

    static Population population(Connection connection, String populationId) throws SQLException {
        String sql = "SELECT p.population_id,p.world_id,p.station_id,w.location_id,p.civilians,"
                + "p.industrial_workers,p.logistics_workers,p.security_personnel,p.medical_personnel,"
                + "p.scientific_personnel,p.temporary_residents,p.refugees,p.housing_capacity,"
                + "p.life_support_capacity,p.employment_capacity,p.morale,r.baseline_population_per_index,"
                + "c.population_index FROM npc_population_state p JOIN world_station w ON w.station_id=p.station_id "
                + "JOIN npc_population_reconciliation r ON r.population_id=p.population_id "
                + "JOIN station_civilization_state c ON c.station_id=p.station_id WHERE p.population_id=?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, NpcPopulationMigrationTransaction.token(populationId, "populationId"));
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Unknown NPC population: " + populationId);
                EnumMap<Cohort, Long> cohorts = zeroCohorts();
                for (Cohort cohort : Cohort.values()) cohorts.put(cohort, result.getLong(cohort.column()));
                return new Population(result.getString("population_id"), result.getString("world_id"),
                        result.getString("station_id"), result.getString("location_id"), cohorts,
                        result.getLong("housing_capacity"), result.getLong("life_support_capacity"),
                        result.getLong("employment_capacity"), result.getInt("morale"),
                        result.getDouble("baseline_population_per_index"), result.getInt("population_index"));
            }
        }
    }

    static Vessel vessel(Connection connection, String vesselId) throws SQLException {
        String sql = "SELECT npc_vessel_id,world_id,current_location_id,destination_location_id,mission_id,status "
                + "FROM npc_vessel WHERE npc_vessel_id=?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, NpcPopulationMigrationTransaction.token(vesselId, "assignedVesselId"));
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Unknown NPC migration transport: " + vesselId);
                return new Vessel(result.getString(1), result.getString(2), result.getString(3),
                        result.getString(4), result.getString(5), result.getString(6));
            }
        }
    }

    static Flow flow(Connection connection, String flowId) throws SQLException {
        String sql = "SELECT flow_id,world_id,population_id,destination_population_id,flow_kind,status,quantity,"
                + "embarked_quantity,origin_released,origin_location_id,destination_location_id,origin_station_id,"
                + "destination_station_id,assigned_npc_vessel_id FROM population_flow WHERE flow_id=?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, flowId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Unknown population flow: " + flowId);
                return new Flow(result.getString(1), result.getString(2), result.getString(3),
                        result.getString(4), FlowKind.valueOf(result.getString(5)), result.getString(6),
                        result.getLong(7), result.getLong(8), result.getInt(9) == 1, result.getString(10),
                        result.getString(11), result.getString(12), result.getString(13), result.getString(14));
            }
        }
    }

    static void insertFlow(Connection connection, String flowId, Population origin, Population destination,
                           Vessel vessel, FlowKind kind, long quantity, long tick, String summary) throws SQLException {
        int units = Math.toIntExact(Math.max(1L, (quantity + 99L) / 100L));
        long capacity = Math.multiplyExact(units, 100L);
        String sql = "INSERT INTO population_flow(flow_id,world_id,entity_type,population_id,origin_location_id,"
                + "destination_location_id,quantity,cause,status,departure_tick,arrival_tick,losses,created_tick,"
                + "updated_tick,summary,flow_kind,destination_population_id,origin_station_id,destination_station_id,"
                + "assigned_npc_vessel_id,transport_units_required,transport_capacity,reserved_quantity,"
                + "embarked_quantity,arrived_quantity,returned_quantity,stranded_quantity,progress_ticks,origin_released) "
                + "VALUES (?,?,'NPC_POPULATION',?,?,?,?,?,'PLANNED',NULL,NULL,0,?,?,?,?,?,?,?,?,?,?,0,0,0,0,0,0,0)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            int parameter = 1;
            statement.setString(parameter++, flowId);
            statement.setString(parameter++, origin.worldId());
            statement.setString(parameter++, origin.populationId());
            statement.setString(parameter++, origin.locationId());
            statement.setString(parameter++, destination.locationId());
            statement.setLong(parameter++, quantity);
            statement.setString(parameter++, NpcPopulationMigrationTransaction.cause(kind, false));
            statement.setLong(parameter++, tick);
            statement.setLong(parameter++, tick);
            statement.setString(parameter++, summary);
            statement.setString(parameter++, kind.name());
            statement.setString(parameter++, destination.populationId());
            statement.setString(parameter++, origin.stationId());
            statement.setString(parameter++, destination.stationId());
            statement.setString(parameter++, vessel.vesselId());
            statement.setInt(parameter++, units);
            statement.setLong(parameter, capacity);
            statement.executeUpdate();
        }
    }

    static TransitLeg activeLeg(Connection connection, String vesselId, String destination) throws SQLException {
        String sql = "SELECT leg_id,base_duration_ticks,elapsed_ticks FROM npc_transit_leg WHERE npc_vessel_id=? "
                + "AND destination_location_id=? AND status='IN_TRANSIT' ORDER BY started_tick DESC LIMIT 1";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, vesselId);
            statement.setString(2, destination);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? new TransitLeg(result.getString(1), result.getInt(2), result.getInt(3)) : null;
            }
        }
    }

    static void requireArrivedLeg(Connection connection, Vessel vessel, String location, String legType)
            throws SQLException {
        if (!vessel.status().equals("WORKING") || !vessel.currentLocationId().equals(location)) {
            throw new SQLException("Migration transport has not physically arrived at the required location.");
        }
        String sql = "SELECT 1 FROM npc_transit_leg WHERE npc_vessel_id=? AND destination_location_id=? "
                + "AND leg_type=? AND status='ARRIVED' ORDER BY started_tick DESC LIMIT 1";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, vessel.vesselId());
            statement.setString(2, location);
            statement.setString(3, legType);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Migration transport lacks an arrived transit leg.");
            }
        }
    }

    static EnumMap<Cohort, Long> allocate(Population population, FlowKind kind, long quantity) {
        List<Cohort> order = switch (kind) {
            case WORKER_TRANSFER -> List.of(Cohort.LOGISTICS_WORKERS, Cohort.INDUSTRIAL_WORKERS,
                    Cohort.SCIENTIFIC_PERSONNEL, Cohort.MEDICAL_PERSONNEL, Cohort.SECURITY_PERSONNEL,
                    Cohort.CIVILIANS, Cohort.TEMPORARY_RESIDENTS, Cohort.REFUGEES);
            case REFUGEE_EVACUATION, EMERGENCY_RELOCATION -> List.of(Cohort.REFUGEES,
                    Cohort.TEMPORARY_RESIDENTS, Cohort.CIVILIANS, Cohort.MEDICAL_PERSONNEL,
                    Cohort.LOGISTICS_WORKERS, Cohort.INDUSTRIAL_WORKERS, Cohort.SECURITY_PERSONNEL,
                    Cohort.SCIENTIFIC_PERSONNEL);
            case ORDINARY_MIGRATION -> List.of(Cohort.CIVILIANS, Cohort.TEMPORARY_RESIDENTS,
                    Cohort.REFUGEES, Cohort.INDUSTRIAL_WORKERS, Cohort.LOGISTICS_WORKERS,
                    Cohort.SECURITY_PERSONNEL, Cohort.MEDICAL_PERSONNEL, Cohort.SCIENTIFIC_PERSONNEL);
        };
        EnumMap<Cohort, Long> allocation = zeroCohorts();
        long remaining = quantity;
        for (Cohort cohort : order) {
            long moved = Math.min(remaining, population.cohorts().get(cohort));
            allocation.put(cohort, moved);
            remaining -= moved;
            if (remaining == 0) break;
        }
        if (remaining != 0) throw new IllegalArgumentException("Cohort allocation did not cover the request.");
        return allocation;
    }

    static OutcomeAllocation outcome(EnumMap<Cohort, Long> embarked, long losses) {
        EnumMap<Cohort, Long> casualties = zeroCohorts();
        long remaining = losses;
        for (Cohort cohort : List.of(Cohort.CIVILIANS, Cohort.TEMPORARY_RESIDENTS, Cohort.REFUGEES,
                Cohort.INDUSTRIAL_WORKERS, Cohort.LOGISTICS_WORKERS, Cohort.SECURITY_PERSONNEL,
                Cohort.MEDICAL_PERSONNEL, Cohort.SCIENTIFIC_PERSONNEL)) {
            long value = Math.min(remaining, embarked.get(cohort));
            casualties.put(cohort, value);
            remaining -= value;
            if (remaining == 0) break;
        }
        if (remaining != 0) throw new IllegalArgumentException("Casualties exceed the embarked population.");
        EnumMap<Cohort, Long> survivors = zeroCohorts();
        for (Cohort cohort : Cohort.values()) survivors.put(cohort, embarked.get(cohort) - casualties.get(cohort));
        return new OutcomeAllocation(survivors, casualties);
    }

    static EnumMap<Cohort, Long> subtract(EnumMap<Cohort, Long> base, EnumMap<Cohort, Long> removed) {
        EnumMap<Cohort, Long> result = zeroCohorts();
        for (Cohort cohort : Cohort.values()) result.put(cohort, base.get(cohort) - removed.get(cohort));
        return result;
    }

    static void insertCohorts(Connection connection, String flowId, EnumMap<Cohort, Long> values)
            throws SQLException {
        String sql = "INSERT INTO npc_population_flow_cohort(flow_id,cohort_key,planned_quantity) VALUES(?,?,?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            for (Cohort cohort : Cohort.values()) {
                statement.setString(1, flowId);
                statement.setString(2, cohort.name());
                statement.setLong(3, values.get(cohort));
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    static EnumMap<Cohort, Long> cohorts(Connection connection, String flowId, String column) throws SQLException {
        if (!List.of("planned_quantity", "embarked_quantity", "arrived_quantity", "returned_quantity",
                "losses", "stranded_quantity").contains(column)) {
            throw new IllegalArgumentException("Unsupported cohort column: " + column);
        }
        EnumMap<Cohort, Long> values = zeroCohorts();
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT cohort_key," + column + " FROM npc_population_flow_cohort WHERE flow_id=?")) {
            statement.setString(1, flowId);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) values.put(Cohort.valueOf(result.getString(1)), result.getLong(2));
            }
        }
        return values;
    }

    static void updateCohorts(Connection connection, String flowId, String column,
                              EnumMap<Cohort, Long> values) throws SQLException {
        if (!List.of("embarked_quantity", "arrived_quantity", "returned_quantity", "losses",
                "stranded_quantity").contains(column)) {
            throw new IllegalArgumentException("Unsupported cohort outcome column: " + column);
        }
        try (PreparedStatement statement = connection.prepareStatement(
                "UPDATE npc_population_flow_cohort SET " + column + "=? WHERE flow_id=? AND cohort_key=?")) {
            for (Cohort cohort : Cohort.values()) {
                statement.setLong(1, values.get(cohort));
                statement.setString(2, flowId);
                statement.setString(3, cohort.name());
                statement.addBatch();
            }
            statement.executeBatch();
        }
    }

    static void validateAvailable(Population population, EnumMap<Cohort, Long> values) throws SQLException {
        for (Cohort cohort : Cohort.values()) {
            if (values.get(cohort) > population.cohorts().get(cohort)) {
                throw new SQLException("Origin cohort changed before departure: " + cohort);
            }
        }
    }

    static void applyCohortDelta(Connection connection, String populationId, EnumMap<Cohort, Long> values,
                                 int sign, long tick) throws SQLException {
        StringBuilder sql = new StringBuilder("UPDATE npc_population_state SET ");
        int index = 0;
        for (Cohort cohort : Cohort.values()) {
            if (index++ > 0) sql.append(',');
            sql.append(cohort.column()).append('=').append(cohort.column()).append(sign > 0 ? "+?" : "-?");
        }
        sql.append(",last_tick=? WHERE population_id=?");
        try (PreparedStatement statement = connection.prepareStatement(sql.toString())) {
            int parameter = 1;
            for (Cohort cohort : Cohort.values()) statement.setLong(parameter++, values.get(cohort));
            statement.setLong(parameter++, tick);
            statement.setString(parameter, populationId);
            if (statement.executeUpdate() != 1) throw new SQLException("NPC cohort mutation failed.");
        }
    }

    static void projectPopulation(Connection connection, String populationId, long tick) throws SQLException {
        Population population = population(connection, populationId);
        long total = population.total();
        long workforce = population.workforce();
        int index = populationIndex(total, population.baselinePerIndex());
        try (PreparedStatement station = connection.prepareStatement(
                     "UPDATE station_population_state SET resident_count=?,workforce_count=?,last_tick=? WHERE station_id=?");
             PreparedStatement reconciliation = connection.prepareStatement(
                     "UPDATE npc_population_reconciliation SET last_population_index=?,reconciliation_status='ALIGNED',"
                             + "last_detailed_population=?,last_tick=? WHERE population_id=?");
             PreparedStatement civilization = connection.prepareStatement(
                     "UPDATE station_civilization_state SET population_index=? WHERE station_id=?")) {
            station.setLong(1, total);
            station.setLong(2, workforce);
            station.setLong(3, tick);
            station.setString(4, population.stationId());
            station.executeUpdate();
            reconciliation.setInt(1, index);
            reconciliation.setLong(2, total);
            reconciliation.setLong(3, tick);
            reconciliation.setString(4, population.populationId());
            reconciliation.executeUpdate();
            civilization.setInt(1, index);
            civilization.setString(2, population.stationId());
            civilization.executeUpdate();
        }
    }

    static void dockVessel(Connection connection, String vesselId, String location, long tick) throws SQLException {
        String sql = "UPDATE npc_vessel SET current_location_id=?,destination_location_id=NULL,mission_id=NULL,"
                + "status='DOCKED',route_progress=0,route_ticks_required=1,last_tick=? WHERE npc_vessel_id=?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, location);
            statement.setLong(2, tick);
            statement.setString(3, vesselId);
            statement.executeUpdate();
        }
    }

    static int routeChallenges(Connection connection, String origin, String destination) throws SQLException {
        int[] first = coordinates(connection, origin);
        int[] second = coordinates(connection, destination);
        return NpcTransitScheduleEngine.playerEquivalentChallengeCount(first[0], first[1], second[0], second[1]);
    }

    private static int[] coordinates(Connection connection, String location) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT ring,location_level FROM world_location WHERE location_id=?")) {
            statement.setString(1, location);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Unknown migration route location.");
                return new int[]{result.getInt(1), result.getInt(2)};
            }
        }
    }

    static long destinationSpare(Population population, FlowKind kind) {
        long capacity = Math.min(population.housing(), population.lifeSupport());
        if (kind == FlowKind.WORKER_TRANSFER) capacity = Math.min(capacity, population.employment());
        return Math.max(0, capacity - population.total());
    }

    static int populationIndex(long total, double baseline) {
        if (baseline <= 0) return 0;
        return (int) Math.max(0, Math.min(100, Math.round(total / baseline)));
    }

    static FlowResult result(Connection connection, String flowId) throws SQLException {
        Flow flow = flow(connection, flowId);
        String sql = "SELECT reserved_quantity,arrived_quantity,returned_quantity,losses,stranded_quantity,"
                + "transit_leg_id,updated_tick FROM population_flow WHERE flow_id=?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, flowId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Population flow result disappeared.");
                return new FlowResult(flowId, flow.status(), flow.quantity(), result.getLong(1),
                        flow.embarkedQuantity(), result.getLong(2), result.getLong(3), result.getLong(4),
                        result.getLong(5), result.getString(6), result.getLong(7));
            }
        }
    }

    static EnumMap<Cohort, Long> zeroCohorts() {
        EnumMap<Cohort, Long> result = new EnumMap<>(Cohort.class);
        for (Cohort cohort : Cohort.values()) result.put(cohort, 0L);
        return result;
    }
}
