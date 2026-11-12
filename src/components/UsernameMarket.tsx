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
    setSelected(available[value % available.length].handle);
  };
  const buy = async (resumeHandle?:string) => {
    if (!user) { onSignUp(); return; }
    if ((!picked && !resumeHandle) || busy) return;
    setBusy(true); setError('');
    const result = await post<{ url: string }>('/api/market/checkout', { handle: resumeHandle || picked!.handle });
    if (result.ok && result.data.url) { window.location.assign(result.data.url); return; }
    setBusy(false);
    if (!result.ok && result.status === 409) { await load(); setSelected(''); }
    setError(result.ok ? 'Checkout did not return a link.' : result.error);
  };
  return <section className="market-store" id="username-market">
    <div className="market-store-toolbar"><span>Usernames</span><a href={user ? '#/dashboard/aliases' : '#/shop'} onClick={event => { if (!user) { event.preventDefault(); onSignUp(); } }}>Your aliases <ArrowRight size={14} /></a></div>
    {pending && <div className="market-pending"><div><b>Your reserved username: @{pending.handle}</b><p>{money(pending.priceCents)} · Finish checkout or release it before choosing another name.</p></div><div><button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={()=>void buy(pending.handle)}>Resume checkout</button><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={async()=>{setBusy(true);const result=await post('/api/market/cancel');setBusy(false);if(result.ok)await load();else setError(result.error);}}>Release reservation</button></div></div>}
    <div className="market-category-tabs" role="group" aria-label="Username stock">
      {([['1c', '1-character usernames'], ['symbol', 'Special characters']] as const).map(([id,label]) => <button type="button" key={id} aria-pressed={category===id} onClick={()=>{setCategory(id);setSelected('');setMode('choose');}}>{label}<span>{loading ? '—' : items.filter(item=>item.category===id && item.available && item.priceCents).length}</span></button>)}
    </div>
    <section className="market-picker" aria-label="Choose your username" aria-busy={loading}>
      <div className="market-picker-head"><div><h2>{category === '1c' ? '1-character usernames' : 'Special characters'}</h2><p>Choose an available username, or pick one at random.</p></div><div className="market-mode" role="group" aria-label="Selection mode"><button type="button" aria-pressed={mode === 'choose'} onClick={() => setMode('choose')}>Choose one</button><button type="button" aria-pressed={mode === 'random'} onClick={pickRandom} disabled={loading || !available.length}>Random</button></div></div>
      {loading ? <p role="status">Checking current stock…</p> : null}
      {error ? <div className="market-error" role="alert">{error} <button type="button" onClick={() => void load()}>Refresh stock</button></div> : null}
      {!loading && !error && !available.length ? <div className="market-stock-empty"><h3>No {category === '1c' ? '1-character usernames' : 'special characters'} listed.</h3><p>There are no available usernames in this category.</p></div> : null}
      {available.length ? <div className="market-character-grid" role="group" aria-label="Available usernames">{available.map(item => <button type="button" key={item.handle} className={selected === item.handle ? 'is-picked' : ''} aria-pressed={selected === item.handle} aria-label={`Choose @${item.handle}, ${money(item.priceCents!)}`} onClick={() => { setSelected(item.handle); setMode('choose'); }}><b>{item.handle}</b><span>{money(item.priceCents!)}</span></button>)}</div> : null}
      <div className="market-selection"><div className="market-selected-glyph" aria-hidden="true">{picked?.handle || '—'}</div><div className="market-selection-copy"><b>{picked ? `tourn.lol/${picked.handle}` : 'Select a username'}</b><span>{picked ? (mode === 'random' ? 'Random selection · confirm the name and price below' : 'This username will be added to your account') : 'The selected name and price will appear here.'}</span></div><div className="market-selection-buy"><b>{picked ? money(picked.priceCents!) : '—'}</b><button type="button" className="btn btn-primary" disabled={!picked || busy} onClick={() => void buy()}>{busy ? 'Opening checkout…' : user ? 'Buy username' : 'Sign in to buy'} <ArrowRight size={14}/></button></div></div>
      {mode === 'random' && picked ? <button type="button" className="market-reroll" onClick={pickRandom}>Pick another random name ↻</button> : null}
    </section>
    <p className="market-purchase-note">One-time purchase. Use it on your profile or gift it from your aliases.</p>
  </section>;
}
