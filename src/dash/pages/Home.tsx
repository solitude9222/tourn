import { useEffect, useState } from "react";
import { useDash } from "../context";
import { Button, Card, CardHead, Icon, type IconName } from "../ui";
import { AnalyticsPanel } from "../Analytics";
import { copyText } from "../files";
import { fetchLeaderboard, type LeaderboardEntry } from "../../lib/leaderboard";
import type { Page } from "../context";

export function HomePage() {
  const { user, about, links, widgets, badges, profileViews, go, notify } = useDash();
  const [leaders,setLeaders]=useState<LeaderboardEntry[]|null>(null);
  const [boardFailed,setBoardFailed]=useState(false),[attempt,setAttempt]=useState(0);
  useEffect(()=>{let alive=true;setBoardFailed(false);void fetchLeaderboard("views",5).then(result=>{if(alive)setLeaders(result.entries.slice(0,5));}).catch(()=>{if(alive){setBoardFailed(true);setLeaders([]);}});return()=>{alive=false;};},[attempt]);
  const handle=user.alias?.trim()||user.username;
  const publicPath="/"+encodeURIComponent(handle);
  const socials=links.links.filter(link=>link.visible&&link.url.trim()).length;
  const liveWidgets=widgets.widgets.filter(widget=>widget.visible!==false).length;
  const steps:{label:string;hint:string;done:boolean;page:Page;icon:IconName}[]=[
    {label:"Make it yours",hint:"Add an avatar",done:Boolean(about.assets.avatarUrl||user.avatarUrl),page:"appearance",icon:"image"},
    {label:"Tell your story",hint:"Write your profile bio",done:Boolean(about.bio.trim()),page:"profile-main",icon:"user"},
    {label:"Connect your world",hint:"Add a social link",done:socials>0,page:"links",icon:"link"},
    {label:"Bring it to life",hint:"Connect your first widget",done:liveWidgets>0,page:"widgets",icon:"grid"},
  ];
  const complete=steps.filter(step=>step.done).length,percent=complete*25;
  const copy=async()=>{const ok=await copyText(location.origin+publicPath);notify(ok?"Profile link copied":"Could not copy",ok?"Ready to share anywhere.":location.origin+publicPath);};
  const stats:{label:string;value:string|number;icon:IconName;page:Page;detail:string}[]=[
    {label:"Profile views",value:profileViews??"—",icon:"eye",page:"analytics",detail:"Lifetime visits"},
    {label:"Social links",value:socials,icon:"link",page:"links",detail:"Visible on your profile"},
    {label:"Live widgets",value:liveWidgets,icon:"grid",page:"widgets",detail:"Connected experiences"},
    {label:"Equipped badges",value:badges.equipped.length,icon:"shield",page:"badges",detail:"Your profile collection"},
  ];
  return <div className="tw-home-v2">
    <section className="tw-welcome">
      <div className="tw-welcome-copy"><span className="tw-kicker">YOUR SPACE ON THE INTERNET</span><h2>Welcome back, {about.displayName||handle}.</h2><p>Shape your page, connect your favorites, and see who stops by.</p><div className="tw-row"><Button variant="primary" icon="palette" onClick={()=>go("appearance")}>Customize profile</Button><Button icon="external" onClick={()=>window.open(publicPath,"_blank","noopener,noreferrer")}>View profile</Button></div></div>
      <div className="tw-home-address"><span className="tw-home-avatar">{about.assets.avatarUrl||user.avatarUrl?<img src={about.assets.avatarUrl||user.avatarUrl||""} alt=""/>:<Icon name="user" size={28}/>}</span><small>Your public link</small><b>tourn.lol/{handle}</b><Button icon="copy" onClick={()=>void copy()}>Copy link</Button></div>
    </section>
    <div className="tw-home-metrics">{stats.map(stat=><button type="button" key={stat.label} className="tw-home-metric" onClick={()=>go(stat.page)}><span className="tw-metric-icon"><Icon name={stat.icon} size={18}/></span><small>{stat.label}</small><b>{typeof stat.value==="number"?stat.value.toLocaleString():stat.value}</b><span>{stat.detail}<Icon name="arrow-right" size={13}/></span></button>)}</div>
    <div className="tw-home-columns"><Card className="tw-home-checklist"><CardHead icon="check" title={percent===100?"Ready to share":"Your profile, in four steps"} subtitle={percent===100?"The essentials are in place. Keep making it yours.":"A few finishing touches make your page feel like you."} actions={<span className="tw-completion-label">{complete}/4 complete</span>}/><div className="tw-home-progress" role="progressbar" aria-label="Profile setup" aria-valuemin={0} aria-valuemax={4} aria-valuenow={complete}><span style={{width:percent+"%"}}/></div><div className="tw-home-steps">{steps.map(step=><button type="button" key={step.label} onClick={()=>go(step.page)} className={step.done?"is-complete":""}><span className="tw-step-icon"><Icon name={step.done?"check":step.icon} size={17}/></span><span><b>{step.label}</b><small>{step.hint}</small></span><Icon name="chevron-right" size={14}/></button>)}</div></Card>
    <Card><CardHead icon="bolt" title="Pick up where you left off" subtitle="Jump straight into your next change."/><div className="tw-home-shortcuts">{([{page:"layout",title:"Arrange your layout",hint:"Drag, drop and preview",icon:"layout"},{page:"effects",title:"Find your signature",hint:"Explore every decoration",icon:"sparkles"},{page:"portfolio-general",title:"Build your portfolio",hint:"Projects, gallery and interests",icon:"layers"},{page:"assets",title:"Manage your media",hint:"Your uploads in one place",icon:"upload"}] as {page:Page;title:string;hint:string;icon:IconName}[]).map(item=><button type="button" key={item.page} onClick={()=>go(item.page)}><Icon name={item.icon} size={19}/><span><b>{item.title}</b><small>{item.hint}</small></span><Icon name="arrow-right" size={14}/></button>)}</div></Card></div>
    <div className="tw-home-columns"><AnalyticsPanel compact/><Card><CardHead icon="crown" title="Community spotlight" subtitle="The most visited profiles on Tourn." actions={<Button variant="ghost" onClick={()=>go("leaderboard")}>View leaderboard</Button>}/>{boardFailed?<div className="tw-board-empty"><p>Rankings are unavailable right now.</p><Button onClick={()=>setAttempt(value=>value+1)}>Retry rankings</Button></div>:leaders===null?<p className="tw-foot-note" role="status">Loading the community…</p>:leaders.length?<div className="tw-home-leaders">{leaders.map((row,index)=><a key={row.username} href={"/"+encodeURIComponent(row.handle)}><span className="tw-home-leader-rank">{String(index+1).padStart(2,"0")}</span><span className="tw-home-leader-avatar">{row.avatarUrl?<img src={row.avatarUrl} alt="" loading="lazy"/>:<Icon name="user" size={18}/>}</span><span><b>{row.displayName||row.handle}</b><small>@{row.handle}</small></span><strong>{row.views.toLocaleString()}<small>views</small></strong></a>)}</div>:<div className="tw-board-empty"><Icon name="users" size={30}/><p>The community is just getting started.</p><small>Profiles appear here as they receive visits.</small></div>}</Card></div>
  </div>;
}
