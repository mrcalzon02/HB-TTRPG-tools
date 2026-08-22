package io.github.mrcalzon02.barotrauma.persistence;

import java.util.ArrayList;
import java.util.List;

/**
 * Schema 034: turns schema-033 organizations into active economic, political, labor,
 * construction, security and conflict actors without changing legacy transport mission IDs.
 */
public final class OrganizationOperationsSchema {
    private OrganizationOperationsSchema() { }

    public static List<String> statements() {
        List<String> sql = new ArrayList<>();
        sql.add("""
                CREATE TABLE organization_operation (
                    operation_id TEXT PRIMARY KEY,
                    world_id TEXT NOT NULL,
                    operation_type TEXT NOT NULL CHECK(operation_type IN (
                        'CONSTRUCTION_CONTRACT','TRADE_DELEGATION','CREDIT_FINANCE','LABOR_ORGANIZING',
                        'LABOR_DELEGATION','DIPLOMATIC_COURIER','INFLUENCE_CAMPAIGN','FACTION_SUPPORT',
                        'SECURITY_ASSISTANCE','RELIEF_CONVOY','INDUSTRIAL_INVESTMENT','RESEARCH_GRANT',
                        'RESOURCE_CONTRACT','SALVAGE_CONTRACT','BLOCKADE','RAID')),
                    sponsor_organization_id TEXT NOT NULL,
                    target_station_id TEXT NOT NULL,
                    target_organization_id TEXT,
                    transport_mission_id TEXT UNIQUE,
                    status TEXT NOT NULL CHECK(status IN ('PLANNED','ACTIVE','COMPLETE','FAILED','CANCELLED')),
                    influence_axis TEXT NOT NULL CHECK(influence_axis IN ('POLITICAL','ECONOMIC','LABOR','SECURITY')),
                    influence_delta INTEGER NOT NULL,
                    aligned_major_influence INTEGER NOT NULL DEFAULT 0,
                    credits_delta INTEGER NOT NULL DEFAULT 0,
                    supplies_delta INTEGER NOT NULL DEFAULT 0,
                    ore_delta INTEGER NOT NULL DEFAULT 0,
                    industry_delta INTEGER NOT NULL DEFAULT 0,
                    security_delta INTEGER NOT NULL DEFAULT 0,
                    research_delta INTEGER NOT NULL DEFAULT 0,
                    threat_delta INTEGER NOT NULL DEFAULT 0,
                    asset_type TEXT CHECK(asset_type IS NULL OR asset_type IN (
                        'HABITATION','DOCKYARD','INDUSTRIAL_PLANT','MARKET_HALL','BANK_BRANCH','UNION_HALL',
                        'RESEARCH_LAB','MEDICAL_CENTER','SECURITY_POST','LOGISTICS_HUB','POWER_PLANT',
                        'COMMUNICATIONS_NODE')),
                    started_tick INTEGER NOT NULL CHECK(started_tick >= 0),
                    due_tick INTEGER NOT NULL CHECK(due_tick >= started_tick),
                    completed_tick INTEGER CHECK(completed_tick >= started_tick),
                    outcome TEXT,
                    summary TEXT NOT NULL,
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),
                    FOREIGN KEY(sponsor_organization_id) REFERENCES world_organization(organization_id),
                    FOREIGN KEY(target_station_id) REFERENCES world_station(station_id),
                    FOREIGN KEY(target_organization_id) REFERENCES world_organization(organization_id),
                    FOREIGN KEY(transport_mission_id) REFERENCES world_mission(mission_id)
                )
                """);
        sql.add("CREATE INDEX organization_operation_world_status_index ON organization_operation(world_id,status,due_tick,operation_type)");
        sql.add("CREATE INDEX organization_operation_station_index ON organization_operation(target_station_id,status,started_tick DESC)");
        sql.add("CREATE INDEX organization_operation_sponsor_index ON organization_operation(sponsor_organization_id,status,started_tick DESC)");

        sql.add("""
                CREATE TABLE organization_station_asset (
                    asset_id TEXT PRIMARY KEY,
                    world_id TEXT NOT NULL,
                    station_id TEXT NOT NULL,
                    owner_organization_id TEXT NOT NULL,
                    asset_type TEXT NOT NULL CHECK(asset_type IN (
                        'HABITATION','DOCKYARD','INDUSTRIAL_PLANT','MARKET_HALL','BANK_BRANCH','UNION_HALL',
                        'RESEARCH_LAB','MEDICAL_CENTER','SECURITY_POST','LOGISTICS_HUB','POWER_PLANT',
                        'COMMUNICATIONS_NODE')),
                    asset_level INTEGER NOT NULL DEFAULT 1 CHECK(asset_level BETWEEN 1 AND 5),
                    capacity_bonus INTEGER NOT NULL DEFAULT 0,
                    industry_bonus INTEGER NOT NULL DEFAULT 0,
                    security_bonus INTEGER NOT NULL DEFAULT 0,
                    research_bonus INTEGER NOT NULL DEFAULT 0,
                    supply_bonus INTEGER NOT NULL DEFAULT 0,
                    created_tick INTEGER NOT NULL CHECK(created_tick >= 0),
                    source_operation_id TEXT NOT NULL UNIQUE,
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),
                    FOREIGN KEY(station_id) REFERENCES world_station(station_id),
                    FOREIGN KEY(owner_organization_id) REFERENCES world_organization(organization_id),
                    FOREIGN KEY(source_operation_id) REFERENCES organization_operation(operation_id)
                )
                """);
        sql.add("CREATE INDEX organization_station_asset_station_index ON organization_station_asset(world_id,station_id,asset_type,created_tick DESC)");

        sql.add("""
                CREATE TABLE organization_news_event (
                    news_event_id TEXT PRIMARY KEY,
                    world_id TEXT NOT NULL,
                    tick_sequence INTEGER NOT NULL CHECK(tick_sequence >= 0),
                    event_type TEXT NOT NULL CHECK(event_type IN (
                        'OPERATION_STARTED','OPERATION_COMPLETE','OPERATION_FAILED','ASSET_COMPLETED',
                        'CONTROL_CONTEST','CONTROL_TRANSFER','REGIONAL_CONFLICT','RELATIONSHIP_CHANGE')),
                    organization_id TEXT,
                    station_id TEXT,
                    severity INTEGER NOT NULL DEFAULT 0 CHECK(severity BETWEEN 0 AND 100),
                    headline TEXT NOT NULL,
                    details TEXT NOT NULL,
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),
                    FOREIGN KEY(organization_id) REFERENCES world_organization(organization_id),
                    FOREIGN KEY(station_id) REFERENCES world_station(station_id)
                )
                """);
        sql.add("CREATE INDEX organization_news_tick_index ON organization_news_event(world_id,tick_sequence DESC,severity DESC)");

        sql.add("""
                CREATE TABLE station_control_challenge (
                    station_id TEXT NOT NULL,
                    challenger_major_organization_id TEXT NOT NULL,
                    world_id TEXT NOT NULL,
                    pressure_ticks INTEGER NOT NULL DEFAULT 0 CHECK(pressure_ticks >= 0),
                    challenger_influence INTEGER NOT NULL DEFAULT 0 CHECK(challenger_influence BETWEEN 0 AND 100),
                    incumbent_influence INTEGER NOT NULL DEFAULT 0 CHECK(incumbent_influence BETWEEN 0 AND 100),
                    first_tick INTEGER NOT NULL CHECK(first_tick >= 0),
                    last_tick INTEGER NOT NULL CHECK(last_tick >= first_tick),
                    PRIMARY KEY(station_id,challenger_major_organization_id),
                    FOREIGN KEY(station_id) REFERENCES world_station(station_id),
                    FOREIGN KEY(challenger_major_organization_id) REFERENCES world_organization(organization_id),
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id)
                )
                """);
        sql.add("CREATE INDEX station_control_challenge_pressure_index ON station_control_challenge(world_id,pressure_ticks DESC,last_tick DESC)");

        // Existing commercial institutions become politically aligned with the sovereign faction at their HQ.
        // They remain non-territorial: the aligned faction benefits indirectly from their success.
        sql.add("""
                UPDATE world_organization
                SET aligned_major_organization_id=(
                    SELECT major.organization_id
                    FROM world_station ws
                    JOIN world_organization major
                      ON major.world_id=world_organization.world_id
                     AND major.organization_type='MAJOR_FACTION'
                     AND major.display_name=trim(COALESCE(ws.faction,''))
                    WHERE ws.station_id=world_organization.home_station_id
                    LIMIT 1)
                WHERE organization_type NOT IN ('MAJOR_FACTION','SUBFACTION')
                  AND aligned_major_organization_id IS NULL
                  AND home_station_id IS NOT NULL
                """);

        sql.add(localOperationResolutionTrigger());
        sql.add(localOperationSpawnTrigger());
        sql.add(transportOperationSpawnTrigger());
        sql.add(transportOperationCompleteTrigger());
        sql.add(transportOperationFailTrigger());
        sql.add(operationSuccessTrigger());
        sql.add(operationFailureTrigger());
        sql.add(controlPressureTrigger("organization_control_pressure_insert", "AFTER INSERT"));
        sql.add(controlPressureTrigger("organization_control_pressure_update", "AFTER UPDATE OF political_influence"));

        sql.add("""
                CREATE VIEW organization_operation_observation AS
                SELECT op.operation_id,op.world_id,op.operation_type,op.status,op.influence_axis,
                       op.influence_delta,op.aligned_major_influence,op.started_tick,op.due_tick,
                       op.completed_tick,op.outcome,op.summary,
                       sponsor.organization_id sponsor_organization_id,sponsor.display_name sponsor_name,
                       sponsor.organization_type sponsor_type,
                       major.organization_id aligned_major_organization_id,major.display_name aligned_major_name,
                       op.target_station_id,station.display_name target_station_name,
                       target.display_name target_organization_name,op.transport_mission_id,
                       mission.mission_type transport_mission_type,mission.status transport_mission_status,
                       op.asset_type
                FROM organization_operation op
                JOIN world_organization sponsor ON sponsor.organization_id=op.sponsor_organization_id
                LEFT JOIN world_organization major ON major.organization_id=sponsor.aligned_major_organization_id
                JOIN world_station station ON station.station_id=op.target_station_id
                LEFT JOIN world_organization target ON target.organization_id=op.target_organization_id
                LEFT JOIN world_mission mission ON mission.mission_id=op.transport_mission_id
                """);
        sql.add("""
                CREATE VIEW organization_station_asset_observation AS
                SELECT a.asset_id,a.world_id,a.station_id,s.display_name station_name,
                       a.owner_organization_id,o.display_name owner_name,a.asset_type,a.asset_level,
                       a.capacity_bonus,a.industry_bonus,a.security_bonus,a.research_bonus,a.supply_bonus,
                       a.created_tick,a.source_operation_id
                FROM organization_station_asset a
                JOIN world_station s ON s.station_id=a.station_id
                JOIN world_organization o ON o.organization_id=a.owner_organization_id
                """);
        sql.add("""
                CREATE VIEW regional_conflict_observation AS
                SELECT z.conflict_zone_id,z.world_id,z.display_name,z.status,z.intensity,
                       z.center_location_id,l.display_name center_location_name,z.radius_rings,
                       z.started_tick,z.last_tick,z.summary,
                       GROUP_CONCAT(o.display_name||' ['||p.side_key||']',', ') participants
                FROM regional_conflict_zone z
                JOIN world_location l ON l.location_id=z.center_location_id
                LEFT JOIN regional_conflict_participant p ON p.conflict_zone_id=z.conflict_zone_id
                LEFT JOIN world_organization o ON o.organization_id=p.organization_id
                GROUP BY z.conflict_zone_id
                """);
        return List.copyOf(sql);
    }

    private static String localOperationResolutionTrigger() {
        return """
                CREATE TRIGGER organization_local_operation_resolution
                AFTER UPDATE OF last_tick ON station_simulation_state
                WHEN NEW.last_tick>OLD.last_tick
                BEGIN
                    UPDATE organization_operation
                    SET status=CASE
                            WHEN ABS((length(operation_id)*31 + NEW.last_tick*17 + NEW.threat*7) % 100)
                                 < MAX(25,85-(NEW.threat/2)+(NEW.security/4)) THEN 'COMPLETE'
                            ELSE 'FAILED' END,
                        completed_tick=NEW.last_tick,
                        outcome=CASE
                            WHEN ABS((length(operation_id)*31 + NEW.last_tick*17 + NEW.threat*7) % 100)
                                 < MAX(25,85-(NEW.threat/2)+(NEW.security/4)) THEN 'SUCCESS'
                            ELSE 'SETBACK' END
                    WHERE target_station_id=NEW.station_id
                      AND transport_mission_id IS NULL
                      AND status='ACTIVE'
                      AND due_tick<=NEW.last_tick;
                END
                """;
    }

    private static String localOperationSpawnTrigger() {
        return """
                CREATE TRIGGER organization_local_operation_spawn
                AFTER UPDATE OF last_tick ON station_simulation_state
                WHEN NEW.last_tick>OLD.last_tick
                  AND NOT EXISTS (
                      SELECT 1 FROM organization_operation op
                      WHERE op.target_station_id=NEW.station_id
                        AND op.transport_mission_id IS NULL
                        AND op.status IN ('PLANNED','ACTIVE'))
                BEGIN
                    INSERT OR IGNORE INTO organization_operation(
                        operation_id,world_id,operation_type,sponsor_organization_id,target_station_id,
                        target_organization_id,transport_mission_id,status,influence_axis,influence_delta,
                        aligned_major_influence,credits_delta,supplies_delta,ore_delta,industry_delta,
                        security_delta,research_delta,threat_delta,asset_type,started_tick,due_tick,summary)
                    SELECT NEW.world_id||':local-operation:'||NEW.station_id||':'||NEW.last_tick,
                           NEW.world_id,
                           CASE
                             WHEN o.aligned_major_organization_id IS NOT NULL
                                  AND o.aligned_major_organization_id<>c.controlling_major_organization_id
                                  AND p.political_influence>=50 AND NEW.threat>=72 THEN 'RAID'
                             WHEN o.aligned_major_organization_id IS NOT NULL
                                  AND o.aligned_major_organization_id<>c.controlling_major_organization_id
                                  AND p.political_influence>=45 AND NEW.threat>=55 THEN 'BLOCKADE'
                             WHEN NEW.status IN ('BESIEGED','STRAINED')
                                  AND o.organization_type IN ('SECURITY_COMPANY','MAJOR_FACTION','SUBFACTION')
                                  THEN 'RELIEF_CONVOY'
                             WHEN o.organization_type='CONSTRUCTION_FIRM' THEN 'CONSTRUCTION_CONTRACT'
                             WHEN o.organization_type IN ('BANK','CREDIT_UNION','INSURER') THEN 'CREDIT_FINANCE'
                             WHEN o.organization_type IN ('LABOR_UNION','PROFESSIONAL_GUILD') THEN 'LABOR_ORGANIZING'
                             WHEN o.organization_type IN ('TRADE_LEAGUE','SHIPPING_COMPANY','COMMERCIAL_CORPORATION',
                                                          'LOGISTICS_CONSORTIUM') THEN 'TRADE_DELEGATION'
                             WHEN o.organization_type IN ('RESEARCH_INSTITUTE','MEDICAL_NETWORK') THEN 'RESEARCH_GRANT'
                             WHEN o.organization_type='SECURITY_COMPANY' THEN 'SECURITY_ASSISTANCE'
                             WHEN o.organization_type IN ('INDUSTRIAL_CORPORATION','ENERGY_UTILITY') THEN 'INDUSTRIAL_INVESTMENT'
                             WHEN o.organization_type IN ('MINING_COMPANY','AGRICULTURAL_COOPERATIVE') THEN 'RESOURCE_CONTRACT'
                             WHEN o.organization_type='SALVAGE_COMPANY' THEN 'SALVAGE_CONTRACT'
                             WHEN o.organization_type IN ('MAJOR_FACTION','SUBFACTION','LOCAL_ASSOCIATION')
                                  THEN 'INFLUENCE_CAMPAIGN'
                             ELSE 'FACTION_SUPPORT' END,
                           o.organization_id,NEW.station_id,c.controlling_major_organization_id,NULL,'ACTIVE',
                           CASE
                             WHEN o.organization_type IN ('LABOR_UNION','PROFESSIONAL_GUILD') THEN 'LABOR'
                             WHEN o.organization_type IN ('BANK','CREDIT_UNION','INSURER','TRADE_LEAGUE',
                                                          'SHIPPING_COMPANY','COMMERCIAL_CORPORATION','LOGISTICS_CONSORTIUM',
                                                          'INDUSTRIAL_CORPORATION','CONSTRUCTION_FIRM','MINING_COMPANY',
                                                          'AGRICULTURAL_COOPERATIVE','SALVAGE_COMPANY') THEN 'ECONOMIC'
                             WHEN o.organization_type IN ('SECURITY_COMPANY') THEN 'SECURITY'
                             ELSE 'POLITICAL' END,
                           CASE WHEN o.organization_type IN ('MAJOR_FACTION','SUBFACTION') THEN 9 ELSE 6 END,
                           CASE
                             WHEN o.aligned_major_organization_id IS NULL THEN 0
                             WHEN o.organization_type IN ('MAJOR_FACTION','SUBFACTION') THEN 6
                             WHEN o.organization_type IN ('SECURITY_COMPANY','TRADE_LEAGUE','BANK','CREDIT_UNION',
                                                          'CONSTRUCTION_FIRM','INDUSTRIAL_CORPORATION') THEN 3
                             ELSE 1 END,
                           CASE WHEN o.organization_type IN ('BANK','CREDIT_UNION','TRADE_LEAGUE','COMMERCIAL_CORPORATION') THEN 1100
                                WHEN o.organization_type='INSURER' THEN 700
                                WHEN o.organization_type='INDUSTRIAL_CORPORATION' THEN 500 ELSE 0 END,
                           CASE WHEN NEW.status IN ('BESIEGED','STRAINED') THEN 12
                                WHEN o.organization_type IN ('TRADE_LEAGUE','SHIPPING_COMPANY','LOGISTICS_CONSORTIUM') THEN 8 ELSE 0 END,
                           CASE WHEN o.organization_type IN ('MINING_COMPANY','SALVAGE_COMPANY') THEN 12 ELSE 0 END,
                           CASE WHEN o.organization_type IN ('CONSTRUCTION_FIRM','INDUSTRIAL_CORPORATION','ENERGY_UTILITY') THEN 3 ELSE 0 END,
                           CASE WHEN o.organization_type='SECURITY_COMPANY' THEN 5 ELSE 0 END,
                           CASE WHEN o.organization_type IN ('RESEARCH_INSTITUTE','MEDICAL_NETWORK') THEN 8 ELSE 0 END,
                           CASE
                             WHEN o.aligned_major_organization_id IS NOT NULL
                                  AND o.aligned_major_organization_id<>c.controlling_major_organization_id
                                  AND p.political_influence>=50 AND NEW.threat>=72 THEN 14
                             WHEN o.aligned_major_organization_id IS NOT NULL
                                  AND o.aligned_major_organization_id<>c.controlling_major_organization_id
                                  AND p.political_influence>=45 AND NEW.threat>=55 THEN 8
                             WHEN o.organization_type='SECURITY_COMPANY' THEN -6
                             WHEN NEW.status IN ('BESIEGED','STRAINED') THEN -5 ELSE 0 END,
                           CASE
                             WHEN o.organization_type='CONSTRUCTION_FIRM' THEN
                                  CASE ABS((length(o.organization_key)+NEW.last_tick)%6)
                                    WHEN 0 THEN 'HABITATION' WHEN 1 THEN 'DOCKYARD' WHEN 2 THEN 'INDUSTRIAL_PLANT'
                                    WHEN 3 THEN 'MARKET_HALL' WHEN 4 THEN 'LOGISTICS_HUB' ELSE 'POWER_PLANT' END
                             WHEN o.organization_type IN ('BANK','CREDIT_UNION') THEN 'BANK_BRANCH'
                             WHEN o.organization_type IN ('LABOR_UNION','PROFESSIONAL_GUILD') THEN 'UNION_HALL'
                             WHEN o.organization_type='RESEARCH_INSTITUTE' THEN 'RESEARCH_LAB'
                             WHEN o.organization_type='MEDICAL_NETWORK' THEN 'MEDICAL_CENTER'
                             WHEN o.organization_type='SECURITY_COMPANY' THEN 'SECURITY_POST'
                             WHEN o.organization_type='TELECOM_PROVIDER' THEN 'COMMUNICATIONS_NODE'
                             ELSE NULL END,
                           NEW.last_tick,
                           NEW.last_tick+2+ABS((length(o.organization_key)+NEW.last_tick)%4),
                           o.display_name||' opened a local '||lower(replace(
                             CASE
                               WHEN o.organization_type='CONSTRUCTION_FIRM' THEN 'CONSTRUCTION_CONTRACT'
                               WHEN o.organization_type IN ('BANK','CREDIT_UNION','INSURER') THEN 'CREDIT_FINANCE'
                               WHEN o.organization_type IN ('LABOR_UNION','PROFESSIONAL_GUILD') THEN 'LABOR_ORGANIZING'
                               WHEN o.organization_type IN ('RESEARCH_INSTITUTE','MEDICAL_NETWORK') THEN 'RESEARCH_GRANT'
                               WHEN o.organization_type='SECURITY_COMPANY' THEN 'SECURITY_ASSISTANCE'
                               ELSE 'INFLUENCE_CAMPAIGN' END,'_',' '))||' at '||ws.display_name||'.'
                    FROM organization_station_presence p
                    JOIN world_organization o ON o.organization_id=p.organization_id
                    JOIN world_station ws ON ws.station_id=NEW.station_id
                    JOIN station_control_state c ON c.station_id=NEW.station_id
                    WHERE p.station_id=NEW.station_id
                      AND p.presence_state NOT IN ('DORMANT','EXPELLED')
                    ORDER BY ABS((length(o.organization_key)*17 + NEW.last_tick*23 + p.economic_influence*3
                                 + p.political_influence*5) % 997),o.organization_id
                    LIMIT 1;

                    INSERT OR IGNORE INTO organization_news_event(
                        news_event_id,world_id,tick_sequence,event_type,organization_id,station_id,severity,headline,details)
                    SELECT operation_id||':started',world_id,started_tick,'OPERATION_STARTED',
                           sponsor_organization_id,target_station_id,10,
                           replace(operation_type,'_',' ')||' begins',summary
                    FROM organization_operation
                    WHERE operation_id=NEW.world_id||':local-operation:'||NEW.station_id||':'||NEW.last_tick;
                END
                """;
    }

    private static String transportOperationSpawnTrigger() {
        return """
                CREATE TRIGGER organization_transport_operation_spawn
                AFTER INSERT ON world_mission
                WHEN EXISTS (SELECT 1 FROM world_organization WHERE world_id=NEW.world_id)
                BEGIN
                    INSERT OR IGNORE INTO organization_operation(
                        operation_id,world_id,operation_type,sponsor_organization_id,target_station_id,
                        target_organization_id,transport_mission_id,status,influence_axis,influence_delta,
                        aligned_major_influence,credits_delta,supplies_delta,ore_delta,industry_delta,
                        security_delta,research_delta,threat_delta,asset_type,started_tick,due_tick,summary)
                    SELECT NEW.world_id||':transport-operation:'||NEW.mission_id,NEW.world_id,
                           CASE
                             WHEN NEW.mission_type='TRADE' AND o.organization_type IN ('BANK','CREDIT_UNION','INSURER') THEN 'CREDIT_FINANCE'
                             WHEN NEW.mission_type='TRADE' AND o.organization_type IN ('LABOR_UNION','PROFESSIONAL_GUILD') THEN 'LABOR_DELEGATION'
                             WHEN NEW.mission_type='TRADE' THEN 'TRADE_DELEGATION'
                             WHEN NEW.mission_type='MINING' AND o.organization_type='CONSTRUCTION_FIRM' THEN 'CONSTRUCTION_CONTRACT'
                             WHEN NEW.mission_type='MINING' THEN 'RESOURCE_CONTRACT'
                             WHEN NEW.mission_type IN ('DEFENSE','FAUNA_CLEARING') THEN 'SECURITY_ASSISTANCE'
                             WHEN NEW.mission_type='RESEARCH' THEN 'RESEARCH_GRANT'
                             WHEN NEW.mission_type='SALVAGE' THEN 'SALVAGE_CONTRACT'
                             WHEN NEW.mission_type='TRANSIT' AND o.organization_type IN ('MAJOR_FACTION','SUBFACTION') THEN 'DIPLOMATIC_COURIER'
                             ELSE 'INFLUENCE_CAMPAIGN' END,
                           o.organization_id,
                           COALESCE((SELECT ws.station_id FROM world_station ws WHERE ws.location_id=NEW.target_location_id LIMIT 1),
                                    NEW.origin_station_id),
                           c.controlling_major_organization_id,NEW.mission_id,'ACTIVE',
                           CASE
                             WHEN o.organization_type IN ('LABOR_UNION','PROFESSIONAL_GUILD') THEN 'LABOR'
                             WHEN o.organization_type IN ('BANK','CREDIT_UNION','INSURER','TRADE_LEAGUE','SHIPPING_COMPANY',
                                                          'COMMERCIAL_CORPORATION','LOGISTICS_CONSORTIUM','CONSTRUCTION_FIRM',
                                                          'INDUSTRIAL_CORPORATION','MINING_COMPANY','SALVAGE_COMPANY') THEN 'ECONOMIC'
                             WHEN NEW.mission_type IN ('DEFENSE','FAUNA_CLEARING') THEN 'SECURITY'
                             ELSE 'POLITICAL' END,
                           8,CASE WHEN o.aligned_major_organization_id IS NULL THEN 0 ELSE 3 END,
                           CASE WHEN NEW.mission_type='TRADE' THEN 900 ELSE 0 END,
                           CASE WHEN NEW.mission_type='TRADE' THEN 10 WHEN NEW.mission_type IN ('DEFENSE','FAUNA_CLEARING') THEN 5 ELSE 0 END,
                           CASE WHEN NEW.mission_type IN ('MINING','SALVAGE') THEN 10 ELSE 0 END,
                           CASE WHEN NEW.mission_type IN ('MINING','SALVAGE') THEN 2 ELSE 0 END,
                           CASE WHEN NEW.mission_type IN ('DEFENSE','FAUNA_CLEARING') THEN 4 ELSE 0 END,
                           CASE WHEN NEW.mission_type='RESEARCH' THEN 7 ELSE 0 END,
                           CASE WHEN NEW.mission_type IN ('DEFENSE','FAUNA_CLEARING') THEN -8 ELSE 0 END,
                           CASE WHEN o.organization_type='CONSTRUCTION_FIRM' THEN 'LOGISTICS_HUB'
                                WHEN o.organization_type IN ('BANK','CREDIT_UNION') THEN 'BANK_BRANCH'
                                WHEN o.organization_type IN ('LABOR_UNION','PROFESSIONAL_GUILD') THEN 'UNION_HALL'
                                WHEN o.organization_type='RESEARCH_INSTITUTE' THEN 'RESEARCH_LAB'
                                WHEN o.organization_type='MEDICAL_NETWORK' THEN 'MEDICAL_CENTER'
                                WHEN o.organization_type='SECURITY_COMPANY' THEN 'SECURITY_POST'
                                ELSE NULL END,
                           NEW.created_tick,NEW.created_tick+MAX(3,NEW.difficulty/10),
                           o.display_name||' sponsored a '||lower(replace(NEW.mission_type,'_',' '))
                             ||' voyage serving '||ws.display_name||'.'
                    FROM organization_station_presence p
                    JOIN world_organization o ON o.organization_id=p.organization_id
                    JOIN world_station ws ON ws.station_id=COALESCE(
                        (SELECT wst.station_id FROM world_station wst WHERE wst.location_id=NEW.target_location_id LIMIT 1),
                        NEW.origin_station_id)
                    JOIN station_control_state c ON c.station_id=ws.station_id
                    WHERE p.station_id=ws.station_id
                      AND p.presence_state NOT IN ('DORMANT','EXPELLED')
                      AND (
                         (NEW.mission_type='TRADE' AND o.organization_type IN (
                            'TRADE_LEAGUE','SHIPPING_COMPANY','COMMERCIAL_CORPORATION','LOGISTICS_CONSORTIUM',
                            'BANK','CREDIT_UNION','INSURER','LABOR_UNION','PROFESSIONAL_GUILD')) OR
                         (NEW.mission_type='MINING' AND o.organization_type IN (
                            'MINING_COMPANY','INDUSTRIAL_CORPORATION','CONSTRUCTION_FIRM','ENERGY_UTILITY')) OR
                         (NEW.mission_type IN ('DEFENSE','FAUNA_CLEARING') AND o.organization_type IN (
                            'SECURITY_COMPANY','MAJOR_FACTION','SUBFACTION')) OR
                         (NEW.mission_type='RESEARCH' AND o.organization_type IN (
                            'RESEARCH_INSTITUTE','MEDICAL_NETWORK','SUBFACTION')) OR
                         (NEW.mission_type='SALVAGE' AND o.organization_type IN (
                            'SALVAGE_COMPANY','CONSTRUCTION_FIRM','INDUSTRIAL_CORPORATION')) OR
                         (NEW.mission_type='TRANSIT' AND o.organization_type IN (
                            'MAJOR_FACTION','SUBFACTION','LOCAL_ASSOCIATION','TELECOM_PROVIDER')))
                    ORDER BY ABS((length(o.organization_key)*19 + NEW.difficulty*11 + NEW.created_tick*7) % 991),o.organization_id
                    LIMIT 1;
                END
                """;
    }

    private static String transportOperationCompleteTrigger() {
        return """
                CREATE TRIGGER organization_transport_operation_complete
                AFTER UPDATE OF status ON world_mission
                WHEN NEW.status='COMPLETE' AND OLD.status<>'COMPLETE'
                BEGIN
                    UPDATE organization_operation
                    SET status='COMPLETE',completed_tick=COALESCE(NEW.completed_tick,NEW.updated_tick),outcome='SUCCESS'
                    WHERE transport_mission_id=NEW.mission_id AND status='ACTIVE';
                END
                """;
    }

    private static String transportOperationFailTrigger() {
        return """
                CREATE TRIGGER organization_transport_operation_fail
                AFTER UPDATE OF status ON world_mission
                WHEN NEW.status IN ('FAILED','CANCELLED') AND OLD.status<>NEW.status
                BEGIN
                    UPDATE organization_operation
                    SET status='FAILED',completed_tick=COALESCE(NEW.completed_tick,NEW.updated_tick),outcome=NEW.status
                    WHERE transport_mission_id=NEW.mission_id AND status='ACTIVE';
                END
                """;
    }

    private static String operationSuccessTrigger() {
        return """
                CREATE TRIGGER organization_operation_success
                AFTER UPDATE OF status ON organization_operation
                WHEN NEW.status='COMPLETE' AND OLD.status<>'COMPLETE'
                BEGIN
                    INSERT OR IGNORE INTO organization_station_presence(
                        organization_id,station_id,world_id,political_influence,economic_influence,
                        labor_influence,security_influence,presence_state,last_tick)
                    VALUES(NEW.sponsor_organization_id,NEW.target_station_id,NEW.world_id,0,0,0,0,'MINORITY',NEW.completed_tick);

                    UPDATE organization_station_presence
                    SET political_influence=MIN(100,political_influence+
                            CASE WHEN NEW.influence_axis='POLITICAL' THEN MAX(1,NEW.influence_delta) ELSE 1 END),
                        economic_influence=MIN(100,economic_influence+
                            CASE WHEN NEW.influence_axis='ECONOMIC' THEN MAX(1,NEW.influence_delta) ELSE 0 END),
                        labor_influence=MIN(100,labor_influence+
                            CASE WHEN NEW.influence_axis='LABOR' THEN MAX(1,NEW.influence_delta) ELSE 0 END),
                        security_influence=MIN(100,security_influence+
                            CASE WHEN NEW.influence_axis='SECURITY' THEN MAX(1,NEW.influence_delta) ELSE 0 END),
                        presence_state=CASE
                            WHEN political_influence+economic_influence+labor_influence+security_influence>=220 THEN 'DOMINANT'
                            ELSE 'ACTIVE' END,
                        last_tick=NEW.completed_tick
                    WHERE organization_id=NEW.sponsor_organization_id AND station_id=NEW.target_station_id;

                    INSERT OR IGNORE INTO organization_station_presence(
                        organization_id,station_id,world_id,political_influence,economic_influence,
                        labor_influence,security_influence,presence_state,last_tick)
                    SELECT o.aligned_major_organization_id,NEW.target_station_id,NEW.world_id,0,0,0,0,'MINORITY',NEW.completed_tick
                    FROM world_organization o
                    WHERE o.organization_id=NEW.sponsor_organization_id
                      AND o.aligned_major_organization_id IS NOT NULL;

                    UPDATE organization_station_presence
                    SET political_influence=MIN(100,political_influence+NEW.aligned_major_influence),
                        economic_influence=MIN(100,economic_influence+
                            CASE WHEN NEW.influence_axis='ECONOMIC' THEN MAX(0,NEW.aligned_major_influence/2) ELSE 0 END),
                        security_influence=MIN(100,security_influence+
                            CASE WHEN NEW.influence_axis='SECURITY' THEN MAX(0,NEW.aligned_major_influence/2) ELSE 0 END),
                        last_tick=NEW.completed_tick
                    WHERE station_id=NEW.target_station_id
                      AND organization_id=(SELECT aligned_major_organization_id FROM world_organization
                                           WHERE organization_id=NEW.sponsor_organization_id)
                      AND NEW.aligned_major_influence>0;

                    INSERT OR IGNORE INTO organization_influence_event(
                        influence_event_id,world_id,station_id,organization_id,mission_id,tick_sequence,
                        influence_axis,influence_delta,resulting_influence,cause_type,summary)
                    SELECT NEW.operation_id||':influence',NEW.world_id,NEW.target_station_id,
                           NEW.sponsor_organization_id,NEW.transport_mission_id,NEW.completed_tick,
                           NEW.influence_axis,NEW.influence_delta,
                           CASE NEW.influence_axis
                             WHEN 'POLITICAL' THEN p.political_influence
                             WHEN 'ECONOMIC' THEN p.economic_influence
                             WHEN 'LABOR' THEN p.labor_influence
                             ELSE p.security_influence END,
                           'ORGANIZATION_OPERATION',NEW.summary
                    FROM organization_station_presence p
                    WHERE p.organization_id=NEW.sponsor_organization_id AND p.station_id=NEW.target_station_id;

                    UPDATE station_simulation_state
                    SET credits=credits+NEW.credits_delta,
                        supplies=MAX(0,supplies+NEW.supplies_delta),
                        ore=MAX(0,ore+NEW.ore_delta),
                        industry=MIN(100,MAX(0,industry+NEW.industry_delta)),
                        security=MIN(100,MAX(0,security+NEW.security_delta)),
                        research=MAX(0,research+NEW.research_delta),
                        threat=MIN(100,MAX(0,threat+NEW.threat_delta))
                    WHERE station_id=NEW.target_station_id;

                    INSERT OR IGNORE INTO organization_station_asset(
                        asset_id,world_id,station_id,owner_organization_id,asset_type,asset_level,
                        capacity_bonus,industry_bonus,security_bonus,research_bonus,supply_bonus,
                        created_tick,source_operation_id)
                    SELECT NEW.operation_id||':asset',NEW.world_id,NEW.target_station_id,NEW.sponsor_organization_id,
                           NEW.asset_type,1,
                           CASE WHEN NEW.asset_type='HABITATION' THEN 25 ELSE 0 END,
                           CASE WHEN NEW.asset_type IN ('DOCKYARD','INDUSTRIAL_PLANT','POWER_PLANT','LOGISTICS_HUB') THEN 3 ELSE 0 END,
                           CASE WHEN NEW.asset_type='SECURITY_POST' THEN 4 ELSE 0 END,
                           CASE WHEN NEW.asset_type IN ('RESEARCH_LAB','MEDICAL_CENTER','COMMUNICATIONS_NODE') THEN 4 ELSE 0 END,
                           CASE WHEN NEW.asset_type IN ('MARKET_HALL','LOGISTICS_HUB','HABITATION') THEN 5 ELSE 0 END,
                           NEW.completed_tick,NEW.operation_id
                    WHERE NEW.asset_type IS NOT NULL;

                    UPDATE station_simulation_state
                    SET supplies=supplies+CASE WHEN NEW.asset_type IN ('MARKET_HALL','LOGISTICS_HUB','HABITATION') THEN 5 ELSE 0 END,
                        industry=MIN(100,industry+CASE WHEN NEW.asset_type IN ('DOCKYARD','INDUSTRIAL_PLANT','POWER_PLANT','LOGISTICS_HUB') THEN 3 ELSE 0 END),
                        security=MIN(100,security+CASE WHEN NEW.asset_type='SECURITY_POST' THEN 4 ELSE 0 END),
                        research=research+CASE WHEN NEW.asset_type IN ('RESEARCH_LAB','MEDICAL_CENTER','COMMUNICATIONS_NODE') THEN 4 ELSE 0 END
                    WHERE station_id=NEW.target_station_id AND NEW.asset_type IS NOT NULL;

                    INSERT OR IGNORE INTO organization_news_event(
                        news_event_id,world_id,tick_sequence,event_type,organization_id,station_id,severity,headline,details)
                    VALUES(NEW.operation_id||':complete',NEW.world_id,NEW.completed_tick,'OPERATION_COMPLETE',
                           NEW.sponsor_organization_id,NEW.target_station_id,
                           CASE WHEN NEW.operation_type IN ('RAID','BLOCKADE') THEN 65 ELSE 15 END,
                           replace(NEW.operation_type,'_',' ')||' completed',NEW.summary||' Outcome: SUCCESS.');

                    INSERT OR IGNORE INTO organization_news_event(
                        news_event_id,world_id,tick_sequence,event_type,organization_id,station_id,severity,headline,details)
                    SELECT NEW.operation_id||':asset-news',NEW.world_id,NEW.completed_tick,'ASSET_COMPLETED',
                           NEW.sponsor_organization_id,NEW.target_station_id,20,
                           replace(NEW.asset_type,'_',' ')||' completed',
                           'A permanent '||lower(replace(NEW.asset_type,'_',' '))||' entered service after '
                             ||lower(replace(NEW.operation_type,'_',' '))||'.'
                    WHERE NEW.asset_type IS NOT NULL;
                END
                """;
    }

    private static String operationFailureTrigger() {
        return """
                CREATE TRIGGER organization_operation_failure
                AFTER UPDATE OF status ON organization_operation
                WHEN NEW.status='FAILED' AND OLD.status<>'FAILED'
                BEGIN
                    UPDATE organization_station_presence
                    SET political_influence=MAX(0,political_influence-CASE WHEN NEW.influence_axis='POLITICAL' THEN 2 ELSE 0 END),
                        economic_influence=MAX(0,economic_influence-CASE WHEN NEW.influence_axis='ECONOMIC' THEN 2 ELSE 0 END),
                        labor_influence=MAX(0,labor_influence-CASE WHEN NEW.influence_axis='LABOR' THEN 2 ELSE 0 END),
                        security_influence=MAX(0,security_influence-CASE WHEN NEW.influence_axis='SECURITY' THEN 2 ELSE 0 END),
                        last_tick=NEW.completed_tick
                    WHERE organization_id=NEW.sponsor_organization_id AND station_id=NEW.target_station_id;

                    INSERT OR IGNORE INTO organization_news_event(
                        news_event_id,world_id,tick_sequence,event_type,organization_id,station_id,severity,headline,details)
                    VALUES(NEW.operation_id||':failed',NEW.world_id,NEW.completed_tick,'OPERATION_FAILED',
                           NEW.sponsor_organization_id,NEW.target_station_id,45,
                           replace(NEW.operation_type,'_',' ')||' failed',NEW.summary||' Outcome: '||COALESCE(NEW.outcome,'FAILED')||'.');
                END
                """;
    }

    private static String controlPressureTrigger(String name, String timing) {
        return "CREATE TRIGGER " + name + " " + timing + " ON organization_station_presence\n"
                + "WHEN EXISTS (SELECT 1 FROM world_organization o WHERE o.organization_id=NEW.organization_id "
                + "AND o.organization_type='MAJOR_FACTION')\n"
                + " AND EXISTS (SELECT 1 FROM station_control_state c WHERE c.station_id=NEW.station_id "
                + "AND c.controlling_major_organization_id<>NEW.organization_id)\n"
                + " AND NEW.political_influence>=60\n"
                + " AND NEW.political_influence>=COALESCE((SELECT incumbent.political_influence "
                + "FROM station_control_state c LEFT JOIN organization_station_presence incumbent "
                + "ON incumbent.station_id=c.station_id AND incumbent.organization_id=c.controlling_major_organization_id "
                + "WHERE c.station_id=NEW.station_id),0)+12\n"
                + " AND NOT EXISTS (SELECT 1 FROM organization_headquarters h WHERE h.station_id=NEW.station_id "
                + "AND h.sovereignty_locked=1)\n"
                + "BEGIN\n"
                + " INSERT INTO station_control_challenge(station_id,challenger_major_organization_id,world_id,pressure_ticks,"
                + "challenger_influence,incumbent_influence,first_tick,last_tick)\n"
                + " VALUES(NEW.station_id,NEW.organization_id,NEW.world_id,1,NEW.political_influence,"
                + "COALESCE((SELECT incumbent.political_influence FROM station_control_state c "
                + "LEFT JOIN organization_station_presence incumbent ON incumbent.station_id=c.station_id "
                + "AND incumbent.organization_id=c.controlling_major_organization_id WHERE c.station_id=NEW.station_id),0),"
                + "NEW.last_tick,NEW.last_tick)\n"
                + " ON CONFLICT(station_id,challenger_major_organization_id) DO UPDATE SET "
                + "pressure_ticks=station_control_challenge.pressure_ticks+1,challenger_influence=excluded.challenger_influence,"
                + "incumbent_influence=excluded.incumbent_influence,last_tick=excluded.last_tick;\n"
                + " UPDATE station_control_state SET contest_state=CASE WHEN NEW.political_influence>=75 THEN 'CONTESTED' ELSE 'COMPETITIVE' END,"
                + "control_score=MAX(0,100-NEW.political_influence) WHERE station_id=NEW.station_id;\n"
                + " INSERT OR IGNORE INTO organization_news_event(news_event_id,world_id,tick_sequence,event_type,organization_id,"
                + "station_id,severity,headline,details) SELECT NEW.station_id||':challenge:'||NEW.organization_id||':'||NEW.last_tick,"
                + "NEW.world_id,NEW.last_tick,'CONTROL_CONTEST',NEW.organization_id,NEW.station_id,55,'Station control contested',"
                + "challenger.display_name||' reached sustained political pressure at '||ws.display_name||'.' "
                + "FROM world_organization challenger JOIN world_station ws ON ws.station_id=NEW.station_id "
                + "WHERE challenger.organization_id=NEW.organization_id;\n"
                + " INSERT OR IGNORE INTO regional_conflict_zone(conflict_zone_id,world_id,display_name,status,intensity,center_location_id,"
                + "radius_rings,started_tick,last_tick,summary) SELECT NEW.station_id||':regional-conflict:'||NEW.organization_id,"
                + "NEW.world_id,ws.display_name||' Control Crisis','CONTESTED',MIN(100,35+ch.pressure_ticks*12),ws.location_id,2,"
                + "ch.first_tick,NEW.last_tick,'Competing sovereign organizations are exerting sustained pressure around '||ws.display_name||'.' "
                + "FROM station_control_challenge ch JOIN world_station ws ON ws.station_id=ch.station_id "
                + "WHERE ch.station_id=NEW.station_id AND ch.challenger_major_organization_id=NEW.organization_id AND ch.pressure_ticks>=2;\n"
                + " INSERT OR IGNORE INTO regional_conflict_participant(conflict_zone_id,organization_id,side_key,commitment,war_aim,last_tick) "
                + "SELECT NEW.station_id||':regional-conflict:'||NEW.organization_id,c.controlling_major_organization_id,'INCUMBENT',70,"
                + "'Retain control of the contested station and surrounding routes.',NEW.last_tick FROM station_control_state c "
                + "JOIN station_control_challenge ch ON ch.station_id=c.station_id AND ch.challenger_major_organization_id=NEW.organization_id "
                + "WHERE c.station_id=NEW.station_id AND ch.pressure_ticks>=2;\n"
                + " INSERT OR IGNORE INTO regional_conflict_participant(conflict_zone_id,organization_id,side_key,commitment,war_aim,last_tick) "
                + "SELECT NEW.station_id||':regional-conflict:'||NEW.organization_id,NEW.organization_id,'CHALLENGER',70,"
                + "'Displace the incumbent and establish station control.',NEW.last_tick FROM station_control_challenge ch "
                + "WHERE ch.station_id=NEW.station_id AND ch.challenger_major_organization_id=NEW.organization_id AND ch.pressure_ticks>=2;\n"
                + " INSERT OR IGNORE INTO regional_conflict_location(conflict_zone_id,location_id,strategic_value,control_pressure,last_tick) "
                + "SELECT NEW.station_id||':regional-conflict:'||NEW.organization_id,ws.location_id,90,MIN(100,ch.pressure_ticks*20),NEW.last_tick "
                + "FROM station_control_challenge ch JOIN world_station ws ON ws.station_id=ch.station_id "
                + "WHERE ch.station_id=NEW.station_id AND ch.challenger_major_organization_id=NEW.organization_id AND ch.pressure_ticks>=2;\n"
                + " INSERT OR IGNORE INTO station_control_history(control_event_id,world_id,station_id,tick_sequence,previous_major_organization_id,"
                + "new_major_organization_id,previous_subfaction_id,new_subfaction_id,cause_type,cause_id,summary) "
                + "SELECT NEW.station_id||':control-transfer:'||NEW.organization_id||':'||NEW.last_tick,NEW.world_id,NEW.station_id,NEW.last_tick,"
                + "c.controlling_major_organization_id,NEW.organization_id,c.controlling_subfaction_id,"
                + "(SELECT p.organization_id FROM organization_station_presence p JOIN world_organization sub ON sub.organization_id=p.organization_id "
                + "WHERE p.station_id=NEW.station_id AND sub.parent_organization_id=NEW.organization_id ORDER BY p.political_influence DESC,p.organization_id LIMIT 1),"
                + "'SUSTAINED_ORGANIZATION_INFLUENCE',NEW.organization_id,'Sustained political operations transferred station control after four pressure cycles.' "
                + "FROM station_control_state c JOIN station_control_challenge ch ON ch.station_id=c.station_id "
                + "AND ch.challenger_major_organization_id=NEW.organization_id WHERE c.station_id=NEW.station_id AND ch.pressure_ticks>=4;\n"
                + " UPDATE world_station SET faction=(SELECT display_name FROM world_organization WHERE organization_id=NEW.organization_id) "
                + "WHERE station_id=NEW.station_id AND EXISTS (SELECT 1 FROM station_control_challenge ch WHERE ch.station_id=NEW.station_id "
                + "AND ch.challenger_major_organization_id=NEW.organization_id AND ch.pressure_ticks>=4);\n"
                + " UPDATE world_location SET faction=(SELECT display_name FROM world_organization WHERE organization_id=NEW.organization_id) "
                + "WHERE location_id=(SELECT location_id FROM world_station WHERE station_id=NEW.station_id) "
                + "AND EXISTS (SELECT 1 FROM station_control_challenge ch WHERE ch.station_id=NEW.station_id "
                + "AND ch.challenger_major_organization_id=NEW.organization_id AND ch.pressure_ticks>=4);\n"
                + " UPDATE station_control_state SET controlling_major_organization_id=NEW.organization_id,"
                + "controlling_subfaction_id=(SELECT p.organization_id FROM organization_station_presence p JOIN world_organization sub "
                + "ON sub.organization_id=p.organization_id WHERE p.station_id=NEW.station_id AND sub.parent_organization_id=NEW.organization_id "
                + "ORDER BY p.political_influence DESC,p.organization_id LIMIT 1),control_score=NEW.political_influence,contest_state='TRANSITION',"
                + "sustained_control_ticks=0,last_changed_tick=NEW.last_tick WHERE station_id=NEW.station_id "
                + "AND EXISTS (SELECT 1 FROM station_control_challenge ch WHERE ch.station_id=NEW.station_id "
                + "AND ch.challenger_major_organization_id=NEW.organization_id AND ch.pressure_ticks>=4);\n"
                + " INSERT OR IGNORE INTO organization_news_event(news_event_id,world_id,tick_sequence,event_type,organization_id,station_id,severity,"
                + "headline,details) SELECT NEW.station_id||':transfer-news:'||NEW.organization_id||':'||NEW.last_tick,NEW.world_id,NEW.last_tick,"
                + "'CONTROL_TRANSFER',NEW.organization_id,NEW.station_id,85,'Station control transferred',challenger.display_name||' took political control of '"
                + "||ws.display_name||' after sustained influence operations.' FROM world_organization challenger JOIN world_station ws ON ws.station_id=NEW.station_id "
                + "WHERE challenger.organization_id=NEW.organization_id AND EXISTS (SELECT 1 FROM station_control_history h WHERE h.control_event_id="
                + "NEW.station_id||':control-transfer:'||NEW.organization_id||':'||NEW.last_tick);\n"
                + " UPDATE regional_conflict_zone SET status='CEASEFIRE',intensity=MAX(20,intensity-25),last_tick=NEW.last_tick,"
                + "summary=summary||' Control transferred; the immediate contest entered a ceasefire phase.' "
                + "WHERE conflict_zone_id=NEW.station_id||':regional-conflict:'||NEW.organization_id "
                + "AND EXISTS (SELECT 1 FROM station_control_history h WHERE h.control_event_id=NEW.station_id||':control-transfer:'||NEW.organization_id||':'||NEW.last_tick);\n"
                + " DELETE FROM station_control_challenge WHERE station_id=NEW.station_id "
                + "AND EXISTS (SELECT 1 FROM station_control_history h WHERE h.control_event_id=NEW.station_id||':control-transfer:'||NEW.organization_id||':'||NEW.last_tick);\n"
                + "END";
    }
}
