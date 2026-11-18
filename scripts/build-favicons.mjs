// Render the repository's vector mark onto transparent favicon canvases.
import {chromium} from 'playwright-core';
import {readFile,writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH||'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe',headless:true});
try {
 const page=await browser.newPage();const svg=await readFile('public/brand/favicon-blue.svg','utf8');const images=[];
 for(const size of [16,32,48,180]){
  const png=await page.evaluate(async({svg,size})=>{const img=new Image();img.src='data:image/svg+xml,'+encodeURIComponent(svg);await img.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=size;canvas.getContext('2d').drawImage(img,0,0,size,size);return canvas.toDataURL('image/png').split(',')[1];},{svg,size});
  const bytes=Buffer.from(png,'base64');await writeFile(size===180?'public/favicon-rounded.png':`public/favicon-${size}.png`,bytes);if(size<180)images.push({size,bytes});
 }
 const header=Buffer.alloc(6+16*images.length);header.writeUInt16LE(1,2);header.writeUInt16LE(images.length,4);let offset=header.length;
 images.forEach(({size,bytes},i)=>{const at=6+i*16;header[at]=size;header[at+1]=size;header.writeUInt16LE(1,at+4);header.writeUInt16LE(32,at+6);header.writeUInt32LE(bytes.length,at+8);header.writeUInt32LE(offset,at+12);offset+=bytes.length;});await writeFile('public/favicon.ico',Buffer.concat([header,...images.map(i=>i.bytes)]));
}finally{await browser.close();}
