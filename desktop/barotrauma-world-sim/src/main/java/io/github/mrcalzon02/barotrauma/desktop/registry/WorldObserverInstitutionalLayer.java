package io.github.mrcalzon02.barotrauma.desktop.registry;

import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Query-only projection of the schema-033 through schema-036 organization, political-control,
 * institutional-finance, partnership, asset, and regional-conflict authorities for the live observer.
 */
public final class WorldObserverInstitutionalLayer {
    private static final int ORGANIZATION_LIMIT = 12_000;
    private static final int PRESENCE_LIMIT = 20_000;
    private static final int OPERATION_LIMIT = 3_000;
    private static final int ASSET_LIMIT = 6_000;
    private static final int NEWS_LIMIT = 1_000;
    private static final int LEDGER_LIMIT = 3_000;

    private WorldObserverInstitutionalLayer() { }

    public static InstitutionalSnapshot load(WorldPaths world) throws Exception {
        Objects.requireNonNull(world, "world");
        Class.forName("org.sqlite.JDBC");
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + world.database())) {
            configureReadOnly(connection);
            verifySchema(connection);
            return new InstitutionalSnapshot(
                    summary(connection), organizations(connection), presences(connection), politics(connection),
                    operations(connection), assets(connection), conflicts(connection), news(connection), ledgers(connection));
        }
    }

    public static String world(InstitutionalSnapshot snapshot) {
        Objects.requireNonNull(snapshot, "snapshot");
        Summary s = snapshot.summary();
        StringBuilder out = new StringBuilder("ORGANIZATIONS / POLITICAL ECONOMY\n\n")
                .append("Organizations: ").append(s.organizationCount()).append("\n")
                .append("Sovereign factions: ").append(s.sovereignFactionCount()).append("\n")
                .append("Station-local institutions: ").append(s.localInstitutionCount()).append("\n")
                .append("Active organization operations: ").append(s.activeOperationCount()).append("\n")
                .append("Durable institutional assets: ").append(s.assetCount()).append("\n")
                .append("Active regional conflicts: ").append(s.activeConflictCount()).append("\n")
                .append("Combined institutional treasury: ").append(s.totalTreasury()).append(" credits\n")
                .append("Combined institutional debt: ").append(s.totalDebt()).append(" credits\n")
                .append("\nRECENT INSTITUTIONAL NEWS\n");
        if (snapshot.news().isEmpty()) out.append("No institutional news has been committed.\n");
        snapshot.news().stream().limit(10).forEach(row -> out.append("• [Tick ").append(row.tick())
                .append("] ").append(value(row.stationName())).append(" · ").append(row.headline()).append("\n")
                .append("  ").append(value(row.organizationName())).append(" · ").append(row.eventType())
                .append(" · severity ").append(row.severity()).append("\n")
                .append("  ").append(row.details()).append("\n"));
        return out.toString();
    }

    public static String location(String locationName, InstitutionalSnapshot snapshot) {
        Objects.requireNonNull(locationName, "locationName");
        Objects.requireNonNull(snapshot, "snapshot");
        StringBuilder out = new StringBuilder("INSTITUTIONAL / POLITICAL DOSSIER\n\n");

        PoliticalRow political = snapshot.politics().stream()
                .filter(row -> locationName.equals(row.stationName())).findFirst().orElse(null);
        out.append("STATION CONTROL\n");
        if (political == null) {
            out.append("No station-control authority is associated with this location.\n");
        } else {
            out.append("Major faction: ").append(value(political.controllingMajorFaction())).append("\n")
                    .append("Governing bloc: ").append(value(political.controllingSubfaction())).append("\n")
                    .append("Control score / state: ").append(political.controlScore()).append(" / ")
                    .append(political.contestState()).append("\n")
                    .append("Permanent sovereign HQ: ").append(political.headquartersLocked() ? "yes" : "no").append("\n")
                    .append("Last control change tick: ").append(political.lastChangedTick()).append("\n");
        }

        List<PresenceRow> presences = snapshot.presences().stream()
                .filter(row -> locationName.equals(row.stationName()))
                .sorted(Comparator.comparingInt(WorldObserverInstitutionalLayer::peakInfluence).reversed()
                        .thenComparing(PresenceRow::organizationName))
                .limit(14).toList();
        out.append("\nORGANIZATION PRESENCE\n");
        if (presences.isEmpty()) out.append("No organization-presence records.\n");
        for (PresenceRow row : presences) {
            out.append("• ").append(row.organizationName()).append(" · ").append(row.organizationType())
                    .append(" · ").append(row.presenceState()).append("\n")
                    .append("  Political/economic/labor/security: ").append(row.politicalInfluence()).append(" / ")
                    .append(row.economicInfluence()).append(" / ").append(row.laborInfluence()).append(" / ")
                    .append(row.securityInfluence()).append("\n")
                    .append("  Alignment: ").append(value(row.alignedMajorName())).append("\n");
        }

        List<OrganizationRow> headquartered = snapshot.organizations().stream()
                .filter(row -> locationName.equals(row.headquartersStation()))
                .sorted(Comparator.comparing(OrganizationRow::organizationType).thenComparing(OrganizationRow::displayName))
                .limit(18).toList();
        out.append("\nHEADQUARTERED INSTITUTIONS\n");
        if (headquartered.isEmpty()) out.append("No organization headquarters recorded here.\n");
        for (OrganizationRow row : headquartered) {
            out.append("• ").append(row.displayName()).append(" · ").append(row.organizationType()).append("\n")
                    .append("  Treasury/debt/liquidity: ").append(row.treasury()).append(" / ")
                    .append(row.debt()).append(" / ").append(row.liquidity()).append("\n")
                    .append("  Employees/members/contractors/crews: ").append(row.employees()).append(" / ")
                    .append(row.members()).append(" / ").append(row.contractors()).append(" / ")
                    .append(row.activeCrews()).append("\n")
                    .append("  Active operations/assets: ").append(row.activeOperations()).append(" / ")
                    .append(row.ownedAssets()).append(" · aligned ").append(value(row.alignedMajorName())).append("\n");
        }

        List<OperationRow> operations = snapshot.operations().stream()
                .filter(row -> locationName.equals(row.targetStationName()))
                .sorted(Comparator.comparingLong(OperationRow::startedTick).reversed())
                .limit(12).toList();
        out.append("\nORGANIZATION OPERATIONS / CONTRACTS\n");
        if (operations.isEmpty()) out.append("No organization operations target this station.\n");
        for (OperationRow row : operations) {
            out.append("• [Tick ").append(row.startedTick()).append("] ").append(row.operationType())
                    .append(" · ").append(row.status()).append("\n")
                    .append("  Sponsor: ").append(row.sponsorName()).append(" · due ").append(row.dueTick()).append("\n")
                    .append("  Partners: ").append(value(row.partners())).append("\n")
                    .append("  Cost/cash/borrowed: ").append(row.estimatedCost()).append(" / ")
                    .append(row.sponsorCash()).append(" / ").append(row.borrowedAmount()).append("\n")
                    .append("  Lender: ").append(value(row.financingOrganization())).append(" · settled ")
                    .append(row.settled() ? "yes" : "no").append(" · value ").append(row.settlementValue()).append("\n");
        }

        List<AssetRow> assets = snapshot.assets().stream().filter(row -> locationName.equals(row.stationName()))
                .sorted(Comparator.comparingLong(AssetRow::createdTick).reversed()).limit(14).toList();
        out.append("\nDURABLE STATION ASSETS\n");
        if (assets.isEmpty()) out.append("No institutional construction assets recorded.\n");
        for (AssetRow row : assets) {
            out.append("• ").append(row.assetType()).append(" L").append(row.assetLevel())
                    .append(" · owner ").append(row.ownerName()).append(" · tick ").append(row.createdTick()).append("\n")
                    .append("  Capacity/industry/security/research/supply: ").append(row.capacityBonus()).append(" / ")
                    .append(row.industryBonus()).append(" / ").append(row.securityBonus()).append(" / ")
                    .append(row.researchBonus()).append(" / ").append(row.supplyBonus()).append("\n");
        }

        List<ConflictRow> conflicts = snapshot.conflicts().stream()
                .filter(row -> locationName.equals(row.centerLocationName()))
                .sorted(Comparator.comparingInt(ConflictRow::intensity).reversed()).toList();
        out.append("\nREGIONAL CONFLICTS\n");
        if (conflicts.isEmpty()) out.append("No regional conflict is centered here.\n");
        for (ConflictRow row : conflicts) {
            out.append("• ").append(row.displayName()).append(" · ").append(row.status())
                    .append(" · intensity ").append(row.intensity()).append("\n")
                    .append("  Participants: ").append(value(row.participants())).append("\n")
                    .append("  ").append(row.summary()).append("\n");
        }

        List<NewsRow> localNews = snapshot.news().stream().filter(row -> locationName.equals(row.stationName()))
                .limit(10).toList();
        out.append("\nINSTITUTIONAL NEWS\n");
        if (localNews.isEmpty()) out.append("No institutional news recorded for this station.\n");
        for (NewsRow row : localNews) {
            out.append("• [Tick ").append(row.tick()).append("] ").append(row.headline()).append(" · ")
                    .append(row.eventType()).append(" · severity ").append(row.severity()).append("\n")
                    .append("  ").append(value(row.organizationName())).append(" · ").append(row.details()).append("\n");
        }

        Set<String> localOrganizations = headquartered.stream().map(OrganizationRow::displayName).collect(Collectors.toSet());
        List<LedgerRow> ledgers = snapshot.ledgers().stream()
                .filter(row -> localOrganizations.contains(row.organizationName()))
                .limit(12).toList();
        out.append("\nINSTITUTIONAL FINANCE LEDGER\n");
        if (ledgers.isEmpty()) out.append("No recent ledger entries for organizations headquartered here.\n");
        for (LedgerRow row : ledgers) {
            out.append("• [Tick ").append(row.tick()).append("] ").append(row.organizationName())
                    .append(" · ").append(row.entryType()).append(" · ").append(signed(row.amount())).append("\n")
                    .append("  Balance ").append(row.balanceAfter()).append(" · counterparty ")
                    .append(value(row.counterpartyName())).append("\n")
                    .append("  ").append(row.summary()).append("\n");
        }
        return out.toString();
    }

    public static Map<String, InstitutionalSignal> signals(InstitutionalSnapshot snapshot) {
        Objects.requireNonNull(snapshot, "snapshot");
        Map<String, InstitutionalSignal> result = new LinkedHashMap<>();
        for (PoliticalRow row : snapshot.politics()) {
            result.put(row.stationName(), new InstitutionalSignal(row.controllingMajorFaction(), row.controlScore(),
                    row.contestState(), 0, row.headquartersLocked()));
        }
        for (ConflictRow row : snapshot.conflicts()) {
            InstitutionalSignal existing = result.get(row.centerLocationName());
            if (existing == null) {
                result.put(row.centerLocationName(), new InstitutionalSignal(null, 0, "UNCONTROLLED",
                        row.intensity(), false));
            } else {
                result.put(row.centerLocationName(), new InstitutionalSignal(existing.controllingFaction(),
                        existing.controlScore(), existing.contestState(),
                        Math.max(existing.conflictIntensity(), row.intensity()), existing.headquartersLocked()));
            }
        }
        return Map.copyOf(result);
    }

    private static Summary summary(Connection c) throws SQLException {
        String sql = "SELECT "
                + "(SELECT COUNT(*) FROM world_organization),"
                + "(SELECT COUNT(*) FROM world_organization WHERE organization_type='MAJOR_FACTION'),"
                + "(SELECT COUNT(*) FROM world_organization WHERE organization_key LIKE 'local-institution:%'),"
                + "(SELECT COUNT(*) FROM organization_operation WHERE status='ACTIVE'),"
                + "(SELECT COUNT(*) FROM organization_station_asset),"
                + "(SELECT COUNT(*) FROM regional_conflict_zone WHERE status IN ('TENSE','CONTESTED','OPEN_CONFLICT')),"
                + "COALESCE((SELECT SUM(treasury) FROM organization_finance_state),0),"
                + "COALESCE((SELECT SUM(debt) FROM organization_finance_state),0)";
        try (Statement statement = c.createStatement(); ResultSet r = statement.executeQuery(sql)) {
            if (!r.next()) throw new SQLException("Institutional summary is empty.");
            return new Summary(r.getLong(1), r.getLong(2), r.getLong(3), r.getLong(4),
                    r.getLong(5), r.getLong(6), r.getLong(7), r.getLong(8));
        }
    }

    private static List<OrganizationRow> organizations(Connection c) throws SQLException {
        String sql = "SELECT organization_id,display_name,organization_type,aligned_major_name,headquarters_station,"
                + "treasury,debt,credit_capacity,revenue_total,expense_total,payroll_per_tick,liquidity,last_tick,"
                + "employees,members,contractors,active_crews,recorded_inflows,recorded_outflows "
                + "FROM organization_finance_observation ORDER BY organization_type,display_name LIMIT " + ORGANIZATION_LIMIT;
        List<OrganizationRow> rows = new ArrayList<>();
        try (Statement statement = c.createStatement(); ResultSet r = statement.executeQuery(sql)) {
            while (r.next()) rows.add(new OrganizationRow(r.getString(1),r.getString(2),r.getString(3),r.getString(4),r.getString(5),
                    r.getLong(6),r.getLong(7),r.getLong(8),r.getLong(9),r.getLong(10),r.getLong(11),r.getInt(12),r.getLong(13),
                    r.getLong(14),r.getLong(15),r.getLong(16),r.getLong(17),r.getLong(18),r.getLong(19)));
        }
        return List.copyOf(rows);
    }

    private static List<PresenceRow> presences(Connection c) throws SQLException {
        String sql = "SELECT p.organization_id,o.display_name,o.organization_type,major.display_name,s.display_name,"
                + "p.political_influence,p.economic_influence,p.labor_influence,p.security_influence,p.presence_state,p.last_tick "
                + "FROM organization_station_presence p JOIN world_organization o ON o.organization_id=p.organization_id "
                + "LEFT JOIN world_organization major ON major.organization_id=o.aligned_major_organization_id "
                + "JOIN world_station s ON s.station_id=p.station_id "
                + "ORDER BY s.display_name,MAX(MAX(p.political_influence,p.economic_influence),MAX(p.labor_influence,p.security_influence)) DESC "
                + "LIMIT " + PRESENCE_LIMIT;
        List<PresenceRow> rows = new ArrayList<>();
        try (Statement statement = c.createStatement(); ResultSet r = statement.executeQuery(sql)) {
            while (r.next()) rows.add(new PresenceRow(r.getString(1),r.getString(2),r.getString(3),r.getString(4),r.getString(5),
                    r.getInt(6),r.getInt(7),r.getInt(8),r.getInt(9),r.getString(10),r.getLong(11)));
        }
        return List.copyOf(rows);
    }

    private static List<PoliticalRow> politics(Connection c) throws SQLException {
        List<PoliticalRow> rows = new ArrayList<>();
        try (Statement statement = c.createStatement(); ResultSet r = statement.executeQuery(
                "SELECT station_id,station_name,controlling_major_faction,controlling_subfaction,control_score,contest_state,"
                        + "last_changed_tick,headquarters_locked FROM station_political_observation ORDER BY station_name")) {
            while (r.next()) rows.add(new PoliticalRow(r.getString(1),r.getString(2),r.getString(3),r.getString(4),
                    r.getInt(5),r.getString(6),r.getLong(7),r.getInt(8)!=0));
        }
        return List.copyOf(rows);
    }

    private static List<OperationRow> operations(Connection c) throws SQLException {
        String sql = "SELECT operation_id,operation_type,status,started_tick,due_tick,sponsor_name,target_station_name,partners,"
                + "COALESCE(estimated_cost,0),COALESCE(sponsor_cash,0),COALESCE(borrowed_amount,0),financing_organization,"
                + "COALESCE(settled,0),COALESCE(settlement_value,0) FROM organization_operation_partnership_observation "
                + "ORDER BY started_tick DESC,operation_id LIMIT " + OPERATION_LIMIT;
        List<OperationRow> rows = new ArrayList<>();
        try (Statement statement = c.createStatement(); ResultSet r = statement.executeQuery(sql)) {
            while (r.next()) rows.add(new OperationRow(r.getString(1),r.getString(2),r.getString(3),r.getLong(4),r.getLong(5),
                    r.getString(6),r.getString(7),r.getString(8),r.getLong(9),r.getLong(10),r.getLong(11),r.getString(12),
                    r.getInt(13)!=0,r.getLong(14)));
        }
        return List.copyOf(rows);
    }

    private static List<AssetRow> assets(Connection c) throws SQLException {
        String sql = "SELECT asset_id,station_name,owner_name,asset_type,asset_level,capacity_bonus,industry_bonus,security_bonus,"
                + "research_bonus,supply_bonus,created_tick,source_operation_id FROM organization_station_asset_observation "
                + "ORDER BY created_tick DESC,asset_id LIMIT " + ASSET_LIMIT;
        List<AssetRow> rows = new ArrayList<>();
        try (Statement statement = c.createStatement(); ResultSet r = statement.executeQuery(sql)) {
            while (r.next()) rows.add(new AssetRow(r.getString(1),r.getString(2),r.getString(3),r.getString(4),r.getInt(5),
                    r.getInt(6),r.getInt(7),r.getInt(8),r.getInt(9),r.getInt(10),r.getLong(11),r.getString(12)));
        }
        return List.copyOf(rows);
    }

    private static List<ConflictRow> conflicts(Connection c) throws SQLException {
        List<ConflictRow> rows = new ArrayList<>();
        try (Statement statement = c.createStatement(); ResultSet r = statement.executeQuery(
                "SELECT conflict_zone_id,display_name,status,intensity,center_location_name,radius_rings,started_tick,last_tick,summary,participants "
                        + "FROM regional_conflict_observation ORDER BY intensity DESC,last_tick DESC")) {
            while (r.next()) rows.add(new ConflictRow(r.getString(1),r.getString(2),r.getString(3),r.getInt(4),r.getString(5),
                    r.getInt(6),r.getLong(7),r.getLong(8),r.getString(9),r.getString(10)));
        }
        return List.copyOf(rows);
    }

    private static List<NewsRow> news(Connection c) throws SQLException {
        String sql = "SELECT n.news_event_id,n.tick_sequence,n.event_type,o.display_name,s.display_name,n.severity,n.headline,n.details "
                + "FROM organization_news_event n LEFT JOIN world_organization o ON o.organization_id=n.organization_id "
                + "LEFT JOIN world_station s ON s.station_id=n.station_id ORDER BY n.tick_sequence DESC,n.severity DESC,n.news_event_id "
                + "LIMIT " + NEWS_LIMIT;
        List<NewsRow> rows = new ArrayList<>();
        try (Statement statement = c.createStatement(); ResultSet r = statement.executeQuery(sql)) {
            while (r.next()) rows.add(new NewsRow(r.getString(1),r.getLong(2),r.getString(3),r.getString(4),r.getString(5),
                    r.getInt(6),r.getString(7),r.getString(8)));
        }
        return List.copyOf(rows);
    }

    private static List<LedgerRow> ledgers(Connection c) throws SQLException {
        String sql = "SELECT l.ledger_id,l.tick_sequence,o.display_name,l.entry_type,l.amount,l.balance_after,cp.display_name,l.operation_id,l.summary "
                + "FROM organization_finance_ledger l JOIN world_organization o ON o.organization_id=l.organization_id "
                + "LEFT JOIN world_organization cp ON cp.organization_id=l.counterparty_organization_id "
                + "ORDER BY l.tick_sequence DESC,l.ledger_id LIMIT " + LEDGER_LIMIT;
        List<LedgerRow> rows = new ArrayList<>();
        try (Statement statement = c.createStatement(); ResultSet r = statement.executeQuery(sql)) {
            while (r.next()) rows.add(new LedgerRow(r.getString(1),r.getLong(2),r.getString(3),r.getString(4),r.getLong(5),
                    r.getLong(6),r.getString(7),r.getString(8),r.getString(9)));
        }
        return List.copyOf(rows);
    }

    private static void configureReadOnly(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement()) {
            statement.execute("PRAGMA foreign_keys=ON");
            statement.execute("PRAGMA busy_timeout=5000");
            statement.execute("PRAGMA query_only=ON");
        }
        try (Statement statement = connection.createStatement(); ResultSet r = statement.executeQuery("PRAGMA query_only")) {
            if (!r.next() || r.getInt(1) != 1) throw new SQLException("Institutional observer connection is not query-only.");
        }
    }

    private static void verifySchema(Connection connection) throws SQLException {
        try (Statement statement = connection.createStatement();
             ResultSet r = statement.executeQuery("SELECT COALESCE(MAX(version),0) FROM schema_migration")) {
            int version = r.next() ? r.getInt(1) : 0;
            if (version < 36) throw new SQLException("Institutional observer requires schema 36 or newer; found " + version + '.');
        }
    }

    private static int peakInfluence(PresenceRow row) {
        return Math.max(Math.max(row.politicalInfluence(), row.economicInfluence()),
                Math.max(row.laborInfluence(), row.securityInfluence()));
    }

    private static String signed(long value) { return value > 0 ? "+" + value : Long.toString(value); }
    private static String value(Object value) { return value == null || value.toString().isBlank() ? "—" : value.toString(); }

    public record Summary(long organizationCount, long sovereignFactionCount, long localInstitutionCount,
                          long activeOperationCount, long assetCount, long activeConflictCount,
                          long totalTreasury, long totalDebt) { }

    public record OrganizationRow(String organizationId, String displayName, String organizationType,
                                  String alignedMajorName, String headquartersStation, long treasury, long debt,
                                  long creditCapacity, long revenueTotal, long expenseTotal, long payrollPerTick,
                                  int liquidity, long lastTick, long employees, long members, long contractors,
                                  long activeCrews, long recordedInflows, long recordedOutflows) { }

    public record PresenceRow(String organizationId, String organizationName, String organizationType,
                              String alignedMajorName, String stationName, int politicalInfluence,
                              int economicInfluence, int laborInfluence, int securityInfluence,
                              String presenceState, long lastTick) { }

    public record PoliticalRow(String stationId, String stationName, String controllingMajorFaction,
                               String controllingSubfaction, int controlScore, String contestState,
                               long lastChangedTick, boolean headquartersLocked) { }

    public record OperationRow(String operationId, String operationType, String status, long startedTick,
                               long dueTick, String sponsorName, String targetStationName, String partners,
                               long estimatedCost, long sponsorCash, long borrowedAmount,
                               String financingOrganization, boolean settled, long settlementValue) { }

    public record AssetRow(String assetId, String stationName, String ownerName, String assetType, int assetLevel,
                           int capacityBonus, int industryBonus, int securityBonus, int researchBonus,
                           int supplyBonus, long createdTick, String sourceOperationId) { }

    public record ConflictRow(String conflictZoneId, String displayName, String status, int intensity,
                              String centerLocationName, int radiusRings, long startedTick, long lastTick,
                              String summary, String participants) { }

    public record NewsRow(String newsEventId, long tick, String eventType, String organizationName,
                          String stationName, int severity, String headline, String details) { }

    public record LedgerRow(String ledgerId, long tick, String organizationName, String entryType, long amount,
                            long balanceAfter, String counterpartyName, String operationId, String summary) { }

    public record InstitutionalSignal(String controllingFaction, int controlScore, String contestState,
                                      int conflictIntensity, boolean headquartersLocked) { }

    public record InstitutionalSnapshot(Summary summary, List<OrganizationRow> organizations,
                                        List<PresenceRow> presences, List<PoliticalRow> politics,
                                        List<OperationRow> operations, List<AssetRow> assets,
                                        List<ConflictRow> conflicts, List<NewsRow> news, List<LedgerRow> ledgers) {
        public InstitutionalSnapshot {
            Objects.requireNonNull(summary, "summary");
            organizations = List.copyOf(organizations);
            presences = List.copyOf(presences);
            politics = List.copyOf(politics);
            operations = List.copyOf(operations);
            assets = List.copyOf(assets);
            conflicts = List.copyOf(conflicts);
            news = List.copyOf(news);
            ledgers = List.copyOf(ledgers);
        }

        public static InstitutionalSnapshot empty() {
            return new InstitutionalSnapshot(new Summary(0,0,0,0,0,0,0,0),
                    List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of(),List.of());
        }
    }
}
