package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema 024: explicit transaction-scoped command provenance for station stories. */
public final class StationCommandCausalitySchema {
    private StationCommandCausalitySchema() { }

    public static List<String> statements() {
        return List.of(
                """
                CREATE TABLE simulation_transaction_context (
                    world_id TEXT PRIMARY KEY,
                    command_id TEXT NOT NULL UNIQUE,
                    execution_sequence INTEGER NOT NULL CHECK(execution_sequence > 0),
                    before_tick INTEGER NOT NULL CHECK(before_tick >= 0),
                    after_tick INTEGER NOT NULL CHECK(after_tick > before_tick),
                    current_tick INTEGER,
                    current_canonical TEXT,
                    context_kind TEXT NOT NULL CHECK(context_kind='PASSIVE_TICK'),
                    opened_at TEXT NOT NULL,
                    CHECK(current_tick IS NULL OR current_tick BETWEEN before_tick+1 AND after_tick),
                    CHECK((current_tick IS NULL AND current_canonical IS NULL)
                       OR (current_tick IS NOT NULL AND current_canonical IS NOT NULL)),
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),
                    FOREIGN KEY(command_id) REFERENCES simulation_command_receipt(command_id)
                )
                """,

                receiptGuard("INSERT"),
                receiptGuard("UPDATE"),

                """
                CREATE TABLE station_event_command_source (
                    event_id TEXT PRIMARY KEY,
                    command_id TEXT NOT NULL,
                    linked_tick INTEGER NOT NULL CHECK(linked_tick >= 0),
                    linked_canonical TEXT NOT NULL,
                    FOREIGN KEY(event_id) REFERENCES station_event(event_id) ON DELETE CASCADE,
                    FOREIGN KEY(command_id) REFERENCES simulation_command_receipt(command_id)
                )
                """,
                "CREATE INDEX station_event_command_index ON station_event_command_source(command_id,linked_tick,event_id)",

                """
                CREATE TRIGGER station_event_links_active_command
                AFTER INSERT ON station_event
                WHEN EXISTS (
                    SELECT 1 FROM simulation_transaction_context c
                    WHERE c.world_id=NEW.world_id AND c.current_tick=NEW.tick_sequence
                      AND c.current_canonical IS NOT NULL)
                BEGIN
                    INSERT INTO station_event_command_source(event_id,command_id,linked_tick,linked_canonical)
                    SELECT NEW.event_id,c.command_id,c.current_tick,c.current_canonical
                    FROM simulation_transaction_context c
                    WHERE c.world_id=NEW.world_id AND c.current_tick=NEW.tick_sequence;
                END
                """,

                """
                CREATE VIEW station_event_command_history AS
                SELECT e.event_id,e.world_id,e.station_id,e.tick_sequence,e.event_type,e.headline,e.cause_type,
                       e.cause_id,s.command_id,s.linked_tick,s.linked_canonical,r.execution_sequence,
                       r.actor command_actor,r.command command_label,r.before_tick_sequence,r.after_tick_sequence
                FROM station_event e
                JOIN station_event_command_source s ON s.event_id=e.event_id
                JOIN simulation_command_receipt r ON r.command_id=s.command_id
                """
        );
    }

    private static String receiptGuard(String operation) {
        return "CREATE TRIGGER simulation_transaction_context_receipt_" + operation.toLowerCase()
                + "_guard BEFORE " + operation + " ON simulation_transaction_context "
                + "WHEN NOT EXISTS (SELECT 1 FROM simulation_command_receipt r "
                + "WHERE r.command_id=NEW.command_id AND r.world_id=NEW.world_id "
                + "AND r.execution_sequence=NEW.execution_sequence "
                + "AND r.before_tick_sequence=NEW.before_tick "
                + "AND r.after_tick_sequence=NEW.after_tick "
                + "AND r.command GLOB 'PASSIVE_*') BEGIN "
                + "SELECT RAISE(ABORT,'Simulation transaction context does not match its command receipt.'); END";
    }
}
