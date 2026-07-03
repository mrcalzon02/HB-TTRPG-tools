(() => {
  'use strict';

  const TRANSCRIPT_KEY = 'hb-ttrpg-tools-blacklight-charles-induction-transcript-v1';

  function installTranscriptField() {
    const form = document.getElementById('blacklight-character-form');
    if (!form) return;
    let field = form.elements.inductionTranscript;
    if (!field) {
      const mission = form.elements.missionRecord;
      const grid = mission?.closest('.blacklight-field-grid');
      if (!grid) return;
      const label = document.createElement('label');
      label.className = 'blacklight-wide-label';
      label.style.gridColumn = '1 / -1';
      label.append(document.createTextNode('Charles Induction Transcript'));
      field = document.createElement('textarea');
      field.name = 'inductionTranscript';
      field.rows = 12;
      field.placeholder = 'Recorded operative answers and Charles responses appear here.';
      label.appendChild(field);
      grid.appendChild(label);
    }
    const transcript = localStorage.getItem(TRANSCRIPT_KEY) || '';
    if (transcript) field.value = transcript;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', installTranscriptField, { once: true });
  else installTranscriptField();
})();
