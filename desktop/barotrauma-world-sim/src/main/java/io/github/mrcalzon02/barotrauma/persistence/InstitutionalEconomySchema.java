package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/**
 * Schema 035: scales the institutional population with station count and gives organizations
 * durable finances, membership, project partners and transaction evidence.
 */
public final class InstitutionalEconomySchema {
    private InstitutionalEconomySchema() { }

    public static List<String> statements() {
        return List.of(
                """
                CREATE TABLE organization_finance_state (
                    organization_id TEXT PRIMARY KEY,
                    world_id TEXT NOT NULL,
                    treasury INTEGER NOT NULL DEFAULT 0,
                    debt INTEGER NOT NULL DEFAULT 0 CHECK(debt>=0),
                    credit_capacity INTEGER NOT NULL DEFAULT 0 CHECK(credit_capacity>=0),
                    revenue_total INTEGER NOT NULL DEFAULT 0 CHECK(revenue_total>=0),
                    expense_total INTEGER NOT NULL DEFAULT 0 CHECK(expense_total>=0),
                    payroll_per_tick INTEGER NOT NULL DEFAULT 0 CHECK(payroll_per_tick>=0),
                    liquidity INTEGER NOT NULL DEFAULT 50 CHECK(liquidity BETWEEN 0 AND 100),
                    last_tick INTEGER NOT NULL DEFAULT 0 CHECK(last_tick>=0),
                    FOREIGN KEY(organization_id) REFERENCES world_organization(organization_id) ON DELETE CASCADE,
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id)
                )
                """,
                "CREATE INDEX organization_finance_world_index ON organization_finance_state(world_id,liquidity,treasury)",
                """
                CREATE TABLE organization_membership_state (
                    organization_id TEXT PRIMARY KEY,
                    world_id TEXT NOT NULL,
                    employees INTEGER NOT NULL DEFAULT 0 CHECK(employees>=0),
                    members INTEGER NOT NULL DEFAULT 0 CHECK(members>=0),
                    contractors INTEGER NOT NULL DEFAULT 0 CHECK(contractors>=0),
                    active_crews INTEGER NOT NULL DEFAULT 0 CHECK(active_crews>=0),
                    last_tick INTEGER NOT NULL DEFAULT 0 CHECK(last_tick>=0),
                    FOREIGN KEY(organization_id) REFERENCES world_organization(organization_id) ON DELETE CASCADE,
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id)
                )
                """,
                """
                CREATE TABLE organization_operation_partner (
                    operation_id TEXT NOT NULL,
                    partner_organization_id TEXT NOT NULL,
                    partner_role TEXT NOT NULL CHECK(partner_role IN ('FINANCE','LABOR','LOGISTICS','SECURITY','RESEARCH')),
                    support_score INTEGER NOT NULL DEFAULT 0 CHECK(support_score BETWEEN 0 AND 100),
                    committed_tick INTEGER NOT NULL CHECK(committed_tick>=0),
                    PRIMARY KEY(operation_id,partner_role),
                    FOREIGN KEY(operation_id) REFERENCES organization_operation(operation_id) ON DELETE CASCADE,
                    FOREIGN KEY(partner_organization_id) REFERENCES world_organization(organization_id)
                )
                """,
                "CREATE INDEX organization_operation_partner_org_index ON organization_operation_partner(partner_organization_id,committed_tick DESC)",
                """
                CREATE TABLE organization_operation_finance (
                    operation_id TEXT PRIMARY KEY,
                    world_id TEXT NOT NULL,
                    sponsor_organization_id TEXT NOT NULL,
                    estimated_cost INTEGER NOT NULL CHECK(estimated_cost>=0),
                    sponsor_cash INTEGER NOT NULL DEFAULT 0 CHECK(sponsor_cash>=0),
                    borrowed_amount INTEGER NOT NULL DEFAULT 0 CHECK(borrowed_amount>=0),
                    financing_organization_id TEXT,
                    settled INTEGER NOT NULL DEFAULT 0 CHECK(settled IN (0,1)),
                    settlement_value INTEGER NOT NULL DEFAULT 0,
                    FOREIGN KEY(operation_id) REFERENCES organization_operation(operation_id) ON DELETE CASCADE,
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),
                    FOREIGN KEY(sponsor_organization_id) REFERENCES world_organization(organization_id),
                    FOREIGN KEY(financing_organization_id) REFERENCES world_organization(organization_id)
                )
                """,
                """
                CREATE TABLE organization_finance_ledger (
                    ledger_id TEXT PRIMARY KEY,
                    world_id TEXT NOT NULL,
                    organization_id TEXT NOT NULL,
                    operation_id TEXT,
                    tick_sequence INTEGER NOT NULL CHECK(tick_sequence>=0),
                    entry_type TEXT NOT NULL CHECK(entry_type IN (
                        'OPENING_BALANCE','OPERATING_COST','LOAN_DRAW','OPERATION_RETURN','FINANCE_FEE',
                        'PAYROLL','LOSS','TRANSFER')),
                    amount INTEGER NOT NULL,
                    balance_after INTEGER NOT NULL,
                    counterparty_organization_id TEXT,
                    summary TEXT NOT NULL,
                    FOREIGN KEY(world_id) REFERENCES world_metadata(world_id),
                    FOREIGN KEY(organization_id) REFERENCES world_organization(organization_id),
                    FOREIGN KEY(operation_id) REFERENCES organization_operation(operation_id),
                    FOREIGN KEY(counterparty_organization_id) REFERENCES world_organization(organization_id)
                )
                """,
                "CREATE INDEX organization_finance_ledger_org_tick ON organization_finance_ledger(organization_id,tick_sequence DESC)",

                // Eight local institutions per station. These are real organizations rather than generic labels,
                // so the institutional population scales linearly with civilization size.
                """
                WITH archetypes(org_key,suffix,org_type) AS (
                    VALUES
                      ('engineering','Engineering Cooperative','CONSTRUCTION_FIRM'),
                      ('mercantile','Mercantile Exchange','TRADE_LEAGUE'),
                      ('credit','Mutual Credit Union','CREDIT_UNION'),
                      ('labor','Workers Federation','LABOR_UNION'),
                      ('freight','Freight Cooperative','LOGISTICS_CONSORTIUM'),
                      ('technical','Technical Institute','RESEARCH_INSTITUTE'),
                      ('security','Mutual Security Association','SECURITY_COMPANY'),
                      ('medical','Medical Cooperative','MEDICAL_NETWORK')
                )
                INSERT OR IGNORE INTO world_organization(
                    organization_id,world_id,organization_key,display_name,organization_type,
                    aligned_major_organization_id,home_station_id,territorial,active,created_tick)
                SELECT ws.station_id||':local-institution:'||a.org_key,ws.world_id,
                       'local-institution:'||ws.station_id||':'||a.org_key,
                       ws.display_name||' '||a.suffix,a.org_type,
                       c.controlling_major_organization_id,ws.station_id,0,1,0
                FROM world_station ws
                JOIN station_control_state c ON c.station_id=ws.station_id
                CROSS JOIN archetypes a
                """,
                """
                INSERT OR IGNORE INTO organization_headquarters(
                    organization_id,world_id,station_id,headquarters_kind,sovereignty_locked,established_tick)
                SELECT organization_id,world_id,home_station_id,'LOCAL_OFFICE',0,0
                FROM world_organization
                WHERE organization_key LIKE 'local-institution:%' AND home_station_id IS NOT NULL
                """,
                """
                INSERT OR IGNORE INTO organization_doctrine(
                    organization_id,doctrine_key,governance_priority,security_priority,industry_priority,
                    trade_priority,finance_priority,labor_priority,habitation_priority,research_priority,
                    medical_priority,logistics_priority,extraction_priority,expansion_priority,last_tick)
                SELECT organization_id,'station-local-'||lower(organization_type),30,
                       CASE WHEN organization_type='SECURITY_COMPANY' THEN 90 ELSE 40 END,
                       CASE WHEN organization_type='CONSTRUCTION_FIRM' THEN 90 ELSE 45 END,
                       CASE WHEN organization_type IN ('TRADE_LEAGUE','LOGISTICS_CONSORTIUM','CREDIT_UNION') THEN 85 ELSE 45 END,
                       CASE WHEN organization_type='CREDIT_UNION' THEN 90 ELSE 45 END,
                       CASE WHEN organization_type='LABOR_UNION' THEN 95 ELSE 50 END,
                       CASE WHEN organization_type IN ('CONSTRUCTION_FIRM','LABOR_UNION','MEDICAL_NETWORK') THEN 75 ELSE 45 END,
                       CASE WHEN organization_type='RESEARCH_INSTITUTE' THEN 95 WHEN organization_type='MEDICAL_NETWORK' THEN 75 ELSE 45 END,
                       CASE WHEN organization_type='MEDICAL_NETWORK' THEN 95 ELSE 40 END,
                       CASE WHEN organization_type IN ('LOGISTICS_CONSORTIUM','TRADE_LEAGUE') THEN 95 ELSE 55 END,
                       CASE WHEN organization_type='CONSTRUCTION_FIRM' THEN 65 ELSE 35 END,
                       CASE WHEN organization_type IN ('CONSTRUCTION_FIRM','TRADE_LEAGUE','CREDIT_UNION') THEN 75 ELSE 55 END,0
                FROM world_organization
                WHERE organization_key LIKE 'local-institution:%'
                """,
                """
                INSERT OR IGNORE INTO organization_station_presence(
                    organization_id,station_id,world_id,political_influence,economic_influence,
                    labor_influence,security_influence,presence_state,last_tick)
                SELECT organization_id,home_station_id,world_id,
                       CASE WHEN organization_type IN ('LABOR_UNION','SECURITY_COMPANY') THEN 35 ELSE 20 END,
                       CASE WHEN organization_type IN ('CONSTRUCTION_FIRM','TRADE_LEAGUE','CREDIT_UNION','LOGISTICS_CONSORTIUM') THEN 70 ELSE 35 END,
                       CASE WHEN organization_type='LABOR_UNION' THEN 80 WHEN organization_type IN ('MEDICAL_NETWORK','CONSTRUCTION_FIRM') THEN 55 ELSE 30 END,
                       CASE WHEN organization_type='SECURITY_COMPANY' THEN 80 ELSE 25 END,
                       'ACTIVE',0
                FROM world_organization
                WHERE organization_key LIKE 'local-institution:%'
                """,

                // Every organization gets a balance sheet and workforce/membership state.
                """
                INSERT OR IGNORE INTO organization_finance_state(
                    organization_id,world_id,treasury,debt,credit_capacity,revenue_total,expense_total,
                    payroll_per_tick,liquidity,last_tick)
                SELECT organization_id,world_id,
                       CASE organization_type
                         WHEN 'MAJOR_FACTION' THEN 250000 WHEN 'BANK' THEN 180000 WHEN 'CREDIT_UNION' THEN 80000
                         WHEN 'INSURER' THEN 120000 WHEN 'INDUSTRIAL_CORPORATION' THEN 140000
                         WHEN 'CONSTRUCTION_FIRM' THEN 70000 WHEN 'TRADE_LEAGUE' THEN 65000
                         WHEN 'SHIPPING_COMPANY' THEN 85000 WHEN 'LOGISTICS_CONSORTIUM' THEN 60000
                         WHEN 'MINING_COMPANY' THEN 90000 WHEN 'ENERGY_UTILITY' THEN 100000
                         WHEN 'SECURITY_COMPANY' THEN 65000 ELSE 35000 END,
                       0,
                       CASE WHEN organization_type IN ('BANK','CREDIT_UNION') THEN 200000
                            WHEN organization_type='MAJOR_FACTION' THEN 100000 ELSE 30000 END,
                       0,0,
                       CASE WHEN organization_type='MAJOR_FACTION' THEN 1800
                            WHEN organization_type IN ('INDUSTRIAL_CORPORATION','CONSTRUCTION_FIRM','SHIPPING_COMPANY') THEN 900
                            WHEN organization_type IN ('LABOR_UNION','PROFESSIONAL_GUILD') THEN 350 ELSE 500 END,
                       70,0
                FROM world_organization
                """,
                """
                INSERT OR IGNORE INTO organization_membership_state(
                    organization_id,world_id,employees,members,contractors,active_crews,last_tick)
                SELECT organization_id,world_id,
                       CASE WHEN organization_type='MAJOR_FACTION' THEN 1800
                            WHEN organization_type IN ('INDUSTRIAL_CORPORATION','CONSTRUCTION_FIRM','SHIPPING_COMPANY',
                                                       'LOGISTICS_CONSORTIUM','SECURITY_COMPANY') THEN 140 ELSE 45 END,
                       CASE WHEN organization_type IN ('LABOR_UNION','PROFESSIONAL_GUILD','CREDIT_UNION',
                                                       'HOUSING_COOPERATIVE','AGRICULTURAL_COOPERATIVE') THEN 260 ELSE 0 END,
                       CASE WHEN organization_type IN ('CONSTRUCTION_FIRM','SALVAGE_COMPANY','MINING_COMPANY') THEN 40 ELSE 10 END,
                       CASE WHEN organization_type IN ('CONSTRUCTION_FIRM','SHIPPING_COMPANY','LOGISTICS_CONSORTIUM',
                                                       'SECURITY_COMPANY','SALVAGE_COMPANY','MINING_COMPANY') THEN 4 ELSE 1 END,0
                FROM world_organization
                """,
                """
                INSERT OR IGNORE INTO organization_finance_ledger(
                    ledger_id,world_id,organization_id,tick_sequence,entry_type,amount,balance_after,summary)
                SELECT organization_id||':opening-balance',world_id,organization_id,0,'OPENING_BALANCE',treasury,treasury,
                       'Opening institutional balance at schema-035 activation.'
                FROM organization_finance_state
                """,

                // Partner selection makes banks, unions, logistics/security firms and research bodies materially
                // relevant to projects sponsored by other organizations at the same station.
                """
                CREATE TRIGGER organization_operation_select_finance_partner
                AFTER INSERT ON organization_operation
                WHEN NEW.operation_type IN ('CONSTRUCTION_CONTRACT','INDUSTRIAL_INVESTMENT','RESOURCE_CONTRACT',
                                            'SALVAGE_CONTRACT','TRADE_DELEGATION')
                BEGIN
                    INSERT OR IGNORE INTO organization_operation_partner(
                        operation_id,partner_organization_id,partner_role,support_score,committed_tick)
                    SELECT NEW.operation_id,p.organization_id,'FINANCE',MIN(100,p.economic_influence),NEW.started_tick
                    FROM organization_station_presence p
                    JOIN world_organization o ON o.organization_id=p.organization_id
                    WHERE p.station_id=NEW.target_station_id
                      AND o.organization_type IN ('BANK','CREDIT_UNION')
                      AND p.organization_id<>NEW.sponsor_organization_id
                    ORDER BY p.economic_influence DESC,p.organization_id LIMIT 1;
                END
                """,
                """
                CREATE TRIGGER organization_operation_select_labor_partner
                AFTER INSERT ON organization_operation
                WHEN NEW.operation_type IN ('CONSTRUCTION_CONTRACT','INDUSTRIAL_INVESTMENT','RESOURCE_CONTRACT',
                                            'SALVAGE_CONTRACT','RELIEF_CONVOY')
                BEGIN
                    INSERT OR IGNORE INTO organization_operation_partner(
                        operation_id,partner_organization_id,partner_role,support_score,committed_tick)
                    SELECT NEW.operation_id,p.organization_id,'LABOR',MIN(100,p.labor_influence),NEW.started_tick
                    FROM organization_station_presence p
                    JOIN world_organization o ON o.organization_id=p.organization_id
                    WHERE p.station_id=NEW.target_station_id
                      AND o.organization_type IN ('LABOR_UNION','PROFESSIONAL_GUILD')
                      AND p.organization_id<>NEW.sponsor_organization_id
                    ORDER BY p.labor_influence DESC,p.organization_id LIMIT 1;
                END
                """,
                """
                CREATE TRIGGER organization_operation_select_logistics_partner
                AFTER INSERT ON organization_operation
                WHEN NEW.operation_type IN ('CONSTRUCTION_CONTRACT','TRADE_DELEGATION','RELIEF_CONVOY','RESOURCE_CONTRACT',
                                            'SALVAGE_CONTRACT','SECURITY_ASSISTANCE')
                BEGIN
                    INSERT OR IGNORE INTO organization_operation_partner(
                        operation_id,partner_organization_id,partner_role,support_score,committed_tick)
                    SELECT NEW.operation_id,p.organization_id,'LOGISTICS',MIN(100,p.economic_influence),NEW.started_tick
                    FROM organization_station_presence p
                    JOIN world_organization o ON o.organization_id=p.organization_id
                    WHERE p.station_id=NEW.target_station_id
                      AND o.organization_type IN ('LOGISTICS_CONSORTIUM','SHIPPING_COMPANY','TRADE_LEAGUE')
                      AND p.organization_id<>NEW.sponsor_organization_id
                    ORDER BY p.economic_influence DESC,p.organization_id LIMIT 1;
                END
                """,
                """
                CREATE TRIGGER organization_operation_select_security_partner
                AFTER INSERT ON organization_operation
                WHEN NEW.operation_type IN ('SECURITY_ASSISTANCE','RELIEF_CONVOY','BLOCKADE','RAID')
                BEGIN
                    INSERT OR IGNORE INTO organization_operation_partner(
                        operation_id,partner_organization_id,partner_role,support_score,committed_tick)
                    SELECT NEW.operation_id,p.organization_id,'SECURITY',MIN(100,p.security_influence),NEW.started_tick
                    FROM organization_station_presence p
                    JOIN world_organization o ON o.organization_id=p.organization_id
                    WHERE p.station_id=NEW.target_station_id
                      AND o.organization_type='SECURITY_COMPANY'
                      AND p.organization_id<>NEW.sponsor_organization_id
                    ORDER BY p.security_influence DESC,p.organization_id LIMIT 1;
                END
                """,
                """
                CREATE TRIGGER organization_operation_select_research_partner
                AFTER INSERT ON organization_operation
                WHEN NEW.operation_type='RESEARCH_GRANT'
                BEGIN
                    INSERT OR IGNORE INTO organization_operation_partner(
                        operation_id,partner_organization_id,partner_role,support_score,committed_tick)
                    SELECT NEW.operation_id,p.organization_id,'RESEARCH',MIN(100,
                        (p.economic_influence+p.political_influence)/2),NEW.started_tick
                    FROM organization_station_presence p
                    JOIN world_organization o ON o.organization_id=p.organization_id
                    WHERE p.station_id=NEW.target_station_id
                      AND o.organization_type IN ('RESEARCH_INSTITUTE','MEDICAL_NETWORK')
                      AND p.organization_id<>NEW.sponsor_organization_id
                    ORDER BY (p.economic_influence+p.political_influence) DESC,p.organization_id LIMIT 1;
                END
                """,

                // Reserve sponsor cash when an operation begins. Debt is explicit rather than silently allowing
                // organizations to spend impossible money.
                """
                CREATE TRIGGER organization_operation_finance_reserve
                AFTER INSERT ON organization_operation
                BEGIN
                    INSERT OR IGNORE INTO organization_operation_finance(
                        operation_id,world_id,sponsor_organization_id,estimated_cost,sponsor_cash,borrowed_amount,
                        financing_organization_id,settled,settlement_value)
                    SELECT NEW.operation_id,NEW.world_id,NEW.sponsor_organization_id,
                           CASE NEW.operation_type
                             WHEN 'CONSTRUCTION_CONTRACT' THEN 12000 WHEN 'INDUSTRIAL_INVESTMENT' THEN 15000
                             WHEN 'CREDIT_FINANCE' THEN 8000 WHEN 'TRADE_DELEGATION' THEN 5000
                             WHEN 'RELIEF_CONVOY' THEN 9000 WHEN 'SECURITY_ASSISTANCE' THEN 7000
                             WHEN 'BLOCKADE' THEN 14000 WHEN 'RAID' THEN 18000
                             WHEN 'RESEARCH_GRANT' THEN 7000 ELSE 4000 END,
                           MIN(fs.treasury,CASE NEW.operation_type
                             WHEN 'CONSTRUCTION_CONTRACT' THEN 12000 WHEN 'INDUSTRIAL_INVESTMENT' THEN 15000
                             WHEN 'CREDIT_FINANCE' THEN 8000 WHEN 'TRADE_DELEGATION' THEN 5000
                             WHEN 'RELIEF_CONVOY' THEN 9000 WHEN 'SECURITY_ASSISTANCE' THEN 7000
                             WHEN 'BLOCKADE' THEN 14000 WHEN 'RAID' THEN 18000
                             WHEN 'RESEARCH_GRANT' THEN 7000 ELSE 4000 END),
                           MAX(0,(CASE NEW.operation_type
                             WHEN 'CONSTRUCTION_CONTRACT' THEN 12000 WHEN 'INDUSTRIAL_INVESTMENT' THEN 15000
                             WHEN 'CREDIT_FINANCE' THEN 8000 WHEN 'TRADE_DELEGATION' THEN 5000
                             WHEN 'RELIEF_CONVOY' THEN 9000 WHEN 'SECURITY_ASSISTANCE' THEN 7000
                             WHEN 'BLOCKADE' THEN 14000 WHEN 'RAID' THEN 18000
                             WHEN 'RESEARCH_GRANT' THEN 7000 ELSE 4000 END)-fs.treasury),
                           (SELECT partner_organization_id FROM organization_operation_partner
                            WHERE operation_id=NEW.operation_id AND partner_role='FINANCE'),0,0
                    FROM organization_finance_state fs WHERE fs.organization_id=NEW.sponsor_organization_id;

                    UPDATE organization_finance_state
                    SET treasury=treasury-(SELECT sponsor_cash FROM organization_operation_finance WHERE operation_id=NEW.operation_id),
                        debt=debt+(SELECT borrowed_amount FROM organization_operation_finance WHERE operation_id=NEW.operation_id),
                        expense_total=expense_total+(SELECT estimated_cost FROM organization_operation_finance WHERE operation_id=NEW.operation_id),
                        liquidity=MAX(0,liquidity-3),last_tick=NEW.started_tick
                    WHERE organization_id=NEW.sponsor_organization_id
                      AND EXISTS (SELECT 1 FROM organization_operation_finance WHERE operation_id=NEW.operation_id);

                    INSERT OR IGNORE INTO organization_finance_ledger(
                        ledger_id,world_id,organization_id,operation_id,tick_sequence,entry_type,amount,balance_after,
                        counterparty_organization_id,summary)
                    SELECT NEW.operation_id||':operating-cost',NEW.world_id,NEW.sponsor_organization_id,NEW.operation_id,
                           NEW.started_tick,'OPERATING_COST',-estimated_cost,fs.treasury,financing_organization_id,
                           'Resources committed to '||lower(replace(NEW.operation_type,'_',' '))||'.'
                    FROM organization_operation_finance f
                    JOIN organization_finance_state fs ON fs.organization_id=f.sponsor_organization_id
                    WHERE f.operation_id=NEW.operation_id;
                END
                """,

                // Replace the schema-034 resolver with a partnership- and liquidity-aware resolver.
                "DROP TRIGGER IF EXISTS organization_local_operation_resolution",
                """
                CREATE TRIGGER organization_local_operation_resolution
                AFTER UPDATE OF last_tick ON station_simulation_state
                WHEN NEW.last_tick>OLD.last_tick
                BEGIN
                    UPDATE organization_operation
                    SET status=CASE
                          WHEN ABS((length(operation_id)*31+NEW.last_tick*17+NEW.threat*7)%100)
                               < MIN(95,MAX(20,70-(NEW.threat/2)+(NEW.security/4)
                                   +COALESCE((SELECT SUM(support_score)/20 FROM organization_operation_partner pp
                                             WHERE pp.operation_id=organization_operation.operation_id),0)
                                   +COALESCE((SELECT liquidity/10 FROM organization_finance_state fs
                                             WHERE fs.organization_id=organization_operation.sponsor_organization_id),0)))
                          THEN 'COMPLETE' ELSE 'FAILED' END,
                        completed_tick=NEW.last_tick,
                        outcome=CASE
                          WHEN ABS((length(operation_id)*31+NEW.last_tick*17+NEW.threat*7)%100)
                               < MIN(95,MAX(20,70-(NEW.threat/2)+(NEW.security/4)
                                   +COALESCE((SELECT SUM(support_score)/20 FROM organization_operation_partner pp
                                             WHERE pp.operation_id=organization_operation.operation_id),0)
                                   +COALESCE((SELECT liquidity/10 FROM organization_finance_state fs
                                             WHERE fs.organization_id=organization_operation.sponsor_organization_id),0)))
                          THEN 'SUCCESS' ELSE 'SETBACK' END
                    WHERE target_station_id=NEW.station_id AND transport_mission_id IS NULL
                      AND status='ACTIVE' AND due_tick<=NEW.last_tick;
                END
                """,

                """
                CREATE TRIGGER organization_operation_finance_success
                AFTER UPDATE OF status ON organization_operation
                WHEN NEW.status='COMPLETE' AND OLD.status<>'COMPLETE'
                  AND EXISTS (SELECT 1 FROM organization_operation_finance WHERE operation_id=NEW.operation_id AND settled=0)
                BEGIN
                    UPDATE organization_finance_state
                    SET treasury=treasury+CAST((SELECT estimated_cost FROM organization_operation_finance
                                                WHERE operation_id=NEW.operation_id)*1.35 AS INTEGER),
                        revenue_total=revenue_total+CAST((SELECT estimated_cost FROM organization_operation_finance
                                                         WHERE operation_id=NEW.operation_id)*1.35 AS INTEGER),
                        liquidity=MIN(100,liquidity+4),last_tick=NEW.completed_tick
                    WHERE organization_id=NEW.sponsor_organization_id;

                    UPDATE organization_operation_finance
                    SET settled=1,settlement_value=CAST(estimated_cost*1.35 AS INTEGER)
                    WHERE operation_id=NEW.operation_id;

                    INSERT OR IGNORE INTO organization_finance_ledger(
                        ledger_id,world_id,organization_id,operation_id,tick_sequence,entry_type,amount,balance_after,summary)
                    SELECT NEW.operation_id||':return',NEW.world_id,NEW.sponsor_organization_id,NEW.operation_id,
                           NEW.completed_tick,'OPERATION_RETURN',f.settlement_value,fs.treasury,
                           'Successful '||lower(replace(NEW.operation_type,'_',' '))||' produced an institutional return.'
                    FROM organization_operation_finance f JOIN organization_finance_state fs
                      ON fs.organization_id=f.sponsor_organization_id WHERE f.operation_id=NEW.operation_id;

                    UPDATE organization_relationship
                    SET strength=MIN(100,strength+2),last_tick=NEW.completed_tick
                    WHERE organization_a_id=NEW.sponsor_organization_id
                      AND organization_b_id IN (SELECT partner_organization_id FROM organization_operation_partner
                                                WHERE operation_id=NEW.operation_id);
                END
                """,
                """
                CREATE TRIGGER organization_operation_finance_failure
                AFTER UPDATE OF status ON organization_operation
                WHEN NEW.status='FAILED' AND OLD.status<>'FAILED'
                  AND EXISTS (SELECT 1 FROM organization_operation_finance WHERE operation_id=NEW.operation_id AND settled=0)
                BEGIN
                    UPDATE organization_finance_state
                    SET liquidity=MAX(0,liquidity-8),last_tick=NEW.completed_tick
                    WHERE organization_id=NEW.sponsor_organization_id;
                    UPDATE organization_operation_finance
                    SET settled=1,settlement_value=0 WHERE operation_id=NEW.operation_id;
                    INSERT OR IGNORE INTO organization_finance_ledger(
                        ledger_id,world_id,organization_id,operation_id,tick_sequence,entry_type,amount,balance_after,summary)
                    SELECT NEW.operation_id||':loss',NEW.world_id,NEW.sponsor_organization_id,NEW.operation_id,
                           NEW.completed_tick,'LOSS',-f.estimated_cost,fs.treasury,
                           'Failed '||lower(replace(NEW.operation_type,'_',' '))||' converted committed resources into a loss.'
                    FROM organization_operation_finance f JOIN organization_finance_state fs
                      ON fs.organization_id=f.sponsor_organization_id WHERE f.operation_id=NEW.operation_id;
                END
                """,

                """
                CREATE VIEW institutional_economy_observation AS
                SELECT o.organization_id,o.world_id,o.display_name,o.organization_type,
                       major.display_name aligned_major_name,ws.display_name headquarters_station,
                       f.treasury,f.debt,f.credit_capacity,f.revenue_total,f.expense_total,
                       f.payroll_per_tick,f.liquidity,m.employees,m.members,m.contractors,m.active_crews,
                       (SELECT COUNT(*) FROM organization_operation op WHERE op.sponsor_organization_id=o.organization_id
                          AND op.status='ACTIVE') active_operations,
                       (SELECT COUNT(*) FROM organization_station_asset a WHERE a.owner_organization_id=o.organization_id) owned_assets
                FROM world_organization o
                LEFT JOIN world_organization major ON major.organization_id=o.aligned_major_organization_id
                LEFT JOIN world_station ws ON ws.station_id=o.home_station_id
                LEFT JOIN organization_finance_state f ON f.organization_id=o.organization_id
                LEFT JOIN organization_membership_state m ON m.organization_id=o.organization_id
                """,
                """
                CREATE VIEW organization_operation_partnership_observation AS
                SELECT op.operation_id,op.operation_type,op.status,op.started_tick,op.due_tick,
                       sponsor.display_name sponsor_name,station.display_name target_station_name,
                       GROUP_CONCAT(partner.display_name||' ['||p.partner_role||':'||p.support_score||']',', ') partners,
                       finance.estimated_cost,finance.sponsor_cash,finance.borrowed_amount,
                       lender.display_name financing_organization,finance.settled,finance.settlement_value
                FROM organization_operation op
                JOIN world_organization sponsor ON sponsor.organization_id=op.sponsor_organization_id
                JOIN world_station station ON station.station_id=op.target_station_id
                LEFT JOIN organization_operation_partner p ON p.operation_id=op.operation_id
                LEFT JOIN world_organization partner ON partner.organization_id=p.partner_organization_id
                LEFT JOIN organization_operation_finance finance ON finance.operation_id=op.operation_id
                LEFT JOIN world_organization lender ON lender.organization_id=finance.financing_organization_id
                GROUP BY op.operation_id
                """
        );
    }
}
