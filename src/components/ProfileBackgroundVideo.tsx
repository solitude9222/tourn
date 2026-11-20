import {normalizeStudio,type StudioOptions} from "../lib/studioOptions";
import {useEffect,useRef,useState} from "react";
import type {BackgroundSettings} from "../lib/profileAssets";
import {audioBusState,setAudioBus} from "../lib/audioBus";

/** Start the fade only when real playback is ready; keep entry gating separate. */
export function ProfileBackgroundVideo({settings,entryActive,interactive,studio:input}:{settings:BackgroundSettings;entryActive:boolean;interactive:boolean;studio?:StudioOptions}) {
 const studio=normalizeStudio(input);
 const ref=useRef<HTMLVideoElement>(null);
 const activated=useRef(false);
 const allowSound=useRef(false);
 const [visible,setVisible]=useState(false);
 /* A visitor who asked their browser to save data should not download a
    background video just to watch a card load. */
 const [saveData]=useState(()=>Boolean((navigator as Navigator&{connection?:{saveData?:boolean}}).connection?.saveData));
 const waitingForEntry=settings.videoWaitForEntry && entryActive;
 allowSound.current=interactive && settings.videoAudio;

 useEffect(()=>{
  const video=ref.current;if(!video)return;
  video.volume=settings.videoVolume;
  video.muted=!(allowSound.current && activated.current);
  const unlock=()=>{
   const first=!activated.current;
   activated.current=true;
   video.muted=!allowSound.current;
   /* Turning the video's sound on is the visitor's first gesture, so the
      profile's track starts with it instead of waiting for a second click. */
   if(first&&allowSound.current)setAudioBus({playToken:audioBusState().playToken+1});
  };
  document.addEventListener("pointerdown",unlock);
  document.addEventListener("keydown",unlock);
  return()=>{document.removeEventListener("pointerdown",unlock);document.removeEventListener("keydown",unlock);};
 },[settings.videoVolume,settings.videoAudio,interactive]);

 useEffect(()=>{
  const video=ref.current;if(!video)return;
  let cancelled=false,delayElapsed=false;
  setVisible(false);video.pause();
  // The owner's own background: a visitor's OS motion preference does not stop it.
  if(waitingForEntry||saveData)return;
  const seek=()=>{
   try{video.currentTime=Math.min(settings.videoStartAt||0,Number.isFinite(video.duration)?Math.max(0,video.duration-.1):settings.videoStartAt||0);}
   catch{/* Wait for loadedmetadata before seeking. */}
  };
  const play=()=>{
   if(cancelled || !delayElapsed)return;
   void video.play().then(()=>{if(!cancelled)setVisible(true);}).catch(()=>{/* Retry on the next user gesture if autoplay was blocked. */});
  };
  if(video.readyState>=1)seek();
  video.addEventListener("loadedmetadata",seek);
  const timer=window.setTimeout(()=>{delayElapsed=true;play();},(settings.videoDelay||0)*1000);
  document.addEventListener("pointerdown",play);
  document.addEventListener("keydown",play);
  return()=>{
   cancelled=true;clearTimeout(timer);video.pause();
   video.removeEventListener("loadedmetadata",seek);
   document.removeEventListener("pointerdown",play);document.removeEventListener("keydown",play);
  };
 },[settings.videoUrl,settings.videoDelay,settings.videoStartAt,waitingForEntry,saveData]);

 return <>{studio.videoPoster?<img className="lkr-bg-video" src={studio.videoPoster} alt="" aria-hidden="true" style={{objectFit:settings.fit||'cover',objectPosition:(settings.positionX??50)+'% '+(settings.positionY??50)+'%',opacity:1}}/>:null}<video ref={ref} className={`lkr-bg-video${visible?" is-playing":""}`} src={settings.videoUrl} poster={studio.videoPoster||undefined} onTimeUpdate={event=>{const video=event.currentTarget;const end=studio.videoLoopEnd||studio.videoEnd;if(end<=0||video.currentTime<end)return;const start=Math.max(0,studio.videoLoopStart||settings.videoStartAt||0);/* A loop that starts at or after its end would seek forever, so hold the last frame instead. */if(start>=end-.05){video.pause();return;}video.currentTime=start;}} onError={()=>setVisible(false)} muted loop playsInline preload={saveData?"none":"auto"} style={{objectFit:settings.fit||"cover",objectPosition:`${settings.positionX??50}% ${settings.positionY??50}%`,opacity:visible?1:0,transition:`opacity ${settings.videoFade??700}ms ease`}}/></>;
}
