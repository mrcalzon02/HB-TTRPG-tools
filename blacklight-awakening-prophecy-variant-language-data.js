(()=>{
  'use strict';
  window.BAP_VARIANT_DATA=window.BAP_VARIANT_DATA||{};
  window.BAP_VARIANT_DATA.DAMAGE_FORMS=[
    'A vertical tear removes the sentence naming the first witness.',
    'The next line survives only as pressure dents beneath the ink.',
    'Three words remain where a full stanza was deliberately scraped away.',
    'The copy skips forward by one breath and resumes in a different hand.',
    'A water stain preserves the verbs but takes every proper name.',
    'The recording loses sound exactly where the speaker identifies the place.',
    'The margin has been cut away with a blade too clean for age.',
    'A second scribe has blacked out the object but left its shadow described.',
    'The surviving paper remembers heat around a sentence no longer present.',
    'Two lines are mirrored backward and cannot be restored with confidence.',
    'The archive contains a gap the size of one oath and one human name.',
    'The final clause was removed before the document entered Blacklight custody.',
    'Only the punctuation survives from the sentence between these warnings.',
    'The witness coughs through the missing passage and returns speaking older words.',
    'A strip of silver leaf covers whatever stood between the two surviving images.',
    'The translation fails on a noun that may mean city, body, office, or grave.',
    'The plate is cracked across the figure responsible for the act.',
    'A child’s handwriting replaces one sentence and then abruptly stops.',
    'The transcript marks eleven seconds of speech that no recorder captured.',
    'The page number advances twice although no sheet appears to be missing.',
    'The erased portion can still be felt as raised fibers under the reader’s thumb.',
    'A censor removed the location but accidentally preserved its weather.',
    'The sentence naming the beneficiary is present only in ultraviolet scoring.',
    'The next phrase was overwritten by an inventory number from another century.',
    'The manuscript changes language mid-line and never translates the subject.',
    'A burned edge leaves only the words “before the second refusal.”',
    'The sound file contains a door closing where the missing stanza should be.',
    'The oracle’s mouth continues moving for nine silent seconds.',
    'A legal seal obscures the one line everyone later claimed not to read.',
    'The final noun has been replaced by six mutually contradictory annotations.',
    'A duplicate copy preserves the same gap with different surrounding words.',
    'The damaged section smells of rain despite being stored below ground.',
    'The missing sentence is quoted by three later sources, none in agreement.',
    'A thread of red ink exits the page where the absent line once continued.',
    'The archive index insists a paragraph exists that the document does not contain.',
    'The witness repeats the missing words in sleep but never in the same order.',
    'A geometric burn removes every reference to direction.',
    'The translation engine refuses the passage as if it were an instruction.',
    'The copy resumes after a gap marked only by a handprint facing inward.',
    'The final line was folded into the binding and cannot be opened without destroying it.',
    'Someone replaced the missing stanza with a list of unrelated casualties.',
    'The page retains a rectangle of clean paper where an image was lifted away.',
    'The speaker changes voice during the absent portion and never changes back.',
    'A notation says “do not restore,” but gives no author or date.',
    'The recovered fragment ends one sentence early in every surviving copy.',
    'An ink bloom hides the verb while leaving the victim and consequence legible.',
    'The omitted words appear as condensation whenever the file is opened.',
    'The line is intact, but no two readers remember the same wording afterward.'
  ];

  window.BAP_VARIANT_DATA.WORD_SWAPS=[
    [/\bbegins\b/gi,['stirs','takes its first breath','finds motion']],
    [/\bbegin\b/gi,['stir','take breath','find motion']],
    [/\bbecomes\b/gi,['is remade as','is counted among','takes the shape of']],
    [/\bbecome\b/gi,['be remade as','be counted among','take the shape of']],
    [/\bappears\b/gi,['arrives','steps into notice','is found standing']],
    [/\bappear\b/gi,['arrive','step into notice','stand revealed']],
    [/\bremains\b/gi,['endures','refuses departure','keeps its place']],
    [/\bremain\b/gi,['endure','refuse departure','keep their place']],
    [/\bopens\b/gi,['unseals','learns an entrance','parts without permission']],
    [/\bopen\b/gi,['unseal','learn an entrance','part without permission']],
    [/\bcloses\b/gi,['seals itself','forgets the road','denies passage']],
    [/\bfalls\b/gi,['is brought down','kneels without consent','descends']],
    [/\brises\b/gi,['stands up beneath the world','ascends','lifts itself into witness']],
    [/\bworld\b/gi,['age','earth','common order']],
    [/\bdoor\b/gi,['threshold','entrance','hinged law']],
    [/\broad\b/gi,['path','route','remembered way']],
    [/\bblood\b/gi,['lineage','red inheritance','living debt']],
    [/\bdead\b/gi,['unburied','departed','those beyond breath']],
    [/\bweapon\b/gi,['instrument of injury','armed relic','engine of harm']],
    [/\bwitness\b/gi,['observer','remembering mouth','one who saw']],
    [/\bwitnesses\b/gi,['observers','remembering mouths','those who saw']],
    [/\bsecret\b/gi,['concealed thing','hidden article','unspoken fact']],
    [/\blaw\b/gi,['rule','binding order','jurisdiction']],
    [/\barmy\b/gi,['host','ranked multitude','war-body']],
    [/\bcity\b/gi,['metropolis','inhabited machine','civic body']],
    [/\bchild\b/gi,['young witness','unseasoned heir','small inheritor']],
    [/\bchildren\b/gi,['young witnesses','unseasoned heirs','small inheritors']],
    [/\bmemory\b/gi,['remembrance','kept past','inner archive']],
    [/\bdream\b/gi,['sleeping vision','night-memory','unwaking road']],
    [/\bfire\b/gi,['flame','red weather','burning mouth']],
    [/\bgrave\b/gi,['burial threshold','earth-mouth','place beneath names']],
    [/\bshadow\b/gi,['second outline','unlit double','dark remainder']],
    [/\bkingdom\b/gi,['realm','crowned territory','sovereign domain']],
    [/\btreaty\b/gi,['compact','written peace','binding accord']],
    [/\bcrown\b/gi,['sovereign weight','diadem','authority made visible']],
    [/\bmachine\b/gi,['engine','obedient apparatus','constructed servant']],
    [/\bvoice\b/gi,['speaking breath','borrowed tongue','sound with intention']],
    [/\bvoices\b/gi,['speaking breaths','borrowed tongues','sounds with intention']]
  ];

  function mountSourceDiegeticLayer(){
    if(document.getElementById('bap-source-diegetic-data'))return;
    const data=document.createElement('script');
    data.id='bap-source-diegetic-data';
    data.src='blacklight-awakening-prophecy-source-diegetic-data.js';
    data.onload=()=>{
      if(document.getElementById('bap-source-diegetic-engine'))return;
      const engine=document.createElement('script');
      engine.id='bap-source-diegetic-engine';
      engine.src='blacklight-awakening-prophecy-source-diegetic-engine.js';
      document.head.appendChild(engine);
    };
    document.head.appendChild(data);
  }
  mountSourceDiegeticLayer();
})();
