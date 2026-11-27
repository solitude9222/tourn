import {usePreference} from '../preferences';
import {useRef,useState,type CSSProperties} from 'react';
import {useDash,type Page} from '../context';
import {Button,Icon,type IconName} from '../ui';
import {LinkerPreview} from '../../components/LinkerPreview';

export function GettingStartedPage(){
 const {user,about,setAbout,notify,widgets,badges,links,profileViews,go,dirty,save,publishStatus}=useDash();
 const [progress,setProgress]=usePreference<{step:number;reviewed:number[]}>('setup-guide-'+user.id,{step:0,reviewed:[]});
 const step=Number.isInteger(progress.step)?Math.min(5,Math.max(0,progress.step)):0;
 const reviewed=Array.isArray(progress.reviewed)?progress.reviewed:[];
 const setStep=(next:number)=>setProgress({step:Math.min(5,Math.max(0,next)),reviewed:[...new Set([...reviewed,step])]});
 const [phone,setPhone]=useState(false),[depth,setDepth]=useState(true);
 const stage=useRef<HTMLDivElement>(null);
 const steps:{title:string;page:Page;icon:IconName;done:boolean;copy:string;tips:string[]}[]=[
  {title:'Choose your identity',page:'settings',icon:'user',done:Boolean(user.alias&&!user.aliasRequired),copy:'Your one alias is the address people use to find you. Your display name can be more expressive.',tips:['Set your public alias in Account settings.','Use Profile → Details to change the name shown on your card.']},
  {title:'Make the card yours',page:'profile-main',icon:'layout',done:Boolean(about.bio.trim()),copy:'Start with the clean default card. Add only the details you want visitors to see.',tips:['Write a short bio and optional display name.','Adjust your card width and name size in Profile → Card.']},
  {title:'Set the scene',page:'appearance',icon:'image',done:Boolean(about.assets.avatarUrl||about.assets.background.imageUrl||about.assets.background.videoUrl),copy:'Manage your avatar, banner, background, cursor and audio from their own media controls.',tips:['Click Avatar for media and decoration options.','Choose an image, video or color for the background.','Use Decorations for overlays and other effects.']},
  {title:'Connect your world',page:'links',icon:'link',done:links.links.some(link=>link.visible&&Boolean(link.url.trim())),copy:'Give each link a clear destination, then add the widgets and interests that matter to you.',tips:['Add and reorder your social links.','Add Discord or other widgets from Widgets.','Build out projects and interests in Portfolio.']},
  {title:'Check the layout',page:'layout',icon:'grid',done:false,copy:'Use the full Layout preview to check every screen size and move your elements into place.',tips:['Switch between desktop, tablet and phone.','Check that names, badges and widgets fit.','Try opening your public page on your phone too.']},
  {title:'Save and share',page:'analytics',icon:'chart',done:!dirty,copy:'Changes remain a draft until you press Save now. Once saved, share your primary profile link.',tips:['Use Save now to publish your current changes.','Open the public page to check what visitors see.','Visit Analytics to see real profile traffic.']},
 ];
 const active=steps[step];
 const complete=steps.filter((item,index)=>item.done||reviewed.includes(index)).length;
 const reset=()=>{stage.current?.style.setProperty('--guide-x','0deg');stage.current?.style.setProperty('--guide-y','0deg');};
 return <div className="setup-journey"><div className="journey-top"><p>A full workspace walkthrough, with your current profile.</p><div className="tw-row"><Button onClick={()=>setProgress({step:0,reviewed:[]})}>Restart guide</Button><Button onClick={()=>go('home')} icon="home">Overview</Button></div></div><progress aria-label="Guide progress" max={steps.length} value={complete}/><div className="journey-grid">
 <section className="journey-instructions"><ol aria-label="Getting started steps">{steps.map((item,index)=><li key={item.title}><button onClick={()=>setStep(index)} aria-current={step===index?'step':undefined}><span>{item.done?<Icon name="check" size={16}/>:index+1}</span><b>{item.title}</b><Icon name={item.icon} size={17}/></button></li>)}</ol>
 <article className="journey-detail" key={step} aria-live="polite"><small>STEP {step+1} / {steps.length}</small><h2>{active.title}</h2><p>{active.copy}</p>{step===0?<Button onClick={()=>{setAbout(current=>({...current,metadata:{...current.metadata,noIndex:true},design:{...current.design,showLocation:false,showJoined:false}}));notify('Privacy defaults applied','Location and join date are hidden, and search indexing is disabled. Save now to publish.');}}>Use privacy-first defaults</Button>:null}<ul>{active.tips.map(tip=><li key={tip}>{tip}</li>)}</ul><Button variant="primary" onClick={()=>go(active.page)}>Open settings <Icon name="chevron-right" size={15}/></Button></article>
 <div className="journey-navigation"><Button disabled={step===0} onClick={()=>setStep(step-1)}>Previous</Button><Button disabled={step===steps.length-1} onClick={()=>setStep(step+1)}>Next step</Button></div></section>
 <section className="journey-preview"><div className="journey-preview-tools"><b>Your profile</b><div><button onClick={()=>setPhone(v=>!v)} aria-pressed={phone}>{phone?'Phone':'Desktop'}</button><button onClick={()=>{setDepth(v=>!v);reset();}} aria-pressed={depth}>3D preview</button></div></div>
 <div ref={stage} className={`journey-stage${phone?' is-phone':''}${depth?' has-depth':''}`} onPointerMove={event=>{if(!depth||event.pointerType==='touch'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;const box=event.currentTarget.getBoundingClientRect();event.currentTarget.style.setProperty('--guide-x',`${(event.clientY-box.top-box.height/2)/box.height*-5}deg`);event.currentTarget.style.setProperty('--guide-y',`${(event.clientX-box.left-box.width/2)/box.width*7}deg`);}} onPointerLeave={reset}>
 <div className="journey-device"><div className="journey-device-bar"><i/><i/><i/><span>tourn.lol/{user.alias||'your-alias'}</span></div><div className="journey-screen"><div className="journey-profile-scale" style={{'--guide-width':phone?'390px':'900px'} as CSSProperties}><LinkerPreview user={user} about={about} widgets={widgets} links={links} badges={badges} views={profileViews} preview hideAudio showEntry={false} showMetadata={false}/></div></div></div></div>
 <p className="journey-preview-note">Current draft · decorative 3D view. Open Layout for interactive device checks.</p><div className="journey-publish"><span>{dirty?'You have unsaved changes.':'Your changes are saved.'}</span><Button variant="primary" disabled={!dirty||publishStatus==='saving'} onClick={save}>{publishStatus==='saving'?'Saving…':'Save now'}</Button></div></section>
 </div></div>;
}
