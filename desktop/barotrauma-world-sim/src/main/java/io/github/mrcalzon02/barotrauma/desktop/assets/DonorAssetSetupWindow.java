package io.github.mrcalzon02.barotrauma.desktop.assets;

import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalogue;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalogue.ResolvedGraphic;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalogue.VisualRole;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaDonorAssets;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalog;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalog.Catalog;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaAssetCatalog.Category;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaDonorAssets.Candidate;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaDonorAssets.DiscoverySource;
import io.github.mrcalzon02.barotrauma.assets.BarotraumaDonorAssets.Mode;
import io.github.mrcalzon02.barotrauma.desktop.registry.DonorBackedWorldMapWindow;

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
import javax.swing.SwingWorker;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import javax.swing.border.EmptyBorder;
import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.GridLayout;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;

/** Installer/settings surface for local donor Barotrauma media, semantic graphics, and independent fallbacks. */
public final class DonorAssetSetupWindow extends JFrame {
    private final BarotraumaDonorAssets assets = new BarotraumaDonorAssets();
    private final BarotraumaAssetCatalogue catalogue = new BarotraumaAssetCatalogue(assets);
    private final javax.swing.DefaultListModel<Candidate> candidatesModel = new javax.swing.DefaultListModel<>();
    private final JList<Candidate> candidates = new JList<>(candidatesModel);
    private final JTextArea details = new JTextArea();
    private final JLabel status = new JLabel("Ready");
    private final JPanel previews = new JPanel(new GridLayout(0, 4, 10, 10));
    private boolean previewBusy;

    public DonorAssetSetupWindow() {
        super("Barotrauma Donor Asset Setup and Catalogue");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(1000, 680));
        setSize(1450, 900);
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
        JLabel title = new JLabel("Local Barotrauma media source and semantic catalogue");
        title.setFont(title.getFont().deriveFont(Font.BOLD, 22f));
        panel.add(title);
        panel.add(Box.createVerticalStrut(6));
        panel.add(new JLabel("Index graphics, music, ambience, sounds, fonts, and video from a locally installed copy of Barotrauma."));
        panel.add(Box.createVerticalStrut(4));
        panel.add(new JLabel("XML atlas regions are resolved semantically; only local metadata is retained and donor files are never copied."));
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
        JButton graphicalMap = new JButton("Open Graphical World Map");
        buttons.add(rescan);
        buttons.add(browse);
        buttons.add(useSelected);
        buttons.add(useAuto);
        buttons.add(fallback);
        buttons.add(graphicalMap);
        left.add(buttons, BorderLayout.SOUTH);

        rescan.addActionListener(event -> discover());
        browse.addActionListener(event -> chooseFolder());
        useSelected.addActionListener(event -> saveSelected());
        useAuto.addActionListener(event -> saveAutomatic());
        fallback.addActionListener(event -> saveFallback());
        graphicalMap.addActionListener(event -> {
            DonorBackedWorldMapWindow window = new DonorBackedWorldMapWindow();
            window.setLocationRelativeTo(this);
            window.setVisible(true);
        });

        JPanel right = new JPanel(new BorderLayout(8, 8));
        right.setBorder(BorderFactory.createTitledBorder("Validation, coverage, and previews"));
        details.setEditable(false);
        details.setLineWrap(true);
        details.setWrapStyleWord(true);
        details.setRows(9);
        right.add(new JScrollPane(details), BorderLayout.NORTH);
        previews.setBorder(new EmptyBorder(8, 8, 8, 8));
        JScrollPane previewScroll = new JScrollPane(previews);
        previewScroll.getVerticalScrollBar().setUnitIncrement(24);
        right.add(previewScroll, BorderLayout.CENTER);

        JSplitPane split = new JSplitPane(JSplitPane.HORIZONTAL_SPLIT, left, right);
        split.setDividerLocation(500);
        split.setResizeWeight(0.34);
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
        if (!found.isEmpty()) {
            candidates.setSelectedIndex(0);
        } else {
            details.setText("No valid donor installation was found automatically.");
            showConfiguration();
        }
        status.setText(found.isEmpty()
                ? "No donor installation found automatically; every visual role still has a procedural fallback."
                : "Found " + found.size() + " valid Barotrauma installation" + (found.size() == 1 ? "." : "s."));
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
            catalogue.clearCache();
            status.setText("Manual donor installation saved; rebuilding semantic catalogue.");
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
            catalogue.clearCache();
            status.setText("Automatic donor discovery enabled; rebuilding semantic catalogue.");
            refreshPreviews();
            showConfiguration();
        } catch (Exception exception) {
            showFailure(exception);
        }
    }

    private void saveFallback() {
        try {
            assets.saveConfiguration(Mode.FALLBACK, null);
            catalogue.clearCache();
            status.setText("Fallback-only visuals enabled; rendering independent replacements.");
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
        appendConfiguration();
        inspectCatalog(candidate);
        details.setCaretPosition(0);
    }

    private void inspectCatalog(Candidate candidate) {
        status.setText("Indexing local Barotrauma media in the background…");
        new SwingWorker<Catalog, Void>() {
            @Override
            protected Catalog doInBackground() throws Exception {
                return BarotraumaAssetCatalog.scan(candidate.installationRoot());
            }

            @Override
            protected void done() {
                Candidate selected = candidates.getSelectedValue();
                if (selected == null || !selected.installationRoot().equals(candidate.installationRoot())) return;
                try {
                    Catalog catalog = get();
                    StringBuilder summary = new StringBuilder("\n\nLocal media catalog: ")
                            .append(catalog.entries().size()).append(" candidates")
                            .append("\nFingerprint: ").append(catalog.fingerprint());
                    for (Category category : Category.values()) {
                        long count = catalog.categoryCounts().getOrDefault(category, 0L);
                        if (count > 0) summary.append("\n  ").append(category.externalName()).append(": ").append(count);
                    }
                    if (catalog.truncated()) summary.append("\nWARNING: catalog limit reached; results are incomplete.");
                    details.append(summary.toString());
                    status.setText("Indexed " + catalog.entries().size() + " local media candidates without copying files.");
                } catch (Exception exception) {
                    details.append("\n\nLocal media catalog failed: " + exception.getMessage());
                    status.setText("Local media indexing failed; fallback graphics remain available.");
                }
            }
        }.execute();
    }

    private void showConfiguration() {
        if (candidates.getSelectedValue() == null) details.setText("No validated donor installation is selected.");
        appendConfiguration();
        details.setCaretPosition(0);
    }

    private void appendConfiguration() {
        try {
            var configuration = assets.loadConfiguration();
            details.append("\n\nCurrent mode: " + configuration.mode()
                    + "\nSaved donor: " + (configuration.donorRoot() == null ? "none" : configuration.donorRoot())
                    + "\nUpdated: " + configuration.updatedAt()
                    + "\n\nResolution order: preferred file → XML style/atlas sprite → semantic image match → procedural fallback.");
        } catch (Exception exception) {
            details.append("\n\nCould not read saved configuration: " + exception.getMessage());
        }
    }

    private void refreshPreviews() {
        if (previewBusy) return;
        previewBusy = true;
        previews.removeAll();
        previews.add(new JLabel("Indexing Barotrauma UI and map definitions…", JLabel.CENTER));
        previews.revalidate();
        previews.repaint();
        new SwingWorker<PreviewSet, Void>() {
            @Override protected PreviewSet doInBackground() throws Exception {
                List<Preview> rows = new ArrayList<>();
                for (VisualRole role : VisualRole.values()) {
                    ResolvedGraphic resolved = catalogue.resolve(role);
                    int width = role.category() == BarotraumaAssetCatalogue.Category.BACKGROUND ? 150 : 92;
                    int height = role.category() == BarotraumaAssetCatalogue.Category.BACKGROUND ? 84 : 72;
                    rows.add(new Preview(role, resolved, catalogue.loadIcon(role, width, height)));
                }
                return new PreviewSet(catalogue.coverage(), List.copyOf(rows));
            }

            @Override protected void done() {
                try {
                    PreviewSet result = get();
                    previews.removeAll();
                    for (Preview preview : result.rows()) previews.add(previewCard(preview));
                    details.append("\n\nCurrent role coverage: " + result.coverage().donorCount()
                            + " donor-backed, " + result.coverage().fallbackCount() + " procedural fallback.");
                    status.setText("Visual catalogue ready · " + result.coverage().donorCount() + " donor · "
                            + result.coverage().fallbackCount() + " fallback");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    status.setText("Preview indexing interrupted.");
                } catch (ExecutionException exception) {
                    showFailure(cause(exception));
                } finally {
                    previewBusy = false;
                    previews.revalidate();
                    previews.repaint();
                }
            }
        }.execute();
    }

    private JPanel previewCard(Preview preview) {
        JPanel card = new JPanel(new BorderLayout(4, 4));
        card.setBorder(BorderFactory.createEtchedBorder());
        JLabel image = new JLabel(preview.role().label(), preview.icon(), JLabel.CENTER);
        image.setHorizontalTextPosition(JLabel.CENTER);
        image.setVerticalTextPosition(JLabel.BOTTOM);
        image.setBorder(new EmptyBorder(6, 6, 4, 6));
        String file = preview.resolved().file() == null ? "generated" : preview.resolved().file().getFileName().toString();
        String crop = preview.resolved().sourceRectangle() == null ? "" : " · crop "
                + preview.resolved().sourceRectangle().width() + "×" + preview.resolved().sourceRectangle().height();
        JLabel source = new JLabel(preview.resolved().source() + " · " + file + crop, JLabel.CENTER);
        source.setFont(source.getFont().deriveFont(10f));
        source.setToolTipText(preview.resolved().detail());
        card.add(image, BorderLayout.CENTER);
        card.add(source, BorderLayout.SOUTH);
        return card;
    }

    private void showFailure(Exception exception) {
        status.setText("Media configuration failed.");
        JOptionPane.showMessageDialog(this, exception.getMessage(), "Asset configuration failed",
                JOptionPane.ERROR_MESSAGE);
    }

    private static Exception cause(ExecutionException exception) {
        Throwable cause = exception.getCause();
        return cause instanceof Exception checked ? checked : exception;
    }

    private record Preview(VisualRole role, ResolvedGraphic resolved, javax.swing.Icon icon) { }
    private record PreviewSet(BarotraumaAssetCatalogue.CoverageReport coverage, List<Preview> rows) { }

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
