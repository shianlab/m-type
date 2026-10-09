const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.json':'application/json; charset=utf-8'};
const port=Number(process.env.PORT||4173);
http.createServer((req,res)=>{try{
  const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(pathname==='/'){res.writeHead(302,{Location:'/template/index.html'});res.end();return;}
  if(pathname.includes('\0')){res.writeHead(400);res.end();return;}
  const filename=path.resolve(root,'.'+pathname);
  const relative=path.relative(root,filename);
  if(relative.startsWith('..')||path.isAbsolute(relative)||/(^|[\/])\./.test(relative)){res.writeHead(403);res.end();return;}
  if(!fs.existsSync(filename)||!fs.statSync(filename).isFile()){res.writeHead(404);res.end('Not found');return;}
  const actual=fs.realpathSync(filename);
  if(!actual.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  if(!types[path.extname(filename)]){res.writeHead(403);res.end();return;}
  res.writeHead(200,{'Content-Type':types[path.extname(filename)],'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});fs.createReadStream(filename).pipe(res);
}catch{res.writeHead(400);res.end('Bad request');}}).listen(port,'127.0.0.1',()=>console.log(`M-TYPE preview: http://127.0.0.1:${port}/template/index.html`));
