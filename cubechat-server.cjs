'use strict';
// CubeChat LAN transport: Node built-ins only. Relays opaque encrypted envelopes, never key material.
const http=require('node:http'),https=require('node:https'),fs=require('node:fs'),path=require('node:path');
const forum=require('./cubechat-forum.cjs');
const ROOT=__dirname, PORT=Number(process.env.CUBECHAT_PORT||process.argv[2]||8787), HOST=process.env.CUBECHAT_HOST||'127.0.0.1';
if(!Number.isInteger(PORT)||PORT<1||PORT>65535)throw Error('Invalid port');
const MAX=1024*1024, MAX_CONNECTIONS=128, MAX_SUBSCRIBERS=64, MAX_PER_ROUTE=8;
const MAX_PENDING_SSE_BYTES=MAX+4096, SSE_DRAIN_TIMEOUT_MS=10000;
const DEMO_PROFILE='000000000000000000000000';
const clients=new Map();
let subscriberCount=0;
function route(profile,role){if(typeof profile!=='string'||!/^[a-f0-9]{24}$/.test(profile)||!['A','B'].includes(role))return null;return profile+':'+role}

function writeEvent(client, frame) {
 const {response}=client;
 if(response.destroyed||response.writableEnded)return false;
 if(response.writableLength+frame.length>MAX_PENDING_SSE_BYTES){
  response.destroy();
  return false;
 }
 // A write can exceed Node's high-water mark on a healthy connection. Allow it to drain.
 if(!response.write(frame)&&!client.drainTimer){
  client.drainTimer=setTimeout(()=>response.destroy(),SSE_DRAIN_TIMEOUT_MS);
  response.once('drain',client.clearDrainTimer);
 }
 return true;
}

function subscribe(res,url) {
 const id=route(url.searchParams.get('profile')||DEMO_PROFILE,url.searchParams.get('role'));
 if(!id)return respond(res,400,'Invalid profile or role');
 const existing=clients.get(id);
 if(existing?.size>=MAX_PER_ROUTE)return respond(res,429,'Too many subscriptions for this profile and role');
 if(subscriberCount>=MAX_SUBSCRIBERS)return respond(res,503,'Relay subscription limit reached');

 const group=existing||new Set();
 const client={response:res,drainTimer:null,clearDrainTimer(){
  clearTimeout(client.drainTimer);
  client.drainTimer=null;
 }};
 group.add(client);
 clients.set(id,group);
 subscriberCount++;
 res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive','X-Accel-Buffering':'no','Access-Control-Allow-Origin':'none'});
 const timer=setInterval(()=>writeEvent(client,HEARTBEAT),20000);
 res.once('close',()=>{
  clearInterval(timer);
  client.clearDrainTimer();
  res.removeListener('drain',client.clearDrainTimer);
  group.delete(client);
  subscriberCount--;
  if(!group.size)clients.delete(id);
 });
 writeEvent(client,CONNECTED);
}

const CONNECTED=Buffer.from(': connected\n\n'), HEARTBEAT=Buffer.from(': heartbeat\n\n');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};
function respond(res,code,text,type='text/plain; charset=utf-8'){res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self' 'unsafe-inline'; connect-src 'self'"});res.end(text)}
function handleRequest(req,res) {
const base='http://localhost';let u;try{u=new URL(req.url,base)}catch{return respond(res,400,'Bad request')}
if(forum.handle(req,res,u)||res.headersSent)return;
if(req.method==='GET'&&u.pathname==='/events')return subscribe(res,u);
if(req.method==='POST'&&u.pathname==='/send'){
 let raw='',size=0,failed=false;
 req.on('data',chunk=>{size+=chunk.length;if(size>MAX){failed=true;req.destroy()}else raw+=chunk.toString('utf8')});
 req.on('end',()=>{if(failed)return;try{
 const body=JSON.parse(raw),to=body.to,from=body.from,env=body.envelope,id=route(body.profile||DEMO_PROFILE,to);
 if(!id||!['A','B'].includes(from)||to===from||typeof env!=='string'||env.length>=MAX)return respond(res,400,'Invalid envelope');
 const parsed=JSON.parse(env);if(parsed.format!=='cubechat-local-v1'||typeof parsed.ciphertext!=='string'||typeof parsed.iv!=='string')return respond(res,400,'Invalid encrypted payload');
 const group=clients.get(id);
 let deliveredConnections=0;
 if(group){
  const frame=Buffer.from('data: '+JSON.stringify({from,envelope:env})+'\n\n');
  for(const client of group)if(writeEvent(client,frame))deliveredConnections++;
 }
 respond(res,200,JSON.stringify({deliveredConnections}),'application/json; charset=utf-8');
 }catch{return respond(res,400,'Bad JSON')}});return;
}
if(req.method==='GET'&&['/','/cubechat.html','/data/cubechat/sailing-family-conversation.json','/cubechat-network.html','/cubechat-host.html','/cubechat-provision.html','/cubechat-forum.html','/cubechat-key-handoff.html','/cubechat-large-keys.html','/shadowrun-binary-cube-engine.js','/cubechat-large-key-adapter.js','/cubechat-key-ledger-core.js','/cubechat-key-ledger.js'].includes(u.pathname)){
 const name=u.pathname==='/'?'cubechat-network.html':u.pathname.slice(1);
 const file=path.join(ROOT,name);return fs.readFile(file,(err,data)=>err?respond(res,404,'Not found'):respond(res,200,data,mime[path.extname(file)]));
}
respond(res,404,'Not found');
}
const certPath=process.env.CUBECHAT_TLS_CERT,keyPath=process.env.CUBECHAT_TLS_KEY;
if(Boolean(certPath)!==Boolean(keyPath))throw Error('Set CUBECHAT_TLS_CERT and CUBECHAT_TLS_KEY together');
const server=certPath
 ? https.createServer({cert:fs.readFileSync(certPath),key:fs.readFileSync(keyPath)},handleRequest)
 : http.createServer(handleRequest);
server.maxConnections=MAX_CONNECTIONS;
const address=HOST.includes(':')?'['+HOST+']':HOST;
server.listen(PORT,HOST,()=>console.log('CubeChat listening on '+(certPath?'https://':'http://')+address+':'+PORT+(certPath?' (TLS enabled)':' (localhost-only Web Crypto; use TLS for other devices)')));
