package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Schema 036: closes financing-order gaps and makes organization balance sheets evolve every passive tick. */
public final class InstitutionalEconomyHardeningSchema {
    private InstitutionalEconomyHardeningSchema() { }

    public static List<String> statements() {
        return List.of(
                """
                CREATE TRIGGER organization_finance_partner_lender_sync
                AFTER INSERT ON organization_operation_partner
                WHEN NEW.partner_role='FINANCE'
                BEGIN
                    UPDATE organization_operation_finance
                    SET financing_organization_id=NEW.partner_organization_id
                    WHERE operation_id=NEW.operation_id AND financing_organization_id IS NULL;
                END
                """,
                """
                CREATE TRIGGER organization_finance_record_lender_sync
                AFTER INSERT ON organization_operation_finance
                WHEN NEW.financing_organization_id IS NULL
                BEGIN
                    UPDATE organization_operation_finance
                    SET financing_organization_id=(
                        SELECT partner_organization_id FROM organization_operation_partner
                        WHERE operation_id=NEW.operation_id AND partner_role='FINANCE' LIMIT 1)
                    WHERE operation_id=NEW.operation_id;
                END
                """,
                """
                CREATE TRIGGER organization_partner_relationship_seed
                AFTER INSERT ON organization_operation_partner
                BEGIN
                    INSERT OR IGNORE INTO organization_relationship(
                        world_id,organization_a_id,organization_b_id,relationship_type,strength,last_tick)
                    SELECT op.world_id,op.sponsor_organization_id,NEW.partner_organization_id,
                           CASE NEW.partner_role
                             WHEN 'FINANCE' THEN 'TRADE_PARTNER'
                             WHEN 'LABOR' THEN 'LABOR_PARTNER'
                             WHEN 'SECURITY' THEN 'ALLIED'
                             ELSE 'CONTRACTOR' END,
                           55,NEW.committed_tick
                    FROM organization_operation op WHERE op.operation_id=NEW.operation_id;
                END
                """,
                """
                CREATE TRIGGER organization_finance_lender_draw
                AFTER UPDATE OF financing_organization_id ON organization_operation_finance
                WHEN OLD.financing_organization_id IS NULL AND NEW.financing_organization_id IS NOT NULL
                  AND NEW.borrowed_amount>0
                BEGIN
                    UPDATE organization_finance_state
                    SET treasury=treasury-NEW.borrowed_amount,
                        expense_total=expense_total+NEW.borrowed_amount,
                        liquidity=MAX(0,liquidity-2),
                        last_tick=(SELECT started_tick FROM organization_operation WHERE operation_id=NEW.operation_id)
                    WHERE organization_id=NEW.financing_organization_id;

                    INSERT OR IGNORE INTO organization_finance_ledger(
                        ledger_id,world_id,organization_id,operation_id,tick_sequence,entry_type,amount,
                        balance_after,counterparty_organization_id,summary)
                    SELECT NEW.operation_id||':loan-draw-borrower',NEW.world_id,NEW.sponsor_organization_id,
                           NEW.operation_id,op.started_tick,'LOAN_DRAW',NEW.borrowed_amount,
                           borrower.treasury,NEW.financing_organization_id,
                           'External financing was drawn for '||lower(replace(op.operation_type,'_',' '))||'.'
                    FROM organization_operation op
                    JOIN organization_finance_state borrower ON borrower.organization_id=NEW.sponsor_organization_id
                    WHERE op.operation_id=NEW.operation_id;

                    INSERT OR IGNORE INTO organization_finance_ledger(
                        ledger_id,world_id,organization_id,operation_id,tick_sequence,entry_type,amount,
                        balance_after,counterparty_organization_id,summary)
                    SELECT NEW.operation_id||':loan-draw-lender',NEW.world_id,NEW.financing_organization_id,
                           NEW.operation_id,op.started_tick,'TRANSFER',-NEW.borrowed_amount,
                           lender.treasury,NEW.sponsor_organization_id,
                           'Credit was extended to finance '||lower(replace(op.operation_type,'_',' '))||'.'
                    FROM organization_operation op
                    JOIN organization_finance_state lender ON lender.organization_id=NEW.financing_organization_id
                    WHERE op.operation_id=NEW.operation_id;
                END
                """,
                """
                CREATE TRIGGER organization_finance_lender_draw_on_insert
                AFTER INSERT ON organization_operation_finance
                WHEN NEW.financing_organization_id IS NOT NULL AND NEW.borrowed_amount>0
                BEGIN
                    UPDATE organization_finance_state
                    SET treasury=treasury-NEW.borrowed_amount,
                        expense_total=expense_total+NEW.borrowed_amount,
                        liquidity=MAX(0,liquidity-2),
                        last_tick=(SELECT started_tick FROM organization_operation WHERE operation_id=NEW.operation_id)
                    WHERE organization_id=NEW.financing_organization_id;

                    INSERT OR IGNORE INTO organization_finance_ledger(
                        ledger_id,world_id,organization_id,operation_id,tick_sequence,entry_type,amount,
                        balance_after,counterparty_organization_id,summary)
                    SELECT NEW.operation_id||':loan-draw-borrower',NEW.world_id,NEW.sponsor_organization_id,
                           NEW.operation_id,op.started_tick,'LOAN_DRAW',NEW.borrowed_amount,
                           borrower.treasury,NEW.financing_organization_id,
                           'External financing was drawn for '||lower(replace(op.operation_type,'_',' '))||'.'
                    FROM organization_operation op
                    JOIN organization_finance_state borrower ON borrower.organization_id=NEW.sponsor_organization_id
                    WHERE op.operation_id=NEW.operation_id;

                    INSERT OR IGNORE INTO organization_finance_ledger(
                        ledger_id,world_id,organization_id,operation_id,tick_sequence,entry_type,amount,
                        balance_after,counterparty_organization_id,summary)
                    SELECT NEW.operation_id||':loan-draw-lender',NEW.world_id,NEW.financing_organization_id,
                           NEW.operation_id,op.started_tick,'TRANSFER',-NEW.borrowed_amount,
                           lender.treasury,NEW.sponsor_organization_id,
                           'Credit was extended to finance '||lower(replace(op.operation_type,'_',' '))||'.'
                    FROM organization_operation op
                    JOIN organization_finance_state lender ON lender.organization_id=NEW.financing_organization_id
                    WHERE op.operation_id=NEW.operation_id;
                END
                """,
                """
                CREATE TRIGGER organization_finance_successful_loan_repayment
                AFTER UPDATE OF settled ON organization_operation_finance
                WHEN NEW.settled=1 AND OLD.settled=0 AND NEW.settlement_value>0
                  AND NEW.borrowed_amount>0 AND NEW.financing_organization_id IS NOT NULL
                BEGIN
                    UPDATE organization_finance_state
                    SET treasury=MAX(0,treasury-CAST(NEW.borrowed_amount*1.05 AS INTEGER)),
                        debt=MAX(0,debt-NEW.borrowed_amount),
                        expense_total=expense_total+CAST(NEW.borrowed_amount*0.05 AS INTEGER),
                        liquidity=MIN(100,liquidity+2),
                        last_tick=(SELECT completed_tick FROM organization_operation WHERE operation_id=NEW.operation_id)
                    WHERE organization_id=NEW.sponsor_organization_id;

                    UPDATE organization_finance_state
                    SET treasury=treasury+CAST(NEW.borrowed_amount*1.05 AS INTEGER),
                        revenue_total=revenue_total+CAST(NEW.borrowed_amount*0.05 AS INTEGER),
                        liquidity=MIN(100,liquidity+2),
                        last_tick=(SELECT completed_tick FROM organization_operation WHERE operation_id=NEW.operation_id)
                    WHERE organization_id=NEW.financing_organization_id;

                    INSERT OR IGNORE INTO organization_finance_ledger(
                        ledger_id,world_id,organization_id,operation_id,tick_sequence,entry_type,amount,
                        balance_after,counterparty_organization_id,summary)
                    SELECT NEW.operation_id||':finance-fee',NEW.world_id,NEW.financing_organization_id,
                           NEW.operation_id,op.completed_tick,'FINANCE_FEE',CAST(NEW.borrowed_amount*0.05 AS INTEGER),
                           lender.treasury,NEW.sponsor_organization_id,
                           'Principal and financing fee were received after successful operation settlement.'
                    FROM organization_operation op
                    JOIN organization_finance_state lender ON lender.organization_id=NEW.financing_organization_id
                    WHERE op.operation_id=NEW.operation_id;
                END
                """,
                """
                CREATE TRIGGER organization_recurring_station_economy
                AFTER UPDATE OF last_tick ON station_simulation_state
                WHEN NEW.last_tick>OLD.last_tick
                BEGIN
                    UPDATE organization_finance_state
                    SET treasury=treasury-payroll_per_tick,
                        expense_total=expense_total+payroll_per_tick,
                        liquidity=CASE
                           WHEN treasury-payroll_per_tick<0 THEN MAX(0,liquidity-3)
                           WHEN treasury-payroll_per_tick>credit_capacity THEN MIN(100,liquidity+1)
                           ELSE liquidity END,
                        debt=debt+CASE WHEN treasury-payroll_per_tick<0 THEN ABS(treasury-payroll_per_tick) ELSE 0 END,
                        last_tick=NEW.last_tick
                    WHERE organization_id IN (
                        SELECT organization_id FROM world_organization
                        WHERE home_station_id=NEW.station_id AND active=1)
                      AND last_tick<NEW.last_tick;

                    UPDATE organization_membership_state
                    SET employees=MAX(0,employees+CASE
                            WHEN NEW.status='RISING' THEN 2 WHEN NEW.status='BESIEGED' THEN -2
                            WHEN NEW.status='STRAINED' THEN -1 ELSE 0 END),
                        members=MAX(0,members+CASE
                            WHEN NEW.status='RISING' THEN 1 WHEN NEW.status='BESIEGED' THEN -1 ELSE 0 END),
                        contractors=MAX(0,contractors+CASE
                            WHEN NEW.industry>=70 AND NEW.status NOT IN ('BESIEGED','FALLEN') THEN 1
                            WHEN NEW.status='FALLEN' THEN -2 ELSE 0 END),
                        last_tick=NEW.last_tick
                    WHERE organization_id IN (
                        SELECT organization_id FROM world_organization
                        WHERE home_station_id=NEW.station_id AND active=1)
                      AND last_tick<NEW.last_tick;
                END
                """,
                """
                CREATE VIEW organization_finance_observation AS
                SELECT o.organization_id,o.world_id,o.display_name,o.organization_type,
                       major.display_name aligned_major_name,ws.display_name headquarters_station,
                       f.treasury,f.debt,f.credit_capacity,f.revenue_total,f.expense_total,
                       f.payroll_per_tick,f.liquidity,f.last_tick,
                       m.employees,m.members,m.contractors,m.active_crews,
                       COALESCE((SELECT SUM(CASE WHEN l.amount>0 THEN l.amount ELSE 0 END)
                                 FROM organization_finance_ledger l WHERE l.organization_id=o.organization_id),0)
                           recorded_inflows,
                       COALESCE((SELECT SUM(CASE WHEN l.amount<0 THEN -l.amount ELSE 0 END)
                                 FROM organization_finance_ledger l WHERE l.organization_id=o.organization_id),0)
                           recorded_outflows
                FROM world_organization o
                LEFT JOIN world_organization major ON major.organization_id=o.aligned_major_organization_id
                LEFT JOIN world_station ws ON ws.station_id=o.home_station_id
                LEFT JOIN organization_finance_state f ON f.organization_id=o.organization_id
                LEFT JOIN organization_membership_state m ON m.organization_id=o.organization_id
                """
        );
    }
}
