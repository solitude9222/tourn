import {useState} from "react";
import {api} from "../lib/backend";
import {normalizeDocument} from "../lib/serverProfile";
import {useDash} from "./context";
import {Button,Card,CardHead} from "./ui";
type Revision={revision:number; saved_at:string;widgets:number;links:number};
export function ProfileHistory(){const {setAbout,setWidgets,setBadges,setLinks,notify}=useDash();const [rows,setRows]=useState<Revision[]>([]),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false);
 async function load(){setBusy(true);const result=await api<{history:Revision[]}>("/api/profile/history");setBusy(false);if(!result.ok){notify("Profile history",result.error);return;}setRows(result.data.history);setLoaded(true);}
 async function restore(revision:number){setBusy(true);const result=await api<{data:unknown}>(`/api/profile/history/${revision}`);setBusy(false);if(!result.ok){notify("Restore failed",result.error);return;}const doc=normalizeDocument(result.data.data);setAbout(()=>doc.about);setWidgets(()=>doc.widgets);setBadges(()=>doc.badges);setLinks(()=>doc.links);notify("Profile restored","The selected version is being saved. Your current version remains in history.");}
 return <Card><CardHead icon="refresh" title="Profile history" subtitle="Restore one of the last five saved versions, including widgets, links and customisation. Older snapshots are removed to save space." actions={<Button disabled={busy} onClick={()=>void load()}>Load saved versions</Button>}/>{loaded&&!rows.length?<p className="tw-foot-note">The last five saved versions are kept automatically.</p>:null}{rows.map(row=><div className="tw-history-row" key={row.revision}><span><b>{new Date(row.saved_at).toLocaleString()}</b><small>{row.widgets} widgets · {row.links} links · revision {row.revision}</small></span><Button disabled={busy} onClick={()=>void restore(row.revision)}>Restore version</Button></div>)}</Card>;
}
