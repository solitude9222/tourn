import {MediaHealth} from '../MediaHealth';
import {RuntimeDiagnostics} from '../RuntimeDiagnostics';
import {useState} from 'react';
import {ArrangeTools} from '../ArrangeTools';
import {RestoreTools} from '../RestoreTools';
import {EditorTools} from '../EditorTools';
import {Button,Card,CardHead} from '../ui';
export function WorkspacePage(){
 const [tools,setTools]=useState(false);
 return <div className="workspace-page"><Card><CardHead title="Your workspace" subtitle="Arrange your editor, keep recovery copies and inspect your current draft."/><Button onClick={()=>setTools(true)} icon="search">Find settings, compare and view history</Button><p>Workspace order is a browser preference. Profile changes remain a draft until Save now.</p></Card><Card><ArrangeTools/></Card><RestoreTools/><MediaHealth/><RuntimeDiagnostics/><EditorTools open={tools} onClose={()=>setTools(false)}/></div>;
}
