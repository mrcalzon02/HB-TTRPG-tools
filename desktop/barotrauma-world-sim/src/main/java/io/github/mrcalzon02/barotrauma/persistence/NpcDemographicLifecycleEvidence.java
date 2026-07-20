package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema-027 read models and immutable result evidence. */
final class NpcDemographicLifecycleEvidence {
    private NpcDemographicLifecycleEvidence() { }

    static void appendTo(List<String> statements) {
        statements.add("""
                CREATE VIEW npc_population_accounting_observation AS
                SELECT l.ledger_id,l.world_id,l.population_id,l.station_id,ws.display_name AS station_name,
                       l.tick_sequence,l.before_total,l.births,l.deaths,l.immigration,l.emigration,
                       l.disaster_losses,l.other_gains,l.other_losses,l.after_total,l.housing_capacity,
                       l.life_support_capacity,l.employment_capacity,l.morale,l.population_index_before,
                       l.population_index_after,l.primary_cause,l.evidence_key,l.summary,
                       r.baseline_population_per_index,r.reconciliation_status,
                       d.effective_capacity,d.morale_after,d.support_score,d.pressure_score,
                       d.surplus_support_ticks,d.shortage_pressure_ticks,d.overcrowding_ticks,
                       d.overcrowding_state,d.attack_damage_points
                FROM npc_population_ledger l
                JOIN world_station ws ON ws.station_id=l.station_id
                JOIN npc_population_reconciliation r ON r.population_id=l.population_id
                LEFT JOIN npc_demographic_tick_result d
                  ON d.population_id=l.population_id AND d.tick_sequence=l.tick_sequence
                """);
        statements.add("""
                CREATE VIEW station_population_coverage AS
                SELECT p.station_id,p.world_id,p.baseline_kind,p.baseline_tick,p.baseline_resident_count,
                       p.resident_count,p.baseline_workforce_count,p.workforce_count,p.last_tick,
                       COALESCE((SELECT SUM(pe.people_delta)
                                 FROM station_population_event pe JOIN station_event e ON e.event_id=pe.event_id
                                 WHERE e.station_id=p.station_id AND e.tick_sequence>p.baseline_tick),0)
                           recorded_resident_delta,
                       COALESCE((SELECT SUM(pe.workforce_delta)
                                 FROM station_population_event pe JOIN station_event e ON e.event_id=pe.event_id
                                 WHERE e.station_id=p.station_id AND e.tick_sequence>p.baseline_tick),0)
                           recorded_workforce_delta,
                       p.resident_count-p.baseline_resident_count-COALESCE((
                           SELECT SUM(pe.people_delta)
                           FROM station_population_event pe JOIN station_event e ON e.event_id=pe.event_id
                           WHERE e.station_id=p.station_id AND e.tick_sequence>p.baseline_tick),0)
                           unexplained_resident_delta,
                       p.workforce_count-p.baseline_workforce_count-COALESCE((
                           SELECT SUM(pe.workforce_delta)
                           FROM station_population_event pe JOIN station_event e ON e.event_id=pe.event_id
                           WHERE e.station_id=p.station_id AND e.tick_sequence>p.baseline_tick),0)
                           unexplained_workforce_delta
                FROM station_population_state p
                """);
    }
}
