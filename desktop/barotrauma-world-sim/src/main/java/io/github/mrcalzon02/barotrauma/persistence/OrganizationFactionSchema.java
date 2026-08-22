package io.github.mrcalzon02.barotrauma.persistence;

import java.util.ArrayList;
import java.util.List;

/**
 * Schema 033: persistent multi-organization faction ecology, internal doctrinal blocs,
 * station control, immutable sovereign headquarters, and regional conflict foundations.
 */
public final class OrganizationFactionSchema {
    private OrganizationFactionSchema() { }

    private static final List<Institution> INSTITUTIONS = List.of(
            new Institution("europa-civil-engineering-consortium", "Europa Civil Engineering Consortium", "CONSTRUCTION_FIRM"),
            new Institution("pressure-habitat-constructors", "Pressure Habitat Constructors", "CONSTRUCTION_FIRM"),
            new Institution("abyssal-infrastructure-works", "Abyssal Infrastructure Works", "CONSTRUCTION_FIRM"),
            new Institution("deepwater-dock-yard-company", "Deepwater Dock & Yard Company", "CONSTRUCTION_FIRM"),
            new Institution("meridian-transit-engineering", "Meridian Transit Engineering", "CONSTRUCTION_FIRM"),
            new Institution("thalassa-heavy-fabrication", "Thalassa Heavy Fabrication", "INDUSTRIAL_CORPORATION"),
            new Institution("europan-industrial-holdings", "Europan Industrial Holdings", "INDUSTRIAL_CORPORATION"),
            new Institution("coldwater-consumer-supply", "Coldwater Consumer Supply Company", "COMMERCIAL_CORPORATION"),
            new Institution("outer-ring-freight-exchange", "Outer Ring Freight Exchange", "TRADE_LEAGUE"),
            new Institution("europan-merchants-league", "Europan Merchants League", "TRADE_LEAGUE"),
            new Institution("pelagic-shipping-combine", "Pelagic Shipping Combine", "SHIPPING_COMPANY"),
            new Institution("hadal-cargo-cooperative", "Hadal Cargo Cooperative", "LOGISTICS_CONSORTIUM"),
            new Institution("blackwater-salvage-consortium", "Blackwater Salvage Consortium", "SALVAGE_COMPANY"),
            new Institution("europa-resource-combine", "Europa Resource Combine", "MINING_COMPANY"),
            new Institution("nereid-agricultural-cooperative", "Nereid Agricultural Cooperative", "AGRICULTURAL_COOPERATIVE"),
            new Institution("europa-power-reactor-cooperative", "Europa Power & Reactor Cooperative", "ENERGY_UTILITY"),
            new Institution("europa-mutual-bank", "Europa Mutual Bank", "BANK"),
            new Institution("jovian-development-bank", "Jovian Development Bank", "BANK"),
            new Institution("abyssal-credit-union", "Abyssal Credit Union", "CREDIT_UNION"),
            new Institution("europan-clearing-house", "Europan Clearing House", "BANK"),
            new Institution("frontier-risk-indemnity", "Frontier Risk & Indemnity", "INSURER"),
            new Institution("dockworkers-federation", "Dockworkers Federation", "LABOR_UNION"),
            new Institution("submariners-guild", "Submariners Guild", "PROFESSIONAL_GUILD"),
            new Institution("pressure-habitat-workers-union", "Pressure Habitat Workers Union", "LABOR_UNION"),
            new Institution("free-technicians-union", "Free Technicians Union", "LABOR_UNION"),
            new Institution("medical-workers-cooperative", "Medical Workers Cooperative", "PROFESSIONAL_GUILD"),
            new Institution("reactor-engineers-guild", "Reactor Engineers Guild", "PROFESSIONAL_GUILD"),
            new Institution("pelagic-research-institute", "Pelagic Research Institute", "RESEARCH_INSTITUTE"),
            new Institution("borealis-scientific-foundation", "Borealis Scientific Foundation", "RESEARCH_INSTITUTE"),
            new Institution("europa-medical-cooperative", "Europa Medical Cooperative", "MEDICAL_NETWORK"),
            new Institution("hadal-survey-institute", "Hadal Survey Institute", "RESEARCH_INSTITUTE"),
            new Institution("xenobiology-foundation", "Xenobiology Foundation", "RESEARCH_INSTITUTE"),
            new Institution("rift-security-services", "Rift Security Services", "SECURITY_COMPANY"),
            new Institution("convoy-mutual-defense-association", "Convoy Mutual Defense Association", "SECURITY_COMPANY"),
            new Institution("deep-signal-communications", "Deep Signal Communications", "TELECOM_PROVIDER"),
            new Institution("undersea-news-service", "Undersea News Service", "MEDIA_NETWORK"),
            new Institution("habitation-cooperative-federation", "Habitation Cooperative Federation", "HOUSING_COOPERATIVE"),
            new Institution("europa-inspection-standards-board", "Europa Inspection & Standards Board", "PROFESSIONAL_GUILD"),
            new Institution("station-services-cooperative", "Station Services Cooperative", "SERVICE_COOPERATIVE")
    );

    public static List<String> statements() {
        List<String> statements = new ArrayList<>();
        statements.add("""
                CREATE TABLE world_organization (
                    organization_id TEXT PRIMARY KEY,
                    world_id TEXT NOT NULL,
                    organization_key TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    organization_type TEXT NOT NULL CHECK(organization_type IN (
                        'MAJOR_FACTION','SUBFACTION','LOCAL_ASSOCIATION','CONSTRUCTION_FIRM',
                        'INDUSTRIAL_CORPORATION','COMMERCIAL_CORPORATION','SHIPPING_COMPANY','TRADE_LEAGUE',
                        'LOGISTICS_CONSORTIUM','BANK','CREDIT_UNION','INSURER','LABOR_UNION','PROFESSIONAL_GUILD',
                        'RESEARCH_INSTITUTE','MEDICAL_NETWORK','SECURITY_COMPANY','SALVAGE_COMPANY','MINING_COMPANY',
                        'AGRICULTURAL_COOPERATIVE','ENERGY_UTILITY','TELECOM_PROVIDER','MEDIA_NETWORK',
                        'HOUSING_COOPERATIVE','SERVICE_COOPERATIVE')),
                    parent_organization_id TEXT REFERENCES world_organization(organization_id),
                    aligned_major_organization_id TEXT REFERENCES world_organization(organization_id),
                    home_station_id TEXT REFERENCES world_station(station_id),
                    territorial INTEGER NOT NULL DEFAULT 0 CHECK(territorial IN (0,1)),
                    active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)),
                    created_tick INTEGER NOT NULL DEFAULT 0 CHECK(created_tick >= 0),
                    UNIQUE(world_id,organization_key),
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id)
                )
                """);
        statements.add("CREATE INDEX world_organization_type_index ON world_organization(world_id,organization_type,active,display_name)");
        statements.add("""
                CREATE TABLE organization_doctrine (
                    organization_id TEXT PRIMARY KEY,
                    doctrine_key TEXT NOT NULL,
                    governance_priority INTEGER NOT NULL CHECK(governance_priority BETWEEN 0 AND 100),
                    security_priority INTEGER NOT NULL CHECK(security_priority BETWEEN 0 AND 100),
                    industry_priority INTEGER NOT NULL CHECK(industry_priority BETWEEN 0 AND 100),
                    trade_priority INTEGER NOT NULL CHECK(trade_priority BETWEEN 0 AND 100),
                    finance_priority INTEGER NOT NULL CHECK(finance_priority BETWEEN 0 AND 100),
                    labor_priority INTEGER NOT NULL CHECK(labor_priority BETWEEN 0 AND 100),
                    habitation_priority INTEGER NOT NULL CHECK(habitation_priority BETWEEN 0 AND 100),
                    research_priority INTEGER NOT NULL CHECK(research_priority BETWEEN 0 AND 100),
                    medical_priority INTEGER NOT NULL CHECK(medical_priority BETWEEN 0 AND 100),
                    logistics_priority INTEGER NOT NULL CHECK(logistics_priority BETWEEN 0 AND 100),
                    extraction_priority INTEGER NOT NULL CHECK(extraction_priority BETWEEN 0 AND 100),
                    expansion_priority INTEGER NOT NULL CHECK(expansion_priority BETWEEN 0 AND 100),
                    last_tick INTEGER NOT NULL DEFAULT 0 CHECK(last_tick >= 0),
                    FOREIGN KEY(organization_id) REFERENCES world_organization(organization_id) ON DELETE CASCADE
                )
                """);
        statements.add("""
                CREATE TABLE organization_headquarters (
                    organization_id TEXT PRIMARY KEY,
                    world_id TEXT NOT NULL,
                    station_id TEXT NOT NULL,
                    headquarters_kind TEXT NOT NULL CHECK(headquarters_kind IN (
                        'SOVEREIGN_HQ','SUBFACTION_SEAT','CORPORATE_HQ','LOCAL_OFFICE')),
                    sovereignty_locked INTEGER NOT NULL DEFAULT 0 CHECK(sovereignty_locked IN (0,1)),
                    established_tick INTEGER NOT NULL DEFAULT 0 CHECK(established_tick >= 0),
                    FOREIGN KEY(organization_id) REFERENCES world_organization(organization_id),
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),
                    FOREIGN KEY(station_id) REFERENCES world_station(station_id)
                )
                """);
        statements.add("CREATE INDEX organization_headquarters_station_index ON organization_headquarters(world_id,station_id,sovereignty_locked)");
        statements.add("""
                CREATE TABLE organization_station_presence (
                    organization_id TEXT NOT NULL,
                    station_id TEXT NOT NULL,
                    world_id TEXT NOT NULL,
                    political_influence INTEGER NOT NULL DEFAULT 0 CHECK(political_influence BETWEEN 0 AND 100),
                    economic_influence INTEGER NOT NULL DEFAULT 0 CHECK(economic_influence BETWEEN 0 AND 100),
                    labor_influence INTEGER NOT NULL DEFAULT 0 CHECK(labor_influence BETWEEN 0 AND 100),
                    security_influence INTEGER NOT NULL DEFAULT 0 CHECK(security_influence BETWEEN 0 AND 100),
                    presence_state TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(presence_state IN (
                        'ACTIVE','MINORITY','DOMINANT','CONTESTED','COVERT','DORMANT','EXPELLED')),
                    last_tick INTEGER NOT NULL DEFAULT 0 CHECK(last_tick >= 0),
                    PRIMARY KEY(organization_id,station_id),
                    FOREIGN KEY(organization_id) REFERENCES world_organization(organization_id) ON DELETE CASCADE,
                    FOREIGN KEY(station_id) REFERENCES world_station(station_id),
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id)
                )
                """);
        statements.add("CREATE INDEX organization_station_presence_station_index ON organization_station_presence(world_id,station_id,political_influence DESC,economic_influence DESC)");
        statements.add("""
                CREATE TABLE station_control_state (
                    station_id TEXT PRIMARY KEY,
                    world_id TEXT NOT NULL,
                    controlling_major_organization_id TEXT NOT NULL,
                    controlling_subfaction_id TEXT,
                    control_score INTEGER NOT NULL DEFAULT 70 CHECK(control_score BETWEEN 0 AND 100),
                    contest_state TEXT NOT NULL DEFAULT 'SECURE' CHECK(contest_state IN (
                        'SECURE','COMPETITIVE','CONTESTED','TRANSITION')),
                    sustained_control_ticks INTEGER NOT NULL DEFAULT 0 CHECK(sustained_control_ticks >= 0),
                    last_changed_tick INTEGER NOT NULL DEFAULT 0 CHECK(last_changed_tick >= 0),
                    FOREIGN KEY(station_id) REFERENCES world_station(station_id),
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),
                    FOREIGN KEY(controlling_major_organization_id) REFERENCES world_organization(organization_id),
                    FOREIGN KEY(controlling_subfaction_id) REFERENCES world_organization(organization_id)
                )
                """);
        statements.add("""
                CREATE TABLE station_control_history (
                    control_event_id TEXT PRIMARY KEY,
                    world_id TEXT NOT NULL,
                    station_id TEXT NOT NULL,
                    tick_sequence INTEGER NOT NULL CHECK(tick_sequence >= 0),
                    previous_major_organization_id TEXT,
                    new_major_organization_id TEXT NOT NULL,
                    previous_subfaction_id TEXT,
                    new_subfaction_id TEXT,
                    cause_type TEXT NOT NULL,
                    cause_id TEXT,
                    summary TEXT NOT NULL,
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),
                    FOREIGN KEY(station_id) REFERENCES world_station(station_id),
                    FOREIGN KEY(previous_major_organization_id) REFERENCES world_organization(organization_id),
                    FOREIGN KEY(new_major_organization_id) REFERENCES world_organization(organization_id),
                    FOREIGN KEY(previous_subfaction_id) REFERENCES world_organization(organization_id),
                    FOREIGN KEY(new_subfaction_id) REFERENCES world_organization(organization_id)
                )
                """);
        statements.add("CREATE INDEX station_control_history_station_tick ON station_control_history(station_id,tick_sequence DESC)");
        statements.add("""
                CREATE TABLE organization_influence_event (
                    influence_event_id TEXT PRIMARY KEY,
                    world_id TEXT NOT NULL,
                    station_id TEXT NOT NULL,
                    organization_id TEXT NOT NULL,
                    mission_id TEXT REFERENCES world_mission(mission_id),
                    tick_sequence INTEGER NOT NULL CHECK(tick_sequence >= 0),
                    influence_axis TEXT NOT NULL CHECK(influence_axis IN ('POLITICAL','ECONOMIC','LABOR','SECURITY')),
                    influence_delta INTEGER NOT NULL,
                    resulting_influence INTEGER NOT NULL CHECK(resulting_influence BETWEEN 0 AND 100),
                    cause_type TEXT NOT NULL,
                    summary TEXT NOT NULL,
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),
                    FOREIGN KEY(station_id) REFERENCES world_station(station_id),
                    FOREIGN KEY(organization_id) REFERENCES world_organization(organization_id)
                )
                """);
        statements.add("CREATE INDEX organization_influence_event_tick_index ON organization_influence_event(world_id,tick_sequence DESC,station_id)");
        statements.add("""
                CREATE TABLE organization_relationship (
                    world_id TEXT NOT NULL,
                    organization_a_id TEXT NOT NULL,
                    organization_b_id TEXT NOT NULL,
                    relationship_type TEXT NOT NULL CHECK(relationship_type IN (
                        'AFFILIATED','ALLIED','TRADE_PARTNER','CONTRACTOR','LABOR_PARTNER','NEUTRAL',
                        'COMPETITOR','RIVAL','HOSTILE')),
                    strength INTEGER NOT NULL DEFAULT 50 CHECK(strength BETWEEN 0 AND 100),
                    last_tick INTEGER NOT NULL DEFAULT 0 CHECK(last_tick >= 0),
                    PRIMARY KEY(organization_a_id,organization_b_id),
                    CHECK(organization_a_id<>organization_b_id),
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),
                    FOREIGN KEY(organization_a_id) REFERENCES world_organization(organization_id),
                    FOREIGN KEY(organization_b_id) REFERENCES world_organization(organization_id)
                )
                """);
        statements.add("""
                CREATE TABLE regional_conflict_zone (
                    conflict_zone_id TEXT PRIMARY KEY,
                    world_id TEXT NOT NULL,
                    display_name TEXT NOT NULL,
                    status TEXT NOT NULL CHECK(status IN ('TENSE','CONTESTED','OPEN_CONFLICT','CEASEFIRE','RESOLVED')),
                    intensity INTEGER NOT NULL CHECK(intensity BETWEEN 0 AND 100),
                    center_location_id TEXT NOT NULL,
                    radius_rings INTEGER NOT NULL DEFAULT 1 CHECK(radius_rings BETWEEN 1 AND 48),
                    started_tick INTEGER NOT NULL CHECK(started_tick >= 0),
                    last_tick INTEGER NOT NULL CHECK(last_tick >= started_tick),
                    summary TEXT NOT NULL,
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),
                    FOREIGN KEY(center_location_id) REFERENCES world_location(location_id)
                )
                """);
        statements.add("""
                CREATE TABLE regional_conflict_participant (
                    conflict_zone_id TEXT NOT NULL,
                    organization_id TEXT NOT NULL,
                    side_key TEXT NOT NULL,
                    commitment INTEGER NOT NULL DEFAULT 50 CHECK(commitment BETWEEN 0 AND 100),
                    war_aim TEXT NOT NULL,
                    last_tick INTEGER NOT NULL DEFAULT 0 CHECK(last_tick >= 0),
                    PRIMARY KEY(conflict_zone_id,organization_id),
                    FOREIGN KEY(conflict_zone_id) REFERENCES regional_conflict_zone(conflict_zone_id) ON DELETE CASCADE,
                    FOREIGN KEY(organization_id) REFERENCES world_organization(organization_id)
                )
                """);
        statements.add("""
                CREATE TABLE regional_conflict_location (
                    conflict_zone_id TEXT NOT NULL,
                    location_id TEXT NOT NULL,
                    strategic_value INTEGER NOT NULL DEFAULT 50 CHECK(strategic_value BETWEEN 0 AND 100),
                    control_pressure INTEGER NOT NULL DEFAULT 0 CHECK(control_pressure BETWEEN -100 AND 100),
                    last_tick INTEGER NOT NULL DEFAULT 0 CHECK(last_tick >= 0),
                    PRIMARY KEY(conflict_zone_id,location_id),
                    FOREIGN KEY(conflict_zone_id) REFERENCES regional_conflict_zone(conflict_zone_id) ON DELETE CASCADE,
                    FOREIGN KEY(location_id) REFERENCES world_location(location_id)
                )
                """);

        statements.add("""
                INSERT OR IGNORE INTO world_organization(
                    organization_id,world_id,organization_key,display_name,organization_type,
                    home_station_id,territorial,created_tick)
                SELECT ws.world_id||':major:'||trim(ws.faction),ws.world_id,'major:'||trim(ws.faction),
                       trim(ws.faction),'MAJOR_FACTION',
                       (SELECT ws2.station_id
                        FROM world_station ws2 JOIN world_location wl2 ON wl2.location_id=ws2.location_id
                        WHERE ws2.world_id=ws.world_id AND trim(COALESCE(ws2.faction,''))=trim(ws.faction)
                        ORDER BY wl2.source_ordinal,ws2.station_id LIMIT 1),1,0
                FROM world_station ws
                WHERE ws.faction IS NOT NULL AND trim(ws.faction)<>''
                GROUP BY ws.world_id,trim(ws.faction)
                """);
        statements.add("""
                WITH blocs(bloc_key,bloc_name) AS (
                    VALUES ('administration','Administrative Directorate'),
                           ('industrial','Industrial Development Board'),
                           ('security','Security Command'),
                           ('commercial','Commercial League'),
                           ('labor','Civic Labor Caucus'),
                           ('scientific','Scientific Secretariat'))
                INSERT OR IGNORE INTO world_organization(
                    organization_id,world_id,organization_key,display_name,organization_type,
                    parent_organization_id,aligned_major_organization_id,home_station_id,territorial,created_tick)
                SELECT o.organization_id||':sub:'||b.bloc_key,o.world_id,o.organization_key||':sub:'||b.bloc_key,
                       o.display_name||' — '||b.bloc_name,'SUBFACTION',o.organization_id,o.organization_id,
                       o.home_station_id,0,0
                FROM world_organization o CROSS JOIN blocs b
                WHERE o.organization_type='MAJOR_FACTION'
                """);
        statements.add(institutionSeedStatement());
        statements.add("""
                INSERT OR IGNORE INTO world_organization(
                    organization_id,world_id,organization_key,display_name,organization_type,
                    aligned_major_organization_id,home_station_id,territorial,created_tick)
                SELECT ws.station_id||':local:civic-chamber',ws.world_id,
                       'local:'||ws.station_id||':civic-chamber',ws.display_name||' Civic Chamber',
                       'LOCAL_ASSOCIATION',
                       (SELECT o.organization_id FROM world_organization o
                        WHERE o.world_id=ws.world_id AND o.organization_type='MAJOR_FACTION'
                          AND o.display_name=trim(COALESCE(ws.faction,'')) LIMIT 1),
                       ws.station_id,0,0
                FROM world_station ws
                """);

        statements.add("""
                INSERT OR IGNORE INTO organization_doctrine(
                    organization_id,doctrine_key,governance_priority,security_priority,industry_priority,
                    trade_priority,finance_priority,labor_priority,habitation_priority,research_priority,
                    medical_priority,logistics_priority,extraction_priority,expansion_priority,last_tick)
                SELECT organization_id,'balanced-sovereignty',70,65,60,60,55,55,60,55,55,65,50,60,0
                FROM world_organization WHERE organization_type='MAJOR_FACTION'
                """);
        statements.add("""
                INSERT OR IGNORE INTO organization_doctrine(
                    organization_id,doctrine_key,governance_priority,security_priority,industry_priority,
                    trade_priority,finance_priority,labor_priority,habitation_priority,research_priority,
                    medical_priority,logistics_priority,extraction_priority,expansion_priority,last_tick)
                SELECT organization_id,
                    CASE WHEN organization_key LIKE '%:administration' THEN 'administrative-stability'
                         WHEN organization_key LIKE '%:industrial' THEN 'industrial-expansion'
                         WHEN organization_key LIKE '%:security' THEN 'security-dominance'
                         WHEN organization_key LIKE '%:commercial' THEN 'commercial-growth'
                         WHEN organization_key LIKE '%:labor' THEN 'labor-habitation'
                         ELSE 'scientific-development' END,
                    CASE WHEN organization_key LIKE '%:administration' THEN 90 WHEN organization_key LIKE '%:labor' THEN 65 ELSE 45 END,
                    CASE WHEN organization_key LIKE '%:security' THEN 95 WHEN organization_key LIKE '%:administration' THEN 55 ELSE 40 END,
                    CASE WHEN organization_key LIKE '%:industrial' THEN 95 WHEN organization_key LIKE '%:commercial' THEN 60 ELSE 50 END,
                    CASE WHEN organization_key LIKE '%:commercial' THEN 95 WHEN organization_key LIKE '%:industrial' THEN 55 ELSE 45 END,
                    CASE WHEN organization_key LIKE '%:commercial' THEN 90 WHEN organization_key LIKE '%:industrial' THEN 65 ELSE 45 END,
                    CASE WHEN organization_key LIKE '%:labor' THEN 95 WHEN organization_key LIKE '%:administration' THEN 55 ELSE 40 END,
                    CASE WHEN organization_key LIKE '%:labor' THEN 90 WHEN organization_key LIKE '%:administration' THEN 60 ELSE 45 END,
                    CASE WHEN organization_key LIKE '%:scientific' THEN 95 WHEN organization_key LIKE '%:industrial' THEN 60 ELSE 45 END,
                    CASE WHEN organization_key LIKE '%:scientific' THEN 80 WHEN organization_key LIKE '%:labor' THEN 70 ELSE 40 END,
                    CASE WHEN organization_key LIKE '%:commercial' THEN 90 WHEN organization_key LIKE '%:industrial' THEN 80 WHEN organization_key LIKE '%:security' THEN 75 ELSE 60 END,
                    CASE WHEN organization_key LIKE '%:industrial' THEN 85 WHEN organization_key LIKE '%:scientific' THEN 65 ELSE 40 END,
                    CASE WHEN organization_key LIKE '%:industrial' THEN 95 WHEN organization_key LIKE '%:commercial' THEN 75 WHEN organization_key LIKE '%:labor' THEN 70 ELSE 55 END,0
                FROM world_organization WHERE organization_type='SUBFACTION'
                """);
        statements.add("""
                INSERT OR IGNORE INTO organization_doctrine(
                    organization_id,doctrine_key,governance_priority,security_priority,industry_priority,
                    trade_priority,finance_priority,labor_priority,habitation_priority,research_priority,
                    medical_priority,logistics_priority,extraction_priority,expansion_priority,last_tick)
                SELECT organization_id,lower(organization_type),35,
                    CASE WHEN organization_type='SECURITY_COMPANY' THEN 95 ELSE 35 END,
                    CASE WHEN organization_type IN ('CONSTRUCTION_FIRM','INDUSTRIAL_CORPORATION','ENERGY_UTILITY') THEN 90 ELSE 45 END,
                    CASE WHEN organization_type IN ('TRADE_LEAGUE','SHIPPING_COMPANY','COMMERCIAL_CORPORATION','LOGISTICS_CONSORTIUM') THEN 95 ELSE 50 END,
                    CASE WHEN organization_type IN ('BANK','CREDIT_UNION','INSURER') THEN 95 ELSE 45 END,
                    CASE WHEN organization_type IN ('LABOR_UNION','PROFESSIONAL_GUILD','HOUSING_COOPERATIVE') THEN 95 ELSE 45 END,
                    CASE WHEN organization_type IN ('HOUSING_COOPERATIVE','CONSTRUCTION_FIRM','SERVICE_COOPERATIVE') THEN 90 ELSE 45 END,
                    CASE WHEN organization_type='RESEARCH_INSTITUTE' THEN 95 WHEN organization_type IN ('INDUSTRIAL_CORPORATION','ENERGY_UTILITY') THEN 70 ELSE 45 END,
                    CASE WHEN organization_type='MEDICAL_NETWORK' THEN 95 WHEN organization_type='PROFESSIONAL_GUILD' THEN 65 ELSE 40 END,
                    CASE WHEN organization_type IN ('SHIPPING_COMPANY','LOGISTICS_CONSORTIUM','TRADE_LEAGUE','TELECOM_PROVIDER') THEN 95 ELSE 55 END,
                    CASE WHEN organization_type IN ('MINING_COMPANY','SALVAGE_COMPANY','AGRICULTURAL_COOPERATIVE') THEN 95 ELSE 40 END,
                    CASE WHEN organization_type IN ('CONSTRUCTION_FIRM','INDUSTRIAL_CORPORATION','BANK','TRADE_LEAGUE') THEN 85 ELSE 60 END,0
                FROM world_organization
                WHERE organization_type NOT IN ('MAJOR_FACTION','SUBFACTION','LOCAL_ASSOCIATION')
                """);
        statements.add("""
                INSERT OR IGNORE INTO organization_doctrine(
                    organization_id,doctrine_key,governance_priority,security_priority,industry_priority,
                    trade_priority,finance_priority,labor_priority,habitation_priority,research_priority,
                    medical_priority,logistics_priority,extraction_priority,expansion_priority,last_tick)
                SELECT organization_id,'local-civic-balance',75,55,55,65,50,75,80,45,60,60,35,60,0
                FROM world_organization WHERE organization_type='LOCAL_ASSOCIATION'
                """);

        statements.add("""
                INSERT OR IGNORE INTO organization_headquarters(
                    organization_id,world_id,station_id,headquarters_kind,sovereignty_locked,established_tick)
                SELECT organization_id,world_id,home_station_id,
                    CASE WHEN organization_type='MAJOR_FACTION' THEN 'SOVEREIGN_HQ'
                         WHEN organization_type='SUBFACTION' THEN 'SUBFACTION_SEAT'
                         WHEN organization_type='LOCAL_ASSOCIATION' THEN 'LOCAL_OFFICE'
                         ELSE 'CORPORATE_HQ' END,
                    CASE WHEN organization_type='MAJOR_FACTION' THEN 1 ELSE 0 END,0
                FROM world_organization WHERE home_station_id IS NOT NULL
                """);
        statements.add("""
                INSERT OR IGNORE INTO organization_station_presence(
                    organization_id,station_id,world_id,political_influence,economic_influence,
                    labor_influence,security_influence,presence_state,last_tick)
                SELECT o.organization_id,ws.station_id,ws.world_id,
                       CASE WHEN o.home_station_id=ws.station_id THEN 100 ELSE 80 END,60,55,65,
                       CASE WHEN o.home_station_id=ws.station_id THEN 'DOMINANT' ELSE 'ACTIVE' END,0
                FROM world_station ws JOIN world_organization o
                  ON o.world_id=ws.world_id AND o.organization_type='MAJOR_FACTION'
                 AND o.display_name=trim(COALESCE(ws.faction,''))
                """);
        statements.add("""
                INSERT OR IGNORE INTO organization_station_presence(
                    organization_id,station_id,world_id,political_influence,economic_influence,
                    labor_influence,security_influence,presence_state,last_tick)
                SELECT o.organization_id,ws.station_id,ws.world_id,
                       20+ABS((wl.source_ordinal*17+length(o.organization_key)*11)%41),
                       MIN(100,15+d.industry_priority/2+d.trade_priority/4),
                       MIN(100,15+d.labor_priority*3/4),MIN(100,15+d.security_priority*3/4),'ACTIVE',0
                FROM world_organization o
                JOIN organization_doctrine d ON d.organization_id=o.organization_id
                JOIN world_organization parent ON parent.organization_id=o.parent_organization_id
                JOIN world_station ws ON ws.world_id=o.world_id
                  AND trim(COALESCE(ws.faction,''))=parent.display_name
                JOIN world_location wl ON wl.location_id=ws.location_id
                WHERE o.organization_type='SUBFACTION'
                """);
        statements.add("""
                INSERT OR IGNORE INTO organization_station_presence(
                    organization_id,station_id,world_id,political_influence,economic_influence,
                    labor_influence,security_influence,presence_state,last_tick)
                SELECT organization_id,home_station_id,world_id,55,60,70,35,'ACTIVE',0
                FROM world_organization
                WHERE organization_type='LOCAL_ASSOCIATION' AND home_station_id IS NOT NULL
                """);
        statements.add("""
                INSERT OR IGNORE INTO organization_station_presence(
                    organization_id,station_id,world_id,political_influence,economic_influence,
                    labor_influence,security_influence,presence_state,last_tick)
                SELECT o.organization_id,ws.station_id,o.world_id,
                       5+ABS((wl.source_ordinal*7+length(o.organization_key))%26),
                       MIN(100,15+d.trade_priority/2+d.finance_priority/4+d.industry_priority/5),
                       MIN(100,10+d.labor_priority*3/5),MIN(100,5+d.security_priority*3/5),'MINORITY',0
                FROM world_organization o
                JOIN organization_doctrine d ON d.organization_id=o.organization_id
                JOIN world_station ws ON ws.world_id=o.world_id
                JOIN world_location wl ON wl.location_id=ws.location_id
                WHERE o.organization_type NOT IN ('MAJOR_FACTION','SUBFACTION','LOCAL_ASSOCIATION')
                  AND ((wl.source_ordinal+length(o.organization_key))%5)=0
                """);

        statements.add("""
                INSERT OR IGNORE INTO station_control_state(
                    station_id,world_id,controlling_major_organization_id,control_score,contest_state,
                    sustained_control_ticks,last_changed_tick)
                SELECT ws.station_id,ws.world_id,o.organization_id,
                       CASE WHEN o.home_station_id=ws.station_id THEN 100 ELSE 80 END,'SECURE',0,0
                FROM world_station ws JOIN world_organization o
                  ON o.world_id=ws.world_id AND o.organization_type='MAJOR_FACTION'
                 AND o.display_name=trim(COALESCE(ws.faction,''))
                """);
        statements.add("""
                UPDATE station_control_state
                SET controlling_subfaction_id=(
                    SELECT p.organization_id
                    FROM organization_station_presence p
                    JOIN world_organization child ON child.organization_id=p.organization_id
                    WHERE p.station_id=station_control_state.station_id
                      AND child.parent_organization_id=station_control_state.controlling_major_organization_id
                    ORDER BY p.political_influence DESC,p.organization_id LIMIT 1)
                WHERE controlling_subfaction_id IS NULL
                """);
        statements.add("""
                INSERT OR IGNORE INTO station_control_history(
                    control_event_id,world_id,station_id,tick_sequence,new_major_organization_id,
                    new_subfaction_id,cause_type,cause_id,summary)
                SELECT station_id||':control-baseline',world_id,station_id,0,controlling_major_organization_id,
                       controlling_subfaction_id,'IMPORTED_BASELINE',NULL,
                       'Initial station control was derived from the imported station faction.'
                FROM station_control_state
                """);
        statements.add("""
                INSERT OR IGNORE INTO organization_relationship(
                    world_id,organization_a_id,organization_b_id,relationship_type,strength,last_tick)
                SELECT o.world_id,o.organization_id,o.parent_organization_id,'AFFILIATED',90,0
                FROM world_organization o WHERE o.organization_type='SUBFACTION'
                """);

        statements.add("""
                CREATE TRIGGER immutable_sovereign_hq_assignment_update
                BEFORE UPDATE ON organization_headquarters
                WHEN OLD.sovereignty_locked=1
                BEGIN
                    SELECT RAISE(ABORT,'A sovereign faction headquarters assignment is permanent.');
                END
                """);
        statements.add("""
                CREATE TRIGGER immutable_sovereign_hq_assignment_delete
                BEFORE DELETE ON organization_headquarters
                WHEN OLD.sovereignty_locked=1
                BEGIN
                    SELECT RAISE(ABORT,'A sovereign faction headquarters cannot be removed.');
                END
                """);
        statements.add("""
                CREATE TRIGGER immutable_sovereign_hq_station_faction
                BEFORE UPDATE OF faction ON world_station
                WHEN EXISTS (
                    SELECT 1 FROM organization_headquarters h
                    JOIN world_organization o ON o.organization_id=h.organization_id
                    WHERE h.station_id=OLD.station_id AND h.sovereignty_locked=1
                      AND trim(COALESCE(NEW.faction,''))<>o.display_name)
                BEGIN
                    SELECT RAISE(ABORT,'A sovereign faction headquarters cannot change major-faction ownership.');
                END
                """);
        statements.add("""
                CREATE TRIGGER immutable_sovereign_hq_location_faction
                BEFORE UPDATE OF faction ON world_location
                WHEN EXISTS (
                    SELECT 1 FROM world_station ws
                    JOIN organization_headquarters h ON h.station_id=ws.station_id
                    JOIN world_organization o ON o.organization_id=h.organization_id
                    WHERE ws.location_id=OLD.location_id AND h.sovereignty_locked=1
                      AND trim(COALESCE(NEW.faction,''))<>o.display_name)
                BEGIN
                    SELECT RAISE(ABORT,'A sovereign faction headquarters location cannot change major-faction ownership.');
                END
                """);
        statements.add("""
                CREATE TRIGGER immutable_sovereign_hq_control
                BEFORE UPDATE OF controlling_major_organization_id ON station_control_state
                WHEN EXISTS (
                    SELECT 1 FROM organization_headquarters h
                    WHERE h.station_id=OLD.station_id AND h.sovereignty_locked=1
                      AND h.organization_id<>NEW.controlling_major_organization_id)
                BEGIN
                    SELECT RAISE(ABORT,'A sovereign faction headquarters cannot be captured.');
                END
                """);

        statements.add("""
                CREATE VIEW organization_ecology_observation AS
                SELECT o.organization_id,o.world_id,o.organization_key,o.display_name,o.organization_type,
                       o.parent_organization_id,parent.display_name parent_name,
                       o.aligned_major_organization_id,major.display_name aligned_major_name,
                       o.home_station_id,hs.display_name headquarters_station,o.territorial,o.active,
                       d.doctrine_key,d.governance_priority,d.security_priority,d.industry_priority,
                       d.trade_priority,d.finance_priority,d.labor_priority,d.habitation_priority,
                       d.research_priority,d.medical_priority,d.logistics_priority,d.extraction_priority,
                       d.expansion_priority,COALESCE(h.sovereignty_locked,0) sovereignty_locked
                FROM world_organization o
                LEFT JOIN world_organization parent ON parent.organization_id=o.parent_organization_id
                LEFT JOIN world_organization major ON major.organization_id=o.aligned_major_organization_id
                LEFT JOIN organization_doctrine d ON d.organization_id=o.organization_id
                LEFT JOIN organization_headquarters h ON h.organization_id=o.organization_id
                LEFT JOIN world_station hs ON hs.station_id=o.home_station_id
                """);
        statements.add("""
                CREATE VIEW station_political_observation AS
                SELECT c.station_id,ws.display_name station_name,c.world_id,
                       c.controlling_major_organization_id,major.display_name controlling_major_faction,
                       c.controlling_subfaction_id,sub.display_name controlling_subfaction,
                       c.control_score,c.contest_state,c.sustained_control_ticks,c.last_changed_tick,
                       COALESCE(h.sovereignty_locked,0) headquarters_locked
                FROM station_control_state c
                JOIN world_station ws ON ws.station_id=c.station_id
                JOIN world_organization major ON major.organization_id=c.controlling_major_organization_id
                LEFT JOIN world_organization sub ON sub.organization_id=c.controlling_subfaction_id
                LEFT JOIN organization_headquarters h ON h.station_id=c.station_id AND h.sovereignty_locked=1
                """);
        return List.copyOf(statements);
    }

    private static String institutionSeedStatement() {
        StringBuilder values = new StringBuilder();
        for (Institution institution : INSTITUTIONS) {
            if (!values.isEmpty()) values.append(',');
            values.append("('").append(sql(institution.key())).append("','")
                    .append(sql(institution.displayName())).append("','")
                    .append(sql(institution.type())).append("')");
        }
        return "WITH institutions(org_key,display_name,org_type) AS (VALUES " + values + ") "
                + "INSERT OR IGNORE INTO world_organization(organization_id,world_id,organization_key,display_name,"
                + "organization_type,home_station_id,territorial,created_tick) "
                + "SELECT wm.world_id||':institution:'||i.org_key,wm.world_id,'institution:'||i.org_key,"
                + "i.display_name,i.org_type,COALESCE((SELECT ws.station_id FROM world_station ws "
                + "JOIN world_location wl ON wl.location_id=ws.location_id WHERE ws.world_id=wm.world_id "
                + "AND wl.source_ordinal>=length(i.org_key)*3 ORDER BY wl.source_ordinal,ws.station_id LIMIT 1),"
                + "(SELECT ws.station_id FROM world_station ws JOIN world_location wl ON wl.location_id=ws.location_id "
                + "WHERE ws.world_id=wm.world_id ORDER BY wl.source_ordinal,ws.station_id LIMIT 1)),0,0 "
                + "FROM world_metadata wm CROSS JOIN institutions i "
                + "WHERE EXISTS (SELECT 1 FROM world_station ws WHERE ws.world_id=wm.world_id)";
    }

    private static String sql(String value) {
        return value.replace("'", "''");
    }

    private record Institution(String key, String displayName, String type) { }
}
