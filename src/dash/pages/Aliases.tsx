import "../../pages.css";
import { useCallback, useEffect, useState } from 'react';
import { api, post } from '../../lib/backend';
import { useAuth } from '../../lib/auth';
import { Button, Card, CardHead } from '../ui';
type Inventory = {items:{handle:string;acquired_at:string}[];primary:string;username:string;alias2:string|null};
export function AliasesPage(){
  const {retryAuth}=useAuth();
  const [data,setData]=useState<Inventory|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const [gift,setGift]=useState(''),[recipient,setRecipient]=useState(''),[confirm,setConfirm]=useState('');
  const load=useCallback(async()=>{const result=await api<Inventory>('/api/account/aliases');if(result.ok)setData(result.data);else setMessage(result.error);},[]);
  useEffect(()=>{void load();const timer=window.setInterval(()=>void load(),5000);return()=>window.clearInterval(timer);},[load]);
  const action=async(path:string,body:object)=>{setBusy(true);setMessage('');const result=await post<{ok:boolean}>(path,body);setBusy(false);if(!result.ok){setMessage(result.error);return;}setMessage(path.endsWith('gift')?'Username transferred. The recipient can activate it in their aliases.':'Your profile address is now active.');setGift('');setRecipient('');setConfirm('');await Promise.all([load(),retryAuth()]);};
  return <><Card><CardHead icon="link" title="Your aliases" subtitle="Owned usernames, connected to your real account."/><p>Your original address: <b>tourn.lol/{data?.username || '…'}</b></p><p>Active address: <b>tourn.lol/{data?.primary || '…'}</b></p><a className="btn btn-primary btn-sm" href="#/shop">Browse the marketplace ↗</a></Card>
    {new URLSearchParams(window.location.search).get('username_checkout')==='success' && <Card><p role="status">Your checkout returned successfully. Purchased names appear here after the payment is verified.</p></Card>}
    {message && <Card><p role="status">{message}</p></Card>}
    {data?.items.length===0 && <Card><h3>Your collection starts here.</h3><p>Purchased and gifted usernames live here. Use one on your profile or give it to another member.</p></Card>}
    {data?.items.map(item=><Card key={item.handle}><div className="alias-item"><div><small>OWNED USERNAME</small><h2>@{item.handle}</h2><a href={'#/profile/'+encodeURIComponent(item.handle)}>tourn.lol/{item.handle} ↗</a></div><div className="tw-row"><Button disabled={busy || data.primary===item.handle} onClick={()=>void action('/api/account/aliases/activate',{handle:item.handle})}>{data.primary===item.handle?'Active on profile':'Use on profile'}</Button><Button disabled={busy} onClick={()=>{setGift(item.handle);setRecipient('');setConfirm('');}}>Gift username</Button></div></div>
      {gift===item.handle && <form className="alias-gift" onSubmit={e=>{e.preventDefault();void action('/api/account/aliases/gift',{handle:gift,recipient,confirmRecipient:confirm});}}><h3>Give @{gift} to another member</h3><p>This transfers ownership and removes the username from your account. The recipient can use or gift it.</p><label>Recipient’s original account username<input required value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="username" autoComplete="off"/></label><label>Type their original username again to confirm<input required value={confirm} onChange={e=>setConfirm(e.target.value)} autoComplete="off"/></label><div className="tw-row"><Button type="submit" variant="primary" disabled={busy || !recipient || recipient!==confirm}>Transfer ownership</Button><Button type="button" disabled={busy} onClick={()=>setGift('')}>Cancel</Button></div></form>}
    </Card>)}
  </>;
}
