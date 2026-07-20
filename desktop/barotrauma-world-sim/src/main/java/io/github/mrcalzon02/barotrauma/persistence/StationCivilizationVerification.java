package io.github.mrcalzon02.barotrauma.persistence;

import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument;
import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22WorldDocument.WorldDocument;
import io.github.mrcalzon02.barotrauma.persistence.SqliteWorldStore.ImportPlan;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.simulation.DeterministicSimulationClock;
import io.github.mrcalzon02.barotrauma.simulation.SimulationCommandExecutor;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.util.Comparator;
import java.util.UUID;

/** Behavioral contract for variable consumption and civilization/fauna frontier movement. */
public final class StationCivilizationVerification {
    private StationCivilizationVerification() { }

    public static void verifyContract() throws Exception {
        Class.forName("org.sqlite.JDBC");
        Path root = Files.createTempDirectory("barotrauma-civilization-frontier-");
        try {
            UUID worldId = UUID.fromString("9a000000-0000-0000-0000-000000000001");
            WorldPaths paths = WorldStorageContracts.createWorld(root, "Frontier Europa", worldId);
            WorldDocument document = WebSuiteV22WorldDocument.inspect(
                    fixture().getBytes(StandardCharsets.UTF_8), "frontier-world.json");
            ImportPlan plan;
            try (SqliteWorldStore store = SqliteWorldStore.open(paths)) {
                plan = store.inspectAndPlan(document.inspection());
            }
            WebWorldV22ImportTransaction.commit(paths, new WebWorldV22ImportTransaction.ImportRequest(
                    plan.artifactId(), plan.artifact().artifactIdentity().digest(), "frontier-test", document));

            SimulationCheckpointStore.RecoveryState recovery = SimulationCheckpointStore.load(paths, Duration.ofMinutes(1));
            try (SimulationCommandExecutor executor = new SimulationCommandExecutor(
                    DeterministicSimulationClock.restore(recovery.snapshot()),
                    "frontier-contract-writer", recovery.lastExecutionSequence())) {
                var enabled = executor.submit(new SimulationCommandExecutor.Enable(), "frontier-test").join();
                SimulationCheckpointStore.persist(paths, enabled, "Enable frontier contract world");
                step(paths, executor, 1);

                UUID stationId = station(paths, "station-a");
                UUID directFrontierStationId = station(paths, "station-b");
                UUID generatedStationId = station(paths, "station-c");
                verifyGeneratedPopulationBaseline(paths, generatedStationId);
                stabilizeAuxiliaryStation(paths, directFrontierStationId);
                stabilizeAuxiliaryStation(paths, generatedStationId);
                PopulationState populationBaseline = population(paths, stationId);
                require(populationBaseline.baselineKind().equals("IMPORTED_ESTIMATE")
                                && populationBaseline.residents() > 0
                                && populationBaseline.workforce() > 0
                                && populationBaseline.workforce() <= populationBaseline.residents(),
                        "Station population headcounts were not seeded from civilization state.");
                verifyGenericAttackDoesNotCreateDefensePlan(paths, worldId, stationId);
                verifyUnderallocatedPlanIsNotFullyBacked(paths, worldId, stationId);
                verifyWorkforceLossFailsAndSettlesPlan(paths, worldId, stationId);
                verifyConcurrentPlansDoNotDoubleAssignWorkforce(paths, worldId, stationId);
                long consumptionBefore = stationCount(paths, "station_consumption_log", stationId);
                forceShortage(paths, stationId);
                FrontierState shortageBaseline = frontier(paths, stationId);
                step(paths, executor, 12);

                FrontierState contracted = frontier(paths, stationId);
                require(stationCount(paths, "station_consumption_log", stationId) == consumptionBefore + 12,
                        "Every passive tick did not write station consumption evidence.");
                require(unexplainedConsumption(paths, stationId) == 0,
                        "A station consumption row has no schema-018 causal story.");
                require(causalChanges(paths, stationId, "inventory.rations") > 0
                                && causalChanges(paths, stationId, "station.supplies") > 0,
                        "Consumption stories did not retain typed ration and supply changes.");
                require(inconsistentCausalChanges(paths, stationId) == 0,
                        "A consumption change does not reconcile before + delta with its result.");
                require(stationCount(paths, "station_causal_tick_baseline", stationId) == 0,
                        "A transaction-scoped consumption baseline survived completed ticks.");
                require(distinctConsumption(paths, stationId) >= 2,
                        "Station consumption did not vary over time.");
                require(contracted.shortageTicks() >= 8,
                        "Sustained undersupply did not accumulate a shortage streak.");
                require(contracted.frontierPosition() < shortageBaseline.frontierPosition(),
                        "Sustained undersupply did not contract the civilian frontier.");
                require(contracted.populationIndex() <= shortageBaseline.populationIndex(),
                        "Sustained undersupply unexpectedly increased population capacity.");
                require(contracted.frontierState().equals("CONTRACTING")
                                || contracted.frontierState().equals("CONTESTED")
                                || contracted.frontierState().equals("ABANDONED"),
                        "Sustained undersupply did not produce a contraction state.");
                require(eventCount(paths, stationId, "SHORTAGE") > 0
                                && eventCount(paths, stationId, "CONTRACTION") > 0,
                        "Shortage and contraction evidence were not retained.");
                require(frontierStoryCount(paths, stationId, "CONTRACTION") > 0,
                        "Frontier contraction did not produce a causal station story.");

                PopulationState beforeEmigration = population(paths, stationId);
                prepareEmigration(paths, stationId);
                step(paths, executor, ticksUntil(currentTick(paths), 6));
                PopulationState emigrated = population(paths, stationId);
                int emigrationDelta = latestPopulationDelta(paths, stationId, "EMIGRATION");
                require(populationEventCount(paths, stationId, "EMIGRATION") > 0
                                && emigrationDelta < 0
                                && emigrated.residents() == beforeEmigration.residents() + emigrationDelta,
                        "A measured shortage-driven population-index loss did not become an exact emigration event.");

                int suppliesBeforeDelivery = stationSupplies(paths, stationId);
                deliverRations(paths, stationId, 60);
                FrontierState delivered = frontier(paths, stationId);
                require(stationSupplies(paths, stationId) >= suppliesBeforeDelivery + 100,
                        "A major ration delivery did not materially restore station supply capacity.");
                require(delivered.shortageTicks() < contracted.shortageTicks(),
                        "A major ration delivery did not reduce accumulated shortage pressure.");
                require(eventCount(paths, stationId, "DELIVERY") > 0,
                        "Delivery support was not recorded in frontier history.");
                require(unassignedDeliveryInventoryDelta(paths, stationId) == 60,
                        "Unassigned relief delivery did not retain its true pre-added inventory delta.");

                prepareExpansion(paths, stationId);
                require(eventCount(paths, stationId, "RECOVERY") > 0,
                        "A contracting station did not record recovery after resupply and stabilization.");
                require(frontierStoryCount(paths, stationId, "RECOVERY") > 0,
                        "Frontier recovery did not produce a causal station story.");
                int frontierBeforeRecovery = frontier(paths, stationId).frontierPosition();
                step(paths, executor, 10);
                FrontierState recovered = frontier(paths, stationId);
                require(recovered.frontierPosition() > frontierBeforeRecovery,
                        "Stable supply and security did not permit slow frontier expansion.");
                require(recovered.civilizationStrength() >= 80,
                        "Stable supply and security did not preserve civilization strength.");
                require(eventCount(paths, stationId, "EXPANSION") > 0,
                        "Civilization expansion was not recorded.");
                require(frontierStoryCount(paths, stationId, "EXPANSION") > 0,
                        "Frontier expansion did not produce a causal station story.");
                require(openExpansionMission(paths, stationId),
                        "Civilization expansion did not create outward NPC work.");

                PopulationState beforeImmigration = population(paths, stationId);
                prepareImmigration(paths, stationId);
                step(paths, executor, ticksUntil(currentTick(paths), 8));
                PopulationState immigrated = population(paths, stationId);
                int immigrationDelta = latestPopulationDelta(paths, stationId, "IMMIGRATION");
                require(populationEventCount(paths, stationId, "IMMIGRATION") > 0
                                && immigrationDelta > 0
                                && immigrated.residents() == beforeImmigration.residents() + immigrationDelta,
                        "A measured surplus-driven population-index gain did not become an exact immigration event.");

                prepareMonsterAttack(paths, stationId);
                PopulationState beforeAttack = population(paths, stationId);
                long currentTick = currentTick(paths);
                int codePoint = stationId.toString().charAt(2);
                int ticksToAttack = 1;
                while (Math.floorMod(currentTick + ticksToAttack + codePoint, 13) != 0) ticksToAttack++;
                long attackTick = currentTick + ticksToAttack;
                step(paths, executor, ticksToAttack);
                FrontierState attacked = frontier(paths, stationId);
                require(eventAtTick(paths, stationId, "MONSTER_ATTACK", attackTick),
                        "Deterministic fauna pressure did not produce a monster attack.");
                require(frontierStoryCount(paths, stationId, "MONSTER_ATTACK") > 0,
                        "A monster attack did not produce a fauna-attributed causal station story.");
                PopulationState attackPopulation = population(paths, stationId);
                require(populationEventCount(paths, stationId, "ATTACK_CASUALTIES") > 0
                                && attackPopulation.residents() < beforeAttack.residents(),
                        "Measured fauna damage did not produce exact attack casualties.");
                FactionPlanState preparedDefense = factionPlan(paths, stationId, attackTick);
                require(preparedDefense.phase().equals("PREPARATION")
                                && preparedDefense.status().equals("ACTIVE")
                                && preparedDefense.backingStatus().equals("FULLY_BACKED")
                                && preparedDefense.outstandingCredits() == FactionPlanTransaction.DEFENSE_CREDITS
                                && preparedDefense.outstandingPersonnel() == FactionPlanTransaction.DEFENSE_PERSONNEL
                                && preparedDefense.outstandingEquipment() == FactionPlanTransaction.DEFENSE_AMMUNITION
                                && preparedDefense.storyCount() == 1
                                && defensePlanHasMonsterAttackSource(paths, preparedDefense.planId()),
                        "The measured attack did not create one fully allocation-backed faction defense plan.");
                require(factionPlanTreasuryDelta(paths, preparedDefense.planId())
                                == -FactionPlanTransaction.DEFENSE_CREDITS,
                        "Faction defense credits were not escrowed exactly once.");
                require(attacked.frontierPosition() < 55,
                        "A successful monster attack did not force the civilian perimeter inward.");
                require(openDefenseMission(paths, stationId),
                        "Frontier contraction did not create an NPC defense or fauna-clearing response.");
                require(frontierMissionIdsAreUuids(paths, stationId),
                        "A frontier-generated NPC mission did not retain UUID-compatible identity.");
                prepareAbandonment(paths, stationId);
                step(paths, executor, 1);
                require(eventCount(paths, stationId, "ABANDONMENT") > 0
                                && frontierStoryCount(paths, stationId, "ABANDONMENT") == 1,
                        "Frontier abandonment did not produce one transition-only causal story.");
                PopulationState evacuated = population(paths, stationId);
                require(populationEventCount(paths, stationId, "EVACUATION") == 1
                                && evacuated.residents() == 0 && evacuated.workforce() == 0,
                        "Station abandonment did not evacuate the remaining recorded population exactly once.");
                FactionPlanState completedDefense = factionPlan(paths, stationId, attackTick);
                require(completedDefense.phase().equals("COMPLETE")
                                && completedDefense.status().equals("SUCCEEDED")
                                && completedDefense.backingStatus().equals("SETTLED")
                                && completedDefense.outstandingCredits() == 0
                                && completedDefense.outstandingPersonnel() == 0
                                && completedDefense.outstandingEquipment() == 0
                                && completedDefense.creditsSpent() == FactionPlanTransaction.DEFENSE_CREDITS
                                && completedDefense.storyCount() == 2,
                        "The funded faction defense did not settle its resources and consequence story once.");
                require(inconsistentFactionChanges(paths, preparedDefense.planId()) == 0,
                        "A faction reservation or expenditure change does not reconcile exactly.");
                require(transactionContextCount(paths) == 0,
                        "A transaction-scoped command context survived a completed passive commit.");
                require(commandSourceCount(paths, stationId) > 0 && invalidCommandSourceCount(paths, stationId) == 0,
                        "A passive station story lost or falsified its exact originating command and tick range.");
                require(unlinkedPassiveStoryCount(paths, stationId) == 0,
                        "A passive station story was not linked to the command that created it.");
                require(directDeliveryCommandSourceCount(paths, stationId) == 0,
                        "A direct freight delivery was falsely attributed to a passive simulation command.");
                require(mutationCoverageCount(paths, stationId) > 0
                                && unexplainedMutationCount(paths, stationId) == 0,
                        "Enforced resident or workforce mutation coverage contains an unexplained change.");
                verifyUnexplainedMutationIsRejected(paths, stationId);
                verifyMisalignedMutationIsCapturedAndRejected(paths, stationId);
                verifyMismatchedCommandContextIsRejected(paths, stationId);
                step(paths, executor, 1);
                require(frontierStoryCount(paths, stationId, "ABANDONMENT") == 1,
                        "An abandoned station emitted a repeated abandonment story.");
                require(frontierBaselineCount(paths, stationId) == 0,
                        "A transaction-scoped frontier baseline survived a completed tick.");
                require(populationBaselineCount(paths, stationId) == 0,
                        "A transaction-scoped population baseline survived a completed tick.");
                require(populationCoverageGap(paths, stationId) == 0,
                        "Station headcounts contain a resident or workforce mutation without population evidence.");
                require(inconsistentPopulationChanges(paths, stationId) == 0,
                        "A population event or typed population change does not reconcile exactly.");
                require(populationStoryCount(paths, stationId) == populationEvidenceCount(paths, stationId),
                        "A station population event lost its one causal story.");
                require(inconsistentFrontierChanges(paths, stationId) == 0,
                        "A frontier change does not reconcile before + delta with its result.");
                require(frontierStoryMultiplicityFailures(paths, stationId) == 0,
                        "A frontier source event did not retain exactly one bounded station story.");
                require(frontierTypedChange(paths, stationId, "ATTACK", "station.threat", "ATTACK_DAMAGE") > 0
                                && frontierTypedChange(paths, stationId, "RECOVERY", "civilization.strength", "FRONTIER_RECOVERY") > 0
                                && frontierTypedChange(paths, stationId, "FRONTIER_CHANGE", "civilization.frontier_position", "FRONTIER_ADVANCE") > 0
                                && frontierTypedChange(paths, stationId, "FRONTIER_CHANGE", "civilization.frontier_position", "FRONTIER_RETREAT") > 0,
                        "Attack, recovery, advance, or retreat stories lost their measured typed changes.");
                PopulationState directFrontierBefore = population(paths, directFrontierStationId);
                long directFrontierEvacuations = populationEventCount(
                        paths, directFrontierStationId, "EVACUATION");
                directAbandonFrontier(paths, directFrontierStationId);
                requireExactDirectEvacuation(paths, directFrontierStationId, "FRONTIER_TRANSITION",
                        directFrontierBefore, directFrontierEvacuations);

                PopulationState directFallenBefore = population(paths, generatedStationId);
                long directFallenEvacuations = populationEventCount(paths, generatedStationId, "EVACUATION");
                directFallStation(paths, generatedStationId);
                requireExactDirectEvacuation(paths, generatedStationId, "STATION_STATUS_TRANSITION",
                        directFallenBefore, directFallenEvacuations);
                step(paths, executor, 1);
                require(populationEventCount(paths, directFrontierStationId, "EVACUATION")
                                == directFrontierEvacuations + 1
                                && populationEventCount(paths, generatedStationId, "EVACUATION")
                                == directFallenEvacuations + 1,
                        "A passive finalizer duplicated a completed direct station evacuation.");
                require(schemaVersion(paths) == WorldStorageContracts.DATABASE_SCHEMA_VERSION,
                        "Frontier fixture was not stored under the current database schema.");
            }
        } finally {
            try (var stream = Files.walk(root)) {
                for (Path path : stream.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(path);
            }
        }
    }

    private static void step(WorldPaths paths, SimulationCommandExecutor executor, int ticks) throws Exception {
        var receipt = executor.submit(new SimulationCommandExecutor.Step(ticks), "frontier-test").join();
        PassiveWorldTickTransaction.commit(paths, receipt);
    }

    private static void verifyGeneratedPopulationBaseline(WorldPaths paths, UUID stationId) throws Exception {
        boolean immutable = false;
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            execute(connection, "DELETE FROM station_event WHERE station_id=? AND event_type='POPULATION'", stationId);
            execute(connection, "DELETE FROM station_population_state WHERE station_id=?", stationId);
            execute(connection, "INSERT INTO station_population_state(station_id,world_id,baseline_kind,"
                    + "baseline_tick,baseline_resident_count,resident_count,baseline_workforce_count,"
                    + "workforce_count,last_tick) SELECT station_id,world_id,'GENERATED_ALLOCATION',last_tick,"
                    + "12000,12000,6500,6500,last_tick FROM station_civilization_state WHERE station_id=?", stationId);
            try {
                execute(connection, "UPDATE station_population_state SET baseline_kind='IMPORTED_ESTIMATE' "
                        + "WHERE station_id=?", stationId);
            } catch (java.sql.SQLException expected) {
                immutable = expected.getMessage().contains("baselines are immutable");
            }
        }
        PopulationState generated = population(paths, stationId);
        require(generated.baselineKind().equals("GENERATED_ALLOCATION")
                        && generated.baselineResidents() == 12000 && generated.residents() == 12000
                        && generated.baselineWorkforce() == 6500 && generated.workforce() == 6500,
                "Generated population allocation was not accepted as an authoritative baseline.");
        require(immutable, "A generated population baseline could be rewritten after creation.");
    }

    private static void stabilizeAuxiliaryStation(WorldPaths paths, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            execute(connection, "UPDATE station_simulation_state SET supplies=10000,industry=90,security=100,"
                    + "integrity=100,threat=0,status='STABLE' WHERE station_id=?", stationId);
            execute(connection, "UPDATE station_inventory SET quantity=10000,reserved=0 WHERE station_id=? "
                    + "AND item_id='item-rations'", stationId);
            execute(connection, "UPDATE station_civilization_state SET civilization_strength=100,fauna_pressure=0,"
                    + "shortage_ticks=0,surplus_ticks=0,frontier_position=60,frontier_state='HOLDING' "
                    + "WHERE station_id=?", stationId);
        }
    }

    private static void directAbandonFrontier(WorldPaths paths, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            execute(connection, "UPDATE station_simulation_state SET status='STABLE' WHERE station_id=?", stationId);
            execute(connection, "UPDATE station_civilization_state SET frontier_state='HOLDING' WHERE station_id=?",
                    stationId);
            execute(connection, "UPDATE station_civilization_state SET frontier_state='ABANDONED' "
                    + "WHERE station_id=?", stationId);
        }
    }

    private static void directFallStation(WorldPaths paths, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            execute(connection, "UPDATE station_simulation_state SET status='STABLE' WHERE station_id=?", stationId);
            execute(connection, "UPDATE station_simulation_state SET status='FALLEN' WHERE station_id=?", stationId);
        }
    }

    private static void requireExactDirectEvacuation(WorldPaths paths, UUID stationId, String causeType,
                                                      PopulationState before, long eventCountBefore)
            throws Exception {
        PopulationState after = population(paths, stationId);
        require(before.residents() > 0 && before.workforce() > 0
                        && after.residents() == 0 && after.workforce() == 0,
                "A direct abandonment or station fall did not evacuate the recorded population.");
        require(populationEventCount(paths, stationId, "EVACUATION") == eventCountBefore + 1,
                "A direct abandonment or station fall did not create exactly one evacuation event.");
        String sql = "SELECT COUNT(*) FROM station_population_event p JOIN station_event e ON e.event_id=p.event_id "
                + "JOIN station_change residents ON residents.event_id=e.event_id "
                + "AND residents.statistic_key='population.residents' "
                + "JOIN station_change workforce ON workforce.event_id=e.event_id "
                + "AND workforce.statistic_key='population.workforce' WHERE e.station_id=? AND e.cause_type=? "
                + "AND p.population_category='EVACUATION' AND p.people_before=? AND p.people_delta=? "
                + "AND p.people_after=0 AND p.workforce_delta=? "
                + "AND residents.previous_value=? AND residents.delta_value=? AND residents.resulting_value=0 "
                + "AND workforce.previous_value=? AND workforce.delta_value=? AND workforce.resulting_value=0";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            statement.setString(2, causeType);
            statement.setInt(3, before.residents());
            statement.setInt(4, -before.residents());
            statement.setInt(5, -before.workforce());
            statement.setInt(6, before.residents());
            statement.setInt(7, -before.residents());
            statement.setInt(8, before.workforce());
            statement.setInt(9, -before.workforce());
            try (ResultSet result = statement.executeQuery()) {
                require(result.next() && result.getLong(1) == 1,
                        "Direct evacuation evidence did not reconcile its resident and workforce changes exactly.");
            }
        }
        require(populationCoverageGap(paths, stationId) == 0,
                "Direct station evacuation left an unexplained population coverage gap.");
    }

    private static void forceShortage(WorldPaths paths, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            execute(connection, "UPDATE station_simulation_state SET supplies=18,industry=20,security=25,"
                    + "integrity=95,threat=45 WHERE station_id=?", stationId);
            execute(connection, "UPDATE station_inventory SET quantity=0,reserved=0 WHERE station_id=? "
                    + "AND item_id='item-rations'", stationId);
            execute(connection, "UPDATE station_civilization_state SET population_index=70,"
                    + "civilization_strength=55,fauna_pressure=40,shortage_ticks=0,surplus_ticks=0,"
                    + "frontier_position=60,frontier_state='HOLDING' WHERE station_id=?", stationId);
        }
    }

    private static void deliverRations(WorldPaths paths, UUID destinationStationId, int quantity) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            UUID sourceStationId = station(connection, "station-b");
            String worldId = worldId(connection);
            long tick = currentTick(connection);
            try (PreparedStatement stock = connection.prepareStatement(
                    "UPDATE station_inventory SET quantity=quantity+?,last_tick=? WHERE station_id=? "
                            + "AND item_id='item-rations'")) {
                stock.setInt(1, quantity);
                stock.setLong(2, tick);
                stock.setString(3, destinationStationId.toString());
                stock.executeUpdate();
            }
            String lotId = destinationStationId + ":recovery-delivery:" + tick;
            try (PreparedStatement lot = connection.prepareStatement(
                    "INSERT INTO freight_lot(lot_id,world_id,source_station_id,destination_station_id,item_id,quantity,"
                            + "status,created_tick,updated_tick) VALUES (?,?,?,?, 'item-rations',?,'IN_TRANSIT',?,?)")) {
                lot.setString(1, lotId);
                lot.setString(2, worldId);
                lot.setString(3, sourceStationId.toString());
                lot.setString(4, destinationStationId.toString());
                lot.setInt(5, quantity);
                lot.setLong(6, tick);
                lot.setLong(7, tick);
                lot.executeUpdate();
            }
            try (PreparedStatement delivered = connection.prepareStatement(
                    "UPDATE freight_lot SET status='DELIVERED',delivered_tick=?,updated_tick=? WHERE lot_id=?")) {
                delivered.setLong(1, tick);
                delivered.setLong(2, tick);
                delivered.setString(3, lotId);
                delivered.executeUpdate();
            }
        }
    }

    private static void prepareExpansion(WorldPaths paths, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            execute(connection, "UPDATE station_simulation_state SET supplies=180,industry=80,security=90,"
                    + "integrity=95,threat=5 WHERE station_id=?", stationId);
            execute(connection, "UPDATE station_inventory SET quantity=120,reserved=0 WHERE station_id=? "
                    + "AND item_id='item-rations'", stationId);
            execute(connection, "UPDATE station_civilization_state SET civilization_strength=80,"
                    + "fauna_pressure=5,shortage_ticks=0,surplus_ticks=0,frontier_state='HOLDING' "
                    + "WHERE station_id=?", stationId);
        }
    }

    private static void prepareMonsterAttack(WorldPaths paths, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            execute(connection, "UPDATE station_simulation_state SET credits=5000,supplies=150,industry=55,security=20,"
                    + "integrity=90,threat=60 WHERE station_id=?", stationId);
            execute(connection, "UPDATE station_inventory SET quantity=100,reserved=0 WHERE station_id=? "
                    + "AND item_id='item-rations'", stationId);
            execute(connection, "UPDATE station_inventory SET quantity=20,reserved=2 WHERE station_id=? "
                    + "AND item_id='item-ammunition'", stationId);
            execute(connection, "UPDATE station_civilization_state SET population_index=70,"
                    + "civilization_strength=20,fauna_pressure=70,shortage_ticks=0,surplus_ticks=0,"
                    + "frontier_position=55,frontier_state='HOLDING' WHERE station_id=?", stationId);
        }
    }

    private static void verifyGenericAttackDoesNotCreateDefensePlan(WorldPaths paths, UUID worldId,
                                                                    UUID stationId) throws Exception {
        long probeTick = 900_001;
        String planId = stationId + ":defense-plan:" + probeTick;
        boolean planCreated;
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            connection.setAutoCommit(false);
            try {
                String sql = "INSERT INTO station_event(event_id,world_id,station_id,tick_sequence,event_type,"
                        + "severity,headline,narrative,actor_type,actor_id,cause_type,cause_id,deterministic_key,"
                        + "visibility,correlation_id,policy_version,created_at) VALUES (?,?,?,?,'ATTACK',1,"
                        + "'Generic threat increase','A threat statistic increased without an actual fauna event.',"
                        + "'SYSTEM','verification-probe','FRONTIER_TICK',?,?,'OBSERVED',?,1,'verification-probe')";
                try (PreparedStatement statement = connection.prepareStatement(sql)) {
                    statement.setString(1, stationId + ":generic-attack-probe");
                    statement.setString(2, worldId.toString());
                    statement.setString(3, stationId.toString());
                    statement.setLong(4, probeTick);
                    statement.setString(5, stationId + ":" + probeTick);
                    statement.setString(6, "generic-attack-probe:" + probeTick);
                    statement.setString(7, worldId + ":tick:" + probeTick);
                    statement.executeUpdate();
                }
                FactionPlanTransaction.createDefensivePlans(connection, worldId, probeTick);
                try (PreparedStatement statement = connection.prepareStatement(
                        "SELECT COUNT(*) FROM faction_plan WHERE plan_id=?")) {
                    statement.setString(1, planId);
                    try (ResultSet result = statement.executeQuery()) {
                        planCreated = result.next() && result.getInt(1) > 0;
                    }
                }
            } finally {
                connection.rollback();
            }
        }
        require(!planCreated,
                "A generic ATTACK story created a defense plan without a MONSTER_ATTACK frontier event.");
    }

    private static void verifyUnderallocatedPlanIsNotFullyBacked(WorldPaths paths, UUID worldId,
                                                                  UUID stationId) throws Exception {
        String planId = stationId + ":underallocated-plan-probe";
        boolean terminalRejected = false;
        String backing;
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            connection.setAutoCommit(false);
            try {
                insertProbePlan(connection, planId, worldId, stationId, 900_002,
                        2_000, 1_000, 10, 5, 8, 4);
                insertProbeAllocation(connection, planId, stationId, "CREDITS", "station-credits", 1_000, 900_002);
                insertProbeAllocation(connection, planId, stationId, "PERSONNEL", "station-workforce", 5, 900_002);
                insertProbeAllocation(connection, planId, stationId, "EQUIPMENT", "item-ammunition", 4, 900_002);
                backing = planBacking(connection, planId);
                try (PreparedStatement statement = connection.prepareStatement(
                        "UPDATE faction_plan SET phase='FAILED',status='FAILED' WHERE plan_id=?")) {
                    statement.setString(1, planId);
                    statement.executeUpdate();
                } catch (SQLException expected) {
                    terminalRejected = true;
                }
            } finally {
                connection.rollback();
            }
        }
        require(backing.equals("PARTIALLY_BACKED"),
                "Allocations matching only reserved summaries were falsely reported as FULLY_BACKED.");
        require(terminalRejected,
                "A failed faction plan retained live credit, personnel, or equipment allocations.");
    }

    private static void verifyWorkforceLossFailsAndSettlesPlan(WorldPaths paths, UUID worldId,
                                                                UUID stationId) throws Exception {
        long probeTick = 900_003;
        String planId = stationId + ":workforce-loss-plan-probe";
        int creditsBefore;
        int securityBefore;
        int threatBefore;
        int ammunitionReservedBefore;
        boolean failedAndSettled;
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            connection.setAutoCommit(false);
            try {
                String stateSql = "SELECT s.credits,s.security,s.threat,i.reserved FROM station_simulation_state s "
                        + "JOIN station_inventory i ON i.station_id=s.station_id AND i.item_id='item-ammunition' "
                        + "WHERE s.station_id=?";
                try (PreparedStatement statement = connection.prepareStatement(stateSql)) {
                    statement.setString(1, stationId.toString());
                    try (ResultSet result = statement.executeQuery()) {
                        if (!result.next()) throw new IllegalStateException("Faction probe station state is missing.");
                        creditsBefore = result.getInt("credits");
                        securityBefore = result.getInt("security");
                        threatBefore = result.getInt("threat");
                        ammunitionReservedBefore = result.getInt("reserved");
                    }
                }
                execute(connection, "UPDATE station_population_state SET workforce_count=2 WHERE station_id=?",
                        stationId);
                execute(connection, "UPDATE station_simulation_state SET credits=credits-1000 WHERE station_id=?",
                        stationId);
                execute(connection, "UPDATE station_inventory SET quantity=MAX(quantity,reserved+4),"
                        + "reserved=reserved+4 WHERE station_id=? AND item_id='item-ammunition'", stationId);
                insertProbePlan(connection, planId, worldId, stationId, probeTick,
                        1_000, 1_000, 5, 5, 4, 4);
                insertProbeAllocation(connection, planId, stationId, "CREDITS", "station-credits", 1_000, probeTick);
                insertProbeAllocation(connection, planId, stationId, "PERSONNEL", "station-workforce", 5, probeTick);
                insertProbeAllocation(connection, planId, stationId, "EQUIPMENT", "item-ammunition", 4, probeTick);

                FactionPlanTransaction.settleDuePlans(connection, worldId, probeTick);
                String resultSql = "SELECT fp.phase,fp.status,b.backing_status,s.credits,s.security,s.threat,"
                        + "pop.workforce_count,a.available_workforce,i.reserved,"
                        + "(SELECT COUNT(*) FROM faction_plan_event pe WHERE pe.plan_id=fp.plan_id) story_count "
                        + "FROM faction_plan fp JOIN faction_plan_resource_balance b ON b.plan_id=fp.plan_id "
                        + "JOIN station_simulation_state s ON s.station_id=fp.target_station_id "
                        + "JOIN station_population_state pop ON pop.station_id=fp.target_station_id "
                        + "JOIN station_faction_resource_availability a ON a.station_id=fp.target_station_id "
                        + "JOIN station_inventory i ON i.station_id=fp.target_station_id "
                        + "AND i.item_id='item-ammunition' WHERE fp.plan_id=?";
                try (PreparedStatement statement = connection.prepareStatement(resultSql)) {
                    statement.setString(1, planId);
                    try (ResultSet result = statement.executeQuery()) {
                        if (!result.next()) throw new IllegalStateException("Workforce-loss probe plan is missing.");
                        failedAndSettled = result.getString("phase").equals("FAILED")
                                && result.getString("status").equals("FAILED")
                                && result.getString("backing_status").equals("SETTLED")
                                && result.getInt("credits") == creditsBefore
                                && result.getInt("security") == securityBefore
                                && result.getInt("threat") == threatBefore
                                && result.getInt("workforce_count") == 2
                                && result.getInt("available_workforce") == 2
                                && result.getInt("reserved") == ammunitionReservedBefore
                                && result.getInt("story_count") == 1;
                    }
                }
            } finally {
                connection.rollback();
            }
        }
        require(failedAndSettled,
                "An understaffed defense executed or released allocations by inventing available personnel.");
    }

    private static void verifyConcurrentPlansDoNotDoubleAssignWorkforce(WorldPaths paths, UUID worldId,
                                                                         UUID stationId) throws Exception {
        long probeTick = 900_004;
        String firstPlan = stationId + ":concurrent-defense-a";
        String secondPlan = stationId + ":concurrent-defense-b";
        boolean deterministicSettlement;
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            connection.setAutoCommit(false);
            try {
                int creditsBefore;
                int ammunitionReservedBefore;
                String stateSql = "SELECT s.credits,i.reserved FROM station_simulation_state s "
                        + "JOIN station_inventory i ON i.station_id=s.station_id AND i.item_id='item-ammunition' "
                        + "WHERE s.station_id=?";
                try (PreparedStatement statement = connection.prepareStatement(stateSql)) {
                    statement.setString(1, stationId.toString());
                    try (ResultSet result = statement.executeQuery()) {
                        if (!result.next()) throw new IllegalStateException("Concurrent-plan probe state is missing.");
                        creditsBefore = result.getInt("credits");
                        ammunitionReservedBefore = result.getInt("reserved");
                    }
                }
                execute(connection, "UPDATE station_population_state SET workforce_count=8 WHERE station_id=?",
                        stationId);
                execute(connection, "UPDATE station_simulation_state SET credits=credits-2000,security=40,threat=40 "
                        + "WHERE station_id=?", stationId);
                execute(connection, "UPDATE station_inventory SET quantity=MAX(quantity,reserved+8),"
                        + "reserved=reserved+8 WHERE station_id=? AND item_id='item-ammunition'", stationId);
                insertProbePlan(connection, firstPlan, worldId, stationId, probeTick,
                        1_000, 1_000, 5, 5, 4, 4);
                insertProbePlan(connection, secondPlan, worldId, stationId, probeTick,
                        1_000, 1_000, 5, 5, 4, 4);
                for (String planId : java.util.List.of(firstPlan, secondPlan)) {
                    insertProbeAllocation(connection, planId, stationId, "CREDITS", "station-credits",
                            1_000, probeTick);
                    insertProbeAllocation(connection, planId, stationId, "PERSONNEL", "station-workforce",
                            5, probeTick);
                    insertProbeAllocation(connection, planId, stationId, "EQUIPMENT", "item-ammunition",
                            4, probeTick);
                }

                FactionPlanTransaction.settleDuePlans(connection, worldId, probeTick);
                boolean firstFailed = false;
                boolean secondSucceeded = false;
                String plansSql = "SELECT fp.plan_id,fp.status,b.backing_status FROM faction_plan fp "
                        + "JOIN faction_plan_resource_balance b ON b.plan_id=fp.plan_id "
                        + "WHERE fp.plan_id IN (?,?)";
                try (PreparedStatement statement = connection.prepareStatement(plansSql)) {
                    statement.setString(1, firstPlan);
                    statement.setString(2, secondPlan);
                    try (ResultSet result = statement.executeQuery()) {
                        while (result.next()) {
                            if (result.getString("plan_id").equals(firstPlan)) {
                                firstFailed = result.getString("status").equals("FAILED")
                                        && result.getString("backing_status").equals("SETTLED");
                            } else if (result.getString("plan_id").equals(secondPlan)) {
                                secondSucceeded = result.getString("status").equals("SUCCEEDED")
                                        && result.getString("backing_status").equals("SETTLED");
                            }
                        }
                    }
                }
                String resultSql = "SELECT s.credits,s.security,s.threat,p.workforce_count,a.available_workforce,"
                        + "i.reserved,(SELECT COUNT(*) FROM station_change c JOIN faction_plan_event pe "
                        + "ON pe.event_id=c.event_id WHERE pe.plan_id IN (?,?) "
                        + "AND c.statistic_key='population.workforce_available' "
                        + "AND (c.resulting_value<0 OR c.resulting_value>p.workforce_count)) invalid_people "
                        + "FROM station_simulation_state s JOIN station_population_state p ON p.station_id=s.station_id "
                        + "JOIN station_faction_resource_availability a ON a.station_id=s.station_id "
                        + "JOIN station_inventory i ON i.station_id=s.station_id AND i.item_id='item-ammunition' "
                        + "WHERE s.station_id=?";
                try (PreparedStatement statement = connection.prepareStatement(resultSql)) {
                    statement.setString(1, firstPlan);
                    statement.setString(2, secondPlan);
                    statement.setString(3, stationId.toString());
                    try (ResultSet result = statement.executeQuery()) {
                        if (!result.next()) throw new IllegalStateException("Concurrent-plan result is missing.");
                        deterministicSettlement = firstFailed && secondSucceeded
                                && result.getInt("credits") == creditsBefore - 1_000
                                && result.getInt("security") == 45
                                && result.getInt("threat") == 32
                                && result.getInt("workforce_count") == 8
                                && result.getInt("available_workforce") == 8
                                && result.getInt("reserved") == ammunitionReservedBefore
                                && result.getInt("invalid_people") == 0;
                    }
                }
            } finally {
                connection.rollback();
            }
        }
        require(deterministicSettlement,
                "Concurrent defense plans double-assigned a workforce that could cover only one plan.");
    }

    private static void insertProbePlan(Connection connection, String planId, UUID worldId, UUID stationId,
                                        long tick, int creditsRequired, int creditsReserved,
                                        int personnelRequired, int personnelReserved,
                                        int equipmentRequired, int equipmentReserved) throws SQLException {
        String sql = "INSERT INTO faction_plan(plan_id,world_id,sponsor_faction,target_station_id,objective,phase,"
                + "status,created_tick,updated_tick,due_tick,credits_required,credits_reserved,credits_spent,"
                + "personnel_required,personnel_reserved,equipment_required,equipment_reserved) "
                + "VALUES (?,?, 'Verification Council',? ,?,'PREPARATION','ACTIVE',?,?,?,?,?,0,?,?,?,?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, planId);
            statement.setString(2, worldId.toString());
            statement.setString(3, stationId.toString());
            statement.setString(4, "Verify allocation integrity for " + planId);
            statement.setLong(5, tick);
            statement.setLong(6, tick);
            statement.setLong(7, tick);
            statement.setInt(8, creditsRequired);
            statement.setInt(9, creditsReserved);
            statement.setInt(10, personnelRequired);
            statement.setInt(11, personnelReserved);
            statement.setInt(12, equipmentRequired);
            statement.setInt(13, equipmentReserved);
            statement.executeUpdate();
        }
    }

    private static void insertProbeAllocation(Connection connection, String planId, UUID stationId,
                                              String type, String resourceId, int units, long tick)
            throws SQLException {
        String sql = "INSERT INTO faction_plan_resource_allocation(plan_id,source_station_id,resource_type,"
                + "resource_id,reserved_units,consumed_units,released_units,created_tick,updated_tick) "
                + "VALUES (?,?,?,?,?,0,0,?,?)";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, planId);
            statement.setString(2, stationId.toString());
            statement.setString(3, type);
            statement.setString(4, resourceId);
            statement.setInt(5, units);
            statement.setLong(6, tick);
            statement.setLong(7, tick);
            statement.executeUpdate();
        }
    }

    private static String planBacking(Connection connection, String planId) throws SQLException {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT backing_status FROM faction_plan_resource_balance WHERE plan_id=?")) {
            statement.setString(1, planId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new SQLException("Faction probe backing state is missing.");
                return result.getString(1);
            }
        }
    }

    private static void prepareEmigration(WorldPaths paths, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            execute(connection, "UPDATE station_simulation_state SET supplies=18,security=90,threat=5 "
                    + "WHERE station_id=?", stationId);
            execute(connection, "UPDATE station_inventory SET quantity=0,reserved=0 WHERE station_id=? "
                    + "AND item_id='item-rations'", stationId);
            execute(connection, "UPDATE station_civilization_state SET shortage_ticks=11,surplus_ticks=0,"
                    + "fauna_pressure=5 WHERE station_id=?", stationId);
        }
    }

    private static void prepareImmigration(WorldPaths paths, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            execute(connection, "UPDATE station_simulation_state SET supplies=180,security=90,integrity=95,threat=5 "
                    + "WHERE station_id=?", stationId);
            execute(connection, "UPDATE station_inventory SET quantity=120,reserved=0 WHERE station_id=? "
                    + "AND item_id='item-rations'", stationId);
            execute(connection, "UPDATE station_civilization_state SET shortage_ticks=0,surplus_ticks=15,"
                    + "civilization_strength=85,fauna_pressure=5 WHERE station_id=?", stationId);
        }
    }

    private static int ticksUntil(long currentTick, int divisor) {
        int ticks = 1;
        while (Math.floorMod(currentTick + ticks, divisor) != 0) ticks++;
        return ticks;
    }

    private static void prepareAbandonment(WorldPaths paths, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            execute(connection, "UPDATE station_civilization_state SET population_index=0,frontier_position=0,"
                    + "frontier_state='CONTRACTING',shortage_ticks=20 WHERE station_id=?", stationId);
        }
    }

    private static void execute(Connection connection, String sql, UUID stationId) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            statement.executeUpdate();
        }
    }

    private static FrontierState frontier(WorldPaths paths, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT population_index,civilization_strength,fauna_pressure,last_consumption,shortage_ticks,"
                             + "surplus_ticks,frontier_position,frontier_state,last_tick "
                             + "FROM station_civilization_state WHERE station_id=?")) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Station civilization state is missing.");
                return new FrontierState(result.getInt("population_index"),
                        result.getInt("civilization_strength"), result.getInt("fauna_pressure"),
                        result.getInt("last_consumption"), result.getInt("shortage_ticks"),
                        result.getInt("surplus_ticks"), result.getInt("frontier_position"),
                        result.getString("frontier_state"), result.getLong("last_tick"));
            }
        }
    }

    private static UUID station(WorldPaths paths, String sourceId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            return station(connection, sourceId);
        }
    }

    private static UUID station(Connection connection, String sourceId) throws Exception {
        try (PreparedStatement statement = connection.prepareStatement(
                "SELECT station_id FROM world_station WHERE source_station_id=?")) {
            statement.setString(1, sourceId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Fixture station is missing: " + sourceId);
                return UUID.fromString(result.getString(1));
            }
        }
    }

    private static long stationCount(WorldPaths paths, String table, UUID stationId) throws Exception {
        if (!java.util.Set.of("station_consumption_log", "civilization_frontier_event",
                "station_event", "station_causal_tick_baseline").contains(table)) {
            throw new IllegalArgumentException("Unsupported station history table.");
        }
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT COUNT(*) FROM " + table + " WHERE station_id=?")) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static PopulationState population(WorldPaths paths, UUID stationId) throws Exception {
        String sql = "SELECT baseline_kind,baseline_resident_count,resident_count,baseline_workforce_count,"
                + "workforce_count,last_tick "
                + "FROM station_population_state WHERE station_id=?";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Station population state is missing.");
                return new PopulationState(result.getString("baseline_kind"),
                        result.getInt("baseline_resident_count"),
                        result.getInt("resident_count"), result.getInt("baseline_workforce_count"),
                        result.getInt("workforce_count"), result.getLong("last_tick"));
            }
        }
    }

    private static long unexplainedConsumption(WorldPaths paths, UUID stationId) throws Exception {
        String sql = "SELECT COUNT(*) FROM station_consumption_log l LEFT JOIN station_event e "
                + "ON e.cause_type='CONSUMPTION_LOG' AND e.cause_id=l.consumption_id "
                + "WHERE l.station_id=? AND e.event_id IS NULL";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long causalChanges(WorldPaths paths, UUID stationId, String statisticKey) throws Exception {
        String sql = "SELECT COUNT(*) FROM station_change c JOIN station_event e ON e.event_id=c.event_id "
                + "WHERE e.station_id=? AND e.cause_type='CONSUMPTION_LOG' AND c.statistic_key=?";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            statement.setString(2, statisticKey);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long inconsistentCausalChanges(WorldPaths paths, UUID stationId) throws Exception {
        String sql = "SELECT COUNT(*) FROM station_change c JOIN station_event e ON e.event_id=c.event_id "
                + "WHERE e.station_id=? AND ABS((c.previous_value+c.delta_value)-c.resulting_value)>=0.000001";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static int distinctConsumption(WorldPaths paths, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT COUNT(DISTINCT required_units) FROM station_consumption_log WHERE station_id=?")) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getInt(1) : 0; }
        }
    }

    private static long eventCount(WorldPaths paths, UUID stationId, String eventType) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT COUNT(*) FROM civilization_frontier_event WHERE station_id=? AND event_type=?")) {
            statement.setString(1, stationId.toString());
            statement.setString(2, eventType);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static int unassignedDeliveryInventoryDelta(WorldPaths paths, UUID stationId) throws Exception {
        String sql = "SELECT c.delta_value FROM station_event e JOIN station_change c ON c.event_id=e.event_id "
                + "WHERE e.station_id=? AND e.cause_type='FREIGHT_LOT' AND e.actor_type='UNASSIGNED' "
                + "AND c.reason_code='FREIGHT_DELIVERY' ORDER BY e.tick_sequence DESC LIMIT 1";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getInt(1) : 0; }
        }
    }

    private static long frontierStoryCount(WorldPaths paths, UUID stationId, String frontierEventType)
            throws Exception {
        String condition = switch (frontierEventType) {
            case "MONSTER_ATTACK" -> "t.attack_detected=1 AND e.event_type='ATTACK' AND e.actor_type='FAUNA'";
            case "RECOVERY" -> "e.event_type='RECOVERY'";
            case "EXPANSION" -> "e.event_type='FRONTIER_CHANGE' AND t.frontier_state_after='EXPANDING'";
            case "CONTRACTION" -> "e.event_type='FRONTIER_CHANGE' AND t.frontier_state_after='CONTRACTING'";
            case "ABANDONMENT" -> "e.event_type='FRONTIER_CHANGE' AND t.frontier_state_after='ABANDONED'";
            default -> throw new IllegalArgumentException("Unsupported frontier story type.");
        };
        String sql = "SELECT COUNT(*) FROM station_event e JOIN station_frontier_transition t "
                + "ON t.event_id=e.event_id WHERE e.station_id=? AND " + condition;
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long frontierBaselineCount(WorldPaths paths, UUID stationId) throws Exception {
        String sql = "SELECT COUNT(*) FROM station_frontier_tick_baseline WHERE station_id=?";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long populationBaselineCount(WorldPaths paths, UUID stationId) throws Exception {
        String sql = "SELECT COUNT(*) FROM station_population_tick_baseline WHERE station_id=?";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long populationEventCount(WorldPaths paths, UUID stationId, String category) throws Exception {
        if (!java.util.Set.of("EMIGRATION", "IMMIGRATION", "ATTACK_CASUALTIES", "EVACUATION").contains(category)) {
            throw new IllegalArgumentException("Unsupported population category.");
        }
        String sql = "SELECT COUNT(*) FROM station_population_event p JOIN station_event e ON e.event_id=p.event_id "
                + "WHERE e.station_id=? AND p.population_category=?";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            statement.setString(2, category);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static int latestPopulationDelta(WorldPaths paths, UUID stationId, String category) throws Exception {
        if (!java.util.Set.of("EMIGRATION", "IMMIGRATION").contains(category)) {
            throw new IllegalArgumentException("Unsupported population movement category.");
        }
        String sql = "SELECT p.people_delta FROM station_population_event p "
                + "JOIN station_event e ON e.event_id=p.event_id WHERE e.station_id=? "
                + "AND p.population_category=? ORDER BY e.tick_sequence DESC LIMIT 1";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            statement.setString(2, category);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Population movement evidence is missing.");
                return result.getInt(1);
            }
        }
    }

    private static long populationEvidenceCount(WorldPaths paths, UUID stationId) throws Exception {
        String sql = "SELECT COUNT(*) FROM station_population_event p JOIN station_event e ON e.event_id=p.event_id "
                + "WHERE e.station_id=?";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long populationStoryCount(WorldPaths paths, UUID stationId) throws Exception {
        String sql = "SELECT COUNT(*) FROM station_population_story WHERE station_id=?";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long populationCoverageGap(WorldPaths paths, UUID stationId) throws Exception {
        String sql = "SELECT ABS(unexplained_resident_delta)+ABS(unexplained_workforce_delta) "
                + "FROM station_population_coverage WHERE station_id=?";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : -1; }
        }
    }

    private static long inconsistentPopulationChanges(WorldPaths paths, UUID stationId) throws Exception {
        String sql = "SELECT COUNT(*) FROM station_population_event p JOIN station_event e ON e.event_id=p.event_id "
                + "LEFT JOIN station_change residents ON residents.event_id=e.event_id "
                + "AND residents.statistic_key='population.residents' "
                + "WHERE e.station_id=? AND (p.people_before+p.people_delta<>p.people_after "
                + "OR residents.change_id IS NULL OR residents.previous_value<>p.people_before "
                + "OR residents.delta_value<>p.people_delta OR residents.resulting_value<>p.people_after)";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static FactionPlanState factionPlan(WorldPaths paths, UUID stationId, long attackTick) throws Exception {
        String planId = stationId + ":defense-plan:" + attackTick;
        String sql = "SELECT p.plan_id,p.phase,p.status,p.credits_spent,b.backing_status,"
                + "b.outstanding_credits,b.outstanding_personnel,b.outstanding_equipment,"
                + "(SELECT COUNT(*) FROM faction_plan_event pe WHERE pe.plan_id=p.plan_id) story_count "
                + "FROM faction_plan p JOIN faction_plan_resource_balance b ON b.plan_id=p.plan_id "
                + "WHERE p.plan_id=?";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, planId);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Faction defense plan is missing: " + planId);
                return new FactionPlanState(result.getString("plan_id"), result.getString("phase"),
                        result.getString("status"), result.getString("backing_status"),
                        result.getInt("outstanding_credits"), result.getInt("outstanding_personnel"),
                        result.getInt("outstanding_equipment"), result.getInt("credits_spent"),
                        result.getInt("story_count"));
            }
        }
    }

    private static boolean defensePlanHasMonsterAttackSource(WorldPaths paths, String planId) throws Exception {
        String sql = "SELECT COUNT(*) FROM faction_plan_event pe JOIN station_event e ON e.event_id=pe.event_id "
                + "JOIN civilization_frontier_event f ON f.event_id=e.cause_id "
                + "WHERE pe.plan_id=? AND pe.plan_phase='PREPARATION' "
                + "AND e.cause_type='MONSTER_ATTACK' AND f.event_type='MONSTER_ATTACK'";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, planId);
            try (ResultSet result = statement.executeQuery()) { return result.next() && result.getInt(1) == 1; }
        }
    }

    private static int factionPlanTreasuryDelta(WorldPaths paths, String planId) throws Exception {
        String sql = "SELECT COALESCE(SUM(credits_delta),0) FROM treasury_transaction "
                + "WHERE counterparty_type='FACTION_PLAN' AND counterparty_id=?";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, planId);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getInt(1) : 0; }
        }
    }

    private static long inconsistentFactionChanges(WorldPaths paths, String planId) throws Exception {
        String sql = "SELECT COUNT(*) FROM faction_plan_event pe JOIN station_change c ON c.event_id=pe.event_id "
                + "WHERE pe.plan_id=? AND ABS((c.previous_value+c.delta_value)-c.resulting_value)>=0.000001";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, planId);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long transactionContextCount(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT COUNT(*) FROM simulation_transaction_context")) {
            return result.next() ? result.getLong(1) : 0;
        }
    }

    private static long commandSourceCount(WorldPaths paths, UUID stationId) throws Exception {
        String sql = "SELECT COUNT(*) FROM station_event_command_history WHERE station_id=?";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long invalidCommandSourceCount(WorldPaths paths, UUID stationId) throws Exception {
        String sql = "SELECT COUNT(*) FROM station_event_command_history WHERE station_id=? "
                + "AND (tick_sequence<>linked_tick OR linked_tick<=before_tick_sequence "
                + "OR linked_tick>after_tick_sequence OR command_id IS NULL OR linked_canonical IS NULL)";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long unlinkedPassiveStoryCount(WorldPaths paths, UUID stationId) throws Exception {
        String sql = "SELECT COUNT(*) FROM station_event e LEFT JOIN station_event_command_source s "
                + "ON s.event_id=e.event_id WHERE e.station_id=? AND s.event_id IS NULL AND ("
                + "e.cause_type IN ('CONSUMPTION_LOG','PRODUCTION_RUN','FRONTIER_TICK','MONSTER_ATTACK',"
                + "'POPULATION_EVACUATION','FACTION_PLAN') OR e.event_type='FACTION_PLAN')";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long directDeliveryCommandSourceCount(WorldPaths paths, UUID stationId) throws Exception {
        String sql = "SELECT COUNT(*) FROM station_event e JOIN station_event_command_source s ON s.event_id=e.event_id "
                + "WHERE e.station_id=? AND e.cause_type='FREIGHT_LOT' AND e.actor_type='UNASSIGNED'";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long mutationCoverageCount(WorldPaths paths, UUID stationId) throws Exception {
        String sql = "SELECT COUNT(*) FROM station_mutation_coverage WHERE station_id=? "
                + "AND statistic_key IN ('population.residents','population.workforce')";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long unexplainedMutationCount(WorldPaths paths, UUID stationId) throws Exception {
        String sql = "SELECT COUNT(*) FROM unexplained_station_mutation WHERE station_id=? "
                + "AND enforcement='ENFORCE'";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static void verifyUnexplainedMutationIsRejected(WorldPaths paths, UUID stationId) throws Exception {
        int residentsBefore = population(paths, stationId).residents();
        boolean rejected = false;
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            try (Statement configure = connection.createStatement()) { configure.execute("PRAGMA foreign_keys=ON"); }
            CommandContextSeed seed = commandContextSeed(connection, stationId);
            connection.setAutoCommit(false);
            insertContext(connection, seed, "coverage-gate-verification");
            try (PreparedStatement mutation = connection.prepareStatement(
                    "UPDATE station_population_state SET resident_count=resident_count+1 WHERE station_id=?")) {
                mutation.setString(1, stationId.toString());
                mutation.executeUpdate();
            }
            try {
                PassiveWorldTickTransaction.enforceStationMutationCoverage(connection, seed.commandId());
            } catch (java.sql.SQLException expected) {
                rejected = expected.getMessage().contains("Unexplained station mutation blocked commit");
            } finally {
                connection.rollback();
            }
        }
        require(rejected, "The enforced mutation gate accepted an unexplained resident change.");
        require(population(paths, stationId).residents() == residentsBefore && transactionContextCount(paths) == 0,
                "Rejected mutation-gate verification leaked population state or transaction context.");
    }

    private static void verifyMisalignedMutationIsCapturedAndRejected(WorldPaths paths, UUID stationId)
            throws Exception {
        int residentsBefore = population(paths, stationId).residents();
        boolean captured = false;
        boolean rejected = false;
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            try (Statement configure = connection.createStatement()) { configure.execute("PRAGMA foreign_keys=ON"); }
            CommandContextSeed seed = commandContextSeed(connection, stationId);
            connection.setAutoCommit(false);
            insertContext(connection, seed, "tick-alignment-gate-verification");
            try (PreparedStatement mutation = connection.prepareStatement(
                    "UPDATE station_population_state SET resident_count=resident_count+1,last_tick=last_tick+1 "
                            + "WHERE station_id=?")) {
                mutation.setString(1, stationId.toString());
                mutation.executeUpdate();
            }
            String coverageSql = "SELECT minimum_observed_state_tick,maximum_observed_state_tick "
                    + "FROM station_mutation_coverage WHERE command_id=? AND station_id=? AND tick_sequence=? "
                    + "AND statistic_key='population.residents'";
            try (PreparedStatement coverage = connection.prepareStatement(coverageSql)) {
                coverage.setString(1, seed.commandId().toString());
                coverage.setString(2, stationId.toString());
                coverage.setLong(3, seed.linkedTick());
                try (ResultSet result = coverage.executeQuery()) {
                    captured = result.next()
                            && (result.getLong("minimum_observed_state_tick") != seed.linkedTick()
                            || result.getLong("maximum_observed_state_tick") != seed.linkedTick());
                }
            }
            try {
                PassiveWorldTickTransaction.enforceStationMutationCoverage(connection, seed.commandId());
            } catch (java.sql.SQLException expected) {
                rejected = expected.getMessage().contains("Station mutation tick mismatch blocked commit");
            } finally {
                connection.rollback();
            }
        }
        require(captured, "A population mutation with stale last_tick escaped command-scoped capture.");
        require(rejected, "The mutation gate accepted a population change with stale last_tick.");
        require(population(paths, stationId).residents() == residentsBefore && transactionContextCount(paths) == 0,
                "Rejected tick-alignment verification leaked population state or transaction context.");
    }

    private static void verifyMismatchedCommandContextIsRejected(WorldPaths paths, UUID stationId)
            throws Exception {
        boolean wrongSequenceRejected;
        boolean wrongRangeRejected;
        boolean wrongWorldRejected;
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            try (Statement configure = connection.createStatement()) { configure.execute("PRAGMA foreign_keys=ON"); }
            CommandContextSeed seed = commandContextSeed(connection, stationId);
            connection.setAutoCommit(false);
            wrongSequenceRejected = contextInsertRejected(connection,
                    new CommandContextSeed(seed.worldId(), seed.commandId(), seed.sequence() + 1,
                            seed.beforeTick(), seed.afterTick(), seed.linkedTick(), seed.linkedCanonical()));
            wrongRangeRejected = contextInsertRejected(connection,
                    new CommandContextSeed(seed.worldId(), seed.commandId(), seed.sequence(),
                            seed.beforeTick(), seed.afterTick() + 1, seed.linkedTick(), seed.linkedCanonical()));

            String otherWorldId = UUID.nameUUIDFromBytes((stationId + ":context-world").getBytes(StandardCharsets.UTF_8))
                    .toString();
            UUID otherCommandId = UUID.nameUUIDFromBytes(
                    (stationId + ":context-command").getBytes(StandardCharsets.UTF_8));
            try (PreparedStatement world = connection.prepareStatement(
                    "INSERT INTO world_metadata(world_id,display_name,created_at) VALUES (?,'Context Guard World',?)")) {
                world.setString(1, otherWorldId);
                world.setString(2, "context-guard-verification");
                world.executeUpdate();
            }
            String receiptSql = "INSERT INTO simulation_command_receipt(command_id,world_id,execution_sequence,"
                    + "actor,command,submitted_at,completed_at,writer_thread_id,before_canonical_time,"
                    + "before_tick_sequence,before_simulation_enabled,before_scheduler_state,after_canonical_time,"
                    + "after_tick_sequence,after_simulation_enabled,after_scheduler_state,catch_up_applied_ticks,"
                    + "catch_up_remaining_ticks,catch_up_complete) SELECT ?,?,1,actor,'PASSIVE_CONTEXT_GUARD_TEST',"
                    + "submitted_at,completed_at,writer_thread_id,before_canonical_time,before_tick_sequence,"
                    + "before_simulation_enabled,before_scheduler_state,after_canonical_time,after_tick_sequence,"
                    + "after_simulation_enabled,after_scheduler_state,catch_up_applied_ticks,catch_up_remaining_ticks,"
                    + "catch_up_complete FROM simulation_command_receipt WHERE command_id=?";
            try (PreparedStatement receipt = connection.prepareStatement(receiptSql)) {
                receipt.setString(1, otherCommandId.toString());
                receipt.setString(2, otherWorldId);
                receipt.setString(3, seed.commandId().toString());
                if (receipt.executeUpdate() != 1) throw new IllegalStateException("Context guard receipt was not seeded.");
            }
            wrongWorldRejected = contextInsertRejected(connection,
                    new CommandContextSeed(seed.worldId(), otherCommandId, 1, seed.beforeTick(),
                            seed.afterTick(), seed.linkedTick(), seed.linkedCanonical()));
            connection.rollback();
        }
        require(wrongSequenceRejected && wrongRangeRejected && wrongWorldRejected,
                "A simulation context accepted a receipt with a mismatched world, sequence, or tick range.");
        require(transactionContextCount(paths) == 0,
                "Command-context guard verification leaked a transaction context.");
    }

    private static CommandContextSeed commandContextSeed(Connection connection, UUID stationId) throws Exception {
        String sql = "SELECT world_id,command_id,execution_sequence,before_tick_sequence,after_tick_sequence,"
                + "linked_tick,linked_canonical FROM station_event_command_history WHERE station_id=? "
                + "AND linked_tick=(SELECT last_tick FROM station_population_state WHERE station_id=?) "
                + "ORDER BY linked_tick DESC,event_id LIMIT 1";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            statement.setString(2, stationId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("No command source is available for gate verification.");
                return new CommandContextSeed(result.getString("world_id"),
                        UUID.fromString(result.getString("command_id")), result.getLong("execution_sequence"),
                        result.getLong("before_tick_sequence"), result.getLong("after_tick_sequence"),
                        result.getLong("linked_tick"), result.getString("linked_canonical"));
            }
        }
    }

    private static void insertContext(Connection connection, CommandContextSeed seed, String openedAt)
            throws Exception {
        try (PreparedStatement context = connection.prepareStatement(
                "INSERT INTO simulation_transaction_context(world_id,command_id,execution_sequence,before_tick,"
                        + "after_tick,current_tick,current_canonical,context_kind,opened_at) "
                        + "VALUES (?,?,?,?,?,?,?,'PASSIVE_TICK',?)")) {
            context.setString(1, seed.worldId());
            context.setString(2, seed.commandId().toString());
            context.setLong(3, seed.sequence());
            context.setLong(4, seed.beforeTick());
            context.setLong(5, seed.afterTick());
            context.setLong(6, seed.linkedTick());
            context.setString(7, seed.linkedCanonical());
            context.setString(8, openedAt);
            context.executeUpdate();
        }
    }

    private static boolean contextInsertRejected(Connection connection, CommandContextSeed seed) throws Exception {
        try {
            insertContext(connection, seed, "receipt-guard-verification");
            try (PreparedStatement cleanup = connection.prepareStatement(
                    "DELETE FROM simulation_transaction_context WHERE world_id=?")) {
                cleanup.setString(1, seed.worldId());
                cleanup.executeUpdate();
            }
            return false;
        } catch (java.sql.SQLException expected) {
            return expected.getMessage().contains("does not match its command receipt");
        }
    }

    private static long inconsistentFrontierChanges(WorldPaths paths, UUID stationId) throws Exception {
        String sql = "SELECT COUNT(*) FROM station_change c JOIN station_event e ON e.event_id=c.event_id "
                + "WHERE e.station_id=? AND e.cause_type IN ('FRONTIER_TICK','FRONTIER_TRANSITION') "
                + "AND ABS((c.previous_value+c.delta_value)-c.resulting_value)>=0.000001";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long frontierStoryMultiplicityFailures(WorldPaths paths, UUID stationId) throws Exception {
        String sql = "SELECT COUNT(*) FROM (SELECT tick_sequence,COUNT(*) stories FROM station_event "
                + "WHERE station_id=? AND cause_type='FRONTIER_TICK' GROUP BY tick_sequence HAVING stories<>1)";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static long frontierTypedChange(WorldPaths paths, UUID stationId, String eventType,
                                            String statisticKey, String reasonCode) throws Exception {
        String sql = "SELECT COUNT(*) FROM station_change c JOIN station_event e ON e.event_id=c.event_id "
                + "WHERE e.station_id=? AND e.event_type=? AND e.cause_type IN ('FRONTIER_TICK','FRONTIER_TRANSITION') "
                + "AND c.statistic_key=? AND c.reason_code=?";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            statement.setString(2, eventType);
            statement.setString(3, statisticKey);
            statement.setString(4, reasonCode);
            try (ResultSet result = statement.executeQuery()) { return result.next() ? result.getLong(1) : 0; }
        }
    }

    private static boolean eventAtTick(WorldPaths paths, UUID stationId, String eventType, long tick)
            throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT 1 FROM civilization_frontier_event WHERE station_id=? AND event_type=? "
                             + "AND tick_sequence=?")) {
            statement.setString(1, stationId.toString());
            statement.setString(2, eventType);
            statement.setLong(3, tick);
            try (ResultSet result = statement.executeQuery()) { return result.next(); }
        }
    }

    private static boolean openDefenseMission(WorldPaths paths, UUID stationId) throws Exception {
        return openMission(paths, stationId, "'FAUNA_CLEARING','DEFENSE'");
    }

    private static boolean openExpansionMission(WorldPaths paths, UUID stationId) throws Exception {
        return openMission(paths, stationId, "'TRANSIT','RESEARCH'");
    }

    private static boolean openMission(WorldPaths paths, UUID stationId, String types) throws Exception {
        String sql = "SELECT 1 FROM world_mission WHERE origin_station_id=? AND mission_type IN (" + types + ") "
                + "AND status IN ('AVAILABLE','ASSIGNED','ACTIVE') LIMIT 1";
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) { return result.next(); }
        }
    }

    private static boolean frontierMissionIdsAreUuids(WorldPaths paths, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT mission_id FROM world_mission WHERE origin_station_id=? "
                             + "AND mission_type IN ('FAUNA_CLEARING','DEFENSE','TRANSIT','RESEARCH')")) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) {
                boolean found = false;
                while (result.next()) {
                    UUID.fromString(result.getString(1));
                    found = true;
                }
                return found;
            }
        } catch (IllegalArgumentException invalidUuid) {
            return false;
        }
    }

    private static int stationSupplies(WorldPaths paths, UUID stationId) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             PreparedStatement statement = connection.prepareStatement(
                     "SELECT supplies FROM station_simulation_state WHERE station_id=?")) {
            statement.setString(1, stationId.toString());
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Station simulation state is missing.");
                return result.getInt(1);
            }
        }
    }

    private static long currentTick(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database())) {
            return currentTick(connection);
        }
    }

    private static long currentTick(Connection connection) throws Exception {
        try (Statement statement = connection.createStatement(); ResultSet result = statement.executeQuery(
                "SELECT COALESCE(current_tick_sequence,imported_tick_sequence) "
                        + "FROM world_simulation_metadata LIMIT 1")) {
            if (!result.next()) throw new IllegalStateException("World clock is missing.");
            return result.getLong(1);
        }
    }

    private static String worldId(Connection connection) throws Exception {
        try (Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT world_id FROM world_metadata LIMIT 1")) {
            if (!result.next()) throw new IllegalStateException("World metadata is missing.");
            return result.getString(1);
        }
    }

    private static int schemaVersion(WorldPaths paths) throws Exception {
        try (Connection connection = DriverManager.getConnection("jdbc:sqlite:" + paths.database());
             Statement statement = connection.createStatement();
             ResultSet result = statement.executeQuery("SELECT MAX(version) FROM schema_migration")) {
            return result.next() ? result.getInt(1) : 0;
        }
    }

    private static String fixture() {
        return """
                {"version":22,"exportedAt":"2026-07-18T12:00:00Z","masterWorldId":"FRONTIER-WORLD",
                "worldEconomyVersion":"1.0.0","worldStateSchemaVersion":"2.2.0","state":{
                "world":{"canonicalTime":"2175-01-01T00:00:00Z","realEpoch":"2026-06-20T08:00:00Z",
                "map":{"rings":48,"shellRadius":7008,"nodes":[
                {"id":"station-a","name":"Frontier Station","ring":42,"level":4,"type":"station","x":20,"y":30},
                {"id":"station-b","name":"Supply Station","ring":47,"level":1,"type":"station","x":80,"y":40},
                {"id":"station-c","name":"Generated Station","ring":45,"level":2,"type":"station","x":140,"y":55},
                {"id":"deep-a","name":"Fauna Trench","ring":18,"level":9,"type":"location","x":260,"y":180}]}},
                "worldEconomy":{"vessels":{},"stationEconomies":{"station-a":{},"station-b":{},"station-c":{}},
                "simulation":{"tickSequence":30,"lastSimulatedAt":"2175-01-01T00:00:00Z"}},
                "submarine":{"name":"Observer","model":"Barsuk","crewRoster":[]}}}
                """;
    }

    private static void require(boolean condition, String message) {
        if (!condition) throw new IllegalStateException(message);
    }

    private record FrontierState(int populationIndex, int civilizationStrength, int faunaPressure,
                                 int lastConsumption, int shortageTicks, int surplusTicks,
                                 int frontierPosition, String frontierState, long lastTick) { }

    private record PopulationState(String baselineKind, int baselineResidents, int residents, int baselineWorkforce,
                                   int workforce, long lastTick) { }

    private record FactionPlanState(String planId, String phase, String status, String backingStatus,
                                    int outstandingCredits, int outstandingPersonnel,
                                    int outstandingEquipment, int creditsSpent, int storyCount) { }

    private record CommandContextSeed(String worldId, UUID commandId, long sequence, long beforeTick,
                                      long afterTick, long linkedTick, String linkedCanonical) { }

    public static void main(String[] args) throws Exception {
        verifyContract();
        System.out.println("Barotrauma station consumption and civilization frontier contracts passed.");
    }
}
