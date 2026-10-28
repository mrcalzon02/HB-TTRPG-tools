#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {resolve, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
function csv(path) {
  const raw=readFileSync(join(root,path),'utf8').replace(/^\uFEFF/,'');
  const rows=[]; let row=[],v='',quoted=false;
  for(let i=0;i<raw.length;i++){
    const c=raw[i];
    if(quoted){if(c==='"' && raw[i+1]==='"'){v+='"';i++;}else if(c==='"')quoted=false;else v+=c;}
    else if(c==='"')quoted=true;
    else if(c===','){row.push(v);v='';}
    else if(c==='\n'){row.push(v.replace(/\r$/,''));rows.push(row);row=[];v='';}
    else v+=c;
  }
  if(v||row.length){row.push(v);rows.push(row);}
  const headers=rows.shift();
  assert(headers?.length>1,'Missing CSV header: '+path);
  assert.equal(new Set(headers).size,headers.length,'Duplicate column: '+path);
  return rows.filter(r=>r.some(Boolean)).map((r,index)=>{
    assert.equal(r.length,headers.length,'Malformed '+path+' row '+(index+2));
    return Object.fromEntries(headers.map((h,j)=>[h,r[j]]));
  });
}
const schedule=csv('data/royal-wardrobe-weekly-schedule.csv');
assert.equal(schedule.length,870,'Sixteen-year period must have 870 complete seven-day weeks');
for(let i=0;i<schedule.length;i++){
  const s=schedule[i];
  assert.equal(Number(s.week_from_royal_wedding),i+1);
  assert.equal(Number(s.friday_day_from_wedding),i*7+4,'Veilday day offset');
  assert.equal(Number(s.sunday_day_from_wedding),i*7+6,'Hearthday day offset');
  assert.equal(Number(s.friday_regular_slots),2);
  assert.equal(Number(s.sunday_optional_slots),1);
  assert.equal(s.friday_slot_A_garment_id,'','Do not fabricate acquisitions');
  assert.equal(s.friday_slot_B_garment_id,'','Do not fabricate acquisitions');
  assert.equal(s.sunday_slot_C_garment_id,'','Optional Sunday is not a purchase');
}
assert.equal(schedule[0].friday_date_veilday,'5 Thawcall, 282 S.M.');
assert.equal(schedule[0].sunday_date_hearthday,'7 Thawcall, 282 S.M.');
assert.equal(schedule.at(-1).sunday_date_hearthday,'14 Casktide, 298 S.M.');

const matches=csv('data/royal-wardrobe-calendar-matches.csv');
const canonical=csv('data/royal-wardrobe-canon-matching.csv');
assert.equal(matches.length,22);
assert.equal(canonical.length,20);
assert.deepEqual(matches.slice(0,20).map(x=>x.catalog_entry_id),canonical.map(x=>x.garment_entry_id));
const matchingDates=['5 Thawcall, 282 S.M.','5 Thawcall, 282 S.M.','7 Thawcall, 282 S.M.','12 Thawcall, 282 S.M.','12 Thawcall, 282 S.M.'];
assert.deepEqual(matches.slice(0,5).map(x=>x.conditional_date_if_first_week),matchingDates);
assert(matches.every(x=>!x.confirmed_historical_date),'No exact acquisition day has been confirmed yet');
assert(matches.slice(-2).every(x=>x.calendar_match_status==='design_only_not_a_purchase'));
assert(matches.filter(x=>x.calendar_match_status==='awaiting_daysha_birthday').length===5);
assert(matches.filter(x=>x.conditional_date_if_first_week).length===5);

const gallery=JSON.parse(readFileSync(join(root,'data/daysha-royal-purchases.json'),'utf8'));
const art=csv('data/royal-artwork-placement.csv');
assert.equal(art.length,32);
assert.equal(gallery.sources.length,13);
assert.equal(art.filter(x=>x.asset_status==='verified_on_main').length,13);
assert.equal(art.filter(x=>x.asset_status==='generated_candidate_NOT_published').length,19);
assert.equal(art.filter(x=>x.linked_master_story_event_id).length,11);
for(const a of art.filter(x=>x.linked_master_story_event_id)){
  assert.match(a.linked_master_story_event_id,/^RH-F0[1-4]$/);
  assert.equal(Number(a.earliest_allowed_elapsed_day),266);
  assert(!a.assigned_calendar_date && !a.assigned_life_year_1_to_16);
}
for(const id of ['G-001','G-002'])assert(matches.some(x=>x.catalog_entry_id===id && x.image_match_status==='approved_generated_study_only'));

const calendar=csv('data/elaranth-calendar-events.csv');
assert.equal(calendar.length,83);
assert.equal(calendar.filter(x=>x.event_type==='seasonal_political_week').length,52);
assert.equal(calendar.filter(x=>x.event_type==='annual_festival').length,13);
assert.equal(calendar.filter(x=>x.event_type==='monthly_full_moon').length,13);
assert.equal(calendar.filter(x=>x.event_type==='royal_story_anchor').length,5);
assert.equal(calendar.filter(x=>x.lunar_alignment_flag).length,9);
for(const m of calendar.filter(x=>x.event_type==='monthly_full_moon'))assert.equal(Number(m.day_start),14);

const master=JSON.parse(readFileSync(join(root,'data/master-storybook.json'),'utf8'));
assert.equal(master.events.find(x=>x.id==='EL-003')?.estelleState,'unborn');
assert.equal(master.events.find(x=>x.id==='EL-009')?.when?.day,15);
assert.equal(master.events.find(x=>x.id==='EL-009')?.when?.month,10);
assert.equal(master.events.find(x=>x.id==='EL-010')?.when?.year,298);
const expectedPages=['royal-calendar-matching.html','royal-purchases.html','elaranth-almanac.html','master-storybook.html'];
for(const name of expectedPages) assert(existsSync(join(root,name)),'Missing public page '+name);
assert(readFileSync(join(root,'royal-calendar-matching.html'),'utf8').includes('data/royal-wardrobe-calendar-matches.csv'));
assert(readFileSync(join(root,'royal-purchases.html'),'utf8').includes('royal-calendar-matching.html'));
console.log('PASS: 870 weeks, 20 canon garments + 2 studies, 11 scene-event links, 83 seasonal calendar events, preserved birthday constraints, zero invented purchases.');
