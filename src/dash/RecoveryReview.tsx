import {useDash} from './context';
import {Button,Modal} from './ui';
import {LinkerPreview} from '../components/LinkerPreview';
import type {ProfileDocument} from '../lib/serverProfile';
export function RecoveryReview({document,savedAt,onRestore,onClose}:{document:ProfileDocument;savedAt:number;onRestore:()=>void;onClose:()=>void}){
 const {user,about,links,widgets,badges}=useDash();
 return <Modal open title="Review recovered draft" subtitle={`Recovered from this browser · ${new Date(savedAt).toLocaleString()}. Restoring does not publish.`} onClose={onClose} width={1180} footer={<><Button onClick={onClose}>Keep reviewing</Button><Button variant="primary" onClick={onRestore}>Use recovered draft</Button></>}><div className="recovery-comparison"><section><h3>Current saved profile</h3><LinkerPreview user={user} about={about} links={links} widgets={widgets} badges={badges} preview showEntry={false} showMetadata={false}/></section><section><h3>Recovered browser draft</h3><LinkerPreview user={user} {...document} preview showEntry={false} showMetadata={false}/></section></div></Modal>;
}
