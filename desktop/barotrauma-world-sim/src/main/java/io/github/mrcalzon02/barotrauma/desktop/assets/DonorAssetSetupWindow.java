package io.github.mrcalzon02.barotrauma.desktop.assets;

import io.github.mrcalzon02.barotrauma.assets.BarotraumaDonorAssets;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaDonorAssets.AssetRole;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaDonorAssets.Candidate;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaDonorAssets.DiscoverySource;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaDonorAssets.Mode;

import javax.swing.BorderFactory;
import javax.swing.Box;
import javax.swing.BoxLayout;
import javax.swing.JButton;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JList;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JSplitPane;
import javax.swing.JTextArea;
import javax.swing.ListSelectionModel;
import javax.swing.SwingUtilities;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import javax.swing.border.EmptyBorder;
import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.GridLayout;
import java.nio.file.Path;
import java.util.List;

/** Installer/settings surface for local donor Barotrauma graphical assets. */
public final class DonorAssetSetupWindow extends JFrame {
    private final BarotraumaDonorAssets assets = new BarotraumaDonorAssets();
    private final javax.swing.DefaultListModel<Candidate> candidatesModel = new javax.swing.DefaultListModel<>();
    private final JList<Candidate> candidates = new JList<>(candidatesModel);
    private final JTextArea details = new JTextArea();
    private final JLabel status = new JLabel("Ready");
    private final JPanel previews = new JPanel(new GridLayout(2, 2, 12, 12));

    public DonorAssetSetupWindow() {
        super("Barotrauma Donor Asset Setup");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(900, 640));
        setSize(1150, 760);
        setLocationByPlatform(true);

        JPanel root = new JPanel(new BorderLayout(12, 12));
        root.setBorder(new EmptyBorder(16, 16, 16, 16));
        root.add(header(), BorderLayout.NORTH);
        root.add(content(), BorderLayout.CENTER);
        root.add(footer(), BorderLayout.SOUTH);
        setContentPane(root);

        candidates.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        candidates.setCellRenderer((list, value, index, isSelected, cellHasFocus) -> {
            JLabel label = new JLabel(value.installationRoot() == null ? "Unknown" : value.installationRoot().toString());
            label.setOpaque(true);
            label.setBorder(new EmptyBorder(8, 8, 8, 8));
            label.setBackground(isSelected ? list.getSelectionBackground() : list.getBackground());
            label.setForeground(isSelected ? list.getSelectionForeground() : list.getForeground());
            return label;
        });
        candidates.addListSelectionListener(event -> {
            if (!event.getValueIsAdjusting()) showCandidate(candidates.getSelectedValue());
        });
        discover();
        refreshPreviews();
    }

    private JPanel header() {
        JPanel panel = new JPanel();
        panel.setLayout(new BoxLayout(panel, BoxLayout.Y_AXIS));
        JLabel title = new JLabel("Graphical asset source");
        title.setFont(title.getFont().deriveFont(Font.BOLD, 22f));
        panel.add(title);
        panel.add(Box.createVerticalStrut(6));
        panel.add(new JLabel("Use graphical files from a locally installed copy of Barotrauma, or use packaged fallback PNGs."));
        panel.add(Box.createVerticalStrut(4));
        panel.add(new JLabel("The toolbox stores only a local folder pointer. Donor assets are not copied into releases or the repository."));
        return panel;
    }

    private JSplitPane content() {
        JPanel left = new JPanel(new BorderLayout(8, 8));
        left.setBorder(BorderFactory.createTitledBorder("Detected installations"));
        left.add(new JScrollPane(candidates), BorderLayout.CENTER);

        JPanel buttons = new JPanel(new FlowLayout(FlowLayout.LEFT));
        JButton rescan = new JButton("Rescan Steam Libraries");
        JButton browse = new JButton("Choose Folder…");
        JButton useSelected = new JButton("Use Selected Donor");
        JButton useAuto = new JButton("Use Automatic Detection");
        JButton fallback = new JButton("Use Fallback Assets Only");
        buttons.add(rescan);
        buttons.add(browse);
        buttons.add(useSelected);
        buttons.add(useAuto);
        buttons.add(fallback);
        left.add(buttons, BorderLayout.SOUTH);

        rescan.addActionListener(event -> discover());
        browse.addActionListener(event -> chooseFolder());
        useSelected.addActionListener(event -> saveSelected());
        useAuto.addActionListener(event -> saveAutomatic());
        fallback.addActionListener(event -> saveFallback());

        JPanel right = new JPanel(new BorderLayout(8, 8));
        right.setBorder(BorderFactory.createTitledBorder("Validation and preview"));
        details.setEditable(false);
        details.setLineWrap(true);
        details.setWrapStyleWord(true);
        details.setRows(8);
        right.add(new JScrollPane(details), BorderLayout.NORTH);
        previews.setBorder(new EmptyBorder(8, 8, 8, 8));
        right.add(previews, BorderLayout.CENTER);

        JSplitPane split = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, left, right);
        split.setDividerLocation(520);
        split.setResizeWeight(0.45);
        return split;
    }

    private JPanel footer() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.add(status, BorderLayout.WEST);
        JLabel configuration = new JLabel("Config: " + BarotraumaDonorAssets.defaultConfigurationFile());
        panel.add(configuration, BorderLayout.EAST);
        return panel;
    }

    private void discover() {
        candidatesModel.clear();
        List<Candidate> found = assets.discoverInstallations();
        for (Candidate candidate : found) candidatesModel.addElement(candidate);
        if (!found.isEmpty()) candidates.setSelectedIndex(0);
        status.setText(found.isEmpty()
                ? "No valid donor installation found automatically; fallback assets remain available."
                : "Found " + found.size() + " valid Barotrauma installation" + (found.size() == 1 ? "." : "s."));
        showConfiguration();
    }

    private void chooseFolder() {
        JFileChooser chooser = new JFileChooser();
        chooser.setDialogTitle("Choose Barotrauma installation, app bundle, or Content folder");
        chooser.setFileSelectionMode(JFileChooser.FILES_AND_DIRECTORIES);
        chooser.setAcceptAllFileFilterUsed(false);
        if (chooser.showOpenDialog(this) != JFileChooser.APPROVE_OPTION) return;
        Path selected = chooser.getSelectedFile().toPath();
        Candidate candidate = assets.inspectCandidate(selected, DiscoverySource.MANUAL_SELECTION);
        if (!candidate.valid()) {
            JOptionPane.showMessageDialog(this, candidate.detail(), "Invalid donor installation",
                    JOptionPane.ERROR_MESSAGE);
            return;
        }
        candidatesModel.add(0, candidate);
        candidates.setSelectedIndex(0);
        showCandidate(candidate);
    }

    private void saveSelected() {
        Candidate selected = candidates.getSelectedValue();
        if (selected == null) {
            JOptionPane.showMessageDialog(this, "Select a validated Barotrauma installation first.",
                    "No donor selected", JOptionPane.WARNING_MESSAGE);
            return;
        }
        try {
            assets.saveConfiguration(Mode.MANUAL, selected.installationRoot());
            status.setText("Manual donor installation saved.");
            refreshPreviews();
            showConfiguration();
        } catch (Exception exception) {
            showFailure(exception);
        }
    }

    private void saveAutomatic() {
        try {
            assets.saveConfiguration(Mode.AUTO, candidatesModel.isEmpty() ? null
                    : candidatesModel.firstElement().installationRoot());
            status.setText("Automatic donor discovery enabled.");
            refreshPreviews();
            showConfiguration();
        } catch (Exception exception) {
            showFailure(exception);
        }
    }

    private void saveFallback() {
        try {
            assets.saveConfiguration(Mode.FALLBACK, null);
            status.setText("Fallback-only graphical assets enabled.");
            refreshPreviews();
            showConfiguration();
        } catch (Exception exception) {
            showFailure(exception);
        }
    }

    private void showCandidate(Candidate candidate) {
        if (candidate == null) return;
        details.setText("Installation root:\n" + candidate.installationRoot()
                + "\n\nContent root:\n" + candidate.contentRoot()
                + "\n\nDiscovery source: " + candidate.source()
                + "\nValidation: " + candidate.detail());
        details.setCaretPosition(0);
    }

    private void showConfiguration() {
        try {
            var configuration = assets.loadConfiguration();
            details.append("\n\nCurrent mode: " + configuration.mode()
                    + "\nSaved donor: " + (configuration.donorRoot() == null ? "none" : configuration.donorRoot())
                    + "\nUpdated: " + configuration.updatedAt());
        } catch (Exception exception) {
            details.append("\n\nCould not read saved configuration: " + exception.getMessage());
        }
    }

    private void refreshPreviews() {
        previews.removeAll();
        for (AssetRole role : AssetRole.values()) {
            JPanel card = new JPanel(new BorderLayout(4, 4));
            card.setBorder(BorderFactory.createEtchedBorder());
            JLabel image = new JLabel(role.name(), JLabel.CENTER);
            try {
                image.setIcon(assets.loadIcon(role, 128, 128));
                image.setText("");
            } catch (Exception exception) {
                image.setText("Preview unavailable");
            }
            JLabel source = new JLabel(role.name() + " · " + assets.resolve(role).source(), JLabel.CENTER);
            card.add(image, BorderLayout.CENTER);
            card.add(source, BorderLayout.SOUTH);
            previews.add(card);
        }
        previews.revalidate();
        previews.repaint();
    }

    private void showFailure(Exception exception) {
        status.setText("Asset configuration failed.");
        JOptionPane.showMessageDialog(this, exception.getMessage(), "Asset configuration failed",
                JOptionPane.ERROR_MESSAGE);
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            try { UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName()); }
            catch (Exception exception) { System.err.println(exception.getMessage()); }
            DonorAssetSetupWindow window = new DonorAssetSetupWindow();
            window.setLocationRelativeTo(null);
            window.setVisible(true);
        });
    }
}
