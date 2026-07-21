package io.github.mrcalzon02.barotrauma.persistence;

import static io.github.mrcalzon02.barotrauma.persistence.WorldDatabaseMigrations.*;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Comparator;

/** Schema-object, migration-ledger, and cleanup assertions. */
final class WorldDatabaseMigrationAssertions {
    private WorldDatabaseMigrationAssertions() { }

    static void verifyObservationObjects(Connection connection, String prefix) throws SQLException {
        require(tableExists(connection, "npc_population_state")
                        && tableExists(connection, "creature_population_state")
                        && tableExists(connection, "creature_territory_state"),
                prefix + " is missing observation population or territory state.");
        require(tableExists(connection, "faction_location_presence")
                        && tableExists(connection, "population_flow")
                        && tableExists(connection, "world_observation_event"),
                prefix + " is missing influence, flow, or event evidence.");
        require(tableExists(connection, "observation_snapshot")
                        && tableExists(connection, "observation_metric_series")
                        && tableExists(connection, "observer_watch_rule"),
                prefix + " is missing snapshot, metric, or watch state.");
        require(objectExists(connection, "view", "npc_population_observation")
                        && objectExists(connection, "view", "creature_population_observation")
                        && objectExists(connection, "view", "observation_world_summary"),
                prefix + " is missing read-optimized observation views.");
        require(objectExists(connection, "trigger", "observation_npc_population_seed")
                        && objectExists(connection, "trigger", "observation_creature_population_seed")
                        && objectExists(connection, "trigger", "observation_creature_territory_seed"),
                prefix + " is missing observation seed triggers.");
    }

    static void verifyPopulationAccountingObjects(Connection connection, String prefix) throws SQLException {
        require(tableExists(connection, "npc_population_reconciliation")
                        && tableExists(connection, "npc_population_ledger")
                        && tableExists(connection, "npc_demographic_state")
                        && tableExists(connection, "npc_demographic_tick_result"),
                prefix + " is missing population reconciliation, ledger, or demographic state.");
        require(objectExists(connection, "view", "npc_population_accounting_observation")
                        && objectExists(connection, "view", "npc_demographic_tick_plan"),
                prefix + " is missing population accounting or demographic planning views.");
        require(objectExists(connection, "trigger", "npc_population_reconciliation_seed")
                        && objectExists(connection, "trigger", "npc_demographic_capture_before_tick")
                        && objectExists(connection, "trigger", "npc_demographic_finalize_tick"),
                prefix + " is missing population accounting or demographic triggers.");
        require(!objectExists(connection, "trigger", "npc_population_tick_accounting")
                        && !objectExists(connection, "trigger", "station_population_finalize_tick"),
                prefix + " retained a competing demographic mutation pipeline.");
        require(tableExists(connection, "npc_population_flow_cohort")
                        && tableExists(connection, "npc_population_flow_transition"),
                prefix + " is missing conserved population migration state.");
        require(objectExists(connection, "view", "npc_population_flow_observation")
                        && objectExists(connection, "view", "npc_population_migration_conservation"),
                prefix + " is missing population migration observation or conservation views.");
        require(objectExists(connection, "trigger", "npc_population_flow_status_guard")
                        && objectExists(connection, "trigger", "npc_population_flow_conservation_guard")
                        && objectExists(connection, "trigger", "npc_population_flow_terminal_immutable"),
                prefix + " is missing population migration lifecycle guards.");
    }

    static void verifySettlementLifecycleObjects(Connection connection, String prefix) throws SQLException {
        require(tableExists(connection, "settlement_project")
                        && tableExists(connection, "settlement_project_contribution")
                        && tableExists(connection, "settlement_project_transition"),
                prefix + " is missing schema-029 settlement lifecycle state.");
        require(objectExists(connection, "view", "settlement_project_observation")
                        && objectExists(connection, "trigger", "settlement_project_status_guard")
                        && objectExists(connection, "trigger", "settlement_project_terminal_immutable"),
                prefix + " is missing schema-029 settlement observation or lifecycle guards.");
        require(tableExists(connection, "settlement_founding_handoff")
                        && tableExists(connection, "settlement_founding_handoff_cohort"),
                prefix + " is missing schema-030 founding handoff state.");
        require(objectExists(connection, "view", "settlement_founding_migration_observation")
                        && objectExists(connection, "trigger", "settlement_founding_handoff_guard")
                        && objectExists(connection, "trigger", "settlement_founding_handoff_population_baseline"),
                prefix + " is missing schema-030 founding observation or conservation guards.");
        require(tableExists(connection, "settlement_project_contribution_disposition")
                        && objectExists(connection, "view", "settlement_contribution_disposition_observation")
                        && objectExists(connection, "view", "settlement_project_disposition_completeness"),
                prefix + " is missing schema-031 contribution disposition state.");
        require(objectExists(connection, "trigger", "settlement_project_terminal_disposition_guard")
                        && objectExists(connection, "trigger", "settlement_contribution_disposition_immutable_update")
                        && objectExists(connection, "trigger", "settlement_contribution_disposition_immutable_delete"),
                prefix + " is missing schema-031 disposition completeness or immutability guards.");
    }

    static long migrationVersionCount(Connection connection, int first, int last) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT COUNT(*) FROM schema_migration WHERE version BETWEEN ? AND ?")) {
            statement.setInt(1, first);
            statement.setInt(2, last);
            try (ResultSet result = statement.executeQuery()) {
                return result.next() ? result.getLong(1) : 0;
            }
        }
    }

    static void verifyCausalityAndTransitObjects(Connection connection, String prefix) throws SQLException {
        require(tableExists(connection, "station_event")
                        && tableExists(connection, "station_change")
                        && tableExists(connection, "station_population_event")
                        && tableExists(connection, "faction_plan"),
                prefix + " is missing schema-017 station causality state.");
        require(tableExists(connection, "station_causal_tick_baseline")
                        && objectExists(connection, "trigger", "station_consumption_causal_event"),
                prefix + " is missing schema-018 consumption causality.");
        require(tableExists(connection, "station_production_outcome")
                        && objectExists(connection, "trigger", "station_production_apply"),
                prefix + " is missing schema-019 production causality.");
        require(tableExists(connection, "station_delivery_baseline")
                        && objectExists(connection, "trigger", "station_delivery_causal_event"),
                prefix + " is missing schema-020 delivery causality.");
        require(objectExists(connection, "trigger", "station_frontier_finalize_tick")
                        && objectExists(connection, "view", "station_frontier_story"),
                prefix + " is missing schema-021 frontier causality.");
        require(tableExists(connection, "station_population_state")
                        && objectExists(connection, "view", "station_population_coverage"),
                prefix + " is missing schema-022 station population causality.");
        require(tableExists(connection, "faction_plan_resource_allocation")
                        && objectExists(connection, "view", "station_faction_resource_availability"),
                prefix + " is missing schema-023 faction-plan backing.");
        require(tableExists(connection, "simulation_transaction_context")
                        && objectExists(connection, "view", "station_event_command_history"),
                prefix + " is missing schema-024 command provenance.");
        require(tableExists(connection, "station_explanation_policy")
                        && objectExists(connection, "view", "unexplained_station_mutation"),
                prefix + " is missing schema-025 mutation explanation coverage.");
        require(tableExists(connection, "npc_transit_leg")
                        && tableExists(connection, "npc_transit_incident_schedule")
                        && objectExists(connection, "view", "npc_observable_transit"),
                prefix + " is missing schema-026 time-gated NPC transit.");
    }

    static void deleteTree(Path root) throws IOException {
        if (!Files.exists(root)) return;
        try (var stream = Files.walk(root)) {
            for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
        }
    }

    static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }
}
