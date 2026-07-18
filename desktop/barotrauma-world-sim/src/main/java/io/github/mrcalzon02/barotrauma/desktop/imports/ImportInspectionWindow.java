package io.github.mrcalzon02.barotrauma.desktop.imports;

import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector;
import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector.CampaignInspection;
import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector.Inspection;
import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector.StandaloneSubmarineInspection;
import io.github.mrcalzon02.barotrauma.compatibility.official.BarotraumaSaveInspector.SubmarineInspection;
import io.github.mrcalzon02.barotrauma.compatibility.web.WebSuiteV22Inspector;

import javax.swing.BorderFactory;
import javax.swing.JButton;
import javax.swing.JFileChooser;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTextArea;
import javax.swing.SwingUtilities;
import javax.swing.SwingWorker;
import javax.swing.UIManager;
import javax.swing.WindowConstants;
import javax.swing.filechooser.FileNameExtensionFilter;
import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.io.IOException;
import java.nio.file.Path;
import java.util.Locale;
import java.util.concurrent.ExecutionException;

/** First usable read-only desktop intake surface for Barotrauma compatibility files. */
public final class ImportInspectionWindow extends JFrame {
    private final JButton chooseButton = new JButton("Inspect File");
    private final JButton clearButton = new JButton("Clear");
    private final JLabel status = new JLabel("No source selected");
    private final JTextArea report = new JTextArea();
    private Path lastDirectory;

    public ImportInspectionWindow() {
        super("Barotrauma Import Inspection");
        setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE);
        setMinimumSize(new Dimension(820, 600));
        setSize(980, 720);
        setLocationByPlatform(true);
        setLayout(new BorderLayout(10, 10));

        JLabel explanation = new JLabel("<html><b>Read-only inspection.</b> Files are hashed and validated, but no desktop world is created or changed.</html>");
        explanation.setBorder(BorderFactory.createEmptyBorder(12, 12, 0, 12));
        add(explanation, BorderLayout.NORTH);

        report.setEditable(false);
        report.setLineWrap(false);
        report.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 13));
        report.setText("Choose a version-22 suite JSON export, official campaign .save, or standalone .sub file.\n");
        JScrollPane scroll = new JScrollPane(report);
        scroll.setBorder(BorderFactory.createEmptyBorder(0, 12, 0, 12));
        add(scroll, BorderLayout.CENTER);

        JPanel controls = new JPanel(new BorderLayout());
        controls.setBorder(BorderFactory.createEmptyBorder(0, 12, 12, 12));
        JPanel buttons = new JPanel(new FlowLayout(FlowLayout.LEFT, 8, 0));
        buttons.add(chooseButton);
        buttons.add(clearButton);
        controls.add(buttons, BorderLayout.WEST);
        controls.add(status, BorderLayout.EAST);
        add(controls, BorderLayout.SOUTH);

        chooseButton.addActionListener(event -> chooseAndInspect());
        clearButton.addActionListener(event -> {
            report.setText("");
            status.setText("Cleared");
        });
    }

    private void chooseAndInspect() {
        JFileChooser chooser = lastDirectory == null ? new JFileChooser() : new JFileChooser(lastDirectory.toFile());
        chooser.setDialogTitle("Inspect Barotrauma compatibility source");
        chooser.setFileFilter(new FileNameExtensionFilter("Barotrauma sources (*.json, *.save, *.sub)", "json", "save", "sub"));
        if (chooser.showOpenDialog(this) != JFileChooser.APPROVE_OPTION) return;
        Path source = chooser.getSelectedFile().toPath();
        lastDirectory = source.getParent();
        inspect(source);
    }

    public void inspect(Path source) {
        chooseButton.setEnabled(false);
        clearButton.setEnabled(false);
        status.setText("Inspecting " + source.getFileName() + "…");
        report.setText("Inspecting " + source + "\nNo data will be imported.\n\n");

        new SwingWorker<String, Void>() {
            @Override
            protected String doInBackground() throws Exception {
                return inspectSource(source);
            }

            @Override
            protected void done() {
                try {
                    report.setText(get());
                    report.setCaretPosition(0);
                    status.setText("Inspection complete");
                } catch (InterruptedException exception) {
                    Thread.currentThread().interrupt();
                    report.setText("Inspection interrupted.\n");
                    status.setText("Interrupted");
                } catch (ExecutionException exception) {
                    Throwable cause = exception.getCause() == null ? exception : exception.getCause();
                    report.setText("Inspection failed\n\n" + cause.getClass().getSimpleName() + ": " + cause.getMessage() + "\n");
                    status.setText("Inspection failed");
                } finally {
                    chooseButton.setEnabled(true);
                    clearButton.setEnabled(true);
                }
            }
        }.execute();
    }

    static String inspectSource(Path source) throws Exception {
        String name = source.getFileName().toString().toLowerCase(Locale.ROOT);
        if (name.endsWith(".json")) {
            return WebSuiteV22Inspector.inspect(source).toHumanReadableText()
                    + "\nResult: compatible source inspected; no import transaction was created.\n";
        }
        if (name.endsWith(".save") || name.endsWith(".sub")) {
            return officialReport(BarotraumaSaveInspector.inspect(source));
        }
        throw new IOException("Unsupported source extension; expected .json, .save, or .sub.");
    }

    private static String officialReport(Inspection inspection) {
        StringBuilder output = new StringBuilder();
        output.append("Official Barotrauma source inspection\n")
                .append("Source: ").append(inspection.sourceName()).append('\n')
                .append("SHA-256: ").append(inspection.artifactIdentity().digest().value()).append('\n')
                .append("Bytes: ").append(inspection.artifactIdentity().byteLength()).append("\n\n");

        if (inspection instanceof CampaignInspection campaign) {
            output.append("Type: campaign save\n")
                    .append("Game version: ").append(campaign.gameVersion()).append('\n')
                    .append("Save time: ").append(campaign.saveTime() == null ? "not declared" : campaign.saveTime()).append('\n')
                    .append("Selected submarine: ").append(blank(campaign.selectedSubmarineName(), "not declared")).append('\n')
                    .append("Owned submarine names: ").append(campaign.ownedSubmarineNames().size()).append('\n')
                    .append("Archive entries: ").append(campaign.archiveEntryCount()).append('\n')
                    .append("Submarine payloads: ").append(campaign.submarines().size()).append('\n')
                    .append("Content packages: ").append(campaign.contentPackages().isEmpty() ? "none declared" : String.join(", ", campaign.contentPackages())).append("\n\n");
            for (SubmarineInspection submarine : campaign.submarines()) appendSubmarine(output, submarine);
            for (String warning : campaign.warnings()) output.append("WARNING: ").append(warning).append('\n');
        } else if (inspection instanceof StandaloneSubmarineInspection standalone) {
            output.append("Type: standalone submarine\n\n");
            appendSubmarine(output, standalone.submarine());
        }
        output.append("\nResult: source inspected; no import transaction was created.\n");
        return output.toString();
    }

    private static void appendSubmarine(StringBuilder output, SubmarineInspection submarine) {
        output.append("Submarine: ").append(blank(submarine.name(), "unnamed")).append('\n')
                .append("  Source entry: ").append(submarine.sourceName()).append('\n')
                .append("  Type/class: ").append(blank(submarine.type(), "unknown")).append(" / ").append(blank(submarine.submarineClass(), "undefined")).append('\n')
                .append("  Game version: ").append(blank(submarine.gameVersion(), "not declared")).append('\n')
                .append("  Tier/price: ").append(submarine.tier() == null ? "?" : submarine.tier()).append(" / ").append(submarine.price() == null ? "?" : submarine.price()).append('\n')
                .append("  Crew recommendation: ").append(submarine.recommendedCrewMin() == null ? "?" : submarine.recommendedCrewMin())
                .append("–").append(submarine.recommendedCrewMax() == null ? "?" : submarine.recommendedCrewMax()).append('\n')
                .append("  Equality check value: ").append(submarine.equalityCheckValue() == null ? "not declared" : submarine.equalityCheckValue()).append('\n')
                .append("  Canonical definition SHA-256: ").append(submarine.definitionIdentity().canonicalXmlDigest().value()).append('\n')
                .append("  Required content: ").append(submarine.requiredContentPackages().isEmpty() ? "none declared" : String.join(", ", submarine.requiredContentPackages())).append("\n\n");
    }

    private static String blank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static void installLookAndFeel() {
        try {
            UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
        } catch (Exception exception) {
            System.err.println("Could not activate system look and feel: " + exception.getMessage());
        }
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            installLookAndFeel();
            ImportInspectionWindow window = new ImportInspectionWindow();
            window.setLocationRelativeTo(null);
            window.setVisible(true);
            if (args.length == 1) window.inspect(Path.of(args[0]));
        });
    }
}
