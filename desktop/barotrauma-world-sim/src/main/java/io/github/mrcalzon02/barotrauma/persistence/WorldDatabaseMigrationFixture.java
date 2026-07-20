package io.github.mrcalzon02.barotrauma.persistence;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.UUID;

/** Seeds preserved pre-renumber station and ecology state for migration tests. */
final class WorldDatabaseMigrationFixture {
    private WorldDatabaseMigrationFixture() { }

    static void seedPreRenumberWorld(Connection connection, UUID worldId, UUID locationId, UUID stationId)
            throws SQLException {
        try (PreparedStatement artifact = connection.prepareStatement(
                "INSERT INTO import_artifact(artifact_id,sha256,byte_length,source_name,source_kind,inspected_at) "
                        + "VALUES('pre-renumber-fixture',?,1,'pre-renumber.save','fixture',?)")) {
            artifact.setString(1, "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
            artifact.setString(2, "2026-07-19T00:00:00Z");
            artifact.executeUpdate();
        }
        try (PreparedStatement simulation = connection.prepareStatement(
                "INSERT INTO world_simulation_metadata(world_id,canonical_time,imported_tick_sequence,imported_at,"
                        + "source_artifact_id,current_tick_sequence) VALUES(?,?,?,?,?,?)")) {
            simulation.setString(1, worldId.toString());
            simulation.setString(2, "2175-01-01T00:42:00Z");
            simulation.setLong(3, 40);
            simulation.setString(4, "2026-07-19T00:00:00Z");
            simulation.setString(5, "pre-renumber-fixture");
            simulation.setLong(6, 42);
            simulation.executeUpdate();
        }
        try (PreparedStatement location = connection.prepareStatement(
                "INSERT INTO world_location(location_id,world_id,source_location_id,source_ordinal,display_name,"
                        + "location_type,ring,location_level,map_x,map_y,biome,faction,is_station) "
                        + "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1)")) {
            location.setString(1, locationId.toString());
            location.setString(2, worldId.toString());
            location.setString(3, "pre-renumber-location");
            location.setInt(4, 1);
            location.setString(5, "Preserved Station");
            location.setString(6, "outpost");
            location.setInt(7, 1);
            location.setInt(8, 1);
            location.setDouble(9, 0);
            location.setDouble(10, 0);
            location.setString(11, "cold");
            location.setString(12, "Coalition");
            location.executeUpdate();
        }
        try (PreparedStatement station = connection.prepareStatement(
                "INSERT INTO world_station(station_id,world_id,location_id,source_station_id,display_name,"
                        + "station_type,faction,has_economy) VALUES(?,?,?,?,?,?,?,1)")) {
            station.setString(1, stationId.toString());
            station.setString(2, worldId.toString());
            station.setString(3, locationId.toString());
            station.setString(4, "pre-renumber-station");
            station.setString(5, "Preserved Station");
            station.setString(6, "outpost");
            station.setString(7, "Coalition");
            station.executeUpdate();
        }
        try (PreparedStatement state = connection.prepareStatement(
                "INSERT INTO station_simulation_state VALUES(?,?,?,?,?,?,?,?,?,?,?,?)")) {
            state.setString(1, stationId.toString());
            state.setString(2, worldId.toString());
            int[] values = {10_000, 70, 20, 60, 65, 90, 25, 0};
            for (int index = 0; index < values.length; index++) state.setInt(index + 3, values[index]);
            state.setString(11, "STABLE");
            state.setLong(12, 42);
            state.executeUpdate();
        }
        try (PreparedStatement civilization = connection.prepareStatement(
                "UPDATE station_civilization_state SET population_index=?,civilization_strength=?,"
                        + "fauna_pressure=?,supply_consumption_base=?,last_consumption=?,shortage_ticks=?,"
                        + "surplus_ticks=?,frontier_position=?,frontier_state=?,last_tick=? WHERE station_id=?")) {
            int[] values = {70, 75, 20, 2, 2, 1, 4, 60};
            for (int index = 0; index < values.length; index++) civilization.setInt(index + 1, values[index]);
            civilization.setString(9, "HOLDING");
            civilization.setLong(10, 42);
            civilization.setString(11, stationId.toString());
            civilization.executeUpdate();
        }
        try (PreparedStatement ecology = connection.prepareStatement(
                "UPDATE location_ecology_state SET primary_producers=?,algal_bloom=?,herbivore_biomass=?,"
                        + "predator_biomass=?,scavenger_biomass=?,bioaccumulator_mass=?,nutrient_load=?,"
                        + "habitat_integrity=?,migration_pressure=?,last_tick=? WHERE location_id=?")) {
            int[] values = {60, 10, 55, 45, 25, 15, 50, 80, 35};
            for (int index = 0; index < values.length; index++) ecology.setInt(index + 1, values[index]);
            ecology.setLong(10, 42);
            ecology.setString(11, locationId.toString());
            ecology.executeUpdate();
        }
    }
}
