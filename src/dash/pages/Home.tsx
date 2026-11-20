import {useEffect,useState} from 'react';
import {useDash,type Page} from '../context';
import {useAuth} from '../../lib/auth';
import {Button,Card,CardHead,Icon,Modal,type IconName} from '../ui';
import {AnalyticsPanel} from '../Analytics';
import {copyText} from '../files';
import {fetchLeaderboard,type LeaderboardEntry} from '../../lib/leaderboard';


export function HomePage(){
 const {user,about,links,profileViews,go,notify,isPremium}=useDash();
 const {linkDiscord}=useAuth();
 const [guideOpen,setGuideOpen]=useState(false),[guideStep,setGuideStep]=useState(0),[connecting,setConnecting]=useState(false);
 const [leaders,setLeaders]=useState<LeaderboardEntry[]|null>(null),[boardFailed,setBoardFailed]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setBoardFailed(false);void fetchLeaderboard('views',5).then(result=>{if(active)setLeaders(result.entries.slice(0,5));}).catch(()=>{if(active){setBoardFailed(true);setLeaders([]);}});return()=>{active=false;};},[attempt]);
 const handle=user.alias?.trim()||user.username,publicPath='/'+encodeURIComponent(handle);
 /* Every address that reaches this profile, in the order they were promised. */
 const domains=[{label:`${handle}.swats.bio`,note:'swats.bio subdomain'},{label:`${handle}.tourn.lol`,note:'tourn.lol subdomain'},{label:`tourn.lol/${handle}`,note:'tourn.lol path'},{label:'tourn.lol/swats',note:'swats.bio path'}];
 const connected=Boolean(user.discordLinked||user.discordId);
 const hasBackground=Boolean(about.assets.background.imageUrl||about.assets.background.videoUrl||about.assets.background.style==='gradient'||about.assets.background.color!=='#0b0d10');
 const steps:{label:string;done:boolean;page:Page;icon:IconName}[]=[
  {label:'Upload avatar',done:Boolean(about.assets.avatarUrl||user.avatarUrl),page:'appearance',icon:'image'},
  {label:'Add description',done:Boolean(about.bio.trim()),page:'profile-main',icon:'user'},
  {label:'Add background',done:hasBackground,page:'appearance',icon:'image'},
  {label:'Connect Discord account',done:connected,page:'settings',icon:'link'},
  {label:'Add socials',done:links.links.some(link=>link.visible&&link.url.trim()),page:'links',icon:'link'},
  {label:'Reach 10 profile views',done:typeof profileViews==='number'&&profileViews>=10,page:'analytics',icon:'eye'},
 ];
 const complete=steps.filter(step=>step.done).length,percent=Math.round(complete/steps.length*100);
 const joined=Date.parse(user.joinedAt||'');
 const stats:{label:string;value:string|number;detail:string;icon:IconName;page:Page}[]=[
  {label:'Username',value:user.username,detail:'Manage your account identity',icon:'user',page:'settings'},
  {label:'Alias',value:user.alias||'None yet',detail:user.alias?'Your public profile address':'Add a public alias in your settings',icon:'link',page:'settings'},
  {label:'User ID',value:typeof user.uid==='number'?user.uid:'—',detail:Number.isNaN(joined)?'Your account number':'Joined '+new Date(joined).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}),icon:'hash',page:'settings'},
  {label:'Profile Views',value:profileViews??'—',detail:'Lifetime visits to your profile',icon:'chart',page:'analytics'},
 ];
 const copy=async()=>{const ok=await copyText(window.location.origin+publicPath);notify(ok?'Profile link copied':'Profile link',ok?'Ready to share.':window.location.origin+publicPath);};
 const copyDomain=async(label:string)=>{const ok=await copyText(`https://${label}`);notify(ok?'Address copied':'Address',ok?label:`https://${label}`);};
 /* The guide walks the dashboard in the order a profile gets built. Each step
    names the real controls on that page, and the sidebar of the dialog keeps
    the current step lit so it reads as a path, not a wall of text. */
 const guideSteps:{title:string;short:string;blurb:string;items:string[];where:string;page:Page;icon:IconName}[]=[
  {title:'Make the page yours',short:'Media & fonts',where:'Customize → Appearance',page:'appearance',icon:'image',
   blurb:'Everything visual starts here: your picture, banner, background, type and music.',
   items:['Upload an avatar and wear a Discord decoration around it','Add a separate banner, plus a background image, video, gradient or solid colour','Choose the fonts and text sizes the whole page uses','Upload a track, add up to two more, and style the mute button']},
  {title:'Write your details',short:'Profile',where:'Customize → Profile → Details',page:'profile-main',icon:'user',
   blurb:'The words people read first, and the card that holds them.',
   items:['Display name, bio and a pronunciation guide','Profile card layout, avatar border and name effect','Entry screen for first-time visitors','Visibility switches for each block on the page']},
  {title:'Decorate every layer',short:'Decorations',where:'Customize → Decorations',page:'effects',icon:'sparkles',
   blurb:'Six galleries of effects, each applied independently.',
   items:['Name effects and Discord avatar decorations','Background effects, overlays and card lighting','Pointer effects, click bursts and cursor trails','Clear any effect without touching the rest']},
  {title:'Add your content',short:'Portfolio',where:'Customize → Portfolio, Social Links, Widgets',page:'portfolio-general',icon:'layers',
   blurb:'The pages and cards that sit under your header.',
   items:['Portfolio: about page, projects, gallery and interests','Social links with platform icons or a custom image','Widgets: Discord presence, Spotify and live counters','Media library for reusing anything you uploaded']},
  {title:'Check every device',short:'Layout',where:'Customize → Layout',page:'layout',icon:'layout',
   blurb:'See the page at phone, tablet and desktop sizes before you publish.',
   items:['Device previews at the real breakpoints','Mobile avatar, name and card sizes','Snap, alignment guides and locked elements','Navigation position and the reading progress bar']},
  {title:'Publish and share',short:'Analytics',where:'Analytics, plus the block at the bottom of the sidebar',page:'analytics',icon:'chart',
   blurb:'Watch what visitors do, then send them the real link.',
   items:['Profile views, referrers and the community leaderboard','The share button under your avatar copies your real address','Share image and metadata used by link previews','Unsaved changes are flagged before you leave a page']},
 ];
 const step=Math.min(guideStep,guideSteps.length-1),activeStep=guideSteps[step];
 return <div className="tw-overview">
  <div className="tw-overview-stats">{stats.map(stat=><button type="button" className="tw-overview-stat" key={stat.label} onClick={()=>go(stat.page)}><span><Icon name={stat.icon} size={16}/>{stat.label}</span><b>{typeof stat.value==='number'?stat.value.toLocaleString():stat.value}</b><small>{stat.detail}</small></button>)}</div>
  <section className="tw-setup-section" aria-labelledby="profile-setup-title"><header><h2 id="profile-setup-title">Profile Setup</h2><p>Finish the core steps and jump into the most useful actions.</p></header>
   <div className="tw-setup-grid"><Card className="tw-setup-checklist"><CardHead title="Profile Quickstart"/><div className="tw-setup-progress-label"><span>Complete the essentials that make your profile feel finished.</span><b>{percent}% complete</b></div><progress className="tw-setup-progress" value={complete} max={steps.length} aria-label="Profile setup"/>
    <div className={`tw-setup-notice${percent===100?' is-complete':''}`}><Icon name={percent===100?'check':'info'} size={17}/><span><b>{percent===100?'Your profile is ready to share.':'Your profile is not complete yet.'}</b><small>{percent===100?'The core steps are complete. Keep making it your own.':'Finish the tasks below to make your profile more useful and attractive.'}</small></span></div>
    <div className="tw-setup-steps">{steps.map(step=><button type="button" key={step.label} className={step.done?'is-complete':''} onClick={()=>go(step.page)}><Icon name={step.done?'check':step.icon} size={17}/><b>{step.label}</b><Icon name="chevron-right" size={17}/></button>)}</div>
   </Card>
   <Card className="tw-overview-actions"><CardHead title="Quick Actions"/><div className="tw-overview-action-pair"><Button icon="link" onClick={()=>go('links')}>Manage Links</Button><Button icon="sparkles" onClick={()=>go('appearance')}>Design your Page</Button></div>
    <div className={`tw-overview-discord${connected?' is-connected':''}`}><span className="tw-overview-discord-avatar">{user.avatarUrl?<img src={user.avatarUrl} alt=""/>:<Icon name="user" size={20}/>}</span><span><b>{connected?'Discord connected':'Connect Discord'}</b><small>{connected?'Manage your linked account':'Bring your Discord identity to your profile'}</small></span><Button disabled={connecting} onClick={()=>{if(connected){go('settings');return;}setConnecting(true);void linkDiscord().then(result=>{setConnecting(false);if(result.error)notify('Discord',result.error);});}}>{connected?'Manage':connecting?'Connecting…':'Connect'}</Button></div>
    <div className="tw-overview-guide"><h3>Documentation</h3><p>A guided walkthrough of every page, one step at a time.</p><Button icon="help" onClick={()=>{setGuideStep(0);setGuideOpen(true);}}>Tourn Setup Guide</Button></div>
    <div className="tw-overview-action-pair tw-overview-action-bottom"><Button variant="primary" icon="crown" onClick={()=>go(isPremium?'billing':'premium')}>{isPremium?'Manage Premium':'Get Premium'}</Button><Button icon="user" onClick={()=>window.open(publicPath,'_blank','noopener,noreferrer')}>View your profile</Button></div>
   </Card></div>
  </section>
  <Card className="tw-domains"><CardHead icon="globe" title="Your domains" subtitle="Every address that opens your profile."/><div className="tw-domain-list">{domains.map(item=><div className="tw-domain-row" key={item.label}><span><b>{item.label}</b><small>{item.note}</small></span><Button icon="copy" onClick={()=>void copyDomain(item.label)}>Copy</Button></div>)}</div></Card>
  <div className="tw-overview-below"><AnalyticsPanel compact/><Card><CardHead icon="crown" title="Community Spotlight" subtitle="The most visited profiles on Tourn." actions={<Button variant="ghost" onClick={()=>go('leaderboard')}>Leaderboard</Button>}/>{boardFailed?<div className="tw-board-empty"><p>Rankings are unavailable right now.</p><Button onClick={()=>setAttempt(value=>value+1)}>Retry rankings</Button></div>:leaders===null?<p className="tw-foot-note" role="status">Loading community profiles…</p>:leaders.length?<div className="tw-home-leaders">{leaders.map((row,index)=><a key={row.username} href={'/'+encodeURIComponent(row.handle)}><span className="tw-home-leader-rank">{String(index+1).padStart(2,'0')}</span><span className="tw-home-leader-avatar">{row.avatarUrl?<img src={row.avatarUrl} alt="" loading="lazy"/>:<Icon name="user" size={18}/>}</span><span><b>{row.displayName||row.handle}</b><small>@{row.handle}</small></span><strong>{row.views.toLocaleString()}<small>views</small></strong></a>)}</div>:<p className="tw-foot-note">Profiles appear here as they receive visits.</p>}<Button icon="copy" onClick={()=>void copy()}>Copy your profile link</Button></Card></div>
  <Modal open={guideOpen} title="Tourn Setup Guide" subtitle="Six steps, from an empty page to a profile you can share." onClose={()=>setGuideOpen(false)} width={820}
   footer={<><span className="tw-guide-count">Step {step+1} of {guideSteps.length}</span><Button onClick={()=>setGuideStep(Math.max(0,step-1))} disabled={step===0}>Back</Button><Button onClick={()=>setGuideStep(Math.min(guideSteps.length-1,step+1))} disabled={step===guideSteps.length-1}>Next</Button><Button variant="primary" onClick={()=>{setGuideOpen(false);go(activeStep.page);}}>Open {activeStep.short}</Button></>}>
   <div className="tw-guide-progress" aria-hidden="true"><i style={{width:`${((step+1)/guideSteps.length)*100}%`}}/></div>
   <div className="tw-guide">
    <ol className="tw-guide-steps" aria-label="Setup steps">{guideSteps.map((item,index)=><li key={item.title}><button type="button" className={`tw-guide-step${index===step?' is-active':''}${index<step?' is-done':''}`} aria-label={`Step ${index+1}: ${item.title}`} aria-current={index===step?'step':undefined} onClick={()=>setGuideStep(index)}><span className="tw-guide-number">{index<step?<Icon name="check" size={12}/>:index+1}</span><span><b>{item.title}</b><small>{item.where}</small></span></button></li>)}</ol>
    <section className="tw-guide-panel" key={step} aria-live="polite">
     <span className="tw-guide-icon"><Icon name={activeStep.icon} size={20}/></span>
     <h3>{activeStep.title}</h3>
     <p>{activeStep.blurb}</p>
     <ul className="tw-guide-list">{activeStep.items.map(item=><li key={item}><Icon name="check" size={13}/>{item}</li>)}</ul>
     <div className="tw-guide-where"><Icon name="chevron-right" size={13}/>{activeStep.where}</div>
    </section>
   </div>
  </Modal>
 </div>;
}
