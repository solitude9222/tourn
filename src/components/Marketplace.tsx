import {useEffect,useState,type FormEvent} from 'react';
import {api} from '../lib/backend';
import {useAuth} from '../lib/auth';
import {openCatalogCheckout} from '../lib/sellAuth';
import '../marketplace.css';

type Product={id:string;title:string;description:string;image_url:string;price_cents:number;currency:string;reward:'premium'|'badge';badge_id:string|null;checkout_env?:string;stock:number|null;enabled:boolean;ready:boolean};
const empty:Product={id:'',title:'',description:'',image_url:'',price_cents:100,currency:'USD',reward:'premium',badge_id:null,checkout_env:'',stock:null,enabled:false,ready:false};
const price=(p:Product)=>{try{return new Intl.NumberFormat(undefined,{style:'currency',currency:p.currency}).format(p.price_cents/100);}catch{return `${p.currency} ${(p.price_cents/100).toFixed(2)}`;}};
function useProducts(admin=false){
 const [products,setProducts]=useState<Product[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[attempt,retry]=useState(0);
 useEffect(()=>{let active=true;setLoading(true);setError('');void api<{products:Product[]}>(admin?'/api/admin/marketplace/products':'/api/marketplace/products').then(result=>{if(!active)return;if(result.ok&&Array.isArray(result.data.products))setProducts(result.data.products);else setError(!result.ok?result.error||'Products could not load.':'Products could not load.');setLoading(false);});return()=>{active=false;};},[admin,attempt]);
 return {products,loading,error,reload:()=>retry(n=>n+1)};
}
export function MarketplacePage({onSignUp}:{onSignUp:()=>void}){
 const {user}=useAuth(),{products,loading,error,reload}=useProducts();
 const [buying,setBuying]=useState(''),[message,setMessage]=useState('');
 const buy=async(p:Product)=>{if(!user){onSignUp();return;}setBuying(p.id);setMessage('');try{await openCatalogCheckout(p.id);}catch(error){setMessage(error instanceof Error?error.message:'Checkout could not open.');}finally{setBuying('');}};
 return <main className="page marketplace-page"><div className="market-wrap"><header><span className="market-kicker">Tourn marketplace</span><h1>Made for your profile.</h1><p>Browse products published by Tourn. Final price and payment details are shown at checkout.</p></header>
 {loading?<p role="status">Loading products…</p>:error?<div role="alert"><p>{error}</p><button onClick={reload}>Retry products</button></div>:!products.length?<div className="market-empty"><img src="/brand/tourn-mark.svg" alt="" width="48" height="48"/><h2>Nothing on sale right now</h2><p>New products appear here when Tourn publishes them.</p><a href="#/premium">Explore Premium</a></div>:<div className="market-grid">{products.map(p=><article className="market-product" key={p.id}>{p.image_url?<img className="market-art" src={p.image_url} alt="" loading="lazy"/>:<div className="market-art market-brand"><img src="/brand/tourn-mark.svg" alt="" width="56" height="56"/></div>}<div className="market-product-body"><small>{p.reward==='premium'?'Premium membership':'Profile badge'}</small><h2>{p.title}</h2><p>{p.description}</p><div className="market-product-bottom"><strong>{price(p)}</strong><span>{p.stock===null?'Digital product':p.stock===0?'Sold out':`${p.stock} remaining`}</span></div><button disabled={Boolean(buying)||!p.ready||p.stock===0} onClick={()=>void buy(p)}>{buying===p.id?'Opening checkout…':p.stock===0?'Sold out':!p.ready?'Coming soon':user?'Buy product':'Sign in to buy'}</button></div></article>)}</div>}
 {message?<p className="market-message" role="alert">{message}</p>:null}</div></main>;
}
export function AdminMarketplace(){
 const {products,loading,error,reload}=useProducts(true),[draft,setDraft]=useState<Product>(empty),[editing,setEditing]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[saved,setSaved]=useState<Product|null>(null);
 const patch=(value:Partial<Product>)=>setDraft(d=>({...d,...value}));
 const save=async(event:FormEvent)=>{event.preventDefault();if(busy)return;setBusy(true);setMessage('');const result=await api<{product:Product}>(editing?`/api/admin/marketplace/products/${encodeURIComponent(draft.id)}`:'/api/admin/marketplace/products',{method:editing?'PATCH':'POST',body:JSON.stringify(draft)});setBusy(false);if(!result.ok){setMessage(result.error||'Product could not save.');return;}setSaved(result.data.product);setDraft(result.data.product);setEditing(true);setMessage('Product saved. Configure its backend key, then restart the backend.');reload();};
 return <section className="adm-panel market-admin"><header><h2>Marketplace</h2><p>Create real Tourn products. Each product uses its own backend environment key; never paste API secrets here.</p></header>
 <div className="market-admin-grid"><section><h3>Products</h3>{loading?<p role="status">Loading products…</p>:error?<p role="alert">{error}<button onClick={reload}>Retry</button></p>:!products.length?<p>No products yet. Create your first draft.</p>:products.map(p=><button className="market-admin-row" key={p.id} onClick={()=>{setDraft(p);setEditing(true);setSaved(null);setMessage('');}}><span><b>{p.title}</b><small>{p.id} · {price(p)}</small></span><span>{!p.enabled?'Draft':!p.ready?'Needs backend key':p.stock===0?'Sold out':'Published'}</span></button>)}<button className="adm-btn" onClick={()=>{setDraft(empty);setEditing(false);setSaved(null);setMessage('');}}>+ New product</button></section>
 <form onSubmit={event=>void save(event)}><h3>{editing?'Edit product':'Create product'}</h3><div className="market-fields">
 <label>Product ID<input value={draft.id} disabled={editing} required pattern="[a-z0-9][a-z0-9-]{1,59}" placeholder="summer-badge" onChange={e=>patch({id:e.target.value})}/></label>
 <label>Title<input value={draft.title} required maxLength={100} onChange={e=>patch({title:e.target.value})}/></label>
 <label className="market-wide">Description<textarea value={draft.description} maxLength={1200} rows={3} onChange={e=>patch({description:e.target.value})}/></label>
 <label className="market-wide">Image URL<input type="url" placeholder="https://…" value={draft.image_url} onChange={e=>patch({image_url:e.target.value})}/></label>
 <label>Price in cents<input type="number" min={1} max={10000000} step={1} value={draft.price_cents} onChange={e=>patch({price_cents:Number(e.target.value)})}/></label>
 <label>Currency<input value={draft.currency} maxLength={3} onChange={e=>patch({currency:e.target.value.toUpperCase()})}/></label>
 <label>Delivery<select aria-label="Delivery" value={draft.reward} disabled={editing} onChange={e=>patch({reward:e.target.value as Product['reward'],badge_id:e.target.value==='badge'?'summer':null})}><option value="premium">Lifetime Premium</option><option value="badge">Profile badge</option></select></label>
 {draft.reward==='badge'?<label>Badge<select aria-label="Badge" value={draft.badge_id||'summer'} disabled={editing} onChange={e=>patch({badge_id:e.target.value})}>{['easter','autumn','summer','christmas_2026','halloween_2026'].map(id=><option key={id} value={id}>{id.replaceAll('_',' ')}</option>)}</select></label>:null}
 <label>Stock<input type="number" min={0} step={1} placeholder="Unlimited digital stock" value={draft.stock??''} onChange={e=>patch({stock:e.target.value===''?null:Number(e.target.value)})}/></label>
 <label className="market-wide">Backend environment key<input value={draft.checkout_env||''} disabled={editing} placeholder={`TOURN_PRODUCT_${draft.id.replaceAll('-','_').toUpperCase()||'PRODUCT_ID'}`} onChange={e=>patch({checkout_env:e.target.value.toUpperCase()||undefined})}/></label>
 <label className="market-check market-wide"><input type="checkbox" checked={draft.enabled} onChange={e=>patch({enabled:e.target.checked})}/>Publish in marketplace</label></div>
 <p className="market-note">Match the price, currency and stock in SellAuth. Finite stock is checked before checkout and updated after verified payment; SellAuth must enforce the final sale limit. Delivery type and checkout key are fixed after creation.</p>
 <button className="adm-btn adm-btn--primary" type="submit" disabled={busy}>{busy?'Saving…':'Save product'}</button>
 {message?<p role="status">{message}</p>:null}{saved?<div className="market-env"><h4>Backend setup</h4><p>Add this environment variable on your backend host. Replace the IDs with this product’s real SellAuth product and variant IDs.</p><code>{saved.checkout_env}=PRODUCT_ID:VARIANT_ID</code><p>Restart or redeploy the backend after saving the variable. Checkout stays disabled until the mapping is valid.</p></div>:null}
 </form></div></section>;
}
