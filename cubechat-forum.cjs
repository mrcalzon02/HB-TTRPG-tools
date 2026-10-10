'use strict';
// Minimal self-hosted forum: persistent boards, threads and replies. NOT integrated with CubeChat E2EE.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const FILE=process.env.CUBECHAT_FORUM_DB||path.join(__dirname,'cubechat-forum-data.json');
const ADMIN=process.env.CUBECHAT_FORUM_ADMIN_TOKEN||'';
let db;
try{db=JSON.parse(fs.readFileSync(FILE,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e;db={version:1,boards:[{id:'general',name:'General',description:'Community discussion'}],threads:[],posts:[]}}
function save(){const tmp=FILE+'.'+process.pid+'.tmp';fs.writeFileSync(tmp,JSON.stringify(db,null,2),{mode:0o600});fs.renameSync(tmp,FILE)}
function json(res,status,payload){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(payload))}
function limited(v,n){return typeof v==='string'&&v.trim().length>0&&v.trim().length<=n?v.trim():null}
function admin(req){if(!ADMIN)return false;const supplied=req.headers['x-forum-admin-token'];if(typeof supplied!=='string')return false;const a=Buffer.from(supplied),b=Buffer.from(ADMIN);return a.length===b.length&&crypto.timingSafeEqual(a,b)}
const last=new Map();
function throttle(req){const ip=req.socket.remoteAddress||'unknown',now=Date.now(),prev=last.get(ip)||0;if(now-prev<2500)return false;last.set(ip,now);if(last.size>10000)last.clear();return true}
function read(req,done){let s='',bytes=0;req.on('data',b=>{bytes+=b.length;if(bytes>32768){req.destroy();return}s+=b.toString('utf8')});req.on('end',()=>{try{done(JSON.parse(s))}catch{done(null)}})}
function handle(req,res,u){
 if(!u.pathname.startsWith('/forum/api/'))return false;
 const route=u.pathname.slice('/forum/api/'.length);
 if(req.method==='GET'){
 if(route==='boards')return json(res,200,{boards:db.boards,adminConfigured:!!ADMIN});
 if(route==='threads'){const board=u.searchParams.get('board');return json(res,200,{threads:db.threads.filter(t=>t.board===board).slice(-300).reverse().map(t=>({...t,replyCount:db.posts.filter(p=>p.thread===t.id).length-1}))})}
 if(route==='posts'){const thread=u.searchParams.get('thread');return json(res,200,{thread:db.threads.find(t=>t.id===thread)||null,posts:db.posts.filter(p=>p.thread===thread).slice(0,500)})}
 return json(res,404,{error:'Unknown resource'});
 }
 if(req.method!=='POST')return json(res,405,{error:'Method not allowed'});
 if(!throttle(req))return json(res,429,{error:'Please wait before posting again'});
 read(req,v=>{
 if(!v||typeof v!=='object')return json(res,400,{error:'Invalid JSON'});
 const now=new Date().toISOString(),id=crypto.randomUUID();
 if(route==='boards'){if(!admin(req))return json(res,403,{error:'Host admin token required'});const name=limited(v.name,70),description=typeof v.description==='string'?v.description.slice(0,250):'';if(!name||db.boards.length>=50)return json(res,400,{error:'Invalid board'});db.boards.push({id,name,description});save();return json(res,201,{id})}
 if(route==='threads'){const title=limited(v.title,150),body=limited(v.body,10000),author=limited(v.author,60),board=db.boards.find(b=>b.id===v.board);if(!title||!body||!author||!board||db.threads.length>=10000)return json(res,400,{error:'Invalid thread'});db.threads.push({id,title,board:board.id,author,created:now});db.posts.push({id:crypto.randomUUID(),thread:id,body,author,created:now});save();return json(res,201,{id})}
 if(route==='posts'){const thread=db.threads.find(t=>t.id===v.thread),body=limited(v.body,10000),author=limited(v.author,60);if(!thread||!body||!author||db.posts.length>=100000)return json(res,400,{error:'Invalid reply'});db.posts.push({id,thread:thread.id,body,author,created:now});save();return json(res,201,{id})}
 return json(res,404,{error:'Unknown resource'});
 });return true;
}
module.exports={handle};
