package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.Flow;
import io.github.mrcalzon02.barotrauma.persistence.NpcPopulationMigrationTransaction.Population;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/** Ledger, station-story, observation, and transition evidence for schema-028 movement. */
final class NpcPopulationMigrationEvidence {
    private NpcPopulationMigrationEvidence() { }

    static void recordPopulationTerm(Connection connection, Population population, long tick,
                                     long before, long after, long immigration, long emigration,
                                     String cause, String evidence, String summary) throws SQLException {
        int indexAfter = NpcPopulationMigrationStore.populationIndex(after, population.baselinePerIndex());
        try (PreparedStatement existing = connection.prepareStatement(
                "SELECT 1 FROM npc_population_ledger WHERE population_id=? AND tick_sequence=?")) {
            existing.setString(1, population.populationId());
            existing.setLong(2, tick);
            try (ResultSet result = existing.executeQuery()) {
                if (result.next()) {
                    updateExistingLedger(connection, population, tick, immigration, emigration,
                            indexAfter, cause, evidence, summary);
                    return;
                }
            }
        }
        insertLedger(connection, population, tick, before, after, immigration, emigration,
                indexAfter, cause, evidence, summary);
    }

    private static void updateExistingLedger(Connection connection, Population population, long tick,
                                             long immigration, long emigration, int indexAfter,
                                             String cause, String evidence, String summary) throws SQLException {
        String sql = "UPDATE npc_population_ledger SET immigration=immigration+?,emigration=emigration+?,"
                + "after_total=after_total+?-?,population_index_after=?,primary_cause=?,evidence_key=?,"
                + "summary=summary||' '||? WHERE population_id=? AND tick_sequence=?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setLong(1, immigration);
            statement.setLong(2, emigration);
            statement.setLong(3, immigration);
            statement.setLong(4, emigration);
            statement.setInt(5, indexAfter);
            statement.setString(6, cause);
            statement.setString(7, evidence);
            statement.setString(8, summary);
            statement.setString(9, population.populationId());
            statement.setLong(10, tick);
            if (statement.executeUpdate() != 1) throw new SQLException("Migration ledger update failed.");
        }
    }

    private static void insertLedger(Connection connection, Population population, long tick,
                                     long before, long after, long immigration, long emigration,
                                     int indexAfter, String cause, String evidence, String summary) throws SQLException {
        String sql = "INSERT INTO npc_population_ledger(ledger_id,world_id,population_id,station_id,tick_sequence,"
                + "before_total,births,deaths,immigration,emigration,disaster_losses,other_gains,other_losses,"
                + "after_total,housing_capacity,life_support_capacity,employment_capacity,morale,"
                + "population_index_before,population_index_after,primary_cause,evidence_key,summary) "
                + "VALUES(?,?,?,?,?,?,0,0,?,?,0,0,0,?,?,?,?,?,?,?,?,?,?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            int parameter = 1;
            statement.setString(parameter++, population.populationId() + ":ledger:" + tick);
            statement.setString(parameter++, population.worldId());
            statement.setString(parameter++, population.populationId());
            statement.setString(parameter++, population.stationId());
            statement.setLong(parameter++, tick);
            statement.setLong(parameter++, before);
            statement.setLong(parameter++, immigration);
            statement.setLong(parameter++, emigration);
            statement.setLong(parameter++, after);
            statement.setLong(parameter++, population.housing());
            statement.setLong(parameter++, population.lifeSupport());
            statement.setLong(parameter++, population.employment());
            statement.setInt(parameter++, population.morale());
            statement.setInt(parameter++, population.populationIndex());
            statement.setInt(parameter++, indexAfter);
            statement.setString(parameter++, cause);
            statement.setString(parameter++, evidence);
            statement.setString(parameter, summary);
            statement.executeUpdate();
        }
    }

    static void insertPopulationEvidence(Connection connection, Flow flow, Population population,
                                         long tick, long before, long after, long delta,
                                         String category, String headline) throws SQLException {
        long workforceBefore = population.workforce();
        long workforceAfter = projectedWorkforce(connection, population.stationId(), workforceBefore);
        insertPopulationEvidence(connection, flow, population, tick, before, after, delta,
                workforceBefore, workforceAfter, category, headline);
    }

    static void insertPopulationEvidence(Connection connection, Flow flow, Population population,
                                         long tick, long before, long after, long delta,
                                         long workforceBefore, long workforceAfter,
                                         String category, String headline) throws SQLException {
        String eventId = NpcPopulationMigrationTransaction.deterministicId(
                flow.flowId() + ":" + category + ":" + tick);
        String canonical = canonical(connection, flow.worldId(), tick);
        String eventSql = "INSERT OR IGNORE INTO station_event(event_id,world_id,station_id,tick_sequence,"
                + "canonical_time,event_type,severity,headline,narrative,actor_type,actor_id,cause_type,cause_id,"
                + "deterministic_key,visibility,correlation_id,policy_version,created_at) "
                + "VALUES(?,?,?,?,?,'POPULATION',2,?,?,'CIVIL_AUTHORITY',?,'MIGRATION',?,?,'OBSERVED',?,"
                + "COALESCE((SELECT policy_version FROM station_story_policy WHERE active=1),1),?)";
        String populationSql = "INSERT OR IGNORE INTO station_population_event(population_event_id,event_id,"
                + "population_category,people_before,people_delta,people_after,workforce_delta) VALUES(?,?,?,?,?,?,?)";
        String changeSql = "INSERT OR IGNORE INTO station_change(change_id,event_id,statistic_key,value_type,"
                + "previous_value,delta_value,resulting_value,unit,reason_code,affected_type,affected_id) "
                + "VALUES(?,?,'population.residents','INTEGER',?,?,?,'people',?,'STATION',?)";
        try (PreparedStatement event = connection.prepareStatement(eventSql);
             PreparedStatement populationEvent = connection.prepareStatement(populationSql);
             PreparedStatement change = connection.prepareStatement(changeSql)) {
            event.setString(1, eventId);
            event.setString(2, flow.worldId());
            event.setString(3, population.stationId());
            event.setLong(4, tick);
            event.setString(5, canonical);
            event.setString(6, headline);
            event.setString(7, headline + " for flow " + flow.flowId() + "; delta=" + delta + ".");
            event.setString(8, population.populationId());
            event.setString(9, flow.flowId());
            event.setString(10, "migration:" + flow.flowId() + ":" + tick + ":" + category.toLowerCase());
            event.setString(11, flow.worldId() + ":migration:" + tick);
            event.setString(12, canonical);
            event.executeUpdate();

            populationEvent.setString(1, eventId + ":population");
            populationEvent.setString(2, eventId);
            populationEvent.setString(3, category);
            populationEvent.setLong(4, before);
            populationEvent.setLong(5, delta);
            populationEvent.setLong(6, after);
            populationEvent.setLong(7, workforceAfter - workforceBefore);
            populationEvent.executeUpdate();

            change.setString(1, eventId + ":residents");
            change.setString(2, eventId);
            change.setLong(3, before);
            change.setLong(4, delta);
            change.setLong(5, after);
            change.setString(6, category);
            change.setString(7, population.stationId());
            change.executeUpdate();

            if (workforceAfter != workforceBefore) {
                try (PreparedStatement workforceChange = connection.prepareStatement(
                        "INSERT OR IGNORE INTO station_change(change_id,event_id,statistic_key,value_type,"
                                + "previous_value,delta_value,resulting_value,unit,reason_code,affected_type,affected_id) "
                                + "VALUES(?,?,'population.workforce','INTEGER',?,?,?,'people',?,'STATION',?)")) {
                    workforceChange.setString(1, eventId + ":workforce");
                    workforceChange.setString(2, eventId);
                    workforceChange.setLong(3, workforceBefore);
                    workforceChange.setLong(4, workforceAfter - workforceBefore);
                    workforceChange.setLong(5, workforceAfter);
                    workforceChange.setString(6, category);
                    workforceChange.setString(7, population.stationId());
                    workforceChange.executeUpdate();
                }
            }
        }
    }

    private static long projectedWorkforce(Connection connection, String stationId, long fallback)
            throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT workforce_count FROM station_population_state WHERE station_id=?")) {
            statement.setString(1, stationId);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? result.getLong(1) : fallback;
            }
        }
    }

    static void insertObservation(Connection connection, String evidenceKey, String worldId, long tick,
                                  String populationId, String cause, long magnitude, String summary)
            throws SQLException {
        String sql = "INSERT OR IGNORE INTO world_observation_event(event_id,world_id,tick_sequence,canonical_time,"
                + "category,primary_entity_type,primary_entity_id,primary_cause,primary_evidence_key,"
                + "contributing_factors,magnitude,visibility,confidence,summary) "
                + "VALUES(?,?,?,?,'MIGRATION','NPC_POPULATION',?,?,?,'transported-population',?,'OMNISCIENT',100,?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, NpcPopulationMigrationTransaction.deterministicId(evidenceKey));
            statement.setString(2, worldId);
            statement.setLong(3, tick);
            statement.setString(4, canonical(connection, worldId, tick));
            statement.setString(5, populationId);
            statement.setString(6, cause);
            statement.setString(7, evidenceKey);
            statement.setLong(8, magnitude);
            statement.setString(9, summary);
            statement.executeUpdate();
        }
    }

    static void insertTransition(Connection connection, String flowId, String worldId,
                                 String from, String to, long tick, long quantity,
                                 long losses, long stranded, String evidence, String summary) throws SQLException {
        String sql = "INSERT INTO npc_population_flow_transition(transition_id,flow_id,world_id,from_status,"
                + "to_status,tick_sequence,quantity,losses,stranded_quantity,evidence_key,summary) "
                + "VALUES(?,?,?,?,?,?,?,?,?,?,?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, NpcPopulationMigrationTransaction.deterministicId(
                    flowId + ":" + from + ":" + to + ":" + tick));
            statement.setString(2, flowId);
            statement.setString(3, worldId);
            statement.setString(4, from);
            statement.setString(5, to);
            statement.setLong(6, tick);
            statement.setLong(7, quantity);
            statement.setLong(8, losses);
            statement.setLong(9, stranded);
            statement.setString(10, evidence);
            statement.setString(11, NpcPopulationMigrationTransaction.text(summary, "summary", 1_000));
            statement.executeUpdate();
        }
    }

    private static String canonical(Connection connection, String worldId, long tick) throws SQLException {
        String sql = "SELECT COALESCE((SELECT current_canonical FROM simulation_transaction_context WHERE world_id=?),"
                + "(SELECT canonical_time FROM world_metadata WHERE world_id=?),"
                + "(SELECT created_at FROM world_metadata WHERE world_id=?),'tick:'||?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, worldId);
            statement.setString(2, worldId);
            statement.setString(3, worldId);
            statement.setLong(4, tick);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? result.getString(1) : "tick:" + tick;
            }
        }
    }
}
