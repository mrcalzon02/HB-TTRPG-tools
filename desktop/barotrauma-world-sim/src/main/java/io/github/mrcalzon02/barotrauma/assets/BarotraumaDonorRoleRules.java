package io.github.mrcalzon02.barotrauma.assets;

import java.util.List;
import java.util.Locale;

/** Semantic donor-search rules kept separate from cross-client packaged-asset resolution. */
final class BarotraumaDonorRoleRules {
    private BarotraumaDonorRoleRules() { }

    static List<String> preferredPaths(BarotraumaAssetCatalogue.VisualRole role) {
        return switch (role) {
            case APP_BACKGROUND -> List.of("UI/MainMenuBackground.png", "UI/MainMenu/MainMenuBackground.png", "UI/Backgrounds/MainMenuBackground.png");
            case MAP_BACKGROUND -> List.of("Map/MapBackground.png", "UI/MapBackground.png", "UI/CampaignMapBackground.png");
            case PANEL -> List.of("UI/GUIFrame.png", "UI/Frame.png");
            case INNER_PANEL -> List.of("UI/InnerFrame.png");
            case BUTTON -> List.of("UI/GUIButton.png", "UI/Button.png");
            case TAB -> List.of("UI/TabButton.png", "UI/Tab.png");
            case PROGRESS_TRACK -> List.of("UI/ProgressBar.png");
            case PROGRESS_FILL -> List.of("UI/ProgressBarFill.png");
            case LOCATION_MARKER -> List.of("UI/Icons/location.png", "Map/LocationIcon.png");
            case OUTPOST_MARKER -> List.of("UI/Icons/outpost.png", "UI/Icons/station.png");
            case CAVE_MARKER -> List.of("UI/Icons/cave.png", "Map/CaveIcon.png");
            case RUIN_MARKER -> List.of("UI/Icons/ruin.png", "Map/RuinIcon.png");
            case BEACON_MARKER -> List.of("UI/Icons/beacon.png", "Map/BeaconIcon.png");
            case WRECK_MARKER -> List.of("UI/Icons/wreck.png", "Map/WreckIcon.png");
            case SUBMARINE_MARKER -> List.of("UI/Icons/submarine.png", "UI/Icons/sub.png");
            case SHUTTLE_MARKER -> List.of("UI/Icons/shuttle.png");
            case ENEMY_MARKER -> List.of("UI/Icons/enemy.png", "UI/Icons/fauna.png");
            case RADIATION_MARKER -> List.of("UI/Icons/radiation.png");
            case ROUTE_ARROW -> List.of("UI/Icons/arrow.png");
            case BROKEN_STATUS -> List.of("UI/Icons/broken.png");
            case SAVING_STATUS -> List.of("UI/Icons/saving.png");
            case GLOW -> List.of("UI/Icons/glow.png");
            case NOTIFICATION_ICON -> List.of("UI/Icons/notification.png");
            case WARNING_ICON -> List.of("UI/Icons/warning.png");
            case MISSION_ICON -> List.of("UI/Icons/mission.png");
            case RESEARCH_ICON -> List.of("UI/Icons/research.png");
            case CARGO_ICON -> List.of("UI/Icons/cargo.png", "UI/Icons/inventory.png");
            case CURRENCY_ICON -> List.of("UI/Icons/wallet.png", "UI/Icons/money.png");
            case CREW_ICON -> List.of("UI/Icons/crew.png");
            case FAUNA_ICON -> List.of("UI/Icons/fauna.png");
            case GEOLOGY_ICON -> List.of("UI/Icons/ore.png");
            case STATION_ICON -> List.of("UI/Icons/station.png", "UI/Icons/outpost.png");
            case VESSEL_ICON -> List.of("UI/Icons/submarine.png", "UI/Icons/sub.png");
        };
    }

    static int score(BarotraumaAssetCatalogue.VisualRole role, String text) {
        String lower = normalize(text);
        List<String> tokens = switch (role) {
            case APP_BACKGROUND -> List.of("mainmenubackground", "backgroundsprite", "mainmenu");
            case MAP_BACKGROUND -> List.of("mapbackground", "campaignmap", "locationmap", "radiationmap");
            case PANEL -> List.of("guiframe", "frame", "outerframe");
            case INNER_PANEL -> List.of("innerframe", "itemui", "listbox");
            case BUTTON -> List.of("guibutton", "buttonframe", "mainmenuguitextblock");
            case TAB -> List.of("tabbutton", "guitab", "tabframe");
            case PROGRESS_TRACK -> List.of("guiprogressbar", "progressbarbackground", "progresstrack");
            case PROGRESS_FILL -> List.of("progressbarfill", "progressfill");
            case LOCATION_MARKER -> List.of("sublocationicon", "locationicon", "youareherecircle");
            case OUTPOST_MARKER -> List.of("outposticon", "stationicon");
            case CAVE_MARKER -> List.of("caveicon", "cavemarker");
            case RUIN_MARKER -> List.of("ruinicon", "ancientruin");
            case BEACON_MARKER -> List.of("beaconicon", "beaconstation");
            case WRECK_MARKER -> List.of("wreckicon", "wreckmarker");
            case SUBMARINE_MARKER -> List.of("submarinelocationicon", "submarineicon", "subicon");
            case SHUTTLE_MARKER -> List.of("shuttleicon", "shuttlemarker");
            case ENEMY_MARKER -> List.of("enemyicon", "hostileicon", "monstericon");
            case RADIATION_MARKER -> List.of("radiationanimspritesheet", "radiation", "radiationicon");
            case ROUTE_ARROW -> List.of("arrow", "routearrow", "directionarrow");
            case BROKEN_STATUS -> List.of("brokenicon", "damagedicon");
            case SAVING_STATUS -> List.of("savingindicator", "genericthrobber", "savingicon");
            case GLOW -> List.of("uiglowcircular", "uiglow", "pingcircle", "buttonpulse");
            case NOTIFICATION_ICON -> List.of("guinotificationbutton", "speechbubbleicon", "notificationicon");
            case WARNING_ICON -> List.of("warningicon", "iconoverflowindicator", "attentionicon");
            case MISSION_ICON -> List.of("missionicon", "campaignmission", "jobicon");
            case RESEARCH_ICON -> List.of("researchicon", "talentglow", "research");
            case CARGO_ICON -> List.of("cargoicon", "inventoryslot", "itemui");
            case CURRENCY_ICON -> List.of("crewwalleticonsmall", "walletportraitbg", "moneyicon");
            case CREW_ICON -> List.of("crewicon", "crewlist", "charactericon");
            case FAUNA_ICON -> List.of("enemyicon", "fauna", "crawler", "moloch");
            case GEOLOGY_ICON -> List.of("caveicon", "mineral", "oreicon", "geology");
            case STATION_ICON -> List.of("outposticon", "station", "outpost");
            case VESSEL_ICON -> List.of("submarinelocationicon", "submarine", "vessel");
        };
        int score = 0;
        for (int index = 0; index < tokens.size(); index++) {
            String token = normalize(tokens.get(index));
            if (lower.contains(token)) score += 200 - index * 12 + token.length();
        }
        return score;
    }

    private static String normalize(String value) {
        return value.toLowerCase(Locale.ROOT).replace("_", "").replace("-", "").replace(" ", "");
    }
}
