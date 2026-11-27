export function nextTrack(index:number,count:number,loop:boolean){return count<2?null:index+1<count?index+1:loop?0:null;}
export function crossfadeGains(progress:number,volume:number):[number,number]{const p=Math.max(0,Math.min(1,Number.isFinite(progress)?progress:0)),level=Math.max(0,Math.min(1,Number.isFinite(volume)?volume:0));return [level*(1-p),level*p];}
