package io.github.mrcalzon02.barotrauma.desktop.logistics;

import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.persistence.PlayerVesselTransitTransaction;
import io.github.mrcalzon02.barotrauma.persistence.StationLogisticsRegistry;
import io.github.mrcalzon02.barotrauma.persistence.WorldMapRegistry;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;
import io.github.mrcalzon02.barotrauma.persistence.WorldVesselRegistry;
import io.github.mrcalzon02.barotrauma.simulation.TransitResolutionEngine.MissionType;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.SwingUtilities;
import javax.swing.SwingWorker;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.nio.file.Path;
import java.util.UUID;
import java.util.concurrent.ExecutionException;

/** Explicit route and challenge console for imported physical player vessels. */
public final class PlayerVesselTransitWindow extends JFrame {
    private final DesktopWorldSession session = DesktopWorldSession.global();
    private final JLabel worldStatus = new JLabel("No desktop world open");
    private final JLabel operationStatus = new JLabel("Ready");
    private final JLabel vesselStatus = new JLabel("Select an imported vessel");
    private final JComboBox<VesselChoice> vesselChoice = new JComboBox<>();
    private final JComboBox<LocationChoice> startChoice = new JComboBox<>();
    private final JComboBox<LocationChoice> destinationChoice = new JComboBox<>();
    private final JComboBox<MissionType> missionChoice = new JComboBox<>(MissionType.values());
    private final JButton openWorldButton = new JButton("Open World");
    private final JButton refreshButton = new JButton("Refresh");
    private final JButton enrollButton = new JButton("Enroll at Start");
    private final JButton planButton = new JButton("Plan Route");
    private final JButton resolveButton = new JButton("Resolve Next Challenge");
    private final JButton dockButton = new JButton("Dock");
    private final JTextArea voyage = new JTextArea();

    private WorldPaths world;
    private Path lastDirectory;
    private AutoCloseable sessionSubscription;
    private StationLogisticsRegistry.Snapshot logistics;
    private boolean busy;

    public PlayerVesselTransitWindow() {
        super("Barotrauma Imported Player Vessel Transit");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(1050, 680));
        setSize(1350, 820);
        setLocationByPlatform(true);
        setLayout(new BorderLayout(10, 10));

        JPanel header = new JPanel(new BorderLayout(12, 8));
        header.setBorder(BorderFactory.createEmptyBorder(12, 12, 0, 12));
        JPanel state = new JPanel(new BorderLayout(4, 4));
        state.add(worldStatus, BorderLayout.NORTH);
        state.add(vesselStatus, BorderLayout.SOUTH);
        header.add(state, BorderLayout.WEST);
        header.add(operationStatus, BorderLayout.EAST);
        add(header, BorderLayout.NORTH);

        voyage.setEditable(false);
        voyage.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 13));
        voyage.setText("Open a normalized world, select an imported physical vessel, and enroll it at a location.\n"
                + "Player and NPC voyages call the same deterministic transit challenge resolver.\n");
        add(new JScrollPane(voyage), BorderLayout.CENTER);

        JPanel route = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        route.add(new JLabel("Vessel:"));
        route.add(vesselChoice);
        route.add(new JLabel("Start:"));
        route.add(startChoice);
        route.add(enrollButton);
        route.add(new JLabel("Destination:"));
        route.add(destinationChoice);
        route.add(new JLabel("Context:"));
        route.add(missionChoice);
        route.add(planButton);

        JPanel actions = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        actions.add(resolveButton);
        actions.add(dockButton);
        actions.add(refreshButton);
        actions.add(openWorldButton);

        JPanel footer = new JPanel(new BorderLayout(8, 8));
        footer.setBorder(BorderFactory.createEmptyBorder(0, 12, 12, 12));
        footer.add(route, BorderLayout.NORTH);
        footer.add(actions, BorderLayout.SOUTH);
        add(footer, BorderLayout.SOUTH);

        openWorldButton.addActionListener(event -> chooseWorld());
        refreshButton.addActionListener(event -> refresh());
        enrollButton.addActionListener(event -> enroll());
        planButton.addActionListener(event -> planRoute());
        resolveButton.addActionListener(event -> resolveChallenge());
        dockButton.addActionListener(event -> dock());
        vesselChoice.addActionListener(event -> renderSelectedVessel());
        sessionSubscription = session.addListener(this::activateWorld, true);
        refreshControls();
    }

    private void chooseWorld() {
        JFileChooser chooser = lastDirectory == null ? new JFileChooser() : new JFileChooser(lastDirectory.toFile());
        chooser.setDialogTitle("Open an existing Barotrauma desktop world");
        chooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
        chooser.setAcceptAllFileFilterUsed(false);
        if (chooser.showOpenDialog(this) != JFileChooser.APPROVE_OPTION) return;
        try {
            session.activate(WorldStorageContracts.openWorld(chooser.getSelectedFile().toPath()));
        } catch (Exception exception) {
            showFailure("World open failed", exception);
        }
    }

    private void activateWorld(WorldPaths selectedWorld) {
        world = selectedWorld;
        logistics = null;
        vesselChoice.removeAllItems();
        startChoice.removeAllItems();
        destinationChoice.removeAllItems();
        if (selectedWorld == null) {
            worldStatus.setText("No desktop world open");
            vesselStatus.setText("Select an imported vessel");
            refreshControls();
            return;
        }
        lastDirectory = selectedWorld.root().getParent();
        worldStatus.setText("Shared world: " + selectedWorld.root());
        refresh();
    }

    private void refresh() {
        WorldPaths selectedWorld = world;
        if (selectedWorld == null || busy) return;
        UUID selected = selectedVesselId();
        setBusy(true, "Loading imported vessels and world routes…");
        new SwingWorker<Loaded, Void>() {
            @Override protected Loaded doInBackground() throws Exception {
                return new Loaded(WorldVesselRegistry.load(selectedWorld), WorldMapRegistry.load(selectedWorld),
                        StationLogisticsRegistry.load(selectedWorld));
            }
            @Override protected void done() {
                try {
                    Loaded loaded = get();
                    if (!selectedWorld.equals(world)) return;
                    populate(loaded, selected);
                    operationStatus.setText("Player transit registry loaded");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Transit refresh interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Transit refresh failed", cause(exception));
                } finally {
                    setBusy(false, operationStatus.getText());
                }
            }
        }.execute();
    }

    private void populate(Loaded loaded, UUID preserveVessel) {
        logistics = loaded.logistics();
        vesselChoice.removeAllItems();
        for (WorldVesselRegistry.VesselRow vessel : loaded.vessels().vessels()) {
            if (vessel.retiredAt() == null) vesselChoice.addItem(new VesselChoice(vessel.vesselId(), vessel.displayName()));
        }
        startChoice.removeAllItems();
        destinationChoice.removeAllItems();
        for (WorldMapRegistry.LocationRow location : loaded.world().locations()) {
            LocationChoice choice = new LocationChoice(location.locationId(), location.displayName(),
                    location.ring(), location.locationLevel(), location.station());
            startChoice.addItem(choice);
            destinationChoice.addItem(choice);
        }
        if (preserveVessel != null) selectVessel(preserveVessel);
        renderSelectedVessel();
    }

    private void enroll() {
        VesselChoice vessel = (VesselChoice) vesselChoice.getSelectedItem();
        LocationChoice start = (LocationChoice) startChoice.getSelectedItem();
        if (vessel == null || start == null || world == null) return;
        runMutation("Enrolling imported vessel…", () ->
                PlayerVesselTransitTransaction.enroll(world, vessel.id(), start.id(), "desktop-user"));
    }

    private void planRoute() {
        VesselChoice vessel = (VesselChoice) vesselChoice.getSelectedItem();
        LocationChoice destination = (LocationChoice) destinationChoice.getSelectedItem();
        MissionType mission = (MissionType) missionChoice.getSelectedItem();
        if (vessel == null || destination == null || mission == null || world == null) return;
        runMutation("Planning player route…", () ->
                PlayerVesselTransitTransaction.planRoute(world, vessel.id(), destination.id(), mission, "desktop-user"));
    }

    private void resolveChallenge() {
        VesselChoice vessel = (VesselChoice) vesselChoice.getSelectedItem();
        if (vessel == null || world == null) return;
        runMutation("Resolving shared transit challenge…", () ->
                PlayerVesselTransitTransaction.resolveNextChallenge(world, vessel.id(), "desktop-user"));
    }

    private void dock() {
        VesselChoice vessel = (VesselChoice) vesselChoice.getSelectedItem();
        if (vessel == null || world == null) return;
        runMutation("Completing docking procedures…", () ->
                PlayerVesselTransitTransaction.dock(world, vessel.id(), "desktop-user"));
    }

    private void runMutation(String message, CheckedAction action) {
        if (busy) return;
        setBusy(true, message);
        new SwingWorker<Object, Void>() {
            @Override protected Object doInBackground() throws Exception { return action.run(); }
            @Override protected void done() {
                try {
                    Object result = get();
                    operationStatus.setText(result instanceof PlayerVesselTransitTransaction.TransitResult transit
                            ? "Transit resolved: " + transit.resolution().outcome()
                            : "Player vessel operation committed");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Player vessel operation interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Player vessel operation failed", cause(exception));
                } finally {
                    setBusy(false, operationStatus.getText());
                    refresh();
                }
            }
        }.execute();
    }

    private void renderSelectedVessel() {
        StationLogisticsRegistry.Snapshot snapshot = logistics;
        UUID selected = selectedVesselId();
        if (snapshot == null || selected == null) {
            vesselStatus.setText("Select an imported vessel");
            refreshControls();
            return;
        }
        StationLogisticsRegistry.PlayerVesselRow state = snapshot.playerVessels().stream()
                .filter(row -> row.vesselId().equals(selected)).findFirst().orElse(null);
        StringBuilder text = new StringBuilder();
        if (state == null) {
            vesselStatus.setText("Not enrolled · choose a start location");
            text.append("This imported physical vessel has no live route state yet.\n")
                    .append("Select its starting location and choose Enroll at Start.\n");
        } else {
            vesselStatus.setText(state.status() + " · " + state.currentLocationName()
                    + (state.destinationLocationName() == null ? "" : " → " + state.destinationLocationName()));
            text.append(state.displayName()).append(" · ").append(state.status()).append('\n')
                    .append("Hull ").append(state.hull()).append("% · Supplies ").append(state.supplies())
                    .append(" · Cargo ").append(state.cargo()).append('\n')
                    .append("Current: ").append(state.currentLocationName()).append('\n')
                    .append("Destination: ").append(blank(state.destinationLocationName())).append('\n')
                    .append("Route: ").append(state.routeProgress()).append('/').append(state.routeTicksRequired())
                    .append(" · actions ").append(state.routeActionSequence()).append('\n')
                    .append("Context: ").append(state.missionType()).append('\n')
                    .append("Crew/Nav/Eng/Combat: ").append(state.crewQuality()).append('/')
                    .append(state.navigation()).append('/').append(state.engineering()).append('/')
                    .append(state.combat()).append("\n\n");
            for (StationLogisticsRegistry.PlayerLogRow log : snapshot.playerLogs()) {
                if (!log.vesselId().equals(selected)) continue;
                text.append('[').append(log.canonicalTime()).append(" · tick ").append(log.tickSequence())
                        .append(" · action ").append(log.actionSequence()).append("] ")
                        .append(log.eventType()).append(" · severity ").append(log.severity()).append('\n')
                        .append(log.summary()).append('\n').append(log.details()).append('\n')
                        .append("Resolution: ").append(log.resolution())
                        .append(" · hull ").append(signed(log.hullDelta()))
                        .append(" · supplies ").append(signed(log.suppliesDelta())).append("\n\n");
            }
        }
        voyage.setText(text.toString());
        voyage.setCaretPosition(0);
        refreshControls();
    }

    private void selectVessel(UUID vesselId) {
        for (int index = 0; index < vesselChoice.getItemCount(); index++) {
            if (vesselChoice.getItemAt(index).id().equals(vesselId)) {
                vesselChoice.setSelectedIndex(index);
                return;
            }
        }
    }

    private UUID selectedVesselId() {
        VesselChoice selected = (VesselChoice) vesselChoice.getSelectedItem();
        return selected == null ? null : selected.id();
    }

    private void setBusy(boolean value, String message) {
        busy = value;
        operationStatus.setText(message);
        refreshControls();
    }

    private void refreshControls() {
        boolean ready = !busy && world != null && vesselChoice.getSelectedItem() != null;
        UUID selected = selectedVesselId();
        StationLogisticsRegistry.PlayerVesselRow state = logistics == null || selected == null ? null
                : logistics.playerVessels().stream().filter(row -> row.vesselId().equals(selected)).findFirst().orElse(null);
        openWorldButton.setEnabled(!busy);
        refreshButton.setEnabled(!busy && world != null);
        vesselChoice.setEnabled(!busy && world != null);
        startChoice.setEnabled(ready && state == null);
        enrollButton.setEnabled(ready && state == null);
        destinationChoice.setEnabled(ready && state != null
                && (state.status().equals("DOCKED") || state.status().equals("ARRIVED")));
        missionChoice.setEnabled(destinationChoice.isEnabled());
        planButton.setEnabled(destinationChoice.isEnabled());
        resolveButton.setEnabled(ready && state != null && state.status().equals("IN_TRANSIT"));
        dockButton.setEnabled(ready && state != null && state.status().equals("ARRIVED"));
    }

    private void showFailure(String title, Throwable throwable) {
        operationStatus.setText(title);
        voyage.append("\n" + title + "\n" + throwable.getClass().getSimpleName() + ": " + throwable.getMessage() + "\n");
        JOptionPane.showMessageDialog(this, throwable.getMessage(), title, JOptionPane.ERROR_MESSAGE);
    }

    @Override public void dispose() {
        if (sessionSubscription != null) {
            try { sessionSubscription.close(); } catch (Exception ignored) { }
            sessionSubscription = null;
        }
        super.dispose();
    }

    private static String blank(String value) { return value == null ? "" : value; }
    private static String signed(int value) { return value > 0 ? "+" + value : Integer.toString(value); }
    private static Throwable cause(ExecutionException exception) {
        return exception.getCause() == null ? exception : exception.getCause();
    }

    private record VesselChoice(UUID id, String name) {
        @Override public String toString() { return name; }
    }
    private record LocationChoice(UUID id, String name, int ring, int level, boolean station) {
        @Override public String toString() {
            return name + " · ring " + ring + " · level " + level + (station ? " · station" : "");
        }
    }
    private record Loaded(WorldVesselRegistry.RegistrySnapshot vessels,
                          WorldMapRegistry.RegistrySnapshot world,
                          StationLogisticsRegistry.Snapshot logistics) { }
    @FunctionalInterface private interface CheckedAction { Object run() throws Exception; }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try { UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName()); }
            catch (Exception exception) { System.err.println(exception.getMessage()); }
            PlayerVesselTransitWindow window = new PlayerVesselTransitWindow();
            window.setLocationRelativeTo(null);
            window.setVisible(true);
        });
    }
}
