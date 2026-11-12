import { useState } from 'react';
import { api,apiBase,post } from '../lib/backend';
export function DataTransferPanel(){
 const [busy,setBusy]=useState(false),[progress,setProgress]=useState(0),[id,setId]=useState<string|null>(null),[counts,setCounts]=useState<Record<string,number>|null>(null),[mode,setMode]=useState('merge'),[confirmation,setConfirmation]=useState(''),[message,setMessage]=useState(''),[error,setError]=useState('');
 async function upload(file:File|undefined){
  if(!file)return;setBusy(true);setError('');setMessage('');setCounts(null);setId(null);setProgress(0);
  try{
   const created=await post<{id:string;chunkBytes:number}>('/api/admin/data/import',{bytes:file.size});if(!created.ok)throw new Error(created.error);if(!created.data.id || !created.data.chunkBytes)throw new Error('The import service is unavailable. Deploy the updated backend first.');
   const nextId=created.data.id,chunk=created.data.chunkBytes;
   for(let offset=0,part=0;offset<file.size;offset+=chunk,part++){const response=await api(`/api/admin/data/import/${nextId}/chunks/${part}`,{method:'PUT',headers:{'Content-Type':'application/octet-stream'},body:file.slice(offset,offset+chunk)});if(!response.ok)throw new Error(response.error);setProgress(Math.round(Math.min(file.size,offset+chunk)/file.size*100));}
   const checked=await post<{counts:Record<string,number>}>(`/api/admin/data/import/${nextId}/inspect`);if(!checked.ok)throw new Error(checked.error);setCounts(checked.data.counts);setId(nextId);
  }catch(error){setError(error instanceof Error?error.message:'Backup could not be read.');}finally{setBusy(false);}
 }
 async function apply(){if(!id)return;setBusy(true);setError('');try{const result=await post<{rows:number}>(`/api/admin/data/import/${id}/apply`,{mode,confirmation});if(!result.ok)throw new Error(result.error);setMessage(`Imported ${result.data.rows.toLocaleString()} rows. Sign in again if your restored account has a different ID.`);setId(null);setCounts(null);}catch(error){setError(error instanceof Error?error.message:'Import failed; no changes were committed.');}finally{setBusy(false);}}
 return <section className="adm-panel adm-data-transfer"><div className="adm-panel-head"><h2>Database export & import</h2></div><p className="adm-hint adm-hint--block">Download all PostgreSQL user data, profiles, widgets, links, settings, analytics and audio chunks. The JSON includes password hashes and authentication data; keep it private. Environment variables are configured separately on the new provider.</p>
 <a className="adm-btn adm-btn--primary" href={`${apiBase()}/api/admin/data/export`} download>Export all data (.json)</a>
 <h3>Import a backup</h3><p className="adm-hint">Upload a backup to validate it and review table counts before making changes. Imports run in one transaction; a failed import rolls back.</p>
 <label className="adm-backup-file">{busy?`Processing backup · ${progress}%`:'Choose backup JSON'}<input aria-label="Database backup JSON" disabled={busy} type="file" accept=".json,application/json" onChange={event=>void upload(event.target.files?.[0])}/></label>
 {counts?<><div className="adm-backup-counts">{Object.entries(counts).map(([table,count])=><div key={table}><span>{table}</span><b>{count.toLocaleString()} rows</b></div>)}</div><label className="adm-field"><span>Import mode</span><select aria-label="Import mode" value={mode} disabled={busy} onChange={event=>setMode(event.target.value)}><option value="merge">Merge into existing database</option><option value="replace">Replace all database data</option></select></label>{mode==='replace'?<label className="adm-field"><span>Type REPLACE ALL DATA to replace the current database</span><input aria-label="Replacement confirmation" value={confirmation} onChange={event=>setConfirmation(event.target.value)} /></label>:<p className="adm-hint">Merge updates matching primary keys and retains unrelated rows. Conflicting unique accounts stop the import without changing the database.</p>}<button className="adm-btn adm-btn--primary" disabled={busy || (mode==='replace' && confirmation!=='REPLACE ALL DATA')} onClick={()=>void apply()}>{busy?'Importing…':mode==='replace'?'Replace database with this backup':'Import validated backup'}</button></>:null}
 {error?<p role="alert" className="adm-error">{error}</p>:null}{message?<p role="status">{message}</p>:null}
 </section>;
}
