'use strict';
// Run from repo root: node scripts/cubechat-integration-test.cjs
// No npm packages, no GitHub Actions, no external network connection.
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const net=require('node:net'),http=require('node:http'),{spawn}=require('node:child_process');
const ROOT=path.resolve(__dirname,'..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'cubechat-smoke-'));
let child=null,port;
async function vacantPort(){return new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>resolve(p))})})}
function request(method,url,data,headers={}){return new Promise((resolve,reject)=>{const u=new URL(url),req=http.request({hostname:u.hostname,port:u.port,path:u.pathname+u.search,method,headers:{...headers,...(data?{'Content-Type':'application/json'}:{})}},res=>{const chunks=[];res.on('data',x=>chunks.push(x));res.on('end',()=>resolve({status:res.statusCode,text:Buffer.concat(chunks).toString()}))});req.on('error',reject);req.setTimeout(3000,()=>req.destroy(Error('HTTP timeout')));req.end(data?JSON.stringify(data):undefined)})}
function start(){return new Promise((resolve,reject)=>{child=spawn(process.execPath,['cubechat-server.cjs',String(port)],{cwd:ROOT,env:{...process.env,CUBECHAT_HOST:'127.0.0.1',CUBECHAT_FORUM_DB:path.join(temp,'forum.json'),CUBECHAT_FORUM_ADMIN_TOKEN:'test-token-not-for-deployment'},stdio:['ignore','pipe','pipe']});let log='';const timer=setTimeout(()=>reject(Error('Host startup timed out: '+log)),5000);child.once('exit',(code)=>{clearTimeout(timer);reject(Error('Host exited '+code+': '+log))});child.stdout.on('data',x=>{log+=x;if(log.includes('CubeChat listening')){clearTimeout(timer);resolve()}});child.stderr.on('data',x=>log+=x)})}
function stop(){return new Promise(resolve=>{if(!child||child.exitCode!==null)return resolve();const p=child;child=null;p.once('exit',resolve);p.kill();setTimeout(()=>{if(p.exitCode===null)p.kill('SIGKILL');resolve()},1500).unref()})}
function subscribe(profile,role){return new Promise((resolve,reject)=>{const req=http.get('http://127.0.0.1:'+port+'/events?role='+role+'&profile='+profile,res=>{if(res.statusCode!==200)return reject(Error('SSE status '+res.statusCode));let log='';res.on('data',x=>log+=x);resolve({req,res,log:()=>log})});req.on('error',reject)})}
const P1='111111111111111111111111',P2='222222222222222222222222';
const envelope=JSON.stringify({format:'cubechat-local-v1',channel:'AB',sequence:0,profile:'latin-cube-64',iv:'AAAAAAAAAAAAAAAA',ciphertext:'c2VyaWFsaXplZC1vcGFxdWU='});
async function run(){port=await vacantPort();try{
 await start();const base='http://127.0.0.1:'+port;
 for(const file of ['/','/cubechat-host.html','/cubechat-network.html','/cubechat-forum.html','/cubechat-provision.html','/cubechat-key-handoff.html','/cubechat-large-keys.html','/cubechat-large-key-adapter.js','/shadowrun-binary-cube-engine.js']){const r=await request('GET',base+file);assert.equal(r.status,200,file);assert.ok(r.text.length>100,file)}
 const boards=JSON.parse((await request('GET',base+'/forum/api/boards')).text);assert.ok(boards.boards.some(b=>b.id==='general'));
 assert.equal((await request('POST',base+'/forum/api/boards',{name:'Wrong credential',description:''})).status,403);
 // Server throttles posting by IP. Wait between mutations to exercise accepted paths.
 await new Promise(r=>setTimeout(r,2600));
 const created=await request('POST',base+'/forum/api/boards',{name:'Test Board',description:'Persistence'}, {'X-Forum-Admin-Token':'test-token-not-for-deployment'});assert.equal(created.status,201,created.text);const board=JSON.parse(created.text).id;
 await new Promise(r=>setTimeout(r,2600));
 const th=await request('POST',base+'/forum/api/threads',{board,title:'First topic',author:'Tester',body:'Hello'});assert.equal(th.status,201,th.text);const thread=JSON.parse(th.text).id;
 await new Promise(r=>setTimeout(r,2600));
 const reply=await request('POST',base+'/forum/api/posts',{thread,author:'Another tester',body:'Reply'});assert.equal(reply.status,201,reply.text);
 const posts=JSON.parse((await request('GET',base+'/forum/api/posts?thread='+thread)).text);assert.equal(posts.posts.length,2);
 const a=await subscribe(P1,'B'),b=await subscribe(P2,'B');
 const sent=await request('POST',base+'/send',{profile:P1,from:'A',to:'B',envelope});assert.equal(sent.status,200);assert.equal(JSON.parse(sent.text).deliveredConnections,1);
 await new Promise(r=>setTimeout(r,100));assert.ok(a.log().includes('serialized-opaque')===false);assert.ok(a.log().includes('ciphertext'));assert.ok(!b.log().includes('ciphertext'));
 a.req.destroy();b.req.destroy();
 await stop();await start();
 const persisted=JSON.parse((await request('GET',base+'/forum/api/posts?thread='+thread)).text);assert.equal(persisted.posts.length,2);
 console.log('PASS: static routes, forum permissions, thread/reply persistence, profile-isolated SSE forwarding.');
}finally{await stop();fs.rmSync(temp,{recursive:true,force:true})}}
run().catch(err=>{console.error('FAIL: '+(err.stack||err));process.exitCode=1});
