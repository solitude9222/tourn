import express from 'express';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { appendFile, writeFile, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
const quote=value=>'"'+value.replaceAll('"','""')+'"';
const qualify=name=>`public.${quote(name)}`;
const portableMedia=value=>{
 if(typeof value==='string'){const match=/^https?:\/\/[^/]+(\/api\/media\/audio\/[a-f0-9-]+)$/i.exec(value);return match?match[1]:value;}
 if(Array.isArray(value))return value.map(portableMedia);
 if(value && typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,portableMedia(item)]));return value;
};
const run=fn=>async(req,res,next)=>{try{await fn(req,res);}catch(error){if(res.headersSent)res.destroy(error);else res.status(error.status || 400).json({error:error.message});}};

export async function databaseTables(client){
 const {rows}=await client.query("select table_name as name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name");
 const result=[];
 for(const {name} of rows){
  const columns=await client.query("select column_name as name,udt_name as type,is_identity from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position",[name]);
  const keys=await client.query("select k.column_name as name from information_schema.table_constraints c join information_schema.key_column_usage k on k.constraint_name=c.constraint_name and k.table_schema=c.table_schema and k.table_name=c.table_name where c.table_schema='public' and c.table_name=$1 and c.constraint_type='PRIMARY KEY' order by k.ordinal_position",[name]);
  const count=await client.query(`select count(*)::text as count from ${qualify(name)}`);
  result.push({name,columns:columns.rows,primaryKey:keys.rows.map(row=>row.name),count:Number(count.rows[0].count)});
 }
 const dependencies=await client.query("select child.relname as child,parent.relname as parent from pg_constraint c join pg_class child on child.oid=c.conrelid join pg_class parent on parent.oid=c.confrelid join pg_namespace n on n.oid=child.relnamespace where c.contype='f' and n.nspname='public'");
 const ordered=[];while(result.length){const index=result.findIndex(table=>!dependencies.rows.some(dep=>dep.child===table.name && dep.parent!==table.name && result.some(other=>other.name===dep.parent)));if(index<0)throw new Error('Database has cyclic table dependencies; use a PostgreSQL-native dump.');ordered.push(result.splice(index,1)[0]);}
 return ordered;
}

export async function* exportDatabase(pool){
 const client=await pool.connect();let committed=false;
 try{
  await client.query('begin isolation level repeatable read read only');
  const tables=await databaseTables(client);
  yield '['+JSON.stringify({format:'tourn-postgres-backup',version:1,createdAt:new Date().toISOString(),tables});
  for(const table of tables){
   await client.query(`declare transfer_rows no scroll cursor for select * from ${qualify(table.name)}`);
   for(;;){const {rows}=await client.query('fetch forward 1 from transfer_rows');if(!rows.length)break;const row=rows[0];for(const column of table.columns)if(column.type==='bytea' && row[column.name]!=null)row[column.name]={base64:Buffer.from(row[column.name]).toString('base64')};yield ',\n'+JSON.stringify({table:table.name,row});}
   await client.query('close transfer_rows');
  }
  await client.query('commit');committed=true;yield '\n]';
 }finally{if(!committed)await client.query('rollback').catch(()=>{});client.release();}
}

/** Parse one object at a time from the JSON array, including across UTF-8 chunks. */
export async function* readBackup(file){
 let state='start',depth=0,inString=false,escaped=false,parts=[];
 for await(const chunk of createReadStream(file,{encoding:'utf8',highWaterMark:65536})){
  let segment=state==='record'?0:-1;
  for(let i=0;i<chunk.length;i++){
   const char=chunk[i];
   if(state==='record'){
    if(inString){if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char==='"')inString=false;}
    else if(char==='"')inString=true;else if(char==='{' || char==='[')depth++;else if(char==='}' || char===']')depth--;
    if(depth===0){parts.push(chunk.slice(segment,i+1));const value=JSON.parse(parts.join(''));parts=[];segment=-1;state='separator';yield value;}
    continue;
   }
   if(/\s/.test(char))continue;
   if(state==='start' && char==='['){state='first';continue;}
   if((state==='first' || state==='entry') && char==='{'){state='record';depth=1;inString=false;escaped=false;segment=i;continue;}
   if((state==='first' || state==='separator') && char===']'){state='end';continue;}
   if(state==='separator' && char===','){state='entry';continue;}
   throw new Error('Invalid backup JSON structure.');
  }
  if(segment>=0)parts.push(chunk.slice(segment));
 }
 if(state!=='end')throw new Error('Backup is incomplete or invalid.');
}

export async function inspectBackup(file,pool){
 const client=await pool.connect();try{
  const current=await databaseTables(client);const known=new Map(current.map(table=>[table.name,table]));let manifest=null;const counts={};
  for await(const entry of readBackup(file)){
   if(!manifest){
    if(entry.format!=='tourn-postgres-backup' || entry.version!==1 || !Array.isArray(entry.tables))throw new Error('Choose a tourn.lol database backup JSON file.');
    manifest=entry;
    for(const table of manifest.tables){const actual=known.get(table.name);if(!actual || counts[table.name]!==undefined || !Array.isArray(table.columns))throw new Error('Backup contains an unknown or duplicate table.');for(const column of table.columns)if(!actual.columns.some(item=>item.name===column.name && item.type===column.type))throw new Error(`Schema mismatch for ${table.name}.${column.name}. Deploy the matching backend first.`);counts[table.name]=0;}
   }else{
    const table=manifest.tables.find(item=>item.name===entry.table);if(!table || !entry.row || typeof entry.row!=='object' || Array.isArray(entry.row))throw new Error('Invalid backup row.');
    for(const key of Object.keys(entry.row))if(!table.columns.some(column=>column.name===key))throw new Error('Unknown backup column.');
    for(const column of table.columns)if(column.type==='bytea' && entry.row[column.name]!=null && (typeof entry.row[column.name].base64!=='string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(entry.row[column.name].base64)))throw new Error('Invalid binary data in backup.');
    counts[entry.table]++;
   }
  }
  if(!manifest)throw new Error('Backup is empty.');for(const table of manifest.tables)if(counts[table.name]!==table.count)throw new Error(`Row count mismatch for ${table.name}.`);
  return {manifest,counts};
 }finally{client.release();}
}

export async function importDatabase(file,pool,mode){
 const {manifest,counts}=await inspectBackup(file,pool);const client=await pool.connect();
 try{
  await client.query('begin');await client.query("select pg_advisory_xact_lock(hashtextextended('tourn-database-import',0))");
  const current=await databaseTables(client);
  if(mode==='replace')await client.query('truncate '+current.map(table=>qualify(table.name)).join(',')+' restart identity cascade');
  const tables=new Map(manifest.tables.map(table=>[table.name,table]));let first=true;
  for await(const entry of readBackup(file)){
   if(first){first=false;continue;}const table=tables.get(entry.table);const columns=Object.keys(entry.row);const actual=current.find(item=>item.name===table.name);const values=columns.map(name=>{const column=actual.columns.find(item=>item.name===name);const value=entry.row[name];if(value==null)return null;if(column.type==='bytea')return Buffer.from(value.base64,'base64');if(column.type==='json' || column.type==='jsonb')return JSON.stringify(portableMedia(value));return value;});
   const updates=columns.filter(name=>!actual.primaryKey.includes(name));const conflict=actual.primaryKey.length ? ` on conflict (${actual.primaryKey.map(quote).join(',')}) ${updates.length?'do update set '+updates.map(name=>`${quote(name)}=excluded.${quote(name)}`).join(','):'do nothing'}` : '';
   await client.query(`insert into ${qualify(table.name)} (${columns.map(quote).join(',')}) overriding system value values (${values.map((_,index)=>'$'+(index+1)).join(',')})${conflict}`,values);
  }
  // Preserve generated IDs and move their sequences beyond the imported values.
  for(const table of current)for(const column of table.columns){const sequence=await client.query('select pg_get_serial_sequence($1,$2) as name',[qualify(table.name),column.name]);if(sequence.rows[0]?.name){const maximum=await client.query(`select max(${quote(column.name)}) as value from ${qualify(table.name)}`);if(maximum.rows[0].value!=null)await client.query('select setval($1::regclass,$2,true)',[sequence.rows[0].name,maximum.rows[0].value]);}}
  await client.query('commit');return {counts,rows:Object.values(counts).reduce((sum,count)=>sum+count,0)};
 }catch(error){await client.query('rollback');throw error;}finally{client.release();}
}

export function registerDataTransfer(app,pool,requireOwner,onImport=()=>{}){
 const uploads=new Map();const CHUNK=1024*1024;
 const owned=(req,res)=>{const item=uploads.get(req.params.id);if(!item || item.owner!==req.auth.sub){res.status(404).json({error:'Backup upload not found. Upload it again.'});return null;}return item;};
 app.get('/api/admin/data/export',requireOwner,run(async(_req,res)=>{res.set({'Content-Type':'application/json','Content-Disposition':`attachment; filename="tourn-backup-${new Date().toISOString().slice(0,10)}.json"`,'Cache-Control':'no-store'});await pipeline(Readable.from(exportDatabase(pool),{objectMode:false}),res);}));
 app.post('/api/admin/data/import',requireOwner,express.json({limit:'4kb'}),run(async(req,res)=>{const bytes=req.body?.bytes;if(!Number.isSafeInteger(bytes)||bytes<=0)throw new Error('Choose a backup file.');for(const [key,value] of uploads)if(value.created<Date.now()-86400000){uploads.delete(key);void unlink(value.file).catch(()=>{});}const id=randomUUID(),file=join(tmpdir(),`tourn-backup-${id}.json`);await writeFile(file,'');uploads.set(id,{file,bytes,received:0,owner:req.auth.sub,created:Date.now()});res.json({id,chunkBytes:CHUNK});}));
 app.put('/api/admin/data/import/:id/chunks/:part',requireOwner,express.raw({type:'application/octet-stream',limit:CHUNK}),run(async(req,res)=>{const item=owned(req,res);if(!item)return;const part=Number(req.params.part);if(!Buffer.isBuffer(req.body)||!Number.isSafeInteger(part)||part<0 || part*CHUNK!==item.received || req.body.length!==Math.min(CHUNK,item.bytes-item.received))return res.status(409).json({error:'Backup chunks arrived out of order. Upload it again.'});await appendFile(item.file,req.body);item.received+=req.body.length;res.json({received:item.received});}));
 app.post('/api/admin/data/import/:id/inspect',requireOwner,run(async(req,res)=>{const item=owned(req,res);if(!item)return;if(item.received!==item.bytes)throw new Error('Backup upload is incomplete.');const info=await inspectBackup(item.file,pool);item.inspected=true;res.json({counts:info.counts,createdAt:info.manifest.createdAt});}));
 app.post('/api/admin/data/import/:id/apply',requireOwner,express.json({limit:'4kb'}),run(async(req,res)=>{const item=owned(req,res);if(!item)return;const mode=req.body?.mode;if(!item.inspected || !['merge','replace'].includes(mode) || (mode==='replace' && req.body?.confirmation!=='REPLACE ALL DATA'))throw new Error('Review the backup and confirm the import mode first.');const result=await importDatabase(item.file,pool,mode);onImport();uploads.delete(req.params.id);await unlink(item.file).catch(()=>{});res.json({ok:true,...result});}));
}
