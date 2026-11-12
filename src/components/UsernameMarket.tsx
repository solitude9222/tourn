import { useCallback, useEffect, useState } from 'react';
import { api, post } from '../lib/backend';
import { useAuth } from '../lib/auth';
import { ArrowRight } from './Icons';

type Item = { handle: string; category: '1c' | 'symbol'; priceCents: number | null; available: boolean };
const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

export function UsernameMarket({ onSignUp }: { onSignUp: () => void }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [pending,setPending] = useState<{handle:string;priceCents:number}|null>(null);
  const [category, setCategory] = useState<'1c' | 'symbol'>('1c');
  const [selected, setSelected] = useState('');
  const [mode, setMode] = useState<'choose' | 'random'>('choose');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [buying, setBuying] = useState('');
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    const [result, reservation] = await Promise.all([api<{ items: Item[] }>('/api/market/usernames'),user ? api<{pending:{handle:string;priceCents:number}|null}>('/api/market/pending') : Promise.resolve(null)]);
    if(reservation?.ok)setPending(reservation.data.pending);
    if (result.ok && Array.isArray(result.data.items)) { setItems(result.data.items); setError(''); }
    else setError('Stock is temporarily unavailable. Please try again shortly.');
    setLoading(false);
  }, [user?.id]);
  useEffect(() => { void load(); }, [load]);
  const available = items.filter(item => item.category === category && item.available && item.priceCents);
  const picked = available.find(item => item.handle === selected);
  const pickRandom = () => {
    setMode('random');
    if (!available.length) { setSelected(''); return; }
    // Rejection sampling keeps every in-stock name equally likely.
    const limit = Math.floor(0x100000000 / available.length) * available.length;
    let value: number;
    do { value = crypto.getRandomValues(new Uint32Array(1))[0]; } while (value >= limit);
    const handle = available[value % available.length].handle;
    setSelected(handle);
    document.getElementById(`market-card-${handle}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  const buy = async (handle?: string) => {
    const target = handle || picked?.handle;
    if (!user) { onSignUp(); return; }
    if (!target || busy || buying) return;
    setBusy(true); setBuying(target); setError('');
    const result = await post<{ url: string }>('/api/market/checkout', { handle: target });
    if (result.ok && result.data.url) { window.location.assign(result.data.url); return; }
    setBusy(false); setBuying('');
    if (!result.ok && result.status === 409) { await load(); setSelected(''); }
    setError(result.ok ? 'Checkout did not return a link.' : result.error);
  };
  return <section className="market-store" id="username-market">
    <div className="market-store-toolbar"><span>Username stock</span><a href={user ? '#/dashboard/aliases' : '#/shop'} onClick={event => { if (!user) { event.preventDefault(); onSignUp(); } }}>Your aliases <ArrowRight size={14} /></a></div>
    {pending && <div className="market-pending"><div><b>Your reserved username: @{pending.handle}</b><p>{money(pending.priceCents)} · Finish checkout or release it before choosing another name.</p></div><div><button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={()=>void buy(pending.handle)}>Resume checkout</button><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={async()=>{setBusy(true);const result=await post('/api/market/cancel');setBusy(false);if(result.ok)await load();else setError(result.error);}}>Release reservation</button></div></div>}
    <div className="market-filter-row">
      <div className="market-category-tabs" role="group" aria-label="Username stock">
        {([['1c', '1-character'], ['symbol', 'Special characters']] as const).map(([id,label]) => <button type="button" key={id} aria-pressed={category===id} onClick={()=>{setCategory(id);setSelected('');setMode('choose');}}>{label}<span>{loading ? '—' : items.filter(item=>item.category===id && item.available && item.priceCents).length}</span></button>)}
      </div>
      <div className="market-mode" role="group" aria-label="Selection mode"><button type="button" aria-pressed={mode === 'choose'} onClick={() => setMode('choose')}>Choose one</button><button type="button" aria-pressed={mode === 'random'} onClick={pickRandom} disabled={loading || !available.length}>Random</button></div>
    </div>
    {loading ? <p className="market-status" role="status">Checking current stock…</p> : null}
    {error ? <div className="market-error" role="alert">{error} <button type="button" onClick={() => void load()}>Refresh stock</button></div> : null}
    {!loading && !error && !available.length ? <div className="market-stock-empty"><h3>No {category === '1c' ? '1-character usernames' : 'special characters'} in stock.</h3><p>New names are added as they become available. Try the other category.</p></div> : null}
    {available.length ? <div className="market-products" role="group" aria-label="Available usernames">{available.map(item => <article key={item.handle} id={`market-card-${item.handle}`} className={`market-product${selected === item.handle ? ' is-picked' : ''}`}>
      <button type="button" className="market-product-main" aria-pressed={selected === item.handle} aria-label={`Select @${item.handle}, ${money(item.priceCents!)}`} onClick={() => { setSelected(item.handle); setMode('choose'); }}>
        <span className="market-product-glyph" aria-hidden="true">{item.handle}</span>
        <span className="market-product-name">tourn.lol/{item.handle}</span>
      </button>
      <div className="market-product-foot">
        <span className="market-product-price">{money(item.priceCents!)}</span>
        <span className="market-product-stock">In stock</span>
        <button type="button" className="btn btn-primary btn-sm market-product-buy" disabled={busy} onClick={() => void buy(item.handle)}>{buying === item.handle ? 'Opening…' : user ? 'Buy' : 'Sign in'}</button>
      </div>
    </article>)}</div> : null}
    {available.length ? <div className="market-selection"><div className="market-selected-glyph" aria-hidden="true">{picked?.handle || '—'}</div><div className="market-selection-copy"><b>{picked ? `@${picked.handle}` : 'Nothing selected yet'}</b><span>{picked ? (mode === 'random' ? 'Random pick · buy it from the card or here' : 'This username is added to your account after payment') : 'Pick a name from the stock above to see it here.'}</span></div><div className="market-selection-buy"><b>{picked ? money(picked.priceCents!) : '—'}</b><button type="button" className="btn btn-primary" disabled={!picked || busy} onClick={() => void buy()}>{busy ? 'Opening checkout…' : user ? 'Buy username' : 'Sign in to buy'} <ArrowRight size={14}/></button></div></div> : null}
    <p className="market-purchase-note">One-time purchase · delivered to your account instantly · giftable from your aliases.</p>
  </section>;
}
