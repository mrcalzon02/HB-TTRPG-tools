package io.github.mrcalzon02.barotrauma.persistence;

import java.util.List;

/** Immutable built-in topology for the current-systems default Europa world. */
final class DefaultWorldTemplate {
    private DefaultWorldTemplate() { }

    static String document(String displayName) {
        List<Node> nodes = List.of(
                station("europa-operations", "Europa Operations Hub", 47, 1, 80, 72, "Cold Caverns", "Coalition"),
                station("abyssal-exchange", "Abyssal Exchange", 45, 2, 210, 130, "Abyssal Plain", "Coalition"),
                station("thalassa-shipyard", "Thalassa Shipyard", 43, 3, 350, 92, "Ice Shelf", "Coalition"),
                station("nereid-agriculture", "Nereid Agricultural Ring", 41, 3, 490, 155, "Kelp Forest", "Coalition"),
                station("riftwatch-bastion", "Riftwatch Bastion", 38, 4, 640, 115, "Ridge", "Separatists"),
                station("borealis-research", "Borealis Research Annex", 35, 5, 770, 190, "Thermal Caverns", "Coalition"),
                station("hadal-foundry", "Hadal Foundry", 32, 5, 900, 135, "Volcanic", "Independent"),
                station("blackwater-salvage", "Blackwater Salvage Port", 29, 6, 1030, 220, "Wreck Field", "Independent"),
                station("pelagic-medical", "Pelagic Medical Enclave", 26, 6, 1160, 165, "Cold Caverns", "Coalition"),
                station("meridian-transit", "Meridian Transit Junction", 22, 7, 1280, 245, "Abyssal Plain", "Coalition"),
                station("charybdis-refuge", "Charybdis Refuge", 18, 8, 1390, 195, "Deep Trench", "Independent"),
                station("lantern-outpost", "Lantern Outpost", 14, 9, 1490, 275, "Hydrothermal", "Separatists"),

                location("frostline-pass", "Frostline Pass", 46, 2, 145, 255, "Ice Shelf"),
                location("aurora-kelp", "Aurora Kelp Expanse", 42, 3, 300, 305, "Kelp Forest"),
                location("morrow-ruins", "Morrow Ruins", 39, 4, 455, 270, "Ancient Ruins"),
                location("caldera-vents", "Caldera Vent Field", 36, 5, 610, 340, "Hydrothermal"),
                location("glass-trench", "Glass Trench", 33, 5, 760, 300, "Deep Trench"),
                location("leviathan-fall", "Leviathan Fall", 30, 6, 910, 365, "Bone Field"),
                location("silent-wrecks", "Silent Wreck Corridor", 27, 6, 1060, 315, "Wreck Field"),
                location("black-smoker-chain", "Black Smoker Chain", 24, 7, 1200, 395, "Hydrothermal"),
                location("hollow-ice", "Hollow Ice Labyrinth", 21, 7, 1330, 345, "Ice Caverns"),
                location("red-abyss", "Red Abyss", 17, 8, 1435, 430, "Abyssal Plain"),
                location("gate-of-thorns", "Gate of Thorns", 12, 9, 1530, 380, "Fauna Grounds"),
                location("hadal-crown", "Hadal Crown", 8, 10, 1600, 470, "Deep Trench")
        );

        StringBuilder nodeJson = new StringBuilder();
        StringBuilder economies = new StringBuilder();
        for (Node node : nodes) {
            if (!nodeJson.isEmpty()) nodeJson.append(',');
            nodeJson.append("{\"id\":\"").append(json(node.id())).append("\",\"name\":\"")
                    .append(json(node.name())).append("\",\"ring\":").append(node.ring())
                    .append(",\"level\":").append(node.level()).append(",\"type\":\"")
                    .append(node.station() ? "station" : "location").append("\",\"x\":")
                    .append(node.x()).append(",\"y\":").append(node.y())
                    .append(",\"biome\":\"").append(json(node.biome())).append("\"");
            if (node.faction() != null) {
                nodeJson.append(",\"faction\":\"").append(json(node.faction())).append("\"");
            }
            nodeJson.append('}');
            if (node.station()) {
                if (!economies.isEmpty()) economies.append(',');
                economies.append('"').append(json(node.id())).append("\":{}");
            }
        }

        return "{\"version\":22,\"exportedAt\":\"2026-07-25T00:00:00Z\","
                + "\"masterWorldId\":\"" + DefaultWorldGenerator.TEMPLATE_ID + "\",\"worldEconomyVersion\":\"1.0.0\","
                + "\"worldStateSchemaVersion\":\"2.2.0\",\"state\":{\"world\":{"
                + "\"canonicalTime\":\"2175-01-01T00:00:00Z\","
                + "\"realEpoch\":\"2026-07-25T00:00:00Z\","
                + "\"map\":{\"rings\":48,\"shellRadius\":7008,\"nodes\":[" + nodeJson + "]}},"
                + "\"worldEconomy\":{\"vessels\":{},\"stationEconomies\":{" + economies + "},"
                + "\"simulation\":{\"tickSequence\":0,\"lastSimulatedAt\":\"2175-01-01T00:00:00Z\"}},"
                + "\"submarine\":{\"name\":\"" + json(displayName)
                + " Observer\",\"model\":\"Barsuk\",\"crewRoster\":[]}}}";
    }

    private static Node station(String id, String name, int ring, int level,
                                int x, int y, String biome, String faction) {
        return new Node(id, name, ring, level, x, y, biome, faction, true);
    }

    private static Node location(String id, String name, int ring, int level,
                                 int x, int y, String biome) {
        return new Node(id, name, ring, level, x, y, biome, null, false);
    }

    private static String json(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"")
                .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
    }


    private record Node(String id, String name, int ring, int level, int x, int y,
                        String biome, String faction, boolean station) { }
}
