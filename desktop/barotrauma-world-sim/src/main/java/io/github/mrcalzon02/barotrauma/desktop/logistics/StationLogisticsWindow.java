package io.github.mrcalzon02.barotrauma.desktop.logistics;

import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.persistence.StationLogisticsRegistry;
import io.github.mrcalzon02.barotrauma.persistence.StationLogisticsRegistry.Snapshot;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts.WorldPaths;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTabbedPane;
import javax.swing.JTable;
import javax.swing.JTextArea;
import javax.swing.SwingUtilities;
import javax.swing.SwingWorker;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import javax.swing.table.DefaultTableModel;
import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.nio.file.Path;
import java.util.concurrent.ExecutionException;

/** Read-only catalogue, inventory, production, freight, and treasury console. */
public final class StationLogisticsWindow extends JFrame {
    private final DesktopWorldSession session = DesktopWorldSession.global();
    private final JLabel worldStatus = new JLabel("No desktop world open");
    private final JLabel operationStatus = new JLabel("Ready");
    private final JButton openWorldButton = new JButton("Open World");
    private final JButton refreshButton = new JButton("Refresh");
    private final JButton playerTransitButton = new JButton("Open Player Transit");
    private final JTextArea summary = new JTextArea();

    private final DefaultTableModel catalogueModel = model("Category", "Item", "Key", "Base Value", "Unit Mass", "Item ID");
    private final DefaultTableModel recipeModel = model("Recipe", "Cycle Ticks", "Credit Cost", "Inputs", "Outputs", "Recipe ID");
    private final DefaultTableModel inventoryModel = model("Station", "Category", "Item", "Quantity", "Reserved", "Reorder", "Last Tick", "Station ID", "Item ID");
    private final DefaultTableModel vendorModel = model("Active", "Station", "Item", "Stock", "Buy", "Sell", "Limit", "Last Tick", "Offer ID");
    private final DefaultTableModel productionModel = model("Tick", "Station", "Recipe", "Cycles", "Status", "Run ID");
    private final DefaultTableModel freightModel = model("Status", "Item", "Quantity", "Source", "Destination", "NPC Vessel", "Player Vessel", "Created", "Updated", "Delivered", "Lot ID");
    private final DefaultTableModel treasuryModel = model("Tick", "Station", "Category", "Credits", "Counterparty", "Memo", "Transaction ID");

    private WorldPaths world;
    private Path lastDirectory;
    private AutoCloseable sessionSubscription;
    private boolean busy;

    public StationLogisticsWindow() {
        super("Barotrauma Station Logistics and Markets");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(1100, 700));
        setSize(1500, 900);
        setLocationByPlatform(true);
        setLayout(new BorderLayout(10, 10));

        JPanel header = new JPanel(new BorderLayout(12, 8));
        header.setBorder(BorderFactory.createEmptyBorder(12, 12, 0, 12));
        header.add(worldStatus, BorderLayout.WEST);
        header.add(operationStatus, BorderLayout.EAST);
        add(header, BorderLayout.NORTH);

        summary.setEditable(false);
        summary.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 13));
        summary.setText("Open a schema-006 world to inspect station logistics.\n");

        JTabbedPane tabs = new JTabbedPane();
        tabs.addTab("Summary", new JScrollPane(summary));
        tabs.addTab("Item Catalogue", scroll(catalogueModel));
        tabs.addTab("Recipes", scroll(recipeModel));
        tabs.addTab("Station Inventory", scroll(inventoryModel));
        tabs.addTab("Vendor Markets", scroll(vendorModel));
        tabs.addTab("Production Runs", scroll(productionModel));
        tabs.addTab("Freight Lots", scroll(freightModel));
        tabs.addTab("Treasury", scroll(treasuryModel));
        tabs.setBorder(BorderFactory.createEmptyBorder(0, 12, 0, 12));
        add(tabs, BorderLayout.CENTER);

        JPanel footer = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        footer.setBorder(BorderFactory.createEmptyBorder(0, 12, 12, 12));
        footer.add(openWorldButton);
        footer.add(refreshButton);
        footer.add(playerTransitButton);
        add(footer, BorderLayout.SOUTH);

        openWorldButton.addActionListener(event -> chooseWorld());
        refreshButton.addActionListener(event -> refresh());
        playerTransitButton.addActionListener(event -> {
            PlayerVesselTransitWindow window = new PlayerVesselTransitWindow();
            window.setLocationRelativeTo(this);
            window.setVisible(true);
        });
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
        clear();
        if (selectedWorld == null) {
            worldStatus.setText("No desktop world open");
            summary.setText("Open a schema-006 world to inspect station logistics.\n");
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
        setBusy(true, "Loading logistics registry…");
        new SwingWorker<Snapshot, Void>() {
            @Override protected Snapshot doInBackground() throws Exception {
                return StationLogisticsRegistry.load(selectedWorld);
            }
            @Override protected void done() {
                try {
                    Snapshot snapshot = get();
                    if (!selectedWorld.equals(world)) return;
                    populate(snapshot);
                    operationStatus.setText("Station logistics loaded");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("Logistics refresh interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("Logistics refresh failed", cause(exception));
                } finally {
                    setBusy(false, operationStatus.getText());
                }
            }
        }.execute();
    }

    private void populate(Snapshot snapshot) {
        clear();
        var s = snapshot.summary();
        summary.setText("Station logistics and player-route registry\n"
                + "Catalogue items: " + s.items() + "\n"
                + "Production recipes: " + s.recipes() + "\n"
                + "Inventory rows: " + s.inventoryRows() + "\n"
                + "Vendor offers: " + s.vendorOffers() + "\n"
                + "Production runs: " + s.productionRuns() + "\n"
                + "Freight lots: " + s.freightLots() + "\n"
                + "Treasury entries: " + s.treasuryEntries() + "\n"
                + "Player vessels enrolled: " + s.playerVessels() + "\n"
                + "Player transit encounters: " + s.playerEncounters() + "\n\n"
                + "Passive cycles update raw stock, execute affordable recipes, revise market prices, "
                + "and write treasury evidence in the same transaction as the world clock.\n");
        for (var row : snapshot.catalogue()) catalogueModel.addRow(new Object[]{row.category(), row.displayName(), row.itemKey(), row.baseValue(), row.unitMass(), row.itemId()});
        for (var row : snapshot.recipes()) recipeModel.addRow(new Object[]{row.displayName(), row.cycleTicks(), row.creditCost(), row.inputs(), row.outputs(), row.recipeId()});
        for (var row : snapshot.inventories()) inventoryModel.addRow(new Object[]{row.stationName(), row.category(), row.itemName(), row.quantity(), row.reserved(), row.reorderPoint(), row.lastTick(), row.stationId(), row.itemId()});
        for (var row : snapshot.offers()) vendorModel.addRow(new Object[]{row.active(), row.stationName(), row.itemName(), row.stock(), row.buyPrice(), row.sellPrice(), row.stockLimit(), row.lastTick(), row.offerId()});
        for (var row : snapshot.productionRuns()) productionModel.addRow(new Object[]{row.tickSequence(), row.stationName(), row.recipeName(), row.cycles(), row.status(), row.runId()});
        for (var row : snapshot.freight()) freightModel.addRow(new Object[]{row.status(), row.itemName(), row.quantity(), blank(row.sourceStationName()), blank(row.destinationStationName()), blank(row.npcVesselName()), blank(row.playerVesselName()), row.createdTick(), row.updatedTick(), nullable(row.deliveredTick()), row.lotId()});
        for (var row : snapshot.treasury()) treasuryModel.addRow(new Object[]{row.tickSequence(), blank(row.stationName()), row.category(), signed(row.creditsDelta()), blank(row.counterpartyType()) + " " + blank(row.counterpartyId()), row.memo(), row.transactionId()});
        summary.setCaretPosition(0);
    }

    private void clear() {
        for (DefaultTableModel model : new DefaultTableModel[]{catalogueModel, recipeModel, inventoryModel,
                vendorModel, productionModel, freightModel, treasuryModel}) model.setRowCount(0);
    }

    private void setBusy(boolean value, String message) {
        busy = value;
        operationStatus.setText(message);
        refreshControls();
    }

    private void refreshControls() {
        openWorldButton.setEnabled(!busy);
        refreshButton.setEnabled(!busy && world != null);
        playerTransitButton.setEnabled(!busy && world != null);
    }

    private void showFailure(String title, Throwable throwable) {
        operationStatus.setText(title);
        summary.append("\n" + title + "\n" + throwable.getClass().getSimpleName() + ": " + throwable.getMessage() + "\n");
        JOptionPane.showMessageDialog(this, throwable.getMessage(), title, JOptionPane.ERROR_MESSAGE);
    }

    @Override public void dispose() {
        if (sessionSubscription != null) {
            try { sessionSubscription.close(); } catch (Exception ignored) { }
            sessionSubscription = null;
        }
        super.dispose();
    }

    private static JScrollPane scroll(DefaultTableModel model) {
        JTable table = new JTable(model);
        table.setAutoCreateRowSorter(true);
        table.setAutoResizeMode(JTable.AUTO_RESIZE_OFF);
        table.setFillsViewportHeight(true);
        return new JScrollPane(table);
    }

    private static DefaultTableModel model(String... columns) {
        return new DefaultTableModel(columns, 0) {
            @Override public boolean isCellEditable(int row, int column) { return false; }
        };
    }

    private static String blank(String value) { return value == null ? "" : value; }
    private static Object nullable(Object value) { return value == null ? "" : value; }
    private static String signed(int value) { return value > 0 ? "+" + value : Integer.toString(value); }
    private static Throwable cause(ExecutionException exception) {
        return exception.getCause() == null ? exception : exception.getCause();
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try { UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName()); }
            catch (Exception exception) { System.err.println(exception.getMessage()); }
            StationLogisticsWindow window = new StationLogisticsWindow();
            window.setLocationRelativeTo(null);
            window.setVisible(true);
        });
    }
}
