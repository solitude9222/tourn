import { useCallback, useEffect, useState } from 'react';
import { api, post } from '../lib/backend';
import '../pages.css';
type Stock = {handle:string;price_cents:number|null;listed:boolean;owner_id:string|null;owner_username:string|null;checkout_id:string|null;order_id:string|null};
export function UsernameStockPanel(){
 const [items,setItems]=useState<Stock[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const [handle,setHandle]=useState(''),[price,setPrice]=useState(''),[listed,setListed]=useState(false);
 const load=useCallback(async()=>{const result=await api<{items:Stock[]}>('/api/admin/usernames');if(result.ok)setItems(result.data.items);else setMessage(result.error);setLoading(false);},[]);
 useEffect(()=>{void load();},[load]);
 const save=async()=>{
   const cents=Math.round(Number(price)*100);if(!/^\d+(\.\d{1,2})?$/.test(price)||cents<50){setMessage('Enter a price of at least $0.50 with up to two decimal places.');return;}
   setBusy(true);setMessage('');const result=await post('/api/admin/usernames',{handle,priceCents:cents,listed});setBusy(false);
   if(!result.ok){setMessage(result.error);return;}setMessage('Username stock saved.');setHandle('');setPrice('');setListed(false);await load();
 };
 return <section className="adm-panel username-stock"><span className="eyebrow eyebrow--sm">MARKETPLACE INVENTORY</span><h2>Username stock</h2><p>Set a price for each name and choose when it goes on sale. Each username has exactly one owner. Sold and reserved stock is locked.</p>
 <div className="stock-stats"><span><b>{items.filter(x=>x.listed&&!x.owner_id&&!x.order_id).length}</b> Available</span><span><b>{items.filter(x=>x.order_id&&!x.owner_id).length}</b> Reserved</span><span><b>{items.filter(x=>x.owner_id).length}</b> Owned</span></div>
 <form className="stock-form" onSubmit={e=>{e.preventDefault();void save();}}><label>Username<input required value={handle} onChange={e=>setHandle(e.target.value)} placeholder="a or ♥" autoComplete="off"/></label><label>One-time price (USD)<input required type="number" min="0.50" max="999999.99" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} placeholder="0.00"/></label><label className="stock-list-toggle"><input type="checkbox" checked={listed} onChange={e=>setListed(e.target.checked)}/> List for sale</label><button className="btn btn-primary btn-sm" disabled={busy}>{busy?'Saving…':'Save stock'}</button></form>
 <p className="market-footnote">Use one letter, number or symbol. Nothing is listed automatically. Leave “List for sale” off to keep stock unpublished.</p>
 {message&&<p role="status">{message}</p>}{loading?<p>Loading stock…</p>:!items.length?<p>No stock yet. Add your first username above.</p>:<div className="stock-table"><table><thead><tr><th>Username</th><th>Price</th><th>Status</th><th>Owner</th><th>Action</th></tr></thead><tbody>{items.map(item=><tr key={item.handle}><td><b>@{item.handle}</b></td><td>{item.price_cents!==null?new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(item.price_cents/100):'Unset'}</td><td>{item.owner_id?'Owned':item.order_id?'Reserved':item.listed?'For sale':'Unlisted'}</td><td>{item.owner_username?'@'+item.owner_username:'—'}</td><td><button className="btn btn-ghost btn-sm" disabled={busy||!!item.owner_id||!!item.order_id} onClick={()=>{setHandle(item.handle);setPrice(item.price_cents===null?'':(item.price_cents/100).toFixed(2));setListed(item.listed);}}>Edit</button></td></tr>)}</tbody></table></div>}
 </section>;
}
