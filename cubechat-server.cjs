'use strict';
// CubeChat LAN transport: Node built-ins only. Relays opaque encrypted envelopes, never key material.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const ROOT=__dirname, PORT=Number(process.env.CUBECHAT_PORT||process.argv[2]||8787), HOST=process.env.CUBECHAT_HOST||'0.0.0.0';
if(!Number.isInteger(PORT)||PORT<1||PORT>65535)throw Error('Invalid port');
const clients={A:new Set(),B:new Set()};const MAX=1024*1024;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8'};
function respond(res,code,text,type='text/plain; charset=utf-8'){res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self' 'unsafe-inline'; connect-src 'self'"});res.end(text)}
const server=http.createServer((req,res)=>{
const base='http://localhost';let u;try{u=new URL(req.url,base)}catch{return respond(res,400,'Bad request')}
if(req.method==='GET'&&u.pathname==='/events'){
 const role=u.searchParams.get('role');if(!clients[role])return respond(res,400,'Invalid role');
 res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store','Connection':'keep-alive','X-Accel-Buffering':'no','Access-Control-Allow-Origin':'none'});
 res.write(': connected\n\n');clients[role].add(res);const timer=setInterval(()=>res.write(': heartbeat\n\n'),20000);
 req.on('close',()=>{clearInterval(timer);clients[role].delete(res)});return;
}
if(req.method==='POST'&&u.pathname==='/send'){
 let raw='',size=0,failed=false;
 req.on('data',chunk=>{size+=chunk.length;if(size>MAX){failed=true;req.destroy()}else raw+=chunk.toString('utf8')});
 req.on('end',()=>{if(failed)return;try{
 const body=JSON.parse(raw),to=body.to,from=body.from,env=body.envelope;
 if(!(['A','B'].includes(to)&&['A','B'].includes(from)&&to!==from&&typeof env==='string'&&env.length<MAX))return respond(res,400,'Invalid envelope');
 const parsed=JSON.parse(env);if(parsed.format!=='cubechat-local-v1'||typeof parsed.ciphertext!=='string'||typeof parsed.iv!=='string')return respond(res,400,'Invalid encrypted payload');
 for(const client of clients[to])client.write('data: '+JSON.stringify({from,envelope:env})+'\n\n');
 respond(res,200,JSON.stringify({deliveredConnections:clients[to].size}),'application/json; charset=utf-8');
 }catch{return respond(res,400,'Bad JSON')}});return;
}
if(req.method==='GET'&&['/','/cubechat-network.html','/shadowrun-binary-cube-engine.js'].includes(u.pathname)){
 const name=u.pathname==='/'?'cubechat-network.html':u.pathname.slice(1);
 const file=path.join(ROOT,name);return fs.readFile(file,(err,data)=>err?respond(res,404,'Not found'):respond(res,200,data,mime[path.extname(file)]));
}
respond(res,404,'Not found');
});
server.listen(PORT,HOST,()=>console.log('CubeChat LAN listening on '+HOST+':'+PORT+' (HTTP: LAN test only; no TLS)'));
