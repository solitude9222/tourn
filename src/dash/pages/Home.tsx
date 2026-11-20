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
 const [guideOpen,setGuideOpen]=useState(false),[connecting,setConnecting]=useState(false);
 const [leaders,setLeaders]=useState<LeaderboardEntry[]|null>(null),[boardFailed,setBoardFailed]=useState(false),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setBoardFailed(false);void fetchLeaderboard('views',5).then(result=>{if(active)setLeaders(result.entries.slice(0,5));}).catch(()=>{if(active){setBoardFailed(true);setLeaders([]);}});return()=>{active=false;};},[attempt]);
 const handle=user.alias?.trim()||user.username,publicPath='/'+encodeURIComponent(handle);
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
 return <div className="tw-overview">
  <div className="tw-overview-stats">{stats.map(stat=><button type="button" className="tw-overview-stat" key={stat.label} onClick={()=>go(stat.page)}><span><Icon name={stat.icon} size={16}/>{stat.label}</span><b>{typeof stat.value==='number'?stat.value.toLocaleString():stat.value}</b><small>{stat.detail}</small></button>)}</div>
  <section className="tw-setup-section" aria-labelledby="profile-setup-title"><header><h2 id="profile-setup-title">Profile Setup</h2><p>Finish the core steps and jump into the most useful actions.</p></header>
   <div className="tw-setup-grid"><Card className="tw-setup-checklist"><CardHead title="Profile Quickstart"/><div className="tw-setup-progress-label"><span>Complete the essentials that make your profile feel finished.</span><b>{percent}% complete</b></div><progress className="tw-setup-progress" value={complete} max={steps.length} aria-label="Profile setup"/>
    <div className={`tw-setup-notice${percent===100?' is-complete':''}`}><Icon name={percent===100?'check':'info'} size={17}/><span><b>{percent===100?'Your profile is ready to share.':'Your profile is not complete yet.'}</b><small>{percent===100?'The core steps are complete. Keep making it your own.':'Finish the tasks below to make your profile more useful and attractive.'}</small></span></div>
    <div className="tw-setup-steps">{steps.map(step=><button type="button" key={step.label} className={step.done?'is-complete':''} onClick={()=>go(step.page)}><Icon name={step.done?'check':step.icon} size={17}/><b>{step.label}</b><Icon name="chevron-right" size={17}/></button>)}</div>
   </Card>
   <Card className="tw-overview-actions"><CardHead title="Quick Actions"/><div className="tw-overview-action-pair"><Button icon="link" onClick={()=>go('links')}>Manage Links</Button><Button icon="sparkles" onClick={()=>go('appearance')}>Design your Page</Button></div>
    <div className={`tw-overview-discord${connected?' is-connected':''}`}><span className="tw-overview-discord-avatar">{user.avatarUrl?<img src={user.avatarUrl} alt=""/>:<Icon name="user" size={20}/>}</span><span><b>{connected?'Discord connected':'Connect Discord'}</b><small>{connected?'Manage your linked account':'Bring your Discord identity to your profile'}</small></span><Button disabled={connecting} onClick={()=>{if(connected){go('settings');return;}setConnecting(true);void linkDiscord().then(result=>{setConnecting(false);if(result.error)notify('Discord',result.error);});}}>{connected?'Manage':connecting?'Connecting…':'Connect'}</Button></div>
    <div className="tw-overview-guide"><h3>Documentation</h3><p>Setup help, useful features, and answers to common dashboard questions.</p><Button icon="help" onClick={()=>setGuideOpen(true)}>Tourn Setup Guide</Button></div>
    <div className="tw-overview-action-pair tw-overview-action-bottom"><Button variant="primary" icon="crown" onClick={()=>go(isPremium?'billing':'premium')}>{isPremium?'Manage Premium':'Get Premium'}</Button><Button icon="user" onClick={()=>window.open(publicPath,'_blank','noopener,noreferrer')}>View your profile</Button></div>
   </Card></div>
  </section>
  <div className="tw-overview-below"><AnalyticsPanel compact/><Card><CardHead icon="crown" title="Community Spotlight" subtitle="The most visited profiles on Tourn." actions={<Button variant="ghost" onClick={()=>go('leaderboard')}>Leaderboard</Button>}/>{boardFailed?<div className="tw-board-empty"><p>Rankings are unavailable right now.</p><Button onClick={()=>setAttempt(value=>value+1)}>Retry rankings</Button></div>:leaders===null?<p className="tw-foot-note" role="status">Loading community profiles…</p>:leaders.length?<div className="tw-home-leaders">{leaders.map((row,index)=><a key={row.username} href={'/'+encodeURIComponent(row.handle)}><span className="tw-home-leader-rank">{String(index+1).padStart(2,'0')}</span><span className="tw-home-leader-avatar">{row.avatarUrl?<img src={row.avatarUrl} alt="" loading="lazy"/>:<Icon name="user" size={18}/>}</span><span><b>{row.displayName||row.handle}</b><small>@{row.handle}</small></span><strong>{row.views.toLocaleString()}<small>views</small></strong></a>)}</div>:<p className="tw-foot-note">Profiles appear here as they receive visits.</p>}<Button icon="copy" onClick={()=>void copy()}>Copy your profile link</Button></Card></div>
  <Modal open={guideOpen} title="Tourn Setup Guide" subtitle="A few useful places to start." onClose={()=>setGuideOpen(false)} width={680}><div className="tw-overview-help">{[{title:'1. Make it yours',text:'Customize → Appearance contains your avatar, separate banner, background, fonts, and the audio manager.',page:'appearance'},{title:'2. Tell your story',text:'Customize → Profile controls your display name, bio, profile card, entry screen, and visibility.',page:'profile-main'},{title:'3. Add your content',text:'Use Social Links and Widgets for connections. Portfolio holds your About page, projects, gallery and interests.',page:'portfolio-general'},{title:'4. Check and share',text:'Layout provides device previews. Studio tools includes profile checks, saved versions, comparison and a shareable QR code.',page:'layout'}].map(item=><section key={item.title}><h3>{item.title}</h3><p>{item.text}</p><Button onClick={()=>{setGuideOpen(false);go(item.page as Page);}}>Open editor</Button></section>)}<Button onClick={()=>{setGuideOpen(false);go('support');}}>Contact support</Button></div></Modal>
 </div>;
}
