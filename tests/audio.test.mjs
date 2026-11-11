import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { PGlite } from '@electric-sql/pglite';
import { AUDIO_SCHEMA, AUDIO_CHUNK_BYTES, registerAudioRoutes } from '../backends/audio.js';
const require=createRequire(new URL('../backends/package.json',import.meta.url));
const express=require('express');
const owner='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002';
let db,server,base;
before(async()=>{
 db=new PGlite();await db.exec(`create table users(id uuid primary key);insert into users values('${owner}'),('${other}');${AUDIO_SCHEMA}`);
 const pool={query:(...args)=>db.query(...args),connect:async()=>({query:(...args)=>db.query(...args),release(){}})};
 const app=express();registerAudioRoutes(app,pool,(req,res,next)=>{if(!req.get('x-user'))return res.sendStatus(401);req.auth={sub:req.get('x-user')};next();});
 app.use(express.json({limit:'256kb'})); // Must not interfere with raw upload chunks.
 app.use((err,_req,res,_next)=>res.status(err.status || 500).json({error:err.message}));
 server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));base=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{await new Promise(resolve=>server.close(resolve));await db.close();});
const create=async(bytes,user=owner)=>{const response=await fetch(base+'/api/media/audio',{method:'POST',headers:{'Content-Type':'application/json','x-user':user},body:JSON.stringify({bytes,mime:'audio/mpeg'})});assert.equal(response.status,201);return response.json();};
const chunk=(id,part,body,user=owner)=>fetch(`${base}/api/media/audio/${id}/chunks/${part}`,{method:'PUT',headers:{'Content-Type':'application/octet-stream','x-user':user},body});
const complete=(id,user=owner)=>fetch(`${base}/api/media/audio/${id}/complete`,{method:'POST',headers:{'x-user':user}});

test('tracks above the old limit upload, publish and stream with seeking',async()=>{
 const audio=Buffer.alloc(6*1024*1024+177);for(let i=0;i<audio.length;i++)audio[i]=i%251;
 const {id,chunkBytes}=await create(audio.length);assert.equal(chunkBytes,AUDIO_CHUNK_BYTES);
 assert.equal((await fetch(`${base}/api/media/audio/${id}`)).status,404,'Incomplete tracks must not publish');
 assert.equal((await complete(id)).status,409);
 for(let offset=0,part=0;offset<audio.length;offset+=chunkBytes,part++){
  assert.equal((await chunk(id,part,audio.subarray(offset,offset+chunkBytes))).status,200);
  if(part===0)assert.equal((await chunk(id,part,audio.subarray(offset,offset+chunkBytes))).status,200,'Retry duplicated a chunk');
 }
 const response=await complete(id);assert.equal(response.status,200);const {url}=await response.json();
 const full=await fetch(base+url);assert.equal(full.headers.get('content-type'),'audio/mpeg');assert.deepEqual(Buffer.from(await full.arrayBuffer()),audio);
 for(const [range,start,end] of [[`bytes=${chunkBytes-20}-${chunkBytes+40}`,chunkBytes-20,chunkBytes+40],['bytes=-37',audio.length-37,audio.length-1],['bytes=101-',101,audio.length-1]]){
  const partial=await fetch(base+url,{headers:{Range:range}});assert.equal(partial.status,206);assert.equal(partial.headers.get('content-range'),`bytes ${start}-${end}/${audio.length}`);assert.deepEqual(Buffer.from(await partial.arrayBuffer()),audio.subarray(start,end+1));
 }
 assert.equal((await fetch(base+url,{headers:{Range:`bytes=${audio.length}-`}})).status,416);
 const head=await fetch(base+url,{method:'HEAD'});assert.equal(head.headers.get('content-length'),String(audio.length));assert.equal((await head.arrayBuffer()).byteLength,0);
});

test('uploads enforce ownership, ordered chunks and safe media types',async()=>{
 assert.equal((await fetch(base+'/api/media/audio',{method:'POST'})).status,401);
 const bad=await fetch(base+'/api/media/audio',{method:'POST',headers:{'x-user':owner,'Content-Type':'application/json'},body:JSON.stringify({bytes:123,mime:'text/html'})});assert.equal(bad.status,400);
 const {id}=await create(23);
 assert.equal((await chunk(id,0,Buffer.alloc(23),other)).status,404);
 assert.equal((await chunk(id,1,Buffer.alloc(23))).status,409);
 assert.equal((await chunk(id,0,Buffer.alloc(22))).status,409);
 assert.equal((await chunk(id,0,Buffer.alloc(23))).status,200);
 assert.equal((await chunk(id,0,Buffer.alloc(23,1))).status,409);
 assert.equal((await complete(id,other)).status,409);
 assert.equal((await complete(id)).status,200);
});
