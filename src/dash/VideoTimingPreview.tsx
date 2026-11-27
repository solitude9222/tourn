import {useEffect,useRef,useState} from 'react';
import type {BackgroundSettings} from '../lib/profileAssets';
import {Button} from './ui';
/** Muted rehearsal: never sends a play token to the profile audio bus. */
export function VideoTimingPreview({settings}:{settings:BackgroundSettings}){
 const video=useRef<HTMLVideoElement>(null),[running,setRunning]=useState(false),[elapsed,setElapsed]=useState(0),[error,setError]=useState('');
 const fade=settings.videoFade/1000,total=settings.videoDelay+fade+2;
 useEffect(()=>{const element=video.current;if(!element||!running)return;let frame=0,stopped=false,started=false;const start=performance.now();const draw=()=>{if(stopped)return;const time=(performance.now()-start)/1000;setElapsed(time);if(!started&&time>=settings.videoDelay){started=true;element.currentTime=settings.videoStartAt;void element.play().catch(()=>{setError('Playback was blocked. Check the video format or try again.');setRunning(false);});}if(time<total)frame=requestAnimationFrame(draw);else{element.pause();setRunning(false);}};frame=requestAnimationFrame(draw);return()=>{stopped=true;cancelAnimationFrame(frame);element.pause();};},[running,settings.videoDelay,settings.videoFade,settings.videoStartAt,total]);
 const opacity=elapsed<settings.videoDelay?0:fade?Math.min(1,(elapsed-settings.videoDelay)/fade):1;
 return <section className="video-timing-preview" aria-label="Video timing preview"><div className="video-timing-screen"><video ref={video} src={settings.videoUrl} muted playsInline preload="metadata" style={{opacity}} onError={()=>{setError('The preview video could not load. Replace it or retry.');setRunning(false);}}/></div><div className="tw-row"><Button onClick={()=>{if(running){setRunning(false);return;}setError('');setElapsed(0);setRunning(true);}}>{running?'Stop preview':'Preview video entrance'}</Button><span>{elapsed.toFixed(1)}s / {total.toFixed(1)}s</span></div><progress max={total} value={Math.min(total,elapsed)} aria-label="Video entrance timeline"/><small>Delay · {settings.videoDelay}s → fade · {fade}s → visible. Muted preview starts as if your visitor has already entered.</small>{error?<p role="alert">{error}</p>:null}</section>;
}
