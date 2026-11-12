import { useCallback, useEffect, useState } from 'react';
import { api, post } from '../lib/backend';
import { useAuth } from '../lib/auth';
import { ArrowRight, CheckIcon } from './Icons';

type Item = { handle: string; category: '1c' | 'symbol'; priceCents: number | null; available: boolean };
const money = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
const CATEGORIES = [
  { id: '1c' as const, title: 'One character. All you.', glyph: 'a', label: '1-character usernames', description: 'A single letter or number. The shortest way to make your mark.', accent: 'blue' },
  { id: 'symbol' as const, title: 'A little out of the ordinary.', glyph: '✦', label: 'Special characters', description: 'A distinctive symbol for a profile that is unmistakably yours.', accent: 'violet' },
];
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
    <div className="market-store-toolbar"><span><i /> Official Tourn stock</span><a href={user ? '#/dashboard/aliases' : '#/shop'} onClick={event => { if (!user) { event.preventDefault(); onSignUp(); } }}>Your collection <ArrowRight size={14} /></a></div>
    {pending && <div className="market-pending"><div><b>Your reserved username: @{pending.handle}</b><p>{money(pending.priceCents)} · Finish checkout or release it before choosing another name.</p></div><div><button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={()=>void buy(pending.handle)}>Resume checkout</button><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={async()=>{setBusy(true);const result=await post('/api/market/cancel');setBusy(false);if(result.ok)await load();else setError(result.error);}}>Release reservation</button></div></div>}
    <div className="market-product-grid">
      {CATEGORIES.map(product => {
        const stock = items.filter(item => item.category === product.id && item.available && item.priceCents);
        const minimum = stock.length ? Math.min(...stock.map(item => item.priceCents!)) : null;
        return <button type="button" key={product.id} className={`market-product market-product--${product.accent}${category === product.id ? ' is-selected' : ''}`} onClick={() => { setCategory(product.id); setSelected(''); setMode('choose'); }} aria-pressed={category === product.id}>
          <span className="market-product-top"><span>USERNAME COLLECTION</span><span className="market-stock-pill">{loading ? 'Loading' : `${stock.length} available`}</span></span>
          <span className="market-product-art" aria-hidden="true"><b>{product.glyph}</b><span>tourn.lol/{product.glyph}</span></span>
          <span className="market-product-label">{product.label}</span><strong>{product.title}</strong><span className="market-product-description">{product.description}</span>
          <span className="market-product-bottom"><span>{minimum ? <>From <b>{money(minimum)}</b></> : 'Awaiting new stock'}<small>one-time purchase</small></span><span className="market-product-action">{category === product.id ? 'Selected' : 'Browse names'} <ArrowRight size={15}/></span></span>
        </button>;
      })}
    </div>
    <section className="market-picker" aria-label="Choose your username" aria-busy={loading}>
      <div className="market-picker-head"><div><span className="eyebrow eyebrow--sm">MAKE IT PERSONAL</span><h2>{category === '1c' ? 'Find your character.' : 'Find your signature.'}</h2><p>Pick a favorite or let us choose from the names available.</p></div><div className="market-mode" role="group" aria-label="Selection mode"><button type="button" aria-pressed={mode === 'choose'} onClick={() => setMode('choose')}>Choose one</button><button type="button" aria-pressed={mode === 'random'} onClick={pickRandom} disabled={loading || !available.length}>✧ Pick randomly</button></div></div>
      {loading ? <p role="status">Checking current stock…</p> : null}
      {error ? <div className="market-error" role="alert">{error} <button type="button" onClick={() => void load()}>Refresh stock</button></div> : null}
      {!loading && !error && !available.length ? <div className="market-stock-empty"><span>✦</span><h3>The next drop is on its way.</h3><p>No {category === '1c' ? 'single-character usernames' : 'special characters'} are available right now. Check back for new stock.</p></div> : null}
      {available.length ? <div className="market-character-grid" role="group" aria-label="Available usernames">{available.map(item => <button type="button" key={item.handle} className={selected === item.handle ? 'is-picked' : ''} aria-pressed={selected === item.handle} aria-label={`Choose @${item.handle}, ${money(item.priceCents!)}`} onClick={() => { setSelected(item.handle); setMode('choose'); }}><b>{item.handle}</b><span>{money(item.priceCents!)}</span></button>)}</div> : null}
      <div className="market-selection"><div className="market-selected-glyph" aria-hidden="true">{picked?.handle || '—'}</div><div className="market-selection-copy"><b>{picked ? `tourn.lol/${picked.handle}` : 'Choose a name to get started'}</b><span>{picked ? (mode === 'random' ? 'Random pick · review your name and price before checkout' : 'This username will be added to your account') : 'Only available stock can be purchased.'}</span></div><div className="market-selection-buy"><b>{picked ? money(picked.priceCents!) : '—'}</b><button type="button" className="btn btn-primary" disabled={!picked || busy} onClick={() => void buy()}>{busy ? 'Opening checkout…' : user ? 'Buy username' : 'Sign in to buy'} <ArrowRight size={14}/></button></div></div>
      {mode === 'random' && picked ? <button type="button" className="market-reroll" onClick={pickRandom}>Pick another random name ↻</button> : null}
    </section>
    <div className="market-promises">{['One-time purchase', 'Applied to your account', 'Yours to use or gift'].map(text => <span key={text}><CheckIcon size={14}/>{text}</span>)}</div>
  </section>;
}
