(() => {
  'use strict';

  function build() {
    const mount = document.getElementById('character-sheet-mount');
    if (!mount || mount.dataset.built === 'true') return;
    mount.dataset.built = 'true';
    mount.innerHTML = `
      <div class="utility-shell">
        <aside class="toolbox no-print" aria-label="Character sheet controls">
          <h3>Sheet Controls</h3>
          <label class="control-label" for="sheet-title">Sheet title</label>
          <input id="sheet-title" class="tool-input" value="AD and D 3.5 - Hypertext D20 compatible character sheet">
          <p class="control-label">Panel layout</p>
          <div class="segmented-control" role="group" aria-label="Panel layout">
            <button class="layout-button" data-layout="2">2</button>
            <button class="layout-button" data-layout="3">3</button>
            <button class="layout-button active" data-layout="4">4</button>
          </div>
          <button id="print-sheet" class="primary-action">Print / Save as PDF</button>
          <button id="export-json" class="secondary-action">Export Character JSON</button>
          <label class="secondary-action file-action" for="import-json">Import Character JSON</label>
          <input id="import-json" type="file" accept="application/json" hidden>
          <button id="reset-sheet" class="danger-action">Clear Sheet</button>
          <p class="helper-note">This creates a print-ready PDF using the browser print dialog. In most browsers, choose “Save as PDF.”</p>
        </aside>
        <form id="character-sheet" class="character-sheet" autocomplete="off">
          <header class="sheet-banner"><h2 id="print-title">AD and D 3.5 - Hypertext D20 compatible character sheet</h2><p>Homebrew-ready d20 fantasy character record</p></header>
          <div id="panel-grid" class="panel-grid panels-4">
            <section class="sheet-panel identity-panel">
              <h3>Character Information</h3>
              <div class="field-grid two-col">
                <label>Character Name<input name="characterName" type="text"></label><label>Player<input name="playerName" type="text"></label>
                <label>Class / Levels<input name="classLevels" type="text"></label><label>Race<input name="race" type="text"></label>
                <label>Alignment<input name="alignment" type="text"></label><label>Deity / Patron<input name="deity" type="text"></label>
                <label>Size<input name="size" type="text"></label><label>Experience<input name="experience" type="text"></label>
              </div>
              <h4>Description</h4>
              <div class="field-grid three-col compact">
                <label>Age<input name="age" type="text"></label><label>Gender<input name="gender" type="text"></label><label>Height<input name="height" type="text"></label>
                <label>Weight<input name="weight" type="text"></label><label>Eyes<input name="eyes" type="text"></label><label>Hair<input name="hair" type="text"></label>
                <label>Skin<input name="skin" type="text"></label><label>Homeland<input name="homeland" type="text"></label><label>Campaign<input name="campaign" type="text"></label>
              </div>
              <label class="wide-label">Character Notes<textarea name="characterNotes" rows="5"></textarea></label>
            </section>
            <section class="sheet-panel stats-panel">
              <h3>Stats, Saves, and Combat Basics</h3>
              <div class="ability-table">
                <div class="table-row table-head"><span>Ability</span><span>Score</span><span>Mod</span><span>Temp</span></div>
                ${['str','dex','con','int','wis','cha'].map(ability => `<div class="table-row"><strong>${ability.toUpperCase()}</strong><input name="${ability}Score" class="ability-score" data-mod-target="${ability}Mod" type="number"><input name="${ability}Mod" readonly><input name="${ability}Temp" type="number"></div>`).join('')}
              </div>
              <div class="field-grid three-col compact combat-grid">
                <label>HP Max<input name="hpMax" type="number"></label><label>HP Current<input name="hpCurrent" type="number"></label><label>Nonlethal<input name="nonlethal" type="number"></label>
                <label>AC<input name="armorClass" type="number"></label><label>Touch<input name="touchAc" type="number"></label><label>Flat-Footed<input name="flatFootedAc" type="number"></label>
                <label>Initiative<input name="initiative" type="number"></label><label>Speed<input name="speed" type="text"></label><label>Base Attack<input name="baseAttack" type="text"></label>
                <label>Grapple<input name="grapple" type="text"></label><label>Spell Resist<input name="spellResist" type="text"></label><label>Damage Red.<input name="damageReduction" type="text"></label>
              </div>
              <h4>Saving Throws</h4>
              <div class="save-table">
                <div class="table-row table-head"><span>Save</span><span>Base</span><span>Ability</span><span>Magic</span><span>Misc</span><span>Total</span></div>
                ${[['fort','Fort'],['ref','Ref'],['will','Will']].map(([id,label]) => `<div class="table-row save-row" data-save="${id}"><strong>${label}</strong><input name="${id}Base" type="number"><input name="${id}Ability" type="number"><input name="${id}Magic" type="number"><input name="${id}Misc" type="number"><input name="${id}Total" readonly></div>`).join('')}
              </div>
            </section>
            <section class="sheet-panel skills-panel"><h3>Skills</h3><div class="skill-table" id="skill-table" aria-label="Skill list"></div></section>
            <section class="sheet-panel gear-panel">
              <h3>Weapons, Armor, and Equipment</h3>
              <h4>Weapons</h4>
              <div class="weapon-table">
                <div class="table-row table-head"><span>Weapon</span><span>Attack</span><span>Damage</span><span>Critical</span><span>Range</span><span>Notes</span></div>
                ${[1,2,3,4].map(index => `<div class="table-row"><input name="weapon${index}"><input name="weapon${index}Atk"><input name="weapon${index}Dmg"><input name="weapon${index}Crit"><input name="weapon${index}Range"><input name="weapon${index}Notes"></div>`).join('')}
              </div>
              <h4>Armor / Shield / Protection</h4>
              <div class="field-grid two-col compact">
                <label>Armor<input name="armorName" type="text"></label><label>Shield<input name="shieldName" type="text"></label>
                <label>Armor Bonus<input name="armorBonus" type="number"></label><label>Shield Bonus<input name="shieldBonus" type="number"></label>
                <label>Max Dex<input name="maxDex" type="text"></label><label>Armor Check<input name="armorCheck" type="text"></label>
              </div>
              <label class="wide-label">Equipment<textarea name="equipment" rows="6"></textarea></label>
              <label class="wide-label">Feats, Traits, Features, and Special Abilities<textarea name="features" rows="6"></textarea></label>
              <label class="wide-label">Spells / Powers / Prepared Notes<textarea name="spells" rows="6"></textarea></label>
              <label class="wide-label">Treasure and Currency<textarea name="treasure" rows="4"></textarea></label>
            </section>
          </div>
        </form>
      </div>`;
    document.dispatchEvent(new CustomEvent('hb:character-sheet-mounted'));
  }

  build();
})();
