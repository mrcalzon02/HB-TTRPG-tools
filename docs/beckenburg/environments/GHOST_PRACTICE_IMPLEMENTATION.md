# Beckenburg Alpha 0.6 — Human Ghost Local Practice

This implementation is a real, user-controllable, separate Swing client mode for
**local practice only**. It establishes a HUMAN controller for the previously
implemented, shared `GhostDomain.Command` dispatcher. It does not fake a LAN lobby,
multiplayer synchronization, AI ghost parity over a network, or a finished
asymmetrical match.

## Implemented and integrated
- `GhostPracticeSession`: owns one real ghost domain, a time-stepped deterministic
  practice encounter and a deliberately simple hunter target. Reads the same
  filtered `GhostDomain.Observation` available to the existing AI controller.
  Uses only HUMAN-origin commands through the shared dispatcher. The practice
  target remains in the starting room long enough to teach hunt phases and then
  patrols; its true room is withheld unless locally sensed.
- `GhostPracticePanel`: operational menu-selected spectral 3D view, restricted room
  phasing, action key bindings, ability availability and energy readout,
  actionable rejection messages, room sensing and a fair two-strike exercise.
  Escape returns safely to the functioning hunter mode.
- `SceneRenderer`: retains the hunter experience while offering a second render
  entry point. The ghost view does not render hidden investigator coordinates;
  a deliberately low-poly trainee figure is drawn only when in a room the ghost
  currently senses.
- `GhostPracticeTest` and `GhostPracticeGuiTest`: command legality, 2-strike
  encounter, cooldown/no early lethal chain, hidden target, bad van teleport,
  menu-to-3D transition, view capture, return-to-menu, original hunter availability.

## Acceptance run
From a clean source copy run `sh build.sh`, then if a Linux graphical display is
available: `xvfb-run -a java -cp build/classes:build/test
org.beckenburg.GhostPracticeGuiTest review/ghost-practice-gui.png` and
`xvfb-run -a java -cp build/classes:build/test org.beckenburg.GuiSmokeTest
review/hunter-gui.png`. Compiler targets Java 17, local runtime is JDK 21.

## Deferred
Full remote host authority, hunter movement/aiming, ghost physical movement,
real evidence deception, PvP fairness and content roster require the relevant
P06–P10 and P18 gates. The 3D image is programmer placeholder geometry, not the
approved concept-art model, and the nine environment boards in Drive are not
proven committed as GitHub binary images.
