'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=p=>fs.readFileSync(path.resolve(__dirname,'..',p),'utf8');
test('identity workflows are separate and registered without fake runtime capability',()=>{
const index=JSON.parse(read('skills/index.json'));
for(const n of ['privacy-exposure-remediation','professional-presence-development']){
const e=index.skills.find(x=>x.name===n);assert.ok(e);assert.equal(e.status,'onboardable');assert.deepEqual(e.capabilityIds,[]);
assert.match(read(e.path),new RegExp('name: '+n));
assert.match(read('agent-skills.html'),new RegExp('agent-skills/'+n+'.html'));
assert.match(read('agent-skills/'+n+'.html'),/Complete SKILL.md/);
assert.match(read('skills/'+n+'/PROVENANCE.md'),/mrcalzon02/);
}
});
test('case templates are blank and private-only',()=>{
for(const n of ['subject-private','exposure-private','professional-public','status-public']){
const d=JSON.parse(read('skills/identity-operations/templates/'+n+'.template.json'));assert.equal(d.version,'0.1.0');assert.ok(d.warning);
}
const subject=JSON.parse(read('skills/identity-operations/templates/subject-private.template.json'));
const exposure=JSON.parse(read('skills/identity-operations/templates/exposure-private.template.json'));
assert.equal(subject.subject_approved,false);assert.deepEqual(subject.selectors_private.addresses,[]);
assert.equal(exposure.exact_listing_url_private,null);assert.equal(exposure.approval_reference_private,null);
});
test('operating plan requires explicit approval and separate encrypted storage',()=>{
const p=read('skills/identity-operations/OPERATING_PLAN.md');
assert.match(p,/encrypted vault/);assert.match(p,/approval/);assert.match(p,/source removal/);
assert.match(read('.gitignore'),/identity-private\//);
});
