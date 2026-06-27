# CHRONICLE SPATIAL ENGINE: MASTER SPECIFICATION & ARCHITECTURE GOVERNANCE

**Target Environment:** GitHub Pages (Static-Serverless Web Client)  
**Data Layer Goal:** 70 deep-thematic entries per module line across VTM, WTA, MTA, WTO, CTD

## 1. SERVERLESS STATIC ARCHITECTURE & SPATIAL INTERPOLATION

Because this tool operates natively on GitHub Pages without a traditional server-side runtime engine or SQL database, data persistence, lookups, and anti-spam controls are handled via client-side deterministic data mapping.

### A. Deterministic Seed Generation (Anti-Spam Layer)

To prevent infinite random variations when a storyteller or player spams the generation button on an identical city block, the system extracts the geocoded coordinates and processes them through a client-side hashing routine, such as MurmurHash3, to generate a stable 32-bit integer.

- The derived integer serves as the pseudo-random generator seed.
- **Result:** An identical address or block bounding coordinate will always render the exact same gothic lore layout from the 70-entry pool, standardizing the world without an active central database.

### B. User Session & State Management

Tailored modifications, custom story tracking notes, or active changes to the local layout made by the Storyteller are tracked via the browser's native `localStorage` or `IndexedDB` engines. These deltas dynamically overlay and overwrite the baseline core static templates when a matching spatial token is queried.

---

## 2. PRODUCTION ARCHITECTURE LAYOUT DIRECTORY

```text
/index.html
/css/style.css
/data/locations_core.json
/data/characters_core.json
/data/rumors_core.json
```

- `/index.html` — Main layout interface and core JavaScript execution engine.
- `/css/style.css` — High-contrast, custom gothic-punk UI layout styles.
- `/data/locations_core.json` — 70-entry spatial domain variations.
- `/data/characters_core.json` — 70-entry detailed character profiling and tenure data.
- `/data/rumors_core.json` — 70-entry atmospheric sensory and scanner chatter scripts.

---

## 3. REAL-WORLD BUSINESS OVERLAY & GOVERNANCE RULES

The original architectural example uses the `google.maps.places.Place` class to capture clicks on native Google Maps business icons, extract the `placeId`, suppress standard Google information windows, and execute a dark-world subversion layout.

### A. Thematic Type-Mapping Directives

Real-world metadata maps to supernatural infrastructure through client-side conversion routing:

- `restaurant`, `bar`, and `night_club` → Vampiric Circulatory Nodes / Anarch Havens
- `book_store` and `library` → Hermetic Chantry Archives / Occult Libraries
- `hospital` and `pharmacy` → Blood Bank Depots / Mage Alchemical Laboratories
- `cemetery` and `park` → Shadowlands Verges / Werewolf Caern Borders

### B. Business Claim and Verification Flags

1. **UNCLAIMED — Standard Matrix Default**  
   Operates on deterministic coordinate seed indexes.

2. **OPT-OUT — Mundane Disconnect**  
   All programmatic connections to external lore tables are severed. The address is treated as a structural narrative blackout zone and remains completely mundane.

3. **SUPPORTIVE — Part of the Veil**  
   Triggers a neon marker filter overlay on the UI map canvas, signaling that the establishment actively welcomes live interactive storytelling, cosplay, and community presence within its real-world facilities.

---

## 4. INTEGRATED FRONTEND DEPLOYMENT CLIENT

The original example architecture supplied with the specification follows this interaction contract:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>World of Darkness: Chronicle Mapping Matrix</title>
  <script async src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&v=alpha&libraries=places,marker"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #0c0c0c;
      color: #dcdcdc;
      font-family: 'Courier New', Courier, monospace;
    }

    #wrapper {
      display: flex;
      height: 100vh;
      width: 100vw;
    }

    #sidebar {
      width: 420px;
      padding: 25px;
      background: #121212;
      overflow-y: auto;
      box-shadow: 4px 0 15px #000;
      border-right: 1px solid #2e0854;
    }

    #map-frame {
      flex-grow: 1;
      height: 100vh;
      background: #1a1a1a;
    }

    h1, h2, h3 {
      color: #8b0000;
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .pane-card {
      background: #181818;
      padding: 15px;
      margin: 15px 0;
      border: 1px solid #333;
      border-left: 5px solid #8b0000;
    }

    button {
      width: 100%;
      padding: 12px;
      margin-top: 10px;
      background: #2a0845;
      color: #fff;
      border: 1px solid #6441a5;
      cursor: pointer;
      text-transform: uppercase;
      font-weight: bold;
    }

    button:hover {
      background: #6441a5;
    }

    select, textarea, input {
      width: 100%;
      padding: 8px;
      margin: 8px 0;
      background: #222;
      color: #fff;
      border: 1px solid #444;
      box-sizing: border-box;
    }

    .veil-active {
      border-left-color: #00ffcc !important;
      box-shadow: 0 0 10px rgba(0, 255, 204, 0.2);
    }
  </style>
</head>
<body>
  <div id="wrapper">
    <div id="sidebar">
      <h2>Chronicle Ley-Line Tracker</h2>
      <p>Click any landmark or commercial point of interest on the interactive map layer to extract its hidden matrix variables.</p>
      <div id="display-matrix">
        <div class="pane-card">
          <h3>No Domain Selected</h3>
          <p>Awaiting structural data input from geocoding layers...</p>
        </div>
      </div>
    </div>
    <div id="map-frame"></div>
  </div>

  <script>
    let map;
    let activePlaceId = null;

    async function initMap() {
      const { Map } = await google.maps.importLibrary('maps');
      map = new Map(document.getElementById('map-frame'), {
        zoom: 14,
        center: { lat: 61.2181, lng: -149.9003 },
        mapId: '4504f8b37365c3d0',
        disableDefaultUI: false
      });

      map.addListener('click', async event => {
        if (event.placeId) {
          event.stop();
          activePlaceId = event.placeId;
          await extractSupernaturalOverlay(event.placeId);
        }
      });
    }

    async function extractSupernaturalOverlay(placeId) {
      const { Place } = await google.maps.importLibrary('places');
      const targetPlace = new Place({ id: placeId });

      try {
        await targetPlace.fetchFields({
          fields: ['displayName', 'primaryType', 'formattedAddress']
        });
        const registry = JSON.parse(localStorage.getItem(`poi_${placeId}`)) || null;
        renderControlSidebar(targetPlace, registry);
      } catch (error) {
        console.error('Error analyzing spatial parameters:', error);
      }
    }

    function renderControlSidebar(place, registry) {
      const displayDiv = document.getElementById('display-matrix');
      const isOptedOut = registry ? registry.opt_out : false;
      const interaction = registry ? registry.veil_interaction : 'STANDARD_UNCLAIMED';
      let gothicType = `Subverted Complex (${place.primaryType})`;

      if (place.primaryType === 'restaurant' || place.primaryType === 'bar') {
        gothicType = 'Vampiric Circulatory Node / Anarch Haven';
      }

      if (place.primaryType === 'book_store' || place.primaryType === 'library') {
        gothicType = 'Hermetic Chantry Archives';
      }

      let contentHtml = '';

      if (isOptedOut) {
        contentHtml = `
          <div class="pane-card">
            <h3>${place.displayName}</h3>
            <p style="color: #666;">[MUNDANE DISCONNECT ACTIVE]</p>
            <p>The operators of this venue have executed an exclusion mandate. This footprint remains completely inert.</p>
          </div>`;
      } else {
        contentHtml = `
          <div class="pane-card ${interaction === 'SUPPORTIVE' ? 'veil-active' : ''}">
            <h3>${place.displayName}</h3>
            <p><strong>Real Address:</strong> ${place.formattedAddress}</p>
            <p><strong>Gothic Registry:</strong> ${gothicType}</p>
            <hr style="border-color:#222;">
            <p><strong>Current Lore Data:</strong></p>
            <p>${registry && registry.submitted_lore ? registry.submitted_lore.public_facade : 'No lore submitted. System is operating on deterministic template defaults.'}</p>
            <p><strong>Veil Interaction Profile:</strong> <span>${interaction}</span></p>
          </div>`;
      }

      contentHtml += `
        <div class="pane-card" style="border-left-color: #6441a5;">
          <h3>System Administration</h3>
          <label>Chronicle Interaction Status Layer:</label>
          <select id="config-veil">
            <option value="STANDARD_UNCLAIMED" ${interaction === 'STANDARD_UNCLAIMED' ? 'selected' : ''}>Standard Unclaimed</option>
            <option value="SUPPORTIVE" ${interaction === 'SUPPORTIVE' ? 'selected' : ''}>Supportive (Part of the Veil)</option>
            <option value="OPT_OUT" ${isOptedOut ? 'selected' : ''}>Opt-Out (Purge All Lore Maps)</option>
          </select>
          <label>Lore / Faction Governance Directives:</label>
          <textarea id="config-lore" rows="4" placeholder="Enter custom narrative elements...">${registry && registry.submitted_lore ? registry.submitted_lore.public_facade : ''}</textarea>
          <button onclick="commitBusinessRegistryChanges('${place.id}')">Submit Custom Domain Claims</button>
        </div>`;

      displayDiv.innerHTML = contentHtml;
    }

    function commitBusinessRegistryChanges(placeId) {
      const veilSelection = document.getElementById('config-veil').value;
      const loreText = document.getElementById('config-lore').value;
      const payload = {
        place_id: placeId,
        claimed: true,
        opt_out: veilSelection === 'OPT_OUT',
        veil_interaction: veilSelection,
        submitted_lore: { public_facade: loreText }
      };

      localStorage.setItem(`poi_${placeId}`, JSON.stringify(payload));
      alert(`Registry data updated for POI Reference Node: ${placeId}`);
      extractSupernaturalOverlay(placeId);
    }

    window.addEventListener('load', initMap);
  </script>
</body>
</html>
```

---

## DEPLOYMENT AMENDMENT: NO-PAID-API CLIENT

The current implementation deliberately does not use the paid Google Maps JavaScript or Places APIs. It retains the governance, deterministic seeding, business type routing, claim flags, local overrides, 70-entry core datasets, and central registry concepts while replacing direct Place API extraction with:

- a no-key embedded Google Maps client view;
- a full Google Maps launch window;
- manual capture of the business name, address, share URL, type, latitude, and longitude;
- deterministic `gmaps-xxxxxxxx` business keys derived from normalized real-world location data;
- prefilled repository issues containing validated central-registry patches;
- an explicit owner-run GitHub workflow that writes approved entries to `data/world-of-darkness/poi_registry.json`.

This amendment preserves a zero-Google-API-cost GitHub Pages deployment while maintaining cross-browser deterministic lookup and centrally committed business overrides.
