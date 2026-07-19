package io.github.mrcalzon02.barotrauma.observation;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/** Strictly read-only schema-016 observation queries for desktop presentation and later export. */
public final class ObservationRegistry {
    private ObservationRegistry() { }

    public static Snapshot load(WorldPaths world) throws Exception { return loadChangedSince(world, -1); }

    public static Snapshot loadChangedSince(WorldPaths world, long since) throws Exception {
        Objects.requireNonNull(world, "world");
        if (since < -1) throw new IllegalArgumentException("changedSinceTick must be -1 or greater.");
        try (Connection connection = open(world)) {
            return new Snapshot(summary(connection), npc(connection, since), ledgers(connection, since),
                    creatures(connection, since), factions(connection, since), flows(connection, since),
                    events(connection, since, null, null, 500), snapshots(connection, since),
                    metrics(connection, since), since);
        }
    }

    public static List<EventRow> eventsForEntity(WorldPaths world, String entityType,
                                                  String entityId, int limit) throws Exception {
        if (limit < 1 || limit > 5_000) throw new IllegalArgumentException("Event limit must be between 1 and 5000.");
        String type = text(entityType, "entityType");
        String id = text(entityId, "entityId");
        try (Connection connection = open(world)) { return events(connection, -1, type, id, limit); }
    }

    private static Connection open(WorldPaths world) throws Exception {
        Objects.requireNonNull(world, "world");
        Class.forName("org.sqlite.JDBC");
        Connection connection = DriverManager.getConnection("jdbc:sqlite:" + world.database());
        try {
            try (Statement statement = connection.createStatement()) {
                statement.execute("PRAGMA foreign_keys=ON");
                statement.execute("PRAGMA busy_timeout=5000");
                statement.execute("PRAGMA query_only=ON");
            }
            try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery("PRAGMA query_only")) {
                if (!result.next() || result.getInt(1) != 1) throw new SQLException("Observation connection is not query-only.");
            }
            verifySchema(connection);
            return connection;
        } catch (Exception exception) {
            try { connection.close(); } catch (SQLException closeFailure) { exception.addSuppressed(closeFailure); }
            throw exception;
        }
    }

    private static WorldSummary summary(Connection c) throws SQLException {
        String sql = "SELECT s.world_id,s.display_name,s.npc_populations,s.npc_population_total,s.creature_populations,"
                + "s.creature_estimated_total,s.faction_presences,s.observation_events,"
                + "COALESCE(m.current_tick_sequence,m.imported_tick_sequence,0),w.canonical_time,"
                + "(SELECT COUNT(*) FROM npc_population_ledger l WHERE l.world_id=s.world_id) "
                + "FROM observation_world_summary s JOIN world_metadata w ON w.world_id=s.world_id "
                + "LEFT JOIN world_simulation_metadata m ON m.world_id=s.world_id LIMIT 1";
        try (Statement statement = c.createStatement(); ResultSet r = statement.executeQuery(sql)) {
            if (!r.next()) throw new SQLException("Observation world summary is empty.");
            return new WorldSummary(r.getString(1), r.getString(2), r.getLong(3), r.getLong(4), r.getLong(5),
                    r.getLong(6), r.getLong(7), r.getLong(8), r.getLong(9), r.getString(10), r.getLong(11));
        }
    }

    private static List<NpcPopulationRow> npc(Connection c, long since) throws SQLException {
        String sql = "SELECT population_id,station_id,station_name,civilians,industrial_workers,logistics_workers,"
                + "security_personnel,medical_personnel,scientific_personnel,temporary_residents,refugees,total_population,"
                + "housing_capacity,life_support_capacity,employment_capacity,morale,last_tick "
                + "FROM npc_population_observation WHERE (?<0 OR last_tick>?) ORDER BY total_population DESC,station_name";
        List<NpcPopulationRow> rows = new ArrayList<>();
        try (PreparedStatement s = c.prepareStatement(sql)) { bind(s, since); try (ResultSet r = s.executeQuery()) {
            while (r.next()) rows.add(new NpcPopulationRow(r.getString(1),r.getString(2),r.getString(3),
                    r.getLong(4),r.getLong(5),r.getLong(6),r.getLong(7),r.getLong(8),r.getLong(9),r.getLong(10),
                    r.getLong(11),r.getLong(12),r.getLong(13),r.getLong(14),r.getLong(15),r.getInt(16),r.getLong(17)));
        }}
        return List.copyOf(rows);
    }

    private static List<PopulationLedgerRow> ledgers(Connection c, long since) throws SQLException {
        String sql = "SELECT ledger_id,population_id,station_id,station_name,tick_sequence,before_total,births,deaths,"
                + "immigration,emigration,disaster_losses,other_gains,other_losses,after_total,housing_capacity,"
                + "life_support_capacity,employment_capacity,morale,population_index_before,population_index_after,"
                + "primary_cause,evidence_key,summary,baseline_population_per_index,reconciliation_status "
                + "FROM npc_population_accounting_observation WHERE (?<0 OR tick_sequence>?) "
                + "ORDER BY tick_sequence DESC,station_name,ledger_id";
        List<PopulationLedgerRow> rows = new ArrayList<>();
        try (PreparedStatement s = c.prepareStatement(sql)) { bind(s, since); try (ResultSet r = s.executeQuery()) {
            while (r.next()) rows.add(new PopulationLedgerRow(r.getString(1),r.getString(2),r.getString(3),r.getString(4),
                    r.getLong(5),r.getLong(6),r.getLong(7),r.getLong(8),r.getLong(9),r.getLong(10),r.getLong(11),
                    r.getLong(12),r.getLong(13),r.getLong(14),r.getLong(15),r.getLong(16),r.getLong(17),r.getInt(18),
                    r.getInt(19),r.getInt(20),r.getString(21),r.getString(22),r.getString(23),r.getDouble(24),r.getString(25)));
        }}
        return List.copyOf(rows);
    }

    private static List<CreaturePopulationRow> creatures(Connection c, long since) throws SQLException {
        String sql = "SELECT population_id,location_id,location_name,species_key,population_class,estimated_count,biomass,"
                + "health,food_stress,habitat_support,migration_pressure,observation_confidence,territory_status,"
                + "COALESCE(territory_pressure,0),COALESCE(nest_strength,0),last_tick FROM creature_population_observation "
                + "WHERE (?<0 OR last_tick>?) ORDER BY biomass DESC,location_name,species_key";
        List<CreaturePopulationRow> rows = new ArrayList<>();
        try (PreparedStatement s = c.prepareStatement(sql)) { bind(s, since); try (ResultSet r = s.executeQuery()) {
            while (r.next()) rows.add(new CreaturePopulationRow(r.getString(1),r.getString(2),r.getString(3),r.getString(4),
                    r.getString(5),r.getLong(6),r.getInt(7),r.getInt(8),r.getInt(9),r.getInt(10),r.getInt(11),
                    r.getInt(12),r.getString(13),r.getInt(14),r.getInt(15),r.getLong(16)));
        }}
        return List.copyOf(rows);
    }

    private static List<FactionPresenceRow> factions(Connection c, long since) throws SQLException {
        String sql = "SELECT f.presence_id,f.location_id,l.display_name,f.faction_key,f.influence,f.presence_state,"
                + "f.seed_source,f.last_tick FROM faction_location_presence f JOIN world_location l ON l.location_id=f.location_id "
                + "WHERE (?<0 OR f.last_tick>?) ORDER BY f.influence DESC,l.display_name,f.faction_key";
        List<FactionPresenceRow> rows = new ArrayList<>();
        try (PreparedStatement s = c.prepareStatement(sql)) { bind(s, since); try (ResultSet r = s.executeQuery()) {
            while (r.next()) rows.add(new FactionPresenceRow(r.getString(1),r.getString(2),r.getString(3),r.getString(4),
                    r.getInt(5),r.getString(6),r.getString(7),r.getLong(8)));
        }}
        return List.copyOf(rows);
    }

    private static List<FlowRow> flows(Connection c, long since) throws SQLException {
        String sql = "SELECT f.flow_id,f.entity_type,f.population_id,o.display_name,COALESCE(d.display_name,''),f.quantity,"
                + "f.losses,f.cause,f.status,f.departure_tick,f.arrival_tick,f.created_tick,f.updated_tick,f.summary "
                + "FROM population_flow f JOIN world_location o ON o.location_id=f.origin_location_id "
                + "LEFT JOIN world_location d ON d.location_id=f.destination_location_id WHERE (?<0 OR f.updated_tick>?) "
                + "ORDER BY f.updated_tick DESC,f.flow_id";
        List<FlowRow> rows = new ArrayList<>();
        try (PreparedStatement s = c.prepareStatement(sql)) { bind(s, since); try (ResultSet r = s.executeQuery()) {
            while (r.next()) rows.add(new FlowRow(r.getString(1),r.getString(2),r.getString(3),r.getString(4),r.getString(5),
                    r.getLong(6),r.getLong(7),r.getString(8),r.getString(9),nullable(r,10),nullable(r,11),
                    r.getLong(12),r.getLong(13),r.getString(14)));
        }}
        return List.copyOf(rows);
    }

    private static List<EventRow> events(Connection c, long since, String type, String id, int limit) throws SQLException {
        String sql = "SELECT event_id,tick_sequence,canonical_time,category,primary_entity_type,primary_entity_id,"
                + "primary_cause,primary_evidence_key,contributing_factors,magnitude,visibility,confidence,summary "
                + "FROM world_observation_event WHERE (?<0 OR tick_sequence>?)"
                + (type == null ? "" : " AND primary_entity_type=? AND primary_entity_id=?")
                + " ORDER BY tick_sequence DESC,event_id LIMIT ?";
        List<EventRow> rows = new ArrayList<>();
        try (PreparedStatement s = c.prepareStatement(sql)) {
            bind(s, since); int next=3;
            if (type != null) { s.setString(next++,type); s.setString(next++,id); }
            s.setInt(next,limit);
            try (ResultSet r=s.executeQuery()) { while(r.next()) rows.add(new EventRow(r.getString(1),r.getLong(2),
                    r.getString(3),r.getString(4),r.getString(5),r.getString(6),r.getString(7),r.getString(8),
                    r.getString(9),r.getLong(10),r.getString(11),r.getInt(12),r.getString(13))); }
        }
        return List.copyOf(rows);
    }

    private static List<SnapshotRow> snapshots(Connection c, long since) throws SQLException {
        List<SnapshotRow> rows=new ArrayList<>();
        try(PreparedStatement s=c.prepareStatement("SELECT snapshot_id,tick_sequence,parent_snapshot_id,rules_version,created_at,status,source FROM observation_snapshot WHERE (?<0 OR tick_sequence>?) ORDER BY tick_sequence DESC,created_at DESC")){
            bind(s,since); try(ResultSet r=s.executeQuery()){while(r.next())rows.add(new SnapshotRow(r.getString(1),r.getLong(2),r.getString(3),r.getString(4),r.getString(5),r.getString(6),r.getString(7)));}}
        return List.copyOf(rows);
    }

    private static List<MetricRow> metrics(Connection c, long since) throws SQLException {
        List<MetricRow> rows=new ArrayList<>();
        try(PreparedStatement s=c.prepareStatement("SELECT metric_id,entity_type,entity_id,metric_key,tick_sequence,numeric_value,unit,snapshot_id FROM observation_metric_series WHERE (?<0 OR tick_sequence>?) ORDER BY tick_sequence DESC,entity_type,entity_id,metric_key")){
            bind(s,since); try(ResultSet r=s.executeQuery()){while(r.next())rows.add(new MetricRow(r.getString(1),r.getString(2),r.getString(3),r.getString(4),r.getLong(5),r.getDouble(6),r.getString(7),r.getString(8)));}}
        return List.copyOf(rows);
    }

    private static void verifySchema(Connection c) throws SQLException {
        long version;
        try(Statement s=c.createStatement();ResultSet r=s.executeQuery("SELECT COALESCE(MAX(version),0) FROM schema_migration")){version=r.next()?r.getLong(1):0;}
        if(version<16) throw new SQLException("Observation Registry requires schema 016; world is schema "+version+".");
        if(version>WorldStorageContracts.DATABASE_SCHEMA_VERSION) throw new SQLException("World schema "+version+" is newer than this Observation Registry supports.");
        for(String name:List.of("observation_world_summary","npc_population_observation","npc_population_accounting_observation","creature_population_observation")) requireObject(c,"view",name);
    }

    private static void requireObject(Connection c,String type,String name)throws SQLException{
        try(PreparedStatement s=c.prepareStatement("SELECT 1 FROM sqlite_master WHERE type=? AND name=?")){s.setString(1,type);s.setString(2,name);try(ResultSet r=s.executeQuery()){if(!r.next())throw new SQLException("Observation schema object is missing: "+name);}}
    }
    private static void bind(PreparedStatement s,long since)throws SQLException{s.setLong(1,since);s.setLong(2,since);}
    private static Long nullable(ResultSet r,int column)throws SQLException{long value=r.getLong(column);return r.wasNull()?null:value;}
    private static String text(String value,String name){Objects.requireNonNull(value,name);String result=value.trim();if(result.isEmpty())throw new IllegalArgumentException(name+" must not be blank.");return result;}

    public record WorldSummary(String worldId,String displayName,long npcPopulations,long npcPopulationTotal,
            long creaturePopulations,long creatureEstimatedTotal,long factionPresences,long observationEvents,
            long currentTick,String canonicalTime,long populationLedgerRows){}
    public record NpcPopulationRow(String populationId,String stationId,String stationName,long civilians,
            long industrialWorkers,long logisticsWorkers,long securityPersonnel,long medicalPersonnel,
            long scientificPersonnel,long temporaryResidents,long refugees,long totalPopulation,long housingCapacity,
            long lifeSupportCapacity,long employmentCapacity,int morale,long lastTick){}
    public record PopulationLedgerRow(String ledgerId,String populationId,String stationId,String stationName,long tickSequence,
            long beforeTotal,long births,long deaths,long immigration,long emigration,long disasterLosses,long otherGains,
            long otherLosses,long afterTotal,long housingCapacity,long lifeSupportCapacity,long employmentCapacity,int morale,
            int populationIndexBefore,int populationIndexAfter,String primaryCause,String evidenceKey,String summary,
            double baselinePopulationPerIndex,String reconciliationStatus){}
    public record CreaturePopulationRow(String populationId,String locationId,String locationName,String speciesKey,
            String populationClass,long estimatedCount,int biomass,int health,int foodStress,int habitatSupport,
            int migrationPressure,int confidence,String territoryStatus,int territoryPressure,int nestStrength,long lastTick){}
    public record FactionPresenceRow(String presenceId,String locationId,String locationName,String factionKey,int influence,
            String presenceState,String seedSource,long lastTick){}
    public record FlowRow(String flowId,String entityType,String populationId,String origin,String destination,long quantity,
            long losses,String cause,String status,Long departureTick,Long arrivalTick,long createdTick,long updatedTick,String summary){}
    public record EventRow(String eventId,long tickSequence,String canonicalTime,String category,String entityType,
            String entityId,String primaryCause,String evidenceKey,String contributingFactors,long magnitude,String visibility,
            int confidence,String summary){}
    public record SnapshotRow(String snapshotId,long tickSequence,String parentSnapshotId,String rulesVersion,
            String createdAt,String status,String source){}
    public record MetricRow(String metricId,String entityType,String entityId,String metricKey,long tickSequence,
            double numericValue,String unit,String snapshotId){}
    public record Snapshot(WorldSummary summary,List<NpcPopulationRow> npcPopulations,
            List<PopulationLedgerRow> populationLedgers,List<CreaturePopulationRow> creaturePopulations,
            List<FactionPresenceRow> factionPresence,List<FlowRow> flows,List<EventRow> events,
            List<SnapshotRow> snapshots,List<MetricRow> metrics,long changedSinceTick){
        public Snapshot{Objects.requireNonNull(summary,"summary");npcPopulations=List.copyOf(npcPopulations);
            populationLedgers=List.copyOf(populationLedgers);creaturePopulations=List.copyOf(creaturePopulations);
            factionPresence=List.copyOf(factionPresence);flows=List.copyOf(flows);events=List.copyOf(events);
            snapshots=List.copyOf(snapshots);metrics=List.copyOf(metrics);}
    }
}
