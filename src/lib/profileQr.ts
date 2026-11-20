import qrcode from '../vendor/qrcode.js';
export function profileQr(url:string){const qr=qrcode(0,'M');qr.addData(encodeURI(url));qr.make();return qr.createSvgTag({cellSize:6,margin:24,scalable:true});}
export function downloadText(name:string,text:string,type='application/json'){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
