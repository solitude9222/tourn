import {useEffect,useRef,useState,type KeyboardEvent,type PointerEvent} from 'react';
export type SortableDrag={from:number;over:number};
function announce(message:string){let live=document.getElementById('workspace-sort-status');if(!live){live=document.createElement('div');live.id='workspace-sort-status';live.className='workspace-sr-only';live.setAttribute('role','status');live.setAttribute('aria-live','polite');document.body.append(live);}live.textContent=message;}
function scrollParent(node:HTMLElement){let parent=node.parentElement;while(parent){if(/auto|scroll/.test(getComputedStyle(parent).overflowY)&&parent.scrollHeight>parent.clientHeight)return parent;parent=parent.parentElement;}return document.scrollingElement as HTMLElement;}
/** Move only on release: row dimensions never change while the pointer is down. */
export function usePointerSort<T extends {id:string}>(items:T[],move:(from:number,to:number)=>void){
 const cleanup=useRef<(()=>void)|null>(null),refs=useRef(new Map<string,HTMLElement>()),dragRef=useRef<SortableDrag|null>(null);
 const [drag,setState]=useState<SortableDrag|null>(null);
 useEffect(()=>()=>cleanup.current?.(),[]);
 const setDrag=(next:SortableDrag|null)=>{dragRef.current=next;for(const [id,node] of refs.current){if(next&&items[next.over]?.id===id)node.dataset.sortOver="true";else delete node.dataset.sortOver;}setState(next);};
 const register=(id:string)=>(node:HTMLElement|null)=>{if(node)refs.current.set(id,node);else refs.current.delete(id);};
 const label=(index:number)=>(refs.current.get(items[index]?.id)?.textContent?.trim()||'Item').slice(0,90);
 const commit=(from:number,to:number)=>{if(from===to)return;const name=label(from);window.dispatchEvent(new Event("tourn:history-boundary"));move(from,to);window.dispatchEvent(new Event("tourn:history-boundary"));announce(name+' moved to position '+(to+1)+' of '+items.length+'. Undo with Ctrl or Command Z.');};
 const begin=(event:PointerEvent<HTMLElement>,index:number)=>{
  if(event.button!==0)return;cleanup.current?.();event.preventDefault();
  const pointerId=event.pointerId,ids=items.map(item=>item.id),parent=scrollParent(event.currentTarget);
  let y=event.clientY,frame=0,ended=false;
  setDrag({from:index,over:index});announce('Moving '+label(index)+'. Press Escape to cancel.');
  const targetIndex=()=>{for(let i=0;i<ids.length;i++){const rect=refs.current.get(ids[i])?.getBoundingClientRect();if(rect&&y<rect.top+rect.height/2)return i;}return Math.max(0,ids.length-1);};
  const draw=()=>{if(ended)return;const rect=parent===document.scrollingElement?{top:0,bottom:innerHeight}:parent.getBoundingClientRect();const delta=y<rect.top+48?-Math.min(18,(rect.top+48-y)/3):y>rect.bottom-48?Math.min(18,(y-rect.bottom+48)/3):0;if(delta)parent.scrollTop+=delta;const over=targetIndex();if(dragRef.current?.over!==over)setDrag({from:index,over});frame=requestAnimationFrame(draw);};
  const onMove=(e:globalThis.PointerEvent)=>{if(e.pointerId===pointerId)y=e.clientY;};
  const stop=()=>{ended=true;cancelAnimationFrame(frame);window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',finish);window.removeEventListener('pointercancel',finish);window.removeEventListener('keydown',onKey);window.removeEventListener('blur',cancel);document.body.classList.remove('tw-sorting');cleanup.current=null;};
  const cancel=()=>{stop();setDrag(null);announce('Reorder cancelled.');};
  const onKey=(e:globalThis.KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();cancel();}};
  const finish=(e:globalThis.PointerEvent)=>{if(e.pointerId!==pointerId)return;if(e.type==='pointercancel'){cancel();return;}y=e.clientY;const over=targetIndex();stop();setDrag(null);commit(index,over);};
  cleanup.current=()=>{stop();dragRef.current=null;};document.body.classList.add('tw-sorting');window.addEventListener('pointermove',onMove,{passive:true});window.addEventListener('pointerup',finish);window.addEventListener('pointercancel',finish);window.addEventListener('keydown',onKey);window.addEventListener('blur',cancel);frame=requestAnimationFrame(draw);
 };
 const keyDown=(event:KeyboardEvent<HTMLElement>,index:number)=>{if(!['ArrowUp','ArrowDown','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?items.length-1:index+(event.key==='ArrowDown'?1:-1);if(next>=0&&next<items.length)commit(index,next);};
 return {drag,begin,keyDown,register};
}
