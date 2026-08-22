package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldLock;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock.ClockSnapshot;

import java.io.IOException;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

/**
 * Seals one immutable programmatic newspaper edition for every completed simulation day.
 *
 * <p>The archive is downstream of the authoritative simulation writer. Stories are synthesized only from
 * committed evidence and an end-of-day station-condition snapshot. Once an edition exists it is never updated;
 * later simulation changes therefore cannot rewrite yesterday's paper.</p>
 */
public final class DailyNewspaperArchive {
    private static final long DAY_NANOS = Duration.ofDays(1).toNanos();
    private static final DateTimeFormatter DISPLAY_DATE = DateTimeFormatter.ofPattern("MMMM d, uuuu");
    private static final String MASTHEAD = "THE EUROPA DAILY OBSERVER";

    private DailyNewspaperArchive() { }

    public static void sealClosedDays(WorldPaths world, ClockSnapshot before, ClockSnapshot after)
            throws IOException, SQLException {
        Objects.requireNonNull(world, "world");
        Objects.requireNonNull(before, "before");
        Objects.requireNonNull(after, "after");
        LocalDate beforeDate = before.canonicalTime().atZone(ZoneOffset.UTC).toLocalDate();
        LocalDate afterDate = after.canonicalTime().atZone(ZoneOffset.UTC).toLocalDate();
        if (!afterDate.isAfter(beforeDate)) return;
        if (!before.tickSize().equals(after.tickSize())) {
            throw new SQLException("Daily newspaper sealing requires a stable simulation tick size.");
        }
        requireDriver();
        try (WorldLock ignored = WorldStorageContracts.acquireExclusiveLock(world);
             Connection connection = DriverManager.getConnection("jdbc:sqlite:" + world.database())) {
            configure(connection);
            ensureSchema(connection);
            UUID worldId = worldId(connection);
            boolean originalAutoCommit = connection.getAutoCommit();
            connection.setAutoCommit(false);
            try {
                for (LocalDate day = beforeDate; day.isBefore(afterDate); day = day.plusDays(1)) {
                    sealEdition(connection, worldId, day, after);
                }
                connection.commit();
            } catch (SQLException | RuntimeException exception) {
                try { connection.rollback(); } catch (SQLException rollbackFailure) { exception.addSuppressed(rollbackFailure); }
                throw exception;
            } finally {
                connection.setAutoCommit(originalAutoCommit);
            }
        }
    }

    static void ensureSchema(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            for (String sql : DailyNewspaperSchema.statements()) statement.execute(sql);
        }
    }

    private static void sealEdition(Connection connection, UUID worldId, LocalDate date, ClockSnapshot reference)
            throws SQLException {
        String editionId = worldId + ":daily-news:" + date;
        if (exists(connection, editionId)) return;

        Instant start = date.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant endExclusive = date.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        long tickNanos = tickNanos(reference.tickSize());
        long ticksPerDay = Math.max(1L, ceilDiv(DAY_NANOS, tickNanos));
        long lowerTick = Math.max(0L, reference.tickSequence() - ticksPerDay * 2L - 8L);
        long upperTick = reference.tickSequence();

        List<Seed> seeds = new ArrayList<>();
        collectStationEvents(connection, worldId, lowerTick, upperTick, seeds);
        collectOrganizationNews(connection, worldId, lowerTick, upperTick, seeds);
        collectVoyages(connection, worldId, lowerTick, upperTick, seeds);
        collectEncounters(connection, worldId, lowerTick, upperTick, seeds);
        collectFleetResponse(connection, worldId, lowerTick, upperTick, seeds);
        collectNaturalEvents(connection, worldId, lowerTick, upperTick, seeds);
        collectPopulationEvents(connection, worldId, lowerTick, upperTick, seeds);
        seeds.removeIf(seed -> !date.equals(timeForTick(seed.tick(), reference).atZone(ZoneOffset.UTC).toLocalDate()));
        seeds.sort(Comparator.comparingInt(Seed::severity).reversed()
                .thenComparing(Comparator.comparingLong(Seed::tick).reversed())
                .thenComparing(Seed::sourceKey));

        if (seeds.isEmpty()) {
            seeds.add(new Seed("quiet-watch:" + date, Math.max(0, reference.tickSequence() - 1), "WORLD", 0,
                    null, "Europa-wide desk", "Quiet watch closes across Europa",
                    "No reportable committed event crossed the daily editorial threshold.",
                    "The observer archive recorded no station, voyage, encounter, fleet, natural, institutional, or population event for this simulation day."));
        }

        String lead = seeds.get(0).headline();
        long startTick = seeds.stream().mapToLong(Seed::tick).min().orElse(Math.max(0, reference.tickSequence() - 1));
        long endTick = seeds.stream().mapToLong(Seed::tick).max().orElse(Math.max(0, reference.tickSequence() - 1));
        int topSeverity = seeds.stream().mapToInt(Seed::severity).max().orElse(0);

        try (PreparedStatement insert = connection.prepareStatement(
                "INSERT INTO daily_newspaper_edition(edition_id,world_id,edition_date,period_start_time,period_end_time,"
                        + "start_tick,end_tick,sealed_tick,sealed_time,masthead,lead_headline,article_count,top_severity) "
                        + "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)")) {
            insert.setString(1, editionId);
            insert.setString(2, worldId.toString());
            insert.setString(3, date.toString());
            insert.setString(4, start.toString());
            insert.setString(5, endExclusive.toString());
            insert.setLong(6, Math.max(0, startTick));
            insert.setLong(7, Math.max(startTick, endTick));
            insert.setLong(8, reference.tickSequence());
            insert.setString(9, reference.canonicalTime().toString());
            insert.setString(10, MASTHEAD);
            insert.setString(11, lead);
            insert.setInt(12, seeds.size());
            insert.setInt(13, topSeverity);
            insert.executeUpdate();
        }

        int order = 0;
        for (Seed seed : seeds) {
            Conditions conditions = conditions(connection, seed.stationId(), seed.stationName());
            String body = synthesize(date, seed, conditions);
            insertArticle(connection, worldId, editionId, seed, conditions, body, order++);
        }
    }

    private static void insertArticle(Connection connection, UUID worldId, String editionId, Seed seed,
                                      Conditions conditions, String body, int order) throws SQLException {
        try (PreparedStatement insert = connection.prepareStatement(
                "INSERT INTO daily_newspaper_article(article_id,edition_id,world_id,source_key,source_tick,source_category,"
                        + "severity,station_id,station_name,headline,dek,body,conditions_snapshot,evidence_summary,article_order) "
                        + "VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")) {
            insert.setString(1, editionId + ":article:" + order);
            insert.setString(2, editionId);
            insert.setString(3, worldId.toString());
            insert.setString(4, seed.sourceKey());
            insert.setLong(5, seed.tick());
            insert.setString(6, seed.category());
            insert.setInt(7, clamp(seed.severity()));
            if (conditions.stationId() == null) insert.setNull(8, java.sql.Types.VARCHAR);
            else insert.setString(8, conditions.stationId());
            insert.setString(9, conditions.stationName());
            insert.setString(10, seed.headline());
            insert.setString(11, seed.dek());
            insert.setString(12, body);
            insert.setString(13, conditions.render());
            insert.setString(14, seed.evidence());
            insert.setInt(15, order);
            insert.executeUpdate();
        }
    }

    private static String synthesize(LocalDate date, Seed seed, Conditions c) {
        String dateline = c.stationName().toUpperCase() + " — ";
        StringBuilder out = new StringBuilder();
        out.append(seed.headline()).append("\n")
                .append(seed.dek()).append("\n\n")
                .append(dateline).append(seed.evidence()).append("\n\n")
                .append("At the close of the ").append(DISPLAY_DATE.format(date)).append(" watch, the frozen station snapshot reported ")
                .append(c.conditionSentence()).append(". ");
        if (c.controlFaction() != null && !c.controlFaction().isBlank()) {
            out.append("Political control remained with ").append(c.controlFaction());
            if (c.controlState() != null && !c.controlState().isBlank()) {
                out.append(" under a ").append(c.controlState().toLowerCase()).append(" control state");
            }
            out.append(". ");
        }
        out.append("These figures are the conditions captured when the daily edition was sealed and are not recomputed when the article is reopened.\n\n")
                .append(implication(seed.category(), seed.severity())).append("\n\n")
                .append("SOURCE NOTE — This article was programmatically synthesized from committed simulation evidence at tick ")
                .append(seed.tick()).append(". Source key: ").append(seed.sourceKey()).append(". No later world state is allowed to rewrite this edition.");
        return out.toString();
    }

    private static String implication(String category, int severity) {
        String pressure = severity >= 75 ? "high-impact" : severity >= 45 ? "material" : severity >= 20 ? "notable" : "routine";
        return switch (category) {
            case "SECURITY", "ENCOUNTER", "FLEET" -> "EDITORIAL CONTEXT — The event is classified as " + pressure
                    + " security or recovery activity. Follow-on effects should be read from later editions rather than projected backward into this report.";
            case "INSTITUTION", "ECONOMY" -> "EDITORIAL CONTEXT — The event is classified as " + pressure
                    + " institutional or economic activity. Treasury, supply, labor and control consequences remain separated from this frozen report until they appear in committed evidence.";
            case "NATURAL" -> "EDITORIAL CONTEXT — The event is classified as " + pressure
                    + " environmental activity. Ecology and geology may continue to evolve after publication, but this article preserves only the state known at the day boundary.";
            case "POPULATION" -> "EDITORIAL CONTEXT — The event is classified as " + pressure
                    + " demographic activity. Population changes are reported from the conserved population ledger rather than estimated from prose.";
            case "VOYAGE" -> "EDITORIAL CONTEXT — The event is classified as " + pressure
                    + " traffic activity. Vessel outcomes occurring after the edition boundary belong to the following day's paper.";
            default -> "EDITORIAL CONTEXT — The event is classified as " + pressure
                    + " current affairs. Later consequences belong to later editions and are intentionally excluded from this frozen account.";
        };
    }

    private static Conditions conditions(Connection connection, String requestedStationId, String fallbackName)
            throws SQLException {
        if (requestedStationId == null || requestedStationId.isBlank()) {
            return new Conditions(null, value(fallbackName, "Europa-wide desk"), null, null,
                    0,0,0,0,0,0,0,0,0);
        }
        String sql = "SELECT ws.station_id,ws.display_name,s.status,s.credits,s.supplies,s.ore,s.industry,s.security,s.integrity,s.threat,s.research,"
                + "COALESCE((SELECT total_population FROM npc_population_observation p WHERE p.station_id=ws.station_id LIMIT 1),0),"
                + "(SELECT controlling_major_faction FROM station_political_observation p WHERE p.station_id=ws.station_id LIMIT 1),"
                + "(SELECT contest_state FROM station_political_observation p WHERE p.station_id=ws.station_id LIMIT 1) "
                + "FROM world_station ws LEFT JOIN station_simulation_state s ON s.station_id=ws.station_id WHERE ws.station_id=?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, requestedStationId);
            try (ResultSet r = statement.executeQuery()) {
                if (!r.next()) return new Conditions(null, value(fallbackName, "Europa-wide desk"), null, null,
                        0,0,0,0,0,0,0,0,0);
                return new Conditions(r.getString(1),r.getString(2),r.getString(13),r.getString(14),
                        r.getInt(3)==0?0:r.getInt(4),r.getInt(5),r.getInt(6),r.getInt(7),r.getInt(8),r.getInt(9),
                        r.getInt(10),r.getInt(11),r.getLong(12), r.getString(3));
            }
        }
    }

    private static void collectStationEvents(Connection c, UUID worldId, long low, long high, List<Seed> out) throws SQLException {
        String sql = "SELECT e.event_id,e.tick_sequence,e.event_type,e.severity,e.headline,e.narrative,e.station_id,s.display_name "
                + "FROM station_event e JOIN world_station s ON s.station_id=e.station_id WHERE e.world_id=? AND e.tick_sequence BETWEEN ? AND ? "
                + "AND e.visibility<>'HIDDEN'";
        try (PreparedStatement p=c.prepareStatement(sql)) { bindRange(p,worldId,low,high); try(ResultSet r=p.executeQuery()) {
            while(r.next()) out.add(new Seed("station:"+r.getString(1),r.getLong(2),categoryForStationEvent(r.getString(3)),
                    clamp(r.getInt(4)*20),r.getString(7),r.getString(8),r.getString(5),title(r.getString(3)),r.getString(6)));
        }}
    }

    private static void collectOrganizationNews(Connection c, UUID worldId, long low, long high, List<Seed> out) throws SQLException {
        String sql = "SELECT n.news_event_id,n.tick_sequence,n.event_type,n.severity,n.headline,n.details,n.station_id,"
                + "COALESCE(s.display_name,'Europa-wide desk') FROM organization_news_event n LEFT JOIN world_station s ON s.station_id=n.station_id "
                + "WHERE n.world_id=? AND n.tick_sequence BETWEEN ? AND ?";
        try (PreparedStatement p=c.prepareStatement(sql)) { bindRange(p,worldId,low,high); try(ResultSet r=p.executeQuery()) {
            while(r.next()) out.add(new Seed("institution:"+r.getString(1),r.getLong(2),"INSTITUTION",clamp(r.getInt(4)),
                    r.getString(7),r.getString(8),r.getString(5),title(r.getString(3)),r.getString(6)));
        }}
    }

    private static void collectVoyages(Connection c, UUID worldId, long low, long high, List<Seed> out) throws SQLException {
        String sql = "SELECT l.log_id,l.tick_sequence,l.event_type,l.severity,l.summary,l.details,v.display_name,v.home_station_id,"
                + "COALESCE(s.display_name,'Europa traffic desk') FROM npc_voyage_log l JOIN npc_vessel v ON v.npc_vessel_id=l.npc_vessel_id "
                + "LEFT JOIN world_station s ON s.station_id=v.home_station_id WHERE l.world_id=? AND l.tick_sequence BETWEEN ? AND ?";
        try (PreparedStatement p=c.prepareStatement(sql)) { bindRange(p,worldId,low,high); try(ResultSet r=p.executeQuery()) {
            while(r.next()) out.add(new Seed("voyage:"+r.getString(1),r.getLong(2),"VOYAGE",clamp(r.getInt(4)),r.getString(8),r.getString(9),
                    r.getString(7)+": "+title(r.getString(3)),r.getString(5),r.getString(6)));
        }}
    }

    private static void collectEncounters(Connection c, UUID worldId, long low, long high, List<Seed> out) throws SQLException {
        String sql = "SELECT e.encounter_id,e.tick_sequence,e.hazard_type,e.challenge,e.outcome,e.narrative,v.display_name,v.home_station_id,"
                + "COALESCE(s.display_name,'Europa traffic desk') FROM world_encounter e JOIN npc_vessel v ON v.npc_vessel_id=e.npc_vessel_id "
                + "LEFT JOIN world_station s ON s.station_id=v.home_station_id WHERE e.world_id=? AND e.tick_sequence BETWEEN ? AND ?";
        try (PreparedStatement p=c.prepareStatement(sql)) { bindRange(p,worldId,low,high); try(ResultSet r=p.executeQuery()) {
            while(r.next()) out.add(new Seed("encounter:"+r.getString(1),r.getLong(2),"ENCOUNTER",clamp(r.getInt(4)),r.getString(8),r.getString(9),
                    r.getString(7)+" reports "+title(r.getString(3)),"Outcome: "+title(r.getString(5)),r.getString(6)));
        }}
    }

    private static void collectFleetResponse(Connection c, UUID worldId, long low, long high, List<Seed> out) throws SQLException {
        String sql = "SELECT l.log_id,l.tick_sequence,l.event_type,l.summary,o.difficulty,COALESCE(o.target_station_id,o.origin_station_id),"
                + "COALESCE(s.display_name,loc.display_name,'Europa fleet desk') FROM fleet_response_log l "
                + "JOIN fleet_response_operation o ON o.operation_id=l.operation_id "
                + "LEFT JOIN world_station s ON s.station_id=COALESCE(o.target_station_id,o.origin_station_id) "
                + "LEFT JOIN world_location loc ON loc.location_id=o.target_location_id WHERE l.world_id=? AND l.tick_sequence BETWEEN ? AND ?";
        try (PreparedStatement p=c.prepareStatement(sql)) { bindRange(p,worldId,low,high); try(ResultSet r=p.executeQuery()) {
            while(r.next()) out.add(new Seed("fleet:"+r.getString(1),r.getLong(2),"FLEET",clamp(r.getInt(5)),r.getString(6),r.getString(7),
                    "Fleet response: "+title(r.getString(3)),r.getString(4),r.getString(4)));
        }}
    }

    private static void collectNaturalEvents(Connection c, UUID worldId, long low, long high, List<Seed> out) throws SQLException {
        String sql = "SELECT n.event_id,n.tick_sequence,n.event_type,n.severity,n.summary,ws.station_id,l.display_name "
                + "FROM natural_world_event n JOIN world_location l ON l.location_id=n.location_id "
                + "LEFT JOIN world_station ws ON ws.location_id=n.location_id WHERE n.world_id=? AND n.tick_sequence BETWEEN ? AND ?";
        try (PreparedStatement p=c.prepareStatement(sql)) { bindRange(p,worldId,low,high); try(ResultSet r=p.executeQuery()) {
            while(r.next()) out.add(new Seed("natural:"+r.getString(1),r.getLong(2),"NATURAL",clamp(r.getInt(4)),r.getString(6),r.getString(7),
                    title(r.getString(3))+" recorded near "+r.getString(7),"Environmental watch report",r.getString(5)));
        }}
    }

    private static void collectPopulationEvents(Connection c, UUID worldId, long low, long high, List<Seed> out) throws SQLException {
        String sql = "SELECT l.ledger_id,l.tick_sequence,l.station_id,s.display_name,l.before_total,l.after_total,l.primary_cause,l.summary "
                + "FROM npc_population_ledger l JOIN world_station s ON s.station_id=l.station_id "
                + "WHERE l.world_id=? AND l.tick_sequence BETWEEN ? AND ? AND l.before_total<>l.after_total";
        try (PreparedStatement p=c.prepareStatement(sql)) { bindRange(p,worldId,low,high); try(ResultSet r=p.executeQuery()) {
            while(r.next()) {
                long delta=r.getLong(6)-r.getLong(5);
                int severity=clamp((int)Math.min(100,Math.max(10,Math.abs(delta)/5)));
                String direction=delta>0?"population rises": "population contracts";
                out.add(new Seed("population:"+r.getString(1),r.getLong(2),"POPULATION",severity,r.getString(3),r.getString(4),
                        r.getString(4)+" "+direction, signed(delta)+" residents · "+title(r.getString(7)),r.getString(8)));
            }
        }}
    }

    private static String categoryForStationEvent(String eventType) {
        return switch (value(eventType, "")) {
            case "ATTACK", "ACCIDENT", "SABOTAGE", "INVENTORY_LOSS" -> "SECURITY";
            case "CONSUMPTION", "PRODUCTION", "SHORTAGE", "DELIVERY" -> "ECONOMY";
            case "POPULATION" -> "POPULATION";
            case "FACTION_PLAN" -> "INSTITUTION";
            case "RESEARCH" -> "RESEARCH";
            default -> "STATION";
        };
    }

    private static boolean exists(Connection c, String editionId) throws SQLException {
        try (PreparedStatement p=c.prepareStatement("SELECT 1 FROM daily_newspaper_edition WHERE edition_id=?")) {
            p.setString(1,editionId); try(ResultSet r=p.executeQuery()) { return r.next(); }
        }
    }

    private static UUID worldId(Connection c) throws SQLException {
        try (Statement s=c.createStatement(); ResultSet r=s.executeQuery("SELECT world_id FROM world_metadata LIMIT 1")) {
            if(!r.next()) throw new SQLException("Daily newspaper requires world metadata.");
            return UUID.fromString(r.getString(1));
        }
    }

    private static void bindRange(PreparedStatement p, UUID worldId, long low, long high) throws SQLException {
        p.setString(1,worldId.toString()); p.setLong(2,low); p.setLong(3,high);
    }

    private static Instant timeForTick(long tick, ClockSnapshot reference) {
        long delta = reference.tickSequence()-tick;
        return reference.canonicalTime().minus(reference.tickSize().multipliedBy(delta));
    }

    private static long tickNanos(Duration duration) throws SQLException {
        try {
            long nanos=duration.toNanos();
            if(nanos<=0) throw new SQLException("Simulation tick size must be positive.");
            return nanos;
        } catch (ArithmeticException exception) {
            throw new SQLException("Simulation tick size is too large for newspaper day bucketing.",exception);
        }
    }

    private static long ceilDiv(long value, long divisor) { return value/divisor + (value%divisor==0?0:1); }
    private static int clamp(int value) { return Math.max(0,Math.min(100,value)); }
    private static String signed(long value) { return value>0?"+"+value:Long.toString(value); }
    private static String title(String value) {
        if(value==null||value.isBlank()) return "Current event";
        String[] words=value.toLowerCase().replace('_',' ').split("\\s+");
        StringBuilder out=new StringBuilder();
        for(String word:words){ if(word.isBlank()) continue; if(!out.isEmpty()) out.append(' '); out.append(Character.toUpperCase(word.charAt(0))).append(word.substring(1)); }
        return out.toString();
    }
    private static String value(String value,String fallback) { return value==null||value.isBlank()?fallback:value; }

    private static void configure(Connection c) throws SQLException {
        try(Statement s=c.createStatement()) {
            s.execute("PRAGMA foreign_keys=ON");
            s.execute("PRAGMA busy_timeout=5000");
            s.execute("PRAGMA journal_mode=WAL");
            s.execute("PRAGMA synchronous=FULL");
        }
    }
    private static void requireDriver() throws SQLException {
        try { Class.forName("org.sqlite.JDBC"); }
        catch(ClassNotFoundException e){ throw new SQLException("SQLite JDBC driver is unavailable.",e); }
    }

    private record Seed(String sourceKey,long tick,String category,int severity,String stationId,String stationName,
                        String headline,String dek,String evidence) { }

    private record Conditions(String stationId,String stationName,String controlFaction,String controlState,
                              int credits,int supplies,int ore,int industry,int security,int integrity,int threat,
                              int research,long population,String stationStatus) {
        private Conditions(String stationId,String stationName,String controlFaction,String controlState,
                           int credits,int supplies,int ore,int industry,int security,int integrity,int threat,
                           int research,long population) {
            this(stationId,stationName,controlFaction,controlState,credits,supplies,ore,industry,security,integrity,threat,research,population,null);
        }
        String conditionSentence() {
            if(stationId==null) return "no station-specific operational snapshot was available for this location";
            return "status "+value(stationStatus,"UNKNOWN")+", "+population+" residents, "+credits+" credits, "+supplies
                    +" supplies, "+ore+" ore, industry "+industry+", security "+security+", integrity "+integrity
                    +", threat "+threat+" and research "+research;
        }
        String render() {
            if(stationId==null) return "Station: "+stationName+"\nStation-specific operational snapshot: unavailable\n";
            return "Station: "+stationName+"\nStatus: "+value(stationStatus,"UNKNOWN")+"\nPopulation: "+population
                    +"\nCredits: "+credits+"\nSupplies: "+supplies+"\nOre: "+ore+"\nIndustry: "+industry
                    +"\nSecurity: "+security+"\nIntegrity: "+integrity+"\nThreat: "+threat+"\nResearch: "+research
                    +"\nControlling faction: "+value(controlFaction,"—")+"\nControl state: "+value(controlState,"—")+"\n";
        }
    }
}
