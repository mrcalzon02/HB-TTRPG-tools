package io.github.mrcalzon02.barotrauma.desktop.generation;

import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalogue.VisualRole;
import io.github.mrcalzon02.barotrauma.desktop.assets.BarotraumaDesktopTheme;
import io.github.mrcalzon02.barotrauma.desktop.session.DesktopWorldSession;
import io.github.mrcalzon02.barotrauma.persistence.DefaultWorldGenerator;
import io.github.mrcalzon02.barotrauma.persistence.WorldStorageContracts;

import javax.swing.Box;
import javax.swing.BoxLayout;
import javax.swing.JButton;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JTextArea;
import javax.swing.JTextField;
import javax.swing.SwingUtilities;
import javax.swing.SwingWorker;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import javax.swing.border.EmptyBorder;
import java.awt.BorderLayout;
import java.awt.Component;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.nio.file.Path;
import java.util.concurrent.ExecutionException;

/** Operator surface for creating the current-schema deterministic default Europa world. */
public final class DefaultWorldGeneratorWindow extends JFrame {
    private final DesktopWorldSession session = DesktopWorldSession.global();
    private final JTextField name = new JTextField("Europa Operations Default", 32);
    private final JTextField root = new JTextField(
            WorldStorageContracts.defaultWorldRoot().toString(), 52);
    private final JTextArea details = new JTextArea();
    private final JButton browse = new JButton("Choose World Root");
    private final JButton create = new JButton("Create Current-Systems World");
    private final JLabel status = new JLabel("Ready to create a schema-current paused world");
    private boolean busy;

    public DefaultWorldGeneratorWindow() {
        super("Create Barotrauma Default World");
        BarotraumaDesktopTheme.install();
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(820, 560));
        setSize(980, 680);
        setLocationByPlatform(true);
        setIconImage(BarotraumaDesktopTheme.icon(VisualRole.STATION_ICON, 32, 32).getImage());

        JPanel rootPanel = BarotraumaDesktopTheme.scenePanel(
                VisualRole.APP_BACKGROUND, new BorderLayout(12, 12), 0.78f);
        rootPanel.setBorder(new EmptyBorder(16, 16, 16, 16));
        rootPanel.add(header(), BorderLayout.NORTH);
        rootPanel.add(form(), BorderLayout.CENTER);
        rootPanel.add(footer(), BorderLayout.SOUTH);
        setContentPane(rootPanel);
    }

    private JPanel header() {
        JPanel panel = BarotraumaDesktopTheme.surfacePanel(new BorderLayout(12, 6));
        panel.add(new JLabel(BarotraumaDesktopTheme.icon(VisualRole.LOCATION_MARKER, 48, 48)),
                BorderLayout.WEST);
        JPanel text = new JPanel();
        text.setOpaque(false);
        text.setLayout(new BoxLayout(text, BoxLayout.Y_AXIS));
        JLabel title = new JLabel("Current-systems Europa world generator");
        title.setFont(title.getFont().deriveFont(java.awt.Font.BOLD, 22f));
        text.add(title);
        text.add(Box.createVerticalStrut(4));
        text.add(new JLabel("Creates the default topology, imports it through the version-22 contract,"));
        text.add(new JLabel("initializes every current schema authority for one tick, and leaves Passive Mode paused."));
        panel.add(text, BorderLayout.CENTER);
        return panel;
    }

    private JPanel form() {
        JPanel panel = BarotraumaDesktopTheme.surfacePanel();
        panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));

        JLabel nameLabel = new JLabel("World name");
        nameLabel.setAlignmentX(Component.LEFT_ALIGNMENT);
        panel.add(nameLabel);
        panel.add(Box.createVerticalStrut(4));
        name.setMaximumSize(new Dimension(Integer.MAX_VALUE, 32));
        name.setAlignmentX(Component.LEFT_ALIGNMENT);
        panel.add(name);
        panel.add(Box.createVerticalStrut(14));

        JLabel rootLabel = new JLabel("World storage root");
        rootLabel.setAlignmentX(Component.LEFT_ALIGNMENT);
        panel.add(rootLabel);
        panel.add(Box.createVerticalStrut(4));
        root.setMaximumSize(new Dimension(Integer.MAX_VALUE, 32));
        root.setAlignmentX(Component.LEFT_ALIGNMENT);
        panel.add(root);
        panel.add(Box.createVerticalStrut(14));

        details.setEditable(false);
        details.setLineWrap(true);
        details.setWrapStyleWord(true);
        details.setRows(12);
        details.setText("Template: " + DefaultWorldGenerator.TEMPLATE_ID + "\n"
                + "Locations: " + DefaultWorldGenerator.EXPECTED_LOCATIONS + "\n"
                + "Principal stations: " + DefaultWorldGenerator.EXPECTED_STATIONS + "\n"
                + "Target schema: " + WorldStorageContracts.DATABASE_SCHEMA_VERSION + "\n\n"
                + "The generated world includes a connected Europa operations corridor, industrial, agricultural, "
                + "medical, research, shipyard, salvage, transit, refuge, security, and deep-frontier stations. "
                + "The canonical first tick seeds station state, detailed and aggregate populations, logistics, "
                + "civilization, observation, ecology, geology, missions, vessels, and current settlement authorities.");
        BarotraumaDesktopTheme.styleTextArea(details);
        var scroll = BarotraumaDesktopTheme.styleScrollPane(new javax.swing.JScrollPane(details));
        scroll.setAlignmentX(Component.LEFT_ALIGNMENT);
        panel.add(scroll);
        return panel;
    }

    private JPanel footer() {
        JPanel panel = BarotraumaDesktopTheme.surfacePanel(new BorderLayout(12, 0));
        JPanel buttons = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        buttons.setOpaque(false);
        BarotraumaDesktopTheme.styleButton(browse, VisualRole.LOCATION_MARKER);
        BarotraumaDesktopTheme.styleButton(create, VisualRole.SAVING_STATUS);
        buttons.add(browse);
        buttons.add(create);
        panel.add(buttons, BorderLayout.WEST);
        panel.add(status, BorderLayout.EAST);

        browse.addActionListener(event -> chooseRoot());
        create.addActionListener(event -> createWorld());
        return panel;
    }

    private void chooseRoot() {
        JFileChooser chooser = new JFileChooser(root.getText().trim());
        chooser.setDialogTitle("Choose the directory that will contain desktop worlds");
        chooser.setFileSelectionMode(JFileChooser.DIRECTORIES_ONLY);
        chooser.setAcceptAllFileFilterUsed(false);
        if (chooser.showOpenDialog(this) == JFileChooser.APPROVE_OPTION) {
            root.setText(chooser.getSelectedFile().toPath().toAbsolutePath().normalize().toString());
        }
    }

    private void createWorld() {
        if (busy) return;
        Path selectedRoot;
        try {
            selectedRoot = Path.of(root.getText().trim()).toAbsolutePath().normalize();
        } catch (RuntimeException exception) {
            showFailure("Invalid world root", exception);
            return;
        }
        String displayName = name.getText();
        setBusy(true, "Creating and initializing the current-system world…");
        new SwingWorker<DefaultWorldGenerator.GeneratedWorld, Void>() {
            @Override protected DefaultWorldGenerator.GeneratedWorld doInBackground() throws Exception {
                return DefaultWorldGenerator.create(selectedRoot, displayName);
            }

            @Override protected void done() {
                try {
                    DefaultWorldGenerator.GeneratedWorld generated = get();
                    session.activate(generated.paths());
                    details.append("\n\nCREATED\n"
                            + "World: " + generated.paths().root() + "\n"
                            + "Schema: " + generated.schemaVersion() + "\n"
                            + "Locations: " + generated.locationCount() + "\n"
                            + "Stations: " + generated.stationCount() + "\n"
                            + "Station states: " + generated.stationStateCount() + "\n"
                            + "Detailed populations: " + generated.detailedPopulationCount() + "\n"
                            + "Aggregate populations: " + generated.aggregatePopulationCount() + "\n"
                            + "Ecology locations: " + generated.ecologyLocationCount() + "\n"
                            + "Geology locations: " + generated.geologyLocationCount() + "\n"
                            + "Initialized tick: " + generated.initializedTick() + "\n"
                            + "Scheduler: " + generated.schedulerState() + "\n");
                    details.setCaretPosition(details.getDocument().getLength());
                    status.setText("World created and selected");
                    JOptionPane.showMessageDialog(DefaultWorldGeneratorWindow.this,
                            "Created and selected:\n" + generated.paths().root(),
                            "Default world created", JOptionPane.INFORMATION_MESSAGE);
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    showFailure("World creation interrupted", exception);
                } catch (ExecutionException exception) {
                    showFailure("World creation failed",
                            exception.getCause() == null ? exception : exception.getCause());
                } finally {
                    setBusy(false, status.getText());
                }
            }
        }.execute();
    }

    private void setBusy(boolean value, String message) {
        busy = value;
        browse.setEnabled(!value);
        create.setEnabled(!value);
        name.setEnabled(!value);
        root.setEnabled(!value);
        status.setText(message);
    }

    private void showFailure(String title, Throwable throwable) {
        details.append("\n\n" + title + "\n" + throwable.getClass().getSimpleName()
                + ": " + throwable.getMessage() + "\n");
        details.setCaretPosition(details.getDocument().getLength());
        status.setText(title);
        JOptionPane.showMessageDialog(this, throwable.getMessage(), title, JOptionPane.ERROR_MESSAGE);
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try { UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName()); }
            catch (Exception exception) {
                System.err.println("Could not activate system look and feel: " + exception.getMessage());
            }
            BarotraumaDesktopTheme.install();
            new DefaultWorldGeneratorWindow().setVisible(true);
        });
    }
}
