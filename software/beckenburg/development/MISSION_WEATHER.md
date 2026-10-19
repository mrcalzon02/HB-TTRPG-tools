# Mission weather and contract environmental effects

Weather is **contract-level**, not just a PSX overlay. Modes: **FIXED**
(the exact chosen condition stays for the mission), **DYNAMIC** (starts
chosen and may transition every 75–120 host-simulation seconds), and
**RANDOM** (a deterministic, season-appropriate choice at case creation,
not rerolled during each scan). Season follows the host/solo mission date,
never a client-supplied sensor value.

Conditions: CLEAR, RAIN, SNOW, HEATWAVE, THUNDERSTORM, WIND, FOG.
Independent severity **1–3**. Multiplayer's lobby contract exposes
mode/starting condition/severity; solo mission setup exposes the same.

Host sends `WEATHER|season|condition|mode|intensity|revision` when entering
the world, on match start, and when a dynamic condition changes. Late
joiners recover current state. The state updates the same environmental
EMF and thermometer sampling used by the standard scans and tiered tools.
Thunder raises ordinary EMF, snow reduces normal baseline; **only a real
local high-energy ghost event can yield EMF 8–10**. Ambient temperatures
change due to season/hour/weather, heating/insulation and local spectral
events. Natural freezing remains naturally freezing—not automatic proof.

Procedural weather beds run outside the soundtrack/Frenzy music channel,
respect effects volume, are damped indoors, and can play on systems with
no external sound assets. Wind/rain mask authorized spatial sound cues
and reduce hunter sounds audible to AI/human ghosts. Weather does not
generate player footstep, ghost, or evidence events. Sky receives
overcast, subdued light and a simple distant rain/snow layer, with solid
world geometry still responsible for occlusion.

Weather severity also contributes a small additional difficulty indicator;
it does not replace party-size challenge or ghost aggression.

`MissionWeatherTest` verifies deterministic schedules, freeze/thunder
sensor behavior, temperature integrity, noise masking and generated PCM.
Full visual and real-device audio checks require a local playable build.
