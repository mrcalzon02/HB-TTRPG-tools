(()=>{
  'use strict';

  const profiles=window.BAP_SOURCE_DIEGETIC?.profiles;
  if(!profiles)return;

  profiles.Charles={
    label:'Charles continuity reconstruction',
    artifacts:[
      'The Brass Sepulcher recension of the Book of the Star That Died Before Dawn',
      'A copper-leaf prophecy of the Keepers of the Ninth Well',
      'The Testament of the Forty-Ninth Astrologer, copied from smoke-darkened vellum',
      'A caravanserai manuscript of the Brotherhood of the Sleepless Tomb',
      'The Seven Lamps commentary on the god whose heart lies beneath the salt desert',
      'A forbidden astronomical table from the House of the Veiled Meridian',
      'The Black Date-Palm homily of the nameless desert king',
      'An ivory folio attributed to the Mouth of the Drowned Star',
      'The Vizier of Ashes’ gloss upon the death of the First Sleeper',
      'A brass astrolabe inscription from an observatory sealed before its builders were born',
      'The Book of Forty Doors, in the recension belonging to no living library',
      'A funerary sermon of the Sons of the Hollow Moon, preserved in desert glass'
    ],
    titleFrames:[
      'The Parable of {title}','The Night of {title}','The Brass Tablet of {title}','{title} Beneath the Ninth Lamp',
      'The Astrologer’s Warning Concerning {title}','The Secret Name of {title}','The Forty-Ninth Commentary on {title}','{title} in the House of the Buried Star',
      'The Vizier’s Dream of {title}','The Testament of {title}','The Caravan of {title}','The Recitation of {title} Before the Sealed Well'
    ],
    openings:[
      'Attend, O keeper of the final lamp, and mistake not the silence of the dead for absence.',
      'In the year when the red star cast no shadow, the astrologers found a second night hidden beneath the first.',
      'The old scribe began with praise for no living king, but for the one whose throne lies under the sand and whose dreams rise through stone.',
      'At the caravanserai of the western waste, a traveler without a face purchased water with a prophecy and departed before arriving.',
      'The vizier sealed the chamber with brass and salt, yet at dawn every lock bore the imprint of an inward-opening hand.',
      'Beneath the ninth lamp the reciter spoke of a god slain before mankind learned death, whose body remains divided among the stars.',
      'The astronomers lowered their instruments and listened, for the constellation had begun pronouncing their names.',
      'A blind jurist of the hidden court declared that the dead god still possessed a throne because the world continued obeying its wound.',
      'The keeper of the well found the water black, though every vessel drawn from it reflected a different moon.',
      'The first line was written in saffron, the second in ash, and the third in a substance the scribe would not name.',
      'At midnight the bronze doors perspired salt and the dead god’s title appeared upon them in a script older than speech.',
      'What is buried beneath the desert is not sleeping, for sleep belongs only to the living.'
    ],
    turns:[
      'Thereafter consequence became the father of cause, and the child devoured both their names.',
      'The same figure was servant, betrayer, vessel, and inheritance, and each title opened a different door.',
      'The astrologer’s numbers became a hymn, and the hymn became an instruction written upon the inside of the tongue.',
      'The tomb became a gate, the gate became a mouth, and the mouth remembered the first command spoken into darkness.',
      'The king was a city, the city a body, the body a covenant, and the covenant a wound that remembered authority.',
      'The verse denied the verse before it, and both were received beneath the same lamp.',
      'Mercy and catastrophe differed only in the hand permitted to name them.',
      'The lamps were counted again, and one more burned than the chamber had been built to hold.',
      'The event had already occurred in the dreams of those who would later cause it.',
      'The faithful disputed whether the dead god was summoned, remembered, inherited, or restored by the hunger of the world.',
      'The vessel wore the deity’s face, and the warning was received as permission.',
      'The constellation moved across the page while the heavens remained still.'
    ],
    lacunae:[
      '…',
      '— — —',
      '…beneath the ninth lamp…',
      '…and the sealed well answered…',
      '…the name was ash upon the tongue…',
      '…before the third star died…',
      '…forty doors; one key; no hand…',
      '…he drank and remembered no water…',
      '…the desert replied in the voice of brass…',
      '…no moon, no witness, no mercy…',
      '…the mouth beneath the tomb opened…',
      '…and the dead king dreamed of dawn…'
    ],
    endings:[
      'Thus the final lamp was extinguished, though its shadow continued burning upon the wall.',
      'The wise departed before dawn; the faithful remained to hear the tomb breathe.',
      'Whoever repeats the final verse becomes the road by which its answer travels.',
      'The well was sealed with forty names, and every name awoke thirsty.',
      'At sunrise the caravan possessed one traveler more and remembered one traveler less.',
      'The astrologers broke their instruments, but the dead star continued measuring them.',
      'The vizier bowed toward the empty throne and found his own shadow seated there.',
      'No king inherited the warning; the warning inherited the kingdom.',
      'The desert covered the temple, yet each grain of sand retained one syllable of the hymn.',
      'The last scribe washed his hands, and the ink appeared beneath his skin.',
      'The god remained dead, and therefore nothing living could command it to be silent.',
      'When the final door opened, the faithful discovered they had built the chamber on the other side.'
    ],
    sourceReadings:[
      'Cult-scripture rule: kings, viziers, wells, lamps, stars, tombs, and caravans are offices within the parable. Any one of them may correspond to a person, institution, territory, lineage, or mechanism.',
      'Dead-god cult reading: death is treated as a change of jurisdiction rather than an ending. References to burial may describe containment, enthronement, dispersal, or the creation of a vessel.',
      'Astrological reading: the cult measures sequence through conjunction, shadow, and repetition rather than calendar time. A later event may be described as the parent of an earlier one.',
      'Sectarian warning: rival recensions often preserve the same prophetic function while assigning different names to the dead god, its vessel, and the hand that opens the tomb.'
    ],
    swaps:[
      [/\bdoor\b/gi,['brass gate','sealed door','threshold of forty names']],
      [/\broad\b/gi,['caravan road','path beneath the red star','way of salt and shadow']],
      [/\blaw\b/gi,['judgment of the hidden court','ordinance beneath the ninth lamp','binding word']],
      [/\barmy\b/gi,['host beneath the banners','caravan of spears','multitude of the sealed tomb']],
      [/\bwitness(?:es)?\b/gi,['sworn scribe','keeper of the lamp','one who watched beneath the astrolabe']],
      [/\bweapon\b/gi,['bronze instrument','relic of the buried king','blade inscribed with a starless verse']],
      [/\bchild\b/gi,['young heir of the well','child of the red conjunction','unlettered vessel']],
      [/\bdead\b/gi,['enthroned beneath the earth','silent beyond breath','those whose tombs still issue commands']]
    ]
  };

  const option=document.querySelector('#prophecy-source option[value="Charles"]');
  if(option)option.textContent='Dead-god cult scripture';

  const output=document.getElementById('prophecy-output');
  if(!output)return;

  function cleanCultRecord(record){
    if(record.dataset.sourceFamily!=='Charles'||record.dataset.deadGodCultClean==='1')return;
    record.querySelectorAll('.event-fragment blockquote,.prophecy-major blockquote').forEach(block=>{
      block.textContent=block.textContent
        .replace(/\bBranch evidence:\s*/gi,'')
        .replace(/\bObserved function:\s*/gi,'')
        .replace(/\bCross-source convergence indicates that\s*/gi,'')
        .replace(/\bOperationally relevant image:\s*/gi,'')
        .replace(/\boperational\b/gi,'ritual')
        .replace(/\bmodel\b/gi,'commentary')
        .replace(/\bbranch(?:es)?\b/gi,'recension')
        .replace(/\bforecast\b/gi,'augury');
    });
    record.dataset.deadGodCultClean='1';
  }

  let queued=false;
  function process(){
    output.querySelectorAll('.prophecy-record').forEach(cleanCultRecord);
  }
  function schedule(){
    if(queued)return;
    queued=true;
    requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{queued=false;process()})))));
  }
  new MutationObserver(schedule).observe(output,{childList:true,subtree:true});
  schedule();
})();
