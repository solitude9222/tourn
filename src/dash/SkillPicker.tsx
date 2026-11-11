import {useState} from "react";
import {TECH_STACK,techIconUrl,techCategory} from "../lib/techStack";
export function SkillPicker({value,onChange}:{value:string[];onChange:(ids:string[])=>void}){
 const [query,setQuery]=useState("");const selected=TECH_STACK.filter(item=>value.includes(item.id));
 const toggle=(id:string)=>onChange(value.includes(id)?value.filter(item=>item!==id):[...value,id]);
 const filtered=TECH_STACK.filter(item=>item.name.toLowerCase().includes(query.toLowerCase()));
 return <div className="tw-skills"><details className="tw-tech-picker"><summary>{selected.length?`${selected.length} skills selected`:"Choose languages, tools and skills"}</summary><input className="tw-input" aria-label="Search skills" placeholder="Search skills…" value={query} onChange={event=>setQuery(event.target.value)}/>{["Languages","Frontend","Backend & data","Tools & platforms"].map(category=><section key={category}><h4>{category}</h4><div className="tw-tech-grid">{filtered.filter(item=>techCategory(item.id)===category).map(item=><button type="button" key={item.id} aria-pressed={value.includes(item.id)} onClick={()=>toggle(item.id)}><img src={techIconUrl(item)} alt="" loading="lazy"/>{item.name}<span aria-hidden="true">{value.includes(item.id)?"✓":"+"}</span></button>)}</div></section>)}</details><div className="tw-tech-selected">{selected.map(item=><button type="button" className="tw-tech-chip" key={item.id} onClick={()=>toggle(item.id)} aria-label={`Remove ${item.name}`}><img src={techIconUrl(item)} alt=""/>{item.name} ×</button>)}</div></div>;
}
