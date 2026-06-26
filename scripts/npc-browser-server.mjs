import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.md':'text/markdown; charset=utf-8','.txt':'text/plain; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon'};

function resolveRequest(root,requestUrl){
  const pathname=decodeURIComponent(new URL(requestUrl,'http://127.0.0.1').pathname);
  const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/, '');
  const target=path.resolve(root,relative);
  if(target!==root&&!target.startsWith(`${root}${path.sep}`))return null;
  return target;
}

export function startStaticServer(root,port){
  return new Promise((resolve,reject)=>{
    const server=http.createServer((request,response)=>{
      const target=resolveRequest(root,request.url||'/');
      if(!target){response.writeHead(403);response.end('Forbidden');return;}
      fs.stat(target,(error,stat)=>{
        if(error||!stat.isFile()){response.writeHead(404);response.end('Not found');return;}
        response.writeHead(200,{'Content-Type':MIME[path.extname(target).toLowerCase()]||'application/octet-stream','Cache-Control':'no-store'});
        fs.createReadStream(target).pipe(response);
      });
    });
    server.once('error',reject);
    server.listen(port,'127.0.0.1',()=>resolve(server));
  });
}

export function closeServer(server){
  return new Promise(resolve=>server?server.close(()=>resolve()):resolve());
}
