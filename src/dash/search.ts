/** Match literal text first; tolerate one mistyped character in longer words. */
export function matchesSetting(label:string,query:string){
 const words=label.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(Boolean);
 const tokens=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
 const near=(a:string,b:string)=>{if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,edits=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++edits>1)return false;if(a.length>b.length)i++;else if(b.length>a.length)j++;else{i++;j++;}}return edits+(a.length-i)+(b.length-j)<=1;};
 return tokens.every(t=>words.some(w=>w.includes(t)||(t.length>=4&&near(w,t))));
}
