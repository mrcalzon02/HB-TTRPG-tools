package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Creates and settles deterministic, allocation-backed station-defense plans inside a passive tick. */
final class FactionPlanTransaction {
    static final int DEFENSE_CREDITS = 1_000;
    static final int DEFENSE_PERSONNEL = 5;
    static final int DEFENSE_AMMUNITION = 4;
    static final int DEFENSE_SECURITY = 5;
    static final int DEFENSE_THREAT = 8;

    private FactionPlanTransaction() { }

    static void settleDuePlans(Connection connection, UUID worldId, long tick) throws SQLException {
        List<DuePlan> plans = new ArrayList<>();
        String sql = "SELECT p.plan_id,p.target_station_id,p.sponsor_faction,b.outstanding_credits,"
                + "b.outstanding_personnel,b.outstanding_equipment FROM faction_plan p "
                + "JOIN faction_plan_resource_balance b ON b.plan_id=p.plan_id "
                + "WHERE p.world_id=? AND p.status='ACTIVE' AND p.phase='PREPARATION' "
                + "AND p.due_tick<=? AND b.backing_status='FULLY_BACKED' ORDER BY p.plan_id";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, worldId.toString());
            statement.setLong(2, tick);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) plans.add(new DuePlan(result.getString("plan_id"),
                        result.getString("target_station_id"), result.getString("sponsor_faction"),
                        result.getInt("outstanding_credits"), result.getInt("outstanding_personnel"),
                        result.getInt("outstanding_equipment")));
            }
        }
        for (DuePlan plan : plans) settle(connection, worldId, tick, plan);
    }

    static void createDefensivePlans(Connection connection, UUID worldId, long tick) throws SQLException {
        List<AttackCandidate> candidates = new ArrayList<>();
        String sql = "SELECT f.event_id,f.station_id,ws.display_name,"
                + "COALESCE(NULLIF(trim(ws.faction),''),'Station Council') sponsor_faction,"
                + "a.available_credits,a.available_workforce,a.available_ammunition,a.ammunition_reserved "
                + "FROM civilization_frontier_event f JOIN world_station ws ON ws.station_id=f.station_id "
                + "JOIN station_faction_resource_availability a ON a.station_id=f.station_id "
                + "WHERE f.world_id=? AND f.tick_sequence=? AND f.event_type='MONSTER_ATTACK' "
                + "AND NOT EXISTS (SELECT 1 FROM faction_plan p "
                + "WHERE p.plan_id=f.station_id||':defense-plan:'||f.tick_sequence) ORDER BY f.station_id";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, worldId.toString());
            statement.setLong(2, tick);
            try (ResultSet result = statement.executeQuery()) {
                while (result.next()) candidates.add(new AttackCandidate(result.getString("event_id"),
                        result.getString("station_id"), worldId + ":tick:" + tick,
                        result.getString("display_name"), result.getString("sponsor_faction"),
                        result.getInt("available_credits"), result.getInt("available_workforce"),
                        result.getInt("available_ammunition"), result.getInt("ammunition_reserved")));
            }
        }
        for (AttackCandidate candidate : candidates) create(connection, worldId, tick, candidate);
    }

    private static void create(Connection connection, UUID worldId, long tick, AttackCandidate candidate)
            throws SQLException {
        String planId = candidate.stationId() + ":defense-plan:" + tick;
        String objective = "Defend " + candidate.stationName() + " after fauna attack " + tick;
        boolean funded = candidate.availableCredits() >= DEFENSE_CREDITS
                && candidate.availableWorkforce() >= DEFENSE_PERSONNEL
                && candidate.availableAmmunition() >= DEFENSE_AMMUNITION;
        String insertPlan = "INSERT INTO faction_plan(plan_id,world_id,sponsor_faction,target_station_id,objective,"
                + "phase,status,created_tick,updated_tick,due_tick,credits_required,credits_reserved,credits_spent,"
                + "personnel_required,personnel_reserved,equipment_required,equipment_reserved) "
                + "VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
        try (PreparedStatement statement = connection.prepareStatement(insertPlan)) {
            statement.setString(1, planId);
            statement.setString(2, worldId.toString());
            statement.setString(3, candidate.sponsorFaction());
            statement.setString(4, candidate.stationId());
            statement.setString(5, objective);
            statement.setString(6, funded ? "PREPARATION" : "FAILED");
            statement.setString(7, funded ? "PLANNED" : "FAILED");
            statement.setLong(8, tick);
            statement.setLong(9, tick);
            statement.setLong(10, tick + 1);
            statement.setInt(11, DEFENSE_CREDITS);
            statement.setInt(12, 0);
            statement.setInt(13, 0);
            statement.setInt(14, DEFENSE_PERSONNEL);
            statement.setInt(15, 0);
            statement.setInt(16, DEFENSE_AMMUNITION);
            statement.setInt(17, 0);
            statement.executeUpdate();
        }
        if (!funded) {
            emitFailure(connection, worldId, tick, planId, candidate);
            return;
        }

        try (PreparedStatement credits = connection.prepareStatement(
                "UPDATE station_simulation_state SET credits=credits-? WHERE station_id=? AND credits>=?");
             PreparedStatement ammunition = connection.prepareStatement(
                     "UPDATE station_inventory SET reserved=reserved+?,last_tick=? "
                             + "WHERE station_id=? AND item_id='item-ammunition' AND quantity-reserved>=?")) {
            credits.setInt(1, DEFENSE_CREDITS);
            credits.setString(2, candidate.stationId());
            credits.setInt(3, DEFENSE_CREDITS);
            requireOne(credits.executeUpdate(), "Defense credit escrow lost its backing.");
            ammunition.setInt(1, DEFENSE_AMMUNITION);
            ammunition.setLong(2, tick);
            ammunition.setString(3, candidate.stationId());
            ammunition.setInt(4, DEFENSE_AMMUNITION);
            requireOne(ammunition.executeUpdate(), "Defense ammunition reservation lost its backing.");
        }
        insertAllocation(connection, planId, candidate.stationId(), "CREDITS", "station-credits",
                DEFENSE_CREDITS, tick);
        insertAllocation(connection, planId, candidate.stationId(), "PERSONNEL", "station-workforce",
                DEFENSE_PERSONNEL, tick);
        insertAllocation(connection, planId, candidate.stationId(), "EQUIPMENT", "item-ammunition",
                DEFENSE_AMMUNITION, tick);
        try (PreparedStatement statement = connection.prepareStatement(
                "UPDATE faction_plan SET status='ACTIVE',credits_reserved=?,personnel_reserved=?,"
                        + "equipment_reserved=? WHERE plan_id=?")) {
            statement.setInt(1, DEFENSE_CREDITS);
            statement.setInt(2, DEFENSE_PERSONNEL);
            statement.setInt(3, DEFENSE_AMMUNITION);
            statement.setString(4, planId);
            requireOne(statement.executeUpdate(), "Funded defense plan was not activated.");
        }
        try (PreparedStatement treasury = connection.prepareStatement(
                "INSERT INTO treasury_transaction(transaction_id,world_id,station_id,tick_sequence,category,"
                        + "credits_delta,counterparty_type,counterparty_id,memo) VALUES (?,?,?,?,"
                        + "'ADJUSTMENT',?,'FACTION_PLAN',?,'Credits escrowed for station defense')")) {
            treasury.setString(1, planId + ":credit-escrow");
            treasury.setString(2, worldId.toString());
            treasury.setString(3, candidate.stationId());
            treasury.setLong(4, tick);
            treasury.setInt(5, -DEFENSE_CREDITS);
            treasury.setString(6, planId);
            treasury.executeUpdate();
        }
        String eventId = planId + ":preparation";
        insertEvent(connection, eventId, worldId, candidate.stationId(), tick, 3,
                "Faction defense resources were committed",
                candidate.sponsorFaction() + " escrowed credits, reserved ammunition, and assigned personnel "
                        + "to answer the measured fauna attack.",
                candidate.sponsorFaction(), "MONSTER_ATTACK", candidate.attackEventId(),
                "faction-plan:" + planId + ":preparation", candidate.correlationId());
        insertPlanEvent(connection, planId, eventId, "PREPARATION",
                DEFENSE_CREDITS, DEFENSE_PERSONNEL, DEFENSE_AMMUNITION);
        insertChange(connection, eventId + ":credits", eventId, "station.credits", candidate.availableCredits(),
                -DEFENSE_CREDITS, candidate.availableCredits() - DEFENSE_CREDITS,
                "credits", "FACTION_RESERVATION", candidate.stationId());
        insertChange(connection, eventId + ":personnel", eventId, "population.workforce_available",
                candidate.availableWorkforce(), -DEFENSE_PERSONNEL,
                candidate.availableWorkforce() - DEFENSE_PERSONNEL,
                "people", "FACTION_RESERVATION", candidate.stationId());
        insertChange(connection, eventId + ":ammunition", eventId, "inventory.ammunition.reserved",
                candidate.ammunitionReserved(), DEFENSE_AMMUNITION,
                candidate.ammunitionReserved() + DEFENSE_AMMUNITION,
                "units", "FACTION_RESERVATION", candidate.stationId());
    }

    private static void settle(Connection connection, UUID worldId, long tick, DuePlan plan) throws SQLException {
        PlanExecution before = executionState(connection, plan.stationId());
        if (plan.credits() <= 0 || plan.personnel() <= 0 || plan.equipment() <= 0
                || before.ammunitionReserved() < plan.equipment()
                || before.ammunitionQuantity() < plan.equipment()) {
            throw new SQLException("A funded defense plan lost its resource backing: " + plan.planId());
        }
        if (before.workforceCount() < before.outstandingPersonnel()) {
            failForInsufficientWorkforce(connection, worldId, tick, plan, before);
            return;
        }
        int securityAfter = Math.min(100, before.security() + DEFENSE_SECURITY);
        int threatAfter = Math.max(0, before.threat() - DEFENSE_THREAT);
        try (PreparedStatement station = connection.prepareStatement(
                "UPDATE station_simulation_state SET security=?,threat=? WHERE station_id=?");
             PreparedStatement ammunition = connection.prepareStatement(
                     "UPDATE station_inventory SET quantity=quantity-?,reserved=reserved-?,last_tick=? "
                             + "WHERE station_id=? AND item_id='item-ammunition' "
                             + "AND quantity>=? AND reserved>=?")) {
            station.setInt(1, securityAfter);
            station.setInt(2, threatAfter);
            station.setString(3, plan.stationId());
            requireOne(station.executeUpdate(), "Defense response station was not found.");
            ammunition.setInt(1, plan.equipment());
            ammunition.setInt(2, plan.equipment());
            ammunition.setLong(3, tick);
            ammunition.setString(4, plan.stationId());
            ammunition.setInt(5, plan.equipment());
            ammunition.setInt(6, plan.equipment());
            requireOne(ammunition.executeUpdate(), "Defense ammunition could not be consumed exactly once.");
        }
        settleAllocation(connection, plan.planId(), "CREDITS", plan.credits(), 0, tick);
        settleAllocation(connection, plan.planId(), "PERSONNEL", 0, plan.personnel(), tick);
        settleAllocation(connection, plan.planId(), "EQUIPMENT", plan.equipment(), 0, tick);
        PlanExecution after = executionState(connection, plan.stationId());
        try (PreparedStatement statement = connection.prepareStatement(
                "UPDATE faction_plan SET phase='COMPLETE',status='SUCCEEDED',updated_tick=?,credits_spent=? "
                        + "WHERE plan_id=? AND status='ACTIVE'")) {
            statement.setLong(1, tick);
            statement.setInt(2, plan.credits());
            statement.setString(3, plan.planId());
            requireOne(statement.executeUpdate(), "Defense plan was not completed exactly once.");
        }
        String eventId = plan.planId() + ":execution:" + tick;
        insertEvent(connection, eventId, worldId, plan.stationId(), tick, 3,
                "Faction defense plan executed",
                plan.sponsorFaction() + " consumed the escrowed ammunition, returned assigned personnel, "
                        + "and reinforced the station without deducting its credits twice.",
                plan.sponsorFaction(), "FACTION_PLAN", plan.planId(),
                "faction-plan:" + plan.planId() + ":execution", worldId + ":tick:" + tick);
        insertPlanEvent(connection, plan.planId(), eventId, "COMPLETE",
                -plan.credits(), -plan.personnel(), -plan.equipment());
        insertChange(connection, eventId + ":escrow", eventId, "faction.credits_escrow",
                plan.credits(), -plan.credits(), 0, "credits", "FACTION_EXPENDITURE", plan.stationId());
        if (after.availableWorkforce() != before.availableWorkforce()) insertChange(connection,
                eventId + ":personnel", eventId, "population.workforce_available",
                before.availableWorkforce(), after.availableWorkforce() - before.availableWorkforce(),
                after.availableWorkforce(), "people", "FACTION_RELEASE", plan.stationId());
        insertChange(connection, eventId + ":ammunition-quantity", eventId, "inventory.ammunition.quantity",
                before.ammunitionQuantity(), -plan.equipment(), before.ammunitionQuantity() - plan.equipment(),
                "units", "FACTION_EXPENDITURE", plan.stationId());
        insertChange(connection, eventId + ":ammunition-reserved", eventId, "inventory.ammunition.reserved",
                before.ammunitionReserved(), -plan.equipment(), before.ammunitionReserved() - plan.equipment(),
                "units", "FACTION_EXPENDITURE", plan.stationId());
        if (securityAfter != before.security()) insertChange(connection, eventId + ":security", eventId,
                "station.security", before.security(), securityAfter - before.security(), securityAfter,
                "points", "REINFORCEMENT", plan.stationId());
        if (threatAfter != before.threat()) insertChange(connection, eventId + ":threat", eventId,
                "station.threat", before.threat(), threatAfter - before.threat(), threatAfter,
                "points", "REINFORCEMENT", plan.stationId());
    }

    private static void failForInsufficientWorkforce(Connection connection, UUID worldId, long tick,
                                                     DuePlan plan, PlanExecution before) throws SQLException {
        try (PreparedStatement station = connection.prepareStatement(
                "UPDATE station_simulation_state SET credits=credits+? WHERE station_id=?");
             PreparedStatement ammunition = connection.prepareStatement(
                     "UPDATE station_inventory SET reserved=reserved-?,last_tick=? "
                             + "WHERE station_id=? AND item_id='item-ammunition' AND reserved>=?")) {
            station.setInt(1, plan.credits());
            station.setString(2, plan.stationId());
            requireOne(station.executeUpdate(), "Defense credit escrow could not be released.");
            ammunition.setInt(1, plan.equipment());
            ammunition.setLong(2, tick);
            ammunition.setString(3, plan.stationId());
            ammunition.setInt(4, plan.equipment());
            requireOne(ammunition.executeUpdate(), "Defense ammunition reservation could not be released.");
        }
        settleAllocation(connection, plan.planId(), "CREDITS", 0, plan.credits(), tick);
        settleAllocation(connection, plan.planId(), "PERSONNEL", 0, plan.personnel(), tick);
        settleAllocation(connection, plan.planId(), "EQUIPMENT", 0, plan.equipment(), tick);
        PlanExecution after = executionState(connection, plan.stationId());
        try (PreparedStatement statement = connection.prepareStatement(
                "UPDATE faction_plan SET phase='FAILED',status='FAILED',updated_tick=? "
                        + "WHERE plan_id=? AND status='ACTIVE'")) {
            statement.setLong(1, tick);
            statement.setString(2, plan.planId());
            requireOne(statement.executeUpdate(), "Understaffed defense plan was not failed exactly once.");
        }
        try (PreparedStatement treasury = connection.prepareStatement(
                "INSERT INTO treasury_transaction(transaction_id,world_id,station_id,tick_sequence,category,"
                        + "credits_delta,counterparty_type,counterparty_id,memo) VALUES (?,?,?,?,'ADJUSTMENT',?,"
                        + "'FACTION_PLAN',?,'Credits released after understaffed defense plan failed')")) {
            treasury.setString(1, plan.planId() + ":credit-release");
            treasury.setString(2, worldId.toString());
            treasury.setString(3, plan.stationId());
            treasury.setLong(4, tick);
            treasury.setInt(5, plan.credits());
            treasury.setString(6, plan.planId());
            treasury.executeUpdate();
        }
        String eventId = plan.planId() + ":failed-workforce:" + tick;
        insertEvent(connection, eventId, worldId, plan.stationId(), tick, 4,
                "Faction defense plan failed after a workforce loss",
                plan.sponsorFaction() + " had " + before.workforceCount() + " workers available to cover "
                        + before.outstandingPersonnel() + " outstanding station-defense assignments. This plan's "
                        + plan.personnel() + "-person assignment, credits, and ammunition were released without "
                        + "adding residents.",
                plan.sponsorFaction(), "FACTION_PLAN", plan.planId(),
                "faction-plan:" + plan.planId() + ":failed-workforce", worldId + ":tick:" + tick);
        insertPlanEvent(connection, plan.planId(), eventId, "FAILED",
                -plan.credits(), -plan.personnel(), -plan.equipment());
        insertChange(connection, eventId + ":escrow", eventId, "faction.credits_escrow",
                plan.credits(), -plan.credits(), 0, "credits", "FACTION_RELEASE", plan.stationId());
        insertChange(connection, eventId + ":credits", eventId, "station.credits",
                before.credits(), plan.credits(), after.credits(),
                "credits", "FACTION_RELEASE", plan.stationId());
        if (after.availableWorkforce() != before.availableWorkforce()) insertChange(connection,
                eventId + ":personnel", eventId, "population.workforce_available",
                before.availableWorkforce(), after.availableWorkforce() - before.availableWorkforce(),
                after.availableWorkforce(), "people", "FACTION_RELEASE", plan.stationId());
        insertChange(connection, eventId + ":ammunition", eventId, "inventory.ammunition.reserved",
                before.ammunitionReserved(), after.ammunitionReserved() - before.ammunitionReserved(),
                after.ammunitionReserved(), "units", "FACTION_RELEASE", plan.stationId());
    }

    private static void emitFailure(Connection connection, UUID worldId, long tick, String planId,
                                    AttackCandidate candidate) throws SQLException {
        String eventId = planId + ":failed";
        insertEvent(connection, eventId, worldId, candidate.stationId(), tick, 4,
                "Faction defense plan could not be funded",
                candidate.sponsorFaction() + " required " + DEFENSE_CREDITS + " credits, "
                        + DEFENSE_PERSONNEL + " available workers, and " + DEFENSE_AMMUNITION
                        + " unreserved ammunition, but the station had only " + candidate.availableCredits()
                        + ", " + candidate.availableWorkforce() + ", and "
                        + candidate.availableAmmunition() + ". No partial reservation was made.",
                candidate.sponsorFaction(), "MONSTER_ATTACK", candidate.attackEventId(),
                "faction-plan:" + planId + ":failed", candidate.correlationId());
        insertPlanEvent(connection, planId, eventId, "FAILED", 0, 0, 0);
    }

    private static PlanExecution executionState(Connection connection, String stationId) throws SQLException {
        String sql = "SELECT s.credits,s.security,s.threat,a.workforce_count,a.available_workforce,"
                + "COALESCE((SELECT SUM(r.reserved_units-r.consumed_units-r.released_units) "
                + "FROM faction_plan_resource_allocation r WHERE r.source_station_id=a.station_id "
                + "AND r.resource_type='PERSONNEL'),0) outstanding_personnel,"
                + "a.ammunition_quantity,a.ammunition_reserved "
                + "FROM station_simulation_state s JOIN station_faction_resource_availability a "
                + "ON a.station_id=s.station_id WHERE s.station_id=?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Defense station resources are missing: " + stationId);
                return new PlanExecution(result.getInt("credits"), result.getInt("security"),
                        result.getInt("threat"), result.getInt("workforce_count"),
                        result.getInt("available_workforce"), result.getInt("outstanding_personnel"),
                        result.getInt("ammunition_quantity"), result.getInt("ammunition_reserved"));
            }
        }
    }

    private static void insertAllocation(Connection connection, String planId, String stationId,
                                         String type, String resourceId, int amount, long tick) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO faction_plan_resource_allocation(plan_id,source_station_id,resource_type,resource_id,"
                        + "reserved_units,consumed_units,released_units,created_tick,updated_tick) "
                        + "VALUES (?,?,?,?,?,0,0,?,?)")) {
            statement.setString(1, planId);
            statement.setString(2, stationId);
            statement.setString(3, type);
            statement.setString(4, resourceId);
            statement.setInt(5, amount);
            statement.setLong(6, tick);
            statement.setLong(7, tick);
            statement.executeUpdate();
        }
    }

    private static void settleAllocation(Connection connection, String planId, String type,
                                         int consumed, int released, long tick) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "UPDATE faction_plan_resource_allocation SET consumed_units=consumed_units+?,"
                        + "released_units=released_units+?,updated_tick=? WHERE plan_id=? AND resource_type=? "
                        + "AND consumed_units+released_units+?+?<=reserved_units")) {
            statement.setInt(1, consumed);
            statement.setInt(2, released);
            statement.setLong(3, tick);
            statement.setString(4, planId);
            statement.setString(5, type);
            statement.setInt(6, consumed);
            statement.setInt(7, released);
            requireOne(statement.executeUpdate(), "Faction allocation could not be settled exactly once.");
        }
    }

    private static void insertEvent(Connection connection, String eventId, UUID worldId, String stationId,
                                    long tick, int severity, String headline, String narrative,
                                    String actorId, String causeType, String causeId,
                                    String deterministicKey, String correlationId) throws SQLException {
        String sql = "INSERT INTO station_event(event_id,world_id,station_id,tick_sequence,canonical_time,event_type,"
                + "severity,headline,narrative,actor_type,actor_id,cause_type,cause_id,deterministic_key,visibility,"
                + "correlation_id,policy_version,created_at) VALUES (?,?,?,?,NULL,'FACTION_PLAN',?,?,?,"
                + "'FACTION',?,?,?,?, 'OBSERVED',?,(SELECT policy_version FROM station_story_policy WHERE active=1),?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, eventId);
            statement.setString(2, worldId.toString());
            statement.setString(3, stationId);
            statement.setLong(4, tick);
            statement.setInt(5, severity);
            statement.setString(6, headline);
            statement.setString(7, narrative);
            statement.setString(8, actorId);
            statement.setString(9, causeType);
            statement.setString(10, causeId);
            statement.setString(11, deterministicKey);
            statement.setString(12, correlationId);
            statement.setString(13, "tick:" + tick);
            statement.executeUpdate();
        }
    }

    private static void insertPlanEvent(Connection connection, String planId, String eventId, String phase,
                                        int credits, int personnel, int equipment) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO faction_plan_event(plan_id,event_id,plan_phase,credits_delta,personnel_delta,"
                        + "equipment_delta) VALUES (?,?,?,?,?,?)")) {
            statement.setString(1, planId);
            statement.setString(2, eventId);
            statement.setString(3, phase);
            statement.setInt(4, credits);
            statement.setInt(5, personnel);
            statement.setInt(6, equipment);
            statement.executeUpdate();
        }
    }

    private static void insertChange(Connection connection, String changeId, String eventId, String key,
                                     int before, int delta, int after, String unit, String reason,
                                     String stationId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "INSERT INTO station_change(change_id,event_id,statistic_key,value_type,previous_value,delta_value,"
                        + "resulting_value,unit,reason_code,affected_type,affected_id) "
                        + "VALUES (?,?,?,'INTEGER',?,?,?,?,?,'STATION',?)")) {
            statement.setString(1, changeId);
            statement.setString(2, eventId);
            statement.setString(3, key);
            statement.setInt(4, before);
            statement.setInt(5, delta);
            statement.setInt(6, after);
            statement.setString(7, unit);
            statement.setString(8, reason);
            statement.setString(9, stationId);
            statement.executeUpdate();
        }
    }

    private static void requireOne(int changed, String message) throws SQLException {
        if (changed != 1) throw new SQLException(message);
    }

    private record AttackCandidate(String attackEventId, String stationId, String correlationId,
                                   String stationName, String sponsorFaction, int availableCredits,
                                   int availableWorkforce, int availableAmmunition,
                                   int ammunitionReserved) { }

    private record DuePlan(String planId, String stationId, String sponsorFaction,
                           int credits, int personnel, int equipment) { }

    private record PlanExecution(int credits, int security, int threat, int workforceCount,
                                 int availableWorkforce, int outstandingPersonnel,
                                 int ammunitionQuantity, int ammunitionReserved) { }
}
