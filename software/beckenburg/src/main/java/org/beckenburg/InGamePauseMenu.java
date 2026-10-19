package org.beckenburg;

import java.awt.Component;
import javax.swing.JOptionPane;

/** Universal field pause/leave control: never requires physically finding VAN. */
public final class InGamePauseMenu {
    private InGamePauseMenu(){}
    public enum Action { RESUME, RETURN_TO_LOBBY, EXIT_GAME }
    public static String[] options(){return new String[]{"Resume", "Return to Lobby", "Exit Game"};}
    public static boolean confirmExit(Component parent){
        return JOptionPane.showConfirmDialog(parent,
            "Exit Beckenburg now? An active investigation will not receive a payout.",
            "Exit Game",JOptionPane.YES_NO_OPTION,JOptionPane.WARNING_MESSAGE)
            ==JOptionPane.YES_OPTION;
    }
    public static Action choose(Component parent){
        int selection=JOptionPane.showOptionDialog(parent,
            "Investigation paused", "Beckenburg / Pause",
            JOptionPane.DEFAULT_OPTION,JOptionPane.QUESTION_MESSAGE,
            null,options(),options()[0]);
        return switch(selection){
            case 1 -> Action.RETURN_TO_LOBBY;
            case 2 -> confirmExit(parent)?Action.EXIT_GAME:Action.RESUME;
            default -> Action.RESUME;
        };
    }
    public static void execute(Component parent){
        Action requested=choose(parent);
        if(requested==Action.EXIT_GAME)System.exit(0);
        if(requested==Action.RETURN_TO_LOBBY){
            java.awt.Window window=javax.swing.SwingUtilities.getWindowAncestor(parent);
            if(window!=null)window.dispose();
        }else if(parent!=null)parent.requestFocusInWindow();
    }
}
