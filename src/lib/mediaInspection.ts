export type MediaInfo={width:number;height:number;duration:number;bytes:number;poster:string};
export function inspectAudio(file:File):Promise<{duration:number;bytes:number}>{return new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),audio=new Audio();let done=false;const finish=(error?:Error)=>{if(done)return;done=true;clearTimeout(timer);const duration=Number.isFinite(audio.duration)?audio.duration:0;audio.removeAttribute('src');audio.load();URL.revokeObjectURL(url);if(error)reject(error);else resolve({duration,bytes:file.size});};const timer=setTimeout(()=>finish(new Error('Audio metadata is unavailable.')),1500);audio.preload='metadata';audio.onloadedmetadata=()=>finish();audio.onerror=()=>finish(new Error('Audio metadata could not be read.'));audio.src=url;});}
export function inspectMedia(file:File,poster=false):Promise<MediaInfo>{
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file),video=file.type.startsWith('video/');
  const element=video?document.createElement('video'):new Image();let finished=false;
  const clean=()=>{clearTimeout(timer);element.removeAttribute('src');if(element instanceof HTMLVideoElement)element.load();URL.revokeObjectURL(url);};
  const finish=(error?:Error)=>{if(finished)return;finished=true;if(error){clean();reject(error);return;}const width=element instanceof HTMLVideoElement?element.videoWidth:(element as HTMLImageElement).naturalWidth,height=element instanceof HTMLVideoElement?element.videoHeight:(element as HTMLImageElement).naturalHeight;
   let image='';if(poster&&video&&width&&height){try{const canvas=document.createElement('canvas');canvas.width=Math.min(960,width);canvas.height=Math.round(height*canvas.width/width);canvas.getContext('2d')?.drawImage(element as HTMLVideoElement,0,0,canvas.width,canvas.height);image=canvas.toDataURL('image/jpeg',.75);}catch{/* A poster is optional. */}}
   const info={width,height,duration:element instanceof HTMLVideoElement&&Number.isFinite(element.duration)?element.duration:0,bytes:file.size,poster:image};clean();if(!width||!height)reject(new Error('This file has no readable image dimensions.'));else resolve(info);
  };
  const timer=setTimeout(()=>finish(new Error('The media preview timed out. Try a smaller file or a different format.')),12000);
  element.onerror=()=>finish(new Error(video?'This browser cannot play that video. Export an MP4 (H.264) or WebM and try again.':'That image could not be decoded. Choose another PNG, JPEG, WebP or GIF.'));
  if(element instanceof HTMLVideoElement){element.preload=poster?'auto':'metadata';element.muted=true;element.onloadedmetadata=()=>{if(!poster)finish();};element.onloadeddata=()=>finish();}else element.onload=()=>finish();
  element.src=url;
 });
}
